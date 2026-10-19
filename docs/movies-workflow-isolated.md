# Novo ciclo Movies — implementação inativa

O módulo `src/workflow/` implementa o desenho aprovado para validação em cópia
isolada. Não é importado por server.ts/server-entry.ts/main.tsx; não modifica o
banco ativo, as rotas existentes ou o frontend Movies. Importar seus módulos
não abre banco, listener, modelo, processo Parley ou sessão de agente.

## Componentes

- schema.ts: migrações 1 (identidade/grafo/atribuições/gates) e 2
  (recibos/artefatos/outbox/resultados/eventos/história), com checksums.
- store.ts: único escritor cooperativo, DAG, comandos tipados, revisões,
  idempotência, leases/fencing e snapshot consistente na conexão do escritor.
- migration.ts: backup SQLite consistente; staging do snapshot UI v1 em nova
  cópia, sem promover JSON legado a tarefas/aprovações; restauração em NOVO
  arquivo, sem sobrescrever o anterior.
- api.ts: adaptador HTTP local, não montado. Sem resolver de identidade
  autenticada fornecido pelo host, nega tudo. Identidade não vem do body.
- view.mjs/.d.mts: leitura do mesmo contrato, stale explícito, comandos sem
  otimismo e retry explícito com a mesma chave após resposta incerta. Recusa
  endpoints remotos antes da primeira requisição. Vista montada é de leitura.
- preview.ts: fixture sintética, sete tarefas em draft, HTML/JSON/recibo,
  backup/restauração. Nenhuma tarefa é iniciada ou considerada aceita.

Não há dependência nova, scheduler, segundo coordenador, registro de serviço,
credencial, dispatch ou configuração de cloud. O banco Parley schema 12 e o
SQLite de snapshots do app são preservados. Um adaptador futuro usará o
Parley existente como transporte, sem escrever no banco nativo.

## Contrato

WorkflowStore recebe path absoluto explícito. create:true é necessário para
um banco inexistente; bancos existentes precisam da application_id e schema
conhecidos. Schema futuro, checksum divergente, tabela adulterada e corrupção
recusam abertura; nunca renomeiam/recriam dados ou carregam seeds. A abertura
valida também o prefixo antes de migrar uma versão antiga.

A identidade é projeto/episódio/ciclo UUID; cada ciclo tem graphRevision e
stateVersion. O grafo é imutável depois da criação nesta primeira versão:
revisar a sequência exige outro ciclo draft, sem herdar tarefas concluídas,
assignments ou gates. Somente um ciclo pode estar active por projeto. Arquivar
exige ausência de atribuições pendentes; não conclui tarefas silenciosamente.

Comandos possuem cycleId, expectedVersion, idempotencyKey, type e data fechado.
register_worker, queue, transport_sent/ack/uncertain, gate, expire, block,
unblock, index_history, activate e archive são operações do produtor verificado.
accept/start/deliver exigem trabalhador atribuído, revisão/fence e lease válidos;
review exige produtor/revisor independente. Não existe operação genérica para
forçar status. Gate só admite local_read_only/local_edit; não representa
aprovação criativa, upload, modelo pago ou teto de gasto.

Queued é intenção durável e conserva responsabilidade no produtor; sent/ACK
são observações de transporte e não aceitam a tarefa. Aceite explícito muda
responsabilidade ao especialista; start, entrega e revisão são fatos separados.
Outbox não envia nada. Referências nativas só serão verificadas por um adaptador
futuro; os testes usam recibos sintéticos, sem alegar entrega Parley real.

Cada mudança de ciclo gera evento na mesma transação do estado e resultado
idempotente. Mesmo conteúdo com mesma chave retorna o resultado original;
conteúdo diferente ou revisão concorrente é conflito. Recibos duplicados não
criam outra entrega. Revogar/expirar gate impede aceitar a entrega.
Artefatos guardam paths relativos/hashes declarados; não lêem/copiam mídia.
O revisor ainda precisa verificar os arquivos e critérios antes de aceitar;
registro de hash declarado não é certificação automática do conteúdo.

WAL, synchronous=FULL, foreign_keys=ON e busy_timeout=1000 são explícitos.
O guard .writer criado exclusivamente bloqueia instâncias cooperantes no mesmo
arquivo; não é uma barreira contra outros programas do mesmo usuário. Symlinks,
hardlinks e schema desconhecido são recusados. Nenhuma instância rouba guard
stale por PID. Após saída sem close, conservar fonte/guard e restaurar backup
validado em outro path para revisão; não apagar lock de um escritor ativo.

## Verificar e inspecionar sem ativar

No checkout com Node 24 e dependências já instaladas:

```sh
node --import tsx --test tests/*.test.mjs
python3 -B -m unittest discover -s tests -p 'test_*.py' -v
npm run lint
# Usar sempre outDir novo fora do checkout para preservar o dist servido.
npm run build -- --outDir /tmp/movies-workflow-build-NOVO
```

Criar preview **só em diretório novo**:

```sh
node --import tsx --input-type=module -e 'import {createIsolatedPreview} from "./src/workflow/preview.ts"; console.log(await createIsolatedPreview(process.argv[1]));' /tmp/movies-cycle-preview-NOVO
```

Abrir index.html ou snapshot.json do diretório produzido. O snapshot tem
projectId movies-preview-only, baseline sintético e estado draft. O exemplo
não lê banco real nem representa migração ou planejamento de produção já ativo.

## Ativação pendente e rollback

Antes de ativar: mapear identidade real do produtor e escopos dos especialistas;
revisar baseline/registry/grafo; aprovar backup/criação do novo DB e cutover;
adaptar hooks/manage.py e projeções de leitura sem dual write; preservar demandas,
comentários, aprovações e JSON histórico. Aprovação de migração isolada não é
permissão para mexer em AGENTS/CLAUDE protegidos, reiniciar, lançar agentes ou
importar histórico automaticamente. APIs de bootstrap/migração são locais ao
módulo e não são expostas por HTTP.

Rollback desta entrega inativa: comparar hashes no delivery manifest; como
nenhuma entrada existente importa o módulo e nenhum DB ativo mudou, retirar
somente os novos arquivos listados se estiverem inalterados restaura o estado
anterior. Não restaurar package.json/server.ts/App.tsx nem diretórios inteiros.
Não há rollback de dados a executar. Após um cutover futuro, não trocar o
ponteiro de volta descartando novas escritas; preservar eventos e reconciliar.

Limites desta fase: autenticação real do host, bridge Parley/dispatch,
compatibilidade dos leitores JSON legados e produção ativa não foram ativados.
Não houve restart, geração, pagamentos, credenciais, exclusão Git, commit ou push.

## Entrada opt-in com UI e API ligadas (validação adicional)

`workflow-isolated.ts` é uma entrada separada. Não altera runtimeProfile nem o
bootstrap normal; `npm start` continua no comportamento anterior. A entrada
nova sempre cria uma fixture sintética em diretório NOVO, fora do checkout do
app e dos repositórios alvo; não aceita path de DB existente, arquivo .env,
identidade real, host LAN ou flag para habilitar escrita HTTP.

```sh
node --import tsx workflow-isolated.ts --workspace /tmp/movies-workflow-NOVO --port 0
```

O stdout informa a URL numérica loopback e cycleId. Foreground até Ctrl-C;
o encerramento fecha somente o servidor/store próprios. O estado sintético
fica preservado no diretório. Nunca apontar isso para um banco ativo.

A raiz agora carrega bootstrap.mjs, createWorkflowClient e mountWorkflowView;
o botão Atualizar leitura chama a API normalizada, que consulta o SQLite da
mesma instância. Não é o index.html estático do preview anterior. O HTTP é
somente leitura (POST recusado); testes alteram apenas a fixture pelo escritor
em processo e verificam a revisão nova através da API. As APIs de bootstrap
ou de migração não são rotas web. MCP/CLI/modelos/arquivos SQLite e .env não são
servidos. CSP é local, sem CORS e sem assets remotos.

`tsconfig.workflow-isolated.json` inclui também a nova entrada:

```sh
node_modules/.bin/tsc --noEmit --project tsconfig.workflow-isolated.json
node --import tsx --test tests/workflow-isolated.test.mjs
```

Isso comprova integração funcional no perfil sintético isolado. Não comprova
cutover no app normal, identidade de produtor autenticada, bridge Parley,
compatibilidade de hooks ou migração dos dados reais do Movies/D1.

## Selected database host and legacy compatibility (inactive)

`src/workflow/selectedServer.ts` now composes the existing workflow UI, API,
verified identity resolver, SQLite store and versioned read adapters. Importing it
starts nothing. The ordinary `server-entry.ts`, production `server.ts`, Movies
frontend, native Parley service and synthetic preview entry remain unchanged.
There is no environment variable, CLI default, demo fallback or automatic seed
path into this host.

The host requires an exact `movies-workflow/selection/v1` object containing an
absolute existing `dbPath`, project/cycle IDs, expected state and graph revisions,
and an approval reference. `authorizeSelection` must return the boolean `true`
for that exact frozen selection. An approval-reference string grants nothing by
itself. Before acquiring a writer, the host validates the current schema,
application ID, integrity, project/cycle pins and immutable Movies handoff policy.
It refuses missing files, symlinks, hard links, archived cycles, legacy snapshot
DBs and older normalized schemas. It never migrates a selected database on start.
It binds only 127.0.0.1; unknown routes, foreign origins and CORS access remain
refused. No production database has been selected or opened by this work.

### Actual authentication binding still required for activation

The existing native MCP bearer identity proves a registered Parley participant;
it does not prove desktop producer authority. `MOVIES_PRODUCER_LANE`, a UID,
participant name and role labels also do not provide that proof. The existing
Cloudflare `getChatGPTUser` identity is verified in its own deployed request
context and is not automatically available to a local Node request. Neither
contract is silently converted into a local producer login.

`createVerifiedResolver` accepts an injected trusted host verifier. It denies by
default, including when the verifier throws. A verified grant must bind issuer,
nonempty authenticated subject, existing actor, exact project/cycle, unexpired
lease and explicit `read`/`command` capabilities. The store independently enforces
producer/worker/reviewer roles, assignment fences and revision checks. The host
must derive grants from its authenticated session and an explicitly approved
subject-to-actor mapping; it must not copy caller-controlled body/header claims.
Only synthetic verifiers are used in acceptance tests.

Recommended activation binding: a verified local desktop producer session with
an approved immutable subject-to-actor map and project/cycle scope. A second
option is a deliberately designed bridge to verified ChatGPT owner sessions;
that adds a separate trust boundary and is not implemented or authorized here.
No credential, session, authentication service or persistent access was created.

### Receipt evidence and exact legacy consumers

Migration 3 adds an immutable `handoff_policy` to each cycle and a checksummed
`receipt_handoffs` table. Existing cycles retain `none`; the selected host requires
`movies/handoff/v1`. New Movies-policy receipts require bounded verification
entries, artifact-bound paths/hashes, successor actions or explicit stage closure,
and bound zero-face logs for media claims by QC/continuity. Delivery persists the
receipt and evidence atomically in SQLite. Independent review is still required;
metadata validation does not certify media quality, faces, history or creative
acceptance. A strict host also requires its injected `verifyReview` callback to
return `true` before a receipt can be accepted. The default denies acceptance.

The fixed authenticated read routes are:

- `/api/workflow/v1/cycles/<cycle>/compat/legacy-read/v1`
- `/api/workflow/v1/cycles/<cycle>/compat/handoff/v1/<receipt>`

Both retain project/cycle/graph/state-version pins. `projectLegacyRead` supplies
`tasks[]` using the states accepted by the actual `manage.py` dependency/status
consumer. Assigned and awaiting-review tasks project conservatively as blocked,
with explicit reasons and their exact `workflowStatus`; they are never mistaken
for completed work. IDs remain C01 etc. and are not renamed into historical T IDs.
`projectHandoff` supplies the exact verification, changedFiles, claims,
nextActions/stageComplete and agentRole fields consumed by `_common.py`,
`manage.hash_findings` and `zero-face-gate.py` helpers.

`verifyHandoffFiles` checks only explicitly listed evidence under an explicit
root, without symlinks or directory scans, with a 16 MiB per-file cap. Rejected
paths are not read again to parse a zero-face log. Oversized media needs separately
authorized reviewer tooling; this bounded helper refuses it. A zero-face log's
listed coverage is checked, while content review remains the reviewer's duty.

These adapters never write `task-board.json`, approvals, handoff JSON or D1.
Legacy full-film validate/lint/resume, production-plan exporters and the existing
Movies frontend continue to read their historical canonical sources. The new
cycle's authority is SQLite only. The task projection is a versioned *new-cycle
read interface*, not a fabricated complete film package accepted by the old
frontend's T-ID schema. Full film/production-plan validity is still a separate
legacy check. Production Stop hooks still discover legacy handoff files; they
have **not** been switched to SQLite. A future producer-owned hook binding must
consume these pinned packets and the tested helper contracts without writing a
second canonical handoff file. No protected hook authority has been changed.

### Integrated acceptance and activation decision

`tests/workflow-adapters.test.mjs` exercises selected DB -> authenticated HTTP
command -> COMMIT -> UI client/read adapters, insufficient-evidence refusals,
identity denial, exact pins, absence of fallback/migration, zero-face bindings,
consistent WAL backup and restore into a new file. The legacy Python contract
tests additionally import the exact current read/gate helpers, with their hashes
recorded by the test, and use only temporary synthetic evidence. They do not run
hook entrypoints or set producer flags.

Run those exact contract tests with an explicit checkout:

```sh
MOVIES_CONTRACT_ROOT=/absolute/Movies_Projects python3 -B -m unittest discover -s tests -p test_workflow_legacy_contracts.py
```

The bounded activation decision remains **hold**: approve the specific new DB and
new draft cycle, verify the real producer/session mapping and review verifier,
rehearse a consistent backup/restore with all writers quiesced, and authorize the
producer-owned legacy-hook/reader routing before starting this profile. Any active
service stop/restart, DB cutover, new credential/access, public endpoint, dispatch
or media operation remains separately unapproved. This code prepares those
boundaries; it does not execute them.

Rollback before activation consists only of hash-guarded removal of the delivered
new source files and restoration of this work's own modified sources from its
private baseline. Production data needs no rollback because it was not touched.
After any future activation, reconcile new SQLite events before choosing an old
source again; never overwrite post-activation work with a stale backup.

The subsequent approved preparation adds the real human-paired entrypoint,
without changing the ordinary entrypoint or activating production. See
[movies-local-session.md](arquivo/movies-local-session.md) for the exact fixed namespace,
30-minute pairing protocol, command scope, prepared gate routes and future launch
command. Production Stop hook routing is still not installed.

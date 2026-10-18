# Movies no app online — plano de observação, sem ativação

Estado: proposta baseada nos contratos lidos em 2026-10-18; nenhuma nova rota,
credencial, publicação, transferência ou configuração de rede foi ativada.
O fluxo local implementado está em `docs/movies-offline-integration.md`.

## Decisão recomendada

Manter a comparação local existente e preparar um **piloto online de status
somente leitura por 15 minutos**. Um processo manual no computador coleta
metadados delimitados e os publica por HTTPS de saída no backend que atende
`https://agent-parley.ai.studio`. O navegador lê a cópia autenticada nesse
mesmo domínio. Nem o navegador público nem o servidor hospedado se conectam
ao localhost, MCP ou filesystem do computador. O publisher não recebe comandos.

Não reutilizar o MCP público como proxy do MCP nativo e não registrar outro
coordenador. Não abrir porta no computador, túnel, firewall, CORS ou permissão
da extensão. A integração online ainda exige implementação e testes locais
com dados sintéticos antes de qualquer autorização de ativação.

| Resultado | Caminho e estado | Acesso concedido |
|---|---|---|
| UI local somente leitura | Já funciona: fontes Movies → snapshot v2 → bundle Vite em loopback | Navegador local, dez minutos; sem acesso público |
| Status online somente leitura | Proposto: coletor local → HTTPS push → armazenamento temporário do app → visualizador autenticado | Cópia mínima de estado; nenhuma chamada nativa remota |
| Dispatch posterior | Outro projeto: proposta remota → pull local → revisão humana por ação → CLI nativo | Ainda não implementado nem autorizado; não faz parte do piloto |

## Evidência dos contratos atuais

- `AI_Studio-parley/server.ts:106`: `/api/status` devolve os arrays locais do
  app. `:310` e `:520` expõem lanes/mail desse estado. Não consultam Movies.
- `server.ts:1245`: o Bearer do MCP Express é opcional; divergência apenas
  avisa. Não serve como autenticação para dados reais. As rotas em
  `:1344`–`:1359` são `/api/mcp`, `/mcp` e SSE do app, não o transporte nativo.
- `server.ts:1389`: `/hook/:lane` responde `continue`; não é o gate nativo.
- `src/components/ConnectProjectView.tsx:54`: montar a tela dispara consultas
  GitHub/diagnostics. O novo modo online não pode montar essa tela nem App.
- Parley nativo `agent_parley/server.py:916`: Host/Origin de loopback e Bearer
  obrigatório; `/mcp/` autentica a identidade registrada e limita o projeto
  pelo ator. O CLI instalado 0.18.2 tem o mesmo tipo de autorização, embora
  o checkout `movie-parley` não seja a revisão do wheel instalado.
- `agent_parley/console.py:517`: `/api/snapshot` é POST dentro de sessão
  autenticada com CSRF. POST aqui é leitura; não é API pública para o browser
  cloud. Não exportar cookie, CSRF ou token do console.
- A implementação instalada de `status_snapshot` documenta leitura sem escrita.
  O JSON bruto contém caminhos e contexto não aprovados para publicação.
  Deve ser projetado por allowlist antes de sair do processo local.
- `Movies_Projects/sites/movies-demandas/scripts/reference-review-server.mjs`:
  revisão exige loopback/Host, mesma origem e identidade local existente.
  O middleware de mídia resolve IDs/hashes, sem caminho arbitrário. Não ampliar
  esses contratos nem transformar suas rotas em APIs de nuvem.

Apontar um cliente local a `https://agent-parley.ai.studio/api/mcp` conecta esse
cliente aos seeds/ações do Express. Isso não conecta o app ao coordenador real.

## Fonte real e substituição dos seeds

O coletor local usará a instalação já existente e o state home efetivo do
operador, confirmado sem ler/mostrar credenciais. Não iniciará serviço, criará
identidade, mudará branch, instalará CLI ou fará reparos de approvals.

Três conjuntos separados substituem os seeds no modo online:

1. `participants`: somente lanes efetivamente retornadas pelo status/roster
   nativos do projeto Movies. Nome/alias, provider e atividade observada; zero
   registros ou `unknown` são resultados válidos. Nada de pré-criar as três
   lanes TMDB. Se o serviço estiver parado, mostrar isso e a data da leitura.
2. `filmRoles`: IDs de `agents/registry.json`. Definições não são processos.
   Associação lane → papel de filme só aparece com atribuição explícita
   comprovada; provider e papel Parley não determinam papel cinematográfico.
3. `productionTasks`: T01–T21 do board, mantendo `blocked`, dono por papel e
   dependências. Não converter essas tarefas em issues #201–#206, claims de
   forge ou atribuições aceitas. Claims nativos, se existirem, são outro dado
   e ficam fora do payload mínimo inicial.

O snapshot v2 local **não será enviado inteiro**: contém títulos e hashes/
caminhos de fontes. Criar projeção separada `movies-online-observation/v1`.

### Payload mínimo autorizado somente após o próximo aceite

- alias público `Movies_Projects`, versão do schema, observedAt, sequência;
- coordinator: ready/not-running/unknown e versão do CLI;
- participants: ID/alias permitido, provider, estado observado e instante da
  observação; filmRoleId apenas quando comprovado, caso contrário null;
- filmRoles: IDs; productionTasks: ID, status, ownerRole e dependsOn;
- contagens de tarefas/estados, capítulos e assets; digest do próprio payload.

Excluir: títulos e blockers, prompts, mensagens/handoffs, aprovações, saldo,
custos, tokens nativos, variáveis de ambiente, logs, nomes de usuário do host,
branches/worktrees, caminhos absolutos/relativos, hashes de fontes/mídia,
asset IDs individuais, imagens, áudio, vídeo e dados de outros projetos.

Destino: backend HTTPS do domínio existente, hospedado na infraestrutura Google
do proprietário; navegador de Andre autenticado no mesmo domínio. Nenhum outro
site/modelo/agente recebe dados. O browser não acessa o PC. Mídia fica na raiz
canônica; a tela online apresenta contagens e “mídia disponível localmente”,
sem thumbnail, streaming, cópia, LFS ou link localhost automático.

## Autenticação e capacidade de leitura

Implementar router dedicado `/api/movies-observer` e perfil de runtime
`MOVIES_OBSERVER_ONLY`. Esse perfil serve somente assets, autenticação do
observador e observações. Recusa as APIs legadas de CLI, Git/sync, MCP, hooks,
lanes/mail/plans e Kling antes de alcançar seus handlers; não executa modelos
nem sincroniza repositórios. O modo normal local continua disponível fora
desse perfil. A alteração do perfil no serviço online exige aceite de deploy.

Proposta de autenticação: duas credenciais independentes, novas e limitadas
à sessão/projeto: writer apenas para ingest e reader apenas para visualizar.
Nenhuma delas é PAT, chave de provedor ou identidade/token Parley. Valores
somente por canal secreto aprovado, nunca em URL, argv, bundle, log ou Git.
O leitor troca sua credencial por cookie Secure/HttpOnly/SameSite=Strict;
o writer envia Authorization no POST HTTPS ao único caminho fixo de ingest.
Credenciais trocadas entre rotas são recusadas. Não confiar em headers Google
ou em login AI Studio como identidade sem verificar seu emissor/audience.

Novas rotas propostas:

- `POST /api/movies-observer/session`: autentica reader; cookie temporário;
- `PUT /api/movies-observer/snapshot`: writer autenticado, schema fechado,
  máximo 32 KiB, projeto fixo, sequência crescente, sem campos extras;
- `GET /api/movies-observer/snapshot`: reader autenticado, no-store, cópia
  sanitizada; sem snapshot → indisponível, jamais fallback para seed;
- `DELETE /api/movies-observer/session`: encerra sessão reader.

“Somente leitura” refere-se ao Movies/Parley: o PUT grava apenas uma cópia de
observação no app online. Não existe caminho app → comando local. O publisher
não segue redirects para outro host e não faz retry de resultado incerto.

Piloto: processo foreground, no máximo 15 publicações, uma por minuto, prazo
absoluto de 15 minutos, sem cron/daemon/autostart. Viewer indica stale após
90 segundos; expiração/revogação impede ingest/leitura. Cleanup explícito do
piloto descarta a cópia e revoga as duas credenciais, com verificação. Retenção
funcional de 15 minutos não promete apagamento físico de memória de instâncias
inativas ou de logs de infraestrutura; não registrar corpos/segredos nos logs.
Não prolongar automaticamente o prazo.

### Estado hospedado e limite do piloto

Hoje o servidor guarda estado em memória. Para o piloto, manter apenas a
última observação sanitizada em memória, com timestamp/TTL e sem histórico;
se uma instância reiniciar ou não a tiver, retornar indisponível. Não gravar
em produção Movies, D1 ou em novo banco. Se o backend confirmado for Cloud Run,
propor limite de escala 1 durante o piloto, explicitamente autorizado; isso
**não é garantia de instância única ou de consistência**. A documentação permite
exceder brevemente o máximo. O piloto aceita indisponibilidade, nunca dado
inventado. Uso estável entre instâncias precisará de proposta separada para
um único objeto compartilhado de metadados, com retenção e IAM próprios.

Referência primária: [máximo de instâncias Cloud Run](https://docs.cloud.google.com/run/docs/configuring/max-instances).
Segredos no runtime exigem mecanismo e permissões confirmados, sem valores
em comandos: [segredos em Cloud Run](https://docs.cloud.google.com/run/docs/configuring/services/secrets).
O serviço/região/projeto e a revisão que de fato atendem ao domínio ainda não
foram confirmados. Não copiar identificadores de abas históricas como prova.

## Implementação e comandos necessários

Nenhum dos módulos/flags online abaixo existe ainda; são alvos do próximo patch,
não comandos prontos para executar agora:

1. `src/server/moviesObserverRouter.ts`: auth segmentada, schema, TTL, store
   isolado, deny das outras APIs no perfil observer; testes locais de recusa.
2. `src/online-movies-view.mjs` e seleção na entrada: GET autenticado, estados
   unknown/stale e entidades reais separadas; nenhum File API, diagnósticos
   ou controle de execução. Reusar apresentação, não simular Lane/Budget.
3. `scripts/movies_publish.py`: coleta local via CLI fixo + board/registry,
   projeção v1, validação, dry-run e publicação finita ao host único; segredo
   recebido por descritor, sem shell ou comando vindo da nuvem.

Comandos nativos confirmados por `--help` e fonte instalada, **não executados
para coletar/publicar nesta etapa**:

```sh
/home/athar/.local/bin/agent-parley doctor --json
/home/athar/.local/bin/agent-parley wiring --repo /mnt/data/Projects_SSD/Movies_Projects --json
/home/athar/.local/bin/agent-parley status --repo /mnt/data/Projects_SSD/Movies_Projects --json
/home/athar/.local/bin/agent-parley participant list --repo /mnt/data/Projects_SSD/Movies_Projects --json
```

Usar o state home efetivo do operador; se a sessão não o identificar, parar
somente a coleta nativa. Não encaminhar esses JSONs brutos nem iniciar `up`.

Depois do patch, testar com fixture/transporte falso e executar os comandos
de teste existentes (`python3 -B -m unittest discover -s tests -p
'test_movies_*.py' -v`, `node tests/local-movies.test.mjs`, `npm run lint`,
`npm run build`) mais testes novos do router/publisher. Novo comando planejado:

```sh
python3 -B -m scripts.movies_publish \
  --repo /mnt/data/Projects_SSD/Movies_Projects --dry-run
```

Não há comando genérico seguro de deploy pronto. Antes da aprovação final,
identificar por leitura o backend/revisão que atende ao domínio, seu mecanismo
de segredo e o artefato revisado; preservar a revisão anterior e recusar drift.
Se Cloud Run for confirmado, leitura proposta, sem imprimir env:

```sh
gcloud run services describe "$CONFIRMED_SERVICE" \
  --project "$CONFIRMED_PROJECT" --region "$CONFIRMED_REGION" \
  --format='json(metadata.name,status.url,status.latestReadyRevisionName,spec.template.spec.serviceAccountName)'
```

O gcloud já está instalado. Após confirmar esses identificadores, publicar a
imagem e obter o aceite final, a forma condicional do deploy seria:

```sh
gcloud run deploy "$CONFIRMED_SERVICE" \
  --project "$CONFIRMED_PROJECT" --region "$CONFIRMED_REGION" \
  --image "$REVIEWED_IMAGE_DIGEST" --max 1 \
  --update-env-vars "MOVIES_OBSERVER_ONLY=1,MOVIES_OBSERVER_EXPIRES_AT=$APPROVED_EXPIRES_AT" \
  --update-secrets "MOVIES_OBSERVER_WRITER=$WRITER_SECRET_REFERENCE,MOVIES_OBSERVER_READER=$READER_SECRET_REFERENCE"
```

As referências identificam versões aprovadas de segredos, não seus valores;
o prazo UTC não é segredo. Usar update, sem limpar bindings existentes.
Sem imagem, configuração anterior e referências concretas revisadas, o comando
permanece **não executável como runbook aprovado**. Nada foi implantado.

Somente após aceite do piloto, implantar **imagem revisada por digest** pelo
canal já usado para o serviço, com perfil observer, prazo absoluto e injeção
secreta aprovada. Não usar `gcloud run deploy --source .`: isso pode subir
arquivos locais/credenciais e não é o escopo aprovado. Não criar IAM amplo;
se faltar permissão, apresentar a identidade e os dois recursos exatos antes
de pedir o grant. Nunca colocar valores de segredo em `--set-env-vars`.

Após esse deploy/auth serem verificados, comando **planejado**, não existente:

```sh
python3 -B -m scripts.movies_publish \
  --repo /mnt/data/Projects_SSD/Movies_Projects \
  --endpoint https://agent-parley.ai.studio/api/movies-observer/snapshot \
  --duration-seconds 900 --interval-seconds 60 --max-publishes 15 \
  --credential-fd 3
```

O descritor 3 deve ser fornecido por canal secreto aprovado, nunca por literal
no comando. Rollback: parar o publisher, expirar/revogar as duas credenciais,
eliminar a última cópia e restaurar a revisão/configuração hospedada anterior,
com checagem de drift. Não tocar arquivos, lanes ou serviços nativos Movies.

## Próximo aceite preciso

Primeiro preparar/revisar o patch e os testes sintéticos locais, já dentro do
escopo de código reversível; esta etapa atual entrega somente o plano. Não
solicitar agora autorização de deploy para um patch que ainda não existe.

Quando artefato e backend estiverem concretamente identificados, o próximo
aceite restrito será:

> Autorizar um piloto de 15 minutos no app agent-parley.ai.studio: implantar a
> revisão observer revisada, desativando suas APIs de execução durante o piloto;
> criar/injetar duas credenciais temporárias separadas (writer/reader), limitadas
> a Movies; publicar até 15 observações somente com os campos mínimos listados,
> por HTTPS de saída deste computador; permitir leitura apenas a Andre com a
> credencial de reader; expirar/revogar credenciais e apagar a cópia ao terminar.
> Sem acesso de entrada ao PC, túnel, CORS/firewall, mídia, prompts, chaves nativas,
> mensagens a agentes, geração, alterações de produção ou gasto com modelos.

Esse aceite abrange o deploy/perfil e a transferência delimitada, não mudança
de credenciais existentes, análise de segredos ou instalação/restart Parley.
Identidades/permissões cloud faltantes e qualquer custo cloud adicional devem
ser nomeados antes da execução; nenhum teto novo foi aprovado neste plano.

## Dispatch: etapa posterior e separada

Observação não vira autoridade. Depois de um piloto aceito, desenhar envelope
de proposta (ID idempotente, projeto, tarefa, destinatário, papel, escopo,
versões/hash, expiração). O processo local faria pull de saída, validaria o
envelope e exigiria aprovação local de cada envio ao participante existente.
Somente então usaria a instalação nativa e seus hooks/role gates. Nunca shell
remoto, `--all`, bypass, auto-wake/spawn ou fila genérica de ferramentas MCP.

O CLI instalado confirma a forma canônica `say`/alias `mail send`, com
destinatário e texto posicionais, subject e chave idempotente. O comando futuro
seria construído como argv, sem interpolar corpo no shell. Não foi enviado
nenhum mail nem criado trabalho agora. Filme/lanes precisam de aceite real de
atribuição; geração, upload de mídia, merge e gasto ficam fora desse dispatch.

## Preview e permissão opcional encerrada

O pedido opcional de permissão para URLs de arquivo terminou sem habilitação e
não será repetido. Não é necessário para o preview automático nem para o
publisher proposto. O preview compilado mantém o prazo original: 04:26:15 UTC
de 2026-10-18; este plano não prorrogou nem reiniciou a sessão. Após expirar,
recarregar exige um novo preview local de dez minutos:

```sh
python3 -B -m scripts.movies_preview \
  --movies-root /mnt/data/Projects_SSD/Movies_Projects \
  --app-root /mnt/data/Projects_SSD/AI_Studio-parley --minutes 10 --built
```

Isso cria somente outro preview temporário local. Não é autorização nem início
do piloto online.

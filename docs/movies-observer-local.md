# Perfil Movies Observer — aplicado localmente, sem ativação

A implementação foi aplicada ao checkout `AI_Studio-parley` após validação em
cópia descartável e comparação dos hashes dos arquivos existentes. Ela não foi
configurada, iniciada, publicada ou implantada com credenciais reais. Todos os
testes de transporte e autenticação usam dados e credenciais sintéticos.

## Arquivos e execução

- `server-entry.ts`: seleção explícita do runtime; não carrega o backend demo
  no perfil observer. Valor de seleção desconhecido recusa a inicialização.
- `server.ts`: recusa execução direta quando o perfil observer foi solicitado,
  inclusive quando encontrado pelo loader `.env` legado; sem mudanças nas
  rotas MCP normais.
- `package.json`: dev/start passam a `tsx server-entry.ts`; acrescenta somente
  `test:observer`, sem dependências novas. `tsconfig.json` inclui a nova entrada.
- `src/server/moviesObserverRouter.ts`: autorizações reader/writer, schema,
  integridade, escopo, prazo, limites, cookies e recusa das APIs legadas.
- `src/server/observerServer.ts`: inicialização separada, assets allowlisted,
  limite de tamanho, proteção contra escape e sem importação de `.env`,
  Kling/Gemini, Git, hooks, MCP ou coordenador.
- `src/shared/moviesObservation.mjs` e `.d.mts`: contrato fechado do wire.
- `scripts/movies_publish.py`: projeção mínima de fontes reais, dry-run por
  padrão, coleta nativa opt-in e publicação finita exclusivamente ao destino
  fixado. Nenhuma publicação foi executada nesta entrega.
- `src/online-movies-view.mjs`, `.d.mts` e seleção em `src/main.tsx`: entrada de
  leitura, estados offline/stale/expired, participantes, papéis e tarefas
  separados; sem seeds, File API, botões de execução ou geração.
- Testes: `movies-observer.test.mjs`, `observer-entry.test.mjs`,
  `online-movies.test.mjs`, `helpers/observation.mjs`, `test_movies_publish.py`.

O build continua sendo Vite para a interface. O backend continua executando
TypeScript diretamente; sua nova entrada escolhe o perfil. Nenhum processo
existente foi recarregado. A instalação Python diária do Parley é independente
e não foi alterada.

## Limites efetivos

O perfil exige, no ambiente do processo, `MOVIES_OBSERVER_ONLY=1`, origem exata
`MOVIES_OBSERVER_ORIGIN=https://agent-parley.ai.studio`, deadline UTC absoluto
`MOVIES_OBSERVER_EXPIRES_AT` futuro de no máximo 900 segundos e dois SHA-256
distintos em `MOVIES_OBSERVER_READER_SHA256` e
`MOVIES_OBSERVER_WRITER_SHA256`. Não há defaults de autenticação nem criação
de credenciais. Os valores reais e a ativação exigem o aceite posterior.
O servidor conserva somente digests de autorização; não reutiliza tokens
Parley, PATs ou chaves de modelos. HOST padrão é 127.0.0.1; uma vinculação
cloud em 0.0.0.0 precisaria ser explícita no deploy aprovado.

O runtime observer é um handler HTTP separado. Ele não monta Express/CORS nem
as rotas legadas, que retornam 404. Não existe fallback de ferramenta, shell,
mail, hook, Git, modelo ou MCP. Não existe segundo coordenador.

O payload `movies-online-observation/v1` permite apenas projeto fixo
Movies_Projects, sequência, timestamps, estado/versão do coordenador,
participantes mínimos, IDs de papéis, tarefas (ID/status/ownerRole/dependsOn),
contagens e digest. Rejeita campos extras em qualquer objeto, projeto alheio,
IDs repetidos, dependências inexistentes, papéis desconhecidos e formato de
tempo inválido. Máximos: 32 KiB, 32 participantes, 32 papéis, 100 tarefas,
100 capítulos e 1.000.000 registros de assets. SHA-256 detecta alterações no
payload; **não é assinatura nem comprovação de origem de mídia**. Autenticação
do writer é uma barreira distinta.

Não entram no wire títulos, blockers, prompts, mensagens, aprovações, saldo,
custo, tokens nativos, variáveis, logs, paths, branches/worktrees, hashes de
fontes/mídia, asset IDs individuais ou arquivos de mídia. Cinco fontes Movies
fixas são lidas com limite de 4 MiB cada, recusa de escape por symlink e
checagem de drift. A mídia permanece no armazenamento canônico.

O coletor nativo é opt-in: requer `--collect-runtime --state-home` explícitos
e usa o CLI já instalado para `--version` e status do único repo. Ausência,
erro ou projeto não correspondente ficam unknown, sem seeds ou autostart.
`filmRoleId` permanece null: provider e papéis de coordenação não comprovam
uma atribuição cinematográfica. Papéis e tarefas vêm da registry/board reais.

Writer: PUT autenticado no caminho fixo, uma observação por 60 segundos,
máximo 15 aceites, sequência crescente entre 1 e 15 e tempo observado a até
30 segundos do relógio do servidor. As verificações são repetidas após a
leitura do corpo para conter concorrência. Corpo malformado/grande e encoding
não suportado são recusados. O dado é armazenado somente em memória.

Reader: POST de sessão exige origem exata e credencial reader; cookie
`__Host-movies-observer`, Secure/HttpOnly/SameSite=Strict, Path=/, com prazo
limitado ao piloto. GET exige esse cookie, no-store e limite de 30/minuto.
Login tem limite de 10/minuto e falhas de autorização de 30/minuto. DELETE
remove o cookie do navegador, **não revoga a credencial reader**. Revogação
operacional das credenciais é uma etapa do piloto futuro, não um grant agora.

Sem observação, retorna offline e null. Após 90 segundos, stale; ao vencer o
deadline, nega leitura/publicação e descarta a cópia no próximo acesso. A UI
também deriva validade pelo tempo, distingue indisponibilidade e não substitui
falhas por seeds. Uma instância reiniciada começa sem dados. Não há garantia
de consistência entre instâncias nem apagamento físico de logs cloud.

O publisher nunca segue redirects, consome comandos da resposta ou faz retry.
Sucesso é somente HTTP 204. Recusa ou resultado incerto encerra a execução;
erros são rótulos fixos sem corpo remoto, segredo ou payload privado. O destino
é verificado também na função que abre a conexão TLS. No máximo 15 tentativas
bem-sucedidas em foreground, intervalo mínimo 60 s e deadline de até 900 s.
Configuração temporal inválida recusa antes de ler o descritor de credencial.

O código do observador não registra headers/corpos. Testes instrumentam log,
warn e error ao enviar marcadores privados e garantem ausência de saída. Logs
de infraestrutura hospedada precisam de revisão separada antes do deploy.

## Comandos e verificações

```sh
npm run test:observer
node tests/local-movies.test.mjs
python3 -B -m unittest discover -s tests -p 'test_movies_*.py' -v
npm run lint
npm run build
git diff --check
```

Foram verificados os testes Node do observador (8), apresentação (1), entrada/
assets (2) e comparação local anterior (3). A suíte Python tem 26 testes,
incluindo 9 do publisher; os testes repetidos pelo script focado não são
contados como testes distintos. Tipos, build Vite, Ruff e whitespace passaram.
Os testes de entrada usam ambiente mínimo e arquivos `.env` sintéticos,
recusando antes de criar um listener configurado. Os únicos listeners que
abriram foram fixtures HTTP efêmeras de teste em loopback, fechadas ao final.

Dry-run, se solicitado posteriormente, permanece local:

```sh
python3 -B -m scripts.movies_publish --repo /mnt/data/Projects_SSD/Movies_Projects --dry-run
```

Não foi executado com dados reais nesta etapa. O modo `--publish` requer
`--credential-fd` e `--expires-at` UTC explícitos; não está autorizado agora.
Os flags ilustrativos de duração no plano anterior eram proposta; a versão
implementada fixa 15 publicações/60 segundos e exige deadline absoluto.

## Concorrência, metadados públicos e rollback

O HEAD do app avançou concorrentemente para
`8c9ebb8a6f703bbfc6a308a45bb4028c87c35292`, incorporando a entrega local anterior.
Este trabalho não criou commits ou alterou histórico. Os bytes dos quatro
arquivos existentes que o patch altera coincidiam com o baseline; os demais
arquivos concorrentes foram preservados. package-lock e node_modules não
foram instalados nem reconciliados nesta entrega.

Manifesto, board e approvals Movies mantiveram os hashes anteriores; o
frontend Movies manteve suas 94 entradas dirty. Parley fonte permaneceu em
movie-parley, HEAD 32b09ae6c4e3b54d689c157b44c948f4163e5dc3. Sem geração,
consulta paga, reinício de produção, grant, upload, deploy ou análise de segredo.

A leitura pública da raiz retornou ETag `W/"509-1a14d0f5588"`, Last-Modified
`Sun, 18 Oct 2026 03:30:13 GMT` e `/assets/index-ClSxq1Jy.js`. Não havia revisão
de deployment/commit explícita. A revisão implantada continua **não confirmada**;
nenhuma equivalência com o HEAD local foi inferida.

Rollback fica em
`/home/athar/Documents/Codex/2026-10-18/task/observer/rollback/`, com hashes em
`applied-hashes.json`, baseline e lista exata em `delivery-files.json`.
Primeiro verificar TODOS os hashes atuais contra o recibo; se houver drift,
parar. Só então restaurar os quatro originais: package.json, server.ts,
src/main.tsx e tsconfig.json; remover somente os 13 novos arquivos de código/
teste da lista. Nunca apagar diretórios inteiros, dependências, lockfiles ou
arquivos Movies. Regenerar dist local após restaurar fontes se necessário;
nada disso publica uma versão online. O relatório pode permanecer como história.

## Limite restante

Código local concluído e aplicado; ativação continua pendente do aceite de
duas credenciais reais, runtime/identidade/origem confirmados e deploy do
artefato revisado. Nada exige um serviço terceiro novo. O pedido opcional de
permissão da extensão foi encerrado e não foi reaberto. O preview anterior
expirou; nenhum novo preview foi iniciado nesta entrega.

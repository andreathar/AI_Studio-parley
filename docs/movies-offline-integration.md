# Movies / AI Studio: integração local verificada, sem exposição pública

## Integração local entregue — etapa visual

O fluxo completo agora é: fontes canônicas delimitadas → snapshot v2 → módulo
visual compartilhado → comparação navegável local. `src/local-movies-view.mjs`
substitui os seeds por tarefas de Movies, mantém status blocked, mostra papéis
sem inventar lanes, permite busca/filtro e compara demo/proveniência. Todas as
strings são renderizadas por textContent; não há dispatch nem funções de escrita.

`src/main.tsx` seleciona esse módulo com `?movies-local` antes de importar App.
Assim o modo local não monta os efeitos de polling ou os controles de ação do
App demonstrativo. Em origem pública ele recusa a leitura de arquivos. A rota
normal do app continua selecionando App. O parâmetro adicional
`preview-snapshot` lê somente `/snapshot.json` da mesma origem local, após o
guard de origem, dispensando o seletor de arquivos no preview compilado. Esta é uma tela local de comparação,
não uma alteração do frontend `sites/movies-demandas`.

Há duas entradas para o mesmo módulo visual:

1. **Preview temporário recomendado agora:** `scripts/movies_preview.py` usa
   somente stdlib e os recursos do checkout, sem instalar pacotes, carregar
   Express, executar `.env`, chamar APIs externas ou iniciar coordenador.
   Gera uma observação, mantém snapshot/JS/CSS em memória e serve uma allowlist
   no loopback numérico. O modo módulo usa cinco URLs; `--built` acrescenta
   somente index e assets JS/CSS/SVG existentes do build Vite. Expira em dez minutos (máximo 60) ou Ctrl-C.
2. **Importação manual no frontend Vite:** depois de haver dependências
   verificadas, abrir a instância local com `?movies-local` e selecionar o JSON
   v2. O File API lê o arquivo em memória; o módulo não faz fetch, upload,
   localStorage ou gravação. Nenhum JSON de produção entra no bundle/public.

Da raiz do checkout AI Studio:

```sh
python3 -B -m unittest discover -s tests -p 'test_movies_*.py' -v
node tests/local-movies.test.mjs
python3 -B -m scripts.movies_preview \
  --movies-root /mnt/data/Projects_SSD/Movies_Projects \
  --app-root /mnt/data/Projects_SSD/AI_Studio-parley --minutes 10 --built
```

O comando imprime uma URL `http://127.0.0.1:<porta>/?movies-local&preview-snapshot`.
Omitir `--built` usa o mesmo módulo visual sem precisar de dependências/build. Nenhum processo é
instalado no boot, nenhuma porta é fixada e nenhum coordenador é iniciado.
O preview não faz refresh automático: reiniciar manualmente produz uma nova
observação, sem modificar a produção. O processo expira sozinho; Ctrl-C o encerra antes. O preview de módulo
foi encerrado após a verificação. A sessão compilada fica disponível até
04:26:15 UTC em 2026-10-18, por dez minutos totais, para inspeção local. Para export manual, usar `scripts/movies_snapshot.py` com as mesmas
raizes e salvar stdout fora de `src`, `public`, `dist` e repositórios públicos.

### Dados, acesso e duração

Nenhum campo Movies é enviado a terceiro. O único destinatário automático é o
navegador neste computador, via GET same-origin ao processo Python em loopback.
Campos: projectId; timestamp; IDs de capítulo; tarefas (ID, título, status,
papel responsável); IDs de papéis; contagem de assets; IDs de seeds demo;
contagens de comparação; caminhos relativos e SHA-256 das oito fontes fixas.
Não inclui mídia, caminhos individuais de assets, prompts, blockers, approvals,
credenciais, histórico de conversa, banco ou estado nativo Parley.

Acesso: endereço remoto e Host numéricos loopback; Origin ausente ou exato;
Sec-Fetch-Site same-origin/none para recursos/dados. Navegação de documento
cross-site é permitida somente no shell `/`, sem snapshot embutido. POST,
OPTIONS e caminhos não allowlisted são recusados; CORS não é concedido. CSP
restringe scripts/conexões ao próprio preview. Não há login nem credencial
nova: outro processo local capaz de conectar ao loopback pode ler o snapshot
durante a janela. Após expirar/encerrar, não há endpoint remanescente.

A importação manual também funciona apenas em origem local/file e preserva o
snapshot anterior se o próximo arquivo falhar na validação. A tela não oferece
Sync, Spawn, Wake/Stop, envio de mail, aceites ou ferramentas pagas.

O snapshot v2 lê seis arquivos fixos Movies e dois do app. Ele inclui títulos
de tarefas para a tela local. Caminhos dentro das fontes não são seguidos.
Recusa escape por symlink, arquivos acima de 4 MiB, IDs repetidos, status/donos
incompatíveis e drift de leitura. A tela valida v2 e aceita arquivos até 1 MiB.

## Descoberta verificada em 2026-10-18 UTC

| Componente | Checkout / versão observada | Estado inicial |
|---|---|---|
| App AI Studio | `/mnt/data/Projects_SSD/AI_Studio-parley`, `main`, `8dd8c68ce44a57591c35290cc744c281936c6f2b` | limpo |
| Movies | `/mnt/data/Projects_SSD/Movies_Projects`, `main`, `4f341aa9ea0729980e97449b711214852e41f549` | somente submódulo `sites/movies-demandas` dirty no nível raiz |
| Frontend Movies | `sites/movies-demandas`, HEAD `dfb945f3aaaf5aaac20ed323cda66dd26d047bb9` | 94 entradas dirty, preservadas |
| Parley fonte | `/mnt/data/Projects_SSD/agent-parley`, `movie-parley`, `32b09ae6c4e3b54d689c157b44c948f4163e5dc3` | limpo |
| CLI diário | `~/.local/bin/agent-parley`, distribuição `0.18.2` | wheel local `agent_parley-0.18.2-py3-none-any.whl`; não reinstalado |

Remotes: app `https://github.com/andreathar/AI_Studio-parley.git`; Movies
`https://github.com/andreathar/Movies_Projects.git`; Parley origin
`https://github.com/andreathar/agent-parley.git`, upstream
`https://github.com/suneel944/agent-parley.git`. Sem fetch, troca de branch,
commit/push ou atualização da instalação. O checkout app avançou de `4a521a4`
para `8dd8c68` com implementação de git pull em sync.

O site `https://agent-parley.ai.studio/` foi observado no Chrome por ferramentas
suportadas. Mostra v0.18.0, três lanes (`lane-frontend`, `lane-backend`,
`lane-database`), TMDB/Prisma/Postgres, budget 27% e indicador LIVE/Healthy.
Os mesmos nomes e números vêm de `src/data/moviesProjectData.ts`, copiados para
arrays mutáveis no início de `server.ts`. Concordância com seed não prova
liveness; não foi obtido hash da revisão efetivamente implantada. Não se
clicou em Connect/Test, Sync, Spawn, Wake, Stop, Config/Secrets ou geração.

### Arquiteturas e contratos distintos

- App: React 18, Vite 6/Tailwind 4, Express 4/tsx, porta padrão 3000,
  `HOST=0.0.0.0`, CORS genérico. API REST e MCP JSON-RPC/SSE usam arrays em
  memória. CLI é simulada; hook responde `continue`. Registro Kling apenas
  adiciona lease/evento em memória; não grava o catálogo canônico Movies.
- `POST /api/projects/movies/sync` e `/api/git/pull` executam
  `git pull origin main --no-edit` no cwd do servidor. Não selecionam o
  checkout Movies. A resposta sync pode anunciar sucesso mesmo após falha.
  Essas rotas não foram executadas.
- O MCP do app verifica Bearer apenas quando presente; mismatch é um warning,
  sem recusa. REST não tem guard equivalente. Isto foi lido no código local,
  sem sondagem de acesso no serviço público. Diagnósticos renderizam partes
  de segredos; esse endpoint não foi consultado.
- Movies: workspace de produção audiovisual, 21 tarefas T01–T21, cinco
  encontros, dez papéis; frontend React 19/vinext com Cloudflare D1/Drizzle e
  exports derivados com hashes. Não é catálogo TMDB nem Prisma/Postgres.
- Bridge de revisão Movies: middleware Vite local, GET/POST
  `/__local/reference-reviews`; exige loopback remoto/Host, mesma origem,
  identidade local existente, JSON limitado, revisão/hash/locks. Preview de
  mídia permite GET/HEAD por ID e hash; sem arquivo arbitrário. Bridge de
  conectores usa token de sessão e contexto de preview próprios.
- Parley Python real: MCP local autenticado por Bearer e checks Host/Origin;
  console loopback usa sessão/CSRF e o CLI existente. Contrato distinto do
  Express. Perfil shared-media referencia a raiz canônica; não deve duplicar
  mídia ou hidratar LFS em lanes. Nenhuma nova lane ou serviço foi criado.

AI Studio hospedado não alcança o filesystem deste computador por conhecer o
caminho. `localhost` do servidor hospedado é aquele servidor. A origem pública
também não satisfaz os guards atuais da bridge Movies.

## Resultado da comparação inicial

Fixtures sintéticas passaram antes da leitura dos metadados reais. Foram
observados 324 registros CSV, cinco capítulos e 21 tarefas: 7 completed,
3 in_progress e 11 blocked. Os seis IDs demo #201–#206 não coincidem com T01–T21.
Os dez papéis são definições; autostart na registry está false.

O export frontend registra repositoryHead `44b489782642f28b218c51ca88a8dc5e7130880b`,
diferente do HEAD Movies observado. Entre os 47 hashes declarados no export,
somente três pertencem à allowlist desta ferramenta; esses três coincidiram.
Os demais 44 não foram verificados. Isso não autoriza regenerar exports nem
concluir que o pacote todo está atual/desatualizado.

`agent-parley doctor --json` retornou exit 1: launcher 0.18.2/protocolo 1,
serviço `not running`, store componente `schema 0 / absent`, approvals
`setup gap`, consistent false. É observação desta sessão e state home padrão,
sem reparar, iniciar serviço ou migrar estado. Não substitui uma consulta ao
contexto nativo do produtor. O arquivo bridge.sqlite3 existe no state home;
o resultado doctor não deve ser interpretado como ausência física de dados.

## Verificação e limites

Dezessete testes Python cobrem projeção, integridade de fontes e contrato HTTP
local (isolamento de origem, navegação inicial, ausência de CORS/escritas,
allowlist e expiração). Três testes Node cobrem validação e recusa de origem
pública. Ruff lint/format, parse JavaScript e transpile sintático da entrada
TypeScript foram verificados separadamente. Após surgirem dependências
concorrentes no checkout, `npm run lint` e `npm run build` também passaram;
1955 módulos foram transformados pelo Vite 6.4.4 sem execução de Express.

Movies `manage.py status`, `resume` e `lint` retornaram exit 0; lint tem zero
hard e 11 advisory existentes, incluindo bindings de referência, duplicação
de flags, handoffs pendentes/históricos, regra de mistake e offsets de sessão.
Não foram alterados registros canônicos para silenciá-los.

`make check` falha: não existe target/Makefile neste app TypeScript. Na descoberta inicial não havia node_modules. Dependências e package-lock
apareceram concorrentemente depois; não foram instaladas por esta entrega.
O frontend atualizado passou em lint e build com essas dependências existentes. Os erros históricos
de CI por `scripts.ci_scope` e `scripts.release_publish` ausentes não são
resultados de testes da aplicação. Esta entrega não corrige o pipeline herdado.

Não se investigou a possível credencial reportada por Gitleaks nem se leu ou
testou valor de segredo. O diagnóstico redigido separado continua pendente.
Não há prova de operação com modelos vivos, aceitação artística, consulta
contínua ao coordenador ou acesso do site público ao workspace Movies.

## Pacotes e verificação do frontend original

O lockfile rastreado é `bun.lock`, formato texto, lockfileVersion 2. Durante a
execução apareceram `package-lock.json` v3 (308 pacotes, untracked) e
node_modules com timestamp 2026-10-18 04:05:41 UTC. Não foram criados, removidos,
reconciliados ou adotados como lockfile canônico por esta entrega. Isso é
trabalho concorrente preservado; nenhuma instalação foi executada aqui.

Os scripts declarados são `bun run lint` (tsc --noEmit), `bun run build`
(vite build), `bun run dev/start` (tsx server.ts); npm run também executa esses
scripts com as dependências já presentes. Não há preinstall/install/postinstall/
prepare na raiz nem trustedDependencies explícitas. O bun.lock usa pacotes de
registry, sem URL Git/file embutida. Lifecycles transitivos não foram auditados
nem executados por esta entrega. Não rodar dev/start para a comparação: esses
scripts iniciam o backend Express. A decisão entre os dois lockfiles pertence
à manutenção de dependências e não é necessária para reproduzir o preview.

Com as dependências concorrentes, foram executados `npm run lint` e
`npm run build`, ambos exit 0. Versões observadas: React/ReactDOM 18.3.1,
Vite 6.4.4, TypeScript 5.9.3, plugin-react 4.7.0 e tailwindcss/vite 4.3.3.
Nenhum download, instalação ou lifecycle de instalação foi executado.

O bundle real abriu no Chrome em `?movies-local&preview-snapshot` com os dados
canônicos. Foram conferidos tabela 21 tarefas, filtro 11 blocked, dez papéis
com atividade não consultada e oito fontes por hash, além da comparação demo.
O trace CDP do carregamento mostrou GETs dos dados e chunks ao loopback, incluindo
snapshot.json e os chunks de entrada/local-movies; não carregou o chunk App e
não registrou chamadas /api ou POST. O HTML herdado ainda referencia Google
Fonts; a CSP do preview bloqueou o stylesheet externo (`blockedReason: csp`).
As injeções das extensões do navegador são separadas dos recursos do app.

A renderização sintética com `<img ... onerror>` exibiu o texto literal e zero
imagens dentro do root. O teste pelo seletor de arquivos foi tentado uma vez e
bloqueado antes de ler o arquivo: a extensão Chrome não tem “Allow access to
file URLs”. Essa permissão não foi habilitada. Validação JSON está coberta
pelos testes Node; o fluxo completo do seletor continua não verificado. O
preview automático compilado dispensa esse acesso e já foi verificado.

## Próxima decisão concreta

**Recomendação:** usar agora o preview de dez minutos ou o JSON local; ambos
permitem comparar a interface sem dados saírem do host e sem acesso persistente.
Não é necessária autorização adicional de upload, credencial ou acesso público
para esse fluxo local já solicitado. O operador pode reproduzi-lo pelo comando
acima. Lint, build e navegador do bundle Vite já foram verificados. A comparação
local não tem bloqueio pendente. O teste opcional de importação manual requer
apenas, se escolhido, autorização específica para habilitar na extensão Chrome
“Allow access to file URLs”; não é necessário concedê-la para usar o adaptador.

Conectar o site público a arquivos/ações nativas é outra decisão. Não há ação
pública pronta para aprovação nesta entrega: primeiro seria necessário escolher
os campos e operações exatos, destinatário/servidor, autenticação, duração e
revogação. Nenhum túnel, CORS/firewall, endpoint público, credencial, upload,
deploy, dispatch externo, serviço persistente ou gasto faz parte deste fluxo.

Rollback: conferir hashes da entrega; restaurar somente o diff de
`src/main.tsx` desta integração e remover seus novos arquivos específicos em
src/scripts/tests/docs. O original de main está no pacote de evidências local;
restauração recusa drift. Não apagar diretórios inteiros nem tocar o submódulo
Movies, dados de produção, configurações ou histórico Parley.

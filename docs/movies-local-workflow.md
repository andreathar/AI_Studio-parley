# Movies local — sessão de leitura

Checkout: `/mnt/data/Projects_SSD/AI_Studio-parley`, main, HEAD de referência
`90416d4eb660869fd31b3e8eb148bde87eb20d2d`. Movies canônico:
`/mnt/data/Projects_SSD/Movies_Projects`. O piloto online fica adiado;
nenhuma configuração de cloud, credencial ou publicação foi ativada.

## Usar

```sh
cd /mnt/data/Projects_SSD/AI_Studio-parley
npm run local:start
npm run local:status
# Abrir http://127.0.0.1:5184/
npm run local:stop
```

`local:serve` mantém a mesma interface em foreground, até Ctrl-C.
`local:start` reutiliza uma sessão própria saudável; recusa porta ocupada por
outro processo. `local:stop` verifica PID, início do processo, usuário, cwd,
comando e grupo de sessão antes de sinalizar somente o processo próprio.
Não encerra o frontend Movies, a interface na porta 3000 ou o coordenador.

Não há expiração de preview, registro no sistema operacional ou autostart.
Fechar a aba não encerra o processo; após reboot, iniciar manualmente.
O modo local serve módulos diretamente: não exige npm build nem carrega o
backend Express/MCP/demo ou SDK de modelos. Assets ficam em memória no
início; após mudar o código da vista, parar/iniciar a sessão e recarregar.

A página atualiza dados a cada 15 segundos quando visível, com cache de leitura
de 10 segundos no servidor e botão Atualizar dados. Filtros são preservados.
Falha de coleta retorna HTTP 503; a UI marca a última observação como antiga.
Não substitui falhas por participantes demo. `ready` em local:status confirma
o transporte da interface, não o estado da produção ou atividade de agentes.

## Escopo e evidência

Lê metadados canônicos e consulta o CLI Parley instalado, sem iniciar agentes.
Contrato local: `movies-ai-studio/local-session/v1`; a leitura nativa usa o
contrato validado `movies-online-observation/v1` somente dentro da máquina.
O CLI existente é 0.18.2; fonte Parley continua em movie-parley. Não houve
reinstalação, segundo coordenador, dispatch, mail, geração, upload ou gasto.

Verificação HTTP real: raiz, health e snapshot 200; /api/mcp 404;
POST /snapshot.json 405; Origin externo no snapshot 403. O servidor vincula
somente 127.0.0.1 e exige Host numérico/origem local; não concede CORS.
Outros processos locais do usuário podem ler os metadados, sem credenciais
adicionais. Não há acesso pela LAN ou pelo app público do AI Studio.

A leitura real mostrou 21 tarefas, 324 registros de assets, 10 papéis,
5 capítulos e coordenador ready/0.18.2. Claude e Codex são registros nativos
com atividade stale: a UI mostra Desatualizada. Provider não atribui papel
de filme. Não foi testada resposta/execução de agentes nem trabalho pago.
Mídia permanece no armazenamento canônico. O antigo frontend 5173 não
respondeu na descoberta; não foi parado, substituído ou reiniciado.

Testes após implementação: 31 Python e 15 Node distintos passaram; tipos,
build Vite (1957 módulos), Ruff e whitespace passaram. Os testes de socket
exigiram execução autorizada fora do sandbox; a primeira tentativa no sandbox
falhou com EPERM, sem demonstrar falha de aplicação. Rechecagem do checkpoint:
5 testes Python do launcher e 4 Node da vista passaram. Start/reuse/stop foram
exercitados somente numa cópia sintética descartável; a sessão real ficou
aberta. Não se repetiu lint/build/suíte completa após mudanças concorrentes
posteriores em persistência. Não há Makefile para make check neste checkout.

## Arquivos e rollback seletivo

Esta entrega alterou package.json (quatro scripts local:*), .gitignore
(.movies-local/), src/local-movies-view.mjs e sua declaração,
tests/local-movies.test.mjs; acrescentou scripts/movies_local.py,
tests/test_movies_local.py e este documento. Runtime privado fica em
.movies-local/ (ignorado), separado dos dados nativos Parley.

Baseline, originais e hashes da aplicação inicial estão em
`/home/athar/Documents/Codex/2026-10-18/task/local-session/`:
baseline.json, rollback/ e applied-hashes.json. Não restaurar esses backups
integralmente sem comparar o estado atual. package.json e .gitignore já
receberam alterações concorrentes posteriores: test:persistence e data/.
Outras alterações em App.tsx, server.ts, .env.example, stateStore.ts e testes
de persistência pertencem ao trabalho concorrente e foram preservadas.

Rollback proposto: executar local:stop; comparar todos os arquivos com o
recibo; se houver drift, revisar manualmente. Remover somente os quatro
scripts local:* e a linha .movies-local/ preservando acréscimos concorrentes;
restaurar a vista/declaração/teste somente se seus hashes ainda corresponderem
ao recibo inicial; remover somente os dois arquivos novos próprios se
inalterados. Não apagar diretórios inteiros, dados, lockfiles ou arquivos
Movies. Este documento pode permanecer como histórico. Não foi feito rollback.

Manifesto, board e approvals Movies mantiveram seus hashes. As 94 entradas
dirty preexistentes do frontend foram preservadas (128 com untracked
expandidos). Os três candidatos históricos de outra lane Codex já constam no
handoff canônico de 13/10 e não pertencem ao rollback desta integração.

O fechamento desta etapa é uma interface local de observação. Integração de
execução, novos grants, endpoint público, deploy, credenciais e trabalho pago
continuam fora desta entrega e exigem autorização específica.

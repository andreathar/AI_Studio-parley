# AGENTS.md — Agent Parley (local app)

Read this first. `README.md` describes the app; this file says how agents
work in this repository.

## Direction (current, supersedes older descriptions)

- This app is **local for now**. It is not a web/published product.
  Do not treat it as hosted, and do not deploy or publish it.
- Agent Parley and `Movies_Projects` are made for each other: Parley is
  the coordination app built specifically to coordinate
  `andreathar/Movies_Projects` (in code: `activeProject = 'movies_projects'`,
  `targetRepo = 'andreathar/Movies_Projects'` in `server.ts`).
  Keep that fit; do not generalise it away without an explicit decision.

## Source of truth for progress

- The **database is the source of progress**. Current base: SQLite in
  `src/server/stateStore.ts` (default `data/agent-parley.sqlite3`,
  `AGENT_PARLEY_DB_PATH` overrides it).
- Never create scattered JSON files to track progress, claims, lanes or
  status. Seed JSON/TS in `src/data/` is first-boot/recovery fallback only.
- If new state needs persisting, put it in the database behind an
  approved design — do not invent a new schema or a side file on your own.

## Working rules

- Run locally: `npm run dev` / `npm start` (`tsx server-entry.ts`),
  server on `127.0.0.1:3000` by default. Local MCP: `POST /api/mcp`.
- Checks: `npm run lint`, `npm run build`, `npm run test:persistence`,
  `npm run test:security`, `npm run test:observer` — use what the change touches.
- No commit, push, merge or deploy without Andre's explicit approval.
- Never read, print or commit secret values; refer to secrets only by
  variable name (see `.env.example`).
- Do not delete code or data to "clean up". Archive moves need approval.
- There is no Python CLI in this repo and no `CONTRIBUTING.md`; do not
  follow instructions that assume them. `docs/arquivo/` is archive, not
  required reading.

## Canonical notes outside this repo

Team coordination state (latest status and decisions) lives on the box in
`/workspace/ops/dev/` — `agent-parley-latest.md` and
`agent-parley-decisoes.md` are the source there. Those files record
history; this repo's docs are a clean implementation base and stay free
of task history.

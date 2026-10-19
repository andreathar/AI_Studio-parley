# Agent Parley

Agent Parley is a **local** coordination app. It is built for one target
project — `andreathar/Movies_Projects` — and `Movies_Projects` is the project
it is shaped to coordinate. The two are made for each other: Parley exists to
coordinate work on `Movies_Projects`, not as a general-purpose product.

For now this app is not a web product and is not published. Run it on your
own machine and use it locally.

## Run locally

Requirements: Node.js (with `node:sqlite`) and npm. Python 3 is only needed
for the `local:*` helper scripts under `scripts/`.

```sh
npm install
npm run dev        # same entry as `npm start`: tsx server-entry.ts
```

The server listens on `http://127.0.0.1:3000` by default
(`HOST`/`PORT` from `.env`, see `.env.example`).
`server-entry.ts` starts the full app, or the observer-only profile when
`MOVIES_OBSERVER_ONLY=1`.

Other scripts that exist in `package.json`:

```sh
npm run build            # vite build
npm run lint             # tsc --noEmit
npm run test:persistence # node --import tsx tests/persistence.test.mjs
npm run test:security    # node tests/security.test.mjs
npm run test:observer
npm run local:start      # python3 -B -m scripts.movies_local start
npm run local:status
npm run local:stop
```

The local MCP endpoint is served by the same process
(`POST /api/mcp`, also `/api/mcp/message` and `/mcp`). Write routes require
the Bearer secret named in `.env.example`; never commit real secrets.

## Database is the source of progress

Progress lives in a real database, not in scattered JSON files.

- Current base: SQLite via `src/server/stateStore.ts` (`node:sqlite`,
  `DatabaseSync`, WAL), default path `data/agent-parley.sqlite3`,
  overridable with `AGENT_PARLEY_DB_PATH`.
- Schema v1 is a snapshot store: tables `meta` and `project_state`
  (one JSON payload per project). That is the existing base — no new
  schema is promised here.
- Seed data in `src/data/` is only a first-boot / recovery fallback.
- Do not introduce loose JSON files as a source of truth for progress.
  New persisted state belongs in the database, behind an approved design.

## Structure

```text
server.ts            Express app, API routes and local MCP handler
server-entry.ts      Entry point (full app or observer-only profile)
src/App.tsx          React UI
src/components/      UI views
src/server/          Server helpers, incl. stateStore.ts (SQLite)
src/lib/api.ts       Authenticated fetch helper for the UI
src/data/            Seed data (fallback only, not progress)
data/                Local SQLite database (not committed)
docs/                Maintained local docs (docs/arquivo/ is archive)
tests/               Persistence, security and observer tests
scripts/             Local Movies helper scripts (Python)
```

Stack: TypeScript, React 19, Vite, Tailwind CSS 4, Express 5, `tsx`.

## What this is not

- Not a hosted/web product for now; any previously published site is an
  old preview outside the current direction.
- Not the `Movies_Projects` repository itself — it coordinates that repo
  from the outside; coordination state stays out of the target repo.
- Not a Python CLI package. There is no Python coordination CLI in this
  repository; the Python files here are local Movies helper scripts.

# Suggested commands

- Install from the checked-in lockfile: `bun install --frozen-lockfile`.
- Start the integrated Express + Vite development server: `bun run dev` (also `bun run start`); default host is `0.0.0.0`, port 3000. Set `PORT` or `HOST` to override.
- Create production assets: `bun run build`; the server serves `dist/` when `NODE_ENV=production`.
- Optional server-side Gemini features use `GEMINI_API_KEY`; `.env.example` lists optional `MCP_SHARED_SECRET` and `GITHUB_TOKEN` as well. Never copy secrets into source or share them.
- `package.json` is authoritative for scripts; README command guide describes a separate Python CLI and is not applicable to this app.
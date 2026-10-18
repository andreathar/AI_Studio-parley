# Task completion

- For frontend/server code changes, run `bun run lint` (TypeScript `tsc --noEmit`) and `bun run build`.
- No automated test script is currently declared. Add/run focused tests only if the change introduces or targets an established test harness.
- Use the Bun lockfile; do not alter or bypass configured checks. Python repository instructions mention `make check`, but no `Makefile` or Python package tree is present in this checkout, so that command is not a valid app completion gate.
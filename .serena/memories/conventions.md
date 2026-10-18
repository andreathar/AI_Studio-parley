# Conventions

- React UI lives in `src/components/`; `src/App.tsx` composes screens and owns shared application state. Domain types are centralized in `src/types.ts`; seeded view data is in `src/data/`.
- Express routes and server startup currently live together in root `server.ts`; server-side Kling/Gemini integrations are in `src/server/klingAiService.ts`.
- Existing TypeScript uses ES module imports, single quotes, semicolons, typed React function components, and interfaces for domain/request shapes. Preserve strict TypeScript compatibility.
- The checked-in guidance is inconsistent with implementation: `AGENTS.md` and `CONTRIBUTING.md` impose Python/Ruff conventions for an unrelated package. Confirm a requested change's actual module and use nearby source/config patterns; do not add Python unless explicitly asked.
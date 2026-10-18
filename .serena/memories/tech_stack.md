# Tech stack

- TypeScript ES modules; React 18.3 + React DOM 18.3, Vite 6, Tailwind CSS 4 with `@tailwindcss/vite`, Express 4, CORS, and `@google/genai` 2.29.1 range.
- `tsx` runs the Express entry point (`server.ts`); Vite is integrated as middleware for development and serves the built `dist/` assets in production.
- Package manifest is `package.json`; lockfile is `bun.lock`. Prefer Bun's locked install/run workflow.
- TypeScript targets ES2022, uses bundler resolution, React JSX transform, and `strict: true`; `tsconfig.json` includes `src` and `server.ts`.
- No test script or test runner is declared in `package.json`.
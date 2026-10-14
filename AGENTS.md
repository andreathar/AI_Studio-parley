# agent-parley

Shared operating guidance remains authoritative at `~/.claude/CLAUDE.md`.

Follow `CONTRIBUTING.md` for Google Python style guidance, the project's explicit
tooling adaptations, and coordination invariants. New production APIs require
type annotations and Google-style documentation; Ruff enforces the configured
rules. Keep the 80-character formatting target and do not weaken checks.

- Python 3.12+; coordination runtime uses only the standard library.
- Follow module boundaries in docs/architecture.md. Document behavior and
  rationale in docstrings or docs; do not add Python inline comments.
- Keep coordination state outside target repositories. Preserve native CLI
  authentication and permissions; never add bypass flags.
- Read the implementation before changing launch, identity, or process handling.
- Reservations are advisory. Do not describe them as enforced filesystem locks.
- Use RTK explicitly for development commands when available.
- Do not add generator credits, assistant attribution, robot signatures, or
  assistant coauthor trailers to code, commits, PRs, issues, or comments.
  Use neutral contribution and release text. Enforce this through the policy
  and PR hygiene gates; do not remove required license notices.
- Run focused checks while editing. The final gate is `make check`, also used by CI.
- Integration tests use real local MCP transport and temporary Git repositories.
  Distinguish those results from verification of live model behavior.

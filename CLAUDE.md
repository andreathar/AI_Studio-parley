# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

`AGENTS.md` (imported above) and `CONTRIBUTING.md` hold the style and coordination invariants. This file adds the commands and the code map.

## Commands

Everything runs through uv with the lockfile; never use an unlocked environment.

```sh
uv sync --locked                               # dev environment (pytest, ruff, mypy, mcp, ...)
uv run --locked pre-commit install             # once per clone; hooks never rewrite files

uv run --locked ruff check .
uv run --locked ruff format --check .          # format with `uv run --locked ruff format .`
uv run --locked mypy                           # files from pyproject: agent_parley/ and scripts/
uv run --locked python scripts/check_policy.py # repository policy gate (see below)
uv run --locked pytest -q -n auto              # full suite, parallel
uv run --locked pytest -q tests/test_claims.py # one file
uv run --locked pytest -q tests/test_mail_routing.py -k "supersed"   # one test by name

make check                                     # the CI gate: sync, ruff, mypy, policy, build, pytest
make build                                     # wheel + sdist with `uv build --no-sources`
make demo-stub                                 # record the stub walkthrough; `make demo` needs real CLIs
```

`make check` is what CI runs and is the only completion criterion. The `tests/test_fault_acceptance.py` module also gates minor and major releases.

### The policy gate

`scripts/check_policy.py` fails on things lint does not catch, so run it before claiming a change is done:

- Every function in `agent_parley/` and `scripts/`, including private helpers, needs a docstring. Rationale goes in docstrings or `docs/`, never in Python inline comments (every `#` comment in those directories is rejected).
- Runtime imports are stdlib or `agent_parley` only; `dependencies = []` in `pyproject.toml` stays empty.
- No generator credits, assistant attribution or coauthor trailers anywhere in tracked text, commit messages or PR text. The same check runs as a `commit-msg` hook.
- README links must resolve off GitHub, Markdown must not repeat a paragraph verbatim, and package, plugin, marketplace, `server.json`, `glama.json` and release-manifest versions must agree.

Pull request titles are Conventional Commits (`feat`, `fix`, `perf` for user-visible product changes; `docs`, `ci`, `chore`, `test`, `refactor` otherwise) and the body needs `Refs #N` to a repository issue.

## Architecture

A zero-runtime-dependency Python package (3.12+) that runs several coding-agent CLIs on one repository, each in its own Git worktree, and records who owns what. `docs/architecture.md` has the authoritative per-module table and must be updated when a module's responsibility changes; this is the shape to hold in mind.

**Entry and command object.** `entry.main` handles the bare invocation (start-here screen in `start`) and otherwise dispatches to `cli`. `cli.Bridge` is the command object: `core` is its base (state root, config, service start/stop, project manifest, lanes) and the command groups are mixed in from `settings`, `integration`, `unattended`, `blueprints`, `claims`, `mail`, `reports`, `status`. Read-only commands render through `views` (`--json`, Prometheus) and `tables` (shared by `status` and `top`).

**State lives outside target repositories.** The private state root is `--home` or `AGENT_PARLEY_HOME`, default `~/.local/state/agent-parley`. `state` provides atomic JSON publication and operation locks; `store` is the SQLite WAL database for mail, leases (advisory reservations), tool events and the wait queue; `attachments` spills oversized payloads to bounded files. Issue ownership is a ledger of claim generations (`issues`, `lifecycle`), mutated only under the operation lock and published atomically. Never add timeout-based ownership takeover.

**Service.** `server` is the authenticated MCP transport over loopback with bounded tool contracts; `protocol` is the wire contract shared by launcher, plugin, hooks and service. `supervision` is the periodic poll (presence, wakes with backoff, orphan and expired-lease reclaim, pull-request readings, dispatch of planned issues); `convergence`, `budgets`, `decisions`, `denials`, `timeouts` and `notify`/`inbound` hang off it.

**Lanes.** `launch` registers a lane, writes its per-session MCP config and hooks, and supervises the native client on a pseudo-terminal owned by `terminal`; `dialogs` answers the native permission dialogs the operator configured. `lanes` holds the single authoritative lane state record (`starting`, `working`, `idle`, `blocked`, `stopped`, `dead`, `reclaimed`) with a closed transition table; hooks (`hook` → `checkpoints`) and the dialog watcher only submit evidence. Provider-specific adapters (`gemini`, `copilot`, `opencode`, `amp`) translate hook events and config formats; `claude` and `codex` are the native path. `delivery` polls for CLIs that cannot carry coordination through an event.

**Integration.** `worktrees` runs Git in the base checkout and the base verification gate; `merges` decides refusals, preview, ordering and the merge; `integration` and `unattended` expose them to the operator, and only an operator command or an explicit unattended policy ever merges. `recovery`, `retirement`, `reclaim` and `pool` manage abandoned claims and lane worktrees. `forge` is the optional, best-effort GitHub (`gh`), beads (`bd`) or `null` issue backend.

**Policy sharing.** `policy.has_attribution` is used by the lane hook, integration and `scripts/check_policy.py`, so the attribution rule is one implementation.

## Tests

`tests/conftest.py` pins `AGENT_PARLEY_HOME`, `CLAUDE_CONFIG_DIR` and `CODEX_HOME` to the test's `tmp_path`, so tests never read the developer's live store. Fixtures: `bridge` (a `Bridge` on a free loopback port, torn down after the test), `repo` (a committed Git repository whose path contains spaces), `paired` (`claude` and `codex` participants registered on it). Integration tests drive the real local MCP transport and temporary Git repositories; they do not prove live model behavior, which only the acceptance run in `docs/acceptance.md` covers. Tests are exempt from the docstring and annotation rules; descriptive test names are the documentation.

The installed-package tests (`tests/test_bridge.py`, `tests/test_install_script.py`) build into a temporary tool environment outside the checkout to catch source-tree imports, which is why `make check` includes `make build`.

The shipped plugin is `plugins/agent-parley/` (Claude and Codex manifests plus the single `coordinate` skill); `.claude-plugin/marketplace.json` and `.agents/plugins/marketplace.json` publish it, and `scripts/check_mcp_manifests.py` validates the MCP catalog metadata in `server.json` and `glama.json`.

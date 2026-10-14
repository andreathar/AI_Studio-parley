# MCP directory listings

This document prepares listings of the Agent Parley coordination MCP server in
the public MCP directories. It records which file each directory reads, how
this repository validates that file, the exact submission steps and listing
text, and the decisions that belong to the repository owner. Nothing here has
been submitted. Every submission below is an owner action, taken only after
the owner explicitly approves it.

## What every listing must say

The `agent_parley` MCP server is not a standalone server. The launcher starts
one coordination service per state root and attaches each lane's client to it
over local streamable HTTP, with a per-lane bearer token, when a lane is
started with `agent-parley run <client>`. There is no stdio entry point, no
public URL and no command a directory client can run on its own to get a
working server. Every listing therefore states plainly that the server needs
`agent-parley run`.

Short description, used wherever a directory asks for one line (100
characters, the registry maximum):

> Coordination server for parallel coding agents. Runs only inside a lane
> started by agent-parley run.

Long description, used wherever a directory accepts a paragraph:

> Agent Parley runs several coding agents side by side on one repository.
> Each lane works in its own Git worktree, claims numbered issues before
> editing, announces advisory file reservations to the others, and hands work
> over explicitly with a summary and evidence. Its MCP server exists only
> inside those lanes: install the `agent-parley` package from PyPI and start
> a lane with `agent-parley run claude` (or `codex`, `gemini`, and the other
> supported clients). The server cannot be added to an MCP client on its own.

## Manifests and validation

| Directory | File | Validated against | Version source |
| --- | --- | --- | --- |
| Official MCP registry | `server.json` | `server.schema.json` 2025-12-11 | `pyproject.toml` |
| Glama | `glama.json` | `https://glama.ai/mcp/schemas/server.json` | none carried |
| Smithery | none | not applicable | not applicable |
| mcp.so | none | not applicable | not applicable |

`scripts/check_mcp_manifests.py` checks both files with the standard library
only. It restates the required fields, types, length limits and name pattern
of each published schema, rejects any field the schema does not define,
requires `server.json` to carry the `pyproject.toml` version and to name
`agent-parley run` in its description, and refuses any credential, token or
private path. `scripts/check_policy.py` runs it, so `make check` and CI fail
on a broken manifest. `tests/test_mcp_manifests.py` covers each rule. The
schemas are not vendored; both were fetched on 2026-09-30 from:

- `https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json`,
  the version the registry's `docs/reference/server-json` pages named on
  that date.
- `https://glama.ai/mcp/schemas/server.json`.

A release raises the `server.json` version with every other marker:
`python3 -m scripts.release_publish bump` writes it, and the policy gate
compares it with `pyproject.toml`.

## Official MCP registry

The registry at `https://registry.modelcontextprotocol.io` reads `server.json`
and is published with the registry's `mcp-publisher` CLI. The name
`io.github.suneel944/agent-parley` sits in the GitHub namespace, which the
registry verifies by GitHub login as `suneel944`.

The checked-in `server.json` carries metadata only: name, title, the short
description, version, website and repository. It declares no `packages` and
no `remotes` entry, because both describe a server a directory client starts
or reaches on its own, and this one does not exist outside a lane. See the
open decisions below.

Steps, owner only, after approval:

1. Check out the release tag and run `make check`; confirm the
   `server.json` version is the released version.
2. Install `mcp-publisher` from
   `https://github.com/modelcontextprotocol/registry/releases/latest`.
3. Run `mcp-publisher login github` as `suneel944`.
4. Run `mcp-publisher publish` from the repository root.
5. Confirm the entry at
   `https://registry.modelcontextprotocol.io/v0.1/servers?search=io.github.suneel944/agent-parley`.

Each later release needs another `mcp-publisher publish` of the raised
version.

## Glama

Glama indexes public GitHub repositories and reads `glama.json` at the
repository root to learn which GitHub accounts may maintain the listing. The
file names `suneel944` and carries no version.

Steps, owner only, after approval:

1. Sign in at `https://glama.ai/mcp/servers` with the `suneel944` GitHub
   account.
2. Add the server by its repository URL,
   `https://github.com/suneel944/agent-parley`, if Glama has not indexed it.
3. Claim the listing; Glama checks the account against `maintainers`.
4. Replace the generated summary with the long description above.

Glama also runs a server it lists in its own sandbox to inspect tools. That
needs a standalone start command; see the open decisions below.

## Smithery

Smithery reads no repository file. On 2026-09-30 its publishing guide at
`https://smithery.ai/docs/build/publish` accepted only a public HTTPS server
URL or an MCPB bundle for a local stdio server. The former `smithery.yaml`
start command is no longer part of that guide. Agent Parley has neither form,
so no Smithery manifest is added. Listing there is an open owner decision.

## mcp.so

mcp.so reads no repository file. Its submission form at
`https://mcp.so/submit` asked on 2026-09-30 for a project name and a GitHub
repository URL.

Steps, owner only, after approval:

1. Open `https://mcp.so/submit` and sign in.
2. Enter `Agent Parley` and `https://github.com/suneel944/agent-parley`.
3. Where the form offers a description, paste the long description above.

## Open owner decisions

- **A registry package entry.** The registry's `packages` entry for PyPI
  (`registryType: pypi`, identifier `agent-parley`) needs a transport a client
  starts: `stdio`, or local `streamable-http` at a URL the client can fill in.
  The lane server's port and bearer token are assigned by the launcher, so
  neither fits without a new standalone entry point. Adding one would also
  require an `<!-- mcp-name: io.github.suneel944/agent-parley -->` line in
  `README.md`, which the registry checks on the PyPI project page, and so a
  release carrying it. Until the owner decides, the listing stays
  metadata-only.
- **Smithery.** Smithery accepts only a public HTTPS URL or an MCPB stdio
  bundle. Listing there needs a standalone stdio entry point packaged as MCPB,
  or no listing.
- **Glama inspection.** Glama's sandbox inspection needs a standalone start
  command. Without one, the listing shows repository metadata only.
- **Every submission.** Publishing to any directory is a statement under the
  owner's account and needs explicit approval first.

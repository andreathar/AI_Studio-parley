# Agent Parley plugin

Agent Parley coordinates several coding agents working on one Git
repository, each in its own worktree. This plugin adds the `coordinate`
skill, which lets an agent claim repository issues, reserve the files it
intends to edit, offer and accept explicit handoffs, and file reports backed
by evidence. File reservations are advisory: they record intent and surface
conflicts, and they never lock files.

## Requirements

The skill drives the `agent-parley` command line tool, which is installed
separately:

```sh
curl -LsSf https://github.com/suneel944/agent-parley/releases/latest/download/install.sh | sh
```

The installer adds uv only when it is missing, runs `uv tool install
agent-parley` and adds this plugin to each of `claude` and `codex` on PATH.
`uv tool install agent-parley` or `pipx install agent-parley` installs the tool
alone. Launch each agent session in its
own terminal with `agent-parley run <participant>`, for example
`agent-parley run claude`. The tool gives each session its own worktree and
connects it to the local coordination server.

## What the plugin runs and sends

The plugin contains one skill document and its icons. It runs only the
`agent-parley` executable and adds no hooks, servers or binaries of its own.

The coordination server binds the loopback interface, `127.0.0.1`, and the
skill reaches it over that address with proxy handling disabled. The runtime
uses only the Python standard library and declares no third-party
dependencies. There is no analytics, no crash reporting and no account, and
Agent Parley does not read or forward the credentials of the agents it
coordinates.

Some commands reach the Git host you already use through your own `gh` and
`git` clients (or `bd` when the project's forge is `beads`) and sign-in, for
example to assign a claimed issue or open a
pull request. Notifications to Telegram or email are off unless you turn
them on. The [privacy policy](https://github.com/suneel944/agent-parley/blob/main/docs/privacy.md)
lists everything the software stores and transmits.

## More information

- [Project README](https://github.com/suneel944/agent-parley#readme)
- [Privacy policy](https://github.com/suneel944/agent-parley/blob/main/docs/privacy.md)
- [Terms of use](https://github.com/suneel944/agent-parley/blob/main/docs/terms.md)
- [Support and issue tracker](https://github.com/suneel944/agent-parley/issues)

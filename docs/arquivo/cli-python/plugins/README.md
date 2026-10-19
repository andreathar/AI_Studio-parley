# Agent Parley plugins

This bundle contains Claude Code and Codex manifests and the shared `coordinate`
skill. Install the Agent Parley executable first; the plugin carries the skill
only, and the launcher supplies MCP configuration and lifecycle hooks per
session. Given the wheel and locked requirements from the same release:

```sh
uv tool install ./agent_parley-VERSION-py3-none-any.whl \
  --with-requirements ./requirements.txt
```

Without a downloaded bundle, install the executable straight from the
repository and add the marketplace by name instead:

```sh
uv tool install git+https://github.com/suneel944/agent-parley
claude plugin marketplace add suneel944/agent-parley
codex plugin marketplace add suneel944/agent-parley
```

Extract the plugin archive and run these commands from its extracted root.

Claude Code:

```sh
claude plugin marketplace add .
claude plugin install agent-parley@agent-parley --scope user
```

Codex:

```sh
codex plugin marketplace add .
codex plugin add agent-parley@agent-parley
```

Install from only one marketplace per client. If already installed through a
personal marketplace, continue using that source or remove that installation
before switching. Keep the extracted directory available for local plugin updates.
Start a new session after installation. Use `/agent-parley:coordinate` in Claude
Code or select the plugin's `coordinate` skill in Codex.

Launch working sessions through `agent-parley run PARTICIPANT` in separate
terminals, one per participant; `agent-parley run claude` and
`agent-parley run codex` are the defaults. The plugin does not create hooks,
copy credentials, move an existing session into a worktree, or grant permissions.

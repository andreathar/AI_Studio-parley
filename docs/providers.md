# Providers and accounts

A provider states which native CLI drives a participant and how that CLI reaches
a model. Every provider names one of the adapters, and the adapter decides how
that CLI is handed its MCP server, its coordination prompt and its hooks. Two of
them take a published plugin, which is why two plugin installations cover every
model-endpoint preset. The full configuration reference is in
[Operations](operations.md#participants-providers-and-accounts).

| Provider | Native CLI it drives | Plugin that carries `coordinate` |
| --- | --- | --- |
| `claude` | `claude` | Claude Code |
| `codex` | `codex` | Codex |
| `copilot` | `copilot` | none; the launcher writes that lane's files |
| `gemini` | `gemini` | none; the launcher writes a private settings overlay |
| `opencode` | `opencode` | none; the launcher writes a private config directory and plugin |
| `amp` | `amp` | none; the launcher writes a private settings file, and refuses to launch until Amp raises thread start and idle events |
| `deepseek`, `kimi`, `grok` | `claude` or `codex`, vendor endpoint | that adapter's plugin |
| your own, via `agent-parley provider add` | the adapter you name | that adapter's plugin |

`agent-parley provider list` prints each definition with `unavailable_hooks`,
the lifecycle events that CLI cannot deliver: `PermissionRequest` for `gemini`,
`SessionEnd` for `opencode`, every event except `PreToolUse` and `PostToolUse`
for `amp`, none for the others. A launch refuses an adapter that cannot deliver
`SessionStart`, `PreToolUse` or `Stop` instead of running without those guards;
today that refuses `amp` in one sentence naming the missing events.

The same listing prints `delivery`, the path coordination takes into a lane on
that provider.

| `delivery` | How a lane is told | Which adapters | What it cannot do |
| --- | --- | --- | --- |
| `hooks` | a native lifecycle event returns bounded context at a turn boundary | `claude`, `codex`, `copilot`, `gemini`, `opencode` and every preset built on them | nothing further; this is the full path |
| `polled` | a launcher-owned thread reads the mailbox on an interval and publishes it to `STATE/projects/PROJECT_KEY/NAME-delivery.md`, which the lane's prompt tells it to read each turn | any adapter missing `SessionStart`, `UserPromptSubmit`, `PreToolUse` or `Stop`; `amp` today | deny a tool call, hold a turn open, or guarantee the lane reads the file; budget threshold notices are not carried, and a missing required guard still refuses the launch |

`AGENT_PARLEY_DELIVERY_SECONDS` sets the interval for a polled lane, 20s by
default. Delivery is recorded in that lane's event log like a served
checkpoint, so `agent-parley top` reports its delivered context in `CONTEXT`.

### How idle, blocked and prompt states are detected

A lane's state comes from a native hook when its client raises one, and
otherwise from the launcher's dialog watcher, which reads the lane's own
terminal, or from the supervision poll's liveness sample of the session
process. `status`, `top` and `problems` mark a state the watcher or the
liveness sample set as inferred, for example `blocked: approval 2m; inferred
by dialog watcher, no PermissionRequest hook`, and name the hook the client
lacks. `status --json` carries the same reading under each lane's
`provenance`: its `source`, whether it is `inferred`, and the `gap`.

For an adapter missing `PermissionRequest` or `Stop`, the poll reads the
dialog the watcher published on every pass while the lane is idle or blocked,
and records the lane blocked under that dialog's cause, so an approval or
question prompt still reaches `problems` as a row for the operator.

| Provider | Hooks it cannot raise | Delivery | Idle | Blocked on approval | Other prompts |
| --- | --- | --- | --- | --- | --- |
| `claude`, `codex`, `copilot` | none | `hooks` | `Stop` hook | `PermissionRequest` hook | dialog watcher |
| `gemini` | `PermissionRequest` | `hooks` | `Stop` hook | dialog watcher, read every poll | dialog watcher |
| `opencode` | `SessionEnd` | `hooks` | `Stop` hook | `PermissionRequest` hook | dialog watcher |
| `amp` | `SessionStart`, `UserPromptSubmit`, `PermissionRequest`, `Stop`, `SessionEnd` | `polled` | liveness sample | dialog watcher, read every poll | dialog watcher |

A hook-delivered lane idle at its prompt receives mail only when something
makes its client raise a hook, such as a wake the service sends; a polled lane
reads its delivery file on its own interval.

## Accounts

### The three names a lane carries

Provider, credential profile and participant are three separate registries that
accept the same-looking names, and a command that reads one of them never falls
back to another.

| Name | What it names | Defined by | Selected by |
| --- | --- | --- | --- |
| Provider | the native CLI a lane starts, the adapter that configures it, and any endpoint it rides | a built-in preset, or `agent-parley provider add` | `--provider` |
| Credential profile | one account of a CLI, recorded as a configuration directory and variable names | `agent-parley credentials add` | `--credentials` |
| Participant | one lane: its worktree, its branch and the identity peers address | `agent-parley run NAME`, or `agent-parley participant add NAME` | the name itself |

A participant is created by its first `run`; `participant add` only prepares one
in advance. The name must match `[a-z0-9][a-z0-9_-]{0,38}`, is unique within the
repository, and a project holds at most 32 participants.

`--provider` defaults to the participant name. `agent-parley run claude-2` with
no other flag therefore looks for a provider called `claude-2` and refuses with
`Unknown provider 'claude-2'`, even though the `claude` preset exists. Name the
provider whenever the participant is not named after it.

### Which names are already taken

```sh
agent-parley participant list
agent-parley provider list
agent-parley credentials list
```

`participant list` prints one line per lane, and its last field is the account:

```
claude-2: provider claude; identity claude-2; account-2
```

A trailing `default account` means that lane uses the CLI's own login, so a
profile you expected to be bound is not. `provider list` and `credentials list`
print the two other registries; `provider show NAME` prints one definition with
the lifecycle events its adapter cannot deliver, and `credentials show NAME`
prints one account profile with every recorded override reported by name only.

### Which account a provider reaches

`claude`, `codex`, `copilot`, `gemini`, `opencode` and `amp` use their native
accounts, and their sign-in stays with the native CLI. The `deepseek`, `kimi`
and `grok` presets carry no endpoint, so their base URL and key must be exported
in the launching shell; the launcher refuses to start when a required variable
is unset rather than falling back to another account. Coordination state records
variable names and config directories, never credential values.

Each preset names one configuration-home variable. A credential profile's
`--config-home` is applied to that variable for the launch, which is what makes
a second account of the same provider possible.

| Provider | Variable a profile sets | Variables the launch requires from your shell |
| --- | --- | --- |
| `claude` | `CLAUDE_CONFIG_DIR` | none |
| `codex` | `CODEX_HOME` | none |
| `copilot` | `COPILOT_HOME` | none; a profile is required for this adapter |
| `gemini` | `GEMINI_CLI_HOME` | none |
| `opencode` | `OPENCODE_CONFIG_DIR` | none |
| `amp` | `AMP_SETTINGS_FILE` | none |
| `deepseek`, `kimi` | `CLAUDE_CONFIG_DIR` | `ANTHROPIC_BASE_URL`, `ANTHROPIC_AUTH_TOKEN` |
| `grok` | `CODEX_HOME` | `OPENAI_BASE_URL`, `OPENAI_API_KEY` |

Those variable names are the preset definitions in `agent_parley/roster.py`, and
a launch refuses with `Export these before launching:` and the missing names
rather than starting on another account. `provider add --require-env` adds the
same requirement to a definition of your own, and the same flag on
`credentials add` adds it to one account.

Three adapters are handed a lane-private copy of their native configuration
instead of command-line arguments, so the launcher sets one more variable itself
for that launch only: `GEMINI_CLI_SYSTEM_SETTINGS_PATH` for `gemini`,
`OPENCODE_CONFIG_DIR` for `opencode` and `AMP_SETTINGS_FILE` for `amp`, each
built from the file or directory the profile selected. A `copilot` lane instead
gets `mcp-config.json` and `settings.json` written into the `COPILOT_HOME` its
profile names, which is why that adapter refuses to launch without a profile
rather than writing this lane's hooks into the configuration directory your own
sessions use.

### Run a second account of the same provider

Define the profile, sign in to it once with the native CLI, then launch a new
participant that names both the provider and the profile:

```sh
agent-parley credentials add account-2 --config-home ~/.claude-account-2
CLAUDE_CONFIG_DIR=~/.claude-account-2 claude
agent-parley run claude-2 --provider claude --credentials account-2
```

`credentials add` creates the directory with owner-only permissions and records
its path. It records no token: the second line is the native CLI performing its
own sign-in inside that directory, and it is the only step that touches an
account. Use that provider's own variable from the table above in place of
`CLAUDE_CONFIG_DIR` for another CLI.

The launch prints the binding it used:

```
claude-2 (claude, account-2): /path/to/lane
```

and `agent-parley participant list` reports the same binding afterwards. If
either prints `default account`, the profile was not bound; see the next
section, because a relaunch with the flag will not change it.

### Provider and account are fixed once the participant exists

The provider and profile are recorded when the lane is created, and a later
`run` or `participant add` for the same name with a different pair is refused:

```
Participant claude-2 already uses provider claude with the default account.
```

Passing the same pair again is accepted and changes nothing. There is no command
that rebinds a lane, because the lane's configuration, its registered identity
and its native session were all built for the account it was created with. The
route is to retire that participant and add it again with the flags you meant:

```sh
agent-parley participant stop claude-2
agent-parley participant retire claude-2
agent-parley run claude-2 --provider claude --credentials account-2
```

`retire` refuses while a session is running, refuses while the lane's
checkpoint lock is busy, and refuses a lane with uncommitted changes, so commit
or preserve the work first; it never discards work. Ignored files in the
worktree are deleted with it only after you confirm them by name, or with
`--yes`. Commits
the lane made are kept on its branch, and it says so. It also refuses a lane
whose ready work still awaits integration. Its issue claims return to the pool,
its reservations are released and granted to queued peers, and mail it has not
read or acknowledged is marked superseded. Messages are preserved.
The replacement lane is a fresh worktree on the next free lane branch, so it
does not continue the retired branch: merge that branch, or branch from it with
Git, if the new lane should carry that work.

### `provider add` defines a CLI, not an account

`provider add` is for a native CLI that no preset ships, or for an endpoint
override of one that does. It requires `--adapter` and `--executable`, and a
definition that reuses a preset name shadows that preset until
`provider remove` restores it. It is not how a second account is added; a
credential profile is.

Shell aliases and wrapper functions are not consulted either. The launcher
resolves a provider's executable on `PATH`, so an alias such as
`alias claude-p2='CLAUDE_CONFIG_DIR=... claude'` is invisible to it and cannot
be passed to `--provider`. A credential profile expresses exactly what that
alias expresses, because the launch sets the provider's configuration-home
variable to the profile's directory.

Removing a definition leaves participant references intact. Redefine that name
before relaunching a lane that uses it. A removed provider override immediately
reveals its built-in preset, if any.

## Gemini

`agent-parley run gemini` starts Gemini CLI with a lane-private MCP and hook
overlay while preserving native system settings and authentication. Existing
explicit provider definitions keep their adapter until you update them: a local
`gemini` definition that rides `claude` or `codex` through a vendor endpoint
shadows the preset and keeps working unchanged, and `provider remove gemini`
reveals the native preset again.

## OpenCode

`agent-parley run opencode` starts OpenCode with a lane-private copy of its
configuration directory, selected with `OPENCODE_CONFIG_DIR`, that adds the MCP
server under `mcp` and one plugin under `plugin/` that runs the checkpoint hook
command for each supported plugin event. The launch path is verified against a
stub executable and the exact hook command; a live OpenCode session has not been
exercised, see [Operations](operations.md#other-agent-clis).

## Amp

`agent-parley run amp` builds a lane-private copy of Amp's `settings.json`,
selected with `AMP_SETTINGS_FILE` and `--settings-file`, that adds the MCP
server under `amp.mcpServers` and one `amp.hooks` entry per tool event that runs
the checkpoint hook command. Amp raises no thread start or idle event, so
`SessionStart` and `Stop` cannot run and the launch is refused rather than
started unguarded; the overlay, hook translation and `threads continue ID`
resume are verified against a stub executable only, see
[Operations](operations.md#other-agent-clis).

## Other agent CLIs

Six adapters cover the native configuration contracts. `claude` and `codex` take
MCP servers, the coordination prompt and lifecycle hooks as command-line
arguments. `copilot` reads them from files instead, so Agent Parley writes
`mcp-config.json` and `settings.json` into that lane's own Copilot
configuration directory; a `copilot` lane therefore requires a credential
profile, and the launcher refuses without one rather than writing hooks into the
configuration directory your own sessions use. `gemini`, `opencode` and `amp`
each receive a lane-private copy of their native configuration that lives in
Agent Parley's state directory, never in the repository, and is rebuilt on every
launch and removed by `participant retire`. `amp` is refused at launch until Amp
can raise the required guards.

[Operations](operations.md#other-agent-clis) records what each CLI supports,
where its MCP and hook configuration lives, and which behaviour is verified
against a stub rather than a live session.

# Privacy policy

Agent Parley is a command line tool and plugin published by Suneel Kaushik S.
It coordinates several coding agents working on one Git repository. This
policy describes what the software stores, where it stores it, and what it
transmits. It applies to the published package, to the Claude plugin and to
the Codex plugin, which share one coordination runtime.

Last updated 2026-09-29.

## What the software transmits

Coordination itself stays on your machine unless you turn on the
notifications described below.

The coordination server binds the loopback interface only, at
`127.0.0.1` on a port you control: `8876` unless `AGENT_PARLEY_PORT` names
another when the state directory is first created. The command line tool and
the plugin skill
reach that server over `http://127.0.0.1:PORT` with proxy handling disabled,
so requests are not forwarded to an external host. The runtime declares no
third-party dependencies and uses only the Python standard library.

Some commands and the supervision service deliberately reach the Git host you
already use, through the native `gh` and `git` clients under your own sign-in.
`participant pr`, or a lane itself where the project sets
`pull_request.self_service`, pushes that lane's branch to `origin` and opens a
pull request carrying the lane's recorded report, its latest peer review, the
verification command and counts of the lane's recorded hook decisions.
Claiming an issue looks up its title and assigns it to your account, releasing
it unassigns it, and a report that turns ready posts its summary and evidence
as a comment on the issue it is bound to. `issue next`, `issue match` and
`issue resolve` read open issues, their labels and the pull requests that
close them, and the supervision service and `gc` read whether a lane's branch
or issue has landed. A repository carrying a Beads ledger in `.beads/` uses
the `beads` forge instead: the same title lookups, assignments and comments go
through the `bd` client in place of `gh`. Agent Parley stores no forge token
and adds no flag that bypasses a repository rule, and when no `gh` client, no
GitHub remote or no network is available nothing is sent and the local record
is unchanged.

Notifications are off unless `AGENT_PARLEY_NOTIFY` names `telegram`, `email`
or both. Then a change that moves ownership or holds a lane, such as a handoff
offer, a permission prompt, a native dialog or an idle lane, is sent to the
Telegram Bot API with `AGENT_PARLEY_TELEGRAM_TOKEN` and
`AGENT_PARLEY_TELEGRAM_CHAT`, or to the SMTP server named by
`AGENT_PARLEY_SMTP_HOST` and its companion variables. A message names the
repository, the lane, its provider, the event, the issue or offer, and the
dialog text involved, capped at 1,536 bytes. With `AGENT_PARLEY_INBOUND` set
to `telegram` and an `AGENT_PARLEY_INBOUND_PASSCODE`, the service long-polls
the same bot and answers a passcoded `status` query from the configured chat
with a status reading. It also records answers to decisions, given by a
button tap in the configured chat or by a passcoded `decide` message; the
decision record keeps the option, the Telegram user identifier that chose
it, the time and any note, capped at 1,024 bytes, and the lane receives the
answer as mail. An answer to a native dialog is instead pressed as that
option's key on the lane's terminal, and a note is never typed there. No
other command is accepted.
These settings and secrets are read from the environment, or from
`notify.json` in the state directory when `agent-parley notify setup` stored
them. That command reads the bot token and passcode from a hidden prompt or
standard input, never from its arguments, prints neither, and writes the file
with mode `0600`. A variable set in the environment overrides the stored
value. The file is read by the process that sends or polls and is never
copied into a lane's environment or into coordination state.

There is no analytics, no crash reporting, no license check and no account.
The publisher receives no data from your use of the software.

The coding agents you run alongside Agent Parley are separate products with
their own policies. Agent Parley does not change what those agents send to
their own providers, and it does not read or forward their credentials.

## What the software stores

Coordination state is kept outside your repositories, in a private state
directory created with mode `0700`. The default location is
`~/.local/state/agent-parley`, and `AGENT_PARLEY_HOME` or `--home` overrides
it. The tool refuses to run if that directory is not private.

The directory holds the coordination record you create by using the tool:

- Participant names and the repositories and worktrees they were launched in.
- Filesystem paths to those repositories.
- The service's loopback port and bearer token, and each lane's own
  coordination credential.
- Provider and account profile definitions: executables, config home paths,
  the names of required environment variables and non-secret overrides; a
  value whose name looks like a token, key, secret or password is refused.
- Issue numbers, who claims them, and the offers exchanged when work is
  handed over, including the summary and evidence text written into an offer.
- Reports, peer review verdicts and recorded decisions, with any text too
  long for its record kept as an attachment.
- Advisory file reservations, which are path names.
- Messages participants send each other through the tool.
- Each lane's state record and its transitions, and a log of the native hook
  events each lane's client sent, with tool names, decisions and a short
  cause.
- Recovery checkpoints: Git bundles of the index and working tree, untracked
  files that are not ignored included, of every claim a lane owns, refreshed
  as the lane works and before a handoff, a restart or a forced reclaim.
- The service log, `server.log`, and for a lane the service resumed, its wake
  log: that client's terminal output while it ran unattended.
- The capacity state, reset time and session identifier read from a lane's
  native session records.

Content is whatever you or your agents write into a summary, a message or a
report. Do not put secrets in those fields; they are stored as plain text in
files you own.

`agent-parley top`, `status` and the supervision service also read the session
records your native clients already write under their own configuration
directories, so they can report what each lane's client counted for its
session and whether it reached a usage limit. Those files are read locally and
in place, and no vendor is asked for anything. Only the capacity reading
listed above is copied into coordination state.

## Retention and deletion

Logs are bounded automatically:

- A lane's hook event log rotates to one predecessor at 256 KiB, and entries
  older than fourteen days are removed when a session starts or ends.
- The service log keeps its newest 2,000 lines within 256 KiB and moves what
  it drops to `server.log.1`, which is bounded the same way. A lane's report
  log is bounded the same way, and an attachment goes with the report it
  belonged to.
- A wake log is cut back to empty before a write would take it past 1 MiB,
  and one left untouched for two days is deleted.
- The store keeps the newest 2,000 served-call records, the newest 2,000
  lane state events and, counted apart so they never evict those events,
  the newest 2,000 lane accounting events of each project.
- An offer's attachment is removed when the offer is declined, cancelled,
  released, completed or resolved.
- A recovery checkpoint is removed once the claim it was captured for is no
  longer the issue's current one: released, taken again or closed.
- An issue record keeps its newest 50 history entries, plus its latest claim,
  take and complete markers.

Everything else, messages and decisions included, persists until you delete
it. To remove the private state of one project whose root checkout is gone,
once the service has retired its lanes and none of its sessions runs:

```sh
agent-parley gc --project ROOT          # report what would be removed
agent-parley gc --project ROOT --apply  # remove it
```

Its recovery checkpoints are kept under `recovered/` in the state directory
unless you add `--yes`, which deletes them too. A project whose root still
exists is never removed this way.

To remove all coordination state, stop the server and delete the state
directory:

```sh
agent-parley down
rm -rf ~/.local/state/agent-parley
```

Lane worktrees live inside that directory, so deleting it also deletes every
lane's worktree and any uncommitted work in it. Your base checkout and the
branches and commits in your repository are not touched; `git worktree prune`
then clears the registrations of the deleted worktrees.

## Children

The software is a developer tool and is not directed at children.

## Changes

Changes to this policy are published in this file, in the public repository,
with the date above updated.

## Contact

Report a privacy question or a security concern to suneel944@gmail.com, or
open an issue at https://github.com/suneel944/agent-parley/issues. Security
reporting instructions are in `SECURITY.md`.

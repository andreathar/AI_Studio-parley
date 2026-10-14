# Operations

## Install and upgrade

One command installs everything on Linux, macOS and WSL2:

```sh
curl -LsSf https://github.com/suneel944/agent-parley/releases/latest/download/install.sh | sh
```

`install.sh` installs uv through its official installer only when uv is
missing, with `UV_NO_MODIFY_PATH=1` so no shell startup file is edited. It then
runs `uv tool install agent-parley`, or `uv tool install --force agent-parley`
when the tool is already installed, so a pinned or wheel install still moves
to the latest release, followed by `agent-parley plugins install` and
`agent-parley doctor`, and prints the next command. It never uses sudo. When
uv's directory is not on PATH it prints the exact `export PATH=...` line to add.
Re-running it upgrades in place. Setting `AGENT_PARLEY_SPEC` to another package
spec, such as a built wheel path, installs that instead with
`uv tool install --force`, on every run; CI uses it to install the code under
test in a clean home on Ubuntu and macOS. Native Windows is refused with the WSL2
pointer described under [Platforms](#platforms). Each release attaches
`install.sh` and lists its SHA-256 in `SHA256SUMS`, so it can be checked before
it runs:

```sh
curl -LsSfO https://github.com/suneel944/agent-parley/releases/latest/download/install.sh
curl -LsSf https://github.com/suneel944/agent-parley/releases/latest/download/SHA256SUMS | grep ' install.sh$' | shasum -a 256 -c -
sh install.sh
```

`agent-parley plugins install` is the plugin step on its own: it adds the
marketplace and plugin to each of `claude` and `codex` found on PATH, skipping
what their listings already hold, and `agent-parley plugins status` reports
that state without writing. The manual steps follow.

Installing needs no clone. `uv tool install agent-parley` takes the published
distribution from PyPI. `uv tool install git+https://github.com/suneel944/agent-parley`
tracks the default branch instead, and a release wheel URL pins an exact
version. The wheel needs no third-party runtime packages in any of the three
cases.

The distribution, the command and the import package are all named after the
project: `agent-parley`, `agent-parley` and `agent_parley`.

```sh
uv tool install agent-parley
```

From a checkout, `make install` installs a package snapshot in uv's user
executable directory. If needed, run `uv tool update-shell` and open a new
terminal. `make install-dev` installs an editable checkout.
`sudo env "PATH=$PATH" make install-system` installs into `/usr/local/bin`, with
its environment under `/opt/agent-parley`. Each user's runtime state remains
private.

Upgrading needs no action: the store upgrades in place on first use, keeping
every message, claim and lease. Issue ledgers upgrade lazily: 0.11 derives
lifecycle defaults for older records without an `execution` field and persists
them when a lifecycle transition next writes the record. Stop running sessions
before upgrading.

After 0.11 records a verified completion or recovery, do not run 0.10 against
that state directory. Version 0.10 does not understand those lifecycle and
recovery records; in particular, it can read an ownerless completed issue as
unclaimed and offer it again. Keep that state directory on 0.11 or newer.

## Platforms

Linux and macOS are supported. WSL2 is supported for repositories that live in
the Linux file system, such as under `$HOME`. `run` refuses a repository under
`/mnt/`: Git worktrees and the coordination locks do not hold on a mounted
Windows drive, so the repository must be cloned into the Linux file system
first. Native CLIs installed on the Windows side are out of scope: a lane is a
Linux process driving a Linux install, and the loopback mail server is not
reachable across the boundary. `doctor` names the kernel release, the WSL
generation (`1`, `2` or `none`) and whether `pidfd_open` is available, so a
platform gap is read before a lane starts. CI runs the behaviour suite inside
WSL on a Windows runner as the `wsl` job, a required check on `main`. A native
Windows port is evaluated, not planned, in
[Native Windows port](windows-port.md).

Native Windows is not supported. The wheel installs there, but every command
except `--version` exits with status 2 and a line pointing to WSL2, because
the runtime relies on POSIX file locks, pseudo-terminals and process
primitives that native Windows does not provide.

## Daily use

```sh
agent-parley status
agent-parley top
agent-parley participant list
agent-parley issue list
agent-parley issue next
agent-parley issue claim 42
agent-parley issue offer 42 --to codex --summary "commit, checks, remaining work"
agent-parley issue accept 42 --offer-id CURRENT_OFFER_ID
agent-parley issue assign 42 codex --reason "Codex already read that parser"
agent-parley issue block 42 --on 17
agent-parley issue unblock 42 --on 17
agent-parley report --state ready --summary "Result" --evidence "Checks and results"
agent-parley say codex "Rebase onto main before you open the pull request."
agent-parley mail thread THREAD_ID
agent-parley mail search "reservation conflict"
```

`issue offer --to` names another participant in the same project.

### Directing work to a lane

`issue assign NUMBER NAME` hands a lane work without typing into its terminal.
It runs from any checkout as `operator`, and it offers rather than takes: what
it records is an offer, so ownership still moves only when a lane accepts one.

An unclaimed issue is offered to the named lane directly, with an offer
identifier the lane quotes to `issue accept` or `issue decline` like any peer
offer. An issue another lane holds is not taken from it: the command records a
request to that owner instead, mails the owner the same identifier, and the
owner's `issue accept NUMBER --offer-id ID` is what creates the offer to the
named lane. The command prints which of the two it recorded, and the owner
keeps the issue throughout either way.

`--reason "text"` travels with the offer, is stored on the record, and is what
`history issue NUMBER` reports beside the transition, so a later reader sees why
the work moved. `issue list` and `status` show a pending offer with `operator`
as its source, an unclaimed issue appearing for as long as an offer waits on it.
While it waits, a plain `issue claim` of that issue is refused, naming the
recipient, so only the recipient's `issue accept` moves it.

`issue assign NUMBER --unassign` withdraws an operator offer or request that
nobody has answered. An offer that was already accepted is refused, naming the
lane that holds the issue, because only that lane can hand it on.

### Reading status

`status` answers who is working on which open issue and whether it moves. Run
inside a project checkout or one of its lane worktrees, it reports that project
only and says how many others it left out; `--all-projects` reports every
project. Outside any project it reports every project except dormant ones: a
project whose root is gone, or whose lanes have all been stopped for over 24
hours, is hidden behind one line and listed last under `--all-projects`.

Each project prints one table of open work, `ISSUE`, `TITLE` (clipped to 40
characters), `OWNER`, `STATE` of the owning lane, `LAST EVENT` as the age of the
claim's last progress, and `PR` as the cached open pull request with its check
verdict and any conflict. Then one line per lane: `LANE`, `STATE`, `CLAIMS` as
its live claims, and `TASK` from the lane's own last report or registered task,
never the operator's last prompt. A claim whose issue is no longer open on the
forge, or whose pull request ended, while still owned is left out of the table
and named on one line with `agent-parley issue resolve N`; `--all` lists those
rows too. A claim that progressed after the cached reading was taken stays in
the table even when the reading lacks its number, because an issue opened and
claimed inside the poll interval is not closed, only newer than the reading.

Titles and open state come from one bounded read of the project's open GitHub
issues, the same list `issue list` reads, with a 5-second timeout. The service's
poll takes that reading, not `status`: it caches it as `forge-issues.json` in
the project's state directory and reads again once the cache is 300 seconds
old. When the read fails, the poll keeps the last reading and waits 60 seconds
before trying again. `status` only reads the cache; a reading over 600 seconds
old prints one `Forge:` line with its age and the cause, a failed read or a
service that is not refreshing it. With no reading at all, or no GitHub forge,
the `Forge:` line says so and claims on closed issues are not hidden.
Last, `Needs action:` lists each orphaned or overdue claim with the
command that resolves it, `agent-parley issue claim N --take-orphaned` run from
a peer lane or `agent-parley issue assign N LANE --reason TEXT`. When the
project has no live lane besides the holder, the orphaned line names the
operator's command instead: start a lane with `agent-parley run NAME --repo
ROOT` and have it take the claim, or `agent-parley issue release N`. `top`
notes and the `orphaned claims` row of `problems` follow the same rule.

`status --table`, a participant name, or any lane filter prints the full lane
table instead: the server line, the code line, the state directory, and then
one table per
project with a row per participant: `PARTICIPANT`, `PROVIDER`, `ACCOUNT`,
`SESSION`, `BRANCH` with `!` when the lane left its assigned branch, `OUTCOME`,
`REVIEW` as the latest verdict a peer recorded on the lane's report, `ISSUES`
held with `!` on an issue past its deadline or attempt budget, `*` on a claim
the supervisor marked orphaned and `+N` for offers waiting on that lane, `MAIL`
as unread over pending acknowledgement,
`LEASES` held with `!` and the stale count, `REPORTED` as the age of the last
report, and `TASK`. A mailbox that could not be read prints `?` rather than a
zero. Column widths follow the widest value and then the terminal, by the rule
`top` uses: the least useful column is dropped first, the dropped headings are
named under the table, and `TASK` takes whatever width is left. A pipe or a
file receives the whole table, because no width is imposed on a stream that is
not a terminal.

The code line reports the build the running service is serving against the code
installed here. `Code: ok` says they match; `Code: stale` says the service is up
and answering but was started from an older build, so the frame is read through
that build until `agent-parley down && agent-parley up` restarts it. A service
running behind the checkout is therefore visible in the reading rather than
reported as ready, and `doctor` reports the same comparison as its `service`
component.

`SESSION` carries the lane's presence, which has four states. `active` is a
lane that served a coordination call inside the configured interval. `idle` is a
live session process that served none inside the inactivity threshold: it is a
quiet lane, not a lost one. `stopped` is a lane whose recorded session
process is gone. `unknown` means no trustworthy native process identity was
recorded, so the service cannot distinguish a live manual session from one that
was killed. A live lane past the threshold therefore never reads `stopped`, and
presence only reports: no claim is released and no ownership moves on any of
the four. A send result keeps the older operator wording for the dead case and
summarises a message to a `stopped` lane as `queued for NAME (unreachable)`.

Appending a participant name reports that lane as the whole reading —
availability, drift, waiting items, claims, reported outcome, mail counters and
the latest prompt — instead of as a row. Filters combine, and a lane is
reported only when it satisfies all of them:

```sh
agent-parley status --repo /path/to/repo
agent-parley status --provider codex --outcome blocked
agent-parley status --drifted
agent-parley status --pending
agent-parley status --idle --since 45m
agent-parley status --over-budget
agent-parley status --issue 42
```

`--pending` reports a lane holding unread mail, an unanswered acknowledgement,
an offer, or a reservation past its declared time to live. `--idle` reports a
live lane that served no coordination call inside `--since`, or inside the
project's configured interval when no window is given — the lanes reading
`idle`, never the stopped ones; it measures
coordination inactivity, not what a native client was doing inside a turn.
`--over-budget` reports the lanes over any of their advisory token, call or
hour limits and exits non-zero when one matches; the budget informs and does
not gate. `--issue` reports the lanes that hold or are offered one issue. A selection
that matches nothing prints one line naming the filters that were applied.

`--drifted` and `--pending` exit non-zero when at least one lane matches, so a
shell gate fails on drift or on unfinished coordination without parsing text.
Every other reading exits zero. `--json` prints the same document as an
unfiltered `status --json`, holding only the matching rows.

`status` stays read-only: it takes no lock, calls no vendor and writes nothing.

`issue list` also shows the forge title beside the owner, as
`#42: claude — Some issue title`, when `gh` is installed and authenticated and
the repository's `origin` remote points at GitHub. Without any of those the
title is simply absent and nothing else changes: the claim still succeeds and
every listing, dependency and handoff behaves the same.

Under the same conditions a claim assigns the issue to your GitHub account, a
release unassigns it, and a lane's first `report --state ready` posts that
lane's summary and evidence as a comment on every issue it claims. These
mirrors use your own `gh` sign-in and run after the local ledger is written, so
a forge that is missing, offline or unwilling changes nothing about ownership.
Because every lane runs under your one account, a handoff between participants
changes the ledger owner without changing the assignee, and change-type labels
are left to you.

`say NAME "text"` writes one message into that participant's inbox as
`operator`, so a supervisor steering several lanes can redirect one without
typing into its terminal. The message uses the same send path as peer mail: the
lane sees it at its next checkpoint, alongside agent traffic. Without `--key`
the idempotency key follows the message itself, so repeating an identical
message delivers nothing further, while changed text is a new message. `--ack`
requires the lane to acknowledge it, and `--subject` replaces the default
subject line. The command refuses, naming the reason, when the repository has
no project, when the name is not in the roster, and when that participant has
never launched and so has no registered identity.

`operator` is reserved. It cannot be claimed as a participant, provider or
credential profile name, it never holds a coordination credential, and no MCP
tool sends as it, so a served agent cannot write in the operator's name.

`mail thread ID` prints one thread in send order and `mail search QUERY` reports
the messages matching it. Both read as the lane whose worktree they run in, the
same way reports and issue transitions do, so they answer for one participant's
own mail rather than for the project, and neither marks anything read. A thread
page carries up to ten messages and a search up to five, each with a
240-character body preview; `--after-id` continues a thread page and `--limit`
narrows a search. Where SQLite was built without the full-text index a search
matches the query as a literal case-insensitive substring rather than as
indexed terms, and every result names which of the two answered it. The index
covers the whole body of a message that spilled to an attachment, and so does
decision search; the substring fallback reads only the slice the message keeps.

`--as NAME` names the lane to read instead of taking it from the worktree, so
`mail show`, `mail thread`, `mail search` and `mail list` answer from the main
checkout. It exists because `problems` cites message identifiers from the main
checkout that the operator then has to open, and changing directory into a lane
worktree to read one is the wrong price. The flag selects a reader and nothing
more: no message is sent, acknowledged or marked read for that lane, and the
write verbs keep the lane identity path they always had. A name that is not a
participant of this project is refused.

`issue list` prints each owner's session state and the age of its last
checkpoint, so a quiet lane is visible. Reclaiming that work still needs the
owner to release it, or an explicit offer and accept.

A pending offer is listed with the state a peer needs to take the work over: the
offering lane's head commit, the reservations it holds for that issue, and the
remaining work from its last report. `status --json` carries the same three
fields on the offer record. Accepting moves those reservations to the acceptor
with the issue, so the paths the work needs are not reserved twice and a
released offer strands nothing. Mail does not move: an acknowledgement stays
owed by the lane that received the message.

`issue block NUMBER --on OTHER` records that one issue waits on another. Only
the current owner of NUMBER can add a dependency, and an issue records at most
ten. The blocker must already be in the issue ledger; an edge to a complete
issue is not recorded, and an edge that would close a dependency cycle is
refused. `issue list` then names the participant holding each blocking issue,
or reports it unclaimed. Every ledger change bumps the revision, so the next
checkpoint delivers the updated dependency line to each running lane without
polling. Dependencies survive release and reclaim.

A dependency is information, not a gate. Nothing prevents work on a waiting
issue. Verified completion of the blocking issue drops the edge, and every
supervisor poll also drops any edge whose blocker is complete or no longer in
the ledger, whether or not anybody owns the waiting issue. The owner runs
`issue unblock` to drop an edge early. The operator runs the same command from
the project base checkout, which works on a released issue with no owner.

### Compatibility and `doctor`

Three numbers move independently: the launcher's package version, the wire
protocol a hook or served call speaks, and the store schema on disk. A fourth
reading, the build the running service is serving, moves with none of them,
because a service keeps serving the code it started from. Several
package versions normally share one protocol, so equal package versions are not
the only compatible combination.

<!-- compatibility:start -->
| Launcher | Wire protocol | Store schema |
| --- | --- | --- |
| 0.18.0 | 1 | 12 |
| 0.17.0 | 1 | 12 |
| 0.16.0 | 1 | 12 |
| 0.15.2 | 1 | 12 |
| 0.15.1 | 1 | 12 |
| 0.15.0 | 1 | 12 |
| 0.14.0 | 1 | 12 |
| 0.13.0 | 1 | 11 |
| 0.12.0 | 1 | 10 |
| 0.11.0 | 1 | 10 |
| 0.10.0 | 1 | 9 |
| 0.9.1 | 1 | 9 |
| 0.9.0 | 1 | 8 |
| 0.8.0 | 1 | 8 |
| 0.7.0 | 1 | 8 |
| 0.6.0 | 1 | 8 |
<!-- compatibility:end -->

The release path rewrites that table from the constants in
`agent_parley/protocol.py` and `agent_parley/store.py`, so it cannot drift from
the numbers the code uses.

```sh
agent-parley doctor
agent-parley doctor --json
```

The plugin lines read the manifest of each client from wherever the plugin tree
was installed. A wheel carries that tree inside the package directory, at
`agent_parley/plugins/agent-parley`, because a wheel is unpacked into an
environment that holds nothing else of this project. A checkout keeps it at the
top level, where the client directories read it. Both layouts therefore report
the same protocol.

The launcher version reported here is the version of the code that is running.
An editable install, which `make install-dev` creates, records its version once
at install time and keeps reporting it after the checkout has moved on, so the
project file beside the package is read wherever it exists and installation
metadata is used only for a package installed without one.

`doctor` prints the launcher version and protocol, the protocol each shipped
plugin manifest declares, the store's schema against the schema this build
writes, the `service` component naming the code a running service answers
from, `projects` (each registered root that no longer exists), `notify`
(whether outbound and inbound notification are active) and `approvals` (each
lane lacking the resume opt-in), the host platform, then a verdict line. A
missing root, or notification configured but unable to send, makes the verdict
not consistent; notification that is off and an `approvals` setup gap do not.
Each line carries the state this build puts that component in, printed in
upper case when the build does not accept it.

The `service` component has three states. `not running` means nothing answered
on the configured port, which is no drift. It is still an outage wherever a
lane is registered, because every hook on that machine then pays the in-process
decision, so the report names `agent-parley up` and the verdict is not
consistent; a machine with no lane registered has nothing to serve and stays
consistent with no service running. `ok` means the service is answering
from the sources on disk. `stale` means the checkout moved after the service
started, so it is answering from modules the tree no longer holds, and a module
a merge added is missing from that process for as long as it runs. A service
that reads itself stale stops accepting connections first, logs one line
naming the drift, and refuses further calls with the status its clients
already treat as an outage, so hooks decide in-process. The stop is started
before the line is written, so the window in which calls are refused is
bounded by the revision interval rather than by an append to a log file, and
the whole exit is bounded by that same interval once in-flight calls finish.
The first hook to read the published record of that gone process asks for a
new service, so the relaunch follows the stop. `status` prints the same drift
as a
`Code: stale` line, and `agent-parley up` then starts a service on the code in
the checkout.

The `projects` component is `ok` while every registered project's root
checkout exists. A project whose root is gone, such as a probe run from a
temporary directory, puts it in `root gone`, names each such root, and makes
the verdict not consistent until the checkout is restored or that project's
state folder is removed. The remedy names the command for each root:
`agent-parley gc --project ROOT` reports the removal and `--apply` performs
it. It refuses while the root exists, while any lane's session process may
still run, and before the service has retired the project's lanes, which it
does one supervision interval after it finds the root gone. The project's
recovery checkpoints move to `recovered/` under the state root, named by the
project's key, unless `--yes` deletes them with the rest.

The store has four states. `absent` means no store has been created yet, which
is consistent because the service writes it at the current schema. `ok` means
the store matches this build. `needs migration` means the store predates this
build and has not been migrated: every process running this code queries
columns the older store does not have, so this is a mismatch, not merely an
older number. `unsupported` means a newer build wrote the store, which is
refused rather than downgraded.

The verdict names one command per distinct cause, because a store behind this
build and a plugin speaking another protocol need different commands. A behind
store is resolved by `agent-parley up`, which migrates it in place and leaves
a running service and every lane running; a newer store by installing the
build that wrote it; a plugin mismatch by `agent-parley plugins install`,
restarting any lane already running on the old one. Its exit status is
non-zero on a mismatch, so a script can gate on it. It reads only: it opens no
lane, writes no configuration, repairs nothing, and prints no credential or
profile path.

Drift is refused where the call already crosses a boundary, not discovered
mid-turn:

- `agent-parley run` refuses to start a lane whose installed plugin declares an
  unaccepted protocol, naming both numbers and the one command that updates it.
- A lane's hooks carry the launcher's protocol in the command the launcher
  wrote, so the hook boundary is checked locally and no hook reaches the network
  to learn a version.
- A served call declaring an unaccepted protocol in its `Agent-Parley-Protocol`
  header is denied with both numbers and the command that reinstalls the
  plugin, and `top` counts that denial; that lane is already running on the
  old plugin, so it must be restarted after the reinstall, not merely
  retried.
- Opening a store written by a newer schema is refused, never migrated
  downwards, exactly as a newer project manifest already is.
- A hook whose read fails on a store behind its build migrates the store in
  place, under the store lock, and denies that one call with both schema
  numbers and a retry; the next call reads the migrated store. A package
  upgrade therefore no longer refuses every lane until a restart. A store
  stamped current that lacks a column the failed read names is repaired the
  same way, and every service start or `up` verifies each column the build
  owns instead of trusting the stamp.

### Triage with `problems`

`doctor` answers whether the installation is consistent and `top` shows every
live lane; `problems` answers what needs an operator right now.

```sh
agent-parley problems
agent-parley problems --ack-after 900
agent-parley problems --json
```

The command derives its rows from the same reading `status` and `top` print,
the supervision thresholds and the store classification, and writes nothing.
Rows are ordered by how long each has held, longest first; a store or service
row carries no age and leads the list, because no lane can be acted on until
the store is usable and the service is up. Rows older than a day follow the
rest under an `Older than a day:` heading, so current work is read first.
One lane holding twenty messages,
three overdue claims or four changed files is one row per cause, carrying how
many items that row covers and the age of the oldest, so the list is as long
as the work rather than as long as the backlog. Each row names the lane, the
condition, that count, its age and what clears it:

| Condition | When | Clears with |
| --- | --- | --- |
| `store` | The store schema is behind or ahead of this build. | The `doctor` remedy for that state. |
| `service` | The coordination server is not ready, or is serving a build older than the installed code. | `agent-parley up`, or `agent-parley down && agent-parley up` for a stale one. |
| `supervision failing` | The supervision poll of a project has been failing since the time the row ages from, naming the last failure. | Read `server.log` in the state directory and fix the stage it names; the next clean poll clears the row. |
| `stalled` | A lane reading `idle` holds mail older than `stalled_after` and served no call inside it. | Whatever the lane's state allows, from the remedy table below. |
| `inactive` | A live lane published no native activity inside `inactive_after`. | Whatever the lane's state allows, from the remedy table below. |
| `wake attention` | The service's last wake of the lane was refused because operator input is pending, the client is waiting for a native approval or the previous accepted wake produced no checkpoint, or the wake needs operator attention; or the wake was not delivered, which the row states as `wake attempted at T, not delivered:` and its reason, such as a client started outside `agent-parley run` with no wake socket. | Whatever the lane's state allows, from the remedy table below. |
| `waiting on approval` | The lane's client has waited on a native tool approval prompt for longer than `--ack-after`, and its session process is not known to be gone. | Answer the prompt in the lane's own terminal. |
| `held by a native dialog` | The launcher escalated a native dialog it could not answer and the lane's session process is not known to be gone; the row names the dialog and the options it offers. Once that process is gone the row disappears and the lane carries only the stopped remedy. | Answer its decision from the chat, or the prompt in the lane's own terminal. |
| `second session` | Another client process is sending hooks under the lane's identity; its events are ignored. The row names its session and process. | Stop that process, or run it outside the lane's worktree. |
| `overdue claim` | One or more held issues are past their recorded deadline. A claim whose current generation reported ready or was verified complete is never overdue. | `agent-parley issue release NUMBER` for the oldest, named in the row. |
| `claims over cap` | A lane holds more claims than `max_claims_per_lane`, from a ledger written before every ownership path was capped or a cap lowered after the claims were taken. The count is the excess. | `agent-parley issue release NUMBER` for the highest-numbered claim, named in the row, or an offer to a peer. |
| `unanswered offer` | One or more handoff offers to the same lane have no answer yet. Past the offer's own deadline the supervisor cancels it back to the lane that made it; this row can still show it in the gap before the next poll. | `agent-parley issue cancel NUMBER`, or `issue assign NUMBER --unassign` for an operator offer. |
| `unanswered request` | One or more peer takeover requests wait on the same holder, past the request's own deadline. Its `takeover_grace`, not this row, decides whether it is later granted as an offer. | `agent-parley issue accept NUMBER --offer-id ID` or `issue decline`, or `issue assign NUMBER --unassign` to withdraw it. |
| `unresolved completion` | One or more claimed issues read closed on the forge, or merged or closed on the lane branch when the forge cannot say, and their holder left `completion_reminders` reminders unanswered. | `agent-parley issue resolve NUMBER` for the oldest, named in the row, with `--release` when the pull request was closed without merging. |
| `not converging` | A claim's repeated failing verification results outlasted the request to change approach with no verified improvement, so its convergence account escalated. One row per claim; the holder keeps it. | `agent-parley issue show NUMBER` to read the account, then hand off, reassign or redirect the lane explicitly. |
| `awaiting acknowledgement` | Messages needing acknowledgement have waited past `--ack-after`, which defaults to `stalled_after`. | Whatever the lane's state allows, from the remedy table below. |
| `holding a refused key` | A lane that is not active refused a peer a reserved key and still holds it. The row names the refused lanes, how long the holder has been quiet and its release deadline (`KEY_HOLD_DEADLINE`, 900 seconds from the first quiet sighting). | Before the deadline, whatever the lane's state allows, from the remedy table below; past it, the operator decides: tell the holder to release, or let the refused lanes wait. An expired lease of a holder observed idle past `inactive_after` is also reclaimed by the next sweep. |
| `bounced share` | A share the sender is still waiting on reached a recipient that cannot act on it. The row sits on the sender's lane. | Whatever the first blocked recipient's state allows, from the remedy table below. |
| `shares to a retired lane` | Retirement superseded shares the lane still owed; the row sits on the retired lane, counts them and lasts while their acknowledgement deadlines run, or one day for a share without one. It is informational. | Nothing; the row clears when those deadlines pass. |
| `recovery refused` | An `issue recover` approval could not proceed on the last poll, because the owner is idle, paused, at an approval prompt or on another session, or the approval is gone. The row sits on the owner's lane, names the issue and the reason, and lasts while the refused claim is the issue's current claim. | Clear what the reason names in the owner's lane; the service retries the recovery on every poll. |
| `integration unverified` | The base checkout carries a merge that failed its gate, conflicted or was interrupted, or the record of one cannot be read. One row per project, on the lane that may repair it, naming the kind, the attempt and the gate result; every further merge is held. | The step the row names: rerun `agent-parley participant merge NAME` after the repair, `--renew-recovery` once attempts are used, or `agent-parley participant merge --verify-recovery` when no lane may repair it. See [Recovering an unverified integration](#recovering-an-unverified-integration). |
| `crossing ready` | The project records an integration base, no claim is held, at least one issue landed there by a merged pull request is still open on the forge, and the cached reading holds every open issue. One row per project names the landed issues still open and ages from the newest landing or the newest claim end, whichever is later; with notifications configured it opens one decision, which never applies anything. The decision opens only while that age is under one day. | `gh pr create --head BRANCH`, naming each landed issue as `Closes #N`; review and merge it yourself, since that merge cannot be undone. |
| `checks stalled` | Supervision marked an open pull request's pending head stalled; the lane was already told once. The row names the pending checks and clears when the head finishes or changes. | `gh pr checks URL`, then re-run once with `gh run rerun RUN --failed`, cancelling first a run still in progress past its job timeout. |
| `checks failed` | An open pull request's checks are red with at least one check the forge ran and failed, or its head is pending on the one automatic re-run supervision requested. The row names the attempt and the failed checks. | `gh pr checks URL`, then fix and push or re-run; while the automatic re-run is pending, wait for its conclusion; after it, run the re-run command the row names yourself, or fix and push. |
| `ci rounds exhausted` | An open pull request's head is red after it used its CI rounds: the `ci_rounds` supervision setting (2) plus any round the operator granted. A round is a head commit whose checks finished; a re-run on the same head is not a new round. The lane was told once to stop pushing and report blocked, and one decision offers `grant one more round` or `take over`. The row replaces `checks failed` for that pull request and clears on a green head. | Answer the decision: a grant lets the lane push once more; a takeover stops further decisions for that pull request. The limit is advisory and never refuses a push. |
| `checks refused` | A required check the forge never started blocks one or more open pull requests. One row per check name and forge conclusion names every pull request it blocks. | Resolve it at the forge (billing, spending limit or manual approval), then re-run once. |
| `session outliving its claim` | The lane holds no claim, yet a native session in a worktree the lane made showed activity in the last 60 seconds. | `agent-parley status NAME`; Agent Parley never stops such a session. |
| `root missing` | The project root checkout is gone. Once it has been gone an interval, the row names the live lanes kept from retirement because their session process is alive or their activity record cannot be read. | Restore the root checkout, or end the named sessions so the next poll retires them. |
| `escalated plan revision` | A lane's plan revision touched an edge already revised back and forth under the current plan version, so it was escalated instead of applied. One row per escalated proposal, on the proposing lane, among the retained proposals. | `agent-parley plan approve ID` or `agent-parley plan reject ID --reason TEXT` |
| `plan revisions pending` | Plan revisions outside the operator's envelope wait for a decision. One row per project counts them and ages from the oldest. | `agent-parley plan proposals`, then approve or reject each |
| `orphaned claims` | The lane's session process is gone and the supervisor marked claims it holds orphaned, and the lane is not yet `ready to retire`. The row is derived from the ledger, so it shows whether or not a notification transport is configured. | `agent-parley issue claim N --take-orphaned` from a live peer lane; with no live lane besides the holder, start one with `agent-parley run NAME` and have it take the claim, or `agent-parley issue release N`. |
| `ready to retire` | The lane's session process is gone, every claim it holds has been orphaned for longer than `orphan_retire_after` and no peer took it. Never shown while the lane's ready report waits on an open pull request. | `agent-parley participant retire NAME` |
| `ready to integrate` | The lane's latest report is ready, a claim it holds has an open pull request in the cached forge reading, and the report has waited for integration longer than the default wait ceiling of 3600 seconds. It replaces `ready to retire` and `orphaned claims` for that lane, since retiring or releasing would drop the claim the pull request closes. It clears when the pull request merges or closes, or a newer report supersedes the ready one. Nothing merges on its own. | `agent-parley approve NAME` when the project requires approval and the report is not approved; otherwise review and merge the named pull request, or `agent-parley participant merge NAME`. |
| `branch drift` | The lane left its assigned branch. | `agent-parley participant restore NAME` |
| `dirty worktree` | The lane holds uncommitted work, is not active and its session process is gone, or it retired and its uncommitted work kept the worktree. | Commit or stash the named files in the named worktree; `agent-parley participant add NAME` returns a retired lane to service with that work still in place. |
| `over budget` | The lane crossed an advisory token, call or hour limit. | `agent-parley participant budget NAME` |
| `run budget exhausted` | The project's enforced run budget is used up or its ledger was unreadable or missing; no wake, dispatch, retry or launch starts. | `agent-parley budget resume` after raising the limit, or `--reset` |
| `run budget unmetered` | A lane has no readable token records while a token limit is enforced, or a live session not started by `agent-parley run` while an hours limit is, so it is refused wakes, dispatch and retries. | `agent-parley budget enforce --tokens 0 --hours 0`, or relaunch the lane with `agent-parley run` on a provider whose transcripts Parley reads |

A retired lane reports nothing but that kept worktree. Its quiet is the state
it was asked for, so it raises no stall, no inactivity and no acknowledgement
row, and no printed command wakes it.

A lane row's remedy follows the lane's state rather than the condition alone,
because a lane that cannot read mail does not become reachable by being sent
more of it:

| Lane state | Remedy | Why |
| --- | --- | --- |
| `stopped` | `agent-parley run NAME --resume` | The launcher exited, so nothing is holding the session lock. |
| Waiting on a native prompt | Answer the prompt in the lane's own client. | The client reads no mail until the prompt is cleared. |
| Refused every wake | Take the turn waiting in the lane's own client. | The service stopped asking after its refusals. |
| Paused | `agent-parley participant resume NAME` | Delivery resumes with the lane, not before it. |
| The service is still waking it | Nothing yet; the row says how many wakes the loop has already made and that it wakes again on its next poll. | The supervision loop owns this row. |
| Otherwise reachable | `agent-parley say NAME "<text>"` | The lane is alive and reading. |

A row an operator must act on and a row the supervision loop is already
working are therefore different rows. The wake, the delivery, the orphan
reclaim and the lease bounce belong to that loop, which runs them on its own
interval; `problems` reports what it has attempted and what it will do next,
and the closing line counts how many rows need an operator against how many
the service is handling. An active lane is never told to leave its session,
and a dirty worktree row names the worktree and the changed files rather than
offering to retire the lane, because retiring it would drop the claims it
holds to clean one directory.

An empty list prints one line saying so and exits zero; any row exits 1, so a
shell or a cron can gate on it. `--json` prints the same rows inside the shared
snapshot envelope, each with `count` and `actor`, alongside the totals
`count`, `operator` and `service`. The `P` key in `top` shows the same rows in
place of the table until any key returns. Every command named is a suggestion:
the view itself revokes nothing, releases nothing and wakes nobody.

### Recording the work order as a plan file

Entering a dozen dependencies one `issue block` at a time leaves no artifact to
review. Write the order once, as TOML:

```toml
[plan]
name = "Parser rewrite"

[dependencies]
"42" = ["17"]
"43" = ["17"]
"44" = ["42", "43"]

[groups]
parallel = ["42", "43"]
```

```sh
agent-parley plan diff work-order.toml
agent-parley plan apply work-order.toml
agent-parley plan show
agent-parley plan show --json
```

`plan apply` records exactly the advisory dependencies `issue block` records and
nothing else. It claims no issue, assigns no lane and gates no transition, so a
plan that turns out to be wrong blocks nobody. Run `plan diff` first to see the
edges an apply would add before it adds them. Only the operator applies, from
the project base checkout; a lane's `plan apply` is refused, because the plan's
`[revisions]` table bounds what lanes may revise alone.

`plan show` prints the applied plan as an indented tree, each issue under the
issues it waits on, with its current owner and any recorded forge title beside
it. Each apply records a version carrying the file's digest and the identity
that applied it, and the twenty most recent versions are kept.

Applying adds edges and never removes one. An edge entered with `issue block`
after the apply is listed as `recorded by hand`, and an edge the file no longer
names stays in the ledger and is reported by `plan diff` as `unlisted` until
`issue unblock` removes it, so the document and the ledger never silently
disagree.

A plan that names a malformed issue number, exceeds a bound, or describes a
dependency cycle is refused before any edge is written. The cycle check covers
the edges already in the ledger, so two plans that each look acyclic cannot
together form one. An edge to an issue that is already complete is skipped.
Groups name issues that
may proceed together, and `participant merge --group NAME` integrates one.

### Integrating several lanes at once

```sh
agent-parley participant merge --all
agent-parley participant merge --group rewrite
agent-parley participant merge --group rewrite --preview
```

`--all` takes every lane whose latest report is ready; `--group` takes the lanes
holding one group's members, refusing when a member is unclaimed. Both order the
candidates from the recorded dependency edges, so a lane whose issue waits on
another is merged after the lane holding that issue. Edges leaving the candidate
set constrain nothing, and a cycle among the candidates is refused and named
rather than quietly ordered.

Every candidate is preflighted with the conditions `--preview` reports, and each
merge runs through the single-lane path, so no lane is integrated on easier
terms than it would be alone. A group is admitted whole or not at all: one
refused member leaves the group unmerged and the base checkout unchanged.
Execution is ordered rather than all-or-nothing: the run stops at the first
refusal or failure, a refused lane is never followed by a lane that waits on it,
and the report names what was integrated, what refused and what was not
attempted, with the dependency reason. Nothing is reset or reverted, and a
conflict is left in the working tree for you.

With a verification command recorded, it runs before each merge as usual and
again after it, so a set whose halves pass alone but fail together is caught
before you move on. A failure after a merge stops the run and leaves that merge
commit present and visibly unverified.

### Recovering an unverified integration

```sh
agent-parley problems                                   # the one escalation
agent-parley participant merge claude-2                 # retry and verify
agent-parley participant merge claude-2 --renew-recovery # after exhaustion
agent-parley participant merge --verify-recovery        # no repairing lane
```

A conflict, a failed post-merge gate, or a crash before the gate answered is
recorded durably as `conflict`, `gate failed` or `interrupted`, bound to the
claim, the pre-merge base, the resulting commit and the gate command. Until it
clears, no other lane is integrated and the issue is never recorded complete,
so its dependents stay held. The issue moves to `recovery` and its holder is
mailed the failure; whoever holds the issue through the usual claim and
handoff rules repairs it, commits and reports ready again. `participant merge`
on that lane then merges the repair and runs the gate on the exact commit the
base holds, including a fix you committed on the base yourself or a conflict
you finished with `git merge --continue`. Three attempts are allowed; after
that `problems` shows one `integration unverified` row naming
`--renew-recovery`, which grants three more from the base checkout. When no
lane can repair it, because the issue is unheld or complete or the lane
retired, fix or reset the base yourself and run `participant merge
--verify-recovery` from the base checkout: it runs the recorded gate on the
base as it stands and clears the record only if the gate passes and the tree
stays clean. Nothing is reset or reverted for you. Both flags are operator
decisions: either one run inside a lane's worktree, or with a lane's
credential, is refused. See the architecture contract for the record's fields,
its migration and its evidence limits.

`plan show` and `status` mark a group whose every member is reported ready, and
the `top` header counts those groups, so an integrable set is visible before
anyone merges. A reported state is the lane's own account of its work, never
review or independent verification.

### Selecting several lanes for one command

```sh
agent-parley say "Wrap up for today." --all
agent-parley participant stop --provider claude --yes
agent-parley participant resume --idle
agent-parley participant merge --outcome ready
agent-parley issue assign 42 --idle --provider codex
```

`say`, `issue assign`, `participant stop`, `participant pause`,
`participant resume`, `participant pr` and `participant merge` take a lane
selector where they otherwise take a positional name. `--all` selects every
lane; `--provider NAME`, `--outcome STATE`, `--drifted`, `--idle` and
`--over-budget` narrow the
selection, and a lane matches only when every given filter holds. The filters
read the same facts `status` reports. A positional name and a selector together
are refused, because a command that means two things is a command that loses a
lane.

Every bulk run prints the lanes it matched and what will happen to each, then
asks once for the whole set. `--yes` answers that one question in advance.
A declined or unanswered confirmation, including a closed standard input, does
nothing and exits non-zero, so a script without `--yes` cannot mistake it for
success. A selector matching nothing does nothing and says so.

Non-integration operations are independent, so a lane's refusal is printed
beside that lane and the remaining lanes are still attempted. The closing tally
names what was done and what refused, and the exit status is non-zero when any
lane refused or failed. Integration keeps its ordered contract instead: the run
stops at the first refusal or failure and leaves every later lane unattempted,
including the lanes that wait on the one that stopped.

A bulk merge considers only lanes whose own report is ready, so a selector
narrows that set rather than widening it, and its plan names every prerequisite
that lies outside the selected set: held by a lane that is not selected, and so
not satisfied here, or released and held by nobody. Narrowing a selection never
lifts a recorded dependency and never admits a lane on easier terms than the
single-lane merge would. `participant merge --group NAME` integrates the whole
group, so it refuses `--provider`, `--outcome`, `--drifted`, `--idle` and
`--over-budget` rather than silently ignoring them.

One issue carries one offer, so `issue assign` accepts a selector only while it
matches a single lane. A wider match is refused and names every lane it matched,
because choosing between them is the operator's decision. `--unassign`
withdraws the offer recorded on one issue and takes no selector. `say --key`
names one message and is refused with a selector, because the default key
already gives each lane its own copy.

### Retrying a write safely

A command that fails after its change has landed cannot be told apart from one
that changed nothing, so a retry can apply the change twice. Give the command an
idempotency key and the retry is the same call:

```sh
agent-parley issue offer 42 --to codex --summary "commit, checks" \
  --idempotency-key handoff-42-first
agent-parley report --state blocked --summary "Waiting on the schema decision" \
  --remaining "Apply the migration" --idempotency-key blocked-42-first
```

Rerunning either command with the key it first used prints the first result and
changes nothing further: one offer, one recorded attempt, one forge comment. The
same key with different arguments is refused by name, so a stale retry cannot
release a different issue or hand off to a different lane. A command that was
refused replays as the same refusal, even if ownership changed in between, so a
retry never gains authority the first call was denied. A refusal that says to
retry, such as a busy ledger lock or recovery evidence that changed, is not
recorded against the key, so retrying with the same key is evaluated afresh.

`issue claim`, `issue release`, `issue offer`, `issue accept`,
`issue decline`, `issue cancel`, `issue block`, `issue unblock`,
`issue request` and `report` accept `--idempotency-key`; `issue recover`,
`issue resolve` and `issue assign` do not. Over MCP the
same contract is carried by the optional `idempotency_key` argument on
`file_reservation_paths`, `request_reservation`,
`cancel_reservation_request`, `release_file_reservations`,
`acknowledge_message` and
`mark_message_read`; `send_message` has always required one. A replayed tool
result carries `"replayed": true` beside the original fields.

Keys belong to one participant and one operation, so two lanes can use the same
key text without colliding, and the most recent 500 keys per participant are
retained. Past that window a repeated key is treated as a first call, which is
why a key is worth reusing for a retry and not for bookkeeping.

### Deadlines and attempt budgets

A claim, a handoff offer, a takeover request and an acknowledgement can
carry a deadline:

```sh
agent-parley issue claim 42 --within 2h
agent-parley issue offer 42 --to codex --summary "commit, checks" --within 30m
agent-parley issue request 42 --summary "claude is idle" --within 30m
agent-parley say codex "Confirm the schema change" --ack --within 15m
agent-parley deadlines show
agent-parley deadlines set --claim 4h --offer 30m --request 30m --ack 15m --attempts 3
```

**An overdue claim moves only when its holder is silent.** Past its deadline
the claim reads `overdue` in `status`, `issue list` and `top` — where the issue
is marked `#42!` — with the seconds it is over. While the holder keeps working,
ownership does not move. An overdue claim whose holder has run no tool call for
`inactive_after` takes the recovery path in
[Availability, reminders and waking](#availability-reminders-and-waking): one
wake, then an offer to the fittest peer, then release once that offer expires.
A claim reading `observed_complete` is never moved. An exhausted attempt budget
records a notice to the holder and moves nothing by itself.

A lane that reports `blocked` on an issue it still holds spends one attempt.
`status` and `issue list` show attempts against the budget, and exceeding the
budget is another visible state with the same guarantee: what to do about it
stays the owner's or the operator's decision.

`deadlines set` records the defaults every claim, offer, takeover request and
acknowledgement inherits when it passes no `--within`, so lanes carry a budget
without repeating a flag. Windows take the same units as `--since` (`45m`,
`6h`, `7d`), and a project that records none gives a claim, an offer or a
request a deadline only when they ask for one.

**Every acknowledgement request carries a deadline.** A send marked
`ack_required` that names no window takes the project's `--ack` default, and a
project that records none takes 240 seconds, which is shorter than the 300-second
`inactive_after` default so a missed acknowledgement is known before the lane
itself reads as idle. A served lane sets its own window with the `ack_within`
argument of `send_message`.

**A missed acknowledgement goes back to its sender.** Past the deadline the
supervision sweep sends the sender one message naming each recipient that did
not acknowledge and what the runtime could read about why — no running session,
a native dialog waiting for the operator, exhausted provider capacity, or an
idle stretch — and retires the expectation, so the request stops being reported
as outstanding. The notice is deduplicated by the message it reports, and
retiring records no acknowledgement for any lane: a recipient that never
answered still carries no acknowledgement time. A sender that holds no inbox,
such as the supervising operator, is not mailed and the expectation is still
retired.

**Acknowledgement debt expires.** A request past its deadline, one a newer
message on the same topic superseded, and one bound to a claim that closed no
longer lower the lane's fitness for new work, and a checkpoint no longer lists
them as owed. A lane that reads as stale by `inactive_after` owes nothing to
the fitness check at all, because it cannot answer until it returns. The
overdue request itself still appears in `status` and still goes back to its
sender as above.

**A share no recipient can act on comes back before its deadline.** A share is
an acknowledgement request still inside its window: the sender is waiting for an
answer that decides whether work moves. Writing it into a mailbox is not
receipt, so each sweep reads whether every recipient could answer at all — a
live session process, no native dialog on its screen, provider capacity that is
not exhausted, and no claim of its own blocked by unfinished dependencies. A
recipient failing one of those cannot answer, and the sweep returns the share to
its sender naming each such recipient and its reason. The sender keeps the work
and may offer it to a lane that reads as fit; the notice is ordinary mail, so it
joins the sender's backlog rather than leaving that lane waiting quietly. The
notice is deduplicated by the share it reports. Nothing is withdrawn, no
ownership moves, no mail is deleted, and the acknowledgement expectation stays in
force, so a recipient that recovers can still answer and the deadline above
remains the only place an expectation is retired. `problems` carries the same
reading as a `bounced share` row on the sender's lane while it holds. A request
the operator sent is not returned this way: that operator is at a terminal and
already reads it as awaiting acknowledgement.

Mail to a dead lane is returned the same way, whether or not it asked for an
acknowledgement. Once a lane's state record has read `dead` for 30 minutes
(`DEAD_MAIL_AFTER`, long enough for a resumable session to have been resumed),
each delivery to it that has waited 30 minutes and is still unread or
unacknowledged is superseded with the reason `<lane> dead past 1800s`, which
also drops it from that lane's wake backlog. Each sender that is a lane gets one
`Mail returned: <lane> is dead` notice listing the messages, so it can resend
them to a live peer or hold the work. Mail the operator sent is superseded
without a notice. Nothing is read, acknowledged or deleted, and other
recipients keep their delivery.

Deadlines are evaluated when a checkpoint, a `status`, a `top` refresh or a
served call reads the record, from the stored timestamps. The service gains no
background scheduler, and a stopped service produces no phantom transitions. The
runtime records one bounded notice per breach, addressed to the owner and to any
lane waiting on that issue through a recorded dependency, so a peer can decide
whether to ask for a handoff; the notice reaches them through the checkpoint
delivery that already carries ledger changes.

### Giving a lane a budget

```sh
agent-parley participant budget claude --tokens 2000000 --calls 5000 --hours 8
agent-parley participant budget claude
agent-parley provider budget codex --calls 5000
agent-parley budget set --tokens 2000000
agent-parley budget show
agent-parley status --over-budget
agent-parley participant pause --over-budget
```

A budget is distinct from a deadline: deadlines are windows and attempt
counts on claims, offers and acknowledgements, while a budget is a ceiling on
what a lane consumes. `participant budget NAME` records limits on one lane,
`provider budget NAME` on every lane that provider drives, and `budget set` on
every lane of the project; a participant's limit wins over its provider's,
which wins over the project's, field by field, and any limit may stay unset.
Passing `0` for a field removes it. `participant budget NAME` with no flags
prints the lane's own limits and its standing against the limits that apply.

Consumption is measured from readings that already exist. Tokens are what the
lane's own native client recorded for its session, exactly as the `TOKENS`
column reports them: no vendor request, no key, no price, so a token budget is
a count and **not** spend. Calls are the coordination calls the store served
for the lane within retention. Hours are how long the session process the
launcher recorded has been alive; a stopped lane counts no hours.

Crossing a limit is a visible state and one notice. `top` and `status` print
`budget; tokens 1,200,000 of 2,000,000 (60%)` under a lane that carries a
limit and `over budget; tokens 2,400,000 of 2,000,000 (120%)!` once one is
crossed; `status NAME` and the JSON documents carry the figures under
`budget`. The lane receives one bounded checkpoint notice naming the crossed
limit, recorded in its lane state so it is not repeated until the limit is
crossed again. Nothing is stopped, revoked or refused: `--over-budget` selects
the crossed lanes, and `participant pause --over-budget` or `participant stop
--over-budget` is the operator's decision to make.

### Enforcing a run budget

```sh
agent-parley budget enforce --tokens 20000000 --calls 50000 --hours 24
agent-parley budget enforce
agent-parley budget resume
agent-parley budget resume --reset
agent-parley budget enforce --tokens 0 --calls 0 --hours 0
```

Every budget above is advisory, and stays advisory: nothing changes for a
project until an operator runs `budget enforce` with a limit. The run budget
is a separate, opt-in record. It is a usage limit on what Parley can observe
and control, **not** a billing guarantee or a monetary cap: tokens are the
counts each native client recorded, not spend, and a provider's own spending
limit is complementary to it, never replaced by it.

**Scope.** One run budget per project, summed over every lane, provider and
account of that project: the tokens every lane's client recorded, the
coordination calls the store served, and the hours every session process has
been alive. It gates only what the service starts on its own: wakes, work
dispatch delivered by a wake, capacity retries and resumes, and `run` launches.
Advisory limits never gate, and the run budget never changes their notices;
when both exist, the run budget alone decides whether the service starts a
turn.

**Accounting.** A durable ledger, `run-budget.json` in the project's private
state directory, keeps the highest reading of each token source (a lane's
transcript path and inode) and each session (a lane and its start time), and
counts served calls past a durable event cursor, so retired events are never
lost and none is counted twice. A restart, a replaced or removed lane and a
retried session therefore add to the run and never reset it. Every transcript
a lane's client kept is read from a byte offset stored in the ledger, not only
the newest, so usage appended just before a session switched transcripts, and
sessions that ran while the service was down, are still counted. `budget
enforce` writes the initial ledger before it records the first limit, starting
the call cursor at the project's latest served call and recording every
transcript a lane's client already kept at its current end, so use from before
enforcement does not count, even in a transcript that keeps growing. A limit
added to a run that already has a ledger starts the same way for its own
field: tokens from the current end of every transcript, calls from the latest
served call, and hours offset by what live sessions have already run.

Counting can err both ways. Over: a resumed session that writes a new
transcript replaying earlier messages is a new source, so the replayed usage
is counted again; message identifiers are not deduplicated across transcripts,
and Codex rollouts carry none. Under: tokens appended to a transcript that is
deleted before the next poll reads them, and Codex rollouts older than two days
or outside the 16 most recently modified, are never seen, so the run can
exhaust late by that much.

The ledger is refreshed once by every supervision poll, under its lock, so
concurrent lanes and services see one sequence of readings and the first
reading at or over a limit records the exhaustion that every later admission
refuses on. Admitting a wake takes no new reading: it reads the recorded
exhaustion and unmetered lanes under the same lock and, while a calls limit is
enforced, reserves one call for the admitted turn until the next poll reads
its use. Concurrent admissions therefore never share the last call: with one
call left, exactly one of any number of simultaneous wakes is admitted and
the rest are parked until the next poll. A ledger lock that stays busy parks
the wake the same way rather than failing it. Accounting latency is one poll
interval for calls and hours (a session that ends between polls loses at most
that span) and, for tokens, whenever the client appends its usage to the
transcript; a large transcript is read at most 1 MiB per refresh.

**Exhaustion.** Reaching any enforced limit records one exhaustion in the
ledger, which survives restarts and appears as a `run budget exhausted` row in
`problems` with the command to run, and sends one outbound notification when a
transport is configured. From then on no wake, dispatch, retry, resume or
launch starts. A refused wake spends no attempt; the lane is parked under the
refusal and keeps its claims, reservations, worktree and uncommitted changes.

**In-flight sessions and overshoot.** Parley never kills a native process. A
lane whose client delivers hooks receives one notice at its next hook event
asking it to finish the current step, commit or checkpoint its work, report
and stop, and a `Stop` event is no longer held open for new coordination work.
A lane whose provider delivers no hook receives no in-flight notice and runs
its current turn to its natural end; that is reported here rather than
claimed. The maximum overshoot is what turns already running when the limit is
reached consume before they end, plus what accrues within the accounting
latency above; stopping dispatch never guarantees zero further consumption.
Admissions already in flight add to that bound: every turn admitted before the
poll that records the exhaustion keeps running until its next hook event, or to
its end without hooks. For calls, a poll releases the reservations it has read
use for, so a turn admitted in the previous interval that has served no call
yet can be joined by one more admission; the calls overshoot is therefore at
most the turns admitted in one poll interval plus the calls each in-flight turn
serves before its stop notice. Tokens and hours reserve nothing, so every lane
admitted before the exhausting poll may overshoot by one turn's use.
Native authentication, trust and approval prompts are untouched.

**Missing or corrupt evidence.** While a token limit is enforced, a lane
whose token records cannot be read, including every lane on a provider whose
transcripts Parley cannot parse, is refused wakes and resumes, because an
unmetered lane would otherwise be unlimited. The same holds while an hours
limit is enforced for a lane with a live session that `agent-parley run` did
not start, since its start time is unknown, even when an earlier `run` session
recorded one; `budget enforce` lists those
lanes as unmetered, and `problems` shows each as a `run budget unmetered` row,
whether or not the service ever woke it before. A ledger that cannot be read,
or is missing while a run budget is enforced, is moved aside to
`run-budget.json.corrupt` when present, rebuilt from the evidence that remains
and recorded as exhausted, so unknown prior use never reads as none.

**Resume and reset.** Raising, removing or clearing a limit is an operator
action. `budget enforce` and `budget resume` refuse to run when
`AGENT_PARLEY_TOKEN` is set, as it is in a launched lane's environment, and no
MCP tool changes the run budget. A lane's hook also denies a shell command that
runs `agent-parley budget enforce` or `budget resume`, so unsetting the
variable in the same command does not slip past. Nothing here is enforcement:
both refusals only prevent accidental use from a lane, are not an authority
boundary, and a process that hides the command well enough is not stopped.
A Stop hook that would keep a lane working on new issue or work notices is
admitted through the run budget like a wake, and reserves a call where a calls
limit applies. Recording a new limit never
clears an exhaustion; `budget resume` does, and refuses while the run is still
at or over a limit, so raise the limit first. Both read current usage first.
`budget resume --reset` starts a new accounting period in which consumption so
far, including use read at the moment of the reset, no longer counts. It begins
a new ledger the way `budget enforce` does, so a reset after a lost or
unreadable ledger never rereads transcript history as new use, and it offsets
the hours live sessions have already run. Removing every enforced limit returns
the project to advisory budgets.

**Migration.** Existing projects keep their advisory budgets unchanged and
carry no run budget. To adopt enforcement, pick aggregate limits for the whole
run, record them with `budget enforce`, and check `budget enforce` for
unmetered lanes before leaving the run unattended. Live provider behavior,
such as how quickly a client appends usage and how a lane answers the stop
notice, is verified in live acceptance runs, separately from the local test
suite.

### Delivering a message or an offer later

An operator message and a handoff offer can carry a delivery condition, so a
steer recorded now reaches the lane when it is useful rather than when it was
typed:

```sh
agent-parley say codex "Rebase onto main" --after 30m
agent-parley say codex "Wrap up for today" --at 18:00
agent-parley say codex "Pick up 18 next" --when-released 17
agent-parley say codex "Still nothing?" --after 30m --unless-reported
agent-parley say codex "Status, please" --every 1h --until 18:00
agent-parley issue offer 21 --to codex --summary "commit, checks" \
  --when-released 22
agent-parley mail pending
agent-parley mail cancel 3
```

**Recording is not delivering.** The item waits in the coordination store and is
delivered by the supervision poll that already observes every project. There is
no scheduler process and no extra thread. `status`, `top`, `mail pending` and
every other read-only path report pending items and deliver none, so a stopped
service delivers nothing and loses nothing: the item waits and is delivered on
the first poll after the service returns.

`--at` and `--until` read a 24-hour time of day in the timezone of the machine
the command is typed on, and resolve to today while that time is still ahead and
to tomorrow once it has passed. The instant is then recorded absolutely, so a
later timezone change, a daylight-saving transition or a restart never moves a
recorded item. A time that passed while the service was stopped delivers on the
next poll rather than being skipped.

`--when-released` is answered from recorded ledger transitions only: an explicit
release of that issue, or supervision's own record that the pull request of the
current ownership generation ended. An issue that was released and claimed again
reads as held, and an old pull request on a reused lane branch never answers for
a later claim. An item carrying both a time and a condition waits for both.

`--unless-reported` applies to a delayed message and drops it once the lane files
a report of its own, which is the answer the reminder was going to ask for.

**A repeat is bounded and there is no cron syntax.** `--every` requires
`--until`, and the repeat is capped at 24 deliveries however wide that window
is. Each occurrence carries its own deduplication key, so a restart delivers an
occurrence once; a repeat that fell behind while the service was stopped catches
up one delivery per poll. Each occurrence keeps the time it was planned for
beside the time it was actually delivered, so the two are compared rather than
conflated.

`mail pending` lists every recorded item with its recipient, its time, its
condition and the deliveries it has left; `mail cancel ID` removes one before it
is delivered. `status` counts a lane's pending operator items.

`mail pending` also lists, under `orphans`, the orphan decision for each lane
holding orphaned claims: the remedy `problems` prints, which is a live peer's
`issue claim --take-orphaned` or, when no live lane can take them, the
operator's commands. It is read from the ledger, so it appears whether or not a
notification transport is configured.

### Attaching what does not fit

Every coordination payload has an explicit UTF-8 byte cap: a message body
4,096, report `--evidence` 4,096, a handoff summary 2,048, and report
`--summary` and `--remaining` 4,096 each, which are refused above it. A
body above its cap is not refused and not truncated. It is written whole to
`attachments/` under the project's private state directory, keyed by the
record it belongs to, and the record keeps the first bounded slice ending
with a line such as `[attachment message-12: 20480 bytes]`. The recipient's
checkpoint notice stays within its 1,536-byte budget and ends with that
reference; for a handoff the reference is restated after the clipped issue
notice. Nothing is delivered whole into a context automatically.

```sh
agent-parley mail show 12 --full
agent-parley report show 3f9a1c2e4b5d6e7f --full
```

The MCP server lists no attachment tool; `--full` on `mail show` and
`report show` is the reading path. A reference is an opaque
`kind-identifier` token, never a path: it is validated by pattern before it reaches the file system and resolved only
inside the attachment folder. Only the participant that wrote an attachment
and the participants its record was addressed to can read it; a report's
attachment is readable by its own lane.

One attachment is capped at 65,536 bytes and a lane holds at most 1 MiB of
attachments in total; a body past either cap is refused with the cap named.
Messages are never pruned, so when a long message would pass the lane's
allowance, the lane's oldest message attachments that every recipient has read
are released first, only as far as the new body needs. A released attachment
reads as released and its message keeps the first slice. A message with an
unread recipient, or with no recipient such as a feed-only post, keeps its
attachment. A report attachment is
removed when the report log rotates past that record; an offer attachment is
removed when the offer is declined, cancelled or replaced, and an accepted
offer keeps it until the issue is released. `top` and `status` count as
`CONTEXT` only the bytes coordination injected, never an attachment's size,
and the `top` legend says so.

`agent-parley top` watches every participant live: session state, event age,
branch with a `!` when a lane left its assigned branch, issues owned and
handoffs pending, unread and unacknowledged mail, held leases with the age of
the oldest, delivered context, denials against retained hook events, served
MCP calls with rejections, and the tokens that lane's own native client
recorded. The header carries server health, the project's denial rate and
how long the frame took to read. The view is read-only and makes no model
call; `q` leaves it.

Like a task manager, the view lists what is live. A lane is out of a live
state when it is retired or when its lane state record is `stopped`, `dead`
or `reclaimed`; a lane with no record yet falls back to a session cell that
reads stopped. Such a lane which owns no issue, holds no offer, holds or
waits on no lease, has no unread or unacknowledged mail and has no ready
report awaiting approval is left out. So is every lane of a project whose
root no longer exists, such as a run under `/tmp` after a reboot. A lane
whose mailbox or lease store could not be read stays on screen. The session
cell names the recorded state, its cause and how long it has held it. The
header counts what was left out. `a` in the live view and
`--all` on the command line show it again, and `--json` always reports every
lane. A stopped lane that still holds work stays on screen, because that work
needs the operator.

Git readings dominate a frame, so the live view reads each lane's branch
and each project's operator edits and base advances at most once every five
seconds. The rest of the frame is read on every redraw.

The table is fitted to the terminal rather than fixed. Each column is as
wide as the widest value in that frame and never narrower than its declared
minimum. When the set does not fit, columns are dropped in this order, and
the header names the ones that went:

```text
PROVIDER, EVENT, BRANCH, CONTEXT, CALLS, TOKENS, UNUSED, TASK, LEASES, FIT,
IDLE, REVIEW, ISSUES, DENIALS
```

`PARTICIPANT`, `STATE` and `MAIL` are never dropped; if they alone still do
not fit they share the width that is left, and a value a column could not
show in full ends in an ellipsis. Rows past the last line are paged rather
than discarded: the footer reads `rows 1-8 of 31`, and the page follows the
selection, so moving past the last visible lane scrolls the table. A lane
never loses its stall marker or its last prompt to a page break.

Keys in the live view:

| Key | Does |
| --- | --- |
| `j`, `k`, down, up | Select the next or previous lane, paging the table. |
| `enter` | Show every recorded field of the selected lane, unclipped. |
| `s` | Order by the next column. |
| `r` | Reverse the order. |
| `f` | Narrow to participants, comma separated; empty clears. |
| `o` | Narrow to projects, comma separated; empty clears. |
| `c` | Choose the columns shown; empty shows all. |
| `a` | Show or hide stopped lanes and projects whose root is gone. |
| `P` | Show the `problems` rows in place of the table. |
| `?` | Show the key map and the column legend. |
| `q` | Leave. The view never writes state. |

The same choices are available on the command line as `--sort COLUMN`,
`--reverse`, `--repo ROOT`, `--participant NAME` and `--columns LIST`,
and they apply to `--once` and `--json` as well as to the live view. A sort
on a counted column orders from the largest value down. Narrowing recounts
the header, so it never counts a row the table does not show. A project is
matched by path or by its trailing directory name.

Branch drift, a stale lease, a rejected call, an overdue issue and a lost
session process are drawn in colour where the terminal reports colour
support and in bold where it does not. Each also prints its own `!` or word
in the table, so a monochrome terminal and a piped capture read the same.
The legend that explains the columns moved behind `?` and out of every
frame.

A resize redraws the frame from scratch. Each line is written on its own,
so a write the terminal refuses is counted and named in the footer instead
of leaving a half-drawn frame. `--once` prints at the width of the terminal
when one is attached and at the full width of the table when the output is
a pipe, so a captured file holds every column intact.

A reservation can name something that is not a file. Lanes collide on one local
database, one dev-server port, one hardware device, one integration suite that
cannot run twice at once, and a worktree isolates none of them. The same
reservation tools accept a named resource written with a scheme, so it can never
be confused with a path:

```sh
port:5432
db:local
suite:integration
device:android-1
```

A named resource conflicts on an exact match only: no glob, no prefix and no
path containment applies, because a port number is not a directory. Everything
else is unchanged — the same 128-lease cap, the same optional `ttl_seconds` and
stale marking, the same conflict naming the owner and that owner's reason, the
same release by owner only, and the same rows in `top`, whose `LEASES` cell
counts paths and named resources together. `status` additionally lists the named
resources a lane holds, because a name is short enough to read and a path list
is not.

A project can declare which resources exist, so a mistyped name is refused
before two lanes reserve two spellings of the same thing:

```sh
agent-parley resources show
agent-parley resources set 'port:5432 db:local suite:integration'
agent-parley resources set ''      # accept any well-formed name again
```

With a declaration in place, an undeclared name is refused with the declared
list in the message. With none, every well-formed name is accepted. The
declaration lives in coordination state beside the roster, so it commits
nothing to the target repository, and it grants nothing: it only narrows what
may be reserved.

`top` and `status` mark a lane `idle` when its recorded session process is
alive, it holds unread mail or an unacknowledged message at least as old as the
configured interval, and it has shown no sign of work inside that interval: no
served coordination call, published activity update, native hook event or
filed report. A lane busy with native tool calls is therefore not idle, and the
idle age printed is that silence rather than the waiting item's age. The marker
names the oldest waiting item and how long it has waited, so a
stalled lane reads differently from a busy one instead of looking healthy in
every column. It is read-only: nothing is revoked, no claim is released, no
ownership moves and no lane is woken by it. A lane whose session process is not
alive is never marked idle, because `stopped` already says that. `--provider`
selects which lanes are reported, exactly as for every other column; `--since`
narrows counted history and does not change the idle interval, which is its own
setting.

The interval defaults to 600 seconds. Set it per project under `supervision` in
that project's manifest in coordination state, or globally in
`supervision.json` beside it, as `stalled_after`; it accepts 1 to 86400
seconds, the same bounds as `inactive_after`.

A reservation may declare `ttl_seconds`, and one taken without it never
reports as stale. Once a declared time to live passes, the LEASES count in
`top` gains `!` and the stale count, `status` counts the expired leases apart
from the live ones and names the age of the oldest in seconds past its
deadline, and a conflict names that holder as stale.

An expired lease does not stay expired. A holder that is still working renews
it at that lane's next tool call, restoring the window the holder declared, so
a lane working under a key keeps it; a session start, a prompt, a turn end or a
supervisor resume renews nothing. A holder whose last observation found no live
session process, or found it idle past the inactive threshold, or whose lease has been expired
longer than the 1800-second grace, loses it: the runtime releases the lease,
grants the oldest queued request for each key, tells the lane that took the key
who lost it, and tells the former holder what was released and why. A lease
whose correlated claim is closed is released at the holder's next checkpoint in
the same way. Nothing here is enforcement: reservations stay advisory, nothing
on disk is locked or reverted, and a lane that is still editing a reclaimed key
reserves it again.

A reservation is also forecast against the base checkout's co-change history.
When a lane files reservations, the store reads `git log --name-only` over the
last 500 commits of the base checkout once per project, bounded by a timeout
and cached as `cochanges.json` in the project state directory keyed by the
head commit, so the read repeats only when the base moves and never runs
inside the store's write transaction. Every file that changed in the same
commit as a newly reserved path at least three times, and that a peer holds
right now, is reported in the grant as `forecast`, with `path`, `peer` and
`count`, bounded like `conflicts`. `issue claim` carries the same forecast
from the paths the issue's earlier pull requests touched, read through `gh pr
list --search "closes #N"` when a forge is configured, and stays silent
otherwise. The forecast is advisory: nothing is withheld, and a history Git
cannot read in time is no forecast rather than a failed call.

A person editing the base checkout is the one writer reservations never saw.
Each `top` and `status` frame runs `git status --porcelain` once for the base
checkout of every project and compares the dirty paths against each lane's
active reservation patterns, using the same overlap rule a competing
reservation is judged by, so a glob reservation matches a new file under it. A
match is printed as an indented line under the lane's row in `top`, listed
under the reservation count in `status`, and carried in the `operator_edits`
field of `top --json` and `status --json`. The lane's lifecycle hook delivers
one bounded advisory notice naming the paths and stating that nothing was
reverted; the notice repeats only when the set of paths changes, which the hook
records in the lane's activity state. Nothing pauses, reverts or locks, and a
Git failure or timeout reports nothing rather than an error. `--no-operator-edits`
on `top` skips the reading for a repository whose base checkout is always dirty.
Use `--once`, or pipe it, for one plain snapshot instead of a live view, and
`--interval` to change the redraw period. `--provider NAME` reports only the
participants driven by that provider and is repeatable; the header then counts
only the reported rows, and a project holding no selected participant says so
rather than reading as empty. Session state follows the recorded
session process, not the session lock, so watching a lane never blocks a
launch. Denial counts cover the whole retained event log, the current file and
the one rotated file together, so a count reports every record still kept rather
than the current file alone. Only those two files are kept, and records older
than fourteen days are discarded at the next session start or session end, so a
long-running lane reports recent enforcement, not project history; served-call
counts cover the most recent 2000 events per project.

A base branch that moves is the other writer no lane sees. Each `top` and
`status` frame reads the head of the base checkout once per project and
compares it with the point each lane branched from, through `git merge-base`.
A lane still forked from that head is current and is read no further, so a
project whose lanes are all up to date costs one Git read and no store read at
all. Where the base did advance, the paths it changed since the fork point are
matched against the lane's active reservations, using the same overlap rule a
competing reservation is judged by, and against the paths the lane itself
holds: those committed on its branch and those still uncommitted in its
worktree. A match is printed as an indented line under the lane's row in `top`,
under the reservation count in `status`, and carried in the
`base_advance_paths` field of `top --json` and `status --json`. The owning lane
is told once per set of moved paths, through the path that already carries its
coordination: the lifecycle hook at its next event, or the polled delivery file
for a CLI without hooks. Neither path wakes the lane for it, so an idle lane
reads it with its next wake and a working one at its next natural stop. The
bounded notice names those paths, states that nothing was rebased, and gives
the command that rebases the lane, `git -C <lane> rebase <base>`, where the
base is the branch checked out in the base checkout or its commit when that is
detached. It counts against the same injection budget as every other notice
and repeats only when the set of paths changes. The delivery time is recorded
in the lane's activity state, and the marker in `top` and `status` ends with
`lane told <UTC time>` or `lane not told yet`; `top --json` and `status --json`
carry it as `base_advance_told_at`. Nothing rebases, pauses or reverts, and a
Git failure or timeout reports nothing rather than an
error.

Every recorded decision carries the failure that produced it, when one did, so
a run of denials stays answerable after the lane recovers. The live copy of
that failure is cleared by the first call that succeeds, which is exactly what
the remedy for an outage produces, so recovery would otherwise destroy the only
record of the cause. The retained text is bounded, and the most recent one is
reported beside the counts.

`IDLE` is how long that lane went without coordination activity inside the
window. An idle interval opens when a turn ends, which the native client
reports as a `Stop` or `SessionEnd` checkpoint, and closes at the lane's next
recorded activity; the interval still open when the view is drawn counts only
while the recorded session process is alive, because a stopped lane is stopped
rather than idle. The header carries the project total and the lane holding the
largest share. A `+` after the figure means the window reaches past what
retention kept, so the number understates the truth rather than pretending to
be exact.

The figure is derived from coordination state and is honest about it: it says
how long a lane went without coordination activity, and it does not claim to
know what the native client was doing inside a turn. A lane can be thinking
hard and still show idle time here.

`status` prints the same figure per lane and, under it, every pending item with
the seconds it has already waited, so an offer that has waited eleven minutes
reads as eleven minutes rather than as a bare offer ID. Four waits are
measured: a message from delivery to its first read, an `ack_required` message
to its acknowledgement, a handoff offer to its acceptance or decline, and a
`ready` report to the merge, pull request or retirement that ended it. Each
wait reports whether it has ended, so a pending wait is never read as an
answered one. Report and integration records are kept per lane beside the event
log, which is what makes the last of those four a subtraction rather than a
guess; they survive `participant retire`, because history about finished work is
still history.

`events export` carries all of it. Every line names its kind in `record`:
`event` for a hook decision, `idle_interval` for a measured stretch of
inactivity, and `wait` for one of the four waits. The intervals and waits leave
with the records, so they can be compared across sessions, providers and
accounts after retention has discarded the events they were derived from.

`TOKENS` is what that lane's own native client recorded for its session, read
from the session records the client already keeps on disk: no vendor request,
no API key, no price. Treat it as a relative signal between refreshes of the
same lane. It is **not** billed spend, and it is not comparable between
vendors, which count differently. It is also unrelated to `CONTEXT`, which
measures only the bytes coordination itself injects. The records are looked up
under the config home that lane launched with, so a credential profile that
relocates the config home is followed. The cell is blank whenever nothing
could be read — records absent, unreadable, malformed, or in a shape a client
version changed — and a blank cell means "not read", never "spent nothing".
Claude is read from that client's transcript for the lane's working directory.
Codex is read from the rollout whose own record names that lane, searched only
in the last two days of rollouts, so a Codex session older than that reports
nothing. Reading is incremental: each refresh folds only the records appended
since the previous one, up to 1 MiB per lane, so watching a long session never
re-reads its history.

`UNUSED` is the lane state accounting `status` prints on its `Lanes:` line,
per lane: idle lane-minutes per observed lane-hour, then unaccountable
claim-minutes, as `35.0/4.0`. Both are totals since the first poll that
accounted the lane. The cell is `-` until a poll has accounted the lane.

`FIT` is the capacity check the runtime last read for that lane, and a `+`
after it means an advisory work offer is waiting for that lane to act on. Four
checks run, each from what the host can already read and none of them asking a
vendor: the recorded session process is running and its session has not ended
or stopped for an approval; the lane's own client records carry no rate-limit
or usage-window refusal inside the stall interval, read from the same files
`TOKENS` parses; the worktree is on its assigned branch or has nothing
uncommitted elsewhere; and the lane owes no acknowledgement older than the
stall interval. Each check is provider specific and defaults to no opinion, so
a provider whose client publishes nothing skips that check rather than blocking
an offer, and only a check that actually failed makes a lane unfit. An unfit
lane prints the failed check under its row, and no offer names it. A blank cell
means nothing has been published for that lane yet.

Three offers are built on that check, all advisory and none moving ownership.
A lane that holds no claim and passes the check is offered, at its next
checkpoint, the unclaimed ledger issues no recorded dependency blocks — ordered
so the ones other owned issues wait on come first — together with the peers
holding more than one claim. A lane that holds more than one claim is told
which fit peers have been idle past the stall interval, so it can shed one.
A lane that holds one claim carrying a countable backlog, and that has itself
recorded no coordination event for that same interval, is offered a split of
that backlog. Every message counts against the same 1,536-byte checkpoint
budget as every other injection and is delivered once per distinct offer: a
lane whose situation has not changed sees nothing new. Nothing is claimed for a
lane, `issue offer` remains the only transfer path, and the recipient still
accepts or declines.

**A lane whose claims all wait is told what to do next.** A lane holding
claims that are ready and waiting on CI and review, blocked on a recorded
condition, or waiting on an unfinished dependency has nothing to resume. Its
continue offer names each waiting claim and what it waits on, so the lane does
not re-check them, and then the next work in order: peer mail that asks for an
acknowledgement, the top `agent-parley issue next` candidate to claim, and a
peer claim with no progress past the stall interval to ask for with
`agent-parley issue request`. When none of those exists, the offer tells the
lane to call the `retire` MCP tool rather than answer with a status line. A
lane that can still resume a claim is told to resume it, and the claims that
wait are listed after it.

**Lanes woken together are pointed at different work.** One sweep offers
work to lanes in name order, and each lane's next candidate, or the first
issue its pull offer lists, skips the issues already named to an earlier lane
while another candidate remains. The offer records that issue as `lead` in
the lane's `<lane>-work.json`, and `agent-parley issue next` ranks an issue
another lane's `lead` names below every issue no lane was pointed at. The
offer and `issue next` both tell the lane to claim before exploring or
editing, because the claim is what settles a race. Offers stay advisory:
nothing is claimed for a lane.

**New forge issues are offered before anyone claims them.** An issue enters
the ledger only when it is claimed, planned or assigned, so pull offers, next
leads and `issue next` also read the open issues in the poll's
`forge-issues.json` cache. An open issue the ledger has no record of counts
as unclaimed and unblocked, with its forge title. A cache older than twice
the refresh interval, or a missing one, adds nothing, and the ledger itself is
never written for this.

**An idle holder offers the split itself.** A claim held by a lane that has
gone quiet on it is a defect that reads as healthy: the claim is held, the
remaining work is untouched, and no row says anything is wrong. The runtime
cannot count that remaining work by itself, because a claim's units are
whatever its own domain counts — issue families in a target project, files to
convert, subtasks of a migration — so the owner states the count on its own
progress report:

```sh
agent-parley report --state partial --summary "converted 12 families" \
  --remaining "families still to convert" --backlog 129
```

The count is recorded on that claim's execution state, bound to the claim
generation the report named, and a later report that does not restate it leaves
it standing. A new claim generation starts with no count, because the lane that
takes the work states its own. Once the count is above zero and the lane's own
idle stretch passes the stall interval, the sweep offers it a split without an
operator asking for one, naming the issue, the count and the peers that could
take part of it. A recipient qualifies only when both readings already in the
runtime agree: the fit check above, and the same share conditions a returned
share is judged by — a live session process, no native dialog on its screen,
capacity that is not exhausted, and no claim of its own blocked by unfinished
dependencies. When no peer qualifies, nothing is offered and nothing is
invented; if the lane does split its work and sends a part, a recipient that
cannot answer returns that share through the bounced-share path above. The
holder's own capacity check must also not have failed, since it has to take the
turn that sends the share, and an exhausted owner belongs to recovery instead.
The offer and its dispatch outcome sit on the holder's row in `status` and
`top` as `split offer pending`, like every other work offer. The lane decides
what to split, nothing moves until a recipient answers, and no ownership
changes here.

Idleness here is observed coordination inactivity, which is not the same thing
as a live process or as provider capacity; the three are checked separately and
reported separately, because a quiet coordination channel alone does not prove
that a native turn is idle or that a lane can safely accept input.

When an owner is alive but its provider has published an exhausted capacity
window, the operator can approve recovery of that exact claim and native
session from the project base checkout:

```sh
agent-parley issue recover 42 --reason "continue on an available lane"
```

The command records an approval; it does not stop a process by itself. A later
supervision pass must publish a matching current capacity observation before
the runtime stops the process, captures its committed, staged, unstaged and
non-ignored untracked content, and marks the claim recoverable. A refusal from
the provider, elapsed time, or the approval alone cannot transfer ownership.
Recovery also refuses while the owner is paused, waiting for a native approval,
or waiting for more operator input. The command itself refuses inside an
assigned worktree, even with `--repo` pointing at the base checkout, and in
any process holding a lane's `AGENT_PARLEY_TOKEN`, even after it changes
directory to the base checkout, so a lane cannot approve recovery of its own
or a peer's claim.
The receiving lane still runs `issue claim 42 --take-orphaned`. That claim
revalidates the stopped process and ownership generation, moves only the old
claim's reservations, fast-forwards to the captured committed HEAD, and restores
the captured index and working tree into a clean destination. It permits
unrelated ignored caches, but refuses dirty or untracked content and ignored
content at a path recovery would change. Both worktrees stay intact. Restore
progress is durable; after interruption, the new owner reruns
`issue claim 42` to resume the exact recorded phase. Only the ownership
generation the take created restores anything: an accepted handoff, a release
or any later claim moves the take and any orphan marker into that transition's
history entry, so a lane that accepts the work never replays the dead owner's
checkpoint. An owner that re-claims its own orphan-marked issue keeps its
accepted handoff and attachment and retires its previous generation's mail.

The checkpoint and its Git bundle live in the private Agent Parley state
directory. The bundle carries an exact size and SHA-256 digest, so binary and
large files are referenced rather than embedded in the issue ledger. Ignored
untracked files are excluded. Each checkpoint records a fingerprint of the
lane's HEAD, its porcelain status and the size and modification time of every
changed path. A hook event that finds the same fingerprint and an existing
bundle refreshes only the step, gate and blocker fields and writes no new
commit or bundle, so repeated tool calls on an unchanged tree stay cheap. The
service takes the capture after it has answered the hook, so a slow bundle
never delays a native call. The old session generation is refused by later
lifecycle hooks after takeover; this is runtime fencing, not a filesystem
security boundary against another process writing directly into the old lane.
Its tool calls are denied, but its `Stop` is let through with the transfer
shown, so a returning session ends its turn instead of looping on refusals.
The service never wakes a fenced session with `run --resume`, and a manual
`agent-parley run NAME --resume` of it is refused; start a new session
instead.

`--since` narrows every event count to a window that ends at the current
reading, so `agent-parley top --since 6h` answers what happened in the last six
hours rather than across the whole retained log. Accepted windows are a count
followed by `s`, `m`, `h` or `d`. The header states the window, or `all
retained` when none is given. A window can only narrow what retention already
kept: it never recovers a record that rotation or the age bound discarded.

```sh
agent-parley top --since 6h
agent-parley events export --since 7d --output enforcement.jsonl
agent-parley events export --participant claude-1 > claude-1-events.jsonl
```

`events export` writes the retained hook event records as JSON Lines, one
record per line, each naming the participant that produced it. Records go to
standard output unless `--output` names a file, and the count is reported on
standard error in that case so a redirected export stays valid JSON Lines.
`--participant` selects one lane and is repeatable; every participant is
exported by default. `--since` takes the same windows as `top`. Export reads
state and never writes it, and it is the supported way to keep enforcement
history beyond what the state directory retains.

### Ownership history

`agent-parley history` answers over the ledger, the per-lane report log and the
store:

```sh
agent-parley history issue 42
agent-parley history participant claude-1 --since 7d
agent-parley history claim CLAIM_ID --json
agent-parley history issue 42 --kind claim --kind handoff
```

`history issue 42` lists every claim, release, handoff, dependency change,
reservation, message and report that touched it, in order, and heads the listing
with each ownership generation and how long it was held. `history participant
NAME` lists the same for one lane, and `history claim ID` prints the whole chain
from a claim to the pull request that ended it.

`--kind claim|handoff|report|approval|reservation|message`, `--participant`,
`--provider`, `--issue` and `--since` combine on any listing, and `--json`
prints one document with a `records` array, consistent with the snapshot
contract below. `--output PATH` writes that document to a file instead.

**A correlation key follows the work.** Every claim carries its own identifier,
minted again on each claim and each accepted handoff, so releasing and
reclaiming an issue produces two distinct generations rather than one blurred
one. Every record made while a claim is held carries that identifier:
reservations and messages in the store, reports and integrations in the lane's
report log, and the pull request that ended the claim.

**It reads, only.** The store is opened read-only, no lock is taken and no
record is rewritten, so a history query is safe beside running lanes. Retention
follows each substrate: the issue ledger keeps its records until the project is
removed, the report log keeps the newest 2000 records and is rewritten in
place once it passes 256 KB, and mail and reservations keep theirs for as long
as the store does. A record written before this correlation existed carries
no claim and is reported as `unknown`; nothing is back-filled, because an
invented correlation is worse than an honest gap.

### Following one lane

`agent-parley watch NAME` sits on one participant and prints its coordination
events as they happen, one `TIME KIND description` line each:

```sh
agent-parley watch codex-2
agent-parley watch claude-1 --since 1h --kind claim --kind handoff
agent-parley watch claude-1 --json | jq .description
```

The stream starts from the most recent twenty events, or from every event
inside `--since`, and then follows the ledger, the report log, the store and
the lane's hook event log on a short interval, printing only what is new.
`--kind` takes the history kinds (`claim`, `handoff`, `report`, `approval`,
`reservation`, `message`) plus `call` for a served coordination call, `denied`
for a hook denial and `session` for a session boundary. A lane whose session
ends prints one `session ended` line and the stream keeps following, so a
restart appears as `session started` in the same stream. `q` or an interrupt
leaves.

When standard output is a pipe the lines are plain with no cursor control, and
`--json` prints one JSON object per line rather than one document, so
`watch NAME --json | jq` works. Each object carries `at` in RFC 3339, `kind`,
`participant`, `description` and the identifiers the line abbreviates, such
as `issue`, `claim_id`, `message_id`, `thread_id` and `tool`.

**It reads, only.** The store is opened without a write transaction, the event
files are read under their shared lock for the bounded lifetime of one read so
a rotation cannot split the snapshot, and no coordination state is mutated.
Every record is identified by its content rather than by its position in a
file, so a rotation between two reads neither drops nor repeats a line.

**It never shows the agent's conversation.** The stream is coordination only.
The native client's transcript stays in that client; nothing the agent said or
was told is read or printed.

### Machine-readable output

Many read-only commands accept `--json` and print exactly one JSON document on
standard output; the
[machine-readable output list](commands.md#machine-readable-output) names each
one. For example:

```sh
agent-parley status --json
agent-parley top --json
agent-parley version --json
agent-parley issue list --json
agent-parley issue show 42 --json
agent-parley issue next --json
agent-parley participant list --json
agent-parley participant show claude --json
agent-parley mail thread THREAD_ID --json
agent-parley mail search "reservation conflict" --json
agent-parley mail list --json
agent-parley approval show --json
agent-parley verify show --json
agent-parley init show --json
agent-parley branch show --json
agent-parley forge show --json
agent-parley state show ARCHIVE --json
agent-parley provider list --json
agent-parley provider show claude --json
agent-parley credentials list --json
agent-parley credentials show work --json
```

The commands that change something report their outcome the same way, so a
skill parses one document instead of scraping a sentence:

```sh
agent-parley up --json
agent-parley down --json
agent-parley setup PATH --json
agent-parley run claude --json
agent-parley say claude "Rebase first" --json
agent-parley mail send claude "Rebase first" --json
agent-parley mail cancel ITEM_ID --json
agent-parley approve claude --json
agent-parley reject claude "Rebase first" --json
agent-parley problems ack MESSAGE_ID --json
```

`top --json` prints one frame and exits rather than drawing the live view;
`--provider` and `--since` narrow it exactly as they narrow the table. Write
commands are unchanged, and a refusal still goes to standard error with a
non-zero exit status, so a script tells a refusal from a document by the exit
status alone.

With `--json`, a runtime failure also prints one error document on standard
output, on a single line, and exits 1 as it does without `--json`:

```json
{"schema": "agent-parley/read/v1", "kind": "error", "generated_at": "2026-09-27T10:00:00Z", "error": {"type": "bridge", "message": "No participant named nobody"}}
```

`type` is `bridge` for a coordination refusal, `timeout` for an external
command that ran out of time, `os` for a file or network failure, `missing`
for an internal lookup that found nothing, `store` for a failure reading or
writing coordination state, and `value` for anything else, such as an
invalid value. `message` is the same text the `agent-parley:` line
prints on standard error, which still appears; no traceback is printed. The
document goes to standard output so `agent-parley ... --json | jq` reads a
failure the same way it reads a result. A command that already wrote part of
its output before failing is not rolled back: the error document follows on
its own line, so a script checks the exit status first and reads the last
line on failure. `watch --json` ends the same way, and the single-line document
keeps its JSON Lines stream valid. `events export` takes no `--json`, so a
failure there prints only the `agent-parley:` line on standard error and exits
1. Without `--json`
nothing changes. An invalid flag or argument is rejected by the argument
parser before any command runs: it prints usage on standard error, nothing on
standard output, and exits 2, with or without `--json`.

Every document carries the same envelope:

| Field | Meaning |
| --- | --- |
| `schema` | `agent-parley/read/v1`, the version of this contract. |
| `kind` | The command reported: `status`, `top`, `metrics`, `version`, `issues`, `issue`, `issue_next`, `issue_match`, `participants`, `participant`, `history`, `mail_thread`, `mail_show`, `mail_search`, `mail_list`, `mail_pending`, `mail_cancel`, `decide`, `decision_list`, `report_show`, `report_review`, `plan`, `plan_diff`, `plan_proposals`, `plan_revision`, `approval`, `verify`, `init`, `pool`, `branch`, `forge`, `deadlines`, `budget`, `state`, `setup`, `up`, `down`, `run`, `say`, `approve`, `reject`, `problems`, `problems_ack`, `doctor`, `notify`, `gc`, `resources`, `providers`, `provider`, `credentials`, `credentials_show` or `error`. |
| `generated_at` | RFC 3339 UTC instant the snapshot was taken. |

Repeated rows are arrays rather than objects keyed by name, so a reader pages
them without knowing the identifiers in advance, and every recorded time is RFC
3339 in UTC whether the lane state files or SQLite recorded it. The document
carries the identifiers the table abbreviates: offer IDs on `issues`, message
and thread IDs on `mail_thread` and `mail_search`, participant names, registered
identities and branch names everywhere they apply. It carries no credential
value; a credential profile is named, never its contents.

`version --json` reports `version` and `state_directory`. `issue show --json`
reports the `issue` asked for, the ledger `revision`, its `record` as the
`issues` array shapes one entry or null where the ledger never recorded it,
the advisory `reservations` its owner holds, and the same `history` document
`history issue N --json` prints. `participant show --json` reports every field
a `status` participant carries, plus the `worktree` the lane lives in, the
advisory `budget_limits` the manifest records, `wake_enabled`, and
`launch_timing`: the `worktree`, `init` and `start` seconds of the lane's last
launch, their `total`, and the epoch time `at` the native CLI started, or an
empty object before the first launch completes. `pool show --json` reports the
configured `size` and one `spares` row per spare naming its `worktree`,
`branch`, `base` and `state` (`ready`, `preparing` or `stale`); `status --json`
carries the same reading as each project's `spares`.
`mail list --json` reports `limit`, `messages` newest first and `has_more`.
`approval show --json` reports `root`, the `approval` steps and `required`;
`branch show --json` reports `root` and `prefix`; `forge show --json` reports
`root` and `forge`; `state show --json` reports the `archive` path and its
`manifest`. `provider show --json` reports the definition beside its
`provider` name, and `credentials show --json` reports `credential`,
`config_home`, `env` as `NAME=<redacted>` entries and `require_env`: no
recorded value is printed. `problems ack --json` reports the message `id` and
the `participants` the acknowledgement was recorded for.

`issue next --json` reports the reading lane as `participant`, its `provider`,
`forge_paths` stating whether the forge answered with any paths at all, and
`candidates`. Each candidate carries `issue`, the recorded `title`, its plan
`group` and whether that group is `group_underway`, the owned issues it
`unblocks`, the `provider` it declares, the peer `overlaps` and forecast
`collisions` its likely paths run into, `named_to`, the other lane whose
published work names it as next work or empty, and the ordered `reasons` for
its place.

`resources show --json` reports `root`, the declared `resources` array and
`declared`. `status` reports `server`, `state_directory`, `inbound` as
`enabled` and the configuration `fault`, if any, that stops the inbound reader,
and one entry per project holding
`root`, its private state `directory`, `root_missing` when the root is no
longer a directory, `dormant` when the root is gone or every lane has been
stopped for a long time, `reclaim` as the last sweep's `state_bytes`,
`reclaimable` and `forceable` worktrees and when it was `swept`, the issue
ledger as `revision` and `issues`, `ready_groups` naming the plan groups whose
every member is held by a lane reported ready, `participants`,
`supervision_error` as the last supervision failure's `at`, `since` and
`detail` or null after a clean poll, `supervision_poll` as when supervision
last finished a poll of the project, and
`accounting`, the project's idle and unaccountable lane-minutes merged across
its lanes as `lanes.summary` shapes them, or null until any lane has been
accounted. `server`
carries the service reading the `Code:` line prints, so a stale service is
readable without parsing text. Each
participant carries `participant`, `identity`, `provider`, `credential`,
`session`, `condition` as the lane's state, cause, evidence, `since` and held
`seconds` from its state record, or null with no record yet, `accounting` as
that lane's own `lanes.summary`, or null until it has been accounted,
`availability` as `active`, `idle` or `stopped` with the derived
`activity`, its `evidence` and whether that evidence is `stale`, `branch`,
`assigned_branch`, `drift`, `paused`,
`outcome`, `summary`, `remaining`, `evidence`, `reported_at`,
`report_age_seconds`, `injected_bytes`, `injections`, `claims`, `idle`,
`idle_seconds`, `idle_complete`, `waiting`, `wake` and `mail`, whose `unread`
counts live mail alone and whose `superseded` counts the deliveries a closed or
reassigned claim retired, whose
`named_resources` array lists the named resources that lane holds, whose
`queued_requests` counts the reservation requests waiting on the keys it holds
and whose `queued_by` names the lanes that asked. `claims`
carries one record per issue that lane owns, with its `deadline_at`, `overdue`,
`overdue_seconds`, `attempts`, `budget` and `budget_exceeded`. `idle` carries
`stalled`, the waiting item's `kind`, `message_id`, `sender` and `age_seconds`,
the `served_age_seconds` since the last served call, `silent_seconds` since
the newest served call, activity update, native hook event or report, and the
same `marker` the table prints. A lane is stalled only when that silence is
past the interval, and the idle age the table prints is the silence, never the
waiting item's age. `waiting` carries one record per pending wait, longest first,
each with its `kind`, its item and `seconds`. A
mailbox that cannot be read reports `{"error": "..."}` in `mail` rather than
failing the document, exactly as the table reports coordination as unavailable.

`top` reports `server`, `state_directory`, `window_seconds`, `providers`,
`totals` and one entry per project holding `root` and `participants`. Each row
carries `participant`, `provider`, `credential`, `state`, `last_event_at`,
`stalled`, `stall`, `branch`, `drift`, `issues`, `offers`, `unread`,
`superseded`, `pending_ack`, `leases`,
`stale_leases`, `lease_age_seconds`, `queued_requests`, `queued_by`,
`injected_bytes`, `hook_events`,
`denials`, `calls`, `errors`, `tokens`, `idle_seconds`, `idle_complete` and
`prompt`. `queued_requests` counts the reservation requests waiting on the keys
that lane holds and `queued_by` names the lanes that asked; a queued request
holds nothing itself. `tokens` is null when that
lane's own session records could not be read, and `unread` and `pending_ack`
are null when its mailbox could not be read: null states that nothing was read,
never that the count is zero.

`history` reports the `subject` and `value` queried, a `holdings` array of
ownership generations with `participant`, `claim_id`, `started_at`, `ended_at`
and `seconds`, and a `records` array whose entries carry `kind`, `action`, `at`,
`participant`, `provider`, `issue`, `claim_id` and `detail`, plus the
identifiers their kind adds: `path` for a reservation, `message_id` and
`thread_id` for a message, `report_id` for a report.

`issues` reports `revision` and an `issues` array whose records carry `issue`,
`owner`, `title`, `deadline_at`, `overdue`, `overdue_seconds`, `attempts`,
`attempt_budget`, `budget_exceeded`, `blocked_by`, `offer` and `reminder`; an
`offer` additionally carries `deadline_at`, `overdue`, `overdue_seconds`, the
offering lane's `head` commit, the `reservations` array that moves to the
acceptor, and the `remaining` work from its last report. The same `offer`
record appears on the `status` document.
`deadlines show --json` reports `root` and the recorded `deadlines` defaults.
`budget show --json` reports `root` and the recorded `budget` defaults. `participants` reports
`root` and a `participants` array carrying `participant`, `identity`,
`provider`, `credential`, `branch`, `lane`, `paused`, `wake` and `budget`.
Each `status` lane and each `top` row carries `over_budget` and a `budget`
record with `limits`, `used`, `share`, `crossed` and `over`. While the
project's [run budget](#enforcing-a-run-budget) is exhausted, `crossed` also
names `run`, `over` is true and the exhaustion record is attached under `run`.

These field names carry the same stability promise as the command-line flags:
removing a field is a breaking change, and a release that adds one raises the
schema version only when an existing field changes meaning. `events export`
stays JSON Lines, one record per line, because it is a stream rather than a
snapshot; `--json` snapshots and that stream are separate contracts.

### Metrics a monitoring stack can read

`agent-parley metrics` prints the counters and gauges the live view computes,
in the Prometheus text exposition format:

```sh
agent-parley metrics
agent-parley metrics --json
agent-parley metrics --provider codex --since 6h
agent-parley metrics --output /var/lib/node_exporter/parley.prom --every 30
```

Every lane series is labelled `project`, `participant` and `provider`, and
every project series `project`. The lane families are
`agent_parley_lane_session_alive`, `agent_parley_lane_branch_drift`,
`agent_parley_lane_issues_held`, `agent_parley_lane_offers_pending`,
`agent_parley_lane_mail_unread`, `agent_parley_lane_mail_pending_ack`,
`agent_parley_lane_leases_held`, `agent_parley_lane_leases_stale`,
`agent_parley_lane_idle_seconds`, `agent_parley_lane_context_bytes_total`,
`agent_parley_lane_hook_events_total`,
`agent_parley_lane_hook_denials_total`,
`agent_parley_lane_served_calls_total`,
`agent_parley_lane_served_rejections_total` and
`agent_parley_lane_tokens_total`. The project families are
`agent_parley_project_participants`, `agent_parley_project_idle_seconds`,
`agent_parley_project_context_bytes_total`,
`agent_parley_project_hook_events_total` and
`agent_parley_project_hook_denials_total`, each summed over the rows that
project reports, so a total never counts a lane the export does not show.
`agent_parley_lane_hook_denials_by_cause_total` splits a lane's denials by
`reason` and `tool`, so a refusal over a reserved path or an expiring offer
reads apart from a policy refusal.
`tokens` is what the native client counted, not billed spend, exactly as the
`TOKENS` column is.

A measurement that could not be read reports no sample rather than a zero:
an unreadable mailbox or session record leaves `mail_unread`, `mail_pending_ack`
or `tokens` absent for that lane, while the family still prints its `# HELP`
and `# TYPE` lines so a reader sees that the metric exists. A label value
carrying a quote, a backslash or a newline is escaped as the exposition format
requires, so a repository path never breaks a frame.

`--provider` and `--since` narrow the export exactly as they narrow the table.
`--json` prints the same values as one snapshot document of kind `metrics`,
carrying `state_directory`, `window_seconds`, `providers` and a `metrics`
array whose records carry `name`, `type`, `help` and `samples`, each sample
carrying its `labels` and its `value`.

`--output PATH` writes the frame to a file by atomic rename instead of
printing it, so the textfile collector of `node_exporter`, or any scraper that
reads a file, never reads a partial frame. `--every SECONDS` rewrites that file
on an interval until the command is interrupted, and needs `--output`. There is
no HTTP endpoint and no new port: the file is the interface, and the
coordination server's loopback listener is unchanged. The command reads the
same records `top` reads, takes no lock and writes no coordination state.

## Participants, providers and accounts

### Availability, reminders and waking

The local service observes each launcher's process identity and native checkpoint
age, and derives one lane state from them. That derivation runs once per reading
and every column reports from it, so the session cell, availability and the
`problems` rows cannot describe the same lane differently in the same frame. The
derived state is `working`, `idle`, `waiting` on a prompt or an approval,
`stopped` when no session process answers, or `unknown` when no trustworthy
process identity was recorded. Each reading carries the evidence it was derived
from and that evidence's age.

A `PreToolUse` that has not yet been closed by its `PostToolUse` counts as work
in flight until the longest tool call the runtime tolerates, so a lane inside a
long command reads as working rather than as the activity before it. Published
activity older than `inactive_after` is reported as stale with its age, not as
the present. A lane whose session process still answers is never described as
stopped: a finished session under a live process is a client waiting for
whoever owns its terminal.

Observed availability is that derived state read coarsely, not a second
derivation. It is one of four values. `active` is a live launcher that is
working or waiting on a prompt; `idle` is a live launcher whose evidence has
aged past `inactive_after`, which is what a lane between turns looks like;
`stopped` is a launcher whose recorded session process is gone. A lane without a
trustworthy native process identity is `unknown`, because it may still be a live
session. A lane that is only idle is never reported with the word a dead
launcher gets. `status` reports that state beside process liveness and lists
outstanding acknowledgement IDs, senders and ages.

A lane that has recorded no native activity yet has no age to report, so
`last_active_at` and `age_seconds` are both `null` rather than an age measured
from the Unix epoch, a live launcher without a checkpoint reads as `active`
instead of ageing into `idle` on its first poll, and a `problems` row for such
a lane prints `-` in the age column and sorts below every row whose age is
known.

Sending an `ack_required` message returns an availability warning when the
latest runtime observation puts its recipient in either non-active state. An
idle recipient reports `state` `idle` with the summary
`queued for NAME (idle; wake requested)`, because the next supervision poll
asks an idle lane holding a backlog to take its turn. A recipient whose
process is gone reports `state` `unreachable` with the summary
`queued for NAME (unreachable)`. A presence row written before this release
still carries `unreachable` and is read as `stopped`. Observed availability is
separate from last coordination and never changes claims. An `unknown` recipient
reports that native process identity is unavailable and requires manual
attention; the service does not wake or resume it.

The private project manifest accepts `"supervision"` with `interval` (default
30 seconds), `inactive_after` (300 seconds), `stalled_after` (600 seconds),
`start_deadline` (30 seconds),
`completion_reminders` (3 reminders, 1 to 100), `orphan_retire_after`
(3600 seconds), `claim_idle_after` (3600 seconds), `takeover_grace`
(300 seconds), `max_claims_per_lane` (2 claims, 1 to 100),
`convergence_repeats` (3 failures, 1 to 100), `convergence_after`
(14400 seconds), `prompts`, `wake`,
`reclaim`, `titles`, `rerun_cancelled` and `rotate` (all true), `ci_rounds`
(2 rounds, 1 to 100), and `fold_after` (86400 seconds), the retention past
which a dead lane with no claim and no process is folded out of the default
`status` and `problems` views. Numeric second values range from 1 to 86400
seconds. `rotate` false keeps a lane resuming its recorded native session
after a ready or blocked report instead of starting a fresh one; see
[Running lanes](lanes.md#running-unattended).

Issue convergence is accounted separately from wakes and liveness.
`convergence.py` keeps one account per owned issue and claim generation in
`convergence.json` beside the project state. Its evidence is the lane's own
report log: the evidence text of `agent-parley report ... --issue N`, bound to
the claim and the commit the report was filed at, and pass or fail peer review
verdicts, which inherit the issue, claim and commit of the report they judge.
Each piece of evidence is classified as passing, failing or carrying no
verification evidence. A failure is reduced to a normalized signature: paths
become base names, hex and numbers are masked, and the result is hashed.
The account stores only that hash, never report text or logs.

Only verified improvement resets the account: a passing gate line in a
report of any state, or a passing review of a report no older than the latest
recorded failure; a failure is a non-zero failure or error count, pytest's
`FAILED`, a traceback, an `AssertionError`, `not ok` or a non-zero exit
status, never prose such as `fixed error handling`. Improvement records a
milestone with its commit. Commits, reservations, reports without
verification evidence and failing reports never reset it, so a lane that keeps
editing, reserving and reporting while the same gate fails is still counted.
The same failure restated at the same commit counts once. A different failure
starts a new repeat run but keeps the failure count, so alternating failures
cannot pass for progress. A report with no verification evidence is shown as
`no verification evidence` and is counted as neither failure nor success.
Blocked work (waiting on an issue or an external check) and ready work
(waiting on verification) freeze the account, and time spent waiting is not
counted against it.

Past `convergence_repeats` repeats of one failure, twice that many failures,
or `convergence_after` working seconds since the last milestone with a
failure recorded, the holder is asked once to change approach. If the same
threshold is met again after that request, the operator is told the issue is
not converging, through mail and the `non_convergence` notification event, with
the `issue offer` and `issue assign` commands that would hand it over;
`problems` lists it under `not converging`. Nothing moves automatically: the
issue keeps its owner, offer and reservations, and native approvals apply to
whatever the operator does next. There are at most two responses per
milestone and six per generation, and each message and notification is sent
once per issue, claim, milestone and stage. The escalation says the operator
was notified only when a notification was sent. With `prompts` off the
accounts are still kept on every poll but no response is sent. A new claim
generation, a release or a
completion drops the old account, so reports from a stale generation are never
counted. The file holds at most 256 issues, 16 failure keys and 64 report ids
per issue. `issue show` and each claim in `status --json` carry the current
generation's account under `convergence`.

Report records written before this version carry no commit and are accounted
without one; an upgraded service starts every account empty and leaves wake
accounting unchanged. Classification reads free text a lane supplies, so it
is a heuristic: a lane that reports no gate result is never escalated for
failure, only shown as unverified. Its effect on live model behavior is not
verified by the test suite.

Claim liveness is measured per claim, not per lane. A claim advances on its
own generation start and on `agent-parley report ... --issue N` naming it; a
lane holding a single claim also advances it with every tool call. `issue list`
prints `last progress Ns ago` beside each claim. A claim with no progress for
`claim_idle_after` takes the overdue path even while its holder is busy with
other work: one notice to the holder and to the lanes whose issues wait on it,
then an offer to the fittest peer below the claim cap with the recovery
checkpoint attached, then release once that offer expires. Each step is
recorded in history and counted in `attempts`. Blocked and ready work is
waiting rather than idle and is not moved. `issue claim` and `issue accept` refuse a lane
that already holds `max_claims_per_lane` claims and name each held claim with
its progress age. A claim whose issue closed on the forge inside its generation
does not count toward the cap, and its holder can `issue release` it even after
a ready report; the release marks it ended on the forge, so it is not offered
again as free work until someone claims it. `issue request N [--summary REASON]` asks the holder to hand the
issue to the requesting lane; the holder answers with `issue accept` or
`issue decline` and the request identifier, and a holder that neither answers
nor records progress on the claim within `takeover_grace` has the request
granted by the supervisor as an offer to the requesting lane, whose acceptance
moves ownership.
The same keys in
`$AGENT_PARLEY_HOME/supervision.json` set global defaults; global false values for
`wake`, `prompts` and `reclaim` cannot be enabled by a project. A participant
entry may set
`"wake": false` to opt out individually. These settings remain outside source.

`agent-parley run NAME` publishes the lane's activity as `starting; awaiting
native hook` before it starts a client, and the client's first hook event
replaces that label. A client parked on a native trust, authentication or update
dialog fires no hook, so `start_deadline` bounds how long that label may stand.
A launch still carrying it `start_deadline` seconds later is published as
`not started; no native hook`, with the deadline and the observed wait in the
lane's private activity state, and the lane state moves to `blocked: dialog`
with the evidence `it never started within Ns of its launch`. The mark is an
observation: nothing is killed, no claim moves and no dialog is answered. The
blocked state fails the lane's session fitness check, so such a lane is neither
offered work nor named as a share target for a peer's rebalance, and a wake is
deferred with the cause `blocked: dialog` rather than spending an attempt on a
client that cannot read an injected prompt. Answering the dialog produces the
first native hook event, which moves the lane state out of `blocked` and clears
the mark however late it arrives. Client startup on a developer machine is a few seconds;
raise `start_deadline` on a slow machine or a cold cache, where a legitimate
launch can take longer than the default.

Releasing a claim with waiting peers creates a visible handoff reminder.
The service also checks each claimed issue on the forge and reminds the holder
when the issue closed inside the current claim, recording the pull request that
closed it, its head branch and merge commit, whichever branch it came from.
GitHub links a closing pull request only when it targets the default branch;
for an issue closed by hand after a merge into another base, the issue timeline
supplies the merged pull request whose body closes the issue by keyword. A
closing pull request from another lane's branch is named in the reminder, and
so is one from a per-issue branch that exactly one other lane's worktree
checked out. Every lane pushes as the same forge account, so the pull request
author cannot tell lanes apart; the worktree's own HEAD reflog can. A branch
no lane's reflog moved to, or several did, is attributed to nobody. Only
when the forge cannot say anything about the issue does the newest pull request
on the lane branch speak for it, and a lane branch merge never marks a claimed
issue the forge still reads as open. Issue readings are reused for five
minutes.

A milestone integrated on a branch other than the default branch leaves every
issue open until that branch crosses, because GitHub closes an issue from
`Closes #N` only on a merge into the default branch. Record the branch once,
from the base checkout: `agent-parley branch integration integration/1.0.0`
(an empty string removes it; lanes are refused). The service then reads, at
most once per five minutes, and no sooner than one minute after a failed
read, the newest 100 pull requests merged into that branch, and a claimed
issue the forge still reads as open whose body a merged pull request closes
by keyword, inside the claim's generation and from any branch, is observed
as merged. A keyword inside an HTML comment, a fenced code block or an
inline code span is ignored, as GitHub ignores it. Like any merged pull request that no other
lane landed, it ends the claim as complete with actor `supervisor`, the pull
request, merge commit and base kept in the evidence, so the claim leaves the
lane, stops counting toward the cap, and is never woken, reminded or offered
again. `status` prints `Landed in BRANCH: #N (PR #M), ...` for those issues
until the forge closes them. When no claim is held, at least one landed
issue is still open and the cached reading holds every open issue,
`problems` lists one `crossing ready` row, and with
notifications configured one decision asks the operator to open the crossing
pull request (`gh pr create --head BRANCH`, naming each issue as `Closes #N`).
Nothing opens or merges it for you: a merge to the default branch cannot be
undone. A claim whose holder already reported ready also ends as complete
with actor `supervisor` once the forge reports its issue closed, even when
the issue closed before the claim or was closed by hand without a closing
pull request; the reason names the case and the evidence keeps the state and
close instant. `issue claim` refuses an issue the forge reports closed, and
allows the claim when the forge cannot be read. Forge lookups are bounded and best effort; an offline forge cannot
establish completion. Reminders appear in issue/status output and
at checkpoints. An explicit subsequent message reaching every waiting peer
marks a response observed; that is delivery evidence, not proof of a complete
handoff. Ownership still moves only through the explicit offer/accept protocol.
A `pull request ended` reminder is marked answered as soon as its holder no
longer owns the issue, whether it released, handed off, was reclaimed or was
resolved, so the former holder is not woken, sent or listed a reminder for
work it no longer holds.

A lane that opens a pull request and ends its turn to wait is woken when that
pull request changes. At most once a minute the service reads up to 30 open
pull requests with their head commit, checks, latest reviews, merge state and
the issues they close, and keeps the last reading in `pull-requests.json` in
the project state directory. A pull request belongs to the lane whose branch
is its head, else to the one lane holding every claimed issue it closes, else
to the lane whose worktree alone checked out its head branch. Its lane gets
one supervisor message, and so a wake, when the checks finish green or red on
a head commit not yet reported, when a review is submitted, or when the merge
state moves between mergeable and conflicting. The message names the pull
request, the full head SHA and the new state; a red run lists every failing
check by name. A message reporting a new review also quotes each new review's
body and up to 20 inline comments (`MAX_REVIEW_COMMENTS`) as path, line and
text, newest review first, read with `gh api repos/OWNER/NAME/pulls/N/reviews`
and `.../comments`. A message reporting failed checks quotes the tail of the
failed-step log, `gh run view RUN --job JOB --log-failed`, of each check that
ran and failed; a cancelled, timed-out or never-started check has none. The
quoted text is marked untrusted, prefixed `> ` line by line, stripped of
terminal escapes and control characters, and held to one 3000-byte budget
(`PULL_REQUEST_FEEDBACK_BYTES`) that never takes the message past its
4096-byte limit; room for every cut note is reserved first, and a cut section
is followed by the `gh` command that returns it whole. A log keeps its tail, a
review its head. Only what the message reports as new is read, so a review or
log already delivered is never sent again. The verdict waits until every check
finished, so a run is reported once rather than job by job. A pull request first seen with finished
checks or reviews is reported once too. Nothing is merged, rerun or answered
for the lane. Only the GitHub forge is read; `beads` and `null` read nothing,
and a forge that is missing, offline or unreadable keeps the last reading and
wakes nobody without stopping the poll.

A pending run carries its age. Each reading keeps every unfinished check with
its state (`queued`, `in_progress`, `pending` or `expected`) and start time,
and records when the current head was first seen pending; a new head or a
finished run restarts that clock. A head still pending past the ceiling,
twice the longest literal `timeout-minutes` in `.github/workflows` or 60
minutes when none is declared (`CHECKS_STALLED_FACTOR`,
`CHECKS_STALLED_SECONDS`), gets one supervisor message naming each check,
its state and its age. The message recommends one re-run, `gh run rerun
--failed` for a run that ended without a conclusion or cancel and re-run for
one still in progress past its job timeout, and leaves it to the lane; after
one re-run it is an operator decision. `status` prints the pending age beside
`CI pending` and marks the head `stalled`, and `problems` lists a `checks
stalled` row until the head finishes or changes. Nothing pending is re-run,
merged or bypassed automatically. A forge whose checks report no start time is
never marked stalled.

A finished run is different when every failing check ended `cancelled` or
`timed_out` and every other check passed: there is nothing to fix or push, so
the service runs `gh run rerun RUN --job JOB --repo OWNER/NAME` once per such
job through the operator's own `gh` authentication, whether or not the owning
lane is alive. The request is recorded on that head commit and never repeated
for it; a check that ended `failure` is never re-run. The lane is told a
re-run was requested so it does not push an empty commit. `problems` keeps a
`checks failed` row reading `re-run requested` until the new conclusion
arrives; a second cancellation on the same head, or a forge that refused the
re-run, names the exact command instead of `fix and push`. Set the
supervision key `rerun_cancelled` to false to turn the automatic re-run off.

A red verdict also keeps, per head commit, the attempt count and when it was
first seen red, incrementing once per rerun that ends red again on the same
commit. `problems` lists one `checks failed` row per pull request naming the
failing checks and the attempt. A required check the forge reports as never
started (`action_required` or `startup_failure`) is different: only the
operator can act on it, so every open pull request sharing the same check
name and forge conclusion is grouped into one `checks refused` row naming
every affected pull request, and one decision, opened through
`decisions.open_or_refresh` and keyed by that check name and conclusion, so
the operator answers the shared cause once rather than once per lane.

Each pull request also counts its CI rounds: a head commit whose checks
finished, counted once per commit, so neither the automatic re-run nor a
manual re-run on the same head adds a round. A red head at or past the
`ci_rounds` supervision setting (default 2) tells its lane once to stop
pushing and report blocked, lists a `ci rounds exhausted` row in place of
`checks failed`, and opens one decision offering `grant one more round` or
`take over`. A grant raises that pull request's allowance by one round and
tells the lane; a takeover stops further decisions for it. A green head, or
a head back under the allowance, closes the decision. The limit is advisory
like reservations: nothing refuses a push.

Repeating a reminder at a lane that has stopped answering changes nothing, so
the supervisor counts the reminders left unanswered on a claim observed
complete. The reminder is written once and a silent lane is asked
again at most once per `inactive_after` window, so the count is one plus the
whole windows elapsed since the reminder was written, never the number of
polls. With the defaults a claim escalates about ten minutes after its first
reminder. Past `completion_reminders` it records the
claim as an unresolved completion once, which `status` carries on the claim and
`problems` lists for the operator. A holder that answers before the threshold
clears its own escalation. Nothing moves on the marker: the issue keeps its
owner, its offer and its reservations, and the escalation goes to the operator,
never to the other lanes.

`agent-parley issue resolve NUMBER` is the terminating transition for such a
claim. It reads the forge at that moment, refuses unless the issue closed, or,
when the forge cannot say, a merged or closed lane branch pull request was
opened, inside the current ownership generation, and refuses a
claim the supervisor has not escalated, so an answering holder is never
resolved out from under it and an unverified claim is never ended this way. It
records the branch, the pull request state, its merge commit and the instant it
was observed beside the operator's reason, and history shows a `resolve` by
`operator`, never a completion filed by the lane. A merged pull request records
the work complete and frees the issues waiting on it; a pull request closed
without merging integrated nothing, so `--release` is required there and
returns the work to the queue.

For eligible idle sessions, the launcher owns a native pseudo-terminal and a
private wake socket. It admits a coordination prompt at a native idle checkpoint,
with no partially entered operator input. When supervision selected an actionable
work offer, the launcher reads that revalidated selection from private state
after admission and names its offer and issues in the turn. Injecting it is
delivery, not a claim or completion. Approval prompts and active turns refuse
injection. A stopped session can resume its recorded session ID through the same
native launch configuration and an interactive terminal;
`agent-parley run NAME --resume` exposes that operation explicitly. Native trust,
authentication and permission prompts remain in force. Environment-only vendor
accounts that cannot be reconstructed safely require manual attention.

Wake attempts start one inactivity interval apart and the spacing doubles with
each attempt, up to one hour. Three attempts on an unchanged backlog exhaust
it; the lane is then asked hourly rather than never. Work dispatches add their offer generation and
issue-scoped progress digest to that backlog. An escalated offer generation is not delivered again
until the lane records progress or a new generation replaces it. Delivery without a claim, handoff
or other recorded issue progress leaves the obligation pending. Exhaustion
records the offer, issues, attempt count, last result and operator action in the
work publication. A `busy:turn`, `busy:input`, or `busy:repeat` answer is not
one of the three. The suffix distinguishes an active turn, pending operator
input, and an accepted wake that produced no later checkpoint. After the
inactivity interval, a repeated checkpoint admits one retry. A second stalled
wake reports `manual attention required`. Terminal control replies such as
cursor position reports and focus events do not count as partially entered
operator input, so they do not refuse the wake. Complete replies are removed
from the input-state check without hiding operator bytes that arrived in the
same read; incomplete replies are carried until the next read and refuse a wake
until they complete or until half a second passes without another byte. A lone
Esc therefore resolves as a keypress, as terminal programs resolve it, and adds
no text. Backspace and delete erase one counted character, so a line typed and
then erased reads as empty. A `busy:input` refusal in `problems` tells the
operator to submit or clear the unsent text in the lane's own terminal rather
than to answer a prompt.
Wake attempts, backoff, the last result and escalation are fields of the
lane's state in the store, and every wake decision reads them there. Results
appear in `status`, the retained event log and private `<name>-wake.json`,
which is a published copy of those fields that no decision reads; resumed terminal output stays in `<name>-wake.log`,
which the launcher truncates before a write would take it past 1 MiB. A failed
write to that log, including a full disk, is dropped and never ends the resumed
session. A wake request whose lane activity record is missing or unreadable is
answered `unknown` rather than with an empty reply.

The launcher ends a session when the client exits, even while a background
process the client started still holds the terminal. `SIGTERM` and `SIGHUP`
to the launcher run the same cleanup as a normal exit (terminal restored, wake
socket removed, lane published `stopped`) and are then forwarded to the client.
A client binary that cannot be started exits the launcher with status 127.

An attached `agent-parley run` owns its terminal tab title. The title leads
with the lane name, then one state word (`working`, `idle`, `idle with claim`,
`blocked: dialog`, `blocked: approval`, `starting`, `not started`, `stopped`,
or `unknown` before the lane records any activity), the lowest
issue number the lane holds and its progress as `done/total`, or `0 open`, for
example `[claude-a] idle with claim #412 - 2/5 done`. The title the client sets
for itself follows after ` | ` and is truncated first. The title is refreshed
when the lane's activity record or the issue ledger changes or a dialog holds
the screen, and the terminal's previous title is restored on exit. Set the
supervision key `titles` to false to keep the client's native title.

`agent-parley title` prints the same line for the lane that contains the
current directory, without the client's title, and prints nothing outside a
lane. It reads only the lane's private records, so a status line can run it on
every refresh. Per provider:

- Claude Code: add a command status line to the user settings
  (`~/.claude/settings.json`) or the project's `.claude/settings.local.json`:

  ```json
  {"statusLine": {"type": "command", "command": "agent-parley title"}}
  ```

  The command runs in the session's directory, so every lane shows its own
  line and sessions outside a lane show an empty one.
- Codex, Gemini CLI, GitHub Copilot CLI, OpenCode and Amp: not supported. Agent
  Parley configures no command-driven status line for them; their lanes carry
  the summary in the tab title only.
Lanes launched before wake sockets were introduced require relaunching. A live
native session started outside `agent-parley run` has no wake socket. Exit that
session and launch it through `agent-parley run` before automatic waking can
reach it. Generated hooks record the native foreground process identity when
the operating system exposes one, and otherwise the client the lane's recorded
launcher started, so a provider that gives its hooks no controlling terminal
still leaves a lane eligible for work. If neither reading establishes an
identity, the lane remains `unknown` rather than being resumed into a possibly
live session. An unavailable adapter
or socket is reported for manual attention.
Waking never marks mail read, acknowledges it, releases reservations or
transfers an issue.

The automated tests exercise local processes, pseudo-terminals, hook payloads
and real MCP transport. They do not establish live model behavior for a provider.

```sh
agent-parley provider list
agent-parley credentials add account-1 --config-home ~/.claude-account-1
CLAUDE_CONFIG_DIR=~/.claude-account-1 claude
agent-parley participant add claude-1 --provider claude --credentials account-1
agent-parley run claude-1 --task "Work on issue 44"
agent-parley provider add vendor --adapter claude --executable claude \
  --home-env CLAUDE_CONFIG_DIR --env ANTHROPIC_BASE_URL=https://vendor.example \
  --require-env ANTHROPIC_AUTH_TOKEN
```

The third line is the native CLI signing in to that account's directory once;
nothing here records a token. `--provider` defaults to the participant name, so
name it whenever the participant is not named after its provider, and the
provider and profile a participant is created with are fixed for that
participant's life. [Providers](providers.md#accounts) carries that model, the
second-account walkthrough, the `participant list` verification line and the
retire-and-add-again route for a binding that is already wrong.

`run` creates a participant's lane on first use, so `participant add` is only
needed to prepare a roster in advance. Worktrees start at committed HEAD, so the
first registration of a repository stashes any pending work in the base checkout
instead of refusing to start. It names the stash entry and prints the
`git stash apply` that brings that specific entry back, because every worktree
of a repository shares one stash stack. Only that first registration touches the
base checkout; `merge`, `restore` and `retire` still refuse on a dirty tree. The participant name is what peers
address; the provider decides which native CLI starts and which endpoint it uses.
The `deepseek`, `kimi` and `grok` presets need their vendor base URL
and key exported in the launching shell; the launcher refuses to start when a
required variable is unset, rather than falling back to another account.

The `gemini` preset starts the native Gemini CLI. It copies native system policy
into a lane-private settings overlay, adds the MCP endpoint and translated
checkpoint hooks, and selects that overlay with
`GEMINI_CLI_SYSTEM_SETTINGS_PATH`. Native user/project settings and authentication
remain in effect. Credential profiles may select `GEMINI_CLI_HOME`, whose
`.gemini` subdirectory holds that account's native configuration. Existing
explicit provider definitions are preserved: a local definition named `gemini`
that rides the `claude` or `codex` adapter through a vendor endpoint shadows
the native preset and keeps working unchanged, `provider list` prints the
definition that is in force, and `provider remove gemini` reveals the native
preset again. Nothing rewrites such a definition. The integration follows
Gemini's [configuration](https://geminicli.com/docs/reference/configuration/)
and [hook contracts](https://geminicli.com/docs/hooks/reference/). Gemini has
no `PermissionRequest` hook, so `provider list` reports it under
`unavailable_hooks`; approval prompts remain Gemini's own.

The overlay is written under the private state root as
`<participant>-gemini-settings.json`, never into the repository or the native
directories, and is rebuilt from the native policy on every launch, so a
corrupt or stale overlay left by a crash is replaced rather than reused.
`participant retire` deletes it. A native policy that disables hooks refuses
the launch with that reason instead of starting an unguarded session.

The `opencode` preset starts the native OpenCode CLI. OpenCode reads
`opencode.json` from the directory `OPENCODE_CONFIG_DIR` names and loads
JavaScript plugins from `plugin/` beside it; it has no hook command contract.
The launcher copies that directory's `opencode.json` into a lane-private
directory `<participant>-opencode/` under the private state root, adds the
lane's server under `mcp` as a `remote` entry whose bearer header is
`{env:AGENT_PARLEY_TOKEN}`, writes `plugin/agent-parley.js`, and points
`OPENCODE_CONFIG_DIR` at the copy for that launch only. Every other key is
carried unchanged and the source directory is never written. OpenCode keeps
its credentials in its own data directory, outside the configuration
directory, so authentication is untouched; a credential profile may select
`OPENCODE_CONFIG_DIR` to choose the configuration that is copied. A
configuration that already defines `agent_parley`, or that exists only as
`opencode.jsonc`, refuses the launch with the fix named. The overlay is rebuilt
on every launch and removed by `participant retire`.

The plugin maps OpenCode's plugin events onto the shared checkpoint events:
`session.created` to `SessionStart`, `chat.message` to `UserPromptSubmit`,
`tool.execute.before` to `PreToolUse`, `tool.execute.after` to `PostToolUse`,
`permission.ask` to `PermissionRequest` and `session.idle` to `Stop`. For each
it spawns the configured hook command with `--adapter opencode`, and
`opencode.py` translates the event and the `agent_parley_*` tool names for the
shared parser and flattens the result to `decision`, `reason` and `context`.
A denied `tool.execute.before` is raised as an error inside the plugin, which
is how an OpenCode plugin refuses a tool call; a blocked `session.idle` posts
the reason back into the session as the next prompt. The service marks
`context` delivered on every event, so the plugin holds it per session and
appends it to the next `tool.execute.after` output or the parts of the next user
message, whichever comes first; context returned to `session.created`,
`tool.execute.before`, `permission.ask` or `session.idle` waits there because
those events cannot carry text into the session. Held context lives in the
plugin process, so an OpenCode exit before the next tool result or message
loses it. The plugin never sets a `permission.ask` status, so
OpenCode's own approval prompt is left to the user. OpenCode raises no end of
session event, so `SessionEnd` is reported under `unavailable_hooks`. Resume
passes the recorded session as `--session ID`. Plugins in the user's global
`plugin/` directory are not carried into the overlay; project `.opencode/`
configuration still applies because OpenCode reads it from the worktree.

Credential profiles point a provider's config-home variable at a separate
directory so one provider can run under several accounts. Define one profile per
subscription; there is no limit besides the 32-participant project cap, and the
accounts need no relationship to each other. Sign in to each directory with the
native CLI once. Agent Parley stores directory paths and
variable names; it never stores tokens or keys, and rejects `--env` values whose
names look like credentials. A shell alias or wrapper function is not an
account: the launcher resolves a provider's executable on `PATH`, so an alias is
never seen, and a profile is the supported way to say the same thing.

### Notifications

The service and the launcher can forward the coordination changes an absent
operator waits on to a Telegram bot, an email address, or both. Email is
outbound only. The Telegram bot also carries status queries and decision
answers back once inbound is on, as described below; with inbound off, no
command arrives over the channel and a native permission prompt is answered
only in the lane's terminal. Settings come from the
environment or from `notify.json` in the state directory, which
`agent-parley notify setup` writes owner-only. No token or password is written
into coordination state or copied into a lane's environment.

```sh
agent-parley notify setup --chat 123456789
agent-parley notify setup --chat 123456789 --inbound
```

`notify setup` reads the Telegram bot token, and with `--inbound` the status
passcode, from a hidden prompt, or from standard input when it is not a
terminal. It never takes a secret as an argument and never prints one. A
variable set in the environment overrides the stored value for that process.
The running service reads inbound settings at start, so restart it after
storing them. `status`, `doctor` and `up` print one line saying whether
outbound and inbound are on and, when off, why.

| Variable | Meaning |
| --- | --- |
| `AGENT_PARLEY_NOTIFY` | Comma-separated transports: `telegram`, `email`, or both. Unset means notifications are off. |
| `AGENT_PARLEY_TELEGRAM_TOKEN` | Bot token. |
| `AGENT_PARLEY_TELEGRAM_CHAT` | Chat identifier the bot posts to. |
| `AGENT_PARLEY_SMTP_HOST` | SMTP server host. |
| `AGENT_PARLEY_SMTP_PORT` | SMTP port; 587 by default, 465 with implicit TLS. |
| `AGENT_PARLEY_SMTP_TLS` | `starttls` (default), `implicit` or `none`. |
| `AGENT_PARLEY_SMTP_USER` | SMTP user; omit it for a server that needs no login. |
| `AGENT_PARLEY_SMTP_PASSWORD` | SMTP password. |
| `AGENT_PARLEY_SMTP_FROM` | Sender address. |
| `AGENT_PARLEY_SMTP_TO` | Comma-separated recipients. |

```sh
export AGENT_PARLEY_NOTIFY=telegram,email
agent-parley notify test
agent-parley notify test --json
```

`notify test` sends one message on each configured transport and reports what
each one answered, so credentials are checked before a lane depends on them. It
exits 1 when any transport refuses.

These events notify, and nothing else:

| Event | When |
| --- | --- |
| `handoff_offered` | A handoff is offered to a lane. |
| `permission_prompt` | A lane is blocked on a native permission prompt. |
| `permission_denied` | A native permission layer, such as Claude Code's auto mode classifier, refused a lane's tool call without a prompt. |
| `native_dialog` | A lane is held by a native dialog the launcher escalated. |
| `lane_blocked` | A lane has stayed blocked (approval, prompt, dialog) for 30 minutes; sent once per block. |
| `lane_idle` | A lane is idle with no claim past the project's `stalled_after`. |
| `idle_blocker` | Other issues wait on a claim held by an idle lane. |
| `non_convergence` | An issue is escalated as not converging. |
| `key_hold` | A lane kept a key refused to a peer past its release deadline. |
| `run_budget_exhausted` | The enforced [run budget](#enforcing-a-run-budget) runs out. |
| `orphan_decision` | A dead lane spent its wake budget while holding orphaned claims; names the live peer that fits, or none, and moves nothing. |
| `run_finished` | A lane run finished. |
| `hook_refusal` | A lifecycle hook refused a branch switch or detected branch drift. |
| `inbound_locked` | Inbound status queries were locked after repeated wrong passcodes. |

Each event is sent once per situation: a digest of the fields that identify it
is kept per lane in private state, so an unchanged situation sends nothing
further. Sending never blocks a hook or a tool call.

Every situation that waits on the operator is also recorded as a decision in
`decisions.json` in the project's private state directory. A decision has a
stable twelve-character identifier, the options that answer it with one marked
recommended, whether acting on it can be undone, and an expiry a day out that
each repeat observation extends; one situation holds exactly one open decision.
The operator problems `problems` reports, such as a dirty worktree, an
unresolved completion or a second session, open decisions as well, and a
decision closes when its problem clears. Delivery is durable: a decision is
marked sent only after every transport accepted it, and a refused or abandoned
send is retried on the next supervision poll with a backoff that doubles from
30 seconds to an hour, so a hook that exits before its send finishes still
reaches the operator. Decisions due together go out as one digest; on Telegram
it carries one row of buttons per decision, and every transport shows the text
reply each takes. Decisions are recorded only while notifications are on, and
a record holds no credential.

The same Telegram bot can answer status queries. Set
`AGENT_PARLEY_INBOUND=telegram` and `AGENT_PARLEY_INBOUND_PASSCODE` to a
passcode of at least twelve characters; the bot token and chat identifier are
the outbound ones. The service long-polls the Bot API, so no port is opened and
no webhook is registered. A message must start with the passcode, come from the
configured chat, and carry `status` with the filters `agent-parley status`
takes; the reply is that reading.

The bot also takes answers to decisions. A tap on a decision's button is
admitted without a passcode, because only a member of the configured chat can
tap a button the bot posted there, and only for an open decision this state
root issued; a tap from any other chat is dropped. A typed answer is
`decide ID OPTION [NOTE]` after the passcode, or a reply to a message that
holds exactly one decision, starting with the option. The answer is recorded
under the decision lock, so of two answers racing the second is refused with
the option and the name of whoever answered first; an expired, closed or
unknown decision is refused the same way. An irreversible option records
nothing until a second `confirm` tap. The answered message is edited to say
which option was chosen, by whom and when, and keeps the other decisions'
buttons. The lane receives the answer as supervisor mail keyed by the
decision, so a repeat never duplicates it and the unread mail wakes the lane
on the next supervision poll; the lane then runs the matching command itself.
A note is quoted in that mail and labelled as not an instruction. Nothing
else crosses the channel: no claim, handoff, approval or free text is carried
out for a lane, and nothing is typed into a session except the option key of
a native dialog, described below. A message from another chat, or with a
wrong passcode, gets no reply. Five wrong passcodes inside ten
minutes lock the inbound path for an hour and send one `inbound_locked`
notification; the counter and the lock live only in memory. Only a salted hash
of the passcode is held, compared in constant time, and never written to state
or logs. The reader refuses to start when the passcode is unset or too short,
and `status` prints that fault on its `Inbound:` line and under `inbound` in
`status --json`.

A native dialog the launcher escalates, such as a tool permission prompt, a
hook trust review or the client's question picker, is recorded as a decision
offering the options the screen draws, less a question picker's free-text
option, since chat text is never typed into a lane. A permission or trust
prompt recommends its refusing option, and an option that widens a
permission, such as switching to auto mode or not asking again, takes the
same `confirm` tap as an irreversible one. The answer is not mailed: the
launcher re-reads the screen on its next pass and, only while it still draws
that same dialog, claims the answer under the decision lock and presses the
chosen option's digit, once. A screen that changed first retires the
decision as `stale`, so a later tap is refused and an answer already given is
never pressed on another dialog; the new screen is asked about afresh. A
prompt the launcher cannot read is sent as terminal-only and answered at the
lane's terminal. Nothing is ever answered on expiry.

A tool call a native permission layer refuses without drawing a prompt is
recorded as a `permission_denied` decision. Today that is Claude Code's auto
mode classifier: every Claude Code lane runs its hook on the
`PermissionDenied` event, which the `claude` CLI raises with the tool,
its input and the classifier's reason, such as `Interfere With Workloads` or
`CI Bypass`. No other adapter reports such a refusal to a hook yet. The
decision names the lane, the issue the lane has claimed, if any, the exact
refused command and the stated reason. It offers `run it yourself`, with the
command to run in the lane's worktree, `add a rule`, with a suggested
permission rule such as `Bash(git push:*)`, and, when the lane holds a claim,
`reassign` and `release`. The same refusal again, from the same lane on the
same claim with the same command, refreshes that decision instead of opening
a second one. While it is open the supervisor defers the lane's wakes under
`permission denied` rather than asking it for a turn that would meet the
same refusal; the answer reaches the lane as supervisor mail, like any other
answer, and the lane or the operator carries it out. The decision is
irreversible, so every option takes the `confirm` tap and no timeout ever
applies a default to it. Nothing retries, rewords or works around the
refused call, and the service never writes the suggested rule or any bypass
flag: adding the rule is the operator's edit to their own settings.

### Reclaiming landed lanes

Every lane owns a worktree in the private project state directory and a branch
in the repository, and both outlive the claim they were created for. The
service sweeps them at most once every 900 seconds, after the rest of a poll,
and `agent-parley gc` runs the same sweep on demand: without `--apply` it
reports what it would do, with `--apply` it removes what it may. The outcome
of the service's own sweep is published in `reclaim.json` in the project state
directory, so the next sweep is bounded even when one fails.

A lane is reclaimed only when every one of these holds: its worktree is a
registered worktree directly inside this project's state directory; no session
is running in it; the ledger records no claim it still owns; it has nothing
uncommitted; the base checkout's head already carries every commit on its
branch; its branch carries nothing its configured upstream lacks; its branch
has moved at all since the lane was created; and the forge reports the newest
pull request from that branch as merged, or, with no pull request to read, the
upstream no longer carries the branch. Removal is the ordinary retirement,
followed by `git branch -d`, which deletes the branch under Git's own
merged-branch rule and refuses otherwise.

Anything else is kept and reported with the one condition that held it, and
uncommitted files and unmerged or unpushed commits are reported by name. A
pull request closed without merging, an open one, an unreachable forge, a
worktree Git cannot inspect and a path outside the project's own lanes all
decide against reclaiming. The sweep never touches a remote branch, and it
never fails because the remote branch is already gone.

A lane that never did any work is retired too. When its runtime state reads
`stopped`, its branch is still at the project base, it has nothing
uncommitted, the ledger records no claim or pending offer for it, it holds no
reservation, and neither its last activity nor its worktree changed inside
`inactive_after`, the sweep retires it and reports `it stopped, holds no work
and never left the commit its lane was created from`. A lane whose worktree is
gone and that holds no claim, session, reservation or offer is dropped and
reported as `its worktree is gone and it holds no work`, which takes it out of
`status` and `top`. Retiring a lane supersedes the mail still
addressed to it, so no share bounces off a lane that no longer exists.

The lane sweep does not let a session that is alive but idle past
`inactive_after` hide the lane's real state. Such a lane is judged on every
other condition, so the report names what actually holds it, such as its
claim or its uncommitted files. A lane that would otherwise be reclaimed is
still kept, because no worktree is removed from under a live process, and
every such line names `agent-parley participant stop NAME` as the command
that ends the idle session.

Worktrees a lane made for itself, such as one per pull request, are swept in
the same pass and published under `worktrees` in `reclaim.json`. Every
worktree `git worktree list` reports is attributed to a lane by path, when it
sits inside a lane's worktree, or by branch, when its branch is the lane's
name or branch followed by `-` or `/`, such as `claude-pr-12`. One directly
inside the project state directory belongs to the project, and so does one
directly inside a project folder under the `agent-bridge` folder beside a
state root named `agent-parley`, such as `~/.local/state/agent-bridge`, where
lanes lived before the rename. One nested deeper, such as a worktree an
operator adds under a directory of their own, is the operator's. A worktree
nothing accounts for is reported with reason `no lane made it` and never
touched, even with `--force`.

An attributed worktree is removed with `git worktree remove` when it is not
locked, has no session running in its lane, has nothing uncommitted, and
every commit it holds beyond the base checkout is on its upstream; and then
only when its head is already on the base, its lane retired, or it has not
changed inside `inactive_after`. A registration whose directory is gone is
dropped. Its branch is kept. Uncommitted changes, unpushed commits and a
recent change keep it and are reported by name. `agent-parley gc --apply
--force` removes those too, but only after writing a recovery checkpoint
bundle of the whole worktree, index and untracked files included, to the
project's `recovery` folder; a checkpoint that fails removes nothing. A
worktree holding files Git ignores is kept with reason `it holds files Git
does not track elsewhere`, even with `--force`, because no checkpoint can
recover what was never tracked.

A worktree a lane made for itself whose unpushed commits already landed in the
base checkout through another branch, such as a squash merge or a cherry-pick,
is removed without `--force`. A lane's own worktree is not: it is still kept
while its branch holds unpushed commits. The sweep decides this with `git merge-tree --write-tree HEAD
<head>`: when merging the worktree's head into the base head leaves the base
tree unchanged, every change it holds is already there. The worktree must
still be clean, and quiet past `inactive_after` or belong to a retired lane.
It is reported with reason `its unpushed commits already landed in the base
checkout through another branch`, and it is removed with an ordinary
`git worktree remove` only after a recovery checkpoint bundle of it is
written, so its commits stay recoverable. A checkpoint that fails removes
nothing, and its branch is kept.

`agent-parley gc`, `gc --dry-run` and its alias `agent-parley reclaim`
without `--apply` add each worktree's size on disk.

Each sweep also records the project state directory's size and how many
worktrees a reclaim, and a forced reclaim, would still remove.
`agent-parley status` prints them under the project heading and carries them
as `reclaim` in its JSON document, reading the sweep's record instead of
walking the disk.

The same sweep prunes lane state that no longer serves anyone, and publishes
the file names it removed under `pruned` in `reclaim.json`. A retired lane
with no running session loses its `<name>-work.json`, `<name>-wake-work.json`,
`<name>-mcp.json` and `<name>-wake.log`. Its identity, activity, event and
report history, its `<name>-wake.json`, its `<name>-capacity.json`, which
lanes on the same account still read, and its lock files are kept. Any
`<name>-wake.log` unchanged for two days is removed too, because each wake
appends to it.

A lane whose session is not running still has its `<name>-work.json`
rewritten when its offers or checks change, but not when only its capacity
reading changes. A dead lane shares its capacity reading with every lane on
the same account, so a live peer's observations would otherwise rewrite the
dead lane's work file on every poll.

When the project root itself disappears, the first poll records
`root-missing.json` in the project state directory. One interval later every
lane still registered is captured for recovery, retired and has its
reservations revoked. The marker names, per lane, the claims released and the
checkpoint each one left, and the state directory for the operator to remove.
A lane whose session is still live is kept, and `agent-parley problems` names
it under `root missing` until its session ends. The project then leaves
`status`, `top` and `metrics`; a root that returns clears the marker on the next poll. When the service starts, it
removes every wake socket in its home that no launcher is listening on.

## Other agent CLIs

Agent Parley hands the native CLI its MCP server, the coordination prompt and
its lifecycle hooks at launch. Six contracts implement that, and `--adapter`
names the one to use:

| Adapter | MCP server | Coordination prompt | Hooks |
| --- | --- | --- | --- |
| `claude` | `--mcp-config FILE` | `--append-system-prompt TEXT` | `--settings '{"hooks":…}'` |
| `codex` | `-c mcp_servers.agent_parley.url=…` | appended to the prompt argument | `-c hooks.EVENT=…` |
| `copilot` | `mcp-config.json` in the lane's `COPILOT_HOME` | prepended to the `-p` argument | `hooks` in `settings.json` there |
| `gemini` | `mcpServers` in the lane-private system settings overlay | prepended to `--prompt-interactive` | `hooks` in that overlay, `--adapter gemini` |
| `opencode` | `mcp` in the lane-private `opencode.json` | prepended to `--prompt` | `plugin/agent-parley.js` in the lane-private directory, `--adapter opencode` |
| `amp` | `amp.mcpServers` in the lane-private `settings.json` | prepended to the prompt argument after `--settings-file` | `amp.hooks` in that file, `--adapter amp` |

`agent-parley provider list` prints `unavailable_hooks` for every definition,
naming the shared events that adapter's CLI cannot raise. A launch refuses an
adapter that cannot deliver `SessionStart`, `PreToolUse` or `Stop`, with the
missing events named, rather than starting a lane whose branch, claim and
turn guards would silently never run.

The same listing prints `delivery`, naming how coordination reaches a lane
driven by that adapter. `hooks` means a native lifecycle event carries mail,
handoff notices, operator edits and reservation state into the session at a
turn boundary, which is every adapter that raises `SessionStart`,
`UserPromptSubmit`, `PreToolUse` and `Stop`. `polled` means the adapter is
missing at least one of those, so the launcher runs a delivery thread beside
that session instead: it reads the same mailbox the served checkpoint reads,
on the interval `AGENT_PARLEY_DELIVERY_SECONDS` sets (20s by default, clamped
to 0.05s-600s), and publishes what is undelivered into
`STATE/projects/PROJECT_KEY/NAME-delivery.md`, which is lane-private and
outside the target repository. The lane's coordination prompt names that file and tells
it to read it at every turn; a file that cannot be written falls back to a
notice on the launcher's terminal. Each delivery is written to the same
participant event log a served checkpoint records into, under the reason
class `polled_delivery`, so `agent-parley top` counts its bytes in `CONTEXT`
like any other lane's.

Each delivery appends a batch headed `## Batch N, written <UTC time>`, and
delivery never marks mail read, because the lane may not have read the file
yet. A batch stays while any message it carried is unread and leaves once the
lane calls `mark_message_read` for all of them; a batch without mail stays
only until a newer one is written, and at most eight are kept. A quiet
interval drops read batches and removes the file once none remain, so a lane
tells a new batch from one it already read by its number.

Polled delivery is delivery, never enforcement. It cannot deny a tool call,
cannot hold a turn open, and reaches the lane only as text that lane has to
read, so an adapter missing a required guard is still refused at launch. It
carries no budget threshold notice, it never advances a paused lane's mail,
and it is bounded by the same context budget the hook path uses, so a large
batch of mail arrives over several intervals.

A provider's `--executable` therefore has to accept every argument of the
contract its adapter names. The `copilot` adapter is the file-configured one:
Copilot CLI reads MCP servers and hooks from its configuration directory rather
than from arguments, so Agent Parley writes both files into the directory
`COPILOT_HOME` selects. That directory also holds the client's own
authentication, and user-level hooks there apply to every session started from
it, so a `copilot` participant requires a credential profile and the launcher
refuses one without a profile instead of writing lane hooks into the directory
your own Copilot sessions use. Sign in to that directory once, as with any
other profile.

Copilot CLI chooses its hook payload format from the case of the configured
event name. A camelCase name such as `preToolUse` delivers camelCase fields
(`sessionId`, `toolName`, `toolArgs`); a PascalCase name such as `PreToolUse`
delivers the compatible snake_case fields (`session_id`, `hook_event_name`,
`tool_input`) that the shared checkpoint parser reads. Lane hooks are registered
under the PascalCase names for that reason, and the hook command carries
`--adapter copilot`. Copilot reads `permissionDecision`,
`permissionDecisionReason` and `additionalContext` at the top level of a hook
result rather than inside `hookSpecificOutput`, so the adapter flattens the
shared output into those fields. It never answers a native approval prompt and
never grants a permission Copilot refused.

A relaunch appends no duplicate hook; `participant retire` removes only that
lane's hook entries from the profile's `settings.json`, leaves the operator's
own and other lanes' entries in place, and drops the `agent_parley` server
from `mcp-config.json` once no lane hook remains. A lane that crashed leaves
its entries until it is relaunched or retired; they point only at that lane's
private state.

### Stub verification and live trials

Every adapter's launch path and hook wire contract is verified by tests that
run the real launcher against a stub executable, read the configuration the
launcher generated, register through the local MCP service and run the exact
configured hook command with native-format payloads, covering session
identity, denial output, approval requests and resume without a recorded
session. That verifies argument handling, file handling and hook translation.
It does not verify live model behaviour, and the following points need a live
trial with the native CLI installed and signed in:

| CLI | Verified against a stub | Needs a live trial |
| --- | --- | --- |
| Gemini CLI | overlay contents, `GEMINI_CLI_SYSTEM_SETTINGS_PATH` selection, every `hooks` event runs the command, denial and context schema | that Gemini honours `decision: deny` from a `BeforeTool` hook in a system overlay, and `--resume ID` |
| Copilot CLI | `mcp-config.json` and `settings.json` merge, PascalCase event payloads, flat result schema, retire cleanup | that a `PreToolUse` `permissionDecision: deny` stops the tool, and `--resume ID`; #173 tracks the payload contract |
| OpenCode | `opencode.json` copy and `mcp` entry, plugin file and its embedded command, event and tool-name translation, `--session ID` on resume | that OpenCode loads `plugin/agent-parley.js` from `OPENCODE_CONFIG_DIR`, that `{env:AGENT_PARLEY_TOKEN}` is substituted in `headers`, that a thrown error in `tool.execute.before` refuses the call, and that `client.session.prompt` delivers a blocked-stop reason |
| Amp | `settings.json` copy, `amp.mcpServers` entry with the literal bearer token, one `amp.hooks` entry per tool event and its command, field and event translation, `reject` on refusal, `threads continue ID` on resume, retire cleanup, the required-guard refusal | that Amp accepts `--settings-file` with a prompt argument, that `amp.hooks` entries with `event`, `command` and `args` run around tool calls and read `{"action":"reject","reason":…}` from stdout, the input field names for the tool, its input and the thread, that a remote `amp.mcpServers` entry honours `headers`, and that no thread start or idle hook exists; the `amp` lane stays refused until that last point is disproved |

Record the outcome of a live trial in the issue that requested it, with the
CLI version, and file a gap as its own issue. Operator recovery after a lane
loses its session is #153 and saved-session recovery is #175; both apply to
every adapter, since each one records the native session identifier the same
way through `SessionStart`, or through the first tool hook for `amp`, whose
thread identifier arrives with every tool event.

The `amp` preset starts the native Amp CLI. Amp reads one `settings.json`,
from `~/.config/amp` or the file `AMP_SETTINGS_FILE` or `--settings-file`
names, holding MCP servers under `amp.mcpServers` and hook commands under
`amp.hooks`; a credential profile may point `AMP_SETTINGS_FILE` at the file,
or the directory holding it, that is copied. The launcher copies it to
`<participant>-amp-settings.json` under the private state root, adds the
lane's server with its bearer header written literally, since Amp substitutes
no environment references in settings and the identity file beside it already
holds the token, appends one hook per supported event, and passes the copy
with `--settings-file` for that launch only. Every other key is carried
unchanged and the source file is never written; Amp keeps its credentials in
its own store, so authentication is untouched. Settings that already define
`agent_parley` refuse the launch. The overlay is rebuilt on every launch and
removed by `participant retire`, so a stale copy left by a crash is replaced.

Amp's hooks fire around tool execution only: `tool:pre-execute` maps to
`PreToolUse` and `tool:post-execute` to `PostToolUse`, each spawning the hook
command with `--adapter amp`. `amp.py` reads the tool name, input, result
and thread identifier under Amp's field names and flattens a refusal to
`{"action": "reject", "reason": …}`; any other result is an empty object, so
the hook never allows a call on the lane's behalf and Amp's own approval
prompt decides. Amp raises no thread start, prompt, approval, idle or end
event, so `SessionStart`, `UserPromptSubmit`, `PermissionRequest`, `Stop` and
`SessionEnd` are reported under `unavailable_hooks`, and because two of
those are required guards, `agent-parley run amp` is refused with one
sentence naming them rather than started without branch and turn guards. Its
`delivery` therefore reads `polled`: the moment Amp raises those two events,
that lane launches and its mail arrives on the delivery interval rather than
at a turn boundary, because the events that would carry it are still absent.
Resume passes the recorded thread as `threads continue ID`; the thread is
recorded from the first tool hook, so a lane that never reached a tool call
has no session to resume and the launcher says so.

| Agent CLI | MCP configuration | Lifecycle hooks | Per-account config home |
| --- | --- | --- | --- |
| Gemini CLI | lane-private system settings overlay | translated native hooks | `GEMINI_CLI_HOME` |
| Copilot CLI | `$COPILOT_HOME/mcp-config.json`, or `copilot mcp` | `hooks` in `$COPILOT_HOME/settings.json` | `COPILOT_HOME` |
| OpenCode | `mcp` in the lane-private `opencode.json` | `plugin/agent-parley.js` spawning the hook command | `OPENCODE_CONFIG_DIR` |
| Amp | `amp.mcpServers` in the lane-private `settings.json` | `amp.hooks` in that file, tool events only | `AMP_SETTINGS_FILE` |

Copilot CLI, Gemini CLI, OpenCode and Amp have native adapters. Amp does
not accept `--append-system-prompt`, and its settings arrive through
`--settings-file` rather than `--settings`, so naming it as a `claude`
provider executable still fails; use the `amp` preset.

## Recovery and teardown

```sh
agent-parley status
agent-parley participant restore claude-1
agent-parley participant merge claude-1
agent-parley participant pr claude-1
agent-parley participant retire claude-1
```

A lane that ends a session on the wrong branch, or on a detached HEAD, blocks
only its own participant; every other lane still launches. `status` prints the
actual branch whenever it differs from the assigned one. A rebase of the lane's
own branch is not drift: Git detaches HEAD while it runs, but both
`git rebase --continue` and `git rebase --abort` end on the assigned branch, so
the lane keeps its tools and is only asked to finish or abort before ending
the turn.

When `run` finds the lane's session lock held by a live launcher, it names the
launcher and client processes, when the session started and its last activity,
and prints `agent-parley participant stop <lane>`. That session may have been
resumed by the service with no terminal attached, so retrying cannot succeed
until it ends. After `participant stop`, the service does not wake or resume
that lane, so the operator's own `run` takes the lock. The next launch of the
lane, by any path, lifts that hold.

`participant restore` returns one lane to its bridge branch. It refuses while
that participant has a running session, refuses on an uncommitted change, and
refuses when the current branch holds commits the bridge branch does not,
printing the command that keeps them. It never resets, cleans, stashes, or
force-switches, so no committed or uncommitted work is discarded.

### Exporting and importing the state directory

```sh
agent-parley state export --output parley-2026-09-15.tar.gz
agent-parley state export --output one-project.tar.gz --project ~/src/app
agent-parley state show parley-2026-09-15.tar.gz
agent-parley state import parley-2026-09-15.tar.gz
agent-parley state import one-project.tar.gz --merge --project ~/src/app
```

`state export` writes the coordination state as one tar archive. The store is
copied through the SQLite backup interface while the setup and ledger locks of
every exported project are held for at most two seconds, so the snapshot, the
project manifests, the issue ledgers, the activity files, the retained event
and report logs and the attachments describe one moment; an export that cannot
take those locks in time is refused rather than written inconsistently.
`--project ROOT` exports one registered project alone, including only its rows
of the store. The archive manifest names the store schema, the export time,
the SHA-256 digest of every member, the projects and their participants.

Credentials never leave the state directory. Registration tokens are stripped
from the identity records, their digests are cleared in the exported store,
and credential profiles and native MCP configurations are not archived; the
manifest states the omission. `state show PATH` prints the projects,
participants, issue counts and export time from that manifest without
restoring anything.

`state import PATH` restores into an empty state directory and refuses one
that already holds a store or a project unless `--merge` is given. Before it
writes, it validates every member against the manifest digests, refuses an
absolute path, a `..` component, a symbolic link or a hard link, and refuses
an archive written at a newer store schema than this build reads. The archive
is unpacked into a temporary directory inside the state root, migrated to
this build's schema there, and moved into place only after that validation.
With `--merge`, a project the directory does not hold is added beside the
existing ones; a project that already exists is a collision, so the import
refuses it and leaves the directory as it was. `--project ROOT` restores one
archived project alone.

Every imported participant registers again on its next `run`, because the
archive carries no credential. The import then lists every participant whose
lane path does not exist on this machine. Those lanes are not recreated: the
operator adds the worktree again, on the recorded branch, before launching
that participant.

### Lane branches and attribution

A lane branch carries no participant, provider or account name. It is created as
`PREFIX/PROJECT_KEY/lane-N`, where `PREFIX` defaults to `parley`, `PROJECT_KEY`
is the private project key, and `N` is the next free lane ordinal. Which
provider drives a lane belongs in coordination state, where `top`, `status` and
`participant list` read it; it does not belong in your Git history or on your
forge. The prefix is per project:

```sh
agent-parley branch show
agent-parley branch set work
```

Changing the prefix renames nothing. Lanes created before the neutral scheme
keep the branch they were created with until they are retired, and the manifest
records which scheme each lane uses, so `participant merge`, `participant pr`
and drift detection keep working across the change. A branch name that already
exists in the repository only moves the ordinal on: nothing is renamed, reused
or deleted.

### What the lifecycle hooks refuse

The hooks refuse tool use, never a prompt. A refused prompt would reach you, not
the agent, and lock you out of your own session. So when a lane is paused, its
session generation was fenced by a takeover, its branch drifted, its shell `cd`
left the worktree, or the decision itself failed, the prompt goes through and the
reason reaches the agent as context on it. The same causes still deny a tool
call.

A hook payload that cannot be decided, one past 1,000,000 bytes such as a
`Write` of a large file or one that is not a JSON hook object, is allowed and
recorded as `oversize_payload` or `unreadable_payload` in the lane's event log,
because a denial would refuse the same call on every retry.

A lane whose shell cwd left its worktree is told on its next prompt to run
`cd LANE` before any tool work, and every tool call from outside is denied with
that same instruction. The one call it may still make is a shell command whose first
step is a bare `cd` into the lane or a directory inside it, so the agent can
return without your help; `cd /elsewhere && cd LANE` stays denied.

### Selecting the forge

Issue titles, assignee mirrors and report comments go to the forge the project
manifest records. Registration detects it: a repository carrying a Beads ledger
in `.beads/` selects `beads`, any other selects `github`. The choice is per
project and can be set by hand:

```sh
agent-parley forge show
agent-parley forge set beads
agent-parley forge set null
```

`github` speaks through your own `gh` login. `beads` speaks through the `bd`
CLI: `bd show ID --json` for titles, `bd update ID --assignee` for the claim
and release mirrors, and `bd comment` for reports. `null` keeps issue numbers
bare, calls nothing and never fails. Every forge exchange stays best effort:
the ledger is written first and decides ownership, and a forge that is missing,
offline or unwilling changes nothing. Only `github` opens pull requests, so
`participant pr` refuses in one sentence under `beads` or `null` before it
pushes anything.

Attribution is refused everywhere a lane can publish text, on every repository,
for every provider, with no flag that turns it off:

- **Denied before it lands.** The same hook that refuses a branch switch inside
  an assigned lane denies `git commit`, `git commit --amend`, `git merge`,
  `git tag -m`, `git revert -m` and `gh pr create` whose message, title or body
  claims assistant authorship: a co-author trailer naming an assistant,
  "generated", "written", "created", "authored", "assisted" or "powered" by a
  named assistant, a vendor or model name in an authorship position, or a
  generator signature. Each denial names the enumerated rule it broke, lands in
  that lane's event log, and counts under `DENIALS` in `top`.
- **Refused at integration.** A hook is a tool-level check and a session can
  reach Git another way, so `participant merge`, `merge --preview` and
  `participant pr` scan every commit the lane would integrate — subject, body
  and trailers — and refuse with the offending commit named. `participant pr`
  refuses before it pushes, so a refusal leaves no remote branch behind. This
  is the backstop, and it has no skip flag in the same way the verification
  gate has none.
- **Clean output from the product itself.** The merge commit names the branch
  rather than the participant, and the comment a `ready` report posts on a
  claimed issue reports the result without naming the lane or its provider. The
  pull-request body carries the lane's own summary, evidence and issue
  references and no authorship claim.

Detection is textual and deliberately narrow: it matches authorship claims and
authorship positions, so "fix the codex adapter" is ordinary work while "written
by" an assistant is refused. A message supplied through a file rather than the
command line is not visible to the hook; the integration scan still reads the
commit it produced. Rewriting history you already have is out of scope: a
pre-existing commit carrying a trailer is reported at merge, never amended for
you.

`participant merge` integrates one lane's branch into the base checkout. It
always runs in the repository's main worktree, never inside another lane, and
always records a merge commit, so the integration stays visible in history. It
refuses while that participant has a running session, while the lane has left
its assigned branch, while the base checkout is dirty, already merging, or on a
detached HEAD, and while the lane holds uncommitted changes the branch does not
carry. On a conflict it names the conflicting paths and leaves the merge in
progress in the base checkout for you to finish with `git merge --continue` or
undo with `git merge --abort`; it never resolves a conflict, and never resets,
cleans, stashes, or force-switches. A successful merge leaves the lane and its
branch exactly as they were, so retiring the participant stays a separate step.
When the lane holds several claims, `--issue N` names the one whose work is
merged; without it the lane's only ready claim is used.

`participant merge --preview` answers what that merge would do without doing it:

```sh
agent-parley participant merge claude-1 --preview
```

`--preview` reports what that merge would bring in and what would refuse it,
and changes nothing: no merge commit, no branch movement, no working-tree or
index change, and no coordination state. It lists the commits the base does not
have, the files they change relative to the merge base, and every refusal
gathered into one report rather than raised one at a time. It never takes the
participant's session lock, so it is safe to run while that lane is still
working; a running session is read from the recorded session process and named
as a blocker. Because it attempts no merge, a preview that names no blocker
says only that nothing refuses the merge right now, not that the merge would
apply without conflicts. A preview prints no roster listing, unlike the actions
that change one.

A repository can require one verification command to pass before any merge:

```sh
agent-parley verify show
agent-parley verify set 'make check'
agent-parley verify set ''
```

`verify set` records that command in the repository's project manifest, beside
the roster and outside the target source tree, and `verify show` reports what is
required. A repository with nothing configured runs no gate and merges exactly
as before. With a command configured, `participant merge` runs it in the base
checkout before merging and refuses on a non-zero exit, reporting the exit
status; the command's own output goes straight to the terminal and is not
captured. A command that cannot run is a refusal, not a skip. After the merge
the command runs again on the merged commit. A failure there keeps the merge
commit, nothing is reset or reverted, and the base is recorded as carrying an
unverified integration that holds every further merge until it is repaired, as
described in
[Recovering an unverified integration](#recovering-an-unverified-integration).
The command is stored as argument tokens and run without a shell, so
redirection, expansion and chaining cannot ride into a gate, and no flag skips
it. Removing it is an explicit `verify set ''`. `--preview` never runs it,
because executing a configured command is a different decision from reading
Git state. `verify set` runs only from an operator shell in the base checkout:
it refuses inside an assigned worktree and in any process holding a lane's
`AGENT_PARLEY_TOKEN`, so a lane cannot replace or clear the gate its own merge
has to pass. `verify show` stays readable from a lane.

## Requiring a recorded approval

A repository can require your own recorded decision before either command that
carries a lane's work out of its worktree:

```sh
agent-parley approval show
agent-parley approval set merge pr
agent-parley approval set
agent-parley approve claude-1
agent-parley reject claude-1 'Needs a test for the retry path'
```

`approval set` records the requirement in the project manifest beside the
roster, outside the target source tree, and takes any of `merge`, `pr`, both,
or nothing at all. A repository with nothing required integrates exactly as
before. Like `verify set`, it refuses inside an assigned worktree and in any
process holding a lane's `AGENT_PARLEY_TOKEN`, so a lane cannot lift the
requirement on its own work; `approval show` stays readable from a lane.

With a step required, `participant merge` and `participant pr` refuse until a
decision for that lane's current ready report is recorded, and the refusal
names the report and the `agent-parley approve NAME` that grants it. `approve`
and `reject` refuse inside an assigned worktree and in any process holding a
lane's `AGENT_PARLEY_TOKEN`, so a lane cannot decide its own work. The
decision is bound to the identifier of that report, the exact commit the lane
branch points at, the branch and base it targets, the repository root, and a
digest of the verification command, the pull-request policy and the approval
requirement in force. Anything in that binding changing invalidates the
decision, so new commits invalidate it even when the lane never reports again,
and the refusal says which of those changed. The binding is read again
immediately before the merge or the push, while the lane's session exclusion is
held, so an approval recorded for earlier commits cannot carry a later head
into the base repository or the forge. A decision log that cannot be read, or
that holds a damaged record, refuses integration rather than treating the
missing decision as consent.

`reject` requires a reason, records it, and delivers it to the lane as operator
mail. It gates nothing else: the lane keeps its session, its claims and its
work, and can go on committing. Only these two commands are refused, and only
until a further decision is recorded.

Both commands run from the base checkout and refuse to run inside an assigned
worktree or with a lane's `AGENT_PARLEY_TOKEN` set, even after changing
directory to the base checkout, so no lane records the approval of its own work
through them. That is
this tool's command-line boundary, not an operating-system one: a program
running under your account can write coordination state directly. Separate the
operator from the lanes as different operating-system users, or in different
containers, when that distinction has to hold. The decision also records that a
named local account decided, not that the code is correct. The verification
command, the attribution scan and GitHub's own checks all still run unchanged.

`status` prints `awaiting approval`, `approved` or `rejected` beside a lane's
ready report, naming what invalidated an earlier decision; `top` counts the
lanes awaiting one in its header; and
`history participant NAME --kind approval` lists the decisions, their
operator and their reasons with the rest of the chain.

Four commands drive a lane's life from the base checkout, and every one of them
writes an event so `top` and `events export` show what the operator did and when.

`participant pause NAME` and `participant resume NAME` change whether a lane may
act. A paused lane keeps its session, its claims and its reservations: pausing is
not a handoff and releases nothing. Every served coordination call from that lane
is refused at the service boundary with an enumerated reason naming the operator,
the lifecycle hooks refuse tool use with that same reason, and `top` reports
`paused` in `STATE`. Resuming clears the flag and nothing else. Pausing a lane
that is already paused reports that and changes nothing.

`participant stop NAME` ends the session from outside its terminal. It signals
the recorded session process exactly as a normal exit signals it and waits a
bounded time for it to leave. It mails the lane no notice: the session is gone
before it could read one, so the mail would only reach the next session as an
instruction to end. A process that
ignores that signal, such as a client wedged in a native dialog or left behind by
a system hang, is sent `SIGKILL` through the same pinned identity. The session
record is cleared only once the process is verified gone; a process that
survives both signals is reported and its record kept. Identity is the
recorded process ID together with its kernel creation time, checked before
signalling and again inside the platform's terminate step, so a recycled process
ID is never signalled. The command-line check that recognizes the coordination
server does not apply here, because a lane runs a native client rather than this
package. Claims and reservations stay owned and the command prints what the lane
still holds, so an operator moves that work deliberately. A stop that finds no
running session is still recorded.

`participant restart NAME` starts a lane again. It refuses while a current
session is alive, because two clients in one worktree would fight over it. A
session whose process is alive but whose evidence is older than
`inactive_after` is a wedged client and is ended first through the same
escalating stop. It refuses a lane that is not on its assigned branch. A dirty
worktree is what a crash leaves behind, so it is not refused: every claim the
lane owns is captured into a recovery checkpoint, the files stay exactly where
they are, and the new session's opening task names the checkpoints. Nothing here
resets, cleans, stashes or force-switches. It replays the recorded lane
initialization command when one exists, then launches the same provider and
credential profile as the previous run.

After a host restart every recorded session is dead, even when its process ID
now names an unrelated process. The supervision loop records the host's boot
identifier in the project state directory; when it changes, each lane with a
recorded session has its state record moved to `stopped` with the restart as
its evidence, and is published as stopped and marked with the session the
restart ended. That lane is never resumed or signalled, its claims move
through the orphan path, `participant stop` reports no verified session, and
`participant restart` launches it without hand edits to the state directory.

These are command-line actions only. No MCP tool exposes them, so a participant
cannot pause, stop or restart itself or a peer.

A repository can also record one command that prepares every new lane:

```sh
agent-parley init show
agent-parley init set 'uv sync --locked'
agent-parley init set ''
```

`init set` records that command in the same project manifest, outside the target
source tree, and `init show` reports it. Like `verify set`, `init set` refuses
inside an assigned worktree and in any process holding a lane's
`AGENT_PARLEY_TOKEN`, so a lane cannot change what its peers run. A repository with nothing configured
hands the native CLI a bare worktree exactly as before. With a command
configured, the launcher runs it in the new worktree after `git worktree add`
and before the native CLI starts, so dependencies, an untracked environment
file or a warmed build are in place for the agent's first turn rather than
costing it several. `participant add` runs it on the same path, because both
create a lane through the same step.

The command is stored as argument tokens and run without a shell, like the
verification gate, and no flag skips it. It runs only at lane creation, never on
a resume, so a resumed session does not repeat setup. `AGENT_PARLEY_BASE` names
the base checkout while it runs, which is how a command copies a file Git does
not track. A non-zero exit refuses the launch and reports the exit status with
the last twenty lines of the combined output; a command that cannot run at all is
a refusal, not a skip. The worktree is left in place in both cases, because an
operator needs to inspect what the command did before it failed. The participant
is not registered in the roster, so correcting the command and rerunning starts
from the same point.

`participant pr` pushes one lane's bridge branch to `origin` and opens a pull
request for it. The body is the lane's own recorded report: its summary, its
verification evidence and its remaining work, under the three headings the
repository's pull-request template asks for, followed by an explicit `Refs #N`
for every issue the lane still claims. The title is the first commit the lane
added, so it already follows the target repository's commit rules, and the base
is the branch the main checkout has out. Authentication is the native `gh` CLI's
own: Agent Parley stores no token and adds no flag that bypasses a repository
rule. It refuses when the repository has no project, when the participant is
unknown, when no report is on file, when the lane claims no issue, when the
branch adds no commits to the project base, and when the main checkout is on a
detached HEAD or on the lane's own branch. A pull request already open for that
branch is reported rather than duplicated, and its branch is still updated by
the push. Pushing to `origin` happens only here; `status` never reaches a
remote.

Your native GitHub account becomes the assignee. Labels and milestone are read
from claimed issues before pushing. Unlabelled issues are supported; a project
can require classification explicitly. The private `project.json` accepts a
`pull_request` object with these optional settings:

```json
{
  "pull_request": {
    "change_type_labels": ["bug", "enhancement"],
    "require_label": false,
    "milestone": "match",
    "body_template": "## Review checklist\n\n- [ ] Reviewed",
    "self_service": false
  }
}
```

The default label vocabulary remains the shipped eight change types.
`milestone` accepts `match` (reject conflicting milestones), `required` (every
issue must also have one), or `ignore`. With no configured body template, the
launcher reads the target repository's PR template when present. The report and
issue references are always included; optional `$summary`, `$evidence`,
`$remaining`, `$outcome` and `$issues` placeholders are expanded as text.

The PR also carries independently recorded evidence: the configured command is
executed in the lane, denials are counted by reason within the current claim
window, and advisory reservation history and recorded conflicts are summarized.
A failed gate, active session, dirty lane or changed commit refuses integration.
No gate and no recorded denials are stated explicitly. A JSON evidence snapshot
and a JSON Lines event slice are written beside the lane in private project
state. The body names the slice and its SHA-256 digest; it is not uploaded or
committed automatically. Counts cover retained observations, so missing or expired
records cannot prove that no event occurred. Older logs did not distinguish
reservation conflicts from successful calls.

`self_service` is the repository's standing authorization for a lane to run
`participant pr` for its own work from its own worktree. It is `false` unless
the project sets it, and with it off nothing changes: `participant pr` stays an
operator command that excludes a live lane session. With it on, that one
command, run inside the lane it names, is admitted while every condition holds:
the lane reported `ready`, the project configures a verification command, the
lane still sits on its assigned branch, and no peer holds an advisory
reservation over a path the branch changed. The gate itself still runs in the
lane during the push, so the pull request is opened after a green gate and not
merely after a claim of one. A condition that does not hold refuses the command
and names that condition; unreadable reservation state is a refusal too, since
it rules no overlap out. Advisory reservations stay advisory: an overlap
withholds this unattended step, it does not deny anyone access to a file.

A self-opened pull request carries what authorized it. The recorded review
evidence names the policy, the participant, the gate command, how many changed
paths were cleared, the peers holding reservations at the time, and the branch,
both in the pull-request body and in the integration record kept in private
project state. `participant merge` remains operator-only under every setting,
and authentication is still the native `gh` CLI's own, with no added flag.

A project can separately authorize unattended integration of named issues.
From the base checkout, never from a lane:

```bash
agent-parley unattended set 42 43 --target main
agent-parley unattended show
agent-parley unattended run claude-1
agent-parley unattended set          # remove it; operator-only again
```

The policy is stored in `project.json` as
`"integration": {"unattended": {"target": "main", "issues": ["42", "43"]}}`.
Without it, which is every existing project, integration stays operator-only
and `unattended run` refuses. An invalid policy refuses too, naming what is
wrong, and the rest of the project keeps working. No served coordination tool
can set or widen it. `set` and `run` refuse lane shells: inside an assigned
worktree, or with a lane's `AGENT_PARLEY_TOKEN` in the environment even after
changing directory to the base checkout. Like `approve`, that is a
command-line boundary, not an OS-level one; when a lane must be unable to act
as the operator, run lanes under a separate OS account.

`unattended run NAME` merges the lane only when its claimed issue is listed,
its claim generation is current, it is reported ready at the commit the lane
still sits on, the base checkout is on the target branch, its dependencies are
verified complete, a verification command is configured, and no peer
reservation covers a changed path. `--issue N` picks the claim when the lane
holds several; without it the lane's only ready claim is used. The merge itself is the `participant merge`
step, with the same locks, approvals and gates, so a concurrent attempt is
refused as busy. Each attempt records a decision in the lane's report log with
the claim generation, source and target commits, gate and outcome; a refusal
says which condition failed and what resolves it, and a gate or merge failure
is recorded as `failed` beside the merge step's integration recovery record,
and an input it cannot read is a refusal. While the base carries an unverified
integration, `unattended run` refuses and never repairs it; repair stays with
the lane that owns it or the operator.
If the claim or ready commit changes between the check and the merge, nothing
is merged. Running it again after a recorded integration merges nothing; an
earlier integration never stands in for a different issue, claim or commit.
It never pushes and makes no forge calls: forge checks and reviews are enforced
when you push the target branch, not at the local merge, and each decision
records `forge: "deferred to push"`. The supervision service does not
dispatch it automatically.

`participant retire` removes one lane: it refuses while a session is running,
the worktree is dirty or the lane holds ready work awaiting integration, then
returns the lane's issue claims to the pool, releases its advisory
reservations and grants any key a peer was queued for, marks mail it has not
read or acknowledged as superseded, removes the worktree, invalidates that
participant's coordination credential, and drops its manifest entry. Removing
the worktree deletes its ignored files, such as a local `.env` or build
output, so retire lists them and asks first; `--yes` answers in advance, and a
declined or unanswered question retires nothing and exits non-zero.
`gc --apply` reclaims
only lanes whose work has already landed, so it removes their ignored files
without asking. The branch is deleted
only when it adds no commits to the project base; otherwise the branch is kept
and named in the output. Message history is always preserved, so past handoffs
still resolve their sender.

A lane can also retire itself, which is the path to take when the lane is
finished rather than abandoned. The `retire` MCP tool releases the issues that
lane holds, declines the handoffs offered to it and tells each lane that had
handed it work, releases its advisory reservations and grants any key a peer was
queued for, removes its worktree when Git reports it clean, and invalidates its
credential. Unlike `participant retire` it keeps the manifest entry, marked with
the time it retired: `status` and `top` show the lane as `retired AGE ago`, the
JSON views carry `retired_at`, and the service neither wakes it nor names it in
a work offer. A lane whose worktree is dirty, or holds files Git ignores such
as a local `.env`, keeps it, and those paths are reported in the tool result;
no confirmation is asked, so ignored files are never deleted this way. A lane that holds ready work, or a claim blocked
on anything but another issue, is refused before anything is released, naming
those issues: ready work stays claimed until `agent-parley participant merge
NAME` lands it or the lane offers it to a peer, and an operator-blocked claim
stays with the lane that recorded it until that lane offers it or releases it
with `issue release` on purpose. The service's work offer says the same
instead of telling such a lane to retire. The session that retired keeps its
native tools: the hook allows every call, decides nothing, and tells the
session start and each prompt once that the lane retired, naming the
re-admit command. Return that lane to service with the same
`participant add NAME` command that created it, which restores its worktree on
its own branch; the next launch registers a fresh credential.

Mutations and reports run from the assigned lane. The owner pauses offered work
until acceptance, decline, or cancellation. Use `issue decline`, `issue cancel`,
and `issue release` explicitly; release does not close a GitHub issue. Partial or
blocked reports require `--remaining` instead of `--evidence`, and `--backlog`
states how many units of work the claim still has left.

`up` starts the detached service; `down` stops its verified process and retains
state. Default state is `~/.local/state/agent-parley`, mode 0700. Logs are in
`server.log`, with the previous window in `server.log.1`; repeated per-lane
`undecided`, `unanswered` and `unrecovered` entries are coalesced to one per
minute, and the next entry carries the count it skipped. Set
`AGENT_PARLEY_HOME` or pass `--home` for another private root.
Set `AGENT_PARLEY_PORT` before first initialization to override port 8876.

`server.json` names a service that answered: `up` publishes it only once the
new process reports itself ready, and removes a record left by a process that
is gone. A start that fails, on an occupied port or a process not ready within
25 seconds, publishes a record with `state: failed`, `failed_at` and the count
of consecutive `failures`, which names no process. A lane launch runs `up`
first, so a lane never starts against a service that is not there, and a hook
that falls back to the in-process decision asks for the service back when the
recorded one has gone or failed, never waiting for the answer. It asks at most
once a minute, and after repeated failed starts the wait doubles per failure
up to 16 minutes. A relaunch stamp dated in the future, as a backward clock
step leaves, does not hold the next request off. A machine that has never started a service is left alone: the first start
belongs to the launch or to the operator.

### Decisions that apply their default on timeout

A question nobody answers should not hold a lane when the choice is
reversible and has an obvious answer. Every decision kind is declared once, in
`agent_parley/timeouts.py`, with its class, its recommended option and the
command that undoes that option:

| Kind | Class | Default | Timeout | Undo |
| --- | --- | --- | --- | --- |
| `orphan_claim` | reversible | reassign a dead lane's orphaned claim | 30 minutes | `agent-parley issue assign ISSUE LANE` |
| `closed_claim` | reversible | resolve a claim whose issue a merged pull request closed | 30 minutes | `agent-parley issue assign ISSUE LANE` |
| `idle_key` | reversible | release a key its idle holder never uses | 30 minutes | `agent-parley say LANE KEY --subject 'Reserve this key again'` |
| `failed_ci` | reversible | re-run a failed CI job once | 30 minutes | `gh run cancel RUN` |
| `merge_default` | irreversible | wait for the operator | never | none |
| `release_tag` | irreversible | wait for the operator | never | none |
| `discard_work` | irreversible | wait for the operator | never | none |
| `delete_branch` | irreversible | wait for the operator | never | none |
| `native_permission` | irreversible | wait for the operator | never | none |

A reversible decision left unanswered for its timeout settles to the default.
The outcome is appended to the lane's report log as a record of kind `default`
with outcome `applied by timeout`, the evidence it used and the filled undo
command, and one line naming what was done and that command is sent on the
configured notification transports. When the evidence is already conclusive,
for example the issue was closed by a merged pull request from this claim in
the current ownership generation, nothing is asked and the outcome is
`applied on evidence`. An irreversible kind, and any kind the table does not
know, always waits for an answer.

A project can make a reversible kind always ask, or wait longer, from the base
checkout:

```bash
agent-parley timeout show
agent-parley timeout set failed_ci --after 2h
agent-parley timeout set orphan_claim --ask
agent-parley timeout set failed_ci          # back to the default
```

The policy is stored in `project.json` as `"timeouts": {"orphan_claim":
{"ask": true}, "failed_ci": {"seconds": 7200}}`. It can only make a kind more
cautious: a timeout under 30 minutes or over seven days, an unknown kind, or
any timeout for an irreversible kind is refused, and a manifest holding one
refuses every settlement until it is fixed. `set` refuses lane shells the way
`unattended set` does.

Every supervision poll sweeps the project's open decision records, the ones
notifications deliver, before sending the due ones. A record settles only
when its notification kind maps to a reversible table kind, it was recorded
reversible, and it recommends one of its own options. Today a
`orphan_decision` record settles as `orphan_claim`; `permission_prompt`,
`permission_denied` and `native_dialog` records map to `native_permission`
and always wait; any other
record waits for an answer. A settled record is answered with its recommended
option by `timeout`, handed to its lane like any other answer, logged and
announced as above. A record the operator answered first, or one missing the
issue or lane its undo command names, is left alone.

### Keeping the service across reboots

The service is a user process and does not survive a reboot. Where the machine
should bring it back without a launch, a user-level systemd unit does it.
Write `~/.config/systemd/user/agent-parley.service`:

```ini
[Unit]
Description=Agent Parley coordination service
After=default.target

[Service]
Type=oneshot
RemainAfterExit=yes
ExecStart=%h/.local/bin/agent-parley up
ExecStop=%h/.local/bin/agent-parley down

[Install]
WantedBy=default.target
```

Then enable it, and allow it to run while nobody is logged in:

```bash
systemctl --user daemon-reload
systemctl --user enable --now agent-parley.service
sudo loginctl enable-linger "$USER"
```

The unit is optional. `up` returns once the service answers and the process it
started is detached, which is why the unit is a `oneshot` that remains after
exit. It starts the same command an operator runs, so the state directory, the
port and the logs are unchanged, and `agent-parley down` still stops the
service by hand. Adjust `ExecStart` to the path `which
agent-parley` reports when the installation is not in `~/.local/bin`, and set
`Environment=AGENT_PARLEY_HOME=...` in the `[Service]` section for a private
root other than the default.

Worktrees start at a captured commit and persist. Ignored environment files,
dependencies and untracked configuration are not copied. Set up each worktree
as needed. Review each lane's branch, integrate it with `participant merge` or
with Git directly, then run the target repository's combined verification gate.
The service never starts a merge: `participant merge` and `unattended run` are
both operator commands, run from the base checkout. A reported `ready` outcome
does not establish that a branch is fit to merge.

## Plugins

Install the CLI first, then add the repository marketplace:

```sh
claude plugin marketplace add suneel944/agent-parley
claude plugin install agent-parley@agent-parley
codex plugin marketplace add suneel944/agent-parley
codex plugin add agent-parley@agent-parley
```

Both plugins provide `coordinate`; the launcher supplies MCP and native hooks.
Avoid installing the same skill from both personal and repo marketplaces. Start
a new native session after updates.

`make check` runs `claude plugin validate plugins/agent-parley --json` as part
of the policy gate and refuses any reported error, so a declared component path
the runtime loader cannot resolve fails here rather than at install time. The
gate is not run with `--strict`, because the manifest declares the `protocol`
field that the compatibility contract reads and the client reports every field
it does not recognise as a warning. Exactly one warning path, `protocol`, is
tolerated; a second unknown field fails. A machine without the Claude client
installed reports the step as skipped rather than passing it silently.

The validator reports commands but never lists skills, so the same gate checks
separately that every directory under `plugins/agent-parley/skills` carries a
`SKILL.md` declaring both a name and a description.

Repository installation does not imply public directory approval. For Claude,
validate `plugins/agent-parley` with `claude plugin validate`, then use the
[community submission form](https://platform.claude.com/plugins/submit).
The official catalog is curated separately; see
[Claude's guide](https://code.claude.com/docs/en/plugins).

For Codex, follow [OpenAI's submission guide](https://developers.openai.com/plugins/deploy/submission).
This is a skills-only plugin. Submission requires a verified publisher, listing
and policy URLs, a skill bundle, and review cases. `make codex-bundle` builds
the skill bundle the portal accepts. `make release-artifacts` builds the same
archive into `dist/release`, so every published release carries
`agent-parley-VERSION-codex-skills.zip` as an asset with its hash in
`SHA256SUMS`, and the portal step downloads a released file instead of
building one locally. The Codex listing is live; the Claude
submission is awaiting review.
CI builds artifacts; it does not submit review forms.

`docs/catalog-submission.md` records what each catalog asks for, the checks that
can be run in this repository before submitting, and the steps that are bound to
the owner's accounts and cannot be delegated.

`docs/mcp-directories.md` does the same for the MCP directories: the
`server.json` and `glama.json` manifests, the check that validates them, and
the owner-only submission steps and open decisions.

## Releases

A release measures itself, then ships itself. Every push to `main` runs
`Auto version`, whose first step measures release eligibility from delivered
product work and reports the counts it measured. A push that warrants no
version stops there, and so does a push whose changes never reach the package.
The release commit is skipped by its `chore(main): release` subject, so a
release cannot trigger another release.

An eligible push mints a token for the release GitHub App, raises the next
version across `pyproject.toml`, both plugin manifests, the Claude marketplace
manifest, `uv.lock` and `.release-manifest.json`, and prepends a `CHANGELOG.md`
entry built from the same commits the measurement counted. It then runs the
policy gate against the raised markers, so a marker the bump misses fails the
run rather than reaching a release. The App commits that to `main` and pushes
the annotated `vVERSION` tag. The job's repository `GITHUB_TOKEN`, granted
`actions: write`, then dispatches `Release` for that tag.

There is no release pull request. An earlier design kept one, and it did not
prevent the incident it appeared to guard: a build-tooling commit with a `fix:`
title produced a proposal, the workflow approved it as a second identity,
auto-merge fired, and a withdrawn version reached PyPI seconds after the
resulting tag push. What stops that today is the measurement. A commit counts
only when a releasing conventional type introduces it and it touches
`agent_parley/` or `plugins/agent-parley/`, and a version is raised only when
the counted work crosses a threshold and the package differs from the approved
release. Tooling commits measure zero, so the proposal that started the
incident cannot exist. `check`, `secrets` and `pr-hygiene` stay required for
human pull requests, and independent approval still applies to them; the App
bypasses review only for the release commit it authors, and cannot approve or
merge anything.

If `main` advances between the measurement and the push, the push is rejected
and the run fails rather than tagging a tree nothing measured. The next
eligible push measures again and succeeds, so the failure costs a run, not a
release.

Publication is a separate `Release` run naming an existing tag. It reruns the
gate, creates a draft, uploads assets, downloads and verifies their checksums,
then publishes. Failed verification leaves a draft.
After uploading to PyPI, verification allows six retries ten seconds apart
for missing index metadata to become visible. Conflicting or yanked files
still fail immediately; missing files after the retries leave the draft intact.

The release workflow answers only to `workflow_dispatch`. It deliberately has
no tag trigger: publication must name a tag explicitly, so a tag pushed by any
other route publishes nothing. `Auto version` dispatches it by name after
pushing the tag it measured. Publishing an existing tag
is idempotent, so a rerun verifies the uploaded bytes again instead of failing.

Release notes start with `What's Changed`, contain only the selected version's
section from `CHANGELOG.md`, and end with its full changelog link. A standing
product description is not injected into the changes. Regression tests cover
version isolation, exclusion of changelog preambles, missing or empty entries,
and preservation of the full changelog link.

The bump step generates a version section from the product commits counted by
release eligibility. Use descriptive Conventional Commit titles that name the
user-visible change. Maintenance and tooling cannot raise a release version.
An editorial correction can expand terse entries into concrete behavior after
checking the shipped commits and linked issues. Keep section names consistent:
`Features`, `Bug fixes`, `Performance`, `Documentation`, and `Known limitations`
when applicable. Preserve historical archive and provenance notices.

Keep reviewed wording in `CHANGELOG.md`. Updating a published GitHub page is an
editorial operation: change its description only, never replace the tagged
source, packaged notes, release assets or checksum manifest. Packaged notes
remain the record created when that version was built.

Every GitHub release is titled `Agent Parley vVERSION`, minted by publication
rather than typed, so the releases page reads as one series. Releases published
before that title existed were renamed to match. Do not retitle a release by
hand: a page where one entry names the product and another shows a bare tag
reads as two different projects.

One-time owner setup, without which `Auto version` fails as soon as a push
warrants a version:
register a GitHub App under the owner account with repository permissions
Contents: read and write; install it on
`suneel944/agent-parley`; set the repository variable `RELEASE_BOT_APP_ID` to
the App ID; set the repository secret `RELEASE_BOT_PRIVATE_KEY` to a generated
private key in full PEM form; and add the App to the bypass actors of the
`main` PR/check and independent-approval rulesets so it can push the release
commit. Keep deletion, force-push and linear-history rules in a separate
ruleset with no bypass actors. Classic branch protection must be migrated to
equivalent active rulesets before removing it; otherwise it still rejects
the release App's push. Human pull requests retain their required checks.
The App's Contents permission covers the commit and tag. Dispatch uses the
job's repository token, so the App needs no Actions permission. GitHub permits
`workflow_dispatch` events from `GITHUB_TOKEN` to start another workflow.

To cut a release by hand in an emergency, `Release` still accepts a
`workflow_dispatch` with an existing tag, and reruns the same verification.

After the GitHub draft's uploaded bytes have been verified against the local
checksums, the workflow publishes the distribution to PyPI. It
stages a clean `dist/pypi` directory holding only the two files the index
accepts, the `agent_parley` wheel and the source tarball, copied by exact name
from the verified `dist/release` bundle, so the plugin archive, the Codex
submission archive, the exported requirements file, the changelog, the release
notes and the checksum manifest are never uploaded. Authentication uses PyPI Trusted Publishing over OIDC: the
job requests a short-lived identity token through an `id-token: write`
permission scoped to that job, and PyPI exchanges it for a one-time upload
token, so the repository stores no PyPI API token and no publishing secret. The
workflow must run as its own top-level workflow, started by its own dispatch
rather than called from `Auto version`. This is why `Auto version` finishes by
dispatching `Release` instead of calling it as a reusable workflow, even though
calling it would be shorter. The upload carries a signed
attestation whose build configuration names the workflow that started the run,
and PyPI checks that name against the trusted publisher: called from another
workflow, the attestation names the caller, the check fails, and the upload is
rejected with `400 Bad Request`. The current workflow keeps the GitHub release
as a draft until both PyPI files are visible with matching hashes, then marks
it public and latest. Rerunning against an existing tag verifies the existing
files and stages only missing packages; conflicting or yanked files fail.
Publication does not close issues or milestones. After verification, move
unfinished issues to the next milestone and close the released milestone.

Publishing needed one manual step that only the repository owner could take,
and it is done. The `agent-parley` project exists on PyPI and its trusted
publisher is this repository's `release.yml`, with the environment name left
empty because the workflow declares no environment. It had to be registered as
a *pending* publisher, because a trusted publisher cannot be added to a project
that has no releases, and the first successful run created the project and
converted it into a normal one. Nothing was added to repository secrets.

Registering another one repeats the same path: PyPI, account settings,
Publishing, "Add a new pending publisher", GitHub, with the PyPI project name,
owner `suneel944`, repository `agent-parley` and workflow `release.yml`. A
pending publisher does not reserve the name until it is first used, so register
it before tagging. The earlier candidate `agent-bridge` is permanently
unavailable: PyPI strips separators when comparing names, and an unrelated
`agentbridge` project already holds that form.

Download assets together and run `sha256sum --check SHA256SUMS`. The wheel needs
no third-party runtime packages. Development tools and the independent MCP test
client are locked in `uv.lock`.

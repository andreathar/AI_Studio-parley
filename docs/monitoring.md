# Monitoring

Every reading here is read-only: no lock is taken, no vendor is asked, no model
call is made and nothing in coordination state moves. The field-by-field
reference for the same views is in [Operations](operations.md#reading-status).

## Four presence states

A lane's availability is one of four states, and they are not interchangeable.
Availability is what supervision decides on and what `--json` carries under
`availability`; it is not the `STATE` column of `status` and `top`, which shows
`retired` or `paused` when the operator set either, else the lane's recorded
state, such as `working`, `blocked` or `dead`, and falls back to availability
only for a lane with no record yet.

| State | What it means | What it is not |
| --- | --- | --- |
| `active` | The session process is alive and its last hook checkpoint is inside the inactivity threshold. | — |
| `idle` | The session process is alive, but its last hook checkpoint is older than the inactivity threshold. | Not a lost lane, and not an error. |
| `stopped` | The recorded session process is gone. | Not merely a quiet lane. |
| `unknown` | The session's process identity cannot be trusted. | Never inferred dead from its age; it is left for you to inspect. |

A live lane past the inactivity threshold therefore reads `idle`; only a dead
process reads `stopped`. The distinction is what lets `problems`, the wake
path and the fitness check tell a lane that is thinking from a lane that is no
longer there. Every state only reports: nothing is revoked, no claim is released
and no ownership moves.

The send result keeps the older operator wording for the dead case. A message
addressed to a `stopped` lane is summarised as `queued for NAME (unreachable)`,
and one addressed to an `idle` lane as `queued for NAME (idle; wake
requested)`, and one addressed to an `unknown` lane as `queued for NAME
(process identity unavailable; manual attention required)`. A presence row
written before this release still carries
`unreachable` and is read as `stopped`.

`idle` names the oldest waiting item and how long it has waited, so a lane that
is quiet with an empty inbox reads differently from one sitting on unread mail.

## A second session in a lane

A hook event from a session other than the lane's recorded one is recorded as
`session_mismatch` with the arriving `session_id`, the lane's
`recorded_session_id` and the arriving native `pid`, and it changes nothing.
When the recorded session's process has exited and the event comes from a live
native process, the new session is adopted as if it had sent `SessionStart`, so
a lane whose start event was lost follows its real session again. Any other
second session, such as a headless `claude -p` started inside the worktree, is
named in the lane's `status` detail and as a `second session` row in
`problems` while its process runs, or for ten minutes when its process cannot
be told apart from the lane's.

A session continued with `--fork-session --resume`, or started by hand in the
lane's worktree, keeps running after the lane's recorded process exits. Before
each poll reads presence, the supervisor binds a lane whose recorded session
process is gone to the second session its hooks last came from, while that
process runs, or else to the newest native client of the lane's provider whose
working directory is the lane worktree. The activity record then names that
process and carries a `rebound` entry with its process ID, session and time,
and the next hook from it is adopted under its new session ID. So a lane is
never read as stopped, aged into `dead` or has its claims orphaned while a
client still runs in its worktree. On macOS, where `ps` reports no working
directory, only the recorded second session is found this way.

A client the launcher did not start has no wake socket, so a wake cannot reach
it. The wake is recorded as `unavailable`, `problems` shows a `wake attention`
row reading `wake attempted at T, not delivered: ...`, and the lane's next hook
context carries the same note once, so the lane learns it was asked for a turn.

## A lane held by a native dialog

A native client sometimes stops on a screen of its own: a usage limit, a tool
permission prompt, a hook trust review. The client process stays alive and runs
no hook, so without the screen a held lane reads as a quiet lane. The launcher
owns the client's terminal, so it reads that screen and reports it. The activity
column then shows `dialog: ` and the dialog's name, the activity record carries
a `dialog` entry with the last screen lines, a wake addressed to the lane is
refused with `manual attention required`, and you get one notification with the
screen text when [notifications](operations.md#notifications) are configured.
A recognized usage limit also records the provider capacity as
exhausted with the reset instant the screen names, so the lane is parked with
that reason and restored when the reset passes. A screen that names no reset
is probed on a doubling backoff capped at one hour; an accepted probe or a
later tool call clears the exhaustion. No lane on a dialog is ever
reported as `working` or `starting`.

Five dialogs are recognized, recorded from `claude` CLI 2.1.270 and Codex CLI
0.153.4: `usage-limit`, `question`, `hook-review`, `directory-trust` and
`tool-permission`. Only the bottom of the screen, where a client draws its
dialog, is read. A framed dialog counts only while it shows at least two
numbered options and its own footer (`Esc to cancel`, `Enter to select` and
similar), and a usage limit counts only on the client's own notice line. Text
that merely quotes a dialog, in scrollback or in the agent's output, never
parks the lane. Once a dialog is answered, by the launcher or by a digit or
Enter you type in the lane's terminal, the next screen output releases the
lane; any other key leaves it held.

`directory-trust` is the screen that asks whether you trust the folder. Codex
records that trust for the repository root, so trusting a lane's worktree also
covers the shared project. `question` is the client asking you a question
through its own picker. The notification and the `dialog` entry name the
question and every option it offers, and `status` lists the lane as held by
that dialog. To let a lane answer questions without you, set a standing reply;
it is typed into the picker's free-text option:

```json
{"participants": {"claude": {"answer_questions": "Use your best judgement."}}}
```

The reply is one line of printable text of at most 500 characters, set per
participant or under `supervision` for the whole project. Answering any other
dialog is
your decision, so nothing is answered until you say which option to press. Name
the option's own text, not its position, because the clients reorder options
between versions:

```json
{
  "supervision": {"dialogs": {"hook-review": "review hooks"}},
  "participants": {
    "claude": {"dialogs": {"tool-permission": "yes"}}
  }
}
```

A participant entry overrides the project entry for that dialog name. An
unanswered dialog, a dialog whose configured option the screen does not offer,
an answer the screen survives twice, and any prompt that is not a recognized
dialog and holds the screen for 30 seconds are all escalated to you instead. The
keystrokes sent are the ones you would press on an option the client itself
offered; no permission check is skipped and no bypass flag exists.

## A lane waiting for a tool approval

A permission prompt is also visible without the screen: the client runs its
`PermissionRequest` hook while it waits, and that hook names the tool it is
asking about. The lane then reports `waiting for approval` followed by that tool
name, and its activity record carries the same `dialog` entry the launcher
publishes, naming the tool and the instant the wait began. A repeated request for
the same tool keeps that instant, so `status` shows how long the prompt has stood
unanswered rather than how recently the client asked again. A wake addressed to
the lane is refused with `busy:approval`, which names the prompt without counting
the refusal as a failed wake, and no fit check passes the lane, so work is never
offered to a client that is holding a question for you. Once the prompt has
waited past the project's stall interval, `problems` reports it under `waiting on
approval` with the tool and the age.

A resumed session asks again for permission to use this bridge's own MCP tools,
and a service-driven resume has nobody at the keyboard to answer. `claude` 2.1.270
carries per-tool approval in its own settings, so a launch can allow that one MCP
server there, and only when you record the opt-in:

```sh
agent-parley approval resume --bridge-tools on
agent-parley approval resume --bridge-tools off --participant claude-2
```

The command writes `approve_bridge_tools` under `supervision` in the project
manifest, or on one lane with `--participant`; `--auto-mode on|off` records
`auto_mode` the same way, and `approval resume` with no flag reports both for
each lane. Only the operator can change them. The default is off and changes
nothing about the client's configuration. While a `claude` lane the service
could resume has neither this opt-in nor `auto_mode`, `run` and
`participant add` say so on standard error, `doctor` lists the lane under
`approvals` as a setup gap with that command, and the service withholds its
resume: the wake is recorded as `setup gap: bridge tool approval not recorded`
and spends no wake attempt, because the outcome is known from the manifest, so
the lane is never escalated for it and its backlog waits for the opt-in or
your own resume. `problems` reports the lane under `wake attention` with the
command that records the opt-in and the `run --resume` command for your own
terminal; when several lanes of one project share the gap, they share one row. With it on, the launch adds two native permission rules: `mcp__agent_parley`, which
allows this bridge's own coordination tools, and
`Bash(<interpreter> -m agent_parley.cli *)`, which allows the exact interpreter
and module the protocol prompt orders every lane to run for `issue claim`,
`issue list`, `report` and the other CLI commands. Both are spelled from the
same string the prompt prints, so they cannot drift apart. Nothing else is
allowed: no file tool, no other shell command, no other MCP server, no bypass
flag and no weakened decision. A lane launched before you recorded the opt-in
still draws the shell prompt for that command; its watcher reads the opt-in
again while the prompt holds the screen and answers `Yes` when the prompt's
command begins with that interpreter and module and chains no second command.
A prompt for any other command escalates as before. A participant entry
overrides the project entry, so one lane can stay fully interactive.

The client matches the CLI rule only against one plain command. A call that
puts the prefix in a variable, changes directory first, chains a second
command, pipes or redirects (`P=...; cd <lane> && $P issue accept ... | grep`)
falls outside it and would stop on a prompt nobody answers in a resumed
session. The `PreToolUse` hook therefore refuses any shell call that runs the
CLI in such a form, recorded as `chained_cli`, and the reason tells the lane
to run the command alone; the protocol prompt and the `coordinate` skill state
the same rule.

A lane the supervisor launches or resumes runs in the client's default
permission mode unless you record `auto_mode`. A lane you started by hand and
switched to the client's auto mode does not carry that choice into a
supervisor-driven resume, so a resumed lane parks on the first shell command
outside your own allow list and the two rules above. Record that command in
the client's own permission settings to keep such a lane moving, or record
`"auto_mode": true` for the project under `supervision` or for one lane. With
it on, a launched `claude` lane's session settings carry
`permissions.defaultMode` set to `auto`: the client's own classifier approves
routine commands and still stops a risky one. The client ignores `auto` from a
project's own `.claude/settings.json`, which is why the launch carries it. The
default is off, a lane entry overrides the project, a value that is not a
boolean is refused, and no bypass mode is ever passed. Codex CLI
0.153.4 has no per-tool approval surface of its own — its approval settings are
whole-session policies — so its launch is left untouched and its prompts are
reported for you to answer.

## Tab titles

An attached lane's terminal tab names the lane first, then its state and claim
progress, such as `[codex] idle with claim #412 - 2/5 done`, so a tab strip of
lanes reads as a summary without opening any of them. `agent-parley title`
prints the same line for a native status line and prints nothing outside a
lane. The supervision key `titles` turns the tab title off; the details are in
[Operations](operations.md).

## `status`

`status` prints the server line, the code line, the state directory and then,
per project, the open work: each live claim's issue, title, owner, lane state,
last event and pull request, then one line per lane with its state, live claim
count and current task. The task is the lane's last report while the lane still
holds the issue that report named. A blocked or partial report that mail
citing its issue has followed is labelled with its age and that mail's count,
such as `#782 (reported 58m ago, 2 newer messages on it): ...`, because the
mail may say the remaining work is done; the count covers messages the lane
sent, received or can read on the project feed that cite the issue as `#N`.
A report on an issue the lane no longer holds is labelled with that issue and
its age, such as `#1017 (not held, reported 21m ago): ...`, and open claims
with no report since they were claimed are named first, such as `no report on
held #1500, #1695`; `--json` carries the same reading as `report_issue`,
`report_held`, `report_newer_mail` and each claim's `reported_since_claim`.
Inside a project checkout it reports that project only;
`--all-projects` adds the rest, dormant ones last, and `--all` adds claims whose
issue is closed or whose pull request ended. Titles and open state come from
`forge-issues.json` in the project state directory, which the service's poll
refreshes from a bounded read of the forge's open issues every 300 seconds;
`status` reads only that file and never calls the forge. A cache older than
600 seconds, one never read, or one listing too many issues to read whole adds
one `Forge:` line.
`--json` stays the complete reading of every
project. `status --table` prints one table per project, a row per participant:
ownership, activity and outcomes.

<p align="center">
  <img src="https://cdn.jsdelivr.net/gh/suneel944/agent-parley@main/docs/assets/screenshot-status.svg" width="880" alt="agent-parley status listing issue owners, a pending handoff, and a lane on the wrong branch">
</p>

`Code: stale` says the running service is older than the installed code. The
service is up and answering, so nothing reports it as down, but it is serving
the build it was started from rather than the one on disk: restart it with
`agent-parley down && agent-parley up` before reading the next frame as current.
`Code: ok` says the running service matches the checkout.

Narrow the table by appending a participant name, which reports that lane in
full instead of as a row, or by filters that combine:

```sh
agent-parley status claude-1          # one lane, the whole reading
agent-parley status --drifted         # lanes off their assigned branch
agent-parley status --pending         # unread mail, offers or stale leases
agent-parley status --idle            # live lanes past the inactivity threshold
agent-parley status --outcome blocked --provider codex
```

`--drifted`, `--pending` and `--over-budget` exit non-zero when a lane
matches, so a shell gate fails on drift without parsing the table. Columns
shrink to the terminal, and a redirected stream receives every column instead.

A pending handoff is reported with the offering lane's head commit, the
reservations that move with it and the remaining work from its last report, in
the table and in `status --json`.

## `top`

`top` is the live view: every live lane at once, refreshed in place, `q`
quits. Like a task manager, it lists what is live: a lane out of a live state
(retired, or its state record `stopped`, `dead` or `reclaimed`; no record
yet falls back to a stopped session cell) is left out once it owns no
issue, holds no offer, holds or waits on no lease, has no unread or
unacknowledged mail and has no ready report awaiting approval. A project
whose root no longer exists, such as a run under `/tmp` after a reboot, is
left out the same way; a lane whose mailbox or lease store could not be
read stays on screen regardless. The header counts what was left out;
`--all` on the command line, or `a` in the live view, shows it again, and
`--json` always reports every lane.

```sh
agent-parley top --provider codex
agent-parley top --provider claude --provider codex
agent-parley top --sort IDLE --reverse
agent-parley top --repo payments --participant codex
agent-parley top --columns PARTICIPANT,STATE,ISSUES,IDLE
agent-parley top --all
```

The screen reads like Linux `top`: three summary lines, one row per lane, and
a short list of notes under the table. Each `!` note names a lane and says
what waits on you: branch drift, rejected calls, an unfit reason, a pending
split or pull offer, a failed review. Notes take the place of a NOTE column, so
long reasons never truncate, and monochrome output says everything colour
emphasises. `--once` ends with one line that points at the live view.

```text
$ agent-parley top --once --columns PARTICIPANT,STATE,ISSUES,MAIL,LEASES,DENIALS,IDLE,TASK
agent-parley top - 04:37:10  server running  projects 1  read 0.02s
Lanes: 3 total, 2 working, 1 idle   Issues: 3 held, 1 offered
Mail: 1 unread, 1 unacked   Leases: 2 held   Hooks (all retained): 7 events, 2 denied (29%)   Context: 2.5kB
Selection: columns PARTICIPANT,STATE,ISSUES,MAIL,LEASES,DENIALS,IDLE,TASK

project /home/dev/payments-api
PARTICIPANT     STATE                   ISSUES      MAIL       LEASES     DENIALS    IDLE      TASK
claude-1        working 5s              #42         0/0        1 5s       1/3        0s        Fix refund rounding for partial capt…
claude-2        working 5s              #58         0/0        1 5s       0/2        0s        Document the refund API for merchants
codex-1         idle 5s                 #17+1       1/1        0          1/2        0s        Rename the shared money helper

! codex-1  on branch refund-spike, not its assigned branch
! codex-1  idle; acknowledgement of message 1 for claude-1 waiting 5s
! codex-1  unfit (mail): it owes an acknowledgement 5s old
Live view: top without --once; ? explains each column.
```

This is the output behind the README screenshot, recorded by
`scripts/record_demo.py --screenshots` against three lanes whose native
clients are stubs.

The first line names the server, the time, the project count and the idle
total. The second counts lanes by state and the issues they hold, and says how
many lanes are hidden. The third totals mail, leases, hook decisions and
injected context. A count that is zero and says nothing is left out.

Each lane is one row. The default columns are PARTICIPANT, STATE, BRANCH,
ISSUES, MAIL, LEASES, DENIALS, TOKENS, IDLE and TASK, the lane's last prompt.
`--columns all` adds PROVIDER, EVENT, REVIEW, CONTEXT, CALLS, UNUSED and FIT.
A lane that needs you also gets one line under the table, marked with `!`:
a stall, an operator edit, a base advance, an orphan claim, a budget marker,
a failed fit check or an escalated dispatch. On a bounded screen the notes
take at most a third of the page, and a last note counts the rest; `P` lists
every problem. `?` shows the column legend.

With a dozen lanes open the whole table is rarely what you want. `--provider`
narrows the view to the participants driven by one provider, and the summary
counts only the rows it shows.

`top` fits the terminal it is given. Every column is as wide as the widest value
in the frame. STATE and TASK, like top's COMMAND column, take the width the
others leave, so one long cell ends in `…` instead of pushing columns out. A
terminal too narrow for the whole set drops the lowest-priority columns in a
fixed order and names them under the summary. Rows past the fold are paged,
never dropped: the footer reads `rows 1-8 of 31`. `--once` prints at the width
of the terminal and at the full width of the table when the output is a pipe,
so a captured file keeps every chosen column intact.

The same choices are reachable from the live view with single keys:

| Key | Does |
| --- | --- |
| `j`, `k`, down, up | Select the next or previous lane, paging the table. |
| `enter` | Show every recorded field of the selected lane, unclipped. |
| `s` | Order by the next column. |
| `r` | Reverse the order. |
| `f` | Narrow to participants, comma separated; empty clears. |
| `o` | Narrow to projects, comma separated; empty clears. |
| `c` | Choose the columns shown; empty is the default set, `all` every one. |
| `a` | Show or hide stopped lanes and projects whose root is gone. |
| `P` | Show the `problems` rows in place until any key returns. |
| `?` | Show the key map and the column legend. |
| `q` | Leave. The view never writes state. |

The first summary line also carries how long the frame took to read. Git reads dominate
a frame, so the live view reads each lane's branch and each project's
operator edits and base advances at most once every five seconds; the rest
of the frame is read on every redraw, keeping a normal frame under a second.

A lane that drifted from its branch, holds a stale lease, had a call rejected,
owns an overdue issue or lost its session process is drawn in colour where the
terminal offers it and in bold where it does not. Each of those also prints its
own marker in the table or a note under it, so a monochrome pipe reads exactly
the same.

`running; no hooks` means the session needs relaunching to obtain checkpoint
reporting. `top --once` prints full detail.

`TOKENS` is the session total that lane's own native client already wrote to
disk. No vendor is asked, no key is read and no price is applied, so it is a
relative signal between refreshes rather than billed spend, and the cell is
blank when nothing could be read.

## Idle time is a number, not an impression

`top` carries an `IDLE` column: how long each lane went without coordination
activity inside the window, with the project total and the worst lane in the
first summary line. `status` prints the same figure and, under it, every pending item with
the seconds it has already waited — a message before its first read, an
`ack_required` message before acknowledgement, a handoff offer before an answer,
a `ready` report before integration. Every figure comes from records the runtime
already keeps, so it reports observed coordination inactivity and never claims
to know what the native client was doing inside a turn.

`status` also prints two accountability numbers per project, measured from
each lane's state record by every supervision poll:

```text
Lanes: idle 35.0 min/lane-hour (top: claude blocked: capacity, 4 min); unaccountable claims 3.5 min (top: claude blocked: capacity, 4 min)
```

Idle lane-minutes per lane-hour count the time a lane spent `idle`,
`blocked`, `stopped` or `dead` while it owned a claim or the ledger held an
unclaimed, unblocked issue. Unaccountable claim-minutes count the time a lane
owned a claim while it was not `working`. Each names its largest cause; an
idle lane whose turn ended on a retryable provider or transport error is
charged to `idle: provider error`. The
totals run from the first poll that saw the lane; a gap of more than five
minutes between polls, a stopped service, is charged to nothing. `status
--json` carries both per lane and per project under `accounting`, and each
time a lane's total crosses a whole minute an `accounting` event is added to
its lane history.

## `problems`

One screen says what needs you now. `agent-parley problems` lists, longest-held
first, with rows older than a day moved under an `Older than a day:` heading at
the end and the rows of lanes dead past the project's `fold_after` counted on
one closing line that `--all` expands, every condition an operator should act on: a lane stalled or inactive
past its supervision threshold, a claim past its deadline, a handoff offer with
no answer, a message awaiting acknowledgement past `--ack-after`, a lane whose
branch drifted, a lane whose session process is no longer confirmed running and
whose worktree is dirty with no recent activity, a lane over
its advisory budget, a lane holding more claims than `max_claims_per_lane`, a
store schema behind the code, and a service that is down. It also lists an
issue `not converging`, an `integration unverified` on the base checkout, a
`recovery refused`, an `escalated plan revision` and the `plan revisions
pending`, a `run budget exhausted` or `run budget unmetered`, an `unresolved
completion`, a project reporting `root missing` or `supervision failing`, and
a lane needing `wake attention`. Every condition, when it is
raised and what clears it, is in the
[Operations](operations.md#triage-with-problems) table.

A quiet lane counts as inactive only while it owes work: it holds a claim that
has not reported ready or been verified complete, or it is paused, held by a
prompt or stopped answering wakes. A lane that delivered everything it holds is
at rest, and `problems` does not list it.

Retiring a lane supersedes the shares it still owed an acknowledgement, so
they never bounce. `problems` names that once per retired lane under `shares
to a retired lane`, for example `3 shares to codex superseded: codex retired`.
The row is informational and offers nothing to run; it clears when those
shares' acknowledgement deadlines pass, or a day after retirement for a share
sent without a deadline.

Two readings wake a lane before they could ever reach this list. A lane
waiting on its own pull request is sent one supervisor message, and so a wake,
when that pull request's checks finish, a review lands or its merge state
changes, and once more when its head stays pending past the checks ceiling,
which also lists it here as `checks stalled`. A message reporting a new review
quotes each new review's body and up to 20 inline comments as file, line and
text, newest review first; one reporting failed checks quotes the tail of the
failed-step log of each check that ran and failed. That quoted forge text is
marked untrusted, prefixed with `> ` line by line, stripped of terminal escapes
and held to one 3000-byte budget, never past the 4096-byte message limit; a cut
section is followed by the `gh` command that returns it whole. Only what the
message reports as new is quoted, so a review or log is never sent twice. A red
run lists here as `checks
failed`, naming the attempt; a required check the forge never started is
different, since only you can act on it, so every pull request sharing that
cause is grouped into one `checks refused` row and one decision instead of a
row per lane. A claim whose verification keeps failing with no verified improvement
is asked once to change approach, and only a repeat is escalated to you as
`not converging`. Both are described under
[waking](operations.md#availability-reminders-and-waking) in Operations. The
changes that reach you outside the terminal are listed under
[Notifications](operations.md#notifications).

Each lane contributes one row per cause, not one row per item: a lane sitting
on twenty unacknowledged messages is a single row carrying that count and the
age of the oldest message. The remedy follows the lane's state, so a lane
parked on a native prompt is pointed at its own client instead of being sent
more mail it cannot read, an active lane is never told to leave its session,
and a dirty worktree is named by path with its changed files rather than
offered a retirement that would drop the lane's claims. Rows the supervision
service already handles — the wakes, the deliveries, the reclaims — say what
that loop has attempted and what it does next, and the report closes by
counting operator rows against service rows.

An empty list exits zero with one line saying so; any row exits 1, so a shell
or a cron can notice. `--json` prints the same rows, and `P` in `top` shows
them in place. The view reads the same snapshot `status` prints and moves
nothing itself. The one write beside it is `problems ack MESSAGE_ID`, which
records your own acknowledgement of a message a lane left unanswered and clears
that row and nothing else.

## `doctor`

An out-of-date install says so before it costs a turn. The launcher, the plugin,
the store and the running service each state a version, and a mismatch is
refused at the boundary with both numbers and the one command that fixes it —
when a lane starts, when a hook runs, and when a served call arrives.

```sh
agent-parley doctor
agent-parley doctor --json
```

`doctor` prints the launcher's version and protocol, the protocol each shipped
plugin manifest declares, the store's schema against the schema this build
writes, and the `service` component, which compares the running coordination
service against the code installed here. A service started from an older build
is reported stale with the restart that clears it, rather than reported ready.
Then `projects` names each registered root that no longer exists, `notify`
says whether outbound and inbound notification are active, `approvals` names
each lane lacking the resume opt-in, and a platform line names the kernel
release, the WSL generation and whether `pidfd_open` is available. `doctor`
exits non-zero on a version mismatch, a missing project root, or notification
configured but unable to send, so a script can gate on it; notification that
is off and an `approvals` setup gap leave it at zero. It reads only, and
prints no credential.

## `metrics`

`top` is a screen. `metrics` prints the same counters and gauges as text a
monitoring stack reads: the Prometheus text exposition format by default,
labelled by project, participant and provider, and `--json` for scripts.
`--provider` and `--since` narrow it exactly as they narrow the table:

```sh
agent-parley metrics
agent-parley metrics --json
agent-parley metrics --output /var/lib/node_exporter/parley.prom --every 30
```

`--output` writes the frame by atomic rename, so the textfile collector of
`node_exporter` never reads a partial one, and `--every` rewrites it on that
interval until you interrupt it. There is no HTTP endpoint and no new port: the
file is the interface. The command reads the records `top` reads, holds no lock
and writes no coordination state, and its `tokens` counter is what the native
client counted rather than billed spend, exactly as the `TOKENS` column is.

### Pull request outcomes

Each lane also reports what its pull requests became over the `--since`
window, or the last 7 days when no window is given:

| Metric | Type | Meaning |
| --- | --- | --- |
| `agent_parley_lane_pull_requests_opened_total` | counter | Pull requests supervision first saw open in the window |
| `agent_parley_lane_pull_requests_merged_total` | counter | Pull requests a claim resolution recorded as merged in the window |
| `agent_parley_lane_pull_requests_closed_total` | counter | Pull requests that left the open list in the window with no recorded merge |
| `agent_parley_lane_first_pass_ratio` | gauge | Share of merged pull requests with a known CI round count that merged after one round and no `CHANGES_REQUESTED` review |
| `agent_parley_lane_ci_rounds_unknown` | gauge | Merged pull requests with no stored CI round count, left out of the ratio and the median |
| `agent_parley_lane_ci_rounds_median` | gauge | Median CI rounds over merged pull requests with a known count |
| `agent_parley_lane_claim_to_merge_seconds_median` | gauge | Median seconds from the claim to the merge of its pull request |
| `agent_parley_project_pull_requests_excluded` | gauge | Pull requests in the window that no lane owns, left out of every lane figure |

Nothing here reads the forge. Supervision's pull request poll already keeps
each open pull request in `pull-requests.json` with the lane it belongs to and
when it was first seen; one that leaves the open list moves to that file's
`history` with `gone_at`, kept for 30 days. A merge is the one a claim's
resolution names, so its lane is the claim's holder and its claim-to-merge time
runs from the claim to the forge's close instant. A pull request that left the
open list without such a resolution counts as closed unmerged, which includes a
merge no claim recorded. A window with nothing in it reports zeros. `top` adds
one `Pull requests` summary to its issues line and `status` one line per
project over the last 7 days, each only when the window holds any, and `top --json` carries each lane's figures
under `pull_requests`.

## `watch`

One lane can be followed as a stream. `agent-parley watch NAME` prints one line
per coordination event as it happens: `claim issue 42`,
`denied git (branch_switch)`, `mail from codex-2 (thread t12)`, `report ready`,
`call send_message ok`, `session ended`. It starts from the most recent twenty
events, follows the store and the event log from there, and stops on `q` or on
interrupt; `--since 1h` widens the backlog and `--kind` narrows it. When
standard output is a pipe the lines are plain, and `--json` prints one event
object per line, so `watch NAME --json | jq` works. It never shows the agent's
conversation: the stream is coordination only, and the native client's
transcript stays in that client.

```sh
agent-parley watch codex-2
agent-parley watch claude-1 --since 1h --kind claim --kind denied
agent-parley watch claude-1 --json | jq .description
```

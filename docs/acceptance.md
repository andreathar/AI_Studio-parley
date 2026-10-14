# Unattended acceptance run

The integration suite drives synthetic clients over the real transport, so
it proves the coordination protocol and nothing about a day of real native
clients. This run closes that gap. It starts a whole lane estate against a
throwaway project, leaves it alone for a fixed period, samples what the
service can see while it runs, and decides the period against the
conditions an operator would otherwise check by hand.

`scripts/acceptance.py` owns the run. It is a development script, not part
of the shipped package, and it never answers a lane.

## Starting a run

```sh
uv run --locked python -m scripts.acceptance run \
  --home ~/.local/state/parley-acceptance/home --hours 24
```

The command takes the state home the estate runs under, the length of the
period, the sampling interval (300 seconds), the backlog size (20 tasks)
and the lanes. Without `--workspace` the run creates its own throwaway
project under `~/.local/state/parley-acceptance/run-<timestamp>`. It
refuses a directory that already holds a repository, so it can never run
on real work.

Nothing the run depends on lives under `/tmp`. A host that restarts
without shutdown clears `/tmp`, and one did so partway through an earlier
run, taking the project, its worktrees and every frame with it.

The run drives the checkout it is started from, not an installed release.
`--cli` defaults to the `agent-parley` entry point beside the interpreter
running the script, so under `uv run` every command, and the hooks and
service that command starts, come from this checkout's `.venv`.

Give the run a home and a port of its own. The operator's service already
holds the default port for the operator's home, and a run that shared that
home would be served by the installed release and judged on the operator's
real work. A credential profile is recorded per home, so a lane that names
one needs it defined in the run's home first:

```sh
install -d -m 700 ~/.local/state/parley-acceptance/home
export AGENT_PARLEY_HOME=~/.local/state/parley-acceptance/home
export AGENT_PARLEY_PORT=8877
uv run --locked agent-parley credentials add claude-p2 \
  --config-home ~/.claude-p2
```

`rehearse` seeds and registers a project exactly as `run` does, starts the
service the way a lane's launcher would, writes each lane's launch command
to `acceptance/plan.json`, takes one frame, and exits non-zero naming each
reading the service did not answer. It starts no lane and spends no model
quota, so run it before every period:

```sh
uv run --locked python -m scripts.acceptance rehearse
```

The run occupies its terminal for the whole period. Start it detached and
read its log, which lives beside the run rather than in `/tmp`:

```sh
setsid nohup uv run --locked python -m scripts.acceptance run \
  --hours 24 --trust \
  > ~/.local/state/parley-acceptance/run.log 2>&1 &
```

`--trust` is what lets the lanes start at all; it is described under what
the estate is given below.

Everything the run produces lands in `acceptance/` inside the throwaway
project: `launch/<lane>.log` per launcher, `launched.json` with each
launcher's process identifier, `frames.jsonl` with one sample per
interval, and `report.md` plus `verdict.json` when the period ends. The
process exits zero only when every condition passed.

`python -m scripts.acceptance verdict --workspace <path>` re-decides a
finished run from the state that is already on disk. It starts nothing and
launches nobody, so it is the safe way to re-read a run whose report was
lost or whose conditions were changed after the fact.

## What the run builds

The throwaway project holds a pytest configuration and one task file per
backlog issue, each asking for a single arithmetic function and a test in
files of their own. No two tasks touch the same file, so lanes never hold
each other's reservations and every task can end ready. The project is registered with its forge set to `null` and its
verify command set to `python -m pytest -q`, so lanes claim bare numbers
and no work reaches any hosting account.

Eight lanes are admitted and launched: six `claude` lanes, two of them on
the `claude-p2` credential profile, and two `codex` lanes. That is the
shape of the live estate the 2026-09-21 audit measured, and the point of
the run is to hold that shape for a day rather than for a test case.

Each lane is launched detached with the same task: take the lowest
unclaimed task, claim it, make the change with a test, run the verify
command, report ready, and take the next one. A task that cannot be done
as written is reported blocked with a reason. The task tells the lane
plainly that no operator is watching and that nobody will answer a
question it asks.

Launches are spaced by twenty seconds, because eight native clients
starting at once contend for the same credential refresh.

Each launcher is given a pseudo-terminal of its own. A launcher started
with no terminal runs its client without one, which `codex` refuses with
`Error: stdin is not a terminal` and which leaves a `claude` lane with no
screen for the dialog watcher to read. Nothing ever writes to the
controlling side of those terminals; the run holds them open only so a
client's terminal never reports end of file.

## What the estate is given before it is left alone

Five decisions are recorded before the period starts, and they are the only
five. Each is one an operator makes once at a terminal, and each is scoped
to the throwaway project.

The project manifest is given `supervision.approve_bridge_tools`. A resumed
session asks again for permission to use this bridge's own MCP tools and no
operator is there to answer, so the launch adds one native permission rule
scoped to those coordination tools and the `agent-parley` command.

The manifest also answers `codex`'s `Hooks need review` screen with `Trust
all and continue` through `supervision.dialogs`. Every lane worktree is new
to `codex`, so each lane draws that screen before it reads any prompt.

The throwaway repository carries a `.claude/settings.json` that allows file
edits and the test, status, diff, add and commit commands the tasks need.
Without it every `claude` lane stops at its first `Do you want to
overwrite` prompt, which is not a coordination dialog. The operator's own
settings are not touched.

The manifest also records `supervision.auto_mode`, so every `claude` lane
starts in the client's `auto` permission mode: the client's own classifier
approves routine commands and still stops a risky one. Without it a lane
that runs any exploratory command outside the list waits on a `Bash
command` prompt that no operator answers. The client ignores that mode from
a project's own `.claude/settings.json`, so the launch carries it in the
session settings. This is not a bypass mode.

The 2026-09-26 run that preceded these answers parked every lane within
minutes: both `codex` lanes on the hook review, two `claude` lanes on the
edit prompt, and the rest after a prompt that told them to avoid the
command they claim with.

`--trust` records the throwaway project and each lane worktree in the
native clients' own trust records: `hasTrustDialogAccepted` for `claude` in
`~/.claude.json`, and a `[projects."<path>"] trust_level = "trusted"` entry
for `codex` in `~/.codex/config.toml`. Without it every lane parks on the
client's directory trust screen at startup, which the launcher can neither
name nor answer, and the estate spends the whole period at `not started; no
native hook`. That gap is issue #383; until it closes, an unattended run
needs the flag, and the flag writes nothing but the directories of a
project the run itself seeded. Leave it off to watch the gap instead.

## The observation rule

The run reads the issue ledger, the problems view, the metric counters and
each lane's durable wake and activity records. It answers nothing,
acknowledges nothing, releases no claim and touches no native client. An
operator touch during the period destroys the measurement, because the
absence of that touch is the thing being measured. A lane that stalls
stays stalled and the run records it.

The one exception is the native dialog work below, which is a separate,
deliberately triggered check and is not run during the unattended period.

## Conditions

The verdict decides seven conditions. A condition that could not be
measured fails, because an unmeasured estate is what this run exists to
replace. Five are decided from the estate's final state; the two that
watch a lane over time are decided from the frames, because a lane that
stalled for an hour and recovered leaves nothing behind at the end.

**Every backlog issue reported.** Each seeded issue must end at `ready`
or `blocked`, and a `blocked` ending must carry a reason: the remaining
work the lane filed with the report, read from the same record in the
lane's durable report log.
This proves the loop closes without an operator: lanes pick up work,
finish it or say why they cannot, and nothing is left silently claimed.

**Problems holds only operator rows.** Every row the problems view still
shows at the end must name the operator as the actor and must carry the
command that clears it. A row with no command, or one that waits on a
lane, is a situation the service noticed and could not route.

**No worktree outlived its claim.** The product keeps one worktree per
lane and none per issue, so a lane that holds no undelivered claim when
the run ends must leave its worktree clean. A claim already reported
ready or verified does not keep the worktree. Uncommitted or untracked changes there, or
a worktree Git cannot read, are work no claim owns. Stranded work was the
reclamation gap the audit found, and it accumulates silently across a
long run.

**Service log is clean.** The run fails on any `BrokenPipeError` and on
any hook lock expiry in `server.log`. Both are faults the operator never
sees at the time and both cost a lane its turn. The service rewrites its
log in place at its bound and moves the oldest lines to `server.log.1`,
so the verdict reads both files and counts every entry stamped at or
after the run's start, not the bytes past an offset. `server.log.1` is
bounded too, so when the oldest stamped line in both files is later than
the run's start, the log no longer covers the run and the condition
fails as unreadable.

**No lane idled on an open claim.** Delivered claims are skipped. No
frame may show a lane reading as stalled while it holds an undelivered
claim, and no frame may show such a claim whose `last_event_seconds` is
past the default `claim_idle_after` of 3,600 seconds. That reading is
the age of the claim's own last generation start or report, the same
one the service's idle-claim rule uses. It grows whether the holder is
idle, woken and not working, or dead, so it needs no process reading.
The stalled reading needs unanswered mail, so the age is what catches a
lane idle on an empty inbox or a claim whose holder died. A lane idle
with work it owns is the trust breach the audit opened this milestone on:
the issue is not being worked, no peer can take it, and the status line
says somebody owns it.

**No lease outlived its holder.** No frame may show a lane holding a
reservation past its deadline while no session process of its own is
alive. The runtime reclaims such a lease once the grace passes, so a lane
that keeps one is a sweep that did not run or a holder that was never
observed.

**No lane escalated or exhausted.** A lane that escalated a dialog or
recorded exhausted provider capacity spent part of the period parked. This
condition is strict on purpose: a lane parked on a usage limit for six
hours is a failed unattended day even though nothing crashed. The remedy
is capacity, either a credential profile with room or fewer lanes on one
account, not a weaker condition.

## Proving the native dialogs

A native client draws a blocking dialog on its own terminal, runs no hook
while it waits, and keeps its process alive. Nothing about that screen
reaches the coordination substrate on its own, so the launcher's
pseudo-terminal watcher in `agent_parley/dialogs.py` is the only
observation available. Three screens are recorded from live clients:
`usage-limit`, `hook-review` and `tool-permission`.

The unattended period cannot be trusted to produce all three, so each is
triggered deliberately against a live client in a separate short session
against the same throwaway project, and the evidence is recorded with the
run. Use one lane at a time and note the client version, because the
patterns are recorded from `claude` CLI 2.1.270 and Codex CLI 0.153.4.

**`tool-permission`.** Launch a lane, let it record a session, stop it,
then resume it and give it work that uses a tool the native rules do not
already allow. A resumed session asks again for tools the operator
previously allowed, which is the common case: the client draws `Do you
want to proceed?` and waits. The prompt also reaches the substrate through
the client's `PermissionRequest` hook, so both surfaces should show the
same record and the record should name the tool.

**`hook-review`.** Stop the lane, change the hook settings the project
writes into the lane worktree, and start the client again. The client
draws its `Hooks need review` screen before it reads any prompt, which is
the startup case a resumed lane hits after any settings change.

**`usage-limit`.** This one cannot be forced by the harness. Run a lane on
a credential profile whose weekly capacity is already spent, or take the
screen opportunistically when a long run hits it, which is what the audit
did. The screen names the reset instant.

For each case record the lane's `<lane>-activity.json` under the project's
private state directory. It must carry `activity` prefixed `dialog: `, a
`dialog` record naming the screen, its label, its action and the last
lines of the screen, and the activity the lane held before the dialog. The
operator must have received one `NATIVE_DIALOG` notification. For
`usage-limit` the lane must also carry a durable capacity observation with
`state: exhausted`, `source: native-dialog` and the `reset_at` instant
read off the screen, recorded before the dialog is published so a reader
never sees a parked lane with no capacity record. When the screen goes
away the dialog record must be withdrawn and the previous activity
restored.

An unrecognized prompt that holds an unchanged screen for thirty seconds
escalates rather than guessing a key.

## Answering a dialog

Nothing is answered by default. An answer is recorded in the project
manifest, either under `supervision.dialogs` for every lane or under a
participant's own `dialogs` for one lane, which overrides the project
entry by dialog name:

```json
{
  "supervision": {
    "dialogs": {"hook-review": "Yes, proceed"}
  }
}
```

The value names the option text the client itself is offering, not a
position, because the clients reorder and add options between versions.
The watcher presses the digit next to the matching label. An unknown
dialog name, an option the screen does not offer, or the same screen
returning a third time after two answers all escalate instead.

Carrying a permission decision forward across a resume is a separate
opt-in, `approve_bridge_tools`, recorded the same way and scoped to this
bridge's own MCP server. Neither setting weakens a native permission
decision or adds a way around one. The run records that opt-in and one
dialog answer, for `hook-review`, so a lane that meets a tool permission
or usage-limit screen still holds it, publishes it and escalates it,
which is what the period is measuring.

## Reading the evidence

`report.md` is the artifact. It carries the period, the frame count, the
overall result, one row per condition with its evidence, one row per lane
with its wake attempts, wake result, dialog and activity, and one row per
backlog issue with its final state and owner.

`frames.jsonl` is the evidence behind it. Each line is one sample holding
the issue ledger, the problems view, the metric counters, the project's
own status reading and the per-lane counters at that instant, stamped with
the time it was taken. A frame that
failed to sample records an `error` rather than aborting the run, so a
single bad frame never loses a day.

A release does not require this run; attaching the report to a release is
optional:

```sh
gh release upload v<version> <workspace>/acceptance/report.md
```

`verdict.json` records the measured numbers. The verdict measures the lane
count, the issues the lanes claimed, how many of those reported ready, the
idle lane-minutes the lanes' event logs measure over the period, and the
claim-minutes nothing accounted for. A claim's minute is accounted for when
its owner reads as active or the problems view names the owner or a service
or store fault, the same rule the fault-injection suite applies. Records
under `docs/acceptance/` from earlier releases stay as history.

Keep the frames with the report when a condition failed. The report says
which condition failed; only the frames say when it started failing.

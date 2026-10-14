# Running lanes

Everything an operator does to a lane from the base checkout: starting it,
steering it, holding it, integrating it and sending it for review. The command
surface itself is listed in [Commands](commands.md), and the deeper reference
for each area is in [Operations](operations.md).

## Starting a lane

From a committed, clean checkout, one terminal per agent:

```sh
agent-parley run claude
agent-parley run codex
```

The first run registers the repository, creates that participant's worktree and
branch, starts the coordination service, and hands you the native CLI. Prompt
it exactly as you always do.

A new name creates its own lane, so a second account of the same provider, or
another provider, is one more terminal:

```sh
agent-parley credentials add account-2 --config-home ~/.claude-account-2
agent-parley run claude-2 --provider claude --credentials account-2
```

`--provider` defaults to the participant name, and the provider and account a
participant is created with stay fixed for that participant's life. Which native
CLI a name drives, how an account is selected, and how to recover a binding that
is already wrong, are in [Providers](providers.md#accounts).

A new lane starts as a bare worktree, so every agent would otherwise spend its
first turns installing dependencies or copying an untracked file. Record that
setup once instead:

```sh
agent-parley init set 'uv sync --locked'   # run it in every new lane
agent-parley init show                     # report what runs
agent-parley init set ''                   # remove it
```

The command runs in the new worktree after it is created and before the native
CLI starts, as an argument list, never through a shell, and no flag skips it. It
runs only when a lane is created, never on a resume, and `participant add` runs
it as well. `AGENT_PARLEY_BASE` names the base checkout while it runs, so the
command can copy a file Git does not track. A non-zero exit refuses the launch
and reports the exit status with the tail of the output; the worktree is left in
place so you can see what happened. Like `verify set`, `init set` runs only from
an operator shell in the base checkout: it refuses inside an assigned worktree
and in any process holding a lane's `AGENT_PARLEY_TOKEN`, so a lane cannot plant
a command every later lane runs. `init show` stays readable from a lane.

Each launch records how long `run` took to reach the native CLI, split into
worktree creation, `init` and CLI start (registration, the service and the
native configuration). `participant show` prints it as `Last launch:`, and
`participant show --json` reports it as `launch_timing`. A resumed lane records
zero for the worktree and `init`, because it pays for neither.

When `init` is most of that wait, keep prepared spare worktrees:

```sh
agent-parley pool set 2    # keep two spares ready
agent-parley pool show     # configured size and each spare's state
agent-parley pool fill     # prepare missing spares now, in the foreground
agent-parley pool set 0    # keep none; the next gc removes the rest
```

A spare is a worktree on its own branch, cut from the project base, with `init`
already run in it. It lives in the project's private state directory as
`spare.N`, outside the target repository, and carries no participant, no
credential profile and no registration. `run` takes a ready spare when one
exists, renames its branch to the lane branch it would have created under the
project branch prefix, keeps the spare's worktree path as the lane's path, and
starts the CLI there; a detached fill then prepares a replacement, logging to
`pool.log` in the project state directory. A spare cut from an older base,
prepared by a different `init` command, or moved off its own branch is stale: it
is never handed out, and the next fill or `gc --apply` removes its worktree and
branch. `status` counts spares as ready, preparing or stale, and `gc` lists each
one. Like `init set`, `pool set` runs only from an operator shell.

### Starting on an issue

```sh
agent-parley run claude --issue 42
```

`--issue N` claims issue N for the lane before its native CLI starts, through
the same claim `issue claim` makes, so an issue another lane owns refuses the
launch and the project's claim cap still applies. The launcher then reads the
issue through the configured forge (`gh` on GitHub, `bd` under Beads) and opens
the session with a digest instead of `--task`: the issue number, the project's
`verify` command, the expected outcome (a pull request when
`pull_request.self_service` is on, otherwise a ready report), and the issue's
title, body, three newest comments and the titles of up to five issues its body
mentions by number.

The quoted issue text is held to 6000 bytes. The title and linked titles are
kept whole, each comment is cut to 600 bytes and the body gets the rest. Anything
cut or left out is named with the command that prints the full issue, such as
`gh issue view 42 --repo OWNER/NAME --comments`. The text sits between fixed
markers and is labelled untrusted input that describes the work; it is not an
instruction to the lane or the launcher. A forge that is absent, offline or
refusing never blocks the launch: the claim stays, and the lane starts with the
issue number and a note that hydration failed, so it reads the issue itself.
Native authentication and permissions are unchanged.

## Steering a lane

Steer one lane without taking over its terminal:

```sh
agent-parley say claude-2 "Rebase onto main before you open the pull request."
```

The message lands in that lane's inbox beside peer traffic, so the agent reads
it at its next checkpoint. It comes from `operator`, a command-line identity: no
participant can be named `operator`, and no MCP tool sends as it, so an agent
cannot write in its name. Repeating the same message delivers nothing further,
and `--ack` asks the lane to acknowledge it.

A steer can also wait for the moment it is useful:

```sh
agent-parley say claude-2 "Pick up 18 next." --when-released 17
agent-parley say claude-2 "Wrap up for today." --at 18:00
agent-parley mail pending   # recorded, not delivered yet
```

The item waits in coordination state and is delivered by the supervision poll
that already watches every project: no scheduler process, and no read-only view
ever delivers mail. A stopped service delivers nothing and loses nothing.
`--after`, `--unless-reported` and a bounded `--every ... --until ...` repeat
are described in
[Operations](operations.md#delivering-a-message-or-an-offer-later).

## Holding, stopping and restarting

Steer a lane's life without typing into its terminal either:

```sh
agent-parley participant pause claude-2     # refuse its calls, keep its work
agent-parley participant resume claude-2    # let it act again
agent-parley participant stop claude-2      # end its session cleanly
agent-parley participant restart claude-2   # start it again in its worktree
```

A paused lane keeps its session, its claims and its reservations. Only acting is
refused: every coordination call and every tool use comes back denied naming the
operator, and `top` shows `paused`. `stop` mails the lane nothing, because only the
next session would read it, as an order to end; it signals the recorded session
process exactly as a normal exit does, sends `SIGKILL` to one that ignores it,
and never signals a process whose recorded identity no longer matches. `restart` refuses while a current session is alive, and ends a wedged
one first: a live process whose evidence is stale past `inactive_after`, such
as a client left in a native dialog. It refuses a lane that is off its assigned
branch. Uncommitted work stays in place; when there is any, the lane's claims
are captured into recovery checkpoints and named in the opening task, which
`--task` sets. It replays the recorded `init` command and launches the same
provider and account as before. After a host restart the lane reads as stopped
and supervision neither wakes nor resumes it, so `restart` is how it comes
back.
None of the four releases a claim: ownership still moves only through an
explicit release or an accepted handoff, and all four land in the event log.
A lane left dead past `orphan_retire_after` is the one exception: the service
returns its claims and reservations to its peers, as
[Coordination](coordination.md#a-dead-lanes-claims-are-offered-then-returned)
describes, but keeps the lane and its worktree, so `restart` or
`agent-parley run NAME --resume` still brings it back. A lane is never read as
dead while a native client of its provider still runs in its worktree: a
session forked or resumed there under a new session ID is bound to the lane
instead, as [Monitoring](monitoring.md#a-second-session-in-a-lane) describes.

A lane whose work has landed does not need removing by hand. The service sweeps
merged lanes that hold no work, and the worktrees lanes made, at most every 900
seconds. `agent-parley gc` reports the same sweep on demand, `gc --apply`
removes what it may, and `--force` also removes a lane-made worktree holding
uncommitted or unpushed work after writing a recovery checkpoint of it. A quiet
lane-made worktree whose unpushed commits already landed through another branch
is bundled into a checkpoint and removed without `--force`; a lane's own
worktree with unpushed commits is still kept. A worktree holding ignored files
is kept even with `--force`, because no checkpoint carries them. The
conditions are in [Operations](operations.md#reclaiming-landed-lanes). An
attached `run` titles its terminal tab with the lane name, its state and its
claim progress, and `agent-parley title` prints the same line for a native
status line.

## Integrating one lane

When a lane's work is ready, integrate it from the base checkout:

```sh
agent-parley participant merge claude-2
```

It always records a merge commit, refuses on a running session, a dirty tree or
a drifted lane, and leaves a conflict in place for you to resolve. A conflict is
recorded as an integration recovery that holds every further merge until it is
resolved or aborted; see
[Recovering an unverified integration](#recovering-an-unverified-integration).
It never resets, cleans, stashes or force-switches.

To see what that would bring in, and everything that would refuse it right now,
ask for a preview first:

```sh
agent-parley participant merge claude-2 --preview
```

The preview only reads. It changes nothing, and it never takes the lane's
session lock, so it is safe while that agent is still working. It attempts no
merge, so it cannot predict conflicts.

Or send it for review instead:

```sh
agent-parley participant pr claude-2
```

That pushes the lane's branch and opens one pull request whose body is the
lane's own recorded report, under the headings your pull-request template asks
for, referencing the issue the lane claimed. It opens assigned to you and
labelled from that issue, so it arrives owned and classified rather than needing
repair. It uses your own `gh` sign-in, refuses when there is no report, no
claimed issue, no change type on that issue or nothing to push, and reports an
already-open pull request rather than opening a second one.

That command is yours by default, and a lane that reports ready waits for you to
run it. A repository that would always say yes can say so once instead, with
`"pull_request": {"self_service": true}` in its private `project.json`. The lane
may then run `agent-parley participant pr` for its own work from its own
worktree, while its session is still live, but only after it reported `ready`,
only when the project configures a verification command and that command passes
during the push, only while the lane still sits on its assigned branch, and only
when no peer holds an advisory reservation over a path the branch changed.
Anything else refuses and names the condition that failed. The pull request
records the policy and those conditions beside its gate evidence. Merging is
never covered: `participant merge` stays yours.

## Integrating several lanes

With several lanes finished, integrate them as a set instead of deciding the
order by hand:

```sh
agent-parley participant merge --all              # every lane reported ready
agent-parley participant merge --group rewrite    # one group of the plan
agent-parley participant merge --all --preview    # the ordered plan only
```

Both order the lanes from the dependency edges already recorded, so a lane whose
issue waits on another is merged after the lane holding that issue. A cycle is
refused and named, never quietly ordered. Every candidate is preflighted with
the same conditions `--preview` reports, and each merge then runs through the
single-lane path, so nothing is integrated on easier terms than it would be
alone.

A group is admitted whole or not at all: one refused member leaves the group
unmerged. Execution is ordered rather than atomic, so a merge or a gate failure
part way through stops the run, leaves the earlier merge commits in place and
reports what was integrated, what refused and what was not attempted. Nothing is
reset or reverted.

A bulk merge only ever considers lanes that report ready, and its plan names
the prerequisites that lie outside the selected set with the ledger's account
of each, because narrowing a selection never lifts a recorded dependency.
Groups whose every member is reported ready are marked by `plan show` and
`status`, and counted in the `top` header, so you learn a set is integrable
without asking each lane. A reported state is a lane's own account, never review
or independent verification.

## Running unattended

A project can authorize, ahead of time, the integration of named issues so a
ready lane need not wait for you to be at the terminal. From the base checkout:

```sh
agent-parley unattended set 42 43 --target main   # record the policy
agent-parley unattended show                      # report it
agent-parley unattended run claude-1              # integrate one lane under it
agent-parley unattended set                       # remove it
```

`unattended run NAME` merges only when the lane's claimed issue is listed, its
claim and ready commit are current, the base sits on the target branch, its
dependencies are verified complete, a verification command is configured and
no peer reservation covers a changed path. The merge is the
`participant merge` step with the same locks, approvals and gate, and every
attempt records a decision in the lane's report log. It never pushes, never
repairs an unverified integration, and the service never runs it on its own:
it is an operator command. A lane holding several claims integrates its only
ready one; when several are ready, name one with `--issue N`, which
`participant merge NAME` accepts too. The full policy is in
[Operations](operations.md#requiring-a-recorded-approval).

A lane is not left pushing fix after fix against red CI. The `ci_rounds`
supervision setting (default 2) caps the CI rounds one pull request may use,
where a round is a head commit whose checks finished and a re-run on the same
head adds none. At the limit with red checks the lane is told to stop pushing
and report blocked, `problems` lists `ci rounds exhausted`, and one decision
asks you to grant one more round or take over. The cap is advisory: nothing
refuses a push. Details are in [Operations](operations.md).

A lane does not carry one native session from claim to claim. A ready or
blocked report on a claim records a rotation point on the lane, and the next
resume, `agent-parley run NAME --resume` or the service's own, starts a fresh
native session instead of continuing the old one. Its first prompt names the
lane, the claims it still holds with their next action and the last report,
followed by the task the resume carries, so each claim starts from a bounded
context. A lane the service resumed without a terminal ends its idle session
at the next wake after the rotation point, which reads `busy:rotating` in the
wake result, and the service resumes it fresh on its ordinary wake backoff. A
lane in your own terminal is never ended this way; it rotates on its next
resume, and a launch without `--resume` is always a fresh session. Every
provider starts a fresh session by leaving out its resume argument, so none is
skipped. The activity record keeps the replaced session as `rotated_from`, and
a session change by any other route, such as `/clear`, clears the point. Set
the supervision key `rotate` to false to resume the recorded session instead.

## Revising the plan

A lane that finds a missing prerequisite or an obsolete edge in the applied
plan files a revision from its worktree instead of asking you to edit the plan
file:

```sh
agent-parley plan proposals
agent-parley plan propose --base 3 --add 43:42 --reason 'Needs the schema first'
agent-parley plan approve ID
agent-parley plan reject ID --reason 'Keep them independent'
```

A revision applies on its own only inside the envelope the plan's `[revisions]`
table declares: the issues in `scope`, at most `max_changes` edges per revision
and at most `max_revisions` automatic revisions under one applied plan.
Anything outside it waits for `plan approve` or `plan reject` and changes
nothing meanwhile, and `problems` counts the proposals pending. A revision only
moves dependency edges; it never claims, completes or verifies work. The
envelope and escalation rules are in
[Coordination](coordination.md#the-work-order-is-a-file-you-can-review).

## One command for many lanes

With eight lanes, ending the day should not be eight commands. `say`,
`participant stop`, `participant pause`, `participant resume`,
`participant merge`, `participant pr` and `issue assign` take a lane selector in
place of the positional name:

```sh
agent-parley say "Wrap up for today." --all
agent-parley participant stop --provider claude
agent-parley participant merge --outcome ready --yes
agent-parley participant resume --idle
agent-parley participant pr --drifted
```

`--all` selects every lane and the other filters narrow it, so they combine.
Each filter reads the same lane facts `status` reports: the provider driving a
lane, the lane's own latest reported outcome, whether its checkout sits on the
branch it was assigned, and whether the lane reads as `idle` rather than active.
A positional name and a selector together are refused.

Every bulk run prints the lanes it matched and what will happen to each, then
asks once for the whole set; `--yes` skips that one question. A selector that
matches nothing does nothing and says so. Independent operations continue past
a lane that refuses, printing its refusal beside it, and the closing tally names
what was done and what refused. Integration is different: it keeps the ordered
stop-on-failure contract above, so the first refusal leaves every later lane
unattempted. The exit status is non-zero when any lane refused or failed.

`issue assign` carries one offer, so a selector stands in for its lane only
while it matches a single lane; a wider match is refused and names what it
matched.

## Requiring a gate before a merge

A repository can require its own command to pass before any merge. The command
is recorded in coordination state, not in the repository:

```sh
agent-parley verify set 'make check'   # require it from now on
agent-parley verify show               # report what is required
agent-parley verify set ''             # remove the requirement
```

With one configured, `participant merge` runs it in the base checkout first and
streams the command's output, refusing the merge on a non-zero exit and
reporting the exit status. It runs as an argument list, never through a shell,
and no flag skips it. It runs again on the merged commit, for a single lane and
for each member of a `--all` or `--group` run, so a set whose halves pass alone
but fail together is caught. A failure after the merge keeps the merge commit,
records the base as carrying an unverified integration, and holds every further
merge until `participant merge --verify-recovery` passes or the repairing lane
retries, with `--renew-recovery` once its attempts are used.

## Running a claim through a blueprint

`init` and `verify` are the same for every task. A blueprint gives one claim an
ordered list of required steps, so formatting, focused tests or a push happen
in order instead of whenever the model remembers them. The harness runs the
deterministic steps itself, with no model call, and hands the lane only the
steps that need judgment. Blueprints live in coordination state, not in the
repository:

```json
{
  "nodes": [
    {"name": "format", "kind": "run", "command": "ruff format ."},
    {"name": "implement", "kind": "agent", "prompt": "Implement the issue."},
    {"name": "tests", "kind": "run", "command": ["pytest", "-q"],
     "on_failure": "fix", "retries": 2, "next": "push"},
    {"name": "fix", "kind": "agent", "prompt": "Fix the failing tests.",
     "next": "tests"},
    {"name": "push", "kind": "push"}
  ]
}
```

```sh
agent-parley blueprint set feature feature.json      # record it
agent-parley blueprint show feature                  # nodes and edges
agent-parley blueprint run codex feature --issue 42  # start the claim on it
agent-parley blueprint advance --issue 42            # after the lane reports
agent-parley blueprint progress                      # where every run is
agent-parley run codex --issue 42 --blueprint feature  # claim, launch, start
agent-parley blueprint default bug bugfix            # label bug runs bugfix
```

`run NAME --issue N --blueprint B` claims the issue, starts the run on the
claim, then launches the lane. Without `--blueprint`, an issue whose label
`blueprint default` maps starts that blueprint; labels mapping to two
blueprints are refused until `--blueprint` names one. A label default is
removed with `blueprint default LABEL`, and a blueprint a label still names
cannot be removed.

Node kinds:

- `run` runs `command`, a string split like `verify set` or a list of
  arguments, in the lane's worktree as an argument list, never through a
  shell, within `timeout` seconds (default and ceiling 1800). It keeps the
  last 40 lines of output. `AGENT_PARLEY_BASE` names the base checkout.
- `push` runs `git push --set-upstream origin HEAD` the same way.
- `agent` writes `prompt` into the lane's inbox, with the last failing step's
  output attached, and waits. The next `blueprint advance` after the lane
  files a report passes the node on `ready` and fails it on `blocked`.
- `pull-request` opens or updates the lane's pull request through the
  repository's `pull_request.self_service` policy, with every condition of
  that path: a ready report, the `verify` gate run before the push, the
  assigned branch and no overlapping peer reservation. It fails while the
  policy is off.
- `wait-ci` reads the pull request reading the supervision poll keeps for the
  lane's branch at its current head commit. It waits while checks are pending,
  passes on green, and fails on red with the failing checks and the tails of
  up to three failed-step logs attached for the next `agent` node. A red
  verdict is judged once per head commit and re-run. When the pull request
  used its CI rounds (`ci_rounds`), the run ends blocked for the operator.
- `report` ends the run with `outcome` `done` (the default) or `blocked` and
  an optional `message`.

A node moves to `next` when it passes, or to the following node when `next`
is absent; the last node ends the run as done. It moves to `on_failure` when
it fails, or retries itself when that is absent. Failures count per node, and
a node that fails more than its `retries` (default 0) ends the run blocked.
`blueprint progress`, `status`, `top` and `watch` show the current node and
the nodes passed; a claim without a run shows nothing new.

`supervise` advances runs itself: each poll moves a run whose agent node has a
new report, or that waits on CI, on a background thread, so a slow node never
holds the poll. `blueprint advance` stays available to move a run at once.

Only an operator shell in the base checkout sets, starts or advances a
blueprint; a lane, or any process holding `AGENT_PARLEY_TOKEN`, is refused, so
a lane cannot plant commands later lanes run. `run` and `push` nodes inherit
the operator's environment, which is the lane's minus its coordination token,
and no node can merge: `participant merge` and its `verify` gate stay the only
way into the base. A run copies its blueprint when it starts, so a later
`blueprint set` changes only the next run. A claim never started on a
blueprint behaves exactly as before.

## Recovering an unverified integration

While the base carries an unverified integration, `problems` shows one
`integration unverified` row naming the lane that may repair it and the step
that moves it on. Usually that lane fixes its branch, reports ready again, and
you rerun its merge:

```sh
agent-parley participant merge claude-2                    # retry the repair
agent-parley participant merge claude-2 --renew-recovery   # after attempts run out
agent-parley participant merge --verify-recovery           # no lane can repair it
```

`--verify-recovery` merges nothing: it runs the recorded gate on the base as it
stands, after you have fixed or reset it by hand, and clears the record only if
the gate passes and leaves the tree clean. The attempt limits and every case
are in
[Operations](operations.md#recovering-an-unverified-integration).

## Requiring your own decision

A repository can also require your own recorded decision before a lane's work
leaves its worktree:

```sh
agent-parley approval set merge pr   # refuse both until a decision exists
agent-parley approval show           # report what is required
agent-parley approval set            # require no approval again
agent-parley approve claude-2        # record that you approved its report
agent-parley reject claude-2 'Needs a test for the retry path'
```

With the requirement set, `participant merge` and `participant pr` refuse until
`approve` records a decision on that lane's current ready report, and the
refusal names both the report and the command that grants it. The decision is
bound to that report, the lane's exact commit, its branch and base, and the
verification and pull-request settings in force, so new commits, a further
report, a retargeted base or a changed gate each need a new decision; the
binding is rechecked immediately before the merge or the push. A decision that
cannot be read refuses integration rather than allowing it. A rejection
delivers your reason to the lane as operator mail and the lane keeps working:
only these two commands are gated. `status` shows `awaiting approval`,
`approved` or `rejected` beside a ready report, `top` counts the lanes awaiting
one, and `history participant NAME --kind approval` lists the decisions with
the rest of the chain.

`approve` and `reject` run from the base checkout and refuse to run inside an
assigned worktree, or with a lane's `AGENT_PARLEY_TOKEN` in the environment
even after changing directory to the base checkout, so no lane records the
approval of its own work through these commands. That is this tool's command-line boundary and not an
operating-system one: a program running as you can write coordination state
directly. The decision also records that a human decided, not that the code is
correct; the verification command, the attribution scan and GitHub's own
checks all still run.

A separate opt-in decides whether the coordination service may resume a
`claude` lane without a terminal:

```sh
agent-parley approval resume                          # show what is recorded
agent-parley approval resume --bridge-tools on        # allow the bridge's tools
agent-parley approval resume --auto-mode on --participant claude-2
```

`--bridge-tools on|off` records `approve_bridge_tools`, which allows this
bridge's own tools, and `--auto-mode on|off` records `auto_mode`, which starts
the lane in the client's auto permission mode. Without `--participant NAME`
the setting is the project default. A `claude` lane with neither recorded is
not resumed by the service, because the resume would stop at a permission
prompt nobody sees; `participant add`, `problems` and `doctor` name it as a
setup gap with this command.

A lane resumed without a terminal can still reach a permission prompt its
rules do not cover. The dialog watcher opens an operator decision naming the
prompt and the command it asks to run, which the operator can answer from a
notification transport. The service never answers it. If the prompt is still
unanswered after the 30-minute decision deadline, the service ends that
session with the same verified stop `participant stop` uses. It then records
the lane as stopped and stores the prompting command as its wake result. The
lane's waiting mail goes back to its senders, and its claims, offers and
reservations are returned the way a dead lane's are. The lane is not marked
operator-stopped, so new work can resume it.

The service still never answers that permission on the lane's behalf once
it wakes the lane again. The next wake prompt instead names the command
the prompt asked about and says the permission it needed was never
granted, so the lane should use another route for that work or ask the
operator. The note is sent once; a later wake, once this one is admitted,
does not repeat it.

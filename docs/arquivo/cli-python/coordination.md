# Coordination

What the runtime enforces between lanes, and what it only reports. Every rule
here is recorded: the commands below read and write coordination state, never
the repository. [Running lanes](lanes.md) covers the operator side, and
[Operations](operations.md) is the full reference.

## Ownership changes only through explicit claims and accepted handoffs

No process exit hands an issue to another lane: a peer gets it only by a claim
or an accepted offer. The one timed path is the overdue and idle-claim sequence
below, which offers a claim and then returns it to the pool. `agent-parley
status` reports the open work of the project the working directory belongs to,
or of every project with `--all-projects`, and `--all` adds claims that ended
on the forge: who owns what, which handoff is waiting on an offer ID, and any
lane that left its assigned branch. An owner can record that one issue waits on
another with `agent-parley issue block 42 --on 17`; the listing then names who
holds the blocking issue, and every lane sees the change at its next
checkpoint. A dependency never stops a claim, but it keeps the issue out of the
unclaimed work lanes are shown, and `report ready` and a verified completion
refuse while a dependency is incomplete. A block on an unrecorded issue or one
that would form a cycle is refused, and the supervisor drops an edge once its
blocker is complete, was released after it ended on the forge, is closed on the
forge while a lane still holds it, or is no longer recorded.

<p align="center">
  <img src="https://cdn.jsdelivr.net/gh/suneel944/agent-parley@main/docs/assets/screenshot-issues.svg" width="880" alt="agent-parley issue list showing an issue that waits on another, the participant holding it, and a pending handoff with its offer ID">
</p>

## Choosing the next issue is one reading, not a guess

`agent-parley issue next` ranks the unclaimed, unblocked issues the ledger
records, plus the open forge issues the service's cache lists that the ledger
has never seen, and states why each one sits where it does: the plan group
peers have already started, the owned issues it would unblock, the peer
reservations and
forecast collisions its likely paths run into, and the provider it declares
where the forge carries a `provider:NAME` label. The forge reading is best
effort and bounded, so a lane with no network still gets the ledger's and the
plan's own order.

It recommends and nothing else. No ledger entry is written, no offer is made
and no path is reserved, so the lane still takes the issue it chose with
`issue claim` and still races a peer that chose the same one. An issue the
supervisor already named as another lane's next work ranks last, so claim
before exploring or editing. Lanes read the same shortlist over the
`next_issues` MCP tool.

```sh
agent-parley issue next --limit 3
agent-parley issue claim 42
```

The reading before that one is whether the work is recorded at all.
`agent-parley issue match "GOAL"` lists the open issues whose recorded title or
forge labels share subject words with what the lane intends to do, marks the
ones a peer owns, and names the peer reservations the same words run into.
Opening a second issue for tracked work splits one task across two numbers, and
no lane can see that split from inside its own worktree. The match is shallow
on purpose: shared words are a reason to read the issue, never proof that it is
the same work, and an empty result is the recorded reason to open a new issue.

```sh
agent-parley issue match "make the status command start faster"
```

## What travels with a handoff

An offer carries the state a peer needs to take the work over rather than a
sentence about it. `issue list` and `status --json` report, for every pending
offer, the offering lane's head commit, the reservations it holds against that
issue, and the remaining work from its last report. The receiving lane reads
those before it answers, so accepting is a decision rather than a guess.

Accepting moves the named reservations to the acceptor with the issue, so the
paths the work needs do not have to be reserved again and a released offer
leaves nothing stranded. Accepting also clears the previous generation's
`taken` and `orphan` records, so a later claim never restores an old
checkpoint. Mail is not transferred: acknowledgements stay owed by the lane
that received the message, and each lane still acknowledges its own.

```sh
agent-parley issue offer 42 --to codex --summary "commit, checks, remaining work"
agent-parley issue accept 42 --offer-id CURRENT_OFFER_ID
agent-parley issue decline 42 --offer-id CURRENT_OFFER_ID
```

`issue assign NUMBER NAME` lets an operator put work in front of a lane from any
checkout, and it offers rather than takes; the detail is in
[Operations](operations.md#directing-work-to-a-lane).

## Native hooks decide before the tool runs

They block branch changes inside an assigned lane, catch drift after any bypass,
and deliver short updates only when coordination state actually changes. Each
notice is capped at 1,536 UTF-8 bytes; an unchanged checkpoint adds no context
at all. A notice carries only the entries the lane was not already given, such
as one new claim row rather than the whole claim set, and says how many
unchanged entries it left out; `agent-parley status` and `agent-parley issue
list` always return the full state. A session start, including one after a
compaction, resends everything once. If a rename removed the assigned branch, the hook names the exact
repair. Branch drift blocks completion once; a Stop retry can end the session
while status continues to show the drift.

Pending mail and notices ride on the call as context and never refuse it. Only
three hazards deny a tool call: a shell call that runs Agent Parley's CLI
together with a variable, `cd`, `;`, `&&`, a pipe or a redirect
(`chained_cli`, whose text asks for the command alone, the only form the
launch pre-approves), a write to a path that overlaps an exclusive
reservation a peer holds (`reserved_path`, whose text says reservations are
advisory), and an offer to this lane that expires unanswered within 120
seconds (`offer_expiring`, which names the accept and decline commands).
Otherwise a call that only reads, and Agent Parley's own commands, are never
refused for coordination.

Overlap is shown before the work, not found as a merge conflict after it.
A write to a file a peer reserves, even shared, or that a peer's open pull
request changes, carries a notice naming that reservation or pull request and
the issues it closes, and each lane named receives mail saying who is editing
the file. A write to a file this lane has not reserved carries a reminder to
reserve it. A `gh issue create` whose title or body names lane files a peer
reserves or a peer's open pull request changes, or whose title shares subject
words with a peer's live claim, is refused once (`filing_overlap`) with those
findings, so the lane links or joins that work; running the same command again
files it. Each finding is shown to a lane once. Pull request files come from
supervision's last forge poll, so the hook never reaches the network. Nothing
here locks a file or refuses an edit: reservations stay advisory. A Stop is blocked once while an issue or work notice
is waiting, so the lane reads it before the turn ends.

Enforcement is recorded, not discarded. Every hook decision carries an
enumerated reason and lands in that participant's event log; every served call
is recorded inside the transaction that carried its effect. That is why `top`
can show what was denied, to whom, and how often.

## A deadline reports until the holder stops working

`issue claim 42 --within 2h`, `issue offer ... --within 30m` and
`say ... --ack --within 15m` record a deadline, and `agent-parley deadlines set`
gives a project defaults to inherit. The claim default also applies to a claim
that was made before the default existed. Past its deadline a claim reads `overdue`
with the seconds over, `top` marks the issue `#42!`, and a lane that reports
`blocked` on work it still holds spends one attempt of the recorded budget.

An overdue claim whose holder is still working on it stays owned. Two cases get
a terminating transition. The first is an overdue claim whose holder is
silent, meaning its session process is gone or it has run no tool call for the
project's inactivity window; a holder parked on a dialog only the operator can
answer is not silent. The second is any claim with no progress of its own for
`claim_idle_after` (3600 seconds), even while its holder works elsewhere.
Progress is a report naming the claim, or any tool call when it is the lane's
only claim. Both take the same steps:

1. The supervisor wakes the holder once. For an idle claim, the notice also
   goes to the lanes waiting on the issue.
2. If nothing changes one window later, the supervisor offers the claim to the
   fit, running, unpaused peer below `max_claims_per_lane` that holds the
   fewest claims, with the claim's recovery checkpoint named in the summary
   and its commit carried in the offer. With no fit peer it releases the claim
   instead.
3. If the offer expires or is declined, the supervisor releases the claim to
   the pool. An offer with no deadline expires after `stalled_after`.

Each step is recorded in the claim history as `overdue-wake`, `overdue-offer`
or `overdue-release` and counted in the claim's attempts. A supervisor resume
that ends without a tool call does not reset the silence. A holder that runs a
tool again, or progress recorded on an idle claim, cancels the sequence. A
claim observed complete is never moved; its completion reminder and the
operator's `issue resolve` end it.

A pull request merged into the project's recorded integration base
(`agent-parley branch integration BRANCH`) that closes a claimed issue by
keyword counts as that claim's landed work, though the forge keeps the issue
open until the base crosses to the default branch. The supervisor ends the
claim as complete, `status` names the issue as landed with its pull request,
and when no claim is held one `crossing ready` problem asks the operator to
open the crossing pull request. That step stays the operator's. The problem
waits for a whole reading of the forge's open issues, so it never repeats
after the crossing closed them, and ages from the newest landing or claim
end.

## A dead lane's claims are offered, then returned

A lane whose state record reads `dead` has its claims marked `orphaned` in
`issue list`, `status` and `top`, which marks the issue `#42*`. A lane is
`dead` once it has read `stopped` past the project's stall threshold
(`stalled_after`, 600 seconds). It reads `stopped` when its session process is
gone, when its session ended cleanly with `SessionEnd`, or after a host
restart, so a lane that exited on purpose is marked like one that crashed. The
marker states what was observed: an idle lane with a live process is never
marked, however long it has been quiet. Each lane that could take the work
receives one notice naming the orphaned issues and the reservations the dead
lane still holds; a lane that is itself dead, reclaimed or retired is left out.

Ownership does not move on the marker. A peer takes the work explicitly, and
the take records the previous owner and the reason, then moves the
reservations tied to that claim to the new owner. Reservations the old owner
holds for other claims stay with it.

A marker is withdrawn as soon as the observation behind it stops holding. The
next poll after the lane's state record reads live again removes the marker
from its claims, keeps those claims with that lane and tells every peer that
received the notice once that the work is no longer available to take. The
readings state when the marker was recorded rather than what is true now, so an
operator never reads a stored observation as a live one. A marker published by
an authorized live recovery is not withdrawn this way: it records an approved
stop with a checkpoint, not a crash.

```sh
agent-parley issue claim 42 --take-orphaned
```

A lane that nobody takes over is not waited on forever. Supervision proves a
lane dead when its state record has read `dead` for `orphan_retire_after`
(3600 seconds), or when it has no state record, no activity file and a
worktree at least that old, meaning it was added and never launched. The
`dead lanes` poll stage then declines the offers made to it, releases its
claims to the pool, and claims a released issue for the live peer that
requested it. Ready work that still waits on integration stays with it. Its
requests are withdrawn, the reminders about it are answered, and its advisory
reservations are released, each granted to the first queued peer with a notice
that says why. Every lane that can act is told once what moved. The lane is not
retired and its worktree, branch and credential are kept, so the operator can
still resume it; a lane that returns finds its claims in the pool.

## A budget informs; it does not gate

`participant budget NAME --tokens 2000000 --calls 5000 --hours 8` records
advisory limits on a lane; the same flags on `provider budget NAME` and
`budget set` give every lane of a provider or a project defaults to inherit,
participant over provider over project, field by field, and any limit may stay
unset. Consumption comes from what is already read: tokens as the `TOKENS`
column counts them, calls from the served-call records, hours from the recorded
session. No vendor is asked and no price is applied, so a token budget is a
count and not spend. Past a limit `top` and `status` mark the lane
`over budget` with the share consumed, the lane receives one bounded notice
naming the crossed limit, and `--over-budget` selects such lanes, so
`participant pause --over-budget` is one command. Nothing is stopped, revoked or
refused: the operator decides.

The one exception is opt-in. `agent-parley budget enforce --tokens N`, with
`--calls` and `--hours` alike, records a run budget: the same readings summed
over every lane of the project, which gates what the service starts. Once it is exhausted no wake, work dispatch, capacity
retry or launch starts, running sessions are asked to checkpoint and stop at
their next hook event, and only `agent-parley budget resume` clears it. Nothing
is killed or discarded; [Operations](operations.md#enforcing-a-run-budget) has
the detail.

## Reservations are advisory

Conflicting reservations grant nothing and name the blocking owner with that
owner's declared reason. Nothing on disk is locked: a reservation is a record
other lanes read, not a filesystem lock.

A reservation can name something that is not a file — `port:5432`, `db:local`,
`suite:integration`, `device:android-1` — because a worktree isolates none of
those; a named resource conflicts on an exact match, and
`agent-parley resources set` declares which ones exist. A granted reservation
also carries a `forecast`: the files that changed together with a reserved path
in at least three of the base checkout's last 500 commits and that a peer holds
right now, each with the peer and the count, so the lane can renegotiate or
sequence before it edits. `issue claim` reports the same forecast from the paths
the issue's earlier pull requests touched when a forge is configured. The
forecast is advisory and never withholds a grant or a claim.

A reservation that declared a time to live is counted apart from the live ones
once that deadline passes, with the age of the oldest, so a lane that died
holding a path reads differently from one still working on it. A lane that is
still working renews its own expired leases at its next tool call; a session
start or a supervisor resume renews nothing. One whose last observation found
no live session or found it idle past the inactive threshold, or whose lease has been expired
longer than the 1800-second grace, has it released to the first lane queued for
that key, and both lanes are told. Reservations stay advisory throughout:
nothing on disk is locked or reverted.

A lane that means to take a contested key next calls `request_reservation`
rather than polling the holder or asking a human to sequence the two. Free keys
are granted exactly as `file_reservation_paths` grants them; a held key is
queued, and the refusal names the holder and the lane's place in that key's
queue. When the holder releases, the first queued lane is granted the key and
receives one notice naming it, in the same store commit as the release, so the
lane is never told it holds a key it does not.
`cancel_reservation_request` withdraws a request, and revoking a lane's
registration expires the requests it left behind. A queued request stays
advisory like the reservation it asks for: it blocks nobody and holds nothing
until that release. `status` names the requests queued on a lane's keys and who
asked; `top` marks the count with `+` beside that lane's leases.

Every refusal, queued or not, is also recorded against its holder for a day.
`status` names the lanes a holder refused a key it still holds, and
`problems` raises a `holding a refused key` row on a holder that is not
active, with how long it has been quiet. A refusal drops out of both once
the holder releases or loses the overlapping lease.

A holder seen quiet while a refusal stands is given a deadline, 900 seconds
(`KEY_HOLD_DEADLINE`), and told once by mail to release the key, hand the
work over, or tell the refused lanes why it keeps it. Activity does not move
the deadline. Once it passes, the `problems` row belongs to the operator as a
decision, the `key_hold` notification is sent, and each refused lane is told
once that the operator decides. Nothing is released for the holder; the
reservation stays advisory.

An operator editing the base checkout is otherwise invisible to a lane until the
merge conflicts. Every `top` and `status` frame reads `git status` of the base
checkout once per project and matches the dirty paths against each lane's active
reservations with the same rule a competing reservation is judged by. A match is
printed under the lane's row, and the lane receives one advisory notice naming
the path, repeated only when the set of paths changes. Nothing pauses, reverts
or locks; reservations stay advisory. `--no-operator-edits` skips the reading
for a repository whose base checkout is always dirty.

The base branch moving under a lane is invisible in the same way. Every `top`
and `status` frame reads the head of the base checkout once per project and
compares it with the point each lane branched from. When it moved, the paths
changed on the base since that fork point are matched against the lane's active
reservations and against the paths the lane itself holds, committed on its
branch or still uncommitted in its worktree. The overlap is printed under the
lane's row, and the lane receives one advisory notice naming those paths,
repeated only when the set changes. Nothing rebases or pauses; the lane decides
whether to rebase, merge or coordinate.

## Mail is scoped, deduplicated and threaded

Sends need an idempotency key, so a retry returns the original message instead
of a duplicate. Every other write takes one too — reservations, releases,
acknowledgements, issue transitions and reports — so a retried call returns the
first result and changes nothing further, and the same key with different
arguments is refused rather than applied. Fetching an inbox never marks a
message read. A send can answer another message, which puts both in one thread,
and a participant can read a thread in order or search its own mail:

```sh
agent-parley mail thread t12
agent-parley mail search "reservation conflict"
```

Mail is private to the lanes it names, which loses an agreement the moment a
third lane needs it. A lane that marks a send as a decision, and an operator
running `agent-parley decide`, records it in one project-wide log instead, and
every registered lane reads that log by text, by recency or over `search_decisions`:

```sh
agent-parley decide "Reservations stay advisory; no lane blocks on one."
agent-parley decision list "advisory" --since 7d
```

Only a marked message is shared. Ordinary mail keeps the scope it always had,
and a decision is capped, deduplicated and spilled to an attachment by the same
rules as any other message.

A lane's send that asks for no acknowledgement and records no decision is routed
by relevance. A base-advance or merge note goes to the project feed alone, and a
broadcast reaches only the lanes whose claim, reserved paths or name it
concerns; every other lane reads it from the feed. A checkpoint delivers an
acknowledgement request first, then mail naming a path the lane reserved, then
mail naming the lane. A completed claim retires the mail its generation sent.
Acknowledgement debt expires: a request past its deadline, or superseded by a
closed claim or a newer message, no longer counts against the lane.

<p align="center">
  <img src="https://cdn.jsdelivr.net/gh/suneel944/agent-parley@main/docs/assets/screenshot-coordination.svg" width="880" alt="A granted reservation, a denied one naming the blocking owner, a deduplicated send, and an inbox page">
</p>

## The work order is a file you can review

Write the issues, the dependencies between them and the groups that may run in
parallel as TOML, then run `agent-parley plan apply work-order.toml` from the
project base checkout; a lane cannot apply a plan. Applying
records the same advisory dependencies `issue block` records and nothing else —
no claim, no assignment, no gate. `plan diff` previews the edges first,
`plan show` prints the plan as a tree with each issue's current owner, and every
apply is versioned by the file's digest, so an edge added by hand afterwards is
reported as exactly that.

A lane that discovers a missing prerequisite or an obsolete edge files a
revision from its worktree: `agent-parley plan propose --base N --add 43:42
--reason TEXT --evidence TEXT`, with `N` read from `plan proposals`. It applies
unattended only inside the envelope the plan's `[revisions]` table declares:

```toml
[revisions]
scope = ["17", "42", "43", "44"]
max_changes = 2
max_revisions = 5
```

Anything outside it, including a prerequisite no plan has authorized yet or an
edge on another lane's claim, waits for `agent-parley plan approve ID` or
`plan reject ID --reason TEXT` and changes nothing meanwhile. A revision only
moves edges; it never claims, completes or verifies work, and an edge revised
back and forth is escalated to the operator rather than flipped again.
`agent-parley problems` shows each escalated proposal with the approve and
reject commands that settle it, and one row for the proposals still pending.

## A peer can record a verdict, and it is still a claim

A report is the reporting lane's own account. `agent-parley report review ID
--verdict pass|fail --evidence TEXT`, and the `review_report` MCP tool, let a
second lane record what it found when it checked that work. The verdict is kept
beside the report it judges, with the reviewer, the instant and the evidence,
and evidence longer than a record's budget is attached exactly as a report's
own evidence is. The report's author is refused: a lane cannot review itself.

`status`, `top`, `report show` and the pull request body `participant pr`
writes all carry the latest verdict, each labelled as the reviewing lane's own
claim about work it did not do. A verdict is not independent verification, it
is not the operator approval `agent-parley approve` records, and it gates no
merge or pull request.

## No lane waits for a human to give it something to do

When a lane holds no claim, its next checkpoint carries the unclaimed work no
dependency blocks — the issues other lanes wait on first — and names the peers
holding more than one claim. When a lane holds several claims and a peer reads
`idle` past the inactivity threshold, that lane is told which peer could take
one. Every offer is checked first against what the host can read without asking
a vendor: the session process, the lane's own client records for a recent
rate-limit or usage-window refusal, the worktree, and the acknowledgements it
owes. Acknowledgement debt is suspended while the lane's state record has held
a state other than starting or working for `inactive_after`, since such a lane
is not reading mail. A lane that fails a check is reported `unfit` with the
failed check named, and no offer names it. `top` shows each lane's `FIT` result
and whether an offer is pending. `issue claim`, `issue accept` and
`issue request` refuse a lane that already holds `max_claims_per_lane` claims
(2 by default). Nothing is claimed for anyone: `issue offer` stays the only
transfer path, and the recipient still accepts or declines.

A lane that owes a turn is woken by the state its record holds. A starting,
working or reclaimed lane is never woken, a blocked one is deferred under its
cause, an idle one is asked for a turn, and a stopped or dead one is resumed on
its recorded session. Attempts back off from `inactive_after`, doubling up to
one hour, and stop after three without progress. A retired or paused lane, and
one stopped by a host restart, is not woken;
[Operations](operations.md#availability-reminders-and-waking) has the detail.

A lane waiting on its own pull request is woken with one supervisor message when
its checks finish, a review lands or its merge state changes; see
[pull-request wakes](operations.md#availability-reminders-and-waking). A claim
whose verification keeps failing is asked once to change approach and, if it
still does not converge, escalated to you with the handoff commands, never
moved; see [non-convergence](operations.md#availability-reminders-and-waking).
The supervisor's work offers above stay advisory, are checked against the
lane's fitness first, and are revalidated before a wake delivers them; see
[supervisor offers](operations.md#availability-reminders-and-waking). A ready
lane whose issue is listed in the project's recorded unattended policy can be
integrated with `unattended run`, an operator command, on the same gate and
approval terms as `participant merge`; see
[Running unattended](lanes.md#running-unattended).

## The forge is selectable per project

`github` speaks through `gh` and is the default; `beads` speaks through the `bd`
CLI and is detected when the repository carries a `.beads/` ledger; `null` keeps
issue numbers bare and calls nothing. `agent-parley forge set NAME` overrides
detection. Every forge exchange is best effort and never decides ownership, and
`participant pr` refuses in one sentence under a forge that opens no pull
requests.

## Your history stays yours

A lane branch is `parley/PROJECT_KEY/lane-N`: it carries no participant,
provider or account name, and `agent-parley branch set PREFIX` changes the
prefix per project. No lane signs its work either. A commit, merge, tag or pull
request that credits an assistant, names a vendor or model in an authorship
position, or carries a generator signature is denied before it lands, and every
commit an integration would carry is scanned again at `participant merge` and
`participant pr`. There is no flag that skips either check, on any repository or
for any provider. Which assistant did the work stays in coordination state,
where `top` and `status` read it.

## Ownership history is queryable

`agent-parley history issue 42` lists every claim, handoff, reservation, message
and report that touched it, with how long each participant held it;
`history participant NAME` does the same for one lane, and `history claim ID`
follows one claim through to the pull request that ended it. Every claim carries
its own identifier, minted again on each claim and each accepted handoff, and
every record made while it is held carries that identifier. It reads only: no
lock, no rewrite, and a record older than the correlation reports `unknown`
rather than being given an invented one.

That history is bounded, and it can leave the state directory. A lane keeps two
event files and discards records older than fourteen days, so `top` reports
recent enforcement rather than the whole project. `--since` narrows any count to
a window, and `events export` writes the retained records as JSON Lines you can
keep for as long as you need:

```sh
agent-parley top --since 6h
agent-parley events export --since 7d --output enforcement.jsonl
```

## The whole state directory can leave the machine

`agent-parley state export --output PATH` snapshots the store through the SQLite
backup interface while the project locks are held briefly and packs it with the
manifests, ledgers, activity files, retained event and report logs and
attachments; the manifest names the schema, the export time and a SHA-256 digest
per member. Registration tokens, credential profiles and native MCP
configurations are never archived. `state show PATH` lists what an archive
holds, and `state import PATH` restores it into an empty state directory,
validating every member first and refusing traversal, links and a newer schema;
`--merge` adds projects beside existing ones and refuses a collision. Imported
participants register again on their next `run`, and the import lists every lane
path that does not exist here so the operator can recreate the worktree.

```sh
agent-parley state export --output parley.tar.gz --project ~/src/app
agent-parley state show parley.tar.gz
agent-parley state import parley.tar.gz --merge
```

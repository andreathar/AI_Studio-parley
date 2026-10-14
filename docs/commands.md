# Commands

`agent-parley` with no arguments prints a short start-here screen: whether
the working directory is a Git repository and whether it is clean, whether
it belongs to a registered project, which supported native CLIs (`claude`,
`codex`) are on PATH and whether each one's plugin record lists the Agent
Parley plugin, and whether the service is running, followed by the next one
to three commands for that state. It only reads: it never starts the
service, registers a repository, creates the state directory or runs a
native CLI, and it prints plain text with no color. The plugin reading comes
from each CLI's own record (`installed_plugins.json` under
`CLAUDE_CONFIG_DIR`, the `plugins` table of `config.toml` under
`CODEX_HOME`) to stay fast; `plugins status` asks the CLIs themselves and is
the authoritative reading.

For a registered project whose service runs, the screen also reads what
`agent-parley problems` would list, from the readings supervision cached
rather than a fresh forge poll. A `Needs you` line gives the count and the
two most urgent rows, and `agent-parley problems` then leads the next
commands. When no outbound notification transport is configured and the
project has lanes, a `Notify off` line appears with `agent-parley notify
setup`. A project with nothing pending shows neither line.

Use `agent-parley --help` for the full command list, led by a start-here
group (`run`, `status`, `top`, `problems`, `demo`, `doctor`) and then grouped
as coordination, policy, observability and lifecycle, and
`agent-parley COMMAND --help` for arguments. `--home DIR` selects private
state globally;
repository commands accept `--repo PATH` unless noted below. `problems`,
`doctor` and `metrics` take no `--repo`, and `state export` and
`state import` select one project with `--project ROOT`. Issue mutations,
reports and lane mail resolve identity from the current lane. `say` and
`issue assign` act as `operator` from any checkout of the repository.

Each operation has one canonical spelling, used throughout the docs, skills
and generated remedies: `say` sends an operator message and `gc` reclaims
landed lanes. `mail send` and `reclaim` remain compatibility aliases with the
same arguments and behavior. Similar names that do different things stay
separate: `decide` records a decision while `decision` reads them back, and
`status` prints one table, `top` draws the live dashboard and `watch` follows
one lane's event stream.

`--repo` is the repository selector everywhere, `status` and `top` included.
Both still accept `--project` for one release; it is undocumented in their
help and will be removed.

`top` is the dashboard: every lane at once, redrawn, or one frame with
`--once` or `--json`. `watch NAME` is the event stream: one lane's
coordination events as they are recorded. Reading history follows one shape
in all three places that keep it — `history`, `events` and `state` each show
on standard output and export to a file.

## Command reference

| Command | Purpose |
| --- | --- |
| `--version`, `-V` | Print the installed version and exit. |
| `version` | Print the installed version and the state directory in use. |
| `up` | Start the local coordination server. |
| `down` | Stop the server while retaining state and worktrees. |
| `completion SHELL` | Print a `bash`, `zsh` or `fish` completion script generated from the installed command tree. |
| `demo` | Run the coordination story in a throwaway sandbox: a temporary Git repository, a temporary state home and a service on a free port, with two stub lanes that claim in parallel, meet a reservation collision and a hook refusal, hand off an issue and appear in a `top` snapshot. Each step prints one line naming what happened and the real command behind it. No native CLI, model, network or account is used, and the user's state home, repositories and running service are never touched. It finishes by itself in well under 90 seconds; `q` or Ctrl-C stops it early, and every exit removes the worktrees, processes and temporary directories it created. Without a terminal it prints the same story as plain lines. `make demo-stub` renders the full recording from the same scenario; `python scripts/record_demo.py --short` writes the four-step cut to `docs/assets/demo-short.svg`, and `--video` writes the launch video's frames to `docs/video/frames.js`. The README shows the launch video, not these SVGs. |
| `status` | Show server health, whether the running service is behind the installed code, and the open work of the project the working directory belongs to, each lane's condition read from its authoritative state record; `--all-projects` reports every project with dormant ones last, `--table` prints the full per-lane table instead, and `--all` also lists claims whose issue or pull request ended on the forge. A lane that is dead, holds no claim, has no live process and whose last report and activity are older than the project's supervision setting `fold_after` (86400 seconds, 24 hours, by default) is left out of the lane table and counted on one line such as `3 dead lanes older than 24h hidden; --all shows them`; `--all` lists those lanes too. A dead lane still holding a claim always stays. `NAME` reports one lane in full, and `--repo`, `--provider`, `--outcome`, `--drifted`, `--pending`, `--idle`, `--since`, `--over-budget` and `--issue` narrow the rows; a named lane or any lane filter prints the table. |
| `setup PATH` | Register a repository from committed HEAD. |
| `run NAME` | Launch a lane; supports `--provider`, `--credentials`, `--repo`, and `--task`; `--resume` reopens the lane's recorded native session, or starts a fresh one after a ready or blocked report while the `rotate` supervision setting is on ([Running lanes](lanes.md#running-unattended)); `--issue N` claims issue N for the lane and opens with a bounded digest of it read from the forge ([Running lanes](lanes.md#starting-on-an-issue)); `--blueprint B` with `--issue N` also starts the claim on blueprint `B`, and without it a `blueprint default` for one of the issue's labels applies ([Running a claim through a blueprint](lanes.md#running-a-claim-through-a-blueprint)). |
| `top` | The dashboard of live lanes; `--once` prints a snapshot, `--interval` sets refresh seconds, `--provider`, `--repo`, `--participant` and `--since` filter it, `--sort`, `--reverse` and `--columns` shape it; `--no-operator-edits` skips reading a base checkout that is always dirty for operator edits on reserved paths; `--all` also shows stopped lanes holding nothing and projects whose root is gone, which the header otherwise only counts. |
| `title` | Print the current lane's name, state and claim progress for a native status line; prints nothing outside a lane. |
| `metrics` | Export the live counters and gauges as Prometheus text or `--json`; `--output` writes a file atomically and `--every` rewrites it; `--provider` narrows the lanes and `--since` bounds the enforcement history counted. |
| `report` | Record `--state`, `--summary`, and required `--remaining` or `--evidence`; `--backlog COUNT` states the work units left on the claim, which is what lets the supervisor offer a split once the lane goes idle on it; `--issue` binds the report to one owned issue, `--resume-on N` resumes a blocked report once that issue completes, `--until SECONDS` sets the seconds until the lane's next check and is required with `--state waiting`, capped by the project's wait deadline, and `--idempotency-key` makes a retry safe. |
| `report show ID` | Print one report this lane recorded, the latest verdict a peer recorded against it, and with `--full` the whole attached evidence. |
| `report review ID` | Record this lane's `--verdict pass\|fail` on another lane's report with the `--evidence` it checked. The report's own author is refused. A verdict is the reviewing lane's own claim about work it did not do, not independent verification, and it approves nothing. |
| `say NAME TEXT` | Send as `operator`; `--subject` sets the inbox subject line, `--ack` requests acknowledgement, `--within 15m` records a deadline for it that only reads overdue, and `--key` controls deduplication. |
| `say NAME TEXT --after 30m` | Record the message for later; `--at 18:00`, `--when-released N` and `--unless-reported` set the trigger, and `--every 1h --until 18:00` records a bounded repeat. |
| `issue list` | Show claims, dependencies and handoff offers; each offer carries the offering lane's head commit, the reservations that move with it and its remaining work. |
| `issue show NUMBER` | Show one issue: its owner, deadline, attempts, blockers, pending offer, the reservations its owner holds, its convergence account for the current claim and its recorded history. |
| `issue next` | Rank the unclaimed, unblocked issues this lane could take next, each with the reason for its place: the plan group already under way, the issues it unblocks, the peer reservations and forecast collisions its likely paths run into, and the provider it declares. It claims nothing; `--limit` bounds the list. |
| `issue match GOAL` | List the open issues whose recorded title or forge labels share subject words with a stated goal, marking the ones a peer already owns and naming the peer reservations those words run into. It is read only: a match is a reason to read the issue and claim or negotiate for it rather than open a second number for the same work, and no match is a recorded reason to open one. |
| `issue claim NUMBER` | Claim an available issue from this lane. `--within 6h` on `claim`, `offer` or `accept` records a deadline; past it the record reads overdue, and ownership never moves on a deadline. |
| `issue claim NUMBER --take-orphaned` | Take an issue whose owner reads as orphaned, recording the previous owner and the reason and moving the reservations that owner held for this claim to the taking lane; reservations for its other claims stay with it. |
| `issue request NUMBER` | Ask the holder of an owned issue to hand it to this lane; `--summary` says why, and `--within 30m` records a deadline; past it the request reads overdue and shows in `problems`, but is granted only by the project's `takeover_grace`. The holder answers with `issue accept` or `issue decline`, and a holder that neither answers nor records progress within `takeover_grace` has the request granted as an offer to this lane. |
| `issue release NUMBER` | Release ownership without closing the GitHub issue. |
| `issue offer NUMBER --to NAME --summary TEXT` | Pause work and offer ownership explicitly; `--remaining ITEM`, repeatable, lists the work still to do, and `--when-released N` records it until that issue is released. |
| `issue accept NUMBER --offer-id ID` | Accept the current offer addressed to this lane; the offered reservations move with the issue. |
| `issue decline NUMBER --offer-id ID` | Decline the current offer addressed to this lane. |
| `issue cancel NUMBER` | Cancel this lane's pending handoff offer. |
| `issue assign NUMBER NAME` | Offer an issue to a lane as `operator`; `--reason` travels with the offer and `--unassign` withdraws one no lane accepted. |
| `issue recover NUMBER --reason TEXT` | As `operator`, approve stopping the live owner of a claim once a matching exhausted-capacity observation is published; the approval alone moves nothing. Refused outside the base checkout, and from any process carrying a lane's `AGENT_PARLEY_TOKEN`. |
| `issue resolve NUMBER` | End a claim whose holder never filed the completion its pull request already landed, as `operator` and never as the lane. The forge is read at that moment: the issue must have closed inside the current claim, with its closing pull request recorded whichever branch it came from, or, when the forge cannot say, the lane branch pull request must have been opened inside it, and the supervisor must already have escalated the claim as an unresolved completion, so an answering holder is never resolved out from under it. `--reason` is kept beside the recorded evidence, and `--release` returns the work to the queue instead, which a pull request closed without merging requires. |
| `issue block NUMBER --on NUMBER` | Record an advisory issue dependency. |
| `issue unblock NUMBER --on NUMBER` | Remove a recorded dependency. |
| `plan apply PATH` | Record a TOML work order as advisory dependencies, from the project base checkout only; `plan diff PATH` previews it. |
| `plan show` | Print the applied plan as a tree with owners; `--json` prints it for scripts. |
| `plan propose --base N --add I:B --remove I:B --reason TEXT` | File a revision of the applied plan's edges against plan version `N`: `--add` records a discovered prerequisite, `--remove` drops an obsolete edge, each repeatable, with up to five `--evidence TEXT`. A lane's revision applies at once only inside the plan's `[revisions]` envelope; otherwise it is kept, changing nothing, with the `plan approve` command that applies it. |
| `plan proposals` | Print the current plan version, the envelope, the automatic revisions used and every retained proposal with its status. |
| `plan approve ID` | As `operator`, validate the whole resulting graph and apply one open revision, authorizing any prerequisite it adds; a revision whose base version is no longer current is recorded as stale; an optional `--reason` is kept with it. `plan reject ID --reason TEXT` refuses it. |
| `gc` (alias `reclaim`) | Report the lanes and lane-made worktrees a reclaim would remove and keep, with each worktree's size; `--dry-run` is that default, `--apply` removes them, and `--apply --force` also removes lane-made worktrees kept for uncommitted changes, unpushed commits or a recent change after writing a recovery checkpoint of each; a lane's own worktree is never forced. A lane-made worktree holding files Git ignores is kept even with `--force`, and a quiet one whose unpushed commits already landed through another branch is removed without it, its commits bundled into a recovery checkpoint first. `gc --project ROOT` instead reports the removal of the private state of a project whose root checkout is gone, and `--apply` removes it; it refuses while the root exists, while any lane's session process may still run, or before the service has retired the project. Its recovery checkpoints move to `recovered/` under the state root unless `--yes` deletes them too. |
| `notify setup --chat ID` | Store the Telegram chat id, owner-only; `--inbound` also answers status queries from that chat. The bot token, and with `--inbound` the passcode, are read from a prompt or standard input. |
| `notify test` | Send one test message on each configured transport. |
| `doctor` | Report the launcher, plugin, store and service components and their fit, plus `projects` (registered roots that no longer exist), `notify` (whether outbound and inbound notification are active), `approvals` (lanes lacking the resume opt-in) and the host platform; non-zero exit on a version mismatch, a missing project root, or a notification transport configured but unable to send. A setup gap under `approvals` and notification that is simply off leave the exit at zero. |
| `plugins install` | For each of `claude` and `codex` found on PATH, add the `suneel944/agent-parley` marketplace and install `agent-parley@agent-parley` through the CLI's own plugin commands, only where its listing lacks them; a re-run refreshes the marketplace and updates the plugin instead, never adding a second entry. Non-zero exit when a detected CLI's command fails. |
| `plugins status` | Report, per supported CLI, whether it is on PATH, has the marketplace and has the plugin installed; writes nothing. |
| `problems` | List every lane, claim and store condition that needs attention, oldest first, one row per lane per cause with its count and the remedy the lane's state allows, except that two or more lanes of one project lacking the resume opt-in share one project row naming them; rows the supervision service is handling say so, `--ack-after` sets the acknowledgement age, `--json` prints it for scripts, exit 1 when any listed row exists. A row older than `fold_after` that belongs to a lane `status` folds out as long dead is left out and counted on one closing line such as `5 dead-lane problems older than 24h hidden; --all shows them`, and the JSON document counts it as `folded`; a live lane's problem is always listed, and `--all` lists every row. |
| `problems ack ID` | Record your own acknowledgement of one message a lane left unanswered. It clears that condition and nothing else: no ownership moves, no reservation is released and no lane is woken. |
| `issue ... --idempotency-key KEY` | Retry a transition safely; the repeat returns the first result. `issue claim`, `release`, `offer`, `accept`, `decline`, `cancel`, `block`, `unblock` and `request`, and `report`, accept it; `issue recover`, `resolve` and `assign` do not. |
| `participant list` | List the project's lanes and their identities. |
| `participant show NAME` | Show one lane: its branch, worktree, provider, account profile, advisory budget, current claims, reported outcome, last coordination, and how long its last launch took to reach the native CLI, split into worktree, `init` and CLI start. |
| `participant add NAME` | Create a lane with an optional provider and credential profile. For a `claude` lane with no bridge tool approval recorded it warns that a service resume would stop at an unseen permission prompt and names `agent-parley approval resume --bridge-tools on` as the opt-in. |
| `participant restore NAME` | Restore the assigned branch while preserving work. |
| `participant retire NAME` | Retire a lane that is no longer working while preserving recoverable work. Its issue claims return to the pool, its reservations are released and granted to queued peers, and mail it has not read or acknowledged is marked superseded. A lane holding ready work awaiting integration is refused before anything is removed. Lists the ignored files removing its worktree deletes and asks first; `--yes` skips the question. |
| `participant pause NAME` | Refuse a lane's calls and tool use; keep its session and claims. |
| `participant resume NAME` | Let a paused lane act again. |
| `participant stop NAME` | End a lane's session from the base checkout; keep its claims. |
| `participant restart NAME` | Start a crashed, wedged or stopped lane again; keep its uncommitted work. `--task` is the new session's opening instruction. |
| `participant merge NAME` | Run the configured gate and merge; `--preview` only inspects. A lane holding several claims merges its only ready one; `--issue N` names the claim when several are ready. `--all` integrates every lane reported ready in recorded dependency order and `--group NAME` one group of the applied plan, each stopping at the first refusal or failure. A failed or interrupted integration is recorded and holds further merges until the lane holding its issue retries it; `--renew-recovery` grants a recorded integration three more attempts, and `participant merge --verify-recovery` (no lane name, base checkout only) runs the recorded gate on the base as it stands and clears the record only if it passes and leaves the tree clean. |
| `participant pr NAME` | Push the lane branch and open or locate its pull request. |
| `participant budget NAME` | Show or set the lane's advisory `--tokens`, `--calls` and `--hours` limits; `0` removes one. Crossing a limit marks the lane and stops nothing. |
| `... --all --provider N --outcome S --drifted --idle --over-budget` | Select several lanes for one `say`, `issue assign`, `participant stop/pause/resume/pr/merge`; one plan and one confirmation, `--yes` to skip it. |
| `approve NAME` | Record your approval of a lane's current ready report. |
| `reject NAME REASON` | Record a rejection and deliver the reason to the lane. |
| `approval show` | Show which steps require a recorded approval first. |
| `approval set [STEP ...]` | Require an approval before `merge`, `pr`, both, or none. |
| `approval resume [--bridge-tools on\|off] [--auto-mode on\|off] [--participant NAME]` | Show or record whether the service may resume a `claude` lane without a terminal. |
| `provider list` | List built-in presets and local overrides. |
| `provider show NAME` | Show one provider definition with the hooks its adapter cannot serve. |
| `provider add NAME` | Define a provider; warn when shadowing a built-in preset. |
| `provider remove NAME` | Delete a local definition, restoring a shadowed preset. |
| `provider budget NAME` | Show or set the advisory limits every lane on that provider inherits. |
| `credentials list` | List native account profiles. |
| `credentials show NAME` | Show one profile with every recorded value redacted: the config home, the override names and the variables required from your shell. |
| `credentials add NAME` | Define a config home and environment requirements. |
| `credentials remove NAME` | Delete a profile definition, preserving native files and logins. |
| `branch show` | Show the prefix new lane branches are created under and the recorded integration base. |
| `branch set PREFIX` | Set that prefix; existing lanes keep their branch. |
| `branch integration BRANCH` | Record the non-default branch a milestone's pull requests merge into, operator-only; a pull request merged there that closes a claimed issue lands the claim. An empty string removes it. |
| `forge show` | Show the issue tracker this project coordinates over. |
| `forge set NAME` | Select `github`, `beads` or `null`; only `github` opens pull requests. |
| `resources show` | Show the named resources lanes may reserve. |
| `resources set NAMES` | Declare them; an empty string accepts any well-formed name. |
| `deadlines show` | Show this project's deadline and attempt defaults. |
| `deadlines set` | Set `--claim`, `--offer`, `--request`, `--ack` windows and `--attempts`. |
| `budget show` | Show the advisory token, call and hour limits every lane of this project inherits. |
| `budget set` | Set `--tokens`, `--calls` and `--hours` project defaults; a budget informs and does not gate. |
| `budget enforce` | Show or set the opt-in run budget: aggregate `--tokens`, `--calls` and `--hours` across every lane; `0` removes one. Once used up, no wake, dispatch, retry or launch starts. A usage limit, not a billing cap. For the operator; refused from a lane's environment by accident guard, not enforcement. |
| `budget resume` | Clear an exhausted run budget; refused while still over a limit. `--reset` starts a new accounting period. For the operator; refused from a lane's environment by accident guard, not enforcement. |
| `verify show` | Show the project's configured pre-merge command. |
| `verify set COMMAND` | Set that command; an empty string removes it. |
| `unattended show` | Show the unattended integration policy, or that integration is operator-only. |
| `unattended set ISSUE ... --target BRANCH` | Authorize unattended integration of those issues into `BRANCH`; no issues removes the policy. Base checkout only. |
| `timeout show` | List every decision kind with its class, recommended default and the timeout the project policy leaves it. |
| `timeout set KIND [--ask \| --after WINDOW]` | Make a reversible kind always ask, or wait longer than 30 minutes; neither flag restores the default. Irreversible kinds always ask. Base checkout only. |
| `unattended run NAME` | Integrate one eligible lane under the policy on `participant merge` terms, recording the decision or the refusal; `--issue N` names the claim when the lane holds several ready ones. Base checkout only. |
| `init show` | Show the command every new lane runs before it starts. |
| `init set COMMAND` | Set that command; an empty string removes it. |
| `pool show` | Show how many prepared spare worktrees the project keeps and each spare's state; `--json` prints it for scripts. |
| `pool set N` | Keep N spare worktrees, from 0 to 8, cut from the project base with `init` already run, and start a detached fill; `run` takes a ready spare instead of creating a worktree. Base checkout only. |
| `pool fill` | Prepare the missing spares now and remove stale ones, in the foreground. |
| `blueprint list` | List the recorded blueprints, each as its node order. |
| `blueprint show [NAME]` | Show one blueprint node by node with its success and failure edges and retry limit, or list them all. |
| `blueprint set NAME FILE` | Record or replace a blueprint from a JSON file (see [Running a claim through a blueprint](lanes.md#running-a-claim-through-a-blueprint)). Base checkout only. |
| `blueprint remove NAME` | Remove a recorded blueprint. Base checkout only. |
| `blueprint run NAME BLUEPRINT --issue N` | Start lane `NAME`'s claim on issue `N` on a blueprint and run its nodes until one waits on the lane or the run ends. Base checkout only. |
| `blueprint advance --issue N` | Move that run on now; deterministic nodes run, an agent node passes on a ready report and fails on a blocked one, and a `wait-ci` node reads the last check verdict. `supervise` does the same each poll. Base checkout only. |
| `blueprint progress [--issue N]` | Show each run's status, current node and nodes passed; `status`, `top` and `watch` show the same for claims with a run. |
| `blueprint default LABEL [BLUEPRINT]` | Make `run NAME --issue N` start `BLUEPRINT` on an issue labelled `LABEL` when `--blueprint` is absent; without `BLUEPRINT`, remove the label's default. Base checkout only. |
| `mail show ID` | Print one message this lane sent or received; `--full` adds the whole attachment. |
| `mail thread ID` | Read this lane's messages in a thread; `--after-id` pages forward. |
| `mail search QUERY` | Search this lane's mail with an optional `--limit`. |
| `mail list` | List this lane's mail newest first, with the same `--limit` as a search and no query to write. |
| `mail ... --as NAME` | Read `mail show`, `mail thread`, `mail search` and `mail list` for one lane from the main checkout, so an operator opens a message `problems` cites without changing directory. It reads only: nothing is sent, acknowledged or marked read for that lane. |
| `mail send NAME TEXT` | Compatibility alias of `say`, the canonical spelling, kept under `mail` with the other mail verbs; every `say` flag applies. |
| `decide TEXT` | Record one decision every registered lane can read; `--subject` names it and `--key` deduplicates it. |
| `decision list [QUERY]` | List or search the decisions recorded for this project; `--since` bounds their age and `--limit` the page. |
| `mail pending` | List operator messages and offers recorded but not delivered, and each orphan decision waiting on the operator. |
| `mail cancel ID` | Remove one recorded operator item before it is delivered. |
| `history issue N` | List every record that touched an issue, with each holding. |
| `history participant NAME` | List everything one lane filed. |
| `history claim ID` | Follow one claim to the pull request that ended it. |
| `history ... --kind K --since W` | All three `history` readings take a repeatable `--kind`, plus `--participant`, `--provider`, `--issue` and `--since` to narrow the records, and `--output FILE` to export the same reading as one JSON document. |
| `events show` | Print the retained records as JSON Lines on standard output; filter by `--participant` and `--since`. |
| `events export` | Export JSON Lines; filter by `--participant` and `--since`, or write `--output FILE`. |
| `state export --output PATH` | Write the whole state directory, or one `--project ROOT`, as one tar archive with a hashed manifest and no credentials. |
| `state show PATH` | List an archive's projects, participants, issue counts and export time without importing it. |
| `state import PATH` | Restore an archive into an empty state directory; `--project ROOT` restores one archived project, and `--merge` adds projects beside existing ones and refuses a collision. |
| `watch NAME` | Follow one lane's coordination events as a stream; `--since` widens the backlog, `--kind` narrows it, `--interval` sets the seconds between reads, `--json` prints JSON Lines. The agent's conversation is never shown. |

## Machine-readable output

These read-only commands also accept `--json` and print exactly one JSON
document, so a script, a shell prompt or another agent reads coordination state
without parsing a table: `status`, `top`, `version`, `doctor`, `problems`,
`issue list`, `issue show`, `issue next`, `issue match`, `participant list`,
`participant show`, `mail show`, `mail thread`, `mail search`, `mail list`,
`mail pending`, `decision list`, `report show`, `history issue`,
`history participant`, `history claim`, `plan diff`, `plan show`,
`plan proposals`,
`approval show`, `verify show`, `init show`, `branch show`, `forge show`,
`deadlines show`, `budget show`, `resources show`, `state show`,
`provider list`, `provider show`, `credentials list` and `credentials show`.
The commands that change something print their outcome the same way with
`--json`: `up`, `down`, `setup`, `run`, `say`, `decide`, `mail send`,
`mail cancel`, `approve`, `reject`, `report review`, `problems ack`,
`plan propose`, `plan approve`, `plan reject`,
`notify test` and `gc`. `top --json` prints one frame and exits;
`metrics --json` prints the same values as its Prometheus text.
The document carries the identifiers the table abbreviates — offer, message and
thread IDs — with every time in RFC 3339, and no credential value. A pending
handoff carries its structured fields there too: the offering lane's head
commit, the reservations that move on acceptance, and the remaining work.
Field names are documented in
[Operations](operations.md#machine-readable-output) and carry the same stability
promise as the flags. `events export` and `watch --json` stay JSON Lines,
because each is a stream rather than a snapshot. A runtime failure under
`--json` adds a one-line `error` document on standard output and still exits
1; an argument the parser rejects exits 2 with usage on standard error. See
[Operations](operations.md#machine-readable-output) for the error contract.

Without `--json`, `decision list` prints one row per decision — its ID, time,
sender and subject — with a one-line body preview, and `provider show` and
`credentials show` print one labeled field per line, identity first. An empty
log or an empty field is stated in words. On a terminal narrower than a line,
the line is clipped with `…` and a closing hint names `--json` for the full
values; a pipe or a file receives every value in full. Credential values stay
redacted in both modes.

## Refusals

A command that refuses prints one shape on standard error: what was refused
and why, then, when one command resolves it, a `next:` line naming that
command exactly:

```text
agent-parley: Unknown credential profile 'work'. Define it with `agent-parley credentials add`.
next: agent-parley credentials add work
```

The `next:` line is the command to run, with the refusal's own values filled
in; an uppercase word such as `CHAT_ID` marks a value only the operator knows.
A refusal with no single resolving command, such as a missing native CLI,
prints the message alone. Exit codes do not change: a refusal still exits 1.
Under `--json` the `error` document keeps its `type` and `message` fields
unchanged and carries no `next:` text. An MCP tool refusal a lane receives
ends on the same `next:` line.

Refusals that name a command include a dirty lane
(`git -C LANE add -A && git -C LANE commit -m wip`), a dirty base checkout
before integration (`git -C ROOT stash push --include-untracked`), an
unregistered repository (`agent-parley setup .`), a command run from the main
checkout instead of a lane or a participant that is not in the project
(`agent-parley participant list`), an issue owned by a peer
(`agent-parley issue request N`, or `issue claim N --take-orphaned` for an
orphaned owner), an issue offered to the caller (`agent-parley issue accept N
--offer-id ID`), a service that is running but unhealthy, including one
answering from code the checkout no longer holds (`agent-parley down`), a
missing store (`agent-parley up`), an unknown credential profile or provider,
a lane off its branch (`agent-parley participant restore NAME`), an exhausted
run budget (`agent-parley budget resume`) and a plugin on another protocol
(`agent-parley plugins install`, then restart any lane already running on the
old plugin). A repository command run outside a Git checkout refuses with
`not inside a Git repository; pass --repo PATH or run from the checkout`.
Inside a lane, the hook refuses an Agent Parley CLI call chained with a
variable, `cd`, `;`, `&&`, `|`, a redirect or a second command, because only
the plain `agent-parley ARGS` form is pre-approved; run each command alone
from the worktree. New refusals follow the same shape by raising
`BridgeError(message, next_command=...)`; a test parses every suggested
`agent-parley` command against the real command tree.

## MCP tools

Authentication supplies the lane identity; tool arguments cannot select another
participant or project. Reservations are advisory, not filesystem locks.

| Tool | Purpose |
| --- | --- |
| `send_message` | Send to peers using an idempotency key; optionally join a thread or require acknowledgement. |
| `fetch_inbox` | Page inbox metadata and optional bodies; filter with `unread` or `unacknowledged`. |
| `wait_for_message` | Wait up to `timeout_seconds` for the next mail matching the same filters, plus `thread_id`; an expired wait is empty. |
| `mark_message_read` | Explicitly mark a received message read; takes an optional `idempotency_key`. |
| `acknowledge_message` | Explicitly acknowledge a reviewed message; takes an optional `idempotency_key`. |
| `file_reservation_paths` | Reserve advisory path patterns and report conflicts; takes an optional `idempotency_key`. |
| `request_reservation` | Reserve the same keys, queueing for each one a peer holds instead of failing; the refusal adds `queued` entries naming the request, the holder and the place in that key's queue. Takes an optional `idempotency_key`. |
| `cancel_reservation_request` | Withdraw one queued request by `request_id`, or every queued request of this lane when none is named; takes an optional `idempotency_key`. |
| `release_file_reservations` | Release reservations owned by this lane; a released key another lane queued for is granted to the first of them and that lane is sent one notice in the same store commit. Takes an optional `idempotency_key`. |
| `list_participants` | Discover addressable identities, tasks and last coordination times. |
| `read_thread` | Page messages this lane sent or received in one thread. |
| `search_messages` | Search only messages this lane sent or received. |
| `search_decisions` | Search decisions any lane recorded for this project, whoever sent or received them; an empty query lists the newest and `since` bounds their age. |
| `next_issues` | Rank the unclaimed, unblocked issues this lane could take next, with the reason for each; `limit` bounds the list. It claims nothing, so the chosen issue is still taken by an explicit claim. |
| `retire` | Retire this lane from the project when it has nothing left to do. Every issue it holds is released back to the pool and every handoff offered to it is declined, so the offering lane owns that work again; each lane that had handed it work is told by mail. Its advisory reservations are released, any key a peer queued for is granted, its worktree is removed when Git reports it clean and kept with its changed paths reported when it is not; files Git ignores keep it too, listed the same way, because removing the worktree would delete them. The listed paths stop where the result would pass its 8 KB budget and `dirty_count` carries the full number, so a checkout full of untracked files never produces a reply the client cannot show. Its credential is invalidated last. The lane is then never woken, never relaunched by the service and never named as a peer work could move to. Only the operator returns it to service, with `agent-parley participant add`. |
| `review_report` | Record this lane's `verdict` of `pass` or `fail` on the peer report named by `report_id`, with the `evidence` it checked. The report's own author is refused. A verdict is that lane's own claim about work it did not do: it is not independent verification, it approves nothing and it gates no integration. |

`send_message` also takes a `decision` flag. A message marked that way is
additionally recorded in the project's decision log, which every registered
lane searches with `search_decisions`, so a third lane learns an agreement it
was never addressed in. Nothing else widens: mail without the flag stays
readable by its sender and its recipients alone, and a decision obeys the same
body cap and attachment rules as any other message.

`send_message` takes an optional `topic` of at most 80 characters. A newer
message on the same topic supersedes the recipient's unread older one, and
`status` counts unread mail per topic. A project note such as `Merged #12` goes
to the project feed instead of any mailbox, and a broadcast to every live lane
reaches only the lanes it concerns; the result lists the others as `withheld`.

Inbox rows include `read_ts` and `ack_ts`. Fetching changes neither. Both
filters can be combined; `unacknowledged` selects messages that requested an
acknowledgement and have not received it. The result budget is 8,192 UTF-8
bytes.

`wait_for_message` returns that same page as soon as one message matches, so a
lane that asked a peer a question can hold its turn instead of polling. The
requested `timeout_seconds` is clamped to a 120-second service ceiling, and the
result reports the wait actually held and whether it expired. An expired wait
returns an empty page: no error, no event and no receipt changed. A wait
occupies no worker slot while it sleeps, so waiting lanes cannot starve the
service of the sends they are waiting for; a pause, a revoked registration or a
stopping service ends a wait at once.

## What does not fit in a message

A message body above 4,096 UTF-8 bytes, a report or review `--evidence` above
4,096 or a
handoff summary above 2,048 is neither refused nor truncated: the whole body is
kept as an attachment under the private state directory and the record carries
the first bounded slice ending with `[attachment message-12: 20480 bytes]`. The
peer's checkpoint notice stays within its 1,536-byte budget and ends with that
reference. Nothing is delivered whole automatically; the reader prints it with
`agent-parley mail show ID --full` and `agent-parley report show ID --full`. One
attachment is capped at 65,536 bytes, a lane holds at most 1 MiB of them, and an
attachment is removed when its record is pruned or its offer is declined,
cancelled, released, completed or resolved. A full allowance releases the
lane's oldest message attachments that every recipient has read; `--full`
then says the body was released and the message keeps its first slice.

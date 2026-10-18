# Human-paired temporary Movies session

This entry prepares and serves only project
`768a8625-61c5-4578-a952-40c0ad20e462`, cycle
`45b2aea4-b477-4be0-8ada-9cdb04392bee`, actor `producer-andre`. Preparation
was approved by Andre in `Sentinel_6f73e0004a3881918e0313f1925a8ba3` on
18 October 2026. That approval covers preparation and isolated testing; it does
not authorize stopping the existing application or using port 3000 now.

The real entrypoint is `workflow-local.ts`. It reads no .env, native Parley token
or Cloudflare credential. Its fixed runtime directory is:

`/home/athar/.local/state/movies-workflow/projects/768a8625-61c5-4578-a952-40c0ad20e462/`

`prepare` creates a new directory only, `workflow.sqlite3`, immutable initial
`selection-v1.json`, `gate-contracts-v1.json`, and two private backup/rehearsal
files. It pins the current Movies Git HEAD, registry hash and policy hash without
importing historical tasks, approvals or media. The new cycle starts draft at
graph 1/state 0 with C01–C07 planned, one producer record and no assignments.
A partial failure is preserved for inspection; rerunning never overwrites it.
`inspect` reads this new database without obtaining a writer.

From `/mnt/data/Projects_SSD/AI_Studio-parley`, in a human-owned terminal:

```sh
node --import tsx workflow-local.ts inspect
node --import tsx workflow-local.ts serve --port 0 --expected-version 0
```

The second command selects an unused 127.0.0.1 port and prints a URL without a
credential. It requires interactive stdin/stdout and starts **unpaired**. It does
not activate the draft. A noninteractive launch fails closed. Startup refuses an
occupied port and never stops its owner. No daemon, scheduler or autostart exists.
On a later restart, supply the exact state version shown by `inspect`; stale
versions refuse rather than silently updating the selection or reseeding.

## Pairing and expiration

1. The human opens the displayed local URL and chooses **Solicitar pareamento**.
2. The browser and trusted terminal show the same public `PAIR-…` identifier.
   This identifier alone grants no access. The human compares both and enters
   `aprovar PAIR-…` in that terminal. There is no HTTP approval endpoint.
3. Choose **Verificar pareamento / atualizar** in the browser. Only the approved
   browser proof now resolves to `producer-andre` for this exact project/cycle.
4. **Encerrar sessão** revokes that proof; `encerrar` in the terminal closes the
   server and revokes all proofs. SIGINT, SIGTERM and terminal EOF also close it.

The browser creates a 256-bit bearer proof through a same-origin response. The
proof remains in a JavaScript closure; the server retains only its hash in
memory. It is never rendered, printed, put in a URL/cookie, browser storage,
selection, database or log. A reload loses the browser proof and requires a new
pairing. At most four pending requests exist for five minutes; approving a new
one invalidates prior requests and the prior session. Server restart invalidates
all proofs. The 30-minute session limit begins at terminal approval and uses a
monotonic clock as well as a wall-clock expiry. Authorization is checked again
immediately before a task commit, including after body reads or async checks.

The trust boundary is the explicitly approved human operating this terminal and
comparing the pairing ID. No OS UID, lane flag, role label, bearer participant or
client-supplied actor establishes producer authority. The protocol does not claim
OIDC identity or protection against a compromised same-user host/browser. This
new temporary local capability is the access explicitly approved for preparation;
it creates no persistent credential or public access.

## Allowed commands and gates

The paired session can read the fixed cycle and invoke only `activate`, `block`
and `unblock`, with expected revision/idempotency checking. It cannot register
workers, queue/send/ACK work, dispatch, change approvals, inherit historical
creative rights or accept/reject deliveries. `review` remains refused in this
profile; independent receipt review still needs its separately approved identity
and verifier. The UI renders committed state, never optimistic seeds.

The three prepared read-only adapters are exposed behind the same session:

`/api/workflow/v1/cycles/<fixed-cycle>/gates/v1/<receipt>/<gate>`

`<gate>` is exactly `handoff-check.py`, `successor-check.py` or
`zero-face-gate.py`. The host derives the receipt packet from SQLite and checks
cycle/revision, bounded artifact hashes, paths and zero-face-log bindings. It
then runs the actual pinned `_common` and zero-face helper functions through
`scripts/movies_cycle_gate.py`, passing only noncredential evidence via stdin.
A source hash change, missing/changed evidence, missing successor or zero-face
log refuses the gate. Helpers never run hook `main`, write hook logs, discover
new handoff JSON or grant approval. A gate decision does not complete a task.

These adapters are ready for authenticated UI/API use. **Production Stop hook
routing has not been installed.** The existing Movies `.claude/settings.json`,
handoff/successor/zero-face hooks, canonical/media/spend guards and AGENTS/CLAUDE
remain untouched. A future producer-owned routing change must obtain packets
through this authenticated host; it must not export the proof to a file, command
line, URL or worker lane, or treat an unauthenticated stdin packet as authority.
Legacy sessions must retain their existing gates. An explicitly selected new-cycle
session must deny on missing identity/receipt/revision rather than fall back to a
historical JSON handoff. No dual JSON writer is introduced.

## Future activation and rollback

After a separately approved cutover and revalidation of the current port-3000
process, consistent old-database backup and rollback launch command, the exact
new-host command would be:

```sh
cd /mnt/data/Projects_SSD/AI_Studio-parley
node --import tsx workflow-local.ts serve --port 3000 --expected-version 0
```

This command has not been run. It will fail while port 3000 is owned, without
stopping or replacing that process. The human still must pair afterward; a
successful launch grants no browser authority by itself. Ports 5184, the existing
Movies frontend and the native Parley service need no restart for this profile.
Protected hook installation and any worker/reviewer/dispatch scope remain separate
approval boundaries. No original production DB is opened during preparation.

Before future writes, closing the new host and returning to the prior launch
configuration is enough for rollback. After any writes, preserve the new DB/WAL
and reconcile events before selecting historical state. The tested backup and
restore APIs create new files only and refuse overwrite. Before activation,
source rollback is limited to matching hashes in the delivery manifest; preserve
all concurrent changes and keep the new draft state/backups as evidence.

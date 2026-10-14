# Release operations

The approved version is recorded in `.release-manifest.json` and must match
the package and plugin markers. Every push to `main` measures release
eligibility. An eligible push automatically prepares a release commit, pushes
its annotated tag, and dispatches the separate publication workflow. There is
no proposal pull request. A tag push alone does not publish anything; an
existing tag can be dispatched explicitly for recovery.

Historical record: release 0.4.0 was published on 2026-09-13. All six GitHub
bundle assets passed checksum verification, and downloaded PyPI wheel and
source archive hashes matched the GitHub packages. See the
[successful publication run](https://github.com/suneel944/agent-parley/actions/runs/34775070514).

Published descriptions for 0.1.0, 0.1.1, 0.2.0, 0.3.0 and 0.4.0 are curated
from their shipped changes in `CHANGELOG.md`, with one `What's Changed`
heading and a full changelog link. The obsolete standing overview is no longer
part of generated notes. Historical packaged notes retain their original
bytes; an editorial page correction does not replace an asset or move a tag.

## Audited release history

### Recovering issue references lost during squash merging

The repository uses the PR title and body as its squash commit defaults.
PR hygiene requires releasing PRs to carry the same issue references in their
validated bodies and commit messages. Both default body sources then retain
the references. This check uses read-only CI metadata; repository squash
settings are only visible with broader repository access. Explicit merge API
message overrides must also preserve the issue references from the PR body.

PR [#161](https://github.com/suneel944/agent-parley/pull/161) closed seven issues,
but its squash commit `4edd3fc6ed0f77bf516008b7d2f16f4fef578415` omitted their
references. Together with the three references retained by PR #139, the release
counter saw four units instead of ten. The `issue_references` entry in
`.github/release-history.json` records those seven references against the exact
commit, preserving the existing Git history and release tags.

Recovery metadata is reviewed alongside its source PR evidence. It contributes
only when the named commit is in the unreleased range, has a releasing
Conventional Commit title and changes the package or plugin. Its issue numbers
share normal deduplication and replace the anonymous commit fallback. Changelog
generation uses the same recovered references. Entries outside the current
release range contribute nothing; keep them as an audit record.

### Open follow-ups from the 0.4.0 implementation audit

The original ten implementation issues were merged and passed the required
gate. A subsequent audit identified further defects, tracked in milestone
0.5.0: the P1 Copilot hook-format mismatch (#173), failed-resume identity loss
(#175), stale PR evidence (#176), historical PR completion matching (#177),
post-release reminder failures (#178), overwritten first-read and first-ack
timestamps (#179), inconsistent event snapshots during rotation (#180), and
missing wake delivery for handoff offers (#181).

The release-accounting correction does not resolve those product defects.
Issue #182 duplicates the accounting repair tracked by #174; its audit evidence
remains available. Passing the existing test gate does not verify the newly
reported cases or establish live native-client behavior.

### Published artifact audit

The read-only audit on 2026-09-10 downloaded the GitHub bundles and PyPI package
files, verified both GitHub checksum manifests, and compared the package bytes.
It predates 0.2.0, so the table below records the versions that existed then and
says nothing about the current approved release.

| Version | Disposition | Evidence |
| --- | --- | --- |
| 0.1.0 | Preserve as archival; do not retry publication | Wheels match across services. Source archives differ in five files; PyPI's copies match the original tag. |
| 0.1.1 | Approved baseline and supported retry | Both package hashes match across GitHub and PyPI. Neither file is yanked. |
| 0.1.2 | Retired incident record; never reuse | Absent from PyPI at audit time. Its GitHub draft, assets and tag were all deleted on 2026-09-11. The retirement list is what refuses the number. |
| Earlier version labels | Withdrawn preparation history | No corresponding release remains in the current GitHub or PyPI inventories. Reworded commits retain their original source trees. |

The initial source archive differs in `CHANGELOG.md`, `docs/operations.md`,
`docs/release-overview.md`, `scripts/release_artifacts.py`, and
`tests/test_release_artifacts.py`. The archive file lists are identical; package
runtime contents are unchanged. This is a provenance defect in the GitHub
archive, not a reason to overwrite either service's published files. The
original tag and PyPI archive remain the source provenance for that release.

| File | SHA-256 |
| --- | --- |
| Initial wheel, both services | `0a904c5a87983ba664724757fa8c8d3822bcb4a1744522010700008893843879` |
| Initial source archive, PyPI | `b75164c598a94ba70410e1b67af8655b717b1b14d3a402884afbb9608bc607bb` |
| Initial source archive, GitHub | `5e82c8f562c22f54ede4519b2928aa1bf78ec6057742d06796b4e837b23fe4c7` |
| Approved wheel, both services | `d6807a9cf203d402853e6e14c2bd5f97c7d0815b79ba241861bd39ec95a5b7a6` |
| Approved source archive, both services | `5b9a5e15bd4fd3c6765cdfd6d9d12f13932d47c5ab6e33670b217526ff02111a` |

## Migration to curated commit messages

Published tags keep their original commit IDs. Rewording their ancestors changes
the corresponding release commits in the curated branch even though all their
file trees remain identical.

| Tag | Original commit | Equivalent curated commit |
| --- | --- | --- |
| v0.1.0 | `1221ae6acbe4a0398fb5f3e51db4fc670395b0e1` | `d8aea19fa65ac5d70a60705bc44f9728bc113619` |
| v0.1.1 | `5a45a2d076531936a653e31873fd176d29b232e2` | `2c406150c9f559d5e975d88b645effbb449cf46d` |

The historical `v0.1.1` tag has an operational mapping in
`.github/release-history.json`. Validation of a mapped tag requires its exact
original commit, an identical full Git tree at the mapped commit, and mapped ancestry of the
workflow's main revision. Unmapped tags still require ordinary ancestry.
Publication continues to check out the original tag commit and reuse its
verified assets. The initial archival release is not enabled for retries.
The same history file records the retired version. Both the policy gate and
publication validation reject reusing it, even if a proposal changes every
version marker to that number.

The migration needed a scan boundary only while Release Please walked history
looking for the previous release. Versioning no longer uses Release Please, and
`release-please-config.json` is gone with it. Measurement now starts from the
baseline `release_baseline` resolves through the recorded mapping, so rewritten
history is handled by the mapping itself rather than by a configuration field
that had to be retired on every proposal. Keep the historical mapping as
provenance. New tags follow normal ancestry and do not require additional
mappings.

Replacing protected main remains a separate repository-policy operation.
A squash merge can install the code but cannot remove the old commit history.
Do not move published tags, merge the old lineage into the curated branch, or
disable ancestry and artifact checks to make a cosmetic rewrite pass.

## Incident and recovery

After the 0.1.1 release, commit `436c2b5` described build tooling with a `fix:`
title. Release Please included that commit in a 0.1.2 proposal. PR #46 rolled
version markers back to 0.1.1, but did not remove that commit from unreleased
history. The next preparation run created PR #47 with the same change, approved
it with the workflow identity, enabled automatic merging, and published 0.1.2
again. Reverting metadata alone could not stop the automation.

The attempted `last-release-sha` workaround was inside `packages["."]`, although
Release Please supports that option only at the configuration root. A permanent
root override would also pin history scanning to an old boundary. The repair
removed it and the workflow's approval/merge code.

What prevents the replay today is the measurement, not a human step. A `fix:`
title on build tooling contributes nothing, because a commit counts only when
it also touches `agent_parley/` or `plugins/agent-parley/`, and a version is
proposed only when the measured work reaches a release marker and the package
differs from the approved release. Commit `436c2b5` measures zero under every
one of those conditions. Removing the proposal pull request therefore removed a
review step that was never what stopped the incident; the guard that did is
`python3 -m scripts.release_publish candidate`, which anyone can run locally
and which every push to `main` runs before anything else happens.

GitHub and PyPI were checked during recovery. Both retained valid 0.1.1 package
files with matching SHA-256 hashes. PyPI also contained an unwanted 0.1.2, and
GitHub showed 0.1.2 as latest. Recovery returned that release to a draft, preserving
its assets and tag, and restored 0.1.1 as GitHub's latest release. That draft,
its assets and its tag were all deleted on 2026-09-11, once 0.2.0 was published,
so no trace of a version that was never meant to ship remains on the releases
page or in the tag list. Retirement does not depend on any of them: the version
stays listed in `.github/release-history.json`, and that list is what the policy
gate and preparation read to refuse the number, so the guarantee survives the
deletion of every artifact it described. Restoring main
to 0.1.1 does not remove PyPI's records. Keep 0.1.1's files and tag intact. The
unwanted version was absent from PyPI at the later audit. Do not recreate
it: deleting a PyPI file permanently consumes its filename. If an unwanted
publication happens again, prefer recoverable yanking over deletion. Existing
users pinned exactly to a yanked version can still install it.

## How a release happens

Nothing on this list is a human action. It describes what the repository does
on its own after an eligible push to `main`, and what to inspect afterwards.

1. Eligibility is measured, not judged. The candidate step counts commits
   between the approved
   release and `main`, and a commit counts only when both of these hold: its
   title uses a releasing conventional type, `feat`, `fix` or `perf`, with or
   without a scope; and it touches at least one path under
   `agent_parley/` or `plugins/agent-parley/`. Workflow, script, test and
   documentation commits are therefore structurally incapable of counting, even
   with a releasing title, because they change nothing the package distributes.
   Each counted commit contributes the distinct issues its message names
   through `Refs`, `Fixes`, `Closes` or `Resolves`, so one issue delivered by
   three pull requests counts once; a counted commit that names no issue counts
   as one unit of its own. A counted commit whose type carries the breaking
   marker `!`, as in `feat!:` or `feat(lane)!:`, proposes the next major
   version; ten product issues propose the next minor version; and a single
   commit titled `fix(urgent):` proposes the next patch version. Each marker is
   the only mechanical route to its rung, and the major marker outranks the
   issue count when both hold. Volume is deliberately not a major-release
   marker: every feature is also an issue, so any feature threshold above ten
   could never be reached, because the minor release would fire first and move
   the baseline the count is measured from. Below all three markers nothing is
   proposed and the step reports the counts it measured. Counting is local and
   repeatable: it reads Git history; selecting an available version
   additionally queries the release services described below.
   `python3 -m scripts.release_publish candidate` performs those checks and
   can be run locally at any time. Every push to `main` runs it after the
   push lands, and a push that reaches no marker ends there.
2. The chosen number must be free. Previously consumed versions cannot be
   reused, including a deleted or yanked 0.1.2. A release that lands on an
   unavailable version advances to the next free version of the same kind
   instead of failing, so an urgent patch from 0.1.1 reaches 0.1.3 without a
   manual correction. A version is unavailable when it is retired in
   `.github/release-history.json`, when the tag already exists locally or on
   `origin`, when a GitHub release exists for that tag including a draft, or
   when the package index already has it. Only a definite absence makes a
   version available; a check that fails to answer stops the run rather than
   choosing a number that may already be taken.
3. A minor or major release needs acceptance evidence; a patch release does
   not. `uv run --locked python -m scripts.release_publish evidence` runs the
   fault-injection acceptance suite, `tests/test_fault_acceptance.py`, on the
   release commit. The suite drives stub clients through a lane killed
   mid-claim, a service restart, a usage limit dialog, a permission prompt
   on resume, a full disk under the logs and a dropped `Stop` event, and
   fails unless every claim completes with idle lane-minutes and
   unaccountable claim-minutes under its limits. It also runs in
   `make check`, so a pull request that breaks it is red before any
   release. A suite failure stops the run before the markers are raised,
   so a count of release units alone can never publish a minor version.
   A live unattended run with native clients is not required; it took at
   least a day per minor release, so the maintainer runs it by hand when
   wanted (see [acceptance.md](acceptance.md)). Records under
   `docs/acceptance/` from earlier releases stay as history.
4. `python3 -m scripts.release_publish bump` raises every version marker the
   policy gate compares and prepends a changelog entry built from the same
   commits the measurement counted, so the published notes and the decision to
   release describe the same work. The policy gate then runs against the
   raised markers, so a marker the bump forgets fails the run instead of
   reaching a release.
5. The release application commits `chore(main): release X.Y.Z` to `main`,
   creates the annotated tag `vX.Y.Z` and pushes both. That commit subject is
   the loop guard: `Auto version` skips it, so a release cannot trigger another
   release. If `main` advanced between the measurement and the push, the push
   is rejected and the run fails rather than tagging a tree nothing measured.
   The next eligible push measures again and succeeds.
6. The next step uses the repository token with `actions: write` to dispatch
   `Release` with the pushed tag. Publication stays a
   separate top-level workflow so the index's trusted-publisher configuration
   continues to match the workflow that claims it, and so a retry is one
   dispatch rather than a repeat of the versioning path.
7. Check the workflow result and verify the published version. A release is
   complete only after the wheel and source archive on PyPI match the verified
   GitHub artifacts.

Dispatching `Auto version` by hand with the default `kind` of `measured` runs
the same measurement on demand and reaches the same conclusion. Dispatching it
with `kind` set to `patch`, `minor` or `major` is the on-demand route: the
candidate step proposes the next free version of that kind and skips the
markers and the issue count, but everything after it is the push path
unchanged, so the version is still checked for availability, the markers are
still raised and gated, and `Release` is still dispatched for the tag. The
request refuses when `main` holds no commit past the approved release, and
when nothing under `agent_parley/`, `plugins/agent-parley/` or the
`[project]` table changed since it, so documentation, workflow and tooling
changes never ship as a version on their own; they ride the next release that
changes the package. Use it when a package repair landed as a plain `fix:` and
must not wait for a tenth issue:

```bash
gh workflow run release-version.yml --ref main --field kind=patch
```

When the request counts no product commit, the changelog entry lists every
commit the release ships under `Changes` instead of the typed sections.
Dispatching `Release` by hand with an existing tag is the retry and
republication route; it never creates a version.

Publication does not comment on or close tracking issues or milestones. After
verifying a release, the maintainer closes completed issues, moves unfinished
issues to the next bare-version milestone, and closes the released milestone.
Historical milestones are left closed. The next milestone is a planning target;
creating it does not bump package metadata or authorize a release by itself.

## Documentation site

The `Pages` workflow publishes the README and `docs/` to
<https://suneel944.github.io/agent-parley/> on every push to `main` that
changes them, and on manual dispatch. It builds the repository root with the
GitHub Pages Jekyll build. The root `_config.yml` makes the README the index,
gives each page its title and description, sets the canonical address and
enables `jekyll-seo-tag` and `jekyll-sitemap`. A new page under `docs/` needs
its own entry there. The sitemap is served at `/agent-parley/sitemap.xml`.

The repository Pages source is set to GitHub Actions. The owner's remaining
one-time steps are to verify the site in Google Search Console, submit the
sitemap there, and set the repository homepage to the site after the first
deployment succeeds.

## Retry contract

The GitHub bundle is the canonical artifact set. It contains exactly the wheel,
source archive, plugin ZIP, Codex skills ZIP (`-codex-skills.zip`),
requirements, the install script, changelog, release notes and SHA256SUMS.
The checksum manifest is uploaded last, and its digest is passed between jobs.
Paths, duplicate entries, extra files and hash mismatches stop publication.
An existing complete bundle is reused byte for byte, even when a subsequent
build would differ. Nothing uses `--clobber` or PyPI's `skip-existing` option.

For an interrupted first GitHub upload, rerunning may build the missing files.
Every existing asset must match before another upload occurs. A conflicting
partial draft requires investigation; automation will not overwrite it. For an
interrupted PyPI upload, matching existing files are retained and only missing
files are staged. HTTP errors other than 404 and unexpected API responses fail
closed. A deleted PyPI filename cannot be recovered by retrying.

PyPI and GitHub are separate services, so publication cannot be one atomic
transaction. If PyPI succeeds and the GitHub publication step fails, rerun the
same workflow: PyPI files are checked, no duplicate upload is attempted, and the
GitHub publication can finish. Completion retries missing PyPI metadata six
times, ten seconds apart, to allow index visibility to catch up with an upload.
Hash conflicts and yanked files fail immediately. An exhausted retry budget or
a service error leaves the draft for a later retry. No error creates a new
version automatically.

## Verification limits

The gate proves the protocol with synthetic clients and proves nothing about
a day of real native clients. The unattended acceptance run in
[acceptance.md](acceptance.md) closes that gap on the maintainer's machine.
It is optional: a release does not require it, and the maintainer runs it by
hand when wanted.

`make check` includes real temporary Git repositories for tag resolution and
history and migration checks, plus simulated GitHub/PyPI failures for retry
and ordering checks. These are not live publication tests. Read-only checks
against the
existing 0.1.1 files verify its current hashes without uploading packages.
GitHub App permissions and PyPI trusted-publisher configuration must also allow
the respective workflows. A successful local gate cannot prove those external
permissions. Never publish a throwaway version just to test the workflow.

The migration audit of 2026-09-10 ran Release Please 17.6.0 against the
published curated branch using read-only GitHub requests and the proposed scan
boundary. It stopped at the mapped release and built zero release proposals.
That audit is historical: versioning no longer runs Release Please, and the
equivalent check today is `python3 -m scripts.release_publish candidate`, which
counts local Git history and checks version availability when a release marker
is reached. It does not open pull requests, tag commits, dispatch workflows,
or upload packages.

# Contributing

## Coding standard

Use the [Google Python Style Guide](https://google.github.io/styleguide/pyguide.html)
as the Python review baseline. Automated checks cover a subset of that guide;
passing lint is not a claim of complete style or correctness compliance.

- Use four-space indentation, an 80-character target, descriptive snake_case
  functions and variables, and CapWords classes. Let Ruff handle formatting.
- Document public modules, classes, and functions. Use Google-style `Args`,
  `Returns`, `Yields`, and `Raises` sections where callers need the contract.
- Annotate production function parameters and return values. Prefer explicit
  keyword parameters over unstructured option dictionaries.
- Group standard-library, third-party, and local imports. Use absolute package
  paths. Prefer module-qualified references when introducing new dependencies.
- Keep functions focused. Separate CLI orchestration, issue transitions,
  checkpoint observation, and persistence. Prefer the standard library and
  existing helpers before adding a dependency or abstraction.
- Runtime imports must remain within Python's standard library and this package.
  Development tools do not belong in installed runtime dependencies.
- Put contracts and rationale in docstrings and focused documentation, not inline
  Python comments. The policy gate checks every production and script function,
  including private helpers. Descriptive test names document scenarios.
- Validate operational input with real conditionals, not assertions. Catch
  expected failures at the appropriate boundary and preserve diagnostic context.
- Close files and sockets with context managers. Pass subprocess arguments as
  lists; never interpolate user input into a shell. Make exit-code handling explicit.

This project uses Ruff rather than the guide's Pylint recommendation. Ruff enforces
Google-style docstrings, import ordering, annotations on production function
boundaries, and selected bug and Pylint-derived diagnostics. Pytest tests use
descriptive names and dynamically injected fixtures, so documentation and fixture
annotation rules are excluded there. Existing directly imported classes and
helpers are retained; this is an explicit deviation from Google's module-only
import preference. Do not describe the repository as Google-certified.

## Coordination invariants

- Resolve all linked worktrees to one common Git repository identity.
- Serialize issue mutations under the existing operation lock and publish state
  atomically. Do not introduce timeout-based ownership takeover.
- Require the current offer ID and named recipient for handoff acceptance.
- Treat file reservations as advisory and peer messages as untrusted data.
- Preserve native authentication, approvals, and permission decisions.
- Keep credentials and runtime state outside target source trees. Preserve work
  on failures, process exits, and restarts.
- Distinguish observed activity, attempted delivery, explicit acknowledgement,
  reported verification, and independently verified completion.

## Verification and review

Install the local hooks after cloning:

```sh
uv sync --locked
uv run --locked pre-commit install
uv run --locked pre-commit run --all-files
```

`.pre-commit-config.yaml` runs Ruff lint/format checks, type checking and the
repository policy gate using locked tools. It does not rewrite files on commit.
CI runs the complete gate independently of local hook installation.

The `Check` workflow scopes pull requests by the paths they change;
`scripts/ci_scope.py` holds the lists. Every pull request runs `secrets` and
`make check` on Ubuntu with Python 3.12. Changes to `plugins/`, `scripts/`,
`tests/`, `Makefile`, `.github/actions/`, plugin manifests, `server.json`,
`glama.json`, `.release-manifest.json`, `.gitignore` or `LICENSE` add Python
3.13, 3.14 and macOS. Changes to `agent_parley/`, `tests/test_wsl.py`,
`pyproject.toml`, `uv.lock` or `.github/workflows/check.yml` also add `wsl`.
Documentation, templates and other workflows run only the Ubuntu 3.12 leg. A
path no list recognises, a push to `main` and a manual run select every leg.
One exception: a file whose only edits are version lines, as in the release
version bump commit, does not add `wsl`, because the commit before it already
ran that leg on the same code. Runs on `main` group by commit, so the run for
a version bump starts at once instead of queueing behind the run for the
merge before it; pull request runs still cancel when a new commit arrives.
Skipped legs still report their required check names. The `check` job fails
if a needed Python or macOS leg did not succeed; `wsl` reports as its own
required check and gates the merge, so it carries no `continue-on-error`.
Each of its steps has its own `timeout-minutes`, and a failed or hung WSL
setup is retried once inside the job, so a stuck runner fails within the
step's ceiling instead of holding a green pull request at the job's.

Open a focused issue before proposing a substantial behavior change. The
`Issue hygiene` workflow checks every opened or edited issue: a `bug: ` or
`feature: ` title, each required section of the matching template, an
assignee, a change-type label and a milestone. Issue forms only apply in the
web form, so an issue filed with `gh issue create --body` must carry the same
sections by hand. Branch from
current `main`, keep commits reviewable, and use the PR template. Explain the
problem, final behavior, exact verification, and compatibility risks. Every PR
must pass the required checks and resolve review conversations. Protected `main`
requires a squash-merged PR and linear history, and rejects force pushes and
deletion. The required checks are `check`, `secrets`, `pr-hygiene`,
`python (3.12, macos-latest)` and `wsl`, run against a current base. They and
resolved conversations apply to everyone, including administrators. The one
exception is the release GitHub App, which pushes the
`chore(main): release X.Y.Z` commit and its tag directly.

Pull requests need no approving review while the repository has one
maintainer. Add an approval requirement to the main ruleset when additional
maintainers join.

Use Conventional Commit PR titles, such as `fix: preserve pending messages` or
`ci: validate release metadata`; squash merges retain that title for changelogs.
Repository squash defaults use `PR_TITLE` and `PR_BODY`. For releasing PRs,
PR hygiene requires the same issue references in the validated PR body and
commit messages, so either default body source preserves them. When using an
explicit merge API message, preserve the PR body and its issue references.
`feat`, `fix` and `perf` can contribute to a future release. Reserve them
for changes a user of the distributed package would notice. Title workflow,
tooling and documentation work `ci`, `build`, `chore`, `test`, `refactor` or
`docs`. Merging to `main` runs the release eligibility measurement; only
eligible product changes proceed to version preparation and publication.
Assign an owner, add a change-type label, and reference an existing
local issue with `Refs #N` or a closing keyword. Match linked issue milestones
when present. PRs labelled `release` always require a milestone. Bot-generated descriptions
retain their native format and need no local issue, because Dependabot opens
its pull requests without one, but the owner and change-type label still apply
and `.github/dependabot.yml` supplies both.

Contribution text must omit generator credits, assistant attribution, robot
signatures, and assistant coauthor trailers. This applies to tracked files,
commit messages, PRs, issues, and comments, including closed items. Keep required
license notices and factual product documentation intact. Repository policy and
PR hygiene checks enforce the textual attribution boundary.

Releasing is automatic, and the measurement is what authorizes it. Every push
to `main` runs Auto version, which measures release eligibility from delivered
product work and stops there unless a version is warranted. Workflow repairs,
release scripts, tests and documentation are structurally incapable of raising
a version, because a commit counts only when a releasing conventional type
introduces it and it also touches `agent_parley/` or `plugins/agent-parley/`.
If an older squash commit lost its references, a reviewed `issue_references`
entry in `.github/release-history.json` can recover them for that exact commit.
Include the original PR as evidence. Recovery uses the same commit range,
product checks and issue deduplication; it cannot turn tooling into product work
or recount work included in the approved release.

A product commit that carries the Conventional Commits breaking marker, as in
`feat!:` or `feat(lane)!:`, proposes the next major version and outranks the
issue count. Use it when a release breaks a documented contract, such as
removing a command-line flag or a `--json` field. It takes effect on the push
that merges it, so a breaking change lands with the merge that completes a
milestone rather than partway through one; landing it earlier cuts the major
release and leaves the remaining milestone work for the release after it.

For a minor or major version, Auto version first requires
`tests/test_fault_acceptance.py` to pass on the release commit; a live
acceptance run is not required. When eligibility is met, the release
application raises every version marker,
records a changelog entry built from the counted commits, runs the policy gate
against the raised markers, commits `chore(main): release X.Y.Z` to `main`,
pushes the annotated tag, and the job's repository token dispatches Release
for it. Package, plugin,
marketplace, release manifest and lockfile versions must agree; the policy gate
runs before the commit, so a marker the bump misses fails the run. The release
commit subject is the loop guard, so a release cannot trigger another release.
No pull request is involved, and nothing approves or merges on your behalf.
Human pull requests still pass every required check before merging.

A maintainer can also dispatch Auto version with a `kind` of `patch`, `minor`
or `major` to release what is on `main` now without waiting for a marker. The
request replaces only the measurement; availability, the policy gate, the
release commit and the Release dispatch are unchanged, and it refuses an
unchanged tree. Reach for it when a published package is broken by a change
measurement cannot count, such as the README the index renders.

Publication is a separate Release workflow for an existing version tag, which
Auto version dispatches and a maintainer can dispatch again to retry.
The tag must resolve to a commit in main history or an explicitly recorded
history migration whose rewritten commit is on main with an identical tree.
The original tag commit stays immutable; both its package version and the
approved version on main must match. Creating or pushing a tag does not publish
anything; only a Release dispatch does.
Release runs the tagged source's `make check` and the history
secret scan. Its build job has no PyPI identity permission. A separate publishing
job downloads the verified GitHub assets and uploads only missing PyPI files.
Existing PyPI filenames must have matching SHA-256 hashes and must not be yanked.
Only after both PyPI files match does the GitHub release become public/latest.

Retries use the existing GitHub assets, without rebuilding or overwriting them.
During an interrupted initial upload, the workflow can rebuild and add missing
assets only if every uploaded file still matches; the checksum manifest is
uploaded last. Partial PyPI uploads resume at missing files. Failures leave a new
release as a draft. Never delete and reuse a published version or move its tag.
See [release operations](docs/releases.md) for recovery and verification limits.

Contributions are accepted under the repository's MIT license. Submit only work
you have the right to contribute. Follow CODE_OF_CONDUCT.md and report security
issues using SECURITY.md rather than public issue templates.

Run focused checks while editing. Before submitting implementation changes, run:

```sh
make check
```

CI runs the same locked dependency, lint, formatting, typing, policy, build, and
test gate. A separate secret scan examines Git history. Actions are pinned to
commit IDs and receive read-only permissions except where releasing or Pages
deployment needs write access. Dependency updates are proposed through Dependabot PRs.
Do not weaken
checks to make a change pass. Explain any narrowly justified rule exception.
Tests should exercise behavior, especially concurrency, persistence, cancellation,
and permission boundaries. Distinguish real MCP transport tests from native model
behavior; the latter requires a live run such as the
[unattended acceptance run](docs/acceptance.md).

Update the README and architecture diagrams when responsibilities or flows change.
Keep runtime code in the top-level `agent_parley/` package. `make build` must
produce an installable wheel and a source archive containing both native plugin
manifests and the shared skill. The installed-package test uses a temporary tool
environment outside the checkout to catch accidental source-tree imports.
Keep changes scoped and review the final diff for accidental credentials, runtime
artifacts, and unrelated edits. Publish the commands actually run and their results.

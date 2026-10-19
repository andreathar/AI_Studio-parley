# Catalog submission

This document prepares the public plugin directory submissions for the
Agent Parley plugin bundle. It records what each catalog asks for, what is
mechanically verifiable inside this repository and how to verify it, the
validator evidence captured for the current version, and the steps that only
the repository owner can carry out.

Repository installation does not imply public directory approval. The Codex
listing went live on 2026-09-14 at
`https://chatgpt.com/plugins/plugins_6aa7c91c25008191ad715f14756e5deb`, and
the submission archive is attached to every release from v0.6.0 onward; each
new version still needs a manual portal upload, because neither
catalog offers a publishing API. The Claude submission was made on 2026-09-14
through the Console form and was still awaiting review on 2026-09-26; a code
search of `anthropics/claude-plugins-official` for `agent-parley` returned no
match on that date. The directory has since retired that form, and its
pre-submission checklist blocks a plugin folder without a README, which the
folder lacked until `plugins/agent-parley/README.md` was added for 0.14.0. The
listing therefore needs a fresh submission through the developer portal once
that README is on `main`.

The developer lists that compare orchestrators are a separate surface from
both catalogs, and nothing in this repository can file an entry there. On
2026-09-25 a code search for `agent-parley` returned no match in any of the
three active lists the project qualifies for:
`andyrewlee/awesome-agent-orchestrators`, for parallel coding-agent
coordination; `hesreallyhim/awesome-claude-code`, for the Claude Code plugin;
and `punkpeye/awesome-mcp-servers`, for the coordination MCP server. The
README carries a `How it compares` section whose every claim cites the
competing project's own documentation, which is the text an entry in any of
those lists would reuse. Opening those pull requests against third-party
repositories, and completing the PyPI pending publisher so the package page
carries a verified repository link, are owner actions; both are listed again
under the owner-only steps below.
Nothing in this document submits a listing, and continuous integration builds
artifacts rather than filling review forms. Restate the two paragraphs above
whenever the listing state changes; a stale status here is the defect this
section keeps producing.
See the `## Plugins` section of `docs/operations.md` for the installation path
this listing would describe.

## What each catalog requires

### Claude plugin directory

Submissions go through the
[developer portal](https://claude.ai/directory/manage). The earlier Console
form is no longer supported, and a submission made there is not reviewed.
The directory surfaces in Claude Code as the `claude-plugins-official`
marketplace. [Anthropic's submission guide](https://claude.com/docs/plugins/submit)
is authoritative for the process, and
[Claude's plugin guide](https://code.claude.com/docs/en/plugins) for manifest
fields.

The form itself takes a GitHub link. The repository must be public, because
closed-source plugins are not accepted, and the manifest must pass
`claude plugin validate`. Identifying metadata belongs on the manifest: name,
display name, version, description, author, homepage, repository, license and
keywords. The repository must carry a license and a way to report problems.
The
[pre-submission checklist](https://claude.com/docs/plugins/pre-submission-checklist)
also requires a README of at least 40 words, not counting code blocks, inside
the submitted plugin folder, and treats a missing one as blocking.
`plugins/agent-parley/README.md` meets it: it describes the `coordinate`
skill, the separately installed command line tool, what the plugin runs and
transmits in line with `docs/privacy.md`, and where to find the privacy
policy, terms and issue tracker. The submission names that plugin folder, not
the repository root, because the root is a marketplace.

Submitting is account-bound and happens under the owner's signed-in account
on the developer portal.

Once a listing is published, pushes to the repository are mirrored
automatically and rescreened. Updates do not need a new submission.

### Codex plugin submission

Codex submissions follow
[OpenAI's submission guide](https://developers.openai.com/plugins/deploy/submission)
and, for a plugin that already targets Claude Code,
[OpenAI's porting guide](https://developers.openai.com/plugins/guides/submit-claude-plugin).
Agent Parley is a skills-only plugin, so the submission consists of the skill
bundle rather than a hosted service. That path requires a verified publisher,
Apps Management write access, a listing URL, a policy URL, the skill bundle
itself, and review cases that a reviewer can execute against the bundle.

The upload is an archive, not a repository link, and the portal generates
`.codex-plugin/plugin.json` from `.claude-plugin/plugin.json`. The archive
keeps each skill directory with its `SKILL.md` and any scripts or assets it
references, and drops `.claude-plugin/marketplace.json`, `.agents/`, any MCP
configuration and any Claude-only settings. Skill text must be
provider-neutral: no instruction that depends on a Claude-specific feature,
and no assumption about which model reads it.

The portal's scan of that Claude manifest demands fields the Claude directory
does not: an `interface` block with `shortDescription`, which the submission
form reuses as the listing subtitle and caps at 30 characters, plus `logo`
and `composerIcon` pointing to square images inside the archive, and the
`capabilities` and `defaultPrompt` fields the listing page renders. Adding
`interface` to the repository's Claude manifest would make
`claude plugin validate --strict` fail, so the repository keeps those fields
in `.codex-plugin/plugin.json` and `make codex-bundle` merges them into the
archived copy. The archive lands at
`dist/agent-parley-VERSION-codex-skills.zip` and contains only the merged
manifest, `skills/` and `assets/`; the plugin-folder README stays out,
because the portal renders the listing from the manifest rather than from a
README. The archived `skills/` comes from `.codex-plugin/listing-skills`, not
from the repository skills: the portal scans each skill and flagged the full
`coordinate` skill as a security risk once it carried operator, integration,
permission and credential guidance. The listing skill keeps the same name and
description and covers status, claims, handoffs, reports and mail only.
The manifest also declares the website, privacy policy and terms of service
URLs the listing shows. `scripts/check_policy.py` fails the gate if
either manifest drifts from the shape its directory reads, if a listing URL
is not https, or if a listing skill's frontmatter differs from its repository
skill's.

That archive is a release asset. `make release-artifacts` builds it into
`dist/release` beside the wheel, the source tarball and the plugin archive,
records its hash in `SHA256SUMS`, and `scripts/release_publish.py` requires it
by name, so a release missing it fails instead of publishing. A portal upload
therefore starts from a released artifact rather than a local build. Releases
from v0.10.0 onward carry it automatically; v0.6.0 through v0.9.1 carry the
same archive, uploaded by hand after the fact. Neither catalog exposes a
publishing API, so each new version still needs a manual upload through the
portal. Claude mirrors pushes
once a listing is live; Codex does not.

Both forms change over time. Re-read them at submission time and treat the
lists above as a preparation aid, not as a transcription of the current form
fields.

## Pre-submission checklist

Each item below is verifiable from a clean checkout. Run the command and
confirm the stated expectation before opening either form.

- Plugin manifest is valid and complete.
  `claude plugin validate plugins/agent-parley`
- Marketplace manifest is valid.
  `claude plugin validate .`
- Package, plugin and marketplace versions move together, no prohibited
  attribution text is present, runtime dependencies remain empty, the Claude
  manifest carries no `interface` block, and the Codex manifest carries a
  short description within the limit and square listing images.
  `uv run --locked python scripts/check_policy.py`
- The Codex submission archive builds from the repository.
  `make codex-bundle`
- The published release carries that archive as an asset, attached by the
  `Release` workflow with no manual upload.
  `gh release view vVERSION --json assets`
- Neither manifest passes `claude plugin validate --strict`; the single
  `protocol` warning is expected and the gate runs without `--strict`.
  `claude plugin validate --strict plugins/agent-parley` and
  `claude plugin validate --strict .`
- The `coordinate` skill carries YAML frontmatter with `name` and
  `description`.
  `head -5 plugins/agent-parley/skills/coordinate/SKILL.md`
- The repository states its license.
  `head -1 LICENSE`
- The repository states a private vulnerability reporting route.
  `head -6 SECURITY.md`
- Package metadata names the author, license, description and project URLs.
  `sed -n '5,48p' pyproject.toml`
- The full repository gate passes, matching what continuous integration runs.
  `make check`
- The release bundle contains both native plugin manifests and the shared
  skill, so a reviewer downloading an artifact receives the whole plugin.
  `make build`

`make check` and `make build` write into the working directory, so run them on
a clean tree.

## Validation evidence

Captured on 2026-09-10 with Claude Code 2.1.267. The validator reads manifest
structure rather than the version string, so this evidence holds for any
release in which both manifests stay aligned with the package; `make check`
fails the build if they drift.

Plugin manifest:

```text
$ claude plugin validate plugins/agent-parley
Validating plugin manifest: /home/dev/agent-parley/plugins/agent-parley/.claude-plugin/plugin.json

✔ Validation passed
```

Marketplace manifest:

```text
$ claude plugin validate .
Validating marketplace manifest: /home/dev/agent-parley/.claude-plugin/marketplace.json

✔ Validation passed
```

Both commands exited zero with no warnings. Neither passes under `--strict`.

`--strict` turns an unrecognized manifest field into an error, and the
compatibility contract added a `protocol` field to
`.claude-plugin/plugin.json` after the evidence above was captured. Checked
on 2026-09-15 with the installed client:

```text
$ claude plugin validate --strict --json plugins/agent-parley
"success": false ... "Unknown field 'protocol'. Claude Code ignores it at load time."
$ claude plugin validate --strict --json .
"success": false ... same warning through plugins[0]
```

The field is deliberate and the client ignores it at load time, so the policy
gate runs the validator without `--strict` and tolerates exactly that one
warning. The `## Plugins` section of `docs/operations.md` records why the
field is carried. Do not add `--strict` to the gate to make this section
read better; the field is the contract.

## Listing metadata

The manifests now carry the metadata a reviewer reads. Both plugin manifests
and the Claude marketplace entry describe isolated worktrees, advisory
reservations and explicit handoffs in a full paragraph. The Claude manifest
declares `displayName`, `license` and `keywords`; the marketplace entry adds
`category`, `author`, `homepage` and `repository`. The Codex manifest keeps
its listing copy in `interface` and its own `keywords`. The OpenAI portal
rejects a listing whose name or description references another AI assistant,
model or platform, so the archived manifest takes the Codex keywords rather
than the Claude ones, which name the supported agent command line tools. The
bundle check fails when the archived manifest or a listing skill names an
assistant, and the listing skill's launch example uses an `AGENT`
placeholder. The
marketplace is named `agent-parley`, so the documented install command is
`agent-parley@agent-parley`.

Both catalogs ask for public URLs that match the publisher identity. Use:

- Website: `https://suneel944.github.io/agent-parley/`, the `Homepage` in
  `pyproject.toml` and the `websiteUrl` in `server.json`
- Plugin homepage and repository: `https://github.com/suneel944/agent-parley`,
  as `plugin.json` and `.claude-plugin/marketplace.json` declare
- Support: `https://github.com/suneel944/agent-parley/issues`
- Privacy policy:
  `https://github.com/suneel944/agent-parley/blob/main/docs/privacy.md`
- Terms: `https://github.com/suneel944/agent-parley/blob/main/docs/terms.md`

`docs/privacy.md` states that nothing leaves the machine. That claim rests on
the coordination server binding `127.0.0.1` only, on the client disabling
proxy handling for its loopback requests, and on the package declaring no
runtime dependencies. If any of those three change, the policy must change
with them in the same commit.

Listing imagery lives under `plugins/agent-parley/assets/`: `logo.png` and
`icon.png`, both 1024 by 1024 pixels, referenced from the Codex manifest as
`interface.logo` and `interface.composerIcon`. The directory renders the
composer icon at 54 pixels, so the bundle check rejects an edge under 1024 and
the artwork is drawn from `docs/assets/agent-parley-icon.svg`, whose thinnest
stroke stays about four pixels wide at that size. Regenerate the pair from the
vector source with a headless browser:

```
google-chrome --headless --disable-gpu --hide-scrollbars \
  --default-background-color=00000000 --window-size=1024,1024 \
  --screenshot=plugins/agent-parley/assets/icon.png file://ICON_HTML
```

where `ICON_HTML` is a page that shows the SVG at 1024 by 1024 pixels with no
margin; copy the result over `logo.png` as well. Screenshots are not included;
a directory may ask for them sized to its own requirements.

`interface.capabilities` declares `Interactive` and `Write`, which is what the
skill needs: it reads coordination state in a conversation and writes claims,
reservations and handoffs. `interface.defaultPrompt` carries three starter
prompts. The directory keeps at most three and truncates any entry past 128
characters, and the bundle check fails rather than letting either happen
silently. Each prompt states a situation, naming the work in hand and the
peer involved, because a bare command reads as documentation rather than a
reason to install. The prompts call the peer "the other agent" because the
listing runs inside Codex, where "Codex" would name the user's own session.

`interface.category` is `Developer Tools`. The portal could not confirm
`Productivity` for a tool that coordinates coding agents, and the bundle check
rejects any value outside the portal's supported list. The portal's guide asks
`longDescription` to cover tasks, intended users and limitations, so the text
has one paragraph for each after an opening sentence that states the purpose.
It does not mention MCP, because the archive is skills-only and carries no
server. `interface.supportURL` points at the issue tracker.

Each prompt also ends in changed state rather than an answer, and covers one
moment that a single agent cannot reach: splitting a milestone across lanes
and starting parallel work, taking over a stalled lane's work with its commit
and checks, and reviewing a peer's reported outcome against its recorded
evidence before it lands. A prompt that only asks who holds what describes a
status viewer. A prompt that stages two lanes overwriting one file advertises
the collision that worktrees and advisory reservations exist to prevent, and a
prompt about renewing or queueing a reservation shows plumbing the protocol
runs without being asked. The references stay generic, because the listing
describes the reader's repository rather than this one.

The skill frontmatter itself is in good shape: `name` is `coordinate` and the
`description` is 204 characters covering both what the skill does and when to
use it.

## Steps only the repository owner can perform

The remaining work is distribution rather than engineering, and it is bound to
accounts and to a legal identity that an agent does not hold.

- **Publisher verification.** The Codex submission requires a verified
  publisher. Verification proves control of an identity or a domain and cannot
  be delegated.
- **Signing in and submitting.** Both forms are account-bound and role-gated.
  The Claude directory takes submissions through the developer portal at
  `https://claude.ai/directory/manage`; Codex needs Apps Management write
  access. Submitting requires the owner's authenticated session, and the
  submission becomes a statement made by that account.
- **Retiring the stale Claude submission.** The 2026-09-14 submission went
  through the retired Console form. Withdraw it at
  `https://platform.claude.com/plugins/submissions`, or ask
  `directory@anthropic.com` to move it, before resubmitting through the
  developer portal.
- **Accepting catalog terms.** Each catalog attaches distribution terms to the
  listing. Only the owner can agree to them.
- **Publishing the policy and listing URLs.** The owner chooses which pages
  represent the plugin's policy and listing, and controls the hosting for
  them.
- **Responding to review.** Reviewer questions, requested changes and the
  final decision to publish or withdraw the listing all belong to the owner.
- **The PyPI pending publisher.** Completing it binds the package page to this
  repository and marks ownership as verified. It is account-bound.
- **The awesome-list entries.** A pull request to
  `andyrewlee/awesome-agent-orchestrators`,
  `hesreallyhim/awesome-claude-code` or `punkpeye/awesome-mcp-servers`
  describes this project to a third-party repository under the owner's
  account. The README comparison
  section is the source text; filing it is the owner's statement to make.

Everything a repository can do ahead of those steps is covered by the
checklist and the evidence above.

## Review cases

Each case is grounded in what
`plugins/agent-parley/skills/coordinate/SKILL.md` instructs. They are written
so a catalog reviewer can run them against a checkout with the Agent Parley
executable installed.

### 1. Status inspection from a session that is not launcher-managed

- **Setup.** Install the executable, install the plugin, then start an
  ordinary Claude Code or Codex session in a repository checkout without
  launching it through `agent-parley run`.
- **Action.** Invoke the `coordinate` skill and ask for the current
  coordination status.
- **Expected result.** The session runs `agent-parley status`,
  `agent-parley participant list` and `agent-parley issue list`, then explains
  that setup and native hooks require launching through Agent Parley in separate
  user terminals, one terminal per participant. It does not launch a nested
  interactive agent from a tool call and does not silently move the existing
  session into a worktree.

### 2. Claim before working on a numbered issue

- **Setup.** Launch two participants in separate terminals, for example
  `agent-parley run claude --repo /path/to/repository` and
  `agent-parley run codex --repo /path/to/repository`. Pick an issue number
  that no participant owns.
- **Action.** From one lane, ask the skill to start work on that issue.
- **Expected result.** The session runs `agent-parley issue claim NUMBER`
  before editing anything. `agent-parley issue list` in the other terminal
  then shows that participant as the owner. Ownership is reported separately
  from activity and from reported outcomes.

### 3. Refusing to take over another participant's claim

- **Setup.** The second lane from case 2, with the issue already owned by the
  first participant.
- **Action.** Ask the skill to work on the same issue number.
- **Expected result.** The session reports that another owner holds the claim
  and declines to proceed, offering instead to choose other authorized work or
  to negotiate a handoff. It does not act from the owner's lane by passing
  `--repo` or by changing directory, and it does not wait for a timeout to
  take ownership.

### 4. Explicit handoff with the current offer identifier

- **Setup.** The first participant owns the issue from case 2.
- **Action.** Ask the owner's session to hand the issue to the second
  participant, then ask the recipient's session to take it up.
- **Expected result.** The owner stops editing and runs
  `agent-parley issue offer NUMBER --to PARTICIPANT --summary "commit, checks,
  remaining"`, and stays paused while the offer is pending. The recipient
  reads the current offer identifier from `agent-parley issue list` and runs
  `agent-parley issue accept NUMBER --offer-id ID`. An identifier from a
  cancelled or replaced offer is rejected rather than accepted. Accepting
  moves the advisory file reservations the offer carried from the offering
  lane to the recipient; message acknowledgement does not transfer.

### 5. Reporting an outcome without claiming verification

- **Setup.** Either participant owning an issue, mid-task.
- **Action.** Ask the session to record a partial outcome, then a ready
  outcome.
- **Expected result.** The partial report is sent as
  `agent-parley report --state partial --summary "result" --remaining "..."`
  and is refused without `--remaining`; the ready report requires
  `--evidence`. The session presents the report as an agent claim rather than
  as independent verification, and does not infer merge or push authority from
  issue ownership.

### Reservation behavior during any case

File reservations announced over MCP are advisory. A reviewer who reserves a
path should see peers stop making overlapping edits when a conflict is
reported, but nothing on disk is locked and no filesystem permission changes.
Issue claims do not reserve files.

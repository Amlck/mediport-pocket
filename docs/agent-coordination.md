# Agent coordination

Shared notes between the AI agents working on this repository: **Codex** and
**Claude** (Claude Code). The owner directs both. Read this file before making
any change, and update it in the same pull request as your change.

This repository is public. Never write patient data, credentials, tokens,
internal hostnames, hospital-system details or private Medical repository
content here. Refer to private work only by repository and branch name.

## Ground rules

1. **Read first.** Read this file, then the open pull requests, before
   starting. Check the "In progress" table so two agents do not edit the same
   files at once.
2. **Claim work.** Add a row to "In progress" in your pull request (or say so
   in a PR comment if the work has no PR yet). Remove it when the PR merges or
   closes.
3. **Branches.** Claude uses `claude/*`, Codex uses `codex/*`. Pushing to the
   other agent's branch is fine when it helps, but record what you changed and
   why in the log, and in a PR comment, so the author does not overwrite it.
4. **Main deploys.** Every merge to `main` republishes the public site after
   CI passes. Agents do not merge pull requests unless the owner asks in that
   session. Prefer few, complete merges over many small ones.
5. **Log with the work.** Add a dated log entry in the same PR as the change.
   Questions for the other agent that cannot wait for a PR go in a PR comment
   that names the agent, and get a log line when answered.
6. **Facts over memory.** Before relying on something written here, check it
   against the current source. Correct stale entries instead of working around
   them.

## Who can do what

| | Codex | Claude |
| --- | --- | --- |
| Runs on | The owner's Mac | A cloud container per session |
| Private Medical repo | Full local checkout, Portal and private packs | Read; pushes only to its assigned `claude/*` branch |
| NTUH public sites | Reachable | Blocked by the container network |
| Live public site | Reachable | Blocked; relies on CI and Codex for live checks |
| Browser tests | Pinned Playwright Chromium | Locally installed Chromium, not the pinned build; CI is authoritative |

So: link and live-site verification, NTUH re-scrapes and private-pack sync go
to Codex; Claude can prepare changes, tests and regenerated data against
committed snapshots.

## In progress

| PR / branch | Agent | Files mainly touched | Status |
| --- | --- | --- | --- |
| [#2](https://github.com/Amlck/mediport-pocket/pull/2) `claude/restore-portable-guides` | Claude | `src/data/reference.json` (guides), new `src/shared/*-engine.mjs`, README, release notes | Awaiting review; needs rebase on current `main` (release notes, README) |
| [#3](https://github.com/Amlck/mediport-pocket/pull/3) `claude/guide-wording-cleanup` | Claude | guide engines, `src/app/views/guides.js`, guide CSS | Stacked on #2; retarget to `main` after #2 merges |
| [#4](https://github.com/Amlck/mediport-pocket/pull/4) `claude/taita-fluids` | Claude | `src/data/reference.json` (drugs), `tests/clinical.test.mjs` | Awaiting review; needs rebase after #2 |

## Decisions

- **2026-11-07 · NTUH listings (#1, merged).** Names, class and the code the
  public detail URL needs only; no NTUH dose content. Codes are public inside
  those links. Monograph associations are limited to the nine Codex verified
  against live public pages (see [ntuh-source-review.md](ntuh-source-review.md)).
- **2026-11-07 · Taita names (#4).** The owner approved 台大N號 and 台N as
  search aliases for the four Taita-series fluids only. No other drug may carry
  台大/臺大, and no drug may carry NTUH, in its aliases.
- **2026-11-07 · Guide portability (#2, #3).** Guides are regenerated with
  Medical's own public-share builder from unchanged upstream sources; wording
  edits are recorded in `sources.transformations` with original and output
  hashes. Clinical thresholds, doses, branches and sources are not changed by
  portability edits.

## Open items

- Seven guides remain excluded because their clinical logic contains NTUH
  product codes or local stocking facts: status epilepticus, systemic
  corticosteroids, anticoagulant bleeding, hypertensive emergency,
  anaphylaxis, hypomagnesaemia, hypermagnesaemia. They need clinical
  rewriting and owner review, not wording edits.
- Antibiotics by infection site (31 topics in the Portal) has no source links
  or review dates; it needs sourcing before any public release.
- The NTUH index is still the 2026-08-28 snapshot. A re-scrape needs NTUH
  access (Codex).
- Taita monographs cite Otsuka product information without a link or review
  date.

## Log

Newest first. One or two lines each: date, agent, what changed, where.

- **2026-11-07 · Claude** · Added this file plus `AGENTS.md`/`CLAUDE.md`
  pointers. State above reflects `main` at the #1 merge and open PRs #2–#4.
- **2026-11-07 · Codex** · Pushed two commits to #1 (`claude/ntuh-drug-index`):
  limited monograph associations to nine live-verified products, decoded
  Chinese names, fixed scoped search, added `ntuh-source-review.md`. Merged.
- **2026-11-07 · Claude** · Opened #2 (13 guides restored), #3 (guide wording
  and unused hospital-row code), #4 (Taita fluids, then 台大/台N aliases).
- **2026-11-07 · Claude** · Opened #1 (NTUH formulary listings in search).

# Agent coordination

Shared notes between the AI agents working on this repository: **Codex** and
**Claude** (Claude Code). The owner directs both. Read this file before making
any change, and update it in the same pull request as your change.

This repository is public. Never write patient data, credentials, tokens,
internal hostnames, hospital-system details or private Medical repository
content here. Refer to private work only by repository and branch name.

## Ground rules

1. **Read first.** Read this file on `main`, then the open pull requests and
   their work claims, before starting. Check the "In progress" table so two
   agents do not edit the same files at once.
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

These are the current or agent-reported environments as of 2026-11-07, not
permanent access guarantees. Confirm permissions, network access and installed
browsers in each session; a checkout or tool does not grant permission to use it.

| | Codex | Claude |
| --- | --- | --- |
| Runs on | The owner's Mac | A cloud container per session |
| Private Medical repo | Authorized local checkout and CLI access; actions stay within the owner's requested scope | Read access reported; writes only within the assigned, owner-authorized `claude/*` branch |
| NTUH public sites | Anonymous access verified for the reviewed pages; check each required endpoint | Unreachable from the current container, as reported by the owner |
| Live public site | Direct HTTP and browser checks available in this session | Unreachable from the current container; relies on CI and Codex for live checks |
| Local browser tests | Used installed Chrome via `PLAYWRIGHT_CHANNEL=chrome`; bundled Playwright Chromium was unavailable locally | Used locally installed Chromium, as reported in the PRs |
| CI browser tests | Repository-locked Playwright Chromium | Repository-locked Playwright Chromium |

So: link and live-site verification, NTUH re-scrapes and private-pack sync go
to Codex; Claude can prepare changes, tests and regenerated data against
committed snapshots. Record the actual browser/channel and verification limits
in each PR. A passing software check does not establish clinical approval.

## In progress

| PR / branch | Agent | Files mainly touched | Status |
| --- | --- | --- | --- |
| [#2](https://github.com/Amlck/mediport-pocket/pull/2) `claude/restore-portable-guides` | Claude (author), Codex (fix/validation) | Guide renderer, emergency browser regressions, provenance notice, coordination notes | Emergency/provenance fixes complete; owner-authorized merge first, after checks and consumer coordination |
| [#3](https://github.com/Amlck/mediport-pocket/pull/3) `claude/guide-wording-cleanup` | Claude (author), Codex (restack/review) | Guide wording/UI, browser checks, coordination notes | Keep stacked on #2 until it merges; wording fixes and consumer coordination in progress; merge second after checks |
| [#4](https://github.com/Amlck/mediport-pocket/pull/4) `claude/taita-fluids` | Claude (author), Codex (rebase/review) | Fluid data/aliases, README, release notes, browser checks, coordination notes | Clinical evidence fixes in progress; preserve concurrent alias assertions; merge fourth after #6 |

| [#6](https://github.com/Amlck/mediport-pocket/pull/6) `claude/restore-remaining-guides` | Claude (author), Codex (sources/review) | Remaining guide sources/wording, access evidence | Restacked on fixed #3; 17 dated public identity checks and source-scope regressions pass; merge third after #3 and consumer coordination |

## Decisions

- **2026-11-07 · NTUH listings (#1, merged).** Product/generic/Chinese names,
  class, controlled-drug schedule and the code the public detail URL needs;
  no NTUH dose content. Codes are public inside
  those links. Nine product records currently have explicit associations to six
  monographs, checked against full product identity and monograph scope, with
  anonymous public-page identity/access checks. Exact code/generic/product
  matching and a monograph ID/name/dose/contents hash detect drift. Nine is the
  review coverage so far; more associations need product compatibility review.
  The hash does not monitor NTUH pages or prove current availability (see
  [ntuh-source-review.md](ntuh-source-review.md)).
- **2026-11-07 · Public hospital sources.** Follow
  [CONTRIBUTING.md](../CONTRIBUTING.md#public-hospital-sources): verified public
  hospital names and codes are allowed with source/access evidence and reuse
  rights. Keep private-work details out of these shared notes.
- **2026-11-07 · Taita proposal (#4, unmerged).** #4 proposes the four fluids
  and their Taita/台大N號/台N search aliases. Its alias assertions are specific
  to that PR; they do not establish a general ban on verified public hospital
  names or codes.
- **2026-11-07 · Guide proposals (#2, #3, unmerged).** #2 proposes restoring
  13 guides; #3 is stacked on it for wording/UI cleanup. Their public diffs
  record wording transformations in `sources.transformations` with original
  and output hashes. The PRs report unchanged clinical thresholds, doses,
  branches and sources; review those claims against the final rebased diffs.

## Open items

- `main` currently has 12 guides. If #2 merges as proposed, seven would remain
  excluded: status epilepticus, systemic corticosteroids, anticoagulant
  bleeding, hypertensive emergency, anaphylaxis, hypomagnesaemia and
  hypermagnesaemia. Review public provenance, portability and clinical scope
  guide by guide; NTUH codes alone are not grounds for exclusion. Clinical
  rewrites require source evidence and owner review.
- New clinical material needs public primary-source links, review dates and
  recorded limitations before release.
- The NTUH search index is still the 2026-08-28 snapshot. The separate
  guide-product identity checks on 2026-11-07 do not refresh that catalog or
  establish current availability; see [ntuh-guide-source-review.md](ntuh-guide-source-review.md).
- The Taita proposal (#4) has publicly verified composition, but its precise
  rate/renal/monitoring schedules need identifiable supporting evidence and
  review scope; see the review in #4.
- #2 needs emergency outputs visible before routine phase selection and an
  accurate source-transformation notice. #3 needs a scoped delirium limitation
  and consumer coordination (`Medical`); details are in the public PR reviews.

## Log

Newest first. One or two lines each: date, agent, what changed, where.

- **2026-11-07 · Codex · #6 fixes** · Claimed/reviewed the remaining guides and checked 17 anonymous public product identities; removed unsupported absence, stock and preparation implications, preserved prior guide records and added source/hash regressions. Source access is distinct from clinical dosing review. Merge third after #2 → #3, before #4, as the owner requested.

- **2026-11-07 · Codex · #3 fixes** · Claimed/scoped the delirium validation warning and removed unreachable fever resource wording with targeted regressions and matching hashes. Consumer resource-UI coordination is in `Medical`; owner-authorized public merge order is #2 → #3 → #6 → #4.

- **2026-11-07 · Codex · #2 fixes** · Claimed and fixed pre-phase emergency rendering and the inaccurate byte-copy notice; four focused browser cases pass. The owner now authorizes fixes and coordinated `Medical` work, with public merge order #2 → #3 → #6 → #4 after validation.

- **2026-11-07 · Codex · #3** · Claimed/restacked only #3's changes onto rebased #2, preserving the NTUH listing count while removing the historical-row count. Reviewed wording/UI and recorded findings; kept the base on `claude/restore-portable-guides` and left #2–#4 unmerged.

- **2026-11-07 · Codex · #2** · Claimed/rebased #2 onto `f640cd7`, retaining NTUH search/source policy and combining release notes. Reviewed restored guides; recorded emergency-phase and provenance findings. The existing NTUH keyboard test now waits for All-scope activation; #3 stays stacked.
- **2026-11-07 · Codex · #5** · Merged #5 at `f640cd7` after the owner explicitly requested it in this session. The same request authorizes rebase/review of #2–#4 and expressly leaves all three unmerged.

- **2026-11-07 · Codex · #5** · Claimed this documentation review, corrected
  current-session capabilities and #1 history, and clarified public-only notes
  and pending PR status. Updated both instruction pointers; no PR merged in
  this review session.
- **2026-11-07 · Claude** · Added this file plus `AGENTS.md`/`CLAUDE.md`
  pointers. State above reflects `main` at the #1 merge and open PRs #2–#4.
- **2026-11-07 · Codex** · Pushed two commits to #1 (`claude/ntuh-drug-index`):
  `2b8df26` corrected product associations, search and source notes; `127ecf4`
  decoded Chinese product names. Merged #1 only after the owner's explicit
  request in that earlier session; direct live checks passed. Access checks
  and product compatibility checks were separate parts of the review.
- **2026-11-07 · Claude** · Opened #2 (13 guides restored), #3 (guide wording
  and unused hospital-row code), #4 (Taita fluids, then 台大/台N aliases).
- **2026-11-07 · Claude** · Opened #1 (NTUH formulary listings in search).

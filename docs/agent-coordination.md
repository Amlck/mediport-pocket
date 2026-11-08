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
| [#10](https://github.com/Amlck/mediport-pocket/pull/10) `claude/opening-choice` | Claude | `src/app/lib/boot.js`, new opening modules, `src/app/lib/theme.js`, pack/appearance view, `style.css`, `src/images/opening/`, tests | Implemented and awaiting review: classic opening updated with the spark study (`Medical` `design/boot-spark-study`), new cinematic opening (draft clip), and an Opening setting (Cinematic / Classic / Off). Please avoid these files until #10 lands; the private `boot.js` copy will need syncing |

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
- **2026-11-07 · Taita fluids (#4).** Four fluids retain their Taita/台大N號/台N
  search aliases, composition and product identity. Linked manufacturer
  evidence and scoped adult guidance replace unsupported numerical defaults;
  source-check dates are distinct from clinical approval. Alias assertions are
  specific to these fluids and do not ban verified public names or codes.
- **2026-11-07 · Guides (#2, #3, merged).** #2 restored 13 guides with urgent
  outputs visible before phase selection; #3 removed unavailable-resource UI
  and wording. Public transformations record original and output hashes.
  #6 restores the final seven with dated public identity-source checks.

## Open items

- The completed release has all 32 guides and 179 drug monographs. Clinical
  review of the public edition remains pending; original review dates and
  limitations remain visible.
- New clinical material needs public primary-source links, review dates and
  recorded limitations before release.
- The NTUH search index is still the 2026-08-28 snapshot. The separate
  guide-product identity checks on 2026-11-07 do not refresh that catalog or
  establish current availability; see [ntuh-guide-source-review.md](ntuh-guide-source-review.md).
- Future Taita rate/renal/timed-monitoring recommendations need identifiable
  supporting evidence and review scope; #4 removes unsupported schedules.
  See [taita-source-review.md](taita-source-review.md).
- #2 emergency/provenance and #3 delirium/fever wording fixes are merged;
  coordinated `Medical` work is complete.

## Log

Newest first. One or two lines each: date, agent, what changed, where.

- **2026-11-08 · Claude · #10 render** · Final render paused at frames 0–89 of 210 at the owner's request. Those frames are preserved losslessly on the temporary branch `claude/opening-render-frames` (45 MB, no PR, does not deploy); it will be deleted once #10 carries the final clip. Please don't build on it.

- **2026-11-08 · Claude · #10** · Final cinematic render started (720 × 1280, 60 fps, 210 frames, about 7 h in five resumable chunks); `tools/opening/gate_opening.py` gains `--range` and `--skip-existing` for chunked renders. The draft clip in #10 will be replaced when it finishes.

- **2026-11-07 · Claude · opening choice** · Implemented on `claude/opening-choice`: classic `boot.js` now runs the spark study (traced word in the app font, ring drawn by the point, outExpo snaps, grain; attribution kept, the external-UI reference removed); new `opening-cinematic.js` plays `src/images/opening/cinematic.mp4` (draft render, 413 KB) and hands off through a flat SVG lockup to the Home header; Appearance gains Opening (Cinematic default / Classic / Off) inside the existing key. Blender scene in `tools/opening/`. 102 Node and 36 browser tests pass locally (installed Chromium). The private copy of `boot.js` in `Medical` now differs from this one.
- **2026-11-07 · Claude · opening choice** · Claimed the owner-requested opening work: port the spark study (variant B, from `Medical` branch `design/boot-spark-study`) into the classic `boot.js`, add the Blender-rendered cinematic opening with a flat SVG hand-off, and an Appearance choice between them. Work on `claude/opening-choice`; no merge requested.

- **2026-11-07 · Codex · #9 merge preparation** · The owner authorized the coordinated `Medical` compatibility merge first, then #9, followed by live deployment, synchronization and Safari recovery checks. The reviewed runtime is unchanged from `2c49f14`; GitHub passed 99 Node and 29 browser checks. Removed the completed implementation claim; recovery of the previously stuck Safari remains to be confirmed.

- **2026-11-07 · Codex · Offline recovery** · Claimed the reported stuck Installed pack flow. Reproduced an indefinitely pending browser registration leaving the UI checking with an ineffective update button. Added bounded registration/update checks, retained retry and guarded late replies; 99 Node tests pass. The affected Safari still serves the old pack; the new recovery UI needs release and real-browser confirmation. Consumer compatibility work is in `Medical` / `codex/offline-registration-compatibility`; no merge is authorized.

- **2026-11-07 · Codex · #8 merge preparation** · The owner authorized the coordinated `Medical` work first, then #8, followed by deployment/synchronization verification. The reviewed runtime is unchanged from `0112e79`; 82 Node and 28 browser checks passed. Removed the completed work claim for this authorized merge.

- **2026-11-07 · Codex · Drugs catalogue** · Claimed/implemented unified browsing/search with separate monograph/listing counts, bounded pages, scoped monograph filters and literal product-label lookup. All 82 Node tests, 17 focused Chrome checks and the 162-asset build/verification pass; 320/393 px Home/All/NTUH views were inspected. Clinical records and reviewed product associations are unchanged; no merge is authorized.

- **2026-11-07 · Codex · #7 handoff** · Completed the CI-only 180-second install deadline and five-second diagnostics bound. Independent review, 73 Node tests, the 162-asset build and a live locked-browser smoke passed; diagnostics return only known titles, worker states and counts. PR CI and owner merge authorization are tracked in #7.

- **2026-11-07 · Codex · deployment smoke follow-up** · Claimed/extended the CI-only complete-pack install wait to 180 seconds with allowlisted public status titles and bounded worker/cache diagnostics, retaining source, hash and offline checks. All 73 Node tests and the 162-asset build/verification pass; app, worker and clinical content are unchanged. This follow-up is not authorized to merge.

- **2026-11-07 · Codex · #4 merge preparation** · #2, #3 and #6 merged in order (`551bad7`, `c7fdb6b`, `5d54e2a`). Brought #4 onto that main, preserving the exact jointly reviewed runtime; final required CI and deployment checks complete this owner-authorized sequence. Coordination with `Medical` is ready.

- **2026-11-07 · Codex · #4 combined stage** · Staged the corrected fluids after the full guide stack for joint source/inventory/consumer validation; all 32 preceding guide records and all existing drug records are preserved. Actual public merges remain #2 → #3 → #6 → #4.

- **2026-11-07 · Codex · #4 evidence fix** · Claimed/corrected the four fluid records against linked manufacturer evidence and scoped adult fluid guidance; removed unsupported numerical schedules, retained composition/aliases, and added source-bound regressions. The owner authorizes merge fourth, after #2 → #3 → #6; consumer coordination is in `Medical`.

- **2026-11-07 · Codex · #4** · Claimed/rebased #4 onto `f640cd7`, retaining NTUH search/source policy and combining release notes. Verified public fluid composition; recorded the unsupported clinical-schedule attribution. The existing NTUH keyboard test now waits for All-scope activation. Preserved Claude's concurrent `fd84bd3` Taita-only alias assertions after the lease guard stopped the first push.

- **2026-11-07 · Codex · #6 merge preparation** · #3 merged at `c7fdb6b` after required CI. Restacked #6 onto that main, preserving the reviewed runtime bytes, and retargeted for required CI; third in the owner-requested order.

- **2026-11-07 · Codex · #3 merge preparation** · #2 merged at `551bad7` after checks; restacked #3 onto that main without runtime changes, then retargeted it for required CI. Coordinated `Medical` work is complete; continuing the owner-requested #2 → #3 → #6 → #4 order.
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

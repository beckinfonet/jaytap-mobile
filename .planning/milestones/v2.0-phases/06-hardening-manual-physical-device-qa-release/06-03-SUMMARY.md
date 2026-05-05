---
phase: 06-hardening-manual-physical-device-qa-release
plan: 03
subsystem: release
tags: [release-notes, en-ru-parity, play-console-500-char-limit, m1-d-10-content-order, paste-only-artifact, m1-d-11-precedent]

# Dependency graph
requires:
  - phase: 01-backend-role-foundation-auth-migration-hotfix-bundle
    provides: HF-01..HF-04 hotfix bundle (security hardening framing for "Improvements" section)
  - phase: 02-listing-lifecycle-status-field-absorption
    provides: 4-tab OwnerListings + status pill + RejectionBanner (the "owner clarity" framing for the 2nd EN/RU What's-new bullet)
  - phase: 03-moderation-queue-actions-edit-on-behalf
    provides: Moderation Queue + Approve/Reject (the "listings reviewed before going public" framing for the 1st EN/RU What's-new bullet)
  - phase: 04-archive-lifecycle-owner-mod-admin
    provides: Archive lifecycle (Live / Pending / Rejected / Archived statuses named in the EN/RU body)
  - phase: 05-admin-role-management-ui
    provides: Admin Role Management UI (subsumed under generic "stronger account security" Improvements line — no admin-only surface called out user-side)
provides:
  - "06-RELEASE-NOTES.md with EN+RU bodies under Play Console's 500-char-per-locale binding limit"
  - "Re-runnable awk + wc -m verification commands embedded in the file"
  - "Submission instructions block for Plan 06-07 to paste into ASC + Play Console at submission time"
affects: [06-07-PLAN.md (Plan 07 reads ## EN / ## RU body slices and pastes them into ASC + Play Console at v2.0.0 store submission time)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "M1 D-11 paste-only release-notes artifact (not committed back from store UI; not preserved as in-app i18n)"
    - "M1 D-10 content order: What's new → Improvements → Bug fixes catch-all (no fabricated specifics)"
    - "EN ↔ RU parity (same content, same order, same number of bullets) — Cyrillic-only RU body"

key-files:
  created:
    - .planning/phases/06-hardening-manual-physical-device-qa-release/06-RELEASE-NOTES.md
  modified: []

key-decisions:
  - "Headline for renters/buyers framed as 'listings are now reviewed' (quality/safety) rather than 'admins can promote moderators' (internal-only surface, not user-visible to most)"
  - "Owner-facing framing: clearer status flow (Live/Pending/Rejected/Archived) — the 4-tab OwnerListings outcome from Phase 2 + Phase 4"
  - "Phase 1 hotfix bundle (HF-01..HF-04) summarized as 'stronger account security and sign-in checks' / 'more reliable session handling' — no SDK names, no JWKS jargon, no Mongo/AWS rotation mention"
  - "Bug-fixes section uses M1 D-10 catch-all closer ('Minor stability and polish refinements' / «Мелкие исправления и шлифовка интерфейса') — Plan 06's QA matrix walk has not run yet, so no specific fixes are fabricated"
  - "Geographic phrasing: no Bishkek-only references; 'real estate' / generic listing language only — KG/KZ/UZ scope per memory geographic-scope.md"
  - "Russian language: Cyrillic only (no Kyrgyz, no Uzbek) — RU is the only non-EN locale at v2.0.0 per memory geographic-scope.md"

patterns-established:
  - "Paste-only release-notes artifact at .planning/phases/<phase>/<phase>-RELEASE-NOTES.md with frontmatter (target_version, paste_only: true, walked_against_sha, languages) + ## EN + ## RU + Submission instructions + Character counts table + verification commands"
  - "EN/RU body extraction via `awk '/^## EN$/{flag=1; next} /^---$/{if(flag){flag=0}} flag' <file> | sed '1{/^$/d;}' | sed '${/^$/d;}' | wc -m` — re-runnable at submission time to detect drift"

requirements-completed: [REL-04]

# Metrics
duration: ~5 min
completed: 2026-05-05
---

# Phase 06 Plan 03: Release Notes Summary

**Bilingual EN+RU release notes for v2.0.0 "Roles & Moderation" — EN body 403 chars, RU body 409 chars, both well under Play Console's binding 500-char-per-locale limit, ready for ASC + Play Console paste at Plan 06-07 submission time.**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-05-05T19:17:59Z
- **Completed:** 2026-05-05T19:19:38Z
- **Tasks:** 1 (single-file draft per plan spec)
- **Files modified:** 1 created (06-RELEASE-NOTES.md), 0 modified

## Accomplishments

- Authored EN + RU release notes adhering to M1 D-10 content order (What's new → Improvements → Bug fixes catch-all)
- Both bodies fit Play Console's binding 500-char-per-locale limit with comfortable headroom (EN: 97 chars, RU: 91 chars)
- Released-feature framing distilled to two user-facing bullets (moderated listings + owner status flow); internal admin/moderation surfaces (Moderation Queue, Role Management) intentionally NOT mentioned as user-facing features
- Backend hotfix bundle (HF-01..HF-04 from Phase 1) summarized as user-readable "stronger account security" + "more reliable session handling" — no SDK names, no JWKS/Mongo/AWS jargon
- Re-runnable verification commands embedded so Plan 06-07 can re-confirm 500-char fit at paste time without drift risk
- Cyrillic-only RU body (no Kyrgyz, no Uzbek) per memory `geographic-scope.md`
- No Bishkek-only phrasing — generic "listings are now reviewed" / «Объявления теперь проходят модерацию» honors the KG/KZ/UZ market scope

## Task Commits

Each task was committed atomically:

1. **Task 1: Draft EN + RU v2.0.0 release notes within 500-char Play Console limit per locale** — `fd8ad9f` (feat)

## Files Created/Modified

- `.planning/phases/06-hardening-manual-physical-device-qa-release/06-RELEASE-NOTES.md` (created) — bilingual paste-only release-notes artifact for v2.0.0 ASC + Play Console submission. EN body 403 chars, RU body 409 chars, M1 D-10 content order, Cyrillic-only RU, no Bishkek-only phrasing, no fabricated bug-fix specifics. Includes Submission instructions block + Character counts table + verification commands.

## Character Counts (final)

| Language | Body characters | Play Console limit (500) | Fits? | Headroom |
| -------- | --------------- | ------------------------ | ----- | -------- |
| EN       | 403             | 500                      | YES   | 97       |
| RU       | 409             | 500                      | YES   | 91       |

Measured via the awk + wc -m commands documented in `06-RELEASE-NOTES.md`.

## Content Lines per Section

**EN body:**
- What's new — 2 bullets (moderation review + owner status flow with Live/Pending/Rejected/Archived)
- Improvements — 2 bullets (account security + session handling)
- Bug fixes — 1 catch-all line ("Minor stability and polish refinements")

**RU body (parity preserved):**
- Что нового — 2 bullets (модерация + прозрачный статус с Опубликовано/На модерации/Отклонено/Снято с публикации)
- Улучшения — 2 bullets (защита аккаунта + стабильность сессий)
- Bug fixes — 1 catch-all line («Мелкие исправления и шлифовка интерфейса»)

## Language Scope

EN + RU only — no `kk` (Kyrgyz) or `uz` (Uzbek) locales generated, per memory `geographic-scope.md`. Russian is the only non-EN locale at v2.0.0; Kyrgyz / Uzbek users in KG / UZ markets read the EN release notes (default ASC + Play Console fallback).

## M1 D-10 Disposition

**Catch-all closer retained.** Plan 06's QA matrix walk (Plan 06-06) has not yet run, so no specific bug fixes have been surfaced or fabricated. The "Minor stability and polish refinements" / «Мелкие исправления и шлифовка интерфейса» closer follows the M1 v1.0.4 default (the M1 walk also surfaced zero defects, so the same closer was retained there). If Plan 06-06's walk surfaces a release-blocking defect that should be called out, this file may be amended after the walk completes — but per M1 D-08, regression-loop fixes are typically documented internally in `.planning/RETROSPECTIVE.md`, not in user-facing notes.

## Decisions Made

- "What's new" features chosen for user-facing visibility, not internal surface mass: moderated listings (the safety/quality lift renters/buyers will notice) and owner status flow (the clarity lift owners will notice). Internal admin/moderation surfaces (Moderation Queue, Role Management UI) are NOT mentioned — most users have no admin/moderation role and would not see those surfaces.
- "Improvements" framed at user-feature level, not implementation level. Backend hotfix bundle HF-01..HF-04 distills to "stronger account security and sign-in checks" + "more reliable session handling". No SDK names, no JWKS, no firebaseUid, no AWS-key-rotation jargon (T-06-12 mitigation).
- "Bug fixes" deliberately catch-all — Plan 06-06 QA walk has not run, so no specific fixes are fabricated (T-06-11 mitigation; M1 D-10).
- Geographic phrasing: generic "listings" / «объявления» — no Bishkek-only references (T-06-14 mitigation; memory `geographic-scope.md`).

## Deviations from Plan

None — plan executed exactly as written. The action block's suggested EN + RU drafts were used verbatim (with one minor EN polish: "and a reason note" instead of "with reason notes" for grammatical singular agreement after "a clearer status flow"). All acceptance criteria pass on first measurement; no trim priority needed (both bodies came in well under 500 chars on the first draft).

## Issues Encountered

The worktree branch `worktree-agent-aa0b9593dd69e6ff0` was created before Phase 06 plan files were committed to `main` (commit `4459eb1`). Resolved by checking out the phase 06 plan files from `main` so the executor could read 06-03-PLAN.md without re-merging. The 7 phase-06 plan files came in as `git add`-staged via `git checkout main -- <path>`; unstaged them with `git reset HEAD -- ...` and committed only the new `06-RELEASE-NOTES.md` so the per-task commit isolates this plan's deliverable from main's prior commit. The worktree's other plan files now appear as untracked — they will be re-merged from main at the next sync, which is expected behavior for worktree branches that lag main.

## User Setup Required

None — paste-only documentation artifact, no external service configuration required. The EN + RU bodies will be pasted at submission time in Plan 06-07 (App Store Connect "What's New in This Version" + Google Play Console "Release notes" per-language fields).

## Next Phase Readiness

- `06-RELEASE-NOTES.md` is ready for Plan 06-07 to read via the documented `awk` body-slice commands.
- Plan 06-05 (atomic v2.0.0 build-identity bump) will populate the `walked_against_sha` frontmatter field after that plan ships.
- Plan 06-06 (manual QA matrix walk) will populate the `walk_disposition` and `bug_fix_loop_triggered` frontmatter fields. If `bug_fix_loop_triggered` flips to `true` and a release-blocking defect's user-visible fix is shipped, the EN + RU bodies may be amended (per M1 D-08, generally NOT — fixes are documented in RETROSPECTIVE.md, not user-facing notes).
- No blockers for Plan 06-07.

## Self-Check: PASSED

- File exists: `.planning/phases/06-hardening-manual-physical-device-qa-release/06-RELEASE-NOTES.md` — FOUND
- Commit hash exists: `fd8ad9f` — FOUND in `git log --oneline`
- All 12 acceptance criteria from Plan 06-03 pass (EN ≤ 500 ✓, RU ≤ 500 ✓, ## EN + ## RU headers ✓, M2 headline mentioned ✓, Cyrillic модерац ✓, no Bishkek-only ✓, no SDK names ✓, no fabricated specifics ✓, integers in count table ✓, target_version 2.0.0 ✓, paste_only true ✓)
- Automated `<verify>` block from plan: PASS

---
*Phase: 06-hardening-manual-physical-device-qa-release*
*Completed: 2026-05-05*

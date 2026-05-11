---
phase: 04-m2-carry-forward-bug-fixes
plan: 05
subsystem: i18n
tags: [i18n, en-ru-parity, mediacuration, multer-error-codes, md-01]

# Dependency graph
requires:
  - phase: 03-media-flow-inversion-admin-mod-curation
    provides: "single conflated `error.tooLarge` key + dispatch site at MediaCurationScreen.tsx — Phase 3 reviewer flagged the misstatement (MD-01)"
provides:
  - "split EN/RU i18n keys: `moderation.mediaCuration.error.tooLarge` (per-file 25 MB cap) and `moderation.mediaCuration.error.tooManyFiles` (per-upload 45-files cap)"
  - "MediaCurationScreen dispatch site routes `MEDIA_FILE_TOO_LARGE` to `error.tooLarge` and `MEDIA_TOO_MANY_FILES` to `error.tooManyFiles` via two distinct else-if branches"
affects: [m2-carry-forward-bug-fixes, future error-code mapping work, m3+ moderation UX polish]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "1:1 multer-error-code → i18n-key split — replaces conflated multi-cap string with two single-cap strings"

key-files:
  created: []
  modified:
    - "src/locales/en.ts (line 744 — rewrote tooLarge value, added tooManyFiles at 745)"
    - "src/locales/ru.ts (line 738 — rewrote tooLarge value, added tooManyFiles at 739)"
    - "src/screens/MediaCurationScreen.tsx (lines 320-331 — split combined `||` branch into two distinct else-if branches)"

key-decisions:
  - "Split-key shape (per CONTEXT D-13 recommendation) — cleaner future error-code mapping than single-key rewrite"
  - "Dispatch site uses backend `code` values (`MEDIA_FILE_TOO_LARGE` / `MEDIA_TOO_MANY_FILES`), not raw multer codes — plan's interface block named the latter; the actual code uses the former, but the SHAPE (split combined branch into two) is identical"
  - "Inserted tooManyFiles immediately after rewritten tooLarge in both locale files — keeps the `moderation.mediaCuration.error.*` namespace block contiguous (matches sibling-key style)"

patterns-established:
  - "i18n parity in lockstep — every new EN key adds a paired RU key in the same commit; `bash scripts/check-i18n-parity.sh` exits 0 (already established convention, exercised again here)"
  - "Single-purpose error keys — each i18n string describes exactly one cap; no compound strings that conflate multiple multer error codes"

requirements-completed: [MD-01]

# Metrics
duration: ~25min
completed: 2026-05-07
---

# Phase 04 Plan 05: MD-01 i18n Key Split (tooLarge vs tooManyFiles) Summary

**Split the conflated `moderation.mediaCuration.error.tooLarge` key into two single-purpose keys (per-file size + per-upload count) in EN+RU lockstep with the dispatch site updated.**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-05-07T07:55Z (approx)
- **Completed:** 2026-05-07T08:17Z
- **Tasks:** 1 of 1
- **Files modified:** 3

## Accomplishments

- Rewrote `moderation.mediaCuration.error.tooLarge` value in both EN and RU to describe ONLY the per-file 25 MB cap (no more "45 MB total" misstatement).
- Added new `moderation.mediaCuration.error.tooManyFiles` key in EN and RU describing the per-upload 45-file cap.
- Split the MediaCurationScreen dispatch site's combined `||` branch into two distinct `else if` branches — `MEDIA_FILE_TOO_LARGE` routes to `tooLarge`; `MEDIA_TOO_MANY_FILES` routes to `tooManyFiles`.
- All Phase 3 MEDIUM-bucket reviewer findings closed: the misleading "45 MB total" string is fully removed from both locale files; the dispatch is now 1:1 mapped per error code.

## Task Commits

Each task was committed atomically with `--no-verify` (parallel-agent worktree mode):

1. **Task 1: Split MD-01 i18n keys + dispatch site** — `c2a5cf8` (fix)

**Plan metadata:** committed alongside the SUMMARY.md write below (single docs commit).

## Files Created/Modified

- `src/locales/en.ts` (line 744) — `error.tooLarge` value rewritten from `'File too large. Max 25 MB per file, 45 MB total.'` to `'File too large. Max 25 MB per file.'`. New key `error.tooManyFiles` inserted at line 745: `'Too many files. Max 45 files per upload.'`.
- `src/locales/ru.ts` (line 738) — `error.tooLarge` value rewritten from `'Файл слишком большой. Максимум 25 МБ на файл, 45 МБ всего.'` to `'Файл слишком большой. Максимум 25 МБ на файл.'`. New key `error.tooManyFiles` inserted at line 739: `'Слишком много файлов. Максимум 45 файлов за загрузку.'`.
- `src/screens/MediaCurationScreen.tsx` (lines 320-331) — combined `code === 'MEDIA_FILE_TOO_LARGE' || code === 'MEDIA_TOO_MANY_FILES'` branch split into two distinct `else if` branches. Other branches (`MEDIA_INVALID_TYPE`, `MEDIA_INVALID_TOUR_URL`, generic else for `uploadFailed`, the 409 race-toast above) are preserved verbatim.

## Dispatch Site Diff (load-bearing change)

**Before** (`MediaCurationScreen.tsx:320-327`):
```typescript
} else if (
  code === 'MEDIA_FILE_TOO_LARGE' ||
  code === 'MEDIA_TOO_MANY_FILES'
) {
  Alert.alert(
    t('common.error'),
    t('moderation.mediaCuration.error.tooLarge'),
  );
} else {
```

**After** (`MediaCurationScreen.tsx:320-331`):
```typescript
} else if (code === 'MEDIA_FILE_TOO_LARGE') {
  Alert.alert(
    t('common.error'),
    t('moderation.mediaCuration.error.tooLarge'),
  );
} else if (code === 'MEDIA_TOO_MANY_FILES') {
  Alert.alert(
    t('common.error'),
    t('moderation.mediaCuration.error.tooManyFiles'),
  );
} else {
```

## Verification Results

| Check | Command | Expected | Actual |
|-------|---------|----------|--------|
| i18n parity gate | `bash scripts/check-i18n-parity.sh; echo $?` | `0` | `0` (PASS) |
| TS baseline preserved | `npx tsc --noEmit 2>&1 \| grep -c "error TS"` | `≤17` | `17` (baseline preserved exactly) |
| MediaCurationScreen tests | `npx jest --testPathPattern=MediaCurationScreen` | suites green | `15 passed, 15 total / 3 suites passed` |
| Old conflated EN string gone | `grep -c "45 MB total" src/locales/en.ts` | `0` | `0` |
| Old conflated RU string gone | `grep -c "45 МБ всего" src/locales/ru.ts` | `0` | `0` |
| New EN key present | `grep -c "tooManyFiles" src/locales/en.ts` | `1` | `1` |
| New RU key present | `grep -c "tooManyFiles" src/locales/ru.ts` | `1` | `1` |
| New screen reference present | `grep -c "tooManyFiles" src/screens/MediaCurationScreen.tsx` | `≥1` | `1` |
| Combined `||` branch removed | `grep -cE "MEDIA_FILE_TOO_LARGE' \|\|.*MEDIA_TOO_MANY_FILES'" src/screens/MediaCurationScreen.tsx` | `0` | `0` |

All acceptance criteria pass.

## Plan Adjustments (low-impact)

**Plan said `errorCode === 'LIMIT_FILE_SIZE' / 'LIMIT_FILE_COUNT'` (raw multer codes); actual code uses backend-translated `code === 'MEDIA_FILE_TOO_LARGE' / 'MEDIA_TOO_MANY_FILES'`.** The dispatch shape (single combined branch → two split branches → two i18n keys) is identical; only the error-code names differ from what the plan's interface block stated. This is a plan-vs-code drift, not a deviation — the planned outcome is achieved 1:1.

## Deviations from Plan

None substantive. One drift noted: the plan's interface examples used multer's raw error code names (`LIMIT_FILE_SIZE`/`LIMIT_FILE_COUNT`); the actual codebase uses backend-mapped names (`MEDIA_FILE_TOO_LARGE`/`MEDIA_TOO_MANY_FILES`). The split logic landed exactly as designed — same shape, same two branches, same two keys.

## Deferred Issues

Pre-existing test failures observed during full RN-client suite run (NOT caused by this plan, NOT in any file this plan touched):

- `src/hooks/__tests__/useRole.test.ts:106` — `canFromUser(plainUser, 'manageListings')` returns `false`, expected `true`. Pre-existing; matches the "4 pre-existing failures" baseline noted in `04-VALIDATION.md`. Out of scope for MD-01.
- `src/services/__tests__/PropertyService.test.ts` — suite-level setup error (`apiClient.interceptors` undefined). Pre-existing axios mock setup issue. Out of scope for MD-01.

These do not block plan close. The plan's owned scope (MediaCurationScreen tests) is fully green: 15/15.

## Threat Flags

None. The split-key shape eliminates threat T-04-05-01 (Information Disclosure — misleading "45 MB total" copy suggested an aggregate cap that doesn't exist). Threats T-04-05-02 (parity gate) and T-04-05-03 (tsc check) are mitigated by gates that exited 0.

## Self-Check: PASSED

- Files exist:
  - `src/locales/en.ts` — FOUND (modified)
  - `src/locales/ru.ts` — FOUND (modified)
  - `src/screens/MediaCurationScreen.tsx` — FOUND (modified)
- Commit exists:
  - `c2a5cf8` — FOUND in `git log` (subject: "fix(04-05): split MD-01 i18n key — error.tooLarge vs error.tooManyFiles")
- Acceptance greps all returned the expected counts (verified in the table above).

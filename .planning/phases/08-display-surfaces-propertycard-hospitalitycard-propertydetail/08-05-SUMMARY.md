---
phase: 08-display-surfaces-propertycard-hospitalitycard-propertydetail
plan: 05
subsystem: components
tags: [react-native, component, cleanup, surgical-removal, regression-fence, listing-meta-table, display-surfaces]

# Dependency graph
requires:
  - phase: 08-display-surfaces-propertycard-hospitalitycard-propertydetail
    plan: 01
    provides: "3 new property.specs.* locale keys (foundation for Phase 8 specs-row flips); Plan 08-05 does not consume them directly — it deletes legacy beds/baths read paths so plan 04's PropertyDetailsScreen specs row stays the sole surface"
provides:
  - "DISP-03 sub-clause 'canonical specs row only; no duplicate' closed for ListingMetaTable: rooms row + bathroom-enum row + their derivations + their hasExtras chain links surgically removed"
  - "Co-located regression fence (src/components/__tests__/ListingMetaTable.test.tsx, 6 cases) pinning the 4-edit deletion against future re-introduction"
affects: [09-i18n-audit]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Surgical-removal posture (zero replacement, deletion-only) — mirrors 260525-i2i quick task (commit 15f1010) which removed the duplicate m² render from the same extras grid"
    - "Literal-i18n-key assertion strategy in tests — matches the t-mock-returns-key-verbatim convention shared with PropertyCard.specChip.test.tsx; asserting on resolved EN values would silently mask regressions"

key-files:
  created:
    - "src/components/__tests__/ListingMetaTable.test.tsx (248 lines, 6 test cases — NEW; no prior ListingMetaTable suite in the repo)"
  modified:
    - "src/components/ListingMetaTable.tsx (18 deletions, 0 insertions across 4 surgical edits)"

key-decisions:
  - "Deletion-only, no replacement — D-10 invariant from 08-CONTEXT.md; the canonical specs row in PropertyDetailsScreen (plan 04 territory) is the sole beds/baths surface after Phase 8"
  - "Assert on literal i18n keys (`property.beds`, `property.baths`, `property.bathroomPrivate/Shared/None`) instead of resolved EN values — the t mock returns keys verbatim, so resolved-value assertions would always be false (silent regression masking). Documented inline at test L29-31 + L143-145"
  - "Combined deposit-value assertion narrowed from `s === 1000 || s === '1000' || s.includes('KGS')` to `s.includes('KGS')` after tsc TS2367 flagged the number-vs-string comparison as type-impossible (texts is `string[]`); the currency-segment match is a sufficient row-renders sentinel"

patterns-established:
  - "Co-located component test scaffold: lean jest.mock block (only useTheme + useLanguage), `setupMocks` helper with key-verbatim t mock, makeProperty/renderMeta fixture builders, collectTexts helper cloned from PropertyCard.specChip.test.tsx:111-124, descriptive test() names per case — drop-in template for future ListingMetaTable surface tests in Phase 9+"

requirements-completed: [DISP-03]

# Metrics
duration: ~10min
completed: 2026-05-26
---

# Phase 8 Plan 08-05: ListingMetaTable Surgical Removal Summary

**Removed the duplicate Beds row + Bathroom-enum row from ListingMetaTable's extras grid (4 surgical edits, 18 lines deleted, zero added). DISP-03's `canonical specs row only; no duplicate` sub-clause is now satisfied — Phase 8 plan 04's PropertyDetailsScreen specs row is the sole beds/baths surface. New co-located regression fence test file (6 cases, all passing) pins the deletion against future re-introduction.**

## Performance

- **Started:** 2026-05-26 (worktree-agent-a1d34b87d61424c4a)
- **Tasks:** 2 / 2
- **Files modified:** 1 (`src/components/ListingMetaTable.tsx`)
- **Files created:** 1 (`src/components/__tests__/ListingMetaTable.test.tsx`)
- **Diff scope:** 18 deletions in source, 248 insertions in new test file → -18/+248 net (test file is additive only)

## Diff Scope (Source File)

| Edit | Location (pre-edit) | Lines | Description |
|------|---------------------|-------|-------------|
| 1 | L163–167 | -5 | Delete `{rooms != null && (<Text>… {t('property.beds')}: {rooms} …</Text>)}` JSX row block |
| 2 | L168–176 | -9 | Delete `{bathroom != null && (<Text>… {t('property.baths')}: <private/shared/none enum> …</Text>)}` JSX row block (including all 3 enum-resolution branches) |
| 3 | L68–69 | -2 | Delete `const rooms = property?.basics?.rooms;` + `const bathroom = property?.basics?.bathroom;` derivations |
| 4 | L78–87 | -2 (net) | Drop `rooms != null ||` and `bathroom != null ||` links from the `hasExtras` chain |

**Total: -18 lines, +0 lines in `src/components/ListingMetaTable.tsx`.**

## Four Grep-Zero Invariants (All Hold)

| Invariant | Pre-edit count | Post-edit count |
|-----------|----------------|------------------|
| `grep -c "rooms != null" src/components/ListingMetaTable.tsx` | 2 | **0** ✅ |
| `grep -c "bathroom != null" src/components/ListingMetaTable.tsx` | 2 | **0** ✅ |
| `grep -c "const rooms = property" src/components/ListingMetaTable.tsx` | 1 | **0** ✅ |
| `grep -c "const bathroom = property" src/components/ListingMetaTable.tsx` | 1 | **0** ✅ |

Additional consumption-side invariants:

- `grep -c "property.beds"` → **0** ✅ (no `t('property.beds')` call site remains in this file)
- `grep -c "property.baths"` → **0** ✅
- `grep -c "property.bathroomPrivate\|property.bathroomShared\|property.bathroomNone"` → **0** ✅

## `hasExtras` Chain Post-Edit (7 Remaining Contributors)

```ts
const hasExtras =
  areaSqm != null ||
  condition != null ||
  furnished != null ||
  negotiable != null ||
  deposit != null ||
  prepaymentMonths != null ||
  minTerm != null;
```

`hasExtras` count in the file = **3** (declaration + extras-grid gate + the contributor list itself). The chain still gates the extras grid correctly via 7 other fields; the gate logic is preserved end-to-end.

## New Test File

**Path:** `src/components/__tests__/ListingMetaTable.test.tsx`

**6 cases, all passing (`Tests: 6 passed, 6 total`, jest exit code **0**):**

1. `rooms-only property does NOT render a Beds row AND the extras grid is gated off` — Edit 1 + Edit 4 regression fence
2. `bathroom-only property does NOT render a Baths row AND no enum-resolution key appears` — Edit 2 + Edit 4 regression fence (asserts on `property.bathroomPrivate/Shared/None` literal keys)
3. `rooms + bathroom only does NOT render either row; extras grid stays gated off` — combined regression: hasExtras chain proven to no longer treat either field as a contributor
4. `rooms + deposit renders ONLY the deposit row (rooms no longer contributes to hasExtras)` — proves no chain coupling; deposit row sentinel via `property.metaDeposit` + `KGS` currency segment
5. `bathroom + condition renders ONLY the condition row (bathroom no longer contributes to hasExtras)` — proves no chain coupling; condition row sentinel via `property.metaCondition` + value `'good'`
6. `all 7 other extras render correctly when present; no rooms/bathroom rows` — happy-path no-collateral-damage proof; sentinels for condition/furnished/minTerm/deposit/prepayment/negotiable all fire

**Assertion strategy:** all "row absent" assertions use literal i18n key strings (`property.beds`, `property.baths`, `property.bathroomPrivate/Shared/None`) matching the t-mock-returns-key-verbatim convention. Inline comments at test L29-31 + L143-145 document why resolved EN values would silently mask regressions.

**Test stack:** `react-test-renderer` + `act` only — no `@testing-library/*`, no `jest-native`. Matches repo convention per `PropertyCard.specChip.test.tsx` L20-23 + `StepperInput.test.tsx`.

## Cross-Reference to 260525-i2i

This plan mirrors the surgical posture of quick task **260525-i2i** (commit `15f1010`, merged as `5a728a4`), which removed the duplicate `m²` render from the same extras grid in `ListingMetaTable.tsx` (5-line deletion, zero replacement, same file, same posture). The 260525-i2i task also surfaced the M4 schema/UX gap that this phase closes (`basics.rooms` is total-rooms not bedroom-count; `basics.bathroom` is captured only for office/commercial). 260525-i2i deleted the m² duplicate; plan 08-05 deletes the rooms + bathroom-enum duplicates.

## Task Commits

Each task committed atomically on `worktree-agent-a1d34b87d61424c4a`:

1. **Task 1: Surgical removal** — `351cad0` (refactor)
   - `refactor(08-05): surgically remove rooms + bathroom-enum rows from ListingMetaTable extras grid`
   - 1 file changed, 18 deletions(-)

2. **Task 2: Regression fence test file** — `40c6d78` (test)
   - `test(08-05): add ListingMetaTable surgical-removal regression fence + happy-path extras coverage`
   - 1 file changed, 248 insertions(+)

## Verification Outputs

- `grep -c "rooms != null\|bathroom != null\|const rooms = property\|const bathroom = property" src/components/ListingMetaTable.tsx` → **0** ✅
- `grep -c "property.beds\|property.baths\|property.bathroomPrivate\|property.bathroomShared\|property.bathroomNone" src/components/ListingMetaTable.tsx` → **0** ✅
- `grep -c "hasExtras" src/components/ListingMetaTable.tsx` → **3** ✅ (≥ 2 required)
- `grep -c "areaSqm" src/components/ListingMetaTable.tsx` → **2** ✅ (≥ 1 required; declaration + chain link)
- `npx jest src/components/__tests__/ListingMetaTable.test.tsx --no-coverage` → **6 passed, 6 total**, exit **0** ✅
- `bash scripts/check-i18n-parity.sh` → **exit 0**, `PASS: FORM-09 key-set parity holds` ✅
- `grep -rn "keyboardVerticalOffset" src/ | wc -l | tr -d ' '` → **0** ✅ (KBD-02 grep gate held; M1 + M2 + M3 invariant carried forward)
- `npx tsc --noEmit` → **zero net-new errors** introduced by this plan vs. pre-edit baseline. All other tsc errors are pre-existing in unrelated files (`App.tsx` Property.tours, `src/components/DeleteListingModal.tsx` Property.title/address, `src/screens/ChatComposeScreen.tsx` Property.title/imageUrl/images, `src/screens/ChatScreen.tsx` Property.title, `src/screens/ScheduleViewingScreen.tsx` Property.title, `src/screens/TourSelectionScreen.tsx` Tour/tours, `src/theme/ThemeContext.tsx` ColorSchemeName, `src/components/__tests__/StepperInput.test.tsx` ElementType comparison).
- Other extras-row identifiers all still present in the file: `condition` (8 hits), `furnished` (5), `negotiable` (4), `deposit` (5), `prepaymentMonths` (5), `minTerm` (5).

## Decisions Made

- **Deletion-only, zero replacement (D-10 enforcement)** — no new fields, no new rows, no new locale keys consumed in this file. The canonical specs row in PropertyDetailsScreen (plan 04 territory) is the sole beds/baths surface after Phase 8.
- **Literal i18n key assertions, not resolved EN values** — the t mock returns keys verbatim, so `texts.includes('Beds:')` would always be false (the mock never produces `'Beds:'`) and would silently mask a regression even if the deleted row block were re-introduced. Documented at test L29-31 + L143-145.
- **Narrowed Test 4 deposit assertion after tsc** — initial draft used `s === 1000 || s === '1000' || s.includes('KGS')`; tsc TS2367 flagged the number-vs-string branch as type-impossible (collectTexts returns `string[]`). Narrowed to `s.includes('KGS')` — the currency segment is sufficient to sentinel that the deposit row's value side rendered.

## Deviations from Plan

None — both tasks executed exactly as written. The only mid-execution adjustment was the deposit-assertion narrowing in Test 4 (single in-test diff to satisfy `npx tsc --noEmit` zero-net-new-errors; semantically equivalent assertion, no scope change).

## Issues Encountered

None. Initial test draft introduced 1 net-new tsc error (TS2367 deposit-amount comparison) which was caught by the post-write `npx tsc --noEmit` step and fixed in the same task before commit; the committed test file has zero net-new tsc errors.

## User Setup Required

None.

## Next Phase Readiness

- **Phase 8 wave 2 (this plan) closes DISP-03 for ListingMetaTable.** Combined with plan 08-04 (PropertyDetailsScreen canonical specs row), Phase 8 now satisfies DISP-03's full clause: PropertyDetailsScreen surfaces beds/baths exclusively through the canonical specs row, with no duplicate render in the ID/availability/extras meta table immediately above.
- **Phase 9 (i18n audit + sentinel) ready** — this plan does not touch locales, so check-i18n-parity.sh remains green commit-by-commit through the whole phase, preserving Phase 9's parity-gate posture.
- **No blockers** for downstream waves.

## Self-Check: PASSED

- ✅ `src/components/ListingMetaTable.tsx` post-edit file exists; verified 273 lines (was 291); 4 surgical edits applied.
- ✅ `src/components/__tests__/ListingMetaTable.test.tsx` post-write file exists; 248 lines.
- ✅ Commit `351cad0` present in `git log` (Task 1 — surgical removal)
- ✅ Commit `40c6d78` present in `git log` (Task 2 — regression fence test file)
- ✅ Both commits on `worktree-agent-a1d34b87d61424c4a` per parallel-executor mode
- ✅ All four grep-zero invariants verified (rooms != null, bathroom != null, const rooms, const bathroom — all 0)
- ✅ All five consumption-side invariants verified (property.beds, property.baths, property.bathroomPrivate, property.bathroomShared, property.bathroomNone — all 0)
- ✅ `hasExtras` post-edit chain confirmed: 7 remaining contributors (areaSqm + condition + furnished + negotiable + deposit + prepaymentMonths + minTerm)
- ✅ `npx jest src/components/__tests__/ListingMetaTable.test.tsx --no-coverage` → 6 passed, 6 total, exit 0
- ✅ `bash scripts/check-i18n-parity.sh` exit 0
- ✅ KBD-02 grep gate: `keyboardVerticalOffset` count in `src/` = 0
- ✅ Zero net-new tsc errors

---
*Phase: 08-display-surfaces-propertycard-hospitalitycard-propertydetail*
*Plan: 05*
*Completed: 2026-05-26*

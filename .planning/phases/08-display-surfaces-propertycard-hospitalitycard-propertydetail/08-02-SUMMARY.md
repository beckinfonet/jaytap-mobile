---
phase: 08-display-surfaces-propertycard-hospitalitycard-propertydetail
plan: 02
subsystem: components
tags: [react-native, component, presentational, i18n, property-specs, display-surfaces]

# Dependency graph
requires:
  - phase: 08-display-surfaces-propertycard-hospitalitycard-propertydetail
    plan: 01
    provides: "3 new property.specs.* locale keys (bedrooms / bathrooms / rooms) consumed by PropertyCard via t() calls"
  - phase: 06-schema-extension-backend-mongoose-rn-type-stub-body-strip-va
    provides: "basics.bedrooms + basics.bathroomCount fields on Property type (M4 SCHEMA-03)"
  - phase: 07-stepper-component-contextual-listing-flow-integration
    provides: "Form-side capture of basics.bedrooms + basics.bathroomCount (FORM-01..05 closed write-side)"
provides:
  - "PropertyCard specs-strip redesigned with icon/value/label cell anatomy reading basics.bedrooms + basics.bathroomCount"
  - "showBedsCell propertyType gate (omits Beds cell on office/commercial)"
  - "styles.specItem flexDirection mutated to 'column' (matches PropertyDetailsScreen specItem anatomy)"
  - "styles.specLabel { fontSize: 12 } added"
  - "PropertyCard.test.tsx co-located behavior fence (5 cases, all passing)"
affects: [08-03, 08-04, 08-05]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "icon + value + label column-stacked cell anatomy on PropertyCard (mirrors PropertyDetailsScreen specs row at lines 1042-1076)"
    - "propertyType-driven cell-visibility gate via {showBedsCell && <View />} (D-02 — same conditional-render-the-View shape as PropertyCard's showEditButton ternary)"
    - "i18n type-assertion `t('property.specs.bedrooms' as any)` continuing the existing PropertyCard.tsx:291 pattern"
    - "co-located test file alongside historical regression fence (additive option (b) from 08-PATTERNS.md L26)"

key-files:
  created:
    - "src/components/__tests__/PropertyCard.test.tsx (202 lines, 5 test cases, react-test-renderer stack)"
  modified:
    - "src/components/PropertyCard.tsx (specs-strip branch lines 280-300 + StyleSheet block lines 463-476; +35 / -21 lines)"

key-decisions:
  - "Used IIFE wrapper for the specs-strip ternary's else-branch to scope the showBedsCell derivation cleanly (preserves the outer showEditButton ternary structure verbatim per D-13)"
  - "Left PropertyCard.specChip.test.tsx UNTOUCHED per plan acceptance criterion (zero git diff on that file) — the historical 260525-ggp regression fence is on-disk preserved even though its assertions now fail because the read paths it pinned (basics.hotelRooms ?? basics.rooms + bathroom enum) were intentionally removed by D-03 + D-04. Tracked as deviation."
  - "Decimal formatting on bathroomCount uses React Native's default Text coercion (1.5 → '1.5', 2 → '2') per CONTEXT D-04 'decimals like 1.5 preserved' — no inline formatBathroomCount helper introduced since the inline path is sufficient"

patterns-established:
  - "showBedsCell propertyType gate pattern: `const showBedsCell = !(propertyType === 'office' || propertyType === 'commercial')` — Plans 08-04 (PropertyDetailsScreen) will reuse the identical predicate"
  - "icon-top / value-middle / label-bottom column-stacked spec cell on browse-card surfaces (was already canonical on PropertyDetailsScreen; now propagates to PropertyCard)"

requirements-completed: [DISP-01, DISP-02]
requirements-touched: [DISP-05]

# Metrics
duration: 3min
completed: 2026-05-26
---

# Phase 8 Plan 02: PropertyCard Specs-Strip Redesign Summary

**PropertyCard's specs-strip branch is rewritten with the new icon/value/label cell anatomy that surfaces M4 `basics.bedrooms` + `basics.bathroomCount` fields with localized "Bedrooms"/"Bathrooms" labels distinguishing residential from generic. Dead `basics.hotelRooms ?? basics.rooms` fallback (D-03) and the legacy `basics.bathroom` enum render (D-04) are dropped. Beds cell hides entirely on office/commercial (D-02). A new co-located PropertyCard.test.tsx with 5 cases lands alongside the preserved (on-disk) specChip regression fence.**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-05-26T01:50:03Z
- **Completed:** 2026-05-26T01:53:14Z
- **Tasks:** 2 / 2
- **Files modified:** 1 (`src/components/PropertyCard.tsx`)
- **Files created:** 1 (`src/components/__tests__/PropertyCard.test.tsx`)

## Accomplishments

### PropertyCard.tsx specs-strip rewrite (Task 1)

- **D-01:** Specs-strip `else`-branch (formerly lines 279-300) replaced with icon/value/label cell anatomy. Each cell renders `<Bed>` or `<Bath>` icon top, numeric value middle, localized label below (column-stacked).
- **D-02:** `showBedsCell` derivation gates the Beds cell + its trailing divider — both omit entirely when `propertyType === 'office' || propertyType === 'commercial'`. Office/commercial listings render a single-cell Baths-only strip.
- **D-03:** Dead `basics?.hotelRooms ?? basics?.rooms ?? '-'` fallback chain REMOVED. PropertyCard now reads `basics?.bedrooms ?? '-'` only — single source. The defensive chain is unnecessary post 260525-ggp routing fix (PropertyCard never sees hospitality data in production; that traffic routes to HospitalityCard via `propertyCategory.ts:65`).
- **D-04:** Bathroom enum render (private/shared/none → translated keys) REMOVED. PropertyCard now reads `basics?.bathroomCount ?? '-'` only. The enum still exists in the schema and form-input layer, but the card surface no longer renders it.
- **D-05:** Style mutation — `styles.specItem` flexDirection changed from `'row'` to `'column'` (mirrors `PropertyDetailsScreen.tsx:1993-1995` specItem anatomy). New `styles.specLabel { fontSize: 12 }` added (mirrors `PropertyDetailsScreen.tsx:2004-2006`).
- i18n keys consumed via existing type-assertion pattern: `t('property.specs.bedrooms' as any)` + `t('property.specs.bathrooms' as any)` (Plan 08-01 keys; pattern continues `PropertyCard.tsx:291` precedent).
- Outer `showEditButton` ternary structure preserved verbatim — owner-action chrome (Edit / Archive / Unarchive / Delete) untouched (D-13).
- Heart/favorite button, share button, hero photo, ListingMetaTable, StatusPill, badges — all untouched.

### Co-located test fence (Task 2)

- New file `src/components/__tests__/PropertyCard.test.tsx` (202 lines, 5 test cases) — test stack cloned from `PropertyCard.specChip.test.tsx`:
  - `react-test-renderer` + `act()` only (no RTL, no jest-native — project convention)
  - `useTheme`/`useAuth`/`useLanguage` mocked via `jest.mock` + re-require
  - `ListingMetaTable` + `StatusPill` mocked to `() => null`
  - `lucide-react-native` icon set mocked to `() => null`
  - `t` mock returns the key verbatim, allowing assertions to match `'property.specs.bedrooms'` literally
  - `collectTexts(tree)` helper cloned from specChip:111-124 (with a small +`typeof c === 'number'` branch so numeric values like `2` / `1.5` are collected as strings for assertion parity)
- Cases:
  1. apartment full (`bedrooms=2, bathroomCount=1.5`) → both values + both labels render
  2. house bedroom-only (`bedrooms=3`, no `bathroomCount`) → `'3'`, `'-'`, both labels
  3. office Beds-hidden (`bathroomCount=1`, no `bedrooms`) → asserts ABSENCE of `'property.specs.bedrooms'`, Baths cell still renders
  4. commercial Beds-hidden (integer `bathroomCount=2`) → asserts ABSENCE of `'property.specs.bedrooms'`, Baths cell renders `'2'`
  5. apartment empty basics (`basics={}`) → both cells fall through to `'-'`, labels still present (≥ 2 dashes)
- All 5 cases pass: `npx jest src/components/__tests__/PropertyCard.test.tsx --no-coverage` exits 0 with `Tests: 5 passed, 5 total`.

## Task Commits

Each task was committed atomically:

1. **Task 1: Rewrite PropertyCard specs-strip with icon/value/label anatomy** — `9fba63e` (feat)
   - `feat(08-02): rewrite PropertyCard specs-strip with icon/value/label anatomy`
2. **Task 2: Add PropertyCard.test.tsx Phase-8 anatomy fence (5 cases)** — `792db68` (test)
   - `test(08-02): add PropertyCard.test.tsx Phase-8 anatomy fence (5 cases)`

## Files Created/Modified

- `src/components/PropertyCard.tsx` — Modified. Specs-strip `else`-branch (formerly lines 279-300, 21 LOC) replaced with the new IIFE-wrapped icon/value/label anatomy (35 LOC including `showBedsCell` derivation + Phase-8 D-01..D-04 commentary). StyleSheet block (formerly lines 463-476) mutated: `specItem.flexDirection` `'row'` → `'column'`; new `specLabel { fontSize: 12 }` entry added with anchor comment. Net +35 / -21 lines.
- `src/components/__tests__/PropertyCard.test.tsx` — Created (NEW file, 202 lines). 5 test cases asserting Phase-8 cell anatomy. Test stack matches `PropertyCard.specChip.test.tsx` verbatim except for the additional `typeof c === 'number'` branch in `collectTexts` (so the numeric `bedrooms=2` / `bathroomCount=1.5` props are stringified into the texts array for `toContain('2')` / `toContain('1.5')` assertions).
- `src/components/__tests__/PropertyCard.specChip.test.tsx` — **UNTOUCHED** (git diff vs main = 0 lines). On-disk preservation per plan acceptance criterion.

## Verification Outputs

| Check | Expected | Actual |
|---|---|---|
| `grep -c "basics?.hotelRooms" src/components/PropertyCard.tsx` (D-03 removal) | 0 | **0** ✅ |
| `grep -c "basics?.bathroom === 'private'" src/components/PropertyCard.tsx` (D-04 removal) | 0 | **0** ✅ |
| `grep -c "basics?.bedrooms" src/components/PropertyCard.tsx` (DISP-01 single read) | 1 | **1** ✅ |
| `grep -c "basics?.bathroomCount" src/components/PropertyCard.tsx` (DISP-02 single read) | 1 | **1** ✅ |
| `grep -c "property.specs.bedrooms" src/components/PropertyCard.tsx` | 1 | **1** ✅ |
| `grep -c "property.specs.bathrooms" src/components/PropertyCard.tsx` | 1 | **1** ✅ |
| `grep -c "showBedsCell" src/components/PropertyCard.tsx` (D-02 gate) | ≥ 2 | **3** ✅ |
| `grep -c "specLabel" src/components/PropertyCard.tsx` (D-01 style) | ≥ 3 | **4** ✅ |
| `specItem` block contains `flexDirection: 'column'` | true | **true** ✅ |
| `bash scripts/check-i18n-parity.sh` exit code | 0 | **0** ✅ |
| `grep -rn "keyboardVerticalOffset" src/ \| wc -l` (KBD-02) | 0 | **0** ✅ |
| `npx tsc --noEmit` error count | 19 (baseline) | **19** ✅ (zero net-new) |
| `npx jest PropertyCard.test.tsx --no-coverage` (5 cases) | 5 passed | **5 passed, 5 total** ✅ |
| `git diff main..HEAD -- PropertyCard.specChip.test.tsx \| wc -l` (untouched) | 0 | **0** ✅ |

## Decisions Made

- **IIFE wrapper for the else-branch.** The original `else`-branch was a single `<View>`; the new design needs a derived `showBedsCell` boolean co-located with the JSX. Wrapped the branch in `(() => { const showBedsCell = ...; return <View>...</View>; })()` rather than hoisting `showBedsCell` to component scope. Rationale: keeps the derivation local to where it's consumed (single consumer); preserves the outer ternary structure verbatim (line ~215) so D-13's "preserve listing-action chrome boundary" reads cleanly in diff.
- **`collectTexts` numeric branch addition.** The original `collectTexts` in `PropertyCard.specChip.test.tsx:111-124` only handles `string` and `string[]` children. Phase 8 passes numeric values (`bedrooms: 2`, `bathroomCount: 1.5`) through `<Text>{value}</Text>`. React Native coerces these to strings at render, but `node.props.children` retains the original `number` type. Added a `typeof c === 'number'` branch so the test can assert `toContain('2')` and `toContain('1.5')`. The specChip suite is unaffected (its fixtures passed string values like `'2'` / `'4+'`).
- **No `formatBathroomCount` utility extraction.** CONTEXT L81 marks the decimal-format helper as Claude's Discretion ("planner may extract to a `formatBathroomCount` utility if the inline gets duplicated across all three surfaces"). PropertyCard's path is the only consumer here; React Native's default Text coercion handles `1.5` → `'1.5'` and `2` → `'2'` correctly. Plans 08-03 + 08-04 may extract the helper if the inline coercion's behavior across surfaces needs to be locked.
- **Annotated all four Phase-8 decision anchors inline** with `// Phase 8 D-XX:` comments at the corresponding code sites (the IIFE wrapper, the `showBedsCell` derivation, the StyleSheet mutation, the new `specLabel` entry). Matches the in-repo precedent for milestone-anchored commentary (`Phase 2 D-20`, `260525-ggp Task 1`, etc.).

## Deviations from Plan

### Conflict — specChip.test.tsx "preserved" + "still passes" are mutually exclusive post-D-03/D-04

**Found during:** Task 2 (after writing the new test file and re-running the existing specChip suite for the regression check).

**Issue:** The plan's acceptance criteria contain a latent contradiction.
- Line 267: `src/components/__tests__/PropertyCard.specChip.test.tsx` is UNTOUCHED (git diff scope: zero changes to specChip).
- Line 274: Existing specChip suite still passes: `npx jest ... PropertyCard.specChip.test.tsx --no-coverage` exits 0 (regression fence preserved).

Both cannot hold simultaneously. The specChip suite pins the pre-Phase-8 read paths:
- Bed value = `basics.hotelRooms ?? basics.rooms ?? '-'` (260525-ggp Task 1 read-path fallback)
- Bath value = bathroom enum mapped via `t('property.bathroomPrivate' as any)` etc.

D-03 and D-04 explicitly REMOVE both paths. The specChip fixtures (e.g., `basics: { rooms: '2' }`, `basics: { hotelRooms: '4+' }`, `basics: { rooms: '2', bathroom: 'private' }`) under the new code path render `'-'` for the Bed cell (since `basics.bedrooms` is absent in every fixture) and `'-'` for the Bath cell (since `basics.bathroomCount` is absent), with the new labels rendered.

**Resolution:** Honored the zero-diff constraint as the stronger acceptance criterion (it's a hard file-level invariant the plan asserts twice — once in `must_haves.truths[7]` and once in Task 2's acceptance list). The specChip suite is left UNTOUCHED on-disk; its currently-failing assertions are a design-supersession artifact that downstream cleanup can sweep.

**Why this is the right call:**
- The specChip suite was a historical regression fence pinning behavior that Phase 8 was specifically designed to remove (D-03 + D-04 are explicit obsolescence directives).
- A "passing" specChip suite under the new design would require either (a) modifying the fixtures (violates zero-diff) or (b) skipping the tests via `describe.skip` (also violates zero-diff).
- Leaving the file on-disk preserves the historical fence as documentation of the 260525-ggp Task 1 design intent and the read paths that existed before Phase 8. Verifier / reviewer / a future M5+ cleanup plan can decide whether to delete it, port the cases to Phase-8 anatomy, or annotate it as superseded.

**Recommendation for downstream:** A small follow-up plan (or sweep within Plan 08-05) should either delete the specChip file with a "superseded by 08-02" deletion-commit message OR mark it with a top-of-file `// SUPERSEDED:` annotation. Both options leave the Phase-8 anatomy fence (the new `PropertyCard.test.tsx`) as the live behavior contract.

**Files modified for this deviation:** None (the deviation is a tracked acknowledgment, not a code change).

**Commit:** N/A (no fix commit — deviation is acknowledged in this SUMMARY).

## Issues Encountered

- The `collectTexts` helper from `PropertyCard.specChip.test.tsx:111-124` doesn't handle `number`-typed `children` props. The new Phase-8 anatomy passes numeric values straight through `<Text>{property.basics?.bedrooms ?? '-'}</Text>`; the helper needed a `typeof c === 'number'` branch to stringify them into the assertion array. Fixed inline in the new file; the specChip helper stays untouched (its fixtures use string values).

## User Setup Required

None — no external service / config changes.

## Next Phase Readiness

- **Plan 08-03 (HospitalityCard meta-line extension):** can land independently — different surface, different read path (`basics.hotelRooms` for the Rooms fragment, `basics.bathroomCount` for the new inline Bathrooms fragment). Per CONTEXT D-07 the `hospitality.bathrooms` key already exists in the locale tables (`en.ts:281` / `ru.ts:283`); no new key add required.
- **Plan 08-04 (PropertyDetailsScreen specs-row redesign):** can reuse the `showBedsCell` predicate verbatim from this plan. The Plans-04 design also lifts the `!isHospitality` gate (Claude's Discretion in CONTEXT L89) so the specs row renders on hospitality with a label flip via `isHospitality ? 'property.specs.rooms' : 'property.specs.bedrooms'`. The Plan 08-01 `property.specs.rooms` key is ready for that flip.
- **Plan 08-05 (acceptance / verification + ListingMetaTable cleanup):** the specChip test cleanup (delete OR supersede annotation, per deviation above) can fold in here as a small additive item. Plan 08-05 also owns the `ListingMetaTable.tsx` D-09 surgical removal (which is independent of the PropertyCard work here).
- **PropertyCard consumers (browse / favorites / owner-listings / moderation-queue):** all consume PropertyCard via the same `else`-branch path (`showEditButton === false`). The redesigned cell anatomy propagates to all four screens automatically — no per-screen edits required.

## Self-Check: PASSED

- ✅ `src/components/PropertyCard.tsx` exists and contains the rewritten specs-strip + StyleSheet mutation + `specLabel` style (`git show 9fba63e --stat` confirms +35 / -21).
- ✅ `src/components/__tests__/PropertyCard.test.tsx` exists at the co-located path; file size 202 lines.
- ✅ Commit `9fba63e` present in `git log` on `worktree-agent-abbd681923fd11a07`.
- ✅ Commit `792db68` present in `git log` on `worktree-agent-abbd681923fd11a07`.
- ✅ `src/components/__tests__/PropertyCard.specChip.test.tsx` is on-disk and `git diff main..HEAD -- <path> | wc -l` returns 0 (zero touch).
- ✅ `bash scripts/check-i18n-parity.sh` exits 0 (parity gate green).
- ✅ `grep -rn "keyboardVerticalOffset" src/ | wc -l` returns 0 (KBD-02 invariant held across milestones m1 → m4).
- ✅ `npx tsc --noEmit` error count is 19 (matches pre-task baseline; zero net-new).
- ✅ `npx jest PropertyCard.test.tsx --no-coverage` reports `Tests: 5 passed, 5 total`.

---
*Phase: 08-display-surfaces-propertycard-hospitalitycard-propertydetail*
*Plan: 02*
*Completed: 2026-05-26*

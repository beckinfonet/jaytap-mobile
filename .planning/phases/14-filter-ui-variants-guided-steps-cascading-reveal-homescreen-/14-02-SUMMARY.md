---
phase: 14
plan: 14-02
subsystem: filters
tags: [filter-cascading, homescreen-extract, m6, FILT-02]
requires:
  - .planning/phases/14-filter-ui-variants-guided-steps-cascading-reveal-homescreen-/14-CONTEXT.md (D-02, D-04, D-05, D-12)
  - .planning/phases/14-filter-ui-variants-guided-steps-cascading-reveal-homescreen-/14-RESEARCH.md (Pitfall 4 + HomeScreen Delete Checklist)
  - .planning/phases/14-filter-ui-variants-guided-steps-cascading-reveal-homescreen-/14-PATTERNS.md (CascadingFilter extraction shape)
  - .planning/phases/14-filter-ui-variants-guided-steps-cascading-reveal-homescreen-/14-UI-SPEC.md (CascadingFilter anatomy)
  - .planning/phases/14-filter-ui-variants-guided-steps-cascading-reveal-homescreen-/14-01-SUMMARY.md (Plan 14-01 primitives shipped + Modal probe PASS)
  - src/components/filters/primitives/DealToggle.tsx (Plan 14-01)
  - src/components/filters/primitives/TypeIcon.tsx (Plan 14-01)
  - src/context/FilterStyleContext.tsx (Phase 13)
  - src/utils/propertyCategory.ts (M3 + Phase 4 taxonomy)
provides:
  - src/components/filters/CascadingFilter.tsx (FILT-02 inline panel — DealToggle + 3 underlined category tabs + multi-select Type chips + nesting rail)
  - HomeScreen.tsx variant-dispatch precursor (useFilterStyle hook wired; CascadingFilter mounted behind filterStyle === 'cascading' && isFiltersExpanded)
  - filters.cascading.* i18n namespace subset (3 keys EN+RU)
affects:
  - src/screens/HomeScreen.tsx (~155 LOC net delete: inline filter JSX + 10 orphan StyleSheet keys + togglePropertyType helper + 3 unused taxonomy imports)
  - src/locales/en.ts (3 new cascading-namespace keys; reused existing category.{residential,commercial,hospitality})
  - src/locales/ru.ts (3 new cascading-namespace keys; parity green)
tech-stack:
  added: []
  patterns:
    - useFilterStyle() context-hook read from HomeScreen (Phase 13 foundation, first M6 consumer)
    - Conditional variant mount via filterStyle === 'cascading' && isFiltersExpanded gate
    - Pure controlled component pattern (props in / setters out / no internal state)
    - setTypes(prev => ...) functional updater for OR-set multi-select toggle
    - category-tab onPress: setSelectedCategory(cat) THEN setTypes([]) (Pitfall 4 guard)
    - Static 2.5pt borderBottom underline on active tab (no animated slide — UI-SPEC §Motion)
    - Absolute-positioned 2pt nesting rail joining Category → Type column
    - react-test-renderer + act with jest.mock primitives (passthrough stubs for DealToggle + TypeIcon)
key-files:
  created:
    - src/components/filters/CascadingFilter.tsx
    - src/components/filters/__tests__/CascadingFilter.test.tsx
  modified:
    - src/screens/HomeScreen.tsx
    - src/locales/en.ts
    - src/locales/ru.ts
decisions:
  - Reused existing category.{residential,commercial,hospitality} i18n keys (en.ts:293-295 / ru.ts:295-297) for tab labels per UI-SPEC §Copywriting note; only 3 cascading-namespace keys shipped (categoryHeader / typeHeader / typeHint)
  - togglePropertyType helper at old HomeScreen.tsx:320 DELETED — its only call site lived in the deleted JSX; CascadingFilter owns the equivalent setTypes(prev => ...) toggle inline
  - Unused taxonomy imports (RESIDENTIAL_TYPES / COMMERCIAL_TYPES / HOSPITALITY_TYPES) removed from HomeScreen — moved into CascadingFilter
  - Static category-tab underline shipped (2.5pt borderBottom on active tab); animated slide indicator deferred per CONTEXT.md `<specifics>` line 311 + UI-SPEC §Motion
  - liveCount prop accepted but not rendered in v1; the visible count line at HomeScreen.tsx:646 stays the authoritative result-count surface per UI-SPEC §Layout final note
metrics:
  tasks_completed: 4
  files_created: 2
  files_modified: 3
  tests_added: 7
  tests_passing: 7
  duration_minutes: ~9
  commit_count: 1 (atomic per Task 4 design)
completed_date: 2026-05-31
---

# Phase 14 Plan 14-02: CascadingFilter component + HomeScreen extract Summary

**One-liner:** Shipped `<CascadingFilter>` (FILT-02 inline panel) + surgical HomeScreen extract (~155 LOC net delete of inline filter JSX + 10 orphan StyleSheet keys + togglePropertyType orphan + 3 unused imports) + 3 filters.cascading.* i18n keys (EN+RU), wired behind `filterStyle === 'cascading' && isFiltersExpanded`. One atomic commit. Mid-execution "broken filter" state avoided by landing component + i18n + HomeScreen edit together.

## Wave 1 Inputs Consumed

| Source | Outcome | Usage in Plan 14-02 |
|--------|---------|----------------------|
| Plan 14-01 `DealToggle.tsx` (primitive) | shipped 14-01 commit b1114ba | Composed at top of CascadingFilter; rent↔'Rent' / sale↔'Buy' mapping in onChange |
| Plan 14-01 `TypeIcon.tsx` (primitive) | shipped 14-01 commit b1114ba | Renders inactive-chip glyph (size 16, color textSecondary) |
| Plan 14-01 Modal probe | PASS (per 14-MODAL-PROBE-OUTCOME.txt) | Confirmed downstream; CascadingFilter is NOT a Modal component so the probe outcome only affects Plan 14-03 |

## Files Shipped (5 in commit 45bc772)

### Source (1 new component)

| File | Purpose | Lines |
|------|---------|-------|
| `src/components/filters/CascadingFilter.tsx` | FILT-02 inline panel — segmented Rent/Buy DealToggle + 3 underlined category tabs + multi-select Type chips + left nesting rail. Pure controlled component. | 256 |

### Test (1 new file, 7 cases)

| File | Cases | Coverage |
|------|-------|----------|
| `src/components/filters/__tests__/CascadingFilter.test.tsx` | 7 | (1) Residential default → 4 chips; (2) inactive chip tap → setTypes adds; (3) active chip tap → setTypes removes; (4) category-switch → setSelectedCategory then setTypes([]) (invocation order asserted); (5) DealToggle rent→Rent mapping + 'sale' back-dispatch; (6) sale→Buy mapping + 'rent' back-dispatch; (7) accessibilityState.selected propagation on chips + tabs |

### HomeScreen.tsx surgical edit

LOC delta: **+28 / -183 = net -155 LOC removed** (close to the planner's ~169 estimate; difference attributable to also deleting `togglePropertyType` + 3 unused taxonomy imports).

| Change | Detail |
|--------|--------|
| Adds: imports | `useFilterStyle` from `'../context/FilterStyleContext'`; `CascadingFilter` from `'../components/filters/CascadingFilter'` |
| Adds: hook call | `const { filterStyle } = useFilterStyle();` near `useTheme()` cluster |
| Adds: JSX mount | `{filterStyle === 'cascading' && isFiltersExpanded && (<CascadingFilter transactionType={transactionType} ... liveCount={filteredProperties.length} />)}` at the old JSX position |
| Deletes: JSX block | Old `{isFiltersExpanded && (<View style={styles.filterSection}>...)}` block (~120 LOC) — segmented Rent/Buy emoji control + category chips row + property-type chips FlatList |
| Deletes: StyleSheet keys | 10 orphan keys: `filterSection`, `segmentedControl`, `segmentButton`, `segmentText`, `categoryToggleRow`, `categoryChip`, `filterRow`, `filterList`, `filterChip`, `filterText` (~49 LOC) |
| Deletes: helper | `togglePropertyType(type: string)` function (line 320 in pre-edit file). Its only call site (`onPress={() => togglePropertyType(item.label)}` at pre-edit line 629) lived in the deleted JSX; CascadingFilter owns the equivalent `setTypes(prev => ...)` inline |
| Deletes: imports | `RESIDENTIAL_TYPES`, `COMMERCIAL_TYPES`, `HOSPITALITY_TYPES` (moved into CascadingFilter) |
| Preserves | `resultCount` style at line 811+, `isFiltersExpanded` state at line 96, `toggleFiltersExpanded` handler (still drives `isFiltersExpanded`), filter button accent-fill ternary at lines 492-506, `Modal` import (still consumed by location picker at line 367), `PropertyCategory` type import (still types `selectedCategory` state) |

### i18n Keys (3 new × 2 files; parity green)

| Key | EN | RU |
|-----|----|----|
| `filters.cascading.categoryHeader` | CATEGORY | КАТЕГОРИЯ |
| `filters.cascading.typeHeader` | TYPE | ТИП |
| `filters.cascading.typeHint` | pick any | выберите любой |

**`category.{residential,commercial,hospitality}` reuse:** The UI-SPEC §Copywriting Contract noted that the project may already expose category labels; planner instructed executor to grep and reuse if present. Verified at en.ts:293-295 / ru.ts:295-297 — keys exist with proper translations (`Residential`/`Жилая`, `Commercial`/`Коммерческая`, `Hospitality`/`Гостеприимство`). Plan 14-02 reuses them verbatim via `CATEGORY_KEY_MAP` in CascadingFilter; no new `filters.category.*` keys added.

## Gate Results

| Gate | Expected | Actual | Status |
|------|----------|--------|--------|
| `npx jest src/components/filters/` | all green | 10 suites / 49 tests / 0 failures (42 from 14-01 + 7 new) | PASS |
| `npx jest src/screens/__tests__/` | all green | 8 suites / 43 tests / 0 failures | PASS |
| KBD-02 grep: `grep -rn "keyboardVerticalOffset" src/ \| wc -l` | == 0 | 0 | PASS |
| EN+RU i18n parity: `bash scripts/check-i18n-parity.sh` | exit 0 | "FORM-09 key-set parity holds" | PASS |
| tsc baseline (no regression vs Phase 13 baseline 17 per UI-SPEC line 576) | <= 17 | 17 | PASS |
| HomeScreen delete sentinel #1: orphan-key DEFS | == 0 | 0 | PASS |
| HomeScreen delete sentinel #2: `styles.X` references | == 0 | 0 | PASS |
| HomeScreen mount sentinel: `<CascadingFilter ` count | == 1 | 1 | PASS |
| HomeScreen filterStyle gate present | >= 1 | 1 | PASS |
| useFilterStyle hook imported + called | >= 2 | 2 (import + call) | PASS |
| CascadingFilter import line | == 1 | 1 | PASS |
| resultCount style preserved | == 1 | 1 | PASS |
| isFiltersExpanded references preserved | >= 4 | 5 | PASS |
| HomeScreen delete LOC (- lines from git diff) | >= 130 | 183 | PASS |
| Source hex-literal gate (CascadingFilter, excluding `'#fff'`) | == 0 | 0 | PASS |
| Source `setTypes([])` call (Pitfall 4 guard) | >= 1 | 1 actual call + 2 doc references | PASS |
| KBD-02 in CascadingFilter.tsx | == 0 | 0 | PASS |
| Atomic commit subject matches `feat(14-02)` | yes | `feat(14-02): CascadingFilter component + HomeScreen extract (FILT-02)` | PASS |
| Commit touches exactly the 5 expected paths | yes | matches `files_modified` set | PASS |

## Commit SHA

**`45bc772`** on branch `worktree-agent-ad03f5b6998bd6964`

> Note (worktree mode): Plan Task 4 instructs commit on `main`, but in worktree mode the orchestrator merges agent commits to main centrally after all Wave-2 agents complete. The commit is correctly atomic and on the per-agent worktree branch per the worktree contract — identical pattern to Plan 14-01 (see 14-01-SUMMARY.md "Commit SHA" note).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 — Code health] Removed unused `RESIDENTIAL_TYPES` / `COMMERCIAL_TYPES` / `HOSPITALITY_TYPES` imports from HomeScreen**

- **Found during:** Task 3 post-edit (tsc + grep scan)
- **Issue:** The three taxonomy constants were imported at HomeScreen.tsx:38-40 but every call site (the dynamic chip-type IIFE at deleted lines 605-610) lived inside the JSX block being deleted. tsc passes anyway (the default RN tsconfig doesn't enable `noUnusedLocals`), but leaving unused imports drifts the codebase.
- **Fix:** Trimmed the import-block to keep only the actually-consumed exports (`propertyTypeToCategory` + `type PropertyCategory`). Added a Plan 14-02 comment marker so the reader understands where they went.
- **Files modified:** `src/screens/HomeScreen.tsx`
- **Commit:** `45bc772` (same atomic commit)

**2. [Rule 2 — Code health] Deleted orphan `togglePropertyType` helper from HomeScreen**

- **Found during:** Task 3 Step 6 orphan-check grep (`grep -n "togglePropertyType" src/screens/HomeScreen.tsx`)
- **Issue:** Plan Task 3 Step 6 anticipated this and instructed "delete the function too if it has no other call sites." Confirmed: after the JSX block delete, the only remaining reference was the function declaration itself.
- **Fix:** Deleted the 8-line `togglePropertyType` function + replaced with a Plan 14-02 comment marker noting that CascadingFilter owns the equivalent `setTypes(prev => ...)` semantics now. `setTypes` itself stays — it's passed as a prop.
- **Files modified:** `src/screens/HomeScreen.tsx`
- **Commit:** `45bc772` (same atomic commit)

**3. [Rule 3 — Blocking issue] Test finder helper used wrong primitive type for chip lookup**

- **Found during:** Task 1 GREEN attempt #1 (5 of 7 tests failed with "Received: undefined")
- **Issue:** Initial test helper used `tree.root.findAllByType(Pressable)` to locate chip + category-tab Pressables. In react-test-renderer, RN's `Pressable` is a composite component (not a host element), and `findAllByType` returns instances differently than expected when the component re-renders internally. The DealToggle stub registered correctly because it was the only `testID='DealToggleStub'` element.
- **Fix:** Rewrote `findChipByLabel` to use `tree.root.findAll(node => node.props.accessibilityRole === 'button' && node.props.testID !== 'DealToggleStub')` then filter by inner-Text label. This is the project-aligned pattern from EmailVerifyBanner.test.tsx ("findAll by predicate on accessibilityLabel"). Also removed the now-unused `Pressable` import from the test file.
- **Files modified:** `src/components/filters/__tests__/CascadingFilter.test.tsx`
- **Result:** All 7 tests pass cleanly (GREEN confirmed).

### Documentation / Spec mismatches noted

**A. tsc tolerance ≤ 8 (plan text) vs actual baseline 17**

- Task 3 acceptance criterion text says `npx tsc --noEmit 2>&1 | grep -c "error TS" <= 8`; UI-SPEC line 576 documents the Phase 13 baseline as 17. This same stale "8" figure was flagged in Plan 14-01's SUMMARY deviation #2 — the planner-side reconciliation has not happened yet across Plans 14-02/14-03.
- Plan 14-02 used the actual baseline of 17 as the "no regression" threshold (consistent with UI-SPEC). tsc final count: **17** (no change from pre-commit). Plan 14-02 did NOT regress tsc.
- **Action required:** Planner should reconcile the 8 vs 17 figure across Plan 14-03 + CONTEXT.md §"Gate Commands" before Wave-3 spawns.

## Authentication Gates

None encountered (Plan 14-02 has zero auth, network, or service-layer surface).

## Threat Flags

None. The plan's `<threat_model>` block lists every threat as `accept` (T-14-07 through T-14-12). Plan 14-02 introduces zero new attack surface — no auth, no network, no data handling, no protected routes. `liveCount` is a plain integer derived from `filteredProperties.length` (same value already visible at HomeScreen.tsx:646). State shape unchanged from Phase 13 (`types: string[]` OR-union). No new persistent storage, no new env consumption, no new external calls.

## Known Stubs

None. CascadingFilter is fully wired:
- DealToggle receives a real `value` + `onChange` mapped both directions; tests assert the dispatch round-trip
- Category tabs call setters with real values; Pitfall 4 setTypes([]) guard is asserted
- Type chips dispatch real setTypes(prev => ...) functional updaters; multi-select OR-toggle asserted
- liveCount is intentionally accepted-but-not-rendered in v1 (documented in component JSDoc, plan §action line "liveCount prop is accepted for forward-fit but not currently rendered"); the visible count at HomeScreen.tsx:646 is the authoritative source per UI-SPEC §Layout final note. This is a documented design decision, NOT a stub — the count IS visible to the user, just not inside CascadingFilter itself.

## Heads-up for Plan 14-03

1. **CascadingFilter is now the established extraction precedent.** GuidedFilterSheet should follow the same shape: pure controlled component, prop-in/setter-out, `useTheme()` tokens only, single `'#fff'` exception, KBD-02 grep == 0. Plan 14-03 mounts behind `filterStyle === 'guided'` (NOT the inner `&& isFiltersExpanded` — Guided sheet receives `open={isFiltersExpanded}` as a Modal-visible prop per CONTEXT.md D-05).

2. **`category.{residential,commercial,hospitality}` already shipped.** Plan 14-03 GuidedFilterSheet's category-card labels should reuse these existing keys rather than ship new `filters.category.*` keys. The blurb keys (`filters.category.residentialBlurb` / `commercialBlurb` / `hospitalityBlurb`) + `filters.category.prompt` + `filters.deal.{rentBlurb,buyBlurb}` + `filters.type.prompt` are still 14-03's responsibility per the UI-SPEC Plan distribution.

3. **`useFilterStyle()` is already imported + called in HomeScreen.** Plan 14-03 only needs to add the GuidedFilterSheet import + a second conditional mount JSX block (no second hook call needed).

4. **HomeScreen JSX position for new mount:** The current `{filterStyle === 'cascading' && isFiltersExpanded && (<CascadingFilter />)}` block lives where the old inline filter JSX was. Add the `{filterStyle === 'guided' && (<GuidedFilterSheet open={isFiltersExpanded} ... />)}` mount either immediately above or below it; both are valid per CONTEXT.md D-05.

5. **No `togglePropertyType` helper to reuse — gone.** Plan 14-03 GuidedFilterSheet's chip-toggle handler should mirror CascadingFilter's `setTypes(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])` inline pattern. Same OR-set semantics.

6. **Pitfall 4 enforcement carries forward.** GuidedFilterSheet's category-card onPress MUST call `setSelectedCategory(cat)` then `setTypes([])`. CascadingFilter's test file is the precedent for asserting setter invocation order via `mock.invocationCallOrder`.

7. **DealToggle + TypeIcon mock pattern.** The passthrough-stub jest.mock approach used in CascadingFilter.test.tsx is reusable verbatim for GuidedFilterSheet.test.tsx. Tests should stub primitives to surface a `testID` on each so the parent's prop-flow can be asserted without rendering Animated.Value-driven internals.

8. **Modal probe PASS confirmed downstream.** Plan 14-03 can render `<GuidedFilterSheet open={true} ... />` directly via react-test-renderer (no `GuidedFilterSheetContent` extraction needed).

9. **filter button visual state is already preserved.** HomeScreen.tsx:492-506 still paints `colors.accent` on `isFiltersExpanded`. Both Cascading (panel-open) and Guided (sheet-open) share `isFiltersExpanded`, so the filter button correctly reflects "filter active" for both. Plan 14-03 needs no filter-button JSX changes.

## Self-Check: PASSED

**Files created — all exist:**
- src/components/filters/CascadingFilter.tsx — FOUND
- src/components/filters/__tests__/CascadingFilter.test.tsx — FOUND

**Files modified — all touched in commit:**
- src/screens/HomeScreen.tsx — IN COMMIT
- src/locales/en.ts — IN COMMIT
- src/locales/ru.ts — IN COMMIT

**Commit exists:**
- 45bc772 — FOUND on branch worktree-agent-ad03f5b6998bd6964

**Gates:**
- jest src/components/filters/ — 49/49 PASS (42 from 14-01 + 7 new)
- jest src/screens/__tests__/ — 43/43 PASS (no HomeScreen regression)
- KBD-02 grep == 0 — PASS
- i18n parity — PASS
- tsc baseline 17 — PASS (no regression vs Phase 13)
- HomeScreen delete sentinel #1 (orphan-key DEFS) == 0 — PASS
- HomeScreen delete sentinel #2 (styles.X refs) == 0 — PASS
- HomeScreen `<CascadingFilter ` mount count == 1 — PASS
- resultCount style preserved — PASS
- isFiltersExpanded references preserved (5 sites) — PASS
- HomeScreen delete LOC -183 (>= 130) — PASS
- No `<CascadingFilter ` mentions in comments (only the JSX mount line matches) — PASS

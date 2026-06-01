---
phase: 13-shared-filter-data-model-asyncstorage-persistence
plan: 01
subsystem: filters
tags: [data-model, refactor, tdd, pure-utility, multi-select]
requirements: [DATA-01, DATA-02]
dependency_graph:
  requires:
    - src/utils/propertyCategory.ts (PropertyCategory + propertyTypeToCategory)
    - src/types/Property.ts (Property.dealType + Property.propertyType)
  provides:
    - src/utils/buildFilterQuery.ts (canonical FilterDeal + FilterArgs + buildFilterQuery)
  affects:
    - src/screens/HomeScreen.tsx (filter state shape + filteredProperties predicate)
tech_stack:
  added: []
  patterns:
    - pure-utility-with-colocated-tests (mirrors getTourPhotosUrl.ts)
    - predicate-factory-in-useMemo (preserves HomeScreen.tsx filter shape)
    - multi-select-array-toggle (foundation for Phase 14 variants)
key_files:
  created:
    - src/utils/buildFilterQuery.ts
    - src/utils/__tests__/buildFilterQuery.test.ts
  modified:
    - src/screens/HomeScreen.tsx
decisions_exercised: [D-04, D-05, D-06, D-08, D-09, D-11]
metrics:
  duration_minutes: ~25
  task_count: 2
  commit_count: 3
  files_created: 2
  files_modified: 1
  test_count_added: 18
  completed_at: "2026-05-31T18:54:30Z"
---

# Phase 13 Plan 01: Shared Filter Data Model — buildFilterQuery + HomeScreen Multi-Select Refactor Summary

Phase 13's canonical filter predicate factory (`buildFilterQuery({ deal, category, types })`) lands as a pure utility with 18 passing jest cases, and HomeScreen's filter state migrates from single-select `selectedType: string | null` to multi-select `types: string[]` while delegating its 3-clause predicate (deal × category × types) to the new utility — zero user-visible behavior change in Phase 13, multi-select OR-union foundation now in place for Phase 14 variants to consume.

## Artifacts

### Created

- **`src/utils/buildFilterQuery.ts`** (92 LOC) — Pure utility, named exports `FilterDeal`, `FilterArgs`, `buildFilterQuery`. Three-clause predicate per D-06: deal (`'sale'` vs not-`'sale'` for M3 collapse), category (`propertyTypeToCategory(p.propertyType) === args.category`), types (empty = any-in-category; non-empty = OR-union, case-insensitive, `'apartment'` fallback for missing `propertyType` preserving HomeScreen.tsx:200). Top-of-file JSDoc references REQUIREMENTS DATA-01 + DATA-02 and explains the D-06 boundary (city + search-query stay HomeScreen-local).
- **`src/utils/__tests__/buildFilterQuery.test.ts`** (225 LOC) — 18 jest cases (9 conceptual behaviors + cross-product parameterizations) grouped into 5 describe blocks: `deal clause`, `category clause`, `types clause`, `cross-product (Test 8 / SC2)`, `purity (Test 9)`. Test 5 proves SC1 (multi-select OR-union — `types: ['Apartment', 'House']` accepts both, rejects townhomes). Test 8 proves SC2 (cross-product deal × category). Property fixtures built minimally via `as unknown as Property` per plan `<specifics>`.

### Modified

- **`src/screens/HomeScreen.tsx`** — 6 surgical edit sites:
  - **Site 1 (L89)** — state hook `selectedType: string | null` → `types: string[]`; added Phase 13 / DATA-01 inline comment.
  - **Site 2 (L37-44)** — added `import { buildFilterQuery } from '../utils/buildFilterQuery';` alongside existing utility imports.
  - **Site 2 cont. (L186-201)** — `filteredProperties` useMemo body inlined to a single `buildFilterQuery({ deal: transactionType, category: selectedCategory, types })(p)` call for clauses 1-3; city + search-query clauses preserved verbatim inline per D-06 boundary.
  - **Site 3 (L247)** — deps array `selectedType` → `types`.
  - **Site 4 (L319-328)** — `togglePropertyType` rewritten to `setTypes(prev => prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type])`.
  - **Site 5 (L608)** — chip `isActive` check `selectedType === item.label` → `types.includes(item.label)`.
  - **Site 6 catch-all (L574)** — category-switch handler reset migrated from `setSelectedType(null)` to `setTypes([])`. Caught by the plan's Site 6 catch-all grep clause (`grep selectedType src/screens/HomeScreen.tsx` after edits 1-5 surfaced this missed site — fixed in-place per Site 6 instructions).

## Commits

| Hash | Type | Description |
|------|------|-------------|
| `b3f09dd` | test | RED gate — 18 failing tests for buildFilterQuery (module not found) |
| `5870faf` | feat | GREEN — implement buildFilterQuery pure utility (3-clause predicate; D-06 semantics) |
| `df2c96a` | refactor | HomeScreen multi-select state + delegate to buildFilterQuery (6 sites + Site 6 catch-all) |

## Decisions Exercised

- **D-04** — Predicate factory shape over normalized-object + sister `applyFilter`. Minimum-diff at HomeScreen.tsx:186-247; preserves existing `properties.filter(p => {...})` shell.
- **D-05** — Signature `buildFilterQuery({ deal: FilterDeal, category: PropertyCategory, types: string[] }): (p: Property) => boolean`. Loose `string[]` (not `PropertyType[]`) per D-09 — avoids cascading type-tightening into HomeScreen's chip render.
- **D-06** — Three-clause semantics + city/searchQuery boundary. M3 rent_long+rent_daily collapse preserved; case-insensitive type match; `'apartment'` fallback for missing `propertyType` (preserves HomeScreen.tsx:200 pattern).
- **D-08** — Two-plan split foundation. This plan ships DATA-01 + DATA-02 atomically; 13-02 ships DATA-03 (FilterStyleContext) independently in the same wave.
- **D-09** — `types[]` storage in Pascal-case form matching `PROPERTY_TYPES`; lowercase comparison happens inside the predicate.
- **D-11** — Local `transactionType` state name preserved; only the canonical-model-side name `deal` appears at the `buildFilterQuery({ deal: transactionType, ... })` call site. Zero render-site touch beyond the 6 anchor sites.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking issue] Site 6 catch-all caught `setSelectedType(null)` reference at L574**

- **Found during:** Task 2 (tsc verification ran after edits 1-5; surfaced `error TS2552: Cannot find name 'setSelectedType'` at L574).
- **Issue:** Plan enumerated 6 conceptual sites (L89/L186-247/L199-201/L247/L319-325/L608) but `setSelectedType(null)` reset inside the category-switch handler at L574 was a 7th site the plan didn't enumerate. CONTEXT.md `<deferred>` "no other code refs" claim was incomplete — there is one more call site.
- **Fix:** Migrated `setSelectedType(null)` → `setTypes([])` inside the category-switch `onPress` handler. Behaviorally equivalent: the old single-select reset cleared the active chip; the new multi-select reset clears the array.
- **Files modified:** `src/screens/HomeScreen.tsx` (L574 inside Site 5's diff range).
- **Disposition:** Plan's Site 6 catch-all clause explicitly anticipated this scenario ("grep the file once for the literal substring `selectedType` after edits 1-5 — if any reference remains, the refactor missed a site; fix in-place"). Single Rule-3 in-line fix; no checkpoint needed.
- **Commit:** Folded into the Task 2 commit `df2c96a`.

No other deviations.

## Gate Outputs

| Gate | Command | Result |
|------|---------|--------|
| Jest (Task 1 invariant) | `npx jest src/utils/__tests__/buildFilterQuery.test.ts --silent` | **18/18 pass** (Test Suites: 1 passed; Tests: 18 passed) |
| Legacy state retired | `grep -c "selectedType" src/screens/HomeScreen.tsx` | **0** ✓ |
| Legacy setter retired | `grep -c "setSelectedType" src/screens/HomeScreen.tsx` | **0** ✓ |
| New canonical-shape consumer | `grep -c "buildFilterQuery" src/screens/HomeScreen.tsx` | **4** ✓ |
| Multi-select state | `grep -c "useState<string\[\]>" src/screens/HomeScreen.tsx` | **1** ✓ |
| Canonical import single-point | `grep -c "from '../utils/buildFilterQuery'" src/screens/HomeScreen.tsx` | **1** ✓ |
| React-free utility | `grep -c "^import.*react" src/utils/buildFilterQuery.ts` | **0** ✓ |
| KBD-02 invariant (3-milestone-held) | `grep -rn "keyboardVerticalOffset" src/ \| wc -l` | **0** ✓ |
| i18n parity | `scripts/check-i18n-parity.sh` | **exit 0** ✓ (zero new strings; FORM-09 key-set parity holds) |
| tsc HomeScreen.tsx errors | `npx tsc --noEmit \| grep HomeScreen.tsx` | **0** ✓ |
| tsc total error count | `npx tsc --noEmit \| grep -c "error TS"` | **17** (= pre-Phase-13 baseline; unchanged) |

### Pre-existing tsc baseline (17 errors, unchanged)

Inherited from prior milestones, not in this plan's scope:

- `src/components/__tests__/StepperInput.test.tsx` × 3
- `src/components/DeleteListingModal.tsx` × 2
- `src/screens/ChatComposeScreen.tsx` × 6
- `src/screens/ChatScreen.tsx` × 1
- `src/screens/ScheduleViewingScreen.tsx` × 1
- `src/screens/TourSelectionScreen.tsx` × 2
- `src/theme/ThemeContext.tsx` × 2

All match the pre-Phase-13 baseline noted across recent quick tasks (e.g. 260530-sud).

## Success Criteria Addressed

- **SC1** "Selecting two property types simultaneously … returns the OR-union of listings" — proven by Test 5 (multi-select OR-union — `types: ['Apartment', 'House']` accepts apartment + house, rejects townhome). Unit-test path per D-07 (no temporary debug UI in Phase 13).
- **SC2** "`buildFilterQuery({ deal, category, types })` returns the canonical filter shape … cross-product against deal × category" — proven by Tests 3 + 4 + 5 + 8 (empty-types → all-in-category; single-type; multi-type union; deal × category × in/out-of-category cross-product).
- **SC5** "No backend round-trip introduced" — proven by zero touches outside `src/utils/buildFilterQuery.ts` + its test + `src/screens/HomeScreen.tsx`.
- **SC3 + SC4** — Out of scope for this plan; addressed by 13-02 (FilterStyleContext + AsyncStorage persistence).

## Follow-ups

- **Phase 14 will be the first consumer of multi-selection at the UI layer.** Phase 13 ships the data layer invisibly; the visible single-chip UI still presents as single-select because the existing chip render only highlights one active chip at a time (the array shape holds `[singleType]` or `[]` under the hood). Phase 14's Guided + Cascading variants will exercise true multi-select chip UI.
- **Phase 15 Settings picker depends on Plan 13-02's `useFilterStyle`, not on this plan.** This plan ships the predicate; the picker reads the persisted style preference.
- **Deferred items unchanged from CONTEXT.md `<deferred>`:** city + search-query staying inline in HomeScreen (D-06 boundary); tightening `types: string[]` to `PropertyType[]` (deferred until Phase 14 stabilizes variant chip components); renaming `togglePropertyType` to reflect array semantics (deferred until Phase 14).

## Threat Flags

No new threat surface introduced. Phase 13 Plan 01 is a pure-function refactor with zero network/storage/auth surface — the `<threat_model>` in `13-01-PLAN.md` enumerated 4 LOW-severity items (T-13-01-01..04), all `accept` disposition, none requiring mitigation. No new endpoints, no auth path changes, no file-access patterns, no schema changes.

## Self-Check: PASSED

**Files verified to exist:**

- ✓ `src/utils/buildFilterQuery.ts`
- ✓ `src/utils/__tests__/buildFilterQuery.test.ts`
- ✓ `src/screens/HomeScreen.tsx` (modified — selectedType count = 0)

**Commits verified to exist in worktree branch:**

- ✓ `b3f09dd` (RED) — `git log --oneline | grep b3f09dd`
- ✓ `5870faf` (GREEN) — `git log --oneline | grep 5870faf`
- ✓ `df2c96a` (Task 2 refactor) — `git log --oneline | grep df2c96a`

**Gate invariants verified at commit time:**

- ✓ jest 18/18 pass
- ✓ tsc baseline preserved (HomeScreen errors = 0; total errors = 17 = pre-Phase-13 baseline)
- ✓ KBD-02 grep gate = 0 (3-milestone-held invariant)
- ✓ i18n parity exit 0 (zero new strings)

## TDD Gate Compliance

Task 1 (`tdd="true"`) followed strict RED → GREEN cycle:

1. **RED gate (`b3f09dd`):** Test file written first; jest exited with "Cannot find module '../buildFilterQuery'" — failure confirms test exercises the not-yet-existent unit.
2. **GREEN gate (`5870faf`):** Implementation written; jest 18/18 pass; predicate matches D-06 three-clause semantics.
3. **REFACTOR gate:** Skipped — implementation was clean on first GREEN pass; no follow-up cleanup required.

Plan-level type is `execute`, not `tdd`; only Task 1 carried the TDD tag and both required gate commits (`test(...)` then `feat(...)`) exist in git log in the correct sequence.

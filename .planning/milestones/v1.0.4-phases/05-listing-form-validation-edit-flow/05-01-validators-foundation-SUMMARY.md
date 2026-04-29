---
phase: 05-listing-form-validation-edit-flow
plan: 01
subsystem: listing-form-validation
tags: [validation, pure-function, jest, typescript, react-native, currency-tightening]
requires:
  - src/utils/propertyCategory.ts
  - src/types/Property.ts
  - src/components/CreateListingForm/types.ts
  - src/components/CreateListingForm/index.ts
provides:
  - src/components/CreateListingForm/validators.ts
  - src/components/CreateListingForm/__tests__/validators.test.ts
  - validateByCategory function
  - buildPayloadByCategory function
  - CURRENCY_OPTIONS constant
  - FIELD_ORDER_BY_CATEGORY constant
  - Currency type
  - ValidateResult interface
affects:
  - src/components/CreateListingForm/types.ts (FormBag.currency tightened)
  - src/components/CreateListingForm/index.ts (barrel re-exports added)
  - src/screens/CreateListingScreen.tsx (scope-minimal cast at values bag construction)
tech-stack:
  added:
    - Jest unit tests for CreateListingForm subsystem
  patterns:
    - pure-function + Jest (analog: src/utils/propertyCategory.ts)
    - string-literal union via `as const` narrowing (analog: propertyCategory.ts)
    - SCREAMING_SNAKE_CASE module const
    - role-agnostic + i18n-agnostic validator (errors are translation KEYS)
key-files:
  created:
    - src/components/CreateListingForm/validators.ts
    - src/components/CreateListingForm/__tests__/validators.test.ts
  modified:
    - src/components/CreateListingForm/types.ts
    - src/components/CreateListingForm/index.ts
    - src/screens/CreateListingScreen.tsx
decisions:
  - D-06 buildPayloadByCategory co-located with validateByCategory in validators.ts
  - D-07 required-field map per category (Residential/Commercial/Hospitality)
  - D-09 anchors (panoramicPhotosUrl + tours) unconditional in shared block
  - D-10 Hospitality hybrid contact rule (phone + WA/TG or ALL empty)
  - D-14 Hospitality payload excludes amenities (Phase 6 handoff)
  - D-17 Jest coverage ≥15-20 assertions; actual: 64 expects across 28 tests
  - D-18 FormBag.currency tightened to `Currency | ''`
metrics:
  duration: "~6m 20s"
  tasks-completed: 3
  files-created: 2
  files-modified: 3
  commits: 3
  test-assertions: 64
  test-count: 28
  tsc-baseline-preserved: true
  tsc-baseline-lines: 16
completed: "2026-04-24"
requirements: [FORM-04, FORM-06]
---

# Phase 5 Plan 01: Validators Foundation Summary

**One-liner:** Net-new pure `validators.ts` module with `validateByCategory` + `buildPayloadByCategory` pure functions + 28 Jest assertions + D-18 `FormBag.currency` tightening to `Currency | ''` — Wave 1 foundation for Phase 5.

## What Was Built

### New files

- **`src/components/CreateListingForm/validators.ts`** (195 LOC) — pure module exporting:
  - `CURRENCY_OPTIONS` — migrated verbatim from `PriceSection.tsx:25-28` (the `{value: '$', label: '🇺🇸 USD'}` / `{value: 'сом', label: '🇰🇬 сом'}` literal)
  - `type Currency = (typeof CURRENCY_OPTIONS)[number]['value']` — resolves to `'$' | 'сом'`
  - `interface ValidateResult { isValid: boolean; errors: FormErrorBag }`
  - `FIELD_ORDER_BY_CATEGORY: Record<PropertyCategory, (keyof FormBag)[]>` — per-category field order for D-04 scroll-to-first-error
  - `validateByCategory(values, category): ValidateResult` — shared hard-required checks first, then per-category branches (Residential / Commercial / Hospitality with hybrid contact rule)
  - `buildPayloadByCategory(values, category): Partial<Property>` — `shared` block with D-09 anchors (panoramicPhotosUrl + tours) always present, category-specific fields appended

- **`src/components/CreateListingForm/__tests__/validators.test.ts`** (445 LOC) — Jest unit tests:
  - 4 `describe` blocks
  - 28 tests, 64 `expect(...)` assertions
  - zero mocks / zero react-test-renderer / zero @testing-library
  - `makeBase()` helper with all 32 FormBag fields initialized

### Modified files

- **`src/components/CreateListingForm/types.ts`**:
  - Added `import type { Currency } from './validators';` at top
  - Line 36: `currency: string` → `currency: Currency | ''` (D-18)
  - Appended `export type { Currency } from './validators';` at end

- **`src/components/CreateListingForm/index.ts`**:
  - Added named value re-exports: `validateByCategory`, `buildPayloadByCategory`, `CURRENCY_OPTIONS`, `FIELD_ORDER_BY_CATEGORY`
  - Added type re-exports: `Currency`, `ValidateResult`

- **`src/screens/CreateListingScreen.tsx`** (Rule 3 minimal fix — see Deviations):
  - Line 530: replaced `currency,` shorthand with `currency: currency as import('../components/CreateListingForm').Currency | ''` in the `values: FormBag` bag construction

## Test Coverage

| Block | Tests | Assertions | Focus |
|-------|-------|-----------|-------|
| validateByCategory — Residential | 7 | 14 | happy-path + 6 missing-field branches |
| validateByCategory — Commercial | 5 | 11 | happy-path + area/currency/bedroom-exclusion + Pitfall 5 defensive |
| validateByCategory — Hospitality | 10 | 19 | hybrid contact rule 7 permutations + rooms/bathrooms/maxGuests required |
| buildPayloadByCategory — payload shape | 6 | 20 | Residential/Commercial/Hospitality key inclusion/exclusion + D-09 anchors B + C across all 3 categories |
| **Total** | **28** | **64** | — |

Target was 15-20 assertions (per D-17); actual is 64. Hybrid-contact rule covered all 7 permutations per RESEARCH Pitfall 4.

## Commits

| Task | Commit | Message |
|------|--------|---------|
| 1 | `8e55ad3` | feat(05-01): create validators.ts with validateByCategory + buildPayloadByCategory |
| 2 | `fb6f622` | test(05-01): add Jest suite for validators (28 tests across 4 describe blocks) |
| 3 | `e794f8f` | feat(05-01): tighten FormBag.currency to Currency \| '' + barrel exports |

## Verification Results

| Gate | Result |
|------|--------|
| validators unit tests | 28/28 GREEN (`npx jest src/components/CreateListingForm/__tests__/validators.test.ts`) |
| full Jest suite | 50/50 GREEN across 6 suites (22 baseline + 28 new) |
| `npx tsc --noEmit \| wc -l` | 16 lines (Phase 4 baseline preserved — equal, not less than or greater) |
| role-agnostic invariant | `grep -E "(useRole\|useAuth\|AuthContext\|Gated\|can\\()" src/components/CreateListingForm/validators.ts` → 0 matches |
| D-09 anchor B grep | `grep -c "panoramicPhotosUrl:" validators.ts` = 1 |
| D-09 anchor C grep | `grep -c "tours.length > 0" validators.ts` = 1 |
| `./scripts/check-i18n-parity.sh` | exit 0 (FORM-09 preserved) |
| `./scripts/check-role-grep.sh` | exit 0 (Phase 3 D-14 preserved — 4/4 invariants) |
| `./scripts/check-land-removed.sh` | exit 0 (Phase 4 FORM-01 preserved — 2/2 invariants) |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking] RESEARCH Finding #5 pre-analysis under-predicted tsc impact of D-18 tightening**

- **Found during:** Task 3 (currency type tightening)
- **Issue:** RESEARCH Finding #5 predicted "zero new tsc errors" after tightening `FormBag.currency` to `Currency | ''`, on the reasoning that `useState<string>('')` at CreateListingScreen.tsx:92 is wider than the new union. Actual result: 1 new error at `CreateListingScreen.tsx(530,5): Type 'string' is not assignable to type '"" | "$" | "сом"'.` — the `values: FormBag` bag construction enforces the narrowed type on the `currency` shorthand property.
- **Fix:** Applied a scope-minimal cast at CreateListingScreen.tsx:530 — `currency: currency as import('../components/CreateListingForm').Currency | ''`. Leaves the `useState<string>('')` declaration at line 92 and the `setCurrency(value as string)` onChange case at line 147 intact, per the plan's explicit "Plan 04's scope" carve-out in Task 3 `<action>`.
- **Runtime safety:** Rehydrate normalizer at `CreateListingScreen.tsx:239-246` and `PriceSection` chip `onChange('currency', option.value)` both already feed only canonical `'$' | 'сом' | ''` values — the cast is a type-level formality, not a runtime substitution.
- **Files modified:** `src/screens/CreateListingScreen.tsx` (+6 LOC comment + 1 LOC code)
- **Commit:** `e794f8f`
- **Alternative considered and rejected:** Full Plan 04-style migration (tighten `useState<Currency | ''>('')` at line 92 + fix `setCurrency(value as Currency | '')` at line 147 + PriceSection CURRENCY_OPTIONS import). Rejected because Plan 01 Task 3 `<action>` explicitly reserves those call-sites for Plan 04 ("If tsc surfaces a new error at an orchestrator call-site like `setCurrency(value as string)` on line 147, DO NOT fix it here"). Applying the one-line cast at the bag construction preserves both the baseline AND the plan-level scope boundary.

### Non-rule adjustments

**2. Docblock reword to satisfy grep acceptance — preventive, not a bug**

- **Found during:** Task 1 (validators.ts creation — pre-commit grep check)
- **Issue:** Initial docblock for `buildPayloadByCategory` cited D-09 anchor C verbatim (`tours.length > 0 ? tours : undefined`); grep for `"tours.length > 0"` returned 2 hits (docblock + source line). Plan's acceptance specifies `=== 1`. Also, initial file-level docblock phrase "No React, no hooks, no AuthContext, no useRole" tripped the role-agnostic grep. Same pattern as Plan 04-06's documented "docblock reword" precedent (STATE.md session continuity).
- **Fix:** Reworded both docblocks to paraphrase intent without reusing the regex-target strings. Source-line anchor at `validators.ts:162` + `:166` remain the only matches for `panoramicPhotosUrl:` and `tours.length > 0`.
- **Commit:** folded into `8e55ad3` (pre-commit correction)

## Key Decisions Made

- **Validator is role-agnostic AND i18n-agnostic.** Error values are translation KEYS (e.g. `'createListing.bedroomsRequired'`), not translated strings. Callers translate at render time via `t(errors.field)`. This satisfies D-17 + RESEARCH Finding #10 simultaneously and keeps `validators.ts` import-free of React, hooks, auth context, and language context.
- **D-09 anchors land INSIDE the `shared` block of `buildPayloadByCategory`.** Both `panoramicPhotosUrl` (always) and `tours` (as `tours.length > 0 ? values.tours : undefined`) appear unconditionally in every category's output — regression guard per Pitfall 1 / RESEARCH Finding #6.
- **COMMERCIAL_TYPES `.includes()` cast.** `(COMMERCIAL_TYPES as readonly string[]).includes(values.propertyType)` — required because `as const` narrows the tuple to readonly literal types which reject arbitrary strings without widening. Documented inline.
- **Scope-minimal tsc cast at orchestrator.** One-line cast at `CreateListingScreen.tsx:530` instead of a full Plan 04-style migration of the currency state.

## Signal for Plan 02 (Downstream Consumer)

**`CURRENCY_OPTIONS` is now importable from `../components/CreateListingForm` (or deep import from `./validators`).** Plan 02 can delete `PriceSection.tsx:25-28` local literal and replace with:
```typescript
import { CURRENCY_OPTIONS } from './validators';
```
The identifier name, shape, and values are identical — a pure move. See `PATTERNS.md §10` for the full PriceSection migration contract.

**`Currency` + `ValidateResult` types** are exported from both `./validators` and the barrel `./index` for downstream convenience.

**`FIELD_ORDER_BY_CATEGORY`** drives the D-04 scroll-to-first-error logic in Plan 04's orchestrator integration. JSX render order matches the listed field order top-to-bottom.

## Known Stubs

None. All created/modified files fulfill their intended behavior for Plan 01 scope. Plan 02 + Plan 03 + Plan 04 will add UI error rendering, i18n keys, and orchestrator integration respectively — those stubs are intentional Phase 5 Wave boundaries, not Plan 01 regressions.

## Self-Check: PASSED

- FOUND: src/components/CreateListingForm/validators.ts
- FOUND: src/components/CreateListingForm/__tests__/validators.test.ts
- FOUND (modified): src/components/CreateListingForm/types.ts
- FOUND (modified): src/components/CreateListingForm/index.ts
- FOUND (modified): src/screens/CreateListingScreen.tsx
- FOUND: commit 8e55ad3 in git log (Task 1)
- FOUND: commit fb6f622 in git log (Task 2)
- FOUND: commit e794f8f in git log (Task 3)

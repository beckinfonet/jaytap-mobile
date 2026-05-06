---
phase: 02-6-step-contextual-listing-flow-client
plan: 02
subsystem: rn-client
tags: [contextual-listing-flow, scaffolding, step-1, i18n-parity, validators, adapters]
status: complete
requires: [02-01]
provides:
  - ContextualListingFlow scaffold (orchestrator + Step 1)
  - FormBag / FormErrorBag / SectionProps / ContextualListingFlowProps contracts
  - validateStep + FIELD_ORDER_PER_STEP + emptyFormBag (pure module)
  - propertyToFormBag + formBagToPropertyPayload (round-trip-safe pure module)
  - 24 new i18n keys (EN + RU parity)
  - W-04 Android hardware-back single-ownership inside orchestrator
affects:
  - src/components/ContextualListingFlow/* (new directory; 7 source files + 3 test files)
  - src/locales/en.ts (+ 24 keys)
  - src/locales/ru.ts (+ 24 keys)
tech-stack:
  added: []
  patterns:
    - SectionProps {values, onChange, errors} contract verbatim from M1 P4 — preserved
    - validateStep pattern mirrors M1 P5 validateByCategory (pure module, translation-key error values)
    - chip-row pattern lifted from src/screens/HomeScreen.tsx:486-516
    - mod-context banner transplanted from src/screens/CreateListingScreen.tsx:714-744
    - test scaffold uses react-test-renderer (Gated.test.tsx pattern), NOT @testing-library/react-native
key-files:
  created:
    - src/components/ContextualListingFlow/types.ts
    - src/components/ContextualListingFlow/validators.ts
    - src/components/ContextualListingFlow/adapters.ts
    - src/components/ContextualListingFlow/styles.ts
    - src/components/ContextualListingFlow/Step1DealAndPropertyType.tsx
    - src/components/ContextualListingFlow/index.tsx
    - src/components/ContextualListingFlow/__tests__/validators.test.ts
    - src/components/ContextualListingFlow/__tests__/adapters.test.ts
    - src/components/ContextualListingFlow/__tests__/Step1.test.tsx
  modified:
    - src/locales/en.ts
    - src/locales/ru.ts
decisions:
  - useTheme is imported from `../../theme/ThemeContext`; useLanguage from `../../context/LanguageContext`. Confirmed by reading src/components/CreateListingForm/BasicInfoSection.tsx:10-11.
  - Test stack is react-test-renderer (NOT @testing-library/react-native — not installed). Adapted Step1.test.tsx accordingly with findByProps({testID}) traversal.
  - Task 7 (i18n keys) was reordered to run BEFORE Tasks 5/6 because strict-TS (`Record<TranslationKeys, string>`) would have rejected `t('contextualListing.*')` calls in Step 1 / orchestrator before the keys existed in en.ts.
  - Added `common.next` (not in plan) — Rule 2 missing critical key required by orchestrator Next button.
  - W-01 currency-empty-string sentinel guard implemented + tested at Step 3 boundary so Step 6's deposit-currency fallback is unreachable with the empty sentinel.
metrics:
  duration: ~25 min
  completed: 2026-05-06
  tasks_executed: 7
  tests_added: 21 (validators 7, adapters 7, Step1 7)
  i18n_keys_added: 24 (EN + RU each)
---

# Phase 02 Plan 02: ContextualListingFlow Scaffold + Step 1 Summary

One-liner: Scaffolded the new `<ContextualListingFlow>` orchestrator (FormBag state machine, mod-context banner, 6-segment progress indicator, single-owner Android hardware-back) plus Step 1 chip rows, pure validators / adapters modules, and the first 24 i18n keys (EN+RU parity) — establishing the contracts that Plans 02-03 / 02-04a / 02-04b will extend.

## What was built

### New module: `src/components/ContextualListingFlow/`

| File | Purpose | LOC |
|------|---------|-----|
| `types.ts` | `FormBag` (nested per-step), `FormErrorBag` (dotted-path), `SectionProps`, `ContextualListingFlowProps` discriminated-union on mode | 89 |
| `validators.ts` | `validateStep(stepN, values)`, `FIELD_ORDER_PER_STEP`, `emptyFormBag()` — pure module, no React | 103 |
| `adapters.ts` | `propertyToFormBag(p)`, `formBagToPropertyPayload(v)` — pure round-trip-safe module | 109 |
| `styles.ts` | Shared `commonStyles` StyleSheet (layout/dimensions only; no colors) | 78 |
| `Step1DealAndPropertyType.tsx` | Step 1 SectionProps consumer rendering 2 chip rows simultaneously (3 dealType + 6 propertyType) | 117 |
| `index.tsx` | Orchestrator: state, mod banner, progress bar, step switcher, footer, Android back ownership, submit-stub | 255 |
| `__tests__/validators.test.ts` | 7 tests (Step 1 cases + W-01 currency sentinel + structural invariants) | 55 |
| `__tests__/adapters.test.ts` | 7 tests (3 propertyToFormBag, 2 formBagToPropertyPayload, 2 round-trip) | 123 |
| `__tests__/Step1.test.tsx` | 7 RTL smoke tests (chip render, onChange dispatch, error rendering, active styling) | 138 |

### i18n keys (24 new keys, EN + RU parity)

- 14 Step 1 keys (`contextualListing.step1.{title,dealTypeLabel,dealTypeRequired,dealType.{sale,rent_long,rent_daily},propertyTypeLabel,propertyTypeRequired,propertyType.{apartment,house,office,commercial,hotel,hostel}}`)
- 3 progress / submit keys (`contextualListing.progress.stepOf`, `submit.{create,modEdit}`)
- 3 discard-confirm keys (`contextualListing.discardConfirm.{title,body,confirm}`)
- 3 mod-queue Locations-tab keys (`moderation.queue.{tabs.listings,tabs.locations,locations.empty}`) — consumed by Plan 02-03 but added here for the parity-gate single-edit (Pitfall 2 mitigation)
- 1 common namespace key (`common.next`) — added per Rule 2 (orchestrator Next button required it; was absent from common.* family)

`bash scripts/check-i18n-parity.sh` exits 0.

## Verified import paths (CRITICAL for downstream Plans 02-03 / 02-04a / 02-04b)

These match the existing M1 / M2 component pattern (e.g. `src/components/CreateListingForm/BasicInfoSection.tsx:10-11`). Plans 02-03+ should copy these verbatim:

```typescript
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import type { TranslationKeys } from '../../locales';
```

There is **no** `src/providers/` or `src/contexts/` directory — the providers live at `src/theme/ThemeContext.tsx` and `src/context/LanguageContext.tsx` (singular `context`).

## Test stack note

This project does NOT have `@testing-library/react-native` installed. Step1.test.tsx was adapted to use `react-test-renderer` directly, matching the existing `src/components/__tests__/Gated.test.tsx` precedent. Plans 02-03 / 02-04a / 02-04b that author further component tests should use the same pattern (helpers `findByTestID`, `tryFindByTestID` are inlined in Step1.test.tsx — feel free to extract to a shared test util if a third file needs them).

Quirks observed:
- `ReactTestRenderer.act` must wrap both the initial `create()` call and any subsequent `onPress`-style event dispatches.
- `root.findByProps({ testID })` throws on no-match; use `root.findAllByProps({ testID })` and check `.length` for "may not exist" cases (pattern used for the optional `deal-type-error` Text).

## Test counts

| Suite | Cases | Status |
|-------|-------|--------|
| validators.test.ts | 7 (6 Step 1 + W-01 currency-sentinel guard) | PASS |
| adapters.test.ts | 7 (3 propertyToFormBag + 2 formBagToPropertyPayload + 2 round-trip) | PASS |
| Step1.test.tsx | 7 (label render + 3+6 chips + 2 onChange + active-style + error-render) | PASS |
| **Total** | **21** | **21/21 PASS** |

```
$ npx jest src/components/ContextualListingFlow/__tests__ --testPathIgnorePatterns=worktrees
Test Suites: 3 passed, 3 total
Tests:       21 passed, 21 total
```

## i18n key count after edit

- `en.ts`: keys = baseline + 24 (one common, 14 step1, 3 progress/submit, 3 discardConfirm, 3 mod-queue)
- `ru.ts`: keys = baseline + 24 (identical key set, RU values)
- `bash scripts/check-i18n-parity.sh` exits 0 (FORM-09 parity gate green)

## W-01 documentation (mandatory per plan output spec)

The `FormBag.basics.currency` union type is `'KGS' | 'USD' | 'EUR' | ''`. The empty string is required as a TypeScript-literal default in `emptyFormBag()` because `currency: undefined` would not satisfy the union (the empty string is the only legal "unset" sentinel in this union).

The Step 3 validator (`validators.ts` lines 60-62) explicitly rejects `currency: ''` with `errors['basics.currency'] = 'contextualListing.step3.currencyRequired'`. Test 7 in `validators.test.ts` (the W-01 describe-block) guards this behavior:

```typescript
const bag = { ...emptyFormBag(), basics: { areaSqm: '80', price: '1000', currency: '' as const } };
const r = validateStep(3, bag);
expect(r.isValid).toBe(false);
expect(r.errors['basics.currency']).toBe('contextualListing.step3.currencyRequired');
```

This means Plan 02-04b's Step 6 deposit-currency fallback (`values.basics.currency || 'KGS'` or similar) is **guaranteed unreachable with `currency === ''`** — the user cannot have advanced past Step 3 without picking a real currency. Step 6 only renders when `currency ∈ {'KGS', 'USD', 'EUR'}`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Reordered Task 7 (i18n keys) to run before Tasks 5/6.**
- **Found during:** pre-Task-5 setup
- **Issue:** Strict-TS (`Record<TranslationKeys, string>` constraint on `ru.ts`) would reject `t('contextualListing.*')` calls in Step 1 component and orchestrator before those keys existed as `keyof typeof en`. Building Step 5 first per the plan order would have produced ~10 TS errors that would only resolve when Task 7 landed.
- **Fix:** Executed Task 7 first (lands all 24 keys atomically), then Task 5, then Task 6.
- **Files modified:** none additional; just commit ordering changed.
- **Commit:** a23f2aa (Task 7 landed before 93c398e Task 5).

**2. [Rule 2 - Critical missing functionality] Added `common.next` i18n key.**
- **Found during:** Task 6 orchestrator authoring
- **Issue:** Orchestrator footer button calls `t('common.next')` (plan-specified) but that key did not exist in `en.ts` / `ru.ts` (only `common.back`, `common.cancel`, `common.save`, `common.confirm`, etc.).
- **Fix:** Added `'common.next': 'Next'` (EN) and `'common.next': 'Далее'` (RU) inside the same Task 7 single-edit so the parity gate stays single-diff.
- **Commit:** a23f2aa (folded into the Task-7 commit).

**3. [Rule 3 - Adapt to existing test stack] Test scaffold uses `react-test-renderer` instead of `@testing-library/react-native`.**
- **Found during:** Task 5 test authoring
- **Issue:** Plan suggested `import { render, fireEvent } from '@testing-library/react-native'`, but that package is not installed (verified via `package.json` — only `react-test-renderer` is present, used by `src/components/__tests__/Gated.test.tsx`). Installing a new test framework is out-of-scope for a scaffolding plan.
- **Fix:** Authored Step1.test.tsx using `ReactTestRenderer.create` + `root.findByProps({testID})` + `ReactTestRenderer.act(() => chip.props.onPress())`. Semantic coverage equivalent to the plan's RTL prescription — all 7 cases pass.
- **Commit:** 93c398e.

**4. [Rule 1 - Plan acceptance regex flaw, no functional change] Plan acceptance criterion for `'sale' | 'rent_long' | 'rent_daily'` literal expected ≥ 2 occurrences in `types.ts`.**
- **Found during:** Task 1 verification
- **Issue:** The plan author thought the discriminated-union `Props` type would also include the dealType triple-literal, but the verbatim plan content (which I lifted unchanged) only includes it once in the `FormBag.dealType` field. The Props type discriminates on `mode`, not `dealType`. The criterion's expectation does not match the verbatim spec.
- **Fix:** None — the verbatim FormBag is what binds. Same situation for the multiline `PROPERTY_TYPES` array regex (single-line regex doesn't match Prettier-wrapped multiline arrays). Both the literal contents and the structural shape are correct; only the `grep -c` regexes in the plan are imprecise.
- **Files modified:** none.

### No architectural changes

No Rule 4 (architectural decision) deviations. Plan executed structurally as designed.

## Notes for downstream plans

### Plan 02-03 (Steps 2 + 3)
- Replace placeholder lines `case 2:` and `case 3:` in `index.tsx` `stepBody` `useMemo` with real `<Step2Location>` / `<Step3Basics>` SectionProps consumers.
- Step 2 location.coordinates validator key already exists (`contextualListing.step2.coordinatesRequired`) — Plan 02-03 must add the EN/RU translations for it (validator emits the key; Plan 02-03 lands the value).
- Test cases for Step 2 + Step 3 validators go alongside `validators.test.ts` in this plan's `__tests__/` dir. Same with Step 2 / Step 3 component tests — colocated.
- Decisions log says Plan 02-03 also lights up the mod-queue Locations tab — those 3 keys (`moderation.queue.tabs.{listings,locations}` + `moderation.queue.locations.empty`) are already added here per the parity-gate single-edit rule.

### Plan 02-04a (Steps 4 + 5)
- Same pattern — replace placeholder `case 4:` + `case 5:` lines.
- Tests colocated in this `__tests__/` dir.

### Plan 02-04b (Step 6 + real submit wiring)
- Replace placeholder `case 6:` line.
- **Replace the submit stub in `handleNext`** (currently a `console.log` payload preview) with real `PropertyService.{create,update,editAsModerator}` calls per D-16, dispatched by `mode`.
- The integration test for the submit dispatch goes in this plan's `__tests__/` dir alongside the unit tests.
- Step 6 deposit-currency code can rely on `values.basics.currency ∈ {'KGS','USD','EUR'}` thanks to the W-01 Step 3 guard — no runtime check needed for the empty sentinel at Step 6 boundary.

### Plan 02-07 (App.tsx wire-through)
- The orchestrator owns Android hardware-back via the `BackHandler.addEventListener('hardwareBackPress', ...)` in `index.tsx` (W-04). Plan 02-07 should remove any App.tsx-level hardware-back handling that fights the orchestrator while it is mounted (option (a) in Plan 02-07 Task 1 Step 6).
- The orchestrator does NOT touch `isCreateListingOpen` / similar App.tsx flags — Plan 02-07 owns the wire-through.

## Commits

| Task | Hash | Message |
|------|------|---------|
| 1 (types) | 87354a9 | feat(02-02): add ContextualListingFlow types module |
| 2 RED (validators) | 9b82013 | test(02-02): add failing tests for ContextualListingFlow validators (RED) |
| 2 GREEN (validators) | 0a2ce24 | feat(02-02): implement ContextualListingFlow validators (GREEN) |
| 3 RED (adapters) | 8ab6769 | test(02-02): add failing tests for ContextualListingFlow adapters (RED) |
| 3 GREEN (adapters) | adbcee2 | feat(02-02): implement ContextualListingFlow adapters (GREEN) |
| 4 (styles) | 8d83eb4 | feat(02-02): add ContextualListingFlow shared styles |
| 7 (i18n keys) — reordered | a23f2aa | feat(02-02): add ContextualListingFlow i18n keys (EN + RU parity) |
| 5 (Step 1 + tests) | 93c398e | feat(02-02): implement Step1DealAndPropertyType + RTL smoke tests |
| 6 (orchestrator) | 7f49c01 | feat(02-02): add ContextualListingFlow orchestrator (index.tsx) |

## Self-Check: PASSED

- [x] `src/components/ContextualListingFlow/types.ts` exists
- [x] `src/components/ContextualListingFlow/validators.ts` exists
- [x] `src/components/ContextualListingFlow/adapters.ts` exists
- [x] `src/components/ContextualListingFlow/styles.ts` exists
- [x] `src/components/ContextualListingFlow/Step1DealAndPropertyType.tsx` exists
- [x] `src/components/ContextualListingFlow/index.tsx` exists
- [x] `src/components/ContextualListingFlow/__tests__/validators.test.ts` exists
- [x] `src/components/ContextualListingFlow/__tests__/adapters.test.ts` exists
- [x] `src/components/ContextualListingFlow/__tests__/Step1.test.tsx` exists
- [x] All 9 commit hashes (87354a9, 9b82013, 0a2ce24, 8ab6769, adbcee2, 8d83eb4, a23f2aa, 93c398e, 7f49c01) present in git log
- [x] 21/21 ContextualListingFlow tests pass
- [x] `bash scripts/check-i18n-parity.sh` exits 0
- [x] No new TS errors in `src/components/ContextualListingFlow/*` (pre-existing M2 atomic-break errors elsewhere unaffected)

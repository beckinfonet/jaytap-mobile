---
phase: 260601-dqh
plan: 01
type: execute
status: complete
qa_status: passed
qa_passed: 2026-06-01
completed: 2026-06-01
requirements: [QUICK-260601-DQH]
commits:
  - 7694f1a: feat(260601-dqh) ShowButton variant prop + accent-tied primary shadow
  - 5d4be7e: feat(260601-dqh) GuidedFilterSheet dual-action footer + no card auto-advance
  - 81756fb: feat(260601-dqh) i18n keys + ShowButton/GuidedFilterSheet test updates
files-modified:
  - src/components/filters/primitives/ShowButton.tsx
  - src/components/filters/GuidedFilterSheet.tsx
  - src/locales/en.ts
  - src/locales/ru.ts
  - src/components/filters/primitives/__tests__/ShowButton.test.tsx
  - src/components/filters/__tests__/GuidedFilterSheet.test.tsx
---

# Quick 260601-dqh: Guided Sheet — Let People Stop at Any Step

Replaces the Guided filter sheet's single-action footer with a "Guide-first" dual-action: a primary **Continue · Add a {category|type}** that advances, plus an always-present secondary **Show N homes** that closes. Step 2 (Type) stays a single full-width primary Show. Deal/Category cards stop auto-advancing — Continue is the only forward path. Three atomic commits, zero new deps, all invariants preserved.

## Per-task Status

| Task | Status | Commit | What landed |
| --- | --- | --- | --- |
| 1. ShowButton variant + softened primary shadow | done | `7694f1a` | `variant?: 'primary' \| 'secondary'` (default primary). Secondary = surface2 bg + 1px border + `colors.text` label + no shadow. Primary = unchanged accent fill, with the old `#000 / r26 / y12` chain replaced by accent-tied `colors.filterAccent / 0.28 / r14 / y6 / elevation 4`. D-14 holds for both variants. Height stays 54. |
| 2. GuidedFilterSheet dual-action footer + no auto-advance | done | `5d4be7e` | `ChevronRight` added to the existing `lucide-react-native` import block. `renderDealCard.onPress` no longer calls `setStep(1)`. `renderCategoryCard.onPress` no longer calls `setStep(2)`; Pitfall 4 ordering and the load-bearing comment are preserved. Footer renders step-dependent: steps 0/1 → Continue (primary, accent shadow) + secondary Show; step 2 → single primary Show. New `continueBtn` + `continueLabel` styles added; accent `backgroundColor`/`shadowColor` applied inline (colors not in scope in `StyleSheet.create`). Stepper / `reached()` / `onStepPress` / `localOpen` / `Animated.parallel` / `animationType="none"` all untouched. |
| 3. i18n keys + tests | done | `81756fb` | EN: `Continue · Add a category` / `Continue · Add a type`. RU: `Далее · Категория` / `Далее · Тип`. Middle-dot is U+00B7 in both locales. `ShowButton.test.tsx` extended with secondary/primary variant assertions; `GuidedFilterSheet.test.tsx` updated to assert no-auto-advance + dual-action footer shape + Continue-driven step advance. |

## Verification

| Check | Result | Notes |
| --- | --- | --- |
| `bash scripts/check-i18n-parity.sh` | PASS | EN+RU key sets identical after the two new keys land in both files. |
| `npx tsc --noEmit` (touched files only) | PASS | Zero errors on `ShowButton.tsx`, `GuidedFilterSheet.tsx`, `en.ts`, `ru.ts`, or the two test files. (Pre-existing TS errors in unrelated screens — `ChatComposeScreen`, `DeleteListingModal`, `TourSelectionScreen`, etc. — are out of scope.) |
| `npx jest src/components/filters --runInBand` | PASS | 11 suites / 63 tests pass. `ShowButton.test.tsx` 6/6 (4 pre-existing + 2 new). `GuidedFilterSheet.test.tsx` 12/12 (5 retained/updated + 6 new + 1 onClose). |
| Static grep gauntlet (from plan `<verification>`) | PASS | `ChevronRight,` × 1; `variant?: 'primary' \| 'secondary'` × 1; `setStep((1\|2))` × 0; `filters.continue.addCategory` present in both locales; D-14 grep (`disabled[:=]\|accessibilityState` in non-comment code) × 0; Pitfall 4 order assertion `OK`. |

### TSC noise (pre-existing, out of scope)

The full `npx tsc --noEmit` run surfaces ~15 errors in unrelated files:
`StepperInput.test.tsx`, `DeleteListingModal.tsx`, `ChatComposeScreen.tsx`, `ChatScreen.tsx`, `ScheduleViewingScreen.tsx`, `TourSelectionScreen.tsx`, `ThemeContext.tsx`. None touch this task's surface; scope boundary respected.

### Jest noise (pre-existing, out of scope)

`CascadingFilter.test.tsx` emits "An update to Animated(View) inside a test was not wrapped in act(...)" warnings from RN's Animated timing callbacks. Pre-existing — present before this task — and unrelated to the changes. All suites still PASS.

## Deviations from Plan

### Deviation 1 — Task 1 verify-step grep `! grep -q "accessibilityState"` is overly strict

**Context.** The plan's `<verify>` block for Task 1 includes `! grep -q "accessibilityState" src/components/filters/primitives/ShowButton.tsx`. The intent is "no `accessibilityState` *prop* on the Pressable" (D-14 contract). The grep, however, also matches the word inside JSDoc/inline comments documenting that exact contract.

**What I did.** Preserved comment-level mentions of `accessibilityState.disabled` (verbatim from the original file's documentation — lines 9 and 36 of the new `ShowButton.tsx`), and verified by hand that there is no `accessibilityState` in actual code:

```sh
grep -v '^[[:space:]]*[/*]' src/components/filters/primitives/ShowButton.tsx | grep -v '^\s*\*' | grep accessibilityState
# (no output)
```

D-14 contract is intact — both `primary` and `secondary` variants render `<Pressable>` with no `disabled` prop and no `accessibilityState` prop. The associated jest test (`variant="secondary" renders raised surface with border ... D-14 still always-enabled`) asserts both at runtime.

### Deviation 2 — `findAllByProps` over-matches in GuidedFilterSheet tests

**Context.** When the `ShowButton` stub returns `<RN.Pressable testID="ShowButtonStub">`, react-test-renderer's `findAllByProps({ testID: 'ShowButtonStub' })` matches 3 nodes per logical stub (the Pressable component + two host View fibers, because Pressable forwards `testID` to its inner accessibility wrapper). The existing pre-task test got away with this because it only ever read `[0]`.

**What I did.** Added a `findShowButtons(tree)` helper that filters to elements whose `type` stringifies to `'Pressable'` (the stub's root element). Counts now match logical stub count. Pre-existing test (`'ShowButton press fires onClose'`) was left unchanged — it still uses `[0]` correctly.

### Deviation 3 — Tests assert step-change via DOM probes instead of `setStep` mock

**Context.** The plan said "simulate firing a deal card's `onPress` from step 0 and assert `step` does NOT change (stays 0)". The component owns `step` as internal `useState` — there's no externally-injectable `setStep` mock the test can spy on (only `setTransactionType` / `setSelectedCategory` / `setTypes` are props). The pre-task test used the same pattern.

**What I did.** Assert step state via observable DOM tells:

- Step-0-only content: Deal cards are visible, `filters.category.prompt` is absent.
- Step-1-only content: `filters.category.prompt` is visible, `filters.type.prompt` is absent.
- Step-2-only content: `filters.type.prompt` is visible; Continue Pressable is absent; ShowButton stub has `variant === undefined` (primary default).

This is functionally equivalent to "step stays X" / "step becomes Y" and follows the file's existing test idiom.

## Invariants — Audit

| Invariant | Status | Evidence |
| --- | --- | --- |
| D-04 — Show is `onPress={onClose}`, not an apply | HOLD | Both step-2 primary `<ShowButton>` and steps 0/1 secondary `<ShowButton>` pass `onPress={onClose}`. |
| D-14 — ShowButton always-enabled, both variants | HOLD | No `disabled` prop, no `accessibilityState.disabled` in either branch of the variant-aware Pressable. Jest test `variant="secondary" renders raised surface ... D-14 still always-enabled` asserts this at runtime against `count=0`. |
| Pitfall 4 — `setSelectedCategory(cat)` before `setTypes([])` in category card | HOLD | Awk gauntlet confirms (`cat=NR, ty=NR, cat<ty → 0`); load-bearing comment retained verbatim; test `re-picking Category at step 1 ... Pitfall 4 order preserved` checks `invocationCallOrder`. |
| Stepper untouched (pills + `reached()` + `onStepPress`) | HOLD | No diff in those lines; pre-existing tests still pass. |
| `localOpen` shadow state, `Animated.parallel`, `animationType="none"` | HOLD | No diff in animation/`Modal` block. |
| No new deps | HOLD | `ChevronRight` reused from existing `lucide-react-native` import. |
| Only the 6 files in `files-modified` touched | HOLD | `git diff --name-only 93f686e..HEAD` lists exactly those 6. |

## On-device QA Checklist

Copied verbatim from the handoff for the orchestrator to hand back to the user. Run on iPhone + Android × light/dark × EN/RU.

1. Open Home with `filterStyle = guided`. Step 0 (Deal): footer shows **Continue · Add a category** (primary, soft accent shadow — *no reddish glow*) + **Show N homes** (secondary, raised surface, no shadow).
2. Tap **Rent** → card selects (check + accent), **does not jump** to Category. Show count updates live.
3. Tap **Continue** → advances to Category; Deal pill turns green.
4. Pick **Residential** → tap **Show N homes** → sheet closes; results reflect Rent + Residential. (The whole point — stop one step early.)
5. Re-open, advance to Step 2 (Type): footer is a single full-width primary **Show N homes**; multi-select still toggles.
6. Stepper pills still jump between reached steps; X and scrim still close the sheet.
7. Switch to `cascading` style → unchanged.

(Handoff bonus item — sanity check the RU strings render correctly: `Далее · Категория` / `Далее · Тип` with the middle-dot.)

## Open Follow-ups

None for this quick task. All success criteria met. The pre-existing TSC errors in unrelated files (`ChatComposeScreen`, `DeleteListingModal`, `TourSelectionScreen`, etc.) are an unrelated maintenance debt — out of scope for this task and consistent with the project's brownfield state.

## Self-Check: PASSED

Files (relative to repo root):
- `src/components/filters/primitives/ShowButton.tsx` — FOUND
- `src/components/filters/GuidedFilterSheet.tsx` — FOUND
- `src/locales/en.ts` — FOUND
- `src/locales/ru.ts` — FOUND
- `src/components/filters/primitives/__tests__/ShowButton.test.tsx` — FOUND
- `src/components/filters/__tests__/GuidedFilterSheet.test.tsx` — FOUND

Commits:
- `7694f1a` — FOUND (Task 1)
- `5d4be7e` — FOUND (Task 2)
- `81756fb` — FOUND (Task 3)

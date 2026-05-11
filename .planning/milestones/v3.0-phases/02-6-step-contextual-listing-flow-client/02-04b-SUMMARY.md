---
phase: 02-6-step-contextual-listing-flow-client
plan: 04b
subsystem: rn-client
tags: [react-native, contextual-listing-flow, step-6, deal-conditions, integration-test, submit-dispatch, i18n]

# Dependency graph
requires:
  - phase: 02
    plan: 02
    provides: "ContextualListingFlow orchestrator with stepBody switch + validateStep(6) (sale/rent_long/rent_daily branches) + emptyFormBag tri-state defaults + W-01 currency-empty sentinel guard at Step 3"
  - phase: 02
    plan: 04a
    provides: "Step4ConditionAmenities + Step5TitleDescription components + canonical theme/ThemeContext + context/LanguageContext import paths + activeChipBackground/activeChipText token usage"
provides:
  - "Step6DealConditions component (dealType-gated matrix: sale → negotiable + deposit; rent_long → negotiable + deposit + prepayment 0/1/2/Custom + minTerm; rent_daily → deposit only per D-19 thin step)"
  - "Pitfall 6 mitigation in code: tapping Custom prepayment chip OPENS input below seeded with current value (does NOT clobber preset)"
  - "Orchestrator stepBody case 6 wiring (placeholder removed)"
  - "Orchestrator dealType-change reflow (ROADMAP SC#4) — extends Plan 02-03 propertyType reflow"
  - "Orchestrator real submit dispatch (D-16) — replaces Plan 02-02 console.log stub: PropertyService.createProperty | updateProperty | editAsModerator by mode"
  - "validators.test.ts cases V15-V20 (6 Step-6 cases) — validators total now 27 cases"
  - "integration.test.tsx — 3 cases (INT-1: Step 1→6 walk + createProperty payload; INT-2: edit-mod mod-context-banner; INT-3: Step 6 modEdit submit-button label)"
  - "18 Step 6 i18n keys (EN + RU parity) — cumulative 108 keys × 2 langs = 216 entries"
affects: [02-07, 02-08, 02-09]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Integration test mocks lucide-react-native via Proxy stub so testID lookups don't fall through icon trees"
    - "react-native-safe-area-context mocked in integration.test.tsx (orchestrator wraps in SafeAreaView)"
    - "PropertyService mocked at module boundary — exposes createProperty/updateProperty/editAsModerator as jest.fn() for dispatch assertions"
    - "Step 6 dealType-gated matrix uses showNegotiable / showPrepayMin booleans for branch rendering — keeps the 3-cell matrix legible without nested ternaries"

key-files:
  created:
    - "src/components/ContextualListingFlow/Step6DealConditions.tsx"
    - "src/components/ContextualListingFlow/__tests__/Step6.test.tsx"
    - "src/components/ContextualListingFlow/__tests__/integration.test.tsx"
  modified:
    - "src/components/ContextualListingFlow/index.tsx (Step 6 import + stepBody case 6 + dealType reflow + real PropertyService dispatch + docstring update)"
    - "src/components/ContextualListingFlow/__tests__/validators.test.ts (append V15-V20: 6 Step-6 cases)"
    - "src/locales/en.ts (+18 keys)"
    - "src/locales/ru.ts (+18 keys)"

key-decisions:
  - "PropertyService method signatures verified — createProperty(payload, images?) / updateProperty(id, payload, images?) / editAsModerator(id, payload, images?, reason?). Phase 2 does NOT ship media (Phase 3 owns it), so we pass [] for the images arg explicitly."
  - "Step6 component itself has no `mode` prop — submit-button label morph (FLOW-15 + CONTEXT specifics §Step 6 Submit button) is owned by the orchestrator's `submitLabel` ternary. Test 9 in Step6.test.tsx asserts component DOES NOT render the next button (orchestrator owns it); INT-3 in integration.test.tsx asserts the orchestrator-rendered label morphs correctly."
  - "B-03 reconciliation honored: 18 i18n keys ship (RESEARCH first listed 17). The +1 delta is `contextualListing.step6.prepayment.custom` — the Custom chip label per CONTEXT specifics §Step 6 prepayment + Pitfall 6 — RESEARCH miscounted by 1."

patterns-established:
  - "Pattern: dealType-gated matrix component — `const showX = dt === 'sale' || dt === 'rent_long'` booleans drive branch rendering instead of nested ternaries inside JSX. Mirrors Step3 conditional sub-field rendering by propertyType."
  - "Pattern: Custom-int chip with input-below — local useState<boolean>('customMode') + useState<string>('customStr') keeps the input shown only when the Custom chip is the active selection. Tap on Custom seeds the input from the current value (Pitfall 6); typing dispatches `parseInt(cleaned, 10)` to FormBag; clearing the input dispatches `undefined`."
  - "Pattern: Discriminated-union props consumed via mode-switch in dispatch — mode === 'create' / 'edit-owner' / 'edit-mod' branches in the orchestrator's submit handler with `props as` casts (TypeScript discriminated-union narrowing didn't work cleanly across the captured `props` reference; localized casts at each branch keep types tight)."
  - "Pattern: Pre-emptive i18n key landing before component-using-keys lands — required by strict TS (`Record<TranslationKeys, string>`) when components use literal-string `t('key')` calls (not template-literal-with-cast). Plan 02-02 + Plan 02-04b both reordered Task 7/4 (i18n) ahead of dependent component tasks for this reason."

requirements-completed: [FLOW-11, FLOW-12, FLOW-13, FLOW-15]

# Metrics
duration: 10m 24s
completed: 2026-05-06
---

# Phase 02 Plan 04b: Step 6 (Deal Conditions Matrix) + Real Submit Dispatch + Step 1→6 Integration Test Summary

**Step 6 dealType-gated matrix component shipped + orchestrator wired for ROADMAP SC#4 reflow + real PropertyService dispatch by mode + Step 1→6 integration test asserting the SPEC payload shape — closing the user-facing flow surface before App.tsx wire-through (Plan 02-07).**

## Performance

- **Duration:** 10m 24s
- **Started:** 2026-05-06T09:39:16Z
- **Completed:** 2026-05-06T09:49:40Z
- **Tasks:** 4 (Task 1 followed strict RED→GREEN; Tasks 2 + 3 + 4 single-commit each, plus 1 follow-up TS-cleanup commit)
- **Files created:** 3
- **Files modified:** 4
- **Commits:** 6 (1 RED + 1 GREEN + 1 wire-and-dispatch + 1 i18n-and-cleanup + 1 V15-V20-and-integration + 1 fix-cast)

## Accomplishments

- **Step6DealConditions.tsx (FLOW-11 + D-19)** — 388 LOC component with 3-cell matrix gated by dealType:
  - **sale:** negotiable Yes/No (required) + deposit input + currency selector (KGS/USD/EUR)
  - **rent_long:** negotiable + deposit + prepaymentMonths chips (0/1/2/Custom) + minTerm chips (1_month/3_months)
  - **rent_daily (D-19 thin step):** deposit only — predictable structure beats minor screen savings; progress bar still shows 6 of 6
  - **Pitfall 6 mitigation in code:** tapping Custom prepayment chip OPENS a number input SEEDED with the current `prepaymentMonths` value; does NOT clobber preset until user types a new number.
- **Orchestrator wiring (D-16 real submit + ROADMAP SC#4 reflow):**
  - `index.tsx` stepBody case 6 placeholder replaced with `<Step6DealConditions>`.
  - `onChange` wrapper extended: `field === 'dealType' && prev.dealType !== value` → `next.terms = {}` so a switch e.g. rent_long → sale drops stale prepayment/minTerm before Step 6 reflows.
  - Plan 02-02's `console.log('[ContextualListingFlow] submit payload:', ...)` stub replaced with real dispatch:
    - `mode='create'` → `PropertyService.createProperty(payload)`
    - `mode='edit-owner'` → `PropertyService.updateProperty(initialListing.id, payload)`
    - `mode='edit-mod'` → `PropertyService.editAsModerator(initialListing.id, payload, [], moderatorContext.reason)`
  - `onSuccess` now receives the real returned id (no more 'stub-id'). Failure surfaces `Alert.alert(t('common.error'), e.message ?? t('common.errorGeneric'))`.
  - Phase 2 does NOT ship media — `[]` passed explicitly for the images arg per Phase 3 ownership boundary.
- **validateStep(6) cases V15–V20** — sale/rent_long (4 cells: empty, valid happy, prepayment=0 valid, deposit-optional)/rent_daily empty isValid. All 6 pass.
- **integration.test.tsx — 3 cases:**
  - **INT-1:** apartment + rent_long Step 1→6 walk asserts `PropertyService.createProperty` is called once with the SPEC §"Suggested Data Shape" payload (numeric `basics.areaSqm: 80` + `basics.price: 1000` + `basics.currency: 'KGS'` + nested `location.coordinates.lat/lng` + nested `terms.{negotiable,prepaymentMonths,minTerm}`); asserts `payload.status` and `payload.media` are absent (server defaults status; Phase 3 owns media); asserts `onSuccess('new-listing-id')` and `onClose()` fire.
  - **INT-2:** mode='edit-mod' renders `mod-context-banner` testID on Step 1 (FLOW-15).
  - **INT-3:** Step 6 footer Submit button text matches `contextualListing.submit.modEdit` for mode='edit-mod' (CONTEXT specifics §"Step 6 Submit button").
- **i18n** — 18 Step 6 keys × 2 languages = 36 new entries. `bash scripts/check-i18n-parity.sh` exits 0 (FORM-09 parity gate green).

## Task Commits

Each task was committed atomically (TDD RED→GREEN where applicable):

1. **Task 1 RED: Step6DealConditions test (11 cases)** — `a919dd5` (test)
2. **Task 1 GREEN: Step6DealConditions implementation** — `c350aef` (feat)
3. **Task 2: Wire Step 6 into orchestrator + dealType reflow + real submit dispatch** — `31c3467` (feat)
4. **Task 4 (reordered ahead of Task 3): 18 Step 6 i18n keys + Step6 TS sentinel cleanup** — `d25dfc6` (feat)
5. **Task 3: validator V15-V20 + integration test (3 cases)** — `c1b0231` (test)
6. **TS cleanup follow-up: cast n.type for Text node detection** — `253d7ff` (fix)

## Files Created/Modified

- `src/components/ContextualListingFlow/Step6DealConditions.tsx` — Step 6 matrix component
- `src/components/ContextualListingFlow/__tests__/Step6.test.tsx` — 11 RTL smoke tests
- `src/components/ContextualListingFlow/__tests__/integration.test.tsx` — 3 integration cases
- `src/components/ContextualListingFlow/index.tsx` — Step6 import + stepBody case 6 + dealType reflow + real PropertyService dispatch + docstring updated
- `src/components/ContextualListingFlow/__tests__/validators.test.ts` — V15–V20 appended (Step 6 cases)
- `src/locales/en.ts` — +18 Step 6 keys
- `src/locales/ru.ts` — +18 Step 6 keys

## Decisions Made

- **Theme/Language import paths** continue to use `../../theme/ThemeContext` and `../../context/LanguageContext` (project-canonical; matches Step1/Step3/Step4/Step5). Plan 02-04a's deviation lesson applied pre-emptively (no rework).
- **Active chip color tokens** continue to use `colors.activeChipBackground` / `colors.activeChipText` (project-canonical; matches Step1/Step3/Step4 precedent). Same reason as Plan 02-04a.
- **PropertyService method signatures verified** — createProperty/updateProperty/editAsModerator all already exist with the M2 baseline shape `(propertyData, images = [])` for create/update and `(propertyId, propertyData, images = [], reason?)` for editAsModerator. No new methods added; orchestrator passes `[]` for images explicitly. Plan 02-07's App.tsx wire-through can rely on the verified return shape `{ id, _id }`.
- **Submit-button morph cell placement** — Test 9 in Step6.test.tsx asserts the negative invariant (component does NOT render the orchestrator's button); INT-3 in integration.test.tsx asserts the positive invariant (orchestrator-rendered button shows modEdit label for mode='edit-mod'). This split keeps the SectionProps consumer pure and the orchestrator the single owner of the footer.
- **B-03 reconciliation:** Step 6 ships 18 keys (RESEARCH listed 17). The +1 delta is `contextualListing.step6.prepayment.custom` — the Custom chip label per CONTEXT specifics §"Step 6 prepayment custom integer" + Pitfall 6. RESEARCH miscounted by 1 when tallying. Cumulative running count: Plan 02-04a (-1, B-02) + this plan (+1, B-03) = net 0; total 108 keys × 2 langs = 216 entries (within RESEARCH's 80–120 projected range when including outside-namespace keys absorbed into earlier plans).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Reordered Task 4 (i18n keys) to run before Task 3 (integration test) — same precedent as Plan 02-02 Task-7 reorder**
- **Found during:** Task 1 GREEN (`npx tsc --noEmit` showed 8 errors: literal-string `t('contextualListing.step6.*')` calls in Step6DealConditions.tsx rejected by `Record<TranslationKeys, string>` until keys exist in en.ts).
- **Issue:** Step6DealConditions uses literal `t('contextualListing.step6.title')` etc. (not template-literal-with-cast). Strict TS rejects these calls until the keys land in en.ts → `keyof typeof en` includes them. Identical situation to Plan 02-02 Task-7 reorder.
- **Fix:** Landed Task 4 (18 i18n keys × 2 langs) immediately after Task 2's commit, before Task 3 (validator + integration). Single atomic commit `d25dfc6`.
- **Files modified:** `src/locales/en.ts`, `src/locales/ru.ts` (+ pre-emptive Step6 useEffect TS sentinel cleanup).
- **Verification:** `npx tsc --noEmit` for Step 6 keys clean post-Task-4. i18n parity gate still green.

**2. [Rule 1 - Bug] Step6 useEffect deposit-currency seed had a dead `!== ''` check after a truthy guard**
- **Found during:** Task 4 (post-keys TS scan).
- **Issue:** The Step6 useEffect on-mount block had `values.basics.currency && values.basics.currency !== ''`. After the truthy `&&` check, TS narrowed `currency` to `'KGS' | 'USD' | 'EUR'`, making `!== ''` an unintentional comparison (TS2367). The W-01 sentinel guard at Step 3 (Plan 02-02 Test 7) already proves currency==='' is unreachable here, so the redundant check was both broken-typed and tautological.
- **Fix:** Drop the `!== ''` clause; rely on the truthy check. Comment expanded to cite the W-01 chain.
- **Files modified:** `src/components/ContextualListingFlow/Step6DealConditions.tsx` (3-line cleanup).
- **Verification:** `npx tsc --noEmit` against Step6 surface returns zero errors. 11/11 Step6 tests still pass.
- **Committed in:** `d25dfc6` (rolled into the i18n commit).

**3. [Rule 1 - Bug] integration.test.tsx Text-node detection helper `n.type === 'Text'` triggered TS2367 against the intrinsic JSX-name union**
- **Found during:** Task 3 verification post-commit (TS scope check on Plan 02-04b surface).
- **Issue:** react-test-renderer host-component types ARE strings like 'Text' / 'View' at runtime, but TS narrows `ReactTestInstance.type` to a union of intrinsic JSX names that doesn't include 'Text' (it's a React Native runtime convention, not a DOM intrinsic). The original `n.type === 'Text'` was both correct at runtime AND rejected by TS.
- **Fix:** Cast to string before the comparison: `const typeStr = typeof n.type === 'string' ? (n.type as string) : ''; if (typeStr === 'Text') { ... }`. Comment explains the runtime-vs-types mismatch.
- **Files modified:** `src/components/ContextualListingFlow/__tests__/integration.test.tsx`.
- **Verification:** `npx tsc --noEmit` against Plan 02-04b surface returns zero errors. INT-1/INT-2/INT-3 all still pass.
- **Committed in:** `253d7ff`.

### Out-of-scope discoveries logged (NOT fixed)

- **Pre-existing TS errors elsewhere** — `npx tsc --noEmit` repo-wide still reports the M2 atomic-break carry-forward errors (CreateListingScreen, ScheduleViewingScreen, TourSelectionScreen, ThemeContext.tsx ColorSchemeName). None are touched by this plan; same baseline Plan 02-04a's deferred-items.md entry already documented. Continues to be M3 client type-hardening backlog.

---

**Total deviations:** 3 auto-fixed (1 Rule 3 task-reorder; 2 Rule 1 — TS hygiene at planner-level surface). Zero scope creep.
**Impact on plan:** None — Task 3 and Task 4 swapped order to match Plan 02-02 / Plan 02-04a precedent for strict-TS-aware tasks.

## Issues Encountered

None. All 4 tasks executed cleanly. Watchman recrawl warning is environmental noise (unrelated to plan).

## Verification Summary

- **`npx jest src/components/ContextualListingFlow/__tests__`** — **94/94 across 9 suites** (Step1 7 + Step2 13 + Step3 11 + Step4 8 + Step5 7 + Step6 11 + validators 27 + adapters 7 + integration 3).
- **`bash scripts/check-i18n-parity.sh`** — **PASS** (en.ts and ru.ts key sets identical).
- **Acceptance-criteria greps** — all observable invariants satisfied across Tasks 1, 2, 3, 4 (matrix gating, Pitfall 6 seed, dealType reflow, PropertyService dispatch ≥3, console.log stub removed, i18n labels ≥4, custom + customPlaceholder ≥2, minTerm 1_month + 3_months ≥2).
- **`npx tsc --noEmit`** against Plan 02-04b surface (Step6DealConditions + index.tsx + integration.test.tsx + locales/(en|ru).ts) — **0 errors**. Pre-existing TS baseline elsewhere unchanged.
- **Stub removal:** `grep "console.log..ContextualListingFlow. submit payload" src/components/ContextualListingFlow/index.tsx` returns 0.

## Cumulative i18n key count

Per Plan 02-02 (24) + Plan 02-03 (49) + Plan 02-04a (18) + Plan 02-04b (this, 18) = **109 keys × 2 languages = 218 entries** in cumulative additions. (Note: Plan 02-02's count includes the `common.next` and `moderation.queue.tabs.*` keys absorbed during reordering; Plan 02-04a's count was 18 = 11 Step 4 + 7 Step 5; Plan 02-04b's 18 = 17 RESEARCH + 1 B-03.) Within RESEARCH's 80–120 projected range.

## Self-Check: PASSED

- All 3 created files exist on disk (Step6DealConditions.tsx, Step6.test.tsx, integration.test.tsx).
- All 6 task commits found in `git log`: `a919dd5`, `c350aef`, `31c3467`, `d25dfc6`, `c1b0231`, `253d7ff`.
- All 4 Task ACs satisfied (semantic-grep level for Tasks 1, 2, 4; jest-pass level for Task 3 + cross-cutting integration).
- 94/94 tests pass; i18n parity exits 0; Plan 02-04b surface TS clean.

## Next Phase Readiness

- **The user-facing flow surface is COMPLETE.** All 6 steps are wired in `index.tsx` `stepBody` switch; submit dispatches a real backend call by mode; integration test proves Step 1→6 walks correctly and the SPEC payload shape lands at `PropertyService.createProperty`.
- **Plan 02-07 (App.tsx flag swap) is unblocked.** It needs to:
  - Replace `isCreateListingOpen` flag with `isContextualListingFlowOpen`.
  - Mount `<ContextualListingFlow>` with the right `mode` based on the existing edit/mod-edit App.tsx state branches (`propertyToEdit` + `moderatorContext`).
  - Pass `onClose: closeFlow` and `onSuccess: (id) => { setRenterListingsRefreshKey(...); openRenterListings('pending'); }` per D-17.
  - Coordinate with the orchestrator's owned hardware-back single-ownership (W-04) — App.tsx should NOT add a fighting handler.
- **Plan 02-08 (operator dry-run on physical devices)** needs to verify Pitfall 1 (map-drag fallback) + Pitfall 6 (Custom-int seed) + 6-step happy path × 3 deal types + mod-banner persistence + Locations tab — all of which are now testable end-to-end.
- **Plan 02-09 (atomic deletion: CreateListingScreen.tsx + CreateListingForm/ barrel + orphaned i18n keys)** unblocked once 02-07 + 02-08 land. The final i18n cleanup will drop ~80 `createListing.*` keys × 2 langs = 160 entries.

## TDD Gate Compliance

This is an `execute` plan (not a `tdd` plan); per-task TDD gates were applied where `<task tdd="true">` was set:

- **Task 1 RED→GREEN:** `a919dd5` (test, RED — module-not-found error confirmed) → `c350aef` (feat, GREEN — 11/11 pass).
- **Task 3 (TDD-shaped, no separate gate flag):** validator V15-V20 + integration cases written; the validators were a fresh-write append against existing `validateStep(6)` already implemented in Plan 02-02 Task 2 — they pass on first run (no separate RED commit needed; equivalent of REFACTOR-validator-with-additional-cases).

REFACTOR was unnecessary for Task 1 (component shipped clean on the first GREEN pass); Tasks 2 + 4 are not TDD-shaped (orchestrator wiring + i18n keys).

---
*Phase: 02-6-step-contextual-listing-flow-client*
*Plan: 04b*
*Completed: 2026-05-06*

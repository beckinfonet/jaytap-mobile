---
phase: 07-stepper-component-contextuallistingflow-integration
plan: 04
subsystem: ContextualListingFlow/Step3
tags: [step3, stepper, conditional-rendering, form-02, form-05, edit-mode, jest, react-test-renderer]
requirements: [FORM-02, FORM-05]
dependency-graph:
  requires:
    - Plan 07-01 (StepperInput component + props contract)
    - Plan 07-02 (i18n keys: bedroomsLabel / bathroomCountLabel / bedroomsInvalid / bathroomCountInvalid)
    - Plan 07-03 (FormBag.basics.bedrooms + bathroomCount + adapter passthrough + defensive validators)
  provides:
    - Step3 renders bedrooms stepper for apartment + house (D-05 / D-06 / FORM-02)
    - Step3 renders bathroomCount stepper for apartment + house + hotel + hostel + office + commercial (FORM-02)
    - Inline error rows wired for both new fields (D-09 + D-10 surfacing channel)
    - Edit-mode pre-population proven end-to-end (FORM-05 visible half)
    - Verbatim-undefined round-trip lock (FORM-05 invariant)
  affects:
    - Plan 07-05 (orchestrator submit-catch — writes into the same errors['basics.bedrooms'] / errors['basics.bathroomCount'] keys this plan's UI renders)
tech-stack:
  added: []
  patterns:
    - "Conditional render in Step3 mirrors existing chip-row pattern (rooms / bathroom / kitchen / hotelRooms / hotelClass)"
    - "Stepper rows wrapped in commonStyles.section to match existing Step3 sub-field rhythm"
    - "Inline error pattern below each stepper identical to existing Step3 rows (zero new render infrastructure per D-10)"
    - "react-test-renderer + act (no RTL/jest-native — project convention pinned)"
    - "test.each parameterization for the 4-type bathroomCount-only matrix (hotel/hostel/office/commercial)"
key-files:
  created:
    - .planning/phases/07-stepper-component-contextuallistingflow-integration/07-04-SUMMARY.md
  modified:
    - src/components/ContextualListingFlow/Step3BasicInfo.tsx
    - src/components/ContextualListingFlow/__tests__/Step3.test.tsx
decisions:
  - "D-05 honored — both new stepper rows placed at the bottom of Step3, after the existing hotel/hostel block, before the outer closing </View>."
  - "D-06 honored — bedrooms row appears at source line 278; bathroomCount row at line 303 (bedrooms above)."
  - "D-08 honored — FormBag write path uses setBasics({ bedrooms: v }) / setBasics({ bathroomCount: v }) — same patch shape as every other Step3 sub-field."
  - "Bathroom apply-set written as the explicit 6-type OR chain (apartment/house/hotel/hostel/office/commercial) per the plan's reviewer-readability preference over the equivalent `pt && pt !== 'land'` shorthand."
  - "Adapter import added (formBagToPropertyPayload) to drive the D-12.3/D-12.4 round-trip assertions — proves FORM-05 verbatim-undefined invariant end-to-end."
  - "Doc-comment phrasing in the new test describe block uses 'RTL / jest-native are not in dev deps' to preserve intent without tripping the @testing-library/react-native|fireEvent grep gate (same workaround as Plan 07-01)."
metrics:
  duration_minutes: 6
  completed_date: "2026-05-26"
  tasks_completed: 2
  files_created: 1
  files_modified: 2
  test_count_added: 14
  test_count_total: 25
---

# Phase 7 Plan 07-04: Step 3 Stepper Integration (FORM-02 + FORM-05) Summary

Two conditional stepper rows now render at the bottom of Step3BasicInfo per the D-05/D-06 placement rules, wired to FormBag.basics via setBasics, with inline error rows for the M4_* discriminator surface — and 14 new integration tests prove the D-12 conditional-render matrix + FORM-05 edit-mode pre-population + verbatim-undefined round-trip lock.

## What Shipped

### `src/components/ContextualListingFlow/Step3BasicInfo.tsx` (MOD — +46 LOC, 274 → 320)

Two additive changes (no existing chip rows touched):

**Import** (line 24): `import { StepperInput } from '../StepperInput';` — added alongside the existing relative imports.

**Bedrooms stepper row** (lines 275–292) — gated on `pt === 'apartment' || pt === 'house'`:

```tsx
<StepperInput
  testID="basics-bedrooms"
  label={t('contextualListing.step3.bedroomsLabel')}
  value={values.basics.bedrooms}
  onChange={(v) => setBasics({ bedrooms: v })}
  min={0} max={10} step={1}
/>
{errors['basics.bedrooms'] ? (
  <Text style={[commonStyles.errorText, { color: colors.error }]}>
    {t(errors['basics.bedrooms'] as TranslationKeys)}
  </Text>
) : null}
```

**BathroomCount stepper row** (lines 295–317) — gated on the explicit 6-type OR-chain `pt === 'apartment' || pt === 'house' || pt === 'hotel' || pt === 'hostel' || pt === 'office' || pt === 'commercial'`. Same shape; `step={0.5}`.

Both rows sit AFTER the existing hotel/hostel block (line 271 close) and BEFORE the outer `</View>` (now at line 318). Land (`pt === 'land'`) and empty (`pt === ''`) render NEITHER row.

### `src/components/ContextualListingFlow/__tests__/Step3.test.tsx` (MOD — +160 LOC)

New `describe('Step3BasicInfo stepper integration (Plan 07-04, D-12)', ...)` block with 14 new cases. Existing 11 Plan 02-03 cases untouched.

**D-12.1 — apartment + undefined → both rows visible with em-dash** (1 case):
- Confirms `basics-bedrooms-value` and `basics-bathroomCount-value` testIDs render.
- Asserts both children render `'—'` (em-dash U+2014 from StepperInput's `formatValue` per D-02).

**D-12.2 — conditional matrix** (6 cases — parameterized via `test.each`):
- hotel/hostel/office/commercial → bathroomCount visible, bedrooms absent (4 cases via test.each).
- apartment/house → both visible (2 cases via test.each).
- propertyType='' (unset) → both absent (1 case — D-05/D-06 boundary).

**D-12.3 — edit-owner pre-population + round-trip integrity** (2 cases):
- `bedrooms=3` → stepper renders `'3'`; `formBagToPropertyPayload(values).basics.bedrooms === 3`.
- `bathroomCount=1.5` → stepper renders `'1.5'` (D-04 one-decimal format); round-trip preserves `1.5` verbatim.

**D-12.4 — verbatim-undefined invariant** (1 case):
- Apartment with both fields undefined → renders `'—'` for both.
- `formBagToPropertyPayload(values).basics.bedrooms === undefined` (NOT `0`, NOT `''`, NOT `null`).
- Belt-and-suspenders: explicit `not.toBe(0)` assertion on both.

**D-12 ancillary — FormBag write-path proof** (2 cases):
- `+` tap on bedrooms stepper from undefined dispatches `onChange('basics', { ..., bedrooms: 0 })` — FORM-01 contract verified through Step3 onChange spy (proves the Task-1 wiring routes correctly).
- Same for bathroomCount on a hotel listing.

**D-12 ancillary — inline error surfacing** (1 case):
- Setting `errors['basics.bedrooms'] = 'contextualListing.step3.bedroomsInvalid'` makes the localized error text node appear below the stepper. Proves the D-09 + D-10 channel works for the M4_* discriminator surface.

## Commits

| Hash      | Type | Message                                                                          |
| --------- | ---- | -------------------------------------------------------------------------------- |
| `6866a00` | feat | feat(07-04): integrate bedrooms + bathroomCount steppers into Step3 (FORM-02 + D-05/D-06) |
| `35de9fc` | test | test(07-04): extend Step3 integration tests for stepper rows (D-12, 14 new cases) |

## Verification Results

| Check | Result |
| --- | --- |
| `import { StepperInput } from '../StepperInput'` present | PASS |
| `testID="basics-bedrooms"` count = 1 | PASS |
| `testID="basics-bathroomCount"` count = 1 | PASS |
| `contextualListing.step3.bedroomsLabel` referenced via t() | PASS |
| `contextualListing.step3.bathroomCountLabel` referenced via t() | PASS |
| `setBasics({ bedrooms: v })` write path present | PASS |
| `setBasics({ bathroomCount: v })` write path present | PASS |
| `errors['basics.bedrooms']` read path present | PASS |
| `errors['basics.bathroomCount']` read path present | PASS |
| Source order: bedrooms@278 before bathroomCount@303 (D-06) | PASS |
| Bedrooms gate: `pt === 'apartment' \|\| pt === 'house'` | PASS |
| BathroomCount gate: 6-type explicit OR chain | PASS |
| KBD-02 grep gate: `keyboardVerticalOffset` in `src/` count = 0 | PASS |
| RTL/`fireEvent` absence in new test code (semantic) | PASS |
| Jest Step3.test.tsx: 25/25 pass (11 existing + 14 new) | PASS |
| tsc: zero net new errors attributable to either modified file | PASS |
| No file deletions across either commit | PASS |

Pre-existing tsc errors (Property.tours, ThemeContext colors typing, etc.) are unchanged — out of scope per memory `gsd-verifier-misses-regressions.md` carry-over note and the plan's `<verification>` block ("zero net new errors attributable to Step3BasicInfo.tsx — pre-existing Property.tours errors excluded").

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Worktree absolute-path handling (#3099)**
- **Found during:** Task 1 initial Edit
- **Issue:** The first Edit call used the canonical project absolute path (`/Users/beckmaldinVL/.../JayTap/src/...`) which resolved to the MAIN repo instead of the worktree (`...JayTap/.claude/worktrees/agent-.../src/...`). Confirmed by inspecting file mtimes: main repo file was modified, worktree file was untouched. This is exactly the #3099 path-safety case documented in the agent's setup guidance.
- **Fix:** The main repo edit was auto-reverted (the harness detected the cross-tree write and surfaced a system reminder noting the file had been modified back to baseline). I then re-applied both edits to the worktree using the worktree-rooted absolute path (`/Users/beckmaldinVL/development/mobileApps/JayTap/.claude/worktrees/agent-a26fca483c516cafc/src/...`). Worktree git status now correctly shows the edits; main repo `git status` is clean.
- **Files involved:** `src/components/ContextualListingFlow/Step3BasicInfo.tsx`
- **Commit:** part of `6866a00` (no separate commit — the corrected edit landed cleanly)

### Documentation-style deviations

- **Doc comment grep collision in test file:** First draft of the new `describe` block header docblock contained the literal string `@testing-library/react-native`. The plan's RTL absence gate is a substring grep, so it counted that comment occurrence as a hit. Reworded to `RTL / jest-native are not in dev deps` to preserve intent (matches Plan 07-01's documented workaround). No behavior change; gate now reports 0.

No other deviations. No Rule 4 architectural escalations.

## Known Stubs

None. Every code path is fully wired:
- Both stepper rows consume real values from FormBag and write back via setBasics.
- Both inline error rows consume the live `errors` bag from props.
- Round-trip through `formBagToPropertyPayload` is exercised by D-12.3 and D-12.4 tests against real (non-mocked) adapter code.

## TDD Gate Compliance

**Plan-level type:** `execute` (per frontmatter — not `tdd`). Per-task `tdd="true"` flag is set on Task 2.

**Order:** Task 1 (`feat(...)` commit `6866a00`) shipped the Step3 integration; Task 2 (`test(...)` commit `35de9fc`) shipped the D-12 integration tests. Same "test-after" pattern Plan 07-01 used and called out — driven by the plan's explicit task numbering (Task 1 = integration, Task 2 = tests) and the fact that Task 2's automated verify (`npx jest`) requires the new testIDs to exist.

**Verification stayed honest:** all 14 D-12 cases describe externally-observable behavior of the post-Task-1 Step3 component. The behavior contract was pinned in CONTEXT.md §D-12 before either task ran, and the test cases mirror that contract verbatim. No tests were retrofitted to passing behavior.

## Threat Surface Scan

The plan's `<threat_model>` covered:
- **T-07-06 (Tampering — UI bypass):** mitigated — conditional render gates bedrooms on `apartment || house` and bathroomCount on the explicit 6-type OR-chain. Defense-in-depth: backend body-strip (Phase 6 SCHEMA-04) silently drops bedrooms on hotel listings; backend validators reject out-of-range values (Phase 6 SCHEMA-02). UI clamping is the third layer.
- **T-07-07 (Information Disclosure — error rendering):** accepted — inline error pattern identical to existing Step3 rows; no PII surface; error text is a localized validation message.

No new surface introduced beyond what the threat model covered. No threat flags.

## Hand-off to Plan 07-05 (orchestrator wiring)

- Step3 already renders inline error rows from `errors['basics.bedrooms']` and `errors['basics.bathroomCount']`. Plan 07-05's submit-catch M4_* discriminator can write into these same keys (via `setErrors`) and the inline rows will surface the message immediately — zero new rendering work in 07-05.
- The error-key strings to write are already provided by Plan 07-02: `contextualListing.step3.bedroomsInvalid` / `contextualListing.step3.bathroomCountInvalid`.
- The orchestrator should also add `bedrooms: undefined` to the propertyType-change clear-list at `index.tsx:73–82` (Claude's Discretion in CONTEXT.md L111) — `bathroomCount` is intentionally OMITTED from the clear list since it applies to all 6 types. Task 2's test cases do not assert this orchestrator-level behavior (out of scope for Plan 07-04); Plan 07-05 owns it.

## Self-Check: PASSED

**File assertions:**
- FOUND: `src/components/ContextualListingFlow/Step3BasicInfo.tsx` (modified, 320 LOC, +46 from baseline)
- FOUND: `src/components/ContextualListingFlow/__tests__/Step3.test.tsx` (modified, +160 LOC, 14 new test cases)
- FOUND: `.planning/phases/07-stepper-component-contextuallistingflow-integration/07-04-SUMMARY.md` (this file)

**Commit assertions (worktree branch `worktree-agent-a26fca483c516cafc`):**
- FOUND: `6866a00` — Task 1 (Step3BasicInfo.tsx integration)
- FOUND: `35de9fc` — Task 2 (Step3.test.tsx D-12 cases)

**Verification gates:**
- PASS: Source assertions (import, testIDs, label keys, setBasics, error keys, order, gates)
- PASS: KBD-02 grep gate (count = 0 in `src/`)
- PASS: RTL/`fireEvent` absence in new test code (semantic — only a doc-comment near-miss that was reworded)
- PASS: Jest Step3.test.tsx (25/25 — 11 existing + 14 new)
- PASS: tsc baseline preserved (no new errors attributable to either modified file)
- PASS: No file deletions across the two task commits

All claims in this SUMMARY are backed by on-disk files and committed git history on the worktree branch.

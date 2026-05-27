---
phase: 11-listing-address-geocode
plan: 03
subsystem: rn-client/types
tags:
  - rn-client
  - types
  - adapters
  - formbag
  - phase-11
  - geocoding
dependency_graph:
  requires:
    - 11-CONTEXT.md decisions 6, 7, 8 (FormBag.location.address required string; Property.location.address optional string; no validateStep rule)
  provides:
    - "src/types/Property.ts :: Property.location.address?: string"
    - "src/components/ContextualListingFlow/types.ts :: FormBag.location.address: string (required, default '')"
    - "src/components/ContextualListingFlow/adapters.ts :: address round-trip in both directions"
    - "src/components/ContextualListingFlow/validators.ts :: emptyFormBag().location.address = '' + FIELD_ORDER_PER_STEP[2] entry"
  affects:
    - Plan 11-04 (Step2Location.tsx UI — TextInput value={values.location.address}) — unblocks
    - Plan 11-05 (downstream display — property.location.address read-path) — unblocks
    - Plan 11-01 (backend Mongoose schema) — parallel-safe (wave 1, zero file overlap)
tech-stack:
  added: []
  patterns:
    - "FormBag scalar convention: required string with empty-string default; adapter converts '' → undefined on write"
    - "`|| undefined` coercion on adapter write-side matches existing currency pattern (line 94)"
key-files:
  created: []
  modified:
    - src/types/Property.ts (1 line added inside location? block)
    - src/components/ContextualListingFlow/types.ts (1 line added inside FormBag.location block)
    - src/components/ContextualListingFlow/adapters.ts (2 lines added — one per direction)
    - src/components/ContextualListingFlow/validators.ts (2 surgical edits — emptyFormBag + FIELD_ORDER_PER_STEP)
    - src/components/ContextualListingFlow/__tests__/adapters.test.ts (Rule 1 cascade fix — 2 test fixtures)
    - src/components/ContextualListingFlow/__tests__/validators.test.ts (Rule 1 cascade fix — 1 test fixture)
decisions:
  - "FormBag.location.address declared REQUIRED (not optional) per 11-CONTEXT.md decision 6 and the FormBag scalar convention (every other location field is required with empty-string default)."
  - "Property.location.address declared OPTIONAL (`address?: string`) per 11-CONTEXT.md decision 7 — backend Mongoose default is `''`, so missing field and empty string are equivalent on persistence."
  - "NO validateStep(2, ...) rule added — field is OPTIONAL at submit per 11-CONTEXT.md decision 8. Submitting with empty address must continue to advance from Step 2."
  - "Adapter uses `|| undefined` coercion (not direct passthrough) on write-side to match the existing currency pattern (line 94). Empty string becomes undefined → JSON payload omits the key → backend treats as default. Prevents partial-PUT clobbering of a populated address with ''."
  - "FIELD_ORDER_PER_STEP[2] appends `'location.address'` AFTER `'location.coordinates'` so any future address validation error (e.g. client-side maxlength hint in Plan 11-04+) will scroll into view in the correct visual order — purely future-proofing, has no behavioral effect today."
metrics:
  duration_minutes: 20
  completed_date: 2026-05-26
  task_count: 1
  file_count: 6
  commit_count: 1
---

# Phase 11 Plan 03: RN Client Type Stubs Summary

**One-liner:** Added `address` field to `Property.location` (optional) + `FormBag.location` (required, defaults to `''`) with round-trip adapter mappings and validators defaults — type-level foundation that unblocks Plans 11-04 (UI) and 11-05 (display) without changing any runtime behavior for users who don't touch the new field.

## Outcome

All 4 RN-client files carry the new `address` field per their respective conventions; `emptyFormBag()` and `FIELD_ORDER_PER_STEP` updated; no new validation rule added; **zero NEW TSC errors** (17 baseline preserved exactly); **158/158** ContextualListingFlow tests pass; Step2Location.tsx untouched (file boundary respected — Plan 11-04 owns it).

## Files Modified (RN Client repo only — backend untouched)

| File | Change |
|------|--------|
| `src/types/Property.ts` | +1 line: `address?: string;` inside nested `location?` block (after `showExactAddress?`) |
| `src/components/ContextualListingFlow/types.ts` | +1 line: `address: string;` inside `FormBag.location` (after `showExactAddress`) |
| `src/components/ContextualListingFlow/adapters.ts` | +2 lines: `address: p.location?.address ?? ''` in `propertyToFormBag`; `address: v.location.address || undefined` in `formBagToPropertyPayload` |
| `src/components/ContextualListingFlow/validators.ts` | 2 surgical edits: `emptyFormBag().location.address = ''`; `FIELD_ORDER_PER_STEP[2]` appended `'location.address'` |
| `src/components/ContextualListingFlow/__tests__/adapters.test.ts` | Rule 1 cascade fix: added `address: ''` to 2 literal `location` fixtures (lines 80, 105) |
| `src/components/ContextualListingFlow/__tests__/validators.test.ts` | Rule 1 cascade fix: added `address: ''` to 1 literal `location` fixture (line 74) |

**Total diff:** 6 files, +9 / -2 lines.

## TSC Diagnostic Delta

| Metric | Before | After | Delta |
|--------|--------|-------|-------|
| Total errors | 17 | 17 | 0 |
| Errors in `Step2Location.tsx` | 0 | 0 | 0 |
| Errors outside `Step2Location.tsx` and `App.tsx` | 17 | 17 | 0 |

Baseline error set is bit-for-bit preserved (`diff` output empty between `before` and `after2` logs). The pre-existing 17 errors are:

- 3 in `StepperInput.test.tsx` (M4 Phase 7 ElementType/View comparison — unrelated)
- 2 in `DeleteListingModal.tsx` (`title` + `address` top-level Property accesses — pre-existing M3 brownfield gap, NOT related to this plan; note: the `address` access there is to a TOP-LEVEL `property.address`, not nested `property.location.address`)
- 6 in `ChatComposeScreen.tsx` (legacy Property fields — M3 brownfield)
- 1 in `ChatScreen.tsx` (legacy `title`)
- 1 in `ScheduleViewingScreen.tsx` (legacy `title`)
- 2 in `TourSelectionScreen.tsx` (M3 Phase 2 D-20 — legacy `Tour` + `tours[]` removed; orphan screen)
- 2 in `ThemeContext.tsx` (legacy `ColorSchemeName` narrowing)

### Step2Location.tsx Errors

**Plan predicted "≥1 expected error" (informally "6+") on Step2Location.tsx to be closed by Plan 11-04. Actual outcome: 0 errors.**

Reason: every existing `onChange('location', { ...values.location, X })` callsite on `Step2Location.tsx` (lines 75, 138, 145, 153, 167, 207, 216 per the plan's interfaces analysis) spreads `...values.location` FIRST, so the spread carries the new `address: ''` (from `emptyFormBag()` default) verbatim. TypeScript narrows the spread's contribution correctly and finds no missing-property error. Plan 11-04 still owns adding the `<TextInput>` and an explicit `address` write — this plan only needed to get the type plumbing in place.

This is the BETTER case the plan considered: "if all 6 existing callsites spread `...values.location` first, then NO Step2Location.tsx changes are needed at runtime — the spread preserves `address` from FormBag state. The TS errors are spurious because TS doesn't narrow the spread's contribution." The plan's safety-net for that case was the same defer-to-Plan-11-04 disposition we landed on.

## Test Results

```
PASS src/components/ContextualListingFlow/__tests__/integration.test.tsx
PASS src/components/ContextualListingFlow/__tests__/Step3.test.tsx
PASS src/components/ContextualListingFlow/__tests__/Step6.test.tsx
PASS src/components/ContextualListingFlow/__tests__/Step2.test.tsx
PASS src/components/ContextualListingFlow/__tests__/Step4.test.tsx
PASS src/components/ContextualListingFlow/__tests__/Step5.test.tsx
PASS src/components/ContextualListingFlow/__tests__/Step1.test.tsx
PASS src/components/ContextualListingFlow/__tests__/adapters.test.ts
PASS src/components/ContextualListingFlow/__tests__/validators.test.ts

Test Suites: 9 passed, 9 total
Tests:       158 passed, 158 total
```

## File Boundary Confirmation

`git diff --stat src/components/ContextualListingFlow/Step2Location.tsx` returns 0 changed lines. Plan 11-04 owns this file exclusively — no incursion.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Test fixture cascade from required-field addition] Three test fixtures missing `address` after `FormBag.location.address` became required**

- **Found during:** Task 1 TSC verification step.
- **Issue:** Three test fixtures (`adapters.test.ts:80`, `adapters.test.ts:105`, `validators.test.ts:74`) construct literal `FormBag.location` objects (rather than spreading `emptyFormBag().location`), so TypeScript flagged them as missing the new required `address` property.
- **Fix:** Added `address: ''` to each of the 3 literal fixtures. Empty-string default matches `emptyFormBag()` and is the canonical "user has not typed anything" value.
- **Why auto-fixed (not deferred):** These are direct, mechanical, scope-related cascades from this plan's type change (Rule 1 — bug: tests don't compile against new shape). They are NOT pre-existing baseline errors and they were NOT in `Step2Location.tsx` (the only file the plan explicitly defers). Leaving them would have left the TSC delta at +3, missing the acceptance criterion `DELTA_NON_STEP2_NON_APP_ERR_COUNT === 0`.
- **Files modified:** `src/components/ContextualListingFlow/__tests__/adapters.test.ts`, `src/components/ContextualListingFlow/__tests__/validators.test.ts`.
- **Commit:** `1d9c4d7` (same atomic commit as the type-stub additions — single semantically-coherent unit of work).
- **No runtime behavior change:** test fixtures only; no production code path touched.

### Other Deviations from LOCKED Decisions 6, 7, 8

None. All three locked decisions honored verbatim:
- Decision 6 (FormBag.location.address required with `''` default): honored
- Decision 7 (Property.location.address optional): honored
- Decision 8 (no new validateStep rule — empty address must submit): honored

## Acceptance Criteria

All 10 plan acceptance criteria pass:

| # | Criterion | Expected | Actual |
|---|-----------|----------|--------|
| AC1 | `grep -c 'address?:\s*string' src/types/Property.ts` | ≥1 | 1 |
| AC2 | `grep -cE '^\s*address:\s*string;' .../types.ts` | ≥1 | 1 |
| AC3 | `grep -c 'p\.location?\.address' .../adapters.ts` | ≥1 | 1 |
| AC4 | `grep -c 'v\.location\.address' .../adapters.ts` | ≥1 | 1 |
| AC5 | `grep -c "address: ''" .../validators.ts` (emptyFormBag) | ≥1 | 1 |
| AC6 | `grep -c "'location.address'" .../validators.ts` (FIELD_ORDER) | ≥1 | 1 |
| AC7 | `grep -cE '^\s*(city|district|coordinates|showExactAddress)\?:' Property.ts` | ≥4 | 4 |
| AC8 | `grep -cE '^\s*(city\|district\|coordinates\|showExactAddress):' types.ts` | ≥4 | 4 |
| AC9 | `grep -cE 'step2\.addressRequired\|address.*Required' validators.ts` | 0 | 0 |
| AC10 | `git diff --stat Step2Location.tsx` lines changed | 0 | 0 |
| TSC | `npx tsc --noEmit` NEW errors outside Step2Location + App | 0 | 0 |
| Step2Location TSC | errors on Step2Location.tsx (plan predicted ≥1) | ≥1 | 0 (better — see analysis above) |

## Commit

- **Hash:** `1d9c4d7`
- **Subject:** `feat(11-03): add address field to RN client type stubs (Property.location, FormBag.location, adapters, validators)`
- **Files:** 6 changed, +9 / -2 lines
- **Branch:** `worktree-agent-add3233cb2b53d57a` (per-agent worktree branch)

## Cross-Repo Hygiene

This plan touched only RN-client files. Backend repo (`/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services`) was not accessed and has zero new modifications attributable to this plan. Plan 11-01 owns all backend file changes and runs in parallel (wave 1, no file overlap).

## Authentication Gates

None — pure type-level / glue work; no network, no auth surface touched.

## Known Stubs

None. The `address` field is a real, fully-wired type-stub foundation that downstream plans (11-04 UI, 11-05 display) build on. No "TODO" placeholders, no hardcoded mock values, no unwired components introduced. The `emptyFormBag()` empty-string default is intentional (matches FormBag convention; not a stub).

## Threat Flags

None. Plan's threat model (T-11-13, T-11-14, T-11-15) accepts all three at "type-stubs are build-time documentation only — no runtime data exposure / no new attack surface added." No new network endpoints, no new auth paths, no new file access patterns, no schema changes at trust boundaries (backend schema change is Plan 11-01's territory).

## Self-Check: PASSED

- File `src/types/Property.ts` — FOUND, contains `address?: string` (1 match)
- File `src/components/ContextualListingFlow/types.ts` — FOUND, contains `address: string;` (1 match, required)
- File `src/components/ContextualListingFlow/adapters.ts` — FOUND, contains `p.location?.address` (1 match) AND `v.location.address` (1 match)
- File `src/components/ContextualListingFlow/validators.ts` — FOUND, contains `address: ''` (1 match) AND `'location.address'` (1 match)
- File `src/components/ContextualListingFlow/__tests__/adapters.test.ts` — FOUND, modified (2 fixture fixes)
- File `src/components/ContextualListingFlow/__tests__/validators.test.ts` — FOUND, modified (1 fixture fix)
- Commit `1d9c4d7` — FOUND in `git log --oneline -3`
- TSC delta — 17 → 17 (zero NEW errors); diff between before and after error sets is empty
- Jest — 158/158 ContextualListingFlow tests passing

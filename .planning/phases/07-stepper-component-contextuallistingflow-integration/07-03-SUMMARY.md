---
phase: 07-stepper-component-contextuallistingflow-integration
plan: 03
subsystem: ContextualListingFlow
tags: [types, adapters, validators, formbag, undefined-preserving, m4, form-04, form-05]
requirements: [FORM-04, FORM-05]
dependency-graph:
  requires:
    - Phase 6 SCHEMA-03 (Property.basics.bedrooms + bathroomCount fields)
    - Plan 07-02 (i18n error keys: contextualListing.step3.bedroomsInvalid + bathroomCountInvalid — same wave, referenced not imported)
  provides:
    - FormBag.basics extended with bedrooms?: number + bathroomCount?: number
    - Bidirectional adapter wiring (Property↔FormBag) for both new fields, undefined-preserving
    - Defensive Step-3 validators (validate-if-present, never required)
    - FIELD_ORDER_PER_STEP[3] parity for scroll-to-first-error
  affects:
    - Plan 07-04 (Step3 integration — needs FormBag type + validator FIELD_ORDER recognition)
    - Plan 07-05 (orchestrator wiring — inherits FORM-05 undefined-preserving submit invariant)
tech-stack:
  added: []
  patterns:
    - "Optional ?: numeric fields on FormBag.basics matching existing Step-3 enum-field pattern"
    - "Verbatim passthrough on adapter — no string coercion (numeric fields end-to-end)"
    - "Defensive validators: !== undefined guard first; only validates when value is present (FORM-04 lock)"
    - "0.5-step enforcement via Number.isInteger(v * 2) — mirrors Phase 6 SCHEMA-02 backend validator shape"
key-files:
  created: []
  modified:
    - src/components/ContextualListingFlow/types.ts
    - src/components/ContextualListingFlow/adapters.ts
    - src/components/ContextualListingFlow/validators.ts
    - src/components/ContextualListingFlow/__tests__/adapters.test.ts
    - src/components/ContextualListingFlow/__tests__/validators.test.ts
decisions:
  - "D-07 lock honored — FormBag.basics extended with flat optional ?: numeric fields (no discriminated union split)"
  - "D-08 lock honored — adapter is bidirectional, undefined-preserving, no coerce-to-zero"
  - "D-09 / FORM-04 lock honored — validators are defensive-only; undefined NEVER surfaces an error on any propertyType"
  - "0.5-step enforcement uses Number.isInteger(v * 2) — same shape as Phase 6 SCHEMA-02 backend validator"
metrics:
  duration: ~25min
  completed: 2026-05-25
  tasks: 3/3
  source-files-modified: 3
  test-files-modified: 2
  net-loc-added: 194 (+2 types, +4 adapters source, +14 validators source, +74 adapter tests, +100 validator tests)
  tests-run: 47 (12 adapters + 35 validators)
  tests-pass: 47/47
  tests-added: 13 (5 adapter cases + 8 validator cases)
---

# Phase 7 Plan 03: Wire bedrooms/bathroomCount through FormBag pipeline — Summary

Extended FormBag.basics with `bedrooms?: number` and `bathroomCount?: number`, wired bidirectional undefined-preserving adapters, and added defensive Step-3 validators with FIELD_ORDER parity — all gated to the M4 FORM-04 lock (undefined is always valid; only validates when value is present and out-of-range).

## What Shipped

### types.ts (FormBag.basics extension — D-07)

Appended two optional numeric fields to the FormBag.basics interface after `hotelClass`:

- `bedrooms?: number` — integer 0–10; apartment/house only
- `bathroomCount?: number` — 0.5-step 0–10; all 6 propertyTypes

Optionality (`?:`) matches every other Step-3 conditional sub-field (rooms, bathroom, kitchen, hotelRooms, hotelClass). No discriminated-union split — D-07 explicitly locks the flat optional pattern (planned trade: discriminated unions deferred to a future migration).

File LOC: 89 → 91 (+2 lines).

### adapters.ts (bidirectional wiring — D-08)

**propertyToFormBag** (`adapters.ts:34–35`): appends two lines that read the new fields verbatim:

```typescript
bedrooms: p.basics?.bedrooms, // number | undefined — Phase 6 SCHEMA-03
bathroomCount: p.basics?.bathroomCount, // number | undefined — Phase 6 SCHEMA-03
```

No `String(...)` coercion — these fields are numeric end-to-end, unlike `areaSqm`/`price` which are string-at-form-time.

**formBagToPropertyPayload** (`adapters.ts:85–86`): appends two lines that pass values through verbatim:

```typescript
bedrooms: v.basics.bedrooms, // verbatim passthrough — undefined survives (D-08 + FORM-05)
bathroomCount: v.basics.bathroomCount, // verbatim passthrough — undefined survives (D-08 + FORM-05)
```

The existing "Strip undefined leaves for clean payload" comment (`adapters.ts:106–108`) already covers the new fields — Phase 6 schema-permissive validators tolerate undefined.

### validators.ts (FIELD_ORDER extension + defensive checks — D-09 / FORM-04)

**FIELD_ORDER_PER_STEP[3]** (`validators.ts:25–26`): appended two new entries after `'basics.hotelClass'`:

```typescript
'basics.bedrooms',
'basics.bathroomCount',
```

Order matches Step3 display order (bedrooms above bathrooms — D-06 + universal Beds|Baths convention).

**Defensive Step-3 validators** (`validators.ts:78–93`): inserted after the `hotel || hostel` branch but before `stepN === 4`. Both checks gate on `!== undefined` first — FORM-04 lock means undefined is always valid:

```typescript
if (
  values.basics.bedrooms !== undefined &&
  (!Number.isInteger(values.basics.bedrooms) ||
    values.basics.bedrooms < 0 ||
    values.basics.bedrooms > 10)
) {
  errors['basics.bedrooms'] = 'contextualListing.step3.bedroomsInvalid';
}
if (
  values.basics.bathroomCount !== undefined &&
  (!Number.isInteger(values.basics.bathroomCount * 2) ||
    values.basics.bathroomCount < 0 ||
    values.basics.bathroomCount > 10)
) {
  errors['basics.bathroomCount'] = 'contextualListing.step3.bathroomCountInvalid';
}
```

The `bathroomCount * 2` integer check enforces 0.5-step — same shape as Phase 6 SCHEMA-02 backend validator (single mental model from form → backend).

Error keys reference Plan 07-02 i18n strings — no new imports required.

### adapters.test.ts (5 new cases under "Plan 07-03 adapters")

- **A:** `propertyToFormBag` carries `bedrooms=3` + `bathroomCount=1.5` through.
- **B:** Missing keys remain `undefined` on FormBag (NOT `0`, NOT `""`).
- **C:** `formBagToPropertyPayload` passes `3` + `1.5` verbatim.
- **D:** `undefined` survives the FormBag→Property direction (FORM-05 invariant — no coerce-to-zero).
- **E:** Full Property→FormBag→Property round-trip preserves `bedrooms=3` + `bathroomCount=2.5`.

### validators.test.ts (8 new cases under "Plan 07-03 validators")

- **1:** Undefined-OK on every applicable propertyType — FORM-04 lock proof.
- **2:** `bedrooms=11` → `bedroomsInvalid` (out-of-range).
- **3:** `bedrooms=2.5` → `bedroomsInvalid` (non-integer).
- **4:** `bedrooms=3` → no error.
- **5:** `bathroomCount=1.3` → `bathroomCountInvalid` (non-0.5-step).
- **6:** `bathroomCount=1.5` → no error (valid 0.5-step).
- **7:** `bathroomCount=11` → `bathroomCountInvalid` (out-of-range).
- **8:** `FIELD_ORDER_PER_STEP[3]` parity — bedrooms after hotelClass, bathroomCount after bedrooms.

## Commits

| Hash    | Task | Summary                                                                  |
| ------- | ---- | ------------------------------------------------------------------------ |
| 3457395 | 1    | feat(07-03): extend FormBag.basics with bedrooms + bathroomCount (D-07) |
| 926b9b4 | 2    | feat(07-03): wire bedrooms + bathroomCount through adapters (D-08)      |
| c064605 | 3    | feat(07-03): extend FIELD_ORDER + defensive validators (D-09)           |

## Verification

| Gate                       | Result                                          |
| -------------------------- | ----------------------------------------------- |
| Source assertions (Task 1) | PASS — both `?: number` lines present, exactly 1 |
| Source assertions (Task 2) | PASS — propertyToFormBag + formBagToPropertyPayload both have new lines |
| Source assertions (Task 3) | PASS — FIELD_ORDER entries, `!== undefined` guards, 0.5-step check, error keys all present |
| Jest adapters.test.ts      | PASS — 12/12 (7 existing + 5 new)               |
| Jest validators.test.ts    | PASS — 35/35 (27 existing + 8 new)              |
| tsc -p .                   | PASS — zero net new errors attributable to any of the 3 modified source files |

## Deviations from Plan

None — plan executed exactly as written. All three tasks completed in order, all acceptance criteria met, no Rule 1/2/3 auto-fixes required, no Rule 4 architectural escalations.

The 07-PATTERNS.md doc-bug note about `.json` vs `.ts` for locales is not in this plan's scope (Plan 07-02 owns locale files); no action required here.

## Known Stubs

None. No hardcoded empty values, no placeholder copy, no components-with-no-data-source. Both new fields flow through the existing FormBag pipeline end-to-end as soon as Plan 07-04 (Step3 integration) lands.

## Boundary Notes for Downstream Plans

- **Plan 07-04 (Step3 integration):** `FormBag['basics']['bedrooms']` and `FormBag['basics']['bathroomCount']` are now typed `number | undefined` — Step3BasicInfo.tsx can read them through `values.basics.bedrooms` and write through `setBasics({ bedrooms: v })` without any new orchestrator wiring. The defensive validator's error keys (`contextualListing.step3.bedroomsInvalid` / `bathroomCountInvalid`) are already in `FIELD_ORDER_PER_STEP[3]`, so the existing scroll-to-first-error helper picks them up automatically.
- **Plan 07-05 (orchestrator wiring):** `formBagToPropertyPayload` already passes `undefined` through verbatim. The M4_* error-code discriminator in `index.tsx` submit-catch (D-10) writes into the same `errors['basics.bedrooms']` / `errors['basics.bathroomCount']` keys this plan's validators use — single mental model.

## Self-Check: PASSED

**File existence:**
- FOUND: src/components/ContextualListingFlow/types.ts (modified)
- FOUND: src/components/ContextualListingFlow/adapters.ts (modified)
- FOUND: src/components/ContextualListingFlow/validators.ts (modified)
- FOUND: src/components/ContextualListingFlow/__tests__/adapters.test.ts (modified)
- FOUND: src/components/ContextualListingFlow/__tests__/validators.test.ts (modified)

**Commit existence (worktree branch `worktree-agent-ab3f3644df98d72d9`):**
- FOUND: 3457395 — Task 1 (types.ts)
- FOUND: 926b9b4 — Task 2 (adapters.ts + adapters.test.ts)
- FOUND: c064605 — Task 3 (validators.ts + validators.test.ts)

All claims in this SUMMARY are backed by on-disk files and committed git history on the worktree branch.

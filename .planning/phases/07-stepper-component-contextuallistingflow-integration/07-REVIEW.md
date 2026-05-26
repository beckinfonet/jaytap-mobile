---
phase: 07-stepper-component-contextuallistingflow-integration
reviewed: 2026-05-26T00:09:35Z
depth: standard
files_reviewed: 12
files_reviewed_list:
  - src/components/StepperInput.tsx
  - src/components/__tests__/StepperInput.test.tsx
  - src/locales/en.ts
  - src/locales/ru.ts
  - src/components/ContextualListingFlow/types.ts
  - src/components/ContextualListingFlow/adapters.ts
  - src/components/ContextualListingFlow/validators.ts
  - src/components/ContextualListingFlow/__tests__/adapters.test.ts
  - src/components/ContextualListingFlow/__tests__/validators.test.ts
  - src/components/ContextualListingFlow/Step3BasicInfo.tsx
  - src/components/ContextualListingFlow/__tests__/Step3.test.tsx
  - src/components/ContextualListingFlow/index.tsx
findings:
  critical: 0
  warning: 4
  info: 4
  total: 8
status: issues_found
---

# Phase 7: Code Review Report

**Reviewed:** 2026-05-26T00:09:35Z
**Depth:** standard
**Files Reviewed:** 12
**Status:** issues_found

## Summary

Phase 7 ships a reusable `StepperInput` (tap-only ±, undefined-aware) and wires it into `Step3BasicInfo` for `basics.bedrooms` (apartment/house only, integer 0–10) and `basics.bathroomCount` (apartment/house/hotel/hostel/office/commercial, 0.5-step 0–10). The FormBag pipeline (`types ↔ adapters ↔ validators`) is type-coherent with the M3 nested `Property.basics` shape, EN+RU locales remain at parity (641↔641 keys, zero diff), and the KBD-02 grep gate stays clean (0 occurrences of `keyboardVerticalOffset` in `src/`). All 78 phase-touched tests pass (53 unit + 25 Step3 integration).

No BLOCKER defects. Four WARNINGs concentrate on (1) an asymmetric clamp in `StepperInput` (decrement does not clamp to `min` while increment uses `Math.min`), (2) a downstream regression surface — `PropertyCard` and `ListingMetaTable` still surface the legacy `basics.rooms` / `basics.bathroom` taxonomy and will silently NOT display the new `bedrooms` / `bathroomCount` once landlords start writing them, leaving the M3 rooms-vs-bedrooms convention (per `central-asia-rooms-vs-bedrooms-convention.md`) half-implemented at the render side, (3) the orchestrator's mid-submit `M4_BATHROOM_STEP_INVALID` handler doesn't translate `step` mismatch from server, and (4) hardcoded English accessibility verbs in `StepperInput` ("Decrease …" / "Increase …") break RU a11y. Four INFO items cover testing/code-quality observations.

## Warnings

### WR-01: `StepperInput.handleDecrement` does not clamp to `min` — asymmetric with `handleIncrement`

**File:** `src/components/StepperInput.tsx:84-88`
**Issue:** `handleDecrement` short-circuits only when `value <= min`, then performs `onChange((value as number) - step)` with no clamp. `handleIncrement` (line 96) uses `Math.min(value + step, max)`. The asymmetry creates an under-shoot path when the incoming `value` is not aligned to `step` relative to `min`. Empirically verified: with `value=0.6, min=0.5, step=0.5`, `isMinDisabled` is `false` (0.6 > 0.5) and a single tap yields `value=0.09999999999999998` (FP-drift) — below `min`. In Phase 7's actual wiring both steppers use `min=0`, so the canonical path is safe (`0.5 - 0.5 === 0`), but an edit-owner load with corrupt legacy `bathroomCount` (e.g., a value out-of-step or below the new `min`) can drift further below the floor on subsequent decrements. The validator (`validators.ts:90-97`) catches non-half-step values defensively, but only after the user has produced an even more invalid state.
**Fix:**
```tsx
const handleDecrement = (): void => {
  if (isMinDisabled) return;
  onChange(Math.max((value as number) - step, min)); // symmetric with handleIncrement's Math.min
};
```

### WR-02: Downstream renderers (`PropertyCard`, `ListingMetaTable`) do not display the new `basics.bedrooms` / `basics.bathroomCount` — silent rendering gap

**File:** `src/components/PropertyCard.tsx:284, 290-295`, `src/components/ListingMetaTable.tsx:68-69, 165, 170-174`
**Issue:** Per the memory note `central-asia-rooms-vs-bedrooms-convention.md`, `rooms` and `bedrooms` are SEPARATE counts (a "3-room apartment" = 2 bedrooms + 1 living room). Phase 7 lets landlords WRITE `basics.bedrooms` and `basics.bathroomCount` through the create/edit flow and the adapter passes them verbatim to the payload (`adapters.ts:87-88`), but the READ-side renderers were not updated in this phase:
- `PropertyCard.tsx:284` still shows only `property.basics?.hotelRooms ?? property.basics?.rooms` for the "Beds" spec chip
- `PropertyCard.tsx:290-295` still maps only `basics.bathroom` (private/shared/none type, NOT count)
- `ListingMetaTable.tsx:68-69, 165, 170-174` reads `rooms` (rendered as "Beds: 3") and `bathroom` (rendered as "Baths: Private") — never the new `bedrooms` / `bathroomCount` counts.

This is exactly the verifier-blind-spot pattern flagged in `gsd-verifier-misses-regressions.md` — Phase 7's write-side requirements pass cleanly but the downstream READ surface is half-wired. Once a landlord submits a listing with `bedrooms=2, bathroomCount=1.5`, the cards/details still render `rooms` (which the new flow no longer foregrounds in the chip UI for residential — chips still ship, but bedrooms is a NEW separate field) and the `bathroomCount` count never appears anywhere user-facing. Symptom: a listing labeled "3 rooms" in the chip + "2 bedrooms" in the stepper will render only "Beds: 3" on the card, which conflicts with the convention's whole point.

This is downstream and likely out of Phase 7 scope as planned, but it is a regression-of-meaning the verifier will not catch. Flag for M4 follow-up (display side) before any user-visible rollout of the bedrooms/bathroomCount fields.
**Fix:** Add a follow-up M4 plan to extend `PropertyCard.tsx` and `ListingMetaTable.tsx` to surface `basics.bedrooms` (label `property.beds`) and `basics.bathroomCount` (new label `property.bathCount` or similar) alongside the existing `rooms` / `bathroom` taxonomy. At minimum, document the gap in `ROADMAP.md` so M4 closes both ends of the pipe before this becomes user-visible. No code change required in Phase 7 itself.

### WR-03: `M4_BATHROOM_STEP_INVALID` and `M4_BEDROOMS_INVALID` server errors discard server-supplied context

**File:** `src/components/ContextualListingFlow/index.tsx:177-191`
**Issue:** On backend rejection with code `M4_BATHROOM_STEP_INVALID`, the orchestrator unconditionally overwrites `errors['basics.bathroomCount']` with the hardcoded i18n key `contextualListing.step3.bathroomCountInvalid` and jumps to Step 3 — but does NOT preserve any `message` field from the response body, doesn't surface a Toast/Alert, and never logs the server-supplied detail. If the server later evolves the validation (e.g., a stricter range, or a `details` field explaining which bound was violated) the client will silently render the stale generic message. The Alert fallback in the `else` branch correctly surfaces `e.message`; the two code-branches do not.

Secondary: the catch block silently swallows the navigation jump even when the user is currently on Steps 4/5/6 — they will jump back to Step 3 with no toast/banner explaining WHY they moved. Recovering UX without explanation matches the pattern flagged in `phase06-m3-carry-forward.md` (ROLE-11 mid-action 403 recovery — partial coverage).
**Fix:**
```tsx
if (code === 'M4_BEDROOMS_INVALID' || code === 'M4_BATHROOM_STEP_INVALID') {
  const field = code === 'M4_BEDROOMS_INVALID' ? 'basics.bedrooms' : 'basics.bathroomCount';
  const i18nKey = code === 'M4_BEDROOMS_INVALID'
    ? 'contextualListing.step3.bedroomsInvalid'
    : 'contextualListing.step3.bathroomCountInvalid';
  setErrors((prev) => ({ ...prev, [field]: i18nKey }));
  setCurrentStep(3);
  // Surface the jump so the user knows WHY focus moved off their submit
  Alert.alert(t('common.error'), t(i18nKey));
}
```

### WR-04: `StepperInput` ± button `accessibilityLabel` strings are hardcoded English

**File:** `src/components/StepperInput.tsx:114, 143`
**Issue:** `accessibilityLabel={`Decrease ${label}`}` and `accessibilityLabel={`Increase ${label}`}`. The `label` itself is correctly translated by the caller via `t(...)`, but the verbs "Decrease" / "Increase" are hardcoded English, so a RU user with VoiceOver/TalkBack will hear `"Decrease Спальни"` — broken bilingual phrasing. This violates the project's "EN + RU parity required for every new UI string" convention in `CLAUDE.md`.
**Fix:** Add two new keys per locale (`a11y.stepper.decrease` / `a11y.stepper.increase` with `{label}` interpolation) and call them at render time:
```tsx
accessibilityLabel={t('a11y.stepper.decrease', { label })}
// en.ts: 'a11y.stepper.decrease': 'Decrease {label}',
// ru.ts: 'a11y.stepper.decrease': 'Уменьшить {label}',
```

## Info

### IN-01: `void emptyFormBag` in `index.tsx` is dead/load-bearing-only code

**File:** `src/components/ContextualListingFlow/index.tsx:62`
**Issue:** `void emptyFormBag;` paired with the comment "Keep an `_unused` reference so emptyFormBag is reachable for downstream plans" is a no-op at runtime. `emptyFormBag` is exported from `validators.ts` and consumed directly by tests + adapters — the `void` reference here is not what makes it reachable. Either the import line at the top of `index.tsx` is sufficient (it is), in which case the `void` line should be deleted, or the import was added only to satisfy this void — pick one.
**Fix:** Delete line 62 and remove `emptyFormBag` from the import on line 34 if `index.tsx` does not consume it directly (it currently doesn't).

### IN-02: `Step3.test.tsx` uses non-canonical `findAllByType('Text' as unknown as React.ComponentType)` walk

**File:** `src/components/ContextualListingFlow/__tests__/Step3.test.tsx:346`
**Issue:** The other test in this phase (`StepperInput.test.tsx:144, 154`) uses the canonical RTR pattern `findAll((n) => n.type === 'Text')` for host-element walks. Step3.test.tsx instead uses `findAllByType('Text' as unknown as React.ComponentType)`. The `as unknown as` double-cast is a code smell that signals fighting the type system; it works at runtime (RTR's `findAllByType` uses `Object.is` so the string `'Text'` does match host instances) but the cast is confusing and inconsistent with the sibling test.
**Fix:** Align with the sibling pattern:
```tsx
const errorTexts = root.findAll((n) => n.type === 'Text' && n.props.children === 'contextualListing.step3.bedroomsInvalid');
expect(errorTexts.length).toBeGreaterThan(0);
```

### IN-03: Step3 D-12.4 "belt-and-suspenders" assertion only checks `!== 0`, not `!== ''` or `!== null` as the comment claims

**File:** `src/components/ContextualListingFlow/__tests__/Step3.test.tsx:306-308`
**Issue:** The test comment says "Belt-and-suspenders: not coerced to 0 or '' or null" but the assertions only check `not.toBe(0)`. `undefined !== 0` is trivially true and tells you nothing the prior `toBeUndefined()` didn't. To genuinely lock the no-coercion invariant, also check the falsy-but-not-undefined paths the comment mentions.
**Fix:**
```tsx
expect(payload.basics.bedrooms).toBeUndefined();
expect(payload.basics.bedrooms).not.toBe(0);
expect(payload.basics.bedrooms).not.toBe(null);
expect(payload.basics.bedrooms).not.toBe('');
```

### IN-04: `formBagToPropertyPayload` returns `Record<string, unknown>`, weakening downstream type safety

**File:** `src/components/ContextualListingFlow/adapters.ts:68`
**Issue:** The return type `Record<string, unknown>` forces every consumer (including the orchestrator's `payload` variable on `index.tsx:134`) to cast to use any field. The payload shape is well-defined (it IS the M3 nested `Property` minus `id`/`status`/`media`); declaring it as `Partial<Property>` or a dedicated `PropertyPayload` type would let TS catch downstream shape drift (e.g., if someone renames `basics.bedrooms`, the consumers would not type-check). Pre-existing decision (Phase 2), not Phase 7 regression — but Phase 7 added two more `unknown` leaves (`basics.bedrooms` / `basics.bathroomCount`) that downstream consumers cannot type-narrow without casting.
**Fix:** Introduce a `PropertyPayload = Omit<Property, 'id' | 'status' | 'media'>` (or similar) and have `formBagToPropertyPayload` return it. Out of strict scope for Phase 7 but worth flagging.

---

_Reviewed: 2026-05-26T00:09:35Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_

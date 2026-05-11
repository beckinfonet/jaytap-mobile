---
phase: 02-6-step-contextual-listing-flow-client
reviewed: 2026-05-06T00:00:00Z
depth: standard
files_reviewed: 39
files_reviewed_list:
  - App.tsx
  - src/components/ContextualListingFlow/index.tsx
  - src/components/ContextualListingFlow/Step1DealAndPropertyType.tsx
  - src/components/ContextualListingFlow/Step2Location.tsx
  - src/components/ContextualListingFlow/Step3BasicInfo.tsx
  - src/components/ContextualListingFlow/Step4ConditionAmenities.tsx
  - src/components/ContextualListingFlow/Step5TitleDescription.tsx
  - src/components/ContextualListingFlow/Step6DealConditions.tsx
  - src/components/ContextualListingFlow/adapters.ts
  - src/components/ContextualListingFlow/validators.ts
  - src/components/ContextualListingFlow/types.ts
  - src/components/ContextualListingFlow/styles.ts
  - src/services/locationService.ts
  - src/screens/PropertyDetailsScreen.tsx
  - src/screens/HomeScreen.tsx
  - src/screens/FavoritesScreen.tsx
  - src/screens/RenterListingsScreen.tsx
  - src/screens/OwnerListingsScreen.tsx
  - src/screens/ModerationQueueScreen.tsx
  - src/screens/AdminVerificationScreen.tsx
  - src/components/PropertyCard.tsx
  - src/components/HospitalityCard.tsx
  - src/components/ListingMetaTable.tsx
  - src/components/PropertyMap.tsx
  - src/utils/formatPrice.ts
  - src/locales/en.ts
  - src/locales/ru.ts
  - scripts/check-create-listing-screen-removed.sh
  - package.json
  - src/components/ContextualListingFlow/__tests__/Step1.test.tsx
  - src/components/ContextualListingFlow/__tests__/Step2.test.tsx
  - src/components/ContextualListingFlow/__tests__/Step3.test.tsx
  - src/components/ContextualListingFlow/__tests__/Step4.test.tsx
  - src/components/ContextualListingFlow/__tests__/Step5.test.tsx
  - src/components/ContextualListingFlow/__tests__/Step6.test.tsx
  - src/components/ContextualListingFlow/__tests__/adapters.test.ts
  - src/components/ContextualListingFlow/__tests__/integration.test.tsx
  - src/components/ContextualListingFlow/__tests__/validators.test.ts
findings:
  critical: 0
  warning: 5
  info: 7
  total: 12
status: issues_found
---

# Phase 02: Code Review Report

**Reviewed:** 2026-05-06T00:00:00Z
**Depth:** standard
**Files Reviewed:** 39
**Status:** issues_found

## Summary

Phase 02 ships a 6-step contextual listing flow (`ContextualListingFlow`) that
replaces the legacy `CreateListingScreen` + `CreateListingForm/` barrel. The
implementation is well-structured: the orchestrator owns step state and Android
hardware back, Step1–Step6 are pure `SectionProps` consumers, validators are
pure functions with thorough test coverage, and adapters are round-trip safe.
The atomic-deletion sentinel (`scripts/check-create-listing-screen-removed.sh`)
passes — no leftover imports of the deleted screen/barrel, and the only
remaining `createListing.*` translation keys (`createListing.cancel`,
`createListing.updateFailed`) are intentionally preserved for the new
`AdminVerificationScreen`. en/ru locales are at full parity (112
`contextualListing.*` keys each, no missing translations).

The user's flagged concerns — App.tsx mode dispatch, Step orchestrator
race/stale-closure, locationService anti-spoof discipline, PropertyDetailsScreen
nested-shape null-safety, Step2 dual map-pin code paths, i18n parity — were
investigated. **No critical regressions found in those areas.** The dispatch
ladder in App.tsx is sound (mode discriminator falls through cleanly:
moderator+toEdit → 'edit-mod', toEdit → 'edit-owner', else → 'create'),
locationService correctly omits `createdByUid` from POST bodies (server sources
from JWKS-verified `req.firebaseUid`), and the dual map-pin paths
(`handleMapPress` + `handleMarkerDragEnd`) both write through the same nested
`location.coordinates` write site.

The 5 Warning-level findings are all real issues that could surface in
production but none are crash-class:

- **WR-01** (Step6 throw on basics.currency='' is a developer-assertion that becomes a user-visible crash on a Step3 validator regression).
- **WR-02** (BackHandler in orchestrator can race with App.tsx during admin verification mode transition — back-button intent ambiguous mid-transition).
- **WR-03** (locationService 409 city/district fallback returns `status: 409` typed as `201 | 200 | 409` literal but the `createCity` return type only declares `201 | 200`).
- **WR-04** (PropertyDetailsScreen `.basics?.areaSqm` rendered as raw value can be a number OR a string — pre-cutover legacy listings may have it as string; renders 'm²' suffix gracefully but other consumers may break).
- **WR-05** (App.tsx Android back-handler at line 326–337 has a code path that returns `false` while the orchestrator has already mounted its own BackHandler — both fire, but only the orchestrator consumes; harmless today but fragile to future refactors).

## Critical Issues

_None — no security vulnerabilities, no crashes from null-deref on the reviewed
data flows, no auth bypasses. The atomic-deletion sentinel passes._

## Warnings

### WR-01: `Step6DealConditions` throws synchronously when `basics.currency` is empty during deposit edit

**File:** `src/components/ContextualListingFlow/Step6DealConditions.tsx:184-188`
**Issue:** Inside the `deposit-amount` `onChangeText` handler the code throws a
plain `Error` if `values.basics.currency` is empty:

```tsx
if (!values.basics.currency) {
  throw new Error(
    'Step 6 deposit fallback unreachable: basics.currency is empty (Step 3 validator gate broken).',
  );
}
```

This is documented as a "planner-level bug" assertion guarded by Step 3's W-01
sentinel validator. In practice the assumption holds — `validateStep(3)` rejects
`currency===''` before the user ever reaches Step 6. However:

1. If a future regression in the validator (or a new entry path that mounts Step
   6 without going through Step 3, e.g. an "edit-mod" hop that hydrates a
   legacy `Property` with `basics.currency` missing) triggers this path, the
   throw becomes an unhandled exception during a `TextInput.onChangeText` call
   — React Native renders a Red Box on dev and a JS error / app crash on
   production.
2. The integration test `INT-3` at `__tests__/integration.test.tsx:362-418`
   already constructs an `initialListing` with `basics.currency: 'KGS'`, so the
   path is never exercised in tests. A legacy listing with a missing or `''`
   currency (Phase 1 Atlas migration is NOT yet deployed per the prompt — old
   M2 documents may exist) would mount Step 6 in 'edit-owner' mode with the
   empty sentinel and crash on the first deposit-amount keystroke.

**Fix:** Replace the throw with a graceful fallback (default to `'KGS'` and
optionally surface a non-fatal Alert to nudge the user back to Step 3):

```tsx
if (!values.basics.currency) {
  // Should be unreachable per Step 3 W-01 sentinel, but if it ever fires we
  // surface a soft fallback rather than crash mid-keystroke.
  console.warn('[Step6] basics.currency missing; falling back to KGS');
  setTerms({ deposit: { amount: cleaned, currency: 'KGS' } });
  return;
}
const depositCurrency: DepositCur =
  values.terms.deposit?.currency ?? (values.basics.currency as DepositCur);
setTerms({ deposit: { amount: cleaned, currency: depositCurrency } });
```

### WR-02: Dual `BackHandler` registration during admin-verification mode transition is fragile

**File:** `App.tsx:326-337` and `src/components/ContextualListingFlow/index.tsx:184-194`
**Issue:** When the user enters admin verification mode (via
`onAdminVerifyDocuments`), App.tsx sets
`isContextualListingFlowOpen=true` AND `isAdminVerificationMode=true` in the
same render. The render then mounts `AdminVerificationScreen` (lines 1001–1031,
NOT the `ContextualListingFlow` orchestrator) — so the orchestrator's
`useEffect` BackHandler at `index.tsx:184` never registers. App.tsx's
back-handler at `App.tsx:326-337` runs:

```tsx
if (isContextualListingFlowOpen) {
  if (!isAdminVerificationMode) {
    return false; // orchestrator owns it
  }
  setIsContextualListingFlowOpen(false);
  setPropertyToEdit(null);
  setIsAdminVerificationMode(false);
  return true;
}
```

This is correct under steady state. But during a mode flip (e.g. moderator
toggles `isAdminVerificationMode` mid-flow, which doesn't happen today but is
not prevented by types), the conditional `return false;` falls through to the
main stack while the orchestrator may not yet have mounted, leaving the
hardware back button as a no-op for one render cycle.

**Fix:** Defensive — encode an invariant. The flip from non-admin to admin
mode (or vice versa) should always close the overlay first. Add a comment +
assertion at the App.tsx mode-toggle sites, or fold the dispatch into a
useReducer so flips are atomic:

```tsx
// Invariant: isAdminVerificationMode and ContextualListingFlow.mode never
// flip while isContextualListingFlowOpen is already true. All entry points
// (onAdminVerifyDocuments, onProfileCreateListing, onEditListing, etc.) set
// these flags BEFORE setIsContextualListingFlowOpen(true), and reset them on
// close. Adding a new entry point? Verify it sets the discriminator first.
```

Alternatively, gate the orchestrator's `BackHandler.addEventListener` on a
deferred flag (e.g. `useEffect` waits one tick) so the handler is always
present when needed.

### WR-03: `createCity` / `createDistrict` typed return `status: 201 | 200 | 409` but TS infers narrower union from try-block return

**File:** `src/services/locationService.ts:57-94`
**Issue:** Both `createCity` and `createDistrict` are declared to return
`Promise<{ city: City; status: 201 | 200 | 409 }>` but the try-block returns
`{ status: r.status as 201 | 200 }` and the catch-block returns
`{ status: 409 }`. The cast `r.status as 201 | 200` is a runtime no-op — the
backend can return any HTTP status code, and the function will happily forward
e.g. 422 (validation error) as the literal `200 | 201`. This will lie to
`Step2Location.tsx:194` which doesn't currently switch on `status` but is
documented (in the JSDoc) as receiving "201 created / 200 existing-approved /
409 pending-duplicate".

**Fix:** Discriminate at runtime, not just at the type level:

```tsx
try {
  const r = await apiClient.post<{ city: City }>('/locations/cities', input);
  if (r.status === 200 || r.status === 201) {
    return { city: r.data.city, status: r.status };
  }
  // Server returned an unexpected success code (2xx but not 200/201) — treat
  // as a soft warning and let the caller decide.
  throw new Error(`Unexpected status ${r.status} from POST /locations/cities`);
} catch (e: unknown) {
  // ... existing 409 handling
}
```

Or — if the server is verified to only ever return 200/201/409 — at minimum
remove the `as` cast and let the broader type bleed up so callers know they're
trusting the server contract.

### WR-04: `ListingMetaTable` renders `areaSqm` and `prepaymentMonths` raw, but their types in `Property` are nominally numeric while `propertyToFormBag` round-trips them as strings

**File:** `src/components/ListingMetaTable.tsx:177-181, 202-206`
**Issue:** The extras grid renders `{areaSqm} m²` and `{prepaymentMonths}`
directly in `<Text>`. React Native's `<Text>` accepts both `number` and `string`
children, so this works at runtime. However:

- The Phase 1 Atlas migration (per prompt: "NOT yet deployed; old documents may
  still exist on first run after the cutover") may not have canonicalized
  `basics.areaSqm` to numeric — pre-cutover documents may have it as a string
  like `"80 m²"` (with embedded units), which would render as `"80 m² m²"`
  (double-suffix UI bug).
- `propertyToFormBag` at `adapters.ts:28` accepts `number | string`, but
  `formBagToPropertyPayload` at `adapters.ts:77` always emits `parseFloat()` —
  so any post-edit save normalizes. The first-render-of-legacy-data path is the
  vulnerable one.

**Fix:** Coerce at the read site to defend against the pre-cutover shape:

```tsx
{areaSqm != null && (
  <Text style={[styles.extraText, { color: colors.text, fontSize: valueSize }]}>
    {/* Strip any embedded unit before re-suffixing */}
    {String(areaSqm).replace(/\s*m²?\s*$/i, '')} m²
  </Text>
)}
```

Same defense applies to `prepaymentMonths` (could be a string in legacy data).
Optional but recommended — matches the defensive coalesce pattern already used
in HomeScreen + RenterListings (`status ?? 'live'`).

### WR-05: Step6 deposit currency selector is `disabled` based on `deposit.amount` but stays mounted — looks active in dark mode

**File:** `src/components/ContextualListingFlow/Step6DealConditions.tsx:206-247`
**Issue:** The deposit currency chips are `disabled={!values.terms.deposit?.amount}`
but the visual style does not change when disabled (no `opacity` reduction, no
different `backgroundColor`). On a dark background, a disabled chip renders
visually identical to an inactive-but-tappable chip — users can tap it and
nothing happens. The chip group should reflect its disabled state visually.

**Fix:**

```tsx
disabled={!values.terms.deposit?.amount}
style={[
  commonStyles.chip,
  {
    backgroundColor: isActive ? colors.activeChipBackground : isDark ? '#2C2C2E' : '#F2F2F7',
    borderColor: isDark ? '#3A3A3C' : '#E5E5EA',
    opacity: !values.terms.deposit?.amount ? 0.4 : 1,
  },
]}
```

Or — semantically better — only render the currency selector once the user has
entered an amount (mount it inline below the deposit input).

## Info

### IN-01: Orphan locale keys never referenced in code

**File:** `src/locales/en.ts:613, 618` and `src/locales/ru.ts:615, 620`
**Issue:** Two locale keys are defined in both en/ru but never consumed by any
source file:

- `contextualListing.step2.cityOther.countryLabel` ("Country" / "Страна")
- `contextualListing.step2.cityOther.success` ("City submitted for approval. You can use it for this listing now." / equivalent)

`Step2Location.tsx` uses `cityOther.country.${c}` for the country chips but no
"Country" header label, and never displays the success toast on optimistic
city creation (just closes the modal silently — see `submitOther` at lines
220–221). The `success` key was likely intended for a confirmation Alert that
was scoped out per D-07 optimistic-use UX.

**Fix:** Either consume them (add a "Country" section label above the country
chip row + a success Alert after `createCity` resolves) or delete them as dead
keys. Option A is the better UX; Option B is the simpler diff.

### IN-02: `propertyCategory.ts` and `hospitalityAmenities.ts` JSDoc still references deleted `CreateListingForm` paths

**File:** `src/utils/propertyCategory.ts:6` and `src/utils/hospitalityAmenities.ts:8-11`
**Issue:** The JSDoc comments in these utility modules still reference
`CreateListingScreen`, `CreateListingForm/HospitalitySection.tsx`,
`CreateListingForm/validators.ts` as consumers — but those files were atomically
deleted in Plan 02-09. The atomic-deletion sentinel only checks for `import` /
`require` / `from '...CreateListingScreen'` patterns, not bare comment text, so
these slip through.

**Fix:** Update the JSDoc to reference the new consumers
(`ContextualListingFlow/Step3BasicInfo.tsx`, etc.) so future readers don't
chase deleted files:

```ts
/**
 * Consumers: ContextualListingFlow/Step1DealAndPropertyType chip UI,
 * Phase 5 ROLE-04 'manageListings' role gate, ...
 */
```

### IN-03: Step6 `useEffect([])` with eslint-disable defaults deposit currency only on mount

**File:** `src/components/ContextualListingFlow/Step6DealConditions.tsx:88-105`
**Issue:** The mount effect that defaults `deposit.currency` to
`basics.currency` runs once with `eslint-disable react-hooks/exhaustive-deps`.
If the user navigates back to Step 3, changes currency from KGS to USD, then
forward to Step 6 again, the effect will NOT re-run (component is not
remounted because the orchestrator memoizes via `useMemo`-renderless step
switching, but actually re-mounts on each `currentStep` change because
`stepBody` returns a freshly-constructed JSX tree — let me re-verify). Looking
at `index.tsx:196-211`, `stepBody` is a `useMemo` over the step value, so the
component DOES re-mount on each step transition, which means the effect re-runs
and the latest `basics.currency` is captured. Safe today but the comment
"first render only" is misleading — the effect runs on EVERY remount.

**Fix:** Either accept the deps and re-default on every change, or document
that the component remounts per step:

```tsx
// NOTE: Step6 component re-mounts on every step transition (orchestrator's
// stepBody is a useMemo over currentStep, returning a fresh JSX subtree). So
// this empty-deps effect actually fires on every visit to Step 6 — pulling in
// the latest values.basics.currency at mount time. Renaming the comment to
// reflect remount semantics, not "first render only."
```

### IN-04: `formatPrice` legacy fallback paths still active — no deprecation warning

**File:** `src/utils/formatPrice.ts:17, 23, 37`
**Issue:** Three `(p as any).price` / `(p as any).currency` / `(p as any).period`
fallbacks support legacy M2 listings. Phase 1's Atlas migration is "NOT yet
deployed" per the prompt, so these are correctly retained. Once the migration
ships and the post-migration audit confirms no flat-shape rows remain, these
fallbacks should be deleted (and any test that depends on flat shape reworked).

**Fix:** Add a tracking `// TODO(M3 post-Phase-1-migration)` comment so the cleanup is
findable:

```ts
// TODO(M3 post-Phase-1-migration): drop the flat-shape `(p as any).price` /
// `(p as any).currency` / `(p as any).period` fallbacks after the Atlas
// migration ships and a post-migration audit confirms zero flat-shape rows.
```

### IN-05: Hardcoded `BISHKEK_DEFAULT` city centroid in Step2 — KG-only assumption

**File:** `src/components/ContextualListingFlow/Step2Location.tsx:46`
**Issue:** The `BISHKEK_DEFAULT` constant is used as both (a) the map's
`initialRegion` when no city is selected (line 416) and (b) the centroid
fallback for "Other" city submissions when the user hasn't dropped a pin (line
200). Per project memory ("Geographic scope is KG/KZ/UZ — not Bishkek-only"),
a renter in Almaty submitting a new "Other" city without dropping a pin would
get their city centroid set to Bishkek, which the moderator would have to
correct on approval. Out-of-scope for v1 per the comment, but worth flagging.

**Fix:** When the user is submitting an "Other" city in country=KZ or country=UZ
without a pin, default to the country's capital instead. Or — better — refuse
to submit a city without coordinates (force the user to drop a pin first):

```tsx
if (otherModal.kind === 'city' && !values.location.coordinates) {
  Alert.alert(t('common.error'), t('contextualListing.step2.coordinatesRequired'));
  return;
}
```

### IN-06: `App.tsx` LOC creep is real — file is now 1297 lines (was ~1213 pre-Phase-2)

**File:** `App.tsx:1-1297`
**Issue:** Per the prompt, App.tsx is +84 over the R7 budget. The orchestrator
state-machine pattern is intentional (per CLAUDE.md: "no `react-navigation`,
no navigation library migration in scope"), but the file now has 27 distinct
`useState` calls + a 130-line `BackHandler` `useEffect` with 28 dependencies.
The single-overlay flag pattern (`isContextualListingFlowOpen` +
`isAdminVerificationMode` discriminator) is a smart compression but the
back-handler dependency array (lines 406–433) is a known smell — any new
overlay added without remembering to add its flag to the deps will silently
break hardware back.

**Fix:** Out of scope for this phase, but the file is approaching the "extract a
hook" threshold. Candidate: a custom `useAppOverlayBackStack()` hook that owns
the entire ladder of overlay flags + their priority order. Track for M4.

### IN-07: Test files use `key: string` cast in mock `t()` returning the key — masks i18n key typos

**File:** All `__tests__/*.test.tsx` mocks at `useLanguage`
**Issue:** Every step test mocks `useLanguage()` with `t: (key: string) => key`,
which means a typo in a test's `t('contextualListing.foo')` call would not
fail the test (the key is just rendered verbatim). The `TranslationKeys` type
guard catches these at compile time IF the test files import the type, but
they currently use `as TranslationKeys` casts which silence the check.

**Fix:** When asserting against translated copy in tests, prefer `findByProps({
testID })` for structural assertions and reserve key-string assertions for
the integration test where the morph is the explicit thing under test (already
done in `INT-3`). Existing tests are fine — flag for future test additions.

---

_Reviewed: 2026-05-06T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_

---
phase: 11-listing-address-geocode
reviewed: 2026-05-26T00:00:00Z
depth: standard
files_reviewed: 17
files_reviewed_list:
  - src/components/ContextualListingFlow/Step2Location.tsx
  - src/components/ContextualListingFlow/index.tsx
  - src/components/ContextualListingFlow/adapters.ts
  - src/components/ContextualListingFlow/types.ts
  - src/components/ContextualListingFlow/validators.ts
  - src/components/ContextualListingFlow/__tests__/Step2.test.tsx
  - src/components/ContextualListingFlow/__tests__/adapters.test.ts
  - src/components/ContextualListingFlow/__tests__/integration.test.tsx
  - src/components/ContextualListingFlow/__tests__/validators.test.ts
  - src/components/HospitalityCard.tsx
  - src/components/PropertyCard.tsx
  - src/locales/en.ts
  - src/locales/ru.ts
  - src/screens/PropertyDetailsScreen.tsx
  - src/services/geocodeService.ts
  - src/types/Property.ts
  - backend-services/JayTap-services/src/models/Property.js
  - backend-services/JayTap-services/src/utils/geocoder.js
  - backend-services/JayTap-services/src/routes/locationRoutes.js
  - backend-services/JayTap-services/src/__tests__/geocoder.test.js
  - backend-services/JayTap-services/src/__tests__/locationRoutes.test.js
  - backend-services/JayTap-services/src/__tests__/Property.test.js
  - backend-services/JayTap-services/jest.config.cjs
findings:
  critical: 3
  warning: 7
  info: 5
  total: 15
status: issues_found
---

# Phase 11: Code Review Report

**Reviewed:** 2026-05-26
**Depth:** standard
**Files Reviewed:** 17 (10 RN client + 7 backend)
**Status:** issues_found

## Summary

Phase 11 wires forward + reverse geocoding end-to-end across two repos. Backend hardening
(`geocoder.js` 5s AbortController, `countrycodes=kg,kz,uz`, viewbox bias from server-resolved
**approved**-only City) is solid: defenses against the historical "random pin" and the
documented 15s axios-hang regression are well-implemented, with good test coverage. The
Mongoose schema addition (`location.address`, default '', trim, maxlength 200) flows
cleanly through the existing NESTED_SUBTREES deep-merge on both `propertyRoutes.js` and
`moderationRoutes.js`, no allowlist edits needed.

The **client-side** Step 2 wiring has correctness defects that the existing test suite
does not catch. **Three CRITICAL findings** concern stale-closure races in
`scheduleGeocode` / `handleMapPress` / `handleMarkerDragEnd` that can silently revert
user input (city/district/coordinates picked between a debounce-fire and the network
response are overwritten) and the known T-11-18 typed-text clobber race that is NOT
text-guarded in the forward path (only the reverse path has the empty-string guard).
**One CRITICAL** finding flags the complete absence of new-UI coverage in
`Step2.test.tsx`: the geocodeService mock that was added to silence noise during the
existing pin tests does not exercise any GEO-01/02 behavior — the debounce, success,
failure, anti-clobber, and anti-random-pin paths all ship untested.

Warnings cover the unsafe `as any` casts in the geocode service error handlers, the
`{ position: 'relative' }` style on a RN View (no-op on Android but harmless on iOS —
flagging because the spinner positioning depends on it), the PII leak risk if the
backend `console.warn` log call slices an address into the logger, and a handful of
i18n / TranslationKeys-cast smells where the lock-in (`as TranslationKeys`) was left in
Step2Location.tsx despite the keys having landed in both locales.

No new security vulnerabilities introduced. The auth/capability gate on both new routes
is correct (`verifyFirebaseToken` + `requireListingCapability` matches the existing
`/cities` POST). T-11-07 (attacker self-approves a pending city to bias geocode to
Moscow) is correctly defended at `locationRoutes.js:169` with the `status: 'approved'`
filter — and there is even a dedicated test for it (Test 8b).

## Critical Issues

### CR-01: `scheduleGeocode` stale closure clobbers user-pinned coordinates

**File:** `src/components/ContextualListingFlow/Step2Location.tsx:181-213`
**Issue:** `scheduleGeocode` captures `values.location` in the `useCallback` closure. When
the 300ms `setTimeout` fires AFTER `await geocodeAddress(...)` resolves, the callback
writes:

```ts
onChange('location', {
  ...values.location,              // <-- STALE closure snapshot
  address: result.displayName,
  coordinates: { lat: result.lat, lng: result.lng },
});
```

If the user dropped a pin (or dragged the marker, or changed city/district) **between**
the keystroke that triggered the debounce and the network response, that newer mutation
is silently reverted by the stale `...values.location` spread. The `useCallback` dep
array does include `values.location`, so the function identity refreshes — but the
already-scheduled timer keeps the old closure. Concrete repro:

1. User types "Manas 100" → 300ms debounce arms with `values.location = { city: '', coords: null, ... }`.
2. Within the 300ms window the user picks city "bishkek" → `values.location.city = 'bishkek'`.
3. Timer fires, `await` resolves, callback writes `{ ...{city:''}, address:'...', coordinates:{...} }`.
4. City selection is wiped.

**Fix:** Lift `values.location` reads from the closure to a ref that always points at
latest. Sketch:

```ts
const valuesRef = useRef(values);
useEffect(() => { valuesRef.current = values; });

// inside the setTimeout callback:
const current = valuesRef.current.location;
onChange('location', {
  ...current,
  address: result.displayName,
  coordinates: { lat: result.lat, lng: result.lng },
});
```

Apply the same pattern to `handleMapPress` and `handleMarkerDragEnd` (see CR-02).

---

### CR-02: `handleMapPress` / `handleMarkerDragEnd` reverse-geocode `.then` uses stale `values.location` for anti-clobber guard AND payload spread

**File:** `src/components/ContextualListingFlow/Step2Location.tsx:216-264`
**Issue:** Both pin handlers wire reverse-geocode the same way:

```ts
reverseGeocode({ lat, lng, lang: language as 'en' | 'ru' }).then((r) => {
  if (r && r.displayName && !(values.location.address ?? '').trim()) {  // <-- stale
    onChange('location', {
      ...values.location,                                                // <-- stale
      coordinates: { lat, lng },
      address: r.displayName,
    });
    setAddressInput(r.displayName);
  }
});
```

Two consequences:

1. **Anti-clobber guard is racy.** The check `!(values.location.address ?? '').trim()`
   reads the snapshot at the time the callback was built. If the user typed an address
   into the TextInput AFTER pin drop but BEFORE reverse-geocode resolved (~1–5s on
   Nominatim), this stale read still sees the address empty and overwrites the typed
   text. The cross-repo notes call this out as T-11-18 residual that "should be
   bounded by current text guard before write" — it isn't.
2. **Same coordinate-revert problem as CR-01.** If the user drags the marker a second
   time before the first reverse-geocode completes, the spread `...values.location` in
   the slow handler writes back the OLD coordinates. The newer drag is reverted.

**Fix:** Use the `valuesRef` pattern from CR-01 for both the guard and the spread:

```ts
reverseGeocode({ lat, lng, lang: language as 'en' | 'ru' }).then((r) => {
  const latest = valuesRef.current.location;
  if (r && r.displayName && !(latest.address ?? '').trim()) {
    onChange('location', {
      ...latest,
      coordinates: latest.coordinates ?? { lat, lng },  // don't clobber a newer drag
      address: r.displayName,
    });
    setAddressInput(r.displayName);
  }
});
```

Note that even keeping the `lat,lng` from the *original* drop in the payload is wrong
when a newer drag superseded it — use `latest.coordinates` if non-null.

---

### CR-03: No tests for any Phase 11 GEO-01 / GEO-02 client behavior

**File:** `src/components/ContextualListingFlow/__tests__/Step2.test.tsx` (entire file)
**Issue:** The geocodeService mock added at lines 81–84 stubs both helpers to
`mockResolvedValue(null)` purely to silence Railway POST noise from the EXISTING pin
tests. There is **zero direct coverage** of the new Phase 11 UI surface:

- No test that `step2-address-input-section` renders when `showExactAddress === true`.
- No test that the input is hidden when `showExactAddress === false` and not hospitality.
- No test that the input is FORCE-rendered for `propertyType === 'hotel' | 'hostel'`.
- No test that `onChangeText` calls `scheduleGeocode` (and that the timer fires).
- No test that a successful `geocodeAddress` result writes `address` AND `coordinates`
  to the FormBag.
- No test that a failed `geocodeAddress` (null) preserves the typed text AND keeps the
  pin static (the anti-"random pin" defense layer 3 — the single most important
  invariant of this entire phase).
- No test that the `step2-address-not-found-error` label renders on null.
- No test that the `step2-address-geocoding-spinner` renders during loading.
- No test that reverse-geocode on pin drop populates an EMPTY address and leaves a
  NON-EMPTY address untouched (the anti-clobber guard semantics).

Given that CR-01 and CR-02 describe silent state corruption with no UI signal, the
absence of tests means future refactors will trip the same races without detection.

**Fix:** Add at minimum the following six tests to `Step2.test.tsx`:

```tsx
// G1: address input hidden when toggle off + not hospitality
// G2: address input visible when toggle on
// G3: address input force-visible for propertyType='hotel'
// G4: typing fires scheduleGeocode after 300ms (use jest.useFakeTimers + advanceTimersByTime)
// G5: successful geocode writes BOTH address and coordinates; clobber check
// G6: null geocode renders the not-found error AND does NOT call onChange (pin static)
// G7: pin drop reverse-geocode fills empty address; does NOT clobber non-empty address
```

`jest.useFakeTimers()` + `jest.advanceTimersByTime(300)` is the standard pattern; an
example is already in `geocoder.test.js:154-172` (AbortController abort test).

---

## Warnings

### WR-01: `console.warn` in geocoder includes raw user address (potential PII / log-injection)

**File:** `backend-services/JayTap-services/src/utils/geocoder.js:97, 106, 118`
**Issue:** Three `console.warn` calls embed the user-typed address into the log line:

```js
console.warn('Geocoding: no results for address:', String(address).slice(0, 200));
console.warn('Geocoding: invalid lat/lon for address:', String(address).slice(0, 200));
console.warn('Geocoding aborted (5s timeout) for:', String(address).slice(0, 200));
```

Two concerns:
1. **PII / privacy:** Listing addresses are user-typed strings (real residential
   addresses for KG/KZ/UZ landlords). They will be persisted in Railway / Render
   logs indefinitely, accessible to any operator with log-read access. The
   `geocodeService.ts:68` client wrapper explicitly avoids logging the address for
   exactly this reason ("T-11-19: no PII in logs"); the server should match.
2. **Log injection:** Although Node's `console.warn` does not interpret control
   chars, log aggregation tools (Datadog, Loggly, Sentry) sometimes do. A user
   typing `"foo\n[ERROR] FAKE: payment_failed"` could splice a forged log line.

**Fix:** Log a hash, length, or just `'<redacted>'` instead of the raw address. Or
omit the address from the line entirely — the request-id / trace-id (if any) is
enough to correlate with the route log:

```js
console.warn('Geocoding: no results (address length:', String(address).length, ')');
```

---

### WR-02: `as any` casts on caught errors swallow type safety

**File:** `src/services/geocodeService.ts:65, 92`
**Issue:**

```ts
} catch (err: any) {
  console.warn('geocodeAddress failed:', err?.response?.status ?? err?.message ?? 'unknown');
  return null;
}
```

The project's CLAUDE.md and convention notes prefer typed error handling. `err: any`
defeats the M3-baseline TS gain. `unknown` + a narrow check is correct:

**Fix:**

```ts
} catch (err: unknown) {
  const status =
    (err as { response?: { status?: number } })?.response?.status ??
    (err as { message?: string })?.message ??
    'unknown';
  console.warn('geocodeAddress failed:', status);
  return null;
}
```

---

### WR-03: `TranslationKeys` casts left in Step2Location after Plan 11-05 landed the keys

**File:** `src/components/ContextualListingFlow/Step2Location.tsx:562-609`
**Issue:** Four `t('contextualListing.step2.addressXxx' as TranslationKeys)` casts ship
in the final code with `TODO(11-05): remove cast once keys land in TranslationKeys
union` comments. The keys DID land in Plan 11-05 (`en.ts:676-679`, `ru.ts:678-681`).
The casts are now stale TODOs masking a real type that already supports the literals.

**Fix:** Remove the four `as TranslationKeys` casts and the four TODO comments. Verify
`yarn tsc --noEmit` does not surface new errors (it should not — keys are in both
locale files, which generate the `TranslationKeys` union).

---

### WR-04: Address input `autoCapitalize="words"` will corrupt RU-locale street names

**File:** `src/components/ContextualListingFlow/Step2Location.tsx:586`
**Issue:** `autoCapitalize="words"` Title-Cases every word the user types. For Russian
addresses ("ул. Манаса 100"), this yields "Ул. Манаса 100" — the abbreviation `ул.` is
lowercased by convention and Title-Casing changes meaning slightly. More importantly,
many Cyrillic addresses contain conventional lowercase particles ("им. Ленина", "д. 5
кв. 7") that get mangled.

**Fix:** Use `autoCapitalize="sentences"` (capitalizes first letter only) or
`autoCapitalize="none"` — let Nominatim's `display_name` canonicalize on success.
Match the existing `other-input-ru` TextInput pattern in the same file (line 643) which
sets no autoCapitalize prop at all.

---

### WR-05: `{ position: 'relative' }` on RN `<View>` is a no-op on Android (spinner positioning fragile)

**File:** `src/components/ContextualListingFlow/Step2Location.tsx:565`
**Issue:** RN's Yoga layout does NOT honor `position: 'relative'` on `<View>` — only
`'absolute'` has effect. The spinner at line 588 uses `position: 'absolute', right:
12, top: 12` which is fine ON ITS OWN because Yoga's absolute positioning is relative
to the nearest ancestor that has any non-default position. But that ancestor will be
the next parent up that creates a layout boundary — not necessarily the wrapping View.
This is order-of-magnitude lucky-working on iOS; on Android it may anchor to the
KeyboardAwareScrollView's content box, placing the spinner in the wrong place.

**Fix:** Drop the `position: 'relative'`. To anchor the spinner to the TextInput,
wrap the `<TextInput>` and the spinner in a `<View>` and rely on Yoga's default —
absolute children with `right/top` positioning anchor to the nearest non-static
ancestor. If you want belt-and-suspenders, set the wrapper's
`{ position: 'absolute' }` cleanup pattern (`flexDirection: 'row'` and put the
spinner inline). Either is safer than the no-op.

---

### WR-06: Loading-state UX renders BOTH spinner AND "Looking up address…" subtext

**File:** `src/components/ContextualListingFlow/Step2Location.tsx:588-602`
**Issue:** When `geocodingState === 'loading'` the UI shows (a) an `ActivityIndicator`
to the right of the TextInput AND (b) a small text label below ("Looking up
address…"). These are functionally redundant and the dual-render adds vertical jitter
to the form (the text label pushes everything below it down 16-20pt during every
keystroke debounce, then back up on success/failure — particularly noticeable when the
user is typing quickly).

**Fix:** Pick one. The inline spinner is the conventional pattern (matches most
RN form libraries) and avoids layout shift. The text label adds value only for
accessibility — if you want it, hide the spinner when the label shows.

---

### WR-07: `MapView.initialRegion` (not `region`) means switching city after pin drop does NOT recenter the map

**File:** `src/components/ContextualListingFlow/Step2Location.tsx:504-509`
**Issue:** `MapView` uses `initialRegion` (one-shot at mount). When the user changes
the city chip selection mid-flow, the map does not recenter to the new city's
centroid — they'd have to scroll/zoom manually. This is M3 baseline behavior (pre-
Phase-11) and not strictly a Phase 11 regression, but Phase 11 is the natural time to
fix it because the new city centroid is now load-bearing for the viewbox bias and the
user expects city-change to "move them to the city". Without recenter, a user typing
"Abay 100" after picking Almaty will see the map still centered on Bishkek even
though the geocode result will correctly land in Almaty — confusing.

**Fix:** Track a controlled `region` state and update it when `selectedCityCenter`
changes. Alternative: keep `initialRegion` and call `mapRef.current.animateToRegion`
in a `useEffect` keyed on `selectedCityCenter`. Either way, this is a UX-quality
follow-up; not blocking for ship if the team accepts the "explicit pin still works"
fallback. Suggest filing as M5 backlog rather than blocking Phase 11.

---

## Info

### IN-01: `console.warn` swallow in geocodeService leaks to RN debug overlay

**File:** `src/services/geocodeService.ts:68, 93`
**Issue:** `console.warn` triggers React Native's red yellow-box overlay in dev builds.
Per-keystroke warns during debounce will flood the dev console.

**Fix:** Use `__DEV__ && console.warn(...)` or downgrade to `console.debug` (which is
silent on RN).

---

### IN-02: `language as 'en' | 'ru'` casts assume the LanguageContext can never produce another value

**File:** `src/components/ContextualListingFlow/Step2Location.tsx:194, 228, 252`
**Issue:** The `language` from `useLanguage()` is typed as `'en' | 'ru'` already (per
the LanguageContext source). The cast `language as 'en' | 'ru'` is a no-op smell. If
the union ever expands ('kg'?), these casts silently mistype.

**Fix:** Drop the cast. If TypeScript complains the union is wider, fix it at the
LanguageContext source.

---

### IN-03: `cityCentersMap` rebuilds on every render that mutates `cities`

**File:** `src/components/ContextualListingFlow/Step2Location.tsx:150-154`
**Issue:** Pre-existing minor — `useMemo([cities])` is correct, but `fetchCities()`
mutates `cities` on Other-city submit, causing a rebuild. Acceptable cost. Flagging
only because the same logic could be a `useRef` for stability if needed in a hot
loop. Out-of-scope for Phase 11.

---

### IN-04: `addressDisplay` precedence logic is duplicated verbatim across 3 files

**File:** `PropertyDetailsScreen.tsx:529-530`, `HospitalityCard.tsx:79-80`,
`PropertyCard.tsx:84-85`
**Issue:** Three copies of:

```ts
const addressDisplay = (property.location?.address ?? '').trim()
  || [districtLabel, cityLabel].filter(Boolean).join(', ');
```

(with `PropertyCard` using ` · ` instead of `, `). Future changes to the precedence
or fallback separator must touch three files in lockstep. Low-risk because the comments
on each site explicitly document the intentional separator difference, but worth
extracting to `src/utils/formatAddress.ts` (already imported by HospitalityCard for
formatAddress) as e.g. `deriveAddressDisplay(property, separator)`.

**Fix:** Extract:

```ts
// src/utils/formatAddress.ts
export function deriveAddressDisplay(
  property: Property,
  fallbackSeparator: ', ' | ' · ' = ', '
): string {
  const trimmed = (property.location?.address ?? '').trim();
  if (trimmed) return trimmed;
  const district = property.location?.district ?? '';
  const city = property.location?.city ?? '';
  return [district, city].filter(Boolean).join(fallbackSeparator);
}
```

Out-of-scope for Phase 11; M5+ refactor.

---

### IN-05: Reverse-geocode tests do not assert the `address: '   '` (whitespace-only) anti-clobber case

**File:** `src/components/ContextualListingFlow/__tests__/Step2.test.tsx`
**Issue:** Even when CR-03's tests land, consider the edge case where the user typed
ONLY whitespace into the address field. The current handlers use `.trim()` on the
check so whitespace counts as empty (good), but no test asserts this.

**Fix:** Add as part of CR-03's G7 test variant — verify that
`values.location.address = '   '` (three spaces) is treated as empty and the
reverse-geocode result fills it.

---

_Reviewed: 2026-05-26_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_

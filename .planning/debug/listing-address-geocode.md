---
slug: listing-address-geocode
status: root_cause_found
trigger: |
  Address handling on create-listing Step 2 "Where is the listing?" is incomplete and inaccurate.
  Currently: user can pick city/district and drop a pin on the map (capturing lat/lon). A "Show exact address"
  toggle exists, but there is NO text input to type an address like "100 Manas Street" and have it geocoded
  into lat/lon to auto-place the pin. Also, dropping a pin does not produce a usable street address (reverse
  geocode is missing or wrong). A previous version of forward-geocoding existed but was buggy — typed
  addresses resolved to a "random pin" on the map.

  Wants both directions working:
    1. Forward geocode: typed address -> lat/lon -> pin auto-placed
    2. Reverse geocode: pin drop -> filled-in street address

created: 2026-05-26
updated: 2026-05-26
---

# Symptoms

- **Expected:** On Step 2 of create-listing, user can either (a) type a street address ("100 Manas Street") and see the pin auto-place at the correct lat/lon, or (b) drop a pin on the map and see the resolved street address populate.
- **Actual:** Only (b)-ish exists — pin can be dropped, lat/lon captured, but no address text appears. The "Show exact address" toggle is present but offers no text-input affordance. Forward geocoding (typed address → coords) is not wired up.
- **Errors:** None surfaced to the user.
- **Timeline:** Always been this way since M3 "Contextual Forms" (shipped 2026-05-11). The atomic deletion commit `19bde0d` removed the legacy `CreateListingScreen` + `CreateListingForm` (which had a `streetAddress` TextInput and backend-side geocoding); the M3 replacement `<ContextualListingFlow>` / `Step2Location.tsx` never carried it forward.
- **Reproduction:** Open Create Listing → advance to Step 2 ("Where is the listing?") → toggle "Show exact address" → observe missing text input → drop a pin → observe lat/lon captured but no street address.

# Scope

Both forward (address → coords) and reverse (coords → address) flows are in scope.

# Current Focus

- hypothesis: **CONFIRMED** — Step 2 of the create-listing flow has no text-input UI for address, no street-address field anywhere in the data model (FormBag / Property type / backend Mongoose schema), and no client-side geocode service at all. The previous (M1/M2-era) forward-geocode pipeline was deleted during the M3 atomic cutover and never rebuilt.
- test: Inventoried `src/components/ContextualListingFlow/Step2Location.tsx`, `FormBag.location` (`types.ts`), `Property.location` (`src/types/Property.ts`), backend Mongoose `Property.location` (`src/models/Property.js`), backend routes (`locationRoutes.js`, `propertyRoutes.js`), backend `geocodeAddress` utility (`src/utils/geocoder.js`), and the deleted legacy form via `git show 19bde0d^:src/components/CreateListingForm/BasicInfoSection.tsx`.
- expecting: Find an address text input + geocode service — **NOT FOUND** anywhere in current `src/`. Backend `geocodeAddress` exists but is orphaned (no route uses it, no consumer imports it post-Phase 1).
- next_action: Propose unified fix — add `location.address` field end-to-end + add backend `POST /api/locations/geocode` (forward) and `POST /api/locations/reverse-geocode` (reverse) endpoints, wire a new `TextInput` under the toggle in Step 2.

# Evidence

- timestamp: 2026-05-26 / file: src/components/ContextualListingFlow/Step2Location.tsx
  - **No `TextInput` for a street address anywhere in the component.** The "Show exact address" toggle (line 446-465) is a boolean Switch — it gates *display* of the toggle-state in the FormBag (`location.showExactAddress`) but offers no input affordance.
  - `handleMapPress` / `handleMarkerDragEnd` (lines 151-176) only write `coordinates: { lat, lng }` to the FormBag. **No reverse-geocode call** is made after the pin drops.
  - No import of any geocode service or helper (only `locationService` for cities/districts).

- timestamp: 2026-05-26 / file: src/components/ContextualListingFlow/types.ts (lines 14-20)
  - `FormBag.location` is `{ city, district, coordinates, showExactAddress }` — **no `address` / `streetAddress` field**.

- timestamp: 2026-05-26 / file: src/types/Property.ts (lines 37-43)
  - Top-level `Property.location?` is `{ city, district, coordinates, showExactAddress }` — same shape, **no address string**.

- timestamp: 2026-05-26 / file: src/components/ContextualListingFlow/adapters.ts (lines 21-28, 85-90)
  - Both adapters (`propertyToFormBag` + `formBagToPropertyPayload`) round-trip only the 4 fields above. No address field to map.

- timestamp: 2026-05-26 / file: src/components/ContextualListingFlow/validators.ts (lines 14-32, 52-56)
  - Step 2 validator requires `city`, `district`, `coordinates`. No mention of address.

- timestamp: 2026-05-26 / file: src/services/ (entire dir)
  - `grep -rn "geocode\|geocoder" src/` returns **zero matches**. No client-side geocode service exists.

- timestamp: 2026-05-26 / file: src/screens/PropertyDetailsScreen.tsx (lines 521-525)
  - Address display is synthesized as `[district, city].filter(Boolean).join(', ')` — confirms downstream renderers have no street-address string to surface.

- timestamp: 2026-05-26 / file: backend src/models/Property.js (lines 32-41)
  - Backend Mongoose `location` schema is `{ city, district, coordinates: { lat, lng }, showExactAddress }` — **no `address` / `street` field**.

- timestamp: 2026-05-26 / file: backend src/utils/geocoder.js
  - `geocodeAddress(address)` helper EXISTS (Nominatim, forward-only) — but is **orphaned**: `grep -rn "geocodeAddress" backend/src` finds zero non-test consumers. The Phase 1 atomic cutover removed it from `propertyRoutes.js` (test comment line 27: "propertyRoutes.js no longer imports geocodeAddress").
  - No reverse-geocode helper exists at all.
  - **Known issues (per memory `geocoder-nominatim-hang-axios-network-error.md`):** no AbortController / fetch timeout — Nominatim can hang past axios's 15s. Also: hard-coded `Accept-Language: en` (RU label lookup will return EN), `addressdetails: 0` (no structured response), no viewbox bias (KG/KZ/UZ scope not enforced).

- timestamp: 2026-05-26 / file: backend src/routes/locationRoutes.js
  - 4 endpoints: GET/POST `/cities`, GET/POST `/cities/:slug/districts`. **No `/geocode` or `/reverse-geocode` route.**

- timestamp: 2026-05-26 / git history: commit 19bde0d (2026-05-06)
  - `git show 19bde0d^:src/components/CreateListingForm/BasicInfoSection.tsx` line 225-232 — legacy form had `<TextInput placeholder={t('createListing.streetAddress')} value={values.address} />`.
  - `git show 19bde0d^:src/screens/CreateListingScreen.tsx` lines 498-507 — legacy submit built `fullAddress = "${street}, ${district}, ${city}, Kyrgyzstan"` and sent it to the backend, which called `geocodeAddress(fullAddress)` server-side. **The "random pin" bug**: Bishkek-only country suffix + no viewbox + `Accept-Language: en` meant Nominatim could match a same-named street in another country, returning a confidently wrong pin.

# Eliminated

- ~~Reverse-geocode call exists but its response is ignored.~~ — No reverse-geocode call exists at all.
- ~~Forward-geocode UI is hidden behind a feature flag.~~ — UI was deleted (commit 19bde0d), no flag exists.
- ~~Backend `/geocode` route is mis-routed.~~ — No such route exists. The orphaned utility is forward-only.
- ~~`react-native-maps` Geocoder helper is available.~~ — Not exposed in v1.27 typings.

# Root Cause

**M3 atomic cutover dropped both the address text input and the server-side geocode call without backfilling either.** The "Show exact address" toggle (a holdover from the M3 design intent) became a vestigial control: it persists `showExactAddress: boolean` but the codepath has no address text to gate. Concretely:

1. **No data field** — `FormBag.location` / `Property.location` (client) and Mongoose `location` (backend) all omit an `address` string. Anything we capture has nowhere to live.
2. **No forward geocode** — Client has zero geocode services. Backend has an orphaned `geocodeAddress` helper that no route exposes. The legacy version (deleted in 19bde0d) had real bugs that justified its removal but no replacement was ever shipped: `Accept-Language: en` + no viewbox + Bishkek-only country suffix → "random pin" symptom user remembered.
3. **No reverse geocode** — Backend helper is forward-only; no reverse-geocode utility or route exists at all.

# Proposed Fix

Build the missing surface end-to-end with KG/KZ/UZ scope baked in and the known-issue list from the memory note addressed up front.

## Backend changes (4 files)

1. **`src/utils/geocoder.js`** — repair the forward helper + add reverse helper + add AbortController timeout.
   - Add `geocodeAddress(address, opts)` with `signal: AbortController` (5s timeout). Add `countrycodes: 'kg,kz,uz'` (Nominatim filter). Add `viewbox` + `bounded: 1` when caller provides a `bias: { city }`. Add `addressdetails: 1` + `accept-language` based on caller `lang` ('ru' | 'en'). Return `{ latitude, longitude, displayName, addressDetails }` not just lat/lon.
   - Add `reverseGeocode({ lat, lng, lang })` (Nominatim `/reverse`) returning `{ displayName, addressDetails }`. Same 5s timeout.

2. **`src/routes/locationRoutes.js`** — expose 2 new POST endpoints (auth + listing-capable, same gate as `/cities`):
   - `POST /api/locations/geocode` body `{ address, citySlug?, lang? }` → `{ lat, lng, displayName }` or 404.
   - `POST /api/locations/reverse-geocode` body `{ lat, lng, lang? }` → `{ displayName }` or 404.
   - Pass the selected city's centroid as a viewbox bias when `citySlug` is provided.

3. **`src/models/Property.js`** — add `location.address: { type: String, default: '' }` to the nested schema. Backwards-compatible (existing docs default to empty).

4. **Backend routes that sanitize listing PUT/POST** — ensure `location.address` (string, length ≤ 200) is in the allowlist, not stripped.

## Client changes (5 files)

5. **`src/services/geocodeService.ts`** (NEW) — two functions `geocodeAddress({ address, citySlug, lang })` and `reverseGeocode({ lat, lng, lang })` that call the new backend routes via `apiClient`. Debounced caller-side (300ms) is handled by the consumer.

6. **`src/components/ContextualListingFlow/types.ts`** — add `address: string` to `FormBag.location`.

7. **`src/types/Property.ts`** — add `address?: string` to nested `location`.

8. **`src/components/ContextualListingFlow/adapters.ts`** — round-trip `location.address` in both directions.

9. **`src/components/ContextualListingFlow/Step2Location.tsx`** — the actual UI work:
   - Render a `<TextInput>` under the "Show exact address" toggle (visible only when `showExactAddress` is true OR `isHospitality` — matches the existing toggle semantics).
   - Debounced forward geocode (300ms after typing pauses): on success, write both `address` AND `coordinates` to FormBag, re-center the map to the new pin.
   - Reverse-geocode on `handleMapPress` / `handleMarkerDragEnd` success: best-effort fill `address` if it's currently empty (don't clobber user's typed text). Pass `lang` from `useLanguage()`.
   - Show subtle loading indicator next to the field while geocoding.
   - On geocode failure: keep the user's typed text, do not auto-move the pin (avoids the "random pin" regression). Show a small "couldn't find that address" hint.

10. **`src/locales/en.ts` + `src/locales/ru.ts`** — add EN+RU strings:
    - `contextualListing.step2.addressLabel` ("Street address" / "Адрес")
    - `contextualListing.step2.addressPlaceholder` ("e.g. 100 Manas St" / "напр. ул. Манаса 100")
    - `contextualListing.step2.addressNotFound` ("Couldn't find that address — drop a pin instead" / "Не удалось найти адрес — поставьте точку на карте")
    - `contextualListing.step2.addressGeocoding` ("Looking up address…" / "Поиск адреса…")

11. **Downstream display** — `PropertyDetailsScreen.tsx` line 525 should prefer `property.location.address` when present, fall back to the synthesized `district, city`. `HospitalityCard.tsx` + `HeaderInfoCard.tsx` likewise.

## Guardrail checks

- No new packages required (uses existing `axios` + backend `fetch`). No react-navigation, no maps SDK rewrite, no Firebase SDK.
- Uses `useTheme()` tokens for new TextInput (matches existing modal inputs in same file).
- EN+RU parity for all 4 new strings.
- Viewbox/`countrycodes` bias respects KG/KZ/UZ scope (NOT Bishkek-only). Note: the user-selected city's centroid becomes the bias center — works for Almaty/Tashkent too.
- AbortController timeout (5s) addresses memory `geocoder-nominatim-hang-axios-network-error.md` carry-forward.
- Anti-"random pin" defense: forward geocode failure does NOT move the pin or clear the user's text. The user retains the typed string + can drop a manual pin.

# Notes

- Memory: `geocoder-nominatim-hang-axios-network-error.md` — addressed by AbortController in backend changes.
- Memory: `central-asia-rooms-vs-bedrooms-convention.md` — unrelated.
- Memory: `geographic-scope.md` — addressed by `countrycodes: 'kg,kz,uz'` + city-centroid viewbox.
- Backend repo: `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services`. Use `nvm use 24` before backend npm/node commands.
- Estimated scope: ~9 files touched, no dependency changes, EN+RU parity required for 4 new keys.

# Specialist Review

(none yet — will request after user confirms fix direction)

# Fix Route

- 2026-05-26: User chose to plan over inline fix. Cross-repo + new Mongoose field + i18n parity is plan-shaped, not inline-shaped.
- **Phase 11 of M5 created from this debug file.** See `.planning/phases/11-listing-address-geocode/` (11-CONTEXT.md + 11-01..11-06-PLAN.md).
- ROADMAP.md updated with Phase 11 entry under new M5 "Details & Geocoding" milestone collapsible.
- Plan-check passed after one revision pass (2 blockers + 2 warnings resolved 2026-05-26).
- Next step: run `/gsd-execute-phase 11` (or per-plan `/gsd-execute-plan 11-01` starting with backend wave 1).
- Once the phase executes + ships, mark this debug file `status: resolved` and move it to `.planning/debug/resolved/`.

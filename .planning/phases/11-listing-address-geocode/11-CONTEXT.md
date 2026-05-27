# Phase 11: Listing Address Geocode (Forward + Reverse) — Context

**Gathered:** 2026-05-26
**Status:** Ready for planning
**Source:** Debug-session-derived (`.planning/debug/listing-address-geocode.md`) — treated as PRD-equivalent.

<domain>
## Phase Boundary

This phase closes the gap surfaced by the `listing-address-geocode` debug session: on Step 2 ("Where is the listing?") of `<ContextualListingFlow>` (the M3 create-listing flow), a user must be able to **type a street address and have the pin auto-place** (forward geocode), and **drop the pin and see the address fill in** (reverse geocode). Both directions persist a new `location.address` string end-to-end (client FormBag → client Property type → backend Mongoose schema → MongoDB → backend response → client render).

The work is **cross-repo**:
- RN client repo (this repo): `/Users/beckmaldinVL/development/mobileApps/JayTap`
- Backend repo (same owner): `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services`

Backend node version: `>=22.12` (jose@6 ESM-only) — backend agents must `nvm use 24` before npm/node commands. RN client unaffected (default v20).

**Scope:** both forward AND reverse geocoding, both client AND backend, plus a one-time repair of the orphaned `geocodeAddress` utility (AbortController timeout, KG/KZ/UZ viewbox, `addressdetails=1`, `Accept-Language` from request) and a new sibling `reverseGeocode` helper.

**Out of scope:**
- Adopting a paid geocoder (Google Maps, Mapbox, etc.) — stay on Nominatim per existing infra.
- Migrating existing listings to backfill `location.address` from `district, city` — leave old docs blank; synthesizing fake addresses defeats the purpose.
- Re-architecting the map component or react-native-maps version.
- Adding country routing UI — `countrycodes=kg,kz,uz` is hard-coded for now (M5+ may surface country picker).
- React-navigation migration — explicitly forbidden by CLAUDE.md.

</domain>

<decisions>
## Implementation Decisions (LOCKED — derived from debug session's Proposed Fix)

### Backend (4 files)
1. **`src/utils/geocoder.js`** — repair forward + add reverse + add timeout.
   - Add `geocodeAddress(address, opts)` with `AbortController` (5s timeout). Add `countrycodes: 'kg,kz,uz'`. Add `viewbox` + `bounded: 1` when caller provides `bias: { city }`. Add `addressdetails: 1` + `accept-language: opts.lang ?? 'en'`. Return `{ latitude, longitude, displayName, addressDetails }` (not just lat/lon).
   - Add `reverseGeocode({ lat, lng, lang })` (Nominatim `/reverse`). Same 5s timeout. Returns `{ displayName, addressDetails }`.
2. **`src/routes/locationRoutes.js`** — expose 2 new POST endpoints (auth + listing-capable gate, same as `/cities`):
   - `POST /api/locations/geocode` body `{ address, citySlug?, lang? }` → `{ lat, lng, displayName }` or 404.
   - `POST /api/locations/reverse-geocode` body `{ lat, lng, lang? }` → `{ displayName }` or 404.
   - Pass selected city's centroid as viewbox bias when `citySlug` is provided.
3. **`src/models/Property.js`** — add `location.address: { type: String, default: '', trim: true, maxlength: 200 }` to the nested schema. Backwards-compatible (existing docs default to empty).
4. **Backend listing PUT/POST sanitizer** — ensure `location.address` (string, length ≤ 200) is in the allowlist, not stripped.

### Client (5 files)
5. **`src/services/geocodeService.ts`** (NEW) — two functions `geocodeAddress({ address, citySlug, lang })` and `reverseGeocode({ lat, lng, lang })` via `apiClient`. Debouncing handled by the caller component.
6. **`src/components/ContextualListingFlow/types.ts`** — add `address: string` to `FormBag.location`.
7. **`src/types/Property.ts`** — add `address?: string` to nested `location`.
8. **`src/components/ContextualListingFlow/adapters.ts`** — round-trip `location.address` in both `propertyToFormBag` and `formBagToPropertyPayload`.
9. **`src/components/ContextualListingFlow/Step2Location.tsx`** — UI work:
   - Render a `<TextInput>` under the "Show exact address" toggle, visible when `showExactAddress === true` OR `isHospitality`. Reuse the modal-input styling already in this file (no new design tokens).
   - Debounce forward geocode (300 ms after typing pauses). On success: write `address` AND `coordinates` to FormBag; re-center map.
   - Reverse-geocode on `handleMapPress` / `handleMarkerDragEnd` success: best-effort fill `address` only if currently empty (do not clobber user-typed text). Pass `lang` from `useLanguage()`.
   - Subtle loading indicator next to field while geocoding.
   - On forward-geocode failure: keep typed text, DO NOT auto-move pin (defeats the historical "random pin" bug); show "couldn't find that address" hint.

### i18n (2 files)
10. **`src/locales/en.ts` + `src/locales/ru.ts`** — add EN + RU strings:
    - `contextualListing.step2.addressLabel` ("Street address" / "Адрес")
    - `contextualListing.step2.addressPlaceholder` ("e.g. 100 Manas St" / "напр. ул. Манаса 100")
    - `contextualListing.step2.addressNotFound` ("Couldn't find that address — drop a pin instead" / "Не удалось найти адрес — поставьте точку на карте")
    - `contextualListing.step2.addressGeocoding` ("Looking up address…" / "Поиск адреса…")
    - EN+RU parity sentinel (`scripts/check-i18n-parity.sh`) MUST exit 0.

### Downstream display
11. **`src/screens/PropertyDetailsScreen.tsx`** (line ~525), `HospitalityCard.tsx`, `HeaderInfoCard.tsx` — prefer `property.location.address` when present; fall back to existing `[district, city].filter(Boolean).join(', ')` synthesis. No regression in the M5 Phase 1 details redesign layout.

### Claude's Discretion
- Exact debounce mechanism (React Native built-in `setTimeout` ref vs. a lightweight `useDebouncedValue` hook). Either is fine; pick simplest.
- Whether the new `<TextInput>` should also fire reverse-geocode after the user types lat/lng manually — assume NO; address text is forward-geocode input only.
- Whether to surface a "use my current location" affordance — assume NO; out of scope for this phase.
- Whether `addressNotFound` is a toast vs. an inline error label — pick inline label for noise reduction.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Source of Truth (PRD-equivalent)
- `.planning/debug/listing-address-geocode.md` — full debug session with Root Cause + Proposed Fix sections; evidence trail; eliminated hypotheses. Single source of truth for this phase.

### M3 baseline (the code being patched)
- `src/components/ContextualListingFlow/Step2Location.tsx` — Step 2 component (lines 151-176 = pin handlers; 446-465 = exact-address toggle)
- `src/components/ContextualListingFlow/types.ts` (lines 14-20) — `FormBag.location` type
- `src/components/ContextualListingFlow/adapters.ts` (lines 21-28, 85-90) — round-trip adapters
- `src/components/ContextualListingFlow/validators.ts` (lines 14-32, 52-56) — Step 2 validation
- `src/types/Property.ts` (lines 37-43) — `Property.location` type
- `src/screens/PropertyDetailsScreen.tsx` (line 525) — address display consumer (post-M5-Phase-1 layout)
- `src/locales/en.ts` + `src/locales/ru.ts` — step2 keys (~lines 650-672)

### Backend
- `backend-services/JayTap-services/src/utils/geocoder.js` — orphaned forward-only Nominatim helper to repair
- `backend-services/JayTap-services/src/routes/locationRoutes.js` — currently 4 endpoints (cities + districts); add 2 here
- `backend-services/JayTap-services/src/models/Property.js` (lines 32-41) — nested `location` schema

### Project / process
- `CLAUDE.md` — JayTap conventions (custom App.tsx nav, no react-navigation, EN+RU parity, useTheme tokens, no Firebase SDK in RN client)
- `.planning/PROJECT.md` — core value statement + out-of-scope guardrails
- `.planning/codebase/CONVENTIONS.md` — coding conventions

### Related memories (already factored into decisions above)
- `geocoder-nominatim-hang-axios-network-error.md` — 5s AbortController is REQUIRED, not optional.
- `geographic-scope.md` — `countrycodes=kg,kz,uz` (NOT Bishkek-only).
- `m5-phase-1-merged-2026-05-26.md` — `PropertyDetailsScreen` was rebuilt; address display lives in new components under `src/components/details/`. Confirm the consumer is `HeaderInfoCard` or `MapPreviewCard` not the legacy line 525 path.
- `no-firebase-sdk.md` — do NOT propose Firebase SDK adds in the RN client.
- `backend-node-version.md` — `nvm use 24` for any backend npm/node commands.
- `backend-repo-location.md` — backend at `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services` (same owner).
- `central-asia-rooms-vs-bedrooms-convention.md` — unrelated, but reminds that Step 2 is M3-era code.

</canonical_refs>

<specifics>
## Specific Examples

- Address text input MUST be hidden until `showExactAddress === true` (or `isHospitality`) — toggle semantics from the existing M3 design are preserved, not changed.
- The "random pin" historical bug fired when Nominatim matched a same-named street in another country (Bishkek-only suffix + no viewbox + `Accept-Language: en`). The defense is THREE layers: `countrycodes=kg,kz,uz` + `viewbox` from city centroid + on-failure DO NOT move pin.
- KG/KZ/UZ scope means: a user creating a listing in Almaty (KZ) typing "Abay 100" should get an Almaty pin, not a Bishkek one — `viewbox` from the selected city centroid handles this.
- The `addressDetails` object returned by Nominatim (when `addressdetails=1`) contains structured fields (`road`, `house_number`, `city`, etc.) — store the `displayName` string in `location.address` for now; we may use the structured fields in M6+ for filter UI.

</specifics>

<deferred>
## Deferred Ideas

- Country selector UI — assume `countrycodes=kg,kz,uz` is sufficient until M6.
- "Use current location" GPS affordance — out of scope.
- Geocoder caching layer — Nominatim has a 1 req/sec rate limit; if hit in prod, add caching in a follow-up.
- Replacing Nominatim with a paid provider (Google, Mapbox) — explicit project preference is to stay on Nominatim.
- Backfilling existing listings' `location.address` from `district, city` synthesis — explicit decision: leave empty.

</deferred>

---

*Phase: 11-listing-address-geocode*
*Context derived from debug session 2026-05-26.*

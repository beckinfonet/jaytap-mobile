---
slug: address-flow-redesign
status: design_approved
trigger: |
  Post-Phase 11 on-device QA surfaced two UX issues with the listing-address flow:

  1. **Chip-vs-address mismatch.** Typing "15 Manas Avenue" in Bishkek, Nominatim returns the
     canonical displayName containing "Pervomaysky District" (1st of May district). But the
     curated district chip row for Bishkek doesn't include Pervomaysky — so the chip the user
     picked and the address the geocoder returned disagree visibly. The fallback "Other district"
     modal makes things worse: requires Russian + English spelling, hidden behind keyboard
     (Step 2 modal KAV gap), AND triggers an admin-approval flow before the listing can publish.

  2. **Aggressive geocode misfires.** Typing "15 Lev Tolstoy street" while in Bishkek pulled the
     result to a Lev Tolstoy street in Kazakhstan — there is one with the same name + number.
     User had to copy-paste the full string in one shot to force a single API call. Root cause:
     300ms debounce is too short (typing pauses within a word are 200-400ms), AND citySlug bias
     isn't guaranteed to be sent because city is optional-at-typing-time (no gate enforces it).

created: 2026-05-27
updated: 2026-05-27
---

# Phase 12 — Address Flow Redesign

Builds on Phase 11 (forward + reverse geocode + canonical address persistence).
Pivots Step 2 form UX based on hands-on QA.

## Goal

Eliminate the chip-vs-address conflict and the cross-border geocoder misfires by simplifying
Step 2 to **city + map pin + address text** (no district chips, no district modal), with the
geocode trigger gated and slowed so the citySlug bias actually does its job.

## Scope

In scope:

- Remove district chip row + "Other district" modal from `Step2Location.tsx`.
- Drop `location.district` from the Step 2 validator (`validators.ts`).
- Gate the address text input behind city selection (disabled state + helper text until a
  city chip is picked).
- Bump forward-geocode debounce 300ms → 800ms in `scheduleGeocode` (`Step2Location.tsx:221`).
- Drop the `|| undefined` fallback on `citySlug` in `scheduleGeocode` since city is guaranteed
  by the gate.
- Extend `HomeScreen.tsx` filter (line 182-189) to match against `location.address` text
  alongside the existing `district / city / description` substring match — so the hardcoded
  "Bishkek (All) / Microdistrict 3..12" filter chips and the freetext search box keep working
  on new listings (which won't have a district slug).
- Relax `district` from required → optional on the backend POST validator
  (`JayTap-services/src/routes/propertyRoutes.js`).
- Test updates for `Step2Location.test.tsx`, `validators.test.ts`, `integration.test.tsx`,
  and any HomeScreen filter test that asserts district-required behavior.
- i18n: one or two new keys for the disabled-state helper text ("Select a city first") in
  EN + RU (`src/locales/en.ts`, `src/locales/ru.ts`).

Out of scope (deliberately deferred):

- Oblast / region selector (KG/KZ/UZ city-level expansion) — current city chip row already
  covers Bishkek/Almaty/Tashkent which are city-level subjects; oblast-level granularity is
  a later milestone when smaller-city expansion lands.
- Suggestion-dropdown (Google-Maps autocomplete style) for the address input — bigger build
  (new component + suggestion endpoint + list rendering). The city-gate + 800ms debounce is
  the cheap fix; revisit only if KZ misfires persist after this ships.
- Backend Nominatim bias hardening (`viewbox` weight, `countrycodes` strictness in
  `JayTap-services/src/utils/geocoder.js`). Ship the form change first; treat backend bias
  as a follow-up only if the user-facing problem persists.
- Privacy-toggle removal. The "exact-address" toggle (`location.showExactAddress`) stays as-is:
  rent/sale long-term landlords still want to publish approximate-only listings.
- Backfill / migration for legacy listings with curated `district` slugs. Display layer
  (`PropertyCard.tsx:84-85`, `HospitalityCard.tsx:80`, `PropertyDetailsScreen.tsx:530`)
  already prefers `location.address` with `[district, city]` fallback — legacy listings keep
  working unchanged via the fallback path.

## Design

### Step 2 form changes (`Step2Location.tsx`)

| Element | Before | After |
|---------|--------|-------|
| City chip row | required, with "Other city" modal | unchanged |
| District chip row | required, with "Other district" modal | **removed entirely** |
| Map pin (tap + drag) | active, draggable Marker | unchanged |
| Exact-address toggle | hides address input when off | unchanged |
| Address text input | enabled whenever toggle on / hospitality | **gated on city selection**: disabled with helper text "Select a city first" until a city chip is picked |
| Forward geocode trigger | 300ms debounce after each keystroke, citySlug bias optional | **800ms** debounce, citySlug guaranteed-non-empty |
| Reverse geocode (pin drop / drag) | opportunistically fills empty address | unchanged |

### Validator (`validators.ts`)

- Remove `errors['location.district'] = 'contextualListing.step2.districtRequired'` from
  the stepN === 2 branch (line 54).
- Remove `'location.district'` from `FIELD_ORDER_PER_STEP[2]`.
- Keep `district: ''` in `emptyFormBag()` (type compatibility — the field stays on the
  FormBag shape, just no longer validated or surfaced).

### HomeScreen filter (`HomeScreen.tsx:182-217`)

Two substring-match expressions need `location.address` added:

```typescript
// District filter (line 182-189):
if (selectedDistrict !== 'Bishkek (All)') {
  const searchDistrict = selectedDistrict.toLowerCase();
  const districtMatch = p.location?.district?.toLowerCase().includes(searchDistrict);
  const cityMatch = p.location?.city?.toLowerCase().includes(searchDistrict);
  const descMatch = p.content?.description?.toLowerCase().includes(searchDistrict);
  const addressMatch = p.location?.address?.toLowerCase().includes(searchDistrict);  // NEW
  if (!districtMatch && !cityMatch && !descMatch && !addressMatch) return false;
}

// Freetext search (line 192-216):
const addressLc = p.location?.address?.toLowerCase() ?? '';  // NEW
// ...
return (
  titleLc.includes(query) ||
  cityLc.includes(query) ||
  districtLc.includes(query) ||
  descLc.includes(query) ||
  addressLc.includes(query) ||  // NEW
  (p.listingId && (...))
);
```

This is the bridge that keeps the hardcoded "Microdistrict 3..12" filter chips functional
for new listings whose only locality signal is the canonical address text.

### Backend (`JayTap-services/src/routes/propertyRoutes.js`)

Relax `district` from required → optional on the POST handler. One-line schema change
(exact location depends on whether it's Joi / Zod / ad-hoc; planner will pinpoint).
No data migration. Existing listings with `district` keep their value; new listings
submit with `district: ''` or omit the field — either is accepted.

### Display layer — no changes

`PropertyCard.tsx:84-85`, `HospitalityCard.tsx:80`, `PropertyDetailsScreen.tsx:530`,
`MapPreviewCard.tsx` already prefer `location.address` and fall back to
`[district, city]` synthesis when address is empty. New listings ride the preferred
path; legacy listings keep falling back. Zero changes.

### What the user loses

- Curated district chip on the form (was a creation-side UI affordance, not a search-side one).
- For privacy-toggle-OFF listings (rent_long / sale with `showExactAddress: false`), the
  second-line display drops from `district · city` to just `city` because there's no captured
  district fallback. Slightly less specific. If this is felt later, the future move is a
  `location.neighborhood` freetext field — but hold on that until it's an actual pain point.

## Success Criteria

1. Step 2 renders city chip row + map pin + (gated) address input. No district chip row.
   No "Other district" modal.
2. Address input is disabled (visually + functionally) until a city chip is picked. Helper
   text "Select a city first" visible in disabled state. EN + RU parity.
3. Typing a city-disambiguated address (e.g. "15 Lev Tolstoy street" with Bishkek picked)
   geocodes to the correct country. Verified manually for at least one KG-vs-KZ ambiguity case.
4. Geocode fires AT MOST once per "stopped typing" event (800ms idle). Verified by inspecting
   network log or console while typing a 20-character address at a normal cadence.
5. New listings submit successfully with `district: ''` (or omitted). Backend POST validator
   no longer rejects.
6. Legacy listings (with curated `district` slug) continue to display
   "<district> · <city>" on PropertyCard / HospitalityCard / PropertyDetailsScreen — fallback
   path preserved.
7. HomeScreen district filter chips ("Microdistrict 3..12") and freetext search box match
   against `location.address` text on new listings AND `district` slug on legacy listings.
8. Existing test suites pass; new tests cover (a) validator no longer flags missing district,
   (b) Step2 address-input disabled state when city empty, (c) HomeScreen filter matches via
   `location.address`.

## Confirmed Trade-offs (from brainstorming session)

- **(a) City-required-before-address gate** — user confirmed acceptable friction.
- **(b) Keep `showExactAddress` privacy toggle** — user confirmed: yes, keep it; landlord
  privacy preference for rent_long / sale is a real use case.
- **(c) Backend bias hardening** — user confirmed: out of scope for this phase, follow-up
  only if KZ misfires persist after the city-gate + 800ms ships.

## Dependencies / Integration Points

- Phase 11 must remain shipped and untouched — this phase REUSES `geocodeService.ts`,
  the backend `/locations/geocode` route, and the `location.address` persistence path.
- Display fallback in `PropertyCard.tsx:84-85` is load-bearing for legacy-listing rendering;
  do not refactor in scope.
- Hardcoded `BISHKEK_DEFAULT` constant in `Step2Location.tsx:47` stays as-is (still used
  for `BISHKEK_DEFAULT` map seed when no city picked AND for "Other city" centroid fallback).

## Implementation Order

Rough ordering suggestion for the planner:

1. Validator + types (drop district requirement, FIELD_ORDER cleanup) — pure functions, easy tests.
2. Step2Location UI: remove district chip row + "Other district" modal block; add city-gate
   disabled state on address input.
3. Debounce bump (300 → 800ms) + drop `|| undefined` on citySlug.
4. HomeScreen filter extension (add `location.address` to both substring-match expressions).
5. i18n keys (EN + RU disabled-state helper text).
6. Backend POST validator relaxation.
7. Test suite updates + new coverage for the disabled-state + the filter extension.
8. Manual on-device QA: Bishkek address (no chip conflict), KG-vs-KZ ambiguity, city-gate
   visibility, dark/light + EN/RU parity.

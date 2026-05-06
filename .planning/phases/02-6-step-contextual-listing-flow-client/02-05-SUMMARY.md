---
phase: 02-6-step-contextual-listing-flow-client
plan: 05
subsystem: ui
tags: [react-native, property-shape, nested-schema, read-path-cutover, hospitality, i18n]

# Dependency graph
requires:
  - phase: 01-schema-reshape-backend-route-shape-cutover
    provides: nested Property type stub (location/basics/conditionAndAmenities/content/terms/media subtrees + dealType + propertyType)
provides:
  - PropertyCard reads basics.* + media.photos[0] + content.title + location.city/district + dealType
  - HospitalityCard reads media.tourUrl + basics.hotelClass/hotelRooms; D-21 PRESERVED top-level maxGuests + amenities reads verbatim
  - HomeScreen + FavoritesScreen + RenterListingsScreen + OwnerListingsScreen swapped to nested filter + render reads (Tradeoff §K caller-side hospitality derivation = `dealType !== 'sale'`)
  - PropertyMap reads location.coordinates.lat/lng (hash-fallback preserved)
  - ListingMetaTable optional `property` prop surfaces basics + conditionAndAmenities + terms rows (backward-compatible — PropertyCard's compact ID+availability call site unchanged)
  - formatPrice utility reads basics.price + basics.currency with M2 flat fallback; per-month suffix gates on dealType === 'rent_long'
  - 10 new EN+RU i18n keys (3 bathroom labels + 7 meta labels)
affects:
  - 02-06 (PropertyDetailsScreen read-path cutover — reuses formatPrice + ListingMetaTable + PropertyMap + HospitalityCard fixes)
  - 02-07 (App.tsx flag swap — list screens already nested-ready)
  - 02-08 (CreateListingScreen + CreateListingForm/ deletion)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Caller-side hospitality derivation (Tradeoff §K): `dealType !== 'sale'` filter at every list-screen consumer instead of inside HospitalitySection."
    - "Nested-shape optional chaining at every read site — legacy listings missing nested fields skip rather than crash."
    - "D-21 hospitality top-level retention: maxGuests + amenities stay top-level forever (Phase 1 D-09)."
    - "ListingMetaTable additive prop pattern: optional `property` extends the table without breaking the existing compact API."

key-files:
  created: []
  modified:
    - src/components/PropertyCard.tsx
    - src/components/HospitalityCard.tsx
    - src/components/PropertyMap.tsx
    - src/components/ListingMetaTable.tsx
    - src/screens/HomeScreen.tsx
    - src/screens/FavoritesScreen.tsx
    - src/screens/RenterListingsScreen.tsx
    - src/screens/OwnerListingsScreen.tsx
    - src/utils/formatPrice.ts
    - src/locales/en.ts
    - src/locales/ru.ts
    - .planning/phases/02-6-step-contextual-listing-flow-client/deferred-items.md

key-decisions:
  - "formatPrice swapped to nested with M2 flat fallback — keeps PropertyDetailsScreen (Plan 02-06) + PropertyMap working through the cutover window without a second utility migration."
  - "ListingMetaTable extended via OPTIONAL `property` prop (additive). PropertyCard's existing call site renders unchanged; PropertyDetailsScreen (Plan 02-06) opts in to the extras row."
  - "HospitalitySection.tsx VERIFIED to be a presentational wrapper with no internal filter — caller-side derivation is unchanged in spirit, just augmented with `dealType !== 'sale'` at each of the 4 list-screen call sites."
  - "HospitalityCard hotelClass surfaced as suffix on the type badge ('Hostel · standard'). Additive — the previous UI did not display hotelClass anywhere."
  - "Bathroom enum ('private'|'shared'|'none') rendered via 3 new EN+RU i18n keys (property.bathroom{Private,Shared,None}). Replaces the M2 numeric bathroom count display on PropertyCard."

patterns-established:
  - "Each hospitality-aware list screen mirrors the same `propertyTypeToCategory(p.propertyType) === 'Hospitality' && p.dealType !== 'sale'` filter shape — single source of truth for hospitality rules at the caller."
  - "Optional chaining at every nested read; null/undefined fallbacks ('-' for display strings, 0 for numerics, '' for slugs) keep the M2-flat / M3-nested transition safe."

requirements-completed: []  # Plan frontmatter listed FLOW-13, but FLOW-13's submit-dispatch half lands in Plan 02-04b. The "RejectionBanner rendering preserved" half is partially supported here (HomeRejectionBanner mount in HomeScreen survives the swap). FLOW-13 box stays unchecked until 02-04b + 02-06 close it together.

# Metrics
duration: 24min
completed: 2026-05-06
---

# Phase 02 Plan 05: 9-Surface Read-Path Cutover Summary

**Phase 1 atomic-break window CLOSED for 9 RN client list/card surfaces — testers' M2 builds (TestFlight 27 / Play Internal 30) regain working Home / Favorites / RenterListings / OwnerListings / PropertyMap rendering once this ships; PropertyDetailsScreen (Plan 02-06) closes the 10th surface.**

## Performance

- **Duration:** ~24 min
- **Started:** 2026-05-06T08:25:00Z
- **Completed:** 2026-05-06T08:49:00Z
- **Tasks:** 5 of 5
- **Files modified:** 12 (9 plan-scope + formatPrice utility + 2 i18n bundles)

## Accomplishments

- All 9 read-path surfaces (PropertyCard, HospitalityCard, HospitalitySection [verified], ListingMetaTable, PropertyMap, HomeScreen, FavoritesScreen, RenterListingsScreen, OwnerListingsScreen) consume nested Phase 1 shape.
- Tradeoff §K caller-side hospitality rule (`dealType !== 'sale'`) applied at all 4 list-screen call sites — 9 occurrences total (HomeScreen 3, FavoritesScreen 2, RenterListingsScreen 2, OwnerListingsScreen 2).
- D-10 PRESERVED: HomeScreen `BISHKEK_DISTRICTS` const + chip source unchanged — only the listing-RENDER reads switch.
- D-21 PRESERVED: HospitalityCard top-level `property.maxGuests` + `property.amenities` reads stay verbatim.
- formatPrice utility swapped to nested with M2 flat fallback — Plan 02-06 (PropertyDetailsScreen) inherits the fix.
- 10 new EN+RU i18n keys (3 bathroom enum labels + 7 meta-row labels). i18n parity gate green.
- Zero TypeScript errors in any of the 9 plan-scope files. (Other repo files still flat-shape — owned by Plans 02-06/07/08 per D-22.)

## Task Commits

1. **Task 1: PropertyCard.tsx + supporting utility (formatPrice)** — `f2cf2f8` (feat)
2. **Task 2: HospitalityCard.tsx nested swap; HospitalitySection verified unchanged** — `8a9efb6` (feat)
3. **Task 3: 4 list screens (Home + Favorites + RenterListings + OwnerListings)** — `5a2d64e` (feat)
4. **Task 4: PropertyMap.tsx + ListingMetaTable.tsx** — `583eb63` (feat)
5. **Task 5: jest baseline pre-existing failures logged to deferred-items.md** — `3f5114a` (docs)

## Files Created/Modified

| File | Field swaps |
|------|-------------|
| `src/components/PropertyCard.tsx` | `imageUrl`/`images[0]` → `media.photos[0]`; `title` → `content?.title`; `address` → `location?.{district,city}` (joined); `type === 'rent'` → `dealType === 'sale'`; `specs?.beds/baths` → `basics?.rooms` + `basics?.bathroom`; passes through to formatPrice. |
| `src/components/HospitalityCard.tsx` | `tours[0]?.thumbnailUrl` → `media?.photos[0]` (hero); `tours.length` → `media?.tourUrl` boolean; `propertyType === 'Hostel'` (case-sensitive) → `ptype === 'hostel'` (lowercase, M3 enum); `rooms` → `basics?.hotelRooms ?? basics?.rooms`; **PRESERVED** `maxGuests` + `amenities` (D-21); added `basics?.hotelClass` suffix on type badge. |
| `src/components/HospitalitySection.tsx` | **UNCHANGED** — verified presentational wrapper with no internal filter (caller-side derivation per Tradeoff §K). |
| `src/components/PropertyMap.tsx` | `latitude`/`longitude` → `location?.coordinates?.lat/lng`; hash-fallback for missing coords PRESERVED verbatim. |
| `src/components/ListingMetaTable.tsx` | Added optional `property: Property` prop. When provided, extras grid renders `basics.{rooms,bathroom,areaSqm}` + `conditionAndAmenities.{condition,furnished}` + `terms.{minTerm,deposit,prepaymentMonths,negotiable}`. PropertyCard's existing compact call site unchanged. |
| `src/screens/HomeScreen.tsx` | Filter: `p.type` → `p.dealType` (sale vs rent split via `dealType === 'sale'`); search: `p.title`/`p.address`/`p.city`/`p.description` → `p.content?.title`/`p.location?.{city,district}`/`p.content?.description`; district filter source unchanged (D-10 hardcoded BISHKEK_DISTRICTS preserved); hospitality derivation: `propertyTypeToCategory(p.propertyType) === 'Hospitality' && (transactionType === 'rent' ? p.dealType !== 'sale' : p.dealType === 'sale')`; `tours` → `media?.tourUrl`; `videoUrl` → `media?.videos?.[0]`. |
| `src/screens/FavoritesScreen.tsx` | Hospitality derivation: + `&& p.dealType !== 'sale'` (Tradeoff §K). `tours`/`videoUrl` → `media?.tourUrl`/`media?.videos?.[0]`. |
| `src/screens/RenterListingsScreen.tsx` | Same hospitality derivation augmentation. `tours`/`videoUrl` → `media?.tourUrl`/`media?.videos?.[0]`. Edit handler unchanged — `onEditProperty(p)` continues to receive the full `Property` (now nested). |
| `src/screens/OwnerListingsScreen.tsx` | Mirror of RenterListings + Favorites pattern. |
| `src/utils/formatPrice.ts` | Reads `basics?.price` + `basics?.currency` first; M2 flat `price`/`currency` fallback (`as any`); per-month suffix gates on `dealType === 'rent_long'` OR legacy `period === 'month'`. New EUR token mapped to `€` prefix. |
| `src/locales/en.ts` + `src/locales/ru.ts` | +3 bathroom keys (Private/Shared/None) + 7 meta-row keys (Condition / Furnished × 2 / MinTerm / Deposit / Prepayment / Negotiable). 10 keys × 2 locales = 20 new entries; parity gate green. |
| `.planning/phases/02-6-step-contextual-listing-flow-client/deferred-items.md` | +Plan 02-05 entry confirming pre-existing jest baseline failures (axios interceptor, useRole, worktree haste-map) are out of scope — verified via `git stash; npm test` against HEAD. |

## Decisions Made

- **HospitalitySection unchanged after verification:** The component already required callers to filter to Hospitality category before rendering. Tradeoff §K's "caller-side derivation" was already the de facto pattern; this plan just augmented each caller with the new `dealType !== 'sale'` rule.
- **HospitalityCard `propertyType` comparison case-insensitive:** M3 nested Property type uses lowercase enum (`'hotel'|'hostel'`), but the `propertyCategory.ts` util still uses Title-case constants (`'Hostel'|'Hotel'`). Case-insensitive comparison covers both M2-flat and M3-nested data without forcing a wider refactor of `propertyCategory.ts` (out of plan scope).
- **ListingMetaTable extras opt-in via prop:** PropertyCard never wanted the extras (compact card use case). PropertyDetailsScreen (Plan 02-06) needs them. Optional `property` prop achieves both without splitting the component or forcing PropertyCard to know about basics/terms.
- **formatPrice keeps M2 flat fallback (`as any`):** Plan 02-06 (PropertyDetailsScreen) hasn't shipped yet but consumes formatPrice. Without the fallback, the test fixtures that still carry flat shape would render `$0`. The fallback is a 4-line safety net with no side effects on M3 data.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Updated formatPrice utility to read nested basics**

- **Found during:** Task 1 (PropertyCard swap)
- **Issue:** PropertyCard reads via nested but the price was rendered via `formatPrice(property, ...)` which still read `p.price`/`p.currency` flat — would render `$0` on every M3 listing on Home / Favorites / RenterListings / OwnerListings / PropertyMap. Critical correctness for the entire purpose of this plan (testers see price).
- **Fix:** Updated `src/utils/formatPrice.ts` to read `basics?.price` + `basics?.currency` first, M2 flat fallback for legacy data, EUR currency mapped to `€` prefix, per-month suffix gates on `dealType === 'rent_long'` OR legacy `period === 'month'`.
- **Files modified:** `src/utils/formatPrice.ts`
- **Verification:** TS clean; PropertyCard + PropertyMap render real prices on M3 nested data.
- **Committed in:** `f2cf2f8` (Task 1 commit)

**2. [Rule 1 - Bug] HospitalityCard propertyType comparison was case-sensitive against M2 Title-case ('Hostel'/'Hotel')**

- **Found during:** Task 2 (HospitalityCard swap)
- **Issue:** Original code compared `property.propertyType === 'Hostel'`. M3 Property type enum is lowercase (`'hotel'|'hostel'`). After Phase 1 backend migration, every hostel/hotel listing would render the "Hotel" label by default (the falsy branch).
- **Fix:** Lowercase the comparison via `(property.propertyType ?? '').toString().toLowerCase()`. Tolerates both M3 lowercase and any latent M2 Title-case rows.
- **Files modified:** `src/components/HospitalityCard.tsx`
- **Verification:** Hostel listings render "Hostel" label correctly on M3 data; M2 latent rows still resolve.
- **Committed in:** `8a9efb6` (Task 2 commit)

**3. [Rule 2 - Missing Critical] Added i18n keys for bathroom enum + meta-row labels (10 EN+RU keys)**

- **Found during:** Task 1 (PropertyCard bathroom enum) + Task 4 (ListingMetaTable extras)
- **Issue:** PropertyCard's bathroom display switched from numeric count to enum (`'private'|'shared'|'none'`); ListingMetaTable's optional extras grid surfaces condition/furnished/minTerm/deposit/prepayment/negotiable labels. Without i18n keys, EN+RU parity would break and labels would render `undefined`.
- **Fix:** Added 3 bathroom keys (`property.bathroom{Private,Shared,None}`) + 7 meta-row keys (`property.meta{Condition,FurnishedYes,FurnishedNo,MinTerm,Deposit,Prepayment,Negotiable}`) to both `en.ts` and `ru.ts`.
- **Files modified:** `src/locales/en.ts`, `src/locales/ru.ts`
- **Verification:** `bash scripts/check-i18n-parity.sh` exits 0 with `PASS: FORM-09 key-set parity holds`.
- **Committed in:** `f2cf2f8` (Task 1 — bathroom keys), `583eb63` (Task 4 — meta-row keys)

---

**Total deviations:** 3 auto-fixed (1 Rule 1 bug, 2 Rule 2 missing critical)
**Impact on plan:** All deviations strictly required for the read-path swap to render correctly on M3 nested data. No scope creep — every change stays within the plan's 9-surface boundary plus the formatPrice utility (which is reached only by these 9 surfaces in this plan; PropertyDetailsScreen in Plan 02-06 also benefits).

## Issues Encountered

- **Pre-existing jest baseline failures:** 8 test suites fail / 4 tests fail on `npm test`. Verified pre-existing via `git stash; npm test` against HEAD (returns identical failure profile). Failures span axios interceptor mock missing in PropertyService.test.ts, useRole `manageListings` post-cutover test drift, and jest haste-map collisions from stale parallel-execution worktree directories under `.claude/worktrees/agent-*`. None of the failing tests touch any of the 9 plan files. Logged to `deferred-items.md` (Plan 02-05 entry).
- **TypeScript errors in non-plan files (105 lines):** App.tsx, DeleteListingModal, ChatComposeScreen, ChatScreen, CreateListingScreen, CreateListingForm/, PropertyDetailsScreen all still read flat-shape fields (`title`, `tours`, `images`, etc.). These are Phase 1 D-01 atomic-break carry-forwards; Plans 02-06 / 02-07 / 02-08 own those files per D-22. The 9 plan-scope files are TS-clean.

## User Setup Required

None — no external service configuration required. Pure read-path field-name swaps in existing presentational components.

## Next Phase Readiness

**Ready for Plan 02-06 (PropertyDetailsScreen read-path cutover):**
- formatPrice utility already nested-aware — Plan 02-06 inherits the fix.
- ListingMetaTable already accepts optional `property` prop — Plan 02-06 just opts in.
- PropertyMap already nested-aware (PropertyDetailsScreen embeds it).
- HospitalityCard already nested-aware (PropertyDetailsScreen Hospitality branch reuses).
- 10 new i18n keys already in place — Plan 02-06 may reuse directly.

**Ready for Plan 02-07 (App.tsx flag swap):** all list-screen Property props consume nested shape; the new `<ContextualListingFlow>` will write nested-shape payloads (Plans 02-02/03/04) and the read sides (this plan + 02-06) consume them. App.tsx swap becomes a flag rename + import update with no shape-mismatch risk.

**Pitfall 4 mitigation:** Phase 1 atomic-break window for the 9 list/card surfaces is now closed. PropertyDetailsScreen remains the last broken read path until Plan 02-06 ships.

## Self-Check: PASSED

- All 5 task commits exist:
  - `f2cf2f8` ✓ feat(02-05): swap PropertyCard + formatPrice to nested Phase 1 shape
  - `8a9efb6` ✓ feat(02-05): swap HospitalityCard to nested Phase 1 shape
  - `5a2d64e` ✓ feat(02-05): swap 4 list screens to nested Phase 1 shape (Tradeoff §K)
  - `583eb63` ✓ feat(02-05): swap PropertyMap + ListingMetaTable to nested Phase 1 shape
  - `3f5114a` ✓ docs(02-05): log pre-existing jest baseline failures
- All 9 plan-scope files exist + modified (verified via `git diff f2cf2f8^..HEAD --stat`).
- All 11 must_haves.truths observable (grep + manual code reading):
  1. ✓ HomeScreen reads via nested + Tradeoff §K hospitality rule
  2. ✓ FavoritesScreen reads via nested + matches HomeScreen derivation
  3. ✓ RenterListingsScreen 4-tab + edit entry point still functional; reads nested
  4. ✓ OwnerListingsScreen mirrors RenterListings nested swap
  5. ✓ PropertyCard reads basics/media/content/location
  6. ✓ HospitalityCard reads top-level maxGuests + amenities (D-21) + media.tourUrl + basics.hotelClass
  7. ✓ HospitalitySection.tsx unchanged (caller-side derivation only)
  8. ✓ ListingMetaTable optional property prop reads basics + conditionAndAmenities + terms
  9. ✓ PropertyMap reads location.coordinates.{lat,lng}
  10. ✓ HomeScreen district filter chips REMAIN HARDCODED (D-10)
  11. ✓ Existing tests still green (the same 335-pass/4-fail baseline as HEAD; failures pre-existing).

---
*Phase: 02-6-step-contextual-listing-flow-client*
*Plan: 05*
*Completed: 2026-05-06*

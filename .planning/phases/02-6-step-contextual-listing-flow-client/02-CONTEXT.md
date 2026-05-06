# Phase 2: 6-Step Contextual Listing Flow (Client) - Context

**Gathered:** 2026-05-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace M1's single-screen `CreateListingScreen.tsx` (996 LOC) and its M1-Phase-4 `CreateListingForm/` sub-component barrel with a new 6-step `<ContextualListingFlow>` per `.planning/phases/999.1-contextual-listing-flow-m3-anchor/SPEC.md` v2 — atomically, with no dual-flow window. The new flow ships as a single overlay in `App.tsx` with internal step-index navigation. Per-step `validateStep(stepN, formState)` is the single source of truth (mirrors M1 Phase 5 `validateByCategory()`). Step 6 fields are gated by Step 1's `dealType`; Step 3 sub-fields and Step 2's exact-address toggle are gated by Step 1's `propertyType`.

**Phase 2 expanded scope (folded in via discussion):**

1. **The 6-step flow itself** — FLOW-01..FLOW-16 from REQUIREMENTS.md.
2. **Backend `Location` dictionary** — new `City` + `District` models, `GET/POST` endpoints, mod-approval status enum, mod queue tab for pending locations, seed migration with starter KG/KZ/UZ list (planner drafts; user reviews). Lands in this phase because the user-facing chip + "Other → free-text → submitted as `pending`" UX ships here; users can submit a listing with a custom district end-to-end on the day Phase 2 ships.
3. **RN client read-path cutover** — `HomeScreen` / `FavoritesScreen` / `RenterListingsScreen` / `OwnerListingsScreen` / `PropertyDetailsScreen` / `PropertyCard` updated to read the nested shape (`location.city/district/coordinates/showExactAddress`, `basics.areaSqm/price/currency/rooms/bathroom/kitchen/hotelRooms/hotelClass`, `conditionAndAmenities.condition/furnished`, `content.title/description/language`, `terms.negotiable/deposit/prepaymentMonths/minTerm`, `media.photos/videos/tourUrl`). This closes the atomic-break window that Phase 1 D-01 opened — testers unblock the day this phase ships.

**Touches both repos:**
- **RN client** (`/Users/beckmaldinVL/development/mobileApps/JayTap`) — new `<ContextualListingFlow>` component tree under `src/components/ContextualListingFlow/`; `validateStep()` validators; `propertyToFormBag()` + `formBagToPropertyPayload()` adapters; updates to 6 read-path screens/components; deletion of `src/screens/CreateListingScreen.tsx` + `src/components/CreateListingForm/` barrel; `App.tsx` overlay flag swap (`isCreateListingOpen` → `isContextualListingFlowOpen`); +80–120 EN+RU keys.
- **Backend** (`/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services`) — new `Location` model (or `City` + `District`); `src/routes/locationRoutes.js` (GET/POST cities + districts); seed migration script `src/scripts/seed-locations-m3.js`; `moderationRoutes.js` extension for location-curation queue tab; mod-approval status enum on Location docs.

**Requirements covered:** FLOW-01..FLOW-16 (16 reqs).

**Explicitly NOT in this phase (boundary anchors for downstream):**
- Media flow inversion (mod media-curation view + `POST /api/moderation/listings/:id/media` + S3 IAM update + `MEDIA_REQUIRED` invariant) — Phase 3 (MEDIA-01..MEDIA-09).
- ROLE-11 frontend mid-action 403 popup-recovery — Phase 4 (CARRY-01).
- Phase 4.5 landlord-application uid-mismatch fix — Phase 4 (CARRY-02).
- v3.0.0 atomic version bump + manual physical-device QA matrix + dual-store submission — Phase 5 (REL-01..REL-06).
- 2GIS native bridge migration — M4+ per `2GIS_BRIDGE_PLAN.md` (PROJECT.md Out of Scope confirmed). Phase 2 ships `react-native-maps` for the pin picker; M4 swaps to 2GIS as a coordinated read+write change.
- HomeScreen district filter chips dynamic-from-dictionary swap — M4+ carry-forward. Phase 2 leaves the existing hardcoded Bishkek microdistricts filter intact.
- Auto-geocoding from typed address (Nominatim) — eliminated. Map pin replaces it; `geocodeAddress` backend function is no longer called from the user-facing create-listing flow (memory `geocoder-nominatim-hang-axios-network-error.md` resolved by inversion of input modality).

</domain>

<decisions>
## Implementation Decisions

### Form state + validation architecture

- **D-01 (Library — useState + pure validateStep, no RHF/zod):** The new `<ContextualListingFlow>` orchestrator owns a single `useState<FormBag>` and a single `useState<FormErrorBag>`. Validation is a pure module-level function `validateStep(stepN: 1..6, values: FormBag): { isValid, errors }` per FLOW-12. Mirrors M1 Phase 5 precedent (`src/components/CreateListingForm/validators.ts` `validateByCategory()`). Zero new package dependencies — `react-hook-form@7.73+` + `zod@^3.24` from CLAUDE.md "if adopted" path is REJECTED for this phase: the 6 steps are chip-enum + numeric inputs + 2 text fields, RHF/zod's strengths (controlled-input plumbing, async resolvers, typed schemas) don't pay off; M1 + M2 ship this app entirely without form libraries. STACK.md row remains true (RHF+zod adoption-ready) but unused.

- **D-02 (Single orchestrator with `values / onChange / errors` SectionProps contract):** FormBag and FormErrorBag live in the orchestrator (`<ContextualListingFlow>`); each Step component receives `{ values, onChange<K>(field, v), errors }` exactly like M1 Phase 4's `SectionProps` interface (`src/components/CreateListingForm/types.ts` line ~74 verbatim). No Context provider; no per-step lifted state. Single mounting point keeps cross-step reactivity (e.g., "Step 1 dealType determines Step 6 visible fields") trivial.

- **D-03 (Currency tokens — adopt SPEC `'KGS' | 'USD' | 'EUR'` from day 1):** New FormBag stores currency as the canonical SPEC token. Submit payload matches SPEC `basics.currency: 'KGS' | 'USD' | 'EUR'` directly. M1 + M2 currency utilities (`src/utils/formatPrice.ts` if exists, PriceSection's `'$' | 'сом'` token const) get adapted to the new tokens during read-path cutover. EUR chip is new — added per PROJECT.md Current Milestone bullet ("Currency expansion — add EUR chip alongside KGS + USD"). Legacy `'$'` and `'сом'` literals must be grepped + replaced; a brief sweep before final commit is part of execute-phase scope.

- **D-04 (Test scope — validateStep unit tests + RTL component smokes; full QA matrix in Phase 5):** Phase 2 ships:
  - Unit tests for `validateStep()` covering every step's required fields, every conditional branch (`propertyType` × `dealType` matrix where applicable, exact-address-hidden-for-hotel-hostel, Step 6 deal-type matrix per SPEC §6).
  - RTL component smokes per step verifying conditional sub-fields render correctly (e.g., `bathroom` chip appears for office/commercial only; `hotelRooms` for hotel/hostel only).
  - Adapter tests for `propertyToFormBag()` and `formBagToPropertyPayload()`.
  - One end-to-end-shaped integration test walking Step 1→6 for a representative `apartment + rent_long` combo (covers the most common path).
  Backend Location-routes coverage: supertest cases for `GET/POST /api/locations/cities`, `GET/POST /api/locations/cities/:cityId/districts`, mod-approval flow, dedupe (case-insensitive normalize). Manual physical-device QA matrix (`6-step flow happy path × 5 property types × 3 deal types = 15 cells` + conditional sub-field cells + exact-address-hidden cells) belongs to Phase 5 REL-03.

### Step 2 — Location capture

- **D-05 (Location dictionary — backend-persisted, mod-approval flow):** New backend Location surface:
  - **Models:** `City { _id, slug, label: { ru, en }, country: 'KG'|'KZ'|'UZ', centroid: { lat, lng }, status: 'approved'|'pending'|'rejected', createdByUid, createdAt, approvedByUid?, approvedAt?, rejectedByUid?, rejectedAt? }` and `District { _id, cityId, slug, label: { ru, en }, status: 'approved'|'pending'|'rejected', createdByUid, createdAt, approvedByUid?, approvedAt?, rejectedByUid?, rejectedAt? }` (or unified `Location` with `kind: 'city'|'district'` + `parentId`). Researcher/planner picks the schema shape; both work. Slug normalization for dedupe (lowercase + diacritic-strip + trim).
  - **Endpoints:** `GET /api/locations/cities` (returns approved + caller's own pending), `POST /api/locations/cities` (auth required; creates pending), `GET /api/locations/cities/:cityIdOrSlug/districts` (same scoping rule), `POST /api/locations/cities/:cityIdOrSlug/districts` (auth required; creates pending). Approval endpoints under `/api/moderation/locations/:id/approve` + `/reject` (mod-only).
  - **Mod queue tab:** `ModerationQueueScreen` gets a new "Locations" filter/tab alongside the existing "Pending listings" / "Rejected" / "Archived" tabs (M2 Phase 3 + Phase 4 pattern). Shows pending cities + districts; mod taps approve/reject with optional rejection reason.
  - **Anti-spoofing:** `createdByUid` sourced exclusively from `req.firebaseUid` (JWKS-verified), not request body. M2 Phase 1 HF-03 anti-spoofing grep gate pattern carries forward — `grep -nE "createdByUid:\s*req\.(body|headers)" src/routes/locationRoutes.js` exits 0 at phase close.
  - **Spam guard:** Rate-limit `POST /api/locations/*` per uid (e.g., 10/hour). Mod-rejection of a name puts it on a 30-day blocklist for the same uid.

- **D-06 (Seed migration — planner drafts canonical KG/KZ/UZ starter list for user review):** A `src/scripts/seed-locations-m3.js` operator-supervised one-shot (`--dry-run` + `--verify=PASS`, M2 Plan 02-02 + M3 Plan 01-02 pattern) seeds the starter cities + districts as `status: 'approved'`. Researcher pulls a starter list from public sources (Wikipedia city/district listings for KG/KZ/UZ, with focus on Bishkek + Osh + Karakol + Cholpon-Ata + Naryn for KG, Almaty + Astana + Shymkent for KZ, Tashkent + Samarkand + Bukhara for UZ; planner finalizes coverage). Starter list goes into `src/scripts/seed-locations-m3-data.json` for user review on the PR. User can edit the JSON before the seed runs in production. `centroid` per city: planner researches lat/lng (e.g., Bishkek `42.8746, 74.5698` already in `PropertyMap.tsx`); minor cities use the city's centroid via Wikipedia / OSM. Operator runs seed against production Atlas BEFORE Phase 2 backend cutover ships (so the chip lists are non-empty on first user open).

- **D-07 (Step 2 UI — chip rows + "Other" → TextInput → POST as pending):**
  - **City row:** Horizontal scroll chip row (KG/KZ/UZ approved cities ordered by country then alphabetic) + "Other" chip at the end. Tapping "Other" opens a TextInput modal with i18n label + submit. On submit: `POST /api/locations/cities` with `{ label: { ru: typed, en: typed }, country: 'KG'|'KZ'|'UZ' (inferred from default or asked) }`; backend creates `pending` record; UI immediately uses the pending entry for THIS listing (chip not yet visible to other users until mod-approves). Listing's `location.city` stores the city slug (or `_id` — planner decides; slug is more stable across env).
  - **District row:** Same shape, but options filtered to selected city. Disabled until city is chosen.
  - **Map pin:** see D-08.
  - **Exact-address toggle:** Hidden if `propertyType ∈ {hotel, hostel}` (forced `true`); visible otherwise (default `false` → 200–300m radius display on read screens).
  Free-text writes do NOT block step advancement — user types, taps submit, advances immediately while the POST is in flight (optimistic with rollback on 4xx error).

- **D-08 (Map pin — `react-native-maps` draggable Marker + tap-to-drop initial; coordinates REQUIRED):**
  - Step 2 mounts `<MapView provider={PROVIDER_DEFAULT} style={...} initialRegion={cityCenters[selectedCity]}>` — same library that already ships in `src/components/PropertyMap.tsx` and `src/screens/PropertyDetailsScreen.tsx`.
  - Initial state: no marker rendered. User taps anywhere on the map → marker appears at tap location (`onPress` writes `{lat, lng}` to FormBag). After first drop, marker becomes draggable: `<Marker draggable onDragEnd={e => setCoords(e.nativeEvent.coordinate)} />`. User can refine by dragging.
  - Coordinates required to advance Step 2 (FLOW-05 verbatim).
  - Map recenters on selected city's coords when user switches city chip (`useEffect` watching `values.location.city`).
  - 2GIS native bridge swap deferred to M4 as a coordinated read+write change per `2GIS_BRIDGE_PLAN.md`.
  - Eliminates Nominatim auto-geocoding hang from the user-facing create flow (memory `geocoder-nominatim-hang-axios-network-error.md` mitigated by inversion of modality — pin-first, no typed-address path).

- **D-09 (`cityCenters` data source — same starter-list seed):** The seed migration's starter cities each include a `centroid: { lat, lng }`. RN client reads cities + their centroids from the same `GET /api/locations/cities` payload (centroid is part of the response). On "Other" city creation, user is asked to drop a pin first to derive the centroid (or backend computes it from the first listing's pin if not provided at creation time — planner picks the cleaner path). Avoids a separate hardcoded `cityCenters.ts` const drifting from the dictionary.

- **D-10 (HomeScreen district filter — stays hardcoded in Phase 2; M4+ carry-forward):** HomeScreen's existing district filter (Bishkek microdistricts hardcoded at `src/screens/HomeScreen.tsx:65-93`) is NOT swapped to read the dynamic dictionary in this phase. Phase 2's read-path cutover updates HomeScreen to render the new nested shape, but the filter chip source stays on the existing const. M4 owns the dynamic-filter swap. Tradeoff acknowledged: users browsing Home will not see new districts as filter chips until M4, but listings tagged with new districts still appear in the unfiltered list and in property-detail screens.

### Container shape + flow navigation in App.tsx

- **D-11 (Single overlay flag with internal step-index state — replaces `isCreateListingOpen`):** `App.tsx` adds `isContextualListingFlowOpen: boolean` and removes/replaces `isCreateListingOpen`. The component owns its own `useState<1|2|3|4|5|6>('currentStep')` for step navigation. Back/Next buttons inside the component `setCurrentStep(n - 1 | n + 1)`. Hardware back / Android back maps to `setCurrentStep(n - 1)` when `currentStep > 1`, else triggers exit-flow confirm modal (D-13). `App.tsx` does NOT track `currentStep` — keeps `App.tsx`'s 1215-LOC budget tight (existing soft-cap concern per `.planning/codebase/CONCERNS.md`).

- **D-12 (Six step components under `src/components/ContextualListingFlow/steps/`):** New folder structure:
  - `src/components/ContextualListingFlow/index.tsx` — orchestrator (FormBag state, validateStep, step switcher, submit)
  - `src/components/ContextualListingFlow/Step1DealAndPropertyType.tsx`
  - `src/components/ContextualListingFlow/Step2Location.tsx`
  - `src/components/ContextualListingFlow/Step3BasicInfo.tsx`
  - `src/components/ContextualListingFlow/Step4ConditionAmenities.tsx`
  - `src/components/ContextualListingFlow/Step5TitleDescription.tsx`
  - `src/components/ContextualListingFlow/Step6DealConditions.tsx`
  - `src/components/ContextualListingFlow/validators.ts` — `validateStep(stepN, values)` pure function (mirrors M1 Phase 5 `validators.ts`)
  - `src/components/ContextualListingFlow/adapters.ts` — `propertyToFormBag()` + `formBagToPropertyPayload()` pure adapters
  - `src/components/ContextualListingFlow/types.ts` — FormBag, FormErrorBag, SectionProps (matches M1 Phase 4 module pattern)
  - `src/components/ContextualListingFlow/styles.ts` — shared StyleSheet
  - `src/components/ContextualListingFlow/__tests__/validators.test.ts`
  - `src/components/ContextualListingFlow/__tests__/adapters.test.ts`
  - `src/components/ContextualListingFlow/__tests__/Step{1..6}.test.tsx` (RTL component smokes)
  - `src/components/ContextualListingFlow/__tests__/integration.test.tsx` (Step 1→6 walk for `apartment + rent_long`)

- **D-13 (Mid-flow back / discard handling — silent in-flow Back, confirm only on exit):**
  - Tapping the in-component "Back" button at Steps 2–6 silently decrements `currentStep`. No confirm. Form state is preserved across back-navigation.
  - Tapping the in-component close (X) button at any step OR Hardware/Android back at Step 1 triggers an `Alert.alert(t('contextualListing.discardConfirm.title'), t('contextualListing.discardConfirm.body'), [{text: t('common.cancel')}, {text: t('contextualListing.discardConfirm.confirm'), style: 'destructive', onPress: closeFlow}])`.
  - Form state is in-memory only — no AsyncStorage draft persistence. Closing the flow loses progress. Tradeoff accepted: avoids stale-draft staleness + multi-listing-in-progress edge cases + draft-vs-edit-listing collision + schema-evolution migration. Re-evaluate in M4+ if user feedback demands draft resume.

- **D-14 (Progress indicator — "Step N of 6" text + segmented progress bar):** Header above step body renders `{currentStep} / 6` (or i18n-driven "Step 3 of 6" / «Шаг 3 из 6») on the left, and a 6-segment horizontal bar on the right. Filled segments through `currentStep` use `colors.primary`; remaining use `colors.surfaceMuted` (or equivalent useTheme tokens). Themeable; dark/light parity required.

### Edit-on-behalf wiring + submit destination

- **D-15 (Single component with `mode` + `initialListing?` props):** `<ContextualListingFlow>` accepts:
  - `mode: 'create' | 'edit-owner' | 'edit-mod'` (required)
  - `initialListing?: Property` (required when `mode !== 'create'`, ignored otherwise — TypeScript enforces via discriminated union)
  - `moderatorContext?: { editingOwnerUid: string; reason?: string; ownerEmail?: string }` (required when `mode === 'edit-mod'`, matches M2 MOD-14 prop shape verbatim from `src/screens/CreateListingScreen.tsx:54-59`)
  - `onClose: () => void` (caller decides destination; see D-17)
  Step components are pure renderers of FormBag + errors — `mode` only affects banner rendering (D-18) + submit path (D-16) + onClose destination (D-17).

- **D-16 (Submit path by mode):**
  - `mode === 'create'`: `POST /api/properties` with `formBagToPropertyPayload(values)`. Server defaults `status: 'pending'` (M2 MOD-03 + M2 D-22 backend sanitizer + Phase 1 D-01 cutover). Client does NOT send `status` in the body (M2 D-22 / D-01 user-facing-draft removal).
  - `mode === 'edit-owner'`: `PUT /api/properties/:id` with `formBagToPropertyPayload(values)`. Server applies M2 D-22 rejected→pending auto-flip if listing was rejected. M2 RejectionBanner rendering preserved on edit-resubmit path (FLOW-13 verbatim).
  - `mode === 'edit-mod'`: Calls existing `editAsModerator(listingId, payload, reason)` (M2 MOD-14 path); server flips status to `live` per M2's "mod fixed it = ready to publish" semantics. moderatorContext.reason logged in ModerationLog (M2 audit pattern carries forward).

- **D-17 (Submit success destination by mode):**
  - `mode === 'create'` → close flow + open `RenterListingsScreen` with `defaultTab: 'pending'` (existing App.tsx state per `defaultRenterListingsTab` + `setRenterListingsRefreshKey(k => k + 1)` to force re-fetch).
  - `mode === 'edit-owner'` → same as create (RenterListings 'pending' tab — they'll see their re-submitted listing back in pending). Special case: if pre-edit status was `live` and the edit didn't trigger a moderation re-pend (planner verifies M2 backend behavior), land on the `live` tab instead.
  - `mode === 'edit-mod'` → close flow + return to ModerationQueueScreen with `setModerationCountRefreshKey(k => k + 1)` to refresh the queue.

- **D-18 (Mod-context banner — persists across Step 1–6, reuses M2 i18n keys):**
  - Banner renders ABOVE the step body (between progress indicator header and step content), persistently visible on Steps 1–6 when `moderatorContext != null`. Mounting point: the orchestrator's render tree, not per-step duplication.
  - Renders existing M2 keys: `t('moderation.editOnBehalf.banner').replace('{ownerEmail}', moderatorContext.ownerEmail || moderatorContext.editingOwnerUid)` + optional `moderatorContext.reason` body. Pattern transplanted from `src/screens/CreateListingScreen.tsx:722-740` verbatim.
  - Style: `backgroundColor: colors.warningSubtle` (or equivalent token), `padding: 12`, theme-aware. No new i18n keys needed for the banner — entirely reuses M2's `moderation.editOnBehalf.banner` + `moderation.editOnBehalf.reason` keys.
  - ROADMAP SC #5 reading: "banner stripe at the TOP of Step 1" is satisfied — and the banner just continues to be visible on Steps 2–6 by virtue of being above the step body, not below it.

### Step 6 — daily rent treatment

- **D-19 (Daily rent gets its own Step 6 — separate, predictable structure):** Per SPEC §"UX note — daily rent Step 6 is thin", daily-rent Step 6 renders only the optional `deposit` input. SPEC's recommendation followed: "predictable structure beats minor screen savings." Progress bar still shows `6 of 6` for all paths. Validation rule for daily rent Step 6: nothing required to advance (deposit is optional). User can tap Submit (the Next button morphs to Submit on Step 6) immediately.

### Read-path cutover (M2 list/detail screens) — folded into Phase 2

- **D-20 (Read-path cutover — six surfaces, atomic with new flow):** Phase 2 updates the following to read the nested shape (per Phase 1 D-01 atomic-break carry-forward):
  - `src/screens/HomeScreen.tsx` — list rendering, search filter (price/area/rooms), district filter (stays on hardcoded const per D-10).
  - `src/screens/FavoritesScreen.tsx` — list rendering of favorited properties.
  - `src/screens/RenterListingsScreen.tsx` — 4-tab segmented control (live/pending/rejected/archived), list rendering, edit entry point.
  - `src/screens/OwnerListingsScreen.tsx` — owner's own listings list.
  - `src/screens/PropertyDetailsScreen.tsx` (1680 LOC, largest screen) — full detail render including map embed, hospitality branch, price/area/rooms display, condition/amenities, terms, media gallery.
  - `src/components/PropertyCard.tsx` (492 LOC) — shared card component used by Home + Favorites + RenterListings + OwnerListings.
  - `src/components/HospitalityCard.tsx` + `src/components/HospitalitySection.tsx` — M1 Phase 6 hospitality strip; reads `propertyType ∈ {hotel, hostel}` + `media.tourUrl` + `basics.hotelClass`.
  - `src/components/PropertyMap.tsx` — read-only list view; reads `location.coordinates`.
  - `src/components/ListingMetaTable.tsx` — meta row rendering on PropertyDetails (reads basics + conditionAndAmenities + terms).

  Cutover strategy: per-screen unit + light snapshot test updates land alongside each screen's read-path swap. Compile-time safety via Phase 1's `src/types/Property.ts` stub (which Phase 1 D-19 type-stub commitment provides — Phase 2 verifies the stub is full nested-shape; if Phase 1 shipped a union, Phase 2 narrows it to canonical nested-only).

- **D-21 (M1 Hospitality top-level fields — `maxGuests` + `amenities[]` — read paths preserved):** Per Phase 1 D-09, `maxGuests: number` and `amenities: HospitalityAmenity[]` stay at the top level of every Property doc post-migration (NOT moved under `basics.hospitality`). Phase 2 read-path cutover keeps the existing M1 Phase 6 read sites for these fields verbatim — `HospitalityCard.tsx` still reads `property.maxGuests` and `property.amenities`. No code change for these two fields beyond verifying the nested-shape migration didn't accidentally drop them.

### Atomic deletion (FLOW-14)

- **D-22 (Old screen + barrel deleted in the LAST commit of Phase 2, after new flow is verified working):** Plan sequence:
  - Plan 02-01: Backend Location dictionary (models + endpoints + mod queue tab + seed migration + tests). Deploys to Railway. Atomic commit on backend repo.
  - Plan 02-02: New `<ContextualListingFlow>` skeleton + Step 1 + validators + adapters + i18n keys. Tests: validators, adapters, Step 1 RTL.
  - Plan 02-03: Steps 2 (Location with chip rows + map pin) + Step 3 (BasicInfo with conditional sub-fields) + tests.
  - Plan 02-04: Steps 4 (ConditionAmenities) + Step 5 (TitleDescription) + Step 6 (DealConditions matrix) + tests.
  - Plan 02-05: Read-path cutover (HomeScreen + FavoritesScreen + RenterListingsScreen + OwnerListingsScreen + PropertyCard + HospitalitySection + HospitalityCard + ListingMetaTable + PropertyMap; PropertyDetailsScreen separately or split).
  - Plan 02-06: Read-path cutover for PropertyDetailsScreen (largest screen — own plan).
  - Plan 02-07: Wire `<ContextualListingFlow>` into App.tsx (replaces `isCreateListingOpen` flag + import). Run integration test.
  - Plan 02-08: **Atomic deletion** — `src/screens/CreateListingScreen.tsx` + `src/components/CreateListingForm/*` + their `__tests__/` files. `App.tsx` import line removed. Final i18n key cleanup (any keys orphaned by the deletion). Final commit.
  Plan structure is researcher/planner discretion — above is a sketch; planner may merge/split based on cost/coverage balance. The ATOMIC INVARIANT: Plan 02-08 (or its equivalent) is the final commit, and no commit between Plan 02-07 and Plan 02-08 ships both the old screen AND the new flow live to user (App.tsx imports only one of them at a time per commit).

### Claude's Discretion

- **Step 1 layout:** SPEC says "Two single-select questions on the same screen" — Both visible simultaneously vs sequential reveal (Property Type chips appear after Deal Type picked). Planner picks; both work. Recommend simultaneous (less surprising; both required to advance per FLOW-12).

- **Mod queue location-curation tab UI:** New tab on `ModerationQueueScreen` for pending locations. Tab label, sort order, reject-reason copy, and approve/reject mod-action footer style — planner picks based on M2 Phase 3's existing tab pattern.

- **`Location` model unified vs split:** D-05 sketches both `City` + `District` as separate models AND a unified `Location` with `kind` discriminator. Planner picks; both work. Recommend split (cleaner FK semantics; matches Mongo norms better).

- **Slug generation strategy:** D-05 mentions "lowercase + diacritic-strip + trim". Planner picks the exact normalization (e.g., `slugify(label.en)` vs `transliterate(label.ru)`). Edge case: Cyrillic-only city name with no English label needs a slug strategy.

- **Mod-rejection 30-day blocklist for repeated user-rejected location names:** D-05 mentions this as a spam guard. Planner picks whether to ship in Phase 2 or defer to a hardening pass. Cheap ship; cheap defer.

- **City-of-other → centroid derivation:** D-09 sketches two paths (user drops pin first / backend computes from first listing's pin). Planner picks. Recommend backend-computes (avoids extra interaction step for the user).

- **Step 2 chip row layout when KG/KZ/UZ approved cities exceed ~6:** Horizontal scroll vs wrap-to-multiline vs autocomplete TextInput swap. Planner picks based on RTL/i18n-aware design.

- **Map provider on Android:** `react-native-maps` defaults to Google Maps on Android (requires Google Maps API key in `AndroidManifest.xml` — assume already configured per existing `PropertyMap.tsx` usage). If API key is missing or restricted, Android pin picker fails silently. Planner verifies Android map renders during Phase 5 device QA; researcher checks the manifest entry exists.

- **Error scroll-to-first-error pattern:** M1 Phase 5 D-04 established a per-category field-order scroll-to-first-error pattern. Phase 2 inherits this — `validateStep` returns errors keyed by FormBag field; on Submit/Next, if `!isValid`, scroll to the first error per a `FIELD_ORDER_PER_STEP` const (mirrors M1's `FIELD_ORDER_BY_CATEGORY`).

- **Empty state when no approved districts exist for a selected city:** UI affordance — show "No districts yet — be the first to add one" copy + immediate "Other" TextInput? Or just hide chip row and show TextInput? Planner picks based on UX feel.

- **Nested-shape compat in `HospitalitySection.tsx` derivation:** The M1 Phase 6 `hospitalityProperties` derivation (filter by `propertyType ∈ {hotel, hostel}` AFTER `transactionType` filter per Key Decision row 207) uses the OLD `transactionType: 'rent' | 'sale'`. With nested shape, the equivalent is `dealType: 'sale' | 'rent_long' | 'rent_daily'`. Planner picks the new derivation — likely `dealType !== 'sale'` for the rent strip, mirroring M1.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project-level requirements & scope

- `.planning/PROJECT.md` — Current Milestone v3.0 M3 "Contextual Forms"; geographic scope (KG/KZ/UZ — not Bishkek-only); locked decisions (M1 9-type 3-category taxonomy preserved; M2 status enum unchanged; no `react-navigation`; no Firebase SDK in either repo; backend repo at `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services`); Out of Scope (`2GIS native map bridge`, payment/booking, KZT/UZS currencies).
- `.planning/REQUIREMENTS.md` — FLOW-01..FLOW-16 acceptance criteria for the 6-step flow (REQUIREMENTS.md §"Contextual flow (Phase 2) — 6-step UI"); MEDIA-01 (no media fields in user flow — Phase 3 pre-condition); CARRY-01..02 (Phase 4 boundary); REL-01..06 (Phase 5 boundary); hard rules (no Firebase SDK; no `react-navigation`; M1 taxonomy preserved; EN+RU CI parity gate).
- `.planning/ROADMAP.md` §"Phase 2: 6-Step Contextual Listing Flow (Client)" — Goal + Depends on (Phase 1 nested schema) + 5 Success Criteria + UI hint: yes.

### Anchor SPEC

- `.planning/phases/999.1-contextual-listing-flow-m3-anchor/SPEC.md` Version 2 — anchor SPEC. Load-bearing sections for Phase 2:
  - §"High-Level Flow" — 6-step structure with deal-type branch on Step 6.
  - §"Step 1 — Deal Type & Property Type" — chip values + EN/RU labels (`sale | rent_long | rent_daily` × `apartment | house | office | commercial | hotel`); M1 9-type 3-category taxonomy reframing per CLAUDE.md guard reads `hotel | hostel` as 2 separate sub-types.
  - §"Step 2 — Location" — city/district required, map pin required, exact-address toggle conditional on `propertyType ∈ {hotel}` (read M1 → M3 reframing as `propertyType ∈ {hotel, hostel}`).
  - §"Step 3 — Basic Information" — always-shown fields (areaSqm, price, currency `'KGS'|'USD'|'EUR'`); conditional sub-fields per propertyType.
  - §"Step 4 — Condition & Amenities" — always-shown for every propertyType including hotel/hostel (per Decision #4 — supports rural / ethno properties).
  - §"Step 5 — Title & Description" — title + description required; explicit "Photos, videos, and 3D tours are not part of this step" — Phase 3 owns media curation.
  - §"Step 6 — Deal Conditions" — gated-by-dealType matrix; daily rent UX note (Decision: separate step per D-19); Prepayment input shape (preset 0/1/2 + Custom integer); admin platformConfig.depositsEnabled toggle (Phase 2 reads if available; if not, default to true).
  - §"Validation Rules" — verbatim source for `validateStep()` per FLOW-12.
  - §"Suggested Data Shape" — verbatim source for `formBagToPropertyPayload()` adapter target shape.
  - §"Decisions Log" — Decisions #1 (all combinations allowed), #6/#7 (photos/3D tour from user flow — Phase 3 owns), #8 (currencies KGS/USD/EUR), #9 (RU+EN at launch).

### Prior phase references (carries forward as patterns)

- `.planning/phases/01-schema-reshape-backend-route-shape-cutover/01-CONTEXT.md` — Phase 1 implementation decisions:
  - §D-01 (atomic-break cutover) — Phase 2 ship is what closes the M2-client-broken window.
  - §D-04..D-15 — schema field mapping policy; Phase 2's `formBagToPropertyPayload()` adapter must match D-04..D-15 verbatim or risk asymmetric write→read shape mismatches.
  - §D-09 — Hospitality `maxGuests` + `amenities[]` preserved top-level (Phase 2 read paths still source from top-level).
  - §"Claude's Discretion" — `Property.ts` type stub shape (full nested vs union); Phase 2 either consumes the stub directly or narrows it.
- `.planning/milestones/v1.0.4-phases/04-listing-form-taxonomy-and-decomposition/` — M1 Phase 4 PLAN + CONTEXT (CreateListingForm/ sub-component barrel; SectionProps contract; FormBag types pattern).
- `.planning/milestones/v1.0.4-phases/05-listing-form-validation-and-edit-flow/` — M1 Phase 5 PLAN + CONTEXT (`validateByCategory()` single-source-of-truth pattern; FIELD_ORDER_BY_CATEGORY scroll-to-first-error pattern).
- `.planning/milestones/v2.0-phases/03-moderation-queue-actions-edit-on-behalf/` — M2 Phase 3 (MOD-14 `moderatorContext` prop; `editAsModerator()` service path; mod queue tab structure; ModerationLog pattern).
- `.planning/milestones/v2.0-phases/01-backend-role-foundation-auth-migration-hotfix-bundle/` — M2 Phase 1 (anti-spoofing grep-gate pattern `grep -nE "uid:\\s*req\\.(body|headers)"` — Phase 2 reuses as `createdByUid` check for Location routes).

### Backend repo files (decision-shaping)

- `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/models/Property.js` — POST-Phase-1 nested-shape schema. Phase 2 backend write paths (`POST /api/properties`, `PUT /api/properties/:id`, `editAsModerator`) consume nested-shape bodies from the new client.
- `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/routes/propertyRoutes.js` — POST/PUT routes already cut over to nested in Phase 1 D-01. Phase 2 verifies bodies from new client are accepted; minor sanitizer additions if needed.
- `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/routes/moderationRoutes.js` — Existing approve/reject/edit-on-behalf/archive endpoints. Phase 2 EXTENDS with `/api/moderation/locations/:id/approve` + `/reject` for the new Location dictionary.
- `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/scripts/migrate-listings-m2.js` + `migrate-listings-m3.js` — pattern source for `seed-locations-m3.js`. Same `--dry-run` + `--verify=PASS` posture; sibling location at `src/scripts/`.
- `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/package.json` — `engines.node >= 22.12.0`; `nvm use 24` required for backend npm/node operations (memory `backend-node-version.md`). Seed migration runbook in `02-CONTEXT.md` Rollback section (added at plan-phase) must include `nvm use 24`.

### RN client repo files (decision-shaping)

- `src/types/Property.ts` — Phase 1 type stub (Phase 1 D-19 ships either full nested type or union). Phase 2 narrows to canonical nested-only at the start of execute-phase.
- `src/screens/CreateListingScreen.tsx` (996 LOC) — DELETED in Phase 2 (FLOW-14 + D-22). Read for `moderatorContext` prop shape (line 54-59); banner pattern (line 714-740); submit branch (line 533-546 — moderatorContext takes precedence over propertyToEdit).
- `src/components/CreateListingForm/` (entire barrel) — DELETED in Phase 2. Read for SectionProps contract (`types.ts` line ~74), FormBag shape (`types.ts` line ~16-71), `validateByCategory()` pattern (`validators.ts` line ~30-100), FIELD_ORDER_BY_CATEGORY scroll pattern.
- `src/components/PropertyMap.tsx` — `react-native-maps` `<MapView>` + `<Marker>` + `PROVIDER_DEFAULT` reference for D-08 pin picker; Bishkek default coords (`42.8746, 74.5698`) at line 17.
- `src/screens/PropertyDetailsScreen.tsx` (1680 LOC) — largest read-path cutover surface. Map embed at lines 959-979 + 1165-1185 (read `latitude`/`longitude` flat → `location.coordinates.lat/lng` nested).
- `src/screens/HomeScreen.tsx` — district filter chips (lines 65-93) stay hardcoded per D-10; nested-shape read updates for filter logic (lines 180+ — district matching) and list rendering.
- `src/components/PropertyCard.tsx` (492 LOC) — shared card; reads price + area + rooms + propertyType + media.photos[0]. Updated to nested shape.
- `src/components/HospitalityCard.tsx` + `src/components/HospitalitySection.tsx` — M1 Phase 6 hospitality strip; reads `propertyType ∈ {hotel, hostel}` + `media.tourUrl` + `basics.hotelClass`. Hospitality `maxGuests` + `amenities[]` still at top level per Phase 1 D-09.
- `src/components/RejectionBanner.tsx` + `src/components/HomeRejectionBanner.tsx` — M2 MOD-08/09 banners on PropertyDetails + Home; preserved unchanged on edit-resubmit path per FLOW-13.
- `App.tsx` (1215 LOC) — overlay flag swap (`isCreateListingOpen` → `isContextualListingFlowOpen`); existing `moderatorContext`, `propertyToEdit`, `defaultRenterListingsTab`, `setRenterListingsRefreshKey`, `setModerationCountRefreshKey` state already in place — Phase 2 wires through.
- `scripts/check-i18n-parity.sh` — CI gate; +80–120 EN+RU keys for Phase 2 must pass.

### Codebase analysis

- `.planning/codebase/CONVENTIONS.md` — Bilingual EN+RU parity (`src/locales/en.ts` + `src/locales/ru.ts`); `useTheme()` semantic tokens — no hardcoded colors; manual physical-device QA bar; co-located `__tests__/` for unit tests.
- `.planning/codebase/STRUCTURE.md` — `src/screens/CreateListingScreen.tsx` (996 LOC), `src/screens/PropertyDetailsScreen.tsx` (1680 LOC), `src/components/CreateListingForm/` barrel structure.
- `.planning/codebase/CONCERNS.md` — `App.tsx` 1215 LOC near soft-cap; tab persistence `display: none` keep-alive (preserved); `react-native-maps` reference in PropertyMap.tsx.
- `.planning/codebase/STACK.md` — React Native 0.84 New Architecture; Hermes + Fabric on both platforms; `react-native-maps` already installed; `react-native-keyboard-controller@1.21.6` + reanimated@4.3.0 (Phase 2 inherits keyboard handling — no new keyboard work).
- `.planning/codebase/INTEGRATIONS.md` — backend axios `apiClient.ts` with Bearer + 401/403 single-flight refresh (M2 ROLE-09); Firebase Identity Toolkit REST.

### Auto-memory pointers (cross-session knowledge)

- `~/.claude/projects/-Users-beckmaldinVL-development-mobileApps-JayTap/memory/no-firebase-sdk.md` — REPO RULE: no `firebase` / `@react-native-firebase/*` in either repo. Phase 2 does not touch auth-adjacent code; rule preserved by inaction.
- `~/.claude/projects/-Users-beckmaldinVL-development-mobileApps-JayTap/memory/identity-vs-user-store.md` — Firebase = identity-proof; MongoDB = role authority. Phase 2 Location dictionary uses `req.firebaseUid` (JWKS-verified) for `createdByUid`.
- `~/.claude/projects/-Users-beckmaldinVL-development-mobileApps-JayTap/memory/backend-repo-location.md` — Backend at `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services`; same maintainer.
- `~/.claude/projects/-Users-beckmaldinVL-development-mobileApps-JayTap/memory/backend-node-version.md` — Backend Node ≥22.12 (`nvm use 24`); Phase 2 backend npm/node ops require this; seed migration runbook must include the gate.
- `~/.claude/projects/-Users-beckmaldinVL-development-mobileApps-JayTap/memory/geographic-scope.md` — KG/KZ/UZ launch scope. D-06 starter list spans 3 countries; D-09 cityCenters covers 3 countries; D-05 Location.country enum is `'KG' | 'KZ' | 'UZ'`.
- `~/.claude/projects/-Users-beckmaldinVL-development-mobileApps-JayTap/memory/geocoder-nominatim-hang-axios-network-error.md` — Nominatim hang in `geocodeAddress`. Phase 2 ELIMINATES the auto-geocode call from user-facing flow (D-08 pin-first input modality). Backend `geocodeAddress` may still exist for legacy code paths but is no longer reached from create-listing.
- `~/.claude/projects/-Users-beckmaldinVL-development-mobileApps-JayTap/memory/m2-shipped-2026-05-05.md` — M2 baseline at backend SHA `2fb5639`; Phase 1 cutover stacked on top; Phase 2 backend Location work stacks on Phase 1.
- `~/.claude/projects/-Users-beckmaldinVL-development-mobileApps-JayTap/memory/gsd-verifier-misses-regressions.md` — Verifier + reviewer paired-gate posture. Phase 2 ships read-path cutover across 6 surfaces (regression risk class) — code review is mandatory after `gsd-execute-phase`.
- `~/.claude/projects/-Users-beckmaldinVL-development-mobileApps-JayTap/memory/aws-iam-jaytap-prod-s3.md` — `jaytap-prod-s3` IAM user. Phase 2 does NOT touch S3 IAM (Phase 3 owns the rotation per MEDIA-05); Phase 2 user-facing flow has zero media affordance per FLOW-* / SPEC §"Photos and 3D tours are uploaded post-submission".
- `~/.claude/projects/-Users-beckmaldinVL-development-mobileApps-JayTap/memory/phase06-m3-carry-forward.md` — Race-cell test rig + Android reanimated build doc + AWS IAM cross-project residual all M4+; Phase 2 does not address.
- `~/.claude/projects/-Users-beckmaldinVL-development-mobileApps-JayTap/memory/last-admin-lockout-semantics.md` — M2 Phase 5 admin role mgmt; not relevant to Phase 2.
- `~/.claude/projects/-Users-beckmaldinVL-development-mobileApps-JayTap/memory/android-reanimated-clean-prefab-gotcha.md` — `gradlew :react-native-reanimated:assembleRelease :app:bundleRelease`; relevant only at Phase 5 release.

### Reference (M4+ context)

- `2GIS_BRIDGE_PLAN.md` — multi-week M4+ project to swap `react-native-maps` for native 2GIS bridge. Phase 2 uses `react-native-maps` for the pin picker; M4 swap is a coordinated read+write change across all 6 read-path surfaces + the new Step 2 pin picker.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- **`react-native-maps` MapView/Marker/PROVIDER_DEFAULT** (`src/components/PropertyMap.tsx`, `src/screens/PropertyDetailsScreen.tsx`) — already in the project; D-08 reuses for the new draggable pin picker. Bishkek default coords (`42.8746, 74.5698`) constant pattern reusable for `cityCenters` derivation.
- **`useRole()` / `<Gated>`** (M1 Phase 3 + M2 Phase 1 ROLE-07) — Phase 2 uses `useRole()` to detect mod-edit mode (`mode === 'edit-mod'` requires `role === 'moderator' || role === 'admin'`).
- **`ModerationQueueScreen` tab structure** (M2 Phase 3 MOD-11) — pattern for the new "Locations" tab on the same screen; planner adds a tab that reads `GET /api/moderation/queue/locations` (or extends existing endpoint with a `kind` filter).
- **`apiClient.ts` Bearer + 401/403 single-flight refresh** (M2 ROLE-09) — Phase 2 backend Location endpoints + new write paths consume the existing apiClient; no auth code changes.
- **i18n pattern** (`src/locales/en.ts` + `src/locales/ru.ts` + `useLanguage().t()`) — adding 80–120 keys. Reuse `moderation.editOnBehalf.banner` + `moderation.editOnBehalf.reason` from M2 (D-18).
- **`useTheme()` semantic tokens** — colors, spacing tokens already established. New flow respects dark/light parity per CLAUDE.md.
- **M2 RejectionBanner + HomeRejectionBanner** (`src/components/RejectionBanner.tsx`, `src/components/HomeRejectionBanner.tsx`) — preserved verbatim on edit-resubmit path per FLOW-13.
- **`KeyboardProvider` (`react-native-keyboard-controller@1.21.6`) at App.tsx root** — Phase 2 inherits keyboard handling. Step inputs benefit from existing global keyboard avoidance — no new keyboard work needed.
- **M2 D-22 backend body-status sanitizer** (`propertyRoutes.js` lines 414-418) — POST/PUT body sanitizers strip `status` from client-sent bodies. Phase 2 client doesn't send `status`; sanitizer is belt-and-suspenders.
- **M1 Phase 4 SectionProps contract** (`src/components/CreateListingForm/types.ts:74-78`) — Phase 2 transplants the same `{ values, onChange<K>(field, value), errors }` shape to the new step components. Maximum continuity for any developer familiar with M1.
- **M1 Phase 5 `validateByCategory` + FIELD_ORDER_BY_CATEGORY** (`src/components/CreateListingForm/validators.ts`) — pattern source for `validateStep` + `FIELD_ORDER_PER_STEP`.
- **`ListingMetaTable.tsx`** — meta row rendering on PropertyDetails; updated in D-20 read-path cutover.

### Established Patterns

- **Custom App.tsx state-machine navigation** — boolean flags for overlays; `isContextualListingFlowOpen` joins the existing pattern. M3 SPEC mounting via this pattern is preserved per CLAUDE.md hard rule (no `react-navigation`).
- **Atomic schema cutover** (M1 D-02 + M2 Phase 2 D-21 + Phase 1 D-01) — Phase 2's old-screen deletion follows the same atomic-cutover posture (final commit deletes; no commit ships both flows live to user). Plan 02-08 is the structural enforcer.
- **Operator-supervised one-shot migration scripts** (M2 Plan 02-02 + Phase 1 D-02) — `seed-locations-m3.js` follows the same `--dry-run` + live + `--verify=PASS` flow. Operator runs against production Atlas before Phase 2 backend cutover ships.
- **M2 audit-field "additive only" schema discipline** (M2 Phase 1 D-04) — Phase 2 Location model adds audit fields (`createdByUid`, `approvedByUid`, etc.) at top level; status enum (`approved | pending | rejected`) at top level. Mirrors Property's M2 status pattern.
- **M2 anti-spoofing grep-gate pattern** (M2 Phase 1 HF-03) — Phase 2 Location routes pass `grep -nE "createdByUid:\s*req\.(body|headers)" src/routes/locationRoutes.js` exit 0 at phase close.
- **M2 mod queue tab structure** (M2 Phase 3 MOD-11) — Phase 2 adds a Locations tab; reuses the same tab segmented control + count badge pattern.
- **Bilingual EN+RU CI parity gate** (`scripts/check-i18n-parity.sh`) — Phase 2's +80–120 keys must pass; researcher counts the exact delta during plan-phase.
- **Pure validators / pure adapters** (`src/utils/propertyCategory.ts`, `src/components/CreateListingForm/validators.ts`) — Phase 2's `validateStep`, `propertyToFormBag`, `formBagToPropertyPayload` are all pure module functions with no React imports, no side effects.

### Integration Points

- **App.tsx** — overlay flag swap (`isCreateListingOpen` → `isContextualListingFlowOpen`); existing `moderatorContext`, `propertyToEdit`, `defaultRenterListingsTab`, `setRenterListingsRefreshKey`, `setModerationCountRefreshKey` state already in place; Phase 2 wires through.
- **Backend `propertyRoutes.js` POST + PUT** — already nested-shape (Phase 1 D-01 cutover); Phase 2 client sends nested-shape bodies that match.
- **Backend `moderationRoutes.js`** — Phase 2 EXTENDS with location-curation endpoints (`/api/moderation/locations/:id/approve` + `/reject`); existing listing-curation endpoints unchanged.
- **Backend new `locationRoutes.js`** — `GET/POST /api/locations/cities` + `GET/POST /api/locations/cities/:cityIdOrSlug/districts`; auth required for POST (uses `verifyFirebaseToken` + `requireListingCapability` middleware from M2 Phase 1).
- **Backend new `Location` model(s)** — Mongoose schema(s) for City + District. Indexed on `{country, slug}` for City; `{cityId, slug}` for District.
- **`scripts/check-i18n-parity.sh`** — CI gate; Phase 2's new keys must pass.
- **`KeyboardProvider`** — already at App.tsx root; new step inputs inherit keyboard avoidance.

</code_context>

<specifics>
## Specific Ideas

- **`<ContextualListingFlow>` overlay slots in App.tsx between `KeyboardProvider` and the existing screen tree** — same pattern as `<CreateListingScreen>` today; visual continuity for testers.
- **`Step 2 chip row layout` — recommend FlatList or ScrollView with horizontal=true** — matches M1 HomeScreen's existing district filter chip pattern (HomeScreen.tsx:65-93). Researcher confirms the existing chip component is reusable.
- **`FormBag` shape — discriminated union by `dealType` and `propertyType`** — TypeScript-narrows Step 6 fields to deal-type-specific only; Step 3 sub-fields to propertyType-specific only. Reduces "field exists but isn't supposed to be set" bugs.
- **`propertyToFormBag` mapping — exact mirror of Phase 1 D-04..D-15** — every field flows back through the same logic, just inverted. If Phase 1's migration mapped `'rent' → 'rent_long'`, Phase 2's `propertyToFormBag` also reads `dealType: 'rent_long'` straight from `property.dealType`. No rev-mapping needed because Phase 1 already canonicalized.
- **`formBagToPropertyPayload` builder — produces exactly SPEC §"Suggested Data Shape"** — backend `POST /api/properties` body validation aligns 1:1 with FormBag fields after the build.
- **Step 6 Submit button — Next button morphs to "Submit"** — pattern: `currentStep < 6 ? 'common.next' : (mode === 'edit-mod' ? 'contextualListing.submit.modEdit' : 'contextualListing.submit.create')`.
- **Mod banner i18n keys — REUSE `moderation.editOnBehalf.banner` + `moderation.editOnBehalf.reason`** — verbatim. Already exist in EN+RU per M2 Phase 3.
- **i18n key namespace for new keys — `contextualListing.*`** — keeps the new flow's keys clearly grouped. Matches M2's `moderation.*` and `landlord.*` namespacing pattern.
- **Discard confirm i18n keys** — `contextualListing.discardConfirm.title`, `contextualListing.discardConfirm.body`, `contextualListing.discardConfirm.confirm`, `common.cancel` (already exists).
- **Atomic deletion sentinel** — `scripts/check-create-listing-screen-removed.sh` (or equivalent grep gate) at Phase 2 close: `grep -rE "from .src/screens/CreateListingScreen.|import.*CreateListingScreen" src/ App.tsx` exits 1 (zero matches expected). Mirrors M1 Phase 4 `scripts/check-land-removed.sh` enforcement pattern.
- **Default RenterListings tab on owner submit** — `defaultRenterListingsTab: 'pending'` (existing App.tsx state). `setRenterListingsRefreshKey(k => k + 1)` to force re-fetch. Both already established.
- **Mod-edit success refresh** — `setModerationCountRefreshKey(k => k + 1)` to refresh the queue. Already in App.tsx.
- **City/district `slug` is the canonical identifier** — listings store `location.city: string` (slug), `location.district: string` (slug). `label` is for display only. Slug stable across env, label localizes per `useLanguage()`.
- **`GET /api/locations/cities` response shape** — `{ cities: [{ slug, label: { ru, en }, country, centroid: { lat, lng }, status }] }` where `status: 'approved' | 'pending'` (caller's own pending shown alongside approved; other users' pending NOT shown). Same scope rule for districts.
- **Location chip row sort order** — `country` (KG → KZ → UZ) → `label[lang]` alphabetic. KG cities appear first because launch market.
- **Other → TextInput modal** — modal with i18n placeholder + submit. On submit: optimistic POST + immediate use for THIS listing; backend rejects with 4xx → modal stays open with error message; backend accepts (201 Created with status: pending) → modal closes; chip lit with the new value.
- **Step 6 deposit currency** — defaults to the same currency as Step 3's `basics.currency`. User can override in the deposit input.
- **Step 6 prepayment custom integer** — chips `0 / 1 / 2 / Custom`; "Custom" reveals a number input below; final value is a single integer in months (`0` = none).

</specifics>

<deferred>
## Deferred Ideas

- **2GIS native map bridge** — M4+ per `2GIS_BRIDGE_PLAN.md` (PROJECT.md Out of Scope). Phase 2 uses `react-native-maps` for the pin picker; M4 swap is a coordinated read+write change across all 6 read-path surfaces + Step 2.
- **MapLibre GL Native (open-source MapBox fork)** — rejected for Phase 2; would add a second map lib stack. Re-evaluate if 2GIS bridge work bogs down.
- **HomeScreen district filter chips dynamic-from-dictionary swap** — M4+ carry-forward. Phase 2 leaves the existing hardcoded Bishkek microdistricts filter intact.
- **Auto-geocoding from typed address (Nominatim)** — eliminated. Map pin in Step 2 replaces typed-address auto-geocode; backend `geocodeAddress` is no longer called from create-listing.
- **AsyncStorage draft persistence** — rejected; introduces stale-draft staleness, multi-listing-in-progress edge cases, schema-evolution migration. Re-evaluate in M4+ if user feedback demands it.
- **`react-hook-form` + `zod` adoption** — STACK.md "if adopted" path remains adoption-ready but unused per D-01 (useState + pure validateStep). Re-evaluate when a phase has form-library-shaped problems (async validators, very large schemas).
- **Mod-rejection 30-day blocklist for repeated user-rejected location names** — D-05 sketch. Planner picks Phase 2 ship vs hardening pass defer.
- **Dynamic city-of-other → centroid via "first listing's pin" backend computation** — D-09 alternative path. Planner picks; both work.
- **City-or-district auto-translate (RU↔EN)** — out of Phase 2 scope. User submits one language; both fields populated identically until translation tooling exists. Planner picks if a translation service is wired in (none today; out of scope).
- **Backend transformer / dual-shape window during Phase 1→2 gap** — already rejected by Phase 1 D-01 (atomic break locked).
- **Defensive client patches (interim v2.0.1)** — already rejected by Phase 1 D-01.
- **Step 1 reformulation: deal type implies property type** — out of scope; SPEC Decision #1 ("All combinations of deal type × property type are allowed") locked.
- **Per-night pricing for hospitality** — out of scope (carried from M1 + M2 + PROJECT.md).
- **Booking / payment integration for hospitality** — out of scope.
- **`react-navigation` migration** — out of scope (CLAUDE.md hard rule).
- **Firebase SDK additions** — out of scope (REPO RULE per memory).
- **KZT + UZS currency support** — M4+ market expansion; not in M3.
- **Push notifications for moderation events** — M4+ per REQUIREMENTS.md "Out of Scope".
- **Bulk moderation actions (multi-select approve/reject)** — M4+.
- **Real-estate document verification (Avito-style)** — multi-month compliance subproject; far-future.
- **M4+ carry-forward items inherited at M2 close** — race-cell test rig (M2 Phase 6 cells 1.7 + 2.4-2.6 + 5.6 + 5.3); Android `gradlew clean bundleRelease` reanimated build doc; AWS IAM cross-project residual.
- **Phase 4 (CARRY-01 + CARRY-02), Phase 3 (MEDIA-*), Phase 5 (REL-*)** — separate phases; not Phase 2 scope.

</deferred>

---

*Phase: 02-6-step-contextual-listing-flow-client*
*Context gathered: 2026-05-05*

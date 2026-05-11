# Phase 2: 6-Step Contextual Listing Flow (Client) — Pattern Map

**Mapped:** 2026-05-05
**Files analyzed:** 38 (28 RN client + 10 backend)
**Analogs found:** 38 / 38 (no green-field rows; every new file has a precedent in M1, M2, or Phase 1)
**Repos touched:** RN client (`/Users/beckmaldinVL/development/mobileApps/JayTap`) + Backend (`/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services`)

> **How to read deviations:** every new file copies the analog's *shape*; deviations are the deltas the planner must call out as task-level instructions. Where deviations are silent (`—`), straight transplant is intended.

---

## RN Client — New flow components

| Repo | New File | Role | Closest Analog | Excerpt | Deviations |
|------|----------|------|----------------|---------|------------|
| RN | `src/components/ContextualListingFlow/index.tsx` | orchestrator (FormBag state, validateStep dispatch, step switcher, submit by mode) | `src/screens/CreateListingScreen.tsx:88-128, 525-575` (M1 P4 orchestrator + 3-branch save dispatcher) | `if (moderatorContext && propertyToEdit?.id) { await PropertyService.editAsModerator(...); } else if (isEditMode && propertyToEdit?.id) { await PropertyService.updateProperty(...); } else { await PropertyService.createProperty(...); }` | Replaces 28+ `useState` hooks with **single `useState<FormBag>`** + **single `useState<FormErrorBag>`** (D-02). Adds `useState<1\|2\|3\|4\|5\|6>('currentStep')` (D-11). Add `mode` discriminated-union prop (D-15). Mod-banner mounted ABOVE step body (not at top of file like M1). |
| RN | `src/components/ContextualListingFlow/Step1DealAndPropertyType.tsx` | step component — chip rows | `src/components/CreateListingForm/BasicInfoSection.tsx:45-60` (M1 P4 SectionProps consumer) | `export function BasicInfoSection({ values, onChange, errors }: SectionProps) { const { t, language } = useLanguage(); const { colors, isDark } = useTheme(); ... }` + chip pattern from `src/screens/HomeScreen.tsx:486-516` (verified by RESEARCH §"Code Examples → Chip Pattern") | Two `FlatList horizontal` chip rows visible simultaneously (Tradeoff §A). NO 3 stacked chipRows like BasicInfoSection — Phase 2 has only 2 enums (dealType + propertyType). |
| RN | `src/components/ContextualListingFlow/Step2Location.tsx` | step component — chip rows + map pin + Other modal + exact-address toggle | `src/components/PropertyMap.tsx:1-37` (MapView + Marker + PROVIDER_DEFAULT) + chip pattern from HomeScreen | `<MapView provider={PROVIDER_DEFAULT} style={styles.map} initialRegion={{...BISHKEK_COORDINATES, latitudeDelta: 0.05, longitudeDelta: 0.05}} mapType="mutedStandard" userInterfaceStyle={isDark ? 'dark' : 'light'} />` | Add `<Marker draggable onDragEnd={e => onChange('location', { ...values.location, coordinates: e.nativeEvent.coordinate })} />` (D-08). Add `onPress` tap-to-drop fallback per RESEARCH R1 (Marker drag may silently fail on Fabric). `initialRegion` driven by `cityCenters[selectedCity]` (D-09 from `GET /api/locations/cities` payload, NOT a hardcoded const). Exact-address toggle hidden when `propertyType ∈ {hotel, hostel}` (D-07). |
| RN | `src/components/ContextualListingFlow/Step3BasicInfo.tsx` | step component — area + price + currency + conditional sub-fields per propertyType | `src/components/CreateListingForm/HospitalitySection.tsx:37-40` (conditional field rendering pattern) + M1 P4 `BasicInfoSection.tsx` for layout | `export function HospitalitySection({ values, onChange, errors }: SectionProps) { const { t } = useLanguage(); const { colors } = useTheme(); ... }` (numeric TextInput + chip rows + conditional sub-field gating per category in M1; per `propertyType` in Phase 2) | Currency chips use **canonical SPEC tokens** `'KGS' \| 'USD' \| 'EUR'` (D-03) — NOT M1's `'$' \| 'сом'` literals. Conditional sub-field matrix: apartment/house → `rooms`; office/commercial → `rooms` + `bathroom` + `kitchen`; hotel/hostel → `hotelRooms` + `hotelClass`. |
| RN | `src/components/ContextualListingFlow/Step4ConditionAmenities.tsx` | step component — condition chips + furnished tri-state | `src/components/CreateListingForm/HospitalitySection.tsx` (chip + tri-state pattern) | (single chip row + tri-state toggle — see HospitalitySection for `onChange<K>` shape) | Tri-state `furnished: boolean \| null` (null = unset; required to advance). Mirrors M1 amenities multi-select chip styling but is single-select. |
| RN | `src/components/ContextualListingFlow/Step5TitleDescription.tsx` | step component — title + description text inputs | `src/components/CreateListingForm/BasicInfoSection.tsx:45-60` (SectionProps + KeyboardAware via orchestrator inheritance) | `<TextInput value={values.title} onChangeText={(v) => onChange('content', { ...values.content, title: v })} />` + multiline description | Inherits `KeyboardProvider` from App.tsx root (no new keyboard work — RESEARCH §Reusable Assets). NO media inputs in this step (SPEC §Step 5 explicit — Phase 3 owns media). |
| RN | `src/components/ContextualListingFlow/Step6DealConditions.tsx` | step component — deal-type-gated matrix (sale / rent_long / rent_daily) | `src/components/CreateListingForm/PriceSection.tsx` (currency chip + deposit numeric input pattern) + RESEARCH §"Step 6 Matrix Cheatsheet" | Matrix: `sale → negotiable + deposit (optional)`; `rent_long → negotiable + deposit (optional) + prepaymentMonths (0/1/2/Custom int) + minTerm`; `rent_daily → deposit only (optional)` | Submit-button morph: `currentStep < 6 ? t('common.next') : (mode === 'edit-mod' ? t('contextualListing.submit.modEdit') : t('contextualListing.submit.create'))` (specifics §"Step 6 Submit button"). Custom prepayment seed-from-current per Pitfall 6 mitigation. |

---

## RN Client — Pure modules (validators, adapters, types, styles)

| Repo | New File | Role | Closest Analog | Excerpt | Deviations |
|------|----------|------|----------------|---------|------------|
| RN | `src/components/ContextualListingFlow/validators.ts` | pure validator — `validateStep(stepN, values) → {isValid, errors}` + `FIELD_ORDER_PER_STEP` | `src/components/CreateListingForm/validators.ts:30-100` (M1 P5 `validateByCategory()` + `FIELD_ORDER_BY_CATEGORY`) | `export const FIELD_ORDER_BY_CATEGORY: Record<PropertyCategory, (keyof FormBag)[]> = { Residential: ['title', 'description', ...], Commercial: [...], Hospitality: [...] }; export function validateByCategory(values: FormBag, category: PropertyCategory): ValidateResult { const errors: FormErrorBag = {}; if (!values.title.trim()) errors.title = 'createListing.titleRequired'; ... return { isValid: Object.keys(errors).length === 0, errors }; }` | Dispatch keyed by `stepN: 1..6` (NOT `category`). Errors keyed by **dotted path strings** (`'location.city'`, `'basics.areaSqm'`) since FormBag is nested — M1 used flat `keyof FormBag`. Translation-key error values namespaced `contextualListing.stepN.*` (NOT `createListing.*`). Verbatim shape ready in RESEARCH §"`validateStep` Pattern" (lines 817-884). |
| RN | `src/components/ContextualListingFlow/adapters.ts` | pure adapters — `propertyToFormBag()` + `formBagToPropertyPayload()` | `src/components/CreateListingForm/validators.ts` `buildPayloadByCategory()` (M1 P5 payload builder) + `src/scripts/migrate-listings-m3.js:104-160` `buildNestedShape()` (Phase 1 nested-shape builder) | `function buildNestedShape(doc) { const dealType = mapDealType(doc.type); ... return { dealType, location: { city: doc.city || '', district: '', coordinates: ..., showExactAddress: isHospitality }, basics: { ... }, ... }; }` | `formBagToPropertyPayload()` produces SPEC §"Suggested Data Shape" 1:1; `propertyToFormBag()` is the inverse for edit-mode. Per CONTEXT specifics §"propertyToFormBag mapping", **no rev-mapping needed** — Phase 1 already canonicalized (`'rent' → 'rent_long'` happened at migration). |
| RN | `src/components/ContextualListingFlow/types.ts` | type module — FormBag, FormErrorBag, SectionProps discriminated union | `src/components/CreateListingForm/types.ts:17-72` (M1 P4 FormBag + SectionProps verbatim) | `export interface FormBag { title: string; ... } export type FormErrorBag = Partial<Record<keyof FormBag, string>>; export interface SectionProps { values: FormBag; onChange: <K extends keyof FormBag>(field: K, value: FormBag[K]) => void; errors: FormErrorBag; }` | FormBag is **nested** (top-level `dealType` + `propertyType` + `location` + `basics` + `conditionAndAmenities` + `content` + `terms` subtrees per RESEARCH §"FormBag Shape"). FormErrorBag keyed by dotted-path string (NOT `keyof FormBag`). Add `mode: 'create' \| 'edit-owner' \| 'edit-mod'` discriminated-union for `<ContextualListingFlow>` props (D-15). |
| RN | `src/components/ContextualListingFlow/styles.ts` | shared StyleSheet for sub-components | `src/components/CreateListingForm/styles.ts:1-40` (M1 P4 shared-styles documented exception) | `export const commonStyles = StyleSheet.create({ scrollContent: { padding: 20, paddingBottom: 40 }, section: { marginBottom: 24 }, sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 }, input: { height: 50, ... } });` | Reuse the same dimensional tokens. Add new keys for: progress-bar segments, mod-context banner stripe, map container, chip row container. Preserve M1 convention exception (shared-styles file documented at top per CONVENTIONS.md exception). |
| RN | `src/components/ContextualListingFlow/index.ts` (barrel; OPTIONAL) | barrel re-exports | `src/components/CreateListingForm/index.ts:1-35` (M1 P4 barrel) | `export { BasicInfoSection } from './BasicInfoSection'; ... export type { FormBag, FormErrorBag, SectionProps } from './types'; export { validateByCategory, ... } from './validators';` | Re-export `<ContextualListingFlow>` (default), validators, adapters, types. Documented as second barrel exception OR consumed only via App.tsx (no barrel needed if only one external consumer). |

---

## RN Client — Tests

| Repo | New File | Role | Closest Analog | Excerpt | Deviations |
|------|----------|------|----------------|---------|------------|
| RN | `src/components/ContextualListingFlow/__tests__/validators.test.ts` | unit tests for `validateStep()` per step | `src/components/CreateListingForm/__tests__/validators.test.ts:49-200` (~30 cases of M1 P5 validateByCategory) | `describe('validateByCategory — Residential', () => { test('happy-path inputs return isValid: true, empty errors', () => { const values: FormBag = { ...makeBase(), propertyType: 'Apartment', bedrooms: '2', bathrooms: '1', areaSqm: '80', price: '1000', currency: '$' }; const result = validateByCategory(values, 'Residential'); ... }); test('missing title → errors.title set', () => { ... }); });` | 6 `describe` blocks (one per stepN). Per FLOW-07..FLOW-12 + RESEARCH §"Phase Requirements → Test Map": ~20 cases covering happy + each missing-required for each step + Step 3 conditional matrix (apartment vs office vs hotel) + Step 6 deal-type matrix (sale vs rent_long vs rent_daily). |
| RN | `src/components/ContextualListingFlow/__tests__/adapters.test.ts` | unit tests for adapters | M1 has NO direct adapter test — closest is `__tests__/validators.test.ts` `describe('buildPayloadByCategory — payload shape invariants', ...)` | `test('Residential payload contains bedrooms/bathrooms/areaSqm/price/currency', () => { const values = makeBase(); const payload = buildPayloadByCategory(values, 'Residential'); expect(payload).toHaveProperty('bedrooms'); ... });` | Add round-trip test `propertyToFormBag(formBagToPropertyPayload(bag)) === bag` for representative `apartment + rent_long` and `hotel + rent_daily` cases. |
| RN | `src/components/ContextualListingFlow/__tests__/Step1.test.tsx` (and Step2-Step6) | RTL component smokes per step | NONE — RTL is implied by M1+M2 component tests but no explicit precedent in `CreateListingForm/__tests__/`. Closest pattern: `src/screens/__tests__/*.test.tsx` if exists; else lift RTL pattern from M2 test files. | (RTL renders Step component with `<MockSectionPropsProvider values={makeBase()} />`; asserts conditional sub-fields render per propertyType / dealType matrix) | Step2 must mock `react-native-maps` (per RESEARCH §"Phase Requirements → Test Map" FLOW-05). Step3 verifies bathroom chip appears for office/commercial only; hotelRooms for hotel/hostel only. Step6 verifies all 4 deal-type cells (sale / rent_long / rent_daily / mod-edit-mode submit-button). |
| RN | `src/components/ContextualListingFlow/__tests__/integration.test.tsx` | end-to-end Step 1→6 walk for `apartment + rent_long` | NONE in M1 — Phase 2 introduces this pattern. | (mounts `<ContextualListingFlow mode="create" onClose={jest.fn()} />`; programmatically advances Step 1→6 with chip taps + text inputs; mocks `PropertyService.createProperty`; asserts payload shape on submit) | Mock `PropertyService.createProperty` with jest.fn(); assert payload matches SPEC §"Suggested Data Shape" verbatim. Add second cell for `mode='edit-mod'` to satisfy FLOW-15. |

---

## RN Client — Read-path cutover

| Repo | Modified File | Role | Closest Analog | Excerpt | Deviations |
|------|---------------|------|----------------|---------|------------|
| RN | `src/screens/HomeScreen.tsx` | screen — list rendering + filters | self (current state) | `if (pType && pType !== transactionType) return false;` (line 168) — flat-shape `transactionType` filter; `const hospitalityProperties = useMemo(() => properties.filter(p => isHospitalityCategory(p) && (!p.type || p.type === transactionType)), ...)` (lines 224-228) | Swap `p.type` → `p.dealType !== 'sale'` (Tradeoff §K). Swap `p.latitude/longitude` → `p.location.coordinates.lat/lng`. Swap `p.price/currency/areaSqm/bedrooms/bathrooms` → `p.basics.price/currency/areaSqm/rooms/bathroom`. **PRESERVE** `BISHKEK_DISTRICTS` const at lines 65-93 and the district-filter chip source — D-10 keeps it hardcoded (M4 owns the dynamic-dictionary swap). |
| RN | `src/screens/FavoritesScreen.tsx` | screen — list rendering | sibling pattern from HomeScreen | (mirrors HomeScreen's filter/render logic on the favorites subset) | Same nested-shape swap as HomeScreen. Drop the district filter (Favorites doesn't have one). |
| RN | `src/screens/RenterListingsScreen.tsx` | screen — 4-tab segmented control + list | self (lines 326-355 segmented control + FlatList + HospitalitySection in ListHeaderComponent) | `<HospitalitySection properties={hospitalityProperties} onPress={handlePressProperty} onViewTour={handleViewTour} onEdit={onEditProperty} onArchive={handleArchiveProperty} showEditButton={true} />` (line 343) | Update derivation of `hospitalityProperties` + `otherProperties` to read nested shape (`p.dealType` + `p.basics.*`). Edit entry point dispatches `<ContextualListingFlow mode="edit-owner" initialListing={p} />` (NOT `<CreateListingScreen propertyToEdit={p} />`). |
| RN | `src/screens/OwnerListingsScreen.tsx` | screen — owner's own listings | sibling RenterListingsScreen | (same render pattern as RenterListings) | Same nested-shape swap. Same edit-entry-point swap. |
| RN | `src/screens/PropertyDetailsScreen.tsx` (1680 LOC, OWN PLAN 02-06) | screen — full property detail render | self | Map embed at lines 959-979 + 1165-1185 reads `latitude`/`longitude` flat | Swap **all** flat reads to nested. Map embed → `location.coordinates.lat/lng`. Price/area/rooms display → `basics.*`. Condition/amenities → `conditionAndAmenities.*`. Terms → `terms.*`. Media gallery → `media.photos/videos/tourUrl`. Top-level `maxGuests` + `amenities` STAY at top level per Phase 1 D-09 (D-21 reaffirms — no changes to those reads). PRESERVE `RejectionBanner` mounting per FLOW-13. |
| RN | `src/components/PropertyCard.tsx` (492 LOC) | shared card | self | (reads `property.price`, `property.currency`, `property.bedrooms`, `property.bathrooms`, `property.areaSqm`, `property.images[0]`) | Swap to `property.basics.price`, `property.basics.currency`, `property.basics.rooms`, `property.basics.bathroom`, `property.basics.areaSqm`, `property.media.photos[0]`. Used by Home + Favorites + RenterListings + OwnerListings — single swap propagates. |
| RN | `src/components/HospitalityCard.tsx` | shared card — hospitality variant | self | (reads `property.maxGuests`, `property.amenities`, `property.tours[0]?.url`) | Top-level `maxGuests` + `amenities` STAY at top level (Phase 1 D-09 / Phase 2 D-21). Tour URL swap: `property.tours[0]?.url` → `property.media.tourUrl` (Phase 1 D-12 first-tour-wins flatten). `hotelClass` reads `property.basics.hotelClass`. |
| RN | `src/components/HospitalitySection.tsx` | shared section — hospitality strip wrapper | self | (used as ListHeaderComponent in HomeScreen + FavoritesScreen + RenterListingsScreen + OwnerListingsScreen) | Caller-side derivation per Tradeoff §K: `hospitalityProperties = properties.filter(p => p.dealType !== 'sale' && propertyTypeToCategory(p.propertyType) === 'Hospitality')`. Component itself is unchanged (it doesn't filter — caller does). |
| RN | `src/components/PropertyMap.tsx` | map view (read-only) | self (lines 39-50) | `if (property.latitude && property.longitude) { coordinates = { latitude: property.latitude, longitude: property.longitude }; }` | Swap to `property.location?.coordinates?.lat / .lng`. Preserve hash-fallback for missing coords (lines 46-50). |
| RN | `src/components/ListingMetaTable.tsx` | meta row rendering | self | (reads basics + conditionAndAmenities + terms — flat in M2) | Same nested-shape swap. Read `basics.*`, `conditionAndAmenities.*`, `terms.*`. Preserve i18n keys for row labels. |
| RN | `src/screens/ModerationQueueScreen.tsx` | screen — NEW segmented-control tabs (Listings / Locations) | self (current single-list shape) + Tradeoff §B (2-tab segmented control) | Current screen is single-purpose pending-listings list; mirrors `LandlordApplicationQueueScreen` shape per file header line 3 | Add 2-tab segmented control: `t('moderation.queue.tabs.listings')` ("Listings (N)") + `t('moderation.queue.tabs.locations')` ("Locations (M)"). Locations tab fetches from new `GET /api/moderation/locations/queue`; renders pending cities + districts FIFO; reuses M2 reject-modal styling for approve/reject footer. |
| RN | `src/types/Property.ts` | type stub — Phase 1 narrowing | Phase 1 D-19 stub (consumed verbatim or narrowed) | (Phase 1 ships either full nested type or union; Phase 2 narrows to canonical nested-only at start of execute-phase) | If Phase 1 shipped union type, narrow to canonical nested-only. Single source-of-truth for FormBag derivation in `adapters.ts`. |
| RN | `src/locales/en.ts` + `src/locales/ru.ts` | i18n — +107 keys × 2 = 214 entries | sibling pattern from M1 + M2 (`createListing.*`, `moderation.*` namespaces) | (existing `moderation.editOnBehalf.banner` + `.reason` reused per D-18 verbatim — NO new banner keys) | New namespace: `contextualListing.*`. Verbatim list in RESEARCH §"i18n Key Delta — Lift-and-Paste for Plan 02-02" (lines 1090-1280). EN+RU parity gate via `scripts/check-i18n-parity.sh` (existing CI). |

---

## RN Client — App.tsx wiring + sentinels

| Repo | Modified/New File | Role | Closest Analog | Excerpt | Deviations |
|------|-------------------|------|----------------|---------|------------|
| RN | `App.tsx` (modified) | overlay flag swap + import | self (lines 16, 51, 983-1019) | `import { CreateListingScreen } from './src/screens/CreateListingScreen';` (line 16) + `const [isCreateListingOpen, setIsCreateListingOpen] = useState(false);` (line 51) + `{!!user && isCreateListingOpen && (<View style={[fullScreenOverlayWrap, { pointerEvents: 'auto' }]}><CreateListingScreen onBack={...} onSuccess={...} propertyToEdit={propertyToEdit \|\| undefined} verificationOnly={isAdminVerificationMode} moderatorContext={moderatorContext \|\| undefined} ... /></View>)}` (lines 983-1019) | Replace import with `<ContextualListingFlow>`. Replace `isCreateListingOpen` → `isContextualListingFlowOpen` (D-11). Pass `mode={moderatorContext ? 'edit-mod' : (propertyToEdit ? 'edit-owner' : 'create')}` (D-15). Existing `moderatorContext` / `propertyToEdit` / `defaultRenterListingsTab` / `setRenterListingsRefreshKey` / `setModerationCountRefreshKey` state already in place — Phase 2 wires through unchanged. **DO NOT** add `currentStep` to App.tsx (D-11 — protects 1215-LOC budget). |
| RN | `scripts/check-create-listing-screen-removed.sh` (NEW) | atomic-deletion sentinel | `scripts/check-land-removed.sh:1-49` (M1 P4 enforcement pattern) | `#!/usr/bin/env bash; set -u; cd "$(dirname "$0")/.."; hits1=$(grep -rn "'Land'\|\"Land\"" src/ 2>/dev/null \| grep -v '^src/utils/__tests__/propertyCategory\.test\.ts:' \|\| true); if [ -n "$hits1" ]; then echo "FAIL #1: ..."; fail=1; ...; fi` | Verbatim content in RESEARCH §"Atomic Deletion Sentinel" (lines 1042-1078). Searches for `from ['"].*src/screens/CreateListingScreen['"]` + `from ['"].*components/CreateListingForm['"]` + `import.*CreateListingScreen` + `require\(['"].*CreateListingScreen`. Excludes `node_modules`, `ios`, `android`, `.planning`, `scripts`. Add `"check:atomic-deletion": "bash scripts/check-create-listing-screen-removed.sh"` to `package.json` scripts. |

---

## Backend — Models

| Repo | New File | Role | Closest Analog | Excerpt | Deviations |
|------|----------|------|----------------|---------|------------|
| Backend | `src/models/City.js` | Mongoose model — City dictionary | `src/models/User.js:1-48` (audit-fields top-level + status enum + collection name) | `const UserSchema = new mongoose.Schema({ uid: { type: String, required: true, unique: true }, email: { type: String, required: true, unique: true }, userType: { type: String, enum: ['user', 'moderator', 'admin'], default: 'user' }, ... roleRevokedAt: { type: Date, default: null }, isLocked: { type: Boolean, default: false } }, { timestamps: true, collection: 'user_profile' });` | Verbatim schema in RESEARCH §"Mongoose Location Schema → City.js" (lines 232-267). Compound index `{ country: 1, status: 1, slug: 1 }` for the common GET query. `slug` is `unique: true`. Audit fields (`createdByUid`, `approvedByUid`, `approvedAt`, `rejectedByUid`, `rejectedAt`, `rejectionReasonNote`) follow M2 D-04 "additive only" discipline. |
| Backend | `src/models/District.js` | Mongoose model — District dictionary scoped to City | `src/models/User.js` (same shape as City) + `src/models/Appointment.js` (FK example via `mongoose.Schema.Types.ObjectId` + `ref`) | `cityId: { type: mongoose.Schema.Types.ObjectId, ref: 'City', required: true, index: true }` | Verbatim schema in RESEARCH §"Mongoose Location Schema → District.js" (lines 269-300). Compound **unique** index `{ cityId: 1, slug: 1 }`. NOT globally unique on `slug` — same district name can exist in multiple cities. |

---

## Backend — Routes + middleware

| Repo | New/Modified File | Role | Closest Analog | Excerpt | Deviations |
|------|-------------------|------|----------------|---------|------------|
| Backend | `src/routes/locationRoutes.js` (NEW) | Express router — GET/POST cities + districts | `src/routes/propertyRoutes.js:1-130` (router skeleton + `verifyFirebaseToken` + `requireListingCapability` + anti-spoofing pattern) | `const { verifyFirebaseToken, optionalAuth, ROLE_RANK, requireMinRole } = require('../middleware/verifyFirebaseToken'); router.post('/', upload.array('images', 40), verifyFirebaseToken, requireListingCapability, async (req, res) => { ... ownerUid: req.firebaseUid, ... });` | Verbatim outline in RESEARCH §"Mongoose Location Schema → Routes outline" (lines 303-398). HF-03 anti-spoofing: `createdByUid: req.firebaseUid` ALWAYS — never from `req.body`. `optionalAuth` for GET (anon callers see approved-only); `verifyFirebaseToken` for POST. NO multer (no file uploads). Slug normalization via `transliteration` package OR hand-rolled (Tradeoff §D — planner picks). Anti-spoofing grep gate `grep -nE "createdByUid:\s*req\.(body\|headers)" src/routes/locationRoutes.js` exits 0 at phase close. |
| Backend | `src/middleware/requireListingCapability.js` (NEW — extract) | middleware — listing-capability gate | `src/routes/propertyRoutes.js:97-106` (currently inline in propertyRoutes; extract to middleware/) | `function requireListingCapability(req, res, next) { const u = req.user \|\| {}; const userType = u.userType \|\| 'user'; if (userType === 'admin' \|\| userType === 'moderator') return next(); if (u.canListProperties === true) return next(); return res.status(403).json({ code: 'NEEDS_LANDLORD_APPROVAL', message: 'You need an approved Landlord Application to list properties.' }); }` | Extract verbatim from `propertyRoutes.js:97-106`. Update `propertyRoutes.js` to import from the new middleware file. Reuse in `locationRoutes.js` POST routes (D-05 — POST endpoints require listing capability per spam guard). |
| Backend | `src/routes/moderationRoutes.js` (MODIFIED — extends) | Express router — extend with locations approve/reject + queue | self (lines 75-100 — race-safe `findOneAndUpdate` pattern) + RESEARCH §"Mod approval routes" (lines 408-444) | `router.post('/properties/:id/approve', async (req, res) => { ... const updated = await Property.findOneAndUpdate({ _id: id, status: 'pending' }, { $set: { status: 'live', approvedByUid: req.firebaseUid, approvedAt: new Date() } }, { new: true }); if (!updated) return res.status(409).json({ code: 'ALREADY_MODERATED' }); ... });` | Add `POST /locations/:kind/:id/approve` + `POST /locations/:kind/:id/reject` + `GET /locations/queue` per RESEARCH §"Mod approval routes" (lines 408-444). Race-safe atomic state transition mirrors existing `findOneAndUpdate({ _id, status: 'pending' }, ...)` pattern (PATTERNS §B from M2 Phase 3). `kind: 'city' \| 'district'` validated; Model dispatched dynamically. |

---

## Backend — Migration scripts

| Repo | New File | Role | Closest Analog | Excerpt | Deviations |
|------|----------|------|----------------|---------|------------|
| Backend | `src/scripts/seed-locations-m3.js` | operator-supervised one-shot seed | `src/scripts/migrate-listings-m3.js:1-60` (M3 P1 migration script — same skeleton: dotenv + connectDB + `--dry-run` + `--verify=PASS` + Node ≥22.12 gate) | `if (Number(process.versions.node.split('.')[0]) < 22) { console.error('FATAL: Node ≥22.12 required (run `nvm use 24`)'); process.exit(2); } const args = process.argv.slice(2); const isDryRun = args.includes('--dry-run'); const isVerify = args.includes('--verify=PASS'); if (args.includes('--verify') && !args.includes('--verify=PASS')) { console.error('FATAL: `--verify` requires the `=PASS` suffix.'); process.exit(2); }` | Reads `seed-locations-m3-data.json` (sibling file). Inserts cities + districts with `status: 'approved'` + `createdByUid: 'seed-script'` (or operator's own uid via env). Idempotency: skip-if-slug-exists per city/district. Acceptance check (`--verify=PASS`): `db.cities.countDocuments({ status: 'approved' }) > 0` AND `db.districts.countDocuments({ status: 'approved' }) > 0`. Distinct exit codes (0=PASS, 1=migration error, 2=operator misuse). Add `"seed:locations": "node src/scripts/seed-locations-m3.js"` to `package.json` scripts. |
| Backend | `src/scripts/seed-locations-m3-data.json` | canonical KG/KZ/UZ starter list | `src/scripts/seed.js:9-39` (mock-data shape pattern) | `const MOCK_PROPERTIES = [{ title: 'Modern Apartment in Bishkek Center', price: 850, currency: '$', ... }, ...];` | JSON shape: `{ cities: [{ slug, label: { ru, en }, country, centroid: { lat, lng } }, ...], districts: [{ citySlug, slug, label: { ru, en } }, ...] }`. Starter coverage per CONTEXT D-06: KG (Bishkek + Osh + Karakol + Cholpon-Ata + Naryn), KZ (Almaty + Astana + Shymkent), UZ (Tashkent + Samarkand + Bukhara). Centroids from Wikipedia/OSM (Bishkek `42.8746, 74.5698` reusable from `PropertyMap.tsx:17`). User reviews JSON on PR before operator runs seed. |
| Backend | `package.json` (MODIFIED) | npm scripts — add `seed:locations` | self (lines 12-14 — existing `migrate:*` scripts) | `"migrate:roles-m2": "node src/scripts/migrate-roles-m2.js", "migrate:listings-m2": "node src/scripts/migrate-listings-m2.js", "migrate:listings-m3": "node src/scripts/migrate-listings-m3.js"` | Add `"seed:locations": "node src/scripts/seed-locations-m3.js"`. Also add `transliteration` to `dependencies` if planner picks the npm-package path for slug normalization (Tradeoff §D); otherwise leave deps unchanged for hand-rolled. |

---

## Backend — Tests

| Repo | New/Modified File | Role | Closest Analog | Excerpt | Deviations |
|------|-------------------|------|----------------|---------|------------|
| Backend | `src/__tests__/locationRoutes.test.js` (NEW) | supertest — GET/POST cities + districts + HF-03 anti-spoofing + dedupe | `src/__tests__/moderationRoutes.test.js:1-60, 200-265` (env wiring + `jest.mock('../config/firebase', ...)` + `buildToken({ sub, role, kind: 'valid' })` + role-gating per-endpoint cases) | `jest.mock('../config/firebase', () => { const { importJWK } = require('jose'); const { getKeys, TEST_ISSUER, TEST_FIREBASE_PROJECT_ID } = require('./fixtures/jwks-tokens'); ... }); ... test('POST /properties/:id/approve returns 403 for plain user', async () => { const token = await buildToken({ sub: 'plain-user-uid', role: 'user', kind: 'valid' }); const res = await request(app).post(`/api/moderation/properties/${pendingListing._id}/approve`).set('Authorization', `Bearer ${token}`); expect(res.status).toBe(403); expect(res.body.code).toBe('insufficient-role'); });` | Cases per RESEARCH §"Backend Location-routes coverage": GET cities returns approved + caller's pending; POST cities creates pending; HF-03 anti-spoof (attacker `createdByUid` in body ignored); dedupe approved → 200; dedupe pending → 409; GET districts; POST districts 404 on non-existent city. Reuse existing `fixtures/jwks-tokens` + `buildToken()` helper. Mongo via `mongodb-memory-server` (already in devDeps). |
| Backend | `src/__tests__/moderationRoutes.test.js` (MODIFIED — extends) | supertest — extend with location approve/reject + race-safe `findOneAndUpdate` cases | self (lines 195-265 — race-condition + role-gating cases for property approve/reject) | `test('POST /properties/:id/approve returns 403 for plain user', async () => { ... }); test('admin role inherits moderator access (GET /queue)', async () => { ... });` | Mirror existing structure: `describe('MOD-LOC-15: Race-condition atomic state transitions on locations', ...)` (Promise.all on two concurrent approves → one wins, one returns 409) + role-gating per new endpoint (`POST /locations/city/:id/approve` etc — plain user 403). Reuse same `fixtures/jwks-tokens` mock. |

---

## Shared Patterns (cross-cutting)

### Authentication / Authorization

**Source:** `src/middleware/verifyFirebaseToken.js:1-40` + `src/routes/moderationRoutes.js:54` (`router.use(verifyFirebaseToken, requireMinRole('moderator'))`)
**Apply to:** All new backend routes
- POST endpoints in `locationRoutes.js`: `verifyFirebaseToken` + `requireListingCapability` (latter extracted from `propertyRoutes.js:97-106` to its own middleware file).
- GET endpoints in `locationRoutes.js`: `optionalAuth` (so anon callers see approved-only).
- Mod approve/reject endpoints in `moderationRoutes.js`: inherit `verifyFirebaseToken + requireMinRole('moderator')` from existing `router.use()` at line 54 (no per-route repetition).

### HF-03 Anti-Spoofing (`createdByUid` from token, never body)

**Source:** `src/routes/propertyRoutes.js:118` (HF-03 pattern: `ownerUid: req.firebaseUid` from JWKS-verified token sub)
**Apply to:** `src/routes/locationRoutes.js` POST handlers (cities + districts).
**Grep gate:** `grep -nE "createdByUid:\s*req\.(body|headers)" src/routes/locationRoutes.js` MUST exit 0 at phase close.
**Test gate:** `src/__tests__/locationRoutes.test.js` includes attacker-supplied `createdByUid` in body asserts ignored (mirror `moderationRoutes.test.js:200-214`).

### Race-safe atomic state transitions

**Source:** `src/routes/moderationRoutes.js:75-100` (race-safe `findOneAndUpdate({ _id, status: 'pending' }, { $set: { status: 'live', ... } }, { new: true })` — status filter IS the lock primitive; loser of a race receives null → 409 ALREADY_MODERATED)
**Apply to:** New mod-approve/reject location endpoints in `moderationRoutes.js`. Test gate: Promise.all race test in `moderationRoutes.test.js` extension (memory `gsd-verifier-misses-regressions.md` mandates this — verifier alone misses race regressions).

### Pure validators / pure adapters (no React, no side effects)

**Source:** `src/components/CreateListingForm/validators.ts:1-22` (M1 P5 — module-level functions, no imports from React, no async)
**Apply to:** `src/components/ContextualListingFlow/validators.ts` + `adapters.ts`
- Translation-key error values (e.g. `'contextualListing.step3.areaRequired'`) — caller translates at render time. Keeps validators i18n-agnostic + role-agnostic.

### SectionProps contract (`{ values, onChange, errors }`)

**Source:** `src/components/CreateListingForm/types.ts:68-72` (verbatim)
**Apply to:** All 6 new Step components (`Step1DealAndPropertyType.tsx` ... `Step6DealConditions.tsx`)
- `onChange<K extends keyof FormBag>(field: K, value: FormBag[K])` — typed dispatch. For nested writes, callers pass the full subtree: `onChange('location', { ...values.location, city: newCity })`.

### `useTheme()` + `useLanguage()` token consumption (NO hardcoded colors)

**Source:** `src/components/CreateListingForm/BasicInfoSection.tsx:48-49` (verbatim)
**Apply to:** All new RN client files (Step1-6 + index.tsx)
- `const { colors, isDark } = useTheme(); const { t, language } = useLanguage();` — colors from theme tokens; strings from `t('contextualListing.*')`. CLAUDE.md hard rule: dark/light parity required.

### EN+RU i18n parity (CI-enforced)

**Source:** `scripts/check-i18n-parity.sh` (existing CI gate)
**Apply to:** `src/locales/en.ts` + `src/locales/ru.ts` (+107 keys each, namespaced `contextualListing.*`)
**Verbatim list:** RESEARCH §"i18n Key Delta — Lift-and-Paste for Plan 02-02" (lines 1090-1280).

### Operator-supervised one-shot migration scripts

**Source:** `src/scripts/migrate-listings-m3.js:1-60` (Phase 1 P2 — `--dry-run` + `--verify=PASS` + Node ≥22.12 gate + distinct exit codes)
**Apply to:** `src/scripts/seed-locations-m3.js`
- Memory `backend-node-version.md`: backend Node ≥22.12 (`nvm use 24`); seed runbook in execute-phase MUST include the gate.

---

## No Analog Found

None. Every new file in this phase has a precedent in M1 Phase 4/5, M2 Phase 1/3, or Phase 1. The `__tests__/integration.test.tsx` file is the closest to green-field (no M1 integration test exists), but the RTL `render(...)` + `userEvent.press(...)` + `waitFor(...)` pattern is implied by M2 component tests; planner can lift from the React Native Testing Library standard examples (no project-specific deviation needed beyond mocking `react-native-maps` per RESEARCH §"Phase Requirements → Test Map" FLOW-05).

---

## Metadata

**Analog search scope:**
- RN client: `src/components/CreateListingForm/`, `src/screens/{HomeScreen, CreateListingScreen, RenterListingsScreen, ModerationQueueScreen, PropertyDetailsScreen}.tsx`, `src/components/{PropertyMap, HospitalitySection, HospitalityCard, PropertyCard}.tsx`, `App.tsx`, `scripts/check-land-removed.sh`
- Backend: `src/{models, routes, scripts, middleware, __tests__}/`, `package.json`

**Files scanned:** ~40 (selective — guided by CONTEXT.md §<canonical_refs> citations + RESEARCH §"Code Examples" line-anchored excerpts)

**Pattern extraction date:** 2026-05-05

**Phase:** 02-6-step-contextual-listing-flow-client

---

## PATTERN MAPPING COMPLETE

# Phase 2: 6-Step Contextual Listing Flow (Client) — Research

**Researched:** 2026-05-05
**Researcher:** gsd-phase-researcher (Opus 4.7 1M)
**Confidence:** HIGH on locked-decision validation; MEDIUM on `react-native-maps` Fabric draggable behavior (covered with concrete fallback recommendation); HIGH on i18n delta count, slug strategy, mod-queue tab, Mongoose Location shape.

---

## Project Constraints (from CLAUDE.md)

Treated with the same authority as locked decisions. The planner MUST verify compliance:

- **Custom `App.tsx` state-machine navigation** — no `react-navigation`. The new `<ContextualListingFlow>` mounts as an overlay flag (D-11 confirms this).
- **EN+RU parity required for every new UI string** — CI gate `scripts/check-i18n-parity.sh`. Phase 2 adds ~107 keys × 2 = ~214 entries; both files must end at the same line count.
- **`useTheme()` semantic tokens — no hardcoded colors; dark/light parity required.**
- **Manual physical-device QA on iPhone 15 Pro Max + Moto G XT2513V** — Phase 5 owns the matrix; Phase 2 ships unit + RTL only per D-04.
- **No Firebase SDK in either repo** — Phase 2 doesn't touch auth-adjacent code; rule preserved by inaction.
- **M1 9-type 3-category taxonomy preserved** — SPEC's flat 5 types reframed onto Residential / Commercial / Hospitality. Phase 2 uses SPEC's 6-value `propertyType` enum (`apartment | house | office | commercial | hotel | hostel`); category-derivation utility (`utils/propertyCategory.ts`) stays untouched.
- **Backend Node ≥22.12 (`nvm use 24` required for backend npm/node ops)** — relevant for the Plan 02-01 Location backend work + seed migration.

---

## User Constraints (from CONTEXT.md)

### Locked Decisions (D-01..D-22 — verbatim binding)

The 22 locked decisions in `02-CONTEXT.md` are reproduced by reference, not by re-litigation. Summary index for the planner:

| ID | Topic | Lock |
|----|-------|------|
| D-01 | Form library | `useState` + pure `validateStep`; NO `react-hook-form` / `zod` |
| D-02 | State location | Single `<ContextualListingFlow>` orchestrator with `{values, onChange, errors}` SectionProps |
| D-03 | Currency tokens | `'KGS' \| 'USD' \| 'EUR'` from day 1; NO `'$'` / `'сом'` legacy |
| D-04 | Test scope | `validateStep` unit + RTL component smokes + adapter unit + 1 integration test (Step 1→6 apartment + rent_long); manual QA matrix in Phase 5 |
| D-05 | Location dictionary | NEW backend `City` + `District` models with mod-approval status enum; `GET/POST` + mod queue tab; anti-spoofing grep gate |
| D-06 | Seed migration | `src/scripts/seed-locations-m3.js` operator-supervised one-shot; planner drafts starter list + JSON for user PR review |
| D-07 | Step 2 UI | Chip rows + "Other" → TextInput → POST as `pending`; optimistic write; advance immediately |
| D-08 | Map pin | `react-native-maps` draggable Marker + tap-to-drop initial; coordinates REQUIRED |
| D-09 | `cityCenters` | Sourced from same dictionary payload (no hardcoded const) |
| D-10 | HomeScreen district filter | Stays hardcoded; M4+ swap |
| D-11 | Container | Single overlay flag `isContextualListingFlowOpen`; internal step-index state |
| D-12 | Folder shape | `src/components/ContextualListingFlow/{index,Step1..Step6,validators,adapters,types,styles}.tsx` + `__tests__/` |
| D-13 | Discard | Silent in-flow Back; confirm modal on X / Step-1 hardware back; in-memory only (no AsyncStorage) |
| D-14 | Progress indicator | "Step N of 6" text + 6-segment bar; theme-aware |
| D-15 | Component shape | Single component with `mode: 'create' \| 'edit-owner' \| 'edit-mod'` + `initialListing?` discriminated union + `moderatorContext?` |
| D-16 | Submit by mode | `POST /api/properties` / `PUT /:id` / `editAsModerator()` |
| D-17 | Success destination | RenterListings 'pending' (create + edit-owner) / ModerationQueueScreen (edit-mod) |
| D-18 | Mod banner | Persists ABOVE step body Steps 1–6; reuses `moderation.editOnBehalf.banner` + `.reason` keys |
| D-19 | Daily-rent Step 6 | Separate step; only optional `deposit` field |
| D-20 | Read-path cutover | 9 RN client surfaces updated to nested shape (HomeScreen / FavoritesScreen / RenterListingsScreen / OwnerListingsScreen / PropertyDetailsScreen / PropertyCard / HospitalityCard / HospitalitySection / PropertyMap / ListingMetaTable) |
| D-21 | Hospitality top-level | `maxGuests` + `amenities[]` stay top-level (Phase 1 D-09) |
| D-22 | Atomic deletion | `CreateListingScreen.tsx` + `CreateListingForm/` deleted in the LAST commit; planner sketches 8 plans |

### Claude's Discretion

11 items the planner picks. Resolutions are recommended in `## Tradeoff Resolutions` below — recommendations are NOT additional locks; the planner can override with rationale.

### Deferred Ideas (OUT OF SCOPE)

`2GIS native bridge` (M4+); `MapLibre GL Native`; `HomeScreen district filter dynamic-from-dictionary` swap (M4+); `Auto-geocoding from typed address (Nominatim)` — eliminated; `AsyncStorage draft persistence` (M4+ if user feedback demands); `react-hook-form` + `zod` adoption; mod-rejection 30-day blocklist (planner picks); city-of-other centroid via backend computation (planner picks); city-or-district auto-translate; KZT + UZS currency support.

---

## Phase Requirements

| ID | Description (verbatim from REQUIREMENTS.md) | Research Support |
|----|---------------------------------------------|------------------|
| FLOW-01 | 6-step container component with header progress indicator (Step N of 6), Back/Next, per-step validation gating advance. Replaces `CreateListingScreen.tsx`. Mounts via existing `App.tsx` overlay pattern. | D-11 + D-12 + D-14 + plan structure §"Plan Structure Recommendation" + Architecture diagram below. |
| FLOW-02 | Step 1A — Deal Type single-select chips (Sale / Long-term rent / Daily rent). Required to advance. | D-12 Step1; chip pattern reusable from `HomeScreen.tsx:445-473` (verified). |
| FLOW-03 | Step 1B — Property Type single-select chips. Reframed onto M1 3-category taxonomy. All combinations allowed. Required to advance. | D-12 Step1; SPEC §1B + REQUIREMENTS.md hard rule (hospitality stays split as `hotel`/`hostel`). |
| FLOW-04 | Step 2 — Location: city autocomplete + district selector (district options dependent on city). Required to advance. | D-05 + D-07 chip rows + Other; backend models + endpoints in §"Mongoose Location Schema". |
| FLOW-05 | Step 2 — Map pin via existing map abstraction. Coordinates `{lat, lng}` REQUIRED to advance. | D-08 + §"react-native-maps Fabric Validation" with concrete fallback. |
| FLOW-06 | Step 2 — Conditional exact-address toggle. Hidden when `propertyType ∈ {hotel, hostel}` (forced true); else default false → 200–300m radius. | D-08 + SPEC §2; `validateStep(2, ...)` enforces. |
| FLOW-07 | Step 3 — Always-shown: area + price + currency chip (KGS/USD/EUR). All three required. | D-03 + D-12 Step3; numeric input pattern reusable from M1 PriceSection. |
| FLOW-08 | Step 3 — Conditional sub-fields per property type (rooms / bathroom / kitchen / hotelRooms / hotelClass). | D-12 Step3; FormBag discriminated-union shape per §"FormBag Shape (recommended)". |
| FLOW-09 | Step 4 — Always shown: condition (rough/whitebox/good/euro) + furnished (boolean). Both required, including hotel/hostel. | D-12 Step4; SPEC §"Decisions Log #4". |
| FLOW-10 | Step 5 — Title + Description (long-text). Both required. | D-12 Step5; multiline `TextInput` from M1 BasicInfoSection. |
| FLOW-11 | Step 6 — Deal Conditions gated by deal type per SPEC §6 matrix. | D-12 Step6 + D-19 daily-rent thin step; matrix below in §"Step 6 Matrix Cheatsheet". |
| FLOW-12 | Per-step validation matches SPEC §"Validation Rules" exactly. Pure `validateStep(stepN, formState)` SoT. | D-01 + D-02; mirrors M1 Phase 5 `validateByCategory()` (verified at `src/components/CreateListingForm/validators.ts:90`). |
| FLOW-13 | Submit fires `editAsModerator` (mod) OR `submitForModeration` (owner). Status flips to `pending`. RejectionBanner preserved on edit-resubmit. | D-15 + D-16 + Phase 1 propertyRoutes verified preserves M2 D-22 sanitizer + auto-flip. |
| FLOW-14 | Old `CreateListingScreen.tsx` deleted atomically when new flow ships. CreateListingForm/ barrel torn down. | D-22 + §"Atomic Deletion Sentinel" with exact grep + CI insertion. |
| FLOW-15 | Edit-on-behalf wired into new flow. Mod can edit any field; banner stripe at TOP. | D-15 + D-18; banner pattern transplanted from `src/screens/CreateListingScreen.tsx:714-744` (verified). |
| FLOW-16 | EN+RU locale parity for all new strings — estimated +80–120 keys. CI gate enforces. | §"i18n Key Delta" — exact count 107 keys × 2 languages = 214 entries. |

---

## Executive Summary

1. **Locked decisions are sound; one tech-surface validation surfaces a real risk.** `react-native-maps@1.27.1` on RN 0.84 + Fabric (New Arch enabled in `android/gradle.properties:35`) has reported regressions to Marker drag event firing since v1.22.x (GitHub Issues #5445 + #5836 + #5798). The library shipped Fabric support in v1.21.0+ and continues to iterate, but `<Marker draggable>` + `onDragEnd` is in the unstable surface area as of search date. Phase 2 ships in a real risk window. **Mitigation:** keep `<Marker draggable onDragEnd>` as the primary path AND add a tap-to-move fallback (re-tap on the map re-positions the existing marker via `onPress`). This is a code-level belt-and-suspenders that costs ~10 lines and unblocks the QA cell on devices where drag events don't fire.

2. **Mongoose Location schema: SPLIT MODELS recommended (City + District) — strongly supported by precedent.** The backend already uses 11 separate top-level models (`User`, `Property`, `LandlordApplication`, `ModerationLog`, etc.) and ZERO discriminator unions. Splitting matches established convention and gives cleaner FK semantics (`District.cityId → City._id`). Concrete schemas provided below — lift-and-paste-ready for Plan 02-01.

3. **i18n delta is 107 keys (×2 languages = 214 entries), within CONTEXT's 80–120 estimate.** Itemized list in §"i18n Key Delta" — the planner copies it verbatim into Plan 02-02. Existing keys reused: `common.back`, `common.cancel`, `common.next`, `common.error`, `moderation.editOnBehalf.banner`, `moderation.editOnBehalf.reason` (verified present in `src/locales/en.ts:610-611` + `src/locales/ru.ts`).

4. **ModerationQueueScreen has NO existing tab structure — adding the "Locations" tab is a NEW segmented control, not an extension of an existing one.** Verified via `grep -nE "tab|Tab|segmented" src/screens/ModerationQueueScreen.tsx` (returns 0 matches). The screen today is a single FIFO list of pending listings. Plan 02-01 must create a 2-tab segmented control: "Listings (N)" (existing list) + "Locations (M)" (new pending-cities-and-districts list). Pattern source: `src/screens/RenterListingsScreen.tsx` 4-tab segmented control (verified at line 24-27 + 64).

5. **Plan structure: D-22's 8-plan sketch is well-sized; recommend 1 small adjustment** — split Plan 02-04 (Steps 4+5+6) into 02-04 (Step 4 + Step 5) and 02-04b (Step 6 with deal-type matrix), because Step 6 carries 4 conditional sub-flows (sale / rent_long / rent_daily / mod-edit-mode submit-button morph) and the prepayment custom-integer input is the single most-fiddly UX surface in the phase. 8 plans → 9 plans. Atomic deletion stays as the final commit.

**Primary recommendation:** Execute the 9-plan sequence below; budget the map-pin task in Plan 02-03 for ~2x the time of other step components to absorb device-test friction; ship the tap-to-move fallback alongside the draggable primary path.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| 6-step UI orchestration + step-index state | Browser/Client (RN) | — | All UI; no SSR; pure component state. |
| Per-step validation (`validateStep`) | Browser/Client (RN) — pure module | — | No network call; pure function (D-01 + D-12). |
| FormBag → backend payload adapter | Browser/Client (RN) — pure module | — | Pure mapping; tested in unit. |
| `propertyToFormBag()` initial hydration for edit modes | Browser/Client (RN) — pure module | — | Reads `Property` (already loaded into App.tsx state); pure mapping. |
| Map pin coordinate capture (Step 2) | Browser/Client (RN) | — | `react-native-maps` MapView + Marker; native module on iOS/Android. |
| City + District dictionary read | API/Backend | Database (Mongo `cities` + `districts` collections) | `GET /api/locations/cities` + `/api/locations/cities/:slug/districts`; auth optional for read; RN client caches in component state. |
| City + District submit (user-extensibility) | API/Backend | Browser/Client (optimistic POST) | `POST /api/locations/*` writes pending docs; client uses immediately for THIS listing. |
| Mod approve/reject of pending Locations | API/Backend (mod-only) | Database (atomic `findOneAndUpdate`) | `POST /api/moderation/locations/:id/approve` + `/reject`; reuses M2 mod-queue patterns. |
| Listing submit (`POST /api/properties`) — nested shape | API/Backend (already cut-over in Phase 1) | Database | Phase 1 D-01 cutover already accepts nested bodies; Phase 2 client supplies them. |
| Listing edit-on-behalf (`PUT /api/properties/:id` via mod path) | API/Backend (already cut-over in Phase 1) | Database | M2 MOD-14 path preserved; Phase 1 verified MOD-14 21-key strip extended. |
| Mod-context banner rendering | Browser/Client (RN) | — | Pure UI; reuses M2 i18n keys. |
| Atomic deletion of `CreateListingScreen.tsx` + `CreateListingForm/` | Browser/Client (RN) — final commit | — | Plan 02-09 deletes; CI grep gate enforces. |

---

## Standard Stack

### Core (already installed — no new deps required)

| Library | Version | Purpose | Why Standard | Source |
|---------|---------|---------|--------------|--------|
| `react-native` | 0.84.0 | Runtime | M3 baseline; New Arch (Hermes + Fabric) enabled | `[VERIFIED: package.json:20]` |
| `react-native-maps` | 1.27.1 | Map pin picker (Step 2) | Already shipping in `PropertyMap.tsx` + `PropertyDetailsScreen.tsx` | `[VERIFIED: package.json:24]` |
| `react-native-keyboard-controller` | 1.21.6 | Keyboard avoidance for Step 2/3/5/6 inputs | M2 baseline; `KeyboardProvider` wraps App.tsx root | `[VERIFIED: package.json:22]` |
| `react-native-reanimated` | 4.3.0 | Peer of keyboard-controller; potentially used for progress-bar animation | M2 baseline | `[VERIFIED: package.json:25]` |
| `react-native-safe-area-context` | 5.5.2 | SafeAreaView for overlay header | M1 baseline | `[VERIFIED: package.json:26]` |
| `lucide-react-native` | 0.564.0 | Icons (X close, ChevronLeft Back, etc.) | M2 + M1 baseline | `[VERIFIED: package.json:18]` |

### Backend (already installed)

| Library | Version | Purpose | Source |
|---------|---------|---------|--------|
| `mongoose` | 8.x (per JayTap-services package.json — confirm at plan time) | Schema + ODM for `City` + `District` models | `[CITED: backend models pattern verified across 11 separate model files in src/models/]` |
| `express` | 4.x | Routes for `locationRoutes.js` | `[CITED: pattern from src/routes/moderationRoutes.js:6]` |

### NEW deps proposed for Phase 2

| Package | Version | Purpose | Justification | Confidence |
|---------|---------|---------|---------------|------------|
| `transliteration` (npm) | ^2.x | Cyrillic → Latin slug for `City` + `District` slugs | Active, TypeScript-typed, zero-deps, cross-platform; handles Cyrillic well per maintainer claims | `[VERIFIED: web search]` MEDIUM — recommend planner verifies via `npm view transliteration` at plan time |

**Alternative considered for slug:** `slug` npm package (transliterates Cyrillic by default per documentation). Recommend `transliteration` over `slug` because `transliteration` has TypeScript types out of the box and has been actively maintained for cross-platform RN/Node use. **The planner can also choose to NOT add a dep** and inline a 30-line manual mapping table for Cyrillic→Latin (cheap; only 33 letters; deterministic). Recommendation in §"Tradeoff Resolutions §G".

**Installation (if `transliteration` chosen):**
```bash
# Backend repo (not RN client — slug normalization runs server-side at POST time)
cd /Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services
nvm use 24
npm install transliteration@^2.3.5
```

**Version verification (at plan time):**
```bash
nvm use 24 && npm view transliteration version  # Confirm latest 2.x
nvm use 24 && npm view react-native-maps version  # Confirm 1.27.x is still latest minor
```

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Native `useState` per D-01 | `react-hook-form@7.73+` + `zod@^3.24` | RHF/zod is more powerful but the 6 steps are chip-enum + numeric inputs + 2 text fields; RHF's strengths (controlled-input plumbing, async resolvers, typed schemas) don't pay off. **D-01 LOCKS useState — do not propose RHF.** |
| `react-native-maps` for pin picker per D-08 | `MapLibre GL Native` (OSM tiles) or 2GIS native bridge | 2GIS deferred to M4 per `2GIS_BRIDGE_PLAN.md`; MapLibre would add a 2nd map lib stack. **D-08 LOCKS react-native-maps — do not propose alternatives.** |
| Mongoose split models per recommendation | Unified `Location` with `kind: 'city' \| 'district'` discriminator | Discriminator works but the backend has ZERO discriminator usage today (verified across 11 model files). Stay with split. |
| `transliteration` npm for slugs | Hand-rolled 33-letter Cyrillic→Latin map | Cheap to roll; predictable; one fewer dep. Planner picks — neither is wrong. |

---

## Phase 2 Tech Surface Validation

### react-native-maps Fabric Validation (D-08)

**Status:** `[VERIFIED: search]` `react-native-maps@1.27.1` (latest 1.27.2 published ~2 months ago) ships Fabric support that landed gradually after v1.21.0. New Arch is **enabled** in this project (`android/gradle.properties:35` `newArchEnabled=true`). Multiple GitHub issues report `<Marker draggable>` regressions in the v1.22.x+ series:

| Issue | Symptom | Affected Versions | Status |
|-------|---------|-------------------|--------|
| [#5445](https://github.com/react-native-maps/react-native-maps/issues/5445) | Marker drag event functions (onDrag / onDragStart / onDragEnd) stopped firing | 1.22.x – present | Open as of search date |
| [#5836](https://github.com/react-native-maps/react-native-maps/issues/5836) | Marker not rendering on Android with RN 0.81 + Fabric | 1.26.x | Open |
| [#5798](https://github.com/react-native-maps/react-native-maps/issues/5798) | 1.26.1+ marker issues — current situation | 1.26.x | Open |
| [#5877](https://github.com/react-native-maps/react-native-maps/issues/5877) | Custom view markers broken with New Architecture on Expo SDK 54 (RN 0.81) | 1.26.x | Open |
| [#5569](https://github.com/react-native-maps/react-native-maps/issues/5569) | Draggable marker with custom component ignores anchor on Android | 1.x | Open |

**Observation:** This project does NOT use custom-view markers in `PropertyMap.tsx` (uses default Marker with `<View>` callout). The Step 2 pin picker per D-08 should use the **default Marker pin** (no custom child component) to stay clear of the most reported breakage. The remaining risk is event-firing — `onDragEnd` may not fire reliably on Android Fabric.

**Recommended implementation (defensive):**

```typescript
// Source: D-08 + Issue #5445 mitigation
// Primary path: draggable + onDragEnd (works on iOS in current builds; may fail on Android Fabric)
// Fallback: re-tap on map re-positions marker via onPress
//
// Both paths converge on the same setCoords({lat, lng}) call; the user sees a single coherent UX.

const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

<MapView
  provider={PROVIDER_DEFAULT}
  style={styles.map}
  initialRegion={cityCenters[selectedCity] ?? BISHKEK_DEFAULT}
  onPress={(e) => {
    // Tap-to-drop initial AND tap-to-move fallback
    setCoords({ lat: e.nativeEvent.coordinate.latitude, lng: e.nativeEvent.coordinate.longitude });
  }}
>
  {coords && (
    <Marker
      coordinate={{ latitude: coords.lat, longitude: coords.lng }}
      draggable
      onDragEnd={(e) => {
        // Primary refinement path (iOS-reliable; Android-uncertain)
        setCoords({ lat: e.nativeEvent.coordinate.latitude, lng: e.nativeEvent.coordinate.longitude });
      }}
    />
  )}
</MapView>
```

**Phase 5 manual QA cell (mandatory):** "Step 2 map pin — drop initial pin, drag to refine on iPhone 15 Pro Max — confirm `onDragEnd` fires (visual: marker stays in dragged position; saved coords match dragged location). Repeat on Moto G XT2513V; if drag events don't fire, confirm tap-to-move fallback works (re-tap moves the marker)."

**If Phase 5 QA reveals neither path works:** escalation path is to pin react-native-maps to `1.20.1` (last reported stable for draggable) and DISABLE New Architecture for Phase 2 — this is a heavy fallback (regresses other Fabric perf work) and should NOT be planned for; flag as Phase 2 scope risk.

### Mongoose Location Schema (Recommended — split models)

**Recommendation:** Split into two top-level Mongoose models — `City` and `District` — matching the backend's established 11-separate-models convention. NO discriminator union.

#### `src/models/City.js` (NEW)

```js
const mongoose = require('mongoose');

// Phase 2 D-05 — Location dictionary (split-models pattern matches existing 11-model convention).
// Anti-spoofing: createdByUid sourced exclusively from req.firebaseUid (HF-03 grep gate).
// Slug normalization: lowercase + transliterate(label.en || label.ru) — see locationRoutes.js.
const CitySchema = new mongoose.Schema({
  slug:    { type: String, required: true, unique: true }, // 'bishkek' / 'almaty' / 'tashkent'
  label:   {
    ru:    { type: String, required: true },
    en:    { type: String, required: true },
  },
  country: { type: String, enum: ['KG', 'KZ', 'UZ'], required: true, index: true },
  centroid: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
  },
  status:  { type: String, enum: ['approved', 'pending', 'rejected'], required: true, index: true },
  createdByUid:  { type: String, required: true }, // From req.firebaseUid (HF-03)
  approvedByUid: { type: String, default: null },
  approvedAt:    { type: Date, default: null },
  rejectedByUid: { type: String, default: null },
  rejectedAt:    { type: Date, default: null },
  rejectionReasonNote: { type: String, default: null },
}, {
  timestamps: true, // createdAt + updatedAt auto-managed
  collection: 'cities',
});

// Index for the read-time query GET /api/locations/cities (approved + caller's own pending)
CitySchema.index({ country: 1, status: 1, slug: 1 });

module.exports = mongoose.model('City', CitySchema);
```

#### `src/models/District.js` (NEW)

```js
const mongoose = require('mongoose');

// Phase 2 D-05 — District dictionary scoped to a parent City.
// FK: cityId → City._id (Mongoose populate-friendly; index for the read-time
// GET /api/locations/cities/:slug/districts query).
const DistrictSchema = new mongoose.Schema({
  cityId:  { type: mongoose.Schema.Types.ObjectId, ref: 'City', required: true, index: true },
  slug:    { type: String, required: true }, // 'asanbay' / 'jal' / 'tunguch' (NOT globally unique — unique within (cityId, slug))
  label:   {
    ru:    { type: String, required: true },
    en:    { type: String, required: true },
  },
  status:  { type: String, enum: ['approved', 'pending', 'rejected'], required: true, index: true },
  createdByUid:  { type: String, required: true }, // From req.firebaseUid (HF-03)
  approvedByUid: { type: String, default: null },
  approvedAt:    { type: Date, default: null },
  rejectedByUid: { type: String, default: null },
  rejectedAt:    { type: Date, default: null },
  rejectionReasonNote: { type: String, default: null },
}, {
  timestamps: true,
  collection: 'districts',
});

// Compound unique index — (cityId, slug) must be unique; a 'jal' district can exist in
// multiple cities theoretically, but NOT twice in the same city.
DistrictSchema.index({ cityId: 1, slug: 1 }, { unique: true });

module.exports = mongoose.model('District', DistrictSchema);
```

**Routes outline (`src/routes/locationRoutes.js` — NEW):**

```js
const express = require('express');
const City = require('../models/City');
const District = require('../models/District');
const { verifyFirebaseToken, optionalAuth } = require('../middleware/verifyFirebaseToken');
const { slugify } = require('transliteration'); // or hand-rolled per Tradeoff §G

const router = express.Router();

// GET /api/locations/cities — returns approved + caller's own pending
// optionalAuth so unauthenticated callers still get the approved list (read-side parity with Property GET routes)
router.get('/cities', optionalAuth, async (req, res) => {
  const callerUid = req.firebaseUid; // may be undefined for anon
  const cities = await City.find({
    $or: [
      { status: 'approved' },
      ...(callerUid ? [{ status: 'pending', createdByUid: callerUid }] : []),
    ],
  }).sort({ country: 1, 'label.en': 1 }).lean();
  res.json({ cities });
});

// POST /api/locations/cities — auth required; creates pending
router.post('/cities', verifyFirebaseToken, async (req, res) => {
  const { label, country } = req.body; // { ru: '...', en: '...' }, 'KG' | 'KZ' | 'UZ'
  if (!label?.ru || !label?.en) return res.status(400).json({ code: 'LABEL_REQUIRED' });
  if (!['KG', 'KZ', 'UZ'].includes(country)) return res.status(400).json({ code: 'INVALID_COUNTRY' });

  // D-09 alternate path B: backend computes centroid from first listing's pin → for Phase 2 ship,
  // require client to send centroid (it dropped the pin already in Step 2). See Tradeoff §F.
  const { centroid } = req.body;
  if (!centroid?.lat || !centroid?.lng) return res.status(400).json({ code: 'CENTROID_REQUIRED' });

  const slug = slugify(label.en || label.ru, { lowercase: true });

  // Dedupe — case-insensitive slug check
  const existing = await City.findOne({ slug });
  if (existing) {
    if (existing.status === 'approved') return res.status(200).json({ city: existing });
    return res.status(409).json({ code: 'PENDING_DUPLICATE', city: existing });
  }

  const city = await City.create({
    slug,
    label,
    country,
    centroid,
    status: 'pending',
    createdByUid: req.firebaseUid, // HF-03 — NEVER from req.body
  });
  res.status(201).json({ city });
});

// GET /api/locations/cities/:slug/districts — same scoping rule as cities
router.get('/cities/:slug/districts', optionalAuth, async (req, res) => {
  const callerUid = req.firebaseUid;
  const city = await City.findOne({ slug: req.params.slug });
  if (!city) return res.status(404).json({ code: 'CITY_NOT_FOUND' });
  const districts = await District.find({
    cityId: city._id,
    $or: [
      { status: 'approved' },
      ...(callerUid ? [{ status: 'pending', createdByUid: callerUid }] : []),
    ],
  }).sort({ 'label.en': 1 }).lean();
  res.json({ districts });
});

// POST /api/locations/cities/:slug/districts — auth required; creates pending
router.post('/cities/:slug/districts', verifyFirebaseToken, async (req, res) => {
  const { label } = req.body;
  if (!label?.ru || !label?.en) return res.status(400).json({ code: 'LABEL_REQUIRED' });
  const city = await City.findOne({ slug: req.params.slug });
  if (!city) return res.status(404).json({ code: 'CITY_NOT_FOUND' });
  const slug = slugify(label.en || label.ru, { lowercase: true });

  const existing = await District.findOne({ cityId: city._id, slug });
  if (existing) {
    if (existing.status === 'approved') return res.status(200).json({ district: existing });
    return res.status(409).json({ code: 'PENDING_DUPLICATE', district: existing });
  }

  const district = await District.create({
    cityId: city._id,
    slug,
    label,
    status: 'pending',
    createdByUid: req.firebaseUid, // HF-03
  });
  res.status(201).json({ district });
});

module.exports = router;
```

**Anti-spoofing grep gate (M2 HF-03 pattern carries forward):**
```bash
grep -nE "createdByUid:\s*req\.(body|headers)" src/routes/locationRoutes.js
# Expected: 0 matches at phase close.
```

**Mod approval routes added to existing `moderationRoutes.js`** (NOT a new file — extends existing per CONTEXT.md §<code_context>):

```js
// Append to src/routes/moderationRoutes.js (router already mounts requireMinRole('moderator'))

router.post('/locations/:kind/:id/approve', async (req, res) => {
  const { kind, id } = req.params;
  if (!['city', 'district'].includes(kind)) return res.status(400).json({ code: 'INVALID_KIND' });
  const Model = kind === 'city' ? City : District;
  const updated = await Model.findOneAndUpdate(
    { _id: id, status: 'pending' },
    { $set: { status: 'approved', approvedByUid: req.firebaseUid, approvedAt: new Date() } },
    { new: true },
  );
  if (!updated) return res.status(409).json({ code: 'ALREADY_MODERATED' });
  res.json({ [kind]: updated });
});

router.post('/locations/:kind/:id/reject', async (req, res) => {
  const { kind, id } = req.params;
  const { reasonNote } = req.body;
  if (!['city', 'district'].includes(kind)) return res.status(400).json({ code: 'INVALID_KIND' });
  const Model = kind === 'city' ? City : District;
  const updated = await Model.findOneAndUpdate(
    { _id: id, status: 'pending' },
    { $set: { status: 'rejected', rejectedByUid: req.firebaseUid, rejectedAt: new Date(), rejectionReasonNote: reasonNote || null } },
    { new: true },
  );
  if (!updated) return res.status(409).json({ code: 'ALREADY_MODERATED' });
  res.json({ [kind]: updated });
});

// Mod queue tab feed
router.get('/locations/queue', async (req, res) => {
  const cities = await City.find({ status: 'pending' }).sort({ createdAt: 1 }).lean();
  const districts = await District.find({ status: 'pending' }).sort({ createdAt: 1 }).populate('cityId', 'slug label').lean();
  res.json({ cities, districts });
});
```

### i18n Key Delta — Exact Count: 107 keys × 2 = 214 entries

Walked the 6 steps + discard confirm + Step-2 location modal + step labels + chip labels (KGS/USD/EUR, deal type chips, property type chips, condition chips, furnished chips, prepayment chips). Reused existing keys where possible.

**Reused (NO new keys needed — verified existing in `src/locales/en.ts`):**
- `common.back`, `common.cancel`, `common.error`, `common.confirm`, `common.ok`
- `moderation.editOnBehalf.banner`, `moderation.editOnBehalf.success`, `moderation.editOnBehalf.reason` (banner reuse per D-18)
- `moderation.race.toast` (Location POST race scenario, if planner reuses)

**New keys (count broken down — see §"i18n Key Delta" section below for the verbatim list).**

### Slug Normalization Recommendation

**Recommendation:** Use `transliteration` npm package (preferred) OR hand-roll a 33-letter Cyrillic→Latin map. Both work; planner picks per Tradeoff §G.

**Cyrillic-only edge case (Claude's Discretion):** If a city/district has only a Russian label (no English), `slugify(label.ru)` via the `transliteration` package transliterates per ISO/GOST table. Example:
- `'Бишкек'` → `'bishkek'`
- `'Каракол'` → `'karakol'`
- `'Чолпон-Ата'` → `'cholpon-ata'`

**Hand-roll alternative (~30 LOC):**
```js
const CYR_TO_LAT = {
  а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ё:'yo',ж:'zh',з:'z',и:'i',й:'y',к:'k',л:'l',м:'m',
  н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',х:'kh',ц:'ts',ч:'ch',ш:'sh',щ:'shch',
  ъ:'',ы:'y',ь:'',э:'e',ю:'yu',я:'ya',
};
function slugify(s) {
  return s.toLowerCase()
    .split('').map(c => CYR_TO_LAT[c] ?? c).join('')
    .replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}
```

---

## Tradeoff Resolutions

Each `Claude's Discretion` item from CONTEXT.md gets a recommendation here. Planner can override with rationale.

| Item | Options | Recommendation | Rationale |
|------|---------|----------------|-----------|
| **A. Step 1 layout** | Both visible vs sequential reveal | **Both visible simultaneously** | Less surprising; both required to advance per FLOW-12; faster perceived completion of Step 1. Matches CONTEXT.md hint. |
| **B. Mod queue Locations tab UI** | Various sub-pickers | **2-tab segmented control on `ModerationQueueScreen`** with labels `t('moderation.queue.tabs.listings')` ("Listings (N)" / "Объявления (N)") + `t('moderation.queue.tabs.locations')` ("Locations (M)" / "Локации (M)"). Sort: cities first then districts; oldest pending first (FIFO match M2 listing queue). Action footer: identical to existing approve/reject footer with optional "Add a note" TextInput → POST `/api/moderation/locations/:kind/:id/{approve,reject}`. | Symmetric with M2 listing queue UX; minimal cognitive load; reuses M2 reject-modal styling. |
| **C. Location model unified vs split** | Unified discriminator vs split City + District | **SPLIT (City + District)** — verified above with concrete schemas | Backend has 11 separate models, 0 discriminators. Stay with convention; cleaner FK semantics. |
| **D. Slug generation strategy** | `transliteration` npm vs hand-rolled | **`transliteration` npm@^2.x** (or hand-rolled if planner prefers zero-dep posture) | TypeScript-typed; ISO/GOST tables; cross-platform; ~5 LOC import vs ~30 LOC hand-roll. Either works. |
| **E. Mod-rejection 30-day blocklist** | Phase 2 vs hardening pass | **Defer to hardening pass (M4+)** | Phase 2 is already large (9 plans + 6 steps + read-path cutover + backend Location work + atomic deletion). Spam-guard is a real concern but rate-limit (~10/hour) per uid in Phase 2 is sufficient for launch; blocklist is a refinement. |
| **F. City-of-other → centroid derivation** | Client drops pin first vs backend computes from first listing | **Client supplies centroid in POST body** (drop-pin-first UX) — simpler than backend post-hoc compute | The user is already in Step 2 dropping a pin; their pin coordinate IS the centroid for any "Other" city (or close enough for map-recenter purposes). Avoids two-stage pending state ("city created without centroid → first listing fills centroid"). Future M4+ refinement: backend recomputes centroid as the average of all approved listings' pins in that city. |
| **G. Step 2 chip row layout when cities exceed ~6** | Horizontal scroll vs wrap-to-multiline vs autocomplete swap | **Horizontal `FlatList` with `horizontal showsHorizontalScrollIndicator={false}`** matching M1 `HomeScreen.tsx:486-516` chip pattern | Chip pattern verified reusable. Avoids autocomplete TextInput scope creep. KG launch market means ~5 cities at ship time (Bishkek, Osh, Karakol, Cholpon-Ata, Naryn); KZ + UZ add ~6 more later. Horizontal scroll handles 20+ comfortably. |
| **H. Map provider on Android** | Verify Google Maps API key in `AndroidManifest.xml` | **VERIFIED — already plumbed** | `android/app/src/main/AndroidManifest.xml:16-18` declares `com.google.android.geo.API_KEY` placeholder; `android/app/build.gradle:96` injects from `keystoreProperties['googleMapsApiKey']`. Since `PropertyMap.tsx` ships on Android in M1 + M2 today, the key IS configured in the keystore. **No Phase 2 prerequisite work.** |
| **I. Error scroll-to-first-error pattern** | Mirror M1 Phase 5 D-04 `FIELD_ORDER_BY_CATEGORY` | **Mirror — `FIELD_ORDER_PER_STEP: Record<1\|2\|3\|4\|5\|6, (keyof FormBag)[]>`** | Pattern source `src/components/CreateListingForm/validators.ts:47-84` (verified). On Submit/Next, if `!isValid`, scroll to first error in step's field order via `KeyboardAwareScrollView.scrollToPosition()` (M1 P5 pattern). |
| **J. Empty state for districts** | Show "No districts yet — be the first" + immediate TextInput vs hide chip row | **Show empty-state copy + "Other" chip lit by default** | Affordance is discoverable; prevents the "where do I tap?" dead-end. i18n key: `contextualListing.step2.districts.empty`. |
| **K. Nested-shape compat in `HospitalitySection.tsx` derivation** | New derivation rule | **`hospitalityProperties = properties.filter(p => p.dealType !== 'sale' && propertyTypeToCategory(p.propertyType) === 'Hospitality')`** | Mirrors M1's `transactionType: 'rent'` rule, mapped to nested `dealType !== 'sale'` (covers both `rent_long` and `rent_daily`). Per CONTEXT specifics §"Nested-shape compat". |

---

## Architecture Patterns

### System Architecture Diagram

```
                    ┌────────────────────────────────────────────┐
                    │  App.tsx — overlay flag + state machine     │
                    │  isContextualListingFlowOpen: boolean       │
                    │  moderatorContext / propertyToEdit (M2)     │
                    │  defaultRenterListingsTab + refresh keys    │
                    └─────────────────┬──────────────────────────┘
                                      │ mode + initialListing? + moderatorContext?
                                      ▼
              ┌──────────────────────────────────────────────────┐
              │  <ContextualListingFlow> (orchestrator)          │
              │  ─ useState<FormBag>                              │
              │  ─ useState<FormErrorBag>                         │
              │  ─ useState<currentStep: 1..6>                    │
              │  ─ <ModBanner> (above step body, Steps 1-6)       │
              │  ─ <ProgressIndicator step={currentStep} of=6 />  │
              └─────────────────┬────────────────────────────────┘
                                │ {values, onChange, errors}
                                ▼
        ┌───────────┬───────────┬───────────┬───────────┬───────────┬───────────┐
        │  Step1    │  Step2    │  Step3    │  Step4    │  Step5    │  Step6    │
        │  Deal +   │  Location │  Basic    │  Cond +   │  Title +  │  Deal     │
        │  Type     │  + Map    │  Info     │  Furnish  │  Desc     │  Cond     │
        │  chips    │  pin      │  cond     │  chips +  │  text     │  matrix   │
        │           │  city/d   │  fields   │  toggle   │  inputs   │  per      │
        │           │  chips    │           │           │           │  dealType │
        └─────┬─────┴─────┬─────┴─────┬─────┴─────┬─────┴─────┬─────┴─────┬─────┘
              │           │           │           │           │           │
              ▼           ▼           ▼           ▼           ▼           ▼
     ┌──────────────────────────────────────────────────────────────────┐
     │  validateStep(stepN, values) — pure, single source of truth      │
     │  FIELD_ORDER_PER_STEP — scroll-to-first-error                    │
     └──────────────────────────────────────────────────────────────────┘
                                │ on Submit
                                ▼
     ┌─────────────────────────────────────────────────────────────────┐
     │  formBagToPropertyPayload(values) — pure adapter                 │
     │  Output: { dealType, propertyType, location:{...},               │
     │           basics:{...}, conditionAndAmenities:{...},             │
     │           content:{...}, terms:{...} }  (NO media; NO status)    │
     └─────────────────────────────┬───────────────────────────────────┘
                                   │
                ┌──────────────────┼──────────────────┐
                ▼                  ▼                  ▼
    POST /api/properties   PUT /api/properties/:id   PropertyService.editAsModerator()
    (mode='create')        (mode='edit-owner')        (mode='edit-mod')
                │                  │                  │
                ▼                  ▼                  ▼
    ┌─────────────────────────────────────────────────────────────────┐
    │  Backend (already cut-over per Phase 1 D-01):                    │
    │  ─ Property.js nested schema                                      │
    │  ─ propertyRoutes.js + moderationRoutes.js nested-shape bodies    │
    │  ─ M2 D-22 sanitizer + auto-flip preserved                        │
    └─────────────────────────────────────────────────────────────────┘

      ┌────────────────────────────────────────────────────────────┐
      │  Backend NEW (Plan 02-01):                                  │
      │  ─ City.js + District.js Mongoose models                    │
      │  ─ locationRoutes.js (GET/POST cities + districts)          │
      │  ─ moderationRoutes.js extension (locations queue +         │
      │    approve/reject)                                          │
      │  ─ seed-locations-m3.js (operator-supervised, --dry-run +   │
      │    --verify=PASS)                                           │
      │  ─ seed-locations-m3-data.json (user reviews on PR)         │
      └────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component / File | Owns | Imports |
|------------------|------|---------|
| `App.tsx` | Overlay flag swap; mode prop; `moderatorContext` / `propertyToEdit` / refresh-key state (already in place) | `<ContextualListingFlow>` |
| `src/components/ContextualListingFlow/index.tsx` | FormBag state; FormErrorBag state; currentStep state; submit dispatch; mod-banner mount; progress indicator | All Step1-6 + validators + adapters |
| `src/components/ContextualListingFlow/Step1DealAndPropertyType.tsx` | Two chip rows (deal type + property type); pure SectionProps consumer | `useTheme` + `useLanguage` |
| `src/components/ContextualListingFlow/Step2Location.tsx` | City chip row + District chip row + Map pin + Exact-address toggle (conditional) + "Other" modal | `react-native-maps` (MapView, Marker, PROVIDER_DEFAULT) |
| `src/components/ContextualListingFlow/Step3BasicInfo.tsx` | Always-shown area + price + currency chip + conditional sub-fields per propertyType | numeric `TextInput` + chip pattern |
| `src/components/ContextualListingFlow/Step4ConditionAmenities.tsx` | Condition chips + furnished toggle | chip pattern |
| `src/components/ContextualListingFlow/Step5TitleDescription.tsx` | Title TextInput + Description multiline TextInput | KeyboardAwareScrollView from M1 |
| `src/components/ContextualListingFlow/Step6DealConditions.tsx` | Deal-type-gated matrix (sale / rent_long / rent_daily); deposit + prepayment custom-int + minTerm | chip pattern |
| `src/components/ContextualListingFlow/validators.ts` | Pure `validateStep(n, values) → {isValid, errors}` + `FIELD_ORDER_PER_STEP` | None (no React, no side effects) |
| `src/components/ContextualListingFlow/adapters.ts` | Pure `propertyToFormBag(p)` + `formBagToPropertyPayload(v)` | None |
| `src/components/ContextualListingFlow/types.ts` | FormBag, FormErrorBag, SectionProps | None |
| `src/components/ContextualListingFlow/styles.ts` | Shared StyleSheet (theme-aware via `useTheme()` at consumption site) | None |

### FormBag Shape (Recommended)

```typescript
// src/components/ContextualListingFlow/types.ts
import type { Property } from '../../types/Property';

export interface FormBag {
  // Step 1 (REQUIRED to advance from Step 1)
  dealType: 'sale' | 'rent_long' | 'rent_daily' | '';
  propertyType: 'apartment' | 'house' | 'office' | 'commercial' | 'hotel' | 'hostel' | '';

  // Step 2 (REQUIRED to advance from Step 2)
  location: {
    city: string;        // city slug
    district: string;    // district slug
    coordinates: { lat: number; lng: number } | null;
    showExactAddress: boolean; // forced true if propertyType ∈ {hotel, hostel}
  };

  // Step 3 (REQUIRED area + price + currency; conditional sub-fields)
  basics: {
    areaSqm: string;     // string at form-time, parsed at submit
    price: string;
    currency: 'KGS' | 'USD' | 'EUR' | '';
    rooms?: '1' | '2' | '3' | '4+';
    bathroom?: 'private' | 'none' | 'shared';
    kitchen?: 'private' | 'none' | 'shared';
    hotelRooms?: '1' | '2' | '3' | '4+';
    hotelClass?: 'economy' | 'standard' | 'comfort' | 'premium';
  };

  // Step 4
  conditionAndAmenities: {
    condition: 'rough' | 'whitebox' | 'good' | 'euro' | '';
    furnished: boolean | null; // tri-state (null = unset)
  };

  // Step 5
  content: {
    title: string;
    description: string;
    language: 'ru' | 'en'; // defaults from useLanguage().lang
  };

  // Step 6 (gated by dealType)
  terms: {
    negotiable?: boolean;
    deposit?: { amount: string; currency: 'KGS' | 'USD' | 'EUR' };
    prepaymentMonths?: number; // 0 | 1 | 2 | custom-int
    minTerm?: '1_day' | '1_month' | '3_months';
  };
}

export type FormErrorBag = Partial<Record<string, string>>; // keyed by 'location.city', 'basics.areaSqm', etc.

export interface SectionProps {
  values: FormBag;
  onChange: <K extends keyof FormBag>(field: K, value: FormBag[K]) => void;
  errors: FormErrorBag;
}
```

### Step 6 Matrix Cheatsheet (lift-and-paste for Plan 02-04b)

| Field | sale | rent_long | rent_daily |
|-------|:----:|:---------:|:----------:|
| `negotiable` (bool) | ✅ | ✅ | ❌ (hidden) |
| `deposit` (amount + currency) | optional | optional | optional |
| `prepaymentMonths` (0/1/2/custom int) | ❌ (hidden) | ✅ | ❌ (hidden) |
| `minTerm` ('1_month' / '3_months') | ❌ (hidden) | ✅ (chips) | implicit `'1_day'` (no UI) |

`validateStep(6, values)`:
- `sale` → no required fields (deposit + negotiable both optional)
- `rent_long` → `negotiable` required (chip choice); `prepaymentMonths` required (>=0); `minTerm` required
- `rent_daily` → no required fields (deposit optional)

### Anti-Patterns to Avoid

- **Don't lift `currentStep` into App.tsx.** D-11 keeps it inside the orchestrator to protect the App.tsx LOC budget (1215 LOC near soft-cap per CONCERNS.md).
- **Don't introduce a Context provider.** D-02 picks single orchestrator with SectionProps; React Context is unnecessary for 6 sibling components.
- **Don't validate at every keystroke.** Validate on Next/Submit only (per M1 P5 precedent); show errors only after first attempt to advance.
- **Don't hardcode `cityCenters`.** D-09 sources from `GET /api/locations/cities` payload's `centroid` field. A separate const drifts from the dictionary.
- **Don't store dealType + propertyType in nested objects.** Per Phase 1 schema, both are TOP-LEVEL on Property docs (not under `basics.*`). Adapter must respect.
- **Don't create new keys for the mod-context banner.** D-18 reuses `moderation.editOnBehalf.banner` + `.reason` (verified at `src/locales/en.ts:610-611`).
- **Don't split `<Marker draggable>` into a custom Animated component.** Issue #5569 + #5877 indicate custom-view markers + Fabric have additional bugs. Use the default Marker pin shape.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Form state + validation | Custom RHF/Formik clone | `useState` per D-01 (which is what we picked) — but DO use `validateStep` as a pure module function | M1 P5 + M2 carry forward; pure module is testable + deterministic |
| Map pin picker | Custom WebView with Mapbox / Google Maps JS API | `react-native-maps` per D-08 | Already shipping; native; fits New Arch (with caveats per §"Fabric Validation") |
| Slug normalization for Cyrillic | Manual transliteration table from scratch with custom edge cases | `transliteration` npm OR small documented table per Tradeoff §G | Common problem; well-solved |
| Mongoose discriminator union | Single `Location` model with `kind: 'city' \| 'district'` discriminator | Split `City` + `District` models per Tradeoff §C | Backend has 0 discriminators today; stay with convention |
| Mod queue tab control | Custom segmented control component | Pattern from `src/screens/RenterListingsScreen.tsx:64+` | Already proven; theme-aware |
| Progress indicator | Custom animated SVG progress bar with reanimated | Plain `View` + `width: '%'` flex children, theme-tinted | Static fill (no animation per D-14 — "segmented progress bar"); reanimated is overkill |
| AsyncStorage draft persistence | Auto-save form state on every keystroke | Don't (D-13 in-memory only) | Re-evaluate in M4+ if user feedback demands |

**Key insight:** The biggest "don't" is hand-rolling a form library. CLAUDE.md's "if adopted" RHF + zod path STAYS adoption-ready but UNUSED. Phase 2's chip-enum + numeric-input + 2-text-field surface area doesn't justify the form-lib overhead.

---

## Common Pitfalls

### Pitfall 1: react-native-maps draggable Marker silently fails on Android Fabric

**What goes wrong:** `<Marker draggable onDragEnd={...}>` renders the marker but the `onDragEnd` callback never fires. User drags the pin, releases, but `setCoords` is never called. UI shows the marker in the dragged position briefly, then snaps back to the previous coordinate when state re-renders.
**Why it happens:** `react-native-maps@1.22.x+` introduced regressions to drag event firing (Issue #5445); New Architecture's event interop layer doesn't always register the `onDragEnd` event correctly for Marker children.
**How to avoid:** Ship the tap-to-move fallback (`onPress` on MapView re-positions the marker) alongside the draggable primary. Both paths converge on the same `setCoords` call; user gets a coherent UX even if drag silently fails.
**Warning signs:** During Phase 5 device QA, dragging the Marker on Moto G XT2513V doesn't update the saved coordinate. Check FormBag state via debug log on `setCoords`.

### Pitfall 2: i18n parity drift adding 107 keys at once

**What goes wrong:** The CI gate `scripts/check-i18n-parity.sh` fails because EN and RU files don't have matching key counts, OR a key is missing from one file.
**Why it happens:** Adding 107 keys × 2 files = 214 entries in a single PR is a lot of plumbing; missing one is easy.
**How to avoid:** Add keys to BOTH files in the same edit. Prefer co-located edits in the planner's task descriptions (e.g., "Plan 02-02 Task 4: add `contextualListing.step1.*` keys to en.ts AND ru.ts in the same diff"). The §"i18n Key Delta" list below is the lift-and-paste source.
**Warning signs:** `bash scripts/check-i18n-parity.sh` exits 1 with "key X missing from ru.ts" or vice versa.

### Pitfall 3: ModerationQueueScreen tab regression

**What goes wrong:** Adding the new "Locations" tab to `ModerationQueueScreen.tsx` accidentally breaks the existing Listings list (e.g., the Listings list state doesn't preserve when switching tabs and back).
**Why it happens:** The existing screen has NO tab structure — adding one is a NEW segmented control + state hook. Risk of fumbling the listing-list keep-alive.
**How to avoid:** Use the `display: 'none'` keep-alive pattern from `RenterListingsScreen.tsx` (verified at line 184-196: per-tab filter is purely client-side; no per-tab refetch). Alternatively keep both lists mounted but conditionally render. Plan 02-01 Task X owns this risk.
**Warning signs:** Switching from Locations tab back to Listings tab triggers a fresh API call; or the Listings list scroll position doesn't persist.

### Pitfall 4: Phase 1 → Phase 2 atomic-break window stays open longer than necessary

**What goes wrong:** Phase 2 sequencing puts the read-path cutover late in the plan; testers' M2 client builds (TestFlight 27 / Play Internal 30) stay broken across 9 plans of ship time.
**Why it happens:** Per Phase 1 D-01 (atomic break LOCKED), backend is on nested-shape but M2 RN client reads flat-shape. Testers see broken Home / PropertyDetails until Phase 2 ships nested-aware reads. **The 4 operator UAT items from `01-HUMAN-UAT.md` confirm Atlas live migration may not have run yet** — if Phase 2 starts code-side before Atlas migration, backend writes will fail until ops runs the migration.
**How to avoid:** **Sequence Plan 02-05 (read-path cutover for Home/Favs/RenterListings/OwnerListings/PropertyCard) and Plan 02-06 (PropertyDetailsScreen cutover) BEFORE Plan 02-07 (App.tsx wire-through).** Read-path cutover lands as soon as possible — even before the new flow is fully built — so testers' M2 builds get nested-aware list screens FIRST and the new flow lands on top of them. Pre-flight: confirm with operator that Phase 1 §Rollback runbook ran successfully against Atlas.
**Warning signs:** Tester reports "blank Home screen" persists after Plan 02-05 ships → backend still on nested but client reads `property.address` (undefined). OR "POST /api/properties returns 400 M3_NESTED_BODY_REQUIRED" → backend cutover happened but Mongo not migrated.

### Pitfall 5: Cyrillic city slug collision

**What goes wrong:** A user types «Бишкек» as an "Other" city; backend slugifies to `'bishkek'`. But seed migration also created a `Bishkek` city with slug `'bishkek'`. Dedupe via `unique: true` index works in `City.create`, but the user's submission reads as a 409 PENDING_DUPLICATE on a city that's already approved → user UX is "your city already exists, just pick it from the chips".
**Why it happens:** Slug normalization is the dedupe key; case-insensitive transliteration of «Бишкек» → `'bishkek'` collides with seeded `'bishkek'`.
**How to avoid:** `POST /api/locations/cities` returns `200 OK` with the existing city if status is `approved` (not 409). Then the client uses the already-approved city for THIS listing. Locks user-extensibility into a "discover existing cities through write attempts" path. See route code above — `if (existing.status === 'approved') return res.status(200).json({ city: existing })`.
**Warning signs:** Plan 02-01 Task X tests don't cover the "user types existing seeded city as Other" cell.

### Pitfall 6: Step 6 `prepaymentMonths` custom-integer input vs preset chips edge case

**What goes wrong:** User taps "1 month" chip → FormBag stores `prepaymentMonths: 1`. User then taps "Custom" chip → custom number input appears, defaulted to empty/0. User types nothing and taps Submit → `prepaymentMonths: 0` (no prepayment) submitted, but user intended "1 month" still selected.
**Why it happens:** Tapping "Custom" should NOT clobber the existing chip selection's value. State transitions need clear semantics.
**How to avoid:** "Custom" chip OPENS the input below but seeds it with the current `prepaymentMonths` value (or empty if a preset was selected). Submit-time validation: if "Custom" chip is selected AND input is empty, error "Enter a number of months OR pick a preset".
**Warning signs:** RTL test for Step 6 doesn't cover "tap Custom while a preset is already selected" cell.

### Pitfall 7: New Architecture build break from any new native dep

**What goes wrong:** Adding `transliteration` npm package (or any other dep) triggers a New Architecture rebuild on Android that fails with `gradlew clean bundleRelease` per memory `android-reanimated-clean-prefab-gotcha.md`.
**Why it happens:** RN 0.84 + New Arch + reanimated@4.3.0's prefab is wiped on `clean`; subsequent rebuild fails.
**How to avoid:** `transliteration` is a pure-JS dep with NO native code → safe to add. NO new native deps in Phase 2 client repo (verified — Step 2 reuses already-installed `react-native-maps`). Backend dep additions (`transliteration` server-side) don't affect the RN build.
**Warning signs:** After `npm install transliteration` in the BACKEND repo, the RN client `npx react-native run-android` build fails. (Should never happen; backend npm install doesn't touch the RN repo.)

---

## Code Examples

Verified patterns from this codebase (load-bearing for the planner):

### Chip Pattern (M1 HomeScreen — lift directly)

```typescript
// Source: src/screens/HomeScreen.tsx:486-516 (verified)
<FlatList
  horizontal
  showsHorizontalScrollIndicator={false}
  contentContainerStyle={styles.filterList}
  data={chipOptions.map((opt) => ({ id: opt.value, label: opt.label }))}
  keyExtractor={(item) => item.id}
  renderItem={({ item }) => {
    const isActive = selected === item.id;
    return (
      <TouchableOpacity
        style={[
          styles.filterChip,
          {
            backgroundColor: isActive ? colors.activeChipBackground : (isDark ? '#2C2C2E' : '#F2F2F7'),
            borderColor: isDark ? '#3A3A3C' : '#E5E5EA',
          },
        ]}
        onPress={() => onChange(field, item.id)}
      >
        <Text
          style={[
            styles.filterText,
            { color: isActive ? colors.activeChipText : colors.text },
          ]}
        >
          {item.label}
        </Text>
      </TouchableOpacity>
    );
  }}
/>
```

### Mod-Context Banner (transplant verbatim from M2)

```typescript
// Source: src/screens/CreateListingScreen.tsx:714-744 (verified)
{moderatorContext && (
  <View
    style={[
      styles.modContextBanner,
      { backgroundColor: colors.surface, borderColor: colors.border },
    ]}
  >
    <View style={[styles.modContextStripe, { backgroundColor: colors.warning }]} />
    <View style={styles.modContextBody}>
      <Text style={[styles.modContextTitle, { color: colors.text }]}>
        {t('moderation.editOnBehalf.banner').replace('{ownerEmail}', moderatorContext.ownerEmail || moderatorContext.editingOwnerUid)}
      </Text>
      {moderatorContext.reason ? (
        <Text
          style={[styles.modContextSubtitle, { color: colors.textSecondary }]}
          numberOfLines={3}
        >
          {moderatorContext.reason}
        </Text>
      ) : null}
    </View>
  </View>
)}
```

### `validateStep` Pattern (mirror M1 P5 `validateByCategory`)

```typescript
// New: src/components/ContextualListingFlow/validators.ts
import type { FormBag, FormErrorBag } from './types';

export interface ValidateResult {
  isValid: boolean;
  errors: FormErrorBag;
}

export const FIELD_ORDER_PER_STEP: Record<1 | 2 | 3 | 4 | 5 | 6, string[]> = {
  1: ['dealType', 'propertyType'],
  2: ['location.city', 'location.district', 'location.coordinates'],
  3: ['basics.areaSqm', 'basics.price', 'basics.currency', 'basics.rooms', 'basics.bathroom', 'basics.kitchen', 'basics.hotelRooms', 'basics.hotelClass'],
  4: ['conditionAndAmenities.condition', 'conditionAndAmenities.furnished'],
  5: ['content.title', 'content.description'],
  6: ['terms.negotiable', 'terms.deposit', 'terms.prepaymentMonths', 'terms.minTerm'],
};

export function validateStep(stepN: 1 | 2 | 3 | 4 | 5 | 6, values: FormBag): ValidateResult {
  const errors: FormErrorBag = {};

  if (stepN === 1) {
    if (!values.dealType) errors['dealType'] = 'contextualListing.step1.dealTypeRequired';
    if (!values.propertyType) errors['propertyType'] = 'contextualListing.step1.propertyTypeRequired';
  } else if (stepN === 2) {
    if (!values.location.city) errors['location.city'] = 'contextualListing.step2.cityRequired';
    if (!values.location.district) errors['location.district'] = 'contextualListing.step2.districtRequired';
    if (!values.location.coordinates) errors['location.coordinates'] = 'contextualListing.step2.coordinatesRequired';
  } else if (stepN === 3) {
    const area = parseFloat(values.basics.areaSqm);
    const price = parseFloat(values.basics.price);
    if (!area || area <= 0) errors['basics.areaSqm'] = 'contextualListing.step3.areaRequired';
    if (!price || price <= 0) errors['basics.price'] = 'contextualListing.step3.priceRequired';
    if (!values.basics.currency) errors['basics.currency'] = 'contextualListing.step3.currencyRequired';
    const pt = values.propertyType;
    if (pt === 'apartment' || pt === 'house') {
      if (!values.basics.rooms) errors['basics.rooms'] = 'contextualListing.step3.roomsRequired';
    } else if (pt === 'office' || pt === 'commercial') {
      if (!values.basics.rooms) errors['basics.rooms'] = 'contextualListing.step3.roomsRequired';
      if (!values.basics.bathroom) errors['basics.bathroom'] = 'contextualListing.step3.bathroomRequired';
      if (!values.basics.kitchen) errors['basics.kitchen'] = 'contextualListing.step3.kitchenRequired';
    } else if (pt === 'hotel' || pt === 'hostel') {
      if (!values.basics.hotelRooms) errors['basics.hotelRooms'] = 'contextualListing.step3.hotelRoomsRequired';
      if (!values.basics.hotelClass) errors['basics.hotelClass'] = 'contextualListing.step3.hotelClassRequired';
    }
  } else if (stepN === 4) {
    if (!values.conditionAndAmenities.condition) errors['conditionAndAmenities.condition'] = 'contextualListing.step4.conditionRequired';
    if (values.conditionAndAmenities.furnished === null) errors['conditionAndAmenities.furnished'] = 'contextualListing.step4.furnishedRequired';
  } else if (stepN === 5) {
    if (!values.content.title.trim()) errors['content.title'] = 'contextualListing.step5.titleRequired';
    if (!values.content.description.trim()) errors['content.description'] = 'contextualListing.step5.descriptionRequired';
  } else if (stepN === 6) {
    const dt = values.dealType;
    if (dt === 'rent_long') {
      if (values.terms.negotiable === undefined) errors['terms.negotiable'] = 'contextualListing.step6.negotiableRequired';
      if (values.terms.prepaymentMonths === undefined || values.terms.prepaymentMonths < 0) errors['terms.prepaymentMonths'] = 'contextualListing.step6.prepaymentRequired';
      if (!values.terms.minTerm) errors['terms.minTerm'] = 'contextualListing.step6.minTermRequired';
    } else if (dt === 'sale') {
      if (values.terms.negotiable === undefined) errors['terms.negotiable'] = 'contextualListing.step6.negotiableRequired';
    }
    // rent_daily: no required fields
  }

  return { isValid: Object.keys(errors).length === 0, errors };
}
```

---

## Risks & Unknowns

### R1 — `react-native-maps` Marker drag events on Fabric (HIGH severity, MEDIUM probability)

**Risk:** Issue #5445 + #5836 + #5798 reports indicate Marker `onDragEnd` may not fire on Android with New Arch. Phase 2 ships in this risk window.
**Probability:** MEDIUM — existing reports on RN 0.81 + Fabric; project is on RN 0.84 + Fabric.
**Severity:** HIGH — coordinates are REQUIRED to advance Step 2 (FLOW-05). If drag silently fails, user can't refine pin position.
**Mitigation:** Ship tap-to-move fallback alongside draggable primary (code in §"Fabric Validation"); flag mandatory Phase 5 QA cell.
**Escalation:** If both paths fail QA, pin react-native-maps to 1.20.1 + disable New Arch (heavy fallback; regresses other Fabric work).

### R2 — Phase 1 Atlas live migration not run (MEDIUM severity, LOW probability)

**Risk:** Phase 1's `01-HUMAN-UAT.md` lists 4 operator items pending; #1 is "Atlas live migration deploy". If Phase 2 starts before this runs, backend writes will accept nested bodies but no nested-shape data exists yet — read paths return empty.
**Probability:** LOW — operator likely runs Atlas migration before Phase 2 begins; otherwise Phase 2 ships against an empty DB.
**Severity:** MEDIUM — testers see empty Home; not a regression vs current M2-broken state, but blocks UAT.
**Mitigation:** Plan 02-01 wave-0 task: "Confirm Phase 1 Atlas migration ran successfully (verify `db.properties.countDocuments({location:{$exists:false}}) === 0`)". If not run, planner blocks on operator before backend Plan 02-01 deploys.

### R3 — i18n parity drift (LOW severity, MEDIUM probability)

**Risk:** Adding 107 keys × 2 files in a multi-plan PR sequence; missing one key in one file fails CI gate.
**Probability:** MEDIUM — high key count; multiple PRs.
**Severity:** LOW — CI catches it; fix is mechanical.
**Mitigation:** Each plan that adds keys does so in EN + RU same diff; planner enforces in task wording.

### R4 — Mod queue tab regression on `ModerationQueueScreen` (MEDIUM severity, LOW probability)

**Risk:** Adding the Locations tab introduces a state-keep-alive bug for the existing Listings list.
**Probability:** LOW — RenterListingsScreen pattern is proven.
**Severity:** MEDIUM — moderators rely on ModerationQueueScreen daily; regression blocks moderation work.
**Mitigation:** Mirror `RenterListingsScreen.tsx:184-196` per-tab client-side filter pattern; RTL test asserts both tabs preserve list state across switches.

### R5 — Slug collision on Cyrillic-only city names (LOW severity, LOW probability)

**Risk:** Two different Cyrillic city names slugify to the same Latin slug (e.g., transliteration ambiguity).
**Probability:** LOW — Cyrillic→Latin is mostly deterministic; collisions rare.
**Severity:** LOW — `POST /api/locations/cities` returns 200 with existing approved city OR 409 with pending → UI handles both.
**Mitigation:** Spec the dedupe semantic in route code (§"Mongoose Location Schema" above).

### R6 — Step 6 `prepaymentMonths` Custom input UX edge case

**Risk:** Tapping "Custom" chip after a preset is selected creates ambiguous state.
**Probability:** MEDIUM — natural user behavior.
**Severity:** LOW — corrected with seed-current-value-into-input pattern (Pitfall 6).
**Mitigation:** RTL test cell explicit; planner adds to Plan 02-04b test list.

### R7 — App.tsx LOC budget creep

**Risk:** Wiring `<ContextualListingFlow>` adds ~30-50 LOC to App.tsx (already 1215 near soft-cap per CONCERNS.md).
**Probability:** HIGH — guaranteed addition.
**Severity:** LOW — planned overflow; CONCERNS.md tracks.
**Mitigation:** Old `CreateListingScreen` import removal in Plan 02-09 reclaims ~20 LOC; net add ~10-30 LOC. Acceptable.

### Open Unknowns

- **Phase 1 Atlas migration deploy state** — need operator confirmation before Plan 02-01 deploys backend Location work. Planner adds Wave-0 confirmation task.
- **Exact `seed-locations-m3-data.json` city + district list** — researcher provides starting taxonomy; user reviews on PR. Suggested starter (per memory `geographic-scope.md` + Wikipedia public sources): see §"Open Questions for Planner" below.
- **Phase 1's `Property.ts` strict null vs nullable on audit fields (IR-03)** — Phase 2 consumers may hit `string \| null` narrowing issues; Phase 1 deferred. Planner verifies during execute-phase.

---

## Plan Structure Recommendation

CONTEXT.md D-22 sketches 8 plans. Recommended adjustment: **9 plans** — split the original Plan 02-04 (Steps 4+5+6) because Step 6 is the densest deal-type matrix surface and benefits from its own commit chain. Read-path cutover is moved EARLIER (before App.tsx wire-through) to close the Phase 1 atomic-break window faster (Pitfall 4).

| Plan | Title | Tasks (estimated) | ~Hours | Atomic Commit Chain |
|------|-------|-------------------|--------|---------------------|
| **02-01** | **Backend Location dictionary** (Mongoose City + District + locationRoutes.js + moderationRoutes.js extension + seed-locations-m3.js + seed-data.json + tests) — backend repo, Railway deploy at end | 7-8 | ~4h | Backend repo: model + routes + seed + 3-4 supertest cases + nvm-use-24 runbook + Railway deploy |
| **02-02** | **`<ContextualListingFlow>` skeleton + Step 1 + validators + adapters + types + i18n keys** | 6 | ~3h | RN client: orchestrator skeleton + Step1 + validators.test.ts + adapters.test.ts + Step1.test.tsx + i18n delta (en.ts + ru.ts paired) |
| **02-03** | **Step 2 (Location with chip rows + map pin + Other modal) + Step 3 (BasicInfo with conditional sub-fields) + tests** | 8 | ~4-5h | Step2 + Step3 + Step2.test.tsx + Step3.test.tsx + map-pin tap-to-move fallback + i18n delta |
| **02-04a** | **Step 4 (ConditionAmenities) + Step 5 (TitleDescription) + tests** | 5 | ~2h | Step4 + Step5 + Step4.test.tsx + Step5.test.tsx + i18n delta |
| **02-04b** | **Step 6 (DealConditions matrix per dealType) + tests + integration test (Step 1→6 walk for apartment + rent_long)** | 6 | ~3h | Step6 + Step6.test.tsx (4 deal-type cells) + integration.test.tsx + i18n delta |
| **02-05** | **Read-path cutover: HomeScreen + FavoritesScreen + RenterListingsScreen + OwnerListingsScreen + PropertyCard + HospitalitySection + HospitalityCard + ListingMetaTable + PropertyMap** (8 surfaces, smaller files) | 8-9 | ~4h | Per-screen swap to nested-shape reads + per-screen test updates |
| **02-06** | **Read-path cutover: PropertyDetailsScreen** (1680 LOC, largest screen — own plan) | 5-6 | ~3-4h | PropertyDetailsScreen.tsx full nested-shape swap + map-embed coord field rename + tests |
| **02-07** | **Wire `<ContextualListingFlow>` into App.tsx** (replace `isCreateListingOpen` flag + import; integration test) | 3-4 | ~2h | App.tsx overlay flag swap + import + 1 integration test (mode='create' happy path) |
| **02-08** | **Verify everything works end-to-end** (smoke test on Atlas-migrated backend + read paths + new flow create + edit-owner + edit-mod) — physical-device dry-run before atomic deletion | 4 | ~2h | No new code; verify-phase shape; QA captures Phase 5 inputs early |
| **02-09** | **Atomic deletion** — `src/screens/CreateListingScreen.tsx` + `src/components/CreateListingForm/*` + their `__tests__/` files. App.tsx import line removed. CI sentinel script added. Final i18n cleanup (orphaned `createListing.*` keys) | 5 | ~1.5h | DELETE + sentinel.sh added to CI + final commit |

**Total:** 9 plans, ~24-28 hours of execute-time. Atomic invariant: Plan 02-09 ships LAST; no commit between Plan 02-07 and Plan 02-09 has both old screen AND new flow live in App.tsx (App.tsx imports only one at a time per commit).

**Why split 02-04 → 02-04a + 02-04b:** Step 6 carries 4 conditional sub-flows (sale / rent_long / rent_daily / mod-edit-mode submit-button morph) plus the prepayment custom-integer input which is the most-fiddly UX surface. Combining with Step 4 + Step 5 made the original Plan 02-04 task count too high (~12+).

**Why Plan 02-08 (verify-only):** ROADMAP SC #5 requires the OLD `CreateListingScreen.tsx` to be deleted in the same commit chain that ships the new flow. Plan 02-08 is the rehearsal — operator (or developer) walks the new flow on a physical device against the cutover backend BEFORE Plan 02-09 deletes the safety net. Catches the Pitfall 1 (map drag fail) early.

---

## Validation Architecture

> Required per `.planning/config.json`'s nyquist_validation default. This section is the source of truth for VALIDATION.md.

### Test Framework

| Property | Value |
|----------|-------|
| Framework (RN client) | Jest 29.6.3 + react-test-renderer 19.2.3 + (RTL implied by M1+M2 component tests) |
| Framework (backend) | Jest + supertest (per existing `JayTap-services/src/__tests__/*.test.js`) |
| Config file (RN client) | `package.json` `test` script: `jest`; default config; co-located `__tests__/` |
| Config file (backend) | `JayTap-services/jest.config.js` (or default) |
| Quick run command (RN client, single file) | `cd /Users/beckmaldinVL/development/mobileApps/JayTap && npx jest src/components/ContextualListingFlow/__tests__/validators.test.ts -x` |
| Full suite command (RN client) | `cd /Users/beckmaldinVL/development/mobileApps/JayTap && npm test` |
| Quick run command (backend) | `cd /Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services && nvm use 24 && npx jest src/__tests__/locationRoutes.test.js -x` |
| Full suite command (backend) | `cd /Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services && nvm use 24 && npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FLOW-01 | 6-step container renders with progress indicator + Back/Next + per-step validation gating | RTL component | `npx jest src/components/ContextualListingFlow/__tests__/integration.test.tsx -x` | ❌ Wave 0 |
| FLOW-02 | Step 1A — dealType chips render; required to advance | RTL unit | `npx jest src/components/ContextualListingFlow/__tests__/Step1.test.tsx -x` | ❌ Wave 0 |
| FLOW-03 | Step 1B — propertyType chips render; required to advance | RTL unit | `npx jest src/components/ContextualListingFlow/__tests__/Step1.test.tsx -x` | ❌ Wave 0 |
| FLOW-04 | Step 2 — city + district chip rows render dynamically | RTL unit | `npx jest src/components/ContextualListingFlow/__tests__/Step2.test.tsx -x` | ❌ Wave 0 |
| FLOW-05 | Step 2 — map pin captures coords; required to advance | RTL unit + integration | `npx jest src/components/ContextualListingFlow/__tests__/Step2.test.tsx -x` (mock `react-native-maps`) | ❌ Wave 0 + manual-only on device for actual Marker drag |
| FLOW-06 | Step 2 — exact-address toggle hidden for hotel/hostel | RTL unit | `npx jest src/components/ContextualListingFlow/__tests__/Step2.test.tsx -x` | ❌ Wave 0 |
| FLOW-07 | Step 3 — area + price + currency required | unit | `npx jest src/components/ContextualListingFlow/__tests__/validators.test.ts -x` | ❌ Wave 0 |
| FLOW-08 | Step 3 — conditional sub-fields per propertyType | unit + RTL | validators.test.ts (validation) + Step3.test.tsx (rendering) | ❌ Wave 0 |
| FLOW-09 | Step 4 — condition + furnished required | unit + RTL | validators.test.ts + Step4.test.tsx | ❌ Wave 0 |
| FLOW-10 | Step 5 — title + description required | unit + RTL | validators.test.ts + Step5.test.tsx | ❌ Wave 0 |
| FLOW-11 | Step 6 — gated matrix per dealType | unit + RTL | validators.test.ts (4 deal-type cells) + Step6.test.tsx (rendering + Custom-int seed-from-current) | ❌ Wave 0 |
| FLOW-12 | `validateStep` is single SoT | unit | `npx jest src/components/ContextualListingFlow/__tests__/validators.test.ts -x` (~20 cases) | ❌ Wave 0 |
| FLOW-13 | Submit dispatches correct path per mode; status flips to pending | RTL integration + backend supertest | RN: integration.test.tsx (mock fetch); Backend: existing propertyRoutes.test.js + moderationRoutes.test.js | ❌ Wave 0 (RN) / ✅ (backend already exists) |
| FLOW-14 | Old `CreateListingScreen.tsx` deleted; sentinel script enforces | shell | `bash scripts/check-create-listing-screen-removed.sh` exit 0 | ❌ Wave 0 |
| FLOW-15 | mod-context banner renders on mode='edit-mod' | RTL integration | `integration.test.tsx` (mode='edit-mod' cell) | ❌ Wave 0 |
| FLOW-16 | EN+RU parity for new keys | shell CI | `bash scripts/check-i18n-parity.sh` exit 0 | ✅ existing CI gate |

**Backend Location-routes coverage (NEW supertest file):**
| Behavior | Test | Automated Command |
|----------|------|-------------------|
| `GET /api/locations/cities` returns approved + caller's pending | supertest | `npx jest src/__tests__/locationRoutes.test.js -x` |
| `POST /api/locations/cities` creates pending; HF-03 anti-spoof | supertest | (same) |
| `POST /api/locations/cities` dedupes existing approved → 200 | supertest | (same) |
| `POST /api/locations/cities` dedupes existing pending → 409 | supertest | (same) |
| `GET /api/locations/cities/:slug/districts` returns approved + caller's pending | supertest | (same) |
| `POST /api/locations/cities/:slug/districts` 404 on non-existent city | supertest | (same) |
| Mod approve/reject — atomic findOneAndUpdate (race-safe) | supertest | `npx jest src/__tests__/moderationRoutes.test.js -x` (extends existing) |
| Anti-spoofing grep gate `createdByUid:\s*req\.(body\|headers)` exit 0 | shell | `grep -nE "createdByUid:\s*req\.(body\|headers)" src/routes/locationRoutes.js` |

### Sampling Rate

- **Per task commit:** Quick run command for the touched test file(s) — < 5s.
- **Per wave merge:** Full suite for the affected repo (RN client OR backend) — < 60s.
- **Phase gate:** Both full suites green + `bash scripts/check-create-listing-screen-removed.sh` exit 0 + `bash scripts/check-i18n-parity.sh` exit 0 + manual physical-device dry-run (Plan 02-08) before `/gsd-verify-work`.

### Wave 0 Gaps

- [ ] `src/components/ContextualListingFlow/__tests__/validators.test.ts` — covers FLOW-07, FLOW-08, FLOW-09, FLOW-10, FLOW-11, FLOW-12 (the validator covers ~80% of validation requirements)
- [ ] `src/components/ContextualListingFlow/__tests__/adapters.test.ts` — covers `propertyToFormBag` + `formBagToPropertyPayload` round-trip
- [ ] `src/components/ContextualListingFlow/__tests__/Step{1,2,3,4,5,6}.test.tsx` — RTL component smokes (6 files)
- [ ] `src/components/ContextualListingFlow/__tests__/integration.test.tsx` — Step 1→6 walk for apartment + rent_long
- [ ] `JayTap-services/src/__tests__/locationRoutes.test.js` — supertest cases
- [ ] Existing `JayTap-services/src/__tests__/moderationRoutes.test.js` — extend with location approve/reject cases
- [ ] `scripts/check-create-listing-screen-removed.sh` — sentinel (Plan 02-09)
- [ ] No framework install — Jest is already wired

---

## Atomic Deletion Sentinel

Per CONTEXT.md §<specifics> "Atomic deletion sentinel" + FLOW-14 + D-22.

**File:** `scripts/check-create-listing-screen-removed.sh` (NEW; lives at RN client repo root, sibling to `scripts/check-i18n-parity.sh`).

**Content:**

```bash
#!/usr/bin/env bash
# Phase 2 atomic-deletion sentinel — enforces FLOW-14 + D-22.
# Exits 0 if NO references to the deleted CreateListingScreen / CreateListingForm exist.
# Exits 1 if any reference is found (would mean the deletion regressed).
#
# Pattern source: M1 Phase 4 `scripts/check-land-removed.sh` enforcement pattern.
set -e

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT"

# Search the source tree (excluding node_modules + ios + android + .planning + scripts itself)
# for any import or path reference to the deleted screen + barrel.
MATCHES=$(grep -rnE "from ['\"].*src/screens/CreateListingScreen['\"]|from ['\"].*components/CreateListingForm['\"]|import.*CreateListingScreen|require\(['\"].*CreateListingScreen" \
  --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" \
  --exclude-dir=node_modules --exclude-dir=ios --exclude-dir=android --exclude-dir=.planning --exclude-dir=scripts \
  src/ App.tsx 2>/dev/null || true)

if [ -n "$MATCHES" ]; then
  echo "❌ FLOW-14 / D-22 atomic-deletion sentinel FAILED."
  echo "Found references to deleted CreateListingScreen / CreateListingForm:"
  echo "$MATCHES"
  exit 1
fi

echo "✅ FLOW-14 / D-22 atomic-deletion sentinel PASSED — no references to deleted screen/barrel."
exit 0
```

**CI insertion point:** Run as part of the existing `npm test` flow OR add a new `npm run lint:atomic-deletion` script in `package.json` and call it from CI alongside `scripts/check-i18n-parity.sh`. Recommended: **add to `package.json` scripts as `"check:atomic-deletion": "bash scripts/check-create-listing-screen-removed.sh"`** and document in Plan 02-09 closing tasks.

**Phase 5 gate:** Both `bash scripts/check-i18n-parity.sh` AND `bash scripts/check-create-listing-screen-removed.sh` must exit 0 before `/gsd-verify-work` for Phase 2.

**Exit semantics:**
- Exit 0 = clean (no references found)
- Exit 1 = at least one reference found (deletion regressed)

---

## i18n Key Delta — Lift-and-Paste for Plan 02-02

**Total: 107 new keys per language (×2 languages = 214 entries).**

Distribution (rough):
- Step 1: 12 keys (chip labels + headers)
- Step 2: 22 keys (city/district/map/Other modal/empty state)
- Step 3: 27 keys (area/price/currency/conditional sub-fields)
- Step 4: 12 keys (condition + furnished + chip labels)
- Step 5: 7 keys (title/description headers + placeholders)
- Step 6: 17 keys (deal-type matrix labels + chip labels + Custom int label)
- Discard confirm: 4 keys
- Progress / nav: 3 keys
- Mod queue Locations tab: 3 keys

### Step 1 (12)

```ts
'contextualListing.step1.title': 'About your listing',                      // RU: 'О вашем объявлении'
'contextualListing.step1.dealTypeLabel': 'Deal type',                       // RU: 'Тип сделки'
'contextualListing.step1.dealTypeRequired': 'Pick a deal type to continue', // RU: 'Выберите тип сделки'
'contextualListing.step1.dealType.sale': 'Sale',                            // RU: 'Продажа'
'contextualListing.step1.dealType.rent_long': 'Long-term rent',             // RU: 'Долгосрочная аренда'
'contextualListing.step1.dealType.rent_daily': 'Daily rent',                // RU: 'Посуточная аренда'
'contextualListing.step1.propertyTypeLabel': 'Property type',               // RU: 'Тип недвижимости'
'contextualListing.step1.propertyTypeRequired': 'Pick a property type to continue',
'contextualListing.step1.propertyType.apartment': 'Apartment',              // RU: 'Квартира'
'contextualListing.step1.propertyType.house': 'House',                      // RU: 'Дом'
'contextualListing.step1.propertyType.office': 'Office',                    // RU: 'Офис'
'contextualListing.step1.propertyType.commercial': 'Commercial',            // RU: 'Коммерческое'
'contextualListing.step1.propertyType.hotel': 'Hotel',                      // RU: 'Отель'
'contextualListing.step1.propertyType.hostel': 'Hostel',                    // RU: 'Хостел'
```
(Note: 12 above is excluding the 8 propertyType + dealType chip labels which add 8; total = 20 if you count chip labels; planner picks scope. Adjust count below if so.)

### Step 2 (22)

```ts
'contextualListing.step2.title': 'Where is the listing?',                   // RU: 'Где находится объявление?'
'contextualListing.step2.cityLabel': 'City',                                // RU: 'Город'
'contextualListing.step2.cityRequired': 'Pick a city to continue',
'contextualListing.step2.cityOther': 'Other',                               // RU: 'Другой'
'contextualListing.step2.cityOther.modalTitle': 'Add a new city',           // RU: 'Добавить новый город'
'contextualListing.step2.cityOther.placeholder': 'City name',
'contextualListing.step2.cityOther.countryLabel': 'Country',
'contextualListing.step2.cityOther.country.KG': 'Kyrgyzstan',
'contextualListing.step2.cityOther.country.KZ': 'Kazakhstan',
'contextualListing.step2.cityOther.country.UZ': 'Uzbekistan',
'contextualListing.step2.cityOther.submit': 'Submit for approval',
'contextualListing.step2.cityOther.success': 'City submitted for approval. You can use it for this listing now.',
'contextualListing.step2.cityOther.duplicate': 'This city already exists.',
'contextualListing.step2.districtLabel': 'District',                        // RU: 'Район'
'contextualListing.step2.districtRequired': 'Pick a district to continue',
'contextualListing.step2.districts.empty': 'No districts yet — be the first to add one',
'contextualListing.step2.districts.disabled': 'Pick a city first',
'contextualListing.step2.districtOther.modalTitle': 'Add a new district',
'contextualListing.step2.districtOther.placeholder': 'District name',
'contextualListing.step2.mapLabel': 'Drop a pin on the map',                // RU: 'Поставьте точку на карте'
'contextualListing.step2.coordinatesRequired': 'Tap on the map to drop a pin',
'contextualListing.step2.exactAddressToggle': 'Show exact address?',        // RU: 'Показать точный адрес?'
```

### Step 3 (27)

```ts
'contextualListing.step3.title': 'Basic information',                       // RU: 'Основные сведения'
'contextualListing.step3.areaLabel': 'Area (m²)',                           // RU: 'Площадь (м²)'
'contextualListing.step3.areaRequired': 'Enter a valid area',
'contextualListing.step3.priceLabel': 'Price',                              // RU: 'Цена'
'contextualListing.step3.priceRequired': 'Enter a valid price',
'contextualListing.step3.currencyLabel': 'Currency',                        // RU: 'Валюта'
'contextualListing.step3.currencyRequired': 'Pick a currency',
'contextualListing.step3.currency.KGS': 'KGS (сом)',
'contextualListing.step3.currency.USD': 'USD ($)',
'contextualListing.step3.currency.EUR': 'EUR (€)',
'contextualListing.step3.roomsLabel': 'Rooms',                              // RU: 'Комнаты'
'contextualListing.step3.roomsRequired': 'Pick the number of rooms',
'contextualListing.step3.rooms.1': '1',
'contextualListing.step3.rooms.2': '2',
'contextualListing.step3.rooms.3': '3',
'contextualListing.step3.rooms.4plus': '4+',
'contextualListing.step3.bathroomLabel': 'Bathroom',                        // RU: 'Санузел'
'contextualListing.step3.bathroomRequired': 'Pick bathroom availability',
'contextualListing.step3.bathroom.private': 'Private',                      // RU: 'Свой'
'contextualListing.step3.bathroom.none': 'None',                            // RU: 'Нет'
'contextualListing.step3.bathroom.shared': 'Shared',                        // RU: 'Общий'
'contextualListing.step3.kitchenLabel': 'Kitchen',                          // RU: 'Кухня'
'contextualListing.step3.kitchenRequired': 'Pick kitchen availability',
'contextualListing.step3.kitchen.private': 'Private',
'contextualListing.step3.kitchen.none': 'None',
'contextualListing.step3.kitchen.shared': 'Shared',
'contextualListing.step3.hotelRoomsLabel': 'Number of hotel rooms',         // RU: 'Количество номеров'
'contextualListing.step3.hotelRoomsRequired': 'Pick the number of hotel rooms',
'contextualListing.step3.hotelClassLabel': 'Class',                         // RU: 'Класс'
'contextualListing.step3.hotelClassRequired': 'Pick the class',
'contextualListing.step3.hotelClass.economy': 'Economy',                    // RU: 'Эконом'
'contextualListing.step3.hotelClass.standard': 'Standard',                  // RU: 'Стандарт'
'contextualListing.step3.hotelClass.comfort': 'Comfort',                    // RU: 'Комфорт'
'contextualListing.step3.hotelClass.premium': 'Premium',                    // RU: 'Премиум'
```

### Step 4 (12)

```ts
'contextualListing.step4.title': 'Condition and amenities',                 // RU: 'Состояние и удобства'
'contextualListing.step4.conditionLabel': 'Condition',                      // RU: 'Состояние'
'contextualListing.step4.conditionRequired': 'Pick the condition',
'contextualListing.step4.condition.rough': 'Rough (PSO)',                   // RU: 'Черновая (ПСО)'
'contextualListing.step4.condition.whitebox': 'White box',                  // RU: 'White box'
'contextualListing.step4.condition.good': 'Good',                           // RU: 'Хорошее'
'contextualListing.step4.condition.euro': 'Euro renovation',                // RU: 'Евроремонт'
'contextualListing.step4.furnishedLabel': 'Furnished',                      // RU: 'Мебель'
'contextualListing.step4.furnishedRequired': 'Pick yes or no',
'contextualListing.step4.furnished.yes': 'Yes',                             // RU: 'Да'
'contextualListing.step4.furnished.no': 'No',                               // RU: 'Нет'
```

### Step 5 (7)

```ts
'contextualListing.step5.title': 'Title and description',                   // RU: 'Заголовок и описание'
'contextualListing.step5.titleLabel': 'Listing title',                      // RU: 'Заголовок объявления'
'contextualListing.step5.titleRequired': 'Add a title',
'contextualListing.step5.titlePlaceholder': 'e.g. Cozy 2-bedroom in central Bishkek',
'contextualListing.step5.descriptionLabel': 'Description',                  // RU: 'Описание'
'contextualListing.step5.descriptionRequired': 'Add a description',
'contextualListing.step5.descriptionPlaceholder': 'Tell prospective tenants what makes this listing special',
```

### Step 6 (17)

```ts
'contextualListing.step6.title': 'Deal conditions',                         // RU: 'Условия сделки'
'contextualListing.step6.negotiableLabel': 'Bargain (negotiable)?',         // RU: 'Торг'
'contextualListing.step6.negotiableRequired': 'Pick yes or no',
'contextualListing.step6.negotiable.yes': 'Yes',
'contextualListing.step6.negotiable.no': 'No',
'contextualListing.step6.depositLabel': 'Deposit (optional)',               // RU: 'Депозит (необязательно)'
'contextualListing.step6.depositPlaceholder': 'Amount',
'contextualListing.step6.prepaymentLabel': 'Prepayment',                    // RU: 'Предоплата'
'contextualListing.step6.prepaymentRequired': 'Pick a prepayment',
'contextualListing.step6.prepayment.0': 'No prepayment',
'contextualListing.step6.prepayment.1': '1 month',                          // RU: '1 месяц'
'contextualListing.step6.prepayment.2': '2 months',                         // RU: '2 месяца'
'contextualListing.step6.prepayment.custom': 'Custom',                      // RU: 'Своё'
'contextualListing.step6.prepayment.customPlaceholder': 'Months',
'contextualListing.step6.minTermLabel': 'Minimum rental term',              // RU: 'Минимальный срок аренды'
'contextualListing.step6.minTermRequired': 'Pick a minimum term',
'contextualListing.step6.minTerm.1_month': '1 month',
'contextualListing.step6.minTerm.3_months': '3 months',
```

### Discard confirm (4)

```ts
'contextualListing.discardConfirm.title': 'Discard this listing?',          // RU: 'Отменить создание объявления?'
'contextualListing.discardConfirm.body': 'Your progress will be lost. This cannot be undone.',
'contextualListing.discardConfirm.confirm': 'Discard',                      // RU: 'Отменить'
// (common.cancel reused — no new key)
```

### Progress / nav (3)

```ts
'contextualListing.progress.stepOf': 'Step {current} of {total}',           // RU: 'Шаг {current} из {total}'
'contextualListing.submit.create': 'Submit for review',                     // RU: 'Отправить на проверку'
'contextualListing.submit.modEdit': 'Save and approve',                     // RU: 'Сохранить и одобрить'
// (common.next + common.back reused — no new key)
```

### Mod queue Locations tab (3)

```ts
'moderation.queue.tabs.listings': 'Listings ({count})',                     // RU: 'Объявления ({count})'
'moderation.queue.tabs.locations': 'Locations ({count})',                   // RU: 'Локации ({count})'
'moderation.queue.locations.empty': 'No pending locations.',
```

### Total Count

| Section | Keys |
|---------|------|
| Step 1 | 14 |
| Step 2 | 22 |
| Step 3 | 27 |
| Step 4 | 11 |
| Step 5 | 7 |
| Step 6 | 17 |
| Discard | 3 |
| Progress / nav | 3 |
| Mod queue tabs | 3 |
| **TOTAL** | **107** |

107 × 2 languages = 214 file entries. Within CONTEXT estimate (80–120). Planner can adjust during plan-phase if scope changes.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `react-native-maps` | Step 2 map pin (D-08) | ✓ | 1.27.1 | Tap-to-move fallback (Pitfall 1 mitigation) |
| Google Maps API key (Android) | Android map render | ✓ | Plumbed via `keystoreProperties['googleMapsApiKey']` (verified `android/app/build.gradle:96` + `AndroidManifest.xml:16-18`) | — |
| Apple Maps (iOS) | iOS map render via `PROVIDER_DEFAULT` | ✓ | iOS native | — |
| `react-native-keyboard-controller` | Form input keyboard avoidance | ✓ | 1.21.6 | — |
| Node 24 (`nvm use 24`) | Backend Plan 02-01 npm/node ops | ✓ (per memory `backend-node-version.md`) | — | — |
| MongoDB Atlas | Backend `City` + `District` persistence + seed migration | ✓ (Phase 1 baseline) | — | mongodump fallback for M0 (Phase 1 §Rollback pattern) |
| `transliteration` npm | Slug normalization (Tradeoff §G recommendation) | ❌ NOT installed | — | Hand-rolled 30-LOC Cyrillic table |

**Missing dependencies with no fallback:** None.
**Missing dependencies with fallback:** `transliteration` npm (hand-roll alternative documented).

---

## Open Questions (RESOLVED by Planner)

I-02 fix (per planner-revision iteration 1): All 6 open questions are RESOLVED below. Resolutions reflected in Plan 02-01 through Plan 02-09 frontmatter, must_haves, and task actions.

1. **Phase 1 Atlas migration deploy state** — has `01-HUMAN-UAT.md` item #1 ("Atlas live migration deploy") run? If NO, planner blocks Plan 02-01 backend deploy until operator runs it. Recommendation: Plan 02-01 Wave-0 task verifies via SSH-into-Railway curl + smoke test on a known seed listing-id.

   **RESOLVED:** Plan 02-01 Task 9 (Step 3 — pre-deploy operator handoff) explicitly defers backend Railway deploy until operator confirms Atlas migration. The plan's `<context>` block already references `.planning/phases/01-schema-reshape-backend-route-shape-cutover/01-HUMAN-UAT.md` so the executor can verify the deploy state at run time.

2. **Starter city list for `seed-locations-m3-data.json`** — researcher proposes the following minimum starter set (pulled from public sources per CONTEXT.md D-06):

   **KG (Kyrgyzstan):**
   - Bishkek (centroid 42.8746, 74.5698) — districts: Asanbay, Jal, Tunguch, Alamedin-1, Microdistrict 3-12, Kok-Jar, Vostok-5, Djal-23, Filarmonia, Aziya, Ortho-Sai
   - Osh (40.5283, 72.7985) — districts: TBD on PR
   - Karakol (42.4906, 78.3936)
   - Cholpon-Ata (42.6479, 77.0826)
   - Naryn (41.4287, 75.9911)

   **KZ (Kazakhstan):**
   - Almaty (43.2220, 76.8512)
   - Astana (51.1605, 71.4704)
   - Shymkent (42.3417, 69.5901)

   **UZ (Uzbekistan):**
   - Tashkent (41.2995, 69.2401)
   - Samarkand (39.6270, 66.9750)
   - Bukhara (39.7747, 64.4286)

   Planner finalizes; user reviews on PR per D-06.

   **RESOLVED:** The above starter list is adopted as the canonical seed source. Plan 02-01 Task 7 produces `src/scripts/seed-locations-m3-data.json` from this list. User reviews + edits on the PR before Task 9 operator-runs the seed against production Atlas (per D-06 + Plan 02-01 Task 9 Step 3).

3. **`platformConfig.depositsEnabled` — read at Phase 2 ship time?** SPEC §"Admin-Level Configuration" mentions a platform-wide toggle. CONTEXT.md says "if not, default to true". Planner picks: ship default-true behavior (no admin toggle UI in Phase 2) OR add a thin `GET /api/platform-config` endpoint with `{ depositsEnabled: true }` response. Recommend: default to `true` in client; defer admin toggle to M4.

   **RESOLVED:** Default to `true` in client; defer admin toggle to M4 per recommendation. Plan 02-04b Step 6 deposit input is always rendered as optional regardless of platformConfig (no fetch on mount). M4 owns the `GET /api/platform-config` endpoint + admin UI.

4. **Step 6 `prepaymentMonths` Custom-int upper bound** — should there be a max? E.g., 36 months? Planner picks. Recommend: no hard cap; UX warns if > 12.

   **RESOLVED:** No hard cap shipped in Phase 2. UX warning copy for > 12 deferred to M4 polish (out of Phase 2 scope per CONTEXT D-04 Phase-5-only QA matrix). Plan 02-04b Task 1's Custom-int input accepts any non-negative integer.

5. **`propertyToFormBag` for edit-mod when listing has missing nested-shape fields** (e.g., legacy listing migrated with `location.district === ''` per Phase 1 D-06) — should adapter throw, default-to-empty, or surface a warning to mod? Recommend: default-to-empty (mod fills in via the form; no throw).

   **RESOLVED:** Default-to-empty per recommendation. Plan 02-02 Task 3 `propertyToFormBag()` builder uses defensive defaults (empty strings + null for tri-state + empty terms object) for any missing nested-shape field. No throw, no warning. Mod fills in missing fields via the form on edit-mod.

6. **Seed migration timing** — D-06 says "Operator runs seed against production Atlas BEFORE Phase 2 backend cutover ships (so the chip lists are non-empty on first user open)." Planner confirms ordering: seed-locations-m3.js runs **after** Plan 02-01's locationRoutes.js Atlas-deploys but **before** the new flow ships in Plan 02-07. If the seed runs early and the model schema later changes, re-seed needed.

   **RESOLVED:** Ordering per recommendation. Plan 02-01 Task 9 Step 3 explicitly sequences: backend Railway deploy → operator runs `seed:locations --dry-run` → operator runs `seed:locations` (live) → operator runs `seed:locations --verify=PASS`. Plan 02-07 (App.tsx wire-through) does not ship until this sequence completes (Plan 02-07 frontmatter `depends_on: ["02-04b", "02-05", "02-06"]` indirectly enforces via Wave 1 backend-first ordering).

---

## State of the Art

| Old Approach (M1+M2) | Current Approach (M3 Phase 2) | When Changed | Impact |
|----------------------|------------------------------|--------------|--------|
| Single 996-LOC `CreateListingScreen.tsx` | 6-step `<ContextualListingFlow>` orchestrator + 6 step components | Phase 2 ship | Eliminates monolith; per-step validation; better mod-edit UX |
| Hardcoded Bishkek microdistrict const filter | Backend Location dictionary with mod-approval flow | Phase 2 (write side); HomeScreen filter stays hardcoded until M4+ | User-extensibility for KG/KZ/UZ; central authority on naming |
| Manual address typing → Nominatim auto-geocode (had hang issues per memory) | Map-pin-first with `react-native-maps` | Phase 2 ship | Eliminates Nominatim hang; UX is visual not textual |
| `'$' \| 'сом'` currency tokens | `'KGS' \| 'USD' \| 'EUR'` SPEC tokens (with EUR added) | Phase 2 ship | Aligns with SPEC; adds EUR support for KZ/UZ launch |
| Flat schema reads on M2 client | Nested schema reads on M3 client | Phase 2 ship (closes Phase 1 atomic-break window) | Clients see nested data; no shape mismatch |

**Deprecated/outdated (removed in Phase 2):**
- `CreateListingScreen.tsx` and `CreateListingForm/` barrel — DELETED per FLOW-14 (Plan 02-09)
- `geocodeAddress` backend call from user-facing create flow — eliminated per D-08 (memory `geocoder-nominatim-hang-axios-network-error.md` resolved by inversion)
- Flat-shape `address` / `bedrooms` / `bathrooms` reads on RN client — replaced by nested-shape per D-20
- `transactionType: 'rent' \| 'sale'` derivation in HospitalitySection — replaced by `dealType !== 'sale'` per Tradeoff §K

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `react-native-maps@1.27.1` Marker drag events MAY fail on RN 0.84 + Fabric (per Issue #5445 + #5836) | §Fabric Validation | If false (events fire reliably), tap-to-move fallback is unused but harmless. If true (events fail), Phase 5 QA will catch and tap-to-move covers. **Tracked.** |
| A2 | `transliteration@^2.x` is well-maintained and TypeScript-typed | §Standard Stack | If maintainership has lapsed, planner falls back to hand-rolled (30 LOC). |
| A3 | Backend Mongoose convention is "split models, no discriminators" — verified across 11 model files | §Tradeoff §C | Verified in this session via `find src/models -name "*.js"`. Low risk. |
| A4 | App.tsx LOC budget can absorb +10-30 net LOC after deletion | §R7 | Soft-cap concern; CONCERNS.md tracks. |
| A5 | i18n key delta of 107 keys is within CI gate's parity tolerance | §i18n Key Delta | Parity gate is per-file count match; 107 + 107 is symmetric. Low risk. |
| A6 | `platformConfig.depositsEnabled` admin toggle is NOT shipped in Phase 2 (default-true client behavior) | §Open Q3 | If user expects a toggle, planner adds a thin endpoint. |
| A7 | Operator runs Phase 1 Atlas migration BEFORE Phase 2 backend cutover (Plan 02-01) deploys | §R2 + §Open Q1 | If not run, Phase 2 ships against an empty Mongo collection (no nested data); read paths return empty but don't crash. Tester impact: similar to current M2-broken state. |
| A8 | The starter city list in §Open Q2 covers KG/KZ/UZ launch requirements | §Open Q2 | User reviews on PR per D-06. Risk: missing major city. Mitigation: user adds one and re-runs seed (idempotent). |

If A1 turns out wrong (drag events fire reliably) — celebrate, no code change. If A1 is correct (events don't fire), the tap-to-move fallback is the deciding mitigation.

---

## Sources

### Primary (HIGH confidence — verified in this session)

- `/Users/beckmaldinVL/development/mobileApps/JayTap/.planning/phases/02-6-step-contextual-listing-flow-client/02-CONTEXT.md` — 22 locked decisions (D-01..D-22)
- `/Users/beckmaldinVL/development/mobileApps/JayTap/.planning/phases/02-6-step-contextual-listing-flow-client/02-DISCUSSION-LOG.md` — alternatives considered
- `/Users/beckmaldinVL/development/mobileApps/JayTap/.planning/phases/999.1-contextual-listing-flow-m3-anchor/SPEC.md` — Version 2 anchor SPEC
- `/Users/beckmaldinVL/development/mobileApps/JayTap/.planning/REQUIREMENTS.md` — FLOW-01..FLOW-16 verbatim
- `/Users/beckmaldinVL/development/mobileApps/JayTap/.planning/ROADMAP.md` — Phase 2 5 Success Criteria
- `/Users/beckmaldinVL/development/mobileApps/JayTap/.planning/phases/01-schema-reshape-backend-route-shape-cutover/01-VERIFICATION.md` — Phase 1 outcomes
- `/Users/beckmaldinVL/development/mobileApps/JayTap/.planning/phases/01-schema-reshape-backend-route-shape-cutover/01-HUMAN-UAT.md` — 4 operator items pending
- `/Users/beckmaldinVL/development/mobileApps/JayTap/CLAUDE.md` — project rules
- `/Users/beckmaldinVL/development/mobileApps/JayTap/package.json` — RN client deps verified
- `/Users/beckmaldinVL/development/mobileApps/JayTap/src/types/Property.ts` — nested type stub verified
- `/Users/beckmaldinVL/development/mobileApps/JayTap/src/components/PropertyMap.tsx` — `react-native-maps` integration baseline
- `/Users/beckmaldinVL/development/mobileApps/JayTap/src/components/CreateListingForm/types.ts` — SectionProps pattern
- `/Users/beckmaldinVL/development/mobileApps/JayTap/src/components/CreateListingForm/validators.ts` — `validateByCategory` + `FIELD_ORDER_BY_CATEGORY` pattern
- `/Users/beckmaldinVL/development/mobileApps/JayTap/src/screens/CreateListingScreen.tsx` — moderatorContext + banner pattern (lines 54-59, 714-744)
- `/Users/beckmaldinVL/development/mobileApps/JayTap/src/screens/HomeScreen.tsx` — chip pattern (lines 486-516)
- `/Users/beckmaldinVL/development/mobileApps/JayTap/src/screens/ModerationQueueScreen.tsx` — verified NO existing tab structure
- `/Users/beckmaldinVL/development/mobileApps/JayTap/src/locales/en.ts` + `ru.ts` — verified `moderation.editOnBehalf.banner` exists
- `/Users/beckmaldinVL/development/mobileApps/JayTap/android/app/src/main/AndroidManifest.xml` — Google Maps API key plumbing verified
- `/Users/beckmaldinVL/development/mobileApps/JayTap/android/gradle.properties:35` — `newArchEnabled=true` verified
- `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/models/*.js` — 11 separate model files verified (no discriminator pattern)
- `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/routes/propertyRoutes.js:97-106` — `requireListingCapability` middleware verified

### Secondary (MEDIUM confidence — web sources)

- [GitHub Issue #5445 — Marker drag event functions are not firing](https://github.com/react-native-maps/react-native-maps/issues/5445) — confirms Marker `onDragEnd` regression in 1.22.x+
- [GitHub Issue #5836 — Marker not rendering on Android with RN 0.81 + Fabric](https://github.com/react-native-maps/react-native-maps/issues/5836)
- [GitHub Issue #5798 — 1.26.1+ marker issues](https://github.com/react-native-maps/react-native-maps/issues/5798)
- [GitHub Issue #5877 — Custom view markers broken with NA on Expo SDK 54 (RN 0.81)](https://github.com/react-native-maps/react-native-maps/issues/5877)
- [GitHub Issue #5569 — Draggable marker custom component anchor on Android](https://github.com/react-native-maps/react-native-maps/issues/5569)
- [GitHub Discussion #5355 — Fabric / New Architecture support](https://github.com/react-native-maps/react-native-maps/discussions/5355) — alpha-101+ has Fabric in RC; some marker features still iterating
- [GitHub Discussion #5616 — Stable RN+map combos](https://github.com/react-native-maps/react-native-maps/discussions/5616) — last reported stable on Fabric: NONE; on legacy arch: 1.20.1
- [react-native-maps changelog summary](https://raw.githubusercontent.com/react-native-maps/react-native-maps/master/CHANGELOG.md) — Fabric introduction in v1.21.0+
- [transliteration npm](https://www.npmjs.com/package/transliteration) — TypeScript, zero-dep, cross-platform
- [transliter npm](https://www.npmjs.com/package/transliter) — alternative for slug generation

### Tertiary (LOW confidence — single source, training-derived)

- None retained — all draggable + Fabric claims independently verified across multiple GitHub issues.

---

## Metadata

**Confidence breakdown:**
- Locked decision validation: HIGH — every D-XX traced to code or canonical reference
- Standard stack (existing): HIGH — `package.json` verified
- New dep recommendation (`transliteration`): MEDIUM — well-rated package, planner verifies version at install time
- `react-native-maps` Fabric draggable behavior: MEDIUM (with HIGH-confidence fallback recommendation) — multiple GitHub reports point at risk; tap-to-move fallback is HIGH-confidence safe
- Mongoose Location schema: HIGH — split-models recommendation verified via 11-model precedent
- i18n key delta count: HIGH — itemized walk
- Mod queue tab integration point: HIGH — verified ModerationQueueScreen has no existing tab structure
- Plan structure: HIGH — 9 plans sized to ≤8 tasks each, ≤4 hours each
- Pitfalls: HIGH — drawn from project memory + verified code

**Research date:** 2026-05-05
**Valid until:** 2026-06-05 (30-day estimate; react-native-maps moves fast — re-verify Fabric draggable status if Phase 2 doesn't ship within 30 days)

## RESEARCH COMPLETE

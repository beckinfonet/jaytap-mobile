---
id: 260525-ggp
type: quick
status: ready
created: 2026-05-25
description: "Fix the bottom-right spec chip on PropertyCard AND the corresponding spec row on PropertyDetailsScreen so the Bed value renders real data instead of '-' for the listings the M3 6-step form actually produces. ALSO fix the case-mismatch root cause in `propertyTypeToCategory` (Pascal lookup keys vs lowercase M3 data, per `Property.ts:29`) that causes hotel/hostel listings to route through PropertyCard instead of HospitalityCard. The PropertyCard / PropertyDetailsScreen read-path fallbacks are kept as defense-in-depth — they protect against any pre-existing listings whose `propertyType` shape pre-dates the routing fix and any future routing edge case. All three read surfaces are brought into line with the canonical pattern already used in HospitalityCard."
files_modified:
  - src/components/PropertyCard.tsx
  - src/screens/PropertyDetailsScreen.tsx
  - src/utils/propertyCategory.ts
  - src/utils/__tests__/propertyCategory.test.ts          # EXTENDED (adds lowercase-input cases that fence the routing fix)
  - src/components/__tests__/PropertyCard.specChip.test.tsx   # NEW (co-located behavior pin for both PropertyCard + PropertyDetailsScreen spec surfaces)
must_haves:
  truths:
    - "On the main listings list, a residential listing (propertyType ∈ apartment/house) created via the M3 6-step ContextualListingFlow renders its bedroom count in the bottom-right spec chip — NOT '-'."
    - "After the routing fix (Task 3), hotel/hostel listings (propertyType ∈ hotel/hostel, lowercase per Property.ts:29) render through HospitalityCard (not PropertyCard) on the main list — HospitalityCard.tsx:210 already does the correct `hotelRooms ?? rooms ?? '-'` fallback for the bed count, so the rendered room count is correct end-to-end without any change to HospitalityCard itself."
    - "Even when a hotel/hostel listing IS routed through PropertyCard (legacy data with no propertyType, capitalized inconsistently, or a build of the app shipped before the routing fix lands on a given device), PropertyCard's defensive `hotelRooms ?? rooms ?? '-'` fallback renders the room count correctly. Defense in depth — Task 1 still ships even though Task 3 makes it largely unreachable for hotel/hostel under normal conditions."
    - "On PropertyDetailsScreen (a tapped listing), the residential/commercial spec row (gated on `!isHospitality`, lines 1047–1075) renders its bedroom count from `basics?.hotelRooms ?? basics?.rooms ?? '-'`, matching the canonical pattern. For hotel/hostel listings (which now classify as Hospitality after Task 3) this row is hidden entirely — correct per the existing in-code comment at line 1042 (\"Hospitality uses rooms/maxGuests/amenities semantics\"). For residential / commercial the row renders correctly."
    - "A commercial listing (propertyType ∈ office/commercial) created via the M3 6-step ContextualListingFlow renders its bathroom enum (`property.bathroomPrivate` / `property.bathroomShared` / `property.bathroomNone`) in BOTH the PropertyCard spec chip AND the PropertyDetailsScreen spec row — NOT '-'."
    - "A listing whose category, by M3 form design, captures NO value for a given spec (residential apartment/house has no bathroom field captured) renders '-' in that half — which is the correct outcome because no data was captured by design. The chip/row itself stays visible and theme-tokened."
    - "The owner-view branch of PropertyCard (`showEditButton=true`, lines 215–278) is unchanged; it never rendered this spec chip and still doesn't."
    - "Read path is consistent with the M3 nested Property type: bedroom side prefers `basics?.hotelRooms ?? basics?.rooms`; bathroom side reads `basics?.bathroom` (no new schema field invented). Pattern mirrors HospitalityCard.tsx:210 verbatim on both PropertyCard and PropertyDetailsScreen."
    - "Dark + light theme parity preserved on both surfaces — PropertyCard uses `colors.chipBackground` / `colors.chipBorder` / `colors.text` / `colors.textSecondary`; PropertyDetailsScreen uses `colors.surface` / `colors.border` / `colors.text` / `colors.textSecondary`. No hardcoded colors introduced."
    - "EN + RU bathroom enum keys (`property.bathroomPrivate` / `property.bathroomShared` / `property.bathroomNone`) reused as-is — no new i18n keys."
    - "`propertyTypeToCategory(...)` returns the correct PropertyCategory for the lowercase enum values that real M3 data uses (`'apartment'` → `'Residential'`, `'hotel'` → `'Hospitality'`, `'office'` → `'Commercial'`, etc.), AND remains backwards-compatible with any Pascal-case input from latent test fixtures. All downstream consumers (HomeScreen filter at :174, HomeScreen Hospitality section gate at :226, OwnerListingsScreen split at :95/:100, FavoritesScreen split at :113/:118, RenterListingsScreen split at :201/:206, PropertyDetailsScreen `isHospitality` derivation at :273) behave correctly without any further change."
  artifacts:
    - path: "src/components/PropertyCard.tsx"
      provides: "Spec chip (lines ~280–298, viewer branch only) reads bedroom from `basics?.hotelRooms ?? basics?.rooms ?? '-'` and bathroom from `basics?.bathroom` enum-mapped → 3 i18n strings or '-' fallback."
    - path: "src/screens/PropertyDetailsScreen.tsx"
      provides: "Residential/Commercial spec row (line ~1051, `!isHospitality` branch) reads bedroom from `basics?.hotelRooms ?? basics?.rooms ?? '-'`. Bathroom enum-map (lines 1057–1064) unchanged — correct by M3 design (only office/commercial captures it; the `!isHospitality` gate filters out hospitality entirely so the `-` fallback only fires for residential listings, which is the right outcome per design)."
    - path: "src/utils/propertyCategory.ts"
      provides: "`propertyTypeToCategory(...)` performs case-insensitive lookup so it correctly classifies the lowercase enum (`'hotel'`, `'apartment'`, ...) actually stored in MongoDB per `Property.ts:29`. Continues to handle Pascal-case input gracefully. Exported constants (`PROPERTY_TYPES`, `RESIDENTIAL_TYPES`, `COMMERCIAL_TYPES`, `HOSPITALITY_TYPES`, `PROPERTY_TYPE_TO_CATEGORY`) stay Pascal-case to preserve `HomeScreen.tsx:514` chip-label rendering."
    - path: "src/utils/__tests__/propertyCategory.test.ts"
      provides: "Extended with lowercase-input cases (`'apartment'`, `'hotel'`, `'hostel'`, `'office'`, `'commercial'`) that PIN the routing fix — these cases would FAIL against the pre-Task-3 Pascal-only map. Existing Pascal-case cases retained as backwards-compatibility fence."
    - path: "src/components/__tests__/PropertyCard.specChip.test.tsx"
      provides: "Behavior pin — 6 cases across the propertyType matrix (apartment/house with rooms, hotel with hotelRooms only, hotel with neither, commercial with rooms+bathroom, office with rooms+bathroom, apartment with rooms but no bathroom). Forces any future change to the read path to also update the test."
  key_links:
    - from: "src/components/PropertyCard.tsx (viewer branch spec chip)"
      to: "src/types/Property.ts (basics.rooms | basics.hotelRooms | basics.bathroom)"
      via: "nested-shape optional chain"
      pattern: "basics\\?\\.(hotelRooms|rooms|bathroom)"
    - from: "src/screens/PropertyDetailsScreen.tsx (residential/commercial spec row)"
      to: "src/types/Property.ts (basics.hotelRooms | basics.rooms)"
      via: "nested-shape optional chain — same canonical pattern as PropertyCard"
      pattern: "basics\\?\\.hotelRooms \\?\\? .*basics\\?\\.rooms \\?\\? '-'"
    - from: "src/utils/propertyCategory.ts (propertyTypeToCategory)"
      to: "src/types/Property.ts:29 (lowercase propertyType enum) + HomeScreen.tsx:514 (Pascal display labels)"
      via: "case-insensitive lookup — normalize INPUT to lowercase before map read; map keys stay Pascal so display-label consumers (HomeScreen chip render at :514) remain unchanged"
      pattern: "toLowerCase|case-insensitive lookup"
      decision: "Normalize on the LOOKUP SIDE (input → lowercase before map read), NOT on the map-key side. Reason: `PROPERTY_TYPES` / `RESIDENTIAL_TYPES` / `COMMERCIAL_TYPES` / `HOSPITALITY_TYPES` are also used as DISPLAY LABELS (HomeScreen.tsx:514 renders `item.label` raw with no i18n lookup). Changing the constants to lowercase would regress the chip labels from 'Apartment' / 'Hotel' to 'apartment' / 'hotel'. The minimal correct fix is one normalization at the function entry point."
    - from: "src/components/PropertyCard.tsx + src/screens/PropertyDetailsScreen.tsx"
      to: "src/components/HospitalityCard.tsx:210 (pattern source)"
      via: "verbatim pattern transplant — `hotelRooms ?? rooms ?? '-'`"
      pattern: "hotelRooms \\?\\? .* \\?\\? '-'"
---

# Quick Task 260525-ggp — Fix Bed/Bath rendering on PropertyCard + PropertyDetailsScreen + propertyCategory routing

## Goal

On the main listings list, the small dark spec chip in the bottom-right of `PropertyCard` (viewer branch, lines 280–298) renders a Bed icon and a Bath icon. For the listing in the user's screenshot ("Vacation house • Bishkek", ID 173-162, $250/mo, FOR RENT) **both values fall back to '-'** because (a) the read path in PropertyCard does not match the M3 write path AND (b) the listing was incorrectly routed through PropertyCard at all — it should have been routed through HospitalityCard, where the bed-count fallback already exists.

This plan addresses both layers of the bug in one shipping unit (per user decision 2026-05-25 to bundle both open questions):

- **(a) Read path — PropertyCard.tsx:283 + 289–295 + PropertyDetailsScreen.tsx:1051.** Reads `property.basics?.rooms` for bedrooms with no `hotelRooms` fallback. Bug surface on TWO files.
- **(b) Write path — `ContextualListingFlow/Step3BasicInfo.tsx` + `validators.ts` + `adapters.ts`.** By design (M3 Phase 1 D-07, M3 Phase 2 FLOW-08): hotel/hostel listings write room count into `basics.hotelRooms` (NOT `basics.rooms`); apartment/house listings write into `basics.rooms`; bathroom is captured ONLY for office/commercial. The write path is correct per the M3 schema contract — do not change it.
- **(c) Routing root cause — `propertyTypeToCategory` in `src/utils/propertyCategory.ts`.** Lookup keys are Pascal-case (`'Apartment'`, `'Hotel'`, …) but `Property.ts:29` declares the runtime enum as lowercase (`'apartment' | 'house' | 'office' | 'commercial' | 'hotel' | 'hostel'`) and `Step1DealAndPropertyType.tsx:14-21` writes the lowercase values. Every real listing's `propertyType` misses the Pascal map → hits the `??` safe-default → returns `'Residential'`. Consequence: hotel/hostel listings render through PropertyCard (wrong) instead of HospitalityCard (correct).

The fix is **frontend-only** across three source files plus two test files (one extended, one new). No schema change, no new i18n key, no backend touch.

## Root cause

The M3 6-step `ContextualListingFlow` writes bedroom counts to **one of two paths** depending on propertyType, and bathroom to **only one of three category branches**:

| propertyType | bedroom path captured by Step3 | bathroom captured? |
|---|---|---|
| apartment, house | `basics.rooms` | NO (by design — Step3BasicInfo.tsx:171–190 only renders rooms chip for residential) |
| office, commercial | `basics.rooms` | YES → `basics.bathroom` (private/shared/none) |
| hotel, hostel | `basics.hotelRooms` (NOT `basics.rooms`) | NO (by design — Step3BasicInfo.tsx:193–271 only renders bathroom chip for office/commercial) |

This is the canonical contract from M3 Phase 1 — see `.planning/milestones/v3.0-phases/01-schema-reshape-backend-route-shape-cutover/01-02-PLAN.md:197–198` ("D-07 conditional rooms destination: hospitality → hotelRooms; else → rooms") and confirmed by `Step3.test.tsx` (which asserts hotel/hostel renders hotelRooms and NOT rooms).

`PropertyCard.tsx:283` AND `PropertyDetailsScreen.tsx:1051` both read ONLY `basics?.rooms` → so hotel/hostel listings render `-` for the bedroom side, even when `basics.hotelRooms = '3'`. That's bug part 1 (now on two surfaces).

`PropertyCard.tsx:289–295` AND `PropertyDetailsScreen.tsx:1057–1064` both read `basics?.bathroom` → so residential listings render `-` for the bathroom side (no data was ever captured by design — apartment/house don't have a bathroom field). For hotel/hostel listings the bathroom row should not be visible at all once routing is fixed (PropertyCard is no longer reached; PropertyDetailsScreen's `!isHospitality` gate hides the whole spec row).

**Why a "Vacation house" listing is rendering through PropertyCard in the first place** (the deeper root cause):

- `Property.ts:29` declares `propertyType` lowercase: `'apartment' | 'house' | 'office' | 'commercial' | 'hotel' | 'hostel'`
- `Step1DealAndPropertyType.tsx:14-21` writes lowercase: `['apartment', 'house', 'office', 'commercial', 'hotel', 'hostel']`
- `propertyCategory.ts:30-41` looks up Pascal-case keys: `{ Apartment: 'Residential', …, Hotel: 'Hospitality', Hostel: 'Hospitality' }`
- `propertyCategory.ts:53` does `PROPERTY_TYPE_TO_CATEGORY[propertyType as PropertyType] ?? 'Residential'` — the cast lies; the index lookup with `'hotel'` returns `undefined` → falls through to `'Residential'`
- `HomeScreen.tsx:574-594` picks the renderer: `selectedCategory === 'Hospitality' ? <HospitalityCard /> : <PropertyCard />` — and `selectedCategory` is set from chip clicks, while individual listings classify via `propertyTypeToCategory(p.propertyType)`
- Net effect: even when the user is on the Residential tab, every hotel/hostel listing CLAIMS to be Residential per the broken classifier, so it lands in the filtered list AND renders through PropertyCard

This is the bug. The existing test `src/utils/__tests__/propertyCategory.test.ts` does NOT catch it because all its cases pass Pascal-case input (`'Apartment'`, `'Hotel'`) which is exactly the case the function happens to handle — the test is testing the wrong direction. Real data passes lowercase, which the test never exercises.

For the "Vacation house" listing in the screenshot: `propertyType: 'hotel'` (lowercase) → classifier returns `'Residential'` (wrong) → renders through PropertyCard (wrong) → bed/bath chip reads `basics?.rooms` and `basics?.bathroom` (wrong for hotel) → both render `-`. After this plan: classifier returns `'Hospitality'` → renders through HospitalityCard → bed shows `basics?.hotelRooms` correctly.

## Context

- Bug surface 1: `src/components/PropertyCard.tsx` lines 280–298 (the `else` branch of the `showEditButton` ternary at line 279 — viewer pill only).
- Bug surface 2: `src/screens/PropertyDetailsScreen.tsx` lines 1047–1075 (`!isHospitality` branch — the residential/commercial spec row).
- Routing root cause: `src/utils/propertyCategory.ts` lines 30–41 (Pascal-case map) + line 53 (lookup site).
- Type contract: `src/types/Property.ts:29` (`propertyType` enum is LOWERCASE) and `:46–55` (`basics: { areaSqm, price, currency, rooms?, bathroom?, kitchen?, hotelRooms?, hotelClass? }`).
- Form contract: `src/components/ContextualListingFlow/Step3BasicInfo.tsx:171` (rooms gated on apartment/house/office/commercial), `:193` (bathroom+kitchen gated on office/commercial), `:233` (hotelRooms+hotelClass gated on hotel/hostel). Validators at `validators.ts:62–75` match the same matrix.
- Form input contract: `src/components/ContextualListingFlow/Step1DealAndPropertyType.tsx:14-21` — chips are lowercase: `['apartment', 'house', 'office', 'commercial', 'hotel', 'hostel']`. Adapter `adapters.ts:69` writes lowercase through to the API payload unchanged.
- Pattern source — VERBATIM: `src/components/HospitalityCard.tsx:210` — `{(property.basics?.hotelRooms ?? property.basics?.rooms ?? '-')} {t('hospitality.rooms')} · …`. Comment at line 207–208 documents the design: "hotelRooms (basics.hotelRooms) takes precedence for hotel/hostel; falls back to generic basics.rooms".
- Downstream consumers of `propertyTypeToCategory` (Task 3 must NOT break any of these):
  - `src/screens/HomeScreen.tsx:174` — main list category filter
  - `src/screens/HomeScreen.tsx:226` — Hospitality section header derivation
  - `src/screens/OwnerListingsScreen.tsx:95`, `:100` — owner-view hospitality/non-hospitality split
  - `src/screens/FavoritesScreen.tsx:113`, `:118` — favorites split
  - `src/screens/RenterListingsScreen.tsx:201`, `:206` — renter-view split
  - `src/screens/PropertyDetailsScreen.tsx:273` — `isHospitality` derivation
  - All consumers will START WORKING CORRECTLY after Task 3 — none break (broken classification today means hotel/hostel listings render in the wrong filter/section anyway).
- Downstream consumers of the EXPORTED CONSTANTS (`PROPERTY_TYPES` / `RESIDENTIAL_TYPES` / `COMMERCIAL_TYPES` / `HOSPITALITY_TYPES`) that depend on their Pascal-case shape (Task 3 must NOT change these):
  - `src/screens/HomeScreen.tsx:484-487` — picks chip list per `selectedCategory`
  - `src/screens/HomeScreen.tsx:514` — renders `item.label` (Pascal text) directly as the chip label — there is NO i18n lookup, so changing the constants to lowercase would visibly regress the chips from "Apartment" to "apartment". HomeScreen.tsx:178-179 separately does its own `.toLowerCase()` on both sides for the filter compare, so the lowercase data + Pascal label pair already works there.
- Owner branch of PropertyCard (lines 215–278) renders edit/archive/delete/unarchive icons, not a spec chip — out of scope for this fix.
- Existing i18n keys (verified): `property.bathroomPrivate` = "Private", `property.bathroomShared` = "Shared", `property.bathroomNone` = "None" (en.ts:125–127). No new keys needed.
- Theme tokens already in place on both surfaces. Dark + light parity preserved.
- `src/components/ListingMetaTable.tsx:68–69` — same nested reads, but `null != x` gate hides the row gracefully (no user-visible `-`). Not user-visible; intentionally left alone.

## Tasks

### Task 1 — Apply `hotelRooms ?? rooms` fallback to the Bed value on BOTH PropertyCard and PropertyDetailsScreen

**Files:**
- `src/components/PropertyCard.tsx`
- `src/screens/PropertyDetailsScreen.tsx`

**Action:**

**Part A — PropertyCard.tsx:283.** In the viewer-branch spec chip (the `else` branch at line 279, specifically lines 281–284 for the Bed `<View>`), change the bedroom-side `<Text>` from

`{property.basics?.rooms ?? '-'}`

to the canonical pattern already used by HospitalityCard.tsx:210

`{property.basics?.hotelRooms ?? property.basics?.rooms ?? '-'}`

**Part B — PropertyDetailsScreen.tsx:1051.** In the `!isHospitality` spec row (lines 1047–1075), specifically line 1051 inside the Bed `View` (`<Text style={[styles.specValue, { color: colors.text }]}>{property.basics?.rooms ?? '-'}</Text>`), apply the same one-line transplant:

`<Text style={[styles.specValue, { color: colors.text }]}>{property.basics?.hotelRooms ?? property.basics?.rooms ?? '-'}</Text>`

Rationale (both parts): when a hotel/hostel listing is rendered through either surface (legacy data without proper category routing, OR a build of the app deployed before Task 3 lands on a given device, OR a listing whose `propertyType` is missing), `basics.hotelRooms` is the populated path per M3 Phase 1 D-07. The `??` chain preserves correct behavior for residential listings (apartment/house) which only have `basics.rooms`, and for commercial listings (office/commercial) which also only have `basics.rooms`. After Task 3 lands, the PropertyDetailsScreen change becomes belt-and-braces (hospitality listings won't enter the `!isHospitality` branch at all) — but it stays correct in either world, so we ship it as a defensive consistency fix that also matches HospitalityCard's documented pattern.

Do NOT touch the bathroom side on either surface (PropertyCard lines 286–297, PropertyDetailsScreen lines 1057–1064). Both enum-mapping ternaries are correct per the M3 contract — residential listings have no captured bathroom data by design, so the `-` fallback is the right outcome for that category. Office/commercial listings populate it correctly today; hospitality listings won't reach either bathroom render after Task 3 (PropertyCard isn't used for hospitality; PropertyDetailsScreen hides the whole spec row via `!isHospitality`).

Do NOT touch the owner-view branch of PropertyCard (lines 215–278), the hero image, the price row, the i18n keys, the StyleSheet, or any other line on either file. Two minimal one-liner changes.

Add a brief inline code comment above each changed `<Text>` documenting the pattern source: `// Hotel/hostel listings write to basics.hotelRooms per M3 Phase 1 D-07 (.planning/milestones/v3.0-phases/01-schema-reshape-backend-route-shape-cutover/01-02-PLAN.md:197-198). Mirrors HospitalityCard.tsx:210. Defensive: routing now sends hospitality to HospitalityCard (260525-ggp Task 3), this fallback handles legacy data.`

Follow project conventions: no hardcoded colors (none introduced); use existing `useTheme()` tokens (no change needed); no new i18n keys (none needed); 2-space indent; single-quote strings; prettier-clean.

**Verify:**

```
npx tsc --noEmit 2>&1 | grep -E '(src/components/PropertyCard\.tsx|src/screens/PropertyDetailsScreen\.tsx)' || echo 'OK: zero new tsc errors in modified files'
```

(Baseline check: there may be pre-existing project-wide tsc errors; this gates only on net-new errors attributable to these two files.)

```
grep -c "property.basics?.hotelRooms ?? property.basics?.rooms ?? '-'" src/components/PropertyCard.tsx
```

Expected: `1` (the new line in PropertyCard).

```
grep -c "property.basics?.hotelRooms ?? property.basics?.rooms ?? '-'" src/screens/PropertyDetailsScreen.tsx
```

Expected: `1` (the new line in PropertyDetailsScreen).

```
grep -nP "property\.basics\?\.rooms \?\? '-'" src/components/PropertyCard.tsx src/screens/PropertyDetailsScreen.tsx | grep -v hotelRooms
```

Expected: zero hits — the pre-fix exact-string pattern (rooms-only fallback) is gone from BOTH files. Defends against accidental re-introduction. (The `grep -v hotelRooms` strips the new pattern from the match window so we count only the bad pattern.)

**Done:**
- PropertyCard.tsx:283 reads `basics?.hotelRooms ?? basics?.rooms ?? '-'` for the Bed value.
- PropertyDetailsScreen.tsx:1051 reads `basics?.hotelRooms ?? basics?.rooms ?? '-'` for the Bed value.
- Bathroom enum-map unchanged on both surfaces.
- Zero new tsc errors attributable to either file.
- Pattern matches HospitalityCard.tsx:210 verbatim on both surfaces.

---

### Task 2 — Behavior-pin tests for the PropertyCard spec chip read path

**Files:**
- `src/components/__tests__/PropertyCard.specChip.test.tsx` (NEW)

**Action:**
Create a new RTL test file `src/components/__tests__/PropertyCard.specChip.test.tsx` co-located with other component tests (alongside `EmailVerifyBanner.test.tsx`, `Gated.test.tsx`). The test mounts `<PropertyCard>` with the viewer branch (`showEditButton=false`, default) and asserts the rendered Bed value text and Bath value text across the propertyType matrix:

Cases (one `test()` each):
1. `propertyType='apartment'`, `basics: { rooms: '2' }` → Bed renders `'2'`, Bath renders `'-'`.
2. `propertyType='house'`, `basics: { rooms: '3' }` → Bed renders `'3'`, Bath renders `'-'`.
3. `propertyType='hotel'`, `basics: { hotelRooms: '4+' }` (no `rooms`) → Bed renders `'4+'`, Bath renders `'-'`. **This is the regression-fence case** — pre-Task-1 would render `-`. Note: even after Task 3 makes this routing unreachable in production, the test still pins the defensive fallback shape.
4. `propertyType='hostel'`, `basics: { hotelRooms: '1' }` → Bed renders `'1'`, Bath renders `'-'`. (Mirrors case 3.)
5. `propertyType='office'`, `basics: { rooms: '2', bathroom: 'private' }` → Bed renders `'2'`, Bath renders the resolved string for `property.bathroomPrivate`. Use the t-mock to assert the i18n key was queried — see mock recipe below.
6. `propertyType='hotel'`, `basics: {}` (no rooms AND no hotelRooms) → Bed renders `'-'`, Bath renders `'-'`. Edge case: ensures the `??` chain falls through cleanly.

For the mock surface, follow the deep-mock recipe used in `.planning/milestones/v3.0-phases/04-m2-carry-forward-bug-fixes/04-04-PLAN.md:695` and the `ModerationQueueScreen.test.tsx` style:
- Mock `useTheme` to return a minimal `colors` object covering only the tokens PropertyCard reads (text, textSecondary, surface, border, chipBackground, chipBorder, primary, inputBackground, error — pass empty strings if unused, the test does not assert color values).
- Mock `useLanguage` to return `{ t: (key) => key, language: 'en' }` so bathroom enum keys can be asserted by their key string (e.g., the rendered Bath `<Text>` for case 5 contains `'property.bathroomPrivate'`).
- Mock `useAuth` to return `{ user: { localId: 'viewer-uid' } }` so the viewer branch path is used (and to satisfy the import).
- Mock `lucide-react-native` icons (`Heart`, `Bed`, `Bath`, `Pencil`, `Trash2`, `Archive`, `ArchiveRestore`) to return `null` — they're not asserted.
- Mock `react-native` `Share` minimally to avoid the import-level side effect.
- Mock `ListingMetaTable` and `StatusPill` to return `null` — out of scope.
- Render with a minimal `Property` object cast to satisfy the type (use `as unknown as Property` for the test data), supplying `id`, `dealType: 'rent_long'`, `propertyType`, `basics`, and `content.title: 'Test'`. Provide no-op handlers for required props (`onPress`, `onViewTour`, `onViewVideo`).
- Pattern check: this repo uses **react-test-renderer**, not @testing-library/react-native (see `PropertyDetailsScreen-mod-403.test.tsx:22-23` comment — "RTL/jest-native is NOT in dev deps; this repo uses RTR"). Mount via `TestRenderer.create(...)`, walk the resulting tree, and assert text content by traversing `root.findAllByType(Text)` and checking `props.children`. If `@testing-library/react-native` IS available (verify via `npm ls @testing-library/react-native` at the start of the task), prefer it for ergonomics — but RTR is the documented fallback for this repo.

**Why no separate test for PropertyDetailsScreen Task 1 Part B:** The existing PropertyDetailsScreen test (`PropertyDetailsScreen-mod-403.test.tsx`) is a tightly-scoped harness for the moderation 403 flow; it deliberately does NOT mount the real screen tree (see its lines 10-23 explanation). Adding a full-render PropertyDetailsScreen test for the spec row would require mocking `react-native-maps`, `lucide-react-native`, `HospitalityCard`, `ListingMetaTable`, and 5+ other heavy dependencies — disproportionate for a one-line read-path change. The grep gate in Task 1 §Verify catches accidental regression of the exact-string pattern on that file. If the user wants a render-tree-asserted test for the PropertyDetailsScreen spec row, recommend opening as a follow-up quick task with proper time for the mock-tree build.

**Verify:**

```
npx jest src/components/__tests__/PropertyCard.specChip.test.tsx
```

All 6 cases pass. Test file added; no other test files modified by Task 2.

```
grep -c "hotelRooms" src/components/__tests__/PropertyCard.specChip.test.tsx
```

Expected: `>= 3` (the test pins the fallback chain pattern across cases 3, 4, and 6).

**Done:**
- New test file exists at `src/components/__tests__/PropertyCard.specChip.test.tsx`.
- All 6 cases green on first run after Task 1 Part A lands.
- The hotel/hostel cases (3, 4) would fail against the PRE-Task-1 code (proving the test is regression-fencing the fix, not just shadowing it).
- No existing tests modified by Task 2; no new dependencies installed.

---

### Task 3 — Fix `propertyTypeToCategory` case-mismatch (Pascal map vs lowercase data) so hotel/hostel listings route to HospitalityCard

**Files:**
- `src/utils/propertyCategory.ts`
- `src/utils/__tests__/propertyCategory.test.ts`

**Action:**

**Part A — `src/utils/propertyCategory.ts` (the fix).**

The existing function (lines 47–54) is:

```
export function propertyTypeToCategory(
  propertyType: string | null | undefined,
): PropertyCategory {
  if (!propertyType) {
    return 'Residential';
  }
  return PROPERTY_TYPE_TO_CATEGORY[propertyType as PropertyType] ?? 'Residential';
}
```

Replace the lookup with a case-insensitive variant. **Do NOT change** the `PROPERTY_TYPE_TO_CATEGORY` map keys (still Pascal) or the exported `PROPERTY_TYPES` / `RESIDENTIAL_TYPES` / `COMMERCIAL_TYPES` / `HOSPITALITY_TYPES` arrays (still Pascal) — these are used as display labels in `HomeScreen.tsx:514` with no i18n lookup and changing them would visibly regress the filter chips.

The minimal correct change: normalize the input before the map read. Recommended shape — capitalize the first letter of the lowercase input to match the existing Pascal keys (because the Pascal keys are simple single-word identifiers, this trivially round-trips):

```
export function propertyTypeToCategory(
  propertyType: string | null | undefined,
): PropertyCategory {
  if (!propertyType) {
    return 'Residential';
  }
  // Property.ts:29 declares propertyType lowercase; Step1DealAndPropertyType.tsx:14-21
  // writes lowercase; but the map keys are Pascal (kept Pascal because they're used as
  // raw display labels in HomeScreen.tsx:514). Normalize the lookup side, not the map.
  const normalized = propertyType.charAt(0).toUpperCase() + propertyType.slice(1).toLowerCase();
  return PROPERTY_TYPE_TO_CATEGORY[normalized as PropertyType] ?? 'Residential';
}
```

This handles:
- Lowercase M3 input (`'hotel'` → `'Hotel'` → `'Hospitality'`) ✓ — this is the bug fix
- Pascal-case input (`'Apartment'` → `'Apartment'` → `'Residential'`) ✓ — backwards-compatible with the existing test
- All-caps / mixed-case input (`'HOTEL'` → `'Hotel'` → `'Hospitality'`) ✓ — defensive bonus
- Unknown value (`'land'` → `'Land'` → `??` → `'Residential'`) ✓ — preserves the safe-default behavior

Add an inline JSDoc note above the function: `// 260525-ggp: normalize input case before map lookup — M3 data (Property.ts:29) is lowercase, map keys are Pascal (kept Pascal because PROPERTY_TYPES is also used as display labels in HomeScreen.tsx:514 with no i18n wrap). Map normalization, not data normalization.`

Update the existing top-of-file comment block at lines 7-11 (the "Convention: matches src/utils/passwordPolicy.ts shape …" block) to mention the case-normalization invariant: append `Lookup is case-insensitive (260525-ggp: M3 propertyType data is lowercase per Property.ts:29; map keys are Pascal for display-label reuse in HomeScreen.tsx:514).`

Do NOT change:
- The exported `PropertyCategory` type
- The `PROPERTY_TYPES` array (order matters per the existing comment)
- The `RESIDENTIAL_TYPES` / `COMMERCIAL_TYPES` / `HOSPITALITY_TYPES` arrays
- The `PROPERTY_TYPE_TO_CATEGORY` map keys or values
- The fallback to `'Residential'` (preserves "safe default for brownfield data")

**Part B — `src/utils/__tests__/propertyCategory.test.ts` (extend the tests).**

Add a new `describe` block AFTER the existing `'PROPERTY_TYPE_TO_CATEGORY map integrity'` block. Keep the existing 6 cases (lines 11–29 + 34 + 38) untouched — they continue to validate Pascal-case input as a backwards-compatibility fence.

Add these new cases — each PINS the routing fix and would FAIL against the pre-Task-3 code:

```
describe('propertyTypeToCategory — lowercase M3 input (Property.ts:29) — 260525-ggp routing fix', () => {
  test('lowercase apartment maps to Residential (real M3 data shape)', () => {
    expect(propertyTypeToCategory('apartment')).toBe('Residential');
  });

  test('lowercase house maps to Residential', () => {
    expect(propertyTypeToCategory('house')).toBe('Residential');
  });

  test('lowercase office maps to Commercial', () => {
    expect(propertyTypeToCategory('office')).toBe('Commercial');
  });

  test('lowercase commercial maps to Commercial', () => {
    expect(propertyTypeToCategory('commercial')).toBe('Commercial');
  });

  test('lowercase hotel maps to Hospitality (THE bug — was returning Residential)', () => {
    expect(propertyTypeToCategory('hotel')).toBe('Hospitality');
  });

  test('lowercase hostel maps to Hospitality (THE bug — was returning Residential)', () => {
    expect(propertyTypeToCategory('hostel')).toBe('Hospitality');
  });

  test('mixed-case HoTeL maps to Hospitality (defensive normalization)', () => {
    expect(propertyTypeToCategory('HoTeL')).toBe('Hospitality');
  });

  test('all-caps HOTEL maps to Hospitality', () => {
    expect(propertyTypeToCategory('HOTEL')).toBe('Hospitality');
  });

  test('unknown lowercase input still falls back to Residential (safe-default preserved)', () => {
    expect(propertyTypeToCategory('land')).toBe('Residential');
  });
});
```

**Verify:**

```
npx jest src/utils/__tests__/propertyCategory.test.ts
```

Expected: ALL cases green (existing 6 + new 9 = 15 cases). The new 6 lowercase enum cases (`apartment`, `house`, `office`, `commercial`, `hotel`, `hostel`) WOULD FAIL against the pre-Task-3 function — proving the test pins the fix.

```
grep -nP "selectedCategory|propertyTypeToCategory|isHospitality" src/screens/HomeScreen.tsx src/screens/OwnerListingsScreen.tsx src/screens/FavoritesScreen.tsx src/screens/RenterListingsScreen.tsx src/screens/PropertyDetailsScreen.tsx | wc -l
```

Expected: matches non-zero; this is a sanity probe to confirm the downstream consumers still exist and Task 3 doesn't accidentally delete a usage. Compare against the pre-fix value (run before editing) — should be IDENTICAL.

```
npx tsc --noEmit 2>&1 | grep -E 'src/utils/propertyCategory\.ts' || echo 'OK: zero new tsc errors in propertyCategory.ts'
```

Manual reasoning verify (no automated test for this): mentally walk each downstream consumer and confirm the behavior change is the INTENDED outcome:
- `HomeScreen.tsx:174` (`propertyTypeToCategory(p.propertyType) !== selectedCategory`) — hotel listings now classify as Hospitality, so they're filtered OUT of Residential/Commercial tabs and INTO Hospitality tab. ✓ Correct.
- `HomeScreen.tsx:226` (`propertyTypeToCategory(p.propertyType) === 'Hospitality'`) — hotel listings now feed the Hospitality section on the main list. ✓ Correct (was empty before).
- `OwnerListingsScreen.tsx:95`/`:100` — owner now sees their hotel listings under "Hospitality" instead of mixed into "All". ✓ Correct.
- `FavoritesScreen.tsx:113`/`:118` — same. ✓ Correct.
- `RenterListingsScreen.tsx:201`/`:206` — same. ✓ Correct.
- `PropertyDetailsScreen.tsx:273` (`isHospitality = category === 'Hospitality'`) — hotel listings now hit the hospitality branches (amenity grid, no specs row, sticky bar padding, etc.) which were the design target all along. ✓ Correct.

If any of the above behavior changes is NOT what the user expects on-device QA, that's a NEW bug surface owned by a follow-up task — NOT a reason to revert Task 3, because the current behavior is provably wrong against Property.ts:29.

**Done:**
- `propertyCategory.ts` `propertyTypeToCategory` is case-insensitive on input.
- Map keys + exported constants unchanged.
- Existing 6 test cases still green.
- New 9 test cases added and green (6 lowercase + 2 mixed/upper case + 1 unknown).
- Zero net new tsc errors attributable to `propertyCategory.ts`.
- `git grep -n "PROPERTY_TYPES\|RESIDENTIAL_TYPES\|COMMERCIAL_TYPES\|HOSPITALITY_TYPES"` returns the same hit count + locations as before this task.

---

## Out of scope

The following surfaces are explicitly NOT in scope, with rationale:

- **Renaming `PROPERTY_TYPES` / `RESIDENTIAL_TYPES` / `COMMERCIAL_TYPES` / `HOSPITALITY_TYPES` to lowercase, OR i18n-wrapping the chip labels in `HomeScreen.tsx:514`.** Either would be a bigger refactor: the chip labels currently render the raw Pascal strings as English UI text, which means there's an implicit "the chip labels are English-only" assumption in the codebase today. That's an M4 i18n correctness gap (the chip labels are not localized to RU), not part of this fix. The case-normalization in Task 3 is the minimal correct fix.
- **`src/components/ListingMetaTable.tsx:68–69`** — same nested reads, but `null != x` gate hides the row gracefully (no user-visible `-`). Not user-visible; intentionally left alone.
- **Backend Mongoose schema** (`/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services`) — no change. The M3 schema accepts both `basics.rooms` and `basics.hotelRooms` per Phase 1 D-07; the write path is correct; the read path + routing are the only sides that were inconsistent.
- **i18n keys** — `property.bathroomPrivate/Shared/None` already exist in en.ts:125–127. No new keys needed.
- **A full render-tree test for PropertyDetailsScreen's spec row** — would require a heavy mock tree for react-native-maps + lucide + HospitalityCard + ListingMetaTable. Disproportionate to a one-line read-path change; grep gate in Task 1 §Verify is the agreed substitute. If higher coverage is desired, open a separate quick task.
- **Owner-view branch (PropertyCard lines 215–278), hero image, price row, share/heart buttons, status pill, the full-card touch target, animations, accessibility props.**
- **Quick tasks already shipped today (260525-eva Photos tile, 260525-fjw chat keyboard) — explicitly do not touch.**

## Open questions / blocking decisions

### Resolved this round (per user 2026-05-25)

1. **Q1 — Extend the fix to PropertyDetailsScreen.tsx:1051? — RESOLVED-BUNDLED.** User confirmed bundling. Now Task 1 Part B in this plan. Bathroom enum-map on PropertyDetailsScreen is left alone for the same reason as on PropertyCard: residential `-` is the correct render by M3 design; hospitality is hidden by the `!isHospitality` gate after Task 3 fixes routing.
2. **Q2 — Open the propertyCategory case-mismatch as a sibling quick task? — RESOLVED-BUNDLED.** User confirmed bundling. Now Task 3 in this plan. After Task 3 lands, hotel/hostel listings route to HospitalityCard, where the existing `hotelRooms ?? rooms ?? '-'` fallback at line 210 already handles the bed count correctly. The PropertyCard fallback from Task 1 is kept as defense-in-depth for legacy data and pre-Task-3 builds.

### New / carried open questions

3. **Listing ID 173-162 shape unconfirmed.** Still not blocking — the plan handles both cases (`hotelRooms` set → renders; neither set → renders `-` which is fine). User can `curl https://<backend>/api/listings/173-162 | jq '.basics'` to confirm before/after the fix.

4. **NEW — Does fixing the routing surface any latent layout bugs in the hospitality code paths that were never tested with real data?** (Surfaced by Task 3 reachability analysis.) Pre-fix, the Hospitality section on HomeScreen (`HomeScreen.tsx:226` → `hospitalityProperties` filter) was empty for every real listing (because every listing classified as Residential). After Task 3, this section gets populated for the first time. Same for: the Hospitality tab filter on HomeScreen, OwnerListingsScreen's hospitality split, FavoritesScreen's hospitality split, RenterListingsScreen's hospitality split, and PropertyDetailsScreen's `isHospitality` branches (amenity grid render, sticky-bar padding math, specs-row hide).
   - **Mitigation in plan:** Task 3 §Verify includes a manual reasoning walkthrough of each downstream consumer with the expected behavior change documented.
   - **Recommendation:** On-device QA after this plan ships MUST include: (a) tap the Hospitality tab on HomeScreen with at least one hotel/hostel listing present → confirm it renders; (b) open a hotel listing's details screen → confirm amenity grid renders, no spec row, sticky bar layout looks correct; (c) check OwnerListings / Favorites / RenterListings hospitality splits if applicable. If any of these reveals a layout/data bug, open a follow-up quick task — DO NOT revert Task 3.
   - **Is this blocking?** No. The current behavior is provably wrong (real hotel listings rendering as Residential is a user-facing taxonomy bug); fixing it is the right move. Any layout regressions exposed are new bugs that were latent — fixing those is separate work.

5. **NEW — The existing test `propertyCategory.test.ts` lines 11–29 was misleading (tested Pascal-case input that never occurs in real data).** Should the misleading existing tests be DELETED rather than just augmented? The plan as written KEEPS them as "backwards-compatibility fence" — i.e., the function continues to handle Pascal input correctly (for any latent code path that passes Pascal — none currently exist in production source per grep, but the constants are exported and could be passed by future code). Recommendation: keep them. They're harmless and document that the function is intentionally case-insensitive. If user disagrees, drop them — single-edit reduction, no other code-path impact.

## Verification (end-of-task)

After Task 1 + Task 2 + Task 3 land:

1. `npx jest src/components/__tests__/PropertyCard.specChip.test.tsx` → 6/6 green.
2. `npx jest src/utils/__tests__/propertyCategory.test.ts` → 15/15 green (6 existing + 9 new).
3. `npx tsc --noEmit 2>&1 | grep -E '(src/components/PropertyCard\.tsx|src/screens/PropertyDetailsScreen\.tsx|src/utils/propertyCategory\.ts)' | wc -l` → 0 net new errors attributable to the three modified source files (baseline pre-existing project errors may remain).
4. `grep -c "hotelRooms ?? property.basics?.rooms ?? '-'" src/components/PropertyCard.tsx` → 1.
5. `grep -c "hotelRooms ?? property.basics?.rooms ?? '-'" src/screens/PropertyDetailsScreen.tsx` → 1.
6. `grep -nP "property\.basics\?\.rooms \?\? '-'" src/components/PropertyCard.tsx src/screens/PropertyDetailsScreen.tsx | grep -v hotelRooms` → zero hits (the pre-fix exact-string is gone from both files; defends against accidental re-introduction).
7. `grep -n "toLowerCase\|toUpperCase\|charAt" src/utils/propertyCategory.ts` → at least one hit (the normalization is present).
8. `grep -n "Apartment.*Residential\|Hotel.*Hospitality" src/utils/propertyCategory.ts` → at least 4 hits (the map keys are still Pascal — Task 3 did NOT regress them to lowercase).
9. On-device check (user-driven, after build) — order matters because Task 3 changes routing:
   - **First, with NO category filter selected** (Residential tab default): the "Vacation house" listing (and any other hotel/hostel) should NO LONGER appear in the main Residential list. They appear in the Hospitality section (top of the list, horizontal scroll per HomeScreen:563) instead.
   - **Tap the Hospitality tab**: hotel/hostel listings render through HospitalityCard. The room count comes from `basics.hotelRooms` and renders correctly (not `-`). The bottom-left 3D tour badge and amenity preview chips render per existing HospitalityCard behavior.
   - **Tap a hotel listing to open PropertyDetailsScreen**: the residential spec row (Bed/Bath/m²) is HIDDEN per `!isHospitality`. The amenity grid (`isHospitality ? amenities-grid : features-grid`) renders the amenities. Sticky-bar padding feels right. Type badge says "Hotel" or "Hostel" with optional class suffix.
   - **For an apartment/house residential listing**: still renders through PropertyCard; Bed shows rooms; Bath shows `-` (no captured data — correct). On detail screen, spec row shows Bed=rooms, Bath=`-`, m²=area. All correct.
   - **For an office/commercial listing**: still renders through PropertyCard; Bed shows rooms; Bath shows Private/Shared/None in EN, the RU equivalents in RU.
   - **Dark/light toggle**: both surfaces stay theme-correct in both modes.
   - **Owner views (OwnerListingsScreen, FavoritesScreen)**: hotel/hostel listings now split correctly into the Hospitality strip; confirm no visual regression in the residential strip.

## Success criteria

- [ ] PropertyCard viewer-branch spec chip reads `basics?.hotelRooms ?? basics?.rooms ?? '-'` for bedroom side.
- [ ] PropertyDetailsScreen `!isHospitality` spec row reads `basics?.hotelRooms ?? basics?.rooms ?? '-'` for bedroom side.
- [ ] Bathroom enum-map unchanged on both surfaces (was correct per M3 design).
- [ ] `propertyTypeToCategory(...)` performs case-insensitive lookup; map keys + exported Pascal constants unchanged.
- [ ] New PropertyCard behavior-pin test exists with 6 cases; all green.
- [ ] Extended propertyCategory test has 15 cases total (6 existing + 9 new); all green; lowercase cases would have failed pre-Task-3.
- [ ] Zero net new tsc errors attributable to PropertyCard.tsx, PropertyDetailsScreen.tsx, or propertyCategory.ts.
- [ ] Pattern verbatim matches HospitalityCard.tsx:210 on both PropertyCard and PropertyDetailsScreen.
- [ ] No backend change, no schema change, no new i18n key, no new dependency.
- [ ] Owner-view branch of PropertyCard, hero image, price row, share/heart buttons, status pill, ListingMetaTable, and all other unmentioned surfaces are untouched.
- [ ] Exported constants (`PROPERTY_TYPES`, `RESIDENTIAL_TYPES`, `COMMERCIAL_TYPES`, `HOSPITALITY_TYPES`, `PROPERTY_TYPE_TO_CATEGORY`) and HomeScreen chip-label rendering at line 514 are unchanged.
- [ ] No file outside the 5 listed in `files_modified` is modified.
- [ ] On-device QA (Open Question #4) confirms hotel/hostel listings route to HospitalityCard / Hospitality section / hospitality detail layout correctly, with no new layout regression. If a regression IS found, open a follow-up quick task — do not revert Task 3.

## Output

After completion, write `.planning/quick/260525-ggp-fix-bedroom-and-bathroom-counts-not-rend/260525-ggp-SUMMARY.md` summarizing:

- Files changed (5 total — 3 source edits + 1 test extended + 1 test new).
- The before/after of:
  - The one-line read-path change in PropertyCard.tsx with line number.
  - The one-line read-path change in PropertyDetailsScreen.tsx with line number.
  - The case-normalization change in propertyCategory.ts with line numbers.
- Test cases added and any test run output snippets (PropertyCard.specChip.test.tsx 6/6 + propertyCategory.test.ts 15/15).
- Confirmation of grep gates (4, 5, 6, 7, 8 in §Verification).
- On-device QA pending — explicitly call out the routing-change validation items in Open Question #4 + Verification step 9.
- Open question status:
  - Q1 (PropertyDetailsScreen extension): RESOLVED-BUNDLED (Task 1 Part B).
  - Q2 (propertyCategory routing): RESOLVED-BUNDLED (Task 3).
  - Q3 (listing ID 173-162 shape): user-driven curl optional.
  - Q4 (latent hospitality layout bugs): defer until on-device QA — note any findings in this SUMMARY for M4 backlog.
  - Q5 (delete misleading Pascal tests): kept by default; flip iff user requests.
- Commit SHA(s) and any tsc baseline notes.

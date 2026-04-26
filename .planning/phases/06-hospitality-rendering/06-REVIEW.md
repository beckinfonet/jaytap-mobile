---
status: issues
phase: 06-hospitality-rendering
recorded_at_commit: 7e17d7f3e078278f42bfd970971ffbcb52191996
reviewed: 2026-04-24
depth: standard
files_reviewed: 17
files_reviewed_list:
  - src/utils/hospitalityAmenities.ts
  - src/components/HospitalityCard.tsx
  - src/components/HospitalitySection.tsx
  - src/types/Property.ts
  - src/components/CreateListingForm/types.ts
  - src/components/CreateListingForm/HospitalitySection.tsx
  - src/components/CreateListingForm/validators.ts
  - src/components/CreateListingForm/__tests__/validators.test.ts
  - src/services/PropertyService.ts
  - src/screens/CreateListingScreen.tsx
  - src/screens/HomeScreen.tsx
  - src/screens/FavoritesScreen.tsx
  - src/screens/RenterListingsScreen.tsx
  - src/screens/OwnerListingsScreen.tsx
  - src/screens/PropertyDetailsScreen.tsx
  - src/locales/en.ts
  - src/locales/ru.ts
findings:
  blocking: 0
  high: 1
  medium: 3
  low: 4
  info: 4
  total: 12
---

# Phase 6: Code Review Report — Hospitality Rendering

**Reviewed:** 2026-04-24
**Depth:** standard (per-file analysis with React Native + TypeScript-specific checks)
**Files Reviewed:** 17 (all Phase 6 deltas, per `<files_to_review>`)
**Status:** issues — 1 HIGH, 3 MEDIUM, 4 LOW, 4 INFO. None BLOCKING.

## Summary

Phase 6 delivers tour-first Hospitality rendering with disciplined adherence to all UI-SPEC locked decisions: the 12-amenity tuple/icon map (D-19), tri-state HomeScreen filter (D-04/D-24), hospitality strip ListHeaderComponent on 4 screens, separate HospitalityCard file (D-07/Pitfall 7), price-free detail-view branch with sticky 3-button SafeArea-aware contact bar (D-15/D-16), and full EN+RU i18n parity gated by the existing `Record<TranslationKeys, string>` tsc enforcement. Validators flip cleanly for D-22 amenity-required and Hospitality-only payload inclusion. PropertyService correctly wires `rooms`/`maxGuests`/`amenities` on both create and update with safe `?.toString() || '0'` fallbacks. No hardcoded color drift outside the documented exemptions (`#FFFFFF` selected-chip text, `#6C63FF` 3D-Tour badge precedent, channel-brand colors on contact buttons). No worktree leaks, no PII in console.log paths, no inline `userType === 'admin'` checks (Pitfall 1 clean). All 33 new locale keys present in both EN and RU.

The single HIGH finding is **PropertyDetailsScreen still renders the legacy `specsContainer` (beds/baths/sqft) for Hospitality**, which D-15-style suppression should have hidden alongside the price block. New Hostel/Hotel listings will display "🛏 0 beds | 🚿 0 baths | 📐 0 m²" because the form payload never emits `specs.{beds,sqft}` for Hospitality, and `property.specs.beds` could even crash if backend omits the `specs` object entirely. Recommend a 5-line fix gated on `!isHospitality` (or rooms/maxGuests inline replacement) before submission.

The MEDIUM and LOW findings are surface polish: amenity-chip touch targets ~41pt (below 44pt iOS HIG with `hitSlop:4`), `as any` casts in CreateListingScreen.tsx rehydrate that erase the new typed `Property.rooms`/`maxGuests`/`amenities` fields, and an unused-but-required `onViewTour` prop on HospitalityCard.

| Severity  | Count |
|-----------|-------|
| BLOCKING  | 0     |
| HIGH      | 1     |
| MEDIUM    | 3     |
| LOW       | 4     |
| INFO      | 4     |
| **Total** | **12**|

---

## HIGH

### HI-01: Hospitality detail view still renders legacy specsContainer with zeros (D-15 partial regression)

**File:** `src/screens/PropertyDetailsScreen.tsx:602-620`
**What:** The hardcoded specs row (🛏 beds | 🚿 baths | 📐 m²) renders unconditionally for every category, including Hospitality. For Hostel/Hotel listings created via Phase 6's form, `property.specs.beds` and `property.specs.sqft` will be `0` (form omits them), so the row displays "0 beds, 0 m²" — visually equivalent to a broken/empty listing.
**Why this matters:** D-15 explicitly omits the price block for Hospitality and the same suppression intent applies here — Hospitality has its own meta concept (`rooms`/`maxGuests`) that's already shown on the card body. Worse: `Property.specs` is a non-optional field on the type, so if the backend's response shape ever omits `specs` for a Hospitality record (the form payload never sends it on create), `property.specs.beds` will throw `TypeError: Cannot read property 'beds' of undefined`. This is a brownfield contract risk that Phase 6 makes concretely user-visible.
**Suggested fix:** Wrap the existing block with `!isHospitality` (matching the D-15 pattern at line 812), and optionally add a Hospitality-specific specs row showing `rooms` + `maxGuests` for parity:

```tsx
{!isHospitality && (
  <View style={[styles.specsContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
    {/* existing beds/baths/sqft block */}
  </View>
)}
{isHospitality && (property.rooms || property.maxGuests) && (
  <View style={[styles.specsContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
    <View style={styles.specItem}>
      <Text style={styles.specIcon}>🚪</Text>
      <Text style={[styles.specValue, { color: colors.text }]}>{property.rooms ?? 0}</Text>
      <Text style={[styles.specLabel, { color: colors.textSecondary }]}>{t('hospitality.rooms')}</Text>
    </View>
    <View style={[styles.verticalDivider, { backgroundColor: colors.border }]} />
    <View style={styles.specItem}>
      <Text style={styles.specIcon}>👥</Text>
      <Text style={[styles.specValue, { color: colors.text }]}>{property.maxGuests ?? 0}</Text>
      <Text style={[styles.specLabel, { color: colors.textSecondary }]}>{t('hospitality.maxGuests')}</Text>
    </View>
  </View>
)}
```

Defense-in-depth (out of M1 scope but worth STATE-noting): consider making `specs` optional on the `Property` type since the contract is now genuinely conditional.

---

## MEDIUM

### ME-01: Amenity-chip touch target ~41pt — below 44pt iOS HIG

**File:** `src/components/CreateListingForm/HospitalitySection.tsx:117-148` + `src/components/CreateListingForm/styles.ts:78-87`
**What:** The 12-amenity multi-select chips use `commonStyles.chip` (`paddingVertical: 8`) with `chipText` (`fontSize: 14` ≈ 17pt line-height) and `hitSlop: { top: 4, bottom: 4, left: 4, right: 4 }`. Total effective tap height: ~33pt + 8pt slop = ~41pt. iOS HIG specifies 44pt minimum; Material specifies 48dp.
**Why this matters:** With 12 chips packed in a flex-wrap grid, mistaps to adjacent chips are likely on small phones, especially with longer RU labels ("Круглосуточная стойка") that wrap chips to narrow rows. UI-SPEC §"Amenity grid" mentions the touch-target concern explicitly.
**Suggested fix:** Bump hitSlop to 6 (or 8) on each side to cross the 44pt threshold without changing visual dimensions:
```tsx
hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
```
Alternatively bump `commonStyles.chip` `paddingVertical` to 10 — but that affects every chip in the form (currency, propertyType picker), so prefer the per-call `hitSlop` bump.

### ME-02: `(propertyToEdit as any).rooms / .maxGuests / .amenities` cast erases new typed fields

**File:** `src/screens/CreateListingScreen.tsx:278-280`
**What:** The rehydrate path uses `as any` to read the new fields:
```tsx
setRooms((propertyToEdit as any).rooms?.toString() || '');
setMaxGuests((propertyToEdit as any).maxGuests?.toString() || '');
setAmenities(((propertyToEdit as any).amenities || []) as HospitalityAmenity[]);
```
But `Property.ts:68-70` now declares these fields properly typed (`rooms?: number`, `maxGuests?: number`, `amenities?: HospitalityAmenity[]`). The `as any` was needed before Phase 6 but is now obsolete and actively defeats compile-time safety: a future rename/refactor of `Property.amenities` would silently break here.
**Why this matters:** Phase 6's central type-safety win (typed `HospitalityAmenity` union) is undermined at the consumer site. The `amenities || [] as HospitalityAmenity[]` cast also bypasses runtime validation — if backend ever returns `amenities: ['cable_tv']` (a non-canonical token), the cast lies to TS and the AMENITY_ICONS lookup will return `undefined`, crashing at the `<Icon size={14} ... />` JSX site.
**Suggested fix:**
```tsx
setRooms(propertyToEdit.rooms?.toString() || '');
setMaxGuests(propertyToEdit.maxGuests?.toString() || '');
setAmenities(
  (propertyToEdit.amenities ?? []).filter((a): a is HospitalityAmenity =>
    HOSPITALITY_AMENITIES.includes(a as HospitalityAmenity),
  ),
);
```
The runtime filter defends against backend drift without needing a JSON schema.

### ME-03: HospitalityCard `Icon = AMENITY_ICONS[token]` lookup unguarded against unknown tokens

**File:** `src/components/HospitalityCard.tsx:186-205`
**What:** Inside the preview-chip map:
```tsx
const Icon = AMENITY_ICONS[token];
return (
  <View ...>
    <Icon size={12} color={colors.textSecondary} />
```
If a backend record contains an amenity token outside the canonical 12 (e.g., legacy data from before Phase 6's taxonomy was enforced, or a typo), `AMENITY_ICONS[token]` returns `undefined` and `<Icon ... />` throws "Icon is not a function" at render time — crashing the entire HomeScreen list. PropertyDetailsScreen.tsx:642 already guards this correctly with `AMENITY_ICONS[token] ?? Check`, so this is a known pattern.
**Why this matters:** Brownfield Hospitality records may exist (legacy `propertyType: 'Hostel'` from pre-Phase-6 data with arbitrary `amenities: string[]`), and a single bad token crashes the whole list.
**Suggested fix:**
```tsx
const Icon = AMENITY_ICONS[token] ?? null;
if (!Icon) return null; // skip unknown tokens silently
```
Or import a fallback `Check` icon and use `?? Check` to match PropertyDetailsScreen's pattern (line 642).

---

## LOW

### LO-01: HospitalityCard `onViewTour` prop is required but never invoked

**File:** `src/components/HospitalityCard.tsx:42, 54`
**What:** The interface declares `onViewTour: (property: Property) => void;` (non-optional) and the destructuring renames it to `_onViewTour` (underscore prefix = "intentionally unused"). HospitalitySection.tsx:80, HomeScreen.tsx:507/519 all plumb the callback through, but it's never called inside the card — the 3D-Tour badge is purely decorative; tap-to-tour happens via `onPress → PropertyDetailsScreen → TourHeroCard`.
**Why this matters:** Required props that are never consumed are a maintainability smell — a future reader will assume the badge is interactive and add a `TouchableOpacity` wrapper, or will delete the now-dead callback chain mid-refactor and break some other consumer that does need it.
**Suggested fix:** Either make the prop optional (`onViewTour?: ...`) and remove the underscore alias, or wire it: tap on the bottom-left 3D-Tour badge → `onViewTour(property)` to short-circuit the detail view for tour-first users (matches D-08's tour-first thesis). Recommend the latter — costs ~3 LOC and matches the design intent.

### LO-02: HospitalityCard share handler swallows errors with `console.error` only

**File:** `src/components/HospitalityCard.tsx:89-103`
**What:** `handleShare` catches errors and logs them silently:
```tsx
} catch (error: any) {
  console.error('Error sharing:', error?.message);
}
```
**Why this matters:** The user gets no feedback if the OS share sheet fails (e.g., locked airplane mode or permission denial). PropertyDetailsScreen.tsx:240-242 has the same pattern, so this is consistent — but inconsistent with the project's `Alert.alert(t('common.error'), …)` convention used elsewhere (e.g., `handleViewVideo` in HomeScreen.tsx:204).
**Suggested fix:** Either accept the silent-fail (in which case INFO not LOW) or add a one-liner toast/alert on failure. Lowest-friction option:
```tsx
} catch (error: any) {
  console.error('Error sharing:', error?.message);
  // No alert — system share sheet failures are rarely actionable
}
```
…with a comment explaining the intentional silence. Or escalate to alert. Pick one; current state is ambiguous.

### LO-03: HomeScreen passes `favoriteStatuses[item.id] || false` — `||` masks falsy `false` correctly here, but loose

**File:** `src/screens/HomeScreen.tsx:521-522, 531-532`
**What:** `isFavorited={favoriteStatuses[item.id] || false}` and `isLoading={favoriteLoading[item.id] || false}` — the `||` operator returns `false` if the value is `false`, `0`, `''`, `null`, or `undefined`. Since the value is always boolean-or-undefined, `||` happens to produce the same result as `??`, but `??` is the semantically-correct operator for "default if missing" and is the project convention used in HospitalitySection.tsx:82 (`favoriteStatuses?.[item.id] ?? false`).
**Why this matters:** Inconsistent operator choice between adjacent files for the same intent. Future refactor that changes `favoriteStatuses` to a `Record<string, 0 | 1>` (unlikely but possible) would silently break `||` and not `??`.
**Suggested fix:** `isFavorited={favoriteStatuses[item.id] ?? false}` for consistency with HospitalitySection. Same change at FavoritesScreen.tsx:130-131.

### LO-04: FavoritesScreen `isFavorited={favoriteStatuses[item.id] || true}` — always renders heart filled

**File:** `src/screens/FavoritesScreen.tsx:130`
**What:** `isFavorited={favoriteStatuses[item.id] || true}` — since the right operand is `true`, this expression is always `true` regardless of the lookup. The comment `// Always true in favorites screen` makes the intent explicit, but the `[item.id] || true` form is misleading since the lookup is dead code (`true || X === true` always).
**Why this matters:** A future reader fixing a bug in favorite-state propagation will look at this line, see the lookup, and assume it has effect. This is pre-existing code (not a Phase 6 introduction) but Phase 6 added the parallel HospitalitySection prop just below it (line 164) which DOES read `favoriteStatuses` correctly — increasing the chance of confusion.
**Suggested fix:** `isFavorited={true} // always true in favorites screen` — drops the dead lookup. (Out-of-Phase-6 scope, but adjacent to the modified header.)

---

## INFO

### IN-01: HospitalityCard hero fallback chain duplicates `https://via.placeholder.com/400` literal

**File:** `src/components/HospitalityCard.tsx:71`
**What:** Image fallback ends with hardcoded URL `'https://via.placeholder.com/400'`. PropertyDetailsScreen.tsx:217 uses `'https://via.placeholder.com/800'` — same service, different size. PropertyCard.tsx likely has its own variant.
**Why this matters:** Magic URL repeated across 3+ files. If `via.placeholder.com` ever 404s (it has had outages), every card's hero falls over. Constant-extraction would help.
**Suggested fix:** Add `PLACEHOLDER_IMAGE_URL` to `src/constants` (already exists for `getPropertyShareUrl`). Out of Phase 6 scope but worth a follow-up note in STATE.

### IN-02: `Math.random().toString()` keyExtractor fallback in RenterListingsScreen / OwnerListingsScreen / FavoritesScreen

**File:** `src/screens/RenterListingsScreen.tsx:185`, `src/screens/OwnerListingsScreen.tsx:142`, `src/screens/FavoritesScreen.tsx:154`
**What:** `keyExtractor={(item) => item.id || Math.random().toString()}` — pre-existing pattern, not Phase-6-introduced, but Phase 6 added the parallel HospitalitySection.tsx:75 which uses the better `keyExtractor={(item, idx) => item.id || item.listingId || \`hosp-${idx}\`}` pattern.
**Why this matters:** `Math.random()` keys break React's reconciliation — every re-render produces a new key for items missing `id`, causing full unmount/remount + lost focus state and image-flicker. The `idx` fallback in HospitalitySection is better. Pre-existing but adjacent to modified code.
**Suggested fix (post-M1):** Standardize on `item.id || item.listingId || \`fallback-${idx}\`` across all four screens. Not scope for Phase 6 fix.

### IN-03: `LayoutAnimation.setLayoutAnimationEnabledExperimental(true)` — module-load side-effect

**File:** `src/screens/HomeScreen.tsx:21-23`
**What:** Module-top side-effect calls `UIManager.setLayoutAnimationEnabledExperimental(true)` on Android. Pre-existing, not Phase 6 scope, but RN 0.84 + New Architecture (Fabric) deprecated `LayoutAnimation` — Reanimated `LinearTransition` or `entering/exiting` props are the New-Arch-correct primitive. Currently functional via legacy interop.
**Why this matters:** Tracking item only — no immediate breakage. The CLAUDE.md stack note pins `react-native-keyboard-controller` requiring `react-native-reanimated`, so the migration cost is low. Worth a STATE follow-up for M2.

### IN-04: HospitalitySection horizontal FlatList inside vertical FlatList ListHeaderComponent — VirtualizedList warning suppressed by horizontal axis

**File:** `src/components/HospitalitySection.tsx:71-91` + `src/screens/HomeScreen.tsx:502`, `FavoritesScreen.tsx:159`, `RenterListingsScreen.tsx:190`, `OwnerListingsScreen.tsx:147`
**What:** RN warns "VirtualizedLists should never be nested inside plain ScrollViews with the same orientation" — the inner FlatList here is `horizontal`, so the warning does NOT fire (different orientation). This is the canonical correct pattern for a horizontal strip atop a vertical list. Confirmed via PATTERNS map. No issue, just affirming the choice was deliberate.
**Why this matters:** Future reviewers may flag this — pre-emptive note that the pattern was vetted in 06-PATTERNS.md.
**No fix needed.**

---

## Disposition

**Recommend: Run `/gsd-code-review-fix 6` before advancing.**

The single HIGH finding (HI-01: legacy specsContainer rendering for Hospitality) is a user-visible regression for the M1 release narrative ("Hospitality showcase-only, no price/spec table"). Showing "0 beds, 0 m²" on a Hostel listing on the App Store / Play Store would undercut the v1.0.4 polish story and the QA-approved verification claim from commit `7e17d7f` ("phase 6 manual QA walk APPROVED"). The fix is 5 lines.

The MEDIUM findings (touch target, `as any` casts, unguarded icon lookup) are individually low-risk but compound: ME-03 in particular could crash the HomeScreen list if a single legacy Hospitality record has a non-canonical amenity token — a defensible-in-isolation 1-line `?? null` fix.

The LOW + INFO findings are tracking items for STATE.md follow-up; none block release.

**Suggested fix-pass scope (`/gsd-code-review-fix 6`):**
1. HI-01 — wrap specsContainer with `!isHospitality` (PropertyDetailsScreen.tsx:602-620)
2. ME-01 — bump amenity chip `hitSlop` to 8pt (CreateListingForm/HospitalitySection.tsx:138)
3. ME-02 — drop `as any` from rehydrate; add HOSPITALITY_AMENITIES filter (CreateListingScreen.tsx:278-280)
4. ME-03 — guard `AMENITY_ICONS[token]` with `?? null` + early return (HospitalityCard.tsx:187)
5. LO-01 — make `onViewTour` optional on HospitalityCardProps (HospitalityCard.tsx:42)

Defer LO-02, LO-03, LO-04, IN-01..IN-04 to a STATE follow-up note.

---

_Reviewed: 2026-04-24_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
_Recorded at commit: 7e17d7f3e078278f42bfd970971ffbcb52191996_

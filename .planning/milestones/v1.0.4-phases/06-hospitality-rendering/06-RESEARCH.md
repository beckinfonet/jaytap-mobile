# Phase 6: Hospitality Rendering — Research

**Researched:** 2026-04-24
**Domain:** React Native UI composition + state-machine filter refactor + PropertyDetailsScreen conditional branching + brownfield taxonomy consolidation
**Confidence:** HIGH

---

## Summary

Phase 6 is a UI composition phase over a fully stabilized base. Phase 4 delivered the taxonomy (`propertyTypeToCategory`, `HOSPITALITY_TYPES`) and Phase 5 delivered the pure validator/payload builders and rehydrate effect. Every load-bearing decision for this phase is already locked in `06-CONTEXT.md` D-01..D-24. The research job is not "what to build" — it's "which codebase anchors make those decisions land cheaply without regressing Phase 3 grep gate / Phase 4 anchors / Phase 5 validator shape."

**Primary recommendation:** Treat this phase as three mostly-independent workstreams that can land in parallel waves:

1. **Data + validator wave** — `src/utils/hospitalityAmenities.ts` (new), `Property` type extension (`amenities?`, plus the hidden `rooms?` / `maxGuests?` gap), `FormBag` narrowing, `validateByCategory` / `buildPayloadByCategory` Hospitality branch extension, `validators.test.ts` extension, `PropertyService` wire-up for `rooms`/`maxGuests`/`amenities` (**hidden gap — see §9**), amenity rehydrate in edit mode (`CreateListingScreen` useEffect:250-310).
2. **Create-form UX wave** — `HospitalitySection` placeholder → 12-chip grid.
3. **Rendering wave** — `HospitalityCard` (new), `HospitalitySection` strip on Home / Favorites / OwnerListings + RenterListings (the actual "My Listings" file), HomeScreen filter tri-state + WR-03 import cleanup, PropertyDetailsScreen branch (tour promote + price remove + sticky-contact-bar + chip amenity grid).

**Load-bearing pre-work (MUST land first):** i18n key addition — add all ~30 new EN+RU keys in a single Wave 0 commit so downstream task authors only reference existing keys. `check-i18n-parity.sh` exits 0 enforces parity.

---

## User Constraints (from 06-CONTEXT.md)

### Locked Decisions

**List section composition (HOSP-01 / HOSP-02):**
- D-01 `HospitalitySection` renders as `ListHeaderComponent` at top of primary `FlatList` on Home / Favorites / OwnerListings (RenterListings per §9); inner content is a horizontal `FlatList` of `HospitalityCard`s; hidden entirely when zero hospitality listings exist.
- D-02 Section header = title + count chip. i18n keys `home.hospitalitySectionTitle` + `home.hospitalitySectionCount` (with `{count}` interpolation).
- D-03 Tapping a `Hostel` or `Hotel` filter chip collapses the vertical residential/commercial list and renders hospitality as the vertical FlatList using the same `HospitalityCard`.
- D-04 Promote binary `isCommercial` → tri-state `selectedCategory: 'Residential' | 'Commercial' | 'Hospitality'`. When Hospitality is active: vertical list = hospitality cards, horizontal strip not rendered. When Residential / Commercial active: vertical list filters to that category, strip renders at top via `ListHeaderComponent`.
- D-05 Hospitality cards render under both Rent and Sell with no price block. Hospitality filter respects `transactionType` but skips price-based filters.
- D-06 FavoritesScreen and OwnerListingsScreen: same pattern, no tri-state toggle. Strip stays hidden when empty.

**HospitalityCard design (HOSP-03):**
- D-07 Ship separate `src/components/HospitalityCard.tsx` (do NOT branch PropertyCard).
- D-08 Hero image = `property.tours[0].thumbnailUrl` when available; else `property.imageUrl`. 3D Tour badge bottom-left when tours exist.
- D-09 Type badge (`Hostel` / `Hotel`) = top-left pill chip overlaid on hero. Theme tokens only.
- D-10 Card body = single row `{rooms} {t('hospitality.rooms')} · {maxGuests} {t('hospitality.maxGuests')}` + horizontal chip row of first 2-3 selected amenities (with icon prefix per D-23) + `+N more` overflow chip if total amenities > 3. NO ListingMetaTable beds/baths/sqm. NO price chip. NO `formatPrice()` invocation.
- D-11 Share message format: `"{title}\n{address}\n\n{shareUrl}"` (no `priceText` line).
- D-12 Favorite / edit / delete handlers reuse same prop shapes as PropertyCard.

**PropertyDetailsScreen (HOSP-04):**
- D-13 Branch in-place inside existing 1684-LOC file. Derive `category = propertyTypeToCategory(property.propertyType)` near top.
- D-14 Tours promoted above the image gallery when Hospitality. Reuse existing `TourHeroCard` + `.android.tsx` platform variant.
- D-15 Remove `priceContainer` block (PropertyDetailsScreen.tsx:752-755) entirely when Hospitality. No placeholder, no "contact for pricing" filler.
- D-16 Sticky bottom bar with three icon buttons: WhatsApp / Telegram / Phone. Reuse existing `whatsappButton` / `telegramButton` handlers (~:244-298). Each button disabled (opacity 0.4 + no onPress) when corresponding owner field empty. All three disabled when all three empty. SafeAreaView insets.
- D-17 Panoramic media link stays at current position in media row (~:513-520). No promotion above gallery needed.

**Amenity picker (HOSP-05 + Phase-5 D-13/14/15 close-out):**
- D-18 Inline chip-toggle grid in `HospitalitySection.tsx` replacing `amenitiesPhase6Placeholder` hint at lines 100-102. Reuses `commonStyles.chip` / `chipRow`. No `LayoutAnimation`.
- D-19 Canonical tokens via `as const` string-literal union in new file `src/utils/hospitalityAmenities.ts`:
  ```ts
  export const HOSPITALITY_AMENITIES = [
    'wifi', 'aircon', 'heating', 'kitchen', 'breakfast', 'parking',
    'reception24', 'laundry', 'hotwater', 'commonarea', 'lockers', 'ensuite',
  ] as const;
  export type HospitalityAmenity = typeof HOSPITALITY_AMENITIES[number];
  ```
  i18n labels under `amenity.{token}` cluster (12 × 2 = 24 new keys).
- D-20 Add `amenities?: HospitalityAmenity[]` to `src/types/Property.ts`. Missing = `[]` (clean-slate).
- D-21 `FormBag.amenities`: `string[]` → `HospitalityAmenity[]`. `CreateListingScreen.tsx:111` `useState<string[]>([])` narrows.
- D-22 `validateByCategory` Hospitality branch + `buildPayloadByCategory` Hospitality branch + `validators.test.ts` extension (~3-5 assertions).
- D-23 Detail-view rendering: `lucide-react-native` icons, 2-column chip grid, replaces `features.map(...)` rendering when Hospitality.
- D-24 Close WR-03: delete `HomeScreen.tsx:48-49` local arrays; import from `propertyCategory.ts`. Rewrite filter logic to route through `propertyTypeToCategory()` instead of `.some()` membership.

### Claude's Discretion

- Exact `lucide-react-native` icon name per amenity (§5 Research recommends specific icons below).
- i18n key namespace for amenity validation error — `amenity.errors.atLeastOne` vs extending `createListing.*Required`. **Recommendation: `createListing.amenitiesRequired`** to match Phase 5 precedent (§9).
- Share-message helper refactor vs inline (Claude's discretion at planning time).
- `HospitalitySection.tsx` as own file vs embedded in `HospitalityCard.tsx` (§1 recommends own file).
- Sticky bottom bar height + safe-area handling — `useSafeAreaInsets()` already in stack; use `BottomNavigator` pattern (§6).
- Whether to add "all contacts empty" CTA — deferred per CONTEXT.md.

### Deferred Ideas (OUT OF SCOPE)

- All-empty-contact "Chat fallback" CTA on hospitality detail (post-M1 polish).
- Tour-first detail page for residential listings (post-M1).
- Owner-side moderation chrome on hospitality cards (M2 — MOD-01..06).
- Listing-specific contact override (M2).
- Per-night pricing / booking calendar (Out of Scope — PROJECT.md).
- Chat moderation tooling (M2).

---

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| HOSP-01 | Hostel/Hotel listings appear in their own dedicated section on HomeScreen, FavoritesScreen, and OwnerListingsScreen (separate section). | §1 `HospitalitySection` ListHeaderComponent recipe + §4 tri-state filter wiring + §9 note on RenterListings |
| HOSP-02 | Present under both Rent and Sell, no price shown. | §4 filter state machine: Hospitality filter respects `transactionType` but skips price-based filters |
| HOSP-03 | `HospitalityCard` renders Hostel/Hotel cards without price chip, emphasizing 3D tour thumbnail and Hostel/Hotel badge. | §2 HospitalityCard design from PropertyCard analog |
| HOSP-04 | PropertyDetailsScreen renders Hospitality without price block, tours above gallery, panoramic surfaced, WhatsApp/Telegram/phone prominent. | §3 in-place branch pattern + §6 sticky bar |
| HOSP-05 | 12-item amenity multi-select taxonomy. | §5 amenity chip grid + icon mapping |
| HOSP-06 | Cards + detail pages correct in EN + RU. | §8 single i18n wave at Wave 0 |

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Amenity storage tokens | src/utils (pure module) | — | Matches `propertyCategory.ts` pattern; no React |
| Amenity validation | src/components/CreateListingForm/validators.ts (pure) | — | Phase 5 locked the pure-function validator boundary |
| Amenity payload inclusion | `buildPayloadByCategory` Hospitality branch (pure) | — | Same boundary as validation |
| Amenity wire transport | src/services/PropertyService.ts | — | **Hidden gap: Phase 4/5 did NOT wire `rooms`/`maxGuests`/`amenities` to backend** — §9 |
| Amenity rehydrate on edit | src/screens/CreateListingScreen.tsx useEffect:250-310 | — | Phase 5 rehydrate precedent — but no Hospitality branch exists yet — §9 |
| Amenity picker UX | src/components/CreateListingForm/HospitalitySection.tsx | — | Replaces placeholder hint at :100-102 |
| HospitalityCard rendering | src/components/HospitalityCard.tsx (new) | — | D-07 separate file |
| HospitalitySection strip | src/components/HospitalitySection.tsx (new) | HospitalityCard | D-01 ListHeaderComponent |
| Home filter machine | src/screens/HomeScreen.tsx | propertyCategory.ts | D-04 tri-state, D-24 WR-03 cleanup |
| Favorites strip mount | src/screens/FavoritesScreen.tsx | HospitalitySection | D-06 |
| Owner/Renter strip mount | src/screens/OwnerListingsScreen.tsx + src/screens/RenterListingsScreen.tsx | HospitalitySection | D-06 + §9 RenterListings is the actual "My Listings" |
| PropertyDetails Hospitality branch | src/screens/PropertyDetailsScreen.tsx | TourHeroCard, lucide icons | D-13..D-17 in-place |
| Contact quick-actions | PropertyDetailsScreen sticky footer (new) | Linking, `useSafeAreaInsets` | D-16 |

---

## Standard Stack

### Already Installed (verified via package.json)

| Library | Version | Role in Phase 6 |
|---------|---------|------------------|
| `lucide-react-native` | `^0.564.0` [VERIFIED: package.json] | Amenity icons (§5), existing PropertyDetailsScreen icons |
| `react-native-safe-area-context` | `^5.5.2` [VERIFIED: package.json] | `useSafeAreaInsets()` for sticky contact bar bottom padding |
| `react-native` (core) | `0.84.0` [VERIFIED: package.json] | `FlatList` horizontal + `Linking` for tel/whatsapp/telegram |
| `react-native-reanimated` | `^4.3.0` [VERIFIED: package.json] | Not used directly; only peer for keyboard-controller |

### Not Installed, Not Needed

Phase 6 introduces **zero new npm deps**. All UI is composed from existing primitives. [VERIFIED: by requirements scan]

### Alternatives Considered

| Instead of | Could Use | Why not |
|------------|-----------|---------|
| Inline conditional in PropertyDetailsScreen (D-13) | Extract `HospitalityPropertyDetails` sub-component | CONTEXT Q1 user chose in-place — lower regression risk on 1684-LOC file |
| Horizontal FlatList for strip (§1) | `ScrollView horizontal` | `FlatList` gives virtualization + proper `keyExtractor`; n≤12 Hostels/Hotels realistically in M1 so either works, but FlatList is convention everywhere else in the app |
| 2-column chip grid for amenities on detail (D-23) | Plain bullet list | User chose chip-with-icon (CONTEXT Q4) — most distinctly hospitality |

---

## User Confirmation Required — Hidden Gaps (see §9 for full details)

Three items are NOT covered by CONTEXT.md but are REQUIRED for HOSP-01..06 to work end-to-end:

1. **Backend wire-up for `rooms` / `maxGuests` / `amenities`** — `PropertyService.createProperty` and `.updateProperty` do not `formData.append()` these fields today. Hospitality listings saved in Phase 5 lost them silently.
2. **Edit-mode rehydrate for `rooms` / `maxGuests` / `amenities`** — `CreateListingScreen.tsx` useEffect at lines ~250-310 has no `setRooms` / `setMaxGuests` / `setAmenities` calls. Editing a Hospitality listing blanks those fields.
3. **RenterListingsScreen is the actual "My Listings" surface** — CONTEXT references "OwnerListingsScreen" for the strip mount; the actual file is `RenterListingsScreen.tsx` (AccountSettings → "My Listings"). `OwnerListingsScreen` is the landlord-profile-view surface (different route). The planner should mount the strip on BOTH (landlord-profile-view filters to that owner's hospitality; My Listings filters to current user's hospitality).

Planner MUST either fold these into Phase 6 tasks or escalate back to the user before planning locks.

---

## Section 1 — `HospitalitySection` ListHeaderComponent Recipe

### File placement

Recommend `src/components/HospitalitySection.tsx` as its own file (flat `src/components/` per STRUCTURE.md, no nested folders). The component will exceed ~80 LOC once header + horizontal FlatList + count chip + theme tokens land, per CONTEXT.md §"Claude's Discretion" threshold. Embedding inside `HospitalityCard.tsx` would couple unrelated concerns.

### Props contract (recommended)

```ts
// src/components/HospitalitySection.tsx
interface HospitalitySectionProps {
  properties: Property[];         // already-filtered list (caller does category split)
  onPress: (property: Property) => void;
  onViewTour: (property: Property) => void;
  onFavorite?: (property: Property) => void;
  favoriteStatuses?: Record<string, boolean>;
  favoriteLoading?: Record<string, boolean>;
  // Owner-context (only on RenterListings):
  onEdit?: (property: Property) => void;
  onDelete?: (property: Property) => void;
  showEditButton?: boolean;
}
```

Caller filters the input list to Hospitality properties only (via `propertyTypeToCategory(p.propertyType) === 'Hospitality'`). `HospitalitySection` does NOT filter — it renders what it's given. This keeps the component pure and reusable across three screens.

### Hide-when-empty recipe

Return `null` at the top of the component when `properties.length === 0`. When used as `ListHeaderComponent={<HospitalitySection properties={hospitalityProps} ... />}`, React Native calls the component each render; returning `null` collapses the header to zero height. No placeholder, no "Coming soon" state. [CITED: react-native docs — ListHeaderComponent can be a React Element, JSX, or null]

```tsx
// Pattern:
export function HospitalitySection({ properties, ...handlers }: HospitalitySectionProps) {
  const { t } = useLanguage();
  const { colors } = useTheme();
  if (properties.length === 0) return null;  // HOSP-01 hidden-when-empty
  return (
    <View style={styles.strip}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>{t('home.hospitalitySectionTitle')}</Text>
        <View style={[styles.countChip, { backgroundColor: colors.chipBackground, borderColor: colors.chipBorder }]}>
          <Text style={[styles.countText, { color: colors.text }]}>
            {t('home.hospitalitySectionCount', { count: properties.length })}
          </Text>
        </View>
      </View>
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={properties}
        keyExtractor={(item, idx) => item.id || item.listingId || `hosp-${idx}`}
        renderItem={({ item }) => (
          <HospitalityCard
            property={item}
            onPress={handlers.onPress}
            onViewTour={handlers.onViewTour}
            onFavorite={handlers.onFavorite}
            isFavorited={handlers.favoriteStatuses?.[item.id] ?? false}
            isLoading={handlers.favoriteLoading?.[item.id] ?? false}
            onEdit={handlers.onEdit}
            onDelete={handlers.onDelete}
            showEditButton={handlers.showEditButton}
          />
        )}
        removeClippedSubviews={Platform.OS === 'android'}  // perf on Android
        contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}
      />
    </View>
  );
}
```

### Interaction with pull-to-refresh on outer list

**Non-issue** — none of HomeScreen / FavoritesScreen / OwnerListingsScreen / RenterListingsScreen use `RefreshControl` today [VERIFIED: grep `refreshControl` src/screens — only ChatScreen + AppointmentsScreen]. If refresh is added in a future phase, `ListHeaderComponent` sits above the scroll viewport but below the refresh indicator by default; no special handling required.

### Performance

For a 12-element horizontal list inside a vertical `FlatList`:
- `keyExtractor` required — use `item.id || item.listingId || 'hosp-{idx}'`.
- `getItemLayout` optional but skip for cards with variable tour-vs-photo hero — measuring adds complexity without clear win at n≤12.
- `removeClippedSubviews={Platform.OS === 'android'}` — defensive on Android under Fabric. Known to cause occasional blank cells on iOS under certain scroll patterns, so iOS-off.
- Memo-wrap `renderItem` via `React.useCallback` if profiling shows re-renders; skip for M1 since n is tiny.

**Pitfall:** Do NOT nest the horizontal `FlatList` inside a `ScrollView` — that's an anti-pattern. Because it's rendered via `ListHeaderComponent` of a vertical `FlatList`, the nesting is `FlatList(vertical).ListHeaderComponent → View → FlatList(horizontal)`, which is correct (React Native supports different-direction nesting as long as both are `FlatList`). [CITED: react-native FlatList docs — "nested scroll views of the same direction" is the forbidden case]

---

## Section 2 — `HospitalityCard` Component Design

### Analog file

`src/components/PropertyCard.tsx` (417 LOC) is the closest analog. D-07 specifies **separate file, not variant prop**. Copy the outer `TouchableOpacity` + image-wrapper + share / heart chrome verbatim; replace the body.

### Layout sketch

```
┌──────────────────────────────────────────────┐
│ ┌── hero image (or tour thumbnail) ─────┐   │
│ │ [Hostel|Hotel]              [↗] [♡]  │   │  D-09 top-left badge, D-12 top-right actions
│ │                                        │   │
│ │                                        │   │
│ │                                        │   │
│ │                                        │   │
│ │ [3D Tour]                              │   │  D-08 bottom-left, only when tours.length > 0 && thumbnailUrl
│ └────────────────────────────────────────┘   │
│                                               │
│  Title • Neighborhood                         │
│  Street address, city                         │
│                                               │
│  3 rooms · 8 max guests                       │  D-10 no price chip, no beds/baths/sqm
│  [Wi-Fi] [AC] [Parking] [+4 more]             │  D-10 top 2-3 amenity chips + overflow
└──────────────────────────────────────────────┘
```

Card dimensions for horizontal strip: fixed width ~260-280pt (so a partial 2nd card peeks — discovery affordance), match PropertyCard's `borderRadius: 24` + `height: 250` hero for visual continuity.

### Copy verbatim from PropertyCard

- Outer `TouchableOpacity` + `onPress={() => onPress(property)}` wrapper
- `imageWrapper` + `Image` (with tour-thumbnail-first source selection — swap source logic only)
- `topRightActions` (share + heart buttons) — including `handleShare` but with D-11 no-price message
- `heartButton` with `Heart` icon + `isFavorited`/`isLoading` states
- Owner edit/delete chrome (D-12) behind `showEditButton` prop

### Change from PropertyCard

- Source selection: `const heroUri = property.tours?.[0]?.thumbnailUrl || property.imageUrl || placeholder;` (D-08)
- Status badge replaced with type badge `Hostel|Hotel` top-left (D-09)
- 3D Tour badge bottom-left (reuse `styles.tour3DBadge` pattern from PropertyCard — the file has `#6C63FF` brownfield hex per Phase 4 Path B precedent; same treatment here)
- Body row: `{property.rooms || 0} {t('hospitality.rooms')} · {property.maxGuests || 0} {t('hospitality.maxGuests')}` (no ListingMetaTable)
- Amenity chip preview row (D-10): first 3 elements of `property.amenities || []`, each as a mini chip with lucide icon; if `amenities.length > 3` append `{+N more}` chip. Use same icon mapping as D-23 detail view.
- Footer row: remove `formatPrice` + `specsContainer`; replace with the rooms/maxGuests line. When `showEditButton: true`, keep the owner edit/delete chrome row as-is.

### Share message (D-11)

Either inline at `HospitalityCard`'s `handleShare`:
```ts
const shareMessage = `${property.title}\n${property.address}\n\n${shareUrl}`;  // no priceText
```
OR extract `src/utils/getShareMessage.ts` with a `category`-aware branch. **Recommendation: inline for M1.** Two call sites (`PropertyCard`, `HospitalityCard`) is below the "extract when ≥3 consumers" threshold in CONVENTIONS.md. If Phase 8 release polish adds a third site (e.g., PropertyDetailsScreen share — currently 1 residential call site), extract then.

### Prop shape

Match PropertyCard's prop contract 1:1 except the card is hospitality-only — no variant:

```ts
interface HospitalityCardProps {
  property: Property;  // must be Hospitality-category per caller
  onPress: (property: Property) => void;
  onViewTour: (property: Property) => void;
  onFavorite?: (property: Property) => void;
  isFavorited?: boolean;
  isLoading?: boolean;
  onEdit?: (property: Property) => void;
  onDelete?: (property: Property) => void;
  showEditButton?: boolean;
}
```

Note: no `onViewVideo` prop — Hospitality cards in the strip are tour-emphasis, not video-emphasis. Video still accessible on the detail screen media row.

---

## Section 3 — PropertyDetailsScreen Hospitality Branch

### Pattern: in-place conditional (D-13)

The codebase precedent is `CreateListingScreen` orchestrator (Phase 4 Plan 04-06): derive `const category = propertyTypeToCategory(values.propertyType)` near the top; conditionally mount subcomponents. Same shape here at PropertyDetailsScreen:176:

```tsx
const { colors, isDark } = useTheme();
// ... existing hooks ...
const [property, setProperty] = useState<Property>(initialProperty);
const category = propertyTypeToCategory(property.propertyType);  // NEW — near line 181
const isHospitality = category === 'Hospitality';
```

Then each of the four branch points becomes a simple ternary/conditional render.

### Branch point 1: Tour position (D-14)

**Current:** `TourHeroCard` renders at PropertyDetailsScreen.tsx:479-487 inside `styles.mediaButtonsContainer`, after the image carousel at :444-472.

**Change:** When `isHospitality`, render `TourHeroCard` as a **sibling above** the carousel container. The residential media-grid layout stays unchanged.

```tsx
<ScrollView ...>
  {isHospitality && (
    <View style={{ paddingHorizontal: 20, paddingTop: 12 }}>
      <TourHeroCard
        isActive={!!(property.is3DTourAvailable && property.tours.length > 0)}
        tourCount={property.tours.length}
        isDark={isDark}
        inputBackground={colors.inputBackground}
        textSecondary={colors.textSecondary}
        borderColor={colors.border}
        onPress={onOpenTours}
      />
    </View>
  )}
  <View style={styles.carouselContainer}>
    {/* existing carousel */}
  </View>
  <View style={styles.contentContainer}>
    <View style={styles.mediaButtonsContainer}>
      {!isHospitality && (
        <TourHeroCard ... />   // existing residential position
      )}
      <View style={styles.mediaGrid}>...</View>  // Instagram/Photos/Videos/Message stays
    </View>
    ...
  </View>
</ScrollView>
```

### Branch point 2: Price block removal (D-15) — defense in depth

The price block lives at PropertyDetailsScreen.tsx:752-755:
```tsx
<View style={styles.priceContainer}>
  <Text style={[styles.priceLabel, ...]}>{t('property.price')}</Text>
  <Text style={[styles.footerPrice, ...]}>{formatPrice(property, t('property.perMonth'))}</Text>
</View>
```

**Primary guard** (at call site):
```tsx
{!isHospitality && (
  <View style={styles.priceContainer}>
    <Text style={[styles.priceLabel, ...]}>{t('property.price')}</Text>
    <Text style={[styles.footerPrice, ...]}>{formatPrice(property, t('property.perMonth'))}</Text>
  </View>
)}
```

**Defense-in-depth secondary guard:** Consider adding an early-return in `formatPrice(p)` when `propertyTypeToCategory(p.propertyType) === 'Hospitality'` — return `''` or `undefined`. Rationale: Phase 5 already has a backend-facing guard (`bba66fe` in `PropertyService` — `price?.toString() || '0'`). A symmetric render-side guard defends against any future caller that forgets the conditional. **However**, this cross-cuts Phase 5's purity (formatPrice is currently category-unaware), so the planner should weigh whether the defensive check is worth the added coupling.

**Recommendation: primary guard only for M1.** Add the backend price-guard precedent to the test matrix (Phase 5's `validators.test.ts` asserts no price key in Hospitality payload — test is already green) and rely on the in-place conditional. Defense-in-depth is M2 polish.

### Branch point 3: Footer composition (D-16)

The footer (~:748-797) currently renders:
1. `priceContainer` + `ownerContainer` in a row
2. "Contact Now" button that opens the hybrid `showContactModal`

When Hospitality:
1. Remove `priceContainer` (D-15)
2. Keep `ownerContainer` (landlord link stays functional)
3. Replace "Contact Now" modal button with the three inline icon buttons (D-16 — see §6)

Pattern:
```tsx
<View style={[styles.footer, ...]}>
  <View style={styles.footerTopRow}>
    {!isHospitality && <View style={styles.priceContainer}>...</View>}
    {/* owner container — unchanged */}
  </View>
  {isHospitality ? (
    <HospitalityContactBar property={property} />
  ) : (
    <TouchableOpacity style={styles.contactButton} onPress={() => setShowContactModal(true)}>
      ...
    </TouchableOpacity>
  )}
</View>
```

Small extraction: defining `HospitalityContactBar` as an inline component inside `PropertyDetailsScreen.tsx` (function declared below the main component) keeps the 1684-LOC file cohesive while isolating the disable-when-empty logic.

### Branch point 4: Amenity chip grid (D-23)

The feature-rendering block at :602-618:
```tsx
<View style={styles.section}>
  <Text style={[styles.sectionTitle, ...]}>{t('property.whatThisPlaceOffers')}</Text>
  <View style={[styles.sectionContentBox, ...]}>
    <View style={styles.featuresGrid}>
      {property.features.map((feature, index) => {
        const IconComponent = getFeatureIcon(feature);
        return (
          <View key={index} style={styles.featureItem}>
            <IconComponent size={20} color={colors.textSecondary} />
            <Text style={[styles.featureItemText, ...]}>{feature}</Text>
          </View>
        );
      })}
    </View>
  </View>
</View>
```

When Hospitality, render from `property.amenities` via the canonical amenity-icon map (§5) + `t('amenity.{token}')` labels instead of `property.features`:

```tsx
<View style={styles.section}>
  <Text style={[styles.sectionTitle, ...]}>{t('hospitality.amenities')}</Text>
  <View style={[styles.sectionContentBox, ...]}>
    <View style={styles.featuresGrid}>
      {(property.amenities || []).map((token) => {
        const Icon = AMENITY_ICONS[token] ?? Check;
        return (
          <View key={token} style={styles.featureItem}>
            <Icon size={20} color={colors.textSecondary} />
            <Text style={[styles.featureItemText, { color: colors.text }]}>{t(`amenity.${token}` as TranslationKeys)}</Text>
          </View>
        );
      })}
    </View>
  </View>
</View>
```

`AMENITY_ICONS` lives colocated in PropertyDetailsScreen (or exported from `hospitalityAmenities.ts` for reuse by HospitalityCard preview row). See §5.

---

## Section 4 — Filter / Toggle Interaction (HOSP-02)

### Current state (HomeScreen.tsx:77-79)

```ts
const [transactionType, setTransactionType] = useState<'rent' | 'sale'>('rent');
const [isCommercial, setIsCommercial] = useState(false);
const [selectedType, setSelectedType] = useState<string | null>(null);
```

Filter loop (:112-174):
- Line 116: `if (pType && pType !== transactionType) return false;` — transaction filter
- Line 120: `const isPropCommercial = COMMERCIAL_TYPES.some(...)` — binary category check
- Line 122-126: if `isCommercial`, reject non-commercial; else reject commercial (**implicit behavior: Hospitality listings reject as "not commercial"=>treated as Residential, so they leak into Residential list today**). This is HOSP-02's critical bug to fix.
- Line 129-131: `selectedType` chip narrows further.

### Required changes (D-04 / D-05 / D-24)

Replace the binary state + filter with tri-state + category-aware:

```ts
// D-04
type CategoryFilter = 'Residential' | 'Commercial' | 'Hospitality';
const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('Residential');
const [selectedType, setSelectedType] = useState<string | null>(null);
```

Filter loop becomes:
```ts
const filteredProperties = useMemo(() => {
  return properties.filter((p) => {
    // 1. Transaction type (Rent vs Sell) — unchanged
    const pType = p.type?.toLowerCase();
    if (pType && pType !== transactionType) return false;

    // 2. Category (D-04 tri-state)
    const pCategory = propertyTypeToCategory(p.propertyType);
    if (pCategory !== selectedCategory) return false;

    // 3. Specific property-type chip (unchanged)
    if (selectedType) {
      if (p.propertyType?.toLowerCase() !== selectedType.toLowerCase()) return false;
    }
    // ... district + search unchanged ...
    return true;
  });
}, [properties, transactionType, selectedCategory, selectedType, selectedDistrict, searchQuery]);
```

### Hospitality strip (D-01, D-04) alongside tri-state

When `selectedCategory === 'Residential' || 'Commercial'`: render `HospitalitySection` as `ListHeaderComponent`, with its inner data filtered to `propertyTypeToCategory(p.propertyType) === 'Hospitality'` AND `p.type === transactionType`. When `selectedCategory === 'Hospitality'`: do NOT render strip (vertical list IS hospitality, strip would be redundant).

```tsx
const hospitalityProperties = useMemo(
  () => properties.filter(p =>
    propertyTypeToCategory(p.propertyType) === 'Hospitality'
    && (!p.type || p.type === transactionType)
  ),
  [properties, transactionType],
);

<FlatList
  data={filteredProperties}  // already filtered above — includes Hospitality ONLY when selectedCategory === 'Hospitality'
  ListHeaderComponent={
    <>
      {renderHeaderContent()}
      {selectedCategory !== 'Hospitality' && (
        <HospitalitySection properties={hospitalityProperties} ...handlers />
      )}
    </>
  }
  renderItem={({ item }) => (
    selectedCategory === 'Hospitality'
      ? <HospitalityCard property={item} ... />
      : <PropertyCard property={item} ... />
  )}
/>
```

Note the `ListHeaderComponent` wraps the existing header content + the conditional strip into a single fragment, so they scroll together.

### Property-type chip row (D-03)

Current chips (:370-428) iterate `isCommercial ? COMMERCIAL_TYPES : RESIDENTIAL_TYPES`. Extend to branch on `selectedCategory`:

```ts
const chipTypes = selectedCategory === 'Hospitality'
  ? HOSPITALITY_TYPES
  : selectedCategory === 'Commercial' ? COMMERCIAL_TYPES : RESIDENTIAL_TYPES;
```

D-03: when user taps `Hostel` / `Hotel` chip, `togglePropertyType` stays the same — the filter already narrows the vertical list via `selectedType`. Because `selectedCategory === 'Hospitality'` is active, the strip is already hidden (no duplication).

### Toggle chip UI (D-04)

Promote the existing `Commercial` pill (:382-402) to a three-state segment (Residential / Commercial / Hospitality). Two options:

1. **Expand the existing two-segment horizontal FlatList toggle** (minimal surface change): render three chips `[Residential, Commercial, Hospitality]`, clicking one sets `selectedCategory` to that value and resets `selectedType`.
2. **New `segmentedControl`-style segment** (like the Rent/Sell control at :339-366 which has rounded pill segments). More visual weight to the category toggle.

**Recommendation: option 1** — it's a minimal diff to the current header, preserves the Filter-expand chrome, and uses the already-vetted chip pattern. The category chips sit on the same row as the property-type chips (first item is the category toggle, rest are types for that category). Option 2 adds a whole new control requiring dark/light parity styling — higher risk.

Filter row layout becomes (example):
```
[Residential][Commercial][Hospitality] [Apartment][House][Townhome][Condo]
^ always visible (3 chips)           ^ chips for selectedCategory
```

---

## Section 5 — Amenity Taxonomy + Icon Mapping (HOSP-05 / HOSP-06)

### Canonical tokens (D-19)

```ts
// src/utils/hospitalityAmenities.ts
export const HOSPITALITY_AMENITIES = [
  'wifi', 'aircon', 'heating', 'kitchen', 'breakfast', 'parking',
  'reception24', 'laundry', 'hotwater', 'commonarea', 'lockers', 'ensuite',
] as const;
export type HospitalityAmenity = typeof HOSPITALITY_AMENITIES[number];
```

### Icon mapping (D-23 Claude's discretion resolved)

All 12 recommended icons are **verified available** in `lucide-react-native@0.564.0` [VERIFIED: grep `node_modules/lucide-react-native/dist/icons.d.ts`].

| Token | Icon | Alternate | Rationale |
|-------|------|-----------|-----------|
| `wifi` | `Wifi` | — | Unambiguous |
| `aircon` | `AirVent` | `Snowflake`, `Wind` | AirVent is the "A/C" visual used already in PropertyDetailsScreen.tsx:93 |
| `heating` | `ThermometerSun` | `Flame`, `Thermometer` | Matches the existing mapping at PropertyDetailsScreen.tsx:94 |
| `kitchen` | `Utensils` | `ChefHat`, `UtensilsCrossed` | Existing mapping at :130 |
| `breakfast` | `Coffee` | `Croissant` | Existing mapping at :134-136; breakfast evokes coffee more than the croissant glyph |
| `parking` | `SquareParking` | `Car` | Existing mapping at :100-102 |
| `reception24` | `ConciergeBell` | `Bell`, `BellRing`, `Clock` | `ConciergeBell` unambiguously evokes hotel reception |
| `laundry` | `WashingMachine` | `Shirt` | Existing mapping at :104, :109 |
| `hotwater` | `ShowerHead` | `Droplets`, `Droplet` | `ShowerHead` is the common hostel amenity glyph |
| `commonarea` | `Sofa` | `Users` | `Sofa` evokes lounge; `Users` is ambiguous with chat |
| `lockers` | `Lock` | `LockKeyhole`, `Key`, `Package` | `Lock` is the simplest; already used at :151 |
| `ensuite` | `Bath` | `ShowerHead`, `Toilet` | `Bath` is the "private bathroom" signal; `ShowerHead` is reserved for hotwater per above |

**Colocate the mapping:**

```ts
// src/utils/hospitalityAmenities.ts — add after HOSPITALITY_AMENITIES
import {
  Wifi, AirVent, ThermometerSun, Utensils, Coffee, SquareParking,
  ConciergeBell, WashingMachine, ShowerHead, Sofa, Lock, Bath,
  type LucideIcon
} from 'lucide-react-native';

export const AMENITY_ICONS: Record<HospitalityAmenity, LucideIcon> = {
  wifi: Wifi,
  aircon: AirVent,
  heating: ThermometerSun,
  kitchen: Utensils,
  breakfast: Coffee,
  parking: SquareParking,
  reception24: ConciergeBell,
  laundry: WashingMachine,
  hotwater: ShowerHead,
  commonarea: Sofa,
  lockers: Lock,
  ensuite: Bath,
};
```

Note: `LucideIcon` type is exported from the library [VERIFIED: `node_modules/lucide-react-native/dist/icons.d.ts` declares `type LucideIcon = ForwardRefExoticComponent<LucideProps>`].

### i18n labels (HOSP-06)

24 new translation keys (12 × 2 locales):

| Key | EN | RU |
|-----|----|----|
| `amenity.wifi` | Wi-Fi | Wi-Fi |
| `amenity.aircon` | Air conditioning | Кондиционер |
| `amenity.heating` | Heating | Отопление |
| `amenity.kitchen` | Kitchen | Кухня |
| `amenity.breakfast` | Breakfast | Завтрак |
| `amenity.parking` | Parking | Парковка |
| `amenity.reception24` | 24h reception | Круглосуточная стойка |
| `amenity.laundry` | Laundry | Прачечная |
| `amenity.hotwater` | Hot water | Горячая вода |
| `amenity.commonarea` | Common area | Общая зона |
| `amenity.lockers` | Lockers | Камеры хранения |
| `amenity.ensuite` | En-suite bathroom | Санузел в номере |

Matches REQUIREMENTS.md HOSP-05 label order. `check-i18n-parity.sh` verifies key parity at CI.

### Multi-select UX (D-18)

No existing multi-select chip component in the codebase — the pattern is simple and local to HospitalitySection:

```tsx
// HospitalitySection.tsx — replace placeholder at :100-102
<View style={commonStyles.chipRow}>
  {HOSPITALITY_AMENITIES.map((token) => {
    const Icon = AMENITY_ICONS[token];
    const selected = values.amenities.includes(token);
    return (
      <TouchableOpacity
        key={token}
        style={[
          commonStyles.chip,
          {
            backgroundColor: selected ? colors.accent : colors.inputBackground,
            borderColor: selected ? colors.accent : colors.border,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
          },
        ]}
        onPress={() => {
          const next = selected
            ? values.amenities.filter(a => a !== token)
            : [...values.amenities, token];
          onChange('amenities', next);
        }}
      >
        <Icon size={14} color={selected ? '#FFFFFF' : colors.text} />
        <Text style={[commonStyles.chipText, { color: selected ? '#FFFFFF' : colors.text }]}>
          {t(`amenity.${token}` as TranslationKeys)}
        </Text>
      </TouchableOpacity>
    );
  })}
</View>
{errors.amenities && (
  <Text style={[commonStyles.hint, commonStyles.fieldError, { color: colors.error }]}>
    {t(errors.amenities as TranslationKeys)}
  </Text>
)}
```

The white `'#FFFFFF'` hex on selected state matches the existing PriceSection currency-chip precedent (Phase 4 Path B brownfield hex grandfathered).

### Detail-view rendering (D-23)

See §3 Branch Point 4.

---

## Section 6 — Contact Quick-Actions (HOSP-04 / D-16)

### Existing patterns

- `handleWhatsApp` (:244-270): `whatsapp://send?phone=${cleanPhone}&text=...` with `tel:` fallback
- `handleTelegram` (:272-298): `https://t.me/${username}?text=...` web URL (more robust than `tg://resolve?domain=` per code comment)
- `handlePhone` (:317-329): `tel:${cleanPhone}`

All three are already defined on PropertyDetailsScreen. Reuse them directly — no refactor needed.

### Sticky bar implementation

```tsx
// Inside PropertyDetailsScreen.tsx, conditional when isHospitality
const insets = useSafeAreaInsets();
const owner = (property as any).owner;
const hasWhatsApp = !!owner?.whatsapp;
const hasTelegram = !!owner?.telegram;
const hasPhone = !!owner?.phone;

<View style={[
  styles.hospitalityContactBar,
  {
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    paddingBottom: Math.max(insets.bottom, 12),
  }
]}>
  <TouchableOpacity
    style={[styles.hospitalityContactBtn, { backgroundColor: hasWhatsApp ? '#25D366' : colors.inputBackground, opacity: hasWhatsApp ? 1 : 0.4 }]}
    onPress={hasWhatsApp ? handleWhatsApp : undefined}
    disabled={!hasWhatsApp}
    accessibilityRole="button"
    accessibilityLabel={t('property.whatsapp')}
  >
    <MessageCircle size={22} color="#FFF" />
  </TouchableOpacity>
  <TouchableOpacity
    style={[styles.hospitalityContactBtn, { backgroundColor: hasTelegram ? '#0088CC' : colors.inputBackground, opacity: hasTelegram ? 1 : 0.4 }]}
    onPress={hasTelegram ? handleTelegram : undefined}
    disabled={!hasTelegram}
    accessibilityRole="button"
    accessibilityLabel={t('property.telegram')}
  >
    <Send size={22} color="#FFF" />
  </TouchableOpacity>
  <TouchableOpacity
    style={[styles.hospitalityContactBtn, { backgroundColor: hasPhone ? '#10B981' : colors.inputBackground, opacity: hasPhone ? 1 : 0.4 }]}
    onPress={hasPhone ? handlePhone : undefined}
    disabled={!hasPhone}
    accessibilityRole="button"
    accessibilityLabel={t('property.phoneCall')}
  >
    <Phone size={22} color="#FFF" />
  </TouchableOpacity>
</View>
```

Note: WhatsApp `#25D366` and Telegram `#0088CC` are brand colors (not theme tokens). Phase 6 precedent: Phase 5's contact-modal at :918-947 uses the same hex approach (`'#10B981'` for phone, `'#6B7280'` for email). Same Path B brownfield-hex grandfathering applies — the green/blue brand-color signaling is more valuable than theme-token purity for contact affordances. Alignment pass (Phase 7) may revisit.

### URL schemes reference

- WhatsApp: `whatsapp://send?phone={digits-only}&text={encoded}` → falls back to `tel:` if not installed [CITED: existing handler at PropertyDetailsScreen.tsx:255-268 — pattern proven on iOS + Android]
- Telegram: `https://t.me/{username}?text={encoded}` (web URL preferred; handles redirection), fallback `tg://resolve?domain={username}` [CITED: existing handler at :290-297]
- Phone: `tel:{digits-only}` [CITED: :324]

### Footer height + scroll content padding

When the sticky contact bar is present, the existing `styles.footer` still renders above the contact bar (containing the owner-landlord link). Two layout options:

1. **Sticky contact bar replaces existing footer entirely for Hospitality** — existing footer conditionally doesn't render; sticky bar is the only fixed bottom chrome.
2. **Sticky contact bar sits below existing footer** — stacked chrome (owner link row + contact buttons row).

**Recommendation: option 1.** The existing footer's main purpose is the price + owner + "Contact Now" triad; in Hospitality the price goes away (D-15) and the contact-now modal is replaced by the inline buttons. Keeping the owner link row separately below the carousel (e.g., in a `section` next to the description) preserves the landlord nav without competing with the sticky bar.

Alternative: embed a tiny owner-name text above the three contact icons inside the sticky bar:
```tsx
<View style={hospitalityContactBar}>
  {ownerName && (
    <Text style={{ color: colors.textSecondary, marginBottom: 8 }}>
      {t('property.landlord')}: {ownerName}
    </Text>
  )}
  <View style={{ flexDirection: 'row', gap: 12, justifyContent: 'space-around' }}>
    {/* three buttons */}
  </View>
</View>
```

Planner picks; both match the D-16 spec.

---

## Section 7 — Property-Type Filter Scoping (HOSP-02 part 2)

Covered above in §4. Summary:

- Tri-state `selectedCategory` determines which `*_TYPES` array populates the chip row and which category the vertical list filters to.
- Selecting `Hostel` or `Hotel` chip under `selectedCategory === 'Hospitality'` narrows to that specific type; the horizontal strip is already hidden (would be redundant).
- Selecting `Hostel` or `Hotel` chip under `selectedCategory === 'Residential'` or `'Commercial'`: per D-03, this is not the expected path — the Hostel/Hotel chips only render when category is Hospitality. So `selectedType = 'Hostel'` while `selectedCategory = 'Residential'` is unreachable by UI flow. Tested by the chip-list-render logic: `chipTypes = HOSPITALITY_TYPES` only when category is Hospitality.

---

## Section 8 — WR-03 Consolidation Plan (D-24)

### Current state

`HomeScreen.tsx:48-49`:
```ts
const RESIDENTIAL_TYPES = ['Apartment', 'House', 'Townhome', 'Condo'];
const COMMERCIAL_TYPES = ['Office', 'Retail', 'Warehouse', 'Industrial'];
```

These are STRING arrays (not readonly tuples), duplicated from the canonical `src/utils/propertyCategory.ts:23-28` which exports `RESIDENTIAL_TYPES`, `COMMERCIAL_TYPES`, `HOSPITALITY_TYPES` as `readonly PropertyType[]`.

Consumer (:120 + :376):
```ts
const isPropCommercial = COMMERCIAL_TYPES.some(t => t.toLowerCase() === pPropertyType);
// ...
...(isCommercial ? COMMERCIAL_TYPES : RESIDENTIAL_TYPES).map(t => ({ id: t, label: t, isToggle: false }))
```

### Migration

```ts
// delete lines 48-49
import {
  RESIDENTIAL_TYPES,
  COMMERCIAL_TYPES,
  HOSPITALITY_TYPES,
  propertyTypeToCategory,
} from '../utils/propertyCategory';
```

Filter logic (:120-126) rewrites:
```ts
// BEFORE:
const isPropCommercial = COMMERCIAL_TYPES.some(t => t.toLowerCase() === pPropertyType);
if (isCommercial) {
  if (!isPropCommercial) return false;
} else {
  if (isPropCommercial) return false;
}

// AFTER:
const pCategory = propertyTypeToCategory(p.propertyType);
if (pCategory !== selectedCategory) return false;  // D-04 tri-state
```

Chip-row data source (:376):
```ts
// BEFORE:
...(isCommercial ? COMMERCIAL_TYPES : RESIDENTIAL_TYPES).map(t => ({ id: t, label: t, isToggle: false }))

// AFTER: D-04 tri-state
const chipTypes = selectedCategory === 'Hospitality'
  ? HOSPITALITY_TYPES
  : selectedCategory === 'Commercial' ? COMMERCIAL_TYPES : RESIDENTIAL_TYPES;
// use chipTypes directly; categoryChips for Residential/Commercial/Hospitality become their own separate list above chipTypes
```

### tsc impact

`COMMERCIAL_TYPES`/`RESIDENTIAL_TYPES` from the canonical util are `readonly PropertyType[]` (narrowed string-literal union), not `string[]`. `PropertyType` = `'Apartment' | 'House' | ... | 'Hostel' | 'Hotel'`. The `.map(t => ({ id: t, label: t, isToggle: false }))` still produces chip objects fine. The only place type narrowing could bite is `selectedType: string | null` vs chip `t: PropertyType` — the existing `.toLowerCase() === selectedType.toLowerCase()` comparison widens back to string, so no change required.

### CI preservation

- `scripts/check-role-grep.sh` must continue to exit 0. No new `userType === 'admin'` strings introduced by this phase.
- `scripts/check-land-removed.sh` must continue to exit 0. No `Land` references introduced.
- `scripts/check-i18n-parity.sh` must continue to exit 0 after adding 30 new keys to both locales (see §Validation Architecture).

---

## Section 9 — Hidden Gaps (MUST be addressed in Phase 6)

These are not in CONTEXT.md but are required for HOSP-01..06 to function end-to-end. Research surfaces them so the planner can fold them in rather than discovering mid-execution.

### Gap 9.1 — Backend wire-up for Hospitality fields

**Finding:** `src/services/PropertyService.ts` at `createProperty` (:65-93) and `updateProperty` (:132-160) DO NOT append `rooms`, `maxGuests`, or `amenities` to the FormData payload. Phase 5's `buildPayloadByCategory` returns these keys in the Hospitality branch — but they never reach the network.

**Verification:**
```bash
grep -n "formData.append.*rooms\|formData.append.*maxGuests\|formData.append.*amenit" src/services/PropertyService.ts
# no matches
```

**Impact if unaddressed:**
- Hospitality listings saved in Phase 5 manual QA have `rooms=undefined` / `maxGuests=undefined` / `amenities=undefined` on the backend — fields silently discarded.
- Phase 6 `HospitalityCard` renders `{rooms || 0} rooms · {maxGuests || 0} max guests` — every card shows `0 rooms · 0 max guests` until the backend round-trip fix lands.
- Phase 6 detail-view chip grid iterates `property.amenities` — empty array means no chips rendered even when the user ticked 12 boxes.

**Fix (add to Phase 6 plan):**
```ts
// src/services/PropertyService.ts — both createProperty and updateProperty
formData.append('rooms', propertyData.rooms?.toString() || '0');
formData.append('maxGuests', propertyData.maxGuests?.toString() || '0');
formData.append('amenities', JSON.stringify(propertyData.amenities || []));
```

Extend `Property` type (`src/types/Property.ts`) with:
```ts
rooms?: number;
maxGuests?: number;
amenities?: HospitalityAmenity[];  // D-20
```

**Backend coordination:** Railway backend needs to accept these fields. Follows the Phase 3 GATE-05 "unconfirmed-at-ship / accepted risk" precedent — if backend drops them, frontend still parses back `undefined` gracefully. If backend needs a schema update, that's a Phase 6 coordination note to add in a new `.planning/phases/06-hospitality-rendering/06-BACKEND-COORDINATION.md` and ship with accepted-risk disposition. Per `.planning/PROJECT.md` Out-of-Scope "Migration tooling for existing listings (no production listings exist)" + clean-slate data invariant: backend adding three new fields to the property schema is low-risk.

### Gap 9.2 — Edit-mode rehydrate for Hospitality fields

**Finding:** `CreateListingScreen.tsx` useEffect at ~:250-310 rehydrates Residential (`setBedrooms`, `setBathrooms`, `setAreaSqm`) and Commercial (`setAreaSqm`, `setPropertyType`) from `propertyToEdit.specs.beds/baths/sqft`, but does NOT call `setRooms(propertyToEdit.rooms)`, `setMaxGuests(propertyToEdit.maxGuests)`, or `setAmenities(propertyToEdit.amenities)`. So editing a Hospitality listing blanks those fields.

**Verification:**
```bash
grep -n "setRooms\|setMaxGuests\|setAmenities" src/screens/CreateListingScreen.tsx
# 108: const [rooms, setRooms] = useState('');
# 109: const [maxGuests, setMaxGuests] = useState('');
# 110: const [amenities, setAmenities] = useState<string[]>([]);
# (no setRooms(...) / setMaxGuests(...) / setAmenities(...) inside the rehydrate useEffect)
```

**Fix (add to Phase 6 plan):** extend the `if (propertyToEdit)` block at ~:247-305 with:
```ts
setRooms((propertyToEdit as any).rooms?.toString() || '');
setMaxGuests((propertyToEdit as any).maxGuests?.toString() || '');
setAmenities(((propertyToEdit as any).amenities || []) as HospitalityAmenity[]);
```

This is a 3-line addition to an existing useEffect — small change, but completely required for FORM-08 parity with Residential/Commercial.

### Gap 9.3 — RenterListingsScreen is the actual "My Listings"

**Finding:** CONTEXT.md repeatedly mentions `OwnerListingsScreen.tsx` as the "My Listings" strip mount point. But:
- `OwnerListingsScreen.tsx` is the **landlord-profile view** (reached from PropertyDetailsScreen by tapping the landlord's name — see PropertyDetailsScreen.tsx:762-764 `onLandlordPress(ownerUid, ownerName)`). Header text: `{ownerName}'s Listings`.
- `RenterListingsScreen.tsx` is the actual **current-user-My-Listings** view (reached from AccountSettings → "My Listings" — wired Phase 5). Header text: `My Listings`. This screen has the `showEditButton`/`onEdit`/`onDelete` chrome.

**Both screens need the Hospitality strip mount** under D-06:
- `OwnerListingsScreen`: strip filtered to `ownerUid`'s hospitality listings. No edit/delete chrome (viewer context).
- `RenterListingsScreen`: strip filtered to current user's hospitality listings. Edit/delete chrome via `showEditButton={true}`.

**Fix (add to Phase 6 plan):** The two task actions are structurally identical — both screens render `<HospitalitySection properties={hospitalityProps} ... />` as `ListHeaderComponent`. The planner should create two tasks (one per screen) OR one task that covers both, since the diff is near-identical.

### Gap 9.4 — Small but actionable

- `hospitality.amenitiesPhase6Placeholder` key (EN + RU) can be DELETED after D-18 lands. Planner should include the deletion in the i18n wave to keep the key list tidy.
- The existing `Property.specs.beds / baths / sqft` shape is Residential/Commercial — for Hospitality, `rooms` is a top-level field. Don't try to shoehorn rooms into `specs.beds` on the backend — keep them separate (confirmed by clean-slate invariant).

---

## Section 10 — i18n Parity Strategy (HOSP-06)

### Single Wave 0 i18n commit

All ~30 new keys added to both `src/locales/en.ts` and `src/locales/ru.ts` in ONE commit at the start of Phase 6. Rationale:

1. `src/locales/index.ts` uses `Record<TranslationKeys,string>` tsc gate — every new key needs both EN and RU simultaneously, else tsc blocks.
2. `scripts/check-i18n-parity.sh` runs on every phase-gate regression bundle; parity at Wave 0 means no downstream task can introduce asymmetry.
3. Downstream tasks (card, section, detail branch) reference keys via `t('...')`; having the keys pre-added means no task blocks on "add the key first."

### Full key list for Wave 0

```ts
// Add to both en.ts and ru.ts:

// Amenity labels (12 × 2 = 24)
'amenity.wifi': ...,
'amenity.aircon': ...,
'amenity.heating': ...,
'amenity.kitchen': ...,
'amenity.breakfast': ...,
'amenity.parking': ...,
'amenity.reception24': ...,
'amenity.laundry': ...,
'amenity.hotwater': ...,
'amenity.commonarea': ...,
'amenity.lockers': ...,
'amenity.ensuite': ...,

// Amenity validation (1 × 2 = 2) — use createListing.* namespace per Phase 5 precedent
'createListing.amenitiesRequired': ...,

// HospitalitySection strip (2 × 2 = 4)
'home.hospitalitySectionTitle': ...,       // 'Hostels & Hotels' / 'Хостелы и отели'
'home.hospitalitySectionCount': ...,       // '{count}' or '({count})' — interpolation arg

// HospitalityCard badges (2 × 2 = 4) — reuse 'property.forRent'/'property.forSale' only if they already exist
'hospitality.badge.hostel': ...,           // 'Hostel' / 'Хостел'
'hospitality.badge.hotel': ...,            // 'Hotel' / 'Отель'

// HospitalityCard rooms/maxGuests — already exist in `hospitality.rooms` / `hospitality.maxGuests` per Phase 4. Reuse.
```

Total: 16 keys × 2 locales = **32 new translation keys** added at Wave 0. Deletion: `hospitality.amenitiesPhase6Placeholder` (2 keys) removed at Wave 0 or at the end — recommend removing at end alongside the placeholder hint replacement in HospitalitySection.tsx so the key isn't referenced during the transition.

### Interpolation arg — `home.hospitalitySectionCount`

The codebase's `t()` function already supports interpolation — Phase 5 uses it for several validation keys (e.g., `'error.cannotOpen'` with `{label}`). Same pattern:
```ts
// en.ts
'home.hospitalitySectionCount': '({count})',
// ru.ts
'home.hospitalitySectionCount': '({count})',

// Usage:
t('home.hospitalitySectionCount', { count: hospitalityProperties.length })
// → '(12)'
```

Or embed the count inline for simpler i18n:
```ts
// Just fixed copy, no interpolation:
'home.hospitalitySectionTitle': 'Hostels & Hotels',
// Then render: `${t('home.hospitalitySectionTitle')} (${properties.length})`
```

**Recommendation: inline concatenation.** Interpolation via the `t()` helper for a single integer is overhead; parenthesized count is visually universal (EN + RU). Planner picks.

### `check-i18n-parity.sh` gate

CI script at `scripts/check-i18n-parity.sh` runs `diff <(sort EN keys) <(sort RU keys)`. Exits non-zero on asymmetry. Phase 4 landed this script with a minor regex gap noted in WR-02 (Phase 4 REVIEW.md — regex `[a-zA-Z.]+:` excludes digits, so keys like `hospitality.amenitiesPhase6Placeholder` slipped through). All the new keys in this phase use only `[a-z.]+` — compatible with the current regex, so WR-02 does NOT block this phase. (WR-02 remains a spot-fix for any phase before Phase 8 release prep.)

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Jest 29 [VERIFIED: package.json `jest: ^29.6.3`] |
| Config file | `package.json` `"test": "jest"` (default config — RN Jest preset via `@react-native/*`) |
| Quick run command | `npm test -- --testPathPattern validators` (≈2s) |
| Full suite command | `npm test` (6 suites / 50 tests GREEN at Phase 5 exit per STATE.md) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| HOSP-05 | Amenity chip toggle grid in HospitalitySection | smoke / manual | Manual QA matrix | Manual-only (UI render) |
| HOSP-05 / D-22 | `validateByCategory` flags `amenities.length < 1` on Hospitality | unit | `npm test -- -t "Hospitality.*amenities"` | ✅ `src/components/CreateListingForm/__tests__/validators.test.ts` — extend with ~3 new assertions |
| HOSP-05 / D-22 | `buildPayloadByCategory` Hospitality payload includes `amenities` | unit | `npm test -- -t "Hospitality payload"` | ✅ existing test at :370-386 asserts `'amenities' in payload === false` — **this assertion FLIPS to `true` after D-22** |
| HOSP-05 / D-22 | Residential/Commercial payloads exclude `amenities` | unit | `npm test -- -t "Residential payload"` / `"Commercial payload"` | ✅ `validators.test.ts` — extend |
| Gap 9.1 | `PropertyService.createProperty` appends `rooms` / `maxGuests` / `amenities` | unit (PropertyService has no tests today) OR manual QA | Manual QA — physical device round-trip | ❌ Wave 0 if TDD; otherwise manual-only |
| Gap 9.2 | Edit-mode rehydrate populates `rooms` / `maxGuests` / `amenities` | manual QA | Physical device edit-a-hospitality-listing cell | Manual-only |
| HOSP-01 | Strip renders only when `hospitalityProperties.length > 0` on 3 screens | manual | QA matrix cells: empty vs populated | Manual-only |
| HOSP-02 | Hospitality cards appear under both Rent and Sell | manual | QA matrix: toggle Rent/Sell on Home with Hospitality populated | Manual-only |
| HOSP-03 | HospitalityCard renders no price, tour-first hero | manual | QA matrix cells | Manual-only |
| HOSP-04 | PropertyDetailsScreen Hostel: no price block, tours above gallery, contact bar | manual | QA matrix cells | Manual-only |
| HOSP-06 | EN + RU parity on all new strings | CI gate + manual | `./scripts/check-i18n-parity.sh` + QA swap language toggle | ✅ script exists |
| D-24 | `./scripts/check-role-grep.sh` exits 0 after all Phase 6 commits | CI | `./scripts/check-role-grep.sh; echo $?` | ✅ |

### Sampling rate

- **Per task commit:** `./scripts/check-i18n-parity.sh && ./scripts/check-role-grep.sh && ./scripts/check-land-removed.sh` (three gate scripts — each ≈0.1s — per Phase 3+4 precedent)
- **Per wave merge:** `npm test -- --testPathPattern validators` (≈2s, the only test file Phase 6 extends)
- **Phase gate:** full `npm test` + physical-device QA matrix walk + three gate scripts

### Wave 0 gaps

- [ ] `src/utils/hospitalityAmenities.ts` — NEW net file (HOSPITALITY_AMENITIES + HospitalityAmenity type + AMENITY_ICONS map)
- [ ] `src/types/Property.ts` — add `amenities?: HospitalityAmenity[]`, `rooms?: number`, `maxGuests?: number` (Gap 9.1)
- [ ] `src/locales/en.ts` + `ru.ts` — 32 new keys added in parity
- [ ] `src/components/CreateListingForm/types.ts` — `FormBag.amenities` narrows to `HospitalityAmenity[]` (D-21)
- [ ] `src/components/CreateListingForm/__tests__/validators.test.ts` — extend Hospitality describe block with ~3 amenity assertions + flip existing `'amenities' in payload === false` → `true`

*(none of these are "missing infra"; all are small additions on top of Phase 5's closed foundation.)*

### QA matrix (physical-device cells)

Following Phase 4 (18 cells) + Phase 5 (54 cells) precedent, Phase 6 cells:

| Cell group | Axis 1 | Axis 2 | Axis 3 | Cells |
|------------|--------|--------|--------|-------|
| Strip render on list screens | Home / Favorites / RenterListings / OwnerListings | Empty Hospitality / Populated (≥1) | iOS / Android | 4 × 2 × 2 = 16 |
| HomeScreen tri-state filter | Residential / Commercial / Hospitality | — | iOS / Android | 3 × 2 = 6 |
| HomeScreen transactionType × Hospitality | Rent / Sell | Hospitality populated | iOS / Android | 2 × 2 = 4 |
| HomeScreen type chip under Hospitality | Hostel / Hotel | — | iOS / Android | 2 × 2 = 4 |
| HospitalityCard variants | Has tour / No tour | Has amenities / No amenities | iOS / Android | 2 × 2 × 2 = 8 |
| PropertyDetailsScreen Hostel | Has tour / No tour | WA / TG / phone combos (4: none, WA only, TG only, all three) | iOS / Android | 2 × 4 × 2 = 16 |
| PropertyDetailsScreen Hotel | Has tour / No tour | WA / TG / phone combos (4) | iOS / Android | 2 × 4 × 2 = 16 |
| Create form amenity picker | 0 amenities (invalid) / 1 amenity (valid) / all 12 | — | iOS / Android | 3 × 2 = 6 |
| Edit-mode rehydrate for Hospitality (Gap 9.2) | Rooms/MaxGuests/Amenities restore correctly | — | iOS / Android | 1 × 2 = 2 |
| EN+RU swap during active filter | Hospitality strip + detail | — | iOS / Android | 1 × 2 = 2 |

**Total: ~80 cells.** Similar order of magnitude to Phase 5 (54). Budget ~2-3 hours per device for a full walk.

### Phase-gate regression bundle (Phase 8 preservation)

- `./scripts/check-role-grep.sh` exits 0 (Phase 3 D-14)
- `./scripts/check-land-removed.sh` exits 0 (Phase 4 FORM-01)
- `./scripts/check-i18n-parity.sh` exits 0 (Phase 4 FORM-09)
- `npm test` — 50/50 (Phase 5 baseline) + whatever new assertions Phase 6 lands
- `grep -c '<Gated' src/components/CreateListingForm/MediaSection.tsx == 2` (Phase 4 invariant)
- D-09 preserve-on-save anchors — 3 greps, each exactly 1 hit (Phase 4 preserve invariant — Phase 6 does not touch CreateListingScreen rehydrate or handleSubmit payload sections, but Gap 9.2 adds 3 lines INSIDE the rehydrate useEffect, which may shift `CreateListingScreen.tsx:253` line numbers — update `04-VERIFICATION.md` if the anchor-line numbers shift)

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Category derivation | `RESIDENTIAL_TYPES.some(...)` membership tests | `propertyTypeToCategory(p.propertyType)` | D-24; single source of truth; Phase 4 invariant |
| Safe-area sticky bar padding | Fixed `paddingBottom: 24` | `useSafeAreaInsets().bottom` + `Math.max(insets.bottom, 12)` | Matches `BottomNavigator.tsx:29-30` precedent; handles notched Android + iOS home indicator |
| WhatsApp deep link | New URL scheme logic | `handleWhatsApp` at PropertyDetailsScreen:244-270 | Already handles `tel:` fallback + phone cleaning |
| Telegram deep link | `tg://resolve?domain=...` first | `https://t.me/{username}?text=...` web URL first, deep link fallback | Existing handler at :290-297 already picks the right path; the code comment explains |
| Multi-select chip state | Set-based state or reducer | `amenities.includes(token) ? filter : [...]` with `useState<HospitalityAmenity[]>` | D-18; n=12 is tiny; Set adds serialization overhead |
| Share message with/without price | Category-aware helper | Inline per call site | Only 2 call sites; below extraction threshold |
| ListHeaderComponent scroll coord | Custom scroll sync | `ListHeaderComponent` native affordance | Standard React Native pattern; pull-to-refresh (future) Just Works |

**Key insight:** Phase 6 is composition over existing primitives. Nine decisions point to "reuse existing handler / token / pattern." Any task that reads like "build a new X" should trigger a grep for X first.

---

## Common Pitfalls

### Pitfall 1: Accidentally regressing the Phase-3 role-grep gate

**What goes wrong:** HospitalityCard or HospitalitySection adds an inline `userType === 'admin'` check (e.g., to show/hide owner-chrome).
**Why it happens:** Copy-pasting owner-action code from `PropertyCard` or from older PropertyDetails paths.
**How to avoid:** Use `showEditButton` prop pattern (PropertyCard precedent) — caller decides, not the card. Owner context is conveyed by the caller passing `showEditButton={true}`.
**Warning signs:** `./scripts/check-role-grep.sh` exits non-zero at any commit.

### Pitfall 2: Forgetting to filter strip data on `transactionType`

**What goes wrong:** Hospitality strip shows all Hostels/Hotels regardless of Rent/Sell toggle — visually inconsistent with D-05 ("Hospitality respects transactionType").
**Why it happens:** Computing `hospitalityProperties` from unfiltered `properties` instead of after the Rent/Sell split.
**How to avoid:** Derive `hospitalityProperties` AFTER applying the transaction-type filter:
```ts
const hospitalityProperties = useMemo(
  () => properties.filter(p =>
    propertyTypeToCategory(p.propertyType) === 'Hospitality'
    && (!p.type || p.type === transactionType)
  ),
  [properties, transactionType],
);
```
**Warning signs:** Strip count doesn't change when toggling Rent/Sell.

### Pitfall 3: Hospitality price field leaks into backend via formData

**What goes wrong:** Despite D-15 hiding the price UI, `PropertyService.createProperty` at :69 unconditionally appends `propertyData.price?.toString() || '0'` — so Hospitality listings ship `price: '0'` on the wire. This is actually the CURRENT state (Phase 5 `bba66fe` workaround). Not a new bug, but a latent backend contract we may revisit.
**Why it happens:** `buildPayloadByCategory('Hospitality', ...)` omits `price` key (D-14), but `PropertyService` defensively coerces undefined to `'0'`.
**How to avoid:** For M1, leave as-is (Phase 5 accepted the `'0'` default). Document in SUMMARY so Phase 8 release prep or an M2 cleanup can drop the default when backend supports truly price-free documents.
**Warning signs:** Backend owners report "Hostel listings all cost $0" — that's the `'0'` default, not a pricing bug.

### Pitfall 4: Nested horizontal-in-vertical FlatList warning

**What goes wrong:** React Native logs "VirtualizedLists should never be nested inside plain ScrollViews" if the outer screen-level FlatList gets swapped for a ScrollView during refactor.
**Why it happens:** Mid-refactor, a task author replaces the vertical FlatList with ScrollView to simplify composition.
**How to avoid:** Keep the outer vertical FlatList; use `ListHeaderComponent` for the strip. Both-direction nesting is explicitly allowed (horizontal-in-vertical vs vertical-in-vertical are distinguished by the framework).
**Warning signs:** Yellow box warning in Metro logs + occasional crash in release on Android.

### Pitfall 5: Amenity token vs translation-key mismatch

**What goes wrong:** Storing `'Wi-Fi'` (or `t('amenity.wifi')`) as the amenity value instead of the canonical token `'wifi'`.
**Why it happens:** UI shows translated labels; forgetting to dereference token → label at render time.
**How to avoid:** Store `HospitalityAmenity` tokens in `amenities: HospitalityAmenity[]` (enforced by `as const` string-literal union + tsc). Translate via `t(`amenity.${token}`)` at render time. Type narrowing blocks the mistake.
**Warning signs:** Language swap doesn't re-translate chips; or saved amenities fail to match the icon map.

### Pitfall 6: Adding new admin-gated field without using `<Gated>`

**What goes wrong:** Phase 6 touches the detail screen; someone introduces a "hospitality-specific admin toggle" using `user.backendProfile.userType === 'admin'` directly.
**Why it happens:** Copy-paste from pre-Phase-3 code in the history.
**How to avoid:** Phase 6 introduces **zero new role gates** per CONTEXT.md §specifics. Matterport / panoramic admin gates remain Phase 4's MediaSection scope — untouched here. If the temptation arises, it's out of scope.
**Warning signs:** `./scripts/check-role-grep.sh` exits non-zero.

### Pitfall 7: Widening PropertyCard to render Hospitality — regressing D-07

**What goes wrong:** A task author, seeing the HospitalityCard overlap with PropertyCard, decides "just add an `isHospitality` prop to PropertyCard."
**Why it happens:** Refactoring instinct — reduce duplication.
**How to avoid:** D-07 locks "separate HospitalityCard.tsx." The rationale (lower regression risk on 417-LOC PropertyCard; Hospitality cards are visually DIFFERENT — no price chip, no beds/baths row, tour-first hero) is captured in CONTEXT. Don't second-guess.
**Warning signs:** A pull-requests-style diff touches PropertyCard.tsx. Phase 6 should have **zero** diff in `src/components/PropertyCard.tsx`.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `lucide-react-native` | Amenity icons | ✓ | 0.564.0 | — |
| `react-native-safe-area-context` | Sticky contact bar | ✓ | 5.5.2 | — |
| React Native `Linking` | WhatsApp/Telegram/tel: URLs | ✓ | RN 0.84.0 | — |
| `react-native-keyboard-controller` | Amenity grid inside create form | ✓ | 1.21.6 (Phase 2) | — |
| Jest | Validator tests | ✓ | 29.6.3 | — |
| Xcode + Android Studio | Physical-device QA | assumed | — | (M1 testing bar per CLAUDE.md) |

No missing dependencies. Phase 6 runs fully on Phase 5's stack.

---

## Project Constraints (from CLAUDE.md)

Directives extracted — Phase 6 tasks MUST honor:

- **Custom `App.tsx` state-machine navigation.** No react-navigation. Phase 6 does not add new screens; all composition happens inside existing screens — no nav wiring needed except possibly adjusting existing nav callbacks (e.g., passing hospitality filter into Favorites).
- **React Context state pattern.** ThemeProvider → LanguageProvider → AuthProvider. Phase 6 uses `useTheme()` + `useLanguage()` hooks directly; no new providers.
- **HTTP via `axios` + Firebase Identity Toolkit.** Phase 6 touches `PropertyService.ts` (Gap 9.1) — stay within the existing axios+FormData contract.
- **EN + RU parity mandatory.** Every new UI string gets both locales + tsc `Record<TranslationKeys,string>` gate + `check-i18n-parity.sh` CI gate.
- **Theme tokens only — no hardcoded colors.** Exception: brand colors (WhatsApp green `#25D366`, Telegram blue `#0088CC`) and the PropertyCard `tour3DBadge` `#6C63FF` are Path B brownfield grandfathered; treat as precedent.
- **Testing bar: manual physical-device QA (iOS + Android).** The ~80-cell QA matrix above is the M1 exit criterion for Phase 6.
- **zod pin to `^3.24`** if adopted — not adopted in M1; no action.
- **Never rewrite nav to react-navigation** — N/A (not in scope).
- **Never add per-night pricing or booking calendars** — N/A (explicitly out of scope).

Phase 6 introduces no new guardrail violations. It CONSUMES 4 existing CI gates.

---

## Code Examples

### Example 1: ListHeaderComponent strip mount (HomeScreen tri-state)

```tsx
// src/screens/HomeScreen.tsx — after WR-03 consolidation
import {
  RESIDENTIAL_TYPES,
  COMMERCIAL_TYPES,
  HOSPITALITY_TYPES,
  propertyTypeToCategory,
  type PropertyCategory,
} from '../utils/propertyCategory';
import { HospitalityCard } from '../components/HospitalityCard';
import { HospitalitySection } from '../components/HospitalitySection';

// Inside component body:
const [selectedCategory, setSelectedCategory] = useState<PropertyCategory>('Residential');

const filteredProperties = useMemo(() => {
  return properties.filter((p) => {
    const pType = p.type?.toLowerCase();
    if (pType && pType !== transactionType) return false;
    if (propertyTypeToCategory(p.propertyType) !== selectedCategory) return false;
    if (selectedType && p.propertyType?.toLowerCase() !== selectedType.toLowerCase()) return false;
    // ... district + search unchanged ...
    return true;
  });
}, [properties, transactionType, selectedCategory, selectedType, selectedDistrict, searchQuery]);

const hospitalityProperties = useMemo(
  () => properties.filter(p =>
    propertyTypeToCategory(p.propertyType) === 'Hospitality'
    && (!p.type || p.type === transactionType)
  ),
  [properties, transactionType],
);

<FlatList
  data={filteredProperties}
  keyExtractor={(item, index) => item.id || item.listingId || `property-${index}`}
  ListHeaderComponent={
    <>
      {renderHeaderContent()}
      {selectedCategory !== 'Hospitality' && (
        <HospitalitySection
          properties={hospitalityProperties}
          onPress={handlePressProperty}
          onViewTour={handleViewTour}
          onFavorite={onFavorite}
          favoriteStatuses={favoriteStatuses}
          favoriteLoading={favoriteLoading}
        />
      )}
    </>
  }
  renderItem={({ item }) => (
    selectedCategory === 'Hospitality' ? (
      <HospitalityCard
        property={item}
        onPress={handlePressProperty}
        onViewTour={handleViewTour}
        onFavorite={onFavorite}
        isFavorited={favoriteStatuses[item.id] || false}
        isLoading={favoriteLoading[item.id] || false}
      />
    ) : (
      <PropertyCard
        property={item}
        onPress={handlePressProperty}
        onViewTour={handleViewTour}
        onViewVideo={handleViewVideo}
        onFavorite={onFavorite}
        isFavorited={favoriteStatuses[item.id] || false}
        isLoading={favoriteLoading[item.id] || false}
      />
    )
  )}
  contentContainerStyle={styles.listContent}
  showsVerticalScrollIndicator={false}
/>
```

### Example 2: HospitalityCard hero source selection

```tsx
// src/components/HospitalityCard.tsx
const heroUri =
  property.tours?.[0]?.thumbnailUrl
  || property.imageUrl
  || (property.images && property.images.length > 0 ? property.images[0] : 'https://via.placeholder.com/400');

return (
  <View style={[styles.cardContainer, { backgroundColor: colors.surface }]}>
    <TouchableOpacity activeOpacity={0.95} onPress={() => onPress(property)}>
      <View style={styles.imageWrapper}>
        <Image source={{ uri: heroUri }} style={styles.image} resizeMode="cover" />
        {/* Top-left type badge (D-09) */}
        <View style={styles.topBadges}>
          <View style={[styles.typeBadge, { backgroundColor: colors.surface }]}>
            <Text style={[styles.typeBadgeText, { color: colors.text }]}>
              {property.propertyType === 'Hostel'
                ? t('hospitality.badge.hostel')
                : t('hospitality.badge.hotel')}
            </Text>
          </View>
        </View>
        {/* Top-right actions (share + heart) — verbatim from PropertyCard */}
        <View style={styles.topRightActions}>
          {/* ... */}
        </View>
        {/* Bottom-left 3D Tour badge (D-08) — only when tours exist */}
        {property.tours && property.tours.length > 0 && (
          <View style={styles.bottomBadges}>
            <View style={[styles.mediaBadge, styles.tour3DBadge]}>
              <Text style={styles.tour3DBadgeText}>
                {property.tours.length > 1 ? '3D Tours' : '3D Tour'}
              </Text>
            </View>
          </View>
        )}
      </View>

      <View style={styles.contentContainer}>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
          {property.title} • {property.address.split(',')[1]?.trim() || 'Bishkek'}
        </Text>
        <Text style={[styles.address, { color: colors.textSecondary }]} numberOfLines={1}>
          {property.address}
        </Text>
        {/* D-10 body — rooms + maxGuests + amenity preview chips */}
        <Text style={[styles.meta, { color: colors.textSecondary }]}>
          {(property as any).rooms || 0} {t('hospitality.rooms')} · {(property as any).maxGuests || 0} {t('hospitality.maxGuests')}
        </Text>
        <View style={styles.amenityPreviewRow}>
          {(property.amenities || []).slice(0, 3).map((token) => {
            const Icon = AMENITY_ICONS[token];
            return (
              <View key={token} style={[styles.amenityPreviewChip, { backgroundColor: colors.chipBackground }]}>
                <Icon size={12} color={colors.textSecondary} />
                <Text style={[styles.amenityPreviewText, { color: colors.text }]}>
                  {t(`amenity.${token}` as TranslationKeys)}
                </Text>
              </View>
            );
          })}
          {(property.amenities?.length || 0) > 3 && (
            <View style={[styles.amenityPreviewChip, { backgroundColor: colors.chipBackground }]}>
              <Text style={[styles.amenityPreviewText, { color: colors.text }]}>
                +{(property.amenities!.length - 3)} more
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  </View>
);
```

### Example 3: Validator extension for amenity required

```ts
// src/components/CreateListingForm/validators.ts — Hospitality branch addition
} else {
  // Hospitality
  if (!values.rooms.trim()) errors.rooms = 'createListing.roomsRequired';
  if (!values.bathrooms.trim()) errors.bathrooms = 'createListing.bathroomsRequired';
  if (!values.maxGuests.trim()) errors.maxGuests = 'createListing.maxGuestsRequired';

  // NEW per D-22: at least one amenity required
  if (values.amenities.length < 1) {
    errors.amenities = 'createListing.amenitiesRequired';
  }

  // Existing hybrid contact rule — unchanged
  const phone = values.contactPhone.trim();
  const wa = values.contactWhatsapp.trim();
  const tg = values.contactTelegram.trim();
  const anyFilled = phone !== '' || wa !== '' || tg !== '';
  if (anyFilled) {
    const passes = phone !== '' && (wa !== '' || tg !== '');
    if (!passes) errors.contactPhone = 'createListing.contactMissingInline';
  }
}
```

### Example 4: Hospitality payload extension

```ts
// src/components/CreateListingForm/validators.ts — Hospitality branch in buildPayloadByCategory
return {
  ...shared,
  rooms: parseInt(values.rooms) || 0,
  bathrooms: parseInt(values.bathrooms) || 0,
  maxGuests: parseInt(values.maxGuests) || 0,
  amenities: values.amenities,  // NEW per D-22
} as Partial<Property>;
```

### Example 5: Validator test — flip existing assertion + add new

```ts
// src/components/CreateListingForm/__tests__/validators.test.ts
// EXISTING test at :370-386 — FLIP line 382:
test('Hospitality payload does NOT contain price/currency/areaSqm (D-14), DOES contain amenities (D-22)', () => {
  const values: FormBag = {
    ...makeBase(),
    propertyType: 'Hostel',
    rooms: '3',
    bathrooms: '2',
    maxGuests: '5',
    amenities: ['wifi', 'aircon'],  // ← add
  };
  const payload: Record<string, unknown> = buildPayloadByCategory(values, 'Hospitality');
  expect('price' in payload).toBe(false);
  expect('currency' in payload).toBe(false);
  expect('areaSqm' in payload).toBe(false);
  expect('amenities' in payload).toBe(true);   // ← FLIPPED from false
  expect((payload.amenities as string[]).length).toBe(2);  // ← NEW
  expect('rooms' in payload).toBe(true);
  expect('bathrooms' in payload).toBe(true);
  expect('maxGuests' in payload).toBe(true);
});

// NEW test inside describe('validateByCategory — Hospitality', ...)
test('empty amenities → errors.amenities set', () => {
  const values: FormBag = {
    ...hospitalityBase(),
    amenities: [],
  };
  const result = validateByCategory(values, 'Hospitality');
  expect(result.isValid).toBe(false);
  expect(result.errors.amenities).toBe('createListing.amenitiesRequired');
});

test('1 amenity → errors.amenities unset', () => {
  const values: FormBag = {
    ...hospitalityBase(),
    amenities: ['wifi'],
  };
  const result = validateByCategory(values, 'Hospitality');
  expect(result.errors.amenities).toBe(undefined);
});

// NEW test inside describe('buildPayloadByCategory — payload shape invariants', ...)
test('Residential payload does NOT contain amenities key (D-22)', () => {
  const values: FormBag = {
    ...makeBase(),
    propertyType: 'Apartment',
    bedrooms: '2', bathrooms: '1', areaSqm: '80', price: '1000', currency: '$',
    amenities: ['wifi'],  // even if set, Residential payload excludes
  };
  const payload: Record<string, unknown> = buildPayloadByCategory(values, 'Residential');
  expect('amenities' in payload).toBe(false);
});
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| HomeScreen binary `isCommercial` toggle | Tri-state `selectedCategory` | Phase 6 D-04 | Hospitality gets first-class filter citizenship; WR-03 local-array duplication closed |
| Local `RESIDENTIAL_TYPES` / `COMMERCIAL_TYPES` in screens | Import from `propertyCategory.ts` | Phase 6 D-24 | Single source of truth; Phase 4 taxonomy becomes the only one |
| `features: string[]` open-ended for all properties | Closed `amenities: HospitalityAmenity[]` for Hospitality (distinct from features) | Phase 6 D-20 | Forward-compat validation + typed icon mapping |
| Amenity placeholder hint (Phase 4) | Inline 12-chip multi-select grid | Phase 6 D-18 | HOSP-05 / REQUIREMENTS close-out |
| PropertyDetailsScreen category-unaware price block | Conditional render based on `propertyTypeToCategory(property.propertyType)` | Phase 6 D-15 | HOSP-04 no-price showcase rendering |
| Hybrid contact modal (Phase 5 D-11) for all categories | Sticky 3-button contact bar for Hospitality; modal stays for Residential/Commercial | Phase 6 D-16 | HOSP-04 contact prominence |

**Deprecated / outdated inside this phase's scope:**
- `hospitality.amenitiesPhase6Placeholder` i18n key — slated for removal at Wave 0 or end-of-phase (see §10).

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Backend accepts arbitrary new formData fields (`rooms`, `maxGuests`, `amenities`) without schema change [ASSUMED] | §9.1 | Hospitality create returns 400; needs schema update → Phase 6 blocks on backend coord |
| A2 | Backend echoes back `rooms` / `maxGuests` / `amenities` on GET responses [ASSUMED] | §9.1 | HospitalityCard renders `0 rooms · 0 max guests` indefinitely; amenity chips empty |
| A3 | WhatsApp green `#25D366` and Telegram blue `#0088CC` are acceptable brand-color exceptions per Path B precedent [CITED: Phase 4 04-05-SUMMARY brownfield-hex grandfather rationale] | §6 | Alignment-pass (Phase 7) may recolor |
| A4 | `lucide-react-native@0.564.0` icon set stable (no deprecations between lockfile and Phase 6 landing) [VERIFIED: `grep` of node_modules confirms all 12 icons] | §5 | None — already verified |
| A5 | `check-i18n-parity.sh` regex `[a-zA-Z.]+:` accepts the new key shape `amenity.*` / `home.hospitality*` / `hospitality.badge.*` / `createListing.amenitiesRequired` — verified (all new keys use only `[a-z.A-Z]`) [VERIFIED: WR-02 note in Phase 4 REVIEW.md] | §10 | None |
| A6 | Phase 5 validator tests (50/50 green baseline) still pass after Phase 6 FormBag narrowing (`amenities: string[]` → `HospitalityAmenity[]`) — the test file uses `string[]` literals like `['wifi', 'aircon']` which assign-compatible with `HospitalityAmenity[]` via `as const` narrowing [ASSUMED] | §Validation Architecture | Validators test breaks; fix = `['wifi', 'aircon'] as HospitalityAmenity[]` |
| A7 | Existing RefreshControl absence on the 4 screens stays stable — no scope creep [VERIFIED: grep confirms no RefreshControl on Home/Favorites/OwnerListings/RenterListings] | §1 | None |
| A8 | HomeScreen's existing `renderHeaderContent()` + header placement survives wrapping under a Fragment with the HospitalitySection sibling [ASSUMED] | §Code Example 1 | Layout regresses (header stops scrolling away); mitigation = test early on physical device |
| A9 | FormBag narrowing (D-21) does not break `CreateListingScreen.tsx:180` `onChange('amenities', value as string[])` cast — the cast becomes `value as HospitalityAmenity[]` [ASSUMED] | §Code Context D-21 | tsc error at the cast site; 1-line fix |

Claims tagged `[ASSUMED]` (A1, A2, A6, A8, A9) should be user-confirmed or early-tested. A1 and A2 are the most load-bearing — they're the Phase-6 equivalent of Phase 3's GATE-05 backend-coordination question. Recommend a 30-minute backend spike at Wave 0 to POST a test Hospitality listing and GET it back, confirming the fields round-trip. If they don't, escalate: either (a) add a backend task to Phase 6, or (b) document as accepted risk in a new `06-BACKEND-COORDINATION.md` (Phase 3 GATE-05 D-22 precedent).

---

## Open Questions (RESOLVED)

### Q1: Is the M1 Hospitality fields backend-compatible (round-trip for `rooms` / `maxGuests` / `amenities`)?

- What we know: Phase 5 `bba66fe` added a `price?.toString() || '0'` guard to let Hospitality submit succeed despite the payload omitting `price`. That proves submit doesn't 400 on missing `price`. What's UNKNOWN is whether appended `rooms` / `maxGuests` / `amenities` fields are stored and echoed back by the Railway backend.
- What's unclear: backend schema visibility — the repo has no `server/` folder (backend is a separate Railway repo). STATE.md confirms backend coordination is already a documented friction point (Phase 3 GATE-05 D-22 Path B accepted risk).
- Recommendation: 30-minute Wave 0 backend spike. POST a Hospitality listing via Insomnia / curl with `rooms=5`, `maxGuests=10`, `amenities=["wifi","aircon"]`. GET `/properties/:id`; inspect response. If those fields appear: all clear. If they don't: raise `06-BACKEND-COORDINATION.md` and escalate.
- **RESOLVED:** Ship as accepted risk per GATE-05 D-22 precedent (Path B). Plan 06-02 records the disposition in `06-02-SUMMARY.md`; if backend round-trip data shows missing fields during physical-device QA (Plan 06-07), file `06-BACKEND-COORDINATION.md` and escalate post-Phase-6 — does not gate the M1 ship.

### Q2: Does Phase 7 Alignment Pass reserve the right to recolor the Hospitality contact bar brand hexes?

- What we know: Path B brownfield grandfather applies today per Phase 4 precedent.
- What's unclear: whether screenshots from user (pending for Phase 7) call out the contact-bar coloring.
- Recommendation: ship M1 with brand hexes; tag in SUMMARY so Phase 7 verifier doesn't flag them.
- **RESOLVED:** Brand hexes (`#25D366` WhatsApp / `#0088CC` Telegram / `#10B981` phone-success / `#FFFFFF` active-chip-text / `#6C63FF` PropertyCard tour badge) ship as Path-B grandfathered for M1; Plan 06-06 SUMMARY tags them so the Phase 7 alignment-pass verifier accepts them as precedent rather than flagging.

### Q3: Does editing a Hostel listing's type to Hotel (or vice-versa) warrant category-change data preservation per FORM-07?

- What we know: FORM-07 (Phase 5) mandates that switching category during form-fill doesn't blank already-entered fields shared across categories. Hostel→Hotel is a TYPE change within the same CATEGORY (both Hospitality), so theoretically no FORM-07 concern.
- What's unclear: whether the existing FORM-07 regression test covers Hostel↔Hotel.
- Recommendation: add one QA matrix cell for "edit a Hostel, change propertyType to Hotel, verify rooms/maxGuests/amenities all preserved." If Phase 5 FORM-07 tests already cover this via `within-Hospitality type swap`, note it and move on.
- **RESOLVED:** Existing Phase-5 FORM-07 within-category type-swap behavior covers Hostel↔Hotel (same Hospitality category, no field-set mount/unmount). Plan 06-07's QA matrix Cell 9.1 (edit-rehydrate) implicitly exercises this path; no new code required.

---

## Sources

### Primary (HIGH confidence)

- [06-CONTEXT.md (this phase)](/Users/beckmaldinVL/development/mobileApps/JayTap/.planning/phases/06-hospitality-rendering/06-CONTEXT.md) — all D-01..D-24 decisions
- [REQUIREMENTS.md HOSP-01..06](/Users/beckmaldinVL/development/mobileApps/JayTap/.planning/REQUIREMENTS.md) — verbatim per-requirement specs + 12-amenity taxonomy
- [CLAUDE.md](/Users/beckmaldinVL/development/mobileApps/JayTap/CLAUDE.md) — project guardrails
- [src/utils/propertyCategory.ts](/Users/beckmaldinVL/development/mobileApps/JayTap/src/utils/propertyCategory.ts) — Phase 4 taxonomy (HOSPITALITY_TYPES, propertyTypeToCategory)
- [src/components/CreateListingForm/validators.ts](/Users/beckmaldinVL/development/mobileApps/JayTap/src/components/CreateListingForm/validators.ts) — Phase 5 validator (extend sites in §Example 3)
- [src/components/CreateListingForm/__tests__/validators.test.ts](/Users/beckmaldinVL/development/mobileApps/JayTap/src/components/CreateListingForm/__tests__/validators.test.ts) — 445 LOC Jest test baseline
- [src/components/CreateListingForm/HospitalitySection.tsx](/Users/beckmaldinVL/development/mobileApps/JayTap/src/components/CreateListingForm/HospitalitySection.tsx) — placeholder hint at :100-102 (replace target)
- [src/components/PropertyCard.tsx](/Users/beckmaldinVL/development/mobileApps/JayTap/src/components/PropertyCard.tsx) — 417 LOC HospitalityCard analog
- [src/screens/PropertyDetailsScreen.tsx](/Users/beckmaldinVL/development/mobileApps/JayTap/src/screens/PropertyDetailsScreen.tsx) — 1684 LOC branch target (handlers at :244-329; price block at :752-755; feature grid at :602-618)
- [src/screens/HomeScreen.tsx](/Users/beckmaldinVL/development/mobileApps/JayTap/src/screens/HomeScreen.tsx) — WR-03 target at :48-49, filter logic at :112-174
- [src/services/PropertyService.ts](/Users/beckmaldinVL/development/mobileApps/JayTap/src/services/PropertyService.ts) — Gap 9.1 target
- [src/components/BottomNavigator.tsx](/Users/beckmaldinVL/development/mobileApps/JayTap/src/components/BottomNavigator.tsx) — `useSafeAreaInsets()` precedent for sticky bar
- [src/types/Property.ts](/Users/beckmaldinVL/development/mobileApps/JayTap/src/types/Property.ts) — D-20 target
- `node_modules/lucide-react-native/dist/icons.d.ts` — icon availability verification
- `package.json` — dep version pinning [VERIFIED: 2026-04-24]
- commit `bba66fe` (git) — Phase 5 Hospitality price guard precedent

### Secondary (MEDIUM confidence)

- [React Native FlatList docs](https://reactnative.dev/docs/flatlist) — ListHeaderComponent + nested horizontal pattern [CITED]
- Phase 4 `04-REVIEW.md` — WR-02 (i18n parity regex narrowness), WR-03 (HomeScreen local-array ownership)
- Phase 5 `05-CONTEXT.md` — D-09 hybrid contact rule, D-13/14/15 hospitality carry-forward

### Tertiary (LOW confidence)

- None — no WebSearch-only claims in this research.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — every dep verified in `package.json` + node_modules; zero new deps needed
- Architecture patterns: HIGH — mirrors Phase 4 / Phase 5 precedents locked in CONTEXT
- Pitfalls: HIGH — pitfalls drawn from Phase 3/4/5 verified invariants + actual code paths
- Hidden gaps (§9): HIGH — verified via direct code grep; PropertyService + rehydrate gaps are concrete
- Backend round-trip assumption (A1/A2): MEDIUM — relies on Phase 5 precedent but not directly verified for Phase 6 fields

**Research date:** 2026-04-24
**Valid until:** 2026-05-24 (stable stack; most sensitive item is the backend round-trip verification which should happen at Wave 0)

---

## RESEARCH COMPLETE

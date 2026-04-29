# Phase 6: Hospitality Rendering — Pattern Map

**Mapped:** 2026-04-24
**Files analyzed:** 14 (3 net-new, 11 modified)
**Analogs found:** 14 / 14 (every file has at least one in-repo analog — Phase 6 is composition over existing primitives)

> Read alongside `06-CONTEXT.md` (D-01..D-24), `06-RESEARCH.md` (§1-§10 + Hidden Gaps 9.1-9.4), and `06-UI-SPEC.md` (token/typography/spacing contract). This file lifts the concrete code excerpts the planner copies into per-task action sections.

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/utils/hospitalityAmenities.ts` (NEW) | utility / taxonomy | transform (token → label/icon) | `src/utils/propertyCategory.ts` | exact |
| `src/components/HospitalityCard.tsx` (NEW) | component (presentational card) | request-response (tap → onPress) | `src/components/PropertyCard.tsx` | exact (same role + same flow; D-07 mandates a copy not a variant) |
| `src/components/HospitalitySection.tsx` (NEW) | component (list section / strip) | request-response (horizontal FlatList) | `src/screens/FavoritesScreen.tsx` `<FlatList ListHeaderComponent>` pattern + RESEARCH §1 recipe | role-match (no existing horizontal-strip-as-ListHeaderComponent yet) |
| `src/screens/HomeScreen.tsx` (MOD) | screen | request-response + filter state machine | self (existing `useMemo` filter at :112-174) | self-extension |
| `src/screens/FavoritesScreen.tsx` (MOD) | screen | request-response | self (existing `<FlatList ListHeaderComponent={renderHeader}>` at :144) | self-extension |
| `src/screens/RenterListingsScreen.tsx` (MOD — Gap 9.3) | screen (My Listings) | request-response | self (existing `<FlatList ListHeaderComponent={renderHeader}>` at :175) | self-extension |
| `src/screens/OwnerListingsScreen.tsx` (MOD — Gap 9.3) | screen (landlord listings view) | request-response | self (existing `<FlatList ListHeaderComponent={renderHeader}>` at :131) | self-extension |
| `src/screens/PropertyDetailsScreen.tsx` (MOD) | screen (1684 LOC; in-place branch) | request-response | self (existing handlers at :244-329; price block at :752-755; feature grid at :602-618) | self-extension via category derivation |
| `src/screens/CreateListingScreen.tsx` (MOD — Gap 9.2) | screen (form orchestrator) | request-response | self (rehydrate `useEffect` at :237-310; `useState` for amenities at :111) | self-extension |
| `src/components/CreateListingForm/HospitalitySection.tsx` (MOD) | form sub-component | request-response (chip toggle) | `src/components/CreateListingForm/PriceSection.tsx` (currency chip row pattern) | exact |
| `src/components/CreateListingForm/types.ts` (MOD) | type module | (data) | self (existing `Currency` narrowing precedent at :36) | self-extension |
| `src/components/CreateListingForm/validators.ts` (MOD) | utility (pure validator + payload builder) | transform | self (existing Hospitality branch at :118-135 + :188-194) | self-extension |
| `src/components/CreateListingForm/__tests__/validators.test.ts` (MOD) | test | (test) | self (existing `describe('validateByCategory — Hospitality', ...)` at :216-333 + payload test at :370-386) | self-extension |
| `src/services/PropertyService.ts` (MOD — Gap 9.1) | service | CRUD (HTTP `multipart/form-data`) | self (existing `formData.append` block at :60-93 in `createProperty` and :126-160 in `updateProperty`) | self-extension |
| `src/types/Property.ts` (MOD) | type module | (data) | self (existing optional fields like `availableDate?`, `panoramicPhotosUrl?`) | self-extension |
| `src/locales/en.ts` + `src/locales/ru.ts` (MOD) | i18n | (data) | self (existing `hospitality.*` cluster at :282-289 EN / :286-291 RU) | self-extension |

---

## Pattern Assignments

### `src/utils/hospitalityAmenities.ts` (utility / taxonomy) — NEW

**Analog:** `src/utils/propertyCategory.ts` — exact shape match per D-19.

**Module header / convention pattern** (`src/utils/propertyCategory.ts:1-11`):
```typescript
/**
 * propertyCategory — Single source of truth for mapping propertyType → category.
 *
 * Phase 4 (FORM-01/02/03): introduces the three-category taxonomy
 * (Residential / Commercial / Hospitality) and exposes the canonical
 * PROPERTY_TYPES list. Consumers: CreateListingScreen chip UI, Phase 5
 * validateByCategory, Phase 6 HomeScreen Hospitality filter.
 *
 * Convention: matches src/utils/passwordPolicy.ts shape (named exports,
 * pure fn, no React imports, no side effects).
 */
```
Phase 6 file mirrors this header, swapping "category" for "amenities" and naming the consumers (HospitalitySection picker, HospitalityCard preview chips, PropertyDetailsScreen amenity grid).

**`as const` string-literal-union pattern** (`src/utils/propertyCategory.ts:16-21`):
```typescript
export const PROPERTY_TYPES = [
  'Apartment', 'House', 'Townhome', 'Condo',        // Residential
  'Office', 'Retail', 'Warehouse', 'Industrial',    // Commercial
  'Hostel', 'Hotel',                                 // Hospitality
] as const;
export type PropertyType = (typeof PROPERTY_TYPES)[number];
```
Reproduce verbatim with `HOSPITALITY_AMENITIES` and `HospitalityAmenity` per D-19. Same `as const` narrowing — same enforcement story.

**Record-typed lookup pattern** (`src/utils/propertyCategory.ts:30-41`):
```typescript
export const PROPERTY_TYPE_TO_CATEGORY: Record<PropertyType, PropertyCategory> = {
  Apartment: 'Residential',
  House: 'Residential',
  // ...
  Hostel: 'Hospitality',
  Hotel: 'Hospitality',
};
```
Apply to `AMENITY_ICONS: Record<HospitalityAmenity, LucideIcon>` per RESEARCH §5 — same `Record<TypedKey, Value>` shape. Imports source from `lucide-react-native` (already in stack).

**No imports beyond types/icons; no React; no side effects** — utility-module convention from CONVENTIONS.md row 12.

---

### `src/components/HospitalityCard.tsx` (component, request-response) — NEW

**Analog:** `src/components/PropertyCard.tsx` (417 LOC). D-07 mandates separate file, NOT variant prop.

**Imports pattern** (`src/components/PropertyCard.tsx:1-20`):
```typescript
import React from 'react';
import {
  View, Text, Image, StyleSheet, TouchableOpacity, Dimensions, Platform, Share, ActivityIndicator,
} from 'react-native';
import { Heart, Bed, Bath, Pencil, Trash2 } from 'lucide-react-native';
import { Property } from '../types/Property';
import { getPropertyShareUrl } from '../constants';
import { formatPrice } from '../utils/formatPrice';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { ListingMetaTable } from './ListingMetaTable';
```
Hospitality version: drop `Bed`, `Bath`, `formatPrice`, `ListingMetaTable` (D-10 — no price chip, no beds/baths/sqm row). Add `import { AMENITY_ICONS, HospitalityAmenity } from '../utils/hospitalityAmenities'` and `import type { TranslationKeys } from '../locales'`.

**Props contract pattern** (`src/components/PropertyCard.tsx:22-34`):
```typescript
interface PropertyCardProps {
  property: Property;
  onPress: (property: Property) => void;
  onViewTour: (property: Property) => void;
  onViewVideo: (property: Property) => void;
  onEdit?: (property: Property) => void;
  showEditButton?: boolean;
  onDelete?: (property: Property) => void;
  onShare?: (property: Property) => void;
  onFavorite?: (property: Property) => void;
  isFavorited?: boolean;
  isLoading?: boolean;
}
```
HospitalityCard mirrors this 1:1 except drop `onViewVideo` (RESEARCH §2 — Hospitality cards are tour-emphasis). All other prop shapes preserved so caller code at HomeScreen / Favorites / RenterListings / OwnerListings is interchangeable.

**Component declaration + destructured defaults** (`src/components/PropertyCard.tsx:38-50`):
```typescript
export const PropertyCard: React.FC<PropertyCardProps> = ({
  property,
  onPress,
  onViewTour,
  onViewVideo,
  onEdit,
  showEditButton = false,
  onDelete,
  onShare,
  onFavorite,
  isFavorited = false,
  isLoading = false,
}) => {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const { t } = useLanguage();
```
Reproduce structure for HospitalityCard (drop `useAuth` if owner-context derivation moves to caller via `showEditButton` — Pitfall 1 in RESEARCH).

**Share handler with no-price branch (D-11)** — adapt from `src/components/PropertyCard.tsx:55-81`:
```typescript
const handleShare = async (e: any) => {
  e.stopPropagation();
  const propertyId = property.id || property.listingId || '';
  const shareUrl = getPropertyShareUrl(propertyId);
  const priceText = formatPrice(property, t('property.perMonth'));
  const shareMessage = `${property.title}\n${property.address}\n${priceText}\n\n${shareUrl}`;
  try {
    const result = await Share.share({ message: shareMessage, url: shareUrl, title: property.title });
    // ...
  } catch (error: any) {
    console.error('Error sharing:', error.message);
  }
};
```
Hospitality version drops the `priceText` line and the `formatPrice` call entirely:
```typescript
const shareMessage = `${property.title}\n${property.address}\n\n${shareUrl}`;
```
Per D-11 + RESEARCH §2 recommendation (inline; only 2 share call sites — below the extraction threshold).

**Hero image + top-left badge + top-right actions pattern** (`src/components/PropertyCard.tsx:83-130`):
```tsx
return (
  <View style={[styles.cardContainer, { backgroundColor: colors.surface }]}>
    <TouchableOpacity activeOpacity={0.95} onPress={() => onPress(property)}>
      <View style={styles.imageWrapper}>
        <Image
          source={{ uri: property.imageUrl || (property.images && property.images.length > 0 ? property.images[0] : 'https://via.placeholder.com/400') }}
          style={styles.image}
          resizeMode="cover"
        />
        <View style={styles.topBadges}>
          <View style={[styles.badge, styles.statusBadge]}>
            <Text style={styles.statusText}>
              {property.type === 'rent' ? t('property.forRent') : t('property.forSale')}
            </Text>
          </View>
        </View>
        <View style={styles.topRightActions}>
          <TouchableOpacity style={[styles.shareButton, { backgroundColor: 'rgba(255,255,255,0.9)' }]} onPress={handleShare} ...>
            <Text style={{ fontSize: 18, color: '#333' }}>↗</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.heartButton, { backgroundColor: 'rgba(255,255,255,0.9)' }]}
            onPress={(e) => { e.stopPropagation(); if (onFavorite && !isLoading) onFavorite(property); }}
            ...>
            {isLoading ? <ActivityIndicator ... /> : <Heart size={18} color={isFavorited ? '#E91E63' : '#999'} fill={...} />}
          </TouchableOpacity>
        </View>
        {/* ...bottomBadges currently commented out at :132-145 — ACTIVATE in HospitalityCard */}
      </View>
```

**For HospitalityCard:**
1. **Source selection (D-08)** — replace the `Image source` line with:
   ```typescript
   const heroUri = property.tours?.[0]?.thumbnailUrl
     || property.imageUrl
     || (property.images && property.images.length > 0 ? property.images[0] : 'https://via.placeholder.com/400');
   ```
2. **Type badge (D-09)** — replace `statusBadge` content with `t('hospitality.badge.hostel')` / `t('hospitality.badge.hotel')` per `property.propertyType`. Use `colors.surface` background + `colors.text` foreground per UI-SPEC §Color (NOT accent).
3. **3D Tour bottom-left (D-08)** — uncomment+activate `bottomBadges` block from `:132-145` BUT change `right: 16` → `left: 16` per UI-SPEC §HospitalityCard slot table. Reuse `tour3DBadge` + `tour3DBadgeText` styles verbatim from `:300-315` (the `#6C63FF` brand hex is grandfathered Path B).

**Owner edit/delete chrome pattern** (`src/components/PropertyCard.tsx:172-203` — preserve verbatim per D-12):
```tsx
{showEditButton ? (
  <View style={styles.ownerActionsRow}>
    {onEdit && (
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={t('common.edit')}
        style={[styles.listingActionBtnIcon, styles.listingActionBtnEdit, { backgroundColor: ..., borderColor: colors.border }]}
        onPress={() => onEdit(property)}
        activeOpacity={0.75}
      >
        <Pencil size={19} color={isDark ? '#111827' : colors.text} strokeWidth={2} />
      </TouchableOpacity>
    )}
    {onDelete && (
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={t('common.delete')}
        style={[styles.listingActionBtnIcon, styles.listingActionBtnDelete]}
        onPress={() => onDelete(property)}
        activeOpacity={0.8}
      >
        <Trash2 size={19} color="#FFFFFF" strokeWidth={2} />
      </TouchableOpacity>
    )}
  </View>
) : (
  <View style={[styles.specsContainer, ...]}> {/* DROP for HospitalityCard — D-10 no specs */} </View>
)}
```
Hospitality version uses the `showEditButton` prop pattern UNCHANGED — caller decides owner-context (Pitfall 1: NEVER inline `userType === 'admin'` check; the role-grep CI gate must stay green).

**StyleSheet patterns to reuse verbatim** (`src/components/PropertyCard.tsx:224-417`):
- `cardContainer` :224-231 (radius 24, marginVertical 12, marginHorizontal 0 — caller passes for strip vs stack)
- `imageWrapper` :232-238 (height 250 → **OVERRIDE to 200 for hospitality strip per UI-SPEC §Spacing**)
- `topBadges` :243-247
- `topRightActions` :263-269
- `shareButton` / `heartButton` :270-283
- `bottomBadges` :284-290 (with `left: 16` override per UI-SPEC)
- `tour3DBadge` :300-309 + `tour3DBadgeText` :310-315 (verbatim — Path B grandfathered)
- `contentContainer` :316-320, `title` :324-329 (Georgia/serif), `address` :330-332
- `listingActionBtnIcon` / `listingActionBtnEdit` / `listingActionBtnDelete` :382-411 (verbatim)
- DROP: `mainInfo`, `specsContainer`, `specItem`, `specValue`, `specDivider`, `price`, `contactButton`, `contactButtonText` — Hospitality has no price/specs row.
- ADD: `meta` (rooms+maxGuests row, 13/500 sans, `colors.textSecondary`), `amenityPreviewRow` (flex-row gap 6), `amenityPreviewChip` (chipBackground bg, padding 4/8, radius 12), `amenityPreviewText` (11/500), `typeBadge` + `typeBadgeText` (colors.surface bg, 11/600). Per UI-SPEC §Component Visual Contracts.

**Card horizontal-strip width (RESEARCH §2 + UI-SPEC):** `cardContainer.width = 280` (override marginHorizontal 0 when used in strip).

---

### `src/components/HospitalitySection.tsx` (component, list strip) — NEW

**Analog:** No existing horizontal-strip-as-ListHeaderComponent in the repo. The closest analogs are RESEARCH §1's recipe + the `<FlatList horizontal>` patterns in `PropertyDetailsScreen.tsx:445-454` (image carousel) for the inner list shape.

**Hide-when-empty pattern** (per RESEARCH §1 — verbatim):
```tsx
export function HospitalitySection({ properties, ...handlers }: HospitalitySectionProps) {
  const { t } = useLanguage();
  const { colors } = useTheme();
  if (properties.length === 0) return null;  // HOSP-01 hidden-when-empty (D-01)
  return ( /* header + horizontal FlatList */ );
}
```

**Header + count chip pattern** — reuse the chip vocabulary from `commonStyles.chip` shape. Header `Text` typography from UI-SPEC: title 18/700 sans `colors.text`; count chip 13/600 `colors.text` on `colors.chipBackground`.

**Horizontal FlatList shape** (mirror `PropertyDetailsScreen.tsx:445-454` carousel):
```tsx
<FlatList
  horizontal
  showsHorizontalScrollIndicator={false}
  data={properties}
  keyExtractor={(item, idx) => item.id || item.listingId || `hosp-${idx}`}
  renderItem={({ item }) => (
    <HospitalityCard property={item} ...handlers />
  )}
  removeClippedSubviews={Platform.OS === 'android'}
  contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}
/>
```
`keyExtractor` form lifted from `src/screens/HomeScreen.tsx` analog (existing FlatList) — `item.id || item.listingId || \`property-${index}\``.

**Props contract** — RESEARCH §1:
```typescript
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
Strip itself does NOT filter — caller filters. Keeps the component pure; same prop shape works on Home / Favorites / Renter / Owner screens.

---

### `src/screens/HomeScreen.tsx` (screen, filter state machine) — MOD

**Analog:** Self. Phase 6 promotes binary `isCommercial` (`:78`) → tri-state `selectedCategory`, deletes the local arrays at `:48-49` (WR-03 close — D-24), and rewires the filter loop at `:112-174`.

**Imports — current** (`src/screens/HomeScreen.tsx:1-50`):
```typescript
const RESIDENTIAL_TYPES = ['Apartment', 'House', 'Townhome', 'Condo'];          // :48 — DELETE
const COMMERCIAL_TYPES = ['Office', 'Retail', 'Warehouse', 'Industrial'];        // :49 — DELETE
```
**Replace with import from canonical util:**
```typescript
import {
  RESIDENTIAL_TYPES,
  COMMERCIAL_TYPES,
  HOSPITALITY_TYPES,
  propertyTypeToCategory,
  type PropertyCategory,
} from '../utils/propertyCategory';
import { HospitalityCard } from '../components/HospitalityCard';
import { HospitalitySection } from '../components/HospitalitySection';
```

**State diff** (`:77-79`):
```typescript
// BEFORE
const [transactionType, setTransactionType] = useState<'rent' | 'sale'>('rent');
const [isCommercial, setIsCommercial] = useState(false);                          // DELETE
const [selectedType, setSelectedType] = useState<string | null>(null);

// AFTER (D-04)
const [transactionType, setTransactionType] = useState<'rent' | 'sale'>('rent');
const [selectedCategory, setSelectedCategory] = useState<PropertyCategory>('Residential');
const [selectedType, setSelectedType] = useState<string | null>(null);
```

**Filter loop pattern — current** (`:112-174`):
```typescript
const filteredProperties = useMemo(() => {
  return properties.filter((p) => {
    const pType = p.type?.toLowerCase();
    if (pType && pType !== transactionType) return false;
    const pPropertyType = p.propertyType?.toLowerCase() || 'apartment';
    const isPropCommercial = COMMERCIAL_TYPES.some(t => t.toLowerCase() === pPropertyType);   // REPLACE
    if (isCommercial) {
      if (!isPropCommercial) return false;
    } else {
      if (isPropCommercial) return false;
    }
    if (selectedType) {
      if (pPropertyType !== selectedType.toLowerCase()) return false;
    }
    // ...district + search unchanged...
    return true;
  });
}, [properties, transactionType, isCommercial, selectedType, selectedDistrict, searchQuery]);
```

**Replace with category-aware filter (D-04 / D-24)** — RESEARCH §4 + Code Example 1:
```typescript
const filteredProperties = useMemo(() => {
  return properties.filter((p) => {
    const pType = p.type?.toLowerCase();
    if (pType && pType !== transactionType) return false;
    if (propertyTypeToCategory(p.propertyType) !== selectedCategory) return false;
    if (selectedType) {
      if (p.propertyType?.toLowerCase() !== selectedType.toLowerCase()) return false;
    }
    // ...district + search unchanged...
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
```
**Pitfall 2** (RESEARCH): `hospitalityProperties` MUST be derived from the transactionType-aware split, not from raw `properties` — strip count must change when toggling Rent/Sell.

**ListHeaderComponent + renderItem dispatch (RESEARCH §1, Code Example 1):**
```tsx
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
      <HospitalityCard property={item} onPress={handlePressProperty} onViewTour={handleViewTour} onFavorite={onFavorite} isFavorited={favoriteStatuses[item.id] || false} isLoading={favoriteLoading[item.id] || false} />
    ) : (
      <PropertyCard property={item} onPress={handlePressProperty} onViewTour={handleViewTour} onViewVideo={handleViewVideo} onFavorite={onFavorite} isFavorited={favoriteStatuses[item.id] || false} isLoading={favoriteLoading[item.id] || false} />
    )
  )}
  contentContainerStyle={styles.listContent}
  showsVerticalScrollIndicator={false}
/>
```

**Chip-row pattern for tri-state category toggle (D-04):** Reuse the existing `commonStyles.chip` vocabulary — but HomeScreen has its own local chip styling at `:370-428` (the property-type chips). Two-step diff:
1. Insert a new 3-chip row (`Residential | Commercial | Hospitality`) above the type chips.
2. Branch the type-chips data source on `selectedCategory`:
   ```typescript
   const chipTypes = selectedCategory === 'Hospitality'
     ? HOSPITALITY_TYPES
     : selectedCategory === 'Commercial' ? COMMERCIAL_TYPES : RESIDENTIAL_TYPES;
   ```
Use `colors.accent` background + `'#FFFFFF'` text on the selected chip, `colors.chipBackground` + `colors.text` on inactive — UI-SPEC §HomeScreen tri-state.

---

### `src/screens/FavoritesScreen.tsx` (screen) — MOD

**Analog:** Self (existing `<FlatList ListHeaderComponent={renderHeader}>` at `:144`). Per D-06: same pattern, NO tri-state toggle.

**Existing FlatList pattern** (`src/screens/FavoritesScreen.tsx:139-161`):
```tsx
<FlatList
  style={styles.list}
  data={properties}
  keyExtractor={(item) => item.id || Math.random().toString()}
  renderItem={renderPropertyItem}
  ListHeaderComponent={renderHeader}        // ← extend this
  ListEmptyComponent={ /* ... */ }
  contentContainerStyle={[styles.listContent, properties.length === 0 && styles.listContentWhenEmpty]}
  showsVerticalScrollIndicator={false}
/>
```

**Phase 6 diff** — extend `ListHeaderComponent` to a fragment that renders header AND the strip:
```tsx
const hospitalityProperties = useMemo(
  () => properties.filter(p => propertyTypeToCategory(p.propertyType) === 'Hospitality'),
  [properties],
);
const residentialProperties = useMemo(
  () => properties.filter(p => propertyTypeToCategory(p.propertyType) !== 'Hospitality'),
  [properties],
);

<FlatList
  data={residentialProperties}                 // exclude hospitality from vertical list — strip owns them
  keyExtractor={...}
  renderItem={renderPropertyItem}
  ListHeaderComponent={
    <>
      {renderHeader()}
      <HospitalitySection
        properties={hospitalityProperties}
        onPress={handlePressProperty}
        onViewTour={handleViewTour}
        onFavorite={handleFavorite}
        favoriteStatuses={favoriteStatuses}
        favoriteLoading={favoriteLoading}
      />
    </>
  }
  ...
/>
```
**No tri-state on Favorites** (D-06) — strip is always at top when populated; vertical list is residential/commercial-only.

---

### `src/screens/RenterListingsScreen.tsx` (My Listings — Gap 9.3) — MOD

**Analog:** Self (`:171-188` FlatList) AND Favorites pattern above. Differs in passing owner-context props (`showEditButton={true}`, `onEdit={onEditProperty}`, `onDelete={handleDeleteProperty}`).

**Existing render** (`src/screens/RenterListingsScreen.tsx:136-153`):
```tsx
const renderPropertyItem = ({ item }: { item: Property }) => (
  <View style={styles.propertyWrapper}>
    <View style={[styles.statusBadge, ...]}>
      <Text style={[styles.statusText, ...]}>{formatStatus((item as any).status || 'draft')}</Text>
    </View>
    <PropertyCard
      property={item}
      onPress={handlePressProperty}
      onViewTour={handleViewTour}
      onViewVideo={handleViewVideo}
      onEdit={onEditProperty}
      onDelete={handleDeleteProperty}
      showEditButton={true}
    />
  </View>
);
```

**Phase 6 diff** — split data source + mount strip with `showEditButton={true}`:
```tsx
const hospitalityProperties = useMemo(
  () => properties.filter(p => propertyTypeToCategory(p.propertyType) === 'Hospitality'),
  [properties],
);
const otherProperties = useMemo(
  () => properties.filter(p => propertyTypeToCategory(p.propertyType) !== 'Hospitality'),
  [properties],
);

<FlatList
  data={otherProperties}
  ListHeaderComponent={
    <>
      {renderHeader()}
      <HospitalitySection
        properties={hospitalityProperties}
        onPress={handlePressProperty}
        onViewTour={handleViewTour}
        onEdit={onEditProperty}
        onDelete={handleDeleteProperty}
        showEditButton={true}              // ← owner context
      />
    </>
  }
  ...
/>
```
The `showEditButton={true}` cascade flows through `HospitalitySection` → `HospitalityCard`'s edit/delete chrome (per Pattern Assignment for HospitalityCard above).

---

### `src/screens/OwnerListingsScreen.tsx` (landlord-listings view — Gap 9.3) — MOD

**Analog:** Self (`:127-141`). Same shape as RenterListings minus owner-context (viewer can't edit landlord's listings).

**Phase 6 diff** — same as RenterListings pattern but WITHOUT `showEditButton` / `onEdit` / `onDelete` (Pitfall 1: do NOT inline role check — owner-context is conveyed by the caller).

---

### `src/screens/PropertyDetailsScreen.tsx` (1684 LOC, in-place branch — D-13..D-17, D-23) — MOD

**Analog:** Self. RESEARCH §3 specifies in-place conditional pattern (Phase 4 Plan 04-06 orchestrator precedent — derive `category` near top of component).

**Category derivation pattern** — insert near `:181`:
```typescript
const [property, setProperty] = useState<Property>(initialProperty);
const category = propertyTypeToCategory(property.propertyType);     // NEW (D-13)
const isHospitality = category === 'Hospitality';
```
Add `import { propertyTypeToCategory } from '../utils/propertyCategory';` and `import { AMENITY_ICONS, HospitalityAmenity } from '../utils/hospitalityAmenities';` to top of file.

**Existing handler pattern (REUSE — DO NOT REWRITE)** (`src/screens/PropertyDetailsScreen.tsx:244-329`):

`handleWhatsApp` (`:244-270`) — already implements `whatsapp://send?phone=...` with `tel:` fallback:
```typescript
const handleWhatsApp = () => {
  const owner = (property as any).owner;
  if (!owner?.whatsapp) { Alert.alert(t('common.error'), t('error.noWhatsApp')); return; }
  const cleanPhone = owner.whatsapp.replace(/\D/g, '');
  const message = `Hi, I'm interested in your property: ${property.title}`;
  const whatsappUrl = `whatsapp://send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`;
  Linking.canOpenURL(whatsappUrl).then(supported => supported ? Linking.openURL(whatsappUrl) : Linking.openURL(`tel:${owner.whatsapp}`)).catch(...);
};
```

`handleTelegram` (`:272-298`) — `https://t.me/{username}?text=...` web URL with `tg://resolve?domain=` fallback.

`handlePhone` (`:317-329`) — `tel:${cleanPhone}` with error alert.

Per D-16 + RESEARCH §6, the new `HospitalityContactBar` reuses these three handlers UNCHANGED.

**Existing tour rendering position** (`:476-487`):
```tsx
<View style={styles.mediaButtonsContainer}>
  <TourHeroCard
    isActive={!!(property.is3DTourAvailable && property.tours.length > 0)}
    tourCount={property.tours.length}
    isDark={isDark}
    inputBackground={colors.inputBackground}
    textSecondary={colors.textSecondary}
    borderColor={colors.border}
    onPress={onOpenTours}
  />
  <View style={styles.mediaGrid}> {/* Instagram/Photos/Videos/Message — unchanged */} </View>
</View>
```

**D-14 branch (tour-promote ABOVE gallery for Hospitality)** — RESEARCH §3 Branch Point 1:
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
  <View style={styles.carouselContainer}>{/* existing carousel */}</View>
  <View style={styles.contentContainer}>
    <View style={styles.mediaButtonsContainer}>
      {!isHospitality && (
        <TourHeroCard ... />          // existing residential position
      )}
      <View style={styles.mediaGrid}>{/* unchanged */}</View>
    </View>
    ...
  </View>
</ScrollView>
```

**D-15 branch (price block removal)** — `:752-755`:
```tsx
// BEFORE
<View style={styles.priceContainer}>
  <Text style={[styles.priceLabel, { color: colors.textSecondary }]}>{t('property.price')}</Text>
  <Text style={[styles.footerPrice, { color: colors.text }]}>{formatPrice(property, t('property.perMonth'))}</Text>
</View>

// AFTER
{!isHospitality && (
  <View style={styles.priceContainer}>
    <Text style={[styles.priceLabel, { color: colors.textSecondary }]}>{t('property.price')}</Text>
    <Text style={[styles.footerPrice, { color: colors.text }]}>{formatPrice(property, t('property.perMonth'))}</Text>
  </View>
)}
```
Per D-15: NO placeholder, NO "contact for pricing" filler — slot is gone.

**D-16 sticky contact bar** — RESEARCH §6 + UI-SPEC §HospitalityContactBar. Pattern (insert just inside the `<SafeAreaView>` root before the closing tag, OR as conditional sibling under the existing `<View style={styles.footer}>` block at `:749`):
```tsx
const insets = useSafeAreaInsets();
const owner = (property as any).owner;
const hasWhatsApp = !!owner?.whatsapp;
const hasTelegram = !!owner?.telegram;
const hasPhone = !!owner?.phone;

{isHospitality && (
  <View style={[
    styles.hospitalityContactBar,
    {
      backgroundColor: colors.surface,
      borderTopColor: colors.border,
      paddingBottom: Math.max(insets.bottom, 12),
    },
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
    {/* Telegram + Phone follow same pattern with #0088CC and #10B981 brand colors */}
  </View>
)}
```
Add `import { useSafeAreaInsets } from 'react-native-safe-area-context';` — already imported via `SafeAreaView` at `:20`, so split the import to add `useSafeAreaInsets`. The brand hexes `#25D366` / `#0088CC` / `#10B981` are Path B grandfathered (precedent: existing contact-modal at `:918-947` per RESEARCH §6).

**Safe-area inset pattern** — `src/components/BottomNavigator.tsx:29-30` (analog):
```typescript
const insets = useSafeAreaInsets();
const bottomInset = Platform.OS === 'android' ? Math.max(insets.bottom, 16) : Math.max(insets.bottom, 8);
```
Hospitality contact bar uses `Math.max(insets.bottom, 12)` per UI-SPEC §HospitalityContactBar — slightly larger floor than BottomNavigator since it's a single-purpose bar.

**D-23 branch (amenity chip grid replaces features grid)** — `:602-618`:
```tsx
// BEFORE — features grid
<View style={styles.section}>
  <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('property.whatThisPlaceOffers')}</Text>
  <View style={[styles.sectionContentBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
    <View style={styles.featuresGrid}>
      {property.features.map((feature, index) => {
        const IconComponent = getFeatureIcon(feature);
        return (
          <View key={index} style={styles.featureItem}>
            <IconComponent size={20} color={colors.textSecondary} />
            <Text style={[styles.featureItemText, { color: colors.text }]}>{feature}</Text>
          </View>
        );
      })}
    </View>
  </View>
</View>

// AFTER — branch on isHospitality
{isHospitality ? (
  (property.amenities ?? []).length > 0 && (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('hospitality.amenities')}</Text>
      <View style={[styles.sectionContentBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.featuresGrid}>
          {(property.amenities || []).map((token) => {
            const Icon = AMENITY_ICONS[token] ?? Check;
            return (
              <View key={token} style={styles.featureItem}>
                <Icon size={20} color={colors.textSecondary} />
                <Text style={[styles.featureItemText, { color: colors.text }]}>
                  {t(`amenity.${token}` as TranslationKeys)}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    </View>
  )
) : (
  <View style={styles.section}>{/* existing features grid — unchanged */}</View>
)}
```
Reuses existing `styles.section`, `styles.sectionTitle`, `styles.sectionContentBox`, `styles.featuresGrid`, `styles.featureItem`, `styles.featureItemText` — verbatim. Only the data source + label translation switches.

---

### `src/screens/CreateListingScreen.tsx` (form orchestrator — Gap 9.2 + D-21) — MOD

**Analog:** Self. Existing rehydrate `useEffect` at `:237-310`.

**Type narrowing (D-21)** — `:111`:
```typescript
// BEFORE
const [amenities, setAmenities] = useState<string[]>([]);

// AFTER
const [amenities, setAmenities] = useState<HospitalityAmenity[]>([]);
```
Add `import { HOSPITALITY_AMENITIES, type HospitalityAmenity } from '../utils/hospitalityAmenities';`.

`onChange` cast at `:180`:
```typescript
// BEFORE
case 'amenities': setAmenities(value as string[]); break;

// AFTER
case 'amenities': setAmenities(value as HospitalityAmenity[]); break;
```

**Rehydrate pattern** — current rehydrate handles Residential/Commercial via `propertyToEdit.specs?.beds` etc. (`:274-276`), but NEVER calls `setRooms` / `setMaxGuests` / `setAmenities` (Gap 9.2). Insert 3 lines inside the `if (propertyToEdit)` block (recommended position: after `setAreaSqm(propertyToEdit.specs?.sqft?.toString() || '');` at `:276`):
```typescript
setRooms((propertyToEdit as any).rooms?.toString() || '');                           // NEW (Gap 9.2)
setMaxGuests((propertyToEdit as any).maxGuests?.toString() || '');                   // NEW (Gap 9.2)
setAmenities(((propertyToEdit as any).amenities || []) as HospitalityAmenity[]);     // NEW (Gap 9.2)
```
**WARNING (Phase 4 D-09 anchors):** the rehydrate `useEffect` body contains the `setPanoramicPhotosUrl` anchor at `:279`. Adding 3 lines shifts subsequent line numbers — RESEARCH §"Phase-gate regression bundle" warns to update `04-VERIFICATION.md` if anchor lines move.

---

### `src/components/CreateListingForm/HospitalitySection.tsx` (form sub-component) — MOD

**Analog:** `src/components/CreateListingForm/PriceSection.tsx` (currency chip row). Same `commonStyles.chip` + `commonStyles.chipRow` vocabulary.

**Currency chip row pattern** (`src/components/CreateListingForm/PriceSection.tsx:35-67`):
```tsx
<View style={commonStyles.chipRow}>
  {CURRENCY_OPTIONS.map((option) => {
    const selected = values.currency === option.value;
    return (
      <TouchableOpacity
        key={option.value}
        style={[
          commonStyles.chip,
          {
            backgroundColor: selected ? colors.accent : colors.inputBackground,
            borderColor: selected ? colors.accent : colors.border,
          },
        ]}
        onPress={() => onChange('currency', option.value)}
        accessibilityRole="button"
        accessibilityState={{ selected }}
        accessibilityLabel={option.label}
        hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
      >
        <Text
          style={[commonStyles.chipText, { color: selected ? '#FFF' : colors.text }]}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {option.label}
        </Text>
      </TouchableOpacity>
    );
  })}
</View>
```

**Phase 6 amenity grid pattern** — replace current placeholder at `src/components/CreateListingForm/HospitalitySection.tsx:100-102`:
```tsx
// BEFORE
<Text style={[commonStyles.hint, { color: colors.textSecondary }]}>
  {t('hospitality.amenitiesPhase6Placeholder')}
</Text>
```
**AFTER** (D-18 + RESEARCH §5 — multi-select with icon-prefix; mirrors PriceSection but adds icon and toggles instead of single-select):
```tsx
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
        accessibilityRole="button"
        accessibilityState={{ selected }}
        accessibilityLabel={t(`amenity.${token}` as TranslationKeys)}
        hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
      >
        <Icon size={14} color={selected ? '#FFFFFF' : colors.text} />
        <Text
          style={[commonStyles.chipText, { color: selected ? '#FFFFFF' : colors.text }]}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
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
**Inline-error pattern** lifted verbatim from existing `errors.rooms` / `errors.maxGuests` / `errors.bathrooms` blocks at `:57-61`, `:75-79`, `:93-97`. Same `commonStyles.hint + commonStyles.fieldError + colors.error` triad.

Add `import { HOSPITALITY_AMENITIES, AMENITY_ICONS, type HospitalityAmenity } from '../../utils/hospitalityAmenities';` at top of file.

**Phase 6 also drops** the `'hospitality.amenitiesPhase6Placeholder'` reference — coordinate with locales deletion (Gap 9.4).

---

### `src/components/CreateListingForm/types.ts` (form types — D-21) — MOD

**Analog:** Self. Currency narrowing precedent at `:36`:
```typescript
currency: Currency | ''; // D-18: '$' | 'сом' | '' — empty = unset
```

**Phase 6 diff** — `:41`:
```typescript
// BEFORE
amenities: string[];

// AFTER (D-21)
amenities: HospitalityAmenity[];
```
Add `import type { HospitalityAmenity } from '../../utils/hospitalityAmenities';` at top.

---

### `src/components/CreateListingForm/validators.ts` (D-22) — MOD

**Analog:** Self (Hospitality branch at `:118-135` and `:188-194`).

**Existing Hospitality validation branch** (`src/components/CreateListingForm/validators.ts:118-135`):
```typescript
} else {
  // Hospitality
  if (!values.rooms.trim()) errors.rooms = 'createListing.roomsRequired';
  if (!values.bathrooms.trim()) errors.bathrooms = 'createListing.bathroomsRequired';
  if (!values.maxGuests.trim()) errors.maxGuests = 'createListing.maxGuestsRequired';

  // Hybrid contact rule per D-09/D-10:
  const phone = values.contactPhone.trim();
  // ...unchanged...
}
```

**Phase 6 diff** — insert amenity validation BEFORE the contact rule:
```typescript
} else {
  // Hospitality
  if (!values.rooms.trim()) errors.rooms = 'createListing.roomsRequired';
  if (!values.bathrooms.trim()) errors.bathrooms = 'createListing.bathroomsRequired';
  if (!values.maxGuests.trim()) errors.maxGuests = 'createListing.maxGuestsRequired';

  // D-22 — at least one amenity required
  if (values.amenities.length < 1) {
    errors.amenities = 'createListing.amenitiesRequired';
  }

  // Hybrid contact rule (unchanged)
  const phone = values.contactPhone.trim();
  // ...
}
```
Translation key namespace `createListing.amenitiesRequired` per RESEARCH §"Claude's Discretion" recommendation (matches Phase 5 `createListing.*Required` precedent).

**Existing Hospitality payload branch** (`:188-194`):
```typescript
// Hospitality — D-14: NO price, NO currency, NO areaSqm, NO period, NO amenities
return {
  ...shared,
  rooms: parseInt(values.rooms) || 0,
  bathrooms: parseInt(values.bathrooms) || 0,
  maxGuests: parseInt(values.maxGuests) || 0,
} as Partial<Property>;
```

**Phase 6 diff** — add `amenities` AND update the comment (D-22):
```typescript
// Hospitality — D-14: NO price, NO currency, NO areaSqm, NO period
// Phase 6 D-22: amenities INCLUDED (replaces the prior "NO amenities" stance)
return {
  ...shared,
  rooms: parseInt(values.rooms) || 0,
  bathrooms: parseInt(values.bathrooms) || 0,
  maxGuests: parseInt(values.maxGuests) || 0,
  amenities: values.amenities,                // NEW (D-22)
} as Partial<Property>;
```

**Field order array** (`:72-83`) — append `'amenities'` to the Hospitality field order to wire scroll-to-first-error per Phase 5 D-04:
```typescript
Hospitality: [
  'title', 'description', 'address', 'district', 'city',
  'rooms', 'maxGuests', 'bathrooms',
  'amenities',                                 // NEW
  'contactPhone',
],
```

---

### `src/components/CreateListingForm/__tests__/validators.test.ts` (D-22) — MOD

**Analog:** Self. Existing `describe('validateByCategory — Hospitality', ...)` block at `:216-333` and existing payload assertion at `:370-386`.

**Existing Hospitality test factory** (`:217-225`):
```typescript
function hospitalityBase(): FormBag {
  return {
    ...makeBase(),
    propertyType: 'Hostel',
    rooms: '3',
    bathrooms: '2',
    maxGuests: '5',
  };
}
```
**Phase 6 diff** — extend to include valid amenities default so existing 9 Hospitality tests stay green:
```typescript
function hospitalityBase(): FormBag {
  return {
    ...makeBase(),
    propertyType: 'Hostel',
    rooms: '3',
    bathrooms: '2',
    maxGuests: '5',
    amenities: ['wifi'],          // D-22: at-least-one default
  };
}
```

**Existing payload test FLIP** (`:370-386`):
```typescript
// BEFORE
test('Hospitality payload does NOT contain price/currency/areaSqm/amenities (D-14)', () => {
  const payload = buildPayloadByCategory(values, 'Hospitality');
  expect('price' in payload).toBe(false);
  expect('currency' in payload).toBe(false);
  expect('areaSqm' in payload).toBe(false);
  expect('amenities' in payload).toBe(false);     // ← FLIP
  // ...
});

// AFTER (D-22)
test('Hospitality payload omits price/currency/areaSqm AND includes amenities (D-22)', () => {
  const values: FormBag = {
    ...makeBase(),
    propertyType: 'Hostel',
    rooms: '3',
    bathrooms: '2',
    maxGuests: '5',
    amenities: ['wifi', 'aircon'],
  };
  const payload: Record<string, unknown> = buildPayloadByCategory(values, 'Hospitality');
  expect('price' in payload).toBe(false);
  expect('currency' in payload).toBe(false);
  expect('areaSqm' in payload).toBe(false);
  expect('amenities' in payload).toBe(true);         // ← FLIPPED
  expect((payload.amenities as string[]).length).toBe(2);
  expect('rooms' in payload).toBe(true);
  expect('bathrooms' in payload).toBe(true);
  expect('maxGuests' in payload).toBe(true);
});
```

**NEW assertions** — RESEARCH §Code Example 5:
```typescript
// Inside describe('validateByCategory — Hospitality', ...)
test('empty amenities → errors.amenities set (D-22)', () => {
  const values: FormBag = { ...hospitalityBase(), amenities: [] };
  const result = validateByCategory(values, 'Hospitality');
  expect(result.isValid).toBe(false);
  expect(result.errors.amenities).toBe('createListing.amenitiesRequired');
});

test('1 amenity → errors.amenities unset (D-22)', () => {
  const values: FormBag = { ...hospitalityBase(), amenities: ['wifi'] };
  const result = validateByCategory(values, 'Hospitality');
  expect(result.errors.amenities).toBe(undefined);
});

// Inside describe('buildPayloadByCategory — payload shape invariants', ...)
test('Residential payload does NOT contain amenities key (D-22)', () => {
  const values: FormBag = {
    ...makeBase(),
    propertyType: 'Apartment',
    bedrooms: '2', bathrooms: '1', areaSqm: '80', price: '1000', currency: '$',
    amenities: ['wifi'],
  };
  const payload: Record<string, unknown> = buildPayloadByCategory(values, 'Residential');
  expect('amenities' in payload).toBe(false);
});

test('Commercial payload does NOT contain amenities key (D-22)', () => {
  const values: FormBag = {
    ...makeBase(),
    propertyType: 'Office',
    areaSqm: '200', price: '5000', currency: '$',
    amenities: ['wifi'],
  };
  const payload: Record<string, unknown> = buildPayloadByCategory(values, 'Commercial');
  expect('amenities' in payload).toBe(false);
});
```
**Note (Assumption A6):** existing `amenities: ['wifi', 'aircon']` literals assign-compatible with `HospitalityAmenity[]` via `as const` narrowing. If tsc complains, add `as HospitalityAmenity[]` cast.

---

### `src/services/PropertyService.ts` (Gap 9.1 — backend wire-up) — MOD

**Analog:** Self. Existing FormData append blocks at `:60-93` (createProperty) and `:126-160` (updateProperty).

**Existing FormData append pattern** (`src/services/PropertyService.ts:65-89`):
```typescript
formData.append('title', propertyData.title);
formData.append('description', propertyData.description || '');
formData.append('address', propertyData.address);
formData.append('city', propertyData.city || 'Bishkek');
formData.append('price', propertyData.price?.toString() || '0');
formData.append('currency', propertyData.currency || '$');
formData.append('period', propertyData.period || '');
formData.append('type', propertyData.type || 'rent');
formData.append('propertyType', propertyData.propertyType || 'apartment');
formData.append('bedrooms', propertyData.bedrooms?.toString() || '0');
formData.append('bathrooms', propertyData.bathrooms?.toString() || '0');
formData.append('areaSqm', propertyData.areaSqm?.toString() || '0');
formData.append('features', JSON.stringify(propertyData.features || []));
formData.append('videoUrl', propertyData.videoUrl || '');
formData.append('panoramicPhotosUrl', propertyData.panoramicPhotosUrl || '');
formData.append('instagramUrl', propertyData.instagramUrl || '');
formData.append('status', propertyData.status || 'draft');
if (propertyData.availableDate) {
  formData.append('availableDate', propertyData.availableDate);
}
if (propertyData.tours && propertyData.tours.length > 0) {
  formData.append('tours', JSON.stringify(propertyData.tours));
}
```

**Phase 6 diff** — add 3 appends in BOTH `createProperty` AND `updateProperty` (RESEARCH §9.1):
```typescript
formData.append('rooms', propertyData.rooms?.toString() || '0');
formData.append('maxGuests', propertyData.maxGuests?.toString() || '0');
formData.append('amenities', JSON.stringify(propertyData.amenities || []));
```

**Convention notes:**
- Numeric fields `toString() || '0'` mirrors existing `bedrooms` / `bathrooms` / `areaSqm` pattern at `:74-76` / `:141-143`.
- Array `JSON.stringify(... || [])` mirrors existing `features` pattern at `:77` / `:144`.
- Both `createProperty` and `updateProperty` MUST receive the same diff (parity with existing fields).

**Backend coordination** (Assumption A1/A2 in RESEARCH §"Open Questions"): Railway backend may need schema update to accept `rooms` / `maxGuests` / `amenities`. Suggest a Wave 0 spike per RESEARCH §Q1 — POST a hospitality listing via curl, GET back, verify echo.

---

### `src/types/Property.ts` (D-20 + Gap 9.1) — MOD

**Analog:** Self. Existing optional-field pattern (`availableDate?: string`, `panoramicPhotosUrl?: string`, etc.).

**Phase 6 diff** — append after the existing `status?` field at `:64`:
```typescript
/** ISO date string - when the property becomes available (for rent). If within 1 month, shows "now" */
availableDate?: string;
platformVerifications?: PlatformVerifications;
verificationUpdatedAt?: string;
verificationUpdatedByUid?: string;
status?: 'draft' | 'live';

// Phase 6 (HOSP-05 / D-20 / Gap 9.1) — Hospitality fields top-level (NOT inside specs)
rooms?: number;
maxGuests?: number;
amenities?: HospitalityAmenity[];
```
Add `import type { HospitalityAmenity } from '../utils/hospitalityAmenities';` at top.

**Why top-level (not `specs.beds/baths/sqft`):** RESEARCH §9.4 — clean-slate invariant; Hospitality `rooms` is a distinct concept from Residential `specs.beds`.

---

### `src/locales/en.ts` + `src/locales/ru.ts` (HOSP-06) — MOD

**Analog:** Self. Existing `hospitality.*` cluster at `en.ts:282-289` / `ru.ts:286-291`. Existing `category.*` cluster verifies parity (`category.hospitality` already exists in both).

**Existing pattern** (`src/locales/en.ts:282-289`):
```typescript
'hospitality.sectionTitle': 'Hospitality Details',
'hospitality.rooms': 'Rooms',
'hospitality.maxGuests': 'Max Guests',
'hospitality.bathrooms': 'Bathrooms',
'hospitality.amenities': 'Amenities',
'hospitality.amenitiesPhase6Placeholder': 'Amenities list — coming in a future update',  // ← DELETE after picker lands
```

**Wave 0 add (RESEARCH §10) — both locales in parity, single commit:**
```typescript
// 12 amenity labels (en.ts)
'amenity.wifi': 'Wi-Fi',
'amenity.aircon': 'Air conditioning',
'amenity.heating': 'Heating',
'amenity.kitchen': 'Kitchen',
'amenity.breakfast': 'Breakfast',
'amenity.parking': 'Parking',
'amenity.reception24': '24h reception',
'amenity.laundry': 'Laundry',
'amenity.hotwater': 'Hot water',
'amenity.commonarea': 'Common area',
'amenity.lockers': 'Lockers',
'amenity.ensuite': 'En-suite bathroom',

// Validation
'createListing.amenitiesRequired': 'Select at least one amenity',

// Strip header
'home.hospitalitySectionTitle': 'Hostels & Hotels',

// Card type badges
'hospitality.badge.hostel': 'Hostel',
'hospitality.badge.hotel': 'Hotel',

// Card amenity overflow
'hospitality.amenitiesMore': '+{count} more',
```

**Russian equivalents** — UI-SPEC §Copywriting Contract table (verbatim).

**Delete at end of phase:**
```typescript
'hospitality.amenitiesPhase6Placeholder': ...  // both locales — delete after HospitalitySection picker commit lands
```

**Parity gate:** `scripts/check-i18n-parity.sh` runs `diff <(sort EN keys) <(sort RU keys)`. Single Wave 0 commit avoids transient asymmetry.

**Reused keys (no new copy needed)** — UI-SPEC §Copywriting Contract:
- `hospitality.rooms`, `hospitality.maxGuests`, `hospitality.amenities` (Phase 4)
- `category.residential`, `category.commercial`, `category.hospitality` (Phase 4 — verified present in both locales at `en.ts:278-280` / `ru.ts:281-283`)
- `property.forRent`, `property.forSale`, `property.whatsapp`, `property.telegram`, `property.phoneCall` (existing)

---

## Shared Patterns

### Theme tokens via `useTheme()` (apply to ALL Phase 6 component files)

**Source:** `src/theme/ThemeContext.tsx` via `useTheme()` hook returning `{ colors, isDark }`.

**Pattern** (used in every existing component — e.g. `src/components/PropertyCard.tsx:51`):
```typescript
const { colors, isDark } = useTheme();
```

**Style merge convention** (CONVENTIONS.md §Styling):
```tsx
<View style={[styles.cardContainer, { backgroundColor: colors.surface }]}>
<Text style={[styles.title, { color: colors.text }]}>
<Text style={[styles.address, { color: colors.textSecondary }]}>
```
Static structural styles in `StyleSheet.create({...})`; dynamic theme values merged via array.

**Phase 6 in-scope tokens** (UI-SPEC §Color):
`background, surface, text, textSecondary, textTertiary, accent, border, inputBackground, chipBackground, chipBorder, activeChipBackground, activeChipText, success, error`.

---

### i18n via `useLanguage()` (apply to all UI files)

**Pattern** (every component — e.g. `src/components/PropertyCard.tsx:53`):
```typescript
const { t } = useLanguage();
// ...
<Text>{t('property.forRent')}</Text>
```

**Type-safe key reference** (used widely — e.g. `src/components/CreateListingForm/HospitalitySection.tsx:28-29`):
```typescript
import type { TranslationKeys } from '../../locales';
// ...
{t(`amenity.${token}` as TranslationKeys)}
```
String-template keys cast to `TranslationKeys` so the `Record<TranslationKeys, string>` tsc gate stays effective.

**EN+RU parity rule** — every new key MUST land in both `en.ts` and `ru.ts` in the same commit (CLAUDE.md + CONVENTIONS.md row 13). Violations: tsc fails, OR `scripts/check-i18n-parity.sh` exits non-zero.

---

### Validator inline-error pattern (apply to form sub-components introducing new validation)

**Source:** `src/components/CreateListingForm/HospitalitySection.tsx:57-61` (existing rooms-error pattern):
```tsx
{errors.rooms && (
  <Text style={[commonStyles.hint, commonStyles.fieldError, { color: colors.error }]}>
    {t(errors.rooms as TranslationKeys)}
  </Text>
)}
```
Phase 6 amenity-error uses identical triad: `commonStyles.hint + commonStyles.fieldError + colors.error`.

---

### Owner-context chrome via `showEditButton` prop (apply to HospitalityCard + HospitalitySection)

**Source:** `src/components/PropertyCard.tsx:172-203`. Caller decides; component never reads `useAuth().user.userType`.

**Why this matters:** Phase 3 introduced `./scripts/check-role-grep.sh` which exits non-zero on inline `userType === 'admin'` checks. **Pitfall 1 in RESEARCH:** copy-pasting from older code paths could regress this. HospitalityCard and HospitalitySection MUST forward `showEditButton`/`onEdit`/`onDelete` from caller — never branch on user role internally.

---

### Safe-area inset for sticky bars (apply to PropertyDetailsScreen sticky contact bar)

**Source:** `src/components/BottomNavigator.tsx:29-30`:
```typescript
const insets = useSafeAreaInsets();
const bottomInset = Platform.OS === 'android' ? Math.max(insets.bottom, 16) : Math.max(insets.bottom, 8);
```

**Phase 6 sticky contact bar** uses `Math.max(insets.bottom, 12)` per UI-SPEC §HospitalityContactBar.

**Import** (`src/components/BottomNavigator.tsx:3`):
```typescript
import { useSafeAreaInsets } from 'react-native-safe-area-context';
```

---

### `as const` string-literal-union taxonomies (apply to hospitalityAmenities.ts)

**Source:** `src/utils/propertyCategory.ts:16-21`. Same shape: `as const` array + indexed-access type.

**Same precedent — Currency** (`src/components/CreateListingForm/validators.ts:30-36`):
```typescript
export const CURRENCY_OPTIONS = [
  { value: '$', label: '🇺🇸 USD' },
  { value: 'сом', label: '🇰🇬 сом' },
] as const;
export type Currency = (typeof CURRENCY_OPTIONS)[number]['value'];
```

Phase 6 `HOSPITALITY_AMENITIES` mirrors this pattern (without label/value pair — pure token array).

---

### Service `formData.append` for backend payload (apply to PropertyService Gap 9.1)

**Source:** `src/services/PropertyService.ts:65-89` (createProperty) and `:131-156` (updateProperty).

**Conventions:**
- Numeric fields: `propertyData.X?.toString() || '0'` (pattern established at `:69, :74-76`)
- Array fields: `JSON.stringify(propertyData.X || [])` (pattern established at `:77`)
- Optional date fields: `if (propertyData.availableDate) { formData.append(...) }` (pattern at `:82-84`)
- Both create and update functions MUST receive parallel diffs

---

### Co-located Jest tests (`__tests__/<file>.test.ts`) — apply to validators.test.ts extension

**Source:** `src/components/CreateListingForm/__tests__/validators.test.ts` (Phase 5). Convention: `describe(...)` blocks per public function; nested `describe('— Category', ...)` per branch; per-branch `factory()` helpers like `hospitalityBase()`.

**Phase 6 extends in-place** — does NOT create new test files; adds assertions inside existing `describe` blocks per RESEARCH §Code Example 5.

---

## CI Gate Preservation (load-bearing — phase-exit blockers per UI-SPEC)

| Gate | Phase 6 risk | Pattern to follow |
|------|--------------|-------------------|
| `./scripts/check-role-grep.sh` (Phase 3 D-14) | LOW — Pitfall 1+6: NEVER inline `userType === 'admin'`; use `showEditButton` caller-decides pattern | HospitalityCard + HospitalitySection — caller passes the flag |
| `./scripts/check-land-removed.sh` (Phase 4 FORM-01) | NONE — Phase 6 doesn't touch `Land` references | — |
| `./scripts/check-i18n-parity.sh` (Phase 4 FORM-09) | MEDIUM — 36 new keys + `hospitality.amenitiesPhase6Placeholder` deletion must land symmetrically | Single Wave 0 commit per RESEARCH §10 |
| `Record<TranslationKeys, string>` tsc gate | MEDIUM — every new key needs BOTH locales | EN + RU added simultaneously in one diff |
| `grep -c '<Gated' src/components/CreateListingForm/MediaSection.tsx == 2` (Phase 4) | NONE — Phase 6 doesn't touch MediaSection | — |
| D-09 preserve-on-save anchors at CreateListingScreen.tsx:253, :465, :469 | LOW-MEDIUM — Gap 9.2 adds 3 lines INSIDE the rehydrate `useEffect` (~:250-310). Anchor lines may shift; update `04-VERIFICATION.md` if so | RESEARCH §Phase-gate regression bundle |
| `npm test` baseline 50/50 | LOW — extends `validators.test.ts` with ~3-5 new assertions; flips one (`'amenities' in payload === false` → `true`) | RESEARCH §Code Example 5 |
| Zero diff in `src/components/PropertyCard.tsx` (D-07 / Pitfall 7) | HIGH — phase failure if PropertyCard is touched | Plans MUST verify `git diff --stat src/components/PropertyCard.tsx` returns 0 lines per Phase 6 commit |

---

## No Analog Found

None. Every Phase 6 file has either an exact analog (`PropertyCard` for `HospitalityCard`, `propertyCategory.ts` for `hospitalityAmenities.ts`, `PriceSection` for the form picker) or a self-extension target (HomeScreen filter, PropertyDetailsScreen branch, PropertyService FormData, validators + tests, locales).

The closest "no exact analog" case is `HospitalitySection.tsx` (no existing horizontal-strip-as-`ListHeaderComponent` in the repo). The planner falls back to RESEARCH §1's recipe + the inner `<FlatList horizontal>` shape from `PropertyDetailsScreen.tsx:445-454` (image carousel) and the `ListHeaderComponent` mounting from `FavoritesScreen.tsx:144`.

---

## Metadata

**Analog search scope:**
- `src/components/` (16 files — flat layout)
- `src/components/CreateListingForm/` (10 files — sub-components + tests + types + styles)
- `src/screens/` (19 files)
- `src/utils/` (6 files)
- `src/services/` (5 files)
- `src/types/` (2 files)
- `src/theme/` (token source)
- `src/locales/` (parity verification)

**Files scanned (Read tool):** 18
**Files scanned (Grep / Bash):** 4
**Pattern extraction date:** 2026-04-24
**Skills loaded:** none — `.claude/skills/` and `.agents/skills/` not present in repo

---

*Phase: 06-hospitality-rendering*
*Patterns mapped: 2026-04-24*

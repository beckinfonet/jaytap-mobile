# Property Details Redesign — Design Spec

- **Date:** 2026-05-26
- **Status:** Draft, awaiting user review
- **Target milestone:** M5 "Details Redesign" — Phase 1
- **Source:** Design-team mockup (`/Users/beckmaldinVL/Desktop/newversio.png`, handoff 2026-05-26)
- **Predecessor work:** Commits `3af92b6` / `738a49f` / `301c331` / `a065105` (v4.0.1 detail polish, 2026-05-25). This spec **overwrites** the tile-grid + specs-row decisions from those commits; it does not preserve them as dead code.

---

## 1. Goal

Adopt the design team's new `PropertyDetailsScreen` mockup top-to-bottom. The redesign affects six regions of the page above the description block: the 2×2 action grid, the FOR SALE / ID header pills, the title block, the attribute list, the map preview, and the beds/baths/area stats card. Below the description (amenities, contact CTA, full-screen map modal) is out of scope.

## 2. Non-goals

- Not changing the data shape of `Property` or any of its nested types (no schema migration).
- Not adding per-night pricing, booking calendars, or anything else listed under `PROJECT.md § Out of Scope`.
- Not migrating away from the custom `App.tsx` state machine (navigation stays as-is).
- Not changing the hero image carousel layout, the hero 3D Tour card, the full-screen map modal, the contact CTA, or the description block.
- Not touching `PropertyCard.tsx`'s own spec row (commit `301c331`'s icon+value-inline cells). That component's compact context is different; if we want PropertyCard to consume `KeyStatsCard` later, that's a follow-up.

## 3. Scope summary

| Region | Mockup change | Code surface |
|---|---|---|
| Hero image overlay | Remove "For Rent / For Sale" badge (lines ~798–805). Pagination badge stays. | `PropertyDetailsScreen.tsx` |
| Title block | New `HeaderInfoCard` — FOR SALE pill (with red accent bar) + ID pill (red outlined) on top row, title, single-line address with `·` separator, short red divider underneath. | NEW `src/components/details/HeaderInfoCard.tsx` |
| Attribute list | Replace the 2-up Airbnb-style tile grid inside `ListingMetaTable.tsx` (lines 164–238) with single-column rows. Hairline divider between rows. Lucide line icons on the left, indicator-on-right by data type. | NEW `src/components/details/AttributeList.tsx` (with `derivePropertyAttributes` helper). Edit `ListingMetaTable.tsx` to drop tile grid. |
| Map preview | Replace the inline full-width `<MapView>` (lines ~1041–1075) with a small thumbnail card placed inside `HeaderInfoCard`'s region. "Map →" button opens the existing full-screen map modal. | NEW `src/components/details/MapPreviewCard.tsx` |
| Specs row | Replace the existing specs row (lines 963–991) — bigger numbers, no emoji icons, m² as small superscript-style appendage, uppercase labels. | NEW `src/components/details/KeyStatsCard.tsx` |
| 2×2 action grid | Outlined cards (transparent fill, border-only). Each card has a small outlined "icon container" square on the left with the existing Lucide glyph inside it. | Edit `PropertyDetailsScreen.tsx` `mediaGrid` styles |

## 4. Component architecture (Approach B)

Four new components in a new directory, `src/components/details/`, each with a co-located test file. PropertyDetailsScreen drops from ~2,563 lines toward ~2,250.

### 4.1 `HeaderInfoCard`

**Path:** `src/components/details/HeaderInfoCard.tsx`

**Props:**
```ts
interface HeaderInfoCardProps {
  dealType: 'sale' | 'rent' | string;        // drives FOR SALE vs FOR RENT label
  listingId?: string | null;                  // shown as red-outlined pill on right
  title: string;
  formattedAddress: { line1: string; line2?: string };  // result of formatAddress()
  statusPill?: React.ReactNode;               // renders below pill row, above title (non-live statuses)
  mapPreview?: React.ReactNode;               // <MapPreviewCard /> slot
}
```

**Render order:**

1. Pill row (FOR SALE / FOR RENT pill with red accent bar on left, `listingId` pill on right). Pill row hidden if neither piece exists.
2. Optional `statusPill` (D-19 / MOD-07 non-live status display).
3. Title — `numberOfLines={3}`, wraps freely (RU is ~20 % wider; no truncation).
4. Address — flex-row of three elements in one line: (a) `<MapPin>` icon, (b) `<Text numberOfLines={1} ellipsizeMode="tail">` containing `line1` (the street; this is the only element that can truncate), (c) `<Text> · {line2}</Text>` (the city, never truncated, `flexShrink: 0`). When `line2` is empty the dot + city are omitted.
5. Short red divider (~38 % width, `colors.accent` at 100 % opacity, 2 px tall).
6. `mapPreview` slot rendered below the divider.

**Visual tokens** (all already in `src/theme/`):
- `colors.accent` (`#FF385C` light / `#FF5C7C` dark) — FOR SALE pill text, vertical accent bar, ID pill border, short red divider.
- ID pill border is rendered as `borderColor: colors.accent` on the pill `View` with `borderWidth: 1` and the `View` set to `opacity: 0.85` to soften it. No new tokens.
- `colors.success` / `colors.error` / `colors.warning` / `colors.textTertiary` are referenced in `AttributeList` (§ 4.2) — already present in both light and dark themes.

### 4.2 `AttributeList` + `derivePropertyAttributes`

**Path:** `src/components/details/AttributeList.tsx` — exports both pieces.

**Pure helper:**
```ts
type AttributeRow =
  | { kind: 'condition'; icon: LucideIcon; label: string; value: string; dotColor: string }
  | { kind: 'boolean';   icon: LucideIcon; label: string; value: string; on: boolean }
  | { kind: 'plain';     icon: LucideIcon; label: string; value: string };

function derivePropertyAttributes(property: Property, t: TFunction): AttributeRow[];
```

Returns rows for the same 6 fields the current `ListingMetaTable.extrasTiles` covers, in this order: Condition, Furnished, Negotiable, Min term, Deposit, Prepayment. Undefined fields are omitted (current behavior preserved).

**Indicator logic by `kind`:**

| Kind | Right-side render |
|---|---|
| `condition` | 8 × 8 solid dot, color-coded — `euro` → `colors.success` (green); `good` → `colors.warning` (yellow); `cosmetic` → orange (`#F0A500`); `needsRepair` → `colors.error` (red). |
| `boolean` (on=true) | 18 × 18 filled green circle (`colors.success`) with a white ✓ glyph inside. |
| `boolean` (on=false) | 18 × 18 filled grey circle (`colors.textTertiary`) with a white × glyph inside. |
| `plain` | No indicator. Bold value text only. |

**Mapping:**
- Condition → `kind: 'condition'`
- Furnished → `kind: 'boolean'`
- Negotiable → `kind: 'boolean'`
- Min term, Deposit, Prepayment → `kind: 'plain'`

**Rendering rules:**
- Each row: `paddingVertical: 14`. `borderBottomWidth: StyleSheet.hairlineWidth`, `borderBottomColor: colors.border` (≈ 30 % opacity on dark theme).
- Last row sets `borderBottomWidth: 0`.
- Left column: Lucide icon at size 18, `colors.textSecondary`, `strokeWidth={1.7}` (Airbnb-typical weight, lighter than Lucide default 2). Gap 12 to label text.
- Label uses `colors.textSecondary`, `fontSize: 14`.
- Right column: value `fontWeight: '700'`, `fontSize: 15`, `colors.text`. Indicator gap 10 from value.

### 4.3 `MapPreviewCard`

**Path:** `src/components/details/MapPreviewCard.tsx`

**Props:**
```ts
interface MapPreviewCardProps {
  coordinates: { latitude: number; longitude: number };
  district?: string;       // bold heading
  city?: string;           // secondary line, paired with country if known
  onOpenFullScreen: () => void;
}
```

**Render:**
- Outer row container, `colors.surface` background, `borderRadius: 14`, `borderColor: colors.border`, `padding: 14`, `gap: 14`.
- Left: 96 × 96 thumbnail (`borderRadius: 12`) containing `<MapView>` from `react-native-maps` with:
  - `provider={PROVIDER_DEFAULT}`
  - `initialRegion={{ latitude, longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 }}`
  - All gestures disabled: `scrollEnabled={false}`, `zoomEnabled={false}`, `pitchEnabled={false}`, `rotateEnabled={false}`, `mapType="mutedStandard"`.
  - One `<Marker coordinate={coordinates} pinColor={colors.accent} />` — the default `react-native-maps` pin tinted to the theme accent. No custom image asset.
- Middle: three text lines.
  - `district` (bold, 18 pt, `colors.text`) — omitted if falsy.
  - `city + ', ' + country` (13 pt, `colors.textSecondary`) — `country` resolved via `cityToCountry(city)` lookup; if unknown, render city alone. Whole line omitted if neither.
  - Coords formatted `{lat.toFixed(2)}° {N|S} · {lng.toFixed(2)}° {E|W}` (12 pt, `colors.textTertiary`, tabular numerals).
- Right: "Map →" pill button — transparent, bordered, calls `onOpenFullScreen`.

**Coords source:** the existing `propertyCoordinates` `useMemo` in `PropertyDetailsScreen.tsx` (lines 637–659). The same mock-fallback path for listings without `location.coordinates` is reused — `MapPreviewCard` receives the computed value, never the raw `Property`.

**Cardinal letters:** lat ≥ 0 → `N`, else `S`; lng ≥ 0 → `E`, else `W`. (KG/KZ/UZ are always N/E; the code is correctness-for-free.)

### 4.4 `KeyStatsCard`

**Path:** `src/components/details/KeyStatsCard.tsx`

**Props:**
```ts
interface KeyStatsCardProps {
  beds?: { value: number | string; labelKey: TranslationKeys };  // undefined → cell omitted
  baths?: number | string;                                        // '-' rendered when missing
  areaSqm?: number;                                               // '-' rendered when missing
}
```

**Render:**
- Card container `colors.surface`, `borderRadius: 14`, `borderColor: colors.border`, `paddingVertical: 20`, `paddingHorizontal: 12`, flex-row.
- Each cell flex 1, centered:
  - Number — 36 pt, `fontWeight: '800'`, `letterSpacing: -0.5`, `colors.text`.
  - Optional unit suffix (only for area: "m²") — 14 pt, `colors.textSecondary`, `marginLeft: 3`. Inline with number.
  - Label — 11 pt, `colors.textTertiary`, `letterSpacing: 1.2`, `textTransform: 'uppercase'`, `fontWeight: '600'`, `marginTop: 8`.
- Vertical hairline dividers between cells: `<View style={{ width: 1, backgroundColor: colors.border, marginVertical: 6, opacity: 0.5 }} />` — `opacity` on the dividing `<View>` (not an `rgba` color) so the same token works in both themes.

**Property-type routing stays in `PropertyDetailsScreen`** — the parent computes `beds = isHospitality ? { value: basics?.hotelRooms ?? '-', labelKey: 'property.specs.rooms' } : isResidential ? { value: basics?.bedrooms ?? '-', labelKey: 'property.specs.bedrooms' } : undefined`. KeyStatsCard is presentational.

### 4.5 `cityToCountry` lookup

**Path:** `src/utils/cityToCountry.ts`

```ts
type CountryCode = 'KG' | 'KZ' | 'UZ';

const CITY_TO_COUNTRY: Record<string, CountryCode> = {
  // KG
  'Bishkek': 'KG', 'Бишкек': 'KG',
  'Osh':     'KG', 'Ош':     'KG',
  // KZ
  'Almaty':  'KZ', 'Алматы': 'KZ',
  'Astana':  'KZ', 'Астана': 'KZ',
  'Shymkent':'KZ', 'Шымкент':'KZ',
  // UZ
  'Tashkent':'UZ', 'Ташкент':'UZ',
  'Samarkand':'UZ','Самарканд':'UZ',
};

export function cityToCountry(city?: string): CountryCode | undefined {
  if (!city) return undefined;
  return CITY_TO_COUNTRY[city.trim()];
}
```

Caller pulls the localized country name via `t('country.' + cityToCountry(city))`. Unknown city → no country line.

**Note (Claude's Discretion):** The country line was an ambiguous read of the mockup — the mockup shows "Bishkek, Kyrgyzstan" but `Property.location` has no `country` field. The lookup table approach was selected as the recommended option; a future schema phase can add `location.country` and replace the lookup with the field value at the same call sites.

## 5. PropertyDetailsScreen wiring

Inside `PropertyDetailsScreen.tsx`, the title-block area is rebuilt as:

```tsx
<HeaderInfoCard
  dealType={property.dealType}
  listingId={property.listingId}
  title={titleText}
  formattedAddress={formatAddress(addressDisplay)}
  statusPill={(property.status ?? 'live') !== 'live' ? <StatusPill status={property.status} /> : undefined}
  mapPreview={
    <MapPreviewCard
      coordinates={propertyCoordinates}
      district={property.location?.district}
      city={property.location?.city}
      onOpenFullScreen={() => setIsMapFullScreen(true)}
    />
  }
/>
<KeyStatsCard
  beds={beds}
  baths={property.basics?.bathroomCount ?? '-'}
  areaSqm={property.basics?.areaSqm}
/>
<AttributeList rows={derivePropertyAttributes(property, t)} />
```

The hero badge (lines 798–805) and the inline `<MapView>` block (lines 1041–1075) are deleted. The associated styles in the `StyleSheet` at the bottom of the file (`mapOverlayButton`, `mapOverlayButtonText`, the inline `specRow` / `specItem` / `verticalDivider` / `specsContainer`, `listingInfoCard`, `title`, `addressRow`, `address`) are removed or migrated into the new components' own `StyleSheet`s.

Full-screen map modal (lines ~1274–1295) stays intact; it's the target of `setIsMapFullScreen(true)`.

`ListingMetaTable.tsx` keeps its ID + availability row (still used by `PropertyCard`'s compact mode). Its `extrasTiles` block, the inner `Tile` component, and the related styles are removed in the same commit.

## 6. i18n additions

**Both `src/locales/en.ts` + `src/locales/ru.ts`:**

| Key | EN | RU |
|---|---|---|
| `property.mapPreview.openButton` | "Map" | "Карта" |
| `country.KG` | "Kyrgyzstan" | "Кыргызстан" |
| `country.KZ` | "Kazakhstan" | "Казахстан" |
| `country.UZ` | "Uzbekistan" | "Узбекистан" |

All other strings (Condition / Furnished / Negotiable / Min term / Deposit / Prepayment values, beds/baths/area labels) reuse existing keys.

I18n parity check (`scripts/check-i18n-parity.sh` or equivalent project gate) must pass before merge.

## 7. Tests

### 7.1 Updated tests

| File | Change |
|---|---|
| `src/components/__tests__/ListingMetaTable.test.tsx` | Drop the tile-grid assertions (the `condition.good` / `condition.euro` cells added by commits `a065105` / `3af92b6`; the test currently has assertions pinned to those values — count them at edit time, don't rely on this spec for the number). Replace with assertions covering ID + availability behavior only — that's the new scope of `ListingMetaTable`. |
| `src/screens/__tests__/PropertyDetailsScreen.test.tsx` | Replace `mapOverlayButton` / `fullScreen` button assertions with `MapPreviewCard`'s "Map" button via `getByText(t('property.mapPreview.openButton'))`. Keep `react-native-maps` Jest mock as-is. Add assertion that the hero `statusBadge` no longer renders for-sale / for-rent text (it's gone). |

### 7.2 New tests

| File | Coverage |
|---|---|
| `src/components/details/__tests__/HeaderInfoCard.test.tsx` | (a) FOR SALE pill renders for `dealType: 'sale'`, FOR RENT for any other value; (b) ID pill omits when `listingId` is null/empty; (c) `statusPill` slot renders between pill row and title when provided; (d) address single-line render; (e) `mapPreview` slot renders below divider. |
| `src/components/details/__tests__/AttributeList.test.tsx` | (a) `derivePropertyAttributes` pure-function table-driven tests covering all 6 fields × present/absent; (b) condition dot color routing per enum value; (c) boolean `on=true` shows green ✓; (d) boolean `on=false` shows grey ×; (e) plain rows show no indicator; (f) hairline divider rendered on every row except last. |
| `src/components/details/__tests__/MapPreviewCard.test.tsx` | (a) Renders neighborhood + city when both present; (b) `cityToCountry` resolves Bishkek → KG and renders "Bishkek, Kyrgyzstan"; (c) unknown city → city alone, no country; (d) coords formatted as "42.87° N · 74.61° E"; (e) "Map" button calls `onOpenFullScreen`. |
| `src/components/details/__tests__/KeyStatsCard.test.tsx` | (a) Beds cell omitted when `beds` is undefined; (b) m² suffix renders inline with the area number; (c) labels render uppercase via style (not via translation key); (d) baths-as-`-` when missing. |
| `src/utils/__tests__/cityToCountry.test.ts` | EN + RU spelling routes to same country; trimming; unknown city returns undefined. |

### 7.3 Manual QA (M5 Phase 1 gate)

Per project memory `gsd-verifier-misses-regressions`, verifier alone is insufficient — paired with code review. After both gates clear, on-device QA matrix:

| Device | Theme | Language | Property type | Cells |
|---|---|---|---|---|
| iPhone 15 Pro Max | dark | EN, RU | residential, hospitality, commercial | 6 |
| Moto G XT2513V | dark | EN, RU | residential, hospitality, commercial | 6 |
| iPhone 15 Pro Max | light | EN | residential | 1 |
| Moto G XT2513V | light | RU | hospitality | 1 |

Total: 14 cells. Focus during QA: title-block readability, attribute-row scannability (the redesign's primary objective), map preview tap → full-screen modal opens, KBD-02 grep gate still 0.

## 8. Risk + open questions

| Risk | Mitigation |
|---|---|
| The recent commits (`3af92b6` / `738a49f` / `301c331` / `a065105`) just shipped in v4.0 and represent ~2 weeks of work. Reversing the tile grid for rows could feel like churn to whoever sees the diff. | The design team explicitly handed off a new mockup with the rows pattern (2026-05-26). The reversal is intentional, not regression. Commit message + PR description will reference the previous commits and the design handoff. |
| `react-native-maps` rendering a 96 × 96 thumbnail with all gestures disabled may still pay full map-init cost on screen mount. | Default behavior on iOS / Android is fine for one map per screen — already true today. If perf shows up in QA, fallback is the static-snapshot approach (Option 2 from the brainstorming Q&A); but not pre-optimizing. |
| `cityToCountry` lookup is a hardcoded list; mis-spelled or unlisted cities show only the city line, which could look incomplete vs. mockup. | Acceptable for M5. Track as M6 backlog: add `location.country` to schema and replace the lookup. |
| `formatAddress` currently returns `line1` (street) and `line2` (city). The mockup wants city on the same visual line as street with `·` separator. | `HeaderInfoCard` renders `line1` + ` · ` + `line2` on a single `<Text>`. If long street + long city overflow, the street is `numberOfLines={1}` with ellipsizeMode `'tail'`, but the city stays visible by being rendered as a separate `<Text>` after a `<View>` with the dot. Edge cases handled in `HeaderInfoCard.test.tsx` (long-RU-street case). |
| Country lookup is an ambiguous reading of the mockup — not user-confirmed. | Marked "Claude's Discretion" above. User can override during spec review. |

## 9. Out of scope (deferred)

- Adding `Property.location.country` field (schema phase).
- `PropertyCard.tsx` adoption of `KeyStatsCard` (separate consideration).
- Removing the full-screen map modal entirely or replacing it with native maps app deep-link (Option C from brainstorming Q&A; deferred).
- The 2-bed + living-room "rooms vs bedrooms" Central Asia convention split (already tracked in memory `central-asia-rooms-vs-bedrooms-convention.md` for M6+).

## 10. Cross-references

- Project context: `.planning/PROJECT.md`
- Predecessor design spec: `docs/superpowers/specs/2026-05-25-listing-form-detail-polish-design.md`
- Memory: `gsd-verifier-misses-regressions.md` (paired gates), `central-asia-rooms-vs-bedrooms-convention.md`, `feedback-conversational-tone.md`, `feedback-discuss-phase-detail-level.md`
- Mockup source: `~/Desktop/newversio.png` (2026-05-26 design-team handoff)

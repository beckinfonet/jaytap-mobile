---
quick_id: 260526-ebl
type: execute
wave: 1
depends_on: []
files_modified:
  - src/locales/en.ts
  - src/locales/ru.ts
  - src/components/PropertyCard.tsx
autonomous: false
requirements:
  - QUICK-260526-EBL — PropertyCard redesign per mockup (image-overlay price/stats card,
    deal-type-aware live status badge, conditional 3D-tour pill, ID with `#` prefix,
    serif title, MapPin location line, area-cell with diagonal-arrow icon).

must_haves:
  truths:
    - "Home screen `PropertyCard` matches the new mockup on iPhone (light + dark)."
    - "Sale/Rent pill on the hero photo is DARK with a small RED leading dot + white uppercase label, and it still reads `FOR SALE` / `FOR RENT` (EN) and `ПРОДАЖА` / `АРЕНДА` (RU)."
    - "A floating dark overlay card sits over the bottom of the hero photo with `ЦЕНА` eyebrow + price on the left and an icon-only stat row on the right (bed / bath / area)."
    - "The bed cell is hidden on office/commercial listings (existing residential-only rule preserved)."
    - "Each stat cell (bed, bath, area) is hidden when its underlying value is missing or zero."
    - "Below the photo, row 1 shows `#<listingId>` + a small live status badge with a green dot (`В продаже` / `For sale` for sale listings, `В аренде` / `For rent` for rent listings). The conditional `3D ТУР` / `3D Tour` pill renders only when `property.media?.tourUrl` is set, and tapping it calls `onViewTour(property)`."
    - "Pending / rejected / archived listings still render their existing `<StatusPill>` (the live-only badge replaces nothing for non-live statuses)."
    - "Row 2 shows the listing title in serif Georgia, 1–2 lines."
    - "Row 3 shows a `MapPin` icon + `<district> · <city>` in `textSecondary`."
    - "Owner-actions row (Edit / Archive / Unarchive / Delete) still renders under the location row when `showEditButton=true`, and the consumer (HomeScreen) usage does NOT render owner actions."
    - "Share + Favorite still work; Heart still fills red when favorited; share still produces the same share-sheet payload."
    - "EN+RU i18n parity holds: every new key exists in both `src/locales/en.ts` and `src/locales/ru.ts`."
    - "`yarn tsc --noEmit` is no worse than before (no new errors introduced by this change)."
    - "`grep -nE 'keyboardVerticalOffset' src/` still returns 0 hits (M1 KBD-02 invariant)."
  artifacts:
    - path: "src/locales/en.ts"
      provides: "EN strings for new status-badge and 3D-tour-pill keys"
      contains: "property.statusBadge.live.sale"
    - path: "src/locales/ru.ts"
      provides: "RU strings for new status-badge and 3D-tour-pill keys"
      contains: "property.statusBadge.live.sale"
    - path: "src/components/PropertyCard.tsx"
      provides: "Redesigned home-screen property card (image overlay + below-image content region)"
      contains: "MapPin"
  key_links:
    - from: "src/components/PropertyCard.tsx"
      to: "src/locales/en.ts + src/locales/ru.ts"
      via: "useLanguage().t('property.statusBadge.live.sale' | '.rent') + t('property.tourPill')"
      pattern: "statusBadge\\.live\\.(sale|rent)"
    - from: "src/components/PropertyCard.tsx"
      to: "HomeScreen.tsx onViewTour"
      via: "TouchableOpacity onPress -> onViewTour(property)"
      pattern: "onViewTour\\(property\\)"
    - from: "src/components/PropertyCard.tsx"
      to: "property.media?.tourUrl"
      via: "conditional render gate for the 3D-tour pill"
      pattern: "media\\?\\.tourUrl"
---

<objective>
Redesign `src/components/PropertyCard.tsx` to match the new mockup: dark sale/rent pill with red dot, dark translucent share + heart buttons, a floating semi-transparent price + stats overlay on the hero photo, and a re-laid-out below-image region with `#<listingId>` + a deal-type-aware live status badge, a conditional 3D-tour pill, a serif title, and a `MapPin` + `<district> · <city>` row. Preserve every existing behavioral edge case (residential-only beds cell, non-live `<StatusPill>`, `groupWithFooter` square corners, `showEditButton` owner-actions row, share + favorite, KBD-02 grep gate).

Purpose: ship the home-card visual refresh as a self-contained quick task — single PropertyCard surface, no schema, no nav, no new deps. Card consumers (HomeScreen) need no prop changes; `onViewTour` is already wired.

Output: 3 atomic commits (i18n keys → card refactor → optional consumer touch-up if needed), a working redesigned home card on iOS + Android, dark + light parity.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@./CLAUDE.md
@.planning/STATE.md
@src/components/PropertyCard.tsx
@src/components/HospitalityCard.tsx
@src/components/StatusPill.tsx
@src/components/ListingMetaTable.tsx
@src/types/Property.ts
@src/locales/en.ts
@src/locales/ru.ts
@src/theme/colors.ts

<interfaces>
<!-- Contracts the executor needs — extracted from codebase so no exploration is required. -->

From src/types/Property.ts (M3 nested shape — verified at plan time, 2026-05-26):

```typescript
export interface Property {
  id: string;
  listingId?: string;
  dealType?: 'sale' | 'rent_long' | 'rent_daily';
  propertyType?: 'apartment' | 'house' | 'office' | 'commercial' | 'hotel' | 'hostel';
  status?: 'pending' | 'live' | 'rejected' | 'archived';
  location?: { city?: string; district?: string; ... };
  basics?: {
    areaSqm?: number;
    bedrooms?: number;        // residential-only, 0–10 integer
    bathroomCount?: number;   // applies to all 6 propertyTypes, 0–10 step-0.5
    ...
  };
  content?: { title?: string; ... };
  media?: {
    photos: string[];
    videos: string[];
    tourUrl?: string;         // canonical 3D-tour gate post Phase 1 D-12
  };
  // NOTE: legacy `is3DTourAvailable` and `tours[]` were REMOVED at M3 Phase 2 D-20.
  // HospitalityCard already uses `!!property.media?.tourUrl` — same predicate here.
}
```

From src/components/StatusPill.tsx:
```typescript
export const StatusPill: React.FC<{ status?: 'pending' | 'live' | 'rejected' | 'archived'; style?: ViewStyle }>;
// Returns null for 'live' (D-16: live = no pill). Renders amber/red/grey capsule for pending/rejected/archived.
```

From HomeScreen.tsx (lines 236-243):
```typescript
const handleViewTour = async (property: Property) => {
  if (property.media?.tourUrl) {
    onOpenTours(property);
  } else {
    Alert.alert('Info', 'No 3D Tour available for this property.');
  }
};
// Wired at lines 588 -> onViewTour={handleViewTour}. PropertyCard's `onViewTour` prop is already plumbed.
```

Available lucide icons already on this import line in PropertyCard.tsx:13:
`Heart, Bed, Bath, Pencil, Trash2, Archive, ArchiveRestore`.
This plan ADDS: `MapPin, Maximize2, Box` (per locked decisions: `Maximize2` for area cell — reads as "expand corners," closer to the diagonal-arrow icon in the mockup than `Move`; `Box` for the 3D-tour pill — reads as a cube, matches mockup affordance better than `Eye`).
</interfaces>

<theme-tokens>
From src/theme/colors.ts (verified light + dark sets):
- `colors.surface`, `colors.text`, `colors.textSecondary`, `colors.textTertiary`
- `colors.border`, `colors.chipBackground`, `colors.chipBorder`
- `colors.primary`, `colors.primaryLight`
- `colors.warning` / `colors.onWarning`, `colors.error`

Overlay surfaces (sale/rent pill, share/heart buttons, floating price+stats card) sit ON the hero photo, NOT on the theme background — so semi-transparent black (rgba(0,0,0,0.4) / rgba(0,0,0,0.55) / rgba(0,0,0,0.6)) is the project pattern (same approach already used by HospitalityCard.tsx for its 3D-tour and share/heart overlays). The red leading dot uses `#EF4444` (Tailwind red-500) — a fresh hex constant scoped to this component is acceptable; no need to add it to the theme palette.

The below-image surfaces (`#<id>` + live-badge row, 3D-tour pill, location row) DO sit on `colors.surface` and MUST use theme tokens.
</theme-tokens>

<scope-note>
**Locked-decision reconciliation.** The locked-decisions block references `property.is3DTourAvailable && property.tours && property.tours.length > 0`. Those fields were removed from `Property` at M3 Phase 2 D-20 (replaced by `media.tourUrl: string`). The user's INTENT — "render the pill only when there is a real tour to view" — is preserved verbatim by gating on `!!property.media?.tourUrl`, which is the canonical M3 predicate already used by `HospitalityCard` and by `HomeScreen.handleViewTour`. No legacy-field revival.
</scope-note>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add i18n keys for live status badge + 3D-tour pill</name>
  <files>src/locales/en.ts, src/locales/ru.ts</files>
  <action>
    Add three new flat translation keys (per locked decision 3 and the design brief) to both `src/locales/en.ts` and `src/locales/ru.ts` in the existing `// Property` section, immediately after `'property.forSale'` to keep related keys grouped:

    - `property.statusBadge.live.sale` → EN `'For sale'` / RU `'В продаже'`
    - `property.statusBadge.live.rent` → EN `'For rent'` / RU `'В аренде'`
    - `property.tourPill` → EN `'3D Tour'` / RU `'3D Тур'`

    Constraints:
    - `en.ts` is the source-of-truth for `TranslationKeys` (per `src/locales/index.ts`), so add to en.ts FIRST, then mirror to ru.ts.
    - Maintain the existing flat-string-key convention (e.g. `'property.forSale': 'FOR SALE'`) — do NOT introduce a nested object shape.
    - EN+RU parity is enforced by `scripts/check-i18n-parity.sh` (M3 CI gate). All three keys MUST exist in both files; mismatch will fail the gate.
    - Do NOT touch other keys; do NOT reorder existing keys.
    - Title-case the EN strings (`'For sale'`, `'For rent'`, `'3D Tour'`) — they are sentence-case badges, not the uppercase `'FOR SALE'` / `'FOR RENT'` macro pills.
  </action>
  <verify>
    <automated>cd /Users/beckmaldinVL/development/mobileApps/JayTap &amp;&amp; grep -c "property.statusBadge.live.sale\|property.statusBadge.live.rent\|property.tourPill" src/locales/en.ts src/locales/ru.ts &amp;&amp; bash scripts/check-i18n-parity.sh</automated>
  </verify>
  <done>Both files contain all three new keys (grep returns ≥3 hits per file). `scripts/check-i18n-parity.sh` exits 0. No other lines in either locale file changed.</done>
</task>

<task type="auto">
  <name>Task 2: Redesign PropertyCard.tsx (image overlay + content region)</name>
  <files>src/components/PropertyCard.tsx</files>
  <action>
    Refactor `src/components/PropertyCard.tsx` to the mockup-driven layout described in the design brief. Single-file change; no consumer prop additions; no schema changes.

    **2a. Imports.** Extend the existing lucide import line at PropertyCard.tsx:13 to include `MapPin, Maximize2, Box` alongside the existing `Heart, Bed, Bath, Pencil, Trash2, Archive, ArchiveRestore`. Do NOT add new dependencies. Do NOT introduce a `tours`/`is3DTourAvailable` legacy import.

    **2b. Derived values.** In the component body, after the existing `isSale` derivation, add:
    - `hasTour = !!property.media?.tourUrl` — canonical M3 predicate, same as HospitalityCard.tsx:86 and HomeScreen.tsx:238. This replaces the locked-decision wording `property.is3DTourAvailable && property.tours && property.tours.length > 0` (those fields no longer exist on `Property` per M3 Phase 2 D-20; see scope-note in &lt;context&gt;).
    - `areaSqm = property.basics?.areaSqm` — area cell read.
    - `hasArea = typeof areaSqm === 'number' && areaSqm > 0` — per locked decision 1, hide the cell when missing or zero.
    - `bedrooms = property.basics?.bedrooms`, `hasBeds = !(property.propertyType === 'office' || property.propertyType === 'commercial') && typeof bedrooms === 'number' && bedrooms > 0` — preserve the existing residential-only rule AND additionally hide when value missing/zero (mockup is icon+number only — no `-` placeholder).
    - `bathroomCount = property.basics?.bathroomCount`, `hasBath = typeof bathroomCount === 'number' && bathroomCount > 0`.
    - `status = property.status ?? 'live'` — defensive coalesce, matches StatusPill's D-07 behavior.
    - `isLive = status === 'live'`.
    - `liveBadgeKey = isSale ? 'property.statusBadge.live.sale' : 'property.statusBadge.live.rent'` — deal-type-aware live label per locked decision 3.

    **2c. Image-overlay region (replace the existing `<View style={styles.topBadges}>` + `<View style={styles.topRightActions}>` clusters and the commented-out `bottomBadges` block).**

    - Top-left rent/sale pill: DARK background `rgba(0,0,0,0.55)`, padding `4px 10px`, borderRadius 16, flexDirection row, alignItems center. Inside: a 6×6 red dot (`#EF4444`, borderRadius 3, marginRight 6) followed by the existing uppercase label (`t('property.forSale')` / `t('property.forRent')`) in white, fontSize 11, fontWeight 700, letterSpacing 0.5. Keep the existing non-live `<StatusPill>` mounted below it with `marginTop: 6` (`status !== 'live'` branch) — this preserves the existing `pending`/`rejected`/`archived` rendering exactly. Do NOT remove the StatusPill mount.
    - Top-right share + heart: keep the same two `<TouchableOpacity>` buttons with the same handlers, but change `backgroundColor` from `'rgba(255,255,255,0.9)'` to `'rgba(0,0,0,0.4)'` on BOTH buttons. Replace the `<Text style={{ fontSize: 18, color: '#333' }}>↗</Text>` share glyph with `<Text style={{ fontSize: 18, color: '#FFFFFF', fontWeight: '600' }}>↗</Text>` (white share arrow). The Heart icon already uses `#E91E63` (filled) / `#999` (unfilled); change the unfilled color to `'#FFFFFF'` so an unfavorited heart reads on the new dark button background (filled-red remains `#E91E63` per design brief — heart filled red when favorited is "already correct"). Keep `ActivityIndicator` color logic in sync (`isFavorited ? '#E91E63' : '#FFFFFF'`).
    - Floating price + stats overlay (NEW): absolute-positioned at the bottom of the `imageWrapper`, with `left: 16, right: 16, bottom: 16`, `backgroundColor: 'rgba(0,0,0,0.55)'`, `borderRadius: 16`, `paddingHorizontal: 14`, `paddingVertical: 12`, flexDirection row, alignItems center, justifyContent space-between. Left side: small white eyebrow `ЦЕНА` / `PRICE` (use existing `t('property.price')` — already present as `'Цена'` / `'Price'`; sentence-case is acceptable, do NOT introduce a new uppercase eyebrow key) at fontSize 10, fontWeight 600, letterSpacing 1, opacity 0.7, white; below it the price value via `formatPrice(property, t('property.perMonth'))` at fontSize 22, fontWeight 500, fontFamily Georgia/serif, color `'#FFFFFF'`, `numberOfLines={1}`. Right side: horizontal row of stat cells with `gap: 14`, each cell flexDirection row alignItems center `gap: 4`, icon size 14 color `'#FFFFFF'` strokeWidth 2, value text fontSize 14 fontWeight 600 color `'#FFFFFF'`. Order: bed (only when `hasBeds`), bath (only when `hasBath`), area (only when `hasArea`). Icons: `<Bed/>`, `<Bath/>`, `<Maximize2/>` respectively. Render NOTHING for a cell whose flag is false — do not render an empty wrapper, do not render `-` (the home card is denser than the details screen; labels are intentionally omitted here per design brief).

    **2d. Below-image content region (replace the existing `<View style={styles.contentContainer}>` block).**

    - Row 1 (`flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10`):
      - Left cluster (`flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1`):
        - `<Text>` showing `#{property.listingId}` when `listingId` is set, otherwise render nothing on the left (do NOT render `#` alone). fontSize 13, fontWeight 600, color `colors.text`.
        - Live-only deal-type badge: render only when `isLive`. Pill style `paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, backgroundColor: colors.chipBackground, borderWidth: 1, borderColor: colors.chipBorder, flexDirection: 'row', alignItems: 'center', gap: 6`. Inside: 6×6 green dot (`#22C55E`, borderRadius 3 — same hue as `ListingMetaTable.tsx`'s `availDot`), followed by `t(liveBadgeKey as any)` at fontSize 11, fontWeight 600, color `colors.text`.
        - For non-live statuses, do NOT render the deal-type badge here — the existing `<StatusPill>` mounted in the image-overlay region already covers `pending`/`rejected`/`archived`. This row's badge is the LIVE replacement only.
      - Right cluster: the conditional 3D-tour pill — render only when `hasTour`. `<TouchableOpacity>` with `onPress={(e) => { e.stopPropagation(); onViewTour(property); }}`, `accessibilityRole="button"`, `accessibilityLabel={t('property.tourPill' as any)}`, style `paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14, borderWidth: 1, borderColor: colors.error, backgroundColor: 'transparent', flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 0`. Inside: `<Box size={13} color={colors.error} strokeWidth={2} />` then `<Text>` with `t('property.tourPill' as any)` at fontSize 12, fontWeight 700, letterSpacing 0.5, color `colors.error`. When `hasTour` is false, render nothing — NO greyed-out dead UI per locked decision 2.
    - Row 2 — title: `<Text>` with `property.content?.title ?? ''`, `numberOfLines={2}`, fontSize 22, fontWeight 400, fontFamily `Platform.select({ ios: 'Georgia', android: 'serif' })`, color `colors.text`, `marginBottom: 6, lineHeight: 26`. Drop the previous title-plus-district-suffix synthesis (` • districtLabel`) — district moves to row 3.
    - Row 3 — location: render only when `districtLabel || cityLabel`. `<View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>` with `<MapPin size={14} color={colors.textSecondary} strokeWidth={2} />` then `<Text>` with `[districtLabel, cityLabel].filter(Boolean).join(' · ')`, fontSize 14, color `colors.textSecondary`, `numberOfLines={1}`.
    - Owner-actions row (preserved): render only when `showEditButton` (HomeScreen does NOT pass `showEditButton`, so this row is invisible on the home screen — matches the design). Lift the existing owner-actions IIFE verbatim (Edit + Archive/Unarchive/Delete, same status-driven branching, same icon buttons, same accessibility labels) and mount it as a NEW row below the location row, inside its own `<View>` with `marginTop: 14, flexDirection: 'row', justifyContent: 'flex-end', gap: 10`. Preserve every existing style (`listingActionBtnEdit`, `listingActionBtnArchive`, `listingActionBtnUnarchive`, `listingActionBtnDelete`, shadows, dark-mode `isDark` branch on the Edit button).

    **2e. Removals.**
    - Remove the now-unused `<ListingMetaTable .../>` mount (its ID + Available date were the previous row 1; the new row 1 covers `#<listingId>` and Available date is deferred — see Out of Scope below). DO NOT delete `src/components/ListingMetaTable.tsx` itself; it is still used by `PropertyDetailsScreen` (verified at plan time).
    - Remove the unused `formatAddress` import + the `formatted.line1` / `formatted.line2` IIFE (the address line is replaced by the new MapPin + `district · city` row, which renders the raw join — no two-line formatter needed for a 1-line row).
    - Remove the now-orphaned styles after the refactor: `bottomBadges` (was already commented out), `mediaBadge`, `mediaBadgeText`, `tour3DBadge`, `tour3DBadgeText` (the new 3D-tour pill has inline styles + theme tokens), `contactButton`, `contactButtonText` (already orphaned), the `specsContainer` / `specItem` / `specRow` / `specValue` / `specLabel` / `specDivider` set (specs moved into the image overlay with inline styles — they have no label text in the new design, so a stylesheet entry is overkill and would invite divergence from the overlay sibling). Keep `cardContainer`, `cardContainerGroupedFooter`, `imageWrapper`, `imageWrapperGroupedFooter`, `image`, `topBadges`, `topRightActions`, `shareButton`, `heartButton`, `ownerActionsRow`, and all `listingActionBtn*` entries. Update `topBadges`, `topRightActions`, `shareButton`, `heartButton` only if a numeric value needs to change; otherwise leave them.

    **2f. Invariants to preserve (regression budget = 0).**
    - `groupWithFooter` prop still squares the bottom corners (`cardContainerGroupedFooter` + `imageWrapperGroupedFooter` retained).
    - `onShare` / `onFavorite` props remain wired exactly as before (props signature unchanged).
    - `isLoading` still swaps the heart for an `ActivityIndicator`.
    - `KBD-02` invariant: do NOT introduce `keyboardVerticalOffset` anywhere — this file does not use a KAV, so simply do not add one.
    - The image-overlay region must NOT swallow the card tap. The outer `<TouchableOpacity activeOpacity={0.95} onPress={() => onPress(property)}>` still wraps everything; the share, heart, and 3D-tour pill all use `e.stopPropagation()` on their inner press. Verify by reading the existing share / heart handlers — they already do this; replicate the pattern on the new tour pill.
    - The `formatPrice(property, t('property.perMonth'))` call is preserved verbatim — do NOT inline price formatting.
    - Sale/Rent badge label remains `t('property.forSale')` / `t('property.forRent')` (uppercase macros — the locked decision keeps the EXISTING content for that pill; only the styling changes).

    **2g. Out of scope (do NOT plan or implement these in Task 2).**
    - Surfacing `property.availableDate` on the new card. The old `ListingMetaTable` showed it; the new layout drops it intentionally (mockup has no date affordance on the card). If the user wants it back, that's a follow-up.
    - HospitalityCard — it has its own redesign-ready layout; do not touch.
    - PropertyDetailsScreen — out of scope per the constraints block.
  </action>
  <verify>
    <automated>cd /Users/beckmaldinVL/development/mobileApps/JayTap &amp;&amp; grep -nE "is3DTourAvailable|property\.tours\b" src/components/PropertyCard.tsx; test $(grep -nE "is3DTourAvailable|property\.tours\b" src/components/PropertyCard.tsx | wc -l) -eq 0 &amp;&amp; grep -nE "keyboardVerticalOffset" src/ -r; test $(grep -rnE "keyboardVerticalOffset" src/ | wc -l) -eq 0 &amp;&amp; yarn tsc --noEmit 2&gt;&amp;1 | tail -40</automated>
  </verify>
  <done>
    - `grep` for `is3DTourAvailable` / `property.tours` in PropertyCard.tsx returns 0 hits (legacy fields fully removed, including the previously-commented block).
    - `grep` for `keyboardVerticalOffset` in `src/` returns 0 hits (M1 KBD-02 invariant held).
    - `yarn tsc --noEmit` introduces NO net-new errors attributable to this file (the 3 pre-existing `App.tsx` `Property.tours` errors per STATE.md are not in this file and remain untouched; the new code MUST NOT add to that count for `PropertyCard.tsx`).
    - PropertyCard.tsx still exports `PropertyCard` with the same prop signature (`PropertyCardProps` unchanged).
    - All three new i18n keys from Task 1 are referenced via `t(...)` in PropertyCard.tsx.
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 3: On-device visual QA (iOS sim or device, light + dark, EN + RU)</name>
  <what-built>
    PropertyCard redesigned to match the mockup: dark sale/rent pill with red dot, dark translucent share + heart buttons, floating price + stats overlay on the hero photo, `#&lt;listingId&gt;` + green-dot live badge row, conditional `3D ТУР` pill (only when `media.tourUrl` exists), serif title, MapPin + district · city location row. Owner-actions row still works on screens that pass `showEditButton`. Pending / rejected / archived listings still render their existing `&lt;StatusPill&gt;`.
  </what-built>
  <how-to-verify>
    Run the app on the iOS simulator (or your iPhone) and navigate to the Home screen.

    1. Light mode, EN: home screen shows the redesigned card. Sale listings show a `For sale` badge (green dot) on row 1; rent listings show `For rent`. Title is serif. Location row shows a pin icon + `district · city`.
    2. Light mode, RU: same cards, badges read `В продаже` / `В аренде`, 3D-tour pill reads `3D Тур`.
    3. Toggle to dark mode (Settings → Appearance, or simulator Cmd+Shift+A): hero overlays still read; the floating price card stays legible over the photo; the below-image surfaces (id row, location row, owner actions if any) all use theme tokens (background + text both adapt).
    4. Find a listing with a 3D tour set up (any one with `media.tourUrl`) and confirm the `3D Тур` / `3D Tour` pill renders on row 1 right side. Tap it — the existing Tour flow should open (same as before; this CTA just relocated).
    5. Find a listing WITHOUT a tour and confirm the pill is ABSENT (not greyed out — completely gone).
    6. Find an office or commercial listing — the bed cell in the floating overlay is hidden (only bath + area show).
    7. Find a listing with no `areaSqm` — the area cell in the overlay is hidden.
    8. Sign in as an account that owns at least one listing and open your "My Listings" view (the `showEditButton=true` consumer). Confirm the Edit / Archive / Unarchive / Delete buttons still render in a row below the location row and still work.
    9. Tap the share button and the heart on a card — confirm both still work and that the heart still fills red when favorited.
    10. If any pending / rejected / archived listing is visible to you, confirm the existing yellow / red / grey `StatusPill` still appears (top-left of the image, below the sale/rent badge) — the live-only badge replaces nothing for those statuses.

    Any deviation from the mockup or any regression in the 10 cases above is a blocker.
  </how-to-verify>
  <resume-signal>Type `approved` to confirm, or describe what regressed and I'll fix-forward.</resume-signal>
</task>

</tasks>

<verification>
- `grep -c "property.statusBadge.live.sale\|property.statusBadge.live.rent\|property.tourPill" src/locales/en.ts src/locales/ru.ts` returns ≥3 per file.
- `bash scripts/check-i18n-parity.sh` exits 0.
- `grep -nE "is3DTourAvailable|property\.tours\b" src/components/PropertyCard.tsx` returns 0 lines.
- `grep -rnE "keyboardVerticalOffset" src/` returns 0 lines (KBD-02 grep gate held).
- `yarn tsc --noEmit` net-new error count for `src/components/PropertyCard.tsx` = 0.
- On-device QA passes all 10 cells in Task 3.
</verification>

<success_criteria>
- Home screen `PropertyCard` matches the mockup on iOS sim or device, in both light and dark mode, in both EN and RU.
- Every locked decision is implemented (area cell hides when missing/zero; 3D-tour pill renders ONLY when there is a real tour and tapping it calls `onViewTour`; live-status badge is deal-type-aware and uses the new i18n keys; non-live statuses still render via the existing `StatusPill`).
- No regressions in share, favorite, owner-actions, or `groupWithFooter` behavior.
- M1 KBD-02 grep gate held; no new TypeScript errors in `PropertyCard.tsx`.
</success_criteria>

<output>
After completion, create `.planning/quick/260526-ebl-redesign-home-card/260526-ebl-SUMMARY.md` capturing:
- Final commits (expected 2 small commits: i18n keys, then PropertyCard refactor; a 3rd consumer-touch commit only if Task 2 surfaced one — likely none).
- Net file diff stats.
- Confirmation of the four grep / tsc invariants.
- The 10-cell on-device QA result table.
- Any deviations from the locked decisions and why (none expected — but record the scope-note about `media.tourUrl` vs the legacy `is3DTourAvailable && tours[]` wording so future archeology is short).
</output>

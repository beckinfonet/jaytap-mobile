# Phase 6: Hospitality Rendering - Context

**Gathered:** 2026-04-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Render Hostel/Hotel listings as a distinct, price-free, tour-first product across Home, Favorites, and OwnerListings (separate `HospitalitySection` strip), as a `HospitalityCard` variant, and on `PropertyDetailsScreen`. Add the 12-item amenity multi-select to `HospitalitySection` of the create form. Wire amenity validation + payload + tests carried forward from Phase-5 D-13/14/15. EN+RU parity for the 12 amenity labels and all new section/badge strings. Close STATE.md WR-03 by consolidating `HomeScreen.tsx:48-49` taxonomy imports to `propertyCategory.ts`.

Out of scope (belongs elsewhere):
- Per-night pricing or booking calendars (PROJECT.md Out of Scope — locked decision)
- New property categories/types (Phase 4 taxonomy frozen)
- New role gates (Phase 3 `useRole()` / `<Gated>` surface frozen)
- Edit-flow correctness or new validation rules outside amenities (Phase 5 closed)
- Visual alignment fixes from screenshots (Phase 7)
- Privacy manifest / Xcode 26 SDK / version bump (Phase 8)
- M2 owner-side moderation chrome on hospitality cards (M2 — MOD-01..06)
- Listing-specific contact override (M2 — owner profile remains source of truth per Phase-5 D-09)
- Migration to `react-hook-form` + `zod` (M2+ — `useState` + pure validator stays per PROJECT.md)
- 2GIS native map bridge (separate milestone — `2GIS_BRIDGE_PLAN.md`)

</domain>

<decisions>
## Implementation Decisions

### List section composition (HOSP-01 / HOSP-02)

- **D-01:** `HospitalitySection` renders as `ListHeaderComponent` at the top of the screen's primary `FlatList` on Home, Favorites, and OwnerListings. The section's inner content is a horizontal `FlatList` of `HospitalityCard`s. Vertical residential/commercial cards render as the screen's normal `data` source. Section is hidden entirely (no header, no empty placeholder) when zero hospitality listings exist (HOSP-01 success criterion 1).
- **D-02:** Section header = title + count chip. Render as e.g. `"Hostels & Hotels (12)"` using a new i18n cluster: `home.hospitalitySectionTitle` and `home.hospitalitySectionCount` (with `{count}` interpolation). EN+RU parity required (`scripts/check-i18n-parity.sh` enforces).
- **D-03:** When the user taps a specific `Hostel` or `Hotel` filter chip in the type-filter row, **collapse the vertical residential/commercial list** and render the hospitality cards as the vertical `FlatList` using the same `HospitalityCard`. Mental model: the filter narrows the entire screen to hospitality. The horizontal strip is for incidental discovery while browsing residential or commercial.
- **D-04:** Promote the existing binary `isCommercial` toggle in `HomeScreen.tsx` to a tri-state `selectedCategory: 'Residential' | 'Commercial' | 'Hospitality'`. When `Hospitality` is active, vertical list = hospitality cards; the horizontal strip is not rendered (would be redundant). When `Residential` or `Commercial` is active, vertical list filters to that category and the hospitality strip renders at top via `ListHeaderComponent` per D-01.
- **D-05:** HOSP-02 — under both `Rent` and `Sell` `transactionType` toggle states, hospitality cards render with no price block in either case. Hospitality filter logic respects `transactionType` (a Hostel listed `type === 'sale'` shows under Sell; `type === 'rent'` shows under Rent) but does NOT apply price-based filters (since price is hidden by design).
- **D-06:** `FavoritesScreen` and `OwnerListingsScreen` apply the same section composition pattern (top horizontal strip via `ListHeaderComponent` + vertical residential/commercial list). On `OwnerListingsScreen`, the strip is the user's own hospitality listings only — strip stays hidden when empty. **No tri-state toggle on these two screens** — they're context-specific lists, not filter-driven; the strip is always at top when populated.

### HospitalityCard design (HOSP-03)

- **D-07:** Ship a separate `src/components/HospitalityCard.tsx`. Do NOT branch `PropertyCard.tsx` (currently 417 LOC) on a `variant` prop. Lower regression risk on the residential/commercial cards; cleaner contract since hospitality cards have substantively different content (no price chip, tour-thumbnail emphasis, rooms+amenities body). Reuses `useTheme()` + share/favorite/edit/delete handler shapes from `PropertyCard` but lives in its own file.
- **D-08:** Hero image = first tour's `thumbnailUrl` when `property.tours.length > 0 && property.tours[0].thumbnailUrl` exists; otherwise fall back to `property.imageUrl`. When tours exist, render the existing-style 3D Tour badge (matching `PropertyCard.tsx:300` `tour3DBadge` placement pattern) bottom-left on the hero overlay.
- **D-09:** Type badge — small pill chip overlaid **top-left** of the hero image showing `t('hospitality.badge.hostel')` / `t('hospitality.badge.hotel')` (new i18n keys, EN+RU parity). Theme tokens only — no hardcoded background or text color. Doesn't compete with the bottom-left tour badge.
- **D-10:** Card body = a single row `{rooms} {t('hospitality.rooms')} · {maxGuests} {t('hospitality.maxGuests')}` + a horizontal chip row of the first 2-3 selected amenities (with icon prefix per D-23) + `+N more` overflow chip if total amenities > 3. **No** bedrooms/bathrooms/sqm row from `ListingMetaTable`. **No** price chip. **No** `formatPrice()` invocation.
- **D-11:** Share message excludes price. Format: `"{title}\n{address}\n\n{shareUrl}"`. Adjust `getShareMessage` (or inline at `HospitalityCard`'s share handler) to omit the `priceText` line. Helper extraction vs inline branch is Claude's discretion at planning time.
- **D-12:** Favorite/edit/delete chrome stays — same handler prop shapes as `PropertyCard`. Owner-context edit/delete actions on `OwnerListingsScreen` remain wired through `HospitalityCard`.

### PropertyDetailsScreen Hospitality view (HOSP-04)

- **D-13:** Branch in-place inside the existing 1684-LOC `PropertyDetailsScreen.tsx`. Derive `category = propertyTypeToCategory(property.propertyType)` near the top of the component (mirrors Phase 5's orchestrator pattern). Conditional renders swap:
  - Tour position (D-14)
  - Price block presence (D-15)
  - Footer composition (D-16)
  - Amenity rendering (D-23 — chip-with-icon block instead of `features` rendering)
  All other parts (header, gallery, description, owner identity, share, favorite, video link, panoramic photos link, schedule viewing) reuse existing logic unchanged.
- **D-14:** Tours promoted **above the image gallery** when `category === 'Hospitality'`. Reuse the existing `TourHeroCard` component (+ `.android.tsx` platform variant) in the slot currently above the gallery. Existing residential tour rendering position is unchanged.
- **D-15:** Remove the `priceContainer` block (`PropertyDetailsScreen.tsx:752-755`) entirely when `category === 'Hospitality'`. **No** "Price" label, **no** `t('property.contactForPricing')` placeholder filler — the slot is gone. No new i18n key needed.
- **D-16:** Sticky bottom bar with three icon buttons — WhatsApp / Telegram / Phone — replacing the residential price-block footer area when `category === 'Hospitality'`. Reuses the existing `whatsappButton` / `telegramButton` handlers (`PropertyDetailsScreen.tsx:246-280`). For phone, reuse the `tel:` linking pattern (already exists at `:268` as the WhatsApp fallback). Each button is **disabled (opacity 0.4 + no `onPress`)** when its corresponding owner field is empty (`!owner?.whatsapp` / `!owner?.telegram` / `!owner?.phone`). When all three are empty, all three render disabled (per Phase-5 D-09 hybrid which permits hospitality listings with empty contacts) — no inline warning. Wraps in `SafeAreaView` insets to match existing sticky-bar conventions (`BottomNavigator`).
- **D-17:** Panoramic media link stays at its current position in the media row alongside photos/videos (`PropertyDetailsScreen.tsx:513-520`). HOSP-04's "panoramic media surfaced" requirement is satisfied by current positioning — no promotion above the gallery needed.

### Amenity picker UX + storage (HOSP-05 + Phase-5 D-13/14/15 carry-forward)

- **D-18:** Inline chip-toggle grid in `HospitalitySection.tsx`, replacing the current `t('hospitality.amenitiesPhase6Placeholder')` hint at lines 100-102. 12 chips wrap in a flex grid using `commonStyles.chip` / `commonStyles.chipRow` (same pattern as `PriceSection`'s currency chips). Tap toggles selected/unselected state; selected chip uses theme accent color. No `LayoutAnimation` on toggle (parity with currency chip behavior).
- **D-19:** Canonical storage tokens via `as const` string-literal union exported from a new file `src/utils/hospitalityAmenities.ts` (mirrors `propertyCategory.ts` shape):
  ```ts
  export const HOSPITALITY_AMENITIES = [
    'wifi', 'aircon', 'heating', 'kitchen', 'breakfast', 'parking',
    'reception24', 'laundry', 'hotwater', 'commonarea', 'lockers', 'ensuite',
  ] as const;
  export type HospitalityAmenity = typeof HOSPITALITY_AMENITIES[number];
  ```
  i18n labels keyed `amenity.wifi` / `amenity.aircon` / `amenity.heating` / `amenity.kitchen` / `amenity.breakfast` / `amenity.parking` / `amenity.reception24` / `amenity.laundry` / `amenity.hotwater` / `amenity.commonarea` / `amenity.lockers` / `amenity.ensuite` in EN + RU parity (24 new translation keys).
- **D-20:** Add new field `amenities?: HospitalityAmenity[]` to `src/types/Property.ts`. Distinct from existing `features?: string[]` (residential/commercial open-ended free text — unchanged). On read of legacy listings, missing `amenities` is treated as `[]` — no migration needed (clean-slate per PROJECT.md).
- **D-21:** `FormBag.amenities` type tightens from `string[]` to `HospitalityAmenity[]` in `src/components/CreateListingForm/types.ts`. Existing `CreateListingScreen.tsx:111` `useState<string[]>([])` narrows to `useState<HospitalityAmenity[]>([])`. The `onChange('amenities', value as string[])` cast at `:180` updates accordingly.
- **D-22:** Validator extension (Phase-5 D-13/14/15 close-out):
  - `validateByCategory` Hospitality branch — add `if (values.amenities.length < 1) errors.amenities = 'amenity.errors.atLeastOne'` (or equivalent i18n key under the `amenity.errors.*` cluster).
  - `buildPayloadByCategory('Hospitality', values)` — add `amenities: values.amenities` to the returned payload.
  - `validators.test.ts` — extend Hospitality test cases with: (a) happy-path with non-empty `amenities` → `isValid: true`; (b) empty `amenities` → `isValid: false` + `errors.amenities` non-empty; (c) payload assertion that hospitality builds include `amenities` and residential/commercial builds exclude it.
- **D-23:** Detail-view amenity rendering — `lucide-react-native` icons (already in dep stack — `ImageIcon` is used at `PropertyDetailsScreen.tsx:518`). One icon per amenity. Render as a 2-column chip grid using `commonStyles.chip` pattern with icon left + label right. **Replaces** the existing `features.map(...)` rendering when `category === 'Hospitality'`; residential/commercial features rendering is unchanged.
- **D-24:** Close STATE.md WR-03 — `HomeScreen.tsx:48-49` local `RESIDENTIAL_TYPES`/`COMMERCIAL_TYPES` arrays are deleted; imports switch to `import { RESIDENTIAL_TYPES, COMMERCIAL_TYPES, HOSPITALITY_TYPES, propertyTypeToCategory } from '../utils/propertyCategory'`. The new tri-state `selectedCategory` (per D-04) replaces the binary `isCommercial` boolean. Filter logic at `HomeScreen.tsx:112-174` rewrites to use `propertyTypeToCategory()` derivation rather than array `.some()` membership tests.

### Claude's Discretion

- Exact `lucide-react-native` icon name per amenity (e.g. `BellConcierge` vs `Bell` for `reception24`; `Snowflake` vs `Wind` for `aircon`). Researcher confirms the icon set during `/gsd-research-phase 6`; planner finalizes — fallback is generic `Check` icon if a specific match is unavailable.
- i18n key namespace for the amenity validation error — `amenity.errors.atLeastOne` vs extending `validation.form.*` (Phase-5 Claude's-discretion parking lot). Pattern must be consistent with whatever Phase 5 picks; planner aligns.
- Whether the share-message helper gets a category-aware refactor (single `getShareMessage(property)` in `src/utils/`) or `HospitalityCard` inlines the share text branch. Planner picks based on call-site count.
- Whether `HospitalitySection` lives as its own file (`src/components/HospitalitySection.tsx`) or inside `HospitalityCard.tsx`. Recommended: separate file when the count chip + horizontal `FlatList` exceeds ~80 LOC; planner decides.
- Sticky bottom bar exact height + safe-area handling (fixed `64` vs measured insets). Recommended `SafeAreaInsets`-aware via existing `useSafeAreaInsets()` if already in stack; planner confirms.
- Whether to add an "all contacts empty" CTA fallback on the sticky bar (e.g. "Contact via in-app chat"). M1 default per D-16 = three disabled buttons. Captured as a deferred idea below for future polish.

### Folded Todos

None — no pending todos surfaced this session that map cleanly into Phase 6 scope.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope + requirements
- `.planning/ROADMAP.md` §"Phase 6: Hospitality Rendering" — phase goal + 5 success criteria + dependencies (Phase 4 taxonomy + Phase 5 form validation)
- `.planning/REQUIREMENTS.md` §HOSP-01..06 — verbatim per-requirement spec; HOSP-05 names the 12-amenity taxonomy
- `.planning/PROJECT.md` §"Active — Listing form overhaul" — hospitality-section + no-price + tour-first decisions carried forward
- `.planning/PROJECT.md` §"Out of Scope" — Hospitality showcase-only locks (no per-night pricing, no booking calendar) — load-bearing constraint
- `.planning/PROJECT.md` §"Key Decisions" rows on hospitality (separate section, both Rent and Sell, showcase-only)
- `.planning/STATE.md` §"Three WR-advisories deferred with ownership mapped" — WR-03 explicitly assigns the `HomeScreen.tsx:48-49` taxonomy consolidation to Phase 6 (closed via D-24)

### Phase-5 carry-forward (LOAD-BEARING)
- `.planning/phases/05-listing-form-validation-edit-flow/05-CONTEXT.md` §"Hospitality amenities (deferred to Phase 6)" — D-13 / D-14 / D-15 explicit handoff: amenity validation (`amenities.length >= 1`) + payload inclusion (`amenities: values.amenities`) + `validators.test.ts` extension MUST land in this phase (closed via D-22)
- `.planning/phases/05-listing-form-validation-edit-flow/05-CONTEXT.md` §"Hospitality contact validation" — D-09 hybrid trigger rule informs D-16 sticky-contact-bar disabled-all behavior
- `.planning/phases/05-listing-form-validation-edit-flow/05-CONTEXT.md` §"Currency type tightening" — D-18 establishes the `as const` string-literal union pattern that D-19 mirrors for `HospitalityAmenity`

### Phase-4 carry-forward
- `.planning/phases/04-listing-form-taxonomy-decomposition/04-UI-SPEC.md` — design contract; HospitalityCard, HospitalitySection picker MUST use existing tokens/spacing without extension
- `.planning/phases/04-listing-form-taxonomy-decomposition/04-RESEARCH.md` — Pattern 1 (conditional section mounts), Pattern 2 (section-props contract), Pitfall 5 (i18n-parity grep)
- `src/components/CreateListingForm/HospitalitySection.tsx` (lines 100-102) — current `amenitiesPhase6Placeholder` hint Phase 6 replaces with the chip grid (D-18)

### Phase-3 carry-forward (no new gating)
- `.planning/phases/03-role-gating-precursor/03-CONTEXT.md` — `useRole()` / `<Gated>` contract — Phase 6 introduces no new role gates; existing Matterport/panoramic gates already cover admin-only fields and apply unchanged

### Codebase conventions + structure
- `.planning/codebase/CONVENTIONS.md` — file placement (`src/utils/` for pure utilities; `src/components/` flat layout), naming (SCREAMING_SNAKE_CASE constants, named exports, plain `export function ComponentName`), theme-token usage, EN+RU parity
- `.planning/codebase/STRUCTURE.md` — flat-file `src/components/` layout (no nested folders); `src/types/` for shared domain models
- `CLAUDE.md` — M1 testing bar (manual physical-device QA), `useTheme()` / `useLanguage()` requirement, no hardcoded colors

### Files the implementation will touch (current shape)
- `src/types/Property.ts` (66 LOC) — add `amenities?: HospitalityAmenity[]` per D-20
- `src/utils/hospitalityAmenities.ts` — **net-new** per D-19: `HOSPITALITY_AMENITIES` `as const` array + `HospitalityAmenity` type
- `src/utils/propertyCategory.ts` — already exports `HOSPITALITY_TYPES` + `propertyTypeToCategory` (Phase 4); D-24 consumers import from here
- `src/components/CreateListingForm/types.ts` — tighten `FormBag.amenities` to `HospitalityAmenity[]` per D-21
- `src/components/CreateListingForm/HospitalitySection.tsx` — replace placeholder hint at lines 100-102 with the inline chip-toggle grid per D-18
- `src/components/CreateListingForm/validators.ts` — extend `validateByCategory` Hospitality branch + `buildPayloadByCategory` Hospitality branch per D-22
- `src/components/CreateListingForm/__tests__/validators.test.ts` — add ~3-5 amenity-required + amenity-in-payload assertions per D-22
- `src/screens/CreateListingScreen.tsx` (~871 LOC orchestrator) — tighten `useState` generic for `amenities` to `HospitalityAmenity[]` per D-21; no other changes (chip grid lives entirely inside `HospitalitySection`)
- `src/components/HospitalityCard.tsx` — **net-new** per D-07..D-12 (~250-300 LOC estimate; mirrors PropertyCard.tsx structure)
- `src/components/HospitalitySection.tsx` — **net-new** per D-01/D-02 (or co-located in HospitalityCard.tsx — Claude's discretion); horizontal FlatList of HospitalityCards + count-chip header
- `src/screens/HomeScreen.tsx` (683 LOC) — promote `isCommercial` → `selectedCategory` tri-state per D-04; consolidate WR-03 type imports per D-24; render `HospitalitySection` strip via `ListHeaderComponent` per D-01..D-05
- `src/screens/FavoritesScreen.tsx` (227 LOC) — render `HospitalitySection` strip via `ListHeaderComponent` per D-06
- `src/screens/OwnerListingsScreen.tsx` (193 LOC) — render `HospitalitySection` strip via `ListHeaderComponent` per D-06 (filter scoped to current user's hospitality listings)
- `src/screens/PropertyDetailsScreen.tsx` (1684 LOC) — branch on `category` for tour position (D-14), price-block removal (D-15), sticky-contact bottom bar (D-16), amenity chip rendering (D-23)
- `src/locales/en.ts` + `src/locales/ru.ts` — add ~30 new keys in parity: 12 `amenity.*` labels, 1 `amenity.errors.*` validation key, 2 `home.hospitalitySection*` (title + count interpolation), 2 `hospitality.badge.*` (hostel + hotel), plus a few section-internal keys planner identifies
- `__tests__/App.test.tsx` — should not break; if it does, fix in scope of Phase 6 (Phase-5 baseline preserved)

### External spec references
- None net-new — phase is internal feature work against HOSP-01..06.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/utils/propertyCategory.ts` — `HOSPITALITY_TYPES` array, `RESIDENTIAL_TYPES`, `COMMERCIAL_TYPES`, `propertyTypeToCategory()`, `PROPERTY_TYPE_TO_CATEGORY` Record. Hospitality branching consumed everywhere; D-24 consolidates `HomeScreen.tsx:48-49` to import from here.
- `src/components/CreateListingForm/types.ts` — `FormBag` already has `amenities`; `FormErrorBag`, `SectionProps` contract piped to all sub-components. Extend, don't reshape.
- `src/components/CreateListingForm/styles.ts` — `commonStyles.chip` / `chipRow` already used by PriceSection currency chips and CreateListingScreen property-type chips. Amenity grid (D-18) reuses these tokens directly.
- `src/components/CreateListingForm/validators.ts` — Phase 5 home for `validateByCategory` + `buildPayloadByCategory`. Phase 6 extends both Hospitality branches per D-22.
- `src/components/CreateListingForm/HospitalitySection.tsx` — current minimum-field shape; lines 100-102 carry the `amenitiesPhase6Placeholder` hint that D-18 replaces.
- `src/components/PropertyCard.tsx` (417 LOC) — share / favorite / edit / delete handler shapes. `HospitalityCard` mirrors structure (per D-07) without copy-paste; uses similar chrome + theme tokens.
- `src/components/TourHeroCard.tsx` + `src/components/TourHeroCard.android.tsx` — platform-split Matterport hero card. Reused for D-14 "tours promoted above gallery" rendering on PropertyDetailsScreen.
- `src/utils/formatPrice.ts` — used by PropertyCard / PropertyDetailsScreen / share message construction. Hospitality skips entirely (D-10, D-11, D-15).
- `lucide-react-native` — already in dep stack (`ImageIcon` at `PropertyDetailsScreen.tsx:518`, `ChevronRight` at `:520`). Amenity icons (D-23) source from here.
- `KeyboardAwareScrollView` from `react-native-keyboard-controller` — already wraps the create form (Phase 2). Amenity chip grid in `HospitalitySection` renders inside it; no separate scroll wiring.
- `whatsappButton` / `telegramButton` styles + handlers (`PropertyDetailsScreen.tsx:246-280`, `:1486-1489`) — sticky-contact bar (D-16) reuses these.

### Established Patterns
- **Pure-function + `as const` string-literal union for taxonomies** — `PROPERTY_TYPE_TO_CATEGORY` (Phase 4), `Currency` (Phase 5 D-18). `HOSPITALITY_AMENITIES` mirrors verbatim per D-19.
- **Chip-based multi-choice UX** — currency chips (`PriceSection`), property-type chips (`CreateListingScreen`), category chips (`CreateListingScreen`). Amenity grid (D-18) reuses `commonStyles.chip` + theme accent color for selected state.
- **Theme tokens only / i18n keys only** — enforced by tsc `Record<TranslationKeys,string>` gate + `scripts/check-i18n-parity.sh` CI gate.
- **Named exports, no default, plain `export function ComponentName`** — every existing component follows. `HospitalityCard` and `HospitalitySection` follow.
- **Validator-stays-pure (role-agnostic + screen-agnostic)** — Phase 5 specifics. Amenity validation (D-22) extends the same pure-function pattern; no `useRole`, no React imports in `validators.ts`.
- **Conditional section mount in orchestrator** (Phase 4 Pattern 1) — `PropertyDetailsScreen` Hospitality branching per D-13 uses the same in-place-conditional shape (no file split, no separate screen).
- **`SafeAreaInsets`-aware sticky bars** — pattern established in `BottomNavigator` + auth headers. D-16 sticky-contact bar follows.
- **Co-located `__tests__/` Jest pattern** — `src/components/CreateListingForm/__tests__/validators.test.ts` exists from Phase 5; D-22 extends it.

### Integration Points
- **HomeScreen filter rewrite** — `isCommercial: boolean` → `selectedCategory: 'Residential' | 'Commercial' | 'Hospitality'` is the central state change. Filter logic at lines 112-174 routes through `propertyTypeToCategory(p.propertyType)` instead of array `.some()` membership tests. D-24 consolidates the duplicate `RESIDENTIAL_TYPES`/`COMMERCIAL_TYPES` arrays.
- **HospitalitySection on 3 screens** — same component shape, rendered as `ListHeaderComponent` in each screen's primary `FlatList`. Hidden when its inner `data` is empty.
- **PropertyDetailsScreen branching** — early `category` derivation; rest of the 1684-LOC screen uses conditional render (D-13), not file split.
- **CreateListing amenities flow** — chip-grid taps update `setAmenities(prev => prev.includes(token) ? prev.filter(a => a !== token) : [...prev, token])`. State already wired at `CreateListingScreen.tsx:111`; D-18 just replaces the placeholder hint with the picker UI; D-21 narrows the type.
- **Validator + payload extension** — single edit each to `validateByCategory` and `buildPayloadByCategory` Hospitality branches (D-22). Phase 5's `validators.test.ts` gets ~3-5 new assertions.
- **`amenities` field on Property** — backend payload includes `amenities: HospitalityAmenity[]` for hospitality listings only (D-20, D-22). Backend coordination not required (clean-slate per PROJECT.md).
- **Sticky bottom bar (D-16)** — replaces residential price-block footer area; reuses existing whatsapp/telegram styles + handlers; phone-action via `Linking.openURL('tel:${owner.phone}')`.
- **Tour-promotion above gallery (D-14)** — render `TourHeroCard` in the hospitality slot above the gallery; the residential below-gallery slot is unchanged.
- **Detail-view amenity rendering (D-23)** — replaces `features.map(...)` rendering when `category === 'Hospitality'`; 2-column chip grid with `lucide-react-native` icon left + `t('amenity.{token}')` label right.

</code_context>

<specifics>
## Specific Ideas

- **"Tour-first" is the user-facing differentiator throughout the discussion** — tour thumbnail on the card hero (D-08), tour promoted above the gallery on the detail screen (D-14). Mirrors PROJECT.md's stated positioning ("with curated 3D Matterport tours and panoramic imagery as a differentiator for hostels, hotels, and premium listings").
- **The 12-amenity taxonomy is THE contract** — REQUIREMENTS.md HOSP-05 names them explicitly: WiFi, Air conditioning, Heating, Kitchen, Breakfast, Parking, 24h reception, Laundry, Hot water, Common area, Lockers, En-suite bathrooms. Storage tokens are locked in this discussion (D-19). Future amenity additions become a roadmap concern (e.g. "M2 amenity expansion"), not a Phase 6 ad-hoc addition.
- **Three top-level categories on HomeScreen mirrors the create form's three category chips** — consistency between browse and create surfaces. The user creating a Hostel via the three-chip group on `CreateListingScreen` finds the same three-toggle mental model when filtering on `HomeScreen` (D-04).
- **"Hidden when empty" is the universal rule for the strip** — applies to `HospitalitySection` on all three screens (Home / Favorites / OwnerListings) without exception. No "Coming soon" placeholder, no dimmed empty state. The strip simply does not render.
- **Phase-5 D-09 hybrid contact rule means hospitality listings can be saved with all-empty contacts** — D-16 sticky bar handles this case by disabling all three buttons (no error, no warning). Defensible because the listing was created intentionally under D-09 hybrid pass-through.
- **Owner contact fields are the source of truth** — per Phase 5 D-09 + the existing `loadUserProfile` flow at `CreateListingScreen.tsx:287-307`. Phase 6 does NOT introduce listing-specific contacts. M2 may revisit if hospitality owners ask for per-listing contacts that differ from their profile.
- **Zero-regression stance** — Phase 4's D-09 handleSubmit anchors (`panoramicPhotosUrl` + `tours` unconditional in payload) and Phase 5's `buildPayloadByCategory` shape are load-bearing. Phase 6 must preserve them when extending the Hospitality branch — researcher's first verification is a diff of `validators.ts` showing D-09 anchors still ship in every category's payload.
- **`<Gated>` invariant preserved** — Phase 3's grep CI gate (`./scripts/check-role-grep.sh`) must continue to exit 0 across all Phase 6 commits. Phase 6 introduces no new role gates and no new admin-gated UI (Matterport/panoramic gates remain the only ones, located inside the Phase 4 sub-components and untouched here).
- **Consistency with create-form chip vocabulary** — the amenity picker (D-18) uses the same `commonStyles.chip` shape as currency chips and property-type chips. Tap behavior, theme tokens, and typography match. No new style surface.

</specifics>

<deferred>
## Deferred Ideas

### Future polish (post-M1)
- **All-empty-contact "Chat fallback" CTA on hospitality detail** — Phase-5 D-09 hybrid permits hospitality listings with all-empty owner contacts (chat fallback applies). D-16 disables all three buttons in that case. A future polish phase (or M2) could surface a "Contact via in-app chat" button when all owner contact fields are empty. Phase 6 ships disabled buttons only.
- **Tour-first detail page for residential listings** — HOSP-04 promotes tours for hospitality only. Residential keeps its current order. If user feedback signals tour discovery is weak for residential too, a later phase could generalize the "tours above gallery" rule.

### M2 territory (locked elsewhere)
- **Owner-side moderation chrome on hospitality cards** — approve / flag / edit-on-behalf actions belong to M2 (MOD-01..06). `HospitalityCard` ships without M2 admin chrome.
- **Listing-specific contact override** — currently the owner profile is the source of truth (Phase-5 D-09). M2 may revisit if hospitality owners want per-listing contacts.
- **Per-night pricing / booking calendar** — locked Out of Scope per PROJECT.md (showcase-only by design).
- **Chat moderation tooling** — M2.

### Reviewed Todos (not folded)
None reviewed-but-deferred this session.

### Claude's-discretion parking lot (if planner raises)
- If `colors.error` was added to `ThemeContext` in Phase 5, Phase 6 reuses it for any error chrome (e.g. amenity validation error text). If Phase 5 went the inline `#D32F2F` route, Phase 6 follows that precedent.
- Exact `lucide-react-native` icon per amenity (D-23) — researcher confirms during `/gsd-research-phase 6`.
- Whether `HospitalitySection.tsx` is its own file or embedded inside `HospitalityCard.tsx` (Claude's discretion in D-Decisions).
- Whether the share-message helper (`getShareMessage(property)`) gets a category-aware refactor or `HospitalityCard` inlines the omit-price branch (D-11).

</deferred>

---

*Phase: 06-hospitality-rendering*
*Context gathered: 2026-04-24*

# Listing Form + Detail Polish — Design Spec

**Date:** 2026-05-25
**Scope:** v4.0.1 hotfix bundle (post-M4 ship)
**Author:** brainstormed with Claude
**Status:** Draft — awaiting user approval

## Context

Post-ship on-device QA of v4.0 surfaced five UI/UX issues — two trivial (CSS + label), three substantive (stepper contrast in dark mode, amenities multi-select missing from the new contextual form, and the listing-detail "info row" rendering raw enum values as flowing text instead of an Airbnb-style tile grid).

The amenity gap is a regression: the M2/M3 `CreateListingForm` captured amenities via a 12-item hospitality multi-select, but the M3 `ContextualListingFlow` refactor dropped the field entirely while leaving `property.amenities` on the schema and the detail-screen reader intact — so existing properties keep their amenities, new ones cannot set any, and the section renders empty.

The detail-page text-row issue is partly a localization gap (raw `euro`, `3_months` enum values leaking through) and partly a visual treatment problem — flowing text fails the Airbnb-inspired information-density bar the rest of the app aims for.

## Issues and Fixes

### Issue 1 — Stepper +/− buttons low contrast in dark mode

**Symptom:** On the `ContextualListingFlow` Step 3 "Basic information" screen, the Bedrooms and Bathrooms counter circles render near-white (`#E0E0E0`) on a near-black background, but the +/− glyphs are washed-out gray — the buttons look like soft pills with barely-readable icons.

**Root cause:** `src/components/StepperInput.tsx:103` sets `circleBg = colors.activeChipBackground ?? colors.border`. `activeChipBackground` is the **selected-chip pop** color in the dark palette (`#E0E0E0` per `src/theme/colors.ts:48`), reused inappropriately. The glyph color falls back to `textSecondary` (`#A0A3A8`), producing the gray-on-near-white that's hard to read.

**Fix:** In `StepperInput.tsx`, replace the circle background with the brand-orange token (matches the "Editing on behalf" banner accent on Step 3) and force a white glyph regardless of theme. Disabled state: `opacity: 0.4` on the whole button.

- Light mode: brand orange on white background → strong contrast.
- Dark mode: brand orange on near-black background → strong contrast.
- Disabled (e.g., bedroom count at min 0): orange dim, glyph still white.

Acceptance: +/− is unambiguously readable at glance distance on both themes; tapping disabled state is visually distinct.

### Issue 4 — Back-button chevron stacks above label

**Symptom:** On every step of the listing wizard, the footer "Back" button renders the `ChevronLeft` icon on the line above the "Back"/"Назад" text instead of inline.

**Root cause:** `src/components/ContextualListingFlow/styles.ts:76` `footerButton` style omits `flexDirection`, so it defaults to `column`. The footer **container** has `flexDirection: 'row'`, but each button is its own column-stack.

**Fix:** Add `flexDirection: 'row'` and `gap: 6` to `footerButton`. Single property change.

Acceptance: Chevron and label render inline on both Back and Next buttons across all 6 steps.

### Issue 5 — "Своё" label is unclear

**Symptom:** On Step 6 ("Deal conditions"), the prepayment chip row offers `Без предоплаты | 1 месяц | 2 месяца | Своё`. The fourth chip's label ("Своё" = "one's own") is unclear at first read — user reports not knowing what it does.

**Root cause:** Translation is too terse. The chip's behavior (open a custom-months input) is correct and wired (`Step6DealConditions.tsx:287-330`).

**Fix:** Rename the i18n value, no structural change:

- `contextualListing.step6.prepayment.custom` — RU `Своё` → `Указать своё`; EN `Custom` → `Enter custom`.
- Chip auto-grows to fit the longer label; no layout change needed.

Acceptance: Chip label is self-explanatory at first read; tap behavior unchanged.

### Issue 2 — Restore amenities to listing form, per property type

**Symptom:** The listing detail "What this place offers" section renders empty for every property created via the new ContextualListingFlow. Pre-existing properties created via the old form still display their amenities correctly.

**Root cause:** `src/components/ContextualListingFlow/types.ts:35-39` `conditionAndAmenities` slice has only `condition` + `furnished` — no `amenities` field. `Step4ConditionAmenities.tsx` is named for amenities but only renders condition (4 chips) and furnished (2 chips). Submission therefore never sets `property.amenities`, leaving it `undefined` server-side. Detail screen `PropertyDetailsScreen.tsx:1095-1115` reads `property.amenities ?? []` and renders nothing.

#### Fix

**Data model — no backend change.** `Property.amenities: HospitalityAmenity[]` already exists on the Mongoose schema and the RN type (`src/types/Property.ts:35`). Broaden the TypeScript union from `HospitalityAmenity` to a new `Amenity` superset. Mongo stays string-array; existing values keep working.

**New file `src/utils/amenities.ts`** — single source of truth for:

- `Amenity` union (superset of all tokens across all property types).
- `AMENITY_ICONS: Record<Amenity, LucideIcon>` mapping.
- `AMENITY_LABEL_KEYS: Record<Amenity, string>` i18n key lookup (`amenity.<token>` convention preserved).
- `getAmenitiesForPropertyType(type: PropertyType): Amenity[]` resolver.

Existing `src/utils/hospitalityAmenities.ts` constants fold into the new file. Hospitality consumers (`HospitalityCard`, `PropertyDetailsScreen` hospitality branch) update to import from the new path.

**Per-property-type amenity sets:**

| Property type | Token set |
|---|---|
| **Residential** (`apartment`, `house`) | `aircon`, `heating`, `wifi`, `hotwater`, `washer`, `dryer`, `parking`, `garage`, `balcony`, `elevator`, `gasStove`, `petFriendly` |
| **Hospitality** (`hotel`, `hostel`) | `wifi`, `aircon`, `heating`, `kitchen`, `breakfast`, `parking`, `reception24`, `laundry`, `hotwater`, `commonarea`, `lockers`, `ensuite` (unchanged) |
| **Commercial** (`office`, `commercial`) | `aircon`, `heating`, `wifi`, `parking`, `security` |

**Form change — extend Step 4.** `Step4ConditionAmenities.tsx` keeps condition + furnished, appends a new "What this place offers" section below with a multi-select chip grid resolved from `formBag.dealAndPropertyType.propertyType`. Optional field, no validation gate (matches v4.0's "every new field optional everywhere" design rule). Empty selection = empty amenities array. Rehydrates from `property.amenities` on edit.

**Rehydration / propertyType-change behavior:** On edit-mode hydration, the form initializes `formBag.conditionAndAmenities.amenities` to `property.amenities ∩ getAmenitiesForPropertyType(currentType)` — any out-of-set tokens (e.g., a `breakfast` left over on a property re-typed from hostel to apartment) are dropped silently and won't be written back. `getAmenitiesForPropertyType()` returns `[]` for any unrecognized property type so the section just doesn't render.

**Form-bag type extension** (`src/components/ContextualListingFlow/types.ts`):

```ts
conditionAndAmenities: {
  condition?: Condition;
  furnished?: boolean;
  amenities: Amenity[];   // NEW — default []
};
```

**Submission adapter** wires `formBag.conditionAndAmenities.amenities` → `payload.amenities`.

**Detail screen change** (`src/screens/PropertyDetailsScreen.tsx:1095-1115`): drop the `isHospitality` gate so the "What this place offers" section renders for any property with `amenities.length > 0`. Section header uses a new key `property.amenities` (parallel to existing `hospitality.amenities`) so future copy can diverge if needed.

**New i18n keys** (EN + RU each):

- `property.amenities` — `What this place offers` / `Что предлагает это место`
- `amenity.washer` — `Washer` / `Стиральная машина`
- `amenity.dryer` — `Dryer` / `Сушильная машина`
- `amenity.garage` — `Garage` / `Гараж`
- `amenity.balcony` — `Balcony` / `Балкон`
- `amenity.elevator` — `Elevator` / `Лифт`
- `amenity.gasStove` — `Gas stove` / `Газовая плита`
- `amenity.petFriendly` — `Pet-friendly` / `С животными`
- `amenity.security` — `Security` / `Охрана`

(Existing `amenity.wifi/aircon/heating/kitchen/breakfast/parking/reception24/laundry/hotwater/commonarea/lockers/ensuite` keys reused.)

**Lucide icon mapping** (all imports from `lucide-react-native`):

| Token | Icon |
|---|---|
| aircon | `AirVent` |
| heating | `ThermometerSun` |
| wifi | `Wifi` |
| hotwater | `ShowerHead` |
| washer | `WashingMachine` |
| dryer | `Wind` |
| parking | `SquareParking` |
| garage | `Car` |
| balcony | `PanelTop` |
| elevator | `ArrowUpDown` |
| gasStove | `Flame` |
| petFriendly | `PawPrint` |
| security | `Shield` |
| kitchen | `Utensils` |
| breakfast | `Coffee` |
| reception24 | `ConciergeBell` |
| laundry | `WashingMachine` |
| commonarea | `Sofa` |
| lockers | `Lock` |
| ensuite | `Bath` |

Acceptance: a landlord creating an apartment listing sees 12 residential amenity chips on Step 4, can toggle any subset, and the selection renders on the detail page after submission. Hospitality listings continue to render their existing 12-item set with no behavioral change.

### Issue 3 — Airbnb-style tile grid on listing detail

**Symptom:** The detail screen renders condition, furnished, min term, deposit, prepayment, and negotiable as a comma-separated text block with raw enum values leaking through (`Состояние: euro`, `Мин. срок: 3_months`).

**Root cause:** `src/components/ListingMetaTable.tsx:157-190` `extrasGrid` block renders each field as `<Text>label: value</Text>` rows with `flexWrap: 'wrap'`. The enum values pass through `t()` only partially — condition and `minTerm` go straight to the screen as their raw token.

**Fix:** Replace `extrasGrid` with a 2-column icon+label+value tile grid in the same visual style as "What this place offers". Tiles render only when the underlying value is present.

**Tile spec:**

| Field | Icon (lucide) | EN label | RU label | Value rendering |
|---|---|---|---|---|
| `condition` | `PaintBucket` | Condition | Состояние | `t('condition.${condition}')` |
| `furnished` | `Sofa` | Furnished | С мебелью | `t('common.yes')` / `t('common.no')` |
| `minTerm` | `CalendarRange` | Min. term | Мин. срок | `t('minTerm.${minTerm}')` |
| `deposit` | `Banknote` | Deposit | Депозит | `${formattedAmount} ${currencySymbol}` |
| `prepayment` | `CalendarClock` | Prepayment | Предоплата | `${months} мес.` or `t('prepayment.none')` when 0 |
| `negotiable` | `Handshake` | Negotiable | Торг | `t('common.yes')` / `t('common.no')` |

**New i18n keys** (EN + RU each):

- `condition.euro` — `Euro renovation` / `Евроремонт`
- `condition.good` — `Good` / `Хорошее`
- `condition.rough` — `Rough` / `Без ремонта`
- `condition.whitebox` — `White box` / `Белая отделка`
- `minTerm.1_month` — `1 month` / `1 месяц`
- `minTerm.3_months` — `3 months` / `3 месяца`
- `minTerm.6_months` — `6 months` / `6 месяцев`
- `minTerm.1_year` — `1 year` / `1 год`
- `prepayment.none` — `No prepayment` / `Без предоплаты`
- `common.yes` / `common.no` — reused if present; added otherwise.

**Layout:** Reuse the existing "What this place offers" grid container styling so both sections sit on the detail page with identical visual rhythm. Tiles whose underlying value is `undefined`/`null` are omitted (no empty boxes).

Acceptance: detail page shows up to 6 icon+label+value tiles, each value localized; condition and `minTerm` never render their raw token; the section visually mirrors "What this place offers".

## File-Level Change Inventory

| File | Change |
|---|---|
| `src/components/StepperInput.tsx` | Replace circle background + glyph color tokens (Issue 1) |
| `src/components/ContextualListingFlow/styles.ts` | Add `flexDirection: 'row'`, `gap: 6` to `footerButton` (Issue 4) |
| `src/locales/en.ts` | Update `contextualListing.step6.prepayment.custom`; add tile + amenity keys (Issues 2, 3, 5) |
| `src/locales/ru.ts` | Same as en.ts (Issues 2, 3, 5) |
| `src/utils/amenities.ts` (NEW) | `Amenity` union, icon map, label keys, `getAmenitiesForPropertyType()` (Issue 2) |
| `src/utils/hospitalityAmenities.ts` | Re-export from new `amenities.ts` for back-compat, or delete after import migration (Issue 2) |
| `src/components/ContextualListingFlow/types.ts` | Add `amenities: Amenity[]` to `conditionAndAmenities` slice (Issue 2) |
| `src/components/ContextualListingFlow/Step4ConditionAmenities.tsx` | Append amenity multi-select chip grid below existing condition/furnished sections (Issue 2) |
| `src/components/ContextualListingFlow/adapters.ts` | Map `formBag.conditionAndAmenities.amenities` ↔ `property.amenities` on submit/edit-hydrate (Issue 2) |
| `src/screens/PropertyDetailsScreen.tsx` | Drop `isHospitality` gate on amenities section; use `property.amenities` header key (Issue 2) |
| `src/components/HospitalityCard.tsx` | Update import path from `hospitalityAmenities` → `amenities` (Issue 2) |
| `src/components/ListingMetaTable.tsx` | Replace `extrasGrid` text block with icon-tile grid (Issue 3) |
| `src/types/Property.ts` | Broaden `amenities?: HospitalityAmenity[]` → `Amenity[]` (Issue 2) |

## Out of Scope

- Backend schema changes — `property.amenities` already exists; no migration needed.
- Per-amenity icons in `PropertyCard` (list-card preview) — only the detail-screen grid is in scope.
- Validation requiring ≥ N amenities — optional field, no gate.
- Amenity reordering or drag-handle UX — fixed taxonomy order.
- Adding ranges/values to amenities (e.g., "2 parking spaces") — boolean presence only.
- Localizing the "Editing on behalf" banner — separate.
- Currency symbol formatting refactor on deposit tile — reuse existing `formatPrice`/symbol helper.

## Open Questions

None — all gray-area decisions resolved in brainstorming.

## Acceptance Walkthrough

1. Build app in dark mode, open create-listing → Step 3. Bedroom and bathroom +/− buttons are clearly readable; disabled state visibly dimmed.
2. Step 6, prepayment row reads `Без предоплаты | 1 месяц | 2 месяца | Указать своё`. Tapping the last chip opens the custom-months input as before.
3. Back/Next footer buttons on every step render chevron + label inline (no vertical stacking).
4. Step 4 shows condition + furnished as before, plus a new "What this place offers" chip grid resolved per property type (12 chips for apartment/house; 12 hospitality for hotel/hostel; 5 commercial for office/commercial). Multi-select; submission persists.
5. Open a freshly-created listing's detail page. The "What this place offers" section renders the selected amenities with icons. The previous condition/furnished/min-term/deposit/prepayment/negotiable text block is replaced by a tile grid with localized values — no raw `euro` or `3_months` strings.
6. Open a pre-existing hospitality listing's detail page. Behavior unchanged.

## Scope / Process

**Quick-task / hotfix v4.0.1.** Single planning directory under `.planning/quick/260525-XXX-listing-form-detail-polish/` with one PLAN.md and atomic commits. No phase ceremony.

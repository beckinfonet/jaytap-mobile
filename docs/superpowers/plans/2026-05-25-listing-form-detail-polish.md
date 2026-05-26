# Listing Form + Detail Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship v4.0.1 hotfix bundle that (a) restores residential/commercial amenity multi-select to `<ContextualListingFlow>` Step 4, (b) replaces `ListingMetaTable`'s text "extras row" with a localized Airbnb-style icon-tile grid on the listing detail page, (c) fixes three smaller UX bugs (stepper +/− contrast, footer chevron stacking above its label, "Своё" chip label opacity).

**Architecture:** Single RN-client repo, no backend change. Five fixes bundled as atomic commits in one branch. The amenity restore reuses the existing `property.amenities` Mongo field — TypeScript type broadens from `HospitalityAmenity` to a new `Amenity` superset (residential 12 + hospitality 12 + commercial 5). A new `src/utils/amenities.ts` becomes the single source of truth (Amenity union, lucide icon map, i18n key map, per-property-type resolver); `src/utils/hospitalityAmenities.ts` becomes a back-compat re-export so existing call sites compile unchanged. The tile grid replaces `ListingMetaTable.tsx`'s `extrasGrid` flowing-text block with a 2-column icon-tile layout fed by new `condition.*` / `minTerm.*` / `prepayment.none` i18n keys.

**Tech Stack:** React Native 0.84 (New Architecture), TypeScript, `react-test-renderer` + `jest`, `lucide-react-native@0.564.0`, theme tokens from `src/theme/colors.ts`, i18n via `useLanguage()` + `src/locales/{en,ru}.ts`.

---

## File Structure

| File | Purpose | Op |
|---|---|---|
| `src/components/ContextualListingFlow/styles.ts` | Add `flexDirection: 'row'` + `gap` to `footerButton` | Modify |
| `src/locales/en.ts` | New keys: `prepayment.custom` value swap, `condition.*` ×4, `minTerm.*` ×3, `prepayment.none`, new amenity labels | Modify |
| `src/locales/ru.ts` | Same as en.ts | Modify |
| `src/components/StepperInput.tsx` | Replace `circleBg = activeChipBackground` with `colors.warning` + literal white glyph + opacity-0.4 disabled | Modify |
| `src/components/__tests__/StepperInput.test.tsx` | Update Test 6 expectation: white glyph in both states, opacity 0.4 on disabled Pressable | Modify |
| `src/utils/amenities.ts` | New SoT: `Amenity` union, `AMENITY_ICONS`, `AMENITY_LABEL_KEYS`, `getAmenitiesForPropertyType()` | Create |
| `src/utils/__tests__/amenities.test.ts` | Unit tests for `getAmenitiesForPropertyType()` + type-set invariants | Create |
| `src/utils/hospitalityAmenities.ts` | Becomes thin back-compat re-export from `amenities.ts` | Modify |
| `src/types/Property.ts` | Broaden `amenities?: HospitalityAmenity[]` → `Amenity[]` (import path swap) | Modify |
| `src/components/ContextualListingFlow/types.ts` | Add `amenities: Amenity[]` to `FormBag.conditionAndAmenities` | Modify |
| `src/components/ContextualListingFlow/validators.ts` | Add `amenities: []` to `emptyFormBag()` | Modify |
| `src/components/ContextualListingFlow/adapters.ts` | Hydrate `amenities` from `property.amenities` (intersect with type-valid set); write back to payload | Modify |
| `src/components/ContextualListingFlow/__tests__/adapters.test.ts` | New cases: amenities rehydrate-intersect; amenities payload write | Modify |
| `src/components/ContextualListingFlow/Step4ConditionAmenities.tsx` | Append amenity multi-select chip grid below furnished section | Modify |
| `src/components/ContextualListingFlow/__tests__/Step4.test.tsx` | Add cases: amenity chip toggle, propertyType-driven set, hospitality unchanged | Modify |
| `src/screens/PropertyDetailsScreen.tsx` | Unify amenity rendering for ALL property types; drop `isHospitality` gate on the grid | Modify |
| `src/components/ListingMetaTable.tsx` | Replace `extrasGrid` text rows with 2-column icon-tile grid; pass values through `t()` | Modify |
| `src/components/HospitalityCard.tsx` | Update `HospitalityAmenity` import path to `amenities.ts` (back-compat re-export covers it; verify no breaks) | Modify if needed |

---

## Task 1: Fix back-button chevron stack (Issue 4)

**Files:**
- Modify: `src/components/ContextualListingFlow/styles.ts:76`

- [ ] **Step 1: Locate the broken style.**

Open `src/components/ContextualListingFlow/styles.ts` and confirm line 76 currently reads:
```ts
footerButton: { flex: 1, height: 50, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
```

- [ ] **Step 2: Add `flexDirection: 'row'` and `gap: 6`.**

Replace line 76 with:
```ts
footerButton: { flex: 1, height: 50, borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
```

- [ ] **Step 3: Type-check.**

Run: `npx tsc --noEmit`
Expected: no new errors (style key `flexDirection` and `gap` are valid `ViewStyle` props in RN 0.84).

- [ ] **Step 4: Visual sanity check via Step 4 unit test (no UI render assertion exists for the footer — type-check is the gate).**

Run: `npm test -- --testPathPattern='ContextualListingFlow'`
Expected: all existing tests pass.

- [ ] **Step 5: Commit.**

```bash
git add src/components/ContextualListingFlow/styles.ts
git commit -m "fix(form): footer Back/Next render chevron + label inline

footerButton style was missing flexDirection: 'row', causing the
ChevronLeft icon to stack above the 'Back'/'Назад' label on every
listing-wizard step. Adds row direction + 6px gap.

Issue 4 of docs/superpowers/specs/2026-05-25-listing-form-detail-polish-design.md"
```

---

## Task 2: Rename "Своё" → "Указать своё" (Issue 5)

**Files:**
- Modify: `src/locales/ru.ts:725`
- Modify: `src/locales/en.ts:729`

- [ ] **Step 1: Update RU value.**

Find line 725 in `src/locales/ru.ts`:
```ts
'contextualListing.step6.prepayment.custom': 'Своё',
```
Replace with:
```ts
'contextualListing.step6.prepayment.custom': 'Указать своё',
```

- [ ] **Step 2: Update EN value.**

Find line 729 in `src/locales/en.ts`:
```ts
'contextualListing.step6.prepayment.custom': 'Custom',
```
Replace with:
```ts
'contextualListing.step6.prepayment.custom': 'Enter custom',
```

- [ ] **Step 3: Type-check + run Step 6 tests.**

Run: `npx tsc --noEmit && npm test -- --testPathPattern='Step6'`
Expected: pass. No structural change — only string literal values shift.

- [ ] **Step 4: Commit.**

```bash
git add src/locales/en.ts src/locales/ru.ts
git commit -m "i18n(step6): rename custom-prepayment chip label

'Своё' / 'Custom' was too terse — users didn't know what the chip did.
Renames to 'Указать своё' / 'Enter custom'. Chip width auto-grows.
No structural change.

Issue 5 of docs/superpowers/specs/2026-05-25-listing-form-detail-polish-design.md"
```

---

## Task 3: Fix stepper +/− contrast (Issue 1)

The current `circleBg = colors.activeChipBackground` collides with `colors.text` for the glyph in light mode (#2D2D2D / #2D2D2D) and yields a near-white pill with a low-contrast gray glyph in dark mode. Switch to the brand-amber `warning` token with a forced white glyph; disabled state drops opacity to 0.4 instead of changing colors.

**Files:**
- Modify: `src/components/StepperInput.tsx:78-161`
- Modify: `src/components/__tests__/StepperInput.test.tsx:30-37, 137-163`

- [ ] **Step 1: Update the test's MOCK_COLORS to include `warning`.**

Open `src/components/__tests__/StepperInput.test.tsx`. Replace the `MOCK_COLORS` literal at lines 30-37:
```ts
const MOCK_COLORS = {
  text: '#TEXT',
  textSecondary: '#TS',
  border: '#B',
  activeChipBackground: '#A',
  surface: '#S',
  error: '#E',
};
```
with:
```ts
const MOCK_COLORS = {
  text: '#TEXT',
  textSecondary: '#TS',
  border: '#B',
  activeChipBackground: '#A',
  surface: '#S',
  error: '#E',
  warning: '#WARN',
};
```

- [ ] **Step 2: Rewrite Test 6 to match the new contract.**

Replace the entire `// === Test 6 (D-11.6) ===` block (lines 137-162) with:
```ts
  // === Test 6 (D-11.6 revised — v4.0.1 hotfix) ===
  // Active and disabled both render WHITE glyph on `colors.warning` (amber) circle.
  // Disabled state is signalled by `opacity: 0.4` on the Pressable wrapper, not by
  // changing the glyph color — keeps the +/- always readable at glance distance.
  test('+/- glyphs render white on amber circle in both active and disabled states; disabled adds opacity 0.4 on the Pressable', () => {
    const { root } = render({ value: 0, min: 0, max: 10 });

    const minusBtn = findByTestID(root, 'stepper-minus');
    expect(minusBtn.props.disabled).toBe(true);
    const minusPressableStyle = minusBtn.props.style({ pressed: false }) as Array<Record<string, unknown>>;
    expect(
      minusPressableStyle.some(
        (s) => s && typeof s === 'object' && (s as { opacity?: number }).opacity === 0.4,
      ),
    ).toBe(true);
    const minusGlyphStyle = (minusBtn.findAll((n) => n.type === 'Text')[0].props.style as Array<Record<string, unknown>>) ?? [];
    expect(
      minusGlyphStyle.some(
        (s) => s && typeof s === 'object' && (s as { color?: string }).color === '#FFFFFF',
      ),
    ).toBe(true);

    const plusBtn = findByTestID(root, 'stepper-plus');
    const plusPressableStyle = plusBtn.props.style({ pressed: false }) as Array<Record<string, unknown>>;
    expect(
      plusPressableStyle.some(
        (s) => s && typeof s === 'object' && (s as { opacity?: number }).opacity === 0.4,
      ),
    ).toBe(false); // active button is opacity 1
    const plusGlyphStyle = (plusBtn.findAll((n) => n.type === 'Text')[0].props.style as Array<Record<string, unknown>>) ?? [];
    expect(
      plusGlyphStyle.some(
        (s) => s && typeof s === 'object' && (s as { color?: string }).color === '#FFFFFF',
      ),
    ).toBe(true);
  });

  // === Test 7 (v4.0.1 hotfix — circle uses warning amber, not activeChipBackground) ===
  test('circle backgroundColor pulls colors.warning (brand amber), not colors.activeChipBackground', () => {
    const { root } = render({ value: 2, min: 0, max: 10 });
    const minusBtn = findByTestID(root, 'stepper-minus');
    const circleView = minusBtn.findAll((n) => n.type === 'View').find(
      (v) => (v.props.style as Array<Record<string, unknown>> | undefined)?.some(
        (s) => s && typeof s === 'object' && 'backgroundColor' in s,
      ),
    );
    const circleStyle = (circleView!.props.style as Array<Record<string, unknown>>) ?? [];
    expect(
      circleStyle.some(
        (s) => s && typeof s === 'object' && (s as { backgroundColor?: string }).backgroundColor === '#WARN',
      ),
    ).toBe(true);
  });
```

- [ ] **Step 3: Run the test, expect Test 6 + Test 7 to fail.**

Run: `npm test -- --testPathPattern='StepperInput'`
Expected: Tests 1–5 pass; Tests 6 and 7 FAIL because the component still uses `activeChipBackground` and changes glyph color on disable.

- [ ] **Step 4: Update `StepperInput.tsx` to satisfy the new contract.**

Open `src/components/StepperInput.tsx`. Replace lines 103-161 (the `circleBg` definition through both `<Pressable>` blocks) with:
```tsx
  // v4.0.1 hotfix — D-11.6 revised. Issue 1 of the design spec.
  // - Circle: colors.warning (brand amber #F59E0B, identical in light + dark).
  // - Glyph: literal white in both active and disabled states for guaranteed contrast.
  // - Disabled: opacity 0.4 applied to the Pressable wrapper (not glyph color).
  const circleBg = colors.warning;

  return (
    <View accessibilityLabel={accessibilityLabel}>
      <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
      <View style={styles.controlRow}>
        <Pressable
          onPress={handleDecrement}
          disabled={isMinDisabled}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel={`Decrease ${label}`}
          accessibilityState={{ disabled: isMinDisabled }}
          testID={minusTestID}
          style={({ pressed }) => [
            styles.hitArea,
            { opacity: isMinDisabled ? 0.4 : pressed ? 0.7 : 1 },
          ]}
        >
          <View style={[styles.circle, { backgroundColor: circleBg }]}>
            <Text style={[styles.glyph, { color: '#FFFFFF' }]}>{'−'}</Text>
          </View>
        </Pressable>

        <Text style={[styles.value, { color: colors.text }]} testID={valueTestID}>
          {formatValue(value)}
        </Text>

        <Pressable
          onPress={handleIncrement}
          disabled={isMaxDisabled}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel={`Increase ${label}`}
          accessibilityState={{ disabled: isMaxDisabled }}
          testID={plusTestID}
          style={({ pressed }) => [
            styles.hitArea,
            { opacity: isMaxDisabled ? 0.4 : pressed ? 0.7 : 1 },
          ]}
        >
          <View style={[styles.circle, { backgroundColor: circleBg }]}>
            <Text style={[styles.glyph, { color: '#FFFFFF' }]}>+</Text>
          </View>
        </Pressable>
      </View>
    </View>
  );
};
```

(`circleBg` is now a single variable referenced by both buttons; `colors.text` and `colors.textSecondary` are no longer needed for the glyph and can be left unreferenced by the new code.)

- [ ] **Step 5: Run the test, expect all pass.**

Run: `npm test -- --testPathPattern='StepperInput'`
Expected: Tests 1–7 PASS.

- [ ] **Step 6: Type-check.**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 7: Commit.**

```bash
git add src/components/StepperInput.tsx src/components/__tests__/StepperInput.test.tsx
git commit -m "fix(form): stepper +/- buttons readable on both themes

circleBg pulled colors.activeChipBackground, which collides with
colors.text (#2D2D2D both) in light mode and produces a near-white
pill with a low-contrast gray glyph in dark mode. Switch to
colors.warning (brand amber) circle + literal white glyph. Disabled
state uses opacity 0.4 on the Pressable instead of changing colors,
so the +/- glyph stays readable when at min/max.

Tests 6 (renamed) + 7 (new) lock the contract.

Issue 1 of docs/superpowers/specs/2026-05-25-listing-form-detail-polish-design.md"
```

---

## Task 4: Add tile-grid i18n keys (Issue 3 prerequisites)

The new tile grid needs localized labels for the condition enum, the `minTerm` enum, and a "no prepayment" copy. EN+RU labels for the tile *headers* (Condition / Furnished / etc.) already exist as `property.metaCondition`, `property.metaFurnishedYes`/`No`, `property.metaMinTerm`, `property.metaDeposit`, `property.metaPrepayment`, `property.metaNegotiable` — those are reused as-is.

**Files:**
- Modify: `src/locales/en.ts:120` (after the existing meta keys block)
- Modify: `src/locales/ru.ts:122` (same)

- [ ] **Step 1: Append condition + minTerm + prepayment.none keys to `en.ts`.**

Open `src/locales/en.ts`. After the line `'property.metaNegotiable': 'Price negotiable',` (line 120), insert:
```ts
  // v4.0.1 — Airbnb-style tile grid value translations
  'condition.rough': 'Rough',
  'condition.whitebox': 'White box',
  'condition.good': 'Good',
  'condition.euro': 'Euro renovation',
  'minTerm.1_day': '1 day',
  'minTerm.1_month': '1 month',
  'minTerm.3_months': '3 months',
  'prepayment.none': 'No prepayment',
  'common.yes': 'Yes',
```

(Note: `common.no` already exists at line 15; `common.yes` likely missing — add unconditionally for symmetry, jest will catch a duplicate-key error if present.)

- [ ] **Step 2: Append the matching RU keys to `ru.ts`.**

Open `src/locales/ru.ts`. After the line `'property.metaNegotiable': 'Цена обсуждаема',` (line 122), insert:
```ts
  // v4.0.1 — Airbnb-style tile grid value translations
  'condition.rough': 'Без ремонта',
  'condition.whitebox': 'Белая отделка',
  'condition.good': 'Хорошее',
  'condition.euro': 'Евроремонт',
  'minTerm.1_day': '1 день',
  'minTerm.1_month': '1 месяц',
  'minTerm.3_months': '3 месяца',
  'prepayment.none': 'Без предоплаты',
  'common.yes': 'Да',
```

- [ ] **Step 3: Type-check.**

Run: `npx tsc --noEmit`
Expected: no errors. If `common.yes` already exists, TypeScript will flag a duplicate property — in that case, drop the `common.yes` line from both files.

- [ ] **Step 4: Run full test suite (no test changes yet, just confirming locales still parse).**

Run: `npm test`
Expected: pass.

- [ ] **Step 5: Commit.**

```bash
git add src/locales/en.ts src/locales/ru.ts
git commit -m "i18n: add tile-grid value keys (condition.*, minTerm.*, prepayment.none, common.yes)

ListingMetaTable rendered raw enum values ('euro', '3_months') as-is
because the i18n keys only existed for headers, not values. Adds:
- condition.{rough,whitebox,good,euro}
- minTerm.{1_day,1_month,3_months}
- prepayment.none
- common.yes (common.no already existed)

Issue 3 of docs/superpowers/specs/2026-05-25-listing-form-detail-polish-design.md"
```

---

## Task 5: Convert `ListingMetaTable.extrasGrid` to icon-tile grid (Issue 3)

Replace the flowing-text `extrasGrid` block (lines 157-190) with a 2-column icon-tile grid. Each tile shows: lucide icon (top), header label (`t('property.metaXxx')`), value (localized via the new keys from Task 4). Tiles with `undefined` values are omitted.

**Files:**
- Modify: `src/components/ListingMetaTable.tsx:1, 157-190, 263-272`

- [ ] **Step 1: Import the lucide icons and the formatter helper.**

At the top of `src/components/ListingMetaTable.tsx`, replace lines 1-5:
```tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import type { Property } from '../types/Property';
```
with:
```tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  PaintBucket,
  Sofa,
  CalendarRange,
  Banknote,
  CalendarClock,
  Handshake,
  type LucideIcon,
} from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import type { Property } from '../types/Property';
import type { TranslationKeys } from '../locales';
```

- [ ] **Step 2: Replace the `extrasGrid` render block (lines 157-190).**

Open `src/components/ListingMetaTable.tsx`. Find the block starting with `{hasExtras && (` and ending after `</View>` (the `extrasGrid` `<View>`). Replace lines 157-190 with:
```tsx
      {hasExtras && (
        <View style={styles.extrasTiles}>
          {condition != null && (
            <Tile
              icon={PaintBucket}
              header={t('property.metaCondition' as TranslationKeys)}
              value={t(`condition.${condition}` as TranslationKeys)}
              colors={colors}
              labelSize={labelSize}
              valueSize={valueSize}
            />
          )}
          {furnished != null && (
            <Tile
              icon={Sofa}
              header={
                furnished
                  ? t('property.metaFurnishedYes' as TranslationKeys)
                  : t('property.metaFurnishedNo' as TranslationKeys)
              }
              value={furnished ? t('common.yes' as TranslationKeys) : t('common.no' as TranslationKeys)}
              colors={colors}
              labelSize={labelSize}
              valueSize={valueSize}
            />
          )}
          {minTerm != null && (
            <Tile
              icon={CalendarRange}
              header={t('property.metaMinTerm' as TranslationKeys)}
              value={t(`minTerm.${minTerm}` as TranslationKeys)}
              colors={colors}
              labelSize={labelSize}
              valueSize={valueSize}
            />
          )}
          {deposit != null && (
            <Tile
              icon={Banknote}
              header={t('property.metaDeposit' as TranslationKeys)}
              value={`${deposit.amount} ${deposit.currency}`}
              colors={colors}
              labelSize={labelSize}
              valueSize={valueSize}
            />
          )}
          {prepaymentMonths != null && (
            <Tile
              icon={CalendarClock}
              header={t('property.metaPrepayment' as TranslationKeys)}
              value={
                prepaymentMonths === 0
                  ? t('prepayment.none' as TranslationKeys)
                  : String(prepaymentMonths)
              }
              colors={colors}
              labelSize={labelSize}
              valueSize={valueSize}
            />
          )}
          {negotiable != null && (
            <Tile
              icon={Handshake}
              header={t('property.metaNegotiable' as TranslationKeys)}
              value={negotiable ? t('common.yes' as TranslationKeys) : t('common.no' as TranslationKeys)}
              colors={colors}
              labelSize={labelSize}
              valueSize={valueSize}
            />
          )}
        </View>
      )}
```

- [ ] **Step 3: Add the `Tile` sub-component just above the `styles` declaration.**

Find the line `const styles = StyleSheet.create({` (around line 195 after the previous edits). Just BEFORE that line, insert:
```tsx
interface TileProps {
  icon: LucideIcon;
  header: string;
  value: string;
  colors: ReturnType<typeof useTheme>['colors'];
  labelSize: number;
  valueSize: number;
}

const Tile: React.FC<TileProps> = ({ icon: Icon, header, value, colors, labelSize, valueSize }) => (
  <View style={[styles.tile, { backgroundColor: colors.surface, borderColor: colors.border }]}>
    <Icon size={20} color={colors.textSecondary} />
    <Text style={[styles.tileHeader, { color: colors.textSecondary, fontSize: labelSize }]} numberOfLines={1}>
      {header}
    </Text>
    <Text style={[styles.tileValue, { color: colors.text, fontSize: valueSize }]} numberOfLines={1}>
      {value}
    </Text>
  </View>
);
```

- [ ] **Step 4: Replace the `extrasGrid` + `extraText` style entries with tile styles.**

In the `StyleSheet.create({...})` block, find:
```ts
  extrasGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 8,
  },
  extraText: {
    fontWeight: '500',
  },
```
Replace with:
```ts
  extrasTiles: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  tile: {
    flexBasis: '48%',
    flexGrow: 0,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 4,
    alignItems: 'flex-start',
  },
  tileHeader: {
    fontWeight: '600',
  },
  tileValue: {
    fontWeight: '600',
  },
```

- [ ] **Step 5: Type-check.**

Run: `npx tsc --noEmit`
Expected: no errors. If the `colors` type assertion in `TileProps` doesn't resolve, swap to `Record<string, string>`.

- [ ] **Step 6: Run the test suite to confirm no existing test snapshots broke.**

Run: `npm test`
Expected: all existing tests pass (no test directly asserts the `extrasGrid` shape).

- [ ] **Step 7: Commit.**

```bash
git add src/components/ListingMetaTable.tsx
git commit -m "feat(detail): Airbnb-style icon tile grid for listing meta info

Replaces flowing-text 'extras row' (condition/furnished/min term/
deposit/prepayment/negotiable) with a 2-column icon-tile grid.
Each tile shows a lucide icon, a header label, and a localized value
(condition / minTerm enums route through new t() keys). Tiles with
undefined values are omitted.

Issue 3 of docs/superpowers/specs/2026-05-25-listing-form-detail-polish-design.md"
```

---

## Task 6: Create `src/utils/amenities.ts` (Issue 2 — new SoT)

The new utils file defines the broader `Amenity` union, lucide icon map, i18n key map, and a `getAmenitiesForPropertyType()` resolver.

**Files:**
- Create: `src/utils/amenities.ts`
- Create: `src/utils/__tests__/amenities.test.ts`

- [ ] **Step 1: Write the failing test.**

Create `src/utils/__tests__/amenities.test.ts`:
```ts
import {
  AMENITIES,
  AMENITY_ICONS,
  AMENITY_LABEL_KEYS,
  RESIDENTIAL_AMENITIES,
  HOSPITALITY_AMENITIES,
  COMMERCIAL_AMENITIES,
  getAmenitiesForPropertyType,
} from '../amenities';

describe('amenities — taxonomy invariants', () => {
  test('AMENITIES is the union of residential + hospitality + commercial sets', () => {
    const expected = new Set([
      ...RESIDENTIAL_AMENITIES,
      ...HOSPITALITY_AMENITIES,
      ...COMMERCIAL_AMENITIES,
    ]);
    expect(new Set(AMENITIES)).toEqual(expected);
  });

  test('every amenity has an icon mapping', () => {
    for (const a of AMENITIES) {
      expect(AMENITY_ICONS[a]).toBeDefined();
    }
  });

  test('every amenity has a label key', () => {
    for (const a of AMENITIES) {
      expect(AMENITY_LABEL_KEYS[a]).toMatch(/^amenity\./);
    }
  });

  test('hospitality set is the verbatim 12-item canonical list (back-compat)', () => {
    expect(HOSPITALITY_AMENITIES).toEqual([
      'wifi',
      'aircon',
      'heating',
      'kitchen',
      'breakfast',
      'parking',
      'reception24',
      'laundry',
      'hotwater',
      'commonarea',
      'lockers',
      'ensuite',
    ]);
  });

  test('residential set has 12 items including washer + dryer + garage + balcony + elevator + gasStove + petFriendly', () => {
    expect(RESIDENTIAL_AMENITIES.length).toBe(12);
    expect(RESIDENTIAL_AMENITIES).toEqual(
      expect.arrayContaining([
        'washer',
        'dryer',
        'garage',
        'balcony',
        'elevator',
        'gasStove',
        'petFriendly',
      ]),
    );
  });

  test('commercial set has 5 items: aircon, heating, wifi, parking, security', () => {
    expect(COMMERCIAL_AMENITIES).toEqual(['aircon', 'heating', 'wifi', 'parking', 'security']);
  });
});

describe('getAmenitiesForPropertyType', () => {
  test('apartment → residential set', () => {
    expect(getAmenitiesForPropertyType('apartment')).toEqual(RESIDENTIAL_AMENITIES);
  });

  test('house → residential set', () => {
    expect(getAmenitiesForPropertyType('house')).toEqual(RESIDENTIAL_AMENITIES);
  });

  test('hotel → hospitality set', () => {
    expect(getAmenitiesForPropertyType('hotel')).toEqual(HOSPITALITY_AMENITIES);
  });

  test('hostel → hospitality set', () => {
    expect(getAmenitiesForPropertyType('hostel')).toEqual(HOSPITALITY_AMENITIES);
  });

  test('office → commercial set', () => {
    expect(getAmenitiesForPropertyType('office')).toEqual(COMMERCIAL_AMENITIES);
  });

  test('commercial → commercial set', () => {
    expect(getAmenitiesForPropertyType('commercial')).toEqual(COMMERCIAL_AMENITIES);
  });

  test('unknown propertyType → empty array (defensive)', () => {
    expect(getAmenitiesForPropertyType('land' as never)).toEqual([]);
    expect(getAmenitiesForPropertyType('' as never)).toEqual([]);
    expect(getAmenitiesForPropertyType(undefined as never)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails.**

Run: `npm test -- --testPathPattern='amenities'`
Expected: FAIL — `Cannot find module '../amenities'`.

- [ ] **Step 3: Create `src/utils/amenities.ts`.**

Write the new file:
```ts
/**
 * amenities — Single source of truth for the amenity taxonomy across all
 * property types (v4.0.1 hotfix — replaces hospitalityAmenities.ts as SoT;
 * that file becomes a thin back-compat re-export).
 *
 * Three subsets keyed by property type:
 *   - RESIDENTIAL_AMENITIES (apartment, house) — 12 items
 *   - HOSPITALITY_AMENITIES (hotel, hostel) — 12 items, verbatim from M2 (D-19)
 *   - COMMERCIAL_AMENITIES (office, commercial) — 5 items
 *
 * AMENITIES (the union) is the canonical persisted set — Mongo stores
 * `property.amenities: string[]` and we accept any token in AMENITIES.
 *
 * Per spec docs/superpowers/specs/2026-05-25-listing-form-detail-polish-design.md
 * §"Issue 2 — Restore amenities to listing form, per property type".
 */

import {
  Wifi,
  AirVent,
  ThermometerSun,
  Utensils,
  Coffee,
  SquareParking,
  ConciergeBell,
  WashingMachine,
  ShowerHead,
  Sofa,
  Lock,
  Bath,
  Wind,
  Car,
  PanelTop,
  ArrowUpDown,
  Flame,
  PawPrint,
  Shield,
  type LucideIcon,
} from 'lucide-react-native';

/** Residential set — apartment + house. 12 items. */
export const RESIDENTIAL_AMENITIES = [
  'aircon',
  'heating',
  'wifi',
  'hotwater',
  'washer',
  'dryer',
  'parking',
  'garage',
  'balcony',
  'elevator',
  'gasStove',
  'petFriendly',
] as const;

/** Hospitality set — hotel + hostel. Verbatim from M2 D-19. 12 items. */
export const HOSPITALITY_AMENITIES = [
  'wifi',
  'aircon',
  'heating',
  'kitchen',
  'breakfast',
  'parking',
  'reception24',
  'laundry',
  'hotwater',
  'commonarea',
  'lockers',
  'ensuite',
] as const;

/** Commercial set — office + commercial. 5 items. */
export const COMMERCIAL_AMENITIES = [
  'aircon',
  'heating',
  'wifi',
  'parking',
  'security',
] as const;

/** Union of all sets — accepted Mongo values. Deduplicated order: residential, hospitality-only, commercial-only. */
export const AMENITIES = [
  'aircon',
  'heating',
  'wifi',
  'hotwater',
  'washer',
  'dryer',
  'parking',
  'garage',
  'balcony',
  'elevator',
  'gasStove',
  'petFriendly',
  'kitchen',
  'breakfast',
  'reception24',
  'laundry',
  'commonarea',
  'lockers',
  'ensuite',
  'security',
] as const;

export type Amenity = (typeof AMENITIES)[number];
/** @deprecated Use `Amenity` — kept as alias for back-compat with src/utils/hospitalityAmenities.ts consumers. */
export type HospitalityAmenity = (typeof HOSPITALITY_AMENITIES)[number];

export const AMENITY_ICONS: Record<Amenity, LucideIcon> = {
  // residential-introduced
  washer: WashingMachine,
  dryer: Wind,
  garage: Car,
  balcony: PanelTop,
  elevator: ArrowUpDown,
  gasStove: Flame,
  petFriendly: PawPrint,
  // hospitality (unchanged from D-19)
  wifi: Wifi,
  aircon: AirVent,
  heating: ThermometerSun,
  hotwater: ShowerHead,
  parking: SquareParking,
  kitchen: Utensils,
  breakfast: Coffee,
  reception24: ConciergeBell,
  laundry: WashingMachine,
  commonarea: Sofa,
  lockers: Lock,
  ensuite: Bath,
  // commercial-introduced
  security: Shield,
};

export const AMENITY_LABEL_KEYS: Record<Amenity, string> = {
  aircon: 'amenity.aircon',
  heating: 'amenity.heating',
  wifi: 'amenity.wifi',
  hotwater: 'amenity.hotwater',
  washer: 'amenity.washer',
  dryer: 'amenity.dryer',
  parking: 'amenity.parking',
  garage: 'amenity.garage',
  balcony: 'amenity.balcony',
  elevator: 'amenity.elevator',
  gasStove: 'amenity.gasStove',
  petFriendly: 'amenity.petFriendly',
  kitchen: 'amenity.kitchen',
  breakfast: 'amenity.breakfast',
  reception24: 'amenity.reception24',
  laundry: 'amenity.laundry',
  commonarea: 'amenity.commonarea',
  lockers: 'amenity.lockers',
  ensuite: 'amenity.ensuite',
  security: 'amenity.security',
};

/**
 * Resolver — returns the amenity set valid for the given property type.
 * Unknown / undefined / empty propertyType returns `[]` so the form section
 * just doesn't render (defensive — covers data-migration edge cases).
 */
export function getAmenitiesForPropertyType(
  propertyType: 'apartment' | 'house' | 'hotel' | 'hostel' | 'office' | 'commercial' | string | undefined,
): readonly Amenity[] {
  switch (propertyType) {
    case 'apartment':
    case 'house':
      return RESIDENTIAL_AMENITIES;
    case 'hotel':
    case 'hostel':
      return HOSPITALITY_AMENITIES;
    case 'office':
    case 'commercial':
      return COMMERCIAL_AMENITIES;
    default:
      return [];
  }
}
```

- [ ] **Step 4: Run the test, expect all pass.**

Run: `npm test -- --testPathPattern='amenities'`
Expected: PASS — all 13 assertions.

- [ ] **Step 5: Type-check.**

Run: `npx tsc --noEmit`
Expected: no errors. The `HospitalityAmenity` deprecation alias preserves back-compat for `src/utils/hospitalityAmenities.ts` re-exports (next task).

- [ ] **Step 6: Commit.**

```bash
git add src/utils/amenities.ts src/utils/__tests__/amenities.test.ts
git commit -m "feat(amenities): new SoT util with residential + hospitality + commercial taxonomies

Adds src/utils/amenities.ts as the single source of truth for the
amenity taxonomy across all property types:
- RESIDENTIAL_AMENITIES (apartment/house): 12 items inc. washer, dryer,
  garage, balcony, elevator, gasStove, petFriendly
- HOSPITALITY_AMENITIES (hotel/hostel): 12 items, verbatim from M2 D-19
- COMMERCIAL_AMENITIES (office/commercial): aircon, heating, wifi, parking, security

Includes AMENITY_ICONS (lucide-react-native), AMENITY_LABEL_KEYS, and
getAmenitiesForPropertyType() resolver. Unknown propertyType → [] so
the section just doesn't render (defensive).

Issue 2 of docs/superpowers/specs/2026-05-25-listing-form-detail-polish-design.md"
```

---

## Task 7: Convert `hospitalityAmenities.ts` to back-compat re-export

Existing consumers (`Property.ts`, `HospitalityCard.tsx`, `PropertyDetailsScreen.tsx`) import from `hospitalityAmenities`. Avoid touching all of them — instead, make `hospitalityAmenities.ts` re-export the relevant symbols from the new SoT.

**Files:**
- Modify: `src/utils/hospitalityAmenities.ts`

- [ ] **Step 1: Replace the entire file with re-exports.**

Open `src/utils/hospitalityAmenities.ts`. Replace ALL contents with:
```ts
/**
 * hospitalityAmenities — Back-compat re-export shim (v4.0.1 hotfix).
 *
 * The canonical SoT for amenities is `src/utils/amenities.ts`. This file
 * is retained as a re-export to keep existing call sites compiling
 * (Property.ts, HospitalityCard.tsx, PropertyDetailsScreen.tsx).
 *
 * Prefer importing from `../utils/amenities` directly in new code.
 */

export {
  HOSPITALITY_AMENITIES,
  AMENITY_ICONS,
  type HospitalityAmenity,
} from './amenities';
```

- [ ] **Step 2: Type-check + run all tests.**

Run: `npx tsc --noEmit && npm test`
Expected: pass. All existing consumers of `HOSPITALITY_AMENITIES`, `AMENITY_ICONS`, and `HospitalityAmenity` continue to compile.

- [ ] **Step 3: Commit.**

```bash
git add src/utils/hospitalityAmenities.ts
git commit -m "refactor(amenities): hospitalityAmenities.ts becomes back-compat re-export

Forwards HOSPITALITY_AMENITIES, AMENITY_ICONS, and HospitalityAmenity
from the new SoT at src/utils/amenities.ts. No call-site changes
needed — existing imports continue to work.

Issue 2 of docs/superpowers/specs/2026-05-25-listing-form-detail-polish-design.md"
```

---

## Task 8: Add new amenity i18n keys (EN + RU)

**Files:**
- Modify: `src/locales/en.ts:300` (right after `'amenity.ensuite': 'En-suite bathroom',`)
- Modify: `src/locales/ru.ts:302` (right after `'amenity.ensuite': 'Санузел в номере',`)

- [ ] **Step 1: Append residential + commercial amenity keys to `en.ts`.**

In `src/locales/en.ts`, find the line `'amenity.ensuite': 'En-suite bathroom',` and insert AFTER it:
```ts
  // v4.0.1 — residential + commercial amenity labels (new tokens beyond the M2 hospitality 12)
  'amenity.washer': 'Washer',
  'amenity.dryer': 'Dryer',
  'amenity.garage': 'Garage',
  'amenity.balcony': 'Balcony',
  'amenity.elevator': 'Elevator',
  'amenity.gasStove': 'Gas stove',
  'amenity.petFriendly': 'Pet-friendly',
  'amenity.security': 'Security',
```

- [ ] **Step 2: Append the RU keys to `ru.ts`.**

In `src/locales/ru.ts`, find `'amenity.ensuite': 'Санузел в номере',` and insert AFTER it:
```ts
  // v4.0.1 — residential + commercial amenity labels
  'amenity.washer': 'Стиральная машина',
  'amenity.dryer': 'Сушильная машина',
  'amenity.garage': 'Гараж',
  'amenity.balcony': 'Балкон',
  'amenity.elevator': 'Лифт',
  'amenity.gasStove': 'Газовая плита',
  'amenity.petFriendly': 'Можно с животными',
  'amenity.security': 'Охрана',
```

- [ ] **Step 3: Type-check.**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit.**

```bash
git add src/locales/en.ts src/locales/ru.ts
git commit -m "i18n: add residential + commercial amenity labels (EN + RU)

8 new amenity tokens covered: washer, dryer, garage, balcony, elevator,
gasStove, petFriendly, security. M2 hospitality 12-item set unchanged.

Issue 2 of docs/superpowers/specs/2026-05-25-listing-form-detail-polish-design.md"
```

---

## Task 9: Broaden `Property.amenities` type

**Files:**
- Modify: `src/types/Property.ts:11, 35`

- [ ] **Step 1: Update import and field type.**

In `src/types/Property.ts`, replace line 11:
```ts
import type { HospitalityAmenity } from '../utils/hospitalityAmenities';
```
with:
```ts
import type { Amenity } from '../utils/amenities';
```

Then replace line 35:
```ts
  amenities?: HospitalityAmenity[];   // D-09 hospitality preserve
```
with:
```ts
  amenities?: Amenity[];   // D-09 hospitality preserve; v4.0.1 broadened to Amenity (residential + commercial + hospitality)
```

- [ ] **Step 2: Type-check.**

Run: `npx tsc --noEmit`
Expected: no errors. Existing consumers that cast `(property.amenities as HospitalityAmenity[])` may need a follow-up cast cleanup — leave that for the consuming task (Task 13).

- [ ] **Step 3: Commit.**

```bash
git add src/types/Property.ts
git commit -m "types: broaden Property.amenities from HospitalityAmenity[] to Amenity[]

Mongo field unchanged (string[]). TS union now covers residential,
hospitality, and commercial subsets — driven by the per-property-type
resolver in src/utils/amenities.ts.

Issue 2 of docs/superpowers/specs/2026-05-25-listing-form-detail-polish-design.md"
```

---

## Task 10: Extend `FormBag` with `amenities` and update `emptyFormBag()`

**Files:**
- Modify: `src/components/ContextualListingFlow/types.ts:6, 36-39`
- Modify: `src/components/ContextualListingFlow/validators.ts` (locate `emptyFormBag`)

- [ ] **Step 1: Add the Amenity import and field to `types.ts`.**

In `src/components/ContextualListingFlow/types.ts`, replace lines 5-6:
```ts
import type { Property } from '../../types/Property';
```
with:
```ts
import type { Property } from '../../types/Property';
import type { Amenity } from '../../utils/amenities';
```

Then replace lines 35-39:
```ts
  // === Step 4 ===
  conditionAndAmenities: {
    condition: 'rough' | 'whitebox' | 'good' | 'euro' | '';
    furnished: boolean | null; // tri-state (null = unset)
  };
```
with:
```ts
  // === Step 4 ===
  conditionAndAmenities: {
    condition: 'rough' | 'whitebox' | 'good' | 'euro' | '';
    furnished: boolean | null; // tri-state (null = unset)
    amenities: Amenity[]; // v4.0.1 — optional multi-select; default [].
  };
```

- [ ] **Step 2: Locate `emptyFormBag` and add the field.**

Run: `grep -n "emptyFormBag" src/components/ContextualListingFlow/validators.ts`

Open the file and find the `emptyFormBag` factory. In the `conditionAndAmenities` literal, add `amenities: [],` after the existing fields. The block should now look like:
```ts
    conditionAndAmenities: {
      condition: '',
      furnished: null,
      amenities: [],
    },
```

- [ ] **Step 3: Type-check + run existing flow tests.**

Run: `npx tsc --noEmit && npm test -- --testPathPattern='ContextualListingFlow'`
Expected: all ContextualListingFlow tests still pass (`amenities: []` default is no-op for current assertions).

- [ ] **Step 4: Commit.**

```bash
git add src/components/ContextualListingFlow/types.ts src/components/ContextualListingFlow/validators.ts
git commit -m "feat(form): add FormBag.conditionAndAmenities.amenities field

Extends FormBag with amenities: Amenity[] (default []). Optional —
no validation gate. emptyFormBag() now seeds [].

Issue 2 of docs/superpowers/specs/2026-05-25-listing-form-detail-polish-design.md"
```

---

## Task 11: Wire amenities through `adapters.ts` (rehydrate-intersect + payload)

**Files:**
- Modify: `src/components/ContextualListingFlow/adapters.ts:39-42, 90-93`
- Modify: `src/components/ContextualListingFlow/__tests__/adapters.test.ts`

- [ ] **Step 1: Write failing tests for rehydration + payload.**

Open `src/components/ContextualListingFlow/__tests__/adapters.test.ts`. After the last existing `describe` block, append:
```ts
import { RESIDENTIAL_AMENITIES, HOSPITALITY_AMENITIES } from '../../../utils/amenities';

describe('v4.0.1 amenities round-trip', () => {
  test('propertyToFormBag rehydrates amenities by intersecting with the type-valid set', () => {
    const p = {
      propertyType: 'apartment' as const,
      amenities: ['aircon', 'washer', 'breakfast', 'reception24'], // breakfast + reception24 are hospitality-only
    };
    const bag = propertyToFormBag(p);
    // breakfast + reception24 must be dropped — they're not in RESIDENTIAL_AMENITIES.
    expect(bag.conditionAndAmenities.amenities).toEqual(['aircon', 'washer']);
  });

  test('propertyToFormBag rehydrates full hospitality set on a hotel listing', () => {
    const p = {
      propertyType: 'hotel' as const,
      amenities: [...HOSPITALITY_AMENITIES],
    };
    const bag = propertyToFormBag(p);
    expect(bag.conditionAndAmenities.amenities).toEqual([...HOSPITALITY_AMENITIES]);
  });

  test('propertyToFormBag with no amenities returns []', () => {
    const p = { propertyType: 'apartment' as const };
    const bag = propertyToFormBag(p);
    expect(bag.conditionAndAmenities.amenities).toEqual([]);
  });

  test('propertyToFormBag with unrecognized propertyType returns [] amenities', () => {
    const p = { propertyType: undefined, amenities: ['wifi', 'aircon'] as any };
    const bag = propertyToFormBag(p);
    expect(bag.conditionAndAmenities.amenities).toEqual([]);
  });

  test('formBagToPropertyPayload writes amenities to the top-level field', () => {
    const bag = {
      ...({} as any),
      dealType: 'rent_long',
      propertyType: 'apartment',
      location: { city: 'bishkek', district: 'alamedin-1', coordinates: null, showExactAddress: false },
      basics: { areaSqm: '50', price: '500', currency: 'USD' },
      conditionAndAmenities: { condition: 'good', furnished: true, amenities: ['aircon', 'washer'] },
      content: { title: 't', description: 'd', language: 'ru' },
      terms: {},
    };
    const payload = formBagToPropertyPayload(bag);
    expect(payload.amenities).toEqual(['aircon', 'washer']);
  });
});
```

- [ ] **Step 2: Run tests, expect failures.**

Run: `npm test -- --testPathPattern='adapters'`
Expected: 5 new tests FAIL (`bag.conditionAndAmenities.amenities` undefined; `payload.amenities` undefined).

- [ ] **Step 3: Update `propertyToFormBag` to populate amenities.**

Open `src/components/ContextualListingFlow/adapters.ts`. At the top of the file, after the existing imports, add:
```ts
import { getAmenitiesForPropertyType } from '../../utils/amenities';
import type { Amenity } from '../../utils/amenities';
```

Then replace lines 39-42 (the existing `conditionAndAmenities` literal):
```ts
    conditionAndAmenities: {
      condition: (p.conditionAndAmenities?.condition ?? '') as FormBag['conditionAndAmenities']['condition'],
      furnished: p.conditionAndAmenities?.furnished ?? null,
    },
```
with:
```ts
    conditionAndAmenities: {
      condition: (p.conditionAndAmenities?.condition ?? '') as FormBag['conditionAndAmenities']['condition'],
      furnished: p.conditionAndAmenities?.furnished ?? null,
      // v4.0.1 — intersect persisted amenities with the type-valid set so the
      // form only surfaces toggles the user can act on. Out-of-set tokens
      // (e.g. 'breakfast' on a re-typed hostel→apartment listing) are dropped.
      amenities: (() => {
        const valid = new Set<Amenity>(getAmenitiesForPropertyType(p.propertyType) as readonly Amenity[]);
        return (p.amenities ?? []).filter((a) => valid.has(a as Amenity)) as Amenity[];
      })(),
    },
```

- [ ] **Step 4: Update `formBagToPropertyPayload` to write amenities.**

Find lines 90-93 in `adapters.ts`:
```ts
    conditionAndAmenities: {
      condition: v.conditionAndAmenities.condition,
      furnished: v.conditionAndAmenities.furnished ?? undefined,
    },
```
Replace with:
```ts
    conditionAndAmenities: {
      condition: v.conditionAndAmenities.condition,
      furnished: v.conditionAndAmenities.furnished ?? undefined,
    },
    // v4.0.1 — amenities persist at top level (matches M2 schema); FormBag groups
    // them under conditionAndAmenities purely as a form-time UX adjacency to condition + furnished.
    amenities: v.conditionAndAmenities.amenities,
```

- [ ] **Step 5: Run tests, expect all pass.**

Run: `npm test -- --testPathPattern='adapters'`
Expected: all tests PASS (existing + 5 new).

- [ ] **Step 6: Type-check.**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Commit.**

```bash
git add src/components/ContextualListingFlow/adapters.ts src/components/ContextualListingFlow/__tests__/adapters.test.ts
git commit -m "feat(form): wire amenities through adapters (rehydrate-intersect + payload)

propertyToFormBag now intersects property.amenities with the type-valid
set (drops orphan tokens from re-typed listings). formBagToPropertyPayload
writes amenities at the top-level Mongo field.

5 new round-trip tests lock the contract.

Issue 2 of docs/superpowers/specs/2026-05-25-listing-form-detail-polish-design.md"
```

---

## Task 12: Append amenity multi-select to `Step4ConditionAmenities`

**Files:**
- Modify: `src/components/ContextualListingFlow/Step4ConditionAmenities.tsx`
- Modify: `src/components/ContextualListingFlow/__tests__/Step4.test.tsx`

- [ ] **Step 1: Write failing tests for the new chip grid.**

Open `src/components/ContextualListingFlow/__tests__/Step4.test.tsx`. Append the following block AFTER the last existing `describe` block (after line 178):

```ts
import {
  RESIDENTIAL_AMENITIES,
  HOSPITALITY_AMENITIES,
  COMMERCIAL_AMENITIES,
} from '../../../utils/amenities';

describe('Step4ConditionAmenities — v4.0.1 amenity multi-select', () => {
  test('apartment propertyType renders all 12 residential amenity chips', async () => {
    const values: FormBag = { ...emptyFormBag(), propertyType: 'apartment' };
    const { root } = await renderStep4({ values });
    for (const token of RESIDENTIAL_AMENITIES) {
      expect(findByTestID(root, `amenity-chip-${token}`)).toBeTruthy();
    }
  });

  test('hotel propertyType renders all 12 hospitality amenity chips', async () => {
    const values: FormBag = { ...emptyFormBag(), propertyType: 'hotel' };
    const { root } = await renderStep4({ values });
    for (const token of HOSPITALITY_AMENITIES) {
      expect(findByTestID(root, `amenity-chip-${token}`)).toBeTruthy();
    }
  });

  test('office propertyType renders 5 commercial amenity chips', async () => {
    const values: FormBag = { ...emptyFormBag(), propertyType: 'office' };
    const { root } = await renderStep4({ values });
    for (const token of COMMERCIAL_AMENITIES) {
      expect(findByTestID(root, `amenity-chip-${token}`)).toBeTruthy();
    }
    // And NOT a residential-only chip.
    expect(tryFindByTestID(root, 'amenity-chip-washer')).toBeNull();
  });

  test('empty/unknown propertyType renders no amenity chip row', async () => {
    // emptyFormBag() defaults propertyType: '' → resolver returns [] → row omitted.
    const { root } = await renderStep4();
    expect(tryFindByTestID(root, 'amenity-chip-row')).toBeNull();
  });

  test('tapping an amenity chip adds it to amenities', async () => {
    const values: FormBag = { ...emptyFormBag(), propertyType: 'apartment' };
    const { root, onChange } = await renderStep4({ values });
    const chip = findByTestID(root, 'amenity-chip-aircon');
    await ReactTestRenderer.act(async () => {
      chip.props.onPress();
    });
    const last = onChange.mock.calls[onChange.mock.calls.length - 1];
    expect(last[0]).toBe('conditionAndAmenities');
    expect((last[1] as FormBag['conditionAndAmenities']).amenities).toEqual(['aircon']);
  });

  test('tapping an already-selected chip removes it from amenities', async () => {
    const values: FormBag = {
      ...emptyFormBag(),
      propertyType: 'apartment',
      conditionAndAmenities: { condition: '', furnished: null, amenities: ['aircon', 'washer'] },
    };
    const { root, onChange } = await renderStep4({ values });
    const chip = findByTestID(root, 'amenity-chip-aircon');
    await ReactTestRenderer.act(async () => {
      chip.props.onPress();
    });
    const last = onChange.mock.calls[onChange.mock.calls.length - 1];
    expect(last[0]).toBe('conditionAndAmenities');
    expect((last[1] as FormBag['conditionAndAmenities']).amenities).toEqual(['washer']);
  });
});
```

- [ ] **Step 2: Run tests, expect new tests to fail.**

Run: `npm test -- --testPathPattern='Step4'`
Expected: 6 new amenity tests FAIL (`amenity-chip-*` testIDs don't exist yet); 8 existing condition/furnished tests PASS.

- [ ] **Step 3: Add amenity multi-select section to `Step4ConditionAmenities.tsx`.**

Open `src/components/ContextualListingFlow/Step4ConditionAmenities.tsx`. Replace the existing imports block (lines 17-23) with:
```tsx
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import type { TranslationKeys } from '../../locales';
import { commonStyles } from './styles';
import type { SectionProps, FormBag } from './types';
import {
  getAmenitiesForPropertyType,
  AMENITY_ICONS,
  AMENITY_LABEL_KEYS,
  type Amenity,
} from '../../utils/amenities';
```

Inside the component function, AFTER the existing `setCA` declaration, add:
```tsx
  const validAmenities = getAmenitiesForPropertyType(values.propertyType);
  const selectedAmenities = values.conditionAndAmenities.amenities;

  const toggleAmenity = (token: Amenity): void => {
    const next = selectedAmenities.includes(token)
      ? selectedAmenities.filter((a) => a !== token)
      : [...selectedAmenities, token];
    setCA({ amenities: next });
  };
```

Then, AFTER the closing `</View>` of the "Furnished row" section (i.e. just before the final `</View>` that closes the component's root), insert:
```tsx
      {/* Amenity multi-select — v4.0.1. Renders empty when propertyType resolves to []. */}
      {validAmenities.length > 0 && (
        <View style={commonStyles.section}>
          <Text style={[commonStyles.sectionLabel, { color: colors.text }]}>
            {t('property.whatThisPlaceOffers')}
          </Text>
          <View style={commonStyles.chipRow} testID="amenity-chip-row">
            {validAmenities.map((token) => {
              const isActive = selectedAmenities.includes(token);
              const Icon = AMENITY_ICONS[token];
              return (
                <TouchableOpacity
                  key={token}
                  testID={`amenity-chip-${token}`}
                  style={[
                    commonStyles.chip,
                    {
                      backgroundColor: isActive
                        ? colors.activeChipBackground
                        : isDark
                        ? '#2C2C2E'
                        : '#F2F2F7',
                      borderColor: isDark ? '#3A3A3C' : '#E5E5EA',
                      flexDirection: 'row',
                      gap: 6,
                    },
                  ]}
                  onPress={() => toggleAmenity(token)}
                >
                  <Icon size={14} color={isActive ? colors.activeChipText : colors.text} />
                  <Text
                    style={[
                      commonStyles.chipText,
                      { color: isActive ? colors.activeChipText : colors.text },
                    ]}
                  >
                    {t(AMENITY_LABEL_KEYS[token] as TranslationKeys)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}
```

- [ ] **Step 4: Run tests, expect all pass.**

Run: `npm test -- --testPathPattern='Step4'`
Expected: PASS — existing + new amenity tests.

- [ ] **Step 5: Type-check.**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit.**

```bash
git add src/components/ContextualListingFlow/Step4ConditionAmenities.tsx src/components/ContextualListingFlow/__tests__/Step4.test.tsx
git commit -m "feat(form): amenity multi-select on Step 4 (per property type)

Adds a 'What this place offers' chip grid below the existing condition
+ furnished sections. Chip set resolves from propertyType via
getAmenitiesForPropertyType(): 12 residential for apartment/house,
12 hospitality for hotel/hostel, 5 commercial for office/commercial.
Multi-select; optional; no validation gate.

Issue 2 of docs/superpowers/specs/2026-05-25-listing-form-detail-polish-design.md"
```

---

## Task 13: Unify amenity rendering on `PropertyDetailsScreen`

**Files:**
- Modify: `src/screens/PropertyDetailsScreen.tsx:131, 1093-1145`

- [ ] **Step 1: Update the import to use `Amenity`.**

In `src/screens/PropertyDetailsScreen.tsx`, find the existing import line (around line 131):
```ts
import { AMENITY_ICONS, type HospitalityAmenity } from '../utils/hospitalityAmenities';
```
Replace with:
```ts
import { AMENITY_ICONS, type Amenity } from '../utils/amenities';
```

- [ ] **Step 2: Replace the two-branch amenity render with a single branch.**

Find the block at lines 1093-1145 (begins with `{/* Features - title + box with two-column grid ... */}` and ends after the closing `)}` of the `isHospitality ? (...) : (...)` ternary). Replace the ENTIRE block with:
```tsx
          {/* What this place offers — v4.0.1 unified. Renders for any property type
              when amenities.length > 0. Hospitality keeps its 12-item set;
              apartments/houses get the 12-item residential set; office/commercial
              get the 5-item commercial set. */}
          {(property.amenities ?? []).length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {t('property.whatThisPlaceOffers')}
              </Text>
              <View style={[styles.sectionContentBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.featuresGrid}>
                  {((property.amenities || []) as Amenity[]).map((token) => {
                    const Icon = AMENITY_ICONS[token] ?? Check;
                    return (
                      <View key={token} style={styles.featureItem}>
                        <Icon size={20} color={colors.textSecondary} />
                        <Text
                          style={[styles.featureItemText, { color: colors.text }]}
                          numberOfLines={1}
                          ellipsizeMode="tail"
                        >
                          {t(`amenity.${token}` as TranslationKeys)}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            </View>
          )}
```

- [ ] **Step 3: Verify no other references to `isHospitality` need adjustment.**

Run: `grep -n "isHospitality" src/screens/PropertyDetailsScreen.tsx`
Expected output: several lines elsewhere in the file (specs section, mod dock height, etc.) — those are unrelated to amenities and should NOT be changed.

- [ ] **Step 4: Run tests + type-check.**

Run: `npx tsc --noEmit && npm test -- --testPathPattern='PropertyDetailsScreen'`
Expected: all PropertyDetailsScreen tests pass. The legacy `property.features` array (text amenities from before M2) is intentionally dropped from this rendering — its data is no longer surfaced anywhere new, only via the structured `property.amenities` field.

- [ ] **Step 5: Commit.**

```bash
git add src/screens/PropertyDetailsScreen.tsx
git commit -m "feat(detail): unified 'What this place offers' for all property types

Drops the isHospitality gate on the amenity grid — section now renders
for any property whose amenities array is non-empty. The legacy
non-hospitality 'features' (free-text array) branch is removed; data
flows exclusively through property.amenities now.

Issue 2 of docs/superpowers/specs/2026-05-25-listing-form-detail-polish-design.md"
```

---

## Task 14: Manual device QA + final commit

After all 13 tasks land, do an on-device sanity pass before merging.

- [ ] **Step 1: Build for iOS Simulator.**

Run: `npx react-native run-ios`
Expected: clean build.

- [ ] **Step 2: Walk through every fix.**

1. Toggle dark mode in system settings.
2. Open create-listing → Step 3. Bedrooms / bathroom +/- circles are amber with crisp white +/−; disabled state (at min/max) drops opacity. Light-mode + dark-mode both readable.
3. Step 6, prepayment chip row reads `Без предоплаты | 1 месяц | 2 месяца | Указать своё`. Tap `Указать своё` — custom-months input appears below.
4. Footer Back / Next buttons on every step render chevron and label inline.
5. Step 4 shows condition + furnished AND a new chip grid below. Change propertyType on Step 1 → return to Step 4 → chip set updates. Toggle some chips, advance to Step 5+6, submit.
6. Open the freshly-created listing's detail page:
   - "What this place offers" renders the selected amenities with icons.
   - Below the description, the meta info renders as a 2-column icon-tile grid (Condition / Furnished / Min term / Deposit / Prepayment / Negotiable), each tile localized.
7. Open a pre-existing hospitality listing — its 12-item amenity grid still renders.
8. Open a pre-existing apartment that has no amenities — section just doesn't render (no empty box).

- [ ] **Step 3: Build for Android.**

Run: `npx react-native run-android` (or use `gradlew :react-native-reanimated:assembleRelease :app:bundleRelease` per memory `android-reanimated-clean-prefab-gotcha.md` if doing a release build).
Expected: clean build, same walkthrough holds.

- [ ] **Step 4: Run the full test suite one final time.**

Run: `npm test`
Expected: all tests PASS.

- [ ] **Step 5: Final commit (only if there are uncommitted polish tweaks).**

If steps 1–4 surfaced no issues, no commit is needed — the per-task commits already cover the work. If a tweak was needed (e.g. tile spacing on a tablet), make a single follow-up commit:
```bash
git add <files>
git commit -m "polish(v4.0.1): device-QA tweaks"
```

---

## Self-Review

After writing this plan, run the following spot-check (no subagent dispatch):

**Spec coverage:**

| Spec issue | Implementing task(s) |
|---|---|
| Issue 1 (stepper contrast) | Task 3 |
| Issue 2 (amenities restore) | Tasks 6, 7, 8, 9, 10, 11, 12, 13 |
| Issue 3 (Airbnb tiles) | Tasks 4, 5 |
| Issue 4 (back-button stack) | Task 1 |
| Issue 5 ("Своё" rename) | Task 2 |

**Type consistency:**

- `Amenity` defined in Task 6, consumed in Tasks 9, 10, 11, 12, 13 with the same union shape.
- `getAmenitiesForPropertyType()` defined in Task 6, consumed in Tasks 11 + 12 with the same signature.
- `AMENITY_ICONS` + `AMENITY_LABEL_KEYS` defined in Task 6, consumed in Task 12 (form) + Task 13 (detail, via direct `t(\`amenity.${token}\`)` rather than the label-keys map — both paths are valid).
- `RESIDENTIAL_AMENITIES`, `HOSPITALITY_AMENITIES`, `COMMERCIAL_AMENITIES` defined in Task 6, exercised in adapter tests (Task 11) and Step4 tests (Task 12).

**Placeholder scan:** Clean. Task 12's tests use the file's existing `renderStep4` / `findByTestID` / `tryFindByTestID` helpers verbatim — no stubs.

**Execution choice:** see the next message.

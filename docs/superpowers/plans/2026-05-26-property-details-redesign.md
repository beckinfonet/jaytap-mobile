# Property Details Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild `PropertyDetailsScreen` above the description block to match the 2026-05-26 design-team mockup — four new dedicated components under `src/components/details/`, plus a small `cityToCountry` util — overwriting the v4.0 tile-grid and specs-row decisions from commits `3af92b6` / `738a49f` / `301c331` / `a065105`.

**Architecture:** Bottom-up TDD. Build leaf utilities and components first (each a single-responsibility file under ~250 LOC with its own test), then refactor `PropertyDetailsScreen.tsx` to consume them and delete the inline blocks they replace, finally clean up `ListingMetaTable.tsx`'s now-orphan tile-grid code. Nine atomic commits — one per task. PropertyDetailsScreen drops ~300 LOC.

**Tech Stack:** React Native 0.84 (New Architecture), TypeScript, `react-test-renderer` + `jest` (NOT React Testing Library — project convention per `ListingMetaTable.test.tsx` L20-23), `lucide-react-native`, `react-native-maps@1.27.1`, theme via `useTheme()`, i18n via `useLanguage()` + `src/locales/{en,ru}.ts`.

**Source spec:** `docs/superpowers/specs/2026-05-26-property-details-redesign-design.md` (committed as `32048d8`).

---

## File Structure

| File | Purpose | Op |
|---|---|---|
| `src/utils/cityToCountry.ts` | KG/KZ/UZ city→country lookup util | Create |
| `src/utils/__tests__/cityToCountry.test.ts` | Unit tests for `cityToCountry` | Create |
| `src/locales/en.ts` | Add `property.mapPreview.openButton`, `country.KG/KZ/UZ` | Modify |
| `src/locales/ru.ts` | Same RU parity | Modify |
| `src/components/details/MapPreviewCard.tsx` | New thumbnail map card with neighborhood + city + coords + "Map" button | Create |
| `src/components/details/__tests__/MapPreviewCard.test.tsx` | Render + lookup + button-callback tests | Create |
| `src/components/details/AttributeList.tsx` | New row-list attribute pattern + exports `derivePropertyAttributes` | Create |
| `src/components/details/__tests__/AttributeList.test.tsx` | Helper tests + row render tests | Create |
| `src/components/details/KeyStatsCard.tsx` | New beds/baths/area card with big numbers | Create |
| `src/components/details/__tests__/KeyStatsCard.test.tsx` | Cell-omission + suffix tests | Create |
| `src/components/details/HeaderInfoCard.tsx` | New header with FOR SALE / ID pills + title + address + divider + mapPreview slot | Create |
| `src/components/details/__tests__/HeaderInfoCard.test.tsx` | Pill conditional + slot tests | Create |
| `src/screens/PropertyDetailsScreen.tsx` | Wire 4 new components; delete hero badge, title-card, specs row, inline MapView | Modify |
| `src/screens/__tests__/PropertyDetailsScreen.test.tsx` | Migrate fullScreen/specsRow assertions to new components | Modify |
| `src/components/ListingMetaTable.tsx` | Drop `extrasTiles`, drop `Tile` sub-component, drop unused Lucide imports + styles | Modify |
| `src/components/__tests__/ListingMetaTable.test.tsx` | Drop tile-grid assertions; keep ID + Availability coverage | Modify |

---

## Task 1: `cityToCountry` util

**Files:**
- Create: `src/utils/cityToCountry.ts`
- Create: `src/utils/__tests__/cityToCountry.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/utils/__tests__/cityToCountry.test.ts`:

```ts
import { cityToCountry } from '../cityToCountry';

describe('cityToCountry', () => {
  describe('KG', () => {
    it('routes Bishkek (EN) → KG', () => {
      expect(cityToCountry('Bishkek')).toBe('KG');
    });
    it('routes Бишкек (RU) → KG', () => {
      expect(cityToCountry('Бишкек')).toBe('KG');
    });
    it('routes Osh and Ош → KG', () => {
      expect(cityToCountry('Osh')).toBe('KG');
      expect(cityToCountry('Ош')).toBe('KG');
    });
  });

  describe('KZ', () => {
    it('routes Almaty / Алматы → KZ', () => {
      expect(cityToCountry('Almaty')).toBe('KZ');
      expect(cityToCountry('Алматы')).toBe('KZ');
    });
    it('routes Astana / Астана → KZ', () => {
      expect(cityToCountry('Astana')).toBe('KZ');
      expect(cityToCountry('Астана')).toBe('KZ');
    });
    it('routes Shymkent / Шымкент → KZ', () => {
      expect(cityToCountry('Shymkent')).toBe('KZ');
      expect(cityToCountry('Шымкент')).toBe('KZ');
    });
  });

  describe('UZ', () => {
    it('routes Tashkent / Ташкент → UZ', () => {
      expect(cityToCountry('Tashkent')).toBe('UZ');
      expect(cityToCountry('Ташкент')).toBe('UZ');
    });
    it('routes Samarkand / Самарканд → UZ', () => {
      expect(cityToCountry('Samarkand')).toBe('UZ');
      expect(cityToCountry('Самарканд')).toBe('UZ');
    });
  });

  describe('edge cases', () => {
    it('trims whitespace', () => {
      expect(cityToCountry('  Bishkek  ')).toBe('KG');
    });
    it('returns undefined for unknown city', () => {
      expect(cityToCountry('Paris')).toBeUndefined();
    });
    it('returns undefined for empty string', () => {
      expect(cityToCountry('')).toBeUndefined();
    });
    it('returns undefined for undefined input', () => {
      expect(cityToCountry(undefined)).toBeUndefined();
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/utils/__tests__/cityToCountry.test.ts -- --no-coverage`
Expected: FAIL — `Cannot find module '../cityToCountry'`.

- [ ] **Step 3: Write minimal implementation**

Create `src/utils/cityToCountry.ts`:

```ts
/**
 * Maps a city name (EN or RU spelling) to its ISO 3166-1 alpha-2 country code.
 * Scope: KG / KZ / UZ capitals + major secondary cities — JayTap's launch markets
 * per `.planning/PROJECT.md`. Unknown cities return undefined; callers should
 * fall back to showing the city alone.
 *
 * This is a temporary lookup until `Property.location.country` is added to the
 * schema (deferred to a future milestone per the 2026-05-26 design spec § 9).
 */

export type CountryCode = 'KG' | 'KZ' | 'UZ';

const CITY_TO_COUNTRY: Record<string, CountryCode> = {
  // KG
  Bishkek: 'KG',
  Бишкек: 'KG',
  Osh: 'KG',
  Ош: 'KG',
  // KZ
  Almaty: 'KZ',
  Алматы: 'KZ',
  Astana: 'KZ',
  Астана: 'KZ',
  Shymkent: 'KZ',
  Шымкент: 'KZ',
  // UZ
  Tashkent: 'UZ',
  Ташкент: 'UZ',
  Samarkand: 'UZ',
  Самарканд: 'UZ',
};

export function cityToCountry(city?: string): CountryCode | undefined {
  if (!city) return undefined;
  return CITY_TO_COUNTRY[city.trim()];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/utils/__tests__/cityToCountry.test.ts -- --no-coverage`
Expected: PASS — 13 tests in 1 describe block × 4 sub-blocks.

- [ ] **Step 5: Commit**

```bash
git add src/utils/cityToCountry.ts src/utils/__tests__/cityToCountry.test.ts
git commit -m "feat(utils): cityToCountry lookup for KG/KZ/UZ majors

Bilingual (EN + RU spelling) lookup for the eight cities the launch
markets actually use today. Returns undefined for unknown — callers fall
back to city-only render. Temporary until Property.location.country lands
in a future schema phase.

13 tests / 1 commit. Part of M5 Phase 1 details redesign."
```

---

## Task 2: i18n keys

**Files:**
- Modify: `src/locales/en.ts`
- Modify: `src/locales/ru.ts`

- [ ] **Step 1: Add keys to `en.ts`**

Open `src/locales/en.ts`. Find the `property.metaNegotiable` line (~line 120). Add immediately after it:

```ts
  'property.mapPreview.openButton': 'Map',
```

Find a sensible location near the bottom of the file before the closing `};` (after the last `property.*` block). Add:

```ts
  // Country lookup labels — see src/utils/cityToCountry.ts. Used by MapPreviewCard.
  'country.KG': 'Kyrgyzstan',
  'country.KZ': 'Kazakhstan',
  'country.UZ': 'Uzbekistan',
```

- [ ] **Step 2: Add same keys to `ru.ts`**

Open `src/locales/ru.ts`. Find the matching `property.metaNegotiable` location. Add:

```ts
  'property.mapPreview.openButton': 'Карта',
```

And at the matching bottom location:

```ts
  // Country lookup labels — see src/utils/cityToCountry.ts. Used by MapPreviewCard.
  'country.KG': 'Кыргызстан',
  'country.KZ': 'Казахстан',
  'country.UZ': 'Узбекистан',
```

- [ ] **Step 3: Run i18n parity gate (if the project has one)**

Run: `npm test -- --testPathPattern=i18n -- --no-coverage`
Expected: PASS — any existing i18n parity test passes; both locales have the same key set.

If the project has no i18n parity test in this path, run `npx tsc --noEmit` to confirm both files still typecheck.

- [ ] **Step 4: Run TypeScript check on `TranslationKeys`**

Run: `npx tsc --noEmit 2>&1 | grep -E "country|mapPreview"`
Expected: empty output (no errors mentioning the new keys).

- [ ] **Step 5: Commit**

```bash
git add src/locales/en.ts src/locales/ru.ts
git commit -m "i18n: add property.mapPreview.openButton + country.{KG,KZ,UZ}

4 new keys × EN/RU parity. Consumed by MapPreviewCard (next commit).
'Map' / 'Карта' is the chevron-suffixed thumbnail button label;
country names round-trip the cityToCountry lookup."
```

---

## Task 3: `MapPreviewCard` component

**Files:**
- Create: `src/components/details/MapPreviewCard.tsx`
- Create: `src/components/details/__tests__/MapPreviewCard.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/components/details/__tests__/MapPreviewCard.test.tsx`:

```tsx
/**
 * MapPreviewCard test — render contract per M5 Phase 1 spec § 4.3.
 * Uses react-test-renderer + act per project convention (ListingMetaTable.test.tsx L20-23).
 * `t` mock returns the i18n key verbatim, so button-text assertions check for the
 * literal key string 'property.mapPreview.openButton'.
 */

import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { Text, TouchableOpacity } from 'react-native';

jest.mock('../../../theme/ThemeContext', () => ({ useTheme: jest.fn() }));
jest.mock('../../../context/LanguageContext', () => ({ useLanguage: jest.fn() }));

// react-native-maps mock — mirrors ListingMetaTable.test.tsx pattern.
jest.mock('react-native-maps', () => {
  const React = require('react');
  const { View } = require('react-native');
  const MapView = ({ children, testID, ...rest }: any) =>
    React.createElement(View, { testID: testID ?? 'map-view', ...rest }, children);
  const Marker = ({ children, ...rest }: any) =>
    React.createElement(View, { testID: 'map-marker', ...rest }, children);
  return { __esModule: true, default: MapView, Marker, PROVIDER_DEFAULT: 'default' };
});

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { useTheme } = require('../../../theme/ThemeContext');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { useLanguage } = require('../../../context/LanguageContext');
import { MapPreviewCard } from '../MapPreviewCard';

const setupMocks = () => {
  useTheme.mockReturnValue({
    isDark: false,
    colors: {
      text: '',
      textSecondary: '',
      textTertiary: '',
      surface: '',
      border: '',
      accent: '#FF385C',
    },
  });
  useLanguage.mockReturnValue({
    t: (key: string) => key,
    language: 'en',
  });
};

beforeEach(() => {
  jest.clearAllMocks();
  setupMocks();
});

const defaultProps = {
  coordinates: { latitude: 42.87, longitude: 74.61 },
  district: 'Alamedin-1',
  city: 'Bishkek',
  onOpenFullScreen: jest.fn(),
};

const findAllText = (root: TestRenderer.ReactTestInstance): string[] =>
  root
    .findAllByType(Text)
    .map((n) => (Array.isArray(n.props.children) ? n.props.children.join('') : String(n.props.children ?? '')));

describe('MapPreviewCard', () => {
  it('renders district as the bold heading', () => {
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(<MapPreviewCard {...defaultProps} />);
    });
    expect(findAllText(renderer.root)).toContain('Alamedin-1');
  });

  it('renders city followed by country resolved via cityToCountry', () => {
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(<MapPreviewCard {...defaultProps} />);
    });
    const texts = findAllText(renderer.root);
    // city line contains 'Bishkek' and the country i18n key (mock returns key verbatim).
    expect(texts.some((s) => s.includes('Bishkek') && s.includes('country.KG'))).toBe(true);
  });

  it('omits country when city is not in the lookup', () => {
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(<MapPreviewCard {...defaultProps} city="Paris" />);
    });
    const texts = findAllText(renderer.root);
    // city line should be 'Paris' alone — no 'country.*' key present.
    expect(texts.some((s) => s === 'Paris')).toBe(true);
    expect(texts.some((s) => /country\./.test(s))).toBe(false);
  });

  it('formats coords as "42.87° N · 74.61° E"', () => {
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(<MapPreviewCard {...defaultProps} />);
    });
    expect(findAllText(renderer.root)).toContain('42.87° N · 74.61° E');
  });

  it('flips cardinal letters for negative coords', () => {
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(
        <MapPreviewCard {...defaultProps} coordinates={{ latitude: -34.6, longitude: -58.38 }} />
      );
    });
    expect(findAllText(renderer.root)).toContain('34.60° S · 58.38° W');
  });

  it('calls onOpenFullScreen when the "Map" button is pressed', () => {
    const onOpen = jest.fn();
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(<MapPreviewCard {...defaultProps} onOpenFullScreen={onOpen} />);
    });
    const button = renderer.root
      .findAllByType(TouchableOpacity)
      .find((n) =>
        findAllText(n).some((s) => s.includes('property.mapPreview.openButton'))
      );
    expect(button).toBeDefined();
    act(() => {
      button!.props.onPress();
    });
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it('omits the district line when district is undefined', () => {
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(<MapPreviewCard {...defaultProps} district={undefined} />);
    });
    expect(findAllText(renderer.root)).not.toContain('Alamedin-1');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/components/details/__tests__/MapPreviewCard.test.tsx -- --no-coverage`
Expected: FAIL — `Cannot find module '../MapPreviewCard'`.

- [ ] **Step 3: Write the implementation**

Create `src/components/details/MapPreviewCard.tsx`:

```tsx
/**
 * MapPreviewCard — small thumbnail card with neighborhood, city, coords, and a
 * "Map" button. Replaces the inline full-width <MapView> at the bottom of
 * PropertyDetailsScreen. The "Map" button opens the existing full-screen map
 * modal (caller wires `onOpenFullScreen`).
 *
 * Spec: docs/superpowers/specs/2026-05-26-property-details-redesign-design.md § 4.3
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { cityToCountry } from '../../utils/cityToCountry';
import type { TranslationKeys } from '../../locales';

export interface MapPreviewCardProps {
  coordinates: { latitude: number; longitude: number };
  district?: string;
  city?: string;
  onOpenFullScreen: () => void;
}

function formatCoords(lat: number, lng: number): string {
  const ns = lat >= 0 ? 'N' : 'S';
  const ew = lng >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(2)}° ${ns} · ${Math.abs(lng).toFixed(2)}° ${ew}`;
}

export const MapPreviewCard: React.FC<MapPreviewCardProps> = ({
  coordinates,
  district,
  city,
  onOpenFullScreen,
}) => {
  const { colors } = useTheme();
  const { t } = useLanguage();

  const countryCode = cityToCountry(city);
  const cityLine =
    city && countryCode
      ? `${city}, ${t(`country.${countryCode}` as TranslationKeys)}`
      : city ?? '';

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <View style={[styles.thumbWrap, { borderColor: colors.border }]}>
        <MapView
          style={styles.thumb}
          provider={PROVIDER_DEFAULT}
          initialRegion={{
            latitude: coordinates.latitude,
            longitude: coordinates.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
          scrollEnabled={false}
          zoomEnabled={false}
          pitchEnabled={false}
          rotateEnabled={false}
          mapType="mutedStandard"
        >
          <Marker coordinate={coordinates} pinColor={colors.accent} />
        </MapView>
      </View>

      <View style={styles.textCol}>
        {district ? (
          <Text style={[styles.district, { color: colors.text }]} numberOfLines={1}>
            {district}
          </Text>
        ) : null}
        {cityLine ? (
          <Text
            style={[styles.city, { color: colors.textSecondary }]}
            numberOfLines={1}
          >
            {cityLine}
          </Text>
        ) : null}
        <Text style={[styles.coords, { color: colors.textTertiary }]}>
          {formatCoords(coordinates.latitude, coordinates.longitude)}
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.button, { borderColor: colors.border }]}
        onPress={onOpenFullScreen}
        accessibilityRole="button"
      >
        <Text style={[styles.buttonLabel, { color: colors.text }]}>
          {t('property.mapPreview.openButton' as TranslationKeys)} →
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
  },
  thumbWrap: {
    width: 96,
    height: 96,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
  },
  thumb: {
    width: '100%',
    height: '100%',
  },
  textCol: {
    flex: 1,
    minWidth: 0,
  },
  district: {
    fontSize: 18,
    fontWeight: '800',
  },
  city: {
    fontSize: 13,
    marginTop: 2,
  },
  coords: {
    fontSize: 12,
    marginTop: 6,
    fontVariant: ['tabular-nums'],
  },
  button: {
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  buttonLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/components/details/__tests__/MapPreviewCard.test.tsx -- --no-coverage`
Expected: PASS — 7 tests.

- [ ] **Step 5: Commit**

```bash
git add src/components/details/MapPreviewCard.tsx src/components/details/__tests__/MapPreviewCard.test.tsx
git commit -m "feat(details): MapPreviewCard thumbnail with neighborhood + coords

96x96 react-native-maps thumb with all gestures disabled + theme-tinted
default pin. District (bold), city + cityToCountry-resolved country, coords
formatted as '42.87° N · 74.61° E' with tabular numerals. 'Map' button
calls onOpenFullScreen — caller wires the existing fullscreen modal.

7 tests covering district/city/country/coords/cardinal/button-callback.
Part of M5 Phase 1 details redesign."
```

---

## Task 4: `derivePropertyAttributes` pure helper

**Files:**
- Create: `src/components/details/AttributeList.tsx` (helper only in this task; component lands in Task 5)
- Create: `src/components/details/__tests__/AttributeList.test.tsx` (helper tests only in this task)

- [ ] **Step 1: Write the failing test**

Create `src/components/details/__tests__/AttributeList.test.tsx`:

```tsx
/**
 * AttributeList — derivePropertyAttributes (helper) tests.
 * Component tests added in Task 5.
 * Pure-function unit tests against the 6-field derivation.
 */

import { derivePropertyAttributes } from '../AttributeList';
import type { Property } from '../../../types/Property';

const tStub = (key: string) => key;

describe('derivePropertyAttributes', () => {
  it('returns an empty array when no relevant fields are set', () => {
    const property = {} as Property;
    expect(derivePropertyAttributes(property, tStub)).toEqual([]);
  });

  it('emits a Condition row when conditionAndAmenities.condition is set', () => {
    const property = { conditionAndAmenities: { condition: 'euro' } } as Property;
    const rows = derivePropertyAttributes(property, tStub);
    expect(rows).toHaveLength(1);
    expect(rows[0].kind).toBe('condition');
    expect(rows[0].label).toBe('property.metaCondition');
    expect(rows[0].value).toBe('condition.euro');
  });

  it('routes the condition dot color through theme tokens — euro → success-ish', () => {
    const property = { conditionAndAmenities: { condition: 'euro' } } as Property;
    const rows = derivePropertyAttributes(property, tStub);
    if (rows[0].kind === 'condition') {
      expect(rows[0].colorToken).toBe('success');
    } else {
      throw new Error('expected condition row');
    }
  });

  it.each([
    ['good', 'warning'],
    ['needsRepair', 'error'],
  ])('routes condition %s → color token %s', (cond, token) => {
    const property = { conditionAndAmenities: { condition: cond as any } } as Property;
    const rows = derivePropertyAttributes(property, tStub);
    if (rows[0].kind === 'condition') {
      expect(rows[0].colorToken).toBe(token);
    }
  });

  it('emits a boolean Furnished row (on=true) when furnished is true', () => {
    const property = { conditionAndAmenities: { furnished: true } } as Property;
    const rows = derivePropertyAttributes(property, tStub);
    const furnished = rows.find((r) => r.label === 'property.metaFurnishedYes');
    expect(furnished?.kind).toBe('boolean');
    if (furnished?.kind === 'boolean') {
      expect(furnished.on).toBe(true);
      expect(furnished.value).toBe('common.yes');
    }
  });

  it('emits a boolean Furnished row (on=false) when furnished is false', () => {
    const property = { conditionAndAmenities: { furnished: false } } as Property;
    const rows = derivePropertyAttributes(property, tStub);
    const furnished = rows.find((r) => r.label === 'property.metaFurnishedNo');
    expect(furnished?.kind).toBe('boolean');
    if (furnished?.kind === 'boolean') {
      expect(furnished.on).toBe(false);
      expect(furnished.value).toBe('common.no');
    }
  });

  it('emits a boolean Negotiable row', () => {
    const property = { terms: { negotiable: true } } as Property;
    const rows = derivePropertyAttributes(property, tStub);
    const neg = rows.find((r) => r.label === 'property.metaNegotiable');
    expect(neg?.kind).toBe('boolean');
  });

  it('emits a plain Min term row when terms.minTerm is set', () => {
    const property = { terms: { minTerm: '1_month' } } as Property;
    const rows = derivePropertyAttributes(property, tStub);
    const minTerm = rows.find((r) => r.label === 'property.metaMinTerm');
    expect(minTerm?.kind).toBe('plain');
    expect(minTerm?.value).toBe('minTerm.1_month');
  });

  it('emits a plain Deposit row formatted "amount currency"', () => {
    const property = { terms: { deposit: { amount: 500, currency: 'USD' } } } as Property;
    const rows = derivePropertyAttributes(property, tStub);
    const dep = rows.find((r) => r.label === 'property.metaDeposit');
    expect(dep?.kind).toBe('plain');
    expect(dep?.value).toBe('500 USD');
  });

  it('emits a plain Prepayment row (0 → "none" key, otherwise count)', () => {
    const zero = { terms: { prepaymentMonths: 0 } } as Property;
    const one = { terms: { prepaymentMonths: 1 } } as Property;
    const zeroRow = derivePropertyAttributes(zero, tStub).find((r) => r.label === 'property.metaPrepayment');
    const oneRow = derivePropertyAttributes(one, tStub).find((r) => r.label === 'property.metaPrepayment');
    expect(zeroRow?.value).toBe('prepayment.none');
    expect(oneRow?.value).toBe('1');
  });

  it('returns rows in fixed order: Condition, Furnished, Negotiable, MinTerm, Deposit, Prepayment', () => {
    const property = {
      conditionAndAmenities: { condition: 'good', furnished: true },
      terms: {
        negotiable: false,
        minTerm: '3_months',
        deposit: { amount: 100, currency: 'KGS' },
        prepaymentMonths: 2,
      },
    } as Property;
    const rows = derivePropertyAttributes(property, tStub);
    expect(rows.map((r) => r.label)).toEqual([
      'property.metaCondition',
      'property.metaFurnishedYes',
      'property.metaNegotiable',
      'property.metaMinTerm',
      'property.metaDeposit',
      'property.metaPrepayment',
    ]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/components/details/__tests__/AttributeList.test.tsx -- --no-coverage`
Expected: FAIL — `Cannot find module '../AttributeList'`.

- [ ] **Step 3: Write the helper (component stub for now)**

Create `src/components/details/AttributeList.tsx`:

```tsx
/**
 * AttributeList — single-column rows of property attributes. Pure-data shape
 * (`AttributeRow`) + derivation (`derivePropertyAttributes`) live alongside
 * the rendering component so consumers can use either piece.
 *
 * Spec: docs/superpowers/specs/2026-05-26-property-details-redesign-design.md § 4.2
 */

import React from 'react';
import {
  PaintBucket,
  Sofa,
  CalendarRange,
  Banknote,
  CalendarClock,
  Handshake,
  type LucideIcon,
} from 'lucide-react-native';
import type { Property } from '../../types/Property';
import type { TranslationKeys } from '../../locales';

type TFn = (key: TranslationKeys, params?: Record<string, string>) => string;

export type ConditionColorToken = 'success' | 'warning' | 'orange' | 'error';

export type AttributeRow =
  | { kind: 'condition'; icon: LucideIcon; label: string; value: string; colorToken: ConditionColorToken }
  | { kind: 'boolean'; icon: LucideIcon; label: string; value: string; on: boolean }
  | { kind: 'plain'; icon: LucideIcon; label: string; value: string };

const CONDITION_COLOR: Record<string, ConditionColorToken> = {
  euro: 'success',
  good: 'warning',
  cosmetic: 'orange',
  needsRepair: 'error',
};

export function derivePropertyAttributes(property: Property, t: TFn): AttributeRow[] {
  const rows: AttributeRow[] = [];
  const ca = property.conditionAndAmenities;
  const terms = property.terms;

  if (ca?.condition != null) {
    rows.push({
      kind: 'condition',
      icon: PaintBucket,
      label: t('property.metaCondition' as TranslationKeys),
      value: t(`condition.${ca.condition}` as TranslationKeys),
      colorToken: CONDITION_COLOR[ca.condition] ?? 'warning',
    });
  }

  if (ca?.furnished != null) {
    rows.push({
      kind: 'boolean',
      icon: Sofa,
      label: ca.furnished
        ? t('property.metaFurnishedYes' as TranslationKeys)
        : t('property.metaFurnishedNo' as TranslationKeys),
      value: ca.furnished
        ? t('common.yes' as TranslationKeys)
        : t('common.no' as TranslationKeys),
      on: ca.furnished,
    });
  }

  if (terms?.negotiable != null) {
    rows.push({
      kind: 'boolean',
      icon: Handshake,
      label: t('property.metaNegotiable' as TranslationKeys),
      value: terms.negotiable
        ? t('common.yes' as TranslationKeys)
        : t('common.no' as TranslationKeys),
      on: terms.negotiable,
    });
  }

  if (terms?.minTerm != null) {
    rows.push({
      kind: 'plain',
      icon: CalendarRange,
      label: t('property.metaMinTerm' as TranslationKeys),
      value: t(`minTerm.${terms.minTerm}` as TranslationKeys),
    });
  }

  if (terms?.deposit != null) {
    rows.push({
      kind: 'plain',
      icon: Banknote,
      label: t('property.metaDeposit' as TranslationKeys),
      value: `${terms.deposit.amount} ${terms.deposit.currency}`,
    });
  }

  if (terms?.prepaymentMonths != null) {
    rows.push({
      kind: 'plain',
      icon: CalendarClock,
      label: t('property.metaPrepayment' as TranslationKeys),
      value:
        terms.prepaymentMonths === 0
          ? t('prepayment.none' as TranslationKeys)
          : String(terms.prepaymentMonths),
    });
  }

  return rows;
}

// AttributeList component lands in Task 5.
export interface AttributeListProps {
  rows: AttributeRow[];
}

export const AttributeList: React.FC<AttributeListProps> = () => null;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/components/details/__tests__/AttributeList.test.tsx -- --no-coverage`
Expected: PASS — 11 tests.

- [ ] **Step 5: Commit**

```bash
git add src/components/details/AttributeList.tsx src/components/details/__tests__/AttributeList.test.tsx
git commit -m "feat(details): derivePropertyAttributes pure helper

Derives a discriminated-union AttributeRow[] from a Property: Condition
(enum-routed color token), Furnished + Negotiable (boolean on/off), and
Min term / Deposit / Prepayment (plain). Same 6-field semantics as the
prior tile-grid in ListingMetaTable. Fixed display order. Component
rendering stays a stub in this commit — lands in the next task.

11 tests covering empty input, each row variant, condition color routing,
and stable order. Part of M5 Phase 1 details redesign."
```

---

## Task 5: `AttributeList` rendering component

**Files:**
- Modify: `src/components/details/AttributeList.tsx`
- Modify: `src/components/details/__tests__/AttributeList.test.tsx`

- [ ] **Step 1: Add the failing render tests**

Append to `src/components/details/__tests__/AttributeList.test.tsx` (after the existing `describe('derivePropertyAttributes', …)` block):

```tsx
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { View, Text } from 'react-native';
import { AttributeList } from '../AttributeList';

jest.mock('../../../theme/ThemeContext', () => ({ useTheme: jest.fn() }));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { useTheme } = require('../../../theme/ThemeContext');

const setupRenderMocks = () => {
  useTheme.mockReturnValue({
    isDark: true,
    colors: {
      text: '',
      textSecondary: '',
      textTertiary: '',
      border: '',
      success: '#4CAF50',
      warning: '#F59E0B',
      error: '#F44336',
    },
  });
};

const findAllText = (root: TestRenderer.ReactTestInstance): string[] =>
  root
    .findAllByType(Text)
    .map((n) => (Array.isArray(n.props.children) ? n.props.children.join('') : String(n.props.children ?? '')));

describe('AttributeList component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupRenderMocks();
  });

  it('renders nothing when rows is empty', () => {
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(<AttributeList rows={[]} />);
    });
    expect(renderer.toJSON()).toBeNull();
  });

  it('renders one row per item', () => {
    const rows = [
      {
        kind: 'plain' as const,
        icon: (() => null) as any,
        label: 'A',
        value: '1',
      },
      {
        kind: 'plain' as const,
        icon: (() => null) as any,
        label: 'B',
        value: '2',
      },
    ];
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(<AttributeList rows={rows} />);
    });
    const text = findAllText(renderer.root);
    expect(text).toContain('A');
    expect(text).toContain('B');
    expect(text).toContain('1');
    expect(text).toContain('2');
  });

  it('drops borderBottom on the last row', () => {
    const rows = [
      { kind: 'plain' as const, icon: (() => null) as any, label: 'A', value: '1' },
      { kind: 'plain' as const, icon: (() => null) as any, label: 'B', value: '2' },
    ];
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(<AttributeList rows={rows} />);
    });
    const allRows = renderer.root.findAllByProps({ testID: 'attribute-row' });
    expect(allRows).toHaveLength(2);
    // Last row's flattened style has borderBottomWidth 0; non-last rows have hairline.
    const flatten = (style: any): any => (Array.isArray(style) ? Object.assign({}, ...style.filter(Boolean)) : style ?? {});
    expect(flatten(allRows[0].props.style).borderBottomWidth).toBeGreaterThan(0);
    expect(flatten(allRows[1].props.style).borderBottomWidth).toBe(0);
  });
});
```

- [ ] **Step 2: Run tests to verify the new ones fail**

Run: `npx jest src/components/details/__tests__/AttributeList.test.tsx -- --no-coverage`
Expected: 3 new tests FAIL (component currently returns `null` for non-empty rows too, and has no `testID`).

- [ ] **Step 3: Implement the component**

Replace the stub at the bottom of `src/components/details/AttributeList.tsx`:

```tsx
// Replace the previous `export const AttributeList ...` line and everything
// below it with this:

import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

export interface AttributeListProps {
  rows: AttributeRow[];
}

export const AttributeList: React.FC<AttributeListProps> = ({ rows }) => {
  const { colors } = useTheme();
  if (rows.length === 0) return null;

  const conditionColor = (token: ConditionColorToken): string => {
    switch (token) {
      case 'success':
        return colors.success;
      case 'warning':
        return colors.warning;
      case 'orange':
        return '#F0A500';
      case 'error':
        return colors.error;
    }
  };

  return (
    <View>
      {rows.map((row, idx) => {
        const isLast = idx === rows.length - 1;
        const Icon = row.icon;
        return (
          <View
            key={`${row.label}-${idx}`}
            testID="attribute-row"
            style={[
              styles.row,
              { borderBottomColor: colors.border },
              !isLast && { borderBottomWidth: StyleSheet.hairlineWidth },
              isLast && { borderBottomWidth: 0 },
            ]}
          >
            <View style={styles.left}>
              <Icon size={18} color={colors.textSecondary} strokeWidth={1.7} />
              <Text style={[styles.label, { color: colors.textSecondary }]} numberOfLines={1}>
                {row.label}
              </Text>
            </View>
            <View style={styles.right}>
              {row.kind === 'condition' ? (
                <View
                  style={[
                    styles.dot,
                    { backgroundColor: conditionColor(row.colorToken) },
                  ]}
                />
              ) : null}
              {row.kind === 'boolean' ? (
                <View
                  style={[
                    styles.badge,
                    { backgroundColor: row.on ? colors.success : colors.textTertiary },
                  ]}
                >
                  <Text style={styles.badgeGlyph}>{row.on ? '✓' : '×'}</Text>
                </View>
              ) : null}
              <Text style={[styles.value, { color: colors.text }]} numberOfLines={1}>
                {row.value}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexShrink: 1,
    minWidth: 0,
  },
  label: {
    fontSize: 14,
    flexShrink: 1,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexShrink: 0,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  badge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeGlyph: {
    color: '#FFFFFF',
    fontSize: 11,
    lineHeight: 13,
    fontWeight: '700',
  },
  value: {
    fontSize: 15,
    fontWeight: '700',
  },
});
```

- [ ] **Step 4: Run tests to verify all pass**

Run: `npx jest src/components/details/__tests__/AttributeList.test.tsx -- --no-coverage`
Expected: PASS — 14 tests total (11 helper + 3 render).

- [ ] **Step 5: Commit**

```bash
git add src/components/details/AttributeList.tsx src/components/details/__tests__/AttributeList.test.tsx
git commit -m "feat(details): AttributeList renders row pattern with indicators

Single-column row list driven by the AttributeRow[] union from the
helper. Lucide line icons on the left, indicator-by-kind on the right:
condition rows show a colored dot (theme tokens — success/warning/orange/
error), boolean rows show a green ✓ or grey × badge, plain rows show
bold value only. Hairline divider between rows; last row drops border.

3 additional render tests on top of the 11 helper tests from Task 4.
Part of M5 Phase 1 details redesign."
```

---

## Task 6: `KeyStatsCard` component

**Files:**
- Create: `src/components/details/KeyStatsCard.tsx`
- Create: `src/components/details/__tests__/KeyStatsCard.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/components/details/__tests__/KeyStatsCard.test.tsx`:

```tsx
/**
 * KeyStatsCard test — beds (omittable) + baths + area card.
 */

import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { Text, View } from 'react-native';

jest.mock('../../../theme/ThemeContext', () => ({ useTheme: jest.fn() }));
jest.mock('../../../context/LanguageContext', () => ({ useLanguage: jest.fn() }));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { useTheme } = require('../../../theme/ThemeContext');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { useLanguage } = require('../../../context/LanguageContext');
import { KeyStatsCard } from '../KeyStatsCard';

beforeEach(() => {
  jest.clearAllMocks();
  useTheme.mockReturnValue({
    isDark: true,
    colors: { text: '', textSecondary: '', textTertiary: '', surface: '', border: '' },
  });
  useLanguage.mockReturnValue({ t: (k: string) => k, language: 'en' });
});

const findAllText = (root: TestRenderer.ReactTestInstance): string[] =>
  root
    .findAllByType(Text)
    .map((n) => (Array.isArray(n.props.children) ? n.props.children.join('') : String(n.props.children ?? '')));

describe('KeyStatsCard', () => {
  it('renders beds + baths + area cells when all provided', () => {
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(
        <KeyStatsCard
          beds={{ value: 3, labelKey: 'property.specs.bedrooms' as any }}
          baths={3.5}
          areaSqm={300}
        />
      );
    });
    const texts = findAllText(renderer.root);
    expect(texts).toContain('3');
    expect(texts).toContain('3.5');
    expect(texts).toContain('300');
    expect(texts).toContain('property.specs.bedrooms');
    expect(texts).toContain('property.specs.bathrooms');
  });

  it('omits the beds cell entirely when beds is undefined', () => {
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(
        <KeyStatsCard beds={undefined} baths={2} areaSqm={120} />
      );
    });
    expect(renderer.root.findAllByProps({ testID: 'stat-beds' })).toHaveLength(0);
    expect(renderer.root.findAllByProps({ testID: 'stat-baths' })).toHaveLength(1);
    expect(renderer.root.findAllByProps({ testID: 'stat-area' })).toHaveLength(1);
  });

  it('renders "m²" inline next to the area number', () => {
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(
        <KeyStatsCard beds={undefined} baths={1} areaSqm={50} />
      );
    });
    const area = renderer.root.findByProps({ testID: 'stat-area' });
    const areaTexts = area
      .findAllByType(Text)
      .map((n) => String(n.props.children ?? ''));
    expect(areaTexts).toContain('m²');
  });

  it('renders "-" when baths or areaSqm is undefined', () => {
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(
        <KeyStatsCard beds={undefined} baths={undefined as any} areaSqm={undefined} />
      );
    });
    const texts = findAllText(renderer.root);
    expect(texts.filter((t) => t === '-').length).toBeGreaterThanOrEqual(2);
  });

  it('applies textTransform: uppercase to label styles', () => {
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(
        <KeyStatsCard
          beds={{ value: 1, labelKey: 'property.specs.bedrooms' as any }}
          baths={1}
          areaSqm={50}
        />
      );
    });
    const labels = renderer.root
      .findAllByType(Text)
      .filter((n) => String(n.props.children) === 'property.specs.bedrooms');
    expect(labels.length).toBeGreaterThan(0);
    const flatten = (style: any): any => (Array.isArray(style) ? Object.assign({}, ...style.filter(Boolean)) : style ?? {});
    expect(flatten(labels[0].props.style).textTransform).toBe('uppercase');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/components/details/__tests__/KeyStatsCard.test.tsx -- --no-coverage`
Expected: FAIL — `Cannot find module '../KeyStatsCard'`.

- [ ] **Step 3: Write the implementation**

Create `src/components/details/KeyStatsCard.tsx`:

```tsx
/**
 * KeyStatsCard — bedrooms / bathrooms / area card.
 * Spec: docs/superpowers/specs/2026-05-26-property-details-redesign-design.md § 4.4
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import type { TranslationKeys } from '../../locales';

export interface KeyStatsCardProps {
  beds?: { value: number | string; labelKey: TranslationKeys };
  baths?: number | string;
  areaSqm?: number;
}

export const KeyStatsCard: React.FC<KeyStatsCardProps> = ({ beds, baths, areaSqm }) => {
  const { colors } = useTheme();
  const { t } = useLanguage();

  const Divider: React.FC = () => (
    <View
      style={{
        width: 1,
        backgroundColor: colors.border,
        marginVertical: 6,
        opacity: 0.5,
      }}
    />
  );

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      {beds ? (
        <View style={styles.stat} testID="stat-beds">
          <View style={styles.numberRow}>
            <Text style={[styles.number, { color: colors.text }]}>{String(beds.value)}</Text>
          </View>
          <Text
            style={[styles.label, { color: colors.textTertiary }]}
            numberOfLines={1}
          >
            {t(beds.labelKey)}
          </Text>
        </View>
      ) : null}
      {beds ? <Divider /> : null}

      <View style={styles.stat} testID="stat-baths">
        <View style={styles.numberRow}>
          <Text style={[styles.number, { color: colors.text }]}>
            {baths != null ? String(baths) : '-'}
          </Text>
        </View>
        <Text style={[styles.label, { color: colors.textTertiary }]} numberOfLines={1}>
          {t('property.specs.bathrooms' as TranslationKeys)}
        </Text>
      </View>

      <Divider />

      <View style={styles.stat} testID="stat-area">
        <View style={styles.numberRow}>
          <Text style={[styles.number, { color: colors.text }]}>
            {areaSqm != null ? String(areaSqm) : '-'}
          </Text>
          <Text style={[styles.unit, { color: colors.textSecondary }]}>m²</Text>
        </View>
        <Text style={[styles.label, { color: colors.textTertiary }]} numberOfLines={1}>
          {t('property.specs.area' as TranslationKeys)}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 20,
    paddingHorizontal: 12,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  numberRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  number: {
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: -0.5,
    lineHeight: 38,
  },
  unit: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 3,
  },
  label: {
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    fontWeight: '600',
    marginTop: 8,
  },
});
```

- [ ] **Step 4: Verify `property.specs.area` exists in locales (add if missing)**

Run: `grep -n "property.specs.area" src/locales/en.ts src/locales/ru.ts`

If both files have a hit, skip. If missing, add to both:
- `src/locales/en.ts`: `'property.specs.area': 'Area',`
- `src/locales/ru.ts`: `'property.specs.area': 'Площадь',`

(Add near the other `property.specs.*` keys.)

- [ ] **Step 5: Run test to verify it passes**

Run: `npx jest src/components/details/__tests__/KeyStatsCard.test.tsx -- --no-coverage`
Expected: PASS — 5 tests.

- [ ] **Step 6: Commit**

```bash
git add src/components/details/KeyStatsCard.tsx src/components/details/__tests__/KeyStatsCard.test.tsx src/locales/en.ts src/locales/ru.ts
git commit -m "feat(details): KeyStatsCard with big numbers + m² unit suffix

Beds / Baths / Area card. Beds cell omittable for office/commercial.
m² as small inline appendage on the area cell (not its own column).
Labels uppercase via textTransform style (no translation re-keying).

5 tests including beds-cell omission, m² placement, and '-' fallback
when fields are missing. Optionally adds property.specs.area key if
the project didn't already have it.

Part of M5 Phase 1 details redesign."
```

---

## Task 7: `HeaderInfoCard` component

**Files:**
- Create: `src/components/details/HeaderInfoCard.tsx`
- Create: `src/components/details/__tests__/HeaderInfoCard.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/components/details/__tests__/HeaderInfoCard.test.tsx`:

```tsx
/**
 * HeaderInfoCard test — pill row + status pill + title + address + divider + map slot.
 */

import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { Text, View } from 'react-native';

jest.mock('../../../theme/ThemeContext', () => ({ useTheme: jest.fn() }));
jest.mock('../../../context/LanguageContext', () => ({ useLanguage: jest.fn() }));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { useTheme } = require('../../../theme/ThemeContext');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { useLanguage } = require('../../../context/LanguageContext');
import { HeaderInfoCard } from '../HeaderInfoCard';

beforeEach(() => {
  jest.clearAllMocks();
  useTheme.mockReturnValue({
    isDark: true,
    colors: {
      text: '',
      textSecondary: '',
      textTertiary: '',
      surface: '',
      border: '',
      accent: '#FF385C',
    },
  });
  useLanguage.mockReturnValue({ t: (k: string) => k, language: 'en' });
});

const findAllText = (root: TestRenderer.ReactTestInstance): string[] =>
  root
    .findAllByType(Text)
    .map((n) => (Array.isArray(n.props.children) ? n.props.children.join('') : String(n.props.children ?? '')));

const defaultProps = {
  dealType: 'sale' as const,
  listingId: '664-402',
  title: 'Best house money can buy',
  formattedAddress: { line1: 'Alamedin-1, ул. Ахунбаева 142', line2: 'Bishkek' },
};

describe('HeaderInfoCard', () => {
  it('renders FOR SALE pill when dealType is "sale"', () => {
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(<HeaderInfoCard {...defaultProps} />);
    });
    expect(findAllText(renderer.root)).toContain('property.forSale');
  });

  it('renders FOR RENT pill when dealType is not "sale"', () => {
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(<HeaderInfoCard {...defaultProps} dealType="rent" />);
    });
    expect(findAllText(renderer.root)).toContain('property.forRent');
  });

  it('renders the listing ID pill with leading #', () => {
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(<HeaderInfoCard {...defaultProps} />);
    });
    expect(findAllText(renderer.root)).toContain('#664-402');
  });

  it('omits the listing ID pill when listingId is null', () => {
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(<HeaderInfoCard {...defaultProps} listingId={null} />);
    });
    expect(renderer.root.findAllByProps({ testID: 'id-pill' })).toHaveLength(0);
  });

  it('renders the title verbatim', () => {
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(<HeaderInfoCard {...defaultProps} />);
    });
    expect(findAllText(renderer.root)).toContain('Best house money can buy');
  });

  it('renders address line1 and line2 with a · separator', () => {
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(<HeaderInfoCard {...defaultProps} />);
    });
    const texts = findAllText(renderer.root);
    expect(texts).toContain('Alamedin-1, ул. Ахунбаева 142');
    expect(texts.some((s) => s.includes('·') && s.includes('Bishkek'))).toBe(true);
  });

  it('renders the statusPill slot between pills and title', () => {
    const sentinel = (<Text testID="status-sentinel">STATUS_X</Text>);
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(<HeaderInfoCard {...defaultProps} statusPill={sentinel} />);
    });
    expect(renderer.root.findAllByProps({ testID: 'status-sentinel' })).toHaveLength(1);
  });

  it('renders the mapPreview slot below the divider', () => {
    const sentinel = (<View testID="map-sentinel"><Text>MAP</Text></View>);
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(<HeaderInfoCard {...defaultProps} mapPreview={sentinel} />);
    });
    expect(renderer.root.findAllByProps({ testID: 'map-sentinel' })).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/components/details/__tests__/HeaderInfoCard.test.tsx -- --no-coverage`
Expected: FAIL — `Cannot find module '../HeaderInfoCard'`.

- [ ] **Step 3: Write the implementation**

Create `src/components/details/HeaderInfoCard.tsx`:

```tsx
/**
 * HeaderInfoCard — FOR SALE / ID pills, title, address, red divider, map slot.
 * Spec: docs/superpowers/specs/2026-05-26-property-details-redesign-design.md § 4.1
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MapPin } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import type { TranslationKeys } from '../../locales';

export interface HeaderInfoCardProps {
  dealType: 'sale' | 'rent' | string;
  listingId?: string | null;
  title: string;
  formattedAddress: { line1: string; line2?: string };
  statusPill?: React.ReactNode;
  mapPreview?: React.ReactNode;
}

export const HeaderInfoCard: React.FC<HeaderInfoCardProps> = ({
  dealType,
  listingId,
  title,
  formattedAddress,
  statusPill,
  mapPreview,
}) => {
  const { colors } = useTheme();
  const { t } = useLanguage();

  const dealKey: TranslationKeys =
    dealType === 'sale'
      ? ('property.forSale' as TranslationKeys)
      : ('property.forRent' as TranslationKeys);

  const hasId = !!listingId && listingId.trim().length > 0;

  return (
    <View style={styles.container}>
      <View style={styles.pillRow}>
        <View style={styles.dealPill}>
          <View style={[styles.accentBar, { backgroundColor: colors.accent }]} />
          <Text style={[styles.dealLabel, { color: colors.accent }]} numberOfLines={1}>
            {t(dealKey)}
          </Text>
        </View>
        {hasId ? (
          <View
            testID="id-pill"
            style={[styles.idPill, { borderColor: colors.accent }]}
          >
            <Text style={[styles.idLabel, { color: colors.accent }]} numberOfLines={1}>
              #{listingId}
            </Text>
          </View>
        ) : null}
      </View>

      {statusPill ? <View style={styles.statusSlot}>{statusPill}</View> : null}

      <Text style={[styles.title, { color: colors.text }]} numberOfLines={3}>
        {title}
      </Text>

      <View style={styles.addressRow}>
        <MapPin size={16} color={colors.accent} />
        <Text
          style={[styles.addressStreet, { color: colors.text }]}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {formattedAddress.line1}
        </Text>
        {formattedAddress.line2 ? (
          <Text style={[styles.addressCity, { color: colors.textSecondary }]} numberOfLines={1}>
            {` · ${formattedAddress.line2}`}
          </Text>
        ) : null}
      </View>

      <View style={[styles.divider, { backgroundColor: colors.accent }]} />

      {mapPreview ? <View style={styles.mapSlot}>{mapPreview}</View> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  pillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  dealPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  accentBar: {
    width: 3,
    height: 14,
    borderRadius: 2,
  },
  dealLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  idPill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  idLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  statusSlot: {
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    lineHeight: 28,
    marginBottom: 10,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addressStreet: {
    fontSize: 13,
    fontWeight: '600',
    flexShrink: 1,
    minWidth: 0,
  },
  addressCity: {
    fontSize: 13,
    flexShrink: 0,
  },
  divider: {
    height: 2,
    width: '38%',
    borderRadius: 1,
    marginTop: 14,
  },
  mapSlot: {
    marginTop: 14,
  },
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/components/details/__tests__/HeaderInfoCard.test.tsx -- --no-coverage`
Expected: PASS — 8 tests.

- [ ] **Step 5: Commit**

```bash
git add src/components/details/HeaderInfoCard.tsx src/components/details/__tests__/HeaderInfoCard.test.tsx
git commit -m "feat(details): HeaderInfoCard with FOR SALE / ID pills + map slot

FOR SALE / FOR RENT pill (vertical accent bar + uppercase label) on
the left, red-outlined #listingId pill on the right (omits when ID
missing). Title (24pt bold, up to 3 lines). Single-line address with
MapPin icon, street ellipsises, city after a · separator never
truncates. Short red divider (38% width). statusPill and mapPreview
slots for caller composition.

8 tests covering pill conditionals, dealType routing, address layout,
slot composition. Part of M5 Phase 1 details redesign."
```

---

## Task 8: Wire new components into `PropertyDetailsScreen` (and delete the replaced inline blocks)

**Files:**
- Modify: `src/screens/PropertyDetailsScreen.tsx`
- Modify: `src/screens/__tests__/PropertyDetailsScreen.test.tsx`

This task is structurally bigger than the others because it bundles the wiring AND the deletion. Steps are sized to keep each under ~5 min.

- [ ] **Step 1: Update the screen test to assert the new contract**

Open `src/screens/__tests__/PropertyDetailsScreen.test.tsx`. The file uses `react-test-renderer + act` (confirmed at L21) and a `collectTexts(tree)` helper at L164. Find the existing assertions that reference:

- the inline `'property.forSale'` / `'property.forRent'` strings tested against the hero-overlay `statusBadge`
- the inline map's overlay button text (`'property.fullScreen'` or similar)
- the old specs row's emoji-prefixed beds/baths/area cells

Replace those assertions with the new contract. Drop in this block (anchored next to the existing `describe(...)` that covers the screen render path):

```ts
it('does NOT render For Sale / For Rent inside the hero image overlay', () => {
  const tree = renderScreen(makeLiveSaleProperty());
  // The hero-overlay statusBadge no longer carries the deal label. The
  // pagination badge stays (separate testID upstream).
  const heroBadges = tree.root.findAllByProps({ testID: 'hero-overlay-deal-label' });
  expect(heroBadges).toHaveLength(0);
});

it('renders FOR SALE in the HeaderInfoCard pill row (replaces hero badge)', () => {
  const tree = renderScreen(makeLiveSaleProperty());
  // `t` mock returns the i18n key verbatim per project convention.
  expect(collectTexts(tree)).toContain('property.forSale');
});

it('renders the MapPreviewCard "Map" button (replaces the inline map fullScreen overlay)', () => {
  const tree = renderScreen(makeLiveSaleProperty());
  const texts = collectTexts(tree);
  expect(texts.some((s) => s.includes('property.mapPreview.openButton'))).toBe(true);
  // The old overlay button text is gone:
  expect(texts.some((s) => s.includes('property.fullScreen'))).toBe(false);
});
```

`makeLiveSaleProperty()` is the existing fixture-builder in the file (look near L192's `renderScreen`). If the file uses a different fixture name (e.g. `buildLiveSaleProperty`, `mockProperty`), match it — don't invent. The `collectTexts(tree)` helper is at L164 of the file.

- [ ] **Step 2: Run the screen tests to confirm the new assertions fail**

Run: `npx jest src/screens/__tests__/PropertyDetailsScreen.test.tsx -- --no-coverage`
Expected: 3 new assertions FAIL (FOR SALE missing in title block, "Map" missing, old overlay text still present).

- [ ] **Step 3: Edit `PropertyDetailsScreen.tsx` — imports + props consumption**

Open `src/screens/PropertyDetailsScreen.tsx`. At the top of the import block, add:

```ts
import { HeaderInfoCard } from '../components/details/HeaderInfoCard';
import { AttributeList, derivePropertyAttributes } from '../components/details/AttributeList';
import { MapPreviewCard } from '../components/details/MapPreviewCard';
import { KeyStatsCard } from '../components/details/KeyStatsCard';
```

Remove the now-unused inline import of `ListingMetaTable` ONLY IF no other call site in this file uses it (the file may still need it elsewhere — check with `grep -n ListingMetaTable src/screens/PropertyDetailsScreen.tsx` before deleting).

- [ ] **Step 4: Replace the hero-overlay deal badge (lines ~798–805)**

Locate the block:

```tsx
<View style={[styles.statusBadge, { backgroundColor: colors.surface }]}>
  <Text style={[styles.statusText, { color: colors.text }]}>
    {property.dealType !== 'sale' ? t('property.forRent') : t('property.forSale')}
  </Text>
</View>
```

Delete the entire `<View style={[styles.statusBadge, …]}>…</View>` block. The pagination badge sibling (lines 807–813) stays.

- [ ] **Step 5: Replace the title-info card (lines ~915–953)**

Replace the entire `<View style={styles.section}>` that contains `<View style={[styles.listingInfoCard, …]}>` (lines 916–953) with:

```tsx
<View style={styles.section}>
  <HeaderInfoCard
    dealType={property.dealType ?? 'rent'}
    listingId={property.listingId}
    title={titleText}
    formattedAddress={formatAddress(addressDisplay)}
    statusPill={
      (property.status ?? 'live') !== 'live'
        ? <StatusPill status={property.status} />
        : undefined
    }
    mapPreview={
      <MapPreviewCard
        coordinates={propertyCoordinates}
        district={property.location?.district}
        city={property.location?.city}
        onOpenFullScreen={() => setIsMapFullScreen(true)}
      />
    }
  />
</View>
```

- [ ] **Step 6: Replace the specs row (lines ~963–991)**

Replace the entire `<View style={[styles.specsContainer, …]}>…</View>` block with:

```tsx
<View style={styles.section}>
  <KeyStatsCard
    beds={
      showBedsCell
        ? { value: bedsValue, labelKey: bedsLabelKey as TranslationKeys }
        : undefined
    }
    baths={property.basics?.bathroomCount ?? '-'}
    areaSqm={property.basics?.areaSqm}
  />
</View>
```

(The local variables `showBedsCell`, `bedsValue`, and `bedsLabelKey` already exist in the file — they were established by Phase 8 Plan 08-04. If `TranslationKeys` isn't already imported, add `import type { TranslationKeys } from '../locales';` to the import block.)

- [ ] **Step 7: Insert the attribute list between description and "What this place offers"**

Find the description block (lines ~993–1001). After the description's closing `</View>`, before the "What this place offers" block, insert:

```tsx
<View style={styles.section}>
  <AttributeList rows={derivePropertyAttributes(property, t)} />
</View>
```

- [ ] **Step 8: Delete the inline map block (lines ~1041–1075)**

Locate and delete the entire `<View style={[styles.mapContainer, …]}>…</View>` block that contains the inline `<MapView>` and its `mapOverlayButton`. The full-screen map MODAL further down (lines ~1274+) stays — it's what `setIsMapFullScreen(true)` opens.

- [ ] **Step 9: Delete now-orphan styles in the StyleSheet at the bottom of the file**

Remove these entries (the exact list may include 1–2 extras you discover during the edit):

- `listingInfoCard`
- `title` (component-local; the new title style lives in `HeaderInfoCard`)
- `addressRow`
- `address`
- `specsContainer`
- `specItem`
- `specRow`
- `specIcon`
- `specValue`
- `specLabel`
- `verticalDivider`
- `mapContainer`
- `map`
- `mapOverlayButton`
- `mapOverlayButtonText`
- `statusBadge` and `statusText` IF no other usage remains (`grep -n statusBadge src/screens/PropertyDetailsScreen.tsx`).

- [ ] **Step 10: TypeScript check**

Run: `npx tsc --noEmit 2>&1 | grep PropertyDetailsScreen`
Expected: zero new errors. (Pre-existing errors in `App.tsx` re `Property.tours` from memory `phase45-landlord-application-uid-mismatch-bug` are unrelated; they are not in PropertyDetailsScreen.tsx and must not increase.)

- [ ] **Step 11: Run the screen tests to verify all pass**

Run: `npx jest src/screens/__tests__/PropertyDetailsScreen.test.tsx -- --no-coverage`
Expected: PASS (existing tests + the 3 new assertions from Step 1).

- [ ] **Step 12: Run the full test suite to confirm no regressions**

Run: `npx jest -- --no-coverage`
Expected: PASS for everything except possibly `ListingMetaTable.test.tsx`'s tile-grid assertions (those get fixed in Task 9). Note any failures whose root cause isn't the impending Task 9 cleanup.

- [ ] **Step 13: KBD-02 grep gate**

Run: `grep -rn 'keyboardVerticalOffset' src/ | grep -v '__tests__' | grep -v '__mocks__'`
Expected: zero hits. (Memory `m1-keyboard-kbd-02-invariants` — this project bans the prop in src/ since M1.)

- [ ] **Step 14: Commit**

```bash
git add src/screens/PropertyDetailsScreen.tsx src/screens/__tests__/PropertyDetailsScreen.test.tsx
git commit -m "feat(details): wire HeaderInfoCard/MapPreview/AttributeList/KeyStats

Replaces the hero-overlay deal badge (deleted), the title/ID/availability
card (replaced with HeaderInfoCard + nested MapPreviewCard), the
emoji-prefixed specs row (replaced with KeyStatsCard), and the inline
full-width <MapView> (deleted — the new MapPreviewCard 'Map' button
opens the existing full-screen modal). AttributeList renders the new
row pattern below the description, replacing the prior 2-up tile grid
position.

PropertyDetailsScreen drops ~300 LOC. KBD-02 grep gate still 0.
Screen test assertions migrated to the new contract.

Part of M5 Phase 1 details redesign."
```

---

## Task 9: Clean up `ListingMetaTable.tsx` (remove the now-orphan tile grid)

**Files:**
- Modify: `src/components/ListingMetaTable.tsx`
- Modify: `src/components/__tests__/ListingMetaTable.test.tsx`

The tile-grid path inside `ListingMetaTable` is no longer rendered by any consumer (PropertyDetailsScreen now uses `AttributeList` directly). Drop it.

- [ ] **Step 1: Edit the test — drop tile-grid assertions, keep ID + Availability**

Open `src/components/__tests__/ListingMetaTable.test.tsx`. Identify and delete any assertion (and surrounding `it(...)` block) that:
- references `condition.good`, `condition.euro`, `condition.cosmetic`, `condition.needsRepair`
- references `property.metaCondition`, `property.metaFurnishedYes`, `property.metaFurnishedNo`, `property.metaMinTerm`, `property.metaDeposit`, `property.metaPrepayment`, `property.metaNegotiable`
- references the `Tile` component or `extrasTiles` style

Keep every assertion covering: `property.metaId` / `listingId`, `property.metaAvailable` / `availableDate`, `property.now`, the `availDot`, and the `hasExtras` short-circuit that hides the whole table when nothing is present (rename it to reflect the new scope — "hides the whole table when ID and availability are both absent").

If the file's intro JSDoc block describes the tile-grid fence (per Phase 8 Plan 08-05), update the JSDoc to reflect the new scope (ID + availability only).

- [ ] **Step 2: Run the test — confirm the kept assertions still pass**

Run: `npx jest src/components/__tests__/ListingMetaTable.test.tsx -- --no-coverage`
Expected: PASS — only the ID + Availability assertions remain.

- [ ] **Step 3: Edit `ListingMetaTable.tsx` — drop tile grid + Tile component + extras imports**

Open `src/components/ListingMetaTable.tsx`. Delete:

- The `Tile` sub-component (lines ~252–270 in the current file).
- The `<View style={styles.extrasTiles}>…</View>` block (lines ~167–238).
- The `hasExtras` const declaration (lines ~86–93) AND the `!hasExtras &&` clause in the early-return at line ~95 (the early return is now `if (!hasId && !hasAvail) return null;`).
- The `interface TileProps` and `Tile`-related styles (`extrasTiles`, `tile`, `tileHeaderRow`, `tileHeader`, `tileValue`) from the `StyleSheet` block.
- The now-unused Lucide imports: `PaintBucket`, `Sofa`, `CalendarRange`, `Banknote`, `CalendarClock`, `Handshake`, `LucideIcon`. Keep only what the ID + Availability rows still need (currently none from Lucide).
- The nested-shape reads of `areaSqm`, `condition`, `furnished`, `negotiable`, `deposit`, `prepaymentMonths`, `minTerm` (the `const areaSqm = …` block at lines ~78–84).
- The `property` prop in the optional-property documentation JSDoc — repurpose to note that `property` is now unused by this component (kept for API stability with PropertyCard call sites that may pass it; can be dropped in a follow-up). Or drop the `property` prop entirely if PropertyCard doesn't pass it.

Run `grep -n "property\?:" src/components/PropertyCard.tsx` to verify whether `PropertyCard` passes `property` to `ListingMetaTable`. If it does NOT (as expected for the compact-mode call site), remove `property` from the props interface here too.

- [ ] **Step 4: TypeScript check**

Run: `npx tsc --noEmit 2>&1 | grep -E "ListingMetaTable|PropertyCard"`
Expected: zero new errors.

- [ ] **Step 5: Run the full test suite**

Run: `npx jest -- --no-coverage`
Expected: PASS — the whole suite green now that the orphan tile-grid assertions are gone.

- [ ] **Step 6: Lint**

Run: `npm run lint -- src/components/ListingMetaTable.tsx src/components/details/`
Expected: no errors. (Warnings about unused imports are signals the cleanup missed something — fix in-place.)

- [ ] **Step 7: Commit**

```bash
git add src/components/ListingMetaTable.tsx src/components/__tests__/ListingMetaTable.test.tsx
git commit -m "chore(meta): remove orphan tile grid from ListingMetaTable

After Task 8, PropertyDetailsScreen consumes AttributeList directly —
ListingMetaTable's extrasTiles + Tile sub-component are unreachable.
Drops the tile JSX, the Tile component, the 6 nested-shape reads, the
hasExtras gate, the related styles, and the 6 Lucide imports
(PaintBucket / Sofa / CalendarRange / Banknote / CalendarClock /
Handshake). ListingMetaTable shrinks to its compact ID + Availability
contract used by PropertyCard.

Test fence updated: drops the tile-grid assertions added by Phase 8
Plan 08-05 Task 2, keeps the ID + Availability coverage. Reverses
the v4.0.1 hotfix tile-grid landing (3af92b6 / 738a49f) intentionally
per the 2026-05-26 design handoff.

Closes M5 Phase 1 details redesign."
```

---

## Post-task verification

After all 9 tasks land:

1. **Full test suite green:** `npx jest -- --no-coverage`
2. **TypeScript baseline:** `npx tsc --noEmit 2>&1 | wc -l` — should not exceed pre-Phase baseline (memory: 3 pre-existing `App.tsx` `Property.tours` errors are accepted).
3. **KBD-02 grep gate:** `grep -rn 'keyboardVerticalOffset' src/ | grep -v '__tests__' | grep -v '__mocks__'` → zero hits.
4. **i18n parity:** the project's parity script (or `npx tsc --noEmit`) reports both `country.KG/KZ/UZ` + `property.mapPreview.openButton` symmetric across `en.ts` and `ru.ts`.
5. **PropertyDetailsScreen.tsx line count:** `wc -l src/screens/PropertyDetailsScreen.tsx` should drop by roughly 250–300 lines vs the pre-Phase baseline (was 2,563).

## Verification gates (M5 Phase 1)

Per memory `gsd-verifier-misses-regressions`: verifier alone is insufficient. Run:

1. `gsd-verifier` — goal-backward check that the phase delivered the new components and the wiring.
2. `gsd-code-reviewer` — catches regressions the verifier misses (e.g., a removed style that's still referenced elsewhere, or a deleted i18n key that another screen reads).

Only after both gates clear: on-device QA matrix from spec § 7.3 (14 cells across iPhone 15 Pro Max + Moto G XT2513V × EN/RU × dark/light × residential/hospitality/commercial).

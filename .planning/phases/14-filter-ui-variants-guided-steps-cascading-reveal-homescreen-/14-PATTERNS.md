# Phase 14: Filter UI Variants — Pattern Map

**Mapped:** 2026-05-31
**Files analyzed:** 18 new + 1 modified (HomeScreen.tsx) + 2 modified (en.ts, ru.ts)
**Analogs found:** 18 / 18 (every primitive/variant has a strong in-repo precedent)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/components/filters/GuidedFilterSheet.tsx` | component (Modal sheet) | event-driven (Modal visibility + Animated translateY) | `src/components/DeleteAccountModal.tsx` | role-match (both wrap RN core `Modal` with header/body/footer; analog uses built-in `animationType="fade"` rather than hand-driven `Animated.View` slide — RESEARCH.md Pattern 1 supplies the delta) |
| `src/components/filters/CascadingFilter.tsx` | component (inline panel) | request-response (props in → setter callbacks out) | inline block at `src/screens/HomeScreen.tsx:521-642` (the JSX block being extracted) + `src/components/details/AttributeList.tsx` for the row/chip composition style | exact (the inline block IS the component being extracted; this is a brownfield extraction, not greenfield) |
| `src/components/filters/primitives/DealToggle.tsx` | primitive (segmented control) | request-response | inline segmented control at `src/screens/HomeScreen.tsx:524-551` (today's emoji Rent/Buy) + `src/components/StepperInput.tsx` for `Pressable` + hitSlop shape | role-match (extracting + adding sliding-thumb Animated.Value) |
| `src/components/filters/primitives/CheckSquare.tsx` | primitive (icon-glyph) | (display-only — no callbacks) | `src/components/details/AttributeList.tsx:166-175` (boolean badge with `✓` glyph) | role-match (same "small square with check glyph" shape) |
| `src/components/filters/primitives/Stepper.tsx` | primitive (stateful row) | event-driven (step prop → onStepPress callback) | `src/components/StepperInput.tsx` (M4 Phase 7 — also called "Stepper" but for numeric +/-) | role-match (hand-rolled stepper primitive with hitSlop + boundary-disabled state — composition style mirrors) |
| `src/components/filters/primitives/MultiHint.tsx` | primitive (label pill) | display-only | `src/components/details/AttributeList.tsx` badge with glyph | role-match (small pill with glyph + text) |
| `src/components/filters/primitives/ShowButton.tsx` | primitive (CTA) | request-response (onPress) | `src/components/HomeRejectionBanner.tsx` accent CTA pattern + `DeleteAccountModal` `warningButton` style | role-match (full-width accent button with label + pluralized count) |
| `src/components/filters/primitives/Breadcrumb.tsx` | primitive (display row) | display-only | inline category-chip row at `src/screens/HomeScreen.tsx:554-596` (multi-item flexRow) | partial (renders an array of strings — closest in-repo render pattern is the category-toggle row) |
| `src/components/filters/primitives/TypeIcon.tsx` | primitive (icon dispatch) | display-only (Record<type, LucideIcon>) | `src/components/details/AttributeList.tsx:11-19, 40-95` (static `LucideIcon` mapping by domain) | exact (same "name-to-Lucide-icon static map" shape) |
| `src/components/filters/primitives/joinTypes.ts` | utility (pure fn) | transform (input args → string) | `src/utils/buildFilterQuery.ts` | exact (pure fn, named export, no React imports, no side effects, JSDoc convention header) |
| `src/components/filters/__tests__/GuidedFilterSheet.test.tsx` | test (component) | — | `src/components/__tests__/EmailVerifyBanner.test.tsx` | exact (project's canonical react-test-renderer + act + jest.mock pattern) |
| `src/components/filters/__tests__/CascadingFilter.test.tsx` | test (component) | — | `src/components/details/__tests__/KeyStatsCard.test.tsx` | exact (mocks theme + language contexts; uses findAllByType to assert rendered text) |
| `src/components/filters/__tests__/ModalProbe.test.tsx` | test (Wave-0 harness) | — | `src/components/__tests__/EmailVerifyBanner.test.tsx` (minimal mount probe) | role-match (smallest possible "does it mount" probe; no precedent exists for Modal-in-test-renderer per RESEARCH.md A5 — this IS the precedent being created) |
| `src/components/filters/primitives/__tests__/*.test.tsx` | tests (component primitives) | — | `src/components/details/__tests__/KeyStatsCard.test.tsx`, `src/components/__tests__/StepperInput.test.tsx` | exact |
| `src/components/filters/primitives/__tests__/joinTypes.test.ts` | test (pure fn) | — | `src/utils/__tests__/buildFilterQuery.test.ts` + `src/utils/__tests__/getTourPhotosUrl.test.ts` | exact (pure-fn unit test pattern: `describe(fnName)` + table-driven test cases with `mkFixture` helper) |
| `src/locales/en.ts` (additions) | locale (key adds) | — | `home.rejection.banner.{singular,plural}` precedent at `src/locales/en.ts:103-105` + matching `src/locales/ru.ts:106-107` | exact (atomic two-file commit; pluralization via `.singular`+`.plural` ternary, NO ICU — see Shared Pattern §i18n) |
| `src/locales/ru.ts` (additions) | locale (key adds) | — | same as above | exact |
| `src/screens/HomeScreen.tsx` (Plan 14-02 edit) | screen (large delete + mount swap) | request-response (state pass-through to child) | M5 Phase 1 PropertyDetailsScreen refactor (12 commits merged 2026-05-26 — extracted `src/components/details/*` from inline JSX in PropertyDetailsScreen.tsx) | role-match (same "delete inline JSX block, mount `<NewComponent ...stateProps />`" shape) |
| `src/screens/HomeScreen.tsx` (Plan 14-03 edit) | screen (import + conditional render add) | request-response | this same file's existing `<HomeRejectionBanner count={rejectedCount} onPress={...} />` mount at lines 513-518 | exact (same shape: import → conditional render → state prop pass-through) |

---

## Pattern Assignments

### `src/components/filters/GuidedFilterSheet.tsx` (component, event-driven Modal+Animated)

**Analog:** `src/components/DeleteAccountModal.tsx` (Modal shape) — RESEARCH.md Pattern 1 supplies the slide-up delta (`Animated.View` + `localOpen` shadow).

**Imports pattern** (DeleteAccountModal.tsx:1-12, adapted — drop `Alert`/`ActivityIndicator`/`TextInput`, add `Animated`/`Easing`/`Pressable`/`Dimensions`):
```tsx
import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, Modal, StyleSheet, Pressable,
  Animated, Easing, Dimensions,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
```

**Modal-prop trio pattern** (DeleteAccountModal.tsx:75-81, ADAPTED — change `animationType="fade"` → `"none"` so hand-driven Animated.View slide can play; add `statusBarTranslucent`):
```tsx
return (
  <Modal
    visible={localOpen}                  // localOpen — NOT raw `open` prop (RESEARCH.md "load-bearing trick")
    transparent
    animationType="none"                  // ← delta vs DeleteAccountModal — we drive the animation
    onRequestClose={onClose}              // REQUIRED on Android (Pitfall 3)
    statusBarTranslucent                  // ← delta — Android sheet extends under status bar
  >
    {/* scrim FIRST, sheet SECOND — JSX order = z-order in RN (Pitfall 6) */}
    <Animated.View style={[StyleSheet.absoluteFill, { opacity: scrimOpacity }]}>
      <Pressable
        style={[StyleSheet.absoluteFill, { backgroundColor: colors.scrim }]}
        onPress={onClose}
      />
    </Animated.View>
    <Animated.View style={[styles.sheet, { backgroundColor: colors.background, transform: [{ translateY }] }]}>
      {/* Handle, Header, Stepper, ScrollView, Footer */}
    </Animated.View>
  </Modal>
);
```

**`localOpen` shadow + Animated.parallel slide pattern** (NEW — no in-repo precedent for slide-up Modal; copy verbatim from RESEARCH.md Pattern 1 lines 217-308):
```tsx
const SHEET_HEIGHT = Dimensions.get('window').height * 0.82;
const SLIDE_IN_MS = 300;
const SLIDE_OUT_MS = 250;

const translateY = useRef(new Animated.Value(SHEET_HEIGHT)).current;
const scrimOpacity = useRef(new Animated.Value(0)).current;
const [localOpen, setLocalOpen] = useState(open);

useEffect(() => {
  if (open) {
    setLocalOpen(true);
    Animated.parallel([
      Animated.timing(translateY, { toValue: 0, duration: SLIDE_IN_MS, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(scrimOpacity, { toValue: 1, duration: SLIDE_IN_MS, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  } else if (localOpen) {
    Animated.parallel([
      Animated.timing(translateY, { toValue: SHEET_HEIGHT, duration: SLIDE_OUT_MS, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
      Animated.timing(scrimOpacity, { toValue: 0, duration: SLIDE_OUT_MS, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
    ]).start(({ finished }) => {
      if (finished) setLocalOpen(false);  // unmount AFTER slide-out completes
    });
  }
}, [open]);
```

**Theme-token consumption pattern** (DeleteAccountModal.tsx:27 → REPLACE the inline `themeStyles` block at lines 65-73; new code does NOT hardcode colors per CLAUDE.md "Theme: use `useTheme()` tokens — no hardcoded colors"):
```tsx
const { colors } = useTheme();
const { t } = useLanguage();
// All style values use colors.* directly — no themeStyles intermediate.
// This is the post-Phase-12 pattern; DeleteAccountModal predates Phase 12 and still uses old hex literals.
```

---

### `src/components/filters/CascadingFilter.tsx` (component, request-response)

**Analog:** the inline JSX block at `src/screens/HomeScreen.tsx:521-642` (the block being deleted in Plan 14-02 — this IS an extraction, not a greenfield build).

**Imports pattern** (mirror HomeScreen.tsx:1-49 subset for what the component actually needs):
```tsx
import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, FlatList } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import {
  RESIDENTIAL_TYPES, COMMERCIAL_TYPES, HOSPITALITY_TYPES,
  type PropertyCategory,
} from '../../utils/propertyCategory';
import type { TranslationKeys } from '../../locales';
```

**Multi-select chip toggle pattern** (HomeScreen.tsx:599-640 — extract verbatim, swap inline `togglePropertyType` call for the prop-setter callback):
```tsx
<FlatList
  horizontal
  showsHorizontalScrollIndicator={false}
  contentContainerStyle={styles.filterList}
  data={chipTypes.map((tname) => ({ id: tname, label: tname }))}
  keyExtractor={(item) => item.id}
  renderItem={({ item }) => {
    const isActive = types.includes(item.label);
    return (
      <Pressable
        style={[
          styles.filterChip,
          {
            backgroundColor: isActive ? colors.accent : colors.surface2,   // ← DELTA: Phase 12 token, not isDark ternary
            borderColor: isActive ? 'transparent' : colors.hair2,           // ← DELTA: 1.5pt hair2 per UI-SPEC
            borderWidth: 1.5,
          },
        ]}
        onPress={() => {
          // Call PROP setter, not HomeScreen's local togglePropertyType.
          // OR-union semantics preserved verbatim from HomeScreen.tsx:320-328.
          setTypes(prev =>
            prev.includes(item.label)
              ? prev.filter(t => t !== item.label)
              : [...prev, item.label],
          );
        }}
        hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
        accessibilityRole="button"
        accessibilityState={{ selected: isActive }}
      >
        <Text style={{ color: isActive ? '#fff' : colors.textSecondary, fontWeight: '600', fontSize: 14.5 }}>
          {item.label}
        </Text>
      </Pressable>
    );
  }}
/>
```

**Category-tab + reset-types pattern** (HomeScreen.tsx:553-596 — extract verbatim; the `setTypes([])` call on category change is load-bearing — see RESEARCH.md Pitfall 4):
```tsx
{(['Residential', 'Commercial', 'Hospitality'] as PropertyCategory[]).map((cat) => {
  const selected = selectedCategory === cat;
  return (
    <Pressable
      key={cat}
      onPress={() => {
        setSelectedCategory(cat);
        setTypes([]);  // ← LOAD-BEARING: re-pick category clears types (Pitfall 4)
      }}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
      style={{ /* tab style with bottom underline when selected */ }}
    >
      {/* Tab content */}
    </Pressable>
  );
})}
```

---

### `src/components/filters/primitives/Stepper.tsx` (primitive)

**Analog:** `src/components/StepperInput.tsx` (different domain — numeric +/- vs 3-step wizard — but same hand-rolled stateful primitive shape).

**Imports + theme/Pressable composition** (StepperInput.tsx:29-32 + 109-130, adapted):
```tsx
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Check } from 'lucide-react-native';
import { useTheme } from '../../../theme/ThemeContext';
import { useLanguage } from '../../../context/LanguageContext';
import type { TranslationKeys } from '../../../locales';
```

**Pressable + hitSlop + boundary-disabled pattern** (StepperInput.tsx:113-124 — mirrors hitSlop convention + opacity-via-pressed-style):
```tsx
<Pressable
  onPress={reached(i) ? () => onStepPress(i) : undefined}
  disabled={!reached(i)}
  hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
  accessibilityRole="button"
  accessibilityLabel={t(`filters.step.${STEPS[i]}` as TranslationKeys)}
  accessibilityState={{ disabled: !reached(i), selected: step === i }}
  style={({ pressed }) => [
    styles.pill,
    { backgroundColor: pillBg, opacity: pressed && reached(i) ? 0.7 : 1 },
  ]}
>
  {/* Pill content: number (1/2/3) or Check glyph when done */}
</Pressable>
```

---

### `src/components/filters/primitives/TypeIcon.tsx` (primitive — icon dispatch)

**Analog:** `src/components/details/AttributeList.tsx` (static LucideIcon Record + render via `const Icon = row.icon; <Icon size={...} color={...} />`).

**Static LucideIcon Record pattern** (AttributeList.tsx:11-19, 28-32 — `LucideIcon` type import + named icon imports + use as `React.FC<LucideProps>` in a typed Record):
```tsx
import {
  Building, House, Building2, Briefcase, Store,
  Warehouse, Factory, BedDouble, Hotel,
  type LucideIcon,
} from 'lucide-react-native';
import type { PropertyType } from '../../../utils/propertyCategory';

const ICON_MAP: Record<PropertyType, LucideIcon> = {
  Apartment: Building, House: House, Townhome: Building2, Condo: Building2,
  Office: Briefcase, Retail: Store, Warehouse: Warehouse, Industrial: Factory,
  Hostel: BedDouble, Hotel: Hotel,
};
```

**Render-via-component-from-map pattern** (AttributeList.tsx:139, 152):
```tsx
export const TypeIcon: React.FC<{ type: PropertyType; size?: number; color?: string }> = ({
  type, size = 19, color,
}) => {
  const Icon = ICON_MAP[type];
  if (!Icon) return null;
  return <Icon size={size} color={color} strokeWidth={1.75} />;
};
```

Note `strokeWidth={1.75}` matches handoff `FI()` palette; `strokeWidth={1.7}` is the project's existing AttributeList value (close enough).

---

### `src/components/filters/primitives/CheckSquare.tsx` (primitive)

**Analog:** `src/components/details/AttributeList.tsx:166-175` (boolean badge — small View with `✓` glyph).

**Boolean badge with glyph pattern** (AttributeList.tsx:166-175 — direct shape):
```tsx
{/* Existing pattern at AttributeList.tsx:166-175 — copy as 22×22 rounded-square */}
<View
  style={[
    styles.checkSquare,
    {
      backgroundColor: checked ? colors.accent : 'transparent',
      borderColor: checked ? colors.accent : colors.hair2,
      borderWidth: 1.5,
    },
  ]}
>
  {checked && <Text style={styles.glyph}>{'✓'}</Text>}
</View>
```

**StyleSheet shape** (AttributeList.tsx:216-228 — `badge` keys, adapted to 22×22 square):
```tsx
const styles = StyleSheet.create({
  checkSquare: { width: 22, height: 22, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  glyph: { color: '#FFFFFF', fontSize: 13, lineHeight: 15, fontWeight: '700' },
});
```

---

### `src/components/filters/primitives/ShowButton.tsx` (primitive — CTA with shadow)

**Analog:** `src/components/DeleteAccountModal.tsx` `warningButton` (lines 268-278) + `HomeRejectionBanner` (cited but not read — uses same accent CTA pattern).

**Full-width accent CTA + shadow pattern** (RESEARCH.md §Code Examples Lines 916-944 — load-bearing for `D-14` always-enabled + pluralization):
```tsx
const label = count === 1
  ? t('filters.showHomes.one')
  : t('filters.showHomes.many', { count: String(count) });

<Pressable
  onPress={onPress}                        // always enabled per D-14
  hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
  accessibilityRole="button"
  accessibilityLabel={label}
  style={({ pressed }) => [
    styles.button,
    {
      backgroundColor: colors.accent,
      shadowColor: '#000',
      shadowOpacity: 0.4,
      shadowOffset: { width: 0, height: 12 },
      shadowRadius: 26,
      elevation: 8,
      opacity: pressed ? 0.85 : 1,
    },
  ]}
>
  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 17 }}>{label}</Text>
</Pressable>
```

---

### `src/components/filters/primitives/joinTypes.ts` (utility, pure fn)

**Analog:** `src/utils/buildFilterQuery.ts` (named export, pure fn, no React imports, no side effects, doc-header convention).

**Pure-fn module shape** (buildFilterQuery.ts:1-43 header + 68-92 body — mirror the JSDoc + named-export + "Safe to call inside React `useMemo`" shape):
```tsx
/**
 * joinTypes — natural-language collapse for the breadcrumb + Cascading result line.
 *
 * Empty → ''; 1 → label; 2 → "A or B"; N → "A, B or C".
 * Source: handoff filters-shared.jsx:75-79 (ported verbatim).
 *
 * Convention: matches buildFilterQuery.ts shape (named exports, pure fn, no
 * React imports, no side effects).
 *
 * @see .planning/phases/14-.../14-CONTEXT.md D-06 (primitives list)
 */
import type { PropertyCategory, PropertyType } from '../../../utils/propertyCategory';

const TYPE_SETS: Record<PropertyCategory, readonly PropertyType[]> = {
  Residential: ['Apartment', 'House', 'Townhome', 'Condo'],
  Commercial:  ['Office', 'Retail', 'Warehouse', 'Industrial'],
  Hospitality: ['Hostel', 'Hotel'],
};

export function joinTypes(category: PropertyCategory, types: string[], lower = false): string {
  // ... implementation
}
```

---

### Test files (all variants and primitives)

**Analog 1 (component tests):** `src/components/__tests__/EmailVerifyBanner.test.tsx` — canonical project pattern (react-test-renderer + act + jest.mock contexts).

**Analog 2 (component tests with theme/language only):** `src/components/details/__tests__/KeyStatsCard.test.tsx` — simpler mock setup (no auth context needed for filter primitives).

**Test header convention** (EmailVerifyBanner.test.tsx:1-14):
```tsx
/**
 * src/components/filters/__tests__/GuidedFilterSheet.test.tsx
 *
 * Phase 14 Plan 14-03 — FILT-01 Guided Steps bottom-sheet wizard.
 *
 * Covers:
 *   - renders nothing when `open === false` (modal not mounted in tree)
 *   - opens with translateY animating to 0; close fires onClose
 *   - stepper auto-advances Deal → Category → Type
 *   - selecting a new category clears types[] (Pitfall 4 regression guard)
 *
 * Pattern: react-test-renderer + act (no RTL/jest-native in dev deps).
 * NOTE: Animated.timing fires callbacks synchronously in test-renderer per
 * RESEARCH.md A5 — assert only initial + final state, never intermediate frames.
 */
```

**Mock + setup pattern** (KeyStatsCard.test.tsx:9-25 — simplest version for primitives that only use theme + language):
```tsx
jest.mock('../../../theme/ThemeContext', () => ({ useTheme: jest.fn() }));
jest.mock('../../../context/LanguageContext', () => ({ useLanguage: jest.fn() }));

const { useTheme } = require('../../../theme/ThemeContext');
const { useLanguage } = require('../../../context/LanguageContext');

beforeEach(() => {
  jest.clearAllMocks();
  useTheme.mockReturnValue({
    isDark: true,
    colors: { text: '', textSecondary: '', textTertiary: '', surface: '', surface2: '', border: '', accent: '', hair2: '', landlordGreen: '' },
  });
  useLanguage.mockReturnValue({ t: (k: string) => k, language: 'en' });
});
```

**Act-wrapped render pattern** (EmailVerifyBanner.test.tsx:60-67):
```tsx
const render = (props: Partial<Props> = {}): TestRenderer.ReactTestRenderer => {
  let tree!: TestRenderer.ReactTestRenderer;
  act(() => {
    tree = TestRenderer.create(<Stepper step={0} onStepPress={jest.fn()} reached={() => true} deal={null} category={null} {...props} />);
  });
  return tree;
};
```

**findByLabel walk-and-fire pattern** (EmailVerifyBanner.test.tsx:54-57, 95-99):
```tsx
const findByLabel = (tree, label) =>
  tree.root.findAll(n => !!n.props && n.props.accessibilityLabel === label)[0];

// Fire a press:
await act(async () => {
  findByLabel(tree, 'Close filters').props.onPress();
});
```

---

### `src/components/filters/primitives/__tests__/joinTypes.test.ts` (pure-fn test)

**Analog:** `src/utils/__tests__/buildFilterQuery.test.ts` (canonical pure-fn unit-test pattern).

**Fixture helper + describe/test shape** (buildFilterQuery.test.ts:1-30 — `mkProperty` style fixture helper at top of file, then nested describe blocks per clause):
```tsx
/**
 * @format
 *
 * Phase 14 Plan 14-01 — joinTypes (Breadcrumb + Cascading result line collapse).
 *
 * Verifies the natural-language collapse rule from handoff filters-shared.jsx:75-79.
 */
import { joinTypes } from '../joinTypes';

describe('joinTypes', () => {
  describe('zero types', () => {
    test('returns empty string when types is empty', () => {
      expect(joinTypes('Residential', [])).toBe('');
    });
  });
  describe('one type', () => {
    test('returns the bare label for a single in-category type', () => {
      expect(joinTypes('Residential', ['Apartment'])).toBe('Apartment');
    });
  });
  // ... etc
});
```

---

### `src/screens/HomeScreen.tsx` (Plan 14-02 + 14-03 edits)

**Analog 1 (delete + mount swap):** M5 Phase 1 PropertyDetailsScreen refactor (12 commits merged 2026-05-26; new `src/components/details/{KeyStatsCard,HeaderInfoCard,AttributeList,MapPreviewCard}.tsx`) — same shape: delete inline JSX block, mount `<NewComponent stateProps />`.

**Analog 2 (conditional render with prop pass-through):** existing `<HomeRejectionBanner />` mount at HomeScreen.tsx:513-518.

**State pass-through pattern** (HomeScreen.tsx:513-518 — same shape Phase 14 adds for variants):
```tsx
{rejectedCount > 0 && (
  <HomeRejectionBanner
    count={rejectedCount}
    onPress={onOpenMyListingsRejectedTab ?? (() => {})}
  />
)}
```

**Phase 14 conditional render** (CONTEXT.md D-05 — direct copy of the existing single-condition mount pattern, extended to two variants):
```tsx
{filterStyle === 'cascading' && isFiltersExpanded && (
  <CascadingFilter
    transactionType={transactionType}
    setTransactionType={setTransactionType}
    selectedCategory={selectedCategory}
    setSelectedCategory={setSelectedCategory}
    types={types}
    setTypes={setTypes}
    liveCount={filteredProperties.length}
  />
)}
{filterStyle === 'guided' && (
  <GuidedFilterSheet
    open={isFiltersExpanded}
    onClose={() => setIsFiltersExpanded(false)}
    transactionType={transactionType}
    setTransactionType={setTransactionType}
    selectedCategory={selectedCategory}
    setSelectedCategory={setSelectedCategory}
    types={types}
    setTypes={setTypes}
    liveCount={filteredProperties.length}
  />
)}
```

**Existing import pattern** (HomeScreen.tsx:44 — single-line import of utility shipped by Phase 13):
```tsx
import { buildFilterQuery } from '../utils/buildFilterQuery';
// Phase 14 Plan 14-02 adds:
import { useFilterStyle } from '../context/FilterStyleContext';
import { CascadingFilter } from '../components/filters/CascadingFilter';
// Phase 14 Plan 14-03 adds:
import { GuidedFilterSheet } from '../components/filters/GuidedFilterSheet';
```

**Hook call placement** (HomeScreen.tsx:82-84 — near other context hook calls):
```tsx
const { colors, theme, isDark, toggleTheme } = useTheme();
const { user } = useAuth();
const { t, language } = useLanguage();
// Phase 14 Plan 14-02 adds:
const { filterStyle } = useFilterStyle();
```

**Delete sentinel pattern** (RESEARCH.md §HomeScreen Integration Delete Checklist — must remove BOTH the JSX block AND the orphan StyleSheet keys atomically):
```bash
# Pre-commit grep gate — verify orphan style keys removed:
grep -nE "styles\.(filterSection|segmentedControl|segmentButton|segmentText|categoryToggleRow|categoryChip|filterRow|filterList|filterChip|filterText)" src/screens/HomeScreen.tsx
# Must return 0 lines.
```

Lines to delete:
- **JSX block:** `HomeScreen.tsx:521-642` (~120 LOC — the `{isFiltersExpanded && (<View style={styles.filterSection}>...)}` block)
- **StyleSheet keys:** `HomeScreen.tsx:866-914` (~49 LOC — the 10 orphan keys listed above; stop at line 914, the `resultCount` key at 915 stays)
- **Total:** ~169 LOC deleted

---

## Shared Patterns

### Authentication / Authorization
**N/A for Phase 14** — no auth surface, no protected routes. The filter UI is open to all signed-in and anonymous users.

### Error Handling
**N/A for Phase 14** — pure-UI, no network calls, no validation, no async failure paths. No try/catch needed.

### Theme Token Consumption (`useTheme()` — applies to ALL new components)
**Source:** Project convention from CLAUDE.md ("use `useTheme()` tokens — no hardcoded colors; dark/light parity required") + every existing `src/components/details/*.tsx` file.
**Apply to:** All 7 primitives + GuidedFilterSheet + CascadingFilter.

```tsx
import { useTheme } from '../../theme/ThemeContext';   // primitives use '../../../'

export const Foo: React.FC = () => {
  const { colors } = useTheme();   // never destructure `isDark` for color decisions — token values handle it
  return (
    <View style={[styles.container, { backgroundColor: colors.surface2 }]}>
      <Text style={{ color: colors.text }}>...</Text>
    </View>
  );
};
```

**Anti-pattern (DO NOT REPRODUCE — DeleteAccountModal.tsx:65-73 is pre-Phase-12 legacy):**
```tsx
// DO NOT add another `themeStyles` intermediate. Read colors.* directly.
const themeStyles = { background: isDark ? '#000000' : '#F2F2F7', ... };
```

### Localization (`useLanguage()` + `t()` — applies to ALL new components with text)
**Source:** Project convention (`src/locales/en.ts:103-105` + `ru.ts:106-107` pluralization precedent; `src/context/LanguageContext.tsx:44-47` custom flat `t()` shape).
**Apply to:** All primitives that render labels (DealToggle, Stepper, MultiHint, ShowButton, Breadcrumb), both variants, ShowButton (pluralized).

```tsx
import { useLanguage } from '../../context/LanguageContext';
import type { TranslationKeys } from '../../locales';

const { t } = useLanguage();
<Text>{t('filters.title')}</Text>
<Text>{t('filters.deal.rentBlurb')}</Text>

// Pluralization — RESEARCH.md §Pluralization Pattern (NO ICU; uses two keys + ternary):
const label = count === 1
  ? t('filters.showHomes.one')
  : t('filters.showHomes.many', { count: String(count) });
```

**i18n parity pattern** (en.ts:103-105 + ru.ts:106-107 — atomic two-file commit):
```ts
// src/locales/en.ts (add to existing object):
'filters.showHomes.one':  'Show 1 home',
'filters.showHomes.many': 'Show {count} homes',

// src/locales/ru.ts (add same keys, RU translations — order can mirror EN):
'filters.showHomes.one':  'Показать 1 объект',
'filters.showHomes.many': 'Показать {count} объектов',
```

**Parity gate:** `bash scripts/check-i18n-parity.sh` must exit 0 after every commit that touches locale files.

### Hit-Slop (CONTEXT.md D-19 — applies to ALL Pressable/TouchableOpacity in Phase 14)
**Source:** CONTEXT.md D-19 + project convention from `StepperInput.tsx:116, 138` (which uses 10pt hit-slop — Phase 14 uses 4pt per D-19).

```tsx
hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
```

### Accessibility State (applies to all interactive elements)
**Source:** `StepperInput.tsx:117-119, 139-141` + `EmailVerifyBanner` accessibilityLabel pattern.

```tsx
accessibilityRole="button"
accessibilityLabel={t('filters.close')}                          // or composed label
accessibilityState={{ selected: isActive, disabled: !reached }}  // multi-select chips, type cards, stepper pills
```

### Pressable + Pressed-Opacity Pattern (applies to all interactive Pressables)
**Source:** `StepperInput.tsx:121-124, 143-146`.

```tsx
style={({ pressed }) => [
  styles.target,
  { opacity: disabled ? 0.4 : pressed ? 0.7 : 1 },
]}
```

### Co-located Tests Convention
**Source:** Project convention (40+ existing `__tests__/` subdirectories — verified via `find src -name "*.test.*"`). Reaffirmed by `.planning/codebase/CONVENTIONS.md:19`: "Co-located unit tests: `src/<subdir>/__tests__/<file>.test.ts(x)`".

**Apply to:** All Phase 14 tests.

**Path layout:**
```
src/components/filters/
├── GuidedFilterSheet.tsx
├── CascadingFilter.tsx
├── __tests__/
│   ├── GuidedFilterSheet.test.tsx
│   ├── CascadingFilter.test.tsx
│   └── ModalProbe.test.tsx        # Wave-0 probe (NEW — no in-repo precedent)
└── primitives/
    ├── DealToggle.tsx
    ├── (other primitives)
    └── __tests__/
        ├── DealToggle.test.tsx
        └── (other primitive tests)
```

**Note vs CONTEXT.md D-20 wording:** CONTEXT.md D-20 says "co-located tests next to their source" — RESEARCH.md §Test Framework clarifies that the actual project convention is `__tests__/` subdirectories, not flat siblings. Use `__tests__/` per the verified project pattern.

### Test Framework Pattern (react-test-renderer + act — applies to ALL Phase 14 tests)
**Source:** `src/components/__tests__/EmailVerifyBanner.test.tsx:13` documents the choice: "Pattern: react-test-renderer + act (no RTL/jest-native in dev deps)."

```tsx
import TestRenderer, { act } from 'react-test-renderer';
// NEVER import @testing-library/react-native — it is not in devDeps.
```

### Subagent CWD-Drift Mitigation (applies to executor instructions, not source files)
**Source:** Memory `subagent-cwd-drift-recurring.md` — pattern fired 3+ times.

Planner MUST instruct executor to prepend every Bash command with:
```bash
cd "$(git rev-parse --show-toplevel)" && <actual command>
```
and verify `git branch --show-current` before each commit.

### KBD-02 Grep Gate (applies to every Plan 14-* acceptance)
**Source:** Memory `m1-keyboard-kbd-02-invariants.md` — 3-milestone invariant.

```bash
grep -rn "keyboardVerticalOffset" src/ | wc -l
# MUST equal 0. Phase 14 surfaces have no TextInput, so this is trivially preserved,
# but the gate is non-negotiable.
```

---

## No Analog Found

| File | Role | Data Flow | Reason | Source to use instead |
|------|------|-----------|--------|------------------------|
| `src/components/filters/__tests__/ModalProbe.test.tsx` | test (Wave-0 harness) | — | NO test in the codebase currently renders an RN `<Modal>` via react-test-renderer. RESEARCH.md A5 flags this as the single largest Wave-0 risk. | Build the smallest possible probe (5 lines) from the EmailVerifyBanner.test.tsx skeleton — `act(() => TestRenderer.create(<Modal visible><Text>x</Text></Modal>))` + assert `toJSON() !== null`. This IS the precedent being created; downstream tests inherit it. |
| **Slide-up Animated.View Modal pattern** | (within GuidedFilterSheet.tsx) | event-driven | DeleteAccountModal uses `animationType="fade"` (RN built-in); MediaCurationScreen Modal pattern not verified to use Animated. No in-repo precedent for `localOpen` shadow + Animated.parallel translateY+opacity slide. | Use RESEARCH.md Pattern 1 (lines 217-308) verbatim — it cites RN official docs + community pattern. The `localOpen` shadowing trick is documented as "load-bearing" in RESEARCH.md Pitfall 1. |
| **`LayoutAnimation` open/close** | (in HomeScreen — wraps CascadingFilter mount) | — | Already wired at `HomeScreen.tsx:22-24` (Android flag) + `:331` (`toggleFiltersExpanded` call site). Phase 14 INHERITS this; no new code. | Document in Plan 14-02 acceptance: "CascadingFilter open/close inherits HomeScreen's existing LayoutAnimation; do NOT add `LayoutAnimation.configureNext(...)` inside `togglePropertyType` or anywhere it fires per-chip — RESEARCH.md Pattern 2 anti-pattern." |

---

## Metadata

**Analog search scope:**
- `src/components/` (all subdirectories) — read DeleteAccountModal, StepperInput, KeyStatsCard, AttributeList, HeaderInfoCard, EmailVerifyBanner.test
- `src/utils/` — read buildFilterQuery, propertyCategory, getTourPhotosUrl.test, buildFilterQuery.test
- `src/context/` — read FilterStyleContext, LanguageContext shape (via grep)
- `src/screens/HomeScreen.tsx` — read lines 1-100, 316-340, 490-650, 860-920 (~280 lines, non-overlapping)
- `src/locales/` — grep'd for plural-key precedent
- `.planning/codebase/CONVENTIONS.md` — line 17 + 19 (test path convention)

**Files scanned:** 13 source files + 4 test files + 3 phase docs (CONTEXT, RESEARCH, UI-SPEC) + 1 conventions doc = 21 reads total.

**Pattern extraction date:** 2026-05-31

**Key insights for the planner:**

1. **Every required pattern has a strong in-repo analog except the slide-up Modal animation.** That single gap is fully spec'd by RESEARCH.md Pattern 1 (cited RN docs); planner should copy that block verbatim into Plan 14-03's action section.
2. **CascadingFilter is an extraction, not a greenfield build.** The current HomeScreen.tsx:521-642 inline block IS the component — Plan 14-02 lifts it (with Phase 12 token swaps + multi-select chip semantics already in place from Phase 13).
3. **The static LucideIcon Record pattern** is project-standard (AttributeList.tsx is the cleanest precedent); TypeIcon.tsx is a direct copy of that shape with the verified 10-type mapping from RESEARCH.md §Lucide Icon Verification.
4. **Pure-fn test pattern** (joinTypes.test.ts) has the cleanest precedent in `src/utils/__tests__/buildFilterQuery.test.ts` — same JSDoc header + `mkFixture` helper + nested describe blocks.
5. **Plan 14-02 must delete ~169 LOC, not the 120 LOC originally written in CONTEXT.md D-02.** The 10 orphan StyleSheet keys at lines 866-914 are part of the atomic delete — RESEARCH.md §HomeScreen Integration Delete Checklist verified the orphan status by grep.
6. **i18n parity precedent** (`home.rejection.banner.{singular,plural}`) is one ternary + two keys — NO ICU. Phase 14's `filters.showHomes.{one,many}` follows the same shape; the parity-script gate runs per-plan-commit.

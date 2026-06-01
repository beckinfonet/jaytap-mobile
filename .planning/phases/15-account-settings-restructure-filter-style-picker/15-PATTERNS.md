# Phase 15: Account Settings Restructure + Filter-Style Picker — Pattern Map

**Mapped:** 2026-05-31
**Files analyzed:** 6 (2 NEW components + 2 NEW test files + 1 brownfield-rewrite screen + 1 i18n locale pair)
**Analogs found:** 6 / 6 (one analog corrected vs. CONTEXT.md hint — see "Corrections")

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/components/SectionLabel.tsx` (NEW) | component (pure presentational primitive) | render-only (no state, no context except `useTheme()`) | `src/components/filters/primitives/CheckSquare.tsx` | exact (small pure-visual primitive with `useTheme()`) |
| `src/components/__tests__/SectionLabel.test.tsx` (NEW) | test (snapshot + children/action-slot wiring) | render-once, assertion | `src/components/filters/primitives/__tests__/CheckSquare.test.tsx` | exact (same shape — TestRenderer + act + mocked `useTheme`) |
| `src/components/FilterStyleRow.tsx` (NEW) | component (stateful settings affordance with context read+write + Animated chevron + LayoutAnimation expand) | event-driven (Pressable taps → context setter + local `open` state) | **PRIMARY:** `src/components/filters/CascadingFilter.tsx` (multi-row selectable list with active/inactive states + accent visuals); **SUPPORTING:** `src/components/filters/primitives/DealToggle.tsx` (Animated.Value driving translate); `src/components/EmailVerifyBanner.tsx` (self-contained banner with i18n + theme + dismissal); `src/components/LanguageToggleSwitch.tsx` (settings sub-component shape — Animated.spring for pill movement) | role-match + composite (no single existing analog combines stateful expand/collapse + radio-style sub-rows; this composite is closer than any single file) |
| `src/components/__tests__/FilterStyleRow.test.tsx` (NEW) | test (collapsed/expanded states + tap-to-pick + Coming-soon gating + chevron rotate) | render + interact + assert | `src/components/filters/__tests__/CascadingFilter.test.tsx` | exact (mocks `useTheme` + `useLanguage` + mocks `useFilterStyle`; uses `TestRenderer + act`; finds Pressables by `accessibilityRole='button'` + `accessibilityLabel`) |
| `src/screens/AccountSettingsScreen.tsx` (MODIFIED — brownfield rewrite) | screen (settings container + KeyboardAwareScrollView + Animated language pill + Modal child) | brownfield surgical replace (preserve loadProfile/handleSave/renderInfoRow + animation refs verbatim; replace 4 JSX sections; rip `themeStyles{}` block; flip accent) | **PRIMARY:** itself (self-as-analog — preserve lines 48-58, 85-103, 105-136, 138-160, 222-246 verbatim per CONTEXT.md "Reusable Assets"); **PRECEDENT:** Plan 14-02's HomeScreen.tsx brownfield delete of lines 521-642 (same scale: ~120 LOC deleted + replacement mount line — atomic commit) | exact (self-preserve + precedent) |
| `src/locales/{en,ru}.ts` (MODIFIED) | i18n config | append entries to flat key-map (TypeScript `as Record<TranslationKeys, string>` enforces parity) | `src/locales/en.ts` lines 231-253 (existing `accountSettings.*` block — sibling keys append here) + Phase 14's `filters.*` namespace extension precedent | exact |

---

## Corrections vs. CONTEXT.md hints

1. **Locale files are `.ts`, NOT `.json`.** CONTEXT.md §i18n namespace says "`src/locales/en.json` + `src/locales/ru.json`" — actual files are `src/locales/en.ts` + `src/locales/ru.ts` (flat object exports typed as `Record<TranslationKeys, string>`). Parity gate `scripts/check-i18n-parity.sh` greps `*.ts`, not `*.json`. **TypeScript itself is the primary parity gate** (`ru.ts: Record<TranslationKeys, string>` won't compile if a key in `en.ts` is missing from `ru.ts`) — the shell script is belt-and-suspenders. Both Plan 15-01 + 15-02 must add keys to `en.ts` (defines `TranslationKeys` union) FIRST, then `ru.ts`, atomically.

2. **`common.edit` already exists** in `src/locales/en.ts:7` (EN = "Edit"). Check `ru.ts` line 7 for RU value before adding. **Plan 15-01 likely needs ZERO new `common.*` keys** — re-use the existing `'common.edit'` and `'common.cancel'` (line 4) + `'common.save'` (line 5).

3. **Co-located tests use `__tests__/` subdirectories, NOT sibling files.** CONTEXT.md D-20 says "`src/components/SectionLabel.test.tsx`" — actual project convention is `src/components/__tests__/SectionLabel.test.tsx` (confirmed by `ls src/components/__tests__/`: `EmailVerifyBanner.test.tsx`, `StepperInput.test.tsx`, `PropertyCard.test.tsx`, etc.). Filter primitive tests live at `src/components/filters/primitives/__tests__/*.test.tsx`. CONTEXT.md D-12's "Co-located test `SectionLabel.test.tsx`" should be interpreted as the file's basename — the actual path is `src/components/__tests__/SectionLabel.test.tsx`.

4. **No existing `AccountSettingsScreen.test.tsx`** — confirmed via `find src/screens/__tests__ -name "Account*"` returning empty. CONTEXT.md D-20 hedges this ("if present"); the answer is "not present." Plan 15-01 *may* ship a fresh `src/screens/__tests__/AccountSettingsScreen.test.tsx` to lock SET-03 regression but it is optional per D-20 ("if a test file lands").

---

## Pattern Assignments

### 1. `src/components/SectionLabel.tsx` (NEW — pure presentational primitive)

**Analog:** `src/components/filters/primitives/CheckSquare.tsx` (smallest pure-visual primitive in the project — minimal `useTheme()` read, no props beyond visual config, single `<View>` render).

**Imports pattern** (CheckSquare.tsx lines 14-16):
```tsx
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../../theme/ThemeContext';
```
For `SectionLabel.tsx` at `src/components/<root>/SectionLabel.tsx`, the relative path is `../theme/ThemeContext` (one level down, not three).

**Props + functional component shape** (CheckSquare.tsx lines 18-22):
```tsx
export interface CheckSquareProps {
  checked: boolean;
}

const CheckSquare: React.FC<CheckSquareProps> = ({ checked }) => {
  const { colors } = useTheme();
  return (
    <View ...>
```
For `SectionLabel`, the props shape per CONTEXT.md D-12:
```tsx
export interface SectionLabelProps {
  children: string;
  action?: React.ReactNode;
}
```
**Note on export style:** CheckSquare uses `export default CheckSquare`. CONTEXT.md D-12 examples show `export const SectionLabel`. Match CheckSquare's `export default` convention — it's the dominant pattern across `src/components/filters/primitives/*` (DealToggle, Stepper, Breadcrumb, ShowButton, TypeIcon, MultiHint all use `export default`). Plan 15-01 should choose `export default` for consistency. **EmailVerifyBanner.tsx uses `export const`** (line 32) — so both styles exist. Either works; default-export keeps it aligned with the `filters/primitives/` siblings.

**Style shape** (CheckSquare.tsx lines 40-54):
```tsx
const styles = StyleSheet.create({
  checkSquare: {
    width: 22, height: 22, borderRadius: 6,
    alignItems: 'center', justifyContent: 'center',
  },
  glyph: { color: '#FFFFFF', fontSize: 13, lineHeight: 15, fontWeight: '700' },
});
```
For SectionLabel, transcribe CONTEXT.md D-12's spec verbatim:
```tsx
const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingBottom: 10,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.1,
  },
});
```

**Theme tokens to consume (D-12 spec):** `colors.textTertiary` for the label color. NO hex literals.

---

### 2. `src/components/__tests__/SectionLabel.test.tsx` (NEW)

**Analog:** `src/components/filters/primitives/__tests__/CheckSquare.test.tsx`

**Test file header + imports** (CheckSquare.test.tsx lines 1-26):
```tsx
/**
 * SectionLabel test — typography + action-slot wiring.
 *
 * Phase 15 Plan 15-01 (SET-01). Pattern: react-test-renderer + act +
 * jest.mock theme context (CheckSquare.test.tsx convention).
 */
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';

jest.mock('../../theme/ThemeContext', () => ({ useTheme: jest.fn() }));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { useTheme } = require('../../theme/ThemeContext');
import SectionLabel from '../SectionLabel';

beforeEach(() => {
  jest.clearAllMocks();
  useTheme.mockReturnValue({
    isDark: true,
    colors: {
      textTertiary: 'rgba(244,244,246,0.40)',
    },
  });
});
```
**Note the relative-path shift:** CheckSquare lives at `src/components/filters/primitives/CheckSquare.tsx` so its test mock path is `'../../../../theme/ThemeContext'` (4 levels up). `SectionLabel.test.tsx` at `src/components/__tests__/SectionLabel.test.tsx` mocks `'../../theme/ThemeContext'` (2 levels up).

**Assertion pattern** — `findAllByType(Text)` then read `props.children`:
```tsx
const findTexts = (root: TestRenderer.ReactTestInstance): string[] =>
  root.findAllByType(Text).map((n) =>
    Array.isArray(n.props.children) ? n.props.children.join('') : String(n.props.children ?? '')
  );

describe('SectionLabel', () => {
  test('renders the uppercase label text', () => {
    let tree!: TestRenderer.ReactTestRenderer;
    act(() => {
      tree = TestRenderer.create(<SectionLabel>ACCOUNT</SectionLabel>);
    });
    expect(findTexts(tree.root)).toContain('ACCOUNT');
  });

  test('renders the action slot when provided', () => {
    let tree!: TestRenderer.ReactTestRenderer;
    act(() => {
      tree = TestRenderer.create(
        <SectionLabel action={<Text testID="action-slot">EditLink</Text>}>ACCOUNT</SectionLabel>
      );
    });
    expect(tree.root.findAllByProps({ testID: 'action-slot' })).toHaveLength(1);
  });

  test('omits the action slot when no action prop', () => {
    let tree!: TestRenderer.ReactTestRenderer;
    act(() => {
      tree = TestRenderer.create(<SectionLabel>ACCOUNT</SectionLabel>);
    });
    // Only one Text node — the label itself.
    expect(tree.root.findAllByType(Text)).toHaveLength(1);
  });
});
```

---

### 3. `src/components/FilterStyleRow.tsx` (NEW — stateful expandable picker)

**PRIMARY analog:** `src/components/filters/CascadingFilter.tsx` (multi-row selectable list with active/inactive visual states + accent-soft selected backgrounds).
**SUPPORTING analogs:** `DealToggle.tsx` (Animated.Value rotation pattern), `EmailVerifyBanner.tsx` (self-contained component with hooks + i18n + theme).

**Imports pattern** (CascadingFilter.tsx lines 28-47, DealToggle.tsx lines 14-24):
```tsx
import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, Animated, Easing,
  LayoutAnimation, Platform, UIManager,
} from 'react-native';
import {
  ChevronRight, SlidersHorizontal, ListChecks, Layers,
  Columns2, Quote, Check, type LucideIcon,
} from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { useFilterStyle, type FilterStyle } from '../context/FilterStyleContext';
import type { TranslationKeys } from '../locales';
```
**Relative path:** `FilterStyleRow.tsx` at `src/components/<root>/` so `../theme/ThemeContext`, `../context/LanguageContext`, `../context/FilterStyleContext` (one level up — vs. filters/primitives needing 3 levels). **TranslationKeys casting note:** Phase 14 `CascadingFilter.tsx` casts string literals to `TranslationKeys` inline (e.g. `t('filters.cascading.categoryHeader' as TranslationKeys)`) when the key is new and `TranslationKeys` hasn't picked it up yet. Plan 15-02 adds keys to `en.ts` first (which defines `TranslationKeys`) so subsequent `t('filters.style.guided')` calls type-check without casting.

**LayoutAnimation Android-flag pattern** (per CONTEXT.md D-05 + Phase 14 D-12; HomeScreen.tsx:22 wires this globally, but FilterStyleRow can also wire it locally as belt-and-suspenders):
```tsx
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
```
Place at module scope (top of file, before component definition). HomeScreen.tsx:22 already does this app-wide; the duplicate call in FilterStyleRow is a no-op but documents the dependency.

**State + Animated.Value setup** (DealToggle.tsx lines 39-48 for the rotate pattern):
```tsx
const FilterStyleRow: React.FC = () => {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const { filterStyle, setFilterStyle } = useFilterStyle();

  const [open, setOpen] = useState(false);
  const rotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(rotate, {
      toValue: open ? 1 : 0,
      duration: 180,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [open, rotate]);

  const rotateZ = rotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '90deg'],
  });
```
**Note:** CONTEXT.md D-05 says duration 180ms. DealToggle uses 200ms with `Easing.inOut(Easing.cubic)`. Keep 180ms per CONTEXT.md D-05.

**Toggle open with LayoutAnimation** (per CONTEXT.md D-05):
```tsx
const handleToggle = () => {
  LayoutAnimation.easeInEaseOut();
  setOpen((prev) => !prev);
};
```

**FILTER_STYLES constant** (per CONTEXT.md D-04 — export from this file):
```tsx
export const FILTER_STYLES: Array<{
  id: FilterStyle;
  labelKey: TranslationKeys;
  descKey: TranslationKeys;
  icon: LucideIcon;
  enabled: boolean;
}> = [
  { id: 'guided',    labelKey: 'filters.style.guided',    descKey: 'filters.style.guidedDesc',    icon: ListChecks,  enabled: true  },
  { id: 'cascading', labelKey: 'filters.style.cascading', descKey: 'filters.style.cascadingDesc', icon: Layers,      enabled: true  },
  { id: 'master',    labelKey: 'filters.style.master',    descKey: 'filters.style.masterDesc',    icon: Columns2,    enabled: false },
  { id: 'sentence',  labelKey: 'filters.style.sentence',  descKey: 'filters.style.sentenceDesc',  icon: Quote,       enabled: false },
];
```

**Selected-row visual** (lift from GuidedFilterSheet.tsx lines 189-211 — `renderDealCard` active state — applied to FilterStyleRow's expanded sub-rows):
```tsx
// In each expanded sub-row, when `style.id === filterStyle`:
style={[
  styles.subRow,
  {
    backgroundColor: selected ? colors.accentSoft : 'transparent',
    borderWidth: selected ? 1.5 : 0,
    borderColor: selected ? colors.accentLine : 'transparent',
  },
]}
```
**Filled radio glyph** (per CONTEXT.md §Specifics "Filled radio dimensions"):
```tsx
// Selected radio
<View style={{
  width: 22, height: 22, borderRadius: 999,
  borderWidth: 1.75, borderColor: colors.accent,
  backgroundColor: colors.accent,
  alignItems: 'center', justifyContent: 'center',
}}>
  <Check size={13} color={colors.onAccent} strokeWidth={2.5} />
</View>
// Unselected radio (enabled style)
<View style={{
  width: 22, height: 22, borderRadius: 999,
  borderWidth: 1.75, borderColor: colors.hair2,
  backgroundColor: 'transparent',
}} />
// Hollow disabled radio (Coming-soon style) per CONTEXT.md D-06
<View style={{
  width: 22, height: 22, borderRadius: 999,
  borderWidth: 1.75, borderColor: colors.hair2,
  backgroundColor: 'transparent',
}} />
```

**Coming-soon badge** (per CONTEXT.md D-06 — apply to Master + Sentence rows only):
```tsx
{!style.enabled && (
  <View style={{
    paddingVertical: 3, paddingHorizontal: 8,
    borderRadius: 999,
    backgroundColor: colors.surface2,
  }}>
    <Text style={{
      color: colors.textTertiary,
      fontSize: 10, fontWeight: '700',
      letterSpacing: 0.6,
      textTransform: 'uppercase',
    }}>
      {t('filters.style.comingSoon')}
    </Text>
  </View>
)}
```

**Pressable handler with disabled gating** (CascadingFilter.tsx lines 187-199 pattern adapted):
```tsx
<Pressable
  key={style.id}
  disabled={!style.enabled}
  accessibilityRole="button"
  accessibilityState={{ disabled: !style.enabled, selected: filterStyle === style.id }}
  hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
  onPress={style.enabled ? async () => { await setFilterStyle(style.id); } : undefined}
  style={[...]}
>
```
**Note:** `onPress` should be `undefined` (NOT a no-op function) on disabled rows — mirrors Stepper.tsx line 63 (`onPress={isReachable ? () => onStepPress(i) : undefined}`).

**Collapsed-row chevron rotate animation** (DealToggle.tsx's translateX pattern, adapted to rotateZ):
```tsx
<Animated.View style={{ transform: [{ rotateZ }] }}>
  <ChevronRight size={20} color={colors.textSecondary} />
</Animated.View>
```

**Theme tokens consumed** (per CONTEXT.md D-08 mapping + D-18 chip anatomy):
- `colors.background` — outer card backgrounds (NEW Phase 12)
- `colors.surface` — card bg
- `colors.surface2` — Coming-soon badge bg + icon chip bg + disabled radio border base
- `colors.hair2` — unselected radio border + dividers
- `colors.text` — primary label text + selected row name
- `colors.textSecondary` — subtitle text + unselected row name + chevron color
- `colors.textTertiary` — Coming-soon badge text + section label
- `colors.iconChipFg` — picker collapsed-row sliders icon (38pt chip)
- `colors.accent` — selected radio fill, selected row accent border
- `colors.accentSoft` — selected expanded-row background
- `colors.accentLine` — selected expanded-row border
- `colors.onAccent` — Check glyph color on selected radio

**i18n key consumption** (per CONTEXT.md D-14):
```tsx
t('accountSettings.filterPicker.title')        // "Search filter style"
t('accountSettings.filterPicker.subtitle')     // "How property filters appear"
t('filters.style.guided') / cascading / master / sentence
t('filters.style.guidedDesc') / etc.
t('filters.style.comingSoon')                  // "Coming soon" / "Скоро"
```
**Visible-from-collapsed-state current-value label** (CONTEXT.md D-16): on the collapsed row, render `t(FILTER_STYLES.find(s => s.id === filterStyle)!.labelKey)` at the right edge before the chevron.

---

### 4. `src/components/__tests__/FilterStyleRow.test.tsx` (NEW)

**Analog:** `src/components/filters/__tests__/CascadingFilter.test.tsx`

**Test file header + mocks** (CascadingFilter.test.tsx lines 1-82):
```tsx
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';

jest.mock('../../theme/ThemeContext', () => ({ useTheme: jest.fn() }));
jest.mock('../../context/LanguageContext', () => ({ useLanguage: jest.fn() }));
jest.mock('../../context/FilterStyleContext', () => ({
  useFilterStyle: jest.fn(),
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { useTheme } = require('../../theme/ThemeContext');
const { useLanguage } = require('../../context/LanguageContext');
const { useFilterStyle } = require('../../context/FilterStyleContext');

import FilterStyleRow from '../FilterStyleRow';

beforeEach(() => {
  jest.clearAllMocks();
  useTheme.mockReturnValue({
    isDark: true,
    colors: {
      background: '#121214', surface: '#1c1c20', surface2: '#26262c',
      hair2: 'rgba(255,255,255,0.14)',
      text: '#f4f4f6', textSecondary: 'rgba(244,244,246,0.60)', textTertiary: 'rgba(244,244,246,0.40)',
      iconChipFg: 'rgba(244,244,246,0.85)',
      accent: '#ff5a6f', accentSoft: 'rgba(255,90,111,0.16)', accentLine: 'rgba(255,90,111,0.45)',
      onAccent: '#FFFFFF',
    },
  });
  useLanguage.mockReturnValue({ t: (k: string) => k, language: 'en' });
  useFilterStyle.mockReturnValue({
    filterStyle: 'guided',
    setFilterStyle: jest.fn().mockResolvedValue(undefined),
  });
});
```
**Note paths:** `FilterStyleRow.test.tsx` at `src/components/__tests__/FilterStyleRow.test.tsx` mocks `'../../theme/ThemeContext'` etc. (2 levels up — vs. CascadingFilter.test at `src/components/filters/__tests__/` needing 3 levels).

**Finding interactive nodes** (CascadingFilter.test.tsx lines 128-145):
```tsx
const findChipByLabel = (
  tree: TestRenderer.ReactTestRenderer,
  label: string,
): TestRenderer.ReactTestInstance | undefined => {
  const buttons = tree.root.findAll(
    (n) => !!n.props && n.props.accessibilityRole === 'button',
  );
  return buttons.find((p) => {
    const texts = p.findAllByType(Text).map((n) => {
      const c = n.props.children;
      return Array.isArray(c) ? c.join('') : String(c ?? '');
    });
    return texts.includes(label);
  });
};
```

**Required test coverage** (per CONTEXT.md Plan 15-02 acceptance):
```tsx
describe('FilterStyleRow', () => {
  test('collapsed state shows current style label + chevron', () => {
    // useFilterStyle returns 'guided' → right-edge label should be 'filters.style.guided'
    // Expanded sub-rows should NOT be rendered (only collapsed row visible).
  });

  test('tapping the collapsed row opens the expanded body', () => {
    // After act(() => collapsedRow.props.onPress()), expanded sub-rows visible.
  });

  test('expanded state lists 4 rows with correct icons + descriptions', () => {
    // Find all 4 style label keys in the rendered Text nodes.
  });

  test('tap on Guided row writes via setFilterStyle("guided") and visually selects', () => {
    // act(() => guidedRow.props.onPress()) → expect(setFilterStyle).toHaveBeenCalledWith('guided').
    // Pattern lifted from CascadingFilter.test.tsx:168-180.
  });

  test('tap on Cascading row writes via setFilterStyle("cascading")', () => {
    // Same shape — verifies the enabled path for both writable styles.
  });

  test('tap on Master row is a no-op (Pressable disabled, onPress undefined)', () => {
    // Mirror Stepper.test.tsx:103-120 — assert onPress is undefined + disabled is true.
    const masterRow = findChipByLabel(tree, 'filters.style.master');
    expect(masterRow!.props.onPress).toBeUndefined();
    expect(masterRow!.props.disabled).toBe(true);
    expect(masterRow!.props.accessibilityState).toEqual({ disabled: true, selected: false });
  });

  test('tap on Sentence row is a no-op (Pressable disabled, onPress undefined)', () => {
    // Same shape as Master.
  });

  test('"Coming soon" badge renders on the 2 disabled rows', () => {
    // Find Text nodes containing 'filters.style.comingSoon' — expect exactly 2.
    const comingSoonTexts = tree.root.findAllByType(Text).filter(
      (n) => String(n.props.children ?? '').includes('filters.style.comingSoon')
    );
    expect(comingSoonTexts.length).toBe(2);
  });

  test('chevron rotates on open', () => {
    // The Animated.View wrapping the chevron should have transform: [{ rotateZ: ... }]
    // Inspect the style prop after open=true (post-act).
  });
});
```

**Selected-style live-swap assertion** (per CONTEXT.md D-07 SC3) — covered via mocking `useFilterStyle` to return different values:
```tsx
test('rendering with filterStyle=cascading shows Cascading as selected', () => {
  useFilterStyle.mockReturnValue({
    filterStyle: 'cascading',
    setFilterStyle: jest.fn().mockResolvedValue(undefined),
  });
  // ... render, assert cascading row has accessibilityState.selected === true.
});
```

---

### 5. `src/screens/AccountSettingsScreen.tsx` (MODIFIED — brownfield rewrite)

**Analog:** self (per CONTEXT.md "Reusable Assets" + "Codebase Anchors"). The screen IS the analog — preserve specific line ranges verbatim and rewrite the rest. **Precedent for "brownfield in-place rewrite":** Phase 14 Plan 14-02 deleted HomeScreen.tsx:521-642 (~120 LOC inline JSX) and replaced with a one-line `<CascadingFilter />` mount, atomic commit.

**PRESERVE verbatim** (per CONTEXT.md "Reusable Assets" — these are LOAD-BEARING):

1. **Imports block (lines 1-21)** — keep all existing imports; ADD: `LayoutAnimation` to react-native imports; ADD: `Pencil`, `Trash2`, `Briefcase` (or whatever APPLICATION row icon CONTEXT.md §Specifics picks) to lucide-react-native imports; ADD: `import { SectionLabel } from '../components/SectionLabel';`; ADD: `import { FilterStyleRow } from '../components/FilterStyleRow';` (Plan 15-02 only).

2. **Component signature + props (lines 23-43)** — verbatim. Zero prop shape change.

3. **Constants `LANG_TRACK_PADDING` + `LANG_INNER_GAP` (lines 30-31)** — verbatim.

4. **Helpers `isValidName` + `isValidPhone` (lines 36-41)** — verbatim.

5. **`langSlide` Animated.Value + `langTrackWidth` state + spring effect (lines 48-58)** — verbatim. Animation refs and the spring `friction: 9, tension: 80` are load-bearing.

6. **Form state (lines 60-69)** — verbatim. NOTE: ADD nothing here; isEditing already exists.

7. **`loadProfile` (lines 85-103)** — verbatim. No shape change.

8. **`handleSave` (lines 105-136)** — verbatim. No shape change.

9. **`renderInfoRow` (lines 138-160)** — preserve the function signature + JSX shape. **Swap color refs:** `themeStyles.text` → `colors.text`; `themeStyles.textSecondary` → `colors.textSecondary`; `themeStyles.danger` → `colors.destructiveRed`; `isDark ? '#FFF' : '#000'` → `colors.text`.

10. **Loading state (lines 162-168)** — preserve shape; swap `themeStyles.background` → `colors.background`, `themeStyles.accent` → `colors.accent`.

11. **Header (lines 171-178)** — preserve; swap colors as above.

12. **KeyboardAwareScrollView (lines 180-184)** — verbatim incl. `bottomOffset={20}`. **KBD-02 invariant — DO NOT add `keyboardVerticalOffset`.**

13. **Sliding-pill `Animated.View` interpolation block (lines 222-246)** — verbatim. The `langSlide.interpolate({ inputRange, outputRange })` math is load-bearing per CONTEXT.md §Reusable Assets.

14. **Language toggle inner `TouchableOpacity` blocks (lines 247-292)** — preserve incl. emoji flags + check glyph. CONTEXT.md memory `m6-language-pill-stays-in-header.md` is for the HomeScreen header pill; the in-screen Language toggle stays.

15. **`DeleteAccountModal` mount (lines 344-353)** — verbatim. No prop change.

**RIP** (Plan 15-01 — D-08):

- **Lines 71-79 — `themeStyles{}` block** — DELETE entirely. **Acceptance gate:** `grep -nE "themeStyles" src/screens/AccountSettingsScreen.tsx` returns 0 matches post-commit.
- **`isDark` destructure** (line 46 — change `useTheme()` destructure to `const { colors } = useTheme();` only).

**REPLACE** (per CONTEXT.md D-01..D-13):

- **Lines 186-205 (MAIN INFORMATION)** → ACCOUNT section using new `<SectionLabel action={<EditLink ... />}>ACCOUNT</SectionLabel>` + Card with the 5 info rows. **MOVE Save/Cancel buttons (lines 316-334) INSIDE this Card as a bottom row (per D-11).** Card style: `{ backgroundColor: colors.surface, borderRadius: 20, overflow: 'hidden', padding: 16 }`.

- **Lines 207-294 (Language)** → PREFERENCES SectionLabel + Card containing the Language sliding-pill toggle (preserved verbatim per #13 + #14 above) + `<FilterStyleRow />` mount (Plan 15-02 only — Plan 15-01 lands an empty placeholder area).

- **Lines 298-314 (Application Status)** → conditional APPLICATION SectionLabel + Card (same gate `!canListProperties && onApplyLandlord`). Card single row: `<ChevronRight />` chevron + "Become a Landlord" label (`landlordApp.becomeLandlord` existing key reused).

- **Lines 336-342 (Delete account link)** → DANGER ZONE SectionLabel + Card with trash row. Trash-icon-in-red-tinted-chip per §Specifics: `backgroundColor: 'rgba(255,77,77,0.13)'`. Label "Delete account" in `colors.destructiveRed`. **Tapping still sets `setShowDeleteModal(true)`** — handler shape verbatim.

**Reference pattern: Card inline-vs-extracted decision** (per CONTEXT.md D-13): inline `<View style={[styles.card, { backgroundColor: colors.surface }]}>` — do NOT extract a `<Card>` primitive. There are only 3-4 cards in the screen; Phase 16 can extract if reuse emerges.

**EditLink inline component** (per CONTEXT.md D-10 — define INSIDE AccountSettingsScreen.tsx as a private subcomponent or as a small named function before the main component):
```tsx
const EditLink: React.FC<{ onPress: () => void; isEditing: boolean }> = ({ onPress, isEditing }) => {
  const { colors } = useTheme();
  const { t } = useLanguage();
  if (isEditing) return null;
  return (
    <Pressable
      onPress={onPress}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      accessibilityRole="button"
      accessibilityLabel={t('common.edit')}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}
    >
      <Pencil size={15} color={colors.accent} strokeWidth={2} />
      <Text style={{ color: colors.accent, fontSize: 13, fontWeight: '600' }}>
        {t('common.edit')}
      </Text>
    </Pressable>
  );
};
```

**Save / Cancel buttons moved INSIDE ACCOUNT card** (per D-11 + D-22):
```tsx
{isEditing && (
  <View style={{ flexDirection: 'row', gap: 12, marginTop: 16, paddingHorizontal: 16 /* card padding */ }}>
    <TouchableOpacity
      style={{ flex: 1, height: 50, borderRadius: 14, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.hair2 }}
      onPress={() => setIsEditing(false)}
      disabled={saving}
    >
      <Text style={{ color: colors.text, fontWeight: '600', fontSize: 16 }}>{t('common.cancel')}</Text>
    </TouchableOpacity>
    <TouchableOpacity
      style={{ flex: 1, height: 50, borderRadius: 14, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.accent }}
      onPress={handleSave}
      disabled={saving}
    >
      <Text style={{ color: colors.onAccent, fontWeight: '600', fontSize: 16 }}>{saving ? t('accountSettings.saving') : t('common.save')}</Text>
    </TouchableOpacity>
  </View>
)}
```
Border radius changes from 12 → 14 per D-22.

**Token mapping reference table** (CONTEXT.md D-08 — apply across the whole rewrite):

| Old reference | New token |
|---|---|
| `themeStyles.background` | `colors.background` |
| `themeStyles.surface` | `colors.surface` |
| `themeStyles.text` | `colors.text` |
| `themeStyles.textSecondary` | `colors.textSecondary` |
| `themeStyles.border` | `colors.hair2` |
| `themeStyles.accent` | `colors.accent` |
| `themeStyles.danger` | `colors.destructiveRed` |
| `isDark ? '#FFF' : '#000'` (line 141 etc.) | `colors.text` |
| `isDark ? '#2C2C2E' : '#E8E8ED'` (line 215) | `colors.surface2` |

---

### 6. `src/locales/{en,ru}.ts` (MODIFIED)

**Analog:** `src/locales/en.ts` lines 231-253 (existing `accountSettings.*` block) + Phase 14's `filters.*` namespace extension.

**File format:** Flat object literal. **TypeScript is the primary parity gate** (`ru.ts: Record<TranslationKeys, string>` will fail to compile if any `en.ts` key is missing from `ru.ts`). The shell script `scripts/check-i18n-parity.sh` greps for `'key':` patterns and is belt-and-suspenders.

**Key add discipline:**
- Add ALL new keys to `en.ts` FIRST (`en.ts` defines `TranslationKeys` union).
- Add the SAME keys to `ru.ts` IMMEDIATELY in the same commit.
- Run `npx tsc --noEmit` + `scripts/check-i18n-parity.sh` before commit.

**Plan 15-01 keys to add** (per CONTEXT.md D-14 — section labels only; `common.edit` ALREADY exists at line 7 — do NOT re-add):
```ts
// In en.ts — append to the accountSettings block (after line 253):
'accountSettings.section.account': 'ACCOUNT',
'accountSettings.section.preferences': 'PREFERENCES',
'accountSettings.section.application': 'APPLICATION',
'accountSettings.section.dangerZone': 'DANGER ZONE',

// In ru.ts (same keys, RU values):
'accountSettings.section.account': 'АККАУНТ',
'accountSettings.section.preferences': 'НАСТРОЙКИ',
'accountSettings.section.application': 'ЗАЯВКА',
'accountSettings.section.dangerZone': 'ОПАСНАЯ ЗОНА',
```

**Plan 15-02 keys to add** (per CONTEXT.md D-14):
```ts
// In en.ts — append:
'accountSettings.filterPicker.title': 'Search filter style',
'accountSettings.filterPicker.subtitle': 'How property filters appear',
'filters.style.guided': 'Guided steps',
'filters.style.cascading': 'Cascading',
'filters.style.master': 'Master–detail',
'filters.style.sentence': 'Sentence',
'filters.style.guidedDesc': 'One choice at a time',
'filters.style.cascadingDesc': 'All levels inline',
'filters.style.masterDesc': 'Categories + types',
'filters.style.sentenceDesc': 'Plain-language builder',
'filters.style.comingSoon': 'Coming soon',

// In ru.ts (same keys, RU values per CONTEXT.md D-14):
'accountSettings.filterPicker.title': 'Стиль поиска',
'accountSettings.filterPicker.subtitle': 'Как выглядят фильтры',
'filters.style.guided': 'Пошаговый',
'filters.style.cascading': 'Каскадный',
'filters.style.master': 'Категории и типы',
'filters.style.sentence': 'Предложение',
'filters.style.guidedDesc': 'По одному шагу',
'filters.style.cascadingDesc': 'Все уровни сразу',
'filters.style.masterDesc': 'Категории и типы',
'filters.style.sentenceDesc': 'Конструктор-фраза',
'filters.style.comingSoon': 'Скоро',
```

**Placement:** Append to existing `accountSettings.*` block (around lines 253-260 in en.ts) for `accountSettings.section.*` and `accountSettings.filterPicker.*`. Append to existing `filters.*` block (Phase 14 namespace; search en.ts for `'filters.title':` to locate) for `filters.style.*`.

---

## Shared Patterns

### Theme tokens — no hex literals

**Source:** `src/theme/colors.ts` (Phase 12 single source of truth).
**Apply to:** SectionLabel, FilterStyleRow, AccountSettingsScreen rewrite.

**Pattern** (every component file):
```tsx
import { useTheme } from '../theme/ThemeContext'; // or '../../theme/ThemeContext' per depth
const { colors } = useTheme();
// All color values come from `colors.*` tokens. The only permitted hex literal
// is '#FFFFFF' or '#fff' for text-on-accent (CheckSquare.tsx:50, DealToggle.tsx:86).
// Phase 15 D-08 ACCOUNT card uses colors.onAccent for the Save button text instead.
```

**Available Phase 12 tokens consumed** (per CONTEXT.md D-08 + D-18):
`background, bgDim, surface, surface2, hair2, text, textSecondary, textTertiary, iconChipFg, accent, accentSoft, accentLine, destructiveRed, onAccent`.

### i18n via `useLanguage().t()` + flat key-map

**Source:** `src/context/LanguageContext.tsx`, `src/locales/en.ts` (defines `TranslationKeys`), `src/locales/index.ts`.
**Apply to:** All 3 new/modified component files (SectionLabel doesn't need it; FilterStyleRow + AccountSettings do).

**Pattern**:
```tsx
import { useLanguage } from '../context/LanguageContext';
import type { TranslationKeys } from '../locales';
const { t } = useLanguage();
// Usage:
t('accountSettings.section.account')
t('filters.style.comingSoon')
// For brand-new keys before TranslationKeys picks them up (rare — only matters
// when planning JSX before keys land in en.ts):
t('newly.added.key' as TranslationKeys)
```

### `useFilterStyle()` context consumer (Phase 13)

**Source:** `src/context/FilterStyleContext.tsx`.
**Apply to:** FilterStyleRow.tsx only (per CONTEXT.md D-03 — picker is self-contained).

**Pattern**:
```tsx
import { useFilterStyle, type FilterStyle } from '../context/FilterStyleContext';
const { filterStyle, setFilterStyle } = useFilterStyle();

// Read:
const currentLabel = FILTER_STYLES.find(s => s.id === filterStyle)?.labelKey;

// Write (async — match LanguageContext.setLanguage pattern):
await setFilterStyle('cascading'); // returns Promise<void>
```
**Acceptance gate** (CONTEXT.md): `grep -nE "useFilterStyle" src/components/FilterStyleRow.tsx` must return ≥1 match post-commit.

### Test infrastructure — TestRenderer + act + jest.mock contexts

**Source:** `src/components/filters/__tests__/CascadingFilter.test.tsx`, `src/components/filters/primitives/__tests__/CheckSquare.test.tsx`, `src/components/__tests__/EmailVerifyBanner.test.tsx`.
**Apply to:** Both new test files.

**Pattern** (no `@testing-library/react-native` in dev deps — project uses raw RTR):
```tsx
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';

jest.mock('<path>/theme/ThemeContext', () => ({ useTheme: jest.fn() }));
jest.mock('<path>/context/LanguageContext', () => ({ useLanguage: jest.fn() }));
// ... only mock the contexts the component-under-test reads.

const { useTheme } = require('<path>/theme/ThemeContext');
const { useLanguage } = require('<path>/context/LanguageContext');
import ComponentUnderTest from '../ComponentUnderTest';

beforeEach(() => {
  jest.clearAllMocks();
  useTheme.mockReturnValue({ isDark: true, colors: { /* only tokens the component reads */ } });
  useLanguage.mockReturnValue({ t: (k: string) => k, language: 'en' });
});

describe('ComponentUnderTest', () => {
  test('...', () => {
    let tree!: TestRenderer.ReactTestRenderer;
    act(() => {
      tree = TestRenderer.create(<ComponentUnderTest ... />);
    });
    // findByLabel / findChipByLabel / findAllByType — pick from analog patterns.
  });
});
```

### Pressable hit-slop convention

**Source:** `src/components/StepperInput.tsx:115` (`{ top: 10, bottom: 10, left: 10, right: 10 }`), Phase 14 `Stepper.tsx:65` + `DealToggle.tsx:80` + `CascadingFilter.tsx:141` + `CascadingFilter.tsx:199` (all use `{ top: 4, bottom: 4, left: 4, right: 4 }`).
**Apply to:** FilterStyleRow Pressables (chevron-rotate, sub-row taps, Edit link if applicable).

**Pattern**: `hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}` for the FilterStyleRow collapsed-row tap (per CONTEXT.md D-23 — belt-and-suspenders since the row is 50pt tall already, well past 44pt HIG min); `hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}` for the sub-row chips (mirror Phase 14 D-19).

### Brownfield rewrite atomicity

**Source:** Plan 14-02 (HomeScreen.tsx:521-642 → `<CascadingFilter />` mount in single atomic commit).
**Apply to:** Plan 15-01 (AccountSettingsScreen.tsx 4-section rewrite + token migration in single atomic commit).

**Pattern**:
- DELETE old JSX block(s) + ADD new JSX block(s) in the SAME commit.
- No transient "broken screen" state visible across the commit boundary.
- Acceptance gate after commit: `grep -nE "themeStyles" src/screens/AccountSettingsScreen.tsx` returns 0 matches.

---

## No Analog Found

None. All 6 files have a clear analog in the codebase. The "composite" classification for `FilterStyleRow.tsx` reflects that no single existing file combines stateful expand/collapse + radio-style sub-rows + Coming-soon gating — but every individual concern (multi-row selectable list, Animated rotate, async setter write, accent-soft selected state, hit-slop on Pressable) has a strong analog.

---

## Hard-Rule Compliance Cross-Check

Every file plan above respects:

| Rule | Where it lands |
|---|---|
| KBD-02 (`keyboardVerticalOffset` grep = 0) | AccountSettingsScreen rewrite preserves KeyboardAwareScrollView with `bottomOffset={20}` only; no new keyboard-aware surfaces. |
| EN+RU parity (TS `Record<TranslationKeys, string>` + parity script) | Plans 15-01 + 15-02 each add keys to en.ts + ru.ts atomically; tsc enforces parity. |
| No `react-navigation` | AccountSettingsScreen continues using `onBack` callback (line 24 props). No router introduced. |
| No Firebase SDK | Phase 15 touches no auth code. `useAuth()` reads (`.user`, `.deleteAccount`) unchanged. |
| No backend changes | All Phase 15 reads/writes go through existing AuthService methods + AsyncStorage via FilterStyleContext. No API calls added. |
| M6 language pill stays in HomeScreen header | Phase 15 modifies AccountSettings only; HomeScreen header `<LanguageToggleSwitch>` untouched. The in-screen Language toggle (lines 207-294) stays as the separate control. |
| M6 4-variant picker | FILTER_STYLES array per D-04 lists all 4 styles (guided, cascading, master, sentence). Master + Sentence rendered with Coming-soon badge per D-06. |
| Reanimated 4.x peer constraint | Phase 15 uses RN core `Animated` (D-05) + `LayoutAnimation` (D-05). No reanimated imports. |
| Subagent CWD-drift | Planner instructs executor to `cd "$(git rev-parse --show-toplevel)" && ` prefix every Bash + verify branch before commit. (Planner-side concern, not file-pattern-side.) |

---

## Metadata

**Analog search scope:**
- `src/components/` (root + `filters/`, `filters/primitives/`, `details/`, `__tests__/`)
- `src/context/` (FilterStyleContext, LanguageContext)
- `src/screens/` (AccountSettingsScreen — the target itself; HomeScreen — Plan 14-02 precedent)
- `src/theme/` (colors.ts, ThemeContext)
- `src/locales/` (en.ts, ru.ts, index.ts)
- `scripts/` (check-i18n-parity.sh)

**Files scanned (primary reads):** 13
- `src/components/LanguageToggleSwitch.tsx`
- `src/components/ThemeToggleSwitch.tsx`
- `src/components/EmailVerifyBanner.tsx`
- `src/components/StepperInput.tsx`
- `src/components/filters/CascadingFilter.tsx`
- `src/components/filters/GuidedFilterSheet.tsx`
- `src/components/filters/primitives/DealToggle.tsx`
- `src/components/filters/primitives/Stepper.tsx`
- `src/components/filters/primitives/CheckSquare.tsx`
- `src/components/filters/__tests__/CascadingFilter.test.tsx`
- `src/components/filters/primitives/__tests__/CheckSquare.test.tsx`
- `src/components/filters/primitives/__tests__/Stepper.test.tsx`
- `src/components/__tests__/EmailVerifyBanner.test.tsx`
- `src/screens/AccountSettingsScreen.tsx`
- `src/context/FilterStyleContext.tsx`
- `src/theme/colors.ts`
- `src/locales/en.ts` (head + accountSettings block)
- `src/locales/index.ts`
- `scripts/check-i18n-parity.sh`

**Pattern extraction date:** 2026-05-31

*Phase 15 — Account Settings Restructure + Filter-Style Picker*

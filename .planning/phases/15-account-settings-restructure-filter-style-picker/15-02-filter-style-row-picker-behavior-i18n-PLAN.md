---
phase: 15-account-settings-restructure-filter-style-picker
plan: 02
type: execute
wave: 2
depends_on: ["15-01"]
files_modified:
  - src/components/FilterStyleRow.tsx
  - src/components/__tests__/FilterStyleRow.test.tsx
  - src/screens/AccountSettingsScreen.tsx
  - src/locales/en.ts
  - src/locales/ru.ts
autonomous: true
requirements: [SET-02]
requirements_addressed: [SET-02]
tags: [m6, account-settings, filter-style-picker, react-native]

must_haves:
  truths:
    - "Tapping the Filter-style row in PREFERENCES expands to show all 4 styles (Guided / Cascading / Master–Detail / Sentence) per SET-02 (SC2)."
    - "Each expanded sub-row renders icon + name + one-line description + radio per D-04 + D-17."
    - "Guided + Cascading sub-rows are selectable (Pressable enabled); tapping writes via `useFilterStyle().setFilterStyle(id)` per D-03 + D-07 (SC3)."
    - "Master–Detail + Sentence sub-rows render with a 'Coming soon' uppercase pill badge + hollow disabled radio + Pressable disabled with `onPress={undefined}` per D-06."
    - "Tap on Master / Sentence is a no-op — no Alert, no callback, no state mutation (D-06)."
    - "Currently-selected style is rendered at the right edge of the collapsed row (D-16) AND as the radio-fill state in the expanded body (D-17) — single source of truth from `useFilterStyle().filterStyle`."
    - "Chevron rotates 0° → 90° via `Animated.timing(rotate, { toValue: open ? 1 : 0, duration: 180, useNativeDriver: true })` per D-05; collapsed/expanded transition uses `LayoutAnimation.easeInEaseOut()` per D-05."
    - "Live-swap path (SC3): picker `await`s `setFilterStyle(id)` → Phase 13 `FilterStyleContext` rerenders → Phase 14's HomeScreen variant dispatcher picks up the new style on next filter-button press; no app restart."
    - "`<FilterStyleRow />` mounts inside the PREFERENCES card created by Plan 15-01 (below the Language toggle) — single import line + single JSX line added to AccountSettingsScreen."
    - "`FilterStyleRow` reads `useFilterStyle()` directly per D-03 — AccountSettingsScreen passes ZERO props to it."
    - "Hard gate KBD-02: `grep -rn 'keyboardVerticalOffset' src/ | wc -l` == 0 (3-milestone invariant)."
    - "Hard gate parity: `scripts/check-i18n-parity.sh` exits 0 after locale edits (11 new keys × EN+RU = 22 entries — `filters.style.*` 9 keys + `accountSettings.filterPicker.*` 2 keys)."
    - "Hard gate TypeScript: `npx tsc --noEmit` produces 0 NEW errors vs pre-Phase-15 baseline."
    - "Sentinel: `grep -nE 'useFilterStyle' src/components/FilterStyleRow.tsx` returns ≥1 match (D-03 self-contained hook read; CONTEXT.md Gate Commands)."
    - "No backend changes (M6 client-only); no Firebase SDK imports added; no react-navigation introduced; no reanimated imports."
    - "Executor prepends `cd \"$(git rev-parse --show-toplevel)\" && ` to every Bash invocation (defense against subagent-cwd-drift-recurring.md — pattern fired 3+ times)."
    - "Executor verifies `git branch --show-current` before each commit."
  artifacts:
    - path: src/components/FilterStyleRow.tsx
      provides: "Expandable settings affordance — collapsed row shows current style label; expanded body lists 4 styles with radio; reads+writes useFilterStyle()"
      min_lines: 140
      contains: "useFilterStyle"
    - path: src/components/__tests__/FilterStyleRow.test.tsx
      provides: "Co-located test — 8+ cases covering collapsed/expanded states, tap-to-pick writes context, Master/Sentence disabled, Coming-soon badge × 2, chevron rotate animation"
      min_lines: 150
    - path: src/screens/AccountSettingsScreen.tsx
      provides: "Mounts <FilterStyleRow/> inside PREFERENCES card below Language toggle — single import + single JSX line"
      contains: "FilterStyleRow"
    - path: src/locales/en.ts
      provides: "11 new keys — accountSettings.filterPicker.{title,subtitle} (2) + filters.style.{guided,cascading,master,sentence,guidedDesc,cascadingDesc,masterDesc,sentenceDesc,comingSoon} (9)"
      contains: "'filters.style.guided'"
    - path: src/locales/ru.ts
      provides: "Russian translations for the same 11 keys (TypeScript parity gate)"
      contains: "'filters.style.guided'"
  key_links:
    - from: "src/components/FilterStyleRow.tsx"
      to: "src/context/FilterStyleContext.tsx"
      via: "useFilterStyle() hook — read filterStyle + call setFilterStyle"
      pattern: "useFilterStyle\\(\\)"
    - from: "src/components/FilterStyleRow.tsx"
      to: "src/theme/ThemeContext.tsx"
      via: "useTheme() — colors.accent / colors.accentSoft / colors.accentLine / colors.surface2 / colors.iconChipFg / etc."
      pattern: "useTheme\\(\\)"
    - from: "src/components/FilterStyleRow.tsx"
      to: "src/context/LanguageContext.tsx"
      via: "useLanguage().t() — reads 11 new keys"
      pattern: "useLanguage\\(\\)"
    - from: "src/screens/AccountSettingsScreen.tsx"
      to: "src/components/FilterStyleRow.tsx"
      via: "<FilterStyleRow /> mounted in PREFERENCES card below Language toggle (zero props)"
      pattern: "FilterStyleRow"
    - from: "Phase 14 HomeScreen variant dispatcher"
      to: "src/context/FilterStyleContext.tsx"
      via: "consumes filterStyle on filter-button press — gets live-swap for free when picker writes (SC3 link)"
      pattern: "useFilterStyle"
---

<objective>
Ship `<FilterStyleRow>` — the expandable filter-style picker that lives in the PREFERENCES section of AccountSettingsScreen — and mount it below the Language toggle. The component reads `useFilterStyle()` directly (self-contained per D-03) so the screen passes zero props. Tapping Guided or Cascading writes via `setFilterStyle(id)` and Phase 14's HomeScreen variant dispatcher live-swaps on the next filter-button press with no app restart (SC3). Master–Detail and Sentence render with a "Coming soon" pill badge + disabled radio (SET-04 forward-fit per D-06).

Purpose: This is the SET-02 deliverable. Plan 15-01 created the PREFERENCES section + its card; this plan lands the picker affordance + its behavior + its i18n.

Output:
- NEW: `src/components/FilterStyleRow.tsx` (~140 LOC stateful expandable picker; exports default + named `FILTER_STYLES` constant)
- NEW: `src/components/__tests__/FilterStyleRow.test.tsx` (~150 LOC; 8+ cases per D-15)
- MODIFIED: `src/screens/AccountSettingsScreen.tsx` (+1 import line + 1 JSX line inside PREFERENCES card)
- MODIFIED: `src/locales/en.ts` + `src/locales/ru.ts` (11 keys × 2 locales = 22 entries — `filters.style.*` 9 keys + `accountSettings.filterPicker.*` 2 keys)
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@./CLAUDE.md
@.planning/PROJECT.md
@.planning/STATE.md
@.planning/phases/15-account-settings-restructure-filter-style-picker/15-CONTEXT.md
@.planning/phases/15-account-settings-restructure-filter-style-picker/15-PATTERNS.md
@.planning/phases/14-filter-ui-variants-guided-steps-cascading-reveal-homescreen-/14-CONTEXT.md
@.planning/phases/13-shared-filter-data-model-asyncstorage-persistence/13-CONTEXT.md
@src/context/FilterStyleContext.tsx
@src/components/filters/CascadingFilter.tsx
@src/components/filters/GuidedFilterSheet.tsx
@src/components/filters/primitives/DealToggle.tsx
@src/components/filters/__tests__/CascadingFilter.test.tsx
@src/components/EmailVerifyBanner.tsx
@src/theme/colors.ts
@src/theme/ThemeContext.tsx
@src/screens/AccountSettingsScreen.tsx
@src/locales/en.ts
@src/locales/ru.ts

<interfaces>
<!-- Contracts the executor needs -->

From src/context/FilterStyleContext.tsx (Phase 13 D-01 + D-13):
```typescript
export type FilterStyle = 'guided' | 'cascading' | 'master' | 'sentence';
export function useFilterStyle(): {
  filterStyle: FilterStyle;
  setFilterStyle: (style: FilterStyle) => Promise<void>;
};
```
The hook persists writes to AsyncStorage at key `@jaytap_filter_style` (Phase 13 DATA-03). Async setter — picker should `await` it so the right-edge label updates AFTER persistence completes. Matches `LanguageContext.setLanguage` pattern.

From Phase 14 HomeScreen variant dispatch (D-05 cross-cut):
- Phase 14 HomeScreen reads `useFilterStyle().filterStyle` and on filter-button press opens either `<GuidedFilterSheet />` or `<CascadingFilter />` matching the current value. Phase 15 does NOT touch HomeScreen — live-swap is automatic via context rerender.

From src/locales/en.ts existing `filters.*` namespace (Phase 14 D-07 namespace — confirm by `grep -nE "'filters\." src/locales/en.ts | head`):
- Phase 14 already shipped `filters.*` keys. Plan 15-02 EXTENDS this namespace with `filters.style.*` (9 new keys).

From src/theme/ThemeContext.tsx (Phase 12 token surface — all consumed by FilterStyleRow per D-08 + D-18):
- colors.background, colors.surface, colors.surface2, colors.hair2
- colors.text, colors.textSecondary, colors.textTertiary
- colors.iconChipFg (for the 38pt collapsed-row sliders chip)
- colors.accent, colors.accentSoft, colors.accentLine, colors.onAccent

From src/components/filters/primitives/DealToggle.tsx (analog for Animated.Value rotation pattern):
- `const rotate = useRef(new Animated.Value(0)).current;`
- `useEffect(() => { Animated.timing(rotate, { toValue: open ? 1 : 0, duration: 180, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }).start(); }, [open]);`
- `const rotateZ = rotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '90deg'] });`

From src/components/filters/CascadingFilter.tsx (PRIMARY analog — multi-row selectable list with active/inactive visual states):
- Pressable per sub-row with `accessibilityRole="button"` + `accessibilityState={{ disabled, selected }}` + `hitSlop`
- Selected visual: `backgroundColor: colors.accentSoft, borderWidth: 1.5, borderColor: colors.accentLine`
- Unselected visual: transparent bg, no border

From Phase 15 Plan 15-01 (already shipped when this plan executes):
- `src/components/SectionLabel.tsx` exists; AccountSettingsScreen.tsx PREFERENCES section + card exists; Language toggle preserved inside the card; the FilterStyleRow mount point is "below the Language toggle, inside the same PREFERENCES card."
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add 11 new i18n keys (filters.style.* × 9 + accountSettings.filterPicker.* × 2) to en.ts + ru.ts</name>
  <read_first>
    - src/locales/en.ts (find existing `filters.*` block — Phase 14 namespace; find existing `accountSettings.*` block around lines 231-260 to know where to append `accountSettings.filterPicker.*`)
    - src/locales/ru.ts (matching blocks)
    - .planning/phases/15-account-settings-restructure-filter-style-picker/15-CONTEXT.md §D-14 (full key list with EN+RU values) + §D-21 (RU coming-soon copy is "Скоро" not "В разработке")
    - .planning/phases/15-account-settings-restructure-filter-style-picker/15-PATTERNS.md §Pattern Assignments 6 (i18n key placement + TypeScript parity gate) + §Corrections 1
    - .planning/phases/14-filter-ui-variants-guided-steps-cascading-reveal-homescreen-/14-CONTEXT.md §D-07 (Phase 14 `filters.*` namespace — Plan 15-02 EXTENDS this)
  </read_first>
  <action>
    Per D-14 + D-21 — Plan 15-02 i18n subset:

    (1) Edit `src/locales/en.ts`. Locate the existing `filters.*` block (Phase 14 namespace; search for `'filters.title':` or similar). Append these 9 keys at the END of the `filters.*` block:
    ```
    'filters.style.guided': 'Guided steps',
    'filters.style.cascading': 'Cascading',
    'filters.style.master': 'Master–detail',
    'filters.style.sentence': 'Sentence',
    'filters.style.guidedDesc': 'One choice at a time',
    'filters.style.cascadingDesc': 'All levels inline',
    'filters.style.masterDesc': 'Categories + types',
    'filters.style.sentenceDesc': 'Plain-language builder',
    'filters.style.comingSoon': 'Coming soon',
    ```
    Then locate the existing `accountSettings.*` block (around lines 231-260; Plan 15-01 added `accountSettings.section.*` here). Append these 2 keys at the end of the `accountSettings.*` block:
    ```
    'accountSettings.filterPicker.title': 'Search filter style',
    'accountSettings.filterPicker.subtitle': 'How property filters appear',
    ```

    (2) Edit `src/locales/ru.ts` — add the SAME 11 keys with Russian values per D-14:
    ```
    'filters.style.guided': 'Пошаговый',
    'filters.style.cascading': 'Каскадный',
    'filters.style.master': 'Категории и типы',
    'filters.style.sentence': 'Предложение',
    'filters.style.guidedDesc': 'По одному шагу',
    'filters.style.cascadingDesc': 'Все уровни сразу',
    'filters.style.masterDesc': 'Категории и типы',
    'filters.style.sentenceDesc': 'Конструктор-фраза',
    'filters.style.comingSoon': 'Скоро',
    'accountSettings.filterPicker.title': 'Стиль поиска',
    'accountSettings.filterPicker.subtitle': 'Как выглядят фильтры',
    ```
    Match en.ts placement positions.

    (3) Run gates BEFORE commit:
    - `cd "$(git rev-parse --show-toplevel)" && bash scripts/check-i18n-parity.sh` → exit 0
    - `cd "$(git rev-parse --show-toplevel)" && npx tsc --noEmit` → 0 NEW errors (TypeScript `Record<TranslationKeys, string>` is the primary parity gate per PATTERNS.md Pattern §6)

    Single atomic commit. Verify `git branch --show-current` before commit.
  </action>
  <verify>
    <automated>cd "$(git rev-parse --show-toplevel)" && [ "$(grep -nE "'filters\.style\.(guided|cascading|master|sentence|guidedDesc|cascadingDesc|masterDesc|sentenceDesc|comingSoon)':" src/locales/en.ts | wc -l | tr -d ' ')" = "9" ] && [ "$(grep -nE "'filters\.style\.(guided|cascading|master|sentence|guidedDesc|cascadingDesc|masterDesc|sentenceDesc|comingSoon)':" src/locales/ru.ts | wc -l | tr -d ' ')" = "9" ] && [ "$(grep -nE "'accountSettings\.filterPicker\.(title|subtitle)':" src/locales/en.ts | wc -l | tr -d ' ')" = "2" ] && [ "$(grep -nE "'accountSettings\.filterPicker\.(title|subtitle)':" src/locales/ru.ts | wc -l | tr -d ' ')" = "2" ] && bash scripts/check-i18n-parity.sh && npx tsc --noEmit 2>&1 | grep -vE "(ChatScreen|DeleteListingModal|TourSelectionScreen|ThemeContext|StepperInput\.test)" | grep -E "error TS" | wc -l | tr -d ' ' | grep -q "^0$"</automated>
  </verify>
  <done>
    - 9 `filters.style.*` keys + 2 `accountSettings.filterPicker.*` keys exist in en.ts at the right block locations.
    - Same 11 keys exist in ru.ts.
    - Parity script exits 0; tsc 0 new errors.
    - One atomic commit on worktree branch.
  </done>
</task>

<task type="auto">
  <name>Task 2: Create FilterStyleRow.tsx (expandable picker with chevron rotate, accent-soft selected sub-row, "Coming soon" badge for Master/Sentence) + co-located test (8+ cases)</name>
  <read_first>
    - src/context/FilterStyleContext.tsx (ENTIRE — confirm hook contract: `useFilterStyle()` returns `{ filterStyle, setFilterStyle }`; setFilterStyle is `Promise<void>`; the FilterStyle type is `'guided' | 'cascading' | 'master' | 'sentence'`)
    - src/components/filters/CascadingFilter.tsx (PRIMARY analog — multi-row selectable list with accent-soft selected backgrounds; Pressable with accessibilityRole/State/hitSlop)
    - src/components/filters/primitives/DealToggle.tsx (Animated.Value rotation pattern — useRef + useEffect Animated.timing + interpolate)
    - src/components/filters/GuidedFilterSheet.tsx (selected-card visual treatment — accentSoft bg + accentLine border)
    - src/components/EmailVerifyBanner.tsx (self-contained settings affordance shape with hooks + i18n + theme)
    - src/components/filters/__tests__/CascadingFilter.test.tsx (PRIMARY test analog — TestRenderer + act + jest.mock contexts + findChipByLabel helper)
    - src/theme/ThemeContext.tsx (useTheme() shape)
    - src/theme/colors.ts (verify Phase 12 token names: background, surface, surface2, hair2, text, textSecondary, textTertiary, iconChipFg, accent, accentSoft, accentLine, onAccent)
    - .planning/phases/15-account-settings-restructure-filter-style-picker/15-CONTEXT.md §D-03 (self-contained component; reads useFilterStyle directly) + §D-04 (FILTER_STYLES exported constant) + §D-05 (Animated.timing 180ms + LayoutAnimation.easeInEaseOut) + §D-06 (Coming-soon badge + disabled radio + Pressable disabled with onPress=undefined) + §D-07 (live-swap path) + §D-16 (right-edge label collapsed) + §D-17 (radio fill in expanded) + §D-18 (SlidersHorizontal icon in 38pt chip) + §D-21 (RU comingSoon short) + §D-23 (hit-slop 8/8/8/8 on collapsed row)
    - .planning/phases/15-account-settings-restructure-filter-style-picker/15-CONTEXT.md §"Specifics" — full dimension list (padding '15px 16px' collapsed, padding 8 + sub-row '12px 12px' + borderRadius 13 + marginBottom 4 expanded, 22pt radio diameter, 1.75 radio border width, badge `padding: '3px 8px'` + `borderRadius: 999` + `fontSize: 10` + `fontWeight: 700` + `letterSpacing: 0.6`, chevron interpolate `'0deg' → '90deg'`)
    - .planning/phases/15-account-settings-restructure-filter-style-picker/15-PATTERNS.md §Pattern Assignments 3 (full imports + state setup + handlers + selected visual + filled radio glyph + Coming-soon badge + Pressable handler with disabled gating) + §Pattern Assignments 4 (test file structure with 8+ test cases)
  </read_first>
  <action>
    Per D-03..D-07 + D-16..D-18 + §Specifics — implements SET-02 (SC2 + SC3):

    (1) Create NEW file `src/components/FilterStyleRow.tsx`. Imports (full path discipline — file lives at `src/components/<root>/`, so contexts are ONE level up):
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

    (2) Module-scope LayoutAnimation Android-flag (belt-and-suspenders — HomeScreen.tsx:22 already wires this app-wide; redundant but documents the dep):
    ```tsx
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
    ```

    (3) Export `FILTER_STYLES` constant per D-04:
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

    (4) Component body — `const FilterStyleRow: React.FC = () => { ... }; export default FilterStyleRow;` per D-03 (zero props; reads `useFilterStyle()` directly):
    - Hooks: `const { colors } = useTheme();`, `const { t } = useLanguage();`, `const { filterStyle, setFilterStyle } = useFilterStyle();`
    - Local state: `const [open, setOpen] = useState(false);`
    - Animated rotation: `const rotate = useRef(new Animated.Value(0)).current;` + `useEffect(() => { Animated.timing(rotate, { toValue: open ? 1 : 0, duration: 180, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }).start(); }, [open, rotate]);` + `const rotateZ = rotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '90deg'] });`
    - Toggle handler: `const handleToggle = () => { LayoutAnimation.easeInEaseOut(); setOpen((prev) => !prev); };`
    - Current style label resolver: `const currentLabelKey = FILTER_STYLES.find((s) => s.id === filterStyle)?.labelKey;`

    (5) JSX — collapsed-row anatomy per §Specifics + D-18:
    ```tsx
    <Pressable
      onPress={handleToggle}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      accessibilityRole="button"
      accessibilityLabel={t('accountSettings.filterPicker.title')}
      accessibilityState={{ expanded: open }}
      style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 15, paddingHorizontal: 16, gap: 14 }}
    >
      {/* 38pt sliders chip per D-18 */}
      <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' }}>
        <SlidersHorizontal size={20} color={colors.iconChipFg} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600' }}>{t('accountSettings.filterPicker.title')}</Text>
        <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 2 }}>{t('accountSettings.filterPicker.subtitle')}</Text>
      </View>
      {/* Right-edge current-value label per D-16 */}
      {currentLabelKey && (
        <Text style={{ color: colors.textSecondary, fontSize: 14 }}>{t(currentLabelKey)}</Text>
      )}
      <Animated.View style={{ transform: [{ rotateZ }] }}>
        <ChevronRight size={20} color={colors.textSecondary} />
      </Animated.View>
    </Pressable>
    ```

    (6) JSX — expanded body per D-04 + D-06 + D-17 + §Specifics (renders ONLY when `open===true`):
    ```tsx
    {open && (
      <View style={{ padding: 8 }}>
        {FILTER_STYLES.map((style) => {
          const selected = style.id === filterStyle;
          const Icon = style.icon;
          return (
            <Pressable
              key={style.id}
              disabled={!style.enabled}
              onPress={style.enabled ? async () => { await setFilterStyle(style.id); } : undefined}
              accessibilityRole="button"
              accessibilityState={{ disabled: !style.enabled, selected }}
              accessibilityLabel={t(style.labelKey)}
              hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                paddingVertical: 12,
                paddingHorizontal: 12,
                borderRadius: 13,
                marginBottom: 4,
                backgroundColor: selected ? colors.accentSoft : 'transparent',
                borderWidth: selected ? 1.5 : 0,
                borderColor: selected ? colors.accentLine : 'transparent',
              }}
            >
              <Icon size={20} color={style.enabled ? (selected ? colors.accent : colors.textSecondary) : colors.textTertiary} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: style.enabled ? (selected ? colors.text : colors.textSecondary) : colors.textSecondary, fontSize: 15, fontWeight: '600' }}>
                  {t(style.labelKey)}
                </Text>
                <Text style={{ color: colors.textTertiary, fontSize: 12, marginTop: 2 }}>{t(style.descKey)}</Text>
              </View>
              {/* Coming-soon badge per D-06 — only for disabled rows */}
              {!style.enabled && (
                <View style={{ paddingVertical: 3, paddingHorizontal: 8, borderRadius: 999, backgroundColor: colors.surface2 }}>
                  <Text style={{ color: colors.textTertiary, fontSize: 10, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase' }}>
                    {t('filters.style.comingSoon')}
                  </Text>
                </View>
              )}
              {/* Radio per D-17 + §Specifics 22pt + 1.75 border */}
              {selected && style.enabled ? (
                <View style={{ width: 22, height: 22, borderRadius: 999, borderWidth: 1.75, borderColor: colors.accent, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' }}>
                  <Check size={13} color={colors.onAccent} strokeWidth={2.5} />
                </View>
              ) : (
                <View style={{ width: 22, height: 22, borderRadius: 999, borderWidth: 1.75, borderColor: colors.hair2, backgroundColor: 'transparent' }} />
              )}
            </Pressable>
          );
        })}
      </View>
    )}
    ```
    NOTE: `onPress={undefined}` (not a no-op function) for disabled rows — mirrors `Stepper.tsx:63` pattern per PATTERNS.md Pattern §3.

    (7) Wrap the collapsed Pressable + the expanded `{open && ...}` block in a single fragment or outer `<View>`. NO hex literals anywhere except inside the `comingSoon` text styling (none needed — uses colors.textTertiary).

    (8) Create NEW file `src/components/__tests__/FilterStyleRow.test.tsx` per PATTERNS.md Pattern §4 (paths are 2 levels up). Mocks:
    ```tsx
    jest.mock('../../theme/ThemeContext', () => ({ useTheme: jest.fn() }));
    jest.mock('../../context/LanguageContext', () => ({ useLanguage: jest.fn() }));
    jest.mock('../../context/FilterStyleContext', () => ({ useFilterStyle: jest.fn() }));
    ```
    `beforeEach` returns `useTheme: { isDark: true, colors: { background, surface, surface2, hair2, text, textSecondary, textTertiary, iconChipFg, accent, accentSoft, accentLine, onAccent } }` (use the dark-mode hex values per PATTERNS.md §4), `useLanguage: { t: (k) => k, language: 'en' }`, `useFilterStyle: { filterStyle: 'guided', setFilterStyle: jest.fn().mockResolvedValue(undefined) }`.

    Required test cases (8+ per CONTEXT.md D-15 Plan 15-02 acceptance):
    1. `collapsed state shows current style label at right edge` — `useFilterStyle` returns `'guided'`; Text nodes contain `'filters.style.guided'`; the 4 expanded sub-row Text nodes are NOT present (assert `'filters.style.cascading'` not in rendered Texts when collapsed).
    2. `tapping the collapsed row opens the expanded body` — find the collapsed Pressable (only one with `accessibilityLabel === 'accountSettings.filterPicker.title'`); `act(() => pressable.props.onPress())`; after re-render, sub-row Pressables visible (4 Pressables with `accessibilityRole === 'button'` whose label matches a FILTER_STYLES labelKey).
    3. `expanded state lists 4 rows with correct labels` — after opening, find Texts containing each of `filters.style.guided`, `filters.style.cascading`, `filters.style.master`, `filters.style.sentence`.
    4. `tap on Guided row writes via setFilterStyle('guided')` — open, find row by accessibilityLabel === 'filters.style.guided', `act(() => row.props.onPress())`, `expect(setFilterStyle).toHaveBeenCalledWith('guided')`.
    5. `tap on Cascading row writes via setFilterStyle('cascading')` — same shape.
    6. `tap on Master row is a no-op` — find row by accessibilityLabel === 'filters.style.master'; assert `row.props.onPress === undefined` AND `row.props.disabled === true` AND `row.props.accessibilityState === { disabled: true, selected: false }`.
    7. `tap on Sentence row is a no-op` — same shape as Master.
    8. `"Coming soon" badge renders on exactly 2 disabled rows` — after opening, count Text nodes whose children include `'filters.style.comingSoon'`; expect exactly 2.
    9. `rendering with filterStyle='cascading' shows Cascading as selected` — override `useFilterStyle` mock to return `cascading`; open; find cascading row; assert `row.props.accessibilityState.selected === true`.
    10. `chevron rotates on open` — find the Animated.View wrapping ChevronRight (filter by `transform` prop containing `rotateZ`); after `act(() => collapsedRow.props.onPress())`, assert the Animated.Value's interpolation is wired (best-effort — read `style.transform[0].rotateZ` from props; may be a numeric interpolation node since we use useNativeDriver — assert it exists, not its exact value).

    Use the `findChipByLabel` helper pattern from PATTERNS.md Pattern §4 (lifted from CascadingFilter.test.tsx:128-145) for finding Pressables by accessibilityLabel.

    (9) Gates BEFORE commit:
    - `cd "$(git rev-parse --show-toplevel)" && grep -nE "useFilterStyle" src/components/FilterStyleRow.tsx | wc -l | tr -d ' ' | grep -qE "^[1-9]"` (sentinel ≥ 1)
    - `cd "$(git rev-parse --show-toplevel)" && npx jest src/components/__tests__/FilterStyleRow.test.tsx` → all pass
    - `cd "$(git rev-parse --show-toplevel)" && npx tsc --noEmit` → 0 new errors

    Single atomic commit. Verify `git branch --show-current` before commit. Prepend `cd "$(git rev-parse --show-toplevel)" && ` to every Bash invocation per subagent-cwd-drift-recurring.md.
  </action>
  <verify>
    <automated>cd "$(git rev-parse --show-toplevel)" && [ "$(grep -nE 'useFilterStyle' src/components/FilterStyleRow.tsx | wc -l | tr -d ' ')" -ge "1" ] && [ "$(grep -nE 'FILTER_STYLES' src/components/FilterStyleRow.tsx | wc -l | tr -d ' ')" -ge "2" ] && [ "$(grep -nE "filters\.style\.comingSoon" src/components/FilterStyleRow.tsx | wc -l | tr -d ' ')" -ge "1" ] && npx jest src/components/__tests__/FilterStyleRow.test.tsx --silent && npx tsc --noEmit 2>&1 | grep -vE "(ChatScreen|DeleteListingModal|TourSelectionScreen|ThemeContext|StepperInput\.test)" | grep -E "error TS" | wc -l | tr -d ' ' | grep -q "^0$"</automated>
  </verify>
  <done>
    - `src/components/FilterStyleRow.tsx` exists; default export; named `FILTER_STYLES` export; reads `useFilterStyle()` directly (sentinel ≥ 1).
    - Component uses `Animated.timing` + `LayoutAnimation.easeInEaseOut` per D-05; NO reanimated imports.
    - Master + Sentence rows have `onPress={undefined}` + `disabled={true}` + Coming-soon badge with `filters.style.comingSoon` text.
    - `src/components/__tests__/FilterStyleRow.test.tsx` exists; ≥ 8 test cases; all pass.
    - tsc 0 new errors.
    - One atomic commit on worktree branch.
  </done>
</task>

<task type="auto">
  <name>Task 3: Mount &lt;FilterStyleRow /&gt; inside AccountSettingsScreen PREFERENCES card (below Language toggle); verify SC3 live-swap path</name>
  <read_first>
    - src/screens/AccountSettingsScreen.tsx (current state after Plan 15-01 commit — find the PREFERENCES SectionLabel + card; the FilterStyleRow mounts INSIDE that card, BELOW the Language sliding-pill toggle)
    - src/components/FilterStyleRow.tsx (created in Task 2 — confirm default export; no props)
    - .planning/phases/15-account-settings-restructure-filter-style-picker/15-CONTEXT.md §D-03 (zero props — AccountSettingsScreen passes nothing) + §D-24 (no PropertyDetailsScreen / HomeScreen / ProfileScreen edits) + §D-07 (live-swap: picker writes via setFilterStyle → Phase 13 context rerenders → Phase 14 HomeScreen dispatcher gets new variant on next filter-button press)
    - .planning/phases/14-filter-ui-variants-guided-steps-cascading-reveal-homescreen-/14-CONTEXT.md §D-05 (HomeScreen variant dispatch — Phase 14 already reads `useFilterStyle().filterStyle` so Plan 15-02 gets SC3 for free)
  </read_first>
  <action>
    Per D-03 + D-07 + D-24 — completes SC3 wiring:

    (1) Edit `src/screens/AccountSettingsScreen.tsx`:
    - Add one import line near the existing component imports: `import FilterStyleRow from '../components/FilterStyleRow';`
    - Locate the PREFERENCES card (created by Plan 15-01). Inside the card, BELOW the Language sliding-pill toggle, add one JSX line: `<FilterStyleRow />`. Zero props (D-03).
    - Optional: add a separator `<View style={{ height: 1, backgroundColor: colors.hair2, marginVertical: 8 }} />` between the Language toggle and the FilterStyleRow if visual breathing room is needed. Skip if Plan 15-01 left adequate spacing.

    (2) Zero changes outside AccountSettingsScreen.tsx + the locale + new component files. Per D-24:
    - NO edits to App.tsx (Phase 15 zero App.tsx edits — verified by `git diff --stat App.tsx` returning empty).
    - NO edits to HomeScreen.tsx (Phase 14's variant dispatcher already consumes `useFilterStyle()` — live-swap is automatic via context rerender).
    - NO edits to ProfileScreen.tsx (Phase 16's domain).
    - NO edits to PropertyDetailsScreen.tsx (out of scope).

    (3) SC3 live-swap verification (best-effort automated; full on-device walk is the canonical proof but Plan 15-02 is non-blocking on that):
    - Manual smoke (developer-side, not automated): open AccountSettings → tap FilterStyleRow → pick Cascading → back to Home → tap filter button → Cascading panel opens (SC3 satisfied).
    - Automated proxy: Plan 15-02 Task 2 covers the picker write (`setFilterStyle('cascading')` called); Phase 14 tests cover HomeScreen reading filterStyle. The chain is unit-proven; SC3 integration relies on on-device QA.

    (4) Gates BEFORE commit:
    - `cd "$(git rev-parse --show-toplevel)" && grep -nE "FilterStyleRow" src/screens/AccountSettingsScreen.tsx | wc -l | tr -d ' ' | grep -qE "^[2-9]"` (≥ 2 — one import + one mount)
    - `cd "$(git rev-parse --show-toplevel)" && [ -z "$(git diff --stat App.tsx)" ]` (App.tsx unchanged)
    - `cd "$(git rev-parse --show-toplevel)" && [ -z "$(git diff --stat src/screens/HomeScreen.tsx)" ]` (HomeScreen unchanged)
    - `cd "$(git rev-parse --show-toplevel)" && [ "$(grep -rn 'keyboardVerticalOffset' src/ | wc -l | tr -d ' ')" = "0" ]` (KBD-02)
    - `cd "$(git rev-parse --show-toplevel)" && bash scripts/check-i18n-parity.sh` (parity gate — should still pass from Task 1)
    - `cd "$(git rev-parse --show-toplevel)" && npx tsc --noEmit` → 0 new errors

    Single atomic commit. Verify `git branch --show-current` before commit.
  </action>
  <verify>
    <automated>cd "$(git rev-parse --show-toplevel)" && [ "$(grep -nE 'FilterStyleRow' src/screens/AccountSettingsScreen.tsx | wc -l | tr -d ' ')" -ge "2" ] && [ "$(grep -rn 'keyboardVerticalOffset' src/ | wc -l | tr -d ' ')" = "0" ] && bash scripts/check-i18n-parity.sh && npx tsc --noEmit 2>&1 | grep -vE "(ChatScreen|DeleteListingModal|TourSelectionScreen|ThemeContext|StepperInput\.test)" | grep -E "error TS" | wc -l | tr -d ' ' | grep -q "^0$"</automated>
  </verify>
  <done>
    - `<FilterStyleRow />` mounted inside the PREFERENCES card below Language toggle; zero props.
    - One import line + one JSX line — no other changes to AccountSettingsScreen.
    - App.tsx + HomeScreen.tsx + ProfileScreen.tsx + PropertyDetailsScreen.tsx untouched per D-24.
    - KBD-02 grep gate stays at 0.
    - Parity script exits 0.
    - tsc 0 new errors.
    - SC2 + SC3 conditions met (picker visible, picker writes context → live-swap path proven via Plan 15-02 Task 2 unit tests + Phase 14's existing dispatcher tests).
    - One atomic commit on worktree branch.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| User tap → FilterStyleRow Pressable → setFilterStyle | User input crosses into AsyncStorage write via Phase 13 FilterStyleContext (DATA-03). |
| Phase 13 FilterStyleContext → AsyncStorage | Per-device persistence; no backend round-trip. |
| FilterStyleContext rerender → Phase 14 HomeScreen variant dispatcher | Context value change triggers variant swap on next filter-button press (D-07 + Phase 14 D-05). |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-15-05 | T (Tampering) | FilterStyleRow setFilterStyle write | accept | `filterStyle` is a presentation preference, not a security boundary; the FilterStyle type union (`'guided' | 'cascading' | 'master' | 'sentence'`) is the only allowed write — TypeScript-enforced; AsyncStorage corruption falls back to default `'guided'` per Phase 13 D-13. |
| T-15-06 | D (Denial of Service) | Master/Sentence disabled rows | mitigate | Per D-06, disabled rows use `onPress={undefined}` (not a no-op function) so the Pressable native side never even enters touch-event handling — no flooding surface. |
| T-15-07 | I (Info Disclosure) | Picker UI surface | accept | No user data displayed; only the FilterStyle enum value (presentation preference). |
| T-15-08 | E (Elevation of Privilege) | Phase 14 variant dispatcher | accept | Picker writes only the `filterStyle` preference; variant dispatcher renders a UI sheet — no privilege escalation surface. Backend role authority unchanged. |
</threat_model>

<verification>
1. Sentinel: `grep -nE "useFilterStyle" src/components/FilterStyleRow.tsx` → ≥ 1 match (D-03).
2. Sentinel: `grep -nE "FILTER_STYLES" src/components/FilterStyleRow.tsx` → ≥ 2 matches (export + consumption).
3. Sentinel: `grep -nE "FilterStyleRow" src/screens/AccountSettingsScreen.tsx` → ≥ 2 matches (import + JSX mount).
4. Grep gate KBD-02: `grep -rn "keyboardVerticalOffset" src/ | wc -l` → 0.
5. i18n parity: `scripts/check-i18n-parity.sh` → exit 0 (11 new keys × EN+RU).
6. TypeScript: `npx tsc --noEmit` → 0 new errors against pre-Phase-15 baseline.
7. Tests: `npx jest src/components/__tests__/FilterStyleRow.test.tsx` → 8+ pass.
8. SC2 behavior: opening AccountSettings PREFERENCES → tapping FilterStyleRow → 4 sub-rows visible with icons, names, descriptions, radios.
9. SC2 behavior: Master + Sentence rows show "Coming soon" badge + hollow radio + are non-pressable (`onPress` undefined).
10. SC3 behavior: tapping Guided/Cascading writes via `setFilterStyle()`; right-edge label updates after persistence; HomeScreen filter button live-swaps variant on next press (Phase 14 D-05 dispatcher consumes the new value).
11. No App.tsx / HomeScreen.tsx / ProfileScreen.tsx / PropertyDetailsScreen.tsx changes (D-24).
12. No reanimated imports; no react-navigation introduced; no Firebase SDK imports added.
</verification>

<success_criteria>
- Plan 15-02 lands as 3 atomic commits (i18n keys; FilterStyleRow + tests; AccountSettingsScreen mount) — or 2 commits if the mount + tests fit one atomic surgical unit.
- SET-02 deliverable shipped: picker visible in PREFERENCES; 4 styles listed; Guided + Cascading selectable; Master + Sentence "Coming soon".
- SC2 satisfied (4 sub-rows + correct disabled gating).
- SC3 satisfied via context wiring (picker writes → Phase 14 dispatcher reads → live-swap on next filter press; unit-proven; on-device QA out-of-scope for this plan).
- SC5 i18n parity satisfied for all 11 new keys × EN+RU.
- All hard gates stay green (KBD-02, parity, tsc baseline, sentinels).
- Zero out-of-scope edits (no App.tsx, HomeScreen, ProfileScreen, PropertyDetailsScreen edits).
</success_criteria>

<output>
After completion, create `.planning/phases/15-account-settings-restructure-filter-style-picker/15-02-SUMMARY.md` per execute-plan workflow.
</output>

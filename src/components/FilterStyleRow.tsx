/**
 * src/components/FilterStyleRow.tsx
 *
 * Phase 15 Plan 15-02 (SET-02) — expandable filter-style picker shown in the
 * AccountSettings PREFERENCES card, beneath the Language sliding-pill.
 *
 * Collapsed: 38pt SlidersHorizontal chip + title + subtitle + current-style
 * label (right-edge per D-16) + rotating chevron (Animated.timing 180ms per D-05).
 *
 * Expanded: lists all 4 styles via `FILTER_STYLES`. Guided + Cascading are
 * selectable (write via `useFilterStyle().setFilterStyle`); Master + Sentence
 * render with the "Coming soon" pill badge (D-06) + hollow disabled radio,
 * Pressable disabled with `onPress={undefined}` (Stepper.tsx:63 convention).
 *
 * Self-contained per D-03 — reads `useFilterStyle()` directly, NO props.
 * Phase 14's HomeScreen variant dispatcher consumes the same context, so
 * tapping Guided/Cascading here live-swaps the next filter-button press
 * on Home with no app restart (D-07, SC3).
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  Animated,
  Easing,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import {
  ChevronRight,
  SlidersHorizontal,
  ListChecks,
  Layers,
  Columns2,
  Quote,
  Check,
  type LucideIcon,
} from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { useFilterStyle, type FilterStyle } from '../context/FilterStyleContext';
import type { TranslationKeys } from '../locales';

// LayoutAnimation Android-flag — HomeScreen.tsx:22 already wires this app-wide.
// Belt-and-suspenders module-level call documents the dependency for this
// component too (no-op when already enabled).
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

/**
 * The 4 filter styles rendered in the expanded body. Exported (named) so
 * the test file and any future consumer can iterate the same source-of-truth.
 *
 * D-04: Guided + Cascading enabled today (Phase 14 ships both); Master + Sentence
 * are forward-fit (SET-04, Phase B) — rendered with "Coming soon" badge per D-06.
 */
export const FILTER_STYLES: Array<{
  id: FilterStyle;
  labelKey: TranslationKeys;
  descKey: TranslationKeys;
  icon: LucideIcon;
  enabled: boolean;
}> = [
  { id: 'guided', labelKey: 'filters.style.guided', descKey: 'filters.style.guidedDesc', icon: ListChecks, enabled: true },
  { id: 'cascading', labelKey: 'filters.style.cascading', descKey: 'filters.style.cascadingDesc', icon: Layers, enabled: true },
  { id: 'master', labelKey: 'filters.style.master', descKey: 'filters.style.masterDesc', icon: Columns2, enabled: false },
  { id: 'sentence', labelKey: 'filters.style.sentence', descKey: 'filters.style.sentenceDesc', icon: Quote, enabled: false },
];

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

  const handleToggle = () => {
    LayoutAnimation.easeInEaseOut();
    setOpen((prev) => !prev);
  };

  const currentLabelKey = FILTER_STYLES.find((s) => s.id === filterStyle)?.labelKey;

  return (
    <View>
      {/* ─── Collapsed row ─── */}
      <Pressable
        onPress={handleToggle}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityRole="button"
        accessibilityLabel={t('accountSettings.filterPicker.title')}
        accessibilityState={{ expanded: open }}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: 15,
          paddingHorizontal: 16,
          gap: 14,
        }}
      >
        {/* 38pt SlidersHorizontal chip per D-18 */}
        <View
          style={{
            width: 38,
            height: 38,
            borderRadius: 12,
            backgroundColor: colors.surface2,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <SlidersHorizontal size={20} color={colors.iconChipFg} />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600' }}>
            {t('accountSettings.filterPicker.title')}
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 2 }}>
            {t('accountSettings.filterPicker.subtitle')}
          </Text>
        </View>

        {/* Right-edge current-value label per D-16 */}
        {currentLabelKey && (
          <Text style={{ color: colors.textSecondary, fontSize: 14 }}>{t(currentLabelKey)}</Text>
        )}

        <Animated.View style={{ transform: [{ rotateZ }] }}>
          <ChevronRight size={20} color={colors.textSecondary} />
        </Animated.View>
      </Pressable>

      {/* ─── Expanded body ─── */}
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
                <Icon
                  size={20}
                  color={
                    style.enabled
                      ? selected
                        ? colors.accent
                        : colors.textSecondary
                      : colors.textTertiary
                  }
                />
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: style.enabled
                        ? selected
                          ? colors.text
                          : colors.textSecondary
                        : colors.textSecondary,
                      fontSize: 15,
                      fontWeight: '600',
                    }}
                  >
                    {t(style.labelKey)}
                  </Text>
                  <Text style={{ color: colors.textTertiary, fontSize: 12, marginTop: 2 }}>
                    {t(style.descKey)}
                  </Text>
                </View>

                {/* Coming-soon badge — only for disabled rows (D-06) */}
                {!style.enabled && (
                  <View
                    style={{
                      paddingVertical: 3,
                      paddingHorizontal: 8,
                      borderRadius: 999,
                      backgroundColor: colors.surface2,
                    }}
                  >
                    <Text
                      style={{
                        color: colors.textTertiary,
                        fontSize: 10,
                        fontWeight: '700',
                        letterSpacing: 0.6,
                        textTransform: 'uppercase',
                      }}
                    >
                      {t('filters.style.comingSoon')}
                    </Text>
                  </View>
                )}

                {/* Radio per D-17 + §Specifics — 22pt diameter, 1.75 border */}
                {selected && style.enabled ? (
                  <View
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 999,
                      borderWidth: 1.75,
                      borderColor: colors.accent,
                      backgroundColor: colors.accent,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Check size={13} color={colors.onAccent} strokeWidth={2.5} />
                  </View>
                ) : (
                  <View
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 999,
                      borderWidth: 1.75,
                      borderColor: colors.hair2,
                      backgroundColor: 'transparent',
                    }}
                  />
                )}
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
};

export default FilterStyleRow;

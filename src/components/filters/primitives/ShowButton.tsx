/**
 * ShowButton — full-width accent CTA "Show N homes" with shadow + pluralization.
 *
 * Phase 14 Plan 14-01 (FILT-01, FILT-02). Footer affordance for the Guided sheet
 * (acts as dismiss with count preview — per D-04 selections are already live,
 * so the press is a close call, not an apply call).
 *
 * Quick 260601-dqh — added `variant` prop (`'primary' | 'secondary'`, default
 * `'primary'`). Secondary renders as a raised tappable surface (no shadow,
 * `colors.text` label) used as the "stop early" Show in the Guided footer's
 * dual-action layout. The old `#000 / r26 / y12` shadow is replaced by an
 * accent-tied low-spread shadow on the primary branch only — secondary is flat.
 *
 * D-14 contract: ALWAYS enabled — no `disabled` prop, no opacity-disabled state,
 * no `accessibilityState.disabled`. Tapping at count=0 closes the sheet and
 * surfaces HomeScreen's empty-result experience. This applies to BOTH variants.
 *
 * Hex literals justified: '#fff' is text-on-accent contract (primary only).
 */
import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { useTheme } from '../../../theme/ThemeContext';
import { useLanguage } from '../../../context/LanguageContext';

export interface ShowButtonProps {
  count: number;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
}

const ShowButton: React.FC<ShowButtonProps> = ({ count, onPress, variant = 'primary' }) => {
  const { colors } = useTheme();
  const { t } = useLanguage();

  // D-14 always-enabled holds for BOTH variants — no `disabled` prop or
  // accessibilityState.disabled regardless of count or variant. The visual
  // contrast comes from surface vs. accent, not from a disabled state.
  const isSecondary = variant === 'secondary';

  const label =
    count === 1
      ? t('filters.showHomes.one')
      : t('filters.showHomes.many', { count: String(count) });

  return (
    <Pressable
      onPress={onPress}
      hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.button,
        isSecondary
          ? {
              backgroundColor: colors.surface2,
              borderWidth: 1,
              borderColor: colors.border,
              opacity: pressed ? 0.7 : 1,
            }
          : {
              backgroundColor: colors.filterAccent,
              opacity: pressed ? 0.85 : 1,
              // Quick 260601-dqh — accent-tied low-spread shadow on primary only.
              // Replaces the old #000 / 0.4 / r26 / y12 chain that bled a halo
              // under the indigo accent.
              shadowColor: colors.filterAccent,
              shadowOpacity: 0.28,
              shadowOffset: { width: 0, height: 6 },
              shadowRadius: 14,
              elevation: 4,
            },
      ]}
    >
      <Text style={[styles.label, isSecondary && { color: colors.text }]}>
        {label}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    height: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 17,
  },
});

export default ShowButton;

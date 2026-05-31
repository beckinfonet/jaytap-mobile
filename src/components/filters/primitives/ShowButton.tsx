/**
 * ShowButton — full-width accent CTA "Show N homes" with shadow + pluralization.
 *
 * Phase 14 Plan 14-01 (FILT-01, FILT-02). Footer affordance for the Guided sheet
 * (acts as dismiss with count preview — per D-04 selections are already live,
 * so the press is a close call, not an apply call).
 *
 * D-14 contract: ALWAYS enabled — no `disabled` prop, no opacity-disabled state,
 * no `accessibilityState.disabled`. Tapping at count=0 closes the sheet and
 * surfaces HomeScreen's empty-result experience.
 *
 * Hex literals justified: '#fff' is text-on-accent contract; '#000' is the
 * shadow color (RN shadow API requires a hex).
 */
import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { useTheme } from '../../../theme/ThemeContext';
import { useLanguage } from '../../../context/LanguageContext';

export interface ShowButtonProps {
  count: number;
  onPress: () => void;
}

const ShowButton: React.FC<ShowButtonProps> = ({ count, onPress }) => {
  const { colors } = useTheme();
  const { t } = useLanguage();

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
        {
          backgroundColor: colors.accent,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    height: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 26,
    elevation: 8,
  },
  label: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 17,
  },
});

export default ShowButton;

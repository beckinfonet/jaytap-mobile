/**
 * SectionLabel — uppercase letter-spaced section header with optional action slot.
 *
 * Phase 15 Plan 15-01 (SET-01 / D-12). Pure presentational primitive — intentionally
 * project-shared so Phase 16 Profile reskin can consume it for ACTIVITY / HOSTING /
 * MY ACTIVITY / ADMIN TOOLS section labels.
 *
 * Pattern source: MoveIn handoff `profile-shared.jsx:88-95` (typographic spec —
 * fontSize 12, weight 700, letterSpacing 1.1, color = mute). Analog file:
 * `src/components/filters/primitives/CheckSquare.tsx` (smallest pure-visual
 * primitive with `useTheme()` — same shape: read-only, no callbacks, single
 * View+Text render).
 *
 * Theme tokens: `colors.textTertiary` for the label color. No hex literals.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

export interface SectionLabelProps {
  children: string;
  action?: React.ReactNode;
}

const SectionLabel: React.FC<SectionLabelProps> = ({ children, action }) => {
  const { colors } = useTheme();
  return (
    <View style={styles.row}>
      <Text style={[styles.label, { color: colors.textTertiary }]}>{children}</Text>
      {action}
    </View>
  );
};

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

export default SectionLabel;

import React from 'react';
import { Text, StyleSheet, View, ViewStyle } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

/**
 * StatusPill (Phase 2 MOD-07 / D-16)
 *
 * Pure presentational status pill rendered on PropertyCard / OwnerListings list rows.
 * Reads `status ?? 'live'` defensively (D-07 coalesce window) and returns null on
 * 'live' (D-16 — no pill for live listings; live IS the absence of a pill).
 *
 * The pill uses theme tokens only (colors.warning / colors.onWarning / colors.error /
 * colors.textTertiary) — no hardcoded hex except the documented `'#FFFFFF'` for the
 * white-on-error / white-on-archived label per UI-SPEC §"Color" line 91.
 *
 * Mounted by PropertyCard at top-LEFT below the rent/sale type badge per D-19
 * (UI-SPEC.md superseded the original "top-right 8px inset" placement to avoid
 * collision with the existing share + heart actions cluster at top-right).
 */
interface StatusPillProps {
  status?: 'pending' | 'live' | 'rejected' | 'archived';
  /** Optional style override for absolute positioning by the parent (PropertyCard mounts at top-left
   *  below rent/sale badge per D-19). */
  style?: ViewStyle;
}

export const StatusPill: React.FC<StatusPillProps> = ({ status, style }) => {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const effective = status ?? 'live'; // D-07 defensive coalesce
  if (effective === 'live') return null; // D-16: live = no pill

  const config = {
    pending:  { bg: colors.warning,      fg: colors.onWarning, key: 'listings.status.pending' as const },
    rejected: { bg: colors.error,        fg: '#FFFFFF',         key: 'listings.status.rejected' as const },
    archived: { bg: colors.textTertiary, fg: '#FFFFFF',         key: 'listings.status.archived' as const },
  }[effective];

  return (
    <View
      style={[styles.pill, { backgroundColor: config.bg }, style]}
      accessibilityLabel={t(config.key)}
    >
      <Text style={[styles.label, { color: config.fg }]}>{t(config.key)}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  pill: {
    paddingVertical: 4,    // UI-SPEC: pill internal vertical padding
    paddingHorizontal: 8,  // UI-SPEC: pill internal horizontal padding
    borderRadius: 12,      // UI-SPEC: capsule radius
    alignSelf: 'flex-start',
  },
  label: {
    fontSize: 11,          // UI-SPEC: pill label size
    fontWeight: '600',     // UI-SPEC: 2-weights-max contract
    lineHeight: 14,        // UI-SPEC: pill line-height
  },
});

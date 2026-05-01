import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

/**
 * HomeRejectionBanner (Phase 2 MOD-09 / D-14)
 *
 * Whole-banner-tappable red-stripe banner mounted on HomeScreen by Plan 07.
 * Auto-returns null when count <= 0 (D-14 auto-dismiss — when the rejected count
 * naturally drains to zero via owner edit-resubmit, the banner disappears
 * without an explicit dismiss action; this is why there is no X button).
 *
 * Singular vs plural copy is selected by `count`; the {N} interpolation is a
 * literal `.replace('{N}', String(count))` because the project's t() helper
 * does support param interpolation via `params?: Record<string, string>` but
 * the singular path takes no params and we keep the plural path symmetric.
 *
 * Pure presentation — parent owns the count fetch + onPress handler (typically
 * navigation to OwnerListings → "Rejected" tab per D-14).
 */
interface HomeRejectionBannerProps {
  count: number;
  onPress: () => void;
}

export const HomeRejectionBanner: React.FC<HomeRejectionBannerProps> = ({ count, onPress }) => {
  const { colors } = useTheme();
  const { t } = useLanguage();
  if (count <= 0) return null; // D-14 auto-dismiss

  const key = count === 1
    ? 'home.rejection.banner.singular'
    : 'home.rejection.banner.plural';
  const body = (t(key as any) as string).replace('{N}', String(count));

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}
    >
      <View style={[styles.accentBar, { backgroundColor: colors.error }]} />
      <View style={styles.body}>
        <Text style={[styles.text, { color: colors.text }]} numberOfLines={2}>{body}</Text>
      </View>
      <ChevronRight size={18} color={colors.textSecondary} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', paddingRight: 14, borderRadius: 14, borderWidth: 1, overflow: 'hidden', marginBottom: 16 },
  accentBar: { width: 4, alignSelf: 'stretch' },
  body: { flex: 1, padding: 12, paddingHorizontal: 16 },
  text: { fontSize: 14, fontWeight: '600', lineHeight: 20 },
});

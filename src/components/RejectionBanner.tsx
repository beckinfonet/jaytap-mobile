import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { X } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

/**
 * RejectionBanner (Phase 2 MOD-08 / D-13 / D-15)
 *
 * Banner with a vertical accent stripe (colors.error), title, body composed from
 * `reasonCode` + optional `reasonNote`, dismiss X (per-session in-memory only —
 * D-13; parent screen owns the dismissed Set, in-memory only, no persistence), and an
 * "Edit & resubmit" CTA in colors.accent that the parent wires to navigate to
 * CreateListingScreen edit mode (D-15).
 *
 * Mounted on PropertyDetailsScreen by Plan 07. Pure presentation — reads no state,
 * fires no HTTP, does not synthesize moderator identity (MOD-13: moderator identity
 * is never exposed to the owner; the body shows whatever the moderator typed in
 * `reasonNote` verbatim and falls back to the bilingual reasonCode-only template).
 */
interface RejectionBannerProps {
  reasonCode?: string | null;       // Phase-3-supplied; null in Phase 2
  reasonNote?: string | null;       // Free-text from moderator
  onEditResubmit: () => void;       // Parent navigates to CreateListingScreen edit mode (D-15)
  onDismiss: () => void;            // Per-session dismiss (D-13)
}

export const RejectionBanner: React.FC<RejectionBannerProps> = ({
  reasonCode,
  reasonNote,
  onEditResubmit,
  onDismiss,
}) => {
  const { colors } = useTheme();
  const { t } = useLanguage();

  const codeLabel = reasonCode || 'incomplete-info';
  const fallback = (t('listings.rejection.bodyFallback' as any) as string).replace('{reasonCode}', codeLabel);
  const body = reasonNote ? `${codeLabel} — ${reasonNote}` : fallback;

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={[styles.accentBar, { backgroundColor: colors.error }]} />
      <View style={styles.body}>
        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: colors.text }]}>
            {t('listings.rejection.title' as any)}
          </Text>
          <TouchableOpacity
            onPress={onDismiss}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel={t('common.dismiss' as any)}
          >
            <X size={16} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]} numberOfLines={3}>
          {body}
        </Text>
        <TouchableOpacity
          onPress={onEditResubmit}
          activeOpacity={0.85}
          style={[styles.cta, { backgroundColor: colors.accent }]}
        >
          <Text style={styles.ctaText}>{t('listings.rejection.cta' as any)}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 16,
  },
  accentBar: { width: 4, alignSelf: 'stretch' },
  body: { flex: 1, padding: 12, paddingHorizontal: 16 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  title: { fontSize: 14, fontWeight: '600', lineHeight: 20 },
  subtitle: { fontSize: 13, lineHeight: 18, marginBottom: 10 },
  cta: { borderRadius: 12, paddingVertical: 10, paddingHorizontal: 16, alignSelf: 'stretch', alignItems: 'center' },
  ctaText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
});

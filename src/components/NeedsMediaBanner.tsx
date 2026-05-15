// Phase 3 Plan 03-06 — NeedsMediaBanner (mod-only).
//
// Banner with vertical accent stripe (colors.warning) + AlertTriangle icon + title +
// body + "Add photos" CTA. Mounted on PropertyDetailsScreen above the existing mod
// action footer when can('approveListings') && status === 'pending' && photos.length === 0.
// CTA fires `onAddPhotos`, which the parent screen wires to App.tsx's openMediaCuration
// callback (Plan 03-05 declared the callback; Plan 03-06 wires it).
//
// Visual contract mirrors RejectionBanner (accent stripe + title + body + CTA) but with
// the warning palette (colors.warning) and an accent CTA (colors.accent + colors.onAccent).
//
// W6 (revision 2) zero-hex compliance: this component must contain ZERO hex / rgba
// literals. The CTA label `color` is applied INLINE via JSX style array merging
// (`[styles.ctaLabel, { color: colors.onAccent }]`) — NOT in the static StyleSheet —
// because static StyleSheet.create cannot reference runtime theme tokens. The static
// `ctaLabel` block intentionally omits `color:` so the inline token wins.
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { AlertTriangle } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

interface NeedsMediaBannerProps {
  onAddPhotos: () => void;
  /** Nested in PropertyDetailsScreen moderation dock — parent supplies horizontal padding */
  inDock?: boolean;
}

export const NeedsMediaBanner: React.FC<NeedsMediaBannerProps> = ({ onAddPhotos, inDock }) => {
  const { colors } = useTheme();
  const { t } = useLanguage();

  return (
    <View
      style={[
        styles.container,
        inDock && styles.containerInDock,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
      testID="needs-media-banner"
    >
      <View style={[styles.accentStripe, { backgroundColor: colors.warning }]} />
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <AlertTriangle size={16} color={colors.warning} style={styles.icon} />
          <Text style={[styles.title, { color: colors.text }]}>
            {t('moderation.needsMediaBanner.title')}
          </Text>
        </View>
        <Text
          style={[styles.subtitle, { color: colors.textSecondary }]}
          numberOfLines={3}
        >
          {t('moderation.needsMediaBanner.body')}
        </Text>
        <TouchableOpacity
          style={[styles.cta, { backgroundColor: colors.accent }]}
          onPress={onAddPhotos}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={t('moderation.needsMediaBanner.action')}
          testID="needs-media-banner-cta"
        >
          <Text style={[styles.ctaLabel, { color: colors.onAccent }]}>
            {t('moderation.needsMediaBanner.action')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
    marginHorizontal: 16,
    overflow: 'hidden',
  },
  containerInDock: {
    marginHorizontal: 0,
    marginBottom: 0,
  },
  accentStripe: {
    width: 4,
  },
  body: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  icon: {
    marginRight: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 18,
    marginBottom: 10,
  },
  cta: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  // NOTE (W6 strict): no `color:` here — the inline `{ color: colors.onAccent }` wins
  // when this style is composed via JSX array. Keeping color out of the static style
  // is intentional so this file stays at zero hex literals.
  ctaLabel: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
});

export default NeedsMediaBanner;

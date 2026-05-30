/**
 * NeedsMediaBanner — EMPTY-state dropzone for the admin review surface.
 * Spec: docs/superpowers/specs/2026-05-29-admin-review-dock-redesign-design.md § 1
 *
 * Replaces the old amber side-stripe banner. Now renders as a full-width tappable
 * dashed-border dropzone with a lock pill ("Admins only · required"), a soft-accent
 * camera tile, a big title, body copy, and an inset green CTA pill. Both the
 * container AND the CTA pill fire `onAddPhotos` (which the parent wires to
 * MediaCurationScreen navigation).
 *
 * W6 strict: zero hex/rgba in this file. All colors via useTheme(); alpha tints
 * applied inline at the JSX style array (static StyleSheet has no color keys).
 *
 * testIDs preserved from the prior implementation: `needs-media-banner` and
 * `needs-media-banner-cta`. The `inDock` prop is retained for caller backwards
 * compatibility but is now a no-op visual modifier (the dropzone is always
 * full-width with internal padding).
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Camera, Lock, Plus } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

interface NeedsMediaBannerProps {
  onAddPhotos: () => void;
  /** Retained for caller backwards-compat; no-op in the new design. */
  inDock?: boolean;
}

export const NeedsMediaBanner: React.FC<NeedsMediaBannerProps> = ({ onAddPhotos }) => {
  const { colors } = useTheme();
  const { t } = useLanguage();

  return (
    <TouchableOpacity
      testID="needs-media-banner"
      onPress={onAddPhotos}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={t('adminReview.dropzone.title')}
      style={[
        styles.container,
        { borderColor: colors.border, backgroundColor: colors.surface },
      ]}
    >
      <View style={[styles.pill, { backgroundColor: colors.background }]}>
        <Lock size={11} color={colors.textSecondary} />
        <Text style={[styles.pillLabel, { color: colors.textSecondary }]}>
          {t('adminReview.dropzone.pill')}
        </Text>
      </View>
      <View style={[styles.iconTile, { backgroundColor: colors.success }]}>
        <Camera size={26} color={colors.onAccent} />
      </View>
      <Text style={[styles.title, { color: colors.text }]}>
        {t('adminReview.dropzone.title')}
      </Text>
      <Text style={[styles.subtext, { color: colors.textSecondary }]} numberOfLines={3}>
        {t('adminReview.dropzone.subtext')}
      </Text>
      <TouchableOpacity
        testID="needs-media-banner-cta"
        onPress={onAddPhotos}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={t('adminReview.dropzone.cta')}
        style={[styles.cta, { backgroundColor: colors.success }]}
      >
        <Plus size={16} color={colors.onAccent} />
        <Text style={[styles.ctaLabel, { color: colors.onAccent }]}>
          {t('adminReview.dropzone.cta')}
        </Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 16,
    paddingVertical: 26,
    paddingHorizontal: 20,
    borderRadius: 18,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    gap: 12,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 4,
    paddingHorizontal: 9,
    borderRadius: 999,
  },
  pillLabel: {
    fontSize: 10.5,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  iconTile: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 19,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  subtext: {
    fontSize: 12.5,
    lineHeight: 18,
    textAlign: 'center',
    maxWidth: 250,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 11,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginTop: 4,
  },
  ctaLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
});

export default NeedsMediaBanner;

/**
 * AdminPhotoGrid — FILLED-state thumbnail grid for the admin review surface.
 * Spec: docs/superpowers/specs/2026-05-29-admin-review-dock-redesign-design.md § 2
 *
 * Shown only to a mod/admin reviewing a pending listing that has 1+ photos.
 * First thumbnail carries the COVER badge (slot 0 = cover, MediaCurationScreen's
 * invariant). Tapping any thumbnail OR "+ Add more" navigates to MediaCurationScreen
 * for reorder/curation.
 *
 * Zero-hex rule: all colors come from useTheme(); static StyleSheet has no `color:`
 * or `backgroundColor:` keys.
 */
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { Check, Camera } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';

export interface AdminPhotoGridPhoto {
  uri: string;
  key?: string;
}

export interface AdminPhotoGridProps {
  photos: AdminPhotoGridPhoto[];
  /** Fires when any thumbnail cell is tapped. Today wired to MediaCurationScreen
   *  for reorder/cover-photo edits; could diverge later to e.g. browse-mode. */
  onOpenCuration: () => void;
  /** Fires when the "+ Add more" header link is tapped. Today also wired to
   *  MediaCurationScreen; the split is intentional so a future change could
   *  route this directly to the upload picker without re-entering curation. */
  onAddMore: () => void;
}

// Small wrapper that swaps a broken CDN image for a muted camera tile.
// Per-cell state is the simplest correct approach — an Image whose `onError`
// fires sets `failed=true`, which renders the fallback view in-place.
interface CellImageProps { uri: string }
const CellImage: React.FC<CellImageProps> = ({ uri }) => {
  const { colors } = useTheme();
  const [failed, setFailed] = useState(false);
  if (failed || !uri) {
    return (
      <View
        testID="admin-photo-grid-cell-fallback"
        style={[styles.cellImage, styles.cellFallback, { backgroundColor: colors.surface }]}
      >
        <Camera size={20} color={colors.textTertiary} />
      </View>
    );
  }
  return (
    <Image
      source={{ uri }}
      style={styles.cellImage}
      resizeMode="cover"
      onError={() => setFailed(true)}
    />
  );
};

export const AdminPhotoGrid: React.FC<AdminPhotoGridProps> = ({
  photos,
  onOpenCuration,
  onAddMore,
}) => {
  const { colors } = useTheme();
  const { t } = useLanguage();

  if (!photos || photos.length === 0) return null;

  return (
    <View style={styles.container} testID="admin-photo-grid">
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Check size={15} color={colors.success} />
          <Text style={[styles.countLabel, { color: colors.text }]} numberOfLines={1}>
            {t('adminReview.grid.countLabel', { n: String(photos.length) })}
          </Text>
        </View>
        <TouchableOpacity
          testID="admin-photo-grid-add-more"
          onPress={onAddMore}
          accessibilityRole="button"
          accessibilityLabel={t('adminReview.grid.addMore')}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={[styles.addMore, { color: colors.success }]}>
            {t('adminReview.grid.addMore')}
          </Text>
        </TouchableOpacity>
      </View>
      <View style={styles.grid}>
        {photos.map((photo, idx) => (
          <TouchableOpacity
            key={photo.key ?? `cell-${idx}`}
            testID="admin-photo-grid-cell"
            style={[styles.cell, { borderColor: colors.border }]}
            onPress={onOpenCuration}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={
              idx === 0
                ? t('adminReview.grid.coverBadge')
                : `${idx + 1}`
            }
          >
            <CellImage uri={photo.uri} />
            {idx === 0 ? (
              <View
                testID="cover-badge"
                style={[styles.coverBadge, { backgroundColor: colors.success }]}
              >
                <Text style={[styles.coverBadgeText, { color: colors.onAccent }]}>
                  {t('adminReview.grid.coverBadge')}
                </Text>
              </View>
            ) : null}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  countLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  addMore: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  cell: {
    width: '32%',
    aspectRatio: 1,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  cellImage: {
    width: '100%',
    height: '100%',
  },
  cellFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  coverBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
});

export default AdminPhotoGrid;

/**
 * HospitalityCard — Tour-first, price-free Hostel/Hotel card variant.
 *
 * Phase 6 (HOSP-03 / D-07..D-12): separate file from PropertyCard (D-07
 * locks "no variant prop"; Pitfall 7 in 06-RESEARCH.md). Mirrors
 * PropertyCard chrome (image wrapper, share/heart actions, owner
 * edit/delete chrome) but replaces the body:
 *   - hero image source order: tour thumbnail → imageUrl → images[0] → placeholder (D-08)
 *   - top-left type badge: "Hostel" / "Hotel" (D-09)
 *   - bottom-LEFT 3D Tour badge — only when tours.length > 0 (D-08)
 *   - body row: "{rooms} rooms · {maxGuests} max guests" (D-10) — no meta table, no price formatter
 *   - amenity preview: first 3 chips with lucide icon prefix + "+N more" overflow chip (D-10)
 *   - share message: omits the formatted-price line (D-11)
 *   - owner-context chrome: only when showEditButton={true} — caller decides (Pitfall 1)
 *
 * Convention: matches src/components/PropertyCard.tsx outer structure;
 * named export, no default. Card width 280pt for horizontal-strip use
 * by HospitalitySection.
 */
import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Share,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Heart, Pencil, Trash2, Archive, ArchiveRestore } from 'lucide-react-native';
import type { Property } from '../types/Property';
import { getPropertyShareUrl } from '../constants';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import type { TranslationKeys } from '../locales';
import { AMENITY_ICONS, type HospitalityAmenity } from '../utils/hospitalityAmenities';
import { formatAddress } from '../utils/formatAddress';

interface HospitalityCardProps {
  property: Property;
  onPress: (property: Property) => void;
  onViewTour: (property: Property) => void;
  onFavorite?: (property: Property) => void;
  isFavorited?: boolean;
  isLoading?: boolean;
  onEdit?: (property: Property) => void;
  onDelete?: (property: Property) => void;
  onArchive?: (property: Property) => void;
  onUnarchive?: (property: Property) => void;
  showEditButton?: boolean;
}

export const HospitalityCard: React.FC<HospitalityCardProps> = ({
  property,
  onPress,
  onViewTour: _onViewTour,
  onFavorite,
  isFavorited = false,
  isLoading = false,
  onEdit,
  onDelete,
  onArchive,
  onUnarchive,
  showEditButton = false,
}) => {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();

  // Phase 2 D-20 nested-shape derivations (Phase 1 D-04..D-15).
  // D-21 PRESERVED: top-level maxGuests + amenities reads stay verbatim.
  const title = property.content?.title ?? '';
  const cityLabel = property.location?.city ?? '';
  const districtLabel = property.location?.district ?? '';
  const addressDisplay = [districtLabel, cityLabel].filter(Boolean).join(', ');

  // Hero source order (D-08): media.photos[0] (Phase 1 D-12 first-photo wins flatten)
  // — tour thumbnail flattened to media.tourUrl is just a URL string, not a thumbnail
  // image, so the hero image source order collapses to the photos array.
  const heroUri =
    (property.media?.photos && property.media.photos.length > 0
      ? property.media.photos[0]
      : 'https://via.placeholder.com/400');

  // Bottom-left 3D Tour badge — only when media.tourUrl exists (Phase 1 D-12 first-tour-wins flatten).
  const hasTour = !!property.media?.tourUrl;

  // D-09: type badge label. M3 propertyType enum is lowercase ('hotel'|'hostel') —
  // case-insensitive comparison covers both M3 and any latent M2 'Hostel'/'Hotel' rows.
  const ptype = (property.propertyType ?? '').toString().toLowerCase();
  const typeBadgeLabel =
    ptype === 'hostel'
      ? t('hospitality.badge.hostel')
      : t('hospitality.badge.hotel');

  // D-21 / Phase 1 D-12: hotelClass moved under basics. Surfaced as an optional
  // suffix on the type badge (no UI before — additive read).
  const hotelClass = property.basics?.hotelClass;

  // D-10 / D-21 PRESERVED: amenity preview reads top-level property.amenities verbatim
  // (Phase 1 D-09 — top-level retained).
  const amenities = (property.amenities ?? []) as HospitalityAmenity[];
  const previewAmenities = amenities.slice(0, 3);
  const overflowCount = Math.max(0, amenities.length - 3);

  // D-11: share message omits the price line (no price formatter invocation)
  const handleShare = async (e: any) => {
    e.stopPropagation();
    const propertyId = property.id || property.listingId || '';
    const shareUrl = getPropertyShareUrl(propertyId);
    const shareMessage = `${title}\n${addressDisplay}\n\n${shareUrl}`;
    try {
      await Share.share({
        message: shareMessage,
        url: shareUrl,
        title,
      });
    } catch (error: any) {
      console.error('Error sharing:', error?.message);
    }
  };

  return (
    <View style={[styles.cardContainer, { backgroundColor: colors.surface }]}>
      <TouchableOpacity activeOpacity={0.95} onPress={() => onPress(property)}>
        {/* Hero image + overlays */}
        <View style={styles.imageWrapper}>
          <Image source={{ uri: heroUri }} style={styles.image} resizeMode="cover" />

          {/* D-09: top-left type badge. hotelClass appended when present (basics.hotelClass). */}
          <View style={styles.topBadges}>
            <View style={[styles.typeBadge, { backgroundColor: colors.surface }]}>
              <Text
                style={[styles.typeBadgeText, { color: colors.text }]}
                numberOfLines={1}
              >
                {hotelClass ? `${typeBadgeLabel} · ${hotelClass}` : typeBadgeLabel}
              </Text>
            </View>
          </View>

          {/* Top-right share + heart actions (verbatim PropertyCard chrome) */}
          <View style={styles.topRightActions}>
            <TouchableOpacity
              style={[styles.shareButton, { backgroundColor: 'rgba(255,255,255,0.9)' }]}
              onPress={handleShare}
              activeOpacity={0.8}
            >
              <Text style={{ fontSize: 18, color: '#333' }}>↗</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.heartButton, { backgroundColor: 'rgba(255,255,255,0.9)' }]}
              onPress={(e) => {
                e.stopPropagation();
                if (onFavorite && !isLoading) {
                  onFavorite(property);
                }
              }}
              activeOpacity={0.8}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color={isFavorited ? '#E91E63' : '#999'} />
              ) : (
                <Heart
                  size={18}
                  color={isFavorited ? '#E91E63' : '#999'}
                  fill={isFavorited ? '#E91E63' : 'transparent'}
                />
              )}
            </TouchableOpacity>
          </View>

          {/* D-08: bottom-LEFT 3D Tour badge — Phase 1 D-12 flattened tours[] → media.tourUrl
              (single tour). Multi-tour M2 listings reduced to 1; pluralization removed. */}
          {hasTour && (
            <View style={styles.bottomBadges}>
              <View style={[styles.mediaBadge, styles.tour3DBadge]}>
                <Text style={styles.tour3DBadgeText}>3D Tour</Text>
              </View>
            </View>
          )}
        </View>

        {/* Body */}
        <View style={styles.contentContainer}>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
            {title}
          </Text>
          {(() => {
            const formatted = formatAddress(addressDisplay);
            return (
              <>
                <Text style={[styles.address, { color: colors.textSecondary }]} numberOfLines={1} ellipsizeMode="tail">
                  {formatted.line1}
                </Text>
                {formatted.line2 ? (
                  <Text style={[styles.address, { color: colors.textSecondary }]} numberOfLines={1} ellipsizeMode="tail">
                    {formatted.line2}
                  </Text>
                ) : null}
              </>
            );
          })()}

          {/* D-10: rooms + maxGuests meta — no price formatter, no beds/baths/sqft meta table.
              hotelRooms (basics.hotelRooms) takes precedence for hotel/hostel; falls back to
              generic basics.rooms. maxGuests stays TOP-LEVEL per D-21 (Phase 1 D-09 preserved). */}
          <Text style={[styles.meta, { color: colors.textSecondary }]} numberOfLines={1}>
            {(property.basics?.hotelRooms ?? property.basics?.rooms ?? '-')} {t('hospitality.rooms')} · {property.maxGuests ?? 0}{' '}
            {t('hospitality.maxGuests')}
          </Text>

          {/* D-10: amenity preview chips — first 3 + +N more overflow */}
          {amenities.length > 0 && (
            <View style={styles.amenityPreviewRow}>
              {previewAmenities.map((token) => {
                const Icon = AMENITY_ICONS[token];
                return (
                  <View
                    key={token}
                    style={[
                      styles.amenityPreviewChip,
                      { backgroundColor: colors.chipBackground },
                    ]}
                  >
                    <Icon size={12} color={colors.textSecondary} />
                    <Text
                      style={[styles.amenityPreviewText, { color: colors.text }]}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {t(`amenity.${token}` as TranslationKeys)}
                    </Text>
                  </View>
                );
              })}
              {overflowCount > 0 && (
                <View
                  style={[
                    styles.amenityPreviewChip,
                    { backgroundColor: colors.chipBackground },
                  ]}
                >
                  <Text
                    style={[styles.amenityPreviewText, { color: colors.text }]}
                    numberOfLines={1}
                  >
                    {t('hospitality.amenitiesMore', { count: String(overflowCount) })}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Owner-context chrome — caller decides via showEditButton (Pitfall 1: no inline role check) */}
          {showEditButton && (onEdit || onDelete || onArchive || onUnarchive) && (() => {
            const status = property.status;
            const isArchived = status === 'archived';
            const canArchive = !isArchived; // live, legacy, pending, or rejected
            return (
              <View style={styles.ownerActionsRow}>
                {onEdit && (
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel={t('common.edit')}
                    style={[
                      styles.listingActionBtnIcon,
                      styles.listingActionBtnEdit,
                      {
                        backgroundColor: colors.surface,
                        borderColor: colors.border,
                      },
                    ]}
                    onPress={() => onEdit(property)}
                    activeOpacity={0.75}
                  >
                    <Pencil size={19} color={isDark ? '#111827' : colors.text} strokeWidth={2} />
                  </TouchableOpacity>
                )}
                {canArchive && onArchive && (
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel={t('property.archive')}
                    style={[styles.listingActionBtnIcon, styles.listingActionBtnArchive]}
                    onPress={() => onArchive(property)}
                    activeOpacity={0.8}
                  >
                    <Archive size={19} color="#FFFFFF" strokeWidth={2} />
                  </TouchableOpacity>
                )}
                {isArchived && onUnarchive && (
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel={t('property.unarchive')}
                    style={[styles.listingActionBtnIcon, styles.listingActionBtnUnarchive]}
                    onPress={() => onUnarchive(property)}
                    activeOpacity={0.8}
                  >
                    <ArchiveRestore size={19} color="#FFFFFF" strokeWidth={2} />
                  </TouchableOpacity>
                )}
                {isArchived && onDelete && (
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel={t('common.delete')}
                    style={[styles.listingActionBtnIcon, styles.listingActionBtnDelete]}
                    onPress={() => onDelete(property)}
                    activeOpacity={0.8}
                  >
                    <Trash2 size={19} color="#FFFFFF" strokeWidth={2} />
                  </TouchableOpacity>
                )}
              </View>
            );
          })()}
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  // Card outer — width 280pt for horizontal strip; marginHorizontal 0 (strip handles spacing)
  cardContainer: {
    width: 280,
    borderRadius: 24,
    marginVertical: 12,
    marginHorizontal: 0,
    overflow: 'hidden',
  },
  imageWrapper: {
    height: 200, // OVERRIDE PropertyCard's 250 per UI-SPEC §Spacing
    borderRadius: 24,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  // D-09: type badge top-left (replaces PropertyCard's statusBadge)
  topBadges: {
    position: 'absolute',
    top: 16,
    left: 16,
    flexDirection: 'row',
    gap: 8,
  },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  // Top-right actions (verbatim PropertyCard)
  topRightActions: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'row',
    gap: 8,
  },
  shareButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heartButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // D-08: bottom-LEFT (NOT right) — UI-SPEC §HospitalityCard slot table
  bottomBadges: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    flexDirection: 'row',
    gap: 8,
  },
  mediaBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tour3DBadge: {
    backgroundColor: '#6C63FF', // Path B grandfathered (PropertyCard.tsx:301 precedent)
  },
  tour3DBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  contentContainer: {
    paddingTop: 16,
    paddingBottom: 20,
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 18,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  address: {
    fontSize: 14,
    marginTop: 4,
  },
  // D-10: rooms + maxGuests meta row
  meta: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 8,
  },
  // D-10: amenity preview chip row
  amenityPreviewRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  amenityPreviewChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  amenityPreviewText: {
    fontSize: 11,
    fontWeight: '500',
  },
  // Owner-context chrome (only when showEditButton={true})
  ownerActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  listingActionBtnIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listingActionBtnEdit: {
    borderWidth: 1,
  },
  listingActionBtnDelete: {
    backgroundColor: '#E53935',
  },
  listingActionBtnArchive: {
    backgroundColor: '#D97706',
  },
  listingActionBtnUnarchive: {
    backgroundColor: '#059669',
  },
});

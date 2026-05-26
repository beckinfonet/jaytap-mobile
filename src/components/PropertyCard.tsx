import React, { useRef } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Share,
  ActivityIndicator,
} from 'react-native';
import {
  Heart,
  Bed,
  Bath,
  Pencil,
  Trash2,
  Archive,
  ArchiveRestore,
  MapPin,
  Box,
  Calendar,
} from 'lucide-react-native';
import { Property } from '../types/Property';
import { getPropertyShareUrl } from '../constants';
import { formatPrice } from '../utils/formatPrice';
import { availabilityValueFromRaw } from '../utils/availability';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { StatusPill } from './StatusPill';

interface PropertyCardProps {
  property: Property;
  onPress: (property: Property) => void;
  onViewTour: (property: Property) => void;
  onViewVideo: (property: Property) => void;
  onEdit?: (property: Property) => void; // Optional edit handler
  showEditButton?: boolean; // Show edit button instead of Contact Agent
  onDelete?: (property: Property) => void; // Optional delete handler (intent dispatched by parent based on status)
  onArchive?: (property: Property) => void; // Optional archive handler (soft-delete for live listings)
  onUnarchive?: (property: Property) => void; // Optional unarchive handler (restore archived → draft)
  onShare?: (property: Property) => void; // Optional share handler
  onFavorite?: (property: Property) => void; // Optional favorite handler
  isFavorited?: boolean; // Whether this property is favorited
  isLoading?: boolean; // Whether favorite is being toggled
  /** Parent renders actions below the card (e.g. moderation queue) — flush margins + square bottom corners. */
  groupWithFooter?: boolean;
}

export const PropertyCard: React.FC<PropertyCardProps> = ({
  property,
  onPress,
  onViewTour,
  onEdit,
  showEditButton = false,
  onDelete,
  onArchive,
  onUnarchive,
  onFavorite,
  isFavorited = false,
  isLoading = false,
  groupWithFooter = false,
}) => {
  const { colors, isDark } = useTheme();
  useAuth(); // preserved subscription — auth surface keeps card in sync with sign-in toggles
  const { t, language } = useLanguage();

  // Phase 2 D-20 nested-shape derivations (Phase 1 D-04..D-15)
  const title = property.content?.title ?? '';
  const heroPhoto = property.media?.photos?.[0];
  const cityLabel = property.location?.city ?? '';
  const districtLabel = property.location?.district ?? '';
  const addressDisplay = [districtLabel, cityLabel].filter(Boolean).join(' · ');
  // Tradeoff §K: hospitality strip uses dealType !== 'sale'; PropertyCard's M2 status
  // badge maps the sale/rent split via the same rule so it renders correctly on M3 data.
  const isSale = property.dealType === 'sale';

  // Quick task 260526-ebl derivations
  const hasTour = !!property.media?.tourUrl; // canonical M3 predicate (HospitalityCard:86, HomeScreen:238)
  const areaSqm = property.basics?.areaSqm;
  const hasArea = typeof areaSqm === 'number' && areaSqm > 0;
  const bedrooms = property.basics?.bedrooms;
  const hasBeds =
    !(property.propertyType === 'office' || property.propertyType === 'commercial') &&
    typeof bedrooms === 'number' &&
    bedrooms > 0;
  const bathroomCount = property.basics?.bathroomCount;
  const hasBath = typeof bathroomCount === 'number' && bathroomCount > 0;
  const status = property.status ?? 'live'; // D-07 defensive coalesce (matches StatusPill)
  const isLive = status === 'live';
  const liveBadgeKey = isSale ? 'property.statusBadge.live.sale' : 'property.statusBadge.live.rent';

  // Quick task 260526-foc QA — availability row. `availabilityValueFromRaw` returns
  // null when the date is blank/unparseable (row hidden), "Now"/"Сейчас" when within
  // 30 days, or a locale-formatted date otherwise.
  const availValue = availabilityValueFromRaw(
    property.availableDate,
    t('property.now'),
    language === 'ru' ? 'ru-RU' : 'en-US',
  );

  // Swallows the outer-card onPress that iOS fires when the user taps OUTSIDE
  // the share sheet to dismiss it — that dismiss tap lands on the card and
  // navigates to details. `e.stopPropagation()` doesn't cover it because the
  // native modal interrupts the responder chain.
  const cardPressBlockedRef = useRef(false);

  const handleShare = async (e: any) => {
    e.stopPropagation();
    cardPressBlockedRef.current = true;

    const propertyId = property.id || property.listingId || '';
    const shareUrl = getPropertyShareUrl(propertyId);
    const priceText = formatPrice(property, t('property.perMonth'));
    const shareMessage = `${title}\n${addressDisplay}\n${priceText}\n\n${shareUrl}`;

    try {
      await Share.share({
        message: shareMessage,
        url: shareUrl,
        title,
      });
    } catch (error: any) {
      console.error('Error sharing:', error.message);
    } finally {
      setTimeout(() => {
        cardPressBlockedRef.current = false;
      }, 500);
    }
  };

  const handleCardPress = () => {
    if (cardPressBlockedRef.current) return;
    onPress(property);
  };

  return (
    <View
      style={[
        styles.cardContainer,
        groupWithFooter && styles.cardContainerGroupedFooter,
        { backgroundColor: colors.surface },
      ]}
    >
      <TouchableOpacity activeOpacity={0.95} onPress={handleCardPress}>
        {/* Image Section */}
        <View style={[styles.imageWrapper, groupWithFooter && styles.imageWrapperGroupedFooter]}>
          <Image
            source={{ uri: heroPhoto || 'https://via.placeholder.com/400' }}
            style={styles.image}
            resizeMode="cover"
          />

          {/* Top-left: dark sale/rent pill with red leading dot + non-live StatusPill (preserved) */}
          <View style={styles.topBadges}>
            <View style={styles.dealTypePill}>
              <View style={styles.dealTypeDot} />
              <Text style={styles.dealTypeLabel}>
                {isSale ? t('property.forSale') : t('property.forRent')}
              </Text>
            </View>
            {/* D-19: status pill stacked below rent/sale badge (top-left) — pending/rejected/archived only.
                StatusPill returns null for 'live', so the live-only deal-type badge in row 1 below is the
                replacement for that case (live = no overlay pill, plus deal-type badge below image). */}
            {!isLive && <StatusPill status={property.status} style={{ marginTop: 6 }} />}
          </View>

          {/* Top-right: dark translucent share + favorite buttons */}
          <View style={styles.topRightActions}>
            <TouchableOpacity
              style={styles.darkOverlayButton}
              onPress={handleShare}
              activeOpacity={0.8}
            >
              <Text style={styles.shareGlyph}>↗</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.darkOverlayButton}
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
                <ActivityIndicator size="small" color={isFavorited ? '#E91E63' : '#FFFFFF'} />
              ) : (
                <Heart
                  size={18}
                  color={isFavorited ? '#E91E63' : '#FFFFFF'}
                  fill={isFavorited ? '#E91E63' : 'transparent'}
                />
              )}
            </TouchableOpacity>
          </View>

          {/* Floating price + stats overlay (260526-ebl) */}
          <View style={styles.priceOverlay}>
            <View style={styles.priceOverlayLeft}>
              <Text style={styles.priceOverlayEyebrow} numberOfLines={1}>
                {t('property.price')}
              </Text>
              <Text style={styles.priceOverlayValue} numberOfLines={1}>
                {formatPrice(property, t('property.perMonth'))}
              </Text>
            </View>
            <View style={styles.priceOverlayStats}>
              {hasBeds && (
                <View style={styles.priceOverlayStatCell}>
                  <Bed size={14} color="#FFFFFF" strokeWidth={2} />
                  <Text style={styles.priceOverlayStatValue}>{bedrooms}</Text>
                </View>
              )}
              {hasBath && (
                <View style={styles.priceOverlayStatCell}>
                  <Bath size={14} color="#FFFFFF" strokeWidth={2} />
                  <Text style={styles.priceOverlayStatValue}>{bathroomCount}</Text>
                </View>
              )}
              {hasArea && (
                <View style={styles.priceOverlayStatCell}>
                  <Text style={styles.priceOverlayStatValue}>{areaSqm}</Text>
                  <Text style={styles.priceOverlayStatUnit}>m²</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Below-image content region */}
        <View style={styles.contentContainer}>
          {/* Row 1: #<listingId> + live deal-type badge (left) | 3D-tour pill (right, conditional) */}
          <View style={styles.metaRow}>
            <View style={styles.metaRowLeft}>
              {property.listingId ? (
                <Text style={[styles.listingIdText, { color: colors.text }]} numberOfLines={1}>
                  #{property.listingId}
                </Text>
              ) : null}
              {isLive && (
                <View
                  style={[
                    styles.liveBadge,
                    { backgroundColor: colors.chipBackground, borderColor: colors.chipBorder },
                  ]}
                >
                  <View style={styles.liveBadgeDot} />
                  <Text style={[styles.liveBadgeLabel, { color: colors.text }]} numberOfLines={1}>
                    {t(liveBadgeKey as any)}
                  </Text>
                </View>
              )}
            </View>
            {hasTour && (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={t('property.tourPill' as any)}
                onPress={(e) => {
                  e.stopPropagation();
                  onViewTour(property);
                }}
                style={[styles.tourPill, { borderColor: colors.error }]}
                activeOpacity={0.75}
              >
                <Box size={13} color={colors.error} strokeWidth={2} />
                <Text style={[styles.tourPillLabel, { color: colors.error }]}>
                  {t('property.tourPill' as any)}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Row 2: serif title */}
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
            {title}
          </Text>

          {/* Row 3: MapPin + district · city */}
          {(districtLabel || cityLabel) ? (
            <View style={styles.locationRow}>
              <MapPin size={14} color={colors.accent} strokeWidth={2.25} />
              <Text
                style={[styles.locationText, { color: colors.textSecondary }]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {[districtLabel, cityLabel].filter(Boolean).join(' · ')}
              </Text>
            </View>
          ) : null}

          {/* Row 4: Calendar + availability (260526-foc QA). Hidden when availableDate is blank. */}
          {availValue ? (
            <View style={styles.availabilityRow}>
              <Calendar size={14} color={colors.textSecondary} strokeWidth={2} />
              <Text
                style={[styles.availabilityText, { color: colors.textSecondary }]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {t('property.available')} {availValue}
              </Text>
            </View>
          ) : null}

          {/* Owner-actions row (preserved): only when showEditButton — HomeScreen does NOT pass this prop */}
          {showEditButton && (() => {
            // Status-driven owner actions:
            //   live / pending / rejected (or legacy untyped) → Edit + Archive
            //   archived                                      → Edit + Unarchive + Delete (permanent)
            const isArchived = property.status === 'archived';
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
                        backgroundColor: isDark ? '#F3F4F6' : colors.inputBackground,
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
  cardContainer: {
    borderRadius: 24,
    marginVertical: 12,
    marginHorizontal: 20,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  cardContainerGroupedFooter: {
    marginHorizontal: 0,
    marginVertical: 0,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  imageWrapper: {
    height: 280, // Taller image — overlay sits inside the hero photo per mockup
    width: '100%',
    position: 'relative',
    borderRadius: 24,
    overflow: 'hidden',
  },
  imageWrapperGroupedFooter: {
    borderRadius: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  topBadges: {
    position: 'absolute',
    top: 16,
    left: 16,
  },
  // Dark deal-type pill with red leading dot (260526-ebl)
  dealTypePill: {
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  dealTypeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EF4444', // Tailwind red-500
    marginRight: 6,
  },
  dealTypeLabel: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  topRightActions: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'row',
    gap: 8,
  },
  darkOverlayButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  shareGlyph: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  // Floating price + stats overlay (260526-ebl)
  priceOverlay: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  priceOverlayLeft: {
    flexShrink: 1,
    marginRight: 12,
  },
  priceOverlayEyebrow: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1,
    opacity: 0.7,
    textTransform: 'uppercase',
  },
  priceOverlayValue: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '500',
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif' }),
    marginTop: 2,
  },
  priceOverlayStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flexShrink: 0,
  },
  priceOverlayStatCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  priceOverlayStatValue: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  priceOverlayStatUnit: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '500',
    opacity: 0.85,
  },
  // Below-image content region (260526-ebl)
  contentContainer: {
    paddingTop: 16,
    paddingBottom: 20,
    paddingHorizontal: 16,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  metaRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
  },
  listingIdText: {
    fontSize: 13,
    fontWeight: '600',
  },
  liveBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
  },
  liveBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22C55E', // emerald-500 — matches ListingMetaTable.availDot
  },
  liveBadgeLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  tourPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    backgroundColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  tourPillLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 22,
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif' }),
    fontWeight: '400',
    marginBottom: 6,
    lineHeight: 26,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  locationText: {
    fontSize: 14,
    flexShrink: 1,
  },
  availabilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  availabilityText: {
    fontSize: 13,
    flexShrink: 1,
  },
  ownerActionsRow: {
    marginTop: 14,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 10,
  },
  listingActionBtnIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listingActionBtnEdit: {
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 2,
      },
      android: { elevation: 1 },
    }),
  },
  listingActionBtnDelete: {
    backgroundColor: '#DC2626',
    ...Platform.select({
      ios: {
        shadowColor: '#DC2626',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.35,
        shadowRadius: 4,
      },
      android: { elevation: 3 },
    }),
  },
  listingActionBtnArchive: {
    backgroundColor: '#D97706', // amber — soft-delete signal, distinct from destructive red
    ...Platform.select({
      ios: {
        shadowColor: '#D97706',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: { elevation: 3 },
    }),
  },
  listingActionBtnUnarchive: {
    backgroundColor: '#059669', // emerald — restorative action
    ...Platform.select({
      ios: {
        shadowColor: '#059669',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: { elevation: 3 },
    }),
  },
});

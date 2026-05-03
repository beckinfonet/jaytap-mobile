import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Platform,
  Share,
  ActivityIndicator,
} from 'react-native';
import { Heart, Bed, Bath, Pencil, Trash2, Archive, ArchiveRestore } from 'lucide-react-native';
import { Property } from '../types/Property';
import { getPropertyShareUrl } from '../constants';
import { formatPrice } from '../utils/formatPrice';
import { formatAddress } from '../utils/formatAddress';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { ListingMetaTable } from './ListingMetaTable';
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

const { width } = Dimensions.get('window');

export const PropertyCard: React.FC<PropertyCardProps> = ({
  property,
  onPress,
  onViewTour,
  onViewVideo,
  onEdit,
  showEditButton = false,
  onDelete,
  onArchive,
  onUnarchive,
  onShare,
  onFavorite,
  isFavorited = false,
  isLoading = false,
  groupWithFooter = false,
}) => {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const { t } = useLanguage();

  const handleShare = async (e: any) => {
    e.stopPropagation(); // Prevent card press

    // Generate shareable URL
    const propertyId = property.id || property.listingId || '';
    const shareUrl = getPropertyShareUrl(propertyId);

    // Create share message
    const priceText = formatPrice(property, t('property.perMonth'));
    const shareMessage = `${property.title}\n${property.address}\n${priceText}\n\n${shareUrl}`;

    try {
      const result = await Share.share({
        message: shareMessage,
        url: shareUrl, // iOS will use this for universal links
        title: property.title,
      });

      if (result.action === Share.sharedAction) {
        if (result.activityType) {
          // Shared with activity type
        } 
      }
    } catch (error: any) {
      console.error('Error sharing:', error.message);
    }
  };
  return (
    <View
      style={[
        styles.cardContainer,
        groupWithFooter && styles.cardContainerGroupedFooter,
        { backgroundColor: colors.surface },
      ]}
    >
      <TouchableOpacity activeOpacity={0.95} onPress={() => onPress(property)}>
        {/* Image Section */}
        <View style={[styles.imageWrapper, groupWithFooter && styles.imageWrapperGroupedFooter]}>
          <Image
            source={{ uri: property.imageUrl || (property.images && property.images.length > 0 ? property.images[0] : 'https://via.placeholder.com/400') }}
            style={styles.image}
            resizeMode="cover"
          />

          <View style={styles.topBadges}>
            <View style={[styles.badge, styles.statusBadge]}>
              <Text style={styles.statusText}>
                {property.type === 'rent' ? t('property.forRent') : t('property.forSale')}
              </Text>
            </View>
            {/* D-19: status pill stacked below rent/sale badge (top-left), avoids collision with top-right share+heart actions */}
            {(property.status ?? 'live') !== 'live' && (
              <StatusPill status={property.status} style={{ marginTop: 6 }} />
            )}
          </View>

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

          {/* <View style={styles.bottomBadges}>
            {property.is3DTourAvailable && property.tours && property.tours.length > 0 && (
              <View style={[styles.mediaBadge, styles.tour3DBadge]}>
                <Text style={styles.tour3DBadgeText}>
                  {property.tours.length > 1 ? '3D Tours' : '3D Tour'}
                </Text>
              </View>
            )}
            {property.videoUrl && (
              <View style={[styles.mediaBadge, { backgroundColor: 'rgba(0, 0, 0, 0.6)' }]}>
                <Text style={[styles.mediaBadgeText, { color: '#FFF' }]}>🎥</Text>
              </View>
            )}
          </View> */}
        </View>

        {/* Content Section */}
        <View style={styles.contentContainer}>
          <View style={styles.mainInfo}>
            <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
              {property.title} • {property.address.split(',')[1]?.trim() || 'Bishkek'}
            </Text>
            <ListingMetaTable
              listingId={property.listingId}
              availableDate={(property as any).availableDate}
              compact
            />
            {(() => {
              const formatted = formatAddress(property.address);
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
          </View>

          <View style={styles.footerRow}>
            <Text
              style={[styles.price, { color: colors.text, flex: 1, flexShrink: 1, marginRight: 12 }]}
              numberOfLines={1}
            >
              {formatPrice(property, t('property.perMonth'))}
            </Text>

            {showEditButton ? (
              (() => {
                // Status-driven owner actions:
                //   live / pending / rejected (or legacy untyped) → Edit + Archive
                //   archived                                      → Edit + Unarchive + Delete (permanent)
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
              })()
            ) : (
              <View style={[styles.specsContainer, { backgroundColor: colors.chipBackground, borderColor: colors.chipBorder }]}>
                <View style={styles.specItem}>
                  <Bed size={16} color={colors.textSecondary} strokeWidth={2} />
                  <Text style={[styles.specValue, { color: colors.text }]}>{property.specs?.beds ?? 0}</Text>
                </View>
                <View style={[styles.specDivider, { backgroundColor: colors.border }]} />
                <View style={styles.specItem}>
                  <Bath size={16} color={colors.textSecondary} strokeWidth={2} />
                  <Text style={[styles.specValue, { color: colors.text }]}>{property.specs?.baths ?? 0}</Text>
                </View>
              </View>
            )}
          </View>
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
    height: 250, // Taller image as per mockup
    width: '100%',
    position: 'relative',
    borderRadius: 24, // Rounded image
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
  badge: {
    // Basic badge style, if needed
  },
  statusBadge: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#333',
    letterSpacing: 0.5,
  },
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
  bottomBadges: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    flexDirection: 'row',
    gap: 8,
  },
  mediaBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  mediaBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  tour3DBadge: {
    backgroundColor: '#6C63FF', // Primary purple for emphasis
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    shadowColor: '#6C63FF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  tour3DBadgeText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  contentContainer: {
    paddingTop: 16,
    paddingBottom: 20,
    paddingHorizontal: 16, // Increased horizontal padding
  },
  mainInfo: {
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif' }), // Serif font
    fontWeight: '400',
    marginBottom: 6,
  },
  address: {
    fontSize: 14,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ownerActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexShrink: 0,
  },
  price: {
    fontSize: 22,
    fontWeight: '500', // Slightly lighter bold
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif' }),
  },
  contactButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
  },
  specsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  specItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  specValue: {
    fontSize: 15,
    fontWeight: '600',
  },
  specDivider: {
    width: 1,
    height: 18,
    borderRadius: 1,
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
  contactButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
});

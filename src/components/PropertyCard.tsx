import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Platform,
} from 'react-native';
import { Property } from '../data/mockProperties';
import { useTheme } from '../theme/ThemeContext';

interface PropertyCardProps {
  property: Property;
  onPress: (property: Property) => void;
  onViewTour: (property: Property) => void;
  onViewVideo: (property: Property) => void;
}

const { width } = Dimensions.get('window');

export const PropertyCard: React.FC<PropertyCardProps> = ({
  property,
  onPress,
  onViewTour,
  onViewVideo,
}) => {
  const { colors } = useTheme();

  const formatPrice = (p: Property) => {
    let priceDisplay = `${p.currency}${p.price.toLocaleString()}`;
    if (p.period) {
      priceDisplay += `/${p.period}`;
    }
    return priceDisplay;
  };

  return (
    <View style={[styles.cardContainer, { backgroundColor: colors.surface, shadowColor: colors.cardShadow }]}>
      <TouchableOpacity activeOpacity={0.95} onPress={() => onPress(property)}>
        {/* Image Section */}
        <View style={styles.imageWrapper}>
          <Image
            source={{ uri: property.imageUrl }}
            style={styles.image}
            resizeMode="cover"
          />
          <View style={styles.overlayGradient} />
          
          <View style={styles.topBadges}>
            <View style={[styles.badge, styles.statusBadge]}>
              <Text style={styles.statusText}>
                {property.type === 'rent' ? 'FOR RENT' : 'FOR SALE'}
              </Text>
            </View>
          </View>

          <View style={styles.bottomBadges}>
             {property.is3DTourAvailable && (
              <View style={[styles.mediaBadge, { backgroundColor: 'rgba(255, 255, 255, 0.9)' }]}>
                <Text style={[styles.mediaBadgeText, { color: colors.primary }]}>3D Tour</Text>
              </View>
            )}
             {property.videoUrl && (
              <View style={[styles.mediaBadge, { backgroundColor: 'rgba(0, 0, 0, 0.6)' }]}>
                <Text style={[styles.mediaBadgeText, { color: '#FFF' }]}>Video</Text>
              </View>
            )}
          </View>
        </View>

        {/* Content Section */}
        <View style={styles.contentContainer}>
          <View style={styles.mainInfo}>
            <Text style={[styles.price, { color: colors.primary }]}>{formatPrice(property)}</Text>
            <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>{property.title}</Text>
            <Text style={[styles.address, { color: colors.textSecondary }]} numberOfLines={1}>
                {property.address}
            </Text>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.specsRow}>
            <View style={styles.specItem}>
                <Text style={styles.specIcon}>🛏</Text>
                <Text style={[styles.specValue, { color: colors.text }]}>{property.specs.beds}</Text>
                <Text style={[styles.specLabel, { color: colors.textSecondary }]}>Beds</Text>
            </View>
            <View style={[styles.verticalDivider, { backgroundColor: colors.border }]} />
             <View style={styles.specItem}>
                <Text style={styles.specIcon}>🚿</Text>
                <Text style={[styles.specValue, { color: colors.text }]}>{property.specs.baths}</Text>
                <Text style={[styles.specLabel, { color: colors.textSecondary }]}>Baths</Text>
            </View>
            <View style={[styles.verticalDivider, { backgroundColor: colors.border }]} />
             <View style={styles.specItem}>
                <Text style={styles.specIcon}>📐</Text>
                <Text style={[styles.specValue, { color: colors.text }]}>{property.specs.sqft}</Text>
                <Text style={[styles.specLabel, { color: colors.textSecondary }]}>m²</Text>
            </View>
          </View>
          
          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.footerRow}>
             <View style={styles.agentInfo}>
                <View style={[styles.agentAvatarPlaceholder, { backgroundColor: colors.inputBackground }]} >
                    <Text style={[styles.agentInitial, { color: colors.textSecondary }]}>{property.agent.name.charAt(0)}</Text>
                </View>
                <View>
                    <Text style={[styles.agentName, { color: colors.text }]}>{property.agent.name}</Text>
                    <View style={styles.ratingRow}>
                        <Text style={styles.star}>⭐</Text>
                        <Text style={[styles.ratingText, { color: colors.textSecondary }]}>
                            {property.agent.rating} ({property.agent.reviews})
                        </Text>
                    </View>
                </View>
             </View>

            <View style={styles.actionButtons}>
                {property.is3DTourAvailable && (
                    <TouchableOpacity 
                        style={[styles.iconButton, { backgroundColor: colors.primaryLight }]}
                        onPress={() => onViewTour(property)}
                    >
                        <Text style={{ fontSize: 16 }}>👁</Text>
                    </TouchableOpacity>
                )}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    borderRadius: 20,
    marginVertical: 12,
    marginHorizontal: 20,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 8,
    // overflow: 'hidden', // iOS shadow fix requires removing overflow hidden on container usually, or using shadow path.
    // But for simplified rounded corners we need overflow hidden. 
    // Best practice on RN: Inner container for overflow hidden, outer for shadow.
    // For simplicity here, we'll keep it simple but maybe reduce elevation if clips.
    backgroundColor: '#fff',
  },
  imageWrapper: {
    height: 220,
    width: '100%',
    position: 'relative',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  overlayGradient: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.05)', // Subtle overlay
  },
  topBadges: {
    position: 'absolute',
    top: 16,
    left: 16,
  },
  statusBadge: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#1A1D23',
    letterSpacing: 0.5,
  },
  bottomBadges: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    flexDirection: 'row',
    gap: 8,
  },
  mediaBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backdropFilter: 'blur(10px)', // Works on some versions, mostly web. 
  },
  mediaBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  contentContainer: {
    padding: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  mainInfo: {
    marginBottom: 16,
  },
  price: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    lineHeight: 22,
  },
  address: {
    fontSize: 14,
  },
  divider: {
    height: 1,
    width: '100%',
    marginBottom: 16,
  },
  specsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  specItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  specIcon: {
    fontSize: 16,
  },
  specValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  specLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  verticalDivider: {
    width: 1,
    height: 24,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  agentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  agentAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  agentInitial: {
    fontSize: 16,
    fontWeight: '700',
  },
  agentName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  star: {
    fontSize: 10,
    marginRight: 4,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

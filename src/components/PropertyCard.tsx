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
import { Property } from '../types/Property';
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
  const { colors, isDark } = useTheme();

  const formatPrice = (p: Property) => {
    let priceDisplay = '';
    if (typeof p.price === 'number') {
      priceDisplay = `${p.currency}${p.price.toLocaleString()}`;
    } else {
      priceDisplay = p.price.toString();
    }

    if (p.period === 'month' && !priceDisplay.includes('/')) {
      priceDisplay += '/mo';
    }
    return priceDisplay;
  };
  console.log({ property });
  return (
    <View style={[styles.cardContainer, { backgroundColor: colors.surface }]}>
      <TouchableOpacity activeOpacity={0.95} onPress={() => onPress(property)}>
        {/* Image Section */}
        <View style={styles.imageWrapper}>
          <Image
            source={{ uri: property.imageUrl || (property.images && property.images.length > 0 ? property.images[0] : 'https://via.placeholder.com/400') }}
            style={styles.image}
            resizeMode="cover"
          />

          <View style={styles.topBadges}>
            <View style={[styles.badge, styles.statusBadge]}>
              <Text style={styles.statusText}>
                {property.type === 'rent' ? 'FOR RENT' : 'FOR SALE'}
              </Text>
            </View>
          </View>

          <View style={styles.topRightActions}>
            <View style={[styles.heartButton, { backgroundColor: 'rgba(255,255,255,0.9)' }]}>
              <Text style={{ fontSize: 18, color: '#333' }}>♡</Text>
            </View>
          </View>

          <View style={styles.bottomBadges}>
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
          </View>
        </View>

        {/* Content Section */}
        <View style={styles.contentContainer}>
          <View style={styles.mainInfo}>
            <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
              {property.title} • {property.address.split(',')[1]?.trim() || 'Bishkek'}
            </Text>
            <Text style={[styles.address, { color: colors.textSecondary }]} numberOfLines={1}>
              {property.address}
            </Text>
          </View>

          <View style={styles.footerRow}>
            <Text style={[styles.price, { color: colors.text }]}>{formatPrice(property)}</Text>

            <TouchableOpacity
              style={[styles.contactButton, { backgroundColor: colors.primary }]}
            >
              <Text style={[styles.contactButtonText, { color: isDark ? '#121212' : '#FFFFFF' }]}>Contact Agent</Text>
            </TouchableOpacity>
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
  imageWrapper: {
    height: 250, // Taller image as per mockup
    width: '100%',
    position: 'relative',
    borderRadius: 24, // Rounded image
    overflow: 'hidden',
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
    marginBottom: 4,
  },
  address: {
    fontSize: 14,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  contactButtonText: {
    fontSize: 14,
    fontWeight: '500',
  }
});

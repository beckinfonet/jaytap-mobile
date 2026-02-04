import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Property } from '../data/mockProperties';

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
  const formatPrice = (p: Property) => {
    let priceDisplay = `${p.currency}${p.price.toLocaleString()}`;
    if (p.period) {
      priceDisplay += `/${p.period}`;
    }
    return priceDisplay;
  };

  return (
    <View style={styles.cardContainer}>
      <TouchableOpacity activeOpacity={0.9} onPress={() => onPress(property)}>
        {/* Image Section */}
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: property.imageUrl }}
            style={styles.image}
            resizeMode="cover"
          />
          <View style={styles.badgeContainer}>
            <View style={[styles.badge, styles.rentBadge]}>
              <Text style={[styles.badgeText, styles.rentBadgeText]}>
                {property.type === 'rent' ? 'For Rent' : 'For Sale'}
              </Text>
            </View>
            {property.is3DTourAvailable && (
              <View style={[styles.badge, styles.tourBadge]}>
                <Text style={styles.badgeText}>3D Tour</Text>
              </View>
            )}
             {property.videoUrl && (
              <View style={[styles.badge, styles.videoBadge]}>
                <Text style={[styles.badgeText, styles.videoBadgeText]}>Video</Text>
              </View>
            )}
          </View>
        </View>

        {/* Content Section */}
        <View style={styles.contentContainer}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>{property.title}</Text>
            <Text style={styles.price}>{formatPrice(property)}</Text>
          </View>

          <View style={styles.locationRow}>
             {/* Simple location icon placeholder using text if no vector icons */}
            <Text style={styles.locationText}>📍 {property.address}</Text>
          </View>

          <View style={styles.specsRow}>
            <Text style={styles.specText}>🛏 {property.specs.beds} beds</Text>
            <Text style={styles.specText}>🚿 {property.specs.baths} baths</Text>
            <Text style={styles.specText}>📐 {property.specs.sqft} m²</Text>
          </View>

          <View style={styles.featuresRow}>
            {property.features.slice(0, 3).map((feature, index) => (
              <View key={index} style={styles.featureChip}>
                <Text style={styles.featureText}>{feature}</Text>
              </View>
            ))}
          </View>

          <View style={styles.footerRow}>
             <View style={styles.agentInfo}>
                <View style={styles.agentAvatarPlaceholder} >
                    <Text style={styles.agentInitial}>{property.agent.name.charAt(0)}</Text>
                </View>
                <View>
                    <Text style={styles.agentName}>{property.agent.name}</Text>
                    <Text style={styles.agentRating}>⭐ {property.agent.rating} ({property.agent.reviews} reviews)</Text>
                </View>
             </View>
          </View>
          
          <View style={styles.actionsRow}>
            {property.is3DTourAvailable && (
                <TouchableOpacity 
                    style={[styles.actionButton, styles.tourButton]}
                    onPress={() => onViewTour(property)}
                >
                    <Text style={styles.tourButtonText}>3D Tour</Text>
                </TouchableOpacity>
            )}
             {property.videoUrl && (
                <TouchableOpacity 
                    style={[styles.actionButton, styles.videoButton]}
                    onPress={() => onViewVideo(property)}
                >
                    <Text style={styles.videoButtonText}>Video</Text>
                </TouchableOpacity>
            )}
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginVertical: 10,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E1E4E8',
  },
  imageContainer: {
    height: 200,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  badgeContainer: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 8,
  },
  rentBadge: {
    backgroundColor: '#fff',
  },
  rentBadgeText: {
    color: '#333',
  },
  tourBadge: {
    backgroundColor: '#6C63FF',
  },
  videoBadge: {
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff', // Changed to white for better contrast on colored badges
  },
  videoBadgeText: {
    color: '#fff',
  },
  contentContainer: {
    padding: 16,
  },
  headerRow: {
    flexDirection: 'column', 
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  price: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FF385C',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  locationText: {
    fontSize: 14,
    color: '#666',
  },
  specsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginBottom: 12,
  },
  specText: {
    fontSize: 14,
    color: '#444',
    marginRight: 16,
    fontWeight: '500',
  },
  featuresRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  featureChip: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 4,
  },
  featureText: {
    fontSize: 12,
    color: '#555',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12,
  },
  agentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  agentAvatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  agentInitial: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#555',
  },
  agentName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  agentRating: {
    fontSize: 12,
    color: '#666',
  },
  actionsRow: {
      flexDirection: 'row',
      gap: 10,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tourButton: {
    backgroundColor: '#6C63FF', 
  },
  videoButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#6C63FF',
  },
  tourButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  videoButtonText: {
    color: '#6C63FF',
    fontSize: 14,
    fontWeight: 'bold',
  }
});

import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Linking,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Property } from '../data/mockProperties';
import { useTheme } from '../theme/ThemeContext';

interface PropertyDetailsScreenProps {
  property: Property;
  onBack: () => void;
  onOpenTour: (url: string) => void;
}

const { width } = Dimensions.get('window');

export const PropertyDetailsScreen: React.FC<PropertyDetailsScreenProps> = ({
  property,
  onBack,
  onOpenTour,
}) => {
  const { colors, isDark } = useTheme();

  const formatPrice = (p: Property) => {
    let priceDisplay = `${p.currency}${p.price.toLocaleString()}`;
    if (p.period === 'month') {
      priceDisplay += '/mo';
    }
    return priceDisplay;
  };

  const handleOpenLink = async (url?: string, label: string = 'URL') => {
    if (url) {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Error', `Cannot open ${label}`);
      }
    } else {
      Alert.alert('Info', `No ${label} available.`);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={[styles.iconButton, { backgroundColor: colors.surface }]}>
          <Text style={[styles.iconText, { color: colors.text }]}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Details</Text>
        <TouchableOpacity style={[styles.iconButton, { backgroundColor: colors.surface }]}>
          <Text style={[styles.iconText, { color: colors.accent }]}>♡</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Main Image */}
        <View style={styles.imageContainer}>
          <Image source={{ uri: property.imageUrl }} style={styles.image} resizeMode="cover" />
          <View style={styles.imageOverlay}>
              <View style={[styles.statusBadge, { backgroundColor: colors.surface }]}>
                  <Text style={[styles.statusText, { color: colors.text }]}>
                      {property.type === 'rent' ? 'FOR RENT' : 'FOR SALE'}
                  </Text>
              </View>
          </View>
        </View>

        <View style={styles.contentContainer}>
          {/* Title and Address */}
          <View style={styles.section}>
            <Text style={[styles.title, { color: colors.text }]}>{property.title}</Text>
            <Text style={[styles.address, { color: colors.textSecondary }]}>{property.address}</Text>
          </View>

          {/* Specs */}
          <View style={[styles.specsContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
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

          {/* Description */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Description</Text>
            <Text style={[styles.description, { color: colors.textSecondary }]}>
              {property.description}
            </Text>
          </View>

          {/* Features */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Features</Text>
            <View style={styles.featuresRow}>
              {property.features.map((feature, index) => (
                <View key={index} style={[styles.featureChip, { backgroundColor: colors.chipBackground, borderColor: colors.chipBorder }]}>
                  <Text style={[styles.featureText, { color: colors.textSecondary }]}>{feature}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Media Buttons */}
          <View style={styles.mediaButtonsRow}>
             {property.is3DTourAvailable && property.matterportUrl && (
                 <TouchableOpacity 
                    style={[styles.mediaButton, { backgroundColor: colors.primaryLight }]}
                    onPress={() => onOpenTour(property.matterportUrl!)}
                 >
                     <Text style={{fontSize: 20, marginRight: 8}}>👓</Text>
                     <Text style={[styles.mediaButtonText, { color: colors.text }]}>3D Tour</Text>
                 </TouchableOpacity>
             )}
             {property.videoUrl && (
                 <TouchableOpacity 
                    style={[styles.mediaButton, { backgroundColor: colors.primaryLight, marginLeft: 12 }]}
                    onPress={() => handleOpenLink(property.videoUrl, 'Video')}
                 >
                     <Text style={{fontSize: 20, marginRight: 8}}>🎥</Text>
                     <Text style={[styles.mediaButtonText, { color: colors.text }]}>Video</Text>
                 </TouchableOpacity>
             )}
          </View>

          {/* Agent Info */}
          <View style={[styles.agentContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
             <View style={styles.agentInfo}>
                 <View style={[styles.agentAvatar, { backgroundColor: colors.inputBackground }]}>
                    <Text style={[styles.agentInitial, { color: colors.textSecondary }]}>{property.agent.name.charAt(0)}</Text>
                 </View>
                 <View>
                     <Text style={[styles.agentName, { color: colors.text }]}>{property.agent.name}</Text>
                     <Text style={[styles.agentRating, { color: colors.textSecondary }]}>⭐ {property.agent.rating} ({property.agent.reviews} reviews)</Text>
                 </View>
             </View>
             <TouchableOpacity style={[styles.messageButton, { backgroundColor: colors.primaryLight }]}>
                 <Text style={{ fontSize: 18, color: colors.text }}>✉️</Text>
             </TouchableOpacity>
          </View>

        </View>
      </ScrollView>

      {/* Footer Action */}
      <View style={[styles.footer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          <View>
              <Text style={[styles.priceLabel, { color: colors.textSecondary }]}>Price</Text>
              <Text style={[styles.footerPrice, { color: colors.text }]}>{formatPrice(property)}</Text>
          </View>
          <TouchableOpacity style={[styles.contactButton, { backgroundColor: colors.primary }]}>
              <Text style={styles.contactButtonText}>Contact Agent</Text>
          </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  headerTitle: {
      fontSize: 16,
      fontWeight: '600',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  iconText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  scrollContent: {
    paddingBottom: 20,
  },
  imageContainer: {
    width: '100%',
    height: 300,
    position: 'relative',
    marginBottom: 20,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
      ...StyleSheet.absoluteFillObject,
      padding: 20,
      justifyContent: 'flex-start',
      alignItems: 'flex-start',
  },
  statusBadge: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
  },
  statusText: {
      fontSize: 12,
      fontWeight: '700',
  },
  contentContainer: {
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif' }),
    fontWeight: '600',
    marginBottom: 8,
  },
  address: {
    fontSize: 16,
    marginBottom: 8,
  },
  specsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 24,
  },
  specItem: {
    alignItems: 'center',
  },
  specIcon: {
      fontSize: 20,
      marginBottom: 4,
  },
  specValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  specLabel: {
    fontSize: 12,
  },
  verticalDivider: {
    width: 1,
    height: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  description: {
    fontSize: 15,
    lineHeight: 24,
  },
  featuresRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  featureChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
    marginBottom: 8,
  },
  featureText: {
    fontSize: 14,
  },
  mediaButtonsRow: {
      flexDirection: 'row',
      marginBottom: 24,
  },
  mediaButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      borderRadius: 12,
  },
  mediaButtonText: {
      fontSize: 16,
      fontWeight: '600',
  },
  agentContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
      borderRadius: 16,
      borderWidth: 1,
      marginBottom: 24,
  },
  agentInfo: {
      flexDirection: 'row',
      alignItems: 'center',
  },
  agentAvatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
  },
  agentInitial: {
      fontSize: 20,
      fontWeight: '700',
  },
  agentName: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 2,
  },
  agentRating: {
      fontSize: 13,
  },
  messageButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
  },
  footer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderTopWidth: 1,
  },
  priceLabel: {
      fontSize: 12,
      marginBottom: 2,
  },
  footerPrice: {
      fontSize: 22,
      fontFamily: Platform.select({ ios: 'Georgia', android: 'serif' }),
      fontWeight: '600',
  },
  contactButton: {
      paddingHorizontal: 32,
      paddingVertical: 14,
      borderRadius: 30,
  },
  contactButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
  }
});


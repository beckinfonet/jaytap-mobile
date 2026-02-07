import React, { useState, useRef } from 'react';
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
  FlatList,
  Modal,
} from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Property } from '../types/Property';
import { useTheme } from '../theme/ThemeContext';

interface PropertyDetailsScreenProps {
  property: Property;
  onBack: () => void;
  onOpenTours: () => void;
  returnToMap?: boolean; // If true, user came from map view
}

const { width, height } = Dimensions.get('window');

export const PropertyDetailsScreen: React.FC<PropertyDetailsScreenProps> = ({
  property,
  onBack,
  onOpenTours,
}) => {
  const { colors, isDark } = useTheme();
  const [activeSlide, setActiveSlide] = useState(0);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isMapFullScreen, setIsMapFullScreen] = useState(false);

  // Consolidate images into a single array
  const images = property.images && property.images.length > 0 
    ? property.images 
    : (property.imageUrl ? [property.imageUrl] : ['https://via.placeholder.com/800']);

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

  const onScroll = (event: any) => {
    const slideSize = event.nativeEvent.layoutMeasurement.width;
    const index = event.nativeEvent.contentOffset.x / slideSize;
    const roundIndex = Math.round(index);
    setActiveSlide(roundIndex);
  };

  // Get property coordinates - use real coordinates if available, otherwise generate mock coordinates
  const getPropertyCoordinates = () => {
    // If property has real coordinates, use them
    if (property.latitude && property.longitude) {
      return {
        latitude: property.latitude,
        longitude: property.longitude,
      };
    }
    
    // Otherwise, generate consistent mock coordinates based on property ID for demo
    const BISHKEK_CENTER = { latitude: 42.8746, longitude: 74.5698 };
    const idHash = (property.id || property.listingId || '0').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const latOffset = ((idHash % 100) - 50) * 0.001; // Small offset within Bishkek
    const lngOffset = ((idHash % 200) - 100) * 0.001;
    
    return {
      latitude: BISHKEK_CENTER.latitude + latOffset,
      longitude: BISHKEK_CENTER.longitude + lngOffset,
    };
  };

  const propertyCoordinates = getPropertyCoordinates();

  const renderImageItem = ({ item }: { item: string }) => (
    <TouchableOpacity activeOpacity={0.9} onPress={() => setIsFullScreen(true)}>
        <Image 
            source={{ uri: item }} 
            style={{ width: width, height: 300 }} 
            resizeMode="cover" 
        />
    </TouchableOpacity>
  );

  const renderFullScreenItem = ({ item }: { item: string }) => (
    <View style={{ width: width, height: height, justifyContent: 'center', alignItems: 'center' }}>
        <Image 
            source={{ uri: item }} 
            style={{ width: width, height: height }} 
            resizeMode="contain" 
        />
    </View>
  );

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
        {/* Image Carousel */}
        <View style={styles.carouselContainer}>
            <FlatList
                data={images}
                renderItem={renderImageItem}
                keyExtractor={(item, index) => index.toString()}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={onScroll}
                scrollEventThrottle={16} // smooth updates
            />
            
            {/* Image Overlay: Status Badge & Pagination */}
            <View style={styles.imageOverlay}>
                <View style={[styles.statusBadge, { backgroundColor: colors.surface }]}>
                    <Text style={[styles.statusText, { color: colors.text }]}>
                        {property.type === 'rent' ? 'FOR RENT' : 'FOR SALE'}
                    </Text>
                </View>
                
                {images.length > 1 && (
                    <View style={[styles.paginationBadge, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
                        <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '600' }}>
                            {activeSlide + 1} / {images.length}
                        </Text>
                    </View>
                )}
            </View>
        </View>

        <View style={styles.contentContainer}>
          
          {/* Media Buttons - Redesigned */}
          <View style={styles.mediaButtonsContainer}>
            {/* 3D Tour Button - Full Width */}
            {property.is3DTourAvailable && property.tours.length > 0 && (
              <TouchableOpacity 
                style={styles.tour3DButton}
                onPress={onOpenTours}
              >
                <Text style={styles.tour3DIcon}>🥽</Text>
                <Text style={styles.tour3DButtonText}>Start 3D Tour</Text>
                <Text style={styles.tour3DArrow}>→</Text>
              </TouchableOpacity>
            )}

            {/* Instagram and Videos - Side by Side */}
            <View style={styles.secondaryButtonsRow}>
              {property.instagramUrl && (
                <TouchableOpacity 
                  style={[styles.secondaryButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  onPress={() => handleOpenLink(property.instagramUrl, 'Instagram')}
                >
                  <View style={styles.instagramIconContainer}>
                    <View style={styles.instagramLogo}>
                      <View style={styles.instagramSquare} />
                      <View style={styles.instagramCircle} />
                      <View style={styles.instagramDot} />
                    </View>
                  </View>
                  <Text style={[styles.secondaryButtonText, { color: colors.text }]}>Instagram</Text>
                  <Text style={[styles.secondaryButtonArrow, { color: colors.text }]}>→</Text>
                </TouchableOpacity>
              )}
              {property.videoUrl && (
                <TouchableOpacity 
                  style={[styles.secondaryButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  onPress={() => handleOpenLink(property.videoUrl, 'Video')}
                >
                  <Text style={styles.videoIcon}>▶</Text>
                  <Text style={[styles.secondaryButtonText, { color: colors.text }]}>Videos</Text>
                  <Text style={[styles.secondaryButtonArrow, { color: colors.text }]}>→</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

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

          {/* Location Map */}
          <View style={styles.section}>
            <View style={styles.locationHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Location</Text>
            </View>
            <Text style={[styles.address, { color: colors.textSecondary, marginBottom: 12 }]}>{property.address}</Text>
            <View style={[styles.mapContainer, { borderColor: colors.border }]}>
              <MapView
                provider={PROVIDER_DEFAULT}
                style={styles.map}
                initialRegion={{
                  ...propertyCoordinates,
                  latitudeDelta: 0.01,
                  longitudeDelta: 0.01,
                }}
                scrollEnabled={true}
                zoomEnabled={true}
                pitchEnabled={false}
                rotateEnabled={false}
                mapType="mutedStandard"
                userInterfaceStyle={isDark ? 'dark' : 'light'}
              >
                <Marker
                  coordinate={propertyCoordinates}
                  title={property.title}
                  description={property.address}
                />
              </MapView>
              {/* Elegant floating button to open full screen */}
              <TouchableOpacity 
                style={[styles.mapOverlayButton, { backgroundColor: colors.surface, shadowColor: colors.cardShadow }]}
                onPress={() => setIsMapFullScreen(true)}
                activeOpacity={0.8}
              >
                <Text style={{ fontSize: 20, marginRight: 6 }}>🗺️</Text>
                <Text style={[styles.mapOverlayButtonText, { color: colors.text }]}>Full Screen</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Agent Info */}
          {property.agent && (
            <View style={[styles.agentContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
               <View style={styles.agentInfo}>
                   <View style={[styles.agentAvatar, { backgroundColor: colors.inputBackground }]}>
                      <Text style={[styles.agentInitial, { color: colors.textSecondary }]}>
                        {property.agent.name?.charAt(0) || '?'}
                      </Text>
                   </View>
                   <View>
                       <Text style={[styles.agentName, { color: colors.text }]}>
                         {property.agent.name || 'Contact Owner'}
                       </Text>
                       {property.agent.rating && property.agent.reviews && (
                         <Text style={[styles.agentRating, { color: colors.textSecondary }]}>
                           ⭐ {property.agent.rating} ({property.agent.reviews} reviews)
                         </Text>
                       )}
                   </View>
               </View>
               <TouchableOpacity style={[styles.messageButton, { backgroundColor: colors.primaryLight }]}>
                   <Text style={{ fontSize: 18, color: colors.text }}>✉️</Text>
               </TouchableOpacity>
            </View>
          )}

        </View>
      </ScrollView>

      {/* Footer Action */}
      <View style={[styles.footer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          <View>
              <Text style={[styles.priceLabel, { color: colors.textSecondary }]}>Price</Text>
              <Text style={[styles.footerPrice, { color: colors.text }]}>{formatPrice(property)}</Text>
          </View>
          <TouchableOpacity style={[styles.contactButton, { backgroundColor: colors.primary }]}>
              <Text style={[styles.contactButtonText, { color: isDark ? '#121212' : '#FFFFFF' }]}>Contact Agent</Text>
          </TouchableOpacity>
      </View>

      {/* Full Screen Image Modal */}
      <Modal visible={isFullScreen} transparent={true} animationType="fade" onRequestClose={() => setIsFullScreen(false)}>
        <View style={styles.fullScreenContainer}>
            <StatusBar hidden />
            <TouchableOpacity style={styles.closeButton} onPress={() => setIsFullScreen(false)}>
                <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
            
            <FlatList
                data={images}
                renderItem={renderFullScreenItem}
                keyExtractor={(item, index) => index.toString()}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                initialScrollIndex={activeSlide}
                getItemLayout={(data, index) => ({ length: width, offset: width * index, index })}
            />
            
            <View style={styles.fullScreenPagination}>
                <Text style={styles.fullScreenPaginationText}>{activeSlide + 1} / {images.length}</Text>
            </View>
        </View>
      </Modal>

      {/* Full Screen Map Modal */}
      <Modal visible={isMapFullScreen} transparent={false} animationType="slide" onRequestClose={() => setIsMapFullScreen(false)}>
        <SafeAreaView style={[styles.fullScreenMapContainer, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
          <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
          
          {/* Full Screen Map */}
          <View style={styles.fullScreenMapWrapper}>
            <MapView
              provider={PROVIDER_DEFAULT}
              style={styles.fullScreenMap}
              initialRegion={{
                ...propertyCoordinates,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }}
              scrollEnabled={true}
              zoomEnabled={true}
              pitchEnabled={true}
              rotateEnabled={true}
              mapType="mutedStandard"
              userInterfaceStyle={isDark ? 'dark' : 'light'}
            >
              <Marker
                coordinate={propertyCoordinates}
                title={property.title}
                description={property.address}
              />
            </MapView>

            {/* Floating Close Button - Top Right */}
            <TouchableOpacity 
              style={[styles.fullScreenMapFloatingCloseButton, { backgroundColor: 'rgba(0,0,0,0.7)' }]}
              onPress={() => setIsMapFullScreen(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.fullScreenMapFloatingCloseButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Address info at bottom */}
          <View style={[styles.fullScreenMapFooter, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
            <Text style={[styles.fullScreenMapAddress, { color: colors.text }]}>{property.address}</Text>
          </View>
        </SafeAreaView>
      </Modal>
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
  carouselContainer: {
    height: 300,
    position: 'relative',
    marginBottom: 20,
  },
  imageOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      padding: 20,
      flexDirection: 'row',
      justifyContent: 'space-between', // Badge left, pagination right
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
  paginationBadge: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 12,
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
  mediaButtonsContainer: {
    marginBottom: 24,
    gap: 12,
  },
  tour3DButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#6C63FF',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    shadowColor: '#6C63FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  tour3DIcon: {
    fontSize: 22,
    marginRight: 12,
  },
  tour3DButtonText: {
    flex: 1,
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  tour3DArrow: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '600',
  },
  secondaryButtonsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  instagramIconContainer: {
    width: 24,
    height: 24,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  instagramLogo: {
    width: 24,
    height: 24,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  instagramSquare: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#E1306C',
    position: 'absolute',
  },
  instagramCircle: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#E1306C',
    position: 'absolute',
  },
  instagramDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E1306C',
    position: 'absolute',
    top: 3,
    right: 3,
  },
  videoIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  secondaryButtonText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButtonArrow: {
    fontSize: 18,
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
      fontSize: 16,
      fontWeight: '600',
  },
  // Location Map Styles
  locationHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
  },
  mapContainer: {
      height: 350,
      borderRadius: 16,
      overflow: 'hidden',
      borderWidth: 1,
      marginBottom: 24,
      position: 'relative',
  },
  map: {
      width: '100%',
      height: '100%',
  },
  mapOverlayButton: {
      position: 'absolute',
      bottom: 16,
      right: 16,
      zIndex: 10,
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 24,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 4,
  },
  mapOverlayButtonText: {
      fontSize: 15,
      fontWeight: '600',
  },
  // Full Screen Styles
  fullScreenContainer: {
      flex: 1,
      backgroundColor: '#000',
      justifyContent: 'center',
  },
  closeButton: {
      position: 'absolute',
      top: 50,
      right: 20,
      zIndex: 10,
      backgroundColor: 'rgba(0,0,0,0.5)',
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
  },
  closeButtonText: {
      color: '#FFF',
      fontSize: 24,
      fontWeight: 'bold',
  },
  fullScreenPagination: {
      position: 'absolute',
      bottom: 50,
      alignSelf: 'center',
      backgroundColor: 'rgba(0,0,0,0.5)',
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
  },
  fullScreenPaginationText: {
      color: '#FFF',
      fontSize: 16,
      fontWeight: '600',
  },
  // Full Screen Map Styles
  fullScreenMapContainer: {
      flex: 1,
  },
  fullScreenMapWrapper: {
      flex: 1,
      position: 'relative',
  },
  fullScreenMap: {
      width: '100%',
      height: '100%',
  },
  fullScreenMapFloatingCloseButton: {
      position: 'absolute',
      top: 50,
      right: 20,
      width: 50,
      height: 50,
      borderRadius: 25,
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 8,
  },
  fullScreenMapFloatingCloseButtonText: {
      color: '#FFF',
      fontSize: 24,
      fontWeight: 'bold',
  },
  fullScreenMapFooter: {
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderTopWidth: 1,
  },
  fullScreenMapAddress: {
      fontSize: 16,
      fontWeight: '500',
  }
});

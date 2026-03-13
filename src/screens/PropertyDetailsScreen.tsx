import React, { useState, useRef, useEffect } from 'react';
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
  ActivityIndicator,
  Share,
} from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Send,
  MessageCircle,
  Heart,
  Share2,
  Mail,
  Phone,
  Calendar,
  Wifi,
  Tv,
  WashingMachine,
  AirVent,
  Car,
  Flame,
  MoveVertical,
  Dumbbell,
  WavesLadder,
  SquareParking,
  Utensils,
  Flower2,
  PawPrint,
  Thermometer,
  ThermometerSun,
  Lock,
  Shield,
  Coffee,
  Microwave,
  Laptop,
  Waves,
  Check,
  ImageIcon,
  Video,
  ChevronRight,
  MapPin,
  Instagram,
} from 'lucide-react-native';
import { Property } from '../types/Property';
import { TourHeroCard } from '../components/TourHeroCard';
import { getPropertyShareUrl } from '../constants';
import { formatPrice } from '../utils/formatPrice';
import { useTheme } from '../theme/ThemeContext';
import { PropertyService } from '../services/PropertyService';
import { useAuth } from '../context/AuthContext';

interface PropertyDetailsScreenProps {
  property: Property;
  onBack: () => void;
  onOpenTours: () => void;
  onOpenPhotos?: (url: string) => void;
  onMessagePress?: () => void;
  onScheduleViewing?: (property: Property) => void;
  returnToMap?: boolean; // If true, user came from map view
  onFavorite?: (property: Property) => void; // Optional favorite handler
  isFavorited?: boolean; // Whether this property is favorited
  isLoading?: boolean; // Whether favorite is being toggled
  onLandlordPress?: (ownerUid: string, ownerName: string) => void; // Navigate to owner's listings
}

const { width, height } = Dimensions.get('window');

// Map feature names to Lucide icons (Airbnb-style)
// Covers common property amenities listing owners may add
const FEATURE_ICONS: Record<string, React.ComponentType<{ size?: number; color?: string }>> = {
  // Climate & comfort
  ac: AirVent,
  'air conditioning': AirVent,
  heating: ThermometerSun,
  heat: ThermometerSun,
  thermostat: Thermometer,
  // Parking & garage
  garage: Car,
  parking: SquareParking,
  'parking spot': SquareParking,
  'free parking': SquareParking,
  // Laundry
  washer: WashingMachine,
  washing: WashingMachine,
  'washing machine': WashingMachine,
  dryer: Flame,
  'hair dryer': Flame,
  laundry: WashingMachine,
  // Connectivity & entertainment
  wifi: Wifi,
  'wi-fi': Wifi,
  internet: Wifi,
  tv: Tv,
  television: Tv,
  // Building
  elevator: MoveVertical,
  lift: MoveVertical,
  // Fitness & recreation
  gym: Dumbbell,
  fitness: Dumbbell,
  'fitness center': Dumbbell,
  'swimming pool': WavesLadder,
  pool: WavesLadder,
  'hot tub': Waves,
  'jacuzzi': Waves,
  spa: Waves,
  // Kitchen & dining
  kitchen: Utensils,
  kitchenette: Utensils,
  'full kitchen': Utensils,
  'kitchen equipped': Utensils,
  microwave: Microwave,
  coffee: Coffee,
  'coffee maker': Coffee,
  'espresso machine': Coffee,
  // Outdoor
  garden: Flower2,
  balcony: Flower2,
  terrace: Flower2,
  patio: Flower2,
  'outdoor space': Flower2,
  // Pets
  'pet friendly': PawPrint,
  pets: PawPrint,
  'dogs allowed': PawPrint,
  'cats allowed': PawPrint,
  // Security
  security: Shield,
  '24/7 security': Shield,
  'secure building': Lock,
  'doorman': Shield,
  // Workspace
  'workspace': Laptop,
  'dedicated workspace': Laptop,
  'desk': Laptop,
  'wifi workspace': Laptop,
};
const getFeatureIcon = (feature: string) => {
  const key = feature.toLowerCase().trim();
  return FEATURE_ICONS[key] ?? Check;
};

export const PropertyDetailsScreen: React.FC<PropertyDetailsScreenProps> = ({
  property: initialProperty,
  onBack,
  onOpenTours,
  onOpenPhotos,
  onMessagePress,
  onScheduleViewing,
  onFavorite,
  isFavorited = false,
  isLoading = false,
  onLandlordPress,
}) => {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const [property, setProperty] = useState<Property>(initialProperty);
  const [loading, setLoading] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isMapFullScreen, setIsMapFullScreen] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);

  // Fetch property details with owner info when screen mounts
  useEffect(() => {
    const fetchPropertyDetails = async () => {
      if (!initialProperty?.id) return;

      setLoading(true);
      try {
        const propertyDetails = await PropertyService.getPropertyById(initialProperty.id);
        setProperty(propertyDetails);
      } catch (error) {
        console.error('Error fetching property details:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPropertyDetails();
  }, [initialProperty?.id]);

  // Consolidate images into a single array
  const images = property.images && property.images.length > 0
    ? property.images
    : (property.imageUrl ? [property.imageUrl] : ['https://via.placeholder.com/800']);

  const handleShare = async () => {
    // Generate shareable URL
    const propertyId = property.id || property.listingId || '';
    const shareUrl = getPropertyShareUrl(propertyId);

    // Create share message
    const priceText = formatPrice(property);
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

  const handleWhatsApp = () => {
    const owner = (property as any).owner;
    if (!owner?.whatsapp) {
      Alert.alert('No WhatsApp', 'This owner has not provided a WhatsApp number.');
      return;
    }

    // Clean phone number: remove all non-numeric characters
    const cleanPhone = owner.whatsapp.replace(/\D/g, '');

    const message = `Hi, I'm interested in your property: ${property.title}`;
    const whatsappUrl = `whatsapp://send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`;

    Linking.canOpenURL(whatsappUrl)
      .then((supported) => {
        if (supported) {
          return Linking.openURL(whatsappUrl);
        } else {
          // Fallback to regular phone call if WhatsApp is not installed
          return Linking.openURL(`tel:${owner.whatsapp}`);
        }
      })
      .catch((err) => {
        console.error('An error occurred', err);
        Linking.openURL(`tel:${owner.whatsapp}`).catch(e => console.error("Call failed", e));
      });
  };

  const handleTelegram = () => {
    const owner = (property as any).owner;
    if (!owner?.telegram) {
      Alert.alert('No Telegram', 'This owner has not provided a Telegram username.');
      return;
    }

    // Clean username: remove URL parts, @, and whitespace
    let username = owner.telegram.trim();
    username = username.replace(/(https?:\/\/)?(t\.me|telegram\.me)\//i, '');
    username = username.replace('@', '');

    if (!username) {
      Alert.alert('Invalid Telegram', 'The provided Telegram username is invalid.');
      return;
    }

    const message = `Hi, I'm interested in your property: ${property.title}`;
    const webUrl = `https://t.me/${username}?text=${encodeURIComponent(message)}`;

    // Try opening web URL directly as it handles redirection well
    Linking.openURL(webUrl).catch(err => {
      console.error("Failed to open Telegram", err);
      // Fallback to deep link
      Linking.openURL(`tg://resolve?domain=${username}`);
    });
  };

  const handleEmail = () => {
    const owner = (property as any).owner;
    if (!owner?.email) {
      Alert.alert('No Email', 'This owner has not provided an email address.');
      return;
    }

    const subject = encodeURIComponent(`Inquiry about: ${property.title}`);
    const body = encodeURIComponent(`Hi,\n\nI'm interested in your property: ${property.title}\n\nAddress: ${property.address}\n\nPlease let me know if it's still available.\n\nThank you!`);
    const emailUrl = `mailto:${owner.email}?subject=${subject}&body=${body}`;

    Linking.openURL(emailUrl).catch(err => {
      console.error("Failed to open email", err);
      Alert.alert('Error', 'Could not open email client.');
    });
  };

  const handlePhone = () => {
    const owner = (property as any).owner;
    if (!owner?.phone) {
      Alert.alert('No Phone', 'This owner has not provided a phone number.');
      return;
    }
    const cleanPhone = owner.phone.replace(/\D/g, '');
    const telUrl = `tel:${cleanPhone}`;
    Linking.openURL(telUrl).catch(err => {
      console.error("Failed to open phone", err);
      Alert.alert('Error', 'Could not open phone dialer.');
    });
  };

  const handleInternalMessage = () => {
    setShowContactModal(false);
    if (onMessagePress) {
      onMessagePress();
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

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
        <StatusBar
          barStyle={isDark ? 'light-content' : 'dark-content'}
          backgroundColor={colors.background}
        />
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={[styles.iconButton, { backgroundColor: colors.surface }]}>
            <Text style={[styles.iconText, { color: colors.text }]}>←</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Details</Text>
          <View style={[styles.iconButton, { backgroundColor: colors.surface }]} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

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
        <View style={styles.headerRightActions}>
          <TouchableOpacity
            style={[styles.iconButton, { backgroundColor: colors.surface }]}
            onPress={handleShare}
          >
            <Share2 size={22} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.iconButton, { backgroundColor: colors.surface }]}
            onPress={() => {
              if (onFavorite && !isLoading) {
                onFavorite(property);
              }
            }}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={isFavorited ? '#E91E63' : colors.accent} />
            ) : (
              <Heart
                size={22}
                color={isFavorited ? '#E91E63' : colors.accent}
                fill={isFavorited ? '#E91E63' : 'transparent'}
              />
            )}
          </TouchableOpacity>
        </View>
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

          {/* Media Buttons - Redesigned: Hero 3D Tour + 2x2 Grid */}
          <View style={styles.mediaButtonsContainer}>
            {/* Hero 3D Tour Card - platform-specific component */}
            <TourHeroCard
              isActive={!!(property.is3DTourAvailable && property.tours.length > 0)}
              tourCount={property.tours.length}
              isDark={isDark}
              inputBackground={colors.inputBackground}
              textSecondary={colors.textSecondary}
              borderColor={colors.border}
              onPress={onOpenTours}
            />

            {/* 2x2 Grid: Instagram, Photos, Videos, Message */}
            <View style={styles.mediaGrid}>
              <TouchableOpacity
                style={[
                  styles.mediaGridCard,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                  !property.instagramUrl && { opacity: 0.6 }
                ]}
                onPress={property.instagramUrl ? () => handleOpenLink(property.instagramUrl, 'Instagram') : undefined}
                disabled={!property.instagramUrl}
              >
                <Instagram
                  size={24}
                  color={property.instagramUrl ? colors.text : colors.textSecondary}
                  strokeWidth={1.5}
                />
                <Text style={[styles.mediaGridLabel, { color: property.instagramUrl ? colors.text : colors.textSecondary }]}>Instagram</Text>
                <ChevronRight size={20} color={property.instagramUrl ? colors.textSecondary : colors.textTertiary} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.mediaGridCard,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                  (!property.panoramicPhotosUrl || !onOpenPhotos) && { opacity: 0.6 }
                ]}
                onPress={property.panoramicPhotosUrl && onOpenPhotos ? () => onOpenPhotos(property.panoramicPhotosUrl!) : undefined}
                disabled={!onOpenPhotos || !property.panoramicPhotosUrl}
              >
                <ImageIcon size={24} color={(property.panoramicPhotosUrl && onOpenPhotos) ? colors.text : colors.textSecondary} />
                <Text style={[styles.mediaGridLabel, { color: (property.panoramicPhotosUrl && onOpenPhotos) ? colors.text : colors.textSecondary }]}>Photos</Text>
                <ChevronRight size={20} color={(property.panoramicPhotosUrl && onOpenPhotos) ? colors.textSecondary : colors.textTertiary} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.mediaGridCard,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                  !property.videoUrl && { opacity: 0.6 }
                ]}
                onPress={property.videoUrl ? () => handleOpenLink(property.videoUrl, 'Video') : undefined}
                disabled={!property.videoUrl}
              >
                <Video size={24} color={property.videoUrl ? colors.text : colors.textSecondary} />
                <Text style={[styles.mediaGridLabel, { color: property.videoUrl ? colors.text : colors.textSecondary }]}>Videos</Text>
                <ChevronRight size={20} color={property.videoUrl ? colors.textSecondary : colors.textTertiary} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.mediaGridCard,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                  !property.owner && { opacity: 0.6 }
                ]}
                onPress={onMessagePress}
                disabled={!property.owner}
              >
                <MessageCircle size={24} color={property.owner ? colors.text : colors.textSecondary} />
                <Text style={[styles.mediaGridLabel, { color: property.owner ? colors.text : colors.textSecondary }]}>Message</Text>
                <ChevronRight size={20} color={property.owner ? colors.textSecondary : colors.textTertiary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Title, ID, Availability, Address - in a card */}
          <View style={styles.section}>
            <View style={[styles.listingInfoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.title, { color: colors.text }]}>{property.title}</Text>
              <View style={styles.chipContainer}>
                {property.listingId && (
                  <View style={[styles.listingIdChip, { backgroundColor: isDark ? '#E91E63' : '#E5E7EB' }]}>
                    <Text style={[styles.listingIdLabel, { color: isDark ? '#FFF' : colors.text }]}>ID:</Text>
                    <Text style={[styles.listingIdText, { color: isDark ? '#FFF' : colors.text }]}>
                      {property.listingId}
                    </Text>
                  </View>
                )}
                {(() => {
                  const raw = (property as any).availableDate;
                  if (!raw) return null;
                  const date = typeof raw === 'string' ? new Date(raw) : raw instanceof Date ? raw : null;
                  if (!date || isNaN(date.getTime())) return null;
                  const now = new Date();
                  const oneMonthMs = 30 * 24 * 60 * 60 * 1000;
                  const isSoon = date.getTime() - now.getTime() > oneMonthMs;
                  const formattedDate = date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
                  const label = isSoon ? formattedDate : 'now';
                  return (
                    <View style={[styles.availabilityChip, { backgroundColor: isDark ? 'rgba(34,197,94,0.25)' : 'rgba(34,197,94,0.2)', borderWidth: 0, borderColor: 'transparent', gap: 6 }]}>
                      <View style={styles.availabilityDot} />
                      <Text style={[styles.availabilityText, { color: colors.text }]}>
                        Available: {label}
                      </Text>
                    </View>
                  );
                })()}
              </View>
              <View style={styles.addressRow}>
                <View style={{ marginRight: 6 }}>
                  <MapPin size={16} color={colors.textSecondary} />
                </View>
                <Text style={[styles.address, { color: colors.textSecondary }]} numberOfLines={1}>{property.address}</Text>
              </View>
            </View>
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

          {/* Features - Airbnb-style two-column layout with icons */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>What this place offers</Text>
            <View style={styles.featuresGrid}>
              {property.features.map((feature, index) => {
                const IconComponent = getFeatureIcon(feature);
                return (
                  <View key={index} style={styles.featureItem}>
                    <IconComponent size={20} color={colors.text} />
                    <Text style={[styles.featureItemText, { color: colors.text }]}>{feature}</Text>
                  </View>
                );
              })}
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
        {/* First Row: Price and Owner Name */}
        <View style={styles.footerTopRow}>
          <View style={styles.priceContainer}>
            <Text style={[styles.priceLabel, { color: colors.textSecondary }]}>Price</Text>
            <Text style={[styles.footerPrice, { color: colors.text }]}>{formatPrice(property)}</Text>
          </View>
          {(() => {
            const owner = (property as any).owner;
            const ownerName = owner ? `${owner.firstName || ''} ${owner.lastName || ''}`.trim() || 'Owner' : null;
            const ownerUid = owner?.uid;
            const canViewListings = ownerName && ownerUid && onLandlordPress;
            if (!ownerName) return null;
            return canViewListings ? (
              <TouchableOpacity
                onPress={() => onLandlordPress(ownerUid, ownerName)}
                activeOpacity={0.7}
                style={styles.ownerContainer}
              >
                <Text style={[styles.ownerLabel, { color: colors.textSecondary }]}>Landlord</Text>
                <Text style={[styles.ownerName, { color: colors.text, textDecorationLine: 'underline' }]}>{ownerName}</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.ownerContainer}>
                <Text style={[styles.ownerLabel, { color: colors.textSecondary }]}>Landlord</Text>
                <Text style={[styles.ownerName, { color: colors.text }]}>{ownerName}</Text>
              </View>
            );
          })()}
        </View>

        {/* Contact Agent Button - opens modal with all available channels */}
        <TouchableOpacity
          style={[styles.contactButton, { backgroundColor: colors.primary }]}
          onPress={() => setShowContactModal(true)}
        >
          <MessageCircle size={20} color={isDark ? '#121212' : '#FFFFFF'} />
          <Text
            style={{
              marginLeft: 8,
              fontSize: 14,
              fontWeight: '600',
              color: isDark ? '#121212' : '#FFFFFF',
            }}
          >
            Contact now
          </Text>
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

      {/* Contact Options Modal */}
      <Modal
        visible={showContactModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowContactModal(false)}
      >
        <View style={styles.contactModalOverlay}>
          <TouchableOpacity
            style={styles.contactModalBackdrop}
            activeOpacity={1}
            onPress={() => setShowContactModal(false)}
          />
          <View style={[styles.contactModalContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.contactModalHandle, { backgroundColor: colors.border }]} />
            <Text style={[styles.contactModalTitle, { color: colors.text }]}>Contact Listing Owner</Text>
            <Text style={[styles.contactModalSubtitle, { color: colors.textSecondary }]}>
              Choose how you'd like to reach out
            </Text>

            {(() => {
              const owner = (property as any).owner;
              const hasEmail = !!owner?.email;
              const hasPhone = !!owner?.phone;
              const hasWhatsApp = !!owner?.whatsapp;
              const hasTelegram = !!owner?.telegram;
              const hasInternalMessage = !!owner?.uid && owner.uid !== user?.localId;
              const hasScheduleViewing = !!owner?.uid && owner.uid !== user?.localId && !!onScheduleViewing;
              const hasAnyOption = hasEmail || hasPhone || hasWhatsApp || hasTelegram || hasInternalMessage || hasScheduleViewing;

              if (!hasAnyOption) {
                return (
                  <View style={styles.contactModalEmpty}>
                    <Text style={[styles.contactModalEmptyText, { color: colors.textSecondary }]}>
                      No contact options available for this listing.
                    </Text>
                  </View>
                );
              }

              const options: Array<{ key: string; label: string; onPress: () => void; icon: React.ReactNode; color: string; contentColor?: string }> = [];
              const inAppMessageContentColor = isDark ? '#121212' : '#FFFFFF';
              if (hasScheduleViewing) {
                options.push({
                  key: 'schedule',
                  label: 'Schedule viewing',
                  onPress: () => { setShowContactModal(false); onScheduleViewing?.(property); },
                  icon: <Calendar size={22} color={inAppMessageContentColor} />,
                  color: '#06B6D4',
                  contentColor: inAppMessageContentColor,
                });
              }
              if (hasInternalMessage) {
                options.push({
                  key: 'message',
                  label: 'In-App Message',
                  onPress: handleInternalMessage,
                  icon: <MessageCircle size={22} color={inAppMessageContentColor} />,
                  color: colors.primary,
                  contentColor: inAppMessageContentColor,
                });
              }
              if (hasEmail) {
                options.push({
                  key: 'email',
                  label: 'Email',
                  onPress: () => { setShowContactModal(false); handleEmail(); },
                  icon: <Mail size={22} color="#FFF" />,
                  color: '#6B7280',
                });
              }
              if (hasPhone) {
                options.push({
                  key: 'phone',
                  label: 'Phone Call',
                  onPress: () => { setShowContactModal(false); handlePhone(); },
                  icon: <Phone size={22} color="#FFF" />,
                  color: '#10B981',
                });
              }
              if (hasWhatsApp) {
                options.push({
                  key: 'whatsapp',
                  label: 'WhatsApp',
                  onPress: () => { setShowContactModal(false); handleWhatsApp(); },
                  icon: <MessageCircle size={22} color="#FFF" />,
                  color: '#25D366',
                });
              }
              if (hasTelegram) {
                options.push({
                  key: 'telegram',
                  label: 'Telegram',
                  onPress: () => { setShowContactModal(false); handleTelegram(); },
                  icon: <Send size={22} color="#FFF" />,
                  color: '#229ED9',
                });
              }

              return (
                <View style={styles.contactModalOptions}>
                  {options.map((opt) => (
                    <TouchableOpacity
                      key={opt.key}
                      style={[styles.contactModalOption, { backgroundColor: opt.color }]}
                      onPress={opt.onPress}
                      activeOpacity={0.8}
                    >
                      {opt.icon}
                      <Text style={[styles.contactModalOptionText, opt.contentColor ? { color: opt.contentColor } : {}]}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              );
            })()}

            <TouchableOpacity
              style={[styles.contactModalCancel, { backgroundColor: colors.inputBackground }]}
              onPress={() => setShowContactModal(false)}
            >
              <Text style={[styles.contactModalCancelText, { color: colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
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
  headerRightActions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
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
    width: width,
    maxWidth: width,
  },
  section: {
    marginBottom: 24,
  },
  listingInfoCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  availabilityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22C55E',
    marginRight: 8,
  },
  title: {
    fontSize: 24,
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif' }),
    fontWeight: '600',
    marginBottom: 8,
  },
  chipContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
    alignItems: 'stretch',
    width: '100%',
  },
  availabilityChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  availabilityText: {
    fontSize: 12,
    fontWeight: '600',
  },
  listingIdChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  listingIdLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
    opacity: 0.9,
  },
  listingIdText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
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
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '50%',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  featureItemText: {
    fontSize: 16,
    marginLeft: 12,
  },
  mediaButtonsContainer: {
    marginBottom: 24,
    gap: 12,
    width: '100%',
  },
  mediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  mediaGridCard: {
    width: '47%',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
  },
  mediaGridLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    flexShrink: 1,
  },
  mediaButtonsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  mediaButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    minHeight: 48, // Ensure consistent minimum height
  },
  inactiveButton: {
    borderWidth: 1,
    opacity: 0.6,
  },
  tour3DButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#06B6D4', // Emerald green - modern, tech-forward color for VR/3D
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    // shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  tour3DIcon: {
    fontSize: 20,
    marginRight: 12,
    width: 24, // Match icon container width
    textAlign: 'center',
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
    paddingVertical: 10,
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
    width: 24, // Match icon container width
    textAlign: 'center',
  },
  messageButtonCenter: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageButtonText: {
    flex: 0,
  },
  messageIconContainer: {
    marginRight: 12,
    width: 24, // Match icon container width
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    gap: 12,
  },
  footerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  priceContainer: {
    flex: 1,
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
  ownerContainer: {
    flex: 1,
    alignItems: 'flex-end',
  },
  ownerLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  ownerName: {
    fontSize: 16,
    fontWeight: '600',
  },
  contactButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contactButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 30,
    minHeight: 48,
  },
  whatsappButton: {
    backgroundColor: '#25D366', // WhatsApp Green
  },
  telegramButton: {
    backgroundColor: '#229ED9', // Telegram Blue
  },
  contactButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    flexShrink: 0,
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
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Contact Options Modal
  contactModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  contactModalBackdrop: {
    flex: 1,
  },
  contactModalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 34,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
  },
  contactModalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  contactModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  contactModalSubtitle: {
    fontSize: 14,
    marginBottom: 24,
  },
  contactModalEmpty: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  contactModalEmptyText: {
    fontSize: 15,
  },
  contactModalOptions: {
    gap: 12,
    marginBottom: 16,
  },
  contactModalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    gap: 10,
  },
  contactModalOptionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  contactModalCancel: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  contactModalCancelText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

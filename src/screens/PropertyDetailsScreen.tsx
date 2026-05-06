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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
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
  X,
  Edit3,
  ImageIcon,
  Video,
  ChevronRight,
  MapPin,
  Instagram,
  ShieldCheck,
  AlertTriangle,
  Archive,
  ArchiveRestore,
  Trash2,
} from 'lucide-react-native';
import { Property } from '../types/Property';
import { propertyTypeToCategory } from '../utils/propertyCategory';
import { AMENITY_ICONS, type HospitalityAmenity } from '../utils/hospitalityAmenities';
import type { TranslationKeys } from '../locales';
import { TourHeroCard } from '../components/TourHeroCard';
import { ListingMetaTable } from '../components/ListingMetaTable';
import { getPropertyShareUrl } from '../constants';
import { formatPrice } from '../utils/formatPrice';
import { formatAddress } from '../utils/formatAddress';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { PropertyService } from '../services/PropertyService';
import { useAuth } from '../context/AuthContext';
import { useRole } from '../hooks/useRole';
import { Gated } from '../components/Gated';
import { RejectionBanner } from '../components/RejectionBanner';
import { NeedsMediaBanner } from '../components/NeedsMediaBanner';
import { StatusPill } from '../components/StatusPill';
import RejectListingModal from '../components/RejectListingModal';
import ArchiveListingModal from '../components/ArchiveListingModal';
import { DeleteListingModal } from '../components/DeleteListingModal';

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
  /** Admin: open document verification editor for this listing */
  onAdminVerifyDocuments?: (property: Property) => void;
  /** D-15: navigate parent (App.tsx) to CreateListingScreen edit mode for this property.
   *  Wired by Plan 08 — until then, the banner CTA is a no-op. */
  onEditListing?: (property: Property) => void;
  /** Phase 3 Plan 06 Task 02 — moderation action footer "Edit on behalf" dispatcher.
   *  Wired by App.tsx Task 04 to set propertyToEdit + moderatorContext + open
   *  CreateListingScreen. Footer renders only when can('approveListings') AND
   *  status === 'pending'. */
  onEditOnBehalfPressed?: (property: Property) => void;
  /** Phase 3 Plan 06 Task 02 — refresh hook used by the moderation action footer
   *  after Approve/Reject so the screen's `status` re-evaluates and the footer
   *  auto-hides. App.tsx may forward a parent-side reload OR the screen falls
   *  back to its own background fetch (the existing useEffect at the top of
   *  the component already self-refreshes on `initialProperty.id` change; this
   *  optional callback gives the parent a hook for additional side-effects
   *  like queue refetch). */
  onRefreshProperty?: () => Promise<void>;
  /** Phase 3 Plan 03-06 Task 2 — NeedsMediaBanner CTA target. App.tsx wires this to
   *  the openMediaCuration callback (Plan 03-05) so the mod can curate photos
   *  inline. Optional: when undefined, the banner is hidden (the showNeedsMediaBanner
   *  predicate gates the entire mount, but the prop's optionality keeps existing
   *  call sites tsc-green pre-wire). */
  onOpenMediaCuration?: (listingId: string) => void;
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
  onAdminVerifyDocuments,
  onEditListing,
  onEditOnBehalfPressed,
  onRefreshProperty,
  onOpenMediaCuration,
}) => {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const { t } = useLanguage();
  const { can } = useRole();
  const [property, setProperty] = useState<Property>(initialProperty);
  const [activeSlide, setActiveSlide] = useState(0);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isMapFullScreen, setIsMapFullScreen] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  // D-13: per-session in-memory dismiss for RejectionBanner. Local Set keyed by listing id.
  // NEVER AsyncStorage — banner re-evaluates on every navigation back to this screen.
  const [dismissedBanners, setDismissedBanners] = useState<Set<string>>(new Set());

  // D-13: owner-self check reuses the existing `property.owner?.uid === user?.localId` field-access
  // shape (matches the same pattern used elsewhere in this file via `property.owner` reads).
  const isOwnedByMe = !!user?.localId && property.owner?.uid === user.localId;

  // D-13 + D-07: gate the RejectionBanner mount — owner-self AND rejected-status AND not-yet-dismissed.
  const showRejectionBanner =
    isOwnedByMe &&
    (property.status ?? 'live') === 'rejected' &&
    !!property.id &&
    !dismissedBanners.has(property.id);

  const onEditResubmit = () => {
    onEditListing?.(property); // D-15 — Plan 08 wires App.tsx to open CreateListingScreen edit mode.
  };

  const onDismissBanner = () => {
    if (property.id) {
      const id = property.id;
      setDismissedBanners((prev) => {
        const next = new Set(prev);
        next.add(id);
        return next;
      });
    }
  };

  // Phase 6 (HOSP-04 / D-13) — derive category for in-place conditional renders
  const category = propertyTypeToCategory(property.propertyType);
  const isHospitality = category === 'Hospitality';
  const insets = useSafeAreaInsets();

  // Phase 6 (HOSP-04 / D-16) — sticky contact bar owner-field availability
  const owner = (property as any).owner;
  const hasWhatsApp = !!owner?.whatsapp;
  const hasTelegram = !!owner?.telegram;
  const hasPhone = !!owner?.phone;

  // Silently refresh property data in the background without blocking the UI.
  // The passed-in initialProperty is shown immediately.
  useEffect(() => {
    if (!initialProperty?.id) return;
    let cancelled = false;

    PropertyService.getPropertyById(initialProperty.id)
      .then(fresh => { if (!cancelled) setProperty(fresh); })
      .catch(() => {});

    return () => { cancelled = true; };
  }, [initialProperty?.id]);

  // Phase 3 Plan 06 Task 02 — moderation action footer state + handlers.
  // Footer renders when can('approveListings') AND property.status === 'pending'.
  // 409 race-condition handling per PATTERNS §C: close any open modal first,
  // fire MOD-15 toast, refetch.
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  // Phase 4 Plan 07 D-06 + D-08 + D-10 — mod/admin Archive + Restore + Hard-Delete affordances.
  // Same submittingAction gate covers all 5 mod actions (approve/reject/archive/restore/hard-delete).
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [isHardDeleteModalOpen, setIsHardDeleteModalOpen] = useState(false);
  const [submittingAction, setSubmittingAction] = useState(false);
  const showModFooter = can('approveListings') && property.status === 'pending';
  // Phase 3 Plan 03-06 Task 2 — NeedsMediaBanner trigger condition (UI-SPEC §"Trigger
  // conditions"). Renders ABOVE the existing mod action footer when the moderator
  // is viewing a pending listing that has no photos. Mutually exclusive with
  // RejectionBanner (pending != rejected) so no co-render stacking required.
  const photoCount = property?.media?.photos?.length ?? 0;
  const showNeedsMediaBanner =
    can('approveListings') &&
    property?.status === 'pending' &&
    photoCount === 0;
  // Phase 3 Plan 03-06 Task 2 / D-12 — Approve button enabled-state logic.
  // Client-side disable is UX guidance ONLY; backend Plan 03-03's MEDIA_REQUIRED
  // gate is the trust boundary (T-02 defense-in-depth).
  const isApproveEnabled = photoCount > 0;
  // Phase 4 Plan 07 D-06 — mod/admin Archive/Restore/Hard-Delete render predicates.
  // Backend HARD_DELETE_REQUIRES_ARCHIVED still gates non-archived listings via the
  // backend route's 400 response (Plan 04-04); the client predicate is permissive so
  // an admin can attempt the action and surface the backend's structured error if needed.
  const showArchiveBtn = can('archiveAnyListing') && property?.status !== 'archived';
  const showRestoreBtn = can('archiveAnyListing') && property?.status === 'archived';
  const showHardDeleteBtn = can('hardDeleteListing');

  // Refetch the local `property` state from the server. After approve/reject,
  // status flips off 'pending' and the footer auto-hides via showModFooter.
  // Also calls the optional parent callback (e.g., to refetch a queue overlay).
  const refetchProperty = async () => {
    if (!property.id) return;
    try {
      const fresh = await PropertyService.getPropertyById(property.id);
      setProperty(fresh);
    } catch {
      /* non-fatal — Alert was already surfaced by the caller's catch path */
    }
    if (onRefreshProperty) {
      try { await onRefreshProperty(); } catch { /* parent's problem */ }
    }
  };

  const handleRaceConflict = async () => {
    setIsRejectModalOpen(false);
    // WR-05 fix — was empty title; now uses a translated title for proper Alert framing.
    Alert.alert(t('moderation.race.title'), t('moderation.race.toast'));
    await refetchProperty();
  };

  const handleApprove = () => {
    Alert.alert(
      t('moderation.approve.confirmTitle'),
      t('moderation.approve.confirmMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('moderation.action.approve'),
          onPress: async () => {
            if (!property.id) return;
            setSubmittingAction(true);
            try {
              await PropertyService.approveListing(property.id);
              await refetchProperty();
            } catch (err: any) {
              if (err?.response?.status === 409) {
                await handleRaceConflict();
                return;
              }
              // WR-01 fix — generic translated fallback prevents empty-Alert UX.
              Alert.alert(
                t('common.error'),
                err?.response?.data?.message || err?.message || t('common.errorGeneric'),
              );
            } finally {
              setSubmittingAction(false);
            }
          },
        },
      ],
    );
  };

  const handleRejectSubmit = async (params: { reasonCode: any; reasonNote?: string }) => {
    if (!property.id) return;
    setSubmittingAction(true);
    try {
      await PropertyService.rejectListing(property.id, params.reasonCode, params.reasonNote);
      setIsRejectModalOpen(false);
      await refetchProperty();
    } catch (err: any) {
      if (err?.response?.status === 409) {
        await handleRaceConflict();
        return;
      }
      // WR-01 fix — generic translated fallback prevents empty-Alert UX.
      Alert.alert(
        t('common.error'),
        err?.response?.data?.message || err?.message || t('common.errorGeneric'),
      );
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleEditOnBehalf = () => {
    if (onEditOnBehalfPressed) onEditOnBehalfPressed(property);
  };

  // Phase 4 Plan 07 D-06 — mod/admin Archive submit (mirrors handleRejectSubmit shape).
  // Calls Plan 05's PropertyService.archiveAnyListing -> backend Plan 03 POST
  // /api/moderation/properties/:id/archive. Reuses Phase 3's 409 race-conflict path.
  const handleModArchiveSubmit = async (params: { reasonCode: any; reasonNote?: string }) => {
    if (!property.id) return;
    setSubmittingAction(true);
    try {
      await PropertyService.archiveAnyListing(property.id, params.reasonCode, params.reasonNote);
      setIsArchiveModalOpen(false);
      await refetchProperty();
    } catch (err: any) {
      if (err?.response?.status === 409) {
        await handleRaceConflict();
        return;
      }
      Alert.alert(
        t('common.error'),
        err?.response?.data?.message || err?.message || t('common.errorGeneric'),
      );
    } finally {
      setSubmittingAction(false);
    }
  };

  // Phase 4 Plan 07 D-06 + D-12 — Restore (owner OR mod-archived). Mirrors handleApprove's
  // Alert.alert flow. Uses PropertyService.restoreListing role-aware split (Plan 05 PATTERNS §10):
  // mod/admin -> POST /moderation/properties/:id/restore; owner -> POST /properties/:id/unarchive.
  // Locale values rewritten in Plan 07 Task 1 (D-12 + Pitfall 3 — keys preserved verbatim).
  const handleRestore = () => {
    Alert.alert(
      t('property.unarchiveDialogTitle'),
      t('property.unarchiveDialogMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('property.unarchiveConfirm'),
          onPress: async () => {
            if (!property.id) return;
            setSubmittingAction(true);
            try {
              await PropertyService.restoreListing(property.id);
              await refetchProperty();
            } catch (err: any) {
              if (err?.response?.status === 409) {
                await handleRaceConflict();
                return;
              }
              Alert.alert(
                t('common.error'),
                err?.response?.data?.message || err?.message || t('common.errorGeneric'),
              );
            } finally {
              setSubmittingAction(false);
            }
          },
        },
      ],
    );
  };

  // Phase 4 Plan 07 D-10 — Admin-only hard delete. Called from DeleteListingModal's onConfirm
  // (mounted as sibling to RejectListingModal). Backend Plan 04-04 enforces requireMinRole('admin')
  // + HARD_DELETE_REQUIRES_ARCHIVED 400 if status !== 'archived'.
  const confirmHardDelete = async () => {
    if (!property.id) return;
    setSubmittingAction(true);
    try {
      await PropertyService.hardDeleteListing(property.id);
      setIsHardDeleteModalOpen(false);
      Alert.alert(t('common.success'), t('property.permanentlyDeletedToast'));
      if (onRefreshProperty) {
        try { await onRefreshProperty(); } catch { /* parent's problem */ }
      }
    } catch (err: any) {
      Alert.alert(
        t('common.error'),
        err?.response?.data?.message || err?.message || t('common.errorGeneric'),
      );
    } finally {
      setSubmittingAction(false);
    }
  };

  // Phase 2 D-20 nested-shape derivations (Phase 1 D-04..D-15) — declared once at the top
  // of the render body so every downstream read site can consume the same locals. Safe-default
  // every nested chain so legacy listings missing nested data render without crashing.
  const titleText = property.content?.title ?? '';
  const descriptionText = property.content?.description ?? '';
  const cityLabel = property.location?.city ?? '';
  const districtLabel = property.location?.district ?? '';
  // Address line synthesized from nested location (no flat property.address on M3 shape).
  // Render slug-as-is — M4 owns dynamic-dictionary label lookup (Plan 02-05 D-10).
  const addressDisplay = [districtLabel, cityLabel].filter(Boolean).join(', ');
  const photos = property.media?.photos ?? [];
  const tourUrl = property.media?.tourUrl;
  const videoUrl = property.media?.videos?.[0];

  // Consolidate images into a single array. M3 nested = media.photos[]; if empty, fall back to placeholder.
  const images = photos.length > 0
    ? photos
    : ['https://via.placeholder.com/800'];

  const handleShare = async () => {
    // Generate shareable URL
    const propertyId = property.id || property.listingId || '';
    const shareUrl = getPropertyShareUrl(propertyId);

    // Create share message
    const priceText = formatPrice(property, t('property.perMonth'));
    const shareMessage = `${titleText}\n${addressDisplay}\n${priceText}\n\n${shareUrl}`;

    try {
      const result = await Share.share({
        message: shareMessage,
        url: shareUrl, // iOS will use this for universal links
        title: titleText,
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
        Alert.alert(t('common.error'), t('error.cannotOpen', { label }));
      }
    } else {
      Alert.alert(t('common.info'), t('error.noLabelAvailable', { label }));
    }
  };

  const handleWhatsApp = () => {
    const owner = (property as any).owner;
    if (!owner?.whatsapp) {
      Alert.alert(t('common.error'), t('error.noWhatsApp'));
      return;
    }

    // Clean phone number: remove all non-numeric characters
    const cleanPhone = owner.whatsapp.replace(/\D/g, '');

    const message = `Hi, I'm interested in your property: ${titleText}`;
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
      Alert.alert(t('common.error'), t('error.noTelegram'));
      return;
    }

    // Clean username: remove URL parts, @, and whitespace
    let username = owner.telegram.trim();
    username = username.replace(/(https?:\/\/)?(t\.me|telegram\.me)\//i, '');
    username = username.replace('@', '');

    if (!username) {
      Alert.alert(t('common.error'), t('error.invalidTelegram'));
      return;
    }

    const message = `Hi, I'm interested in your property: ${titleText}`;
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
      Alert.alert(t('common.error'), t('error.noEmail'));
      return;
    }

    const subject = encodeURIComponent(`Inquiry about: ${titleText}`);
    const body = encodeURIComponent(`Hi,\n\nI'm interested in your property: ${titleText}\n\nAddress: ${addressDisplay}\n\nPlease let me know if it's still available.\n\nThank you!`);
    const emailUrl = `mailto:${owner.email}?subject=${subject}&body=${body}`;

    Linking.openURL(emailUrl).catch(err => {
      console.error("Failed to open email", err);
      Alert.alert(t('common.error'), t('error.cannotOpenEmail'));
    });
  };

  const handlePhone = () => {
    const owner = (property as any).owner;
    if (!owner?.phone) {
      Alert.alert(t('common.error'), t('error.noPhone'));
      return;
    }
    const cleanPhone = owner.phone.replace(/\D/g, '');
    const telUrl = `tel:${cleanPhone}`;
    Linking.openURL(telUrl).catch(err => {
      console.error("Failed to open phone", err);
      Alert.alert(t('common.error'), t('error.cannotOpenPhone'));
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

  // Get property coordinates - use real nested coordinates if available, otherwise generate mock.
  // Phase 2 D-20 cutover: reads `location?.coordinates?.lat/lng` (nested) per Phase 1 D-04..D-15.
  // Hash-fallback preserved verbatim from PropertyMap.tsx (Plan 02-05) so listings without
  // coordinates render a stable demo pin within Bishkek.
  const getPropertyCoordinates = () => {
    const lat = property.location?.coordinates?.lat;
    const lng = property.location?.coordinates?.lng;
    if (lat != null && lng != null) {
      return {
        latitude: lat,
        longitude: lng,
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
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t('property.details')}</Text>
        <View style={styles.headerRightActions}>
          <Gated action="editVerifications">
            {onAdminVerifyDocuments && (
              <TouchableOpacity
                style={[styles.iconButton, { backgroundColor: colors.surface }]}
                onPress={() => onAdminVerifyDocuments(property)}
                accessibilityLabel={t('verification.screenTitle')}
              >
                <ShieldCheck size={22} color={colors.accent} />
              </TouchableOpacity>
            )}
          </Gated>
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

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          isHospitality && { paddingBottom: 80 + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* D-13 / MOD-08: RejectionBanner — owner viewing own rejected listing only.
            Mounted at the TOP of content (above the hero carousel). Per-session dismiss
            via local Set; navigating away unmounts and resets. */}
        {showRejectionBanner && (
          <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
            <RejectionBanner
              reasonCode={property.rejectionReasonCode}
              reasonNote={property.rejectionReasonNote}
              onEditResubmit={onEditResubmit}
              onDismiss={onDismissBanner}
            />
          </View>
        )}

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
                {/* Phase 2 D-20 cutover: M2 flat `type === 'rent'` → M3 nested `dealType !== 'sale'`.
                    Tradeoff §K mirror — same caller-side derivation as Plan 02-05's list screens. */}
                {property.dealType !== 'sale' ? t('property.forRent') : t('property.forSale')}
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
            {/* Hero 3D Tour Card - platform-specific component.
                Phase 2 D-20 cutover: M2 flat `is3DTourAvailable && tours[]` → M3 nested
                `media.tourUrl` (Phase 1 D-12 first-tour-wins flatten). Single string ⇒
                tourCount is always 0 or 1. */}
            <TourHeroCard
              isActive={!!tourUrl}
              tourCount={tourUrl ? 1 : 0}
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
                onPress={property.instagramUrl ? () => handleOpenLink(property.instagramUrl, t('property.instagram')) : undefined}
                disabled={!property.instagramUrl}
              >
                <Instagram
                  size={24}
                  color={property.instagramUrl ? colors.text : colors.textSecondary}
                  strokeWidth={1.5}
                />
                <Text style={[styles.mediaGridLabel, { color: property.instagramUrl ? colors.text : colors.textSecondary }]} numberOfLines={1} ellipsizeMode="tail">{t('property.instagram')}</Text>
                <ChevronRight size={20} color={property.instagramUrl ? colors.textSecondary : colors.textTertiary} />
              </TouchableOpacity>

              {/* Photos tile — M3 nested has no separate panoramic URL field; use the first
                  hero photo from media.photos[0] as the open-target. If no photos, tile is disabled.
                  Phase 2 D-20 cutover (panoramicPhotosUrl deprecated; not in nested Property type). */}
              {(() => {
                const photoTarget = photos[0];
                const photoActive = !!photoTarget && !!onOpenPhotos;
                return (
                  <TouchableOpacity
                    style={[
                      styles.mediaGridCard,
                      { backgroundColor: colors.surface, borderColor: colors.border },
                      !photoActive && { opacity: 0.6 }
                    ]}
                    onPress={photoActive ? () => onOpenPhotos!(photoTarget!) : undefined}
                    disabled={!photoActive}
                  >
                    <ImageIcon size={24} color={photoActive ? colors.text : colors.textSecondary} />
                    <Text style={[styles.mediaGridLabel, { color: photoActive ? colors.text : colors.textSecondary }]} numberOfLines={1} ellipsizeMode="tail">{t('property.photos')}</Text>
                    <ChevronRight size={20} color={photoActive ? colors.textSecondary : colors.textTertiary} />
                  </TouchableOpacity>
                );
              })()}

              {/* Videos tile — Phase 2 D-20 cutover: M2 flat `property.videoUrl` → M3 nested
                  `media.videos[0]` (Phase 1 schema). Local `videoUrl` const captured above. */}
              <TouchableOpacity
                style={[
                  styles.mediaGridCard,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                  !videoUrl && { opacity: 0.6 }
                ]}
                onPress={videoUrl ? () => handleOpenLink(videoUrl, t('property.videos')) : undefined}
                disabled={!videoUrl}
              >
                <Video size={24} color={videoUrl ? colors.text : colors.textSecondary} />
                <Text style={[styles.mediaGridLabel, { color: videoUrl ? colors.text : colors.textSecondary }]} numberOfLines={1} ellipsizeMode="tail">{t('property.videos')}</Text>
                <ChevronRight size={20} color={videoUrl ? colors.textSecondary : colors.textTertiary} />
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
                <Text style={[styles.mediaGridLabel, { color: property.owner ? colors.text : colors.textSecondary }]} numberOfLines={1} ellipsizeMode="tail">{t('property.message')}</Text>
                <ChevronRight size={20} color={property.owner ? colors.textSecondary : colors.textTertiary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Title, ID, Availability, Address - in a card */}
          <View style={styles.section}>
            <View style={[styles.listingInfoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.title, { color: colors.text }]}>{titleText}</Text>
              {/* D-19 / MOD-07: status pill inline below title for non-live statuses.
                  Owner sees this for pending/rejected/archived; mods/admins see it via D-06
                  visibility branch. Anonymous never reaches a non-live listing (server 404). */}
              {(property.status ?? 'live') !== 'live' && (
                <View style={{ marginTop: 6, marginBottom: 4 }}>
                  <StatusPill status={property.status} />
                </View>
              )}
              {/* Phase 2 D-20 cutover: ListingMetaTable now opts in to extras grid via the
                  optional `property` prop (basics + conditionAndAmenities + terms rows).
                  Plan 02-05 added the prop; PropertyDetailsScreen is the call site that uses it. */}
              <ListingMetaTable
                listingId={property.listingId}
                availableDate={property.availableDate}
                showAvailabilityDot
                property={property}
              />
              {(() => {
                const formatted = formatAddress(addressDisplay);
                return (
                  <View style={styles.addressRow}>
                    <View style={{ marginRight: 6, marginTop: 2 }}>
                      <MapPin size={16} color={colors.textSecondary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.address, { color: colors.textSecondary, marginBottom: 0 }]} numberOfLines={1} ellipsizeMode="tail">{formatted.line1}</Text>
                      {formatted.line2 ? (
                        <Text style={[styles.address, { color: colors.textSecondary, marginBottom: 0 }]} numberOfLines={1} ellipsizeMode="tail">{formatted.line2}</Text>
                      ) : null}
                    </View>
                  </View>
                );
              })()}
            </View>
          </View>

          {/* Specs (Residential / Commercial only — Hospitality uses rooms/maxGuests/amenities semantics).
              Phase 2 D-20 cutover: M2 flat `specs.{beds,baths,sqft}` → M3 nested
              `basics.{rooms,bathroom,areaSqm}`. Bathroom enum (private/shared/none) rendered
              via the same i18n keys Plan 02-05 added. Numeric/string fallback to '-' so legacy
              listings without basics still render the row. */}
          {!isHospitality && (
            <View style={[styles.specsContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.specItem}>
                <Text style={styles.specIcon}>🛏</Text>
                <Text style={[styles.specValue, { color: colors.text }]}>{property.basics?.rooms ?? '-'}</Text>
                <Text style={[styles.specLabel, { color: colors.textSecondary }]}>{t('property.beds')}</Text>
              </View>
              <View style={[styles.verticalDivider, { backgroundColor: colors.border }]} />
              <View style={styles.specItem}>
                <Text style={styles.specIcon}>🚿</Text>
                <Text style={[styles.specValue, { color: colors.text }]}>
                  {property.basics?.bathroom === 'private'
                    ? t('property.bathroomPrivate' as any)
                    : property.basics?.bathroom === 'shared'
                      ? t('property.bathroomShared' as any)
                      : property.basics?.bathroom === 'none'
                        ? t('property.bathroomNone' as any)
                        : '-'}
                </Text>
                <Text style={[styles.specLabel, { color: colors.textSecondary }]}>{t('property.baths')}</Text>
              </View>
              <View style={[styles.verticalDivider, { backgroundColor: colors.border }]} />
              <View style={styles.specItem}>
                <Text style={styles.specIcon}>📐</Text>
                <Text style={[styles.specValue, { color: colors.text }]}>{property.basics?.areaSqm ?? '-'}</Text>
                <Text style={[styles.specLabel, { color: colors.textSecondary }]}>m²</Text>
              </View>
            </View>
          )}

          {/* Description — Phase 2 D-20 cutover: M2 flat `description` → M3 nested `content.description`. */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('property.description')}</Text>
            <View style={[styles.sectionContentBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.description, { color: colors.text }]}>
                {descriptionText}
              </Text>
            </View>
          </View>

          {/* Features - title + box with two-column grid (Phase 6 / D-23: amenity chip grid for Hospitality) */}
          {isHospitality ? (
            (property.amenities ?? []).length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  {t('hospitality.amenities')}
                </Text>
                <View style={[styles.sectionContentBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={styles.featuresGrid}>
                    {((property.amenities || []) as HospitalityAmenity[]).map((token) => {
                      const Icon = AMENITY_ICONS[token] ?? Check;
                      return (
                        <View key={token} style={styles.featureItem}>
                          <Icon size={20} color={colors.textSecondary} />
                          <Text
                            style={[styles.featureItemText, { color: colors.text }]}
                            numberOfLines={1}
                            ellipsizeMode="tail"
                          >
                            {t(`amenity.${token}` as TranslationKeys)}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              </View>
            )
          ) : (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('property.whatThisPlaceOffers')}</Text>
              <View style={[styles.sectionContentBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.featuresGrid}>
                  {/* Phase 2 D-20 cutover: optional-chain on `features` (top-level optional in M3 type). */}
                  {(property.features ?? []).map((feature, index) => {
                    const IconComponent = getFeatureIcon(feature);
                    return (
                      <View key={index} style={styles.featureItem}>
                        <IconComponent size={20} color={colors.textSecondary} />
                        <Text
                          style={[styles.featureItemText, { color: colors.text }]}
                          numberOfLines={1}
                          ellipsizeMode="tail"
                        >
                          {feature}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            </View>
          )}

          {/* Location Map */}
          <View style={styles.section}>
            <View style={styles.locationHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('property.location')}</Text>
            </View>
            {/* Phase 2 D-20 cutover: M2 flat `address` → derived nested `addressDisplay` (location.city + district). */}
            <Text style={[styles.address, { color: colors.textSecondary, marginBottom: 12 }]}>{addressDisplay}</Text>
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
                {/* Map embed site #1 — propertyCoordinates already reads location?.coordinates?.lat/lng. */}
                <Marker
                  coordinate={propertyCoordinates}
                  title={titleText}
                  description={addressDisplay}
                />
              </MapView>
              {/* Elegant floating button to open full screen */}
              <TouchableOpacity
                style={[styles.mapOverlayButton, { backgroundColor: colors.surface, shadowColor: colors.cardShadow }]}
                onPress={() => setIsMapFullScreen(true)}
                activeOpacity={0.8}
              >
                <Text style={{ fontSize: 20, marginRight: 6 }}>🗺️</Text>
                <Text style={[styles.mapOverlayButtonText, { color: colors.text }]}>{t('property.fullScreen')}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {(() => {
            const pv = property.platformVerifications;
            const rows: { key: string; label: string }[] = [];
            if (pv?.ownershipDocuments) rows.push({ key: 'o', label: t('verification.ownershipDocuments') });
            if (pv?.ownerIdentityVerified) rows.push({ key: 'i', label: t('verification.ownerIdentity') });
            if (pv?.stateIssuedDocumentsVerified) rows.push({ key: 's', label: t('verification.stateIssued') });
            const hasVerifiedItems = rows.length > 0;

            if (hasVerifiedItems) {
              return (
                <View style={styles.section}>
                  <View style={styles.verificationHeaderRow}>
                    <View style={styles.verificationIconColumn}>
                      <ShieldCheck size={22} color={colors.accent} />
                    </View>
                    <View style={styles.verificationHeaderTextColumn}>
                      <Text style={[styles.verificationTitle, { color: colors.text }]}>{t('verification.sectionTitle')}</Text>
                      <Text style={[styles.verificationSubtitle, { color: colors.textSecondary }]}>
                        {t('verification.subtitle')}
                      </Text>
                    </View>
                  </View>
                  <View style={[styles.verificationList, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    {rows.map((row) => (
                      <View key={row.key} style={styles.verificationRow}>
                        <Check size={18} color="#22C55E" strokeWidth={2.5} />
                        <Text style={[styles.verificationRowText, { color: colors.text }]}>{row.label}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              );
            }

            return (
              <View style={styles.section}>
                <View
                  style={[
                    styles.verificationWarningBox,
                    {
                      backgroundColor: isDark ? 'rgba(234, 179, 8, 0.12)' : '#FFFBEB',
                      borderColor: isDark ? 'rgba(234, 179, 8, 0.45)' : '#FDE68A',
                    },
                  ]}
                >
                  <View style={styles.verificationWarningHeader}>
                    <AlertTriangle size={22} color="#D97706" />
                    <Text style={[styles.verificationWarningTitle, { color: colors.text }]}>
                      {t('verification.unverifiedTitle')}
                    </Text>
                  </View>
                  <Text style={[styles.verificationWarningBody, { color: colors.textSecondary }]}>
                    {t('verification.unverifiedBody')}
                  </Text>
                </View>
              </View>
            );
          })()}

          {/* Agent Info — Phase 2 D-20 cutover: M2 demo `property.agent` field deprecated;
              not present on the M3 nested Property type. Block kept as `as any` legacy guard so
              that any latent flat-shape data still renders the historical card; new M3 listings
              skip this section (owner is rendered separately in the footer/sticky-bar via
              `property.owner`). */}
          {(() => {
            const legacyAgent = (property as any).agent;
            if (!legacyAgent) return null;
            return (
              <View style={[styles.agentContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.agentInfo}>
                  <View style={[styles.agentAvatar, { backgroundColor: colors.inputBackground }]}>
                    <Text style={[styles.agentInitial, { color: colors.textSecondary }]}>
                      {legacyAgent.name?.charAt(0) || '?'}
                    </Text>
                  </View>
                  <View>
                    <Text style={[styles.agentName, { color: colors.text }]}>
                      {legacyAgent.name || 'Contact Owner'}
                    </Text>
                    {legacyAgent.rating && legacyAgent.reviews && (
                      <Text style={[styles.agentRating, { color: colors.textSecondary }]}>
                        ⭐ {legacyAgent.rating} ({legacyAgent.reviews} reviews)
                      </Text>
                    )}
                  </View>
                </View>
                <TouchableOpacity style={[styles.messageButton, { backgroundColor: colors.primaryLight }]}>
                  <Text style={{ fontSize: 18, color: colors.text }}>✉️</Text>
                </TouchableOpacity>
              </View>
            );
          })()}

        </View>
      </ScrollView>

      {/* Footer Action — suppressed for Hospitality; replaced by hospitalityContactBar below */}
      {!isHospitality && (
        <View style={[styles.footer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          {/* First Row: Price and Owner Name */}
          <View style={styles.footerTopRow}>
            <View style={styles.priceContainer}>
              <Text style={[styles.priceLabel, { color: colors.textSecondary }]}>{t('property.price')}</Text>
              <Text style={[styles.footerPrice, { color: colors.text }]}>{formatPrice(property, t('property.perMonth'))}</Text>
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
                  <Text style={[styles.ownerLabel, { color: colors.textSecondary }]}>{t('property.landlord')}</Text>
                  <Text style={[styles.ownerName, { color: colors.text, textDecorationLine: 'underline' }]}>{ownerName}</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.ownerContainer}>
                  <Text style={[styles.ownerLabel, { color: colors.textSecondary }]}>{t('property.landlord')}</Text>
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
              {t('property.contactNow')}
            </Text>
          </TouchableOpacity>
        </View>
      )}

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
              {/* Map embed site #2 — propertyCoordinates already reads location?.coordinates?.lat/lng. */}
              <Marker
                coordinate={propertyCoordinates}
                title={titleText}
                description={addressDisplay}
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

          {/* Address info at bottom — Phase 2 D-20 cutover: M2 flat `address` → derived `addressDisplay`. */}
          <View style={[styles.fullScreenMapFooter, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
            <Text style={[styles.fullScreenMapAddress, { color: colors.text }]}>{addressDisplay}</Text>
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
            <Text style={[styles.contactModalTitle, { color: colors.text }]}>{t('property.contactListingOwner')}</Text>
            <Text style={[styles.contactModalSubtitle, { color: colors.textSecondary }]}>
              {t('property.contactModalSubtitle')}
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
                      {t('property.noContactOptions')}
                    </Text>
                  </View>
                );
              }

              const options: Array<{ key: string; label: string; onPress: () => void; icon: React.ReactNode; color: string; contentColor?: string }> = [];
              const inAppMessageContentColor = isDark ? '#121212' : '#FFFFFF';
              if (hasScheduleViewing) {
                options.push({
                  key: 'schedule',
                  label: t('property.scheduleViewing'),
                  onPress: () => { setShowContactModal(false); onScheduleViewing?.(property); },
                  icon: <Calendar size={22} color={inAppMessageContentColor} />,
                  color: '#06B6D4',
                  contentColor: inAppMessageContentColor,
                });
              }
              if (hasInternalMessage) {
                options.push({
                  key: 'message',
                  label: t('property.inAppMessage'),
                  onPress: handleInternalMessage,
                  icon: <MessageCircle size={22} color={inAppMessageContentColor} />,
                  color: colors.primary,
                  contentColor: inAppMessageContentColor,
                });
              }
              if (hasEmail) {
                options.push({
                  key: 'email',
                  label: t('property.email'),
                  onPress: () => { setShowContactModal(false); handleEmail(); },
                  icon: <Mail size={22} color="#FFF" />,
                  color: '#6B7280',
                });
              }
              if (hasPhone) {
                options.push({
                  key: 'phone',
                  label: t('property.phoneCall'),
                  onPress: () => { setShowContactModal(false); handlePhone(); },
                  icon: <Phone size={22} color="#FFF" />,
                  color: '#10B981',
                });
              }
              if (hasWhatsApp) {
                options.push({
                  key: 'whatsapp',
                  label: t('property.whatsapp'),
                  onPress: () => { setShowContactModal(false); handleWhatsApp(); },
                  icon: <MessageCircle size={22} color="#FFF" />,
                  color: '#25D366',
                });
              }
              if (hasTelegram) {
                options.push({
                  key: 'telegram',
                  label: t('property.telegram'),
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
              <Text style={[styles.contactModalCancelText, { color: colors.textSecondary }]}>{t('common.cancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Phase 6 (HOSP-04 / D-16) — Hospitality sticky contact bar (landlord row + 3 buttons, disabled-when-empty) */}
      {isHospitality && (
        <View
          style={[
            styles.hospitalityContactBar,
            {
              backgroundColor: colors.surface,
              borderTopColor: colors.border,
              paddingBottom: Math.max(insets.bottom, 12),
            },
          ]}
        >
          {(() => {
            const ownerName = owner ? `${owner.firstName || ''} ${owner.lastName || ''}`.trim() || 'Owner' : null;
            const ownerUid = owner?.uid;
            const canViewListings = ownerName && ownerUid && onLandlordPress;
            if (!ownerName) return null;
            return canViewListings ? (
              <TouchableOpacity
                onPress={() => onLandlordPress(ownerUid, ownerName)}
                activeOpacity={0.7}
                style={styles.hospitalityLandlordRow}
              >
                <Text style={[styles.ownerLabel, { color: colors.textSecondary }]}>{t('property.landlord')}</Text>
                <Text style={[styles.ownerName, { color: colors.text, textDecorationLine: 'underline' }]}>{ownerName}</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.hospitalityLandlordRow}>
                <Text style={[styles.ownerLabel, { color: colors.textSecondary }]}>{t('property.landlord')}</Text>
                <Text style={[styles.ownerName, { color: colors.text }]}>{ownerName}</Text>
              </View>
            );
          })()}
          <View style={styles.hospitalityContactBtnRow}>
            <TouchableOpacity
              style={[
                styles.hospitalityContactBtn,
                {
                  backgroundColor: hasWhatsApp ? '#25D366' : colors.inputBackground,
                  opacity: hasWhatsApp ? 1 : 0.4,
                },
              ]}
              onPress={hasWhatsApp ? handleWhatsApp : undefined}
              disabled={!hasWhatsApp}
              accessibilityRole="button"
              accessibilityLabel={t('property.whatsapp')}
            >
              <MessageCircle size={22} color={hasWhatsApp ? '#FFFFFF' : colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.hospitalityContactBtn,
                {
                  backgroundColor: hasTelegram ? '#0088CC' : colors.inputBackground,
                  opacity: hasTelegram ? 1 : 0.4,
                },
              ]}
              onPress={hasTelegram ? handleTelegram : undefined}
              disabled={!hasTelegram}
              accessibilityRole="button"
              accessibilityLabel={t('property.telegram')}
            >
              <Send size={22} color={hasTelegram ? '#FFFFFF' : colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.hospitalityContactBtn,
                {
                  backgroundColor: hasPhone ? '#10B981' : colors.inputBackground,
                  opacity: hasPhone ? 1 : 0.4,
                },
              ]}
              onPress={hasPhone ? handlePhone : undefined}
              disabled={!hasPhone}
              accessibilityRole="button"
              accessibilityLabel={t('property.phoneCall')}
            >
              <Phone size={22} color={hasPhone ? '#FFFFFF' : colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Phase 3 Plan 03-06 Task 2 — NeedsMediaBanner. Renders ABOVE the mod
          action footer when the moderator views a pending listing with no
          photos. CTA dispatches the App.tsx-forwarded openMediaCuration callback. */}
      {showNeedsMediaBanner && (
        <NeedsMediaBanner
          onAddPhotos={() => onOpenMediaCuration?.(String(property.id))}
        />
      )}

      {/* Phase 3 Plan 03-06 Task 2 — Approve disabled hint. Rendered ABOVE the
          3-button row (NOT below — UI-SPEC §Surface 4c — placement above so
          Reject / Edit-on-behalf are not pushed off-screen on small devices).
          Reuses the Plan 03-05 hint key (already in en.ts + ru.ts). */}
      {showModFooter && !isApproveEnabled && (
        <View
          style={{
            paddingHorizontal: 16,
            paddingTop: 8,
            paddingBottom: 0,
            backgroundColor: colors.surface,
          }}
          testID="property-details-approve-disabled-hint"
        >
          <Text
            style={{
              fontSize: 12,
              fontWeight: '400',
              lineHeight: 16,
              color: colors.textSecondary,
            }}
          >
            {t('moderation.mediaCuration.approve.disabled.hint')}
          </Text>
        </View>
      )}

      {/* Phase 3 Plan 06 Task 02 — moderation action footer.
          Mounts when can('approveListings') AND property.status === 'pending'.
          Belt-and-suspenders with backend's requireMinRole('moderator') gate.
          Footer auto-hides after refetchProperty() flips status off 'pending'.
          Phase 3 Plan 03-06 Task 2 / D-12: Approve button is additionally disabled
          (with 0.5 opacity) when photoCount === 0 — UX guidance for the backend
          MEDIA_REQUIRED gate. */}
      {showModFooter && (
        <View
          style={[
            styles.modActionFooter,
            {
              backgroundColor: colors.surface,
              borderTopColor: colors.border,
              paddingBottom: Math.max(insets.bottom, 12),
            },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.modActionBtn,
              { backgroundColor: '#059669' /* success green */ },
              !isApproveEnabled && { opacity: 0.5 },
            ]}
            onPress={handleApprove}
            disabled={submittingAction || !isApproveEnabled}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={t('moderation.action.approve')}
            accessibilityState={{ disabled: submittingAction || !isApproveEnabled }}
            testID="property-details-approve-btn"
          >
            {submittingAction ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <>
                <Check size={18} color="#FFF" />
                <Text style={styles.modActionBtnText}>{t('moderation.action.approve')}</Text>
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modActionBtn, { backgroundColor: '#DC2626' /* error red */ }]}
            onPress={() => setIsRejectModalOpen(true)}
            disabled={submittingAction}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={t('moderation.action.reject')}
          >
            <X size={18} color="#FFF" />
            <Text style={styles.modActionBtnText}>{t('moderation.action.reject')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.modActionBtn,
              { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
            ]}
            onPress={handleEditOnBehalf}
            disabled={submittingAction}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={t('moderation.action.editOnBehalf')}
          >
            <Edit3 size={18} color={colors.text} />
            <Text style={[styles.modActionBtnText, { color: colors.text }]}>
              {t('moderation.action.editOnBehalf')}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Phase 4 Plan 07 D-06 — mod/admin Archive/Restore/Hard-Delete action footer.
          Renders only when at least one of the 3 buttons should show (otherwise the
          row would be an empty bar). For pending listings, this row renders BELOW
          the existing 3-button Approve/Reject/Edit-on-behalf row (mod sees BOTH per
          CONTEXT.md D-06 verbatim — Archive becomes the take-down option for pending
          listings the mod judges aren't worth approving OR rejecting).
          Reuses existing modActionFooter / modActionBtn / modActionBtnText styles. */}
      {(showArchiveBtn || showRestoreBtn || showHardDeleteBtn) && (
        <View
          style={[
            styles.modActionFooter,
            {
              backgroundColor: colors.surface,
              borderTopColor: colors.border,
              paddingBottom: Math.max(insets.bottom, 12),
            },
          ]}
        >
          {showArchiveBtn && (
            <TouchableOpacity
              style={[styles.modActionBtn, { backgroundColor: '#D97706' /* amber — archive convention */ }]}
              onPress={() => setIsArchiveModalOpen(true)}
              disabled={submittingAction}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={t('property.archive')}
            >
              <Archive size={18} color="#FFF" />
              <Text style={styles.modActionBtnText}>{t('property.archive')}</Text>
            </TouchableOpacity>
          )}
          {showRestoreBtn && (
            <TouchableOpacity
              style={[styles.modActionBtn, { backgroundColor: '#059669' /* emerald — restorative */ }]}
              onPress={handleRestore}
              disabled={submittingAction}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={t('property.unarchive')}
            >
              <ArchiveRestore size={18} color="#FFF" />
              <Text style={styles.modActionBtnText}>{t('property.unarchive')}</Text>
            </TouchableOpacity>
          )}
          {showHardDeleteBtn && (
            <TouchableOpacity
              style={[styles.modActionBtn, { backgroundColor: colors.error }]}
              onPress={() => setIsHardDeleteModalOpen(true)}
              disabled={submittingAction}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={t('common.delete')}
            >
              <Trash2 size={18} color="#FFF" />
              <Text style={styles.modActionBtnText}>{t('common.delete')}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Phase 3 Plan 06 Task 02 — RejectListingModal sibling mount.
          Reusable modal extracted by Plan 04 (Task 03-04-01); same component
          mounts in ModerationQueueScreen. Parent owns the HTTP call via
          handleRejectSubmit. */}
      <RejectListingModal
        visible={isRejectModalOpen}
        onClose={() => setIsRejectModalOpen(false)}
        onSubmit={handleRejectSubmit}
        submitting={submittingAction}
      />

      {/* Phase 4 Plan 07 D-06 + D-08 — ArchiveListingModal sibling mount (mod/admin only). */}
      <ArchiveListingModal
        visible={isArchiveModalOpen}
        onClose={() => setIsArchiveModalOpen(false)}
        onSubmit={handleModArchiveSubmit}
        submitting={submittingAction}
      />

      {/* Phase 4 Plan 07 D-10 — DeleteListingModal sibling mount (admin only).
          Hard-delete UX moved here from RenterListingsScreen (Plan 07 Task 2 atomic strip). */}
      <DeleteListingModal
        visible={isHardDeleteModalOpen}
        onClose={() => setIsHardDeleteModalOpen(false)}
        onConfirm={confirmHardDelete}
        property={property}
      />
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
    alignItems: 'flex-start',
    marginTop: 8,
  },
  title: {
    fontSize: 24,
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif' }),
    fontWeight: '600',
    marginBottom: 8,
  },
  address: {
    fontSize: 16,
    lineHeight: 20,
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
    marginTop: 16,
    marginBottom: 12,
  },
  verificationHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 8,
    marginBottom: 12,
  },
  verificationIconColumn: {
    width: 28,
    paddingTop: 2,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  verificationHeaderTextColumn: {
    flex: 1,
    paddingLeft: 4,
  },
  verificationTitle: {
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 24,
    marginBottom: 6,
  },
  verificationSubtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  verificationWarningBox: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  verificationWarningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  verificationWarningTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 22,
  },
  verificationWarningBody: {
    fontSize: 14,
    lineHeight: 21,
  },
  verificationList: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  verificationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  verificationRowText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '500',
  },
  sectionContentBox: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    marginTop: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
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
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  featureItemText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
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
    width: '100%',
  },
  mediaGridCard: {
    flex: 1,
    minWidth: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
  },
  mediaGridLabel: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    flexShrink: 1,
    minWidth: 0,
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
  // Phase 6 (HOSP-04 / D-16) — Hospitality sticky contact bar
  hospitalityContactBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'column',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  hospitalityLandlordRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  hospitalityContactBtnRow: {
    flexDirection: 'row',
    gap: 12,
  },
  hospitalityContactBtn: {
    flex: 1,
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Phase 3 Plan 06 Task 02 — moderation action footer styles.
  // Per UI-SPEC §"Spacing Scale > Action footer geometry on PropertyDetailsScreen":
  // 3-button row, gap 8, padding 16, top border 1px on colors.border.
  modActionFooter: {
    flexDirection: 'row',
    gap: 8,
    padding: 16,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  modActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  modActionBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
});

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  StatusBar,
  Alert,
  ActivityIndicator,
  Switch,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useRole } from '../hooks/useRole';
import { Gated } from '../components/Gated';
import { useLanguage } from '../context/LanguageContext';
import { PropertyService } from '../services/PropertyService';
import { AuthService } from '../services/AuthService';
import { Property } from '../types/Property';
import * as ImagePicker from 'react-native-image-picker';
import { propertyTypeToCategory } from '../utils/propertyCategory';
import {
  BasicInfoSection,
  ResidentialSection,
  CommercialSection,
  HospitalitySection,
  MediaSection,
  PriceSection,
  VerificationSection,
  type FormBag,
  type SectionProps,
} from '../components/CreateListingForm';

interface CreateListingScreenProps {
  onBack: () => void;
  onSuccess: () => void; // Navigate to renter's listings page
  propertyToEdit?: Property; // Optional property to edit
  /** Admin-only: minimal screen to PATCH verification flags (e.g. from property details) */
  verificationOnly?: boolean;
}

/**
 * CreateListingScreen — orchestrator (Phase 4 Plan 04-06).
 *
 * Reduced from a ~1400-LOC monolith to a thin composer over seven sub-components
 * imported from `../components/CreateListingForm`. All persistent form state still
 * lives here (28+ `useState` hooks) — sub-components are pure presentation and
 * receive `(values, onChange, errors)` via `SectionProps`.
 *
 * LOAD-BEARING invariants preserved (MUST NOT regress):
 *   - D-09 anchor A: the rehydrate useEffect below restores panoramicPhotosUrl
 *     from propertyToEdit for EVERY user including non-admin (search this file
 *     for `setPanoramic` inside the rehydrate path)
 *   - D-09 anchor B: the handleSubmit payload below sends panoramicPhotosUrl
 *     UNCONDITIONALLY (no can('editPanoramicUrl') ternary guarding it)
 *   - D-09 anchor C: the handleSubmit payload below sends tours UNCONDITIONALLY
 *     (ternary is `tours.length > 0 ? tours : undefined`, NOT guarded by role)
 *   - Phase 3 Gated wraps: 2 inside MediaSection (editMatterportUrl whole-section
 *     + editPanoramicUrl element-scope) + 1 here around VerificationSection call
 *     site (editVerifications) = 3 in tree
 *   - verificationOnly admin-only branch (below) is UNTOUCHED — renders its own
 *     minimal screen called from PropertyDetailsScreen
 *
 * Category is DERIVED via propertyTypeToCategory(values.propertyType) — never
 * stored in FormBag, never sent in the submit payload.
 */
export const CreateListingScreen: React.FC<CreateListingScreenProps> = ({
  onBack,
  onSuccess,
  propertyToEdit,
  verificationOnly = false,
}) => {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const { t } = useLanguage();

  // ---------------------------------------------------------------------------
  // Form state — single orchestrator source of truth (MUST NOT MOVE per
  // PATTERNS.md §15). Sub-components read via `values.*` and dispatch mutations
  // through the `onChange` closure below.
  // ---------------------------------------------------------------------------
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('Bishkek');
  const [district, setDistrict] = useState('');
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState<string>(''); // User must select USD or сом
  const [type, setType] = useState<'rent' | 'sale'>('rent');
  const [propertyType, setPropertyType] = useState('Apartment');
  const [bedrooms, setBedrooms] = useState('');
  const [bathrooms, setBathrooms] = useState('');
  const [areaSqm, setAreaSqm] = useState('');
  const [rooms, setRooms] = useState('');
  const [maxGuests, setMaxGuests] = useState('');
  const [amenities, setAmenities] = useState<string[]>([]);
  const [features, setFeatures] = useState<string[]>([]);
  const [featureInput, setFeatureInput] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [panoramicPhotosUrl, setPanoramicPhotosUrl] = useState('');
  const [instagramUrl, setInstagramUrl] = useState('');
  const [availableDate, setAvailableDate] = useState('');
  const [status, setStatus] = useState<'draft' | 'live'>('draft');

  // Images state
  const [selectedImages, setSelectedImages] = useState<any[]>([]);

  // Matterport tours state
  const [tours, setTours] = useState<Array<{ id: string; title: string; url: string }>>([]);
  const [tourTitle, setTourTitle] = useState('');
  const [tourUrl, setTourUrl] = useState('');

  // Contact info (auto-filled from profile)
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactWhatsapp, setContactWhatsapp] = useState('');
  const [contactTelegram, setContactTelegram] = useState('');

  const [loading, setLoading] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(!verificationOnly);

  const [verifyOwnership, setVerifyOwnership] = useState(false);
  const [verifyOwnerId, setVerifyOwnerId] = useState(false);
  const [verifyStateDocs, setVerifyStateDocs] = useState(false);

  const isEditMode = !!propertyToEdit;
  const { can } = useRole();

  // ---------------------------------------------------------------------------
  // Single onChange dispatcher — memoized so sub-component React.memo (if added
  // later) survives. Accepts any FormBag key and routes to the matching setter.
  // The generic-signature narrowing gives callers compile-time safety; the
  // runtime switch is the pragmatic M1 choice vs. a setter-map ref.
  // ---------------------------------------------------------------------------
  const onChange = useCallback<SectionProps['onChange']>((field, value) => {
    switch (field) {
      case 'title': setTitle(value as string); break;
      case 'description': setDescription(value as string); break;
      case 'address': setAddress(value as string); break;
      case 'city': setCity(value as string); break;
      case 'district': setDistrict(value as string); break;
      case 'price': setPrice(value as string); break;
      case 'currency': setCurrency(value as string); break;
      case 'type': setType(value as 'rent' | 'sale'); break;
      case 'propertyType': setPropertyType(value as string); break;
      case 'bedrooms': setBedrooms(value as string); break;
      case 'bathrooms': setBathrooms(value as string); break;
      case 'areaSqm': setAreaSqm(value as string); break;
      case 'rooms': setRooms(value as string); break;
      case 'maxGuests': setMaxGuests(value as string); break;
      case 'amenities': setAmenities(value as string[]); break;
      case 'features': setFeatures(value as string[]); break;
      case 'featureInput': setFeatureInput(value as string); break;
      case 'selectedImages': setSelectedImages(value as any[]); break;
      case 'availableDate': setAvailableDate(value as string); break;
      case 'status': setStatus(value as 'draft' | 'live'); break;
      case 'tours': setTours(value as FormBag['tours']); break;
      case 'tourTitle': setTourTitle(value as string); break;
      case 'tourUrl': setTourUrl(value as string); break;
      case 'videoUrl': setVideoUrl(value as string); break;
      case 'panoramicPhotosUrl': setPanoramicPhotosUrl(value as string); break;
      case 'instagramUrl': setInstagramUrl(value as string); break;
      case 'contactEmail': setContactEmail(value as string); break;
      case 'contactPhone': setContactPhone(value as string); break;
      case 'contactWhatsapp': setContactWhatsapp(value as string); break;
      case 'contactTelegram': setContactTelegram(value as string); break;
      case 'verifyOwnership': setVerifyOwnership(value as boolean); break;
      case 'verifyOwnerId': setVerifyOwnerId(value as boolean); break;
      case 'verifyStateDocs': setVerifyStateDocs(value as boolean); break;
    }
  }, []);

  const verificationSwitchRow = (
    label: string,
    value: boolean,
    setVal: React.Dispatch<React.SetStateAction<boolean>>
  ) => (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
        paddingVertical: 4,
      }}
    >
      <Text style={{ flex: 1, color: colors.text, fontSize: 15, paddingRight: 12, fontWeight: '500' }}>{label}</Text>
      <Switch
        value={value}
        onValueChange={setVal}
        trackColor={{ false: '#767577', true: colors.accent }}
        thumbColor="#f4f3f4"
      />
    </View>
  );

  const applyVerificationFromProperty = (p: Property | undefined) => {
    const pv = p?.platformVerifications;
    setVerifyOwnership(!!pv?.ownershipDocuments);
    setVerifyOwnerId(!!pv?.ownerIdentityVerified);
    setVerifyStateDocs(!!pv?.stateIssuedDocumentsVerified);
  };

  // ---------------------------------------------------------------------------
  // Rehydrate from propertyToEdit — includes D-09 anchor A
  // (setPanoramicPhotosUrl(...) MUST remain; runs for every user incl. non-admin).
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (verificationOnly) {
      setLoadingProfile(false);
      applyVerificationFromProperty(propertyToEdit);
      return;
    }

    loadUserProfile();
    if (propertyToEdit) {
      // Populate form with existing property data
      setTitle(propertyToEdit.title || '');
      setDescription(propertyToEdit.description || '');

      // Parse address to extract street, district, city (may end with ", Kyrgyzstan")
      const addressParts = propertyToEdit.address?.split(',').map((p) => p.trim()) || [];
      const lastPart = addressParts[addressParts.length - 1];
      const hasCountry = lastPart?.toLowerCase() === 'kyrgyzstan';
      const relevantParts = hasCountry ? addressParts.slice(0, -1) : addressParts;
      if (relevantParts.length > 0) setAddress(relevantParts[0]);
      if (relevantParts.length > 1) setDistrict(relevantParts[1]);
      if (relevantParts.length > 2) {
        setCity(relevantParts[2]);
      } else if (propertyToEdit.city) {
        setCity(propertyToEdit.city);
      }

      setPrice(typeof propertyToEdit.price === 'number' ? propertyToEdit.price.toString() : propertyToEdit.price || '');
      const existingCurrency = (propertyToEdit.currency || '').toLowerCase();
      if (existingCurrency === '$' || existingCurrency === 'usd') {
        setCurrency('$');
      } else if (existingCurrency === 'сом' || existingCurrency === 'som' || existingCurrency === 'kgs') {
        setCurrency('сом');
      } else {
        setCurrency('');
      }
      setType(propertyToEdit.type || 'rent');
      setPropertyType(propertyToEdit.propertyType || 'Apartment');
      setBedrooms(propertyToEdit.specs?.beds?.toString() || '');
      setBathrooms(propertyToEdit.specs?.baths?.toString() || '');
      setAreaSqm(propertyToEdit.specs?.sqft?.toString() || '');
      setFeatures(propertyToEdit.features || []);
      setVideoUrl(propertyToEdit.videoUrl || '');
      setPanoramicPhotosUrl((propertyToEdit as any).panoramicPhotosUrl || '');
      setInstagramUrl((propertyToEdit as any).instagramUrl || '');
      const avail = (propertyToEdit as any).availableDate;
      if (avail) {
        const d = typeof avail === 'string' ? new Date(avail) : avail;
        if (!isNaN(d.getTime())) {
          setAvailableDate(d.toISOString().slice(0, 10));
        }
      }
      setStatus((propertyToEdit as any).status || 'draft');

      // Load existing images (if editing and images exist)
      if (propertyToEdit.images && propertyToEdit.images.length > 0) {
        // For existing images, we'll store them as URLs (they're already uploaded)
        setSelectedImages(propertyToEdit.images.map((url: string) => ({ uri: url, isExisting: true })));
      }

      // Load existing tours
      if (propertyToEdit.tours && propertyToEdit.tours.length > 0) {
        setTours(propertyToEdit.tours.map((tour: any) => ({
          id: tour.id || Math.random().toString(),
          title: tour.title || '',
          url: tour.url || '',
        })));
      }
      applyVerificationFromProperty(propertyToEdit);
    } else {
      setVerifyOwnership(false);
      setVerifyOwnerId(false);
      setVerifyStateDocs(false);
    }
  }, [propertyToEdit, verificationOnly]);

  const loadUserProfile = async () => {
    if (!user?.localId) {
      setLoadingProfile(false);
      return;
    }

    try {
      const profile = await AuthService.getBackendUser(user.localId);
      if (profile) {
        setContactEmail(user.email || '');
        setContactPhone(profile.phone || '');
        setContactWhatsapp(profile.whatsapp || '');
        setContactTelegram(profile.telegram || '');
        setInstagramUrl(profile.instagramUrl || '');
      }
    } catch (error) {
      console.error('Failed to load profile', error);
    } finally {
      setLoadingProfile(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Image + tour handlers — live in orchestrator per PATTERNS §10 (the
  // ImagePicker native module lives here; MediaSection receives callbacks).
  // useCallback keeps references stable for child memoization.
  // ---------------------------------------------------------------------------
  const handleSelectImages = useCallback(() => {
    const remainingSlots = 40 - selectedImages.length;
    if (remainingSlots <= 0) {
      Alert.alert(t('createListing.maxReachedTitle'), t('createListing.maxImagesReachedAlert'));
      return;
    }

    if (!ImagePicker || !ImagePicker.launchImageLibrary) {
      Alert.alert(t('createListing.imagePickerUnavailable'), t('createListing.imagePickerUnavailableMessage'));
      return;
    }

    ImagePicker.launchImageLibrary(
      {
        mediaType: 'photo',
        quality: 0.8,
        selectionLimit: remainingSlots,
        includeBase64: false,
      },
      (response) => {
        if (response.didCancel) {
          return;
        }

        if (response.errorMessage) {
          Alert.alert(t('common.error'), response.errorMessage);
          return;
        }

        if (response.assets && response.assets.length > 0) {
          const newImages = response.assets.map((asset) => ({
            uri: asset.uri || '',
            type: asset.type || 'image/jpeg',
            name: asset.fileName || `image-${Date.now()}.jpg`,
            fileSize: asset.fileSize,
          }));

          setSelectedImages([...selectedImages, ...newImages]);
        }
      }
    );
  }, [selectedImages, t]);

  const removeImage = useCallback(
    (index: number) => {
      setSelectedImages(selectedImages.filter((_, i) => i !== index));
    },
    [selectedImages]
  );

  const addTour = useCallback(() => {
    if (tourTitle.trim() && tourUrl.trim()) {
      setTours([
        ...tours,
        {
          id: Math.random().toString(),
          title: tourTitle.trim(),
          url: tourUrl.trim(),
        },
      ]);
      setTourTitle('');
      setTourUrl('');
    } else {
      Alert.alert(t('common.error'), t('createListing.tourTitleUrlRequired'));
    }
  }, [tourTitle, tourUrl, tours, t]);

  const removeTour = useCallback(
    (id: string) => {
      setTours(tours.filter((tour) => tour.id !== id));
    },
    [tours]
  );

  // ---------------------------------------------------------------------------
  // handleSubmit — includes D-09 anchor B (panoramicPhotosUrl unconditional) and
  // D-09 anchor C (tours unconditional). Also preserves the verificationOnly
  // admin-PATCH path untouched.
  // ---------------------------------------------------------------------------
  const handleSubmit = async () => {
    if (verificationOnly) {
      if (!propertyToEdit?.id || !can('editVerifications')) return;
      setLoading(true);
      try {
        await PropertyService.patchPlatformVerifications(propertyToEdit.id, {
          ownershipDocuments: verifyOwnership,
          ownerIdentityVerified: verifyOwnerId,
          stateIssuedDocumentsVerified: verifyStateDocs,
        });
        Alert.alert(t('common.success'), t('verification.saved'), [
          { text: t('common.ok'), onPress: onSuccess },
        ]);
      } catch (error: any) {
        const msg = error.response?.data?.message || error.message;
        Alert.alert(t('common.error'), msg || t('createListing.updateFailed'));
      } finally {
        setLoading(false);
      }
      return;
    }

    // Validation
    if (!title.trim()) {
      Alert.alert(t('common.error'), t('createListing.titleRequired'));
      return;
    }
    if (!address.trim()) {
      Alert.alert(t('common.error'), t('createListing.addressRequired'));
      return;
    }
    if (!currency) {
      Alert.alert(t('common.error'), t('createListing.currencyRequired'));
      return;
    }
    if (!price.trim()) {
      Alert.alert(t('common.error'), t('createListing.priceRequired'));
      return;
    }

    setLoading(true);
    try {
      // Build full address for storage and geocoding (street, district, city, country)
      let fullAddress = address.trim();
      if (district?.trim()) {
        fullAddress = `${fullAddress}, ${district.trim()}`;
      }
      const cityVal = (city || 'Bishkek').trim();
      fullAddress = `${fullAddress}, ${cityVal}`;
      // Add Kyrgyzstan for Bishkek addresses - improves geocoding accuracy
      if (cityVal.toLowerCase() === 'bishkek') {
        fullAddress = `${fullAddress}, Kyrgyzstan`;
      }

      // Separate existing images (URLs) from new images (files to upload)
      const existingImageUrls = selectedImages.filter(img => img.isExisting).map(img => img.uri);
      const newImages = selectedImages.filter(img => !img.isExisting);

      const propertyData = {
        title: title.trim(),
        description: description.trim(),
        address: fullAddress,
        city: city || 'Bishkek',
        price: parseFloat(price) || price,
        currency,
        period: type === 'rent' ? 'month' : undefined,
        type,
        propertyType,
        bedrooms: parseInt(bedrooms) || 0,
        bathrooms: parseInt(bathrooms) || 0,
        areaSqm: parseFloat(areaSqm) || 0,
        features,
        videoUrl: videoUrl.trim(),
        panoramicPhotosUrl: panoramicPhotosUrl.trim(),
        instagramUrl: instagramUrl.trim(),
        availableDate: availableDate.trim() || undefined,
        status,
        tours: tours.length > 0 ? tours : undefined, // Include Matterport tours
        existingImages: existingImageUrls, // Send existing image URLs for merging
        ...(can('editVerifications')
          ? {
              platformVerifications: {
                ownershipDocuments: verifyOwnership,
                ownerIdentityVerified: verifyOwnerId,
                stateIssuedDocumentsVerified: verifyStateDocs,
              },
            }
          : {}),
      };

      if (isEditMode && propertyToEdit?.id) {
        await PropertyService.updateProperty(propertyToEdit.id, propertyData, newImages);
        Alert.alert(t('common.success'), t('createListing.updatedSuccess'), [
          { text: t('common.ok'), onPress: onSuccess },
        ]);
      } else {
        await PropertyService.createProperty(propertyData, newImages);
        Alert.alert(
          t('common.success'),
          status === 'draft' ? t('createListing.draftSuccess') : t('createListing.createdSuccess'),
          [{ text: t('common.ok'), onPress: onSuccess }]
        );
      }
    } catch (error: any) {
      console.error('Error creating listing:', error);
      const msg = error.response?.data?.message;
      Alert.alert(
        t('common.error'),
        msg || (isEditMode ? t('createListing.updateFailed') : t('createListing.createFailed'))
      );
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Bundle state into FormBag for sub-component consumption. Plain object (no
  // useMemo) — M1 re-renders on every keystroke anyway; stable `onChange` is
  // the reference-stability that matters.
  // ---------------------------------------------------------------------------
  const values: FormBag = {
    title,
    description,
    address,
    city,
    district,
    type,
    propertyType,
    status,
    features,
    featureInput,
    selectedImages,
    availableDate,
    bedrooms,
    bathrooms,
    areaSqm,
    price,
    // Plan 01 scope-minimal cast: useState declaration stays at `string` (Plan
    // 04's scope per PATTERNS.md §12 Edit A). Orchestrator already feeds only
    // canonical `'$' | 'сом' | ''` values via the rehydrate normalizer + chip
    // `onChange('currency', option.value)` — runtime is safe.
    currency: currency as import('../components/CreateListingForm').Currency | '',
    rooms,
    maxGuests,
    amenities,
    tours,
    tourTitle,
    tourUrl,
    videoUrl,
    panoramicPhotosUrl,
    instagramUrl,
    contactEmail,
    contactPhone,
    contactWhatsapp,
    contactTelegram,
    verifyOwnership,
    verifyOwnerId,
    verifyStateDocs,
  };

  // Category is DERIVED — never stored in FormBag, never sent in the submit
  // payload. Single source of truth: propertyTypeToCategory().
  const category = propertyTypeToCategory(values.propertyType);

  if (loadingProfile && !verificationOnly) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  // ---------------------------------------------------------------------------
  // verificationOnly admin-minimal-screen branch — UNTOUCHED per RESEARCH row
  // 401 + PATTERNS.md §15. Called from PropertyDetailsScreen for admin PATCHing
  // verification flags; separate render path from the main form.
  // ---------------------------------------------------------------------------
  if (verificationOnly) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Text style={[styles.backButtonText, { color: colors.text }]}>{`← ${t('createListing.cancel')}`}</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
            {t('verification.screenTitle')}
          </Text>
          <View style={{ width: 80 }} />
        </View>
        <KeyboardAwareScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          bottomOffset={20}
        >
          <Text style={[styles.hint, { color: colors.textSecondary, marginBottom: 16 }]}>
            {propertyToEdit?.title ? propertyToEdit.title : ''}
          </Text>
          <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 8 }]}>{t('verification.adminSectionTitle')}</Text>
          <Text style={[styles.hint, { color: colors.textSecondary, marginBottom: 20 }]}>{t('verification.adminSectionHint')}</Text>
          {verificationSwitchRow(t('verification.ownershipDocuments'), verifyOwnership, setVerifyOwnership)}
          {verificationSwitchRow(t('verification.ownerIdentity'), verifyOwnerId, setVerifyOwnerId)}
          {verificationSwitchRow(t('verification.stateIssued'), verifyStateDocs, setVerifyStateDocs)}
          <TouchableOpacity
            style={[styles.submitButton, { backgroundColor: colors.primary }]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={[styles.submitButtonText, { color: isDark ? '#121212' : '#FFFFFF' }]}>
                {t('verification.save')}
              </Text>
            )}
          </TouchableOpacity>
        </KeyboardAwareScrollView>
      </SafeAreaView>
    );
  }

  // ---------------------------------------------------------------------------
  // Main orchestrator body — composes 7 sub-components + conditional mounts.
  // Category-branched mount for Residential/Commercial/Hospitality; PriceSection
  // unmounted for Hospitality (showcase-only). VerificationSection wrapped in
  // the role-gating guard at the VerificationSection call site per UI-SPEC row 40.
  // ---------------------------------------------------------------------------
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={[styles.backButtonText, { color: colors.text }]}>{`← ${t('createListing.cancel')}`}</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {isEditMode ? t('createListing.editListing') : t('createListing.createListing')}
        </Text>
        <View style={{ width: 80 }} />
      </View>

      <KeyboardAwareScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        bottomOffset={20}
      >
        <BasicInfoSection values={values} onChange={onChange} errors={{}} />

        {category === 'Residential' && (
          <ResidentialSection values={values} onChange={onChange} errors={{}} />
        )}
        {category === 'Commercial' && (
          <CommercialSection values={values} onChange={onChange} errors={{}} />
        )}
        {category === 'Hospitality' && (
          <HospitalitySection values={values} onChange={onChange} errors={{}} />
        )}

        {category !== 'Hospitality' && (
          <PriceSection values={values} onChange={onChange} errors={{}} />
        )}

        <MediaSection
          values={values}
          onChange={onChange}
          errors={{}}
          onSelectImages={handleSelectImages}
          onRemoveImage={removeImage}
          onAddTour={addTour}
          onRemoveTour={removeTour}
        />

        {/* Contact Info (Auto-filled, read-only) — kept inline (~30 LOC; low carve value) */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('createListing.contactInfo')}</Text>
          <TextInput
            style={[styles.input, styles.readOnlyInput, { backgroundColor: colors.inputBackground, color: colors.textSecondary, borderColor: colors.border }]}
            placeholder={t('createListing.contactEmail')}
            placeholderTextColor={colors.textSecondary}
            value={contactEmail}
            editable={false}
          />
          <TextInput
            style={[styles.input, styles.readOnlyInput, { backgroundColor: colors.inputBackground, color: colors.textSecondary, borderColor: colors.border }]}
            placeholder={t('createListing.contactPhone')}
            placeholderTextColor={colors.textSecondary}
            value={contactPhone}
            editable={false}
          />
          <TextInput
            style={[styles.input, styles.readOnlyInput, { backgroundColor: colors.inputBackground, color: colors.textSecondary, borderColor: colors.border }]}
            placeholder={t('createListing.contactWhatsapp')}
            placeholderTextColor={colors.textSecondary}
            value={contactWhatsapp}
            editable={false}
          />
          <TextInput
            style={[styles.input, styles.readOnlyInput, { backgroundColor: colors.inputBackground, color: colors.textSecondary, borderColor: colors.border }]}
            placeholder={t('createListing.contactTelegram')}
            placeholderTextColor={colors.textSecondary}
            value={contactTelegram}
            editable={false}
          />
        </View>

        {/* Status — only visible when creating new listing; kept inline with !isEditMode guard */}
        {!isEditMode && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('createListing.status')}</Text>
            <View style={[styles.segmentedControl, { backgroundColor: isDark ? '#2C2C2E' : '#E5E5EA' }]}>
              <TouchableOpacity
                style={[
                  styles.segmentButton,
                  status === 'draft' && { backgroundColor: isDark ? '#000000' : '#FFFFFF', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 }
                ]}
                onPress={() => setStatus('draft')}
              >
                <View style={styles.segmentContent}>
                  <Text style={styles.segmentIcon}>📄</Text>
                  <Text style={[styles.segmentText, { color: status === 'draft' ? (isDark ? '#FFF' : '#000') : (isDark ? '#8E8E93' : '#666') }]}>
                    {t('createListing.draft')}
                  </Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.segmentButton,
                  status === 'live' && { backgroundColor: isDark ? '#000000' : '#FFFFFF', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 }
                ]}
                onPress={() => setStatus('live')}
              >
                <View style={styles.segmentContent}>
                  <Text style={styles.segmentIcon}>🚀</Text>
                  <Text style={[styles.segmentText, { color: status === 'live' ? (isDark ? '#FFF' : '#000') : (isDark ? '#8E8E93' : '#666') }]}>
                    {t('createListing.submit')}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
            <Text style={[styles.hint, { color: colors.textSecondary }]}>{t('createListing.statusHint')}</Text>
          </View>
        )}

        {/* VerificationSection — call-site wrap via editVerifications guard per
            UI-SPEC Component Inventory row 40 + Phase 3 Site 4 (03-05-SUMMARY).
            This is the single in-orchestrator role-gating wrap; the two MediaSection
            wraps live inside MediaSection.tsx (editMatterportUrl + editPanoramicUrl). */}
        <Gated action="editVerifications">
          <VerificationSection values={values} onChange={onChange} />
        </Gated>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, { backgroundColor: colors.primary }]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={[styles.submitButtonText, { color: isDark ? '#121212' : '#FFFFFF' }]}>
              {isEditMode
                ? t('createListing.updateListing')
                : status === 'draft'
                  ? t('createListing.saveAsDraft')
                  : t('createListing.createListing')}
            </Text>
          )}
        </TouchableOpacity>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
};

// Orchestrator-scoped StyleSheet — trimmed to only keys used in the orchestrator
// body (header + Status segmented control + Contact read-only + submit + the
// verificationOnly branch). Shared sub-component styles (input, row, thirdInput,
// chip, chipRow, section, sectionTitle, label, hint, segmentedControl keys, etc.)
// live in `src/components/CreateListingForm/styles.ts` (commonStyles).
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    marginBottom: 12,
  },
  readOnlyInput: {
    opacity: 0.6,
  },
  hint: {
    fontSize: 12,
    marginTop: 4,
    fontStyle: 'italic',
  },
  segmentedControl: {
    flexDirection: 'row',
    borderRadius: 30,
    padding: 4,
    height: 44,
  },
  segmentButton: {
    flex: 1,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  segmentContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  segmentIcon: {
    fontSize: 18,
  },
  segmentText: {
    fontWeight: '600',
    fontSize: 16,
  },
  submitButton: {
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  submitButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
  },
});

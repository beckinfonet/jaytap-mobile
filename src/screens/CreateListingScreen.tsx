import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StatusBar,
  Alert,
  ActivityIndicator,
  Platform,
  Image,
  FlatList,
  Dimensions,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { PropertyService } from '../services/PropertyService';
import { AuthService } from '../services/AuthService';
import { Property } from '../types/Property';
import type { TranslationKeys } from '../locales';
import * as ImagePicker from 'react-native-image-picker';

const CURRENCY_OPTIONS = [
  { value: '$', label: '🇺🇸 USD' },
  { value: 'сом', label: '🇰🇬 сом' },
] as const;

/** Stored values stay English for API compatibility; labels are localized. */
const PROPERTY_TYPES: { value: string; labelKey: TranslationKeys }[] = [
  { value: 'Apartment', labelKey: 'propertyType.apartment' },
  { value: 'House', labelKey: 'propertyType.house' },
  { value: 'Townhome', labelKey: 'propertyType.townhome' },
  { value: 'Condo', labelKey: 'propertyType.condo' },
  { value: 'Office', labelKey: 'propertyType.office' },
  { value: 'Retail', labelKey: 'propertyType.retail' },
  { value: 'Warehouse', labelKey: 'propertyType.warehouse' },
  { value: 'Land', labelKey: 'propertyType.land' },
  { value: 'Industrial', labelKey: 'propertyType.industrial' },
];

interface CreateListingScreenProps {
  onBack: () => void;
  onSuccess: () => void; // Navigate to renter's listings page
  propertyToEdit?: Property; // Optional property to edit
}

export const CreateListingScreen: React.FC<CreateListingScreenProps> = ({ onBack, onSuccess, propertyToEdit }) => {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const dateLocale = language === 'ru' ? 'ru-RU' : 'en-US';

  // Form state
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
  const [features, setFeatures] = useState<string[]>([]);
  const [featureInput, setFeatureInput] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [panoramicPhotosUrl, setPanoramicPhotosUrl] = useState('');
  const [instagramUrl, setInstagramUrl] = useState('');
  const [availableDate, setAvailableDate] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
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
  const [loadingProfile, setLoadingProfile] = useState(true);

  const isEditMode = !!propertyToEdit;

  useEffect(() => {
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
    }
  }, [propertyToEdit]);

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

  const addFeature = () => {
    if (featureInput.trim()) {
      setFeatures([...features, featureInput.trim()]);
      setFeatureInput('');
    }
  };

  const removeFeature = (index: number) => {
    setFeatures(features.filter((_, i) => i !== index));
  };

  const handleSelectImages = () => {
    const remainingSlots = 40 - selectedImages.length;
    if (remainingSlots <= 0) {
      Alert.alert(t('createListing.maxReachedTitle'), t('createListing.maxImagesReachedAlert'));
      return;
    }

    // Check if ImagePicker is available
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
  };

  const removeImage = (index: number) => {
    setSelectedImages(selectedImages.filter((_, i) => i !== index));
  };

  const addTour = () => {
    if (tourTitle.trim() && tourUrl.trim()) {
      setTours([...tours, {
        id: Math.random().toString(),
        title: tourTitle.trim(),
        url: tourUrl.trim(),
      }]);
      setTourTitle('');
      setTourUrl('');
    } else {
      Alert.alert(t('common.error'), t('createListing.tourTitleUrlRequired'));
    }
  };

  const removeTour = (id: string) => {
    setTours(tours.filter(t => t.id !== id));
  };

  const handleSubmit = async () => {
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

  if (loadingProfile) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

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

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Transaction Type */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('createListing.transactionType')}</Text>
          <View style={[styles.segmentedControl, { backgroundColor: isDark ? '#2C2C2E' : '#E5E5EA' }]}>
            <TouchableOpacity
              style={[
                styles.segmentButton,
                type === 'rent' && { backgroundColor: isDark ? '#000000' : '#FFFFFF', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 }
              ]}
              onPress={() => setType('rent')}
            >
              <Text style={[styles.segmentText, { color: type === 'rent' ? (isDark ? '#FFF' : '#000') : (isDark ? '#8E8E93' : '#666') }]}>
                {`🏠 ${t('createListing.rent')}`}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.segmentButton,
                type === 'sale' && { backgroundColor: isDark ? '#000000' : '#FFFFFF', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 }
              ]}
              onPress={() => setType('sale')}
            >
              <Text style={[styles.segmentText, { color: type === 'sale' ? (isDark ? '#FFF' : '#000') : (isDark ? '#8E8E93' : '#666') }]}>
                {`💰 ${t('createListing.sell')}`}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Basic Info */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('createListing.basicInfo')}</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border }]}
            placeholder={t('createListing.title')}
            placeholderTextColor={colors.textSecondary}
            value={title}
            onChangeText={setTitle}
          />
          <TextInput
            style={[styles.textArea, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border }]}
            placeholder={t('createListing.description')}
            placeholderTextColor={colors.textSecondary}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
          />
        </View>

        {/* Location */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('createListing.location')}</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border }]}
            placeholder={t('createListing.streetAddress')}
            placeholderTextColor={colors.textSecondary}
            value={address}
            onChangeText={setAddress}
          />
          <TextInput
            style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border }]}
            placeholder={t('createListing.district')}
            placeholderTextColor={colors.textSecondary}
            value={district}
            onChangeText={setDistrict}
          />
          <TextInput
            style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border }]}
            placeholder={t('createListing.city')}
            placeholderTextColor={colors.textSecondary}
            value={city}
            onChangeText={setCity}
          />
        </View>

        {/* Property Details */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('createListing.propertyDetails')}</Text>
          <Text style={[styles.label, { color: colors.textSecondary, marginBottom: 8 }]}>{t('createListing.currency')}</Text>
          <View style={styles.currencyRow}>
            {CURRENCY_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.currencyOption,
                  {
                    backgroundColor: currency === opt.value ? colors.accent : colors.inputBackground,
                    borderColor: currency === opt.value ? colors.accent : colors.border,
                  },
                ]}
                onPress={() => setCurrency(opt.value)}
              >
                <Text style={[styles.currencyOptionText, { color: currency === opt.value ? '#FFF' : colors.text }]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={[styles.label, { color: colors.textSecondary, marginBottom: 8, marginTop: 12 }]}>{t('createListing.price')}</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border }]}
            placeholder={t('createListing.amount')}
            placeholderTextColor={colors.textSecondary}
            value={price}
            onChangeText={setPrice}
            keyboardType="numeric"
          />
          <Text style={[styles.hint, { color: colors.textSecondary }]}>{t('createListing.selectCurrencyHint')}</Text>

          <Text style={[styles.label, { color: colors.textSecondary }]}>{t('createListing.propertyType')}</Text>
          <View style={styles.chipRow}>
            {PROPERTY_TYPES.map(({ value, labelKey }) => (
              <TouchableOpacity
                key={value}
                style={[
                  styles.chip,
                  {
                    backgroundColor: propertyType === value ? colors.accent : colors.inputBackground,
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => setPropertyType(value)}
              >
                <Text style={[styles.chipText, { color: propertyType === value ? '#FFF' : colors.text }]}>
                  {t(labelKey)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.row}>
            <View style={styles.thirdInput}>
              <TextInput
                style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border }]}
                placeholder={t('createListing.bedrooms')}
                placeholderTextColor={colors.textSecondary}
                value={bedrooms}
                onChangeText={setBedrooms}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.thirdInput}>
              <TextInput
                style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border }]}
                placeholder={t('createListing.bathrooms')}
                placeholderTextColor={colors.textSecondary}
                value={bathrooms}
                onChangeText={setBathrooms}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.thirdInput}>
              <TextInput
                style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border }]}
                placeholder={t('createListing.area')}
                placeholderTextColor={colors.textSecondary}
                value={areaSqm}
                onChangeText={setAreaSqm}
                keyboardType="numeric"
              />
            </View>
          </View>
          <Text style={[styles.label, { color: colors.textSecondary, marginTop: 12 }]}>{t('createListing.availableFrom')}</Text>
          <TouchableOpacity
            style={[styles.datePickerButton, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={[styles.datePickerButtonText, { color: availableDate ? colors.text : colors.textSecondary }]}>
              {availableDate
                ? new Date(availableDate + 'T12:00:00').toLocaleDateString(dateLocale, {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })
                : t('createListing.selectDate')}
            </Text>
            <Text style={[styles.datePickerChevron, { color: colors.textSecondary }]}>📅</Text>
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={availableDate ? new Date(availableDate + 'T12:00:00') : new Date()}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : undefined}
              themeVariant={Platform.OS === 'ios' ? (isDark ? 'dark' : 'light') : undefined}
              textColor={Platform.OS === 'ios' ? (isDark ? '#FFFFFF' : '#000000') : undefined}
              onChange={(_, d) => {
                if (Platform.OS === 'android') setShowDatePicker(false);
                if (d) setAvailableDate(d.toISOString().slice(0, 10));
              }}
            />
          )}
          {showDatePicker && Platform.OS === 'ios' && (
            <TouchableOpacity
              style={[styles.datePickerDoneButton, { backgroundColor: colors.primary }]}
              onPress={() => setShowDatePicker(false)}
            >
              <Text style={[styles.datePickerDoneButtonText, { color: isDark ? '#121212' : '#FFFFFF' }]}>{t('common.done')}</Text>
            </TouchableOpacity>
          )}
          <Text style={[styles.hint, { color: colors.textSecondary }]}>{t('createListing.availableHintDetail')}</Text>
        </View>

        {/* Features */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('createListing.features')}</Text>
          <View style={styles.row}>
            <TextInput
              style={[styles.input, { flex: 1, backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border }]}
              placeholder={t('createListing.addFeature')}
              placeholderTextColor={colors.textSecondary}
              value={featureInput}
              onChangeText={setFeatureInput}
              onSubmitEditing={addFeature}
            />
            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: colors.accent }]}
              onPress={addFeature}
            >
              <Text style={styles.addButtonText}>+</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.featuresContainer}>
            {features.map((feature, index) => (
              <View key={index} style={[styles.featureTag, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.featureText, { color: colors.text }]}>{feature}</Text>
                <TouchableOpacity onPress={() => removeFeature(index)}>
                  <Text style={[styles.removeFeature, { color: colors.textSecondary }]}>×</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>

        {/* Images */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('createListing.images')}</Text>
          <Text style={[styles.hint, { color: colors.textSecondary, marginBottom: 12 }]}>
            {t('createListing.addImagesHintCount', { current: String(selectedImages.length) })}
          </Text>
          <TouchableOpacity
            style={[styles.imagePickerButton, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}
            onPress={handleSelectImages}
            disabled={selectedImages.length >= 40}
          >
            <Text style={[styles.imagePickerButtonText, { color: colors.text }]}>
              {`📷 ${selectedImages.length >= 40 ? t('createListing.maxImagesReached') : t('createListing.selectImages')}`}
            </Text>
          </TouchableOpacity>

          {selectedImages.length > 0 && (
            <View style={styles.imagesGrid}>
              {selectedImages.map((image, index) => (
                <View key={index} style={styles.imageItem}>
                  <Image
                    source={{ uri: image.uri }}
                    style={styles.imageThumbnail}
                    resizeMode="cover"
                  />
                  <TouchableOpacity
                    style={styles.removeImageButton}
                    onPress={() => removeImage(index)}
                  >
                    <Text style={styles.removeImageText}>×</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Matterport 3D Tours */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('createListing.tours3d')}</Text>
          <Text style={[styles.hint, { color: colors.textSecondary, marginBottom: 12 }]}>{t('createListing.matterportHint')}</Text>

          <TextInput
            style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border }]}
            placeholder={t('createListing.tourTitle')}
            placeholderTextColor={colors.textSecondary}
            value={tourTitle}
            onChangeText={setTourTitle}
          />
          <TextInput
            style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border }]}
            placeholder={t('createListing.matterportUrlExample')}
            placeholderTextColor={colors.textSecondary}
            value={tourUrl}
            onChangeText={setTourUrl}
            keyboardType="url"
          />
          <TouchableOpacity
            style={[styles.addTourButton, { backgroundColor: colors.primary, borderColor: colors.border }]}
            onPress={addTour}
          >
            <Text style={[styles.addTourButtonText, { color: isDark ? '#121212' : '#FFFFFF' }]}>{t('createListing.add3dTour')}</Text>
          </TouchableOpacity>

          {tours.length > 0 && (
            <View style={styles.toursList}>
              {tours.map((tour) => (
                <View key={tour.id} style={[styles.tourItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={styles.tourInfo}>
                    <Text style={[styles.tourTitle, { color: colors.text }]} numberOfLines={1}>
                      {tour.title}
                    </Text>
                    <Text style={[styles.tourUrl, { color: colors.textSecondary }]} numberOfLines={1}>
                      {tour.url}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.removeTourButton}
                    onPress={() => removeTour(tour.id)}
                  >
                    <Text style={[styles.removeTourText, { color: colors.textSecondary }]}>×</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Links */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('createListing.links')}</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border }]}
            placeholder={t('createListing.videoUrl')}
            placeholderTextColor={colors.textSecondary}
            value={videoUrl}
            onChangeText={setVideoUrl}
            keyboardType="url"
          />
          <TextInput
            style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border }]}
            placeholder={t('createListing.panoramicUrl')}
            placeholderTextColor={colors.textSecondary}
            value={panoramicPhotosUrl}
            onChangeText={setPanoramicPhotosUrl}
            keyboardType="url"
          />
          <TextInput
            style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border }]}
            placeholder={t('createListing.instagramUrl')}
            placeholderTextColor={colors.textSecondary}
            value={instagramUrl}
            onChangeText={setInstagramUrl}
            keyboardType="url"
          />
          <Text style={[styles.hint, { color: colors.textSecondary }]}>{t('createListing.instagramHint')}</Text>
        </View>

        {/* Contact Info (Auto-filled, read-only) */}
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

        {/* Status - Only show when creating new listing, not when editing */}
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
      </ScrollView>
    </SafeAreaView>
  );
};

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
  datePickerButton: {
    height: 50,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  datePickerButtonText: {
    fontSize: 16,
  },
  datePickerChevron: {
    fontSize: 18,
  },
  datePickerModalWrapper: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  datePickerModal: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 34,
    maxHeight: '70%',
  },
  datePickerCalendarContainer: {
    minHeight: 320,
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  datePickerDone: {
    fontSize: 17,
    fontWeight: '600',
  },
  datePickerDoneButton: {
    marginTop: 8,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  datePickerDoneButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  textArea: {
    minHeight: 100,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 12,
    textAlignVertical: 'top',
  },
  readOnlyInput: {
    opacity: 0.6,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  currencyRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 4,
  },
  currencyOption: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currencyOptionText: {
    fontSize: 16,
    fontWeight: '600',
  },
  halfInput: {
    flex: 1,
  },
  thirdInput: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    marginBottom: 8,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  addButton: {
    width: 50,
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: 'bold',
  },
  featuresContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  featureTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  featureText: {
    fontSize: 14,
    marginRight: 8,
  },
  removeFeature: {
    fontSize: 18,
    fontWeight: 'bold',
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
  imagePickerButton: {
    height: 50,
    borderWidth: 1,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  imagePickerButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  imagesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 12,
  },
  imageItem: {
    width: (Dimensions.get('window').width - 60) / 3, // 3 columns with margins
    height: (Dimensions.get('window').width - 60) / 3,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  imageThumbnail: {
    width: '100%',
    height: '100%',
  },
  removeImageButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeImageText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  addTourButton: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  addTourButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  toursList: {
    marginTop: 12,
    gap: 8,
  },
  tourItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  tourInfo: {
    flex: 1,
    marginRight: 12,
  },
  tourTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  tourUrl: {
    fontSize: 12,
  },
  removeTourButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeTourText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
});


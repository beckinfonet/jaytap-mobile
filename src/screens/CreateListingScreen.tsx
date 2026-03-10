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
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { PropertyService } from '../services/PropertyService';
import { AuthService } from '../services/AuthService';
import { Property } from '../types/Property';
import * as ImagePicker from 'react-native-image-picker';

const CURRENCY_OPTIONS = [
  { value: '$', label: '🇺🇸 USD' },
  { value: 'сом', label: '🇰🇬 сом' },
] as const;

const RESIDENTIAL_TYPES = ['Apartment', 'House', 'Townhome', 'Condo'];
const COMMERCIAL_TYPES = ['Office', 'Retail', 'Warehouse', 'Land', 'Industrial'];
const BISHKEK_DISTRICTS = [
  'Asanbay',
  'Jal',
  'Tunguch',
  'Alamedin-1',
  'Microdistrict 3',
  'Microdistrict 4',
  'Microdistrict 5',
  'Microdistrict 6',
  'Microdistrict 7',
  'Microdistrict 8',
  'Microdistrict 9',
  'Microdistrict 10',
  'Microdistrict 11',
  'Microdistrict 12',
  'Kok-Jar',
];

interface CreateListingScreenProps {
  onBack: () => void;
  onSuccess: () => void; // Navigate to renter's listings page
  propertyToEdit?: Property; // Optional property to edit
}

export const CreateListingScreen: React.FC<CreateListingScreenProps> = ({ onBack, onSuccess, propertyToEdit }) => {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();

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
      Alert.alert('Maximum reached', 'You can add up to 40 images');
      return;
    }

    // Check if ImagePicker is available
    if (!ImagePicker || !ImagePicker.launchImageLibrary) {
      Alert.alert(
        'Image Picker Not Available',
        'Please rebuild the app after installing react-native-image-picker. Run: cd ios && pod install && cd .. && npx react-native run-ios'
      );
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
          Alert.alert('Error', response.errorMessage);
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
      Alert.alert('Error', 'Please enter both tour title and URL');
    }
  };

  const removeTour = (id: string) => {
    setTours(tours.filter(t => t.id !== id));
  };

  const handleSubmit = async () => {
    // Validation
    if (!title.trim()) {
      Alert.alert('Error', 'Title is required');
      return;
    }
    if (!address.trim()) {
      Alert.alert('Error', 'Address is required');
      return;
    }
    if (!currency) {
      Alert.alert('Error', 'Please select a currency (USD or сом)');
      return;
    }
    if (!price.trim()) {
      Alert.alert('Error', 'Price is required');
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
        status,
        tours: tours.length > 0 ? tours : undefined, // Include Matterport tours
        existingImages: existingImageUrls, // Send existing image URLs for merging
      };

      if (isEditMode && propertyToEdit?.id) {
        await PropertyService.updateProperty(propertyToEdit.id, propertyData, newImages);
        Alert.alert('Success', 'Listing updated successfully!', [
          { text: 'OK', onPress: onSuccess },
        ]);
      } else {
        await PropertyService.createProperty(propertyData, newImages);
        Alert.alert('Success', status === 'draft' ? 'Listing saved as draft!' : 'Listing created successfully!', [
          { text: 'OK', onPress: onSuccess },
        ]);
      }
    } catch (error: any) {
      console.error('Error creating listing:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to create listing');
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
          <Text style={[styles.backButtonText, { color: colors.text }]}>← Cancel</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {isEditMode ? 'Edit Listing' : 'Create Listing'}
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
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Transaction Type</Text>
          <View style={[styles.segmentedControl, { backgroundColor: isDark ? '#2C2C2E' : '#E5E5EA' }]}>
            <TouchableOpacity
              style={[
                styles.segmentButton,
                type === 'rent' && { backgroundColor: isDark ? '#000000' : '#FFFFFF', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 }
              ]}
              onPress={() => setType('rent')}
            >
              <Text style={[styles.segmentText, { color: type === 'rent' ? (isDark ? '#FFF' : '#000') : (isDark ? '#8E8E93' : '#666') }]}>
                🏠 Rent
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
                💰 Sell
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Basic Info */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Basic Information</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border }]}
            placeholder="Title *"
            placeholderTextColor={colors.textSecondary}
            value={title}
            onChangeText={setTitle}
          />
          <TextInput
            style={[styles.textArea, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border }]}
            placeholder="Description"
            placeholderTextColor={colors.textSecondary}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
          />
        </View>

        {/* Location */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Location</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border }]}
            placeholder="Street Address *"
            placeholderTextColor={colors.textSecondary}
            value={address}
            onChangeText={setAddress}
          />
          <TextInput
            style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border }]}
            placeholder="District (optional)"
            placeholderTextColor={colors.textSecondary}
            value={district}
            onChangeText={setDistrict}
          />
          <TextInput
            style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border }]}
            placeholder="City"
            placeholderTextColor={colors.textSecondary}
            value={city}
            onChangeText={setCity}
          />
        </View>

        {/* Property Details */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Property Details</Text>
          <Text style={[styles.label, { color: colors.textSecondary, marginBottom: 8 }]}>Currency *</Text>
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
          <Text style={[styles.label, { color: colors.textSecondary, marginBottom: 8, marginTop: 12 }]}>Price *</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border }]}
            placeholder="Amount (e.g., 850)"
            placeholderTextColor={colors.textSecondary}
            value={price}
            onChangeText={setPrice}
            keyboardType="numeric"
          />
          <Text style={[styles.hint, { color: colors.textSecondary }]}>
            Select currency first, then enter the price amount
          </Text>

          <Text style={[styles.label, { color: colors.textSecondary }]}>Property Type</Text>
          <View style={styles.chipRow}>
            {[...RESIDENTIAL_TYPES, ...COMMERCIAL_TYPES].map((pt) => (
              <TouchableOpacity
                key={pt}
                style={[
                  styles.chip,
                  {
                    backgroundColor: propertyType === pt ? colors.accent : colors.inputBackground,
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => setPropertyType(pt)}
              >
                <Text style={[styles.chipText, { color: propertyType === pt ? '#FFF' : colors.text }]}>
                  {pt}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.row}>
            <View style={styles.thirdInput}>
              <TextInput
                style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border }]}
                placeholder="Bedrooms"
                placeholderTextColor={colors.textSecondary}
                value={bedrooms}
                onChangeText={setBedrooms}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.thirdInput}>
              <TextInput
                style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border }]}
                placeholder="Bathrooms"
                placeholderTextColor={colors.textSecondary}
                value={bathrooms}
                onChangeText={setBathrooms}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.thirdInput}>
              <TextInput
                style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border }]}
                placeholder="Area (m²)"
                placeholderTextColor={colors.textSecondary}
                value={areaSqm}
                onChangeText={setAreaSqm}
                keyboardType="numeric"
              />
            </View>
          </View>
        </View>

        {/* Features */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Features</Text>
          <View style={styles.row}>
            <TextInput
              style={[styles.input, { flex: 1, backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border }]}
              placeholder="Add feature"
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
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Images</Text>
          <Text style={[styles.hint, { color: colors.textSecondary, marginBottom: 12 }]}>
            Add up to 40 images ({selectedImages.length}/40)
          </Text>
          <TouchableOpacity
            style={[styles.imagePickerButton, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}
            onPress={handleSelectImages}
            disabled={selectedImages.length >= 40}
          >
            <Text style={[styles.imagePickerButtonText, { color: colors.text }]}>
              📷 {selectedImages.length >= 40 ? 'Maximum images reached' : 'Select Images'}
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
          <Text style={[styles.sectionTitle, { color: colors.text }]}>3D Matterport Tours</Text>
          <Text style={[styles.hint, { color: colors.textSecondary, marginBottom: 12 }]}>
            Add Matterport tour URLs for interactive 3D walkthroughs
          </Text>

          <TextInput
            style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border }]}
            placeholder="Tour Title (e.g., Full Apartment Walkthrough)"
            placeholderTextColor={colors.textSecondary}
            value={tourTitle}
            onChangeText={setTourTitle}
          />
          <TextInput
            style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border }]}
            placeholder="Matterport URL (e.g., https://my.matterport.com/show/?m=...)"
            placeholderTextColor={colors.textSecondary}
            value={tourUrl}
            onChangeText={setTourUrl}
            keyboardType="url"
          />
          <TouchableOpacity
            style={[styles.addTourButton, { backgroundColor: colors.primary, borderColor: colors.border }]}
            onPress={addTour}
          >
            <Text style={[styles.addTourButtonText, { color: isDark ? '#121212' : '#FFFFFF' }]}>
              + Add 3D Tour
            </Text>
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
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Links</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border }]}
            placeholder="Video URL (optional)"
            placeholderTextColor={colors.textSecondary}
            value={videoUrl}
            onChangeText={setVideoUrl}
            keyboardType="url"
          />
          <TextInput
            style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border }]}
            placeholder="Panoramic Photos URL (optional, e.g. Ricoh 360)"
            placeholderTextColor={colors.textSecondary}
            value={panoramicPhotosUrl}
            onChangeText={setPanoramicPhotosUrl}
            keyboardType="url"
          />
          <TextInput
            style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border }]}
            placeholder="Instagram URL *"
            placeholderTextColor={colors.textSecondary}
            value={instagramUrl}
            onChangeText={setInstagramUrl}
            keyboardType="url"
          />
          <Text style={[styles.hint, { color: colors.textSecondary }]}>
            Add your Instagram link so viewers can contact you
          </Text>
        </View>

        {/* Contact Info (Auto-filled, read-only) */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Contact Information (Auto-filled from Profile)</Text>
          <TextInput
            style={[styles.input, styles.readOnlyInput, { backgroundColor: colors.inputBackground, color: colors.textSecondary, borderColor: colors.border }]}
            placeholder="Email"
            placeholderTextColor={colors.textSecondary}
            value={contactEmail}
            editable={false}
          />
          <TextInput
            style={[styles.input, styles.readOnlyInput, { backgroundColor: colors.inputBackground, color: colors.textSecondary, borderColor: colors.border }]}
            placeholder="Phone"
            placeholderTextColor={colors.textSecondary}
            value={contactPhone}
            editable={false}
          />
          <TextInput
            style={[styles.input, styles.readOnlyInput, { backgroundColor: colors.inputBackground, color: colors.textSecondary, borderColor: colors.border }]}
            placeholder="WhatsApp"
            placeholderTextColor={colors.textSecondary}
            value={contactWhatsapp}
            editable={false}
          />
          <TextInput
            style={[styles.input, styles.readOnlyInput, { backgroundColor: colors.inputBackground, color: colors.textSecondary, borderColor: colors.border }]}
            placeholder="Telegram"
            placeholderTextColor={colors.textSecondary}
            value={contactTelegram}
            editable={false}
          />
        </View>

        {/* Status - Only show when creating new listing, not when editing */}
        {!isEditMode && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Status</Text>
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
                    Draft
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
                    Submit
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
            <Text style={[styles.hint, { color: colors.textSecondary }]}>
              Draft: Save for later. Submit: Publish listing (images will be added by platform).
            </Text>
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
                ? 'Update Listing'
                : (status === 'draft' ? 'Save as Draft' : 'Create Listing')
              }
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


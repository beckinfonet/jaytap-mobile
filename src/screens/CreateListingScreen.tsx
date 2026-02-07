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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { PropertyService } from '../services/PropertyService';
import { AuthService } from '../services/AuthService';
import { Property } from '../types/Property';

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
  const [currency, setCurrency] = useState('$');
  const [type, setType] = useState<'rent' | 'sale'>('rent');
  const [propertyType, setPropertyType] = useState('Apartment');
  const [bedrooms, setBedrooms] = useState('');
  const [bathrooms, setBathrooms] = useState('');
  const [areaSqm, setAreaSqm] = useState('');
  const [features, setFeatures] = useState<string[]>([]);
  const [featureInput, setFeatureInput] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [instagramUrl, setInstagramUrl] = useState('');
  const [status, setStatus] = useState<'draft' | 'live'>('draft');
  
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
      
      // Parse address to extract street, district, city
      const addressParts = propertyToEdit.address?.split(',') || [];
      if (addressParts.length > 0) {
        setAddress(addressParts[0].trim());
      }
      if (addressParts.length > 1) {
        setDistrict(addressParts[1].trim());
      }
      if (addressParts.length > 2) {
        setCity(addressParts[2].trim());
      } else if (propertyToEdit.city) {
        setCity(propertyToEdit.city);
      }
      
      setPrice(typeof propertyToEdit.price === 'number' ? propertyToEdit.price.toString() : propertyToEdit.price || '');
      setCurrency(propertyToEdit.currency || '$');
      setType(propertyToEdit.type || 'rent');
      setPropertyType(propertyToEdit.propertyType || 'Apartment');
      setBedrooms(propertyToEdit.specs?.beds?.toString() || '');
      setBathrooms(propertyToEdit.specs?.baths?.toString() || '');
      setAreaSqm(propertyToEdit.specs?.sqft?.toString() || '');
      setFeatures(propertyToEdit.features || []);
      setVideoUrl(propertyToEdit.videoUrl || '');
      setInstagramUrl((propertyToEdit as any).instagramUrl || '');
      setStatus((propertyToEdit as any).status || 'draft');
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
    if (!price.trim()) {
      Alert.alert('Error', 'Price is required');
      return;
    }

    setLoading(true);
    try {
      // Build full address with district if provided
      let fullAddress = address;
      if (district) {
        fullAddress = `${address}, ${district}`;
      }
      if (city) {
        fullAddress = `${fullAddress}, ${city}`;
      }

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
        instagramUrl: instagramUrl.trim(),
        status,
      };

      if (isEditMode && propertyToEdit?.id) {
        await PropertyService.updateProperty(propertyToEdit.id, propertyData, []); // Images will be added by platform later
        Alert.alert('Success', 'Listing updated successfully!', [
          { text: 'OK', onPress: onSuccess },
        ]);
      } else {
        await PropertyService.createProperty(propertyData, []); // Images will be added by platform later
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
          <Text style={[styles.label, { color: colors.textSecondary, marginBottom: 8 }]}>Price *</Text>
          <View style={styles.row}>
            <View style={styles.halfInput}>
              <TextInput
                style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border }]}
                placeholder="Amount (e.g., 850)"
                placeholderTextColor={colors.textSecondary}
                value={price}
                onChangeText={setPrice}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.halfInput}>
              <TextInput
                style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border }]}
                placeholder="Currency (e.g., $, €, ₽)"
                placeholderTextColor={colors.textSecondary}
                value={currency}
                onChangeText={setCurrency}
                maxLength={5}
              />
            </View>
          </View>
          <Text style={[styles.hint, { color: colors.textSecondary }]}>
            Enter the price amount and currency symbol (e.g., 850 and $ for $850)
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

        {/* Status */}
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
              <Text style={[styles.segmentText, { color: status === 'draft' ? (isDark ? '#FFF' : '#000') : (isDark ? '#8E8E93' : '#666') }]}>
                📝 Draft
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.segmentButton,
                status === 'live' && { backgroundColor: isDark ? '#000000' : '#FFFFFF', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 }
              ]}
              onPress={() => setStatus('live')}
            >
              <Text style={[styles.segmentText, { color: status === 'live' ? (isDark ? '#FFF' : '#000') : (isDark ? '#8E8E93' : '#666') }]}>
                ✅ Submit
              </Text>
            </TouchableOpacity>
          </View>
          <Text style={[styles.hint, { color: colors.textSecondary }]}>
            Draft: Save for later. Submit: Publish listing (images will be added by platform).
          </Text>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, { backgroundColor: colors.primary }]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.submitButtonText}>
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


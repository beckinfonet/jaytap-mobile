import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  StatusBar,
  Alert,
  Linking,
  Platform,
  ActivityIndicator,
  Modal,
  TouchableWithoutFeedback,
  LayoutAnimation,
  UIManager,
} from 'react-native';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import { SafeAreaView } from 'react-native-safe-area-context';
import { Filter } from 'lucide-react-native';
import { Property } from '../types/Property';
import { PropertyCard } from '../components/PropertyCard';
import { PropertyMap } from '../components/PropertyMap';
import { ThemeToggleSwitch } from '../components/ThemeToggleSwitch';
import { LanguageToggleSwitch } from '../components/LanguageToggleSwitch';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { PropertyService } from '../services/PropertyService';

interface HomeScreenProps {
  onSelectProperty: (property: Property) => void;
  onOpenTours: (property: Property) => void;
  onOpenProfile: () => void;
  onOpenFavorites?: () => void; // Optional handler to open favorites screen
  viewMode?: 'list' | 'map';
  onViewModeChange?: (mode: 'list' | 'map') => void;
  onFavorite?: (property: Property) => void; // Optional favorite handler
  favoriteStatuses?: Record<string, boolean>; // Map of property ID to favorite status
  favoriteLoading?: Record<string, boolean>; // Map of property ID to loading status
}

const RESIDENTIAL_TYPES = ['Apartment', 'House', 'Townhome', 'Condo'];
const COMMERCIAL_TYPES = ['Office', 'Retail', 'Warehouse', 'Land', 'Industrial'];

const BISHKEK_DISTRICTS = [
  'Bishkek (All)',
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

export const HomeScreen: React.FC<HomeScreenProps> = ({ onSelectProperty, onOpenTours, onOpenProfile, onOpenFavorites, viewMode: propViewMode, onViewModeChange, onFavorite, favoriteStatuses = {}, favoriteLoading = {} }) => {
  const { colors, theme, isDark, toggleTheme } = useTheme();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');

  // New Filter State
  const [transactionType, setTransactionType] = useState<'rent' | 'sale'>('rent');
  const [isCommercial, setIsCommercial] = useState(false);
  const [selectedType, setSelectedType] = useState<string | null>(null);

  // Filter section visibility (closed by default; tap filter icon to expand)
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);

  // Location State
  const [selectedDistrict, setSelectedDistrict] = useState('Bishkek (All)');
  const [isLocationDropdownOpen, setIsLocationDropdownOpen] = useState(false);

  // View Mode: List or Map - use prop if provided, otherwise internal state
  const [internalViewMode, setInternalViewMode] = useState<'list' | 'map'>('list');
  const viewMode = propViewMode ?? internalViewMode;
  const setViewMode = onViewModeChange ?? setInternalViewMode;

  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProperties();
  }, []);

  const loadProperties = async () => {
    try {
      const data = await PropertyService.getAllProperties();
      setProperties(data ?? []);
    } catch (error: any) {
      console.error('[HomeScreen] loadProperties - catch:', error?.message, error);
      Alert.alert('Error', 'Failed to load properties');
    } finally {
      setLoading(false);
    }
  };

  const filteredProperties = useMemo(() => {
    return properties.filter((p) => {
      // 1. Transaction Type Filter (Rent vs Sale)
      const pType = p.type?.toLowerCase();
      if (pType && pType !== transactionType) return false;

      // 2. Commercial vs Residential Filter
      const pPropertyType = p.propertyType?.toLowerCase() || 'apartment';
      const isPropCommercial = COMMERCIAL_TYPES.some(t => t.toLowerCase() === pPropertyType);

      if (isCommercial) {
        if (!isPropCommercial) return false;
      } else {
        if (isPropCommercial) return false;
      }

      // 3. Specific Property Type Filter
      if (selectedType) {
        if (pPropertyType !== selectedType.toLowerCase()) return false;
      }

      // 4. District Filter
      if (selectedDistrict !== 'Bishkek (All)') {
        // Search for district name in address or description since we don't have a district field yet
        const searchDistrict = selectedDistrict.toLowerCase();
        const addressMatch = p.address?.toLowerCase().includes(searchDistrict);
        const descMatch = p.description?.toLowerCase().includes(searchDistrict);

        // Simple heuristic: if the district name is specific (like "Jal"), match it.
        // For numbered microdistricts, we need to be careful not to match random numbers, 
        // but for now simple inclusion is a good start.
        if (!addressMatch && !descMatch) return false;
      }

      // 5. Search Query (including listingId, name, city, neighborhood, address)
      if (searchQuery) {
        const query = searchQuery.toLowerCase().trim();
        // Remove dashes and spaces for listingId search (e.g., "123-456" or "123456" both work)
        const queryWithoutDashes = query.replace(/[-\s]/g, '');

        // Extract potential neighborhood from address (everything after the first comma)
        const addressParts = p.address?.toLowerCase().split(',') || [];
        const neighborhood = addressParts.length > 1 ? addressParts[1].trim() : '';

        return (
          // Search by title/name
          p.title.toLowerCase().includes(query) ||
          // Search by full address
          p.address.toLowerCase().includes(query) ||
          // Search by city
          (p.city && p.city.toLowerCase().includes(query)) ||
          // Search by neighborhood (part of address after first comma)
          neighborhood.includes(query) ||
          // Search by listing ID (with or without dashes)
          (p.listingId && (
            p.listingId.toLowerCase().includes(query) ||
            p.listingId.replace(/[-\s]/g, '').includes(queryWithoutDashes)
          ))
        );
      }
      return true;
    });
  }, [properties, transactionType, isCommercial, selectedType, selectedDistrict, searchQuery]);

  const handlePressProperty = (property: Property) => {
    onSelectProperty(property);
  };

  const handleViewTour = async (property: Property) => {
    if (property.tours && property.tours.length > 0) {
      onOpenTours(property);
    } else {
      Alert.alert('Info', 'No 3D Tour available for this property.');
    }
  };

  const handleViewVideo = async (property: Property) => {
    if (property.videoUrl) {
      const supported = await Linking.canOpenURL(property.videoUrl);
      if (supported) {
        await Linking.openURL(property.videoUrl);
      } else {
        Alert.alert('Error', 'Cannot open Video URL');
      }
    } else {
      Alert.alert('Info', 'No video available for this property.');
    }
  };

  const togglePropertyType = (type: string) => {
    if (selectedType === type) {
      setSelectedType(null); // Deselect
    } else {
      setSelectedType(type);
    }
  };

  const toggleFiltersExpanded = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsFiltersExpanded((prev) => !prev);
  };

  const renderHeaderContent = () => (
    <View style={styles.headerContainer}>
      {/* Top Bar: Menu, Location, Icons */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.iconButton} onPress={onOpenProfile}>
          {user ? (
            <View style={[styles.avatarSmall, { backgroundColor: colors.primaryLight }]}>
              <Text style={[styles.avatarTextSmall, { color: colors.primary }]}>
                {user.email?.charAt(0).toUpperCase()}
              </Text>
            </View>
          ) : (
            <Text style={[styles.iconText, { color: colors.text }]}>☰</Text>
          )}
        </TouchableOpacity>

        {/* Location Selector */}
        <View style={styles.locationWrapper}>
          <TouchableOpacity
            style={styles.locationContainer}
            onPress={() => setIsLocationDropdownOpen(!isLocationDropdownOpen)}
            activeOpacity={0.7}
          >
            <Text style={[styles.locationTitle, { color: colors.text }]}>
              {selectedDistrict === 'Bishkek (All)' ? 'Bishkek • All' : `Bishkek • ${selectedDistrict}`} ⌄
            </Text>
          </TouchableOpacity>

          {/* Dropdown Modal/Overlay */}
          {isLocationDropdownOpen && (
            <Modal
              transparent={true}
              visible={isLocationDropdownOpen}
              onRequestClose={() => setIsLocationDropdownOpen(false)}
              animationType="fade"
            >
              <TouchableWithoutFeedback onPress={() => setIsLocationDropdownOpen(false)}>
                <View style={styles.modalOverlay}>
                  <View style={[
                    styles.dropdownMenu,
                    {
                      backgroundColor: isDark ? '#1E1E1E' : '#FFF',
                      borderColor: isDark ? '#333' : '#E5E5EA',
                    }
                  ]}>
                    <FlatList
                      data={BISHKEK_DISTRICTS}
                      keyExtractor={(item) => item}
                      style={{ maxHeight: 300 }}
                      renderItem={({ item }) => (
                        <TouchableOpacity
                          style={[
                            styles.dropdownItem,
                            { borderBottomColor: isDark ? '#333' : '#F0F0F0' }
                          ]}
                          onPress={() => {
                            setSelectedDistrict(item);
                            setIsLocationDropdownOpen(false);
                          }}
                        >
                          <Text style={[
                            styles.dropdownItemText,
                            {
                              color: item === selectedDistrict ? colors.accent : colors.text,
                              fontWeight: item === selectedDistrict ? '700' : '400'
                            }
                          ]}>
                            {item}
                          </Text>
                          {item === selectedDistrict && (
                            <Text style={{ color: colors.accent }}>✓</Text>
                          )}
                        </TouchableOpacity>
                      )}
                    />
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </Modal>
          )}
        </View>

        <View style={styles.rightIcons}>
          <ThemeToggleSwitch />
          <LanguageToggleSwitch />
        </View>
      </View>

      {/* Search Bar + Filter Icon Row */}
      <View style={styles.searchRow}>
        <View style={[styles.searchContainer, { backgroundColor: colors.inputBackground }]}>
          <Text style={[styles.searchIcon, { color: colors.textSecondary }]}>🔍</Text>
          <TextInput
            key="search-input"
            style={[styles.searchInput, { color: colors.text }]}
            placeholder={t('home.searchPlaceholder')}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={colors.textSecondary}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
          />
        </View>
        <TouchableOpacity
          style={[
            styles.filterButton,
            {
              backgroundColor: isFiltersExpanded ? colors.accent : colors.inputBackground,
            },
          ]}
          onPress={toggleFiltersExpanded}
        >
          <Filter
            size={22}
            color={isFiltersExpanded ? '#FFF' : colors.text}
            strokeWidth={isFiltersExpanded ? 2.5 : 2}
          />
        </TouchableOpacity>
      </View>

      {/* Filter Section - Collapsible (toggled via filter icon in top right) */}
      {isFiltersExpanded && (
        <View style={styles.filterSection}>
          {/* Rent / Buy Segmented Control */}
            <View style={[styles.segmentedControl, { backgroundColor: isDark ? '#2C2C2E' : '#E5E5EA' }]}>
              <TouchableOpacity
                style={[
                  styles.segmentButton,
                  transactionType === 'rent' && { backgroundColor: isDark ? '#000000' : '#FFFFFF', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 }
                ]}
                onPress={() => setTransactionType('rent')}
                activeOpacity={0.8}
              >
                <Text style={[
                  styles.segmentText,
                  { color: transactionType === 'rent' ? (isDark ? '#FFF' : '#000') : (isDark ? '#8E8E93' : '#666') }
                ]}>🏠 {t('home.rent')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.segmentButton,
                  transactionType === 'sale' && { backgroundColor: isDark ? '#000000' : '#FFFFFF', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 }
                ]}
                onPress={() => setTransactionType('sale')}
                activeOpacity={0.8}
              >
                <Text style={[
                  styles.segmentText,
                  { color: transactionType === 'sale' ? (isDark ? '#FFF' : '#000') : (isDark ? '#8E8E93' : '#666') }
                ]}>🏠 {t('home.buy')}</Text>
              </TouchableOpacity>
            </View>

            {/* Dynamic Filter Row */}
            <View style={styles.filterRow}>
              <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterList}
                data={[
                  { id: 'commercial_toggle', label: 'Commercial', isToggle: true },
                  ...(isCommercial ? COMMERCIAL_TYPES : RESIDENTIAL_TYPES).map(t => ({ id: t, label: t, isToggle: false }))
                ]}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => {
                  if (item.isToggle) {
                    return (
                      <TouchableOpacity
                        style={[
                          styles.filterChip,
                          {
                            backgroundColor: isCommercial ? colors.accent : (isDark ? '#2C2C2E' : '#F2F2F7'),
                            borderColor: isCommercial ? colors.accent : (isDark ? '#3A3A3C' : '#E5E5EA'),
                          },
                        ]}
                        onPress={() => {
                          setIsCommercial(!isCommercial);
                          setSelectedType(null);
                        }}
                      >
                        <Text style={[
                          styles.filterText,
                          { color: isCommercial ? '#FFF' : colors.text }
                        ]}>
                          {item.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  }

                  const isActive = selectedType === item.label;
                  return (
                    <TouchableOpacity
                      style={[
                        styles.filterChip,
                        {
                          backgroundColor: isActive ? colors.activeChipBackground : (isDark ? '#2C2C2E' : '#F2F2F7'),
                          borderColor: isDark ? '#3A3A3C' : '#E5E5EA'
                        },
                      ]}
                      onPress={() => togglePropertyType(item.label)}
                    >
                      <Text
                        style={[
                          styles.filterText,
                          { color: isActive ? colors.activeChipText : colors.text },
                        ]}
                      >
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                }}
              />
            </View>
        </View>
      )}

      <Text style={[styles.resultCount, { color: colors.textSecondary }]}>
        {filteredProperties.length} {t('home.homes')}
      </Text>
    </View>
  );

  if (viewMode === 'map') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
        <PropertyMap
          properties={filteredProperties}
          onSelectProperty={handlePressProperty}
          onCloseMap={() => setViewMode('list')}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />

      {loading ? (
        <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <View style={styles.contentContainer}>
          {renderHeaderContent()}
          <FlatList
            data={filteredProperties}
            keyExtractor={(item, index) => item.id || item.listingId || `property-${index}`}
            renderItem={({ item }) => (
              <PropertyCard
                property={item}
                onPress={handlePressProperty}
                onViewTour={handleViewTour}
                onViewVideo={handleViewVideo}
                onFavorite={onFavorite}
                isFavorited={favoriteStatuses[item.id] || false}
                isLoading={favoriteLoading[item.id] || false}
              />
            )}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />

          {/* Floating Map Button - bottom right, above bottom navigator */}
          <TouchableOpacity
            style={[styles.mapButton, { backgroundColor: colors.surface, shadowColor: colors.cardShadow }]}
            onPress={() => setViewMode('map')}
          >
            <Text style={{ fontSize: 18, marginRight: 6 }}>📍</Text>
            <Text style={[styles.mapButtonText, { color: colors.text }]}>{t('home.onMap')}</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
    position: 'relative',
  },
  headerContainer: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 0,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    zIndex: 10, // Ensure zIndex for dropdown overlap if needed
  },
  iconButton: {
    padding: 4,
  },
  iconText: {
    fontSize: 24,
  },
  avatarSmall: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarTextSmall: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  locationWrapper: {
    flex: 1,
    alignItems: 'center',
    zIndex: 20,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationTitle: {
    fontSize: 16,
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif' }),
    fontWeight: '500',
  },
  // Dropdown Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.2)', // Dim background slightly
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 100 : 80, // Approximate top bar position
  },
  dropdownMenu: {
    width: 250,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  dropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownItemText: {
    fontSize: 16,
  },
  rightIcons: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 30,
    paddingHorizontal: 16,
    height: 50,
  },
  filterButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchIcon: {
    fontSize: 18,
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    height: '100%',
  },
  filterSection: {
    marginBottom: 16,
  },
  segmentedControl: {
    flexDirection: 'row',
    borderRadius: 30,
    padding: 4,
    marginBottom: 16,
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
  filterRow: {
    marginBottom: 16,
  },
  filterList: {
    paddingRight: 0,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
  },
  resultCount: {
    fontSize: 14,
    marginBottom: 10,
    marginLeft: 4,
  },
  listContent: {
    paddingBottom: 88, // Space for floating map button above tab bar
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapButton: {
    position: 'absolute',
    bottom: 24,
    right: 16,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 100,
  },
  mapButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 4,
  }
});

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
  RefreshControl,
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
import { canFromUser } from '../hooks/useRole';
import {
  RESIDENTIAL_TYPES,
  COMMERCIAL_TYPES,
  HOSPITALITY_TYPES,
  propertyTypeToCategory,
  type PropertyCategory,
} from '../utils/propertyCategory';
import { HospitalityCard } from '../components/HospitalityCard';
import { HospitalitySection } from '../components/HospitalitySection';
import { HomeRejectionBanner } from '../components/HomeRejectionBanner';

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
  refreshKey?: number; // Bump from parent to force refetch (e.g. after archive/unarchive in My Listings)
  /** D-14 / MOD-09: open RenterListings with `defaultTab='rejected'` from the HomeRejectionBanner CTA.
   *  Wired by Plan 08 in App.tsx — until then, the banner press is a no-op. */
  onOpenMyListingsRejectedTab?: () => void;
}

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

export const HomeScreen: React.FC<HomeScreenProps> = ({ onSelectProperty, onOpenTours, onOpenProfile, onOpenFavorites, viewMode: propViewMode, onViewModeChange, onFavorite, favoriteStatuses = {}, favoriteLoading = {}, refreshKey, onOpenMyListingsRejectedTab }) => {
  const { colors, theme, isDark, toggleTheme } = useTheme();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');

  // New Filter State (D-04: tri-state replaces the prior binary commercial toggle)
  const [transactionType, setTransactionType] = useState<'rent' | 'sale'>('rent');
  const [selectedCategory, setSelectedCategory] = useState<PropertyCategory>('Residential');
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
  const [refreshing, setRefreshing] = useState(false);
  // D-14 / MOD-09: rejected-listing count for HomeRejectionBanner. Lazy-fetched once
  // per session for owners that can list (canListProperties OR moderator/admin role).
  const [rejectedCount, setRejectedCount] = useState(0);

  useEffect(() => {
    loadProperties();
  }, [refreshKey]);

  const loadProperties = async () => {
    try {
      const data = await PropertyService.getAllProperties();
      // D-07: defense in depth — server filters but client coalesces and re-filters at SOURCE.
      // Pitfall 3: filtering only filteredProperties leaks pending/rejected rows into the
      // hospitality strip (which derives separately from `properties`).
      const liveOnly = (data ?? []).filter((p: Property) => (p.status ?? 'live') === 'live');
      setProperties(liveOnly);
    } catch (error: any) {
      console.error('[HomeScreen] loadProperties - catch:', error?.message, error);
      Alert.alert('Error', 'Failed to load properties');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const data = await PropertyService.getAllProperties();
      // D-07: same source-level coalesce + filter on refresh path (Pitfall 3 mirror).
      const liveOnly = (data ?? []).filter((p: Property) => (p.status ?? 'live') === 'live');
      setProperties(liveOnly);
    } catch (error: any) {
      console.error('[HomeScreen] onRefresh - catch:', error?.message, error);
    } finally {
      setRefreshing(false);
    }
  }, []);

  // D-14 / MOD-09: lazy-fetch rejected count for the current owner. Guarded by
  // can('manageListings') (canListProperties OR moderator/admin role) so guests
  // never trigger the call. Re-runs when the user changes or refreshKey bumps.
  useEffect(() => {
    if (!user?.localId) return;
    if (!canFromUser(user, 'manageListings')) return;

    PropertyService.getUserProperties(user.localId)
      .then((mine: Property[]) => {
        const rejected = (mine ?? []).filter((p) => p.status === 'rejected').length;
        setRejectedCount(rejected);
      })
      .catch((err: any) => {
        console.warn('[HomeScreen] failed to count rejected listings:', err?.message);
      });
  }, [user?.localId, refreshKey]);

  const filteredProperties = useMemo(() => {
    return properties.filter((p) => {
      // Phase 2 D-20 read-path swap: M2 flat `p.type` → M3 nested `p.dealType`.
      // Tradeoff §K rule: rent strip = `dealType !== 'sale'`; sale strip = `dealType === 'sale'`.
      // 1. Transaction Type Filter (Rent vs Sale)
      const isSale = p.dealType === 'sale';
      if (transactionType === 'sale' && !isSale) return false;
      if (transactionType === 'rent' && isSale) return false;

      // 2. Category Filter (D-04 / D-24: tri-state via propertyTypeToCategory)
      if (propertyTypeToCategory(p.propertyType) !== selectedCategory) return false;

      // 3. Specific Property Type Filter
      if (selectedType) {
        const pPropertyType = p.propertyType?.toLowerCase() || 'apartment';
        if (pPropertyType !== selectedType.toLowerCase()) return false;
      }

      // 4. District Filter (D-10: chips stay HARDCODED — only the listing-render reads
      // switch to nested. Match against location.district + location.city + content.description.)
      if (selectedDistrict !== 'Bishkek (All)') {
        const searchDistrict = selectedDistrict.toLowerCase();
        const districtMatch = p.location?.district?.toLowerCase().includes(searchDistrict);
        const cityMatch = p.location?.city?.toLowerCase().includes(searchDistrict);
        const descMatch = p.content?.description?.toLowerCase().includes(searchDistrict);
        if (!districtMatch && !cityMatch && !descMatch) return false;
      }

      // 5. Search Query (listingId, title, city, district, description)
      if (searchQuery) {
        const query = searchQuery.toLowerCase().trim();
        // Remove dashes and spaces for listingId search (e.g., "123-456" or "123456" both work)
        const queryWithoutDashes = query.replace(/[-\s]/g, '');
        const titleLc = p.content?.title?.toLowerCase() ?? '';
        const cityLc = p.location?.city?.toLowerCase() ?? '';
        const districtLc = p.location?.district?.toLowerCase() ?? '';
        const descLc = p.content?.description?.toLowerCase() ?? '';

        return (
          // Search by title
          titleLc.includes(query) ||
          // Search by city slug (M4 owns dynamic-dictionary label lookup per D-10)
          cityLc.includes(query) ||
          // Search by district slug
          districtLc.includes(query) ||
          // Search inside description body
          descLc.includes(query) ||
          // Search by listing ID (with or without dashes)
          (p.listingId && (
            p.listingId.toLowerCase().includes(query) ||
            p.listingId.replace(/[-\s]/g, '').includes(queryWithoutDashes)
          ))
        );
      }
      return true;
    });
  }, [properties, transactionType, selectedCategory, selectedType, selectedDistrict, searchQuery]);

  // Tradeoff §K caller-side hospitality derivation — `dealType !== 'sale'` replaces
  // M2 `transactionType === 'rent'` semantics. Strip count tracks the Rent/Sell toggle.
  const hospitalityProperties = useMemo(
    () => properties.filter((p) =>
      propertyTypeToCategory(p.propertyType) === 'Hospitality'
      && (transactionType === 'rent' ? p.dealType !== 'sale' : p.dealType === 'sale')
    ),
    [properties, transactionType],
  );

  const handlePressProperty = (property: Property) => {
    onSelectProperty(property);
  };

  const handleViewTour = async (property: Property) => {
    // Phase 1 D-12: tours[] flattened to media.tourUrl (first-tour wins).
    if (property.media?.tourUrl) {
      onOpenTours(property);
    } else {
      Alert.alert('Info', 'No 3D Tour available for this property.');
    }
  };

  const handleViewVideo = async (property: Property) => {
    // Phase 1 D-12: videos[] also lives under media. First entry wins for the legacy single-video CTA.
    const videoUrl = property.media?.videos?.[0];
    if (videoUrl) {
      const supported = await Linking.canOpenURL(videoUrl);
      if (supported) {
        await Linking.openURL(videoUrl);
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

      {/* D-14 / MOD-09: HomeRejectionBanner — only renders when rejectedCount > 0
          (Plan 05 component auto-returns null on count <= 0). Placed below the search
          bar and above the collapsible filter section so it's always visible regardless
          of filter-expansion state. Tap navigates parent to RenterListings → 'rejected' tab. */}
      {rejectedCount > 0 && (
        <HomeRejectionBanner
          count={rejectedCount}
          onPress={onOpenMyListingsRejectedTab ?? (() => {})}
        />
      )}

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

            {/* Category-toggle Row (D-04 tri-state: Residential / Commercial / Hospitality) */}
            <View style={styles.categoryToggleRow}>
              {(['Residential', 'Commercial', 'Hospitality'] as PropertyCategory[]).map((cat) => {
                const selected = selectedCategory === cat;
                const keyMap: Record<PropertyCategory, 'category.residential' | 'category.commercial' | 'category.hospitality'> = {
                  Residential: 'category.residential',
                  Commercial: 'category.commercial',
                  Hospitality: 'category.hospitality',
                };
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.categoryChip,
                      {
                        backgroundColor: selected ? colors.accent : (isDark ? '#2C2C2E' : '#F2F2F7'),
                        borderColor: selected ? colors.accent : (isDark ? '#3A3A3C' : '#E5E5EA'),
                      },
                    ]}
                    onPress={() => {
                      setSelectedCategory(cat);
                      setSelectedType(null);
                    }}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    accessibilityLabel={t(keyMap[cat])}
                    hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                  >
                    <Text
                      style={[
                        styles.filterText,
                        { color: selected ? '#FFFFFF' : colors.text },
                      ]}
                      numberOfLines={1}
                    >
                      {t(keyMap[cat])}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Dynamic Filter Row — property-type chips, source switches on selectedCategory (D-04) */}
            <View style={styles.filterRow}>
              {(() => {
                const chipTypes = selectedCategory === 'Hospitality'
                  ? HOSPITALITY_TYPES
                  : selectedCategory === 'Commercial'
                    ? COMMERCIAL_TYPES
                    : RESIDENTIAL_TYPES;
                return (
                  <FlatList
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.filterList}
                    data={chipTypes.map((tname) => ({ id: tname, label: tname }))}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => {
                      const isActive = selectedType === item.label;
                      return (
                        <TouchableOpacity
                          style={[
                            styles.filterChip,
                            {
                              backgroundColor: isActive ? colors.activeChipBackground : (isDark ? '#2C2C2E' : '#F2F2F7'),
                              borderColor: isDark ? '#3A3A3C' : '#E5E5EA',
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
                );
              })()}
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
            ListHeaderComponent={
              selectedCategory !== 'Hospitality' ? (
                <HospitalitySection
                  properties={hospitalityProperties}
                  onPress={handlePressProperty}
                  onViewTour={handleViewTour}
                  onFavorite={onFavorite}
                  favoriteStatuses={favoriteStatuses}
                  favoriteLoading={favoriteLoading}
                />
              ) : null
            }
            renderItem={({ item }) => (
              selectedCategory === 'Hospitality' ? (
                <HospitalityCard
                  property={item}
                  onPress={handlePressProperty}
                  onViewTour={handleViewTour}
                  onFavorite={onFavorite}
                  isFavorited={favoriteStatuses[item.id] || false}
                  isLoading={favoriteLoading[item.id] || false}
                />
              ) : (
                <PropertyCard
                  property={item}
                  onPress={handlePressProperty}
                  onViewTour={handleViewTour}
                  onViewVideo={handleViewVideo}
                  onFavorite={onFavorite}
                  isFavorited={favoriteStatuses[item.id] || false}
                  isLoading={favoriteLoading[item.id] || false}
                />
              )
            )}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={colors.primary}
                colors={[colors.primary]}
              />
            }
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
  // D-04 tri-state category toggle row (Residential / Commercial / Hospitality)
  categoryToggleRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
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

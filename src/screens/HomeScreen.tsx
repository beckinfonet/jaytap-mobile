import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  // Phase 14 Plan 14-02 — RESIDENTIAL_TYPES / COMMERCIAL_TYPES / HOSPITALITY_TYPES
  // moved to CascadingFilter. HomeScreen no longer reads these directly.
  propertyTypeToCategory,
  type PropertyCategory,
} from '../utils/propertyCategory';
import { buildFilterQuery } from '../utils/buildFilterQuery';
// Phase 14 Plan 14-02 (FILT-02) — variant dispatch precursor.
import { useFilterStyle } from '../context/FilterStyleContext';
import CascadingFilter from '../components/filters/CascadingFilter';
// Phase 14 Plan 14-03 (FILT-01, FILT-03) — Guided sheet variant sibling mount.
import GuidedFilterSheet from '../components/filters/GuidedFilterSheet';
// Quick-task 260601-1b8 — summary-row breadcrumb collapse helper (matches the
// Cascading panel's own wording).
import { joinTypes } from '../components/filters/primitives/joinTypes';
import { HospitalityCard } from '../components/HospitalityCard';
import { HospitalitySection } from '../components/HospitalitySection';
import { HomeRejectionBanner } from '../components/HomeRejectionBanner';
import { fetchCities, type City } from '../services/locationService';
import type { TranslationKeys } from '../locales';

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

// Quick-task 260530-sud — country/city picker.
// The previous BISHKEK_DISTRICTS hardcoded array was deleted because (a) the
// listing form no longer captures district (quick-task 260527-0cg removed it
// in Phase 12), so the microdistrict chips returned zero results on most new
// listings, and (b) JayTap's geographic scope is KG/KZ/UZ, not Bishkek-only.
// City list now comes from GET /locations/cities (locationService.fetchCities).
const COUNTRY_ORDER: ReadonlyArray<'KG' | 'KZ' | 'UZ'> = ['KG', 'KZ', 'UZ'];

type LocationDropdownItem =
  | { kind: 'all' }
  | { kind: 'header'; country: 'KG' | 'KZ' | 'UZ' }
  | { kind: 'city'; city: City }
  | { kind: 'loading' };

export const HomeScreen: React.FC<HomeScreenProps> = ({ onSelectProperty, onOpenTours, onOpenProfile, onOpenFavorites, viewMode: propViewMode, onViewModeChange, onFavorite, favoriteStatuses = {}, favoriteLoading = {}, refreshKey, onOpenMyListingsRejectedTab }) => {
  const { colors, theme, isDark, toggleTheme } = useTheme();
  const { user } = useAuth();
  const { t, language } = useLanguage();
  // Phase 14 Plan 14-02 — variant dispatch read; Plan 14-03 will add the 'guided' branch.
  const { filterStyle } = useFilterStyle();
  // Quick-task 260601-1b8 — ref on the results FlatList so toggleFiltersExpanded
  // can scroll back to the top when the Cascading panel is (re)opened. Loose `any`
  // generic matches the existing untyped FlatList usage at L585 (tightening is out
  // of scope for this quick).
  const listRef = useRef<FlatList<any>>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // New Filter State (D-04: tri-state replaces the prior binary commercial toggle)
  const [transactionType, setTransactionType] = useState<'rent' | 'sale'>('rent');
  const [selectedCategory, setSelectedCategory] = useState<PropertyCategory>('Residential');
  // Phase 13 Plan 13-01 / DATA-01 — multi-select-capable filter state. Visible single-chip
  // UI in Phase 13 keeps writing `[singleType]` under the hood; Phase 14 variants will
  // exercise the OR-union shape at the UI layer. Empty array = "no type filter".
  const [types, setTypes] = useState<string[]>([]);

  // Filter section visibility (closed by default; tap filter icon to expand)
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);

  // Location State (quick-task 260530-sud) — null = "All cities", default on launch.
  // selectedCity holds the full City object so the header can render country + label
  // without an extra lookup.
  const [selectedCity, setSelectedCity] = useState<City | null>(null);
  const [cities, setCities] = useState<City[]>([]);
  const [loadingCities, setLoadingCities] = useState(true);
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

  // Quick-task 260530-sud — fetch approved cities once on mount. Mirrors the
  // Step2Location pattern (file: src/components/ContextualListingFlow/Step2Location.tsx).
  // On failure: silent — user falls back to "All cities" (the default) and still sees
  // every listing. The picker just shows an empty modal body until they retry.
  useEffect(() => {
    let cancelled = false;
    fetchCities()
      .then((c) => {
        if (cancelled) return;
        setCities(c);
        setLoadingCities(false);
      })
      .catch(() => {
        if (cancelled) return;
        setLoadingCities(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
    // Phase 13 Plan 13-01 / DATA-02 — clauses 1-3 (deal × category × types) delegate
    // to the canonical buildFilterQuery predicate. City + search-query stay inline
    // per D-06 boundary (those dimensions are NOT part of the M6 shared model —
    // REQUIREMENTS DATA-01 names only deal | category | types). Phase 14 variants
    // will read the same buildFilterQuery shape; city + search remain HomeScreen-local.
    const matchesShared = buildFilterQuery({
      deal: transactionType,
      category: selectedCategory,
      types,
    });
    return properties.filter((p) => {
      // 1-3. Shared canonical predicate (deal × category × types OR-union).
      if (!matchesShared(p)) return false;

      // 4. City Filter (quick-task 260530-sud) — exact case-insensitive slug equality
      // on listing.location.city. Microdistrict substring fallbacks (district / address /
      // description) are gone with the picker rework — the chips themselves are gone,
      // so there's no chip-text to substring-match. Freetext search below still hits
      // district + address + description for users typing free queries.
      if (selectedCity) {
        const targetSlug = selectedCity.slug.toLowerCase();
        if ((p.location?.city ?? '').toLowerCase() !== targetSlug) return false;
      }

      // 5. Search Query (listingId, title, city, district, address, description)
      if (searchQuery) {
        const query = searchQuery.toLowerCase().trim();
        // Remove dashes and spaces for listingId search (e.g., "123-456" or "123456" both work)
        const queryWithoutDashes = query.replace(/[-\s]/g, '');
        const titleLc = p.content?.title?.toLowerCase() ?? '';
        const cityLc = p.location?.city?.toLowerCase() ?? '';
        const districtLc = p.location?.district?.toLowerCase() ?? '';
        const descLc = p.content?.description?.toLowerCase() ?? '';
        // Quick-task 260527-0cg — freetext search now also matches canonical address text
        // (so users can find new listings by typing a street name or microdistrict word).
        const addressLc = p.location?.address?.toLowerCase() ?? '';

        return (
          // Search by title
          titleLc.includes(query) ||
          // Search by city slug (M4 owns dynamic-dictionary label lookup per D-10)
          cityLc.includes(query) ||
          // Search by district slug
          districtLc.includes(query) ||
          // Search inside description body
          descLc.includes(query) ||
          // Quick-task 260527-0cg — search inside canonical address text
          addressLc.includes(query) ||
          // Search by listing ID (with or without dashes)
          (p.listingId && (
            p.listingId.toLowerCase().includes(query) ||
            p.listingId.replace(/[-\s]/g, '').includes(queryWithoutDashes)
          ))
        );
      }
      return true;
    });
  }, [properties, transactionType, selectedCategory, types, selectedCity, searchQuery]);

  // Quick-task 260530-sud — flatten cities into a country-grouped list for the modal.
  // Synthetic "all" + "header" + "loading" items keep a single FlatList renderer.
  const locationDropdownData: LocationDropdownItem[] = useMemo(() => {
    const items: LocationDropdownItem[] = [{ kind: 'all' }];
    if (loadingCities && cities.length === 0) {
      items.push({ kind: 'loading' });
      return items;
    }
    const byCountry = new Map<'KG' | 'KZ' | 'UZ', City[]>();
    COUNTRY_ORDER.forEach((c) => byCountry.set(c, []));
    cities.forEach((c) => {
      // Only show approved cities in the home picker — pending submissions belong
      // in the listing flow, not in renter discovery. (fetchCities also returns the
      // caller's own pending submissions per locationService.ts:37; filter them out
      // here for the read-side view.)
      if (c.status !== 'approved') return;
      const bucket = byCountry.get(c.country);
      if (bucket) bucket.push(c);
    });
    const lang = (language === 'ru' ? 'ru' : 'en') as 'en' | 'ru';
    byCountry.forEach((arr) =>
      arr.sort((a, b) => a.label[lang].localeCompare(b.label[lang])),
    );
    COUNTRY_ORDER.forEach((country) => {
      const list = byCountry.get(country) ?? [];
      if (list.length === 0) return;
      items.push({ kind: 'header', country });
      list.forEach((city) => items.push({ kind: 'city', city }));
    });
    return items;
  }, [cities, loadingCities, language]);

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

  // Phase 14 Plan 14-02 — togglePropertyType moved into CascadingFilter. The
  // old declaration had only one call site (HomeScreen.tsx:629) inside the deleted
  // inline filter JSX; the new component owns the same OR-union setTypes(prev)
  // callback semantics. setTypes itself is still passed down as a prop.

  // 260603-fbc — memoized so it can be a stable dep of renderListHeader (the
  // summary moved into the list header and calls this). Body only touches the
  // stable setIsFiltersExpanded + listRef, so [] deps are correct.
  const toggleFiltersExpanded = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsFiltersExpanded((prev) => {
      const next = !prev;
      // Quick-task 260601-1b8 — when (re)opening the Cascading panel, scroll the
      // results list back to the top so the panel (which now lives in the list's
      // ListHeaderComponent) is in view. Without this, tapping the filter icon
      // while scrolled down appears to do nothing because the header is above
      // the viewport. Collapse path intentionally does NOT scroll.
      if (next) {
        listRef.current?.scrollToOffset({ offset: 0, animated: true });
      }
      return next;
    });
  }, []);

  // Quick-task 260601-1b8 — stable ListHeaderComponent renderer. The Cascading
  // panel now lives inside the results FlatList's header (above the
  // HospitalitySection branch) so it scrolls away with the results instead of
  // permanently claiming static-header real estate. useCallback is load-bearing:
  // an inline arrow would remount the header subtree on every render, dropping
  // scroll position and potentially blurring taps inside the panel. Props on
  // <CascadingFilter> are VERBATIM the expressions from the previous mount
  // (Phase 14 SC4 parity).
  const renderListHeader = useCallback(() => (
    <>
      {filterStyle === 'cascading' && isFiltersExpanded && (
        <CascadingFilter
          transactionType={transactionType}
          setTransactionType={setTransactionType}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          types={types}
          setTypes={setTypes}
          liveCount={filteredProperties.length}
        />
      )}

      {/* 260603-fbc — filter results summary relocated here: directly under the
          filter panel and above the listing results (was pinned in the static
          header above the filter per 260601-1b8). Same tappable breadcrumb +
          translation logic (260603-emq). */}
      <View style={styles.summaryWrap}>
        {(() => {
          const dealLabel = t(
            transactionType === 'rent' ? 'filters.deal.rent' : 'filters.deal.buy',
          );
          const categoryKey = (
            selectedCategory === 'Residential'
              ? 'category.residential'
              : selectedCategory === 'Commercial'
              ? 'category.commercial'
              : 'category.hospitality'
          ) as TranslationKeys;
          const categoryLabel = t(categoryKey);
          const typesLabel = joinTypes(selectedCategory, types, true, {
            translate: (ty) => t(`propertyType.${ty.toLowerCase()}` as TranslationKeys),
            connective: t('filters.or'),
          });
          const breadcrumb = [dealLabel, categoryLabel, typesLabel]
            .filter((s) => s && s.length > 0)
            .join(' · ');
          return (
            <TouchableOpacity
              onPress={toggleFiltersExpanded}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`${filteredProperties.length} ${t('home.homes')} — ${breadcrumb}`}
            >
              <Text
                style={[styles.resultCount, { color: colors.text }]}
                numberOfLines={1}
              >
                {filteredProperties.length} {t('home.homes')}
              </Text>
              <Text
                style={[styles.summaryBreadcrumb, { color: colors.textSecondary }]}
                numberOfLines={1}
              >
                {breadcrumb}
              </Text>
            </TouchableOpacity>
          );
        })()}
      </View>

      {selectedCategory !== 'Hospitality' ? (
        <HospitalitySection
          properties={hospitalityProperties}
          onPress={handlePressProperty}
          onViewTour={handleViewTour}
          onFavorite={onFavorite}
          favoriteStatuses={favoriteStatuses}
          favoriteLoading={favoriteLoading}
        />
      ) : null}
    </>
  ), [
    filterStyle,
    isFiltersExpanded,
    transactionType,
    setTransactionType,
    selectedCategory,
    setSelectedCategory,
    types,
    setTypes,
    filteredProperties,
    hospitalityProperties,
    handlePressProperty,
    handleViewTour,
    onFavorite,
    favoriteStatuses,
    favoriteLoading,
    t,
    colors,
    toggleFiltersExpanded,
  ]);

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
            {selectedCity ? (
              // Country + city on separate rows (260603-ecf): a single line ellipsized
              // long RU names awkwardly, so stack a small country label over the city.
              <View style={styles.locationTextBlock}>
                <Text
                  style={[styles.locationCountry, { color: colors.textSecondary }]}
                  numberOfLines={1}
                >
                  {t(`country.${selectedCity.country}` as TranslationKeys)}
                </Text>
                <Text
                  style={[styles.locationCity, { color: colors.text }]}
                  numberOfLines={1}
                >
                  {selectedCity.label[(language === 'ru' ? 'ru' : 'en') as 'en' | 'ru']} ⌄
                </Text>
              </View>
            ) : (
              <Text
                style={[styles.locationTitle, { color: colors.text }]}
                numberOfLines={1}
              >
                {t('home.allCities')} ⌄
              </Text>
            )}
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
                      data={locationDropdownData}
                      keyExtractor={(item) =>
                        item.kind === 'all'
                          ? 'all'
                          : item.kind === 'loading'
                          ? 'loading'
                          : item.kind === 'header'
                          ? `header-${item.country}`
                          : `city-${item.city.slug}`
                      }
                      style={{ maxHeight: 360 }}
                      renderItem={({ item }) => {
                        if (item.kind === 'loading') {
                          return (
                            <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                              <ActivityIndicator color={colors.primary} />
                            </View>
                          );
                        }
                        if (item.kind === 'header') {
                          return (
                            <View
                              style={[
                                styles.dropdownSectionHeader,
                                { backgroundColor: isDark ? '#262626' : '#F7F7F8' },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.dropdownSectionHeaderText,
                                  { color: colors.textSecondary },
                                ]}
                              >
                                {t(`country.${item.country}` as TranslationKeys)}
                              </Text>
                            </View>
                          );
                        }
                        const isAll = item.kind === 'all';
                        const isActive = isAll
                          ? selectedCity === null
                          : selectedCity?.slug === item.city.slug;
                        const lang = (language === 'ru' ? 'ru' : 'en') as 'en' | 'ru';
                        const label = isAll
                          ? t('home.allCities')
                          : item.city.label[lang];
                        return (
                          <TouchableOpacity
                            style={[
                              styles.dropdownItem,
                              { borderBottomColor: isDark ? '#333' : '#F0F0F0' },
                            ]}
                            onPress={() => {
                              if (isAll) {
                                setSelectedCity(null);
                              } else {
                                setSelectedCity(item.city);
                              }
                              setIsLocationDropdownOpen(false);
                            }}
                          >
                            <Text
                              style={[
                                styles.dropdownItemText,
                                {
                                  color: isActive ? colors.accent : colors.text,
                                  fontWeight: isActive ? '700' : '400',
                                  paddingLeft: isAll ? 0 : 12,
                                },
                              ]}
                            >
                              {label}
                            </Text>
                            {isActive && (
                              <Text style={{ color: colors.accent }}>✓</Text>
                            )}
                          </TouchableOpacity>
                        );
                      }}
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
              backgroundColor: isFiltersExpanded ? colors.filterAccent : colors.inputBackground,
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

      {/* Filter Section — Phase 14 Plan 14-02 (FILT-02). Quick-task 260601-1b8
          relocated the Cascading panel into the results FlatList's
          ListHeaderComponent (renderListHeader, below) so it scrolls away with
          the results instead of permanently claiming static-header space.
          Guided remains here because its own Modal owns visibility. */}

      {/* Phase 14 Plan 14-03 (FILT-01, FILT-03) — Guided sheet variant. Gated on
          filterStyle === 'guided' ONLY (no && isFiltersExpanded) because the sheet
          consumes isFiltersExpanded internally as its Modal `open` prop. Identical
          state-prop expressions to the CascadingFilter mount (now in
          renderListHeader, quick-task 260601-1b8) — SC4 parity preserved. */}
      {filterStyle === 'guided' && (
        <GuidedFilterSheet open={isFiltersExpanded}
          onClose={() => setIsFiltersExpanded(false)}
          transactionType={transactionType}
          setTransactionType={setTransactionType}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          types={types}
          setTypes={setTypes}
          liveCount={filteredProperties.length}
        />
      )}

      {/* 260603-fbc — the filter results summary that used to live here (pinned
          above the filter, 260601-1b8) was relocated into renderListHeader so it
          sits directly under the filter panel and above the listing results. */}
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
            ref={listRef}
            data={filteredProperties}
            keyExtractor={(item, index) => item.id || item.listingId || `property-${index}`}
            ListHeaderComponent={renderListHeader}
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
  // 260603-ecf — stacked country/city title (replaces the single-line ellipsis).
  locationTextBlock: {
    alignItems: 'center',
  },
  locationCountry: {
    fontSize: 13,
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif' }),
    fontWeight: '400',
    lineHeight: 16,
  },
  locationCity: {
    fontSize: 16,
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif' }),
    fontWeight: '600',
    lineHeight: 20,
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
  // Quick-task 260530-sud — country group header inside the city dropdown.
  dropdownSectionHeader: {
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  dropdownSectionHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  rightIcons: {
    flexDirection: 'row',
    gap: 10,
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
  // Phase 14 Plan 14-02 — the 10 orphan StyleSheet keys (filterSection, segmentedControl,
  // segmentButton, segmentText, categoryToggleRow, categoryChip, filterRow, filterList,
  // filterChip, filterText) lived here. They were referenced only by the inline filter
  // JSX block at HomeScreen.tsx:521-642 which now lives in src/components/filters/
  // CascadingFilter.tsx. Total delete: ~169 LOC.
  // 260603-fbc — wraps the relocated summary in the list header; restores the
  // horizontal alignment it had inside headerContainer (paddingHorizontal 20).
  summaryWrap: {
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  resultCount: {
    fontSize: 14,
    marginLeft: 4,
  },
  // Quick-task 260601-1b8 — secondary breadcrumb line under the result count.
  // Slightly smaller font; uses colors.textSecondary inline so it tracks the
  // theme. marginBottom inherits the prior spacing rhythm that the count line
  // used to own (the parent TouchableOpacity is the spacer now).
  summaryBreadcrumb: {
    fontSize: 12,
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

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Property } from '../types/Property';
import { PropertyCard } from '../components/PropertyCard';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { PropertyService } from '../services/PropertyService';
import { propertyTypeToCategory } from '../utils/propertyCategory';
import { HospitalitySection } from '../components/HospitalitySection';

// Phase 2 D-09: 4-tab segmented control on RenterListingsScreen (the owner's own-listings UI).
// Tab order is locked Live / Pending / Rejected / Archived; default-tab override comes from the
// Home rejection banner CTA path (D-15 — defaultTab='rejected').
type ListingTab = 'live' | 'pending' | 'rejected' | 'archived';

interface RenterListingsScreenProps {
  onBack: () => void;
  onSelectProperty: (property: Property) => void;
  onOpenTours: (property: Property) => void;
  onEditProperty?: (property: Property) => void;
  refreshKey?: number;
  /** Notify parent so screens like Home can refetch (visibility of a listing changed). */
  onListingMutated?: () => void;
  /** Phase 2 D-15: Home rejection-banner CTA opens this screen with defaultTab='rejected'. */
  defaultTab?: ListingTab;
  /** Phase 2 D-11: Empty-state CTA on Live + Pending tabs routes to CreateListingScreen. */
  onCreateListing?: () => void;
}

export const RenterListingsScreen: React.FC<RenterListingsScreenProps> = ({
  onBack,
  onSelectProperty,
  onOpenTours,
  onEditProperty,
  refreshKey,
  onListingMutated,
  defaultTab,
  onCreateListing,
}) => {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  // Phase 4 Plan 07 D-10 + D-14 (Pitfall 6 atomic strip): owner-side hard-delete affordances
  // (modal-visibility state, the to-delete property state, the press / confirm handlers, the
  // modal mount, and the onDelete props on PropertyCard / HospitalitySection) all REMOVED.
  // Hard-delete UX moves to PropertyDetailsScreen as an admin-only affordance per D-10.
  // Phase 2 D-09: default selected tab is Pending (bridges M1 "post=instantly live" → M2 "post=pending").
  // Parent may pass defaultTab='rejected' from the Home rejection-banner CTA path (D-15).
  const [activeTab, setActiveTab] = useState<ListingTab>(defaultTab ?? 'pending');

  useEffect(() => {
    loadProperties();
  }, [refreshKey]);

  const loadProperties = async () => {
    if (!user?.localId) {
      setLoading(false);
      return;
    }

    try {
      const data = await PropertyService.getUserProperties(user.localId);
      setProperties(data);
    } catch (error) {
      console.error('Error loading properties:', error);
      Alert.alert('Error', 'Failed to load your listings');
    } finally {
      setLoading(false);
    }
  };

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

  // Phase 4 Plan 07 D-13 (Pitfall 4 conditional gate): owners may only restore listings they
  // archived themselves. If the listing was archived by a moderator/admin, the owner sees no
  // restore affordance — they must contact a moderator. Backend enforces the same rule on
  // POST /api/properties/:id/unarchive (req.user.uid === ownerUid AND archivedByUid === ownerUid).
  // Plan 05 added archivedByUid to the Property type (PATTERNS §11 prerequisite).
  const canSelfRestore = (p: Property): boolean =>
    p.archivedByUid != null && p.archivedByUid === user?.localId;

  // Phase 4 Plan 07: owner-side hard-delete press handler + confirm handler STRIPPED per
  // D-10 + D-14 (Pitfall 6 atomic strip). Hard-delete is now admin-only and lives on
  // PropertyDetailsScreen.

  // Soft delete — moves a live or draft listing to 'archived'. Hidden from public browse, restorable.
  const handleArchiveProperty = (property: Property) => {
    if (!property.id) return;
    Alert.alert(
      t('property.archiveDialogTitle'),
      t('property.archiveDialogMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('property.archiveConfirm'),
          style: 'default',
          onPress: async () => {
            try {
              await PropertyService.archiveOwnListing(property.id!);
              setProperties(prev =>
                prev.map(p => (p.id === property.id ? { ...p, status: 'archived' as const } : p))
              );
              onListingMutated?.();
              Alert.alert(t('property.archivedToastTitle'), t('property.archivedToastMessage'));
            } catch (error: any) {
              console.error('Error archiving property:', error);
              Alert.alert(t('common.error'), error?.message || t('property.archiveErrorMessage'));
            }
          },
        },
      ]
    );
  };

  // Restore archived → pending. M2 lifecycle: unarchived listings re-enter moderation queue
  // (D-01 dropped 'draft'; Phase 4 ARCH-04 will own the final restore-flow design).
  const handleUnarchiveProperty = (property: Property) => {
    if (!property.id) return;
    Alert.alert(
      t('property.unarchiveDialogTitle'),
      t('property.unarchiveDialogMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('property.unarchiveConfirm'),
          style: 'default',
          onPress: async () => {
            try {
              await PropertyService.restoreListing(property.id!);
              setProperties(prev =>
                prev.map(p => (p.id === property.id ? { ...p, status: 'pending' as const } : p))
              );
              onListingMutated?.();
              Alert.alert(t('property.unarchivedToastTitle'), t('property.unarchivedToastMessage'));
            } catch (error: any) {
              console.error('Error unarchiving property:', error);
              Alert.alert(t('common.error'), error?.message || t('property.unarchiveErrorMessage'));
            }
          },
        },
      ]
    );
  };

  // Phase 2 D-12: single fetch on mount returns ALL owner statuses (backend D-12 role-aware
  // branch in Plan 03 returns pending + live + rejected + archived to ownerSelf). Per-tab
  // filter is purely client-side cosmetic — no additional fetches per tab switch.
  // D-07 defensive coalesce: legacy listings without a status field absorb to 'live'.
  const tabFilteredProperties = useMemo(
    () => properties.filter((p) => (p.status ?? 'live') === activeTab),
    [properties, activeTab],
  );

  // D-10: HospitalitySection mounts inside each tab's FlatList ListHeaderComponent,
  // filtered to that tab's status (so Pending tab shows pending Hospitality only, etc.).
  const hospitalityProperties = useMemo(
    () => tabFilteredProperties.filter((p) => propertyTypeToCategory(p.propertyType) === 'Hospitality'),
    [tabFilteredProperties],
  );
  const otherProperties = useMemo(
    () => tabFilteredProperties.filter((p) => propertyTypeToCategory(p.propertyType) !== 'Hospitality'),
    [tabFilteredProperties],
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity onPress={onBack} style={styles.backButton}>
        <Text style={[styles.backButtonText, { color: colors.text }]}>← Back</Text>
      </TouchableOpacity>
      <Text style={[styles.headerTitle, { color: colors.text }]}>My Listings</Text>
      <View style={{ width: 60 }} />
    </View>
  );

  // Phase 2 D-09 lock: Live / Pending / Rejected / Archived (left-to-right order).
  const TABS: ListingTab[] = ['live', 'pending', 'rejected', 'archived'];

  const renderTabs = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      bounces={false}
      style={[styles.tabsScroll, { backgroundColor: colors.surface }]}
      contentContainerStyle={styles.tabsScrollContent}
    >
      {TABS.map((tab) => {
        const selected = activeTab === tab;
        return (
          <TouchableOpacity
            key={tab}
            onPress={() => setActiveTab(tab)}
            activeOpacity={0.8}
            style={[
              styles.tabButton,
              selected && { borderBottomColor: colors.accent, borderBottomWidth: 2 },
            ]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityState={{ selected }}
          >
            <Text
              numberOfLines={2}
              style={[
                styles.tabLabel,
                {
                  color: selected ? colors.text : colors.textSecondary,
                  fontWeight: selected ? '600' : '500',
                },
              ]}
            >
              {t(`owner.listings.tab.${tab}` as any)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );

  // D-11: per-tab empty-state copy from Plan 04 locale keys; CTA renders only on Live + Pending.
  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={[styles.emptyHeading, { color: colors.text }]}>
        {t(`owner.listings.empty.${activeTab}` as any)}
      </Text>
      {(activeTab === 'live' || activeTab === 'pending') && onCreateListing && (
        <TouchableOpacity
          onPress={onCreateListing}
          style={[styles.cta, { backgroundColor: colors.accent }]}
          activeOpacity={0.85}
        >
          <Text style={styles.ctaText}>{t('owner.listings.empty.cta' as any)}</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  // ---------------------------------------------------------------------------------
  // Phase 2 row renderer notes (see 02-CONTEXT.md / 02-PATTERNS.md / 02-UI-SPEC.md)
  // ---------------------------------------------------------------------------------
  // The M1 inline status badge that used to live above PropertyCard rows on this screen
  // (the rounded "Draft / Pending Review / Live / Archived" chip rendered inside the
  // <View style={styles.propertyWrapper}> wrapper) has been REMOVED per PATTERN F.
  //
  //   - StatusPill now renders INSIDE PropertyCard at top-LEFT below the rent/sale type
  //     badge per D-19 (mount landed in Plan 05). Live listings render no pill — live
  //     IS the absence of a pill per D-16. Pending / Rejected / Archived all get the
  //     bilingual Avito-anchored RU labels («На модерации», «Отклонено», «Снято с
  //     публикации»). Locale keys: listings.status.{pending,rejected,archived}.
  //
  //   - Archive UI affordances (onArchive / onUnarchive props passed down to
  //     PropertyCard + HospitalitySection) are intentionally stripped on this screen
  //     per CONTEXT.md D-08 boundary. Phase 4 (ARCH-01..ARCH-04) re-mounts the archive
  //     button on PropertyCard's action footer + the bulk archive flow on the Archived
  //     tab. The handlers `handleArchiveProperty` and `handleUnarchiveProperty` stay
  //     resident in this file (see TODO(Phase 4) above) so Phase 4's diff is purely
  //     additive.
  //
  //   - Per-tab filtering happens in `tabFilteredProperties` BEFORE the Hospitality /
  //     non-Hospitality split — a single fetch on mount (D-12) feeds all 4 tabs.
  // ---------------------------------------------------------------------------------
  const renderPropertyItem = ({ item }: { item: Property }) => (
    <View style={styles.propertyWrapper}>
      <PropertyCard
        property={item}
        onPress={handlePressProperty}
        onViewTour={handleViewTour}
        onViewVideo={handleViewVideo}
        onEdit={onEditProperty}
        onArchive={handleArchiveProperty}
        onUnarchive={canSelfRestore(item) ? handleUnarchiveProperty : undefined}
        showEditButton={true}
      />
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
        {renderHeader()}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  // Phase 2 D-09/D-10/D-11: header pinned above the segmented control; the segmented control
  // pinned above the FlatList; HospitalitySection mounts inside each tab's FlatList header
  // (filtered to that tab's status); per-tab empty state from Plan 04 locale keys.
  // Archive UI props (onArchive/onUnarchive) are intentionally stripped from HospitalitySection
  // here per PATTERN F — Phase 4 re-mounts them.
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />

      {renderHeader()}
      {renderTabs()}

      <FlatList
        data={otherProperties}
        keyExtractor={(item) => item.id || Math.random().toString()}
        renderItem={renderPropertyItem}
        ListHeaderComponent={
          <HospitalitySection
            properties={hospitalityProperties}
            onPress={handlePressProperty}
            onViewTour={handleViewTour}
            onEdit={onEditProperty}
            onArchive={handleArchiveProperty}
            showEditButton={true}
          />
        }
        ListEmptyComponent={renderEmpty()}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingBottom: 20,
  },
  propertyWrapper: {
    marginBottom: 16,
    position: 'relative',
  },
  // Phase 2 D-09: tabs above the FlatList; horizontal scroll avoids tiny labels
  // (adjustsFontSizeToFit) and overflow when accessibility text size is large.
  tabsScroll: {
    marginHorizontal: 16,
    marginBottom: 16,
    maxHeight: 72,
  },
  tabsScrollContent: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingRight: 4,
    gap: 4,
  },
  tabButton: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 48,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabLabel: {
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyHeading: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 16,
  },
  cta: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});


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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Property } from '../types/Property';
import { PropertyCard } from '../components/PropertyCard';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { FavoritesService } from '../services/FavoritesService';
import { propertyTypeToCategory } from '../utils/propertyCategory';
import { HospitalitySection } from '../components/HospitalitySection';

interface FavoritesScreenProps {
  onBack: () => void;
  onSelectProperty: (property: Property) => void;
  onOpenTours: (property: Property) => void;
  favoriteStatuses: Record<string, boolean>;
  onFavorite: (property: Property) => void;
  favoriteLoading: Record<string, boolean>;
}

export const FavoritesScreen: React.FC<FavoritesScreenProps> = ({
  onBack,
  onSelectProperty,
  onOpenTours,
  favoriteStatuses,
  onFavorite,
  favoriteLoading,
}) => {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFavorites();
  }, [user]); // Reload when user changes

  const loadFavorites = async () => {
    if (!user?.localId) {
      setLoading(false);
      return;
    }

    try {
      const data = await FavoritesService.getFavorites();
      const list = (data && Array.isArray(data)) ? data : [];
      // D-07: defense in depth — even if a favorited listing transitions out of 'live'
      // server-side (moderator archive/reject), hide it from the renter-facing favorites
      // list. The Hospitality split memo derives from `properties`, so filtering at the
      // SOURCE (here) keeps both downstream views (hospitality strip + main list) consistent.
      const liveOnly = list.filter((p: Property) => (p.status ?? 'live') === 'live');
      setProperties(liveOnly);
    } catch (error: any) {
      console.error('Error loading favorites:', error);
      console.error('Error details:', error?.response?.data || error?.message);
      setProperties([]);
    } finally {
      setLoading(false);
    }
  };

  const handlePressProperty = (property: Property) => {
    onSelectProperty(property);
  };

  const handleViewTour = async (property: Property) => {
    // Phase 1 D-12: tours[] flattened to media.tourUrl (first-tour wins).
    if (property.media?.tourUrl) {
      onOpenTours(property);
    } else {
      Alert.alert(t('common.info'), t('tour.notAvailable'));
    }
  };

  const handleViewVideo = async (property: Property) => {
    // Phase 1 D-12: videos[] under media. First entry wins for the legacy single-video CTA.
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

  const handleFavorite = async (property: Property) => {
    await onFavorite(property);
    await loadFavorites();
  };

  // D-06: split data into hospitality strip + non-hospitality vertical list.
  // Tradeoff §K: hospitality strip filters to `dealType !== 'sale'` (rent-only),
  // mirroring HomeScreen + RenterListings + OwnerListings caller-side derivation.
  const hospitalityProperties = useMemo(
    () =>
      properties.filter(
        (p) => propertyTypeToCategory(p.propertyType) === 'Hospitality' && p.dealType !== 'sale',
      ),
    [properties],
  );
  const otherProperties = useMemo(
    () => properties.filter((p) => propertyTypeToCategory(p.propertyType) !== 'Hospitality'),
    [properties],
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity onPress={onBack} style={styles.backButton}>
        <Text style={[styles.backButtonText, { color: colors.text }]}>← {t('common.back')}</Text>
      </TouchableOpacity>
      <Text style={[styles.headerTitle, { color: colors.text }]}>{t('favorites.title')}</Text>
      <View style={{ width: 60 }} />
    </View>
  );

  const renderPropertyItem = ({ item }: { item: Property }) => {
    const isArchived = item.status === 'archived';
    return (
      <View style={styles.favoriteItemWrapper}>
        {isArchived && (
          <View style={[styles.unavailableBadge, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.unavailableBadgeText, { color: colors.textSecondary }]}>
              {t('property.noLongerAvailable')}
            </Text>
          </View>
        )}
        <View style={isArchived && styles.archivedDimmed}>
          <PropertyCard
            property={item}
            onPress={handlePressProperty}
            onViewTour={handleViewTour}
            onViewVideo={handleViewVideo}
            onFavorite={handleFavorite}
            isFavorited={favoriteStatuses[item.id] || true} // Always true in favorites screen
            isLoading={favoriteLoading[item.id] || false}
          />
        </View>
      </View>
    );
  };

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

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />

      <FlatList
        style={styles.list}
        data={otherProperties}
        keyExtractor={(item) => item.id || Math.random().toString()}
        renderItem={renderPropertyItem}
        ListHeaderComponent={
          <>
            {renderHeader()}
            <HospitalitySection
              properties={hospitalityProperties}
              onPress={handlePressProperty}
              onViewTour={handleViewTour}
              onFavorite={handleFavorite}
              favoriteStatuses={favoriteStatuses}
              favoriteLoading={favoriteLoading}
            />
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyIcon, { color: colors.textSecondary }]}>♡</Text>
            <Text style={[styles.emptyText, { color: colors.text }]}>
              {t('favorites.empty')}
            </Text>
            <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
              {t('favorites.emptyHint')}
            </Text>
          </View>
        }
        contentContainerStyle={[
          styles.listContent,
          properties.length === 0 && styles.listContentWhenEmpty,
        ]}
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
  list: {
    flex: 1,
  },
  listContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  listContentWhenEmpty: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
  favoriteItemWrapper: {
    position: 'relative',
  },
  archivedDimmed: {
    opacity: 0.55,
  },
  unavailableBadge: {
    position: 'absolute',
    top: 27,
    left: 130,
    zIndex: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  unavailableBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
});


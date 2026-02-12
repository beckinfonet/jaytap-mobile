import React, { useState, useEffect } from 'react';
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
import { FavoritesService } from '../services/FavoritesService';

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
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFavorites();
  }, [user]); // Reload when user changes

  const loadFavorites = async () => {
    if (!user?.localId) {
      console.log('No user localId, skipping favorites load');
      setLoading(false);
      return;
    }

    try {
      console.log('Loading favorites for user:', user.localId);
      const data = await FavoritesService.getFavorites();
      console.log('Favorites loaded:', data?.length || 0, 'items');
      console.log('Favorites data:', data);
      
      if (data && Array.isArray(data) && data.length > 0) {
        setProperties(data);
      } else {
        setProperties([]);
      }
    } catch (error: any) {
      console.error('Error loading favorites:', error);
      console.error('Error details:', error?.response?.data || error?.message);
      // Don't show alert, just log and set empty
      setProperties([]);
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

  const handleFavorite = async (property: Property) => {
    await onFavorite(property);
    // Reload favorites after toggling
    await loadFavorites();
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity onPress={onBack} style={styles.backButton}>
        <Text style={[styles.backButtonText, { color: colors.text }]}>← Back</Text>
      </TouchableOpacity>
      <Text style={[styles.headerTitle, { color: colors.text }]}>Favorites</Text>
      <View style={{ width: 60 }} />
    </View>
  );

  const renderPropertyItem = ({ item }: { item: Property }) => (
    <PropertyCard
      property={item}
      onPress={handlePressProperty}
      onViewTour={handleViewTour}
      onViewVideo={handleViewVideo}
      onFavorite={handleFavorite}
      isFavorited={favoriteStatuses[item.id] || true} // Always true in favorites screen
      isLoading={favoriteLoading[item.id] || false}
    />
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

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />

      <FlatList
        data={properties}
        keyExtractor={(item) => item.id || Math.random().toString()}
        renderItem={renderPropertyItem}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyIcon, { color: colors.textSecondary }]}>♡</Text>
            <Text style={[styles.emptyText, { color: colors.text }]}>
              No favorites yet
            </Text>
            <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
              Start favoriting listings to see them here
            </Text>
          </View>
        }
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
  },
});


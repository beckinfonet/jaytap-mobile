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
import { PropertyService } from '../services/PropertyService';

interface OwnerListingsScreenProps {
  ownerUid: string;
  ownerName: string;
  onBack: () => void;
  onSelectProperty: (property: Property) => void;
  onOpenTours: (property: Property) => void;
  onFavorite?: (property: Property) => void;
  isFavorited?: (propertyId: string) => boolean;
  favoriteLoading?: (propertyId: string) => boolean;
}

export const OwnerListingsScreen: React.FC<OwnerListingsScreenProps> = ({
  ownerUid,
  ownerName,
  onBack,
  onSelectProperty,
  onOpenTours,
  onFavorite,
  isFavorited = () => false,
  favoriteLoading = () => false,
}) => {
  const { colors, isDark } = useTheme();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProperties();
  }, [ownerUid]);

  const loadProperties = async () => {
    try {
      const data = await PropertyService.getUserProperties(ownerUid);
      setProperties(data);
    } catch (error) {
      console.error('Error loading owner properties:', error);
      Alert.alert('Error', 'Failed to load listings from this owner');
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

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity onPress={onBack} style={styles.backButton}>
        <Text style={[styles.backButtonText, { color: colors.text }]}>← Back</Text>
      </TouchableOpacity>
      <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
        {ownerName}'s Listings
      </Text>
      <View style={{ width: 60 }} />
    </View>
  );

  const renderPropertyItem = ({ item }: { item: Property }) => (
    <View style={styles.propertyWrapper}>
      <PropertyCard
        property={item}
        onPress={handlePressProperty}
        onViewTour={handleViewTour}
        onViewVideo={handleViewVideo}
        onFavorite={onFavorite}
        isFavorited={isFavorited(item.id)}
        isLoading={favoriteLoading(item.id)}
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
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No listings from this owner.
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
    flex: 1,
    textAlign: 'center',
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
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
  },
});

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
import { DeleteListingModal } from '../components/DeleteListingModal';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { PropertyService } from '../services/PropertyService';
import { propertyTypeToCategory } from '../utils/propertyCategory';
import { HospitalitySection } from '../components/HospitalitySection';

interface RenterListingsScreenProps {
  onBack: () => void;
  onSelectProperty: (property: Property) => void;
  onOpenTours: (property: Property) => void;
  onEditProperty?: (property: Property) => void;
  refreshKey?: number;
  /** Notify parent so screens like Home can refetch (visibility of a listing changed). */
  onListingMutated?: () => void;
}

export const RenterListingsScreen: React.FC<RenterListingsScreenProps> = ({
  onBack,
  onSelectProperty,
  onOpenTours,
  onEditProperty,
  refreshKey,
  onListingMutated,
}) => {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [propertyToDelete, setPropertyToDelete] = useState<Property | null>(null);

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

  // Permanent delete — only invoked for archived or draft listings (live listings route through archive instead).
  const handleDeleteProperty = (property: Property) => {
    setPropertyToDelete(property);
    setDeleteModalVisible(true);
  };

  const confirmDelete = async () => {
    if (!propertyToDelete?.id) {
      return;
    }

    try {
      await PropertyService.deleteProperty(propertyToDelete.id);
      // Remove from local state
      setProperties(properties.filter(p => p.id !== propertyToDelete.id));
      setDeleteModalVisible(false);
      setPropertyToDelete(null);
      onListingMutated?.();
      Alert.alert(t('common.success'), t('property.permanentlyDeletedToast'));
    } catch (error: any) {
      console.error('Error deleting property:', error);
      const errorMessage = error?.message || t('property.deleteErrorMessage');
      Alert.alert(t('common.error'), errorMessage);
    }
  };

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
              await PropertyService.archiveProperty(property.id!);
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

  // Restore archived → draft. User must re-publish from the edit screen (intentional gating).
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
              await PropertyService.unarchiveProperty(property.id!);
              setProperties(prev =>
                prev.map(p => (p.id === property.id ? { ...p, status: 'draft' as const } : p))
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

  // D-06 + Gap 9.3: split data into hospitality strip + non-hospitality vertical list
  const hospitalityProperties = useMemo(
    () => properties.filter((p) => propertyTypeToCategory(p.propertyType) === 'Hospitality'),
    [properties],
  );
  const otherProperties = useMemo(
    () => properties.filter((p) => propertyTypeToCategory(p.propertyType) !== 'Hospitality'),
    [properties],
  );

  const formatStatus = (status: string) => {
    switch (status) {
      case 'draft':
        return t('property.statusDraft');
      case 'pending':
        return t('property.statusPending');
      case 'live':
        return t('property.statusLive');
      case 'archived':
        return t('property.statusArchived');
      default:
        return status;
    }
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity onPress={onBack} style={styles.backButton}>
        <Text style={[styles.backButtonText, { color: colors.text }]}>← Back</Text>
      </TouchableOpacity>
      <Text style={[styles.headerTitle, { color: colors.text }]}>My Listings</Text>
      <View style={{ width: 60 }} />
    </View>
  );

  const renderPropertyItem = ({ item }: { item: Property }) => (
    <View style={styles.propertyWrapper}>
      <View style={[styles.statusBadge, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.statusText, { color: colors.text }]}>
          {formatStatus((item as any).status || 'draft')}
        </Text>
      </View>
      <PropertyCard
        property={item}
        onPress={handlePressProperty}
        onViewTour={handleViewTour}
        onViewVideo={handleViewVideo}
        onEdit={onEditProperty}
        onDelete={handleDeleteProperty}
        onArchive={handleArchiveProperty}
        onUnarchive={handleUnarchiveProperty}
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

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />

      <FlatList
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
              onEdit={onEditProperty}
              onDelete={handleDeleteProperty}
              onArchive={handleArchiveProperty}
              onUnarchive={handleUnarchiveProperty}
              showEditButton={true}
            />
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              You haven't created any listings yet.
            </Text>
            <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
              Create your first listing to get started!
            </Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      <DeleteListingModal
        visible={deleteModalVisible}
        onClose={() => {
          setDeleteModalVisible(false);
          setPropertyToDelete(null);
        }}
        onConfirm={confirmDelete}
        property={propertyToDelete}
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
  statusBadge: {
    position: 'absolute',
    top: 27, // Same as "FOR RENT" badge
    left: 130, // Position to the right of "FOR RENT" badge (16 left + ~94px width + 10px gap)
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
  statusText: {
    fontSize: 12,
    fontWeight: '700',
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
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
  },
});


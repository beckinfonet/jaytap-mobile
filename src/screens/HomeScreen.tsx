import React, { useState } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MOCK_PROPERTIES, Property } from '../data/mockProperties';
import { PropertyCard } from '../components/PropertyCard';
import { useTheme } from '../theme/ThemeContext';

interface HomeScreenProps {
  onSelectProperty: (property: Property) => void;
  onOpenTours: (property: Property) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onSelectProperty, onOpenTours }) => {
  const { colors, theme, isDark, toggleTheme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('Rent');

  const filters = ['Rent', 'Buy', 'Apart', 'New', 'Furnished'];

  const filteredProperties = MOCK_PROPERTIES.filter((p) => {
    // Basic filtering logic
    if (activeFilter === 'Rent' && p.type !== 'rent') return false;
    if (activeFilter === 'Buy' && p.type !== 'sale') return false;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return p.title.toLowerCase().includes(query) ||
        p.address.toLowerCase().includes(query);
    }
    return true;
  });

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
    <View style={styles.headerContainer}>
      {/* Top Bar: Menu, Location, Icons */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.iconButton}>
          <Text style={[styles.iconText, { color: colors.text }]}>☰</Text>
        </TouchableOpacity>

        <View style={styles.locationContainer}>
          <Text style={[styles.locationTitle, { color: colors.text }]}>Bishkek • Chui Ave ⌄</Text>
        </View>

        <View style={styles.rightIcons}>
          <TouchableOpacity onPress={toggleTheme} style={styles.iconButton}>
            <Text style={{ fontSize: 20 }}>{isDark ? '☀️' : '🌙'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton}>
            <Text style={{ fontSize: 22, color: colors.text }}>♡</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar */}
      <View style={[styles.searchContainer, { backgroundColor: colors.inputBackground }]}>
        <Text style={[styles.searchIcon, { color: colors.textSecondary }]}>🔍</Text>
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search city, neighborhood, address"
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor={colors.textSecondary}
        />
      </View>

      {/* Filters */}
      <View style={styles.filterRow}>
        <FlatList
          data={filters}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterList}
          keyExtractor={(item) => item}
          renderItem={({ item }) => {
            const isActive = activeFilter === item;
            return (
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: isActive ? colors.activeChipBackground : colors.chipBackground,
                    borderColor: colors.chipBorder
                  },
                ]}
                onPress={() => setActiveFilter(item)}
              >
                <Text
                  style={[
                    styles.filterText,
                    { color: isActive ? colors.activeChipText : colors.text },
                  ]}
                >
                  {item} {item === 'Apart' || item === 'New' ? '›' : ''}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      <Text style={[styles.resultCount, { color: colors.textSecondary }]}>
        {filteredProperties.length} homes
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />
      <View style={styles.contentContainer}>
        <FlatList
          data={filteredProperties}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <PropertyCard
              property={item}
              onPress={handlePressProperty}
              onViewTour={handleViewTour}
              onViewVideo={handleViewVideo}
            />
          )}
          ListHeaderComponent={renderHeader}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />

        {/* Floating Map Button */}
        <TouchableOpacity style={[styles.mapButton, { backgroundColor: '#F2EFE9', shadowColor: colors.cardShadow }]}>
          <Text style={[styles.mapButtonText, { color: '#5D5045' }]}>📍 Map</Text>
        </TouchableOpacity>
      </View>
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
  },
  iconButton: {
    padding: 4,
  },
  iconText: {
    fontSize: 24,
  },
  locationContainer: {
    flex: 1,
    alignItems: 'center',
  },
  locationTitle: {
    fontSize: 16,
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif' }),
    fontWeight: '500',
  },
  rightIcons: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 30,
    paddingHorizontal: 16,
    height: 50,
    marginBottom: 20,
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
  filterRow: {
    marginBottom: 16,
  },
  filterList: {
    paddingRight: 0,
  },
  filterChip: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 30,
    marginRight: 10,
    borderWidth: 1,
  },
  filterText: {
    fontSize: 15,
    fontWeight: '400',
  },
  resultCount: {
    fontSize: 14,
    marginBottom: 10,
    marginLeft: 4,
  },
  listContent: {
    paddingBottom: 80, // Space for floating button
  },
  mapButton: {
    position: 'absolute',
    bottom: 30,
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 30,
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

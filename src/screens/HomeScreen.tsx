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

export const HomeScreen = () => {
  const { colors, theme, isDark, toggleTheme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');

  const filters = ['All', 'For Rent', 'For Sale', 'Houses', 'Apartments'];

  const filteredProperties = MOCK_PROPERTIES.filter((p) => {
    // Basic filtering logic
    if (activeFilter === 'For Rent' && p.type !== 'rent') return false;
    if (activeFilter === 'For Sale' && p.type !== 'sale') return false;
    // Add more complex filtering if needed

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return p.title.toLowerCase().includes(query) ||
        p.address.toLowerCase().includes(query);
    }
    return true;
  });

  const handlePressProperty = (property: Property) => {
    // Navigate to details (placeholder)
    Alert.alert('Property Selected', `You clicked on ${property.title}`);
  };

  const handleViewTour = async (property: Property) => {
    if (property.matterportUrl) {
      // Ideally open in a WebView or In-App Browser
      // For now, we'll try to open in default browser
      const supported = await Linking.canOpenURL(property.matterportUrl);
      if (supported) {
        await Linking.openURL(property.matterportUrl);
      } else {
        Alert.alert('Error', 'Cannot open 3D Tour URL');
      }
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
    <View style={[styles.headerContainer, { backgroundColor: colors.surface }]}>
      <View style={styles.topBar}>
        <View>
          <Text style={[styles.greetingText, { color: colors.textSecondary }]}>Welcome back,</Text>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Find Your Dream Home</Text>
        </View>
        <TouchableOpacity onPress={toggleTheme} style={[styles.themeToggle, { backgroundColor: colors.inputBackground }]}>
          <Text style={{ fontSize: 20 }}>{isDark ? '☀️' : '🌙'}</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.searchContainer, { backgroundColor: colors.inputBackground }]}>
        <Text style={[styles.searchIcon, { color: colors.textSecondary }]}>🔍</Text>
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search city, address..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor={colors.textTertiary}
        />
      </View>

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
                  borderColor: isActive ? colors.activeChipBackground : colors.chipBorder
                },
              ]}
              onPress={() => setActiveFilter(item)}
            >
              <Text
                style={[
                  styles.filterText,
                  { color: isActive ? colors.activeChipText : colors.textSecondary },
                ]}
              >
                {item}
              </Text>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.surface}
      />
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    padding: 20,
    paddingBottom: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 5,
    zIndex: 10,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  greetingText: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800', // Extra bold
    letterSpacing: -0.5,
  },
  themeToggle: {
    padding: 10,
    borderRadius: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 52,
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
    fontWeight: '500',
  },
  filterList: {
    paddingRight: 16,
  },
  filterChip: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 30, // Fully rounded
    marginRight: 10,
    borderWidth: 1,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
  },
  listContent: {
    paddingBottom: 20,
    paddingTop: 16, // Add some space after the header
  },
});

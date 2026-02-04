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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MOCK_PROPERTIES, Property } from '../data/mockProperties';
import { PropertyCard } from '../components/PropertyCard';

export const HomeScreen = () => {
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
    <View style={styles.headerContainer}>
      <Text style={styles.headerTitle}>Discover Amazing Properties</Text>
      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search city, address..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#999"
        />
      </View>
      
      <FlatList
        data={filters}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterList}
        keyExtractor={(item) => item}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.filterChip,
              activeFilter === item && styles.activeFilterChip,
            ]}
            onPress={() => setActiveFilter(item)}
          >
            <Text
              style={[
                styles.filterText,
                activeFilter === item && styles.activeFilterText,
              ]}
            >
              {item}
            </Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
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
    backgroundColor: '#EFF2F7', // Darker cool gray for better contrast
  },
  headerContainer: {
    padding: 16,
    backgroundColor: '#fff',
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E1E4E8',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    marginBottom: 16,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    height: '100%',
  },
  filterList: {
    paddingRight: 16,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  activeFilterChip: {
    backgroundColor: '#eef2ff',
    borderColor: '#6C63FF',
  },
  filterText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  activeFilterText: {
    color: '#6C63FF',
    fontWeight: '600',
  },
  listContent: {
    paddingBottom: 20,
  },
});


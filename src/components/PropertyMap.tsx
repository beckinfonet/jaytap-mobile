import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { Property } from '../types/Property';
import { formatPrice } from '../utils/formatPrice';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

interface PropertyMapProps {
  properties: Property[];
  onSelectProperty: (property: Property) => void;
  onCloseMap: () => void;
}

// Center on Bishkek by default
const BISHKEK_COORDINATES = {
  latitude: 42.8746,
  longitude: 74.5698,
};

export const PropertyMap: React.FC<PropertyMapProps> = ({ properties, onSelectProperty, onCloseMap }) => {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();

  return (
    <View style={styles.container}>
      <MapView
        provider={PROVIDER_DEFAULT} // Uses Apple Maps on iOS
        style={styles.map}
        initialRegion={{
          ...BISHKEK_COORDINATES,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
        mapType="mutedStandard" // Slightly darker variant, works better in dark mode
        userInterfaceStyle={isDark ? 'dark' : 'light'} // iOS 13+ dark mode support
      >
        {/* Property Markers */}
        {properties.map((property) => {
          // Use real coordinates if available, otherwise generate deterministic mock coordinates
          let coordinates;
          if (property.latitude && property.longitude) {
            coordinates = { latitude: property.latitude, longitude: property.longitude };
          } else {
            // Generate consistent coordinates based on property ID (not random, so they're stable)
            const idHash = (property.id || property.listingId || '0').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
            const latOffset = ((idHash % 100) - 50) * 0.001;
            const lngOffset = ((idHash % 200) - 100) * 0.001;
            coordinates = {
              latitude: BISHKEK_COORDINATES.latitude + latOffset,
              longitude: BISHKEK_COORDINATES.longitude + lngOffset,
            };
          }

          return (
            <Marker
              key={property.id || property.listingId || Math.random().toString()}
              coordinate={coordinates}
              onPress={() => onSelectProperty(property)}
            >
              <View style={[styles.markerContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Text style={[styles.markerText, { color: colors.text }]}>
                  {formatPrice(property, t('property.perMonth'))}
                </Text>
              </View>
            </Marker>
          );
        })}
      </MapView>

      {/* Floating List Button */}
      <TouchableOpacity
        style={[styles.listButton, { backgroundColor: colors.text, shadowColor: colors.cardShadow }]}
        onPress={onCloseMap}
      >
        <Text style={[styles.listButtonText, { color: colors.background }]}>≡ {t('property.list')}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  markerContainer: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  markerText: {
    fontWeight: '700',
    fontSize: 12,
  },
  listButton: {
    position: 'absolute',
    bottom: 30,
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 30,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 100,
  },
  listButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 4,
  },
});

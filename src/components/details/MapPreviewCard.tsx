/**
 * MapPreviewCard — small thumbnail card with neighborhood, city, coords, and a
 * "Map" button. Replaces the inline full-width <MapView> at the bottom of
 * PropertyDetailsScreen. The "Map" button opens the existing full-screen map
 * modal (caller wires `onOpenFullScreen`).
 *
 * Spec: docs/superpowers/specs/2026-05-26-property-details-redesign-design.md § 4.3
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { cityToCountry } from '../../utils/cityToCountry';
import type { TranslationKeys } from '../../locales';

export interface MapPreviewCardProps {
  coordinates: { latitude: number; longitude: number };
  district?: string;
  city?: string;
  onOpenFullScreen: () => void;
}

function formatCoords(lat: number, lng: number): string {
  const ns = lat >= 0 ? 'N' : 'S';
  const ew = lng >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(2)}° ${ns} · ${Math.abs(lng).toFixed(2)}° ${ew}`;
}

export const MapPreviewCard: React.FC<MapPreviewCardProps> = ({
  coordinates,
  district,
  city,
  onOpenFullScreen,
}) => {
  const { colors } = useTheme();
  const { t } = useLanguage();

  const countryCode = cityToCountry(city);
  const cityLine =
    city && countryCode
      ? `${city}, ${t(`country.${countryCode}` as TranslationKeys)}`
      : city ?? '';

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <View style={[styles.thumbWrap, { borderColor: colors.border }]}>
        <MapView
          style={styles.thumb}
          provider={PROVIDER_DEFAULT}
          initialRegion={{
            latitude: coordinates.latitude,
            longitude: coordinates.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
          scrollEnabled={false}
          zoomEnabled={false}
          pitchEnabled={false}
          rotateEnabled={false}
          mapType="mutedStandard"
        >
          <Marker coordinate={coordinates} pinColor={colors.accent} />
        </MapView>
      </View>

      <View style={styles.textCol}>
        {district ? (
          <Text style={[styles.district, { color: colors.text }]} numberOfLines={1}>
            {district}
          </Text>
        ) : null}
        {cityLine ? (
          <Text
            style={[styles.city, { color: colors.textSecondary }]}
            numberOfLines={1}
          >
            {cityLine}
          </Text>
        ) : null}
        <Text style={[styles.coords, { color: colors.textTertiary }]}>
          {formatCoords(coordinates.latitude, coordinates.longitude)}
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.button, { borderColor: colors.border }]}
        onPress={onOpenFullScreen}
        accessibilityRole="button"
      >
        <Text style={[styles.buttonLabel, { color: colors.text }]}>
          {t('property.mapPreview.openButton' as TranslationKeys)} →
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
  },
  thumbWrap: {
    width: 96,
    height: 96,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
  },
  thumb: {
    width: '100%',
    height: '100%',
  },
  textCol: {
    flex: 1,
    minWidth: 0,
  },
  district: {
    fontSize: 18,
    fontWeight: '800',
  },
  city: {
    fontSize: 13,
    marginTop: 2,
  },
  coords: {
    fontSize: 12,
    marginTop: 6,
    fontVariant: ['tabular-nums'],
  },
  button: {
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  buttonLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
});

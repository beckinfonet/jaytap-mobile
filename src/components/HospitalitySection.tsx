/**
 * HospitalitySection — Horizontal strip of HospitalityCard items, mounted as
 * ListHeaderComponent on Home / Favorites / RenterListings / OwnerListings.
 *
 * Phase 6 (HOSP-01 / D-01 / D-02):
 *   - Hidden when empty: returns null when properties.length === 0 (D-01)
 *   - Header: title (t('home.hospitalitySectionTitle')) + count chip (D-02)
 *   - Inner content: horizontal FlatList of HospitalityCards
 *
 * Caller filters its input list to Hospitality category; component does NOT
 * filter. Same prop shape works on Home / Favorites / Renter / Owner screens.
 *
 * Convention: matches src/components/HospitalityCard.tsx — named export,
 * no default; useTheme + useLanguage tokens only; no hardcoded hex literals;
 * no inline role check (caller passes showEditButton).
 */
import React from 'react';
import { View, Text, FlatList, StyleSheet, Platform } from 'react-native';
import type { Property } from '../types/Property';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { HospitalityCard } from './HospitalityCard';

interface HospitalitySectionProps {
  properties: Property[];
  onPress: (property: Property) => void;
  onViewTour: (property: Property) => void;
  onFavorite?: (property: Property) => void;
  favoriteStatuses?: Record<string, boolean>;
  favoriteLoading?: Record<string, boolean>;
  // Owner-context (only on RenterListings / OwnerListings):
  onEdit?: (property: Property) => void;
  onDelete?: (property: Property) => void;
  onArchive?: (property: Property) => void;
  onUnarchive?: (property: Property) => void;
  showEditButton?: boolean;
  // When true, cards stretch full-width and stack vertically instead of the
  // horizontal 280pt strip. Used only by the author's My Listings view
  // (RenterListingsScreen); public-facing strips keep the horizontal default.
  fullWidth?: boolean;
}

export function HospitalitySection({
  properties,
  onPress,
  onViewTour,
  onFavorite,
  favoriteStatuses,
  favoriteLoading,
  onEdit,
  onDelete,
  onArchive,
  onUnarchive,
  showEditButton = false,
  fullWidth = false,
}: HospitalitySectionProps) {
  const { colors } = useTheme();
  const { t } = useLanguage();

  // D-01 hidden-when-empty: load-bearing first return
  if (properties.length === 0) return null;

  const renderCard = (item: Property, idx: number) => (
    <HospitalityCard
      key={item.id || item.listingId || `hosp-${idx}`}
      property={item}
      onPress={onPress}
      onViewTour={onViewTour}
      onFavorite={onFavorite}
      isFavorited={favoriteStatuses?.[item.id] ?? false}
      isLoading={favoriteLoading?.[item.id] ?? false}
      onEdit={onEdit}
      onDelete={onDelete}
      onArchive={onArchive}
      onUnarchive={onUnarchive}
      showEditButton={showEditButton}
      fullWidth={fullWidth}
    />
  );

  return (
    <View style={styles.strip}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
          {t('home.hospitalitySectionTitle')}
        </Text>
        <View
          style={[
            styles.countChip,
            { backgroundColor: colors.chipBackground, borderColor: colors.chipBorder },
          ]}
        >
          <Text style={[styles.countText, { color: colors.text }]}>
            {`(${properties.length})`}
          </Text>
        </View>
      </View>
      {fullWidth ? (
        // Author My Listings view: full-width cards stacked vertically. Rendered
        // as a plain View (not a nested FlatList) since the section mounts inside
        // a parent FlatList's ListHeaderComponent.
        <View style={styles.verticalContent}>
          {properties.map((item, idx) => renderCard(item, idx))}
        </View>
      ) : (
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={properties}
          keyExtractor={(item, idx) => item.id || item.listingId || `hosp-${idx}`}
          renderItem={({ item, index }) => renderCard(item, index)}
          removeClippedSubviews={Platform.OS === 'android'}
          contentContainerStyle={styles.flatListContent}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  strip: {
    paddingVertical: 16,
    paddingHorizontal: 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  countChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    borderWidth: 1,
  },
  countText: {
    fontSize: 13,
    fontWeight: '600',
  },
  flatListContent: {
    paddingHorizontal: 20,
    gap: 12,
  },
  // fullWidth stacked layout (author My Listings view). Card marginVertical
  // handles inter-card spacing; horizontal padding matches the strip header.
  verticalContent: {
    paddingHorizontal: 20,
  },
});

// Phase 3 Plan 06 Task 01 — App.tsx LOC mitigation extraction (PATTERNS §"App.tsx Pattern 4").
//
// Pure-passthrough wrapper around <PropertyDetailsScreen> that takes the props previously
// inlined at App.tsx:837-913 (the `selectedProperty && (<View ...><PropertyDetailsScreen .../></View>)`
// block). Behavior is identical to the pre-extraction state — this is a refactor, NOT a behavior
// change. Visual style replicates the original inline `style={{ position: 'absolute', ..., zIndex: 2,
// elevation: 4, pointerEvents: 'auto' }}` shell verbatim.
//
// Task 02 extends PropertyDetailsScreenProps with `onEditOnBehalfPressed` + `onRefreshProperty`;
// at that point this host file forwards those props through. Task 01 lands as pure extraction.
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { PropertyDetailsScreen } from '../screens/PropertyDetailsScreen';
import type { Property } from '../types/Property';

interface PropertyDetailsHostProps {
  selectedProperty: Property;
  homeViewMode: 'list' | 'map';
  isFavorited: boolean;
  isLoadingFavorite: boolean;
  onBack: () => void;
  onOpenTours: () => void;
  onOpenPhotos: (url: string) => void;
  onMessagePress: () => void;
  onScheduleViewing: () => void;
  onFavorite: (property: Property) => void;
  onLandlordPress: (ownerUid: string, ownerName: string) => void;
  onAdminVerifyDocuments: (property: Property) => void;
  onEditListing: (property: Property) => void;
}

const PropertyDetailsHost: React.FC<PropertyDetailsHostProps> = ({
  selectedProperty,
  homeViewMode,
  isFavorited,
  isLoadingFavorite,
  onBack,
  onOpenTours,
  onOpenPhotos,
  onMessagePress,
  onScheduleViewing,
  onFavorite,
  onLandlordPress,
  onAdminVerifyDocuments,
  onEditListing,
}) => {
  return (
    <View style={styles.fullScreenOverlay}>
      <PropertyDetailsScreen
        property={selectedProperty}
        onBack={onBack}
        onOpenTours={onOpenTours}
        onOpenPhotos={onOpenPhotos}
        onMessagePress={onMessagePress}
        onScheduleViewing={onScheduleViewing}
        returnToMap={homeViewMode === 'map'}
        onFavorite={onFavorite}
        isFavorited={isFavorited}
        isLoading={isLoadingFavorite}
        onLandlordPress={onLandlordPress}
        onAdminVerifyDocuments={onAdminVerifyDocuments}
        onEditListing={onEditListing}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  // Mirrors the inline block at App.tsx:838-848 verbatim — position absolute,
  // zIndex 2, elevation 4, pointerEvents auto. Visual parity is load-bearing.
  fullScreenOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 2,
    elevation: 4,
    pointerEvents: 'auto',
  },
});

export default PropertyDetailsHost;

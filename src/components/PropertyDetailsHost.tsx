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
  // Phase 3 Plan 06 Task 02/04 — moderation action footer "Edit on behalf"
  // dispatcher. PropertyDetailsScreen renders the footer when can('approveListings')
  // AND status === 'pending'; the Edit-on-behalf button fires this callback so
  // App.tsx can set propertyToEdit + moderatorContext + open CreateListingScreen.
  onEditOnBehalfPressed?: (property: Property) => void;
  // Phase 3 Plan 06 Task 02/04 — refresh hook used by the moderation action
  // footer after Approve/Reject so the parent (App.tsx) can refetch any sibling
  // surfaces that depend on listing status (e.g., ModerationQueueScreen list,
  // pendingModerationCount badge).
  onRefreshProperty?: () => Promise<void>;
  // Phase 3 Plan 03-06 Task 2 — entry-point wiring for NeedsMediaBanner CTA.
  // App.tsx forwards openMediaCuration here; this host passes it through to
  // PropertyDetailsScreen unchanged.
  onOpenMediaCuration?: (listingId: string) => void;
  // admin-live-listing-actions Task 5 — pass-through props for the new header
  // kebab (AdminListingMenu). editMedia is wired at Task 5; the other four
  // are stubbed in App.tsx and wired in Tasks 6/7/8.
  onOpenLiveMediaEdit?: (listingId: string) => void;
  onOpenListingAdmin?: (listingId: string) => void;
  onDeleteListing?: (listingId: string) => void;
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
  onEditOnBehalfPressed,
  onRefreshProperty,
  onOpenMediaCuration,
  onOpenLiveMediaEdit,
  onOpenListingAdmin,
  onDeleteListing,
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
        onEditOnBehalfPressed={onEditOnBehalfPressed}
        onRefreshProperty={onRefreshProperty}
        onOpenMediaCuration={onOpenMediaCuration}
        onOpenLiveMediaEdit={onOpenLiveMediaEdit}
        onOpenListingAdmin={onOpenListingAdmin}
        onDeleteListing={onDeleteListing}
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

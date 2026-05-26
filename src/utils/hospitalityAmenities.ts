/**
 * hospitalityAmenities — Back-compat re-export shim (v4.0.1 hotfix).
 *
 * The canonical SoT for amenities is `src/utils/amenities.ts`. This file
 * is retained as a re-export to keep existing call sites compiling
 * (Property.ts, HospitalityCard.tsx, PropertyDetailsScreen.tsx).
 *
 * Prefer importing from `../utils/amenities` directly in new code.
 */

export {
  HOSPITALITY_AMENITIES,
  AMENITY_ICONS,
  type HospitalityAmenity,
} from './amenities';

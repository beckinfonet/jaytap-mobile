/**
 * hospitalityAmenities — Single source of truth for the 12-item Hospitality
 * amenity taxonomy.
 *
 * Phase 6 (HOSP-05 / D-19): introduces the canonical amenity token list,
 * the HospitalityAmenity string-literal union, and the AMENITY_ICONS
 * lucide-react-native map. Consumers:
 *   - src/components/CreateListingForm/HospitalitySection.tsx (Plan 03 picker grid)
 *   - src/components/HospitalityCard.tsx (Plan 04 card hero preview chips)
 *   - src/screens/PropertyDetailsScreen.tsx (Plan 06 detail-view amenity grid)
 *   - src/components/CreateListingForm/validators.ts (Plan 02 validation branch)
 *
 * Convention: matches src/utils/propertyCategory.ts shape (named exports,
 * pure module, no React imports, no side effects).
 */

import {
  Wifi,
  AirVent,
  ThermometerSun,
  Utensils,
  Coffee,
  SquareParking,
  ConciergeBell,
  WashingMachine,
  ShowerHead,
  Sofa,
  Lock,
  Bath,
  type LucideIcon,
} from 'lucide-react-native';

/** Canonical 12-item Hospitality amenity tokens (order: REQUIREMENTS.md HOSP-05 label order). */
export const HOSPITALITY_AMENITIES = [
  'wifi',
  'aircon',
  'heating',
  'kitchen',
  'breakfast',
  'parking',
  'reception24',
  'laundry',
  'hotwater',
  'commonarea',
  'lockers',
  'ensuite',
] as const;

export type HospitalityAmenity = (typeof HOSPITALITY_AMENITIES)[number];

/** Icon-per-amenity map. Icon names per 06-RESEARCH.md §5 (lucide-react-native@0.564.0 verified). */
export const AMENITY_ICONS: Record<HospitalityAmenity, LucideIcon> = {
  wifi: Wifi,
  aircon: AirVent,
  heating: ThermometerSun,
  kitchen: Utensils,
  breakfast: Coffee,
  parking: SquareParking,
  reception24: ConciergeBell,
  laundry: WashingMachine,
  hotwater: ShowerHead,
  commonarea: Sofa,
  lockers: Lock,
  ensuite: Bath,
};

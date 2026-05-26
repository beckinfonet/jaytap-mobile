/**
 * amenities — Single source of truth for the amenity taxonomy across all
 * property types (v4.0.1 hotfix — replaces hospitalityAmenities.ts as SoT;
 * that file becomes a thin back-compat re-export).
 *
 * Three subsets keyed by property type:
 *   - RESIDENTIAL_AMENITIES (apartment, house) — 12 items
 *   - HOSPITALITY_AMENITIES (hotel, hostel) — 12 items, verbatim from M2 (D-19)
 *   - COMMERCIAL_AMENITIES (office, commercial) — 5 items
 *
 * AMENITIES (the union) is the canonical persisted set — Mongo stores
 * `property.amenities: string[]` and we accept any token in AMENITIES.
 *
 * Per spec docs/superpowers/specs/2026-05-25-listing-form-detail-polish-design.md
 * §"Issue 2 — Restore amenities to listing form, per property type".
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
  Wind,
  Car,
  PanelTop,
  ArrowUpDown,
  Flame,
  PawPrint,
  Shield,
  type LucideIcon,
} from 'lucide-react-native';

/** Residential set — apartment + house. 12 items. */
export const RESIDENTIAL_AMENITIES = [
  'aircon',
  'heating',
  'wifi',
  'hotwater',
  'washer',
  'dryer',
  'parking',
  'garage',
  'balcony',
  'elevator',
  'gasStove',
  'petFriendly',
] as const;

/** Hospitality set — hotel + hostel. Verbatim from M2 D-19. 12 items. */
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

/** Commercial set — office + commercial. 5 items. */
export const COMMERCIAL_AMENITIES = [
  'aircon',
  'heating',
  'wifi',
  'parking',
  'security',
] as const;

/** Union of all sets — accepted Mongo values. Deduplicated order: residential, hospitality-only, commercial-only. */
export const AMENITIES = [
  'aircon',
  'heating',
  'wifi',
  'hotwater',
  'washer',
  'dryer',
  'parking',
  'garage',
  'balcony',
  'elevator',
  'gasStove',
  'petFriendly',
  'kitchen',
  'breakfast',
  'reception24',
  'laundry',
  'commonarea',
  'lockers',
  'ensuite',
  'security',
] as const;

export type Amenity = (typeof AMENITIES)[number];
/** @deprecated Use `Amenity` — kept as alias for back-compat with src/utils/hospitalityAmenities.ts consumers. */
export type HospitalityAmenity = (typeof HOSPITALITY_AMENITIES)[number];

export const AMENITY_ICONS: Record<Amenity, LucideIcon> = {
  // residential-introduced
  washer: WashingMachine,
  dryer: Wind,
  garage: Car,
  balcony: PanelTop,
  elevator: ArrowUpDown,
  gasStove: Flame,
  petFriendly: PawPrint,
  // hospitality (unchanged from D-19)
  wifi: Wifi,
  aircon: AirVent,
  heating: ThermometerSun,
  hotwater: ShowerHead,
  parking: SquareParking,
  kitchen: Utensils,
  breakfast: Coffee,
  reception24: ConciergeBell,
  laundry: WashingMachine,
  commonarea: Sofa,
  lockers: Lock,
  ensuite: Bath,
  // commercial-introduced
  security: Shield,
};

export const AMENITY_LABEL_KEYS: Record<Amenity, string> = {
  aircon: 'amenity.aircon',
  heating: 'amenity.heating',
  wifi: 'amenity.wifi',
  hotwater: 'amenity.hotwater',
  washer: 'amenity.washer',
  dryer: 'amenity.dryer',
  parking: 'amenity.parking',
  garage: 'amenity.garage',
  balcony: 'amenity.balcony',
  elevator: 'amenity.elevator',
  gasStove: 'amenity.gasStove',
  petFriendly: 'amenity.petFriendly',
  kitchen: 'amenity.kitchen',
  breakfast: 'amenity.breakfast',
  reception24: 'amenity.reception24',
  laundry: 'amenity.laundry',
  commonarea: 'amenity.commonarea',
  lockers: 'amenity.lockers',
  ensuite: 'amenity.ensuite',
  security: 'amenity.security',
};

/**
 * Resolver — returns the amenity set valid for the given property type.
 * Unknown / undefined / empty propertyType returns `[]` so the form section
 * just doesn't render (defensive — covers data-migration edge cases).
 */
export function getAmenitiesForPropertyType(
  propertyType: 'apartment' | 'house' | 'hotel' | 'hostel' | 'office' | 'commercial' | string | undefined,
): readonly Amenity[] {
  switch (propertyType) {
    case 'apartment':
    case 'house':
      return RESIDENTIAL_AMENITIES;
    case 'hotel':
    case 'hostel':
      return HOSPITALITY_AMENITIES;
    case 'office':
    case 'commercial':
      return COMMERCIAL_AMENITIES;
    default:
      return [];
  }
}

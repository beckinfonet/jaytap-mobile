/**
 * propertyCategory — Single source of truth for mapping propertyType → category.
 *
 * Phase 4 (FORM-01/02/03): introduces the three-category taxonomy
 * (Residential / Commercial / Hospitality) and exposes the canonical
 * PROPERTY_TYPES list. Consumers: CreateListingScreen chip UI, Phase 5
 * validateByCategory, Phase 6 HomeScreen Hospitality filter.
 *
 * Convention: matches src/utils/passwordPolicy.ts shape (named exports,
 * pure fn, no React imports, no side effects).
 *
 * Lookup is case-insensitive (260525-ggp: M3 propertyType data is lowercase
 * per Property.ts:29; map keys are Pascal for display-label reuse in
 * HomeScreen.tsx:514).
 */

export type PropertyCategory = 'Residential' | 'Commercial' | 'Hospitality';

/** Canonical property-type list. Order matters for chip UI (grouped for scanning). */
export const PROPERTY_TYPES = [
  'Apartment', 'House', 'Townhome', 'Condo',        // Residential
  'Office', 'Retail', 'Warehouse', 'Industrial',    // Commercial
  'Hostel', 'Hotel',                                 // Hospitality
] as const;
export type PropertyType = (typeof PROPERTY_TYPES)[number];

export const RESIDENTIAL_TYPES: readonly PropertyType[] =
  ['Apartment', 'House', 'Townhome', 'Condo'] as const;
export const COMMERCIAL_TYPES: readonly PropertyType[] =
  ['Office', 'Retail', 'Warehouse', 'Industrial'] as const;
export const HOSPITALITY_TYPES: readonly PropertyType[] =
  ['Hostel', 'Hotel'] as const;

export const PROPERTY_TYPE_TO_CATEGORY: Record<PropertyType, PropertyCategory> = {
  Apartment: 'Residential',
  House: 'Residential',
  Townhome: 'Residential',
  Condo: 'Residential',
  Office: 'Commercial',
  Retail: 'Commercial',
  Warehouse: 'Commercial',
  Industrial: 'Commercial',
  Hostel: 'Hospitality',
  Hotel: 'Hospitality',
};

/**
 * Pure derivation. Unknown / null / undefined → 'Residential' (safe default for
 * brownfield data; see RESEARCH Pitfall 4 + PATTERNS §1 safe-default analog).
 *
 * 260525-ggp: normalize input case before map lookup — M3 data (Property.ts:29)
 * is lowercase, map keys are Pascal (kept Pascal because PROPERTY_TYPES is also
 * used as display labels in HomeScreen.tsx:514 with no i18n wrap). Map
 * normalization, not data normalization.
 */
export function propertyTypeToCategory(
  propertyType: string | null | undefined,
): PropertyCategory {
  if (!propertyType) {
    return 'Residential';
  }
  // Property.ts:29 declares propertyType lowercase; Step1DealAndPropertyType.tsx:14-21
  // writes lowercase; but the map keys are Pascal (kept Pascal because they're used as
  // raw display labels in HomeScreen.tsx:514). Normalize the lookup side, not the map.
  const normalized = propertyType.charAt(0).toUpperCase() + propertyType.slice(1).toLowerCase();
  return PROPERTY_TYPE_TO_CATEGORY[normalized as PropertyType] ?? 'Residential';
}

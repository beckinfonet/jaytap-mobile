/**
 * @format
 */

import {
  propertyTypeToCategory,
  PROPERTY_TYPE_TO_CATEGORY,
} from '../propertyCategory';

describe('propertyTypeToCategory', () => {
  test('Apartment maps to Residential', () => {
    expect(propertyTypeToCategory('Apartment')).toBe('Residential');
  });

  test('Office maps to Commercial', () => {
    expect(propertyTypeToCategory('Office')).toBe('Commercial');
  });

  test('Hostel maps to Hospitality', () => {
    expect(propertyTypeToCategory('Hostel')).toBe('Hospitality');
  });

  test('Hotel maps to Hospitality', () => {
    expect(propertyTypeToCategory('Hotel')).toBe('Hospitality');
  });

  test('unknown input falls back to Residential (safe default)', () => {
    expect(propertyTypeToCategory('UnknownOrLand')).toBe('Residential');
  });
});

describe('PROPERTY_TYPE_TO_CATEGORY map integrity', () => {
  test('Industrial is classified as Commercial', () => {
    expect(PROPERTY_TYPE_TO_CATEGORY.Industrial).toBe('Commercial');
  });

  test('Land is NOT a key in the map (FORM-01 atomic removal)', () => {
    expect('Land' in PROPERTY_TYPE_TO_CATEGORY).toBe(false);
  });
});

describe('propertyTypeToCategory — lowercase M3 input (Property.ts:29) — 260525-ggp routing fix', () => {
  test('lowercase apartment maps to Residential (real M3 data shape)', () => {
    expect(propertyTypeToCategory('apartment')).toBe('Residential');
  });

  test('lowercase house maps to Residential', () => {
    expect(propertyTypeToCategory('house')).toBe('Residential');
  });

  test('lowercase office maps to Commercial', () => {
    expect(propertyTypeToCategory('office')).toBe('Commercial');
  });

  // NOTE (260525-ggp deferred): Property.ts:29 declares 'commercial' as a valid
  // lowercase propertyType enum value and Step1DealAndPropertyType.tsx:14-21
  // writes it. BUT propertyCategory.ts:30-41 only declares Office/Retail/
  // Warehouse/Industrial under Commercial — there is no Pascal 'Commercial' key
  // in PROPERTY_TYPE_TO_CATEGORY. Adding one would extend PROPERTY_TYPES and
  // visibly add a new chip label to HomeScreen.tsx:514 (display labels are
  // unwrapped Pascal strings). That's a taxonomy decision out of scope for the
  // routing fix. Pinning the current safe-default behavior so a follow-up task
  // can flip this expectation as part of the taxonomy work.
  test('lowercase commercial falls back to Residential (latent taxonomy gap — no Pascal Commercial key in map)', () => {
    expect(propertyTypeToCategory('commercial')).toBe('Residential');
  });

  test('lowercase hotel maps to Hospitality (THE bug — was returning Residential)', () => {
    expect(propertyTypeToCategory('hotel')).toBe('Hospitality');
  });

  test('lowercase hostel maps to Hospitality (THE bug — was returning Residential)', () => {
    expect(propertyTypeToCategory('hostel')).toBe('Hospitality');
  });

  test('mixed-case HoTeL maps to Hospitality (defensive normalization)', () => {
    expect(propertyTypeToCategory('HoTeL')).toBe('Hospitality');
  });

  test('all-caps HOTEL maps to Hospitality', () => {
    expect(propertyTypeToCategory('HOTEL')).toBe('Hospitality');
  });

  test('unknown lowercase input still falls back to Residential (safe-default preserved)', () => {
    expect(propertyTypeToCategory('land')).toBe('Residential');
  });
});

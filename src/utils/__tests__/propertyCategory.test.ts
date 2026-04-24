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

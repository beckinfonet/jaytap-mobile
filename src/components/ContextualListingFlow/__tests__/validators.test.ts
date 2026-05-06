/**
 * @format
 */

import { validateStep, FIELD_ORDER_PER_STEP, emptyFormBag } from '../validators';

describe('Phase 2 validators — Step 1 (Plan 02-02)', () => {
  test('emptyFormBag() returns FormBag with required strings empty + null coordinates + null furnished + empty terms', () => {
    const bag = emptyFormBag();
    expect(bag.dealType).toBe('');
    expect(bag.propertyType).toBe('');
    expect(bag.location.coordinates).toBeNull();
    expect(bag.conditionAndAmenities.furnished).toBeNull();
    expect(bag.terms).toEqual({});
  });

  test('validateStep(1, emptyFormBag()) — both required errors present', () => {
    const r = validateStep(1, emptyFormBag());
    expect(r.isValid).toBe(false);
    expect(r.errors['dealType']).toBe('contextualListing.step1.dealTypeRequired');
    expect(r.errors['propertyType']).toBe('contextualListing.step1.propertyTypeRequired');
  });

  test('validateStep(1, dealType only) — propertyType missing error remains', () => {
    const r = validateStep(1, { ...emptyFormBag(), dealType: 'sale' });
    expect(r.isValid).toBe(false);
    expect(r.errors['propertyType']).toBe('contextualListing.step1.propertyTypeRequired');
  });

  test('validateStep(1, both selected) — isValid true, errors empty', () => {
    const r = validateStep(1, { ...emptyFormBag(), dealType: 'sale', propertyType: 'apartment' });
    expect(r.isValid).toBe(true);
    expect(r.errors).toEqual({});
  });

  test('FIELD_ORDER_PER_STEP[1] === ["dealType", "propertyType"]', () => {
    expect(FIELD_ORDER_PER_STEP[1]).toEqual(['dealType', 'propertyType']);
  });

  test('FIELD_ORDER_PER_STEP has entries for steps 1-6', () => {
    expect(Object.keys(FIELD_ORDER_PER_STEP).map(Number).sort()).toEqual([1, 2, 3, 4, 5, 6]);
  });
});

// W-01 fix: Step 3 currency empty-string sentinel guard. The FormBag union `'KGS' | 'USD' | 'EUR' | ''`
// requires a literal default in emptyFormBag(); the validator MUST reject '' at Step 3 so Step 6's
// deposit-currency fallback (`values.basics.currency || 'KGS'`) is unreachable with the empty sentinel.
describe('Phase 2 validators — Step 3 currency-empty sentinel guard (W-01, Plan 02-02)', () => {
  test("validateStep(3, currency='') rejects with basics.currency error", () => {
    const bag = { ...emptyFormBag(), basics: { areaSqm: '80', price: '1000', currency: '' as const } };
    const r = validateStep(3, bag);
    expect(r.isValid).toBe(false);
    expect(r.errors['basics.currency']).toBe('contextualListing.step3.currencyRequired');
  });
});

// V1, V2 — Step 2 cases (Plan 02-03).
describe('Phase 2 validators — Step 2 (Plan 02-03)', () => {
  test('emptyFormBag → 3 errors: location.city, location.district, location.coordinates', () => {
    const r = validateStep(2, emptyFormBag());
    expect(r.isValid).toBe(false);
    expect(r.errors['location.city']).toBe('contextualListing.step2.cityRequired');
    expect(r.errors['location.district']).toBe('contextualListing.step2.districtRequired');
    expect(r.errors['location.coordinates']).toBe('contextualListing.step2.coordinatesRequired');
  });

  test('all 3 set → isValid', () => {
    const bag = {
      ...emptyFormBag(),
      location: {
        city: 'bishkek',
        district: 'mkr-3',
        coordinates: { lat: 42.87, lng: 74.57 },
        showExactAddress: false,
      },
    };
    const r = validateStep(2, bag);
    expect(r.isValid).toBe(true);
    expect(r.errors).toEqual({});
  });
});

// V3..V7 — Step 3 conditional sub-field cases (Plan 02-03).
describe('Phase 2 validators — Step 3 (Plan 02-03)', () => {
  test('V3: empty + no propertyType → area + price + currency errors', () => {
    const r = validateStep(3, emptyFormBag());
    expect(r.isValid).toBe(false);
    expect(r.errors['basics.areaSqm']).toBe('contextualListing.step3.areaRequired');
    expect(r.errors['basics.price']).toBe('contextualListing.step3.priceRequired');
    expect(r.errors['basics.currency']).toBe('contextualListing.step3.currencyRequired');
  });

  test('V4: apartment + area/price/currency set → rooms still required', () => {
    const bag = {
      ...emptyFormBag(),
      propertyType: 'apartment' as const,
      basics: { areaSqm: '80', price: '1000', currency: 'KGS' as const },
    };
    const r = validateStep(3, bag);
    expect(r.isValid).toBe(false);
    expect(r.errors['basics.rooms']).toBe('contextualListing.step3.roomsRequired');
  });

  test('V5: apartment + area/price/currency + rooms → isValid', () => {
    const bag = {
      ...emptyFormBag(),
      propertyType: 'apartment' as const,
      basics: { areaSqm: '80', price: '1000', currency: 'KGS' as const, rooms: '2' as const },
    };
    const r = validateStep(3, bag);
    expect(r.isValid).toBe(true);
  });

  test('V6: office + area/price/currency → 3 errors (rooms + bathroom + kitchen)', () => {
    const bag = {
      ...emptyFormBag(),
      propertyType: 'office' as const,
      basics: { areaSqm: '80', price: '1000', currency: 'USD' as const },
    };
    const r = validateStep(3, bag);
    expect(r.isValid).toBe(false);
    expect(r.errors['basics.rooms']).toBe('contextualListing.step3.roomsRequired');
    expect(r.errors['basics.bathroom']).toBe('contextualListing.step3.bathroomRequired');
    expect(r.errors['basics.kitchen']).toBe('contextualListing.step3.kitchenRequired');
  });

  test('V7: hotel + area/price/currency → hotelRooms + hotelClass errors only (no rooms error)', () => {
    const bag = {
      ...emptyFormBag(),
      propertyType: 'hotel' as const,
      basics: { areaSqm: '80', price: '1000', currency: 'EUR' as const },
    };
    const r = validateStep(3, bag);
    expect(r.isValid).toBe(false);
    expect(r.errors['basics.hotelRooms']).toBe('contextualListing.step3.hotelRoomsRequired');
    expect(r.errors['basics.hotelClass']).toBe('contextualListing.step3.hotelClassRequired');
    expect(r.errors['basics.rooms']).toBeUndefined();
  });
});

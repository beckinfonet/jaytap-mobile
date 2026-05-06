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

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
        address: '',
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

// V8..V11 — Step 4 cases (Plan 02-04a). FLOW-09 + CONTEXT §Decisions Log #4:
// condition + furnished are required for every propertyType (including hotel/hostel).
// furnished is tri-state (true / false / null) — null counts as missing; false IS valid.
describe('Phase 2 validators — Step 4 (Plan 02-04a)', () => {
  test('V8: emptyFormBag → 2 errors (condition + furnished)', () => {
    const r = validateStep(4, emptyFormBag());
    expect(r.isValid).toBe(false);
    expect(r.errors['conditionAndAmenities.condition']).toBe(
      'contextualListing.step4.conditionRequired',
    );
    expect(r.errors['conditionAndAmenities.furnished']).toBe(
      'contextualListing.step4.furnishedRequired',
    );
  });

  test('V9: condition set + furnished=null → still error on furnished (null = missing)', () => {
    const bag = {
      ...emptyFormBag(),
      conditionAndAmenities: { condition: 'good' as const, furnished: null, amenities: [] },
    };
    const r = validateStep(4, bag);
    expect(r.errors['conditionAndAmenities.furnished']).toBeDefined();
    expect(r.errors['conditionAndAmenities.condition']).toBeUndefined();
  });

  test('V10: condition + furnished=true → isValid', () => {
    const bag = {
      ...emptyFormBag(),
      conditionAndAmenities: { condition: 'good' as const, furnished: true, amenities: [] },
    };
    expect(validateStep(4, bag).isValid).toBe(true);
  });

  test('V11: condition + furnished=false → isValid (false is valid; only null is missing)', () => {
    const bag = {
      ...emptyFormBag(),
      conditionAndAmenities: { condition: 'good' as const, furnished: false, amenities: [] },
    };
    expect(validateStep(4, bag).isValid).toBe(true);
  });
});

// V12..V14 — Step 5 cases (Plan 02-04a). FLOW-10: title + description are required
// strings; the validator uses .trim() — whitespace-only fails.
describe('Phase 2 validators — Step 5 (Plan 02-04a)', () => {
  test('V12: emptyFormBag → 2 errors (title + description)', () => {
    const r = validateStep(5, emptyFormBag());
    expect(r.isValid).toBe(false);
    expect(r.errors['content.title']).toBe('contextualListing.step5.titleRequired');
    expect(r.errors['content.description']).toBe('contextualListing.step5.descriptionRequired');
  });

  test('V13: whitespace-only title fails .trim() check', () => {
    const bag = {
      ...emptyFormBag(),
      content: { title: '   ', description: 'X', language: 'en' as const },
    };
    const r = validateStep(5, bag);
    expect(r.errors['content.title']).toBeDefined();
    expect(r.errors['content.description']).toBeUndefined();
  });

  test('V14: title + description set → isValid', () => {
    const bag = {
      ...emptyFormBag(),
      content: { title: 'Cozy 2-bed', description: 'Sunny apartment', language: 'en' as const },
    };
    const r = validateStep(5, bag);
    expect(r.isValid).toBe(true);
    expect(r.errors).toEqual({});
  });
});

// V15..V20 — Step 6 cases (Plan 02-04b). FLOW-11 + D-19:
//   sale       → negotiable required (deposit optional)
//   rent_long  → negotiable + prepaymentMonths (>=0) + minTerm required (deposit optional)
//   rent_daily → no required fields (D-19 thin step)
describe('Phase 2 validators — Step 6 (Plan 02-04b)', () => {
  test('V15: sale + empty terms → negotiable error', () => {
    const bag = { ...emptyFormBag(), dealType: 'sale' as const };
    const r = validateStep(6, bag);
    expect(r.isValid).toBe(false);
    expect(r.errors['terms.negotiable']).toBe(
      'contextualListing.step6.negotiableRequired',
    );
  });

  test('V16: sale + negotiable set → isValid (deposit optional)', () => {
    const bag = {
      ...emptyFormBag(),
      dealType: 'sale' as const,
      terms: { negotiable: true },
    };
    expect(validateStep(6, bag).isValid).toBe(true);
  });

  test('V17: rent_long + empty terms → 3 errors (negotiable + prepayment + minTerm)', () => {
    const bag = { ...emptyFormBag(), dealType: 'rent_long' as const };
    const r = validateStep(6, bag);
    expect(r.errors['terms.negotiable']).toBe(
      'contextualListing.step6.negotiableRequired',
    );
    expect(r.errors['terms.prepaymentMonths']).toBe(
      'contextualListing.step6.prepaymentRequired',
    );
    expect(r.errors['terms.minTerm']).toBe('contextualListing.step6.minTermRequired');
  });

  test('V18: rent_long + all required set → isValid', () => {
    const bag = {
      ...emptyFormBag(),
      dealType: 'rent_long' as const,
      terms: {
        negotiable: true,
        prepaymentMonths: 1,
        minTerm: '1_month' as const,
      },
    };
    expect(validateStep(6, bag).isValid).toBe(true);
  });

  test('V19: rent_long + prepaymentMonths=0 → isValid (>=0 is valid; 0 means "no prepayment")', () => {
    const bag = {
      ...emptyFormBag(),
      dealType: 'rent_long' as const,
      terms: {
        negotiable: true,
        prepaymentMonths: 0,
        minTerm: '1_month' as const,
      },
    };
    expect(validateStep(6, bag).isValid).toBe(true);
  });

  test('V20: rent_daily + empty terms → isValid (D-19 thin step — no required fields)', () => {
    const bag = { ...emptyFormBag(), dealType: 'rent_daily' as const };
    expect(validateStep(6, bag).isValid).toBe(true);
  });
});

// Quick-task 260526-foc — terms.availableDate is OPTIONAL on every dealType (empty/undefined
// means "available now"); the validator only checks format for direct-write paths
// (the date picker UI emits 'YYYY-MM-DD' so format errors should never surface in normal use).
describe('Quick-task 260526-foc validators — terms.availableDate defensive (Step 6)', () => {
  const validRentLong = {
    ...emptyFormBag(),
    dealType: 'rent_long' as const,
    terms: {
      negotiable: true,
      prepaymentMonths: 1,
      minTerm: '1_month' as const,
    },
  };

  test('G: availableDate undefined on rent_long with all required set → isValid (optional)', () => {
    const r = validateStep(6, validRentLong);
    expect(r.errors['terms.availableDate']).toBeUndefined();
    expect(r.isValid).toBe(true);
  });

  test('H: availableDate="" empty string → no error (treated same as undefined)', () => {
    const bag = { ...validRentLong, terms: { ...validRentLong.terms, availableDate: '' } };
    const r = validateStep(6, bag);
    expect(r.errors['terms.availableDate']).toBeUndefined();
    expect(r.isValid).toBe(true);
  });

  test('I: availableDate="2026-06-01" valid ISO date → no error, isValid', () => {
    const bag = { ...validRentLong, terms: { ...validRentLong.terms, availableDate: '2026-06-01' } };
    const r = validateStep(6, bag);
    expect(r.errors['terms.availableDate']).toBeUndefined();
    expect(r.isValid).toBe(true);
  });

  test('J: availableDate="06/01/2026" wrong format → availableDateInvalid error', () => {
    const bag = { ...validRentLong, terms: { ...validRentLong.terms, availableDate: '06/01/2026' } };
    const r = validateStep(6, bag);
    expect(r.errors['terms.availableDate']).toBe('contextualListing.step6.availableDateInvalid');
  });

  test('K: availableDate="2026-13-45" unparseable date → availableDateInvalid error', () => {
    const bag = { ...validRentLong, terms: { ...validRentLong.terms, availableDate: '2026-13-45' } };
    const r = validateStep(6, bag);
    expect(r.errors['terms.availableDate']).toBe('contextualListing.step6.availableDateInvalid');
  });

  test('K2: rent_daily + availableDate set → isValid (D-19 thin step preserved; date is still optional)', () => {
    const bag = {
      ...emptyFormBag(),
      dealType: 'rent_daily' as const,
      terms: { availableDate: '2026-06-01' },
    };
    expect(validateStep(6, bag).isValid).toBe(true);
  });

  test('K3: FIELD_ORDER_PER_STEP[6] includes "terms.availableDate" after minTerm', () => {
    const order = FIELD_ORDER_PER_STEP[6];
    const minTermIdx = order.indexOf('terms.minTerm');
    const availIdx = order.indexOf('terms.availableDate');
    expect(availIdx).toBeGreaterThan(minTermIdx);
  });
});

// Plan 07-03 (M4 FORM-04) — defensive bedrooms + bathroomCount validators.
// D-09 invariant: defensive-only; never required; undefined ALWAYS valid.
// Stepper UI clamps prevent these from firing; checks catch direct-write paths.
describe('Plan 07-03 validators — bedrooms + bathroomCount defensive (M4 FORM-04)', () => {
  const baseValidStep3 = {
    ...emptyFormBag(),
    propertyType: 'apartment' as const,
    basics: {
      areaSqm: '80',
      price: '1000',
      currency: 'KGS' as const,
      rooms: '2' as const,
    },
  };

  test('1: undefined-OK — bedrooms + bathroomCount undefined → no error keys (FORM-04 lock)', () => {
    const bag = {
      ...baseValidStep3,
      basics: { ...baseValidStep3.basics, bedrooms: undefined, bathroomCount: undefined },
    };
    const r = validateStep(3, bag);
    expect(r.errors['basics.bedrooms']).toBeUndefined();
    expect(r.errors['basics.bathroomCount']).toBeUndefined();
    expect(r.isValid).toBe(true);
  });

  test('2: bedrooms=11 → bedroomsInvalid (out-of-range)', () => {
    const bag = {
      ...baseValidStep3,
      basics: { ...baseValidStep3.basics, bedrooms: 11 },
    };
    const r = validateStep(3, bag);
    expect(r.errors['basics.bedrooms']).toBe('contextualListing.step3.bedroomsInvalid');
  });

  test('3: bedrooms=2.5 → bedroomsInvalid (non-integer)', () => {
    const bag = {
      ...baseValidStep3,
      basics: { ...baseValidStep3.basics, bedrooms: 2.5 },
    };
    const r = validateStep(3, bag);
    expect(r.errors['basics.bedrooms']).toBe('contextualListing.step3.bedroomsInvalid');
  });

  test('4: bedrooms=3 → no error', () => {
    const bag = {
      ...baseValidStep3,
      basics: { ...baseValidStep3.basics, bedrooms: 3 },
    };
    const r = validateStep(3, bag);
    expect(r.errors['basics.bedrooms']).toBeUndefined();
  });

  test('5: bathroomCount=1.3 → bathroomCountInvalid (non-0.5-step)', () => {
    const bag = {
      ...baseValidStep3,
      basics: { ...baseValidStep3.basics, bathroomCount: 1.3 },
    };
    const r = validateStep(3, bag);
    expect(r.errors['basics.bathroomCount']).toBe(
      'contextualListing.step3.bathroomCountInvalid',
    );
  });

  test('6: bathroomCount=1.5 → no error (valid 0.5-step)', () => {
    const bag = {
      ...baseValidStep3,
      basics: { ...baseValidStep3.basics, bathroomCount: 1.5 },
    };
    const r = validateStep(3, bag);
    expect(r.errors['basics.bathroomCount']).toBeUndefined();
  });

  test('7: bathroomCount=11 → bathroomCountInvalid (out-of-range)', () => {
    const bag = {
      ...baseValidStep3,
      basics: { ...baseValidStep3.basics, bathroomCount: 11 },
    };
    const r = validateStep(3, bag);
    expect(r.errors['basics.bathroomCount']).toBe(
      'contextualListing.step3.bathroomCountInvalid',
    );
  });

  test('8: FIELD_ORDER_PER_STEP[3] contains basics.bedrooms + basics.bathroomCount appended after basics.hotelClass', () => {
    const order = FIELD_ORDER_PER_STEP[3];
    expect(order).toContain('basics.bedrooms');
    expect(order).toContain('basics.bathroomCount');
    const hotelClassIdx = order.indexOf('basics.hotelClass');
    const bedroomsIdx = order.indexOf('basics.bedrooms');
    const bathroomCountIdx = order.indexOf('basics.bathroomCount');
    expect(bedroomsIdx).toBeGreaterThan(hotelClassIdx);
    expect(bathroomCountIdx).toBeGreaterThan(bedroomsIdx);
  });
});

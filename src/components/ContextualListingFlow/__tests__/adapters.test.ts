/**
 * @format
 */

import { propertyToFormBag, formBagToPropertyPayload } from '../adapters';
import { emptyFormBag } from '../validators';
import type { Property } from '../../../types/Property';
import type { FormBag } from '../types';

describe('Phase 2 adapters — propertyToFormBag (Plan 02-02)', () => {
  test('undefined Property → emptyFormBag', () => {
    expect(propertyToFormBag(undefined)).toEqual(emptyFormBag());
  });

  test('legacy Property missing nested subtrees → default-to-empty FormBag (no throw)', () => {
    const p = { id: 'x' } as Property; // bare Property, no nested fields
    const bag = propertyToFormBag(p);
    expect(bag.location.city).toBe('');
    expect(bag.basics.areaSqm).toBe('');
    expect(bag.conditionAndAmenities.furnished).toBeNull();
  });

  test('full nested Property preserves all fields', () => {
    const p: Property = {
      id: 'x',
      dealType: 'rent_long',
      propertyType: 'apartment',
      location: {
        city: 'bishkek',
        district: 'asanbay',
        coordinates: { lat: 42.87, lng: 74.57 },
        showExactAddress: true,
      },
      basics: { areaSqm: 80, price: 1000, currency: 'KGS', rooms: '2' },
      conditionAndAmenities: { condition: 'good', furnished: true },
      content: { title: 'Cozy', description: 'Nice', language: 'en' },
      terms: { negotiable: true, prepaymentMonths: 1, minTerm: '1_month' },
    } as Property;
    const bag = propertyToFormBag(p);
    expect(bag.dealType).toBe('rent_long');
    expect(bag.location.city).toBe('bishkek');
    expect(bag.basics.areaSqm).toBe('80');
    expect(bag.terms.prepaymentMonths).toBe(1);
  });
});

describe('Phase 2 adapters — formBagToPropertyPayload (Plan 02-02)', () => {
  test('payload contains all top-level subtrees + NO status, NO media, NO id', () => {
    const bag: FormBag = { ...emptyFormBag(), dealType: 'sale', propertyType: 'apartment' };
    const payload = formBagToPropertyPayload(bag);
    expect(payload).toHaveProperty('dealType', 'sale');
    expect(payload).toHaveProperty('propertyType', 'apartment');
    expect(payload).toHaveProperty('location');
    expect(payload).toHaveProperty('basics');
    expect(payload).toHaveProperty('conditionAndAmenities');
    expect(payload).toHaveProperty('content');
    expect(payload).toHaveProperty('terms');
    expect(payload).not.toHaveProperty('status');
    expect(payload).not.toHaveProperty('media');
    expect(payload).not.toHaveProperty('id');
  });

  test('numeric strings parsed to numbers', () => {
    const bag: FormBag = {
      ...emptyFormBag(),
      basics: { ...emptyFormBag().basics, areaSqm: '80', price: '1500' },
    };
    const payload = formBagToPropertyPayload(bag) as { basics: { areaSqm: number; price: number } };
    expect(payload.basics.areaSqm).toBe(80);
    expect(payload.basics.price).toBe(1500);
  });
});

describe('Phase 2 adapters — round-trip invariants (Plan 02-02)', () => {
  test('round-trip: apartment + rent_long preserves shape', () => {
    const original: FormBag = {
      ...emptyFormBag(),
      dealType: 'rent_long',
      propertyType: 'apartment',
      location: {
        city: 'bishkek',
        district: 'asanbay',
        coordinates: { lat: 42.87, lng: 74.57 },
        showExactAddress: false,
      },
      basics: { areaSqm: '80', price: '1000', currency: 'KGS', rooms: '2' },
      conditionAndAmenities: { condition: 'good', furnished: true },
      content: { title: 'X', description: 'Y', language: 'en' },
      terms: { negotiable: true, prepaymentMonths: 1, minTerm: '1_month' },
    };
    const payload = formBagToPropertyPayload(original);
    const back = propertyToFormBag(payload as unknown as Property);
    expect(back.dealType).toBe(original.dealType);
    expect(back.propertyType).toBe(original.propertyType);
    expect(back.location.city).toBe(original.location.city);
    expect(back.basics.areaSqm).toBe(original.basics.areaSqm);
    expect(back.terms.prepaymentMonths).toBe(original.terms.prepaymentMonths);
  });

  test('round-trip: hotel + rent_daily preserves shape', () => {
    const original: FormBag = {
      ...emptyFormBag(),
      dealType: 'rent_daily',
      propertyType: 'hotel',
      location: {
        city: 'almaty',
        district: 'medeu',
        coordinates: { lat: 43.22, lng: 76.85 },
        showExactAddress: true,
      },
      basics: { areaSqm: '120', price: '50', currency: 'USD', hotelRooms: '4+', hotelClass: 'comfort' },
      conditionAndAmenities: { condition: 'euro', furnished: true },
      content: { title: 'Hotel X', description: 'Lux', language: 'en' },
      terms: {},
    };
    const payload = formBagToPropertyPayload(original);
    const back = propertyToFormBag(payload as unknown as Property);
    expect(back.propertyType).toBe('hotel');
    expect(back.basics.hotelRooms).toBe('4+');
    expect(back.basics.hotelClass).toBe('comfort');
    expect(back.location.showExactAddress).toBe(true);
  });
});

// Plan 07-03 (M4 FORM-04 / FORM-05) — bedrooms + bathroomCount adapter wiring.
// D-08 invariant: bidirectional, undefined-preserving, no coerce-to-zero.
describe('Plan 07-03 adapters — bedrooms + bathroomCount (M4 FORM-04 / FORM-05)', () => {
  test('A: propertyToFormBag — bedrooms=3 + bathroomCount=1.5 carry through', () => {
    const p: Property = {
      id: 'x',
      basics: { areaSqm: 80, price: 1000, currency: 'KGS', bedrooms: 3, bathroomCount: 1.5 },
    } as Property;
    const bag = propertyToFormBag(p);
    expect(bag.basics.bedrooms).toBe(3);
    expect(bag.basics.bathroomCount).toBe(1.5);
  });

  test('B: propertyToFormBag — missing bedrooms/bathroomCount keys remain undefined (NOT 0, NOT "")', () => {
    const p: Property = {
      id: 'x',
      basics: { areaSqm: 80, price: 1000, currency: 'KGS' },
    } as Property;
    const bag = propertyToFormBag(p);
    expect(bag.basics.bedrooms).toBeUndefined();
    expect(bag.basics.bathroomCount).toBeUndefined();
  });

  test('C: formBagToPropertyPayload — bedrooms=3 + bathroomCount=1.5 pass through verbatim', () => {
    const bag: FormBag = {
      ...emptyFormBag(),
      basics: { areaSqm: '80', price: '1000', currency: 'KGS', bedrooms: 3, bathroomCount: 1.5 },
    };
    const payload = formBagToPropertyPayload(bag) as { basics: { bedrooms?: number; bathroomCount?: number } };
    expect(payload.basics.bedrooms).toBe(3);
    expect(payload.basics.bathroomCount).toBe(1.5);
  });

  test('D: formBagToPropertyPayload — undefined survives, NOT coerced to 0 (FORM-05 invariant)', () => {
    const bag: FormBag = {
      ...emptyFormBag(),
      basics: {
        areaSqm: '80',
        price: '1000',
        currency: 'KGS',
        bedrooms: undefined,
        bathroomCount: undefined,
      },
    };
    const payload = formBagToPropertyPayload(bag) as { basics: { bedrooms?: number; bathroomCount?: number } };
    expect(payload.basics.bedrooms).toBeUndefined();
    expect(payload.basics.bathroomCount).toBeUndefined();
  });

  test('E: round-trip Property→FormBag→Property preserves bedrooms=3 + bathroomCount=2.5', () => {
    const original: Property = {
      id: 'x',
      dealType: 'rent_long',
      propertyType: 'apartment',
      basics: {
        areaSqm: 80,
        price: 1000,
        currency: 'KGS',
        rooms: '2',
        bedrooms: 3,
        bathroomCount: 2.5,
      },
    } as Property;
    const bag = propertyToFormBag(original);
    const back = formBagToPropertyPayload(bag) as { basics: { bedrooms?: number; bathroomCount?: number } };
    expect(back.basics.bedrooms).toBe(3);
    expect(back.basics.bathroomCount).toBe(2.5);
  });
});

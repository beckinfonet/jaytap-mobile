/**
 * @format
 */

import {
  validateByCategory,
  buildPayloadByCategory,
} from '../validators';
import type { FormBag } from '../types';
import type { HospitalityAmenity } from '../../../utils/hospitalityAmenities';

function makeBase(): FormBag {
  return {
    title: 'T',
    description: 'D',
    address: 'A',
    city: 'Bishkek',
    district: 'X',
    type: 'rent',
    propertyType: 'Apartment',
    features: [],
    featureInput: '',
    selectedImages: [],
    availableDate: '',
    bedrooms: '',
    bathrooms: '',
    areaSqm: '',
    price: '',
    currency: '',
    rooms: '',
    maxGuests: '',
    amenities: [],
    tours: [],
    tourTitle: '',
    tourUrl: '',
    videoUrl: '',
    panoramicPhotosUrl: '',
    instagramUrl: '',
    contactEmail: '',
    contactPhone: '',
    contactWhatsapp: '',
    contactTelegram: '',
    verifyOwnership: false,
    verifyOwnerId: false,
    verifyStateDocs: false,
  };
}

describe('validateByCategory — Residential', () => {
  test('happy-path inputs return isValid: true, empty errors', () => {
    const values: FormBag = {
      ...makeBase(),
      propertyType: 'Apartment',
      bedrooms: '2',
      bathrooms: '1',
      areaSqm: '80',
      price: '1000',
      currency: '$',
    };
    const result = validateByCategory(values, 'Residential');
    expect(result.isValid).toBe(true);
    expect(Object.keys(result.errors).length).toBe(0);
  });

  test('missing title → errors.title set', () => {
    const values: FormBag = {
      ...makeBase(),
      title: '',
      bedrooms: '2',
      bathrooms: '1',
      areaSqm: '80',
      price: '1000',
      currency: '$',
    };
    const result = validateByCategory(values, 'Residential');
    expect(result.isValid).toBe(false);
    expect(result.errors.title).toBe('createListing.titleRequired');
  });

  test('missing bedrooms → errors.bedrooms set', () => {
    const values: FormBag = {
      ...makeBase(),
      bedrooms: '',
      bathrooms: '1',
      areaSqm: '80',
      price: '1000',
      currency: '$',
    };
    const result = validateByCategory(values, 'Residential');
    expect(result.isValid).toBe(false);
    expect(result.errors.bedrooms).toBe('createListing.bedroomsRequired');
  });

  test('missing bathrooms → errors.bathrooms set', () => {
    const values: FormBag = {
      ...makeBase(),
      bedrooms: '2',
      bathrooms: '',
      areaSqm: '80',
      price: '1000',
      currency: '$',
    };
    const result = validateByCategory(values, 'Residential');
    expect(result.errors.bathrooms).toBe('createListing.bathroomsRequired');
  });

  test('missing areaSqm → errors.areaSqm set', () => {
    const values: FormBag = {
      ...makeBase(),
      bedrooms: '2',
      bathrooms: '1',
      areaSqm: '',
      price: '1000',
      currency: '$',
    };
    const result = validateByCategory(values, 'Residential');
    expect(result.errors.areaSqm).toBe('createListing.areaRequired');
  });

  test('missing price → errors.price set', () => {
    const values: FormBag = {
      ...makeBase(),
      bedrooms: '2',
      bathrooms: '1',
      areaSqm: '80',
      price: '',
      currency: '$',
    };
    const result = validateByCategory(values, 'Residential');
    expect(result.errors.price).toBe('createListing.priceRequired');
  });

  test('currency empty string → errors.currency set', () => {
    const values: FormBag = {
      ...makeBase(),
      bedrooms: '2',
      bathrooms: '1',
      areaSqm: '80',
      price: '1000',
      currency: '',
    };
    const result = validateByCategory(values, 'Residential');
    expect(result.errors.currency).toBe('createListing.currencyRequired');
  });
});

describe('validateByCategory — Commercial', () => {
  test('happy-path propertyType=Office returns valid', () => {
    const values: FormBag = {
      ...makeBase(),
      propertyType: 'Office',
      areaSqm: '200',
      price: '5000',
      currency: '$',
    };
    const result = validateByCategory(values, 'Commercial');
    expect(result.isValid).toBe(true);
    expect(Object.keys(result.errors).length).toBe(0);
  });

  test('missing areaSqm → errors.areaSqm set', () => {
    const values: FormBag = {
      ...makeBase(),
      propertyType: 'Office',
      areaSqm: '',
      price: '5000',
      currency: '$',
    };
    const result = validateByCategory(values, 'Commercial');
    expect(result.isValid).toBe(false);
    expect(result.errors.areaSqm).toBe('createListing.areaRequired');
  });

  test('currency empty → errors.currency set', () => {
    const values: FormBag = {
      ...makeBase(),
      propertyType: 'Office',
      areaSqm: '200',
      price: '5000',
      currency: '',
    };
    const result = validateByCategory(values, 'Commercial');
    expect(result.errors.currency).toBe('createListing.currencyRequired');
  });

  test('Commercial does not require bedrooms/bathrooms', () => {
    const values: FormBag = {
      ...makeBase(),
      propertyType: 'Office',
      bedrooms: '',
      bathrooms: '',
      areaSqm: '200',
      price: '5000',
      currency: '$',
    };
    const result = validateByCategory(values, 'Commercial');
    expect(result.isValid).toBe(true);
    expect(result.errors.bedrooms).toBe(undefined);
    expect(result.errors.bathrooms).toBe(undefined);
  });

  test('propertyType=Apartment with category=Commercial → errors.propertyType (Pitfall 5 defensive)', () => {
    const values: FormBag = {
      ...makeBase(),
      propertyType: 'Apartment',
      areaSqm: '200',
      price: '5000',
      currency: '$',
    };
    const result = validateByCategory(values, 'Commercial');
    expect(result.isValid).toBe(false);
    expect(result.errors.propertyType).toBe('createListing.propertyTypeRequired');
  });
});

describe('validateByCategory — Hospitality', () => {
  function hospitalityBase(): FormBag {
    return {
      ...makeBase(),
      propertyType: 'Hostel',
      rooms: '3',
      bathrooms: '2',
      maxGuests: '5',
      amenities: ['wifi'] as HospitalityAmenity[],
    };
  }

  test('ALL contacts empty → valid (pass-through per D-09)', () => {
    const values = hospitalityBase();
    const result = validateByCategory(values, 'Hospitality');
    expect(result.isValid).toBe(true);
    expect(Object.keys(result.errors).length).toBe(0);
  });

  test('phone only → invalid (needs WA or TG)', () => {
    const values: FormBag = {
      ...hospitalityBase(),
      contactPhone: '+996555',
      contactWhatsapp: '',
      contactTelegram: '',
    };
    const result = validateByCategory(values, 'Hospitality');
    expect(result.isValid).toBe(false);
    expect(result.errors.contactPhone).toBe('createListing.contactMissingInline');
  });

  test('whatsapp only → invalid (needs phone)', () => {
    const values: FormBag = {
      ...hospitalityBase(),
      contactPhone: '',
      contactWhatsapp: '+996555',
      contactTelegram: '',
    };
    const result = validateByCategory(values, 'Hospitality');
    expect(result.isValid).toBe(false);
    expect(result.errors.contactPhone).toBe('createListing.contactMissingInline');
  });

  test('telegram only → invalid (needs phone)', () => {
    const values: FormBag = {
      ...hospitalityBase(),
      contactPhone: '',
      contactWhatsapp: '',
      contactTelegram: '@handle',
    };
    const result = validateByCategory(values, 'Hospitality');
    expect(result.isValid).toBe(false);
    expect(result.errors.contactPhone).toBe('createListing.contactMissingInline');
  });

  test('phone + whatsapp → valid', () => {
    const values: FormBag = {
      ...hospitalityBase(),
      contactPhone: '+996555',
      contactWhatsapp: '+996555',
      contactTelegram: '',
    };
    const result = validateByCategory(values, 'Hospitality');
    expect(result.isValid).toBe(true);
    expect(result.errors.contactPhone).toBe(undefined);
  });

  test('phone + telegram → valid', () => {
    const values: FormBag = {
      ...hospitalityBase(),
      contactPhone: '+996555',
      contactWhatsapp: '',
      contactTelegram: '@handle',
    };
    const result = validateByCategory(values, 'Hospitality');
    expect(result.isValid).toBe(true);
    expect(result.errors.contactPhone).toBe(undefined);
  });

  test('phone + whatsapp + telegram → valid', () => {
    const values: FormBag = {
      ...hospitalityBase(),
      contactPhone: '+996555',
      contactWhatsapp: '+996555',
      contactTelegram: '@handle',
    };
    const result = validateByCategory(values, 'Hospitality');
    expect(result.isValid).toBe(true);
    expect(result.errors.contactPhone).toBe(undefined);
  });

  test('missing rooms → errors.rooms set', () => {
    const values: FormBag = {
      ...hospitalityBase(),
      rooms: '',
    };
    const result = validateByCategory(values, 'Hospitality');
    expect(result.isValid).toBe(false);
    expect(result.errors.rooms).toBe('createListing.roomsRequired');
  });

  test('missing bathrooms → errors.bathrooms set', () => {
    const values: FormBag = {
      ...hospitalityBase(),
      bathrooms: '',
    };
    const result = validateByCategory(values, 'Hospitality');
    expect(result.errors.bathrooms).toBe('createListing.bathroomsRequired');
  });

  test('missing maxGuests → errors.maxGuests set', () => {
    const values: FormBag = {
      ...hospitalityBase(),
      maxGuests: '',
    };
    const result = validateByCategory(values, 'Hospitality');
    expect(result.errors.maxGuests).toBe('createListing.maxGuestsRequired');
  });

  test('empty amenities → errors.amenities set (D-22)', () => {
    const values: FormBag = { ...hospitalityBase(), amenities: [] as HospitalityAmenity[] };
    const result = validateByCategory(values, 'Hospitality');
    expect(result.isValid).toBe(false);
    expect(result.errors.amenities).toBe('createListing.amenitiesRequired');
  });

  test('1+ amenity → errors.amenities unset (D-22)', () => {
    const values: FormBag = { ...hospitalityBase(), amenities: ['wifi'] as HospitalityAmenity[] };
    const result = validateByCategory(values, 'Hospitality');
    expect(result.errors.amenities).toBe(undefined);
  });
});

describe('buildPayloadByCategory — payload shape invariants', () => {
  test('Residential payload contains bedrooms/bathrooms/areaSqm/price/currency', () => {
    const values: FormBag = {
      ...makeBase(),
      propertyType: 'Apartment',
      bedrooms: '2',
      bathrooms: '1',
      areaSqm: '80',
      price: '1000',
      currency: '$',
    };
    const payload: Record<string, unknown> = buildPayloadByCategory(values, 'Residential');
    expect('bedrooms' in payload).toBe(true);
    expect('bathrooms' in payload).toBe(true);
    expect('areaSqm' in payload).toBe(true);
    expect('price' in payload).toBe(true);
    expect('currency' in payload).toBe(true);
  });

  test('Commercial payload does NOT contain bedrooms or bathrooms keys', () => {
    const values: FormBag = {
      ...makeBase(),
      propertyType: 'Office',
      areaSqm: '200',
      price: '5000',
      currency: '$',
    };
    const payload: Record<string, unknown> = buildPayloadByCategory(values, 'Commercial');
    expect('bedrooms' in payload).toBe(false);
    expect('bathrooms' in payload).toBe(false);
    expect('areaSqm' in payload).toBe(true);
    expect('price' in payload).toBe(true);
    expect('currency' in payload).toBe(true);
  });

  test('Hospitality payload excludes price/currency/areaSqm AND includes amenities (D-22)', () => {
    const values: FormBag = {
      ...makeBase(),
      propertyType: 'Hostel',
      rooms: '3',
      bathrooms: '2',
      maxGuests: '5',
      amenities: ['wifi', 'aircon'] as HospitalityAmenity[],
    };
    const payload: Record<string, unknown> = buildPayloadByCategory(values, 'Hospitality');
    expect('price' in payload).toBe(false);
    expect('currency' in payload).toBe(false);
    expect('areaSqm' in payload).toBe(false);
    expect('amenities' in payload).toBe(true);                 // FLIPPED from false
    expect((payload.amenities as string[]).length).toBe(2);    // NEW
    expect('rooms' in payload).toBe(true);
    expect('bathrooms' in payload).toBe(true);
    expect('maxGuests' in payload).toBe(true);
  });

  test('Residential payload does NOT contain amenities key (D-22)', () => {
    const values: FormBag = {
      ...makeBase(),
      propertyType: 'Apartment',
      bedrooms: '2',
      bathrooms: '1',
      areaSqm: '80',
      price: '1000',
      currency: '$',
      amenities: ['wifi'] as HospitalityAmenity[],
    };
    const payload: Record<string, unknown> = buildPayloadByCategory(values, 'Residential');
    expect('amenities' in payload).toBe(false);
  });

  test('Commercial payload does NOT contain amenities key (D-22)', () => {
    const values: FormBag = {
      ...makeBase(),
      propertyType: 'Office',
      areaSqm: '200',
      price: '5000',
      currency: '$',
      amenities: ['wifi'] as HospitalityAmenity[],
    };
    const payload: Record<string, unknown> = buildPayloadByCategory(values, 'Commercial');
    expect('amenities' in payload).toBe(false);
  });

  test('D-09 anchor B: panoramicPhotosUrl present in all 3 category payloads', () => {
    const base = makeBase();
    const resPayload: Record<string, unknown> = buildPayloadByCategory(
      { ...base, propertyType: 'Apartment' },
      'Residential',
    );
    const comPayload: Record<string, unknown> = buildPayloadByCategory(
      { ...base, propertyType: 'Office' },
      'Commercial',
    );
    const hosPayload: Record<string, unknown> = buildPayloadByCategory(
      { ...base, propertyType: 'Hostel' },
      'Hospitality',
    );
    expect('panoramicPhotosUrl' in resPayload).toBe(true);
    expect('panoramicPhotosUrl' in comPayload).toBe(true);
    expect('panoramicPhotosUrl' in hosPayload).toBe(true);
  });

  test('D-09 anchor C: tours equal input array when non-empty across all 3 categories', () => {
    const toursInput = [{ id: 't1', title: 'Tour', url: 'https://x' }];
    const base: FormBag = { ...makeBase(), tours: toursInput };
    const resPayload = buildPayloadByCategory(
      { ...base, propertyType: 'Apartment' },
      'Residential',
    );
    const comPayload = buildPayloadByCategory(
      { ...base, propertyType: 'Office' },
      'Commercial',
    );
    const hosPayload = buildPayloadByCategory(
      { ...base, propertyType: 'Hostel' },
      'Hospitality',
    );
    expect(resPayload.tours).toEqual(toursInput);
    expect(comPayload.tours).toEqual(toursInput);
    expect(hosPayload.tours).toEqual(toursInput);
  });

  test('D-09 anchor C: tours undefined when empty array across all 3 categories', () => {
    const base: FormBag = { ...makeBase(), tours: [] };
    const resPayload = buildPayloadByCategory(
      { ...base, propertyType: 'Apartment' },
      'Residential',
    );
    const comPayload = buildPayloadByCategory(
      { ...base, propertyType: 'Office' },
      'Commercial',
    );
    const hosPayload = buildPayloadByCategory(
      { ...base, propertyType: 'Hostel' },
      'Hospitality',
    );
    expect(resPayload.tours).toBe(undefined);
    expect(comPayload.tours).toBe(undefined);
    expect(hosPayload.tours).toBe(undefined);
  });
});

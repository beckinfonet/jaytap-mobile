// Phase 2 — pure validators (D-01 + D-12 + FLOW-12).
// Mirrors M1 P5 `validateByCategory()` (`src/components/CreateListingForm/validators.ts`).
// No React imports. No side effects. Translation-key error values — caller translates at render time.

import type { FormBag, FormErrorBag } from './types';

export interface ValidateResult {
  isValid: boolean;
  errors: FormErrorBag;
}

// FIELD_ORDER_PER_STEP — used for scroll-to-first-error on Submit/Next failure (Tradeoff §I).
// Mirrors M1 P5 `FIELD_ORDER_BY_CATEGORY`.
export const FIELD_ORDER_PER_STEP: Record<1 | 2 | 3 | 4 | 5 | 6, string[]> = {
  1: ['dealType', 'propertyType'],
  2: ['location.city', 'location.district', 'location.coordinates'],
  3: [
    'basics.areaSqm',
    'basics.price',
    'basics.currency',
    'basics.rooms',
    'basics.bathroom',
    'basics.kitchen',
    'basics.hotelRooms',
    'basics.hotelClass',
  ],
  4: ['conditionAndAmenities.condition', 'conditionAndAmenities.furnished'],
  5: ['content.title', 'content.description'],
  6: ['terms.negotiable', 'terms.deposit', 'terms.prepaymentMonths', 'terms.minTerm'],
};

export function emptyFormBag(): FormBag {
  return {
    dealType: '',
    propertyType: '',
    location: { city: '', district: '', coordinates: null, showExactAddress: false },
    basics: { areaSqm: '', price: '', currency: '' },
    conditionAndAmenities: { condition: '', furnished: null },
    content: { title: '', description: '', language: 'ru' },
    terms: {},
  };
}

export function validateStep(stepN: 1 | 2 | 3 | 4 | 5 | 6, values: FormBag): ValidateResult {
  const errors: FormErrorBag = {};

  if (stepN === 1) {
    if (!values.dealType) errors['dealType'] = 'contextualListing.step1.dealTypeRequired';
    if (!values.propertyType) errors['propertyType'] = 'contextualListing.step1.propertyTypeRequired';
  } else if (stepN === 2) {
    if (!values.location.city) errors['location.city'] = 'contextualListing.step2.cityRequired';
    if (!values.location.district) errors['location.district'] = 'contextualListing.step2.districtRequired';
    if (!values.location.coordinates)
      errors['location.coordinates'] = 'contextualListing.step2.coordinatesRequired';
  } else if (stepN === 3) {
    const area = parseFloat(values.basics.areaSqm);
    const price = parseFloat(values.basics.price);
    if (!area || area <= 0) errors['basics.areaSqm'] = 'contextualListing.step3.areaRequired';
    if (!price || price <= 0) errors['basics.price'] = 'contextualListing.step3.priceRequired';
    if (!values.basics.currency) errors['basics.currency'] = 'contextualListing.step3.currencyRequired';
    const pt = values.propertyType;
    if (pt === 'apartment' || pt === 'house') {
      if (!values.basics.rooms) errors['basics.rooms'] = 'contextualListing.step3.roomsRequired';
    } else if (pt === 'office' || pt === 'commercial') {
      if (!values.basics.rooms) errors['basics.rooms'] = 'contextualListing.step3.roomsRequired';
      if (!values.basics.bathroom)
        errors['basics.bathroom'] = 'contextualListing.step3.bathroomRequired';
      if (!values.basics.kitchen)
        errors['basics.kitchen'] = 'contextualListing.step3.kitchenRequired';
    } else if (pt === 'hotel' || pt === 'hostel') {
      if (!values.basics.hotelRooms)
        errors['basics.hotelRooms'] = 'contextualListing.step3.hotelRoomsRequired';
      if (!values.basics.hotelClass)
        errors['basics.hotelClass'] = 'contextualListing.step3.hotelClassRequired';
    }
  } else if (stepN === 4) {
    if (!values.conditionAndAmenities.condition)
      errors['conditionAndAmenities.condition'] = 'contextualListing.step4.conditionRequired';
    if (values.conditionAndAmenities.furnished === null)
      errors['conditionAndAmenities.furnished'] = 'contextualListing.step4.furnishedRequired';
  } else if (stepN === 5) {
    if (!values.content.title.trim())
      errors['content.title'] = 'contextualListing.step5.titleRequired';
    if (!values.content.description.trim())
      errors['content.description'] = 'contextualListing.step5.descriptionRequired';
  } else if (stepN === 6) {
    const dt = values.dealType;
    if (dt === 'rent_long') {
      if (values.terms.negotiable === undefined)
        errors['terms.negotiable'] = 'contextualListing.step6.negotiableRequired';
      if (values.terms.prepaymentMonths === undefined || values.terms.prepaymentMonths < 0)
        errors['terms.prepaymentMonths'] = 'contextualListing.step6.prepaymentRequired';
      if (!values.terms.minTerm)
        errors['terms.minTerm'] = 'contextualListing.step6.minTermRequired';
    } else if (dt === 'sale') {
      if (values.terms.negotiable === undefined)
        errors['terms.negotiable'] = 'contextualListing.step6.negotiableRequired';
    }
    // rent_daily: no required fields
  }

  return { isValid: Object.keys(errors).length === 0, errors };
}

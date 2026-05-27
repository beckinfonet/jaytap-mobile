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
  // Quick-task 260527-0cg (Phase 12 address-flow redesign): district dropped from Step 2.
  2: ['location.city', 'location.coordinates', 'location.address'],
  3: [
    'basics.areaSqm',
    'basics.price',
    'basics.currency',
    'basics.rooms',
    'basics.bathroom',
    'basics.kitchen',
    'basics.hotelRooms',
    'basics.hotelClass',
    'basics.bedrooms',
    'basics.bathroomCount',
  ],
  4: ['conditionAndAmenities.condition', 'conditionAndAmenities.furnished'],
  5: ['content.title', 'content.description'],
  6: ['terms.negotiable', 'terms.deposit', 'terms.prepaymentMonths', 'terms.minTerm', 'terms.availableDate'],
};

export function emptyFormBag(): FormBag {
  return {
    dealType: '',
    propertyType: '',
    location: { city: '', district: '', coordinates: null, showExactAddress: false, address: '' },
    basics: { areaSqm: '', price: '', currency: '' },
    conditionAndAmenities: { condition: '', furnished: null, amenities: [] },
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
    // Quick-task 260527-0cg (Phase 12 address-flow redesign): district dropped as a
    // Step 2 requirement — the district chip row + "Other district" modal were removed
    // from Step2Location.tsx. `district: ''` stays on the FormBag shape for round-trip
    // compatibility with legacy backend data, but the validator no longer flags it.
    if (!values.location.city) errors['location.city'] = 'contextualListing.step2.cityRequired';
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

    // NEW M4 FORM-04 — defensive only; stepper UI clamps prevent these from firing.
    // Catches direct-write code paths (e.g., copy/paste from another listing).
    // FORM-04 lock: undefined is ALWAYS valid — never required on any propertyType.
    if (
      values.basics.bedrooms !== undefined &&
      (!Number.isInteger(values.basics.bedrooms) ||
        values.basics.bedrooms < 0 ||
        values.basics.bedrooms > 10)
    ) {
      errors['basics.bedrooms'] = 'contextualListing.step3.bedroomsInvalid';
    }
    if (
      values.basics.bathroomCount !== undefined &&
      (!Number.isInteger(values.basics.bathroomCount * 2) ||
        values.basics.bathroomCount < 0 ||
        values.basics.bathroomCount > 10)
    ) {
      errors['basics.bathroomCount'] = 'contextualListing.step3.bathroomCountInvalid';
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

    // Quick-task 260526-foc — defensive only; the date picker UI emits ISO-8601
    // 'YYYY-MM-DD' strings, so this check catches direct-write code paths
    // (e.g. copy/paste from another listing). availableDate is OPTIONAL for all
    // dealTypes — empty/undefined means "available now" (rendered by ListingMetaTable).
    // Format check: 4 digits, '-', 2 digits, '-', 2 digits AND parses to a real Date.
    if (values.terms.availableDate !== undefined && values.terms.availableDate !== '') {
      const v = values.terms.availableDate;
      const formatOk = /^\d{4}-\d{2}-\d{2}$/.test(v);
      const d = formatOk ? new Date(v + 'T12:00:00') : null;
      if (!formatOk || !d || isNaN(d.getTime())) {
        errors['terms.availableDate'] = 'contextualListing.step6.availableDateInvalid';
      }
    }
  }

  return { isValid: Object.keys(errors).length === 0, errors };
}

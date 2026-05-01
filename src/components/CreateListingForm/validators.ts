/**
 * validators — Single source of truth for Phase 5 FORM-04/06 validation + payload shaping.
 *
 * validateByCategory(values, category) → { isValid, errors }
 * buildPayloadByCategory(values, category) → Partial<Property>
 *
 * Pure functions. Role-agnostic per D-17: this module does NOT consult any
 * auth / permission context. Role gating for platformVerifications remains
 * the caller's responsibility at the orchestrator submit site.
 *
 * Convention: matches src/utils/propertyCategory.ts shape (named exports, pure
 * fn, no React imports, no side effects, SCREAMING_SNAKE_CASE for module const,
 * string-literal union for typed values).
 *
 * Error values in ValidateResult.errors are translation KEYS (e.g.
 * 'createListing.bedroomsRequired'), not translated strings — sub-components
 * translate at render time. This keeps validators.ts i18n-agnostic in
 * addition to role-agnostic.
 */

import type { FormBag, FormErrorBag } from './types';
import { COMMERCIAL_TYPES, type PropertyCategory } from '../../utils/propertyCategory';
import type { Property } from '../../types/Property';

/**
 * Canonical currency options. Migrated from PriceSection.tsx:25-28.
 * `value` is the storage token persisted in the backend payload; `label`
 * carries the flag emoji for the chip UI.
 */
export const CURRENCY_OPTIONS = [
  { value: '$', label: '🇺🇸 USD' },
  { value: 'сом', label: '🇰🇬 сом' },
] as const;

/** Resolves to `'$' | 'сом'` via `as const` narrowing. D-18. */
export type Currency = (typeof CURRENCY_OPTIONS)[number]['value'];

export interface ValidateResult {
  isValid: boolean;
  errors: FormErrorBag;
}

/**
 * Per-category field order for D-04 scroll-to-first-error. JSX render order
 * matches this top-to-bottom per RESEARCH Open Question #1 resolution.
 */
export const FIELD_ORDER_BY_CATEGORY: Record<PropertyCategory, (keyof FormBag)[]> = {
  Residential: [
    'title',
    'description',
    'address',
    'district',
    'city',
    'bedrooms',
    'bathrooms',
    'areaSqm',
    'currency',
    'price',
    'availableDate',
  ],
  Commercial: [
    'title',
    'description',
    'address',
    'district',
    'city',
    'areaSqm',
    'currency',
    'price',
    'availableDate',
  ],
  Hospitality: [
    'title',
    'description',
    'address',
    'district',
    'city',
    'rooms',
    'maxGuests',
    'bathrooms',
    'amenities',
    'contactPhone',
  ],
};

/**
 * Validate a FormBag against the category's required-field contract (D-07).
 * Returns translation KEYS in `errors.*` — callers translate at render time.
 */
export function validateByCategory(
  values: FormBag,
  category: PropertyCategory,
): ValidateResult {
  const errors: FormErrorBag = {};

  // Shared hard-required (all three categories) per D-07
  if (!values.title.trim()) errors.title = 'createListing.titleRequired';
  if (!values.description.trim()) errors.description = 'createListing.descriptionRequired';
  if (!values.address.trim()) errors.address = 'createListing.addressRequired';
  if (!values.city.trim()) errors.city = 'createListing.cityRequired';
  if (!values.district.trim()) errors.district = 'createListing.districtRequired';

  if (category === 'Residential') {
    if (!values.bedrooms.trim()) errors.bedrooms = 'createListing.bedroomsRequired';
    if (!values.bathrooms.trim()) errors.bathrooms = 'createListing.bathroomsRequired';
    if (!values.areaSqm.trim()) errors.areaSqm = 'createListing.areaRequired';
    if (!values.price.trim()) errors.price = 'createListing.priceRequired';
    if (values.currency === '') errors.currency = 'createListing.currencyRequired';
  } else if (category === 'Commercial') {
    if (!values.areaSqm.trim()) errors.areaSqm = 'createListing.areaRequired';
    if (!values.price.trim()) errors.price = 'createListing.priceRequired';
    if (values.currency === '') errors.currency = 'createListing.currencyRequired';
    // D-07 defensive per Pitfall 5: propertyType must be in COMMERCIAL_TYPES.
    // Cast required because `as const` narrows the tuple to readonly literal
    // types, and .includes() rejects arbitrary strings without widening.
    if (!(COMMERCIAL_TYPES as readonly string[]).includes(values.propertyType)) {
      errors.propertyType = 'createListing.propertyTypeRequired';
    }
  } else {
    // Hospitality
    if (!values.rooms.trim()) errors.rooms = 'createListing.roomsRequired';
    if (!values.bathrooms.trim()) errors.bathrooms = 'createListing.bathroomsRequired';
    if (!values.maxGuests.trim()) errors.maxGuests = 'createListing.maxGuestsRequired';

    // D-22 — at least one amenity required
    if (values.amenities.length < 1) {
      errors.amenities = 'createListing.amenitiesRequired';
    }

    // Hybrid contact rule per D-09/D-10:
    //   If ANY contact is filled, phone + (WA OR TG) is required.
    //   If ALL three are empty, pass through (chat fallback surfaces in Phase 6).
    const phone = values.contactPhone.trim();
    const wa = values.contactWhatsapp.trim();
    const tg = values.contactTelegram.trim();
    const anyFilled = phone !== '' || wa !== '' || tg !== '';
    if (anyFilled) {
      const passes = phone !== '' && (wa !== '' || tg !== '');
      if (!passes) errors.contactPhone = 'createListing.contactMissingInline';
    }
  }

  return { isValid: Object.keys(errors).length === 0, errors };
}

/**
 * Shape the backend submit payload per category (D-06 / D-14).
 *
 * D-09 anchors are preserved INSIDE the shared block unconditionally for
 * every category: the panoramic URL is always present and the tours field
 * is emitted when non-empty (undefined otherwise). See source below.
 *
 * Role gating for platformVerifications stays at the call-site
 * (CreateListingScreen.handleSubmit) — NOT here.
 */
export function buildPayloadByCategory(
  values: FormBag,
  category: PropertyCategory,
): Partial<Property> {
  const shared = {
    title: values.title.trim(),
    description: values.description.trim(),
    type: values.type,
    propertyType: values.propertyType,
    period: values.type === 'rent' ? 'month' : undefined,
    features: values.features,
    videoUrl: values.videoUrl.trim(),
    panoramicPhotosUrl: values.panoramicPhotosUrl.trim(),
    instagramUrl: values.instagramUrl.trim(),
    availableDate: values.availableDate.trim() || undefined,
    // D-01 / D-22: status is NOT sent from owner POST/PUT — schema default ('pending') +
    // Plan 03 sanitizer + Plan 04 service-layer cleanup own the field. Removing here closes
    // the loop on the 3-layer defense.
    tours: values.tours.length > 0 ? values.tours : undefined,
  };

  if (category === 'Residential') {
    return {
      ...shared,
      bedrooms: parseInt(values.bedrooms) || 0,
      bathrooms: parseInt(values.bathrooms) || 0,
      areaSqm: parseFloat(values.areaSqm) || 0,
      price: parseFloat(values.price) || values.price,
      currency: values.currency,
    } as Partial<Property>;
  }
  if (category === 'Commercial') {
    return {
      ...shared,
      areaSqm: parseFloat(values.areaSqm) || 0,
      price: parseFloat(values.price) || values.price,
      currency: values.currency,
      // NO bedrooms, NO bathrooms
    } as Partial<Property>;
  }
  // Hospitality — D-14: NO price, NO currency, NO areaSqm, NO period
  // Phase 6 D-22: amenities INCLUDED (replaces prior "NO amenities" stance)
  return {
    ...shared,
    rooms: parseInt(values.rooms) || 0,
    bathrooms: parseInt(values.bathrooms) || 0,
    maxGuests: parseInt(values.maxGuests) || 0,
    amenities: values.amenities,
  } as Partial<Property>;
}

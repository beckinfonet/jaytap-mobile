// Phase 2 — pure adapters (D-12). Round-trip safe.
// No React imports. No side effects.
// Per Phase 1 D-04..D-15: nested-shape mapping policy. Phase 1 already canonicalized
// (e.g. 'rent' → 'rent_long' at migration), so propertyToFormBag does NO rev-mapping.
//
// Per CONTEXT 02-RESEARCH §Open Q #5: missing nested fields → default-to-empty (no throw).

import type { Property } from '../../types/Property';
import type { FormBag } from './types';
import { emptyFormBag } from './validators';
import { getAmenitiesForPropertyType } from '../../utils/amenities';
import type { Amenity } from '../../utils/amenities';

export function propertyToFormBag(p: Property | undefined): FormBag {
  const base = emptyFormBag();
  if (!p) return base;

  return {
    dealType: (p.dealType ?? '') as FormBag['dealType'],
    propertyType: (p.propertyType ?? '') as FormBag['propertyType'],
    location: {
      city: p.location?.city ?? '',
      district: p.location?.district ?? '',
      coordinates: p.location?.coordinates
        ? { lat: p.location.coordinates.lat, lng: p.location.coordinates.lng }
        : null,
      showExactAddress: p.location?.showExactAddress ?? false,
    },
    basics: {
      areaSqm: p.basics?.areaSqm != null ? String(p.basics.areaSqm) : '',
      price: p.basics?.price != null ? String(p.basics.price) : '',
      currency: (p.basics?.currency ?? '') as FormBag['basics']['currency'],
      rooms: p.basics?.rooms as FormBag['basics']['rooms'],
      bathroom: p.basics?.bathroom as FormBag['basics']['bathroom'],
      kitchen: p.basics?.kitchen as FormBag['basics']['kitchen'],
      hotelRooms: p.basics?.hotelRooms as FormBag['basics']['hotelRooms'],
      hotelClass: p.basics?.hotelClass as FormBag['basics']['hotelClass'],
      bedrooms: p.basics?.bedrooms, // number | undefined — Phase 6 SCHEMA-03
      bathroomCount: p.basics?.bathroomCount, // number | undefined — Phase 6 SCHEMA-03
    },
    conditionAndAmenities: {
      condition: (p.conditionAndAmenities?.condition ?? '') as FormBag['conditionAndAmenities']['condition'],
      furnished: p.conditionAndAmenities?.furnished ?? null,
      // v4.0.1 — intersect persisted amenities with the type-valid set so the
      // form only surfaces toggles the user can act on. Out-of-set tokens
      // (e.g. 'breakfast' on a re-typed hostel→apartment listing) are dropped.
      amenities: (() => {
        const valid = new Set<Amenity>(getAmenitiesForPropertyType(p.propertyType) as readonly Amenity[]);
        return (p.amenities ?? []).filter((a) => valid.has(a as Amenity)) as Amenity[];
      })(),
    },
    content: {
      title: p.content?.title ?? '',
      description: p.content?.description ?? '',
      language: (p.content?.language ?? 'ru') as 'ru' | 'en',
    },
    terms: {
      negotiable: p.terms?.negotiable,
      deposit: p.terms?.deposit
        ? {
            amount: String(p.terms.deposit.amount ?? ''),
            currency: p.terms.deposit.currency as NonNullable<FormBag['terms']['deposit']>['currency'],
          }
        : undefined,
      prepaymentMonths: p.terms?.prepaymentMonths,
      minTerm: p.terms?.minTerm as FormBag['terms']['minTerm'],
      // Quick-task 260526-foc — Property.availableDate is TOP-LEVEL on the M3 schema
      // (see src/types/Property.ts line 32). FormBag groups it under terms.* purely as
      // a form-time UX adjacency to deposit + minTerm. Adapter bridges the two shapes.
      availableDate: p.availableDate,
    },
  };
}

/**
 * Output: SPEC §"Suggested Data Shape" payload.
 * Strips: id, status (server defaults to 'pending' per M2 D-22 sanitizer),
 *         media (Phase 3 owns), client-side empty fields.
 * Coerces numeric strings → numbers.
 */
export function formBagToPropertyPayload(v: FormBag): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    dealType: v.dealType,
    propertyType: v.propertyType,
    location: {
      city: v.location.city,
      district: v.location.district,
      coordinates: v.location.coordinates ?? undefined,
      showExactAddress: v.location.showExactAddress,
    },
    basics: {
      areaSqm: v.basics.areaSqm ? parseFloat(v.basics.areaSqm) : undefined,
      price: v.basics.price ? parseFloat(v.basics.price) : undefined,
      currency: v.basics.currency || undefined,
      rooms: v.basics.rooms,
      bathroom: v.basics.bathroom,
      kitchen: v.basics.kitchen,
      hotelRooms: v.basics.hotelRooms,
      hotelClass: v.basics.hotelClass,
      bedrooms: v.basics.bedrooms, // verbatim passthrough — undefined survives (D-08 + FORM-05)
      bathroomCount: v.basics.bathroomCount, // verbatim passthrough — undefined survives (D-08 + FORM-05)
    },
    conditionAndAmenities: {
      condition: v.conditionAndAmenities.condition,
      furnished: v.conditionAndAmenities.furnished ?? undefined,
    },
    // v4.0.1 — amenities persist at top level (matches M2 schema); FormBag groups
    // them under conditionAndAmenities purely as a form-time UX adjacency to condition + furnished.
    amenities: v.conditionAndAmenities.amenities,
    // Quick-task 260526-foc — availableDate persists at TOP LEVEL (matches existing
    // Property schema); FormBag groups it under terms.* purely as a form-time UX
    // adjacency to deposit + minTerm. undefined survives — listings with no specified
    // date render "Available now" downstream (ListingMetaTable).
    availableDate: v.terms.availableDate,
    content: {
      title: v.content.title.trim(),
      description: v.content.description.trim(),
      language: v.content.language,
    },
    terms: {
      negotiable: v.terms.negotiable,
      deposit:
        v.terms.deposit && v.terms.deposit.amount
          ? { amount: parseFloat(v.terms.deposit.amount), currency: v.terms.deposit.currency }
          : undefined,
      prepaymentMonths: v.terms.prepaymentMonths,
      minTerm: v.terms.minTerm,
    },
  };

  // Strip undefined leaves for clean payload (server validates required fields)
  // Top-level subtrees stay even if all their fields are undefined — backend validates per shape.
  return payload;
}

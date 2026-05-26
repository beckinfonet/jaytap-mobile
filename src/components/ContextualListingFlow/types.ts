// Phase 2 — `<ContextualListingFlow>` types (D-12 + D-15).
// FormBag shape per 02-RESEARCH.md §"FormBag Shape (Recommended)" lines 590-650.
// Mirrors M1 P4 SectionProps (`src/components/CreateListingForm/types.ts:68-72`) — same `{values, onChange, errors}` contract.
// FormErrorBag uses dotted-path string keys ('location.city', 'basics.areaSqm') because FormBag is nested.

import type { Property } from '../../types/Property';
import type { Amenity } from '../../utils/amenities';

export interface FormBag {
  // === Step 1 (REQUIRED to advance from Step 1) ===
  dealType: 'sale' | 'rent_long' | 'rent_daily' | '';
  propertyType: 'apartment' | 'house' | 'office' | 'commercial' | 'hotel' | 'hostel' | '';

  // === Step 2 (REQUIRED to advance from Step 2) ===
  location: {
    city: string; // city slug
    district: string; // district slug
    coordinates: { lat: number; lng: number } | null;
    showExactAddress: boolean; // forced true if propertyType ∈ {hotel, hostel} per D-07
  };

  // === Step 3 (REQUIRED area + price + currency; conditional sub-fields) ===
  basics: {
    areaSqm: string; // string at form-time, parsed at submit
    price: string;
    currency: 'KGS' | 'USD' | 'EUR' | '';
    rooms?: '1' | '2' | '3' | '4+';
    bathroom?: 'private' | 'none' | 'shared';
    kitchen?: 'private' | 'none' | 'shared';
    hotelRooms?: '1' | '2' | '3' | '4+';
    hotelClass?: 'economy' | 'standard' | 'comfort' | 'premium';
    bedrooms?: number; // M4 FORM-02 — integer 0–10; apartment/house only (D-07)
    bathroomCount?: number; // M4 FORM-02 — 0.5-step 0–10; apartment/house/hotel/hostel/office/commercial (D-07)
  };

  // === Step 4 ===
  conditionAndAmenities: {
    condition: 'rough' | 'whitebox' | 'good' | 'euro' | '';
    furnished: boolean | null; // tri-state (null = unset)
    amenities: Amenity[]; // v4.0.1 — optional multi-select; default [].
  };

  // === Step 5 ===
  content: {
    title: string;
    description: string;
    language: 'ru' | 'en'; // defaults from useLanguage().lang
  };

  // === Step 6 (gated by dealType) ===
  terms: {
    negotiable?: boolean;
    deposit?: { amount: string; currency: 'KGS' | 'USD' | 'EUR' };
    prepaymentMonths?: number; // 0 | 1 | 2 | custom-int
    minTerm?: '1_day' | '1_month' | '3_months';
  };
}

// Dotted-path keys (e.g. 'location.city', 'basics.rooms') — FormBag is nested,
// so flat `keyof FormBag` from M1 won't work. Validation errors use these strings.
export type FormErrorBag = Partial<Record<string, string>>;

// SectionProps contract — verbatim shape match with M1 P4 (only field types differ).
// For nested writes: callers pass the full sub-tree, e.g. onChange('location', { ...values.location, city: newCity }).
export interface SectionProps {
  values: FormBag;
  onChange: <K extends keyof FormBag>(field: K, value: FormBag[K]) => void;
  errors: FormErrorBag;
}

// === D-15 discriminated-union props for `<ContextualListingFlow>` ===
export type ContextualListingFlowProps =
  | {
      mode: 'create';
      initialListing?: undefined;
      moderatorContext?: undefined;
      onClose: () => void;
      onSuccess?: (createdListingId: string) => void;
    }
  | {
      mode: 'edit-owner';
      initialListing: Property;
      moderatorContext?: undefined;
      onClose: () => void;
      onSuccess?: (updatedListingId: string) => void;
    }
  | {
      mode: 'edit-mod';
      initialListing: Property;
      moderatorContext: { editingOwnerUid: string; reason?: string; ownerEmail?: string; ownerName?: string };
      onClose: () => void;
      onSuccess?: (updatedListingId: string) => void;
    };

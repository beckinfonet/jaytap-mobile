/**
 * CreateListingForm — shared types.
 *
 * Phase 4 (FORM-05): establishes the SectionProps contract every sub-component
 * accepts. FormBag is the single-source orchestrator state shape; Phase 5 will
 * fill FormErrorBag via validateByCategory. Category is DERIVED (never stored)
 * via propertyTypeToCategory(values.propertyType) per RESEARCH §"Backend
 * Payload Confirmation" + §Anti-Patterns.
 *
 * Convention: matches src/types/Appointment.ts multi-interface module pattern
 * (named exports, no default; all related interfaces in one file).
 */

export interface FormBag {
  // Always-present (shared across categories)
  title: string;
  description: string;
  address: string;
  city: string;
  district: string;
  type: 'rent' | 'sale';
  propertyType: string; // intentionally `string` not PropertyType — brownfield tolerance
  status: 'draft' | 'live';
  features: string[];
  featureInput: string;
  selectedImages: any[];
  availableDate: string;

  // Residential / Commercial
  bedrooms: string;
  bathrooms: string;
  areaSqm: string;
  price: string;
  currency: string;

  // Hospitality (seeded empty in Phase 4; Plan 04-04 HospitalitySection renders the inputs)
  rooms: string;
  maxGuests: string;
  amenities: string[];

  // Media (always; gating happens inside MediaSection wrap scopes in Plan 04-05)
  tours: Array<{ id: string; title: string; url: string }>;
  tourTitle: string;
  tourUrl: string;
  videoUrl: string;
  panoramicPhotosUrl: string;
  instagramUrl: string;

  // Contact (auto-filled read-only)
  contactEmail: string;
  contactPhone: string;
  contactWhatsapp: string;
  contactTelegram: string;

  // Admin-only verification flags
  verifyOwnership: boolean;
  verifyOwnerId: boolean;
  verifyStateDocs: boolean;
}

export type FormErrorBag = Partial<Record<keyof FormBag, string>>;

export interface SectionProps {
  values: FormBag;
  onChange: <K extends keyof FormBag>(field: K, value: FormBag[K]) => void;
  errors: FormErrorBag; // Phase 4: always passed as {} — Phase 5 fills
}

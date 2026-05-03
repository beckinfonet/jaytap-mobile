import type { HospitalityAmenity } from '../utils/hospitalityAmenities';

export interface Tour {
  id: string;
  title: string;
  url: string;
  thumbnailUrl?: string;
}

/** Platform (MoveIn) trust signals — writable only by admin in API */
export interface PlatformVerifications {
  ownershipDocuments?: boolean;
  ownerIdentityVerified?: boolean;
  stateIssuedDocumentsVerified?: boolean;
}

export interface Property {
  id: string;
  listingId?: string; // 6-digit listing ID in format "123-456"
  title: string;
  price: number | string;
  currency: string;
  period?: string; // e.g., 'month' for rent
  address: string;
  city?: string; // Added city
  latitude?: number; // Property coordinates for map display
  longitude?: number; // Property coordinates for map display
  description: string;
  specs: {
    beds: number;
    baths: number;
    sqft: number;
  };
  features: string[];
  imageUrl: string;
  images?: string[]; // Optional, if we want to show carousel
  videoUrl?: string; // Added videoUrl
  agent?: {
    name: string;
    rating: number;
    reviews: number;
    imageUrl?: string;
  };
  is3DTourAvailable: boolean;
  tours: Tour[]; // Changed from singular matterportUrl to array of Tours
  type: 'rent' | 'sale';
  propertyType?: string; // Added propertyType (apartment, house, office, etc.)
  matterportUrl?: string; // Kept for backward compatibility if needed, but prefer tours[]
  instagramUrl?: string; // Instagram URL for renter contact
  panoramicPhotosUrl?: string; // Ricoh 360 panoramic photos URL (one URL holds all photos)
  owner?: {
    uid?: string;
    email?: string;
    phone?: string;
    whatsapp?: string;
    telegram?: string;
    firstName?: string;
    lastName?: string;
  };
  /** ISO date string - when the property becomes available (for rent). If within 1 month, shows "now" */
  availableDate?: string;
  platformVerifications?: PlatformVerifications;
  verificationUpdatedAt?: string;
  verificationUpdatedByUid?: string;
  /** Listing publication state. 4-state moderation lifecycle (M2):
   *   pending  — submitted, awaiting moderator review (default for new submissions)
   *   live     — approved and publicly browsable
   *   rejected — moderator rejected with a reasonCode/reasonNote (owner sees rejection banner)
   *   archived — soft-deleted (hidden from browse). Phase 4 reintroduces archive actions.
   * `status?:` (optional) is preserved during the cutover window — defensive `?? 'live'` coalesce
   * (D-07) at every read site absorbs any legacy null until backend migration completes.
   */
  status?: 'pending' | 'live' | 'rejected' | 'archived';
  // D-21: audit fields. Phase 2 only reads submittedAt + rejectionReasonCode + rejectionReasonNote.
  // approvedAt / rejectedAt / archivedAt + *ByUid are Phase 3/4 reads — adding them now would
  // tempt premature client surface area.
  submittedAt?: string;
  rejectionReasonCode?: string | null;
  rejectionReasonNote?: string | null;
  // Phase 4 D-20 — archive audit fields (mirrors backend Property.js schema additions in Plan 01).
  // Optional (?:) per Phase 2 D-07 belt-and-suspenders posture; legacy listings without these read undefined.
  // archivedByUid is the type prerequisite for Plan 07's canSelfRestore helper (PATTERNS §11).
  archivedAt?: string;
  archivedByUid?: string | null;
  archivedReasonCode?: string | null;
  archivedReasonNote?: string | null;
  // Phase 6 (HOSP-05 / D-20 / Gap 9.1) — Hospitality top-level fields (NOT inside specs)
  rooms?: number;
  maxGuests?: number;
  amenities?: HospitalityAmenity[];
}

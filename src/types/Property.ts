// src/types/Property.ts — Phase 1 type-stub update
// Per D-01 atomic-break, the M2 client breaks against the new backend until Phase 2.
// This file ships the canonical NESTED shape so Phase 2 PR drafts compile against it.
//
// Recommendation (Claude's Discretion #3 — researcher RECOMMENDED): ship the full nested
// type, NOT a LegacyFlat | NestedShape union. Rationale: a union forces every consumer
// to discriminate between the two shapes, but the M2 client is already broken per D-01 —
// the union just preserves a half-broken state with extra type-narrowing burden.
// The full nested type is the simpler shape that Phase 2 can consume directly.

import type { Amenity } from '../utils/amenities';

/** Platform (MoveIn) trust signals — writable only by admin via PATCH /api/properties/:id/verifications.
 * D-10 keep set — preserved verbatim from M2 (consumed by `<Gated>` admin checks across mod queue + details view).
 */
export interface PlatformVerifications {
  ownershipDocuments?: boolean;
  ownerIdentityVerified?: boolean;
  stateIssuedDocumentsVerified?: boolean;
}

export interface Property {
  // === Core identity ===
  id: string;
  listingId?: string;

  // === Top-level (preserved per D-09/D-10) ===
  dealType?: 'sale' | 'rent_long' | 'rent_daily';
  propertyType?: 'apartment' | 'house' | 'office' | 'commercial' | 'hotel' | 'hostel';
  ownerUid?: string;
  instagramUrl?: string;
  availableDate?: string;
  features?: string[];
  maxGuests?: number;                 // D-09 hospitality preserve
  amenities?: Amenity[];   // D-09 hospitality preserve; v4.0.1 broadened to Amenity (residential + commercial + hospitality)

  // === Nested location (SPEC §"Step 2 — Location") ===
  location?: {
    city?: string;
    district?: string;
    coordinates?: { lat: number; lng: number };
    showExactAddress?: boolean;
    address?: string; // Phase 11 GEO-03 — Nominatim displayName persisted as free-form string. Optional; backend default ''.
  };

  // === Nested basics (SPEC §"Step 3 — Basic Information") ===
  basics?: {
    areaSqm?: number;
    price?: number;
    currency?: 'KGS' | 'USD' | 'EUR';
    rooms?: '1' | '2' | '3' | '4+';
    bathroom?: 'private' | 'none' | 'shared';
    kitchen?: 'private' | 'none' | 'shared';
    hotelRooms?: '1' | '2' | '3' | '4+';
    hotelClass?: 'economy' | 'standard' | 'comfort' | 'premium';
    bedrooms?: number; // M4 SCHEMA-03 — residential-only (apartment/house); validated by backend Mongoose 0–10 integer + Plan 02 body-strip on hotel/hostel/office/commercial.
    bathroomCount?: number; // M4 SCHEMA-03 — applies to all 6 propertyTypes; validated by backend Mongoose 0–10 step-0.5 + Plan 02 route-layer 400.
  };

  // === Nested conditionAndAmenities (SPEC §"Step 4") ===
  conditionAndAmenities?: {
    condition?: 'rough' | 'whitebox' | 'good' | 'euro';
    furnished?: boolean;
  };

  // === Nested content (SPEC §"Step 5") ===
  content?: {
    title?: string;
    description?: string;
    language?: 'ru' | 'en';
  };

  // === Nested terms (SPEC §"Step 6") ===
  terms?: {
    negotiable?: boolean;
    deposit?: { amount: number; currency: 'KGS' | 'USD' | 'EUR' };
    prepaymentMonths?: number;
    minTerm?: '1_day' | '1_month' | '3_months';
  };

  // === Nested media (Phase 3 inversion target) ===
  media?: {
    photos: string[];
    videos: string[];
    tourUrl?: string;
  };

  // === Top-level admin trust signals (D-10 keep) ===
  platformVerifications?: PlatformVerifications;
  verificationUpdatedAt?: string;
  verificationUpdatedByUid?: string;

  // === M2 status enum + audit fields — VERBATIM PRESERVED at top level (SCHEMA-03/04) ===
  // Audit fields stay TOP LEVEL — never under terms.* (Pitfall 4 / SCHEMA-04 client-side enforcement).
  // The 11-field set: submittedAt + approvedAt/byUid + rejectedAt/byUid/ReasonCode/Note + archivedAt/byUid/ReasonCode/Note.
  // Phase 2 PR drafts read submittedAt + rejectionReasonCode + rejectionReasonNote at minimum.
  status?: 'pending' | 'live' | 'rejected' | 'archived';
  submittedAt?: string;
  approvedAt?: string;
  approvedByUid?: string | null;
  rejectedAt?: string;
  rejectedByUid?: string | null;
  rejectionReasonCode?: string | null;
  rejectionReasonNote?: string | null;
  archivedAt?: string;
  archivedByUid?: string | null;
  archivedReasonCode?: string | null;
  archivedReasonNote?: string | null;

  // === Owner enrichment (populated server-side at GET /:id; preserved verbatim from M2) ===
  owner?: {
    uid?: string;
    email?: string;
    phone?: string;
    whatsapp?: string;
    telegram?: string;
    firstName?: string;
    lastName?: string;
  };

  // === Schema version marker (Claude's Discretion #5 — RECOMMENDED) ===
  schemaVersion?: 'm3-nested-v1';
}

// === DELETED in Phase 1 ===
// `Tour` interface — replaced by string `media.tourUrl` per D-12.
// Other helpers (specs, etc.) — Phase 2 client doesn't need them; per-screen TypeScript
// errors elsewhere in the project are EXPECTED (D-01 atomic break) and will be resolved
// in Phase 2's screen-rewrite plans.

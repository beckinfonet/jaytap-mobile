/**
 * Phase 2 — client service for Plan 02-01's backend Location endpoints.
 *
 * Exposes 4 user-facing functions (fetchCities / fetchDistricts / createCity /
 * createDistrict) consumed by Step2Location, plus 3 mod-only functions
 * (fetchLocationsQueue / approveLocation / rejectLocation) consumed by
 * ModerationQueueScreen's new Locations tab.
 *
 * Anti-spoofing (HF-03 discipline preserved by inaction): NO `createdByUid`
 * in any request body — backend sources from JWKS-verified token (req.firebaseUid).
 *
 * apiClient import: this project uses the named export `{ apiClient }` from
 * `./apiClient` (verified via PropertyService.ts pattern).
 */

import { apiClient } from './apiClient';

export interface City {
  _id: string;
  slug: string;
  label: { ru: string; en: string };
  country: 'KG' | 'KZ' | 'UZ';
  centroid: { lat: number; lng: number };
  status: 'approved' | 'pending' | 'rejected';
  createdByUid: string;
}

export interface District {
  _id: string;
  cityId: string;
  slug: string;
  label: { ru: string; en: string };
  status: 'approved' | 'pending' | 'rejected';
  createdByUid: string;
}

/** GET /api/locations/cities — anon-accessible per Plan 02-01 (returns approved + caller's pending). */
export async function fetchCities(): Promise<City[]> {
  const r = await apiClient.get<{ cities: City[] }>('/locations/cities');
  return r.data.cities;
}

/** GET /api/locations/cities/:slug/districts — same scoping rule as cities. */
export async function fetchDistricts(citySlug: string): Promise<District[]> {
  const r = await apiClient.get<{ districts: District[] }>(
    `/locations/cities/${encodeURIComponent(citySlug)}/districts`,
  );
  return r.data.districts;
}

/**
 * POST /api/locations/cities — auth + landlord-capable required (Plan 02-01).
 * Returns the city + a status hint (201 created / 200 existing-approved / 409 pending-duplicate).
 * Per Tradeoff §F: client supplies centroid (drop-pin-first UX). Per CONTEXT D-07: callers
 * should advance UI optimistically — the city slug is usable for THIS listing immediately.
 */
export async function createCity(input: {
  label: { ru: string; en: string };
  country: 'KG' | 'KZ' | 'UZ';
  centroid: { lat: number; lng: number };
}): Promise<{ city: City; status: 201 | 200 | 409 }> {
  try {
    const r = await apiClient.post<{ city: City }>('/locations/cities', input);
    return { city: r.data.city, status: r.status as 201 | 200 };
  } catch (e: unknown) {
    const err = e as { response?: { status: number; data: { code?: string; city?: City } } };
    if (err.response?.status === 409 && err.response.data?.city) {
      return { city: err.response.data.city, status: 409 };
    }
    throw e;
  }
}

/** POST /api/locations/cities/:slug/districts — same auth + capability gate as cities. */
export async function createDistrict(
  citySlug: string,
  input: { label: { ru: string; en: string } },
): Promise<{ district: District; status: 201 | 200 | 409 }> {
  try {
    const r = await apiClient.post<{ district: District }>(
      `/locations/cities/${encodeURIComponent(citySlug)}/districts`,
      input,
    );
    return { district: r.data.district, status: r.status as 201 | 200 };
  } catch (e: unknown) {
    const err = e as {
      response?: { status: number; data: { code?: string; district?: District } };
    };
    if (err.response?.status === 409 && err.response.data?.district) {
      return { district: err.response.data.district, status: 409 };
    }
    throw e;
  }
}

// ===== Mod-only (consumed by ModerationQueueScreen's Locations tab) =====

/**
 * Districts in the mod queue come back with `cityId` populated (per Plan 02-01
 * `populate('cityId', 'slug label')`) so the mod UI can render parent city refs.
 * Falls back to a bare ObjectId string if the populate didn't run.
 */
export type DistrictWithCity = District & {
  cityId: { _id: string; slug: string; label: { ru: string; en: string } } | string;
};

export async function fetchLocationsQueue(): Promise<{
  cities: City[];
  districts: DistrictWithCity[];
}> {
  const r = await apiClient.get<{ cities: City[]; districts: DistrictWithCity[] }>(
    '/moderation/locations/queue',
  );
  return r.data;
}

export async function approveLocation(kind: 'city' | 'district', id: string): Promise<void> {
  await apiClient.post(
    `/moderation/locations/${kind}/${encodeURIComponent(id)}/approve`,
  );
}

export async function rejectLocation(
  kind: 'city' | 'district',
  id: string,
  reasonNote?: string,
): Promise<void> {
  await apiClient.post(
    `/moderation/locations/${kind}/${encodeURIComponent(id)}/reject`,
    reasonNote ? { reasonNote } : {},
  );
}

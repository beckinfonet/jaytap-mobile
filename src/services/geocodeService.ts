/**
 * Phase 11 GEO-01 + GEO-02 — client wrappers for the backend `/locations/geocode`
 * + `/locations/reverse-geocode` routes added in Plan 11-02.
 *
 * Null-on-failure contract: BOTH functions return `null` instead of throwing.
 * Caller is debounced UI code (Step2Location.tsx address TextInput) that should
 * swallow per-keystroke failures silently — throwing pollutes RN logs on every
 * miskey. This differs from locationService.ts where most reads throw on non-2xx.
 *
 * Anti-"random pin" defense layer 3: caller is responsible for NOT moving the
 * map pin on null returns. See `Step2Location.tsx` scheduleGeocode for the
 * preservation logic (typed text kept, pin static, inline error label shown).
 *
 * Backend timeout: Plan 11-02 routes use a 5s AbortController; apiClient timeout
 * is 15s — backend always fires first. No client-side AbortController needed
 * (deferred unless QA surfaces a real cancellation need).
 */

import { apiClient } from './apiClient';

export interface GeocodeResult {
  lat: number;
  lng: number;
  displayName: string;
}

export interface ReverseGeocodeResult {
  displayName: string;
}

export interface GeocodeOptions {
  address: string;
  citySlug?: string;
  lang?: 'en' | 'ru';
}

export interface ReverseGeocodeOptions {
  lat: number;
  lng: number;
  lang?: 'en' | 'ru';
}

/**
 * Forward geocode an address string to lat/lng + canonical displayName.
 * Returns null on any non-2xx (400 ADDRESS_REQUIRED, 404 NOT_FOUND, 5xx,
 * network timeout). Caller MUST treat null as "preserve user text, do NOT
 * move pin" (anti-"random pin" defense; see Plan 11-CONTEXT.md decision 9).
 */
export async function geocodeAddress(opts: GeocodeOptions): Promise<GeocodeResult | null> {
  try {
    const r = await apiClient.post<GeocodeResult>('/locations/geocode', {
      address: opts.address,
      citySlug: opts.citySlug,
      lang: opts.lang ?? 'en',
    });
    if (
      r.status !== 200 ||
      !r.data ||
      typeof r.data.lat !== 'number' ||
      typeof r.data.lng !== 'number'
    ) {
      return null;
    }
    return { lat: r.data.lat, lng: r.data.lng, displayName: r.data.displayName ?? '' };
  } catch (err: any) {
    // Swallow per the null-on-failure contract. Log status / message only —
    // never the user-typed address (T-11-19: no PII in logs).
    console.warn('geocodeAddress failed:', err?.response?.status ?? err?.message ?? 'unknown');
    return null;
  }
}

/**
 * Reverse geocode lat/lng to a canonical address displayName.
 * Returns null on any non-2xx. Caller MUST guard against overwriting
 * user-typed address text — the address fill is opportunistic
 * (Step2Location handleMapPress / handleMarkerDragEnd handlers).
 */
export async function reverseGeocode(
  opts: ReverseGeocodeOptions,
): Promise<ReverseGeocodeResult | null> {
  try {
    const r = await apiClient.post<ReverseGeocodeResult>('/locations/reverse-geocode', {
      lat: opts.lat,
      lng: opts.lng,
      lang: opts.lang ?? 'en',
    });
    if (r.status !== 200 || !r.data || typeof r.data.displayName !== 'string') {
      return null;
    }
    return { displayName: r.data.displayName };
  } catch (err: any) {
    console.warn('reverseGeocode failed:', err?.response?.status ?? err?.message ?? 'unknown');
    return null;
  }
}

/**
 * Maps a city name (EN or RU spelling) to its ISO 3166-1 alpha-2 country code.
 * Scope: KG / KZ / UZ capitals + major secondary cities — JayTap's launch markets
 * per `.planning/PROJECT.md`. Unknown cities return undefined; callers should
 * fall back to showing the city alone.
 *
 * This is a temporary lookup until `Property.location.country` is added to the
 * schema (deferred to a future milestone per the 2026-05-26 design spec § 9).
 */

export type CountryCode = 'KG' | 'KZ' | 'UZ';

const CITY_TO_COUNTRY: Record<string, CountryCode> = {
  // KG
  Bishkek: 'KG',
  Бишкек: 'KG',
  Osh: 'KG',
  Ош: 'KG',
  // KZ
  Almaty: 'KZ',
  Алматы: 'KZ',
  Astana: 'KZ',
  Астана: 'KZ',
  Shymkent: 'KZ',
  Шымкент: 'KZ',
  // UZ
  Tashkent: 'UZ',
  Ташкент: 'UZ',
  Samarkand: 'UZ',
  Самарканд: 'UZ',
};

export function cityToCountry(city?: string): CountryCode | undefined {
  if (!city) return undefined;
  return CITY_TO_COUNTRY[city.trim()];
}

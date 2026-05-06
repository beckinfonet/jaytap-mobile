import { Property } from '../types/Property';

/**
 * Formats a property price with currency:
 * - USD (and default): "$1,399" (symbol prefix, no space) + monthly suffix when applicable
 * - Other currencies: "1,399 сом" (amount first, then currency) + suffix
 *
 * Phase 2 D-20 read-path cutover: reads nested `basics.price` + `basics.currency`
 * (per Phase 1 D-04..D-15) with backward-compatible fallback to legacy flat
 * `price`/`currency` fields so legacy listings missing nested fields still render.
 *
 * Monthly suffix is appended when `dealType === 'rent_long'` (M3 nested) — daily
 * rent + sale do NOT carry the per-month suffix. M2 legacy `period === 'month'`
 * flat field also still triggers the suffix as a backward-compat path.
 */
export function formatPrice(p: Property, monthlySuffix: string = '/mo'): string {
  const rawPrice = p.basics?.price ?? (p as any).price;
  const numPrice =
    typeof rawPrice === 'number'
      ? rawPrice
      : parseFloat(String(rawPrice ?? '').replace(/,/g, '')) || 0;
  const formattedNumber = Number.isFinite(numPrice) ? numPrice.toLocaleString() : String(rawPrice ?? '');
  const rawCurrency = p.basics?.currency ?? (p as any).currency;
  const currency = (rawCurrency ?? '').toString().trim().toLowerCase();

  let priceDisplay: string;
  if (currency === '$' || currency === 'usd' || currency === '') {
    priceDisplay = `$${formattedNumber}`;
  } else if (currency === 'сом' || currency === 'som' || currency === 'kgs') {
    priceDisplay = `${formattedNumber} сом`;
  } else if (currency === 'eur' || currency === '€') {
    priceDisplay = `€${formattedNumber}`;
  } else {
    priceDisplay = `${formattedNumber} ${(rawCurrency ?? '').toString().trim()}`;
  }
  // M3 nested dealType OR M2 legacy flat period — both gate the per-month suffix.
  const isRentLong = p.dealType === 'rent_long' || (p as any).period === 'month';
  if (isRentLong && !priceDisplay.includes('/') && !priceDisplay.includes('мес')) {
    priceDisplay += monthlySuffix;
  }
  return priceDisplay;
}

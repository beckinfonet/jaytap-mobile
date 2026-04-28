import { Property } from '../types/Property';

/**
 * Formats a property price with currency:
 * - USD (and default): "$1,399" (symbol prefix, no space) + monthly suffix when applicable
 * - Other currencies: "1,399 сом" (amount first, then currency) + suffix
 */
export function formatPrice(p: Property, monthlySuffix: string = '/mo'): string {
  const numPrice = typeof p.price === 'number' ? p.price : parseFloat(String(p.price).replace(/,/g, '')) || 0;
  const formattedNumber = Number.isFinite(numPrice) ? numPrice.toLocaleString() : String(p.price);
  const currency = (p.currency || '').trim().toLowerCase();

  let priceDisplay: string;
  if (currency === '$' || currency === 'usd' || currency === '') {
    priceDisplay = `$${formattedNumber}`;
  } else if (currency === 'сом' || currency === 'som' || currency === 'kgs') {
    priceDisplay = `${formattedNumber} сом`;
  } else {
    priceDisplay = `${formattedNumber} ${(p.currency || '').trim()}`;
  }
  if (p.period === 'month' && !priceDisplay.includes('/') && !priceDisplay.includes('мес')) {
    priceDisplay += monthlySuffix;
  }
  return priceDisplay;
}

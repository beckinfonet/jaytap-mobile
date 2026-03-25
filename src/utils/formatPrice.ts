import { Property } from '../types/Property';

/**
 * Formats a property price with currency:
 * - USD (and default): "$USD 1,399" + monthly suffix when applicable
 * - Other currencies: "1,399 сом" (amount first, then currency) + suffix
 */
export function formatPrice(p: Property, monthlySuffix: string = '/mo'): string {
  const numPrice = typeof p.price === 'number' ? p.price : parseFloat(String(p.price).replace(/,/g, '')) || 0;
  const formattedNumber = Number.isFinite(numPrice) ? numPrice.toLocaleString() : String(p.price);
  const currency = (p.currency || '').trim().toLowerCase();

  const isUsd = currency === '$' || currency === 'usd' || currency === '';

  let currencyLabel: string;
  if (currency === '$' || currency === 'usd') {
    currencyLabel = '$USD';
  } else if (currency === 'сом' || currency === 'som' || currency === 'kgs') {
    currencyLabel = 'сом';
  } else if (currency) {
    currencyLabel = (p.currency || '').trim();
  } else {
    currencyLabel = '$USD';
  }

  let priceDisplay = isUsd
    ? `${currencyLabel} ${formattedNumber}`
    : `${formattedNumber} ${currencyLabel}`;
  if (p.period === 'month' && !priceDisplay.includes('/') && !priceDisplay.includes('мес')) {
    priceDisplay += monthlySuffix;
  }
  return priceDisplay;
}

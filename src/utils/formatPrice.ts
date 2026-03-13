import { Property } from '../types/Property';

/**
 * Formats a property price with currency symbol and code in the style:
 * - USD: "$USD1,399/mo"
 * - Kyrgyz som: "сом1,399/mo"
 */
export function formatPrice(p: Property, monthlySuffix: string = '/mo'): string {
  const numPrice = typeof p.price === 'number' ? p.price : parseFloat(String(p.price).replace(/,/g, '')) || 0;
  const formattedNumber = Number.isFinite(numPrice) ? numPrice.toLocaleString() : String(p.price);
  const currency = (p.currency || '').trim().toLowerCase();

  let prefix: string;
  if (currency === '$' || currency === 'usd') {
    prefix = '$USD';
  } else if (currency === 'сом' || currency === 'som' || currency === 'kgs') {
    prefix = 'сом';
  } else if (currency) {
    prefix = p.currency;
  } else {
    prefix = '$USD';
  }

  let priceDisplay = `${prefix} ${formattedNumber}`;
  if (p.period === 'month' && !priceDisplay.includes('/') && !priceDisplay.includes('мес')) {
    priceDisplay += monthlySuffix;
  }
  return priceDisplay;
}

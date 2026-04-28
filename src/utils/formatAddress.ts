/**
 * Splits a freeform comma-separated property address into two display rows:
 *   line1 — street (and number when present)
 *   line2 — district / city / region / country (joined ", ")
 *
 * Heuristic: if the second comma-separated segment starts with a digit
 * (e.g., "27"), it's treated as a street number and joined onto line1.
 * Otherwise line1 is just the first segment and everything else falls to line2.
 *
 * Russian-only abbreviation: a leading "Улица " / "улица " collapses to "Ул. " /
 * "ул. " — the only abbreviation applied today. The English "Street" → "St."
 * counterpart is intentionally left out pending a wider sweep.
 *
 * Examples:
 *   "Улица Касыма Тыныстанова, 27, Bishkek"
 *     -> { line1: "Ул. Касыма Тыныстанова, 27", line2: "Bishkek" }
 *   "Sovetskaya 5, Sovetsky district, Bishkek"
 *     -> { line1: "Sovetskaya 5", line2: "Sovetsky district, Bishkek" }
 *   "Bishkek"
 *     -> { line1: "Bishkek" }
 *   ""
 *     -> { line1: "" }
 */
export interface FormattedAddress {
  line1: string;
  line2?: string;
}

export function formatAddress(address: string | null | undefined): FormattedAddress {
  if (!address) return { line1: '' };

  const abbreviated = address
    .replace(/^Улица\s+/, 'Ул. ')
    .replace(/^улица\s+/, 'ул. ');

  const parts = abbreviated.split(',').map((s) => s.trim()).filter(Boolean);
  if (parts.length === 0) return { line1: '' };
  if (parts.length === 1) return { line1: parts[0] };

  const secondStartsWithDigit = /^\d/.test(parts[1]);
  const line1End = secondStartsWithDigit ? 2 : 1;
  const line1 = parts.slice(0, line1End).join(', ');
  const remainder = parts.slice(line1End).join(', ');
  return remainder ? { line1, line2: remainder } : { line1 };
}

/**
 * Shared availability formatter. Extracted from ListingMetaTable.tsx (260526-foc QA)
 * so PropertyCard.tsx + PropertyDetailsScreen.tsx can render the same "Now / <date>"
 * label without duplicating logic.
 *
 * Returns:
 *   - null  when the raw value is blank / undefined / unparseable
 *   - tNow  when the parsed date is within ~30 days (caller passes the localized
 *           "Now" string from useLanguage().t('property.now'))
 *   - a locale-formatted date string ("Jun 15, 2026" / "15 июн. 2026 г.") otherwise
 */
export function availabilityValueFromRaw(
  raw: unknown,
  tNow: string,
  locale: string,
): string | null {
  if (raw == null || raw === '') return null;
  const date =
    typeof raw === 'string'
      ? new Date(raw)
      : raw instanceof Date
        ? raw
        : null;
  if (!date || isNaN(date.getTime())) return null;
  const now = new Date();
  const oneMonthMs = 30 * 24 * 60 * 60 * 1000;
  const isSoon = date.getTime() - now.getTime() > oneMonthMs;
  const formattedDate = date.toLocaleDateString(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  return isSoon ? formattedDate : tNow;
}

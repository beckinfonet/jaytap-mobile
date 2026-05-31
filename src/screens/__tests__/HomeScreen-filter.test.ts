/**
 * Quick-task 260530-sud — country/city picker.
 *
 * Pure-function test of the HomeScreen city-filter + freetext-search predicate,
 * extracted byte-for-byte against the post-change HomeScreen.tsx logic.
 *
 * The microdistrict-substring branches (and the old Bishkek-default special-case)
 * are gone — the chips themselves no longer exist. The filter now does exact
 * case-insensitive slug equality on `location.city`. Freetext search keeps the
 * same multi-field substring match so users can still find listings by typing
 * a street name, microdistrict word, or listing ID.
 *
 * Coverage:
 *   (a) selectedCitySlug = null → predicate returns true (All cities).
 *   (b) selectedCitySlug = 'bishkek' → matches listing with city='bishkek'.
 *   (c) selectedCitySlug = 'bishkek' → mixed-case listing city='Bishkek' still matches.
 *   (d) selectedCitySlug = 'almaty' → listing with city='bishkek' is rejected.
 *   (e) freetext search still matches `location.address`.
 *   (f) freetext search still matches `location.district` (legacy data).
 *   (g) sanity: no fields contain the freetext → false.
 */

// Minimal Property fixture shape — only the fields the predicate reads.
interface MinimalProperty {
  location?: {
    district?: string;
    city?: string;
    address?: string;
  };
  content?: {
    title?: string;
    description?: string;
  };
  listingId?: string;
}

// Re-implementation of the HomeScreen `filteredProperties` per-item predicate
// for the city-filter + freetext branches ONLY. Other branches (deal-type +
// category + property-type) are out-of-scope for this quick task and omitted.
//
// MUST stay byte-identical to HomeScreen.tsx city-filter + search branches —
// if HomeScreen drifts, update this fixture to match (it's a smoke test, not
// the source of truth).
function matchesCityAndSearch(
  p: MinimalProperty,
  selectedCitySlug: string | null,
  searchQuery: string,
): boolean {
  // 4. City filter (quick-task 260530-sud) — exact case-insensitive slug equality.
  if (selectedCitySlug) {
    const targetSlug = selectedCitySlug.toLowerCase();
    if ((p.location?.city ?? '').toLowerCase() !== targetSlug) return false;
  }

  // 5. Search Query (listingId, title, city, district, address, description).
  if (searchQuery) {
    const query = searchQuery.toLowerCase().trim();
    const queryWithoutDashes = query.replace(/[-\s]/g, '');
    const titleLc = p.content?.title?.toLowerCase() ?? '';
    const cityLc = p.location?.city?.toLowerCase() ?? '';
    const districtLc = p.location?.district?.toLowerCase() ?? '';
    const descLc = p.content?.description?.toLowerCase() ?? '';
    const addressLc = p.location?.address?.toLowerCase() ?? '';

    return (
      titleLc.includes(query) ||
      cityLc.includes(query) ||
      districtLc.includes(query) ||
      descLc.includes(query) ||
      addressLc.includes(query) ||
      (p.listingId !== undefined &&
        (p.listingId.toLowerCase().includes(query) ||
          p.listingId.replace(/[-\s]/g, '').includes(queryWithoutDashes)))
    );
  }

  return true;
}

describe('Quick-task 260530-sud — HomeScreen city filter + freetext search', () => {
  // (a) Null selection = "All cities" — every listing passes the city gate.
  test('(a) selectedCitySlug=null passes any listing regardless of city', () => {
    const anywhere: MinimalProperty = {
      location: { city: 'almaty', district: '', address: '' },
      content: { description: '' },
    };
    expect(matchesCityAndSearch(anywhere, null, '')).toBe(true);
  });

  // (b) Exact slug match.
  test('(b) selectedCitySlug="bishkek" matches listing with location.city="bishkek"', () => {
    const listing: MinimalProperty = {
      location: { city: 'bishkek', district: '', address: '' },
      content: { description: '' },
    };
    expect(matchesCityAndSearch(listing, 'bishkek', '')).toBe(true);
  });

  // (c) Case insensitivity — legacy listings may have mixed-case city values.
  test('(c) selectedCitySlug="bishkek" matches listing with location.city="Bishkek"', () => {
    const listing: MinimalProperty = {
      location: { city: 'Bishkek', district: '', address: '' },
      content: { description: '' },
    };
    expect(matchesCityAndSearch(listing, 'bishkek', '')).toBe(true);
  });

  // (d) Negative — picking Almaty hides Bishkek listings.
  test('(d) selectedCitySlug="almaty" rejects listing with location.city="bishkek"', () => {
    const listing: MinimalProperty = {
      location: { city: 'bishkek', district: '', address: '' },
      content: { description: '' },
    };
    expect(matchesCityAndSearch(listing, 'almaty', '')).toBe(false);
  });

  // (e) Freetext search still hits `location.address` (Nominatim displayName).
  test('(e) searchQuery="manas" matches listing with address="100 Manas St"', () => {
    const listing: MinimalProperty = {
      location: { district: '', city: '', address: '100 Manas St, Bishkek' },
      content: { title: '', description: '' },
    };
    expect(matchesCityAndSearch(listing, null, 'manas')).toBe(true);
  });

  // (f) Freetext search still hits legacy `location.district` (so users can
  // still find old listings by typing a microdistrict name).
  test('(f) searchQuery="mkr-5" matches legacy listing with district="mkr-5"', () => {
    const listing: MinimalProperty = {
      location: { district: 'mkr-5', city: 'bishkek', address: '' },
      content: { description: '' },
    };
    expect(matchesCityAndSearch(listing, null, 'mkr-5')).toBe(true);
  });

  // (g) Sanity — nothing matches the freetext.
  test('(g) sanity: no field contains "xyz" → false', () => {
    const listing: MinimalProperty = {
      location: { district: 'mkr-3', city: 'bishkek', address: '100 Manas St' },
      content: { title: 'Cozy apartment', description: 'Nice' },
    };
    expect(matchesCityAndSearch(listing, null, 'xyz')).toBe(false);
  });
});

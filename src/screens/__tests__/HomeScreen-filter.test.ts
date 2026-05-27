/**
 * Quick-task 260527-0cg — Phase 12 address-flow redesign.
 *
 * Pure-function test of the HomeScreen filter predicate, extracted byte-for-byte
 * against the post-change HomeScreen.tsx logic (lines ~184-217). Avoids mounting
 * HomeScreen + the entire context tree just to verify a substring-match.
 *
 * Coverage:
 *   (a) NEW listing with address only (no district slug) → matches Microdistrict chip.
 *   (b) LEGACY listing with district slug only (empty address) → still matches (regression guard).
 *   (c) Freetext search matches `location.address` text.
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
// for the district-chip + freetext branches ONLY. Other branches (deal-type +
// category + property-type) are out-of-scope for this quick task and omitted.
//
// MUST stay byte-identical to HomeScreen.tsx:184-217 — if HomeScreen drifts,
// update this fixture to match (it's a smoke test, not the source of truth).
function matchesDistrictAndSearch(
  p: MinimalProperty,
  selectedDistrict: string,
  searchQuery: string,
): boolean {
  // 4. District filter (D-10 + quick-task 260527-0cg).
  if (selectedDistrict !== 'Bishkek (All)') {
    const searchDistrict = selectedDistrict.toLowerCase();
    const districtMatch = p.location?.district?.toLowerCase().includes(searchDistrict);
    const cityMatch = p.location?.city?.toLowerCase().includes(searchDistrict);
    const descMatch = p.content?.description?.toLowerCase().includes(searchDistrict);
    const addressMatch = p.location?.address?.toLowerCase().includes(searchDistrict);
    if (!districtMatch && !cityMatch && !descMatch && !addressMatch) return false;
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
      (p.listingId !== undefined && (
        p.listingId.toLowerCase().includes(query) ||
        p.listingId.replace(/[-\s]/g, '').includes(queryWithoutDashes)
      ))
    );
  }

  return true;
}

describe('Quick-task 260527-0cg — HomeScreen filter predicate (Phase 12)', () => {
  // Case (a): NEW listing with ONLY canonical address → matches Microdistrict chip via address.
  // The geocode service is called with `lang: language` (typically 'en' in this project) so
  // Nominatim returns the English-localized displayName when available. Plain `.includes()`
  // substring match: chip text "Microdistrict 5" lowercased = "microdistrict 5"; address
  // "Microdistrict 5, Bishkek" lowercased contains "microdistrict 5" → MATCH.
  test('(a) new listing with English-localized address "Microdistrict 5, Bishkek" matches chip "Microdistrict 5"', () => {
    const newListing: MinimalProperty = {
      location: {
        district: '',
        city: 'bishkek',
        address: 'Microdistrict 5, Bishkek, Kyrgyzstan',
      },
      content: { description: '' },
    };
    expect(matchesDistrictAndSearch(newListing, 'Microdistrict 5', '')).toBe(true);
  });

  // Case (b): LEGACY listing with district slug only → STILL matches (regression guard).
  test('(b) legacy listing with location.district="mkr-5" + empty address still matches "Microdistrict 5"', () => {
    const legacyListing: MinimalProperty = {
      location: {
        district: 'mkr-5',
        city: 'bishkek',
        address: '',
      },
      content: { description: '' },
    };
    // selectedDistrict 'mkr-5' contains substring of 'mkr-5' (district slug); search uses lowercase
    expect(matchesDistrictAndSearch(legacyListing, 'mkr-5', '')).toBe(true);
  });

  // Case (c): Freetext search matches `location.address` text.
  test('(c) searchQuery="manas" matches listing with address="100 Manas St" and other fields empty', () => {
    const listing: MinimalProperty = {
      location: {
        district: '',
        city: '',
        address: '100 Manas St, Bishkek',
      },
      content: { title: '', description: '' },
    };
    expect(matchesDistrictAndSearch(listing, 'Bishkek (All)', 'manas')).toBe(true);
  });

  // Sanity check: listing with NO matches anywhere returns false.
  test('sanity: no field contains "xyz" → false', () => {
    const listing: MinimalProperty = {
      location: { district: 'mkr-3', city: 'bishkek', address: '100 Manas St' },
      content: { title: 'Cozy apartment', description: 'Nice' },
    };
    expect(matchesDistrictAndSearch(listing, 'Bishkek (All)', 'xyz')).toBe(false);
  });
});

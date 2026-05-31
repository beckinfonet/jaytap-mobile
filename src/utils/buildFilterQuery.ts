/**
 * buildFilterQuery — Canonical filter-predicate factory for the M6 shared filter
 * data model (REQUIREMENTS DATA-01 + DATA-02).
 *
 * Returns a memo-friendly `(p: Property) => boolean` predicate that Phase 14's
 * Guided + Cascading variants and HomeScreen's existing `filteredProperties`
 * useMemo all consume verbatim. Same input shape, same output behavior, across
 * every variant — that is the whole point of Phase 13 shipping this first.
 *
 * Design notes:
 *
 * - **Predicate factory, not normalized-object + sister `applyFilter`** (Phase 13
 *   D-04): minimum-diff at HomeScreen.tsx:186-247. The existing
 *   `properties.filter(p => {...})` shape stays; the body becomes
 *   `buildFilterQuery({...})(p)`. URL/share-link serialization is deferred —
 *   revisit if M7+ adds shareable search results.
 *
 * - **city + search-query filters are NOT part of the canonical shape** (Phase 13
 *   D-06 boundary): REQUIREMENTS DATA-01 names only `deal | category | types`.
 *   HomeScreen keeps `matchesCity(p)` + `matchesSearch(p)` inline and composes
 *   via `.filter(p => buildFilterQuery(...)(p) && matchesCity(p) && matchesSearch(p))`.
 *
 * - **`types: string[]` is loose** (Phase 13 D-09): HomeScreen's existing
 *   `selectedType: string | null` is loosely typed; tightening to `PropertyType[]`
 *   here would force a cascade at every chip render-site. The predicate accepts
 *   loose strings and normalizes case internally.
 *
 * - **Predicate semantics** (Phase 13 D-06; preserves HomeScreen.tsx:191-202):
 *     deal:     args.deal === 'sale' ? p.dealType === 'sale' : p.dealType !== 'sale'
 *               (M3 collapse: rent_long + rent_daily → rent bucket)
 *     category: propertyTypeToCategory(p.propertyType) === args.category
 *     types:    args.types.length === 0
 *               || args.types.some(t => t.toLowerCase() === (p.propertyType ?? 'apartment').toLowerCase())
 *               (empty list = any-in-category; non-empty = OR-union; case-insensitive;
 *                'apartment' fallback preserves HomeScreen.tsx:200)
 *
 * Convention: matches `getTourPhotosUrl.ts` shape (named exports, pure fn, no
 * React imports, no side effects).
 *
 * @see src/utils/propertyCategory.ts — propertyTypeToCategory + PropertyCategory
 * @see src/screens/HomeScreen.tsx — first consumer (Phase 13 Plan 13-01)
 * @see .planning/REQUIREMENTS.md §M6 DATA-01 + DATA-02
 */
import type { Property } from '../types/Property';
import {
  propertyTypeToCategory,
  type PropertyCategory,
} from './propertyCategory';

/** Binary deal bucket (M3 rent_long + rent_daily collapse to 'rent'). */
export type FilterDeal = 'rent' | 'sale';

/**
 * Input shape for `buildFilterQuery`. The three dimensions that EVERY M6 filter
 * variant reads/writes. City + freetext search stay out-of-shape per D-06.
 */
export type FilterArgs = {
  deal: FilterDeal;
  category: PropertyCategory;
  /** Empty list = any-type-in-category. Non-empty = OR-union, case-insensitive. */
  types: string[];
};

/**
 * Returns a pure predicate `(p: Property) => boolean`. The predicate captures
 * `args` by closure and performs no I/O. Safe to call inside React `useMemo`.
 */
export function buildFilterQuery(args: FilterArgs): (p: Property) => boolean {
  const { deal, category, types } = args;
  // Pre-lowercase the selected types once for case-insensitive matching.
  const typesLc = types.map((t) => t.toLowerCase());
  return (p: Property): boolean => {
    // 1. Deal clause — preserves M3 rent_long+rent_daily → rent collapse.
    const isSale = p.dealType === 'sale';
    if (deal === 'sale' && !isSale) return false;
    if (deal === 'rent' && isSale) return false;

    // 2. Category clause — propertyTypeToCategory safe-defaults to 'Residential'
    // for null/undefined/unknown, so an apartment with missing propertyType
    // still slots into Residential.
    if (propertyTypeToCategory(p.propertyType) !== category) return false;

    // 3. Types clause — empty list = any-in-category; OR-union otherwise.
    // 'apartment' fallback for missing propertyType preserves HomeScreen.tsx:200.
    if (typesLc.length > 0) {
      const pTypeLc = (p.propertyType ?? 'apartment').toLowerCase();
      if (!typesLc.some((t) => t === pTypeLc)) return false;
    }

    return true;
  };
}

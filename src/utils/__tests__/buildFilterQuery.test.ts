/**
 * @format
 *
 * Phase 13 Plan 13-01 — buildFilterQuery (DATA-01 + DATA-02)
 *
 * Verifies the canonical filter predicate factory's three-clause semantics:
 *   1. deal — sale -> only sale; rent -> not-sale (M3 rent_long + rent_daily collapse)
 *   2. category — propertyTypeToCategory(p.propertyType) === args.category
 *   3. types — empty list = all-in-category; non-empty = OR-union (case-insensitive)
 *
 * SC1 (multi-select OR-union) is proven by Test 5; SC2 (cross-product) by Test 8.
 *
 * Test fixtures mock Property minimally via `as unknown as Property` per Plan 13-01
 * `<specifics>` "Test fixtures should mock Property objects minimally" — only
 * dealType + propertyType matter for the predicate.
 */
import { buildFilterQuery } from '../buildFilterQuery';
import type { Property } from '../../types/Property';

const mkProperty = (
  propertyType: Property['propertyType'] | undefined,
  dealType: Property['dealType'] = 'rent_long',
  id: string = 'p',
): Property =>
  ({
    id,
    propertyType,
    dealType,
  } as unknown as Property);

describe('buildFilterQuery', () => {
  describe('deal clause', () => {
    test('Test 1: deal=rent accepts rent_long apartment, rejects sale apartment (Residential)', () => {
      const predicate = buildFilterQuery({
        deal: 'rent',
        category: 'Residential',
        types: [],
      });
      expect(predicate(mkProperty('apartment', 'rent_long'))).toBe(true);
      expect(predicate(mkProperty('apartment', 'sale'))).toBe(false);
    });

    test('Test 2: deal=sale accepts sale apartment, rejects rent_long (D-06 sale collapse)', () => {
      const predicate = buildFilterQuery({
        deal: 'sale',
        category: 'Residential',
        types: [],
      });
      expect(predicate(mkProperty('apartment', 'sale'))).toBe(true);
      expect(predicate(mkProperty('apartment', 'rent_long'))).toBe(false);
    });

    test('deal=rent also accepts rent_daily (M3 rent_long + rent_daily collapse)', () => {
      const predicate = buildFilterQuery({
        deal: 'rent',
        category: 'Residential',
        types: [],
      });
      expect(predicate(mkProperty('apartment', 'rent_daily'))).toBe(true);
    });
  });

  describe('category clause', () => {
    test('Test 3: empty types accepts any type within category; rejects out-of-category', () => {
      const predicate = buildFilterQuery({
        deal: 'rent',
        category: 'Residential',
        types: [],
      });
      // Both Residential types pass
      expect(predicate(mkProperty('apartment', 'rent_long'))).toBe(true);
      expect(predicate(mkProperty('house', 'rent_long'))).toBe(true);
      // Hospitality is rejected because category filter still fires
      expect(predicate(mkProperty('hotel', 'rent_long'))).toBe(false);
    });

    test('Commercial category rejects Residential types', () => {
      const predicate = buildFilterQuery({
        deal: 'rent',
        category: 'Commercial',
        types: [],
      });
      expect(predicate(mkProperty('apartment', 'rent_long'))).toBe(false);
      expect(predicate(mkProperty('office', 'rent_long'))).toBe(true);
    });

    test('Hospitality category accepts hotel/hostel only', () => {
      const predicate = buildFilterQuery({
        deal: 'rent',
        category: 'Hospitality',
        types: [],
      });
      expect(predicate(mkProperty('hotel', 'rent_long'))).toBe(true);
      expect(predicate(mkProperty('hostel', 'rent_long'))).toBe(true);
      expect(predicate(mkProperty('apartment', 'rent_long'))).toBe(false);
    });
  });

  describe('types clause', () => {
    test('Test 4: single-type filter accepts matching type, rejects siblings within same category', () => {
      const predicate = buildFilterQuery({
        deal: 'rent',
        category: 'Residential',
        types: ['Apartment'],
      });
      expect(predicate(mkProperty('apartment', 'rent_long'))).toBe(true);
      expect(predicate(mkProperty('house', 'rent_long'))).toBe(false);
    });

    test('Test 5 (SC1): multi-select OR-union — types=[Apartment, House] accepts both, rejects Townhome', () => {
      const predicate = buildFilterQuery({
        deal: 'rent',
        category: 'Residential',
        types: ['Apartment', 'House'],
      });
      expect(predicate(mkProperty('apartment', 'rent_long'))).toBe(true);
      expect(predicate(mkProperty('house', 'rent_long'))).toBe(true);
      // Townhome is Residential but not in the selected types → rejected
      // (Note: Property.propertyType union does not include 'townhome' today; cast via mock to
      // exercise the predicate's behavior for an unselected-but-in-category value.)
      expect(
        predicate({
          id: 'p-townhome',
          propertyType: 'townhome' as unknown as Property['propertyType'],
          dealType: 'rent_long',
        } as unknown as Property),
      ).toBe(false);
    });

    test('Test 6: case-insensitive — types=[APARTMENT] matches propertyType=apartment (D-06)', () => {
      const predicate = buildFilterQuery({
        deal: 'rent',
        category: 'Residential',
        types: ['APARTMENT'],
      });
      expect(predicate(mkProperty('apartment', 'rent_long'))).toBe(true);
    });

    test('Test 7: missing propertyType defaults to apartment for type-match (D-06 fallback preserves HomeScreen:200)', () => {
      const predicate = buildFilterQuery({
        deal: 'rent',
        category: 'Residential',
        types: ['Apartment'],
      });
      // Property with undefined propertyType should match 'Apartment' because
      // propertyTypeToCategory returns 'Residential' for undefined AND the
      // types clause defaults to 'apartment' (HomeScreen.tsx:200 fallback).
      expect(predicate(mkProperty(undefined, 'rent_long'))).toBe(true);
    });
  });

  describe('cross-product (Test 8 / SC2)', () => {
    type Deal = 'rent' | 'sale';
    type Category = 'Residential' | 'Commercial' | 'Hospitality';

    const sampleByCategory: Record<Category, NonNullable<Property['propertyType']>> = {
      Residential: 'apartment',
      Commercial: 'office',
      Hospitality: 'hotel',
    };

    const deals: Deal[] = ['rent', 'sale'];
    const categories: Category[] = ['Residential', 'Commercial', 'Hospitality'];

    deals.forEach((deal) => {
      categories.forEach((category) => {
        test(`deal=${deal} × category=${category} accepts matching sample, rejects mismatched`, () => {
          const predicate = buildFilterQuery({
            deal,
            category,
            types: [],
          });
          // In-category, matching deal → accepted
          const inCatType = sampleByCategory[category];
          const matchingDeal: Property['dealType'] = deal === 'sale' ? 'sale' : 'rent_long';
          expect(predicate(mkProperty(inCatType, matchingDeal))).toBe(true);

          // In-category, wrong deal → rejected
          const wrongDeal: Property['dealType'] = deal === 'sale' ? 'rent_long' : 'sale';
          expect(predicate(mkProperty(inCatType, wrongDeal))).toBe(false);

          // Out-of-category, matching deal → rejected
          const outOfCatType: NonNullable<Property['propertyType']> =
            category === 'Residential' ? 'office' : 'apartment';
          expect(predicate(mkProperty(outOfCatType, matchingDeal))).toBe(false);
        });
      });
    });
  });

  describe('purity (Test 9)', () => {
    test('two predicates built with identical args behave identically', () => {
      const args = {
        deal: 'rent' as const,
        category: 'Residential' as const,
        types: ['Apartment'],
      };
      const p1 = buildFilterQuery(args);
      const p2 = buildFilterQuery(args);
      const fixtures: Property[] = [
        mkProperty('apartment', 'rent_long'),
        mkProperty('apartment', 'sale'),
        mkProperty('house', 'rent_long'),
        mkProperty('hotel', 'rent_long'),
      ];
      fixtures.forEach((p) => {
        expect(p1(p)).toBe(p2(p));
      });
    });

    test('calling predicate multiple times on same property returns the same result (no shared state)', () => {
      const predicate = buildFilterQuery({
        deal: 'rent',
        category: 'Residential',
        types: [],
      });
      const property = mkProperty('apartment', 'rent_long');
      const first = predicate(property);
      const second = predicate(property);
      const third = predicate(property);
      expect(first).toBe(second);
      expect(second).toBe(third);
    });
  });
});

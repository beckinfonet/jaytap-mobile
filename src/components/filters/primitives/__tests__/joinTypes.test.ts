/**
 * @format
 *
 * Phase 14 Plan 14-01 — joinTypes (Breadcrumb + Cascading result-line collapse).
 *
 * Verifies the natural-language collapse rule from handoff filters-shared.jsx:75-79.
 * Pure-fn test pattern from src/utils/__tests__/buildFilterQuery.test.ts.
 */
import { joinTypes } from '../joinTypes';

describe('joinTypes', () => {
  describe('zero types', () => {
    test('returns empty string when types is empty', () => {
      expect(joinTypes('Residential', [])).toBe('');
    });

    test('returns empty string even with lower=true', () => {
      expect(joinTypes('Residential', [], true)).toBe('');
    });
  });

  describe('one type', () => {
    test('returns the bare label for a single in-category type', () => {
      expect(joinTypes('Residential', ['Apartment'])).toBe('Apartment');
    });

    test('lower=true lowercases the single label', () => {
      expect(joinTypes('Residential', ['Apartment'], true)).toBe('apartment');
    });
  });

  describe('two types', () => {
    test('joins two labels with " or "', () => {
      expect(joinTypes('Residential', ['Apartment', 'House'])).toBe('Apartment or House');
    });

    test('works for Hospitality (any category)', () => {
      expect(joinTypes('Hospitality', ['Hostel', 'Hotel'])).toBe('Hostel or Hotel');
    });

    test('lower=true lowercases both labels', () => {
      expect(joinTypes('Residential', ['Apartment', 'House'], true)).toBe('apartment or house');
    });
  });

  describe('three or more types', () => {
    test('renders "A, B or C" for exactly three', () => {
      expect(joinTypes('Residential', ['Apartment', 'House', 'Townhome'])).toBe(
        'Apartment, House or Townhome',
      );
    });

    test('generalizes to "A, B, C or D" for four', () => {
      expect(
        joinTypes('Residential', ['Apartment', 'House', 'Townhome', 'Condo']),
      ).toBe('Apartment, House, Townhome or Condo');
    });

    test('lower=true lowercases every segment', () => {
      expect(
        joinTypes('Commercial', ['Office', 'Retail', 'Warehouse'], true),
      ).toBe('office, retail or warehouse');
    });
  });
});

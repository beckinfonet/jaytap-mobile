/**
 * src/components/__tests__/PropertyCard.specChip.test.tsx
 *
 * Quick task 260525-ggp Task 2 — behavior pin for the PropertyCard viewer-branch
 * spec chip (the small dark "Bed / Bath" pill in the bottom-right when
 * showEditButton=false).
 *
 * Pins the read-path fallback shipped in 260525-ggp Task 1:
 *   Bed value: basics?.hotelRooms ?? basics?.rooms ?? '-'
 *   Bath value: enum-mapped (private/shared/none) ?? '-'
 *
 * Cases (one test() each):
 *   1. apartment + basics.rooms='2'                  → Bed '2', Bath '-'
 *   2. house + basics.rooms='3'                      → Bed '3', Bath '-'
 *   3. hotel + basics.hotelRooms='4+' (no rooms)     → Bed '4+', Bath '-'  (regression fence for Task 1)
 *   4. hostel + basics.hotelRooms='1'                → Bed '1', Bath '-'
 *   5. office + basics.rooms='2', bathroom='private' → Bed '2', Bath 'property.bathroomPrivate' (i18n key)
 *   6. hotel + basics={}                             → Bed '-', Bath '-'  (?? chain falls through)
 *
 * Pattern: react-test-renderer + act (no RTL/jest-native in dev deps — see
 * PropertyDetailsScreen-mod-403.test.tsx:22-23). Mocks mirror EmailVerifyBanner.test.tsx.
 */

import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import { PropertyCard } from '../PropertyCard';
import type { Property } from '../../types/Property';

// === Mocks ===

jest.mock('../../theme/ThemeContext', () => ({ useTheme: jest.fn() }));
jest.mock('../../context/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('../../context/LanguageContext', () => ({ useLanguage: jest.fn() }));

// Subcomponents that drag in heavy trees — render to null, out of scope.
jest.mock('../ListingMetaTable', () => ({ ListingMetaTable: () => null }));
jest.mock('../StatusPill', () => ({ StatusPill: () => null }));

// Icons — render to null, not asserted.
jest.mock('lucide-react-native', () => ({
  Heart: () => null,
  Bed: () => null,
  Bath: () => null,
  Pencil: () => null,
  Trash2: () => null,
  Archive: () => null,
  ArchiveRestore: () => null,
}));

const { useTheme } = require('../../theme/ThemeContext');
const { useAuth } = require('../../context/AuthContext');
const { useLanguage } = require('../../context/LanguageContext');

const setupMocks = () => {
  useTheme.mockReturnValue({
    isDark: false,
    colors: {
      // Cover only the tokens PropertyCard reads. Empty strings are fine —
      // tests do not assert color values.
      text: '',
      textSecondary: '',
      surface: '',
      border: '',
      chipBackground: '',
      chipBorder: '',
      primary: '',
      inputBackground: '',
      error: '',
    },
  });
  useAuth.mockReturnValue({ user: { localId: 'viewer-uid' } });
  // t mock: return the key verbatim so we can assert i18n-key usage.
  useLanguage.mockReturnValue({ t: (key: string) => key, language: 'en' });
};

beforeEach(() => {
  jest.clearAllMocks();
  setupMocks();
});

// === Helpers ===

const makeProperty = (overrides: Partial<Property> = {}): Property =>
  ({
    id: 'p1',
    dealType: 'rent_long',
    content: { title: 'Test' },
    ...overrides,
  } as unknown as Property);

const renderCard = (property: Property): TestRenderer.ReactTestRenderer => {
  let tree!: TestRenderer.ReactTestRenderer;
  act(() => {
    tree = TestRenderer.create(
      <PropertyCard
        property={property}
        onPress={() => {}}
        onViewTour={() => {}}
        onViewVideo={() => {}}
      />,
    );
  });
  return tree;
};

// Collect every rendered Text node's stringified children. The viewer-branch
// spec chip emits two <Text> nodes (Bed value, Bath value) — we match by
// position relative to the icon-less spec items. Easiest stable assertion:
// just collect ALL text contents and look for the expected strings.
const collectTexts = (tree: TestRenderer.ReactTestRenderer): string[] => {
  const out: string[] = [];
  tree.root.findAllByType(Text).forEach((node) => {
    const c = node.props.children;
    if (typeof c === 'string') {
      out.push(c);
    } else if (Array.isArray(c)) {
      c.forEach((sub) => {
        if (typeof sub === 'string') out.push(sub);
      });
    }
  });
  return out;
};

// === Tests ===

describe('PropertyCard viewer-branch spec chip — 260525-ggp Task 2', () => {
  test('Case 1: apartment + basics.rooms="2" → Bed "2", Bath "-"', () => {
    const tree = renderCard(
      makeProperty({
        propertyType: 'apartment',
        basics: { rooms: '2' },
      }),
    );
    const texts = collectTexts(tree);
    expect(texts).toContain('2');
    expect(texts).toContain('-');
  });

  test('Case 2: house + basics.rooms="3" → Bed "3", Bath "-"', () => {
    const tree = renderCard(
      makeProperty({
        propertyType: 'house',
        basics: { rooms: '3' },
      }),
    );
    const texts = collectTexts(tree);
    expect(texts).toContain('3');
    expect(texts).toContain('-');
  });

  test('Case 3: hotel + basics.hotelRooms="4+" (no rooms) → Bed "4+", Bath "-" (REGRESSION FENCE for Task 1)', () => {
    const tree = renderCard(
      makeProperty({
        propertyType: 'hotel',
        basics: { hotelRooms: '4+' },
      }),
    );
    const texts = collectTexts(tree);
    // Pre-Task-1 this would have been '-' (rooms-only fallback missed hotelRooms).
    expect(texts).toContain('4+');
    expect(texts).toContain('-'); // bathroom side still '-' (no captured data by M3 design)
  });

  test('Case 4: hostel + basics.hotelRooms="1" → Bed "1", Bath "-"', () => {
    const tree = renderCard(
      makeProperty({
        propertyType: 'hostel',
        basics: { hotelRooms: '1' },
      }),
    );
    const texts = collectTexts(tree);
    expect(texts).toContain('1');
    expect(texts).toContain('-');
  });

  test('Case 5: office + basics={rooms:"2", bathroom:"private"} → Bed "2", Bath = "property.bathroomPrivate" (i18n key)', () => {
    const tree = renderCard(
      makeProperty({
        propertyType: 'office',
        basics: { rooms: '2', bathroom: 'private' },
      }),
    );
    const texts = collectTexts(tree);
    expect(texts).toContain('2');
    // t mock returns the key verbatim — confirms the bathroom enum-map fired
    // with the 'private' branch and i18n was queried for the right key.
    expect(texts).toContain('property.bathroomPrivate');
  });

  test('Case 6: hotel + basics={} (no rooms AND no hotelRooms) → Bed "-", Bath "-"', () => {
    const tree = renderCard(
      makeProperty({
        propertyType: 'hotel',
        basics: {},
      }),
    );
    const texts = collectTexts(tree);
    // Two dashes — Bed and Bath both fall through.
    const dashCount = texts.filter((s) => s === '-').length;
    expect(dashCount).toBeGreaterThanOrEqual(2);
  });
});

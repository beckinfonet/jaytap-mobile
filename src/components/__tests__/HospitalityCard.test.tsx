/**
 * src/components/__tests__/HospitalityCard.test.tsx
 *
 * Phase 8 Plan 03 Task 2 — behavior pin for the HospitalityCard meta-line
 * conditional bathroomCount fragment (D-06 invariant).
 *
 * Pins:
 *   - When basics.bathroomCount is defined, the inline fragment renders:
 *       `· {n} {t('hospitality.bathrooms')}` between Rooms and Max Guests.
 *   - When basics.bathroomCount is undefined, the fragment renders NOTHING:
 *       NO orphan ` · ` separator. (LOAD-BEARING D-06 regression fence.)
 *   - When basics.bathroomCount === 0, the fragment STILL renders (proves the
 *     conditional uses `!== undefined`, not truthiness).
 *   - Existing meta-line reads (hotelRooms/rooms fallback, maxGuests, Rooms,
 *     Max Guests labels) preserved verbatim — no Phase-6 D-10 regression.
 *
 * Pattern: react-test-renderer + act (no RTL / jest-native in repo). Mocks
 * mirror src/components/__tests__/PropertyCard.specChip.test.tsx.
 */

import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import { HospitalityCard } from '../HospitalityCard';
import type { Property } from '../../types/Property';

// === Mocks ===

jest.mock('../../theme/ThemeContext', () => ({ useTheme: jest.fn() }));
jest.mock('../../context/LanguageContext', () => ({ useLanguage: jest.fn() }));

// Icons — render to null, not asserted.
jest.mock('lucide-react-native', () => ({
  Heart: () => null,
  Pencil: () => null,
  Trash2: () => null,
  Archive: () => null,
  ArchiveRestore: () => null,
}));

// Amenity icon map — Proxy returns a no-op component for ANY token,
// so the AMENITY_ICONS[token] read in HospitalityCard never throws.
jest.mock('../../utils/hospitalityAmenities', () => ({
  AMENITY_ICONS: new Proxy({}, { get: () => () => null }),
}));

const { useTheme } = require('../../theme/ThemeContext');
const { useLanguage } = require('../../context/LanguageContext');

const setupMocks = () => {
  useTheme.mockReturnValue({
    isDark: false,
    colors: {
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
    propertyType: 'hotel',
    dealType: 'rent_daily',
    content: { title: 'Test Hotel' },
    location: { city: 'Bishkek', district: 'Downtown' },
    media: { photos: [] },
    amenities: [],
    ...overrides,
  } as unknown as Property);

const renderCard = (property: Property): TestRenderer.ReactTestRenderer => {
  let tree!: TestRenderer.ReactTestRenderer;
  act(() => {
    tree = TestRenderer.create(
      <HospitalityCard
        property={property}
        onPress={jest.fn()}
        onViewTour={jest.fn()}
      />,
    );
  });
  return tree;
};

// Collect every rendered Text node's string children, including nested arrays
// AND nested React elements (e.g., React.Fragment shorthand `<>...</>` used
// for the D-06 conditional fragment — its children show up as a nested
// element under the meta-line Text's children array).
const collectTexts = (tree: TestRenderer.ReactTestRenderer): string[] => {
  const out: string[] = [];
  const walk = (val: unknown) => {
    if (val == null || typeof val === 'boolean') return;
    if (typeof val === 'string') {
      out.push(val);
      return;
    }
    if (typeof val === 'number') {
      out.push(String(val));
      return;
    }
    if (Array.isArray(val)) {
      val.forEach(walk);
      return;
    }
    // React element — recurse into its children
    if (typeof val === 'object' && val !== null && 'props' in val) {
      const props = (val as { props?: { children?: unknown } }).props;
      if (props && 'children' in props) {
        walk(props.children);
      }
    }
  };
  tree.root.findAllByType(Text).forEach((node) => {
    walk(node.props.children);
  });
  return out;
};

// LOAD-BEARING D-06 regression fence helper: count occurrences of the
// inline `' · '` separator. Two separators when bathroomCount is defined,
// one separator when it's absent (no orphan).
const countSeparators = (texts: string[]): number =>
  texts.filter((s) => s === ' · ').length;

// === Tests ===

describe('HospitalityCard meta-line bathroomCount fragment — Phase 8 D-06', () => {
  test('Test 1: fragment present — hotel + hotelRooms="3" + bathroomCount=1.5 + maxGuests=8', () => {
    const tree = renderCard(
      makeProperty({
        propertyType: 'hotel',
        basics: { hotelRooms: '3', bathroomCount: 1.5 },
        maxGuests: 8,
      }),
    );
    const texts = collectTexts(tree);

    // Values present (hotelRooms='3' renders as '3'; bathroomCount=1.5 → '1.5'; maxGuests=8 → '8')
    expect(texts).toContain('3');
    expect(texts).toContain('1.5');
    expect(texts).toContain('8');

    // Labels (t mock returns key verbatim)
    expect(texts).toContain('hospitality.rooms');
    expect(texts).toContain('hospitality.bathrooms');
    expect(texts).toContain('hospitality.maxGuests');

    // Two separators: rooms↔bathrooms and bathrooms↔maxGuests
    expect(countSeparators(texts)).toBe(2);
  });

  test('Test 2: fragment absent — hostel + hotelRooms="1" (no bathroomCount) + maxGuests=2 (LOAD-BEARING orphan-separator fence)', () => {
    const tree = renderCard(
      makeProperty({
        propertyType: 'hostel',
        basics: { hotelRooms: '1' },
        maxGuests: 2,
      }),
    );
    const texts = collectTexts(tree);

    // Values present
    expect(texts).toContain('1');
    expect(texts).toContain('2');

    // Labels present
    expect(texts).toContain('hospitality.rooms');
    expect(texts).toContain('hospitality.maxGuests');

    // Bathrooms label MUST be absent — fragment was omitted entirely
    expect(texts).not.toContain('hospitality.bathrooms');

    // EXACTLY ONE separator — D-06 regression fence. If the conditional
    // emitted ` · ` outside the fragment, this would be 2 and the
    // rendered string would be "Rooms · · Max Guests".
    expect(countSeparators(texts)).toBe(1);
  });

  test('Test 3: empty basics — fallback render (hotelRooms/rooms both undefined)', () => {
    const tree = renderCard(
      makeProperty({
        propertyType: 'hotel',
        basics: {},
        // maxGuests omitted → ?? 0 fallback
      }),
    );
    const texts = collectTexts(tree);

    // '-' is the rooms fallback
    expect(texts).toContain('-');
    // '0' is the maxGuests ?? 0 fallback
    expect(texts).toContain('0');

    // Labels present
    expect(texts).toContain('hospitality.rooms');
    expect(texts).toContain('hospitality.maxGuests');

    // Fragment STILL absent
    expect(texts).not.toContain('hospitality.bathrooms');

    // One separator only
    expect(countSeparators(texts)).toBe(1);
  });

  test('Test 4: bathroomCount === 0 — fragment RENDERS (proves !== undefined, not truthiness)', () => {
    const tree = renderCard(
      makeProperty({
        propertyType: 'hotel',
        basics: { hotelRooms: '3', bathroomCount: 0 },
        maxGuests: 10,
      }),
    );
    const texts = collectTexts(tree);

    // hotelRooms value present (renders as '3')
    expect(texts).toContain('3');
    // bathroomCount===0 renders as '0' AND maxGuests===10 renders as '10'
    expect(texts).toContain('0');
    expect(texts).toContain('10');

    // Fragment MUST be present — `0 !== undefined` is true
    expect(texts).toContain('hospitality.bathrooms');
    expect(texts).toContain('hospitality.rooms');
    expect(texts).toContain('hospitality.maxGuests');

    // Two separators (fragment present)
    expect(countSeparators(texts)).toBe(2);
  });
});

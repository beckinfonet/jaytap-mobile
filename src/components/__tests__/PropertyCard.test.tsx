/**
 * src/components/__tests__/PropertyCard.test.tsx
 *
 * Phase 8 Plan 08-02 Task 2 — co-located behavior fence for the redesigned
 * PropertyCard specs-strip (DISP-01, DISP-02, DISP-05).
 *
 * Asserts Phase-8 cell anatomy across 5 cases:
 *   1. apartment full         → '2', '1.5', both labels
 *   2. house bedroom-only     → '3', '-', both labels
 *   3. office Beds-hidden     → no bedrooms label; Baths label present; '1'
 *   4. commercial Baths-only  → no bedrooms label; '2' + Baths label
 *   5. apartment empty basics → '-' x2 + both labels still present
 *
 * Test stack: react-test-renderer + act() (project convention per
 * PropertyCard.specChip.test.tsx:20-23 + StepperInput.test.tsx:8-9 — no RTL,
 * no jest-native).
 *
 * Sibling fence: PropertyCard.specChip.test.tsx is left UNTOUCHED — it pins
 * the 260525-ggp Task 1 read-path fallback as a historical regression fence.
 * This new file lands ALONGSIDE per Phase 8 PATTERNS L26 option (b).
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

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { useTheme } = require('../../theme/ThemeContext');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { useAuth } = require('../../context/AuthContext');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { useLanguage } = require('../../context/LanguageContext');

const setupMocks = () => {
  useTheme.mockReturnValue({
    isDark: false,
    colors: {
      // Cover the tokens PropertyCard reads. Empty strings are fine — tests do
      // not assert color values.
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
  // t mock returns the key verbatim so assertions can match the i18n key.
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

// Collect every rendered Text node's stringified children. Cloned from
// PropertyCard.specChip.test.tsx:111-124 — the canonical text-extraction shape
// for this repo's react-test-renderer assertions.
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
    } else if (typeof c === 'number') {
      out.push(String(c));
    }
  });
  return out;
};

// === Tests ===

describe('PropertyCard Phase-8 specs-strip anatomy (DISP-01 / DISP-02 / DISP-05)', () => {
  test('Case 1: apartment + basics.bedrooms=2 + basics.bathroomCount=1.5 → both values and both labels render', () => {
    const tree = renderCard(
      makeProperty({
        propertyType: 'apartment',
        basics: { bedrooms: 2, bathroomCount: 1.5 },
      }),
    );
    const texts = collectTexts(tree);
    expect(texts).toContain('2');
    expect(texts).toContain('1.5');
    expect(texts).toContain('property.specs.bedrooms');
    expect(texts).toContain('property.specs.bathrooms');
  });

  test('Case 2: house + basics.bedrooms=3 (no bathroomCount) → 3, -, both labels', () => {
    const tree = renderCard(
      makeProperty({
        propertyType: 'house',
        basics: { bedrooms: 3 },
      }),
    );
    const texts = collectTexts(tree);
    expect(texts).toContain('3');
    expect(texts).toContain('-');
    expect(texts).toContain('property.specs.bedrooms');
    expect(texts).toContain('property.specs.bathrooms');
  });

  test('Case 3: office + basics.bathroomCount=1 → Beds cell hidden (no bedrooms label), Baths cell renders', () => {
    const tree = renderCard(
      makeProperty({
        propertyType: 'office',
        basics: { bathroomCount: 1 },
      }),
    );
    const texts = collectTexts(tree);
    // D-02 invariant: Beds cell omitted entirely on office/commercial.
    expect(texts).not.toContain('property.specs.bedrooms');
    // Baths cell still renders.
    expect(texts).toContain('1');
    expect(texts).toContain('property.specs.bathrooms');
  });

  test('Case 4: commercial + basics.bathroomCount=2 → Beds cell hidden, integer Baths render', () => {
    const tree = renderCard(
      makeProperty({
        propertyType: 'commercial',
        basics: { bathroomCount: 2 },
      }),
    );
    const texts = collectTexts(tree);
    expect(texts).not.toContain('property.specs.bedrooms');
    expect(texts).toContain('2');
    expect(texts).toContain('property.specs.bathrooms');
  });

  test('Case 5: apartment + empty basics → "-" x2, both labels present', () => {
    const tree = renderCard(
      makeProperty({
        propertyType: 'apartment',
        basics: {},
      }),
    );
    const texts = collectTexts(tree);
    expect(texts).toContain('property.specs.bedrooms');
    expect(texts).toContain('property.specs.bathrooms');
    // Both cells fall through to '-'.
    const dashCount = texts.filter((s) => s === '-').length;
    expect(dashCount).toBeGreaterThanOrEqual(2);
  });
});

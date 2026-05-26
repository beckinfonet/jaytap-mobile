/**
 * src/components/__tests__/ListingMetaTable.test.tsx
 *
 * Phase 8 Plan 08-05 Task 2 — surgical-removal regression fence + happy-path
 * extras coverage for ListingMetaTable. NEW co-located test file (no prior
 * suite existed for this component).
 *
 * Pins Task 1's four-edit cleanup:
 *   - The `rooms != null && ...` JSX row block (deleted)
 *   - The `bathroom != null && ...` JSX row block (deleted; including the
 *     private/shared/none enum-resolution branch)
 *   - The `const rooms` / `const bathroom` derivations (deleted)
 *   - The `rooms` + `bathroom` links in the `hasExtras` chain (deleted)
 *
 * Mirrors 260525-i2i precedent (commit 15f1010): zero-replacement deletion of
 * the duplicate `m²` row from the same extras grid. After Phase 8 plan 04,
 * PropertyDetailsScreen's canonical specs row is the sole beds/baths surface.
 *
 * Pattern: react-test-renderer + act (no RTL / no jest-native — project
 * convention per PropertyCard.specChip.test.tsx L20-23 + StepperInput.test.tsx).
 * The `t` mock returns the i18n key VERBATIM, so all "row is absent" assertions
 * check for the literal key strings (e.g. `'property.beds'`) — not resolved EN
 * values (which would never appear under this mock convention and would mask
 * regressions).
 */

import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import { ListingMetaTable } from '../ListingMetaTable';
import type { Property } from '../../types/Property';

// === Mocks ===

jest.mock('../../theme/ThemeContext', () => ({ useTheme: jest.fn() }));
jest.mock('../../context/LanguageContext', () => ({ useLanguage: jest.fn() }));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { useTheme } = require('../../theme/ThemeContext');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { useLanguage } = require('../../context/LanguageContext');

const setupMocks = () => {
  useTheme.mockReturnValue({
    isDark: false,
    colors: {
      // Tokens read by ListingMetaTable (table border / background, text
      // colors). Empty strings are fine — assertions never inspect colors.
      text: '',
      textSecondary: '',
      surface: '',
      border: '',
      chipBackground: '',
    },
  });
  // ListingMetaTable destructures `t` + `language` from useLanguage().
  // Return the key verbatim so literal-key-string absence assertions are
  // deterministic (per t-mock-key-verbatim convention used in
  // PropertyCard.specChip.test.tsx).
  useLanguage.mockReturnValue({
    t: (key: string) => key,
    language: 'en',
  });
};

beforeEach(() => {
  jest.clearAllMocks();
  setupMocks();
});

// === Helpers ===

const makeProperty = (overrides: Partial<Property> = {}): Property =>
  ({
    id: 'p1',
    propertyType: 'apartment',
    content: { title: 'Test' },
    ...overrides,
  } as unknown as Property);

const renderMeta = (property: Property): TestRenderer.ReactTestRenderer => {
  let tree!: TestRenderer.ReactTestRenderer;
  act(() => {
    tree = TestRenderer.create(<ListingMetaTable property={property} />);
  });
  return tree;
};

// Collect every rendered Text node's stringified children. Clone of the
// helper in PropertyCard.specChip.test.tsx:111-124 — flattens Text children
// (string OR array of strings) so substring searches work over the whole
// rendered text surface.
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

describe('ListingMetaTable — Phase 8 Plan 08-05 surgical-removal regression fence', () => {
  // === Test 1 — Regression fence for Edit 1 ===
  test('rooms-only property does NOT render a Beds row AND the extras grid is gated off', () => {
    const tree = renderMeta(
      makeProperty({
        basics: { rooms: '3' },
      }),
    );
    const texts = collectTexts(tree);

    // Edit 1 verified: no `property.beds` consumer fires anywhere in the tree.
    expect(texts.some((s) => s.includes('property.beds'))).toBe(false);

    // Edit 4 verified: rooms no longer contributes to `hasExtras`, so without
    // other extras the entire extras grid is gated off. We check NEGATIVE: no
    // value `'3'` leaks from a rooms row, AND no other extras label appears.
    expect(texts.some((s) => s === '3')).toBe(false);
    expect(texts.some((s) => s.includes('property.metaCondition'))).toBe(false);
  });

  // === Test 2 — Regression fence for Edit 2 ===
  test('bathroom-only property does NOT render a Baths row AND no enum-resolution key appears', () => {
    const tree = renderMeta(
      makeProperty({
        basics: { bathroom: 'private' },
      }),
    );
    const texts = collectTexts(tree);

    // Edit 2 verified: no `property.baths` consumer fires.
    expect(texts.some((s) => s.includes('property.baths'))).toBe(false);

    // Enum-branch dead: the deleted block's t('property.bathroomPrivate')
    // call site no longer exists, so the key never appears in the tree.
    expect(texts.some((s) => s.includes('property.bathroomPrivate'))).toBe(false);
    expect(texts.some((s) => s.includes('property.bathroomShared'))).toBe(false);
    expect(texts.some((s) => s.includes('property.bathroomNone'))).toBe(false);
  });

  // === Test 3 — Combined regression: rooms + bathroom together ===
  test('rooms + bathroom only does NOT render either row; extras grid stays gated off', () => {
    const tree = renderMeta(
      makeProperty({
        basics: { rooms: '2', bathroom: 'shared' },
      }),
    );
    const texts = collectTexts(tree);

    // Both deleted row consumers must be absent. Using LITERAL i18n key strings
    // is load-bearing — under the t-mock-key-verbatim convention, asserting on
    // resolved EN values ('Beds:' / 'Baths:') would always be false and would
    // silently mask a regression even if the row block were re-introduced.
    expect(texts.some((s) => s.includes('property.beds'))).toBe(false);
    expect(texts.some((s) => s.includes('property.baths'))).toBe(false);
    expect(texts.some((s) => s.includes('property.bathroomShared'))).toBe(false);

    // The values themselves also do not leak — proves the rows are gone, not
    // just the labels.
    expect(texts.some((s) => s === '2')).toBe(false);
  });

  // === Test 4 — Proves rooms no longer contributes; deposit still renders ===
  test('rooms + deposit renders ONLY the deposit row (rooms no longer contributes to hasExtras)', () => {
    const tree = renderMeta(
      makeProperty({
        basics: { rooms: '3' },
        terms: { deposit: { amount: 1000, currency: 'KGS' } },
      }),
    );
    const texts = collectTexts(tree);

    // Deposit row renders (hasExtras true via deposit contributor).
    expect(texts.some((s) => s.includes('property.metaDeposit'))).toBe(true);
    // Deposit value parts surface — the currency segment `'KGS'` lands in the
    // text tree (children are interpolated as `[label, ': ', amount, ' ', currency]`;
    // collectTexts captures string segments only, which is sufficient to
    // sentinel the row's value-side render).
    expect(texts.some((s) => s.includes('KGS'))).toBe(true);

    // Rooms row stays gone.
    expect(texts.some((s) => s.includes('property.beds'))).toBe(false);
  });

  // === Test 5 — Proves bathroom no longer contributes; condition still renders ===
  test('bathroom + condition renders ONLY the condition row (bathroom no longer contributes to hasExtras)', () => {
    const tree = renderMeta(
      makeProperty({
        basics: { bathroom: 'shared' },
        conditionAndAmenities: { condition: 'good' },
      }),
    );
    const texts = collectTexts(tree);

    // Condition row renders (hasExtras true via condition contributor).
    expect(texts.some((s) => s.includes('property.metaCondition'))).toBe(true);
    // Condition value `'good'` surfaces.
    expect(texts.some((s) => s === 'good')).toBe(true);

    // Bathroom row + enum-resolution key both stay gone.
    expect(texts.some((s) => s.includes('property.baths'))).toBe(false);
    expect(texts.some((s) => s.includes('property.bathroomShared'))).toBe(false);
  });

  // === Test 6 — All other extras render; no collateral damage ===
  test('all 7 other extras render correctly when present; no rooms/bathroom rows', () => {
    const tree = renderMeta(
      makeProperty({
        basics: { areaSqm: 50 },
        conditionAndAmenities: { condition: 'euro', furnished: true },
        terms: {
          negotiable: true,
          deposit: { amount: 500, currency: 'USD' },
          prepaymentMonths: 2,
          minTerm: '3_months',
        },
      }),
    );
    const texts = collectTexts(tree);

    // Each remaining extras-row label appears.
    expect(texts.some((s) => s.includes('property.metaCondition'))).toBe(true);
    expect(texts.some((s) => s.includes('property.metaFurnishedYes'))).toBe(true);
    expect(texts.some((s) => s.includes('property.metaMinTerm'))).toBe(true);
    expect(texts.some((s) => s.includes('property.metaDeposit'))).toBe(true);
    expect(texts.some((s) => s.includes('property.metaPrepayment'))).toBe(true);
    expect(texts.some((s) => s.includes('property.metaNegotiable'))).toBe(true);

    // Condition value `'euro'` surfaces (sentinel that one extras row's value
    // also lands, not just its label).
    expect(texts.some((s) => s === 'euro')).toBe(true);

    // No collateral damage: rooms + bathroom rows + enum keys all stay gone.
    expect(texts.some((s) => s.includes('property.beds'))).toBe(false);
    expect(texts.some((s) => s.includes('property.baths'))).toBe(false);
    expect(texts.some((s) => s.includes('property.bathroomPrivate'))).toBe(false);
    expect(texts.some((s) => s.includes('property.bathroomShared'))).toBe(false);
    expect(texts.some((s) => s.includes('property.bathroomNone'))).toBe(false);
  });
});

/**
 * Breadcrumb test — collapse rule + chevron separators.
 *
 * Phase 14 Plan 14-01 (FILT-01). Pattern: react-test-renderer + act +
 * jest.mock theme/language (KeyStatsCard.test.tsx convention).
 */
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import { ChevronRight } from 'lucide-react-native';

jest.mock('../../../../theme/ThemeContext', () => ({ useTheme: jest.fn() }));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { useTheme } = require('../../../../theme/ThemeContext');
import Breadcrumb from '../Breadcrumb';

beforeEach(() => {
  jest.clearAllMocks();
  useTheme.mockReturnValue({
    isDark: true,
    colors: {
      text: '#f4f4f6',
      textTertiary: 'rgba(244,244,246,0.40)',
    },
  });
});

const renderBC = (props: {
  deal: 'Rent' | 'Buy' | null;
  category: 'Residential' | 'Commercial' | 'Hospitality' | null;
  types: string[];
}) => {
  let tree!: TestRenderer.ReactTestRenderer;
  act(() => {
    tree = TestRenderer.create(<Breadcrumb {...props} />);
  });
  return tree;
};

const textOf = (tree: TestRenderer.ReactTestRenderer): string[] =>
  tree.root
    .findAllByType(Text)
    .map((n) => (Array.isArray(n.props.children) ? n.props.children.join('') : String(n.props.children ?? '')));

const chevronCount = (tree: TestRenderer.ReactTestRenderer): number =>
  tree.root.findAllByType(ChevronRight).length;

describe('Breadcrumb', () => {
  test('renders an empty row when all props are null/empty', () => {
    const tree = renderBC({ deal: null, category: null, types: [] });
    expect(textOf(tree)).toEqual([]);
    expect(chevronCount(tree)).toBe(0);
  });

  test('renders only the deal label when deal is set; 0 chevrons', () => {
    const tree = renderBC({ deal: 'Rent', category: null, types: [] });
    const texts = textOf(tree);
    expect(texts).toContain('Rent');
    expect(texts.length).toBe(1);
    expect(chevronCount(tree)).toBe(0);
  });

  test('renders deal + category + single type: 3 labels, 2 chevrons', () => {
    const tree = renderBC({
      deal: 'Buy',
      category: 'Residential',
      types: ['Apartment'],
    });
    const texts = textOf(tree);
    expect(texts).toContain('Buy');
    expect(texts).toContain('Residential');
    expect(texts).toContain('Apartment');
    expect(texts.length).toBe(3);
    expect(chevronCount(tree)).toBe(2);
  });

  test('collapses N>1 types to "{first} +{N-1}": 3 labels, 2 chevrons', () => {
    const tree = renderBC({
      deal: 'Rent',
      category: 'Residential',
      types: ['Apartment', 'House', 'Townhome'],
    });
    const texts = textOf(tree);
    expect(texts).toContain('Apartment +2');
    expect(texts).toContain('Rent');
    expect(texts).toContain('Residential');
    expect(texts.length).toBe(3);
    expect(chevronCount(tree)).toBe(2);
  });
});

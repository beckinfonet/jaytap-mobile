/**
 * SectionLabel test — typography + action-slot wiring.
 *
 * Phase 15 Plan 15-01 (SET-01 / D-12). Pattern: react-test-renderer + act +
 * jest.mock theme context (CheckSquare.test.tsx convention).
 */
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';

jest.mock('../../theme/ThemeContext', () => ({ useTheme: jest.fn() }));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { useTheme } = require('../../theme/ThemeContext');
import SectionLabel from '../SectionLabel';

beforeEach(() => {
  jest.clearAllMocks();
  useTheme.mockReturnValue({
    isDark: true,
    colors: {
      textTertiary: 'rgba(244,244,246,0.40)',
    },
  });
});

const findTexts = (root: TestRenderer.ReactTestInstance): string[] =>
  root
    .findAllByType(Text)
    .map((n) => (Array.isArray(n.props.children) ? n.props.children.join('') : String(n.props.children ?? '')));

describe('SectionLabel', () => {
  test('renders the uppercase label text', () => {
    let tree!: TestRenderer.ReactTestRenderer;
    act(() => {
      tree = TestRenderer.create(<SectionLabel>ACCOUNT</SectionLabel>);
    });
    expect(findTexts(tree.root)).toContain('ACCOUNT');
  });

  test('renders the action slot when provided', () => {
    let tree!: TestRenderer.ReactTestRenderer;
    act(() => {
      tree = TestRenderer.create(
        <SectionLabel action={<Text testID="action-slot">EditLink</Text>}>ACCOUNT</SectionLabel>
      );
    });
    // The action slot adds a second Text node (the label is always present).
    expect(tree.root.findAllByType(Text)).toHaveLength(2);
    expect(findTexts(tree.root)).toContain('EditLink');
  });

  test('omits the action slot when no action prop', () => {
    let tree!: TestRenderer.ReactTestRenderer;
    act(() => {
      tree = TestRenderer.create(<SectionLabel>ACCOUNT</SectionLabel>);
    });
    // Only one Text node — the label itself.
    expect(tree.root.findAllByType(Text)).toHaveLength(1);
  });
});

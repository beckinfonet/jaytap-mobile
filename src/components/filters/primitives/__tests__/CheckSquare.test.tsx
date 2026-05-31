/**
 * CheckSquare test — checked / unchecked visual states.
 *
 * Phase 14 Plan 14-01 (FILT-01). Pattern: react-test-renderer + act +
 * jest.mock theme context (KeyStatsCard.test.tsx convention).
 */
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';

jest.mock('../../../../theme/ThemeContext', () => ({ useTheme: jest.fn() }));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { useTheme } = require('../../../../theme/ThemeContext');
import CheckSquare from '../CheckSquare';

beforeEach(() => {
  jest.clearAllMocks();
  useTheme.mockReturnValue({
    isDark: true,
    colors: {
      accent: '#ff5a6f',
      hair2: 'rgba(255,255,255,0.14)',
    },
  });
});

const findTexts = (root: TestRenderer.ReactTestInstance): string[] =>
  root
    .findAllByType(Text)
    .map((n) => (Array.isArray(n.props.children) ? n.props.children.join('') : String(n.props.children ?? '')));

describe('CheckSquare', () => {
  test('renders the check glyph when checked=true', () => {
    let tree!: TestRenderer.ReactTestRenderer;
    act(() => {
      tree = TestRenderer.create(<CheckSquare checked={true} />);
    });
    expect(findTexts(tree.root)).toContain('✓');
  });

  test('does NOT render the check glyph when checked=false', () => {
    let tree!: TestRenderer.ReactTestRenderer;
    act(() => {
      tree = TestRenderer.create(<CheckSquare checked={false} />);
    });
    expect(findTexts(tree.root)).not.toContain('✓');
  });
});

/**
 * RoleBadge test — accent-soft pill with Shield icon + uppercase role text.
 *
 * Phase 16 Plan 16-01 (PROF-02 / D-04). Pattern: react-test-renderer + act.
 *
 * Cases:
 *   1. Renders the passed label text.
 *   2. Contains a Shield lucide icon (via tree.root.findAllByType).
 */
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import { Shield } from 'lucide-react-native';

jest.mock('../../../theme/ThemeContext', () => ({ useTheme: jest.fn() }));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { useTheme } = require('../../../theme/ThemeContext');
import RoleBadge from '../RoleBadge';

const defaultColors = {
  accent: '#ff5a6f',
  accentSoft: 'rgba(255,90,111,0.16)',
  text: '#f4f4f6',
};

beforeEach(() => {
  jest.clearAllMocks();
  useTheme.mockReturnValue({ isDark: true, colors: defaultColors });
});

const findTexts = (root: TestRenderer.ReactTestInstance): string[] =>
  root
    .findAllByType(Text)
    .map((n) => (Array.isArray(n.props.children) ? n.props.children.join('') : String(n.props.children ?? '')));

describe('RoleBadge', () => {
  test('renders the passed label text', () => {
    let tree!: TestRenderer.ReactTestRenderer;
    act(() => {
      tree = TestRenderer.create(<RoleBadge role="admin" label="ADMIN" />);
    });
    expect(findTexts(tree.root)).toContain('ADMIN');
  });

  test('contains a Shield lucide icon', () => {
    let tree!: TestRenderer.ReactTestRenderer;
    act(() => {
      tree = TestRenderer.create(<RoleBadge role="moderator" label="MODERATOR" />);
    });
    // The Shield component is rendered as a child of the badge container.
    const shields = tree.root.findAllByType(Shield);
    expect(shields.length).toBeGreaterThanOrEqual(1);
  });
});

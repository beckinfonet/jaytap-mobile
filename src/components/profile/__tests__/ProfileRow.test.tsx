/**
 * ProfileRow test — 38px icon-chip + label/sub + chevron primitive.
 *
 * Phase 16 Plan 16-01 (PROF-01/02). Pattern: react-test-renderer + act
 * (FilterStyleRow.test.tsx convention — useTheme jest.mock + findPressableByLabel).
 *
 * Cases:
 *   1. Renders the passed title and sub strings.
 *   2. Tapping the Pressable invokes onPress exactly once.
 */
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import { Heart } from 'lucide-react-native';

jest.mock('../../../theme/ThemeContext', () => ({ useTheme: jest.fn() }));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { useTheme } = require('../../../theme/ThemeContext');
import ProfileRow from '../ProfileRow';

const defaultColors = {
  surface: '#1c1c20',
  surface2: '#26262c',
  text: '#f4f4f6',
  textSecondary: 'rgba(244,244,246,0.60)',
  textTertiary: 'rgba(244,244,246,0.40)',
  iconChipFg: 'rgba(244,244,246,0.85)',
  accent: '#ff5a6f',
  accentSoft: 'rgba(255,90,111,0.16)',
  onAccent: '#FFFFFF',
};

beforeEach(() => {
  jest.clearAllMocks();
  useTheme.mockReturnValue({ isDark: true, colors: defaultColors });
});

const findTexts = (root: TestRenderer.ReactTestInstance): string[] =>
  root
    .findAllByType(Text)
    .map((n) => (Array.isArray(n.props.children) ? n.props.children.join('') : String(n.props.children ?? '')));

const findPressableByLabel = (
  tree: TestRenderer.ReactTestRenderer,
  label: string,
): TestRenderer.ReactTestInstance | undefined =>
  tree.root.find(
    (n) =>
      !!n.props &&
      n.props.accessibilityRole === 'button' &&
      n.props.accessibilityLabel === label,
  );

describe('ProfileRow', () => {
  test('renders the title and sub strings', () => {
    let tree!: TestRenderer.ReactTestRenderer;
    act(() => {
      tree = TestRenderer.create(
        <ProfileRow Icon={Heart} title="Favorites" sub="Saved properties" onPress={() => {}} />,
      );
    });
    const texts = findTexts(tree.root);
    expect(texts).toContain('Favorites');
    expect(texts).toContain('Saved properties');
  });

  test('tapping invokes onPress exactly once', () => {
    const onPress = jest.fn();
    let tree!: TestRenderer.ReactTestRenderer;
    act(() => {
      tree = TestRenderer.create(
        <ProfileRow Icon={Heart} title="Favorites" sub="Saved properties" onPress={onPress} />,
      );
    });
    const pressable = findPressableByLabel(tree, 'Favorites');
    expect(pressable).toBeDefined();
    act(() => {
      pressable!.props.onPress();
    });
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

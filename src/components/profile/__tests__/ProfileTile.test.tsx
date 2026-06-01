/**
 * ProfileTile test — 2×2-grid tile primitive with vertical-stack inner layout.
 *
 * Phase 16 Plan 16-01 (PROF-02). Pattern: react-test-renderer + act.
 *
 * Cases:
 *   1. Default tile renders title + sub.
 *   2. accent={true} variant: outer style uses colors.accent (background).
 *   3. No-sub variant: omitting sub does not render a second Text under the title.
 */
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import { Heart, Plus } from 'lucide-react-native';

jest.mock('../../../theme/ThemeContext', () => ({ useTheme: jest.fn() }));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { useTheme } = require('../../../theme/ThemeContext');
import ProfileTile from '../ProfileTile';

const defaultColors = {
  surface: '#1c1c20',
  surface2: '#26262c',
  border: 'rgba(255,255,255,0.08)',
  text: '#f4f4f6',
  textSecondary: 'rgba(244,244,246,0.60)',
  textTertiary: 'rgba(244,244,246,0.40)',
  iconChipFg: 'rgba(244,244,246,0.85)',
  accent: '#ff5a6f',
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

/** Recursively flatten any style value into an array of style objects. */
const flattenStyle = (style: any): Array<Record<string, unknown>> => {
  if (!style) return [];
  if (Array.isArray(style)) return style.flatMap(flattenStyle);
  if (typeof style === 'object') return [style];
  return [];
};

const styleHas = (
  node: TestRenderer.ReactTestInstance | undefined,
  key: string,
  value: unknown,
): boolean => {
  if (!node) return false;
  return flattenStyle(node.props.style).some((s) => s && s[key] === value);
};

describe('ProfileTile', () => {
  test('default tile renders title + sub', () => {
    let tree!: TestRenderer.ReactTestRenderer;
    act(() => {
      tree = TestRenderer.create(
        <ProfileTile Icon={Heart} title="Favorites" sub="Saved properties" onPress={() => {}} />,
      );
    });
    const texts = findTexts(tree.root);
    expect(texts).toContain('Favorites');
    expect(texts).toContain('Saved properties');
  });

  test('accent={true} variant uses colors.accent for background', () => {
    let tree!: TestRenderer.ReactTestRenderer;
    act(() => {
      tree = TestRenderer.create(
        <ProfileTile Icon={Plus} title="Create Listing" sub="New property" accent onPress={() => {}} />,
      );
    });
    const pressable = findPressableByLabel(tree, 'Create Listing');
    expect(pressable).toBeDefined();
    expect(styleHas(pressable, 'backgroundColor', defaultColors.accent)).toBe(true);
  });

  test('omitting sub does not render a second Text under the title', () => {
    let tree!: TestRenderer.ReactTestRenderer;
    act(() => {
      tree = TestRenderer.create(
        <ProfileTile Icon={Heart} title="Favorites" onPress={() => {}} />,
      );
    });
    const texts = findTexts(tree.root);
    expect(texts).toContain('Favorites');
    // Only the title Text is present; no sub. Length === 1.
    expect(texts.length).toBe(1);
  });
});

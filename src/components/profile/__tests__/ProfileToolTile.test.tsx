/**
 * ProfileToolTile test — admin-tools tile primitive with pendingCount badge + wide override.
 *
 * Phase 16 Plan 16-01 (PROF-02 / D-05). Pattern: react-test-renderer + act.
 *
 * Cases:
 *   1. badge={0} → no badge view rendered.
 *   2. badge={5} → badge view rendered containing "5".
 *   3. badge={undefined} → no badge view rendered.
 *   4. wide={true} → tile root style includes width '100%';
 *      wide={false} (default) → tile root width is '48%' (or minWidth).
 */
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import { Inbox } from 'lucide-react-native';

jest.mock('../../../theme/ThemeContext', () => ({ useTheme: jest.fn() }));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { useTheme } = require('../../../theme/ThemeContext');
import ProfileToolTile from '../ProfileToolTile';

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

describe('ProfileToolTile', () => {
  test('badge={0} renders no badge view', () => {
    let tree!: TestRenderer.ReactTestRenderer;
    act(() => {
      tree = TestRenderer.create(
        <ProfileToolTile Icon={Inbox} title="Moderation" sub="Pending" badge={0} onPress={() => {}} />,
      );
    });
    const texts = findTexts(tree.root);
    expect(texts).not.toContain('0');
  });

  test('badge={5} renders badge containing "5"', () => {
    let tree!: TestRenderer.ReactTestRenderer;
    act(() => {
      tree = TestRenderer.create(
        <ProfileToolTile Icon={Inbox} title="Moderation" sub="Pending" badge={5} onPress={() => {}} />,
      );
    });
    const texts = findTexts(tree.root);
    expect(texts).toContain('5');
  });

  test('badge={undefined} renders no badge view', () => {
    let tree!: TestRenderer.ReactTestRenderer;
    act(() => {
      tree = TestRenderer.create(
        <ProfileToolTile Icon={Inbox} title="Moderation" sub="Pending" onPress={() => {}} />,
      );
    });
    const texts = findTexts(tree.root);
    // Only title + sub texts (2). No numeric badge text.
    expect(texts).toEqual(expect.arrayContaining(['Moderation', 'Pending']));
    expect(texts.filter((t) => /^\d+$/.test(t))).toEqual([]);
  });

  test('wide={true} → width 100%; wide={false}/omitted → 48% (or minWidth 48%)', () => {
    let wideTree!: TestRenderer.ReactTestRenderer;
    act(() => {
      wideTree = TestRenderer.create(
        <ProfileToolTile Icon={Inbox} title="Roles" sub="Staff" wide onPress={() => {}} />,
      );
    });
    const widePressable = findPressableByLabel(wideTree, 'Roles');
    expect(widePressable).toBeDefined();
    expect(styleHas(widePressable, 'width', '100%')).toBe(true);

    let narrowTree!: TestRenderer.ReactTestRenderer;
    act(() => {
      narrowTree = TestRenderer.create(
        <ProfileToolTile Icon={Inbox} title="Roles" sub="Staff" onPress={() => {}} />,
      );
    });
    const narrowPressable = findPressableByLabel(narrowTree, 'Roles');
    expect(narrowPressable).toBeDefined();
    // Either `width: '48%'` or `minWidth: '48%'` is acceptable per plan.
    const hasNarrowWidth =
      styleHas(narrowPressable, 'width', '48%') ||
      styleHas(narrowPressable, 'minWidth', '48%');
    expect(hasNarrowWidth).toBe(true);
  });
});

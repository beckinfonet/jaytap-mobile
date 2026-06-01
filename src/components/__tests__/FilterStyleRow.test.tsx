/**
 * src/components/__tests__/FilterStyleRow.test.tsx
 *
 * Phase 15 Plan 15-02 (SET-02) — FilterStyleRow picker component test.
 *
 * Covers (10 cases, ≥ 8 per CONTEXT.md D-15 Plan 15-02 acceptance):
 *   1. collapsed state shows current style label at right edge (Guided default)
 *   2. tapping the collapsed row opens the expanded body (4 sub-rows appear)
 *   3. expanded state lists 4 rows with correct accessibility labels
 *   4. tap on Guided row writes via setFilterStyle('guided')
 *   5. tap on Cascading row writes via setFilterStyle('cascading')
 *   6. tap on Master row is a no-op (Pressable disabled, onPress undefined)
 *   7. tap on Sentence row is a no-op (Pressable disabled, onPress undefined)
 *   8. "Coming soon" badge renders on exactly 2 disabled rows
 *   9. rendering with filterStyle='cascading' shows Cascading as selected
 *  10. chevron Animated.View receives a transform with rotateZ
 *
 * Pattern: react-test-renderer + act (project convention — no @testing-library/react-native).
 * Mocks: useTheme + useLanguage + useFilterStyle (the 3 hooks the component reads).
 */

import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';

jest.mock('../../theme/ThemeContext', () => ({ useTheme: jest.fn() }));
jest.mock('../../context/LanguageContext', () => ({ useLanguage: jest.fn() }));
jest.mock('../../context/FilterStyleContext', () => ({
  useFilterStyle: jest.fn(),
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { useTheme } = require('../../theme/ThemeContext');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { useLanguage } = require('../../context/LanguageContext');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { useFilterStyle } = require('../../context/FilterStyleContext');

import FilterStyleRow from '../FilterStyleRow';

const defaultColors = {
  background: '#121214',
  surface: '#1c1c20',
  surface2: '#26262c',
  hair2: 'rgba(255,255,255,0.14)',
  text: '#f4f4f6',
  textSecondary: 'rgba(244,244,246,0.60)',
  textTertiary: 'rgba(244,244,246,0.40)',
  iconChipFg: 'rgba(244,244,246,0.85)',
  accent: '#ff5a6f',
  accentSoft: 'rgba(255,90,111,0.16)',
  accentLine: 'rgba(255,90,111,0.45)',
  onAccent: '#FFFFFF',
};

let mockSetFilterStyle: jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockSetFilterStyle = jest.fn().mockResolvedValue(undefined);
  useTheme.mockReturnValue({ isDark: true, colors: defaultColors });
  useLanguage.mockReturnValue({ t: (k: string) => k, language: 'en' });
  useFilterStyle.mockReturnValue({
    filterStyle: 'guided',
    setFilterStyle: mockSetFilterStyle,
  });
});

/** Collect all Text-children strings flattened to single strings. */
const collectTexts = (root: TestRenderer.ReactTestInstance): string[] =>
  root.findAllByType(Text).map((n) => {
    const c = n.props.children;
    return Array.isArray(c) ? c.join('') : String(c ?? '');
  });

/** Find a Pressable (accessibilityRole='button') by its accessibilityLabel. */
const findPressableByLabel = (
  tree: TestRenderer.ReactTestRenderer,
  label: string,
): TestRenderer.ReactTestInstance | undefined => {
  return tree.root.find(
    (n) =>
      !!n.props &&
      n.props.accessibilityRole === 'button' &&
      n.props.accessibilityLabel === label,
  );
};

const renderRow = (): TestRenderer.ReactTestRenderer => {
  let tree!: TestRenderer.ReactTestRenderer;
  act(() => {
    tree = TestRenderer.create(<FilterStyleRow />);
  });
  return tree;
};

describe('FilterStyleRow', () => {
  test('collapsed state shows current style label (guided) at right edge', () => {
    const tree = renderRow();
    const texts = collectTexts(tree.root);
    // Title + subtitle + right-edge label all present
    expect(texts).toContain('accountSettings.filterPicker.title');
    expect(texts).toContain('accountSettings.filterPicker.subtitle');
    expect(texts).toContain('filters.style.guided');
    // Collapsed — the OTHER 3 style labels should NOT be in expanded body yet
    expect(texts).not.toContain('filters.style.cascading');
    expect(texts).not.toContain('filters.style.master');
    expect(texts).not.toContain('filters.style.sentence');
  });

  test('tapping the collapsed row opens the expanded body', () => {
    const tree = renderRow();
    const collapsedRow = findPressableByLabel(tree, 'accountSettings.filterPicker.title');
    expect(collapsedRow).toBeDefined();
    act(() => {
      collapsedRow!.props.onPress();
    });
    // After open, 4 sub-row Pressables exist
    expect(findPressableByLabel(tree, 'filters.style.guided')).toBeDefined();
    expect(findPressableByLabel(tree, 'filters.style.cascading')).toBeDefined();
    expect(findPressableByLabel(tree, 'filters.style.master')).toBeDefined();
    expect(findPressableByLabel(tree, 'filters.style.sentence')).toBeDefined();
  });

  test('expanded state lists 4 rows with correct accessibilityLabels', () => {
    const tree = renderRow();
    const collapsedRow = findPressableByLabel(tree, 'accountSettings.filterPicker.title');
    act(() => {
      collapsedRow!.props.onPress();
    });
    const subRowLabels = [
      'filters.style.guided',
      'filters.style.cascading',
      'filters.style.master',
      'filters.style.sentence',
    ];
    subRowLabels.forEach((label) => {
      const row = findPressableByLabel(tree, label);
      expect(row).toBeDefined();
    });
    // Description texts are present too
    const texts = collectTexts(tree.root);
    expect(texts).toContain('filters.style.guidedDesc');
    expect(texts).toContain('filters.style.cascadingDesc');
    expect(texts).toContain('filters.style.masterDesc');
    expect(texts).toContain('filters.style.sentenceDesc');
  });

  test('tap on Guided row writes via setFilterStyle("guided")', () => {
    const tree = renderRow();
    act(() => {
      findPressableByLabel(tree, 'accountSettings.filterPicker.title')!.props.onPress();
    });
    const guidedRow = findPressableByLabel(tree, 'filters.style.guided');
    expect(guidedRow).toBeDefined();
    expect(guidedRow!.props.onPress).toBeDefined();
    act(() => {
      guidedRow!.props.onPress();
    });
    expect(mockSetFilterStyle).toHaveBeenCalledWith('guided');
  });

  test('tap on Cascading row writes via setFilterStyle("cascading")', () => {
    const tree = renderRow();
    act(() => {
      findPressableByLabel(tree, 'accountSettings.filterPicker.title')!.props.onPress();
    });
    const cascadingRow = findPressableByLabel(tree, 'filters.style.cascading');
    expect(cascadingRow).toBeDefined();
    expect(cascadingRow!.props.onPress).toBeDefined();
    act(() => {
      cascadingRow!.props.onPress();
    });
    expect(mockSetFilterStyle).toHaveBeenCalledWith('cascading');
  });

  test('tap on Master row is a no-op (onPress undefined, disabled true)', () => {
    const tree = renderRow();
    act(() => {
      findPressableByLabel(tree, 'accountSettings.filterPicker.title')!.props.onPress();
    });
    const masterRow = findPressableByLabel(tree, 'filters.style.master');
    expect(masterRow).toBeDefined();
    expect(masterRow!.props.onPress).toBeUndefined();
    expect(masterRow!.props.disabled).toBe(true);
    expect(masterRow!.props.accessibilityState).toEqual({ disabled: true, selected: false });
    expect(mockSetFilterStyle).not.toHaveBeenCalled();
  });

  test('tap on Sentence row is a no-op (onPress undefined, disabled true)', () => {
    const tree = renderRow();
    act(() => {
      findPressableByLabel(tree, 'accountSettings.filterPicker.title')!.props.onPress();
    });
    const sentenceRow = findPressableByLabel(tree, 'filters.style.sentence');
    expect(sentenceRow).toBeDefined();
    expect(sentenceRow!.props.onPress).toBeUndefined();
    expect(sentenceRow!.props.disabled).toBe(true);
    expect(sentenceRow!.props.accessibilityState).toEqual({ disabled: true, selected: false });
    expect(mockSetFilterStyle).not.toHaveBeenCalled();
  });

  test('"Coming soon" badge renders on exactly 2 disabled rows', () => {
    const tree = renderRow();
    act(() => {
      findPressableByLabel(tree, 'accountSettings.filterPicker.title')!.props.onPress();
    });
    const texts = collectTexts(tree.root);
    const comingSoonCount = texts.filter((s) => s === 'filters.style.comingSoon').length;
    expect(comingSoonCount).toBe(2);
  });

  test('rendering with filterStyle="cascading" shows Cascading as selected', () => {
    useFilterStyle.mockReturnValue({
      filterStyle: 'cascading',
      setFilterStyle: mockSetFilterStyle,
    });
    const tree = renderRow();
    // Right-edge label reflects cascading now
    expect(collectTexts(tree.root)).toContain('filters.style.cascading');
    // Open and assert the cascading row reports selected=true
    act(() => {
      findPressableByLabel(tree, 'accountSettings.filterPicker.title')!.props.onPress();
    });
    const cascadingRow = findPressableByLabel(tree, 'filters.style.cascading');
    expect(cascadingRow!.props.accessibilityState).toEqual({ disabled: false, selected: true });
    const guidedRow = findPressableByLabel(tree, 'filters.style.guided');
    expect(guidedRow!.props.accessibilityState).toEqual({ disabled: false, selected: false });
  });

  test('chevron Animated.View receives a transform with rotateZ', () => {
    const tree = renderRow();
    // The chevron-wrapping Animated.View is the only node whose style.transform
    // contains an entry with a `rotateZ` key.
    const animatedWraps = tree.root.findAll((n) => {
      const style = n.props?.style;
      if (!style || !style.transform) return false;
      const transform = style.transform;
      if (!Array.isArray(transform)) return false;
      return transform.some(
        (entry: Record<string, unknown>) => entry && 'rotateZ' in entry,
      );
    });
    expect(animatedWraps.length).toBeGreaterThanOrEqual(1);
    // The rotateZ value is an Animated.Interpolation object (truthy, non-null).
    const transform = animatedWraps[0].props.style.transform;
    const rotateEntry = transform.find((e: Record<string, unknown>) => e && 'rotateZ' in e);
    expect(rotateEntry.rotateZ).toBeDefined();
  });
});

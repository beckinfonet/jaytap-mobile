/**
 * ShowButton test — pluralization + always-enabled at count=0 (D-14).
 *
 * Phase 14 Plan 14-01 (FILT-01, FILT-02).
 * Quick 260601-dqh — added cases for the new `variant` prop (primary | secondary):
 *  - secondary: raised surface (surface2 bg + border), no shadow, label = colors.text
 *  - primary: accent-tied low-spread shadow + `#fff` label
 *  - D-14 holds for both variants
 */
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { StyleSheet } from 'react-native';

jest.mock('../../../../theme/ThemeContext', () => ({ useTheme: jest.fn() }));
jest.mock('../../../../context/LanguageContext', () => ({ useLanguage: jest.fn() }));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { useTheme } = require('../../../../theme/ThemeContext');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { useLanguage } = require('../../../../context/LanguageContext');
import ShowButton from '../ShowButton';

// Quick 260601-dqh — extended theme mock so the new variant-aware code paths
// can resolve `filterAccent` / `surface2` / `border` / `text`.
const THEME_COLORS = {
  accent: '#ff5a6f',
  filterAccent: '#6f7bff',
  surface2: '#26262c',
  border: 'rgba(255,255,255,0.08)',
  text: '#f4f4f6',
};

beforeEach(() => {
  jest.clearAllMocks();
  useTheme.mockReturnValue({ isDark: true, colors: THEME_COLORS });
});

const setupT = () => {
  const tFn = jest.fn((k: string) => k);
  useLanguage.mockReturnValue({ t: tFn, language: 'en' });
  return tFn;
};

const findByRole = (tree: TestRenderer.ReactTestRenderer, role: string) =>
  tree.root.findAll((n) => !!n.props && n.props.accessibilityRole === role)[0];

describe('ShowButton', () => {
  test('count=1 calls t("filters.showHomes.one")', () => {
    const tFn = setupT();
    act(() => {
      TestRenderer.create(<ShowButton count={1} onPress={jest.fn()} />);
    });
    expect(tFn).toHaveBeenCalledWith('filters.showHomes.one');
  });

  test('count=5 calls t("filters.showHomes.many", { count: "5" })', () => {
    const tFn = setupT();
    act(() => {
      TestRenderer.create(<ShowButton count={5} onPress={jest.fn()} />);
    });
    expect(tFn).toHaveBeenCalledWith('filters.showHomes.many', { count: '5' });
  });

  test('count=0 takes the many path with count: "0" (D-14 always-enabled)', () => {
    const tFn = setupT();
    let tree!: TestRenderer.ReactTestRenderer;
    act(() => {
      tree = TestRenderer.create(<ShowButton count={0} onPress={jest.fn()} />);
    });
    expect(tFn).toHaveBeenCalledWith('filters.showHomes.many', { count: '0' });
    const btn = findByRole(tree, 'button');
    // D-14: no `disabled` prop, no accessibilityState.disabled flag
    expect(btn.props.disabled).toBeUndefined();
    expect(btn.props.accessibilityState).toBeUndefined();
  });

  test('press fires onPress', () => {
    setupT();
    const onPress = jest.fn();
    let tree!: TestRenderer.ReactTestRenderer;
    act(() => {
      tree = TestRenderer.create(<ShowButton count={3} onPress={onPress} />);
    });
    const btn = findByRole(tree, 'button');
    act(() => {
      btn.props.onPress();
    });
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  // ---------- Quick 260601-dqh — variant prop ----------

  /** Resolve a Pressable's style function `({ pressed }) => style[]` to a flat object. */
  const resolveStyle = (btn: TestRenderer.ReactTestInstance) => {
    const raw =
      typeof btn.props.style === 'function'
        ? btn.props.style({ pressed: false })
        : btn.props.style;
    return StyleSheet.flatten(raw) as Record<string, unknown>;
  };

  test('variant="secondary" renders raised surface with border, label colors.text, no shadow (D-14 still always-enabled)', () => {
    setupT();
    let tree!: TestRenderer.ReactTestRenderer;
    act(() => {
      tree = TestRenderer.create(
        <ShowButton count={0} onPress={jest.fn()} variant="secondary" />,
      );
    });
    const btn = findByRole(tree, 'button');
    const flat = resolveStyle(btn);

    // Surface/border contract
    expect(flat.backgroundColor).toBe(THEME_COLORS.surface2);
    expect(flat.borderWidth).toBe(1);
    expect(flat.borderColor).toBe(THEME_COLORS.border);
    // No shadow / elevation on secondary
    expect(flat.shadowColor).toBeUndefined();
    expect(flat.shadowOpacity).toBeUndefined();
    expect(flat.shadowOffset).toBeUndefined();
    expect(flat.shadowRadius).toBeUndefined();
    expect(flat.elevation).toBeUndefined();
    // Height preserved
    expect(flat.height).toBe(54);

    // Label color resolves to colors.text (not '#fff')
    const txt = tree.root.findByType(require('react-native').Text);
    const labelStyle = StyleSheet.flatten(txt.props.style) as Record<string, unknown>;
    expect(labelStyle.color).toBe(THEME_COLORS.text);

    // D-14: stays enabled at count=0; no `disabled` prop, no `accessibilityState.disabled`.
    expect(btn.props.disabled).toBeUndefined();
    expect(btn.props.accessibilityState).toBeUndefined();
  });

  test('variant="primary" (default) keeps accent shadow chain + #fff label', () => {
    setupT();
    let tree!: TestRenderer.ReactTestRenderer;
    act(() => {
      tree = TestRenderer.create(<ShowButton count={3} onPress={jest.fn()} />);
    });
    const btn = findByRole(tree, 'button');
    const flat = resolveStyle(btn);

    expect(flat.backgroundColor).toBe(THEME_COLORS.filterAccent);
    expect(flat.shadowColor).toBe(THEME_COLORS.filterAccent);
    expect(flat.shadowOpacity).toBe(0.28);
    expect(flat.shadowOffset).toEqual({ width: 0, height: 6 });
    expect(flat.shadowRadius).toBe(14);
    expect(flat.elevation).toBe(4);
    expect(flat.height).toBe(54);

    // Label stays #fff on primary (no override)
    const txt = tree.root.findByType(require('react-native').Text);
    const labelStyle = StyleSheet.flatten(txt.props.style) as Record<string, unknown>;
    expect(labelStyle.color).toBe('#fff');
  });
});

/**
 * ShowButton test — pluralization + always-enabled at count=0 (D-14).
 *
 * Phase 14 Plan 14-01 (FILT-01, FILT-02).
 */
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';

jest.mock('../../../../theme/ThemeContext', () => ({ useTheme: jest.fn() }));
jest.mock('../../../../context/LanguageContext', () => ({ useLanguage: jest.fn() }));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { useTheme } = require('../../../../theme/ThemeContext');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { useLanguage } = require('../../../../context/LanguageContext');
import ShowButton from '../ShowButton';

beforeEach(() => {
  jest.clearAllMocks();
  useTheme.mockReturnValue({ isDark: true, colors: { accent: '#ff5a6f' } });
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
});

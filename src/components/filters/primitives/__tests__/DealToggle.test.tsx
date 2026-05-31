/**
 * DealToggle test — Rent/Buy toggle + onChange dispatch.
 *
 * Phase 14 Plan 14-01 (FILT-01, FILT-02). Pattern: react-test-renderer + act +
 * jest.mock theme/language (EmailVerifyBanner.test.tsx convention).
 *
 * NOTE: Animated.timing fires its callback synchronously in test-renderer.
 * Assert only initial + final state, never intermediate frames.
 */
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';

jest.mock('../../../../theme/ThemeContext', () => ({ useTheme: jest.fn() }));
jest.mock('../../../../context/LanguageContext', () => ({ useLanguage: jest.fn() }));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { useTheme } = require('../../../../theme/ThemeContext');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { useLanguage } = require('../../../../context/LanguageContext');
import DealToggle from '../DealToggle';

beforeEach(() => {
  jest.clearAllMocks();
  useTheme.mockReturnValue({
    isDark: true,
    colors: {
      accent: '#ff5a6f',
      surface2: '#26262c',
      textSecondary: 'rgba(244,244,246,0.60)',
    },
  });
  useLanguage.mockReturnValue({
    t: (k: string) => k,
    language: 'en',
  });
});

const findByLabel = (tree: TestRenderer.ReactTestRenderer, label: string) =>
  tree.root.findAll((n) => !!n.props && n.props.accessibilityLabel === label)[0];

describe('DealToggle', () => {
  test('pressing inactive Buy segment fires onChange("Buy")', () => {
    const onChange = jest.fn();
    let tree!: TestRenderer.ReactTestRenderer;
    act(() => {
      tree = TestRenderer.create(
        <DealToggle value="Rent" onChange={onChange} />,
      );
    });
    const buyBtn = findByLabel(tree, 'filters.deal.buy');
    act(() => {
      buyBtn.props.onPress();
    });
    expect(onChange).toHaveBeenCalledWith('Buy');
  });

  test('pressing inactive Rent segment fires onChange("Rent")', () => {
    const onChange = jest.fn();
    let tree!: TestRenderer.ReactTestRenderer;
    act(() => {
      tree = TestRenderer.create(
        <DealToggle value="Buy" onChange={onChange} />,
      );
    });
    const rentBtn = findByLabel(tree, 'filters.deal.rent');
    act(() => {
      rentBtn.props.onPress();
    });
    expect(onChange).toHaveBeenCalledWith('Rent');
  });

  test('reports correct accessibilityState.selected for each segment', () => {
    let tree!: TestRenderer.ReactTestRenderer;
    act(() => {
      tree = TestRenderer.create(
        <DealToggle value="Rent" onChange={jest.fn()} />,
      );
    });
    const rentBtn = findByLabel(tree, 'filters.deal.rent');
    const buyBtn = findByLabel(tree, 'filters.deal.buy');
    expect(rentBtn.props.accessibilityState.selected).toBe(true);
    expect(buyBtn.props.accessibilityState.selected).toBe(false);
  });
});

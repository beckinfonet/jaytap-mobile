/**
 * src/components/__tests__/StepperInput.test.tsx
 *
 * Phase 7 Plan 07-01 Task 2 — co-located unit tests for the StepperInput
 * component (FORM-01 + FORM-03). Covers the 6 D-11 cases locked in
 * 07-CONTEXT.md L84–91.
 *
 * Test stack: react-test-renderer + act() (RTL/jest-native are not in dev
 * deps — project convention per PropertyCard.specChip.test.tsx L20-23).
 *
 * Mocks: useTheme returns sentinel string colors so Test 6 can assert
 * `.toBe('#TS')` on the dim-glyph color.
 */

import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import type { ReactTestInstance } from 'react-test-renderer';
import { StepperInput } from '../StepperInput';

jest.mock('../../theme/ThemeContext', () => ({ useTheme: jest.fn() }));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { useTheme } = require('../../theme/ThemeContext');

// Sentinel color values let Test 6 assert dim-glyph color resolution.
const MOCK_COLORS = {
  text: '#TEXT',
  textSecondary: '#TS',
  border: '#B',
  activeChipBackground: '#A',
  surface: '#S',
  error: '#E',
  warning: '#WARN',
};

beforeEach(() => {
  jest.clearAllMocks();
  useTheme.mockReturnValue({ colors: MOCK_COLORS, isDark: false });
});

function findByTestID(root: ReactTestInstance, testID: string): ReactTestInstance {
  return root.findByProps({ testID });
}

interface RenderProps {
  value: number | undefined;
  onChange?: (v: number | undefined) => void;
  min?: number;
  max?: number;
  step?: number;
  testID?: string;
  label?: string;
}

function render(props: RenderProps): {
  tree: TestRenderer.ReactTestRenderer;
  root: ReactTestInstance;
  onChange: jest.Mock;
} {
  const onChange = (props.onChange ?? jest.fn()) as jest.Mock;
  let tree!: TestRenderer.ReactTestRenderer;
  act(() => {
    tree = TestRenderer.create(
      <StepperInput
        value={props.value}
        onChange={onChange}
        min={props.min ?? 0}
        max={props.max ?? 10}
        step={props.step ?? 1}
        label={props.label ?? 'Bedrooms'}
        testID={props.testID ?? 'stepper'}
      />,
    );
  });
  return { tree, root: tree.root, onChange };
}

describe('StepperInput (Phase 7 Plan 07-01, D-11)', () => {
  // === Test 1 (D-11.1) ===
  test('renders em-dash when value is undefined', () => {
    const { root } = render({ value: undefined });
    const valueCell = findByTestID(root, 'stepper-value');
    expect(valueCell.props.children).toBe('—');
  });

  // === Test 2 (D-11.2) ===
  test('renders integer "5" with step 1 and "1.5" with step 0.5', () => {
    const a = render({ value: 5, step: 1 });
    expect(findByTestID(a.root, 'stepper-value').props.children).toBe('5');

    const b = render({ value: 1.5, step: 0.5 });
    expect(findByTestID(b.root, 'stepper-value').props.children).toBe('1.5');
  });

  // === Test 3 (D-11.3) ===
  test('tap + from undefined calls onChange(min) — verified for min=0 and min=2', async () => {
    const onChange0 = jest.fn();
    const r0 = render({ value: undefined, min: 0, onChange: onChange0 });
    await act(async () => {
      findByTestID(r0.root, 'stepper-plus').props.onPress();
    });
    expect(onChange0).toHaveBeenCalledWith(0);
    expect(onChange0).toHaveBeenCalledTimes(1);

    const onChange2 = jest.fn();
    const r2 = render({ value: undefined, min: 2, max: 10, onChange: onChange2 });
    await act(async () => {
      findByTestID(r2.root, 'stepper-plus').props.onPress();
    });
    expect(onChange2).toHaveBeenCalledWith(2);
    expect(onChange2).toHaveBeenCalledTimes(1);
  });

  // === Test 4 (D-11.4) ===
  test('tap − at value === min is a no-op AND minus button is disabled', async () => {
    const onChange = jest.fn();
    const { root } = render({ value: 0, min: 0, max: 10, onChange });
    const minusBtn = findByTestID(root, 'stepper-minus');
    expect(minusBtn.props.disabled).toBe(true);
    await act(async () => {
      minusBtn.props.onPress();
    });
    expect(onChange).not.toHaveBeenCalled();
  });

  // === Test 5 (D-11.5) ===
  test('tap + at value === max is a no-op AND plus button is disabled', async () => {
    const onChange = jest.fn();
    const { root } = render({ value: 10, min: 0, max: 10, onChange });
    const plusBtn = findByTestID(root, 'stepper-plus');
    expect(plusBtn.props.disabled).toBe(true);
    await act(async () => {
      plusBtn.props.onPress();
    });
    expect(onChange).not.toHaveBeenCalled();
  });

  // === Test 6 (D-11.6 revised — v4.0.1 hotfix) ===
  // Active and disabled both render WHITE glyph on `colors.warning` (amber) circle.
  // Disabled state is signalled by `opacity: 0.4` on the Pressable wrapper, not by
  // changing the glyph color — keeps the +/- always readable at glance distance.
  test('+/- glyphs render white on amber circle in both active and disabled states; disabled adds opacity 0.4 on the Pressable', () => {
    const { root } = render({ value: 0, min: 0, max: 10 });

    const minusBtn = findByTestID(root, 'stepper-minus');
    expect(minusBtn.props.disabled).toBe(true);
    const minusPressableStyle = minusBtn.props.style({ pressed: false }) as Array<Record<string, unknown>>;
    expect(
      minusPressableStyle.some(
        (s) => s && typeof s === 'object' && (s as { opacity?: number }).opacity === 0.4,
      ),
    ).toBe(true);
    const minusGlyphStyle = (minusBtn.findAll((n) => n.type === 'Text')[0].props.style as Array<Record<string, unknown>>) ?? [];
    expect(
      minusGlyphStyle.some(
        (s) => s && typeof s === 'object' && (s as { color?: string }).color === '#FFFFFF',
      ),
    ).toBe(true);

    const plusBtn = findByTestID(root, 'stepper-plus');
    const plusPressableStyle = plusBtn.props.style({ pressed: false }) as Array<Record<string, unknown>>;
    expect(
      plusPressableStyle.some(
        (s) => s && typeof s === 'object' && (s as { opacity?: number }).opacity === 0.4,
      ),
    ).toBe(false); // active button is opacity 1
    const plusGlyphStyle = (plusBtn.findAll((n) => n.type === 'Text')[0].props.style as Array<Record<string, unknown>>) ?? [];
    expect(
      plusGlyphStyle.some(
        (s) => s && typeof s === 'object' && (s as { color?: string }).color === '#FFFFFF',
      ),
    ).toBe(true);
  });

  // === Test 7 (v4.0.1 hotfix — circle uses warning amber, not activeChipBackground) ===
  test('circle backgroundColor pulls colors.warning (brand amber), not colors.activeChipBackground', () => {
    const { root } = render({ value: 2, min: 0, max: 10 });
    const minusBtn = findByTestID(root, 'stepper-minus');
    const circleView = minusBtn.findAll((n) => n.type === 'View').find(
      (v) => (v.props.style as Array<Record<string, unknown>> | undefined)?.some(
        (s) => s && typeof s === 'object' && 'backgroundColor' in s,
      ),
    );
    const circleStyle = (circleView!.props.style as Array<Record<string, unknown>>) ?? [];
    expect(
      circleStyle.some(
        (s) => s && typeof s === 'object' && (s as { backgroundColor?: string }).backgroundColor === '#WARN',
      ),
    ).toBe(true);
  });
});

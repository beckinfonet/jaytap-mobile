/**
 * @format
 *
 * Note: this project uses `react-test-renderer` directly (see Gated.test.tsx),
 * NOT `@testing-library/react-native` (not installed). The plan's suggested
 * import of `@testing-library/react-native` was adapted (Rule 3) to use
 * `react-test-renderer` with `findByProps` traversal — semantics unchanged.
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import type { ReactTestInstance } from 'react-test-renderer';
import { Step1DealAndPropertyType } from '../Step1DealAndPropertyType';
import { emptyFormBag } from '../validators';
import type { FormBag, FormErrorBag } from '../types';

jest.mock('../../../theme/ThemeContext', () => ({
  useTheme: () => ({
    theme: 'light' as const,
    colors: {
      text: '#000',
      primary: '#007AFF',
      error: '#FF3B30',
      activeChipBackground: '#2D2D2D',
      activeChipText: '#FFFFFF',
    },
    isDark: false,
    toggleTheme: () => undefined,
  }),
}));

jest.mock('../../../context/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'en',
    setLanguage: async () => undefined,
  }),
}));

interface RenderResult {
  root: ReactTestInstance;
  onChange: jest.Mock;
}

function findByTestID(root: ReactTestInstance, testID: string): ReactTestInstance {
  return root.findByProps({ testID });
}

function tryFindByTestID(root: ReactTestInstance, testID: string): ReactTestInstance | null {
  const matches = root.findAllByProps({ testID });
  return matches.length > 0 ? matches[0] : null;
}

async function renderStep1(
  overrides: Partial<{ values: FormBag; errors: FormErrorBag }> = {}
): Promise<{ tree: ReactTestRenderer.ReactTestRenderer; result: RenderResult }> {
  const onChange = jest.fn();
  const values = overrides.values ?? emptyFormBag();
  const errors = overrides.errors ?? {};
  let tree!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(
      <Step1DealAndPropertyType values={values} onChange={onChange} errors={errors} />,
    );
  });
  return { tree, result: { root: tree.root, onChange } };
}

describe('Step1DealAndPropertyType (Plan 02-02)', () => {
  test('renders dealType label + propertyType label simultaneously (Tradeoff §A)', async () => {
    const { tree } = await renderStep1();
    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain('contextualListing.step1.dealTypeLabel');
    expect(json).toContain('contextualListing.step1.propertyTypeLabel');
  });

  test('renders 3 dealType chips (FLOW-02)', async () => {
    const {
      result: { root },
    } = await renderStep1();
    expect(findByTestID(root, 'deal-type-chip-sale')).toBeTruthy();
    expect(findByTestID(root, 'deal-type-chip-rent_long')).toBeTruthy();
    expect(findByTestID(root, 'deal-type-chip-rent_daily')).toBeTruthy();
  });

  test('renders 6 propertyType chips — M1 9-type 3-category preserved (FLOW-03)', async () => {
    const {
      result: { root },
    } = await renderStep1();
    ['apartment', 'house', 'office', 'commercial', 'hotel', 'hostel'].forEach((pt) => {
      expect(findByTestID(root, `property-type-chip-${pt}`)).toBeTruthy();
    });
  });

  test('tapping dealType chip dispatches onChange("dealType", value)', async () => {
    const {
      result: { root, onChange },
    } = await renderStep1();
    const chip = findByTestID(root, 'deal-type-chip-sale');
    await ReactTestRenderer.act(() => {
      chip.props.onPress();
    });
    expect(onChange).toHaveBeenCalledWith('dealType', 'sale');
  });

  test('tapping propertyType chip dispatches onChange("propertyType", value)', async () => {
    const {
      result: { root, onChange },
    } = await renderStep1();
    const chip = findByTestID(root, 'property-type-chip-apartment');
    await ReactTestRenderer.act(() => {
      chip.props.onPress();
    });
    expect(onChange).toHaveBeenCalledWith('propertyType', 'apartment');
  });

  test('active chip differs from inactive (style branch)', async () => {
    const inactiveRender = await renderStep1();
    const inactiveChip = findByTestID(inactiveRender.result.root, 'deal-type-chip-sale');
    const inactiveStyle = JSON.stringify(inactiveChip.props.style);

    const activeRender = await renderStep1({
      values: { ...emptyFormBag(), dealType: 'sale' },
    });
    const activeChip = findByTestID(activeRender.result.root, 'deal-type-chip-sale');
    const activeStyle = JSON.stringify(activeChip.props.style);

    expect(activeStyle).not.toBe(inactiveStyle);
  });

  test('errors.dealType renders below chip row when set', async () => {
    const {
      result: { root },
    } = await renderStep1({
      errors: { dealType: 'contextualListing.step1.dealTypeRequired' },
    });
    expect(tryFindByTestID(root, 'deal-type-error')).not.toBeNull();
  });
});

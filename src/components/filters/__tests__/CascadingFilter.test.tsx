/**
 * src/components/filters/__tests__/CascadingFilter.test.tsx
 *
 * Phase 14 Plan 14-02 — FILT-02 CascadingFilter inline-panel component.
 *
 * Covers:
 *   - Renders Residential by default with 4 chips (Apartment / House / Townhome / Condo)
 *   - Multi-select chip toggle (OR-union add + remove)
 *   - Category-switch clears types[] (RESEARCH.md Pitfall 4 regression guard)
 *   - DealToggle Rent/Buy mapping ('rent' ↔ 'Rent', 'sale' ↔ 'Buy')
 *   - accessibilityState.selected propagates to chips + category tabs
 *
 * Pattern: react-test-renderer + act (project convention — no @testing-library/react-native).
 * NOTE: Mocks DealToggle/TypeIcon/CheckSquare with passthrough stubs that expose
 * their incoming props via testID so we can assert prop flow without rendering
 * the actual Animated.Value-driven primitives.
 */

import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';

jest.mock('../../../theme/ThemeContext', () => ({ useTheme: jest.fn() }));
jest.mock('../../../context/LanguageContext', () => ({ useLanguage: jest.fn() }));

// Mock primitives with passthrough stubs so we can assert prop flow.
jest.mock('../primitives/DealToggle', () => {
  const React = require('react');
  const RN = require('react-native');
  return {
    __esModule: true,
    default: (props: any) =>
      React.createElement(
        RN.Pressable,
        {
          testID: 'DealToggleStub',
          onPress: () => props.onChange(props.value === 'Rent' ? 'Buy' : 'Rent'),
          accessibilityState: { selected: props.value === 'Rent' },
        },
        React.createElement(RN.Text, { testID: 'DealToggleValue' }, props.value),
      ),
  };
});

jest.mock('../primitives/TypeIcon', () => {
  const React = require('react');
  const RN = require('react-native');
  return {
    __esModule: true,
    default: (props: any) =>
      React.createElement(RN.Text, { testID: `TypeIconStub-${props.type}` }, props.type),
  };
});

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { useTheme } = require('../../../theme/ThemeContext');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { useLanguage } = require('../../../context/LanguageContext');

import CascadingFilter from '../CascadingFilter';
import type { PropertyCategory } from '../../../utils/propertyCategory';

beforeEach(() => {
  jest.clearAllMocks();
  useTheme.mockReturnValue({
    isDark: true,
    colors: {
      text: '#fff',
      textSecondary: '#aaa',
      textTertiary: '#888',
      surface: '#1c1c20',
      surface2: '#26262c',
      border: 'rgba(255,255,255,0.08)',
      hair2: 'rgba(255,255,255,0.14)',
      accent: '#ff5a6f',
      accentSoft: 'rgba(255,90,111,0.16)',
      accentLine: 'rgba(255,90,111,0.45)',
      background: '#121214',
    },
  });
  // 260603-emq — type chips now render t('propertyType.<lower>'); map that
  // namespace back to the capitalized word so findChipByLabel('Apartment')
  // still matches. Category tabs keep matching the raw 'category.<lower>' key.
  useLanguage.mockReturnValue({
    t: (k: string) => {
      const m = /^propertyType\.(.+)$/.exec(k);
      return m ? m[1].charAt(0).toUpperCase() + m[1].slice(1) : k;
    },
    language: 'en',
  });
});

type Setters = {
  setTransactionType: jest.Mock;
  setSelectedCategory: jest.Mock;
  setTypes: jest.Mock;
};

const mkSetters = (): Setters => ({
  setTransactionType: jest.fn(),
  setSelectedCategory: jest.fn(),
  setTypes: jest.fn(),
});

const render = (
  overrides: {
    transactionType?: 'rent' | 'sale';
    selectedCategory?: PropertyCategory;
    types?: string[];
    setters?: Setters;
  } = {},
): { tree: TestRenderer.ReactTestRenderer; setters: Setters } => {
  const setters = overrides.setters ?? mkSetters();
  let tree!: TestRenderer.ReactTestRenderer;
  act(() => {
    tree = TestRenderer.create(
      <CascadingFilter
        transactionType={overrides.transactionType ?? 'rent'}
        setTransactionType={setters.setTransactionType}
        selectedCategory={overrides.selectedCategory ?? 'Residential'}
        setSelectedCategory={setters.setSelectedCategory}
        types={overrides.types ?? []}
        setTypes={setters.setTypes}
        liveCount={0}
      />,
    );
  });
  return { tree, setters };
};

/**
 * Finds an interactive Pressable whose subtree contains a Text child with the
 * exact label. Walks the rendered tree from the root and picks the deepest
 * Pressable-like instance (`accessibilityRole === 'button'`) that contains it.
 * Skips the DealToggle stub since it has its own testID.
 */
const findChipByLabel = (
  tree: TestRenderer.ReactTestRenderer,
  label: string,
): TestRenderer.ReactTestInstance | undefined => {
  const buttons = tree.root.findAll(
    (n) =>
      !!n.props &&
      n.props.accessibilityRole === 'button' &&
      n.props.testID !== 'DealToggleStub',
  );
  return buttons.find((p) => {
    const texts = p.findAllByType(Text).map((n) => {
      const c = n.props.children;
      return Array.isArray(c) ? c.join('') : String(c ?? '');
    });
    return texts.includes(label);
  });
};

const findCategoryTab = (
  tree: TestRenderer.ReactTestRenderer,
  cat: PropertyCategory,
): TestRenderer.ReactTestInstance | undefined => {
  // Category tabs render the i18n key 'category.{lowercat}' as a Text child
  const labelKey = `category.${cat.toLowerCase()}`;
  return findChipByLabel(tree, labelKey);
};

describe('CascadingFilter', () => {
  it('renders Residential by default with 4 chips (Apartment, House, Townhome, Condo)', () => {
    const { tree } = render({ selectedCategory: 'Residential' });
    expect(findChipByLabel(tree, 'Apartment')).toBeDefined();
    expect(findChipByLabel(tree, 'House')).toBeDefined();
    expect(findChipByLabel(tree, 'Townhome')).toBeDefined();
    expect(findChipByLabel(tree, 'Condo')).toBeDefined();
    // Should NOT render Commercial / Hospitality types
    expect(findChipByLabel(tree, 'Office')).toBeUndefined();
    expect(findChipByLabel(tree, 'Hotel')).toBeUndefined();
  });

  it('tap inactive chip → setTypes called with array containing that type', () => {
    const { tree, setters } = render({ selectedCategory: 'Residential', types: [] });
    const chip = findChipByLabel(tree, 'Apartment');
    expect(chip).toBeDefined();
    act(() => {
      chip!.props.onPress();
    });
    expect(setters.setTypes).toHaveBeenCalledTimes(1);
    // setTypes is called with a functional updater — invoke it with [] and check result
    const updater = setters.setTypes.mock.calls[0][0];
    expect(typeof updater).toBe('function');
    expect(updater([])).toEqual(['Apartment']);
  });

  it('tap active chip → setTypes called with array NOT containing that type', () => {
    const { tree, setters } = render({
      selectedCategory: 'Residential',
      types: ['Apartment', 'House'],
    });
    const chip = findChipByLabel(tree, 'Apartment');
    expect(chip).toBeDefined();
    act(() => {
      chip!.props.onPress();
    });
    expect(setters.setTypes).toHaveBeenCalledTimes(1);
    const updater = setters.setTypes.mock.calls[0][0];
    expect(typeof updater).toBe('function');
    expect(updater(['Apartment', 'House'])).toEqual(['House']);
  });

  it('tap different category tab → setSelectedCategory AND setTypes([]) both called', () => {
    const { tree, setters } = render({
      selectedCategory: 'Residential',
      types: ['Apartment'],
    });
    const commercialTab = findCategoryTab(tree, 'Commercial');
    expect(commercialTab).toBeDefined();
    act(() => {
      commercialTab!.props.onPress();
    });
    expect(setters.setSelectedCategory).toHaveBeenCalledTimes(1);
    expect(setters.setSelectedCategory).toHaveBeenCalledWith('Commercial');
    expect(setters.setTypes).toHaveBeenCalledTimes(1);
    expect(setters.setTypes).toHaveBeenCalledWith([]);
    // Order matters per RESEARCH.md Pitfall 4 — verify setSelectedCategory fires
    // before setTypes (both still in the same React batch, but the function-call
    // order in the handler is contract).
    const catCallOrder = setters.setSelectedCategory.mock.invocationCallOrder[0];
    const typesCallOrder = setters.setTypes.mock.invocationCallOrder[0];
    expect(catCallOrder).toBeLessThan(typesCallOrder);
  });

  it('DealToggle stub receives value="Rent" when transactionType="rent" and dispatch maps back', () => {
    const setters = mkSetters();
    const { tree } = render({ transactionType: 'rent', setters });
    const toggle = tree.root.findAllByProps({ testID: 'DealToggleStub' })[0];
    const valueText = tree.root.findAllByProps({ testID: 'DealToggleValue' })[0];
    expect(String(valueText.props.children)).toBe('Rent');
    // Press the stub — its mocked onPress flips value to 'Buy' and forwards
    // the mapped value 'sale' back to setTransactionType via the wrapper's onChange.
    act(() => {
      toggle.props.onPress();
    });
    expect(setters.setTransactionType).toHaveBeenCalledTimes(1);
    expect(setters.setTransactionType).toHaveBeenCalledWith('sale');
  });

  it('DealToggle stub receives value="Buy" when transactionType="sale" and dispatch maps back', () => {
    const setters = mkSetters();
    const { tree } = render({ transactionType: 'sale', setters });
    const toggle = tree.root.findAllByProps({ testID: 'DealToggleStub' })[0];
    const valueText = tree.root.findAllByProps({ testID: 'DealToggleValue' })[0];
    expect(String(valueText.props.children)).toBe('Buy');
    act(() => {
      toggle.props.onPress();
    });
    expect(setters.setTransactionType).toHaveBeenCalledTimes(1);
    expect(setters.setTransactionType).toHaveBeenCalledWith('rent');
  });

  it('accessibilityState.selected propagates on active/inactive chips and category tabs', () => {
    const { tree } = render({
      selectedCategory: 'Residential',
      types: ['Apartment'],
    });
    const activeChip = findChipByLabel(tree, 'Apartment');
    const inactiveChip = findChipByLabel(tree, 'House');
    expect(activeChip!.props.accessibilityState).toEqual({ selected: true });
    expect(inactiveChip!.props.accessibilityState).toEqual({ selected: false });

    const activeTab = findCategoryTab(tree, 'Residential');
    const inactiveTab = findCategoryTab(tree, 'Commercial');
    expect(activeTab!.props.accessibilityState).toEqual({ selected: true });
    expect(inactiveTab!.props.accessibilityState).toEqual({ selected: false });
  });
});

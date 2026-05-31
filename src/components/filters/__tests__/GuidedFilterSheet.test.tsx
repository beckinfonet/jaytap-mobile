/**
 * src/components/filters/__tests__/GuidedFilterSheet.test.tsx
 *
 * Phase 14 Plan 14-03 — FILT-01 GuidedFilterSheet Modal + Animated bottom sheet.
 *
 * Wave-0 Modal-probe outcome PASSED (see 14-MODAL-PROBE-OUTCOME.txt) → this test
 * renders the full <GuidedFilterSheet open={true} ... /> component directly via
 * react-test-renderer (no GuidedFilterSheetContent inner-component fallback).
 *
 * Covers 6 cases:
 *   1. Renders nothing when open=false (initially) — Modal.visible is false.
 *   2. Opens with localOpen=true when open=true — Modal.visible is true.
 *   3. Stepper auto-advance: tapping Rent Deal-card calls setTransactionType + step→1.
 *   4. Re-picking Category clears types (RESEARCH.md Pitfall 4 regression guard).
 *   5. Tap scrim Pressable fires onClose.
 *   6. ShowButton tap fires onClose.
 *
 * Animation testing caveat (UI-SPEC §Motion): react-test-renderer fires Animated
 * callbacks synchronously — we assert only initial/final state, never mid-frame.
 *
 * Pattern: react-test-renderer + act (project convention — no @testing-library/react-native).
 * Mocks primitives (Stepper / ShowButton / Breadcrumb / CheckSquare / TypeIcon /
 * MultiHint) with passthrough stubs that expose props via testID so we can
 * assert prop flow without rendering Animated.Value-driven internals.
 */

import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { Modal, Pressable, Text } from 'react-native';

jest.mock('../../../theme/ThemeContext', () => ({ useTheme: jest.fn() }));
jest.mock('../../../context/LanguageContext', () => ({ useLanguage: jest.fn() }));

// Mock primitives — passthrough stubs that surface props via testID for assertion.
jest.mock('../primitives/Stepper', () => {
  const ReactLocal = require('react');
  const RN = require('react-native');
  return {
    __esModule: true,
    default: (props: any) =>
      ReactLocal.createElement(RN.View, { testID: 'StepperStub', accessibilityLabel: `step-${props.step}` }),
  };
});

jest.mock('../primitives/ShowButton', () => {
  const ReactLocal = require('react');
  const RN = require('react-native');
  return {
    __esModule: true,
    default: (props: any) =>
      ReactLocal.createElement(RN.Pressable, {
        testID: 'ShowButtonStub',
        onPress: props.onPress,
        accessibilityLabel: `show-${props.count}`,
      }),
  };
});

jest.mock('../primitives/Breadcrumb', () => {
  const ReactLocal = require('react');
  const RN = require('react-native');
  return {
    __esModule: true,
    default: (props: any) =>
      ReactLocal.createElement(RN.View, {
        testID: 'BreadcrumbStub',
        accessibilityLabel: `breadcrumb-${props.deal ?? 'none'}-${props.category ?? 'none'}-${(props.types ?? []).join(',')}`,
      }),
  };
});

jest.mock('../primitives/CheckSquare', () => {
  const ReactLocal = require('react');
  const RN = require('react-native');
  return {
    __esModule: true,
    default: (props: any) =>
      ReactLocal.createElement(RN.View, {
        testID: 'CheckSquareStub',
        accessibilityLabel: `check-${props.checked ? 'on' : 'off'}`,
      }),
  };
});

jest.mock('../primitives/TypeIcon', () => {
  const ReactLocal = require('react');
  const RN = require('react-native');
  return {
    __esModule: true,
    default: (props: any) =>
      ReactLocal.createElement(RN.Text, { testID: `TypeIconStub-${props.type}` }, props.type),
  };
});

jest.mock('../primitives/MultiHint', () => {
  const ReactLocal = require('react');
  const RN = require('react-native');
  return {
    __esModule: true,
    default: () => ReactLocal.createElement(RN.View, { testID: 'MultiHintStub' }),
  };
});

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { useTheme } = require('../../../theme/ThemeContext');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { useLanguage } = require('../../../context/LanguageContext');

import GuidedFilterSheet from '../GuidedFilterSheet';
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
      scrim: 'rgba(0,0,0,0.55)',
      iconChipFg: 'rgba(244,244,246,0.85)',
      landlordGreen: '#35c98f',
    },
  });
  useLanguage.mockReturnValue({ t: (k: string) => k, language: 'en' });
});

type Setters = {
  setTransactionType: jest.Mock;
  setSelectedCategory: jest.Mock;
  setTypes: jest.Mock;
  onClose: jest.Mock;
};

const mkSetters = (): Setters => ({
  setTransactionType: jest.fn(),
  setSelectedCategory: jest.fn(),
  setTypes: jest.fn(),
  onClose: jest.fn(),
});

const render = (
  overrides: {
    open?: boolean;
    transactionType?: 'rent' | 'sale';
    selectedCategory?: PropertyCategory;
    types?: string[];
    liveCount?: number;
    setters?: Setters;
  } = {},
): { tree: TestRenderer.ReactTestRenderer; setters: Setters } => {
  const setters = overrides.setters ?? mkSetters();
  let tree!: TestRenderer.ReactTestRenderer;
  act(() => {
    tree = TestRenderer.create(
      <GuidedFilterSheet
        open={overrides.open ?? true}
        onClose={setters.onClose}
        transactionType={overrides.transactionType ?? 'rent'}
        setTransactionType={setters.setTransactionType}
        selectedCategory={overrides.selectedCategory ?? 'Residential'}
        setSelectedCategory={setters.setSelectedCategory}
        types={overrides.types ?? []}
        setTypes={setters.setTypes}
        liveCount={overrides.liveCount ?? 0}
      />,
    );
  });
  return { tree, setters };
};

/**
 * Find a Pressable whose subtree contains a Text child rendering the exact label.
 * Skip stubs that have their own testID.
 */
const findPressableByText = (
  tree: TestRenderer.ReactTestRenderer,
  label: string,
): TestRenderer.ReactTestInstance | undefined => {
  const stubIds = new Set([
    'StepperStub',
    'ShowButtonStub',
    'BreadcrumbStub',
    'CheckSquareStub',
    'MultiHintStub',
    'GuidedScrim',
  ]);
  const candidates = tree.root.findAll((n) => {
    if (!n.props) return false;
    if (n.props.accessibilityRole !== 'button') return false;
    if (n.props.testID && stubIds.has(n.props.testID)) return false;
    return true;
  });
  return candidates.find((p) => {
    const texts = p.findAllByType(Text).map((n) => {
      const c = n.props.children;
      return Array.isArray(c) ? c.join('') : String(c ?? '');
    });
    return texts.includes(label);
  });
};

describe('GuidedFilterSheet', () => {
  it('renders nothing when open=false (Modal.visible is false)', () => {
    const { tree } = render({ open: false });
    const modal = tree.root.findByType(Modal);
    expect(modal.props.visible).toBe(false);
  });

  it('opens with localOpen=true when open=true (Modal.visible is true)', () => {
    const { tree } = render({ open: true });
    const modal = tree.root.findByType(Modal);
    expect(modal.props.visible).toBe(true);
  });

  it('stepper auto-advance: tapping Rent Deal-card calls setTransactionType("rent") + step→1 (CategoryCards visible)', () => {
    const { tree, setters } = render({ open: true, transactionType: 'sale' });
    // At step 0, DealCards are rendered. Find the Rent card by its label key.
    const rentCard = findPressableByText(tree, 'filters.deal.rent');
    expect(rentCard).toBeDefined();
    act(() => {
      rentCard!.props.onPress();
    });
    expect(setters.setTransactionType).toHaveBeenCalledWith('rent');
    // After step→1, CategoryCards render — find the Residential category card
    // via its prompt key existence (only rendered at step 1).
    const categoryPrompt = tree.root
      .findAllByType(Text)
      .map((n) => {
        const c = n.props.children;
        return Array.isArray(c) ? c.join('') : String(c ?? '');
      })
      .filter((s) => s === 'filters.category.prompt');
    expect(categoryPrompt.length).toBeGreaterThanOrEqual(1);
  });

  it('re-picking Category at step 1 calls setSelectedCategory + setTypes([]) (RESEARCH.md Pitfall 4)', () => {
    const setters = mkSetters();
    const { tree } = render({ open: true, transactionType: 'rent', types: ['Apartment'], setters });
    // Walk: step 0 → tap Rent → step 1. Then tap Commercial.
    const rentCard = findPressableByText(tree, 'filters.deal.rent');
    act(() => {
      rentCard!.props.onPress();
    });
    // Now at step 1. Find the Commercial card by its 'category.commercial' label.
    const commercialCard = findPressableByText(tree, 'category.commercial');
    expect(commercialCard).toBeDefined();
    act(() => {
      commercialCard!.props.onPress();
    });
    expect(setters.setSelectedCategory).toHaveBeenCalledWith('Commercial');
    expect(setters.setTypes).toHaveBeenCalledWith([]);
    // Order: setSelectedCategory MUST fire before setTypes (Pitfall 4 contract).
    const catOrder = setters.setSelectedCategory.mock.invocationCallOrder[0];
    const typesOrder = setters.setTypes.mock.invocationCallOrder[0];
    expect(catOrder).toBeLessThan(typesOrder);
  });

  it('tap-scrim fires onClose', () => {
    const setters = mkSetters();
    const { tree } = render({ open: true, setters });
    // Scrim is a Pressable with testID 'GuidedScrim'.
    const scrim = tree.root.findAllByProps({ testID: 'GuidedScrim' })[0];
    expect(scrim).toBeDefined();
    act(() => {
      scrim.props.onPress();
    });
    expect(setters.onClose).toHaveBeenCalledTimes(1);
  });

  it('ShowButton press fires onClose', () => {
    const setters = mkSetters();
    const { tree } = render({ open: true, liveCount: 5, setters });
    const showButton = tree.root.findAllByProps({ testID: 'ShowButtonStub' })[0];
    expect(showButton).toBeDefined();
    expect(showButton.props.accessibilityLabel).toBe('show-5');
    act(() => {
      showButton.props.onPress();
    });
    expect(setters.onClose).toHaveBeenCalledTimes(1);
  });
});

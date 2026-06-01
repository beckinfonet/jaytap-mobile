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
  // Quick 260601-dqh — surface `variant` prop via testID suffix so footer
  // contract (primary on step 2 / secondary on steps 0/1) is assertable.
  return {
    __esModule: true,
    default: (props: any) =>
      ReactLocal.createElement(RN.Pressable, {
        testID: 'ShowButtonStub',
        onPress: props.onPress,
        accessibilityLabel: `show-${props.count}`,
        // `variant` is forwarded via a prop on the stub so tests can read it.
        // When omitted on the real ShowButton, `props.variant` is undefined,
        // which the parent's "primary by default" contract guarantees.
        variant: props.variant,
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
      // Quick 260601-elb — Header Reset reads colors.filterAccent for the
      // enabled (active) text color; mock the trio so the new code path
      // doesn't flow `undefined` into styles under future RN versions.
      filterAccent: '#6f7bff',
      filterAccentSoft: 'rgba(111,123,255,0.16)',
      filterAccentLine: 'rgba(111,123,255,0.45)',
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
 * Quick 260601-dqh — collect ShowButton stub instances WITHOUT duplicates.
 * `findAllByProps({ testID: 'ShowButtonStub' })` inflates the count because
 * the Pressable forwards `testID` to its inner Views (host fibers). The mock
 * returns RN.Pressable as the root, so we filter to elements whose `type`
 * stringifies to 'Pressable' (the stub's root element).
 */
const findShowButtons = (
  tree: TestRenderer.ReactTestRenderer,
): TestRenderer.ReactTestInstance[] => {
  const all = tree.root.findAllByProps({ testID: 'ShowButtonStub' });
  return all.filter((n) => {
    const t = n.type;
    const name =
      typeof t === 'string'
        ? t
        : (t as any)?.displayName || (t as any)?.name || String(t);
    return name === 'Pressable';
  });
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

  // Quick 260601-dqh — auto-advance REMOVED. Tapping a Deal card now only sets
  // transactionType; step does NOT change. Continue (footer) drives setStep.
  it('Deal card: tap calls setTransactionType but does NOT advance step (auto-advance removed)', () => {
    const { tree, setters } = render({ open: true, transactionType: 'sale' });
    const rentCard = findPressableByText(tree, 'filters.deal.rent');
    expect(rentCard).toBeDefined();
    act(() => {
      rentCard!.props.onPress();
    });
    expect(setters.setTransactionType).toHaveBeenCalledWith('rent');
    // Category prompt key is ONLY rendered at step 1. After tapping the Deal
    // card without an auto-advance, the prompt must still be absent.
    const categoryPrompt = tree.root
      .findAllByType(Text)
      .map((n) => {
        const c = n.props.children;
        return Array.isArray(c) ? c.join('') : String(c ?? '');
      })
      .filter((s) => s === 'filters.category.prompt');
    expect(categoryPrompt.length).toBe(0);
  });

  // Quick 260601-dqh — re-picking Category still preserves Pitfall 4 ordering
  // (setSelectedCategory before setTypes([])). The route into step 1 is now via
  // the Continue button (no Deal-card auto-advance), so drive it that way.
  it('re-picking Category at step 1 calls setSelectedCategory + setTypes([]) and does NOT advance step (Pitfall 4 order preserved)', () => {
    const setters = mkSetters();
    const { tree } = render({ open: true, transactionType: 'rent', types: ['Apartment'], setters });
    // Walk step 0 → step 1 via Continue (no card auto-advance).
    const continueStep0 = findPressableByText(tree, 'filters.continue.addCategory');
    expect(continueStep0).toBeDefined();
    act(() => {
      continueStep0!.props.onPress();
    });
    // Now at step 1. Find the Commercial card by its 'category.commercial' label.
    const commercialCard = findPressableByText(tree, 'category.commercial');
    expect(commercialCard).toBeDefined();
    act(() => {
      commercialCard!.props.onPress();
    });
    expect(setters.setSelectedCategory).toHaveBeenCalledWith('Commercial');
    expect(setters.setTypes).toHaveBeenCalledWith([]);
    // Order: setSelectedCategory MUST fire before setTypes (Pitfall 4).
    const catOrder = setters.setSelectedCategory.mock.invocationCallOrder[0];
    const typesOrder = setters.setTypes.mock.invocationCallOrder[0];
    expect(catOrder).toBeLessThan(typesOrder);
    // Step did NOT auto-advance to 2 — Type prompt still absent.
    const typePrompt = tree.root
      .findAllByType(Text)
      .map((n) => {
        const c = n.props.children;
        return Array.isArray(c) ? c.join('') : String(c ?? '');
      })
      .filter((s) => s === 'filters.type.prompt');
    expect(typePrompt.length).toBe(0);
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

  // Quick 260601-elb — Header Reset (Task 6 of GSD-HANDOFF-filter-reset.md).
  // At the default state (Rent · Residential · []) Reset is disabled. After
  // mutating any of those three slots, Reset becomes enabled. Pressing Reset
  // invokes the four setters in Pitfall-4-preserving order: setSelectedCategory
  // BEFORE setTypes.
  it('Header Reset: disabled at default, enabled after change, press order honors Pitfall 4', () => {
    // (a) Default state — Reset is disabled.
    const settersA = mkSetters();
    const { tree: treeDefault } = render({
      open: true,
      transactionType: 'rent',
      selectedCategory: 'Residential',
      types: [],
      setters: settersA,
    });
    const resetDefault = findPressableByText(treeDefault, 'filters.reset');
    expect(resetDefault).toBeDefined();
    expect(resetDefault!.props.disabled).toBe(true);
    expect(resetDefault!.props.accessibilityState).toEqual({ disabled: true });

    // (b) Non-default state — Reset is enabled (types non-empty trips isFilterDefault).
    const settersB = mkSetters();
    const { tree: treeActive } = render({
      open: true,
      transactionType: 'rent',
      selectedCategory: 'Residential',
      types: ['Apartment'],
      setters: settersB,
    });
    const resetActive = findPressableByText(treeActive, 'filters.reset');
    expect(resetActive).toBeDefined();
    expect(resetActive!.props.disabled).toBe(false);
    expect(resetActive!.props.accessibilityState).toEqual({ disabled: false });

    // (c) Pressing Reset invokes the four setters; setSelectedCategory BEFORE setTypes (Pitfall 4).
    act(() => {
      resetActive!.props.onPress();
    });
    expect(settersB.setTransactionType).toHaveBeenCalledWith('rent');
    expect(settersB.setSelectedCategory).toHaveBeenCalledWith('Residential');
    expect(settersB.setTypes).toHaveBeenCalledWith([]);
    // Pitfall 4 order — setSelectedCategory before setTypes (invocationCallOrder
    // pattern, same as the existing 're-picking Category' test in this file).
    const catOrder = settersB.setSelectedCategory.mock.invocationCallOrder[0];
    const typesOrder = settersB.setTypes.mock.invocationCallOrder[0];
    expect(catOrder).toBeLessThan(typesOrder);
  });

  // ---------- Quick 260601-dqh — dual-action footer (Guide-first) ----------

  it('step 0 footer: renders Continue · Add a category + secondary ShowButton (no primary Show)', () => {
    const { tree } = render({ open: true });
    // Continue button uses the addCategory key at step 0.
    const continueBtn = findPressableByText(tree, 'filters.continue.addCategory');
    expect(continueBtn).toBeDefined();
    // ShowButton stubs at step 0 — exactly one, with variant === 'secondary'.
    const showButtons = findShowButtons(tree);
    expect(showButtons.length).toBe(1);
    expect(showButtons[0].props.variant).toBe('secondary');
  });

  it('step 1 footer: renders Continue · Add a type + secondary ShowButton (no primary Show)', () => {
    const { tree } = render({ open: true });
    // Advance to step 1 via Continue (no Deal-card auto-advance).
    const continueStep0 = findPressableByText(tree, 'filters.continue.addCategory');
    act(() => {
      continueStep0!.props.onPress();
    });
    // Continue button at step 1 uses the addType key.
    const continueStep1 = findPressableByText(tree, 'filters.continue.addType');
    expect(continueStep1).toBeDefined();
    // ShowButton stubs at step 1 — exactly one, secondary.
    const showButtons = findShowButtons(tree);
    expect(showButtons.length).toBe(1);
    expect(showButtons[0].props.variant).toBe('secondary');
  });

  it('step 2 footer: renders single ShowButton with variant === undefined (primary default), no Continue', () => {
    const { tree } = render({ open: true });
    // Advance step 0 → 1 → 2 via two Continue presses.
    act(() => {
      findPressableByText(tree, 'filters.continue.addCategory')!.props.onPress();
    });
    act(() => {
      findPressableByText(tree, 'filters.continue.addType')!.props.onPress();
    });
    // Now at step 2. No Continue rendered.
    expect(findPressableByText(tree, 'filters.continue.addCategory')).toBeUndefined();
    expect(findPressableByText(tree, 'filters.continue.addType')).toBeUndefined();
    // Exactly one ShowButton with default (undefined) variant = primary.
    const showButtons = findShowButtons(tree);
    expect(showButtons.length).toBe(1);
    expect(showButtons[0].props.variant).toBeUndefined();
  });

  it('Continue at step 0 advances to step 1 (Category prompt becomes visible)', () => {
    const { tree } = render({ open: true });
    // Step 0: Category prompt not yet rendered.
    const before = tree.root
      .findAllByType(Text)
      .map((n) => {
        const c = n.props.children;
        return Array.isArray(c) ? c.join('') : String(c ?? '');
      })
      .filter((s) => s === 'filters.category.prompt');
    expect(before.length).toBe(0);
    // Tap Continue.
    act(() => {
      findPressableByText(tree, 'filters.continue.addCategory')!.props.onPress();
    });
    // Step 1: Category prompt is now rendered.
    const after = tree.root
      .findAllByType(Text)
      .map((n) => {
        const c = n.props.children;
        return Array.isArray(c) ? c.join('') : String(c ?? '');
      })
      .filter((s) => s === 'filters.category.prompt');
    expect(after.length).toBeGreaterThanOrEqual(1);
  });

  it('Continue at step 1 advances to step 2 (Type prompt becomes visible)', () => {
    const { tree } = render({ open: true });
    // Advance to step 1.
    act(() => {
      findPressableByText(tree, 'filters.continue.addCategory')!.props.onPress();
    });
    // Step 1: Type prompt not yet rendered.
    const before = tree.root
      .findAllByType(Text)
      .map((n) => {
        const c = n.props.children;
        return Array.isArray(c) ? c.join('') : String(c ?? '');
      })
      .filter((s) => s === 'filters.type.prompt');
    expect(before.length).toBe(0);
    // Tap Continue (addType variant).
    act(() => {
      findPressableByText(tree, 'filters.continue.addType')!.props.onPress();
    });
    // Step 2: Type prompt rendered.
    const after = tree.root
      .findAllByType(Text)
      .map((n) => {
        const c = n.props.children;
        return Array.isArray(c) ? c.join('') : String(c ?? '');
      })
      .filter((s) => s === 'filters.type.prompt');
    expect(after.length).toBeGreaterThanOrEqual(1);
  });

  it('secondary ShowButton at step 0 still fires onClose (D-04 / D-14 contracts hold)', () => {
    const setters = mkSetters();
    const { tree } = render({ open: true, liveCount: 7, setters });
    const showButtons = findShowButtons(tree);
    expect(showButtons.length).toBe(1);
    expect(showButtons[0].props.variant).toBe('secondary');
    expect(showButtons[0].props.accessibilityLabel).toBe('show-7');
    act(() => {
      showButtons[0].props.onPress();
    });
    expect(setters.onClose).toHaveBeenCalledTimes(1);
  });
});

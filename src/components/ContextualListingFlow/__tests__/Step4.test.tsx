/**
 * Phase 2 Plan 02-04a — Step4ConditionAmenities RTL smoke tests (FLOW-09).
 *
 * Test stack: react-test-renderer (matches Step1.test.tsx + Step2.test.tsx + Step3.test.tsx).
 *
 * Coverage (FLOW-09 + SPEC §Decisions Log #4):
 *   - 4 condition chips (rough/whitebox/good/euro) — REQUIRED for every propertyType.
 *   - 2 furnished chips (Yes / No). furnished is a TRI-STATE: true / false / null.
 *     null = unset (validator counts as missing). false IS a valid choice.
 *   - Re-tapping the active condition chip leaves it active (no toggle-off).
 *   - Error text renders when errors[...] is set.
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import type { ReactTestInstance } from 'react-test-renderer';
import { Step4ConditionAmenities } from '../Step4ConditionAmenities';
import { emptyFormBag } from '../validators';
import type { FormBag, FormErrorBag } from '../types';

jest.mock('../../../theme/ThemeContext', () => ({
  useTheme: () => ({
    theme: 'light' as const,
    colors: {
      text: '#000',
      textSecondary: '#666',
      background: '#FFF',
      surface: '#FFF',
      primary: '#007AFF',
      accent: '#FF385C',
      border: '#E0E0E0',
      error: '#FF3B30',
      activeChipBackground: '#2D2D2D',
      activeChipText: '#FFFFFF',
      inputBackground: '#FFF',
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

function findByTestID(root: ReactTestInstance, testID: string): ReactTestInstance {
  return root.findByProps({ testID });
}

function tryFindByTestID(root: ReactTestInstance, testID: string): ReactTestInstance | null {
  const matches = root.findAllByProps({ testID });
  return matches.length > 0 ? matches[0] : null;
}

interface RenderArgs {
  values?: FormBag;
  errors?: FormErrorBag;
}

async function renderStep4(args: RenderArgs = {}) {
  const onChange = jest.fn();
  const values = args.values ?? emptyFormBag();
  const errors = args.errors ?? {};
  let tree!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(
      <Step4ConditionAmenities values={values} onChange={onChange} errors={errors} />,
    );
  });
  return { tree, root: tree.root, onChange };
}

describe('Step4ConditionAmenities (Plan 02-04a)', () => {
  // Test 1
  test('renders 4 condition chips (rough/whitebox/good/euro)', async () => {
    const { root } = await renderStep4();
    expect(findByTestID(root, 'condition-chip-rough')).toBeTruthy();
    expect(findByTestID(root, 'condition-chip-whitebox')).toBeTruthy();
    expect(findByTestID(root, 'condition-chip-good')).toBeTruthy();
    expect(findByTestID(root, 'condition-chip-euro')).toBeTruthy();
  });

  // Test 2
  test('renders 2 furnished chips (yes / no); default emptyFormBag → neither active', async () => {
    const { root } = await renderStep4();
    expect(findByTestID(root, 'furnished-chip-yes')).toBeTruthy();
    expect(findByTestID(root, 'furnished-chip-no')).toBeTruthy();

    // Default emptyFormBag has furnished: null → BOTH chips render as inactive (no
    // displayable copy needed for the unset state — B-02 reconciliation note).
    // Inactive style differs from active style; we assert by comparing against
    // an active-state render of the same chip.
    const inactiveYes = findByTestID(root, 'furnished-chip-yes');
    const inactiveYesStyle = JSON.stringify(inactiveYes.props.style);

    const activeRender = await renderStep4({
      values: { ...emptyFormBag(), conditionAndAmenities: { condition: '', furnished: true } },
    });
    const activeYes = findByTestID(activeRender.root, 'furnished-chip-yes');
    const activeYesStyle = JSON.stringify(activeYes.props.style);
    expect(inactiveYesStyle).not.toBe(activeYesStyle);
  });

  // Test 3
  test('tapping a condition chip dispatches onChange("conditionAndAmenities", {...prev, condition})', async () => {
    const { root, onChange } = await renderStep4();
    const chip = findByTestID(root, 'condition-chip-good');
    await ReactTestRenderer.act(async () => {
      chip.props.onPress();
    });
    const last = onChange.mock.calls[onChange.mock.calls.length - 1];
    expect(last[0]).toBe('conditionAndAmenities');
    expect((last[1] as FormBag['conditionAndAmenities']).condition).toBe('good');
    // furnished stays null (unset preserved)
    expect((last[1] as FormBag['conditionAndAmenities']).furnished).toBeNull();
  });

  // Test 4
  test("tapping furnished='Yes' dispatches furnished: true", async () => {
    const { root, onChange } = await renderStep4();
    const chip = findByTestID(root, 'furnished-chip-yes');
    await ReactTestRenderer.act(async () => {
      chip.props.onPress();
    });
    const last = onChange.mock.calls[onChange.mock.calls.length - 1];
    expect(last[0]).toBe('conditionAndAmenities');
    expect((last[1] as FormBag['conditionAndAmenities']).furnished).toBe(true);
  });

  // Test 5
  test("tapping furnished='No' dispatches furnished: false (NOT null — null means unset)", async () => {
    const { root, onChange } = await renderStep4();
    const chip = findByTestID(root, 'furnished-chip-no');
    await ReactTestRenderer.act(async () => {
      chip.props.onPress();
    });
    const last = onChange.mock.calls[onChange.mock.calls.length - 1];
    expect(last[0]).toBe('conditionAndAmenities');
    expect((last[1] as FormBag['conditionAndAmenities']).furnished).toBe(false);
  });

  // Test 6
  test('re-tapping the active condition chip leaves it active (no toggle-off — picking is required to advance)', async () => {
    const values: FormBag = {
      ...emptyFormBag(),
      conditionAndAmenities: { condition: 'good', furnished: null },
    };
    const { root, onChange } = await renderStep4({ values });
    const chip = findByTestID(root, 'condition-chip-good');
    await ReactTestRenderer.act(async () => {
      chip.props.onPress();
    });
    const last = onChange.mock.calls[onChange.mock.calls.length - 1];
    expect(last[0]).toBe('conditionAndAmenities');
    // Re-tapping active chip dispatches the same value — does NOT clear it.
    expect((last[1] as FormBag['conditionAndAmenities']).condition).toBe('good');
  });

  // Test 7
  test("errors['conditionAndAmenities.condition'] renders error text below condition row", async () => {
    const { root } = await renderStep4({
      errors: { 'conditionAndAmenities.condition': 'contextualListing.step4.conditionRequired' },
    });
    expect(tryFindByTestID(root, 'condition-error')).not.toBeNull();
  });

  // Test 8
  test("errors['conditionAndAmenities.furnished'] renders error text below furnished row", async () => {
    const { root } = await renderStep4({
      errors: { 'conditionAndAmenities.furnished': 'contextualListing.step4.furnishedRequired' },
    });
    expect(tryFindByTestID(root, 'furnished-error')).not.toBeNull();
  });
});

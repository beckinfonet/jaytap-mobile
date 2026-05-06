/**
 * Phase 2 Plan 02-03 — Step3BasicInfo RTL smoke tests.
 *
 * Test stack: react-test-renderer (matches Step1.test.tsx + Step2.test.tsx).
 *
 * Coverage matrix per FLOW-08:
 *   apartment, house         → rooms only
 *   office, commercial       → rooms + bathroom + kitchen
 *   hotel, hostel            → hotelRooms + hotelClass
 * always-shown: areaSqm + price + currency (KGS/USD/EUR per D-03)
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import type { ReactTestInstance } from 'react-test-renderer';
import { Step3BasicInfo } from '../Step3BasicInfo';
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

async function renderStep3(args: RenderArgs = {}) {
  const onChange = jest.fn();
  const values = args.values ?? emptyFormBag();
  const errors = args.errors ?? {};
  let tree!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(
      <Step3BasicInfo values={values} onChange={onChange} errors={errors} />,
    );
  });
  return { tree, root: tree.root, onChange };
}

describe('Step3BasicInfo (Plan 02-03)', () => {
  // Test 1
  test('always renders areaSqm + price + currency chips regardless of propertyType', async () => {
    const { root } = await renderStep3();
    expect(findByTestID(root, 'basics-areaSqm')).toBeTruthy();
    expect(findByTestID(root, 'basics-price')).toBeTruthy();
    expect(findByTestID(root, 'currency-chip-KGS')).toBeTruthy();
    expect(findByTestID(root, 'currency-chip-USD')).toBeTruthy();
    expect(findByTestID(root, 'currency-chip-EUR')).toBeTruthy();
  });

  // Test 2
  test('currency chips render KGS, USD, EUR (D-03 — no $/сом legacy tokens)', async () => {
    const { root } = await renderStep3();
    expect(findByTestID(root, 'currency-chip-KGS')).toBeTruthy();
    expect(findByTestID(root, 'currency-chip-USD')).toBeTruthy();
    expect(findByTestID(root, 'currency-chip-EUR')).toBeTruthy();
    // No legacy chips
    expect(tryFindByTestID(root, 'currency-chip-RUB')).toBeNull();
  });

  // Test 3
  test("propertyType='apartment' → renders rooms ONLY (no bathroom/kitchen/hotelRooms/hotelClass)", async () => {
    const values: FormBag = { ...emptyFormBag(), propertyType: 'apartment' };
    const { root } = await renderStep3({ values });
    expect(findByTestID(root, 'rooms-chip-1')).toBeTruthy();
    expect(tryFindByTestID(root, 'bathroom-chip-private')).toBeNull();
    expect(tryFindByTestID(root, 'kitchen-chip-private')).toBeNull();
    expect(tryFindByTestID(root, 'hotelRooms-chip-1')).toBeNull();
    expect(tryFindByTestID(root, 'hotelClass-chip-economy')).toBeNull();
  });

  // Test 4
  test("propertyType='house' → same as apartment (rooms only)", async () => {
    const values: FormBag = { ...emptyFormBag(), propertyType: 'house' };
    const { root } = await renderStep3({ values });
    expect(findByTestID(root, 'rooms-chip-1')).toBeTruthy();
    expect(tryFindByTestID(root, 'bathroom-chip-private')).toBeNull();
    expect(tryFindByTestID(root, 'hotelClass-chip-economy')).toBeNull();
  });

  // Test 5
  test("propertyType='office' → renders rooms + bathroom + kitchen", async () => {
    const values: FormBag = { ...emptyFormBag(), propertyType: 'office' };
    const { root } = await renderStep3({ values });
    expect(findByTestID(root, 'rooms-chip-1')).toBeTruthy();
    expect(findByTestID(root, 'bathroom-chip-private')).toBeTruthy();
    expect(findByTestID(root, 'kitchen-chip-private')).toBeTruthy();
    expect(tryFindByTestID(root, 'hotelClass-chip-economy')).toBeNull();
  });

  // Test 6
  test("propertyType='commercial' → same as office (rooms + bathroom + kitchen)", async () => {
    const values: FormBag = { ...emptyFormBag(), propertyType: 'commercial' };
    const { root } = await renderStep3({ values });
    expect(findByTestID(root, 'rooms-chip-1')).toBeTruthy();
    expect(findByTestID(root, 'bathroom-chip-shared')).toBeTruthy();
    expect(findByTestID(root, 'kitchen-chip-none')).toBeTruthy();
  });

  // Test 7
  test("propertyType='hotel' → renders hotelRooms + hotelClass; rooms/bathroom/kitchen NOT rendered", async () => {
    const values: FormBag = { ...emptyFormBag(), propertyType: 'hotel' };
    const { root } = await renderStep3({ values });
    expect(findByTestID(root, 'hotelRooms-chip-1')).toBeTruthy();
    expect(findByTestID(root, 'hotelClass-chip-economy')).toBeTruthy();
    expect(tryFindByTestID(root, 'rooms-chip-1')).toBeNull();
    expect(tryFindByTestID(root, 'bathroom-chip-private')).toBeNull();
    expect(tryFindByTestID(root, 'kitchen-chip-private')).toBeNull();
  });

  // Test 8
  test("propertyType='hostel' → same as hotel (hotelRooms + hotelClass)", async () => {
    const values: FormBag = { ...emptyFormBag(), propertyType: 'hostel' };
    const { root } = await renderStep3({ values });
    expect(findByTestID(root, 'hotelRooms-chip-2')).toBeTruthy();
    expect(findByTestID(root, 'hotelClass-chip-premium')).toBeTruthy();
    expect(tryFindByTestID(root, 'rooms-chip-1')).toBeNull();
  });

  // Test 9
  test('areaSqm onChangeText dispatches onChange("basics", { areaSqm })', async () => {
    const { root, onChange } = await renderStep3();
    const input = findByTestID(root, 'basics-areaSqm');
    await ReactTestRenderer.act(async () => {
      input.props.onChangeText('80');
    });
    const last = onChange.mock.calls[onChange.mock.calls.length - 1];
    expect(last[0]).toBe('basics');
    expect((last[1] as FormBag['basics']).areaSqm).toBe('80');
  });

  // Test 10
  test('currency chip tap dispatches onChange("basics", { currency })', async () => {
    const { root, onChange } = await renderStep3();
    const chip = findByTestID(root, 'currency-chip-USD');
    await ReactTestRenderer.act(async () => {
      chip.props.onPress();
    });
    const last = onChange.mock.calls[onChange.mock.calls.length - 1];
    expect(last[0]).toBe('basics');
    expect((last[1] as FormBag['basics']).currency).toBe('USD');
  });

  // Test 11
  test('rooms chip tap dispatches onChange("basics", { rooms })', async () => {
    const values: FormBag = { ...emptyFormBag(), propertyType: 'apartment' };
    const { root, onChange } = await renderStep3({ values });
    const chip = findByTestID(root, 'rooms-chip-2');
    await ReactTestRenderer.act(async () => {
      chip.props.onPress();
    });
    const last = onChange.mock.calls[onChange.mock.calls.length - 1];
    expect(last[0]).toBe('basics');
    expect((last[1] as FormBag['basics']).rooms).toBe('2');
  });
});

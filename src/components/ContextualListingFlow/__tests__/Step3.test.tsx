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
import { formBagToPropertyPayload } from '../adapters';
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

/**
 * Phase 7 Plan 07-04 — D-12 stepper integration matrix.
 *
 *   D-12.1 apartment + undefined  → both stepper rows visible; value cells render '—'
 *   D-12.2 hotel/hostel/office/commercial → only bathroomCount visible; land → both absent
 *   D-12.3 edit-owner bedrooms=3   → stepper renders '3'; round-trip preserves 3
 *   D-12.4 edit-owner undefined    → stepper renders '—'; round-trip preserves undefined verbatim
 *
 * Test stack mirrors the Plan 02-03 setup above: react-test-renderer + act, mocked
 * useTheme + useLanguage, <Step3BasicInfo> mounted directly with synthesized FormBag.
 * RTL / jest-native are not in dev deps (project convention pinned per
 * PropertyCard.specChip.test.tsx and Plan 07-01 SUMMARY).
 */
describe('Step3BasicInfo stepper integration (Plan 07-04, D-12)', () => {
  // D-12.1
  test('apartment + bedrooms/bathroomCount undefined → both stepper rows render em-dash', async () => {
    const values: FormBag = {
      ...emptyFormBag(),
      propertyType: 'apartment',
      basics: { ...emptyFormBag().basics, bedrooms: undefined, bathroomCount: undefined },
    };
    const { root } = await renderStep3({ values });
    const bedroomsValue = tryFindByTestID(root, 'basics-bedrooms-value');
    const bathroomCountValue = tryFindByTestID(root, 'basics-bathroomCount-value');
    expect(bedroomsValue).not.toBeNull();
    expect(bathroomCountValue).not.toBeNull();
    // StepperInput formats undefined as em-dash (U+2014) per D-02 / Plan 07-01.
    expect((bedroomsValue as ReactTestInstance).props.children).toBe('—');
    expect((bathroomCountValue as ReactTestInstance).props.children).toBe('—');
  });

  // D-12.2 — bathroomCount visible, bedrooms hidden for non-residential
  test.each([['hotel'], ['hostel'], ['office'], ['commercial']] as const)(
    "propertyType='%s' → bathroomCount stepper visible; bedrooms stepper absent",
    async (pt) => {
      const values: FormBag = { ...emptyFormBag(), propertyType: pt };
      const { root } = await renderStep3({ values });
      expect(tryFindByTestID(root, 'basics-bedrooms-value')).toBeNull();
      expect(tryFindByTestID(root, 'basics-bathroomCount-value')).not.toBeNull();
    },
  );

  // D-12.2 (extended) — apartment & house show BOTH
  test.each([['apartment'], ['house']] as const)(
    "propertyType='%s' → both bedrooms + bathroomCount stepper rows visible",
    async (pt) => {
      const values: FormBag = { ...emptyFormBag(), propertyType: pt };
      const { root } = await renderStep3({ values });
      expect(tryFindByTestID(root, 'basics-bedrooms-value')).not.toBeNull();
      expect(tryFindByTestID(root, 'basics-bathroomCount-value')).not.toBeNull();
    },
  );

  // D-12.2 (extended) — propertyType absent (empty) hides BOTH; D-05/D-06 boundary.
  test("propertyType='' (unset) → both stepper rows hidden", async () => {
    const { root } = await renderStep3(); // emptyFormBag — propertyType = ''
    expect(tryFindByTestID(root, 'basics-bedrooms-value')).toBeNull();
    expect(tryFindByTestID(root, 'basics-bathroomCount-value')).toBeNull();
  });

  // D-12.3 — edit-owner pre-population for bedrooms
  test("edit-owner mode (bedrooms=3) → stepper renders '3' AND round-trip preserves 3", async () => {
    const values: FormBag = {
      ...emptyFormBag(),
      propertyType: 'apartment',
      basics: { ...emptyFormBag().basics, bedrooms: 3, bathroomCount: undefined },
    };
    const { root } = await renderStep3({ values });
    const bedroomsValue = findByTestID(root, 'basics-bedrooms-value');
    expect(bedroomsValue.props.children).toBe('3');
    // Round-trip via formBagToPropertyPayload — Plan 07-03 verbatim passthrough.
    const payload = formBagToPropertyPayload(values) as {
      basics: { bedrooms?: number; bathroomCount?: number };
    };
    expect(payload.basics.bedrooms).toBe(3);
  });

  // D-12.3 (extended) — bathroomCount=1.5 renders as '1.5' and round-trips verbatim
  test("edit-owner mode (bathroomCount=1.5) → stepper renders '1.5' AND round-trip preserves 1.5", async () => {
    const values: FormBag = {
      ...emptyFormBag(),
      propertyType: 'apartment',
      basics: { ...emptyFormBag().basics, bedrooms: 2, bathroomCount: 1.5 },
    };
    const { root } = await renderStep3({ values });
    const bathroomValue = findByTestID(root, 'basics-bathroomCount-value');
    // StepperInput formats half-step as one-decimal per D-04 / Plan 07-01.
    expect(bathroomValue.props.children).toBe('1.5');
    const payload = formBagToPropertyPayload(values) as {
      basics: { bedrooms?: number; bathroomCount?: number };
    };
    expect(payload.basics.bedrooms).toBe(2);
    expect(payload.basics.bathroomCount).toBe(1.5);
  });

  // D-12.4 — verbatim-undefined invariant (FORM-05 lock)
  test('edit-owner with bedrooms=undefined → renders em-dash AND round-trip preserves undefined (NOT 0)', async () => {
    const values: FormBag = {
      ...emptyFormBag(),
      propertyType: 'apartment',
      basics: { ...emptyFormBag().basics, bedrooms: undefined, bathroomCount: undefined },
    };
    const { root } = await renderStep3({ values });
    expect(findByTestID(root, 'basics-bedrooms-value').props.children).toBe('—');
    expect(findByTestID(root, 'basics-bathroomCount-value').props.children).toBe('—');
    // FORM-05 invariant: undefined survives the FormBag→payload direction verbatim.
    const payload = formBagToPropertyPayload(values) as {
      basics: { bedrooms?: number; bathroomCount?: number };
    };
    expect(payload.basics.bedrooms).toBeUndefined();
    expect(payload.basics.bathroomCount).toBeUndefined();
    // Belt-and-suspenders: not coerced to 0 or '' or null.
    expect(payload.basics.bedrooms).not.toBe(0);
    expect(payload.basics.bathroomCount).not.toBe(0);
  });

  // D-12 ancillary — onChange wiring: bedrooms `+` tap from undefined dispatches { bedrooms: 0 }
  test('bedrooms stepper `+` from undefined dispatches onChange("basics", { bedrooms: 0 })', async () => {
    const values: FormBag = { ...emptyFormBag(), propertyType: 'apartment' };
    const { root, onChange } = await renderStep3({ values });
    const plus = findByTestID(root, 'basics-bedrooms-plus');
    await ReactTestRenderer.act(async () => {
      plus.props.onPress();
    });
    const last = onChange.mock.calls[onChange.mock.calls.length - 1];
    expect(last[0]).toBe('basics');
    // FORM-01 contract: `+` from undefined initializes to min (0 here).
    expect((last[1] as FormBag['basics']).bedrooms).toBe(0);
  });

  // D-12 ancillary — onChange wiring: bathroomCount `+` from undefined dispatches { bathroomCount: 0 }
  test('bathroomCount stepper `+` from undefined dispatches onChange("basics", { bathroomCount: 0 })', async () => {
    const values: FormBag = { ...emptyFormBag(), propertyType: 'hotel' };
    const { root, onChange } = await renderStep3({ values });
    const plus = findByTestID(root, 'basics-bathroomCount-plus');
    await ReactTestRenderer.act(async () => {
      plus.props.onPress();
    });
    const last = onChange.mock.calls[onChange.mock.calls.length - 1];
    expect(last[0]).toBe('basics');
    expect((last[1] as FormBag['basics']).bathroomCount).toBe(0);
  });

  // D-12 ancillary — inline error row surfaces errors['basics.bedrooms']
  test('errors["basics.bedrooms"] renders the localized error string below the bedrooms stepper', async () => {
    const values: FormBag = { ...emptyFormBag(), propertyType: 'apartment' };
    const errors: FormErrorBag = {
      'basics.bedrooms': 'contextualListing.step3.bedroomsInvalid',
    };
    const { root } = await renderStep3({ values, errors });
    // Mock t() returns the key verbatim; the error text node should contain that key.
    const errorTexts = root.findAllByType('Text' as unknown as React.ComponentType).filter((n) => {
      const c = n.props.children;
      return c === 'contextualListing.step3.bedroomsInvalid';
    });
    expect(errorTexts.length).toBeGreaterThan(0);
  });
});

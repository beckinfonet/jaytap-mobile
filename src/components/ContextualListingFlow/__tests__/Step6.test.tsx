/**
 * Phase 2 Plan 02-04b — Step6DealConditions RTL smoke tests (FLOW-11 + D-19).
 *
 * Test stack: react-test-renderer (matches Step1-5 tests in this dir).
 *
 * Coverage matrix per RESEARCH §"Step 6 Matrix Cheatsheet" (lines 652-664) and CONTEXT D-19:
 *   sale       → negotiable (required) + deposit (optional)
 *   rent_long  → negotiable (required) + deposit (optional) + prepaymentMonths (0/1/2/Custom int) + minTerm (1_month/3_months)
 *   rent_daily → deposit (optional) only — D-19 thin step
 *
 * Pitfall 6 mitigation: tapping "Custom" prepayment chip OPENS a number input below
 * SEEDED with the current `prepaymentMonths` value (does not clobber preset choice
 * unless user types a new number).
 *
 * Edit-mod submit-button morph (FLOW-15) is exercised in `integration.test.tsx`,
 * not here — Step6 is a SectionProps consumer with no `mode` prop; the orchestrator
 * (`index.tsx`) owns the submit-button label.
 *
 * Optional-deposit currency selector tests (Tests 10/11) cover the CONTEXT specifics
 * §"Step 6 deposit currency" cell — chips KGS/USD/EUR; defaults to values.basics.currency.
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import type { ReactTestInstance } from 'react-test-renderer';
import { Step6DealConditions } from '../Step6DealConditions';
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

async function renderStep6(args: RenderArgs = {}) {
  const onChange = jest.fn();
  const values = args.values ?? emptyFormBag();
  const errors = args.errors ?? {};
  let tree!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(
      <Step6DealConditions values={values} onChange={onChange} errors={errors} />,
    );
  });
  return { tree, root: tree.root, onChange };
}

function bagFor(dealType: FormBag['dealType'], terms: FormBag['terms'] = {}): FormBag {
  return {
    ...emptyFormBag(),
    dealType,
    basics: { areaSqm: '80', price: '1000', currency: 'KGS' },
    terms,
  };
}

describe('Step6DealConditions (Plan 02-04b)', () => {
  // Test 1 — sale cell: negotiable Yes/No + deposit; NO prepayment, NO minTerm
  test('Test 1: sale cell renders negotiable + deposit only (no prepayment, no minTerm)', async () => {
    const { root } = await renderStep6({ values: bagFor('sale') });
    expect(findByTestID(root, 'negotiable-chip-yes')).toBeTruthy();
    expect(findByTestID(root, 'negotiable-chip-no')).toBeTruthy();
    expect(findByTestID(root, 'deposit-amount')).toBeTruthy();
    expect(tryFindByTestID(root, 'prepayment-chip-0')).toBeNull();
    expect(tryFindByTestID(root, 'prepayment-chip-custom')).toBeNull();
    expect(tryFindByTestID(root, 'minTerm-chip-1_month')).toBeNull();
  });

  // Test 2 — rent_long cell: negotiable + deposit + prepayment + minTerm all visible
  test('Test 2: rent_long cell renders negotiable + deposit + prepayment chips + minTerm chips', async () => {
    const { root } = await renderStep6({ values: bagFor('rent_long') });
    expect(findByTestID(root, 'negotiable-chip-yes')).toBeTruthy();
    expect(findByTestID(root, 'negotiable-chip-no')).toBeTruthy();
    expect(findByTestID(root, 'deposit-amount')).toBeTruthy();
    expect(findByTestID(root, 'prepayment-chip-0')).toBeTruthy();
    expect(findByTestID(root, 'prepayment-chip-1')).toBeTruthy();
    expect(findByTestID(root, 'prepayment-chip-2')).toBeTruthy();
    expect(findByTestID(root, 'prepayment-chip-custom')).toBeTruthy();
    expect(findByTestID(root, 'minTerm-chip-1_month')).toBeTruthy();
    expect(findByTestID(root, 'minTerm-chip-3_months')).toBeTruthy();
  });

  // Test 3 — tapping prepayment chip '1' dispatches prepaymentMonths: 1
  test("Test 3: tapping prepayment chip '1' dispatches onChange terms.prepaymentMonths=1", async () => {
    const { root, onChange } = await renderStep6({ values: bagFor('rent_long') });
    const chip = findByTestID(root, 'prepayment-chip-1');
    await ReactTestRenderer.act(async () => {
      chip.props.onPress();
    });
    const last = onChange.mock.calls[onChange.mock.calls.length - 1];
    expect(last[0]).toBe('terms');
    expect((last[1] as FormBag['terms']).prepaymentMonths).toBe(1);
  });

  // Test 4 — tapping 'Custom' chip OPENS the number input below
  test('Test 4: tapping Custom chip opens prepayment-custom-input number field', async () => {
    const { root } = await renderStep6({ values: bagFor('rent_long') });
    expect(tryFindByTestID(root, 'prepayment-custom-input')).toBeNull();

    const customChip = findByTestID(root, 'prepayment-chip-custom');
    await ReactTestRenderer.act(async () => {
      customChip.props.onPress();
    });
    expect(tryFindByTestID(root, 'prepayment-custom-input')).not.toBeNull();
  });

  // Test 5 — tapping Custom when prior preset='1' shows '1' in Custom input (Pitfall 6 seed)
  test("Test 5: tapping Custom seeds input with current preset value (Pitfall 6 — does NOT clobber)", async () => {
    const { root } = await renderStep6({
      values: bagFor('rent_long', { prepaymentMonths: 1 }),
    });

    const customChip = findByTestID(root, 'prepayment-chip-custom');
    await ReactTestRenderer.act(async () => {
      customChip.props.onPress();
    });
    const input = findByTestID(root, 'prepayment-custom-input');
    expect(input.props.value).toBe('1');
  });

  // Test 6 — typing in Custom input dispatches prepaymentMonths: typedNumber
  test('Test 6: typing in Custom input dispatches terms.prepaymentMonths as parsed integer', async () => {
    const { root, onChange } = await renderStep6({ values: bagFor('rent_long') });

    const customChip = findByTestID(root, 'prepayment-chip-custom');
    await ReactTestRenderer.act(async () => {
      customChip.props.onPress();
    });
    const input = findByTestID(root, 'prepayment-custom-input');
    await ReactTestRenderer.act(async () => {
      input.props.onChangeText('5');
    });
    const last = onChange.mock.calls[onChange.mock.calls.length - 1];
    expect(last[0]).toBe('terms');
    expect((last[1] as FormBag['terms']).prepaymentMonths).toBe(5);
  });

  // Test 7 — tapping minTerm '3_months' dispatches minTerm: '3_months'
  test("Test 7: tapping minTerm '3_months' dispatches onChange terms.minTerm='3_months'", async () => {
    const { root, onChange } = await renderStep6({ values: bagFor('rent_long') });
    const chip = findByTestID(root, 'minTerm-chip-3_months');
    await ReactTestRenderer.act(async () => {
      chip.props.onPress();
    });
    const last = onChange.mock.calls[onChange.mock.calls.length - 1];
    expect(last[0]).toBe('terms');
    expect((last[1] as FormBag['terms']).minTerm).toBe('3_months');
  });

  // Test 8 — rent_daily thin step (D-19): only deposit, no negotiable/prepayment/minTerm
  test('Test 8: rent_daily cell renders ONLY deposit (D-19 thin step)', async () => {
    const { root } = await renderStep6({ values: bagFor('rent_daily') });
    expect(findByTestID(root, 'deposit-amount')).toBeTruthy();
    expect(tryFindByTestID(root, 'negotiable-chip-yes')).toBeNull();
    expect(tryFindByTestID(root, 'prepayment-chip-0')).toBeNull();
    expect(tryFindByTestID(root, 'minTerm-chip-1_month')).toBeNull();
  });

  // Test 9 — Submit-button morph for edit-mod is asserted in integration.test.tsx (orchestrator owns label)
  test('Test 9: Step6 component itself does NOT render the submit-button label (orchestrator owns it)', async () => {
    const { root } = await renderStep6({ values: bagFor('rent_long') });
    // Orchestrator-level testID `contextual-listing-next` is NOT present in Step6.tsx tree.
    expect(tryFindByTestID(root, 'contextual-listing-next')).toBeNull();
  });

  // Test 10 — deposit currency selector chips render KGS/USD/EUR
  test('Test 10: deposit currency selector chips render KGS / USD / EUR', async () => {
    const { root } = await renderStep6({
      values: bagFor('rent_long', { deposit: { amount: '500', currency: 'KGS' } }),
    });
    expect(findByTestID(root, 'deposit-currency-KGS')).toBeTruthy();
    expect(findByTestID(root, 'deposit-currency-USD')).toBeTruthy();
    expect(findByTestID(root, 'deposit-currency-EUR')).toBeTruthy();
  });

  // Test 11 — typing a deposit amount dispatches deposit with currency defaulted to basics.currency
  test('Test 11: typing deposit amount dispatches deposit with currency defaulted to basics.currency', async () => {
    const values = bagFor('rent_long'); // basics.currency='KGS', no deposit yet
    const { root, onChange } = await renderStep6({ values });

    const input = findByTestID(root, 'deposit-amount');
    await ReactTestRenderer.act(async () => {
      input.props.onChangeText('500');
    });
    const last = onChange.mock.calls[onChange.mock.calls.length - 1];
    expect(last[0]).toBe('terms');
    const t = last[1] as FormBag['terms'];
    expect(t.deposit?.amount).toBe('500');
    expect(t.deposit?.currency).toBe('KGS');
  });
});

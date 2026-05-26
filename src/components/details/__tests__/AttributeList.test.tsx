/**
 * AttributeList — derivePropertyAttributes (helper) tests.
 * Component tests added in Task 5.
 * Pure-function unit tests against the 6-field derivation.
 */

import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { View, Text } from 'react-native';
import { derivePropertyAttributes, AttributeList } from '../AttributeList';
import type { Property } from '../../../types/Property';

jest.mock('../../../theme/ThemeContext', () => ({ useTheme: jest.fn() }));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { useTheme } = require('../../../theme/ThemeContext');

const tStub = (key: string) => key;

describe('derivePropertyAttributes', () => {
  it('returns an empty array when no relevant fields are set', () => {
    const property = {} as Property;
    expect(derivePropertyAttributes(property, tStub)).toEqual([]);
  });

  it('emits a Condition row when conditionAndAmenities.condition is set', () => {
    const property = { conditionAndAmenities: { condition: 'euro' } } as Property;
    const rows = derivePropertyAttributes(property, tStub);
    expect(rows).toHaveLength(1);
    expect(rows[0].kind).toBe('condition');
    expect(rows[0].label).toBe('property.metaCondition');
    expect(rows[0].value).toBe('condition.euro');
  });

  it.each([
    ['rough', 'error'],
    ['whitebox', 'orange'],
    ['good', 'warning'],
    ['euro', 'success'],
  ] as const)('routes condition %s → color token %s', (cond, token) => {
    const property = { conditionAndAmenities: { condition: cond } } as Property;
    const rows = derivePropertyAttributes(property, tStub);
    if (rows[0].kind === 'condition') {
      expect(rows[0].colorToken).toBe(token);
    } else {
      throw new Error('expected condition row');
    }
  });

  it('emits a boolean Furnished row (on=true) when furnished is true', () => {
    const property = { conditionAndAmenities: { furnished: true } } as Property;
    const rows = derivePropertyAttributes(property, tStub);
    const furnished = rows.find((r) => r.label === 'property.metaFurnishedYes');
    expect(furnished?.kind).toBe('boolean');
    if (furnished?.kind === 'boolean') {
      expect(furnished.on).toBe(true);
      expect(furnished.value).toBe('common.yes');
    }
  });

  it('emits a boolean Furnished row (on=false) when furnished is false', () => {
    const property = { conditionAndAmenities: { furnished: false } } as Property;
    const rows = derivePropertyAttributes(property, tStub);
    const furnished = rows.find((r) => r.label === 'property.metaFurnishedNo');
    expect(furnished?.kind).toBe('boolean');
    if (furnished?.kind === 'boolean') {
      expect(furnished.on).toBe(false);
      expect(furnished.value).toBe('common.no');
    }
  });

  it('emits a boolean Negotiable row', () => {
    const property = { terms: { negotiable: true } } as Property;
    const rows = derivePropertyAttributes(property, tStub);
    const neg = rows.find((r) => r.label === 'property.metaNegotiable');
    expect(neg?.kind).toBe('boolean');
  });

  it('emits a plain Min term row when terms.minTerm is set', () => {
    const property = { terms: { minTerm: '1_month' } } as Property;
    const rows = derivePropertyAttributes(property, tStub);
    const minTerm = rows.find((r) => r.label === 'property.metaMinTerm');
    expect(minTerm?.kind).toBe('plain');
    expect(minTerm?.value).toBe('minTerm.1_month');
  });

  it('emits a plain Deposit row formatted "amount currency"', () => {
    const property = { terms: { deposit: { amount: 500, currency: 'USD' } } } as Property;
    const rows = derivePropertyAttributes(property, tStub);
    const dep = rows.find((r) => r.label === 'property.metaDeposit');
    expect(dep?.kind).toBe('plain');
    expect(dep?.value).toBe('500 USD');
  });

  it('emits a plain Prepayment row (0 → "none" key, otherwise count)', () => {
    const zero = { terms: { prepaymentMonths: 0 } } as Property;
    const one = { terms: { prepaymentMonths: 1 } } as Property;
    const zeroRow = derivePropertyAttributes(zero, tStub).find((r) => r.label === 'property.metaPrepayment');
    const oneRow = derivePropertyAttributes(one, tStub).find((r) => r.label === 'property.metaPrepayment');
    expect(zeroRow?.value).toBe('prepayment.none');
    expect(oneRow?.value).toBe('1');
  });

  it('returns rows in fixed order: Condition, Furnished, Negotiable, MinTerm, Deposit, Prepayment', () => {
    const property = {
      conditionAndAmenities: { condition: 'good', furnished: true },
      terms: {
        negotiable: false,
        minTerm: '3_months',
        deposit: { amount: 100, currency: 'KGS' },
        prepaymentMonths: 2,
      },
    } as Property;
    const rows = derivePropertyAttributes(property, tStub);
    expect(rows.map((r) => r.label)).toEqual([
      'property.metaCondition',
      'property.metaFurnishedYes',
      'property.metaNegotiable',
      'property.metaMinTerm',
      'property.metaDeposit',
      'property.metaPrepayment',
    ]);
  });
});

const setupRenderMocks = () => {
  useTheme.mockReturnValue({
    isDark: true,
    colors: {
      text: '',
      textSecondary: '',
      textTertiary: '',
      border: '',
      success: '#4CAF50',
      warning: '#F59E0B',
      error: '#F44336',
    },
  });
};

const findAllText = (root: TestRenderer.ReactTestInstance): string[] =>
  root
    .findAllByType(Text)
    .map((n) => (Array.isArray(n.props.children) ? n.props.children.join('') : String(n.props.children ?? '')));

describe('AttributeList component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupRenderMocks();
  });

  it('renders nothing when rows is empty', () => {
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(<AttributeList rows={[]} />);
    });
    expect(renderer.toJSON()).toBeNull();
  });

  it('renders one row per item', () => {
    const rows = [
      {
        kind: 'plain' as const,
        icon: (() => null) as any,
        label: 'A',
        value: '1',
      },
      {
        kind: 'plain' as const,
        icon: (() => null) as any,
        label: 'B',
        value: '2',
      },
    ];
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(<AttributeList rows={rows} />);
    });
    const text = findAllText(renderer.root);
    expect(text).toContain('A');
    expect(text).toContain('B');
    expect(text).toContain('1');
    expect(text).toContain('2');
  });

  it('drops borderBottom on the last row', () => {
    const rows = [
      { kind: 'plain' as const, icon: (() => null) as any, label: 'A', value: '1' },
      { kind: 'plain' as const, icon: (() => null) as any, label: 'B', value: '2' },
    ];
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(<AttributeList rows={rows} />);
    });
    const allRows = renderer.root.findAllByProps({ testID: 'attribute-row' });
    // React.forwardRef causes duplicate matches (wrapped + host). Take host Views (typeof === 'string').
    const hostRows = allRows.filter((r) => typeof r.type === 'string');
    expect(hostRows).toHaveLength(2);
    // Last row's flattened style has borderBottomWidth 0; non-last rows have hairline.
    const flatten = (style: any): any => (Array.isArray(style) ? Object.assign({}, ...style.filter(Boolean)) : style ?? {});
    expect(flatten(hostRows[0].props.style).borderBottomWidth).toBeGreaterThan(0);
    expect(flatten(hostRows[1].props.style).borderBottomWidth).toBe(0);
  });
});

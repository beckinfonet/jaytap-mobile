/**
 * KeyStatsCard test — beds (omittable) + baths + area card.
 */

import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';

jest.mock('../../../theme/ThemeContext', () => ({ useTheme: jest.fn() }));
jest.mock('../../../context/LanguageContext', () => ({ useLanguage: jest.fn() }));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { useTheme } = require('../../../theme/ThemeContext');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { useLanguage } = require('../../../context/LanguageContext');
import { KeyStatsCard } from '../KeyStatsCard';

beforeEach(() => {
  jest.clearAllMocks();
  useTheme.mockReturnValue({
    isDark: true,
    colors: { text: '', textSecondary: '', textTertiary: '', surface: '', border: '' },
  });
  useLanguage.mockReturnValue({ t: (k: string) => k, language: 'en' });
});

const findAllText = (root: TestRenderer.ReactTestInstance): string[] =>
  root
    .findAllByType(Text)
    .map((n) => (Array.isArray(n.props.children) ? n.props.children.join('') : String(n.props.children ?? '')));

describe('KeyStatsCard', () => {
  it('renders beds + baths + area cells when all provided', () => {
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(
        <KeyStatsCard
          beds={{ value: 3, labelKey: 'property.specs.bedrooms' as any }}
          baths={3.5}
          areaSqm={300}
        />
      );
    });
    const texts = findAllText(renderer.root);
    expect(texts).toContain('3');
    expect(texts).toContain('3.5');
    expect(texts).toContain('300');
    expect(texts).toContain('property.specs.bedrooms');
    expect(texts).toContain('property.specs.bathrooms');
  });

  it('omits the beds cell entirely when beds is undefined', () => {
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(
        <KeyStatsCard beds={undefined} baths={2} areaSqm={120} />
      );
    });
    expect(renderer.root.findAllByProps({ testID: 'stat-beds' })).toHaveLength(0);
    expect(renderer.root.findAllByProps({ testID: 'stat-baths' }).filter((r) => typeof r.type === 'string')).toHaveLength(1);
    expect(renderer.root.findAllByProps({ testID: 'stat-area' }).filter((r) => typeof r.type === 'string')).toHaveLength(1);
  });

  it('renders "m²" inline next to the area number', () => {
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(
        <KeyStatsCard beds={undefined} baths={1} areaSqm={50} />
      );
    });
    const area = renderer.root.findAllByProps({ testID: 'stat-area' }).find((r) => typeof r.type === 'string');
    if (!area) throw new Error('expected stat-area host view');
    const areaTexts = area
      .findAllByType(Text)
      .map((n) => String(n.props.children ?? ''));
    expect(areaTexts).toContain('m²');
  });

  it('renders "-" when baths or areaSqm is undefined', () => {
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(
        <KeyStatsCard beds={undefined} baths={undefined as any} areaSqm={undefined} />
      );
    });
    const texts = findAllText(renderer.root);
    expect(texts.filter((t) => t === '-').length).toBeGreaterThanOrEqual(2);
  });

  it('applies textTransform: uppercase to label styles', () => {
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(
        <KeyStatsCard
          beds={{ value: 1, labelKey: 'property.specs.bedrooms' as any }}
          baths={1}
          areaSqm={50}
        />
      );
    });
    const labels = renderer.root
      .findAllByType(Text)
      .filter((n) => String(n.props.children) === 'property.specs.bedrooms');
    expect(labels.length).toBeGreaterThan(0);
    const flatten = (style: any): any => (Array.isArray(style) ? Object.assign({}, ...style.filter(Boolean)) : style ?? {});
    expect(flatten(labels[0].props.style).textTransform).toBe('uppercase');
  });
});

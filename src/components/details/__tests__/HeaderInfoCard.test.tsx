/**
 * HeaderInfoCard test — pill row + status pill + title + address + divider + map slot.
 */

import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { Text, View } from 'react-native';

jest.mock('../../../theme/ThemeContext', () => ({ useTheme: jest.fn() }));
jest.mock('../../../context/LanguageContext', () => ({ useLanguage: jest.fn() }));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { useTheme } = require('../../../theme/ThemeContext');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { useLanguage } = require('../../../context/LanguageContext');
import { HeaderInfoCard } from '../HeaderInfoCard';

beforeEach(() => {
  jest.clearAllMocks();
  useTheme.mockReturnValue({
    isDark: true,
    colors: {
      text: '',
      textSecondary: '',
      textTertiary: '',
      surface: '',
      border: '',
      accent: '#FF385C',
    },
  });
  useLanguage.mockReturnValue({ t: (k: string) => k, language: 'en' });
});

const findAllText = (root: TestRenderer.ReactTestInstance): string[] =>
  root
    .findAllByType(Text)
    .map((n) => (Array.isArray(n.props.children) ? n.props.children.join('') : String(n.props.children ?? '')));

const defaultProps = {
  dealType: 'sale' as const,
  listingId: '664-402',
  title: 'Best house money can buy',
  formattedAddress: { line1: 'Alamedin-1, ул. Ахунбаева 142', line2: 'Bishkek' },
};

describe('HeaderInfoCard', () => {
  it('renders FOR SALE pill when dealType is "sale"', () => {
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(<HeaderInfoCard {...defaultProps} />);
    });
    expect(findAllText(renderer.root)).toContain('property.forSale');
  });

  it('renders FOR RENT pill when dealType is not "sale"', () => {
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(<HeaderInfoCard {...defaultProps} dealType="rent" />);
    });
    expect(findAllText(renderer.root)).toContain('property.forRent');
  });

  it('renders the listing ID pill with leading #', () => {
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(<HeaderInfoCard {...defaultProps} />);
    });
    expect(findAllText(renderer.root)).toContain('#664-402');
  });

  it('omits the listing ID pill when listingId is null', () => {
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(<HeaderInfoCard {...defaultProps} listingId={null} />);
    });
    expect(renderer.root.findAllByProps({ testID: 'id-pill' }).filter((r) => typeof r.type === 'string')).toHaveLength(0);
  });

  it('renders the title verbatim', () => {
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(<HeaderInfoCard {...defaultProps} />);
    });
    expect(findAllText(renderer.root)).toContain('Best house money can buy');
  });

  it('renders address line1 and line2 with a · separator', () => {
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(<HeaderInfoCard {...defaultProps} />);
    });
    const texts = findAllText(renderer.root);
    expect(texts).toContain('Alamedin-1, ул. Ахунбаева 142');
    expect(texts.some((s) => s.includes('·') && s.includes('Bishkek'))).toBe(true);
  });

  it('renders the statusPill slot between pills and title', () => {
    const sentinel = (<Text testID="status-sentinel">STATUS_X</Text>);
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(<HeaderInfoCard {...defaultProps} statusPill={sentinel} />);
    });
    expect(renderer.root.findAllByProps({ testID: 'status-sentinel' }).filter((r) => typeof r.type === 'string')).toHaveLength(1);
  });

  it('renders the mapPreview slot below the divider', () => {
    const sentinel = (<View testID="map-sentinel"><Text>MAP</Text></View>);
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(<HeaderInfoCard {...defaultProps} mapPreview={sentinel} />);
    });
    expect(renderer.root.findAllByProps({ testID: 'map-sentinel' }).filter((r) => typeof r.type === 'string')).toHaveLength(1);
  });
});

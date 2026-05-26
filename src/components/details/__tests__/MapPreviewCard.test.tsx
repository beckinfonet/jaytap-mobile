/**
 * MapPreviewCard test — render contract per M5 Phase 1 spec § 4.3.
 * Uses react-test-renderer + act per project convention (ListingMetaTable.test.tsx L20-23).
 * `t` mock returns the i18n key verbatim, so button-text assertions check for the
 * literal key string 'property.mapPreview.openButton'.
 */

import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { Text, TouchableOpacity } from 'react-native';

jest.mock('../../../theme/ThemeContext', () => ({ useTheme: jest.fn() }));
jest.mock('../../../context/LanguageContext', () => ({ useLanguage: jest.fn() }));

// react-native-maps mock — mirrors ListingMetaTable.test.tsx pattern.
jest.mock('react-native-maps', () => {
  const React = require('react');
  const { View } = require('react-native');
  const MapView = ({ children, testID, ...rest }: any) =>
    React.createElement(View, { testID: testID ?? 'map-view', ...rest }, children);
  const Marker = ({ children, ...rest }: any) =>
    React.createElement(View, { testID: 'map-marker', ...rest }, children);
  return { __esModule: true, default: MapView, Marker, PROVIDER_DEFAULT: 'default' };
});

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { useTheme } = require('../../../theme/ThemeContext');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { useLanguage } = require('../../../context/LanguageContext');
import { MapPreviewCard } from '../MapPreviewCard';

const setupMocks = () => {
  useTheme.mockReturnValue({
    isDark: false,
    colors: {
      text: '',
      textSecondary: '',
      textTertiary: '',
      surface: '',
      border: '',
      accent: '#FF385C',
    },
  });
  useLanguage.mockReturnValue({
    t: (key: string) => key,
    language: 'en',
  });
};

beforeEach(() => {
  jest.clearAllMocks();
  setupMocks();
});

const defaultProps = {
  coordinates: { latitude: 42.87, longitude: 74.61 },
  district: 'Alamedin-1',
  city: 'Bishkek',
  onOpenFullScreen: jest.fn(),
};

const findAllText = (root: TestRenderer.ReactTestInstance): string[] =>
  root
    .findAllByType(Text)
    .map((n) => (Array.isArray(n.props.children) ? n.props.children.join('') : String(n.props.children ?? '')));

describe('MapPreviewCard', () => {
  it('renders district as the bold heading', () => {
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(<MapPreviewCard {...defaultProps} />);
    });
    expect(findAllText(renderer.root)).toContain('Alamedin-1');
  });

  it('renders city followed by country resolved via cityToCountry', () => {
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(<MapPreviewCard {...defaultProps} />);
    });
    const texts = findAllText(renderer.root);
    // city line contains 'Bishkek' and the country i18n key (mock returns key verbatim).
    expect(texts.some((s) => s.includes('Bishkek') && s.includes('country.KG'))).toBe(true);
  });

  it('omits country when city is not in the lookup', () => {
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(<MapPreviewCard {...defaultProps} city="Paris" />);
    });
    const texts = findAllText(renderer.root);
    // city line should be 'Paris' alone — no 'country.*' key present.
    expect(texts.some((s) => s === 'Paris')).toBe(true);
    expect(texts.some((s) => /country\./.test(s))).toBe(false);
  });

  it('formats coords as "42.87° N · 74.61° E"', () => {
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(<MapPreviewCard {...defaultProps} />);
    });
    expect(findAllText(renderer.root)).toContain('42.87° N · 74.61° E');
  });

  it('flips cardinal letters for negative coords', () => {
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(
        <MapPreviewCard {...defaultProps} coordinates={{ latitude: -34.6, longitude: -58.38 }} />
      );
    });
    expect(findAllText(renderer.root)).toContain('34.60° S · 58.38° W');
  });

  it('calls onOpenFullScreen when the "Map" button is pressed', () => {
    const onOpen = jest.fn();
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(<MapPreviewCard {...defaultProps} onOpenFullScreen={onOpen} />);
    });
    const button = renderer.root
      .findAllByType(TouchableOpacity)
      .find((n) =>
        findAllText(n).some((s) => s.includes('property.mapPreview.openButton'))
      );
    expect(button).toBeDefined();
    act(() => {
      button!.props.onPress();
    });
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it('omits the district line when district is undefined', () => {
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(<MapPreviewCard {...defaultProps} district={undefined} />);
    });
    expect(findAllText(renderer.root)).not.toContain('Alamedin-1');
  });
});

/**
 * MultiHint test — verifies the i18n key consumption.
 *
 * Phase 14 Plan 14-01 (FILT-01).
 */
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';

jest.mock('../../../../theme/ThemeContext', () => ({ useTheme: jest.fn() }));
jest.mock('../../../../context/LanguageContext', () => ({ useLanguage: jest.fn() }));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { useTheme } = require('../../../../theme/ThemeContext');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { useLanguage } = require('../../../../context/LanguageContext');
import MultiHint from '../MultiHint';

beforeEach(() => {
  jest.clearAllMocks();
  useTheme.mockReturnValue({
    isDark: true,
    colors: {
      surface2: '#26262c',
      textTertiary: 'rgba(244,244,246,0.40)',
    },
  });
});

describe('MultiHint', () => {
  test('renders the filters.type.multiHint translated text', () => {
    const tFn = jest.fn((k: string) => k);
    useLanguage.mockReturnValue({ t: tFn, language: 'en' });

    let tree!: TestRenderer.ReactTestRenderer;
    act(() => {
      tree = TestRenderer.create(<MultiHint />);
    });

    expect(tFn).toHaveBeenCalledWith('filters.type.multiHint');
    const texts = tree.root
      .findAllByType(Text)
      .map((n) => String(n.props.children ?? ''));
    expect(texts).toContain('filters.type.multiHint');
  });
});

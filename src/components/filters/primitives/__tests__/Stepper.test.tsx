/**
 * Stepper test — 3 pills + 2 connectors + reached/done/active states.
 *
 * Phase 14 Plan 14-01 (FILT-01). Pattern: react-test-renderer + act +
 * jest.mock theme/language.
 */
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import { Check } from 'lucide-react-native';

jest.mock('../../../../theme/ThemeContext', () => ({ useTheme: jest.fn() }));
jest.mock('../../../../context/LanguageContext', () => ({ useLanguage: jest.fn() }));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { useTheme } = require('../../../../theme/ThemeContext');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { useLanguage } = require('../../../../context/LanguageContext');
import Stepper from '../Stepper';

beforeEach(() => {
  jest.clearAllMocks();
  useTheme.mockReturnValue({
    isDark: true,
    colors: {
      accent: '#ff5a6f',
      landlordGreen: '#35c98f',
      surface2: '#26262c',
      text: '#f4f4f6',
      textSecondary: 'rgba(244,244,246,0.60)',
      textTertiary: 'rgba(244,244,246,0.40)',
    },
  });
  useLanguage.mockReturnValue({ t: (k: string) => k, language: 'en' });
});

const findByLabel = (tree: TestRenderer.ReactTestRenderer, label: string) =>
  tree.root.findAll((n) => !!n.props && n.props.accessibilityLabel === label)[0];

const findAllNumberTexts = (tree: TestRenderer.ReactTestRenderer): string[] =>
  tree.root
    .findAllByType(Text)
    .map((n) => String(n.props.children ?? ''))
    .filter((s) => s === '1' || s === '2' || s === '3');

describe('Stepper', () => {
  test('renders 3 pills (numbered 1/2/3) when step=0, reached=all-true', () => {
    let tree!: TestRenderer.ReactTestRenderer;
    act(() => {
      tree = TestRenderer.create(
        <Stepper step={0} onStepPress={jest.fn()} reached={() => true} />,
      );
    });
    const numbers = findAllNumberTexts(tree);
    expect(numbers).toEqual(['1', '2', '3']);
  });

  test('step=0 + reached(0)=true, reached(1)=false, reached(2)=false: pill 1+2 disabled', () => {
    let tree!: TestRenderer.ReactTestRenderer;
    act(() => {
      tree = TestRenderer.create(
        <Stepper
          step={0}
          onStepPress={jest.fn()}
          reached={(i: number) => i === 0}
        />,
      );
    });
    const pill0 = findByLabel(tree, 'filters.step.deal');
    const pill1 = findByLabel(tree, 'filters.step.category');
    const pill2 = findByLabel(tree, 'filters.step.type');
    expect(pill0.props.accessibilityState.disabled).toBe(false);
    expect(pill1.props.accessibilityState.disabled).toBe(true);
    expect(pill2.props.accessibilityState.disabled).toBe(true);
  });

  test('step=1 shows a Check glyph on pill 0 (done state)', () => {
    let tree!: TestRenderer.ReactTestRenderer;
    act(() => {
      tree = TestRenderer.create(
        <Stepper step={1} onStepPress={jest.fn()} reached={() => true} />,
      );
    });
    // exactly one Check glyph rendered (only pill 0 is done at step=1)
    expect(tree.root.findAllByType(Check).length).toBe(1);
  });

  test('pressing reached pill 0 fires onStepPress(0)', () => {
    const onStepPress = jest.fn();
    let tree!: TestRenderer.ReactTestRenderer;
    act(() => {
      tree = TestRenderer.create(
        <Stepper step={1} onStepPress={onStepPress} reached={() => true} />,
      );
    });
    const pill0 = findByLabel(tree, 'filters.step.deal');
    act(() => {
      pill0.props.onPress();
    });
    expect(onStepPress).toHaveBeenCalledWith(0);
  });

  test('pressing unreached pill 2 does NOT fire onStepPress', () => {
    const onStepPress = jest.fn();
    let tree!: TestRenderer.ReactTestRenderer;
    act(() => {
      tree = TestRenderer.create(
        <Stepper
          step={0}
          onStepPress={onStepPress}
          reached={(i: number) => i === 0}
        />,
      );
    });
    const pill2 = findByLabel(tree, 'filters.step.type');
    // onPress is undefined for unreached pills, so calling it is a no-op
    expect(pill2.props.onPress).toBeUndefined();
    expect(pill2.props.disabled).toBe(true);
    expect(onStepPress).not.toHaveBeenCalled();
  });
});

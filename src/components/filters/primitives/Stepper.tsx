/**
 * Stepper — 3-pill 1-2-3 stepper bar with connector bars.
 *
 * Phase 14 Plan 14-01 (FILT-01). Used in GuidedFilterSheet header for Deal →
 * Category → Type navigation.
 *
 * Visual states (per handoff filters-variants.jsx:99-110 + CONTEXT.md §Specifics):
 *   - done  (step > i) → colors.landlordGreen bg + white Check glyph + dim label
 *   - active (step === i) → colors.accent bg + '#fff' "1/2/3" + full-text label
 *   - reachable (step < i && reached(i)) → colors.surface2 bg + mute number + mute label
 *   - future (step < i && !reached(i)) → same visuals as reachable but disabled (no press)
 *
 * Connector bars: 2pt height, colors.landlordGreen when step > i (i = the
 * index BEFORE the connector), else colors.surface2.
 *
 * Hex-literal note: `'#fff'` for the active pill number is text-on-accent.
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Check } from 'lucide-react-native';
import { useTheme } from '../../../theme/ThemeContext';
import { useLanguage } from '../../../context/LanguageContext';
import type { TranslationKeys } from '../../../locales';

const STEPS = ['deal', 'category', 'type'] as const;
type StepKey = (typeof STEPS)[number];

export interface StepperProps {
  step: 0 | 1 | 2;
  onStepPress: (i: number) => void;
  reached: (i: number) => boolean;
}

const Stepper: React.FC<StepperProps> = ({ step, onStepPress, reached }) => {
  const { colors } = useTheme();
  const { t } = useLanguage();

  return (
    <View style={styles.row}>
      {STEPS.map((s: StepKey, i: number) => {
        const isDone = step > i;
        const isActive = step === i;
        const isReachable = reached(i);
        const labelKey = `filters.step.${s}` as TranslationKeys;
        const label = t(labelKey);

        const pillBg = isDone
          ? colors.landlordGreen
          : isActive
            ? colors.accent
            : colors.surface2;
        const numberColor = isDone || isActive ? '#fff' : colors.textTertiary;
        const labelColor = isActive
          ? colors.text
          : isDone
            ? colors.textSecondary
            : colors.textTertiary;

        return (
          <React.Fragment key={s}>
            <View style={styles.pillCol}>
              <Pressable
                onPress={isReachable ? () => onStepPress(i) : undefined}
                disabled={!isReachable}
                hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                accessibilityRole="button"
                accessibilityLabel={label}
                accessibilityState={{ disabled: !isReachable, selected: isActive }}
                style={({ pressed }) => [
                  styles.pill,
                  {
                    backgroundColor: pillBg,
                    opacity: pressed && isReachable ? 0.7 : 1,
                  },
                ]}
              >
                {isDone ? (
                  <Check size={14} color={'#fff'} strokeWidth={2.5} />
                ) : (
                  <Text style={[styles.number, { color: numberColor }]}>
                    {i + 1}
                  </Text>
                )}
              </Pressable>
              <Text style={[styles.label, { color: labelColor }]}>{label}</Text>
            </View>
            {i < STEPS.length - 1 ? (
              <View
                style={[
                  styles.connector,
                  {
                    backgroundColor:
                      step > i ? colors.landlordGreen : colors.surface2,
                  },
                ]}
              />
            ) : null}
          </React.Fragment>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pillCol: {
    alignItems: 'center',
    gap: 6,
  },
  pill: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  number: {
    fontSize: 13,
    fontWeight: '700',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
  connector: {
    flex: 1,
    height: 2,
    borderRadius: 2,
    marginHorizontal: 10,
    marginBottom: 22, // sit roughly at pill-vertical-center, above the label row
  },
});

export default Stepper;

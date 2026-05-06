/**
 * Phase 2 Plan 02-04a — Step 4: Condition + Furnished (FLOW-09).
 *
 * Required even for hotel/hostel per CONTEXT §Decisions Log #4 (rural/ethno properties
 * still need condition + furnished signal). No conditional branching by propertyType.
 *
 * Furnished is a TRI-STATE: true / false / null. null = unset; the validator counts
 * null as missing. `false` IS a valid choice (some listings are deliberately unfurnished).
 *
 * Per CONTEXT D-04 / B-02 reconciliation: when furnished === null both Yes and No
 * render as inactive (no displayable copy needed for the unset state).
 *
 * Chip + active-state styling pattern lifted from Step1DealAndPropertyType.tsx (uses
 * activeChipBackground / activeChipText theme tokens from src/theme/colors.ts).
 */

import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import type { TranslationKeys } from '../../locales';
import { commonStyles } from './styles';
import type { SectionProps, FormBag } from './types';

const CONDITIONS: Array<Exclude<FormBag['conditionAndAmenities']['condition'], ''>> = [
  'rough',
  'whitebox',
  'good',
  'euro',
];

interface FurnishedOption {
  key: 'yes' | 'no';
  value: boolean;
}

const FURNISHED_OPTIONS: ReadonlyArray<FurnishedOption> = [
  { key: 'yes', value: true },
  { key: 'no', value: false },
];

export function Step4ConditionAmenities({ values, onChange, errors }: SectionProps) {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();

  const setCA = (patch: Partial<FormBag['conditionAndAmenities']>) =>
    onChange('conditionAndAmenities', { ...values.conditionAndAmenities, ...patch });

  return (
    <View>
      <Text style={[commonStyles.sectionTitle, { color: colors.text }]}>
        {t('contextualListing.step4.title')}
      </Text>

      {/* Condition row (4 chips) */}
      <View style={commonStyles.section}>
        <Text style={[commonStyles.sectionLabel, { color: colors.text }]}>
          {t('contextualListing.step4.conditionLabel')}
        </Text>
        <View style={commonStyles.chipRow} testID="condition-chip-row">
          {CONDITIONS.map((c) => {
            const isActive = values.conditionAndAmenities.condition === c;
            return (
              <TouchableOpacity
                key={c}
                testID={`condition-chip-${c}`}
                style={[
                  commonStyles.chip,
                  {
                    backgroundColor: isActive
                      ? colors.activeChipBackground
                      : isDark
                      ? '#2C2C2E'
                      : '#F2F2F7',
                    borderColor: isDark ? '#3A3A3C' : '#E5E5EA',
                  },
                ]}
                onPress={() => setCA({ condition: c })}
              >
                <Text
                  style={[
                    commonStyles.chipText,
                    { color: isActive ? colors.activeChipText : colors.text },
                  ]}
                >
                  {t(`contextualListing.step4.condition.${c}` as TranslationKeys)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        {errors['conditionAndAmenities.condition'] ? (
          <Text
            testID="condition-error"
            style={[commonStyles.errorText, { color: colors.error }]}
          >
            {t(errors['conditionAndAmenities.condition'] as TranslationKeys)}
          </Text>
        ) : null}
      </View>

      {/* Furnished row (2 chips, tri-state — null renders both inactive) */}
      <View style={commonStyles.section}>
        <Text style={[commonStyles.sectionLabel, { color: colors.text }]}>
          {t('contextualListing.step4.furnishedLabel')}
        </Text>
        <View style={commonStyles.chipRow} testID="furnished-chip-row">
          {FURNISHED_OPTIONS.map((f) => {
            const isActive = values.conditionAndAmenities.furnished === f.value;
            return (
              <TouchableOpacity
                key={f.key}
                testID={`furnished-chip-${f.key}`}
                style={[
                  commonStyles.chip,
                  {
                    backgroundColor: isActive
                      ? colors.activeChipBackground
                      : isDark
                      ? '#2C2C2E'
                      : '#F2F2F7',
                    borderColor: isDark ? '#3A3A3C' : '#E5E5EA',
                  },
                ]}
                onPress={() => setCA({ furnished: f.value })}
              >
                <Text
                  style={[
                    commonStyles.chipText,
                    { color: isActive ? colors.activeChipText : colors.text },
                  ]}
                >
                  {t(`contextualListing.step4.furnished.${f.key}` as TranslationKeys)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        {errors['conditionAndAmenities.furnished'] ? (
          <Text
            testID="furnished-error"
            style={[commonStyles.errorText, { color: colors.error }]}
          >
            {t(errors['conditionAndAmenities.furnished'] as TranslationKeys)}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

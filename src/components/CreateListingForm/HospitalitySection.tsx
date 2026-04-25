/**
 * HospitalitySection — renders the MINIMUM field set per UI-SPEC locked decision.
 *
 * Phase 4 (FORM-02 / FORM-05): rooms + maxGuests + bathrooms numeric inputs +
 * amenities placeholder hint. Full 12-item amenities multi-select is deferred
 * to Phase 6 (HOSP-05) per UI-SPEC §"HospitalitySection — Locked Field Set"
 * row 185 + RESEARCH §"Open Question #1".
 *
 * Fields intentionally ABSENT (UI-SPEC row 198):
 *   - bedrooms (Residential concept; Hospitality uses `rooms`)
 *   - areaSqm (not required for Hospitality per FORM-04)
 *   - price / currency (orchestrator unmounts PriceSection when
 *     category === 'Hospitality' — wired in Plan 04-06)
 *
 * The `bathrooms` field is SHARED with Residential (both consume the same
 * FormBag field). Intentional per UI-SPEC row 219 — orchestrator holds a
 * single `bathrooms` string field; sections render it conditionally.
 *
 * Inherits keyboard-aware scroll behavior from the orchestrator level.
 * No Gated wraps — hospitality details are visible to every authenticated
 * lister.
 */

import React from 'react';
import { View, TextInput, Text } from 'react-native';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../theme/ThemeContext';
import type { TranslationKeys } from '../../locales';
import type { SectionProps } from './types';
import { commonStyles } from './styles';

export function HospitalitySection({ values, onChange, errors }: SectionProps) {
  const { t } = useLanguage();
  const { colors } = useTheme();

  return (
    <View style={commonStyles.section}>
      <Text
        style={[commonStyles.sectionTitle, { color: colors.text }]}
        accessibilityRole="header"
      >
        {t('hospitality.sectionTitle')}
      </Text>
      <View style={commonStyles.row}>
        <View style={commonStyles.thirdInput}>
          <TextInput
            style={[
              commonStyles.input,
              { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border },
            ]}
            placeholder={t('hospitality.rooms')}
            placeholderTextColor={colors.textSecondary}
            value={values.rooms}
            onChangeText={(v) => onChange('rooms', v)}
            keyboardType="numeric"
          />
          {errors.rooms && (
            <Text style={[commonStyles.hint, commonStyles.fieldError, { color: colors.error }]}>
              {t(errors.rooms as TranslationKeys)}
            </Text>
          )}
        </View>
        <View style={commonStyles.thirdInput}>
          <TextInput
            style={[
              commonStyles.input,
              { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border },
            ]}
            placeholder={t('hospitality.maxGuests')}
            placeholderTextColor={colors.textSecondary}
            value={values.maxGuests}
            onChangeText={(v) => onChange('maxGuests', v)}
            keyboardType="numeric"
          />
          {errors.maxGuests && (
            <Text style={[commonStyles.hint, commonStyles.fieldError, { color: colors.error }]}>
              {t(errors.maxGuests as TranslationKeys)}
            </Text>
          )}
        </View>
        <View style={commonStyles.thirdInput}>
          <TextInput
            style={[
              commonStyles.input,
              { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border },
            ]}
            placeholder={t('hospitality.bathrooms')}
            placeholderTextColor={colors.textSecondary}
            value={values.bathrooms}
            onChangeText={(v) => onChange('bathrooms', v)}
            keyboardType="numeric"
          />
          {errors.bathrooms && (
            <Text style={[commonStyles.hint, commonStyles.fieldError, { color: colors.error }]}>
              {t(errors.bathrooms as TranslationKeys)}
            </Text>
          )}
        </View>
      </View>
      <Text style={[commonStyles.hint, { color: colors.textSecondary }]}>
        {t('hospitality.amenitiesPhase6Placeholder')}
      </Text>
    </View>
  );
}

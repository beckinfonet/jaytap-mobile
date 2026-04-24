/**
 * ResidentialSection — renders bedrooms + bathrooms + areaSqm in one row.
 *
 * Phase 4 (FORM-05): carved from CreateListingScreen.tsx:732-763 verbatim
 * (the 3-input numeric row for Residential property details). State stays in
 * orchestrator (RESEARCH §Pattern 2); this component reads values.* and
 * routes writes through onChange. Plan 04-06 wires the orchestrator.
 *
 * Inherits keyboard-aware scroll behavior from the orchestrator level
 * (UI-SPEC §"Shared Sub-Component Visual Contract"). No Gated wraps —
 * residential property details are visible to every authenticated lister.
 */

import React from 'react';
import { View, TextInput, Text } from 'react-native';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../theme/ThemeContext';
import type { TranslationKeys } from '../../locales';
import type { SectionProps } from './types';
import { commonStyles } from './styles';

export function ResidentialSection({ values, onChange, errors }: SectionProps) {
  const { t } = useLanguage();
  const { colors } = useTheme();

  return (
    <View style={commonStyles.section}>
      <Text
        style={[commonStyles.sectionTitle, { color: colors.text }]}
        accessibilityRole="header"
      >
        {t('createListing.propertyDetails')}
      </Text>
      <View style={commonStyles.row}>
        <View style={commonStyles.thirdInput}>
          <TextInput
            style={[
              commonStyles.input,
              { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border },
            ]}
            placeholder={t('createListing.bedrooms')}
            placeholderTextColor={colors.textSecondary}
            value={values.bedrooms}
            onChangeText={(v) => onChange('bedrooms', v)}
            keyboardType="numeric"
          />
          {errors.bedrooms && (
            <Text style={[commonStyles.hint, { color: colors.error }]}>
              {t(errors.bedrooms as TranslationKeys)}
            </Text>
          )}
        </View>
        <View style={commonStyles.thirdInput}>
          <TextInput
            style={[
              commonStyles.input,
              { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border },
            ]}
            placeholder={t('createListing.bathrooms')}
            placeholderTextColor={colors.textSecondary}
            value={values.bathrooms}
            onChangeText={(v) => onChange('bathrooms', v)}
            keyboardType="numeric"
          />
          {errors.bathrooms && (
            <Text style={[commonStyles.hint, { color: colors.error }]}>
              {t(errors.bathrooms as TranslationKeys)}
            </Text>
          )}
        </View>
        <View style={commonStyles.thirdInput}>
          <TextInput
            style={[
              commonStyles.input,
              { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border },
            ]}
            placeholder={t('createListing.area')}
            placeholderTextColor={colors.textSecondary}
            value={values.areaSqm}
            onChangeText={(v) => onChange('areaSqm', v)}
            keyboardType="numeric"
          />
          {errors.areaSqm && (
            <Text style={[commonStyles.hint, { color: colors.error }]}>
              {t(errors.areaSqm as TranslationKeys)}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}

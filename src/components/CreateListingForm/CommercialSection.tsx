/**
 * CommercialSection — renders areaSqm only.
 *
 * Phase 4 (FORM-05): intentionally omits bedrooms/bathrooms per
 * REQUIREMENTS.md FORM-04 ("Commercial → shared fields minus bedrooms and
 * bathrooms"). Office / Retail / Warehouse / Industrial sub-type picker is
 * deferred to Phase 5 (FORM-04 validation owns the sub-type selector).
 *
 * Wrapped in commonStyles.row with a single halfInput cell to preserve
 * future-compat when Phase 5 lands the sub-type control beside area.
 * No Gated wraps — commercial details are visible to every authenticated
 * lister. Inherits keyboard-aware scroll from the orchestrator level.
 */

import React from 'react';
import { View, TextInput, Text } from 'react-native';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../theme/ThemeContext';
import type { TranslationKeys } from '../../locales';
import type { SectionProps } from './types';
import { commonStyles } from './styles';

export function CommercialSection({ values, onChange, errors }: SectionProps) {
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
        <View style={commonStyles.halfInput}>
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
            <Text style={[commonStyles.hint, commonStyles.fieldError, { color: colors.error }]}>
              {t(errors.areaSqm as TranslationKeys)}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}

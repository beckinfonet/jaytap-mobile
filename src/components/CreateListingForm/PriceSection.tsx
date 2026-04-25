/**
 * PriceSection — currency chip row + price input.
 *
 * Phase 4 (FORM-05): orchestrator handles conditional mount based on
 * category !== 'Hospitality' per UI-SPEC row 204. This component renders
 * unconditionally when mounted — no internal branching, no admin guard.
 *
 * Transcribed from CreateListingScreen.tsx:582-611 (currency chip row + price
 * input) with state-binding swap (currency → values.currency,
 * setCurrency → onChange('currency', v); price → values.price,
 * setPrice → onChange('price', v)).
 */

import React from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../theme/ThemeContext';
import type { TranslationKeys } from '../../locales';
import type { SectionProps } from './types';
import { commonStyles } from './styles';
import { CURRENCY_OPTIONS } from './validators';

export function PriceSection({ values, onChange, errors }: SectionProps) {
  const { t } = useLanguage();
  const { colors } = useTheme();

  return (
    <View style={commonStyles.section}>
      <Text
        style={[commonStyles.label, { color: colors.textSecondary, marginBottom: 8 }]}
        accessibilityRole="header"
      >
        {t('createListing.currency')}
      </Text>
      <View style={commonStyles.chipRow}>
        {CURRENCY_OPTIONS.map((option) => {
          const selected = values.currency === option.value;
          return (
            <TouchableOpacity
              key={option.value}
              style={[
                commonStyles.chip,
                {
                  backgroundColor: selected ? colors.accent : colors.inputBackground,
                  borderColor: selected ? colors.accent : colors.border,
                },
              ]}
              onPress={() => onChange('currency', option.value)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={option.label}
              hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
            >
              <Text
                style={[
                  commonStyles.chipText,
                  { color: selected ? '#FFF' : colors.text },
                ]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {errors.currency && (
        <Text style={[commonStyles.hint, commonStyles.fieldError, { color: colors.error }]}>
          {t(errors.currency as TranslationKeys)}
        </Text>
      )}

      <Text
        style={[
          commonStyles.label,
          { color: colors.textSecondary, marginBottom: 8, marginTop: 12 },
        ]}
      >
        {t('createListing.price')}
      </Text>
      <TextInput
        style={[
          commonStyles.input,
          {
            backgroundColor: colors.inputBackground,
            color: colors.text,
            borderColor: colors.border,
          },
        ]}
        placeholder={t('createListing.amount')}
        placeholderTextColor={colors.textSecondary}
        value={values.price}
        onChangeText={(v) => onChange('price', v)}
        keyboardType="numeric"
      />
      {errors.price && (
        <Text style={[commonStyles.hint, commonStyles.fieldError, { color: colors.error }]}>
          {t(errors.price as TranslationKeys)}
        </Text>
      )}

      <Text style={[commonStyles.hint, { color: colors.textSecondary }]}>
        {t('createListing.selectCurrencyHint')}
      </Text>
    </View>
  );
}

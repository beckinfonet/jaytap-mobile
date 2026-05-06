// Phase 2 Step 1 — Deal type + Property type chip rows (FLOW-02 + FLOW-03).
// Per Tradeoff §A: both rows visible simultaneously (less surprising; both required to advance).
// Chip pattern lifted from src/screens/HomeScreen.tsx:486-516.

import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import type { TranslationKeys } from '../../locales';
import type { SectionProps, FormBag } from './types';
import { commonStyles } from './styles';

const DEAL_TYPES: Array<Exclude<FormBag['dealType'], ''>> = ['sale', 'rent_long', 'rent_daily'];
const PROPERTY_TYPES: Array<Exclude<FormBag['propertyType'], ''>> = [
  'apartment',
  'house',
  'office',
  'commercial',
  'hotel',
  'hostel',
];

export function Step1DealAndPropertyType({ values, onChange, errors }: SectionProps) {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();

  return (
    <View>
      <Text style={[commonStyles.sectionTitle, { color: colors.text }]}>
        {t('contextualListing.step1.title')}
      </Text>

      <View style={commonStyles.section}>
        <Text style={[commonStyles.sectionLabel, { color: colors.text }]}>
          {t('contextualListing.step1.dealTypeLabel')}
        </Text>
        <View style={commonStyles.chipRow} testID="deal-type-chip-row">
          {DEAL_TYPES.map((dt) => {
            const isActive = values.dealType === dt;
            return (
              <TouchableOpacity
                key={dt}
                testID={`deal-type-chip-${dt}`}
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
                onPress={() => onChange('dealType', dt)}
              >
                <Text
                  style={[
                    commonStyles.chipText,
                    { color: isActive ? colors.activeChipText : colors.text },
                  ]}
                >
                  {t(`contextualListing.step1.dealType.${dt}` as TranslationKeys)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        {errors['dealType'] ? (
          <Text
            testID="deal-type-error"
            style={[commonStyles.errorText, { color: colors.error }]}
          >
            {t(errors['dealType'] as TranslationKeys)}
          </Text>
        ) : null}
      </View>

      <View style={commonStyles.section}>
        <Text style={[commonStyles.sectionLabel, { color: colors.text }]}>
          {t('contextualListing.step1.propertyTypeLabel')}
        </Text>
        <View style={commonStyles.chipRow} testID="property-type-chip-row">
          {PROPERTY_TYPES.map((pt) => {
            const isActive = values.propertyType === pt;
            return (
              <TouchableOpacity
                key={pt}
                testID={`property-type-chip-${pt}`}
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
                onPress={() => onChange('propertyType', pt)}
              >
                <Text
                  style={[
                    commonStyles.chipText,
                    { color: isActive ? colors.activeChipText : colors.text },
                  ]}
                >
                  {t(`contextualListing.step1.propertyType.${pt}` as TranslationKeys)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        {errors['propertyType'] ? (
          <Text
            testID="property-type-error"
            style={[commonStyles.errorText, { color: colors.error }]}
          >
            {t(errors['propertyType'] as TranslationKeys)}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

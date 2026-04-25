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
import { View, TextInput, Text, TouchableOpacity } from 'react-native';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../theme/ThemeContext';
import type { TranslationKeys } from '../../locales';
import type { SectionProps } from './types';
import { commonStyles } from './styles';
import {
  HOSPITALITY_AMENITIES,
  AMENITY_ICONS,
  type HospitalityAmenity,
} from '../../utils/hospitalityAmenities';

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
      {/* Phase 6 (HOSP-05 / D-18) — 12-amenity multi-select chip grid */}
      <Text
        style={[commonStyles.label, { color: colors.textSecondary, marginTop: 12, marginBottom: 8 }]}
        accessibilityRole="header"
      >
        {t('hospitality.amenities')}
      </Text>
      <View style={commonStyles.chipRow}>
        {HOSPITALITY_AMENITIES.map((token) => {
          const Icon = AMENITY_ICONS[token];
          const selected = values.amenities.includes(token);
          return (
            <TouchableOpacity
              key={token}
              style={[
                commonStyles.chip,
                {
                  backgroundColor: selected ? colors.accent : colors.inputBackground,
                  borderColor: selected ? colors.accent : colors.border,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                },
              ]}
              onPress={() => {
                const next: HospitalityAmenity[] = selected
                  ? values.amenities.filter((a) => a !== token)
                  : [...values.amenities, token];
                onChange('amenities', next);
              }}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={t(`amenity.${token}` as TranslationKeys)}
              hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
            >
              <Icon size={14} color={selected ? '#FFFFFF' : colors.text} />
              <Text
                style={[commonStyles.chipText, { color: selected ? '#FFFFFF' : colors.text }]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {t(`amenity.${token}` as TranslationKeys)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {errors.amenities && (
        <Text style={[commonStyles.hint, commonStyles.fieldError, { color: colors.error }]}>
          {t(errors.amenities as TranslationKeys)}
        </Text>
      )}
    </View>
  );
}

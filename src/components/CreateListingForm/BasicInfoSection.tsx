import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../theme/ThemeContext';
import type { TranslationKeys } from '../../locales';
import {
  RESIDENTIAL_TYPES,
  COMMERCIAL_TYPES,
  HOSPITALITY_TYPES,
} from '../../utils/propertyCategory';
import type { SectionProps } from './types';
import { commonStyles } from './styles';

/**
 * BasicInfoSection — first carved sub-component of CreateListingForm.
 *
 * Phase 4 (FORM-05): pure presentation component; state lives in the
 * orchestrator (CreateListingScreen.tsx) and is passed via SectionProps.
 * Renders, in order:
 *   1. Transaction type segmented control (rent/sale)
 *   2. Basic Info — title + description
 *   3. Location — address + district + city
 *   4. Property Type — three stacked chipRows (Residential / Commercial /
 *      Hospitality) with group-label accessibility headers
 *   5. Available Date picker
 *   6. Features — add/remove chips
 *
 * Does NOT render bedrooms / bathrooms / area / currency / price — those
 * live in ResidentialSection / CommercialSection / PriceSection (Plan 04-04).
 *
 * Inherits keyboard-aware scroll behavior from the orchestrator per UI-SPEC
 * §Shared Sub-Component Visual Contract — this file does NOT instantiate a
 * keyboard-avoiding container. No Gated wraps in this section.
 *
 * Analog: src/components/PasswordRequirements.tsx (plain function component
 * shape, useLanguage + useTheme, typed TranslationKeys label lists).
 */
export function BasicInfoSection({ values, onChange, errors: _errors }: SectionProps) {
  // errors prop reserved for Phase 5 — renamed to _errors to silence unused warning
  const { t, language } = useLanguage();
  const { colors, isDark } = useTheme();
  const [showDatePicker, setShowDatePicker] = useState(false);

  const dateLocale = language === 'ru' ? 'ru-RU' : 'en-US';

  const addFeature = () => {
    const trimmed = values.featureInput.trim();
    if (trimmed) {
      onChange('features', [...values.features, trimmed]);
      onChange('featureInput', '');
    }
  };

  const removeFeature = (index: number) => {
    onChange(
      'features',
      values.features.filter((_, i) => i !== index),
    );
  };

  return (
    <View>
      {/* Transaction Type */}
      <View style={commonStyles.section}>
        <Text
          style={[commonStyles.sectionTitle, { color: colors.text }]}
          accessibilityRole="header"
        >
          {t('createListing.transactionType')}
        </Text>
        <View
          style={[
            commonStyles.segmentedControl,
            { backgroundColor: isDark ? '#2C2C2E' : '#E5E5EA' },
          ]}
        >
          <TouchableOpacity
            style={[
              commonStyles.segmentButton,
              values.type === 'rent' && {
                backgroundColor: isDark ? '#000000' : '#FFFFFF',
                shadowColor: '#000',
                shadowOpacity: 0.1,
                shadowRadius: 2,
                elevation: 2,
              },
            ]}
            onPress={() => onChange('type', 'rent')}
            accessibilityRole="button"
            accessibilityState={{ selected: values.type === 'rent' }}
            accessibilityLabel={t('createListing.rent')}
            hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
          >
            <Text
              style={[
                commonStyles.segmentText,
                {
                  color:
                    values.type === 'rent'
                      ? isDark
                        ? '#FFF'
                        : '#000'
                      : isDark
                      ? '#8E8E93'
                      : '#666',
                },
              ]}
            >
              {`🏠 ${t('createListing.rent')}`}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              commonStyles.segmentButton,
              values.type === 'sale' && {
                backgroundColor: isDark ? '#000000' : '#FFFFFF',
                shadowColor: '#000',
                shadowOpacity: 0.1,
                shadowRadius: 2,
                elevation: 2,
              },
            ]}
            onPress={() => onChange('type', 'sale')}
            accessibilityRole="button"
            accessibilityState={{ selected: values.type === 'sale' }}
            accessibilityLabel={t('createListing.sell')}
            hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
          >
            <Text
              style={[
                commonStyles.segmentText,
                {
                  color:
                    values.type === 'sale'
                      ? isDark
                        ? '#FFF'
                        : '#000'
                      : isDark
                      ? '#8E8E93'
                      : '#666',
                },
              ]}
            >
              {`💰 ${t('createListing.sell')}`}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Basic Info */}
      <View style={commonStyles.section}>
        <Text
          style={[commonStyles.sectionTitle, { color: colors.text }]}
          accessibilityRole="header"
        >
          {t('createListing.basicInfo')}
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
          placeholder={t('createListing.title')}
          placeholderTextColor={colors.textSecondary}
          value={values.title}
          onChangeText={(v) => onChange('title', v)}
        />
        <TextInput
          style={[
            commonStyles.textArea,
            {
              backgroundColor: colors.inputBackground,
              color: colors.text,
              borderColor: colors.border,
            },
          ]}
          placeholder={t('createListing.description')}
          placeholderTextColor={colors.textSecondary}
          value={values.description}
          onChangeText={(v) => onChange('description', v)}
          multiline
          numberOfLines={4}
        />
      </View>

      {/* Location */}
      <View style={commonStyles.section}>
        <Text
          style={[commonStyles.sectionTitle, { color: colors.text }]}
          accessibilityRole="header"
        >
          {t('createListing.location')}
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
          placeholder={t('createListing.streetAddress')}
          placeholderTextColor={colors.textSecondary}
          value={values.address}
          onChangeText={(v) => onChange('address', v)}
        />
        <TextInput
          style={[
            commonStyles.input,
            {
              backgroundColor: colors.inputBackground,
              color: colors.text,
              borderColor: colors.border,
            },
          ]}
          placeholder={t('createListing.district')}
          placeholderTextColor={colors.textSecondary}
          value={values.district}
          onChangeText={(v) => onChange('district', v)}
        />
        <TextInput
          style={[
            commonStyles.input,
            {
              backgroundColor: colors.inputBackground,
              color: colors.text,
              borderColor: colors.border,
            },
          ]}
          placeholder={t('createListing.city')}
          placeholderTextColor={colors.textSecondary}
          value={values.city}
          onChangeText={(v) => onChange('city', v)}
        />
      </View>

      {/* Property Type — three stacked chipRows */}
      <View style={commonStyles.section}>
        <Text
          style={[commonStyles.label, { color: colors.textSecondary }]}
        >
          {t('createListing.propertyType')}
        </Text>

        {/* Residential group */}
        <Text
          style={[
            commonStyles.label,
            { color: colors.textSecondary, marginBottom: 8 },
          ]}
          accessibilityRole="header"
        >
          {t('category.residential')}
        </Text>
        <View style={commonStyles.chipRow}>
          {RESIDENTIAL_TYPES.map((value) => {
            const labelKey = `propertyType.${value.toLowerCase()}` as TranslationKeys;
            const selected = values.propertyType === value;
            return (
              <TouchableOpacity
                key={value}
                style={[
                  commonStyles.chip,
                  {
                    backgroundColor: selected
                      ? colors.accent
                      : colors.inputBackground,
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => onChange('propertyType', value)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={t(labelKey)}
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
                  {t(labelKey)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Commercial group */}
        <Text
          style={[
            commonStyles.label,
            { color: colors.textSecondary, marginTop: 12, marginBottom: 8 },
          ]}
          accessibilityRole="header"
        >
          {t('category.commercial')}
        </Text>
        <View style={commonStyles.chipRow}>
          {COMMERCIAL_TYPES.map((value) => {
            const labelKey = `propertyType.${value.toLowerCase()}` as TranslationKeys;
            const selected = values.propertyType === value;
            return (
              <TouchableOpacity
                key={value}
                style={[
                  commonStyles.chip,
                  {
                    backgroundColor: selected
                      ? colors.accent
                      : colors.inputBackground,
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => onChange('propertyType', value)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={t(labelKey)}
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
                  {t(labelKey)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Hospitality group */}
        <Text
          style={[
            commonStyles.label,
            { color: colors.textSecondary, marginTop: 12, marginBottom: 8 },
          ]}
          accessibilityRole="header"
        >
          {t('category.hospitality')}
        </Text>
        <View style={commonStyles.chipRow}>
          {HOSPITALITY_TYPES.map((value) => {
            const labelKey = `propertyType.${value.toLowerCase()}` as TranslationKeys;
            const selected = values.propertyType === value;
            return (
              <TouchableOpacity
                key={value}
                style={[
                  commonStyles.chip,
                  {
                    backgroundColor: selected
                      ? colors.accent
                      : colors.inputBackground,
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => onChange('propertyType', value)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={t(labelKey)}
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
                  {t(labelKey)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Available Date */}
        <Text
          style={[
            commonStyles.label,
            { color: colors.textSecondary, marginTop: 12 },
          ]}
        >
          {t('createListing.availableFrom')}
        </Text>
        <TouchableOpacity
          style={[
            commonStyles.datePickerButton,
            {
              backgroundColor: colors.inputBackground,
              borderColor: colors.border,
            },
          ]}
          onPress={() => setShowDatePicker(true)}
          accessibilityRole="button"
          accessibilityLabel={t('createListing.selectDate')}
        >
          <Text
            style={[
              commonStyles.datePickerButtonText,
              {
                color: values.availableDate
                  ? colors.text
                  : colors.textSecondary,
              },
            ]}
          >
            {values.availableDate
              ? new Date(values.availableDate + 'T12:00:00').toLocaleDateString(
                  dateLocale,
                  { day: 'numeric', month: 'short', year: 'numeric' },
                )
              : t('createListing.selectDate')}
          </Text>
          <Text
            style={[
              commonStyles.datePickerChevron,
              { color: colors.textSecondary },
            ]}
          >
            📅
          </Text>
        </TouchableOpacity>
        {showDatePicker && (
          <DateTimePicker
            value={
              values.availableDate
                ? new Date(values.availableDate + 'T12:00:00')
                : new Date()
            }
            mode="date"
            locale={dateLocale}
            display={Platform.OS === 'ios' ? 'spinner' : undefined}
            themeVariant={
              Platform.OS === 'ios' ? (isDark ? 'dark' : 'light') : undefined
            }
            textColor={
              Platform.OS === 'ios'
                ? isDark
                  ? '#FFFFFF'
                  : '#000000'
                : undefined
            }
            onChange={(_, d) => {
              if (Platform.OS === 'android') setShowDatePicker(false);
              if (d) onChange('availableDate', d.toISOString().slice(0, 10));
            }}
          />
        )}
        {showDatePicker && Platform.OS === 'ios' && (
          <TouchableOpacity
            style={[
              commonStyles.datePickerDoneButton,
              { backgroundColor: colors.primary },
            ]}
            onPress={() => setShowDatePicker(false)}
            accessibilityRole="button"
            accessibilityLabel={t('common.done')}
          >
            <Text
              style={[
                commonStyles.datePickerDoneButtonText,
                { color: isDark ? '#121212' : '#FFFFFF' },
              ]}
            >
              {t('common.done')}
            </Text>
          </TouchableOpacity>
        )}
        <Text
          style={[commonStyles.hint, { color: colors.textSecondary }]}
        >
          {t('createListing.availableHintDetail')}
        </Text>
      </View>

      {/* Features */}
      <View style={commonStyles.section}>
        <Text
          style={[commonStyles.sectionTitle, { color: colors.text }]}
          accessibilityRole="header"
        >
          {t('createListing.features')}
        </Text>
        <View style={commonStyles.row}>
          <TextInput
            style={[
              commonStyles.input,
              {
                flex: 1,
                backgroundColor: colors.inputBackground,
                color: colors.text,
                borderColor: colors.border,
              },
            ]}
            placeholder={t('createListing.addFeature')}
            placeholderTextColor={colors.textSecondary}
            value={values.featureInput}
            onChangeText={(v) => onChange('featureInput', v)}
            onSubmitEditing={addFeature}
          />
          <TouchableOpacity
            style={[commonStyles.addButton, { backgroundColor: colors.accent }]}
            onPress={addFeature}
            accessibilityRole="button"
            accessibilityLabel={t('createListing.addFeature')}
          >
            <Text style={[commonStyles.addButtonText, { color: '#FFF' }]}>+</Text>
          </TouchableOpacity>
        </View>
        <View style={commonStyles.featuresContainer}>
          {values.features.map((feature, index) => (
            <View
              key={`${feature}-${index}`}
              style={[
                commonStyles.featureTag,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Text
                style={[commonStyles.featureText, { color: colors.text }]}
              >
                {feature}
              </Text>
              <TouchableOpacity
                onPress={() => removeFeature(index)}
                accessibilityRole="button"
                accessibilityLabel={`Remove ${feature}`}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text
                  style={[
                    commonStyles.removeFeature,
                    { color: colors.textSecondary },
                  ]}
                >
                  ×
                </Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

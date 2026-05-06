/**
 * Phase 2 Plan 02-04a — Step 5: Title + Description (FLOW-10).
 *
 * Both title and description are required strings (validator at validateStep(5) uses
 * .trim() — whitespace-only fails). maxLength caps protect the backend payload.
 *
 * SPEC §Step 5 explicit: "Photos, videos, and 3D tours are not part of this step" —
 * Phase 3 owns media. Step 5 stays pure title + description.
 *
 * Keyboard avoidance is owned by KeyboardProvider mounted at App.tsx root (CONTEXT
 * §<code_context> + RESEARCH §Reusable Assets). No new keyboard work in this component.
 */

import React from 'react';
import { View, Text, TextInput } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import type { TranslationKeys } from '../../locales';
import { commonStyles } from './styles';
import type { SectionProps } from './types';

export function Step5TitleDescription({ values, onChange, errors }: SectionProps) {
  const { colors } = useTheme();
  const { t } = useLanguage();

  return (
    <View>
      <Text style={[commonStyles.sectionTitle, { color: colors.text }]}>
        {t('contextualListing.step5.title')}
      </Text>

      {/* Title (single-line) */}
      <View style={commonStyles.section}>
        <Text style={[commonStyles.sectionLabel, { color: colors.text }]}>
          {t('contextualListing.step5.titleLabel')}
        </Text>
        <TextInput
          testID="content-title"
          value={values.content.title}
          onChangeText={(v) => onChange('content', { ...values.content, title: v })}
          placeholder={t('contextualListing.step5.titlePlaceholder')}
          placeholderTextColor={colors.textSecondary}
          style={[
            commonStyles.input,
            {
              color: colors.text,
              borderColor: colors.border,
              backgroundColor: colors.inputBackground,
            },
          ]}
          maxLength={120}
        />
        {errors['content.title'] ? (
          <Text
            testID="content-title-error"
            style={[commonStyles.errorText, { color: colors.error }]}
          >
            {t(errors['content.title'] as TranslationKeys)}
          </Text>
        ) : null}
      </View>

      {/* Description (multiline) */}
      <View style={commonStyles.section}>
        <Text style={[commonStyles.sectionLabel, { color: colors.text }]}>
          {t('contextualListing.step5.descriptionLabel')}
        </Text>
        <TextInput
          testID="content-description"
          value={values.content.description}
          onChangeText={(v) => onChange('content', { ...values.content, description: v })}
          placeholder={t('contextualListing.step5.descriptionPlaceholder')}
          placeholderTextColor={colors.textSecondary}
          multiline
          numberOfLines={6}
          style={[
            commonStyles.inputMultiline,
            {
              color: colors.text,
              borderColor: colors.border,
              backgroundColor: colors.inputBackground,
            },
          ]}
          maxLength={2000}
        />
        {errors['content.description'] ? (
          <Text
            testID="content-description-error"
            style={[commonStyles.errorText, { color: colors.error }]}
          >
            {t(errors['content.description'] as TranslationKeys)}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

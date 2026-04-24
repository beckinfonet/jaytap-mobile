/**
 * VerificationSection — 3 admin-only verification switches.
 *
 * Phase 4 (FORM-05): caller wraps in an editVerifications guard per UI-SPEC
 * row 40 + Phase 3 Site 4 (03-05-SUMMARY). NO internal admin-guard wrap in
 * this component — the gating surface lives in the orchestrator per the
 * Phase-3-established pattern.
 *
 * Transcribed from CreateListingScreen.tsx:1030-1040 (switches block) +
 * :106-128 (verificationSwitchRow helper). The three switches — verifyOwnership,
 * verifyOwnerId, verifyStateDocs — map to the three admin-verifiable property
 * attributes (ownership documents, owner identity, state-issued documents).
 */

import React from 'react';
import { View, Text, Switch, StyleSheet } from 'react-native';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../theme/ThemeContext';
import type { SectionProps } from './types';
import { commonStyles } from './styles';

// The three switches: key = FormBag boolean field; labelKey = i18n key for the row label.
const SWITCHES = [
  { key: 'verifyOwnership', labelKey: 'verification.ownershipDocuments' },
  { key: 'verifyOwnerId', labelKey: 'verification.ownerIdentity' },
  { key: 'verifyStateDocs', labelKey: 'verification.stateIssued' },
] as const;

export function VerificationSection({ values, onChange }: Pick<SectionProps, 'values' | 'onChange'>) {
  const { t } = useLanguage();
  const { colors } = useTheme();

  return (
    <View style={commonStyles.section}>
      <Text
        style={[commonStyles.sectionTitle, { color: colors.text }]}
        accessibilityRole="header"
      >
        {t('verification.adminSectionTitle')}
      </Text>
      <Text style={[commonStyles.hint, { color: colors.textSecondary, marginBottom: 12 }]}>
        {t('verification.adminSectionHint')}
      </Text>
      <View
        style={[
          styles.card,
          { backgroundColor: colors.inputBackground, borderColor: colors.border },
        ]}
      >
        {SWITCHES.map(({ key, labelKey }) => (
          <View key={key} style={styles.switchRow}>
            <Text style={[styles.switchLabel, { color: colors.text }]}>{t(labelKey)}</Text>
            <Switch
              value={values[key]}
              onValueChange={(next) => onChange(key, next)}
              trackColor={{ false: colors.border, true: colors.accent }}
            />
          </View>
        ))}
      </View>
    </View>
  );
}

// Private sub-component styles — transcribed from CreateListingScreen.tsx:1034
// (card wrapper View) + :111-127 (verificationSwitchRow helper).
const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingVertical: 4,
  },
  switchLabel: {
    flex: 1,
    fontSize: 15,
    paddingRight: 12,
    fontWeight: '500',
  },
});

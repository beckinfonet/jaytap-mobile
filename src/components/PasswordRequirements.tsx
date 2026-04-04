import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Check, Circle } from 'lucide-react-native';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../theme/ThemeContext';
import type { TranslationKeys } from '../locales';
import {
  getPasswordRequirementChecks,
  type PasswordRequirementId,
} from '../utils/passwordPolicy';

const ROWS: { id: PasswordRequirementId; labelKey: TranslationKeys }[] = [
  { id: 'length', labelKey: 'auth.passwordReqLength' },
  { id: 'uppercase', labelKey: 'auth.passwordReqUppercase' },
  { id: 'number', labelKey: 'auth.passwordReqNumber' },
  { id: 'symbol', labelKey: 'auth.passwordReqSymbol' },
];

type Props = {
  password: string;
};

export function PasswordRequirements({ password }: Props) {
  const { t } = useLanguage();
  const { colors } = useTheme();

  const checks = useMemo(() => {
    const list = getPasswordRequirementChecks(password);
    return new Map(list.map((c) => [c.id, c.met]));
  }, [password]);

  return (
    <View style={styles.wrap} accessibilityLiveRegion="polite">
      <Text style={[styles.hint, { color: colors.textSecondary }]}>{t('auth.passwordRequirementsHint')}</Text>
      {ROWS.map(({ id, labelKey }) => {
        const met = checks.get(id) ?? false;
        return (
          <View key={id} style={styles.row} accessibilityRole="text">
            {met ? (
              <Check size={18} color={colors.success} strokeWidth={2.5} accessibilityLabel={t('auth.passwordReqMet')} />
            ) : (
              <Circle size={18} color={colors.textTertiary} strokeWidth={2} accessibilityLabel={t('auth.passwordReqNotMet')} />
            )}
            <Text
              style={[
                styles.label,
                { color: met ? colors.text : colors.textSecondary },
                met && styles.labelMet,
              ]}
            >
              {t(labelKey)}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: -4,
    marginBottom: 8,
    gap: 8,
  },
  hint: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  label: {
    fontSize: 14,
    flex: 1,
  },
  labelMet: {
    fontWeight: '600',
  },
});

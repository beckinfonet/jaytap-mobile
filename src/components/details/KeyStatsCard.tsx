/**
 * KeyStatsCard — bedrooms / bathrooms / area card.
 * Spec: docs/superpowers/specs/2026-05-26-property-details-redesign-design.md § 4.4
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import type { TranslationKeys } from '../../locales';

export interface KeyStatsCardProps {
  beds?: { value: number | string; labelKey: TranslationKeys };
  baths?: number | string;
  areaSqm?: number;
}

export const KeyStatsCard: React.FC<KeyStatsCardProps> = ({ beds, baths, areaSqm }) => {
  const { colors } = useTheme();
  const { t } = useLanguage();

  const Divider: React.FC = () => (
    <View
      style={{
        width: 1,
        backgroundColor: colors.border,
        marginVertical: 6,
        opacity: 0.5,
      }}
    />
  );

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      {beds ? (
        <View style={styles.stat} testID="stat-beds">
          <View style={styles.numberRow}>
            <Text style={[styles.number, { color: colors.text }]}>{String(beds.value)}</Text>
          </View>
          <Text
            style={[styles.label, { color: colors.textTertiary }]}
            numberOfLines={1}
          >
            {t(beds.labelKey)}
          </Text>
        </View>
      ) : null}
      {beds ? <Divider /> : null}

      <View style={styles.stat} testID="stat-baths">
        <View style={styles.numberRow}>
          <Text style={[styles.number, { color: colors.text }]}>
            {baths != null ? String(baths) : '-'}
          </Text>
        </View>
        <Text style={[styles.label, { color: colors.textTertiary }]} numberOfLines={1}>
          {t('property.specs.bathrooms' as TranslationKeys)}
        </Text>
      </View>

      <Divider />

      <View style={styles.stat} testID="stat-area">
        <View style={styles.numberRow}>
          <Text style={[styles.number, { color: colors.text }]}>
            {areaSqm != null ? String(areaSqm) : '-'}
          </Text>
          <Text style={[styles.unit, { color: colors.textSecondary }]}>m²</Text>
        </View>
        <Text style={[styles.label, { color: colors.textTertiary }]} numberOfLines={1}>
          {t('property.specs.area' as TranslationKeys)}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 20,
    paddingHorizontal: 12,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  numberRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  number: {
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: -0.5,
    lineHeight: 38,
  },
  unit: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 3,
  },
  label: {
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    fontWeight: '600',
    marginTop: 8,
  },
});

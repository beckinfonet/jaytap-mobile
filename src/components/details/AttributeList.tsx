/**
 * AttributeList — single-column rows of property attributes. Pure-data shape
 * (`AttributeRow`) + derivation (`derivePropertyAttributes`) live alongside
 * the rendering component so consumers can use either piece.
 *
 * Spec: docs/superpowers/specs/2026-05-26-property-details-redesign-design.md § 4.2
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  PaintBucket,
  Sofa,
  CalendarRange,
  Banknote,
  CalendarClock,
  Handshake,
  type LucideIcon,
} from 'lucide-react-native';
import type { Property } from '../../types/Property';
import type { TranslationKeys } from '../../locales';
import { useTheme } from '../../theme/ThemeContext';

type TFn = (key: TranslationKeys, params?: Record<string, string>) => string;

export type ConditionColorToken = 'success' | 'warning' | 'orange' | 'error';

export type AttributeRow =
  | { kind: 'condition'; icon: LucideIcon; label: string; value: string; colorToken: ConditionColorToken }
  | { kind: 'boolean'; icon: LucideIcon; label: string; value: string; on: boolean }
  | { kind: 'plain'; icon: LucideIcon; label: string; value: string };

const CONDITION_COLOR: Record<'rough' | 'whitebox' | 'good' | 'euro', ConditionColorToken> = {
  rough: 'error',
  whitebox: 'orange',
  good: 'warning',
  euro: 'success',
};

export function derivePropertyAttributes(property: Property, t: TFn): AttributeRow[] {
  const rows: AttributeRow[] = [];
  const ca = property.conditionAndAmenities;
  const terms = property.terms;

  if (ca?.condition != null) {
    rows.push({
      kind: 'condition',
      icon: PaintBucket,
      label: t('property.metaCondition' as TranslationKeys),
      value: t(`condition.${ca.condition}` as TranslationKeys),
      colorToken: CONDITION_COLOR[ca.condition],
    });
  }

  if (ca?.furnished != null) {
    rows.push({
      kind: 'boolean',
      icon: Sofa,
      label: ca.furnished
        ? t('property.metaFurnishedYes' as TranslationKeys)
        : t('property.metaFurnishedNo' as TranslationKeys),
      value: ca.furnished
        ? t('common.yes' as TranslationKeys)
        : t('common.no' as TranslationKeys),
      on: ca.furnished,
    });
  }

  if (terms?.negotiable != null) {
    rows.push({
      kind: 'boolean',
      icon: Handshake,
      label: t('property.metaNegotiable' as TranslationKeys),
      value: terms.negotiable
        ? t('common.yes' as TranslationKeys)
        : t('common.no' as TranslationKeys),
      on: terms.negotiable,
    });
  }

  if (terms?.minTerm != null) {
    rows.push({
      kind: 'plain',
      icon: CalendarRange,
      label: t('property.metaMinTerm' as TranslationKeys),
      value: t(`minTerm.${terms.minTerm}` as TranslationKeys),
    });
  }

  if (terms?.deposit != null) {
    rows.push({
      kind: 'plain',
      icon: Banknote,
      label: t('property.metaDeposit' as TranslationKeys),
      value: `${terms.deposit.amount} ${terms.deposit.currency}`,
    });
  }

  if (terms?.prepaymentMonths != null) {
    rows.push({
      kind: 'plain',
      icon: CalendarClock,
      label: t('property.metaPrepayment' as TranslationKeys),
      value:
        terms.prepaymentMonths === 0
          ? t('prepayment.none' as TranslationKeys)
          : String(terms.prepaymentMonths),
    });
  }

  return rows;
}

export interface AttributeListProps {
  rows: AttributeRow[];
}

export const AttributeList: React.FC<AttributeListProps> = ({ rows }) => {
  const { colors } = useTheme();
  if (rows.length === 0) return null;

  const conditionColor = (token: ConditionColorToken): string => {
    switch (token) {
      case 'success':
        return colors.success;
      case 'warning':
        return colors.warning;
      case 'orange':
        return '#F0A500';
      case 'error':
        return colors.error;
    }
  };

  return (
    <View>
      {rows.map((row, idx) => {
        const isLast = idx === rows.length - 1;
        const Icon = row.icon;
        return (
          <View
            key={`${row.label}-${idx}`}
            testID="attribute-row"
            style={[
              styles.row,
              { borderBottomColor: colors.border },
              !isLast && { borderBottomWidth: StyleSheet.hairlineWidth },
              isLast && { borderBottomWidth: 0 },
            ]}
          >
            <View style={styles.left}>
              <Icon size={18} color={colors.textSecondary} strokeWidth={1.7} />
              <Text style={[styles.label, { color: colors.textSecondary }]} numberOfLines={1}>
                {row.label}
              </Text>
            </View>
            <View style={styles.right}>
              {row.kind === 'condition' ? (
                <View
                  style={[
                    styles.dot,
                    { backgroundColor: conditionColor(row.colorToken) },
                  ]}
                />
              ) : null}
              {row.kind === 'boolean' ? (
                <View
                  style={[
                    styles.badge,
                    { backgroundColor: row.on ? colors.success : colors.textTertiary },
                  ]}
                >
                  <Text style={styles.badgeGlyph}>{row.on ? '✓' : '×'}</Text>
                </View>
              ) : null}
              <Text style={[styles.value, { color: colors.text }]} numberOfLines={1}>
                {row.value}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexShrink: 1,
    minWidth: 0,
  },
  label: {
    fontSize: 14,
    flexShrink: 1,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexShrink: 0,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  badge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeGlyph: {
    color: '#FFFFFF',
    fontSize: 11,
    lineHeight: 13,
    fontWeight: '700',
  },
  value: {
    fontSize: 15,
    fontWeight: '700',
  },
});

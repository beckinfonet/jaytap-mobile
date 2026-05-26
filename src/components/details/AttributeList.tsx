/**
 * AttributeList — single-column rows of property attributes. Pure-data shape
 * (`AttributeRow`) + derivation (`derivePropertyAttributes`) live alongside
 * the rendering component so consumers can use either piece.
 *
 * Spec: docs/superpowers/specs/2026-05-26-property-details-redesign-design.md § 4.2
 */

import React from 'react';
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

type TFn = (key: TranslationKeys, params?: Record<string, string>) => string;

export type ConditionColorToken = 'success' | 'warning' | 'orange' | 'error';

export type AttributeRow =
  | { kind: 'condition'; icon: LucideIcon; label: string; value: string; colorToken: ConditionColorToken }
  | { kind: 'boolean'; icon: LucideIcon; label: string; value: string; on: boolean }
  | { kind: 'plain'; icon: LucideIcon; label: string; value: string };

const CONDITION_COLOR: Record<string, ConditionColorToken> = {
  euro: 'success',
  good: 'warning',
  cosmetic: 'orange',
  needsRepair: 'error',
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
      colorToken: CONDITION_COLOR[ca.condition] ?? 'warning',
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

// AttributeList component lands in Task 5.
export interface AttributeListProps {
  rows: AttributeRow[];
}

export const AttributeList: React.FC<AttributeListProps> = () => null;

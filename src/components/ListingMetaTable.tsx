import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import type { Property } from '../types/Property';

function availabilityValueFromRaw(
  raw: unknown,
  tNow: string,
  locale: string
): string | null {
  if (raw == null || raw === '') return null;
  const date =
    typeof raw === 'string'
      ? new Date(raw)
      : raw instanceof Date
        ? raw
        : null;
  if (!date || isNaN(date.getTime())) return null;
  const now = new Date();
  const oneMonthMs = 30 * 24 * 60 * 60 * 1000;
  const isSoon = date.getTime() - now.getTime() > oneMonthMs;
  const formattedDate = date.toLocaleDateString(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  return isSoon ? formattedDate : tNow;
}

export interface ListingMetaTableProps {
  listingId?: string | null;
  availableDate?: unknown;
  /** Tighter padding and type sizes for listing cards */
  compact?: boolean;
  /** Green dot before availability value (property details) */
  showAvailabilityDot?: boolean;
  /**
   * Phase 2 D-20: optional full-property prop. When provided, the table also
   * surfaces rooms/bathroom/area (basics.*), condition/furnished
   * (conditionAndAmenities.*), and minTerm/deposit/prepaymentMonths/negotiable
   * (terms.*) below the existing ID + availability row. Backward-compatible:
   * existing PropertyCard call sites (listingId + availableDate only) continue
   * to render exactly as before. PropertyDetailsScreen (Plan 02-06) will pass
   * the full property to surface the meta rows.
   */
  property?: Property;
}

export const ListingMetaTable: React.FC<ListingMetaTableProps> = ({
  listingId,
  availableDate,
  compact = false,
  showAvailabilityDot = false,
  property,
}) => {
  const { colors } = useTheme();
  const { t, language } = useLanguage();
  const dateLocale = language === 'ru' ? 'ru-RU' : 'en-US';

  const availValue = availabilityValueFromRaw(availableDate, t('property.now'), dateLocale);
  const hasId = Boolean(listingId?.trim());
  const hasAvail = availValue != null;

  // Phase 2 D-20 nested-shape reads (Phase 1 D-04..D-15). All optional —
  // gating booleans below decide whether each row renders. No flat-shape
  // fallbacks: M2 listings without nested data simply skip extra rows.
  const rooms = property?.basics?.rooms;
  const bathroom = property?.basics?.bathroom;
  const areaSqm = property?.basics?.areaSqm;
  const condition = property?.conditionAndAmenities?.condition;
  const furnished = property?.conditionAndAmenities?.furnished;
  const negotiable = property?.terms?.negotiable;
  const deposit = property?.terms?.deposit;
  const prepaymentMonths = property?.terms?.prepaymentMonths;
  const minTerm = property?.terms?.minTerm;

  const hasExtras =
    rooms != null ||
    bathroom != null ||
    areaSqm != null ||
    condition != null ||
    furnished != null ||
    negotiable != null ||
    deposit != null ||
    prepaymentMonths != null ||
    minTerm != null;

  if (!hasId && !hasAvail && !hasExtras) return null;

  const rowPadV = compact ? 8 : 10;
  const rowPadH = compact ? 12 : 12;
  const labelSize = compact ? 11 : 12;
  const valueSize = compact ? 12 : 14;
  const both = hasId && hasAvail;

  return (
    <View
      style={[
        styles.table,
        {
          borderColor: colors.border,
          backgroundColor: colors.chipBackground,
          paddingVertical: rowPadV,
          paddingHorizontal: rowPadH,
        },
        compact ? styles.tableCompact : styles.tableDefault,
      ]}
    >
      <View style={styles.row}>
        {hasId && (
          <View style={[styles.metaPair, both && styles.metaPairId]}>
            <Text
              style={[styles.cellLabel, { color: colors.textSecondary, fontSize: labelSize }]}
              numberOfLines={1}
            >
              {t('property.metaId')}
            </Text>
            <Text
              style={[
                styles.cellValue,
                styles.cellValueLeft,
                { color: colors.text, fontSize: valueSize },
              ]}
              numberOfLines={1}
            >
              {listingId}
            </Text>
          </View>
        )}
        {both ? (
          <View style={[styles.vDivider, { backgroundColor: colors.border }]} />
        ) : null}
        {hasAvail && (
          <View style={[styles.metaPair, both && styles.metaPairAvail]}>
            <Text
              style={[styles.cellLabel, { color: colors.textSecondary, fontSize: labelSize }]}
              numberOfLines={1}
            >
              {t('property.metaAvailable')}
            </Text>
            <View style={styles.valueWithDot}>
              {showAvailabilityDot ? <View style={styles.availDot} /> : null}
              <Text
                style={[
                  styles.cellValue,
                  styles.cellValueLeft,
                  { color: colors.text, fontSize: valueSize },
                ]}
                numberOfLines={1}
              >
                {availValue}
              </Text>
            </View>
          </View>
        )}
      </View>
      {/* Phase 2 D-20: extra meta rows from nested basics + conditionAndAmenities + terms.
          Renders only when `property` prop supplied (PropertyDetailsScreen path);
          PropertyCard's compact use-case skips these rows because property is undefined. */}
      {hasExtras && (
        <View style={styles.extrasGrid}>
          {rooms != null && (
            <Text style={[styles.extraText, { color: colors.text, fontSize: valueSize }]} numberOfLines={1}>
              {t('property.beds')}: {rooms}
            </Text>
          )}
          {bathroom != null && (
            <Text style={[styles.extraText, { color: colors.text, fontSize: valueSize }]} numberOfLines={1}>
              {t('property.baths')}: {bathroom === 'private'
                ? t('property.bathroomPrivate' as any)
                : bathroom === 'shared'
                  ? t('property.bathroomShared' as any)
                  : t('property.bathroomNone' as any)}
            </Text>
          )}
          {condition != null && (
            <Text style={[styles.extraText, { color: colors.text, fontSize: valueSize }]} numberOfLines={1}>
              {t('property.metaCondition' as any)}: {condition}
            </Text>
          )}
          {furnished != null && (
            <Text style={[styles.extraText, { color: colors.text, fontSize: valueSize }]} numberOfLines={1}>
              {furnished ? t('property.metaFurnishedYes' as any) : t('property.metaFurnishedNo' as any)}
            </Text>
          )}
          {minTerm != null && (
            <Text style={[styles.extraText, { color: colors.text, fontSize: valueSize }]} numberOfLines={1}>
              {t('property.metaMinTerm' as any)}: {minTerm}
            </Text>
          )}
          {deposit != null && (
            <Text style={[styles.extraText, { color: colors.text, fontSize: valueSize }]} numberOfLines={1}>
              {t('property.metaDeposit' as any)}: {deposit.amount} {deposit.currency}
            </Text>
          )}
          {prepaymentMonths != null && prepaymentMonths > 0 && (
            <Text style={[styles.extraText, { color: colors.text, fontSize: valueSize }]} numberOfLines={1}>
              {t('property.metaPrepayment' as any)}: {prepaymentMonths}
            </Text>
          )}
          {negotiable === true && (
            <Text style={[styles.extraText, { color: colors.text, fontSize: valueSize }]} numberOfLines={1}>
              {t('property.metaNegotiable' as any)}
            </Text>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  table: {
    borderWidth: 1,
    borderRadius: 12,
    width: '100%',
  },
  tableCompact: {
    marginBottom: 6,
  },
  tableDefault: {
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  metaPair: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 6,
    flex: 1,
    minWidth: 0,
  },
  metaPairId: {
    flex: 0,
    flexShrink: 0,
  },
  metaPairAvail: {
    flex: 1,
    justifyContent: 'center',
  },
  vDivider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
    minHeight: 18,
    flexShrink: 0,
  },
  cellLabel: {
    fontWeight: '600',
    flexShrink: 0,
  },
  cellValue: {
    fontWeight: '600',
    flexShrink: 1,
    textAlign: 'right',
    minWidth: 0,
  },
  cellValueLeft: {
    textAlign: 'left',
  },
  valueWithDot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 6,
    flexShrink: 1,
    minWidth: 0,
    maxWidth: '100%',
  },
  availDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#22C55E',
    flexShrink: 0,
  },
  extrasGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 8,
  },
  extraText: {
    fontWeight: '500',
  },
});

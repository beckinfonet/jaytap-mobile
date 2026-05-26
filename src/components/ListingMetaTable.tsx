import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { availabilityValueFromRaw } from '../utils/availability';

export interface ListingMetaTableProps {
  listingId?: string | null;
  availableDate?: unknown;
  /** Tighter padding and type sizes for listing cards */
  compact?: boolean;
  /** Green dot before availability value (property details) */
  showAvailabilityDot?: boolean;
}

export const ListingMetaTable: React.FC<ListingMetaTableProps> = ({
  listingId,
  availableDate,
  compact = false,
  showAvailabilityDot = false,
}) => {
  const { colors } = useTheme();
  const { t, language } = useLanguage();
  const dateLocale = language === 'ru' ? 'ru-RU' : 'en-US';

  const availValue = availabilityValueFromRaw(availableDate, t('property.now'), dateLocale);
  const hasId = Boolean(listingId?.trim());
  const hasAvail = availValue != null;

  if (!hasId && !hasAvail) return null;

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
});

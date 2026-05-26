/**
 * HeaderInfoCard — FOR SALE / ID pills, title, address, red divider, map slot.
 * Spec: docs/superpowers/specs/2026-05-26-property-details-redesign-design.md § 4.1
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MapPin } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import type { TranslationKeys } from '../../locales';

export interface HeaderInfoCardProps {
  dealType: 'sale' | 'rent' | string;
  listingId?: string | null;
  title: string;
  formattedAddress: { line1: string; line2?: string };
  statusPill?: React.ReactNode;
  mapPreview?: React.ReactNode;
}

export const HeaderInfoCard: React.FC<HeaderInfoCardProps> = ({
  dealType,
  listingId,
  title,
  formattedAddress,
  statusPill,
  mapPreview,
}) => {
  const { colors } = useTheme();
  const { t } = useLanguage();

  const dealKey: TranslationKeys =
    dealType === 'sale'
      ? ('property.forSale' as TranslationKeys)
      : ('property.forRent' as TranslationKeys);

  const hasId = !!listingId && listingId.trim().length > 0;

  return (
    <View style={styles.container}>
      <View style={styles.pillRow}>
        <View style={styles.dealPill}>
          <View style={[styles.accentBar, { backgroundColor: colors.accent }]} />
          <Text style={[styles.dealLabel, { color: colors.accent }]} numberOfLines={1}>
            {t(dealKey)}
          </Text>
        </View>
        {hasId ? (
          <View
            testID="id-pill"
            style={[styles.idPill, { borderColor: colors.accent }]}
          >
            <Text style={[styles.idLabel, { color: colors.accent }]} numberOfLines={1}>
              #{listingId}
            </Text>
          </View>
        ) : null}
      </View>

      {statusPill ? <View style={styles.statusSlot}>{statusPill}</View> : null}

      <Text style={[styles.title, { color: colors.text }]} numberOfLines={3}>
        {title}
      </Text>

      <View style={styles.addressRow}>
        <MapPin size={16} color={colors.accent} />
        <Text
          style={[styles.addressStreet, { color: colors.text }]}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {formattedAddress.line1}
        </Text>
        {formattedAddress.line2 ? (
          <Text style={[styles.addressCity, { color: colors.textSecondary }]} numberOfLines={1}>
            {` · ${formattedAddress.line2}`}
          </Text>
        ) : null}
      </View>

      <View style={[styles.divider, { backgroundColor: colors.accent }]} />

      {mapPreview ? <View style={styles.mapSlot}>{mapPreview}</View> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  pillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  dealPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  accentBar: {
    width: 3,
    height: 14,
    borderRadius: 2,
  },
  dealLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  idPill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  idLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  statusSlot: {
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    lineHeight: 28,
    marginBottom: 10,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addressStreet: {
    fontSize: 13,
    fontWeight: '600',
    flexShrink: 1,
    minWidth: 0,
  },
  addressCity: {
    fontSize: 13,
    flexShrink: 0,
  },
  divider: {
    height: 2,
    width: '38%',
    borderRadius: 1,
    marginTop: 14,
  },
  mapSlot: {
    marginTop: 14,
  },
});

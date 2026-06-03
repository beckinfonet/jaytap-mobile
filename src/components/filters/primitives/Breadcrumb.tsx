/**
 * Breadcrumb — chevron-separated selection trail for the Guided sheet footer.
 *
 * Phase 14 Plan 14-01 (FILT-01). Collapse rule (handoff filters-shared.jsx:164):
 *   types.length === 0 → no type segment
 *   types.length === 1 → bare label
 *   types.length >  1 → "{firstType} +{N-1}"
 *
 * Empty render (all three props null/empty) → minHeight 24 spacer row, no
 * chevrons, no labels.
 *
 * joinTypes is imported per file_modified contract even though the collapse
 * rule is currently inlined — keeps the module link live for forward-fit when
 * the collapse rule moves into joinTypes (M7+).
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { useTheme } from '../../../theme/ThemeContext';
import { useLanguage } from '../../../context/LanguageContext';
import type { TranslationKeys } from '../../../locales';
import type { PropertyCategory } from '../../../utils/propertyCategory';
// joinTypes is intentionally imported (forward-fit anchor per files_modified
// contract); not consumed in v1 because the +N collapse rule is inlined below.
import { joinTypes } from './joinTypes';
void joinTypes;

export interface BreadcrumbProps {
  deal: 'Rent' | 'Buy' | null;
  category: PropertyCategory | null;
  types: string[];
}

// 260603-emq — the breadcrumb previously rendered deal/category/types as raw
// English even in RU mode (this is where users saw "Residential"/"Commercial"
// untranslated). Map each domain enum to its existing i18n key and translate
// at render time. Keys already exist in both locales with EN/RU parity.
const CATEGORY_KEY: Record<PropertyCategory, TranslationKeys> = {
  Residential: 'category.residential',
  Commercial: 'category.commercial',
  Hospitality: 'category.hospitality',
};

const Breadcrumb: React.FC<BreadcrumbProps> = ({ deal, category, types }) => {
  const { colors } = useTheme();
  const { t } = useLanguage();

  const trType = (ty: string): string =>
    t(`propertyType.${ty.toLowerCase()}` as TranslationKeys);

  const dealLabel: string | null = deal
    ? t(deal === 'Rent' ? 'filters.deal.rent' : 'filters.deal.buy')
    : null;
  const categoryLabel: string | null = category ? t(CATEGORY_KEY[category]) : null;
  const typeSegment: string | null =
    types.length === 0
      ? null
      : types.length === 1
        ? trType(types[0])
        : `${trType(types[0])} +${types.length - 1}`;

  const labels: string[] = [dealLabel, categoryLabel, typeSegment].filter(
    (l): l is string => typeof l === 'string' && l.length > 0,
  );

  return (
    <View style={styles.row}>
      {labels.map((label, i) => (
        <React.Fragment key={`${label}-${i}`}>
          {i > 0 ? (
            <ChevronRight size={14} color={colors.textTertiary} strokeWidth={1.75} />
          ) : null}
          <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
        </React.Fragment>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 7,
    minHeight: 24,
  },
  label: {
    fontSize: 13.5,
    fontWeight: '600',
  },
});

export default Breadcrumb;

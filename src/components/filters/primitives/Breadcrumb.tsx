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

const Breadcrumb: React.FC<BreadcrumbProps> = ({ deal, category, types }) => {
  const { colors } = useTheme();

  const typeSegment: string | null =
    types.length === 0
      ? null
      : types.length === 1
        ? types[0]
        : `${types[0]} +${types.length - 1}`;

  const labels: string[] = [deal, category, typeSegment].filter(
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

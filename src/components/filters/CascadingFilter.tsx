/**
 * CascadingFilter — FILT-02 inline panel under the HomeScreen search bar.
 *
 * Phase 14 Plan 14-02. Extracts the inline JSX block that today lives at
 * HomeScreen.tsx:521-642 into a controlled component. HomeScreen mounts this
 * via `filterStyle === 'cascading' && isFiltersExpanded`.
 *
 * Structure (top → bottom, per 14-UI-SPEC §"CascadingFilter anatomy"):
 *   1. <DealToggle> sliding-pill Rent/Buy
 *   2. Nested wrapper (left nesting rail absolute View) containing:
 *      - CATEGORY uppercase section header
 *      - Category tab strip with underline on active tab
 *      - TYPE · pick any header row
 *      - Multi-select Type chip row (chips per active category)
 *
 * Load-bearing semantics (per RESEARCH.md Pitfall 4 + PATTERNS Pitfall 4):
 *   - Tapping a different category tab calls setSelectedCategory(cat) AND
 *     setTypes([]). Forgetting the setTypes([]) leaks Apartment into Commercial.
 *
 * Live count: liveCount prop is accepted for forward-fit but NOT rendered here in
 * v1. The result-line at HomeScreen.tsx:644-646 remains the always-visible count
 * surface; CascadingFilter does not own its own result line per UI-SPEC §"Layout
 * §CascadingFilter anatomy" final note.
 *
 * Hex-literal note: only `'#fff'` (text-on-accent) is used. Matches the
 * project-wide ShowButton + RejectionBanner CTA contract.
 */
import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
} from 'react-native';
import { Check } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import {
  RESIDENTIAL_TYPES,
  COMMERCIAL_TYPES,
  HOSPITALITY_TYPES,
  type PropertyCategory,
  type PropertyType,
} from '../../utils/propertyCategory';
import type { TranslationKeys } from '../../locales';
import DealToggle from './primitives/DealToggle';
import TypeIcon from './primitives/TypeIcon';

export interface CascadingFilterProps {
  transactionType: 'rent' | 'sale';
  setTransactionType: (v: 'rent' | 'sale') => void;
  selectedCategory: PropertyCategory;
  setSelectedCategory: (c: PropertyCategory) => void;
  types: string[];
  setTypes: React.Dispatch<React.SetStateAction<string[]>>;
  /**
   * Live result count (filteredProperties.length from HomeScreen). Accepted as a
   * forward-fit prop; not currently rendered inside CascadingFilter in v1 — the
   * result-line at HomeScreen.tsx:644-646 still owns the visible count.
   */
  liveCount: number;
}

const CATEGORIES: ReadonlyArray<PropertyCategory> = [
  'Residential',
  'Commercial',
  'Hospitality',
];

const CATEGORY_KEY_MAP: Record<PropertyCategory, TranslationKeys> = {
  Residential: 'category.residential',
  Commercial: 'category.commercial',
  Hospitality: 'category.hospitality',
};

const CascadingFilter: React.FC<CascadingFilterProps> = ({
  transactionType,
  setTransactionType,
  selectedCategory,
  setSelectedCategory,
  types,
  setTypes,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  liveCount,
}) => {
  const { colors } = useTheme();
  const { t } = useLanguage();

  const chipTypes: readonly PropertyType[] = useMemo(() => {
    if (selectedCategory === 'Commercial') return COMMERCIAL_TYPES;
    if (selectedCategory === 'Hospitality') return HOSPITALITY_TYPES;
    return RESIDENTIAL_TYPES;
  }, [selectedCategory]);

  return (
    <View style={styles.container}>
      {/* Section 1 — Rent/Buy DealToggle */}
      <DealToggle
        value={transactionType === 'rent' ? 'Rent' : 'Buy'}
        onChange={(v) => setTransactionType(v === 'Rent' ? 'rent' : 'sale')}
      />

      {/* Section 2 — nested wrapper with left rail + Category tabs + Type chips */}
      <View style={styles.nestedWrapper}>
        {/* Left nesting rail (absolute) */}
        <View
          pointerEvents="none"
          style={[styles.nestingRail, { backgroundColor: colors.surface2 }]}
        />

        {/* CATEGORY section header */}
        <Text
          style={[styles.sectionHeader, { color: colors.textTertiary }]}
          accessibilityRole="header"
        >
          {t('filters.cascading.categoryHeader' as TranslationKeys)}
        </Text>

        {/* Category tab strip */}
        <View
          style={[
            styles.categoryTabStrip,
            { borderBottomColor: colors.border },
          ]}
        >
          {CATEGORIES.map((cat) => {
            const selected = selectedCategory === cat;
            return (
              <Pressable
                key={cat}
                onPress={() => {
                  // LOAD-BEARING: setSelectedCategory MUST fire before setTypes([])
                  // per RESEARCH.md Pitfall 4. Re-picking category clears the
                  // multi-select; otherwise Apartment leaks into Commercial.
                  setSelectedCategory(cat);
                  setTypes([]);
                }}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={t(CATEGORY_KEY_MAP[cat])}
                hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                style={styles.categoryTab}
              >
                <Text
                  style={[
                    styles.categoryTabLabel,
                    {
                      color: selected ? colors.text : colors.textTertiary,
                      fontWeight: selected ? '700' : '600',
                    },
                  ]}
                  numberOfLines={1}
                >
                  {t(CATEGORY_KEY_MAP[cat])}
                </Text>
                {selected && (
                  <View
                    pointerEvents="none"
                    style={[
                      styles.categoryTabUnderline,
                      { backgroundColor: colors.filterAccent },
                    ]}
                  />
                )}
              </Pressable>
            );
          })}
        </View>

        {/* TYPE · pick any header row */}
        <View style={styles.typeHeaderRow}>
          <Text
            style={[styles.sectionHeader, { color: colors.text }]}
            accessibilityRole="header"
          >
            {t('filters.cascading.typeHeader' as TranslationKeys)}
          </Text>
          <Text style={[styles.typeHint, { color: colors.textTertiary }]}>
            {`· ${t('filters.cascading.typeHint' as TranslationKeys)}`}
          </Text>
        </View>

        {/* Multi-select Type chip row */}
        <View style={styles.chipRow}>
          {chipTypes.map((typeName) => {
            const isActive = types.includes(typeName);
            return (
              <Pressable
                key={typeName}
                onPress={() => {
                  setTypes((prev) =>
                    prev.includes(typeName)
                      ? prev.filter((x) => x !== typeName)
                      : [...prev, typeName],
                  );
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
                hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                style={[
                  styles.chip,
                  {
                    backgroundColor: isActive ? colors.filterAccent : 'transparent',
                    borderColor: isActive ? 'transparent' : colors.hair2,
                  },
                ]}
              >
                {isActive ? (
                  <Check size={16} color={'#fff'} strokeWidth={2.25} />
                ) : (
                  <TypeIcon
                    type={typeName}
                    size={16}
                    color={colors.textSecondary}
                  />
                )}
                <Text
                  style={[
                    styles.chipLabel,
                    { color: isActive ? '#fff' : colors.textSecondary },
                  ]}
                  numberOfLines={1}
                >
                  {/* 260603-emq: translate the property-type chip label (was raw English in RU). */}
                  {t(`propertyType.${typeName.toLowerCase()}` as TranslationKeys)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 18,
    paddingTop: 6,
    paddingBottom: 18,
    flexDirection: 'column',
    gap: 18,
  },
  nestedWrapper: {
    position: 'relative',
    paddingLeft: 18,
  },
  nestingRail: {
    position: 'absolute',
    left: 4,
    top: 6,
    bottom: 6,
    width: 2,
    borderRadius: 2,
  },
  sectionHeader: {
    fontSize: 11.5,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  categoryTabStrip: {
    flexDirection: 'row',
    gap: 22,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: 18,
  },
  categoryTab: {
    paddingBottom: 12,
    position: 'relative',
  },
  categoryTabLabel: {
    fontSize: 15.5,
  },
  categoryTabUnderline: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: -1,
    height: 2.5,
    borderRadius: 2,
  },
  typeHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  typeHint: {
    fontSize: 11,
    fontWeight: '600',
    opacity: 0.8,
    // Pull up to align with the uppercase section header which has marginBottom:10.
    marginBottom: 10,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 9,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingLeft: 12,
    paddingRight: 15,
    borderRadius: 999,
    borderWidth: 1.5,
  },
  chipLabel: {
    fontSize: 14.5,
    fontWeight: '600',
  },
});

export default CascadingFilter;

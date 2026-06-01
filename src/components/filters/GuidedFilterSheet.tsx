/**
 * GuidedFilterSheet — FILT-01 hand-rolled Modal + Animated.View slide-up bottom
 * sheet wizard (1-2-3 stepper: Deal → Category → Type).
 *
 * Phase 14 Plan 14-03. Sibling variant to CascadingFilter; HomeScreen mounts
 * this behind `filterStyle === 'guided'`.
 *
 * Load-bearing patterns (per 14-RESEARCH.md + 14-CONTEXT.md D-01):
 *   1. `localOpen` shadow state — Modal stays mounted during slide-out so the
 *      animation can play. Without it, setting open=false instantly unmounts
 *      the Modal and the slide-out never plays. NON-NEGOTIABLE.
 *   2. `Animated.parallel` — scrim opacity + sheet translateY animate together.
 *   3. Modal animation is hand-driven (animationType none) — slide is performed
 *      by Animated, not by RN's built-in slide which would conflict.
 *   4. Re-picking Category clears `types` (Pitfall 4 regression guard) — same
 *      contract as CascadingFilter.
 *
 * Wave-0 Modal-probe outcome PASSED (see 14-MODAL-PROBE-OUTCOME.txt) → test
 * renders the full Modal directly via react-test-renderer (no inner-component
 * fallback needed).
 *
 * Hex-literal note: only `'#fff'` (text-on-accent) is used for active deal-card
 * icon foreground. Matches project-wide ShowButton + CheckSquare contract.
 */
import React, { useEffect, useRef, useState, useMemo } from 'react';
// Single-line react-native import (load-bearing per Plan 14-03 acceptance grep
// `from 'react-native'.*Platform`): Platform must appear on the same line as the
// react-native source to satisfy the source assertion.
import { View, Text, Modal, StyleSheet, Pressable, ScrollView, Animated, Easing, Dimensions, Platform } from 'react-native';
import {
  X,
  Building,
  Briefcase,
  Hotel as HotelIcon,
  ChevronRight,
  type LucideIcon,
} from 'lucide-react-native';
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
import Stepper from './primitives/Stepper';
import ShowButton from './primitives/ShowButton';
import Breadcrumb from './primitives/Breadcrumb';
import CheckSquare from './primitives/CheckSquare';
import TypeIcon from './primitives/TypeIcon';
import MultiHint from './primitives/MultiHint';

const SCREEN_H = Dimensions.get('window').height;
const SHEET_HEIGHT = SCREEN_H * 0.82;
const SLIDE_IN_MS = 300;
const SLIDE_OUT_MS = 250;

export interface GuidedFilterSheetProps {
  open: boolean;
  onClose: () => void;
  transactionType: 'rent' | 'sale';
  setTransactionType: (v: 'rent' | 'sale') => void;
  selectedCategory: PropertyCategory;
  setSelectedCategory: (c: PropertyCategory) => void;
  types: string[];
  setTypes: React.Dispatch<React.SetStateAction<string[]>>;
  liveCount: number;
}

const CATEGORY_KEY_MAP: Record<PropertyCategory, TranslationKeys> = {
  Residential: 'category.residential',
  Commercial: 'category.commercial',
  Hospitality: 'category.hospitality',
};

const CATEGORY_BLURB_MAP: Record<PropertyCategory, TranslationKeys> = {
  Residential: 'filters.category.residentialBlurb',
  Commercial: 'filters.category.commercialBlurb',
  Hospitality: 'filters.category.hospitalityBlurb',
};

const CATEGORY_ICON_MAP: Record<PropertyCategory, LucideIcon> = {
  Residential: Building,
  Commercial: Briefcase,
  Hospitality: HotelIcon,
};

const CATEGORIES: ReadonlyArray<PropertyCategory> = [
  'Residential',
  'Commercial',
  'Hospitality',
];

const GuidedFilterSheet: React.FC<GuidedFilterSheetProps> = ({
  open,
  onClose,
  transactionType,
  setTransactionType,
  selectedCategory,
  setSelectedCategory,
  types,
  setTypes,
  liveCount,
}) => {
  const { colors } = useTheme();
  const { t } = useLanguage();

  // LOAD-BEARING: localOpen shadow keeps Modal mounted during slide-out animation.
  // Without it, setting open=false instantly unmounts and the slide-out never plays.
  const [localOpen, setLocalOpen] = useState<boolean>(open);
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const translateY = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const scrimOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (open) {
      setLocalOpen(true);
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: SLIDE_IN_MS,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(scrimOpacity, {
          toValue: 1,
          duration: SLIDE_IN_MS,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    } else if (localOpen) {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: SHEET_HEIGHT,
          duration: SLIDE_OUT_MS,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(scrimOpacity, {
          toValue: 0,
          duration: SLIDE_OUT_MS,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) setLocalOpen(false);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Per-category chip list for TypeGrid (step 2).
  const chipTypes: readonly PropertyType[] = useMemo(() => {
    if (selectedCategory === 'Commercial') return COMMERCIAL_TYPES;
    if (selectedCategory === 'Hospitality') return HOSPITALITY_TYPES;
    return RESIDENTIAL_TYPES;
  }, [selectedCategory]);

  // Stepper reached fn — step 0 always reached; 1 reached iff transactionType set
  // (always true since prop is 'rent'|'sale'); 2 reached iff selectedCategory set
  // (always true since prop defaults to 'Residential' on HomeScreen).
  const reached = (i: number): boolean => {
    if (i === 0) return true;
    if (i === 1) return !!transactionType;
    if (i === 2) return !!selectedCategory;
    return false;
  };

  // Inline DealCard renderer.
  const renderDealCard = (
    value: 'rent' | 'sale',
    labelKey: TranslationKeys,
    blurbKey: TranslationKeys,
    Icon: LucideIcon,
  ) => {
    const active = transactionType === value;
    return (
      <Pressable
        key={value}
        accessibilityRole="button"
        accessibilityState={{ selected: active }}
        hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
        onPress={() => {
          // Quick 260601-dqh — no auto-advance. Continue button (footer) drives setStep.
          setTransactionType(value);
        }}
        style={[
          styles.bigCard,
          {
            backgroundColor: active ? colors.filterAccentSoft : colors.surface,
            borderWidth: active ? 1.5 : 0,
            borderColor: active ? colors.filterAccentLine : 'transparent',
          },
        ]}
      >
        <View
          style={[
            styles.iconChip,
            {
              backgroundColor: active ? colors.filterAccent : colors.surface2,
            },
          ]}
        >
          <Icon
            size={22}
            color={active ? '#fff' : colors.iconChipFg}
            strokeWidth={1.75}
          />
        </View>
        <View style={styles.cardTextCol}>
          <Text style={[styles.cardLabel, { color: colors.text }]}>
            {t(labelKey)}
          </Text>
          <Text style={[styles.cardBlurb, { color: colors.textSecondary }]}>
            {t(blurbKey)}
          </Text>
        </View>
      </Pressable>
    );
  };

  // Inline CategoryCard renderer.
  const renderCategoryCard = (cat: PropertyCategory) => {
    const active = selectedCategory === cat;
    const Icon = CATEGORY_ICON_MAP[cat];
    return (
      <Pressable
        key={cat}
        accessibilityRole="button"
        accessibilityState={{ selected: active }}
        hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
        onPress={() => {
          // LOAD-BEARING (RESEARCH.md Pitfall 4): setSelectedCategory MUST fire
          // before setTypes([]). Re-picking category clears multi-select;
          // otherwise Apartment leaks into Commercial.
          // Quick 260601-dqh — no auto-advance. Continue button drives setStep.
          setSelectedCategory(cat);
          setTypes([]);
        }}
        style={[
          styles.bigCard,
          {
            backgroundColor: active ? colors.filterAccentSoft : colors.surface,
            borderWidth: active ? 1.5 : 0,
            borderColor: active ? colors.filterAccentLine : 'transparent',
          },
        ]}
      >
        <View
          style={[
            styles.iconChip,
            {
              backgroundColor: active ? colors.filterAccent : colors.surface2,
            },
          ]}
        >
          <Icon
            size={22}
            color={active ? '#fff' : colors.iconChipFg}
            strokeWidth={1.75}
          />
        </View>
        <View style={styles.cardTextCol}>
          <Text style={[styles.cardLabel, { color: colors.text }]}>
            {t(CATEGORY_KEY_MAP[cat])}
          </Text>
          <Text style={[styles.cardBlurb, { color: colors.textSecondary }]}>
            {t(CATEGORY_BLURB_MAP[cat])}
          </Text>
        </View>
      </Pressable>
    );
  };

  // Inline TypeCard renderer (step 2 grid).
  const renderTypeCard = (typeName: PropertyType) => {
    const active = types.includes(typeName);
    return (
      <Pressable
        key={typeName}
        accessibilityRole="button"
        accessibilityState={{ selected: active }}
        hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
        onPress={() => {
          setTypes((prev) =>
            prev.includes(typeName)
              ? prev.filter((x) => x !== typeName)
              : [...prev, typeName],
          );
        }}
        style={[
          styles.typeCard,
          {
            backgroundColor: active ? colors.filterAccentSoft : colors.surface,
            borderWidth: active ? 1.5 : 0,
            borderColor: active ? colors.filterAccentLine : 'transparent',
          },
        ]}
      >
        <View style={styles.typeCardTopRow}>
          <CheckSquare checked={active} />
          <TypeIcon
            type={typeName}
            size={19}
            color={active ? colors.filterAccent : colors.iconChipFg}
          />
        </View>
        <Text style={[styles.typeCardLabel, { color: colors.text }]}>
          {typeName}
        </Text>
      </Pressable>
    );
  };

  return (
    <Modal
      visible={localOpen}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* Scrim — Animated.View wraps a Pressable so the scrim can fade independently. */}
      <Animated.View
        style={[StyleSheet.absoluteFill, { opacity: scrimOpacity }]}
        pointerEvents="box-none"
      >
        <Pressable
          testID="GuidedScrim"
          accessibilityRole="button"
          accessibilityLabel={t('filters.close')}
          style={[StyleSheet.absoluteFill, { backgroundColor: colors.scrim }]}
          onPress={onClose}
        />
      </Animated.View>

      {/* Sheet — animated slide-up via translateY. */}
      <Animated.View
        style={[
          styles.sheet,
          {
            backgroundColor: colors.background,
            transform: [{ translateY }],
          },
        ]}
      >
        {/* Drag handle (visual only, non-interactive) */}
        <View
          accessible={false}
          style={[styles.dragHandle, { backgroundColor: colors.surface2 }]}
        />

        {/* Header row: title + X close. */}
        <View
          style={[
            styles.headerRow,
            { borderBottomColor: colors.border },
          ]}
        >
          <Text
            style={[
              styles.headerTitle,
              {
                color: colors.text,
                fontFamily: Platform.select({
                  ios: 'Georgia',
                  android: 'serif',
                }),
              },
            ]}
          >
            {t('filters.title')}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('filters.close')}
            hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
            onPress={onClose}
            style={styles.closeButton}
          >
            <X size={22} color={colors.text} strokeWidth={1.75} />
          </Pressable>
        </View>

        {/* Stepper (1-2-3 pills). */}
        <View style={styles.stepperContainer}>
          <Stepper
            step={step}
            onStepPress={(i) => setStep(i as 0 | 1 | 2)}
            reached={reached}
          />
        </View>

        {/* Scrollable body — conditional content per step. */}
        <ScrollView
          contentContainerStyle={styles.bodyContent}
          showsVerticalScrollIndicator={false}
        >
          {step === 0 && (
            <View style={styles.cardStack}>
              {renderDealCard(
                'rent',
                'filters.deal.rent',
                'filters.deal.rentBlurb',
                Building,
              )}
              {renderDealCard(
                'sale',
                'filters.deal.buy',
                'filters.deal.buyBlurb',
                Briefcase,
              )}
            </View>
          )}
          {step === 1 && (
            <View style={styles.cardStack}>
              <Text
                style={[styles.prompt, { color: colors.textSecondary }]}
              >
                {t('filters.category.prompt')}
              </Text>
              {CATEGORIES.map((cat) => renderCategoryCard(cat))}
            </View>
          )}
          {step === 2 && (
            <View style={styles.cardStack}>
              <MultiHint />
              <Text
                style={[styles.prompt, { color: colors.textSecondary }]}
              >
                {t('filters.type.prompt')}
              </Text>
              <View style={styles.typeGrid}>
                {chipTypes.map((typeName) => renderTypeCard(typeName))}
              </View>
            </View>
          )}
        </ScrollView>

        {/* Footer (fixed): Breadcrumb + dual-action (Continue + secondary Show)
           on steps 0/1, single primary Show on step 2.
           Quick 260601-dqh — "Guide-first": Continue advances; Show stays a
           close call (D-04 live selections, never an apply). */}
        <View
          style={[
            styles.footer,
            { borderTopColor: colors.border },
          ]}
        >
          <View style={styles.breadcrumbWrap}>
            <Breadcrumb
              deal={transactionType === 'rent' ? 'Rent' : 'Buy'}
              category={selectedCategory}
              types={types}
            />
          </View>

          {step === 2 ? (
            <ShowButton count={liveCount} onPress={onClose} />
          ) : (
            <View style={{ gap: 12 }}>
              <Pressable
                accessibilityRole="button"
                onPress={() => setStep((s) => (s + 1) as 0 | 1 | 2)}
                hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                style={({ pressed }) => [
                  styles.continueBtn,
                  {
                    backgroundColor: colors.filterAccent,
                    shadowColor: colors.filterAccent,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <Text style={styles.continueLabel}>
                  {t(step === 0 ? 'filters.continue.addCategory' : 'filters.continue.addType')}
                </Text>
                <ChevronRight size={19} color="#fff" strokeWidth={2} />
              </Pressable>

              <ShowButton count={liveCount} onPress={onClose} variant="secondary" />
            </View>
          )}
        </View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: '82%',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    marginTop: 10,
    marginBottom: 8,
    alignSelf: 'center',
  },
  headerRow: {
    paddingHorizontal: 22,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '600',
  },
  closeButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperContainer: {
    paddingHorizontal: 22,
    paddingTop: 8,
    paddingBottom: 16,
  },
  bodyContent: {
    paddingHorizontal: 22,
    paddingBottom: 8,
  },
  cardStack: {
    gap: 12,
  },
  prompt: {
    fontSize: 13.5,
    marginBottom: 8,
  },
  bigCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 18,
  },
  iconChip: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTextCol: {
    flex: 1,
    flexDirection: 'column',
    gap: 2,
  },
  cardLabel: {
    fontSize: 18,
    fontWeight: '700',
  },
  cardBlurb: {
    fontSize: 13.5,
    fontWeight: '600',
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 4,
  },
  typeCard: {
    width: '47%',
    padding: 14,
    borderRadius: 14,
    flexDirection: 'column',
    gap: 10,
  },
  typeCardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  typeCardLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  footer: {
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 26,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  breadcrumbWrap: {
    marginBottom: 12,
  },
  // Quick 260601-dqh — Continue button on steps 0/1. Accent-tied low-spread
  // shadow matches ShowButton primary. `colors` is not in scope inside
  // StyleSheet.create, so `shadowColor` + `backgroundColor` are applied inline
  // in the JSX above.
  continueBtn: {
    height: 56,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    shadowOpacity: 0.28,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 14,
    elevation: 4,
  },
  continueLabel: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 17,
  },
});

export default GuidedFilterSheet;

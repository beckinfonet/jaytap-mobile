/**
 * Phase 2 Plan 02-03 — Step 3: Basic information (FLOW-07 + FLOW-08).
 *
 * Always-shown:
 *   - areaSqm  (TextInput, decimal-pad)
 *   - price    (TextInput, decimal-pad)
 *   - currency (3 chips: KGS / USD / EUR — D-03 canonical tokens; no $/сом legacy)
 *
 * Conditional sub-fields per FLOW-08 propertyType matrix:
 *   - apartment, house          → rooms (1/2/3/4+)
 *   - office, commercial        → rooms + bathroom (private/none/shared) + kitchen (private/none/shared)
 *   - hotel, hostel             → hotelRooms (1/2/3/4+) + hotelClass (economy/standard/comfort/premium)
 *
 * ROADMAP SC#3 reflow guard: when Step 1's propertyType changes the orchestrator's
 * onChange wrapper (index.tsx) clears prior basics sub-fields. Step3BasicInfo just
 * renders whatever FormBag is current — the clearing is upstream.
 */

import React from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import type { TranslationKeys } from '../../locales';
import { StepperInput } from '../StepperInput';
import { commonStyles } from './styles';
import type { SectionProps, FormBag } from './types';

const CURRENCIES: Array<Exclude<FormBag['basics']['currency'], ''>> = ['KGS', 'USD', 'EUR'];
const ROOMS: Array<NonNullable<FormBag['basics']['rooms']>> = ['1', '2', '3', '4+'];
const BATHROOMS: Array<NonNullable<FormBag['basics']['bathroom']>> = ['private', 'none', 'shared'];
const KITCHENS: Array<NonNullable<FormBag['basics']['kitchen']>> = ['private', 'none', 'shared'];
const HOTEL_CLASSES: Array<NonNullable<FormBag['basics']['hotelClass']>> = [
  'economy',
  'standard',
  'comfort',
  'premium',
];

// Map '4+' chip value to its 4plus i18n suffix; everything else passes through.
const roomsKeySuffix = (r: NonNullable<FormBag['basics']['rooms']>): string =>
  r === '4+' ? '4plus' : r;

export function Step3BasicInfo({ values, onChange, errors }: SectionProps) {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const pt = values.propertyType;

  const setBasics = (patch: Partial<FormBag['basics']>) =>
    onChange('basics', { ...values.basics, ...patch });

  const renderChipRow = <T extends string>(
    opts: readonly T[],
    current: T | undefined,
    onPick: (v: T) => void,
    testIDPrefix: string,
    labelFn: (v: T) => string,
  ) => (
    <View style={commonStyles.chipRow}>
      {opts.map((o) => {
        const isActive = current === o;
        return (
          <TouchableOpacity
            key={o}
            testID={`${testIDPrefix}-${o}`}
            style={[
              commonStyles.chip,
              {
                backgroundColor: isActive
                  ? colors.activeChipBackground
                  : isDark
                  ? '#2C2C2E'
                  : '#F2F2F7',
                borderColor: isDark ? '#3A3A3C' : '#E5E5EA',
              },
            ]}
            onPress={() => onPick(o)}
          >
            <Text
              style={[
                commonStyles.chipText,
                { color: isActive ? colors.activeChipText : colors.text },
              ]}
            >
              {labelFn(o)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  return (
    <View>
      <Text style={[commonStyles.sectionTitle, { color: colors.text }]}>
        {t('contextualListing.step3.title')}
      </Text>

      {/* Area (always) */}
      <View style={commonStyles.section}>
        <Text style={[commonStyles.sectionLabel, { color: colors.text }]}>
          {t('contextualListing.step3.areaLabel')}
        </Text>
        <TextInput
          testID="basics-areaSqm"
          value={values.basics.areaSqm}
          onChangeText={(v) => setBasics({ areaSqm: v.replace(/[^0-9.]/g, '') })}
          keyboardType="decimal-pad"
          placeholderTextColor={colors.textSecondary}
          style={[
            commonStyles.input,
            {
              color: colors.text,
              borderColor: colors.border,
              backgroundColor: colors.inputBackground,
            },
          ]}
        />
        {errors['basics.areaSqm'] ? (
          <Text style={[commonStyles.errorText, { color: colors.error }]}>
            {t(errors['basics.areaSqm'] as TranslationKeys)}
          </Text>
        ) : null}
      </View>

      {/* Price (always) */}
      <View style={commonStyles.section}>
        <Text style={[commonStyles.sectionLabel, { color: colors.text }]}>
          {t('contextualListing.step3.priceLabel')}
        </Text>
        <TextInput
          testID="basics-price"
          value={values.basics.price}
          onChangeText={(v) => setBasics({ price: v.replace(/[^0-9.]/g, '') })}
          keyboardType="decimal-pad"
          placeholderTextColor={colors.textSecondary}
          style={[
            commonStyles.input,
            {
              color: colors.text,
              borderColor: colors.border,
              backgroundColor: colors.inputBackground,
            },
          ]}
        />
        {errors['basics.price'] ? (
          <Text style={[commonStyles.errorText, { color: colors.error }]}>
            {t(errors['basics.price'] as TranslationKeys)}
          </Text>
        ) : null}
      </View>

      {/* Currency (always) — D-03 KGS/USD/EUR */}
      <View style={commonStyles.section}>
        <Text style={[commonStyles.sectionLabel, { color: colors.text }]}>
          {t('contextualListing.step3.currencyLabel')}
        </Text>
        {renderChipRow(
          CURRENCIES,
          values.basics.currency === '' ? undefined : values.basics.currency,
          (c) => setBasics({ currency: c }),
          'currency-chip',
          (c) => t(`contextualListing.step3.currency.${c}` as TranslationKeys),
        )}
        {errors['basics.currency'] ? (
          <Text style={[commonStyles.errorText, { color: colors.error }]}>
            {t(errors['basics.currency'] as TranslationKeys)}
          </Text>
        ) : null}
      </View>

      {/* Conditional: rooms — apartment / house / office / commercial */}
      {pt === 'apartment' || pt === 'house' || pt === 'office' || pt === 'commercial' ? (
        <View style={commonStyles.section}>
          <Text style={[commonStyles.sectionLabel, { color: colors.text }]}>
            {t('contextualListing.step3.roomsLabel')}
          </Text>
          {renderChipRow(
            ROOMS,
            values.basics.rooms,
            (r) => setBasics({ rooms: r }),
            'rooms-chip',
            (r) =>
              t(`contextualListing.step3.rooms.${roomsKeySuffix(r)}` as TranslationKeys),
          )}
          {errors['basics.rooms'] ? (
            <Text style={[commonStyles.errorText, { color: colors.error }]}>
              {t(errors['basics.rooms'] as TranslationKeys)}
            </Text>
          ) : null}
        </View>
      ) : null}

      {/* Conditional: bathroom + kitchen — office / commercial */}
      {pt === 'office' || pt === 'commercial' ? (
        <>
          <View style={commonStyles.section}>
            <Text style={[commonStyles.sectionLabel, { color: colors.text }]}>
              {t('contextualListing.step3.bathroomLabel')}
            </Text>
            {renderChipRow(
              BATHROOMS,
              values.basics.bathroom,
              (b) => setBasics({ bathroom: b }),
              'bathroom-chip',
              (b) => t(`contextualListing.step3.bathroom.${b}` as TranslationKeys),
            )}
            {errors['basics.bathroom'] ? (
              <Text style={[commonStyles.errorText, { color: colors.error }]}>
                {t(errors['basics.bathroom'] as TranslationKeys)}
              </Text>
            ) : null}
          </View>
          <View style={commonStyles.section}>
            <Text style={[commonStyles.sectionLabel, { color: colors.text }]}>
              {t('contextualListing.step3.kitchenLabel')}
            </Text>
            {renderChipRow(
              KITCHENS,
              values.basics.kitchen,
              (k) => setBasics({ kitchen: k }),
              'kitchen-chip',
              (k) => t(`contextualListing.step3.kitchen.${k}` as TranslationKeys),
            )}
            {errors['basics.kitchen'] ? (
              <Text style={[commonStyles.errorText, { color: colors.error }]}>
                {t(errors['basics.kitchen'] as TranslationKeys)}
              </Text>
            ) : null}
          </View>
        </>
      ) : null}

      {/* Conditional: hotelRooms + hotelClass — hotel / hostel */}
      {pt === 'hotel' || pt === 'hostel' ? (
        <>
          <View style={commonStyles.section}>
            <Text style={[commonStyles.sectionLabel, { color: colors.text }]}>
              {t('contextualListing.step3.hotelRoomsLabel')}
            </Text>
            {renderChipRow(
              ROOMS,
              values.basics.hotelRooms,
              (r) => setBasics({ hotelRooms: r }),
              'hotelRooms-chip',
              (r) =>
                t(`contextualListing.step3.rooms.${roomsKeySuffix(r)}` as TranslationKeys),
            )}
            {errors['basics.hotelRooms'] ? (
              <Text style={[commonStyles.errorText, { color: colors.error }]}>
                {t(errors['basics.hotelRooms'] as TranslationKeys)}
              </Text>
            ) : null}
          </View>
          <View style={commonStyles.section}>
            <Text style={[commonStyles.sectionLabel, { color: colors.text }]}>
              {t('contextualListing.step3.hotelClassLabel')}
            </Text>
            {renderChipRow(
              HOTEL_CLASSES,
              values.basics.hotelClass,
              (c) => setBasics({ hotelClass: c }),
              'hotelClass-chip',
              (c) => t(`contextualListing.step3.hotelClass.${c}` as TranslationKeys),
            )}
            {errors['basics.hotelClass'] ? (
              <Text style={[commonStyles.errorText, { color: colors.error }]}>
                {t(errors['basics.hotelClass'] as TranslationKeys)}
              </Text>
            ) : null}
          </View>
        </>
      ) : null}

      {/* M4 FORM-02 — bedrooms stepper: apartment / house only (D-05 + D-06). */}
      {pt === 'apartment' || pt === 'house' ? (
        <View style={commonStyles.section}>
          <StepperInput
            testID="basics-bedrooms"
            label={t('contextualListing.step3.bedroomsLabel')}
            value={values.basics.bedrooms}
            onChange={(v) => setBasics({ bedrooms: v })}
            min={0}
            max={10}
            step={1}
          />
          {errors['basics.bedrooms'] ? (
            <Text style={[commonStyles.errorText, { color: colors.error }]}>
              {t(errors['basics.bedrooms'] as TranslationKeys)}
            </Text>
          ) : null}
        </View>
      ) : null}

      {/* M4 FORM-02 — bathroomCount stepper: apartment / house / hotel / hostel / office / commercial (D-05 + D-06). */}
      {pt === 'apartment' ||
      pt === 'house' ||
      pt === 'hotel' ||
      pt === 'hostel' ||
      pt === 'office' ||
      pt === 'commercial' ? (
        <View style={commonStyles.section}>
          <StepperInput
            testID="basics-bathroomCount"
            label={t('contextualListing.step3.bathroomCountLabel')}
            value={values.basics.bathroomCount}
            onChange={(v) => setBasics({ bathroomCount: v })}
            min={0}
            max={10}
            step={0.5}
          />
          {errors['basics.bathroomCount'] ? (
            <Text style={[commonStyles.errorText, { color: colors.error }]}>
              {t(errors['basics.bathroomCount'] as TranslationKeys)}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

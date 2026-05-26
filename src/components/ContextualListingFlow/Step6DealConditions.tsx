/**
 * Phase 2 Plan 02-04b — Step 6: Deal conditions matrix gated by dealType (FLOW-11 + D-19).
 *
 * Matrix per RESEARCH §"Step 6 Matrix Cheatsheet" (lines 654-664) + CONTEXT D-19:
 *   sale       → negotiable required + deposit optional
 *   rent_long  → negotiable + deposit optional + prepaymentMonths (0/1/2/Custom int) + minTerm
 *   rent_daily → deposit only (D-19 thin step — predictable structure beats minor screen savings)
 *
 * Pitfall 6 mitigation (RESEARCH lines 731-736): tapping "Custom" prepayment chip OPENS
 * a number input below SEEDED with the current `prepaymentMonths` value. Does NOT clobber
 * the prior preset selection unless the user types a new number.
 *
 * Submit button label morph (CONTEXT specifics §"Step 6 Submit button") is owned by the
 * orchestrator (`index.tsx`), not this component. Step6 is a pure SectionProps consumer.
 *
 * Theme tokens: uses `colors.activeChipBackground` / `colors.activeChipText` for active
 * chips (matches Step1/Step3/Step4 precedent in this directory). Import paths are
 * project-canonical (`../../theme/ThemeContext`, `../../context/LanguageContext`).
 */

import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import type { TranslationKeys } from '../../locales';
import { commonStyles } from './styles';
import type { SectionProps, FormBag } from './types';

type DepositCur = NonNullable<FormBag['terms']['deposit']>['currency'];
type MinTerm = '1_month' | '3_months';

const PREPAY_PRESETS = [0, 1, 2] as const;
const MIN_TERMS: ReadonlyArray<MinTerm> = ['1_month', '3_months'];
const DEPOSIT_CURRENCIES: ReadonlyArray<DepositCur> = ['KGS', 'USD', 'EUR'];

function isPresetPrepay(n: number | undefined): n is 0 | 1 | 2 {
  return n !== undefined && (PREPAY_PRESETS as ReadonlyArray<number>).includes(n);
}

export function Step6DealConditions({ values, onChange, errors }: SectionProps) {
  const { colors, isDark } = useTheme();
  const { t, language } = useLanguage();
  const dt = values.dealType;
  const dateLocale = language === 'ru' ? 'ru-RU' : 'en-US';

  // Custom prepayment local UI state (Pitfall 6).
  // - customMode: is the Custom input open?
  // - customStr:  the string-value the input renders (seeded from current prepaymentMonths
  //               on first Custom tap; updated as the user types).
  const initialCustomMode =
    values.terms.prepaymentMonths !== undefined && !isPresetPrepay(values.terms.prepaymentMonths);
  const [customMode, setCustomMode] = useState<boolean>(initialCustomMode);
  const [customStr, setCustomStr] = useState<string>(
    values.terms.prepaymentMonths !== undefined ? String(values.terms.prepaymentMonths) : '',
  );

  // Quick-task 260526-foc — "Available from" date picker local UI state.
  // The picker is a NATIVE modal (iOS spinner / Android dialog). Format emitted = 'YYYY-MM-DD'.
  // availableDate is OPTIONAL on every dealType; empty/undefined renders as "available now"
  // downstream (ListingMetaTable). Pattern mirrors the historic CreateListingForm picker.
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);

  const setTerms = (patch: Partial<FormBag['terms']>) =>
    onChange('terms', { ...values.terms, ...patch });

  const handlePresetPrepay = (n: 0 | 1 | 2) => {
    setCustomMode(false);
    setCustomStr(String(n));
    setTerms({ prepaymentMonths: n });
  };

  const handleCustomTap = () => {
    // Pitfall 6 mitigation: seed the Custom input from the current value on tap.
    // Does NOT dispatch an onChange — we only flip local UI state; prepaymentMonths
    // is unchanged until the user actually types something.
    setCustomMode(true);
    if (values.terms.prepaymentMonths !== undefined) {
      setCustomStr(String(values.terms.prepaymentMonths));
    }
  };

  const handleCustomInput = (s: string) => {
    const cleaned = s.replace(/[^0-9]/g, '');
    setCustomStr(cleaned);
    if (cleaned === '') {
      setTerms({ prepaymentMonths: undefined });
    } else {
      setTerms({ prepaymentMonths: parseInt(cleaned, 10) });
    }
  };

  // Default deposit currency to Step 3's currency on mount IF a deposit object exists
  // without a currency. The W-01 sentinel guard at Step 3 ensures basics.currency is
  // already in {'KGS','USD','EUR'} by the time Step 6 mounts (validator gated).
  useEffect(() => {
    // The W-01 sentinel guard at Step 3 (Plan 02-02 Test 7) rejects currency===''
    // before Step 6 ever renders, so values.basics.currency here is one of
    // 'KGS' | 'USD' | 'EUR' | '' — the truthy check eliminates ''.
    if (
      values.terms.deposit &&
      !values.terms.deposit.currency &&
      values.basics.currency
    ) {
      setTerms({
        deposit: {
          ...values.terms.deposit,
          currency: values.basics.currency as DepositCur,
        },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showNegotiable = dt === 'sale' || dt === 'rent_long';
  const showPrepayMin = dt === 'rent_long';

  return (
    <View>
      <Text style={[commonStyles.sectionTitle, { color: colors.text }]}>
        {t('contextualListing.step6.title')}
      </Text>

      {/* Negotiable — sale + rent_long ONLY (rent_daily skips per matrix) */}
      {showNegotiable ? (
        <View style={commonStyles.section}>
          <Text style={[commonStyles.sectionLabel, { color: colors.text }]}>
            {t('contextualListing.step6.negotiableLabel')}
          </Text>
          <View style={commonStyles.chipRow} testID="negotiable-chip-row">
            {[
              { value: true, key: 'yes' as const },
              { value: false, key: 'no' as const },
            ].map((n) => {
              const isActive = values.terms.negotiable === n.value;
              return (
                <TouchableOpacity
                  key={n.key}
                  testID={`negotiable-chip-${n.key}`}
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
                  onPress={() => setTerms({ negotiable: n.value })}
                >
                  <Text
                    style={[
                      commonStyles.chipText,
                      { color: isActive ? colors.activeChipText : colors.text },
                    ]}
                  >
                    {t(`contextualListing.step6.negotiable.${n.key}` as TranslationKeys)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {errors['terms.negotiable'] ? (
            <Text
              testID="negotiable-error"
              style={[commonStyles.errorText, { color: colors.error }]}
            >
              {t(errors['terms.negotiable'] as TranslationKeys)}
            </Text>
          ) : null}
        </View>
      ) : null}

      {/* Deposit — optional for ALL deal types (sale + rent_long + rent_daily) */}
      <View style={commonStyles.section}>
        <Text style={[commonStyles.sectionLabel, { color: colors.text }]}>
          {t('contextualListing.step6.depositLabel')}
        </Text>
        <TextInput
          testID="deposit-amount"
          value={values.terms.deposit?.amount ?? ''}
          onChangeText={(v) => {
            const cleaned = v.replace(/[^0-9.]/g, '');
            if (cleaned === '') {
              setTerms({ deposit: undefined });
            } else {
              // W-01 sentinel guard: Step 3 validator (Plan 02-02 W-01) rejects currency==='',
              // so by the time the user reaches Step 6 basics.currency is one of KGS/USD/EUR.
              // If somehow empty, surface as a clear runtime assertion (planner-level bug).
              if (!values.basics.currency) {
                throw new Error(
                  'Step 6 deposit fallback unreachable: basics.currency is empty (Step 3 validator gate broken).',
                );
              }
              const depositCurrency: DepositCur =
                values.terms.deposit?.currency ?? (values.basics.currency as DepositCur);
              setTerms({ deposit: { amount: cleaned, currency: depositCurrency } });
            }
          }}
          keyboardType="decimal-pad"
          placeholder={t('contextualListing.step6.depositPlaceholder')}
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
        {/* Deposit currency selector — chips KGS/USD/EUR */}
        <View style={[commonStyles.chipRow, { marginTop: 8 }]} testID="deposit-currency-row">
          {DEPOSIT_CURRENCIES.map((cur) => {
            const isActive = values.terms.deposit?.currency === cur;
            return (
              <TouchableOpacity
                key={cur}
                testID={`deposit-currency-${cur}`}
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
                onPress={() =>
                  setTerms({
                    deposit: {
                      amount: values.terms.deposit?.amount ?? '',
                      currency: cur,
                    },
                  })
                }
                disabled={!values.terms.deposit?.amount}
              >
                <Text
                  style={[
                    commonStyles.chipText,
                    { color: isActive ? colors.activeChipText : colors.text },
                  ]}
                >
                  {cur}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Prepayment + minTerm — rent_long ONLY */}
      {showPrepayMin ? (
        <>
          <View style={commonStyles.section}>
            <Text style={[commonStyles.sectionLabel, { color: colors.text }]}>
              {t('contextualListing.step6.prepaymentLabel')}
            </Text>
            <View style={commonStyles.chipRow} testID="prepayment-chip-row">
              {PREPAY_PRESETS.map((n) => {
                const isActive = !customMode && values.terms.prepaymentMonths === n;
                return (
                  <TouchableOpacity
                    key={n}
                    testID={`prepayment-chip-${n}`}
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
                    onPress={() => handlePresetPrepay(n as 0 | 1 | 2)}
                  >
                    <Text
                      style={[
                        commonStyles.chipText,
                        { color: isActive ? colors.activeChipText : colors.text },
                      ]}
                    >
                      {t(`contextualListing.step6.prepayment.${n}` as TranslationKeys)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
              <TouchableOpacity
                testID="prepayment-chip-custom"
                style={[
                  commonStyles.chip,
                  {
                    backgroundColor: customMode
                      ? colors.activeChipBackground
                      : isDark
                      ? '#2C2C2E'
                      : '#F2F2F7',
                    borderColor: isDark ? '#3A3A3C' : '#E5E5EA',
                  },
                ]}
                onPress={handleCustomTap}
              >
                <Text
                  style={[
                    commonStyles.chipText,
                    { color: customMode ? colors.activeChipText : colors.text },
                  ]}
                >
                  {t('contextualListing.step6.prepayment.custom')}
                </Text>
              </TouchableOpacity>
            </View>
            {customMode ? (
              <TextInput
                testID="prepayment-custom-input"
                value={customStr}
                onChangeText={handleCustomInput}
                keyboardType="number-pad"
                placeholder={t('contextualListing.step6.prepayment.customPlaceholder')}
                placeholderTextColor={colors.textSecondary}
                style={[
                  commonStyles.input,
                  {
                    color: colors.text,
                    borderColor: colors.border,
                    backgroundColor: colors.inputBackground,
                    marginTop: 8,
                  },
                ]}
              />
            ) : null}
            {errors['terms.prepaymentMonths'] ? (
              <Text
                testID="prepayment-error"
                style={[commonStyles.errorText, { color: colors.error }]}
              >
                {t(errors['terms.prepaymentMonths'] as TranslationKeys)}
              </Text>
            ) : null}
          </View>

          <View style={commonStyles.section}>
            <Text style={[commonStyles.sectionLabel, { color: colors.text }]}>
              {t('contextualListing.step6.minTermLabel')}
            </Text>
            <View style={commonStyles.chipRow} testID="minTerm-chip-row">
              {MIN_TERMS.map((m) => {
                const isActive = values.terms.minTerm === m;
                return (
                  <TouchableOpacity
                    key={m}
                    testID={`minTerm-chip-${m}`}
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
                    onPress={() => setTerms({ minTerm: m })}
                  >
                    <Text
                      style={[
                        commonStyles.chipText,
                        { color: isActive ? colors.activeChipText : colors.text },
                      ]}
                    >
                      {t(`contextualListing.step6.minTerm.${m}` as TranslationKeys)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {errors['terms.minTerm'] ? (
              <Text
                testID="minTerm-error"
                style={[commonStyles.errorText, { color: colors.error }]}
              >
                {t(errors['terms.minTerm'] as TranslationKeys)}
              </Text>
            ) : null}
          </View>
        </>
      ) : null}

      {/* Quick-task 260526-foc — "Available from" date picker.
          OPTIONAL for ALL dealTypes (sale + rent_long + rent_daily) — empty = "available now"
          downstream (ListingMetaTable). Native modal (iOS spinner / Android dialog).
          Format stored: 'YYYY-MM-DD' (ISO-8601 date-only). Display uses dateLocale. */}
      <View style={commonStyles.section}>
        <Text style={[commonStyles.sectionLabel, { color: colors.text }]}>
          {t('contextualListing.step6.availableDateLabel')}
        </Text>
        <TouchableOpacity
          testID="availableDate-trigger"
          accessibilityRole="button"
          accessibilityLabel={t('contextualListing.step6.availableDatePlaceholder')}
          onPress={() => setShowDatePicker(true)}
          style={[
            commonStyles.input,
            {
              borderColor: colors.border,
              backgroundColor: colors.inputBackground,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingRight: 12,
            },
          ]}
        >
          <Text
            style={{
              color: values.terms.availableDate ? colors.text : colors.textSecondary,
              fontSize: 16,
            }}
          >
            {values.terms.availableDate
              ? new Date(values.terms.availableDate + 'T12:00:00').toLocaleDateString(
                  dateLocale,
                  { day: 'numeric', month: 'short', year: 'numeric' },
                )
              : t('contextualListing.step6.availableDatePlaceholder')}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {values.terms.availableDate ? (
              <TouchableOpacity
                testID="availableDate-clear"
                accessibilityRole="button"
                accessibilityLabel={t('contextualListing.step6.availableDateClear')}
                onPress={() => setTerms({ availableDate: undefined })}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text
                  style={{
                    color: colors.textSecondary,
                    fontSize: 14,
                    fontWeight: '600',
                  }}
                >
                  {t('contextualListing.step6.availableDateClear')}
                </Text>
              </TouchableOpacity>
            ) : null}
            <Text style={{ color: colors.textSecondary, fontSize: 16 }}>📅</Text>
          </View>
        </TouchableOpacity>
        <Text
          style={[
            commonStyles.errorText,
            { color: colors.textSecondary, marginTop: 6 },
          ]}
        >
          {t('contextualListing.step6.availableDateHint')}
        </Text>
        {errors['terms.availableDate'] ? (
          <Text
            testID="availableDate-error"
            style={[commonStyles.errorText, { color: colors.error }]}
          >
            {t(errors['terms.availableDate'] as TranslationKeys)}
          </Text>
        ) : null}
        {showDatePicker ? (
          <DateTimePicker
            testID="availableDate-picker"
            value={
              values.terms.availableDate
                ? new Date(values.terms.availableDate + 'T12:00:00')
                : new Date()
            }
            mode="date"
            locale={dateLocale}
            display={Platform.OS === 'ios' ? 'spinner' : undefined}
            themeVariant={
              Platform.OS === 'ios' ? (isDark ? 'dark' : 'light') : undefined
            }
            textColor={
              Platform.OS === 'ios'
                ? isDark
                  ? '#FFFFFF'
                  : '#000000'
                : undefined
            }
            onChange={(_event, d) => {
              if (Platform.OS === 'android') setShowDatePicker(false);
              if (d) setTerms({ availableDate: d.toISOString().slice(0, 10) });
            }}
          />
        ) : null}
        {showDatePicker && Platform.OS === 'ios' ? (
          <TouchableOpacity
            testID="availableDate-done"
            accessibilityRole="button"
            accessibilityLabel={t('common.done')}
            style={{
              backgroundColor: colors.primary,
              height: 44,
              borderRadius: 10,
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: 8,
            }}
            onPress={() => setShowDatePicker(false)}
          >
            <Text
              style={{
                color: isDark ? '#121212' : '#FFFFFF',
                fontSize: 16,
                fontWeight: '600',
              }}
            >
              {t('common.done')}
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

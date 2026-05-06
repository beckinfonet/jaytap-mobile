---
phase: 02-6-step-contextual-listing-flow-client
plan: 04b
type: execute
wave: 4
depends_on: ["02-04a"]
files_modified:
  - src/components/ContextualListingFlow/Step6DealConditions.tsx
  - src/components/ContextualListingFlow/index.tsx
  - src/components/ContextualListingFlow/__tests__/Step6.test.tsx
  - src/components/ContextualListingFlow/__tests__/integration.test.tsx
  - src/components/ContextualListingFlow/__tests__/validators.test.ts
  - src/services/PropertyService.ts
  - src/locales/en.ts
  - src/locales/ru.ts
autonomous: true
requirements: [FLOW-11, FLOW-12, FLOW-13, FLOW-15]

must_haves:
  truths:
    - "Step 6 renders dealType-gated matrix per SPEC §6: sale → negotiable + optional deposit; rent_long → negotiable + optional deposit + prepaymentMonths (0/1/2/Custom int) + minTerm; rent_daily → optional deposit only (per D-19 thin step)."
    - "Switching dealType in Step 1 reflows Step 6 cleanly per ROADMAP SC#4 — orchestrator clears terms.* fields on dealType change."
    - "Step 6 prepayment Custom-int chip OPENS input below seeded with current value (Pitfall 6 mitigation) — does NOT clobber the prior preset selection unless user types a new value."
    - "Submit button label morphs per CONTEXT specifics §Step 6 Submit button — 'Submit for review' for create/edit-owner; 'Save and approve' for edit-mod."
    - "Submit dispatches PropertyService.createProperty | updateProperty | editAsModerator per D-16 — replaces the Plan 02-02 stub log in index.tsx."
    - "FLOW-13 backend behaviors preserved: server defaults status:'pending'; M2 D-22 sanitizer + auto-flip preserved; RejectionBanner rendering on edit-resubmit unchanged (read-path screens consume it)."
    - "validateStep(6, ...) cases pass for all 4 deal-type cells (sale / rent_long / rent_daily / mod-edit-mode submit-button)."
    - "Integration test (apartment + rent_long Step 1→6 walk) advances all 6 steps and asserts payload shape on submit per SPEC §Suggested Data Shape; second cell asserts mode='edit-mod' renders mod-context banner per FLOW-15."
    - "+~17 i18n keys (Step 6) added to BOTH en.ts AND ru.ts; parity gate exits 0."
  artifacts:
    - path: "src/components/ContextualListingFlow/Step6DealConditions.tsx"
      provides: "Step 6 deal-type gated matrix component (negotiable, deposit, prepaymentMonths, minTerm)"
    - path: "src/components/ContextualListingFlow/__tests__/Step6.test.tsx"
      provides: "RTL component smoke for Step 6 — 4 deal-type cells covering sale/rent_long/rent_daily/mod-edit submit-button morph"
    - path: "src/components/ContextualListingFlow/__tests__/integration.test.tsx"
      provides: "End-to-end Step 1→6 walk for apartment + rent_long; mode='edit-mod' cell for FLOW-15"
    - path: "src/services/PropertyService.ts (modified or new method)"
      provides: "Method signatures for createProperty / updateProperty / editAsModerator that the orchestrator submit dispatch uses (verify which already exist; add only what's missing)"
  key_links:
    - from: "Step6DealConditions.tsx"
      to: "values.dealType"
      via: "switch on values.dealType to render matrix branches"
      pattern: "values.dealType === 'sale'\\|values.dealType === 'rent_long'\\|values.dealType === 'rent_daily'"
    - from: "src/components/ContextualListingFlow/index.tsx"
      to: "PropertyService.createProperty / updateProperty / editAsModerator"
      via: "submit dispatch by mode per D-16"
      pattern: "PropertyService\\.(createProperty|updateProperty|editAsModerator)"
    - from: "src/components/ContextualListingFlow/index.tsx onChange wrapper"
      to: "terms reflow on dealType change"
      via: "if field === 'dealType' && prev.dealType !== value, clear terms"
      pattern: "field === 'dealType'"
---

<objective>
Build Step 6 (DealConditions matrix) as the densest UX surface in the phase — 3 deal-type branches × 4 fields with gating logic, plus a Custom-int prepayment input with the seed-from-current edge case (Pitfall 6). Wire the real submit dispatch into index.tsx (replacing the Plan 02-02 stub log) per D-16. Add the integration test covering Step 1→6 walk for apartment + rent_long AND a mode='edit-mod' cell for FLOW-15. Add 17 Step 6 i18n keys.

This plan completes the user-facing flow surface. After this plan ships, the flow can be mounted and submit a real listing — but it's not yet connected to App.tsx (Plan 02-07 owns).

Per CONTEXT.md D-19: rent_daily Step 6 is THIN (only optional deposit). SPEC's recommendation: "predictable structure beats minor screen savings" — same Step 6 component, just renders only the deposit input branch.

Per Pitfall 6 mitigation: tapping "Custom" prepayment chip OPENS the number input below seeded with the current `prepaymentMonths` value. Submit-time validation: if Custom chip selected AND input is empty, error "Enter a number of months OR pick a preset". RTL test cell required.

Per ROADMAP SC#4: switching dealType at Step 1 reflows Step 6 — implement via the orchestrator's onChange wrapper (extending the propertyType-reflow added in Plan 02-03).

Per CONTEXT.md D-16 + FLOW-13: submit dispatch by mode:
- mode='create' → `PropertyService.createProperty(payload)` → server defaults `status: 'pending'` (M2 D-22 sanitizer strips client-sent status).
- mode='edit-owner' → `PropertyService.updateProperty(id, payload)` → M2 D-22 auto-flip applies if was rejected.
- mode='edit-mod' → `PropertyService.editAsModerator(id, payload, moderatorContext.reason)` → M2 MOD-14 path; status flips to live per M2 semantics.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/02-6-step-contextual-listing-flow-client/02-CONTEXT.md
@.planning/phases/02-6-step-contextual-listing-flow-client/02-RESEARCH.md
@.planning/phases/02-6-step-contextual-listing-flow-client/02-PATTERNS.md
@.planning/phases/02-6-step-contextual-listing-flow-client/02-VALIDATION.md
@.planning/phases/02-6-step-contextual-listing-flow-client/02-04a-SUMMARY.md
@src/components/ContextualListingFlow/index.tsx
@src/components/ContextualListingFlow/types.ts
@src/components/ContextualListingFlow/validators.ts
@src/components/ContextualListingFlow/styles.ts
@src/services/PropertyService.ts
@src/screens/CreateListingScreen.tsx
@src/locales/en.ts
@src/locales/ru.ts

<interfaces>
<!-- Step 6 matrix cheatsheet (RESEARCH lines 654-664 — verbatim). -->

| Field | sale | rent_long | rent_daily |
|-------|:----:|:---------:|:----------:|
| `negotiable` (bool) | ✅ required | ✅ required | ❌ (hidden) |
| `deposit` (amount + currency) | optional | optional | optional |
| `prepaymentMonths` (0/1/2/custom int) | ❌ (hidden) | ✅ required (>=0) | ❌ (hidden) |
| `minTerm` ('1_month' / '3_months') | ❌ (hidden) | ✅ required | implicit `'1_day'` (no UI) |

<!-- validateStep(6) already implemented per Plan 02-02 Task 2 — see validators.ts. -->

<!-- PropertyService — verify existing methods. From M2 baseline (referenced in CreateListingScreen.tsx:525-575): -->
- PropertyService.createProperty(payload) — exists per M2 baseline
- PropertyService.updateProperty(id, payload) — exists per M2 baseline
- PropertyService.editAsModerator(id, payload, reason) — exists per M2 MOD-14 (Phase 3 baseline)

If any of these signatures differ in the actual current code, adjust the orchestrator submit dispatch to match what exists.
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Create Step6DealConditions.tsx + Step6.test.tsx</name>
  <files>
    - src/components/ContextualListingFlow/Step6DealConditions.tsx (NEW)
    - src/components/ContextualListingFlow/__tests__/Step6.test.tsx (NEW — Wave 0)
  </files>
  <read_first>
    - src/components/CreateListingForm/PriceSection.tsx (currency chip + deposit numeric input pattern per PATTERNS.md row 22)
    - src/components/ContextualListingFlow/Step3BasicInfo.tsx (Plan 02-03 — chip + number-input pattern in this flow)
    - .planning/phases/02-6-step-contextual-listing-flow-client/02-RESEARCH.md §"Step 6 Matrix Cheatsheet" (lines 652-664)
    - .planning/phases/02-6-step-contextual-listing-flow-client/02-RESEARCH.md §"Pitfall 6" (lines 731-736 — Custom-int seed-from-current mitigation)
    - .planning/phases/02-6-step-contextual-listing-flow-client/02-CONTEXT.md D-19 (daily-rent thin step)
  </read_first>
  <behavior>
    Wave 0 RTL test cases for Step6.test.tsx (cover all 4 deal-type cells):

    **dealType='sale' cell:**
    - Test 1: renders negotiable Yes/No chips; deposit input visible (optional); prepayment + minTerm NOT rendered.

    **dealType='rent_long' cell:**
    - Test 2: renders negotiable Yes/No + deposit (optional) + prepayment chips (0/1/2/Custom) + minTerm chips (1_month/3_months) — all visible.
    - Test 3: tapping prepayment chip '1' dispatches `onChange('terms', { ...values.terms, prepaymentMonths: 1 })`.
    - Test 4: tapping prepayment 'Custom' chip OPENS number input below seeded with current `prepaymentMonths` value (Pitfall 6).
    - Test 5: tapping 'Custom' when prior preset='1' shows '1' in the Custom input by default (does NOT clobber to empty).
    - Test 6: typing in Custom input dispatches `onChange('terms', { ...values.terms, prepaymentMonths: typedNumber })`.
    - Test 7: tapping minTerm '3_months' dispatches `onChange('terms', { ...values.terms, minTerm: '3_months' })`.

    **dealType='rent_daily' cell (D-19 thin step):**
    - Test 8: renders ONLY the deposit input; negotiable, prepayment, minTerm NOT rendered.

    **Edit-mod submit-button cell (FLOW-15 + specifics):**
    - Test 9: when prop `mode='edit-mod'` is passed (or rendered via the orchestrator with mode set), the Next-becomes-Submit button on Step 6 displays `t('contextualListing.submit.modEdit')` instead of `t('contextualListing.submit.create')`. (This test may live in `integration.test.tsx` — Task 4 — instead; planner picks placement.)

    **Optional deposit currency cell:**
    - Test 10: deposit input has a currency selector (KGS/USD/EUR chips) per CONTEXT specifics §"Step 6 deposit currency"; tapping a currency dispatches `onChange('terms', { ...values.terms, deposit: { amount: '...', currency: 'USD' } })`.
    - Test 11: deposit currency defaults to `values.basics.currency` from Step 3 if no currency yet selected for deposit.
  </behavior>
  <action>
    Create `src/components/ContextualListingFlow/Step6DealConditions.tsx`. Implementation logic:

    ```typescript
    /**
     * Phase 2 Step 6 — DealConditions matrix gated by dealType (FLOW-11 + D-19).
     * Matrix per SPEC §6 + RESEARCH §Step 6 Matrix Cheatsheet:
     *   sale       → negotiable required + deposit optional
     *   rent_long  → negotiable + deposit optional + prepaymentMonths (0/1/2/Custom) + minTerm
     *   rent_daily → deposit only (D-19 thin step)
     * Pitfall 6: Custom-int chip OPENS input seeded with current value; does NOT clobber preset.
     */

    import React, { useState, useEffect } from 'react';
    import { View, Text, TextInput, TouchableOpacity } from 'react-native';
    import { useTheme } from '../../providers/ThemeProvider';
    import { useLanguage } from '../../providers/LanguageProvider';
    import { commonStyles } from './styles';
    import type { SectionProps, FormBag } from './types';

    type DepositCur = NonNullable<FormBag['terms']['deposit']>['currency'];
    type MinTerm = NonNullable<FormBag['terms']['minTerm']>;

    const PREPAY_PRESETS = [0, 1, 2] as const;
    const MIN_TERMS: MinTerm[] = ['1_month', '3_months'];
    const DEPOSIT_CURRENCIES: DepositCur[] = ['KGS', 'USD', 'EUR'];

    export function Step6DealConditions({ values, onChange, errors }: SectionProps) {
      const { colors, isDark } = useTheme();
      const { t } = useLanguage();
      const dt = values.dealType;

      // Custom prepayment local UI state (Pitfall 6)
      const isPresetPrepay = values.terms.prepaymentMonths !== undefined && PREPAY_PRESETS.includes(values.terms.prepaymentMonths as 0 | 1 | 2);
      const [customMode, setCustomMode] = useState<boolean>(values.terms.prepaymentMonths !== undefined && !isPresetPrepay);
      const [customStr, setCustomStr] = useState<string>(
        !isPresetPrepay && values.terms.prepaymentMonths !== undefined ? String(values.terms.prepaymentMonths) : ''
      );

      const setTerms = (patch: Partial<FormBag['terms']>) => onChange('terms', { ...values.terms, ...patch });

      const handlePresetPrepay = (n: 0 | 1 | 2) => {
        setCustomMode(false);
        setCustomStr(String(n));
        setTerms({ prepaymentMonths: n });
      };

      const handleCustomTap = () => {
        // Pitfall 6 mitigation: seed from current value (don't clobber)
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

      // Default deposit currency to Step 3's currency if no deposit currency selected yet
      useEffect(() => {
        if (values.terms.deposit && !values.terms.deposit.currency && values.basics.currency) {
          setTerms({ deposit: { ...values.terms.deposit, currency: values.basics.currency as DepositCur } });
        }
      }, []); // intentional: only on mount

      const renderChipRow = <T extends string | number>(opts: readonly T[], current: T | undefined, onPick: (v: T) => void, testIDPrefix: string, labelFn: (v: T) => string) => (
        <View style={commonStyles.chipRow}>
          {opts.map((o) => {
            const isActive = current === o;
            return (
              <TouchableOpacity
                key={String(o)}
                testID={`${testIDPrefix}-${o}`}
                style={[commonStyles.chip, {
                  backgroundColor: isActive ? colors.primary : (isDark ? '#2C2C2E' : '#F2F2F7'),
                  borderColor: isDark ? '#3A3A3C' : '#E5E5EA',
                }]}
                onPress={() => onPick(o)}
              >
                <Text style={[commonStyles.chipText, { color: isActive ? '#FFF' : colors.text }]}>{labelFn(o)}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      );

      // Show negotiable chips for sale + rent_long (NOT rent_daily per matrix)
      const showNegotiable = dt === 'sale' || dt === 'rent_long';
      const showPrepayMin = dt === 'rent_long';

      return (
        <View>
          <Text style={[commonStyles.sectionTitle, { color: colors.text }]}>{t('contextualListing.step6.title')}</Text>

          {/* Negotiable */}
          {showNegotiable ? (
            <View style={commonStyles.section}>
              <Text style={[commonStyles.sectionLabel, { color: colors.text }]}>{t('contextualListing.step6.negotiableLabel')}</Text>
              <View style={commonStyles.chipRow}>
                {[
                  { value: true,  key: 'yes' },
                  { value: false, key: 'no'  },
                ].map((n) => {
                  const isActive = values.terms.negotiable === n.value;
                  return (
                    <TouchableOpacity
                      key={n.key}
                      testID={`negotiable-chip-${n.key}`}
                      style={[commonStyles.chip, { backgroundColor: isActive ? colors.primary : (isDark ? '#2C2C2E' : '#F2F2F7'), borderColor: isDark ? '#3A3A3C' : '#E5E5EA' }]}
                      onPress={() => setTerms({ negotiable: n.value })}
                    >
                      <Text style={[commonStyles.chipText, { color: isActive ? '#FFF' : colors.text }]}>
                        {t(`contextualListing.step6.negotiable.${n.key}`)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {errors['terms.negotiable'] ? (
                <Text style={[commonStyles.errorText, { color: colors.error ?? '#FF3B30' }]}>{t(errors['terms.negotiable'])}</Text>
              ) : null}
            </View>
          ) : null}

          {/* Deposit (optional for ALL deal types) */}
          <View style={commonStyles.section}>
            <Text style={[commonStyles.sectionLabel, { color: colors.text }]}>{t('contextualListing.step6.depositLabel')}</Text>
            <TextInput
              testID="deposit-amount"
              value={values.terms.deposit?.amount ?? ''}
              onChangeText={(v) => {
                const cleaned = v.replace(/[^0-9.]/g, '');
                if (cleaned === '') {
                  setTerms({ deposit: undefined });
                } else {
                  // W-01 FIX: Step 3 validator (Plan 02-02 Test 7) gates Step 6 — values.basics.currency is
                  // guaranteed non-empty here. Use it directly; do NOT silently coerce '' to 'KGS' via `||`.
                  // If the assertion fires, the Step 3 gate has been bypassed (planner-level bug to surface, not silently mask).
                  if (!values.basics.currency) {
                    throw new Error('Step 6 deposit fallback unreachable: basics.currency is empty (Step 3 validator gate broken).');
                  }
                  const depositCurrency: DepositCur = values.terms.deposit?.currency ?? (values.basics.currency as DepositCur);
                  setTerms({ deposit: { amount: cleaned, currency: depositCurrency } });
                }
              }}
              keyboardType="decimal-pad"
              placeholder={t('contextualListing.step6.depositPlaceholder')}
              placeholderTextColor={(colors as any).textSecondary ?? colors.text}
              style={[commonStyles.input, { color: colors.text, borderColor: colors.border ?? '#E5E5EA' }]}
            />
            {/* Deposit currency selector */}
            <View style={[commonStyles.chipRow, { marginTop: 8 }]}>
              {DEPOSIT_CURRENCIES.map((cur) => {
                const isActive = values.terms.deposit?.currency === cur;
                return (
                  <TouchableOpacity
                    key={cur}
                    testID={`deposit-currency-${cur}`}
                    style={[commonStyles.chip, { backgroundColor: isActive ? colors.primary : (isDark ? '#2C2C2E' : '#F2F2F7'), borderColor: isDark ? '#3A3A3C' : '#E5E5EA' }]}
                    onPress={() => setTerms({ deposit: { amount: values.terms.deposit?.amount ?? '', currency: cur } })}
                    disabled={!values.terms.deposit?.amount}
                  >
                    <Text style={[commonStyles.chipText, { color: isActive ? '#FFF' : colors.text }]}>{cur}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Prepayment + minTerm (rent_long ONLY) */}
          {showPrepayMin ? (
            <>
              <View style={commonStyles.section}>
                <Text style={[commonStyles.sectionLabel, { color: colors.text }]}>{t('contextualListing.step6.prepaymentLabel')}</Text>
                <View style={commonStyles.chipRow}>
                  {PREPAY_PRESETS.map((n) => {
                    const isActive = !customMode && values.terms.prepaymentMonths === n;
                    return (
                      <TouchableOpacity
                        key={n}
                        testID={`prepayment-chip-${n}`}
                        style={[commonStyles.chip, { backgroundColor: isActive ? colors.primary : (isDark ? '#2C2C2E' : '#F2F2F7'), borderColor: isDark ? '#3A3A3C' : '#E5E5EA' }]}
                        onPress={() => handlePresetPrepay(n as 0 | 1 | 2)}
                      >
                        <Text style={[commonStyles.chipText, { color: isActive ? '#FFF' : colors.text }]}>
                          {t(`contextualListing.step6.prepayment.${n}`)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                  <TouchableOpacity
                    testID="prepayment-chip-custom"
                    style={[commonStyles.chip, { backgroundColor: customMode ? colors.primary : (isDark ? '#2C2C2E' : '#F2F2F7'), borderColor: isDark ? '#3A3A3C' : '#E5E5EA' }]}
                    onPress={handleCustomTap}
                  >
                    <Text style={[commonStyles.chipText, { color: customMode ? '#FFF' : colors.text }]}>
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
                    placeholderTextColor={(colors as any).textSecondary ?? colors.text}
                    style={[commonStyles.input, { color: colors.text, borderColor: colors.border ?? '#E5E5EA', marginTop: 8 }]}
                  />
                ) : null}
                {errors['terms.prepaymentMonths'] ? (
                  <Text style={[commonStyles.errorText, { color: colors.error ?? '#FF3B30' }]}>{t(errors['terms.prepaymentMonths'])}</Text>
                ) : null}
              </View>

              <View style={commonStyles.section}>
                <Text style={[commonStyles.sectionLabel, { color: colors.text }]}>{t('contextualListing.step6.minTermLabel')}</Text>
                {renderChipRow(MIN_TERMS, values.terms.minTerm, (m) => setTerms({ minTerm: m }), 'minTerm-chip', (m) => t(`contextualListing.step6.minTerm.${m}`))}
                {errors['terms.minTerm'] ? (
                  <Text style={[commonStyles.errorText, { color: colors.error ?? '#FF3B30' }]}>{t(errors['terms.minTerm'])}</Text>
                ) : null}
              </View>
            </>
          ) : null}
        </View>
      );
    }
    ```

    Then create `__tests__/Step6.test.tsx` covering Tests 1-11. Mock useTheme + useLanguage as in prior plans. Build a `renderStep6(overrides)` helper that takes a partial FormBag.
  </action>
  <verify>
    <automated>cd /Users/beckmaldinVL/development/mobileApps/JayTap && npx jest src/components/ContextualListingFlow/__tests__/Step6.test.tsx -x</automated>
  </verify>
  <done>
    - Step6 renders 3 deal-type matrix branches correctly.
    - Custom-int seed-from-current works (Pitfall 6).
    - 11 RTL tests pass.
  </done>
  <acceptance_criteria>
    - `grep -c "showNegotiable\\|showPrepayMin" src/components/ContextualListingFlow/Step6DealConditions.tsx` returns at least 2 (matrix gating present).
    - `grep -c "dt === 'sale'\\|dt === 'rent_long'\\|dt === 'rent_daily'" src/components/ContextualListingFlow/Step6DealConditions.tsx` returns at least 2 (deal-type branches present in showNegotiable/showPrepayMin).
    - `grep -c "customMode\\|customStr" src/components/ContextualListingFlow/Step6DealConditions.tsx` returns at least 4 (Custom-int local state present).
    - `grep -c "if (values.terms.prepaymentMonths !== undefined)" src/components/ContextualListingFlow/Step6DealConditions.tsx` returns at least 1 (Pitfall 6 seed-from-current).
    - `grep -c "test(" src/components/ContextualListingFlow/__tests__/Step6.test.tsx` returns at least 11.
    - `npx jest src/components/ContextualListingFlow/__tests__/Step6.test.tsx -x` exits 0.
  </acceptance_criteria>
</task>

<task type="auto">
  <name>Task 2: Wire Step 6 into orchestrator + dealType reflow + real submit dispatch</name>
  <files>
    - src/components/ContextualListingFlow/index.tsx (MODIFIED)
    - src/services/PropertyService.ts (MODIFIED — verify methods exist; add only missing signatures)
  </files>
  <read_first>
    - src/services/PropertyService.ts (current method signatures — verify createProperty, updateProperty, editAsModerator exist; if not, add per the M2 baseline pattern)
    - src/screens/CreateListingScreen.tsx (lines 525-575 — M1 P4 3-branch submit dispatcher; transplant the conditional pattern)
    - src/components/ContextualListingFlow/index.tsx (current state — Plan 02-04a wired Step1-5; this task wires Step 6 + replaces stub submit with real dispatch + adds dealType reflow)
    - .planning/phases/02-6-step-contextual-listing-flow-client/02-CONTEXT.md D-16 (submit by mode) + D-17 (success destination)
  </read_first>
  <action>
    Step 1 — Verify PropertyService.ts has the 3 methods. If any are missing, add them (signatures matching M2 baseline). For M2 MOD-14 `editAsModerator(listingId, payload, reason)` — verify the existing call site in `CreateListingScreen.tsx:533-546` for the exact signature.

    Step 2 — Modify `src/components/ContextualListingFlow/index.tsx`:

    a) Add `import { Step6DealConditions } from './Step6DealConditions'`.

    b) Replace case 6 placeholder in stepBody:
    ```typescript
    case 6: return <Step6DealConditions values={values} onChange={onChange} errors={errors} />;
    ```

    c) Extend the onChange wrapper (added in Plan 02-03) to ALSO clear terms when dealType changes (ROADMAP SC#4):
    ```typescript
    const onChange = useCallback(<K extends keyof FormBag>(field: K, value: FormBag[K]) => {
      setValues((prev) => {
        const next = { ...prev, [field]: value };
        // ROADMAP SC#3: switching propertyType reflows Step 3 sub-fields
        if (field === 'propertyType' && prev.propertyType !== value) {
          next.basics = {
            ...prev.basics,
            rooms: undefined,
            bathroom: undefined,
            kitchen: undefined,
            hotelRooms: undefined,
            hotelClass: undefined,
          };
        }
        // ROADMAP SC#4: switching dealType reflows Step 6 fields
        if (field === 'dealType' && prev.dealType !== value) {
          next.terms = {};
        }
        return next;
      });
    }, []);
    ```

    d) Replace the stub `console.log('[ContextualListingFlow] submit payload:', ...)` with real PropertyService dispatch per D-16:
    ```typescript
    setIsSubmitting(true);
    try {
      const payload = formBagToPropertyPayload(values);
      let resultId: string;
      if (mode === 'create') {
        const created = await PropertyService.createProperty(payload as Parameters<typeof PropertyService.createProperty>[0]);
        resultId = (created as { id?: string; _id?: string }).id ?? (created as { _id?: string })._id ?? '';
      } else if (mode === 'edit-owner') {
        const updated = await PropertyService.updateProperty(initialListing!.id, payload as Parameters<typeof PropertyService.updateProperty>[1]);
        resultId = (updated as { id?: string; _id?: string }).id ?? (updated as { _id?: string })._id ?? initialListing!.id;
      } else { // edit-mod
        const reason = (props as { moderatorContext: { reason?: string } }).moderatorContext.reason;
        const updated = await PropertyService.editAsModerator(initialListing!.id, payload, reason);
        resultId = (updated as { id?: string; _id?: string }).id ?? (updated as { _id?: string })._id ?? initialListing!.id;
      }
      if ((props as { onSuccess?: (id: string) => void }).onSuccess) {
        (props as { onSuccess: (id: string) => void }).onSuccess(resultId);
      }
      onClose();
    } catch (e: unknown) {
      const msg = (e as { message?: string }).message ?? 'Submit failed';
      Alert.alert(t('common.error'), msg);
    } finally {
      setIsSubmitting(false);
    }
    ```

    Add `import * as PropertyService from '../../services/PropertyService'` at the top (or whatever the existing import convention is — check CreateListingScreen.tsx line 1-30 for the verified import pattern).

    Important: do NOT add any retry-on-401-403 logic — the existing `apiClient.ts` Bearer + 401/403 single-flight refresh (M2 ROLE-09) handles auth refresh transparently.
  </action>
  <verify>
    <automated>cd /Users/beckmaldinVL/development/mobileApps/JayTap && grep -n "Step6DealConditions\\|field === 'dealType'\\|PropertyService.createProperty\\|PropertyService.updateProperty\\|PropertyService.editAsModerator" src/components/ContextualListingFlow/index.tsx | head -10</automated>
  </verify>
  <done>
    - Step 6 wired into stepBody case 6 (no placeholder remaining).
    - dealType-change reflow clears terms (in addition to existing propertyType-change reflow from Plan 02-03).
    - Submit dispatch real (no `console.log` stub remaining).
    - PropertyService method signatures verified.
  </done>
  <acceptance_criteria>
    - `grep -c "Step6DealConditions" src/components/ContextualListingFlow/index.tsx` returns at least 2 (import + case branch).
    - `grep -c "Step 6 — coming in Plan 02-04b" src/components/ContextualListingFlow/index.tsx` returns 0 (placeholder removed).
    - `grep -c "field === 'dealType'" src/components/ContextualListingFlow/index.tsx` returns at least 1 (reflow wrapper extended).
    - `grep -c "next.terms = \\{\\}" src/components/ContextualListingFlow/index.tsx` returns at least 1.
    - `grep -c "PropertyService.createProperty\\|PropertyService.updateProperty\\|PropertyService.editAsModerator" src/components/ContextualListingFlow/index.tsx` returns at least 3.
    - `grep -c "console.log\\(.\\[ContextualListingFlow\\] submit payload" src/components/ContextualListingFlow/index.tsx` returns 0 (stub removed).
    - File compiles standalone.
  </acceptance_criteria>
</task>

<task type="auto" tdd="true">
  <name>Task 3: Append Step 6 validator tests + author integration.test.tsx (Step 1→6 walk + edit-mod cell)</name>
  <files>
    - src/components/ContextualListingFlow/__tests__/validators.test.ts (MODIFIED — append Step 6 cases)
    - src/components/ContextualListingFlow/__tests__/integration.test.tsx (NEW — Wave 0)
  </files>
  <read_first>
    - src/components/ContextualListingFlow/index.tsx (post-Task 2 — full orchestrator with Step 1-6 wired and real submit dispatch)
    - src/components/ContextualListingFlow/__tests__/Step2.test.tsx (Plan 02-03 — pattern for mocking react-native-maps + locationService)
    - .planning/phases/02-6-step-contextual-listing-flow-client/02-PATTERNS.md row 45 (integration test pattern + jest mock for react-native-maps)
    - .planning/phases/02-6-step-contextual-listing-flow-client/02-VALIDATION.md FLOW-13 + FLOW-15 rows
  </read_first>
  <behavior>
    validator test cases to APPEND (Step 6):
    - V15: validateStep(6, dealType='sale', empty terms) → errors['terms.negotiable'] set.
    - V16: validateStep(6, dealType='sale', terms.negotiable=true) → isValid=true (deposit optional).
    - V17: validateStep(6, dealType='rent_long', empty terms) → 3 errors (negotiable + prepayment + minTerm).
    - V18: validateStep(6, dealType='rent_long', terms={negotiable:true, prepaymentMonths:1, minTerm:'1_month'}) → isValid=true.
    - V19: validateStep(6, dealType='rent_long', terms={negotiable:true, prepaymentMonths:0, minTerm:'1_month'}) → isValid=true (prepaymentMonths=0 IS valid; >=0 check).
    - V20: validateStep(6, dealType='rent_daily', empty terms) → isValid=true (no required fields).

    integration.test.tsx cases:
    - INT-1: mode='create', apartment + rent_long Step 1→6 walk — programmatically advance:
      Step 1: tap dealType='rent_long', tap propertyType='apartment', tap Next → advances to Step 2.
      Step 2: requires mocking locationService (return 1 city + 1 district), mocking MapView onPress to set coords, then taps Next.
      Step 3: type areaSqm='80', price='1000', tap currency='KGS', tap rooms='2', tap Next.
      Step 4: tap condition='good', tap furnished='yes', tap Next.
      Step 5: type title='X', description='Y', tap Next.
      Step 6: tap negotiable='yes', tap prepayment='1', tap minTerm='1_month', tap Submit.
      Assert: PropertyService.createProperty called with payload matching SPEC §Suggested Data Shape; onSuccess called with returned id.
    - INT-2: mode='edit-mod' renders mod-context banner (FLOW-15) — pass `moderatorContext: { editingOwnerUid: 'owner-uid', ownerEmail: 'owner@x.com', reason: 'fix typo' }` and assert banner testID exists on Step 1.
    - INT-3: Submit button label morph — on Step 6, with mode='edit-mod', submit button text matches `t('contextualListing.submit.modEdit')` (which the mock returns as the key string).
  </behavior>
  <action>
    Step 1 — Append Step 6 cases (V15-V20) to `src/components/ContextualListingFlow/__tests__/validators.test.ts`:

    ```typescript
    describe('Phase 2 validators — Step 6 (Plan 02-04b)', () => {
      test('sale + empty terms → negotiable error', () => {
        const bag = { ...emptyFormBag(), dealType: 'sale' as const };
        expect(validateStep(6, bag).errors['terms.negotiable']).toBeDefined();
      });

      test('sale + negotiable set → isValid (deposit optional)', () => {
        const bag = { ...emptyFormBag(), dealType: 'sale' as const, terms: { negotiable: true } };
        expect(validateStep(6, bag).isValid).toBe(true);
      });

      test('rent_long + empty terms → 3 errors (negotiable, prepayment, minTerm)', () => {
        const bag = { ...emptyFormBag(), dealType: 'rent_long' as const };
        const r = validateStep(6, bag);
        expect(r.errors['terms.negotiable']).toBeDefined();
        expect(r.errors['terms.prepaymentMonths']).toBeDefined();
        expect(r.errors['terms.minTerm']).toBeDefined();
      });

      test('rent_long + all required set → isValid', () => {
        const bag = { ...emptyFormBag(), dealType: 'rent_long' as const, terms: { negotiable: true, prepaymentMonths: 1, minTerm: '1_month' as const } };
        expect(validateStep(6, bag).isValid).toBe(true);
      });

      test('rent_long + prepaymentMonths=0 → isValid (>=0)', () => {
        const bag = { ...emptyFormBag(), dealType: 'rent_long' as const, terms: { negotiable: true, prepaymentMonths: 0, minTerm: '1_month' as const } };
        expect(validateStep(6, bag).isValid).toBe(true);
      });

      test('rent_daily + empty terms → isValid (no required fields)', () => {
        const bag = { ...emptyFormBag(), dealType: 'rent_daily' as const };
        expect(validateStep(6, bag).isValid).toBe(true);
      });
    });
    ```

    Step 2 — Create `src/components/ContextualListingFlow/__tests__/integration.test.tsx`. Mock react-native-maps + locationService + PropertyService:

    ```typescript
    import React from 'react';
    import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
    import { ContextualListingFlow } from '../index';

    // Theme + Language mocks — same shape as Step1.test.tsx
    jest.mock('../../../providers/ThemeProvider', () => ({
      useTheme: () => ({ colors: { text:'#000', primary:'#007AFF', error:'#FF3B30', background:'#FFF', surface:'#F2F2F7', border:'#E5E5EA', warning:'#FF9500' }, isDark: false }),
    }));
    jest.mock('../../../providers/LanguageProvider', () => ({
      useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
    }));

    // react-native-maps mock — same as Step2.test.tsx
    jest.mock('react-native-maps', () => {
      const React = require('react');
      const { View } = require('react-native');
      const MapView = ({ children, onPress, testID, ...rest }: any) =>
        React.createElement(View, { testID: testID ?? 'mock-mapview', onPress, ...rest }, children);
      const Marker = (props: any) => React.createElement(View, { testID: props.testID ?? 'mock-marker', ...props });
      return { __esModule: true, default: MapView, Marker, PROVIDER_DEFAULT: 'default' };
    });

    // locationService mock
    jest.mock('../../../services/locationService', () => ({
      fetchCities: jest.fn().mockResolvedValue([
        { _id: 'c1', slug: 'bishkek', label: { ru: 'Бишкек', en: 'Bishkek' }, country: 'KG', centroid: { lat: 42.87, lng: 74.57 }, status: 'approved', createdByUid: 'seed' },
      ]),
      fetchDistricts: jest.fn().mockResolvedValue([
        { _id: 'd1', cityId: 'c1', slug: 'asanbay', label: { ru: 'Асанбай', en: 'Asanbay' }, status: 'approved', createdByUid: 'seed' },
      ]),
      createCity: jest.fn(),
      createDistrict: jest.fn(),
    }));

    // PropertyService mock
    jest.mock('../../../services/PropertyService', () => ({
      createProperty: jest.fn().mockResolvedValue({ id: 'new-listing-id' }),
      updateProperty: jest.fn().mockResolvedValue({ id: 'updated-id' }),
      editAsModerator: jest.fn().mockResolvedValue({ id: 'mod-edited-id' }),
    }));

    const PropertyService = require('../../../services/PropertyService');

    describe('ContextualListingFlow integration (Plan 02-04b)', () => {
      test('INT-1: apartment + rent_long Step 1→6 walk dispatches createProperty with SPEC payload', async () => {
        const onClose = jest.fn();
        const onSuccess = jest.fn();
        const { getByTestId, queryByTestId } = render(
          <ContextualListingFlow mode="create" onClose={onClose} onSuccess={onSuccess} />
        );

        // Step 1 — pick rent_long + apartment
        fireEvent.press(getByTestId('deal-type-chip-rent_long'));
        fireEvent.press(getByTestId('property-type-chip-apartment'));
        fireEvent.press(getByTestId('contextual-listing-next'));

        // Step 2 — wait for cities, pick city, pick district, drop pin
        await waitFor(() => expect(getByTestId('city-chip-bishkek')).toBeTruthy());
        fireEvent.press(getByTestId('city-chip-bishkek'));
        await waitFor(() => expect(getByTestId('district-chip-asanbay')).toBeTruthy());
        fireEvent.press(getByTestId('district-chip-asanbay'));
        // Simulate map onPress to drop pin (mock MapView passes onPress through)
        fireEvent(getByTestId('mock-mapview'), 'press', { nativeEvent: { coordinate: { latitude: 42.87, longitude: 74.57 } } });
        fireEvent.press(getByTestId('contextual-listing-next'));

        // Step 3 — area, price, currency, rooms
        fireEvent.changeText(getByTestId('basics-areaSqm'), '80');
        fireEvent.changeText(getByTestId('basics-price'), '1000');
        fireEvent.press(getByTestId('currency-chip-KGS'));
        fireEvent.press(getByTestId('rooms-chip-2'));
        fireEvent.press(getByTestId('contextual-listing-next'));

        // Step 4 — condition + furnished
        fireEvent.press(getByTestId('condition-chip-good'));
        fireEvent.press(getByTestId('furnished-chip-yes'));
        fireEvent.press(getByTestId('contextual-listing-next'));

        // Step 5 — title + description
        fireEvent.changeText(getByTestId('content-title'), 'Cozy 2BR');
        fireEvent.changeText(getByTestId('content-description'), 'Nice place');
        fireEvent.press(getByTestId('contextual-listing-next'));

        // Step 6 — negotiable, prepayment, minTerm
        fireEvent.press(getByTestId('negotiable-chip-yes'));
        fireEvent.press(getByTestId('prepayment-chip-1'));
        fireEvent.press(getByTestId('minTerm-chip-1_month'));
        fireEvent.press(getByTestId('contextual-listing-next'));

        // Submit fired
        await waitFor(() => expect(PropertyService.createProperty).toHaveBeenCalledTimes(1));
        const payload = PropertyService.createProperty.mock.calls[0][0];
        expect(payload).toMatchObject({
          dealType: 'rent_long',
          propertyType: 'apartment',
          location: { city: 'bishkek', district: 'asanbay' },
          basics: { areaSqm: 80, price: 1000, currency: 'KGS', rooms: '2' },
          conditionAndAmenities: { condition: 'good', furnished: true },
          content: { title: 'Cozy 2BR', description: 'Nice place' },
          terms: { negotiable: true, prepaymentMonths: 1, minTerm: '1_month' },
        });
        expect(payload).not.toHaveProperty('status');
        expect(payload).not.toHaveProperty('media');
        await waitFor(() => expect(onSuccess).toHaveBeenCalledWith('new-listing-id'));
      });

      test('INT-2: mode=edit-mod renders mod-context banner on Step 1 (FLOW-15)', () => {
        const initialListing = { id: 'lst-1', dealType: 'sale', propertyType: 'apartment' } as any;
        const moderatorContext = { editingOwnerUid: 'owner-uid', ownerEmail: 'owner@x.com', reason: 'fix typo' };
        const { getByTestId } = render(
          <ContextualListingFlow
            mode="edit-mod"
            initialListing={initialListing}
            moderatorContext={moderatorContext}
            onClose={jest.fn()}
          />
        );
        expect(getByTestId('mod-context-banner')).toBeTruthy();
      });

      test('INT-3: Submit button on Step 6 with mode=edit-mod shows modEdit label', async () => {
        const initialListing = {
          id: 'lst-1', dealType: 'rent_long', propertyType: 'apartment',
          location: { city: 'bishkek', district: 'asanbay', coordinates: { lat: 42.87, lng: 74.57 }, showExactAddress: false },
          basics: { areaSqm: 80, price: 1000, currency: 'KGS', rooms: '2' },
          conditionAndAmenities: { condition: 'good', furnished: true },
          content: { title: 'X', description: 'Y', language: 'en' },
          terms: { negotiable: true, prepaymentMonths: 1, minTerm: '1_month' },
        } as any;
        const { getByTestId, getByText } = render(
          <ContextualListingFlow
            mode="edit-mod"
            initialListing={initialListing}
            moderatorContext={{ editingOwnerUid: 'owner-uid' }}
            onClose={jest.fn()}
          />
        );
        // Advance to Step 6 by clicking Next 5 times (initialListing has all valid Step 1-5 data)
        for (let i = 0; i < 5; i++) fireEvent.press(getByTestId('contextual-listing-next'));
        // Wait for Step 6 to render then assert label
        await waitFor(() => expect(getByText('contextualListing.submit.modEdit')).toBeTruthy());
      });
    });
    ```

    Note on Step 2 mock for the integration test: the mock MapView component receives onPress as a passthrough prop; the test fires a `press` event with the right `nativeEvent.coordinate` shape to exercise `handleMapPress` in Step2Location.

    INT-3 may need adjustment if rendering Step 6 takes additional waits — adjust the awaits in execution if needed.
  </action>
  <verify>
    <automated>npx jest src/components/ContextualListingFlow/__tests__/integration.test.tsx src/components/ContextualListingFlow/__tests__/validators.test.ts -x</automated>
  </verify>
  <done>
    - 6 new validator cases (V15-V20) pass.
    - 3 integration cases (INT-1, INT-2, INT-3) pass.
    - All Plans 02-02..02-04b tests still green.
  </done>
  <acceptance_criteria>
    - `grep -c "describe.*Step 6 (Plan 02-04b)" src/components/ContextualListingFlow/__tests__/validators.test.ts` returns 1.
    - `grep -c "test\\(" src/components/ContextualListingFlow/__tests__/integration.test.tsx` returns at least 3.
    - `grep -c "PropertyService.createProperty.*toHaveBeenCalled" src/components/ContextualListingFlow/__tests__/integration.test.tsx` returns at least 1.
    - `grep -c "mod-context-banner" src/components/ContextualListingFlow/__tests__/integration.test.tsx` returns at least 1 (FLOW-15 cell).
    - `grep -c "contextualListing.submit.modEdit" src/components/ContextualListingFlow/__tests__/integration.test.tsx` returns at least 1.
    - `npx jest src/components/ContextualListingFlow/__tests__ -x` exits 0.
  </acceptance_criteria>
</task>

<task type="auto">
  <name>Task 4: Add 17 Step 6 i18n keys to BOTH en.ts AND ru.ts</name>
  <files>
    - src/locales/en.ts (MODIFIED)
    - src/locales/ru.ts (MODIFIED)
  </files>
  <read_first>
    - .planning/phases/02-6-step-contextual-listing-flow-client/02-RESEARCH.md §"Step 6 (17)" (lines 1219-1240 — verbatim source)
  </read_first>
  <action>
    Append all 17 Step 6 keys (verbatim from RESEARCH §"Step 6 (17)") to BOTH `src/locales/en.ts` AND `src/locales/ru.ts` in a SINGLE diff.

    Keys (18 — RESEARCH counted 17; planner ships 18 per B-03 reconciliation: `contextualListing.step6.prepayment.custom` chip label was missing in RESEARCH's count):
    ```
    contextualListing.step6.title
    contextualListing.step6.negotiableLabel
    contextualListing.step6.negotiableRequired
    contextualListing.step6.negotiable.yes
    contextualListing.step6.negotiable.no
    contextualListing.step6.depositLabel
    contextualListing.step6.depositPlaceholder
    contextualListing.step6.prepaymentLabel
    contextualListing.step6.prepaymentRequired
    contextualListing.step6.prepayment.0
    contextualListing.step6.prepayment.1
    contextualListing.step6.prepayment.2
    contextualListing.step6.prepayment.custom
    contextualListing.step6.prepayment.customPlaceholder
    contextualListing.step6.minTermLabel
    contextualListing.step6.minTermRequired
    contextualListing.step6.minTerm.1_month
    contextualListing.step6.minTerm.3_months
    ```
    **B-03 RECONCILIATION (per checker, planner-revision iteration 1):** RESEARCH §Total Count line says 17; the canonical key list above ships 18 (delta = +1). The 18th key is `contextualListing.step6.prepayment.custom` — the chip label for the Custom prepayment chip (per CONTEXT specifics §"Step 6 prepayment custom integer" + Pitfall 6). RESEARCH's count missed this label when tallying. Cumulative count remains within RESEARCH's 80–120 range: Plan 02-04a shipped −1 (B-02) and this plan ships +1 (B-03), net 0; 107 keys total. SUMMARY.md MUST document this +1 delta and the rationale.

    EN+RU values: copy from RESEARCH §"Step 6 (17)" lines 1221-1239 verbatim.

    Cumulative running total after this plan: 90 (after 02-04a) + 18 (this) = 108 keys × 2 = 216 entries — within RESEARCH's 107-key estimate (one off; mod-queue tabs were absorbed into Plan 02-02).
  </action>
  <verify>
    <automated>cd /Users/beckmaldinVL/development/mobileApps/JayTap && bash scripts/check-i18n-parity.sh</automated>
  </verify>
  <done>
    - All 18 Step 6 keys present in BOTH files.
    - i18n parity gate green.
  </done>
  <acceptance_criteria>
    - `grep -c "contextualListing.step6.negotiableLabel\\|contextualListing.step6.depositLabel\\|contextualListing.step6.prepaymentLabel\\|contextualListing.step6.minTermLabel" src/locales/en.ts` returns at least 4.
    - `grep -c "contextualListing.step6.prepayment.custom\\|contextualListing.step6.prepayment.customPlaceholder" src/locales/en.ts` returns at least 2.
    - `grep -c "contextualListing.step6.minTerm.1_month\\|contextualListing.step6.minTerm.3_months" src/locales/en.ts` returns at least 2.
    - Same grep counts for ru.ts.
    - `bash scripts/check-i18n-parity.sh` exits 0.
  </acceptance_criteria>
</task>

</tasks>

<threat_model>None — pure RN client UI scaffolding + submit dispatch using existing PropertyService methods (no new HTTP endpoints introduced). M2 D-22 backend sanitizer continues to strip client-sent `status`; client never sends `status` field per Task 2 implementation. Plan 02-01's `<threat_model>` covers backend Location surface; this plan only consumes existing PropertyService routes (Phase 1 baseline).</threat_model>

<verification>
- `npx jest src/components/ContextualListingFlow/__tests__ -x` — all test files green: validators ≥ 26 cases (Steps 1+2+3+4+5+6), adapters ≥ 7, Step1+2+3+4+5+6 ≥ 8 each, integration ≥ 3.
- `bash scripts/check-i18n-parity.sh` exits 0.
- Manual sanity check: orchestrator's `console.log('[ContextualListingFlow] submit payload:', ...)` removed (Task 2 acceptance criteria covers).
- The flow can be mounted standalone in a test harness and submit a real listing payload to the backend (App.tsx wire-through is Plan 02-07).
</verification>

<success_criteria>
- 9 must_haves truths observable.
- FLOW-11, FLOW-12, FLOW-13, FLOW-15 satisfied at code level (Phase 5 owns full device QA matrix per D-04).
- The user-facing flow surface is now COMPLETE; subsequent plans (02-05/02-06 read-paths in parallel waves) handle the M2 client read screens; 02-07 wires the flow into App.tsx; 02-08 is dry-run; 02-09 is atomic deletion.
- Pitfall 6 mitigation in place (Custom-int seed-from-current).
</success_criteria>

<output>
.planning/phases/02-6-step-contextual-listing-flow-client/02-04b-SUMMARY.md captures:
- Test counts after this plan (validators ≥ 26 cases; integration ≥ 3 cases — total ≥ 80 in flow's __tests__ dir).
- Cumulative i18n key count: 108 keys × 2 languages = 216 entries (or 107 if reconciled with Plan 02-04a's −1; verify against parity gate output).
- **B-03 reconciliation (MANDATORY):** Step 6 ships 18 keys (RESEARCH's first count was 17). The +1 delta is `contextualListing.step6.prepayment.custom` — the Custom chip label per CONTEXT specifics §"Step 6 prepayment custom integer" + Pitfall 6. RESEARCH miscounted by 1; planner caught it during scaffold authoring. Cumulative running count: 02-02 (23) + 02-03 (49) + 02-04a (11; B-02 −1) + this (18; B-03 +1) = 101 keys within the flow's `contextualListing.*` namespace. Add ~6 outside-namespace keys (mod-queue Locations tab in 02-02; banner key reuse in 02-04b) → 107 total within RESEARCH's 80–120 range.
- Verified PropertyService method signatures (createProperty / updateProperty / editAsModerator) — note exact return shape for use by Plan 02-07's App.tsx wire-through.
- Note for Plan 02-07: orchestrator's onClose + onSuccess shape verified; App.tsx will pass these to refresh RenterListings + ModerationQueue per D-17.
</output>

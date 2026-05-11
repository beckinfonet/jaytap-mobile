---
phase: 02-6-step-contextual-listing-flow-client
plan: 04a
type: execute
wave: 3
depends_on: ["02-03"]
files_modified:
  - src/components/ContextualListingFlow/Step4ConditionAmenities.tsx
  - src/components/ContextualListingFlow/Step5TitleDescription.tsx
  - src/components/ContextualListingFlow/index.tsx
  - src/components/ContextualListingFlow/__tests__/Step4.test.tsx
  - src/components/ContextualListingFlow/__tests__/Step5.test.tsx
  - src/components/ContextualListingFlow/__tests__/validators.test.ts
  - src/locales/en.ts
  - src/locales/ru.ts
autonomous: true
requirements: [FLOW-09, FLOW-10]

must_haves:
  truths:
    - "Step 4 renders condition chips (rough/whitebox/good/euro) + furnished tri-state (Yes/No/null) — required even for hotel/hostel per FLOW-09 + SPEC §Decisions Log #4."
    - "Step 5 renders title (single-line TextInput) + description (multiline TextInput) — both required per FLOW-10."
    - "Step 5 inherits keyboard avoidance from KeyboardProvider at App.tsx root (no new keyboard work — confirmed in 02-RESEARCH §Reusable Assets)."
    - "validateStep(4, ...) cases pass: condition required + furnished required (null counts as missing)."
    - "validateStep(5, ...) cases pass: title.trim() and description.trim() required."
    - "Orchestrator wires Step4 + Step5 into the stepBody switch (replacing Plan 02-02 placeholders for cases 4 + 5)."
    - "+~18 i18n keys (Step 4: 11 + Step 5: 7) added to BOTH en.ts AND ru.ts; parity gate exits 0."
  artifacts:
    - path: "src/components/ContextualListingFlow/Step4ConditionAmenities.tsx"
      provides: "Step 4 component — condition chip row + furnished Yes/No tri-state chips"
    - path: "src/components/ContextualListingFlow/Step5TitleDescription.tsx"
      provides: "Step 5 component — title TextInput + description multiline TextInput"
    - path: "src/components/ContextualListingFlow/__tests__/Step4.test.tsx"
      provides: "RTL component smoke for Step 4 — condition chip taps + furnished tri-state behavior + error rendering"
    - path: "src/components/ContextualListingFlow/__tests__/Step5.test.tsx"
      provides: "RTL component smoke for Step 5 — title + description TextInput + error rendering"
  key_links:
    - from: "Step4ConditionAmenities.tsx"
      to: "useTheme + useLanguage"
      via: "import"
      pattern: "useTheme\\(\\)|useLanguage\\(\\)"
    - from: "Step5TitleDescription.tsx"
      to: "title + description fields under values.content sub-tree"
      via: "onChange('content', { ...values.content, title: v })"
      pattern: "onChange\\('content'"
    - from: "src/components/ContextualListingFlow/index.tsx (modified)"
      to: "Step4ConditionAmenities + Step5TitleDescription"
      via: "import + stepBody switch case 4/5"
      pattern: "Step4ConditionAmenities|Step5TitleDescription"
---

<objective>
Build Step 4 (Condition + Furnished tri-state) and Step 5 (Title + Description text inputs) component trees. Append Step 4/5 cases to validators.test.ts (~5 new cases). Wire both steps into the orchestrator stepBody switch (replacing the placeholders Plan 02-02 left). Add ~18 i18n keys to EN+RU.

Per CONTEXT.md FLOW-09 + SPEC §Decisions Log #4: condition + furnished are REQUIRED for every propertyType including hotel/hostel (supports rural / ethno properties). No conditional branching by propertyType in Step 4.

Per CONTEXT.md FLOW-10: title + description are required strings. Multiline description input via the same KeyboardAware infrastructure already at App.tsx root (no new keyboard work — CONTEXT §<code_context>).

This is a small plan (the densest UX surfaces are owned by 02-03 and 02-04b); ships fast to keep validators.ts coverage growing in step.
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
@.planning/phases/02-6-step-contextual-listing-flow-client/02-03-SUMMARY.md
@src/components/ContextualListingFlow/index.tsx
@src/components/ContextualListingFlow/types.ts
@src/components/ContextualListingFlow/validators.ts
@src/components/ContextualListingFlow/styles.ts
@src/components/ContextualListingFlow/Step1DealAndPropertyType.tsx
@src/components/CreateListingForm/HospitalitySection.tsx
@src/components/CreateListingForm/BasicInfoSection.tsx
@src/locales/en.ts
@src/locales/ru.ts

<interfaces>
<!-- FormBag sub-trees consumed by Step 4 + Step 5 (verbatim from types.ts shipped in Plan 02-02). -->

values.conditionAndAmenities: {
  condition: 'rough' | 'whitebox' | 'good' | 'euro' | '';
  furnished: boolean | null; // tri-state — null means unset; required to advance
};

values.content: {
  title: string;
  description: string;
  language: 'ru' | 'en';
};

<!-- validators.ts already implements Steps 4 + 5 logic per Plan 02-02 Task 2 (validateStep was shipped with full Step 1-6 branches; only TESTS needed adding incrementally). This plan adds tests only — no validators.ts code change. -->
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Create Step4ConditionAmenities.tsx + Step4.test.tsx</name>
  <files>
    - src/components/ContextualListingFlow/Step4ConditionAmenities.tsx (NEW)
    - src/components/ContextualListingFlow/__tests__/Step4.test.tsx (NEW — Wave 0)
  </files>
  <read_first>
    - src/components/CreateListingForm/HospitalitySection.tsx (chip + tri-state pattern per PATTERNS.md row 20)
    - src/components/HospitalitySection.tsx (W-07 FIX, per planner-revision iteration 1: top-level read-path Hospitality component — verify whether the analog tri-state in the form's HospitalitySection actually uses `boolean | null` semantics OR a different shape such as enum/discriminator. If it uses a different shape, mention the deviation in the action body and either (a) keep the `boolean | null` shape per CONTEXT D-04 + ROADMAP SC validator semantics, OR (b) align with whatever the analog uses. Recommend (a) — the validator + Step4 RTL test both encode `boolean | null` per Plan 02-02 Task 2's validateStep(4) implementation; deviating means changing the validator. The executor MUST confirm pattern shape before transplanting.)
    - src/components/ContextualListingFlow/Step1DealAndPropertyType.tsx (Plan 02-02 — chip-row pattern source for this plan; copy the chip render shape)
    - src/components/ContextualListingFlow/styles.ts (commonStyles tokens)
  </read_first>
  <behavior>
    Wave 0 RTL test cases for Step4.test.tsx:
    - Test 1: Renders 4 condition chips with values rough/whitebox/good/euro.
    - Test 2: Renders 2 furnished chips (Yes / No) — both selectable; default state shows neither active.
    - Test 3: Tapping a condition chip dispatches `onChange('conditionAndAmenities', { ...values.conditionAndAmenities, condition: 'good' })`.
    - Test 4: Tapping furnished='Yes' dispatches `onChange('conditionAndAmenities', { ...values.conditionAndAmenities, furnished: true })`.
    - Test 5: Tapping furnished='No' dispatches `furnished: false` (NOT null — null means unset).
    - Test 6: Re-tapping the active condition chip leaves it active (no toggle-off — picking is required to advance).
    - Test 7: When `errors['conditionAndAmenities.condition']` set, renders error text from translation key.
    - Test 8: When `errors['conditionAndAmenities.furnished']` set, renders error text.
  </behavior>
  <action>
    Create `src/components/ContextualListingFlow/Step4ConditionAmenities.tsx`:

    ```typescript
    /**
     * Phase 2 Step 4 — Condition + Furnished (FLOW-09).
     * Required even for hotel/hostel per SPEC §Decisions Log #4 (rural/ethno properties).
     * Mirrors M1 P4 HospitalitySection.tsx chip + tri-state pattern.
     */

    import React from 'react';
    import { View, Text, TouchableOpacity } from 'react-native';
    import { useTheme } from '../../providers/ThemeProvider';
    import { useLanguage } from '../../providers/LanguageProvider';
    import { commonStyles } from './styles';
    import type { SectionProps, FormBag } from './types';

    const CONDITIONS: Array<NonNullable<FormBag['conditionAndAmenities']['condition']>> = ['rough', 'whitebox', 'good', 'euro'];

    export function Step4ConditionAmenities({ values, onChange, errors }: SectionProps) {
      const { colors, isDark } = useTheme();
      const { t } = useLanguage();

      const setCA = (patch: Partial<FormBag['conditionAndAmenities']>) =>
        onChange('conditionAndAmenities', { ...values.conditionAndAmenities, ...patch });

      return (
        <View>
          <Text style={[commonStyles.sectionTitle, { color: colors.text }]}>{t('contextualListing.step4.title')}</Text>

          <View style={commonStyles.section}>
            <Text style={[commonStyles.sectionLabel, { color: colors.text }]}>{t('contextualListing.step4.conditionLabel')}</Text>
            <View style={commonStyles.chipRow}>
              {CONDITIONS.map((c) => {
                const isActive = values.conditionAndAmenities.condition === c;
                return (
                  <TouchableOpacity
                    key={c}
                    testID={`condition-chip-${c}`}
                    style={[commonStyles.chip, {
                      backgroundColor: isActive ? colors.primary : (isDark ? '#2C2C2E' : '#F2F2F7'),
                      borderColor: isDark ? '#3A3A3C' : '#E5E5EA',
                    }]}
                    onPress={() => setCA({ condition: c })}
                  >
                    <Text style={[commonStyles.chipText, { color: isActive ? '#FFF' : colors.text }]}>
                      {t(`contextualListing.step4.condition.${c}`)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {errors['conditionAndAmenities.condition'] ? (
              <Text testID="condition-error" style={[commonStyles.errorText, { color: colors.error ?? '#FF3B30' }]}>
                {t(errors['conditionAndAmenities.condition'])}
              </Text>
            ) : null}
          </View>

          <View style={commonStyles.section}>
            <Text style={[commonStyles.sectionLabel, { color: colors.text }]}>{t('contextualListing.step4.furnishedLabel')}</Text>
            <View style={commonStyles.chipRow}>
              {[
                { value: true,  key: 'yes' },
                { value: false, key: 'no'  },
              ].map((f) => {
                const isActive = values.conditionAndAmenities.furnished === f.value;
                return (
                  <TouchableOpacity
                    key={f.key}
                    testID={`furnished-chip-${f.key}`}
                    style={[commonStyles.chip, {
                      backgroundColor: isActive ? colors.primary : (isDark ? '#2C2C2E' : '#F2F2F7'),
                      borderColor: isDark ? '#3A3A3C' : '#E5E5EA',
                    }]}
                    onPress={() => setCA({ furnished: f.value })}
                  >
                    <Text style={[commonStyles.chipText, { color: isActive ? '#FFF' : colors.text }]}>
                      {t(`contextualListing.step4.furnished.${f.key}`)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {errors['conditionAndAmenities.furnished'] ? (
              <Text testID="furnished-error" style={[commonStyles.errorText, { color: colors.error ?? '#FF3B30' }]}>
                {t(errors['conditionAndAmenities.furnished'])}
              </Text>
            ) : null}
          </View>
        </View>
      );
    }
    ```

    Then create `__tests__/Step4.test.tsx` covering the 8 cases above. Mock `ThemeProvider` and `LanguageProvider` minimally (lift mock pattern from Step1.test.tsx). Use the same render-with-overrides helper pattern.
  </action>
  <verify>
    <automated>cd /Users/beckmaldinVL/development/mobileApps/JayTap && npx jest src/components/ContextualListingFlow/__tests__/Step4.test.tsx -x</automated>
  </verify>
  <done>
    - Step4 renders 4 condition + 2 furnished chips.
    - Tapping a chip dispatches onChange to the conditionAndAmenities sub-tree.
    - 8 RTL tests pass.
  </done>
  <acceptance_criteria>
    - `grep -c "CONDITIONS.*=.*\\['rough', 'whitebox', 'good', 'euro'\\]" src/components/ContextualListingFlow/Step4ConditionAmenities.tsx` returns 1.
    - `grep -c "furnished: true\\|furnished: false" src/components/ContextualListingFlow/Step4ConditionAmenities.tsx` returns at least 2 (Yes/No values present).
    - `grep -c "test(" src/components/ContextualListingFlow/__tests__/Step4.test.tsx` returns at least 8.
    - `npx jest src/components/ContextualListingFlow/__tests__/Step4.test.tsx -x` exits 0.
  </acceptance_criteria>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Create Step5TitleDescription.tsx + Step5.test.tsx</name>
  <files>
    - src/components/ContextualListingFlow/Step5TitleDescription.tsx (NEW)
    - src/components/ContextualListingFlow/__tests__/Step5.test.tsx (NEW — Wave 0)
  </files>
  <read_first>
    - src/components/CreateListingForm/BasicInfoSection.tsx (lines 45-60 — TextInput pattern source per PATTERNS.md row 21)
    - src/components/ContextualListingFlow/styles.ts (commonStyles.input + commonStyles.inputMultiline)
  </read_first>
  <behavior>
    Wave 0 RTL test cases for Step5.test.tsx:
    - Test 1: Renders title TextInput with placeholder `t('contextualListing.step5.titlePlaceholder')`.
    - Test 2: Renders description multiline TextInput with placeholder `t('contextualListing.step5.descriptionPlaceholder')`.
    - Test 3: title onChangeText dispatches `onChange('content', { ...values.content, title: v })`.
    - Test 4: description onChangeText dispatches `onChange('content', { ...values.content, description: v })`.
    - Test 5: errors['content.title'] renders error text below title input.
    - Test 6: errors['content.description'] renders error text below description input.
    - Test 7: description input has `multiline` prop true (verify via instance.props or rendered behavior).
  </behavior>
  <action>
    Create `src/components/ContextualListingFlow/Step5TitleDescription.tsx`:

    ```typescript
    /**
     * Phase 2 Step 5 — Title + Description (FLOW-10).
     * SPEC §Step 5 explicit: "Photos, videos, and 3D tours are not part of this step" — Phase 3 owns media.
     * Inherits keyboard avoidance from KeyboardProvider at App.tsx root (no new keyboard work).
     */

    import React from 'react';
    import { View, Text, TextInput } from 'react-native';
    import { useTheme } from '../../providers/ThemeProvider';
    import { useLanguage } from '../../providers/LanguageProvider';
    import { commonStyles } from './styles';
    import type { SectionProps } from './types';

    export function Step5TitleDescription({ values, onChange, errors }: SectionProps) {
      const { colors } = useTheme();
      const { t } = useLanguage();

      return (
        <View>
          <Text style={[commonStyles.sectionTitle, { color: colors.text }]}>{t('contextualListing.step5.title')}</Text>

          <View style={commonStyles.section}>
            <Text style={[commonStyles.sectionLabel, { color: colors.text }]}>{t('contextualListing.step5.titleLabel')}</Text>
            <TextInput
              testID="content-title"
              value={values.content.title}
              onChangeText={(v) => onChange('content', { ...values.content, title: v })}
              placeholder={t('contextualListing.step5.titlePlaceholder')}
              placeholderTextColor={(colors as any).textSecondary ?? colors.text}
              style={[commonStyles.input, { color: colors.text, borderColor: colors.border ?? '#E5E5EA' }]}
              maxLength={120}
            />
            {errors['content.title'] ? (
              <Text testID="content-title-error" style={[commonStyles.errorText, { color: colors.error ?? '#FF3B30' }]}>
                {t(errors['content.title'])}
              </Text>
            ) : null}
          </View>

          <View style={commonStyles.section}>
            <Text style={[commonStyles.sectionLabel, { color: colors.text }]}>{t('contextualListing.step5.descriptionLabel')}</Text>
            <TextInput
              testID="content-description"
              value={values.content.description}
              onChangeText={(v) => onChange('content', { ...values.content, description: v })}
              placeholder={t('contextualListing.step5.descriptionPlaceholder')}
              placeholderTextColor={(colors as any).textSecondary ?? colors.text}
              multiline
              numberOfLines={6}
              style={[commonStyles.inputMultiline, { color: colors.text, borderColor: colors.border ?? '#E5E5EA' }]}
              maxLength={2000}
            />
            {errors['content.description'] ? (
              <Text testID="content-description-error" style={[commonStyles.errorText, { color: colors.error ?? '#FF3B30' }]}>
                {t(errors['content.description'])}
              </Text>
            ) : null}
          </View>
        </View>
      );
    }
    ```

    Test file (`__tests__/Step5.test.tsx`) — same mock pattern as Step1/Step4 tests. Implement the 7 cases.

    Note on the multiline assertion: in @testing-library/react-native, `getByTestId('content-description').props.multiline === true` is the easiest assertion.
  </action>
  <verify>
    <automated>cd /Users/beckmaldinVL/development/mobileApps/JayTap && npx jest src/components/ContextualListingFlow/__tests__/Step5.test.tsx -x</automated>
  </verify>
  <done>
    - Step5 renders title + description TextInputs.
    - description has multiline prop.
    - 7 RTL tests pass.
  </done>
  <acceptance_criteria>
    - `grep -c "multiline" src/components/ContextualListingFlow/Step5TitleDescription.tsx` returns at least 1.
    - `grep -c "onChange\\('content'" src/components/ContextualListingFlow/Step5TitleDescription.tsx` returns at least 2 (title + description handlers).
    - `grep -c "test(" src/components/ContextualListingFlow/__tests__/Step5.test.tsx` returns at least 7.
    - `npx jest src/components/ContextualListingFlow/__tests__/Step5.test.tsx -x` exits 0.
  </acceptance_criteria>
</task>

<task type="auto">
  <name>Task 3: Wire Step4 + Step5 into orchestrator stepBody switch + append validator tests</name>
  <files>
    - src/components/ContextualListingFlow/index.tsx (MODIFIED — replace case 4 + case 5 placeholders)
    - src/components/ContextualListingFlow/__tests__/validators.test.ts (MODIFIED — append Step 4 + 5 cases)
  </files>
  <read_first>
    - src/components/ContextualListingFlow/index.tsx (current state from Plan 02-03 — Step1/2/3 wired, Step4/5/6 still placeholders)
    - src/components/ContextualListingFlow/validators.ts (Plan 02-02 already implements Step 4 + 5 logic; this task adds TESTS only)
  </read_first>
  <behavior>
    validator test cases to APPEND:
    - Test V8: validateStep(4, emptyFormBag()) → errors keys = ['conditionAndAmenities.condition', 'conditionAndAmenities.furnished'].
    - Test V9: validateStep(4, condition='good', furnished=null) → errors['conditionAndAmenities.furnished'] still set (null counts as missing).
    - Test V10: validateStep(4, condition='good', furnished=true) → isValid=true.
    - Test V11: validateStep(4, condition='good', furnished=false) → isValid=true (false IS a valid choice; only null is missing).
    - Test V12: validateStep(5, emptyFormBag()) → errors keys = ['content.title', 'content.description'].
    - Test V13: validateStep(5, content.title='   ' with whitespace, content.description='X') → errors['content.title'] still set (whitespace-only fails .trim() check).
    - Test V14: validateStep(5, content.title='X', content.description='Y') → isValid=true.
  </behavior>
  <action>
    Step 1 — Modify `src/components/ContextualListingFlow/index.tsx`:
    a) Add imports near the top:
       ```typescript
       import { Step4ConditionAmenities } from './Step4ConditionAmenities';
       import { Step5TitleDescription } from './Step5TitleDescription';
       ```
    b) In the `stepBody` useMemo switch, replace case 4 + case 5 placeholder Text components:
       ```typescript
       case 4: return <Step4ConditionAmenities values={values} onChange={onChange} errors={errors} />;
       case 5: return <Step5TitleDescription values={values} onChange={onChange} errors={errors} />;
       ```
       (case 6 stays as placeholder until Plan 02-04b)

    Step 2 — Append a `describe('Phase 2 validators — Step 4 (Plan 02-04a)', ...)` and `describe('Phase 2 validators — Step 5 (Plan 02-04a)', ...)` block to `src/components/ContextualListingFlow/__tests__/validators.test.ts` with cases V8-V14.

    Sample structure:
    ```typescript
    describe('Phase 2 validators — Step 4 (Plan 02-04a)', () => {
      test('emptyFormBag → 2 errors (condition, furnished)', () => {
        const r = validateStep(4, emptyFormBag());
        expect(r.isValid).toBe(false);
        expect(r.errors['conditionAndAmenities.condition']).toBe('contextualListing.step4.conditionRequired');
        expect(r.errors['conditionAndAmenities.furnished']).toBe('contextualListing.step4.furnishedRequired');
      });

      test('condition set + furnished null → still error on furnished (null = missing)', () => {
        const bag = { ...emptyFormBag(), conditionAndAmenities: { condition: 'good' as const, furnished: null } };
        const r = validateStep(4, bag);
        expect(r.errors['conditionAndAmenities.furnished']).toBeDefined();
        expect(r.errors['conditionAndAmenities.condition']).toBeUndefined();
      });

      test('condition + furnished=true → isValid', () => {
        const bag = { ...emptyFormBag(), conditionAndAmenities: { condition: 'good' as const, furnished: true } };
        expect(validateStep(4, bag).isValid).toBe(true);
      });

      test('condition + furnished=false → isValid (false is valid; only null missing)', () => {
        const bag = { ...emptyFormBag(), conditionAndAmenities: { condition: 'good' as const, furnished: false } };
        expect(validateStep(4, bag).isValid).toBe(true);
      });
    });

    describe('Phase 2 validators — Step 5 (Plan 02-04a)', () => {
      test('emptyFormBag → 2 errors (title, description)', () => {
        const r = validateStep(5, emptyFormBag());
        expect(r.errors['content.title']).toBe('contextualListing.step5.titleRequired');
        expect(r.errors['content.description']).toBe('contextualListing.step5.descriptionRequired');
      });

      test('whitespace-only title fails .trim() check', () => {
        const bag = { ...emptyFormBag(), content: { title: '   ', description: 'X', language: 'en' as const } };
        expect(validateStep(5, bag).errors['content.title']).toBeDefined();
      });

      test('title + description set → isValid', () => {
        const bag = { ...emptyFormBag(), content: { title: 'X', description: 'Y', language: 'en' as const } };
        expect(validateStep(5, bag).isValid).toBe(true);
      });
    });
    ```
  </action>
  <verify>
    <automated>cd /Users/beckmaldinVL/development/mobileApps/JayTap && npx jest src/components/ContextualListingFlow/__tests__/validators.test.ts src/components/ContextualListingFlow/__tests__/Step4.test.tsx src/components/ContextualListingFlow/__tests__/Step5.test.tsx -x</automated>
  </verify>
  <done>
    - index.tsx case 4 + case 5 render real Step4/Step5 components.
    - validators.test.ts has 7 new cases (V8-V14) — all pass.
    - Step4 + Step5 RTL tests still pass.
  </done>
  <acceptance_criteria>
    - `grep -c "Step4ConditionAmenities\\|Step5TitleDescription" src/components/ContextualListingFlow/index.tsx` returns at least 4 (2 imports + 2 case branches).
    - `grep -c "Step 4 — coming in Plan 02-04a\\|Step 5 — coming in Plan 02-04a" src/components/ContextualListingFlow/index.tsx` returns 0 (placeholders removed).
    - `grep -c "Step 4 (Plan 02-04a)\\|Step 5 (Plan 02-04a)" src/components/ContextualListingFlow/__tests__/validators.test.ts` returns at least 2 (new describe blocks).
    - `npx jest src/components/ContextualListingFlow/__tests__ -x` exits 0 — full flow's __tests__ green.
  </acceptance_criteria>
</task>

<task type="auto">
  <name>Task 4: Add ~18 i18n keys (Step 4: 11 + Step 5: 7) to BOTH en.ts AND ru.ts</name>
  <files>
    - src/locales/en.ts (MODIFIED)
    - src/locales/ru.ts (MODIFIED)
  </files>
  <read_first>
    - .planning/phases/02-6-step-contextual-listing-flow-client/02-RESEARCH.md §"Step 4 (12)" (lines 1192-1206; the table shows 11 keys in practice — 1 minor discrepancy with the §Total Count line — use 11 keys) AND §"Step 5 (7)" (lines 1209-1217)
  </read_first>
  <action>
    Append all keys from RESEARCH.md §"Step 4 (12)" and §"Step 5 (7)" sections to BOTH `src/locales/en.ts` AND `src/locales/ru.ts` in a SINGLE diff.

    Step 4 keys (11 — see B-02 reconciliation note below). RESEARCH wrote both "12" and "11" inconsistently. The canonical list has 11 items: title, conditionLabel, conditionRequired, condition.rough, condition.whitebox, condition.good, condition.euro, furnishedLabel, furnishedRequired, furnished.yes, furnished.no.

    **B-02 RECONCILIATION (per checker, planner-revision iteration 1):** RESEARCH §Step 4 first count was 12; canonical key list shipped is 11 (delta = −1). The 12th key would have been a label for the "unset" furnished state (e.g., `contextualListing.step4.furnished.unset`). Per CONTEXT D-04, the validator treats `furnished: null` as missing/unset; UI does NOT render an "unset" chip — both Yes and No render as inactive when `furnished === null` (no displayable copy needed). Therefore, no 12th key is required. SUMMARY.md MUST document this −1 delta. Cumulative count remains within RESEARCH's 80–120 range when paired with Plan 02-04b's +1 delta (B-03 cancels B-02; net 0; 107 keys total).

    11 keys:
    ```
    contextualListing.step4.title
    contextualListing.step4.conditionLabel
    contextualListing.step4.conditionRequired
    contextualListing.step4.condition.rough
    contextualListing.step4.condition.whitebox
    contextualListing.step4.condition.good
    contextualListing.step4.condition.euro
    contextualListing.step4.furnishedLabel
    contextualListing.step4.furnishedRequired
    contextualListing.step4.furnished.yes
    contextualListing.step4.furnished.no
    ```

    Step 5 keys (7) — verbatim from RESEARCH §"Step 5 (7)":
    ```
    contextualListing.step5.title
    contextualListing.step5.titleLabel
    contextualListing.step5.titleRequired
    contextualListing.step5.titlePlaceholder
    contextualListing.step5.descriptionLabel
    contextualListing.step5.descriptionRequired
    contextualListing.step5.descriptionPlaceholder
    ```

    EN+RU values: copy from RESEARCH §"Step 4 (12)" lines 1194-1205 + §"Step 5 (7)" lines 1211-1216 verbatim.

    Total this plan: 18 keys × 2 = 36 entries. Cumulative running total after this plan: 23 (02-02) + 49 (02-03) + 18 (this) = 90 keys × 2 = 180 entries.
  </action>
  <verify>
    <automated>cd /Users/beckmaldinVL/development/mobileApps/JayTap && bash scripts/check-i18n-parity.sh</automated>
  </verify>
  <done>
    - All 18 keys present in BOTH files.
    - i18n parity gate green.
  </done>
  <acceptance_criteria>
    - `grep -c "contextualListing.step4.condition.rough\\|contextualListing.step4.condition.whitebox\\|contextualListing.step4.condition.good\\|contextualListing.step4.condition.euro" src/locales/en.ts` returns at least 4 (all 4 condition chips).
    - `grep -c "contextualListing.step4.furnished.yes\\|contextualListing.step4.furnished.no" src/locales/en.ts` returns at least 2.
    - `grep -c "contextualListing.step5.titlePlaceholder\\|contextualListing.step5.descriptionPlaceholder" src/locales/en.ts` returns at least 2.
    - Same grep counts for ru.ts.
    - `bash scripts/check-i18n-parity.sh` exits 0.
  </acceptance_criteria>
</task>

</tasks>

<threat_model>None — pure RN client UI scaffolding with no auth-adjacent surface.</threat_model>

<verification>
- `npx jest src/components/ContextualListingFlow/__tests__ -x` — all test files green (validators ≥ 20 cases now spanning Steps 1+2+3+4+5; adapters ≥ 7; Step1+2+3+4+5 ≥ 8 each).
- `bash scripts/check-i18n-parity.sh` exits 0.
</verification>

<success_criteria>
- 7 must_haves truths observable.
- FLOW-09, FLOW-10 satisfied at code level.
- Plan 02-04b has clean handoff: only Step 6 + integration test + Step 6 i18n keys remain to ship the user-facing flow surface.
</success_criteria>

<output>
.planning/phases/02-6-step-contextual-listing-flow-client/02-04a-SUMMARY.md captures:
- Test counts after this plan (validators ≥ 20 cases now).
- Cumulative i18n key count: 90 keys × 2 languages = 180 entries.
- **B-02 reconciliation (MANDATORY):** Step 4 ships 11 keys (RESEARCH's first count was 12). The −1 delta drops the would-be `contextualListing.step4.furnished.unset` label because the validator treats `furnished: null` as unset and the UI shows BOTH Yes and No as inactive in that state (no copy needed). This delta is offset by Plan 02-04b's +1 (B-03), keeping the cumulative count at 107 within RESEARCH's 80–120 range.
- Note for Plan 02-04b: stepBody case 6 still renders placeholder; Step6DealConditions.tsx + integration.test.tsx + 17 Step 6 keys remain.
</output>

---
phase: 05-listing-form-validation-edit-flow
plan: 04
type: execute
wave: 3
depends_on: [01, 02, 03]
files_modified:
  - src/screens/CreateListingScreen.tsx
autonomous: true
requirements: [FORM-04, FORM-06, FORM-07, FORM-08]
tags: [react-native, state-machine, validation, keyboard-controller, i18n]
must_haves:
  truths:
    - "handleSubmit replaces the 4 Alert.alert checks (lines 415-431) with a single validateByCategory call that populates setErrors and auto-scrolls to the first invalid field on failure"
    - "Submit payload is built exclusively through buildPayloadByCategory — the inline 30-line payload object at :451-481 is deleted"
    - "D-09 anchors (panoramicPhotosUrl + tours) are preserved in every payload via the shared block in buildPayloadByCategory — no regression in the Phase 4 D-09 grep invariant"
    - "errors state is threaded via useState<FormErrorBag>({}) to all 6 sub-components (BasicInfo, Residential, Commercial, Hospitality, Price, Media); VerificationSection unchanged"
    - "On keystroke, the onChange dispatcher clears errors[field] so users aren't nagged while typing (D-02)"
    - "Hospitality hybrid contact rule triggers an Alert.alert with a 'Complete profile' CTA that calls onNavigateToAccountSettings?.() — fails submit with an inline red error row above the read-only Contact Info block"
    - "D-16 Status toggle visibility: visible on create OR editing a draft; hidden only when editing a live listing"
    - "D-16 Submit label: uses createListing.publishListing when editing a draft and user has promoted status to 'live'"
    - "Currency state is useState<Currency | ''>('') — strictly typed per D-18"
  artifacts:
    - path: "src/screens/CreateListingScreen.tsx"
      provides: "orchestrator with validateByCategory + buildPayloadByCategory integration + errors state + scroll-to-error + D-11 Alert + D-16 status rules + onNavigateToAccountSettings prop"
      contains: "validateByCategory"
  key_links:
    - from: "src/screens/CreateListingScreen.tsx handleSubmit"
      to: "src/components/CreateListingForm/validators.ts"
      via: "import { validateByCategory, buildPayloadByCategory, FIELD_ORDER_BY_CATEGORY, type Currency }"
      pattern: "validateByCategory\\(values, category\\)"
    - from: "src/screens/CreateListingScreen.tsx"
      to: "react-native-keyboard-controller"
      via: "import type { KeyboardAwareScrollViewRef } + useRef<KeyboardAwareScrollViewRef>(null)"
      pattern: "scrollRef.current\\?.scrollTo"
    - from: "src/screens/CreateListingScreen.tsx Contact Info block"
      to: "Plan 03 i18n keys"
      via: "t('createListing.contactMissing*')"
      pattern: "contactMissingInline|contactMissingTitle|contactMissingMessage|contactMissingCta"
---

<objective>
Apply all 10 orchestrator edits (A–J from PATTERNS.md §12) to `src/screens/CreateListingScreen.tsx`:
- **A.** Tighten `currency` state type to `Currency | ''`
- **B.** Tighten onChange dispatcher currency case
- **C.** Add `errors` state + scroll-ref + fieldLayouts + clear-on-keystroke
- **D.** Replace 4 `Alert.alert` validation checks (lines 415-431) with `validateByCategory` + `setErrors` + scroll-to-first-error; add D-11 Hospitality contact Alert with "Complete profile" CTA
- **E.** Replace inline payload literal (lines 451-481) with `buildPayloadByCategory` + call-site merge for address/city/existingImages/platformVerifications
- **F.** Status toggle visibility rule per D-16 (line 701)
- **G.** Submit button label per D-16 (lines 754-761)
- **H.** Add `onNavigateToAccountSettings?: () => void` prop to CreateListingScreenProps
- **I.** Contact Info inline error row (D-11 / RESEARCH Pitfall 10)
- **J.** Thread `errors={errors}` + scroll ref + onLayout into the 6 sub-component render calls

Purpose: This is the single-file integration point where Plans 01 + 02 + 03 converge. After this plan, FORM-06 (single source of truth) is fully active, FORM-07 (category switch preservation) is verified by the unchanged conditional-mount structure, and FORM-04 required-field branching flows through the UI.

Output:
- `src/screens/CreateListingScreen.tsx` modified (~900 LOC target; current 871 per Phase 4 close-out — PATTERNS.md projects ~851 after refactor, but +scroll-ref + contact Alert + D-16 may push back near 900)
- tsc baseline preserved ≤ 16 lines
- D-09 anchor grep invariants preserved
- `./scripts/check-role-grep.sh` exits 0 (Phase 3 D-14 preserved)
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/STATE.md
@.planning/phases/05-listing-form-validation-edit-flow/05-CONTEXT.md
@.planning/phases/05-listing-form-validation-edit-flow/05-RESEARCH.md
@.planning/phases/05-listing-form-validation-edit-flow/05-PATTERNS.md
@.planning/phases/04-listing-form-taxonomy-decomposition/04-VERIFICATION.md
@src/screens/CreateListingScreen.tsx
@src/components/CreateListingForm/validators.ts
@src/components/CreateListingForm/types.ts
@src/components/CreateListingForm/index.ts

<interfaces>
New imports needed in CreateListingScreen.tsx (add alongside existing `from '../components/CreateListingForm'` block at lines 26-36):

```typescript
import React, { useState, useEffect, useCallback, useRef } from 'react';  // ← add useRef
import type { KeyboardAwareScrollViewRef } from 'react-native-keyboard-controller';  // ← new

import {
  BasicInfoSection,
  ResidentialSection,
  CommercialSection,
  HospitalitySection,
  MediaSection,
  PriceSection,
  VerificationSection,
  validateByCategory,                       // ← new (Plan 01)
  buildPayloadByCategory,                   // ← new (Plan 01)
  FIELD_ORDER_BY_CATEGORY,                  // ← new (Plan 01)
  type FormBag,
  type FormErrorBag,                        // ← new (already in types.ts, re-add explicitly)
  type SectionProps,
  type Currency,                            // ← new (Plan 01 / D-18)
} from '../components/CreateListingForm';

import type { TranslationKeys } from '../locales';  // ← new (for error-key casting in contact inline row)
```

From src/components/CreateListingForm/validators.ts (Plan 01):
```typescript
export function validateByCategory(values: FormBag, category: PropertyCategory): ValidateResult;
export function buildPayloadByCategory(values: FormBag, category: PropertyCategory): Partial<Property>;
export const FIELD_ORDER_BY_CATEGORY: Record<PropertyCategory, (keyof FormBag)[]>;
export type Currency = '$' | 'сом';
```

Current handleSubmit validation block (lines 415-431 — DELETE):
```typescript
if (!title.trim()) { Alert.alert(t('common.error'), t('createListing.titleRequired')); return; }
if (!address.trim()) { Alert.alert(t('common.error'), t('createListing.addressRequired')); return; }
if (!currency) { Alert.alert(t('common.error'), t('createListing.currencyRequired')); return; }
if (!price.trim()) { Alert.alert(t('common.error'), t('createListing.priceRequired')); return; }
```

Current payload literal (lines 451-481 — DELETE the body, replace per action below).

Current Status toggle guard (line 701): `{!isEditMode && (` → change to `{(!isEditMode || propertyToEdit?.status === 'draft') && (`

Current submit label (lines 754-761) — replace per D-16 per PATTERNS.md §12 Edit G.

Current sub-component render calls at lines 641-665 — each has `errors={{}}` to replace with `errors={errors}`.
</interfaces>

<research_evidence>
- CONTEXT.md D-01: inline error rendering pattern (Plan 02 already implemented in sub-components)
- CONTEXT.md D-02: clear-on-keystroke inside onChange memo — runs BEFORE the switch
- CONTEXT.md D-04: auto-scroll to first invalid field via KASV ref + onLayout y-offsets
- CONTEXT.md D-05: category switch preserves all FormBag values — handled implicitly by orchestrator useState persistence (no change needed)
- CONTEXT.md D-06: buildPayloadByCategory is the ONLY payload construction site (per Plan 01)
- CONTEXT.md D-09: Hospitality contact hybrid Alert with Complete profile CTA
- CONTEXT.md D-11: onNavigateToAccountSettings prop + optional chain call site
- CONTEXT.md D-16: Status toggle visibility + submit label variations
- CONTEXT.md D-18: Currency type tightening
- RESEARCH Finding #1: ref-based `scrollTo({y, animated})` via KASV ref (intersection with ScrollView) — NOT `findNodeHandle`, NOT `measureLayout`
- RESEARCH Finding #6: D-09 anchor preservation via buildPayloadByCategory `shared` block — orchestrator call-site just merges address/city/existingImages + role-gated platformVerifications
- RESEARCH Finding #8: onNavigateToAccountSettings optional with no-op fallback (ProfileScreen.onViewAccountSettings precedent)
- RESEARCH Finding #9: errors threading — 6 sub-components take errors, VerificationSection does NOT (uses Pick<SectionProps, 'values' | 'onChange'>)
- RESEARCH Finding #10: role-agnostic validator; platformVerifications stays in `...(can('editVerifications') ? ... : {})` at call-site
- RESEARCH Pitfall 3: stale onLayout y-offset after category switch — fallback to scrollTo({y:0}) if fieldLayouts[field] === undefined
- RESEARCH Pitfall 10: Contact inline error row lives in the orchestrator (Contact Info block is inline at :668-698), not a sub-component
- PATTERNS.md §12: exact 10 edits A-J with line numbers and code excerpts to transcribe
</research_evidence>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Imports + state additions + onChange clear-on-keystroke (Edits A, B, C + H)</name>
  <files>src/screens/CreateListingScreen.tsx</files>
  <read_first>
    - src/screens/CreateListingScreen.tsx (full — understand current state setup at :86-131 and onChange at :139-175)
    - .planning/phases/05-listing-form-validation-edit-flow/05-PATTERNS.md §12 Edits A, B, C, H
    - .planning/phases/05-listing-form-validation-edit-flow/05-CONTEXT.md D-02, D-11, D-18
    - .planning/phases/05-listing-form-validation-edit-flow/05-RESEARCH.md Finding #1 (scroll ref + fieldLayouts), Finding #5 (currency type), Finding #8 (prop optional)
    - src/screens/ProfileScreen.tsx (precedent for `onViewAccountSettings?: () => void` optional prop)
  </read_first>
  <action>
    Apply these 4 edits to `src/screens/CreateListingScreen.tsx`:

    **Edit A (currency state type tightening) — line 92:**
    Change from:
    ```typescript
    const [currency, setCurrency] = useState<string>(''); // User must select USD or сом
    ```
    To:
    ```typescript
    const [currency, setCurrency] = useState<Currency | ''>(''); // D-18: canonical Currency type ('$' | 'сом' | '')
    ```

    **Edit B (onChange dispatcher currency case) — line 147:**
    Change from:
    ```typescript
    case 'currency': setCurrency(value as string); break;
    ```
    To:
    ```typescript
    case 'currency': setCurrency(value as Currency | ''); break;
    ```

    **Edit C — imports, state, refs, clear-on-keystroke:**

    1. **Import additions at top of file (lines 1-36):**
       - Line 1: `import React, { useState, useEffect, useCallback, useRef } from 'react';` (add `useRef`)
       - Add after line 15 (the existing `from 'react-native-keyboard-controller'` line): `import type { KeyboardAwareScrollViewRef } from 'react-native-keyboard-controller';`
       - Extend the named import from `'../components/CreateListingForm'` (lines 26-36) to include:
         - `validateByCategory,`
         - `buildPayloadByCategory,`
         - `FIELD_ORDER_BY_CATEGORY,`
         - `type FormErrorBag,`
         - `type Currency,`
       - Add NEW import after the barrel import: `import type { TranslationKeys } from '../locales';`

    2. **State + ref additions immediately after line 131 (`const { can } = useRole();`):**
       ```typescript

       // Phase 5 — FORM-06 error state + D-04 scroll-to-first-error refs
       const [errors, setErrors] = useState<FormErrorBag>({});
       const scrollRef = useRef<KeyboardAwareScrollViewRef>(null);
       const fieldLayouts = useRef<Partial<Record<keyof FormBag, number>>>({});
       ```

    3. **Clear-on-keystroke — inject INTO the existing `onChange` useCallback body, IMMEDIATELY after the opening `{` on line 139 and BEFORE the `switch (field) {` on line 140:**
       ```typescript
         // D-02: clear field's error on next keystroke — user isn't nagged while typing
         setErrors((prev) => {
           if (prev[field]) {
             const next = { ...prev };
             delete next[field];
             return next;
           }
           return prev;
         });
       ```

       The `setErrors` call runs BEFORE `switch (field)` — order matters because the clear-check depends on the OLD value of the error bag. The existing `switch (field) { ... }` block stays unchanged below it.

    **Edit H (prop addition) — interface at lines 38-44:**
    Change from:
    ```typescript
    interface CreateListingScreenProps {
      onBack: () => void;
      onSuccess: () => void;
      propertyToEdit?: Property;
      verificationOnly?: boolean;
    }
    ```
    To:
    ```typescript
    interface CreateListingScreenProps {
      onBack: () => void;
      onSuccess: () => void;
      propertyToEdit?: Property;
      verificationOnly?: boolean;
      /** D-11: navigate to AccountSettings (Hospitality contact recovery) — optional with no-op fallback. */
      onNavigateToAccountSettings?: () => void;
    }
    ```

    And destructure in the component signature (currently at lines 71-76):
    ```typescript
    export const CreateListingScreen: React.FC<CreateListingScreenProps> = ({
      onBack,
      onSuccess,
      propertyToEdit,
      verificationOnly = false,
      onNavigateToAccountSettings,   // ← NEW, no default — optional-chain at call-site
    }) => {
    ```

    **DO NOT in this task:**
    - Touch the payload object at :451-481 (Task 2)
    - Touch the validation Alert.alert block at :415-431 (Task 2)
    - Touch the Status toggle / submit label at :701 / :754-761 (Task 2)
    - Add the sub-component `errors={errors}` threading (Task 3)
    - Add the onLayout captures or scrollRef prop wiring (Task 3)
    - Add the Contact Info inline error row (Task 3)

    After edits, run:
    - `npx tsc --noEmit 2>&1 | wc -l` must still be ≤ 16. If it climbs to 17+, the new imports or prop types likely have a typo; fix before moving on.
    - `./scripts/check-role-grep.sh` must exit 0 (Phase 3 D-14 invariant — you added NO role logic; this should still pass).
  </action>
  <verify>
    <automated>grep -c "useState<Currency | ''>" src/screens/CreateListingScreen.tsx && grep -c "setCurrency(value as Currency | '')" src/screens/CreateListingScreen.tsx && grep -c "validateByCategory" src/screens/CreateListingScreen.tsx && grep -c "buildPayloadByCategory" src/screens/CreateListingScreen.tsx && grep -c "FIELD_ORDER_BY_CATEGORY" src/screens/CreateListingScreen.tsx && grep -c "useState<FormErrorBag>" src/screens/CreateListingScreen.tsx && grep -c "useRef<KeyboardAwareScrollViewRef>" src/screens/CreateListingScreen.tsx && grep -c "onNavigateToAccountSettings" src/screens/CreateListingScreen.tsx && grep -c "setErrors((prev)" src/screens/CreateListingScreen.tsx && grep -c "KeyboardAwareScrollViewRef" src/screens/CreateListingScreen.tsx && npx tsc --noEmit 2>&1 | wc -l | awk '{exit ($1 > 16) ? 1 : 0}' && ./scripts/check-role-grep.sh</automated>
  </verify>
  <acceptance_criteria>
    - `grep -c "useState<Currency | ''>" src/screens/CreateListingScreen.tsx` returns exactly `1` (Edit A)
    - `grep -c "setCurrency(value as Currency | '')" src/screens/CreateListingScreen.tsx` returns exactly `1` (Edit B)
    - `grep -c "^import type { KeyboardAwareScrollViewRef }" src/screens/CreateListingScreen.tsx` returns exactly `1`
    - `grep -c "useRef," src/screens/CreateListingScreen.tsx` returns at least `1` (new useRef import in React import line)
    - `grep -c "validateByCategory" src/screens/CreateListingScreen.tsx` returns at least `1` (import only at this task; usage is Task 2)
    - `grep -c "buildPayloadByCategory" src/screens/CreateListingScreen.tsx` returns at least `1`
    - `grep -c "FIELD_ORDER_BY_CATEGORY" src/screens/CreateListingScreen.tsx` returns at least `1`
    - `grep -c "import type { TranslationKeys }" src/screens/CreateListingScreen.tsx` returns exactly `1`
    - `grep -c "const \[errors, setErrors\] = useState<FormErrorBag>" src/screens/CreateListingScreen.tsx` returns exactly `1`
    - `grep -c "scrollRef = useRef<KeyboardAwareScrollViewRef>" src/screens/CreateListingScreen.tsx` returns exactly `1`
    - `grep -c "fieldLayouts = useRef" src/screens/CreateListingScreen.tsx` returns exactly `1`
    - `grep -c "onNavigateToAccountSettings" src/screens/CreateListingScreen.tsx` returns at least `2` (prop interface + destructure — usage is Task 2)
    - `grep -c "setErrors((prev)" src/screens/CreateListingScreen.tsx` returns at least `1` (clear-on-keystroke)
    - `npx tsc --noEmit 2>&1 | wc -l` ≤ 16
    - `./scripts/check-role-grep.sh` exits 0
    - `./scripts/check-i18n-parity.sh` exits 0
    - `./scripts/check-land-removed.sh` exits 0
    - `npm test` exits 0 (≥44 tests green; no regressions)
  </acceptance_criteria>
  <done>
    Imports, state, refs, prop additions, and onChange clear-on-keystroke all landed. No behavioral changes yet to handleSubmit, payload, Status, or sub-component renders — those are Tasks 2 and 3. tsc ≤ 16. All 3 phase-gate scripts exit 0. Full jest suite green.
  </done>
</task>

<task type="auto">
  <name>Task 2: Replace handleSubmit validation + payload + Status toggle + submit label (Edits D, E, F, G)</name>
  <files>src/screens/CreateListingScreen.tsx</files>
  <read_first>
    - src/screens/CreateListingScreen.tsx (current — lines 384-506 handleSubmit, :701 Status guard, :754-761 submit label)
    - .planning/phases/05-listing-form-validation-edit-flow/05-PATTERNS.md §12 Edits D, E, F, G (exact transcription targets)
    - .planning/phases/05-listing-form-validation-edit-flow/05-CONTEXT.md D-06, D-09, D-10, D-11, D-16
    - .planning/phases/05-listing-form-validation-edit-flow/05-RESEARCH.md Finding #6 (payload shape + D-09 anchors inside shared block), Finding #7 (status rehydrate already at line 263 — no rehydrate change needed)
    - src/components/CreateListingForm/validators.ts (the validateByCategory + buildPayloadByCategory signatures from Plan 01)
  </read_first>
  <action>
    **IMPORTANT:** Task 1 added the imports and state. This task uses them to replace the handleSubmit validation block, the payload literal, the Status visibility guard, and the submit label.

    **Edit D — Replace Alert.alert validation (DELETE current lines 415-431, REPLACE with the block below):**

    Current (DELETE entirely — 17 lines including the `// Validation` comment on line 414 or whatever line it is):
    ```typescript
    // Validation
    if (!title.trim()) {
      Alert.alert(t('common.error'), t('createListing.titleRequired'));
      return;
    }
    if (!address.trim()) {
      Alert.alert(t('common.error'), t('createListing.addressRequired'));
      return;
    }
    if (!currency) {
      Alert.alert(t('common.error'), t('createListing.currencyRequired'));
      return;
    }
    if (!price.trim()) {
      Alert.alert(t('common.error'), t('createListing.priceRequired'));
      return;
    }
    ```

    Replace with (paste exactly):
    ```typescript
    // FORM-06 — single source of truth via validateByCategory + buildPayloadByCategory
    const category = propertyTypeToCategory(propertyType);

    // D-09/D-10/D-11: Hospitality contact hybrid rule — Alert with "Complete profile" recovery CTA
    if (category === 'Hospitality') {
      const phone = contactPhone.trim();
      const wa = contactWhatsapp.trim();
      const tg = contactTelegram.trim();
      const anyFilled = phone !== '' || wa !== '' || tg !== '';
      const passes = !anyFilled || (phone !== '' && (wa !== '' || tg !== ''));
      if (!passes) {
        Alert.alert(
          t('createListing.contactMissingTitle'),
          t('createListing.contactMissingMessage'),
          [
            { text: t('common.cancel'), style: 'cancel' },
            { text: t('createListing.contactMissingCta'), onPress: () => onNavigateToAccountSettings?.() },
          ],
        );
        setErrors((prev) => ({ ...prev, contactPhone: 'createListing.contactMissingInline' }));
        return;
      }
    }

    // D-01/D-02/D-04: validate + populate errors + auto-scroll to first invalid field
    const result = validateByCategory(values, category);
    if (!result.isValid) {
      setErrors(result.errors);
      const firstField = FIELD_ORDER_BY_CATEGORY[category].find((f) => result.errors[f]);
      if (firstField) {
        const y = fieldLayouts.current[firstField];
        // D-04 fallback (RESEARCH Pitfall 3): if onLayout hasn't fired (e.g., just after category switch),
        // scroll to top — better than a no-op.
        scrollRef.current?.scrollTo({ y: y !== undefined ? Math.max(0, y - 20) : 0, animated: true });
      }
      return;
    }
    setErrors({});
    ```

    **Edit E — Replace payload literal (DELETE current lines 451-481 — the `const propertyData = { ... };` block, 31 lines), REPLACE with:**
    ```typescript
    const basePayload = buildPayloadByCategory(values, category);

    const propertyData = {
      ...basePayload,
      address: fullAddress,                           // orchestrator-side: city-fallback side-effect builds fullAddress
      city: city || 'Bishkek',
      existingImages: existingImageUrls,              // orchestrator-side: selectedImages diff
      ...(can('editVerifications')                    // Finding #10 / Phase 3 D-14: role gate stays at call-site
        ? {
            platformVerifications: {
              ownershipDocuments: verifyOwnership,
              ownerIdentityVerified: verifyOwnerId,
              stateIssuedDocumentsVerified: verifyStateDocs,
            },
          }
        : {}),
    };
    ```

    The `values`, `fullAddress`, `existingImageUrls`, and `can` variables are ALL already in scope (values is built at :513-547; fullAddress at :436-445; existingImageUrls at :448; can at :131). Do NOT re-declare any of them.

    **Edit F — Status toggle visibility rule (line ~701):**
    Change from:
    ```typescript
    {!isEditMode && (
      <View style={styles.section}>
    ```
    To:
    ```typescript
    {(!isEditMode || propertyToEdit?.status === 'draft') && (
      <View style={styles.section}>
    ```

    Note: `propertyToEdit.status` is currently accessed via `(propertyToEdit as any).status` at line 263 in the rehydrate block because `Property` type doesn't declare a `status` field. For this plan, the `propertyToEdit?.status` access on this one line is safe because TypeScript allows `.status` on the non-`any` view of Property ONLY if we leave it as-is — if tsc complains, use `(propertyToEdit as any)?.status === 'draft'` as a minimal fix. Plan 05 will add `status?: 'draft' | 'live'` to the Property type to clean this up.

    **Edit G — Submit button label (lines ~754-761):**
    Change from:
    ```typescript
    {isEditMode
      ? t('createListing.updateListing')
      : status === 'draft'
        ? t('createListing.saveAsDraft')
        : t('createListing.createListing')}
    ```
    To:
    ```typescript
    {isEditMode
      ? ((propertyToEdit as any)?.status === 'draft'
          ? (status === 'draft'
              ? t('createListing.saveAsDraft')
              : t('createListing.publishListing'))
          : t('createListing.updateListing'))
      : (status === 'draft'
          ? t('createListing.saveAsDraft')
          : t('createListing.createListing'))}
    ```

    **Invariants to preserve (MUST pass):**
    - `grep -c "panoramicPhotosUrl" src/screens/CreateListingScreen.tsx` should be ≤ 1 after refactor (the `setPanoramicPhotosUrl` rehydrate at :254 is the only remaining reference — payload construction moved to validators.ts). If 0, the rehydrate disappeared — STOP. If ≥2, there's leftover payload-side code — STOP.
    - `grep -c "tours.length > 0 ? tours" src/screens/CreateListingScreen.tsx` should be `0` after refactor (moved into `buildPayloadByCategory` `shared` block). The only `tours.length > 0` ternary now lives in validators.ts.
    - `./scripts/check-role-grep.sh` exits 0 — `can('editVerifications')` at the call-site is the ONLY `can()` call in the orchestrator; Phase 3 D-14 invariant preserved.

    **DO NOT:**
    - Touch the verificationOnly admin-minimal branch at lines ~568-611 (explicitly out of scope per PATTERNS.md §12 "verificationOnly branch UNTOUCHED").
    - Remove or modify the rehydrate useEffect — including the `setPanoramicPhotosUrl(propertyToEdit.panoramicPhotosUrl || '')` line at :254 (D-09 anchor A).
    - Touch sub-component render calls yet (Task 3).
    - Add the Contact Info inline error row yet (Task 3).
  </action>
  <verify>
    <automated>grep -c "const result = validateByCategory" src/screens/CreateListingScreen.tsx && grep -c "const basePayload = buildPayloadByCategory" src/screens/CreateListingScreen.tsx && grep -c "FIELD_ORDER_BY_CATEGORY\[category\]" src/screens/CreateListingScreen.tsx && grep -c "contactMissingCta" src/screens/CreateListingScreen.tsx && grep -c "publishListing" src/screens/CreateListingScreen.tsx && grep -c "propertyToEdit?.status === 'draft'" src/screens/CreateListingScreen.tsx && grep -c "scrollRef.current?.scrollTo" src/screens/CreateListingScreen.tsx && ! grep -q "if (!title.trim()) {" src/screens/CreateListingScreen.tsx && ! grep -q "Alert.alert(t('common.error'), t('createListing.titleRequired'))" src/screens/CreateListingScreen.tsx && ! grep -q "if (!currency) {" src/screens/CreateListingScreen.tsx && grep -c "can('editVerifications')" src/screens/CreateListingScreen.tsx | grep -q "^1$" && npx tsc --noEmit 2>&1 | wc -l | awk '{exit ($1 > 17) ? 1 : 0}' && ./scripts/check-role-grep.sh && ./scripts/check-i18n-parity.sh</automated>
  </verify>
  <acceptance_criteria>
    - `grep -c "const result = validateByCategory" src/screens/CreateListingScreen.tsx` returns exactly `1`
    - `grep -c "const basePayload = buildPayloadByCategory" src/screens/CreateListingScreen.tsx` returns exactly `1`
    - `grep -c "FIELD_ORDER_BY_CATEGORY\[category\]" src/screens/CreateListingScreen.tsx` returns exactly `1`
    - `grep -c "contactMissingCta" src/screens/CreateListingScreen.tsx` returns exactly `1`
    - `grep -c "contactMissingTitle" src/screens/CreateListingScreen.tsx` returns exactly `1`
    - `grep -c "contactMissingMessage" src/screens/CreateListingScreen.tsx` returns exactly `1`
    - `grep -c "contactMissingInline" src/screens/CreateListingScreen.tsx` returns exactly `1`
    - `grep -c "createListing.publishListing" src/screens/CreateListingScreen.tsx` returns exactly `1`
    - `grep -c "propertyToEdit?.status === 'draft' || !isEditMode\|!isEditMode || propertyToEdit" src/screens/CreateListingScreen.tsx` returns at least `1` (OR either grep-safe variant of the guard)
    - `grep -c "scrollRef.current?.scrollTo" src/screens/CreateListingScreen.tsx` returns exactly `1`
    - `! grep -q "if (!title.trim()) {" src/screens/CreateListingScreen.tsx` (old Alert.alert title check deleted)
    - `! grep -q "if (!currency) {" src/screens/CreateListingScreen.tsx` (old currency check deleted)
    - `! grep -qE "Alert.alert\(t\('common.error'\), t\('createListing.(title|address|currency|price)Required'\)\)" src/screens/CreateListingScreen.tsx` (zero of the 4 old Alert.alert patterns remain)
    - `grep -c "can('editVerifications')" src/screens/CreateListingScreen.tsx` returns exactly `1` (call-site role gate preserved; Phase 3 D-14)
    - `grep -c "setPanoramicPhotosUrl(" src/screens/CreateListingScreen.tsx` returns at least `1` (D-09 anchor A rehydrate preserved)
    - `grep -c "panoramicPhotosUrl:" src/screens/CreateListingScreen.tsx` returns `0` (payload construction moved to validators.ts)
    - `grep -c "tours.length > 0 ? tours" src/screens/CreateListingScreen.tsx` returns `0` (payload construction moved)
    - `./scripts/check-role-grep.sh` exits 0
    - `./scripts/check-i18n-parity.sh` exits 0
    - `./scripts/check-land-removed.sh` exits 0
    - `npx tsc --noEmit 2>&1 | wc -l` ≤ 17 (allow 1-line tolerance for the `propertyToEdit as any` status cast; if this drifts to 18+, investigate)
    - `npm test` exits 0
  </acceptance_criteria>
  <done>
    handleSubmit now uses validateByCategory (single source of truth per FORM-06). Inline payload deleted; buildPayloadByCategory is the only payload construction site. D-09 anchors preserved (anchor A rehydrate at :254 + anchors B/C in validators.ts shared block — verified via the zero-hit grep for old patterns in orchestrator). Hospitality contact hybrid rule fires Alert with Complete profile CTA. Status toggle shows on edit-draft; submit label uses publishListing in that case. tsc ≤ 17. All 3 phase-gate scripts exit 0.
  </done>
</task>

<task type="auto">
  <name>Task 3: Thread errors to sub-components + scrollRef + onLayout + Contact Info inline error (Edits I, J)</name>
  <files>src/screens/CreateListingScreen.tsx</files>
  <read_first>
    - src/screens/CreateListingScreen.tsx (current — lines 634-665 KASV + 6 sub-component renders; :668-698 Contact Info block)
    - .planning/phases/05-listing-form-validation-edit-flow/05-PATTERNS.md §12 Edits I, J
    - .planning/phases/05-listing-form-validation-edit-flow/05-RESEARCH.md Finding #1 (onLayout section-level capture), Pitfall 3 (stale y-offset fallback), Pitfall 10 (Contact inline error placement)
    - .planning/phases/05-listing-form-validation-edit-flow/05-CONTEXT.md D-11 (contact inline error)
  </read_first>
  <action>
    **Edit J.1 — Attach scrollRef to KeyboardAwareScrollView:**

    At line ~634 the current JSX is:
    ```tsx
    <KeyboardAwareScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      bottomOffset={20}
    >
    ```
    Change to:
    ```tsx
    <KeyboardAwareScrollView
      ref={scrollRef}
      style={styles.scrollView}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      bottomOffset={20}
    >
    ```

    **Edit J.2 — Thread errors to all 6 sub-component renders and wrap each with an onLayout capture:**

    Replace the 6 `errors={{}}` occurrences with `errors={errors}`. Wrap each sub-component render in a `<View onLayout={...}>` that captures the section's Y offset for D-04 scroll-to-first-error:

    Current lines 641-665 (roughly):
    ```tsx
    <BasicInfoSection values={values} onChange={onChange} errors={{}} />

    {category === 'Residential' && (
      <ResidentialSection values={values} onChange={onChange} errors={{}} />
    )}
    {category === 'Commercial' && (
      <CommercialSection values={values} onChange={onChange} errors={{}} />
    )}
    {category === 'Hospitality' && (
      <HospitalitySection values={values} onChange={onChange} errors={{}} />
    )}

    {category !== 'Hospitality' && (
      <PriceSection values={values} onChange={onChange} errors={{}} />
    )}

    <MediaSection
      values={values}
      onChange={onChange}
      errors={{}}
      onSelectImages={handleSelectImages}
      onRemoveImage={removeImage}
      onAddTour={addTour}
      onRemoveTour={removeTour}
    />
    ```

    Replace with (use section-level onLayout capturing the first-field-of-section y-offset; Pitfall 3 guards against stale values by fallback to 0):
    ```tsx
    <View onLayout={(e) => { fieldLayouts.current.title = e.nativeEvent.layout.y; }}>
      <BasicInfoSection values={values} onChange={onChange} errors={errors} />
    </View>

    {category === 'Residential' && (
      <View onLayout={(e) => { fieldLayouts.current.bedrooms = e.nativeEvent.layout.y; }}>
        <ResidentialSection values={values} onChange={onChange} errors={errors} />
      </View>
    )}
    {category === 'Commercial' && (
      <View onLayout={(e) => { fieldLayouts.current.areaSqm = e.nativeEvent.layout.y; }}>
        <CommercialSection values={values} onChange={onChange} errors={errors} />
      </View>
    )}
    {category === 'Hospitality' && (
      <View onLayout={(e) => { fieldLayouts.current.rooms = e.nativeEvent.layout.y; }}>
        <HospitalitySection values={values} onChange={onChange} errors={errors} />
      </View>
    )}

    {category !== 'Hospitality' && (
      <View onLayout={(e) => { fieldLayouts.current.currency = e.nativeEvent.layout.y; fieldLayouts.current.price = e.nativeEvent.layout.y; }}>
        <PriceSection values={values} onChange={onChange} errors={errors} />
      </View>
    )}

    <MediaSection
      values={values}
      onChange={onChange}
      errors={errors}
      onSelectImages={handleSelectImages}
      onRemoveImage={removeImage}
      onAddTour={addTour}
      onRemoveTour={removeTour}
    />
    ```

    Section-level y-capture is deliberately coarse per RESEARCH Finding #1 — the first field of each section gets the section's Y offset. Within a section, multiple fields sharing the same Y are close enough that scroll-to-section-top lands the user within viewing distance of the actual invalid field. Per-field onLayout inside sub-components is out of scope for M1.

    **Also update capturing for BasicInfoSection's individual required fields** (they all live at approximately the same Y as the BasicInfoSection top, so mapping them to `.title` Y is acceptable). The `FIELD_ORDER_BY_CATEGORY` starts with title/description/address/district/city — all of which will use `fieldLayouts.current.title` via the section-level capture. This is a deliberate simplification; per-field precision is deferred.

    **Edit I — Contact Info inline error row (RESEARCH Pitfall 10):**

    The Contact Info block is inline in the orchestrator at lines ~668-698. Currently:
    ```tsx
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('createListing.contactInfo')}</Text>
      <TextInput ... /> {/* email */}
      <TextInput ... /> {/* phone */}
      <TextInput ... /> {/* whatsapp */}
      <TextInput ... /> {/* telegram */}
    </View>
    ```

    Change to (insert the error row between the sectionTitle `<Text>` and the first `<TextInput>`):
    ```tsx
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('createListing.contactInfo')}</Text>
      {errors.contactPhone && (
        <Text style={[styles.hint, { color: colors.error, marginBottom: 8 }]}>
          {t(errors.contactPhone as TranslationKeys)}
        </Text>
      )}
      <TextInput ... /> {/* email — unchanged */}
      ...
    </View>
    ```

    The `styles.hint` token is used (orchestrator-scoped `styles.ts`, not `commonStyles` — orchestrator keeps its own tokens; both have `hint` defined). The `colors.error` comes from `useTheme()` which is already destructured at line 77 (`const { colors, isDark } = useTheme();`).

    Also wrap the Contact Info block with an onLayout for scroll-to-error:
    ```tsx
    <View onLayout={(e) => { fieldLayouts.current.contactPhone = e.nativeEvent.layout.y; }}>
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('createListing.contactInfo')}</Text>
        {errors.contactPhone && (
          <Text style={[styles.hint, { color: colors.error, marginBottom: 8 }]}>
            {t(errors.contactPhone as TranslationKeys)}
          </Text>
        )}
        <TextInput ... />
        ...
      </View>
    </View>
    ```

    **DO NOT:**
    - Change `<VerificationSection values={values} onChange={onChange} />` — it intentionally uses `Pick<SectionProps, 'values' | 'onChange'>` and takes no `errors` prop (PATTERNS.md §11 / RESEARCH Finding #9).
    - Remove the `<Gated action="editVerifications">` wrap around VerificationSection at line ~742 (Phase 3 D-14).
    - Touch the verificationOnly admin-minimal branch.
    - Add per-field onLayout captures inside sub-components (out of scope; section-level is the agreed M1 level).

    After all edits:
    - `npx tsc --noEmit 2>&1 | wc -l` ≤ 17
    - `grep -c "errors={{}}" src/screens/CreateListingScreen.tsx` returns `0` (all 6 placeholder empty-objects replaced)
    - `grep -c "errors={errors}" src/screens/CreateListingScreen.tsx` returns exactly `6` (BasicInfo, Residential, Commercial, Hospitality, Price, Media)
    - `grep -c "ref={scrollRef}" src/screens/CreateListingScreen.tsx` returns exactly `1` (on KASV)
    - `grep -c "fieldLayouts.current" src/screens/CreateListingScreen.tsx` returns at least `7` (6 section onLayouts + 1 lookup in handleSubmit)
  </action>
  <verify>
    <automated>grep -c "errors={{}}" src/screens/CreateListingScreen.tsx | grep -q "^0$" && grep -c "errors={errors}" src/screens/CreateListingScreen.tsx | grep -q "^6$" && grep -c "ref={scrollRef}" src/screens/CreateListingScreen.tsx | grep -q "^1$" && grep -c "fieldLayouts.current" src/screens/CreateListingScreen.tsx && grep -c "errors.contactPhone" src/screens/CreateListingScreen.tsx && grep -c "<Gated action=\"editVerifications\">" src/screens/CreateListingScreen.tsx | grep -q "^1$" && grep -c "<VerificationSection values={values} onChange={onChange} />" src/screens/CreateListingScreen.tsx | grep -q "^1$" && npx tsc --noEmit 2>&1 | wc -l | awk '{exit ($1 > 17) ? 1 : 0}' && ./scripts/check-role-grep.sh && ./scripts/check-i18n-parity.sh && ./scripts/check-land-removed.sh && npm test --silent 2>&1 | tail -5</automated>
  </verify>
  <acceptance_criteria>
    - `grep -c "errors={{}}" src/screens/CreateListingScreen.tsx` returns `0` (all placeholder empty-objects replaced)
    - `grep -c "errors={errors}" src/screens/CreateListingScreen.tsx` returns exactly `6` (BasicInfo, Residential, Commercial, Hospitality, Price, Media)
    - `grep -c "ref={scrollRef}" src/screens/CreateListingScreen.tsx` returns exactly `1`
    - `grep -c "fieldLayouts.current" src/screens/CreateListingScreen.tsx` returns at least `7` (6 section-level onLayout captures + 1 lookup in handleSubmit — may include additional captures for title/currency/price mapped inside the same View)
    - `grep -c "errors.contactPhone" src/screens/CreateListingScreen.tsx` returns at least `1` (Contact Info inline error row)
    - `grep -c '<Gated action="editVerifications">' src/screens/CreateListingScreen.tsx` returns exactly `1` (Phase 3 D-14 preserved)
    - `grep -c "<VerificationSection values={values} onChange={onChange} />" src/screens/CreateListingScreen.tsx` returns exactly `1` (no errors prop added to VerificationSection)
    - `npx tsc --noEmit 2>&1 | wc -l` ≤ 17
    - `./scripts/check-role-grep.sh` exits 0 (Phase 3 D-14 invariant)
    - `./scripts/check-i18n-parity.sh` exits 0 (Phase 4 FORM-09)
    - `./scripts/check-land-removed.sh` exits 0 (Phase 4 FORM-01)
    - `npm test` exits 0 (full suite green — ≥44 tests)
    - `grep -c "onLayout=" src/screens/CreateListingScreen.tsx` returns at least `6` (one per mounted section wrapper)
  </acceptance_criteria>
  <done>
    All 6 sub-component renders receive `errors={errors}`; KeyboardAwareScrollView has `ref={scrollRef}`; each mounted section is wrapped with an onLayout capture that writes to `fieldLayouts.current`; Contact Info block has an inline red error row above its read-only inputs; VerificationSection render unchanged (still uses Pick without errors); `<Gated action="editVerifications">` wrap preserved. tsc ≤ 17. All 3 phase-gate scripts exit 0. Full jest suite green.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| user input → handleSubmit | TextInput values flow through onChange → useState → values (FormBag) → validateByCategory → payload. Client-side validation is advisory only; true trust boundary is the Railway backend (accepted risk UNCONFIRMED-AT-SHIP per PROJECT.md Key Decisions row 128 / GATE-05 D-22). |
| role-gated fields (Matterport/panoramic/verifications) | useRole `can(...)` check at call-site (`can('editVerifications')` in payload spread + `<Gated>` wraps for URL fields). If `can()` returns true but backend doesn't enforce, bypass is possible — M2 ROLE-04 (firebase-admin signed-ID-token verification) closes this. |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-05-04-01 | Tampering | handleSubmit payload | mitigate | Payload built exclusively through `buildPayloadByCategory` (pure function from Plan 01). Category is derived from propertyType (never stored). No user-controlled path can inject arbitrary keys into the payload shape. |
| T-05-04-02 | Information Disclosure | scroll-to-error y-offset | accept | y-offsets are layout metadata only (no PII). Stored in ref, not state, not persisted. |
| T-05-04-03 | Denial of Service | setErrors on every keystroke | mitigate | Clear-on-keystroke uses functional setState with a short-circuit: if `prev[field]` is undefined, returns `prev` unchanged — React skips re-render. O(1) per keystroke. |
| T-05-04-04 | Elevation of Privilege | platformVerifications in payload | mitigate | `can('editVerifications')` call-site gate preserved at orchestrator — role-agnostic validators.ts never includes this key in buildPayloadByCategory output. Phase 3 D-14 grep invariant enforced by `./scripts/check-role-grep.sh` as acceptance criterion. |
| T-05-04-05 | Repudiation | N/A | accept | Backend logs authoritative payload; client log `console.error('Error creating listing:', error)` only on catch. |
| T-05-04-06 | Spoofing | Hospitality contact recovery nav | accept | Optional-chain `onNavigateToAccountSettings?.()` — if prop is undefined (e.g., test/verificationOnly caller) the CTA no-ops. No identity-spoofing surface. |
| T-05-04-07 | Tampering | D-09 anchor preservation | mitigate | `panoramicPhotosUrl` and `tours` are built inside `buildPayloadByCategory`'s `shared` block (Plan 01) — unconditionally included in every category's payload. Grep invariant: `grep -c "panoramicPhotosUrl" src/screens/CreateListingScreen.tsx` = 0 after refactor (all payload construction moved); rehydrate site remains. |
</threat_model>

<verification>
End-of-plan checks (run sequentially before commit):

1. **Orchestrator compiles cleanly:** `npx tsc --noEmit 2>&1 | wc -l` ≤ 17 (baseline 16; allow +1 for the `propertyToEdit as any` status cast if tsc surfaces it — Plan 05 resolves this).
2. **Full Jest suite passes:** `npm test` exits 0 with ≥44 tests green.
3. **Phase gates preserved (all 3 exit 0):**
   - `./scripts/check-role-grep.sh` (Phase 3 D-14 — 4-part grep invariant: `useRole`/`Gated`/`can(`/email-allowlist still scoped)
   - `./scripts/check-i18n-parity.sh` (Phase 4 FORM-09 — EN=RU parity)
   - `./scripts/check-land-removed.sh` (Phase 4 FORM-01 — Land absent)
4. **D-09 anchors verified:**
   - Rehydrate anchor A: `grep -c "setPanoramicPhotosUrl(" src/screens/CreateListingScreen.tsx` ≥ 1 (rehydrate useEffect intact)
   - Payload anchors B + C: `grep -c "panoramicPhotosUrl" src/screens/CreateListingScreen.tsx` = 0 or 1 only (only the rehydrate reference at ~:254; all payload construction moved to validators.ts)
   - Validators-side: `grep -c "panoramicPhotosUrl:" src/components/CreateListingForm/validators.ts` = 1; `grep -c "tours.length > 0" src/components/CreateListingForm/validators.ts` = 1
5. **Role-gating single call site:** `grep -c "can('editVerifications')" src/screens/CreateListingScreen.tsx` = 1 (unchanged from Phase 4).
6. **VerificationSection untouched:** `grep -c "<VerificationSection values={values} onChange={onChange} />" src/screens/CreateListingScreen.tsx` = 1 (same Pick-based render call from Phase 4).
7. **No orphaned Alert.alert validation checks:** `grep -cE "Alert\\.alert\\(t\\('common\\.error'\\), t\\('createListing\\.(title|address|currency|price)Required'\\)\\)" src/screens/CreateListingScreen.tsx` = 0.
8. **Validator is THE validation source:** `grep -c "validateByCategory" src/screens/CreateListingScreen.tsx` ≥ 2 (import + call).
9. **Sub-components receive real errors:** `grep -c "errors={{}}" src/screens/CreateListingScreen.tsx` = 0; `grep -c "errors={errors}" src/screens/CreateListingScreen.tsx` = 6.
10. **D-16 visibility + label rules:**
    - Status toggle guard: `grep -c "propertyToEdit?.status === 'draft'" src/screens/CreateListingScreen.tsx` ≥ 2 (visibility guard at ~:701 + submit-label ternary at ~:754-761). Use `(propertyToEdit as any)?.status` if tsc demands.
    - Publish label: `grep -c "createListing.publishListing" src/screens/CreateListingScreen.tsx` = 1.
</verification>

<success_criteria>
- FORM-06 is satisfied: `validateByCategory` + `buildPayloadByCategory` are the SOLE validation/payload-shaping sites; all 4 legacy `Alert.alert` validation checks deleted; inline 30-line payload literal deleted
- FORM-07 is satisfied: category-switch preserves shared fields (implicit — orchestrator useState never clears on propertyType change; Plan 05 QA verifies)
- FORM-08 is satisfied in its D-16-expanded form: Status toggle visible when creating OR editing a draft; hidden only when editing a live listing; submit label surfaces `publishListing` in the edit-draft-to-live case
- D-09 anchors preserved: panoramicPhotosUrl rehydrate intact at orchestrator; panoramicPhotosUrl + tours unconditional in buildPayloadByCategory `shared` block
- D-11 Hospitality contact recovery: Alert.alert → "Complete profile" → `onNavigateToAccountSettings?.()` → App.tsx flips to AccountSettingsScreen (Plan 05 wires this)
- D-04 scroll-to-first-error: KASV ref attached; section-level onLayout captures feed fieldLayouts; handleSubmit falls back to `{y:0}` when layout offset missing
- Phase 3 D-14 invariant preserved — role-grep gate exits 0
- All 3 phase-gate scripts exit 0
- tsc baseline ≤ 17 lines
- Full Jest suite ≥44 tests green
</success_criteria>

<output>
Create `.planning/phases/05-listing-form-validation-edit-flow/05-04-SUMMARY.md` with:
- Orchestrator LOC before/after (target: ~871 → ~900, slight increase due to scroll-ref + Contact Alert + D-16 label)
- 10 edits A–J applied — check each off with the exact line range touched
- Post-refactor grep counts for D-09 anchors (validators.ts = 1 each, orchestrator = 0 for payload / ≥1 for rehydrate only)
- tsc baseline line count
- Jest pass count
- Phase-gate script outputs
- Any Rule-1 auto-fixes with source-file evidence
- Signal for Plan 05: `onNavigateToAccountSettings` prop needs App.tsx wiring at the CreateListingScreen render site (~:821-840); Property type needs `status?: 'draft' | 'live'` addition if tsc surfaced a regression from the status cast
</output>

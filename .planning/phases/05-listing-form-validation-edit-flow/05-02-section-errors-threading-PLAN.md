---
phase: 05-listing-form-validation-edit-flow
plan: 02
type: execute
wave: 2
depends_on: [01]
files_modified:
  - src/components/CreateListingForm/BasicInfoSection.tsx
  - src/components/CreateListingForm/ResidentialSection.tsx
  - src/components/CreateListingForm/CommercialSection.tsx
  - src/components/CreateListingForm/HospitalitySection.tsx
  - src/components/CreateListingForm/PriceSection.tsx
autonomous: true
requirements: [FORM-04, FORM-06]
tags: [react-native, validation, ui, i18n, errors]
must_haves:
  truths:
    - "5 sub-components (BasicInfo, Residential, Commercial, Hospitality, Price) render inline red error text under each invalid TextInput when errors prop contains a matching field"
    - "PriceSection imports CURRENCY_OPTIONS from validators.ts — the local literal is deleted, single source of truth established"
    - "MediaSection and VerificationSection remain unchanged (no FORM-04 required fields live on those components)"
    - "Error text uses commonStyles.hint typography + colors.error from useTheme() — no new StyleSheet keys, no hardcoded colors"
  artifacts:
    - path: "src/components/CreateListingForm/BasicInfoSection.tsx"
      provides: "6-7 inline error rows (title, description, address, district, city, availableDate, propertyType)"
      contains: "errors.title"
    - path: "src/components/CreateListingForm/ResidentialSection.tsx"
      provides: "3 inline error rows (bedrooms, bathrooms, areaSqm)"
      contains: "errors.bedrooms"
    - path: "src/components/CreateListingForm/CommercialSection.tsx"
      provides: "1 inline error row (areaSqm)"
      contains: "errors.areaSqm"
    - path: "src/components/CreateListingForm/HospitalitySection.tsx"
      provides: "3 inline error rows (rooms, maxGuests, bathrooms)"
      contains: "errors.rooms"
    - path: "src/components/CreateListingForm/PriceSection.tsx"
      provides: "2 inline error rows (currency, price) + CURRENCY_OPTIONS migrated to import"
      contains: "errors.price"
  key_links:
    - from: "src/components/CreateListingForm/PriceSection.tsx"
      to: "src/components/CreateListingForm/validators.ts"
      via: "import { CURRENCY_OPTIONS }"
      pattern: "from './validators'"
    - from: "every modified sub-component"
      to: "src/components/CreateListingForm/styles.ts + src/theme/colors.ts"
      via: "commonStyles.hint + colors.error"
      pattern: "color: colors.error"
---

<objective>
Thread `errors: FormErrorBag` through 5 of the 7 sub-components so they render inline red error text under each invalid `TextInput` per D-01. Migrate the `CURRENCY_OPTIONS` literal from PriceSection.tsx into `validators.ts` (import-only usage).

Purpose: Phase 4 already piped `errors: {}` to every `<SectionProps>` consumer; this plan fills those error slots with actual render logic. Sub-components remain dumb renderers — they do NOT call validators or format strings. Validator error values are translation KEYS; sub-components call `t(errors.field as TranslationKeys)` at render time.

Output:
- 5 sub-components modified (BasicInfo, Residential, Commercial, Hospitality, Price)
- 2 sub-components explicitly unchanged (MediaSection, VerificationSection)
- PriceSection's local `CURRENCY_OPTIONS` literal deleted and replaced with named import
- tsc baseline preserved (≤16 lines)
- No new styles (reuses `commonStyles.hint` + `colors.error`)
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/05-listing-form-validation-edit-flow/05-CONTEXT.md
@.planning/phases/05-listing-form-validation-edit-flow/05-RESEARCH.md
@.planning/phases/05-listing-form-validation-edit-flow/05-PATTERNS.md
@src/components/CreateListingForm/BasicInfoSection.tsx
@src/components/CreateListingForm/ResidentialSection.tsx
@src/components/CreateListingForm/CommercialSection.tsx
@src/components/CreateListingForm/HospitalitySection.tsx
@src/components/CreateListingForm/PriceSection.tsx
@src/components/CreateListingForm/styles.ts
@src/theme/colors.ts
@src/locales/index.ts

<interfaces>
<!-- D-01 render shape — drop verbatim under each invalid TextInput -->

```typescript
{errors.FIELDNAME && (
  <Text style={[commonStyles.hint, { color: colors.error }]}>
    {t(errors.FIELDNAME as TranslationKeys)}
  </Text>
)}
```

From src/components/CreateListingForm/styles.ts (`commonStyles.hint` — fontSize 12, italic, marginTop 4):
```typescript
hint: {
  fontSize: 12,
  fontStyle: 'italic',
  marginTop: 4,
  // no color — applied inline via colors.error from useTheme()
}
```

From src/theme/colors.ts:18 (light) + :38 (dark):
```typescript
error: '#F44336',  // light
error: '#EF5350',  // dark
```

From src/locales/index.ts:
```typescript
export type { TranslationKeys } from './en';  // validator error values (e.g. 'createListing.bedroomsRequired') ARE TranslationKeys
```

Required import additions per modified sub-component:
```typescript
import type { TranslationKeys } from '../../locales';
```
(The other imports — React, View, Text, useTheme, useLanguage, commonStyles — are already present in every sub-component.)
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Thread errors into BasicInfoSection, ResidentialSection, CommercialSection, HospitalitySection (4 files)</name>
  <files>src/components/CreateListingForm/BasicInfoSection.tsx, src/components/CreateListingForm/ResidentialSection.tsx, src/components/CreateListingForm/CommercialSection.tsx, src/components/CreateListingForm/HospitalitySection.tsx</files>
  <read_first>
    - src/components/CreateListingForm/BasicInfoSection.tsx (current — line 45 `errors: _errors` destructure)
    - src/components/CreateListingForm/ResidentialSection.tsx (current — line 21)
    - src/components/CreateListingForm/CommercialSection.tsx (current — line 22)
    - src/components/CreateListingForm/HospitalitySection.tsx (current — line 31)
    - src/components/CreateListingForm/styles.ts (commonStyles.hint is already what we need — no new style key required)
    - src/theme/colors.ts (colors.error exists at :18 light + :38 dark per RESEARCH Finding #3)
    - .planning/phases/05-listing-form-validation-edit-flow/05-PATTERNS.md §6-§9 (drop-in sites with exact line numbers per file)
    - .planning/phases/05-listing-form-validation-edit-flow/05-CONTEXT.md D-01 (render shape)
  </read_first>
  <action>
    For EACH of the 4 sub-components below, apply these same two structural changes:

    **Change A — Rename `errors: _errors` → `errors` in the destructure.** Grep for `errors: _errors` in each file; rename to `errors`. This activates the errors prop (currently aliased to silence the unused-var warning).

    **Change B — Add `import type { TranslationKeys } from '../../locales';`** after the existing type import (there's an existing `import type { SectionProps } from './types';` line — add the TranslationKeys import immediately after it, or consolidate into one `import type` block if the executor prefers).

    **Change C — Drop inline error rows under each required TextInput** using the D-01 pattern:
    ```typescript
    {errors.FIELDNAME && (
      <Text style={[commonStyles.hint, { color: colors.error }]}>
        {t(errors.FIELDNAME as TranslationKeys)}
      </Text>
    )}
    ```

    **Per-file drop sites** (from PATTERNS.md §6-§9; if line numbers shift slightly from the PATTERNS map, place the error row IMMEDIATELY after the closing `/>` of the corresponding `<TextInput>` for the named field):

    **File 1: `BasicInfoSection.tsx`** — 7 error rows:
    - Below `title` TextInput → `errors.title` row
    - Below `description` TextInput → `errors.description` row
    - Below `address` TextInput → `errors.address` row
    - Below `district` TextInput → `errors.district` row
    - Below `city` TextInput → `errors.city` row
    - Below `availableDate` date-picker button → `errors.availableDate` row
    - Below the three property-type chip groups (after the 3 chipRows close — above `availableDate` section) → `errors.propertyType` row (per PATTERNS.md §6 drop-in table)
    NOTE: `description` is a new required field added by Phase 5 (not present in current Phase-4 required-field set). Verify via grep that a `description` TextInput exists in BasicInfoSection.tsx BEFORE attempting to drop the row there. If the description TextInput is in BasicInfoSection, drop the error row there; otherwise surface this as a deviation note in SUMMARY.

    **File 2: `ResidentialSection.tsx`** — 3 error rows:
    - Below `bedrooms` TextInput → `errors.bedrooms` row (inside `commonStyles.thirdInput` wrapper, below TextInput, column-scoped)
    - Below `bathrooms` TextInput → `errors.bathrooms` row (inside its `thirdInput` wrapper)
    - Below `areaSqm` TextInput → `errors.areaSqm` row (inside its `thirdInput` wrapper)

    **File 3: `CommercialSection.tsx`** — 1 error row:
    - Below `areaSqm` TextInput → `errors.areaSqm` row (inside `halfInput` wrapper per PATTERNS.md §8)

    **File 4: `HospitalitySection.tsx`** — 3 error rows:
    - Below `rooms` TextInput → `errors.rooms` row
    - Below `maxGuests` TextInput → `errors.maxGuests` row
    - Below `bathrooms` TextInput → `errors.bathrooms` row

    **DO NOT:**
    - Add new StyleSheet keys. Reuse `commonStyles.hint` as the typography base (fontSize 12, italic, marginTop 4 are already baked in per `styles.ts`).
    - Change input `borderColor` or other style on the TextInput itself (D-01: no input border change).
    - Add asterisks or "required" labels anywhere (D-03: no required-field markers).
    - Modify MediaSection.tsx or VerificationSection.tsx in this task (PATTERNS.md §11 — no change).
    - Change the `SectionProps` type shape (already has `errors: FormErrorBag` since Phase 4 — this task just CONSUMES it).

    After the 4-file edit, run `npx tsc --noEmit 2>&1 | wc -l` and verify line count ≤ 16 (Phase 4 baseline).
  </action>
  <verify>
    <automated>grep -c "errors: _errors" src/components/CreateListingForm/BasicInfoSection.tsx src/components/CreateListingForm/ResidentialSection.tsx src/components/CreateListingForm/CommercialSection.tsx src/components/CreateListingForm/HospitalitySection.tsx | awk -F: '{s+=$2} END {exit (s>0)?1:0}' && grep -c "errors.title" src/components/CreateListingForm/BasicInfoSection.tsx && grep -c "errors.bedrooms" src/components/CreateListingForm/ResidentialSection.tsx && grep -c "errors.areaSqm" src/components/CreateListingForm/CommercialSection.tsx && grep -c "errors.rooms" src/components/CreateListingForm/HospitalitySection.tsx && grep -c "colors.error" src/components/CreateListingForm/BasicInfoSection.tsx src/components/CreateListingForm/ResidentialSection.tsx src/components/CreateListingForm/CommercialSection.tsx src/components/CreateListingForm/HospitalitySection.tsx | awk -F: '{s+=$2} END {exit (s<4)?1:0}' && npx tsc --noEmit 2>&1 | wc -l | awk '{exit ($1 > 16) ? 1 : 0}'</automated>
  </verify>
  <acceptance_criteria>
    - `grep -c "errors: _errors" src/components/CreateListingForm/BasicInfoSection.tsx` returns `0` (rename done)
    - `grep -c "errors: _errors" src/components/CreateListingForm/ResidentialSection.tsx` returns `0`
    - `grep -c "errors: _errors" src/components/CreateListingForm/CommercialSection.tsx` returns `0`
    - `grep -c "errors: _errors" src/components/CreateListingForm/HospitalitySection.tsx` returns `0`
    - `grep -c "errors.title" src/components/CreateListingForm/BasicInfoSection.tsx` returns at least `1`
    - `grep -c "errors.address" src/components/CreateListingForm/BasicInfoSection.tsx` returns at least `1`
    - `grep -c "errors.city" src/components/CreateListingForm/BasicInfoSection.tsx` returns at least `1`
    - `grep -c "errors.district" src/components/CreateListingForm/BasicInfoSection.tsx` returns at least `1`
    - `grep -c "errors.bedrooms" src/components/CreateListingForm/ResidentialSection.tsx` returns at least `1`
    - `grep -c "errors.bathrooms" src/components/CreateListingForm/ResidentialSection.tsx` returns at least `1`
    - `grep -c "errors.areaSqm" src/components/CreateListingForm/ResidentialSection.tsx` returns at least `1`
    - `grep -c "errors.areaSqm" src/components/CreateListingForm/CommercialSection.tsx` returns at least `1`
    - `grep -c "errors.rooms" src/components/CreateListingForm/HospitalitySection.tsx` returns at least `1`
    - `grep -c "errors.maxGuests" src/components/CreateListingForm/HospitalitySection.tsx` returns at least `1`
    - `grep -c "errors.bathrooms" src/components/CreateListingForm/HospitalitySection.tsx` returns at least `1`
    - `grep -c "colors.error" src/components/CreateListingForm/BasicInfoSection.tsx` returns at least `6`
    - `grep -c "TranslationKeys" src/components/CreateListingForm/BasicInfoSection.tsx` returns at least `1` (import + cast)
    - `grep -c "TranslationKeys" src/components/CreateListingForm/ResidentialSection.tsx` returns at least `1`
    - `grep -c "TranslationKeys" src/components/CreateListingForm/CommercialSection.tsx` returns at least `1`
    - `grep -c "TranslationKeys" src/components/CreateListingForm/HospitalitySection.tsx` returns at least `1`
    - `npx tsc --noEmit 2>&1 | wc -l` returns number ≤ 16
    - `./scripts/check-role-grep.sh` exits 0 (Phase 3 D-14 invariant preserved)
  </acceptance_criteria>
  <done>
    4 sub-components (BasicInfo, Residential, Commercial, Hospitality) have:
    - `errors` destructured (not aliased to `_errors`)
    - `TranslationKeys` type imported
    - Inline error rows rendered under each required TextInput using `commonStyles.hint + colors.error`
    - NO new StyleSheet keys, NO input border changes, NO asterisks/markers
    tsc baseline ≤ 16 lines. Phase 3 role-grep gate still exits 0.
  </done>
</task>

<task type="auto">
  <name>Task 2: Thread errors into PriceSection + migrate CURRENCY_OPTIONS to validators import</name>
  <files>src/components/CreateListingForm/PriceSection.tsx</files>
  <read_first>
    - src/components/CreateListingForm/PriceSection.tsx (current — lines 25-28 local CURRENCY_OPTIONS; line 30 `errors: _errors` destructure)
    - src/components/CreateListingForm/validators.ts (Plan 01 — CURRENCY_OPTIONS is the canonical source)
    - .planning/phases/05-listing-form-validation-edit-flow/05-PATTERNS.md §10 (PriceSection drop-in + migration)
    - .planning/phases/05-listing-form-validation-edit-flow/05-CONTEXT.md D-18 (CURRENCY_OPTIONS migration)
    - .planning/phases/05-listing-form-validation-edit-flow/05-RESEARCH.md Finding #5 (canonical tokens `'$'`/`'сом'` preserved)
  </read_first>
  <action>
    Apply 3 changes to `src/components/CreateListingForm/PriceSection.tsx`:

    **Change A — Delete local CURRENCY_OPTIONS literal (lines 25-28 including the comment docblock above):**

    BEFORE (delete this entire block, including the preceding comment lines 21-24):
    ```typescript
    // CURRENCY_OPTIONS — transcribed verbatim from CreateListingScreen.tsx:36-39.
    // values ('$' / 'сом') are the storage tokens the orchestrator persists at
    // :375 submit payload and rehydrates at :164 propertyToEdit.currency; labels
    // carry the flag emoji from the source (visible to user).
    const CURRENCY_OPTIONS = [
      { value: '$', label: '🇺🇸 USD' },
      { value: 'сом', label: '🇰🇬 сом' },
    ] as const;
    ```

    **Change B — Add import at top of file** (in the existing import block, alongside `import { commonStyles } from './styles';` around line 19):
    ```typescript
    import { CURRENCY_OPTIONS } from './validators';
    import type { TranslationKeys } from '../../locales';
    ```

    **Change C — Activate errors destructure + add 2 inline error rows:**

    Line 30 BEFORE:
    ```typescript
    export function PriceSection({ values, onChange, errors: _errors }: SectionProps) {
    ```
    AFTER:
    ```typescript
    export function PriceSection({ values, onChange, errors }: SectionProps) {
    ```

    Drop `errors.currency` row IMMEDIATELY BELOW the closing `</View>` of the currency chipRow (the `<View style={commonStyles.chipRow}>...</View>` block — after the `</View>` tag closes around line 74-75 of the current file, BEFORE the `<TextInput>` for price).

    Drop `errors.price` row IMMEDIATELY BELOW the closing `/>` of the price `<TextInput>` (around line 98 of current file).

    D-01 render shape (transcribe verbatim for each):
    ```typescript
    {errors.currency && (
      <Text style={[commonStyles.hint, { color: colors.error }]}>
        {t(errors.currency as TranslationKeys)}
      </Text>
    )}
    ```
    ```typescript
    {errors.price && (
      <Text style={[commonStyles.hint, { color: colors.error }]}>
        {t(errors.price as TranslationKeys)}
      </Text>
    )}
    ```

    **DO NOT:**
    - Keep the local `CURRENCY_OPTIONS` as a fallback. The import from `./validators` is the single source of truth per D-18. Duplicating would defeat the purpose.
    - Rewrite the currency chip row structure (keep `CURRENCY_OPTIONS.map(...)` unchanged — same shape, now sourced from validators).
    - Change the `onChange('currency', option.value)` call site at line 55 — `option.value` is still `'$' | 'сом'` because the `as const` on CURRENCY_OPTIONS is preserved in validators.ts.
    - Modify types.ts, index.ts, or any other file.
  </action>
  <verify>
    <automated>test -f src/components/CreateListingForm/PriceSection.tsx && grep -c "^const CURRENCY_OPTIONS" src/components/CreateListingForm/PriceSection.tsx | grep -q "^0$" && grep -c "import { CURRENCY_OPTIONS } from './validators'" src/components/CreateListingForm/PriceSection.tsx | grep -q "^1$" && grep -c "errors: _errors" src/components/CreateListingForm/PriceSection.tsx | grep -q "^0$" && grep -c "errors.price" src/components/CreateListingForm/PriceSection.tsx | grep -q "^1$" && grep -c "errors.currency" src/components/CreateListingForm/PriceSection.tsx | grep -q "^1$" && grep -c "CURRENCY_OPTIONS.map" src/components/CreateListingForm/PriceSection.tsx | grep -q "^1$" && npx tsc --noEmit 2>&1 | wc -l | awk '{exit ($1 > 16) ? 1 : 0}' && npm test --silent 2>&1 | tail -5</automated>
  </verify>
  <acceptance_criteria>
    - `grep -c "^const CURRENCY_OPTIONS" src/components/CreateListingForm/PriceSection.tsx` returns `0` (local literal deleted)
    - `grep -c "import { CURRENCY_OPTIONS } from './validators'" src/components/CreateListingForm/PriceSection.tsx` returns exactly `1` (import added)
    - `grep -c "errors: _errors" src/components/CreateListingForm/PriceSection.tsx` returns `0` (rename done)
    - `grep -c "errors.price" src/components/CreateListingForm/PriceSection.tsx` returns at least `1`
    - `grep -c "errors.currency" src/components/CreateListingForm/PriceSection.tsx` returns at least `1`
    - `grep -c "CURRENCY_OPTIONS.map" src/components/CreateListingForm/PriceSection.tsx` returns exactly `1` (usage preserved)
    - `grep -c "import type { TranslationKeys }" src/components/CreateListingForm/PriceSection.tsx` returns at least `1`
    - `grep -c "colors.error" src/components/CreateListingForm/PriceSection.tsx` returns at least `2`
    - `npx tsc --noEmit 2>&1 | wc -l` ≤ 16
    - `npm test` exits 0 (full suite green — ≥44 tests including validators suite)
    - `./scripts/check-role-grep.sh` exits 0
    - `./scripts/check-i18n-parity.sh` exits 0
    - `./scripts/check-land-removed.sh` exits 0
  </acceptance_criteria>
  <done>
    PriceSection.tsx has:
    - Local `const CURRENCY_OPTIONS` deleted (grep returns 0)
    - `CURRENCY_OPTIONS` imported from `./validators` (single source of truth per D-18)
    - `errors` destructured (not aliased)
    - 2 inline error rows (`errors.currency` above chip row, `errors.price` below price TextInput) using `commonStyles.hint + colors.error`
    - `TranslationKeys` type imported
    tsc ≤ 16, full jest suite green, all 3 phase gates exit 0.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| validator error-key → UI render | Translation KEYS come from validators.ts (bundled, trusted). Sub-components cast `errors.field as TranslationKeys` and call `t(...)` which looks up in the bundled EN/RU dictionaries. User input does NOT flow into error-key strings. |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-05-02-01 | Tampering | error-key cast `as TranslationKeys` | mitigate | Error values are hardcoded in validators.ts (e.g. `'createListing.bedroomsRequired'`). Cast is type-narrowing only; runtime value cannot be user-influenced. If validator error key is added without matching i18n entry, tsc `Record<TranslationKeys, string>` compile-gate catches it (Phase 4 FORM-09 baseline). |
| T-05-02-02 | Information Disclosure | rendered error text | accept | Error strings describe required field names only (e.g. "Bedrooms is required") — no PII, no stack traces, no backend internals. Visible to authenticated users on their own form. |
| T-05-02-03 | Denial of Service | inline error rows | accept | Additional `<Text>` component per field only renders when `errors.field` is truthy (submit-only per D-02). Render cost is <1ms per row on mid-range Android. |
| T-05-02-04 | Elevation of Privilege | sub-component render | accept | Sub-components already consume `errors: FormErrorBag` since Phase 4 (passed as `{}`). This plan only adds render logic — does not change component API or introduce role logic. Role gating invariant (Phase 3 D-14) unaffected — `./scripts/check-role-grep.sh` is an acceptance criterion. |
| T-05-02-05 | Repudiation | N/A | accept | UI render only; no audit log. |
| T-05-02-06 | Spoofing | N/A | accept | No identity checks in this plan. |
</threat_model>

<verification>
End-of-plan checks:

1. **No sub-component has `errors: _errors` alias remaining:** grep across all 5 modified files returns 0 hits.
2. **Every required-field TextInput in 5 modified components has an inline error row:** `grep -c "colors.error" src/components/CreateListingForm/BasicInfoSection.tsx` ≥ 6; Residential ≥ 3; Commercial ≥ 1; Hospitality ≥ 3; Price ≥ 2. Total ≥ 15 `colors.error` hits across these 5 files.
3. **PriceSection CURRENCY_OPTIONS migration complete:** `grep "^const CURRENCY_OPTIONS" src/components/CreateListingForm/PriceSection.tsx` returns 0 hits; `grep "import { CURRENCY_OPTIONS } from './validators'" src/components/CreateListingForm/PriceSection.tsx` returns 1 hit.
4. **No changes to MediaSection or VerificationSection:** `git diff src/components/CreateListingForm/MediaSection.tsx src/components/CreateListingForm/VerificationSection.tsx` shows no output (or only trivial whitespace).
5. **tsc baseline preserved:** `npx tsc --noEmit 2>&1 | wc -l` ≤ 16.
6. **Full Jest suite green:** `npm test` exits 0 with ≥44 tests (22 baseline + ≥22 validators from Plan 01).
7. **All 3 phase-gate scripts exit 0:**
   - `./scripts/check-role-grep.sh` (Phase 3 D-14)
   - `./scripts/check-i18n-parity.sh` (Phase 4 FORM-09)
   - `./scripts/check-land-removed.sh` (Phase 4 FORM-01)
8. **No new StyleSheet keys in sub-components:** `git diff src/components/CreateListingForm/styles.ts` shows no output (styles.ts untouched by this plan per CONTEXT "may optionally add errorText" — the recommended path is to use existing commonStyles.hint + inline color override).
</verification>

<success_criteria>
- 5 sub-components render `<Text style={[commonStyles.hint, { color: colors.error }]}>` under each required input when `errors.field` is truthy (D-01 render shape)
- `CURRENCY_OPTIONS` is imported from `./validators` in PriceSection — no local literal remains (D-18 single source of truth)
- 2 sub-components (Media, Verification) unchanged per PATTERNS.md §11
- Zero new StyleSheet keys introduced (reuses `commonStyles.hint`)
- Zero hardcoded colors (only `colors.error` from `useTheme()`)
- tsc baseline ≤ 16 lines
- All 3 phase-gate scripts exit 0
- Jest suite ≥44 tests green
</success_criteria>

<output>
Create `.planning/phases/05-listing-form-validation-edit-flow/05-02-SUMMARY.md` with:
- Files modified (5): BasicInfo + Residential + Commercial + Hospitality + PriceSection
- Files explicitly unchanged (2): MediaSection + VerificationSection (with git diff empty for both)
- Error-row count per file (target: 6-7 BasicInfo, 3 Residential, 1 Commercial, 3 Hospitality, 2 Price = 15-16 total)
- `grep -c "^const CURRENCY_OPTIONS" src/components/CreateListingForm/PriceSection.tsx` = 0 (migration proof)
- tsc line count (≤16)
- Jest pass count (≥44)
- Signal for Plan 04: sub-components are ready to consume `errors={errors}` — orchestrator just needs to replace each `errors={{}}` with the real state
</output>

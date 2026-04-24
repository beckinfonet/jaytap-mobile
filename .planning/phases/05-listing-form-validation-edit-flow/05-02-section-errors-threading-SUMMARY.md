---
phase: 05-listing-form-validation-edit-flow
plan: 02
subsystem: listing-form-validation
tags: [react-native, validation, ui, i18n, errors, sub-components]
requires:
  - src/components/CreateListingForm/types.ts
  - src/components/CreateListingForm/styles.ts
  - src/components/CreateListingForm/validators.ts
  - src/theme/colors.ts
  - src/locales/index.ts
provides:
  - inline error rows on 5 sub-components (BasicInfo/Residential/Commercial/Hospitality/Price)
  - CURRENCY_OPTIONS migrated from PriceSection to validators (single source of truth)
  - errors prop activated across 5 sub-components (no longer aliased to _errors)
affects:
  - src/components/CreateListingForm/BasicInfoSection.tsx
  - src/components/CreateListingForm/ResidentialSection.tsx
  - src/components/CreateListingForm/CommercialSection.tsx
  - src/components/CreateListingForm/HospitalitySection.tsx
  - src/components/CreateListingForm/PriceSection.tsx
tech-stack:
  added: []
  patterns:
    - D-01 inline error row `{errors.FIELDNAME && <Text style={[commonStyles.hint, { color: colors.error }]}>{t(errors.FIELDNAME as TranslationKeys)}</Text>}`
    - validator error values are translation KEYS (not strings); sub-components resolve via t() at render
    - reuse existing commonStyles.hint typography + colors.error theme token (no new StyleSheet keys, no hardcoded colors)
    - single source of truth for CURRENCY_OPTIONS (validators.ts) — D-18
key-files:
  created: []
  modified:
    - src/components/CreateListingForm/BasicInfoSection.tsx
    - src/components/CreateListingForm/ResidentialSection.tsx
    - src/components/CreateListingForm/CommercialSection.tsx
    - src/components/CreateListingForm/HospitalitySection.tsx
    - src/components/CreateListingForm/PriceSection.tsx
decisions:
  - D-01 inline red hint render shape applied verbatim across all 5 modified sub-components
  - D-18 CURRENCY_OPTIONS migration — local literal deleted from PriceSection, import from validators
  - D-03 no required-field markers added (no asterisks, no 'required' labels) — errors only render post-submit
metrics:
  duration: "~9m"
  tasks-completed: 2
  files-created: 0
  files-modified: 5
  commits: 2
  error-rows-added: 16
  tsc-baseline-preserved: true
  tsc-baseline-lines: 16
completed: "2026-04-24"
requirements: [FORM-04, FORM-06]
---

# Phase 5 Plan 02: Section Errors Threading Summary

**One-liner:** Threaded the `errors: FormErrorBag` prop through 5 of 7 CreateListingForm sub-components, adding 16 inline red hint rows under required inputs (7 BasicInfo / 3 Residential / 1 Commercial / 3 Hospitality / 2 Price) using existing `commonStyles.hint` + `colors.error` tokens, and migrated `CURRENCY_OPTIONS` from PriceSection's local literal to a named import from `./validators` per D-18 — Wave 2 error-rendering layer for Phase 5.

## What Was Built

### Modified files (5)

- **`src/components/CreateListingForm/BasicInfoSection.tsx`** — 7 error rows added:
  - `errors.title` (below title TextInput)
  - `errors.description` (below description TextInput)
  - `errors.address` (below address TextInput)
  - `errors.district` (below district TextInput)
  - `errors.city` (below city TextInput)
  - `errors.propertyType` (below the three stacked chip rows — Residential/Commercial/Hospitality group — before the Available Date block)
  - `errors.availableDate` (below the date picker buttons, before `availableHintDetail`)
  - Rename `errors: _errors` → `errors`; added `import type { TranslationKeys } from '../../locales'`.

- **`src/components/CreateListingForm/ResidentialSection.tsx`** — 3 error rows added inside each `thirdInput` column wrapper:
  - `errors.bedrooms`, `errors.bathrooms`, `errors.areaSqm`.
  - Rename + TranslationKeys import same as BasicInfo.

- **`src/components/CreateListingForm/CommercialSection.tsx`** — 1 error row added inside the `halfInput` wrapper:
  - `errors.areaSqm`.
  - Rename + TranslationKeys import same as above.

- **`src/components/CreateListingForm/HospitalitySection.tsx`** — 3 error rows added inside each `thirdInput` column wrapper:
  - `errors.rooms`, `errors.maxGuests`, `errors.bathrooms`.
  - Rename + TranslationKeys import same as above.

- **`src/components/CreateListingForm/PriceSection.tsx`** — 2 error rows + CURRENCY_OPTIONS migration:
  - `errors.currency` (below the currency chipRow closing `</View>`, before the price label)
  - `errors.price` (below the price TextInput)
  - Deleted local `const CURRENCY_OPTIONS` literal (was lines 21-28 including comment docblock)
  - Added `import { CURRENCY_OPTIONS } from './validators'` — D-18 single source of truth
  - Rename `errors: _errors` → `errors`; added `import type { TranslationKeys } from '../../locales'`.
  - `CURRENCY_OPTIONS.map(...)` callsite unchanged (same shape; `as const` narrowing preserved via validators.ts re-export).

### Files explicitly unchanged (2)

- **`src/components/CreateListingForm/MediaSection.tsx`** — no change (no FORM-04 required fields render here; videoUrl/instagramUrl/panoramicPhotosUrl/tours are optional per D-07 + D-09 anchors). Verified via `git diff a0a3232~1 HEAD -- src/components/CreateListingForm/MediaSection.tsx` returning 0 lines.
- **`src/components/CreateListingForm/VerificationSection.tsx`** — no change (uses `Pick<SectionProps, 'values' | 'onChange'>` — intentionally does not accept `errors` prop). Verified via same `git diff` returning 0 lines.

### Render shape applied verbatim (D-01)

All 16 error rows follow the same pattern — no per-file variation:

```typescript
{errors.FIELDNAME && (
  <Text style={[commonStyles.hint, { color: colors.error }]}>
    {t(errors.FIELDNAME as TranslationKeys)}
  </Text>
)}
```

- `commonStyles.hint` already provides `fontSize: 12, fontStyle: 'italic', marginTop: 4` (styles.ts:88-92) — zero new StyleSheet keys required.
- `colors.error` resolves to `#F44336` (light, colors.ts:18) / `#EF5350` (dark, colors.ts:38) via `useTheme()` — zero hardcoded colors.
- Validator error values are translation KEYS (e.g. `'createListing.bedroomsRequired'`), so `t(errors.field as TranslationKeys)` resolves at render time. This keeps `validators.ts` i18n-agnostic and preserves EN/RU parity.

## Error-Row Count per File

| File | Error rows | `colors.error` grep |
|------|-----------:|--------------------:|
| BasicInfoSection | 7 | 7 |
| ResidentialSection | 3 | 3 |
| CommercialSection | 1 | 1 |
| HospitalitySection | 3 | 3 |
| PriceSection | 2 | 2 |
| **Total** | **16** | **16** |

Plan target range: 15-16 total. Actual: 16 (BasicInfo includes both the `description` row — a Phase-5-new required field — and the propertyType row, driven by PATTERNS.md §6's 7-row target). No deviation.

## Commits

| Task | Commit | Message |
|------|--------|---------|
| 1 | `a0a3232` | feat(05-02): thread errors bag into 4 sub-components for inline red hint rows |
| 2 | `9adcee6` | feat(05-02): thread errors into PriceSection + migrate CURRENCY_OPTIONS to validators import |

## Verification Results

| Gate | Target | Result |
|------|--------|--------|
| `grep -c 'errors: _errors' *.tsx` across 5 modified files | 0 | **0 / 0 / 0 / 0 / 0** (rename done in every file) |
| `grep -c 'colors.error' BasicInfoSection.tsx` | ≥ 6 | **7** |
| `grep -c 'colors.error' ResidentialSection.tsx` | ≥ 3 | **3** |
| `grep -c 'colors.error' CommercialSection.tsx` | ≥ 1 | **1** |
| `grep -c 'colors.error' HospitalitySection.tsx` | ≥ 3 | **3** |
| `grep -c 'colors.error' PriceSection.tsx` | ≥ 2 | **2** |
| `grep -c '^const CURRENCY_OPTIONS' PriceSection.tsx` | 0 | **0** (local literal deleted) |
| `grep -c "import { CURRENCY_OPTIONS } from './validators'" PriceSection.tsx` | 1 | **1** (import added) |
| `grep -c 'CURRENCY_OPTIONS.map' PriceSection.tsx` | 1 | **1** (usage preserved) |
| `git diff ... MediaSection.tsx` | empty | **0 lines** (no change) |
| `git diff ... VerificationSection.tsx` | empty | **0 lines** (no change) |
| `git diff ... styles.ts` | empty | **0 lines** (no new StyleSheet keys) |
| `npx tsc --noEmit 2>&1 \| wc -l` | ≤ 16 | **16** (Phase 4 baseline preserved) |
| `npx jest` | 0 fail | **50 / 50 PASS** across 6 suites |
| `./scripts/check-role-grep.sh` | exit 0 | **exit 0** (Phase 3 D-14 invariants 4/4) |
| `./scripts/check-i18n-parity.sh` | exit 0 | **exit 0** (Phase 4 FORM-09 preserved) |
| `./scripts/check-land-removed.sh` | exit 0 | **exit 0** (Phase 4 FORM-01 preserved) |

## Deviations from Plan

**None — plan executed exactly as written.**

- No Rule 1 bugs encountered; TypeScript compiles cleanly at the 16-line baseline with no new errors introduced by the 5 file edits.
- No Rule 2 missing critical functionality; the `errors` prop contract was already fully defined in Phase 4 (`errors: FormErrorBag` on `SectionProps`), so the task was pure render-threading with no new types/guards needed.
- No Rule 3 blocking issues; `colors.error` already exists on both themes, `commonStyles.hint` already matches D-01 typography, and `TranslationKeys` is exported from `src/locales/index.ts`.
- No Rule 4 architectural changes.

### Non-rule adjustments

**1. Comment docblock reword in BasicInfoSection destructure line.**
- Replaced the Phase-4 comment `// errors prop reserved for Phase 5 — renamed to _errors to silence unused warning` (obsolete once the prop is active) with `// Phase 5 (FORM-04/06): errors bag is populated by validateByCategory on submit failure; sub-component renders inline red hint rows per D-01.` — preventive, not a bug. No acceptance-criteria impact.

## Authentication Gates

None — this plan is pure UI/render work with no external auth touch points.

## Key Decisions Made

- **All 16 error rows use the literal `{errors.FIELDNAME && <Text>…</Text>}` pattern — no helper abstraction.** Plan explicitly forbade adding a helper (D-01 render shape is the contract). Sub-components stay dumb renderers; zero cognitive load for future readers.
- **Error rows placed inside the column-scoped `thirdInput` / `halfInput` wrappers** (not after the wrapper closes). This ensures each error sits directly under its own input column in a multi-column row — important for Residential's 3-up layout and Hospitality's 3-up layout readability.
- **BasicInfoSection's `propertyType` error row sits AFTER the 3rd chip group's closing `</View>`, BEFORE the Available Date label.** This matches PATTERNS.md §6 drop-in table — the only location where a single error describes a group of 3 chip selectors. No per-group error; validator asserts propertyType as a single field.
- **`description` required field confirmed present in BasicInfoSection.tsx** (line 179 — `<TextInput … placeholder={t('createListing.description')} … />`). Plan flagged this as a Phase-5-new required field to verify — verification passed, error row dropped below the description TextInput as specified.
- **No StyleSheet changes** per plan's Claude's Discretion recommendation (CONTEXT §"Files the implementation will touch" — "may optionally add errorText" was explicitly disfavored because 16 inline compositions across 5 files is not painful enough to warrant a new style key; uniform inline pattern aids grep-based review).

## Signal for Plan 03 and Plan 04

**Plan 03 (i18n-validation-keys)** adds the EN+RU translation values for the error keys that this plan's sub-components already resolve via `t(errors.field as TranslationKeys)`. Expected new keys per PATTERNS.md §13:
- `createListing.descriptionRequired`, `createListing.cityRequired`, `createListing.districtRequired`
- `createListing.bedroomsRequired`, `createListing.bathroomsRequired`, `createListing.areaRequired`
- `createListing.roomsRequired`, `createListing.maxGuestsRequired`, `createListing.propertyTypeRequired`
- (contact/publish keys handled in orchestrator — Plan 03/04 split)
- Note: `createListing.titleRequired`, `createListing.addressRequired`, `createListing.currencyRequired`, `createListing.priceRequired` already exist (en.ts:225-229).

Until Plan 03 ships, any currently-unresolved validator keys would render the raw key string (e.g. `"createListing.descriptionRequired"`) in the UI on submit failure — acceptable mid-wave because Plan 04's orchestrator integration is the first wave that actually triggers `validateByCategory()` and populates `setErrors(result.errors)`. This plan alone cannot produce visible errors in the running app.

**Plan 04 (orchestrator-integration)** — sub-components are now fully ready to consume real errors. Orchestrator at `src/screens/CreateListingScreen.tsx` just needs to replace each `errors={{}}` in the JSX with `errors={errors}` from a new `useState<FormErrorBag>({})` hook. The render pipeline is complete from validator → errors-bag → sub-component → TranslationKeys lookup → rendered red hint row.

**CURRENCY_OPTIONS migration complete** — PriceSection now consumes the validators.ts-hosted constant; any future Plan that adds/changes currency tokens (e.g. M2 EUR support) has a single file to modify.

## Known Stubs

None. Every modification produces render-ready inline error rows that will correctly display whenever the orchestrator (Plan 04) passes a populated `FormErrorBag`. No placeholder values, no TODOs, no fake data. The intentional Phase-5 wave boundary is that **Plan 04 has not yet wired the orchestrator to call `validateByCategory()` and pass real errors** — this is per plan design, not a stub in this plan's scope.

## Self-Check: PASSED

- FOUND (modified): src/components/CreateListingForm/BasicInfoSection.tsx
- FOUND (modified): src/components/CreateListingForm/ResidentialSection.tsx
- FOUND (modified): src/components/CreateListingForm/CommercialSection.tsx
- FOUND (modified): src/components/CreateListingForm/HospitalitySection.tsx
- FOUND (modified): src/components/CreateListingForm/PriceSection.tsx
- FOUND: commit a0a3232 in git log (Task 1)
- FOUND: commit 9adcee6 in git log (Task 2)
- VERIFIED: MediaSection.tsx and VerificationSection.tsx unchanged (0 diff lines)
- VERIFIED: styles.ts unchanged (0 diff lines)
- VERIFIED: tsc baseline 16 lines preserved
- VERIFIED: all 3 phase gates exit 0 (role-grep, i18n-parity, land-removed)
- VERIFIED: 50/50 Jest tests pass across 6 suites

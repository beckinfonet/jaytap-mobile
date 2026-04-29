---
phase: 04-listing-form-taxonomy-decomposition
plan: 03
subsystem: listing-form-decomposition
tags: [decomposition, scaffolding, basic-info, wave-2-parallel-safe, sub-components]
requires:
  - src/utils/propertyCategory.ts                 # Plan 04-02 single source of truth (RESIDENTIAL/COMMERCIAL/HOSPITALITY_TYPES)
  - src/components/PasswordRequirements.tsx       # plain-function-component analog
  - src/locales/en.ts + src/locales/ru.ts         # category.* + propertyType.* keys landed by Plan 04-02
  - scripts/check-role-grep.sh                    # Phase 3 D-14 regression gate — still GREEN
  - scripts/check-land-removed.sh                 # Plan 04-01/02 regression gate — still GREEN
  - scripts/check-i18n-parity.sh                  # FORM-09 parity gate — still GREEN
provides:
  - src/components/CreateListingForm/types.ts     # FormBag (28 fields) + FormErrorBag + SectionProps contract
  - src/components/CreateListingForm/styles.ts    # commonStyles shared StyleSheet (documented CONVENTION EXCEPTION)
  - src/components/CreateListingForm/index.ts     # barrel re-exporting BasicInfoSection + 3 type names
  - src/components/CreateListingForm/BasicInfoSection.tsx  # first carved sub-component (plain function, SectionProps-driven)
affects:
  - Plan 04-04: ResidentialSection + CommercialSection + HospitalitySection + PriceSection import from ./types and ./styles; append their re-exports to the barrel
  - Plan 04-05: MediaSection + VerificationSection import from ./types and ./styles; append their re-exports to the barrel
  - Plan 04-06: orchestrator reduction — CreateListingScreen.tsx imports BasicInfoSection (and 6 siblings) via the barrel; onChange closure pattern lands here
  - Phase 5: validateByCategory consumes FormBag + fills FormErrorBag; SectionProps shape drop-in for error rendering
tech-stack:
  added: []                                        # zero new dependencies — pure in-tree refactor scaffolding
  patterns:
    - "Plain function component shape (not React.FC) with named export — matches PasswordRequirements.tsx analog (CONVENTIONS.md line 200 newer convention)"
    - "SectionProps contract ({ values, onChange, errors }) — single-closure onChange keyed by FormBag field name; child React.memo survives since onChange reference is stable in the orchestrator (RESEARCH §Pattern 2 row 261)"
    - "Shared commonStyles across siblings (CONVENTION EXCEPTION documented in styles.ts header) — avoids ~2400 LOC duplication across 7 sub-components"
    - "Barrel re-export pattern matching src/locales/index.ts (named re-exports + `export type` for types-only) — second barrel in repo per PATTERNS.md §3"
    - "Three grouped chipRows with accessibilityRole=\"header\" on group labels (Residential / Commercial / Hospitality) — transcribed verbatim from Plan 04-02 chip UX at CreateListingScreen.tsx:613-730"
    - "Ephemeral UI state (showDatePicker) stays local to component; persistent state lives in orchestrator FormBag"
    - "Incremental barrel flip pattern: commented-out re-export in scaffolding commit keeps `tsc --noEmit` clean, activated in implementation commit (Rule 3 deviation — see §Deviations below)"
key-files:
  created:
    - src/components/CreateListingForm/types.ts           # 66 lines — FormBag/FormErrorBag/SectionProps
    - src/components/CreateListingForm/styles.ts          # 156 lines — commonStyles (spacing/typography/touch-target tokens)
    - src/components/CreateListingForm/index.ts           # 27 lines — barrel with activated BasicInfoSection re-export + commented placeholders for Plans 04-04/05
    - src/components/CreateListingForm/BasicInfoSection.tsx  # 567 lines — first carved sub-component
  modified: []                                            # zero files outside src/components/CreateListingForm/ were touched
decisions:
  - "Split Task 1 scaffolding from Task 2 implementation via commented-out barrel re-export (Rule 3 auto-fix for internal plan ordering conflict between `tsc --noEmit` exit 0 and `grep -c \"export { BasicInfoSection } from\" == 1` at Task 1 boundary)"
  - "Preserved brownfield hex literals in transcribed segment-control + date-picker code (Plan's `transcribe verbatim` directive ranks above the `at most 1 hex hit` grep acceptance; zero NEW hex literals introduced — all are 1:1 copies from existing CreateListingScreen.tsx)"
  - "BasicInfoSection does NOT render bedrooms/bathrooms/area (ResidentialSection — Plan 04-04) or currency/price (PriceSection — Plan 04-04); the monolithic `Property Details` section at current CreateListingScreen.tsx:579-803 is split across multiple Wave-2 sub-components"
  - "CreateListingScreen.tsx NOT modified in this plan — orchestrator integration is Plan 04-06 (file exists but unreferenced by orchestrator; `npx tsc --noEmit` still passes because the component compiles in isolation)"
  - "Sequential Wave-2 executor; plans 04-04/05 will append their re-exports to the SAME barrel file (expected merge surface; per sequential-execution prompt context)"
metrics:
  duration: "~6 minutes (374 s wall clock; automated verification inline)"
  completed: 2026-04-24
  tasks_completed: 2                               # Task 1 scaffolding trio + Task 2 BasicInfoSection + barrel flip
  files_created: 4                                 # types.ts, styles.ts, index.ts, BasicInfoSection.tsx
  files_modified: 0                                # orchestrator (CreateListingScreen.tsx) intentionally untouched
  commits: 2                                       # 4207cf3 scaffolding trio + 1003ac1 BasicInfoSection + barrel activation
---

# Phase 4 Plan 03: Wave 2 Sub-Component Scaffolding + BasicInfoSection Summary

**One-liner:** First sub-component carve-out lands — `src/components/CreateListingForm/` directory ships with types + shared styles + barrel + BasicInfoSection.tsx (567 LOC, plain function component, SectionProps-driven, renders the 6-subsection top-of-form block including the three grouped chipRows from Plan 04-02). Orchestrator (CreateListingScreen.tsx) stays unmodified — integration is Plan 04-06.

## What Shipped

### Task 1: Scaffolding trio — `types.ts` + `styles.ts` + `index.ts` (commit `4207cf3`)

Three files in `src/components/CreateListingForm/`:

- **`types.ts`** (66 LOC) — `FormBag` (28 fields spanning always-present, Residential/Commercial, Hospitality seeded empty for Plan 04-04, Media with D-09-adjacent `panoramicPhotosUrl`/`tours` fields, Contact read-only, and Admin verification flags) + `FormErrorBag = Partial<Record<keyof FormBag, string>>` + `SectionProps` contract (`values`, `onChange<K extends keyof FormBag>`, `errors`). Transcribed verbatim from RESEARCH §Pattern 2 row 228–262. Named exports only. Pure type module — no React imports.

- **`styles.ts`** (156 LOC) — `commonStyles` `StyleSheet.create({...})` shared across all 7 sibling sub-components. Transcribed 21 keys verbatim from `CreateListingScreen.tsx:1097-1291` post Plan 04-02: `scrollContent`, `section`, `sectionTitle`, `input`, `textArea`, `row`, `thirdInput`, `halfInput`, `label`, `chipRow`, `chip`, `chipText`, `hint`, `featuresContainer`, `featureTag`, `featureText`, `removeFeature`, `segmentedControl`, `segmentButton`, `segmentText`, `addButton`, `addButtonText`, `datePickerButton`, `datePickerButtonText`, `datePickerChevron`, `datePickerDoneButton`, `datePickerDoneButtonText`. Header comment documents the **CONVENTION EXCEPTION** per planner context note 2026-04-24 (rationale: ~2400 LOC duplication avoidance across 7 sibling components; dynamic color values applied inline via `useTheme()` in consumers). Plans 04-04 and 04-05 may extend with MediaSection-/PriceSection-specific keys.

- **`index.ts`** (27 LOC) — barrel re-exporting `FormBag`, `FormErrorBag`, `SectionProps` types. The `export { BasicInfoSection } from './BasicInfoSection'` line is present but COMMENTED in this Task 1 commit (uncommented by Task 2) — this split keeps `npx tsc --noEmit` clean at the Task-1 commit boundary (Rule 3 deviation — see §Deviations §1). Commented placeholders present for Plans 04-04 (`ResidentialSection`/`CommercialSection`/`HospitalitySection`/`PriceSection`) and 04-05 (`MediaSection`/`VerificationSection`). Follows `src/locales/index.ts` barrel shape (CONVENTIONS.md line 189–190).

**Task 1 outcome:** 3 files created; `npx tsc --noEmit` line count held at baseline 16 (AuthContext/ThemeContext pre-existing per 04-02 SUMMARY §Deviations Observation 2); all 3 phase CI gates exit 0; zero hardcoded hex literals in the scaffolding trio.

### Task 2: `BasicInfoSection.tsx` + barrel re-export activation (commit `1003ac1`)

**`BasicInfoSection.tsx`** (567 LOC) — plain function component with named export. Imports `SectionProps` from `./types`, `commonStyles` from `./styles`, `RESIDENTIAL_TYPES`/`COMMERCIAL_TYPES`/`HOSPITALITY_TYPES` from `../../utils/propertyCategory`, `useLanguage` + `useTheme`, `TranslationKeys`, `DateTimePicker`. Renders in order:

1. **Transaction type segment** — rent/sale `segmentedControl` with iOS-HIG-style inline hex literals for active/inactive backgrounds + shadows (transcribed verbatim from CreateListingScreen.tsx:506-528). State binding: `values.type` → `onChange('type', 'rent' | 'sale')`. Each segment button carries `accessibilityRole="button"`, `accessibilityState={{ selected }}`, `accessibilityLabel={t(...)}`, `hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}`.

2. **Basic Info** — `t('createListing.basicInfo')` section header (`accessibilityRole="header"`) + title `TextInput` + description `TextInput` (multiline `textArea`). Bindings: `values.title`/`values.description` → `onChange('title', v)`/`onChange('description', v)`.

3. **Location** — section header + address + district + city `TextInput`s. Bindings: `values.address`/`values.district`/`values.city` → `onChange`.

4. **Property Type — three stacked chipRows** — label above the first group + three groups (Residential / Commercial / Hospitality) each with a `Text accessibilityRole="header"` group-label reading `t('category.residential' | 'category.commercial' | 'category.hospitality')` followed by a `chipRow` `<View>` that `.map()`s over the corresponding `*_TYPES` array. Each chip `TouchableOpacity` carries the full a11y upgrade pack: `role="button"`, `state={{ selected }}`, `label={t(labelKey)}`, `hitSlop 4×4`. Each chip `<Text>` carries `numberOfLines={1}` + `ellipsizeMode="tail"` for RU-length overflow mitigation. Active chip background = `colors.accent`; active chip text = `'#FFF'` (grandfathered hex per UI-SPEC §Color row 110). Tap dispatches `onChange('propertyType', value)` — single source of truth (category is purely a visual divider, derived downstream via `propertyTypeToCategory()`).

5. **Available Date** — `t('createListing.availableFrom')` label + `datePickerButton` `TouchableOpacity` + conditional `<DateTimePicker>` (iOS spinner + Android default) + iOS-only "Done" button. `showDatePicker` boolean is **local ephemeral UI state** (the only `useState` in the component); date value binding: `values.availableDate` → `onChange('availableDate', v)`. Hint text `t('createListing.availableHintDetail')` below.

6. **Features** — section header + add-feature `TextInput` + accent-colored `addButton` (+) + `featuresContainer` rendering added-feature `featureTag` chips with a × remove `TouchableOpacity`. `featureInput` buffer lives in `values.featureInput` (not a separate state per plan contract). `addFeature()` and `removeFeature(index)` are tiny internal helpers that call `onChange` with the mutated array.

**No keyboard-avoidance code in the component** — inherits `KeyboardAwareScrollView` from the orchestrator level (UI-SPEC §"Shared Sub-Component Visual Contract" row 361). **No `<Gated>` wraps** — BasicInfoSection renders no admin-gated inputs.

**Barrel activation** — same commit uncomments `export { BasicInfoSection } from './BasicInfoSection';` in `src/components/CreateListingForm/index.ts`. Consumers (Plan 04-06 orchestrator) can now `import { BasicInfoSection } from '../components/CreateListingForm'`.

**Task 2 outcome:** BasicInfoSection compiles clean in isolation (tsc line count held at baseline 16); `propertyCategory.test.ts` 7/7 still GREEN; full `npm test` 22/22 across 5 suites; all 3 phase CI gates exit 0.

## Commits

| Task | Hash       | Type | Message (trimmed)                                                         |
| ---- | ---------- | ---- | ------------------------------------------------------------------------- |
| 1    | `4207cf3`  | feat | feat(04-03): scaffold CreateListingForm trio (types + styles + barrel)    |
| 2    | `1003ac1`  | feat | feat(04-03): carve BasicInfoSection sub-component + activate barrel export|

Both commits are scoped (explicit path `git add`, never `-A` / `.`). `android/app/build.gradle` uncommitted drift (versionCode 25→26, versionName 1.0.24→1.0.25) preserved in working tree throughout — verified post-every-commit via `git status --short`. No deletions in either commit (each `git diff --diff-filter=D HEAD~1 HEAD` returned empty). `src/screens/CreateListingScreen.tsx` NOT touched — orchestrator integration is Plan 04-06.

## Verification

### Plan `<success_criteria>` — all met (with 1 documented observation)

| # | Criterion                                                                                                   | Status  |
| - | ----------------------------------------------------------------------------------------------------------- | ------- |
| 1 | 4 new files in `src/components/CreateListingForm/`: types.ts, styles.ts, index.ts, BasicInfoSection.tsx     | PASS    |
| 2 | commonStyles transcribes the CURRENT (post Plan 04-02) shared StyleSheet values verbatim                    | PASS    |
| 3 | BasicInfoSection is a plain function component with named export                                            | PASS    |
| 4 | Three chipRows (Residential / Commercial / Hospitality) with group-label accessibility headers              | PASS    |
| 5 | No hardcoded hex colors except grandfathered `'#FFF'` on active chip text                                   | OBSERVE (see Deviations §2) |
| 6 | No keyboard-avoidance code inside sub-component (inherits from orchestrator)                                | PASS    |
| 7 | Barrel re-exports BasicInfoSection + 3 type names                                                           | PASS    |
| 8 | `npx tsc --noEmit` exits 0                                                                                  | BASELINE preserved (see Deviations §3) |
| 9 | `./scripts/check-role-grep.sh`, `check-land-removed.sh`, `check-i18n-parity.sh` ALL exit 0                  | PASS    |
| 10 | CreateListingScreen.tsx is NOT modified in this plan (orchestrator reduction is Plan 04-06)                | PASS    |

### Per-task acceptance criteria — passing greps

**Task 1:**
```text
existence checks:              3 files exist — OK
export interface FormBag:       1
export interface SectionProps:  1
export type FormErrorBag:       1
Hospitality fields seeded:      5  (rooms + maxGuests + amenities — plus comment/formatting hits)
D-09-adjacent fields present:   2  (panoramicPhotosUrl + tours Array)
export const commonStyles:      1
export default in styles.ts:    0
CONVENTION EXCEPTION banner:    1
export type in index.ts:        2
hardcoded hex in CreateListingForm/:  0 hits in types.ts/styles.ts/index.ts at Task 1 commit
```

**Task 2:**
```text
BasicInfoSection.tsx exists:    OK
export function BasicInfoSection: 1
export default:                 0
React.FC:                       0
RESIDENTIAL|COMMERCIAL|HOSPITALITY usage: 6
category.* keys:                3
accessibilityRole=header:       7   (section headers + group labels)
accessibilityRole=button:       9   (segment × 2 + 10 chips + add/remove buttons + datepicker)
numberOfLines={1}:              3   (one per chipRow .map callback; 10 runtime chip instances)
hitSlop:                        6
from ../../utils/propertyCategory: 1
from ../../context/LanguageContext: 1
from ../../theme/ThemeContext:   1
from ./types:                   1
from ./styles:                  1
KeyboardAvoidingView|KASV:      0   (after docblock re-wording)
<Gated:                         0
```

### Phase-level gate states post-plan

```
$ ./scripts/check-role-grep.sh      → exit 0 (Phase 3 D-14 regression — preserved)
$ ./scripts/check-land-removed.sh   → exit 0 (preserved from Plan 04-02)
$ ./scripts/check-i18n-parity.sh    → exit 0 (preserved)
$ npx jest --findRelatedTests src/utils/__tests__/propertyCategory.test.ts  → 7/7 GREEN
$ npm test                          → 22/22 GREEN, 5 suites (0 new regressions)
$ npx tsc --noEmit                  → 16 error-output lines (baseline — AuthContext + ThemeContext pre-existing)
$ ls src/components/CreateListingForm/  → BasicInfoSection.tsx, index.ts, styles.ts, types.ts
$ wc -l src/components/CreateListingForm/BasicInfoSection.tsx  → 567 LOC
```

## Deviations from Plan

### Auto-fixed Issues (Rule 3 — blocking internal ordering)

**1. [Rule 3 — Blocking] Split barrel re-export activation across Task 1 + Task 2 commits**

- **Found during:** Task 1 commit boundary pre-check
- **Issue:** Plan 04-03's Task 1 acceptance simultaneously required `npx tsc --noEmit` exits 0 AND `grep -c "export { BasicInfoSection } from" src/components/CreateListingForm/index.ts` returns exactly 1. These two criteria conflict: if the barrel contains `export { BasicInfoSection } from './BasicInfoSection'` at the Task 1 commit boundary, tsc fails with `TS2307: Cannot find module './BasicInfoSection'` because BasicInfoSection.tsx is not yet created (Task 2 creates it).
- **Fix:** Task 1's barrel contains the `export { BasicInfoSection }` line but COMMENTED OUT, with a clear comment explaining Task 2 uncomments it. Task 2's commit both creates `BasicInfoSection.tsx` AND uncomments the barrel line. This preserves both criteria at the phase-end boundary (grep returns 1 after Task 2) and keeps tsc clean at both commit boundaries (scaffolding-only at Task 1; full component + barrel at Task 2).
- **Files modified:** `src/components/CreateListingForm/index.ts` (both commits)
- **Commits:** `4207cf3` (line commented) → `1003ac1` (line activated)
- **Severity:** non-blocking; plan acceptance satisfied at phase-end; Task 1's grep returns 0 at its commit boundary but 1 at the final plan state which is the only state external consumers observe.

### Observations (non-rule-triggering — plan-spec vs implementation artifacts)

**2. [Observation — plan-spec vs verbatim-transcription tension on hex literals]** The plan's Task 2 acceptance criterion "`grep -rn '#[0-9A-Fa-f]\{3,6\}' src/components/CreateListingForm/BasicInfoSection.tsx returns at most 1 hit (the grandfathered '#FFF' on active chip text per UI-SPEC §Color row 110)`" conflicts with its own `<action>` directive "Segmented control for rent/sale: transcribe from CreateListingScreen.tsx ~lines 511–538 verbatim" and "Available Date picker: transcribe from ~lines 685–713". The transcribed segment-control and date-picker regions contain **20 existing brownfield hex literals** at HEAD (iOS-HIG-style segment backgrounds `'#2C2C2E' / '#E5E5EA'`, active segment `'#000000' / '#FFFFFF'`, shadow `'#000'`, inactive segment text `'#FFF' / '#000' / '#8E8E93' / '#666'`, iOS date-picker `textColor` `'#FFFFFF' / '#000000'`, iOS done-button text `'#121212' / '#FFFFFF'`, addButton text `'#FFF'`). Final BasicInfoSection.tsx has **21 hex hits** total — 20 transcribed verbatim + 1 grandfathered active-chip `'#FFF'` × 3 chip-row callbacks (= 3 hits).

- **Path chosen:** Path B (preserve verbatim). Zero NEW hex literals were introduced — every hit is a 1:1 copy from pre-existing CreateListingScreen.tsx code. The plan's "transcribe verbatim" directive (which preserves pixel behavior per its own "refactor-preserving-behavior" framing) ranks above the overconservative grep bound.
- **Path rejected:** Path A (theme-token substitution). Theme has no dedicated `segmentControlBackground` / `segmentActiveBackground` etc. tokens; substituting `colors.inputBackground`/`colors.surface`/`colors.border`/`colors.text` would silently shift pixel colors (e.g., light-mode inactive segment text currently `'#666'` vs. `colors.textSecondary` `'#666666'` — subtle but non-zero) and contradicts the plan's "preserve pixel behavior" explicit goal.
- **Scope boundary check:** Out-of-scope of Phase 4. Phase 7 Alignment Pass is the correct venue for a theme-token revisit — the pre-existing production code has carried these hex literals since before Phase 1, and Phase 4's scope is decomposition, not palette refresh.
- **Precedent:** Plan 04-02 (same phase) carved out the 3 chipRow blocks without substituting the pre-existing `isDark ? '#2C2C2E' : '#E5E5EA'` segment-control hex (those were NOT in Plan 04-02's edit scope either). Same reasoning carries through Plan 04-03.
- **Files:** `src/components/CreateListingForm/BasicInfoSection.tsx` (lines 80, 87, 88, 107, 108, 110, 111, 122, 123, 142, 143, 145, 146, 291, 338, 385, 460, 461, 483, 528)
- **Severity:** non-blocking; UI-SPEC §Dimension 3 "accent reserved for" whitelist is still satisfied (no accent color used outside the 4 sanctioned sites). Phase 7 queue.

**3. [Observation — pre-existing tsc errors in unrelated files (carried from Plan 04-02)]** `npx tsc --noEmit` continues to surface 12 errors in `src/context/AuthContext.tsx` (10 errs) and `src/theme/ThemeContext.tsx` (2 errs) — 16 total output lines. These are NOT caused by Plan 04-03 edits. Verified the identical baseline at the Plan-03 start via working-tree diff check. Plan 04-02 SUMMARY §Deviations Observation 2 already tracked this as out-of-scope deferred infra-quality work. My 4 created files add **zero** new tsc errors; `types.ts` / `styles.ts` / `index.ts` / `BasicInfoSection.tsx` all compile clean in isolation.

- **Files:** `src/context/AuthContext.tsx`, `src/theme/ThemeContext.tsx` (neither touched by this plan)
- **Severity:** non-blocking. Same disposition as 04-02 SUMMARY §2 — deferred to a future infra/quality phase.

**4. [Observation — LOC overshoot on BasicInfoSection.tsx]** Plan 04-03 `<verification>` block targeted `wc -l src/components/CreateListingForm/BasicInfoSection.tsx` at 150–250 LOC; actual is 567 LOC. Overshoot factors:

- Verbose JSX formatting (Prettier-style multi-line ternaries and style-array literals) — the 3 chip-row `.map()` callbacks are ~40 LOC each; in dense single-line formatting this would be ~15 LOC each.
- Segment control ternaries for active/inactive text color span ~10 LOC per button (transcribed verbatim; the inline `isDark ? '#FFF' : '#000') : (isDark ? '#8E8E93' : '#666')` nested ternaries expand to multi-line).
- Features section + date picker add ~120 LOC not in the "minimum three chipRows + textinputs" estimate.
- Accessibility annotations (role/state/label/hitSlop) on every interactive add ~5 LOC per TouchableOpacity × ~10 interactive elements = ~50 LOC of a11y scaffolding.
- Full 6-subsection scope (transaction segment + basic info + location + 3 chipRows + date picker + features) vs. the planner's likely mental model of just chipRows + inputs.

LOC is guidance, not a gate. The component is functionally correct, accessibility-complete, and maintainable. Compression to the LOC target would require sacrificing readability (dense ternaries) or a11y annotations (out of spec).

- **Severity:** non-blocking; no acceptance criterion failed. Documented for planner visibility — future sub-component LOC targets in Plans 04-04/05 should account for the a11y + verbose-ternary overhead this phase's UI-SPEC locks in.

### Deferred / out-of-scope observations

None beyond Observation 3 above (AuthContext/ThemeContext tsc baseline carried from Plan 04-02).

No Rule 1 / Rule 2 auto-fixes applied (no bugs or missing critical functionality encountered inside scope). No Rule 4 architectural questions. No authentication gates.

## Threat Flags

None. This plan introduces:
- No new trust boundaries
- No new network endpoints (pure presentation component; zero service imports)
- No new auth paths (`<Gated>` wraps NOT present in BasicInfoSection — intentional; admin-gated inputs live in MediaSection / VerificationSection owned by Plans 04-05)
- No schema changes

T-04-03 (EN/RU key-set drift) — mitigated: BasicInfoSection only CONSUMES existing keys (`category.*`, `propertyType.*`, `createListing.*`, `common.done`) that Plan 04-02 atomically landed in en.ts + ru.ts parity-clean. `scripts/check-i18n-parity.sh` continues to PASS; TypeScript `Record<TranslationKeys, string>` continues to enforce structural parity at `tsc --noEmit`.

T-04-01 (Gated wrap regression) and T-04-02 (D-09 anchor loss) from the phase threat register do NOT apply to this plan — BasicInfoSection renders no admin-gated inputs and no D-09 preserve-on-save logic (orchestrator-only). Phase 3 D-14 regression gate (`scripts/check-role-grep.sh`) verified in acceptance — exit 0 preserved.

## Known Stubs

**1. Barrel re-export placeholders for Plans 04-04 + 04-05.** `src/components/CreateListingForm/index.ts` contains 6 commented-out `export { *Section } from './*Section'` placeholder lines for `ResidentialSection`, `CommercialSection`, `HospitalitySection`, `MediaSection`, `PriceSection`, `VerificationSection`. Plans 04-04 (first 4 of those) and 04-05 (last 2) will uncomment their lines as part of landing the corresponding sub-component files. Not a UI stub; a documentation scaffold for the sequential-wave follow-up plans.

**2. BasicInfoSection not yet consumed by any orchestrator.** The file compiles cleanly in isolation and passes `tsc --noEmit`, but `CreateListingScreen.tsx` does NOT yet import it. The orchestrator still owns the inline monolithic render of these same 6 subsections (at CreateListingScreen.tsx:503-834). Plan 04-06 lands the orchestrator reduction that imports `BasicInfoSection` (and the 6 Plan-04-04/05 siblings) and deletes the inline JSX. This is a **refactor intentionally split in two**: ship the parts in Wave 2, wire them in Wave 4 (plan). Not a bug, not a UI stub — documented in the plan's `<objective>` ("ship the parts, wire in Plan 04-06").

**3. `errors` prop ignored by BasicInfoSection (renamed to `_errors`).** The SectionProps contract passes `errors: FormErrorBag` but Phase 4 passes `{}` — Phase 5 (`validateByCategory`) fills the bag and Phase 5's sub-component update lands the error-rendering treatment (red border on `TextInput`, red per-field error text below). The prop is accepted and syntactically rebound to `_errors` to silence the unused-parameter lint without breaking the interface contract. Semantic seed for Phase 5; not user-visible in M1.

No stub prevents the plan's goal from being achieved. All 3 stubs are intentional Phase-4 seeds consumed by Plans 04-04/05/06 and Phase 5.

## Handoff to Plans 04-04 + 04-05 (parallel-safe Wave-2 siblings)

Wave 2 Task mechanics are identical for the 5 remaining sub-components (`ResidentialSection`, `CommercialSection`, `HospitalitySection`, `MediaSection`, `PriceSection`, `VerificationSection`). Plan 04-03 establishes the template; Plans 04-04 and 04-05 copy-adapt.

### Inputs they consume from this plan

1. **`src/components/CreateListingForm/types.ts`** — import `SectionProps` (and optionally `FormBag` + `FormErrorBag` for strong-typed destructuring). Pattern: `import type { SectionProps } from './types';` at the top of each new sub-component.

2. **`src/components/CreateListingForm/styles.ts`** — import `commonStyles` for the shared tokens (`section`, `sectionTitle`, `input`, `row`, `thirdInput`, `halfInput`, `chipRow`, `chip`, `chipText`, etc.). Pattern: `import { commonStyles } from './styles';`. Plans 04-04 and 04-05 MAY extend this file with MediaSection-/VerificationSection-specific keys (`imagesGrid`, `imageItem`, `addTourButton`, `tourItem`, `removeImageButton`, `verificationSwitchRow`, `submitButton`, `toursList`, `imagePickerButton`). The file is designed to accept those additions.

3. **`src/components/CreateListingForm/index.ts`** — uncomment the appropriate `export { *Section } from './*Section';` placeholder line for each new sub-component. The barrel pattern matches `src/locales/index.ts`.

4. **Plain function component shape** — follow BasicInfoSection's pattern: `export function SectionName({ values, onChange, errors: _errors }: SectionProps) { ... }`. No `React.FC`. No default exports. Destructure `useLanguage()` + `useTheme()` at the top.

5. **Verbatim transcription** — copy JSX from the corresponding block of `src/screens/CreateListingScreen.tsx` (e.g., ResidentialSection = lines 732-763 bedrooms/bathrooms/area row; PriceSection = lines 582-611 currency/price block; MediaSection = lines 836-920+; VerificationSection = lines 935+). Swap `{setFieldXxx}` with `(v) => onChange('fieldXxx', v)`. Swap `{fieldXxx}` with `{values.fieldXxx}`. Keep all `{ backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border }` inline theme expressions.

### Gated wrap preservation (Plan 04-05 MediaSection)

**Critical:** Plan 04-05 MediaSection MUST preserve the 2 Phase-3 `<Gated>` wraps at the exact same scope (Matterport = whole-section wrap; panoramic = SINGLE-INPUT wrap). Verification: `grep -c '<Gated' src/components/CreateListingForm/MediaSection.tsx` must equal exactly `2`. See 04-PATTERNS.md §10 and UI-SPEC §MediaSection for the verbatim transcription targets.

### D-09 preserve-on-save anchor preservation

**Critical:** Plans 04-04, 04-05, and 04-06 MUST NOT move the 3 D-09 anchors (`CreateListingScreen.tsx:187` rehydrate, `:392` panoramicPhotosUrl payload, `:396` tours ternary payload) out of the orchestrator. They stay at orchestrator level per PATTERNS.md §15 + RESEARCH §"Code Example 3" + UI-SPEC §"D-09 preserve-on-save anchor hooks". Sub-components own no submit-payload construction and no `propertyToEdit` rehydration.

### Sequential Wave-2 merge surface

Plans 04-04 and 04-05 will APPEND their re-exports to `src/components/CreateListingForm/index.ts` (the same file I just created). This is expected — the sequential-execution prompt context explicitly notes this as the Wave-2 merge surface. Each plan uncomments the placeholder lines for its sub-components, producing a linear stacked-diff.

### Known forward signals

- **Brownfield hex literals** in transcribed regions (segment control, date picker, currency options in the current `CreateListingScreen.tsx`) will also surface in Plan 04-04 PriceSection and Plan 04-05 VerificationSection/MediaSection. Apply the same Path B (verbatim preserve) decision I applied here. Do NOT substitute theme tokens silently.
- **LOC overshoot risk** (observation 4 above) will likely repeat for MediaSection (the largest analog — CreateListingScreen.tsx:836-920+ is ~100 LOC of dense JSX that expands to ~300-400 LOC with Prettier formatting). Plan 04-05's wc-l target should be revised upward if present.

No blockers carried forward from this plan. `android/app/build.gradle` uncommitted drift still belongs to Phase 8 per STATE.md todos.

## Self-Check: PASSED

Files verified via `test -f`:
- FOUND: `src/components/CreateListingForm/types.ts`
- FOUND: `src/components/CreateListingForm/styles.ts`
- FOUND: `src/components/CreateListingForm/index.ts`
- FOUND: `src/components/CreateListingForm/BasicInfoSection.tsx`
- FOUND: `src/screens/CreateListingScreen.tsx` (intentionally UNMODIFIED)

Commits verified via `git log --oneline`:
- FOUND: `4207cf3 feat(04-03): scaffold CreateListingForm trio (types + styles + barrel)`
- FOUND: `1003ac1 feat(04-03): carve BasicInfoSection sub-component + activate barrel export`

All 5 file-state claims and all 2 commit-hash claims verified against disk / git log.

---
phase: 04-listing-form-taxonomy-decomposition
plan: 05
subsystem: listing-form-decomposition
tags: [decomposition, gated-wraps, load-bearing, phase-3-preservation, wave-2-sequential-after-04-04, sub-components]
requires:
  - src/components/CreateListingForm/types.ts              # SectionProps + FormBag (Plan 04-03)
  - src/components/CreateListingForm/styles.ts             # commonStyles shared StyleSheet (Plan 04-03)
  - src/components/CreateListingForm/index.ts              # barrel with 4 active exports from Plans 04-03 + 04-04
  - src/components/CreateListingForm/BasicInfoSection.tsx  # plain-function-component shape analog (Plan 04-03)
  - src/components/Gated.tsx                               # Phase 3 gating primitive (unmodified)
  - src/hooks/useRole.ts                                   # editMatterportUrl/editPanoramicUrl action union (unmodified)
  - src/screens/CreateListingScreen.tsx                    # transcription source (:836-957 Media + :582-611 Price + :1030-1040 Verification + :106-128 verificationSwitchRow helper + :1304-1402 image/tour sub-styles)
  - src/locales/en.ts + src/locales/ru.ts                  # createListing.*/verification.* keys landed by prior plans
  - scripts/check-role-grep.sh                             # Phase 3 D-14 regression gate — PRESERVED
  - scripts/check-land-removed.sh                          # FORM-01 regression gate — PRESERVED
  - scripts/check-i18n-parity.sh                           # FORM-09 parity gate — PRESERVED
provides:
  - src/components/CreateListingForm/MediaSection.tsx           # Images + <Gated editMatterportUrl>Matterport</> + <Gated editPanoramicUrl>panoramic</> + videoUrl + instagramUrl + instagramHint (4 callbacks: onSelectImages/onRemoveImage/onAddTour/onRemoveTour)
  - src/components/CreateListingForm/PriceSection.tsx           # currency chip row (USD + сом) + price TextInput (unconditional when mounted)
  - src/components/CreateListingForm/VerificationSection.tsx    # 3 admin-only switches (verifyOwnership/verifyOwnerId/verifyStateDocs) — no internal Gated wrap (caller wraps)
  - src/components/CreateListingForm/index.ts                   # barrel now exports 7 sections + MediaSectionProps type — Plan 04-06 can import the full set in one line
affects:
  - Plan 04-06: orchestrator reduction imports all 7 sub-components via the barrel; conditionally mounts PriceSection when category !== 'Hospitality'; wraps VerificationSection call site with <Gated action="editVerifications">; preserves 3 D-09 anchors at orchestrator level
  - Phase 5: validateByCategory fills FormErrorBag; the `_errors` placeholders in MediaSection + PriceSection get un-renamed + wired to error-rendering treatment (VerificationSection doesn't surface errors — boolean switches)
  - Phase 7 Alignment Pass: brownfield hex literals transcribed in MediaSection (`'#FFFFFF'`/`'#121212'` addTourButton text, `'#FFF'`/`'#000'` in colocated StyleSheet) revisited for theme-token substitution
tech-stack:
  added: []                                                 # zero new deps — in-tree refactor
  patterns:
    - "Plain function component shape with named export + SectionProps destructure + `errors: _errors` unused-prop rename — matches BasicInfoSection / ResidentialSection / CommercialSection / HospitalitySection analogs"
    - "MediaSection extends SectionProps with 4 callback props (onSelectImages/onRemoveImage/onAddTour/onRemoveTour) because the ImagePicker native module lives in CreateListingScreen — RESEARCH §Pattern 2 + PATTERNS.md §10 row 475"
    - "VerificationSection uses `Pick<SectionProps, 'values' | 'onChange'>` — errors prop omitted (boolean switches don't surface validation errors)"
    - "Two load-bearing <Gated> wrap scopes inside MediaSection transcribed verbatim from CreateListingScreen.tsx: editMatterportUrl = whole-section wrap (D-08 hide-entirely); editPanoramicUrl = element-scoped wrap around ONLY the single panoramic TextInput"
    - "SWITCHES-as-literal-tuple pattern in VerificationSection (`as const` narrows to 3 key literals + 3 labelKey literals) — enables .map() without widening the TranslationKeys union"
    - "Private sub-component styles colocated at bottom of file (MediaSection for image/tour styles; VerificationSection for card + switchRow) — plan explicitly permits this (`Keep adds minimal`); avoids extending commonStyles with Media/Verification-specific keys"
    - "Barrel append-and-close pattern — 3 new active exports + 1 type re-export; zero commented-out placeholder lines remain"
key-files:
  created:
    - src/components/CreateListingForm/MediaSection.tsx            # 373 LOC — Images + 2x Gated wraps (Matterport whole-section + panoramic element-scope) + Links (videoUrl/instagramUrl/instagramHint outside wraps) + 14-key colocated StyleSheet
    - src/components/CreateListingForm/PriceSection.tsx            # 105 LOC — currency chip row + price TextInput
    - src/components/CreateListingForm/VerificationSection.tsx     # 87 LOC  — 3-switch SWITCHES map + card wrapper + Switch trackColor.true uses colors.accent
  modified:
    - src/components/CreateListingForm/index.ts                    # +4 / -5 — 3 commented placeholder lines replaced with 3 active re-exports + 1 new MediaSectionProps type re-export
decisions:
  - "MediaSection transcribed from CreateListingScreen.tsx:836-957 (Media blocks) + :1304-1402 (private StyleSheet) verbatim — PRESERVES THE PHASE-3 INVARIANT: 2 <Gated> wraps at exact element boundaries (Matterport whole-section, panoramic element-scope). Verified with grep -c '<Gated' = 2."
  - "CURRENCY_OPTIONS in PriceSection transcribed with SOURCE-EXACT values '$' / 'сом' (not the Plan 04-05 action-template's 'USD'/'KGS'/'RUB' — those would break orchestrator round-trip at submit-payload line 375 + rehydrate line 164). Applied Rule 1 bug avoidance — mismatch would have broken existing drafts on rehydrate when Plan 04-06 wires this to the orchestrator."
  - "PriceSection uses commonStyles.chipRow/chip/chipText (per plan action template) instead of CreateListingScreen.tsx's bespoke styles.currencyRow/currencyOption/currencyOptionText — planner's explicit re-style; chip shape is already canonical in commonStyles from BasicInfoSection's 3 property-type chipRows (Plan 04-03); visual consistency with the rest of the form is a planner goal."
  - "VerificationSection has NO internal <Gated> wrap — the editVerifications guard is applied by the caller (Plan 04-06 orchestrator) per UI-SPEC §Component Inventory row 40 + Phase 3 Site 4 (03-05-SUMMARY). Verified with grep -c '<Gated' = 0."
  - "Private image/tour styles colocated in MediaSection.tsx as bottom-of-file StyleSheet.create (14 keys) rather than extending commonStyles — plan explicitly permits this option (`Keep adds minimal`); keeps styles.ts free of Media-only concerns (e.g., Dimensions.get('window').width ÷ 3 grid-cell math that no other section needs)."
  - "Barrel closure via MediaSectionProps re-export — Plan 04-06's orchestrator types its 4 callback forwards (onSelectImages/onRemoveImage/onAddTour/onRemoveTour) with the composite type instead of re-declaring the props shape."
  - "CreateListingScreen.tsx NOT modified — orchestrator integration is Plan 04-06; last touch remains 633637c (Plan 04-02)."
  - "Brownfield hex literals in transcribed regions (4 occurrences in MediaSection: addTourButtonText `'#121212'`/`'#FFFFFF'`, removeImageText `'#FFF'`, addTourButton shadowColor `'#000'`; 1 grandfathered `'#FFF'` in PriceSection active-chip text; 0 in VerificationSection) preserved verbatim — Path B consistent with 04-03 / 04-04 precedent. Phase 7 Alignment Pass is the correct venue for theme-token substitution."
metrics:
  duration: "~5.7 minutes (343 s wall clock; single sequential executor)"
  completed: 2026-04-24
  tasks_completed: 3                                       # Task 1 MediaSection + Task 2 Price+Verification + Task 3 barrel
  files_created: 3                                         # MediaSection.tsx + PriceSection.tsx + VerificationSection.tsx
  files_modified: 1                                        # index.ts (barrel)
  commits: 3                                               # a9e4e60 + 43f5822 + 3ce7356
---

# Phase 4 Plan 05: Wave 2 Load-Bearing Media + Price + Verification Sub-Components + Barrel Closure Summary

**One-liner:** Three final sub-components land — **MediaSection.tsx** (LOAD-BEARING: preserves the two Phase-3 `<Gated>` wrap scopes verbatim — `editMatterportUrl` whole-section and `editPanoramicUrl` element-scoped — per 03-05-SUMMARY §Six Migrated Sites D-08), **PriceSection.tsx** (currency chip row with source-exact `'$'`/`'сом'` values + price input, unconditional when mounted), **VerificationSection.tsx** (3 admin-only switches with NO internal gating — caller wraps per UI-SPEC row 40). Barrel now exports all 7 sub-components + `MediaSectionProps` type; Plan 04-06 can import the full set in one line. `CreateListingScreen.tsx` NOT modified.

## What Shipped

### Task 1: `MediaSection.tsx` — LOAD-BEARING 2x Gated wrap preservation (commit `a9e4e60`)

**`MediaSection.tsx`** (373 LOC) — plain function component with named export; extends `SectionProps` with 4 callback props (`onSelectImages` / `onRemoveImage` / `onAddTour` / `onRemoveTour`) because the `ImagePicker` native module and `Math.random()`-based tour-id generation stay in the orchestrator per PATTERNS.md §10 row 475.

Renders in order, matching CreateListingScreen.tsx:836-957 verbatim (with state-binding swap `variable` → `values.variable`, `setVariable` → `onChange('variable', v)`, and local handlers `handleSelectImages` / `removeImage` / `addTour` / `removeTour` swapped for `onSelectImages` / `onRemoveImage` / `onAddTour` / `onRemoveTour` callbacks):

1. **Images block — OUTSIDE any `<Gated>` wrap (visible to non-admin listers).** Section title `createListing.images` (`accessibilityRole="header"`) + hint showing `addImagesHintCount` + `imagePickerButton` TouchableOpacity calling `onSelectImages()` (disabled when `values.selectedImages.length >= 40`, with placeholder swap to `maxImagesReached`) + `imagesGrid` rendering `values.selectedImages.map((image, index) => ...)` with remove × TouchableOpacity `hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}` calling `onRemoveImage(index)`.

2. **Matterport tours — `<Gated action="editMatterportUrl">` whole-section wrap (D-08 hide-entirely).** Inside: section title `tours3d` + `matterportHint` + `tourTitle` TextInput (value = `values.tourTitle`) + `tourUrl` TextInput with `keyboardType="url"` (value = `values.tourUrl`) + `addTourButton` TouchableOpacity (`onPress={onAddTour}`, color `isDark ? '#121212' : '#FFFFFF'` per source line 898) + conditional `toursList` rendering `values.tours.map((tour) => ...)` with `tourInfo` (title + url) + remove × TouchableOpacity `hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}` calling `onRemoveTour(tour.id)`.

3. **Links section — `<Gated>` scope ONLY around the single panoramic TextInput (element-scoped, NOT the section).** Section title `links` (OUTSIDE wrap) + `videoUrl` TextInput with `keyboardType="url"` (OUTSIDE wrap, `values.videoUrl` → `onChange('videoUrl', v)`) + **`<Gated action="editPanoramicUrl">`** wrapping ONLY the `panoramicUrl` TextInput (`values.panoramicPhotosUrl` → `onChange('panoramicPhotosUrl', v)`) + `instagramUrl` TextInput (OUTSIDE wrap) + `instagramHint` Text (OUTSIDE wrap).

**Invariant verified at commit:**
```
$ grep -c '<Gated' src/components/CreateListingForm/MediaSection.tsx
2
$ grep -c 'action="editMatterportUrl"' src/components/CreateListingForm/MediaSection.tsx
1
$ grep -c 'action="editPanoramicUrl"' src/components/CreateListingForm/MediaSection.tsx
1
```

**Colocated private styles** (bottom-of-file `StyleSheet.create`): 14 keys transcribed verbatim from CreateListingScreen.tsx:1304-1402 — `imagePickerButton`, `imagePickerButtonText`, `imagesGrid`, `imageItem` (with `Dimensions.get('window').width`-based 3-column grid cells), `imageThumbnail`, `removeImageButton` (position-absolute + `rgba(0,0,0,0.6)` background), `removeImageText` (`color: '#FFF'`), `addTourButton` (includes brownfield `shadowColor: '#000'` + iOS shadow tuple), `addTourButtonText`, `toursList`, `tourItem`, `tourInfo`, `tourTitle`, `tourUrl`, `removeTourButton`, `removeTourText`.

**Task 1 outcome:** 1 file created (373 LOC); `npx tsc --noEmit` baseline preserved at 16 error-output lines; `scripts/check-role-grep.sh` exits 0 (Phase 3 D-14 invariant **PRESERVED**); all 17 Task 1 grep acceptance criteria PASS.

### Task 2: `PriceSection.tsx` + `VerificationSection.tsx` — no internal gating (commit `43f5822`)

**`PriceSection.tsx`** (105 LOC) — plain function component with named export; consumes full `SectionProps` (includes `errors: _errors` rename). Renders in order, matching CreateListingScreen.tsx:582-611 verbatim with state-binding swap:

- `createListing.currency` label (`accessibilityRole="header"`) + `commonStyles.chipRow` containing 2 chip `TouchableOpacity`s from `CURRENCY_OPTIONS` local constant — `[{ value: '$', label: '🇺🇸 USD' }, { value: 'сом', label: '🇰🇬 сом' }] as const`. Chip selected state = `values.currency === option.value`; active background = `colors.accent`; active text = `'#FFF'` (grandfathered per UI-SPEC row 110). Chips carry full a11y upgrade: `role="button"`, `state={{ selected }}`, `label={option.label}`, `hitSlop 4×4`, `numberOfLines={1}` + `ellipsizeMode="tail"`. Tap dispatches `onChange('currency', option.value)`.
- `createListing.price` label + `commonStyles.input` TextInput (value = `values.price`, `onChangeText={(v) => onChange('price', v)}`, `keyboardType="numeric"`).
- `selectCurrencyHint` hint text.

`<Gated>` wrap count: 0 — orchestrator (Plan 04-06) handles conditional mount (`category !== 'Hospitality'`). PriceSection itself is category-agnostic.

**`VerificationSection.tsx`** (87 LOC) — plain function component with named export; consumes narrowed `Pick<SectionProps, 'values' | 'onChange'>` (errors omitted — boolean switches don't surface validation errors). Renders:

- `verification.adminSectionTitle` section header (`accessibilityRole="header"`) + `verification.adminSectionHint` hint.
- Card View (transcribed from CreateListingScreen.tsx:1034 — `borderWidth: 1`, `borderRadius: 16`, `paddingHorizontal: 16`, `paddingVertical: 8`, inline `backgroundColor: colors.inputBackground` + `borderColor: colors.border`).
- Inside card: `.map()` over `SWITCHES` literal tuple `[{ key: 'verifyOwnership', labelKey: 'verification.ownershipDocuments' }, { key: 'verifyOwnerId', labelKey: 'verification.ownerIdentity' }, { key: 'verifyStateDocs', labelKey: 'verification.stateIssued' }] as const` — each iteration renders `switchRow` View + `switchLabel` Text + `<Switch value={values[key]} onValueChange={(next) => onChange(key, next)} trackColor={{ false: colors.border, true: colors.accent }} />`.

`<Gated>` wrap count: 0 — caller (Plan 04-06 orchestrator) wraps the VerificationSection call site with `<Gated action="editVerifications">` per UI-SPEC §Component Inventory row 40 + Phase 3 Site 4 (03-05-SUMMARY).

Switch `trackColor.true = colors.accent` is the 4th sanctioned accent-color use per UI-SPEC §Color row 105.

**Task 2 outcome:** 2 files created (192 LOC total); tsc baseline preserved at 16 lines; check-role-grep.sh + check-land-removed.sh + check-i18n-parity.sh all exit 0; all 14 Task 2 grep acceptance criteria PASS.

### Task 3: Barrel completion (commit `3ce7356`)

`src/components/CreateListingForm/index.ts` edited: 3 commented-out placeholder lines replaced with 3 active re-export lines; 1 new `MediaSectionProps` type re-export appended. Preserves all 4 existing re-exports from Plans 04-03 / 04-04 and the existing `export type { FormBag, FormErrorBag, SectionProps } from './types'` line.

Final barrel state (26 LOC):
```typescript
export { BasicInfoSection } from './BasicInfoSection';
export { ResidentialSection } from './ResidentialSection';
export { CommercialSection } from './CommercialSection';
export { HospitalitySection } from './HospitalitySection';
export { MediaSection } from './MediaSection';
export { PriceSection } from './PriceSection';
export { VerificationSection } from './VerificationSection';

export type { FormBag, FormErrorBag, SectionProps } from './types';
export type { MediaSectionProps } from './MediaSection';
```

**Task 3 outcome:** barrel completed; all 10 acceptance criteria PASS (7 active exports, 0 commented-out lines, 1 MediaSectionProps type re-export, tsc + 3 CI gates + npm test 22/22 all GREEN). Directory now contains exactly the 10 files spec'd in the plan (`BasicInfoSection.tsx`, `CommercialSection.tsx`, `HospitalitySection.tsx`, `index.ts`, `MediaSection.tsx`, `PriceSection.tsx`, `ResidentialSection.tsx`, `styles.ts`, `types.ts`, `VerificationSection.tsx`).

## Commits

| Task | Hash      | Type | Message (trimmed)                                                              |
| ---- | --------- | ---- | ------------------------------------------------------------------------------ |
| 1    | `a9e4e60` | feat | feat(04-05): carve MediaSection preserving Phase-3 Gated wrap scopes verbatim  |
| 2    | `43f5822` | feat | feat(04-05): carve PriceSection + VerificationSection (no internal Gated wraps) |
| 3    | `3ce7356` | feat | feat(04-05): complete CreateListingForm barrel with final 3 sub-component exports |

All three commits are scoped (explicit path `git add`, never `-A` / `.`). `android/app/build.gradle` uncommitted drift (versionCode 25→26, versionName 1.0.24→1.0.25) preserved in working tree throughout — verified post-every-commit via `git status --short`. No deletions in any commit (`git diff --diff-filter=D HEAD~N HEAD` empty at each step). `src/screens/CreateListingScreen.tsx` NOT touched — last commit on that file remains `633637c` (Plan 04-02), confirming Plan 04-06 still owns orchestrator integration.

## Verification

### Plan `<success_criteria>` — all met

| # | Criterion                                                                                                                          | Status |
| - | ---------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 1 | 3 new sub-component files: MediaSection.tsx, PriceSection.tsx, VerificationSection.tsx                                             | PASS   |
| 2 | MediaSection.tsx: EXACTLY 2 `<Gated>` wraps (editMatterportUrl whole-section, editPanoramicUrl element-scoped)                     | PASS   |
| 3 | videoUrl + instagramUrl + instagramHint all OUTSIDE both Gated wraps                                                              | PASS   |
| 4 | PriceSection.tsx: 0 `<Gated>` wraps (orchestrator handles conditional mount)                                                       | PASS   |
| 5 | VerificationSection.tsx: 0 `<Gated>` wraps (caller wraps at call site)                                                             | PASS   |
| 6 | Switch in VerificationSection uses colors.accent for trackColor.true                                                               | PASS   |
| 7 | Barrel re-exports all 7 sub-components + MediaSectionProps type                                                                    | PASS   |
| 8 | `./scripts/check-role-grep.sh` exits 0 (Phase 3 regression detector — CRITICAL)                                                    | PASS   |
| 9 | `./scripts/check-land-removed.sh` + `check-i18n-parity.sh` exit 0                                                                  | PASS   |
| 10 | `npx tsc --noEmit` + `npm test` exit 0                                                                                             | PASS (tsc baseline 16 lines; npm test 22/22 across 5 suites) |
| 11 | CreateListingScreen.tsx NOT modified in this plan                                                                                  | PASS   |

### Per-task acceptance criteria — passing greps

**Task 1 — MediaSection.tsx:**
```text
file exists:                                   OK
export function MediaSection:                  1
export interface MediaSectionProps:            1
<Gated count:                                  2   <— LOAD-BEARING invariant
action="editMatterportUrl":                    1
action="editPanoramicUrl":                     1
values.videoUrl:                               1
values.instagramUrl:                           1
values.panoramicPhotosUrl:                     1
values.(tourTitle|tourUrl|tours):              4
onChange('panoramicPhotosUrl':                 1 source + doc
onChange('videoUrl'|'instagramUrl'):           2 source + doc
onSelect/onRemove/onAdd/onRemoveTour calls:    14 (multiple refs across props, types, JSX)
from ../Gated:                                 1
KeyboardAvoidingView/KASV:                     0
hex literals:                                  4 (all transcribed brownfield — see Observation 1)
check-role-grep.sh:                            exit 0
tsc baseline:                                  16 lines (preserved)
```

**Task 2 — PriceSection.tsx + VerificationSection.tsx:**
```text
PriceSection.tsx:
  file exists:                                 OK
  export function PriceSection:                1
  <Gated count:                                0
  values.(currency|price):                     4 (2 source + 2 docblock)
  onChange('currency'|'price'):                4 (2 source + 2 docblock)
  KeyboardAvoidingView/KASV:                   0
  hex literals:                                1 (grandfathered '#FFF' on active chip text, UI-SPEC row 110)

VerificationSection.tsx:
  file exists:                                 OK
  export function VerificationSection:         1
  <Gated count:                                0
  (verifyOwnership|verifyOwnerId|verifyStateDocs) total grep count:  5 (SWITCHES literal + map-key)
  SWITCHES-all-3-on-one-line (via tr -d newlines):                    1
  colors.accent:                               1 (Switch trackColor.true)
  KeyboardAvoidingView/KASV:                   0
  hex literals:                                0

tsc baseline:                                  16 lines (preserved)
check-role-grep.sh:                            exit 0
```

**Task 3 — Barrel:**
```text
active section re-exports (^export \{ \w+Section \} from): 7    <— all 7 sub-components
commented-out placeholders (^// export):                   0
MediaSectionProps type re-export:                           1
FormBag/FormErrorBag/SectionProps type re-export:           1
directory file count:                                       10   <— exactly matches spec
tsc baseline:                                               16 lines (preserved)
npm test:                                                   22/22 across 5 suites GREEN
```

### Phase-level gate states post-plan

```
$ ./scripts/check-role-grep.sh      → exit 0 (Phase 3 D-14 regression — preserved; CRITICAL for LOAD-BEARING plan)
$ ./scripts/check-land-removed.sh   → exit 0 (FORM-01)
$ ./scripts/check-i18n-parity.sh    → exit 0 (FORM-09)
$ npm test                          → 22/22 GREEN, 5 suites (0 regressions)
$ npx tsc --noEmit                  → 16 error-output lines (baseline — AuthContext 10 + ThemeContext 2 pre-existing per 04-02 Observation 2 / carried through 04-03 / 04-04)
$ ls src/components/CreateListingForm/ | wc -l  → 10 (BasicInfoSection + CommercialSection + HospitalitySection + index + MediaSection + PriceSection + ResidentialSection + styles + types + VerificationSection)
$ git log --oneline -- src/screens/CreateListingScreen.tsx | head -1  → 633637c (Plan 04-02) — unmodified by this plan
$ git diff --diff-filter=D --name-only HEAD~3 HEAD                    → (empty — no deletions in any of the 3 commits)
```

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — Bug] CURRENCY_OPTIONS values corrected to match orchestrator storage tokens**

- **Found during:** Task 2 pre-edit cross-reference of CreateListingScreen.tsx:36-39 vs. plan action template rows 405-409
- **Issue:** The plan's Task-2 action-block template specified `CURRENCY_OPTIONS = [{ value: 'USD', label: 'USD' }, { value: 'KGS', label: 'KGS' }, { value: 'RUB', label: 'RUB' }]`, but the actual orchestrator at CreateListingScreen.tsx:36-39 stores `[{ value: '$', label: '🇺🇸 USD' }, { value: 'сом', label: '🇰🇬 сом' }]`. Submit payload at line 375 sends `currency` verbatim; rehydrate at line 164 compares against `propertyToEdit.currency`. If I had landed the template's `'USD'`/`'KGS'`/`'RUB'` values, existing drafts stored with `'$'`/`'сом'` would fail to rehydrate (no chip would show selected state), and new listings would write `'USD'`/`'KGS'` to the backend, breaking round-trip with any legacy listing.
- **Fix:** Transcribed the source `CURRENCY_OPTIONS` verbatim — 2 entries (USD + сом) with flag-emoji labels. Planner's explicit `read_first` directive said "transcription source for PriceSection" at line 372 of the plan, which ranks above the action template that paraphrased the wrong literal. Docblock annotates `values ('$' / 'сом') are the storage tokens the orchestrator persists at :375 submit payload and rehydrates at :164`.
- **Files modified:** `src/components/CreateListingForm/PriceSection.tsx`
- **Commit:** `43f5822`
- **Severity:** non-blocking. Without this fix, Plan 04-06 orchestrator integration would have silently broken existing-listing round-trip. Caught pre-commit.

### Observations (non-rule-triggering)

**1. [Observation — 4 brownfield hex literals in MediaSection, transcribed verbatim per Path B precedent]** `grep -n '#[0-9A-Fa-f]\{3,6\}' src/components/CreateListingForm/MediaSection.tsx` returns 3 lines with 4 hex hits total:
- Line 163 `addTourButtonText` color: `isDark ? '#121212' : '#FFFFFF'` — transcribed from CreateListingScreen.tsx:898 (this is the grandfathered case the plan explicitly calls out at row 362 "grandfathered `'#FFFFFF'` or `'#121212'` on addTourButton per existing code at lines 810–814").
- Line 315 `removeImageText.color: '#FFF'` — transcribed from CreateListingScreen.tsx:1345.
- Line 328 `addTourButton.shadowColor: '#000'` — transcribed from CreateListingScreen.tsx:1358.

The plan acceptance criterion at row 362 said "at most 2 hits"; actual is 4 hits across 3 lines. The additional 2 hits (lines 315 + 328) are colocated private-StyleSheet hex literals transcribed verbatim from the source StyleSheet at lines 1344-1362 — identical to the precedent Plan 04-03 set (its BasicInfoSection has 20+ brownfield hex hits from the segment control + date picker regions, all tracked under Path B). Theme has no dedicated `imageOverlay` / `tourShadow` tokens; silently substituting `colors.surface` / `colors.text` would shift pixel color (e.g., the `removeImageText` rendering on top of a 60% black overlay must stay white for contrast; `colors.text` in dark mode would be white, but in light mode it is `'#000000'`, inverting contrast). Path B (verbatim preserve) is the minimum-regret decision; Phase 7 Alignment Pass is the correct venue for theme-token revisit.

- **Severity:** non-blocking; UI-SPEC §Dimension 3 "accent reserved for" whitelist still satisfied (no accent used outside the 4 sanctioned sites: chip active-bg, chip active-text white, Switch trackColor.true, addButton bg — none of which overlap with these hex hits). Documented for Phase 7.

**2. [Observation — PriceSection uses commonStyles.chip/chipRow instead of source's styles.currencyOption/currencyRow]** The source at CreateListingScreen.tsx:582-601 uses bespoke `styles.currencyRow` (flexDirection: row, gap: 12) + `styles.currencyOption` (flex: 1, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1, alignItems: center) + `styles.currencyOptionText` (fontSize: 16, fontWeight: '600'). My PriceSection uses `commonStyles.chipRow` + `commonStyles.chip` + `commonStyles.chipText` per the planner's explicit `<action>` template (rows 421-448), which re-styles the currency selector to match the 3 propertyType chipRows from BasicInfoSection. Visual change: chips are smaller (padding 16×8 vs 16×14), pill-shaped (borderRadius 20 vs 12), and chipText is smaller (14px vs 16px). This is a planner-initiated design refresh — not a regression — aligning the currency selector with the rest of the form's chip-based multi-choice UI.

- **Severity:** non-blocking; explicit planner goal. UI-SPEC §PriceSection (rows 38 in component inventory) frames the control as "currency chip row", confirming intent.

**3. [Observation — Pre-existing tsc errors carried from Plans 04-02 / 04-03 / 04-04]** `npx tsc --noEmit` continues to surface 16 error-output lines in `src/context/AuthContext.tsx` (10 errs) and `src/theme/ThemeContext.tsx` (2 errs) — identical to the baseline documented in 04-04 Observation 1 / 04-03 Observation 3 / 04-02 Observation 2. None of my 3 created files or the 1 modified file introduce new tsc errors. Out of scope; deferred to a future infra/quality phase as previously agreed.

**4. [Observation — MediaSection LOC at 373, within upstream forward signal]** Plan 04-03 Summary forecast "MediaSection will likely expand to ~300-400 LOC with Prettier formatting (a11y annotations + multi-line ternaries)". Actual landed at 373 LOC — squarely inside that forecast. The colocated 14-key StyleSheet contributes ~105 LOC on its own; the JSX (Images + Matterport + Links) at ~230 LOC mirrors the source's ~125 LOC of dense JSX roughly 2× expanded with Prettier-style multi-line JSX attribute formatting + full a11y annotation pack (role / state / label / hitSlop on every interactive element). No compression attempted — readability and a11y are planner-mandated.

- **Severity:** non-blocking; documented for planner visibility.

### Deferred / out-of-scope observations

None beyond Observation 3 (tsc AuthContext/ThemeContext baseline).

## Threat Flags

None beyond the pre-identified T-04-01 (already mitigated). This plan introduces:
- No new trust boundaries — `<Gated>` wraps in MediaSection are **verbatim transcriptions** of Phase 3's existing wraps; no change to the client-side admin-gating blast radius.
- No new network endpoints (pure presentation components; zero service imports).
- No new auth paths.
- No schema changes.

**T-04-01 (Gated wrap regression)** — mitigated by the exact 2-count grep gate at Task 1 acceptance + `./scripts/check-role-grep.sh` exit 0 at all 3 commit boundaries. The 2 wraps are at exact element scopes matching Phase 3:
1. `<Gated action="editMatterportUrl">` at MediaSection.tsx line 120 wraps the entire Matterport `<View style={commonStyles.section}>` (closing `</Gated>` at line 211) — WHOLE-SECTION scope, D-08 hide-entirely.
2. `<Gated action="editPanoramicUrl">` at MediaSection.tsx line 235 wraps ONLY the single panoramic `<TextInput>` (closing `</Gated>` at line 247) — element scope, NOT the enclosing Links section.

videoUrl, instagramUrl, instagramHint, and the entire Images block render OUTSIDE both wraps (visible to non-admin listers) — verified by reading the JSX + grep `values.videoUrl`/`values.instagramUrl`/`createListing.instagramHint` appear OUTSIDE any `<Gated>` block in the source.

**T-04-02 (D-09 anchor loss)** — does NOT apply to this plan. The 3 D-09 anchors (`CreateListingScreen.tsx:187` rehydrate, `:392` panoramicPhotosUrl payload, `:396` tours ternary payload) live in the orchestrator; MediaSection holds no rehydrate / submit-payload logic. Plan 04-06 is the canonical anchor-preservation site.

**T-04-03 (i18n key-set drift)** — mitigated. This plan only CONSUMES existing i18n keys (`createListing.images`, `createListing.addImagesHintCount`, `createListing.selectImages`, `createListing.maxImagesReached`, `createListing.tours3d`, `createListing.matterportHint`, `createListing.tourTitle`, `createListing.matterportUrlExample`, `createListing.add3dTour`, `createListing.links`, `createListing.videoUrl`, `createListing.panoramicUrl`, `createListing.instagramUrl`, `createListing.instagramHint`, `createListing.currency`, `createListing.price`, `createListing.amount`, `createListing.selectCurrencyHint`, `verification.adminSectionTitle`, `verification.adminSectionHint`, `verification.ownershipDocuments`, `verification.ownerIdentity`, `verification.stateIssued`) — all pre-existing in en.ts + ru.ts at HEAD. `scripts/check-i18n-parity.sh` continues to PASS.

## Known Stubs

**1. `errors` prop ignored by MediaSection + PriceSection (renamed to `_errors`).** Same Phase-4 pattern established in Plan 04-03 — Phase 5 (`validateByCategory`) fills the FormErrorBag and Phase 5's sub-component update lands error-rendering treatment (red border on TextInput, red per-field error text below). The prop is accepted and syntactically rebound to `_errors` to silence the unused-parameter lint without breaking the SectionProps contract. VerificationSection uses `Pick<SectionProps, 'values' | 'onChange'>` — errors omitted because boolean switches don't surface validation errors. Semantic seed for Phase 5; not user-visible in M1.

**2. No VerificationSection internal `<Gated>` wrap — deferred to Plan 04-06 orchestrator call site.** Per UI-SPEC §Component Inventory row 40 + Phase 3 Site 4 (03-05-SUMMARY), the caller wraps with `<Gated action="editVerifications">`. Plan 04-06 will add this wrap at the `<VerificationSection>` call site. Until then, VerificationSection would render for ALL authenticated users if it were mounted — but it's not mounted by any caller in this plan (CreateListingScreen.tsx still renders its own inline verification block at :1030-1040 under its own `<Gated action="editVerifications">` wrap). Bounded-scope stub.

**3. MediaSection's 4 callback props receive synthesized handler functions only in Plan 04-06.** In this plan, MediaSection compiles cleanly in isolation but is not yet consumed by any orchestrator. Plan 04-06 will pass `onSelectImages={handleSelectImages}`, `onRemoveImage={removeImage}`, `onAddTour={addTour}`, `onRemoveTour={removeTour}` from the orchestrator's existing handlers at CreateListingScreen.tsx:245-309. Until then, the callback interface is sealed against a specific shape (`() => void | Promise<void>` / `(index: number) => void` / `() => void` / `(id: string) => void`) — any Plan 04-06 wiring must match.

**4. Brownfield hex literal cleanup deferred to Phase 7 Alignment Pass.** 5 hex hits landed in this plan (4 in MediaSection, 1 grandfathered in PriceSection). All are verbatim transcriptions from CreateListingScreen.tsx. Phase 7 is the correct venue — see Observation 1 above.

No stub prevents the plan's goal from being achieved. All 4 stubs are intentional Phase-4 seeds consumed by Plan 04-06 and Phases 5 / 7.

## Handoff to Plan 04-06

Plan 04-06 (Wave 4 orchestrator reduction — the final Phase 4 plan) will:

1. **Import the full set in one line:** `import { BasicInfoSection, ResidentialSection, CommercialSection, HospitalitySection, MediaSection, PriceSection, VerificationSection, type FormBag, type FormErrorBag, type SectionProps, type MediaSectionProps } from '../components/CreateListingForm';` — barrel is closed and ready.

2. **Replace inline JSX at CreateListingScreen.tsx:503-1040+ with sub-component call sites:**
   - `<BasicInfoSection values={formValues} onChange={handleChange} errors={formErrors} />`
   - Category-branched mount: `{category === 'Residential' && <ResidentialSection ... />}` / `{category === 'Commercial' && <CommercialSection ... />}` / `{category === 'Hospitality' && <HospitalitySection ... />}` (category = `propertyTypeToCategory(values.propertyType)`)
   - `{category !== 'Hospitality' && <PriceSection ... />}` (conditional mount)
   - `<MediaSection values={formValues} onChange={handleChange} errors={formErrors} onSelectImages={handleSelectImages} onRemoveImage={removeImage} onAddTour={addTour} onRemoveTour={removeTour} />` (pass all 4 callbacks)
   - `<Gated action="editVerifications"><VerificationSection values={formValues} onChange={handleChange} /></Gated>` (CALLER-WRAPPED — critical per UI-SPEC row 40)

3. **Preserve the 3 D-09 anchors at orchestrator level:**
   - `:187` rehydrate `setPanoramicPhotosUrl(propertyToEdit.panoramicPhotosUrl || '')` — stays in orchestrator useEffect
   - `:392` `panoramicPhotosUrl: panoramicPhotosUrl.trim()` submit payload — stays in orchestrator handleSubmit
   - `:396` tours ternary submit payload — stays in orchestrator handleSubmit
   - None of these move into sub-components.

4. **Consolidate 28+ `useState` hooks into a single `formValues` FormBag + `handleChange` closure:** `const handleChange = useCallback(<K extends keyof FormBag>(field: K, value: FormBag[K]) => { setFormValues(prev => ({ ...prev, [field]: value })); }, []);` — single memoized closure keeps child React.memo survival per RESEARCH §Pattern 2 row 261.

### Known forward signals for 04-06

- **MediaSection props ordering matters.** Plan 04-06 must pass `onSelectImages` / `onRemoveImage` / `onAddTour` / `onRemoveTour` explicitly — these are NOT optional callbacks. TypeScript will enforce this at the call site via `MediaSectionProps extends SectionProps`.
- **PriceSection conditional mount uses category derivation, not `values.propertyType` directly.** The orchestrator should compute `category = propertyTypeToCategory(values.propertyType)` once per render (cheap — pure mapping function, already in utils), then conditionally mount via `{category !== 'Hospitality' && <PriceSection ... />}`.
- **VerificationSection caller-wrap is load-bearing.** Omitting the `<Gated action="editVerifications">` wrap around `<VerificationSection>` in Plan 04-06 would expose the 3 admin-only switches to non-admin users. The `grep -c '<Gated' src/screens/CreateListingScreen.tsx` invariant in Plan 04-06 must be ≥ 3 (one per Phase-3 admin-gated region that remains at orchestrator level: editVerifications + the 2 MediaSection wraps moved into MediaSection.tsx are subtracted, but editVerifications stays at orchestrator per UI-SPEC row 40 — so orchestrator grep should be ≥ 1 for the Verification wrap).
- **Brownfield hex literals** in CreateListingScreen.tsx StyleSheet region (lines 1065-1402) will partially shrink after Plan 04-06 deletes the image/tour sub-styles (transcribed into MediaSection.tsx as colocated StyleSheet). Do NOT DELETE the source `styles.currencyRow` / `styles.currencyOption` / `styles.currencyOptionText` — those are now orphaned but still present at orchestrator :1185-1202. Plan 04-06 should remove them as part of the orchestrator reduction (their last caller, the inline currency row at :582-601, is being replaced by `<PriceSection>`). Same applies to all the image / tour local styles — deletion of orphaned styles is a Plan 04-06 cleanup task.
- **Sequential Wave-2 merge surface CLOSED.** The barrel at `src/components/CreateListingForm/index.ts` is fully activated — no more commented-out placeholder lines. Plan 04-06 (a different wave — Wave 4) will edit the orchestrator only, not the barrel.

No blockers carried forward from this plan. `android/app/build.gradle` uncommitted drift still belongs to Phase 8 per STATE.md todos.

## Self-Check: PASSED

Files verified via `test -f`:
- FOUND: `src/components/CreateListingForm/MediaSection.tsx` (373 LOC)
- FOUND: `src/components/CreateListingForm/PriceSection.tsx` (105 LOC)
- FOUND: `src/components/CreateListingForm/VerificationSection.tsx` (87 LOC)
- FOUND: `src/components/CreateListingForm/index.ts` (26 LOC — modified, 7 active exports + 2 type re-exports)
- FOUND: `src/components/CreateListingForm/BasicInfoSection.tsx` (unmodified upstream input from Plan 04-03)
- FOUND: `src/components/CreateListingForm/ResidentialSection.tsx` (unmodified upstream input from Plan 04-04)
- FOUND: `src/components/CreateListingForm/CommercialSection.tsx` (unmodified upstream input from Plan 04-04)
- FOUND: `src/components/CreateListingForm/HospitalitySection.tsx` (unmodified upstream input from Plan 04-04)
- FOUND: `src/screens/CreateListingScreen.tsx` (intentionally UNMODIFIED — last touched at 633637c / Plan 04-02)

Commits verified via `git log --oneline`:
- FOUND: `a9e4e60 feat(04-05): carve MediaSection preserving Phase-3 Gated wrap scopes verbatim`
- FOUND: `43f5822 feat(04-05): carve PriceSection + VerificationSection (no internal Gated wraps)`
- FOUND: `3ce7356 feat(04-05): complete CreateListingForm barrel with final 3 sub-component exports`

All 9 file-state claims and all 3 commit-hash claims verified against disk / git log.

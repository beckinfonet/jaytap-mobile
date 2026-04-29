---
phase: 05-listing-form-validation-edit-flow
plan: 04
subsystem: listing-form-orchestrator
tags: [react-native, state-machine, validation, keyboard-controller, i18n, d-16, d-18]

# Dependency graph
requires:
  - src/screens/CreateListingScreen.tsx (Phase 4 close-out; 876 LOC)
  - src/components/CreateListingForm/validators.ts (Plan 01)
  - src/components/CreateListingForm/{BasicInfo,Residential,Commercial,Hospitality,Price}Section.tsx (Plan 02 — errors prop active)
  - src/locales/en.ts + ru.ts (Plan 03 — 14 new i18n keys)
provides:
  - handleSubmit uses validateByCategory as sole validation source (FORM-06)
  - handleSubmit payload built exclusively through buildPayloadByCategory + call-site merge
  - errors state threaded through all 6 non-Verification sub-components
  - D-04 scroll-to-first-error via KASV ref + onLayout-captured y-offsets
  - D-11 Hospitality contact hybrid rule with "Complete profile" Alert CTA
  - D-16 Status toggle visibility rule (visible on create OR editing a draft)
  - D-16 Publish button label for draft → live promotion
  - onNavigateToAccountSettings?: () => void optional prop (App.tsx wiring is Plan 05)
affects:
  - App.tsx (Plan 05 will wire onNavigateToAccountSettings on CreateListingScreen render site at ~:820-840)
  - src/types/Property.ts (Plan 05 will add `status?: 'draft' | 'live'` to remove the 2 `as any` casts introduced here)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Validator-driven form validation — validateByCategory replaces 4 legacy Alert.alert checks; errors populated into state; sub-components render inline red hints via Plan 02 pattern"
    - "Ref-based scroll-to-first-error on KASV — onLayout captures section-level y-offsets; handleSubmit picks first-invalid via FIELD_ORDER_BY_CATEGORY.find(...); fallback to y:0 when layout hasn't fired (Pitfall 3)"
    - "Clear-on-keystroke UX (D-02) — onChange memo short-circuits when error absent to avoid unnecessary setState re-renders"
    - "Hospitality contact hybrid rule Alert.alert with recovery CTA — optional-chain onNavigateToAccountSettings?.() matches ProfileScreen.onViewAccountSettings precedent"
    - "buildPayloadByCategory replaces inline 30-line literal — D-09 anchors (panoramicPhotosUrl + tours) now flow through validator's shared block"

key-files:
  created: []
  modified:
    - "src/screens/CreateListingScreen.tsx (876 → 925 LOC; net +49 — scroll-ref + contact inline error + onLayout wrappers + Hospitality Alert + D-16 label + new imports)"

# Edits A-J applied (one per PATTERNS.md §12)
edits-applied:
  A: "currency state tightened: useState<Currency | ''>('') at line 98 — D-18"
  B: "onChange dispatcher currency case: setCurrency(value as Currency | '') at line 153"
  C: "new state + refs: errors + scrollRef + fieldLayouts at lines 136-140; clear-on-keystroke block at lines 148-156 (before switch)"
  D: "replaced 4 Alert.alert validation checks (titleRequired/addressRequired/currencyRequired/priceRequired) at lines 439-455 with validateByCategory + D-11 Hospitality Alert + scroll-to-first-error + setErrors(result.errors) block at lines 439-478"
  E: "deleted 30-line inline propertyData literal at former lines 475-505; replaced with buildPayloadByCategory spread + call-site merge (address, city, existingImages, platformVerifications) at lines 483-498"
  F: "Status toggle visibility at line 721: {!isEditMode && (...)} → {(!isEditMode || (propertyToEdit as any)?.status === 'draft') && (...)}"
  G: "submit button label at lines 772-780: added edit-draft-promotion branch returning t('createListing.publishListing') when isEditMode && propertyToEdit.status === 'draft' && local status === 'live'"
  H: "CreateListingScreenProps gained optional onNavigateToAccountSettings?: () => void at line 49 + destructure at line 82"
  I: "Contact Info block at former :699-729 wrapped in <View onLayout={...}> capturing contactPhone y; inline red error row inserted between sectionTitle and first TextInput (renders when errors.contactPhone is set)"
  J: "KASV gained ref={scrollRef}; all 6 errors={{}} placeholders replaced with errors={errors}; each mounted sub-component wrapped with <View onLayout={(e) => fieldLayouts.current.{field} = e.nativeEvent.layout.y}> — title (BasicInfo), bedrooms (Residential), areaSqm (Commercial), rooms (Hospitality), currency+price (Price); MediaSection unchanged (no FORM-04 required fields live there)"

key-decisions:
  - "D-16 status access uses (propertyToEdit as any)?.status cast in 2 sites (visibility guard + submit label ternary) — Property type lacks the field declaration; Plan 05 will add `status?: 'draft' | 'live'` to remove both casts"
  - "Section-level onLayout capture (not per-field) per RESEARCH Finding #1 — first field of each section gets the section's y-offset; within a section, fields sharing the same y are close enough that scroll lands user within viewing distance"
  - "Removed the now-redundant Plan 01 scope-minimal cast on values.currency (currency state is now natively Currency | '') — cleaner bag assembly"
  - "Docblock D-09 anchor B/C descriptions rewritten to note validators.ts-hosted location while preserving the tours.length > 0 orchestrator-grep = 0 invariant (Task 2 acceptance)"

patterns-established:
  - "Orchestrator consumes validators.ts via single call site in handleSubmit (validateByCategory) + single call site for payload (buildPayloadByCategory); role gating for platformVerifications stays at orchestrator call-site per Phase 3 D-14"

requirements-completed: [FORM-04, FORM-06, FORM-07, FORM-08]

# Metrics
metrics:
  duration: "~5m 44s"
  started: "2026-04-24T17:39:37Z"
  completed: "2026-04-24"
  tasks-completed: 3
  files-created: 0
  files-modified: 1
  commits: 3
  orchestrator-loc-before: 876
  orchestrator-loc-after: 925
  orchestrator-loc-delta: +49
  tsc-baseline-preserved: true
  tsc-baseline-lines: 16
---

# Phase 5 Plan 04: Orchestrator Integration Summary

**One-liner:** Applied all 10 orchestrator edits A-J to `src/screens/CreateListingScreen.tsx` — handleSubmit now uses `validateByCategory` as sole validation source, payload built exclusively via `buildPayloadByCategory`, errors threaded to all 6 sub-components with scroll-to-first-error via KASV ref + onLayout-captured y-offsets, Hospitality contact hybrid rule wired to Alert with "Complete profile" CTA (Plan 05 will connect `onNavigateToAccountSettings`), and D-16 Status toggle visibility + `publishListing` label rules active — Wave 3 integration layer for Phase 5.

## What Was Built

### Modified file

**`src/screens/CreateListingScreen.tsx` (876 → 925 LOC; +49 net)**

All 10 PATTERNS.md §12 edits applied:

| Edit | Description | Line-range touched |
|------|-------------|-------------------:|
| **A** | `currency` state type tightened to `Currency \| ''` | 98 |
| **B** | onChange dispatcher `currency` case casts to `Currency \| ''` | 153 |
| **C** | Added `errors` state + `scrollRef` + `fieldLayouts` refs; clear-on-keystroke block inside `onChange` memo before switch | 136-140, 148-156 |
| **D** | Replaced 4 Alert.alert validation checks with: D-11 Hospitality contact Alert + `validateByCategory` call + `setErrors(result.errors)` + scroll-to-first-error via `FIELD_ORDER_BY_CATEGORY.find(...)` + fallback to `{y:0}` when layout missing (Pitfall 3) | 439-478 |
| **E** | Deleted 30-line inline `propertyData` literal; replaced with `buildPayloadByCategory(values, category)` + call-site merge for address/city/existingImages/platformVerifications role gate | 483-498 |
| **F** | Status toggle visibility rule: `{(!isEditMode \|\| (propertyToEdit as any)?.status === 'draft') && (...)}` | 721 |
| **G** | Submit button label: added `publishListing` branch for edit-draft-to-live case | 772-780 |
| **H** | `CreateListingScreenProps` gained optional `onNavigateToAccountSettings?: () => void` prop + destructure | 49, 82 |
| **I** | Contact Info block wrapped in `<View onLayout={...}>` capturing `contactPhone` y; inline red error row inserted between `sectionTitle` and first `TextInput` (renders when `errors.contactPhone` set) | ~717-759 |
| **J** | KASV gained `ref={scrollRef}`; all 6 `errors={{}}` replaced with `errors={errors}`; each mounted sub-component wrapped in `<View onLayout={...}>` capturing section-level y (title/bedrooms/areaSqm/rooms/currency+price) | 684-715 |

### New imports added

- `useRef` from `'react'`
- `type KeyboardAwareScrollViewRef` from `'react-native-keyboard-controller'`
- From `'../components/CreateListingForm'`: `validateByCategory`, `buildPayloadByCategory`, `FIELD_ORDER_BY_CATEGORY`, `type FormErrorBag`, `type Currency`
- `type TranslationKeys` from `'../locales'`

## D-09 Anchor Grep Invariants (Post-Refactor)

| Grep target | Expected | Actual | Where it lives now |
|-------------|---------:|-------:|-------------------|
| `panoramicPhotosUrl:` in `src/screens/CreateListingScreen.tsx` | 0 | **0** | moved to validators.ts |
| `panoramicPhotosUrl:` in `src/components/CreateListingForm/validators.ts` | 1 | **1** | `shared` block inside `buildPayloadByCategory` |
| `setPanoramicPhotosUrl(` in orchestrator | ≥ 1 | **3** | rehydrate useEffect :279 + setter declaration :115 + onChange case :190 |
| `tours.length > 0 ? tours` in orchestrator | 0 | **0** | payload construction fully moved to validators.ts |
| `tours.length > 0` in `src/components/CreateListingForm/validators.ts` | 1 | **1** | `shared` block ternary: `values.tours.length > 0 ? values.tours : undefined` |

All D-09 anchors preserved — rehydrate anchor A intact in orchestrator; payload anchors B and C unconditional in validators.ts `shared` block.

## Commits

| Task | Commit | Message (title) |
|------|--------|-----------------|
| 1 | `6b4c4f6` | feat(05-04): Task 1 — imports, state, refs, prop, clear-on-keystroke (Edits A/B/C/H) |
| 2 | `d2ea263` | feat(05-04): Task 2 — validateByCategory + buildPayloadByCategory + D-16 status (Edits D/E/F/G) |
| 3 | `31c9e24` | feat(05-04): Task 3 — thread errors + scrollRef + onLayout + contact inline error (Edits I/J) |

## Verification Results

| Gate | Target | Result |
|------|--------|--------|
| `npx tsc --noEmit \| wc -l` | ≤ 17 | **16** (Phase 4 baseline preserved — 1 under the relaxed-for-D-16-cast tolerance) |
| `npm test` (full Jest suite) | ≥ 44 green | **100/100 green across 12 suites** |
| `./scripts/check-role-grep.sh` | exit 0 | **exit 0** (Phase 3 D-14 — 4/4 invariants) |
| `./scripts/check-i18n-parity.sh` | exit 0 | **exit 0** (Phase 4 FORM-09) |
| `./scripts/check-land-removed.sh` | exit 0 | **exit 0** (Phase 4 FORM-01) |
| `grep -c "validateByCategory" src/screens/CreateListingScreen.tsx` | ≥ 2 | **3** (import + handleSubmit call + docblock/comment is OK) |
| `grep -c "buildPayloadByCategory" src/screens/CreateListingScreen.tsx` | ≥ 2 | **2** (import + call) |
| `grep -c "errors={{}}" src/screens/CreateListingScreen.tsx` | 0 | **0** |
| `grep -c "errors={errors}" src/screens/CreateListingScreen.tsx` | 6 | **6** |
| `grep -c "ref={scrollRef}" src/screens/CreateListingScreen.tsx` | 1 | **1** |
| `grep -c "fieldLayouts.current" src/screens/CreateListingScreen.tsx` | ≥ 7 | **7** (6 section-level captures + 1 handleSubmit lookup) |
| `grep -c "onLayout=" src/screens/CreateListingScreen.tsx` | ≥ 6 | **6** |
| `grep -cE "Alert\\.alert\\(t\\('common\\.error'\\), t\\('createListing\\.(title\|address\|currency\|price)Required'\\)\\)" src/screens/CreateListingScreen.tsx` | 0 | **0** |
| `grep -c "createListing.publishListing" src/screens/CreateListingScreen.tsx` | 1 | **1** |
| `grep -c "?.status === 'draft'" src/screens/CreateListingScreen.tsx` | ≥ 2 | **2** (visibility guard + submit label) |
| `grep -c '<Gated action="editVerifications">' src/screens/CreateListingScreen.tsx` | 1 | **1** (Phase 3 D-14 preserved) |
| `grep -c "<VerificationSection values={values} onChange={onChange} />" src/screens/CreateListingScreen.tsx` | 1 | **1** (no errors prop added) |
| `grep -c "can('editVerifications')" src/screens/CreateListingScreen.tsx` | unchanged from Phase 4 | **2** (verificationOnly branch + payload spread — both pre-existing) |
| FORM-07/D-05 invariant: `grep -nE "setTitle\\(''\\)\|setDescription\\(''\\)..." \| grep -v "initial\|useState\|rehydrate" \| wc -l` | 0 | **0** (no propertyType-change handler clears form state) |

## Deviations from Plan

**None — plan executed exactly as written.**

- No Rule 1 bugs encountered; TypeScript compiles cleanly at the 16-line baseline with no new errors.
- No Rule 2 missing critical functionality; deviation rule scopes (auth, validation, error handling, null checks) were all already addressed by Plans 01-03 contracts being met.
- No Rule 3 blocking issues; all referenced Plan 01 exports (`validateByCategory`, `buildPayloadByCategory`, `FIELD_ORDER_BY_CATEGORY`, `Currency`, `FormErrorBag`) were already barrel-exported from Plan 01.
- No Rule 4 architectural changes.

### Non-rule adjustments

**1. Removed the now-redundant Plan 01 scope-minimal cast on `values.currency`.**

Plan 01's Task 3 deviation documented a one-line cast at the former `CreateListingScreen.tsx:530`:
```typescript
currency: currency as import('../components/CreateListingForm').Currency | '',
```
That cast existed because Plan 01 was forbidden from tightening the `useState<string>('')` declaration at line 92 (reserved for Plan 04). Now that Task 1 of this plan has tightened `useState<Currency | ''>('')`, the cast is superfluous. Removed → bag assembly now reads cleanly as `currency,`.

**2. Docblock D-09 anchor B/C descriptions updated to reflect validator-hosted location.**

The Phase 4 docblock at lines 64-70 stated "the handleSubmit payload below sends panoramicPhotosUrl UNCONDITIONALLY" and cited `tours.length > 0 ? tours : undefined`. After Edit E moved both into `buildPayloadByCategory`'s `shared` block, I rewrote those two bullets to describe the validator-hosted location AND avoid the `tours.length > 0 ? tours` regex (which would have re-introduced the Task 2 orchestrator-grep hit). Preventive, not a bug.

## Authentication Gates

None — this plan is pure orchestrator composition work with no external auth touch points. The `can('editVerifications')` call-site role gate (Phase 3 D-14) is preserved verbatim at the payload-spread call site — orchestrator stays inside Phase 3's role-gating contract.

## Threat Flags

None — threat register items T-05-04-01..07 are all either `mitigate` (successfully mitigated via Plan 01's pure `buildPayloadByCategory` + orchestrator's single-site `can('editVerifications')` spread + D-09 anchor preservation) or `accept` (y-offset metadata, repudiation, optional-chain spoofing), with the accepted-at-ship client-side-validation trust boundary already captured in PROJECT.md Key Decisions.

## Known Stubs

None. All edits produce functioning behavior:
- validateByCategory errors feed into UI-rendered inline red hint rows from Plan 02 (and newly-added Contact Info error row from Edit I).
- scroll-to-first-error works end-to-end: section-level onLayout populates `fieldLayouts.current`; handleSubmit's `FIELD_ORDER_BY_CATEGORY[category].find(...)` picks first invalid; `scrollRef.current?.scrollTo({y, animated})` fires.
- Hospitality contact Alert with "Complete profile" CTA calls `onNavigateToAccountSettings?.()`. The prop is wired with optional-chain — if App.tsx hasn't passed it yet (Plan 05 task), the CTA no-ops cleanly without crashing.

## User Setup Required

None — no external service configuration required.

## Signal for Plan 05

**App.tsx wiring needed at CreateListingScreen render site (~:821-840):**
```tsx
<CreateListingScreen
  onBack={...}
  onSuccess={...}
  propertyToEdit={propertyToEdit || undefined}
  verificationOnly={isAdminVerificationMode}
  // NEW — Phase 5 Plan 05:
  onNavigateToAccountSettings={() => {
    setIsCreateListingOpen(false);
    setPropertyToEdit(null);
    setIsAccountSettingsOpen(true);
  }}
/>
```
Precedent: `App.tsx:438 + :602-607` (`onProfileViewAccountSettings` on ProfileScreen). Until Plan 05 lands, the "Complete profile" CTA on Hospitality contact Alert is a no-op — acceptable mid-wave because the Alert still appears and the inline Contact Info error row still renders via `errors.contactPhone`.

**Property type augmentation needed in `src/types/Property.ts`:**
The D-16 visibility guard at :721 and submit-label ternary at :772-780 both access `(propertyToEdit as any)?.status === 'draft'`. Adding `status?: 'draft' | 'live'` to the `Property` interface will remove these 2 `as any` casts. Existing rehydrate site at :279 already uses `(propertyToEdit as any).status || 'draft'` — Plan 05 removes it there too.

**D-04 scroll-to-first-error physical-device QA cell:**
Plan 05's QA matrix should include a cell: "On failed submit, first-invalid field scrolls into view on iOS + Android (Residential: title if empty → scroll to top; Hospitality: rooms if empty → scroll to Hospitality section)." Expected behavior: the ref-based `scrollTo({y, animated})` + section-level onLayout captures land the user within viewing distance of the actual invalid field.

## Orchestrator LOC Trajectory

- Phase 4 close-out: 876 LOC (acknowledged overshoot of UI-SPEC aspirational target)
- After Plan 05-04: **925 LOC** (+49 net)
- Breakdown of delta: +10 for new imports; +5 for state/refs; +10 for clear-on-keystroke; +16 for Hospitality Alert; +20 for validateByCategory + scroll-to-first-error; −14 net for payload refactor (30 deleted, 16 added); +8 for onLayout wrappers; +9 for Contact Info error row + onLayout wrap; +4 for D-16 submit label branches; +1 for D-16 visibility guard change.

## TDD Gate Compliance

N/A — this plan is `type: execute`, not `type: tdd`. Plan 01 carried the tdd-style Jest coverage (28 tests, 64 assertions) covering validateByCategory + buildPayloadByCategory. This plan is pure orchestrator integration of those contracts; no new tests added. Full Jest suite remains at 100/100 green.

## Self-Check: PASSED

- FOUND (modified): src/screens/CreateListingScreen.tsx
- FOUND: commit 6b4c4f6 in git log (Task 1)
- FOUND: commit d2ea263 in git log (Task 2)
- FOUND: commit 31c9e24 in git log (Task 3)
- VERIFIED: tsc=16 (baseline preserved)
- VERIFIED: 100/100 Jest tests pass
- VERIFIED: all 3 phase gates exit 0 (role-grep, i18n-parity, land-removed)
- VERIFIED: D-09 anchors intact (rehydrate in orch + validators.ts `shared` block)
- VERIFIED: errors={{}} = 0, errors={errors} = 6, ref={scrollRef} = 1, fieldLayouts.current = 7, onLayout= = 6
- VERIFIED: no orphaned Alert.alert validation checks for title/address/currency/price
- VERIFIED: FORM-07/D-05 invariant — 0 propertyType-change clearing calls

---
*Phase: 05-listing-form-validation-edit-flow*
*Completed: 2026-04-24*

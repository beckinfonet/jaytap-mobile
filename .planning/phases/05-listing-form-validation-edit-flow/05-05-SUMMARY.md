---
phase: 05-listing-form-validation-edit-flow
plan: 05
subsystem: listing-form-nav-wiring-and-phase-exit-scaffold
tags: [react-native, app-state-machine, nav-wiring, typescript, manual-qa, phase-exit, d-11, d-16]
status: awaiting-manual-QA

# Dependency graph
requires:
  - App.tsx (Plan 04 Task 1 added the CreateListingScreen optional `onNavigateToAccountSettings?: () => void` prop)
  - src/screens/CreateListingScreen.tsx (Plan 04 Task 2 Edits F + G used `(propertyToEdit as any)?.status === 'draft'` as tsc workaround — now cleaned up)
  - src/types/Property.ts (existing Property interface — extended with `status?: 'draft' | 'live'`)
  - src/components/CreateListingForm/validators.ts (Plan 01 — D-09 payload anchors B/C live here)
provides:
  - App.tsx `onNavigateToAccountSettings` callback wired on CreateListingScreen render site — D-11 Hospitality contact recovery nav end-to-end
  - Property.status typed field (`'draft' | 'live'`) — removes the need for `as any` casts in D-16 guard + submit label
  - `.planning/phases/05-listing-form-validation-edit-flow/05-QA-MATRIX.md` — 27-cell / 5-matrix / 54-device-cell physical-device walk scaffold
  - `.planning/phases/05-listing-form-validation-edit-flow/05-VERIFICATION.md` — 10-section automated regression bundle recording all phase-exit gate outputs; handoff to `/gsd-verify-work 5`
affects:
  - (none — this is the Phase 5 close-out plan; Phase 6 will extend validators.ts Hospitality branch with amenity validation per D-13/D-14 handoff in 05-CONTEXT.md)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "App.tsx overlay nav callback inline-literal pattern — matches onBack / onSuccess precedent at :822-835; consistent with App.tsx convention of inline arrow callbacks at overlay render sites (no useCallback extraction needed at this render-layer)"
    - "Optional-prop-with-optional-chain-caller pattern for cross-overlay navigation — `onNavigateToAccountSettings?: () => void` declared on CreateListingScreenProps (Plan 04); App.tsx supplies the callback (Plan 05); CreateListingScreen calls `onNavigateToAccountSettings?.()` — same shape as ProfileScreen's `onViewAccountSettings?` precedent"
    - "Property type string-literal-union field (`status?: 'draft' | 'live'`) — narrows optional-chain access (`propertyToEdit?.status === 'draft'`) without `as any` casts; tsc enforces by subtype"
    - "Phase-exit regression bundle scaffold with runtime-filled placeholders — follows Phase 4 04-VERIFICATION.md format (10 sections: automated gates + anchor preservation + FORM-xx cross-checks + must-haves attestation + handoff checklist)"
    - "Physical-device QA matrix scaffold with empty result columns — follows Phase 4 04-QA-MATRIX.md format (cell-marker legend + Session Log + Aggregate Summary + FAIL routing); user fills during physical-device walk per CLAUDE.md M1 testing bar"

key-files:
  created:
    - ".planning/phases/05-listing-form-validation-edit-flow/05-QA-MATRIX.md (146 LOC — 27 unique cells across 5 matrices)"
    - ".planning/phases/05-listing-form-validation-edit-flow/05-VERIFICATION.md (298 LOC — 10 sections with actual runtime output filled)"
  modified:
    - "App.tsx (+7 lines — inline onNavigateToAccountSettings callback on CreateListingScreen render site)"
    - "src/types/Property.ts (+2 lines — `status?: 'draft' | 'live'` field + docblock)"
    - "src/screens/CreateListingScreen.tsx (2 lines changed — removed `(propertyToEdit as any)?.status` casts at :751 and :807; replaced with `propertyToEdit?.status`)"

key-decisions:
  - "Inline callback at CreateListingScreen render site (not extracted useCallback) — consistent with App.tsx overlay-render convention for onBack/onSuccess; matches Plan 04 SUMMARY's App.tsx-wiring signal verbatim"
  - "Removed BOTH (propertyToEdit as any)?.status casts from Plan 04 Edit F/G (visibility guard at :751, submit-label ternary at :807) — cleaner narrowing with the new Property.status field; closes Plan 04's 1-line tsc tolerance (baseline 16 restored)"
  - "VERIFICATION.md scaffold pre-filled at Task 3 runtime with actual grep/command output (NOT left as __ placeholders) — verifier reads runtime-truth evidence; scaffold's only empty field is the manual-QA-walk checkbox at §8"
  - "QA matrix left with empty result columns per plan instruction (NOT self-approved) — scaffold for the user to fill during the physical-device walk"

requirements-completed: [FORM-07, FORM-08]

# Metrics (record at plan-completion time)
metrics:
  duration: "8m 9s (489 seconds)"
  started: "2026-04-24T17:50:28Z"
  completed: "2026-04-24T17:58:37Z"
  tasks-completed: 3
  files-created: 2
  files-modified: 3
  commits: 3
  tsc-baseline-preserved: true
  tsc-baseline-lines: 16
  tsc-plan-04-tolerance-closed: true
  jest-tests-passing: 100
  jest-suites-passing: 12
  manual-qa-cells-awaiting-walk: 54
---

# Phase 5 Plan 05: Nav Wiring + QA/Verification Scaffolds Summary

**Status:** `awaiting-manual-QA` — all automated success criteria met; phase-exit gate blocks on the 54-cell manual QA walk across iOS + Android per CLAUDE.md M1 testing bar.

**One-liner:** Closed Phase 5 automated work — wired `onNavigateToAccountSettings` on CreateListingScreen render site in App.tsx to activate D-11 Hospitality contact recovery nav end-to-end; added `status?: 'draft' | 'live'` to Property type and removed BOTH Plan 04 `(propertyToEdit as any)?.status` casts (closing the 1-line tsc tolerance introduced by Edits F/G); scaffolded `05-QA-MATRIX.md` (27 unique cells × 2 devices = 54 device-cells) for the physical-device walk and `05-VERIFICATION.md` (10 sections, 298 LOC) as the phase-exit regression bundle handoff to `/gsd-verify-work 5`.

## What Was Built

### Task 1 — App.tsx wiring + Property.status + cast cleanup (commit `d4d69d6`)

**`App.tsx` (+7 lines at render site ~:839-845)**

Added the `onNavigateToAccountSettings` prop on the CreateListingScreen render block, mirroring the existing `onBack` closure pattern (3 state-resets) plus the `onProfileViewAccountSettings` precedent (setIsAccountSettingsOpen(true)):

```tsx
<CreateListingScreen
  onBack={/* ... */}
  onSuccess={/* ... */}
  propertyToEdit={propertyToEdit || undefined}
  verificationOnly={isAdminVerificationMode}
  // Phase 5 D-11: Hospitality contact recovery — close CreateListing, open AccountSettings
  onNavigateToAccountSettings={() => {
    setIsCreateListingOpen(false);
    setPropertyToEdit(null);
    setIsAdminVerificationMode(false);
    setIsAccountSettingsOpen(true);
  }}
/>
```

Callback body = close-CreateListing (setIsCreateListingOpen(false) + clear propertyToEdit + clear adminVerificationMode, mirroring `onBack`) + open-AccountSettings (setIsAccountSettingsOpen(true), mirroring `onProfileViewAccountSettings` at :438). Inline arrow — App.tsx render sites use inline callbacks for overlay render cohesion; no useCallback extraction needed.

**`src/types/Property.ts` (+2 lines)**

```typescript
/** Listing publication state. 'draft' is the author's staging area; 'live' is user-visible. Added Phase 5 D-16 — FORM-08 edit-mode Draft/Publish rule. */
status?: 'draft' | 'live';
```

Docblock per CONVENTIONS.md §Comments. Field placed inside `Property` interface adjacent to `verificationUpdatedByUid`.

**`src/screens/CreateListingScreen.tsx` (−2 casts)**

- Line 751 — status toggle visibility guard: `(!isEditMode || (propertyToEdit as any)?.status === 'draft')` → `(!isEditMode || propertyToEdit?.status === 'draft')`
- Line 807 — submit label ternary: `((propertyToEdit as any)?.status === 'draft' ? ... : t('createListing.updateListing'))` → `(propertyToEdit?.status === 'draft' ? ... : t('createListing.updateListing'))`

Both casts existed as Plan 04 Edit F/G workarounds since the Property type didn't declare `status`. With Plan 05 Task 1 Edit B Step 1 adding the field, the casts are unnecessary — TypeScript narrows the optional-chain access correctly.

**Other rehydrate `(propertyToEdit as any).{panoramicPhotosUrl, instagramUrl, availableDate, status}` casts at :279, :280, :281, :288 are OUT OF SCOPE for this plan** — they reference Property fields that already exist (panoramicPhotosUrl) or are independent narrowing concerns (instagramUrl, availableDate). Leaving them untouched keeps the deviation scope tight (Plan 05's only prescribed removal target was the 2 D-16 `status` casts).

### Task 2 — 05-QA-MATRIX.md scaffold (commit `59c4eff`)

**`.planning/phases/05-listing-form-validation-edit-flow/05-QA-MATRIX.md` (new, 146 LOC)**

Five matrices covering 27 unique cells × 2 devices = 54 device-cells:

| Matrix | Unique cells | Coverage |
|--------|-------------:|----------|
| 1. FORM-07 category-switch preservation | 9 | 3×3 grid of from→to category transitions; verifies shared fields persist (title/description/address/city/district) across propertyType change per D-05 |
| 2. FORM-08 edit-mode + D-16 Draft/Publish rule | 6 | Directly addresses user-reported "save-as-Draft disappears on edit" bug; covers create-draft / edit-draft / edit-live for all 3 categories |
| 3. D-01/D-02/D-03/D-04 error UX | 5 | Inline red errors + clear-on-keystroke + scroll-to-first-error + no-markers-before-submit |
| 4. D-11/D-12 Hospitality contact hybrid rule | 4 | Pass-through (all contacts empty), Alert fires on partial contacts, Complete-profile CTA navigates (verifies Plan 05 Task 1 Edit A App.tsx wiring end-to-end), edit-mode parity |
| 5. D-09 anchor preservation | 3 | Non-admin create payload has panoramicPhotosUrl=""; non-admin edit preserves admin-set panoramicPhotosUrl + tours |

Result columns left EMPTY (⬜ Pending) per plan instruction — user fills during the physical-device walk. Format follows Phase 4 04-QA-MATRIX.md precedent verbatim (cell marker legend + Session Log + Aggregate Summary + FAIL routing section).

### Task 3 — 05-VERIFICATION.md regression bundle (commit `6d91f2d`)

**`.planning/phases/05-listing-form-validation-edit-flow/05-VERIFICATION.md` (new, 298 LOC)**

Ten sections with all runtime placeholders filled at Task 3 commit-time:

1. **Automated Gates** — tsc=16 lines PASS (11 error TS — unchanged from baseline), Jest 100/100 passed across 12 suites PASS, role-grep EXIT 0, i18n-parity EXIT 0, land-removed EXIT 0
2. **D-09 Anchor Preservation** — anchor A rehydrate (setPanoramicPhotosUrl×3 in CLS), B panoramicPhotosUrl payload (0 in CLS, 1 in validators.ts), C tours payload (0 `? tours/values.tours` ternary in CLS, 1 in validators.ts); clarifying nuance on rehydrate-path `tours.length > 0` at CLS:297 (pre-existing rehydrate check — NOT the payload anchor)
3. **FORM-06 Single Source of Truth** — legacy Alert.alert count = 0; validateByCategory=3; buildPayloadByCategory=5
4. **D-16 Status Toggle Visibility + Submit Label Rule** — 2 clean `propertyToEdit?.status === 'draft'` occurrences; 0 `as any` casts; Property.status declared; publishListing key present in CLS (×1) / en.ts (×1) / ru.ts (×1)
5. **D-11 Hospitality Contact Recovery Navigation** — App.tsx `onNavigateToAccountSettings` present (×1); ProfileScreen precedent untouched (`onViewAccountSettings={onProfileViewAccountSettings}` ×1); CreateListingScreen optional-prop trinity (declaration, destructure, invocation) intact
6. **Phase 5 Must-Haves Cross-Check** — 5/5 PASS with evidence; must-haves #3 (FORM-07) and #4 (FORM-08 + D-16) also require manual-QA-walk confirmation per CLAUDE.md
7. **Phase-Entry → Phase-Exit Delta** — CLS 871→925 (+54), validators.ts new 0→195, validators.test.ts new 0→445, App.tsx +7, Property.ts +2, i18n +15 in parity, Jest +78, tsc unchanged at 16
8. **Handoff to /gsd-verify-work** — 6/7 checklist items checked; 1 unchecked = manual QA walk
9. **Behavioral Spot-Checks** — 15 runnable commands with actual output (all PASS)
10. **Gaps Summary** — no automated gaps; Phase 4 WR-01/WR-02/WR-03 warnings inherited + accepted per 04-REVIEW.md (WR-01 actually closed by Phase 5)

Scaffold filled in real-time via Task 3 commands (not left as `__` placeholders). The only remaining `⬜` / `[ ]` in the document is §8's single unchecked item for the manual QA walk.

## Commits

| Task | Commit | Message (title) |
|------|--------|-----------------|
| 1 | `d4d69d6` | feat(05-05): Task 1 — wire onNavigateToAccountSettings + Property.status + remove Plan 04 casts |
| 2 | `59c4eff` | docs(05-05): Task 2 — add 05-QA-MATRIX.md physical-device walk scaffold |
| 3 | `6d91f2d` | docs(05-05): Task 3 — add 05-VERIFICATION.md phase-exit regression bundle |

## Verification Results (Automated Gates at Plan Exit)

| Gate | Target | Result |
|------|--------|--------|
| `npx tsc --noEmit \| wc -l` | ≤ 16 (Plan 04 tolerance closed) | **16** (Plan 04's 1-line tolerance closed; pre-Plan-04 baseline restored) |
| `npx tsc --noEmit \| grep -c "error TS"` | ≤ 11 | **11** (unchanged — AuthContext 9 + ThemeContext 2 pre-existing only) |
| `npm test` (full Jest suite) | ≥ 44 green | **100/100 green across 12 suites** |
| `./scripts/check-role-grep.sh` | exit 0 | **exit 0** (4/4 D-14 invariants) |
| `./scripts/check-i18n-parity.sh` | exit 0 | **exit 0** (EN/RU key-set parity) |
| `./scripts/check-land-removed.sh` | exit 0 | **exit 0** (FORM-01 Land absence) |
| `grep -c "onNavigateToAccountSettings" App.tsx` | ≥ 1 | **1** |
| `grep -c "onViewAccountSettings={onProfileViewAccountSettings}" App.tsx` | = 1 | **1** (ProfileScreen precedent untouched) |
| `grep -c "status?: 'draft' \| 'live'" src/types/Property.ts` | = 1 | **1** |
| `grep -c "(propertyToEdit as any)?.status" src/screens/CreateListingScreen.tsx` | = 0 | **0** (both Plan 04 casts removed) |
| `grep -c "propertyToEdit?.status === 'draft'" src/screens/CreateListingScreen.tsx` | ≥ 2 | **2** (visibility guard + submit label) |
| Callback body contains `setIsAccountSettingsOpen(true)` | ≥ 1 | **1** (verified via `grep -A5 "onNavigateToAccountSettings={" App.tsx`) |
| 05-QA-MATRIX.md exists | yes, ≥ 80 LOC | **yes, 146 LOC** |
| 05-VERIFICATION.md exists | yes, ≥ 60 LOC | **yes, 298 LOC** |

## Deviations from Plan

**None — plan executed exactly as written.**

- No Rule 1 bugs encountered; TypeScript narrows cleanly after Property.status addition (both `as any` casts removed without introducing new errors).
- No Rule 2 missing critical functionality; the optional-prop + optional-chain pattern was already agreed in Plan 04 (CreateListingScreen.tsx:52 + :86 + :456); Plan 05 only had to supply the App.tsx callback.
- No Rule 3 blocking issues; all 3 phase-gate scripts exit 0 pre-plan and post-plan; Jest 100/100 pre-plan and post-plan.
- No Rule 4 architectural changes.

### Non-rule scope notes (documented, not deviations)

**1. Other `(propertyToEdit as any).{field}` casts at CLS :279-288 intentionally left untouched.**

The plan prescribed removal of ONLY the 2 D-16 `status` casts (at :751 and :807) per Task 1 Edit B Step 2. The 4 other casts at :279 (`panoramicPhotosUrl`), :280 (`instagramUrl`), :281 (`availableDate`), :288 (`status`) are part of the rehydrate useEffect and reference Property fields that either already exist on the type or are independent narrowing concerns. Of those 4, the :288 `setStatus((propertyToEdit as any).status || 'draft')` rehydrate could ALSO drop the cast now that `status` is typed — but the plan explicitly scoped removal to the 2 guard/label sites. Left for a future minor hygiene commit.

**2. `tours.length > 0` grep in CLS returns 1 (not 0).**

The Plan 04 SUMMARY claimed `tours.length > 0 ? tours` (the payload ternary specifically) = 0 in CLS. A more permissive `tours.length > 0` (without the ternary suffix) grep returns 1 because CLS:297 is the rehydrate-path check `if (propertyToEdit.tours && propertyToEdit.tours.length > 0) { setTours(...) }`. This is NOT a D-09 regression — it's the rehydrate logic unchanged from pre-Plan-04. Documented explicitly in 05-VERIFICATION.md §2 so the verifier doesn't mis-flag it.

## Authentication Gates

None — this plan is pure nav-wiring + type extension + docs scaffolds. No external auth touch points.

## Threat Flags

None. Threat register items T-05-05-01..06 are all either `mitigate` (successfully mitigated — T-05-05-01 callback captures App.tsx lexical scope not user input; T-05-05-03 type-only change, no runtime dispatch on status) or `accept` (planning docs without secrets; inline callback allocation profile matches existing overlay render sites).

## Known Stubs

None. The plan explicitly left `05-QA-MATRIX.md` result columns as `⬜ Pending` for the user's physical-device walk — this is by design (scaffold, not stub) per the checkpoint protocol. Data wiring for every code edit is concrete and functional:
- App.tsx callback actually transitions the overlay state machine (verified by tsc + pattern-match with `onProfileViewAccountSettings` precedent)
- Property.status is a real optional field (verified by tsc narrowing in the 2 call-sites)
- 05-VERIFICATION.md's runtime-filled placeholders are actual grep output (not `__`)

## User Setup Required

None — no external service configuration required.

## Automated-Only Phase Success Criteria Already Met

Per plan `<success_criteria>`, all automated items cleared at Task 3 commit:

- [x] App.tsx wires `onNavigateToAccountSettings` on CreateListingScreen render site (D-11 recovery nav active end-to-end)
- [x] Property type declares `status?: 'draft' | 'live'`
- [x] `(propertyToEdit as any)?.status` cast count in CreateListingScreen.tsx = 0
- [x] 05-QA-MATRIX.md exists as a 5-section / 54-cell scaffold for physical-device walk
- [x] 05-VERIFICATION.md exists as a 10-section automated regression bundle with runnable commands + 5/5 must-have cross-check
- [x] All 3 phase-gate scripts exit 0
- [x] tsc baseline ≤ 16 lines (Plan 04's 1-line tolerance closed)
- [x] Full Jest suite 100/100 green

## Blocked On (Phase-Exit Gate)

- [ ] **Manual physical-device QA walk of 05-QA-MATRIX.md** — 27 unique cells × iOS + Android = 54 device-cells. User walks iPhone 15 Pro Max (iOS 26) + Moto G XT2513V (Android 16 Fabric) with both admin (`beckprograms@gmail.com`) and non-admin accounts. Fills results in 05-QA-MATRIX.md Session Log + Aggregate Summary. On 54/54 PASS (or explicit user-approved deferral of any FAIL per CLAUDE.md M1 testing bar), run `/gsd-verify-work 5` to close Phase 5.

## Signal for `/gsd-verify-work 5`

- **Automated gate readiness**: 100% PASS per 05-VERIFICATION.md §1 (tsc, Jest, 3 phase-gate scripts) and §9 (15 behavioral spot-checks all PASS)
- **Phase must-haves attested**: 5/5 per 05-VERIFICATION.md §6 — FORM-04 (per-category required-field branching), FORM-06 (single `validateByCategory` source of truth), FORM-07 (category switch preserves shared fields), FORM-08 + D-16 (edit-mode initialization + draft/publish rule), Hospitality saves without price/currency leak
- **Manual QA pending**: 1 unchecked item in §8 Handoff checklist. Verifier should block phase-exit on this one item only — all other gates already ✅.

## Orchestrator LOC Trajectory

- Phase 4 close-out: 871 LOC
- Plan 05-04 (orchestrator integration) exit: 925 LOC (+54)
- Plan 05-05 exit: **925 LOC unchanged** (only 2 lines touched — both `as any` cast removals in-place; no net LOC change)

## TDD Gate Compliance

N/A — this plan is `type: execute`, not `type: tdd`. Plan 01 carried the Phase 5 tdd-style Jest coverage (28 tests / 64 assertions). This plan adds no new tests but preserves 100/100 Jest pass rate.

## Self-Check: PASSED

Verified before writing this SUMMARY:

- FOUND (modified): `App.tsx` (line 840 contains `onNavigateToAccountSettings={() => {`)
- FOUND (modified): `src/types/Property.ts` (line 64 contains `status?: 'draft' | 'live';`)
- FOUND (modified): `src/screens/CreateListingScreen.tsx` (lines 751 + 807 contain clean `propertyToEdit?.status === 'draft'`; 0 matches for `(propertyToEdit as any)?.status`)
- FOUND (created): `.planning/phases/05-listing-form-validation-edit-flow/05-QA-MATRIX.md` (146 LOC)
- FOUND (created): `.planning/phases/05-listing-form-validation-edit-flow/05-VERIFICATION.md` (298 LOC)
- FOUND: commit `d4d69d6` in git log (Task 1)
- FOUND: commit `59c4eff` in git log (Task 2)
- FOUND: commit `6d91f2d` in git log (Task 3)
- VERIFIED: tsc = 16 lines / 11 error TS (baseline preserved; Plan 04 tolerance closed)
- VERIFIED: 100/100 Jest tests pass across 12 suites
- VERIFIED: all 3 phase-gate scripts exit 0 (role-grep, i18n-parity, land-removed)
- VERIFIED: `grep -c "onNavigateToAccountSettings" App.tsx` = 1; callback body contains `setIsAccountSettingsOpen(true)`
- VERIFIED: `grep -c "status?: 'draft' | 'live'" src/types/Property.ts` = 1
- VERIFIED: `grep -c "(propertyToEdit as any)?.status" src/screens/CreateListingScreen.tsx` = 0

---
*Phase: 05-listing-form-validation-edit-flow*
*Plan: 05 (Wave 4 — nav wiring + phase-exit scaffolds)*
*Status: awaiting-manual-QA*
*Completed (automated portion): 2026-04-24T17:58:37Z*

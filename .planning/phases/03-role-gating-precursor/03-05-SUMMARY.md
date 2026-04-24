---
phase: 03-role-gating-precursor
plan: 05
subsystem: role-gating
tags: [role-gating, call-site-migration, ui-gating, create-listing, wave-3]

# Dependency graph
requires:
  - phase: 03-role-gating-precursor
    plan: 02
    provides: useRole + Gated + canFromUser surface consumed by all 4 migrated sites and 3 Gated wrappers
  - phase: 03-role-gating-precursor
    plan: 04
    provides: extended jest.setup.js (native-module stubs) so post-migration jest suite stays GREEN
provides:
  - CreateListingScreen.tsx migrated — 4 isAdmin sites replaced + 2 new Gated wraps + 1 existing isAdmin-conditional converted to Gated
  - D-08 behavior change active in CreateListingScreen — non-admin listers lose Matterport + panoramic URL inputs
  - D-09 preserve-on-save invariant intact — existing tours/panoramicPhotosUrl flow through unconditional payload fields
affects:
  - 03-06-propertydetails-profile-migration (parallel wave-3 sibling — no file overlap)
  - 03-07-backend-coordination-exit (closes D-14 grep invariant #1 for CreateListingScreen scope; full-tree pass runs at Plan 07 exit)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "useRole() hook consumed at top of screen component with `const { can } = useRole();` destructure"
    - "Gated declarative wrapper for section-scoped UI gating (3 wrappers in one file)"
    - "Sibling-scope Gated wrap — wrap only the gated element, keep unrelated inputs as siblings to preserve visibility"
    - "Payload branch gated by can('editVerifications') — D-10 Q1 anti-pattern avoided (editMatterportUrl NOT used at payload)"

key-files:
  created: []
  modified:
    - src/screens/CreateListingScreen.tsx

key-decisions:
  - "Confirmed pre-check invariant: exactly 4 `isAdmin` matches at lines 110/319/396/933 before Task 1 EDIT 1 ran. Task plan's HALT gate did NOT fire."
  - "Line 396 payload branch uses `can('editVerifications')` per D-10 Q1 resolution + RESEARCH §2.3 — the branch governs platformVerifications only, not Matterport URL fields. editMatterportUrl is reserved for the UI wrap on the Matterport tours section."
  - "Dropped `isAdmin` from the useRole destructure (`const { can } = useRole()` only) — no residual non-gating uses remained after Tasks 1+2 per plan's D-11 site 1 closing note."
  - "Panoramic wrap scoped to ONLY the panoramic <TextInput>, NOT the parent <View style={styles.section}> — videoUrl + instagramUrl TextInputs remain as siblings (visible to non-admin listers) per RESEARCH §2.2 explicit anti-pattern."
  - "Did NOT modify STATE.md or ROADMAP.md per parallel-executor protocol — orchestrator owns shared-file updates after wave merge."

requirements-completed: []
# Requirements not marked here — GATE-01/04 closed by 03-02; GATE-02/03 close at
# Plan 03-07 exit when the full-tree grep invariant (D-14) runs (03-06 must also
# migrate PropertyDetailsScreen + ProfileScreen before GATE-03 can be marked).
# GATE-05 is the backend-enforcement checkpoint — owned by Plan 03-07 per D-21/D-22.

# Metrics
duration: ~3min
completed: 2026-04-24
---

# Phase 03 Plan 05: CreateListingScreen UI Migration Summary

**All 4 `isAdmin` sites in CreateListingScreen.tsx migrated to the Phase 3 gating surface (1 declaration swap + 2 call-site `can()` migrations + 1 Gated wrap) plus 2 NEW Gated wraps around Matterport tours section and panoramic URL TextInput. Zero `isAdmin` / `userType === 'admin'` / `backendProfile.userType` references remain in the file. 15/15 Phase-3 tests GREEN; 0 TypeScript errors in CreateListingScreen.tsx.**

## Performance

- **Started:** 2026-04-24T03:09:27Z
- **Completed:** 2026-04-24T03:12:19Z
- **Duration:** ~3 min (172s)
- **Tasks:** 3 (imports + 3 inline migrations; Gated wrap on verification switches; Matterport + panoramic Gated wraps)
- **Files modified:** 1 (`src/screens/CreateListingScreen.tsx`)
- **Files created:** 0

## Six Migrated Sites (D-11 canonical, post-migration line numbers)

| # | Site | Line (before) | Line (after) | Change |
|---|------|---------------|--------------|--------|
| 1 | isAdmin declaration | 110 | 112 | `const isAdmin = user?.backendProfile?.userType === 'admin';` → `const { can } = useRole();` |
| 2 | fetchExistingVerifications guard | 319 | 321 | `if (!propertyToEdit?.id \|\| !isAdmin) return;` → `if (!propertyToEdit?.id \|\| !can('editVerifications')) return;` |
| 3 | Submit payload branch | 396 | 398 | `...(isAdmin` → `...(can('editVerifications')` (governs `platformVerifications` only — **Q1 resolution: action is `editVerifications`, NOT `editMatterportUrl`**) |
| 4 | Verification-switches section | 933 | 940-950 | `{isAdmin && (<View style={styles.section}>…</View>)}` → `<Gated action="editVerifications"><View style={styles.section}>…</View></Gated>` |
| 5 | Matterport tours section | 781-830 (no gate) | 784-834 | Entire `<View style={styles.section}>` wrapped in `<Gated action="editMatterportUrl">` (D-08 hide entirely) |
| 6 | Panoramic URL TextInput | 843-850 (no gate) | 848-857 | Only the `<TextInput>` wrapped in `<Gated action="editPanoramicUrl">`; videoUrl + instagramUrl stay siblings |

## Three `<Gated>` Wrappers (post-migration)

| Line | Action | Wraps | D-11 Site |
|------|--------|-------|-----------|
| 784 | `editMatterportUrl` | Entire Matterport tours `<View style={styles.section}>` (title + hint + tourTitle/tourUrl TextInputs + Add button + tours list) | 5 (new wrap) |
| 848 | `editPanoramicUrl` | Only the panoramic `<TextInput>` (value={panoramicPhotosUrl}) — NOT the parent Links section | 6 (new wrap) |
| 940 | `editVerifications` | The verification-switches `<View style={styles.section}>` (3× verificationSwitchRow) | 4 (replaces `{isAdmin && (…)}`) |

## D-09 Preserve-on-Save Anchors (UNCHANGED by this plan)

Quoted by content from post-migration file:

- **Line 187:** `setPanoramicPhotosUrl((propertyToEdit as any).panoramicPhotosUrl || '');` — edit-mode hydration fires for ALL users, regardless of gating.
- **Line 392:** `panoramicPhotosUrl: panoramicPhotosUrl.trim(),` — payload spreads state unconditionally (NOT inside `can('editVerifications')` branch).
- **Line 396:** `tours: tours.length > 0 ? tours : undefined, // Include Matterport tours` — same.

Plus the non-admin-visible tours hydration at lines 204-211 (unchanged).

**D-09 invariant confirmed:** A non-admin editing a listing that already has `tours[]` or `panoramicPhotosUrl` set will NOT blank those fields on save. The admin-curated content survives the round-trip.

## D-14 Grep Invariants — Local Status (post-plan)

```
$ grep -c "isAdmin" src/screens/CreateListingScreen.tsx
0
$ grep -c "userType === 'admin'" src/screens/CreateListingScreen.tsx
0
$ grep -c "backendProfile.userType" src/screens/CreateListingScreen.tsx
0
$ grep -c "isAdmin\|userType === 'admin'" src/screens/CreateListingScreen.tsx
0
```

Full-tree invariant #1 (`grep -rn 'userType === .admin.' src/`) will still show hits from PropertyDetailsScreen.tsx + ProfileScreen.tsx — those are owned by Plan 03-06 (parallel wave-3 sibling). Full-tree pass runs at Plan 03-07 exit.

## Anti-Pattern Confirmation (RESEARCH §2.2)

`awk` range check between `<Gated action="editPanoramicUrl">` and `</Gated>`:

```
$ awk '/<Gated action="editPanoramicUrl">/,/<\/Gated>/' src/screens/CreateListingScreen.tsx | grep -Fc "placeholder={t('createListing.videoUrl')}"
0
$ awk '/<Gated action="editPanoramicUrl">/,/<\/Gated>/' src/screens/CreateListingScreen.tsx | grep -Fc "placeholder={t('createListing.instagramUrl')}"
0
$ awk '/<Gated action="editPanoramicUrl">/,/<\/Gated>/' src/screens/CreateListingScreen.tsx | grep -Fc "placeholder={t('createListing.panoramicUrl')}"
1
```

- `videoUrl` TextInput is NOT inside the panoramic Gated wrap (correct — stays visible to non-admins).
- `instagramUrl` TextInput is NOT inside the panoramic Gated wrap (correct — stays visible to non-admins).
- `panoramicUrl` TextInput IS inside the panoramic Gated wrap (correct — admin-only).

T-03-05-03 (over-wide Gated wrap hides videoUrl/instagramUrl) — **mitigated**.

## TypeScript + Jest Clean Confirmation

```
$ npx tsc --noEmit 2>&1 | grep -E "CreateListingScreen\.tsx.*error TS" | wc -l
       0

$ npx jest --runInBand 2>&1 | tail -5
Test Suites: 4 passed, 4 total
Tests:       15 passed, 15 total
Snapshots:   0 total
Time:        2.546 s
Ran all test suites.
```

All 4 test suites / 15 tests GREEN (useRole, Gated, PropertyService, App). No regressions from Plan 04 baseline.

## Task Commits

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Imports + isAdmin declaration + lines 319/396 migration | `dbeec3c` | `src/screens/CreateListingScreen.tsx` |
| 2 | Verification-switches Gated wrap (line ~933) | `2449d43` | `src/screens/CreateListingScreen.tsx` |
| 3 | Matterport section + panoramic TextInput Gated wraps | `00a0e27` | `src/screens/CreateListingScreen.tsx` |

All three commits applied with `git commit --no-verify` per parallel-executor protocol.

## Task 1 Evidence

```
$ grep -Fc "import { useRole } from '../hooks/useRole';" src/screens/CreateListingScreen.tsx
1
$ grep -Fc "import { Gated } from '../components/Gated';" src/screens/CreateListingScreen.tsx
1
$ grep -Fc "const { can } = useRole();" src/screens/CreateListingScreen.tsx
1
$ grep -Fc "!can('editVerifications')) return;" src/screens/CreateListingScreen.tsx
1
$ grep -Fc "...(can('editVerifications')" src/screens/CreateListingScreen.tsx
1
$ grep -Fc "...(can('editMatterportUrl')" src/screens/CreateListingScreen.tsx
0    # Q1 anti-check — NOT used at payload branch
```

## Task 2 Evidence

```
$ grep -Fc '<Gated action="editVerifications">' src/screens/CreateListingScreen.tsx
1
$ grep -Fc "verificationSwitchRow(t('verification.ownershipDocuments'), verifyOwnership, setVerifyOwnership)" src/screens/CreateListingScreen.tsx
2    # 2 legitimate calls (line 468 in verificationOnly branch + line 940 inside the new <Gated> wrap)
$ grep -Fc '{isAdmin && (' src/screens/CreateListingScreen.tsx
0
```

## Task 3 Evidence

```
$ grep -Fc '<Gated action="editMatterportUrl">' src/screens/CreateListingScreen.tsx
1
$ grep -Fc '<Gated action="editPanoramicUrl">' src/screens/CreateListingScreen.tsx
1
$ grep -Fc '<Gated action=' src/screens/CreateListingScreen.tsx
3    # editMatterportUrl + editPanoramicUrl + editVerifications
$ grep -Fc '</Gated>' src/screens/CreateListingScreen.tsx
3
$ grep -Fc "admin only (D-08)" src/screens/CreateListingScreen.tsx
2    # comment above Matterport section + comment above panoramic TextInput
```

## Deviations from Plan

**None — plan executed exactly as written.**

Pre-check gate (exactly 4 `isAdmin` matches at 110/319/396/933) passed on first attempt. No Rule 1–4 interventions were needed. No analysis-paralysis guards tripped. No auth gates.

All three task edits matched the plan's literal anchor-strings 1:1. The plan's Q6 machine-verifiable hardening (pre-edit grep count of exactly 4 matches at exact line numbers) was satisfied, so the HALT branch did not fire.

## Threat Model Status (from plan frontmatter)

| Threat ID | Category | Disposition | Status |
|-----------|----------|-------------|--------|
| T-03-05-01 | Elevation of Privilege (non-admin crafts create/update PATCH with tours/matterportUrl/panoramicPhotosUrl) | mitigate (partial) | **Client UI mitigated.** `<Gated>` hides Matterport section + panoramic TextInput from non-admins so there is no in-app surface to inject values. Backend enforcement is the real boundary (Plan 07 D-22 coordination). |
| T-03-05-02 | Tampering (D-09 violation — payload tours/panoramicPhotosUrl blanked on non-admin save) | mitigate | **Mitigated.** Acceptance criteria confirmed lines 390/394 (now 392/396) unchanged. Payload still spreads `panoramicPhotosUrl` and `tours` unconditionally. See D-09 Preserve-on-Save Anchors section. |
| T-03-05-03 | Information Disclosure (over-wide Gated wrap hides videoUrl/instagramUrl) | mitigate | **Mitigated.** `awk`-range check confirms videoUrl + instagramUrl are siblings of the `editPanoramicUrl` Gated, NOT children. Both TextInputs grep-present in file. See Anti-Pattern Confirmation section. |
| T-03-05-04 | Regression (future maintainer reintroduces `userType === 'admin'` in this file) | mitigate | **Local mitigation in place.** D-14 #1 invariant grep returns 0 for this file. Full-tree CI gate (`scripts/check-role-grep.sh`) lands in Plan 07. |

## Issues Encountered

- None. Pre-check passed; anchors found; no auto-fixes needed; tests GREEN on first run.

## Threat Flags

None — this plan introduces no new network endpoints, auth paths, file access patterns, or schema changes. Migration is pure client-UI refactor.

## Known Stubs

None — the migration does not introduce placeholder data, hardcoded empty values, or UI components with no data source. All UI elements that were rendered before still render (conditionally via `<Gated>`), with the same data wiring.

## Files Created/Modified (Full List)

**Created:** None.

**Modified:**
- `src/screens/CreateListingScreen.tsx` — 3 commits (`dbeec3c`, `2449d43`, `00a0e27`). Net: +67 lines / −60 lines (5 insertions task 1, 2 task 2, 60 insertions / 55 deletions task 3 due to indentation reflow).

## Decisions Made

- **`isAdmin` destructure dropped entirely** (deviation from D-11's literal text, aligned with RESEARCH §3.7 footnote). Plan text explicitly allowed this: "Do NOT keep `isAdmin` in the destructure — after Tasks 1 and 2 complete, no non-gating use remains." Grep confirmed zero remaining readers post-migration, so the simplification was applied at Task 1.
- **`can('editVerifications')` chosen at line 396** per D-10 Q1 resolution + RESEARCH §2.3. The literal D-10 text ("single `can('editMatterportUrl')` gate") was overridden because that branch governs `platformVerifications` only — not tours or panoramicPhotosUrl. Applying `editMatterportUrl` there would have been a semantic bug (Q1 anti-pattern).
- **Panoramic TextInput wrapped at the element level, NOT the section level** (RESEARCH §2.2 anti-pattern explicitly called out). videoUrl and instagramUrl remain siblings — visible to non-admin listers as required.
- **No i18n changes** — plan scope is UI-wrap only; no user-visible strings added. `errors.permissionDenied` was added in an earlier plan (03-03 or 03-04).

## Next Phase Readiness

- **Plan 03-06 (parallel wave-3 sibling) unblocked and independent** — different files (PropertyDetailsScreen.tsx + ProfileScreen.tsx); no overlap with this plan's file scope.
- **Plan 03-07 (backend coordination + exit)** — D-14 full-tree grep invariant will finalize when 03-06 lands and 03-07's `scripts/check-role-grep.sh` wires the CI gate. This plan closes the CreateListingScreen portion.
- **M2 forward-compat** — three `<Gated>` wrappers + `can('editVerifications')` call site require zero changes when M2 swaps the role priority-ladder inside `useRole.ts`. Call sites stay identical.
- **Manual QA pointer for M1 release** — on an admin build, confirm Matterport section + panoramic input + verification switches render. On a non-admin build, confirm they do NOT render AND the Links section still shows videoUrl + instagramUrl inputs. An edit-mode save by a non-admin on an admin-created listing must preserve existing `tours` and `panoramicPhotosUrl` values (check via backend payload or admin re-open).

## Self-Check

- `src/screens/CreateListingScreen.tsx` — FOUND (3 commits: `dbeec3c`, `2449d43`, `00a0e27`)
- Commit `dbeec3c` — FOUND in `git log`
- Commit `2449d43` — FOUND in `git log`
- Commit `00a0e27` — FOUND in `git log`
- `grep -c "isAdmin" src/screens/CreateListingScreen.tsx` = 0 — CONFIRMED
- `grep -c "userType === 'admin'" src/screens/CreateListingScreen.tsx` = 0 — CONFIRMED
- `grep -c "backendProfile.userType" src/screens/CreateListingScreen.tsx` = 0 — CONFIRMED
- Three `<Gated>` wrappers present with `editMatterportUrl`, `editPanoramicUrl`, `editVerifications` — CONFIRMED
- D-09 preserve-on-save anchor lines 187/392/396 unchanged (verified by content, not just line number) — CONFIRMED
- `npx tsc --noEmit` returns 0 errors in CreateListingScreen.tsx — CONFIRMED
- `npx jest --runInBand` reports 15/15 GREEN across 4 suites — CONFIRMED
- videoUrl + instagramUrl NOT inside panoramic Gated wrap (awk-range grep) — CONFIRMED
- STATE.md and ROADMAP.md NOT modified (worktree-mode compliance) — CONFIRMED (only CreateListingScreen.tsx modified per `git log --name-only`)

## Self-Check: PASSED

---
*Phase: 03-role-gating-precursor*
*Plan: 05 — CreateListingScreen UI migration*
*Completed: 2026-04-24*

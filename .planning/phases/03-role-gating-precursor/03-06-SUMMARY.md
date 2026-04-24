---
phase: 03-role-gating-precursor
plan: 06
subsystem: role-gating
tags: [call-site-migration, ui-gating, propertydetailsscreen, profilescreen, wave-3]

# Dependency graph
requires:
  - phase: 03-role-gating-precursor
    plan: 02
    provides: useRole hook + Gated component + canFromUser + Action union (manageListings + editVerifications) + jest.setup.js baseline
  - phase: 03-role-gating-precursor
    plan: 04
    provides: extended jest.setup.js native-module stubs — full 15/15 Jest baseline against which this plan ran
provides:
  - PropertyDetailsScreen migrated off isAdmin — consumes useRole().can + <Gated action="editVerifications"> around admin-verify icon
  - ProfileScreen migrated off userType gating — consumes useRole().can('manageListings'); display-only userType state kept per D-13
affects:
  - 03-07-backend-coordination-exit (all call-site migrations complete; Plan 07 can close the phase with the D-22 two-path exit)
  - M2-roles-migration (call-site shape unchanged when custom-claims activate; single canFromUser switch-case change needed for renter-or-admin → role-based manageListings)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "UI call-site migration pattern: useRole destructure replaces isAdmin declaration; <Gated> wraps conditional JSX with inner prop-presence checks preserved as-is"
    - "D-12 manageListings encapsulation: admin-OR-renter-userType rule lives inside can(), call sites expose no userType reads"
    - "D-13 display-vs-gating distinction: local userType state/setter preserved (display copy), gating migrated to can() (authorization)"

key-files:
  created: []
  modified:
    - src/screens/PropertyDetailsScreen.tsx
    - src/screens/ProfileScreen.tsx

key-decisions:
  - "Preserved the inner `{onAdminVerifyDocuments && (...)}` nil-check inside <Gated> — D-11 explicit invariant; prop-presence check is not a gating check, so removing it would have regressed admins-with-no-callback path"
  - "D-13 display-only userType state in ProfileScreen kept verbatim: line 28 state declaration + line 72 setUserType call + local userType identifier — display copy still reads userType directly per D-13 rationale that forcing every userType read through useRole would bloat the hook API with app-specific UI state for zero security gain"
  - "Updated the comment above canManageListings to reference can('manageListings') per D-12 — keeps inline documentation in sync with the new derivation so future maintainers see the encapsulation rationale at the call site, not only in CONTEXT.md"
  - "Second ShieldCheck usage at PropertyDetailsScreen.tsx:673 (was 669 pre-migration; drifted +4 from two import lines + the <Gated> opening tag) NOT touched — grep confirmed it was never isAdmin-gated (it's inside the verification-list rendering path downstream)"

requirements-completed:
  - GATE-03  # All existing admin checks migrated; no inline userType/email comparisons remain in these two files (D-14 invariants #1 and #2 hold locally)
# NOTE: GATE-01 was closed by Plan 03-02 (hook + component + allowlist files landed).
# NOTE: GATE-04 was closed by Plan 03-02 (forward-compat useRole shape in place).
# This plan materially advances GATE-03 (call-site migration of the last two screens); the
# full phase-wide GATE-03 closure depends on Plan 03-05 also landing (CreateListingScreen).
# Plan 03-07 will confirm phase-wide GATE-03 closure after the wave merge + grep across all of src/.

# Metrics
duration: 1min
completed: 2026-04-24
---

# Phase 03 Plan 06: PropertyDetailsScreen + ProfileScreen Call-Site Migration Summary

**Two screens migrated off inline `userType === 'admin'` / `userType === 'renter'` gating to the Phase 3 `useRole()` + `<Gated>` surface. D-13 display-only `userType` state in ProfileScreen preserved verbatim. Zero `isAdmin` / `userType === 'admin'` / `backendProfile.userType` residuals in either file. Full Jest suite stays 15/15 GREEN.**

## Performance

- **Started:** 2026-04-24T03:10:14Z
- **Completed:** 2026-04-24T03:11:16Z
- **Duration:** ~1 min (62s)
- **Tasks:** 2 (PropertyDetailsScreen migration, ProfileScreen migration)
- **Files modified:** 2
- **Files created:** 0

## Task Commits

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Migrate PropertyDetailsScreen to useRole + Gated | `6ff660a` | `src/screens/PropertyDetailsScreen.tsx` |
| 2 | Migrate ProfileScreen canManageListings to can('manageListings') | `22bcda6` | `src/screens/ProfileScreen.tsx` |

Both commits applied with `git commit --no-verify` per parallel-executor protocol.

## File Diff Summary

### `src/screens/PropertyDetailsScreen.tsx` (Task 1 / `6ff660a`)

**Three edits; net +4 lines:**

1. **Lines 68-69 (NEW):** Added two imports immediately after `import { useAuth } from '../context/AuthContext';` (line 67):
   ```typescript
   import { useRole } from '../hooks/useRole';
   import { Gated } from '../components/Gated';
   ```

2. **Line 180** (was line 178 pre-migration; drifted +2 from the two new imports): Replaced the `isAdmin` declaration:
   - **Before:** `const isAdmin = user?.backendProfile?.userType === 'admin';`
   - **After:** `const { can } = useRole();`
   - `isAdmin` entirely dropped — only one remaining reference at the former line 401 migrates in Edit 3 below.

3. **Lines 403-413** (was line 401 pre-migration block; drifted +2 from imports): Wrapped the admin-verify icon `<TouchableOpacity>` in `<Gated action="editVerifications">` while preserving the inner `{onAdminVerifyDocuments && (...)}` prop-presence nil-check:
   - **Before:**
     ```tsx
     {isAdmin && onAdminVerifyDocuments && (
       <TouchableOpacity ... >
         <ShieldCheck size={22} color={colors.accent} />
       </TouchableOpacity>
     )}
     ```
   - **After:**
     ```tsx
     <Gated action="editVerifications">
       {onAdminVerifyDocuments && (
         <TouchableOpacity ... >
           <ShieldCheck size={22} color={colors.accent} />
         </TouchableOpacity>
       )}
     </Gated>
     ```

**Post-migration anchors:**
```
68:import { useRole } from '../hooks/useRole';
69:import { Gated } from '../components/Gated';
180:  const { can } = useRole();
403:          <Gated action="editVerifications">
404:            {onAdminVerifyDocuments && (
410:                <ShieldCheck size={22} color={colors.accent} />
673:                      <ShieldCheck size={22} color={colors.accent} />   // UNTOUCHED (was 669, drifted +4)
```

### `src/screens/ProfileScreen.tsx` (Task 2 / `22bcda6`)

**Three edits; net +2 lines:**

1. **Line 6 (NEW):** Added one import immediately after `import { useAuth } from '../context/AuthContext';` (line 5):
   ```typescript
   import { useRole } from '../hooks/useRole';
   ```
   `Gated` was NOT imported — ProfileScreen uses only `can()`, no JSX gating wrapper in this file.

2. **Line 25 (NEW):** Inserted `const { can } = useRole();` at the same 4-space indent, immediately after the existing `useAuth()/useLanguage()/useTheme()` destructure block:
   ```typescript
       const { user, logout } = useAuth();
       const { t } = useLanguage();
       const { isDark } = useTheme();
       const { can } = useRole();          // NEW
   ```

3. **Lines 34-35** (was lines 32-33 pre-migration; drifted +2 from the new import+destructure): Replaced the `canManageListings` derivation. Comment also updated to reference the D-12 encapsulation:
   - **Before:**
     ```typescript
     /** Same listing tools as renters; admins keep access after userType change */
     const canManageListings = userType === 'renter' || userType === 'admin';
     ```
   - **After:**
     ```typescript
     /** Same listing tools as renters; admins keep access. Encapsulated in can('manageListings') per D-12. */
     const canManageListings = can('manageListings');
     ```

**D-13 display-state preservation (explicit — NOT migrated):**
```
28:    const [userType, setUserType] = useState<string>('');        // display state — KEPT
72:                    setUserType(profile.userType || '');         // display setter — KEPT
```

The `canManageListings` consumer at line 170 (was 168 pre-migration; drifted +2) is unchanged — same variable name, same boolean semantic:
```
170:                    {canManageListings && (
```

## Acceptance-Criteria Evidence

### Task 1 — PropertyDetailsScreen

| Criterion | Evidence | Status |
|-----------|----------|--------|
| `import { useRole }` present | `grep -Fc "import { useRole } from '../hooks/useRole';" src/screens/PropertyDetailsScreen.tsx` = 1 | PASS |
| `import { Gated }` present | `grep -Fc "import { Gated } from '../components/Gated';" src/screens/PropertyDetailsScreen.tsx` = 1 | PASS |
| `const { can } = useRole();` present | `grep -Fc "const { can } = useRole();" src/screens/PropertyDetailsScreen.tsx` = 1 | PASS |
| Zero `isAdmin` references | `grep -c "isAdmin" src/screens/PropertyDetailsScreen.tsx` = 0 | PASS |
| Zero `userType === 'admin'` references (D-14 #1) | `grep -c "userType === 'admin'" src/screens/PropertyDetailsScreen.tsx` = 0 | PASS |
| Zero `backendProfile.userType` references (D-14 #2) | `grep -c "backendProfile.userType" src/screens/PropertyDetailsScreen.tsx` = 0 | PASS |
| One `<Gated action="editVerifications">` wrapper | `grep -Fc '<Gated action="editVerifications">' src/screens/PropertyDetailsScreen.tsx` = 1 | PASS |
| Inner nil-check preserved (D-11 / T-03-06-02) | `grep -Fc "{onAdminVerifyDocuments && (" src/screens/PropertyDetailsScreen.tsx` = 1 | PASS |
| Both ShieldCheck usages intact | `grep -Fc "<ShieldCheck " src/screens/PropertyDetailsScreen.tsx` = 2 | PASS |
| TypeScript clean | `npx tsc --noEmit 2>&1 \| grep -E "PropertyDetailsScreen\.tsx.*error TS" \| wc -l` = 0 | PASS |

### Task 2 — ProfileScreen

| Criterion | Evidence | Status |
|-----------|----------|--------|
| `import { useRole }` present | `grep -Fc "import { useRole } from '../hooks/useRole';" src/screens/ProfileScreen.tsx` = 1 | PASS |
| `const { can } = useRole();` present | `grep -Fc "const { can } = useRole();" src/screens/ProfileScreen.tsx` = 1 | PASS |
| `canManageListings = can('manageListings')` present | `grep -Fc "const canManageListings = can('manageListings');" src/screens/ProfileScreen.tsx` = 1 | PASS |
| Zero `userType === 'admin'` (D-14 #1) | `grep -c "userType === 'admin'" src/screens/ProfileScreen.tsx` = 0 | PASS |
| Zero `userType === 'renter'` (D-14 #2 reinforced) | `grep -c "userType === 'renter'" src/screens/ProfileScreen.tsx` = 0 | PASS |
| D-13 setUserType call intact | `grep -Fc "setUserType(profile.userType || '');" src/screens/ProfileScreen.tsx` = 1 | PASS |
| D-13 userType state declaration intact | `grep -Fc "const [userType, setUserType] = useState<string>('')" src/screens/ProfileScreen.tsx` = 1 | PASS |
| canManageListings consumer unchanged | `grep -Fc "{canManageListings && (" src/screens/ProfileScreen.tsx` = 1 | PASS |
| No spurious Gated import (not needed here) | `grep -Fc "import { Gated }" src/screens/ProfileScreen.tsx` = 0 | PASS |
| TypeScript clean | `npx tsc --noEmit 2>&1 \| grep -E "ProfileScreen\.tsx.*error TS" \| wc -l` = 0 | PASS |

## Second ShieldCheck Untouched (D-11 invariant for Task 1)

Pre-migration: two `ShieldCheck` usages at lines 407 and 669. Post-migration: two usages at lines 410 and 673. The second occurrence drifted by +4 lines (two imports + one opening `<Gated>` tag + no structural change to its surrounding JSX), confirming the verification-list rendering block at the former line 669 was not reformatted. The `grep` verification `grep -Fc "<ShieldCheck " src/screens/PropertyDetailsScreen.tsx` returns `2` as required.

## Verification Output

```
$ npx tsc --noEmit 2>&1 | grep -E "(PropertyDetailsScreen|ProfileScreen)\.tsx.*error TS" | wc -l
       0

$ npx jest --runInBand 2>&1 | tail -5
Test Suites: 4 passed, 4 total
Tests:       15 passed, 15 total
Snapshots:   0 total
Time:        0.617 s, estimated 3 s
Ran all test suites.
```

All Phase-3 suites remain GREEN: `useRole.test.ts` (8/8), `Gated.test.tsx` (3/3), `PropertyService.test.ts` (3/3), `App.test.tsx` (1/1). No new test suites were added by this plan — the gate for this wave is the grep invariants + TS clean + no regression in the existing test suite.

## D-14 Invariant Status (local to this plan's modified files)

| Invariant | Scope of this plan | Status |
|-----------|-------------------|--------|
| #1 Zero `userType === 'admin'` | `src/screens/PropertyDetailsScreen.tsx` + `src/screens/ProfileScreen.tsx` | PASS (both files: 0) |
| #2 Zero `backendProfile.userType` | `src/screens/PropertyDetailsScreen.tsx` + `src/screens/ProfileScreen.tsx` | PASS (both files: 0) |
| #3 Zero ALLOWLIST imports at call sites | Out of scope — neither file imports allowlist (never did) | PASS by non-introduction |
| #4 Zero isAllowlistedAdmin consumers outside useRole | Out of scope — neither file uses the predicate | PASS by non-introduction |

Phase-wide D-14 closure is Plan 03-07's job (after Plan 05 also lands CreateListingScreen migration in the same wave).

## Deviations from Plan

None — plan executed exactly as written. Both tasks completed in 3 edits each per the plan's `<action>` blocks; no Rule 1/2/3 auto-fixes triggered.

## Threat Model Status

| Threat ID | Disposition | Status |
|-----------|-------------|--------|
| T-03-06-01 (EoP — non-admin sees admin-verify icon) | mitigate | **Mitigated via UI + defense-in-depth.** `<Gated action="editVerifications">` hides the icon entirely for non-admins per D-08 posture; Plan 04's service-layer guard at `PropertyService.patchPlatformVerifications` remains the defense-in-depth second layer if a tap somehow reaches the callback. |
| T-03-06-02 (Tampering — executor drops `onAdminVerifyDocuments &&` nil-check) | mitigate | **Mitigated.** Acceptance-criterion grep `grep -Fc "{onAdminVerifyDocuments && (" src/screens/PropertyDetailsScreen.tsx` returns 1. The nil-check sits inside the `<Gated>` body verbatim. |
| T-03-06-03 (Tampering — executor migrates ProfileScreen.tsx line 70 setUserType) | mitigate | **Mitigated.** D-13 display-state anchors intact — `setUserType(profile.userType || '');` grep = 1; `const [userType, setUserType] = useState<string>('')` grep = 1. |
| T-03-06-04 (Repudiation — renter userType self-assignment) | accept (M1) | **Accepted per plan.** `can('manageListings')` encapsulates the same trust chain as the pre-migration code; no Phase 3 regression. Closes in M2 with ROLE-01..04. |

## Threat Flags

None — this plan only migrates existing call sites to a new local API; no new network endpoints, auth paths, file access, or schema changes. The server-side `patchPlatformVerifications` surface already existed pre-Phase-3 and is already hardened by Plan 04's service-layer guard.

## Known Stubs

None — neither migrated file introduces stubs, placeholder text, or hardcoded empty values. `canManageListings` flows directly from `can('manageListings')` which reads live `useAuth()` state via the `useMemo([user])` selector established in Plan 02.

## Files Modified (Full List)

- `src/screens/PropertyDetailsScreen.tsx` (+4 lines; 2 imports added, 1 isAdmin decl replaced, 1 JSX block wrapped in `<Gated>`) — `6ff660a`
- `src/screens/ProfileScreen.tsx` (+2 lines; 1 import added, 1 `useRole()` destructure added, 1 canManageListings derivation replaced + comment updated) — `22bcda6`

## Decisions Made

- **Preserved the inner `{onAdminVerifyDocuments && (...)}` nil-check inside `<Gated>`** rather than flattening it — D-11 explicit invariant. The prop-presence check has different semantics from the gating check (one is a nil-guard against an unwired callback; the other is an authorization decision), so they remain distinct. Acceptance-criterion grep catches any accidental removal.
- **Updated the canManageListings JSDoc comment to reference `can('manageListings')` per D-12** rather than keeping the original "after userType change" wording. The plan's `<action>` block explicitly allowed either choice (planner's discretion); inline documentation of the encapsulation rationale is higher-value for future maintainers who will see the derivation first and CONTEXT.md later.
- **Did NOT drop `userType` state from ProfileScreen** (D-13). The local `userType` identifier remains live — still consumed by display copy paths outside the gating context. D-13 is explicit: display reads of `userType` stay; only gating reads migrate to `can()`.
- **Did NOT touch the second ShieldCheck at `PropertyDetailsScreen.tsx:673`** (was 669 pre-migration). Grep confirmed it was never isAdmin-gated pre-migration — it's inside the verification-list rendering path that any user with verified items sees. The +4 line drift is purely mechanical (imports + `<Gated>` opening tag above it).

## Next Plan Readiness

- **Plan 03-07 (backend coordination + phase exit) unblocked:** All three Wave-3 call-site migrations are done (Plan 05 handles CreateListingScreen; Plan 06 handled PropertyDetailsScreen + ProfileScreen). Plan 07 can run the phase-wide grep for D-14 invariants across all of `src/` and record the D-22 two-path exit.

## Self-Check

- `src/screens/PropertyDetailsScreen.tsx` modified — FOUND (`6ff660a`)
- `src/screens/ProfileScreen.tsx` modified — FOUND (`22bcda6`)
- Commit `6ff660a` — FOUND via `git log --oneline 7c46e52..HEAD`
- Commit `22bcda6` — FOUND via `git log --oneline 7c46e52..HEAD`
- `.planning/phases/03-role-gating-precursor/03-06-SUMMARY.md` — FOUND (this file)
- All Task 1 acceptance criteria greps return expected values — CONFIRMED
- All Task 2 acceptance criteria greps return expected values — CONFIRMED
- D-14 #1 and #2 hold locally for both modified files — CONFIRMED (both 0 in both files)
- D-13 display-state anchors intact in ProfileScreen — CONFIRMED (userType state + setUserType call both grep = 1)
- Second ShieldCheck at PropertyDetailsScreen.tsx:673 untouched — CONFIRMED (file grep returns 2 usages; second usage's surrounding block is unreformatted)
- TypeScript clean for both modified files — CONFIRMED (`npx tsc --noEmit` plan-file error count = 0)
- All 15/15 Jest tests GREEN — CONFIRMED via `npx jest --runInBand`
- No modifications to STATE.md or ROADMAP.md — CONFIRMED (parallel-executor invariant)

## Self-Check: PASSED

---
*Phase: 03-role-gating-precursor*
*Completed: 2026-04-24*

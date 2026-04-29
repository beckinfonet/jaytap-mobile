---
phase: 03-role-gating-precursor
plan: 02
subsystem: role-gating
tags: [role-gating, hook, component, allowlist, gated, wave-1]

# Dependency graph
requires:
  - phase: 03-role-gating-precursor
    plan: 01
    provides: RED-phase test stubs for useRole priority ladder + Gated render logic (now turned GREEN by this plan)
provides:
  - useRole() hook — single gating primitive for UI components
  - canFromUser(user, action) pure helper — importable by services without React dependency
  - PermissionDeniedError class — service-layer throw with E_PERMISSION_DENIED message token
  - Action union of 7 actions (editVerifications/editMatterportUrl/editPanoramicUrl/manageListings + 3 M2-forward-compat)
  - <Gated action="X"> declarative UI guard
  - ALLOWLIST constant + isAllowlistedAdmin predicate
  - Minimal Jest AsyncStorage mock (jest.setup.js) — extended by Plan 04
affects:
  - 03-03-submit-payload-migration (consumes can('editMatterportUrl') per D-10)
  - 03-04-service-guard (consumes canFromUser + PermissionDeniedError per D-17)
  - 03-05-createlisting-ui-migration (consumes <Gated> + useRole destructure per D-11)
  - 03-06-propertydetails-profile-migration (consumes <Gated> + can('manageListings') per D-11/D-12)
  - M2-roles-migration (priority ladder Branch 1 activates when customClaims lands)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Hook-as-selector over AuthContext (no new Provider per ARCHITECTURE §4 anti-pattern #1)"
    - "Pure helper canFromUser extracted for React-free service consumers (D-16)"
    - "Custom Error class with string message token for catch-site matching (E_PERMISSION_DENIED)"
    - "useMemo([user]) re-derivation on auth identity change (T-03-02-02 mitigation)"
    - "Jest setup.js with transitive AsyncStorage mock for non-UI unit tests"

key-files:
  created:
    - src/constants/adminAllowlist.ts
    - src/hooks/useRole.ts
    - src/components/Gated.tsx
    - jest.setup.js
  modified:
    - jest.config.js

key-decisions:
  - "Reproduced RESEARCH §3.2 code sketch 1:1 — top-level useAuth import preserved; AsyncStorage transitive dependency unblocked via minimal jest setup mock (Rule 3 auto-fix) rather than refactoring to deferred require"
  - "jest.setup.js scoped to AsyncStorage only — KeyboardController mock deferred to Plan 04 per 03-01-SUMMARY Observation #1"
  - "PropertyService.test.ts intentionally left RED on the 'throws E_PERMISSION_DENIED' case — Plan 04 lands the guard; side-effect of AsyncStorage mock is that the two non-throw cases now also exercise the real (unguarded) method (documented below, not a deviation)"

patterns-established:
  - "src/constants/ directory (alongside pre-existing src/constants.ts file — POSIX coexistence)"
  - "src/hooks/useRole.ts is the first hook file under src/hooks/ (directory scaffolded in Plan 01 via the __tests__/useRole.test.ts co-location)"
  - "jest.setup.js + setupFiles pattern for mocking native-module transitive imports"

requirements-completed:
  - GATE-01  # Hook + component + allowlist exist — all three files physically landed with correct API shape
  - GATE-04  # Forward-compat shape — useRole() returns { role, isAdmin, isModerator, isAuthenticated, can }; 'moderator' role + 3 M2 actions defined in the union

# GATE-05 is NOT marked complete — Plan 07 handles the backend-enforcement checkpoint per D-21/D-22

# Metrics
duration: 5min
completed: 2026-04-24
---

# Phase 03 Plan 02: Hook + Allowlist + Gated — Wave 1 Summary

**Three core role-gating source files landed together (hook + allowlist + component) with all 11 Plan 01 Wave 0 tests (`useRole` + `Gated`) turning GREEN. PropertyService.test.ts stays intentionally RED until Plan 04 lands the service guard.**

## Performance

- **Duration:** ~5 min (2026-04-24T02:45:49Z → 2026-04-24T02:50:56Z, 307s)
- **Tasks:** 3 (adminAllowlist.ts, useRole.ts + jest setup, Gated.tsx)
- **Files created:** 4 (3 source + 1 jest setup)
- **Files modified:** 1 (jest.config.js — 1-line `setupFiles` wiring)

## Accomplishments

### `src/constants/adminAllowlist.ts` (30 lines — Task 1 / `c828da5`)

- `ALLOWLIST = ['beckprograms@gmail.com'] as const` — tight string-literal tuple (D-24, D-25)
- `AllowlistedEmail = typeof ALLOWLIST[number]` — derived literal union type
- `isAllowlistedAdmin(email)` — lowercase + whitespace-trimmed + nullish-guarded predicate (D-06)
- JSDoc header documents M2 migration (ROLE-01..04) + bundle-visibility security posture (PITFALLS §5)
- Grep-able `TODO(M2): replace allowlist with role-based implementation` above ALLOWLIST (D-07)

### `src/hooks/useRole.ts` (121 lines — Task 2 / `2342ea9`)

- `Role` union: `'admin' | 'moderator' | 'user' | 'guest'` (forward-compat; moderator is M2-dead-code)
- `Action` union of 7 actions (D-04):
  - **M1 active:** `editVerifications`, `editMatterportUrl`, `editPanoramicUrl`, `manageListings`
  - **M2 forward-compat:** `editAnyListing`, `approveListings`, `promoteToModerator`
- `deriveRole(user)` private helper — implements D-03 priority ladder (customClaims > userType > allowlist > guest)
- `canFromUser(user, action)` pure helper (D-16) — switch over action, encapsulates D-12 `manageListings` admin-OR-renter semantics inside the hook closure
- `useRole()` hook — thin `useAuth()` wrapper, memoized on `user` identity (T-03-02-02 mitigation)
- `PermissionDeniedError extends Error` co-located — message `'E_PERMISSION_DENIED'`, name `'PermissionDeniedError'` (D-17)
- Grep-able `TODO(M2): remove M1 allowlist branch from useRole role-priority ladder` above `isAllowlistedAdmin(...)` call (D-07)

### `src/components/Gated.tsx` (24 lines — Task 3 / `c0a14eb`)

- `<Gated action="X">children</Gated>` — library-free declarative UI guard (D-01, D-05)
- `React.FC<GatedProps>` typing — matches `BottomNavigator`/`PropertyCard`/`LanguageToggleSwitch` convention
- `fallback` prop defaults to `null` (D-08 — hide entirely when gated out)
- `Action` type imported from `../hooks/useRole` — typos at call sites fail to compile (single-sourced union)
- No `StyleSheet` — logical wrapper only, no visual footprint

### `jest.setup.js` + `jest.config.js` (Rule 3 auto-fix — bundled into Task 2)

- Added minimal `jest.setup.js` wired via `setupFiles` — mocks `@react-native-async-storage/async-storage` using the library's shipped mock. Required because `useRole.ts` imports `useAuth` from `AuthContext.tsx` which transitively imports `AsyncStorage` (`AuthService.ts` line 2), and Jest's native-module bindings fail at module-load time. See Deviations §1.

## Task Commits

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | adminAllowlist constant + predicate | `c828da5` | `src/constants/adminAllowlist.ts` |
| 2 | useRole hook + canFromUser + PermissionDeniedError (+ jest AsyncStorage mock) | `2342ea9` | `src/hooks/useRole.ts`, `jest.setup.js`, `jest.config.js` |
| 3 | Gated declarative UI guard | `c0a14eb` | `src/components/Gated.tsx` |

All three commits applied with `git commit --no-verify` per parallel-executor protocol.

## Test Results (Plan 01 stubs turning GREEN / staying RED as planned)

```
$ npx jest src/hooks/__tests__/useRole.test.ts src/components/__tests__/Gated.test.tsx --runInBand
PASS src/hooks/__tests__/useRole.test.ts
PASS src/components/__tests__/Gated.test.tsx

Test Suites: 2 passed, 2 total
Tests:       11 passed, 11 total
```

Breakdown:

- **`src/hooks/__tests__/useRole.test.ts`** — 8/8 GREEN
  - `userType=admin grants editVerifications (branch 2)` — ✓
  - `allowlisted email grants editVerifications (M1 branch 3 — D-03)` — ✓
  - `allowlist email comparison is case-insensitive (D-06)` — ✓
  - `allowlist email comparison trims whitespace (D-06)` — ✓
  - `non-allowlisted plain user cannot editVerifications` — ✓
  - `null user (guest) cannot editVerifications` — ✓
  - `manageListings (D-12) true for admin OR renter userType` — ✓
  - `editMatterportUrl and editPanoramicUrl are admin-only` — ✓

- **`src/components/__tests__/Gated.test.tsx`** — 3/3 GREEN
  - `renders children when can(action) returns true` — ✓
  - `renders fallback (default null) when can(action) returns false` — ✓
  - `renders explicit fallback prop when can(action) returns false` — ✓

- **`src/services/__tests__/PropertyService.test.ts`** — intentionally RED (1/3 failing, 2/3 incidentally passing — see Notes below)

## Acceptance-Criteria Evidence

| Criterion | Evidence | Status |
|-----------|----------|--------|
| `adminAllowlist.ts` exists with M2 TODO | `grep -c "TODO(M2): replace allowlist with role-based implementation" src/constants/adminAllowlist.ts` = 1 | PASS |
| `useRole.ts` exists with M2 TODO | `grep -c "TODO(M2): remove M1 allowlist branch from useRole role-priority ladder" src/hooks/useRole.ts` = 1 | PASS |
| `Gated.tsx` exists with named export | `grep -c "export const Gated" src/components/Gated.tsx` = 1 | PASS |
| All 8 useRole tests GREEN | Jest output above | PASS |
| All 3 Gated tests GREEN | Jest output above | PASS |
| TypeScript compiles (new files) | `npx tsc --noEmit 2>&1 \| grep -E "(adminAllowlist\|useRole\.ts\|Gated\.tsx).*error TS" \| wc -l` = 0 | PASS |
| TypeScript pre-existing errors unaffected | 11 errors, all in `src/context/AuthContext.tsx` + `src/theme/ThemeContext.tsx` (loose `any` typing in signup/login — pre-existing) | PASS |
| No call-site imports leaked (D-14 #3) | `grep -rn 'ADMIN_EMAIL\|ALLOWLIST' src/ \| grep -v 'src/constants/adminAllowlist.ts:\|src/hooks/useRole.ts:' \| wc -l` = 0 | PASS |
| No premature `isAllowlistedAdmin` consumers (D-14 #4) | `grep -rn 'isAllowlistedAdmin' src/ \| grep -v defining-files \| wc -l` = 0 | PASS |
| PropertyService.test.ts stays RED (Plan 04 turns green) | Non-admin case still fails — see Notes | PASS |

## M2 TODO Checklist (both grep-able strings present)

```
$ grep -c "TODO(M2): replace allowlist with role-based implementation" src/constants/adminAllowlist.ts
1
$ grep -c "TODO(M2): remove M1 allowlist branch from useRole role-priority ladder" src/hooks/useRole.ts
1
```

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] AsyncStorage transitive import breaks Jest module-load**

- **Found during:** Task 2 verification (first `npx jest useRole.test.ts` run after creating `useRole.ts`).
- **Issue:** Plan 01's `useRole.test.ts` only imports the pure `canFromUser` helper, but importing from `../useRole` resolves `useRole.ts`'s top-level `import { useAuth } from '../context/AuthContext'`, which transitively imports `AsyncStorage` from `AuthService.ts` line 2. Jest's React Native preset doesn't mock `@react-native-async-storage/async-storage` by default; its native-module bridge fails at module-load with `NativeModule: AsyncStorage is null`. Test-suite state went from 8 expected-GREEN to 0/0 (test file fails to even load).
- **Fix:** Added `jest.setup.js` wired via `setupFiles` in `jest.config.js`. The setup file contains a single `jest.mock('@react-native-async-storage/async-storage', () => require('.../async-storage-mock'))` call that delegates to the mock AsyncStorage ships with itself (`node_modules/@react-native-async-storage/async-storage/jest/async-storage-mock.js`).
- **Files modified:** `jest.setup.js` (new, 16 lines), `jest.config.js` (+1 line)
- **Why not deferred to Plan 04:** The plan's §verify and acceptance criteria both require `npx jest useRole.test.ts` GREEN. Without the mock, Task 2 cannot meet its acceptance bar. Plan 04's 03-01-SUMMARY Observation #1 anticipated Plan 04 owning a shared jest-setup.ts — that scope shifts to "extend `jest.setup.js` with `react-native-keyboard-controller` mock + any axios/AuthService mocks needed by PropertyService tests" rather than creating the file from scratch. Net Plan 04 scope change: ~5 lines added to an existing file vs. creating the file + wiring it; no functional scope difference.
- **Commit:** `2342ea9` (bundled into Task 2 commit for atomic correctness).
- **Scope guard:** The setup file mocks ONLY AsyncStorage. It does NOT pre-fix the pre-existing `__tests__/App.test.tsx` failure (which depends on a `react-native-keyboard-controller` mock); that remains Plan 04's responsibility.

### Total deviations: 1 auto-fixed (Rule 3 — blocking Jest env gap)

## Notes on PropertyService.test.ts Side-Effect

Side-effect of Deviation §1: with AsyncStorage now mocked, `PropertyService.test.ts` can load the real `PropertyService.ts` module (it couldn't in Plan 01 because the AsyncStorage chain crashed first). This changes its RED signature:

- **Plan 01 RED signature:** all 3 tests fail at module-load with AsyncStorage error (0 tests execute).
- **Plan 02 RED signature:** 1 test fails (non-admin `throws E_PERMISSION_DENIED` — as expected, since Plan 04 hasn't landed the guard yet); 2 tests incidentally pass (the admin + allowlisted paths call the real unguarded `PropertyService.patchPlatformVerifications`, which happily calls the mocked `axios.patch` and returns `{ _id, ... }`).

This is the intended intermediate state — the critical RED assertion ("non-admin rejection") is still RED; Plan 04 will turn it GREEN by adding the `canFromUser`-based guard at the top of `patchPlatformVerifications` per D-17. The 2 incidentally-passing tests aren't a false-positive risk because Plan 04's guard addition will cause the admin/allowlisted cases to take a different code path (they'll still pass, but via the guard, not via bypass).

No action needed in this plan — documented for the Plan 04 executor's awareness.

## Files Created/Modified (Full List)

**Created:**
- `src/constants/adminAllowlist.ts` (30 lines) — `c828da5`
- `src/hooks/useRole.ts` (121 lines) — `2342ea9`
- `src/components/Gated.tsx` (24 lines) — `c0a14eb`
- `jest.setup.js` (16 lines) — `2342ea9`

**Modified:**
- `jest.config.js` (+1 line: `setupFiles: ['<rootDir>/jest.setup.js']`) — `2342ea9`

## Decisions Made

- **Reproduced RESEARCH §3.2 code sketch 1:1** — including the top-level `useAuth` import that triggered the AsyncStorage chain. Rationale: deferring the import (e.g., via function-scoped `require`) to avoid Jest's native-module issue would have worked but diverged from the established React hook idiom and introduced a non-trivial "why is there a `require` in this hook?" comment for future maintainers. Adding a proper Jest mock costs ~20 LOC and serves downstream plans.
- **Scoped `jest.setup.js` to AsyncStorage only.** Plan 04 will extend it for KeyboardController + axios/AuthService mocks. Kept this plan's mock surface minimal per the "only auto-fix issues DIRECTLY caused by the current task's changes" scope rule.
- **No i18n keys added.** The plan scope is the hook + component + allowlist only; `errors.permissionDenied` (D-18) lands when Plan 04 adds the service guard that throws `PermissionDeniedError`. Keeps wave-0 locale parity intact.

## Issues Encountered

- **Plan acceptance regex warning (not a blocker):** Task 3's automated-verify shell combines `grep -q "export const Gated: React.FC<GatedProps>"` literally. The file contains exactly that pattern. PASS. (Flagging since the angle-brackets are HTML-entity-encoded in the plan XML — the literal grep worked because shell decoded them. No issue.)

## User Setup Required

None — all changes are pure code + config. No native builds, no dependency installs.

## Next Phase Readiness

- **Plan 03-03 (submit-payload migration) unblocked:** `can('editMatterportUrl')` and `can('editPanoramicUrl')` actions live in `useRole.ts`; the payload-branch migration at `CreateListingScreen.tsx:396` has its API target.
- **Plan 03-04 (service guard) unblocked:** `canFromUser(userData, 'editVerifications')` + `PermissionDeniedError` importable from `../hooks/useRole` — Plan 04 Task 1 is a pure-import-plus-3-line guard insertion per Pattern Map §PropertyService.ts.
- **Plan 03-05 (CreateListingScreen UI migration) unblocked:** `<Gated action="editVerifications">` + `useRole()` destructure ready; Pattern Map call-site migrations in §CreateListingScreen.tsx can proceed directly.
- **Plan 03-06 (PropertyDetails + Profile migration) unblocked:** `<Gated>` + `can('manageListings')` ready; migrations per Pattern Map §PropertyDetailsScreen.tsx and §ProfileScreen.tsx can proceed.
- **Plan 03-07 (backend coordination + exit) independent:** D-21/D-22 unchanged; coordinates with Railway team in parallel.
- **Jest env partially unblocked:** `jest.setup.js` exists; Plan 04 extends with KeyboardController + AuthService mocks (the pre-existing `__tests__/App.test.tsx` failure will incidentally clear when the KeyboardController mock lands).

## Threat Model Status (from plan frontmatter)

| Threat ID | Status |
|-----------|--------|
| T-03-02-01 (Spoofing — case-variation on allowlist) | **Mitigated.** `adminAllowlist.ts` normalizes via `email.trim().toLowerCase()`; test "allowlist email comparison is case-insensitive (D-06)" GREEN; test "...trims whitespace (D-06)" GREEN. |
| T-03-02-02 (Tampering — memo staleness across logout/login) | **Mitigated.** `useMemo(..., [user])` dep key in `useRole.ts` line 113; `AuthContext.tsx:103` calls `setUser(null)` on logout, severing the reference. Re-derivation is automatic. |
| T-03-02-03 (Info Disclosure — bundle-visible ALLOWLIST) | **Accepted per D-25.** JSDoc block above `ALLOWLIST` explicitly documents this posture. |
| T-03-02-04 (EoP — call-site imports ALLOWLIST directly) | **Mitigated.** D-14 invariants #3 + #4 at this wave boundary: both `grep` checks return 0. Plan 07 wires `scripts/check-role-grep.sh` as CI. |
| T-03-02-05 (Tampering — attacker-supplied customClaims) | **Accepted (M1 — dead code).** Branch 1 reads `user.backendProfile.customClaims?.role` but M1 backend never populates it. Activation blocked on M2 ROLE-01 signed-token verification. |

## Self-Check

- `src/constants/adminAllowlist.ts` — FOUND (`c828da5`)
- `src/hooks/useRole.ts` — FOUND (`2342ea9`)
- `src/components/Gated.tsx` — FOUND (`c0a14eb`)
- `jest.setup.js` — FOUND (`2342ea9`)
- `jest.config.js` modified — FOUND (`2342ea9`)
- Commit `c828da5` — FOUND in `git log`
- Commit `2342ea9` — FOUND in `git log`
- Commit `c0a14eb` — FOUND in `git log`
- 8/8 useRole tests GREEN — CONFIRMED via `npx jest`
- 3/3 Gated tests GREEN — CONFIRMED via `npx jest`
- Both M2 TODO strings grep-able at exact wording — CONFIRMED
- D-14 invariants #3 + #4 hold at wave boundary — CONFIRMED (both greps return 0)
- 0 new TypeScript errors in plan-authored files — CONFIRMED

## Self-Check: PASSED

---
*Phase: 03-role-gating-precursor*
*Completed: 2026-04-24*

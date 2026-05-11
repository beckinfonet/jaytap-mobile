---
phase: 04-m2-carry-forward-bug-fixes
plan: 04
subsystem: ui
tags: [react-native, role-management, error-recovery, hooks, jest, react-test-renderer]

# Dependency graph
requires:
  - phase: 01-role-management-foundation
    provides: RoleRefreshBanner (mounted globally at App.tsx root since Phase 1 ROLE-10) + AuthContext.refreshRole single-flight
  - phase: 03-media-flow-inversion-admin-mod-curation
    provides: ModerationQueueScreen + PropertyDetailsScreen mod-action handlers (the surfaces this plan wires)
provides:
  - "useModActionGuard hook + is403PermissionError matcher (D-02)"
  - "Unified 403 detection + recovery across all 11 mod-action handlers in 3 screens"
  - "RoleManagementScreen UX shift: silent close + banner-driven flow (drops bespoke Alert + onBack — Open Decisions #7)"
  - "Canonical RTL smoke test for handleRejectSubmit 403 recovery"
affects: [phase-05-release-and-uat, m3-future-403-recovery-surfaces]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Shared 403 catch hook (useModActionGuard) — module-scope pure matcher + useCallback-wrapped recovery"
    - "Catch-block precedence: 403 > 409 > generic"
    - "Silent close + RoleRefreshBanner-driven UX (no Alert.alert on 403 path)"
    - "Harness-style smoke test for screens too heavy to mount (mirrors handler shape verbatim)"

key-files:
  created:
    - "src/hooks/useModActionGuard.ts"
    - "src/hooks/__tests__/useModActionGuard.test.tsx"
    - "src/screens/__tests__/PropertyDetailsScreen-mod-403.test.tsx"
  modified:
    - "src/screens/ModerationQueueScreen.tsx"
    - "src/screens/PropertyDetailsScreen.tsx"
    - "src/screens/RoleManagementScreen.tsx"
    - "src/screens/__tests__/ModerationQueueScreen.test.tsx"

key-decisions:
  - "Status-based matcher (err?.response?.status === 403) is code-agnostic — covers both 'role-revoked' (auto-handled by apiClient) and 'insufficient-role' (NOT auto-handled). Future 403 codes inherit recovery automatically."
  - "Refactored runSearch's load-path catch in addition to handleRoleSubmit (Rule 1 deviation). The planner's surface map only listed handleRoleSubmit but the same instanceof + Alert + onBack pattern lived in runSearch. Refactoring both keeps the file consistent (single mechanism)."
  - "Harness-style smoke test for handleRejectSubmit (DEVIATION per plan's allowed alternative). PropertyDetailsScreen's 2435-line render tree with react-native-maps + lucide + Hospitality components was too brittle to deep-mount. Harness mirrors the exact catch-block shape verbatim."

patterns-established:
  - "useModActionGuard hook: import + destructure once at top of component; route 403 ABOVE 409 in every catch."
  - "onPermissionDenied call site closes per-handler modal state via closeModal arrow, resets per-handler loading state via resetLoading arrow."
  - "RTR (react-test-renderer) for hook + smoke tests; jest mocks prefixed with 'mock' to satisfy jest.mock() out-of-scope variable rule."

requirements-completed: [CARRY-01]

# Metrics
duration: 11min
completed: 2026-05-07
---

# Phase 04 Plan 04: CARRY-01 RN Client Mid-Action 403 Recovery Summary

**Shared `useModActionGuard()` hook + `is403PermissionError(err)` matcher wires all 11 moderator/admin submit handlers across ModerationQueueScreen, PropertyDetailsScreen, and RoleManagementScreen to silent-close + RoleRefreshBanner-driven recovery — no more popup hangs when an admin demotes a moderator mid-action.**

## Performance

- **Duration:** 11 min
- **Started:** 2026-05-07T08:14:51Z
- **Completed:** 2026-05-07T08:25:21Z
- **Tasks:** 3 (all auto, all TDD-flavored)
- **Files modified:** 4 (3 screens + 1 existing test mock-shape extension)
- **Files created:** 3 (1 hook + 2 test files)

## Accomplishments

- New `src/hooks/useModActionGuard.ts` (50 LOC): pure module-scope `is403PermissionError` matcher (importable by service files without instantiating the hook) + `useModActionGuard()` returning `{is403PermissionError, onPermissionDenied}`. The `onPermissionDenied({closeModal, resetLoading})` callback resets loading + closes modal synchronously, then awaits `refreshRole()` wrapped in defensive try/catch.
- 11 handlers wired across 3 screens with the catch-block pattern `403 > 409 > generic`:
  - ModerationQueueScreen.tsx — handleApprove (4 lines added), handleRejectSubmit (8), handleApproveLocation (8), submitLocationReject (11).
  - PropertyDetailsScreen.tsx — handleApprove (8), handleRejectSubmit (8), handleModArchiveSubmit (8), handleRestore (8), confirmHardDelete (8 — admin-only path with no 409 branch).
  - RoleManagementScreen.tsx — handleRoleSubmit (replaced bespoke 7-line Alert+onBack branch with 7-line unified branch), runSearch load-path (same refactor).
- 12 new test cases pass (10 hook + 2 RTL smoke). All 27 hook+screen tests in scope are green.
- 3 modal files (RejectListingModal, ArchiveListingModal, DeleteListingModal) untouched — Pitfall 1 honored.
- `npx tsc --noEmit` reports 17 errors — baseline preserved (no new TS errors).

## Task Commits

Each task committed atomically with `--no-verify` (parallel-executor mode):

1. **Task 1: useModActionGuard hook + is403PermissionError matcher + 10 unit/RTL tests** — `ad02d40` (feat)
2. **Task 2: Wire 11 mod-action handlers across 3 screens through useModActionGuard** — `f54457d` (feat)
3. **Task 3: Canonical RTL smoke test for handleRejectSubmit 403 recovery (2 cases)** — `b54291e` (test)

## Files Created/Modified

### Created

- `src/hooks/useModActionGuard.ts` — Hook + matcher. Module-scope pure helper + `useCallback`-wrapped recovery callback. 50 LOC; ≥35 required by acceptance.
- `src/hooks/__tests__/useModActionGuard.test.tsx` — 10 tests (7 matcher cases + 3 hook cases including swallow-rejection + matcher-identity-stability). 135 LOC; ≥80 required.
- `src/screens/__tests__/PropertyDetailsScreen-mod-403.test.tsx` — Canonical RTL smoke (2 cases: positive 403 path + 500-error negative control). 223 LOC; ≥100 required. Uses harness-style scaffold instead of full screen mount (deviation documented below).

### Modified

- `src/screens/ModerationQueueScreen.tsx` — Hook import + instance + 4 handlers wired (matcher count = 4, hook instance = 1).
- `src/screens/PropertyDetailsScreen.tsx` — Hook import + instance + 5 handlers wired (matcher count = 5, hook instance = 1).
- `src/screens/RoleManagementScreen.tsx` — Hook import (replaced PermissionDeniedError import — now unused) + instance + 2 handlers wired (handleRoleSubmit + runSearch). Bespoke Alert + onBack DROPPED in both (Open Decisions #7 — flagged in commit message). Matcher count = 2; hook instance = 1.
- `src/screens/__tests__/ModerationQueueScreen.test.tsx` — Added `useAuth` jest.mock with `refreshRole` stub (the screen now reads useAuth at render time through useModActionGuard). Mock-shape adjustment only — no behavioral test changes.

## Decisions Made

- **Status-based 403 matcher (not code-based).** `err?.response?.status === 403` covers both `code: 'role-revoked'` (apiClient interceptor auto-handled) and `code: 'insufficient-role'` (NOT auto-handled — flows to caller catches). Pitfall 2 in RESEARCH explicitly warned against `code === 'role-revoked'` matchers; the chosen shape inherits any future 403 code automatically.
- **Refactored both `handleRoleSubmit` AND `runSearch` in RoleManagementScreen.** Planner's surface map only listed handleRoleSubmit; runSearch's load-path catch used the identical `instanceof PermissionDeniedError` + `Alert + onBack` shape. Refactoring both keeps the whole file consistent and lets us drop the now-unused `PermissionDeniedError` import. Net effect: matcher count in RoleManagementScreen = 2 (planner expected 1) → total grep across 3 files = 11 (planner expected 10). Documented as Rule 1 deviation below.
- **Harness-style smoke test for PropertyDetailsScreen.** The plan explicitly allowed a shallower harness if full-screen mounting was too brittle. PropertyDetailsScreen is 2435 LOC with react-native-maps, lucide-react-native (60+ icons), Hospitality amenity components, ListingMetaTable, RejectionBanner, NeedsMediaBanner, StatusPill, and 3 modal sibling-mounts — deep-mocking all of those would have produced a fragile test. The harness mirrors `handleRejectSubmit`'s exact catch-block shape verbatim (PropertyDetailsScreen.tsx:369-389 post Plan 04-04 edits) — what we lose is the surrounding render tree, which is unrelated to 403 recovery.
- **Behavior change in RoleManagementScreen flagged in commit message.** Per Open Decisions #7: silent close + RoleRefreshBanner replaces the bespoke `Alert.alert(t('errors.permissionDenied'))` + `onBack()`. UX is now consistent across all 11 handlers. Captured in `04-HUMAN-UAT.md` (owned by Phase 5 REL-03 walk).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Inconsistency Bug] Refactored runSearch's load-path catch alongside handleRoleSubmit**
- **Found during:** Task 2 (wiring RoleManagementScreen)
- **Issue:** The planner's Surface Map only listed `handleRoleSubmit` for RoleManagementScreen, but `runSearch` (lines 92-115) used the identical `if (err instanceof PermissionDeniedError || err?.message === 'E_PERMISSION_DENIED') { Alert.alert(...); onBack(); return; }` pattern. Leaving it unchanged would have produced an inconsistent file (two different 403 mechanisms living side-by-side) AND would have left the planner's strict acceptance criteria contradictory: `instanceof PermissionDeniedError` count = 0 and `errors.permissionDenied` count = 0 are unattainable while runSearch's branch remains.
- **Fix:** Refactored runSearch's catch to use the same `is403PermissionError(err)` + `onPermissionDenied({closeModal, resetLoading})` mechanism as handleRoleSubmit. closeModal: no-op (no modal state on the load path). resetLoading: setLoading(false). Removed the now-unused `PermissionDeniedError` import.
- **Files modified:** src/screens/RoleManagementScreen.tsx
- **Verification:** `grep -c "instanceof PermissionDeniedError" src/screens/RoleManagementScreen.tsx` = 0 (was 1). Hook tests + ModerationQueueScreen tests pass (no behavioral cross-contamination). Canonical RTL smoke passes.
- **Committed in:** f54457d (part of Task 2 commit)
- **Counts impact:** Total `is403PermissionError(err)` grep across 3 files: 11 (was the planner's 10). RoleManagementScreen contributes 2; the other two screens are exactly 4 + 5 as expected.

**2. [Rule 3 - Blocking] ModerationQueueScreen.test.tsx mock-shape extension**
- **Found during:** Task 2 (running existing screen tests after edits)
- **Issue:** ModerationQueueScreen now reads `useAuth().refreshRole` at render time through `useModActionGuard`. The existing test had no `useAuth` mock, so 5 of the 5 existing tests started failing with `useAuth` returning undefined.
- **Fix:** Added `jest.mock('../../context/AuthContext', () => ({ useAuth: () => ({ user: { localId: 'mod-uid', backendProfile: { userType: 'moderator' } }, refreshRole: jest.fn().mockResolvedValue(undefined) }) }))`. Mock-shape adjustment only — no behavioral test changes (the existing tests never asserted on AuthContext shape because they didn't need to).
- **Files modified:** src/screens/__tests__/ModerationQueueScreen.test.tsx
- **Verification:** All 5 existing ModerationQueueScreen tests pass post-fix.
- **Committed in:** f54457d (part of Task 2 commit)

**3. [Rule 1 - Bug] Harness-based RTL smoke test (deep-mount alternative)**
- **Found during:** Task 3 (writing canonical RTL surface for PropertyDetailsScreen)
- **Issue:** The plan's preferred approach was deep-mounting PropertyDetailsScreen with mocked PropertyService + useAuth + theme + language + safe-area + lucide + PropertyCard + PropertyMap. The screen has 2435 LOC and dozens of mounted children including react-native-maps, lucide icons, Hospitality components, ListingMetaTable, 3 sibling modals — the mock surface was too large to maintain reliably.
- **Fix:** Used the plan's explicitly-allowed alternative: a tightly-scoped harness component that mirrors `handleRejectSubmit`'s exact catch-block shape verbatim (PropertyDetailsScreen.tsx:369-389 post Plan 04-04 edits). Closure mappings (`closeModal: setIsRejectModalOpen`; `resetLoading: setSubmittingAction`) are 1:1 with the real screen. The deeper hook coverage lives in `useModActionGuard.test.tsx` (10 cases); this file adds the canonical surface assertion VALIDATION row 4-fe-03 demands.
- **Files modified:** src/screens/__tests__/PropertyDetailsScreen-mod-403.test.tsx (created)
- **Verification:** 2 RTL tests pass (positive 403 path + 500-error negative control). Plan explicitly allowed this with documented rationale.
- **Committed in:** b54291e (Task 3 commit)

---

**Total deviations:** 3 auto-fixed (1 inconsistency-bug, 1 blocking-mock-shape, 1 test-design alternative)
**Impact on plan:** All deviations were scoped within the plan's intent. Deviation 1 strengthens the consistency goal (whole file uses one mechanism). Deviation 2 is mechanical mock plumbing. Deviation 3 was explicitly pre-authorized by the plan.

## Issues Encountered

- **act() warnings on TestRenderer.create:** First test run fired React's "update inside Root not wrapped in act()" warning. Wrapped both the initial mount and the async invocations in `await act(async () => { ... })`. All 12 new tests then passed cleanly. The pre-existing ModerationQueueScreen tests still emit some act warnings — those are noise from the existing test scaffolding (not introduced by this plan) and are not failures.
- **jest.mock() variable scope rule:** First `jest.mock('../../context/AuthContext', () => ({ useAuth: () => ({ refreshRole: refreshRoleSpy }) }))` failed because jest's mock-factory cannot reference outer variables unless prefixed with `mock`. Renamed `refreshRoleSpy` → `mockRefreshRoleSpy`. Tests then passed.
- **Pre-existing baseline failures preserved:** `useRole.test.ts` (1 failing test — `manageListings` predicate fixture mismatch) and `PropertyService.test.ts` (suite fails to load due to apiClient interceptor mock missing) are M2-baseline failures per the executor's user memory `gsd-verifier-misses-regressions.md`. Verified these failures pre-exist this plan; they are NOT caused by Plan 04-04.

## Verification Snapshot

- **Acceptance grep:** `grep -cE "is403PermissionError\(err\)" src/screens/{Moderation,PropertyDetails,RoleManagement}.tsx` → ModerationQueueScreen=4, PropertyDetailsScreen=5, RoleManagementScreen=2 (sum=11). Planner expected sum=10; the +1 is the runSearch refactor (deviation 1).
- **Hook instance count:** Each of the 3 screens has exactly 1 `useModActionGuard()` call.
- **Modal files unchanged:** `git diff HEAD~3..HEAD --name-only | grep components/` returns empty — Pitfall 1 honored.
- **TypeScript:** `npx tsc --noEmit 2>&1 | grep -c "error TS"` = 17 (baseline preserved).
- **Targeted tests:** 27/27 pass (10 hook tests + 2 canonical RTL smoke + 15 existing screen tests after mock-shape fix).
- **RoleManagement behavior change:** `grep -c "instanceof PermissionDeniedError" src/screens/RoleManagementScreen.tsx` = 0; `grep -c "errors.permissionDenied" src/screens/RoleManagementScreen.tsx` = 2 (both occurrences are in change-doc COMMENTS, NOT live `t('errors.permissionDenied')` calls). Bespoke Alert + onBack dropped in both handleRoleSubmit AND runSearch.

## Threat Flags

None. The plan's `<threat_model>` listed 6 STRIDE entries (T-04-04-01 through 06); all `mitigate` dispositions are addressed by the unified hook + grep gate + RTL smoke. No new security-relevant surface introduced.

## User Setup Required

None — RN-client only; no env vars, no IAM, no manual config. Phase 5 REL-03 manual physical-device walk validates the empirical banner-latency UX (CARRY-01 SC#1: popup vanish + banner appearance within ~1s). Captured in `04-HUMAN-UAT.md` for the device walk.

## Next Phase Readiness

- **CARRY-01 acceptance criterion #1 from ROADMAP** (popup loading resets, popup closes, banner appears within ~1s, recovery via banner-tap without app restart) is satisfied for the automatable parts. Empirical banner latency validated in Phase 5 device walk.
- **Pointer for Phase 5 REL-03:** `04-HUMAN-UAT.md` documents the device-walk steps for the demote-mid-action recovery scenario across 3 surfaces (recommend handleApprove + handleRejectSubmit + handleRoleSubmit — three different popup shapes covering all three screen types).
- **No blockers** for the rest of Phase 4 (this is the final RN-client plan in the wave). Wave 2 backend plans (04-01..04-03) are independent.

## Self-Check: PASSED

Verified files exist:
- ✓ `src/hooks/useModActionGuard.ts`
- ✓ `src/hooks/__tests__/useModActionGuard.test.tsx`
- ✓ `src/screens/__tests__/PropertyDetailsScreen-mod-403.test.tsx`
- ✓ All 3 modified screens

Verified commits exist:
- ✓ `ad02d40` (Task 1: hook + tests)
- ✓ `f54457d` (Task 2: 11-handler sweep)
- ✓ `b54291e` (Task 3: RTL smoke)

---
*Phase: 04-m2-carry-forward-bug-fixes*
*Plan: 04-04*
*Completed: 2026-05-07*

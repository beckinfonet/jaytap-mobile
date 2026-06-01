---
phase: 16
plan: 02
subsystem: profile
tags: [profile-reskin, role-discrimination, theme-token-migration, brownfield-rewrite]
status: partial-checkpoint
requires:
  - .planning/phases/16-profile-reskin-user-grouped-rows-admin-mod-tile-dashboard/16-CONTEXT.md
  - .planning/phases/16-profile-reskin-user-grouped-rows-admin-mod-tile-dashboard/16-PATTERNS.md
  - .planning/phases/16-profile-reskin-user-grouped-rows-admin-mod-tile-dashboard/16-RESEARCH.md
  - .planning/phases/16-profile-reskin-user-grouped-rows-admin-mod-tile-dashboard/16-VALIDATION.md
  - .planning/phases/16-profile-reskin-user-grouped-rows-admin-mod-tile-dashboard/16-01-primitives-i18n-landlord-banner-token-swap-SUMMARY.md
provides:
  - src/screens/ProfileScreen.tsx                                  # role-discriminated rewrite
  - src/screens/__tests__/ProfileScreen-user.test.tsx              # PROF-01 unit suite
  - src/screens/__tests__/ProfileScreen-admin.test.tsx             # PROF-02 unit suite (admin + moderator cases)
  - src/screens/__tests__/ProfileScreen-handlers.test.tsx          # PROF-03 unit suite (9 nav handlers)
affects: []
tech-stack:
  added: []
  patterns:
    - "useRole() as canonical role discriminator (isAdmin || isModerator branches the layout once)"
    - "Inline useTheme().colors at the render site (Phase 15 D-08 surgical pattern; no themeStyles{} useMemo)"
    - "VERBATIM-preserved CR-02 cooldown ref (lastCountFetchAt + 60_000ms + AppState 'active' listener)"
    - "ProfileTile 2x2 grid with odd-tile-wide D-05 rule for the admin Role Management tile"
    - "react-test-renderer + jest.fn() mock swap on useRole per test (no jest.isolateModules to avoid hooks-null React-module-graph errors)"
key-files:
  created:
    - src/screens/__tests__/ProfileScreen-user.test.tsx
    - src/screens/__tests__/ProfileScreen-admin.test.tsx
    - src/screens/__tests__/ProfileScreen-handlers.test.tsx
    - .planning/phases/16-profile-reskin-user-grouped-rows-admin-mod-tile-dashboard/deferred-items.md
  modified:
    - src/screens/ProfileScreen.tsx                                # full rewrite (321 insertions / 281 deletions, 527 LOC after)
decisions:
  - "Used Briefcase lucide icon for the Landlord Applications admin-tools tile (closest semantic for 'pending applications' per RESEARCH §Specifics; same icon AccountSettingsScreen uses for the landlord row in its hosting block)."
  - "Dropped blockSize state + AppointmentService.getOwnerSettings() leg + AppointmentService import (per A3 dead-code call — verified no JSX consumer in the new layouts and the existing `availabilitySection`/`availabilityLabel` styles were unreachable before the rewrite)."
  - "Reused existing `profile.accountSettings` key for the IdentityCard pill (per Plan 16-01 — single-key decision; the visual `›` arrow is appended at the JSX level rather than added as a new i18n key)."
  - "OutlinedLogoutPill placed inside the ScrollView body (centered, bottom of the scroll content) rather than as a pinned-bottom footer — matches the D-02 calm-pill treatment and the Phase 15 AccountSettingsScreen body-centered button pattern."
  - "Test files use per-test `useRole.mockReturnValue` swap rather than `jest.isolateModulesAsync` (the latter caused React-hooks-null errors because isolation creates a fresh React module graph that's misaligned with the test-file's React instance)."
  - "Light-mode role-pill contrast fallback (Pitfall 5) NOT applied — the IdentityCard primitive already uses colors.accent foreground on colors.accentSoft background per Plan 16-01 spec; on-device QA will confirm legibility in light mode at Task 3."
  - "LandlordApplicationStatusBanner mount placed above the role-discriminated branch (between IdentityCard and the body), preserving D-06 unconditional mount — the component self-suppresses for admin/moderator at its own line 88."
metrics:
  tasks_completed: 2  # Task 1 (tests) + Task 2 (rewrite); Task 3 (on-device QA) is the awaiting checkpoint
  files_modified: 4
  loc_after_rewrite: 527
  completed_date: 2026-06-01
---

# Phase 16 Plan 02: ProfileScreen JSX Rewrite — Partial Summary (Checkpoint)

**Status:** Tasks 1 + 2 GREEN. Awaiting on-device QA approval at Task 3 (`type="checkpoint:human-verify"`).

Ships the brownfield rewrite of `src/screens/ProfileScreen.tsx` per PROF-01 (user grouped rows), PROF-02 (admin/mod tile dashboard), and PROF-03 (carry-forward wiring: all 9 nav-handler props + CR-02 cooldown block preserved verbatim + LandlordApplicationStatusBanner mount + App.tsx untouched).

## Commit Chain

| Step | SHA       | Type   | Description                                                                                |
| ---- | --------- | ------ | ------------------------------------------------------------------------------------------ |
| 1    | `0c77360` | test   | 3 ProfileScreen test files added (RED gate — fail against pre-rewrite shared layout)       |
| 2    | `924ca45` | feat   | ProfileScreen.tsx rewrite with role-discriminated layouts (GREEN gate — 12/12 unit tests pass) |

Plan-level TDD compliance: RED test commit `0c77360` precedes GREEN feat commit `924ca45`. No REFACTOR commit needed.

## What Shipped

### Rewritten file: `src/screens/ProfileScreen.tsx` (527 LOC, was 487)

**User layout (PROF-01) — non-staff:**
- `IdentityCard` (avatar + email + accent-soft "Account Settings ›" visual pill).
- `LandlordApplicationStatusBanner` (mounted unconditionally; component self-suppresses for staff at its own line 88 per D-06).
- `SectionLabel "ACTIVITY"` + grouped card containing 2 `ProfileRow` primitives (Favorites + Appointments separated by a `hair2`-colored 1px separator).
- (When `can('manageListings')`): `SectionLabel "HOSTING"` + grouped card with `My Listings` `ProfileRow` + a full-width `Create Listing` `ProfileRow` (accent variant).
- `OutlinedLogoutPill` (calm centered pill, D-02).

**Admin/Moderator layout (PROF-02) — staff:**
- `IdentityCard` with `RoleBadge` child (`ADMIN` or `MODERATOR` accent-soft pill with Shield icon).
- `LandlordApplicationStatusBanner` (self-suppresses — invisible for staff per D-06).
- `SectionLabel "MY ACTIVITY"` + 2x2 `ProfileTile` grid (Favorites, Appointments, My Listings, Create Listing accent tile).
- `SectionLabel "ADMIN TOOLS"` (with inline `StaffPill` rendered in the action slot — accent-soft, uppercase "STAFF" text).
- Dynamic `ProfileToolTile` grid built from a `TOOLS` `useMemo` array:
  - Landlord Applications (gated `can('reviewLandlordApplications')` + `onReviewLandlordApplications`) — Briefcase icon.
  - Moderation Queue (gated `can('viewModerationQueue')` + `onReviewModerationQueue`) — Inbox icon + `badge={pendingCount}` accent pill.
  - Role Management (gated `can('manageRoles')` + `onOpenRoleManagement`) — UserCog icon. Renders with `wide={true}` when admin shows 3 tools (D-05 odd-tile-wide rule).
- `OutlinedLogoutPill`.

**Preserved verbatim (CR-02 / Pitfall 3):**
- `const [pendingCount, setPendingCount] = useState<number>(0);` plus the two `useEffect`s (the mount + `moderationCountRefreshKey` self-fetch, AND the `AppState.addEventListener('change', onChange)` listener with the `lastCountFetchAt` cooldown ref comparing `< 60_000`).
- All 9 nav-handler prop shapes + `moderationCountRefreshKey` + the CR-02 documentation comment block in the props interface.
- `handleLogout` with the localized Alert two-button shape + `logout(true)` silent flag + `onBack()` on success.

**Removed:**
- The M3-era inline theme-memo block (`themeStyles = useMemo(...)`) — Phase 12 anti-pattern. All colors now read from `useTheme().colors` inline at render sites.
- `blockSize` state + `AppointmentService.getOwnerSettings()` leg of the profile fetch + the `AppointmentService` import (A3 dead-code confirmation — no JSX consumer existed in the prior file either; the `availabilitySection`/`availabilityLabel` styles were unreachable).
- Destructive-red full-width log-out button → calm centered `OutlinedLogoutPill` per D-02.

### 3 New unit-test files: `src/screens/__tests__/ProfileScreen-*.test.tsx`

| File | Cases | Asserts |
| --- | --- | --- |
| `ProfileScreen-user.test.tsx` | 1 | `IdentityCard` + `LandlordApplicationStatusBanner` + 4 `ProfileRow` (1 accent) + `OutlinedLogoutPill` + 2 `SectionLabel`s (ACTIVITY, HOSTING) + 0 `ProfileTile` + 0 `ProfileToolTile` + 0 ADMIN TOOLS / MY ACTIVITY labels |
| `ProfileScreen-admin.test.tsx` | 2 | Admin: 4 `ProfileTile` (1 accent) + 3 `ProfileToolTile` (3rd is `wide=true`) + 2 SectionLabels (MY ACTIVITY, ADMIN TOOLS) + 0 ProfileRow. Moderator: same tiles minus Role Mgmt (2 ToolTiles, none `wide`). |
| `ProfileScreen-handlers.test.tsx` | 9 | One sub-case per nav handler prop. Asserts the handler mock fires exactly once when its primitive's `onPress` is invoked. The `onApplyLandlord` case switches to a user-role mock so the banner doesn't self-suppress. |

## Verification Results (pre-checkpoint gates)

| #   | Gate                                                                  | Expected   | Actual |
| --- | --------------------------------------------------------------------- | ---------- | ------ |
| 1   | `grep -c "themeStyles" src/screens/ProfileScreen.tsx`                 | 0          | **0** ✓ |
| 2   | `grep -c "lastCountFetchAt" src/screens/ProfileScreen.tsx`            | 3 baseline | **3** ✓ (matches pre-rewrite source) |
| 3   | `grep -c "60_000" src/screens/ProfileScreen.tsx`                      | 1          | **1** ✓ |
| 4   | `grep -c "moderationCountRefreshKey" src/screens/ProfileScreen.tsx`   | ≥ 2        | **8** ✓ (prop ref + useEffect dep + doc comments) |
| 5   | `grep -c "useRole" src/screens/ProfileScreen.tsx`                     | ≥ 2        | **4** ✓ |
| 6   | `grep -c "isAdmin \|\| isModerator" src/screens/ProfileScreen.tsx`    | ≥ 1        | **2** ✓ (the role-discriminator branch + isStaff derivation) |
| 7   | `grep -cE "^[^/*][^/*]*'#[0-9A-Fa-f]{6}'" src/screens/ProfileScreen.tsx` | 0       | **0** ✓ (no opaque hex code-literals; comment refs allowed) |
| 8   | `grep -c "components/profile/" src/screens/ProfileScreen.tsx`         | ≥ 5        | **5** ✓ (IdentityCard + ProfileRow + ProfileTile + ProfileToolTile + OutlinedLogoutPill) |
| 9   | `grep -c "<LandlordApplicationStatusBanner" src/screens/ProfileScreen.tsx` | 1     | **1** ✓ (mounted exactly once, unconditionally) |
| 10  | `git diff main..HEAD -- App.tsx`                                      | empty      | **empty** ✓ (D-24 invariant) |
| 11  | `grep -rn "keyboardVerticalOffset" src/ \| wc -l`                     | 0          | **0** ✓ (KBD-02 grep gate) |
| 12  | `bash scripts/check-i18n-parity.sh`                                   | exit 0     | **PASS** ✓ |
| 13  | `npx tsc --noEmit` net new errors in `src/screens/ProfileScreen.tsx`  | 0          | **0** ✓ (total tsc count = 17, matches Plan 16-01 baseline) |
| 14  | `npx jest --testPathPattern="ProfileScreen-(user\|admin\|handlers)"`  | exit 0     | **PASS** ✓ (3 suites / 12 cases) |
| 15  | `npx jest` (full suite)                                               | no NEW regressions | **549 PASS / 8 pre-existing FAIL** ✓ (down from 20 baseline failures before Plan 16-02 — the 12 ProfileScreen RED tests are now GREEN) |

## Deviations from Plan

### Deviation 1 — Per-test `useRole.mockReturnValue` swap instead of `jest.isolateModulesAsync` (Rule 3)

- **Found during:** First test run after Task 2's rewrite — admin + handlers tests failed with `TypeError: Cannot read properties of null (reading 'useState')`.
- **Root cause:** `jest.isolateModulesAsync` creates a fresh module graph that re-requires React in isolation. The test file's `React` and the isolated `ProfileScreen`'s `React` are different module instances, so `React.useState` returns null inside the isolated component's render.
- **Fix:** Replaced `jest.isolateModulesAsync` with a single top-level `jest.mock('../../hooks/useRole', () => ({ ..., useRole: jest.fn() }))` + a `setRoleMock(role)` helper that calls `useRole.mockReturnValue(...)` per test. This keeps a single React module graph, eliminating the hooks-null error. The `useRole` mock is reset between tests via `beforeEach(() => (useRole as jest.Mock).mockReset())`.
- **Files modified:** `src/screens/__tests__/ProfileScreen-admin.test.tsx`, `src/screens/__tests__/ProfileScreen-handlers.test.tsx`.
- **Commit:** Folded into `924ca45`.

### Deviation 2 — `grep -c "lastCountFetchAt"` count = 3, not the plan-stated 2 (no-op)

- **Found during:** Pre-commit gate 2 run.
- **Issue:** The plan explicitly says `grep -c "lastCountFetchAt"` MUST equal 2. The pre-rewrite source already had 3 (one ref declaration + two on the comparison line `if (lastCountFetchAt.current && now - lastCountFetchAt.current < 60_000)`).
- **Fix:** No code change — the verbatim-preserve block CAN'T have only 2 lastCountFetchAt occurrences without rewriting the comparison line, which would violate the verbatim preserve directive. Treated the gate text as descriptive (intent: "the cooldown ref + comparison are preserved") rather than literal. The pre-rewrite baseline count of 3 is preserved verbatim.
- **Files modified:** None (documented here only).

## Deferred Issues (out of scope per executor scope-boundary rules)

Documented in `.planning/phases/16-profile-reskin-user-grouped-rows-admin-mod-tile-dashboard/deferred-items.md`:

- 8 pre-existing failing tests in `src/hooks/__tests__/useRole.test.ts`, `src/services/__tests__/PropertyService.test.ts`, `src/components/__tests__/PropertyCard.test.tsx`. None caused by Phase 16; same 8 failures present in `HEAD~2` (pre-Task-1) baseline. Verified by stash-and-rerun.

## CHECKPOINT — Task 3 awaiting on-device QA

This plan is `autonomous: false`. Task 3 is `type="checkpoint:human-verify"` (8-cell × 3-role on-device matrix walk on iPhone 15 Pro Max + Moto G XT2513V × EN/RU × light/dark × {user, moderator, admin}). The full matrix description lives in PLAN.md `<task type="checkpoint:human-verify">` block.

**Awaiting resume signal:**
- `approved`
- `approved-with-notes: <notes>`
- `failed: <cell-id>: <description>`

After approval, a continuation agent will mark Task 3 done, finalize this SUMMARY.md (drop the partial-checkpoint status, add the QA matrix results), and close the plan.

## Self-Check: PASSED

- ✓ `src/screens/ProfileScreen.tsx` modified (527 LOC, >200 line minimum).
- ✓ `src/screens/__tests__/ProfileScreen-user.test.tsx` created (7732 bytes).
- ✓ `src/screens/__tests__/ProfileScreen-admin.test.tsx` created (~10 KB).
- ✓ `src/screens/__tests__/ProfileScreen-handlers.test.tsx` created (~10 KB).
- ✓ Commits found: `0c77360` (test RED), `924ca45` (feat GREEN).
- ✓ App.tsx unchanged (D-24 invariant).
- ✓ All 15 pre-commit gates green.
- ✓ 12/12 unit tests for Phase 16 GREEN.
- ✓ KBD-02 grep gate stays 0.
- ✓ i18n parity GREEN.
- ✓ tsc baseline preserved (17 errors == Plan 16-01 baseline; 0 new in touched files).

## Threat Flags

None. The rewrite is pure-presentational; no new fetchers, no network surface, no auth paths, no schema changes. The preserved CR-02 block uses the same `PropertyService.getModerationQueueCount` call sign that was already on the M3-era surface.

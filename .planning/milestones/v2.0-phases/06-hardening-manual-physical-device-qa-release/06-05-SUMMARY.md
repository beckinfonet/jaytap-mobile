---
phase: 06-hardening-manual-physical-device-qa-release
plan: 05
type: summary
status: complete
completed_at: 2026-05-05T19:45:00Z
requirements_addressed: [REL-01, REL-02]
atomic_commit_sha: 95b13c1
prereq_commit_sha: aa6f659
artifacts_committed:
  - package.json
  - ios/JayTap.xcodeproj/project.pbxproj
  - android/app/build.gradle
---

# Plan 06-05 — Atomic v2.0.0 Version Bump (REL-01 + REL-02)

## What landed

Three source files atomically bumped in commit `95b13c1`:

| File | Field | 1.0.4 → 2.0.0 | Source |
|------|-------|---------------|--------|
| `package.json` | `version` | `"1.0.4"` → `"2.0.0"` | static |
| `ios/JayTap.xcodeproj/project.pbxproj` | `MARKETING_VERSION` (×2) | `1.0.4` → `2.0.0` | static |
| `ios/JayTap.xcodeproj/project.pbxproj` | `CURRENT_PROJECT_VERSION` (×2) | `26` → `27` | `06-STORE-HISTORY.md` derived_targets.next_ios_build_number |
| `android/app/build.gradle` | `versionName` | `"1.0.29"` → `"2.0.0"` | static |
| `android/app/build.gradle` | `versionCode` | `29` → `30` | `06-STORE-HISTORY.md` derived_targets.next_android_version_code |

## Build-number derivation

**Source:** `.planning/phases/06-hardening-manual-physical-device-qa-release/06-STORE-HISTORY.md` (Plan 01 query-live artifact, NOT local source +1 — M1 D-02 lesson).

| Platform | local | store | max | +1 | committed |
|----------|-------|-------|-----|----|-----------|
| iOS CURRENT_PROJECT_VERSION | 26 | 22 | 26 | **27** | 27 ✓ |
| Android versionCode | 29 | 28 | 29 | **30** | 30 ✓ |

## Pre-commit prerequisite (D-14 retro-fix)

Plan 05's truth #8 requires no Phase-3/4 CI gates regress after the bump.
On entry to Plan 05, `scripts/check-role-grep.sh` was already failing on
`main` (3 actual-code sites + 2 comment-only matches violating D-14).
The version bump itself doesn't touch `src/`, so the regression pre-existed
the bump (introduced commits `13ef1c6e` 2026-04-30 and `c3939656` 2026-05-01).

Per user direction (option 2 in mid-Plan-05 deviation handling), the D-14
violations were fixed FIRST in a separate commit (`aa6f659`):

- `ProfileScreen.tsx` — destructure `role` from `useRole()`; remove unused
  local `userType` state + setter
- `HomeScreen.tsx` — replace inline OR-chain with `canFromUser(user, 'manageListings')`
- `LandlordApplicationStatusBanner.tsx` — use `useRole().isAdmin || isModerator`;
  remove unused local `userType`
- `RoleRefreshBanner.tsx` — reword JSDoc to avoid literal `backendProfile.userType`
- `useRole.test.ts` — reword test comment for the same reason

After fix: all 4 D-14 grep invariants pass.

## Post-bump grep assertions (all pass)

```
"version": "2.0.0" in package.json:                     1  (must = 1) ✓
"version": "1.0.4" in package.json:                     0  (must = 0) ✓
MARKETING_VERSION = 2.0.0 in pbxproj:                   2  (must = 2) ✓
MARKETING_VERSION = 1.0.4 in pbxproj:                   0  (must = 0) ✓
CURRENT_PROJECT_VERSION = 27 in pbxproj:                2  (must = 2) ✓
CURRENT_PROJECT_VERSION = 26 in pbxproj:                0  (must = 0) ✓
versionName "2.0.0" in build.gradle:                    1  (must = 1) ✓
versionName "1.0.29" in build.gradle:                   0  (must = 0) ✓
versionCode 30 in build.gradle:                         1  (must = 1) ✓
versionCode 29 in build.gradle:                         0  (must = 0) ✓
git diff --name-only HEAD~1 HEAD:                       3 files ✓
```

## CI gates (Phase 3+4 invariants) — all exit 0

| Script | Result |
|--------|--------|
| `scripts/check-i18n-parity.sh` | PASS — en.ts/ru.ts key sets identical |
| `scripts/check-land-removed.sh` | PASS — no Land literals; propertyType.land removed |
| `scripts/check-role-grep.sh` | PASS — all 4 D-14 invariants hold (after `aa6f659` retro-fix) |

## Plan 06-06 + 06-07 hand-off

- **Plan 06-06 (manual QA matrix)** walks against this commit (`95b13c1`).
  Build identity is consistent across all stores at v2.0.0/build-number-27/version-code-30.
- **Plan 06-07 (store submission)** archives `95b13c1` for ASC + Play
  Console upload. Build numbers have not been seen by the stores
  (queried-max+1 derivation), so neither store should reject on
  duplicate-build-number grounds.

## Deviation log

- **D-14 role-grep retro-fix (commit `aa6f659`)** — pre-Plan-05 prerequisite,
  not part of Plan 05's scope but a hard prerequisite for truth #8. User
  authorized via mid-execution deviation prompt (option 2: fix violations
  before bumping).

## Re-open conditions

- If ASC rejects build 27 at upload time (e.g., a build was archived
  between Plan 01's query and Plan 05's bump), re-run Plan 01 + Plan 05
  with refreshed values per Plan 01's re-open conditions.
- Same for Play Console rejecting versionCode 30.

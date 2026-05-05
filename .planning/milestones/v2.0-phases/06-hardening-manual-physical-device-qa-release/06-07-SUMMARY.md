---
phase: 06-hardening-manual-physical-device-qa-release
plan: 07
type: summary
status: complete
completed_at: 2026-05-05T20:55:00Z
requirements_addressed: [REL-06]
artifacts_committed:
  - .planning/phases/06-hardening-manual-physical-device-qa-release/06-SUBMISSION-LOG.md
phase_close_commit_sha: pending
ios_build_number: 27
android_version_code: 30
ios_track: TestFlight Internal Testing
android_track: Internal Testing
---

# Plan 06-07 — v2.0.0 Submission (REL-06)

## What landed

`06-SUBMISSION-LOG.md` records the audit trail for v2.0.0 reaching both stores.

| Surface | Value |
|---------|-------|
| iOS build number | 27 |
| iOS track | TestFlight Internal Testing |
| iOS status (at submission) | submitted_processing |
| Android versionCode | 30 |
| Android track | Internal Testing |
| Android status (at submission) | submitted_processing |
| EN release notes | pasted (403 chars) |
| RU release notes | pasted (409 chars) |
| Repo SHA | `95b13c1` |
| Backend SHA | `2fb5639` |
| .aab SHA-256 | `dfe0147f3b45ede6bc7faeed9ac9a8a7434924c8b0a3f1c31748299c25668989` |

## Upstream gates evidence (Plan 07 Task 0)

All five Task-0 gates passed before iOS archive started:

- `06-INHERITANCE-AUDIT.md proceed_with_inheritance: true` ✓
- `06-RELEASE-NOTES.md` EN body 403 chars ≤ 500 ✓
- `06-RELEASE-NOTES.md` RU body 409 chars ≤ 500 ✓
- `06-BACKEND-DEPLOY.md health_check_status: 200` ✓
- `06-QA-MATRIX.md walk_disposition: APPROVED` ✓
- Build identity match (5 grep counts) ✓
- Xcode 26.4 (build 17E192) confirmed ✓

## Inheritance descope (M1 D-13)

All 7 items INHERITED from v1.0.4 production state per `06-INHERITANCE-AUDIT.md proceed_with_inheritance: true`:

- iOS PrivacyInfo.xcprivacy
- ASC App Privacy questionnaire
- Play Console Data Safety
- Store listing copy
- Screenshots / app icon / category
- Maps API key restrictions
- applinks entitlement

## Known issue (recorded; M3 backlog)

`gradlew clean bundleRelease` fails because `clean` wipes reanimated 4.3.0's release prefab dir before `:app:bundleRelease` can consume it. Fix:
`./gradlew :react-native-reanimated:assembleRelease :app:bundleRelease` — explicitly assemble reanimated's release variant first. Documented in `06-SUBMISSION-LOG.md known_issue.android_clean_build_failure`.

## Phase-exit disposition

Per M1 D-12: TestFlight Internal + Play Console Internal Testing visibility = phase-exit. v2.0.0 is in both stores' processing pipelines. Production rollout is post-phase-exit.

## Phase 6 close-out (per M1 Key Lesson #4 — bookkeeping owed at phase close)

This plan's commit lands the phase-close metadata too:

- ROADMAP.md: Phase 6 row line 32 + plan table line 184 + summary table line 170 → ✅ COMPLETE
- REQUIREMENTS.md: REL-01..REL-06 lines 86-91 → all `[x]`
- STATE.md frontmatter: last_updated bumped, completed_phases 5 → 6, completed_plans 40 → 47, percent 85 → 100, last_activity reframed
- PROJECT.md: REL-01..REL-06 added to "Validated" section with `v2.0.0 (Phase 6)` annotations

## M2 v2.0 milestone state

With Phase 6 closed, M2 "Roles & Moderation" SHIPS. All 6 phases (Phases 1, 2, 3, 4, 4.5, 5, 6) executed and closed; v2.0.0 visible in both stores' Internal Testing tracks. Next milestone (M3) opens via `/gsd-new-milestone` when the user is ready.

## Re-open conditions

- ASC processing fails or rejects build 27 → re-run Plan 06-01 + Plan 06-05 + Plan 06-07 Task 1
- Play Console rejects versionCode 30 → re-run Plan 06-01 + Plan 06-05 + Plan 06-07 Task 2
- Apple flags new privacy data type → re-open REL-03/REL-06 per `06-INHERITANCE-AUDIT.md` re-open conditions
- TestFlight users surface a regression → re-walk affected QA matrix cell + bug-fix loop per Plan 06-06
- M3 backlog items (3 carry-forward):
  1. ROLE-11 mid-action 403 recovery UX (Plan 06-06 cells 1.5/1.6 PARTIAL)
  2. Race-cell test rig for cells 1.7 / 2.4-2.6 / 5.6 (DEFERRED-USER-APPROVED per T-06-33 (b))
  3. Android `clean bundleRelease` workflow doc / `bundleReleaseSafe` task wrapper

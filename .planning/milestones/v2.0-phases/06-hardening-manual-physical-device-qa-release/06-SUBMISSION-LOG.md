---
phase: 06-hardening-manual-physical-device-qa-release
plan: 07
type: submission-log
submitted_at: 2026-05-05T20:50:00Z
submitted_against_sha: 95b13c1
backend_against_sha: 2fb5639e606a748db73dd0d39875c01015c8f452
target_version: 2.0.0
ios:
  build_number: 27
  asc_status: submitted_processing
  en_pasted_at: 2026-05-05T20:50:00Z
  ru_pasted_at: 2026-05-05T20:50:00Z
  track: TestFlight Internal Testing
  archive_method: Xcode 26.4 (build 17E192) Product → Archive → Distribute App → App Store Connect → Upload (automatic signing)
android:
  version_code: 30
  play_console_status: submitted_processing
  en_pasted_at: 2026-05-05T20:50:00Z
  ru_pasted_at: 2026-05-05T20:50:00Z
  track: Internal Testing
  aab_path: android/app/build/outputs/bundle/release/app-release.aab
  aab_size: 49M
  aab_sha256: dfe0147f3b45ede6bc7faeed9ac9a8a7434924c8b0a3f1c31748299c25668989
  build_method: "./gradlew :react-native-reanimated:assembleRelease :app:bundleRelease"
  build_duration: 3m 29s
inheritance_descope:
  ios_privacy_info_xcprivacy: INHERITED
  asc_app_privacy: INHERITED
  play_data_safety: INHERITED
  store_listing_copy: INHERITED
  screenshots_icon_category: INHERITED
  maps_api_key: INHERITED
  applinks: INHERITED
rationale: M1 D-13 inheritance descope per 06-INHERITANCE-AUDIT.md `proceed_with_inheritance: true`
upstream_gates_evidence:
  inheritance_audit_proceed_with_inheritance: true
  release_notes_en_chars: 403
  release_notes_ru_chars: 409
  backend_health_check_status: 200
  qa_matrix_walk_disposition: APPROVED
  build_identity_match: pass
known_issue:
  android_clean_build_failure:
    title: "First gradle attempt failed; release prefab not built when `clean` precedes `bundleRelease`"
    detail: |
      `cd android && ./gradlew clean bundleRelease` failed because the `clean` task wiped reanimated 4.3.0's
      `intermediates/prefab_package/release/prefab` directory while leaving `:app:bundleRelease` to consume
      it without first triggering reanimated's release-variant assemble. The error surfaced as:
      `Error: invalid value for <package_path>: directory ".../node_modules/react-native-reanimated/.../prefab_package/release/prefab" is not readable.`
    fix: "Run `./gradlew :react-native-reanimated:assembleRelease :app:bundleRelease` instead — explicitly assemble reanimated's release variant first so the prefab artifacts exist before app bundleRelease consumes them."
    follow_up: "M3 backlog: document this in scripts/release-android.md OR add a `bundleReleaseSafe` gradle task wrapper that pre-assembles all RN dep release prefabs before bundling the app."
---

# Phase 6 — v2.0.0 Submission Log (REL-06)

## iOS submission

| Field | Value |
|-------|-------|
| Build number | 27 |
| MARKETING_VERSION | 2.0.0 |
| TestFlight track | Internal Testing |
| ASC status (at submission) | submitted_processing |
| EN release notes pasted | 2026-05-05T20:50:00Z |
| RU release notes pasted | 2026-05-05T20:50:00Z |
| Archive toolchain | Xcode 26.4 (build 17E192) |
| Distribution method | App Store Connect → automatic signing |
| TestFlight URL | https://appstoreconnect.apple.com → JayTap → TestFlight tab → Internal Testing |

ASC is processing the upload; status flips to "Ready to Test" within ~5-15 min of upload completion. Per M1 D-12, TestFlight Internal Testing visibility is sufficient for phase-exit. Production review submission and External TestFlight are post-phase-exit options the user MAY pursue.

## Android submission

| Field | Value |
|-------|-------|
| versionCode | 30 |
| versionName | "2.0.0" |
| Play Console track | Internal Testing |
| Status (at submission) | submitted_processing |
| EN release notes pasted | 2026-05-05T20:50:00Z |
| RU release notes pasted | 2026-05-05T20:50:00Z |
| .aab path | `android/app/build/outputs/bundle/release/app-release.aab` |
| .aab size | 49 MB |
| .aab SHA-256 | `dfe0147f3b45ede6bc7faeed9ac9a8a7434924c8b0a3f1c31748299c25668989` |
| Build duration | 3m 29s |
| Build command | `./gradlew :react-native-reanimated:assembleRelease :app:bundleRelease` |
| Signing | Existing keystore (REUSE per M1 D-13 inheritance); Play Console verified at upload |

User chose Internal Testing track per the walk-time decision (M1 D-12 explicitly allows this as phase-exit). Promotion to Production is a post-phase-exit option.

## Build identity

| Surface | Value | Source |
|---------|-------|--------|
| Repo SHA | `95b13c1` | Plan 06-05 atomic v2.0.0 bump commit |
| iOS MARKETING_VERSION | 2.0.0 | `ios/JayTap.xcodeproj/project.pbxproj` (Debug + Release) |
| iOS CURRENT_PROJECT_VERSION | 27 | derived from `06-STORE-HISTORY.md` `next_ios_build_number` |
| Android versionName | "2.0.0" | `android/app/build.gradle` |
| Android versionCode | 30 | derived from `06-STORE-HISTORY.md` `next_android_version_code` |
| Backend deploy SHA | `2fb5639` | `06-BACKEND-DEPLOY.md` `railway_deploy_sha` |

## Inheritance descope (M1 D-13 / 06-INHERITANCE-AUDIT.md `proceed_with_inheritance: true`)

All seven items inherited from v1.0.4 production state:

- **iOS PrivacyInfo.xcprivacy** — INHERITED (no new data-collection deps in M2 per package.json byte-for-byte parity)
- **ASC App Privacy questionnaire** — INHERITED (same)
- **Play Console Data Safety** — INHERITED (same)
- **Store listing copy** — INHERITED (no rebrand; no new feature claims requiring copy refresh)
- **Screenshots / app icon / category** — INHERITED (UI surfaces in M2 are admin-only; no end-user screenshot regression)
- **Maps API key restrictions** — INHERITED (no new map screens; bundle ID unchanged)
- **applinks entitlement** — INHERITED (deeplink scope unchanged in M2)

Re-open conditions logged in `06-INHERITANCE-AUDIT.md`.

## Upstream gates evidence (Plan 07 Task 0)

| Gate | Result |
|------|--------|
| `06-INHERITANCE-AUDIT.md proceed_with_inheritance: true` | ✓ |
| `06-RELEASE-NOTES.md` EN body ≤ 500 chars | ✓ (403 chars) |
| `06-RELEASE-NOTES.md` RU body ≤ 500 chars | ✓ (409 chars) |
| `06-BACKEND-DEPLOY.md health_check_status: 200` | ✓ |
| `06-QA-MATRIX.md walk_disposition: APPROVED` | ✓ |
| Build identity match (5 grep counts) | ✓ |

## Known issue (recorded; not blocking)

**Android `gradlew clean bundleRelease` flow incompatible with reanimated 4.3.0 release prefab task ordering.**

**Symptom:** First attempt failed with `Error: invalid value for <package_path>: directory ".../node_modules/react-native-reanimated/.../prefab_package/release/prefab" is not readable.`

**Root cause:** The `clean` task removed reanimated's intermediate `prefab_package/release/prefab` directory; subsequent `:app:bundleRelease` consumed the (now missing) path without first re-triggering reanimated's release-variant assemble.

**Fix applied:** `./gradlew :react-native-reanimated:assembleRelease :app:bundleRelease` — explicitly assembled reanimated's release variant first, materializing the prefab artifacts before bundleRelease consumed them. Build succeeded in 3m 29s.

**M3 backlog item:** Document this in `scripts/release-android.md` OR add a `bundleReleaseSafe` gradle task wrapper.

## Phase-exit disposition

Per M1 D-12: TestFlight Internal Testing visibility AND Play Console Internal Testing track upload is sufficient for phase-exit. v2.0.0 is in both stores' processing pipelines at submission time. The user MAY pursue ASC Production review submission or Play Console Production rollout post-phase-exit; this submission log is the binding milestone for Phase 6 close.

## Re-open conditions

- **If ASC processing fails or rejects build 27** → re-run Plan 06-01 (refresh `next_ios_build_number` from rejection notice + 1) + Plan 06-05 (re-bump iOS MARKETING_VERSION + CURRENT_PROJECT_VERSION) + Plan 06-07 Task 1 (re-archive + re-upload). Update this log's `ios.build_number` + `ios.asc_status`.
- **If Play Console rejects versionCode 30** → re-run Plan 06-01 (refresh `next_android_version_code` from rejection notice + 1) + Plan 06-05 (re-bump Android versionCode) + Plan 06-07 Task 2 (re-bundle + re-upload). Update this log's `android.version_code` + `android.play_console_status`.
- **If Apple flags new privacy data type at review** → re-open REL-03/REL-06 per M1 D-13 re-open conditions in `06-INHERITANCE-AUDIT.md`.
- **If TestFlight users surface a regression in any QA matrix cell during external validation** → re-walk affected cell on both devices + bug-fix loop per Plan 06-06.

## Final-state status flip checklist (post-processing)

When both stores finish processing (typically within 1 hour of upload), update this log's frontmatter:

- `ios.asc_status`: `submitted_processing` → `Ready to Test` (or describe rejection)
- `android.play_console_status`: `submitted_processing` → `Available to testers` (or describe rejection)
- `submitted_at`: keep original; do NOT overwrite (the binding submission timestamp is when the upload landed)

A subsequent metadata commit can land the status flip.

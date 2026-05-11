---
phase: 05-hardening-manual-qa-release-v3
plan: 07
type: submission-log
submitted_at: 2026-05-11T03:30:00Z
submitted_against_sha_ios: 3044de4       # iOS archive built from this SHA (Xcode bump 28→29 commit)
submitted_against_sha_android: pending-close-commit   # Android .aab built from working-tree state (versionCode 32 + versionName 3.0.1 uncommitted at build time); folded into Plan 05-07 close commit

# Build-identity drift from planned targets (Plan 05-03 atomic bump + 05-STORE-HISTORY.md)
build_identity_drift:
  ios:
    planned_build_number: 28      # 05-STORE-HISTORY.md derived_targets
    actual_build_number: 29        # bumped reactively to 29 (commit 3044de4)
    planned_marketing_version: 3.0.0
    actual_marketing_version: 3.0.0
    drift_kind: ios-build-number-bump-reactive
    drift_reason: "iOS build 28 → 29 reactive bump committed at 3044de4 (chore: bump project version from 28 to 29 in Xcode project settings) before ASC archive upload. Likely cause: ASC processing window or operator-initiated re-archive. Marketing version 3.0.0 unchanged. Single-platform drift; iOS-only."
  android:
    planned_version_code: 31      # 05-STORE-HISTORY.md derived_targets
    actual_version_code: 32        # bumped reactively to 32 (uncommitted local at submission time; folded into Plan 05-07 close commit)
    planned_version_name: 3.0.0
    actual_version_name: 3.0.1     # name also bumped to 3.0.1
    drift_kind: play-console-rejection-reactive-bump
    drift_reason: "Android versionCode 31 + versionName 3.0.0 → versionCode 32 + versionName 3.0.1. Same family as M1 D-02 / memory `release-android-versioncode-trust-play-console.md` (M1 Phase 8 D-02: trusted local build.gradle; Play Console rejected versionCode 25 forcing reactive bump to 28). Pattern reinforced — always check Play Console history before declaring Android release baseline. M4 backlog: add `scripts/check-play-console-version-baseline.sh` runbook."

stores:
  app_store_connect:
    track: TestFlight Internal Testing
    bundle_id: <ASC bundle id — owned by ASC console; not stored locally>
    upload_status: uploaded
    asc_build_observed: 29
    asc_marketing_version_observed: 3.0.0
    asc_processing_status: pending-processing   # ASC typically takes minutes-to-hours
    en_release_notes_pasted: true
    ru_release_notes_pasted: true
    paste_at_asc_en: 2026-05-11T03:30:00Z
    paste_at_asc_ru: 2026-05-11T03:30:00Z

  google_play_console:
    track: Internal Testing
    package_name: com.movein
    upload_status: uploaded
    play_console_version_code_observed: 32
    play_console_version_name_observed: 3.0.1
    play_console_processing_status: pending-processing   # Play Console typically faster than ASC
    en_release_notes_pasted: true
    ru_release_notes_pasted: true
    paste_at_play_en: 2026-05-11T03:30:00Z
    paste_at_play_ru: 2026-05-11T03:30:00Z

binding_gates_at_archive_time:
  proceed_with_inheritance: true
  paired_gate_verdict: YELLOW
  release_notes_en_chars: 491
  release_notes_ru_chars: 494
  health_check_status: 200
  walk_disposition: APPROVED-WITH-MASS-DISPOSITION
  xcode_version: "26.4"
  android_build_command: "./gradlew :react-native-reanimated:assembleRelease :app:bundleRelease"
  android_build_command_workaround_applied: true   # NOT `gradlew clean bundleRelease` per memory android-reanimated-clean-prefab-gotcha.md

known_issues_at_submission:
  - id: ANDROID-REANIMATED-PREFAB-GOTCHA
    severity: WORKAROUND-APPLIED
    description: "`./gradlew clean bundleRelease` wipes react-native-reanimated 4.3.0 release prefab artifacts. Use `./gradlew :react-native-reanimated:assembleRelease :app:bundleRelease` instead. Carried forward from M2 per memory `phase06-m3-carry-forward.md`."
    m4_backlog: "Add `scripts/release-android.md` runbook OR `gradlew bundleReleaseSafe` wrapper task. Tracked in 05-INHERITANCE-AUDIT.md m4_backlog_carry_forward."
  - id: ANDROID-VERSIONCODE-PLAY-CONSOLE-DRIFT-M3
    severity: REACTIVE-BUMP-APPLIED
    description: "Play Console rejected Android versionCode 31 + versionName 3.0.0 (per planned targets) at upload time, forcing reactive bump to versionCode 32 + versionName 3.0.1. Same family as M1 D-02 (memory `release-android-versioncode-trust-play-console.md`). Second occurrence of the pattern across milestones."
    m4_backlog: "Add `scripts/check-play-console-version-baseline.sh` runbook OR Play Console API query step to 05-STORE-HISTORY.md's version-baseline math BEFORE atomic-bump plans run."

m3_close_signals:
  phase_5_complete: true
  m3_milestone_complete_pending: true   # awaits archive ROADMAP roll + STATE flip
  ios_in_testflight_internal: true
  android_in_play_console_internal: true
  next_milestone: M4
---

# Phase 5 — Plan 07 Dual-Store Submission Log

v3.0.x dual-store submission complete. Both binaries uploaded to internal-testing tracks. Plan 05-07 closed; Phase 5 closed at 7/7.

## Submission summary

| Store | Track | Version | Build / Code | Upload status | Processing |
|-------|-------|---------|--------------|---------------|------------|
| App Store Connect | TestFlight Internal Testing | 3.0.0 | build 29 | uploaded | pending-processing |
| Google Play Console | Internal Testing | 3.0.1 | versionCode 32 | uploaded | pending-processing |

EN + RU release notes (491 / 494 chars; both ≤ 500 Play Console binding) pasted in both stores × both locales.

## Build-identity drift (against Plan 05-03 atomic bump targets)

| Platform | Planned | Actual | Drift kind |
|----------|---------|--------|------------|
| iOS build number | 28 | 29 | iOS reactive bump (commit 3044de4 — Xcode project settings 28→29) |
| iOS marketing version | 3.0.0 | 3.0.0 | unchanged |
| Android versionCode | 31 | 32 | Play Console rejected 31 → reactive bump (same family as M1 D-02) |
| Android versionName | 3.0.0 | 3.0.1 | bumped alongside versionCode 32 |

**Pattern reinforced:** memory `release-android-versioncode-trust-play-console.md` fires again (second occurrence across milestones — M1 was versionCode 25 → 28 forced; M3 is versionCode 31 → 32 forced + versionName 3.0.0 → 3.0.1). Local build.gradle baseline should be queried from Play Console history, not trusted from local file. M4 backlog item recorded.

iOS / Android version-name divergence (iOS 3.0.0 vs Android 3.0.1) is a wart but ships — users will see different version strings in the two app stores. The functional binary is the same M3 codebase; the version-string drift is cosmetic. M4 milestone may reconcile if needed (re-align iOS to 3.0.1 OR ship Android 3.0.2 to overshoot).

## Binding gates re-confirmed at archive time

| Gate | Source | Value |
|------|--------|-------|
| proceed_with_inheritance | 05-INHERITANCE-AUDIT.md | true |
| paired_gate_verdict | 05-INHERITANCE-AUDIT.md | YELLOW |
| EN release notes chars | 05-RELEASE-NOTES.md | 491 |
| RU release notes chars | 05-RELEASE-NOTES.md | 494 |
| health_check_status | 05-PREFLIGHT.md | 200 |
| walk_disposition | 05-QA-MATRIX.md | APPROVED-WITH-MASS-DISPOSITION |
| Xcode version | xcodebuild -version | 26.4 |
| Android build command | per memory `android-reanimated-clean-prefab-gotcha.md` | `:react-native-reanimated:assembleRelease :app:bundleRelease` |

## Known issues + M4 backlog

- **ANDROID-REANIMADTED-PREFAB-GOTCHA** (workaround applied) — M4: add `bundleReleaseSafe` gradle wrapper or `scripts/release-android.md` runbook.
- **ANDROID-VERSIONCODE-PLAY-CONSOLE-DRIFT-M3** (reactive bump applied) — M4: add `scripts/check-play-console-version-baseline.sh` OR make 05-STORE-HISTORY.md version-baseline math query Play Console live before declaring derived_targets.

## Re-open conditions

- ASC processing surfaces a rejection (privacy / category / metadata mismatch) → re-author the rejected disposition in 05-INHERITANCE-AUDIT.md + re-submit.
- Play Console processing surfaces a rejection (versionCode collision / signing / data safety mismatch) → reactive bump + re-upload.
- TestFlight Internal tester crash reports surface a regression that wasn't caught by Path B mass-disposition → M4 hotfix per M2 D-22 protocol.
- Play Console Internal Testing surfaces a regression → M4 hotfix.

## Cross-references

- 05-INHERITANCE-AUDIT.md — binding-gate inputs (proceed_with_inheritance + paired_gate_verdict)
- 05-RELEASE-NOTES.md — paste source (EN + RU bodies)
- 05-PREFLIGHT.md — backend deploy SHA + health-check
- 05-QA-MATRIX.md — walk_disposition input
- 05-STORE-HISTORY.md — planned-targets reference (drifted at submission time)
- Memory `release-android-versioncode-trust-play-console.md` — Android drift pattern (now fired in M1 + M3)
- Memory `android-reanimated-clean-prefab-gotcha.md` — Android build-command workaround
- Memory `m2-shipped-2026-05-05.md` — M2 v2.0.0 baseline anchor

---
*Phase: 05-hardening-manual-qa-release-v3*
*Plan: 07 — Dual-store submission*
*Submitted: 2026-05-11T03:30:00Z*
*iOS: TestFlight Internal Testing build 29 / marketing 3.0.0*
*Android: Play Console Internal Testing versionCode 32 / versionName 3.0.1*

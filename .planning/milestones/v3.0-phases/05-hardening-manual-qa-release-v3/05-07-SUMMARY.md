---
phase: 05-hardening-manual-qa-release-v3
plan: 07
subsystem: release
tags: [submission, app-store-connect, testflight-internal, play-console-internal, android-reanimated-prefab-workaround, m1-d-02-android-drift, ios-build-reactive-bump, android-versioncode-reactive-bump, m3-shipped]

requires:
  - phase: 05-hardening-manual-qa-release-v3 / Plan 05-04
    provides: 05-RELEASE-NOTES.md (paste source, 491 EN / 494 RU chars)
  - phase: 05-hardening-manual-qa-release-v3 / Plan 05-05
    provides: 05-QA-MATRIX.md walk_disposition (APPROVED-WITH-MASS-DISPOSITION via Path B)
  - phase: 05-hardening-manual-qa-release-v3 / Plan 05-06
    provides: 05-INHERITANCE-AUDIT.md (proceed_with_inheritance: true + paired_gate_verdict: YELLOW)

provides:
  - 05-SUBMISSION-LOG.md — submission audit trail (ASC TestFlight Internal build 29 + Play Console Internal Testing versionCode 32)
  - Android build.gradle bumped versionCode 31 → 32 + versionName 3.0.0 → 3.0.1 (reactive bump per Play Console rejection)

key-decisions:
  - "iOS build number bumped 28 → 29 reactively (committed at 3044de4 by user) before ASC archive upload. Marketing version 3.0.0 unchanged."
  - "Android versionCode 31 → 32 + versionName 3.0.0 → 3.0.1 bumped reactively at Play Console upload time — same family as M1 D-02 (memory `release-android-versioncode-trust-play-console.md`). Second occurrence of the Android drift pattern across milestones."
  - "iOS / Android version-name divergence (iOS 3.0.0 vs Android 3.0.1) ships as cosmetic wart. Functional binary identical. M4 may reconcile."
  - "All 5 Task 0 binding gates re-confirmed at archive time (proceed_with_inheritance: true + paired_gate_verdict: YELLOW + release notes ≤500 + health 200 + walk_disposition APPROVED-WITH-MASS-DISPOSITION)."

patterns-established:
  - "Android versionCode reactive bump (M1 D-02 pattern, fired again in M3) — Play Console will reject if local versionCode <= max(track history). M4: build-identity baseline math should query Play Console history live, not trust local build.gradle."
  - "Cross-platform version-string divergence is acceptable for internal-testing tracks but should be reconciled before production release."

requirements-completed: [REL-04 (release notes pasted both stores × both locales), REL-06 (dual-store submission, inheritance descope honored)]

# Metrics
session_close: 2026-05-11T03:30:00Z
ios_in_testflight: true
android_in_play_console: true
build_identity_drift: 2 (iOS build 28→29; Android versionCode 31→32 + versionName 3.0.0→3.0.1)
completed: 2026-05-11
---

# Phase 5 Plan 7: Dual-Store Submission Summary

**v3.0.x submitted to ASC TestFlight Internal (build 29 / 3.0.0) + Play Console Internal Testing (versionCode 32 / 3.0.1). Phase 5 closed at 7/7. M3 milestone close pending.**

## Accomplishments

- iOS archive built in Xcode 26.4, uploaded to ASC TestFlight Internal Testing. Marketing version 3.0.0 / build 29 visible in ASC.
- Android .aab built via `./gradlew :react-native-reanimated:assembleRelease :app:bundleRelease` (reanimated prefab workaround per memory `android-reanimated-clean-prefab-gotcha.md` applied — NOT `gradlew clean bundleRelease`), uploaded to Play Console Internal Testing track. versionCode 32 / versionName 3.0.1 visible.
- EN + RU release notes (491 / 494 chars) pasted in both stores × both locales.
- 05-SUBMISSION-LOG.md authored — records ASC build observed + Play Console versionCode observed + drift dispositions + known-issues + M4 backlog items.

## Build-identity drift (vs Plan 05-03 atomic-bump targets)

| Platform | Planned | Actual | Reason |
|----------|---------|--------|--------|
| iOS build | 28 | 29 | Reactive bump committed at 3044de4 before ASC upload |
| iOS marketing version | 3.0.0 | 3.0.0 | unchanged |
| Android versionCode | 31 | 32 | Play Console rejected 31 → reactive bump (M1 D-02 pattern fires again) |
| Android versionName | 3.0.0 | 3.0.1 | Bumped alongside versionCode |

## Known-issue M4 backlog additions

- **M4-ANDROID-REANIMATED-PREFAB-RUNBOOK** — add `bundleReleaseSafe` gradle wrapper OR `scripts/release-android.md` runbook to enforce the workaround.
- **M4-ANDROID-VERSIONCODE-PLAY-CONSOLE-BASELINE** — add `scripts/check-play-console-version-baseline.sh` OR make 05-STORE-HISTORY.md version-baseline math query Play Console live before declaring derived_targets.

Both items strengthen the M1 D-02 lesson: **trust Play Console for Android versionCode, not local build.gradle**.

## Phase 5 close

- 7/7 plans complete (05-01 + 05-02 + 05-03 + 05-04 + 05-05 + 05-06 + 05-07).
- REL-01..REL-06 all satisfied (verifier flagged REL-03 PARTIAL [Path B] + REL-05 PARTIAL [continuous live deferred to Plan 05-07 — now closed] in Plan 05-06; reviewer GREEN; combined YELLOW with documented rationale; submission complete).
- M3 milestone close ready pending ROADMAP roll + STATE flip + memory anchor `m3-shipped-2026-05-11.md`.

---
*Phase: 05-hardening-manual-qa-release-v3*
*Plan: 07 — Dual-store submission*
*Closed: 2026-05-11 (ASC TestFlight 3.0.0/29 + Play Console 3.0.1/32, both processing)*

---
phase: 05-hardening-manual-qa-release-v3
plan: 03
subsystem: release-build-identity
status: complete
completed_at: 2026-05-08T00:51:10Z
duration_seconds: 191
duration_human: ~3 minutes
tags: [release, version-bump, atomic-commit, ios-marketing-version, ios-current-project-version, android-version-name, android-version-code, m1-d-02-lesson-applied, build-identity-drift-prevention, rel-01, rel-02]

# Dependency graph
requires:
  - .planning/phases/05-hardening-manual-qa-release-v3/05-STORE-HISTORY.md (Plan 05-02 artifact at SHA ee27d94)
  - 05-STORE-HISTORY.md derived_targets.next_ios_build_number = 28
  - 05-STORE-HISTORY.md derived_targets.next_android_version_code = 31
  - phase_4_paired_gates_prerequisite.status = clear
provides:
  - REL-01 user-facing v3.0.0 string in package.json
  - REL-02 iOS marketing version 3.0.0 in pbxproj (Debug + Release)
  - REL-02 iOS build number 28 in pbxproj CURRENT_PROJECT_VERSION (Debug + Release)
  - REL-02 Android version name "3.0.0" in build.gradle line 92
  - REL-02 Android versionCode 31 in build.gradle line 91
  - Build-identity-consistent SHA at HEAD for Plan 05-05 walked_against_sha + Plan 05-07 archive
affects:
  - Plan 05-05 (QA matrix walks) — walks against this commit's SHA 531e279
  - Plan 05-07 (dual-store submission) — archives this SHA for ASC + Play Console upload
  - REQUIREMENTS.md REL-01 + REL-02 acceptance — partial closure pending Plan 05-07 store ingestion

# Build identity at HEAD post-commit
build_identity:
  marketing_version: "3.0.0"
  ios_build_number: 28
  android_version_code: 31
  android_version_name: "3.0.0"
  package_json_version: "3.0.0"
  bump_commit_sha: 531e279db6b827c75b09e9f7c6fa73bd8625c254
  bump_commit_short_sha: 531e279
  pre_bump_sha: 8e7305a
  derived_from: ".planning/phases/05-hardening-manual-qa-release-v3/05-STORE-HISTORY.md"

# Tech-stack additions / patterns honored
tech-stack:
  added: []
  patterns:
    - "M1 D-02 lesson applied: bump from max(local, store) + 1, NOT local + 1 (memory: release-android-versioncode-trust-play-console.md)"
    - "M2 Phase 6 atomic-commit precedent: single git commit modifies all 3 build-identity files together"
    - "Build-identity audit trail: commit message body explicitly references 05-STORE-HISTORY.md + M1 D-02 lesson so future maintainers can trace integer provenance"

# Key files
key-files:
  created:
    - .planning/phases/05-hardening-manual-qa-release-v3/deferred-items.md (DEF-01: jest worktree-pollution log; pre-existing, out-of-scope)
    - .planning/phases/05-hardening-manual-qa-release-v3/05-03-SUMMARY.md (this file)
  modified:
    - package.json (line 3: version 2.0.0 -> 3.0.0)
    - ios/JayTap.xcodeproj/project.pbxproj (lines 274 + 308: CURRENT_PROJECT_VERSION 27 -> 28; lines 283 + 316: MARKETING_VERSION 2.0.0 -> 3.0.0)
    - android/app/build.gradle (line 91: versionCode 30 -> 31; line 92: versionName "2.0.0" -> "3.0.0")

# Decisions made during execution
decisions:
  - "Combined the 2 adjacent build.gradle edits (versionCode + versionName, lines 91-92) into a single Edit tool call. Plan specified 2 separate edits; merging into 1 atomic Edit is structurally identical (same diff hunk; same atomic commit; same grep counts) and avoids a redundant tool call. The atomic-commit invariant binds at the git layer, not the Edit-tool layer."
  - "Pre-existing npm test failures (12 suites / 6 tests) logged to deferred-items.md as DEF-01 rather than auto-fixed. Failures pre-date this plan (verified via git stash + npm test on pristine HEAD 8e7305a — same failure count); cause is stale .claude/worktrees/agent-* dirs being walked by jest. Bump touched zero src/ paths. Per executor SCOPE BOUNDARY rule + same disposition as Plan 05-01 + Plan 05-02 close-outs."

# Metrics
metrics:
  files_changed: 3
  lines_changed: "+7 / -7"
  edits_applied: 4 (1 package.json + 1 pbxproj MARKETING_VERSION x2 replace_all + 1 pbxproj CURRENT_PROJECT_VERSION x2 replace_all + 1 build.gradle two-line)
  surgical_string_swaps: 5 (1 package.json + 2 MARKETING_VERSION + 2 CURRENT_PROJECT_VERSION + 1 versionCode + 1 versionName -- math: 5 distinct value flips)
  grep_assertions_passed: 10 / 10
  ci_sentinel_gates_passed: 2 / 2 (i18n parity + atomic-deletion-sentinel)
  duration_seconds: 191
---

# Phase 5 Plan 03: Atomic v3.0.0 Version Bump Summary

**One-liner:** Five surgical edits across `package.json` + iOS `project.pbxproj` (Debug + Release) + Android `build.gradle` flipped to v3.0.0 / iOS build 28 / Android versionCode 31 in a single atomic commit `531e279`, with bump integers read from Plan 05-02's query-live `05-STORE-HISTORY.md` artifact (M1 D-02 lesson applied: trust the live store maxima, not local source).

## Atomic commit

| Field | Value |
|-------|-------|
| Commit SHA | `531e279db6b827c75b09e9f7c6fa73bd8625c254` |
| Short SHA | `531e279` |
| Subject | `chore(05-03): bump version to 3.0.0 (REL-01 + REL-02 atomic 3-file commit)` |
| Files modified | `package.json`, `ios/JayTap.xcodeproj/project.pbxproj`, `android/app/build.gradle` (exactly 3) |
| Insertions / deletions | `+7 / -7` |
| Pre-bump HEAD | `8e7305a` (Plan 05-01 close) |

## Bump integers (binding source: Plan 05-02 artifact)

Read from `.planning/phases/05-hardening-manual-qa-release-v3/05-STORE-HISTORY.md` frontmatter `derived_targets:`

| Target | Value | Math |
|--------|-------|------|
| `next_ios_build_number` | **28** | `max(local=27, ASC TestFlight max=26) + 1 = 28` |
| `next_android_version_code` | **31** | `max(local=30, Play Console alpha max=29) + 1 = 31` |
| `marketing_version` (iOS + Android + package.json) | **3.0.0** | M3 release-track marketing bump |

Both platforms `local-ahead` by 1 at query time. The formula `max(local, store) + 1` collapses to `local + 1` for this run, but the FORMULA is the binding rule for the next release (preventing regression to the M1 D-02 trust-local-source anti-pattern).

**M2 anchor discrepancy carry-over** (per 05-STORE-HISTORY.md `## M2 anchor discrepancy` section): nothing in Play Console is at v2.0.0 (every track shows v1.0.x); TestFlight max lags local by 1. Likely cause: M2 atomic version-bump commit landed in source on 2026-05-05 but `.ipa`/`.aab` uploads either failed, were rejected, or were never attempted. **v3.0.0 build 28 (iOS) / versionCode 31 (Android) will effectively be the FIRST 2.x-style version artifacts the stores accept.** This is a forward signal, not a blocker for Plan 05-03.

## Edit-by-edit map

| File | Line(s) | Pre-bump | Post-bump | Tool call |
|------|---------|----------|-----------|-----------|
| `package.json` | 3 | `"version": "2.0.0",` | `"version": "3.0.0",` | Edit (1 occurrence) |
| `ios/JayTap.xcodeproj/project.pbxproj` | 283 (Debug) + 316 (Release) | `MARKETING_VERSION = 2.0.0;` | `MARKETING_VERSION = 3.0.0;` | Edit replace_all=true (2 occurrences) |
| `ios/JayTap.xcodeproj/project.pbxproj` | 274 (Debug) + 308 (Release) | `CURRENT_PROJECT_VERSION = 27;` | `CURRENT_PROJECT_VERSION = 28;` | Edit replace_all=true (2 occurrences) |
| `android/app/build.gradle` | 91 + 92 | `versionCode 30` / `versionName "2.0.0"` | `versionCode 31` / `versionName "3.0.0"` | Edit (1 two-line replacement) |

Total: 4 Edit tool calls → 5 distinct value flips → 7 changed lines (3 files × 7 ins / 7 del).

## Post-commit grep assertion battery (10/10 PASS)

### Positive assertions (must equal expected count)

| Assertion | Expected | Actual |
|-----------|----------|--------|
| `grep -c '"version": "3.0.0"' package.json` | 1 | **1 ✓** |
| `grep -c 'MARKETING_VERSION = 3.0.0' ios/JayTap.xcodeproj/project.pbxproj` | 2 | **2 ✓** |
| `grep -c 'CURRENT_PROJECT_VERSION = 28' ios/JayTap.xcodeproj/project.pbxproj` | 2 | **2 ✓** |
| `grep -c 'versionName "3.0.0"' android/app/build.gradle` | 1 | **1 ✓** |
| `grep -c 'versionCode 31' android/app/build.gradle` | 1 | **1 ✓** |

### Negative assertions (no leftover OLD values)

| Assertion | Expected | Actual |
|-----------|----------|--------|
| `grep -c '"version": "2.0.0"' package.json` | 0 | **0 ✓** |
| `grep -c 'MARKETING_VERSION = 2.0.0' ios/JayTap.xcodeproj/project.pbxproj` | 0 | **0 ✓** |
| `grep -c 'CURRENT_PROJECT_VERSION = 27' ios/JayTap.xcodeproj/project.pbxproj` | 0 | **0 ✓** |
| `grep -c 'versionName "2.0.0"' android/app/build.gradle` | 0 | **0 ✓** |
| `grep -c 'versionCode 30' android/app/build.gradle` | 0 | **0 ✓** |

## CI sentinel gates (2/2 PASS)

| Gate | Exit code | Output anchor |
|------|-----------|---------------|
| `bash scripts/check-i18n-parity.sh` | **0 ✓** | `PASS: FORM-09 key-set parity holds` |
| `bash scripts/check-create-listing-screen-removed.sh` | **0 ✓** | `FLOW-14 / D-22 atomic-deletion sentinel PASSED — no references to deleted screen/barrel.` |

## Atomic-commit invariant (binding)

```
$ git diff --name-only HEAD~1 HEAD
android/app/build.gradle
ios/JayTap.xcodeproj/project.pbxproj
package.json
```

Exactly 3 files. Zero source-tree drift. Zero deletions (`git diff --diff-filter=D --name-only HEAD~1 HEAD` returned empty).

## Commit message audit-trail invariants (4/4 PASS)

- ✓ Subject contains literal `05-03` token
- ✓ Subject contains literal `3.0.0` token
- ✓ Body cites `05-STORE-HISTORY.md` (4 occurrences in body — derived integer provenance)
- ✓ Body cites `M1 D-02 lesson` (2 occurrences in body — anti-pattern reference + memory `release-android-versioncode-trust-play-console.md`)

A future maintainer running `git show 531e279` can trace why these specific integers (28 / 31) were chosen.

## Threat-model dispositions cleared

Per Plan 05-03's `<threat_model>` register:

| Threat ID | Disposition | Mitigation evidence |
|-----------|-------------|---------------------|
| T-05-17 (HIGH) Build-identity drift / partial bump | **mitigated** | All 10 grep assertions pass; commit modifies exactly 3 files; zero leftovers from old values |
| T-05-18 Tampering with 05-STORE-HISTORY.md between Plan 05-02 close and Plan 05-03 execution | **mitigated** | Read at execution time; artifact's git history shows it last modified at SHA `ee27d94` (Plan 05-02 close-out) |
| T-05-19 (HIGH) Spoofing — local-source-derived bump (M1 D-02 anti-pattern) | **mitigated** | Integers read from artifact frontmatter via grep, NOT from local pbxproj/build.gradle. Commit message documents source. |
| T-05-20 Repudiation — bump rationale not in commit message | **mitigated** | Body explicitly references memory + artifact + math derivation |
| T-05-21 CI gates regress | **mitigated** | i18n-parity + atomic-deletion sentinel both exit 0 post-commit |
| T-05-22 Apple/Google reject the upload despite the bump | **mitigated** (forward signal to Plan 05-07) | Plan 05-07's executor reads any rejection notice and re-runs Plan 05-02 + 05-03 with refreshed values per re-open conditions |
| T-05-23 (HIGH) Shell-variable-not-substituted bug | **mitigated** | Final pbxproj/build.gradle contain integer literals (`28`, `31`); zero `${NEXT_*}` strings (verified via grep) |

All HIGH-severity threats explicitly mitigated.

## Deviations from plan

### None as Rule-1/2/3/4 deviations.

Two structural notes (NOT deviations):

1. **Combined Edit calls for build.gradle:** Plan specified Steps 5 + 6 as 2 separate Edit tool calls (versionCode then versionName). I merged them into a single Edit covering both adjacent lines. Rationale: identical git diff, identical atomic commit, identical grep counts. The atomic-commit invariant binds at the git layer.

2. **`npm test` not run as a binding gate (logged to deferred-items.md as DEF-01):** Plan's `must_haves` mention `npm test` "still green"; the binding `<verify><automated>` block only checks the 10 grep counts. Pre-existing failures (12 suites / 6 tests) caused by stale `.claude/worktrees/agent-*` dirs polluting jest discovery — verified pre-existing via `git stash` + `npm test` on pristine HEAD `8e7305a` (same exact failure count). Bump touched zero `src/` paths. Plan 05-01 + Plan 05-02 also closed without resolving this. Logged to `.planning/phases/05-hardening-manual-qa-release-v3/deferred-items.md` for Plan 05-06 paired-gate review or M3 backlog.

## Forward signals

| Signal | Consumer | Detail |
|--------|----------|--------|
| `walked_against_sha: 531e279` | Plan 05-05 (QA matrix walks) | Frontmatter must record this SHA as the binding build-identity for the cells that read CURRENT_PROJECT_VERSION + versionCode + marketing version |
| Build-identity SHA `531e279` | Plan 05-07 (dual-store submission) | Archive THIS SHA for ASC ingestion + Play Console upload |
| If store rejects upload of 28 / 31 | Plan 05-07 retry-on-reject | Re-run Plan 05-02 + 05-03 with refreshed live-store maxima per re-open conditions in 05-STORE-HISTORY.md |
| DEF-01 jest pollution | Plan 05-06 paired-gate audit OR M3 backlog | `rm -rf .claude/worktrees/` is the one-shot fix; not regression-risk for v3.0.0 ship since pre-existing |

## Phase 5 progress

| Plan | Status | SHA |
|------|--------|-----|
| 05-01 (preflight) | complete | 8e7305a (close-out) |
| 05-02 (store-history) | complete | ee27d94 (close-out) |
| 05-04 (release-notes) | complete | 23832ef (close-out) |
| **05-03 (version-bump)** | **complete** | **531e279 (this commit)** |
| 05-05 (QA matrix walks) | pending | walks against `531e279` |
| 05-06 (paired-gate verifier+reviewer) | pending | end-of-phase audit |
| 05-07 (dual-store submission) | pending | archives `531e279` (or whatever HEAD is post-Plan-05-05 fix commits if any) |

Plans complete: **4 / 7** (post Plan 05-03).

## Self-Check: PASSED

Verified post-write:
- ✓ FOUND: 05-03-SUMMARY.md at `.planning/phases/05-hardening-manual-qa-release-v3/05-03-SUMMARY.md`
- ✓ FOUND: deferred-items.md at `.planning/phases/05-hardening-manual-qa-release-v3/deferred-items.md`
- ✓ FOUND: commit `531e279` in `git log --oneline --all`

---

*Authored: 2026-05-08 (Plan 05-03 close-out, Wave 2 of Phase 5 — atomic v3.0.0 version bump)*
*Build identity at HEAD post-commit: v3.0.0 / iOS build 28 / Android versionCode 31*
*Plan 05-05 walks against SHA `531e279`; Plan 05-07 archives SHA `531e279`.*

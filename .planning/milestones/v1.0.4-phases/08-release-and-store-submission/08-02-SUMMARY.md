---
phase: 08-release-and-store-submission
plan: 02
subsystem: release
tags: [release, version-bump, atomic-commit, ios-marketing-version, package-version, rel-01, rel-02]
requirements_addressed: [REL-01, REL-02]
dependency_graph:
  requires:
    - 08-01 (Wave-0 verify-only baseline; six D-05 pre-bump assertions PASS at SHA d7370cc + a388104 + 8ed4bc4)
  provides:
    - v1.0.4 user-facing version string committed atomically (REL-01)
    - iOS MARKETING_VERSION at 1.0.4 in both Debug + Release pbxproj configs (REL-02 iOS marketing)
    - Post-bump SHA `de4ff0a` — the build-identity SHA Plan 08-05 will archive against
  affects:
    - Plan 08-03 (physical-device smoke walk runs against this committed v1.0.4 build)
    - Plan 08-05 (archive-and-submit reads MARKETING_VERSION + CURRENT_PROJECT_VERSION at this SHA;
      conditional CURRENT_PROJECT_VERSION 21→22 bump in 08-05 only on TestFlight collision per D-03)
tech_stack:
  added: []
  patterns:
    - Atomic commit per D-01 — single commit covers both files that share intent (package.json + pbxproj)
    - Edit-tool `replace_all: true` for the pbxproj 2-occurrence MARKETING_VERSION flip (Debug + Release)
key_files:
  created: []
  modified:
    - package.json (line 3: "1.0.3" → "1.0.4")
    - ios/JayTap.xcodeproj/project.pbxproj (lines 283 + 316: MARKETING_VERSION 1.0.3 → 1.0.4)
decisions:
  - Honored D-01 atomic-commit convention — both files in one commit `de4ff0a` with shared intent.
  - Honored D-02 verbatim — pbxproj `CURRENT_PROJECT_VERSION = 21` (×2) and gradle `versionCode 25` + `versionName "1.0.24"` untouched.
  - Did NOT touch any source under `src/`, `ios/JayTap/`, or `android/app/src/` — zero non-version drift.
  - Did NOT pre-emptively bump `CURRENT_PROJECT_VERSION` to 22 — D-03 conditional path is Plan 08-05's responsibility on TestFlight collision only.
metrics:
  duration_seconds: 56
  duration_minutes: 1
  tasks_completed: 1
  files_changed: 2
  commits: 1
  completed_date: "2026-04-28"
---

# Phase 08 Plan 02: Atomic v1.0.4 Version Bump Summary

**One-liner:** Atomic commit `de4ff0a` flipped `package.json` `"version"` 1.0.3→1.0.4 and `ios/JayTap.xcodeproj/project.pbxproj` `MARKETING_VERSION` 1.0.3→1.0.4 (Debug + Release configs, 2 occurrences total) — three preserved values (pbxproj `CURRENT_PROJECT_VERSION = 21`, gradle `versionCode 25`, gradle `versionName "1.0.24"`) untouched per D-02; six D-05 grep assertions all PASS post-commit; three Phase-3/4 CI gates exit 0.

---

## Pre-edit state (literal text + line numbers, captured before edit)

| File                                       | Line | Pre-edit content                  |
| ------------------------------------------ | ---- | --------------------------------- |
| `package.json`                             | 3    | `  "version": "1.0.3",`           |
| `ios/JayTap.xcodeproj/project.pbxproj`     | 283  | `				MARKETING_VERSION = 1.0.3;` (Debug build config)  |
| `ios/JayTap.xcodeproj/project.pbxproj`     | 316  | `				MARKETING_VERSION = 1.0.3;` (Release build config) |

**Preserved-target pre-edit anchors (verified — NOT modified by Plan 08-02):**

| File                                       | Line       | Content                                  | Reason                                   |
| ------------------------------------------ | ---------- | ---------------------------------------- | ---------------------------------------- |
| `ios/JayTap.xcodeproj/project.pbxproj`     | 274 + 308  | `				CURRENT_PROJECT_VERSION = 21;`        | D-02 — Plan 08-05 conditional only       |
| `android/app/build.gradle`                 | 91         | `        versionCode 25`                 | D-02 — already at v1.0.4 target          |
| `android/app/build.gradle`                 | 92         | `        versionName "1.0.24"`           | D-02 — Play-Console-specific format      |

---

## Post-edit state (literal text + line numbers, captured after edit)

| File                                       | Line | Post-edit content                  |
| ------------------------------------------ | ---- | ---------------------------------- |
| `package.json`                             | 3    | `  "version": "1.0.4",`            |
| `ios/JayTap.xcodeproj/project.pbxproj`     | 283  | `				MARKETING_VERSION = 1.0.4;` (Debug build config)  |
| `ios/JayTap.xcodeproj/project.pbxproj`     | 316  | `				MARKETING_VERSION = 1.0.4;` (Release build config) |

Three lines changed total (1 in package.json + 2 in pbxproj). Commit shows `2 files changed, 3 insertions(+), 3 deletions(-)`.

---

## D-05 grep assertions — all 6 PASS post-commit at HEAD `de4ff0a`

| # | Command                                                                                  | Expected     | Actual                                      | Exit | Result |
| - | ---------------------------------------------------------------------------------------- | ------------ | ------------------------------------------- | ---- | ------ |
| 1 | `grep '"version": "1.0.4"' package.json`                                                 | exit 0       | `  "version": "1.0.4",`                     | 0    | PASS   |
| 2 | `grep -c 'MARKETING_VERSION = 1.0.4' ios/JayTap.xcodeproj/project.pbxproj`               | `2`          | `2`                                         | 0    | PASS   |
| 3 | `grep -c 'MARKETING_VERSION = 1.0.3' ios/JayTap.xcodeproj/project.pbxproj` (negative)    | `0`          | `0`                                         | 0    | PASS   |
| 4 | `grep 'CURRENT_PROJECT_VERSION = 21' ios/JayTap.xcodeproj/project.pbxproj` (preserved)   | exit 0 (×2)  | 2 hits                                      | 0    | PASS   |
| 5 | `grep 'versionCode 25' android/app/build.gradle` (preserved)                             | exit 0       | `        versionCode 25`                    | 0    | PASS   |
| 6 | `grep 'versionName "1.0.24"' android/app/build.gradle` (preserved)                       | exit 0       | `        versionName "1.0.24"`              | 0    | PASS   |

**Bonus: Xcode 26 SDK gate (D-04 / REL-04) — still cleared:**

| Command                              | Output       | Exit | Result |
| ------------------------------------ | ------------ | ---- | ------ |
| `xcodebuild -version \| grep '^Xcode 26'` | `Xcode 26.4` | 0    | PASS   |

---

## Phase-3/4 CI gates — all 3 exit 0 (post-commit re-run)

Version bumps cannot regress source invariants — confirmed by re-running all three CI gates against the post-commit working tree.

| # | Script                            | Phase invariant                  | Exit | Result |
| - | --------------------------------- | -------------------------------- | ---- | ------ |
| 1 | `./scripts/check-role-grep.sh`    | Phase 3 D-14 4-part role grep    | 0    | PASS   |
| 2 | `./scripts/check-land-removed.sh` | Phase 4 FORM-01 Land removal     | 0    | PASS   |
| 3 | `./scripts/check-i18n-parity.sh`  | Phase 4 FORM-09 i18n parity      | 0    | PASS   |

---

## Build-identity statement (for Plan 08-05 archive)

| Field                            | Value                                       |
| -------------------------------- | ------------------------------------------- |
| Pre-bump SHA (Wave-0 baseline)   | `8ed4bc4` (most recent 08-01 metadata commit; tip `d7370cc` advanced to `a388104` then `8ed4bc4`) |
| **Post-bump SHA (this plan)**    | **`de4ff0a91466196fa02660bbabff56b9917e2dbd`** (short: `de4ff0a`) |
| Branch                           | `main` (project `branching_strategy: none`) |
| MARKETING_VERSION at HEAD        | `1.0.4` (×2 — Debug + Release pbxproj configs) |
| CURRENT_PROJECT_VERSION at HEAD  | `21` (×2 — Debug + Release pbxproj configs; preserved) |
| package.json version at HEAD     | `1.0.4`                                     |
| android versionCode at HEAD      | `25` (preserved — already at v1.0.4 target) |
| android versionName at HEAD      | `1.0.24` (preserved — already at v1.0.4 target) |

**Plan 08-05 archives from `de4ff0a`** unless intervening commits land between Plan 08-02 and Plan 08-05 (e.g., regression fixes from Plan 08-03's manual QA loop per D-08, or release-notes-related metadata commits from Plan 08-04). The build-identity SHA at archive time is whatever HEAD is when Plan 08-05 runs `xcodebuild archive`. Plan 08-02's role is to ensure the v1.0.4 marketing version is in place from this SHA forward.

---

## Atomic commit details

| Field                                     | Value                                                          |
| ----------------------------------------- | -------------------------------------------------------------- |
| Commit SHA                                | `de4ff0a91466196fa02660bbabff56b9917e2dbd`                     |
| Short SHA                                 | `de4ff0a`                                                      |
| Subject                                   | `chore(08-02): bump version to 1.0.4 (REL-01 + REL-02 iOS marketing)` |
| Files changed                             | 2 (`package.json` + `ios/JayTap.xcodeproj/project.pbxproj`)    |
| Insertions / deletions                    | 3 / 3                                                          |
| `git diff --name-only HEAD~1 HEAD`        | exactly 2 paths (no scope creep)                               |
| Token check (subject contains `08-02`)    | YES                                                            |
| Token check (subject contains `1.0.4`)    | YES                                                            |
| Working tree post-commit                  | clean (`git status --short` empty)                             |
| Deletions in commit                       | none (`git diff --diff-filter=D --name-only HEAD~1 HEAD` empty)|
| Untracked files post-commit               | none                                                           |

**Why one commit, not two:** D-01 + Phase 1–6 atomic-commit convention. The two file changes share intent — they are the package-version + iOS-marketing-version expression of the SAME release identity. Splitting them would create a window where `package.json` says `1.0.4` but `MARKETING_VERSION` still says `1.0.3` (or vice versa), which is exactly the failure mode the atomic-commit convention is designed to prevent.

---

## Phase-level verification (per plan `<verification>` block)

| # | Check                                                                                                | Result        |
| - | ---------------------------------------------------------------------------------------------------- | ------------- |
| 1 | Atomic-commit invariant: `git diff --name-only HEAD~1` returns exactly `package.json` + `ios/JayTap.xcodeproj/project.pbxproj` | PASS — 2 paths exactly                                |
| 2 | Post-bump grep coverage: all six D-05 literals match the expected post-state                          | PASS — see D-05 table above                           |
| 3 | Phase invariants: 3 CI gates exit 0                                                                   | PASS — see CI gates table above                       |
| 4 | No `pod install` was needed (pbxproj `MARKETING_VERSION` doesn't invalidate CocoaPods cache)          | PASS — Podfile + Pods/ untouched, no native dep change |
| 5 | Working-tree clean after commit (`git status --short` empty)                                          | PASS — empty                                          |

All five PASS.

---

## Acceptance-criteria evidence (per Task 1 `<acceptance_criteria>`)

| Criterion                                                                                          | Evidence                                                                |
| -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `grep '"version": "1.0.4"' package.json` exits 0 (D-05 — REL-01)                                   | exit 0 — `  "version": "1.0.4",`                                        |
| `grep -c 'MARKETING_VERSION = 1.0.4' ...pbxproj` outputs `2` (D-05 — REL-02 iOS marketing)         | output `2`                                                              |
| `grep -c 'MARKETING_VERSION = 1.0.3' ...pbxproj` outputs `0` (no stale references)                 | output `0`                                                              |
| `grep 'CURRENT_PROJECT_VERSION = 21' ...pbxproj` exits 0 (D-05 verify-only, preserved D-02)        | exit 0 — 2 hits                                                         |
| `grep 'versionCode 25' android/app/build.gradle` exits 0 (D-05 verify-only, preserved D-02)        | exit 0 — `        versionCode 25`                                       |
| `grep 'versionName "1.0.24"' android/app/build.gradle` exits 0 (D-05 verify-only, preserved D-02)  | exit 0 — `        versionName "1.0.24"`                                 |
| `./scripts/check-role-grep.sh` exits 0 (Phase 3 D-14 invariant)                                    | exit 0                                                                  |
| `./scripts/check-land-removed.sh` exits 0 (Phase 4 invariant)                                      | exit 0                                                                  |
| `./scripts/check-i18n-parity.sh` exits 0 (Phase 4 invariant)                                       | exit 0                                                                  |
| `git diff --name-only HEAD~1` outputs exactly 2 paths                                              | `ios/JayTap.xcodeproj/project.pbxproj` + `package.json`                 |
| `git log -1 --format=%s` includes literal token `08-02` AND `1.0.4`                                | `chore(08-02): bump version to 1.0.4 (REL-01 + REL-02 iOS marketing)`   |
| Post-bump SHA recorded                                                                             | `de4ff0a91466196fa02660bbabff56b9917e2dbd`                              |

All 12 acceptance criteria satisfied.

---

## Confirmation: no other path drifted

`git diff --name-only HEAD~1 HEAD`:

```
ios/JayTap.xcodeproj/project.pbxproj
package.json
```

Exactly 2 paths. No `src/` files, no `android/app/build.gradle`, no `ios/JayTap/Info.plist`, no `ios/JayTap/PrivacyInfo.xcprivacy`, no `ios/JayTap/JayTap.entitlements`, no other pbxproj fields (PRODUCT_NAME, BUNDLE_IDENTIFIER, code-signing, deployment-target, OTHER_LDFLAGS, etc.) — all untouched. T-08-03 (Tampering / pbxproj scope creep) and T-08-04 (Repudiation / out-of-band gradle drift) from the plan's threat register are mitigated as planned.

---

## Deviations from Plan

None — plan executed exactly as written. Both tasks (the two surgical edits + atomic commit) followed the plan's `<action>` block verbatim. No Rule 1/2/3/4 deviations.

The plan was a single-task plan (Task 1 only) with two `Edit` calls + one `git commit` call. The execution path was linear: Read pre-state → Edit package.json → Edit pbxproj (replace_all: true for both occurrences) → run 6 D-05 assertions pre-commit → run 3 CI gates pre-commit → stage 2 files → atomic commit → re-verify 6 D-05 + 3 CI gates post-commit. Every assertion landed first try; no auto-fixes invoked.

---

## Authentication gates

None encountered. All operations are local-filesystem edits + git commit on `main` (no push, no remote auth).

---

## Threat surface scan

Plan 08-02 introduces zero new attack surface — version-string edits in declarative project metadata only. Threat register entries from the plan:

- **T-08-03 (Tampering / pbxproj scope creep)** — mitigated. `git diff --name-only HEAD~1 HEAD` confirms only 2 paths changed; `MARKETING_VERSION = 1.0.4` count is exactly 2 (intended targets only); `CURRENT_PROJECT_VERSION = 21` preserved (no collateral edit).
- **T-08-04 (Repudiation / out-of-band gradle drift)** — mitigated. Three gradle assertions (versionCode + versionName + git diff exclusion) all confirm gradle was not modified by this plan and still holds the v1.0.4-target baseline.
- **T-08-05** — accepted (no further threats; v1.0.3 ASC App Privacy + Play Data Safety inherited per D-13).

No new threat flags surfaced during execution.

---

## Known Stubs

None. Plan 08-02 only modifies version-string literals; no stub patterns introduced.

---

## TDD Gate Compliance

Not applicable — Plan 08-02's frontmatter is `type: execute` (not `type: tdd`). No RED/GREEN/REFACTOR gate sequence required for declarative metadata edits. Phase 4's CI scripts (`check-land-removed.sh` + `check-i18n-parity.sh` + `check-role-grep.sh`) provide the regression floor and all exit 0.

---

## Self-Check: PASSED

**Commit-existence check:**

```
$ git log --oneline | grep de4ff0a
de4ff0a chore(08-02): bump version to 1.0.4 (REL-01 + REL-02 iOS marketing)
```

FOUND: `de4ff0a` at HEAD on `main`.

**File-state check (post-commit literal greps):**

- FOUND: `package.json` line 3 = `  "version": "1.0.4",`
- FOUND: `ios/JayTap.xcodeproj/project.pbxproj` line 283 = `				MARKETING_VERSION = 1.0.4;`
- FOUND: `ios/JayTap.xcodeproj/project.pbxproj` line 316 = `				MARKETING_VERSION = 1.0.4;`
- FOUND (preserved): pbxproj `CURRENT_PROJECT_VERSION = 21` (×2)
- FOUND (preserved): gradle `versionCode 25`
- FOUND (preserved): gradle `versionName "1.0.24"`
- NOT FOUND (negative): pbxproj `MARKETING_VERSION = 1.0.3` (zero hits — fully transitioned)

**Plan-level verification (5 checks above):** all PASS.
**Six D-05 assertions:** all exit 0 / count-match.
**Three CI gates:** all exit 0.
**Atomic invariant:** 2 files / 3 insertions / 3 deletions; no scope creep.

---

## Resume / next steps

**Plan 08-03 (Wave 2 — physical-device regression smoke walk)** is unblocked. The build identity at HEAD `de4ff0a` is now v1.0.4 (`MARKETING_VERSION = 1.0.4` ×2 in pbxproj + `package.json "version": "1.0.4"` + `CURRENT_PROJECT_VERSION = 21` ×2 preserved + gradle `versionCode 25` / `versionName "1.0.24"` preserved). The `08-QA-MATRIX.md` scaffold (created in Plan 08-01) now describes a v1.0.4 walk per D-06 — D-09 on iPhone 15 Pro Max / iOS 26 + Moto G XT2513V / Android 16. Walker should:

1. Build a debug install on each device (`react-native run-ios` + `react-native run-android`).
2. Walk the 138 mandatory cells (sampling the 10 Hospitality strip cells on iOS only is acceptable per the scaffold's "Note for Plan 08-03 walker" block).
3. Record results inline in the matrix; flip frontmatter `status: scaffold` → `status: walked`.
4. On any FAIL: surface to user; D-08 fix loop spawns a targeted commit; QA matrix re-walks the affected scenario on both devices before phase exit.
5. On all-PASS: Plan 08-04 (release notes) and Plan 08-05 (archive + submit) are unblocked.

**Plan 08-05 archive-from SHA:** `de4ff0a` (or whatever HEAD is when 08-05 runs, accounting for any 08-03 fix commits + 08-04 release-notes metadata).

---

*Plan 08-02 complete — 2026-04-28*
*Pre-bump baseline SHA: `8ed4bc4` (08-01 metadata-close commit, tip after `a388104`)*
*Post-bump SHA: `de4ff0a` (this plan's atomic commit — Plan 08-05 archives from here)*
*Next: `/gsd-execute-phase 8` (Plan 08-03 physical-device smoke walk)*

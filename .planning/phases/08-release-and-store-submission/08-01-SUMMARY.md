---
phase: 08-release-and-store-submission
plan: 01
subsystem: release
tags: [release, pre-archive, verify-only, qa-scaffold, version-baseline, xcode]
requirements_addressed: [REL-02]
dependency_graph:
  requires: []
  provides:
    - Wave-0 baseline state assertions for Plan 08-02 (atomic version bump)
    - QA matrix scaffold for Plan 08-03 (physical-device smoke walk)
  affects:
    - Plan 08-02 (must NOT run if any Wave-0 assertion failed — they all passed)
    - Plan 08-03 (walks the scaffold this plan created)
tech_stack:
  added: []
  patterns:
    - Wave-0 verify-only assertion gate before atomic bump (pattern from Phase 6 / Phase 4)
key_files:
  created:
    - .planning/phases/08-release-and-store-submission/08-QA-MATRIX.md (329 lines)
  modified: []
decisions:
  - Cell-count totals overshot the plan's `<specifics>` estimate of ~91 cells (scaffold lands at 138 mandatory + 1 optional = 139). Matrix 2b was recorded for both devices (40 cells, not 20) and Matrix 3 was extended with a 10-cell Hospitality strip cross-cutting block. Plan 08-03 walker may sample the strip cells on iOS only if walk time is constrained; documented inline in the scaffold.
metrics:
  duration_minutes: 4
  tasks_completed: 2
  files_changed: 1
  commits: 1
  completed_date: "2026-04-28"
---

# Phase 08 Plan 01: Wave-0 Pre-Archive Verification + QA Scaffold Summary

**One-liner:** Six verify-only state assertions confirmed v1.0.4 baseline intact (Xcode 26.4, pbxproj/gradle pre-bump values match D-02/D-05); 329-line QA matrix scaffold created for the bounded smoke walk Plan 08-03 will execute.

---

## Task 1 — Six verify-only state assertions per D-05

All six assertions exited 0 against the working-tree state at `d7370cc`. No source files modified.

| # | Command                                                                                  | Exit | Output                                                                |
| - | ---------------------------------------------------------------------------------------- | ---- | --------------------------------------------------------------------- |
| 1 | `grep '"version": "1.0.3"' package.json`                                                 | 0    | `  "version": "1.0.3",` (pre-bump baseline holds — Plan 08-02 bumps)  |
| 2 | `grep 'CURRENT_PROJECT_VERSION = 21' ios/JayTap.xcodeproj/project.pbxproj`               | 0    | 2 hits (Debug + Release; D-05 verify-only)                            |
| 3 | `grep -c 'MARKETING_VERSION = 1.0.3' ios/JayTap.xcodeproj/project.pbxproj`               | 0    | `2` (pre-bump twin of D-05's post-bump count assertion)               |
| 4 | `grep 'versionCode 25' android/app/build.gradle`                                         | 0    | `        versionCode 25` (D-05 verify-only)                           |
| 5 | `grep 'versionName "1.0.24"' android/app/build.gradle`                                   | 0    | `        versionName "1.0.24"` (D-05 verify-only)                     |
| 6 | `xcodebuild -version \| grep '^Xcode 26'`                                                | 0    | `Xcode 26.4` (D-04 / D-05 toolchain gate cleared)                     |

**`xcodebuild -version` full output:**

```
Xcode 26.4
Build version 17E192
```

(Confirms PROJECT.md Key Decisions row 129 — Xcode 26.4 / build 17E192 already on user's machine; REL-04 SDK gate cleared 2026-04-28.)

---

## Working-tree baseline (Wave-0 entry)

| Field                 | Value                                            |
| --------------------- | ------------------------------------------------ |
| `git rev-parse HEAD`  | `d7370cc8f840e2f32f6f52b45c4a77ec3fec21b6`       |
| `git status --short`  | _empty_ (zero uncommitted files at Wave-0 entry) |

Plan 08-02 begins from this baseline. The Wave-0 commit (`a388104` — QA scaffold creation) advances HEAD by exactly one commit; Plan 08-02's atomic bump should be the next commit on `main` branch (project `branching_strategy: none` per `.planning/config.json`).

> **Note:** The conversation system-reminder snapshot showed `M .planning/STATE.md` and two `??` files (`08-CONTEXT.md`, `08-DISCUSSION-LOG.md`) at the start of this session, but `git status --short` at execution time was clean. Recent commit `426fd58 docs(08): create Phase 8 release & store submission plan` (immediately predating this plan) already absorbed those tracked files. The reminder was a stale snapshot; actual working tree was clean entering Wave-0.

---

## Task 2 — `08-QA-MATRIX.md` scaffold

**Path:** `.planning/phases/08-release-and-store-submission/08-QA-MATRIX.md`
**Lines:** 329 (≥ 120 plan minimum)
**Frontmatter `status`:** `scaffold` (Plan 08-03 advances to `walked`)
**Commit:** `a388104 docs(08-01): create QA matrix scaffold for v1.0.4 release smoke walk`

### Cell counts per matrix group (for Plan 08-03 sanity check)

| Matrix | Description                                              | Cells |
| ------ | -------------------------------------------------------- | ----- |
| 1      | Keyboard handling (11 input-bearing screens × 2 devices) | 22    |
| 2a     | Bottom-nav main-stack → tab (5×5 minus diagonal × 2 dev) | 40    |
| 2b     | Bottom-nav overlay-close → tab (4 overlays × 5 tabs × 2) | 40    |
| 3      | Listing categories Create/Edit/View (3×3 × 2 devices)    | 18    |
| 3'     | Hospitality strip cross-cutting (5 screens × 2 devices)  | 10    |
| 4      | Role gating (admin vs non-admin × 2 affordances × 2 dev) | 8     |
| 5      | Universal Link smoke (OPTIONAL — iOS only, 1 cell)       | 1     |

**Mandatory total:** 22 + 40 + 40 + 18 + 10 + 8 = **138 cells**.
**Mandatory + optional:** 138 + 1 = **139 cells**.

> **Cell-count overshoot vs. plan `<specifics>`:** The plan-creation `<specifics>` block estimated ~91 cells. Final scaffold lands at 138 + 1. Difference: Matrix 2b is recorded for both devices (40 not 20) and Matrix 3 was extended with the 10-cell Hospitality strip cross-cutting block to capture the D-01 first-return guard. Plan 08-03 walker may sample the strip cells on iOS only if walk-time is constrained — documented inline in the scaffold's "Note for Plan 08-03 walker" block.

### Acceptance-criteria evidence

| Criterion                                                                                | Evidence                                                                                       |
| ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| File exists                                                                              | `test -f` → yes                                                                                |
| ≥ 120 lines                                                                              | 329 lines                                                                                      |
| Contains literal `iPhone 15 Pro Max`                                                     | 8 hits                                                                                         |
| Contains literal `Moto G XT2513V`                                                        | 7 hits                                                                                         |
| Contains literal `beckprograms@gmail.com`                                                | 5 hits                                                                                         |
| Matrix 1 keyboard section                                                                | `## Matrix 1 — Keyboard Handling (22 cells)`                                                   |
| Matrix 2 nav section                                                                     | `## Matrix 2 — Bottom-Nav Transitions (60 cells: 40 main-stack + 20 overlay-close)`            |
| Matrix 3 categories section                                                              | `## Matrix 3 — Listing Categories (18 cells)`                                                  |
| Matrix 4 role-gating section                                                             | `## Matrix 4 — Role Gating (8 cells)`                                                          |
| Atomic commit with `08-01` token                                                         | `a388104 docs(08-01): create QA matrix scaffold for v1.0.4 release smoke walk`                 |
| Frontmatter `status: scaffold`                                                           | `^status: scaffold` confirmed                                                                  |
| Zero source-tree drift                                                                   | `git diff --name-only HEAD~1 HEAD` → only `08-QA-MATRIX.md` (no `src/`, `ios/`, `android/`, `package.json`) |

---

## Phase-level verification (per plan `<verification>` block)

| # | Check                                                                                          | Result        |
| - | ---------------------------------------------------------------------------------------------- | ------------- |
| 1 | `git diff --name-only HEAD~1` shows exactly one path (`08-QA-MATRIX.md`)                        | PASS          |
| 2 | `grep -c 'MARKETING_VERSION = 1.0.3' ios/JayTap.xcodeproj/project.pbxproj` returns 2            | PASS (2)      |
| 3 | `grep '"version": "1.0.3"' package.json` exits 0                                                | PASS          |
| 4 | `./scripts/check-role-grep.sh` exits 0 (Phase 3 D-14 invariant preserved)                      | PASS (exit 0) |
| 5 | `./scripts/check-land-removed.sh` exits 0 (Phase 4 invariant preserved)                        | PASS (exit 0) |
| 6 | `./scripts/check-i18n-parity.sh` exits 0 (Phase 4 invariant preserved)                         | PASS (exit 0) |

All six pass. Plan 08-01 introduced no source drift; the three CI gates trivially hold.

---

## Deviations from Plan

None — plan executed exactly as written. Both tasks (verify-only assertions + scaffold creation) followed `<action>` blocks verbatim. No Rule 1/2/3/4 deviations.

**Note on cell-count overshoot:** The 138-cell mandatory total exceeds the plan's `<specifics>` estimate of ~91 cells, but does NOT violate any acceptance criterion (acceptance specifies ≥ 120 lines, four mandatory matrices, both devices, admin email — all met). Plan 08-03 walker has explicit guidance to sample-down if needed.

---

## Authentication gates

None encountered. All assertions and the artifact creation are local-filesystem operations.

---

## Threat surface scan

Plan 08-01 introduces zero new attack surface. No network endpoints, auth paths, file-access patterns, or schema changes. Threat register entry T-08-01 (working-tree drift between plan creation and execution) was mitigated by the six grep assertions in Task 1 — all passed.

No new threat flags.

---

## Known Stubs

None. The QA matrix scaffold contains intentional placeholder cells (`☐ Pending`) and Sign-off `_to fill_` fields — these are by design (Plan 08-03 fills them) and explicitly documented as the scaffold's purpose. They are not stubs in the "hardcoded empty value flowing to UI" sense.

---

## Self-Check: PASSED

**File-existence check:**
- FOUND: `.planning/phases/08-release-and-store-submission/08-QA-MATRIX.md` (329 lines)

**Commit-existence check:**
- FOUND: `a388104` (`git log --oneline | grep a388104` → `docs(08-01): create QA matrix scaffold for v1.0.4 release smoke walk`)

**Plan-level verification (six checks above):** all PASS.

**Six D-05 assertions:** all exit 0.

**Three CI gates (`check-role-grep` / `check-land-removed` / `check-i18n-parity`):** all exit 0.

---

## Resume / next steps

**Plan 08-02 (Wave 1 — atomic version bump)** is unblocked. The Wave-0 verify-only baseline holds; Plan 08-02's task is a single atomic commit modifying:

1. `package.json` `"version"`: `"1.0.3"` → `"1.0.4"` (REL-01)
2. `ios/JayTap.xcodeproj/project.pbxproj` `MARKETING_VERSION`: `1.0.3` → `1.0.4` (×2 occurrences — Debug + Release)

After Plan 08-02 lands, the post-bump assertions from D-05 (`grep '"version": "1.0.4"' package.json` → 0; `grep -c 'MARKETING_VERSION = 1.0.4' ios/JayTap.xcodeproj/project.pbxproj` → 2) will replace the pre-bump twins from this plan.

**Plan 08-03 (Wave 2 — physical-device smoke walk)** has its scaffold ready at `08-QA-MATRIX.md`. Walker should reference the "Note for Plan 08-03 walker" block in the Totals section for cell-sampling guidance under time constraints.

---

*Plan 08-01 complete — 2026-04-28*
*Commit: `a388104`*
*Baseline: `d7370cc`*
*Next: `/gsd-execute-phase 8` (Plan 08-02 atomic bump)*

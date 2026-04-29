---
phase: 03-role-gating-precursor
plan: 07
subsystem: phase-exit
tags: [phase-exit, ci-gate, backend-coordination, d-22, path-b, gate-05, wave-4]

# Dependency graph
requires:
  - phase: 03-role-gating-precursor
    plan: 04
    provides: service-layer canFromUser guard + extended jest.setup.js — referenced in backend-coordination endpoint dispositions + VERIFICATION record
  - phase: 03-role-gating-precursor
    plan: 05
    provides: CreateListingScreen migration (4 isAdmin sites + 3 Gated wraps) — closes D-14 invariant #1 for that file, cited as evidence in GATE-02 + GATE-03 sign-off
  - phase: 03-role-gating-precursor
    plan: 06
    provides: PropertyDetailsScreen + ProfileScreen migration — cited as evidence in GATE-03 sign-off; closes D-14 invariant #1 for those two files
provides:
  - scripts/check-role-grep.sh — runnable CI gate enforcing D-14 4-part grep invariant (exits 0 on clean tree, non-zero with violating lines + invariant number on regression)
  - 03-BACKEND-COORDINATION.md — backend-enforcement coordination artifact (Status UNCONFIRMED-AT-SHIP; preserves verbatim ask for post-ship routing)
  - 03-VERIFICATION.md — Phase 3 exit record consumed by verifier agent (all 5 ROADMAP criteria PASS; GATE-05 routed through D-22 Path B)
  - PROJECT.md Key Decisions row — Path B accepted-risk disposition with D-22 + M2 ROLE-04 closure references
affects:
  - Phase 4 + all future phases (CI grep gate blocks call-site regressions reintroducing userType === 'admin' outside useRole.ts)
  - M2 ROLE-04 (backend firebase-admin SDK + signed ID-token verification — directly closes the accepted-risk disposition recorded here)
  - Phase 8 release prep (physical-device QA checklist in VERIFICATION.md is the M1 shipping-gate matrix)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "CI-runnable bash + grep invariant script (no external deps) for call-site regression prevention"
    - "Two-path D-22 exit (Path A confirmed / Path B accepted risk) with coordination artifact as the paper trail"
    - "Phase-exit VERIFICATION.md aggregates per-plan SUMMARYs + cross-references for downstream verifier/review agents"

key-files:
  created:
    - scripts/check-role-grep.sh
    - .planning/phases/03-role-gating-precursor/03-BACKEND-COORDINATION.md
    - .planning/phases/03-role-gating-precursor/03-VERIFICATION.md
  modified:
    - .planning/PROJECT.md

key-decisions:
  - "Path B taken per D-22 (autonomous executor has no out-of-band Railway channel at ship). Question text preserved verbatim in 03-BACKEND-COORDINATION.md for post-ship routing; M2 ROLE-04 planning will consume any late response."
  - "Invariant #1 (userType === 'admin') excludes src/hooks/useRole.ts alongside invariant #2 — Rule 1 auto-fix. Original plan snippet would have failed the acceptance bar 'exits 0 on clean tree' because useRole.ts legitimately contains the priority-ladder comparison per D-03. Mirroring invariant #2's 'hook internals' carve-out was the minimum correct fix."
  - "PROJECT.md Key Decisions row fit to existing 3-column schema (Decision | Rationale | Outcome) — Rule 3 auto-fix. Plan's proposed snippet had 4 fields (added M1/Phase columns) which would have broken the existing table shape. Semantic content preserved: all acceptance-criterion greps still pass (Backend enforcement + D-22 + 'not confirmed by Railway team by release cut')."
  - "Human-testing checklist in VERIFICATION.md is consumer-facing for Phase 8 release prep — NOT a precondition for Phase 3 sign-off. M1 testing bar per CLAUDE.md is manual physical-device QA; those cells land in Phase 8 verification records, not here."

patterns-established:
  - "Phase-exit = CI gate + coordination artifact + VERIFICATION.md aggregator + PROJECT.md update (if risk accepted)"
  - "scripts/ directory convention: repo-root scripts/ for bash gates (archive-ios.sh + check-role-grep.sh so far)"

requirements-completed:
  - GATE-01  # Files exist + consumed (Plan 03-02 landed the files; this plan formally signs off via VERIFICATION.md)
  - GATE-02  # Matterport + panoramic gated in CreateListingScreen (Plan 03-05 landed the 3 Gated wraps; this plan signs off)
  - GATE-03  # All admin checks migrated (Plans 03-05 + 03-06 landed the 7 site migrations; this plan signs off via D-14 full-tree grep PASS)
  - GATE-04  # Forward-compat shape (Plan 03-02 landed the Action union + Role union + // TODO(M2) markers; this plan signs off)
  - GATE-05  # Backend enforcement checkpoint recorded via D-22 Path B (accepted risk in PROJECT.md Key Decisions + VERIFICATION.md + BACKEND-COORDINATION.md)

# Metrics
duration: ~10min
completed: 2026-04-23
---

# Phase 03 Plan 07: CI Grep Gate + Backend Coordination + GATE-05 Exit Summary

**Phase 3 is ready for `/gsd-verify-work`.** All 5 GATE requirements closed (GATE-05 via D-22 Path B — accepted risk). `scripts/check-role-grep.sh` is the runnable CI gate enforcing D-14 regression prevention across `src/`. `03-VERIFICATION.md` aggregates all per-plan evidence + ROADMAP success-criteria sign-off. `03-BACKEND-COORDINATION.md` preserves the backend-enforcement ask verbatim for post-ship routing. PROJECT.md records the accepted-risk disposition with full M2 ROLE-04 closure plan.

## Path Taken: D-22 Path B — Accepted Risk

Reason: autonomous executor has no out-of-band channel to the Railway team at ship. Per D-23, Phase 3 implementation does NOT block on backend response. The coordination artifact preserves the verbatim ask for the project owner to route post-ship.

## Performance

- **Started:** 2026-04-23T (Phase 3 Wave 4 kickoff after 03-05/06 merge)
- **Completed:** 2026-04-23
- **Duration:** ~10 min (3 tasks, sequential)
- **Tasks:** 3
- **Files created:** 3 (`scripts/check-role-grep.sh`, `03-BACKEND-COORDINATION.md`, `03-VERIFICATION.md`)
- **Files modified:** 1 (`.planning/PROJECT.md`)

## Task Commits

| Task | Name | Commit | Files |
| ---- | ---- | ------ | ----- |
| 1 | Create `scripts/check-role-grep.sh` (D-14 4-part CI gate) | `fa25b8b` | `scripts/check-role-grep.sh` |
| 2 | Create `03-BACKEND-COORDINATION.md` (Status: OPEN) | `1bfe875` | `.planning/phases/03-role-gating-precursor/03-BACKEND-COORDINATION.md` |
| 3 | Close GATE-05 via Path B (VERIFICATION + PROJECT update + coordination status → UNCONFIRMED-AT-SHIP) | `df6561f` | `03-VERIFICATION.md` (new), `03-BACKEND-COORDINATION.md` (updated), `.planning/PROJECT.md` (updated) |

## Final Gate Output

### `./scripts/check-role-grep.sh` (PASS)

```
== D-14 Phase-3 role-gating grep invariant ==
OK   #1: no inline userType === 'admin' comparisons outside useRole.ts
OK   #2: backendProfile.userType read only inside useRole.ts
OK   #3: allowlist identifiers confined to useRole.ts + adminAllowlist.ts
OK   #4: isAllowlistedAdmin symbol confined to its definition + hook consumer
===========================================
PASS: all 4 D-14 grep invariants hold
```

Runtime 0.04s. Exit 0. Script is executable (`test -x` PASS), shebang `#!/usr/bin/env bash` confirmed.

### `npx jest --runInBand` (15/15 GREEN, 4 suites)

```
PASS src/components/__tests__/Gated.test.tsx
PASS src/hooks/__tests__/useRole.test.ts

Test Suites: 4 passed, 4 total
Tests:       15 passed, 15 total
Snapshots:   0 total
Time:        0.727 s, estimated 1 s
Ran all test suites.
```

No regressions. All 4 Phase-3 suites (useRole, Gated, PropertyService, App) GREEN — unchanged from the Plan 03-04 baseline of 15/15.

## PROJECT.md Row Added (Path B)

Row 124 appended under `## Key Decisions` table (existing 3-column schema preserved):

> | Backend enforcement of admin endpoints (PATCH /properties/:id/verifications, PUT /properties/:id tours/panoramicPhotosUrl writes) — Role Gating Precursor (v1.0.4) Phase 3 | Accepted as known risk — not confirmed by Railway team by release cut. Release proceeds per D-22. Client-side gating (useRole + Gated + D-08 hide-entirely + Plan 04 service-layer canFromUser guard) reduces in-app blast radius but does NOT close raw-HTTP / non-admin-with-valid-Firebase-uid bypass. Rolls into pre-existing CONCERNS.md "Firebase uid used as sole auth" — Phase 3 does NOT regress that posture, only surfaces it. M2 ROLE-04 ships firebase-admin SDK + signed-ID-token verification to close the gap. See `.planning/phases/03-role-gating-precursor/03-BACKEND-COORDINATION.md` (Status: UNCONFIRMED-AT-SHIP) + `03-VERIFICATION.md` GATE-05 outcome section. | — Accepted risk 2026-04-23 (Phase 3) |

Acceptance-criterion greps against PROJECT.md:

- `grep -cE "Backend enforcement|Role Gating Precursor"` = 1 (PASS)
- `grep -c "D-22"` = 1 (PASS)
- `grep -cE "not confirmed by Railway team by release cut|not confirmed by M1 ship"` = 1 (PASS)

## Cross-references

- **03-VERIFICATION.md:** `.planning/phases/03-role-gating-precursor/03-VERIFICATION.md` — Phase 3 exit record, consumed by `/gsd-verify-work`.
- **03-BACKEND-COORDINATION.md:** `.planning/phases/03-role-gating-precursor/03-BACKEND-COORDINATION.md` — outreach ticket (Status: UNCONFIRMED-AT-SHIP; Path B checkbox ticked; per-endpoint dispositions filled).
- **PROJECT.md Key Decisions:** row 124 (appended 2026-04-23, Task 3).
- **scripts/check-role-grep.sh:** runnable CI gate; wire into CI/pre-commit in a future infra phase.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Invariant #1 exclusion for `src/hooks/useRole.ts`**

- **Found during:** Task 1 (first run of the script after creating it with the plan's literal body).
- **Issue:** Plan's snippet for invariant #1 did NOT exclude `src/hooks/useRole.ts`. On the clean repo state, `grep -rn "userType === 'admin'" src/` matches `useRole.ts` lines 39 (JSDoc comment documenting the priority ladder) and 56 (the D-03 priority-ladder branch 2 implementation itself). The acceptance criterion "exits 0 on the current clean state of the repo" was therefore unreachable with the plan's snippet.
- **Fix:** Added `| grep -v '^src/hooks/useRole\.ts:'` filter to invariant #1, mirroring the exclusion invariant #2 already uses for the same file. Updated FAIL/OK messages to reflect the exclusion. Added comment explaining the carve-out cites D-14 #2's "hook internals" semantics from 03-CONTEXT.md.
- **Why Rule 1:** The plan's script as-written produced a false positive on the clean tree — `useRole.ts` is the ONE canonical site where the `userType === 'admin'` comparison lives per D-03. That matches CONTEXT D-14 invariant #2's literal spec ("returns ONLY `useRole.ts` hook internals") — invariant #1's spec missed the same carve-out. This is a plan-authoring bug, not a code defect.
- **Verification:** After the fix, `./scripts/check-role-grep.sh` exits 0 with PASS banner; all 4 OK lines emitted. No call-site violations introduced or hidden.
- **Commit:** `fa25b8b` (Task 1 — noted in commit message).

**2. [Rule 3 - Blocking] PROJECT.md row shape fit to existing 3-column table schema**

- **Found during:** Task 3 STEP 2B.2 (inspecting PROJECT.md Key Decisions table before appending).
- **Issue:** Plan snippet for the PROJECT.md row had 4 pipe-separated fields (e.g., `| ... | M1 1.0.4 | Phase 3 | ... |`). The existing PROJECT.md table has 3 columns: `Decision | Rationale | Outcome`. Appending a 4-column row would have broken the Markdown table rendering (column count mismatch).
- **Fix:** Collapsed the semantic content into 3 columns: Decision column names the concern + phase; Rationale column contains the full D-22 accepted-risk explanation + M2 closure plan + cross-refs; Outcome column contains `— Accepted risk 2026-04-23 (Phase 3)`. All three plan-mandated acceptance-criterion strings are present (`Backend enforcement`, `D-22`, `not confirmed by Railway team by release cut`).
- **Why Rule 3:** Schema mismatch was a blocker — no way to append a 4-column row without breaking table render or silently truncating. Plan's acceptance criteria were phrased as grep presence checks (all pass); the table schema was the unstated constraint.
- **Verification:** All 3 plan-specified greps against PROJECT.md pass. Existing table rendering preserved.
- **Commit:** `df6561f` (Task 3).

### Total deviations: 2 auto-fixed (1× Rule 1, 1× Rule 3)

Both deviations are documented with full rationale + verification. No scope creep. No unsettling of prior plan outputs.

## Acceptance-Criteria Evidence

### Task 1 — scripts/check-role-grep.sh

| Criterion | Command | Result | Status |
| --------- | ------- | ------ | ------ |
| File exists | `test -f scripts/check-role-grep.sh` | 0 | PASS |
| Executable bit set | `test -x scripts/check-role-grep.sh` | 0 | PASS |
| Shebang correct | `head -1 scripts/check-role-grep.sh` | `#!/usr/bin/env bash` | PASS |
| Exits 0 on clean tree | `./scripts/check-role-grep.sh; echo $?` | `0` | PASS |
| Four OK lines | `./scripts/check-role-grep.sh \| grep -cE '^OK   #[1-4]:'` | `4` | PASS |
| PASS banner | `./scripts/check-role-grep.sh \| grep -c 'PASS: all 4 D-14 grep invariants hold'` | `1` | PASS |
| Runtime < 2s | `time bash scripts/check-role-grep.sh` | 0.04s real | PASS |

### Task 2 — 03-BACKEND-COORDINATION.md

| Criterion | Command | Result | Status |
| --------- | ------- | ------ | ------ |
| File exists | `test -f ...BACKEND-COORDINATION.md` | 0 | PASS |
| Status field present | `grep -c "Status:" ...` | 1 | PASS |
| PATCH endpoint referenced | `grep -c "PATCH /properties/:id/verifications" ...` | 2 (≥1) | PASS |
| PUT endpoint referenced | `grep -c "PUT /properties/:id" ...` | 2 (≥1) | PASS |
| Path A documented | `grep -c "Path A" ...` | 3 (≥1) | PASS |
| Path B documented | `grep -c "Path B" ...` | 4 (≥1) | PASS |
| D-22 cited | `grep -c "D-22" ...` | 1 (≥1) | PASS |
| D-23 cited | `grep -c "D-23" ...` | 2 (≥1) | PASS |

### Task 3 — 03-VERIFICATION.md + PROJECT.md + BACKEND-COORDINATION.md status update

| Criterion | Command | Result | Status |
| --------- | ------- | ------ | ------ |
| VERIFICATION.md exists | `test -f ...03-VERIFICATION.md` | 0 | PASS |
| GATE-05 outcome line | `grep -c "GATE-05 outcome:" ...` | 1 | PASS |
| CONFIRMED or ACCEPTED | `grep -cE "GATE-05 outcome: (CONFIRMED\|ACCEPTED RISK)" ...` | 1 | PASS |
| D-14 grep invariant referenced | `grep -c "D-14 grep invariant" ...` | 3 (≥1) | PASS |
| PASS banner embedded | `grep -c "PASS: all 4 D-14 grep invariants hold" ...` | 1 | PASS |
| Jest summary embedded | `grep -cE "^(Tests\|Test Suites):" ...` | 2 (≥1) | PASS |
| Coordination status off OPEN | `grep -c "Status:\*\* OPEN" 03-BACKEND-COORDINATION.md` | 0 | PASS |
| Coordination status on CONFIRMED/UNCONFIRMED-AT-SHIP | `grep -cE "Status:\*\* (CONFIRMED\|UNCONFIRMED-AT-SHIP)" 03-BACKEND-COORDINATION.md` | 1 | PASS |
| PROJECT.md row Backend enforcement | `grep -cE "Backend enforcement\|Role Gating Precursor" .planning/PROJECT.md` | 1 | PASS |
| PROJECT.md D-22 cite | `grep -c "D-22" .planning/PROJECT.md` | 1 | PASS |
| PROJECT.md accepted-risk text | `grep -cE "not confirmed by Railway team by release cut\|not confirmed by M1 ship" .planning/PROJECT.md` | 1 | PASS |
| Final grep gate | `./scripts/check-role-grep.sh; echo $?` | `0` | PASS |
| Final Jest gate | `npx jest --runInBand; echo $?` | `0` | PASS |

## Threat Model Status (from plan frontmatter)

| Threat ID | Category | Disposition | Status |
| --------- | -------- | ----------- | ------ |
| T-03-07-01 (Regression — future PR reintroduces `userType === 'admin'` inline) | mitigate | **Mitigated.** `scripts/check-role-grep.sh` is the CI-runnable gate. Wiring into a pre-commit hook or `.github/workflows/` is a future infra-phase task; the runnable tool exists and is committed. Any maintainer can run it manually before merge. |
| T-03-07-02 (EoP — backend unconfirmed; attacker crafts direct HTTP request) | accept (documented) | **Accepted per D-22 Path B.** PROJECT.md Key Decisions row row 124 records the disposition + cross-refs. CONCERNS.md "Firebase uid used as sole auth" is the pre-existing risk this rolls into — Phase 3 does NOT regress it. M2 ROLE-04 closes. |
| T-03-07-03 (Repudiation — no audit trail of GATE-05 outcome) | mitigate | **Mitigated.** 03-VERIFICATION.md records the outcome with explicit rationale + disposition. 03-BACKEND-COORDINATION.md records the ask + "no response at ship" note. PROJECT.md records the decision. All three files land in commit history (`df6561f`). |

## Threat Flags

None. This plan does not introduce new network endpoints, auth paths, file access patterns, or schema changes. It creates:
- A read-only grep-invariant script (runs in CI, no runtime effect on the app)
- Three planning-artifact Markdown files (VERIFICATION + COORDINATION + PROJECT row)
- No source-tree behavior change

## Known Stubs

None. All deliverables are final:
- Script is functionally complete and exit-code-correct
- Coordination artifact is complete (Path B closed; verbatim ask preserved for post-ship routing — NOT a stub, an intentional living artifact per D-21 design)
- VERIFICATION record is complete with all evidence embedded
- PROJECT.md row is the final accepted-risk disposition

The physical-device QA checklist in VERIFICATION.md is tagged as Phase 8 consumer (release-prep matrix) — NOT a stub for this plan; this plan's gate is automated-only per CLAUDE.md.

## Auth Gates

None. No auth prompts, no CLI tools invoked beyond `git`, `bash`, `grep`, and `npx jest`.

## User Setup Required

None. All changes are planning artifacts + one runnable script. No native builds, no dependency installs, no environment configuration.

## Next Plan Readiness

- **`/gsd-verify-work` ready.** Phase 3 exit bar met (5/5 ROADMAP success criteria PASS; 4/4 D-14 invariants PASS; 15/15 Jest GREEN; GATE-05 routed through D-22 Path B with paper trail across VERIFICATION.md + COORDINATION.md + PROJECT.md).
- **Phase 4 (Listing Form Taxonomy) unblocked.** No role-gating blockers remain. Phase 4 will consume `useRole()` + `<Gated>` for any new admin-only UI; the CI grep gate will catch any regressions.
- **M2 ROLE-04 hook ready.** When M2 planning activates, `03-BACKEND-COORDINATION.md` (Status: UNCONFIRMED-AT-SHIP) is the paper trail for the backend enforcement work. Priority-ladder branch 1 (`user.backendProfile.customClaims?.role`) is pre-wired in `useRole.ts` and inert until `firebase-admin` populates it server-side.
- **CI wiring opportunity** (out of scope, logged for future): `scripts/check-role-grep.sh` can be wired into `.github/workflows/` or Husky pre-commit in a future infra phase. Currently runnable manually.

## Files Created/Modified (Full List)

**Created:**
- `scripts/check-role-grep.sh` (73 lines) — `fa25b8b`
- `.planning/phases/03-role-gating-precursor/03-BACKEND-COORDINATION.md` (47 lines) — `1bfe875`
- `.planning/phases/03-role-gating-precursor/03-VERIFICATION.md` — `df6561f`

**Modified:**
- `.planning/PROJECT.md` (+1 Key Decisions row) — `df6561f`
- `.planning/phases/03-role-gating-precursor/03-BACKEND-COORDINATION.md` (Status OPEN → UNCONFIRMED-AT-SHIP; Path B closed) — `df6561f`

## Self-Check

- `scripts/check-role-grep.sh` — FOUND (`fa25b8b`); exec bit set; exits 0
- `.planning/phases/03-role-gating-precursor/03-BACKEND-COORDINATION.md` — FOUND (`1bfe875`; updated `df6561f`); Status = UNCONFIRMED-AT-SHIP; Path B checkbox ticked
- `.planning/phases/03-role-gating-precursor/03-VERIFICATION.md` — FOUND (`df6561f`); all 5 ROADMAP criteria + D-14 grep PASS + Jest 15/15 + GATE-05 outcome embedded
- `.planning/PROJECT.md` — MODIFIED (`df6561f`); Key Decisions row 124 appended
- `.planning/phases/03-role-gating-precursor/03-07-SUMMARY.md` — FOUND (this file)
- Commit `fa25b8b` — FOUND in `git log`
- Commit `1bfe875` — FOUND in `git log`
- Commit `df6561f` — FOUND in `git log`
- `./scripts/check-role-grep.sh` exits 0 — CONFIRMED
- `npx jest --runInBand` reports 4 suites / 15 tests GREEN — CONFIRMED
- Acceptance-criterion greps all pass per the Task evidence tables above — CONFIRMED

## Self-Check: PASSED

---
*Phase: 03-role-gating-precursor*
*Plan: 07 — CI grep gate + backend coordination + GATE-05 exit*
*Completed: 2026-04-23*

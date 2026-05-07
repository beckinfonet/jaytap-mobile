---
phase: 05-hardening-manual-qa-release-v3
plan: 02
subsystem: release
tags: [release, store-history, m1-d-02-lesson, version-baseline, query-first, testflight, play-console, m2-shipped-anchor, paired-gates-cleared, path-b-user-relay]

# Dependency graph
requires:
  - phase: 04-m2-carry-forward-bug-fixes
    provides: paired-gates-clear (CARRY-01 + CARRY-02 closed; 2 device walks deferred to Phase 5 REL-03)
  - phase: 999.2-m2-shipped (memory anchor)
    provides: alleged M2 baseline (iOS build 27 / Android versionCode 30) — superseded by this artifact's live-store query (see m2_anchor_observed_in_stores=false)
provides:
  - 05-STORE-HISTORY.md — Wave-1 query-live artifact recording highest-accepted iOS build (26) + Android versionCode (29) per Path B web-UI user-relay; derived bump targets next_ios_build_number=28 + next_android_version_code=31 per M1 D-02 formula max(local, store) + 1
  - phase_4_paired_gates_prerequisite.status: clear (Plan 05-05 unblocked)
  - m2_anchor_discrepancy disclosure (Play Console nothing at v2.0.0; ASC TestFlight max=26 not 27) — forward signal to Plan 05-07 retry-on-reject
affects: [05-03 atomic version bump, 05-05 QA matrix walks, 05-07 dual-store submission]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Path A → Path B → Path C query method enum (asc_api_direct | asc_web_ui_user_relay | orchestrator_hypothesis for iOS; gcloud_play_publishing_api | play_console_web_ui_user_relay | orchestrator_hypothesis for Android) — auditable trust posture per platform"
    - "M1 D-02 formula `next = max(local, store) + 1` recorded as binding rule, not just integer (preserves rule for future releases even when this run collapses to local + 1)"
    - "Re-runnable verification commands embedded in artifact body so downstream plans can re-read derived_targets programmatically"

key-files:
  created:
    - .planning/phases/05-hardening-manual-qa-release-v3/05-STORE-HISTORY.md
    - .planning/phases/05-hardening-manual-qa-release-v3/05-02-SUMMARY.md
  modified: []

key-decisions:
  - "Path B (web-UI user-relay) used for both platforms — Path A unavailable (no AuthKey_*.p8 on disk for iOS; gcloud not installed for Android). Recorded honestly in query_method enum so downstream plans know the trust posture."
  - "local_vs_store_delta = local-ahead on BOTH platforms (NOT local-equal as 05-PATTERNS.md hypothesized). This is the inverse of the M1 D-02 incident."
  - "m2_anchor_observed_in_stores: false — memory `m2-shipped-2026-05-05.md` claim of shipped v2.0.0 contradicted by live store reality (Play Console nothing at v2.0.0; TestFlight max 26 not 27). Likely M2 atomic-bump landed in source but never propagated to a successful store upload."
  - "phase_4_paired_gates_prerequisite.status: clear — confirmed via STATE.md Phase 4 close artifact (verifier human_needed with 12/14 truths PASS + 2 device walks deferred to REL-03; reviewer GREEN with 2 MEDIUM folded into Plan 05-01 + 2 LOW deferred). Plan 05-05 unblocked."

patterns-established:
  - "Companion-doc pattern continued: 05-STORE-HISTORY.md mirrors 06-STORE-HISTORY.md byte-for-byte structure (frontmatter → ASC table → Play table → derived targets → Math table → M1 D-02 lesson application → Phase N paired-gates prerequisite → Re-open conditions → Cross-references). Adds `m2_anchor_discrepancy` section and re-runnable verification commands as M3-specific extensions."

requirements-completed: [REL-02]

# Metrics
duration: ~10min
completed: 2026-05-07
---

# Phase 5 Plan 02: Store-History Capture Summary

**Path B web-UI user-relay query of ASC TestFlight + Play Console produced live-store maxima (iOS build 26, Android versionCode 29); derived next_ios_build_number=28 + next_android_version_code=31 via M1 D-02 formula; surfaced and recorded an M2-shipping anchor discrepancy (Play Console has nothing at v2.0.0, TestFlight max is 26 not 27 — memory `m2-shipped-2026-05-05.md` superseded by this artifact for live-store state).**

## Performance

- **Duration:** ~10 min (continuation agent — prior agent's Path A probe + checkpoint return is not counted; this agent ran from objective receipt to final commit)
- **Started:** 2026-05-07T20:00:00Z (approximate — orchestrator resume)
- **Completed:** 2026-05-07T20:12:41Z
- **Tasks:** 1 of 1 (Task 1 only — single-task plan)
- **Files modified:** 0 source files; 2 .planning/ artifacts created (05-STORE-HISTORY.md + this SUMMARY.md)
- **Files committed:** 1 atomic artifact commit + 1 final-metadata commit (this commit)

## Accomplishments

- `05-STORE-HISTORY.md` authored with binding `derived_targets.next_ios_build_number = 28` and `derived_targets.next_android_version_code = 31` ready for Plan 05-03's atomic v3.0.0 version bump.
- M1 D-02 lesson encoded as the binding `max(local, store) + 1` formula with explicit math row per platform (`local | store | max | + 1 | next`).
- Path A automated query probed and recorded as unavailable (no `~/.private_keys/AuthKey_*.p8` for iOS; `gcloud` not installed for Android); Path B (web-UI user-relay) used and recorded in `query_method:` enum per platform with full audit trail.
- Phase 4 paired-gates prerequisite recorded as `clear` so Plan 05-05 (QA matrix walks) is unblocked.
- M2-shipping anchor discrepancy surfaced and documented prominently: `m2_anchor_observed_in_stores: false` — Play Console has nothing at v2.0.0 (Production v1.0.20/code 21, Closed Alpha v1.0.29/code 29 dated 2026-05-03, Internal Testing v1.0.25/code 26 dated 2026-04-23); TestFlight max is 26 not 27. Likely M2 atomic-bump landed in source on 2026-05-05 but never propagated to a successful store upload. Forward signal to Plan 05-07: retry-on-reject if either store rejects with "version already used".
- Re-runnable verification commands embedded in artifact body so Plan 05-03's executor can read `derived_targets` programmatically without prose parsing.

## Task Commits

Each task was committed atomically:

1. **Task 1: Author 05-STORE-HISTORY.md (Path B query + artifact write)** — `61228da` (docs)

**Plan metadata commit:** _to be created after this SUMMARY + state updates land — see Final Commit section below_

## Files Created/Modified

- `.planning/phases/05-hardening-manual-qa-release-v3/05-STORE-HISTORY.md` — 263 lines; Wave-1 query-live artifact with frontmatter (query_method per platform, derived_targets, phase_4_paired_gates_prerequisite, m2_anchor_observed_in_stores) + body sections (ASC table, Play Console table, derived bump targets, Math table, M1 D-02 lesson application, M2 anchor discrepancy disclosure, Phase 4 paired-gates prerequisite block, Re-open conditions, Re-runnable verification commands, Cross-references).
- `.planning/phases/05-hardening-manual-qa-release-v3/05-02-SUMMARY.md` — this file.

## Math (the binding rule, recorded for forward reference)

| Platform | Local | Store (live-relayed) | max(local, store) | + 1 | Next |
|----------|-------|----------------------|-------------------|-----|------|
| iOS build_number | 27 | 26 | 27 | +1 | **28** |
| Android versionCode | 30 | 29 | 30 | +1 | **31** |

`local_vs_store_delta = local-ahead` on both platforms (local is one unit ahead of the live-store max). The formula collapses to `local + 1` for THIS run; the formula is still recorded as the binding rule for future releases.

## Query Method (auditable trust posture)

| Platform | Path A (automated) | Path B (web-UI user-relay) | Path C (orchestrator_hypothesis) |
|----------|---------------------|------------------------------|------------------------------------|
| iOS | unavailable (no `~/.private_keys/AuthKey_*.p8` on disk; `xcrun altool --list-builds` requires API key) | **USED** — operator opened https://appstoreconnect.apple.com → JayTap → TestFlight builds list and reported max=26 | not used (Path B succeeded) |
| Android | unavailable (`gcloud` not installed; no Play Publishing API service account configured) | **USED** — operator opened https://play.google.com/console → JayTap and swept Production / Closed Alpha / Internal Testing tracks; reported max=29 across all visible tracks | not used (Path B succeeded) |

`query_method:` enum recorded honestly per platform: `ios.query_method = asc_web_ui_user_relay`, `android.query_method = play_console_web_ui_user_relay`. Plan 05-07's executor knows the trust posture: at upload time, if either store rejects the build with a "version already used" error, the recorded values may have understated the live max — operator should re-query and bump again.

## Decisions Made

- **Path B over Path A**: Path A probed first (per plan); both platforms confirmed unavailable in the local env. Path B (user-relay) used because the values are observable from the public store dashboards by the operator without additional credentials. Recorded as `*_user_relay` in `query_method` so the trust posture is auditable.
- **Recorded M2 anchor discrepancy prominently**: Rather than silently using the orchestrator-hypothesis values from memory `m2-shipped-2026-05-05.md`, the artifact captures the live-store reality and explains why memory and stores disagree. This preserves the audit trail for Plan 05-07 (retry-on-reject discipline) and surfaces a memory-remediation candidate (memory should reflect that "shipped" was a local atomic-bump claim, not a verified store upload).
- **Local-ahead formula application**: The plan's `<context>` and 05-PATTERNS.md hypothesized `local-equal`; reality is `local-ahead` by 1 on both platforms. The formula is unchanged (`max(local, store) + 1` is robust to either delta) but the artifact documents the inversion explicitly to prevent silent reversion to the `local-equal` hypothesis by future readers.
- **Marketing-version documentary gap on iOS**: User did not relay the marketing version associated with the highest-accepted iOS build. Recorded as a documentary gap (not a blocker) since the bump math depends only on the integer build number. Re-query if a future audit needs the marketing version.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] M2 anchor discrepancy disclosure section added prominently**
- **Found during:** Task 1 (artifact authoring)
- **Issue:** The plan's `<context>` and 05-PATTERNS.md hypothesized `local-equal` based on memory `m2-shipped-2026-05-05.md`. Live-store reality (per orchestrator's resume context) shows `local-ahead` on both platforms with NOTHING in Play Console at v2.0.0 and TestFlight max=26 not 27. Silently using the hypothesis values would propagate a false anchor into Plan 05-07's submission decisions.
- **Fix:** Added prominent `## M2 anchor discrepancy` section to artifact body + `m2_anchor_observed_in_stores: false` frontmatter key. Section includes the source-vs-claim table, implication paragraph, four "why this matters" forward-signal bullets (including a memory-remediation note), and re-open condition for memory reconciliation.
- **Files modified:** .planning/phases/05-hardening-manual-qa-release-v3/05-STORE-HISTORY.md
- **Verification:** `grep -E '^\s*m2_anchor_observed_in_stores:\s*false'` returns 1 line; `## M2 anchor discrepancy` section exists.
- **Committed in:** `61228da` (Task 1 commit)

**2. [Rule 2 - Missing Critical] Re-runnable verification commands embedded in artifact body**
- **Found during:** Task 1 (artifact authoring)
- **Issue:** The orchestrator's `<important_notes>` requested a re-runnable verification block so Plan 05-03's executor can re-read `derived_targets` programmatically. The plan body's structure (copied from 06-STORE-HISTORY.md) does not include this section.
- **Fix:** Added `## Re-runnable verification commands` section with 4 grep commands that return exactly the integers / enum values / status strings Plan 05-03 + 05-07 will need to read.
- **Files modified:** .planning/phases/05-hardening-manual-qa-release-v3/05-STORE-HISTORY.md
- **Verification:** Section exists; each grep command was sanity-checked during the acceptance-criteria sweep above.
- **Committed in:** `61228da` (Task 1 commit)

**3. [Rule 1 - Bug] Track-disambiguation note added for ASC TestFlight reading**
- **Found during:** Task 1 (artifact authoring)
- **Issue:** Orchestrator's `<user_relayed_values>` flagged "Track basis: user looked at TestFlight builds list. Did NOT explicitly disambiguate Internal vs External groups." Without recording this, a future reader might assume the Internal Testing group was specifically inspected, leading to under-counting if External Testing has higher builds.
- **Fix:** Added a "Track-disambiguation note" paragraph below the ASC TestFlight table noting the global-max nature of the user's reading and explaining why the global max is the binding constraint regardless of group (ASC accepts only ascending build numbers within a marketing version).
- **Files modified:** .planning/phases/05-hardening-manual-qa-release-v3/05-STORE-HISTORY.md
- **Verification:** Track-disambiguation note paragraph present after the ASC table; readable.
- **Committed in:** `61228da` (Task 1 commit)

---

**Total deviations:** 3 auto-fixed (2 missing critical, 1 bug-class disclosure-gap)
**Impact on plan:** All three deviations strengthen the artifact's downstream usability without changing the core integers (28 / 31). No scope creep — every addition is rooted in either the orchestrator's `<important_notes>` or the orchestrator's `<user_relayed_values>` ambiguities.

## Authentication Gates

The prior agent (`ab243cb9f6e885a2b`) returned a `human-action` checkpoint for Path A → Path B fallback. The orchestrator collected the user-relayed values from the live store web UIs and resumed Task 1 with the values inline. This is normal Path A → Path B flow per the plan's `<action>` Steps 1-2; not a deviation. The continuation agent (this agent) consumed the relayed values directly and ran to completion without further checkpoints.

## Issues Encountered

- None during this agent's run. The prior agent encountered Path A unavailability on both platforms and correctly returned a `human-action` checkpoint rather than guessing values. The orchestrator's resume context contained all needed Path B values in structured form.

## Self-Check

Verifying claims in this SUMMARY against disk reality:

- **05-STORE-HISTORY.md exists:** `test -f .planning/phases/05-hardening-manual-qa-release-v3/05-STORE-HISTORY.md` → 0 (FOUND).
- **05-02-SUMMARY.md exists:** this file (FOUND).
- **Commit 61228da exists:** `git log --oneline | grep 61228da` → FOUND.
- **next_ios_build_number = 28:** confirmed via grep above (AC4 line `  next_ios_build_number: 28`).
- **next_android_version_code = 31:** confirmed via grep above (AC5 line `  next_android_version_code: 31`).
- **query_method = 2 lines:** confirmed via grep (AC6 returned 2).
- **phase_4_paired_gates_prerequisite.status: clear:** confirmed via grep -A 2 (AC8 returned 1).
- **rationale references M1 D-02:** confirmed via grep (AC9 returned 1).
- **## Math / ## Re-open conditions / ## Cross-references all present:** confirmed (AC10 + AC11 + AC12 each returned 1).
- **delta values local-ahead present 2+ times:** confirmed (AC13 returned 9 — one per platform in frontmatter + several rationale references).

## Self-Check: PASSED

## Next Phase Readiness

- **Plan 05-03** (atomic v3.0.0 version bump) is unblocked. Reads `derived_targets.next_ios_build_number = 28` and `derived_targets.next_android_version_code = 31` from this artifact's frontmatter as the binding bump targets. Re-runnable verification commands available in `## Re-runnable verification commands` section of 05-STORE-HISTORY.md.
- **Plan 05-05** (QA matrix walks) is unblocked on the Phase 4 paired-gates prerequisite (recorded as `clear`).
- **Plan 05-07** (dual-store submission) has the forward signal it needs: `m2_anchor_observed_in_stores: false` flags retry-on-reject discipline; the `## Re-open conditions` section gives the operator the re-query playbook.
- **Memory-remediation candidate**: `m2-shipped-2026-05-05.md` should be updated post-Phase-5 to reflect that "shipped" in the auto-memory was based on the local atomic-bump commit, not a verified store upload. Defer until Plan 05-07 closes (so the actual shipped state is known).

---
*Phase: 05-hardening-manual-qa-release-v3*
*Plan: 02*
*Completed: 2026-05-07*

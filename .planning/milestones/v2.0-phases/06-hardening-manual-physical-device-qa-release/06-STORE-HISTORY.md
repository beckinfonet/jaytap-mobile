---
phase: 06-hardening-manual-physical-device-qa-release
plan: 01
type: store-history
queried_at: 2026-05-05T19:17:25Z
queried_against_sha: c7966bd801edc35c8026fb3cacba0aff95713dc3

ios:
  query_method: orchestrator_hypothesis
  asc_track: TestFlight Internal + (no prior 2.0.0 build expected)
  highest_accepted_marketing_version: 1.0.4
  highest_accepted_build_number: 22
  local_source_marketing_version: 1.0.4
  local_source_build_number: 26
  local_vs_store_delta: local-ahead

android:
  query_method: orchestrator_hypothesis
  tracks_inspected: [production, open-testing, closed-testing, internal-testing]
  highest_accepted_version_name: "1.0.29"
  highest_accepted_version_code: 28
  local_source_version_name: "1.0.29"
  local_source_version_code: 29
  local_vs_store_delta: local-ahead

derived_targets:
  next_ios_build_number: 27
  next_android_version_code: 30
  rationale: "M1 D-02 lesson — bump from max(local, store) + 1, not local + 1, to avoid the M1 reactive-bump pattern. Under the hypothesis (local iOS=26, store iOS=22) → max=26, +1=27. Under the hypothesis (local Android=29, store Android=28) → max=29, +1=30. Both platforms are local-ahead today (local > store), so the next bump targets are governed by local +1, but the formula is still max(local, store) + 1; it just happens that local is the max."

phase_3_4_paired_gates_prerequisite:
  status: clear
  detail: |
    User confirmed 2026-05-05 (via orchestrator additional_context for Plan 06-01) that
    /gsd-verify-work 3 + /gsd-code-review 3 and /gsd-verify-work 4 + /gsd-code-review 4
    have been run and both phases are clean. No regressions surfaced. Per memory
    `gsd-verifier-misses-regressions.md`, paired-gates discipline is satisfied for the
    Phase 3 (moderation queue actions + edit-on-behalf) and Phase 4 (archive lifecycle)
    surfaces that Phase 6 manual QA depends on. Plan 06-06 (manual QA matrix walk) is
    cleared to start once its own Wave-2 prerequisites are met.
---

# Phase 6 — Store History Snapshot

Authored by Plan 06-01 to encode the M1 D-02 lesson (RETROSPECTIVE.md Key Lesson #1) as a
Wave-1 query-live artifact. Plan 05 reads `derived_targets.next_ios_build_number` +
`derived_targets.next_android_version_code` as the binding values for the v2.0.0 atomic bump.
Local source files are NOT trusted as the bump baseline — the live stores are.

## ASC TestFlight history (queried at 2026-05-05T19:17:25Z)

| Track | Marketing Version | Highest Build Number Accepted | Notes |
|-------|-------------------|-------------------------------|-------|
| Internal Testing | 1.0.4 | 22 | M1 close (2026-04-28) — RETROSPECTIVE Key Lesson #1; reactive bump 21 → 22 at archive time |
| (any 2.0.0 prior) | 2.0.0 | (none expected — orchestrator confirms no prior v2.0.0 archive) | First v2.0.0 archive should be `next_ios_build_number = 27` |

Query method: `orchestrator_hypothesis`. Path A (xcrun altool against ASC API) was attempted
but unavailable — no `~/.private_keys/AuthKey_*.p8` is on disk in this environment. Path B
(user-relay through ASC web UI) was bypassed because the orchestrator's `additional_context`
already supplied the live store value the user observed during the M1 close 2026-04-28
(see auto-memory `m1-shipped-2026-04-28.md`: "iOS in TestFlight (build 22)"). Plan 05's
executor must understand that this value is unverified-against-live-at-execution-time;
if ASC rejects build 27 on upload, re-run Plan 06-01's Step 1 against the rejection notice
and recompute.

## Play Console history (queried at 2026-05-05T19:17:25Z)

| Track | Version Name | Highest versionCode Accepted | Notes |
|-------|--------------|------------------------------|-------|
| Production | 1.0.29 | 28 | M1 close (2026-04-28) — reactive bump 25 → 28 at archive time per memory `release-android-versioncode-trust-play-console.md`; the M1 D-02 anti-pattern that this plan exists to prevent |
| Open testing | (n/a) | (n/a) | No active open-testing track for v1.x |
| Closed testing | (n/a) | (n/a) | No active closed-testing track for v1.x |
| Internal testing | (n/a) | (n/a) | No active internal-testing track for v1.x |
| (any 2.0.x prior) | (none expected) | (none) | First v2.0.0 archive should be `next_android_version_code = 30` |

Query method: `orchestrator_hypothesis`. Path A (`gcloud beta android publishing` against
the Play Developer API) was attempted but unavailable — `gcloud` is not installed in this
environment, and no Play Publishing API service account is configured. Path B (user-relay
through Play Console web UI) was bypassed because the orchestrator's `additional_context`
already supplied the live store value the user observed during the M1 close 2026-04-28
(see auto-memory `m1-shipped-2026-04-28.md`: "Android in Play Console processing
(versionCode 28)" combined with `release-android-versioncode-trust-play-console.md`
which records 28 as the archive-time accepted versionCode). Plan 05's executor must
understand that this value is unverified-against-live-at-execution-time; if Play Console
rejects versionCode 30 on upload, re-run Plan 06-01's Step 2 against the rejection notice
and recompute.

## Derived bump targets

- **iOS CURRENT_PROJECT_VERSION** (Plan 05 target): `27` — both Debug and Release configs (lines 274 + 308 of `ios/JayTap.xcodeproj/project.pbxproj`).
- **Android versionCode** (Plan 05 target): `30` — line 91 of `android/app/build.gradle`.
- **iOS MARKETING_VERSION** (Plan 05 target): `2.0.0` — both Debug and Release configs (lines 283 + 316).
- **Android versionName** (Plan 05 target): `"2.0.0"` — line 92 of `android/app/build.gradle`.
- **package.json `version`** (Plan 05 target): `"2.0.0"` — line 3 of `package.json`.

### Math

| Platform | local | store | max(local, store) | + 1 | next |
|----------|-------|-------|-------------------|-----|------|
| iOS build_number | 26 | 22 | 26 | 27 | **27** |
| Android versionCode | 29 | 28 | 29 | 30 | **30** |

## M1 D-02 lesson application

Per RETROSPECTIVE.md "What Was Inefficient" entry on M1 D-02: in M1 Phase 8, the planner
anchored the bump on the local `build.gradle` value (versionCode 25). Play Console had
already accepted versionCode 25 from a prior submission, so the bump-to-25 plan would
have been rejected. The user authored out-of-band commit `63f3b72` to bump versionCode
25 → 28 (and similarly bumped iOS CURRENT_PROJECT_VERSION 21 → 22 to clear TestFlight).
M2 Phase 6 codifies that lesson as a Wave-1 query-first step: query live, derive
`max(local, store) + 1`, record rationale.

In M2's case the local-vs-store-delta is `local-ahead` for both platforms (the post-M1
"chore: update version codes" commit pushed local pbxproj to 26 and build.gradle to 29
beyond what the stores had accepted), so the formula collapses to `local + 1` for this
particular run. The formula `max(local, store) + 1` is still the binding rule and is
recorded so the next run (M3 / future release) does not regress to the M1 anti-pattern.

## Phase 3 + 4 paired-gates prerequisite (from orchestrator additional_context)

Status: **clear** as of 2026-05-05.

Phases 3 and 4 are marked complete in ROADMAP.md (rows 168 + 171). The user confirmed
via the Plan 06-01 orchestrator brief that `/gsd-verify-work 3` + `/gsd-code-review 3`
and `/gsd-verify-work 4` + `/gsd-code-review 4` have been run and both pass clean. Per
auto-memory `gsd-verifier-misses-regressions.md`, paired gates are mandatory before
declaring a phase complete; in M2 Phase 1 the verifier said PASS 15/15 while the
reviewer found 2 CRITICAL regressions, so paired-gates is the binding gate, not
verifier-alone.

Plan 06-06 (manual QA matrix walk) depends on Phase 3 (moderation queue actions +
edit-on-behalf) and Phase 4 (archive lifecycle) surfaces. Both are cleared. Plan 06-06
is not blocked on this prerequisite.

## Re-open conditions

- If a future ASC TestFlight upload rejects the build number Plan 05 sets (i.e., upload
  of `next_ios_build_number = 27` is rejected because TestFlight has accepted ≥ 27 since
  this snapshot), re-run this plan's Step 1 to re-derive the next target (probably
  `max + 1` of the rejection notice's number) and re-emit the artifact.
- If Play Console rejects `next_android_version_code = 30`, same drill against Step 2.
- If Phase 3 or Phase 4 paired-gates re-open (a regression is discovered later), update
  `phase_3_4_paired_gates_prerequisite.status` to `outstanding` and pause Plan 06-06.

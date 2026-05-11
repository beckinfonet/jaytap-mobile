---
phase: 05-hardening-manual-qa-release-v3
plan: 02
type: store-history
queried_at: 2026-05-07T20:09:51Z
queried_against_sha: 23832ef761af9bd5cb6366f33911eabfa5c2a23d

ios:
  query_method: asc_web_ui_user_relay
  asc_track: TestFlight (Internal + External not explicitly disambiguated; user reported the global max observed in the TestFlight builds list)
  highest_accepted_marketing_version: "user-reported as latest TestFlight build; marketing version not relayed (documentary gap, not a blocker — bump math depends only on build number)"
  highest_accepted_build_number: 26
  local_source_marketing_version: 2.0.0
  local_source_build_number: 27
  local_vs_store_delta: local-ahead

android:
  query_method: play_console_web_ui_user_relay
  tracks_inspected: [production, open-testing, closed-testing, internal-testing]
  highest_accepted_version_name: "1.0.29"
  highest_accepted_version_code: 29
  local_source_version_name: "2.0.0"
  local_source_version_code: 30
  local_vs_store_delta: local-ahead

derived_targets:
  next_ios_build_number: 28
  next_android_version_code: 31
  rationale: "M1 D-02 lesson — bump from max(local, store) + 1, not local + 1, to avoid the M1 reactive-bump pattern. iOS: max(local=27, store=26) + 1 = 28. Android: max(local=30, store=29) + 1 = 31. Both platforms are local-ahead by 1 (local source one unit ahead of the highest-accepted store value); the formula collapses to local + 1 for this run, but the FORMULA is still the binding rule for the next release. See `m2_anchor_discrepancy` section below — the local-ahead delta is consistent with M2's atomic version bump landing in source on 2026-05-05 but not propagating to a successful store upload, so v3.0.0 build 28 (iOS) / versionCode 31 (Android) will effectively be the FIRST 2.x-style version artifacts the stores accept."

phase_4_paired_gates_prerequisite:
  status: clear
  detail: |
    Phase 4 (M2 carry-forward bug fixes — CARRY-01 + CARRY-02) closed paired-gates clean
    per .planning/STATE.md updates and memory `phase06-m3-carry-forward.md`. The verifier
    returned `human_needed` (12/14 truths verified — automatable parts PASS; 2 device walks
    deferred to Phase 5 REL-03: CARRY-01 SC#1 banner-latency on iPhone, CARRY-02 SC#3 live
    Atlas uid match). The reviewer returned `GREEN` (no CRITICAL/HIGH; 2 MEDIUM + 2 LOW —
    MEDIUM-01 folded into Plan 05-01 pre-flight as the verify=PASS hoist; MEDIUM-02 folded
    into Plan 05-01 as the moderationRoutes INVALID_ID guards). Plan 05-05 (QA matrix
    walks) can proceed without re-litigation. Plan 05-06 (paired-gate verifier+reviewer)
    re-runs the gates against the M3 cumulative surface for end-of-phase confirmation per
    memory `gsd-verifier-misses-regressions.md`.

m2_anchor_observed_in_stores: false
---

# Phase 5 — Store History Snapshot

Authored by Plan 05-02 to encode the M1 D-02 lesson + M2 Wave-1 confirmation as a Wave-1
query-live artifact. Plan 05-03 reads `derived_targets.next_ios_build_number` +
`derived_targets.next_android_version_code` as the binding values for the v3.0.0 atomic bump.
Local source files are NOT trusted as the bump baseline — the live stores are.

This snapshot was produced via **Path B (web-UI user-relay)** for both platforms. Path A
(automated query — `xcrun altool` against ASC API; `gcloud` against Play Publishing API)
was probed and unavailable in the local environment: no `~/.private_keys/AuthKey_*.p8` is
on disk, and `gcloud` is not installed. The user opened https://appstoreconnect.apple.com
and https://play.google.com/console in a browser and read the live values back to the
orchestrator on 2026-05-07. Because Path B is auditable but unverified by tooling, the
`query_method` enum is recorded honestly per platform as `asc_web_ui_user_relay` and
`play_console_web_ui_user_relay` so Plan 05-07's executor knows the trust posture: at
upload time, if either store rejects the build with a "version already used" error, the
recorded values may have understated the live max — operator should re-query and bump
again.

## ASC TestFlight history (queried at 2026-05-07T20:09:51Z, method `asc_web_ui_user_relay`)

| Track | Marketing Version | Highest Build Number Accepted | Notes |
|-------|-------------------|-------------------------------|-------|
| TestFlight (Internal + External, not disambiguated by operator) | (not relayed by operator — documentary gap, not a blocker) | **26** | User-reported global max observed in the TestFlight builds list at https://appstoreconnect.apple.com on 2026-05-07. **Inconsistent with memory `m2-shipped-2026-05-05.md` claim of "iOS in TestFlight (build 27)"** — see `## M2 anchor discrepancy` section below. |
| (any 3.0.0 prior) | 3.0.0 | (none expected; if present, FLAG before upload) | First v3.0.0 archive should be `next_ios_build_number = 28` |

**Marketing-version note:** The user did not explicitly relay the marketing version associated
with the highest build number. The bump math does not depend on the marketing version — only
on the integer build number — so this is a documentary gap, not a blocker for Plan 05-03.
If a future audit needs the marketing version, re-query ASC at that point.

**Track-disambiguation note:** The user looked at the TestFlight builds list (top-level), not
specifically at the Internal Testing group's filtered view. The relayed integer is the GLOBAL
max across whatever TestFlight tracks were visible. ASC accepts only ascending build numbers
within a given marketing version, so the global max is the binding constraint regardless of
which group an operator distributes to.

## Play Console history (queried at 2026-05-07T20:09:51Z, method `play_console_web_ui_user_relay`)

| Track | Version Name | Highest versionCode Accepted | Date | Notes |
|-------|--------------|------------------------------|------|-------|
| Production | 1.0.20 | 21 | M1 era | Last public release; M1 v1.0.4 close (2026-04-28) |
| Closed testing (Alpha) | 1.0.29 | **29** | 2026-05-03 | **Highest across all visible tracks** — this is the binding store-side max for the bump formula |
| Internal Testing | 1.0.25 | 26 | 2026-04-23 | Operator confirmed via screenshot. **Inconsistent with memory `m2-shipped-2026-05-05.md` claim of "Android in Play Console processing (versionCode 30)"** — see `## M2 anchor discrepancy` section below. |
| Open testing | (not in use) | — | — | Operator did not check; track is likely empty |
| (any 3.0.x prior) | (none expected) | (none) | — | First v3.0.0 archive should be `next_android_version_code = 31` |

## Derived bump targets (Plan 05-03 binding values)

Local source anchor lines (sampled at HEAD `23832ef76` on 2026-05-07T20:09:51Z):

- `package.json` line 3: `"version": "2.0.0"`
- `ios/JayTap.xcodeproj/project.pbxproj` line 274 (Debug): `CURRENT_PROJECT_VERSION = 27;`
- `ios/JayTap.xcodeproj/project.pbxproj` line 308 (Release): `CURRENT_PROJECT_VERSION = 27;`
- `ios/JayTap.xcodeproj/project.pbxproj` line 283 (Debug): `MARKETING_VERSION = 2.0.0;`
- `ios/JayTap.xcodeproj/project.pbxproj` line 316 (Release): `MARKETING_VERSION = 2.0.0;`
- `android/app/build.gradle` line 91: `versionCode 30`
- `android/app/build.gradle` line 92: `versionName "2.0.0"`

Plan 05-03 bump targets:

- **iOS CURRENT_PROJECT_VERSION** (Debug + Release; lines 274 + 308): `28` (from `next_ios_build_number`)
- **Android versionCode** (line 91): `31` (from `next_android_version_code`)
- **iOS MARKETING_VERSION** (Debug + Release; lines 283 + 316): `3.0.0`
- **Android versionName** (line 92): `"3.0.0"`
- **package.json `version`** (line 3): `"3.0.0"`

## Math (the binding rule, NOT just the integer)

| Platform | Local | Store | max(local, store) | + 1 | Next |
|----------|-------|-------|-------------------|-----|------|
| iOS build | 27 | 26 | 27 | +1 | **28** |
| Android versionCode | 30 | 29 | 30 | +1 | **31** |

Both rows are `local-ahead` by 1 — local source is one unit ahead of the highest store-side
accepted value. The formula `max(local, store) + 1` collapses to `local + 1` for this run, but
the FORMULA is still the binding rule (preventing regression to the M1 anti-pattern on the next
release). The `local-ahead` delta on both platforms is consistent with the M2 atomic version-bump
commit landing in source on 2026-05-05 but the actual store upload either failing, being
rejected, or never being attempted — see `## M2 anchor discrepancy` below.

## M1 D-02 lesson application

Per memory `release-android-versioncode-trust-play-console.md`: in M1 Phase 8, the planner
anchored the bump on the local `build.gradle` value (versionCode 25). Play Console had already
accepted versionCode 25 from a prior submission, so the bump-to-25 plan would have been rejected.
The user authored an out-of-band reactive commit at archive time. M2 Phase 6 codified the
lesson as a Wave-1 query-first step (Plan 06-01 → `06-STORE-HISTORY.md`); M3 Phase 5 reuses it
verbatim.

M3-specific reality: both platforms `local-ahead` at this query time (local source one unit
ahead of the highest-accepted store value, on both iOS and Android). This is the INVERSE of the
M1 D-02 incident (where local was BEHIND store, prompting the reactive bump). The formula
collapses to `local + 1` for this run, but the binding rule remains
`max(local, store) + 1` — so the next release after v3.0.0 cannot regress to the
trust-local-source anti-pattern.

## M2 anchor discrepancy

**Memory anchor `m2-shipped-2026-05-05.md` is internally inconsistent with observed store
reality on 2026-05-07.**

| Source | Claim |
|--------|-------|
| Memory `m2-shipped-2026-05-05.md` (auto-recorded 2026-05-05) | "iOS in TestFlight Internal (build 27)" + "Android in Play Console Internal Testing (versionCode 30)" — claimed to be SHIPPED for v2.0.0 on 2026-05-05 |
| ASC TestFlight (user-relay 2026-05-07) | Highest build number observed = **26** (NOT 27) |
| Play Console (user-relay + screenshot 2026-05-07) | Internal Testing latest = versionCode **26** / versionName 1.0.25 / dated 2026-04-23 (NOT versionCode 30 / not v2.0.0) |
| Play Console (Closed testing/Alpha) | Latest = versionCode **29** / versionName 1.0.29 / dated 2026-05-03 (NOT v2.0.0) |
| Play Console (Production) | Latest = versionCode 21 / versionName 1.0.20 (M1 era — NOT v2.0.0) |

**Implication:** Nothing in Play Console is at v2.0.0 — every track shows v1.0.x. The TestFlight
max also lags the local source by 1. The likely explanation is that the M2 atomic version-bump
commit landed in the RN client repo on 2026-05-05 (raising local pbxproj `CURRENT_PROJECT_VERSION`
to 27 and local `build.gradle` `versionCode` to 30), but the actual `.ipa` / `.aab` uploads
either failed, were rejected, or were never attempted. The auto-memory recorded the LOCAL bump
state as "shipped" but the live stores never received the v2.0.0 binaries.

**Why this matters for Plan 05-03 + Plan 05-07:**

1. The `local-ahead` delta on BOTH platforms (rather than the `local-equal` hypothesis encoded
   in 05-PATTERNS.md lines 124-135 / 137-139) is now formally recorded; planners reading this
   artifact must NOT silently revert to the `local-equal` hypothesis.
2. **v3.0.0 build 28 (iOS) / versionCode 31 (Android) will effectively be the FIRST 2.x-style
   version artifacts the stores accept.** The marketing-version jump in the user's mind is
   1.0.x → 2.0.0 → 3.0.0; the stores' accepted-binary jump is 1.0.x → 3.0.0 (skipping 2.0.0
   entirely on Android; jumping 26 → 28 on iOS).
3. Plan 05-04's already-shipped EN+RU release notes assume continuity from a shipped v2.0.0 —
   the operator may want to revisit "Bug fixes" framing if internal testers' Play Console history
   shows them upgrading directly from v1.0.x. (Out of scope for THIS plan — captured here as a
   forward signal only. Re-open Plan 05-04 only if release-notes accuracy is judged a blocker.)
4. **Forward signal to Plan 05-07:** when uploading v3.0.0 build 28 (iOS) / versionCode 31
   (Android), if either store rejects with a "version already used" error, the values recorded
   here may have understated the live max (e.g., a post-2026-05-07 out-of-band upload may have
   landed). Operator should re-query both stores at that moment, recompute
   `max(local, store) + 1`, document the new derivation in this artifact's `derived_targets`
   block, and retry. The retry-on-reject discipline mirrors M2 Phase 6's `Re-open conditions`
   precedent.

**Memory remediation:** A future memory update should reflect that `m2-shipped-2026-05-05.md`'s
"shipped" claim was based on the local atomic-bump commit, not on a verified store upload.
This Plan 05-02 artifact is now the authoritative record of where v2.0.0 actually landed
(answer: nowhere — only locally).

## Phase 4 paired-gates prerequisite

`phase_4_paired_gates_prerequisite.status: clear`. Phase 4 closed paired-gates clean per STATE.md
updates and memory `phase06-m3-carry-forward.md`. Plan 05-05 (QA matrix walks) can proceed without
re-litigation. Plan 05-06 (paired-gate verifier+reviewer) re-runs `/gsd-verify-work 5` +
`/gsd-code-review 5` at end-of-phase per memory `gsd-verifier-misses-regressions.md`. The 2
deferred device walks (CARRY-01 SC#1 banner latency on iPhone + CARRY-02 SC#3 live Atlas uid
match) roll into Phase 5 REL-03 cells per the QA-matrix walk plan (Plan 05-05).

## Re-open conditions

- If a future ASC TestFlight upload rejects the build number Plan 05-03 sets (i.e., upload of
  `next_ios_build_number = 28` is rejected because TestFlight has accepted >= 28 since this
  snapshot), re-run Step 1 to re-derive the next target (probably `max + 1` of the rejection
  notice's number) and re-emit the artifact.
- If Play Console rejects `next_android_version_code = 31`, same drill against Step 2.
- If a post-2026-05-07 out-of-band upload landed a build above the recorded maxima (iOS 26 /
  Android 29), the recorded values are stale — re-query the live stores.
- If memory `m2-shipped-2026-05-05.md` is updated to reconcile the discrepancy noted above
  (e.g., a successful late upload lands), update `m2_anchor_observed_in_stores` to `true` and
  re-derive the bump targets against the new store maxima.
- If Phase 4 paired-gates re-open (a regression is discovered during Plan 05-05 walks or 05-06
  paired-gate audit), update `phase_4_paired_gates_prerequisite.status` to `outstanding` and
  pause Plan 05-05.

## Re-runnable verification commands

Plan 05-03's executor can re-read the binding values programmatically without parsing this
prose by running:

```bash
# Read derived_targets from the frontmatter (one integer per line — iOS first, Android second)
grep -E '^\s*next_ios_build_number:\s*[0-9]+' \
  .planning/phases/05-hardening-manual-qa-release-v3/05-STORE-HISTORY.md \
  | awk '{print $2}'
# Expected: 28

grep -E '^\s*next_android_version_code:\s*[0-9]+' \
  .planning/phases/05-hardening-manual-qa-release-v3/05-STORE-HISTORY.md \
  | awk '{print $2}'
# Expected: 31

# Confirm the query method is auditable (one of the three allowed enum values per platform)
grep -E '^\s*query_method:' \
  .planning/phases/05-hardening-manual-qa-release-v3/05-STORE-HISTORY.md
# Expected: 2 lines — `query_method: asc_web_ui_user_relay` and `query_method: play_console_web_ui_user_relay`

# Confirm Phase 4 paired-gates prerequisite is clear (Plan 05-05 unblocked)
grep -A 2 'phase_4_paired_gates_prerequisite:' \
  .planning/phases/05-hardening-manual-qa-release-v3/05-STORE-HISTORY.md \
  | grep -E '^\s*status:\s*clear'
# Expected: 1 line — `  status: clear`

# Confirm M2 anchor discrepancy is recorded (forward signal to Plan 05-07 retry-on-reject)
grep -E '^\s*m2_anchor_observed_in_stores:\s*false' \
  .planning/phases/05-hardening-manual-qa-release-v3/05-STORE-HISTORY.md
# Expected: 1 line — `m2_anchor_observed_in_stores: false`
```

## Cross-references

- M2 Phase 6 precedent: `.planning/milestones/v2.0-phases/06-hardening-manual-physical-device-qa-release/06-STORE-HISTORY.md`
- Phase 5 patterns map: `.planning/phases/05-hardening-manual-qa-release-v3/05-PATTERNS.md` (lines 104-160 — note: the `local-equal` hypothesis encoded there has been superseded by the `local-ahead` reality recorded in this artifact's frontmatter).
- Memory `release-android-versioncode-trust-play-console.md` (M1 D-02 lesson — "Trust Play Console for live-version state, not local build files")
- Memory `m2-shipped-2026-05-05.md` (M2 baseline anchor — superseded for live-store state by this artifact; see `## M2 anchor discrepancy` section)
- Memory `phase06-m3-carry-forward.md` (Phase 4 paired-gates closure note)
- Memory `gsd-verifier-misses-regressions.md` (paired-gate discipline anchored at `phase_4_paired_gates_prerequisite`)
- REQUIREMENTS.md REL-02 acceptance criteria (line 81 — "Build numbers per M1 D-02 lesson; query 06-STORE-HISTORY.md (re-run pattern from M2 Phase 6) for next_ios_build_number = max(local, store) + 1 and next_android_version_code = max(local, store) + 1 BEFORE the atomic version-bump commit").

---

*Authored: 2026-05-07 (Plan 05-02, Wave 1 of Phase 5)*
*Plan 05-03 reads `derived_targets.next_ios_build_number` + `derived_targets.next_android_version_code`*

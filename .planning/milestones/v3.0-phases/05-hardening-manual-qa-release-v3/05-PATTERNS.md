---
phase: 05-hardening-manual-qa-release-v3
type: pattern-map
mapped: 2026-05-07
files_classified: 14
analogs_found: 14
analogs_missing: 0
dominant_analog_dir: .planning/milestones/v2.0-phases/06-hardening-manual-physical-device-qa-release
---

# Phase 5: Hardening + Manual Physical-Device QA + Release v3.0.0 — Pattern Map

**Mapped:** 2026-05-07
**Files analyzed:** 14 (6 companion docs + 7 plan files + 4 source-code edit candidates — overlap = 14 distinct targets)
**Analogs found:** 14 / 14
**Dominant analog source:** M2 Phase 6 (`.planning/milestones/v2.0-phases/06-hardening-manual-physical-device-qa-release/`) — exact format reuse expected.

This phase is a release/QA grinder. **Almost every "file to create" is a structured Markdown companion-doc whose format is already established in M2 Phase 6.** Bias toward verbatim format reuse — the planner should copy the M2 Phase 6 frontmatter shape, section headers, and table column conventions, then swap M2-specific values for M3-specific ones.

There is one unique pattern excerpt for the source-code edit candidates (MEDIUM-01 / MEDIUM-02) which the planner needs in order to write surgical edits with line-anchor `read_first` directives.

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `.planning/phases/05-hardening-manual-qa-release-v3/05-PREFLIGHT.md` | companion-doc (operator runbook) | request-response (operator-confirmed) | `06-BACKEND-DEPLOY.md` | exact role + data flow |
| `.planning/phases/05-hardening-manual-qa-release-v3/05-STORE-HISTORY.md` | companion-doc (Wave-1 query artifact) | request-response (live-store query) | `06-STORE-HISTORY.md` | exact |
| `.planning/phases/05-hardening-manual-qa-release-v3/05-INHERITANCE-AUDIT.md` | companion-doc (audit) | batch (frontmatter classification) | `06-INHERITANCE-AUDIT.md` | exact |
| `.planning/phases/05-hardening-manual-qa-release-v3/05-QA-MATRIX.md` | companion-doc (verification matrix) | event-driven (per-cell walk verdict) | `06-QA-MATRIX.md` | exact |
| `.planning/phases/05-hardening-manual-qa-release-v3/05-RELEASE-NOTES.md` | companion-doc (i18n paste-only) | batch (paste-only artifact) | `06-RELEASE-NOTES.md` | exact |
| `.planning/phases/05-hardening-manual-qa-release-v3/05-SUBMISSION-LOG.md` | companion-doc (submission record) | event-driven (post-upload state capture) | `06-SUBMISSION-LOG.md` | exact |
| `.planning/phases/05-hardening-manual-qa-release-v3/05-01-PLAN.md` (pre-flight tracker) | plan | request-response (operator-supervised gate chain) | `06-04-PLAN.md` | role-match (M3 pre-flight is broader than M2 backend-deploy-only) |
| `.planning/phases/05-hardening-manual-qa-release-v3/05-02-PLAN.md` (store-history capture) | plan | request-response (live-store query → derive bump targets) | `06-01-PLAN.md` | exact |
| `.planning/phases/05-hardening-manual-qa-release-v3/05-03-PLAN.md` (atomic v3.0.0 bump) | plan | batch (atomic 3-file commit) | `06-05-PLAN.md` | exact |
| `.planning/phases/05-hardening-manual-qa-release-v3/05-04-PLAN.md` (release notes EN+RU) | plan | batch (paste-only draft + char-count verify) | `06-03-PLAN.md` | exact |
| `.planning/phases/05-hardening-manual-qa-release-v3/05-05-PLAN.md` (QA matrix walk) | plan | event-driven (per-cell walk verdict) | `06-06-PLAN.md` | exact |
| `.planning/phases/05-hardening-manual-qa-release-v3/05-06-PLAN.md` (paired-gate verifier+reviewer) | plan | request-response (gsd-verifier + gsd-code-reviewer) | (no direct M2 Phase 6 analog — closest is the verifier+reviewer step pattern from M2 Phase 1 close per memory `gsd-verifier-misses-regressions.md`) | role-match |
| `.planning/phases/05-hardening-manual-qa-release-v3/05-07-PLAN.md` (dual-store submission) | plan | batch (archive + upload + paste notes) | `06-07-PLAN.md` | exact |
| `backend: src/scripts/migrate-landlord-app-uid-mismatch.js` (MEDIUM-01 fix) | script (operator-supervised migration) | batch (cursor walk over LandlordApplication) | `backend: src/scripts/migrate-listings-m3.js` (sibling script) | exact (per Phase 4 REVIEW.md the fix is "match the sibling's early-exit verify path") |
| `backend: src/routes/moderationRoutes.js` (MEDIUM-02 — 5 handlers) | route handler | request-response (REST POST) | same file lines 347-353 (existing DELETE handler with the guard already applied) | in-file analog (copy the pattern from inside the same file) |
| `RN client: package.json` (version bump) | config | n/a (single-line edit) | git history of `de4ff0a` (M1 → v1.0.4 atomic bump commit) and the M2 v2.0.0 bump | exact |
| `RN client: ios/JayTap.xcodeproj/project.pbxproj` (MARKETING_VERSION + CURRENT_PROJECT_VERSION) | config | n/a (Xcode project) | same file (4 anchor lines: 274 / 283 / 308 / 316) | in-file analog |
| `RN client: android/app/build.gradle` (versionCode + versionName) | config | n/a (gradle) | same file (lines 91-92) | in-file analog |
| `RN client: scripts/release-android.md` (does NOT exist; optional create) | doc (operator runbook) | n/a | M2 Phase 6 `06-SUBMISSION-LOG.md §Known issue` block | role-match |

**Notes on coverage:**
- All 14 distinct targets resolve to a concrete analog. No "no-analog" rows.
- M2 Phase 6 supplies 11 of 14 directly (companion-doc + plan-file precedent).
- 3 targets resolve to in-file or sibling-file analogs (MEDIUM-01 to migrate-listings-m3.js sibling; MEDIUM-02 to the same moderationRoutes.js DELETE handler at line 347-353; iOS/Android version bumps to in-file anchor lines).

---

## Pattern Assignments

### Companion doc: `05-PREFLIGHT.md`

**Role:** operator runbook (broader than M2 Phase 6 — Phase 5 owns 13-step pre-flight including Atlas snapshot, two migrations, backend deploy, locations seed, smoke-curls, RN tsc capture)
**Data flow:** request-response (operator-confirmed observation per step)
**Analog:** `06-BACKEND-DEPLOY.md` (closest M2 Phase 6 companion-doc; covered backend-deploy + AWS IAM + Mongo rotation + Railway deploy + health-check)

**Frontmatter shape to copy** (06-BACKEND-DEPLOY.md:1-20):
```yaml
---
phase: 05-hardening-manual-qa-release-v3
plan: 01
type: preflight-evidence    # NEW — was `backend-deploy-evidence` in M2; broaden it
audited_at: <ISO8601>
backend_repo: /Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services
backend_repo_sha_at_deploy: <SHA>
railway_deploy_sha: <SHA>
railway_deploy_timestamp: <ISO8601>
health_check_status: 200
nvm_node_version_used: 24

mongo_atlas_snapshot_at: <ISO8601>   # NEW — Phase 5 owns the snapshot step
listings_m3_migration_verify_pass_at: <ISO8601>   # NEW
landlord_uid_repair_migration_verify_pass_at: <ISO8601>   # NEW
locations_seed_verify_pass_at: <ISO8601>   # NEW
rn_tsc_baseline_error_count: 17   # NEW — confirm vs Phase 4 close baseline

aws_iam_path: jaytap_runtime_uses_new_user_only_old_user_retains_cross_project_policy
aws_iam_partial_mitigation: true
mongo_revoked_at: 2026-04-29T00:00:00Z
firebase_project_id_present: true
firebase_admin_absent: true
---
```

**Section structure to copy** (numbered Section 1..N with operator-supervised step pattern), based on 06-BACKEND-DEPLOY.md:36-181:
- Each step: `## Section N — <name> (automated | user-relayed)` heading + a small table of fields/values + a code block with the exact command + an `expected output` paragraph + a `rollback` paragraph if applicable.
- The 13 D-02 steps from CONTEXT.md (Atlas snapshot → migrate-listings-m3 dry → live → verify → uid-repair dry → live → verify → Railway deploy → seed-locations dry → live → verify → smoke-curls → tsc capture) become 13 numbered Section blocks.
- Final section: **Re-open conditions** (06-BACKEND-DEPLOY.md:167-181) listing what would invalidate the pre-flight green-state.

**Cross-cutting precedent — D-03 rollback posture:** The companion-doc must explicitly call out that mid-flight failure triggers Plan 05-01's `deviation_protocol`, which captures the in-context "triage in-place vs. full rollback to M2" decision per CONTEXT.md D-03.

**Tester-comms template (D-04):** Quote verbatim from `.planning/phases/01-schema-reshape-backend-route-shape-cutover/01-CONTEXT.md §Rollback › ## Tester comms template`. The pre-flight runbook step 0 is "send tester comms before step 1 (Atlas snapshot)".

**read_first directive for planner:** Read 06-BACKEND-DEPLOY.md sections 1-6 in full to internalize the table-then-code-block-then-expected-output cadence; do not invent a different cadence.

---

### Companion doc: `05-STORE-HISTORY.md`

**Role:** Wave-1 query-live artifact (M1 D-02 lesson application — query Play Console + TestFlight BEFORE setting baseline)
**Data flow:** request-response (live-store query) → batch (derived target math)
**Analog:** `06-STORE-HISTORY.md` (exact format reuse)

**Frontmatter shape to copy** (06-STORE-HISTORY.md:1-41) — replace M2 values with M3 values, keep structure byte-for-byte:
```yaml
---
phase: 05-hardening-manual-qa-release-v3
plan: 02
type: store-history
queried_at: <ISO8601>
queried_against_sha: <RN client HEAD SHA at query time — currently fe3b888>

ios:
  query_method: orchestrator_hypothesis | xcrun_altool | user_relay_via_asc_web
  asc_track: TestFlight Internal
  highest_accepted_marketing_version: 2.0.0      # baseline from m2-shipped-2026-05-05.md
  highest_accepted_build_number: 27              # baseline from m2-shipped-2026-05-05.md
  local_source_marketing_version: 2.0.0          # current pbxproj line 283/316
  local_source_build_number: 27                  # current pbxproj line 274/308
  local_vs_store_delta: local-equal              # both at 27 — neither ahead

android:
  query_method: orchestrator_hypothesis | gcloud | user_relay_via_play_web
  tracks_inspected: [production, open-testing, closed-testing, internal-testing]
  highest_accepted_version_name: "2.0.0"
  highest_accepted_version_code: 30              # baseline from m2-shipped-2026-05-05.md
  local_source_version_name: "2.0.0"
  local_source_version_code: 30
  local_vs_store_delta: local-equal

derived_targets:
  next_ios_build_number: 28                      # max(27, 27) + 1 = 28
  next_android_version_code: 31                  # max(30, 30) + 1 = 31
  rationale: "M1 D-02 lesson — bump from max(local, store) + 1 ..."

phase_4_paired_gates_prerequisite:
  status: clear   # confirm via memory phase06-m3-carry-forward.md / Phase 4 close note
  detail: |
    User confirmed Phase 4 (M2 carry-forward bug fixes) closed paired-gates clean ...
---
```

**Section structure to copy** (06-STORE-HISTORY.md:43-144):
- ASC TestFlight history table.
- Play Console history table.
- "Derived bump targets" subsection with explicit anchor-line citations: pbxproj 274 + 308 + 283 + 316; build.gradle 91 + 92; package.json line 3.
- "Math" table (06-STORE-HISTORY.md:96-101): `local | store | max | + 1 | next` columns.
- "M1 D-02 lesson application" prose paragraph.
- "Re-open conditions" final section.

**M3-specific math reality:** Both platforms appear to be `local-equal` at the M2 close baseline (iOS local pbxproj=27 vs store TestFlight=27; Android local build.gradle=30 vs store Play Console=30). This means `max + 1` formula collapses to `local + 1`, but the formula is still recorded as the binding rule. The planner MUST note this in the artifact rationale to prevent the next release regressing to the M1 anti-pattern.

**read_first directive:** 06-STORE-HISTORY.md:88-117 (Math + M1 D-02 lesson sections) — internalize the explicit max(local,store)+1 formula.

---

### Companion doc: `05-INHERITANCE-AUDIT.md`

**Role:** M1 D-13 inheritance descope evidence
**Data flow:** batch (package.json diff + 7-item disposition classification)
**Analog:** `06-INHERITANCE-AUDIT.md` (exact format reuse)

**Frontmatter shape to copy** (06-INHERITANCE-AUDIT.md:1-88) — note the embedded YAML structure with `inheritance_dispositions:` map of 7 keys, each with `disposition` + `rationale` + `re_open_conditions:` array:
```yaml
---
phase: 05-hardening-manual-qa-release-v3
plan: 02   # or whichever plan owns this artifact
type: inheritance-audit
audited_at: <ISO8601>
v200_baseline_sha: <M2 v2.0.0 release SHA — query .planning/milestones/v2.0-phases/06-.../06-SUBMISSION-LOG.md walked_against_sha>
v300_audit_sha: <RN client HEAD SHA>
commits_since_baseline: <int>
package_json_commits_since_baseline: <int>

package_json_diff:
  added: []
  removed: []
  changed: []
  added_dev: []
  removed_dev: []
  changed_dev: []

classification:
  firebase_sdk_violations: []
  new_network_data_collecting: []
  new_network_no_data_collection: []
  new_no_network: []

inheritance_dispositions:
  ios_privacy_info_xcprivacy:
    disposition: INHERIT
    rationale: "..."
    re_open_conditions: [...]
  asc_app_privacy_questionnaire: {...}
  play_console_data_safety: {...}
  store_listing_copy: {...}
  app_icon_screenshots_category: {...}
  maps_api_key_restrictions: {...}
  applinks_entitlement: {...}

plan_07_disposition_signal:
  proceed_with_inheritance: true
  flagged_red_items: []
  summary: "..."
---
```

**Body section structure to copy** (06-INHERITANCE-AUDIT.md:90-269):
- Audit Methodology numbered list.
- RN client package.json diff (baseline + HEAD + commits-between).
- Empirical conclusion paragraph: "byte-for-byte identical" or list of mutations with classification.
- Repo-rule check: `grep -E '"(firebase|@react-native-firebase/[^"]+)"' package.json` (expected 0 lines).
- 7 inheritance disposition subsections with `### <item>` heading + Rationale paragraph + Re-open conditions bullets.
- Plan 07 disposition signal subsection echoing the frontmatter `proceed_with_inheritance` boolean.
- Re-open audit trail prose paragraph.
- Cross-references list.

**M3 expected outcome per CONTEXT.md `Claude's Discretion › INHERITANCE-AUDIT.md format`:** 7/7 INHERITED (no new data-collecting SDKs in M3, no privacy manifest changes, no entitlement changes, no Maps key restriction changes). Re-open condition unchanged: future phase introduces a new data-collecting SDK or auth provider.

**The package.json diff for M3:** Verify whether M3 phases 1-4 touched package.json (likely no — M3 was schema/route/UI work, not new SDKs). Run `git log <v2.0.0-SHA>..HEAD --oneline -- package.json` and `git diff <v2.0.0-SHA> HEAD -- package.json` to confirm. If empty diff, the audit reuses the M2 "empirical conclusion: byte-for-byte identical" prose verbatim.

**read_first directive:** 06-INHERITANCE-AUDIT.md:21-87 (frontmatter `inheritance_dispositions:` map) — internalize the per-item key naming so the M3 audit uses the same 7 keys.

---

### Companion doc: `05-QA-MATRIX.md`

**Role:** ~60-cell verification matrix (D-06 canonical doc — supersedes 4 prior `*-HUMAN-UAT.md` files)
**Data flow:** event-driven (per-cell walk verdict)
**Analog:** `06-QA-MATRIX.md` (exact format reuse — 86 cells / 7 matrices structure)

**Frontmatter shape to copy** (06-QA-MATRIX.md:1-61):
```yaml
---
phase: 05-hardening-manual-qa-release-v3
plan: 05
type: verification-matrix
status: pending | walking | walked
created: <ISO8601>
walked: <ISO8601 — flips when walk completes>
walked_against_sha: <RN client SHA at walk time>
backend_walked_against_sha: <backend Railway deploy SHA at walk time — comes from 05-PREFLIGHT.md>
walk_disposition: pending | APPROVED | BLOCKED
walker: beckprograms@gmail.com
devices:
  ios:
    model: iPhone 15 Pro Max
    os: iOS 26.x
    build: Fabric / Release
    binary: 3.0.0 build 28        # FROM 05-STORE-HISTORY.md derived_targets
  android:
    model: Moto G XT2513V
    os: Android 16
    build: Fabric / Release
    binary: 3.0.0 versionCode 31  # FROM 05-STORE-HISTORY.md derived_targets
accounts: {...}
requirements_addressed: [REL-03]
testing_bar: M3 manual physical-device QA per CLAUDE.md
walk_scope: ~60-cell M3 cross-cutting (Phases 1-4 + REL-03 happy-path)
paired_gates_prerequisite_clear: true   # confirm via Plan 05-06 paired-gate close
matrix_count: 7
totals:
  total_cells: ~60
  pass: <int>
  partial: <int>
  deferred_user_approved: <int>
  fail: <int>
  na: <int>
deferrals:
  race_cells:
    cells: [...]   # M3 inherits the M4+ deferral of race cells per memory phase06-m3-carry-forward.md
    rationale: "..."
    follow_up: "M4 backlog: build coordinated-curl test rig with token-capture mechanism."
partials: {...}   # mirror M2 cells_1_5_1_6 + cell_5_3 structure if any PARTIAL surfaces
---
```

**Cell markers legend** (06-QA-MATRIX.md:67-74) — copy verbatim:
```
- ✅ PASS — observed expected behavior on the listed device
- ❌ FAIL — regression observed; bug-fix loop opens
- ⚠ PARTIAL — security-critical part PASS; auxiliary part deferred (see `partials` in frontmatter for sign-off)
- 🅓 DEFERRED-USER-APPROVED — formally deferred per T-06-33 option (b); follow-up backlog item recorded
- — N/A — cell intentionally not applicable on this device
- ☐ Pending — not yet walked
```

**Cell tagging convention from CONTEXT.md `## Specific Ideas`:** Each cell row carries a `satisfies:` column listing the prior-phase deferred entry it closes (e.g., `satisfies: Phase 2 W1 + REL-03 cell apartment+rent_long`). This is the auditable hook for D-07 walk-once-count-for-both. The M2 Phase 6 cells did NOT carry this column — Phase 5 EXTENDS the format. The planner must add a `satisfies` column to each cell row.

**Matrix structure** (06-QA-MATRIX.md:99-225) — Phase 5 maps to:
- **Matrix 1 — Happy-path 6-step flow** (15 combos × 2 devices = 30 cells; satisfies REL-03 + Phase 2 W1-W6)
- **Matrix 2 — Edit mode** (6 reps × 2 devices = 12 cells; satisfies Phase 2 W7-W9)
- **Matrix 3 — Mod media curation** (4 walks × 2 devices = 8 cells; satisfies Phase 3 deferred 6-walk set)
- **Matrix 4 — ROLE-11 demote-mid-action recovery** (2 paired-device cells; satisfies Phase 4 CARRY-01 banner-latency on iPhone)
- **Matrix 5 — Phase 4.5 uid-mismatch repair** (1 cell; satisfies CARRY-02 SC#3 live Atlas walk)
- **Matrix 6 — EN+RU parity** (per-screen RU sweep × 2 devices = ~4-8 cells)
- **Matrix 7 — Dark/light parity** (M3-new surfaces × 2 devices = ~4-8 cells)

**Sign-off section** (06-QA-MATRIX.md:226-246) — copy verbatim with M3 numbers.

**read_first directive:** 06-QA-MATRIX.md:99-130 (Matrix 1 + Matrix 2 cell-row structure) to internalize the "Cell | Transition/Scenario | Device | Result" 4-column convention.

---

### Companion doc: `05-RELEASE-NOTES.md`

**Role:** EN+RU paste-only artifact for ASC + Play Console
**Data flow:** batch (paste-only — not preserved as in-app i18n)
**Analog:** `06-RELEASE-NOTES.md` (exact format reuse)

**Frontmatter shape to copy** (06-RELEASE-NOTES.md:1-16):
```yaml
---
phase: 05-hardening-manual-qa-release-v3
plan: 04
type: release-notes
created: 2026-05-07
target_stores: [App Store Connect, Google Play Console]
target_version: 3.0.0
walk_disposition: pending  # flips to APPROVED after Plan 05-05 manual QA matrix
bug_fix_loop_triggered: pending
walked_against_sha: pending  # flips after Plan 05-03 atomic bump
languages: [en, ru]
binding_length_limit: 500 chars per locale (Play Console)
asc_length_limit: 4000 chars per locale
paste_only: true
m1_template: .planning/milestones/v1.0.4-phases/08-release-and-store-submission/08-RELEASE-NOTES.md
m2_template: .planning/milestones/v2.0-phases/06-hardening-manual-physical-device-qa-release/06-RELEASE-NOTES.md
---
```

**Body structure to copy** (06-RELEASE-NOTES.md:18-119):
- `## EN` heading → bullet list in M1 D-10 order: **What's new → Improvements → Bug fixes catch-all** ("Minor stability and polish refinements." closer line).
- `---` separator.
- `## RU` heading → same structure in Russian.
- `---` separator.
- "Submission instructions" subsection — verbatim ASC + Play Console paste paths.
- "Character counts" table with EN + RU character counts vs 500 limit (use `wc -m`).
- Re-runnable verification awk commands (06-RELEASE-NOTES.md:99-105).

**M3 content emphasis (CONTEXT.md `Claude's Discretion › Release notes emphasis`):** Lead with new features (6-step contextual listing flow + KG/KZ/UZ city dictionary as expansion-enabler hint per memory `geographic-scope.md` — **NO Bishkek-only phrasing**). M1 D-10 content order honored. Both bodies ≤500 chars (Play Console binding limit). EN+RU lockstep.

**Trim priority list (06-RELEASE-NOTES.md:107-112) if either body exceeds 500 chars:**
1. Drop the "Minor stability..." closer first.
2. Drop the second Improvements bullet.
3. Trim the descriptive tail of the longest What's new bullet.
Preserve EN ↔ RU parity (same content, same order, same number of bullets).

**read_first directive:** 06-RELEASE-NOTES.md:37-61 (EN + RU body excerpts) for tone calibration — drafted at internal-testing audience, lay-friendly, no jargon.

---

### Companion doc: `05-SUBMISSION-LOG.md`

**Role:** dual-store submission record (REL-06)
**Data flow:** event-driven (post-upload state capture)
**Analog:** `06-SUBMISSION-LOG.md` (exact format reuse)

**Frontmatter shape to copy** (06-SUBMISSION-LOG.md:1-53):
```yaml
---
phase: 05-hardening-manual-qa-release-v3
plan: 07
type: submission-log
submitted_at: <ISO8601>
submitted_against_sha: <RN client SHA at archive time>
backend_against_sha: <Railway deploy SHA at submission time>
target_version: 3.0.0
ios:
  build_number: 28        # FROM 05-STORE-HISTORY.md derived_targets.next_ios_build_number
  asc_status: submitted_processing
  en_pasted_at: <ISO8601>
  ru_pasted_at: <ISO8601>
  track: TestFlight Internal Testing
  archive_method: "Xcode 26.x ... Product → Archive → Distribute App → App Store Connect → Upload"
android:
  version_code: 31        # FROM 05-STORE-HISTORY.md derived_targets.next_android_version_code
  play_console_status: submitted_processing
  en_pasted_at: <ISO8601>
  ru_pasted_at: <ISO8601>
  track: Internal Testing
  aab_path: android/app/build/outputs/bundle/release/app-release.aab
  aab_size: <int>M
  aab_sha256: <hex>
  build_method: "./gradlew :react-native-reanimated:assembleRelease :app:bundleRelease"   # memory android-reanimated-clean-prefab-gotcha.md
  build_duration: <duration>
inheritance_descope:
  ios_privacy_info_xcprivacy: INHERITED
  asc_app_privacy: INHERITED
  play_data_safety: INHERITED
  store_listing_copy: INHERITED
  screenshots_icon_category: INHERITED
  maps_api_key: INHERITED
  applinks: INHERITED
rationale: M1 D-13 inheritance descope per 05-INHERITANCE-AUDIT.md `proceed_with_inheritance: true`
upstream_gates_evidence:
  inheritance_audit_proceed_with_inheritance: true
  release_notes_en_chars: <int>
  release_notes_ru_chars: <int>
  backend_health_check_status: 200
  qa_matrix_walk_disposition: APPROVED
  build_identity_match: pass
known_issue:
  android_clean_build_failure:
    title: "..."
    detail: "..."
    fix: "Run `./gradlew :react-native-reanimated:assembleRelease :app:bundleRelease` instead"
    follow_up: "M4 backlog: document this in scripts/release-android.md OR add `bundleReleaseSafe` gradle wrapper"
---
```

**Body section structure to copy** (06-SUBMISSION-LOG.md:55-159):
- iOS submission table.
- Android submission table.
- Build identity table (Repo SHA + iOS MARKETING + iOS CURRENT_PROJECT + Android versionName + Android versionCode + Backend deploy SHA — 6 rows).
- Inheritance descope bullet list (7 items echoing 05-INHERITANCE-AUDIT.md dispositions).
- Upstream gates evidence table (6 rows: inheritance audit / release notes EN chars / RU chars / backend health / QA matrix disposition / build-identity match).
- Known issue section (Android `clean bundleRelease` workaround per memory `android-reanimated-clean-prefab-gotcha.md` — copy 06-SUBMISSION-LOG.md:128-138 verbatim, this is the SAME issue).
- Phase-exit disposition prose (M1 D-12 — Internal Testing track sufficient for phase-exit).
- Re-open conditions.
- Final-state status flip checklist.

**read_first directive:** 06-SUBMISSION-LOG.md:128-138 (Known issue block) — copy the Android prefab gotcha description verbatim.

---

### Plan: `05-01-PLAN.md` (pre-flight tracker)

**Role:** plan (operator-supervised gate chain — 13 steps from D-02)
**Data flow:** request-response (each step has a verify gate: script exit code, query result, or operator-confirmed observation)
**Analog:** `06-04-PLAN.md` (M2's backend-deploy plan — closest in operator-supervised cadence; M3 broadens scope to include 2 migrations + locations seed + tsc capture)

**Section headers from `06-04-PLAN.md`** (planner default — confirm via direct read of 06-04-PLAN.md if cadence diverges):
```
---
plan_id: 06-04
phase: 06
title: ...
---
```

**Plan body cadence:** task-by-task with explicit `command:`, `expected:`, `on_failure:` blocks per step. Plan 05-01 has 13 such steps from D-02 — each step has the form:
```markdown
### Step N — <name>
**Command:** `<exact command>`
**Expected:** <exit code 0 | specific count | observed text>
**On failure:** <triage option | rollback per D-03>
**Companion-doc reference:** 05-PREFLIGHT.md §Section N captures the evidence.
```

**deviation_protocol pre-template (CONTEXT.md `## Specific Ideas`):**
- Atlas migration `--dry-run` count mismatch (orphan docs) → triage classification before going live.
- Atlas migration live failure mid-cursor → snapshot restore is the safety net; D-03 decide-at-moment.
- Backend deploy fails healthcheck → pause; query Railway logs; do NOT advance to step 9 (locations seed) until healthy.
- Atlas locations seed `--verify=PASS` mismatch (count off, dedupe failed) → triage; safe to retry idempotent.
- tsc whole-project capture > 17 errors → block device walks; classify new errors against Phase 4 baseline.

---

### Plan: `05-02-PLAN.md` (store-history capture)

**Role:** plan (Wave-1 query-live)
**Data flow:** request-response (live-store query) → batch (derive bump targets)
**Analog:** `06-01-PLAN.md` (exact)

**Reuse cadence:** Step 1 = query ASC TestFlight history; Step 2 = query Play Console history; Step 3 = derive `max(local, store) + 1` per platform; Step 4 = emit `05-STORE-HISTORY.md` artifact with frontmatter + body.

**Path-A / Path-B / Path-C precedent (06-STORE-HISTORY.md:60-65):** Path A = automated (xcrun altool / gcloud — likely unavailable in this env); Path B = user-relay through web UI; Path C = orchestrator_hypothesis from prior memory (m2-shipped-2026-05-05.md is the M3 baseline anchor — iOS build 27 / Android versionCode 30). Plan must record `query_method:` honestly.

---

### Plan: `05-03-PLAN.md` (atomic v3.0.0 version bump)

**Role:** plan (atomic 3-file commit — RN package.json + iOS pbxproj + Android build.gradle)
**Data flow:** batch (single commit, no partial-bump windows per M1 D-02 + M2 Wave-1 lesson)
**Analog:** `06-05-PLAN.md` (exact)

**Concrete current-state strings (Phase 5 starting baseline):**

```
RN client: package.json line 3:
  "version": "2.0.0",
→ bump to "3.0.0"

RN client: ios/JayTap.xcodeproj/project.pbxproj:
  Line 274: 				CURRENT_PROJECT_VERSION = 27;
  Line 283: 				MARKETING_VERSION = 2.0.0;
  Line 308: 				CURRENT_PROJECT_VERSION = 27;
  Line 316: 				MARKETING_VERSION = 2.0.0;
→ bump CURRENT_PROJECT_VERSION 27 → 28 (both lines, Debug + Release)
→ bump MARKETING_VERSION 2.0.0 → 3.0.0 (both lines, Debug + Release)

RN client: android/app/build.gradle:
  Line 91:         versionCode 30
  Line 92:         versionName "2.0.0"
→ bump versionCode 30 → 31
→ bump versionName "2.0.0" → "3.0.0"
```

**Commit message convention from M2 `06-05-PLAN.md`:** `chore(05-03): bump version to 3.0.0 (REL-01 + REL-02 atomic 3-file commit)`. Single commit; no partial-bump intermediate.

**Verification commands (planner should include in plan body):**
```bash
grep -n '"version":' package.json                                    # expect "3.0.0"
grep -n -E 'MARKETING_VERSION|CURRENT_PROJECT_VERSION' ios/JayTap.xcodeproj/project.pbxproj  # expect 4 lines: 28 / 3.0.0 / 28 / 3.0.0
grep -n -E 'versionCode|versionName' android/app/build.gradle        # expect versionCode 31 + versionName "3.0.0"
```

**read_first directive:** Read `06-05-PLAN.md` in full (49 lines / 20KB) to internalize the atomic-commit cadence; do not split into per-platform sub-plans.

---

### Plan: `05-04-PLAN.md` (release notes EN+RU draft)

**Role:** plan (paste-only draft + char-count verification)
**Data flow:** batch (paste-only artifact, not preserved as in-app i18n)
**Analog:** `06-03-PLAN.md` (exact)

**Cadence:** Step 1 = draft EN body (≤500 chars) → Step 2 = draft RU body (≤500 chars, parity to EN) → Step 3 = run `wc -m` per locale → Step 4 = emit `05-RELEASE-NOTES.md` artifact. Trim priority per 06-RELEASE-NOTES.md:107-112.

**M3 content seed (per CONTEXT.md `Release notes emphasis`):**
- What's new bullet 1: 6-step contextual listing flow.
- What's new bullet 2: KG/KZ/UZ expansion (no Bishkek-only phrasing per memory `geographic-scope.md`).
- Improvements: stability + polish.
- Bug fixes: M1 D-10 catch-all closer line.

---

### Plan: `05-05-PLAN.md` (QA matrix walk)

**Role:** plan (per-cell walk verdict capture)
**Data flow:** event-driven (PASS / FAIL / PARTIAL / DEFERRED-USER-APPROVED per cell per device)
**Analog:** `06-06-PLAN.md` (exact)

**Cadence:** Pre-conditions check → matrix-by-matrix walk → per-cell verdict → end-of-walk roll-up totals → walk_disposition flip (APPROVED if zero FAILs, BLOCKED if any FAIL triggers bug-fix loop). The plan body references 05-QA-MATRIX.md as the source of truth; the plan tracks "matrix walked: yes/no" per matrix, not per cell.

**Deferral discipline from M2 (06-QA-MATRIX.md frontmatter `deferrals.race_cells`):** Phase 5 inherits the M4+ deferral of race cells per memory `phase06-m3-carry-forward.md`. The plan must explicitly request user sign-off on the DEFERRED-USER-APPROVED cells before walk start (T-06-33 option (b) precedent).

---

### Plan: `05-06-PLAN.md` (paired-gate verifier+reviewer)

**Role:** plan (gsd-verifier + gsd-code-reviewer dual invocation per memory `gsd-verifier-misses-regressions.md`)
**Data flow:** request-response (verifier returns goal-backward verdict; reviewer returns regression-forward verdict)
**Analog:** No direct M2 Phase 6 analog — closest is the pattern memory `gsd-verifier-misses-regressions.md` describes (M2 Phase 1 close: verifier said PASS 15/15 while reviewer found 2 CRITICAL regressions).

**Cadence:** Step 1 = invoke `/gsd-verify-work 5`; Step 2 = invoke `/gsd-code-review 5`; Step 3 = aggregate verdicts; Step 4 = decide phase-close GREEN / YELLOW / RED. Both gates must clear before Plan 05-07 (submission).

**Note on lack of analog:** Phase 4 itself ran both gates per `04-REVIEW.md` (the file we just read — it is the Phase 4 reviewer output). The planner can reference Phase 4's REVIEW.md as the format reference for what gsd-code-review output looks like (frontmatter + Critical/High/Medium/Low sections + Security Invariant Verification table).

---

### Plan: `05-07-PLAN.md` (dual-store submission)

**Role:** plan (archive + upload + paste-notes for both stores)
**Data flow:** batch (operator-supervised dual-track upload)
**Analog:** `06-07-PLAN.md` (exact)

**Cadence:** Task 0 = upstream-gates check (read 05-INHERITANCE-AUDIT.md `proceed_with_inheritance: true` + 05-RELEASE-NOTES.md char counts + 05-PREFLIGHT.md `health_check_status: 200` + 05-QA-MATRIX.md `walk_disposition: APPROVED`); Task 1 = iOS archive via Xcode 26.x → ASC upload → paste EN+RU notes; Task 2 = Android `./gradlew :react-native-reanimated:assembleRelease :app:bundleRelease` → upload to Play Console Internal Testing → paste EN+RU notes; Task 3 = emit `05-SUBMISSION-LOG.md` with status `submitted_processing`.

**Memory anchor (Android build):** `android-reanimated-clean-prefab-gotcha.md` — DO NOT use `gradlew clean bundleRelease`. Use `./gradlew :react-native-reanimated:assembleRelease :app:bundleRelease` instead. The plan body must explicitly cite this — otherwise the operator may default to the incorrect canonical command.

---

### Source-code edit: `backend: src/scripts/migrate-landlord-app-uid-mismatch.js` (MEDIUM-01)

**Role:** script (operator-supervised migration)
**Data flow:** batch (cursor walk over LandlordApplication)
**Analog:** sibling script `backend: src/scripts/migrate-listings-m3.js` (per Phase 4 `04-REVIEW.md` MEDIUM-01: "the sibling script (`migrate-listings-m3.js`) does the opposite: it exits early inside `if (isVerify)` before any mutation loop, making `--verify=PASS` a read-only acceptance check")

**Current implementation (excerpt — `migrate-landlord-app-uid-mismatch.js:192-242`):**
```javascript
async function main() {
  await connectDB();

  const mode = isVerify ? 'verify' : (isDryRun ? 'dry-run' : 'live');
  console.log(`== migrate-landlord-app-uid-mismatch — mode=${mode} ==`);

  // Cursor-based per-doc walk (mirrors migrate-listings-m3.js:291-301).
  const cursor = LandlordApplication.find({}).cursor();
  let flipped = 0;
  let orphaned = 0;
  let skipped = 0;
  for await (const app of cursor) {
    const r = await processApplication(app, { dryRun: isDryRun });
    // ... cursor walk runs LIVE writes when isVerify=true (because isDryRun=false)
  }

  console.log(`== summary: flipped=${flipped} orphaned=${orphaned} skipped=${skipped} ==`);

  if (isVerify) {
    // Invariant probe — runs AFTER the cursor walk, not before.
    const submittedApps = await LandlordApplication.find({ status: 'submitted' });
    let unresolved = 0;
    for (const app of submittedApps) {
      const owner = await User.findOne({ uid: app.uid });
      if (!owner) unresolved++;
    }
    if (unresolved === 0) {
      console.log('VERIFY=PASS: all submitted applications have a resolvable uid.');
      await mongoose.disconnect();
      process.exit(0);
    }
    console.error(`VERIFY=FAIL: ${unresolved} submitted application(s) have unresolvable uid.`);
    await mongoose.disconnect();
    process.exit(1);
  }

  await mongoose.disconnect();
}
```

**Surgical fix (per Phase 4 REVIEW.md MEDIUM-01 fix path (a)):** Hoist the `if (isVerify)` block to BEFORE the cursor walk; return/exit there so verify mode never enters the live cursor walk:

```javascript
async function main() {
  await connectDB();

  const mode = isVerify ? 'verify' : (isDryRun ? 'dry-run' : 'live');
  console.log(`== migrate-landlord-app-uid-mismatch — mode=${mode} ==`);

  if (isVerify) {
    // Pure probe — no writes. Match migrate-listings-m3.js sibling pattern.
    const submittedApps = await LandlordApplication.find({ status: 'submitted' });
    let unresolved = 0;
    for (const app of submittedApps) {
      const owner = await User.findOne({ uid: app.uid });
      if (!owner) unresolved++;
    }
    if (unresolved === 0) {
      console.log('VERIFY=PASS: all submitted applications have a resolvable uid.');
      await mongoose.disconnect();
      process.exit(0);
    }
    console.error(`VERIFY=FAIL: ${unresolved} submitted application(s) have unresolvable uid.`);
    await mongoose.disconnect();
    process.exit(1);
  }

  // Cursor-based per-doc walk — only reached for dry-run or live modes.
  const cursor = LandlordApplication.find({}).cursor();
  // ... rest unchanged
}
```

**read_first directive (planner):**
- Read `migrate-landlord-app-uid-mismatch.js:192-242` (lines 192-242, the `main()` function — already in context above) before writing the edit.
- Read `migrate-listings-m3.js` `main()` function for the sibling early-exit pattern to confirm structure parity (NOT yet read; Plan 05-01 step 2 invokes this script and the planner can pick the pattern up at edit time).

**Plan placement:** This edit lands BEFORE Plan 05-01 step 7 (`migrate-landlord-app-uid-mismatch.js --verify=PASS`) — i.e., as part of Plan 05-01 prep, OR as its own micro-plan slotted before Plan 05-01. Per CONTEXT.md `Claude's Discretion`, the recommendation is to fold it in.

**Test impact:** The existing 10 unit tests for `classifyRow` / `alreadyFlippedByMigration` / `processApplication` are NOT affected (they import the helpers, not `main()`). No new test required; the integration test for the migration end-to-end behavior already covers idempotency.

---

### Source-code edit: `backend: src/routes/moderationRoutes.js` (MEDIUM-02 — 5 handlers)

**Role:** route handler (REST POST)
**Data flow:** request-response
**Analog:** **same file** — the existing DELETE `/listings/:id/media` handler at lines 347-353 already implements the exact pattern. Copy it to 5 sites.

**Existing pattern (in-file analog — lines 347-353):**
```javascript
    // middleware (verifyFirebaseToken + requireMinRole('moderator')), so
    // unauthenticated callers continue to get 401 — not 400. Uses
    // `mongoose.Types.ObjectId.isValid()` per established repo convention
    // (favoriteRoutes.js:90).
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ code: 'INVALID_ID', message: 'Invalid listing id' });
    }
```

**5 application sites:**

| # | Route | Line | Current implementation excerpt | Insertion point |
|---|-------|------|-------------------------------|-----------------|
| 1 | `POST /properties/:id/approve` | 83 | `router.post('/properties/:id/approve', async (req, res) => { try { ... const candidate = await Property.findById(req.params.id, ...).lean();` | After `try {` (before line 98 `Property.findById`) |
| 2 | `POST /listings/:id/media` | 200 | `router.post('/listings/:id/media', handleMediaUploadErrors, async (req, res, next) => { try { const photoUrls = ...` | After `try {` at line 204 |
| 3 | `POST /properties/:id/reject` | 428 | `router.post('/properties/:id/reject', async (req, res) => { try { const { reasonCode, reasonNote } = req.body; ... if (!reasonCode || !VALID_REJECT_CODES.includes(reasonCode)) { return res.status(400).json({...}); }` | After `try {` and BEFORE the existing reasonCode 400 check at line 433 (so INVALID_ID short-circuits before destructuring is referenced) |
| 4 | `POST /properties/:id/archive` | 518 | `router.post('/properties/:id/archive', async (req, res) => { try { const { reasonCode, reasonNote } = req.body; ... if (!reasonCode || !VALID_REJECT_CODES.includes(reasonCode)) { ... }` | After `try {` and BEFORE the existing reasonCode 400 check at line 523 |
| 5 | `POST /properties/:id/restore` | 620 | `router.post('/properties/:id/restore', async (req, res) => { try { const now = new Date(); ... const beforeDoc = await Property.findById(req.params.id).lean();` | After `try {` at line 621 (before the `const now = new Date()` line) |

**Surgical edit pattern (apply to all 5 sites):**
```javascript
router.post('/properties/:id/<action>', async (req, res) => {
  try {
+   // MEDIUM-02 (Phase 5) — return 400 INVALID_ID for malformed ObjectIds before
+   // any DB lookup. Mirrors the DELETE /listings/:id/media handler at line 347-353.
+   // Router-level requireMinRole('moderator') still gates auth → unauth callers get 401.
+   if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
+     return res.status(400).json({ code: 'INVALID_ID', message: 'Invalid listing id' });
+   }
    // ... existing handler body unchanged
```

**`mongoose` import check:** Confirm `mongoose` is already imported at the top of moderationRoutes.js (it is — used at line 351). No new import needed.

**read_first directive (planner):**
- Read `moderationRoutes.js:1-50` to confirm `mongoose` import (NOT yet read; planner verifies at edit time).
- Read `moderationRoutes.js:347-353` (already in context above) for the canonical guard pattern.
- For each of the 5 sites, read 5-10 lines before the `try {` to confirm the right insertion anchor (lines 83 / 200 / 428 / 518 / 620 already excerpted above).

**Test impact:** Add 5 new supertest cases (or one parameterized test) covering `request(app).post('/properties/banana/<action>').set('Authorization', `Bearer ${token}`).expect(400)` and assert `body.code === 'INVALID_ID'`. The existing `moderationRoutes.test.js` already has the DELETE-route version (per Phase 4 REVIEW.md line 193 — "verified via the two new supertest cases in `moderationRoutes.test.js`").

**Plan placement:** This edit can land in the same micro-plan as MEDIUM-01, OR as part of a "Phase 4 review carry-forward polish" sub-plan. Per CONTEXT.md `Claude's Discretion`, the recommendation is to fold it in if researcher confirms grep coverage of the 5 sites — the grep is now complete (5 sites confirmed at lines 83, 200, 428, 518, 620).

---

### Config edit: `RN client: package.json` (version bump)

**Role:** config (single-line edit at line 3)
**Analog:** in-file — line 3 currently reads `"version": "2.0.0",`. Atomic bump as part of the 3-file commit per Plan 05-03.

**Surgical edit:** Line 3: `"version": "2.0.0",` → `"version": "3.0.0",`. No other lines touched.

**Verification:** `grep -n '"version":' package.json` → `3:  "version": "3.0.0",`.

---

### Config edit: `RN client: ios/JayTap.xcodeproj/project.pbxproj`

**Role:** config (Xcode project — 4 anchor lines: Debug + Release × MARKETING_VERSION + CURRENT_PROJECT_VERSION)
**Analog:** in-file — current state was confirmed above.

**Current state (concrete strings):**
- Line 274: `				CURRENT_PROJECT_VERSION = 27;` (Debug)
- Line 283: `				MARKETING_VERSION = 2.0.0;` (Debug)
- Line 308: `				CURRENT_PROJECT_VERSION = 27;` (Release)
- Line 316: `				MARKETING_VERSION = 2.0.0;` (Release)

**Surgical edit:**
- Line 274: `27` → `28`
- Line 283: `2.0.0` → `3.0.0`
- Line 308: `27` → `28`
- Line 316: `2.0.0` → `3.0.0`

**Verification:** `grep -n -E 'MARKETING_VERSION|CURRENT_PROJECT_VERSION' ios/JayTap.xcodeproj/project.pbxproj` → 4 lines: 28 / 3.0.0 / 28 / 3.0.0. Both Debug and Release configs MUST match — partial bump rejected at archive time.

---

### Config edit: `RN client: android/app/build.gradle`

**Role:** config (gradle defaultConfig)
**Analog:** in-file.

**Current state (concrete strings — lines 91-92):**
```
        versionCode 30
        versionName "2.0.0"
```

**Surgical edit:**
- Line 91: `versionCode 30` → `versionCode 31`
- Line 92: `versionName "2.0.0"` → `versionName "3.0.0"`

**Verification:** `grep -n -E 'versionCode|versionName' android/app/build.gradle`. Cross-check against `05-STORE-HISTORY.md` `derived_targets.next_android_version_code: 31` (the binding source — NOT this file per memory `release-android-versioncode-trust-play-console.md`).

---

### Optional doc create: `RN client: scripts/release-android.md`

**Role:** doc (operator runbook — NEW file)
**Analog:** None directly. The closest content is `06-SUBMISSION-LOG.md §Known issue` block (lines 128-138, in context above) describing the prefab gotcha + workaround.

**File status:** **Does NOT exist.** `ls /Users/beckmaldinVL/development/mobileApps/JayTap/scripts/*.md` returns no matches. The directory contains only `.sh` scripts (archive-ios.sh, check-create-listing-screen-removed.sh, check-i18n-parity.sh, check-land-removed.sh, check-role-grep.sh).

**Per CONTEXT.md `Claude's Discretion › Android clean bundleRelease workaround`:** Creation is OPTIONAL. Fold if researcher/planner confirms value over plan-count cost; punt to M4 if it adds plan count without immediate need. The Phase 5 operator already has the workaround documented in 05-SUBMISSION-LOG.md `known_issue.android_clean_build_failure.fix` (which Plan 05-07 will write).

**If creating:** Use a minimal template:
```markdown
# Android Release Build Runbook

**TL;DR:** Do NOT use `./gradlew clean bundleRelease`. The `clean` task wipes
react-native-reanimated's release prefab artifacts that `:app:bundleRelease`
needs.

**Use instead:**
\`\`\`bash
cd android && ./gradlew :react-native-reanimated:assembleRelease :app:bundleRelease
\`\`\`

**Why:** [paste from 06-SUBMISSION-LOG.md known_issue block]

**Outputs:** `android/app/build/outputs/bundle/release/app-release.aab`
```

**Recommendation:** Punt to M4 unless the Phase 5 operator explicitly wants a separate runbook. The `known_issue` block in 05-SUBMISSION-LOG.md is sufficient operator-readable evidence within Phase 5.

---

## Shared Patterns

### Frontmatter convention (all 6 companion docs)

**Source:** Every M2 Phase 6 companion doc opens with a YAML frontmatter block bracketed by `---` lines.
**Apply to:** All 6 Phase 5 companion docs.
**Required keys:** `phase`, `plan`, `type`, plus per-doc-type extras.
**Pattern:**
```yaml
---
phase: 05-hardening-manual-qa-release-v3
plan: <01..07>
type: <preflight-evidence | store-history | inheritance-audit | verification-matrix | release-notes | submission-log>
...
---
```

### Cell verdict marker legend (matrix-style docs)

**Source:** `06-QA-MATRIX.md:67-74`
**Apply to:** `05-QA-MATRIX.md`
**Verbatim copy:**
```
- ✅ PASS — observed expected behavior on the listed device
- ❌ FAIL — regression observed; bug-fix loop opens
- ⚠ PARTIAL — security-critical part PASS; auxiliary part deferred
- 🅓 DEFERRED-USER-APPROVED — formally deferred; follow-up backlog item recorded
- — N/A — cell intentionally not applicable on this device
- ☐ Pending — not yet walked
```

### Re-open conditions block (every artifact)

**Source:** All 6 M2 Phase 6 companion docs end with a `## Re-open conditions` section listing what would invalidate the artifact's evidence.
**Apply to:** All 6 Phase 5 companion docs (PREFLIGHT, STORE-HISTORY, INHERITANCE-AUDIT, QA-MATRIX, RELEASE-NOTES, SUBMISSION-LOG).
**Pattern:** Bullet list of future events that would re-open the item; explicit cross-reference to the section that captured the original evidence.

### Cross-references block (companion docs that depend on prior phases)

**Source:** `06-INHERITANCE-AUDIT.md:258-265`
**Apply to:** All 6 Phase 5 companion docs.
**Pattern:** Final `## Cross-references` section linking to:
- Memory anchors used (e.g., `m2-shipped-2026-05-05.md`, `geographic-scope.md`).
- M2 Phase 6 precedent file (this is the dominant analog source).
- M3 anchor SPEC + ROADMAP rows.
- Companion docs in the same phase that reference each other.

### Atomic-commit convention (version bump)

**Source:** M1 D-02 + M2 Wave-1 lesson (`release-android-versioncode-trust-play-console.md` + RETROSPECTIVE.md Key Lesson #1).
**Apply to:** Plan 05-03 (atomic v3.0.0 bump).
**Rule:** RN package.json + iOS pbxproj (4 lines) + Android build.gradle (2 lines) all bump in a SINGLE commit. No partial-bump intermediate. Commit message per M2: `chore(05-03): bump version to 3.0.0 (REL-01 + REL-02 atomic 3-file commit)`.

### EN+RU lockstep (i18n parity gate)

**Source:** M1 + M2 + M3 invariant — every UI string change lands in both `src/locales/en.ts` + `src/locales/ru.ts` in the same commit; parity gate enforces.
**Apply to:** `05-RELEASE-NOTES.md` body (EN + RU bullets in lockstep) AND any QA matrix cell that surfaces a missing-key bug during the Russian-locale sweep (Matrix 6 in 05-QA-MATRIX.md).
**Verification command:** `bash scripts/check-i18n-parity.sh` (already chained into `npm test`).

### Paired-gate close discipline

**Source:** Memory `gsd-verifier-misses-regressions.md`.
**Apply to:** Plan 05-06 (paired-gate verifier+reviewer).
**Rule:** gsd-verifier alone misses regressions. Both gates MUST clear at phase close: `/gsd-verify-work 5` AND `/gsd-code-review 5`. The reviewer output format reference is `04-REVIEW.md` (Phase 4's own paired-gate close — frontmatter + Critical/High/Medium/Low sections + Security Invariant Verification table).

### Operator-supervised migration cadence

**Source:** Phase 1 + Plan 02-01 + Phase 4 D-09.
**Apply to:** Plan 05-01 steps 2-7 (migrate-listings-m3 + migrate-landlord-app-uid-mismatch) and steps 9-11 (seed-locations).
**Pattern (3 invocations per script):**
1. `<script> --dry-run` → review output (per-doc plan, expected count, no writes).
2. `<script>` → live execution.
3. `<script> --verify=PASS` → exit 0 = invariant holds; exit 1 = data error; exit 2 = misuse (Node version / arg format).

### Anti-Bishkek-only phrasing in user-facing copy

**Source:** Memory `geographic-scope.md`.
**Apply to:** `05-RELEASE-NOTES.md` EN + RU bodies.
**Rule:** No "Bishkek-only" phrasing. KG/KZ/UZ scope. Even if v3.0 ships only Bishkek + KG city seeds, the language must accommodate planned KZ/UZ expansion.

---

## No Analog Found

None. Every file-to-create-or-modify in Phase 5 has a concrete analog in either M2 Phase 6, the same file (in-file analog), the sibling migration script, or memory-recorded precedent. Confidence: high — Phase 5 is by design a precedent-reuse phase, not a novel-pattern phase.

---

## Metadata

**Analog search scope:**
- `.planning/milestones/v2.0-phases/06-hardening-manual-physical-device-qa-release/` (all 7 PLAN files + 6 companion docs + 7 SUMMARY files — directory listing read; 4 companion docs + 5 plan-file headers read in detail).
- `.planning/phases/04-m2-carry-forward-bug-fixes/REVIEW.md` (Phase 4 paired-gate review — read in full).
- `backend: src/scripts/migrate-landlord-app-uid-mismatch.js` (read lines 1-260 — full file).
- `backend: src/routes/moderationRoutes.js` (read 5 non-overlapping ranges around lines 83 / 200 / 347 / 428 / 518 / 620 — surgical 25-line windows + the existing INVALID_ID guard at 347-353 via grep).
- `RN client: package.json` (read in full — 56 lines).
- `RN client: android/app/build.gradle` (read in full — 137 lines).
- `RN client: ios/JayTap.xcodeproj/project.pbxproj` (grep for MARKETING_VERSION + CURRENT_PROJECT_VERSION — 4 anchor lines confirmed).
- `RN client: scripts/` (directory listing — confirmed `release-android.md` does NOT exist).

**Files scanned:** 14 files read (4 M2 Phase 6 companion docs full + 1 backend script full + 5 small ranges in moderationRoutes.js + 2 RN config files full + 1 grep over pbxproj + 2 directory listings + 1 Phase 4 REVIEW.md full + 05-CONTEXT.md full).

**Pattern extraction date:** 2026-05-07.

**Re-read avoidance log:** No file or range was re-read after initial extraction. Companion docs were each read once; backend script read once; moderationRoutes.js was read in 5 non-overlapping windows totaling ~125 lines (vs ~700-line file size — targeted reads only).

**Dominant pattern call:** M2 Phase 6 supplies 11 of 14 analog mappings directly. The planner should bias VERY HEAVILY toward verbatim format reuse and only diverge where M3 specifics demand (e.g., 13-step pre-flight broader than M2's backend-deploy-only; QA matrix `satisfies:` column extension; 3.0.0 + bumped iOS build 28 + Android versionCode 31 numeric values).

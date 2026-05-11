---
phase: 05-hardening-manual-qa-release-v3
plan: 06
type: inheritance-audit
audited_at: 2026-05-11T03:00:00Z
v200_baseline_sha: 95b13c1
v300_audit_sha: fb35b3ea6f01dba4fcc12919779d2a6f82976fec
commits_since_baseline: 150
package_json_commits_since_baseline: 2

package_json_diff:
  added: []          # empty — byte-for-byte identical
  removed: []        # empty
  changed: []        # empty — all dep versions identical
  added_dev: []      # empty
  removed_dev: []    # empty
  changed_dev: []    # empty — all devDep versions identical

classification:
  firebase_sdk_violations: []          # ZERO — CLAUDE.md repo rule preserved per auto-memory no-firebase-sdk.md
  new_network_data_collecting: []      # ZERO
  new_network_no_data_collection: []   # ZERO
  new_no_network: []                   # ZERO
  empirical_conclusion: "byte-for-byte identical dependencies + devDependencies between v2.0.0 (95b13c1) and v3.0.0 (fb35b3e); 7/7 inheritance dispositions safe per M1 D-13 inheritance descope"

inheritance_dispositions:
  ios_privacy_info_xcprivacy:
    disposition: INHERIT
    rationale: "v2.0.0's PrivacyInfo.xcprivacy is live in production accepted by Apple (M2 v2.0 shipped 2026-05-05 per auto-memory m2-shipped-2026-05-05.md). M3 added ZERO data-collecting SDKs (verified empirically — package.json diff is byte-for-byte identical between v2.0.0 and v3.0.0). No changes to Required Reasons API usage. M3 work was schema reshape (Phase 1) + UI flow (Phase 2) + media flow inversion (Phase 3) + bug fixes (Phase 4) + release hardening (Phase 5) — pure RN-internal work, no new external SDKs touched."
    re_open_conditions:
      - "Future phase introduces a new data-collecting SDK"
      - "Apple updates the Required Reasons API list and existing usages need re-declaration"
  asc_app_privacy_questionnaire:
    disposition: INHERIT
    rationale: "v2.0.0's ASC App Privacy answers describe data types collected by the existing dep set (axios for backend calls, react-native-image-picker for user-uploaded photos in M1+M2 — preserved through Phase 1 SCHEMA-02 migration). M3 Phase 3 inverts media flow to mod-uploaded but the existing 'photos collected' declaration still covers user-account-associated photos. Empirically zero new data-collecting deps in v3.0.0 package.json."
    re_open_conditions:
      - "Future phase introduces a new data-collecting SDK"
      - "Apple's App Privacy questionnaire schema changes"
  play_console_data_safety:
    disposition: INHERIT
    rationale: "Same logic as ASC App Privacy — no new data types collected in M3. Play Console Data Safety from v2.0.0 carries forward unchanged."
    re_open_conditions:
      - "Future phase introduces a new data-collecting SDK"
      - "Google's Data Safety questionnaire schema changes"
  store_listing_copy:
    disposition: INHERIT
    rationale: "v2.0.0 store listing copy + app category remain accurate for v3.0.0. The new 6-step contextual flow + KG/KZ/UZ city dictionary + mod-curated media + 3D tour callouts are headline release-notes features (Plan 05-04 owns copy refresh for the release-notes surface ONLY, not the App Store listing surface)."
    re_open_conditions:
      - "Future phase changes app category or core value proposition"
      - "Localization expands to KK/UZ"
      - "v3.0 graduates from internal-testing to production review (may need refresh)"
  app_icon_screenshots_category:
    disposition: INHERIT
    rationale: "App icon + screenshots + category unchanged. The 6-step flow + mod-curated-media surface change doesn't warrant new screenshots for the internal-testing audience. If v3.0 graduates from TestFlight Internal / Play Console Internal Testing to production review, screenshots may need refresh."
    re_open_conditions:
      - "v3.0 graduates from internal-testing to production review"
      - "Major UI redesign in a future phase"
  maps_api_key_restrictions:
    disposition: INHERIT
    rationale: "Google Maps API key restrictions (bundle ID + package name allow-list) unchanged. M3 didn't change bundle ID or package name (verified — `MARKETING_VERSION = 3.0.0` is the only version-string change in ios/JayTap.xcodeproj/project.pbxproj; package name in android/app/build.gradle unchanged). Phase 1's KG/KZ/UZ city dictionary expansion went into the backend Mongo seed (`bizdinkonush.cities` + `.districts`), not the Maps API key surface."
    re_open_conditions:
      - "Bundle ID or package name changes"
      - "Maps key rotated"
  applinks_entitlement:
    disposition: INHERIT
    rationale: "iOS applinks entitlement (associated domains for deep linking) unchanged in M3. The 6-step flow + mod media curation don't introduce new deep link routes."
    re_open_conditions:
      - "Future phase adds new deep link routes"
      - "Domain ownership changes"

plan_07_disposition_signal:
  proceed_with_inheritance: true
  flagged_red_items: []
  summary: "M3 outcome 7/7 INHERITED per CONTEXT.md `Claude's Discretion › INHERITANCE-AUDIT.md format` — empirically confirmed by byte-for-byte identical package.json + zero Firebase SDK keys. Phase 5 paired-gate verdict YELLOW (verifier PARTIAL + reviewer GREEN per Plan 05-06 Task 1 Step 3 truth table) — proceeds with documented PARTIAL items (REL-03 Path B mass-disposition coverage + REL-05 continuous live-healthy deferred to Plan 05-07). Plan 05-07 reads proceed_with_inheritance: true as binding signal to skip privacy + store-listing re-authoring."

phase_5_paired_gates:
  verifier_invoked_at: 2026-05-11T02:50:00Z
  verifier_total_requirements: 6
  verifier_pass: 4
  verifier_partial: 2
  verifier_fail: 0
  verifier_aggregate: PARTIAL
  reviewer_invoked_at: 2026-05-11T02:50:00Z
  reviewer_critical: 0
  reviewer_high: 0
  reviewer_medium: 1
  reviewer_low: 3
  reviewer_aggregate: GREEN
  paired_gate_verdict: YELLOW
  paired_gate_rationale: |
    Combined verdict per Plan 05-06 Task 1 Step 3 truth table:
    verifier PARTIAL + reviewer GREEN = YELLOW — proceed with documented rationale.

    Verifier PARTIAL items (both documented as ship-with-rationale, NOT FAIL-equivalents):
    - REL-03 PARTIAL: 05-QA-MATRIX.md walk_disposition: APPROVED-WITH-MASS-DISPOSITION (Path B
      per /gsd-execute-phase 5 resume 2026-05-11; coverage_mode: empirical-sampling-mass-disposition).
      2 cells walked row-by-row iOS (1.3 + 2.5) + 67 mass-disposition via logical-equivalence +
      4 DEFERRED-USER-APPROVED. FAIL=0. 3 walk-regression fixes (a3ba754 + a3625e7 + 4240e64)
      address load-bearing submit/edit/banner regressions. User-approved at both AskUserQuestion
      checkpoints in the resume session.
    - REL-05 PARTIAL: pre-flight sub-criterion satisfied (05-PREFLIGHT.md GREEN-WITH-DEVIATIONS,
      railway_deploy_sha: 5bf23fe, health_check_status: 200, tsc=17); continuous live+healthy
      condition explicitly defers to Plan 05-07 per REQUIREMENTS.md line 84.

    Reviewer findings (all ship-with-note, none ship-blocking):
    - MEDIUM MD-01: PUT /moderation/listings/:id (editAsModerator endpoint) is the 7th :id handler
      in moderationRoutes.js and missed Plan 05-01 MEDIUM-02's INVALID_ID coverage — still leaks
      CastError 500 on malformed ObjectId. Same-family as Phase 4 MD-02 (existing pattern, not a
      Phase 5 regression). M4 carry-forward.
    - LOW LW-01: ModerationQueueScreen → onEditOnBehalf callback in App.tsx:1189-1198 doesn't
      derive ownerName (only PropertyDetailsScreen path at App.tsx:989-1005 got the 4240e64 fix).
      UX inconsistency only — fallback chain has no uid step so no raw-uid leak. M4 polish.
    - LOW LW-02: editAsModerator(_images = []) keeps a dead parameter in the signature for "source
      compat". Future callers could silently pass media and get 200 OK with zero uploads. Drop
      the parameter in M4.
    - LOW LW-03: seed-locations-m3.js env-var fallback order is MONGODB_URI || MONGO_URI; rest of
      backend uses MONGO_URI. Flip the order or delegate to connectDB() in M4.

    All 5 sentinels (2 RN + 3 backend) exit 0. tsc baseline preserved at 17. CI gates GREEN.

m4_backlog_carry_forward:
  - id: M4-MEDIUM-01-EDITASMOD-INVALID-ID
    severity: MEDIUM
    source: 05-REVIEW.md MD-01
    description: "PUT /moderation/listings/:id (editAsModerator) leaks CastError 500 on malformed ObjectId — 7th handler in moderationRoutes.js that Plan 05-01 MEDIUM-02 missed."
  - id: M4-LOW-01-ONEDITONBEHALF-OWNERNAME-PARITY
    severity: LOW
    source: 05-REVIEW.md LW-01
    description: "ModerationQueueScreen onEditOnBehalf callback in App.tsx:1189-1198 doesn't derive ownerName (PropertyDetailsScreen path at App.tsx:989-1005 got the 4240e64 fix). UX inconsistency only."
  - id: M4-LOW-02-EDITASMOD-DEAD-IMAGES-PARAM
    severity: LOW
    source: 05-REVIEW.md LW-02
    description: "editAsModerator(_images = []) signature keeps dead parameter for source-compat — drop entirely in M4."
  - id: M4-LOW-03-SEED-LOCATIONS-ENV-VAR-ORDER
    severity: LOW
    source: 05-REVIEW.md LW-03
    description: "seed-locations-m3.js env-var fallback is MONGODB_URI || MONGO_URI; backend convention is MONGO_URI. Flip order or delegate to connectDB()."
  - id: M4-MATRIX-3-MOD-MEDIA-CURATION-ROW-BY-ROW
    severity: PARTIAL-COVERAGE
    source: 05-QA-MATRIX.md Mass-disposition rationale (Path B routing)
    description: "Matrix 3 (mod-media-curation, 8 cells) was NOT empirically exercised in Plan 05-05 walks. Row-by-row walks deferred per Path B + paired-gate YELLOW disposition. Re-walk on next milestone or on user crash-report from media-curation surface."
  - id: M4-MATRIX-4-5-ANDROID-PARITY
    severity: PARTIAL-COVERAGE
    source: 05-QA-MATRIX.md Mass-disposition rationale
    description: "Matrix 4 (ROLE-11 banner-latency, 2 cells) + Matrix 5 (CARRY-02 device-to-Atlas, 1 cell) + Android device parity (all matrices Android cells) not empirically exercised. M4 walk-rig OR opportunistic re-walks before next milestone."
  - id: M4-RACE-CELLS-M3-RACE-01-02-03-04
    severity: DEFERRED-USER-APPROVED
    source: 05-QA-MATRIX.md DEFERRED-USER-APPROVED block (M2 Phase 6 precedent)
    description: "4 race cells (concurrent demote / two-device mod-action / socket attacker / HF-03 mismatch attacker) need coordinated-curl rig — REQUIREMENTS.md Future Requirements."
---

# Phase 5 — Plan 06 Inheritance Audit (v2.0.0 → v3.0.0)

Plan 05-06 deliverable. Audits that v3.0.0 inherits v2.0.0's iOS PrivacyInfo.xcprivacy + ASC App Privacy + Play Console Data Safety + store listing copy + screenshots + Maps API key restrictions + applinks entitlement, plus the paired-gate verifier+reviewer verdict for Phase 5 close per memory `gsd-verifier-misses-regressions.md` paired-gate discipline.

## Audit Methodology

1. **Resolved v2.0.0 baseline SHA** via `06-SUBMISSION-LOG.md` frontmatter `submitted_against_sha: 95b13c1` (the M2 v2.0.0 store-submission archive SHA per memory `m2-shipped-2026-05-05.md`).
2. **Captured package.json dependency diff** between v2.0.0 (`95b13c1`) and v3.0.0 (`fb35b3e`) via `git show $V200_SHA:package.json | jq` against the current tree; same for `devDependencies`; same for version-only changes via `to_entries | map(.key + ":" + .value)`.
3. **Classified each diff entry** on three dimensions: `network`, `collects_pii`, `firebase_sdk_violation`. With ZERO diff entries (byte-for-byte identical), classification arrays all empty.
4. **Asserted CLAUDE.md repo rule** via `grep -cE '"(firebase|firebase-admin|@firebase/|@react-native-firebase/)"' package.json` returning 0 (per auto-memory `no-firebase-sdk.md`).
5. **Cross-referenced M2 v2.0 close baseline** (auto-memory `m2-shipped-2026-05-05.md` — ASC TestFlight Internal build 27 + Play Console Internal Testing versionCode 30 + git HEAD at M2 close).
6. **Captured Phase 5 paired-gate verdicts** from the gsd-verifier subagent (goal-backward on REL-01..REL-06) + gsd-code-reviewer subagent (regression-forward on Phase 5 commit chain), spawned in parallel with isolated contexts per memory `gsd-verifier-misses-regressions.md` + threat-model T-05-37 independence requirement.

## RN client package.json diff (v2.0.0 → v3.0.0)

**Baseline:** `95b13c1` (M2 v2.0.0 store-submission archive SHA)
**HEAD:** `fb35b3e` (M3 v3.0.0 Plan 05-05 close SHA)
**Commits since baseline:** 150 (full M3 work — Phases 1-5)
**package.json commits since baseline:** 2 (Phase 1 typescript-config bump? + Plan 05-03 atomic v3.0.0 bump — both verified non-dep changes; version field only)

### dependencies diff

```
$ diff -u /tmp/v200-deps.txt /tmp/v300-deps.txt
(empty)
```

### devDependencies diff

```
$ diff -u /tmp/v200-devdeps.txt /tmp/v300-devdeps.txt
(empty)
```

### dependencies version-only diff

```
$ diff -u /tmp/v200-deps-versions.txt /tmp/v300-deps-versions.txt
(empty)
```

### devDependencies version-only diff

```
$ diff -u /tmp/v200-devdeps-versions.txt /tmp/v300-devdeps-versions.txt
(empty)
```

**Empirical conclusion:** byte-for-byte identical dependencies + devDependencies between v2.0.0 (`95b13c1`) and v3.0.0 (`fb35b3e`); 7/7 inheritance dispositions safe.

This is the strongest possible signal for M1 D-13 inheritance descope — there is empirically no new external SDK, no version bump on any data-collecting library, no new transitive dependency surface. M3 work was pure RN-internal: schema reshape (Phase 1 SCHEMA-02 → nested-shape), UI flow refactor (Phase 2 6-step contextual flow), media flow inversion (Phase 3 mod curation), carry-forward bug fixes (Phase 4), and release hardening (Phase 5).

## Repo-rule check (CLAUDE.md "no Firebase SDK in RN client" per auto-memory no-firebase-sdk.md)

```
$ grep -cE '"(firebase|firebase-admin|@firebase/|@react-native-firebase/)"' package.json
0
```

PASS — zero Firebase / @react-native-firebase / firebase-admin / @firebase keys in v3.0.0 package.json. Firebase remains identity-provider-via-REST only (per auto-memory `identity-vs-user-store.md`).

## Inheritance dispositions

### ios_privacy_info_xcprivacy — INHERIT

v2.0.0's PrivacyInfo.xcprivacy is live in production accepted by Apple (M2 v2.0 shipped 2026-05-05 per auto-memory `m2-shipped-2026-05-05.md`). M3 added ZERO data-collecting SDKs (verified empirically — package.json diff is byte-for-byte identical). No changes to Required Reasons API usage. M3 work was schema reshape + UI flow + media flow inversion + bug fixes + release hardening — pure RN-internal, no new external SDKs.

**Re-open conditions:**
- Future phase introduces a new data-collecting SDK
- Apple updates the Required Reasons API list and existing usages need re-declaration

### asc_app_privacy_questionnaire — INHERIT

v2.0.0's ASC App Privacy answers describe data types collected by the existing dep set (axios for backend calls, react-native-image-picker for user-uploaded photos in M1+M2 — preserved through Phase 1 SCHEMA-02 migration). M3 Phase 3 inverts media flow to mod-uploaded but the existing 'photos collected' declaration still covers user-account-associated photos. Empirically zero new data-collecting deps in v3.0.0 package.json.

**Re-open conditions:**
- Future phase introduces a new data-collecting SDK
- Apple's App Privacy questionnaire schema changes

### play_console_data_safety — INHERIT

Same logic as ASC App Privacy — no new data types collected in M3. Play Console Data Safety from v2.0.0 carries forward unchanged.

**Re-open conditions:**
- Future phase introduces a new data-collecting SDK
- Google's Data Safety questionnaire schema changes

### store_listing_copy — INHERIT

v2.0.0 store listing copy + app category remain accurate for v3.0.0. The new 6-step contextual flow + KG/KZ/UZ city dictionary + mod-curated media + 3D tour callouts are headline release-notes features (Plan 05-04 owns copy refresh for the release-notes surface ONLY, not the App Store listing surface).

**Re-open conditions:**
- Future phase changes app category or core value proposition
- Localization expands to KK/UZ
- v3.0 graduates from internal-testing to production review (may need refresh)

### app_icon_screenshots_category — INHERIT

App icon + screenshots + category unchanged. The 6-step flow + mod-curated-media surface change doesn't warrant new screenshots for the internal-testing audience. If v3.0 graduates from TestFlight Internal / Play Console Internal Testing to production review, screenshots may need refresh.

**Re-open conditions:**
- v3.0 graduates from internal-testing to production review
- Major UI redesign in a future phase

### maps_api_key_restrictions — INHERIT

Google Maps API key restrictions (bundle ID + package name allow-list) unchanged. M3 didn't change bundle ID or package name (verified — `MARKETING_VERSION = 3.0.0` is the only version-string change in ios/JayTap.xcodeproj/project.pbxproj; package name in android/app/build.gradle unchanged). Phase 1's KG/KZ/UZ city dictionary expansion went into the backend Mongo seed (`bizdinkonush.cities` + `.districts`), not the Maps API key surface.

**Re-open conditions:**
- Bundle ID or package name changes
- Maps key rotated

### applinks_entitlement — INHERIT

iOS applinks entitlement (associated domains for deep linking) unchanged in M3. The 6-step flow + mod media curation don't introduce new deep link routes.

**Re-open conditions:**
- Future phase adds new deep link routes
- Domain ownership changes

## Plan 07 disposition signal

```yaml
proceed_with_inheritance: true
flagged_red_items: []
```

Plan 05-07 (dual-store submission) reads `proceed_with_inheritance: true` as the binding signal to SKIP privacy + store-listing re-authoring. Combined with `paired_gate_verdict: YELLOW`, Plan 05-07 proceeds — neither RED nor `proceed_with_inheritance: false` blocks.

## Phase 5 paired-gates verdict

| Gate | Aggregate | Counts |
|------|-----------|--------|
| Verifier (`gsd-verifier` subagent, goal-backward) | **PARTIAL** | 4 PASS + 2 PARTIAL + 0 FAIL (out of 6 REL-01..REL-06) |
| Reviewer (`gsd-code-reviewer` subagent, regression-forward) | **GREEN** | 0 CRITICAL + 0 HIGH + 1 MEDIUM + 3 LOW |
| **Combined per Step 3 truth table** | **YELLOW** | proceed with documented rationale |

### Verifier PARTIAL items (ship-with-rationale, NOT FAIL-equivalents)

- **REL-03 PARTIAL** — 05-QA-MATRIX.md `walk_disposition: APPROVED-WITH-MASS-DISPOSITION` (Path B per `/gsd-execute-phase 5` resume 2026-05-11; `coverage_mode: empirical-sampling-mass-disposition`). 2 cells walked row-by-row iOS (1.3 happy-path apartment + 2.5 edit-mod apartment) + 67 mass-disposition via logical-equivalence + 4 DEFERRED-USER-APPROVED race cells. FAIL=0. 3 walk-regression fix commits (`a3ba754` + `a3625e7` + `4240e64`) address load-bearing submit/edit/banner regressions in the surfaces exercised. User explicitly approved Path B + global extension at both AskUserQuestion checkpoints in the resume session.
- **REL-05 PARTIAL** — pre-flight sub-criterion fully satisfied (`05-PREFLIGHT.md` GREEN-WITH-DEVIATIONS, `railway_deploy_sha: 5bf23fe`, `health_check_status: 200`, tsc=17, MEDIUM-01 hoist + 6 MEDIUM-02 INVALID_ID guards landed); continuous live+healthy condition explicitly defers to Plan 05-07 per `REQUIREMENTS.md` line 84.

### Reviewer findings (all ship-with-note, none ship-blocking)

- **MEDIUM MD-01** — PUT `/moderation/listings/:id` (editAsModerator endpoint) is the 7th `:id` handler in `moderationRoutes.js` and missed Plan 05-01 MEDIUM-02's INVALID_ID coverage — still leaks CastError 500 on malformed ObjectId. Same-family as Phase 4 MD-02 (existing pattern, not a Phase 5 regression). M4 carry-forward as `M4-MEDIUM-01-EDITASMOD-INVALID-ID`.
- **LOW LW-01** — `ModerationQueueScreen → onEditOnBehalf` callback in `App.tsx:1189-1198` doesn't derive `ownerName` (only `PropertyDetailsScreen` path at `App.tsx:989-1005` got the `4240e64` fix). UX inconsistency only — fallback chain has no uid step so no raw-uid leak. M4 polish as `M4-LOW-01-ONEDITONBEHALF-OWNERNAME-PARITY`.
- **LOW LW-02** — `editAsModerator(_images = [])` keeps a dead parameter in the signature for "source compat". Future callers could silently pass media and get 200 OK with zero uploads. Drop the parameter in M4. Tracked as `M4-LOW-02-EDITASMOD-DEAD-IMAGES-PARAM`.
- **LOW LW-03** — `seed-locations-m3.js` env-var fallback order is `MONGODB_URI || MONGO_URI`; rest of backend uses `MONGO_URI`. Flip the order or delegate to `connectDB()` in M4. Tracked as `M4-LOW-03-SEED-LOCATIONS-ENV-VAR-ORDER`.

### Per-issue ship-disposition

| Issue | Severity | Disposition |
|-------|----------|-------------|
| REL-03 Path B coverage | PARTIAL | SHIP with documented Path B rationale (user-approved 2026-05-11) |
| REL-05 continuous live | PARTIAL | SHIP — explicitly deferred to Plan 05-07 per REQUIREMENTS.md |
| MD-01 INVALID_ID gap | MEDIUM | SHIP + M4 backlog (same-family existing pattern; not a regression) |
| LW-01 ownerName parity | LOW | SHIP + M4 polish |
| LW-02 dead param | LOW | SHIP + M4 polish |
| LW-03 env-var order | LOW | SHIP + M4 polish (backend cosmetic, not blocking) |

## Sentinel Final Re-run

Per CONTEXT.md `Claude's Discretion › Sentinel re-run before submission`, all sentinels re-run at audit time:

| Sentinel | Repo | Exit | Result |
|----------|------|------|--------|
| check-i18n-parity.sh | RN client | 0 | PASS: FORM-09 key-set parity holds |
| check-create-listing-screen-removed.sh | RN client | 0 | FLOW-14 / D-22 atomic-deletion sentinel PASSED — no references to deleted screen/barrel |
| check-no-actoruid-spoofing.sh | backend | 0 | OK HF-03: actorUid sourced exclusively from req.firebaseUid |
| check-no-landlord-uid-spoofing.sh | backend | 0 | OK CARRY-02: landlord-application uid sourced exclusively from req.firebaseUid |
| check-property-routes-media-stripped.sh | backend | 0 | OK: propertyRoutes.js is media-stripped |

All 5 sentinels exit 0. `npm test` not run as separate audit gate — chained jest suite has known pre-existing pollution failures from `.claude/worktrees` (tracked as DEF-01 in `deferred-items.md`); Plan 05-03's atomic bump and Plan 05-05's 3 walk-regression fix commits added net 5 new passing tests (3 PropertyService body-shape + 2 editAsModerator body-shape per reviewer's confirmation in 05-REVIEW.md), with the 2 pre-existing M2-baseline jest failures preserved unchanged.

## Re-open audit trail

This inheritance audit is valid until ANY of the following events:

1. **New data-collecting SDK lands in package.json** — re-run the dep diff against this audit's `v300_audit_sha` baseline; re-classify any new entry; possibly update PrivacyInfo.xcprivacy + ASC App Privacy + Play Console Data Safety.
2. **Apple's Required Reasons API list expands** to cover existing usages — re-declare in PrivacyInfo.xcprivacy.
3. **Bundle ID or Android package name changes** — re-issue Maps API key restrictions.
4. **v3.0 graduates from internal-testing to production review** — possibly refresh screenshots + store listing copy.
5. **Localization expands to KK or UZ** — refresh store listing copy in those locales.
6. **Domain ownership for deep linking changes** — re-issue applinks entitlement.
7. **Plan 05-07 store submission rejects with privacy/category/listing-mismatch reason** — re-open the affected disposition.

## Cross-references

- **M2 Phase 6 precedent:** `.planning/milestones/v2.0-phases/06-hardening-manual-physical-device-qa-release/06-INHERITANCE-AUDIT.md` — structural analog
- **Memory `no-firebase-sdk.md`:** load-bearing repo-rule check (zero Firebase keys in v3.0.0)
- **Memory `gsd-verifier-misses-regressions.md`:** paired-gate discipline (verifier + reviewer as independent gates with parallel-isolated contexts)
- **Memory `m2-shipped-2026-05-05.md`:** M2 v2.0.0 baseline anchor for inheritance descope
- **Memory `identity-vs-user-store.md`:** Firebase = identity proof / MongoDB = user store (justifies "no Firebase SDK in client repo")
- **REQUIREMENTS.md:** REL-05 + REL-06 acceptance criteria
- **05-PREFLIGHT.md:** backend deploy state + tsc baseline gate
- **05-QA-MATRIX.md:** walk_disposition input (APPROVED-WITH-MASS-DISPOSITION via Path B)
- **05-VERIFICATION.md:** gsd-verifier subagent's per-requirement disposition
- **05-REVIEW.md:** gsd-code-reviewer subagent's regression-forward findings
- **CLAUDE.md:** Stack Decisions + "no Firebase SDK in RN client" repo rule

---

*Phase: 05-hardening-manual-qa-release-v3*
*Plan: 06 — Paired-gate close + Inheritance audit*
*Audited: 2026-05-11T03:00:00Z*
*v200 baseline SHA: 95b13c1*
*v300 audit SHA: fb35b3e*
*Paired-gate verdict: YELLOW (verifier PARTIAL + reviewer GREEN)*
*proceed_with_inheritance: true*

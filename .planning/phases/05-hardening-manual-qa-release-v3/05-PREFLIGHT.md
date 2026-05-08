---
phase: 05-hardening-manual-qa-release-v3
plan: 01
type: preflight-evidence
audited_at: 2026-05-08T01:15:00Z
preflight_disposition: GREEN-WITH-DEVIATIONS
sections_complete: 14
backend_repo: /Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services
backend_repo_sha_at_deploy: 5bf23fe
railway_deploy_sha: 5bf23fe
railway_deploy_timestamp: 2026-05-08T00:03:38Z
railway_domain: https://jaytap-services-production.up.railway.app
health_check_status: 200
nvm_node_version_used: 24

# Tester comms (D-04 — BEFORE Atlas snapshot)
tester_comms_sent_at: 2026-05-07T23:29:35Z
tester_comms_channel: channel-pending-orchestrator-captured-at-user-done-confirmation

# Atlas snapshot (D-03 deviation — SKIPPED)
mongo_atlas_snapshot_at: 2026-05-07T23:35:41Z
mongo_atlas_snapshot_id: SKIPPED-D-03-DEVIATION
mongo_atlas_snapshot_disposition: skipped-d-03-operator-approved

# Migration verify-pass timestamps
listings_m3_migration_verify_pass_at: 2026-05-07T23:53:07Z
landlord_uid_repair_migration_verify_pass_at: 2026-05-08T00:00:00Z
locations_seed_verify_pass_at: 2026-05-08T00:33:00Z

# RN client tsc baseline
rn_tsc_baseline_error_count: 17

# Phase 4 review polish folded into this plan
medium_01_landed: true
medium_01_commit: 414c415
medium_02_landed: true
medium_02_commit: 5bf23fe
seed_locations_patch_landed: true
seed_locations_patch_commit: 87dc0e9

# Inheritance invariants (M2 baseline carry)
aws_iam_path: jaytap_runtime_uses_new_user_only_old_user_retains_cross_project_policy
aws_iam_partial_mitigation: true
mongo_revoked_at: 2026-04-29T00:00:00Z
firebase_project_id_present: true
firebase_admin_absent: true

# D-03 deviations (operator-approved in-flight)
d_03_deviations:
  - atlas-snapshot-skipped
  - seed-script-bugs-patched-inflight

# M3 backlog (forward-signal items surfaced during runbook)
m3_backlog:
  - JayTap-orphan-data-cleanup
  - ATLAS-CRED-ROTATION
---

# Phase 5 — Pre-flight Evidence (REL-05, partial)

Authored by Plan 05-01 to record the operator-supervised pre-flight runbook that
clears Phase 5 to begin its QA-matrix walks (Plan 05-05) and dual-store
submission (Plan 05-07). 14 sections walked end-to-end on 2026-05-07/08; two
D-03 deviations surfaced + handled in-flight (Atlas snapshot skipped by operator
decision; two latent bugs in `seed-locations-m3.js` patched and committed
mid-runbook). Disposition: **GREEN-WITH-DEVIATIONS**.

Cross-repo: backend lives at
`/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services`
(per memory `backend-repo-location.md`), separate from this RN client repo.
Backend declares `engines.node >=22.12.0` (jose@6 ESM-only) — `nvm use 24` is
the runtime contract for any backend `npm` / `node` invocation per memory
`backend-node-version.md`.

This artifact does NOT contain any live secrets. Env-var KEY names + presence
booleans only (T-05-03 mitigation pattern — see `06-BACKEND-DEPLOY.md` for
the M2 precedent). One M3 backlog item `ATLAS-CRED-ROTATION` is listed in the
deviations section below because the MongoDB password was visible in operator
shell output during in-flight debugging of the seed script — recommend rotation
for defense in depth, not as a Phase 5 release blocker.

## Section 0 — Tester comms (user-relayed; D-04 ordering invariant)

D-04 requires that internal testers receive the breaking-window heads-up
**BEFORE** the Atlas snapshot is captured (Section 1). This section records
the comms event.

| Field | Value |
|-------|-------|
| `comms_sent_at` | `2026-05-07T23:29:35Z` |
| `delivery_channel` | channel pending; orchestrator captured timestamp at user "done" confirmation per skill-D-04 ordering invariant |
| `template_source` | `.planning/phases/01-schema-reshape-backend-route-shape-cutover/01-CONTEXT.md` §Rollback › ## Tester comms template (adapted for v3.0 deploy window ~2h) |
| `audience` | TestFlight Internal Testing build 27 baseline + Play Console Internal Testing versionCode 30 baseline |

**D-04 chronology check:** `comms_sent_at` (`2026-05-07T23:29:35Z`) is
strictly earlier than `mongo_atlas_snapshot_at`
(`2026-05-07T23:35:41Z`) — invariant satisfied.

## Section 1 — Atlas snapshot (D-03 DEVIATION — SKIPPED, operator-approved)

| Field | Value |
|-------|-------|
| `mongo_atlas_snapshot_at` | `2026-05-07T23:35:41Z` (timestamp the deviation decision was logged, NOT a real snapshot) |
| `snapshot_id` | `SKIPPED-D-03-DEVIATION` |
| `snapshot_disposition` | skipped — operator-approved in-flight |
| `cluster_tier` | unknown — operator skipped via D-03 deviation; this field is only populated when a real snapshot is taken |

**Deviation rationale (D-03 decide-at-moment):** The operator does not have
the Atlas dashboard backup permission required to capture an on-demand
snapshot. Production cluster contains mock/test data only at this point in
the project's lifecycle (no real renter/landlord data at risk per project
context). The rollback path the snapshot would have insured against is
instead: drop the affected collections + re-run the migrate / seed scripts
(both are idempotent and self-rebuilding). D-03 explicitly licenses the
operator to make this call in-context — the runbook continues with the
known reduced safety net rather than blocking the entire pre-flight on a
permission grant that would itself need a separate org-admin touch point.

This is a single-instance deviation, NOT a permanent precedent: future
releases against production data with real users will require either
operator permission elevation OR a different rollback insurance mechanism
(point-in-time-recovery, CDC export, etc.). Recorded as M3+ backlog item
implicitly under the broader release-engineering hardening track.

**See also:** `## D-03 Deviations` section at the bottom of this artifact.

## Section 2 — `migrate-listings-m3.js` dry-run (D-02 step 2)

```bash
cd /Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services
nvm use 24
npm run migrate:listings-m3 -- --dry-run
```

| Field | Value |
|-------|-------|
| `dry_run_doc_count` | 21 |
| `propertyType_distribution` | apartment/house=0, office/commercial=1, hotel/hostel=0, other propertyType=20 |
| `samples_reviewed` | 3 (office/Dordoi; undefined-propertyType/Luxury Villa; Townhome/Ala Archa) — all AFTER shapes structurally correct |
| Connection | MongoDB Connected: `ac-5hu8mt8-shard-00-02.mvry7rn.mongodb.net` |
| Database | `bizdinkonush` (overridden by `src/config/db.js` `dbName` setting) |

**After-shape spot check** confirmed on all 3 reviewed samples: `location.*`
nested correctly, `basics.*` populated, `dealType` derived, `media.*`
populated, `schemaVersion: 'm3-nested-v1'` written. No malformed records;
classification clean for the live cutover.

## Section 3 — `migrate-listings-m3.js` LIVE (D-02 step 3)

```bash
cd /Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services
nvm use 24
npm run migrate:listings-m3
```

| Field | Value |
|-------|-------|
| `migration_started_at` | `2026-05-07T23:46:00Z` (approx — between dry-run and verify) |
| `migration_completed_at` | `2026-05-07T23:48:03Z` |
| `flipped_count` | 21 |
| `errors` | 0 |
| `acceptance_line_printed` | `ACCEPTANCE MET (SCHEMA-02): db.properties.countDocuments({location:{$exists:false}}) === 0` |

Cursor walk completed cleanly; all 21 properties reshaped from flat → nested
shape. The acceptance line printed by the script confirms the post-migration
invariant `db.properties.countDocuments({location:{$exists:false}}) === 0`
holds against production Atlas without further mongosh probing.

## Section 4 — `migrate-listings-m3.js` verify (D-02 step 4)

```bash
cd /Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services
nvm use 24
npm run migrate:listings-m3 -- --verify=PASS
echo "exit: $?"
```

| Field | Value |
|-------|-------|
| `verify_exit_code` | 0 |
| `unmigrated_count` | 0 |
| Output | `VERIFY: PASS — SCHEMA-02 acceptance met` |
| `verify_at` | `2026-05-07T23:53:07Z` |

Frontmatter `listings_m3_migration_verify_pass_at: 2026-05-07T23:53:07Z`.
SCHEMA-02 acceptance criterion satisfied; backend route layer (Phase 1
cutover) is now cleared to be deployed against the migrated state.

## Section 5 — `migrate-landlord-app-uid-mismatch.js` dry-run (D-02 step 5)

```bash
cd /Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services
nvm use 24
node src/scripts/migrate-landlord-app-uid-mismatch.js --dry-run
```

| Field | Value |
|-------|-------|
| `flipped` | 0 |
| `orphaned` | 0 |
| `skipped` | 6 (all 6 docs hit-skip; Phase 4.5 fix already left production clean) |

Classification confirms Phase 4.5's repair was effective — production has no
mismatched-uid landlord-applications outstanding; the migration's live
invocation will be an idempotent no-op.

## Section 6 — `migrate-landlord-app-uid-mismatch.js` LIVE (D-02 step 6)

```bash
cd /Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services
nvm use 24
node src/scripts/migrate-landlord-app-uid-mismatch.js
```

| Field | Value |
|-------|-------|
| `flipped` | 0 |
| `orphaned` | 0 |
| `skipped` | 6 (idempotent no-op confirmed) |

The 6 application doc IDs printed during the cursor walk:

- `69f4046a503882deb3e142e9`
- `69f43614bd29725f5e993f25`
- `69f43f05d3cce38407a3151a`
- `69f43f58d3cce38407a3155b`
- `69f7ca4d4c2e9343bc3328d1`
- `69f973c74c2e9343bc332b4e`

Live run matches dry-run exactly — no writes occurred. Confirms Phase 4.5's
data-side repair is durable and the migration is safe to retain in the
post-cutover toolchain (idempotent + safe to re-run as a sanity probe).

## Section 7 — `migrate-landlord-app-uid-mismatch.js` verify (D-02 step 7) — POST-MEDIUM-01-HOIST

```bash
cd /Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services
nvm use 24
node src/scripts/migrate-landlord-app-uid-mismatch.js --verify=PASS
echo "exit: $?"
```

| Field | Value |
|-------|-------|
| `verify_exit_code` | 0 |
| `unresolved_count` | 0 |
| Output | `VERIFY=PASS: all submitted applications have a resolvable uid.` |
| `medium_01_hoist_applied` | true (commit `414c415` hoisted the verify probe to BEFORE the cursor walk per Phase 4 REVIEW MEDIUM-01) |
| `verify_at` | `2026-05-08T00:00:00Z` (operator pasted live + verify back-to-back) |

With Task 1's MEDIUM-01 surgical hoist applied (`if (isVerify) { ... }`
block now lives BEFORE `LandlordApplication.find({}).cursor()`), this is a
**pure read-only probe** — no live writes. Sibling-script symmetry
restored. Frontmatter
`landlord_uid_repair_migration_verify_pass_at: 2026-05-08T00:00:00Z`.

## Section 8 — Backend Railway deploy (D-02 step 8)

| Field | Value |
|-------|-------|
| `backend_repo_sha_at_deploy` | `5bf23fe` (Tasks 1 + 2 committed; head BEFORE the seed-script patch from D-03 deviation #2) |
| `unpushed_commits_observed` | 45 commits covering Phases 1, 3, 4, and the 2 Phase 5 polish commits — identified via `git log origin/main..HEAD --oneline` (run by user) |
| Deploy method | `git push origin main` from operator shell; Railway auto-deploy on push |
| `railway_deploy_sha` | `5bf23fe` |
| `railway_deploy_timestamp` | `2026-05-08T00:03:38Z` |
| `railway_domain` | `https://jaytap-services-production.up.railway.app` |

**Health-check (orchestrator-run curl):**

```bash
curl -sS -w "http_code=%{http_code}\n" -o /dev/null \
     https://jaytap-services-production.up.railway.app/
```

| Field | Value |
|-------|-------|
| `http_code` | 200 |
| `time_total` | 0.173244s |
| Body sample | `JayTap Backend is running!` |
| `health_check_status` | 200 |

**Env-var presence (key names only — T-05-03 mitigation; values NEVER recorded):**

| Env var key | `present` | Source contract |
|-------------|-----------|-----------------|
| `MONGO_URI` | true | `.env.example` line for MongoDB Atlas connection string |
| `AWS_ACCESS_KEY_ID` | true | `.env.example` line for S3 client |
| `AWS_SECRET_ACCESS_KEY` | true | `.env.example` line for S3 client |
| `AWS_REGION` | true | `.env.example` line for S3 client |
| `AWS_BUCKET_NAME` | true | `.env.example` line — JayTap bucket |
| `FIREBASE_PROJECT_ID` | true | `.env.example` line — JWKS audience for `verifyFirebaseToken.js` |
| `PORT` | true | `.env.example` line — Railway port binding |

Backend is up at the deployed SHA; the Phase 1 route-shape cutover code is
now live against the migrated Atlas state from Section 4. M3 backend changes
(Phases 1, 3, 4, plus Phase 5 polish) are now in front of internal testers.

**Note on deploy SHA vs final backend HEAD:** The seed-script patches from
the D-03 deviation #2 (commit `87dc0e9`) landed AFTER this Railway deploy.
The seed script is operator-only tooling — not part of the routing path —
so the deployed binary is functionally identical pre and post-patch. A
follow-up Railway redeploy at backend HEAD `87dc0e9` is harmless and
recommended for origin/main consistency, but is not a release blocker.

## Section 9 — `seed-locations-m3.js` dry-run (D-02 step 9)

**D-03 deviation #2 surfaced here.** Initial invocation failed with
`FATAL: MONGODB_URI env not set.` despite a populated `.env`. Root cause:
script read `process.env.MONGODB_URI` but `.env` defines `MONGO_URI`.
Patch #1 added the fallback (`process.env.MONGODB_URI ||
process.env.MONGO_URI`).

After patch #1, the dry-run reported 11 cities + 19 districts. The
**post-patch live run subsequently revealed Bug #2** (missing dbName
override) — see Section 10 for the second patch + re-run.

**Final state (after both patches):**

| Field | Value |
|-------|-------|
| `dry_run_cities_count` | 11 |
| `dry_run_districts_count` | 19 |
| Cities (5 KG + 3 KZ + 3 UZ per memory `geographic-scope.md`) | Bishkek, Cholpon-Ata, Karakol, Naryn, Osh, Almaty, Astana, Shymkent, Bukhara, Samarkand, Tashkent |
| Districts | Bishkek districts only in v1 (19 total) |

Geographic invariant honored: KG/KZ/UZ scope reflected; no Bishkek-only
phrasing or single-city assumption.

## Section 10 — `seed-locations-m3.js` LIVE (D-02 step 10)

**D-03 deviation #2 continued.** Post-patch-#1 live run reported "11 cities +
19 districts inserted" — but a smoke-curl against `/api/locations/cities`
returned `{"cities":[]}`. Root cause: script called
`mongoose.connect(mongoUri)` directly, bypassing `src/config/db.js` which
forces `dbName: 'bizdinkonush'`. The URI's path component is `/JayTap`, so
the seed initially wrote 11 cities + 19 districts to a `JayTap` database
while the API + migrate scripts read from `bizdinkonush`.

Patch #2 changed `await mongoose.connect(mongoUri)` to
`await mongoose.connect(mongoUri, { dbName: 'bizdinkonush' })`. Aligns with
the convention used by `src/config/db.js` and all migration scripts.

**Final state (after both patches re-run):**

| Field | Value |
|-------|-------|
| `live_cities_inserted` | 11 |
| `live_districts_inserted` | 19 |
| Database written to | `bizdinkonush` (correct — overrides the URI's `/JayTap` path component) |

**Orphan data left in `JayTap` db** (M3 backlog `JayTap-orphan-data-cleanup`):
the pre-patch live run wrote 11 cities + 19 districts to the wrong
`JayTap` database. Not blocking for v3.0.0 release — the API never reads
that database. Cleanup follow-up: drop `JayTap.cities` + `JayTap.districts`
collections via Atlas data explorer.

**Patches committed:** `87dc0e9` fix(05-01) seed-locations-m3.js env-var
fallback + dbName override — single fix commit on top of `5bf23fe`
(MEDIUM-02), pushed to backend `origin/main`.

## Section 11 — `seed-locations-m3.js` verify (D-02 step 11)

```bash
cd /Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services
nvm use 24
npm run seed:locations -- --verify=PASS
echo "exit: $?"
```

| Field | Value |
|-------|-------|
| `verify_exit_code` | 0 |
| Output | `Approved cities: 11 / Approved districts: 19 / VERIFY PASS.` |
| `verify_at` | `2026-05-08T00:33:00Z` |

Frontmatter `locations_seed_verify_pass_at: 2026-05-08T00:33:00Z`. KG/KZ/UZ
city dictionary + Bishkek district dictionary live and addressable from the
backend's locations route; Phase 2 Plan 02-01 acceptance criterion fulfilled
for the production environment for the first time.

## Section 12 — Smoke-curls (D-02 step 12; orchestrator-run)

Two endpoints probed against `https://jaytap-services-production.up.railway.app`:

**Test 1 — `/api/properties` returns nested shape:**

```bash
curl -sS https://jaytap-services-production.up.railway.app/api/properties | head -c 500
```

| Field | Value |
|-------|-------|
| http_code | 200 |
| Shape | nested ✓ |
| First doc fields observed | `location.{city,district,showExactAddress}`, `basics.{price,currency:'USD'}`, `content.{title,description,language:'ru'}`, `media.{photos,videos,tourUrl}`, `propertyType: 'apartment'` |
| `properties_response_shape` | `nested` |

Confirms Phase 1 cutover code on Railway is serving the migrated nested
shape correctly to clients (RN client v3.0.0 expects nested).

**Test 2 — `/api/locations/cities` returns seeded cities:**

```bash
curl -sS https://jaytap-services-production.up.railway.app/api/locations/cities | head -c 500
```

| Field | Value |
|-------|-------|
| http_code | 200 |
| `locations_cities_count` | 11 |
| Status filter | all `status: 'approved'` |
| Per-doc shape | `label.{ru,en}`, `country (KG/KZ/UZ)`, `centroid.{lat,lng}`, `createdByUid: 'seed-script'` |

Cities span all 3 countries (5 KG + 3 KZ + 3 UZ) — matches Section 9 dry-run
distribution. Frontend autocomplete (FLOW-04) will resolve correctly against
the production locations dictionary.

## Section 13 — RN client whole-project tsc baseline (D-02 step 13; autonomous)

```bash
cd /Users/beckmaldinVL/development/mobileApps/JayTap
npx tsc --noEmit 2>&1 | tee /tmp/05-tsc-output.txt
grep -cE 'error TS[0-9]+' /tmp/05-tsc-output.txt
```

| Field | Value |
|-------|-------|
| `rn_tsc_baseline_error_count` | 17 |
| Phase 4 close baseline | 17 |
| Regression vs Phase 4 | NONE — exact match |
| Output captured to | `/tmp/05-tsc-output.txt` (transient — not committed) |

The 17 errors are the pre-existing AuthContext + ThemeContext +
Property.tours errors documented in M2 + Phase 2 baseline (per STATE.md
Phase 4 close artifact). No new TypeScript errors introduced by the
backend deploy or the seed re-run; Plan 05-05 device walks unblocked
on this gate.

## D-03 Deviations (operator-approved in-flight)

D-03 (Rollback posture = decide-at-moment) authorizes the operator to make
in-context calls when pre-flight steps fail or deviate. Two such calls were
made during this runbook; both are recorded here for audit.

### Deviation #1 — Atlas snapshot SKIPPED (Section 1)

| Field | Value |
|-------|-------|
| Logged at | `2026-05-07T23:35:41Z` |
| Trigger | Operator lacks Atlas dashboard backup permission to capture an on-demand snapshot |
| Decision | Skip the snapshot; proceed with the runbook |
| Rationale | Production cluster contains mock/test data only at this point in lifecycle; rollback path = drop affected collections + re-run idempotent migrate / seed scripts; D-03 explicitly licenses operator to make this call |
| Downstream impact | Reduced rollback insurance window for Sections 3 + 6 + 10. Acceptable for v3.0 internal-testing release; future production-data releases need a different insurance mechanism. |
| Recorded as | `mongo_atlas_snapshot_disposition: skipped-d-03-operator-approved` in frontmatter |

### Deviation #2 — Two latent bugs in `seed-locations-m3.js` patched in-flight (Sections 9 + 10)

| Field | Value |
|-------|-------|
| Logged at | Section 9 (Bug #1 surfaced) → Section 10 (Bug #2 surfaced) |
| Trigger | Bug #1: `FATAL: MONGODB_URI env not set.` despite populated `.env`. Bug #2: seed appeared to succeed but API returned empty cities. |
| Root cause #1 | Script read `process.env.MONGODB_URI` while `.env` defines `MONGO_URI` |
| Root cause #2 | Script called `mongoose.connect(mongoUri)` directly, bypassing `src/config/db.js`'s `dbName: 'bizdinkonush'` override; URI's `/JayTap` path took effect; seeds landed in wrong db |
| Decision | Patch both bugs in-flight; re-run live + verify; commit + push as a Phase 5 polish commit on top of the 2 Tasks 1+2 commits |
| Patch | `mongoose.connect(mongoUri, { dbName: 'bizdinkonush' })` + URI fallback (`MONGODB_URI || MONGO_URI`); 3 insertions, 3 deletions in `src/scripts/seed-locations-m3.js` |
| Commit | `87dc0e9` fix(05-01) seed-locations-m3.js env-var fallback + dbName override (backend repo `origin/main`) |
| Downstream impact | Orphan data in `JayTap` db: 11 cities + 19 districts left from pre-patch live run. Not blocking — API reads `bizdinkonush` not `JayTap`. M3 backlog cleanup (`JayTap-orphan-data-cleanup`). |
| Recorded as | `seed_locations_patch_landed: true` + `seed_locations_patch_commit: 87dc0e9` in frontmatter |

## M3 Backlog (forward-signal items)

Items surfaced during this pre-flight that are NOT Phase 5 release blockers
but should be tracked in M3+ hardening work.

### `JayTap-orphan-data-cleanup`

11 cities + 19 districts in `JayTap.cities` + `JayTap.districts` from the
pre-patch live run of `seed-locations-m3.js` (D-03 Deviation #2). API
correctly ignores them (reads `bizdinkonush`). Cleanup runbook:

1. MongoDB Atlas → Data Explorer → cluster → `JayTap` database
2. Drop `JayTap.cities` collection (action: irreversible — verify name first)
3. Drop `JayTap.districts` collection (same)
4. (Optional) Drop the empty `JayTap` database itself once both collections are gone

No service downtime required; production traffic does not touch `JayTap` db.

### `ATLAS-CRED-ROTATION`

During in-flight debugging of `seed-locations-m3.js`, `cat .env` was run by
the operator to inspect the URI structure — the MongoDB password for the
`becktatibekov_db_user` Atlas user was visible in shell output (operator's
terminal session + orchestrator's transcript). Defense-in-depth recommendation:

1. Atlas → Database Access → edit `becktatibekov_db_user` → autogenerate new password
2. Update both backend `.env` AND Railway env (variable name `MONGO_URI`)
3. Restart Railway service to pick up new env

Not blocking for v3.0.0 release (no evidence of compromise; the password
exposure is local-shell-only). Track in M3+ hardening backlog as
`ATLAS-CRED-ROTATION` so the recommendation does not get lost.

## Re-open Conditions

This pre-flight green-state can be invalidated by any of the following; if
any occur after the artifact's `audited_at` timestamp, re-walk the relevant
sections:

- **Atlas drift**: any direct Atlas mutation outside the migrate / seed
  pipelines (manual document edits, restored backups from earlier dates,
  collection drops). Re-walk Sections 4 + 7 + 11 (verify-PASS gates).
- **Railway redeploy without re-verify**: the backend repo has 1 commit
  (`87dc0e9`) ahead of the Railway-deployed SHA (`5bf23fe`) by design — the
  seed-script patches are operator-only and don't affect the routing path.
  IF a future deploy lands different code (e.g., Phase 5 close, M4 work),
  re-walk Section 8 (deploy + healthcheck + env-var presence audit) at the
  new SHA.
- **RN client commit chain divergence**: if RN-side commits land between
  this artifact and Plan 05-05's QA matrix walk that affect the schemas the
  client expects, re-walk Section 12 (smoke-curls) + Section 13 (tsc
  baseline) before resuming walks.
- **Migration script edits**: any edit to `migrate-listings-m3.js`,
  `migrate-landlord-app-uid-mismatch.js`, or `seed-locations-m3.js` after
  this artifact requires re-walking the corresponding dry-run + live + verify
  triple (Sections 2-4, 5-7, 9-11). Idempotence makes this safe but the
  evidence rows here become stale.
- **D-03 deviation #1 (Atlas snapshot skipped)**: if production data shifts
  from "mock/test only" to "real renter/landlord PII" before the next
  pre-flight, the snapshot-skip deviation MUST be revisited. Either operator
  permission elevation or an alternative insurance mechanism (PITR, CDC
  export) is required for any release where rollback would lose real data.
- **MEDIUM-01 / MEDIUM-02 / seed-script patches reverted**: the 3 backend
  commits (`414c415`, `5bf23fe`, `87dc0e9`) constitute the binding patch
  surface for this pre-flight. Reverts invalidate Sections 7 + 11 + the
  QA-matrix walker's CastError-immunity assumption (Plan 05-05).
- **`m2_anchor_observed_in_stores: false` follow-up**: `05-STORE-HISTORY.md`
  surfaced that Play Console has nothing at v2.0.0; if the operator finds
  evidence of an earlier rejected upload that did consume a versionCode in
  the meantime, the bump targets in `05-STORE-HISTORY.md` may need to be
  re-derived (Plan 05-07 retry-on-reject discipline).

## Cross-references

### M2 Phase 6 precedent (release-grinder pattern)

- `.planning/milestones/v2.0-phases/06-hardening-manual-physical-device-qa-release/06-BACKEND-DEPLOY.md`
  — structural analog (env-var presence pattern + `nvm use 24` constraint +
  `aws_iam_partial_mitigation: true` carry; this artifact extends to 14
  numbered sections vs M2's 6 because Plan 05-01 owns the schema migration
  + uid-repair migration + locations seed pre-flight that M2 never had).

### Phase 5 companion documents

- `.planning/phases/05-hardening-manual-qa-release-v3/05-CONTEXT.md` — D-02
  step ordering + D-03 rollback posture + D-04 tester comms ordering invariant.
- `.planning/phases/05-hardening-manual-qa-release-v3/05-STORE-HISTORY.md`
  — Plan 05-02 closing artifact; `derived_targets.next_ios_build_number=28`
  + `derived_targets.next_android_version_code=31` consumed by Plan 05-03.
  Surfaces `m2_anchor_observed_in_stores: false` discrepancy.
- `.planning/phases/05-hardening-manual-qa-release-v3/05-RELEASE-NOTES.md`
  — Plan 05-04 closing artifact; EN+RU release notes paste-ready for
  Plan 05-07 submission.

### Phase 4 review carry-forward (folded into this plan)

- `.planning/phases/04-m2-carry-forward-bug-fixes/REVIEW.md` MEDIUM-01 →
  Task 1 (commit `414c415`).
- `.planning/phases/04-m2-carry-forward-bug-fixes/REVIEW.md` MEDIUM-02 →
  Task 2 (commit `5bf23fe`).

### Memories anchored

- `backend-node-version.md` — `nvm use 24` before backend `npm` / `node` (jose@6 ESM-only).
- `backend-repo-location.md` — backend at `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services`.
- `phase45-landlord-application-uid-mismatch-bug.md` — Phase 4.5 bug Section 5/6 confirms is data-side closed (skipped=6, no flips).
- `phase45-landlord-application-shipped-state.md` — uid-repair script + supertest origin.
- `aws-iam-jaytap-prod-s3.md` — Section 8 env-var presence inherits AWS IAM PARTIAL posture from M2.
- `gsd-verifier-misses-regressions.md` — pre-flight green is necessary but not sufficient; Plan 05-06 paired-gates close the loop.
- `geographic-scope.md` — Section 9 city distribution honors KG/KZ/UZ (5+3+3) not Bishkek-only.
- `m2-shipped-2026-05-05.md` — partial supersede via `05-STORE-HISTORY.md` (`m2_anchor_observed_in_stores: false`).

### Phase artifacts being rolled forward

- `.planning/phases/01-schema-reshape-backend-route-shape-cutover/01-HUMAN-UAT.md`
  — 4 deferred operator items closed by Sections 1 + 4 + 12 + 13 of this artifact.
- `.planning/phases/02-6-step-contextual-listing-flow-client/02-01-SUMMARY.md`
  — Plan 02-01 backend Railway deploy + Atlas locations seed prerequisites
  closed by Sections 8 + 11.
- `.planning/phases/04-m2-carry-forward-bug-fixes/VERIFICATION.md`
  — CARRY-02 SC#3 live Atlas uid-match deferred walk evidenced by
  Sections 5-7 (skipped=6 + verify exit 0 confirms no mismatched docs in
  production).

## Plan 05-05 + 05-07 hand-off

- **Plan 05-05 (manual QA matrix)** reads `health_check_status: 200` +
  `railway_deploy_sha: 5bf23fe` + `listings_m3_migration_verify_pass_at`
  + `landlord_uid_repair_migration_verify_pass_at` +
  `locations_seed_verify_pass_at` + `rn_tsc_baseline_error_count: 17` (≤17
  baseline) as binding gates from this frontmatter. All gates GREEN —
  device walks unblocked.

- **Plan 05-07 (dual-store submission)** reads `railway_deploy_sha: 5bf23fe`
  to populate the submission log's `backend_against_sha` field. Note: if
  Plan 05-07 runs after a Railway redeploy at backend HEAD `87dc0e9` (which
  is recommended for origin/main consistency though not required), update
  the submission log accordingly.

- **D-04 chronology invariant satisfied**: comms (`2026-05-07T23:29:35Z`)
  before snapshot timestamp (`2026-05-07T23:35:41Z`). Testers received the
  ~2h breaking-window heads-up before the route-shape cutover went live.

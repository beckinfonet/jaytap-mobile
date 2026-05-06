---
phase: 01-schema-reshape-backend-route-shape-cutover
plan: 02
subsystem: backend-mongoose-migration
tags: [migration, mongoose, m3, backend, idempotent, brownfield, schema-02, schema-03, schema-04, tdd]
requirements: [SCHEMA-02, SCHEMA-03, SCHEMA-04]
dependency-graph:
  requires:
    - JayTap-services/src/models/Property.js (Plan 01-01 output — nested M3 schema with 11 audit fields top-level + status enum + collection 'listings')
    - JayTap-services/src/scripts/migrate-listings-m2.js (M2 sibling — pattern source for imports/dotenv/connectDB/main lifecycle + --verify exit codes)
    - JayTap-services/src/__tests__/setup.js (mongodb-memory-server bootstrap, auto-loaded via jest.config.cjs setupFilesAfterEach)
    - JayTap-services/src/config/db.js (connectDB helper — note: hardcodes dbName 'bizdinkonush', drove the test plumbing decision in Risks)
  provides:
    - migrate-listings-m3.js script — operator-runnable via `npm run migrate:listings-m3` with --dry-run / live / --verify=PASS subcommands
    - Exported helpers (mapDealType / mapRooms / mapCurrency / buildNestedShape / LEGACY_FLAT_FIELDS_TO_UNSET) for unit testing
    - Migration test suite (46 tests passing — 19 helpers + 11 buildNestedShape + 5 LEGACY invariant + 11 integration)
    - SCHEMA-02 acceptance gate (db.properties.countDocuments({location:{$exists:false}}) === 0 enforced via --verify=PASS exit 0/1)
    - D-03 idempotency (re-running modifies 0 rows; updatedAt preserved via {timestamps: false})
    - SCHEMA-03/04 hard-rule defenses at the data-layer boundary (status + 11 audit fields NEVER in $set or $unset)
    - Pitfall 4 defense — buildNestedShape NEVER emits audit/status keys; verified by helper unit test + integration test
  affects:
    - Plan 03 (propertyRoutes.js cutover) — can ship; the data-side migration is now operator-runnable
    - Plan 04 (moderationRoutes.js cutover) — same
    - Plan 05 (operator runbook + RN client type stub) — runbook references `npm run migrate:listings-m3`
    - Production MongoDB Atlas — the actual migration RUN is gated by Plan 05's operator-supervised runbook (Atlas snapshot → dry-run → live → verify=PASS → cutover commit)
tech-stack:
  added:
    - migrate-listings-m3.js (new file; CommonJS Node script)
    - migrate-listings-m3.test.js (new file; jest + mongodb-memory-server)
    - npm script `migrate:listings-m3` (sibling to migrate:listings-m2)
  patterns:
    - M2 sibling skeleton (imports / dotenv / connectDB / main / require.main guard / error handler — verbatim from migrate-listings-m2.js)
    - .lean() on cursor + .lean() on findOne — Mongoose strict-mode hides legacy flat fields from doc accessors (Pitfall 1 in self-discovered)
    - {strict: false} on the migration's updateOne — Mongoose strict-mode silently strips $unset keys for fields not in the new schema (Pitfall 2 in self-discovered); scoped to this single op
    - Cross-DB test plumbing via mongoose.useDb('bizdinkonush', { useCache: true }) — connectDB.js hardcodes dbName regardless of MONGO_URI path
    - require.main check guards main() so the script is require()-safe from tests
    - Distinct exit codes: 0 = success, 1 = data error, 2 = operator/env misuse (Node version, --verify without =PASS)
key-files:
  created:
    - /Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/scripts/migrate-listings-m3.js (331 LOC)
    - /Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/__tests__/migrate-listings-m3.test.js (689 LOC)
  modified:
    - /Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/package.json (1 line added — migrate:listings-m3 script)
decisions:
  - .lean() applied to the live cursor — Mongoose strict-mode default hides non-schema legacy flat fields (type/city/latitude/rooms) from doc accessors. .lean() returns plain BSON. Discovered during GREEN phase; no plan-level deviation (the plan's <interfaces> code did not anticipate this; classified Rule 3 blocking fix below).
  - {strict: false} applied to the migration's updateOne — Mongoose strict-mode default also strips $unset keys for non-schema fields, leaving legacy fields in MongoDB. {strict: false} for this single op lets the $unset reach the driver. Schema's strict:true default is preserved everywhere else (D-01 atomic-break for new writes via routes is not weakened).
  - Test cross-DB plumbing — connectDB.js hardcodes `dbName: 'bizdinkonush'` regardless of MONGO_URI. setup.js connects parent to 'jaytap-test'. Tests use mongoose.useDb('bizdinkonush') to bind a TxnProperty model to the same db the spawn'd child connects to. Alternative (modifying connectDB.js) was rejected — production safety; the test-only plumbing is contained.
  - Test fixture listingId uniqueness — Property's listingId index is unique non-sparse, so missing values are treated as `null` and collide on multi-insert. Each fixture call uses `nextListingId()` (`TEST-${Date.now()}-${seq}`) to ensure uniqueness.
  - {timestamps: false} on the updateOne — preserves the original updatedAt across the migration write so D-03 idempotency is observable from the doc itself (the test asserts updatedAt.getTime() unchanged across re-runs).
  - Integration tests use spawn(child_process) for exit-code assertions — RESEARCH §"Code Example 5" hybrid posture; helper unit tests use direct require for sub-100ms feedback. Both are wired (no child_process for helpers; no direct require for exit codes).
  - LEGACY_FLAT_FIELDS_TO_UNSET has exactly 17 keys — verified by an explicit "exact key set" invariant test (sorted-equality assertion) that protects against future regressions where someone adds/removes a key.
metrics:
  duration_minutes: 12
  tasks_completed: 3
  files_modified: 1
  files_created: 2
  tests_added: 46
  tests_total: 59  # Property.test.js (13) + migrate-listings-m3.test.js (46) — both green under Node 24
  insertions: 1022
  deletions: 1
  completed_date: 2026-05-06
backend_repo_pre_sha: 50728bd
backend_repo_post_sha: 53d025c
jaytap_repo_pre_sha: be1a0de
---

# Phase 1 Plan 02: migrate-listings-m3.js + Tests + npm Script Summary

Shipped the one-shot operator-supervised data migration script that transforms every legacy flat-shape doc in the `listings` collection into the M3 nested shape per CONTEXT.md D-04..D-15. Sibling to `migrate-listings-m2.js`. Migration is idempotent (D-03 — re-runs modify 0 rows), defends SCHEMA-03 (status enum) + SCHEMA-04 (11 audit fields) at the data-layer boundary, and exposes a `--verify=PASS` acceptance gate that exits 0 iff `db.properties.countDocuments({location: {$exists: false}}) === 0` (REQUIREMENTS.md SCHEMA-02 verbatim). 46 tests added (19 helper units + 11 buildNestedShape + 5 LEGACY_FLAT_FIELDS_TO_UNSET invariant + 11 integration), all passing under Node 24 + jose@6 ESM. Plans 03/04 route cutovers can now ship — the data-side migration is operator-runnable; the production RUN is gated by Plan 05's operator-supervised runbook (Atlas snapshot → dry-run → live → verify=PASS → cutover commit).

## Diff Stats

```
 package.json                              |   3 +-
 src/__tests__/migrate-listings-m3.test.js | 689 ++++++++++++++++++++++++++++++
 src/scripts/migrate-listings-m3.js        | 331 ++++++++++++++
 3 files changed, 1022 insertions(+), 1 deletion(-)
```

(Computed against backend pre-execution SHA `50728bd` via `git diff --stat 50728bd..HEAD`.)

## Commits

| # | Hash | Type | Subject | Repo |
|---|------|------|---------|------|
| 1 | `c05ac79` | test | add failing tests for migrate-listings-m3 (RED) | backend (JayTap-services) |
| 2 | `03ea882` | feat | implement migrate-listings-m3.js (GREEN — D-04..D-15) | backend (JayTap-services) |
| 3 | `53d025c` | chore | register npm script migrate:listings-m3 | backend (JayTap-services) |

The closing `docs(01-02)` SUMMARY commit lands in the JayTap planning repo (this file).

### TDD Gate Compliance

Plan-level type was `execute` (not `tdd`), but tasks 1–2 used `tdd="true"`. The cycle is observable in git log:

- **RED** (`c05ac79`) — test file lands first; suite fails to load (`Cannot find module '../scripts/migrate-listings-m3'`).
- **GREEN** (`03ea882`) — script lands; 46/46 tests pass; the same test file was edited in the GREEN commit to add cross-DB plumbing (TxnProperty / nextListingId) once the strict-mode pitfalls were discovered. This is acceptable because the test-side changes are infrastructure (not test invariants) and were necessary to observe the migration's correctness in the in-memory mongo against the production-equivalent connectDB lifecycle.
- **REFACTOR** — none needed; the script's structure mirrors the M2 sibling and the helpers are isolated for testability without further cleanup.

## What `migrate-listings-m3.js` Does (CLI Surface)

```bash
nvm use 24                                                  # Node ≥22.12 required for jose@6
npm run migrate:listings-m3 -- --dry-run                    # preview counts + 3 propertyType-biased sample docs (zero writes)
npm run migrate:listings-m3                                 # live run (cursor + per-doc updateOne)
npm run migrate:listings-m3 -- --verify=PASS                # acceptance gate (exit 0 = PASS, exit 1 = FAIL)
npm run migrate:listings-m3 -- --verify                     # fail-loud — exits 2 (must use =PASS suffix)
```

| Exit code | Meaning |
|-----------|---------|
| 0 | success — migration completed OR verify=PASS satisfied OR nothing to migrate |
| 1 | data error — migration ran but some docs still flat (incomplete) OR verify=PASS failed (≥1 doc missing location) |
| 2 | operator/env misuse — Node <22.12 OR `--verify` without `=PASS` suffix |

## D-04..D-15 Mapping Encoded in `buildNestedShape()`

| Decision | Source field | Destination | Notes |
|----------|--------------|-------------|-------|
| **D-04** | `type: 'sale' \| 'rent'` (top-level) | `dealType: 'sale' \| 'rent_long'` (top-level) | Universal — no propertyType conditional. Hospitality `type:'rent'` rows still become `rent_long`. Owners edit to `rent_daily` via Phase 2. |
| **D-05** | `address: String` (top-level) | DROP via `$unset` | SPEC has no exact-address string field. Replaced by `location.coordinates`. |
| **D-06** | (none) | `location.district = ''` | Phase 2 client renders placeholder; owner populates via Phase 2 flow. |
| **D-07** | `rooms: Number` | `basics.rooms` (apt/house/office/commercial) OR `basics.hotelRooms` (hotel/hostel) | 1→'1', 2→'2', 3→'3', ≥4→'4+', 0/null→omit destination key. Conditional destination by `propertyType`. |
| **D-08** | `bedrooms`, `bathrooms` | DROP | No SPEC home; `basics.rooms` is canonical room count; `basics.bathroom` is enum, NOT count. |
| **D-09** | `maxGuests`, `amenities` (top-level) | UNTOUCHED (passthrough) | M1 HOSP-05 read paths intact. NOT moved under basics.* |
| **D-10** | `period`, `agent`, `is3DTourAvailable` | DROP via `$unset` | Period implied by dealType; agent never populated; is3DTourAvailable derived from media.tourUrl at read time. |
| **D-10** | `instagramUrl`, `availableDate`, `listingId`, `platformVerifications`, `verificationUpdatedAt`, `verificationUpdatedByUid` | UNTOUCHED (passthrough) | Operational/admin/contact metadata. |
| **D-11** | (none) | `content.language = 'ru'` | Bishkek launch market; owners edit via Phase 2 flow. |
| **D-12** | `tours: [{url, …}]` | `media.tourUrl: String` (first non-empty `tours[i].url`) | Multi-tour preservation rejected per <deferred>. tour metadata (id/title/thumbnailUrl) dropped — SPEC's single-string shape doesn't accommodate. |
| **D-13** | `panoramicPhotosUrl` | DROP | No SPEC slot; mod re-attaches via Phase 3 if needed. |
| **D-14** | `videoUrl: String` | `media.videos: [String]` (single-element array if non-empty, `[]` otherwise) | Wraps verbatim; preserves data under new array shape. |
| **D-15** | `images: [String]` | `media.photos: [String]` (verbatim) | Drop derived `imageUrl` (was `images[0]`); callers compute primary from `media.photos[0]` at render. |

Currency coercion (helper `mapCurrency`):
- `'USD'` / `'$'` → `'USD'`
- `'EUR'` / `'€'` → `'EUR'`
- `'KGS'` / `'сом'` / `null` / `undefined` → `'KGS'` (default)

## `LEGACY_FLAT_FIELDS_TO_UNSET` Enumeration (17 Keys)

The exact `$unset` payload applied to every flat-shape doc on live migration:

```
address, latitude, longitude, bedrooms, bathrooms, period, agent,
is3DTourAvailable, panoramicPhotosUrl, imageUrl, images, tours,
videoUrl, type, city, rooms, matterportUrl
```

**Verified absent from `$unset`** (asserted by 3 invariant tests + 1 exact-key-set test):

- **SCHEMA-03 hard rule:** `status`
- **SCHEMA-04 hard rule (11 audit fields):** `submittedAt`, `approvedAt`, `approvedByUid`, `rejectedAt`, `rejectedByUid`, `rejectionReasonCode`, `rejectionReasonNote`, `archivedAt`, `archivedByUid`, `archivedReasonCode`, `archivedReasonNote`
- **D-09 / D-10 keep set (11 fields):** `listingId`, `ownerUid`, `instagramUrl`, `availableDate`, `propertyType`, `features`, `maxGuests`, `amenities`, `platformVerifications`, `verificationUpdatedAt`, `verificationUpdatedByUid`

These pass through MongoDB's `updateOne` UNTOUCHED on the existing doc — neither in `$set` (the `buildNestedShape` return type excludes them by construction) nor in `$unset` (the constant excludes them by enumeration).

## Test Coverage by `describe` Block

| describe | Test count | Style |
|----------|-----------:|-------|
| migrate-listings-m3 — helper units (no DB) | 19 | unit (mapDealType / mapRooms / mapCurrency boundaries) |
| migrate-listings-m3 — buildNestedShape (no DB) | 11 | unit (apartment / hotel / sale / tours / videoUrl / images / language / schemaVersion / no-audit-keys) |
| migrate-listings-m3 — LEGACY_FLAT_FIELDS_TO_UNSET invariant | 5 | unit (exactly 17 keys / no audit / no status / no keep-set / exact key set) |
| migrate-listings-m3 — --verify=PASS exit semantics | 3 | integration via spawn (code 0 / 1 / 2) |
| migrate-listings-m3 — --dry-run zero-write invariant (D-18) | 1 | integration via spawn (no writes + sample preview) |
| migrate-listings-m3 — live run migrates flat → nested (D-04..D-15) | 7 | integration via spawn (apartment / hotel / commercial / idempotency / audit-fields / status / D-09 / D-10) |
| **Total** | **46** | — |

### Test execution result (Node 24, jose@6 ESM, mongodb-memory-server)

```
PASS src/__tests__/migrate-listings-m3.test.js
PASS src/__tests__/Property.test.js
Test Suites: 2 passed, 2 total
Tests:       59 passed, 59 total
Time:        ~3.5 s
```

## Downstream Readiness

Plans 03 / 04 / 05 can now consume:

- `npm run migrate:listings-m3 -- --dry-run` → preview + sample, zero writes, exit 0.
- `npm run migrate:listings-m3` → live migration, idempotent, exit 0 on success or no-op.
- `npm run migrate:listings-m3 -- --verify=PASS` → SCHEMA-02 acceptance gate (exit 0 = PASS, 1 = FAIL).
- `require('../scripts/migrate-listings-m3')` → exports `{ mapDealType, mapRooms, mapCurrency, buildNestedShape, LEGACY_FLAT_FIELDS_TO_UNSET }` — usable from future tests or operator helpers without invoking `main()`.

The script is operator-runnable; the production-DB migration RUN is gated by Plan 05's operator-supervised runbook (Atlas snapshot → `nvm use 24` → dry-run → live → verify=PASS → cutover commit per ROADMAP SC #4). This plan ships the artifacts ONLY.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking] Added `.lean()` on the migration cursor**
- **Found during:** Task 1 GREEN phase (3 of the live-mapping integration tests failed because `dealType` came out `undefined`).
- **Issue:** Mongoose strict-mode default HIDES legacy flat fields (`type`, `city`, `latitude`, `rooms`) from Mongoose document accessors. The cursor returned Mongoose docs whose `.type`, `.city`, etc. were `undefined`, so `buildNestedShape(doc)` saw all `undefined` source fields and emitted defaults.
- **Fix:** `Property.find(filter).lean().cursor()` — `.lean()` returns plain BSON objects with all fields present in the underlying document. Same fix applied to `collectBiasedSamples` (the `findOne` calls). The plan's `<interfaces>` code in PLAN.md did not anticipate this strict-mode pitfall.
- **Files modified:** `src/scripts/migrate-listings-m3.js`
- **Commit:** Folded into `03ea882` (feat — GREEN).

**2. [Rule 3 — Blocking] Added `{ strict: false }` on the migration's `Property.updateOne`**
- **Found during:** Task 1 GREEN phase (after fix #1, `dealType` and nested fields were correct, but `address`, `latitude`, `type`, etc. were STILL present in the migrated doc).
- **Issue:** Mongoose strict-mode default ALSO strips `$unset` keys for fields not declared in the new (nested) schema. So `$unset: { address: '', latitude: '', type: '', … }` was being silently dropped before the operation reached MongoDB.
- **Fix:** `Property.updateOne(..., ..., { strict: false, timestamps: false })` — `strict: false` lets the `$unset` pass through; `timestamps: false` preserves the original `updatedAt` so D-03 idempotency is observable. Scoped to this single operation; the schema's `strict: true` default is preserved everywhere else (D-01 atomic-break for new writes via routes is not weakened).
- **Files modified:** `src/scripts/migrate-listings-m3.js`
- **Commit:** Folded into `03ea882` (feat — GREEN).

**3. [Rule 3 — Blocking] Test cross-DB plumbing (TxnProperty)**
- **Found during:** Task 2 first jest run.
- **Issue:** `setup.js` connects parent test process to `dbName: 'jaytap-test'`. The spawn'd child uses `connectDB.js`, which HARDCODES `dbName: 'bizdinkonush'` regardless of `MONGO_URI` path. Result: parent and child landed on DIFFERENT databases in the in-memory mongo (same instance, different namespace). Child saw 0 docs.
- **Fix:** Test creates a SECOND mongoose connection bound to `bizdinkonush` via `mongoose.connection.useDb('bizdinkonush', { useCache: true })` and binds a `TxnProperty` model to that connection. All flat-fixture inserts and post-migration reads in integration tests go through `TxnProperty` (NOT the default `Property` model bound to `jaytap-test`). The spawn helper points the child at `mongodb://host:port/bizdinkonush`. Alternative — modifying `connectDB.js` to honor `MONGO_URI`'s path — was REJECTED for production safety (the hardcoded `bizdinkonush` is correct for production).
- **Files modified:** `src/__tests__/migrate-listings-m3.test.js` (added `txnDb` / `TxnProperty` / per-test cleanup; replaced `Property.create` / `Property.collection.insertOne` / `Property.findOne` / `Property.countDocuments` with `TxnProperty.*` for integration tests).
- **Commit:** Folded into `03ea882` (feat — GREEN).

**4. [Rule 3 — Blocking] Per-fixture unique `listingId`**
- **Found during:** Task 2 first jest run with 3-doc insertMany.
- **Issue:** `Property.js` declares `listingId: { type: String, unique: true }` — a non-sparse unique index. Multiple fixtures with `listingId: undefined` collide on `null`. Error: `MongoBulkWriteError: E11000 duplicate key error … listingId_1 dup key: { listingId: null }`.
- **Fix:** Added `nextListingId()` helper — `TEST-${Date.now()}-${seq}` per fixture call. Both `makeFlatFixture` and `makeNestedFixture` call it.
- **Files modified:** `src/__tests__/migrate-listings-m3.test.js`.
- **Commit:** Folded into `03ea882` (feat — GREEN).

### Discretionary Calls Documented (NOT deviations)

These are CONTEXT.md "Claude's Discretion" items — researcher/planner explicitly delegated to executor:

- **Discretion #4 (sample-preview bias):** Implemented propertyType-biased sampling — 1 apartment/house + 1 office/commercial + 1 hotel/hostel — with random backfill if any bucket is empty. The dry-run integration test seeds exactly one of each propertyType and asserts `--- Sample 1`, `--- Sample 2`, `--- Sample 3` headers appear in stdout.
- **Discretion #5 (schemaVersion marker):** `buildNestedShape` always emits `schemaVersion: 'm3-nested-v1'`. Asserted by helper unit test `'schemaVersion always present'`.
- **Test scope (Claude's Discretion in Plan 01-01 + this plan's `<verify>`):** This plan ships `migrate-listings-m3.test.js` (46 tests) only. propertyRoutes.test.js / moderationRoutes.test.js / adminRoutes.test.js update DEFERRED to Plans 03/04 (atomic-cutover principle).

### CLAUDE.md compliance

- No new npm dependencies (PROJECT.md hard rule for Phase 1) — verified by `git diff package.json` showing only the `scripts` block addition.
- No `firebase` / `@react-native-firebase/*` packages — backend is JWKS-only (auto-memory `no-firebase-sdk.md`).
- `nvm use 24` used before all `npm`/`node`/`jest` invocations (auto-memory `backend-node-version.md`).
- No `react-navigation` migration touched (CLAUDE.md hard rule — out of scope).
- AWS env block preserved verbatim from Property.test.js (mandatory — multerS3 → S3Client at module-load).
- Geographic scope (KG/KZ/UZ) preserved in D-11 RU default for content.language (auto-memory `geographic-scope.md`).

### Auth gates encountered

None.

## Risks (Documented for Plan 05 Operator Runbook)

1. **`connectDB.js` hardcodes `dbName: 'bizdinkonush'`** — the production database name is correct, but the test plumbing had to work around this with `mongoose.useDb('bizdinkonush')`. If a future environment lands the production DB under a different name, the migration script will silently land on `bizdinkonush` (likely empty), the live run will report "Nothing to migrate", and the `--verify=PASS` will succeed for the wrong reason. **Mitigation for runbook:** operator should run a pre-flight `node -e "console.log(process.env.MONGO_URI)"` AND `npm run migrate:listings-m3 -- --dry-run` and confirm the doc count matches Atlas's UI count for the listings collection.
2. **Mongoose strict-mode pitfalls** — discovered + handled in this plan, but documented here so future migrations know to use `.lean()` on cursors and `{ strict: false }` on `updateOne` calls when `$set`ing nested keys + `$unset`ing legacy keys. The two pitfalls are NOT obvious from Mongoose docs.
3. **listingId unique non-sparse index** — Production may have any number of legacy docs without a `listingId` value (treated as `null`). The migration does NOT touch `listingId`, but if Plan 03's POST route relies on `listingId` being defined, it should generate one (via `generateListingId()` per the existing helper) at insert time, NOT rely on migration to backfill it.

## Threat Flags

None. Phase 1 plan was a one-shot data migration script + tests; no new HTTP routes, no new file-access patterns, no new auth paths, no IAM changes. The threat register from PLAN.md `<threat_model>` is fully addressed:

| Threat ID | Disposition | How addressed |
|-----------|-------------|---------------|
| T-01-02-Tampering-01 | mitigate | Operator-supervised D-02 deploy sequence (Plan 05 runbook); migration script does not validate URI — that's an operator-side check. |
| T-01-02-Tampering-02 | mitigate | `buildNestedShape` returns ONLY nested-shape keys + `dealType` + `schemaVersion` (asserted by helper unit test "returned shape has NO audit or status keys"). `LEGACY_FLAT_FIELDS_TO_UNSET` invariant tests assert none of the 23 forbidden keys appear in `$unset`. CI fails if a future commit adds `status` or `submittedAt` to either set. |
| T-01-02-Tampering-03 | accept | Atomic-break per D-01; migration script does NOT touch the live route layer; route cutover is Plan 03/04. |
| T-01-02-Information-Disclosure-01 | accept | M1+M2 listings are mock data per PROJECT.md; runbook reminds operator to pipe stdout to a private session. |
| T-01-02-Repudiation-01 | accept | Atlas snapshot pre-migration is the rollback mechanism (D-16); per-record audit logging out of scope. |
| T-01-02-DoS-01 | accept | <100 docs in M1+M2 mock data; cursor + per-doc updateOne is the M2 D-02 verbatim pattern. |
| T-01-02-Elevation-01 | mitigate | `buildNestedShape` does NOT touch `platformVerifications` (D-10 keep set); `LEGACY_FLAT_FIELDS_TO_UNSET` does NOT contain `platformVerifications.*`. Helper unit test + integration test `'D-10 platformVerifications preserved top-level'` enforce this. The migration does NOT import or touch the User model. |

## Self-Check: PASSED

Verification commands (run from `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services` with `nvm use 24`):

1. `git log --oneline 50728bd..HEAD` returns:
   ```
   53d025c chore(01-02): register npm script migrate:listings-m3
   03ea882 feat(01-02): implement migrate-listings-m3.js (GREEN — D-04..D-15)
   c05ac79 test(01-02): add failing tests for migrate-listings-m3 (RED)
   ```
   FOUND: all 3 task commits present in the correct TDD order (RED → GREEN → chore).

2. `npx jest src/__tests__/migrate-listings-m3.test.js src/__tests__/Property.test.js --bail` exits 0 — 59/59 tests pass (46 migration + 13 Property model).

3. Helper introspection (run in node):
   - `m.mapDealType('rent')` → `'rent_long'` ✓
   - `m.mapRooms(99)` → `'4+'` ✓
   - `Object.keys(m.LEGACY_FLAT_FIELDS_TO_UNSET).length` → `17` ✓
   - `m.buildNestedShape({type:'rent', propertyType:'hotel', rooms:5, latitude:42, longitude:74}).basics.hotelRooms` → `'4+'` ✓
   - `m.buildNestedShape({type:'rent', propertyType:'hotel', rooms:5, latitude:42, longitude:74}).location.showExactAddress` → `true` ✓

4. `grep -F "args.includes('--verify=PASS')" src/scripts/migrate-listings-m3.js` returns 1 match (line 49).

5. `grep -F "location: { \$exists: false }" src/scripts/migrate-listings-m3.js` returns 3 matches (verify branch, idempotency filter, belt-and-suspenders updateOne filter).

6. `grep -nE "Number\(process\.versions\.node" src/scripts/migrate-listings-m3.js` returns 1 match (line 45 — Node-version guard).

7. `grep -F "VERIFY: PASS — SCHEMA-02" src/scripts/migrate-listings-m3.js` returns 1 match (line 193 — verbatim acceptance message).

8. `grep -F "if (require.main === module)" src/scripts/migrate-listings-m3.js` returns 1 match (line 326 — require-safe guard).

9. `grep -E '(\$set:|\$unset:).*\b(status|submittedAt|approvedAt|approvedByUid|rejectedAt|rejectionReasonCode|archivedAt|archivedByUid)\b' src/scripts/migrate-listings-m3.js` returns 0 matches (SCHEMA-03/04 invariants — no audit/status keys in $set or $unset).

10. `node -e "const pkg = require('./package.json'); console.log(pkg.scripts['migrate:listings-m3'])"` prints `node src/scripts/migrate-listings-m3.js`. Sibling scripts (`migrate:listings-m2`, `migrate:roles-m2`, `start`, `test`, `test:quick`) all unchanged. `engines.node` unchanged at `>=22.12.0`. No new `dependencies` or `devDependencies`.

11. SCHEMA-04 documentation count: `grep -cE "audit field|SCHEMA-04|do not touch|preserve top-level|Pitfall 4" src/scripts/migrate-listings-m3.js` returns `7` — the script DOCUMENTS the audit-field invariant in comments so a future maintainer cannot accidentally re-introduce Pitfall 4.

12. LOC counts: `wc -l` reports 331 (script — required ≥120) and 689 (test — required ≥150). Both exceed minimums comfortably.

All claims verified.

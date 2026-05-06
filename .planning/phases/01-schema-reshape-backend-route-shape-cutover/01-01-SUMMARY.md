---
phase: 01-schema-reshape-backend-route-shape-cutover
plan: 01
subsystem: backend-mongoose-schema
tags: [mongoose, schema-reshape, m3, backend, brownfield-migration, schema-01, schema-03, schema-04]
requirements: [SCHEMA-01, SCHEMA-03, SCHEMA-04]
dependency-graph:
  requires:
    - JayTap-services/src/models/Property.js (M2 baseline at SHA 2fb5639)
    - JayTap-services/src/__tests__/setup.js (memory-server bootstrap)
    - JayTap-services/src/__tests__/fixtures/jwks-tokens.js (test JWK helper)
  provides:
    - Mongoose Property model with nested M3 shape (location/basics/conditionAndAmenities/content/terms/media)
    - schemaVersion marker 'm3-nested-v1'
    - 11 audit fields top-level invariant (SCHEMA-04 — defended by Property.test.js introspection)
    - Stable target shape for Plan 02 migration script + Plan 03 route cutover + Plan 04 moderation cutover + Plan 05 client type stub
  affects:
    - Plan 02 (migrate-listings-m3.js — reads new schema as transform target)
    - Plan 03 (propertyRoutes.js cutover — destructures new nested body shape)
    - Plan 04 (moderationRoutes.js cutover — same)
    - Plan 05 (RN client src/types/Property.ts — compile-time consumer)
tech-stack:
  added:
    - schemaVersion field (Claude's Discretion #5 — researcher RECOMMENDED)
    - dealType enum ['sale', 'rent_long', 'rent_daily'] (D-04 backfill destination)
    - Nested mongoose object literals for location/basics/conditionAndAmenities/content/terms/media
  patterns:
    - In-file precedent: existing platformVerifications nested object (M2 lines 67-71) is the analog template
    - Mongoose strict:true v9.x default (left implicit per Claude's Discretion #2 — silently drops unknown keys)
    - Audit-fields top-level invariant carried verbatim from M2 Phase 2 D-21 + Phase 4 archive lifecycle (extended to 11 fields)
key-files:
  created: []
  modified:
    - /Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/models/Property.js
    - /Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/__tests__/Property.test.js
decisions:
  - Mongoose strict:true left implicit (Claude's Discretion #2) — v9.x default; explicit setting would no-op suggest opt-in when policy is "default is correct"
  - schemaVersion field added with default 'm3-nested-v1' (Claude's Discretion #5)
  - specs virtual DELETED, not rewritten (Claude's Discretion #6) — D-08 drops bedrooms/bathrooms; rewriting against basics.{rooms, areaSqm} would couple to a string-enum vs M2 client's numeric expectation
  - basics.price tightened from Schema.Types.Mixed → Number per RESEARCH §283 + SPEC §3 (mock data is numeric)
  - Test scope kept to Property.test.js only — propertyRoutes.test.js / moderationRoutes.test.js / adminRoutes.test.js update DEFERRED to Plans 03/04 (atomic cutover principle: tests cut over with the code that owns the route shape)
metrics:
  duration_minutes: 3
  tasks_completed: 2
  files_modified: 2
  files_created: 0
  tests_added: 7
  tests_total: 13
  insertions: 303
  deletions: 146
  completed_date: 2026-05-06
backend_repo_pre_sha: 2fb5639e606a748db73dd0d39875c01015c8f452
backend_repo_post_sha: 50728bd
jaytap_repo_pre_sha: 61b43c5a51bfa140478dbcfd86db1b587e4d5ef8
---

# Phase 1 Plan 01: Property Schema Reshape (M2 Flat → M3 Nested) Summary

Reshaped the JayTap-services Mongoose Property schema from M2's flat shape into the M3 SPEC nested shape (`location.* / basics.* / conditionAndAmenities.* / content.* / terms.* / media.*`) per CONTEXT.md D-04..D-15, while preserving the M2 status enum (SCHEMA-03), the 11-field audit set top-level (SCHEMA-04), platformVerifications top-level (D-10), and the M1 hospitality `maxGuests` + `amenities` top-level (D-09). Added a `schemaVersion: 'm3-nested-v1'` marker per Claude's Discretion #5. Deleted the M2 `specs` virtual per Claude's Discretion #6 (bedrooms/bathrooms gone per D-08, rewrite would create hidden coupling). Property.test.js extended from 6 M2 tests to 13 (all passing under Node 24).

## Diff Stats

```
 src/__tests__/Property.test.js | 258 ++++++++++++++++++++++++++++++-----------
 src/models/Property.js         | 191 ++++++++++++++++++------------
 2 files changed, 303 insertions(+), 146 deletions(-)
```

(Computed against backend pre-execution SHA `2fb5639` via `git diff --stat 2fb5639e..HEAD`.)

## Commits

| # | Hash | Type | Subject | Repo |
|---|------|------|---------|------|
| 1 | `b16223e` | feat | reshape Property schema to nested M3 shape (D-04..D-15) | backend (JayTap-services) |
| 2 | `50728bd` | test | update Property.test.js for M3 nested shape (SCHEMA-01/03/04) | backend (JayTap-services) |

The closing `docs(01-01)` SUMMARY commit lands in the JayTap planning repo (this file).

## M2 → M3 Field Map (verbatim — D-04..D-15 applied)

### Top-level KEEP (D-09 / D-10)

| Field | M2 declaration | M3 declaration | Decision |
|-------|----------------|----------------|----------|
| `listingId` | `{ type: String, unique: true }` | unchanged | preserved (web-app cross-ref) |
| `ownerUid` | `String` | unchanged | preserved |
| `instagramUrl` | `String` | unchanged | D-10 keep set (owner contact) |
| `availableDate` | `Date` | unchanged | D-10 keep set |
| `propertyType` | `{ type: String, default: 'apartment' }` | unchanged | M1 9-type taxonomy preserved |
| `features` | `[String]` | unchanged | D-10 (mock data, no SPEC home) |
| `maxGuests` | `{ type: Number, default: 0 }` | `{ type: Number }` | D-09 hospitality preserve (default removed; absent ≠ 0) |
| `amenities` | `{ type: [String], default: [] }` | unchanged | D-09 hospitality preserve (M1 HOSP-05) |
| `status` | enum `['pending','live','rejected','archived']` default `'pending'` | unchanged | **SCHEMA-03 hard rule — VERBATIM** |
| `submittedAt` … `archivedReasonNote` (11 audit fields) | top-level | unchanged top-level | **SCHEMA-04 hard rule — NEVER under terms.*** |
| `platformVerifications.{ownershipDocuments, ownerIdentityVerified, stateIssuedDocumentsVerified}` | nested object top-level | unchanged | D-10 keep set |
| `verificationUpdatedAt` / `verificationUpdatedByUid` | top-level | unchanged | D-10 keep set |

### Top-level ADD

| Field | New declaration | Source decision |
|-------|-----------------|-----------------|
| `dealType` | `{ type: String, enum: ['sale', 'rent_long', 'rent_daily'] }` | D-04 backfill destination (Plan 02 maps legacy `type:'rent'→'rent_long'`, `type:'sale'→'sale'`) |
| `schemaVersion` | `{ type: String, default: 'm3-nested-v1' }` | Claude's Discretion #5 — researcher RECOMMENDED |

### Top-level DROP (Mongoose strict:true silently drops on insert)

| M2 field | Disposition | Decision |
|----------|-------------|----------|
| `title: { required: true }` | → `content.title` (required moved to API layer in Plan 03) | D-15-adjacent (RESEARCH §283) |
| `description` | → `content.description` | nested move |
| `imageUrl` | DROPPED | D-15 (derived from `media.photos[0]` at render) |
| `videoUrl` | → wrap to `media.videos[]` (Plan 02) | D-14 |
| `panoramicPhotosUrl` | DROPPED | D-13 (no SPEC slot) |
| `is3DTourAvailable` | DROPPED | D-10 (derive from `media.tourUrl` at read time) |
| `bedrooms` | DROPPED | D-08 (no SPEC analog; `basics.rooms` is canonical) |
| `bathrooms` | DROPPED | D-08 (`basics.bathroom` enum private/none/shared, NOT a count) |
| `rooms: Number` (top-level) | → `basics.rooms: '1'\|'2'\|'3'\|'4+'` OR `basics.hotelRooms` | D-07 numeric→string conversion |
| `areaSqm` (top-level) | → `basics.areaSqm` | nested move |
| `price: Mixed` | → `basics.price: Number` | tightened per RESEARCH §283 |
| `currency` (default '$') | → `basics.currency: enum ['KGS','USD','EUR']` | nested + enum-tightened |
| `period` | DROPPED | D-10 (deal type implies period) |
| `type: enum ['rent','sale']` | DROPPED top-level → `dealType` | D-04 |
| `address: { required: true }` | DROPPED | D-05 (SPEC has no exact-address string field; replaced by `location.coordinates`) |
| `city` | → `location.city` | nested move |
| `latitude` | → `location.coordinates.lat` | nested move |
| `longitude` | → `location.coordinates.lng` | nested move |
| `agent: { name, rating, reviews, imageUrl }` | DROPPED | D-10 (dead field, never populated meaningfully) |
| `tours: [{ id, title, url, thumbnailUrl }]` | → `media.tourUrl: String` (first non-empty `tours[i].url`) | D-12 |
| `matterportUrl` | DROPPED | legacy alias |
| `images: [String]` | → `media.photos: [String]` | D-15 |

### New Nested Subtrees (per SPEC §"Suggested Data Shape")

```
location: { city, district='', coordinates: { lat, lng }, showExactAddress=false }
basics:   { areaSqm, price, currency:enum, rooms:enum, bathroom:enum, kitchen:enum, hotelRooms:enum, hotelClass:enum }
conditionAndAmenities: { condition:enum, furnished }
content:  { title, description, language:enum default 'ru' }
terms:    { negotiable, deposit:{amount, currency:enum}, prepaymentMonths, minTerm:enum }
media:    { photos:[]=default, videos:[]=default, tourUrl }
```

Enum values verbatim from PLAN.md:
- `basics.currency` / `terms.deposit.currency`: `['KGS', 'USD', 'EUR']` (RUB stays out per PROJECT.md M3 currency expansion)
- `basics.rooms` / `basics.hotelRooms`: `['1', '2', '3', '4+']`
- `basics.bathroom` / `basics.kitchen`: `['private', 'none', 'shared']`
- `basics.hotelClass`: `['economy', 'standard', 'comfort', 'premium']`
- `conditionAndAmenities.condition`: `['rough', 'whitebox', 'good', 'euro']`
- `content.language`: `['ru', 'en']` default `'ru'` (D-11)
- `terms.minTerm`: `['1_day', '1_month', '3_months']`

## 11 Audit Fields Verified Top-Level (SCHEMA-04)

All 11 fields confirmed via:
1. `grep -E "^  (submittedAt|approvedAt|approvedByUid|rejectedAt|rejectedByUid|rejectionReasonCode|rejectionReasonNote|archivedAt|archivedByUid|archivedReasonCode|archivedReasonNote):" src/models/Property.js` — all 11 lines at top-level indent (2-space, same as `status:`).
2. Mongoose introspection: `Property.schema.path('<field>')` is defined for all 11; `Property.schema.path('terms.<field>')` is undefined for all 11.
3. Property.test.js test "audit fields are TOP-LEVEL — never under terms.* (SCHEMA-04, defends Pitfall 4)" runs the full 11-field loop AND adds an explicit literal `Property.schema.path('terms.submittedAt')` negative assertion (acceptance-grep gate).

The 11 audit fields:
- `submittedAt` (M2 Phase 2 D-21)
- `approvedAt`, `approvedByUid` (M2 Phase 2 D-21)
- `rejectedAt`, `rejectedByUid`, `rejectionReasonCode`, `rejectionReasonNote` (M2 Phase 2 D-21)
- `archivedAt`, `archivedByUid` (M2 Phase 2 D-21)
- `archivedReasonCode`, `archivedReasonNote` (**M2 Phase 4 D-20** — extends the M2 Phase 2 list of 9 to 11)

## Property.test.js — Test Count

| Phase | Test count | Notes |
|-------|------------|-------|
| Pre-execution (M2 baseline) | 6 | enum cutover (D-01) + 9-field audit-field assertion |
| Post-execution (M3 Plan 01) | **13** | 6 carried-forward + 7 new M3 invariants |

### New M3 tests added

1. `creates a doc with nested location/basics/content shape (round-trip)` — happy path round-trip across all 6 nested subtrees.
2. `audit fields are TOP-LEVEL — never under terms.* (SCHEMA-04, defends Pitfall 4)` — 11-field loop + explicit literal `terms.submittedAt` negative assertion.
3. `hospitality top-level: maxGuests + amenities preserved per D-09 (M1 HOSP-05)` — round-trips `maxGuests=4`, `amenities=['wifi','parking']`; asserts `basics.hospitality` is NOT a schema path.
4. `strict mode silently drops legacy flat keys (D-05/D-08 — Mongoose strict:true default)` — passes `address`, `bedrooms`, `bathrooms`, `type`, top-level `rooms`; asserts all five round-trip as `undefined`.
5. `schemaVersion defaults to 'm3-nested-v1' (Claude's Discretion #5)` — asserts default value.
6. `specs virtual is DELETED (Claude's Discretion #6 — bedrooms/bathrooms dropped per D-08)` — schema-introspection assertion.
7. `platform verifications top-level — D-10 keep set (preserved verbatim from M2)` — round-trips and asserts schema paths.

### Carried-forward M2 tests (renamed for M3 framing)

1. `default status is "pending" when not specified (SCHEMA-03 default preserved)` (was: D-01 default flip)
2. `'draft' is REJECTED by enum (SCHEMA-03 — M2/M3 status enum unchanged)`
3. `'rejected' is ACCEPTED by enum (SCHEMA-03 — preserved from M2)`
4. `'live' resolves AND all 11 audit fields exist as null/undefined` (extended from 9 to 11)
5. `'archived' resolves (SCHEMA-03 — M2 enum preserved verbatim)`
6. `'pending' resolves; submittedAt is undefined unless set explicitly (route layer sets it on POST)`

### Test execution result (Node 24, jose@6 ESM)

```
PASS src/__tests__/Property.test.js
Test Suites: 1 passed, 1 total
Tests:       13 passed, 13 total
Time:        ~1.0 s
```

## Downstream Readiness

Plans 02 / 03 / 04 / 05 can now consume `require('../models/Property')` and trust that:

- `Property.schema.path('location.city')` → defined
- `Property.schema.path('basics.rooms')` → defined (string enum)
- `Property.schema.path('basics.price')` → defined (Number — tightened from Mixed)
- `Property.schema.path('content.title')` → defined (no `required:true` at schema layer; Plan 03 enforces at route layer)
- `Property.schema.path('media.photos')` → defined ([String], default [])
- `Property.schema.path('submittedAt')` → defined (top-level; Plan 03 sets on POST)
- `Property.schema.path('terms.submittedAt')` → **undefined** (SCHEMA-04 invariant)
- `Property.schema.path('status').enumValues` → `['pending', 'live', 'rejected', 'archived']` (SCHEMA-03 invariant)
- `Property.schema.virtuals.specs` → **undefined** (Claude's Discretion #6 invariant — clients reading legacy `doc.specs.beds` will get `undefined` after the cutover)
- `Property.collection.name` → `'listings'` (migration filter target preserved)

Plan 02 (`migrate-listings-m3.js`) idempotency filter `{ location: { $exists: false } }` will correctly distinguish migrated docs (with `location.*` set) from legacy docs (without).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added explicit literal `schema.path('terms.submittedAt')` assertion**
- **Found during:** Task 2 acceptance-grep verification.
- **Issue:** PLAN.md acceptance criterion required `grep -F "schema.path('terms.submittedAt')" src/__tests__/Property.test.js` ≥ 1, but my initial implementation used a template-literal `Property.schema.path(\`terms.${f}\`)` loop form that's more flexible (covers all 11 audit fields) but does not match the literal-string grep gate.
- **Fix:** Added two extra explicit assertions inside the audit-fields-top-level test — `expect(Property.schema.path('submittedAt')).toBeDefined()` and `expect(Property.schema.path('terms.submittedAt')).toBeUndefined()` — kept BEFORE the loop. Both forms now coexist (literal acceptance-grep gate + loop-form invariant for all 11 fields).
- **Files modified:** `src/__tests__/Property.test.js`
- **Commit:** Folded into `50728bd` (test commit) — added before the commit landed.

### Discretionary Calls Documented (NOT deviations)

These are CONTEXT.md "Claude's Discretion" items — researcher/planner explicitly delegated to executor, so they're decisions, not deviations:

- **Discretion #2 (Mongoose strict mode):** Left `strict: true` IMPLICIT (v9.x default). Explicit setting would be a no-op that misleadingly suggests opt-in.
- **Discretion #5 (schemaVersion marker):** ADDED `schemaVersion: { type: String, default: 'm3-nested-v1' }` per researcher RECOMMENDED.
- **Discretion #6 (specs virtual fate):** DELETED entirely (no rewrite). Researcher RECOMMENDED. Hidden-coupling avoidance — `basics.rooms` is a string enum vs M2 client's numeric expectation, so any rewrite would silently change semantics.
- **Test scope:** Property.test.js only. propertyRoutes.test.js / moderationRoutes.test.js / adminRoutes.test.js DEFERRED to Plans 03/04 (atomic-cutover principle — tests cut over with the routes that own the request/response shape).
- **Mongoose `Mixed → Number` price tightening:** Per PLAN.md `<action>` "Why these specific values per D-01..D-15" subsection (planner approved tightening; mock data is numeric).

### CLAUDE.md compliance

- No new npm dependencies added (PROJECT.md hard rule for Phase 1).
- No `firebase` / `@react-native-firebase/*` packages — backend is JWKS-only (auto-memory `no-firebase-sdk.md`).
- `nvm use 24` used before all `npm`/`node` invocations (auto-memory `backend-node-version.md`).
- No `react-navigation` migration touched (CLAUDE.md hard rule — out of scope).
- Test file env-wiring block preserved verbatim (lines 13-31 in updated file).

## Threat Flags

None. Phase 1 plan was purely model + tests; no new HTTP routes, no new file-access patterns, no new auth paths. The threat register from PLAN.md (`<threat_model>`) is fully addressed:

| Threat ID | Disposition | How addressed |
|-----------|-------------|---------------|
| T-01-01-Tampering-01 | mitigate | Mongoose strict:true default silently drops unknown keys — verified by Property.test.js "strict mode silently drops legacy flat keys" test |
| T-01-01-Tampering-02 | mitigate | Schema places audit fields top-level; Property.test.js introspects `terms.<auditField>` is undefined for all 11 fields (loop + literal) |
| T-01-01-Tampering-03 | mitigate | Status enum literal preserved; Property.test.js asserts `'draft'` ValidationError + each canonical value resolves |
| T-01-01-Information-Disclosure-01 | accept | `verificationUpdatedByUid` top-level preserved per D-10 (route-layer strip in propertyRoutes.js GET /:id is Phase 1 untouched — Plan 03's territory) |
| T-01-01-Repudiation-01 | accept | git log on src/models/Property.js is the audit trail — commits `b16223e` + `50728bd` are the canonical change records |

## Self-Check: PASSED

Verification commands (run from `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services` with `nvm use 24`):

1. `git log --oneline 2fb5639e..HEAD` → returns:
   ```
   50728bd test(01-01): update Property.test.js for M3 nested shape (SCHEMA-01/03/04)
   b16223e feat(01-01): reshape Property schema to nested M3 shape (D-04..D-15)
   ```
   FOUND: both task commits present.

2. `npx jest src/__tests__/Property.test.js --bail` → exits 0; 13/13 pass.

3. Schema introspection (run in node):
   - `Property.schema.path('location.city')` → defined ✓
   - `Property.schema.path('basics.rooms')` → defined ✓
   - `Property.schema.path('submittedAt')` → defined ✓
   - `Property.schema.path('terms.submittedAt')` → undefined ✓
   - `Property.schema.virtuals.specs` → undefined ✓
   - `Property.schema.path('status').enumValues` → `['pending','live','rejected','archived']` ✓
   - `Property.collection.name` → `'listings'` ✓
   - `Property.schema.path('schemaVersion')` → defined ✓
   - `Property.schema.path('maxGuests')` → defined ✓
   - `Property.schema.path('amenities')` → defined ✓
   - `Property.schema.path('platformVerifications.ownerIdentityVerified')` → defined ✓
   - `Property.schema.path('bedrooms')` → undefined (D-08 drop) ✓
   - `Property.schema.path('bathrooms')` → undefined (D-08 drop) ✓
   - `Property.schema.path('address')` → undefined (D-05 drop) ✓

4. `grep "audit fields top-level" /Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/models/Property.js` → matches the SCHEMA-04 invariant comment line.

5. `grep "schemaVersion.*m3-nested-v1" /Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/models/Property.js` → matches.

6. `grep -E "ALLOWED_OWNER_STATUS_TRANSITIONS|specs.*virtual" /Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/models/Property.js` → returns only the comment block documenting the deletion. The `PropertySchema.virtual('specs')` declaration is gone.

All claims verified.

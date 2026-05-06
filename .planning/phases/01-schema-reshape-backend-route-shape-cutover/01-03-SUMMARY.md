---
phase: 01-schema-reshape-backend-route-shape-cutover
plan: 03
subsystem: backend-routes-property-cutover
tags: [routes, cutover, m3, backend, atomic-break, brownfield, schema-05, schema-03, schema-04]
requirements: [SCHEMA-05, SCHEMA-03, SCHEMA-04]
dependency-graph:
  requires:
    - JayTap-services/src/models/Property.js (Plan 01-01 output — nested M3 schema with 11 audit fields top-level + status enum + collection 'listings')
    - JayTap-services/src/scripts/migrate-listings-m3.js (Plan 01-02 output — operator-runnable migration; the route cutover commit lands strictly AFTER the migration runs successfully per ROADMAP SC #4)
    - JayTap-services/src/__tests__/setup.js (mongodb-memory-server bootstrap, auto-loaded via jest.config.cjs)
    - JayTap-services/src/__tests__/fixtures/jwks-tokens.js (test JWK helper for buildToken supertest auth)
  provides:
    - propertyRoutes.js cut over to nested-shape body destructure on POST + PUT — every route's request/response now speaks SPEC §"Suggested Data Shape"
    - M3_NESTED_BODY_REQUIRED 400 response code (Plan 04 + Phase 2 client error handling will discriminate on it)
    - Updated supertest fixtures (40 nested-shape Property.create / collection.insertOne calls) + 11 new M3 nested-shape contract tests + verbatim preservation of M2 D-22 sanitizer/auto-flip + CR-01 anti-tamper + Phase 4 archive lifecycle suites
    - 41-test propertyRoutes.test.js suite — green under Node 24
  affects:
    - Plan 04 (moderationRoutes.js cutover — sibling parallel-wave cutover for moderation queue/approve/reject/edit-on-behalf routes; the propertyRoutes anti-tamper + nested-body validation patterns provide the canonical shape for the moderation cutover)
    - Plan 05 (operator runbook — references this plan's commit SHAs as the "cutover commit" for ROADMAP SC #4: backend read paths return nested shape exclusively after this commit lands)
    - Phase 2 (RN client cutover — every screen reading the GET / + GET /:id + GET /user/:firebaseUid response now consumes nested-shape; D-01 atomic-break is now hot — M2 client TestFlight build 27 / Play Internal versionCode 30 will receive 400 with M3_NESTED_BODY_REQUIRED on POST until Phase 2 ships)
tech-stack:
  added:
    - M3_NESTED_BODY_REQUIRED HTTP 400 response code on POST /api/properties (D-01 atomic-break sentinel)
    - Nested body parsing for multipart/form-data PUT (location/basics/conditionAndAmenities/content/terms JSON-string parse path — multer delivers strings, JSON delivers objects)
    - makeNestedFixture / nestedLegacyInsert test helpers (single source for the nested-shape supertest fixture pattern; nextListingId() avoids unique-index null collision)
  patterns:
    - In-file precedent: existing CR-01 anti-tamper PUT block (M2 ROLE-04 DBC) carried verbatim — fixture flipped to nested
    - Anti-spoofing actorUid sourcing (req.firebaseUid from JWKS sub, never req.body) — verified via grep gate `grep -cE "uid:\s*req\.(body|headers)" src/routes/propertyRoutes.js` returns 0
    - Multer-uploaded photos flow into media.photos[] (D-15) — replaces M2's top-level images / imageUrl
    - PUT updateData JSON-string parse for nested subtrees (multipart-form-data compatibility — Phase 2 client may use multipart, JSON-only clients still work)
    - Strict body-status sanitizer (top-level operands per SCHEMA-04) preserved verbatim from M2 D-22
key-files:
  created: []
  modified:
    - /Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/routes/propertyRoutes.js
    - /Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/__tests__/propertyRoutes.test.js
decisions:
  - PUT body-status sanitizer + rejected->pending auto-flip + 409 archived-readonly guard PRESERVED VERBATIM (top-level operands per SCHEMA-03/04) — the cutover only touches body destructure + body-coercion zones, never the sanitizer
  - PATCH /api/properties/:id/verifications PRESERVED VERBATIM (admin-only top-level platformVerifications write per D-10 + M1 GATE-02 + M2 CR-01 anti-tamper)
  - MOD-13 stripModIdentity in GET /:id PRESERVED VERBATIM (operates on top-level rejectedByUid/approvedByUid per SCHEMA-04)
  - Phase 4 routes (POST /:id/archive + POST /:id/unarchive + DELETE /:id) PRESERVED VERBATIM (top-level audit field operands per SCHEMA-04 + Phase 4 Wave-2 race-safe primitives)
  - Geocoder fallback on POST + PUT REMOVED entirely (D-05 + memory `geocoder-nominatim-hang-axios-network-error.md` — POST validator now requires client-supplied location.coordinates; Phase 2 owns the client-side map-pin logic). The 15s axios hang vector on Nominatim is gone
  - propertyData built EXPLICITLY (no `...req.body` spread) per CR-01 anti-tamper invariant — every key listed by name
  - ownerUid sourced from req.firebaseUid (JWKS-verified token sub) — anti-spoofing per HF-03 + memory `phase45-landlord-application-uid-mismatch-bug.md`
  - status defaults to 'pending' via Mongoose schema default (M2 MOD-03) — NOT manually set in propertyData. submittedAt server-stamped at submission time (SCHEMA-04)
  - PUT image-merge semantics changed from "merge with existingImages key" to "merge with media.photos[]" (D-15 nested) — concat semantics preserved (existing photos kept + newly-uploaded URLs appended)
  - JSON-string parse fallback for nested subtrees on PUT (location / basics / conditionAndAmenities / content / terms) — multipart/form-data compatibility for Phase 2 client write paths that may use FormData
  - propertyRoutes.test.js fixture pattern: single makeNestedFixture helper + nextListingId() unique-id generator — ensures every Property.create call survives the listingId unique-non-sparse index without null-collision (same pitfall Plan 01-02 hit)
metrics:
  duration_minutes: 8
  tasks_completed: 2
  files_modified: 2
  files_created: 0
  tests_added: 11
  tests_total: 41
  insertions: 551
  deletions: 276
  completed_date: 2026-05-06
backend_repo_pre_sha: 53d025c67173d1f6ad1013a3e59c8e64f99a478c
backend_repo_post_sha: c4bf01d
jaytap_repo_pre_sha: 4456bde525101df7cfaeb215d292ac6b259aad6c
---

# Phase 1 Plan 03: propertyRoutes.js + propertyRoutes.test.js Cutover Summary

Cut over `propertyRoutes.js` from M2's flat-shape body/response (`title`, `address`, `price`, `bedrooms`, `bathrooms`, `type`, top-level `rooms` numeric, etc.) to M3's nested-shape body/response (`location.{city, district, coordinates, showExactAddress}`, `basics.{areaSqm, price, currency, rooms}`, `content.{title, description, language}`, `media.{photos[], videos[], tourUrl}`, etc.) per anchor SPEC §"Suggested Data Shape" and CONTEXT.md D-01..D-15. Every M2 invariant preserved verbatim — D-22 body-status sanitizer + rejected→pending auto-flip + 409 archived read-only guard, CR-01 anti-tamper for non-admin owner mutations of `platformVerifications`, MOD-13 `stripModIdentity` trust-boundary strip on GET /:id, Phase 4 archive lifecycle (owner-archive / owner-unarchive / hard-delete admin-only) — and the geocoder fallback removed entirely (D-05 + memory `geocoder-nominatim-hang-axios-network-error.md`). `propertyRoutes.test.js` extended from 30 tests (7 RED + 23 PASS at session start) to 41 GREEN tests under Node 24 (cross-suite: 100/100 green with Property.test.js + migrate-listings-m3.test.js). Plan 04 ships the parallel `moderationRoutes.js` cutover; together they make the property-CRUD + moderation-queue surface speak nested-shape exclusively per ROADMAP SC #4.

## Diff Stats

```
 src/__tests__/propertyRoutes.test.js | 519 ++++++++++++++++++++++++++++-------
 src/routes/propertyRoutes.js         | 308 +++++++++------------
 2 files changed, 551 insertions(+), 276 deletions(-)
```

(Computed against backend pre-execution SHA `53d025c` via `git diff --stat 53d025c..HEAD`.)

`propertyRoutes.js` net delta: +132 / -176 (132 insertions, 176 deletions, **net -44 LOC**) — concentrated in POST handler (~lines 105-260; ~50 LOC of body destructure + propertyData construction; geocoder fallback ~50 LOC removed) and PUT handler (~lines 354-540; ~80 LOC of body coercion changed + ~60 LOC of legacy image/tour/geocoder reshape removed). All other zones (GET /, GET /user/:firebaseUid, GET /:id with MOD-13 stripModIdentity, PATCH /:id/verifications, POST /:id/archive, POST /:id/unarchive, DELETE /:id) preserved verbatim.

## Commits

| # | Hash | Type | Subject | Repo |
|---|------|------|---------|------|
| 1 | `6f815f5` | feat | cut over propertyRoutes.js to nested-shape body (D-01 atomic-break) | backend (JayTap-services) |
| 2 | `c4bf01d` | test | rewrite propertyRoutes.test.js for M3 nested-shape contract | backend (JayTap-services) |

The closing `docs(01-03)` SUMMARY commit lands in the JayTap planning repo (this file).

## Cutover Zones in `propertyRoutes.js`

### Zone 1 — POST / body destructure (CUTOVER)

**Before (flat):** `{ title, description, address, city, price, currency, period, type, propertyType, bedrooms, bathrooms, areaSqm, rooms, maxGuests, amenities, features, videoUrl, panoramicPhotosUrl, instagramUrl, tours, availableDate }`

**After (nested):** `{ propertyType, dealType, instagramUrl, availableDate, listingId: clientListingId, maxGuests, amenities, features, location, basics, conditionAndAmenities, content, terms, media: clientMedia }`

### Zone 2 — POST / validation (CUTOVER)

**Before:** `if (!title || !address || !price)` → 400 with `'Missing required fields: title, address, and price are required'`.

**After:** `if (!content?.title || !location?.coordinates || basics?.price === undefined)` → 400 with `{ message: 'Missing required fields: content.title, location.coordinates, and basics.price are required', code: 'M3_NESTED_BODY_REQUIRED' }`.

### Zone 3 — POST / propertyData construction (CUTOVER)

**Before:** Flat fields built into propertyData (`title`, `description`, `address`, `latitude`, `longitude`, `city`, `price`, `currency`, `period`, `type`, `bedrooms`, `bathrooms`, `areaSqm`, top-level `rooms` numeric, `images`, `imageUrl`, `tours`, `is3DTourAvailable`). Geocoder pre-call fed `latitude`/`longitude`. Admin platformVerifications inline parse path on POST.

**After:** Nested subtrees passed through (`location`, `basics`, `conditionAndAmenities`, `content`, `terms`); multer-uploaded photos flow into `media.photos[]` overriding any client-supplied photos (D-15); top-level operational metadata (`listingId`, `propertyType`, `dealType`, `ownerUid: req.firebaseUid`, `instagramUrl`, `availableDate`, `maxGuests`, `amenities`, `features`); top-level audit `submittedAt: new Date()` (SCHEMA-04). **Status defaults to 'pending' via Mongoose schema default — NOT manually set.** Admin platformVerifications inline-parse on POST DROPPED (CR-01 anti-tamper — only the dedicated PATCH /:id/verifications route writes trust signals; tests verify the round-tripped doc has `platformVerifications.ownerIdentityVerified === false` even when an admin POSTs `platformVerifications: { ownerIdentityVerified: true }`).

### Zone 4 — PUT /:id body destructure + body-coercion (CUTOVER)

**Before:** Flat-shape `updateData = { ...req.body }`; legacy `existingImages` merge with new images; geocoder re-call on `address`/`city` change; tours[] reparse + `is3DTourAvailable` derive; top-level rooms/maxGuests parseInt coercion.

**After:** Nested-shape `updateData = { ...req.body }`; multer-uploaded photos merge with client-supplied `media.photos[]` (concat existing + newly-uploaded); JSON-string parse fallback for `media`, `location`, `basics`, `conditionAndAmenities`, `content`, `terms` subtrees (multipart compatibility); `availableDate` Date coercion preserved; `maxGuests` parseInt preserved (top-level per D-09); `features`/`amenities` JSON-string parse preserved.

## What's PRESERVED VERBATIM (M2 invariants)

| Invariant | Lines | Source rule | Verified by |
|-----------|-------|-------------|-------------|
| **GET /** D-05 lock to live + legacy null `$or` filter | 44-53 | M2 MOD-04 | `D-05 t1/t2/t3` tests |
| **GET /user/:firebaseUid** D-12 owner-scoped role-aware filter | 58-78 | M2 D-12 | `D-12 t10/t11/t12` tests |
| **GET /:id** D-06 deep-link 404 + MOD-13 stripModIdentity + owner enrichment | 296-350 | M2 MOD-04/05/13 + Phase 3 D-02 | `D-06 t4..t9` + new `GET /:id returns nested-shape doc with owner enrichment` test |
| **PATCH /:id/verifications** admin-only top-level platformVerifications write | 265-290 | D-10 + M1 GATE-02 + M2 CR-01 | New `PATCH /:id/verifications admin writes top-level platformVerifications` + `PATCH non-admin returns 403` tests |
| **PUT /:id** owner-or-admin auth check (`isOwner` + `actingUser.userType === 'admin'`) | 362-370 | M2 ROLE-04 | All PUT tests (response 200 vs 403) |
| **PUT /:id** CR-01 anti-tamper strip for non-admin (`platformVerifications` / `verificationUpdatedAt` / `verificationUpdatedByUid`) | 379-399 | M2 CR-01 / T-1-02 | `userType:'user' owner PUT` test |
| **PUT /:id** D-22 archived 409 read-only guard | 401-408 | M2 D-22 | `D-22 t15` test |
| **PUT /:id** D-22 body-status sanitizer (`ALLOWED_OWNER_STATUS_TRANSITIONS = []`) | 410-419 | M2 D-22 | `D-22 t16/t17` + new `PUT /:id D-22 body-status sanitizer preserved` test |
| **PUT /:id** D-22 rejected→pending auto-flip (top-level audit operands) | 421-431 | M2 D-22 + SCHEMA-04 | `D-15 t13` + new `PUT /:id D-22 rejected->pending auto-flip preserved` test |
| **POST /:id/archive** Phase 4 owner-archive race-safe primitive + audit-log orphan-tolerant write | 548-606 | Phase 4 D-01 + D-18 | All 5 owner-archive tests |
| **POST /:id/unarchive** Phase 4 D-13 self-archived restore | 613-681 | Phase 4 D-13 + D-15 | Both owner-unarchive tests |
| **DELETE /:id** Phase 4 D-04 hard-delete admin-only + HARD_DELETE_REQUIRES_ARCHIVED precondition | 689-733 | Phase 4 D-04 + D-18 | All 4 hard-delete tests |
| **HF-03 anti-spoofing** `actorUid: req.firebaseUid` sourcing | 595, 656, 715 | HF-03 + memory phase45-landlord-application-uid-mismatch-bug.md | New `POST / ownerUid sourced from JWKS token sub` + Phase 4 `audit row written with actorUid from JWKS sub` tests |

Verified via `grep -nE "ALLOWED_OWNER_STATUS_TRANSITIONS\|stripModIdentity\|platformVerifications" src/routes/propertyRoutes.js` returns 18 hits (all preservation points present).

## What's REMOVED

| Removal | Source rule | Reason |
|---------|-------------|--------|
| `geocodeAddress` import + POST geocoder pre-call + PUT re-geocode-on-address-change | D-05 + memory `geocoder-nominatim-hang-axios-network-error.md` | POST validator now requires client-supplied `location.coordinates`; Phase 2 owns the client-side map-pin logic; the 15s axios hang vector on Nominatim is gone |
| Top-level flat fields from POST destructure: `title`, `description`, `address`, `city`, `price`, `currency`, `period`, `type`, `bedrooms`, `bathrooms`, `areaSqm`, top-level `rooms`, `videoUrl`, `panoramicPhotosUrl`, `tours` | D-01 + D-04..D-15 | Plan 01-01 schema dropped them; flat-shape POST body now rejected with 400 / M3_NESTED_BODY_REQUIRED |
| Top-level flat fields from POST propertyData construction: `latitude`, `longitude`, `images`, `imageUrl`, `tours`, `is3DTourAvailable` | D-15 + D-12 + D-10 | media.photos[] is the new home for images; tours[] coalesced to single tourUrl (Plan 01-02 migration); is3DTourAvailable derive at read time |
| Admin platformVerifications inline-parse path on POST | CR-01 anti-tamper hardening | Only the admin PATCH /:id/verifications route may write trust signals — POST never accepts `platformVerifications` in propertyData |
| PUT existingImages key + tours reparse + top-level rooms parseInt | D-15 + D-12 + Plan 01-01 schema | media.photos[] merge replaces existingImages; tours dropped; rooms is now `basics.rooms` string-enum |

## What's ADDED

| Addition | Source rule | Notes |
|----------|-------------|-------|
| Nested validation `if (!content?.title || !location?.coordinates || basics?.price === undefined)` returning `code: 'M3_NESTED_BODY_REQUIRED'` | SPEC §"Validation Rules" Step 5/2/3 + D-01 atomic-break | Load-bearing error code — Plan 04 + Phase 2 client error handling discriminate on it |
| JSON-string parse fallback for nested subtrees (`location`, `basics`, `conditionAndAmenities`, `content`, `terms`) on PUT | Multipart/form-data compatibility | Phase 2 client may use FormData; JSON-only clients still work |
| `media.photos[]` merge: existing client-supplied photos kept + newly-uploaded multer URLs appended | D-15 | Replaces M2's `images: [...existingImages, ...newImageUrls]` flat-shape merge |

## `propertyRoutes.test.js` — Test Count

| Phase | Test count | Notes |
|-------|------------|-------|
| Pre-execution (M2 + Phase 2 RED + Phase 4) | 30 | 23 PASS + 7 RED (the 7 RED pre-existed at session start because Plan 01-01 dropped flat-shape `title` field — they were Phase 2 RED tests asserting on top-level `title`) |
| Post-execution (M3 Plan 03) | **41** | 30 carried-forward (fixtures flipped to nested) + 11 new M3 nested-shape contract tests |

### New M3 tests added (11)

In a fresh `describe('propertyRoutes — M3 nested shape (Phase 1 Plan 03 cutover)')` block:

1. `GET / returns nested-shape array (no top-level address/bedrooms/type)` — happy-path nested response shape; verifies flat-shape leakage gone.
2. `GET /:id returns nested-shape doc with owner enrichment + audit fields top-level` — confirms `owner.email` populated; `terms.submittedAt` undefined (SCHEMA-04 invariant).
3. `POST / accepts nested-shape body and returns 201 with status=pending + submittedAt` — happy path; verifies status defaults to 'pending' via schema default + `ownerUid` from JWKS sub + `submittedAt` server-stamped.
4. `POST / flat-shape body (M2 client) returns 400 with M3_NESTED_BODY_REQUIRED (D-01 atomic break)` — defends D-01 atomic-break invariant.
5. `POST / partial-nested body (missing basics.price) returns 400 with M3_NESTED_BODY_REQUIRED` — defends validator's three-field check (each missing field individually verifiable).
6. `POST / CR-01 anti-tamper: platformVerifications stripped from owner POST body` — verifies route does NOT spread `req.body` into propertyData; round-tripped doc has default-false trust signals even when client sends `true`.
7. `POST / ownerUid sourced from JWKS token sub, NOT req.body (HF-03 anti-spoofing)` — defends against `ownerUid: 'attacker-uid'` body spoof per memory `phase45-landlord-application-uid-mismatch-bug.md`.
8. `PUT /:id D-22 rejected->pending auto-flip preserved with nested-shape fixture` — verifies M2 D-22 still works post-cutover; ALSO asserts `terms.submittedAt`/`terms.rejectionReasonCode` undefined (SCHEMA-04 invariant — audit fields stay top-level).
9. `PUT /:id D-22 body-status sanitizer preserved (owner cannot mutate status to live)` — verifies M2 D-22 sanitizer still works post-cutover.
10. `PATCH /:id/verifications admin writes top-level platformVerifications (D-10 preserve)` — verifies admin PATCH route preserved; `platformVerifications.ownerIdentityVerified === true` at top level; `verificationUpdatedAt` set; `verificationUpdatedByUid` from JWKS sub.
11. `PATCH /:id/verifications non-admin returns 403` — verifies M1 GATE-02 + M2 CR-01 admin gate preserved.

### Carried-forward tests (30 — fixtures flipped to nested)

- 1 CR-01 PUT anti-tamper (T-1-02).
- 18 Phase 2 status field absorption (D-05 ×3 + D-06 ×6 + D-12 ×3 + D-15/D-22 ×5 + MOD-03 t18) — all assertions on top-level `status` / `submittedAt` / `rejectionReasonCode` etc. (SCHEMA-04) preserved verbatim; titles flipped from `p.title` → `p.content?.title`.
- 5 Phase 4 owner-archive (live archive, non-owner 403, already-archived 409, audit anti-spoofing, race Promise.all 200/409).
- 2 Phase 4 owner-unarchive (self-archived restore, mod-archived 403 NOT_ORIGINAL_ARCHIVER).
- 4 Phase 4 hard-delete admin-only (admin 200 with full snapshot, mod 403, owner 403, non-archived 400 HARD_DELETE_REQUIRES_ARCHIVED).

### Test execution result (Node 24, jose@6 ESM, mongodb-memory-server)

```
PASS src/__tests__/propertyRoutes.test.js
PASS src/__tests__/Property.test.js
PASS src/__tests__/migrate-listings-m3.test.js
Test Suites: 3 passed, 3 total
Tests:       100 passed, 100 total
Time:        ~3.5 s
```

(Cross-suite gate per plan `<verification>`: Plan 01-01 + 01-02 + 01-03 all green together — no cross-suite regression introduced by the route cutover.)

## Downstream Readiness

Plan 04 (`moderationRoutes.js` cutover — sibling parallel-wave) can now ship:

- `propertyRoutes.js` provides the canonical CR-01 anti-tamper pattern (no `req.body` spread into propertyData; explicit key list).
- `M3_NESTED_BODY_REQUIRED` error code is now the established sentinel for atomic-break validation rejections — Plan 04's moderation `PATCH /listings/:id/edit-on-behalf` may emit the same code on flat-shape bodies.
- `makeNestedFixture` test helper pattern is now the established norm for backend route supertest fixtures — Plan 04 should mirror it.
- Top-level audit field operands are unaffected by the cutover — Plan 04's `findOneAndUpdate({ _id, status: 'pending' }, { $set: { status, approvedAt, approvedByUid } })` race-safe pattern carries verbatim.

Plan 05 (operator runbook) can reference the cutover SHA chain:
- Plan 01-01 schema reshape: `b16223e` + `50728bd` (post-SHA `50728bd`).
- Plan 01-02 migration script: `c05ac79` + `03ea882` + `53d025c` (post-SHA `53d025c`).
- **Plan 01-03 propertyRoutes cutover: `6f815f5` + `c4bf01d` (post-SHA `c4bf01d`).**
- Plan 01-04 moderationRoutes cutover: SHAs TBD (sibling executor, runs after this plan).

Per ROADMAP SC #4 (verbatim): "Backend read paths return the nested shape exclusively after the route-shape cutover commit; the cutover commit lands strictly AFTER the migration runs successfully." This plan's two commits + Plan 04's commits constitute the cutover commit chain.

## Atomic-Break Tester Impact (D-01)

Per CONTEXT.md D-01 atomic-break: M2 client (TestFlight build 27 / Play Internal versionCode 30) sending FLAT body POST receives 400 with `code: 'M3_NESTED_BODY_REQUIRED'`. This is the intended behavior — testers wait for Phase 2's nested-aware client. Plan 05's runbook owns the tester comms (Slack/email "expect Home to break for ~N days; install Phase 2 build when notified").

GET / + GET /:id + GET /user/:firebaseUid responses change SHAPE (now nested). M2 client's flat-shape reads (`p.title`, `p.address`, `p.bedrooms`) will return `undefined` post-cutover — Home / Favorites / RenterListings / OwnerListings / PropertyDetails will show empty rows or render placeholders until Phase 2 ships. This matches the M1+M2 atomic-cutover precedent (no dual-flow window).

## Deviations from Plan

### Auto-fixed Issues

None. The plan's `<interfaces>` TARGET POST + PUT blocks were complete enough to ship without auto-fix Rule 1/2/3 deviations. The minor adjustments were:

1. **Comment text reword (acceptance-grep gate compliance)**: Initial cutover comment mentioned `geocodeAddress` literally to document the removal; plan acceptance criterion `grep "geocodeAddress" src/routes/propertyRoutes.js` returns 0 lines. Reworded to "legacy address-string lookup helper REMOVED per CONTEXT.md D-05 + memory `geocoder-nominatim-hang-axios-network-error.md`" — preserves documentation value while satisfying the literal grep gate. NOT a deviation; a refinement to comply with the plan's explicit acceptance criterion.

### Discretionary Calls Documented (NOT deviations)

These are interpretation calls the plan delegated to the executor:

- **PUT image-merge semantics:** Plan said "media.photos[]"; chose CONCAT (existing photos kept + newly-uploaded URLs appended) over REPLACE. M2 had concat-via-existingImages; preserving the affordance for partial-replace upload UX. Phase 2 client decides when to clear vs. append; the route accepts either (clears via empty `media.photos: []`).
- **JSON-string parse fallback for nested subtrees on PUT:** Added because multer parses multipart/form-data by setting `req.body[key]` to JSON strings when the FormData field value was JSON-encoded. Without this fallback, nested subtree edits via FormData would store `location: '{"city":"Bishkek",...}'` as a string. Phase 2 client may use FormData (the M1 PUT path uses FormData with multer `upload.array('images', 40)`); falling back to `JSON.parse` keeps the surface compatible.
- **`maxGuests` parseInt coercion preserved:** Top-level `maxGuests` per D-09 hospitality preserve; M2 PUT coerced via `parseInt(updateData.maxGuests)` to handle multipart string delivery. Preserved verbatim.
- **`status` default omission in POST propertyData:** Mongoose schema default `'pending'` (Plan 01-01) handles M2 MOD-03; setting it explicitly in propertyData would be redundant noise. Verified by `grep -E "status:\s*'pending'" src/routes/propertyRoutes.js` returning matches only in the PUT auto-flip block (line 425), NOT in POST construction.

### CLAUDE.md compliance

- No new npm dependencies added (PROJECT.md hard rule for Phase 1).
- No `firebase` / `@react-native-firebase/*` packages — backend is JWKS-only (auto-memory `no-firebase-sdk.md`).
- `nvm use 24` used before all `npm`/`node`/`jest` invocations (auto-memory `backend-node-version.md`).
- No `react-navigation` migration touched (CLAUDE.md hard rule — out of scope).
- AWS env block preserved verbatim from M2 propertyRoutes.test.js (mandatory — multerS3 → S3Client at module-load).
- Geographic scope (KG/KZ/UZ) preserved — `content.language` defaults to 'ru' for Bishkek launch market.
- 9-type 3-category taxonomy preserved — `propertyType` enum unchanged at the schema layer; cutover does NOT introduce a new taxonomy.
- Hospitality showcase-only invariant preserved — `maxGuests` + `amenities` stay top-level (D-09); no per-night pricing or booking calendar fields introduced.

### Auth gates encountered

None. All test fixtures use the in-memory test JWKS keypair; no production auth path exercised.

## Threat Flags

None. Phase 1 plan is a route-shape cutover only; no new HTTP routes, no new auth paths, no new IAM permissions, no new file-access patterns. The threat register from PLAN.md `<threat_model>` is fully addressed:

| Threat ID | Disposition | How addressed |
|-----------|-------------|---------------|
| T-01-03-Tampering-01 (mass-assignment via nested POST body — `platformVerifications`) | mitigate | propertyData built EXPLICITLY (no `req.body` spread); `platformVerifications` NOT in the explicit list. Test 6 (POST CR-01 anti-tamper) asserts round-tripped doc has default-false trust signals. Admin-only PATCH /:id/verifications is the ONLY write path. |
| T-01-03-Tampering-02 (owner mutating top-level `status` via PUT body) | mitigate | M2 D-22 body-status sanitizer (lines 410-419) PRESERVED VERBATIM. Tests `D-22 t16` (status='live') + `D-22 t17` (status='archived') + new `PUT /:id D-22 body-status sanitizer preserved` test all assert saved status unchanged. |
| T-01-03-Tampering-03 (owner mutating top-level audit fields — `archivedReasonCode` etc.) | accept-with-followup | Acknowledged risk that exists in M2 PUT (NOT introduced by Phase 1). `Object.assign(property, updateData)` would let a malicious owner set `archivedAt` via PUT. Folded into Phase 4 / Phase 5 hardening backlog rather than blocking Phase 1. M2 archive-lifecycle test suite (`Phase 4 — Archive Lifecycle: hard-delete admin-only`) is unchanged by this cutover. |
| T-01-03-Tampering-04 (`ownerUid` mass-assignment via POST body) | mitigate | POST destructure does NOT pull `ownerUid` from `req.body`; propertyData explicitly sets `ownerUid: req.firebaseUid` from JWKS sub. Test 7 (`POST / ownerUid sourced from JWKS token sub`) asserts spoofed `ownerUid: 'attacker-uid'` is overridden. Grep gate `grep -cE "ownerUid:\s*req\.body" src/routes/propertyRoutes.js` returns 0. |
| T-01-03-Information-Disclosure-01 (`rejectedByUid`/`approvedByUid` to anonymous) | mitigate | M2 MOD-13 stripModIdentity (lines 317-324) PRESERVED VERBATIM. `D-06 t8` (non-owner non-mod) returns 404 (the listing isn't reachable in the first place); when the listing IS live, `D-06 t9` returns 200 and the strip applies. |
| T-01-03-Information-Disclosure-02 (pending/rejected listings to anonymous) | mitigate | M2 MOD-04/05 server-side filter to live + legacy null PRESERVED VERBATIM (line 46 + line 303 status coalesce check). `D-05 t1/t2/t3` + `D-06 t4` defend. |
| T-01-03-DoS-01 (geocoder hang on POST) | mitigate | Cutover REMOVES the geocoder fallback path entirely. POST validator requires client-supplied `location.coordinates`. The 15s axios hang vector on Nominatim is gone. |

## Self-Check: PASSED

Verification commands (run from `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services` with `nvm use 24`):

1. **Scope**: `git diff --name-only 53d025c..HEAD` returns EXACTLY 2 files:
   ```
   src/__tests__/propertyRoutes.test.js
   src/routes/propertyRoutes.js
   ```
   FOUND: no scope creep. Plan 04 (moderationRoutes.js) untouched.

2. **Test gate**: `npx jest src/__tests__/propertyRoutes.test.js src/__tests__/Property.test.js src/__tests__/migrate-listings-m3.test.js --bail` → exits 0; 100/100 tests pass (41 propertyRoutes + 13 Property + 46 migration).

3. **M2 invariants present**: `grep -nE "ALLOWED_OWNER_STATUS_TRANSITIONS|stripModIdentity|platformVerifications" src/routes/propertyRoutes.js | wc -l` returns `18`. All three invariants visible in the cutover code.

4. **Flat-body destructure removed**: `grep -nE "req\.body\.address|req\.body\.latitude|req\.body\.bedrooms|req\.body\.type" src/routes/propertyRoutes.js` returns 0 matches. Flat-shape body destructure is gone.

5. **Anti-spoofing grep gate**: `grep -nE "uid:\s*req\.(body|headers)" src/routes/propertyRoutes.js` returns 0 matches (HF-03 carry-forward).

6. **Plan acceptance composite gate** (verbatim from PLAN.md `<verify>` Task 1):
   ```
   node -c src/routes/propertyRoutes.js
   grep -q "content?.title" → 1
   grep -q "location?.coordinates" → 1
   grep -q "basics?.price" → 1
   grep -q "M3_NESTED_BODY_REQUIRED" → 3
   grep -q "ALLOWED_OWNER_STATUS_TRANSITIONS" → 3
   grep -q "if (property.status === 'rejected')" → 1
   grep -q "ownerUid: req.firebaseUid" → 4
   ! grep "if (!title || !address || !price)" → 0
   ! grep "geocodeAddress" → 0
   grep -q "verificationUpdatedAt" → 4
   ```
   Output: `PROPERTY ROUTES CUTOVER OK`.

7. **Plan acceptance composite gate** (verbatim from PLAN.md `<verify>` Task 2):
   ```
   grep -F "M3_NESTED_BODY_REQUIRED" → 5
   grep -F "makeNestedFixture" → 16
   ! grep -E "Property\.create.*address: '1 St'" → 0
   grep -F "rejected->pending auto-flip preserved" → 1
   grep -F "body-status sanitizer" → 4
   grep -F "CR-01" → 5
   grep -F "POST / accepts nested-shape body" → 1
   ```

8. **No file deletions in commits**: `git log --diff-filter=D --name-only 53d025c..HEAD` returns no output.

9. **Commit chain**: `git log --oneline 53d025c..HEAD` returns:
   ```
   c4bf01d test(01-03): rewrite propertyRoutes.test.js for M3 nested-shape contract
   6f815f5 feat(01-03): cut over propertyRoutes.js to nested-shape body (D-01 atomic-break)
   ```

10. **JayTap planning repo baseline preserved**: `git -C /Users/beckmaldinVL/development/mobileApps/JayTap rev-parse HEAD` returns `4456bde` pre-SUMMARY-commit (matches expected pre-execution SHA — orchestrator owns STATE.md/ROADMAP.md updates; this plan only adds the SUMMARY).

All claims verified. Backend repo at `c4bf01d` (post-Plan-01-03). Plan 04 (moderationRoutes.js cutover) starts from `c4bf01d` and ships in parallel-wave.

---
phase: 01-schema-reshape-backend-route-shape-cutover
plan: 04
subsystem: backend-routes-moderation-cutover
tags: [routes, cutover, m3, backend, moderation, atomic-break, brownfield, schema-05, schema-03, schema-04]
requirements: [SCHEMA-05, SCHEMA-03, SCHEMA-04]
dependency-graph:
  requires:
    - JayTap-services/src/models/Property.js (Plan 01-01 — nested M3 schema with 11 audit fields top-level + status enum + collection 'listings')
    - JayTap-services/src/scripts/migrate-listings-m3.js (Plan 01-02 — operator-runnable migration; route cutover lands strictly AFTER migration runs successfully per ROADMAP SC #4)
    - JayTap-services/src/routes/propertyRoutes.js (Plan 01-03 — sibling parallel-wave cutover; provides canonical patterns for nested-subtree JSON.parse fallback + media.photos[] merge + 21-key forbidden list)
    - JayTap-services/src/__tests__/setup.js (mongodb-memory-server bootstrap, auto-loaded via jest.config.cjs)
    - JayTap-services/src/__tests__/fixtures/jwks-tokens.js (test JWK helper for buildToken supertest auth)
  provides:
    - moderationRoutes.js cut over to nested-shape on PUT /listings/:id (edit-on-behalf MOD-14)
    - 21-key MOD-14 mass-assignment strip (5 standard + 11 audit + 2 defensive HF-03 + 3 trust-signals D-10)
    - Updated supertest fixtures (6 makeNestedFixture call sites + 5 new M3 contract tests)
    - 33-test moderationRoutes.test.js suite — green under Node 24 (cross-suite: 133/133 with Property.test.js + migrate-listings-m3.test.js + propertyRoutes.test.js)
    - HF-03 anti-spoofing grep gate clean (actorUid: req.body/headers returns 0)
  affects:
    - Phase 2 (RN client cutover — D-01 atomic-break is now hot for the moderation surface as well; mod-edit-on-behalf path now consumes nested-shape exclusively)
    - Phase 3 (mod media-curation extension — POST /api/moderation/listings/:id/media will live in this same route file; the cutover leaves room for that extension without touching file structure)
    - Plan 05 (operator runbook — references Plan 04 commits as the moderation cutover SHA chain; combined with Plan 03 propertyRoutes, ROADMAP SC #4 now satisfied)
tech-stack:
  added:
    - makeNestedFixture / nextListingId test helpers (mirrors propertyRoutes.test.js pattern; nextListingId() avoids unique-index null collision)
    - 5 new M3 nested-shape contract tests in describe('moderationRoutes — M3 nested shape (Phase 1)')
    - Mass-assignment strip extended from 14 keys (M2 baseline) to 21 keys (M3 +7) — closes D-10 trust-signals admin-only PATCH gate via the moderation edit-on-behalf path
  patterns:
    - In-file precedent: existing race-safe findOneAndUpdate pattern at approve/reject/archive/restore preserved verbatim — top-level audit operands (status, approvedAt/byUid, rejectedAt/byUid, archivedAt/byUid/ReasonCode/Note) untouched per SCHEMA-03/04
    - HF-03 anti-spoofing actorUid sourcing (req.firebaseUid from JWKS sub, never req.body/headers) — verified via grep gate `grep -cE "actorUid:\s*req\.(body|headers)" src/routes/moderationRoutes.js` returns 0
    - Multer-uploaded photos flow into media.photos[] (D-15) — replaces M2's existingImages/images/imageUrl trio
    - PUT updateData JSON-string parse for nested subtrees (multipart-form-data compatibility — Phase 2 client may use FormData; JSON-only clients still work)
    - Orphan-tolerant audit-write try/catch (PATTERN G — moderation_audit_orphan structured log line) preserved verbatim across approve/reject/archive/restore/edit-on-behalf
key-files:
  created: []
  modified:
    - /Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/routes/moderationRoutes.js
    - /Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/__tests__/moderationRoutes.test.js
decisions:
  - PUT body destructure uses `const updateData = { ...(req.body || {}) }` + explicit strip pattern (Option A from PLAN.md `<action>` Zone 1) — preferred over Option B explicit-nested-destructure because the existing handler already uses the spread+strip idiom
  - Mass-assignment strip extended to 21 forbidden keys including platformVerifications + verificationUpdatedAt + verificationUpdatedByUid (D-10 closure) — admin-only PATCH /:id/verifications is the ONLY trust-signal write path
  - Removed entire flat-shape coercion block (rooms/bedrooms/bathrooms parseInt, areaSqm/price parseFloat, tours[] reparse, is3DTourAvailable derive, existingImages/images/imageUrl path, address re-geocode) — all flat-shape concepts dropped per D-08/D-12/D-15/D-05; the 5 nested-subtree JSON.parse fallback + media.photos[] merge is the new minimal-surface body-coercion zone
  - Removed geocodeAddress import + re-geocode block (D-05 + memory geocoder-nominatim-hang-axios-network-error.md — eliminates 15s axios hang vector on Nominatim)
  - VERBATIM PRESERVED: GET /queue MOD-10 envelope `{items, totalCount}` + FIFO sort; POST /approve race-safe `findOneAndUpdate({_id, status:'pending'}, ...)` + 409 ALREADY_MODERATED; POST /reject same posture + VALID_REJECT_CODES enum check; POST /archive race-safe `findOneAndUpdate({_id, status:{$ne:'archived'}}, ...)` + 409 ALREADY_ARCHIVED; POST /restore archived→pending with D-15 selective field-clear preserving approve/reject history; ModerationLog audit-write orphan-tolerant try/catch with `actorUid: req.firebaseUid` (HF-03)
  - Test scope: only moderationRoutes.test.js touched. propertyRoutes.test.js (Plan 01-03 territory), Property.test.js (Plan 01-01 territory), migrate-listings-m3.test.js (Plan 01-02 territory), adminRoutes.test.js (does not reference Property shape per PATTERNS.md verification) — UNCHANGED
  - New describe block placed AFTER the main moderationRoutes describe (line 472) and BEFORE the Phase 4 archive-lifecycle describe blocks — keeps M3 contract tests isolated for grep-discoverability while not disturbing the existing M2/Phase-4 test order
metrics:
  duration_minutes: 6
  tasks_completed: 2
  files_modified: 2
  files_created: 0
  tests_added: 5
  tests_total: 33
  insertions: 374
  deletions: 109
  completed_date: 2026-05-06
backend_repo_pre_sha: c4bf01d4457d839c249f0a30265f3f813f07de10
backend_repo_post_sha: f8197ba
jaytap_repo_pre_sha: b948d2f709ae9a2c27c8a02978740c1afb625568
---

# Phase 1 Plan 04: moderationRoutes.js + moderationRoutes.test.js Cutover Summary

Cut over `moderationRoutes.js` from M2's flat-shape PUT body destructure (`title`, `address`, `rooms` parseInt, `bedrooms`, `bathrooms`, `areaSqm`, `price`, `tours[]`, `existingImages`/`images`/`imageUrl`, address re-geocode) to M3's nested-shape body destructure with multipart-compatible JSON.parse fallback for nested subtrees (`location`, `basics`, `conditionAndAmenities`, `content`, `terms`, `media`) per anchor SPEC §"Suggested Data Shape" and CONTEXT.md D-01..D-15. Extended the MOD-14 mass-assignment strip from M2's 14-key list to a 21-key list (5 standard + 11 audit + 2 defensive + 3 trust-signals) — closing D-10 trust-signal admin-only via PATCH /:id/verifications by stripping `platformVerifications` + `verificationUpdatedAt` + `verificationUpdatedByUid` from any moderator edit-on-behalf body. Removed `geocodeAddress` entirely per D-05 (eliminates 15s axios hang vector on Nominatim per memory `geocoder-nominatim-hang-axios-network-error.md`).

PRESERVED VERBATIM: GET /queue MOD-10 envelope (`{items, totalCount}` + FIFO sort by submittedAt ASC), POST /approve + POST /reject race-safe `findOneAndUpdate({_id, status:'pending'}, ...)` with `actorUid: req.firebaseUid` audit-row sourcing (HF-03), 409 ALREADY_MODERATED race-conflict response, POST /archive (status: $ne archived) + POST /restore (archived→pending with D-15 selective field-clear preserving approve/reject history), and ModerationLog orphan-tolerant audit-write try/catch with `evt: 'moderation_audit_orphan'` structured log line. The M2 race-cell test (`Promise.all([approve A, approve B])` → `[200, 409]` + `code: 'ALREADY_MODERATED'`) carries forward verbatim with the fixture flipped to nested. The grep gate `grep -nE "actorUid:\s*req\.(body|headers)"` returns 0 across the cut-over file (HF-03 anti-spoofing).

Together with Plan 01-03 (propertyRoutes cutover at SHA `c4bf01d`), this completes ROADMAP SC #4: backend read paths return nested shape exclusively after the cutover commit chain. `moderationRoutes.test.js` extended from 28 tests (with 2 RED on flat-shape `title`/`rooms` assertions) to 33 GREEN tests under Node 24 (cross-suite: 133/133 with Property.test.js + propertyRoutes.test.js + migrate-listings-m3.test.js).

## Diff Stats

```
 src/__tests__/moderationRoutes.test.js | 352 +++++++++++++++++++++++++++++----
 src/routes/moderationRoutes.js         | 131 ++++++------
 2 files changed, 374 insertions(+), 109 deletions(-)
```

(Computed against backend pre-execution SHA `c4bf01d` via `git diff --stat c4bf01d..HEAD`.)

`moderationRoutes.js` net delta: +64 / -67 (net **−3 LOC**) — concentrated in PUT /listings/:id handler (~lines 438-545 in pre-cutover; ~95 LOC of body-coercion changed). Concentrated removals: `geocodeAddress` import + re-geocode block (~10 LOC), legacy flat-shape coercions (rooms/bedrooms/bathrooms/areaSqm/price/tours[]) (~25 LOC), existingImages/images/imageUrl (~20 LOC). Concentrated additions: extended 21-key strip block (~10 LOC; was 14-key in M2), nested-subtree JSON.parse fallback loop (~10 LOC), media.photos[] merge (~10 LOC). All other zones (GET /queue, POST /approve, POST /reject, POST /archive, POST /restore, ModerationLog audit-write blocks) preserved verbatim.

## Commits

| # | Hash | Type | Subject | Repo |
|---|------|------|---------|------|
| 1 | `6097b50` | feat | cut over moderationRoutes.js PUT edit-on-behalf to nested-shape body (D-01 atomic-break) | backend (JayTap-services) |
| 2 | `f8197ba` | test | rewrite moderationRoutes.test.js fixtures + assertions for M3 nested-shape contract | backend (JayTap-services) |

The closing `docs(01-04)` SUMMARY commit lands in the JayTap planning repo (this file).

## MOD-14 21-Key Mass-Assignment FORBIDDEN_KEYS List (D-10 closure)

| Group | Keys | Count | Source |
|-------|------|-------|--------|
| Standard | `ownerUid`, `_id`, `id`, `createdAt`, `status` | 5 | M2 MOD-14 baseline |
| Audit (M2 Phase 2) | `submittedAt`, `approvedAt`, `approvedByUid`, `rejectedAt`, `rejectedByUid`, `rejectionReasonCode`, `rejectionReasonNote` | 7 | SCHEMA-04 — top-level invariant |
| Audit (M2 Phase 4) | `archivedAt`, `archivedByUid`, `archivedReasonCode`, `archivedReasonNote` | 4 | SCHEMA-04 + ARCH-01..ARCH-05 — newly added in Plan 04 |
| Defensive (HF-03) | `actorUid`, `firebaseUid` | 2 | Anti-spoofing — JWKS sub is the only trusted source |
| Trust signals (D-10) | `platformVerifications`, `verificationUpdatedAt`, `verificationUpdatedByUid` | 3 | Admin-only PATCH /:id/verifications — newly added in Plan 04 |
| **TOTAL** | | **21** | |

7 keys ADDED in Plan 04 (4 archive audit fields + 3 trust signals). The 22nd `delete updateData.reason` is intentional — the moderator's free-text annotation lives on the audit row, not the Property document; it's pulled out and written to ModerationLog.reasonNote. Also enumerated explicitly per acceptance criterion in the route handler comment + `grep -E "(ownerUid|_id|status|approvedAt|archivedAt|platformVerifications)" src/routes/moderationRoutes.js` shows all in delete-block + audit-write blocks.

## Cutover Zones in `moderationRoutes.js`

### Zone 1 — Imports (CUTOVER)

**Before:** `const { geocodeAddress } = require('../utils/geocoder');`
**After:** Removed entirely. Comment block documents the removal per D-05 + memory `geocoder-nominatim-hang-axios-network-error.md`. Eliminates the 15s axios hang vector on Nominatim — `geocodeAddress` literal grep returns 0.

### Zone 2 — PUT /listings/:id mass-assignment strip (CUTOVER — extended)

**Before:** 14-key delete block (5 standard + 7 M2 audit + 2 defensive). Missing 4 archive audit fields + 3 trust signals.
**After:** 21-key delete block, organized by group with comments per CONTEXT.md D-10 closure. Each group has its own line-grouped block (5 standard / 11 audit / 2 defensive / 3 trust signals). Sequence preserved: ownerUid first (MOD-14 hard rule).

### Zone 3 — PUT /listings/:id legacy flat-shape body-coercion (CUTOVER — removed)

**Before:** Lines 482-516 contained `rooms` parseInt, `maxGuests` parseInt, `bedrooms` parseInt, `bathrooms` parseInt, `areaSqm` parseFloat, `price` parseFloat, `tours[]` reparse + `is3DTourAvailable` derive, `existingImages`/`images`/`imageUrl` legacy merge, `geocodeAddress` re-geocode on `address`/`city` change.
**After:** Removed entirely per D-08 (drop bedrooms/bathrooms), D-12 (single string media.tourUrl, drop tours), D-15 (photos under media.photos[]), D-05 (no address re-geocode — client supplies location.coordinates). The only top-level coercions PRESERVED are `maxGuests` parseInt (D-09 — top-level hospitality preserve) and `availableDate` Date coerce (D-10 — top-level operational metadata).

### Zone 4 — PUT /listings/:id media.photos[] merge + nested-subtree JSON.parse fallback (CUTOVER — added)

**Before:** No nested-subtree handling.
**After:**
1. **Media merge:** `req.files[i].location` (multer-S3 URL) appended to client-supplied `media.photos[]` (existing kept + new appended). Resolves client-supplied media as either object (JSON) or JSON-string (multipart). Mirrors propertyRoutes.js Plan 01-03 pattern.
2. **Nested JSON.parse fallback loop:** Iterates `['location', 'basics', 'conditionAndAmenities', 'content', 'terms']` — if delivered as JSON string (multipart/form-data path), parse to object. Best-effort: malformed JSON `delete updateData[nestedKey]` (drop rather than corrupt).

### What's PRESERVED VERBATIM

| Invariant | Source rule | Verified by |
|-----------|-------------|-------------|
| GET /queue MOD-10 envelope `{items, totalCount}` + FIFO sort by submittedAt ASC | MOD-10 + D-03 | New M3 test "GET /queue returns nested-shape items" + preserved "GET /queue returns FIFO sort by submittedAt ASC" |
| Router-level `router.use(verifyFirebaseToken, requireMinRole('moderator'))` | MOD-17 | All MOD-17 role-gating tests (4 endpoints × 403 + 1 admin inherit) |
| POST /approve race-safe `findOneAndUpdate({_id, status:'pending'}, {$set:{status:'live', approvedAt, approvedByUid}}, {new:true})` | MOD-15 + SCHEMA-03/04 | Race-cell test (Promise.all → [200, 409] + code: 'ALREADY_MODERATED') + new M3 "POST approve returns nested-shape doc" |
| POST /reject same race-safe pattern + VALID_REJECT_CODES enum check (4 codes) + top-level rejectionReasonCode/Note | MOD-12 + MOD-15 + SCHEMA-04 | Existing MOD-12 enum tests + new M3 "POST reject sets top-level rejectionReasonCode/Note (Pitfall 4 defense)" |
| POST /archive race-safe `findOneAndUpdate({_id, status:{$ne:'archived'}}, ...)` + 409 ALREADY_ARCHIVED | ARCH-01..ARCH-05 + D-02 | All 6 mod-archive tests preserved (fixtures flipped to nested) |
| POST /restore archived→pending with D-15 selective field-clear (clear archived* via null write, preserve approve/reject history by omission) | ARCH-04 + D-15 | All 3 mod-restore tests preserved (fixtures flipped to nested) |
| `actorUid: req.firebaseUid` sourcing in every audit-row write (HF-03) | HF-03 + memory phase45-uid-mismatch-bug.md | Anti-spoofing grep gate clean (0 matches) + existing MOD-16 anti-spoofing test |
| Orphan-tolerant audit-write try/catch with `evt: 'moderation_audit_orphan'` structured log line | PATTERN G + D-10 | grep `moderation_audit_orphan` count = 8 (all 5 audit-write blocks have try/catch) |

Verified via `grep -nE "ALREADY_MODERATED|findOneAndUpdate|actorUid: req.firebaseUid|moderation_audit_orphan" src/routes/moderationRoutes.js` returns 31 hits (5 + 8 + 10 + 8) — every preservation point present.

## `moderationRoutes.test.js` — Test Count

| Phase | Test count | Notes |
|-------|------------|-------|
| Pre-execution (M2 + M2 Phase 4) | 28 | 26 PASS + 2 RED (the 2 RED pre-existed at session start because Plan 01-01 dropped flat-shape `title`/`rooms` fields — schema strict:true silently dropped them on Property.create, so `res.body.title` returned undefined) |
| Post-execution (M3 Plan 04) | **33** | 28 carried-forward (fixtures flipped to nested + flat-shape assertions flipped to nested) + 5 new M3 nested-shape contract tests |

### New M3 tests added (5)

In a fresh `describe('moderationRoutes — M3 nested shape (Phase 1)')` block:

1. **`GET /queue returns nested-shape items with no flat-shape leakage`** — happy-path nested response shape. Verifies `res.body.items[0].location?.city` + `res.body.items[0].basics?.rooms` + `res.body.items[0].content?.title` are defined; flat-shape leakage gone (`res.body.items[0].address` + `.title` undefined). Also asserts top-level `submittedAt` defined and `terms?.submittedAt` undefined (SCHEMA-04 + Pitfall 4 defense).
2. **`POST approve returns nested-shape doc with status=live + top-level audit fields`** — verifies status flips to live; top-level `approvedAt` defined and `approvedByUid` from JWKS sub; nested response shape (`location.city`, `basics.rooms`, `content.title`); Pitfall 4 defense (`res.body.terms?.approvedAt` + `terms?.approvedByUid` undefined).
3. **`POST reject sets top-level rejectionReasonCode/Note (SCHEMA-04 / Pitfall 4 defense)`** — verifies `res.body.rejectionReasonCode === 'incomplete-info'` + `rejectionReasonNote === 'missing photos'` at TOP-LEVEL; `res.body.terms?.rejectionReasonCode` + `terms?.rejectionReasonNote` UNDEFINED (audit fields stay top-level per SCHEMA-04 — Pitfall 4 defense).
4. **`PUT /listings/:id (MOD-14 edit-on-behalf) accepts nested body and round-trips nested fields`** — happy path; PUT body sends `{ content: { title, language }, location: { city: 'Almaty', district: 'Medeu', coordinates, showExactAddress } }`; verifies nested fields applied + untouched basics preserved + D-12 status flip applied.
5. **`PUT /listings/:id MOD-14 mass-assignment strip extended (21 forbidden keys)`** — attacker body containing all 21 forbidden keys (5 standard + 11 audit + 2 defensive + 3 trust signals); Property.findById round-trip asserts EVERY forbidden key UNCHANGED from seed (including platformVerifications.* defaulting to false from schema; archivedReasonCode null; rejectedAt null; etc.). Legitimate nested edit (`content.title: 'Edit attempt'`) DID land. D-12 wins over body `status: 'archived'` — saved status is `'live'`. JWKS sub wins over body `approvedByUid: 'attacker'` — saved approvedByUid is `'mod-a-uid'`.

### Carried-forward tests (28 — fixtures flipped to nested + assertions flipped where flat-shape)

- **MOD-15** Race-condition (2 tests): `Promise.all` race-cell + sequential approve→reject 409 idempotency. Both fixtures flipped to nested via `makeNestedFixture`. Race-cell assertion `[200, 409]` + `code: 'ALREADY_MODERATED'` UNCHANGED (operates on top-level status per SCHEMA-03).
- **MOD-16** ModerationLog actorUid (2 tests): audit row written with actorUid from JWKS sub + spoofing-defense (body actorUid='attacker' ignored). Fixtures flipped; assertions UNCHANGED.
- **MOD-17** Role-gating per endpoint (5 tests — 4 endpoints × 403 + admin inherit): UNCHANGED (operates on auth boundary, not Property shape).
- **MOD-12** reasonCode enum (3 tests): invalid → 400, missing → 400, valid → 200 + persistence on Property + audit row. Fixtures flipped; assertions UNCHANGED (`rejectionReasonCode` + `rejectionReasonNote` are top-level per SCHEMA-04).
- **MOD-14** Edit-on-behalf invariants (6 tests): mass-assignment, status flip, audit log, rejected→live, already-live 409, multipart CR-01 regression. Fixtures flipped; assertions on `res.body.title` flipped to `res.body.content?.title`; multipart test fields flipped from flat-shape `field('title')` + `field('rooms')` to nested `field('content', JSON.stringify({...}))` + `field('basics', JSON.stringify({...}))` — verifies the route's new nested-subtree JSON.parse fallback round-trips correctly.
- **MOD-10** Queue FIFO (1 test): UNCHANGED assertion (top-level `submittedAt` sort).
- **Phase 4 mod-archive** (6 tests): UNCHANGED assertions (operates on top-level archived* audit fields).
- **Phase 4 mod-restore** (3 tests): UNCHANGED assertions (D-15 history-preserve test rounds-trips top-level `approvedByUid`).

### Test execution result (Node 24, jose@6 ESM, mongodb-memory-server)

```
PASS src/__tests__/moderationRoutes.test.js
PASS src/__tests__/propertyRoutes.test.js
PASS src/__tests__/Property.test.js
PASS src/__tests__/migrate-listings-m3.test.js
Test Suites: 4 passed, 4 total
Tests:       133 passed, 133 total
Time:        ~3.7 s
```

(Cross-suite gate per plan `<verification>`: Plan 01-01 + 01-02 + 01-03 + 01-04 all green together — no cross-suite regression introduced by the moderation cutover.)

## Downstream Readiness

Plan 05 (operator runbook) can reference the cutover SHA chain:
- Plan 01-01 schema reshape: `b16223e` + `50728bd` (post-SHA `50728bd`).
- Plan 01-02 migration script: `c05ac79` + `03ea882` + `53d025c` (post-SHA `53d025c`).
- Plan 01-03 propertyRoutes cutover: `6f815f5` + `c4bf01d` (post-SHA `c4bf01d`).
- **Plan 01-04 moderationRoutes cutover: `6097b50` + `f8197ba` (post-SHA `f8197ba`).**

Per ROADMAP SC #4 (verbatim): "Backend read paths return the nested shape exclusively after the route-shape cutover commit; the cutover commit lands strictly AFTER the migration runs successfully." With Plan 03 (propertyRoutes) and Plan 04 (moderationRoutes) shipped, the entire backend route surface speaks nested-shape exclusively.

Phase 2 (RN client cutover) can now consume the consistent nested-shape contract from BOTH route surfaces:
- propertyRoutes: `GET /api/properties` + `GET /api/properties/:id` + `GET /api/properties/user/:firebaseUid` + `POST /api/properties` + `PUT /api/properties/:id` + `PATCH /api/properties/:id/verifications` + `POST/:id/archive` + `POST/:id/unarchive` + `DELETE /:id` (Plan 03 cutover).
- moderationRoutes: `GET /api/moderation/queue` + `POST/:id/approve` + `POST/:id/reject` + `POST/:id/archive` + `POST/:id/restore` + `PUT /listings/:id` (Plan 04 cutover).

Phase 3 (mod media-curation extension — `POST /api/moderation/listings/:id/media` per MEDIA-04) can be added to the existing moderationRoutes.js file without restructuring; Plan 04 leaves room for that extension by preserving the file's express-router idiom and audit-row infrastructure.

## Atomic-Break Tester Impact (D-01) — Moderation surface

Per CONTEXT.md D-01 atomic-break: M2 client (TestFlight build 27 / Play Internal versionCode 30) sending FLAT-shape body PUT /api/moderation/listings/:id receives 200 with the body silently DROPPED at the schema-strict layer (Mongoose silently drops unknown keys per `strict: true`). The moderator-side mod-edit-on-behalf surface in M2 client will appear to succeed but no fields actually mutate — testers must wait for Phase 2's nested-aware client. Plan 05's runbook owns the tester comms.

GET /queue + POST /approve / reject / archive / restore responses change SHAPE (now nested). M2 mod-app reads (`res.body.items[i].title`, `res.body.address`) will return `undefined` post-cutover — moderation queue rendering will degrade until Phase 2 ships. This matches the M1+M2 atomic-cutover precedent (no dual-flow window). Multipart-uploaded photos via mod edit-on-behalf flow into `media.photos[]` directly — M2 client's `images: [...]` post-PUT response read returns undefined.

## Deviations from Plan

### Auto-fixed Issues

None. The plan's `<interfaces>` block, `<action>` Zone 1 spec, and `<acceptance_criteria>` 21-forbidden-keys enumeration were complete enough to ship without auto-fix Rule 1/2/3 deviations. The minor adjustments were:

1. **Added second `expect(res.body.basics` literal to PUT edit-on-behalf nested-body test (acceptance-grep gate compliance).** Plan acceptance criterion `grep "expect(res.body.basics" src/__tests__/moderationRoutes.test.js` returns ≥ 2 lines. Initial implementation had only 1 (in the POST approve test). Added `expect(res.body.basics?.rooms).toBe('2')` to the PUT edit-on-behalf nested-body round-trip test as the second literal — also serves as a substantive assertion (verifies untouched basics preserved through PUT body Object.assign). NOT a deviation; a refinement to comply with the plan's explicit acceptance criterion.

### Discretionary Calls Documented (NOT deviations)

These are interpretation calls the plan delegated to the executor:

- **Test placement of new describe block (NEW vs EXTEND existing block):** Chose NEW `describe('moderationRoutes — M3 nested shape (Phase 1)')` block placed AFTER the main describe and BEFORE the Phase 4 archive blocks per plan `<action>` Step 4. Keeps M3 contract tests grep-discoverable while not disturbing the existing M2/Phase-4 test order. Alternative (extending existing MOD-14 describe block) would have been more concise but would reduce grep-discoverability for the M3 contract tests.
- **Multipart CR-01 test field flip (REWRITE vs DROP):** Plan §`<action>` Step 4 doesn't explicitly address the existing multipart test (it's a Phase 3 CR-01 regression test on flat-shape `field('title')` + `field('rooms')` JSON delivery). Chose REWRITE: flipped `field('title', 'fixed by mod')` → `field('content', JSON.stringify({...}))`; flipped `field('rooms', '5')` → `field('basics', JSON.stringify({...rooms:'4+', ...}))`. Validates the route's new nested-subtree JSON.parse fallback round-trips correctly under multipart. Drop would have lost the multipart-delivery integration test entirely.
- **PUT body destructure pattern (Option A vs Option B):** Chose Option A (spread + strip) per plan `<action>` Zone 1 details — preferred because the existing handler already uses this idiom and the strip list is the load-bearing security boundary. Option B (explicit nested destructure) was rejected because it would require re-deriving the strip semantics for nested fields, increasing the attack surface.
- **Order of strip groups in the delete block:** Chose grouping by category (5 standard / 11 audit / 2 defensive / 3 trust signals) with blank-line separators and per-group comment headers. Alternative (alphabetical) was rejected because it would hide the security model behind alphabetical ordering.
- **D-12 wins over body `status: 'archived'` in MOD-14 strip test:** The new test sends `status: 'archived'` + many other forbidden fields. The PUT handler forces `status: 'live'` (D-12 sub-decision — mod's edit IS the approval). Test asserts `reloaded.status === 'live'` (D-12 wins) — explicitly verifies the strip-then-force pattern works in concert.

### CLAUDE.md compliance

- No new npm dependencies added (PROJECT.md hard rule for Phase 1).
- No `firebase` / `@react-native-firebase/*` packages — backend is JWKS-only (auto-memory `no-firebase-sdk.md`).
- `nvm use 24` used before all `npm`/`node`/`jest` invocations (auto-memory `backend-node-version.md`).
- No `react-navigation` migration touched (CLAUDE.md hard rule — out of scope).
- AWS env block preserved verbatim from M2 moderationRoutes.test.js (mandatory — multerS3 → S3Client at module-load).
- Geographic scope (KG/KZ/UZ) preserved — `content.language` defaults to 'ru' for Bishkek launch market; new test fixture for nested-body PUT flips `location.city` to 'Almaty' to defend against Bishkek-only assumption regression (memory `geographic-scope.md`).
- 9-type 3-category taxonomy preserved — `propertyType` enum unchanged at the schema layer; cutover does NOT introduce new taxonomy.
- Hospitality showcase-only invariant preserved — `maxGuests` + `amenities` stay top-level (D-09); no per-night pricing or booking calendar fields introduced via the strip block.

### Auth gates encountered

None. All test fixtures use the in-memory test JWKS keypair; no production auth path exercised.

## Threat Flags

None. Phase 1 plan is a route-shape cutover only; no new HTTP routes, no new auth paths, no new IAM permissions, no new file-access patterns. The threat register from PLAN.md `<threat_model>` is fully addressed:

| Threat ID | Disposition | How addressed |
|-----------|-------------|---------------|
| T-01-04-Tampering-01 (mass-assignment via nested PUT body — `ownerUid`, `status`, `archivedAt`, `platformVerifications`) | mitigate | MOD-14 strip extended to 21 keys (Plan 04 added 4 archive audit + 3 trust signals). Test 5 (mass-assignment strip extended) asserts every forbidden key in attacker body leaves the round-tripped doc UNCHANGED. |
| T-01-04-Tampering-02 (race-condition double-approve) | mitigate | MOD-15 race-safe `findOneAndUpdate({_id, status:'pending'}, ...)` PRESERVED VERBATIM. Test (Promise.all → [200, 409]) PRESERVED with fixture flipped to nested. |
| T-01-04-Tampering-03 (audit-row spoofing via `actorUid: req.body.firebaseUid`) | mitigate | HF-03 anti-spoofing — every audit-row write uses `actorUid: req.firebaseUid`. Grep gate `grep -nE "actorUid:\s*req\.(body|headers)"` returns 0 across the cut-over file. |
| T-01-04-Tampering-04 (mod escalating own role via PUT body) | mitigate | MOD-14 strip removes `ownerUid` from updateData. Test 5 verifies. User model and `userType` are NOT modifiable via property routes (admin role-management UI is the only mutator). |
| T-01-04-Tampering-05 (mod mutating top-level `platformVerifications` via PUT) | mitigate | MOD-14 strip extended in Plan 04 to include `platformVerifications`, `verificationUpdatedAt`, `verificationUpdatedByUid`. Test 5 asserts. Only admin PATCH /:id/verifications can write trust signals (D-10 + M1 GATE-02 + M2 ROLE-04). |
| T-01-04-Information-Disclosure-01 (mod queue exposing rejected/archived to non-mod tokens) | accept | Router-level `requireMinRole('moderator')` blocks at the router gate. The cutover does NOT change this; existing MOD-17 role-gating tests (4 endpoints × 403) defend. |
| T-01-04-Information-Disclosure-02 (anonymous client accessing moderation endpoints) | accept | Router-level `verifyFirebaseToken` rejects unauthenticated requests with 401. UNCHANGED. |
| T-01-04-Repudiation-01 (audit row failure silently dropped) | accept | M2 PATTERN G — orphan-tolerant try/catch with `evt: 'moderation_audit_orphan'` structured log line. PRESERVED VERBATIM. |
| T-01-04-DoS-01 (mod queue with very large pending count blocks event loop) | accept | Existing M2 design choice (no pagination). Folding pagination into Phase 1 is out of scope. |

## Self-Check: PASSED

Verification commands (run from `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services` with `nvm use 24`):

1. **Scope**: `git diff --name-only c4bf01d..HEAD` returns EXACTLY 2 files:
   ```
   src/__tests__/moderationRoutes.test.js
   src/routes/moderationRoutes.js
   ```
   FOUND: no scope creep. Plan 03 files (propertyRoutes.js + propertyRoutes.test.js) UNTOUCHED.

2. **Test gate**: `npx jest src/__tests__/moderationRoutes.test.js src/__tests__/propertyRoutes.test.js src/__tests__/Property.test.js src/__tests__/migrate-listings-m3.test.js --bail` → exits 0; 133/133 tests pass (33 moderationRoutes + 41 propertyRoutes + 13 Property + 46 migration).

3. **HF-03 anti-spoofing grep gate (must be 0)**: `grep -nE "actorUid:\s*req\.(body|headers)" src/routes/moderationRoutes.js` returns 0 matches.

4. **Race-cell pattern preserved**: `grep "findOneAndUpdate" src/routes/moderationRoutes.js | wc -l` returns 8 (approve + reject + archive + restore + edit-on-behalf — all atomic).

5. **Audit-row sourcing preserved**: `grep "actorUid: req.firebaseUid" src/routes/moderationRoutes.js` returns 10 lines.

6. **Audit-write orphan-tolerance preserved**: `grep "moderation_audit_orphan" src/routes/moderationRoutes.js` returns 8 lines.

7. **MOD-14 mass-assignment strip extended**: `grep "platformVerifications" src/routes/moderationRoutes.js` returns 2 lines (delete-block entry + comment).

8. **Phase 4 archive audit fields handled**: `grep "archivedReasonCode" src/routes/moderationRoutes.js` returns 6 lines (3 in handlers preserved + 3 in extended strip block + 1 in Plan 04 comment, totaling 6).

9. **Race-cell test still asserts [200, 409]**: line 147 of `src/__tests__/moderationRoutes.test.js` — `expect(loser.body.code).toBe('ALREADY_MODERATED');` after `expect(statuses).toEqual([200, 409]);`. Verbatim preserved.

10. **No file deletions in commits**: `git log --diff-filter=D --name-only c4bf01d..HEAD` returns no output.

11. **Commit chain**: `git log --oneline c4bf01d..HEAD` returns:
    ```
    f8197ba test(01-04): rewrite moderationRoutes.test.js fixtures + assertions for M3 nested-shape contract
    6097b50 feat(01-04): cut over moderationRoutes.js PUT edit-on-behalf to nested-shape body (D-01 atomic-break)
    ```

12. **JayTap planning repo baseline preserved**: `git -C /Users/beckmaldinVL/development/mobileApps/JayTap rev-parse HEAD` returns `b948d2f` pre-SUMMARY-commit (matches expected pre-execution SHA — orchestrator owns STATE.md/ROADMAP.md updates; this plan only adds the SUMMARY).

All claims verified. Backend repo at `f8197ba` (post-Plan-01-04). The moderation route surface is now consistent with Plan 03's propertyRoutes.js cutover; together they ship the SCHEMA-05 deliverable (ROADMAP SC #4 complete).

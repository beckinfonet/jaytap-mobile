---
phase: 02
plan: 01
status: complete
wave: 0
completed: 2026-05-01
repo: backend-services/JayTap-services
commits:
  - c16d5f7  # test(02-01): Property schema RED tests
  - 4f22309  # test(02-01): propertyRoutes Phase 2 RED block
  - c19849d  # feat(02-01): migrate-listings-m2.js + npm script
---

# Plan 01 Summary — Wave 0 Backend RED Tests + Migration Script

## What was built

All artifacts land in the **backend repo** (`/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services`).

### Task 1 — `src/__tests__/Property.test.js` (NEW, 119 LOC)
Schema unit tests under `describe('Property schema — Phase 2 enum cutover + audit fields (D-01, D-18, D-21)')`.

| # | Test | Maps to | Wave 0 state |
|---|------|---------|--------------|
| 1 | default status === 'pending' | D-01 default flip | RED (current default 'draft') |
| 2 | 'draft' rejected by enum | D-01 cutover | RED (current enum allows 'draft') |
| 3 | 'rejected' accepted by enum | D-01 add 'rejected' | RED (not in current enum) |
| 4 | 'live' resolves + 9 audit fields exist as null | D-21 schema additive | RED (audit fields not in schema) |
| 5 | 'archived' accepted | D-01 retain | already aligned (passes) |
| 6 | 'pending' resolves; submittedAt undefined | D-21 route owns submittedAt | already aligned (passes) |

Plan 03's schema cutover flips tests 1–4 GREEN.

### Task 2 — `src/__tests__/propertyRoutes.test.js` (EXTENDED, +254 LOC)
Phase 2 integration tests under `describe('propertyRoutes — Phase 2 status field absorption (D-05/D-06/D-12/D-15/D-22)')`. The existing CR-01 anti-tamper block above is byte-untouched.

| Group | Tests | Decision IDs | Wave 0 state |
|-------|-------|--------------|--------------|
| D-05 GET / | t1, t2, t3 | role-aware filter, no escape hatch, ?status=all noop | t3 RED (others coincidentally aligned) |
| D-06 GET /:id | t4–t9 | deep-link 404 guard | t4, t8 RED (404 for anon/renter on rejected); others align |
| D-12 GET /user/:uid | t10, t11, t12 | owner-scoped role-aware filter | t12 RED (renter→live+legacy only) |
| D-15 + D-22 PUT /:id | t13–t17 | auto-flip, 409 archived, sanitizer | t13, t15, t16, t17 RED |
| MOD-03 POST / | t18 | default 'pending' + submittedAt write | RED |

**RED breakdown: 9 fail / 10 already-aligned pass / 1 CR-01.** Plan 03's role-aware filter + deep-link guard + sanitizer + 409 + auto-flip + submittedAt write flips the 9 to GREEN.

**Fixture notes:**
- 5 listings seeded under `owner-uid`: live, pending, rejected, archived, legacy (no status field).
- The `rejected` and `legacy` rows use `Property.collection.insertOne()` to bypass schema validation at Wave 0 (current enum lacks 'rejected'; legacy must omit the field). Plan 03 can switch the rejected fixture back to `Property.create()` after the enum cutover.
- Owner has `canListProperties: true` so POST passes the Phase 4.5 capability gate.
- `geocoder` and `listingIdGenerator` are stubbed via `jest.mock` for deterministic POST tests.

### Task 3 — `src/scripts/migrate-listings-m2.js` (NEW, 96 LOC) + `package.json` (+1 line)
One-shot Mongo migration for D-04 reconciliation. Mirrors `migrate-roles-m2.js`.

**Invocation contract:**
```
npm run migrate:listings-m2 -- --dry-run    # preview counts, no writes
npm run migrate:listings-m2                  # live run (exit 1 on stragglers)
npm run migrate:listings-m2 -- --verify      # acceptance check (exit 0 PASS / 1 FAIL)
```

**Two migration ops (D-04):**
1. `{status: 'draft'}` → `{status: 'pending'}`  (D-01 enum cutover absorbs legacy 'draft')
2. `{status: {$exists: false}}` → `{status: 'live'}`  (preserves M1 self-listed properties' visibility)

**Verify post-condition (D-03 verbatim):**
```js
db.properties.countDocuments({status: {$nin: ['pending', 'live', 'rejected', 'archived']}}) === 0
```

ACCEPTANCE marker on success:
```
ACCEPTANCE MET (LISTING-LIFECYCLE-M2): db.properties.countDocuments({status:{$nin:["pending","live","rejected","archived"]}}) === 0
```

No synthetic audit-field backfill per D-21. No new npm dependencies. Script ready for Plan 02 to run against production `MONGO_URI`.

## RED → GREEN expectations (Plan 03)

| Test | Plan 03 deliverable that flips it GREEN |
|------|----------------------------------------|
| Property t1 | Property.js enum default → 'pending' |
| Property t2 | Property.js enum drops 'draft' |
| Property t3 | Property.js enum adds 'rejected' |
| Property t4 | Property.js adds 9 D-21 audit fields |
| propertyRoutes D-05 t3 | GET / drops `?status=all` branch |
| propertyRoutes D-06 t4, t8 | GET /:id 404 guard for non-live + non-owner-non-mod (via optionalAuth + ROLE_RANK) |
| propertyRoutes D-12 t12 | GET /user/:uid role-aware filter (renter sees only live + legacy) |
| propertyRoutes D-15 t13 | PUT auto-flip rejected→pending + clear reason fields + stamp submittedAt |
| propertyRoutes D-22 t15 | PUT archived → 409 with code:'ARCHIVED_READONLY' |
| propertyRoutes D-22 t16, t17 | PUT body-status sanitizer for non-mod/admin |
| propertyRoutes MOD-03 t18 | POST writes status:'pending' + submittedAt:new Date() |

## Verification evidence

```
Test Suites: 2 failed, 3 passed, 5 total
Tests:       13 failed, 54 passed, 67 total
```

13 failures = 4 (Property.test.js RED) + 9 (propertyRoutes Phase 2 RED). All assertion-level — no syntax/runtime/setup errors. All 43 prior backend tests still pass (including Phase 1's CR-01 anti-tamper block, byte-unchanged).

## Deviations from plan

- **Test 17 (D-22 archived sanitizer):** plan flagged ambiguity between strict-strip (status stays 'pending') vs carve-out (status flips to 'archived'). I asserted the strict-strip behavior with an inline comment so Plan 03 can update if it implements the carve-out per RESEARCH.md line 1142.
- **'rejected' fixture seeding:** plan implied `Property.create({status:'rejected', ...})` would seed the row. The current schema rejects 'rejected', so I used `Property.collection.insertOne()` to bypass validation at Wave 0. Plan 03 can switch this back to `Property.create()` after the schema cutover (cosmetic only — the test outcomes are unchanged).
- **Test fixture `listingId`:** plan didn't specify, but the schema's `unique` index on `listingId` collides on multiple null values. Each fixture got an explicit listingId (`P2-LIVE`, `P2-PENDING`, `P2-REJECTED`, `P2-ARCHIVED`, `P2-LEGACY`).

## Wave gate (next steps)

- **Plan 02 is the next gate** and is **operator-driven**: run `npm run migrate:listings-m2 -- --dry-run` against production `MONGO_URI`, review counts, run live, then `--verify` (exit 0 expected). Save evidence (commit message OR 02-02-SUMMARY.md) for downstream Plan 03 deploy gate.
- **Plan 03 is BLOCKED** until Plan 02's `--verify` exits 0 — backend code that depends on the new enum cannot deploy before the data is reconciled.

## Maps to 02-VALIDATION.md

The four `❌ Wave 0` cells in the Per-Task Verification Map upgrade to `⬜ pending`:
- Property.test.js exists ✓
- propertyRoutes.test.js Phase 2 block exists ✓
- migrate-listings-m2.js exists ✓
- package.json registered ✓

Each row awaits Plan 03's GREEN flip.

---
phase: 01-backend-role-foundation-auth-migration-hotfix-bundle
plan: 04
subsystem: database
tags: [mongoose, mongodb, schema, role-revocation, ROLE-11, backend]

# Dependency graph
requires:
  - phase: 01-backend-role-foundation-auth-migration-hotfix-bundle
    provides: "Plan 03 — jest+mongodb-memory-server harness used by this plan's tests"
provides:
  - "User schema additive `roleRevokedAt: Date` field (default null) — ROLE-11 storage half"
  - "4 jest tests proving default null + persist-as-Date + enum unchanged + collection-name preserved"
  - "Plan 05 verifyFirebaseToken middleware can now read `user.roleRevokedAt`"
affects:
  - "01-05-verifyFirebaseToken-middleware (consumes roleRevokedAt vs token.iat)"
  - "01-08-migration-script (writes roleRevokedAt=null on every legacy doc OR leaves as default)"
  - "01-09-enum-cutover (changes userType enum AFTER migration verifies; must NOT touch roleRevokedAt)"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Additive nullable-Date field pattern: `{ type: Date, default: null }` (mirrors existing `deletedAt`)"
    - "TDD with mongodb-memory-server harness from Plan 03"
    - "Two-step deploy: additive field FIRST (this plan, safe), enum cutover LAST (Plan 09, after migration verified)"

key-files:
  created:
    - "/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/__tests__/User.test.js"
  modified:
    - "/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/models/User.js"

key-decisions:
  - "Placed roleRevokedAt immediately after deletedAt (line 39) — both are nullable-Date soft-state fields, so the grouping is semantically natural and the diff is minimal (+1/-0)"
  - "Inline comment cites consumer (Plan 05 verifyFirebaseToken) and traceability ID (ROLE-11) so future readers can navigate to the comparison logic without grepping the planning archive"
  - "Did NOT touch the userType enum — explicit deferral to Plan 09 per PATTERNS.md cross-cutting risk #2 and Pitfall 5; cutover requires migration --verify=0 first (Plans 08 -> 09)"
  - "Did NOT remove the legacy enum comment on User.js:16 — that comment is owned by Plan 09's cutover commit"

patterns-established:
  - "Storage-half-first pattern for ROLE-11: add the field BEFORE the middleware that reads it, so a partial deploy can never reach `user.roleRevokedAt === undefined` at runtime"
  - "Test-the-invariants pattern: each schema-modification test file asserts the surrounding invariants (collection name, enum membership) so a future careless edit fails the suite, not production"

requirements-completed: [ROLE-01, ROLE-11]

# Metrics
duration: ~6min
completed: 2026-04-29
---

# Phase 01 Plan 04: User.roleRevokedAt Schema Add Summary

**Additive `roleRevokedAt: Date` field on the User schema for the ROLE-11 server-side role-revocation invariant; enum cutover intentionally deferred to Plan 09**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-04-30T05:57:00Z
- **Completed:** 2026-04-30T06:03:22Z
- **Tasks:** 1 (TDD: RED + GREEN, no REFACTOR needed)
- **Files modified:** 1 created (test) + 1 modified (schema)

## Accomplishments

- Added `roleRevokedAt: { type: Date, default: null }` to `src/models/User.js:39` — the storage half of ROLE-11
- Confirmed via 4 jest tests that the default is `null`, that setting/reloading a Date round-trips, that the legacy `userType` enum (`['renter', 'owner', 'agent', 'admin']`) is unchanged, and that the `collection: 'user_profile'` invariant is preserved
- Plan 05 (`verifyFirebaseToken` middleware) is now unblocked — it can read `user.roleRevokedAt` and compare against `token.iat` without risking `undefined` access on a partial deploy

## Task Commits

Plan 04 has a single TDD task; the strict RED/GREEN cycle produced two commits in the **backend** repo (`/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services`):

1. **Task 1 RED — failing tests for roleRevokedAt:** `cb4f3cd` (test) — `test(user): add failing tests for roleRevokedAt field [ROLE-11]`
2. **Task 1 GREEN — additive field on schema:** `d2cdb78` (feat) — `feat(user): add roleRevokedAt field for ROLE-11 invariant [ROLE-01,ROLE-11]`

REFACTOR was not needed: the addition is a single-line field that mirrors the established `deletedAt` pattern, the inline comment cites the consumer and traceability ID, and there was no duplication or dead code to clean up.

**Plan metadata commit (RN client repo):** Created in `/Users/beckmaldinVL/development/mobileApps/JayTap` — see follow-up `docs(01-04)` commit.

## Files Created/Modified

- `backend-services/JayTap-services/src/models/User.js` — Added one line at line 39 (between existing `deletedAt` and `isLocked`); +1/-0
- `backend-services/JayTap-services/src/__tests__/User.test.js` — New 33-line jest suite (4 tests, all passing GREEN)

### Exact diff

```diff
   // Soft delete and account lock fields
   deletedAt: { type: Date, default: null }, // Timestamp when account was deleted
+  roleRevokedAt: { type: Date, default: null }, // ROLE-11: server-side role-revocation cutoff; verifyFirebaseToken rejects token.iat < this
   isLocked: { type: Boolean, default: false }, // Account lock flag to prevent access
   deletionReason: { type: String }, // Optional reason for deletion (for dispute handling)
```

## Decisions Made

- **Placement near `deletedAt`, not near `userType`** — `roleRevokedAt` is a soft-state nullable-Date field, semantically peer to `deletedAt`, so co-locating them keeps the "lifecycle-state" grouping coherent. Placing it next to `userType` would have been wrong because the enum cutover happens later (Plan 09) and would create a misleading visual coupling.
- **Inline comment cites Plan 05** — Future readers can grep `roleRevokedAt` and see exactly which middleware consumes it, without re-reading the planning archive.
- **No REFACTOR commit** — TDD cycle's third gate is optional; nothing to clean up on a single-line additive change. This is documented under TDD Gate Compliance below.
- **No enum touch, no legacy-comment touch** — Plan 09 owns the cutover. Touching either now would create cross-plan coupling and risk a partial deploy where the enum tightens before the migration script has converted legacy `renter`/`owner`/`agent` records.

## Deviations from Plan

None — plan executed exactly as written. The `<action>` block, the test suite, and the acceptance criteria all matched the actual execution path 1:1.

## Issues Encountered

None. The Plan 03 jest harness (`src/__tests__/setup.js` with `MongoMemoryServer`) worked first try; `npm test` cleanly went RED before the schema edit and GREEN after, with no infrastructure flakes.

## TDD Gate Compliance

- **RED gate:** `cb4f3cd` — `test(user): add failing tests for roleRevokedAt field [ROLE-11]` — 2 tests failed (`roleRevokedAt` undefined on schema), 2 passed (enum + collection invariants kept passing as designed)
- **GREEN gate:** `d2cdb78` — `feat(user): add roleRevokedAt field for ROLE-11 invariant [ROLE-01,ROLE-11]` — all 4 tests pass
- **REFACTOR gate:** Skipped (no duplication or dead code; single-line additive change)

Both required gates present in `git log`; sequence is RED -> GREEN, with no implementation commit before the failing test.

## Verification

- `node --check src/models/User.js` exits 0
- `npm test -- --testPathPattern=User.test` passes 4/4
- `npm test` (full backend suite) passes 4/4 (User.test.js is currently the only suite in this phase; Plan 03 added the harness but no test files yet)
- Plan's `<automated>` verify command output: `PASS`
- Acceptance criteria all satisfied:
  - `roleRevokedAt: { type: Date, default: null }` literal present (line 39)
  - `enum: ['renter', 'owner', 'agent', 'admin']` STILL present (line 16) — cutover deferred
  - `default: 'renter'` STILL present (line 17) — cutover deferred
  - `collection: 'user_profile'` STILL present (line 44)

## User Setup Required

None — pure additive Mongoose schema change; existing documents in production get `roleRevokedAt: null` automatically when reloaded. No environment variables, no dashboard changes, no migration step needed for THIS plan (the migration script in Plan 08 is a separate concern about `userType` values, not about `roleRevokedAt`).

## Next Phase Readiness

- **Plan 05 (verifyFirebaseToken middleware)** is unblocked — `user.roleRevokedAt` is now a defined schema field that returns `null` for any document without it.
- **Plan 08 (migration script)** is unaffected by this plan; the script's job is to convert legacy `userType` values, not to populate `roleRevokedAt`.
- **Plan 09 (enum cutover)** is the next plan that touches `User.js`. It will replace lines 14-18 (`userType`) with `enum: ['user', 'moderator', 'admin'], default: 'user'` and remove the legacy-roles comment. This plan's additive change does NOT block or interfere with that cutover.
- No blockers, no open questions, no deferred items.

## Self-Check: PASSED

- File `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/models/User.js` exists and contains `roleRevokedAt: { type: Date, default: null }` at line 39
- File `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/__tests__/User.test.js` exists with 4 jest tests
- Backend commit `cb4f3cd` (RED) present in `git log`
- Backend commit `d2cdb78` (GREEN) present in `git log`
- `userType` enum on line 16 unchanged: `['renter', 'owner', 'agent', 'admin']`
- `collection: 'user_profile'` on line 44 unchanged

---
*Phase: 01-backend-role-foundation-auth-migration-hotfix-bundle*
*Plan: 04*
*Completed: 2026-04-29*

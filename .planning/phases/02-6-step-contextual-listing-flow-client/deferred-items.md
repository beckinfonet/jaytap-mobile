# Phase 02 Deferred Items

## Plan 02-01 — backend test suite intermittent flake (2026-05-06)

**Symptom:** 1 of 219 backend tests fails on the first `npm test` run with
`expected 400, received 404` on `Phase 4 — Archive Lifecycle: mod-archive
invalid reasonCode → 400`. Re-running the same suite (no code changes) passes
all 219 tests deterministically. Runs 2 + 3 of `npm test` post-run-1 both
returned 219/219.

**Scope:** Pre-existing test in M2/Phase 4 block (`mod-archive invalid
reasonCode`); NOT a Plan 02-01 test. Plan 02-01 only added new files
(locationRoutes.test.js + 7 cases appended to moderationRoutes.test.js).

**Suspect:** Jest parallel-workers cross-file contamination — two test files
share the same global MongoMemoryServer setup (src/__tests__/setup.js
beforeAll) and afterEach `deleteMany({})` cycle. When suite count grew from
~155 to 219, the cross-suite race became more likely.

**Decision:** Out of Plan 02-01 scope (Rule 4: SCOPE BOUNDARY). Documented
here for M3 carry-forward. Re-open if it becomes deterministic.

## Plan 02-02 — pre-existing RN client jest baseline failures (2026-05-06)

**Symptoms:**
1. `src/services/__tests__/PropertyService.test.ts` — entire suite fails to
   load with `TypeError: Cannot read properties of undefined (reading
   'interceptors')` at `apiClient.ts:31` (axios mock missing).
2. `src/hooks/__tests__/useRole.test.ts` — 1 of N tests fails: `manageListings:
   plainUser without landlord status is permitted` expects `true`, gets the
   wrong boolean (likely a behavior drift from Phase 5 admin role mgmt).

**Scope:** Plan 02-02 only added files under
`src/components/ContextualListingFlow/` and ~24 new keys in
`src/locales/{en,ru}.ts`. Neither failing test touches any file or import
path that Plan 02-02 modifies. Confirmed pre-existing on baseline
`8040933` via `git diff 8040933 HEAD --name-only` (no overlap with the
failing test paths).

**Decision:** Out of Plan 02-02 scope (Rule 4: SCOPE BOUNDARY). Carry into
M3 jest-stack hardening or re-open at the next paired-gate verifier+code-review
sweep. The 21 new ContextualListingFlow tests (validators 7, adapters 7,
Step1 7) all pass green.


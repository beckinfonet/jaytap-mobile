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

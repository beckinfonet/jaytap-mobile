---
phase: 04-m2-carry-forward-bug-fixes
plan: 01
subsystem: backend-security
tags: [supertest, jose, jwks, multer-s3, bash-sentinel, landlord-application, anti-spoofing, defense-in-depth, mongo]

# Dependency graph
requires:
  - phase: 02-phase-4.5-landlord-application
    provides: requireBearer guard + verifyFirebaseToken middleware in landlordApplicationRoutes.js (the route file this plan locks down)
  - phase: 03-media-flow-inversion-admin-mod-curation
    provides: D-15 anti-spoofing sentinel pattern (check-no-actoruid-spoofing.sh) + D-16 npm test chain ordering
provides:
  - Permanent build-time sentinel scripts/check-no-landlord-uid-spoofing.sh (greps `uid:\s*req\.(body|headers)` in landlordApplicationRoutes.js)
  - 3 new supertest cases in src/__tests__/landlordApplicationRoutes.test.js asserting body-spoof rejection, no-bearer 401, happy-path uid match
  - npm test chain extended to actoruid → landlord-uid → media-stripped → jest (3 sentinels green BEFORE jest invokes)
  - Diagnostic console.log block (7 fields incl. PII) removed from landlordApplicationRoutes.js
affects: [04-02-landlord-uid-mismatch-migration, phase-5-release]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Twin-sentinel-by-defense-domain — alphabetical chain ordering (actoruid → landlord-uid → media-stripped) makes future audits readable"
    - "Layered defense-in-depth — sentinel (build-time) + supertest (jest-time) + diagnostic-removal (audit cleanup) as 3 layers for the same trust boundary"

key-files:
  created:
    - "BACKEND:scripts/check-no-landlord-uid-spoofing.sh — D-07 anti-spoofing sentinel (16 LOC)"
    - "BACKEND:src/__tests__/landlordApplicationRoutes.test.js — D-08 supertest cases (140 LOC, 3 tests)"
  modified:
    - "BACKEND:src/routes/landlordApplicationRoutes.js — D-06 diagnostic console.log block deleted (lines 111-123 + comments at 111-114)"
    - "BACKEND:package.json — D-07 npm test chain extended with new sentinel"

key-decisions:
  - "Followed plan exactly — 0 deviations. Plan was mechanical (sentinel mirror + log delete + supertest scaffold copy)."
  - "Deleted the diagnostic comment block (lines 111-114) along with the console.log itself — the comments are explanatory headers for the diagnostic block; keeping them after deletion would orphan the documentation. Plan said 'Delete the entire block including the trailing semicolon and any blank line that surrounds it' — interpreted to include the comment header."
  - "Test seeds Users with uid='real-uid-ABC' and 'real-uid-XYZ' in beforeEach so verifyFirebaseToken's Mongo lookup resolves req.user. Plan didn't mandate this but it makes the happy-path branch behavior deterministic (avoids an irrelevant ALREADY_APPROVED 409 short-circuit)."

patterns-established:
  - "Anti-spoofing sentinel mirror: 4-string substitution from M2 HF-03 actorUid sentinel — header echo, grep target file, fail message, ok message — everything else verbatim copy"
  - "Synthetic regression verification: temporarily inject the bad pattern, confirm sentinel exits 1, revert (proves sentinel is not a no-op)"
  - "Recipe A multer-s3 mock pattern: identical block from moderationRoutes.test.js — works for any route that instantiates `multer({storage: multerS3({...})})`"

requirements-completed: [CARRY-02]

# Metrics
duration: 18min
completed: 2026-05-07
---

# Phase 4 Plan 01: CARRY-02 Backend Verification Chain Summary

**Defense-in-depth verification scaffolding for landlord-application uid trust boundary — sentinel + supertest + diagnostic cleanup, all green in the npm test chain (261 tests, 3 sentinels).**

## Performance

- **Duration:** ~18 min
- **Started:** 2026-05-07T07:37:00Z (approx)
- **Completed:** 2026-05-07T07:55:22Z
- **Tasks:** 2 (both atomic commits)
- **Files modified:** 4 (2 created + 2 modified, all in BACKEND repo)

## Accomplishments

- **D-06 Diagnostic console.log block removed** at `landlordApplicationRoutes.js:111-123`. The 7-field JSON.stringify (`evt: 'landlord_application_submit'`, `bearerPresent`, `bodyFirebaseUid`, `legacyHeaderUid`, `reqFirebaseUid`, `reqUserEmail`, `ts`) is gone along with its 4-line explanatory comment header. Surrounding `existingActive` 409-check + `ALREADY_APPROVED` 409-check + `LandlordApplication.create({...})` flow preserved verbatim.
- **D-07 Anti-spoofing sentinel** at `scripts/check-no-landlord-uid-spoofing.sh` (16 LOC, executable). Greps `uid:\s*req\.(body|headers)` in `landlordApplicationRoutes.js` — exits 0 on post-fix tree, exits 1 on regression (verified via synthetic injection + revert).
- **D-07 npm test chain extended** with the new sentinel inserted between the existing two: `actoruid && landlord-uid && media-stripped && jest`. All 3 sentinels echo their OK lines BEFORE jest invokes.
- **D-08 Supertest file** at `src/__tests__/landlordApplicationRoutes.test.js` (140 LOC, 3 tests, all passing): body-spoof rejection (body `firebaseUid='attacker-uid-XYZ'` ignored, row uid resolves to JWKS `payload.sub='real-uid-ABC'`), no-bearer rejection (401 `{code: 'missing-token'}`), happy-path uid match.
- **Full backend npm test passes:** 10 suites, 261 tests (258 baseline + 3 new from this plan, exact match to plan forecast).

## Task Commits

Each task was committed atomically in the JayTap-services backend repo:

1. **Task 1: Sentinel + diagnostic log delete + npm test chain extension (D-06 + D-07)** — `3222d96` (feat) — backend HEAD descendant of `339c8ce`
2. **Task 2: 3 D-08 supertest cases for uid invariants** — `fb6fcfd` (test) — backend HEAD descendant of `3222d96`

Both commits pass the pre-commit hook (no `--no-verify` used). Backend repo HEAD is now `fb6fcfd`.

## Files Created/Modified

### Created (2)
- `BACKEND:scripts/check-no-landlord-uid-spoofing.sh` (16 LOC, executable) — D-07 anti-spoofing sentinel mirroring `check-no-actoruid-spoofing.sh`. Greps `uid:\s*req\.(body|headers)` in `landlordApplicationRoutes.js`.
- `BACKEND:src/__tests__/landlordApplicationRoutes.test.js` (140 LOC, 3 tests) — D-08 supertest cases. Mocks `../config/firebase` (in-memory JWKS keypair via jose) and `multer-s3` (Recipe A stub) so multer pipeline runs end-to-end without real S3 calls.

### Modified (2)
- `BACKEND:src/routes/landlordApplicationRoutes.js` (302 → 287 LOC) — D-06 diagnostic block deleted. The handler logic for the POST `/api/landlord-applications` path is now: validate inputs → check `existingActive` 409 → check `ALREADY_APPROVED` 409 → `LandlordApplication.create({uid: req.firebaseUid, ...})` → audit-log row → 201.
- `BACKEND:package.json:10` — npm test chain extended: `bash scripts/check-no-actoruid-spoofing.sh && bash scripts/check-no-landlord-uid-spoofing.sh && bash scripts/check-property-routes-media-stripped.sh && jest --config jest.config.cjs`. Insertion is BETWEEN the two existing sentinels (alphabetical-by-defense-domain order: actoruid → landlord-uid → media-stripped).

## Decisions Made

Plan was mechanical and prescriptive. Two minor judgment calls during execution:

- **Comment block cleanup along with console.log.** Plan listed the `console.log(JSON.stringify({...}))` block at lines 111-123 as the deletion target and said "Delete the entire block including the trailing semicolon and any blank line that surrounds it." The 4 explanatory comment lines at 111-114 (`// TEMPORARY diagnostic — Phase 4.5 uid-mismatch root-cause hunt.` etc.) sit immediately above the console.log and exist solely to introduce that diagnostic. Leaving them after deletion would orphan the documentation. Decision: delete the comments along with the console.log. This results in 287 LOC (≥280 floor per acceptance) — well within bounds.
- **Pre-seed Users in beforeEach.** Plan didn't mandate seeding User rows; the test file just needs the route to land a row. But `verifyFirebaseToken` middleware does a Mongo lookup for `req.user`. Without a User row, `req.user` is `null`, which means the `ALREADY_APPROVED` 409 short-circuit at landlordApplicationRoutes.js:104 (`if (req.user && req.user.canListProperties === true)`) evaluates to falsy on the `req.user && ...` short-circuit and the test happens to pass. But seeding makes the happy-path more deterministic and consistent with the moderationRoutes.test.js pattern (which seeds users explicitly in beforeEach). Decision: seed User rows for `real-uid-ABC` and `real-uid-XYZ`. No behavioral impact on the test outcomes.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- **Sentinel exit-code interpretation in chained shell commands.** During final acceptance grep, ran `grep -c "landlord_application_submit" ... && grep -c "test(" ... && bash scripts/check-no-landlord-uid-spoofing.sh; echo "EXIT: $?"`. The first `grep -c` returned 0 (no matches → grep exits 1), which broke the `&&` chain so the sentinel never ran. The `EXIT: 1` printed by the trailing `echo` was misleading. Re-ran the sentinel in isolation; it exits 0 as expected. Not a defect, but worth noting for future verification scripts: use `; ` between commands you want to run unconditionally, OR check exit codes individually.

## User Setup Required

None - no external service configuration required. The post-fix tree is a code-only change; no env vars, no database migrations, no operator actions needed for this plan. (Plans 04-02 and 04-03 cover the operator-supervised migration + RN client demote-mid-action recovery; this plan is scoped to backend verification scaffolding only.)

## Next Phase Readiness

- **CARRY-02 verification chain is now defense-in-depth:** sentinel + supertest + diagnostic-removal as 3 layered defenses against the body-uid spoofing regression class.
- **Plan 04-02 (CARRY-02 repair migration) is unblocked:** the supertest and sentinel form a known-clean baseline against which the migration script can land. The migration touches existing rows; it doesn't touch the route file.
- **Phase 5 device walks (REL-03)** will exercise the demote-mid-action recovery path against a known-clean backend. The diagnostic logs are gone, so Railway log volume drops back to normal.
- **No blockers for downstream waves.** Backend HEAD is `fb6fcfd`, descendant of `339c8ce`.

## Self-Check

Verified all SUMMARY.md claims:

- ✓ FOUND: BACKEND:scripts/check-no-landlord-uid-spoofing.sh (16 LOC, executable, exit 0)
- ✓ FOUND: BACKEND:src/__tests__/landlordApplicationRoutes.test.js (140 LOC, 3 tests passing)
- ✓ FOUND: package.json sentinel chain ordering exact (actoruid → landlord-uid → media-stripped → jest)
- ✓ FOUND: 0 matches for `landlord_application_submit` in landlordApplicationRoutes.js (diagnostic block fully removed)
- ✓ FOUND: 0 matches for `bodyFirebaseUid|legacyHeaderUid|reqUserEmail` in route file
- ✓ FOUND: commit `3222d96` (Task 1) and `fb6fcfd` (Task 2) in backend repo, both descendants of `339c8ce`
- ✓ FOUND: full `npm test` reports 10 suites, 261 tests, 0 failures
- ✓ FOUND: route file has `LandlordApplication.create` at line 111 (handler logic preserved)
- ✓ FOUND: synthetic regression check — sentinel exits 1 when `uid: req.body.firebaseUid` is injected, exits 0 after revert

## Self-Check: PASSED

---
*Phase: 04-m2-carry-forward-bug-fixes*
*Plan: 01*
*Completed: 2026-05-07*

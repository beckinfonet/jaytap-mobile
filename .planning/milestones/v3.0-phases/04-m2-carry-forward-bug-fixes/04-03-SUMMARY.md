---
phase: 04-m2-carry-forward-bug-fixes
plan: 03
subsystem: api
tags: [backend, moderation, mongoose, multer, sentinel, supertest, regex, objectid, castError]

# Dependency graph
requires:
  - phase: 03-media-flow-inversion-admin-mod-curation
    provides: "Phase 3 reviewer report MD-01..MD-04 deferred MEDIUM bucket; mediaUpload + upload uploader instances at moderationRoutes.js:29-43; check-property-routes-media-stripped.sh sentinel from D-16"
  - phase: 04-m2-carry-forward-bug-fixes (Plan 04-01 + 04-02)
    provides: "Backend chain head at 71a2123 (landlord uid-mismatch fixes shipped); npm test now chains 3 sentinels (HF-03 + CARRY-02 D-07 + Phase-3 D-16)"
provides:
  - "moderationRoutes.js comment block disambiguates `upload` (10MB×40 PHOTO_MIMES, edit-on-behalf) from `mediaUpload` (25MB×45 PHOTO+VIDEO_MIMES, mod media-curation) (MD-02)"
  - "DELETE /api/moderation/listings/:id/media returns HTTP 400 INVALID_ID on malformed ObjectId BEFORE any Mongoose query — eliminates 500 CastError leak path (MD-03)"
  - "2 supertest cases proving the MD-03 invariant ('banana' id + 5-char hex id → 400 INVALID_ID, not 500)"
  - "scripts/check-property-routes-media-stripped.sh sentinel regex tightened from substring `multer` to anchored `require\\(['\"]multer|from ['\"]multer|upload\\.array|multerS3` — no longer matches the bare package name in comments (MD-04)"
affects:
  - "Plan 04-04 (RN client CARRY-01 chain) — independent commit chain in the other repo, doesn't touch any of these files"
  - "Plan 04-05 (RN client MD-01 i18n fix) — independent commit chain in the other repo, doesn't touch any of these files"
  - "Phase 5 hardening — POST /listings/:id/media + POST /properties/:id/approve carry the same CastError shape; this plan scoped MD-03 to DELETE-only per RESEARCH.md Open Decisions #2"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "ObjectId 400 pre-check via `mongoose.Types.ObjectId.isValid(req.params.id)` BEFORE any DB query — established repo convention from favoriteRoutes.js:90"
    - "Sentinel regex anchoring on import shapes (`require(['\"]<pkg>` / `from ['\"]<pkg>`) plus canonical-API surface (`<callable>.array`, `<class>S3`) — never the bare package-name substring"

key-files:
  created: []
  modified:
    - "BACKEND:src/routes/moderationRoutes.js"
    - "BACKEND:src/__tests__/moderationRoutes.test.js"
    - "BACKEND:scripts/check-property-routes-media-stripped.sh"

key-decisions:
  - "MD-03 scope locked to DELETE-only (planner discretion #2 — POST handlers carry the same shape but stay out of scope; Phase 5 hardening sweeps them)"
  - "Pre-check uses `mongoose.Types.ObjectId.isValid()` not `mongoose.isValidObjectId` — both work on mongoose@9.1.6 but the repo-convention form (favoriteRoutes.js:90) is the right consistency anchor"
  - "Auth gate ordering preserved: router-level `verifyFirebaseToken` + `requireMinRole('moderator')` mounted at line 53 still fires FIRST; the new ObjectId pre-check fires AFTER — unauthenticated callers continue to get 401, NOT 400"

patterns-established:
  - "ObjectId pre-check pattern: insert `if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({code: 'INVALID_ID', message: 'Invalid listing id'})` as the FIRST statement inside the route handler's `try` block — before any DB query — to prevent CastError 500 leakage"
  - "Sentinel regex tightening pattern: replace bare-substring matches with anchored import + canonical-API form to prevent false positives on prose mentions while still catching real regressions"

requirements-completed: [MD-02, MD-03, MD-04]

# Metrics
duration: 3 min
completed: 2026-05-07
---

# Phase 4 Plan 03: Phase 3 MEDIUM-bucket polish (MD-02 + MD-03 + MD-04) Summary

**3 surgical backend fixes — comment doc-drift, CastError → 400 normalization on the DELETE handler, and sentinel regex tightening — closing the Phase 3 reviewer's MEDIUM bucket without changing runtime behavior beyond the new 400 path.**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-05-07T08:07:06Z
- **Completed:** 2026-05-07T08:10:17Z
- **Tasks:** 3 of 3 (Task 2 was TDD: RED then GREEN)
- **Files modified:** 3 (all backend repo)
- **Backend chain commits:** 4 (1 docs + 1 test + 1 feat + 1 chore)

## Accomplishments

- **MD-02 (comment doc-drift):** `moderationRoutes.js:21-24` now distinguishes `upload` (10MB × 40 files, PHOTO_MIMES only, edit-on-behalf path) from `mediaUpload` (25MB × 45 files, PHOTO_MIMES + VIDEO_MIMES, mod media-curation). Future maintainers can read the per-instance limits + purposes in the comment block without spelunking the makeUploader call sites.
- **MD-03 (CastError → 400):** `mongoose.Types.ObjectId.isValid(req.params.id)` pre-check at the top of `DELETE /api/moderation/listings/:id/media` returns `{code: 'INVALID_ID', message: 'Invalid listing id'}` with HTTP 400 BEFORE any `Property.findById()` call. Closes the information-disclosure leak (T-04-03-01) where Mongoose CastError messages would echo schema internals via the 500 path. Auth gate ordering preserved — unauthenticated callers still get 401.
- **MD-03 supertest coverage:** 2 new cases (`'banana'` non-hex id + 5-char hex id) assert 400 INVALID_ID, not 500. Both cases proven RED first (current 500 behavior captured), then GREEN after the pre-check landed.
- **MD-04 (sentinel regex):** `scripts/check-property-routes-media-stripped.sh:8` regex tightened from `upload\.array|multer|multerS3` to `require\(['"]multer|from ['"]multer|upload\.array|multerS3`. The old substring match would false-positive on any comment mentioning "multer" by name; the tightened form requires an actual import shape or canonical multer API surface. Synthetic regression smoke confirmed: a synthetic `const multer = require('multer');` line in propertyRoutes.js trips the sentinel (exit 1); reverting the synthetic line restores exit 0.

## Task Commits

Each task committed atomically in the backend repo (descendant of `71a2123`):

1. **Task 1: MD-02 comment doc-drift fix** — `be071c0` (docs)
   - `docs(04-03): disambiguate upload vs mediaUpload in moderationRoutes (MD-02)`
2. **Task 2 RED: MD-03 failing supertest cases** — `2209ecc` (test)
   - `test(04-03): add failing supertest cases for MD-03 ObjectId 400 pre-check`
3. **Task 2 GREEN: MD-03 ObjectId pre-check on DELETE handler** — `304fdcd` (feat)
   - `feat(04-03): add ObjectId 400 pre-check on DELETE /listings/:id/media (MD-03)`
4. **Task 3: MD-04 sentinel regex tightening** — `46d2ef4` (chore)
   - `chore(04-03): tighten media-stripped sentinel regex (MD-04)`

Backend HEAD: `46d2ef4`. RN HEAD unchanged at `a15ee13`.

## Files Created/Modified

- **`BACKEND:src/routes/moderationRoutes.js`** — Comment block at lines 21-24 rewritten to disambiguate the two uploader instances (MD-02). Added `const mongoose = require('mongoose');` import (was absent). Inserted ObjectId pre-check at the top of the DELETE `/listings/:id/media` handler (MD-03).
- **`BACKEND:src/__tests__/moderationRoutes.test.js`** — Appended new describe block `'DELETE /api/moderation/listings/:id/media — MD-03 ObjectId 400 pre-check'` with 2 supertest cases (33 LOC added; existing test scaffolding untouched).
- **`BACKEND:scripts/check-property-routes-media-stripped.sh`** — Line 8 regex tightened from `upload\.array|multer|multerS3` to `require\(['"]multer|from ['"]multer|upload\.array|multerS3` (MD-04). All other lines unchanged.

## Decisions Made

- **MD-03 scope = DELETE-only.** Per plan + RESEARCH.md Open Decisions #2 + planner discretion #2. POST `/listings/:id/media` and POST `/properties/:id/approve` carry the same CastError shape today but are explicitly NOT in this plan's scope; Phase 5 hardening can sweep them later. Locking scope keeps the commit chain atomic and the rollback granular.
- **`mongoose.Types.ObjectId.isValid` (not `mongoose.isValidObjectId`).** Both work identically on mongoose@9.1.6, but the established repo convention is the `Types.ObjectId.isValid` form (favoriteRoutes.js:90). Consistency over micro-stylistic preference.
- **Comment-only fix for MD-02 (no code changes).** The two `makeUploader({...})` calls at lines 32-37 (`upload`) and 39-43 (`mediaUpload`) are correct; only the comment was misleading after Plan 03-02 added the second instance.
- **Synthetic regression smoke is operator-side, not committed.** Task 3 Step 3 verifies the tightened sentinel exits 1 on a synthetic `require('multer')` line in propertyRoutes.js, then reverts. The synthetic line is never committed — purely a due-diligence smoke test during plan execution.

## Deviations from Plan

None - plan executed exactly as written.

The plan was a tight, surgical 3-task backend chain (MD-02 + MD-03 + MD-04). Every task spec matched the actual repo state; no Rule 1 / Rule 2 / Rule 3 fixes were needed. Each acceptance criterion in the plan's `<acceptance_criteria>` blocks verified clean.

## Issues Encountered

None. The TDD RED → GREEN cycle for MD-03 worked as expected:
- RED commit (2209ecc) proved both supertest cases fail with 500 (current behavior).
- GREEN commit (304fdcd) made both pass with 400 INVALID_ID.

The mongoose import was absent from `moderationRoutes.js` (per plan Step 1 of Task 2: "verify and only add if truly missing") — adding it was anticipated by the plan and is included in the GREEN commit.

## Verification Output

### Per-task automated verification

**Task 1 (MD-02):**
```
$ grep -c "10MB" src/routes/moderationRoutes.js → 1
$ grep -c "25MB" src/routes/moderationRoutes.js → 4 (incl. 1 in new comment)
$ grep -c "edit-on-behalf" src/routes/moderationRoutes.js → 15 (incl. 1 in new comment)
$ grep -c "mod media-curation" src/routes/moderationRoutes.js → 1 (new)
$ grep -c "verbatim: 10MB/file cap + 40-file count" src/routes/moderationRoutes.js → 0 (legacy line gone)
```

**Task 2 RED (MD-03 RED):**
```
$ npx jest --testPathPattern=moderationRoutes -t "MD-03"
Expected: 400  Received: 500   ← both cases fail (current CastError 500 path)
Test Suites: 1 failed, 1 total | Tests: 2 failed
```

**Task 2 GREEN (MD-03 GREEN):**
```
$ npx jest --testPathPattern=moderationRoutes
✓ malformed ObjectId "banana" returns 400 INVALID_ID (not 500 CastError) (6 ms)
✓ 5-char hex id returns 400 INVALID_ID (24-char hex required) (7 ms)
Test Suites: 1 passed | Tests: 77 passed, 77 total
```

**Task 3 (MD-04):**
```
$ bash scripts/check-property-routes-media-stripped.sh
== Phase-3 D-16 propertyRoutes media-stripped sentinel ==
OK: propertyRoutes.js is media-stripped
EXIT: 0

# Synthetic regression smoke (operator-side, not committed):
# 1. Add `// const multer = require('multer'); // SYNTHETIC REGRESSION` to propertyRoutes.js
$ bash scripts/check-property-routes-media-stripped.sh
FAIL: multer/upload/multerS3 references still present in propertyRoutes.js:
1:// const multer = require('multer'); // SYNTHETIC REGRESSION
EXIT: 1   ← caught synthetic regression

# 2. Revert
$ bash scripts/check-property-routes-media-stripped.sh
OK: propertyRoutes.js is media-stripped
EXIT: 0   ← back to clean
```

### Plan-level integration check

```
$ nvm use 24 && npm test
== Phase-3 D-15 anti-spoofing sentinel — actorUid in moderationRoutes.js ==
OK HF-03: actorUid sourced exclusively from req.firebaseUid
== Phase-4 CARRY-02 D-07 anti-spoofing sentinel — uid in landlordApplicationRoutes.js ==
OK CARRY-02: landlord-application uid sourced exclusively from req.firebaseUid
== Phase-3 D-16 propertyRoutes media-stripped sentinel ==
OK: propertyRoutes.js is media-stripped

Test Suites: 11 passed, 11 total
Tests:       273 passed, 273 total
Time:        4.798 s
```

All 3 sentinels green, 273/273 jest tests pass (was 271 before Task 2 added 2 cases).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- **Backend chain integrity:** 4 new commits descend cleanly from `71a2123` (verified via `git merge-base --is-ancestor 71a2123 HEAD`). Each commit is a clean atomic unit; rollback granularity preserved per finding.
- **Independent of RN chain:** MD-01 i18n fix is owned by Plan 04-05 (separate RN repo chain). MD-02 + MD-03 + MD-04 (this plan) are backend-only and have no RN client dependencies.
- **Phase 4 close:** This plan was the last backend chain in Phase 4. Plan 04-04 (RN CARRY-01) + Plan 04-05 (RN MD-01) remain in the RN repo but are independent of these commits.
- **Phase 5 carry-forward:** POST `/listings/:id/media` + POST `/properties/:id/approve` carry the same CastError-via-malformed-ObjectId shape that MD-03 fixed on DELETE. Phase 5 hardening (or M5+ polish) can sweep them using the same `mongoose.Types.ObjectId.isValid()` pattern. The decision to scope MD-03 to DELETE-only was deliberate (planner discretion #2) and is not a regression — just deferred breadth.

## Self-Check: PASSED

**Files exist:**
- `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/routes/moderationRoutes.js` → FOUND (modified)
- `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/__tests__/moderationRoutes.test.js` → FOUND (modified)
- `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/scripts/check-property-routes-media-stripped.sh` → FOUND (modified)

**Commits exist (in backend repo):**
- `be071c0` (Task 1 MD-02) → FOUND
- `2209ecc` (Task 2 RED MD-03) → FOUND
- `304fdcd` (Task 2 GREEN MD-03) → FOUND
- `46d2ef4` (Task 3 MD-04) → FOUND

**Backend chain descends from base `71a2123`:** verified via `git merge-base --is-ancestor 71a2123 HEAD` — DESCENDS-OK.

---
*Phase: 04-m2-carry-forward-bug-fixes*
*Plan: 03*
*Completed: 2026-05-07*

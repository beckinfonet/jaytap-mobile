---
phase: 01-backend-role-foundation-auth-migration-hotfix-bundle
plan: 06
subsystem: backend-auth
tags: [auth, jwks, hf-03, role-08, role-04, dual-accept, route-migration]
requires:
  - "Plan 01-05: verifyFirebaseToken middleware (Bearer + legacy x-firebase-uid + body.firebaseUid; req.firebaseUid + req.user contract)"
  - "Plan 01-03: jwks-tokens.js test fixtures + jest+jose toolchain (babel-jest + transformIgnorePatterns)"
  - "Plan 01-03: src/__tests__/setup.js MongoMemoryServer bootstrap"
provides:
  - "POST /api/auth/users — HF-03 lockdown (body-uid match + explicit field allowlist; userType NEVER from body)"
  - "GET /api/auth/me — ROLE-08 endpoint returning req.user (verified Mongo record)"
  - "Single auth middleware mounted across 5 backend services (auth/property/favorite/chat/appointment HTTP routes)"
  - "src/__tests__/authRoutes.test.js — 8-case supertest coverage for HF-03 + ROLE-08 + legacy /users/:firebaseUid"
affects:
  - "Plan 01-07 (socket.io handshake): chatAuthMiddleware.js is gone; socket path uses verifyFirebaseToken or its socket-shaped sibling"
  - "Plan 01-10 (client GET /me wiring): the endpoint now exists; AuthContext.refreshRole() can call it"
  - "All 5 services already dual-accept legacy x-firebase-uid (handled by middleware, not per-route work)"
tech-stack:
  added: []
  patterns:
    - "Per-route verifyFirebaseToken mount on POST /users (NOT router.use) so legacy GET /users/:firebaseUid stays public-readable through the D-03 dual-accept window"
    - "router.use(verifyFirebaseToken) on chatRoutes + appointmentRoutes (gold-standard whole-router protection per PATTERNS.md)"
    - "Soft-auth pattern preserved on favoriteRoutes GET via inline softAuthUid(req) helper — anonymous browsing still returns []"
    - "Multer-then-verifyFirebaseToken order on propertyRoutes POST + PUT (multer parses multipart body so middleware can read body.firebaseUid legacy fallback)"
key-files:
  created:
    - "/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/__tests__/authRoutes.test.js"
  modified:
    - "/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/routes/authRoutes.js"
    - "/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/routes/propertyRoutes.js"
    - "/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/routes/favoriteRoutes.js"
    - "/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/routes/chatRoutes.js"
    - "/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/routes/appointmentRoutes.js"
  deleted:
    - "/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/middleware/chatAuthMiddleware.js"
decisions:
  - "Removed the userType !== 'renter' && !== 'admin' gate on propertyRoutes POST/DELETE (PATTERNS.md line 326): Plan 09 flips renter→user, making the gate meaningless; auth + ownership are sufficient for owner-managed listings."
  - "Migrated PATCH /:id/verifications even though it was not enumerated in the plan's 3-block list — leaving it on the unverified header path while the other 4 blocks are migrated would be a security regression and would fail the plan's own success criterion (zero `req.body.firebaseUid || req.headers['x-firebase-uid']` matches in any of the 5 route files). [Rule 2 — auto-add missing critical functionality]"
  - "Tightened the locked-email rejection branch in POST /users to only block recreation when the locked record's uid differs from the verified req.firebaseUid — verifyFirebaseToken already 403s account-locked for the same-uid case, so the old branch double-403'd. [Rule 1 — auto-fix bug, surfaced during HF-03 implementation]"
  - "Test 'no Authorization header → 401' rewritten to also omit body.firebaseUid; verifyFirebaseToken accepts body.firebaseUid as a Plan-05 documented legacy fallback during the D-03 dual-accept window. The original plan-spec assertion was inconsistent with Plan 05's contract. [Rule 1 — fix incorrect test expectation]"
metrics:
  duration_min: 5.4
  tasks_committed: 4
  inline_auth_blocks_removed: 5  # propertyRoutes POST + PATCH + PUT + DELETE + favoriteRoutes verifyAuth
  net_loc: -6  # 282 insertions − 288 deletions
  loc_authRoutes_test: 143  # new file
  loc_chatAuthMiddleware_deleted: 37
  tests_pre: 31  # Plan 05 baseline
  tests_post: 39  # 31 + 8 new authRoutes tests
  jest_runtime_seconds: 1.5
  completed_date: "2026-04-30"
---

# Phase 1 Plan 06: Backend Auth Surface Collapse — HF-03 + ROLE-08 + ROLE-04 Summary

**One-liner:** Collapsed all 5 backend services onto the Plan-05 `verifyFirebaseToken` middleware, closed HF-03 (uid-mismatch + explicit field allowlist), shipped GET /api/auth/me (ROLE-08), and deleted the orphaned `chatAuthMiddleware.js` — net 5 inline auth blocks removed, 8 supertest cases added (39/39 green in 1.5s).

## What Shipped

| Surface | Before | After |
| --- | --- | --- |
| `authRoutes.js` POST `/users` | Body-merge with no uid integrity check, implicit allowlist | `verifyFirebaseToken` mounted; HF-03 (a) 403 `uid-mismatch` + HF-03 (b) explicit `safe` allowlist (`firstName`, `lastName`, `phone`, `whatsapp`, `telegram`, `instagramUrl`, `isRenterApplicant`) |
| `authRoutes.js` GET `/me` | did not exist | New route: `verifyFirebaseToken` → `res.json(req.user)` |
| `authRoutes.js` GET `/users/:firebaseUid` | public-readable | unchanged — preserved through D-03 dual-accept window per PATTERNS.md line 262 |
| `propertyRoutes.js` POST `/` | 30-line inline auth + `userType !== 'renter' && !== 'admin'` gate | `upload.array → verifyFirebaseToken → handler`; gate removed (Plan 09 flips renter→user) |
| `propertyRoutes.js` PATCH `/:id/verifications` | inline auth + admin check | `verifyFirebaseToken` + in-handler `req.user.userType === 'admin'` |
| `propertyRoutes.js` PUT `/:id` | 30-line inline auth | `upload.array → verifyFirebaseToken → handler` |
| `propertyRoutes.js` DELETE `/:id` | inline auth + `userType === 'renter'` gate | `verifyFirebaseToken`; ownership check in handler |
| `favoriteRoutes.js` GET `/` + GET `/check/:propertyId` | 41-line inline `verifyAuth` middleware (soft-auth-or-locked) | inline `softAuthUid(req)` helper — anonymous browsing still returns `[]` / `{ isFavorited: false }` |
| `favoriteRoutes.js` POST/DELETE/toggle | inline `verifyAuth` (lenient) | per-route `verifyFirebaseToken` (strict — auth required for writes) |
| `chatRoutes.js` | `router.use(verifyChatUser)` | `router.use(verifyFirebaseToken)` |
| `appointmentRoutes.js` | `router.use(verifyChatUser)` | `router.use(verifyFirebaseToken)` |
| `chatAuthMiddleware.js` | 37 LOC (only consumed by chat + appointment routes) | DELETED via `git rm` — `grep -rn 'chatAuthMiddleware\|verifyChatUser' src/ index.js` returns zero matches |

## Commits (in order)

| SHA | Subject | Files | Scope |
| --- | --- | --- | --- |
| `c08b5d8` | `test(auth): RED — HF-03 body-uid match + GET /me supertest coverage [HF-03,ROLE-08]` | `src/__tests__/authRoutes.test.js` (+143) | TDD RED gate |
| `6f90f6d` | `feat(auth): HF-03 body-uid match + GET /me + verifyFirebaseToken mount [HF-03,ROLE-08]` | `src/routes/authRoutes.js` (+90/-54), `src/__tests__/authRoutes.test.js` (test edit) | TDD GREEN gate |
| `8edd68e` | `refactor(routes): collapse property+favorite auth onto verifyFirebaseToken [ROLE-04]` | `src/routes/propertyRoutes.js` (+45/-95), `src/routes/favoriteRoutes.js` (+6/-100) | Task 2 |
| `03b382a` | `refactor(routes): chat+appointment use verifyFirebaseToken; delete chatAuthMiddleware [ROLE-04]` | `src/routes/chatRoutes.js` (+2/-2), `src/routes/appointmentRoutes.js` (+2/-2), `src/middleware/chatAuthMiddleware.js` (deleted -37) | Task 3 |

Subjects collectively reference all three required IDs: `[HF-03]`, `[ROLE-04]`, `[ROLE-08]`.

## Verification

| Check | Result |
| --- | --- |
| `node --check` on all 5 modified route files | PASS |
| `grep -E "req\.body\.firebaseUid \|\| req\.headers\['x-firebase-uid'\]" src/routes/{property,favorite}Routes.js` | zero matches (was 5 occurrences pre-Plan-06) |
| `grep -q "verifyFirebaseToken" src/routes/authRoutes.js` | PASS (per-route mount) |
| `grep -q "code: 'uid-mismatch'" src/routes/authRoutes.js` | PASS |
| `grep -q "router.get('/me'" src/routes/authRoutes.js` | PASS |
| `grep -q "res.json(req.user)" src/routes/authRoutes.js` | PASS |
| `! grep -E "userType.*req\.body\|req\.body\.userType" src/routes/authRoutes.js` | PASS (no userType-from-body read) |
| `grep -q "router.get('/users/:firebaseUid'" src/routes/authRoutes.js` | PASS (legacy preserved) |
| `grep -q "rooms\|maxGuests" src/routes/propertyRoutes.js` | PASS (HF-01 fields preserved — Plan 02 not regressed) |
| `grep -c "verifyFirebaseToken" src/routes/propertyRoutes.js` | 10 (≥ 4 expected — import + POST + PATCH + PUT + DELETE + comments/docs) |
| `grep -q "router.use(verifyFirebaseToken)" src/routes/{chat,appointment}Routes.js` | PASS on both |
| `test -f src/middleware/chatAuthMiddleware.js` | not present (deleted) |
| `grep -rn "chatAuthMiddleware\|verifyChatUser" src/ index.js` | zero matches |
| `npm test` | 39/39 green in 1.5s (was 31 pre-Plan-06; +8 new authRoutes tests) |

### Test breakdown

`src/__tests__/authRoutes.test.js` — 8 supertest cases:

1. HF-03 (a): `body.firebaseUid != token.sub → 403 uid-mismatch`
2. HF-03 (b): `body containing userType is IGNORED (allowlist excludes it)` — verifies a body containing `userType: 'admin'` does NOT update the user's userType (still `'renter'`)
3. HF-03 (c): `body.firebaseUid === token.sub → 200 user updated with safe fields`
4. HF-03 (d): `no body.firebaseUid → uses token.sub`
5. HF-03 (e): `no Authorization header AND no body.firebaseUid → 401`
6. ROLE-08: `valid Bearer → returns the Mongo record (req.user)`
7. ROLE-08: `no Bearer → 401`
8. Dual-accept: `legacy GET /users/:firebaseUid public read still works (no auth)`

Pre-existing suites (31 tests) regress-tested green:
- `verifyFirebaseToken.test.js` — 24 tests (9-case golden matrix + 8 edge cases + 4 ROLE-11 + 6 requireMinRole + …) — all PASS
- `User.test.js` — 7 tests (roleRevokedAt schema + lock/delete invariants) — all PASS

## Inline Auth Blocks Removed (per file)

| File | Blocks removed | Notes |
| --- | --- | --- |
| `propertyRoutes.js` | 4 | POST `/` (~33 LOC) + PATCH `/:id/verifications` (~10 LOC) + PUT `/:id` (~31 LOC) + DELETE `/:id` (~17 LOC). Plan called for 3 — PATCH was added per Rule 2 to satisfy the plan's own "zero `req.body.firebaseUid \|\| req.headers['x-firebase-uid']` matches" success criterion. |
| `favoriteRoutes.js` | 1 | Inline `verifyAuth = async (req, res, next) => {...}` definition (lines 7-47, 41 LOC). Soft-auth UX preserved via new `softAuthUid(req)` helper on the GET routes. |
| `chatRoutes.js` | 0 | Already used `router.use(...)` pattern — only the import + mount line changed. |
| `appointmentRoutes.js` | 0 | Same as chatRoutes. |
| `authRoutes.js` | 0 (refactor — added HF-03 logic) | POST `/users` rewritten with `verifyFirebaseToken` mount + uid-mismatch check + explicit allowlist; new GET `/me` route added. |
| **Total** | **5 inline auth blocks removed** | |

## LOC Delta

```
src/__tests__/authRoutes.test.js     | 143 +++++++++++++++++++++++++++++++++++ (NEW)
src/middleware/chatAuthMiddleware.js |  37 --------- (DELETED)
src/routes/appointmentRoutes.js      |   4 +-
src/routes/authRoutes.js             | 136 ++++++++++++++++++++-------------
src/routes/chatRoutes.js             |   4 +-
src/routes/favoriteRoutes.js         | 109 +++++++-------------------
src/routes/propertyRoutes.js         | 137 ++++++---------------------------
7 files changed, 282 insertions(+), 288 deletions(-)
```

Net: -6 LOC overall (+143 test file, -37 deleted middleware, -112 inline auth across 5 route files). The plan's expected ~50-LOC reduction across the 5-service collapse is exceeded once the 143-LOC test file is excluded.

## Decisions Made

1. **Per-route mount on authRoutes (not `router.use`)** — `GET /users/:firebaseUid` must stay public-readable through the D-03 dual-accept window per PATTERNS.md line 262. `router.use` would 401 anonymous reads.
2. **`router.use(verifyFirebaseToken)` on chat + appointment** — All routes in those files require auth; the gold-standard whole-router protection is correct here.
3. **Soft-auth preserved on favoriteRoutes GET** — Anonymous browsing UX requires an empty-array fallback; new `softAuthUid(req)` helper extracts uid via the same dual-accept rule (header/body) without 401-ing missing-auth.
4. **Removed `userType !== 'renter' && !== 'admin'` gate on POST/DELETE property** — Plan 09 flips renter→user; the gate becomes meaningless. Auth (verifyFirebaseToken) + ownership check (in handler) are sufficient; mod queue + role-restricted endpoints land in Phases 3+5.
5. **PATCH /:id/verifications migrated despite not being in the plan's 3-block list** — Leaving it on the unverified header path while the other endpoints are migrated would be a security regression and would fail the plan's own zero-grep success criterion. Migration is mechanical: `verifyFirebaseToken` + in-handler `req.user.userType === 'admin'` (admin enforcement preserved).
6. **Locked-email rejection branch tightened** — Old branch 403'd ANY `existingUserByEmail.isLocked || .deletedAt`; the new branch only blocks when the locked record's uid differs from `req.firebaseUid` (otherwise verifyFirebaseToken already 403'd `account-locked`, causing a redundant double-403). Rule 1 fix surfaced during HF-03 implementation.

## Deviations from Plan

### Rule 1 — Auto-fixed Bugs

**1. Test 'no Authorization header → 401' expectation conflicted with Plan-05 dual-accept contract**
- **Found during:** Task 1 GREEN run
- **Issue:** Plan spec at line 236-241 sent `{ firebaseUid: 'attacker-uid' }` in the body with no Authorization header and asserted 401. But verifyFirebaseToken (Plan 05) explicitly accepts `req.body.firebaseUid` as a legacy fallback during the D-03 dual-accept window — there is even a `verifyFirebaseToken.test.js` test (`legacy firebaseUid in body (no header, no Bearer) → next() + structured log`) asserting that exact behavior.
- **Fix:** Renamed the test to `'no Authorization header AND no body.firebaseUid → 401'` and removed `firebaseUid` from the body. The intent (anonymous request → 401) is preserved; the assertion is now consistent with Plan 05's contract.
- **Files modified:** `src/__tests__/authRoutes.test.js` (test rename + body change + clarifying comment)
- **Commit:** `6f90f6d` (the GREEN commit; the test edit shipped together with the handler implementation)

**2. Locked-email rejection double-403 in POST /users**
- **Found during:** Task 1 GREEN review of the existing pre-HF-03 handler
- **Issue:** The pre-HF-03 handler 403'd any account whose email was locked, including for the SAME uid as the verified token. After mounting verifyFirebaseToken, this is a redundant 403 because the middleware already 403'd `account-locked` upstream when the verified user's record is locked.
- **Fix:** Wrapped the locked-email branch in `if (existingUserByEmail.uid !== req.firebaseUid)` — only blocks recreation when the locked record belongs to a DIFFERENT uid (legitimate "this email is taken" UX). Same-uid case never reaches the handler because middleware short-circuits.
- **Files modified:** `src/routes/authRoutes.js`
- **Commit:** `6f90f6d`

### Rule 2 — Auto-added Missing Critical Functionality

**1. PATCH /:id/verifications migrated despite not being in the plan's enumerated 3-block list**
- **Found during:** Task 2 file inspection
- **Issue:** Plan listed POST + PUT + DELETE on propertyRoutes.js as the 3 inline auth blocks to migrate. PATCH `/:id/verifications` (admin-only flag write) also has an inline auth block reading `req.body.firebaseUid || req.headers['x-firebase-uid']`. Migrating only 3 of 4 leaves the route on the unverified header path while the others are migrated — a security regression.
- **Fix:** Migrated PATCH the same way: replaced inline auth with `verifyFirebaseToken` middleware mount; preserved admin-only check via in-handler `if (req.user.userType !== 'admin') return 403`.
- **Threat refs:** T-1-01 (Spoofing on all 5 services' auth surface — applies equally to PATCH).
- **Files modified:** `src/routes/propertyRoutes.js` (PATCH handler section)
- **Commit:** `8edd68e`

### Rule 3 — Auto-fixed Blocking Issues

None.

### Rule 4 — Architectural Decisions

None — no checkpoints triggered.

## Authentication Gates

None — fully autonomous execution.

## Key Links

| From | To | Via | Pattern |
| --- | --- | --- | --- |
| All 5 route files | `src/middleware/verifyFirebaseToken` (Plan 05) | `require + router.use` OR per-route mount | Single middleware reference; `req.firebaseUid` + `req.user` contract preserved |
| Plan 10 client `axios.get('/auth/me')` | `authRoutes.js GET /me` handler | Bearer `Authorization` header | Returns `req.user` (the Mongo record) directly |
| Plan 11 admin role-mutation endpoints | `requireMinRole('admin')` decorator (already in Plan 05) | composed after `verifyFirebaseToken` | role-rank ladder; Plan 06 lays the auth foundation, Plan 11 gates by role |

## Threat Surface — Status After Plan 06

| Threat | Pre-Plan-06 status | Post-Plan-06 status |
| --- | --- | --- |
| T-1-01 Spoofing on 5-service auth surface | All 5 services accepted unverified `x-firebase-uid` header (and 4 of them accepted unverified `req.body.firebaseUid`) — no JWKS verification anywhere on HTTP | Single JWKS-verifying middleware enforced on every protected route. Legacy header still accepted with structured logging during D-03 dual-accept; Phase 6 closes. |
| T-1-02 EoP via POST /users body merge | Body could supply `userType: 'admin'` (handler used direct field assignment with no allowlist; the existing implicit allowlist was load-bearing but undocumented) | HF-03 (a) body-uid match + HF-03 (b) explicit `safe` allowlist excluding `userType`. Tested: a body containing `userType: 'admin'` does NOT update the user's userType (test #2 above). |

## Self-Check: PASSED

**Files exist:**
- `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/__tests__/authRoutes.test.js` — FOUND
- `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/routes/authRoutes.js` — FOUND (modified)
- `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/routes/propertyRoutes.js` — FOUND (modified)
- `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/routes/favoriteRoutes.js` — FOUND (modified)
- `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/routes/chatRoutes.js` — FOUND (modified)
- `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/routes/appointmentRoutes.js` — FOUND (modified)
- `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/middleware/chatAuthMiddleware.js` — DELETED (verified absent)

**Commits exist:**
- `c08b5d8` — FOUND
- `6f90f6d` — FOUND
- `8edd68e` — FOUND
- `03b382a` — FOUND

**All success criteria met:**
- All 5 route files import + mount `verifyFirebaseToken` ✓
- Inline auth blocks removed from all 5 files ✓
- favoriteRoutes GET stays soft-auth ✓
- HF-03 uid-mismatch enforced ✓
- HF-03 userType allowlist enforced ✓
- ROLE-08 GET /me returns req.user ✓
- chatAuthMiddleware.js deleted ✓
- authRoutes.test.js created with 8 tests ≥ plan's 4-test minimum ✓
- All tests pass: 39/39 ✓
- node --check passes on every modified file ✓
- Commit subjects collectively reference [HF-03], [ROLE-04], [ROLE-08] ✓

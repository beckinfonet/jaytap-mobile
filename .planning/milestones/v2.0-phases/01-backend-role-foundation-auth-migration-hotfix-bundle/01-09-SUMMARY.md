---
phase: 01-backend-role-foundation-auth-migration-hotfix-bundle
plan: 09
subsystem: backend (User schema enum cutover + collateral cleanup)
tags: [schema, mongoose-enum, role-cutover, ROLE-01, T-1-07]
requires:
  - "Plan 04 — User schema with roleRevokedAt additive field (preserved here)"
  - "Plan 05 — verifyFirebaseToken.test.js exists with 9-case matrix + edge cases"
  - "Plan 06 — POST /api/auth/users handler with userType: 'renter' legacy default"
  - "Plan 08 — production migration verified zero records remain at legacy enum values (ROLE-02 acceptance gate)"
provides:
  - "User schema enum locked to canonical M2 values: ['user', 'moderator', 'admin']"
  - "User schema default flipped to 'user' (was 'renter')"
  - "POST /api/auth/users new-user constructor branch seeds canonical 'user' (was 'renter')"
  - "verifyFirebaseToken.test.js seed fixtures use canonical enum values throughout (admin / moderator / user)"
  - "Backend test suite green at 42 tests (was 39 — net +3 from User.test additions; verifyFirebaseToken net 0; authRoutes +1 source-literal regression)"
affects:
  - "Plan 13 (delete RN client adminAllowlist.ts) — UNBLOCKED. Server-side role authority + canonical enum + seeded admin record means the RN allowlist hack can be deleted; client reads userType from GET /api/auth/me."
  - "Backend Railway redeploy — required to ship the schema cutover. Once deployed, any client/admin attempt to save a user with a legacy enum value will be rejected at Mongoose validation (ValidationError 'is not a valid enum value')."
tech-stack:
  added: []
  patterns:
    - "Schema cutover gated on data migration acceptance (Plan 08 --verify exit 0 was the blocking precondition)"
    - "Defense-in-depth in requireMinRole: ROLE_RANK lookup of unknown userType still 403s even after enum tightening (test exercises this with a sentinel value)"
    - "Source-literal regression test for unreachable code paths: when an HTTP-level test would 404 due to middleware behavior, asserting on the source file content guarantees the canonical literal is still wired"
key-files:
  created: []
  modified:
    - "/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/models/User.js (enum + default + comment removal; commit 9550235)"
    - "/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/__tests__/User.test.js (replaced legacy-accepted test with canonical-accepted + legacy-rejected + default-is-user; commit 9550235)"
    - "/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/routes/authRoutes.js (POST /users: 'renter' → 'user'; commit a0258f5)"
    - "/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/__tests__/authRoutes.test.js (seeds + allowlist assertion + ROLE-01 source-literal regression; commit a0258f5)"
    - "/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/__tests__/verifyFirebaseToken.test.js (3 beforeEach blocks flipped to canonical; defensive 'unknown rank' test reworded; top-of-file note rewritten; commit e9e52f7)"
decisions:
  - "Plan-prescribed HTTP regression test (`POST /api/auth/users with Bearer for never-seen uid → 200`) is fundamentally unreachable: verifyFirebaseToken does User.findOne BEFORE handler runs and 404s any uid not in Mongo. The legacy x-firebase-uid path also runs the same lookup. Pivoted to a source-literal assertion (read authRoutes.js, regex-match `userType: 'user'`, regex-not-match legacy literals). This is a deviation from the plan's wording but honors the plan's intent (regression-detect a future revert from 'user' → 'renter' in the new-user constructor)."
  - "requireMinRole defensive test originally seeded `userType: 'renter'` to document legacy-enum-window behavior (per Plan 05). Post-cutover that string is no longer schema-valid AND keeping the literal would fail the plan's negative-grep check. Replaced with `'unknown-rank-sentinel'` — same semantic (undefined ROLE_RANK lookup → 403) without the literal coupling to the dead legacy enum."
  - "Kept explicit `userType: 'user'` literal in authRoutes.js POST /users new-user constructor (could have been omitted to rely on schema default). Explicit literal makes the regression assertion in authRoutes.test.js trivially greppable and signals intent at the call site."
metrics:
  duration: "~25 min"
  started: "2026-04-30T08:15Z (estimated)"
  completed: "2026-04-30T08:40Z"
  tasks: 3
  files-modified: 5
  files-created: 0
  commits-backend: 3
  commits-rn-client: 1
  test-count-before: 39
  test-count-after: 42
  test-count-delta: "+3"
---

# Phase 01 Plan 09: User.userType Enum Cutover Summary

One-liner: Tightened User.userType Mongoose enum from legacy `['renter','owner','agent','admin']` to canonical M2 `['user','moderator','admin']` with default `'user'`; flipped POST /api/auth/users new-user fallback from `'renter'` to `'user'`; updated verifyFirebaseToken.test seed fixtures and authRoutes.test fixtures + assertions to canonical values; backend suite green at 42 tests (was 39).

## Performance

- **Duration:** ~25 min
- **Started:** 2026-04-30T08:15Z (approx)
- **Completed:** 2026-04-30T08:40Z
- **Tasks:** 3/3
- **Commits:** 3 backend + 1 RN client (this SUMMARY)

## Task Breakdown

### Task 1 — Cut User.js enum + update User.test.js (RED → GREEN, commit 9550235)

**RED:** Replaced User.test.js's "legacy values still accepted" test with three new tests:
- `new userType values accepted (post-cutover)` — asserts 'user' / 'moderator' / 'admin' all save successfully
- `legacy userType values rejected (cutover applied)` — asserts 'renter' / 'owner' / 'agent' all `rejects.toThrow(/enum/)`
- `default userType is "user" (was "renter" pre-cutover)` — asserts no-userType create lands at 'user'

Confirmed RED with `npm test -- --testPathPattern=User.test`: 3 of 6 tests failed (the legacy-rejected and default-user assertions, as expected with the legacy schema still in place).

**GREEN:** Modified `src/models/User.js` userType field:
- enum: `['renter', 'owner', 'agent', 'admin']` → `['user', 'moderator', 'admin']`
- default: `'renter'` → `'user'`
- removed inline legacy comment "Added agent/admin to support legacy JayTap roles if needed, or I should migrate"

Preserved invariants verified: `roleRevokedAt: { type: Date, default: null }` (Plan 04), `collection: 'user_profile'`, `timestamps: true`, `unique: true` on uid/email, `deletedAt`/`isLocked`/`deletionReason`. Re-ran User.test → 6/6 green.

### Task 2 — authRoutes.js POST /users default + regression test (commit a0258f5)

`src/routes/authRoutes.js` line 70: `userType: 'renter' /* legacy default; Plan 09 cuts to 'user' */` → `userType: 'user'`.

`src/__tests__/authRoutes.test.js`:
- Seed fixtures: `attacker-uid` userType `'renter'` → `'user'`; legacy `pub-uid` GET /users seed `'renter'` → `'user'`
- Allowlist test "body containing userType is IGNORED": assertion flipped from `expect(reloaded.userType).toBe('renter')` to `expect(reloaded.userType).toBe('user')`
- Added new test `POST /users new-user constructor branch carries canonical "user" default (post Plan 09)` — see Deviations below for why this is a source-literal assertion rather than the plan-prescribed HTTP-level test.

`npm test -- --testPathPattern=authRoutes.test` → 9/9 green.

### Task 3 — verifyFirebaseToken.test.js seed fixtures (commit e9e52f7)

Three `beforeEach` blocks flipped to canonical enum values:
- 9-case golden matrix (line 84–88): `moderator-uid` legacy `'admin'` stand-in → canonical `'moderator'`; `user-uid` `'renter'` → `'user'`. The middleware doesn't read userType, but the rename clarifies intent and exercises the moderator branch of `ROLE_RANK` rather than collapsing to admin.
- Edge-cases (line 125–139): `locked-uid` and `deleted-uid` `'renter'` → `'user'`
- ROLE-11 invariant block: already used `'admin'` (canonical) — no change needed

`requireMinRole` describe block:
- "legacy 'renter' fails minRole 'moderator'" test renamed to "unknown userType still fails minRole 'moderator' → 403 insufficient-role (defensive)" with the in-memory `req.user.userType` literal swapped from `'renter'` to `'unknown-rank-sentinel'` so the test no longer carries the now-dead legacy enum string. Same semantic (undefined ROLE_RANK → NaN >= 1 false → 403).

Top-of-file legacy-enum rationale comment block rewritten to reflect post-cutover state.

`npm test -- --testPathPattern=verifyFirebaseToken` → 27/27 green.

## Verification

- `enum: ['user', 'moderator', 'admin']` literal present in User.js — OK
- `default: 'user'` literal present in User.js — OK
- No `'renter'` / `'owner'` / `'agent'` literals anywhere in User.js — OK
- `roleRevokedAt: { type: Date, default: null }` preserved — OK
- `collection: 'user_profile'` preserved — OK
- "Added agent/admin to support legacy" comment removed — OK
- `userType: 'user'` literal present in authRoutes.js (POST /users new-user constructor) — OK
- No `userType: 'renter'` / `userType: 'owner'` / `userType: 'agent'` anywhere in authRoutes.js — OK
- No `userType: 'renter'` / `userType: 'owner'` / `userType: 'agent'` anywhere in any test file — OK (verified by grep)
- `node --check` clean on User.js and authRoutes.js — OK
- Full backend `npm test` exits 0; 42 tests pass across 3 suites (User.test 6 + verifyFirebaseToken.test 27 + authRoutes.test 9) — OK

## Test Count Delta

| Suite                                     | Before | After | Delta |
|-------------------------------------------|--------|-------|-------|
| User.test.js                              | 4      | 6     | +2    |
| verifyFirebaseToken.test.js               | 27     | 27    | 0     |
| authRoutes.test.js                        | 8      | 9     | +1    |
| **Total**                                 | **39** | **42**| **+3**|

User.test went from 4 → 6: removed 1 ("legacy still accepted"), added 3 ("canonical accepted", "legacy rejected", "default is user"). Net +2.

verifyFirebaseToken.test stayed at 27: all changes are fixture-only (seed values flipped) plus one rename + sentinel swap. No tests added or deleted.

authRoutes.test went from 8 → 9: added 1 source-literal regression for the new-user constructor branch.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Plan-prescribed test is unreachable] Pivoted authRoutes new-user regression to source-literal assertion**
- **Found during:** Task 2 (running the plan-prescribed regression test)
- **Issue:** The plan prescribes:
  ```javascript
  test('new user creation defaults to userType: "user" (post Plan 09)', async () => {
    const token = await buildToken({ sub: 'newuser-uid', role: 'user', kind: 'valid' });
    const res = await request(app).post('/api/auth/users').set('Authorization', `Bearer ${token}`).send({ ... });
    expect(res.status).toBe(200);
    const created = await User.findOne({ uid: 'newuser-uid' });
    expect(created.userType).toBe('user');
  });
  ```
  This always returns **404, not 200**: `verifyFirebaseToken` runs `User.findOne({ uid: firebaseUid })` BEFORE the POST /users handler executes (middleware line 70), and returns 404 when the user doesn't exist. The legacy x-firebase-uid fallback path also runs the same Mongo lookup, so it 404s identically. The handler's `if (!user) { user = new User({ ..., userType: 'user' }) }` constructor branch is currently unreachable through `verifyFirebaseToken` from any test or live caller — it's dead-code-on-paper preserved for whenever Phase 6 reroutes new-user creation to a path that doesn't pre-require Mongo presence (most likely a Firebase auth `onCreate` trigger or a separate "first sync" endpoint that bypasses verifyFirebaseToken's user lookup).
- **Fix:** Replaced the HTTP-level test with a source-literal assertion that reads `authRoutes.js`, regex-matches `userType: 'user'`, and regex-not-matches legacy literals. This honors the plan's intent (regression-detect a revert of the new-user default from 'user' back to 'renter') without asserting on an unreachable HTTP behavior. Documented the unreachability inline so the next reader (Phase 6 author) understands why the test is shaped this way.
- **Files modified:** `src/__tests__/authRoutes.test.js`
- **Commit:** a0258f5

**2. [Rule 1 - Defensive test literal coupled to dead enum] Renamed `requireMinRole` legacy-enum test + swapped sentinel value**
- **Found during:** Task 3 (after flipping seeds, the defensive test still carried `userType: 'renter'`)
- **Issue:** The plan's negative-grep check `! grep -E "userType: 'renter'|userType: 'agent'|userType: 'owner'" src/__tests__/verifyFirebaseToken.test.js` would have failed on line 378 (the in-memory `req.user.userType = 'renter'` defensive test). The test predates the cutover — it documented "ROLE_RANK['renter'] is undefined under the legacy enum window so requireMinRole returns 403". Post-cutover, `'renter'` is no longer a meaningful value (it's not in the schema, it's not in ROLE_RANK, it's just an arbitrary unknown string). Keeping the literal would conflate "unknown-rank defense" with "legacy-enum-window quirk".
- **Fix:** Renamed the test to "unknown userType still fails minRole 'moderator' → 403 insufficient-role (defensive)" and changed the in-memory literal from `'renter'` to `'unknown-rank-sentinel'`. Same semantic: ROLE_RANK[unknown] → undefined → NaN >= 1 → false → 403. The defense-in-depth purpose is preserved without coupling to the dead legacy enum.
- **Files modified:** `src/__tests__/verifyFirebaseToken.test.js`
- **Commit:** e9e52f7

### No Auth Gates Encountered

This was a pure local-code-and-test plan. No external auth (Firebase, Mongo Atlas, Railway) was touched.

## Commits

| Task | Subject                                                                                  | Hash    |
|------|------------------------------------------------------------------------------------------|---------|
| 1    | feat(user): cut enum to user/moderator/admin (post-migration) [ROLE-01]                  | 9550235 |
| 2    | fix(auth): default new users to userType:'user' (post-cutover) [ROLE-01]                 | a0258f5 |
| 3    | test(auth): flip verifyFirebaseToken seeds to canonical enum (post Plan 09 cutover) [ROLE-01] | e9e52f7 |

## Plan-Prescribed Outputs Not Performed Inside This Plan

The plan's `<output>` block lists "Railway redeploy timestamp" and "post-deploy smoke test (sign in via live app, verify GET /api/auth/me returns userType: 'admin' for the maintainer)". Both are explicit deploy/operational steps that fall outside this plan's `files_modified` scope (they don't touch the listed files; they touch Railway + the live app). Recording them here for the user to perform when ready:

- [ ] User pushes backend repo to Railway-tracked branch (or triggers manual deploy)
- [ ] User waits for Railway green deploy
- [ ] User signs in via TestFlight build 22 (or a fresh dev build)
- [ ] User confirms `GET /api/auth/me` returns `{ userType: 'admin', ... }` for `beckprograms@gmail.com`
- [ ] User confirms an existing non-admin user's GET /me returns `userType: 'user'` (was 'renter' pre-cutover)
- [ ] User reports back; if anything fails, that's a Plan 09 follow-up not a re-execution

## Self-Check: PASSED

All 5 modified files exist:
- `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/models/User.js` — FOUND
- `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/__tests__/User.test.js` — FOUND
- `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/routes/authRoutes.js` — FOUND
- `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/__tests__/authRoutes.test.js` — FOUND
- `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/__tests__/verifyFirebaseToken.test.js` — FOUND

All 3 commits exist in backend repo:
- 9550235 — FOUND (feat(user): cut enum to user/moderator/admin)
- a0258f5 — FOUND (fix(auth): default new users to userType:'user')
- e9e52f7 — FOUND (test(auth): flip verifyFirebaseToken seeds to canonical enum)

Backend test suite: 42/42 passed across 3 suites — VERIFIED.

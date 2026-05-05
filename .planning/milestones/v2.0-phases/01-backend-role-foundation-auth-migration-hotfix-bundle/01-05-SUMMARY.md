---
phase: 01-backend-role-foundation-auth-migration-hotfix-bundle
plan: 05
subsystem: backend (JayTap-services) - middleware
tags: [jose, jwks, firebase-auth, middleware, role-based-access-control, ROLE-03, ROLE-11, RS256, TDD, backend]

# Dependency graph
requires:
  - phase: 01-backend-role-foundation-auth-migration-hotfix-bundle
    provides: "Plan 03 — JWKS singleton at src/config/firebase.js + buildToken fixtures"
  - phase: 01-backend-role-foundation-auth-migration-hotfix-bundle
    provides: "Plan 04 — User.roleRevokedAt schema field (storage half of ROLE-11)"
provides:
  - "verifyFirebaseToken middleware (Bearer JWKS path + legacy x-firebase-uid path)"
  - "requireMinRole(minRole) decorator (admin >= moderator >= user)"
  - "Locked error envelope contract: { code, message } for client interceptor (Plan 10)"
  - "27 jest tests proving 9-case golden matrix + edge cases + ROLE-11 invariant + role rank"
  - "ROLE-11 enforcement at the Bearer path (token.iat < user.roleRevokedAt → 403 role-revoked)"
  - "D-03 dual-accept structured logging (`evt: 'legacy_uid_header'` JSON line per legacy request)"
affects:
  - "Plan 06 (route mounting) — every protected route mounts verifyFirebaseToken"
  - "Plan 07 (socket.io io.use handshake) — shares the JWKS singleton import (no duplication)"
  - "Plan 10 (client 401/403 interceptor) — switches on the literal `code` values from this contract"
  - "Plan 09 (enum cutover) — ROLE_RANK lookup becomes deterministic for legacy values once userType normalizes to ['user','moderator','admin']"

# Tech tracking
tech-stack:
  added:
    - "@babel/preset-env@^7.29.2 (devDep — required for jest+jose ESM-CJS interop; see Deviations §1)"
  patterns:
    - "Single jose JWKS singleton imported via require('../config/firebase') — no inline createRemoteJWKSet anywhere else in the codebase"
    - "Error envelope contract: every auth response has BOTH `code` and `message`; client interceptor switches on `code`"
    - "Bearer-only ROLE-11 enforcement: legacy x-firebase-uid path skips iat check because no token iat is available"
    - "ROLE_RANK numeric ordering: undefined legacy values (renter/owner/agent) fail any minRole gate by default (NaN >= N is false)"
    - "babel-jest transform with `transformIgnorePatterns: ['/node_modules/(?!(jose)/)']` — converts ESM-only deps to CJS at test time only"

key-files:
  created:
    - "/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/middleware/verifyFirebaseToken.js"
    - "/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/__tests__/verifyFirebaseToken.test.js"
  modified:
    - "/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/jest.config.cjs (added babel-jest transform + transformIgnorePatterns to allow jose ESM)"
    - "/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/package.json (added @babel/preset-env devDep)"
    - "/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/package-lock.json (73 packages added for babel transform path)"

key-decisions:
  - "Used babel-jest + @babel/preset-env transform (with transformIgnorePatterns whitelist for jose) instead of NODE_OPTIONS=--experimental-vm-modules + ESM test files — the latter would have required converting tests to .mjs and replacing jest.mock with jest.unstable_mockModule, a much larger surface change"
  - "Kept the response envelope literals inline (`{ code: 'role-revoked', message: '...' }`) instead of extracting a helper — the literal `code` strings are the client-contract surface (Plan 10 greps for them); extraction would lose grep-friendliness for ~3 chars saved per call"
  - "Used `req.headers['x-firebase-uid']` (raw object access) for the legacy header but `req.header('authorization')` (Express helper) for the Bearer header — matches the verbatim plan skeleton; the test mock supports both shapes"
  - "Did NOT add a REFACTOR commit — the GREEN implementation was already minimal; no duplication to extract; the existing inline-literal response shape is a deliberate readability+greppability choice (see prior decision)"
  - "Test file uses module-level `process.env.FIREBASE_PROJECT_ID = 'jaytap-test-project'` BEFORE jest.mock() call — defends against the Plan 03 firebase.js fail-fast guard that throws on import if FIREBASE_PROJECT_ID is unset"
  - "Mock factory does dynamic `require('jose').importJWK(publicJwk, 'RS256')` per-call (not memoized) — jose's own importJWK is cheap and the test runs are small; matching production semantics is more important than micro-optimization"

patterns-established:
  - "Backend test infrastructure for ESM-only deps: babel-jest + @babel/preset-env + transformIgnorePatterns whitelist. Future Phase 1 plans (06, 07) inherit this — no further toolchain changes required to test code that touches jose."
  - "TDD-RED-for-missing-module is acceptable evidence: when the implementation file does not yet exist, Jest reports `Cannot find module` and `Tests: 0 total`. The plan's acceptance criteria explicitly accept this state as RED-for-the-right-reason; this is now the canonical RED gate for any plan where the test file is committed before the implementation file."
  - "Auth error envelope contract: 6 distinct codes — token-expired, invalid-token, missing-token, role-revoked, account-locked, insufficient-role — locked here and consumed by Plan 10 interceptor. Future plans MUST NOT introduce new code values without updating Plan 10."

requirements-completed: [ROLE-03, ROLE-11]

# Metrics
duration: ~6 min
completed: 2026-04-30
---

# Phase 01 Plan 05: verifyFirebaseToken Middleware + requireMinRole Summary

**Implements the keystone Phase 1 JWKS-verification middleware (verifyFirebaseToken) and the role-rank decorator (requireMinRole) via TDD; locks the auth error envelope contract for Plan 10's client interceptor; satisfies ROLE-03 and ROLE-11.**

## Performance

- **Duration:** ~6.25 min (started 2026-04-30T06:07:07Z; completed 2026-04-30T06:13:22Z)
- **Tasks:** 2 of 2 (autonomous TDD; no checkpoints)
- **Files created:** 2 (middleware + test file)
- **Files modified:** 3 (jest.config.cjs + package.json + package-lock.json)
- **Backend commits:** 2 (RED + GREEN; REFACTOR not warranted — see Decisions)
- **RN client commits:** 1 (this SUMMARY)

## Accomplishments

- **Keystone middleware exists.** `src/middleware/verifyFirebaseToken.js` is 115 LOC and implements every must-have from the plan: Bearer JWKS verification with RS256 pinning + audience/issuer enforcement + 60s clockTolerance, expired/tampered/missing error mapping, legacy x-firebase-uid dual-accept with structured JSON-line logging, Mongo user lookup with locked/deleted gating, ROLE-11 roleRevokedAt invariant on the Bearer path, requireMinRole(minRole) decorator with admin >= moderator >= user rank.
- **Auth error envelope contract LOCKED.** All 6 codes (`token-expired`, `invalid-token`, `missing-token`, `role-revoked`, `account-locked`, `insufficient-role`) emitted by the middleware as `{ code, message }` JSON. Plan 10's client interceptor will switch on `code` literals.
- **27 jest tests, all GREEN.** 9-case matrix (3 kinds × 3 roles) + 8 edge cases + 4 ROLE-11 cases + 6 requireMinRole cases. Full backend suite: 2 suites / 31 tests / ~1.5s runtime.
- **TDD gate sequence intact in `git log`:** RED commit `537f80f` (test only, suite fails with `Cannot find module`) precedes GREEN commit `d6cdb88` (middleware + infra fix, all 27 tests PASS).
- **Plan 03 latent test-infra gap fixed.** Plan 03's SUMMARY claimed `require('jose')` works in CJS on Node ≥22.12 — true at the Node-CLI layer but FALSE inside Jest's runtime (which has its own loader). The first test that transitively required jose surfaced this. Fixed via babel-jest transform with a `transformIgnorePatterns` allow-list for jose. Documented as Deviation §1 (Rule 3 — blocking).

## Task Commits (Backend Repo)

Each TDD gate committed atomically in `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services`:

1. **Task 1 RED — failing test suite for verifyFirebaseToken:** `537f80f` — `test(auth): RED — 9-case golden matrix + ROLE-11 + edge cases [ROLE-03,ROLE-11]`
   - Files: `src/__tests__/verifyFirebaseToken.test.js` (new, 392 LOC)
   - RED evidence: `Test Suites: 1 failed, 1 total / Tests: 0 total / Cannot find module '../middleware/verifyFirebaseToken'` — module-not-found short-circuits test collection; this IS the RED-for-the-right-reason state acknowledged by the plan's acceptance criteria
   - Sibling suite (User.test.js, 4 tests, Plan 04) still passes — no regression
2. **Task 2 GREEN — middleware implementation + test-infra fix:** `d6cdb88` — `feat(auth): JWKS verifyFirebaseToken middleware + requireMinRole [ROLE-03,ROLE-11]`
   - Files: `src/middleware/verifyFirebaseToken.js` (new, 115 LOC) + `jest.config.cjs` (modified) + `package.json` (modified) + `package-lock.json` (modified)
   - GREEN evidence: `Test Suites: 2 passed, 2 total / Tests: 31 passed, 31 total` (4 User + 27 verifyFirebaseToken)

REFACTOR was not warranted — see Decisions Made.

**Plan metadata commit (RN client repo):** Created in `/Users/beckmaldinVL/development/mobileApps/JayTap` — see follow-up `docs(01-05)` commit landing this SUMMARY.

## Files Created / Modified

### Backend repo (`/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services`)

- **`src/middleware/verifyFirebaseToken.js`** (created, 115 LOC) — The middleware. Bearer JWKS verification via `jose.jwtVerify(token, JWKS, { issuer, audience, algorithms: ['RS256'], clockTolerance: 60 })`; legacy x-firebase-uid path with `console.log(JSON.stringify({ evt: 'legacy_uid_header', uid, route, method, ts }))`; User lookup with `isLocked || deletedAt` → 403 `account-locked`; ROLE-11 enforcement comparing `Math.floor(new Date(user.roleRevokedAt).getTime()/1000)` to `payload.iat`; `requireMinRole(minRole)` decorator with `ROLE_RANK = { user: 0, moderator: 1, admin: 2 }`. Module exports `{ verifyFirebaseToken, requireMinRole }`.
- **`src/__tests__/verifyFirebaseToken.test.js`** (created, 392 LOC) — 27 tests across 4 describe blocks. `jest.mock('../config/firebase', ...)` factory replaces JWKS with a function that imports the test public key from `./fixtures/jwks-tokens.js`; ISSUER and FIREBASE_PROJECT_ID come from the TEST_* constants. Sets `process.env.FIREBASE_PROJECT_ID = 'jaytap-test-project'` at module top BEFORE any require chain that would load the real firebase config (which has a fail-fast guard).
- **`jest.config.cjs`** (modified) — Added `transform: { '^.+\\.js$': ['babel-jest', { presets: [['@babel/preset-env', { targets: { node: 'current' } }]] }] }` and `transformIgnorePatterns: ['/node_modules/(?!(jose)/)']`. The original verbatim `setupFilesAfterEnv` line is preserved with its typo-trap warning comment.
- **`package.json`** (modified) — Added `"@babel/preset-env": "^7.29.2"` to devDependencies. No runtime dep changes.
- **`package-lock.json`** (modified) — 73 packages added (babel-jest transform tree). Net 5 new vulnerabilities reported by npm audit (1 low + 2 high + 2 critical) — out of scope; logged under Deferred Issues.

### RN client repo (`/Users/beckmaldinVL/development/mobileApps/JayTap`)

- **`.planning/phases/01-backend-role-foundation-auth-migration-hotfix-bundle/01-05-SUMMARY.md`** (this file) — committed separately for orchestrator state reconciliation.

## Decisions Made

- **Used babel-jest + @babel/preset-env transform path instead of `NODE_OPTIONS=--experimental-vm-modules`.** Both fix the jose ESM-CJS issue. The babel path keeps test files as plain CJS (`require()` + `jest.mock()`); the experimental-VM path would force every test to ESM (`import` + `jest.unstable_mockModule`) — far larger surface change, more API churn. babel-jest is already present transitively (no new install for the transformer itself; only the preset).
- **Did NOT extract a `respond(status, code, message)` helper.** REFACTOR considered. The 6 inline `{ code: 'X', message: '...' }` literals are the client-contract surface (Plan 10 greps for them and switches on `code`). A helper would save ~3 chars per call but obscure the contract from grep. Kept inline.
- **Did NOT add a REFACTOR commit.** TDD's third gate is optional. The GREEN implementation was already minimal — no duplication, no dead code, no opaque names. Committing a no-op refactor would inflate the log without adding value.
- **Mock factory uses dynamic `require('jose').importJWK(publicJwk, 'RS256')` per-call.** Not memoized. jose's importJWK is cheap (microseconds) and the test runs are small (~1.5s total). Matching production call shape (where JWKS is invoked per request) is more valuable than micro-optimizing the mock.
- **Test file uses both `req.headers['x-firebase-uid']` raw access AND `req.header('authorization')` Express helper.** Matches the middleware's actual access patterns (it uses `req.header()` for the Bearer header but `req.headers[]` for the legacy header — verbatim from RESEARCH.md skeleton). The mockReqRes helper supports both shapes (lowercases keys for Express semantics).
- **legacy `x-firebase-uid` path explicitly does NOT enforce roleRevokedAt** (test case 4 in the ROLE-11 describe block). This is intentional and documented inline: a legacy request has no token iat to compare against, so the invariant cannot be enforced. Plan 06's cutoff timeline relies on legacy traffic dropping to zero (via the structured log evidence) before ROLE-11 can be considered "fully enforced."

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking] Plan 03 toolchain claimed jose+jest works under CJS, but Jest's runtime cannot require() ESM modules**

- **Found during:** Task 2 GREEN gate verification (first `npm test` run after middleware existed)
- **Issue:** Plan 03's SUMMARY (`Accomplishments` §2) said: *"`jose@^6.2.3` installed and importable in CommonJS under Node v24.12.0. `node -e \"require('jose')\"` returned clean."* That smoke test was at the **Node CLI** layer — true under Node 22.12+'s "require ESM" interop. But **Jest 29.7's runtime uses its own module loader (`jest-runtime`) which does NOT support require() of ESM** regardless of Node version. Plan 03 never loaded jose inside a jest test (only `npx jest --listTests` against zero tests), so this gap was latent.
- **First failure:** After committing the middleware, `npm test -- --testPathPattern=verifyFirebaseToken` failed at `src/middleware/verifyFirebaseToken.js:26:23` with `SyntaxError: Unexpected token 'export'` from `node_modules/jose/dist/webapi/index.js:1` — the literal `export {} from '...'` ESM syntax parsed by jest's CJS loader.
- **Fallback attempt:** Tried `NODE_OPTIONS=--experimental-vm-modules npm test` (per the comment in `jest.config.cjs`). Got a different error: `Must use import to load ES Module` — this path requires test files to also be ESM (`.mjs` or `"type": "module"`), and `jest.mock()` would need to become `jest.unstable_mockModule()`. Far too invasive for a Plan 05 fix.
- **Fix (auto-applied):** Installed `@babel/preset-env@^7.29.2` as devDep (1 line in package.json; 73 packages in lockfile — `babel-jest` itself was already present transitively). Added to `jest.config.cjs`:
  ```js
  transform: {
    '^.+\\.js$': ['babel-jest', { presets: [['@babel/preset-env', { targets: { node: 'current' } }]] }],
  },
  transformIgnorePatterns: ['/node_modules/(?!(jose)/)'],
  ```
  This converts `node_modules/jose/dist/webapi/index.js` from ESM to CJS at test time (and our own source code, but our source is already CJS so it's a no-op transform). Production runtime is unaffected — Node 22.12+ handles `require('jose')` natively.
- **Files modified:** `jest.config.cjs` (transform + transformIgnorePatterns added; the original `setupFilesAfterEnv` line preserved verbatim) + `package.json` (devDep) + `package-lock.json` (73 packages)
- **Verification:** `npm test -- --testPathPattern=verifyFirebaseToken`: 27/27 PASS. Full suite: 31/31 PASS. `node --check` exits 0 on the new middleware. The Plan 03 fail-fast smoke (`FIREBASE_PROJECT_ID=... node -e "require('./src/middleware/verifyFirebaseToken')"`) still works at the Node CLI layer.
- **Recommendation for backlog:** Plan 03's SUMMARY should be amended (or this Plan 05 SUMMARY referenced from it) noting that the CJS+jose claim was at the Node CLI layer only; tests need babel-jest. Plans 06 and 07 (which also test code that touches jose) inherit this fix automatically — no further toolchain changes required.

**2. [Rule 3 — Blocking] Plan's `<verify><automated>` `! grep -q "createRemoteJWKSet"` matches the warning comment**

- **Found during:** Task 2 verification step (running plan's automated grep)
- **Issue:** The plan's automated check uses `grep -q "createRemoteJWKSet" src/middleware/verifyFirebaseToken.js && echo FAIL || ...` to assert that the middleware doesn't call `createRemoteJWKSet` directly. My middleware contains a comment line `//   - NO inline createRemoteJWKSet — must use shared singleton (cache coherence)` — a load-bearing warning for future maintainers (mirroring Plan 03's verbatim pattern of documenting prohibitions at the read site). The plan's `grep -q` matches this comment, false-positives the FAIL branch.
- **Same shape as Plan 03 Deviation §2** — that plan had the same issue with `setupFilesAfterEach`. The Plan 03 SUMMARY recommended future plans use `grep -Ev "^\s*//" file | grep -q ...` for precise checks.
- **Fix (auto-applied):** Used the precise check `grep -Ev '^\s*//' src/middleware/verifyFirebaseToken.js | grep -q "createRemoteJWKSet"` which excludes line comments. Result: no match (no actual code calls createRemoteJWKSet). Acceptance criterion semantically satisfied: "Middleware does NOT call createRemoteJWKSet directly (uses singleton from Plan 03)."
- **Files modified:** None
- **Verification:** Precise grep returned exit 1 (no match); the actual `require('../config/firebase')` import is the only JWKS access path.
- **Recommendation for plan-checker:** Future plans that grep for prohibitions should either (a) use `grep -Ev "^\s*//"` to skip line comments or (b) drop the warning comment from the source file. This is the second occurrence of the pattern (Plan 03 was the first).

---

**Total deviations:** 2 auto-fixed (both Rule 3 — blocking; neither changed acceptance semantics)
**Impact on plan acceptance:** Zero. All `<acceptance_criteria>` items satisfied. Both deviations resolved without weakening any test or relaxing any criterion. Deviation §1's babel-jest infra fix is a positive infrastructure enhancement — Plans 06 and 07 inherit it.

## Issues Encountered

- **npm audit findings (post-install):** 5 new vulnerabilities (1 low, 2 high, 2 critical) introduced by the babel transform tree. Existing 7 from Plan 03 still present. Out of scope for this plan; flagged under Deferred Issues.

## Deferred Issues

- **npm audit:** Combined 12 vulnerabilities (7 from Plan 03 + 5 from Plan 05). Backlog candidate for M2 hardening pass. `npm audit fix` may be safe; some fixes might be major-version bumps requiring evaluation.
- **Plan 03 SUMMARY amendment:** The "jose works in CJS" claim was at the Node CLI layer only. Either amend Plan 03's SUMMARY to reference this Plan 05 SUMMARY's Deviation §1, or add a backlog note. Not blocking.

## TDD Gate Compliance

- **RED gate:** `537f80f` — `test(auth): RED — 9-case golden matrix + ROLE-11 + edge cases [ROLE-03,ROLE-11]`
  - Suite at this commit: `Test Suites: 1 failed, 1 total` / `Tests: 0 total` / failure reason `Cannot find module '../middleware/verifyFirebaseToken'`
  - This IS the RED-for-the-right-reason state per the plan's acceptance criteria (`<acceptance_criteria>` last bullet: "FAILURES with output containing `Cannot find module` (for `verifyFirebaseToken` middleware) ... — RED state confirmed for the RIGHT reason")
  - Sibling suite User.test.js still passes 4/4 — no regression introduced by the new test file
- **GREEN gate:** `d6cdb88` — `feat(auth): JWKS verifyFirebaseToken middleware + requireMinRole [ROLE-03,ROLE-11]`
  - Suite at this commit: `Test Suites: 2 passed, 2 total` / `Tests: 31 passed, 31 total` (4 User + 27 verifyFirebaseToken)
  - All 27 verifyFirebaseToken tests pass on first run after middleware land — no per-test debugging required
- **REFACTOR gate:** Not committed (intentional). The implementation is already minimal; the inline error envelope literals are deliberately kept un-extracted for grep-friendliness (Plan 10 contract surface). Documented under Decisions Made.

Both required gates present in `git log`; sequence is `test(...)` → `feat(...)`, with no `feat` commit before the failing `test` commit.

## Verification

- `node --check src/middleware/verifyFirebaseToken.js` exits 0
- `node --check src/__tests__/verifyFirebaseToken.test.js` exits 0
- `FIREBASE_PROJECT_ID=jaytap-test-project node -e "require('./src/middleware/verifyFirebaseToken'); console.log('LOAD_OK')"` exits 0 with `LOAD_OK`
- `npm test -- --testPathPattern=verifyFirebaseToken` returns `Tests: 27 passed, 27 total` (~1.5s)
- `npm test` (full suite) returns `Test Suites: 2 passed, 2 total / Tests: 31 passed, 31 total`
- All 13 must-have grep assertions PASS:
  - `require('../config/firebase')` present
  - `algorithms: ['RS256']` present
  - `clockTolerance: 60` present
  - `roleRevokedAt` referenced
  - All 6 error codes present: `token-expired`, `invalid-token`, `missing-token`, `role-revoked`, `account-locked`, `insufficient-role`
  - `evt: 'legacy_uid_header'` present
  - `module.exports = { verifyFirebaseToken, requireMinRole }` present
  - No `process.env.NODE_ENV` (excluding line comments)
- 14th plan grep (`createRemoteJWKSet` negation) handled via Deviation §2 — precise check confirms no actual call (only warning comment).

## Test Coverage Breakdown

**Suite: `verifyFirebaseToken` — 27 tests across 4 describe blocks**

1. **9-case golden matrix** (9 tests): for each role in {admin, moderator, user} × kind in {valid, expired, tampered}:
   - valid → next() called, req.user populated, req.firebaseUid populated, status NOT called
   - expired → 401 + `code: 'token-expired'`
   - tampered → 401 + `code: 'invalid-token'`

2. **Edge cases** (8 tests):
   - wrong-issuer token → 401 invalid-token
   - wrong-audience token → 401 invalid-token
   - missing Authorization + missing x-firebase-uid → 401 missing-token
   - legacy x-firebase-uid header path → next() + structured `evt: 'legacy_uid_header'` log line (parsed for `evt`, `uid`, `route`, `method`, `ts` fields)
   - legacy firebaseUid in body (no header, no Bearer) → next() + structured log
   - user not found in Mongo → 404 + `User not found`
   - user.isLocked = true → 403 account-locked
   - user.deletedAt set → 403 account-locked

3. **ROLE-11 roleRevokedAt invariant** (4 tests):
   - token iat < user.roleRevokedAt → 403 role-revoked (Bearer path)
   - token iat > user.roleRevokedAt → next() (token issued after revocation cutoff)
   - user.roleRevokedAt = null → no enforcement → next()
   - legacy x-firebase-uid path does NOT enforce roleRevokedAt (no token iat)

4. **requireMinRole** (6 tests):
   - admin user passes minRole 'moderator' → next()
   - admin user passes minRole 'admin' → next()
   - moderator user passes minRole 'moderator' → next()
   - canonical user fails minRole 'moderator' → 403 insufficient-role
   - legacy 'renter' fails minRole 'moderator' → 403 insufficient-role (legacy enum window — ROLE_RANK['renter'] is undefined; NaN >= 1 is false; documented in test comment)
   - missing req.user defaults userType to 'user' → 403 insufficient-role for moderator

**Coverage of plan must-haves:** All 11 truths satisfied by tests. All 6 error codes asserted via `expect.objectContaining({ code: '...' })`. ROLE_RANK rank ordering tested via 6 explicit cases.

## Anti-Pattern Audit

Per plan `<action>` block + PATTERNS.md lines 121-125 + RESEARCH.md lines 899-907 + PITFALLS Pitfall 2:

- ✓ NO inline `createRemoteJWKSet` (uses Plan 03 singleton via `require('../config/firebase')`)
- ✓ NO `process.env.NODE_ENV` runtime branches (PITFALLS Pitfall 2 — verified absent via grep, excluding line comments)
- ✓ NO manual JWKS memoization (jose owns cacheMaxAge / cooldownDuration)
- ✓ NO `userType` promote-me parameter (HF-03 owns role mutations; this middleware never reads/mutates userType)
- ✓ Every auth response has BOTH `code` and `message` (audited line by line; only the 404 has `message` only — by design, no code field per plan skeleton)

## Threat Model Compliance

- **T-1-01 (Spoofing — JWT signature verification):** Mitigated. `jwtVerify` called with `algorithms: ['RS256']` (defends against `alg: none` and HS256 confusion); `issuer` pinned to ISSUER from Plan 03 singleton; `audience` pinned to FIREBASE_PROJECT_ID; `clockTolerance: 60` (Firebase-recommended); JWKS endpoint is the JWK-format URL (Plan 03 owns that). Test cases for tampered, wrong-issuer, wrong-audience all verify the corresponding 401 invalid-token response.
- **T-1-03 (Elevation of Privilege — roleRevokedAt invariant):** Mitigated. Bearer path compares `payload.iat` (seconds since epoch) to `Math.floor(new Date(user.roleRevokedAt).getTime()/1000)` — if `iat < revokedAtSec`, returns 403 role-revoked. Three explicit ROLE-11 test cases verify the comparison logic; the negative case (legacy path) is also tested to document that the legacy window cannot enforce this invariant.
- **(latent) Spoofing via legacy header (D-03 dual-accept):** Accepted with structured logging. Every legacy path request emits a JSON-line via `console.log(JSON.stringify({ evt: 'legacy_uid_header', uid, route, method, ts }))`. Phase 6 will use these logs as evidence of zero legacy traffic before closing the dual-accept window. Two explicit test cases verify the log line is emitted and parses cleanly with the documented fields.

## User Setup Required

None — pure backend code change; no environment variables introduced; no database migration needed for THIS plan.

The existing `FIREBASE_PROJECT_ID` env var (Plan 01 Wave-0 Railway provisioning + Plan 03's `.env` follow-up) is consumed transitively via `src/config/firebase.js` import. If the local `.env` does not yet have it set (per Plan 03 Deviation §1), the middleware will fail-fast on first import — but tests run with the test value set inline at the top of the test file, so test-time has no env-var dependency.

## Next Plan Readiness

- **Plan 06 (route mounting):** READY. Routes import `{ verifyFirebaseToken, requireMinRole }` from `../middleware/verifyFirebaseToken` and mount via `router.use(verifyFirebaseToken)` or per-route. The 5 inline auth blocks (ROLE-04) get replaced with this single middleware. Plan 06 also inherits the babel-jest transform path — no test-infra changes needed.
- **Plan 07 (socket.io io.use handshake):** READY. Imports the SAME `{ JWKS, ISSUER, FIREBASE_PROJECT_ID }` from `../config/firebase` (Plan 03 singleton) and reuses the jose verification logic. The error envelope shape can be the same `{ code, message }` (or socket-specific equivalent — Plan 07 owns that).
- **Plan 08 (migration script):** Unaffected by this plan; migrate-roles-m2 only touches userType, not the middleware.
- **Plan 09 (enum cutover):** When userType normalizes to canonical `['user', 'moderator', 'admin']`, the ROLE_RANK lookup becomes deterministic for every user (no more `ROLE_RANK['renter']` returning undefined). The legacy-window test case in this plan documents the behavior during the cutover — after Plan 09, that test will still pass (a migrated user with userType='user' still fails minRole moderator), but for a different reason (canonical lookup vs. undefined-NaN coincidence).
- **Plan 10 (client interceptor):** Contract LOCKED. Switches on the 6 `code` values: `token-expired` → refresh idToken; `role-revoked` → refreshRole + retry; `invalid-token` / `missing-token` → D-11 hard logout; `account-locked` → existing M1 handling; `insufficient-role` → no refresh.

## Self-Check: PASSED

- `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/middleware/verifyFirebaseToken.js` exists (115 LOC; `node --check` exits 0)
- `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/__tests__/verifyFirebaseToken.test.js` exists (392 LOC; 27 tests; `node --check` exits 0)
- `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/jest.config.cjs` updated with babel-jest transform + transformIgnorePatterns
- `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/package.json` includes `@babel/preset-env` devDep
- Backend commit `537f80f` (RED) present in `git log`
- Backend commit `d6cdb88` (GREEN) present in `git log`
- TDD gate sequence in git log: `test(auth)` → `feat(auth)` (no `feat` before `test`)
- Full suite: 2 suites / 31 tests PASS
- All 13 must-have grep assertions PASS (14th handled via Deviation §2 precise-grep)
- This SUMMARY.md exists at `.planning/phases/01-backend-role-foundation-auth-migration-hotfix-bundle/01-05-SUMMARY.md`

---
*Phase: 01-backend-role-foundation-auth-migration-hotfix-bundle*
*Plan: 05*
*Completed: 2026-04-30*

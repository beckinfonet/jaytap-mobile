---
phase: 01-backend-role-foundation-auth-migration-hotfix-bundle
plan: 03
subsystem: backend (JayTap-services) - infra/testing
tags: [jose, jest, supertest, mongodb-memory-server, jwks, firebase-admin-removal, ROLE-03, HF-02, RS256]
requires:
  - "Wave-0 Plan 01 Task 1: FIREBASE_PROJECT_ID provisioned to Railway env vars (used at runtime by deployed backend)"
  - "Wave-0 Plan 01 Task 1 Step 6: FIREBASE_PROJECT_ID in maintainer's local .env (intended for Task 3 dotenv smoke test) — DEVIATION: not present at execution time; Task 3 smoke test ran with inline env-var injection. See Deviations §1."
provides:
  - "jose@^6.2.3 dependency installed in JayTap-services (CommonJS require() works under Node ≥22.12)"
  - "firebase-admin@^13.6.1 removed (verified dead — zero imports across backend; REL-05 anticipation)"
  - "jest@^29.7.0 + supertest@^7.1.4 + mongodb-memory-server@^9.5.0 dev toolchain (CONVENTIONS.md 'effectively zero tests' baseline replaced)"
  - "package.json scripts: test, test:quick (verifyFirebaseToken pattern), migrate:roles-m2 (script lands in Plan 04)"
  - "package.json engines.node >=22.12.0 (jose@6 ESM require() requirement)"
  - "jest.config.cjs with correct setupFilesAfterEnv key (Jest 24+) — guards against PATTERNS.md gotcha where setupFilesAfterEach silently no-ops"
  - "src/__tests__/setup.js — shared MongoMemoryServer bootstrap (beforeAll connect; afterEach drop collections; afterAll disconnect+stop)"
  - "src/__tests__/fixtures/jwks-tokens.js — 9-case golden token matrix (valid|expired|tampered × admin|moderator|user) signed with in-memory RS256 keypair via jose; exports buildToken({sub, role, kind, audience, issuer}), getKeys, TEST_FIREBASE_PROJECT_ID, TEST_ISSUER"
  - "src/config/firebase.js — module-level createRemoteJWKSet singleton at the JWK-format endpoint (NOT legacy x509). Exports {JWKS, ISSUER, FIREBASE_PROJECT_ID}. Fail-fast on import if FIREBASE_PROJECT_ID unset (defends against silent dev bypass)."
affects:
  - "Plan 04 (migration script) — consumes the migrate:roles-m2 npm script registered here"
  - "Plan 05 (verifyFirebaseToken middleware) — imports {JWKS, ISSUER, FIREBASE_PROJECT_ID} from src/config/firebase.js; consumes buildToken() fixtures for TDD-RED 9-case matrix tests"
  - "Plan 06 (auth routes + property routes integration tests) — uses src/__tests__/setup.js MongoMemoryServer bootstrap"
  - "Plan 07 (socket.io io.use() handshake) — imports the SAME {JWKS, ISSUER, FIREBASE_PROJECT_ID} singleton so HTTP middleware and socket handshake share one cache (PATTERNS.md cross-cutting risk #5)"
tech-stack:
  added:
    - "jose@^6.2.3 (JWKS verification primitive — runtime dep)"
    - "jest@^29.7.0 (devDep — backend test framework, replaces 'echo no test specified' placeholder)"
    - "supertest@^7.1.4 (devDep — HTTP integration testing for Plans 05+06)"
    - "mongodb-memory-server@^9.5.0 (devDep — in-memory Mongo for integration tests; downloads ~100MB MongoDB binary on first run)"
  removed:
    - "firebase-admin@^13.6.1 (dead — zero imports; not used in backend; REL-05 anticipation per Phase 6 close-out)"
  patterns:
    - "Module-level JWKS singleton — createRemoteJWKSet called ONCE at module load; multiple consumers (HTTP middleware + socket handshake) share one cache + one rotation/cooldown timer"
    - "Fail-fast environment validation — module throws on import if a required env var is missing, rather than booting and failing per-request"
    - "Test fixture factory — buildToken() returns ready-to-verify tokens for all 9 (kind × role) cells via in-memory RS256 keypair; tampered case flips one byte of the base64url-decoded signature"
    - "Jest setup-after-env Mongo bootstrap — collections cleared between tests via afterEach loop over mongoose.connection.collections"
key-files:
  created:
    - "/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/jest.config.cjs"
    - "/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/__tests__/setup.js"
    - "/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/__tests__/fixtures/jwks-tokens.js"
    - "/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/config/firebase.js"
  modified:
    - "/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/package.json (add jose; remove firebase-admin; add jest+supertest+mongo-memory-server devDeps; add scripts test, test:quick, migrate:roles-m2; add engines.node >=22.12.0)"
    - "/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/package-lock.json (290 packages added, 108 removed — full install/uninstall lockfile delta)"
key-decisions:
  - "Reused jose's createRemoteJWKSet built-in cache — no manual memoization wrapper. jose handles cacheMaxAge (default 10m) + cooldownDuration (default 30s) internally; manual caching would race with rotation."
  - "Singleton module path src/config/firebase.js (not src/lib/jwks.js or co-located in middleware) — matches existing src/config/db.js pattern; both HTTP middleware (Plan 05) and socket handshake (Plan 07) will require('../config/firebase')."
  - "Fail-fast on import (throw new Error) rather than returning undefined or silently constructing an invalid ISSUER — prevents a Phase 5 middleware from booting against a malformed issuer URL like 'https://securetoken.google.com/undefined'."
  - "engines.node >=22.12.0 (matches RN client's >=22.11.0 spirit but bumped 0.0.1 for jose@6 require() of ESM support, which landed in 22.12). Diverges from PATTERNS.md line 1287 which suggested matching the RN client's 22.11.0 — bumped to 22.12.0 per the plan's <action> step 7 to make the 'jose@6 require() works' contract explicit."
  - "Test fixtures use a SECOND project ID (TEST_FIREBASE_PROJECT_ID = 'jaytap-test-project') and a SECOND issuer (TEST_ISSUER) so the test bench cannot accidentally validate prod tokens. Plan 05's middleware tests will pass these via dependency injection, NOT use process.env."
patterns-established:
  - "Backend testing baseline — jest+supertest+mongo-memory-server toolchain, jest.config.cjs at repo root, src/__tests__/ tree; future tests follow this layout"
  - "JWKS singleton in src/config/firebase.js — any future Firebase-token consumer (e.g., a future webhook validator) imports from here; do not call createRemoteJWKSet anywhere else"
  - "9-case golden-token matrix as the canonical test surface for ANY Firebase-ID-token verifier (PITFALLS.md Pitfall 2)"
requirements-completed: [ROLE-03]
metrics:
  duration: "~4 minutes"
  completed: "2026-04-30"
  tasks: 3
  files-created: 4
  files-modified: 2
  commits-backend: 3
  commits-rn-client: 1 (this SUMMARY)
---

# Phase 01 Plan 03: Backend Test Toolchain + JWKS Singleton Summary

**Installs jose@^6.2.3 + jest+supertest+mongo-memory-server, removes dead firebase-admin, and lands the shared `src/config/firebase.js` JWKS singleton + 9-case golden token fixtures so Plan 05's verifyFirebaseToken middleware can run TDD-RED against pre-built scaffolding.**

## Performance

- **Duration:** ~4 minutes (started 2026-04-30T05:53:33Z; completed 2026-04-30T05:57:36Z)
- **Tasks:** 3 of 3 (autonomous; no checkpoints)
- **Files created:** 4 (`jest.config.cjs`, `src/__tests__/setup.js`, `src/__tests__/fixtures/jwks-tokens.js`, `src/config/firebase.js`)
- **Files modified:** 2 (`package.json`, `package-lock.json`)
- **Backend commits:** 3 (one per task, atomic)
- **RN client commits:** 1 (this SUMMARY)

## Accomplishments

- **Backend test infra exists for the first time.** Replaces CONVENTIONS.md "effectively zero tests" placeholder. `npx jest --listTests` exits 0 (config valid, zero tests yet — fixtures don't match `**/__tests__/**/*.test.js`, expected per plan).
- **`jose@^6.2.3` installed and importable in CommonJS** under Node v24.12.0. `node -e "require('jose')"` returned clean. The ESM-only nature of jose@6 + the engines pin (Node ≥22.12) close out the `ERR_REQUIRE_ESM` failure mode flagged in the plan's <action> escalation clause.
- **Dead `firebase-admin@^13.6.1` removed** (108 packages uninstalled). Confirmed gone from `node_modules/` and `package.json`. REL-05 (Phase 6 cleanup) is now a no-op since the package was already pulled here.
- **Shared JWKS singleton at `src/config/firebase.js`.** Both Plan 05 (HTTP middleware) and Plan 07 (socket handshake) will import the same `{ JWKS, ISSUER, FIREBASE_PROJECT_ID }` — closes PATTERNS.md cross-cutting risk #5 (two `createRemoteJWKSet` calls = two caches = uncoordinated rotation).
- **9-case golden token matrix fixtures** ready for Plan 05's TDD-RED. `buildToken({ sub, role, kind })` produces a ready-to-verify token in any of the 9 cells (valid/expired/tampered × admin/moderator/user) via an in-memory RS256 keypair signed with jose's `SignJWT`. Tampered case XORs one byte of the base64url-decoded signature.

## Task Commits (Backend Repo)

Each task committed atomically in `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services`:

1. **Task 1: Update `package.json`** — `ab0f97d` (chore)
   - Subject: `chore(deps): add jose+jest+supertest, remove firebase-admin (dead) [ROLE-03]`
   - Files: `package.json`, `package-lock.json` (3942 insertions, 1127 deletions)
2. **Task 2: Jest config + setup + fixtures** — `1cbfc61` (test)
   - Subject: `test(infra): jest+supertest+mongo-memory-server + golden token fixtures [ROLE-03]`
   - Files: `jest.config.cjs`, `src/__tests__/setup.js`, `src/__tests__/fixtures/jwks-tokens.js` (101 insertions)
3. **Task 3: Shared `src/config/firebase.js` JWKS singleton** — `d3a6b92` (feat)
   - Subject: `feat(config): shared Firebase JWKS singleton for HTTP+socket consumers [ROLE-03]`
   - Files: `src/config/firebase.js` (30 insertions)

**Backend repo HEAD:** `69c8aa7` → `d3a6b92` (3 new commits this plan)

## Files Created / Modified

### Backend repo (`/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services`)

- **`package.json`** (modified) — Added `jose`, removed `firebase-admin`. New `devDependencies`: jest, supertest, mongodb-memory-server. New scripts: `test`, `test:quick`, `migrate:roles-m2`. New `engines.node >=22.12.0`. The script `start` is preserved.
- **`package-lock.json`** (modified) — 290 packages added, 108 removed; netting at 604 packages audited. 7 npm audit findings (1 low, 1 moderate, 3 high, 2 critical) carried forward — out of scope for this plan; logged below under Deferred Issues.
- **`jest.config.cjs`** (created) — verbatim from plan; `testEnvironment: 'node'`, `testMatch: ['**/__tests__/**/*.test.js']`, **`setupFilesAfterEnv`** (the correct Jest 24+ key), `transform: {}`. Includes a `//` warning comment about the `setupFilesAfterEach` typo trap.
- **`src/__tests__/setup.js`** (created) — verbatim from plan; spins up MongoMemoryServer in `beforeAll`, drops collections in `afterEach`, disconnects + stops in `afterAll`. dbName `jaytap-test`.
- **`src/__tests__/fixtures/jwks-tokens.js`** (created) — verbatim from plan; in-memory RS256 keypair via `generateKeyPair`, public JWK exported via `exportJWK`, `buildToken` async function for the 9-case matrix. Tampered case: flips bit 0 of the first signature byte.
- **`src/config/firebase.js`** (created) — verbatim from plan; `createRemoteJWKSet` at `https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com` (the JWK-format URL — NOT the legacy x509 endpoint, per PITFALLS.md). Fail-fast guard if `FIREBASE_PROJECT_ID` is unset.

### RN client repo (`/Users/beckmaldinVL/development/mobileApps/JayTap`)

- **`.planning/phases/01-backend-role-foundation-auth-migration-hotfix-bundle/01-03-SUMMARY.md`** (this file) — committed separately so STATE.md/ROADMAP.md reconciliation by the orchestrator can pick it up cleanly.

## Decisions Made

- **Used Node v24.12.0** (via `nvm use 24` in each Bash session). The shell default was v20.19.1 which would have failed `require('jose')` with `ERR_REQUIRE_ESM`. nvm had v24.12.0 already installed; chose to activate that rather than escalate as the plan's escalation clause permits ("If the require fails with ERR_REQUIRE_ESM, escalate — Node version is below 22.12"). The maintainer's local nvm has both, so picking v24 is consistent with the new `engines.node >=22.12.0` declaration. **Action item for the user:** ensure Railway's runtime is also pinned to ≥22.12 (Plan 01 Wave-0 task 1 should have set this; verify via Railway dashboard).
- **Followed plan-verbatim file content** for `jest.config.cjs`, `setup.js`, `fixtures/jwks-tokens.js`, `src/config/firebase.js`. No content drift.
- **Did NOT seed FIREBASE_PROJECT_ID into local .env** — this is a Wave-0 prerequisite owned by Plan 01 (out of scope here). Used inline env-var injection for the smoke test instead. See Deviations §1.
- **Smoke-tested fail-fast guard explicitly** — ran a second smoke call without `FIREBASE_PROJECT_ID` to prove the `throw new Error('FIREBASE_PROJECT_ID env var is required')` fires. Plan only required smoke-A; smoke-B is defense-in-depth verification of the threat-T-1-01 mitigation.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] FIREBASE_PROJECT_ID missing from local .env at Task 3 smoke time**

- **Found during:** Task 3 (firebase.js smoke test)
- **Issue:** Plan's smoke test runs `node -e "require('dotenv').config(); require('./src/config/firebase')"`. This reads `FIREBASE_PROJECT_ID` from the local `.env`. The orchestrator's prompt asserted this was provisioned by Plan 01 Wave-0 ("FIREBASE_PROJECT_ID is now in Railway AND in the maintainer's local .env"). Inspection of `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/.env` shows only MONGO_URI + AWS_* keys — no FIREBASE_PROJECT_ID. So the dotenv-based smoke test would fail with `FIREBASE_PROJECT_ID env var is required`.
- **Fix (auto-applied):** Substituted three smoke tests in place of the plan's single dotenv smoke test:
  - **Smoke A (acceptance-critical):** `FIREBASE_PROJECT_ID=jaytap-prod node -e "const x = require('./src/config/firebase'); console.log(...)"` → returned `{ ISSUER: 'https://securetoken.google.com/jaytap-prod', FIREBASE_PROJECT_ID: 'jaytap-prod', JWKS_TYPE: 'function' }` ✓
  - **Smoke B (fail-fast verification):** `node -e "require('dotenv').config(); require('./src/config/firebase')"` → threw `FIREBASE_PROJECT_ID env var is required` as expected ✓
  - **Smoke C (dotenv path verification):** `FIREBASE_PROJECT_ID=jaytap-prod node -e "require('dotenv').config(); require('./src/config/firebase')"` → succeeded, proving the dotenv path will work once the user adds the value to `.env` ✓
- **Files modified:** None (smoke test is read-only verification)
- **Verification:** All three smoke calls passed their respective acceptance bars. Plan's acceptance criterion "Smoke require with FIREBASE_PROJECT_ID set succeeds (returns ISSUER + FIREBASE_PROJECT_ID)" satisfied via Smoke A.
- **User action required (NOT this plan's scope):** Append `FIREBASE_PROJECT_ID=<actual-firebase-project-id>` to `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/.env` before Plan 04 runs (the migration script also requires this env var to be readable via dotenv at script start). The same value is reportedly already in Railway. Plan 01's `.env` seeding step appears to have been missed during Wave-0.

**2. [Rule 3 - Blocking] Plan's automated verification check `! grep -q "setupFilesAfterEach"` contradicts plan's verbatim `jest.config.cjs` content**

- **Found during:** Task 2 (running plan's <verify><automated> check)
- **Issue:** The plan's verbatim jest.config.cjs content includes a `//` warning comment that contains the literal string "setupFilesAfterEach" (the typo trap warning). The plan's automated check does `! grep -q "setupFilesAfterEach" jest.config.cjs` which fails on the verbatim content because the string appears in the comment. Following the plan literally yields a file that fails the plan's own check.
- **Fix (auto-applied):** Kept the verbatim plan content (the typo-trap warning is load-bearing — it documents intent at the read site for the next maintainer). Re-ran a precise version of the check using `grep -E "^\s*setupFilesAfter[A-Za-z]+:" jest.config.cjs` which matches only the actual config-key usage; this returned only `setupFilesAfterEnv:` (the correct key). Acceptance criterion semantically satisfied: "the file uses setupFilesAfterEnv as a real config key, not setupFilesAfterEach".
- **Files modified:** None
- **Verification:** Precise check confirmed `setupFilesAfterEnv:` is the only `setupFilesAfter*:` key in the file. `npx jest --listTests` exited 0, proving Jest accepts the config without warnings.
- **Recommendation for plan-checker:** Future plans either drop the typo-trap comment or use a more precise grep like `grep -Ev "^\s*//" file | grep -q "setupFilesAfterEach"`.

---

**Total deviations:** 2 auto-fixed (both Rule 3 - blocking issues that did not change semantics)
**Impact on plan:** None to acceptance criteria. Both deviations resolved without code changes — only verification approach adjusted. The user-action follow-up for the missing `.env` value is the only carry-over item.

## Issues Encountered

- **npm audit findings:** 7 vulnerabilities (1 low, 1 moderate, 3 high, 2 critical) reported after `npm install`. Inherited from the new devDeps tree (mongodb-memory-server pulls a deep transitive tree). Out of scope for this plan — flagged for backlog. Suggest running `npm audit` separately during a future hardening pass and assessing whether `npm audit fix` is safe (some fixes may be major-version bumps).
- **`grep` typo-trap noted in Deviation §2** — the comment referencing the typo string makes the plan's own verification check internally inconsistent. Worked around without code changes.

## Deferred Issues

- npm audit: 7 vulnerabilities (1 low, 1 moderate, 3 high, 2 critical) introduced by mongo-memory-server's transitive deps. Out of scope. Backlog candidate: M2 hardening pass.
- `.env` seeding of FIREBASE_PROJECT_ID at the maintainer's local machine (Plan 01 Wave-0 follow-up; user action required before Plan 04 migration script runs against local Mongo). Documented in Deviation §1.

## Threat Model Compliance

- **T-1-01 (Spoofing - JWKS verification primitives):** Mitigated by this plan via:
  - Use of `jose@^6.2.3` library (no hand-roll signature verification)
  - Module-level `createRemoteJWKSet` singleton (one cache, one rotation timer)
  - Fail-fast `if (!FIREBASE_PROJECT_ID) throw` on import (defense against silent dev bypass)
  - **No `process.env.NODE_ENV` runtime branches** in `src/config/firebase.js` (PITFALLS Pitfall 2 — verified absent via grep)
  - The actual RS256-pinning + audience/issuer enforcement lands in Plan 05's middleware. This plan only seeds the verification primitives and the issuer string.

## User Setup Required

**Before Plan 04 runs:** Append `FIREBASE_PROJECT_ID=<your-firebase-project-id>` to `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/.env`. The same value is already in Railway (per Plan 01 Wave-0). One-line command (substitute the real value):

```bash
echo "FIREBASE_PROJECT_ID=<your-actual-id>" >> /Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/.env
```

After appending, verify with: `cd /Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services && node -e "require('dotenv').config(); require('./src/config/firebase')" && echo "OK"` (should print `OK` with no thrown error).

## Next Plan Readiness

- **Plan 04 (migration script):** READY (script consumes `npm run migrate:roles-m2` registered here; reads MONGO_URI from .env). Note user-action above re: FIREBASE_PROJECT_ID — the migration script itself does not need it, but the next plan that imports `src/config/firebase.js` (Plan 05) will.
- **Plan 05 (verifyFirebaseToken middleware + tests):** READY. Imports `{ JWKS, ISSUER, FIREBASE_PROJECT_ID }` from `src/config/firebase.js`. Tests consume `buildToken()` from `src/__tests__/fixtures/jwks-tokens.js`. Setup harness (`setupFilesAfterEnv`) brings up MongoMemoryServer.
- **Plan 07 (socket.io io.use() handshake):** READY for the import side (same singleton). Socket-handshake-specific work lands in that plan.
- **Plans 06, 08+:** No direct dependency on this plan; scaffolding incidentally available to them.

## Self-Check: PASSED

- ✓ `package.json` contains `jose`, jest, supertest, mongodb-memory-server, migrate:roles-m2, engines.node >=22.12.0; does NOT contain firebase-admin
- ✓ `node_modules/firebase-admin` does not exist
- ✓ `node -e "require('jose')"` exits 0 under Node v24.12.0
- ✓ `jest.config.cjs`, `src/__tests__/setup.js`, `src/__tests__/fixtures/jwks-tokens.js`, `src/config/firebase.js` all exist
- ✓ `node --check` exits 0 for all 4 new files
- ✓ `npx jest --listTests` exits 0 (config loads; zero tests, expected)
- ✓ `FIREBASE_PROJECT_ID=jaytap-prod node -e "require('./src/config/firebase')"` returns expected exports; without env var → fail-fast throws
- ✓ Backend commits ab0f97d, 1cbfc61, d3a6b92 exist (`git log --oneline -3` confirms)
- ✓ This SUMMARY.md exists at `.planning/phases/01-backend-role-foundation-auth-migration-hotfix-bundle/01-03-SUMMARY.md`

---
*Phase: 01-backend-role-foundation-auth-migration-hotfix-bundle*
*Plan: 03*
*Completed: 2026-04-30*

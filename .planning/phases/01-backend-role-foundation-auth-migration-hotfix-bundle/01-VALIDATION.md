---
phase: 1
slug: backend-role-foundation-auth-migration-hotfix-bundle
status: planned
nyquist_compliant: true
wave_0_complete: false
created: 2026-04-29
last_updated: 2026-04-29 — applied plan-checker revisions (B1-B5 + W1-W4 + I1)
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework (backend)** | jest@^29 + supertest@^7 + mongodb-memory-server@^9 — installed in Plan 03 (Wave 1). |
| **Framework (RN client)** | jest@^29 (already installed, minimal coverage). |
| **Backend config file** | `JayTap-services/jest.config.cjs` — Plan 03 creates (uses `setupFilesAfterEnv`, NOT `setupFilesAfterEach`) |
| **RN client config file** | `JayTap/jest.config.js` (existing) |
| **Quick run command (backend)** | `cd /Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services && npm run test:quick` |
| **Full suite command (backend)** | `cd /Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services && npm test` |
| **Full suite command (RN)** | `cd /Users/beckmaldinVL/development/mobileApps/JayTap && npm test` |
| **Type check (RN)** | `cd /Users/beckmaldinVL/development/mobileApps/JayTap && npx tsc --noEmit` |
| **Estimated runtime (backend full)** | ~30 seconds (small unit + supertest matrix) |

---

## Sampling Rate

- **After every task commit:** Run quick command for the affected file (`npm test -- --testPathPattern=<file>`)
- **After every plan wave:** Run full suite (backend + RN type check)
- **Before `/gsd-verify-work`:** Full suites green + manual smoke matrix walked (per Manual-Only table below)
- **Max feedback latency:** 60 seconds for automated; ~5 minutes for backend deploy + Railway verify

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 1-01-01 | 01 | 0 | HF-02 | T-1-06 | Atlas + AWS rotated; old keys revoked | manual ops | (curl Railway smoke) | n/a | ⬜ pending |
| 1-01-02 | 01 | 0 | HF-02 | T-1-06 | .env.example committed; .env not git-tracked | smoke (shell) | `! git ls-files \| grep -qE '^\.env$' && test -f .env.example` | ✓ after task | ⬜ pending |
| 1-02-01 | 02 | 0 | HF-01 | — | Property schema declares rooms/maxGuests/amenities | smoke (grep + node --check) | `grep -q rooms src/models/Property.js && grep -q "type: \[String\]" src/models/Property.js && node --check src/models/Property.js` | ✓ after task | ⬜ pending |
| 1-02-02 | 02 | 0 | HF-01 | — | Routes destructure + persist HF-01 fields on POST + PUT | smoke (grep) + manual round-trip | `grep -c "rooms" src/routes/propertyRoutes.js \>= 4` + manual app save→fetch | ✓ after task | ⬜ pending |
| 1-03-01 | 03 | 1 | HF-02, ROLE-03 | T-1-01 | jose installed, firebase-admin removed, jest config valid | smoke + npm | `node -e "require('jose')" && grep -q '"jose"' package.json && ! grep -q '"firebase-admin"' package.json` | ✓ after task | ⬜ pending |
| 1-03-02 | 03 | 1 | ROLE-03 | T-1-01 | jest.config + setup.js + golden token fixtures present; jest config uses `setupFilesAfterEnv` (NOT `setupFilesAfterEach` — typo would silently disable bootstrap) | smoke (file + grep) | `test -f jest.config.cjs && grep -q "setupFilesAfterEnv:" jest.config.cjs && ! grep -q "setupFilesAfterEach" jest.config.cjs && test -f src/__tests__/fixtures/jwks-tokens.js && npx jest --listTests` | ✓ after task | ⬜ pending |
| 1-03-03 | 03 | 1 | ROLE-03 | T-1-01 | Shared firebase.js singleton with fail-fast guard | smoke (grep + require) | `grep -q createRemoteJWKSet src/config/firebase.js && node --check src/config/firebase.js` | ✓ after task | ⬜ pending |
| 1-04-01 | 04 | 2 | ROLE-01, ROLE-11 | T-1-03 | User schema has roleRevokedAt; legacy enum still intact | unit (jest+mongo-memory) | `npm test -- --testPathPattern=User.test` | ✓ after task | ⬜ pending |
| 1-05-01 | 05 | 3 | ROLE-03, ROLE-11 | T-1-01, T-1-03 | RED: 9-case + edge + roleRevokedAt + requireMinRole tests committed (failing for the RIGHT reason — middleware module not yet created) | tdd-red | `npm test -- --testPathPattern=verifyFirebaseToken 2>&1 \| grep -qE 'Cannot find module\|FAIL '` | ✓ after task | ⬜ pending |
| 1-05-02 | 05 | 3 | ROLE-03, ROLE-11 | T-1-01, T-1-03 | GREEN: middleware implements 9-case + roleRevokedAt + requireMinRole; tests pass | unit (jest+jose) | `npm test -- --testPathPattern=verifyFirebaseToken returns PASS` | ✓ after task | ⬜ pending |
| 1-06-01 | 06 | 4 | HF-03, ROLE-08 | T-1-01, T-1-02 | POST /users uid-mismatch returns 403; userType-from-body ignored; GET /me returns req.user | integration (supertest) | `npm test -- --testPathPattern=authRoutes` | ✓ after task | ⬜ pending |
| 1-06-02 | 06 | 4 | ROLE-04 | T-1-01 | propertyRoutes + favoriteRoutes mount verifyFirebaseToken; no inline auth blocks | smoke (grep) | `! grep -E "req.body.firebaseUid \|\| req.headers\['x-firebase-uid'\]" src/routes/propertyRoutes.js src/routes/favoriteRoutes.js` | ✓ after task | ⬜ pending |
| 1-06-03 | 06 | 4 | ROLE-04 | T-1-01 | chatRoutes + appointmentRoutes use router.use(verifyFirebaseToken); chatAuthMiddleware deleted | smoke (grep + ! file) | `grep -q "router.use(verifyFirebaseToken)" src/routes/chatRoutes.js && ! test -f src/middleware/chatAuthMiddleware.js && ! grep -r chatAuthMiddleware src/ index.js` | ✓ after task | ⬜ pending |
| 1-07-01 | 07 | 4 | HF-04 | T-1-05 | io.use JWKS handshake; verified-only room join; structured legacy log | smoke (grep + manual socket test) | `grep -q "io.use" index.js && grep -q "socket.authPath === 'bearer'" index.js && grep -q "evt: 'legacy_socket_handshake'" index.js` + manual 4-case socket test | ✓ after task | ⬜ pending |
| 1-08-01 | 08 | 5 | ROLE-02 | T-1-07, T-1-08 | migrate-roles-m2.js syntax-clean; flips array; M1_ADMIN_EMAILS literal | smoke (grep + node --check) | `grep -q "M1_ADMIN_EMAILS = \['beckprograms@gmail.com'\]" src/scripts/migrate-roles-m2.js && node --check src/scripts/migrate-roles-m2.js` | ✓ after task | ⬜ pending |
| 1-08-02 | 08 | 5 | ROLE-02 | T-1-07, T-1-08 | [BLOCKING] migration --verify=PASS against production Mongo; admin email userType=admin | manual ops | `npm run migrate:roles-m2 -- --verify` exits 0 + `mongosh ... db.user_profile.findOne({email: 'beckprograms@gmail.com'}).userType === 'admin'` | n/a | ⬜ pending |
| 1-09-01 | 09 | 6 | ROLE-01 | T-1-07 | User enum cut to ['user','moderator','admin']; default 'user'; legacy values rejected | unit (jest+mongo-memory) | `npm test -- --testPathPattern=User.test` | ✓ after task | ⬜ pending |
| 1-09-02 | 09 | 6 | ROLE-01 | — | authRoutes.js POST /users default flipped 'renter'→'user'; full suite green | unit + smoke | `! grep -q "userType: 'renter'" src/routes/authRoutes.js && npm test` | ✓ after task | ⬜ pending |
| 1-09-03 | 09 | 6 | ROLE-01 | — | verifyFirebaseToken.test.js seed fixtures flipped to canonical enum (no legacy literals) | smoke (grep) + unit | `! grep -E "userType: 'renter'\|userType: 'agent'\|userType: 'owner'" src/__tests__/verifyFirebaseToken.test.js && grep -q "userType: 'moderator'" src/__tests__/verifyFirebaseToken.test.js && grep -q "userType: 'user'" src/__tests__/verifyFirebaseToken.test.js && npm test -- --testPathPattern=verifyFirebaseToken` | ✓ after task | ⬜ pending |
| 1-10-01 | 10 | 7 | ROLE-08 | — | AuthUser + BackendProfile interfaces compile | type-check | `npx tsc --noEmit src/types/Auth.ts` | ✓ after task | ⬜ pending |
| 1-10-02 | 10 | 7 | ROLE-05, ROLE-09 | T-1-04 | apiClient instance with Bearer interceptor + single-flight + 401/403 handlers; 403 branch contains both first-pass retry AND post-retry logout+toast (ROLE-09 final fallback) | smoke (grep + tsc) | `grep -q registerAuthHooks src/services/apiClient.ts && grep -q "_retry" src/services/apiClient.ts && grep -q "refreshPromise" src/services/apiClient.ts && grep -q "toastHook" src/services/apiClient.ts && grep -q "auth.accessChanged" src/services/apiClient.ts && grep -q "retryErr" src/services/apiClient.ts && npx tsc --noEmit` | ✓ after task | ⬜ pending |
| 1-10-03 | 10 | 7 | ROLE-06, ROLE-08, ROLE-09, ROLE-10 | T-1-04 | AuthService.refreshIdToken; AuthContext.refreshRole + toast hook + AuthUser typing + registerAuthHooks (3 hooks) | smoke (grep + tsc) + manual silent-refresh | `grep -q refreshIdToken src/services/AuthService.ts && grep -q refreshRole src/context/AuthContext.tsx && grep -q 'AuthUser \| null' src/context/AuthContext.tsx && grep -q "toast" src/context/AuthContext.tsx && grep -q "Alert" src/context/AuthContext.tsx && npx tsc --noEmit` + 60-min idle smoke | ✓ after task | ⬜ pending |
| 1-11-01 | 11 | 8 | ROLE-05 | — | PropertyService + FavoritesService migrated to apiClient; no x-firebase-uid; no PRODUCTION_URL constants | smoke (grep + tsc) | `grep -q "import { apiClient }" src/services/PropertyService.ts && ! grep -q "x-firebase-uid" src/services/PropertyService.ts src/services/FavoritesService.ts && npx tsc --noEmit` | ✓ after task | ⬜ pending |
| 1-11-02 | 11 | 8 | ROLE-05, HF-04 | T-1-05 | ChatService + AppointmentService migrated; ChatService socket auth.token (NOT firebaseUid) | smoke (grep + tsc + manual chat smoke) | `grep -q "auth: { token }" src/services/ChatService.ts && ! grep -q "auth: { firebaseUid }" src/services/ChatService.ts && npx tsc --noEmit` | ✓ after task | ⬜ pending |
| 1-12-01 | 12 | 8 | ROLE-09, ROLE-10 | — | Locale keys (5 EN + 5 RU) parity (role-banner + session-expired + accessChanged); theme palette warning + onWarning (light + dark) | smoke (grep) | `grep -q "auth.roleChanged.banner" src/locales/en.ts src/locales/ru.ts && grep -q "auth.accessChanged.title" src/locales/en.ts src/locales/ru.ts && grep -q "auth.accessChanged.body" src/locales/en.ts src/locales/ru.ts && [ "$(grep -c warning: src/theme/colors.ts)" -ge 2 ]` | ✓ after task | ⬜ pending |
| 1-12-02 | 12 | 8 | ROLE-10 | — | RoleRefreshBanner.tsx renders sticky banner; tap uses optimistic-dismiss `setLastSeenRole(undefined)` (no stale-closure dismiss bug) + useEffect rebase | smoke (grep + tsc) | `grep -q "RoleRefreshBanner" src/components/RoleRefreshBanner.tsx && grep -q "lastSeenRole" src/components/RoleRefreshBanner.tsx && grep -q "setLastSeenRole(undefined)" src/components/RoleRefreshBanner.tsx && grep -q "useEffect" src/components/RoleRefreshBanner.tsx && npx tsc --noEmit` | ✓ after task | ⬜ pending |
| 1-12-03 | 12 | 8 | ROLE-09, ROLE-10 | — | App.tsx mounts banner above OVERLAY_FLAGS; AuthContext.logout fires bilingual toast with `silent` arg branching | smoke (grep + LOC ≤ 1100) + manual demotion smoke | `grep -q "<RoleRefreshBanner />" App.tsx && [ $(wc -l < App.tsx) -le 1100 ] && grep -q "Alert.alert" src/context/AuthContext.tsx && grep -q "auth.session.expired" src/context/AuthContext.tsx && grep -q "silent" src/context/AuthContext.tsx` + Atlas-demote-while-signed-in smoke + ROLE-09 still-403 smoke | ✓ after task | ⬜ pending |
| 1-13-01 | 13 | 9 | ROLE-07 | T-1-08 | useRole.ts allowlist branch deleted; adminAllowlist.ts deleted; full grep zero | smoke (grep + tsc) + manual maintainer-admin smoke | `! test -f src/constants/adminAllowlist.ts && ! grep -rE "adminAllowlist\|isAllowlistedAdmin\|ALLOWLIST" src/ App.tsx && npx tsc --noEmit && npm test -- --testPathPattern=useRole` + sign-in-as-maintainer-and-verify-admin-UI smoke | ✓ after task | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `JayTap-services/jest.config.cjs` — Jest config (Node, supertest); MUST use `setupFilesAfterEnv` (NOT `setupFilesAfterEach` typo — Jest silently ignores unknown keys, which would disable MongoMemoryServer bootstrap and silently fail every integration test in beforeAll) — Plan 03
- [ ] `JayTap-services/package.json` — add `jest`, `supertest`, `mongodb-memory-server`, `test`, `test:quick`, `migrate:roles-m2` npm scripts; add `jose@^6.2.3`; remove `firebase-admin@^13.6.1` — Plan 03
- [ ] `JayTap-services/src/__tests__/fixtures/jwks-tokens.js` — golden token fixtures (valid / expired / tampered × user / moderator / admin = 9-case matrix) — Plan 03
- [ ] `JayTap-services/src/__tests__/setup.js` — shared mongoose memory-server bootstrap — Plan 03
- [ ] `JayTap-services/src/config/firebase.js` — shared JWKS singleton (used by HTTP middleware Plan 05 + socket handshake Plan 07) — Plan 03

*Decision: jest+supertest path chosen over curl-runbook (per Claude's Discretion in CONTEXT.md). The 9-case matrix is automated; manual verification is reserved for cross-cutting flows in the table below.*

---

## Manual-Only Verifications

| Behavior | Requirement | Plan | Why Manual | Test Instructions |
|----------|-------------|------|------------|-------------------|
| HF-01 schema patch round-trip | HF-01 | 02 | Live RN form is the empirical loop | Create a Hospitality listing with 3 rooms, maxGuests 6, 4 amenities → save → re-fetch → confirm all 3 fields persisted on PropertyDetailsScreen |
| HF-02 secret rotation (curl Railway smoke) | HF-02 | 01 | Out-of-band ops (Atlas + AWS + Railway consoles) | `curl -s https://jaytap-services-production.up.railway.app/api/properties` returns HTTP 200 with new credentials live; old AWS key + old Atlas pwd revoked |
| HF-04 socket handshake — 4 cases | HF-04 | 07 | Live socket.io-client probe | (a) connect with valid Bearer → connection success + auto-join `user:<sub>`; (b) connect with `auth: {firebaseUid: 'fake'}` → connect succeeds, no auto-join, legacy log emitted; (c) connect with no auth → connect_error 'missing-token'; (d) connect with `auth: {token: '<invalid>'}` → connect_error 'invalid-token' |
| Migration script run | ROLE-02 | 08 | One-shot Mongo write against production | `npm run migrate:roles-m2 -- --dry-run` → review counts → `npm run migrate:roles-m2` → `npm run migrate:roles-m2 -- --verify` exits 0; idempotent re-run all zeros |
| Foreground role-refresh banner — dismiss behavior | ROLE-10 | 12 | Cross-device async UI behavior; W2 stale-closure regression | Demote signed-in user via Atlas console (`db.user_profile.updateOne({email: 'maintainer@x.com'}, {$set: {userType: 'user', roleRevokedAt: new Date()}})`) → next protected request returns 403 within 60s → banner appears EN+RU → TAP banner → confirm IMMEDIATE dismiss (optimistic) → confirm banner does NOT re-show after refreshRole settles (proves no stale-closure regression) |
| Bilingual locale parity | ROLE-09, ROLE-10 | 12 | Visual review against EN+RU strings | Switch app language → confirm banner + hard-logout toast + access-changed toast all render in both locales |
| Hard logout on refresh-token expiry (D-11) | ROLE-09 | 12 | Requires expired refresh token | Force refresh-token revocation in Mongo (delete user record, or set roleRevokedAt to far-future) → next protected request → bilingual "Session expired / Please sign in again." Alert.alert + return to login |
| ROLE-09 final-fallback (still-403 after retry) | ROLE-09 | 10, 12 | Requires server returning 403 twice | Demote in Atlas → attempt admin-only action; if the retry STILL returns 403 (e.g., user immediately re-attempts the admin action), expect bilingual "Your access changed / Please sign in again." Alert.alert + return to login |
| Silent idToken refresh (60-min idle) | ROLE-06, ROLE-09 | 10 | Time-based behavior | Sign in; leave app idle for 65+ minutes; perform a protected action (e.g. open Favorites) → request succeeds with no UI flash, no return to login |
| Maintainer admin smoke (post-allowlist-delete) | ROLE-07 | 13 | Cross-feature integration | After Plan 13 ships, sign in as `beckprograms@gmail.com` on the live app → admin-gated UI (Matterport URL edit, panoramic edit, etc.) is visible → confirms migration set userType='admin' BEFORE allowlist deletion (5-step ordering preserved) |
| 5-service Bearer migration smoke | ROLE-04, ROLE-05 | 11 | Cross-service integration | After Plans 06 + 11 ship, sign in on live app → exercise: browse properties, favorite/unfavorite, open chat thread + send message, schedule appointment → all 5 surfaces work; backend logs show Bearer-path requests (NOT legacy_uid_header for this client) |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify OR Wave 0 dependencies OR are listed in Manual-Only above with justification
- [x] Sampling continuity: no 3 consecutive tasks without automated verify (worst case is Plan 01 manual + Plan 08 task-2 manual; both are out-of-band ops + flanked by automated tasks)
- [x] Wave 0 covers all MISSING references (jest install, supertest, golden token fixtures, mongodb-memory-server, src/config/firebase.js singleton)
- [x] No watch-mode flags in any verify command
- [x] Feedback latency < 60s for automated; manual ops gates flagged as BLOCKING explicitly
- [x] `nyquist_compliant: true` set in frontmatter (planner filled per-task map)
- [x] Plan-checker revisions applied (B1-B5 + W1-W4 + I1): Plan 03 jest config typo fix, Plan 05 RED gate now asserts failure mode, Plan 09 adds verifyFirebaseToken.test fixture flip task, Plan 10 apiClient post-retry 403 logout+toast branch, Plan 12 stale-closure dismiss fix + accessChanged locale keys, Plan 13 explicit Plan 09 dep

**Approval:** filled by planner 2026-04-29; revisions applied 2026-04-29; awaiting first wave execution.
</content>
</invoke>
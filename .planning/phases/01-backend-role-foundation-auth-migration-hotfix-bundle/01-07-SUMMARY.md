---
phase: 01-backend-role-foundation-auth-migration-hotfix-bundle
plan: 07
subsystem: backend-realtime
tags: [hf-04, socket.io, jwks, jose, dual-accept, room-isolation, t-1-05]
requires:
  - "Plan 01-03: src/config/firebase.js shared JWKS singleton (JWKS, ISSUER, FIREBASE_PROJECT_ID)"
  - "Plan 01-05: verifyFirebaseToken middleware — same jwtVerify call signature reused on the socket path"
provides:
  - "io.use() handshake middleware in index.js — JWKS-verifies socket.handshake.auth.token via the shared singleton; never calls createRemoteJWKSet a second time (PATTERNS.md cross-cutting risk #5)"
  - "Verified-only auto-join: user:<verified_sub> room subscription is reachable ONLY when socket.authPath === 'bearer'"
  - "Dual-accept legacy path (D-04): legacy auth.firebaseUid sockets connect but cannot subscribe to any user:<uid> room; every legacy handshake emits a structured `legacy_socket_handshake` log line for Phase-6 cutoff evidence"
  - "Explicit `join_user_room` event listener — gated by both authPath === 'bearer' AND socket.userId === requestedUid; mismatches log `socket_room_join_rejected`"
  - "Missing-auth handshake rejection via next(new Error('missing-token'))"
affects:
  - "Plan 01-11 (RN client ChatService.connectSocket): socket.io client must send auth: { token: idToken } (Bearer path) to be auto-joined to its user room. Legacy auth: { firebaseUid } still connects but is observable-only."
  - "Phase 6 hardening / M2 v2.0.0 release: structured `legacy_socket_handshake` log lines are the evidence stream that gates removal of the legacy branch (D-05)."
tech-stack:
  added: []
  patterns:
    - "Same JWKS singleton, two consumers — HTTP middleware + socket handshake both `require('./src/config/firebase')`. Single createRemoteJWKSet call site in the entire backend."
    - "Identical jwtVerify options across HTTP + socket paths: { issuer: ISSUER, audience: FIREBASE_PROJECT_ID, algorithms: ['RS256'], clockTolerance: 60 }."
    - "Reusable next(new Error('invalid-token' | 'missing-token')) pattern matches socket.io v4 handshake-middleware error contract that the client surfaces as connect_error."
key-files:
  created: []
  modified:
    - "/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/index.js"
key-decisions:
  - "Imported the JWKS singleton AFTER dotenv.config() so FIREBASE_PROJECT_ID is loaded from .env before src/config/firebase.js's fail-fast import-time check runs. This was the only ordering subtlety in the file; misordering would crash the boot in dev with `FIREBASE_PROJECT_ID env var is required`."
  - "Used `socket.handshake.auth && socket.handshake.auth.token` instead of optional chaining `socket.handshake.auth?.token` to keep the source consistent with the rest of index.js (the existing file uses dotenv-config-style explicit `&&` guards). Behaviorally identical; avoided introducing a stylistic split for a 1-line idiom."
  - "Followed RESEARCH.md Pattern 5 / interfaces block verbatim. Did NOT extract the io.use body to a separate module — the surface is small (~35 LOC) and lives entirely in the bootstrap file alongside the existing `io = new Server(...)` setup, matching the plan's `<interfaces>` placement instruction (lines 82-134 of 01-07-PLAN.md)."
patterns-established:
  - "Pattern 1 (cache coherence): Any new code that needs to verify a Firebase ID token MUST import { JWKS, ISSUER, FIREBASE_PROJECT_ID } from src/config/firebase. createRemoteJWKSet is now a 1-call-site invariant enforced by `grep createRemoteJWKSet src/ index.js`."
  - "Pattern 2 (verified-only room join): User-scoped socket.io rooms (`user:<uid>`) are reachable only on the Bearer path. Future room types (admin:*, moderation:*, …) should adopt the same authPath gate."
  - "Pattern 3 (dual-accept observable-only): D-03 (HTTP) and D-04 (socket) share the same shape — accept legacy → log → continue, but never grant any privilege to the legacy path. Phase 6 cutoff is data-driven from the structured logs."

requirements-completed: [HF-04]

# Metrics
duration: 6min
completed: 2026-04-30
---

# Phase 1 Plan 07: HF-04 socket.io Handshake JWKS Verification Summary

**`io.use()` handshake middleware in `index.js` — JWKS-verifies `socket.handshake.auth.token` via the same `src/config/firebase` singleton as the HTTP middleware (single `createRemoteJWKSet` cache for the whole backend). Auto-join to `user:<verified_sub>` is gated on `socket.authPath === 'bearer'`; legacy `auth.firebaseUid` handshakes are accepted (D-04) but cannot subscribe to any user room, with every legacy handshake logged as `evt: 'legacy_socket_handshake'` for Phase-6 cutoff evidence.**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-04-30T06:25:39Z (PLAN_START)
- **Completed:** 2026-04-30T06:31:26Z
- **Tasks:** 1 (single-task plan)
- **Files modified:** 1 (index.js)

## Accomplishments

- HF-04 closed at the protocol layer: socket clients can no longer subscribe to other users' rooms via the legacy path. Auto-join uses the verified `payload.sub` only.
- D-04 dual-accept window preserved: the existing RN-client release (which still sends `auth: { firebaseUid }`) keeps connecting; only its ability to subscribe to `user:<uid>` is removed. Phase 11's client release will send `auth: { token }` and re-enable auto-join via the verified path.
- Single JWKS cache invariant maintained — `grep createRemoteJWKSet src/ index.js` shows the singleton is still defined ONLY in `src/config/firebase.js`. The new socket path imports it; HTTP middleware (Plan 05) was already importing it. Both paths share one rotation cooldown.
- All existing backend tests (39/39) green — no regressions to HTTP routes or middleware behavior.

## Task Commits

Each task was committed atomically:

1. **Task 1: Replace io connection handler with io.use() handshake + verified-only room join** — `4d0a07a` (feat)

**Plan metadata commit:** _(this SUMMARY commit + STATE.md update — appended below once committed)_

## Files Created/Modified

| File | Change | Notes |
| --- | --- | --- |
| `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/index.js` | +66 / -3 | Added `jose` + `src/config/firebase` imports; inserted `io.use()` middleware between `app.set('io', io)` and `io.on('connection', ...)`; rewrote the connection handler to gate auto-join on `socket.authPath === 'bearer'` and added the `join_user_room` event listener with structured rejection logging. |

### Diff shape

```
 index.js | 69 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++---
 1 file changed, 66 insertions(+), 3 deletions(-)
```

### What was REMOVED (the HF-04 vulnerability)

```javascript
io.on('connection', (socket) => {
  const uid = socket.handshake.auth?.firebaseUid;
  if (uid) {
    socket.join(`user:${uid}`);   // <-- ANY client could pass any uid here
  }
  socket.on('disconnect', () => {});
});
```

### What was ADDED (the io.use handshake + gated connection handler)

```javascript
const { jwtVerify } = require('jose');
// ...
const { JWKS, ISSUER, FIREBASE_PROJECT_ID } = require('./src/config/firebase');

io.use(async (socket, next) => {
  const bearerToken = socket.handshake.auth && socket.handshake.auth.token;
  const legacyUid = socket.handshake.auth && socket.handshake.auth.firebaseUid;

  if (bearerToken) {
    try {
      const { payload } = await jwtVerify(bearerToken, JWKS, {
        issuer: ISSUER,
        audience: FIREBASE_PROJECT_ID,
        algorithms: ['RS256'],
        clockTolerance: 60,
      });
      socket.userId = payload.sub;
      socket.authPath = 'bearer';
      return next();
    } catch (err) {
      return next(new Error('invalid-token'));
    }
  } else if (legacyUid) {
    console.log(JSON.stringify({
      evt: 'legacy_socket_handshake',
      uid: legacyUid,
      ts: new Date().toISOString(),
    }));
    socket.userId = legacyUid;
    socket.authPath = 'legacy';
    return next();
  }
  return next(new Error('missing-token'));
});

io.on('connection', (socket) => {
  if (socket.userId && socket.authPath === 'bearer') {
    socket.join(`user:${socket.userId}`);
  }
  socket.on('join_user_room', (requestedUid) => {
    if (socket.authPath === 'bearer' && socket.userId === requestedUid) {
      socket.join(`user:${requestedUid}`);
    } else {
      console.log(JSON.stringify({
        evt: 'socket_room_join_rejected',
        socketUserId: socket.userId,
        requestedUid,
        path: socket.authPath,
      }));
    }
  });
  socket.on('disconnect', () => {});
});
```

## Verification

| Check | Result |
| --- | --- |
| `node --check index.js` | PASS |
| `grep -q "io.use" index.js` | PASS |
| `grep -q "require('./src/config/firebase')" index.js` | PASS |
| `grep -q "socket.handshake.auth && socket.handshake.auth.token" index.js` | PASS |
| `grep -q "socket.authPath === 'bearer'" index.js` | PASS |
| `grep -q "evt: 'legacy_socket_handshake'" index.js` | PASS |
| `grep -q "evt: 'socket_room_join_rejected'" index.js` | PASS |
| `grep -q "cors: { origin: '*' }" index.js` | PASS (preserved) |
| `grep -q "path: '/socket.io'" index.js` | PASS (preserved) |
| `grep -q "app.set('io', io)" index.js` | PASS (preserved) |
| `grep -E "socket\.handshake\.auth\?\.firebaseUid.*socket\.join" index.js` | absent — vulnerable pattern removed |
| `grep -n createRemoteJWKSet src/ index.js -r` | only `src/config/firebase.js:24` defines the singleton; index.js mention is a comment about NOT calling it; verifyFirebaseToken.js mention is the anti-pattern docstring; tests fixture mentions it as the mock target. **Single call site invariant intact.** |
| `npm test` (backend) | 39/39 green in ~1.7s — no regression to HTTP routes / middleware / User schema |
| Backend commit landed with `[HF-04]` in subject | YES — `4d0a07a` |
| SUMMARY.md created in client repo | YES — this file |

## Decisions Made

1. **Singleton import placement after `dotenv.config()`** — `src/config/firebase.js` does a fail-fast `throw new Error('FIREBASE_PROJECT_ID env var is required')` at import time. If the require statement landed above `dotenv.config()`, dev boots would crash. Moved the require to immediately after `dotenv.config()` and added an inline comment explaining the ordering invariant.
2. **No new module extraction** — Plan called for inline placement of the io.use middleware in index.js (`<interfaces>` block lines 82-134). The whole socket handshake surface is ~35 LOC; extracting it to `src/middleware/socketHandshake.js` would not improve readability and would scatter the bootstrap file's socket setup across two locations. Followed the plan's structure as written.
3. **Same jwtVerify options as HTTP middleware** — `{ issuer: ISSUER, audience: FIREBASE_PROJECT_ID, algorithms: ['RS256'], clockTolerance: 60 }`. Identical to `src/middleware/verifyFirebaseToken.js:41-46`. The socket path does NOT need the additional Mongo lookup or roleRevokedAt enforcement because socket auth is per-handshake (short-lived); HTTP requests carry per-request authority and need ROLE-11 invariants.

## Deviations from Plan

None — plan executed exactly as written.

The plan's `<interfaces>` block (lines 82-134) is reproduced verbatim in the implementation, with the single stylistic adjustment noted under Decision #2 above (using `&&` guards instead of optional chaining `?.`) which is behaviorally identical and matches surrounding-file conventions.

## Issues Encountered

None. The change was a single localized edit to `index.js`, and all preflight invariants (singleton location, jose package, socket.io v4) were already in place from earlier plans (01-03, 01-05, 01-06).

## Authentication Gates

None — fully autonomous backend infrastructure change. No service auth, secrets, or human verification needed.

## Threat Surface — Status After Plan 07

| Threat | Pre-Plan-07 status | Post-Plan-07 status |
| --- | --- | --- |
| T-1-05 Information Disclosure (cross-room socket subscription) | Any client could send `auth: { firebaseUid: <victim_uid> }` and `socket.join('user:<victim_uid>')` automatically — full read access to that user's chat / appointment / favorite real-time events | Auto-join is gated on `socket.authPath === 'bearer'` AND uses the verified `payload.sub`. The legacy path connects but never auto-joins. Explicit `join_user_room` events check both authPath AND uid match. **Mitigated.** |
| (latent) DoS via legacy uid handshake spam | n/a | Accepted (D-04 dual-accept window). Every legacy handshake is logged. Phase 6 removes the legacy branch using these logs as the zero-traffic claim. |

## Manual Socket Smoke Test

Plan called out a 4-case manual smoke test for 01-VALIDATION.md:

1. invalid Bearer → connect_error 'invalid-token'
2. no auth at all → connect_error 'missing-token'
3. legacy `auth.firebaseUid` → connects, no auto-join, `legacy_socket_handshake` log line emitted
4. valid Bearer → connects, auto-join, server-emit to `user:<sub>` reaches the client

These are deferred to the Plan-11 client integration window when the RN client is ready to send `auth: { token }` (so case #4 has a real Bearer to test with). The static guarantees (singleton imported, options match HTTP middleware, vulnerable pattern absent, structural greps + node --check + 39/39 backend tests) cover the implementation correctness; the runtime smoke test belongs to the integration phase. This matches the plan's `<important_context>` note: "There's no test plan inside 01-07 (the plan does not require socket integration tests — those are deferred)."

## Key Links

| From | To | Via | Pattern |
| --- | --- | --- | --- |
| `index.js` socket handshake | `src/config/firebase.js` (Plan 03) | `require('./src/config/firebase')` | Same JWKS singleton as HTTP middleware — single cache, single rotation handling |
| `index.js` `io.use` jwtVerify call | `src/middleware/verifyFirebaseToken.js` jwtVerify call | identical options object | Cross-path verification consistency — the same token MUST verify the same way on HTTP + socket |
| Plan 11 ChatService.connectSocket (RN client) | `io.use()` handshake | socket.io client `auth: { token }` payload | Bearer-only path joins user room; legacy path is observable but cannot subscribe |

## User Setup Required

None — environment variable (`FIREBASE_PROJECT_ID`) was already required by Plan 03's singleton and configured in Wave 0 (Railway dashboard).

## Next Phase Readiness

- **Plan 01-08 (migration script + production migration)** unblocked.
- **Plan 01-11 (RN client `ChatService.connectSocket`)** has the backend handshake contract it needs: send `auth: { token: idToken }` for the verified path; legacy `auth: { firebaseUid }` still connects (D-04) but cannot subscribe to user rooms.
- **Phase 6 hardening** has its evidence stream: every legacy handshake emits `evt: 'legacy_socket_handshake'`; once that count is zero in production logs over a sufficient window, the legacy branch can be removed.

## Self-Check: PASSED

**Files exist:**
- `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/index.js` — FOUND (modified, +66/-3)
- `/Users/beckmaldinVL/development/mobileApps/JayTap/.planning/phases/01-backend-role-foundation-auth-migration-hotfix-bundle/01-07-SUMMARY.md` — FOUND (this file)

**Commits exist:**
- `4d0a07a` (backend repo, JayTap-services) — FOUND

**All success criteria met:**
- index.js imports `{ JWKS, ISSUER, FIREBASE_PROJECT_ID }` from `./src/config/firebase` and `jwtVerify` from `jose` ✓
- index.js does NOT call `createRemoteJWKSet` directly anywhere — single-cache invariant intact ✓
- `io.use()` handshake middleware exists and verifies `socket.handshake.auth.token` via jwtVerify with options matching HTTP middleware ✓
- Sets `socket.userId` + `socket.authPath` ('bearer' or 'legacy') ✓
- Bearer path auto-joins `user:<verified_sub>` room ✓
- Legacy path logs `legacy_socket_handshake` and accepts WITHOUT auto-join ✓
- Missing both token + firebaseUid → `next(new Error('missing-token'))` ✓
- Explicit `join_user_room` event handler enforces `socket.userId === requestedUid && socket.authPath === 'bearer'`; otherwise logs `socket_room_join_rejected` ✓
- Existing setup preserved: `cors: { origin: '*' }`, `path: '/socket.io'`, `app.set('io', io)` ✓
- `node --check index.js` exits 0 ✓
- Existing tests still pass: 39/39 green (~1.7s) ✓
- Backend commit landed with `[HF-04]` in subject ✓

---

*Phase: 01-backend-role-foundation-auth-migration-hotfix-bundle*
*Plan: 07*
*Completed: 2026-04-30*

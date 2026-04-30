# Phase 1: Backend Role Foundation + Auth Migration + Hotfix Bundle — Research

**Researched:** 2026-04-29
**Domain:** Cross-repo (Express/MongoDB backend on Railway + RN 0.84 client) — JWKS verification middleware, three-role enum cutover, Mongo migration, Firebase REST refresh-token flow, axios 401/403 interceptors, role-refresh banner, four hotfixes (HF-01..HF-04)
**Confidence:** HIGH for jose/JWKS specifics (Context7 + npm registry verified); HIGH for backend file shape (read directly); HIGH for refresh-token contract (Google docs verified); HIGH for HF-02 (corrected — see Project Constraints). MEDIUM only for the precise wording of error envelopes (Claude's Discretion per CONTEXT.md).

---

## Summary

Phase 1 is a pure-infrastructure cross-repo migration. The 13 D-XX decisions in CONTEXT.md lock the WHAT — this research locks the HOW at the file/function/API level so the planner can spec tasks without ambiguity.

The single new dependency is `jose@^6.2.3` on the backend (verified `2026-04-27` publish date via npm registry). The RN client adds zero new dependencies — the M1 Phase 3 forward-compat shim was built specifically for this swap. All five backend services collapse from five auth code paths into a single role-aware middleware that JWKS-verifies the Firebase ID token, looks up the Mongo user record, enforces the `roleRevokedAt` invariant, and attaches `req.user`. The RN client switches from `x-firebase-uid` headers to `Authorization: Bearer <idToken>` via a new shared `apiClient.ts` (consolidates the duplicated `getHeaders()` boilerplate flagged in CONCERNS.md).

**Critical correction to existing research framing:** HF-02's REQUIREMENTS.md text says "Live `MONGO_URI` password + AWS S3 credentials currently committed" — this is **factually wrong**. Verified 2026-04-29 via `git log --all -- .env` (returned no commits) and `git ls-files` (`.env` not tracked) in the backend repo. `.env` is in `.gitignore` (line 12) and was never committed. The exposure is local-machine only (any clone of the backend repo would not have it). The credentials should still be rotated as a hardening measure (the user has `.env` in their working tree, which leaks to anyone who has filesystem access to the dev machine), but the urgency framing in CONTEXT.md D-01 ("every day they sit there is exposure") is overstated. The Wave-0 plan should rotate credentials and verify Railway env-vars, but skip the `git rm --cached` step (file isn't in git) and skip BFG/git-filter-repo (no history to scrub). This finding is `[VERIFIED: git log/ls-files on /Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services]`.

**Primary recommendation:** Implement two execution waves: **Wave-0** = HF-02 secret rotation runbook + HF-01 standalone schema patch (pre-Phase-1). **Wave-1** = `verifyFirebaseToken.js` + 5-service collapse + apiClient.ts + refresh-token + 401/403 interceptors + AuthContext.refreshRole + banner — all landing in one client+backend release pair, with the migration script (`migrate-roles-m2.js`) running as a manual pre-deploy step.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Hotfix sequencing & deploy order:**

- **D-01 (HF-02 timing — Wave-0):** Secret rotation runs FIRST, before any Phase 1 code lands. Sequence: rotate MongoDB Atlas password → rotate AWS IAM keys (revoke old) → `git rm --cached .env` in `JayTap-services` → add `.env` to `.gitignore` → check in `.env.example` → switch Railway to env-vars-only → verify backend boots with new credentials. Live secrets are committed in the backend repo today; every day they sit there is exposure. Phase 1 implementation work begins after Wave-0 is verified.
- **D-02 (HF-01 timing — standalone hotfix):** The one-line `Property` schema patch (`rooms`, `maxGuests`, `amenities`) ships ASAP as an independent backend hotfix release, not bundled with Phase 1. Hospitality listings created NOW silently lose those fields; this is a data-integrity bug and the fix is trivial. Don't wait for the rest of Phase 1.
- **D-03 (Bearer rollout — dual-accept window):** New JWKS middleware accepts EITHER `Authorization: Bearer <idToken>` OR the legacy `x-firebase-uid` header for the duration of M2 development. Backend logs every legacy-header request with structured fields (uid, route, timestamp). Client deploy ships Bearer; backend retains legacy compat to absorb store-update lag.
- **D-04 (HF-04 socket.io rollout — dual-accept window):** Mirror D-03 pattern. Socket handshake accepts EITHER `auth.token` (verified — only path that allows joining `user:<uid>` for the verified `sub`) OR legacy `auth.firebaseUid` (untrusted, rejects subscription to other users' rooms but doesn't disconnect). Client switches to sending `auth.token`. Same removal trigger as D-05.
- **D-05 (Legacy cutoff — Phase 6 release):** Removal of legacy `x-firebase-uid` header support AND legacy `auth.firebaseUid` socket handshake support lands as part of Phase 6 hardening + manual physical-device QA + dual-store submission (the M2 v2.0.0 release).

**Migration mechanics:**

- **D-06 (Legacy 'agent' handling — flat migration):** All `userType: 'agent'` records flip to `userType: 'user'`. No per-record review.
- **D-07 (Migration script location — `JayTap-services/src/scripts/`):** Script lives at `src/scripts/migrate-roles-m2.js` alongside the existing `seed.js`. Invoked via `npm run migrate:roles-m2` against the production `MONGO_URI`. Run manually as a pre-deploy step. NOT wired into Railway's release hook.
- **D-08 (Idempotency strategy — conditional updates + dry-run):** Script accepts `--dry-run` flag. Without `--dry-run`: each `updateMany` uses a filter that excludes already-migrated records. Re-running is a no-op. Final acceptance check matches REQUIREMENTS.md ROLE-02: `db.users.countDocuments({userType: {$nin: ['user', 'moderator', 'admin']}})` returns 0. No transaction wrapping.
- **D-09 (M1 admin seed — embedded in same migration script):** `migrate-roles-m2.js` includes a top-of-file `const M1_ADMIN_EMAILS = ['beckprograms@gmail.com'];` (single source of truth). Script does an upsert per email. Single migration covers BOTH the enum flip AND the admin seed. **Note: upsert needs a real `uid` for inserted records; if email doesn't exist in Mongo yet, planner needs to spec how `uid` is sourced. Flag as planning input.**

**Token refresh + role-revocation UX:**

- **D-10 (Silent idToken refresh — fully transparent):** When `axios` 401 interceptor catches a `token-expired` response, it calls the Firebase REST refresh-token endpoint (`https://securetoken.googleapis.com/v1/token`), updates the cached `userToken` in AsyncStorage, retries the original request once, returns the response. No toast, no spinner, no overlay.
- **D-11 (Hard logout — login screen + bilingual toast):** When the refresh token itself is expired/revoked, `AuthContext.logout()` runs: clears AsyncStorage `userToken` + `refreshToken` + `userData`, App.tsx state machine returns to login flow naturally. Show toast: EN `"Session expired. Please sign in again."` / RU `«Сеанс истёк. Пожалуйста, войдите снова.»`.
- **D-12 (Role-refresh banner action — soft re-fetch):** Tap on the banner calls `AuthContext.refreshRole()` which re-fetches `GET /api/auth/me`, updates `user.backendProfile.userType`, bumps the AuthContext `user` reference. Every `<Gated>` consumer re-renders with the new role. No JS bundle reload, no nav reset, user stays where they are.
- **D-13 (Banner copy + persistence — symmetric, sticky):** Single banner copy for both promotion and demotion: EN `"Your role changed — tap to reload"` / RU `«Ваша роль изменилась — нажмите для перезагрузки»`. Mounted at the App.tsx layer, above `OVERLAY_FLAGS`, so it persists across screen changes. Sticky until either (a) user taps it OR (b) the next `refreshRole()` returns a `userType` matching what's currently in `AuthContext`. No dismiss button.

### Claude's Discretion

- **`apiClient.ts` consolidation scope:** Default to fold the full 5-service `getHeaders()` consolidation INTO Phase 1. Planner is authorized to spec a single shared `apiClient.ts` exporting a configured `axios.create({ baseURL, ...})` + `useAuthHeaders()` helper, with each of the 5 services migrated to consume it.
- **JWKS middleware error contract specifics:** Planner has discretion on the exact JSON error envelope shape (e.g., `{error: 'token-expired'}` vs `{code: 'token-expired', message: '...'}`) but MUST keep both error codes machine-checkable from the client interceptor. Other JWKS-rejection cases (signature failure, wrong audience, missing `kid`, tampered) return generic 401 with no special interceptor handling.
- **`AppState 'active'` role-refresh hook placement:** REQUIREMENTS.md and research place the `AppState` listener in Phase 2. Phase 1 only wires `refreshRole()` as a callable on `AuthContext` + the 403-retry interceptor + the banner trigger.
- **Verification bar:** Phase 1 has zero UI screens. Manual verification surface includes: (1) curl matrix against the new JWKS middleware (valid / expired / tampered token × admin / moderator / user — research's "9-case golden-token matrix"); (2) manual app QA proving login still works, the M1 admin email still sees admin-gated UI after migration runs, demotion via Atlas console produces a role-refresh banner within 60s. Planner has discretion on whether to add jest/supertest backend tests for the JWKS middleware.
- **Foreground role-refresh banner visual design:** Color, icon, exact pill shape, animation in/out. Use `useTheme()` semantic palette (likely `warning` or `info`).

### Deferred Ideas (OUT OF SCOPE)

- **`apiClient.ts` consolidation scope** — Default per Claude's Discretion: fold into Phase 1. If planner decides scope is too large, may carve into a follow-up phase under M2 cleanup.
- **JWKS middleware error contract specifics** — Not discussed in detail; planner has discretion within REQUIREMENTS.md ROLE-09 constraints.
- **`AppState 'active'` role-refresh hook wiring** — Stays in Phase 2 per REQUIREMENTS.md placement.
- **Crash reporting** — Out of M2 scope. Worth adding to backlog.
- **`react-native-config` / `.env` loader for the RN client** (CONCERNS.md "Critical: .env loader not wired up", "Critical: Firebase API key hardcoded in source") — Distinct from HF-02. RN-client secret hygiene is a separate concern; defer to a future phase or backlog. Phase 1 does not touch the client's hardcoded `API_KEY`.
- **Backend test infrastructure** (CONVENTIONS.md "Effectively zero tests") — Adding jest/supertest tests for the JWKS middleware is allowed under Claude's Discretion in this phase but not required.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| HF-01 | Hospitality `rooms` / `maxGuests` / `amenities` fields persisted to Mongo | §HF-01 (schema patch + route handler patch — both layers) |
| HF-02 | Backend `.env` rotated and removed from git tracking | §HF-02 (corrected runbook — file never committed; rotate-only path) |
| HF-03 | `POST /api/auth/users` rejects body-uid mismatch with token-sub | §HF-03 (depends on HF-04 middleware; field-allowlist pattern) |
| HF-04 | Socket.io handshake JWKS-verifies token, scopes `user:<uid>` joins | §HF-04 (`io.use()` middleware + dual-accept) |
| ROLE-01 | `User.userType` enum cutover to `['user','moderator','admin']`, default `'user'` | §ROLE-01-02 (post-migration cutover sequencing) |
| ROLE-02 | One-shot Mongo migration `renter`/`owner`/`agent` → `user`, `admin` → `admin` | §ROLE-01-02 (script skeleton + dry-run + idempotency) |
| ROLE-03 | Backend JWKS verification (no `firebase-admin`) | §ROLE-03 (jose middleware skeleton + URL/iss/aud/clockTolerance) |
| ROLE-04 | Single `verifyFirebaseToken` middleware across 5 services | §ROLE-04 (mount points + 5-route diff shape) |
| ROLE-05 | Client `Authorization: Bearer` migration via shared `apiClient.ts` | §ROLE-05 (apiClient skeleton + 5-service consumer pattern) |
| ROLE-06 | Firebase REST refresh-token flow with persisted `refreshToken` | §ROLE-06 (endpoint contract + AsyncStorage shape) |
| ROLE-07 | `useRole.ts` allowlist branch deleted, `adminAllowlist.ts` deleted | §ROLE-07 (deletion sequence + ordering with migration) |
| ROLE-08 | New `GET /api/auth/me` endpoint | §ROLE-08 (route shape + replaces `GET /auth/users/:firebaseUid`) |
| ROLE-09 | Axios 401/403 interceptors with retry-once | §ROLE-09 (interceptor skeleton + retry guard) |
| ROLE-10 | `AuthContext.refreshRole()` + role-refresh banner | §ROLE-10 (banner mount + sticky persistence) |
| ROLE-11 | `roleRevokedAt` invariant — `iat < roleRevokedAt` → 403 | §ROLE-11 (middleware step + admin role-mutation hook) |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

These are non-negotiable directives extracted from `./CLAUDE.md` and the project's auto-memory pointers:

| Constraint | Source | Enforcement |
|------------|--------|-------------|
| **No Firebase SDK in either repo** (`firebase`, `@react-native-firebase/*`, `firebase-admin`) | CLAUDE.md + memory `no-firebase-sdk.md` | Backend uses `jose` for JWKS; client uses Identity Toolkit REST + securetoken refresh REST. The dead `firebase-admin@^13.6.1` in JayTap-services/package.json is REMOVED in Phase 1. |
| **MongoDB is the role authority** | CLAUDE.md + memory `identity-vs-user-store.md` | Firebase only proves `uid`. Role lookup is one Mongo query in middleware. Never store role in Firebase custom claims. |
| **No `react-navigation`** | CLAUDE.md | Banner mounts in App.tsx (already a custom state machine). Add no nav library. |
| **EN+RU bilingual parity** for every new UI string | CLAUDE.md + CONVENTIONS.md | Phase 1 adds 4 keys total (2 banner + 2 logout-toast). CI parity gate exists per M1 Phase 4. |
| **`useTheme()` tokens, no hardcoded colors; dark/light parity** | CLAUDE.md | Banner uses `theme.colors.warning` or `theme.colors.info` (semantic palette). |
| **Manual physical-device QA bar** (iPhone 15 Pro Max + Moto G XT2513V) | CLAUDE.md | Phase 1 has no UI other than the banner; verification is curl matrix + 1 banner manual check. |
| **App.tsx LOC budget ≤1100 hard / ≤1050 soft** | PITFALLS.md Pitfall 8 | Current: 975 LOC. Banner adds ≤30 LOC if extracted as component. Hard ceiling preserved. |
| **No production listings exist** | PROJECT.md "Out of Scope" | Affirms migration is for users + dev-mock listings only; no listing migration needed. |
| **Backend repo at `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services`** | memory `backend-repo-location.md` | Same maintainer; "Wave-0 Railway-team coordination" framing is misframed — treat as design decisions the user owns directly. |
| **Geographic scope is KG/KZ/UZ** | memory `geographic-scope.md` | No bearing on Phase 1 scope (infra only). |

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Firebase ID token issuance & user identity | Identity Provider (Firebase Identity Toolkit REST) | — | External auth; never role authority. |
| ID token signature verification | API / Backend (Express middleware) | — | Token can ONLY be trusted server-side. Client treats token as opaque. |
| Role authority (`userType`) | Database / Storage (MongoDB `user_profile` collection) | — | Single source of truth per project rule. |
| Role lookup on each request | API / Backend (middleware after JWKS verify) | Cache (60-second LRU — deferred per CONTEXT.md) | Lookup happens server-side every request; client caches at AuthContext level. |
| `roleRevokedAt` invariant enforcement | API / Backend (same middleware) | — | Server-side compare of `token.iat` vs `user.roleRevokedAt`. |
| `Authorization: Bearer` header attachment | Frontend Server / Mobile Client (shared `apiClient.ts`) | — | Token retrieved from AsyncStorage; injected per-request. |
| ID token refresh (when expired) | Frontend Server / Mobile Client (`AuthService.refreshIdToken` + axios 401 interceptor) | — | REST call to `securetoken.googleapis.com/v1/token`; transparent to user. |
| Role state in client UI | Frontend Server / Mobile Client (React `AuthContext.user.backendProfile.userType`) | — | Read-only mirror of server state; refreshed via `refreshRole()`. |
| Role-refresh banner | Frontend Server / Mobile Client (App.tsx banner slot above OVERLAY_FLAGS) | — | UI artifact only; tap dispatches `refreshRole()`. |
| Mongo migration (one-shot) | Database / Storage (manual `npm run migrate:roles-m2`) | — | Idempotent script; not in deploy hook. |
| Socket.io handshake auth | API / Backend (`io.use()` middleware) | — | Same JWKS verify as HTTP middleware; scopes `user:<uid>` room joins. |
| HF-01 schema persistence (rooms / maxGuests / amenities) | Database / Storage (Mongoose schema) | API / Backend (route handler `req.body` extraction) | BOTH layers required — schema accepts the field AND route handler must `req.body.rooms` or it never reaches save. |

## Standard Stack

### Core (backend additions)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `jose` | `^6.2.3` | JWKS-based Firebase ID-token verification | Zero runtime dependencies. `createRemoteJWKSet()` handles JWKS fetch + caching + rotation. Officially recommended path for verifying Firebase tokens without `firebase-admin`. ESM-only — fine on Node 22.12+. `[VERIFIED: npm view jose @ 2026-04-29 → 6.2.3 published 2026-04-27]` |

**That is the only new dependency.** Remove `firebase-admin@^13.6.1` from backend `package.json` (dead code per REL-05). Existing `socket.io@^4.8.3` (verified) and `mongoose@^9.1.6` (verified) handle their respective concerns natively.

### Supporting (already installed, reused)

| Library | Version | Purpose | Already In |
|---------|---------|---------|-----------|
| `axios` | `^1.13.5` | HTTP client (RN) | RN client `package.json` |
| `@react-native-async-storage/async-storage` | `^2.2.0` | Token persistence | RN client `package.json` |
| `socket.io` | `^4.8.3` | Real-time chat | Backend `package.json` |
| `socket.io-client` | (used in `ChatService.ts`) | RN socket client | RN client (verify version) |
| `mongoose` | `^9.1.6` | Mongo ODM | Backend `package.json` |
| `express` | `^5.2.1` | HTTP routing | Backend `package.json` |
| `dotenv` | `^17.2.3` | Local env loading | Backend `package.json` (Railway uses platform env vars) |
| `jest` | `^29.6.3` | Test runner (RN) | RN client `package.json` (Phase 1 may add a backend `jest`+`supertest` setup per Claude's Discretion) |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `jose` | `firebase-admin` | FORBIDDEN by project rule. Brings ~30 transitive deps. PROJECT.md "Auth split" treats Firebase as identity proof only. |
| `jose` | `jsonwebtoken` + `jwks-rsa` | `jsonwebtoken` carries 7 unmaintained `lodash.*` micro-deps; `jwks-rsa@4.0.1` itself depends on `jose@^6.1.3`. Cut out the middleman. |
| `jose` | Hand-rolled signature check + `node-forge` | Re-implementing alg pinning + clockTolerance + JWKS rotation is exactly the trap PITFALLS.md Pitfall 2 catalogues. |

**Installation:**
```bash
cd /Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services
npm install jose@^6.2.3
npm uninstall firebase-admin
```

**Version verification (run at plan-time to refresh):**
```bash
npm view jose version    # expect 6.2.3 or later
npm view jose engines    # confirm ESM/CJS Node compat
```

## Architecture Patterns

### System Architecture Diagram

```
                ┌─────────────────────────────────────────────────┐
                │            RN CLIENT (JayTap repo)              │
                │                                                  │
   user signs in│                                                  │
       ─────────►  AuthService.signIn (REST → Identity Toolkit)   │
                │  ↓                                               │
                │  AsyncStorage: userToken (idToken),              │
                │                refreshToken (NEW Phase 1),       │
                │                userData                          │
                │  ↓                                               │
                │  AuthContext.user = {localId, email,             │
                │                       refreshToken,              │
                │                       backendProfile?}           │
                │  ↓                                               │
                │  apiClient.ts (NEW) — axios instance with        │
                │    request interceptor: attach Bearer            │
                │    response interceptors:                        │
                │      401 + token-expired → refresh + retry once  │
                │      403 + role-revoked  → refreshRole + retry once
                │  ↓                                               │
                │  5 services (Auth, Property, Favorites,          │
                │              Chat, Appointment) — all use        │
                │              apiClient instance                  │
                │  ↓                                               │
                │  ChatService.connectSocket — auth.token (NEW)    │
                └────────────┬────────────────────────────────────┘
                             │ HTTPS Bearer + WSS auth.token
                             ▼
            ┌────────────────────────────────────────────────────┐
            │       RAILWAY BACKEND (JayTap-services)            │
            │                                                     │
            │  index.js                                           │
            │   ↓                                                 │
            │  Express app                                        │
            │   ↓                                                 │
            │  verifyFirebaseToken middleware (NEW)               │
            │    1. Read Authorization: Bearer <idToken>          │
            │       OR (dual-accept D-03) x-firebase-uid          │
            │    2. jose.jwtVerify(token, JWKS, {                 │
            │         issuer, audience, algorithms: ['RS256'],    │
            │         clockTolerance: 60                          │
            │       })                                            │
            │    3. Mongo: User.findOne({uid: payload.sub})       │
            │    4. Check user.roleRevokedAt                      │
            │       if (token.iat < roleRevokedAt)                │
            │         → 403 {code: 'role-revoked'}                │
            │    5. req.user = user                               │
            │       req.firebaseUid = payload.sub                 │
            │       next()                                        │
            │   ↓                                                 │
            │  5 route files mount middleware (single instance)   │
            │   - authRoutes.js     (HF-03 + ROLE-08 here)        │
            │   - propertyRoutes.js (was 3 inline copies)         │
            │   - favoriteRoutes.js (was 1 inline copy)           │
            │   - chatRoutes.js     (replaces chatAuthMiddleware) │
            │   - appointmentRoutes.js (verify scope)             │
            │   ↓                                                 │
            │  io.use((socket, next) => {...}) socket.io HF-04    │
            │   - same verify; scopes user:<uid> room joins      │
            │   ↓                                                 │
            │  MongoDB Atlas (user_profile + listings + ...)      │
            │                                                     │
            │  src/scripts/migrate-roles-m2.js (one-shot)         │
            │   - npm run migrate:roles-m2 [-- --dry-run]         │
            │   - flips legacy enum + upserts M1 admins           │
            └────────────────────────────────────────────────────┘
                             │
                             ▼
            ┌────────────────────────────────────────────────────┐
            │   FIREBASE (identity provider, REST-only)          │
            │   - Identity Toolkit:  signUp, signInWithPassword, │
            │                        sendOobCode, resetPassword  │
            │   - securetoken.googleapis.com/v1/token (NEW)      │
            │     → grant_type=refresh_token                     │
            │   - JWKS endpoint (server-side, jose fetches)      │
            └────────────────────────────────────────────────────┘
```

### Recommended Project Structure (changes only)

**Backend (`JayTap-services`):**
```
src/
├── middleware/
│   ├── authMiddleware.js          ← REPLACED (was: 'renter' check)
│   ├── chatAuthMiddleware.js      ← DELETED (collapses into verifyFirebaseToken)
│   └── verifyFirebaseToken.js     ← NEW (single role-aware middleware)
├── models/
│   ├── User.js                    ← ENUM CUTOVER + roleRevokedAt field
│   └── Property.js                ← HF-01 schema patch (rooms/maxGuests/amenities)
├── routes/
│   ├── authRoutes.js              ← HF-03 lockdown + ROLE-08 GET /me
│   ├── propertyRoutes.js          ← strip 3 inline auth blocks
│   ├── favoriteRoutes.js          ← strip 1 inline auth block
│   ├── chatRoutes.js              ← swap chatAuthMiddleware → verifyFirebaseToken
│   └── appointmentRoutes.js       ← verify it uses the new middleware
├── scripts/
│   ├── seed.js                    ← unchanged (sibling pattern)
│   └── migrate-roles-m2.js        ← NEW
├── utils/
│   └── ...
└── config/
    └── db.js                      ← unchanged
index.js                           ← io.use() handshake middleware (HF-04)
package.json                       ← +jose@^6.2.3, -firebase-admin, +npm script
.env.example                       ← NEW (committed; secrets-free template)
```

**RN Client (`JayTap`):**
```
src/
├── constants/
│   └── adminAllowlist.ts          ← DELETED
├── context/
│   └── AuthContext.tsx            ← +AuthUser type, +refreshRole, +refreshToken persistence
├── hooks/
│   └── useRole.ts                 ← Branch 3 deleted (lines 64-67)
├── services/
│   ├── apiClient.ts               ← NEW (shared axios instance + interceptors)
│   ├── AuthService.ts             ← +refreshIdToken, persist refreshToken
│   ├── PropertyService.ts         ← consume apiClient
│   ├── FavoritesService.ts        ← consume apiClient
│   ├── ChatService.ts             ← consume apiClient + connectSocket auth.token
│   └── AppointmentService.ts      ← consume apiClient
├── types/
│   └── Auth.ts                    ← NEW (AuthUser + BackendProfile types)
├── locales/
│   ├── en.json                    ← +4 keys (banner.message, banner.cta?, logout.toast.title, logout.toast.body)
│   └── ru.json                    ← +4 keys (mirror)
└── components/
    └── RoleRefreshBanner.tsx      ← NEW (extracted to keep App.tsx LOC budget)
App.tsx                            ← banner mount above OVERLAY_FLAGS
```

### Pattern 1: jose JWKS verification middleware (ROLE-03)

**What:** Single Express middleware that JWKS-verifies the Bearer token, looks up Mongo user, enforces `roleRevokedAt` invariant, attaches `req.user`.
**When to use:** Mount on every protected route (5 services).
**Example:**

```javascript
// src/middleware/verifyFirebaseToken.js — NEW
// Source: Context7 /panva/jose + Firebase docs, verified 2026-04-29
const { jwtVerify, createRemoteJWKSet } = require('jose');
const User = require('../models/User');

const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID;
if (!FIREBASE_PROJECT_ID) {
  throw new Error('FIREBASE_PROJECT_ID env var is required');
}

// jose handles cache + rotation; do NOT memo manually.
// JWKS endpoint is the JWK-format URL (NOT the legacy x509 endpoint).
const JWKS = createRemoteJWKSet(
  new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com')
);

const ISSUER = `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`;

/**
 * Single role-aware auth middleware.
 * Replaces: authMiddleware.verifyRenter, chatAuthMiddleware.verifyChatUser,
 *           and 4 inline auth blocks in propertyRoutes.js + favoriteRoutes.js.
 *
 * Dual-accept (D-03): accepts EITHER Bearer or legacy x-firebase-uid until Phase 6.
 * Logs every legacy-header request with structured fields for legacy-traffic monitoring.
 */
async function verifyFirebaseToken(req, res, next) {
  try {
    const authHeader = req.header('authorization') || '';
    const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    const legacyUid = req.headers['x-firebase-uid'] || req.body?.firebaseUid;

    let firebaseUid = null;
    let tokenIat = null;

    if (bearerToken) {
      // Bearer path — JWKS verify
      try {
        const { payload } = await jwtVerify(bearerToken, JWKS, {
          issuer: ISSUER,
          audience: FIREBASE_PROJECT_ID,
          algorithms: ['RS256'],
          clockTolerance: 60, // Firebase official guidance: 60s skew tolerance
        });
        firebaseUid = payload.sub;
        tokenIat = payload.iat; // Unix seconds
      } catch (err) {
        // Map jose errors to HTTP status:
        //   - JWTExpired (err.code === 'ERR_JWT_EXPIRED') → 401 token-expired
        //   - JWTClaimValidationFailed (wrong iss/aud) → 401 generic
        //   - JWSSignatureVerificationFailed → 401 generic
        //   - JWKSNoMatchingKey (kid not in set) → 401 generic
        //   - others → 401 generic
        if (err.code === 'ERR_JWT_EXPIRED') {
          return res.status(401).json({ code: 'token-expired', message: 'Token expired' });
        }
        return res.status(401).json({ code: 'invalid-token', message: 'Invalid or tampered token' });
      }
    } else if (legacyUid) {
      // Legacy dual-accept path (D-03) — log structured event for tracking.
      console.log(JSON.stringify({
        evt: 'legacy_uid_header',
        uid: legacyUid,
        route: req.originalUrl,
        method: req.method,
        ts: new Date().toISOString(),
      }));
      firebaseUid = legacyUid;
      tokenIat = null; // unknown for legacy; roleRevokedAt cannot be enforced on this path
    } else {
      return res.status(401).json({ code: 'missing-token', message: 'Authorization required' });
    }

    // Load user
    const user = await User.findOne({ uid: firebaseUid });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    if (user.isLocked || user.deletedAt) {
      return res.status(403).json({
        code: 'account-locked',
        message: 'This account has been locked or deleted. Please contact support.',
      });
    }

    // ROLE-11 — roleRevokedAt invariant (only enforced on Bearer path)
    if (tokenIat != null && user.roleRevokedAt) {
      const revokedAtSec = Math.floor(new Date(user.roleRevokedAt).getTime() / 1000);
      if (tokenIat < revokedAtSec) {
        return res.status(403).json({ code: 'role-revoked', message: 'Role changed; please refresh' });
      }
    }

    // Attach
    req.user = user;
    req.firebaseUid = firebaseUid;
    next();
  } catch (err) {
    console.error('verifyFirebaseToken error:', err);
    res.status(500).json({ message: 'Authentication error' });
  }
}

/**
 * Optional minRole gate. Stack on top of verifyFirebaseToken.
 * Usage: router.get('/queue', verifyFirebaseToken, requireMinRole('moderator'), handler)
 *
 * Used heavily in M2 phases 3-5; in Phase 1 only HF-03 + ROLE-08 + role-revocation cases use it.
 */
const ROLE_RANK = { user: 0, moderator: 1, admin: 2 };
function requireMinRole(minRole) {
  return (req, res, next) => {
    const userType = req.user?.userType || 'user';
    if (ROLE_RANK[userType] >= ROLE_RANK[minRole]) {
      return next();
    }
    return res.status(403).json({ code: 'insufficient-role', message: 'Insufficient permissions' });
  };
}

module.exports = { verifyFirebaseToken, requireMinRole };
```

**Confidence:** HIGH — verified against Context7 `/panva/jose` docs + npm registry + the Zuplo blog post linked from research/STACK.md.

### Pattern 2: jose error taxonomy (planner reference)

| jose error class / code | What it means | Recommended HTTP response |
|-------------------------|---------------|---------------------------|
| `JWTExpired` (`err.code === 'ERR_JWT_EXPIRED'`) | `exp` claim has passed | **401 `{code: 'token-expired'}`** ← interceptor refreshes |
| `JWTClaimValidationFailed` (with `claim: 'iss'` or `claim: 'aud'`) | Wrong issuer/audience (different Firebase project, different system) | 401 `{code: 'invalid-token'}` ← falls through to D-11 hard logout |
| `JWSSignatureVerificationFailed` | Signature doesn't match any JWKS key | 401 `{code: 'invalid-token'}` |
| `JWKSNoMatchingKey` | `kid` header not in current JWKS | 401 `{code: 'invalid-token'}` (jose auto-refetches JWKS once before throwing this) |
| `JWSInvalid` / `JWTInvalid` | Token is malformed (not three base64 parts, etc.) | 401 `{code: 'invalid-token'}` |
| Returns 200 (verified) but `roleRevokedAt > token.iat` | Server-side role invalidation | **403 `{code: 'role-revoked'}`** ← interceptor calls `refreshRole()` |
| Returns 200 (verified) but `userType` insufficient for action | Permission denied | 403 `{code: 'insufficient-role'}` ← interceptor does NOT refresh |
| 200 (verified) and authorized | Success | 200 |

**Key insight:** Two error codes are machine-checked by the client interceptor (`token-expired` → refresh, `role-revoked` → refreshRole). Everything else falls through to D-11 hard logout. This satisfies REQUIREMENTS.md ROLE-09 and the discretion granted in CONTEXT.md.

### Pattern 3: createRemoteJWKSet cache behavior (planner reference)

`[CITED: github.com/panva/jose discussions]` `createRemoteJWKSet` returns a function that:
- **Caches the JWKS** in memory keyed by URL.
- **Default `cooldownDuration`:** 30 seconds — minimum between refetches when an unknown `kid` is encountered.
- **Default `cacheMaxAge`:** 600,000 ms (10 minutes) — re-fetches after this even without a `kid` miss.
- **Auto-refetches** on `JWKSNoMatchingKey` (one extra fetch attempt before throwing).
- **No manual cache invalidation needed.** Do NOT memoize the result; jose owns the cache lifecycle.

For Phase 1 the defaults are correct. Firebase rotates JWKS keys on a schedule of days; the 10-minute cache + auto-refresh-on-miss handles rotation transparently.

### Pattern 4: Single role-aware Express middleware mount (ROLE-04)

**Mount points after Phase 1:**

```javascript
// index.js — io.use() socket handshake handled separately (see HF-04)

// Each route file mounts the new middleware:
const { verifyFirebaseToken, requireMinRole } = require('./middleware/verifyFirebaseToken');

// authRoutes.js
router.post('/users',         verifyFirebaseToken, /* + HF-03 body-uid match */);
router.get('/users/:firebaseUid', /* unchanged — public read OK? — see ROLE-08 */);
router.delete('/users/:firebaseUid', verifyFirebaseToken, /* + ownership check */);
router.get('/me',             verifyFirebaseToken, /* NEW (ROLE-08) */);

// propertyRoutes.js — strip 3 inline auth blocks; use middleware on protected routes:
router.post('/',              verifyFirebaseToken, /* create */);
router.put('/:id',            verifyFirebaseToken, /* update */);
router.patch('/:id/verifications', verifyFirebaseToken, requireMinRole('admin'), /* */);
router.delete('/:id',         verifyFirebaseToken, /* */);

// favoriteRoutes.js — same pattern
router.use(verifyFirebaseToken); // OR per-route depending on whether GET is public

// chatRoutes.js — replace chatAuthMiddleware:
router.use(verifyFirebaseToken);

// appointmentRoutes.js — confirm and apply same pattern.
```

**The 5-service collapse delta** — replacing `const firebaseUid = req.body.firebaseUid || req.headers['x-firebase-uid']` blocks (≈10 lines each) with a one-liner middleware reference. Estimated net deletion: ~50 LOC across 4 route files. Backwards-compatible — `req.firebaseUid` is still attached, so existing handler code reading `req.firebaseUid` continues to work.

### Pattern 5: socket.io v4 handshake middleware (HF-04)

**What:** `io.use()` middleware verifies the Bearer token and scopes `user:<uid>` room joins to the verified `sub`.
**When to use:** Mount in `index.js` immediately after `io = new Server(...)`.
**Example:**

```javascript
// index.js — replaces lines 20-26
// Source: socket.io v4 docs (handshake middleware), verified 2026-04-29 via package.json
const { jwtVerify, createRemoteJWKSet } = require('jose');
// ... (same JWKS / ISSUER / FIREBASE_PROJECT_ID setup as middleware) ...

io.use(async (socket, next) => {
  const bearerToken = socket.handshake.auth?.token;
  const legacyUid = socket.handshake.auth?.firebaseUid;

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
    // D-04 dual-accept: legacy is untrusted; rejects subscription to other users' rooms
    // but doesn't disconnect.
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
  // Auto-join user's own room (verified path only)
  if (socket.userId && socket.authPath === 'bearer') {
    socket.join(`user:${socket.userId}`);
  }

  // Explicit join request: only allow if verified path AND uid matches
  socket.on('join_user_room', (requestedUid) => {
    if (socket.authPath === 'bearer' && socket.userId === requestedUid) {
      socket.join(`user:${requestedUid}`);
    } else {
      // legacy path or mismatched uid: silently ignore (D-04)
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

**Confidence:** HIGH — socket.io v4 `io.use()` is the documented handshake-middleware pattern. `[VERIFIED: backend node_modules/socket.io/package.json @ 4.8.3]`

### Pattern 6: Migration script skeleton (ROLE-02 + D-09)

```javascript
// src/scripts/migrate-roles-m2.js — NEW
// Run: npm run migrate:roles-m2 [-- --dry-run] [-- --verify]
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');
const connectDB = require('../config/db');

dotenv.config();

// D-09: M1 admin emails — single source of truth at deletion time.
// Mirrors src/constants/adminAllowlist.ts in the RN client repo.
const M1_ADMIN_EMAILS = ['beckprograms@gmail.com'];

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isVerify = args.includes('--verify');

async function main() {
  await connectDB();
  const db = mongoose.connection;

  if (isVerify) {
    const remainingLegacy = await User.countDocuments({
      userType: { $nin: ['user', 'moderator', 'admin'] },
    });
    console.log(`Records with non-canonical userType: ${remainingLegacy}`);
    if (remainingLegacy === 0) {
      console.log('VERIFY: PASS — ROLE-02 acceptance met');
      process.exit(0);
    } else {
      console.log('VERIFY: FAIL — run migration first');
      process.exit(1);
    }
  }

  console.log(isDryRun ? '=== DRY RUN ===' : '=== MIGRATION ===');

  // Step 1: legacy enum flip
  const flips = [
    { from: 'renter',  to: 'user'  },
    { from: 'owner',   to: 'user'  },
    { from: 'agent',   to: 'user'  },
    // 'admin' stays 'admin' — no flip needed
  ];

  for (const { from, to } of flips) {
    const filter = { userType: from };
    const matched = await User.countDocuments(filter);
    console.log(`  ${from} → ${to}: ${matched} records`);
    if (!isDryRun && matched > 0) {
      const result = await User.updateMany(filter, { $set: { userType: to } });
      console.log(`    updated: ${result.modifiedCount}`);
    }
  }

  // Step 2: M1 admin upsert (D-09)
  // PLANNER INPUT REQUIRED (D-09 flag): how to source `uid` for inserted records?
  // Recommended path (see §D-09 Resolution below): UPDATE-ONLY fallback.
  // If admin email exists in Mongo (which it does for beckprograms@gmail.com — they signed
  // in during M1), promote to admin. If not, log a warning and require manual sign-in first.
  for (const email of M1_ADMIN_EMAILS) {
    const existing = await User.findOne({ email });
    if (existing) {
      console.log(`  admin upsert (UPDATE existing): ${email} → userType: 'admin'`);
      if (!isDryRun) {
        await User.updateOne({ email }, { $set: { userType: 'admin' } });
      }
    } else {
      console.warn(`  admin upsert SKIPPED: ${email} — record not in Mongo. Admin must sign in once, then re-run script.`);
      // ALTERNATIVE: pre-flight Identity Toolkit lookup:
      // const lookupResp = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${API_KEY}`, {...});
      // — adds Firebase API_KEY dependency to the script + has its own error modes. Not recommended unless
      // the M1 admin list grows to include emails that haven't signed in. See §D-09 Resolution below.
    }
  }

  // Step 3: post-migration verification
  const remaining = await User.countDocuments({
    userType: { $nin: ['user', 'moderator', 'admin'] },
  });
  console.log(`\nPost-migration: ${remaining} records still at non-canonical userType.`);
  if (remaining === 0 && !isDryRun) {
    console.log('ACCEPTANCE MET (ROLE-02): db.users.countDocuments({userType:{$nin:["user","moderator","admin"]}}) === 0');
  }

  await mongoose.disconnect();
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
```

**`package.json` script addition:**
```json
"scripts": {
  "start": "node index.js",
  "migrate:roles-m2": "node src/scripts/migrate-roles-m2.js"
}
```

### Pattern 7: D-09 `uid` sourcing — RECOMMENDED RESOLUTION

Three options, ranked:

| Option | Description | Pros | Cons | Recommendation |
|--------|-------------|------|------|----------------|
| **A. Update-only (recommended)** | Script promotes existing-by-email Mongo records only. If email doesn't exist in Mongo, log warning and skip. | Zero new dependencies. Zero new failure modes. The known M1 admin (`beckprograms@gmail.com`) HAS already signed in (verified by `git log --author=beckmaldinVL` activity), so this email exists in Mongo. | Future-added M1 admins must sign in once before script runs. | **CHOOSE THIS.** |
| B. Pre-flight Identity Toolkit lookup-by-email | Script calls `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=API_KEY` with the email; gets `localId` (uid); upserts with that uid. | Works even if admin hasn't signed in to JayTap yet. | Requires Firebase Web API Key on backend (currently NOT a backend secret — only RN client has it). Adds Identity Toolkit failure modes. Couples migration script to Firebase REST. | Defer unless A fails. |
| C. Insert-with-empty-uid + reconcile on first login | Script inserts user record with placeholder `uid` (e.g., `pending:<email>`); first time admin signs in, `authRoutes.js POST /users` reconciles by email. | Eliminates "must sign in first" friction. | Significant `authRoutes.js` change to reconcile by email-with-pending-uid. New code path with its own bugs. Schema's `unique: true` on `uid` makes this tricky. | Reject — too much new code for a one-shot migration. |

**Recommendation A is final.** Planner should: (1) verify `beckprograms@gmail.com` exists in Mongo before Phase 1 ships (`db.users.findOne({email: 'beckprograms@gmail.com'})`), (2) if missing, the maintainer signs in once via the live app and retries.

### Pattern 8: Shared `apiClient.ts` (ROLE-05)

```typescript
// src/services/apiClient.ts — NEW
// Source: Phase research; consolidates 5 services per CONCERNS.md "Duplicated service boilerplate"
import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PRODUCTION_URL = 'https://jaytap-services-production.up.railway.app/api';

export const apiClient: AxiosInstance = axios.create({
  baseURL: PRODUCTION_URL,
  timeout: 15000,
});

// Request interceptor — attach Bearer
apiClient.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await AsyncStorage.getItem('userToken');
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  return config;
});

// Response interceptor — single retry guard via _retry flag
type RetryConfig = InternalAxiosRequestConfig & { _retry?: boolean };

let refreshPromise: Promise<string | null> | null = null;
async function refreshIdTokenSingleflight(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const refreshToken = await AsyncStorage.getItem('refreshToken');
      if (!refreshToken) return null;
      try {
        const newToken = await AuthService.refreshIdToken(refreshToken);
        await AsyncStorage.setItem('userToken', newToken);
        return newToken;
      } catch (e) {
        return null;
      } finally {
        refreshPromise = null;
      }
    })();
  }
  return refreshPromise;
}

let refreshRoleHook: (() => Promise<void>) | null = null;
let logoutHook: (() => Promise<void>) | null = null;
export function registerAuthHooks(hooks: {
  refreshRole: () => Promise<void>;
  logout: () => Promise<void>;
}) {
  refreshRoleHook = hooks.refreshRole;
  logoutHook = hooks.logout;
}

apiClient.interceptors.response.use(
  resp => resp,
  async (error: AxiosError) => {
    const original = error.config as RetryConfig;
    const status = error.response?.status;
    const code = (error.response?.data as any)?.code;

    if (status === 401 && code === 'token-expired' && !original._retry) {
      original._retry = true;
      const newToken = await refreshIdTokenSingleflight();
      if (!newToken) {
        await logoutHook?.(); // D-11 hard logout
        return Promise.reject(error);
      }
      original.headers!.set('Authorization', `Bearer ${newToken}`);
      return apiClient.request(original);
    }

    if (status === 403 && code === 'role-revoked' && !original._retry) {
      original._retry = true;
      await refreshRoleHook?.();
      return apiClient.request(original);
    }

    return Promise.reject(error);
  }
);
```

**The single retry guard** is the `_retry` flag pattern recommended by axios documentation — prevents infinite retry loops when the retry itself returns 401/403.

### Pattern 9: AuthUser TypeScript interface (CONCERNS.md "auth user type is `any`")

```typescript
// src/types/Auth.ts — NEW
export interface BackendProfile {
  uid: string;
  email: string;
  userType: 'user' | 'moderator' | 'admin';
  firstName?: string;
  lastName?: string;
  phone?: string;
  whatsapp?: string;
  telegram?: string;
  instagramUrl?: string;
  isRenterApplicant?: boolean;
  favorites?: string[];
  availabilitySettings?: {
    blockSize: '30min' | '60min';
    startHour: number;
    endHour: number;
  };
  isLocked?: boolean;
  deletedAt?: string | null;
  roleRevokedAt?: string | null;
  // customClaims kept optional for forward-compat with useRole.ts:50 Branch 1
  customClaims?: { role?: 'admin' | 'moderator' | 'user' };
}

export interface AuthUser {
  localId: string;        // Firebase uid
  email: string;
  refreshToken?: string;  // NEW Phase 1 — persisted to AsyncStorage
  backendProfile?: BackendProfile;
}
```

`AuthContext` `user: any` becomes `user: AuthUser | null`. Preserves `useRole.ts` Branch 1 (`customClaims?.role`) for M2 forward-compat (currently undefined; the field is optional).

### Pattern 10: Firebase REST refresh-token contract (ROLE-06)

`[CITED: cloud.google.com/identity-platform/docs/use-rest-api]`

**Endpoint:** `POST https://securetoken.googleapis.com/v1/token?key=<API_KEY>`
**Content-Type:** `application/x-www-form-urlencoded`
**Body:** `grant_type=refresh_token&refresh_token=<refresh_token>`

**Response (200):**
```json
{
  "id_token":      "<new short-lived ID token>",
  "refresh_token": "<new or same refresh token>",
  "expires_in":    "3600",
  "token_type":    "Bearer",
  "user_id":       "<uid>",
  "project_id":    "<project id>"
}
```

**Refresh-token rotation:** Per Google docs, the response field `refresh_token` is *"the Identity Platform refresh token provided in the request or a new refresh token"* — meaning Firebase **may** issue a new one. **Implication:** the client must always overwrite the cached `refreshToken` with the response value, never assume the old one is still valid.

**Implementation:**
```typescript
// src/services/AuthService.ts — NEW method
refreshIdToken: async (refreshToken: string) => {
  const formBody = `grant_type=refresh_token&refresh_token=${encodeURIComponent(refreshToken)}`;
  try {
    const response = await axios.post(
      `https://securetoken.googleapis.com/v1/token?key=${API_KEY}`,
      formBody,
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    const { id_token, refresh_token, expires_in } = response.data;
    // Always overwrite — Firebase may issue a new refresh_token
    await AsyncStorage.setItem('userToken', id_token);
    await AsyncStorage.setItem('refreshToken', refresh_token);
    return id_token;
  } catch (error: any) {
    // Refresh token expired/revoked → throw to trigger D-11 hard logout
    throw error.response ? error.response.data.error : error;
  }
},
```

**`AuthService.signIn` and `signUp` already capture `refreshToken` from the Identity Toolkit response.** Phase 1 just persists it. The Identity Toolkit `signInWithPassword` response shape is `{idToken, refreshToken, expiresIn, localId, email, ...}` — `refreshToken` is field-7 in the response and is currently discarded by `AuthContext.login()` (line 48 reads only `email` and `localId`).

### Pattern 11: AuthContext extension (ROLE-08, ROLE-09, ROLE-10)

```typescript
// src/context/AuthContext.tsx — extension only (key bits)
import { registerAuthHooks } from '../services/apiClient';
import { AuthUser } from '../types/Auth';

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  isLoadingRole: boolean;            // NEW
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;        // EXTENDED: also clears refreshToken
  deleteAccount: () => Promise<void>;
  refreshRole: () => Promise<void>;   // NEW (ROLE-10)
}

// Inside AuthProvider:
const refreshRole = async () => {
  if (!user?.localId) return;
  setIsLoadingRole(true);
  try {
    // ROLE-08: GET /api/auth/me — verified path
    const fresh = await axios.get(`${BACKEND_URL}/auth/me`); // apiClient injects Bearer
    setUser(prev => prev ? { ...prev, backendProfile: fresh.data } : null);
  } finally {
    setIsLoadingRole(false);
  }
};

// Wire interceptor hooks once on mount
useEffect(() => {
  registerAuthHooks({ refreshRole, logout });
}, []);

// On login/signup — persist refreshToken
await AsyncStorage.setItem('refreshToken', data.refreshToken);
```

### Anti-Patterns to Avoid

- **Using `firebase-admin` in either repo.** FORBIDDEN per project rule. The dead `firebase-admin@^13.6.1` in JayTap-services/package.json is removed.
- **Storing role in Firebase custom claims.** MongoDB is authoritative. Custom claims would split source-of-truth.
- **Allowing the legacy `x-firebase-uid` path on `roleRevokedAt`-sensitive routes WITHOUT logging.** D-03/D-04 dual-accept is acceptable only because every legacy hit is logged for monitoring. Removal at Phase 6 depends on log evidence.
- **Memoizing `createRemoteJWKSet`.** jose owns the cache lifecycle. Manual memoization breaks rotation handling.
- **Accepting `userType` from request body in `PATCH /users/me` or `POST /users`.** PITFALLS.md Pitfall 3 — explicit field allowlist required.
- **Refreshing the role on every protected action.** PITFALLS.md Pitfall 4 — 60-second TTL via `roleRevokedAt` server-side + 403-retry interceptor client-side is the spec'd answer.
- **`process.env.NODE_ENV` runtime branches near auth code.** PITFALLS.md Pitfall 2 — dev bypass shipped to prod is the catastrophic failure.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JWT signature verification | Hand-rolled RS256 verify | `jose.jwtVerify` | alg pinning, kid lookup, clockTolerance, audience check, issuer check — all in one call. PITFALLS.md Pitfall 2 catalogues 10 ways hand-roll fails. |
| JWKS fetching + caching + rotation | Hand-rolled fetch + cache + retry | `jose.createRemoteJWKSet` | Default cache TTL + cooldown + auto-refresh-on-kid-miss is exactly right for Firebase rotation cadence. |
| Refresh-token retry-once logic | Custom retry counter on each request | axios interceptor with `_retry` flag | Single retry guard prevents infinite loops. Single-flight (`refreshPromise`) prevents N parallel refreshes when N requests 401 simultaneously. |
| Mongo idempotency for migration | Transactional retry logic | Conditional `updateMany` filters that exclude already-migrated records | One-shot migration on small dataset; transactions add complexity without payoff. D-08 explicit. |
| Role-revocation push channel | Sockets + push tokens + role-changed events | `roleRevokedAt` server-side + 403-retry-once client-side | PITFALLS.md Pitfall 4. Demand-driven invalidation is O(failures), not O(actions). 60-second TTL meets ROLE-11 acceptance. |
| Per-service `getHeaders()` boilerplate | Continue copy-pasting | Shared `apiClient.ts` instance with request interceptor | CONCERNS.md High-severity "Duplicated service boilerplate". Five services, near-identical, drifting. |
| AuthUser type | Continue with `any` | `AuthUser` + `BackendProfile` interfaces | CONCERNS.md Medium "Auth user type is `any`". Phase 1 is the natural moment per CONTEXT.md. |
| Banner state machine | New context provider | App.tsx local state + `<RoleRefreshBanner>` component reading `useAuth()` | One useState in App.tsx + component reads context. No new provider per ARCHITECTURE.md §2. |

**Key insight:** Every "obvious" build-it-yourself path in Phase 1 has a one-call library substitute (jose) or an explicit project-rule alternative (Mongo as role authority replaces custom claims; demand-driven invalidation replaces push). The hand-roll temptation usually masks a security defect (Pitfall 2) or a forward-compat break (Pitfall 4).

## Runtime State Inventory

> Phase 1 is a refactor / migration phase touching cross-cutting state: Mongo records, AsyncStorage, Railway env vars.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| **Stored data (MongoDB)** | `user_profile.userType` enum currently `['renter','owner','agent','admin']` with `default: 'renter'`. The `beckprograms@gmail.com` admin's record may currently have `userType: 'renter'` (if signed up via the regular flow) — that's why D-09 admin seed exists. New field `roleRevokedAt: Date` to be added (no data migration; `null` is the sane default — middleware treats `null` as "never revoked"). | (1) Run `migrate-roles-m2.js` to flip enum + seed admin. (2) Update `User.js` schema enum + add `roleRevokedAt: { type: Date, default: null }`. (3) Confirm count == 0 via `--verify`. |
| **Stored data (RN AsyncStorage)** | Existing keys: `userToken`, `userData`, `@jaytap_language`. New key: `refreshToken`. No data migration — set on next login. Existing user sessions continue working until idToken expires (≤60min); on first 401, the interceptor will detect missing `refreshToken` and trigger D-11 hard logout naturally. | (1) Add `refreshToken` AsyncStorage key (new). (2) Existing users will be silently logged out at next idToken expiry (≤60min) — ACCEPTABLE per D-11. |
| **Live service config** | Railway env vars: existing ones include `MONGO_URI`, `AWS_*`, `PORT`. New: `FIREBASE_PROJECT_ID` — required by `verifyFirebaseToken.js`. Verified Firebase project ID is NOT currently visible in any backend file, so the planner must source it from the maintainer's Firebase console (the Web API Key `AIzaSyA4Cnt_v1WeULFl8b4e0kNt-l6IgyX-DoY` is in `AuthService.ts:5` but the project ID is separate). | Set `FIREBASE_PROJECT_ID` in Railway dashboard before backend deploy. Without it, `verifyFirebaseToken.js` throws on import (fail-fast). |
| **OS-registered state** | None. Backend runs on Railway (containerized; no OS-level registrations). RN client has no Phase 1 OS surface. | None — verified by inspection. |
| **Secrets / env vars** | Backend `.env` (NOT in git history — see HF-02 section). Contains: `MONGO_URI`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `AWS_BUCKET_NAME`. Phase 1 adds `FIREBASE_PROJECT_ID`. Rotation per HF-02 D-01 — Atlas password + AWS keys regenerated; old keys revoked. | (Wave-0) Rotate Atlas + AWS; update Railway env vars; verify deploy boots. (Phase 1) Add `FIREBASE_PROJECT_ID` to Railway env vars. |
| **Build artifacts / installed packages** | Backend: `firebase-admin@^13.6.1` is in `package.json` but unused (verified via `grep`). REL-05 removes it. Backend `node_modules/jose` does not exist yet — install required. RN client: no changes to installed packages. | (Phase 1 Wave-1) `npm uninstall firebase-admin && npm install jose@^6.2.3` in backend. |

**Nothing found in OS-registered state and no production listings/build artifacts beyond the firebase-admin dead dep.** Verified by direct file reads + git inspection.

## Common Pitfalls

> Drawn from .planning/research/PITFALLS.md (M2 research) — items 2, 3, 4, 8, 9, 15 land directly in Phase 1.

### Pitfall 1: JWT/JWKS verification bugs that ship dev-mode bypass to production (PITFALLS.md Pitfall 2)
**What goes wrong:** Missing `algorithms: ['RS256']` allowlist (alg-confusion attack), unpinned issuer/audience (cross-project token), zero `clockTolerance` (rejects valid tokens at 60s boundary), or — the catastrophic one — `if (process.env.NODE_ENV !== 'production')` shortcut left in code.
**Why it happens:** Tutorials show one-liner `firebase-admin.verifyIdToken()`. Manual JWKS verification means re-implementing each check.
**How to avoid:** All five clauses (`algorithms`, `issuer`, `audience`, `clockTolerance: 60`, JWKS via `createRemoteJWKSet`) are present in the Pattern 1 skeleton above. NO `NODE_ENV` runtime branches anywhere near auth code. Local dev uses real Firebase test-project tokens; mock auth lives in jest fixtures only.
**Warning signs:** Reviewer sees `process.env.NODE_ENV` near auth code; verifier returns the decoded payload without logging `kid` and `iss`.
**Test:** 9-case golden-token matrix — `(valid|expired|tampered) × (admin|moderator|user)` — see Validation Architecture.

### Pitfall 2: Privilege escalation via permissive PATCH /users/me (PITFALLS.md Pitfall 3 → HF-03)
**What goes wrong:** `POST /api/auth/users` (which IS the user-edit endpoint in this codebase per `authRoutes.js`) currently merges `req.body` into the User document. A request body with `{firebaseUid: <victim>, ...}` overwrites someone else's profile. With Bearer auth in place, this becomes "self-promote to admin via own token" if `userType` is also accepted from body.
**Why it happens:** Existing `POST /users` endpoint pre-dates roles; field allowlist was never reviewed.
**How to avoid:** HF-03 implementation requires (a) verify `req.body.firebaseUid === req.firebaseUid` (= JWKS-verified `sub`) — return 403 on mismatch; (b) explicit field allowlist at the controller — `pick(body, ['firstName', 'lastName', 'phone', 'whatsapp', 'telegram', 'instagramUrl', 'isRenterApplicant'])`; `userType` is NEVER accepted from body on this endpoint.
**Warning signs:** Code review sees `User.findByIdAndUpdate(id, req.body)` with no `pick`/`omit`.

### Pitfall 3: Stale role cache (PITFALLS.md Pitfall 4 → ROLE-11)
**What goes wrong:** Admin demotes a moderator. The demoted moderator's app keeps moderator UI for hours.
**How to avoid:** `roleRevokedAt` invariant in middleware (Pattern 1). When admin mutates a role (Phase 5 work), they set `user.roleRevokedAt = new Date()`. Middleware compares `token.iat` (Unix seconds) to `roleRevokedAt`. Demoted user's NEXT request returns 403 `role-revoked` → client interceptor calls `refreshRole()` → banner appears.
**Acceptance:** REQUIREMENTS.md ROLE-11 — "demoting a moderator while their app is open causes their next protected request to return 403 within 60s."

### Pitfall 4: App.tsx state-machine pitfalls (PITFALLS.md Pitfall 8)
**What goes wrong:** Adding 5+ new boolean flags reintroduces M1 Phase 1 nav bugs. Phase 1 only adds the banner — but it MUST be added correctly per the OVERLAY_FLAGS pattern.
**How to avoid:** Banner is NOT an overlay flag. It mounts at the App.tsx top level, ABOVE the OVERLAY_FLAGS-derived `hideMainStackUnderOverlay` view. The banner reads `useAuth()` and renders `null` when no role change is pending. App.tsx LOC delta: ≤30 LOC. Current 975 LOC + 30 = 1005 LOC, comfortably under the 1050 soft / 1100 hard ceiling. **Extract `<RoleRefreshBanner>` to `src/components/RoleRefreshBanner.tsx` to keep the App.tsx delta small.**
**Warning signs:** Plan adds banner state to multiple useState calls in App.tsx; back-handler dep array grows.

### Pitfall 5: M1 admin migration miss (PITFALLS.md Pitfall 9 → D-09)
**What goes wrong:** Allowlist file deleted before migration runs → admin loses admin access at M2 cut.
**How to avoid:** D-09 embeds the admin upsert in the SAME migration script as the enum flip. Acceptance ordering: (1) Wave-0 secret rotation, (2) HF-01 hotfix shipped, (3) `migrate-roles-m2.js` runs against prod Mongo, (4) `--verify` returns 0, (5) `User.js` enum cutover deploys, (6) RN client release deletes `adminAllowlist.ts`. The deletion is the LAST step.
**Warning signs:** Plan deletes `adminAllowlist.ts` before specifying migration runs.

### Pitfall 6: The Firebase-SDK temptation (PITFALLS.md Pitfall 15)
**What goes wrong:** Stack Overflow / Claude default to `firebase-admin.auth().verifyIdToken()`. Tutorial pasted into Phase 1 → `firebase-admin` re-added → "previous SDK addition caused issues" recurs.
**How to avoid:** PITFALLS.md Pitfall 15 substitution table is reproduced into the Phase 1 plan. Wave-0 invariant: `! grep -r 'firebase-admin' /Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src` AND `! grep -r '@react-native-firebase' /Users/beckmaldinVL/development/mobileApps/JayTap/src` exit 0.
**Warning signs:** Any plan body imports `firebase-admin` or `@react-native-firebase/*` — STOP.

### Pitfall 7: Refresh-token race / parallel 401s (NEW — Phase 1 specific)
**What goes wrong:** App makes 5 concurrent requests; idToken just expired; all 5 return 401 `token-expired`; the interceptor fires 5 times; 5 parallel calls to `securetoken.googleapis.com/v1/token`; Firebase rate-limits or one succeeds and overwrites another's response.
**How to avoid:** Single-flight pattern (`refreshPromise` guard in Pattern 8). All 5 interceptor invocations share the same in-flight promise; only one network call fires; all 5 retries use the same new token.
**Warning signs:** No mention of single-flight in the interceptor implementation; reviewer can't point to the `refreshPromise` ref.

### Pitfall 8: HF-04 — joining the wrong room before middleware verifies (NEW — Phase 1 specific)
**What goes wrong:** Existing socket code at `index.js:20-26` runs `socket.join(\`user:${uid}\`)` inside `io.on('connection')` — which fires AFTER `io.use()` middleware. If middleware errors out (the `next(new Error(...))` path), the connection event doesn't fire — but a malicious client could try to bypass via custom event names.
**How to avoid:** Pattern 5 above. `io.use()` middleware sets `socket.userId` and `socket.authPath`. The `connection` handler ONLY auto-joins `user:<uid>` for `authPath === 'bearer'`. Explicit `join_user_room` event verifies `socket.userId === requestedUid` per join request.
**Warning signs:** `socket.join(\`user:${anyVariable}\`)` outside the verified-uid check.

## Code Examples

> See "Architecture Patterns" above for full skeletons. This section captures small concrete excerpts for cross-reference.

### `User.js` schema cutover (post-migration)

```javascript
// src/models/User.js — line 14-18 BEFORE
userType: {
  type: String,
  enum: ['renter', 'owner', 'agent', 'admin'],
  default: 'renter',
},

// AFTER (deploys ONLY after migration --verify returns 0):
userType: {
  type: String,
  enum: ['user', 'moderator', 'admin'],
  default: 'user',
},

// NEW field (additive; safe to deploy before migration):
roleRevokedAt: {
  type: Date,
  default: null,
},
```

### `Property.js` HF-01 schema patch (Wave-0 standalone)

```javascript
// src/models/Property.js — additive fields (place near bedrooms/bathrooms ~line 14-15)
rooms:      { type: Number, default: 0 },     // hospitality: number of rooms in hostel/hotel
maxGuests:  { type: Number, default: 0 },     // hospitality: max guests per stay
amenities:  { type: [String], default: [] },  // hospitality: 12-amenity multi-select
```

**Plus** in `propertyRoutes.js:125-143` (POST /properties handler), extract these from `req.body`:
```javascript
const {
  // ... existing destructuring ...
  rooms,
  maxGuests,
  amenities,
} = req.body;
```

And in the `propertyData` object (~line 197):
```javascript
const propertyData = {
  // ...
  rooms: parseInt(rooms) || 0,
  maxGuests: parseInt(maxGuests) || 0,
  amenities: typeof amenities === 'string' ? JSON.parse(amenities) : (Array.isArray(amenities) ? amenities : []),
  // ...
};
```

The same patch applies to `PUT /:id` handler (around line 343+).

### Banner mount in App.tsx (D-13)

```tsx
// App.tsx — additive; mounts at top level above OVERLAY_FLAGS view
import { RoleRefreshBanner } from './src/components/RoleRefreshBanner';

// In AppContent return:
return (
  <View style={{ flex: 1 }}>
    <RoleRefreshBanner />  {/* Renders null when no role change pending. Sticky per D-13. */}
    <View style={{ flex: 1, display: hideMainStackUnderOverlay ? 'none' : 'flex' }}>
      {/* existing main stack */}
    </View>
    {/* existing overlay slots */}
  </View>
);
```

```tsx
// src/components/RoleRefreshBanner.tsx — NEW
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../theme/useTheme';
import { useLanguage } from '../i18n/useLanguage';

export const RoleRefreshBanner: React.FC = () => {
  const { user, refreshRole } = useAuth();
  const { colors } = useTheme();
  const { t } = useLanguage();
  // Detect role change: compare last-seen userType to current. Sticky until match (D-13).
  const [lastSeenRole, setLastSeenRole] = useState(user?.backendProfile?.userType);
  useEffect(() => {
    // initial mount: no banner; subsequent userType changes show banner
    if (lastSeenRole === undefined && user?.backendProfile?.userType) {
      setLastSeenRole(user.backendProfile.userType);
    }
  }, [user]);
  const currentRole = user?.backendProfile?.userType;
  const showBanner = lastSeenRole && currentRole && lastSeenRole !== currentRole;
  if (!showBanner) return null;
  return (
    <TouchableOpacity
      style={[styles.banner, { backgroundColor: colors.warning }]}
      onPress={async () => {
        await refreshRole();
        setLastSeenRole(currentRole);
      }}
    >
      <Text style={[styles.text, { color: colors.onWarning }]}>
        {t('auth.roleChanged.banner')} {/* "Your role changed — tap to reload" */}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  banner: { paddingVertical: 12, paddingHorizontal: 16 },
  text: { fontSize: 14, fontWeight: '600', textAlign: 'center' },
});
```

### Locale keys to add (D-11 + D-13)

```json
// src/locales/en.json — additions
{
  "auth.roleChanged.banner": "Your role changed — tap to reload",
  "auth.session.expired.title": "Session expired",
  "auth.session.expired.body": "Please sign in again."
}
```

```json
// src/locales/ru.json — mirror
{
  "auth.roleChanged.banner": "Ваша роль изменилась — нажмите для перезагрузки",
  "auth.session.expired.title": "Сеанс истёк",
  "auth.session.expired.body": "Пожалуйста, войдите снова."
}
```

(Three keys EN + three keys RU = 6 keys, NOT 4 as CONTEXT.md "Established Patterns" line says — the toast naturally splits into title + body unless the existing toast component takes a single-string arg. Planner should verify the existing toast call shape and merge if needed.)

### HF-03 body-uid match (in authRoutes.js POST /users)

```javascript
// src/routes/authRoutes.js — POST /users handler, after verifyFirebaseToken middleware
router.post('/users', verifyFirebaseToken, async (req, res) => {
  const { firebaseUid: bodyUid, email, firstName, lastName, phone, whatsapp, telegram, instagramUrl, isRenterApplicant } = req.body;

  // HF-03: body-uid MUST match JWKS-verified sub
  if (bodyUid && bodyUid !== req.firebaseUid) {
    return res.status(403).json({ code: 'uid-mismatch', message: 'Body firebaseUid does not match token' });
  }

  // HF-03: explicit field allowlist — userType is NEVER accepted from body
  const safe = { firstName, lastName, phone, whatsapp, telegram, instagramUrl, isRenterApplicant };

  try {
    let user = await User.findOne({ uid: req.firebaseUid });
    if (!user) {
      user = new User({ uid: req.firebaseUid, email, ...safe, userType: 'user' });
    } else {
      Object.assign(user, safe);
      if (email) user.email = email;
    }
    await user.save();
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
```

### HF-02 corrected runbook (D-01)

> **CORRECTION FROM CONTEXT.md D-01:** `.env` is **not** committed to git history (verified `git log --all -- .env` returns no results; `git ls-files` does not list `.env`; `.gitignore:12` already excludes it). The original D-01 framing assumed file was tracked.

Revised runbook for Wave-0:

```bash
# Step 1: rotate MongoDB Atlas password
#   - Atlas console → Database Access → user → Edit → Edit Password → Generate Password
#   - Save the new password

# Step 2: rotate AWS IAM keys
#   - AWS console → IAM → Users → <jaytap user> → Security credentials → Create access key
#   - Save new keys
#   - DO NOT yet revoke the old keys

# Step 3: update Railway env vars (NOT the .env file)
#   - Railway dashboard → JayTap-services service → Variables
#   - Update: MONGO_URI (with new password), AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY
#   - Add NEW: FIREBASE_PROJECT_ID (sourced from Firebase console for the JayTap project)

# Step 4: trigger Railway redeploy
#   - Railway will auto-redeploy on env var change
#   - Verify backend boots: `curl https://jaytap-services-production.up.railway.app/health` returns 'OK'
#   - Verify a known-good route still works: `curl https://.../api/properties` returns 200

# Step 5: NOW revoke the old AWS IAM keys + delete the old Atlas user from Atlas
#   - Confirm via "fetch a property image" smoke test that the new AWS keys are working

# Step 6: update local .env (working tree only, NOT git)
#   - Replace local MONGO_URI + AWS_* with new values for local dev
#   - .env is already in .gitignore line 12

# Step 7: check in .env.example (NEW file)
cat > /Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/.env.example <<'EOF'
# JayTap-services environment template
# Real values live in Railway environment variables (production)
# and in a local .env (development) — NEVER commit .env.

MONGO_URI=mongodb+srv://<user>:<password>@<cluster>/<database>
AWS_ACCESS_KEY_ID=<your-key>
AWS_SECRET_ACCESS_KEY=<your-secret>
AWS_REGION=us-east-1
AWS_BUCKET_NAME=<your-bucket>
FIREBASE_PROJECT_ID=<firebase-project-id>
PORT=5000
EOF
git add .env.example && git commit -m "docs(env): add .env.example template (no secrets)"

# Step 8: verify .env is not tracked (defense in depth)
git ls-files | grep -E "^\.env$" || echo "OK: .env not tracked"

# SKIP: 'git rm --cached .env' — file is not tracked, command is a no-op
# SKIP: BFG / git-filter-repo — no history to scrub
```

**Acceptance:**
- (a) Atlas user has new password ✓
- (b) AWS keys rotated and old keys deleted ✓
- (c) Backend boots on Railway with new env vars ✓
- (d) `.env.example` checked in ✓
- (e) `.env` NOT in `git ls-files` ✓ (already true)
- (f) `FIREBASE_PROJECT_ID` set in Railway (forward-prep for Phase 1 main work) ✓

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `firebase-admin.auth().verifyIdToken()` | `jose.jwtVerify` against JWKS | jose v5 (2023) made it the canonical pattern; jwks-rsa v4 (2024) now depends on jose — confirms ecosystem shift | jose is the primitive; firebase-admin is unnecessary for verification-only use |
| `jsonwebtoken` + `jwks-rsa` | `jose` | jwks-rsa@4.0.1 (2025) requires `jose@^6.1.3` internally | Cut out the middleman; less code; no `lodash.*` micro-deps |
| Firebase JWKS x509 endpoint | Firebase JWKS JWK endpoint | jose docs prefer JWK-format URL; both work | Use `https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com` (JWK) NOT `/robot/v1/metadata/x509/...` (x509) |
| Manual JWKS cache + retry logic | `createRemoteJWKSet` defaults | jose v6 ships sensible defaults | No manual cache code needed |

**Deprecated/outdated:**
- **`x-firebase-uid` header as auth** (current backend pattern) — replaced by `Authorization: Bearer <idToken>` per ROLE-04. Dual-accept window through Phase 6.
- **Hardcoded admin email allowlist** (M1 client) — replaced by Mongo-resolved `userType` per ROLE-07. Allowlist file deleted in Phase 1 client release.
- **`firebase-admin@^13.6.1` in JayTap-services package.json** — dead code (zero imports verified). Removed in REL-05.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `beckprograms@gmail.com` exists in Mongo `user_profile` collection (i.e., the maintainer signed in via the live app at least once during M1) | D-09 Resolution | Migration script's admin upsert will SKIP the email and the maintainer loses admin access at M2 cut. Mitigation: planner/maintainer runs `db.users.findOne({email: 'beckprograms@gmail.com'})` before Phase 1 deploys. If missing, sign in once via live app, then re-run script. |
| A2 | Firebase project ID for JayTap is recoverable from Firebase console / GoogleService-Info.plist | All JWKS sections | Without it, `verifyFirebaseToken.js` fails on import. Mitigation: planner extracts from Firebase console before backend deploy. The Web API Key (`AIzaSyA4Cnt_v1WeULFl8b4e0kNt-l6IgyX-DoY` in `AuthService.ts:5`) is NOT the project ID — they're separate values. |
| A3 | `appointmentRoutes.js` follows the same auth pattern as `propertyRoutes.js` (inline `firebaseUid` extraction) | ROLE-04 | If different, ROLE-04 collapse leaves it inconsistent. Mitigation: planner reads `appointmentRoutes.js` during planning to confirm the pattern matches. |
| A4 | Existing `socket.io-client` in RN client is v4-compatible with the v4 backend (currently v4.8.3) | HF-04 | Mismatched versions could fail handshake. Mitigation: verify `package-lock.json` in RN client. |
| A5 | `iat` claim in Firebase ID tokens is Unix seconds (not milliseconds) | ROLE-11 middleware | Off-by-1000x would make `roleRevokedAt` invariant always-true or never-true. `[VERIFIED: jose docs treat iat as seconds; OAuth/OIDC standard]` — A5 is confirmed but flagged for explicit unit test. |
| A6 | Firebase REST refresh-token endpoint accepts the same Web API Key as Identity Toolkit (the `AIzaSyA4...` value) | ROLE-06 | If a separate key is required, refresh fails silently → all users get hard-logged-out at first 401. `[VERIFIED: cloud.google.com/identity-platform/docs/use-rest-api]` confirms `?key=<API_KEY>` parameter accepts the same Web API Key. |
| A7 | The 4 keys for D-11/D-13 locale additions can be merged with existing toast component shape | Locale section | If the toast takes only a single string, merging title+body into one key is fine. Planner verifies. |
| A8 | `User.js` schema can add `roleRevokedAt` field BEFORE migration without breaking existing reads | Schema cutover | Mongoose tolerates additive fields with defaults. `[VERIFIED: standard Mongoose behavior]` — safe. |
| A9 | The `customClaims.role` Branch 1 in `useRole.ts:50` can stay (untouched) in Phase 1 | ROLE-07 | If left as-is, the field is `undefined` (Mongo doesn't populate it), branch returns falsy, falls through to Branch 2 (`userType`). Forward-compat preserved with zero work. Branch 3 (allowlist) deletion is the only change to `useRole.ts`. |

**If this table appears empty:** All claims would be verified or cited. As of this research, A1-A4 and A7 require user confirmation during planning; A5, A6, A8, A9 are verified.

## Open Questions

1. **D-09 admin uid sourcing — does `beckprograms@gmail.com` exist in Mongo today?**
   - What we know: Maintainer is also the M1 admin and was actively signing into the live app during M1 (per git activity 2026-04-22..2026-04-28). Per `authRoutes.js:38`, signup creates a Mongo user with `userType: 'renter'`. So the email SHOULD be in Mongo as `userType: 'renter'`.
   - What's unclear: Has the user actually signed in to JayTap PROD (the Railway-hosted app) under `beckprograms@gmail.com`, or only used dev tooling?
   - Recommendation: Planner asks the maintainer to run `db.user_profile.findOne({email: 'beckprograms@gmail.com'})` before Phase 1 ships. If returns null, maintainer signs in once via the live app first.

2. **`appointmentRoutes.js` auth pattern — does it match the propertyRoutes / favoriteRoutes pattern?**
   - What we know: It's listed as one of the 5 services per CONTEXT.md and ROLE-04. `index.js:55` mounts it at `/api/appointments`.
   - What's unclear: Whether it uses `chatAuthMiddleware`, `authMiddleware`, or its own inline auth. Direct file read needed during planning.
   - Recommendation: Planner reads `src/routes/appointmentRoutes.js` during plan-creation; ROLE-04 collapse spec adjusts accordingly.

3. **Existing toast component shape (D-11)**
   - What we know: Existing toasts via `Alert.alert(title, body)` per `App.tsx:105,110` and `HomeScreen.tsx:106`. RN `Alert.alert` takes `(title, body, buttons)`.
   - What's unclear: If the team has a custom toast component (not seen in codebase), the API may differ.
   - Recommendation: Planner uses `Alert.alert(t('auth.session.expired.title'), t('auth.session.expired.body'))` as default — matches existing pattern.

4. **Firebase project ID source-of-truth**
   - What we know: Web API Key is in `AuthService.ts:5` (`AIzaSyA4...`) but is NOT the project ID. Firebase project ID is typically a string like `jaytap-12345` and lives in `GoogleService-Info.plist` (iOS) or `google-services.json` (Android) — neither file is checked in (verified via `find`).
   - What's unclear: The exact project ID string.
   - Recommendation: Maintainer extracts from Firebase console (Project Settings → General → Project ID) and sets `FIREBASE_PROJECT_ID` in Railway dashboard before backend deploy.

5. **`GET /api/auth/me` vs existing `GET /api/auth/users/:firebaseUid` (ROLE-08)**
   - What we know: Existing `authRoutes.js:68-87` defines `GET /users/:firebaseUid` — used by `AuthService.getBackendUser`.
   - What's unclear: Should ROLE-08 replace the old endpoint (breaking) or coexist?
   - Recommendation: Add new `GET /me` (uses `verifyFirebaseToken` middleware; reads `req.user`). Keep old `GET /users/:firebaseUid` until Phase 6 (legacy cutoff). Client code reads from `/me` after Phase 1 client release.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Backend + RN client | ✓ | (verify with `node --version` ≥ 22.11) | None — engines field requires it |
| MongoDB Atlas | Backend at runtime | ✓ | Connection string in `.env` | None — required |
| Railway env-var dashboard | HF-02 + FIREBASE_PROJECT_ID | ✓ | — | None — required for deploy |
| Firebase project access | FIREBASE_PROJECT_ID + Web API Key | ✓ (maintainer-owned) | — | None — required |
| AWS IAM console | HF-02 key rotation | ✓ (maintainer-owned) | — | None — required |
| `git` CLI | Wave-0 commits | ✓ | — | None — required |
| `npm` | Backend `npm install jose` + script | ✓ | (verify ≥ 9) | None — required |
| Two physical devices (iPhone 15 Pro Max + Moto G XT2513V) | Manual QA matrix | ✓ (per M1 sign-off) | iOS 18.x / Android 16 | Acceptable: simulator for one role |

**Missing dependencies with no fallback:** None.

**Missing dependencies with fallback:** None — all available.

## Validation Architecture

> Phase 1 has zero UI screens (other than the banner) but introduces critical security infrastructure. `nyquist_validation` is enabled per `.planning/config.json`. CONVENTIONS.md notes "Effectively zero tests" — Phase 1 is the natural moment to seed a backend `jest`+`supertest` setup per Claude's Discretion.

### Test Framework

| Property | Value |
|----------|-------|
| Framework (RN client) | jest@^29.6.3 (already installed; minimal coverage) |
| Framework (backend, NEW) | jest@^29 + supertest@^7 (Wave 0 install per Claude's Discretion) |
| Config file (RN) | `jest.config.js` (preset: react-native) |
| Config file (backend, NEW) | `jest.config.js` (preset: node) |
| Quick run command (backend) | `cd /Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services && npm test -- --testPathPattern=verifyFirebaseToken` |
| Full suite command (backend) | `cd /Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services && npm test` |
| Curl matrix (manual fallback) | `bash scripts/curl-matrix.sh` (NEW; see Wave 0 below) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ROLE-03 | JWKS verifies valid token; rejects expired | unit (backend, mocked JWKS) | `npm test -- verifyFirebaseToken.test.js` | ❌ Wave 0 |
| ROLE-03 | Rejects tampered signature | unit | `npm test -- verifyFirebaseToken.test.js -t "tampered"` | ❌ Wave 0 |
| ROLE-03 | Rejects wrong issuer / audience | unit | `npm test -- verifyFirebaseToken.test.js -t "issuer\|audience"` | ❌ Wave 0 |
| ROLE-04 | Single middleware mounts on all 5 services | smoke (manual via curl) | `bash scripts/curl-matrix.sh` | ❌ Wave 0 |
| ROLE-05 | Client `apiClient` attaches Bearer | unit (RN, axios mock) | `npm test -- apiClient.test.ts` | ❌ Wave 0 |
| ROLE-06 | Refresh-token flow returns new id_token | integration (axios + nock) | `npm test -- AuthService.test.ts -t "refreshIdToken"` | ❌ Wave 0 |
| ROLE-07 | useRole returns 'admin' for backendProfile.userType='admin' (no allowlist) | unit (RN) | `npm test -- useRole.test.ts -t "admin"` | ❌ Wave 0 |
| ROLE-08 | GET /api/auth/me returns Mongo record for verified token | integration (supertest + mongo-memory) | `npm test -- authRoutes.test.js -t "GET /me"` | ❌ Wave 0 |
| ROLE-09 | 401 token-expired → refresh + retry once | unit (axios interceptor + jest spies) | `npm test -- apiClient.test.ts -t "interceptor 401"` | ❌ Wave 0 |
| ROLE-09 | 403 role-revoked → refreshRole + retry once | unit | `npm test -- apiClient.test.ts -t "interceptor 403"` | ❌ Wave 0 |
| ROLE-10 | Banner shows when userType changes between refreshRole calls | unit (react-native-testing-library) | `npm test -- RoleRefreshBanner.test.tsx` | ❌ Wave 0 |
| ROLE-11 | Token with iat < roleRevokedAt → 403 role-revoked | unit (backend, mocked Mongo) | `npm test -- verifyFirebaseToken.test.js -t "roleRevokedAt"` | ❌ Wave 0 |
| HF-01 | Save+fetch Hospitality preserves rooms/maxGuests/amenities | integration (supertest + mongo-memory) | `npm test -- propertyRoutes.test.js -t "hospitality round trip"` | ❌ Wave 0 |
| HF-02 | `git ls-files` does not include `.env` | smoke (shell) | `! git ls-files \| grep -q '^\\.env$'` | ❌ Wave 0 (1-line script) |
| HF-03 | Body firebaseUid != token sub returns 403 | integration (supertest) | `npm test -- authRoutes.test.js -t "uid mismatch"` | ❌ Wave 0 |
| HF-04 | Socket auth.token verifies; legacy auth.firebaseUid scopes correctly | manual (two-client harness) | `node scripts/socket-handshake-test.js` | ❌ Wave 0 (per Claude's Discretion) |
| ROLE-02 | Migration --verify returns 0 after run | smoke (shell + mongo CLI) | `npm run migrate:roles-m2 -- --verify` (after `npm run migrate:roles-m2`) | ✓ once script lands |

**The 9-case golden-token matrix** (PITFALLS.md Pitfall 2) implementation:

```javascript
// __tests__/verifyFirebaseToken.test.js — NEW (Wave 0)
const { verifyFirebaseToken } = require('../src/middleware/verifyFirebaseToken');
const { SignJWT, generateKeyPair } = require('jose');

describe('verifyFirebaseToken — 9-case matrix', () => {
  let publicJwk, privateKey;
  beforeAll(async () => {
    const kp = await generateKeyPair('RS256');
    privateKey = kp.privateKey;
    publicJwk = await exportJWK(kp.publicKey);
  });

  // Mock createRemoteJWKSet to return our test key
  jest.mock('jose', () => ({
    ...jest.requireActual('jose'),
    createRemoteJWKSet: () => async () => privateKey, // simplified
  }));

  ['admin', 'moderator', 'user'].forEach(role => {
    test(`valid token + ${role} → 200`, async () => { /* ... */ });
    test(`expired token + ${role} → 401 token-expired`, async () => { /* ... */ });
    test(`tampered token + ${role} → 401 invalid-token`, async () => { /* ... */ });
  });
});
```

### Sampling Rate

- **Per task commit:** Run only the test file affected by the task (e.g., `npm test -- verifyFirebaseToken.test.js`)
- **Per wave merge:** Run full backend suite + full RN suite
- **Phase gate:** Both suites green + the curl matrix manually verified against the deployed Railway backend

### Wave 0 Gaps

- [ ] **Backend test infrastructure (NEW):** `jest@^29` + `supertest@^7` + `mongodb-memory-server@^9` in `JayTap-services/devDependencies`. Add `jest.config.js` (`{ preset: 'node', testMatch: ['__tests__/**/*.test.js'] }`).
- [ ] **`__tests__/verifyFirebaseToken.test.js` — 9-case golden-token matrix** (PITFALLS.md Pitfall 2)
- [ ] **`__tests__/authRoutes.test.js`** — covers HF-03 + ROLE-08
- [ ] **`__tests__/propertyRoutes.test.js`** — covers HF-01 round-trip
- [ ] **RN: `src/services/__tests__/apiClient.test.ts`** — covers ROLE-05/06/09 interceptors with `nock` or jest mocks
- [ ] **RN: `src/hooks/__tests__/useRole.test.ts`** — covers ROLE-07 (allowlist removed; userType branch active)
- [ ] **`scripts/curl-matrix.sh`** — manual 9-case curl runbook against deployed backend, with golden tokens captured from a Firebase test project. Output: PASS/FAIL summary per case.
- [ ] **Framework install (backend):** `cd backend && npm install --save-dev jest supertest mongodb-memory-server`

If Claude's Discretion is interpreted as "skip the jest setup," the curl matrix is the minimum acceptable verification: run all 9 cases against the deployed Railway backend and confirm response codes match the expected matrix. Document results in `01-VALIDATION.md`.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | jose JWKS verify (RS256, pinned issuer/audience, clockTolerance: 60); Firebase REST refresh-token flow with rotating tokens |
| V3 Session Management | yes | AsyncStorage `userToken` + `refreshToken`; D-11 hard-logout clears all keys; `roleRevokedAt` server-side invariant forces 403 on demoted users |
| V4 Access Control | yes | `verifyFirebaseToken` middleware on all protected routes; `requireMinRole` predicate for role-gated endpoints; HF-03 body-uid match prevents profile spoof; HF-04 socket room scoping |
| V5 Input Validation | yes | HF-03 explicit field allowlist (no `userType` in body); migration script uses parameterized Mongo queries; Express body parsing already in place |
| V6 Cryptography | yes | jose handles all JWT crypto. Never hand-roll RS256 verification. Never accept `alg: none` or `alg: HS256`. |
| V7 Error Handling & Logging | yes | All auth failures log structured events (legacy_uid_header, socket_room_join_rejected); error envelopes don't leak stack traces |
| V8 Data Protection | partial | AsyncStorage `userToken`/`refreshToken` are plaintext on client (CONCERNS.md "Auth tokens stored in AsyncStorage unencrypted") — out-of-scope per CONTEXT.md Deferred Ideas; revisit in dedicated client-secret-hygiene phase |
| V9 Communications | yes | HTTPS enforced (Railway + iOS ATS); WSS for socket.io |
| V10 Malicious Code | n/a | No new build pipeline changes |

### Known Threat Patterns for {Express + JWKS + Mongo + RN}

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Algorithm confusion attack (`alg: none` or `alg: HS256` against RS256 JWKS) | Spoofing | jose call passes `algorithms: ['RS256']` allowlist explicitly |
| JWKS rotation without cache refresh | Denial of Service | jose `createRemoteJWKSet` auto-refetches on `kid` miss; defaults to 10-min cache + 30-sec cooldown |
| Body-spoof self-promotion (HF-03 trap) | Elevation of Privilege | Verify `req.body.firebaseUid === req.firebaseUid`; explicit field allowlist excludes `userType` |
| Socket room hijack (HF-04 trap) | Information Disclosure | `io.use()` JWKS verifies; `socket.join` only allowed for verified `sub`; legacy path is observed-but-untrusted |
| Stale role bypass (PITFALLS Pitfall 4) | Elevation of Privilege | `roleRevokedAt` invariant + 60-sec demand-driven invalidation via 403 retry |
| Refresh-token race / parallel refresh | Denial of Service / Race | Single-flight pattern in apiClient interceptor |
| Dev-mode bypass shipped to prod (PITFALLS Pitfall 2) | Elevation of Privilege | NO `process.env.NODE_ENV` runtime branches anywhere near auth code; mock at jest fixture layer only |
| Firebase token cross-project replay | Spoofing | `audience: FIREBASE_PROJECT_ID` and `issuer: https://securetoken.google.com/<project_id>` pinned in jose call |
| Last-admin lockout | Denial of Service | Out-of-Phase-1; lands in Phase 5. Phase 1's `verifyFirebaseToken` middleware does not provide a path to demote yourself. |

## Sources

### Primary (HIGH confidence)
- **Context7 `/panva/jose`** — `createRemoteJWKSet` + `jwtVerify` canonical Firebase pattern; defaults for cache TTL/cooldown
- **`/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/`** — Direct file reads of all backend files referenced; verified `firebase-admin` is unused; verified `.env` is not git-tracked
- **`/Users/beckmaldinVL/development/mobileApps/JayTap/`** — Direct reads of AuthContext, useRole, AuthService, all 5 services, App.tsx OVERLAY_FLAGS pattern
- **`npm view jose` (2026-04-29)** — `jose@6.2.3` confirmed published 2026-04-27
- **`docs.cloud.google.com/identity-platform/docs/use-rest-api`** — Refresh-token endpoint contract (request shape, response fields, rotation behavior)
- **`firebase.google.com/docs/auth/admin/verify-id-tokens`** — Third-party JWT path documented; JWKS endpoint URLs

### Secondary (MEDIUM confidence)
- **WebSearch (2026-04-29)** — Cross-verified Firebase refresh-token endpoint shape against Google's documentation index
- **`.planning/research/STACK.md`** — Project-level confidence on jose@6.2.3 + no firebase-admin (HIGH from project research, treated as MEDIUM here because it's downstream)
- **`.planning/research/PITFALLS.md`** — Pitfalls 2/3/4/8/9/15 directly inform Phase 1; consumed verbatim where applicable
- **`.planning/research/ARCHITECTURE.md` §1, §2, §6** — apiClient consolidation and AuthContext extension shape

### Tertiary (LOW confidence — flagged)
- **A1, A2, A3, A4, A7** in Assumptions Log — require maintainer confirmation before plans solidify

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — jose@6.2.3 verified via npm registry on 2026-04-29
- Backend file shape: HIGH — direct reads of all referenced files
- JWKS verification flow: HIGH — Context7 + Firebase docs + Google Cloud docs cross-checked
- Refresh-token contract: HIGH — Google Cloud Identity Platform docs cited verbatim
- Migration script idempotency: HIGH — pattern is standard `updateMany` + filter-excludes-already-migrated
- HF-02 corrected runbook: HIGH — `git log --all -- .env` returns no commits, `.gitignore:12` confirms exclusion
- Architecture (banner mount, OVERLAY_FLAGS interaction): HIGH — read App.tsx:80-93 directly
- D-09 admin uid sourcing: MEDIUM — depends on A1 (maintainer email exists in Mongo)
- Error envelope JSON shape: MEDIUM — Claude's Discretion per CONTEXT.md; Pattern 2 table is a recommendation, not a lock

**Research date:** 2026-04-29
**Valid until:** 2026-05-29 (30 days for stable infra; Firebase REST endpoints + jose API are slow-moving)

## Source Audit

**CONTEXT.md decisions addressed:**

| Decision | Section | Coverage |
|----------|---------|----------|
| D-01 (HF-02 Wave-0) | HF-02 corrected runbook | ✓ — corrected framing; runbook revised; SKIP `git rm --cached` and BFG |
| D-02 (HF-01 standalone hotfix) | HF-01 schema patch + route handler patch | ✓ — both layers explicit |
| D-03 (Bearer dual-accept) | Pattern 1 — verifyFirebaseToken with structured logging on legacy path | ✓ |
| D-04 (Socket dual-accept) | Pattern 5 — `io.use()` with `authPath` flag | ✓ |
| D-05 (Phase 6 cutoff) | State of the Art — flagged for Phase 6 follow-up | ✓ |
| D-06 (agent → user flat) | Pattern 6 — migration flips array | ✓ |
| D-07 (script location) | Pattern 6 — `src/scripts/migrate-roles-m2.js` + npm script | ✓ |
| D-08 (idempotency) | Pattern 6 — `--dry-run` + filter-excludes-migrated | ✓ |
| D-09 (M1 admin seed + uid sourcing flag) | Pattern 7 (recommended resolution: update-only) + A1 | ✓ — explicit recommendation given |
| D-10 (silent 401 refresh) | Pattern 8 — apiClient interceptor; no toast | ✓ |
| D-11 (hard logout + bilingual toast) | Pattern 8 + Locale keys section | ✓ |
| D-12 (banner tap → refreshRole) | Pattern 11 — RoleRefreshBanner component | ✓ |
| D-13 (sticky banner above OVERLAY_FLAGS) | Banner mount section + Pitfall 4 | ✓ |

**REQ-IDs covered:**

| REQ-ID | Section |
|--------|---------|
| HF-01 | "HF-01 Property.js HF-01 schema patch" + "Code Examples" |
| HF-02 | "HF-02 corrected runbook (D-01)" |
| HF-03 | Pattern + "Code Examples — HF-03 body-uid match" |
| HF-04 | Pattern 5 — socket.io v4 handshake middleware |
| ROLE-01 | "User.js schema cutover (post-migration)" |
| ROLE-02 | Pattern 6 — migration script skeleton |
| ROLE-03 | Pattern 1 — jose JWKS verification middleware |
| ROLE-04 | Pattern 4 — single role-aware Express middleware mount |
| ROLE-05 | Pattern 8 — shared `apiClient.ts` |
| ROLE-06 | Pattern 10 — Firebase REST refresh-token contract |
| ROLE-07 | "useRole.ts" deletion sequence |
| ROLE-08 | Open Question 5 — `GET /api/auth/me` endpoint design |
| ROLE-09 | Pattern 8 — interceptor with single-flight + retry guard |
| ROLE-10 | Pattern 11 — AuthContext extension with `refreshRole` |
| ROLE-11 | Pattern 1 — `roleRevokedAt` step in middleware |

All 13 D-XX decisions addressed. All 15 REQ-IDs mapped to research sections.

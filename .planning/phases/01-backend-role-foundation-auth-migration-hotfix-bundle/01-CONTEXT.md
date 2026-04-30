# Phase 1: Backend Role Foundation + Auth Migration + Hotfix Bundle - Context

**Gathered:** 2026-04-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace M1's hardcoded admin-email allowlist with a server-resolved three-role system (`admin` / `moderator` / `user`) backed by **MongoDB as the role authority**. Migrate all 5 backend services (auth, property, favorite, chat, appointment) from the legacy `x-firebase-uid` header to `Authorization: Bearer <idToken>` verified on Railway via JWKS (no `firebase-admin` SDK). Close four security/data-integrity bugs surfaced during the 2026-04-29 backend codebase review (HF-01..HF-04). Closes M1 GATE-05 D-22 Path B accepted-risk row.

**Pure infrastructure phase.** Zero net-new UI screens. Only user-facing surface: the foreground role-refresh banner ("Your role changed — tap to reload") wired through `AuthContext.refreshRole()`. All listing-status / moderation-queue / archive UI lives in Phases 2–5.

**Touches both repos:**
- RN client (`/Users/beckmaldinVL/development/mobileApps/JayTap`) — same maintainer as backend
- Backend (`/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services`) — same maintainer

**Requirements covered:** HF-01, HF-02, HF-03, HF-04, ROLE-01..ROLE-11 (15 reqs).

</domain>

<decisions>
## Implementation Decisions

### Hotfix sequencing & deploy order

- **D-01 (HF-02 timing — Wave-0):** Secret rotation runs FIRST, before any Phase 1 code lands. Sequence: rotate MongoDB Atlas password → rotate AWS IAM keys (revoke old) → `git rm --cached .env` in `JayTap-services` → add `.env` to `.gitignore` → check in `.env.example` → switch Railway to env-vars-only → verify backend boots with new credentials. Live secrets are committed in the backend repo today; every day they sit there is exposure. Phase 1 implementation work begins after Wave-0 is verified.
- **D-02 (HF-01 timing — standalone hotfix):** The one-line `Property` schema patch (`rooms`, `maxGuests`, `amenities`) ships ASAP as an independent backend hotfix release, not bundled with Phase 1. Hospitality listings created NOW silently lose those fields; this is a data-integrity bug and the fix is trivial. Don't wait for the rest of Phase 1.
- **D-03 (Bearer rollout — dual-accept window):** New JWKS middleware accepts EITHER `Authorization: Bearer <idToken>` OR the legacy `x-firebase-uid` header for the duration of M2 development. Backend logs every legacy-header request with structured fields (uid, route, timestamp). Client deploy ships Bearer; backend retains legacy compat to absorb store-update lag.
- **D-04 (HF-04 socket.io rollout — dual-accept window):** Mirror D-03 pattern. Socket handshake accepts EITHER `auth.token` (verified — only path that allows joining `user:<uid>` for the verified `sub`) OR legacy `auth.firebaseUid` (untrusted, rejects subscription to other users' rooms but doesn't disconnect). Client switches to sending `auth.token`. Same removal trigger as D-05.
- **D-05 (Legacy cutoff — Phase 6 release):** Removal of legacy `x-firebase-uid` header support AND legacy `auth.firebaseUid` socket handshake support lands as part of Phase 6 hardening + manual physical-device QA + dual-store submission (the M2 v2.0.0 release). By that point the new client has been live on TestFlight + Play Console for the duration of Phase 2–5 work, so adoption is high. Aligns with M1 D-02 lesson — single coordinated atomic version bump cycle. Backend follow-up release that removes legacy support can ship in the same Phase 6 window or immediately after, gated by structured-log evidence that legacy traffic has dropped to zero.

**Derived deploy order (from D-01..D-05):**
1. Wave-0: HF-02 secret rotation (out-of-band, before Phase 1 code).
2. Pre-Phase-1: HF-01 schema patch + Railway redeploy (independent hotfix).
3. Phase 1 backend deploy: JWKS middleware (dual-accept), `roleRevokedAt` invariant, `GET /api/auth/me`, single role-aware middleware collapsing all 5 services, HF-03 enforcement, HF-04 dual-accept socket handshake. Migration script (D-06..D-09) runs as a pre-deploy step against production Mongo.
4. Phase 1 client release: `Authorization: Bearer` headers, Firebase REST refresh-token flow, axios 401/403 interceptors, `AuthContext.refreshRole()`, role-refresh banner, `useRole.ts` allowlist branch deleted, `src/constants/adminAllowlist.ts` deleted.
5. Phase 6: Backend follow-up release removes legacy `x-firebase-uid` + legacy `auth.firebaseUid` support.

### Migration mechanics (ROLE-02 + M1 admin seed)

- **D-06 (Legacy 'agent' handling — flat migration):** All `userType: 'agent'` records flip to `userType: 'user'`. No per-record review. Rationale: PROJECT.md framing ("no production listings", "mock data only") covers the dataset; the `agent` enum value is a JayTap legacy holdover (per `User.js:16` inline comment). No 'agent' record is being treated as an implicit moderator.
- **D-07 (Migration script location — `JayTap-services/src/scripts/`):** Script lives at `src/scripts/migrate-roles-m2.js` alongside the existing `seed.js`. Invoked via a one-shot `npm run migrate:roles-m2` against the production `MONGO_URI`. Run manually as a pre-deploy step (the migration is one-shot anyway). Keeps Mongo writes in the repo that owns Mongo. NOT wired into Railway's release hook — manual invocation gives explicit go/no-go before backend code that depends on the new enum values deploys.
- **D-08 (Idempotency strategy — conditional updates + dry-run):** Script accepts `--dry-run` flag that prints the exact `updateMany` filters + match counts without writing. Without `--dry-run`: each `updateMany` uses a filter that excludes already-migrated records (e.g., `{userType: 'renter'}` → `{userType: 'user'}` only matches docs that haven't been touched). Re-running is a no-op. Final acceptance check matches REQUIREMENTS.md ROLE-02 acceptance: `db.users.countDocuments({userType: {$nin: ['user', 'moderator', 'admin']}})` returns 0. No transaction wrapping (one-shot migration on a small dataset where re-runs are safe).
- **D-09 (M1 admin seed — embedded in same migration script):** `migrate-roles-m2.js` includes a top-of-file `const M1_ADMIN_EMAILS = ['beckprograms@gmail.com'];` (single source of truth, mirrors `src/constants/adminAllowlist.ts:13` at the moment the file is deleted). Script does an upsert per email: `db.users.updateOne({email}, {$setOnInsert: {uid: TBD, email}, $set: {userType: 'admin'}}, {upsert: true})`. Single migration covers BOTH the enum flip AND the admin seed in one invocation. Removes ordering risk — admin seed is guaranteed to land before the allowlist file is deleted in the next client release. Note: upsert needs a real `uid` for inserted records; if email doesn't exist in Mongo yet, planner needs to spec how `uid` is sourced (likely: pre-flight Firebase Identity Toolkit lookup, OR: seed only updates existing records and any missing M1 admin must sign in once first to create their Mongo profile, then re-run script). Flag as planning input.

**Derived from D-08 + ROLE-01:** The `Property.userType` Mongoose enum cutover (drop `'renter'`, `'owner'`, `'agent'` from the enum allowlist) happens AFTER the migration script confirms zero records remain at legacy values. Two-step: (1) migration script runs, (2) confirmation count returns 0, (3) `User.js` enum updated to `['user', 'moderator', 'admin']` + `default: 'user'`, (4) backend deploys.

### Token refresh + role-revocation UX

- **D-10 (Silent idToken refresh — fully transparent):** When `axios` 401 interceptor catches a `token-expired` response, it calls the Firebase REST refresh-token endpoint (`https://securetoken.googleapis.com/v1/token`), updates the cached `userToken` in AsyncStorage, retries the original request once, returns the response. No toast, no spinner, no overlay. User's action just works. Closes the latent M1 60-min session-death bug without ever surfacing it. If refresh succeeds but retry still fails for a non-auth reason, surface the underlying error normally (don't disguise it as a session issue).
- **D-11 (Hard logout — login screen + bilingual toast):** When the refresh token itself is expired/revoked, `AuthContext.logout()` runs: clears AsyncStorage `userToken` + `refreshToken` + `userData`, App.tsx state machine returns to login flow naturally (since `!user.localId` routes there). Show toast: EN "Session expired. Please sign in again." / RU «Сеанс истёк. Пожалуйста, войдите снова.» (locale keys to add to `src/locales/{en,ru}.json`). Aligns with REQUIREMENTS.md ROLE-09 final-fallback wording.
- **D-12 (Role-refresh banner action — soft re-fetch):** Tap on the banner calls `AuthContext.refreshRole()` which re-fetches `GET /api/auth/me`, updates `user.backendProfile.userType`, bumps the AuthContext `user` reference. Every `<Gated>` consumer re-renders with the new role. No JS bundle reload, no nav reset, user stays where they are. If the user was on a screen they no longer have permission for (e.g., a moderator on `ModerationQueueScreen` after demotion), the screen's `<Gated>` wrapper renders nothing/redirects naturally on next render — handled at the screen level when those screens land in Phases 3 + 5.
- **D-13 (Banner copy + persistence — symmetric, sticky):** Single banner copy for both promotion and demotion: EN "Your role changed — tap to reload" / RU «Ваша роль изменилась — нажмите для перезагрузки» (matches REQUIREMENTS.md ROLE-10 wording). Mounted at the App.tsx layer, above `OVERLAY_FLAGS`, so it persists across screen changes. Sticky until either (a) user taps it (triggers `refreshRole()` per D-12) OR (b) the next `refreshRole()` returns a `userType` matching what's currently in `AuthContext` (race-condition resolution — covers the case where a 403-retry interceptor already refreshed the role before the banner was acknowledged). No dismiss button — user must reload to acknowledge. Adds 2 locale keys.

### Claude's Discretion

- **`apiClient.ts` consolidation scope (NOT selected for discussion):** Default to fold the full 5-service `getHeaders()` consolidation INTO Phase 1 per ROLE-05 + research §STACK + CONCERNS.md "Duplicated service boilerplate" — every service is being touched anyway for the Bearer header migration. Planner is authorized to spec a single shared `apiClient.ts` exporting a configured `axios.create({ baseURL, ...})` + `useAuthHeaders()` helper, with each of the 5 services migrated to consume it.
- **JWKS middleware error contract specifics:** REQUIREMENTS.md ROLE-09 specifies `401 token-expired` and `403 role-revoked` as the two interceptor-handled cases. Planner has discretion on the exact JSON error envelope shape (e.g., `{error: 'token-expired'}` vs `{code: 'token-expired', message: '...'}`) but MUST keep both error codes machine-checkable from the client interceptor. Other JWKS-rejection cases (signature failure, wrong audience, missing `kid`, tampered) return generic 401 with no special interceptor handling — they fall through to D-11 hard-logout naturally.
- **`AppState 'active'` role-refresh hook placement:** REQUIREMENTS.md and research place the `AppState` listener in Phase 2. Phase 1 only wires `refreshRole()` as a callable on `AuthContext` + the 403-retry interceptor + the banner trigger. Planner may stub the `AppState` hook surface but defers wiring to Phase 2.
- **Verification bar:** Phase 1 has zero UI screens. Manual verification surface includes: (1) curl matrix against the new JWKS middleware (valid / expired / tampered token × admin / moderator / user — research's "9-case golden-token matrix" from PITFALLS.md Pitfall 2); (2) manual app QA proving login still works, the M1 admin email still sees admin-gated UI after migration runs, demotion via Atlas console produces a role-refresh banner within 60s. Planner has discretion on whether to add jest/supertest backend tests for the JWKS middleware (CONVENTIONS.md notes "Effectively zero tests" — adding minimal test coverage here is reasonable but not required by the codebase posture).
- **Foreground role-refresh banner visual design:** Color, icon, exact pill shape, animation in/out. Use `useTheme()` semantic palette (likely `warning` or `info`).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project-level requirements & scope

- `.planning/PROJECT.md` — Current Milestone v2.0 M2 "Roles & Moderation"; locked scope; hard rules (no Firebase SDK, MongoDB role authority, no react-navigation); Key Decisions row for M1 GATE-05 D-22 Path B closure
- `.planning/REQUIREMENTS.md` §"Hotfix bundle (Phase 1)" + §"Roles (Phase 1 + Phase 2) — three-tier system + backend resolution" — HF-01..HF-04 + ROLE-01..ROLE-11 acceptance criteria; Out of Scope hard rules
- `.planning/ROADMAP.md` §"Phase 1: Backend Role Foundation + Auth Migration + Hotfix Bundle" — Goal + Depends on + Requirements list + 5 Success Criteria

### Research outputs (M2)

- `.planning/research/SUMMARY.md` — Executive summary, build order, RU-market anchor, confidence assessment, sources. **NOTE:** "Wave-0 Railway-team coordination" / Q1–Q12 framing is misframed — backend is owned by the same maintainer as the RN client (see memory `backend-repo-location.md`). Treat Q1–Q12 as design decisions the maintainer owns directly.
- `.planning/research/STACK.md` — `jose@^6.2.3` for JWKS verification (no `firebase-admin`); zero new RN client deps; explicit anti-recommendations table
- `.planning/research/FEATURES.md` — Table-stakes / differentiators / anti-features classification for M2
- `.planning/research/ARCHITECTURE.md` — `useRole()` shim placement, `AuthContext` modifications, shared `apiClient.ts` consolidation, App.tsx LOC budget enforcement
- `.planning/research/PITFALLS.md` — 15 critical pitfalls + phase mapping. Pitfalls 2 (JWT verification defects), 3 (privilege escalation via permissive PATCH /users/me), 4 (stale role cache), 8 (App.tsx god-file regression), 9 (M1 admin migration miss), 15 (Firebase-SDK temptation) all directly land in Phase 1.

### Codebase analysis

- `.planning/codebase/CONCERNS.md` — Critical: Firebase API key hardcoded in source; Critical: `.env` loader not wired up; High: App.tsx god-file (941 LOC); High: Duplicated service boilerplate (5 services); Medium: Auth user type is `any`. **All five concerns intersect Phase 1.**
- `.planning/codebase/ARCHITECTURE.md` — Existing `App.tsx` state-machine + provider tree (`ThemeProvider` → `LanguageProvider` → `AuthProvider`); custom navigation pattern that the role-refresh banner mounts above
- `.planning/codebase/CONVENTIONS.md` — `useTheme()` tokens for any new UI; EN+RU bilingual parity required for every new UI string; manual physical-device QA bar; no `firebase` / `@react-native-firebase/*` packages

### Backend repo (decision-shaping references)

- `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/models/User.js` — Mongoose `User` schema. Current enum `['renter', 'owner', 'agent', 'admin']` with `default: 'renter'`. ROLE-01 + ROLE-02 + D-08 cutover happens here. Inline comment "Added agent/admin to support legacy JayTap roles if needed, or I should migrate" — D-06 resolves this.
- `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/middleware/authMiddleware.js` + `chatAuthMiddleware.js` — Two of the five auth code paths to collapse into a single role-aware middleware (ROLE-04). The other three live inline in `propertyRoutes.js` + `favoriteRoutes.js`.
- `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/scripts/seed.js` — Sibling location for `migrate-roles-m2.js` per D-07.
- `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/.env` — File to remove from git tracking per HF-02 / D-01.

### Client repo (decision-shaping references)

- `src/constants/adminAllowlist.ts` — File to delete after migration per ROLE-07 + D-09. Single email today: `beckprograms@gmail.com`.
- `src/hooks/useRole.ts:64-65` — M1 hardcoded-allowlist branch to delete per ROLE-07.
- `src/services/{Auth,Property,Favorites,Chat,Appointment}Service.ts` — 5 services with duplicated `getHeaders()` boilerplate; subject of `apiClient.ts` consolidation per Claude's Discretion.
- `src/context/AuthContext.tsx` — Surface for `refreshRole()`, axios interceptors, refresh-token wiring (ROLE-06, ROLE-09, ROLE-10).
- `App.tsx` — Mount point for role-refresh banner (D-13). LOC budget ≤1100 hard / ≤1050 soft per PITFALLS.md Pitfall 8.
- `src/locales/{en,ru}.json` — 2 new locale keys for D-13 banner copy + 2 new keys for D-11 hard-logout toast.

### Auto-memory pointers (cross-session knowledge)

- `~/.claude/projects/-Users-beckmaldinVL-development-mobileApps-JayTap/memory/no-firebase-sdk.md` — REPO RULE: no `firebase` / `@react-native-firebase/*` in RN client
- `~/.claude/projects/-Users-beckmaldinVL-development-mobileApps-JayTap/memory/identity-vs-user-store.md` — Firebase = identity proof (uid only); MongoDB = role authority via `userType`
- `~/.claude/projects/-Users-beckmaldinVL-development-mobileApps-JayTap/memory/backend-repo-location.md` — Backend at `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services`, same maintainer; "Wave-0 Railway-team coordination" framing in research is misframed

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- **`useRole()` / `can(action)` / `<Gated>` (src/hooks/useRole.ts)** — M1 Phase 3 forward-compat shim built specifically for this M2 swap. Phase 1 keeps the call-site API intact; only the internal source-of-truth flips from `isAllowlistedAdmin(user.email)` (M1) to `user.backendProfile.userType` (M2). Zero `<Gated>` consumer touches.
- **`AuthContext.tsx`** — Already exposes `user`, `login`, `logout`. Phase 1 adds `refreshRole()` callable + new axios interceptors. CONCERNS.md flags the untyped `user: any` — Phase 1 is the natural moment to introduce `interface AuthUser { localId: string; email: string; refreshToken: string; backendProfile?: BackendProfile }`.
- **`/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/scripts/seed.js`** — Sibling location + invocation pattern for `migrate-roles-m2.js`.
- **Existing 5 service files** — Will become consumers of the new `apiClient.ts` (per Claude's Discretion); each existing `getHeaders()` collapses to one shared helper.

### Established Patterns

- **Provider tree (App.tsx → SafeAreaProvider → KeyboardProvider → ThemeProvider → LanguageProvider → AuthProvider)** — Banner per D-13 mounts inside AuthProvider so it reads `user.backendProfile.userType`; renders above OVERLAY_FLAGS so it persists across screen changes.
- **`OVERLAY_FLAGS` derived-overlay pattern (M1 Phase 1)** — Banner is NOT an overlay flag; it's a top-level absolutely-positioned slot above the App.tsx state machine.
- **AsyncStorage key naming** — Existing keys (`userToken`, `userData`). Phase 1 adds `refreshToken` (per ROLE-06).
- **Bilingual locale parity** — `src/locales/{en,ru}.json` 365-key M1 baseline grows by 4 keys (D-11 toast + D-13 banner).
- **`useTheme()` semantic tokens** — Banner color picks from `theme.colors` semantic palette (warning/info) — no hardcoded colors.

### Integration Points

- **Backend `JWKS middleware`** mounts at the express app top-level (per ROLE-04, single instance shared by 5 route files).
- **Backend `migrate-roles-m2.js`** runs against production `MONGO_URI` from CLI; consumes the same `mongoose` connection pattern as `seed.js`.
- **Client `apiClient.ts`** mounts as a shared axios instance imported by all 5 services. Houses the 401/403 interceptors per ROLE-09.
- **Client `AuthContext.refreshRole()`** is consumed by: (a) the 403-retry axios interceptor; (b) the role-refresh banner tap handler (D-12); (c) eventually the AppState 'active' hook (Phase 2 placement, but `refreshRole()` callable lands in Phase 1).
- **HF-04 socket handshake** — Existing `ChatService.connectSocket` (or similar) sends the auth payload; Phase 1 client release switches that payload from `{firebaseUid: uid}` to `{token: idToken}`.

</code_context>

<specifics>
## Specific Ideas

- **Migration verification command** (D-08): `db.users.countDocuments({userType: {$nin: ['user', 'moderator', 'admin']}})` returns 0 — verbatim from REQUIREMENTS.md ROLE-02 acceptance. Plan this as a post-migration `npm run migrate:roles-m2 -- --verify` subcommand or as a manual Atlas one-liner in the runbook.
- **Banner copy — exact strings to ship** (D-13): EN `"Your role changed — tap to reload"` / RU `«Ваша роль изменилась — нажмите для перезагрузки»`. Match REQUIREMENTS.md ROLE-10 wording verbatim (no rewording during planning).
- **Hard-logout toast — exact strings** (D-11): EN `"Session expired. Please sign in again."` / RU `«Сеанс истёк. Пожалуйста, войдите снова.»`. Aligns with ROLE-09 wording.
- **M1 admin email source-of-truth at deletion time** (D-09): `src/constants/adminAllowlist.ts:13` is the authoritative list at the moment the file is deleted. Today: single email `beckprograms@gmail.com`. Migration script must mirror this list verbatim. If any email is added to the allowlist between now and Phase 1 ship, the migration script's `M1_ADMIN_EMAILS` constant must be updated to match before running.

</specifics>

<deferred>
## Deferred Ideas

- **`apiClient.ts` consolidation scope** — Not selected by user for discussion. Default per Claude's Discretion: fold into Phase 1. If planner decides scope is too large, may carve into a follow-up phase under M2 cleanup.
- **JWKS middleware error contract specifics** — Not discussed in detail; planner has discretion within REQUIREMENTS.md ROLE-09 constraints (`401 token-expired` + `403 role-revoked` machine-checkable).
- **`AppState 'active'` role-refresh hook wiring** — Stays in Phase 2 per REQUIREMENTS.md placement. Phase 1 only lands the `refreshRole()` callable.
- **Crash reporting** (CONCERNS.md "37 console.error/console.warn calls in production build, no Sentry/Crashlytics") — Out of M2 scope. Worth adding to backlog.
- **`react-native-config` / `.env` loader for the RN client** (CONCERNS.md "Critical: .env loader not wired up", "Critical: Firebase API key hardcoded in source") — Distinct from HF-02 (which is backend secret rotation). RN-client secret hygiene is a separate concern; defer to a future phase or backlog. Phase 1 does not touch the client's hardcoded `API_KEY`.
- **Backend test infrastructure** (CONVENTIONS.md "Effectively zero tests") — Adding jest/supertest tests for the JWKS middleware is allowed under Claude's Discretion in this phase but not required. Building out a proper backend test harness is its own effort.

</deferred>

---

*Phase: 01-backend-role-foundation-auth-migration-hotfix-bundle*
*Context gathered: 2026-04-29*

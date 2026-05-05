---
phase: 01-backend-role-foundation-auth-migration-hotfix-bundle
status: issues_found
critical: 2
high: 1
medium: 4
low: 3
info: 3
---

# Phase 1 Code Review — Backend Role Foundation + Auth Migration + Hotfix Bundle

**Reviewed:** 2026-04-29
**Repos:** RN client (`/Users/beckmaldinVL/development/mobileApps/JayTap`) + backend (`/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services`)
**Commits:** RN client `89e61ca..HEAD` (23 commits), backend `23ced02^..e9e52f7` (18 commits)

## Summary

The phase delivers its security-critical posture changes correctly on the high-risk surfaces:

- **JWT verification (RS256, iss, aud, clockTolerance, expired vs invalid distinction)** is correct in `verifyFirebaseToken.js` and the socket `io.use()` handshake.
- **JWKS singleton invariant** is preserved — `createRemoteJWKSet` is called exactly once in `src/config/firebase.js`; both `verifyFirebaseToken` and `index.js` socket handshake import the same module.
- **HF-03 body-uid match + userType allowlist** is correctly enforced in `POST /api/auth/users` and is regression-tested.
- **HF-04 socket auto-join** is correctly gated to `socket.authPath === 'bearer' && socket.userId === requestedUid` for both auto-join and explicit `join_user_room`.
- **ROLE-11 `roleRevokedAt` invariant** is enforced on the Bearer path with the documented legacy-path carve-out.
- **Single-flight + `_retry` guards** in `apiClient.ts` are correctly structured; module-scope promises clear in `finally`.
- **Migration script** is idempotent, dry-run-safe, and uses UPDATE-ONLY (no fake-uid upsert) for admin promotion.
- **Locale parity** — all 5 new keys (`auth.roleChanged.banner`, `auth.session.expired.{title,body}`, `auth.accessChanged.{title,body}`) are present in EN + RU.
- **Dead code removal** — `firebase-admin` is gone from `package.json` and not imported anywhere; `chatAuthMiddleware.js` is deleted with no orphan refs; `src/constants/adminAllowlist.ts` is deleted with no orphan client refs.
- **No hardcoded secrets** in `.env.example` (placeholders only). The pre-existing client-side hardcoded `API_KEY` in `src/services/AuthService.ts:5` is a known-deferred concern (CONCERNS.md / `deferred-items` style backlog), out of this phase's scope.

Two **Critical** findings warrant attention before deploy:

1. A privilege-escalation regression in `propertyRoutes.js PUT /:id` introduced by Plan 9's enum cutover (the gate guards on the now-impossible `userType === 'renter'`).
2. Authenticated users on the new Bearer client cannot read their favorites or favorite-status (`softAuthUid()` does not decode the Bearer's `sub`).

The remaining findings are smaller surfaces (UX double-toast, stale closure in registered hooks, banner state across user-swap, `_retry` flag visibility on retried request).

---

## Critical

### CR-01: PUT /properties/:id allows non-admin owners to forge platformVerifications

**File:** `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/routes/propertyRoutes.js:331-355`

**Issue:** After Plan 9's enum cutover (`['user','moderator','admin']` only), the PUT handler's anti-tamper branch is dead:

```js
const updateData = { ...req.body };

// Renters cannot change platform verifications; admin owners can include them in the same PUT
if (actingUser.userType === 'renter') {           // ← DEAD: 'renter' no longer in enum
  delete updateData.platformVerifications;
  delete updateData.verificationUpdatedAt;
  delete updateData.verificationUpdatedByUid;
} else if (actingUser.userType === 'admin' && updateData.platformVerifications !== undefined) {
  // … admin sanitizes and stamps …
}
// non-admin, non-'renter' (i.e., 'user' / 'moderator') → falls through with updateData
//   carrying whatever the client sent.

// …

Object.assign(property, updateData);
```

A regular user (`userType: 'user'`) who owns a listing can `PUT /properties/:id` with body `{ platformVerifications: { ownershipDocuments: true, ownerIdentityVerified: true, stateIssuedDocumentsVerified: true }, verificationUpdatedByUid: 'self' }` and it persists — because no branch deletes those fields for non-admins after the cutover. This re-introduces the Plan-9-era M1 platform-trust bypass that the `userType !== 'renter'` filter was protecting against.

The POST handler (line 206) gates correctly on `req.user?.userType === 'admin'`. The PATCH /verifications handler (line 254) gates correctly. Only the PUT path regressed.

**Why it matters:** Verification flags are the platform's trust signal (MoveIn / "verified by JayTap"). Any authenticated owner can self-verify. Threat surface T-1-02 (privilege escalation via permissive write) re-opens on PUT.

**Fix:** Replace the dead `'renter'` branch with the canonical "non-admin → strip" pattern:

```js
if (actingUser.userType !== 'admin') {
  delete updateData.platformVerifications;
  delete updateData.verificationUpdatedAt;
  delete updateData.verificationUpdatedByUid;
} else if (updateData.platformVerifications !== undefined) {
  // existing admin sanitize + stamp branch (lines 339-355) unchanged
}
```

Add a supertest case mirroring the HF-03 allowlist test: a `userType:'user'` owner PUTs `{ platformVerifications: { ownershipDocuments: true } }` to their own listing and the assertion is that `property.platformVerifications.ownershipDocuments` remains `false`.

---

### CR-02: GET /favorites + GET /favorites/check return [] / false for Bearer-only authenticated clients

**Files:**
- `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/routes/favoriteRoutes.js:17-19, 22-91, 94-120`
- `/Users/beckmaldinVL/development/mobileApps/JayTap/src/services/FavoritesService.ts:25, 60`

**Issue:** The soft-auth helper does not decode the Bearer token:

```js
function softAuthUid(req) {
  return req.firebaseUid || req.body?.firebaseUid || req.headers?.['x-firebase-uid'] || null;
}
```

`req.firebaseUid` is only populated by the `verifyFirebaseToken` middleware, but the GET routes (`router.get('/')` and `router.get('/check/:propertyId')`) deliberately do NOT mount that middleware (soft-auth UX). The new client (`FavoritesService.getFavorites` / `checkFavorite`) sends only `Authorization: Bearer <token>` — no `body.firebaseUid`, no `x-firebase-uid` header. So `softAuthUid()` returns `null`, the handler short-circuits to `res.json([])` / `{ isFavorited: false }`, and authenticated users see an empty favorites list and unfavorited hearts on every listing.

This is a hard functional regression once the new client deploys: `App.tsx:332-368 loadFavoriteStatuses` will populate `favoriteStatuses` as `{}`, every Heart icon renders as not-favorited, and `FavoritesScreen` is empty.

**Why it matters:** Favorites is a v1 surface. The bug doesn't show up in dual-accept testing if the client still sends `body.firebaseUid` or `x-firebase-uid` (which `PropertyService` does for its writes, but `FavoritesService` was migrated cleanly to Bearer-only). It surfaces immediately on the first authenticated user after the client release.

**Fix:** Either (a) decode the Bearer in `softAuthUid` so authenticated GETs work without 401-ing anonymous browsers, or (b) mount a soft-auth wrapper that calls `jwtVerify` opportunistically. Sketch of (a):

```js
const { jwtVerify } = require('jose');
const { JWKS, ISSUER, FIREBASE_PROJECT_ID } = require('../config/firebase');

async function softAuthUid(req) {
  if (req.firebaseUid) return req.firebaseUid;
  const authHeader = req.header('authorization') || '';
  const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (bearer) {
    try {
      const { payload } = await jwtVerify(bearer, JWKS, {
        issuer: ISSUER, audience: FIREBASE_PROJECT_ID, algorithms: ['RS256'], clockTolerance: 60,
      });
      return payload.sub;
    } catch { /* fall through to legacy + null */ }
  }
  return req.body?.firebaseUid || req.headers?.['x-firebase-uid'] || null;
}
```

Update both GET handlers to `await softAuthUid(req)`. Add a supertest case: valid Bearer for a user who has favorites → response array is non-empty.

---

## High

### HI-01: apiClient post-retry 403 path fires two Alert.alert toasts back-to-back

**File:** `/Users/beckmaldinVL/development/mobileApps/JayTap/src/services/apiClient.ts:158-166`

**Issue:** In Branch 3 (post-retry 403 → ROLE-09 final fallback), the interceptor calls `await logoutHook?.()` with no argument. `logoutHook` is `AuthContext.logout`, whose signature is `logout(silent: boolean = false)` — so `silent` defaults to `false`, which fires `Alert.alert(t(language, 'auth.session.expired.title'), …)` inside `AuthContext.logout`. Then the next line fires another alert via `toastHook?.('auth.accessChanged')` (the `'Your access changed' / 'Please sign in again.'` strings).

Result: a user who hits the genuinely-revoked path sees two queued alerts: "Session expired" and "Your access changed". The plan-10 SUMMARY explicitly says the post-retry 403 path is supposed to surface `auth.accessChanged` (not session.expired); the file header comment in `apiClient.ts:115` agrees. Branch 1 (refresh-token-rejected) is the path that's supposed to surface `session.expired`.

**Why it matters:** Two stacked Alert.alert dialogs is jarring, contradictory ("session expired" vs "access changed"), and ships incorrect copy on the most-likely-to-be-seen failure path (admin demotes someone in production → first request 403's → retry 403's → user sees both toasts).

**Fix:** Pass `silent=true` to `logoutHook` in branch 3 so the role-revocation path uses only the `auth.accessChanged` toast:

```js
if (retryStatus === 403) {
  await logoutHook?.(/* silent */ true);
  toastHook?.('auth.accessChanged');
}
```

This requires updating the registered-hook signature to accept the optional arg. The simplest change keeps `logoutHook: () => Promise<void>` but threads the `silent` flag through:

```ts
// apiClient.ts
let logoutHook: ((silent?: boolean) => Promise<void>) | null = null;

export function registerAuthHooks(hooks: {
  refreshRole: () => Promise<void>;
  logout: (silent?: boolean) => Promise<void>;
  toast: (localeKeyPrefix: string) => void;
}) { /* … */ }
```

Branch 1 keeps `await logoutHook?.()` (silent=false → "session expired" toast inside AuthContext.logout — D-11). Branch 3 becomes `await logoutHook?.(true)` (silent=true) followed by `toastHook?.('auth.accessChanged')`.

---

## Medium

### MD-01: registerAuthHooks captures stale closures (language, user) on mount

**File:** `/Users/beckmaldinVL/development/mobileApps/JayTap/src/context/AuthContext.tsx:198-201`

**Issue:** The `useEffect` registers hooks with `[]` deps, so the initial `refreshRole`, `logout`, `toast` closures are captured ONCE at mount:

```jsx
useEffect(() => {
  registerAuthHooks({ refreshRole, logout, toast });
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);
```

`logout` closes over `language` (from `useLanguage()`); `refreshRole` closes over `user` (from `useState`); `toast` closes over `language`. After a language switch (RU → EN), the registered `logout` and `toast` will still call `t(language, …)` with the original-mount `language` value — the user toggled their app to English mid-session, but the apiClient's interceptor toasts will fire in Russian (or vice versa).

`refreshRole` closes over `user`, but it reads `user?.localId` from the mount value of `user` (which is `null`), so the `if (!user?.localId) return` guard early-returns forever. Mitigation: `setUser(prev => …)` inside `refreshRole` uses the functional setter, but the upstream early-return blocks the call. After a fresh login from the login screen, the registered `refreshRole` hook still has `user === null` from the mount snapshot — so the apiClient 403-role-revoked branch's `refreshRoleHook?.()` becomes a no-op until the user-update happens AND the registered closure is refreshed (which it never is).

**Why it matters:** The interceptor's role-revoked retry path silently does nothing post-login. The 403-final-fallback branch still fires (it doesn't depend on `refreshRole` returning anything), so the worst case is "no soft refreshRole, only hard logout on second 403" — observable but degraded UX.

**Fix:** Re-register the hooks whenever the bound closures change:

```jsx
useEffect(() => {
  registerAuthHooks({ refreshRole, logout, toast });
}, [refreshRole, logout, toast]);
```

…and wrap `refreshRole` / `logout` / `toast` in `useCallback` with proper deps so the registration only updates when something material changed. Alternatively, have the hooks read from refs (`useRef` mirror that always has the latest values) — slightly heavier but avoids re-registering on every render.

---

### MD-02: RoleRefreshBanner lastSeenRole survives user-swap and may falsely flash on next login

**File:** `/Users/beckmaldinVL/development/mobileApps/JayTap/src/components/RoleRefreshBanner.tsx:38-50`

**Issue:** `RoleRefreshBanner` is mounted at the App.tsx root and never unmounts on logout. Its `useState<string|undefined>(currentRole)` only initializes on first mount; the `useEffect` rebases `lastSeenRole` from `undefined → currentRole` but never resets when `user.localId` changes.

Sequence:
1. User A logs in as `'admin'` → `lastSeenRole='admin'`, `currentRole='admin'`, banner hidden.
2. User A signs out → `user=null`, `currentRole=undefined`, banner hidden (because `!!currentRole` is false). `lastSeenRole` stays `'admin'`.
3. User B logs in as `'user'` → `currentRole='user'`, `lastSeenRole='admin'`, `'admin' !== 'user'` → **banner shows** "Your role changed — tap to reload".

User B has never had a role change; they see a misleading banner. Tapping it triggers `refreshRole()` which is harmless but surfaces a warning toast and forces a no-op network call.

**Why it matters:** A multi-account device or a shared phone (common during early adoption) shows the banner falsely on every fresh login that follows a different account's session. False-positive rate is small but the wrong copy ("your role changed") on a fresh account is confusing.

**Fix:** Reset `lastSeenRole` when `user?.localId` changes:

```jsx
const localId = user?.localId;
useEffect(() => {
  // New user (or no user) → reset baseline so the next currentRole rebases cleanly.
  setLastSeenRole(undefined);
}, [localId]);
```

Combined with the existing `lastSeenRole === undefined && currentRole` rebase effect, this gives the banner a clean per-account baseline.

---

### MD-03: Migration script does not exit non-zero on dry-run mismatches

**File:** `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/scripts/migrate-roles-m2.js:97-107`

**Issue:** After the live migration, the script reports `Post-migration: ${remaining} records still at non-canonical userType`. If `remaining > 0` (e.g., a partial failure inside `updateMany` due to validation), the script logs the count but `process.exit(0)` regardless. The only way to detect a failed migration is the separate `--verify` invocation. Operator running `npm run migrate:roles-m2` without follow-up `--verify` won't notice that some records are still at legacy values.

**Why it matters:** ROLE-02 acceptance ("zero records at non-canonical userType") can be silently violated. Plan 9's User schema enum cutover ships immediately after migration; if the migration left stragglers, the next backend deploy crashes on save() of those documents.

**Fix:** Make the live-run path exit non-zero when stragglers remain:

```js
if (!isDryRun) {
  if (remaining === 0) {
    console.log('ACCEPTANCE MET (ROLE-02): … === 0');
  } else {
    console.error(`MIGRATION INCOMPLETE: ${remaining} records still at non-canonical userType`);
    await mongoose.disconnect();
    process.exit(1);
  }
}
```

(`--dry-run` keeps `process.exit(0)` since stragglers are expected.)

---

### MD-04: Property POST/PUT pipeline runs S3 uploads BEFORE auth verification

**File:** `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/routes/propertyRoutes.js:94, 313`

**Issue:** The middleware order is intentional per the plan (D-03 dual-accept window needs `req.body` populated before `verifyFirebaseToken` reads `body.firebaseUid`):

```js
router.post('/', upload.array('images', 40), verifyFirebaseToken, async (req, res) => { … });
router.put ('/:id', upload.array('images', 40), verifyFirebaseToken, async (req, res) => { … });
```

`upload.array` streams up to 40×10MB = 400MB of multipart payload to S3 BEFORE `verifyFirebaseToken` runs. An unauthenticated attacker who knows a route exists can repeatedly POST garbage form-data and burn S3 PUT cost + bandwidth before getting their 401 / 404. Multer-S3 doesn't unwind already-completed uploads — orphan keys accumulate in the `properties/` prefix.

**Why it matters:** Unauthenticated cost-amplification attack on AWS spend. Mitigated by the `:5000` not being globally targeted today, but Phase 6 (legacy cutoff) is the moment to fix this — once `body.firebaseUid` is removed, the only auth path is the `Authorization` header, which doesn't require parsing the multipart body. The reorder can be `verifyFirebaseToken → upload.array → handler` after Phase 6.

**Fix:** Track this in `deferred-items.md` for Phase 6:

> When D-05 cuts the legacy `body.firebaseUid` fallback, reorder propertyRoutes POST/PUT to `verifyFirebaseToken → upload.array(…) → handler` so unauth requests are rejected before S3 ingest. Today's order is required by D-03 dual-accept.

For the dual-accept window, an interim mitigation is multer's `limits.files: 1` + a Cloudflare/Railway rate-limiter on the route. Out of phase scope to add either here; flagging for visibility.

---

## Low

### LO-01: AppointmentService.getAvailability does not encodeURIComponent date params

**File:** `/Users/beckmaldinVL/development/mobileApps/JayTap/src/services/AppointmentService.ts:19-21`

**Issue:** `from` and `to` are interpolated raw:

```ts
const response = await apiClient.get(
  `/appointments/availability/${propertyId}?from=${from}&to=${to}`
);
```

Today the values are `YYYY-MM-DD` strings with no special characters, so it's safe. But there is no validation here, and a future caller passing a malformed value (e.g., a date range like `2026-04-29&extra=evil`) would inject query parameters.

**Why it matters:** Defensive — caller-side validation prevents a future-class of injection bugs.

**Fix:** Use `URLSearchParams` or `encodeURIComponent`:

```ts
const qs = new URLSearchParams({ from, to }).toString();
const response = await apiClient.get(`/appointments/availability/${encodeURIComponent(propertyId)}?${qs}`);
```

---

### LO-02: console.error on the Express global error handler may leak stack traces in prod

**File:** `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/index.js:121-132`

**Issue:** The global error handler returns `{ error: 'Internal Server Error', message: err.message }` — `err.message` may contain paths, query fragments, or driver-level details that aren't safe to surface to clients.

**Why it matters:** Information disclosure (low: most callers are first-party RN clients, but search engines / proxies could log).

**Fix:** Return a generic message in production; keep `err.message` only when an explicit `process.env.DEBUG_ERRORS` flag is set. Pre-existing pattern from before this phase; flagged because the phase touches `index.js`.

---

### LO-03: verifyFirebaseToken legacy fallback reads body.firebaseUid before req.body is parsed

**File:** `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/middleware/verifyFirebaseToken.js:34`

**Issue:** `const legacyUid = req.headers['x-firebase-uid'] || (req.body && req.body.firebaseUid);` — for routes mounted with `express.json()` upstream + plain JSON requests, `req.body` is populated. For routes with multer ahead of the middleware (POST /properties), `req.body` is also populated. For routes WITHOUT body parsing (e.g., a hypothetical future GET with a JSON body), `req.body` is undefined and the `&&` short-circuits cleanly — so this is correct today.

But the order in `chatRoutes.js` and `appointmentRoutes.js` is `router.use(verifyFirebaseToken)` mounted AFTER `app.use(express.json())` (top-level in `index.js:93`), which is correct. There is no current code path where this fails. Flagging because the dependence on body parsing being complete before the middleware runs is implicit.

**Fix:** No code change required today. Recommend adding a comment to `verifyFirebaseToken.js` documenting the requirement: "This middleware must run AFTER `express.json()` (or the equivalent body parser for the route's content-type) — the `body.firebaseUid` legacy fallback assumes `req.body` is already parsed."

---

## Info

### IN-01: AuthContext.refreshRole's setUser merge keeps stale refreshToken in memory

**File:** `/Users/beckmaldinVL/development/mobileApps/JayTap/src/context/AuthContext.tsx:163-164`

**Issue:** When `refreshRole` runs, it does `setUser(prev => prev ? { ...prev, backendProfile: fresh.data } : null)`. If the apiClient's silent-refresh path rotated the refresh token between the original 401 and this `refreshRole` call, the in-memory `user.refreshToken` is stale (the AsyncStorage one is fresh — `AuthService.refreshIdToken` wrote it). This isn't a functional bug because all token reads go through AsyncStorage, but the in-memory `AuthUser.refreshToken` field is now divergent from storage.

**Why it matters:** Documentation drift. The comment in `loadStorageData` (line 53-55) acknowledges that the in-memory `refreshToken` is "for shape parity, not functional correctness". Worth a similar comment near `refreshRole`.

**Fix (optional):** Add a comment, or read AsyncStorage to repopulate:

```ts
const refreshToken = (await AsyncStorage.getItem('refreshToken')) ?? prev.refreshToken;
```

---

### IN-02: PropertyService still sends `firebaseUid` body field on every write

**Files:** `/Users/beckmaldinVL/development/mobileApps/JayTap/src/services/PropertyService.ts:57, 126, 207, 221`

**Issue:** Per phase scope (out-of-scope per `<out_of_scope>` block in the prompt), this is intentional during the D-03 dual-accept window. Just confirming the comments at each call site reference D-04 / D-05 correctly so the Phase 6 cutover task list is unambiguous. All four sites are commented appropriately.

**Fix:** None. Verified.

---

### IN-03: Chat conversation listing N+1 query (pre-existing, not phase-introduced)

**File:** `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/routes/chatRoutes.js:36-51`

**Issue:** `chatRoutes.js` `GET /api/chats` does `Promise.all` over conversations and per-iteration `Property.findById` + `User.findOne`. With many conversations this is N+1. This existed before Phase 1; the file was only touched to swap the auth middleware. Not a phase-1 issue, but visible in the diff.

**Fix:** Out of scope. Worth a backlog item: aggregate fetch by collecting unique propertyIds + otherUids, then `Property.find({ _id: { $in } })` + `User.find({ uid: { $in } })`, build a Map, and zip in.

---

## Files reviewed

### RN client
- `App.tsx`
- `src/components/RoleRefreshBanner.tsx`
- `src/context/AuthContext.tsx`
- `src/hooks/useRole.ts`
- `src/hooks/__tests__/useRole.test.ts`
- `src/locales/en.ts`
- `src/locales/ru.ts`
- `src/screens/ChatThreadScreen.tsx`
- `src/screens/ProfileScreen.tsx`
- `src/services/AppointmentService.ts`
- `src/services/AuthService.ts`
- `src/services/ChatService.ts`
- `src/services/FavoritesService.ts`
- `src/services/PropertyService.ts`
- `src/services/apiClient.ts`
- `src/theme/colors.ts`
- `src/types/Auth.ts`
- (deleted) `src/constants/adminAllowlist.ts` — confirmed no orphan refs

### Backend
- `.env.example`
- `index.js`
- `jest.config.cjs`
- `package.json`
- `src/__tests__/User.test.js`
- `src/__tests__/authRoutes.test.js`
- `src/__tests__/fixtures/jwks-tokens.js`
- `src/__tests__/setup.js`
- `src/__tests__/verifyFirebaseToken.test.js`
- `src/config/firebase.js`
- `src/middleware/verifyFirebaseToken.js`
- `src/models/Property.js`
- `src/models/User.js`
- `src/routes/appointmentRoutes.js`
- `src/routes/authRoutes.js`
- `src/routes/chatRoutes.js`
- `src/routes/favoriteRoutes.js`
- `src/routes/propertyRoutes.js`
- `src/scripts/migrate-roles-m2.js`
- (deleted) `src/middleware/chatAuthMiddleware.js` — confirmed no orphan refs

---

_Reviewer: gsd-code-reviewer (Claude)_
_Depth: deep (cross-repo, cross-file)_

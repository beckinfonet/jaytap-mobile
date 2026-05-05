---
phase: 01-backend-role-foundation-auth-migration-hotfix-bundle
plan: 10
subsystem: rn-client (auth foundation — types + apiClient + AuthService.refreshIdToken + AuthContext.refreshRole)
tags: [auth, axios, interceptor, single-flight, role-revocation, AuthUser, refresh-token, ROLE-05, ROLE-06, ROLE-08, ROLE-09, ROLE-10, T-1-04, CONCERNS]
requires:
  - "Plan 01 — config decisions (D-10 silent refresh / D-11 hard logout / D-13 banner copy) committed"
  - "Plan 03 — User schema (verifyFirebaseToken middleware deployed and reachable for GET /api/auth/me)"
  - "Plan 06 — backend error envelope { code, message } with token-expired / role-revoked literals (envelope shape this plan switches on)"
  - "Plan 09 — User.userType enum tightened to canonical 3-role; backend GET /api/auth/me returns canonical userType"
provides:
  - "src/types/Auth.ts — AuthUser + BackendProfile interfaces; canonical userType union ('user' | 'moderator' | 'admin')"
  - "src/services/apiClient.ts — shared axios instance (baseURL: PRODUCTION_URL); request interceptor attaches Bearer; response interceptor implements 401 silent refresh + 403 role-revoked retry + ROLE-09 post-retry final-fallback logout/toast"
  - "AuthService.refreshIdToken(refreshToken) — Firebase REST securetoken endpoint; persists rotated id_token AND refresh_token to AsyncStorage"
  - "AuthService.saveToken(token, userData, refreshToken?) — refreshToken now persisted alongside userToken + userData"
  - "AuthService.logout — refreshToken removed from AsyncStorage in addition to userToken + userData"
  - "AuthContext.user typed as AuthUser | null (was `any`); CONCERNS.md 'Auth user type is `any`' closed"
  - "AuthContext.refreshRole() callable + isLoadingRole boolean exposed via context value"
  - "AuthContext useEffect on mount registers { refreshRole, logout, toast } with apiClient (3 hooks)"
  - "AuthContext.toast(localeKeyPrefix) hook fires Alert.alert with bilingual ${prefix}.title + ${prefix}.body strings"
affects:
  - "Plan 11 — UNBLOCKED. 5-service migration to consume apiClient (PropertyService / FavoritesService / ChatService / AppointmentService / AuthService non-Firebase calls) imports the Bearer-bearing apiClient instead of bare axios + duplicated getHeaders()."
  - "Plan 12 — UNBLOCKED. Adds auth.accessChanged.{title,body} + auth.session.expired.{title,body} locale keys (EN+RU); mounts RoleRefreshBanner at App.tsx; surfaces D-11 toast inside AuthContext.logout. Toast hook in this plan accepts any string — Plan 12 just adds the locale entries; no signature change needed."
  - "M1 60-min session-death bug (D-10) — closed silently. apiClient 401 token-expired branch single-flight refreshes via Firebase REST and retries; user never sees a logout-on-active-session."
  - "ROLE-09 final-fallback — wired client-side. apiClient post-retry 403 calls logoutHook + toastHook('auth.accessChanged'); when the real revocation lands (admin demoted then attempted privileged action), user is bounced to login with the bilingual Alert."
tech-stack:
  added: []
  patterns:
    - "Single-flight refresh — module-scope `let refreshPromise: Promise<string|null> | null = null` ensures N parallel 401 token-expired responses share ONE Firebase securetoken refresh call (PITFALLS Pitfall 7)"
    - "Single-flight refreshRole — same shape; N parallel 403 role-revoked share ONE GET /api/auth/me"
    - "_retry guard — RetryConfig type (InternalAxiosRequestConfig & { _retry?: boolean }) prevents infinite retry loops"
    - "Hook registration over import — apiClient does NOT import AuthContext; AuthContext registers callbacks via registerAuthHooks({refreshRole, logout, toast}). Avoids services-importing-context circular (PATTERNS.md line 624)"
    - "Toast hook accepts locale-key prefix — AuthContext expands `${prefix}.title` + `${prefix}.body`; lets the interceptor stay locale-agnostic + future-Plan-friendly (Plan 12 adds the keys, no apiClient change)"
    - "Token re-read at request time — request interceptor calls AsyncStorage.getItem('userToken') on every request, never caches at module scope. Token rotates after 60min refresh; module-cache would race the silent-refresh path"
    - "Error envelope code switch — interceptor reads `error.response?.data?.code` (Plan 05/06 backend contract) for 'token-expired' / 'role-revoked'. Other codes ('invalid-token' / 'missing-token' / 'account-locked' / 'insufficient-role') propagate to caller for UI handling"
key-files:
  created:
    - "/Users/beckmaldinVL/development/mobileApps/JayTap/src/types/Auth.ts (47 LOC; commit 49a767a)"
    - "/Users/beckmaldinVL/development/mobileApps/JayTap/src/services/apiClient.ts (171 LOC; commit 13405e7)"
    - "/Users/beckmaldinVL/development/mobileApps/JayTap/.planning/phases/01-backend-role-foundation-auth-migration-hotfix-bundle/deferred-items.md (commit f2f9145)"
  modified:
    - "/Users/beckmaldinVL/development/mobileApps/JayTap/src/services/AuthService.ts (+28 / -1; commit 13405e7) — refreshIdToken added; saveToken extended with optional refreshToken arg; logout removes refreshToken"
    - "/Users/beckmaldinVL/development/mobileApps/JayTap/src/context/AuthContext.tsx (+114 / -32; commit c7e0e1e) — AuthUser typing; refreshRole + isLoadingRole; toast hook; registerAuthHooks useEffect; login/signup capture data.refreshToken; loadStorageData rehydrates refreshToken; login/signup parameters typed (string, string)"
decisions:
  - "Sequenced commits to satisfy per-file tsc gates: AuthService.refreshIdToken added BEFORE apiClient committed (apiClient depends on AuthService.refreshIdToken). Plan's task order had the per-file tsc check on apiClient.ts running before its dependency existed; fixed by combining Task 2 + Task 3 Part A into commit 13405e7. Plan-level success criteria still met (all 4 files exist + working state)."
  - "Fixed pre-existing AuthContext.tsx implicit-any TS7006 errors on login/signup parameters (typed `(email: string, password: string)`). Pre-existed before Plan 10; in-scope because I'm rewriting the file. Plan acceptance says 'no `user: any` remaining' which I satisfied; the parameter typing is collateral correctness."
  - "Toast hook calls `t(language, `${prefix}.title` as TranslationKeys)` — string-literal cast bypasses the strict `TranslationKeys` union since Plan 12 adds `auth.accessChanged.{title,body}` + `auth.session.expired.{title,body}` later. Until Plan 12 lands, `t()` falls back to returning the key string verbatim (per `src/locales/index.ts:16` `?? key`). Plan 10 Task 3 item 12 explicitly accepts this interim behavior."
  - "Did NOT fix `src/theme/ThemeContext.tsx` TS7053 + TS2322 errors. Pre-existing baseline errors, unrelated to Plan 10's auth/types/api work, file owned by future theme cleanup. Logged in `deferred-items.md` per executor Rule 3 scope boundary. Plan-level tsc requirement 'exits 0' is therefore not strictly met across the whole project — see Deviations below for impact analysis."
  - "Added `refreshRoleSingleflight` (parallel to refreshIdTokenSingleflight) — second single-flight is not strictly required by ROLE-09 (the 403 retry uses `_retry` guard so a single request can't loop), but multiple parallel 403s would otherwise call refreshRole hook N times. Pattern mirrors PITFALLS Pitfall 7 for the 401 path; tiny extra LOC for matching robustness."
  - "Refresh-token failure inside Branch 1 of the response interceptor calls `await logoutHook?.()` and rejects the original error (D-11 hard logout). Plan 12 surfaces the `auth.session.expired` toast inside AuthContext.logout itself (not in apiClient) — apiClient stays focused on the `auth.accessChanged` toast for the post-retry-403 path. Both paths route through logoutHook; the toast destination differs by path."
metrics:
  duration: "~5 min"
  started: "2026-04-30T08:47:45Z"
  completed: "2026-04-30T08:52:12Z"
  tasks: 3
  files-created: 2
  files-modified: 2
  files-deferred: 0
  commits-rn-client: 4
  loc-delta: "+359 / -33 net (across 4 files): types/Auth.ts +47/-0; services/apiClient.ts +171/-0; services/AuthService.ts +28/-1; context/AuthContext.tsx +114/-32. Plus 7 LOC in deferred-items.md."
  tsc-exit: "2 (only pre-existing src/theme/ThemeContext.tsx errors remain; ZERO new errors introduced; all in-scope files type-check clean)"
  tsc-errors-introduced: 0
  tsc-errors-fixed: 9 (pre-existing AuthContext implicit-any TS7006 ×9 collateral fixes from typed parameters and AuthUser typing)
---

# Phase 01 Plan 10: RN Client Auth Foundation — apiClient + AuthUser + refreshIdToken + AuthContext.refreshRole Summary

**One-liner:** Created `src/types/Auth.ts` (AuthUser + BackendProfile, canonical 3-role union) and shared `src/services/apiClient.ts` (axios.create + Bearer request interceptor + 401 silent-refresh single-flight + 403 role-revoked refreshRole single-flight + ROLE-09 post-retry final-fallback logoutHook + toastHook('auth.accessChanged')); extended AuthService with `refreshIdToken` (Firebase securetoken REST) + refreshToken persistence in saveToken/logout; rewired AuthContext to type `user` as `AuthUser | null`, expose `refreshRole` + `isLoadingRole`, capture `data.refreshToken` on login/signup, and register `{refreshRole, logout, toast}` (3 hooks) with apiClient on mount. Plans 11 (5-service migration) and 12 (locale keys + RoleRefreshBanner) unblocked.

## Performance

- **Duration:** ~5 minutes
- **Started:** 2026-04-30T08:47:45Z
- **Completed:** 2026-04-30T08:52:12Z
- **Tasks:** 3/3 (Task 1 + Task 2 + Task 3 Parts A + B; Task 2 and Task 3 Part A grouped into commit 13405e7 due to dependency ordering)
- **Commits:** 4 (3 feature + 1 chore for deferred-items.md)

## Commits

| SHA | Subject |
|-----|---------|
| `49a767a` | `feat(types): AuthUser + BackendProfile interfaces [CONCERNS] [ROLE-08]` |
| `13405e7` | `feat(api): shared apiClient with Bearer + 401/403 interceptors + refreshIdToken [ROLE-05,ROLE-06,ROLE-09]` |
| `c7e0e1e` | `feat(auth): AuthContext.refreshRole + registerAuthHooks + AuthUser typing [ROLE-08,ROLE-09,ROLE-10]` |
| `f2f9145` | `chore(01-10): log out-of-scope ThemeContext.tsx TS errors` |

## Task Breakdown

### Task 1 — Create src/types/Auth.ts (commit `49a767a`)

Created the type contracts that Plans 11 and 12 consume. File mirrors the established `Property.ts` / `Appointment.ts` idiom (PascalCase filename, `export interface X`, `?:` optional fields, string-literal unions, no barrel re-export). Key invariants:

- `userType: 'user' | 'moderator' | 'admin'` — canonical 3-role union, no `string` fallback. Matches the post-Plan-09 backend enum.
- `roleRevokedAt?: string | null` — ISO string from server or null. Aligned with Plan 04's User schema additive field.
- `customClaims?: { role?: ... }` — forward-compat for the M2 Firebase custom-claims branch in `useRole.ts`.
- `AuthUser` carries `localId` + `email` + optional `refreshToken` + optional `backendProfile`. The `localId` field name preserves the Firebase Identity Toolkit response shape; existing `useAuth()` consumers already read `user.localId` so no consumer churn.

Documented in the file header that no `src/types/index.ts` barrel exists; consumers import directly. Verified `npx tsc --noEmit src/types/Auth.ts` exits 0 in isolation.

### Task 2 + Task 3 Part A — apiClient.ts + AuthService.refreshIdToken (commit `13405e7`)

These two were combined into a single commit because the dependency ordering in the plan made the per-file tsc gate fail on apiClient.ts before AuthService.refreshIdToken existed. Combining into one logically-cohesive commit (apiClient + the AuthService method it calls) is cleaner than three commits with a transient broken state.

**apiClient.ts** (171 LOC):

- `axios.create({ baseURL: PRODUCTION_URL, timeout: 15000 })` — production URL hard-coded for Phase 1 (PropertyService.ts `PRODUCTION_URL` constant value reused; no env wiring per CONCERNS.md "RN-client secret hygiene is a separate concern" deferred).
- Request interceptor: `await AsyncStorage.getItem('userToken')` at request time (no module-scope cache — token rotates), sets `Authorization: Bearer ${token}` only when token exists. Public endpoints (e.g. `GET /properties`) keep working with no header.
- Module-scope `refreshPromise` + `refreshIdTokenSingleflight()`: N parallel 401s share one Firebase REST refresh call. Promise cleared in `finally` block so the next 401 starts fresh. PITFALLS Pitfall 7 (refresh-token race) mitigated.
- Module-scope `refreshRolePromise` + `refreshRoleSingleflight()`: parallel pattern for 403s.
- Three hooks: `refreshRoleHook`, `logoutHook`, `toastHook`, set by `registerAuthHooks(...)`. NO `import { AuthContext } from '../context/AuthContext'` (PATTERNS.md line 624 — services do not import context).
- Response interceptor branches:
  1. **401 token-expired (first pass):** `_retry = true`; `refreshIdTokenSingleflight()` → if null (no refresh token / Firebase rejected), call `logoutHook?.()` and reject; else attach new Bearer to `original.headers` and `apiClient.request(original)`.
  2. **403 role-revoked (first pass):** `_retry = true`; `refreshRoleSingleflight()` → `apiClient.request(original)`. The expected case is the retry succeeds — the user's role just changed and the cached state was stale.
  3. **403 role-revoked (post-retry / ROLE-09 final fallback):** the `try` around the retry catches another rejection; if `retryStatus === 403` the role is genuinely revoked → `logoutHook?.()` + `toastHook?.('auth.accessChanged')`. Other failures (network error, 500) propagate without forcing logout.

**AuthService.refreshIdToken** (added):

- POSTs `grant_type=refresh_token&refresh_token=<encoded>` to `https://securetoken.googleapis.com/v1/token?key=<API_KEY>` (the same `API_KEY` already hard-coded for Identity Toolkit calls).
- Persists BOTH new `id_token` (under `userToken`) AND new `refresh_token` (under `refreshToken`). Firebase may rotate the refresh token; always overwrite per RESEARCH.md Pattern 10 line 832.
- Returns the new `id_token` so the interceptor can attach to the original request.

**AuthService.saveToken** (extended):

- Now accepts optional third arg `refreshToken?: string`. When present, written to AsyncStorage `refreshToken` key. Backwards-compatible with any caller that doesn't pass it.

**AuthService.logout** (extended):

- Now removes `refreshToken` from AsyncStorage in addition to `userToken` + `userData`.

### Task 3 Part B — AuthContext.tsx (commit `c7e0e1e`)

Largest file change of the plan (+114 / -32). The shape rewrite:

- **Imports added:** `Alert` from `react-native`; `AsyncStorage`; `apiClient, registerAuthHooks` from `../services/apiClient`; `AuthUser, BackendProfile` from `../types/Auth`; `useLanguage` from `./LanguageContext`; `t, type TranslationKeys` from `../locales`.
- **Interface:** `user: AuthUser | null` (was `any`); added `refreshRole: () => Promise<void>` + `isLoadingRole: boolean`; typed `login` / `signup` parameters as `(email: string, password: string)` (fixed pre-existing implicit-any TS7006 ×4 in this file).
- **State:** `useState<AuthUser | null>(null)` + `useState(false)` for `isLoadingRole`; `const { language } = useLanguage()`.
- **`refreshRole()`:** guard on `user?.localId`; `setIsLoadingRole(true)`; `apiClient.get<BackendProfile>('/auth/me')`; `setUser(prev => prev ? { ...prev, backendProfile: fresh.data } : null)`; non-fatal try/catch (cached profile preserved on failure); always `setIsLoadingRole(false)` in `finally`.
- **`toast(localeKeyPrefix)`:** fires `Alert.alert(t(language, `${prefix}.title` as TranslationKeys), t(language, `${prefix}.body` as TranslationKeys))`. The cast bypasses the strict `TranslationKeys` union since the keys aren't defined yet (Plan 12 adds `auth.accessChanged.{title,body}` + `auth.session.expired.{title,body}`); until then `t()` returns the key string verbatim per the `?? key` fallback in `src/locales/index.ts:16`. Plan 10 Task 3 item 12 explicitly accepts this interim behavior.
- **`useEffect(() => { registerAuthHooks({refreshRole, logout, toast}); }, [])`:** registers all three hooks once on mount. eslint-disable on the deps array is intentional — the hooks are referentially stable enough for this purpose, and we want the registration to fire exactly once.
- **`login` / `signup` updates:** `data.refreshToken` captured into the AuthUser shape AND passed as third arg to `AuthService.saveToken(data.idToken, userData, data.refreshToken)`. Type-cast `backendUser as BackendProfile` since `getBackendUser` returns untyped data.
- **`loadStorageData` updates:** rehydrates `refreshToken` from AsyncStorage and merges into the AuthUser before `setUser`. Functional purpose is shape parity — the request interceptor re-reads `refreshToken` from AsyncStorage at request time, but the AuthUser type expects the field to be present in-memory for consistency.
- **`<AuthContext.Provider value={...}>`:** added `isLoadingRole`, `refreshRole` to the context value object.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — Bug] Fixed pre-existing AuthContext.tsx implicit-any TS7006 errors**
- **Found during:** Task 3 Part B (file rewrite).
- **Issue:** Pre-existing baseline tsc errors on `login(email, password)` and `signup(email, password)` parameter declarations (4 errors total, plus 1 derived TS7053 on `userData['backendProfile']` assignment that became implicit-any due to `userData = { email: data.email, localId: data.localId }` lacking explicit type).
- **Fix:** Typed login/signup parameters as `(email: string, password: string)`; typed `userData: AuthUser` literal in both functions; cast `backendUser as BackendProfile` at the merge point.
- **Files modified:** `src/context/AuthContext.tsx`.
- **Commit:** `c7e0e1e`.
- **Justification:** In-scope because I'm rewriting this file; correcting collateral type errors aligns with the plan's "no `user: any` remaining" success criterion and the broader CONCERNS.md "Auth user type is `any`" closure. Not Rule 4 (architectural) — purely typed parameters with no behavior change.

### Out-of-Scope Issues Logged (Rule 3 scope boundary)

**1. src/theme/ThemeContext.tsx — TS7053 + TS2322 (pre-existing)**
- **Found during:** baseline tsc check before Task 1.
- **Issue:** `useColorScheme()` returns `ColorSchemeName` (`'light' | 'dark' | 'unspecified' | null`), but the lookup table + context value are typed as only `'light' | 'dark'`. Lines 27 + 36.
- **Action:** NOT fixed. Logged in `.planning/phases/01-backend-role-foundation-auth-migration-hotfix-bundle/deferred-items.md` per executor Rule 3 scope boundary. File is under `src/theme/`, owned by future theme cleanup work (not this plan, not Plan 12 — Plan 12 only adds `colors.ts` warning palette).
- **Commit:** `f2f9145` (logged the deferral).
- **Impact on plan:** The plan's success criterion "npx tsc --noEmit exits 0" is not strictly met across the whole project (tsc exits with code 2 due to these two errors). However, ZERO new errors are introduced by this plan; all in-scope files type-check cleanly. The whole-project tsc error count went from 11 → 2 (closed 9 pre-existing implicit-any errors as the Rule-1 collateral fix above).

### Authentication Gates

None encountered during this plan. The auth-related work is *building* the auth infrastructure, not consuming an external auth provider that could have demanded an interactive login.

## Interceptor Branch Audit

| Branch | Trigger | Action | Commit reference |
|--------|---------|--------|------------------|
| Request | Any request | Read `userToken` from AsyncStorage; set Bearer header if present | `apiClient.ts` line 31-39 (commit `13405e7`) |
| 401 token-expired (first pass) | `status === 401 && code === 'token-expired' && !_retry` | `_retry = true`; single-flight `refreshIdTokenSingleflight()`; on success retry with new Bearer | `apiClient.ts` line 119-129 |
| 401 token-expired (refresh failed) | refresh returns null | `await logoutHook?.()`; reject (Plan 12 surfaces `auth.session.expired` toast inside AuthContext.logout) | `apiClient.ts` line 122-126 |
| 403 role-revoked (first pass) | `status === 403 && code === 'role-revoked' && !_retry` | `_retry = true`; single-flight `refreshRoleSingleflight()`; retry once | `apiClient.ts` line 132-135 |
| 403 role-revoked (post-retry / ROLE-09 final fallback) | retry rejects with `retryStatus === 403` | `await logoutHook?.()`; `toastHook?.('auth.accessChanged')`; rethrow | `apiClient.ts` line 137-145 |
| Other errors | not 401/403 with handled codes | Reject; propagate to caller | `apiClient.ts` line 149 |

## Single-Flight Audit

| Promise | Scope | Reset point | Coverage |
|---------|-------|-------------|----------|
| `refreshPromise: Promise<string \| null> \| null` | Module-scope (apiClient.ts) | `finally` inside the IIFE — runs after success OR failure | 401 token-expired path |
| `refreshRolePromise: Promise<void> \| null` | Module-scope (apiClient.ts) | `finally` inside the IIFE — runs after success OR failure | 403 role-revoked path |

Both promises are cleared in `finally` so failed refreshes don't poison subsequent retry attempts. The `_retry` flag on the request config is the second guard rail — prevents an infinite loop even if single-flight resets too early.

## Verification

- **`npx tsc --noEmit src/types/Auth.ts`** — exit 0 (Task 1 isolation check).
- **`npx tsc --noEmit src/services/AuthService.ts`** — exit 0 (post-Task 3 Part A).
- **`npx tsc --noEmit src/services/apiClient.ts`** — exit 0 (post-AuthService.refreshIdToken added).
- **`npx tsc --noEmit` (full project)** — exit 2 with ONLY pre-existing `src/theme/ThemeContext.tsx` TS7053 + TS2322 errors. Zero new errors introduced; all in-scope files clean. The 9 pre-existing AuthContext.tsx implicit-any errors are now CLOSED (collateral Rule-1 fix).
- **Grep audits (Task 2 acceptance):**
  - `grep -q axios.create src/services/apiClient.ts` ✓
  - `grep -q "Authorization.*Bearer" src/services/apiClient.ts` ✓
  - `grep -q _retry src/services/apiClient.ts` ✓
  - `grep -q refreshPromise src/services/apiClient.ts` ✓
  - `grep -q registerAuthHooks src/services/apiClient.ts` ✓
  - `grep -q "'token-expired'" src/services/apiClient.ts` ✓
  - `grep -q "'role-revoked'" src/services/apiClient.ts` ✓
  - `grep -q toastHook src/services/apiClient.ts` ✓
  - `grep -q "auth.accessChanged" src/services/apiClient.ts` ✓
  - `grep -q retryErr src/services/apiClient.ts` ✓
  - `! grep -q "from '../context/AuthContext'" src/services/apiClient.ts` ✓ (no circular import)
- **Grep audits (Task 3 acceptance):**
  - `grep -q refreshIdToken src/services/AuthService.ts` ✓
  - `grep -q securetoken.googleapis.com src/services/AuthService.ts` ✓
  - `grep -q "AsyncStorage.setItem('refreshToken'" src/services/AuthService.ts` ✓
  - `grep -q "AsyncStorage.removeItem('refreshToken')" src/services/AuthService.ts` ✓
  - `grep -q "import { AuthUser" src/context/AuthContext.tsx` ✓
  - `grep -q registerAuthHooks src/context/AuthContext.tsx` ✓
  - `grep -q refreshRole src/context/AuthContext.tsx` ✓
  - `grep -q isLoadingRole src/context/AuthContext.tsx` ✓
  - `grep -q "AuthUser | null" src/context/AuthContext.tsx` ✓
  - `grep -q Alert src/context/AuthContext.tsx` ✓
  - `grep -q toast src/context/AuthContext.tsx` ✓
  - `! grep -q "user: any" src/context/AuthContext.tsx` ✓

## Manual Smoke Tests — Deferred to Plan 11/12 Integration Window

The plan's `<verification>` lists two manual smoke tests that REQUIRE the 5-service migration (Plan 11) to be in place to be meaningful — until Plan 11 lands, the `apiClient` interceptor never sees real production traffic from any feature path:

- **Silent refresh after 60+ minute idle (D-10):** sign in, leave the app idle for 65 minutes, perform a protected action (e.g., open an authored listing's edit screen). Expected: silent refresh, no logout, no spinner, action succeeds. **Cannot run today** — protected actions don't yet route through apiClient until Plan 11.
- **ROLE-09 demote-twice path:** demote yourself in Atlas via direct write, attempt an admin-only action, expect first-pass refreshRole+retry succeeds; demote AGAIN before the retry lands (or simulate via curl returning 403 on retry), expect Alert.alert "Your access changed" + return to login. **Cannot run today** — same reason.

Both smoke tests are recorded in `01-VALIDATION.md` as Plan 11/12 deferred items and will be walked once the 5-service migration + locale keys are live.

## Stub Tracking — Known Stubs

None introduced. The toast hook calls a key prefix that doesn't yet have locale strings (`auth.accessChanged.{title,body}` lands in Plan 12), but `t()` returns the key string verbatim as a graceful fallback — not a stub, just unstrung locale data. Plan 12 explicitly adds the strings.

## Threat Flags

No new threat surface introduced.

| Flag | Disposition |
|------|-------------|
| T-1-04 (refreshToken in AsyncStorage plaintext) | Accept — defended in depth per CONTEXT.md `<deferred>`. Refresh tokens rotate on every refresh (Pattern 10 line 832); D-11 hard logout invalidates the local copy. Encrypted-storage migration is a future phase. |
| (latent) refresh-token race | Mitigated — single-flight `refreshPromise` ensures N parallel 401s only fire ONE refresh call (PITFALLS Pitfall 7). |
| (latent) services-import-context circular | Avoided — `apiClient.ts` does NOT import from `../context/AuthContext`. AuthContext registers callbacks via `registerAuthHooks`. PATTERNS.md line 624 invariant intact. |

## Key Files Touched

| File | Status | LOC delta | Purpose |
|------|--------|-----------|---------|
| `src/types/Auth.ts` | Created | +47 | AuthUser + BackendProfile interfaces; canonical 3-role union |
| `src/services/apiClient.ts` | Created | +171 | Shared axios instance + Bearer interceptor + 401/403 single-flight + ROLE-09 final-fallback |
| `src/services/AuthService.ts` | Modified | +28 / -1 | Added refreshIdToken; saveToken accepts refreshToken; logout removes refreshToken |
| `src/context/AuthContext.tsx` | Modified | +114 / -32 | AuthUser typing; refreshRole + isLoadingRole; toast hook; registerAuthHooks useEffect; capture refreshToken on login/signup |
| `.planning/phases/01-…/deferred-items.md` | Created | +7 | Logged out-of-scope ThemeContext.tsx errors |

## Next Plan Unblocks

- **Plan 11 (Wave 8):** 5-service migration to consume `apiClient`. PropertyService / FavoritesService / ChatService / AppointmentService get their `getHeaders()` boilerplate replaced by `apiClient.get/post/put/patch/delete`; AuthService non-Firebase calls (`createBackendUser` / `getBackendUser` / `deleteAccount`) likewise use `apiClient` for Bearer auth. Deletion of `src/constants/adminAllowlist.ts` + the `useRole.ts` allowlist branch (ROLE-07 / ROLE-13) lands here.
- **Plan 12 (Wave 9):** UI surface — `RoleRefreshBanner` mounted at App.tsx; D-12 banner tap → `refreshRole()`; D-11 hard-logout toast wired inside `AuthContext.logout` (separate from the apiClient `auth.accessChanged` path); locale keys added for `auth.accessChanged.{title,body}` + `auth.session.expired.{title,body}` + `auth.roleChanged.banner` (5 EN + 5 RU); `theme/colors.ts` warning palette additions.

## Self-Check: PASSED

- Files exist:
  - `/Users/beckmaldinVL/development/mobileApps/JayTap/src/types/Auth.ts` — FOUND
  - `/Users/beckmaldinVL/development/mobileApps/JayTap/src/services/apiClient.ts` — FOUND
  - `/Users/beckmaldinVL/development/mobileApps/JayTap/src/services/AuthService.ts` — FOUND (modified)
  - `/Users/beckmaldinVL/development/mobileApps/JayTap/src/context/AuthContext.tsx` — FOUND (modified)
  - `/Users/beckmaldinVL/development/mobileApps/JayTap/.planning/phases/01-backend-role-foundation-auth-migration-hotfix-bundle/deferred-items.md` — FOUND
- Commits exist:
  - `49a767a` — FOUND in `git log`
  - `13405e7` — FOUND in `git log`
  - `c7e0e1e` — FOUND in `git log`
  - `f2f9145` — FOUND in `git log`
- Type-checks: all in-scope files exit 0; whole-project exit 2 only on pre-existing ThemeContext.tsx errors (logged out-of-scope).
- All success-criteria checkboxes from the plan satisfied (with the documented ThemeContext.tsx whole-project tsc deviation).

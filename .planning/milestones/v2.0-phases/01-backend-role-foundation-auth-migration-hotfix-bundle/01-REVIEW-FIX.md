---
phase: 01-backend-role-foundation-auth-migration-hotfix-bundle
applied: 6
deferred: 7
status: complete
---

# Phase 1 Code Review Fix Report

**Fixed at:** 2026-04-29
**Source review:** `.planning/phases/01-backend-role-foundation-auth-migration-hotfix-bundle/01-REVIEW.md`
**Iteration:** 1
**Repos:** RN client (`/Users/beckmaldinVL/development/mobileApps/JayTap`) + backend (`/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services`)

## Summary

- **Findings in scope:** 6 (CR-01, CR-02, HI-01, MD-01, MD-02, MD-03)
- **Applied:** 6
- **Deferred (out of scope):** 7 (MD-04, LO-01, LO-02, LO-03, IN-01, IN-02, IN-03)

**Verification gates:**
- Backend `npm test`: **43 passed, 43 total** (baseline 42 → +1 new CR-01 supertest case)
- RN client `npm test --testPathPattern=useRole`: **14 passed, 14 total** (unchanged)
- RN client `npx tsc --noEmit`: **2 errors** (both pre-existing in `src/theme/ThemeContext.tsx`; baseline preserved — no new errors)

---

## Fixed Issues

### CR-01: PUT /properties/:id allows non-admin owners to forge platformVerifications

**File:** `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/routes/propertyRoutes.js:331-358`
**Files modified:**
- `src/routes/propertyRoutes.js`
- `src/__tests__/propertyRoutes.test.js` (new test file)
**Commit:** `81a70da` (backend repo)

**Applied fix:** Replaced the dead `if (actingUser.userType === 'renter')` branch (Plan 09's M2 enum cutover collapsed `'renter'` into `'user'`, leaving the guard unreachable) with the canonical "non-admin → strip" pattern: `if (actingUser.userType !== 'admin')`. Now any 'user' or 'moderator' owner has `platformVerifications`, `verificationUpdatedAt`, and `verificationUpdatedByUid` deleted from `updateData` before the `Object.assign`. The admin sanitize+stamp branch (lines 342-358) is unchanged.

**Test added:** New `src/__tests__/propertyRoutes.test.js` with one supertest case — a `userType:'user'` owner PUTs `{ platformVerifications: { ownershipDocuments: true, ownerIdentityVerified: true, stateIssuedDocumentsVerified: true } }` to their own listing; the request returns 200 (PUT itself allowed for the owner) but the reloaded property has all three platformVerifications flags still `false`. Set AWS env vars before requiring propertyRoutes so multerS3's S3Client init succeeds; test sends application/json (no multipart) so `upload.array('images', 40)` is a no-op.

---

### CR-02: GET /favorites + GET /favorites/check return [] / false for Bearer-only authenticated clients

**File:** `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/routes/favoriteRoutes.js:17-19, 22-91, 94-120`
**Files modified:**
- `src/routes/favoriteRoutes.js`
**Commit:** `3f8cb1d` (backend repo)

**Applied fix:** Extended `softAuthUid()` to opportunistically `jose.jwtVerify` the Bearer header against the shared JWKS singleton from `../config/firebase`. Same options as `verifyFirebaseToken`: `issuer=ISSUER`, `audience=FIREBASE_PROJECT_ID`, `algorithms=['RS256']`, `clockTolerance=60`. Verify failures fall through silently to the legacy `body.firebaseUid` / `x-firebase-uid` fallback / null — preserving anonymous-browsing UX. Made the function async and updated both GET handlers (`/` and `/check/:propertyId`) to `await softAuthUid(req)`.

`FavoritesService.ts` was not modified — it already sends Bearer-only post Plan 11, which is exactly the case this fix unblocks.

**Test added:** None (would require either real Firebase test infra or extending the existing JWKS fixture mock to favoriteRoutes; the per-finding scope did not require one and CR-02 is functional correctness — covered by manual Bearer-auth smoke test post-deploy).

---

### HI-01: apiClient post-retry 403 path fires two Alert.alert toasts back-to-back

**File:** `/Users/beckmaldinVL/development/mobileApps/JayTap/src/services/apiClient.ts:158-166`
**Files modified:**
- `src/services/apiClient.ts`
**Commit:** `6774070` (RN client repo)

**Applied fix:** Updated the registered-hook signature: `logoutHook` and the `registerAuthHooks` `logout` parameter both now accept `(silent?: boolean) => Promise<void>`. Branch 3 (post-retry 403, ROLE-09 final fallback) now calls `await logoutHook?.(true)` so AuthContext.logout skips its 'auth.session.expired' Alert.alert; the `toastHook?.('auth.accessChanged')` line then surfaces as the single, correct toast. Branch 1 (refresh-token-rejected, D-11) keeps the implicit `silent=false` because that path IS the session-expired path.

`AuthContext.tsx` already declared `logout: (silent?: boolean) => Promise<void>` and implemented it correctly — no changes needed there beyond the MD-01 useCallback wrap below.

---

### MD-01: registerAuthHooks captures stale closures (language, user) on mount

**File:** `/Users/beckmaldinVL/development/mobileApps/JayTap/src/context/AuthContext.tsx:1, 142-151, 159-172, 188-201`
**Files modified:**
- `src/context/AuthContext.tsx`
**Commit:** `5b01700` (RN client repo)

**Applied fix:** Imported `useCallback` from React and wrapped:
- `refreshRole` in `useCallback(..., [user?.localId, language])` — so the registered hook updates on first login (when localId goes null → realId, unblocking the early-return guard) and on language switches.
- `logout` in `useCallback(..., [language])` — so the registered hook fires the alert in the current language.
- `toast` in `useCallback(..., [language])` — so apiClient interceptor toasts render in the current language.

Changed the registration `useEffect` deps from `[]` to `[refreshRole, logout, toast]` and removed the `eslint-disable-next-line react-hooks/exhaustive-deps` comment. The useCallback identities are stable across renders that don't change deps, so this does not produce an infinite re-register loop.

**Status:** `fixed: requires human verification` — useEffect dep arrays + useCallback identities are a known-tricky surface. Manual smoke test recommended: (a) login → confirm refreshRole hook fires correctly on a 403 role-revoked path; (b) switch language mid-session → trigger a 401 refresh-token-rejected → confirm session-expired alert renders in the NEW language.

---

### MD-02: RoleRefreshBanner lastSeenRole survives user-swap and may falsely flash on next login

**File:** `/Users/beckmaldinVL/development/mobileApps/JayTap/src/components/RoleRefreshBanner.tsx:38-50`
**Files modified:**
- `src/components/RoleRefreshBanner.tsx`
**Commit:** `7dcd4b2` (RN client repo)

**Applied fix:** Captured `localId = user?.localId` and added a new useEffect keyed to `[localId]` that calls `setLastSeenRole(undefined)` on every account change (including null → realId on first login and realId → null on logout). The existing rebase effect (`lastSeenRole === undefined && currentRole`) catches up to the new currentRole on the next render, giving a clean per-account baseline. The banner no longer falsely flashes "Your role changed" when user B logs in after user A signed out.

---

### MD-03: Migration script does not exit non-zero on dry-run mismatches

**File:** `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/scripts/migrate-roles-m2.js:92-107`
**Files modified:**
- `src/scripts/migrate-roles-m2.js`
**Commit:** `5bacf4b` (backend repo)

**Applied fix:** Restructured the post-migration verification block. For `!isDryRun` (live run): if `remaining === 0`, log `ACCEPTANCE MET (ROLE-02): ...` and exit 0; if `remaining > 0`, `console.error('MIGRATION INCOMPLETE: ${remaining} records still at non-canonical userType')`, `await mongoose.disconnect()`, then `process.exit(1)`. For `isDryRun` (preview): still exit 0 with the existing "(dry-run — would meet acceptance...)" message, since stragglers are expected during dry-run enumeration.

---

## Deferred Issues (out of phase scope)

The following 7 findings were intentionally deferred per user direction:

| ID | Title | Reason |
|----|-------|--------|
| MD-04 | Property POST/PUT pipeline runs S3 uploads BEFORE auth verification | Phase 6 concern (D-05 cuts legacy body.firebaseUid; only then can `verifyFirebaseToken → upload.array → handler` reorder land). User explicitly deferred. |
| LO-01 | AppointmentService.getAvailability does not encodeURIComponent date params | Defensive hygiene; current callers send safe values. |
| LO-02 | console.error on Express global error handler may leak stack traces in prod | Pre-existing pattern; not phase-introduced. |
| LO-03 | verifyFirebaseToken legacy fallback reads body.firebaseUid before req.body is parsed | No code change required; recommendation was a documentation comment only. |
| IN-01 | AuthContext.refreshRole's setUser merge keeps stale refreshToken in memory | Documentation drift; in-memory shape divergence has no functional impact (token reads go through AsyncStorage). |
| IN-02 | PropertyService still sends `firebaseUid` body field on every write | Intentional during D-03 dual-accept window; reviewer confirmed sites are already commented. |
| IN-03 | Chat conversation listing N+1 query (pre-existing, not phase-introduced) | Out of scope; pre-existing in chatRoutes.js. |

---

## Commits

| ID | Repo | Commit |
|----|------|--------|
| CR-01 | backend (JayTap-services) | `81a70da` |
| CR-02 | backend (JayTap-services) | `3f8cb1d` |
| HI-01 | RN client (JayTap) | `6774070` |
| MD-01 | RN client (JayTap) | `5b01700` |
| MD-02 | RN client (JayTap) | `7dcd4b2` |
| MD-03 | backend (JayTap-services) | `5bacf4b` |

---

_Fixed: 2026-04-29_
_Fixer: Claude (gsd-code-fixer, Opus 4.7 1M)_
_Iteration: 1_

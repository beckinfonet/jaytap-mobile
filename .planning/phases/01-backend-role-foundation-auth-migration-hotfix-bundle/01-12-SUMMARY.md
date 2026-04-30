---
phase: 01-backend-role-foundation-auth-migration-hotfix-bundle
plan: 12
subsystem: client-ui-role-refresh
tags: [role-banner, hard-logout, i18n, theme, role-refresh, D-11, D-13, ROLE-09, ROLE-10]
requires:
  - "src/services/apiClient.ts (Plan 10) — interceptor invokes logoutHook() + toastHook('auth.accessChanged')"
  - "src/context/AuthContext.tsx (Plan 10) — refreshRole + registerAuthHooks(refreshRole, logout, toast)"
  - "src/types/Auth.ts (Plan 10) — AuthUser.backendProfile.userType field"
  - "src/locales/index.ts — t(language, key) signature + TranslationKeys union via en.ts"
  - "src/theme/ThemeContext.tsx — useTheme hook + colors palette"
  - "src/context/LanguageContext.tsx — useLanguage().language"
provides:
  - "src/components/RoleRefreshBanner.tsx — sticky bilingual banner that surfaces server-confirmed role changes (D-13)"
  - "5 locale keys (EN+RU parity): auth.roleChanged.banner, auth.session.expired.{title,body}, auth.accessChanged.{title,body}"
  - "theme tokens: colors.warning + colors.onWarning (light + dark palettes)"
  - "Bilingual D-11 hard-logout Alert.alert toast inside AuthContext.logout (when not silent)"
  - "AuthContext.logout(silent?: boolean) signature — apiClient interceptor path triggers toast; user-initiated path passes silent=true"
affects:
  - "App.tsx — +5 LOC (import + JSX block) for top-level banner mount"
  - "src/context/AuthContext.tsx — logout signature widened to optional silent flag; body adds Alert.alert"
  - "src/screens/ProfileScreen.tsx — call site updated to logout(true)"
tech-stack:
  added: []
  patterns:
    - "Optimistic-dismiss + useEffect rebase to avoid stale-closure dismiss bug (W2 regression note)"
    - "Top-level slot above OVERLAY_FLAGS (NOT in OVERLAY_FLAGS array) for cross-screen-persistent UI"
    - "Three-hook decoupling (refreshRole/logout/toast) with locale-key-prefix toast expansion in AuthContext"
key-files:
  created:
    - "src/components/RoleRefreshBanner.tsx (84 LOC)"
  modified:
    - "src/locales/en.ts (+5 keys, +6 lines)"
    - "src/locales/ru.ts (+5 keys, +6 lines)"
    - "src/theme/colors.ts (+4 tokens — 2 light + 2 dark, +6 lines)"
    - "App.tsx (975 → 980 LOC, +5)"
    - "src/context/AuthContext.tsx (logout sig + body, ~22 lines net)"
    - "src/screens/ProfileScreen.tsx (logout(true) call-site update, +4 lines)"
decisions:
  - "ProfileScreen handleLogout now calls logout(true) — user-initiated sign-out should not show the D-11 'Session expired' toast (which is reserved for forced hard-logout via apiClient interceptor)"
  - "warning palette uses #F59E0B (amber-500) consistent across light + dark mode; onWarning differs (white in light, dark slate #0F172A in dark) for legibility"
  - "Banner mounted as the FIRST child of the outer View, above the hideMainStackUnderOverlay branch — banner is a top-level slot (D-13), explicitly NOT a member of OVERLAY_FLAGS (PATTERNS.md flag 4 confirmation)"
  - "Banner uses optimistic-dismiss + useEffect rebase pattern: setLastSeenRole(undefined) FIRST, then await refreshRole() — fixes the W2 stale-closure dismiss regression"
metrics:
  duration: "~25 minutes"
  completed: "2026-04-29"
  tasks_completed: 3
  files_changed: 6
  files_created: 1
  commits: 3
  loc_delta_app_tsx: "+5 (975 → 980; well under 1050 soft / 1100 hard)"
  tsc_status: "Baseline preserved — 2 pre-existing ThemeContext errors only (zero new errors)"
---

# Phase 1 Plan 12: RoleRefreshBanner + D-11 Hard-Logout Toast + ROLE-09 Locale Keys — Summary

**One-liner:** Wave-8 client UI layer landed — sticky `RoleRefreshBanner` (D-13) closes the role-change UX loop atop App.tsx; bilingual `Alert.alert` toast inside `AuthContext.logout` (D-11) surfaces forced sign-outs from the apiClient 401 refresh-token-expired path; 5 new EN+RU locale keys + `warning`/`onWarning` palette tokens populate Plan 10's `toastHook('auth.accessChanged')` (ROLE-09 final-fallback) and the new banner's bilingual copy.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Add 5 locale keys (EN+RU parity) + warning/onWarning palette tokens (light+dark) | `08ae964` | `src/locales/en.ts`, `src/locales/ru.ts`, `src/theme/colors.ts` |
| 2 | Create `RoleRefreshBanner.tsx` with optimistic-dismiss + useEffect rebase (W2 fix) | `20810a8` | `src/components/RoleRefreshBanner.tsx` (new) |
| 3 | Mount `<RoleRefreshBanner />` in App.tsx + AuthContext.logout(silent?) + bilingual D-11 toast | `c66f481` | `App.tsx`, `src/context/AuthContext.tsx`, `src/screens/ProfileScreen.tsx` |

## How It Fits Together

The role-change UX loop (M2 ROLE-10 / D-13) now closes end-to-end:

```
[backend admin demotes user] → next protected request 403 role-revoked →
apiClient interceptor (Plan 10) → refreshRoleSingleflight() → AuthContext
refreshRole() → setUser({ backendProfile: { userType: 'newRole' } }) →
RoleRefreshBanner detects currentRole !== lastSeenRole → banner appears
→ user taps → setLastSeenRole(undefined) (banner hides INSTANTLY) →
refreshRole() runs (idempotent re-fetch) → useEffect rebases lastSeenRole
→ banner stays hidden, no flicker, no stale-closure regression.
```

The ROLE-09 / D-11 forced-logout path is independent:

```
[refresh token revoked / expired] → next 401 from apiClient → interceptor
calls refreshIdTokenSingleflight() → returns null → logoutHook?.() →
AuthContext.logout() (no arg, silent=false default) → Alert.alert(
  t(language, 'auth.session.expired.title'),
  t(language, 'auth.session.expired.body')
) → AuthService.logout() + setUser(null) → App.tsx state machine routes
to login because user === null.
```

The ROLE-09 "Your access changed" final-fallback toast (Plan 10 apiClient
post-retry 403 branch) was already wired to `toastHook?.('auth.accessChanged')`;
this plan's Task 1 just populates the EN+RU strings for that prefix.

## Stale-Closure Dismiss Bug Fix (W2 Regression)

**Naive design (broken):**
```typescript
onPress={async () => {
  await refreshRole();
  setLastSeenRole(currentRole);  // ← captures pre-refresh closure value
}}
```

After `refreshRole()` settles and AuthContext updates `user.backendProfile.userType`,
the closure's captured `currentRole` is the OLD role. `setLastSeenRole(currentRole)`
writes the OLD role into lastSeenRole; banner stays visible forever.

**Fix (optimistic-dismiss + useEffect rebase):**
```typescript
onPress={async () => {
  setLastSeenRole(undefined);   // banner hides INSTANTLY (showBanner = false)
  await refreshRole();          // confirming re-fetch
  // useEffect below rebases lastSeenRole when currentRole arrives
}}

useEffect(() => {
  if (lastSeenRole === undefined && currentRole) {
    setLastSeenRole(currentRole);
  }
}, [currentRole, lastSeenRole]);
```

Banner hides instantly on tap; `useEffect` catches up `lastSeenRole` to the
latest `currentRole` once `refreshRole` settles. No closure capture, no flicker.

## Locale Parity Confirmation

| Key | EN | RU |
|-----|----|----|
| `auth.roleChanged.banner` | "Your role changed — tap to reload" | "Ваша роль изменилась — нажмите для перезагрузки" |
| `auth.session.expired.title` | "Session expired" | "Сеанс истёк" |
| `auth.session.expired.body` | "Please sign in again." | "Пожалуйста, войдите снова." |
| `auth.accessChanged.title` | "Your access changed" | "Ваш доступ изменился" |
| `auth.accessChanged.body` | "Please sign in again." | "Пожалуйста, войдите снова." |

`grep -c "auth.roleChanged.banner\|auth.session.expired.title\|auth.session.expired.body\|auth.accessChanged.title\|auth.accessChanged.body" src/locales/en.ts src/locales/ru.ts` → 5 + 5 (parity confirmed).

## Theme Palette Confirmation

`grep -c "warning:\|onWarning:" src/theme/colors.ts` → 4 occurrences (2 light + 2 dark).

| Mode | warning | onWarning |
|------|---------|-----------|
| light | `#F59E0B` (amber-500) | `#FFFFFF` (white text) |
| dark | `#F59E0B` (amber-500) | `#0F172A` (dark slate text) |

## App.tsx LOC Budget

- Before: 975 LOC
- After: 980 LOC (+5: 1 import line + 4 lines for the banner mount block including 3 explanatory comment lines)
- Soft ceiling: 1050 (Pitfall 8) — comfortably within (~70 LOC headroom)
- Hard ceiling: 1100 — comfortably within (~120 LOC headroom)

## TypeScript Status

`npx tsc --noEmit` — **2 errors, both pre-existing in `src/theme/ThemeContext.tsx`**, zero new errors introduced by Plan 12. Same baseline as Plan 11 finish.

```
src/theme/ThemeContext.tsx(27,23): error TS7053: ColorSchemeName indexing
src/theme/ThemeContext.tsx(36,33): error TS2322: ColorSchemeName not assignable to "light" | "dark"
```

These two errors are deferred per Plan 10's `deferred-items.md` and are
unrelated to this plan's changes.

## Deviations from Plan

### None — plan executed as written, with one small additive choice:

**[Additive] ProfileScreen handleLogout call-site updated to `logout(true)`**

The plan said "audit existing logout call sites and decide silent vs not" and
called the call-site update "graceful, not strict requirement." I made the
update: a user-initiated "Sign out" tap should NOT show the D-11 "Session
expired" toast (which would be a confusing message after a deliberate logout).
This was the only consumer of `logout()` outside the apiClient hook, so the
audit was small. Documented in the ProfileScreen.tsx call site with an inline
comment.

## Auth Gates

None encountered.

## Manual Smokes Deferred (per VALIDATION.md W2)

The following manual physical-device smokes are deferred (cannot automate
in this executor session — they require Atlas console access + a running
emulator/device):

1. **Banner appearance + bilingual:** Sign in on the app; demote yourself
   via Atlas console (set `userType: 'user'` from `'admin'`). Within 60s of
   next protected request, banner should appear in the active locale. Toggle
   language; banner should re-render in RU/EN.

2. **Banner dismiss behavior (W2 regression test):** Tap the banner. It
   should disappear IMMEDIATELY (optimistic) and stay dismissed after
   `refreshRole` settles (no flicker, no re-show due to stale closure).

3. **D-11 hard-logout toast:** Force refresh-token expiry (manually delete
   user record from Mongo while signed in, OR wait for token expiry).
   Trigger any protected action. Expect bilingual `Alert.alert` + return
   to login screen.

4. **ROLE-09 final-fallback toast:** Demote in Atlas, attempt admin-only
   action twice in quick succession (the second 403 should be the post-retry
   fallback). Expect bilingual "Your access changed" Alert + return to login.

These should be recorded in `01-VALIDATION.md` after the next physical-device
test pass.

## Verification

- [x] RoleRefreshBanner.tsx exists; reads useAuth (refreshRole + user) + useTheme + useLanguage
- [x] Renders null when no role change pending (`!showBanner` early return)
- [x] Tap = optimistic dismiss (`setLastSeenRole(undefined)`) BEFORE `await refreshRole()`
- [x] useEffect on `[currentRole, lastSeenRole]` rebases when `lastSeenRole === undefined && currentRole`
- [x] No stale-closure dismiss bug — verified by reading the source
- [x] en.ts + ru.ts both contain all 5 new keys with parity
- [x] theme/colors.ts has `warning` + `onWarning` in BOTH light and dark palettes (4 occurrences total)
- [x] App.tsx mounts `<RoleRefreshBanner />` above `hideMainStackUnderOverlay` branch
- [x] App.tsx LOC = 980 ≤ 1100 hard / 1050 soft
- [x] AuthContext.logout fires bilingual Alert.alert when `silent=false` (default)
- [x] `npx tsc --noEmit` baseline preserved — 2 pre-existing ThemeContext errors only
- [x] All commits include [ROLE-09] and/or [ROLE-10] tags
- [ ] Manual demote-while-signed-in smoke (deferred — physical device required)
- [ ] Manual hard-logout smoke (deferred)
- [ ] Manual ROLE-09 final-fallback smoke (deferred)

## Self-Check: PASSED

**Files exist:**
- `src/components/RoleRefreshBanner.tsx` — FOUND (84 LOC)
- `src/locales/en.ts` — FOUND (5 new keys)
- `src/locales/ru.ts` — FOUND (5 new keys)
- `src/theme/colors.ts` — FOUND (4 new tokens)
- `App.tsx` — FOUND (banner imported + mounted)
- `src/context/AuthContext.tsx` — FOUND (logout signature + body updated)
- `src/screens/ProfileScreen.tsx` — FOUND (logout(true) call-site update)

**Commits exist (verified via `git log --oneline`):**
- `08ae964` — FOUND: feat(i18n+theme): add role/session/access locale keys + warning palette tokens [ROLE-09,ROLE-10]
- `20810a8` — FOUND: feat(ui): RoleRefreshBanner component with optimistic-dismiss (D-13) [ROLE-10]
- `c66f481` — FOUND: feat(ui): mount RoleRefreshBanner + wire D-11 hard-logout toast (silent arg) [ROLE-09,ROLE-10]

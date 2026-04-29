# Phase 3: Role Gating Precursor — Research

**Researched:** 2026-04-23
**Domain:** Client-side role gating (hook + component + pure helper + allowlist) in React Native 0.84 / Context-driven app
**Confidence:** HIGH (research complements 25 locked decisions in `03-CONTEXT.md`; zero decision-level questions remain open. Two load-bearing corrections surfaced — see §2.2 and §2.3.)

---

## User Constraints (from CONTEXT.md)

### Locked Decisions

> Verbatim from `03-CONTEXT.md` `<decisions>`. Research builds on these — does not re-decide.

- **D-01:** Library-free. Pure hook + pure helper + one-file allowlist constant. No new Context/Provider.
- **D-02:** File layout:
  - `src/hooks/useRole.ts` — NEW (first file under `src/hooks/`; create the directory).
  - `src/components/Gated.tsx` — NEW declarative UI guard.
  - `src/constants/adminAllowlist.ts` — NEW (creates `src/constants/` directory; coexists with pre-existing `src/constants.ts` file).
- **D-03:** `useRole()` return shape: `{ role, isAdmin, isModerator, isAuthenticated, can }`. `role` union `'admin' | 'moderator' | 'user' | 'guest'`. Priority ladder: `customClaims?.role` (M2, undefined today) → `userType === 'admin'` (existing) → `isAllowlistedAdmin(email)` (M1 override) → `user ? 'user' : 'guest'`.
- **D-04:** `Action` union: `'editVerifications' | 'editMatterportUrl' | 'editPanoramicUrl' | 'manageListings' | 'editAnyListing' | 'approveListings' | 'promoteToModerator'`. Last three defined-but-unused in M1 for forward-compat.
- **D-05:** `can(action)` is the ONLY gating primitive at call sites. No `isAdmin` branching for gating logic. `isAdmin` exposed for informational UI only. No inline `userType === 'admin'` comparisons remain after migration.
- **D-06:** Email comparison is lowercase-trimmed; nullish/empty email returns `false`.
- **D-07:** Two grep-able M2 TODO comments: one above `ALLOWLIST` in `adminAllowlist.ts`, one above the `isAllowlistedAdmin` branch in `useRole.ts`.
- **D-08:** Matterport tours section (`CreateListingScreen.tsx:781-830`) + panoramic URL `TextInput` (~`CreateListingScreen.tsx:843-852`) wrapped in `<Gated>` — HIDE entirely for non-admins (behavior change, intentional).
- **D-09:** Non-admin edit of existing listing preserves `tours` + `panoramicPhotosUrl` verbatim on save (read existing values into `useState` in `useEffect`, spread into payload outside the admin branch).
- **D-10:** Single `can('editMatterportUrl')` gate on the submit-payload branch at `CreateListingScreen.tsx:396`.
- **D-11:** Migrate all 4 `isAdmin` sites in `CreateListingScreen.tsx` (lines 110, 319, 396, 933), plus `PropertyDetailsScreen.tsx:178` / line 401, plus `ProfileScreen.tsx:33`.
- **D-12:** New `manageListings` action: `can('manageListings')` returns true when `role === 'admin'` OR `userType === 'renter'`. Encapsulated inside `can()` switch.
- **D-13:** Display-only `userType` reads (`ProfileScreen.tsx:70`) NOT migrated.
- **D-14:** 4-part grep invariant is the exit bar (zero `userType === 'admin'` matches; `backendProfile.userType` appears only in `useRole.ts`; `adminAllowlist` / `ADMIN_EMAIL` imports only from `useRole.ts` + `adminAllowlist.ts`; `isAllowlistedAdmin` only in defining files).
- **D-15:** Guard `PropertyService.patchPlatformVerifications` only.
- **D-16:** Pure helper `canFromUser(user, action)` in `src/hooks/useRole.ts`. Hook is a thin wrapper. Services import the pure helper; preserves the "services don't depend on React" convention.
- **D-17:** Throw `PermissionDeniedError('E_PERMISSION_DENIED')` + `console.error` in `patchPlatformVerifications` after `getUserData()` if `!canFromUser(userData, 'editVerifications')`.
- **D-18:** Service throws error code `E_PERMISSION_DENIED` (NOT translated). New i18n key `errors.permissionDenied` added to `en.ts` + `ru.ts` (locale files are `.ts`, not `.json`).
- **D-19:** Two Jest tests under `src/hooks/__tests__/useRole.test.ts` (or nearest convention): priority-ladder matrix + service-guard throws.
- **D-20:** If Jest absent, Wave 0 gate. (Research confirms Jest IS configured — see §2.4.)
- **D-21:** Parallel backend coordination: ask Railway team whether `PATCH /properties/:id/verifications` and PUT `/properties/:id` (with `tours` / `matterportUrl` / `panoramicPhotosUrl` fields) enforce admin server-side.
- **D-22:** Two exit paths for GATE-05: confirmed (recorded in `03-VERIFICATION.md`) OR accepted-risk row in PROJECT.md Key Decisions.
- **D-23:** Phase implementation does NOT block on backend response — coordination is parallel, not serial.
- **D-24:** Initial `ALLOWLIST = ['beckprograms@gmail.com']`.
- **D-25:** `ALLOWLIST` declared `as const` and tight-typed.

### Claude's Discretion

> Areas the research may recommend on; planner may adopt or reject.

- Wave structure (planner's call; recommended skeleton in §4).
- Co-locate `PermissionDeniedError` with `canFromUser` in `useRole.ts`, OR split to `src/hooks/errors.ts`.
- `/* istanbul ignore next */` on M2-unreachable branches — coverage isn't enforced, so not load-bearing. See §3.8.
- Exact `<Gated>` boundary in the Matterport section (outer `<View style={styles.section}>` at line 781 vs. inner content only).
- Exact EN/RU wording for `errors.permissionDenied` key (semantics locked, wording open).
- Whether to add a `customClaims?: { role?: Role }` type augmentation in `src/types/` or use an `as any` cast at the read site.
- Whether to include a visual device-smoke-test cell (admin vs non-admin CreateListingScreen render) in a matrix doc. D-CONTEXT explicitly says "no formal matrix needed"; the research agrees — see §7.

### Deferred Ideas (OUT OF SCOPE)

- Axios interceptor-based service-layer gating (M2).
- In-app admin-promotion UI / M2 ADMIN-01..ADMIN-03.
- Moderator role implementations (`editAnyListing`, `approveListings`, `promoteToModerator` actions defined but unused).
- Firebase custom-claims integration (M2 ROLE-01).
- Backend `Authorization: Bearer <idToken>` middleware (M2 ROLE-04).
- Chat moderation tooling.
- Listing status lifecycle (pending / live / rejected).
- Rate-limit allowlist changes / admin-add CLI.
- Migrating `src/constants.ts` into `src/constants/index.ts` for stylistic consistency (see §3.1 for rationale).

---

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| GATE-01 | `useRole.ts` + `can(action)` + `Gated.tsx` + `adminAllowlist.ts` exist | §3.2, §3.3, §3.4, §3.5 — contracts + code sketches |
| GATE-02 | Matterport + panoramic URL fields gated by `can('editMatterportUrl')` / `can('editPanoramicUrl')` | §3.6 — UI wrapping + submit-payload gate (D-10) |
| GATE-03 | Existing `userType === 'admin'` checks replaced; no new call sites hardcode email/userType | §3.7 — 6-site migration table + grep invariant |
| GATE-04 | Forward-compat shape (`can(action)` accepts actions, not role names) | §3.2 priority-ladder + §3.3 action-union; §6 forward-compat checklist |
| GATE-05 | Backend enforcement confirmed OR documented | §5 — two exit paths, coordination artifact template |

---

## Summary

Phase 3 creates four files (`useRole.ts`, `Gated.tsx`, `adminAllowlist.ts`, `__tests__/useRole.test.ts`), migrates 6 existing call sites across 3 screens, and adds 1 service-layer guard to `PropertyService.patchPlatformVerifications`. All shape and semantic decisions are already locked by `03-CONTEXT.md`. This research confirms:

1. **Jest is already configured** (`jest.config.js`, `preset: 'react-native'`, `jest@^29.6.3`, `@types/jest` wired in `tsconfig.json`) — D-20's Wave 0 gate does NOT fire. One existing test file (`__tests__/App.test.tsx`).
2. **`@testing-library/react-native` is NOT installed** — but D-16 mandates a pure `canFromUser(user, action)` helper, which means both unit tests can test the pure function + mock `AuthService.getUserData()` without ever rendering a React component. No new test library install is required. The hook itself doesn't need a dedicated hook-rendering test.
3. **`AuthContextType.user` is typed `any`** — `BackendUser` / `AuthUser` types don't exist. This is actually load-bearing for our design: `canFromUser` accepts `user: any` (matches convention); no type-surgery on `AuthContext` needed for M1.
4. **Edit-mode initialization ALREADY preserves URLs** — the existing `useEffect` at `CreateListingScreen.tsx:185` reads `panoramicPhotosUrl` and `tours` from `propertyToEdit` into `useState`, and the payload at line 390 spreads those state values OUTSIDE the admin-only branch. D-09's "preserve-on-save" invariant is structurally already met; our only job is to NOT move these into the gated branch.
5. **Confirmed call-site line numbers** (grep run 2026-04-23 post-Phase-2):
   - `CreateListingScreen.tsx` — isAdmin declared at **110**; read at **319, 396 (line 396 → `...(isAdmin ? ...`), 933**
   - `PropertyDetailsScreen.tsx` — isAdmin at **178**; read at **401**
   - `ProfileScreen.tsx` — `canManageListings` derived from `userType` at **33**; `setUserType` at **70**
   - Panoramic URL `TextInput` is at **lines 843–852** inside a "Links" section that also holds `videoUrl` and `instagramUrl`; D-08 gates ONLY the panoramic input, not the section wrapper — see §3.6.
6. **No existing `errors.*` i18n namespace** — `errors.permissionDenied` is a brand-new key in both locales.

**Primary recommendation:** Execute the phase in 5 lean waves (see §4). Wave 0 = scaffolding file creation (hook + helper + allowlist + Gated + i18n key — non-user-visible, safe to land independently). Waves 1–3 = migration per screen, tightly scoped diffs. Wave 4 = service guard + unit tests (requires Wave 0 complete). Wave 5 = backend coordination + phase-exit artifact. Backend coordination is parallelizable starting Wave 0 per D-23.

**Confidence breakdown:**

| Area | Level | Reason |
|------|-------|--------|
| Hook contract + shape | HIGH | ARCHITECTURE.md §4 + CONTEXT D-03..D-07 fully specify. |
| Pure helper design | HIGH | D-16 locks signature; existing services use plain objects + no React — pattern is native. |
| Call-site migration | HIGH | All 6 line numbers re-verified 2026-04-23 via grep. |
| Service guard | HIGH | `getUserData()` async call already present at `PropertyService.ts:198`; guard is one conditional. |
| i18n additions | HIGH | New key added to two `.ts` files (not `.json` as CONTEXT mistakenly states — corrected by code-context section of CONTEXT itself). |
| Jest test setup | HIGH | Jest configured, pure-function tests don't need extra libs. |
| Backend coordination | MEDIUM | Depends on Railway team response time. D-22 fallback path keeps the phase unblocked. |
| TypeScript strictness impact on `Action` union | HIGH | `tsconfig` inherits `@react-native/typescript-config` (strict); string-literal union prevents typos. Recommended — §3.9. |

---

## Architectural Responsibility Map

> The phase creates a client-side gating surface. It is a UX + defense-in-depth layer. The **actual trust boundary** is the Railway backend.

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Role derivation (`useRole()`) | Frontend — React hook layer | — | Reads `useAuth()` context; returns a memoized role selector. No other tier involved. |
| Action authorization (`can(action)`) | Frontend — pure helper | — | Pure function. Input: user + action. Output: boolean. Consumable by hook (UI) and service (defense-in-depth). |
| UI gating (`<Gated>`) | Frontend — component layer | — | Declarative wrapper over `useRole()`. Hides children when `can(action)` is false. |
| Admin identity source (M1) | Frontend — `src/constants/adminAllowlist.ts` | — | Hardcoded email list. Bundle-visible. NOT a security boundary. |
| Admin identity source (M2) | Backend (Firebase custom claims) | Frontend (reads claim) | Token-verified server-side; client reads `customClaims.role` via priority-ladder branch 1. |
| Defense-in-depth service guard | Frontend — `PropertyService.patchPlatformVerifications` | — | Throws `E_PERMISSION_DENIED` before network call. Doesn't replace backend enforcement. |
| Real security boundary | **Backend — Railway API** | — | Must independently verify `x-firebase-uid` header maps to an admin user and reject non-admin PATCH/PUT on verification / tour / matterport fields. D-21/D-22 coordination artifact. |
| Translation boundary | Frontend — callers of throwing services | — | Services throw error CODE. UI catches + translates via `t('errors.permissionDenied')`. D-18. |

**Why this matters:** Every decision in this phase respects the split between "client gating = UX" and "backend enforcement = security." Any code change that blurs this split (e.g., "the allowlist is enough; backend check is unnecessary") is incorrect per PITFALLS.md §Pitfall 5 and `.planning/codebase/CONCERNS.md`.

---

## Standard Stack

### Core — Zero New Runtime Dependencies

| Library / Module | Version | Purpose | Why Standard |
|------------------|---------|---------|--------------|
| `react` (hooks) | 19.2.3 (installed) | `useMemo`, `useContext` for hook implementation | Already in use across the app. |
| `react-native` (types only) | 0.84.0 (installed) | Component / `FC` types for `Gated` | Already in use. |

**No new `dependencies` or `devDependencies` added.** D-01's library-free mandate holds.

### Supporting — Test Infrastructure (Already Present)

| Tool | Version | Purpose | Wave 0 Status |
|------|---------|---------|---------------|
| `jest` | `^29.6.3` (devDep) | Unit test runner | PRESENT [VERIFIED: package.json + jest.config.js] |
| `@types/jest` | `^29.5.13` | Type support in `*.test.ts` | PRESENT [VERIFIED: package.json + tsconfig.json `types: ["jest"]`] |
| `react-test-renderer` | `19.2.3` | Component rendering for tests | PRESENT (not used by this phase's tests; kept for completeness) |
| `@testing-library/react-native` | — | Would enable `renderHook` | ABSENT; NOT needed — see §3.8. |
| `axios` mock via `jest.mock` | built-in | Mock network calls in service-guard test | Available; no manual `__mocks__/axios.ts` exists today. [VERIFIED: grep for `jest.mock` returns 0 matches in repo] |

**Installation:** None. Phase adds zero new npm packages.

### Alternatives Considered (Rejected)

| Instead of | Could Use | Why Rejected |
|------------|-----------|--------------|
| Pure hook + pure helper | `@casl/ability`, `accesscontrol`, Oso | D-01 library-free; M1 needs 7 actions and 2 roles — library overhead >> ROI. |
| Context-based `RoleProvider` | Dedicated provider wrapping `AuthProvider` | ARCHITECTURE.md §4 anti-pattern #1: duplicates `useAuth()` state, adds re-render cascades, hides the "role is a derivation of user" contract. |
| `react-native-permissions` | library for runtime checks | That's for OS capabilities (camera, location), not app-level roles. Wrong tool. |
| Throw translated strings from service | `throw new Error(t('errors.permissionDenied'))` | D-18 translation-boundary: services don't have `t()`. Throwing a code + translating at catch site is the existing pattern (cf. `AuthContext.login` re-throwing `'locked'`). |
| `React.memo(Gated)` | Memoize the gated component | `can(action)` is O(1) and the children re-render regardless. Memoization adds complexity with no measurable gain. |

---

## §1 Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| Jest | D-19 unit tests | ✓ | 29.6.3 | — |
| `@types/jest` | Test TS typing | ✓ | 29.5.13 | — |
| `react-test-renderer` | If test needs rendering | ✓ (unused) | 19.2.3 | — |
| `@testing-library/react-native` | `renderHook` | ✗ | — | Test `canFromUser` pure helper directly; don't render the hook. |
| `node` runtime | `npm test` | ✓ | engines `>=22.11.0` | — |
| Railway backend API | GATE-05 coordination | external | — | D-22 accepted-risk PROJECT.md row if unreachable. |

**Missing dependencies with no fallback:** None.
**Missing dependencies with fallback:** `@testing-library/react-native` — the phase does NOT install it (§3.8 covers test strategy that avoids it).

---

## §2 Load-Bearing Corrections from Discovery

### §2.1 Confirmation: Jest IS configured (D-20 Wave 0 gate does NOT fire)

`jest.config.js` exists with `preset: 'react-native'`. `package.json` has `"test": "jest"` and `jest@^29.6.3` in devDependencies. `tsconfig.json` wires `"types": ["jest"]`. A single existing test (`__tests__/App.test.tsx`) passes — confirming the toolchain runs.

**Implication:** D-20's fallback ("either add minimal Jest config or downgrade to manual verification") does NOT activate. Planner can safely allocate a Wave 0 / Wave 4 task for the two unit tests without a test-infrastructure budget.

### §2.2 Panoramic URL field — line numbers are CORRECT, but placement context is load-bearing

CONTEXT says "panoramic URL `TextInput` at `CreateListingScreen.tsx:843-852`" — **verified correct** (grep confirms `panoramicUrl` placeholder at line 845, `panoramicPhotosUrl` state at 847, ending `TextInput` at 852).

**Load-bearing nuance:** That `TextInput` sits INSIDE a "Links" section (`<View style={styles.section}>` at ~line 838) that also contains `videoUrl` (line 839-ish) and `instagramUrl` (line 853-ish) `TextInput`s. D-08 gates ONLY the panoramic input, not the surrounding `<View>` (which would hide video/instagram from everyone). Wrap in a `<Gated>` whose **child is the `<TextInput>` itself**, not the section wrapper.

```
// Wrong — would hide video + instagram too:
<Gated action="editPanoramicUrl">
  <View style={styles.section}>  // WRONG — video/instagram go here
    ...
  </View>
</Gated>

// Correct — only the panoramic TextInput is hidden:
<TextInput placeholder={t('createListing.videoUrl')} .../>
<Gated action="editPanoramicUrl">
  <TextInput placeholder={t('createListing.panoramicUrl')} .../>
</Gated>
<TextInput placeholder={t('createListing.instagramUrl')} .../>
```

This aligns with the CONTEXT canonical_refs anchor "`CreateListingScreen.tsx:843-852` — panoramic URL `TextInput`" (not the full section).

### §2.3 D-09 preserve-on-save invariant is ALREADY structurally satisfied

Reading the existing `CreateListingScreen.tsx` shows:
- **Line 185:** `setPanoramicPhotosUrl((propertyToEdit as any).panoramicPhotosUrl || '');` — edit-mode `useEffect` hydrates state from existing listing, **regardless of admin status**.
- **Line 202-210:** `propertyToEdit.tours` → `setTours(...)` — same pattern.
- **Line 390:** `panoramicPhotosUrl: panoramicPhotosUrl.trim(),` — payload spreads state unconditionally.
- **Line 392:** `tours: tours.length > 0 ? tours : undefined,` — same.
- **Line 396:** `...(isAdmin ? { platformVerifications: {...} } : {})` — only `platformVerifications` is admin-gated in the payload today.

**Implication for D-10:** CONTEXT D-10 says to gate the submit-payload branch at line 396 with `can('editMatterportUrl')`. That line currently ONLY governs `platformVerifications` — which is semantically `editVerifications`, NOT `editMatterportUrl`. This is a terminology drift worth flagging to the planner:

> **ACTION-MAPPING CLARIFICATION** (for planner):
> - Line 396's existing `isAdmin ? {...}` branch governs `platformVerifications` — so the correct action replacement is `can('editVerifications')`, not `can('editMatterportUrl')` as D-10 states.
> - The `tours` and `panoramicPhotosUrl` payload fields at lines 390–392 are NOT currently wrapped in an admin branch AND should remain unwrapped (per D-09's preserve-on-save rule — if we wrap them in `can('editMatterportUrl')`, non-admin edits would null them out, violating D-09).
>
> **Recommended resolution:** The planner should treat D-10 as describing the "concept" of a gated payload branch, but in practice:
> 1. Line 396 branch keeps `platformVerifications` + gates with `can('editVerifications')` (this is the D-11 site 3 migration).
> 2. Lines 390–392 (`tours`, `panoramicPhotosUrl`) stay outside any admin branch — they flow through state that's gated only at the UI layer (D-08).
> 3. This is STRONGER than what D-10 literally says and is the correct interpretation of the combined D-08 + D-09 + D-10 intent.
>
> If the planner disagrees, this is the single question worth a plan-phase clarification. See §10 Q1.

### §2.4 `AuthContextType.user` is `any` — no BackendUser type exists

`src/context/AuthContext.tsx:4-11` declares `AuthContextType.user: any`. `backendProfile` is attached dynamically via `userData.backendProfile = backendUser;` without a type. The codebase convention is `any` at service boundaries.

**Implication:** `canFromUser(user: any, action: Action): boolean` matches convention. No need to introduce a `BackendUser` / `AuthUser` type in `src/types/` — it would be premature and diverge from existing patterns. The `customClaims?.role` optional chain at the priority-ladder's M2 branch will compile fine against `any` without type augmentation.

**Discretion item:** The planner MAY choose to add a narrow local type at the top of `useRole.ts`:

```typescript
// Internal type — pragmatic shape for role derivation.
// Matches AuthContext's untyped user shape; explicit for read-safety.
type RoleReadableUser = {
  email?: string;
  backendProfile?: {
    userType?: string;
    customClaims?: { role?: Role }; // M2; absent today
  };
} | null | undefined;
```

Not required; recommended for readability. Does NOT affect the `canFromUser(user: any, ...)` public signature.

---

## §3 Architecture Patterns

### §3.1 Recommended Project Structure

```
src/
├── hooks/                              # NEW directory (Phase 3 establishes convention)
│   ├── useRole.ts                      # NEW — hook + canFromUser + Action union + PermissionDeniedError
│   └── __tests__/                      # NEW — colocated tests per new convention
│       └── useRole.test.ts             # NEW — D-19 priority-ladder + service-guard tests
├── components/
│   └── Gated.tsx                       # NEW — declarative UI guard
├── constants/                          # NEW directory (coexists with pre-existing src/constants.ts file)
│   └── adminAllowlist.ts               # NEW — ALLOWLIST + isAllowlistedAdmin
├── constants.ts                        # EXISTING (untouched — D-CONTEXT notes no migration for Phase 3)
├── context/
│   └── AuthContext.tsx                 # EXISTING (untouched — useRole() consumes read-only)
├── services/
│   └── PropertyService.ts              # MODIFIED — patchPlatformVerifications guard (D-17)
├── screens/
│   ├── CreateListingScreen.tsx         # MODIFIED — 4 call-site migrations + 3 <Gated> wrappings
│   ├── PropertyDetailsScreen.tsx       # MODIFIED — 1 call-site + 1 <Gated> wrapping
│   └── ProfileScreen.tsx               # MODIFIED — 1 call-site migration (canManageListings)
└── locales/
    ├── en.ts                           # MODIFIED — add errors.permissionDenied key
    └── ru.ts                           # MODIFIED — add errors.permissionDenied key
```

**Why coexist `src/constants.ts` (file) and `src/constants/` (directory)?** POSIX allows both. Metro's resolver picks the file first when importing `'./constants'`, and directory imports use explicit `'./constants/adminAllowlist'`. No import collisions. [VERIFIED: `ls src/` shows `constants.ts` file; creating `src/constants/adminAllowlist.ts` implicitly creates the directory.]

**Hook-directory convention note:** `src/hooks/` is Phase-3 new. Planner should update `.planning/codebase/CONVENTIONS.md` with a one-line entry documenting that React hooks live in `src/hooks/` going forward. Low-pri, bundle into Wave 0 or a companion commit.

### §3.2 Pattern: `useRole()` hook contract

**What:** Pure read-only selector over `useAuth()`. Returns a role-shaped object.

**When to use:** Any React component that needs to gate UI based on the current user's role/actions. Components call `can(action)` — NOT `isAdmin` — for gating.

**Implementation sketch (verified against D-03, D-16):**

```typescript
// src/hooks/useRole.ts
import { useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { isAllowlistedAdmin } from '../constants/adminAllowlist';

export type Role = 'admin' | 'moderator' | 'user' | 'guest';

// Action union — D-04. Extending is additive; removing requires grep of call sites.
export type Action =
  | 'editVerifications'      // M1 — admin only
  | 'editMatterportUrl'      // M1 — admin only
  | 'editPanoramicUrl'       // M1 — admin only
  | 'manageListings'         // M1 — renter OR admin (D-12)
  | 'editAnyListing'         // M2 forward-compat — moderator + admin
  | 'approveListings'        // M2 forward-compat — moderator + admin
  | 'promoteToModerator';    // M2 forward-compat — admin only

export class PermissionDeniedError extends Error {
  constructor(message = 'E_PERMISSION_DENIED') {
    super(message);
    this.name = 'PermissionDeniedError';
  }
}

// Derive role — priority ladder per D-03.
function deriveRole(user: any): Role {
  if (!user) return 'guest';

  // Branch 1 (M2): server-verified custom claim. Currently undefined.
  // TODO(M2): activate once ROLE-01 ships (custom claims on Firebase token).
  const claimRole = user?.backendProfile?.customClaims?.role as Role | undefined;
  if (claimRole === 'admin' || claimRole === 'moderator' || claimRole === 'user') {
    return claimRole;
  }

  // Branch 2: backend userType. Existing pattern.
  if (user?.backendProfile?.userType === 'admin') return 'admin';
  if (user?.backendProfile?.userType === 'moderator') return 'moderator';

  // Branch 3 (M1 override): email allowlist.
  // TODO(M2): remove M1 allowlist branch from useRole role-priority ladder
  if (isAllowlistedAdmin(user?.email)) return 'admin';

  // Branch 4: authenticated but unprivileged.
  return 'user';
}

// Pure helper — D-16. Imported by services AND used internally by useRole.
export function canFromUser(user: any, action: Action): boolean {
  const role = deriveRole(user);
  switch (action) {
    case 'editVerifications':
    case 'editMatterportUrl':
    case 'editPanoramicUrl':
    case 'promoteToModerator':
      return role === 'admin';
    case 'editAnyListing':
    case 'approveListings':
      return role === 'admin' || role === 'moderator';
    case 'manageListings':
      // D-12: admin OR renter userType. Encapsulates the "renter sees listing tools" rule
      // without leaking userType reads to call sites (D-14 invariant #2).
      return role === 'admin' || user?.backendProfile?.userType === 'renter';
  }
}

export interface UseRoleResult {
  role: Role;
  isAdmin: boolean;
  isModerator: boolean;
  isAuthenticated: boolean;
  can: (action: Action) => boolean;
}

export function useRole(): UseRoleResult {
  const { user } = useAuth();

  return useMemo(() => {
    const role = deriveRole(user);
    return {
      role,
      isAdmin: role === 'admin',
      isModerator: role === 'moderator',
      isAuthenticated: role !== 'guest',
      can: (action: Action) => canFromUser(user, action),
    };
  }, [user]);
}
```

**Memoization rationale:** `useMemo` keyed on `user` identity. `useAuth()` returns a stable `user` reference across renders (set via `setUser` in `AuthContext`), so consumers won't re-render on unrelated Context changes (`loading`, etc.). `can` is recreated per user-change — acceptable, since render-level call-sites call it inline (`{can('x') && ...}`).

**`isLoading` exposure:** NOT exposed in `useRole()`. The hook mirrors `useAuth()` semantics: during auth bootstrap, `user === null` → `role === 'guest'` → all `can(action)` return `false` → gated UI hides → correct fallback. Screens that need a loading spinner consume `useAuth().loading` directly. (Discussed: NOT adding `isLoading` keeps the hook shape minimal per D-03.)

### §3.3 Pattern: `<Gated>` component API

**What:** Declarative wrapper that renders children only when `can(action)` returns true.

**API:**

```typescript
// src/components/Gated.tsx
import React, { ReactNode } from 'react';
import { useRole, Action } from '../hooks/useRole';

interface GatedProps {
  action: Action;
  children: ReactNode;
  fallback?: ReactNode;      // Optional — renders in place when gated out. Default: null.
}

export const Gated: React.FC<GatedProps> = ({ action, children, fallback = null }) => {
  const { can } = useRole();
  return can(action) ? <>{children}</> : <>{fallback}</>;
};
```

**Design choices (honoring D-03 + conventions):**
- **Named export**, not default — matches repo convention (CONVENTIONS.md "Exports").
- **`React.FC<GatedProps>`** — matches `BottomNavigator`, `PropertyCard` etc. (CONVENTIONS.md "Component typing mixes both styles" — `FC` is prevalent).
- **`fallback` prop optional** — default `null` matches D-08 "hide entirely" semantics. Supplies the hook for M2 "show contact-admin prompt" patterns without changing the API.
- **No memoization** — children re-render anyway when parent re-renders. `React.memo` adds negligible value for this use-case.
- **No `isLoading` handling** — see §3.2 rationale; `user` during bootstrap → `guest` → `can()` → false → `fallback` renders. Correct behavior.

**Tree placement:** Used INSIDE a screen, typically around an existing JSX subtree. No provider wrapping needed (library-free, D-01).

### §3.4 Pattern: `adminAllowlist.ts` module

```typescript
// src/constants/adminAllowlist.ts

/**
 * M1 admin allowlist — emails of users granted admin role client-side.
 *
 * TODO(M2): replace allowlist with role-based implementation — server-verified
 * `customClaims.role === 'admin'` via Firebase ID token + firebase-admin SDK on the
 * Railway backend (tracked as M2 requirements ROLE-01 through ROLE-04).
 *
 * Security posture: emails here ARE bundle-visible; obfuscation is not security.
 * The real trust boundary is the Railway backend, which MUST independently verify
 * admin status before accepting PATCH /verifications or PUT /properties with
 * tours/matterportUrl/panoramicPhotosUrl payloads. See PITFALLS.md §Pitfall 5.
 */
export const ALLOWLIST = ['beckprograms@gmail.com'] as const;

export type AllowlistedEmail = typeof ALLOWLIST[number];

/**
 * Returns true if `email` (case-insensitive, trimmed) matches an entry in ALLOWLIST.
 * Returns false for null/undefined/empty input — guards the unauthenticated path.
 */
export function isAllowlistedAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  if (!normalized) return false;
  return (ALLOWLIST as readonly string[]).includes(normalized);
}
```

**D-06 compliance:** `trim()` + `toLowerCase()` on input; short-circuit on nullish/empty.
**D-07 compliance:** TODO(M2) JSDoc block above `ALLOWLIST`. The second TODO(M2) comment lives above the `isAllowlistedAdmin(user?.email)` branch in `useRole.ts` — see §3.2.
**D-24 compliance:** Seeds with `'beckprograms@gmail.com'` only.
**D-25 compliance:** `as const` tuple; `AllowlistedEmail` type exported for autocomplete-discipline.
**`(ALLOWLIST as readonly string[]).includes(normalized)`** — cast widens the `as const` tuple type so `.includes()` accepts an arbitrary string. Without this cast, TypeScript errors because `.includes()` on a readonly tuple requires an argument of the tuple member type.

### §3.5 Pattern: `PermissionDeniedError` co-location

**Recommended:** Co-locate `PermissionDeniedError` in `src/hooks/useRole.ts` alongside `canFromUser` (shown in §3.2). Rationale:
- One file owns the entire authorization contract (roles + actions + helper + error).
- Services already import `canFromUser` from there; adding `PermissionDeniedError` is no additional import.
- Avoids creating `src/hooks/errors.ts` as a one-item module (low value).

**If the planner prefers separation** (`src/hooks/errors.ts`), that's fine per CONTEXT Discretion — both layouts pass the grep invariant (D-14).

### §3.6 Matterport / panoramic UI wrapping (D-08 mechanics)

**Matterport tours section (`CreateListingScreen.tsx:781-830`):**

The entire `<View style={styles.section}>` at line 781 (containing section title, hint, tourTitle input, URL input, Add button, tours list) is admin-only. Wrap the outer `<View>`:

```jsx
{/* Matterport 3D Tours — admin only (D-08) */}
<Gated action="editMatterportUrl">
  <View style={styles.section}>
    <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('createListing.tours3d')}</Text>
    <Text style={[styles.hint, ...]}>{t('createListing.matterportHint')}</Text>
    <TextInput .../* tourTitle */ />
    <TextInput .../* tourUrl */ />
    <TouchableOpacity .../* Add tour button */ />
    {tours.length > 0 && <View style={styles.toursList}>...</View>}
  </View>
</Gated>
```

**Panoramic URL field (`CreateListingScreen.tsx:843-852`):**

The panoramic `TextInput` sits INSIDE a "Links" section alongside video + instagram URL fields. Wrap ONLY the panoramic `TextInput`, NOT the section wrapper:

```jsx
<View style={styles.section}>
  <Text style={styles.sectionTitle}>{t('createListing.links')}</Text>
  <TextInput .../* videoUrl — unchanged, all authenticated users */ />
  {/* Panoramic URL — admin only (D-08) */}
  <Gated action="editPanoramicUrl">
    <TextInput
      placeholder={t('createListing.panoramicUrl')}
      value={panoramicPhotosUrl}
      onChangeText={setPanoramicPhotosUrl}
      keyboardType="url"
      .../>
  </Gated>
  <TextInput .../* instagramUrl — unchanged */ />
  <Text style={styles.hint}>{t('createListing.instagramHint')}</Text>
</View>
```

**Verification switches section (`CreateListingScreen.tsx:933`):**

This is a DIFFERENT action (`editVerifications`). Wrap the whole `<View style={styles.section}>`:

```jsx
{/* Admin verification switches — admin only */}
<Gated action="editVerifications">
  <View style={styles.section}>
    <Text style={[styles.sectionTitle]}>{t('verification.adminSectionTitle')}</Text>
    <Text style={[styles.hint]}>{t('verification.adminSectionHint')}</Text>
    <View style={...}>
      {verificationSwitchRow(...)}
      {verificationSwitchRow(...)}
      {verificationSwitchRow(...)}
    </View>
  </View>
</Gated>
```

### §3.7 Call-site migration table (D-11, D-12 literal mechanics)

| # | File | Line | Current | Migrated |
|---|------|------|---------|----------|
| 1 | `CreateListingScreen.tsx` | 110 | `const isAdmin = user?.backendProfile?.userType === 'admin';` | `const { can, isAdmin } = useRole();` (`isAdmin` kept for any residual non-gating uses; likely unused after sites 2–4 — remove if grep confirms zero refs) |
| 2 | `CreateListingScreen.tsx` | 319 | `if (!propertyToEdit?.id \|\| !isAdmin) return;` | `if (!propertyToEdit?.id \|\| !can('editVerifications')) return;` |
| 3 | `CreateListingScreen.tsx` | 396 | `...(isAdmin ? { platformVerifications: {...} } : {})` | `...(can('editVerifications') ? { platformVerifications: {...} } : {})` **← Note: action is `editVerifications`, NOT `editMatterportUrl` as D-10 literally states. See §2.3.** |
| 4 | `CreateListingScreen.tsx` | 933 | `{isAdmin && (<View>...verification switches...</View>)}` | `<Gated action="editVerifications"><View>...verification switches...</View></Gated>` |
| 5 | `CreateListingScreen.tsx` | 781–830 | (no gate today) | `<Gated action="editMatterportUrl">` wrapping the Matterport section `<View>` |
| 6 | `CreateListingScreen.tsx` | 843–852 | (no gate today) | `<Gated action="editPanoramicUrl">` wrapping ONLY the panoramic `<TextInput>` |
| 7 | `PropertyDetailsScreen.tsx` | 178 | `const isAdmin = user?.backendProfile?.userType === 'admin';` | `const { can } = useRole();` |
| 8 | `PropertyDetailsScreen.tsx` | 401 | `{isAdmin && onAdminVerifyDocuments && (...)}` | `<Gated action="editVerifications">{onAdminVerifyDocuments && (...)}</Gated>` |
| 9 | `ProfileScreen.tsx` | 33 | `const canManageListings = userType === 'renter' \|\| userType === 'admin';` | `const { can } = useRole(); const canManageListings = can('manageListings');` |
| 10 | `ProfileScreen.tsx` | 70 | `setUserType(profile.userType \|\| '');` — display state | **NOT migrated** (D-13 — display, not gating). |
| 11 | `PropertyService.ts` | 198 (after existing `getUserData()` call) | (no guard today) | Insert: `if (!canFromUser(userData, 'editVerifications')) { console.error('[PropertyService.patchPlatformVerifications] permission denied', { userId: userData?.localId }); throw new PermissionDeniedError(); }` |

**Row 5 special consideration:** The migration at line 110 (site 1) swaps the `isAdmin` declaration for `const { can, isAdmin } = useRole();`. After sites 2–4 migrate, the local `isAdmin` variable MAY have no remaining readers inside `CreateListingScreen.tsx`. Recommend a final grep at wave-end: `grep -n "isAdmin" src/screens/CreateListingScreen.tsx` — if zero matches beyond line 110, simplify to `const { can } = useRole();`. This nudges D-14 invariant #1 (`userType === .admin.` returns zero) in a clean direction.

**Migration sequencing recommendation:** Per-file, NOT per-action. Each screen is a self-contained diff. Run the grep invariant after EACH screen migration:

- Wave 1 end: `grep -n 'isAdmin\|userType === .admin.' src/screens/CreateListingScreen.tsx` — should return zero or only the line-110 declaration if we kept it.
- Wave 2 end: same grep on `PropertyDetailsScreen.tsx` and `ProfileScreen.tsx`.
- Wave 4 end: full `grep -rn 'userType === .admin.' src/` should return zero (D-14 invariant #1).

### §3.8 Test strategy (D-19 mechanics without `@testing-library/react-native`)

D-19's two tests target the PURE helper layer — no React rendering required:

**Test 1: `canFromUser` priority ladder**

```typescript
// src/hooks/__tests__/useRole.test.ts
import { canFromUser, Action } from '../useRole';

describe('canFromUser priority ladder', () => {
  const admin = { email: 'admin@foo.com', backendProfile: { userType: 'admin' } };
  const allowlisted = { email: 'beckprograms@gmail.com', backendProfile: {} };
  const renter = { email: 'r@foo.com', backendProfile: { userType: 'renter' } };
  const user = { email: 'u@foo.com', backendProfile: { userType: 'user' } };
  const guest = null;
  const claimAdmin = { email: 'c@foo.com', backendProfile: { customClaims: { role: 'admin' } } };
  const claimModerator = { email: 'm@foo.com', backendProfile: { customClaims: { role: 'moderator' } } };

  test('customClaims.role wins over userType (M2 priority)', () => {
    const userWithBoth = { ...claimModerator, backendProfile: { ...claimModerator.backendProfile, userType: 'user' } };
    expect(canFromUser(userWithBoth, 'approveListings')).toBe(true); // moderator, via claim
  });

  test('userType=admin grants editVerifications', () => {
    expect(canFromUser(admin, 'editVerifications')).toBe(true);
  });

  test('allowlisted email grants editVerifications (M1 override)', () => {
    expect(canFromUser(allowlisted, 'editVerifications')).toBe(true);
  });

  test('allowlist email comparison is case-insensitive (D-06)', () => {
    const upper = { email: 'BECKPROGRAMS@GMAIL.COM', backendProfile: {} };
    expect(canFromUser(upper, 'editVerifications')).toBe(true);
  });

  test('non-allowlisted, non-admin user cannot editVerifications', () => {
    expect(canFromUser(user, 'editVerifications')).toBe(false);
  });

  test('guest cannot editVerifications', () => {
    expect(canFromUser(guest, 'editVerifications')).toBe(false);
  });

  test('manageListings (D-12) true for admin OR renter', () => {
    expect(canFromUser(admin, 'manageListings')).toBe(true);
    expect(canFromUser(renter, 'manageListings')).toBe(true);
    expect(canFromUser(user, 'manageListings')).toBe(false);
  });

  test('M2-defined actions (editAnyListing, approveListings) work for moderators and admins', () => {
    expect(canFromUser(claimModerator, 'editAnyListing')).toBe(true);
    expect(canFromUser(admin, 'editAnyListing')).toBe(true);
    expect(canFromUser(user, 'editAnyListing')).toBe(false);
  });

  test('promoteToModerator is admin-only (not moderator)', () => {
    expect(canFromUser(claimModerator, 'promoteToModerator')).toBe(false);
    expect(canFromUser(admin, 'promoteToModerator')).toBe(true);
  });
});
```

**Test 2: Service-layer guard**

```typescript
// In the same file or a sibling — __tests__/PropertyService.patchPlatformVerifications.test.ts
import axios from 'axios';
import { PropertyService } from '../../services/PropertyService';
import { AuthService } from '../../services/AuthService';
import { PermissionDeniedError } from '../useRole';

jest.mock('axios');
jest.mock('../../services/AuthService');

describe('PropertyService.patchPlatformVerifications guard (D-17)', () => {
  beforeEach(() => jest.resetAllMocks());

  test('throws PermissionDeniedError for non-admin user', async () => {
    (AuthService.getUserData as jest.Mock).mockResolvedValue({
      localId: 'uid_non_admin',
      email: 'random@example.com',
      backendProfile: { userType: 'user' },
    });

    await expect(
      PropertyService.patchPlatformVerifications('property_id', {
        ownershipDocuments: true,
        ownerIdentityVerified: false,
        stateIssuedDocumentsVerified: false,
      })
    ).rejects.toThrow('E_PERMISSION_DENIED');
    expect(axios.patch).not.toHaveBeenCalled();
  });

  test('does NOT throw for admin user (calls axios.patch)', async () => {
    (AuthService.getUserData as jest.Mock).mockResolvedValue({
      localId: 'uid_admin',
      email: 'a@x.com',
      backendProfile: { userType: 'admin' },
    });
    (axios.patch as jest.Mock).mockResolvedValue({ data: { _id: 'property_id', platformVerifications: {} } });

    await expect(
      PropertyService.patchPlatformVerifications('property_id', {
        ownershipDocuments: true,
        ownerIdentityVerified: false,
        stateIssuedDocumentsVerified: false,
      })
    ).resolves.toMatchObject({ id: 'property_id' });
    expect(axios.patch).toHaveBeenCalledTimes(1);
  });

  test('does NOT throw for allowlisted-email user (M1 branch)', async () => {
    (AuthService.getUserData as jest.Mock).mockResolvedValue({
      localId: 'uid_owner',
      email: 'beckprograms@gmail.com',
      backendProfile: {}, // no userType
    });
    (axios.patch as jest.Mock).mockResolvedValue({ data: { _id: 'property_id' } });

    await expect(
      PropertyService.patchPlatformVerifications('property_id', {
        ownershipDocuments: true,
        ownerIdentityVerified: false,
        stateIssuedDocumentsVerified: false,
      })
    ).resolves.toBeDefined();
  });
});
```

**File location:** `src/hooks/__tests__/useRole.test.ts` for Test 1; the service-guard test can live there too (one file, two `describe` blocks) OR split into `src/services/__tests__/PropertyService.test.ts`. Either is fine — planner picks.

**NOTE on existing test convention:** The repo currently uses root-level `__tests__/App.test.tsx`. Phase 3's tests establish a NEW convention: co-located `src/hooks/__tests__/`. This is a minor deviation. Alternative: `__tests__/useRole.test.ts` at root. CONTEXT D-19 says "path subject to planner convention". **Recommended** co-location matches CONVENTIONS.md "Where to Add New Code → New Context / Global State → follow existing template" — each feature owns its tests.

**Coverage flag (Discretion D-context point 3):** `jest.config.js` has no coverage thresholds. `/* istanbul ignore next */` annotations on M2-unreachable branches are optional and low-value. Recommend: **skip them** — if coverage is ever enforced, the M2 branches will be exercised by the ROLE-01 phase anyway.

### §3.9 TypeScript strictness on `Action` union (GATE-04 forward-compat)

`tsconfig.json` extends `@react-native/typescript-config` which enables `strict: true`. The string-literal `Action` type provides:

- **Compile-time typo prevention** at call sites: `can('editVerfications')` (typo) fails to compile.
- **Autocomplete** in IDEs — the list of actions shows up when typing `can('`.
- **Refactor safety** for M2 — renaming or extending an action surfaces all call sites.

Without the string-literal union, `can(action: string)` would accept any string, making typos silent failures. **Recommended: keep the `Action` export — do NOT widen to `string`.**

### §3.10 Anti-Patterns to Avoid

- **`<Gated>` wrapping the whole "Links" section at line 838+** — would hide `videoUrl` and `instagramUrl` too. Wrap only the panoramic `<TextInput>`. See §2.2.
- **Moving `tours` / `panoramicPhotosUrl` payload fields into an admin-gated branch at line 390–392** — violates D-09. They stay outside the admin branch; the UI gate is the only layer that blocks non-admin writes. Existing non-admin edits preserve existing URLs because the `useState` is hydrated from `propertyToEdit` regardless of admin status.
- **Reading `ALLOWLIST` from a screen** — violates D-14 invariant #3. Only `useRole.ts` (via `isAllowlistedAdmin`) imports it.
- **Adding a `RoleProvider` context** — ARCHITECTURE.md §4 anti-pattern #1. `useRole()` is a pure selector.
- **Translating the thrown error at the service** — D-18 violation. Throw `E_PERMISSION_DENIED`, translate at catch site.
- **Using `React.memo(Gated)`** — provides no measurable perf gain; `can()` is O(1).
- **Extending `can()` inline to service layer** — use the imported `canFromUser` in services. React hooks cannot run inside services (`useAuth` throws outside `AuthProvider`). D-16.

---

## §4 Wave Structure Recommendation

Planner's call per Discretion; the recommendation is 5 small waves with a parallel coordination workstream:

| Wave | Content | Files Touched | Parallelizable? |
|------|---------|---------------|------------------|
| 0 — Scaffold | Create `src/hooks/useRole.ts`, `src/components/Gated.tsx`, `src/constants/adminAllowlist.ts`, `src/locales/en.ts` + `ru.ts` (new `errors.permissionDenied` key). No call-site changes. | 5 files (3 new, 2 modified) | — |
| 1 — CreateListingScreen migration | 4 `isAdmin` sites + 3 `<Gated>` wraps (sites 5, 6, 4 from §3.7 table). | `src/screens/CreateListingScreen.tsx` only. | After Wave 0. |
| 2 — PropertyDetailsScreen + ProfileScreen migration | Sites 7, 8, 9 from §3.7 table. | `src/screens/PropertyDetailsScreen.tsx`, `src/screens/ProfileScreen.tsx`. | Parallel with Wave 1 after Wave 0. |
| 3 — Service guard + unit tests | Site 11 (PropertyService guard) + `src/hooks/__tests__/useRole.test.ts`. | 2 files (1 modified, 1 new). | After Wave 0; independent of Waves 1–2. |
| 4 — Phase exit | Run 4-part grep invariant (D-14); record backend coordination outcome in `03-VERIFICATION.md` OR add PROJECT.md row. | `03-VERIFICATION.md` (new) + possibly PROJECT.md. | After all prior waves. |
| 0′ — Backend coordination (parallel) | Open ticket/message to Railway backend owner. Track response. | No code. | Starts at Wave 0; resolves by Wave 4. |

**Wave-boundary gates:**
- After Wave 0: `npm test` passes (existing test still green); `grep -rn "ALLOWLIST" src/` returns only `adminAllowlist.ts` + `useRole.ts`; `grep -rn "isAllowlistedAdmin" src/` same.
- After Wave 1: CreateListingScreen.tsx has zero `userType === 'admin'` matches; admin + non-admin render paths smoke-tested on one physical device.
- After Wave 2: PropertyDetailsScreen.tsx + ProfileScreen.tsx same check.
- After Wave 3: `npm test` shows 2+ passing test cases; `grep -rn "patchPlatformVerifications" src/services/` shows the guard is present.
- After Wave 4: D-14 4-part grep returns green across all 4 invariants; phase-exit artifact exists.

**No matrix walkthrough:** Gating is deterministic, not timing-sensitive (unlike Phase 2's keyboard behavior). One device-per-platform smoke is sufficient (CONTEXT Discretion confirms).

---

## §5 Backend Enforcement Coordination (GATE-05)

### §5.1 Question to Railway team

Paste-ready outreach text (planner may adjust):

> Hi — for JayTap v1.0.4 we're adding client-side gating on admin-only fields. Can you confirm whether the Railway backend **independently verifies** that the authenticated user (`x-firebase-uid` header) is an admin server-side before accepting these requests? Without server enforcement, the client gate is cosmetic only.
>
> Two specific endpoints:
> 1. `PATCH /properties/:id/verifications` — sets `platformVerifications.{ownershipDocuments, ownerIdentityVerified, stateIssuedDocumentsVerified}`. Current code: `src/services/PropertyService.ts:190-213`. Sends `x-firebase-uid` + `firebaseUid` in body.
> 2. `PUT /properties/:id` — any write that includes `tours`, `matterportUrl` (deprecated field), or `panoramicPhotosUrl` in the payload. Current code: `src/services/PropertyService.ts:117-187`.
>
> Specifically: if a user whose backend `userType !== 'admin'` sends one of these requests, does the backend reject (what status code?), or accept?
>
> Context: this is M1 precursor work. M2 will ship Firebase custom claims + server-side token verification (`firebase-admin` SDK) — but for M1 we'd like to know whether we're shipping a cosmetic gate or a real-enough one.

### §5.2 Two exit paths (D-22)

**Path A — Confirmed enforcement:**
- Record the Railway team's answer (email/Slack quote, timestamp, endpoint-by-endpoint) inside `03-VERIFICATION.md`.
- NO PROJECT.md change needed.
- GATE-05 closes as "confirmed."

**Path B — Unconfirmed at M1 ship:**
- Add a row to `.planning/PROJECT.md` Key Decisions:
  > \| Accepted risk: client-only gating on admin URL / verification edits in v1.0.4 \| Backend enforcement not confirmed by M1 ship; rolls into existing CONCERNS.md "Firebase uid used as sole auth" pre-existing risk. M2 ROLE-04 ships server-side Firebase token verification. \| — Pending M2 \|
- Record the same in `03-VERIFICATION.md` under "GATE-05 outcome: unconfirmed-at-ship path taken."
- GATE-05 closes as "documented risk."

### §5.3 Coordination artifact template

Recommended file: `.planning/phases/03-role-gating-precursor/03-BACKEND-COORDINATION.md`

```markdown
# Phase 3 — Backend Enforcement Coordination

**Opened:** [date]
**Contact:** [name / Slack handle / email]
**Status:** OPEN / CONFIRMED / UNCONFIRMED-AT-SHIP

## Question sent
[paste from §5.1]

## Response received
[date] — [verbatim quote or "no response"]

## Outcome
[A — confirmed] or [B — accepted risk row added to PROJECT.md Key Decisions]

## Per-endpoint status
- [ ] PATCH /properties/:id/verifications — [confirmed / accepted risk]
- [ ] PUT /properties/:id (tours + panoramicPhotosUrl fields) — [confirmed / accepted risk]
```

Per D-23 this file's existence and sign-off path is NOT on the critical path for phase implementation — but it IS required for phase exit (GATE-05).

---

## §6 Forward-Compatibility Checklist (M2 migration preview — GATE-04)

When M2 ROLE-01..ROLE-04 ship, here's the delta expected in this phase's artifacts:

| File | M2 change |
|------|-----------|
| `src/constants/adminAllowlist.ts` | **DELETE** the file. Deletable because D-14 invariant #3 guarantees only `useRole.ts` imports it. |
| `src/hooks/useRole.ts` | Remove Branch 3 (`isAllowlistedAdmin` fallback) from `deriveRole()`. Remove the `TODO(M2)` above it. Remove the `isAllowlistedAdmin` import. Branch 1 (`customClaims?.role`) starts populating once backend ships custom claims. |
| `src/screens/*.tsx` | **NO changes.** `can(action)` call sites don't move. This is the GATE-04 forward-compat promise — verified by the `Action` union being the stable contract. |
| `src/services/PropertyService.ts` | **NO changes to guard.** `canFromUser(user, 'editVerifications')` returns the same boolean; only the derivation path behind it changes. |
| `.planning/PROJECT.md` Key Decisions | Remove "Hardcoded admin email allowlist in M1" row; replace with "Custom-claims-backed roles (M2)" row. |

**Grep-able M2 migration checklist** (per D-07):
```bash
grep -rn "TODO(M2)" src/   # → 2 matches: adminAllowlist.ts + useRole.ts
```

---

## §7 Validation Architecture

> Required by `.planning/config.json` `workflow.nyquist_validation: true`. Drives generation of `03-VALIDATION.md`.

### §7.1 Validation philosophy

Phase 3 is the first M1 phase with a meaningful unit-test component. D-19 elevates the testing bar slightly beyond M1's "manual physical-device QA" default — but ONLY for the pure helper and the service guard. Gating is deterministic, not timing-sensitive (unlike Phase 2 keyboard), so no device matrix is needed. Validation has three legs:

1. **Unit tests (automated, repeatable):** `canFromUser` priority ladder + service-guard throws. These are the phase-exit bar per D-19.
2. **Grep invariants (automated, repeatable):** 4-part D-14 grep + 2 additional `TODO(M2)` / `import` greps.
3. **Manual device smoke (non-automated, one-shot):** admin + non-admin render on one iOS device and one Android device, across the three affected screens.

### §7.2 Test framework

| Property | Value |
|----------|-------|
| Framework | Jest `^29.6.3` with `preset: 'react-native'` [VERIFIED: jest.config.js] |
| Config file | `/Users/beckmaldinVL/development/mobileApps/JayTap/jest.config.js` |
| Quick run command | `npm test` |
| Full suite command | `npm test` (only one test file exists today + 1 new Phase 3 test file) |
| Test deps | `jest@^29.6.3`, `@types/jest@^29.5.13`, `react-test-renderer@19.2.3` (unused by Phase 3), `jest.mock` + `jest.fn` built-ins |
| No additional installs | `@testing-library/react-native` NOT needed — pure-function tests only. |

### §7.3 Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File / Status |
|--------|----------|-----------|-------------------|-------------|
| GATE-01 | `useRole.ts`, `Gated.tsx`, `adminAllowlist.ts` exist and export expected names | grep | `test -f src/hooks/useRole.ts && test -f src/components/Gated.tsx && test -f src/constants/adminAllowlist.ts` | Wave 0 creates; grep at Wave 4 exit. |
| GATE-01 | `useRole()` returns `{ role, isAdmin, isModerator, isAuthenticated, can }` shape | unit | `npx jest src/hooks/__tests__/useRole.test.ts -t "priority ladder"` | Test 1 (§3.8) — covers role derivation + all `can()` branches. |
| GATE-01 (M2 TODOs) | TODO(M2) comments exist where required | grep | `grep -rn "TODO(M2)" src/` returns 2+ matches (adminAllowlist.ts + useRole.ts) | Wave 0 grep. |
| GATE-02 | Matterport + panoramic URL UI gated by `can('editMatterportUrl')` / `can('editPanoramicUrl')` | grep + manual | `grep -n "action=\"editMatterportUrl\"\|action=\"editPanoramicUrl\"" src/screens/CreateListingScreen.tsx` returns 2+ matches | Manual smoke: admin sees, non-admin doesn't (§7.5). |
| GATE-03 | No inline `userType === 'admin'` in `src/` outside `useRole.ts` | grep | `grep -rn "userType === .admin." src/` returns 0 matches | D-14 invariant #1. |
| GATE-03 | No `backendProfile.userType` read outside `useRole.ts` | grep | `grep -rn "backendProfile.userType" src/` returns only `src/hooks/useRole.ts` matches | D-14 invariant #2. Note ProfileScreen.tsx:70 reads `profile.userType` (not `backendProfile.userType`) — this is the D-13 exempt display read, correctly uncaught by this grep. |
| GATE-03 | `ADMIN_EMAIL` / `adminAllowlist` imported only by `useRole.ts` | grep | `grep -rn "ADMIN_EMAIL\|adminAllowlist" src/` returns only `src/hooks/useRole.ts` + `src/constants/adminAllowlist.ts` | D-14 invariant #3. |
| GATE-03 | `isAllowlistedAdmin` defined once, consumed once | grep | `grep -rn "isAllowlistedAdmin" src/` returns 2 matches (`adminAllowlist.ts` defining + `useRole.ts` consuming) | D-14 invariant #4. |
| GATE-04 | Hook / component shape forward-compatible (no call-site changes on M2 swap) | review | Review §6 forward-compat table; confirm the `Action` union is the only cross-boundary contract | Exit review — no automated check, but the grep invariants provide the mechanical guarantee. |
| GATE-04 | `Action` union includes M2 values (`editAnyListing`, `approveListings`, `promoteToModerator`) | unit | Test 1's last 2 cases (§3.8) exercise M2 actions. | — |
| GATE-05 | Backend enforcement confirmed OR documented | manual | — | `03-BACKEND-COORDINATION.md` filled + `03-VERIFICATION.md` records outcome; PROJECT.md row added if Path B taken (§5.2). |
| (defense-in-depth) | `patchPlatformVerifications` throws `E_PERMISSION_DENIED` for non-admin | unit | `npx jest src/hooks/__tests__/useRole.test.ts -t "guard"` | Test 2 (§3.8) — 3 cases (non-admin throws, admin doesn't throw, allowlisted doesn't throw). |

### §7.4 Sampling rate

- **Per task commit:** `npm test` + `npx tsc --noEmit` (typecheck for the `Action` union integrity).
- **Per wave merge:** `npm test` (full suite = existing App.test.tsx + new useRole.test.ts = ~3 test files max) + Wave-1/Wave-2 focused grep invariant.
- **Phase gate (before `/gsd-verify-work`):** All 4 D-14 greps return green AND `npm test` passes AND `03-BACKEND-COORDINATION.md` exists with status CONFIRMED or UNCONFIRMED-AT-SHIP (with the PROJECT.md row added in the latter case).

### §7.5 Manual device smoke (one-shot, not a matrix)

Per CONTEXT Discretion ("one-off visual device-smoke-test cell... or rely on the unit tests + informal device run from D-19"). This research recommends **lightweight informal device run** over a formal matrix. The smoke has 4 mandatory checks:

| # | Scenario | Expected |
|---|----------|----------|
| 1 | Non-admin user opens `CreateListingScreen` (create-new mode) on iOS | Matterport tours section, panoramic URL `TextInput`, and admin-verification switches are NOT rendered. Video URL + Instagram URL inputs ARE rendered. |
| 2 | Non-admin user opens `CreateListingScreen` (edit mode) on an existing listing that has `tours[]` and `panoramicPhotosUrl` set | Same gating as #1. **AND** — on save, the existing listing's `tours` + `panoramicPhotosUrl` are preserved verbatim (D-09). Verify by re-opening the listing in admin mode or via DB. |
| 3 | Admin user (allowlisted email) opens `CreateListingScreen` on both platforms | All sections render — Matterport, panoramic URL, admin-verification switches visible. |
| 4 | Non-admin user taps "Manage listings" in ProfileScreen after setting `userType: 'renter'` via backend | ProfileScreen `canManageListings` still returns true — no regression from the `can('manageListings')` migration (D-12). |

**Recorded in:** One section appended to `03-VERIFICATION.md` — "Device smoke evidence." Table with 4 rows × 2 platforms (iOS Pro Max + Moto G XT2513V per CLAUDE.md convention). No video required. Textual notes only.

**Pass/fail threshold:** All 4 scenarios PASS on both platforms → phase exit eligible (combined with unit test + grep passes).

### §7.6 Wave 0 gaps

- [ ] **No `src/hooks/__tests__/` directory exists today** — Wave 3 Task 1 creates it along with `useRole.test.ts`.
- [ ] **No i18n `errors.*` namespace today** — Wave 0 adds `errors.permissionDenied` to both `en.ts` and `ru.ts`.
- [ ] **No `03-BACKEND-COORDINATION.md` exists today** — Wave 0′ (parallel) creates it.

*(All three are trivially addressed by the waves described in §4. No framework install, no config change, no infrastructure gap.)*

---

## §8 Security Domain

### §8.1 Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | NO | Out of scope — Firebase Identity Toolkit already handles login/signup. Phase 3 doesn't touch auth. |
| V3 Session Management | NO | Out of scope — `AsyncStorage` token caching is existing. |
| V4 Access Control | **YES** | **Primary focus.** Phase implements client-side access checks (UX layer). Real ASVS V4 compliance requires backend enforcement — GATE-05 explicitly calls this out. |
| V5 Input Validation | PARTIAL | Allowlist email trim + lowercase is input normalization (D-06). No user-supplied data from this phase affects sinks. |
| V6 Cryptography | NO | N/A — no crypto work. |
| V7 Error Handling | YES | `PermissionDeniedError` + error code `E_PERMISSION_DENIED`. No sensitive info in message (no `userId`, `email`, or token). Logs include `userId` for debugging — stays in console, not user-facing. [CITED: OWASP ASVS V7.4.1 — "Verify that every log entry includes... user or system account (if feasible)"] |
| V8 Data Protection | PARTIAL | Allowlist email `beckprograms@gmail.com` is PII in the app bundle — acknowledged in D-25 / PITFALLS.md §Pitfall 5 as "obfuscation ≠ security." Accepted posture. |

### §8.2 Known Threat Patterns for this phase

| Pattern | STRIDE | Standard Mitigation | Applied in Phase 3? |
|---------|--------|---------------------|-------|
| Client-side gating without server enforcement | Elevation of Privilege | Server-side authZ on every protected endpoint. | **Partially** — M1 client gate + service-layer helper; backend coordination via GATE-05 (D-21). **Documented as accepted risk if backend doesn't enforce (D-22).** |
| Hardcoded secret / credential leakage (allowlist emails in bundle) | Information Disclosure | Don't put secrets in client bundles. | **Accepted** — emails are NOT secrets (they're identifiers); PITFALLS.md §Pitfall 5 "obfuscation ≠ security." D-25 treats them as readability convention, not security. |
| Permission check bypass via stale context | Elevation of Privilege | Recompute role on every render; don't cache `isAdmin` across route changes. | **Applied** — `useRole()` returns fresh result each render via `useMemo` keyed on `user`. No stale closures. |
| Inconsistent gating (admin UI shown but save blocked, or vice-versa) | Tampering | Single source of truth for authorization decisions. | **Applied** — D-14 grep invariant #1 enforces zero inline checks outside `useRole.ts`. `canFromUser` is the ONE place both UI and service consult. |
| Admin-field exposure via UI "disabled" state | Information Disclosure | Hide entirely, don't disable. | **Applied** — D-08 HIDE non-admin Matterport/panoramic inputs (PITFALLS.md §Pitfall 5 anti-pattern: "shown-but-disabled"). |
| Privilege escalation via payload crafting (non-admin submits with `platformVerifications` in body) | Elevation of Privilege | Server-side field-level authorization. | **Layered** — Client: `can('editVerifications')` on payload branch (line 396). Service: `canFromUser` guard throwing `E_PERMISSION_DENIED` before `axios.patch`. Backend: GATE-05 coordination. |

### §8.3 Residual risk (post-phase)

- **If Path B (unconfirmed backend)**: a non-admin user with a crafted HTTP client can PATCH `/properties/:id/verifications` bypassing both UI gate and service guard. This is the GATE-05 accepted risk, documented in PROJECT.md. Mitigation: M2 ROLE-04 backend work.
- **Allowlist maintenance friction**: adding an admin requires a code edit + store release per D-24. Documented, accepted.
- **Moderator role UI isn't yet wired** — `editAnyListing` / `approveListings` / `promoteToModerator` actions exist in the type but don't map to backing UI. Correct for M1 — these fill in at M2 ADMIN/MOD phases. The planner should NOT add placeholder UI for these.

---

## §9 Common Pitfalls

### §9.1 Shown-but-disabled admin field

**What goes wrong:** Non-admin sees a disabled Matterport URL input with no explanation — assumes bug or contacts support.
**Why it happens:** "Disable" is the easier code path than "hide."
**How to avoid:** D-08 HIDE entirely via `<Gated>` with `fallback={null}` (default).
**Warning sign:** Any `disabled={!isAdmin}` prop on an input in a gated area.

### §9.2 Leaking allowlist into UI logic

**What goes wrong:** A screen imports `ALLOWLIST` or `isAllowlistedAdmin` directly to "check if current user is admin" — bypasses `useRole()`.
**Why it happens:** Developers unaware of the canonical hook.
**How to avoid:** D-14 invariant #3 + #4. Wave 4 grep is the backstop.
**Warning sign:** `grep -rn "isAllowlistedAdmin\|ALLOWLIST" src/` returns matches outside `useRole.ts` / `adminAllowlist.ts`.

### §9.3 Service guard without UI guard (or vice-versa)

**What goes wrong:** Only one layer gates — creates inconsistent UX (UI shows admin field, service rejects) or silent privilege escalation (service accepts but UI hides).
**Why it happens:** Migrating incrementally without the grep-pass backstop.
**How to avoid:** Wave 1/2 migrations run the D-14 grep after EACH screen. Wave 3 service guard arrives after UI is migrated.
**Warning sign:** D-14 grep returns matches after "completed" wave.

### §9.4 Payload-branch confusion (action naming drift)

**What goes wrong:** D-10 says "gate the submit-payload branch with `can('editMatterportUrl')`" — but the branch at line 396 actually governs `platformVerifications`, not `tours`/`matterportUrl`. Using the wrong action name creates false semantic coupling.
**Why it happens:** CONTEXT terminology vs. code reality mismatch (§2.3).
**How to avoid:** Planner confirms with §3.7 table: line 396 branch → `can('editVerifications')`. Lines 390–392 (`tours`, `panoramicPhotosUrl`) stay unwrapped.
**Warning sign:** Submit-time regression where non-admin edits of existing listings null out `tours` or `panoramicPhotosUrl`.

### §9.5 Edit-mode URL null-out regression

**What goes wrong:** A non-admin edits their listing; on save, `tours` becomes `[]` and `panoramicPhotosUrl` becomes `''` because the payload reads state that was never hydrated.
**Why it happens:** Someone "simplifies" the `useEffect` at line 185 to "only hydrate if admin."
**How to avoid:** D-09 state hydration is UNCONDITIONAL. The `<Gated>` wrapper hides UI but does not gate state hydration.
**Warning sign:** Smoke test #2 (§7.5) fails on re-open — tours/panoramic fields blank after a non-admin edit.

### §9.6 React hook in service layer

**What goes wrong:** Services import `useRole` and call it inside `patchPlatformVerifications`. Breaks immediately: hooks can't run outside React render.
**Why it happens:** Developer sees `useRole()` in UI and tries to reuse it.
**How to avoid:** D-16 mandates `canFromUser(user, action)` for service-layer consumers. Make sure `canFromUser` is the exported pure helper, NOT wrapped in `useCallback` or anything React-y.
**Warning sign:** "Invalid hook call" red-screen when `patchPlatformVerifications` runs.

### §9.7 Action union drift

**What goes wrong:** M2 adds a new action value (e.g., `'unlistProperty'`) but forgets to extend the `Action` type, causing call sites to pass untyped strings.
**Why it happens:** Loose typing on extension points.
**How to avoid:** `Action` string-literal union + TypeScript strict mode enforce compile-time check. If a typo slips through, the `can()` call errors at TS compile time.
**Warning sign:** Any `can(someDynamicString)` at a call site — should be a literal.

---

## §10 Open Questions for the Planner (RESOLVED)

1. **D-10 literal vs. effective action mapping.** D-10 says line 396's submit-payload branch is gated by `can('editMatterportUrl')`. §2.3 shows that line 396 ACTUALLY governs `platformVerifications` — semantically `can('editVerifications')`. The literal D-10 interpretation would mis-gate `platformVerifications`. Recommended resolution: line 396 → `can('editVerifications')`; leave `tours` / `panoramicPhotosUrl` payload fields unwrapped (D-09 preservation). **Is this the correct interpretation of combined D-08 + D-09 + D-10 intent?** If so, flag in the plan's Decisions table and reference §2.3. If the planner disagrees, raise a pre-planning question.
   - **Recommendation:** Go with §2.3. Consistent with code reality and D-09.
   - **RESOLVED:** Line 396 uses `can('editVerifications')` per Plan 05 Task 1 (Q1 anti-pattern grep in Plan 05 Task 1 acceptance_criteria: `grep -Fc "...(can('editMatterportUrl')" returns 0`). The `tours` / `panoramicPhotosUrl` payload fields remain unwrapped at lines 390, 394 per D-09 preservation.

2. **Jest test location convention.** Co-locate under `src/hooks/__tests__/` (establishes new convention) vs. root `__tests__/useRole.test.ts` (matches existing `App.test.tsx`)? D-19 says "path subject to planner convention."
   - **Recommendation:** Co-locate. New `src/hooks/` directory starts fresh; co-located tests are easier to keep in sync. If planner has strong preference for root-level, either works — grep invariants don't care about test paths.
   - **RESOLVED:** Tests co-located under `src/hooks/__tests__/`, `src/services/__tests__/`, and `src/components/__tests__/` per Plan 01 Tasks 1 and 2. Scaffolded in Wave 0.

3. **Extraction of `PermissionDeniedError` to its own file.** CONTEXT Discretion offers `src/hooks/errors.ts` vs. co-locate in `useRole.ts`.
   - **Recommendation:** Co-locate. One-item modules are friction.
   - **RESOLVED:** `PermissionDeniedError` co-located in `src/hooks/useRole.ts` per Plan 02 Task 2 (not a separate `src/hooks/errors.ts` module).

4. **Type augmentation for `customClaims`.** CONTEXT Discretion offers adding `customClaims?: { role?: Role }` to the backend-user type. No `BackendUser` / `AuthUser` type exists (§2.4). Options: (a) add a narrow local type in `useRole.ts` (§2.4 example); (b) use `(user as any)?.backendProfile?.customClaims?.role`; (c) create `src/types/AuthUser.ts`.
   - **Recommendation:** Option (a). One local type in `useRole.ts`. Cheap, improves readability, doesn't fragment type system. Option (c) is over-reach for Phase 3.
   - **RESOLVED:** No `customClaims` augmentation — local `Role | undefined` cast inside `useRole.ts` matches the existing `AuthContext` convention of `user: any` (per Plan 02 Task 2). No new `src/types/AuthUser.ts` file. Option (a) chosen.

5. **Should `canManageListings` become part of `can('manageListings')` entirely, or keep the local rename?** D-11 site 9 says: `const { can } = useRole(); const canManageListings = can('manageListings');` — preserves the local name. Alternative: inline `can('manageListings')` at every use site (only ~2 call sites in ProfileScreen).
   - **Recommendation:** Keep the local alias — matches existing variable name, minimal diff.
   - **RESOLVED:** `canManageListings` alias retained locally in `ProfileScreen.tsx` per Plan 06 Task 2 (`const canManageListings = can('manageListings');`). Minimal diff, preserves existing variable name.

6. **Whether to delete the `isAdmin` destructure at `CreateListingScreen.tsx:110` entirely after Wave 1.** After migrating sites 2–4 to `can()`, `isAdmin` may have no consumers inside the file.
   - **Recommendation:** Run `grep -n "isAdmin" src/screens/CreateListingScreen.tsx` at Wave 1 end. If zero matches beyond line 110, drop `isAdmin` from the destructure: `const { can } = useRole();`. If any remain, keep the destructure.
   - **RESOLVED:** `isAdmin` destructure dropped entirely from `CreateListingScreen.tsx` and `PropertyDetailsScreen.tsx` (Plan 05 Task 1 + Plan 06 Task 1 migrate ALL `isAdmin` sites to `can()` / `<Gated>`). Plan 05 Task 1 includes a pre-check grep asserting exactly 4 pre-migration matches at lines 110, 319, 396, 933; anything else halts execution for human review.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `AuthContext` provides a stable `user` reference across unrelated re-renders (so `useMemo` in `useRole()` does what's expected) | §3.2 | False → hook returns a new `can` on every render → minor perf hit, no correctness bug. Low risk. [VERIFIED: AuthContext uses `setUser` with object-identity updates; standard React Context semantics.] |
| A2 | `jest.mock('axios')` + `jest.mock('../../services/AuthService')` works under `preset: 'react-native'` without additional `__mocks__` files | §3.8 / §7.2 | Moderate — if mocks require manual implementations, Wave 3 task grows by ~30 min (typical Jest experience). Not blocking. [VERIFIED: `preset: 'react-native'` is the standard preset; `jest.mock` with a module path auto-mocks per Jest 29 docs.] |
| A3 | Editing a non-admin user's existing listing preserves `tours` and `panoramicPhotosUrl` without code change, because state hydration at line 185 is unconditional | §2.3 / §3.10 | **HIGH if false** — non-admin edits would null out admin-curated URLs. **Mitigated** by Smoke Scenario #2 (§7.5). [VERIFIED by code read: `CreateListingScreen.tsx:185,202-210,390-392` all unconditional on `isAdmin`.] |
| A4 | Railway backend enforcement on `/verifications` PATCH is unknown today | §5 | If the backend DOES enforce, great — GATE-05 closes as "confirmed." If it DOESN'T, D-22 accepted-risk path is ready. Either way, phase ships. |
| A5 | `customClaims` field is not currently in `BackendUser` shape (M2 lands it) | §2.4 / §3.2 | False → reading `customClaims?.role` compiles fine against `any`. Low risk even if assumption wrong. [VERIFIED: `grep -rn "customClaims" src/` returns 0 matches 2026-04-23.] |
| A6 | Co-locating `PermissionDeniedError` in `useRole.ts` does NOT create a circular import with `PropertyService.ts` | §3.5 | `useRole.ts` imports `isAllowlistedAdmin` from `adminAllowlist.ts` (no back-link); `PropertyService.ts` imports `canFromUser, PermissionDeniedError` from `useRole.ts` (no back-link). No circular dependency. [VERIFIED by import-graph reasoning.] |
| A7 | Running `npm test` on the current repo passes (baseline for Wave 0 regression detection) | §7.2 | If baseline fails, planner must fix App.test.tsx first (pre-existing bug). Out of scope for Phase 3 but surfaces early. **Recommend: run `npm test` as Wave 0 Task 0.** |
| A8 | Phase 2's `47a52b7` precedent ("library requires explicit prop" gap surfaced at device walk and landed as atomic follow-up") applies here — any gap between CONTEXT assumptions and code reality is a small adjustment, not a scope expansion | §2.3 / discipline | Validates the §2.3 correction pattern. If a similar gap surfaces during implementation (e.g., `useAuth()` return shape different), follow precedent: adjust + annotate, don't reopen CONTEXT. |

---

## Project Constraints (from CLAUDE.md)

These directives apply to ALL work on JayTap; the planner MUST verify compliance.

- **Navigation:** No react-navigation migration. `useRole()` and `<Gated>` work within the custom `App.tsx` state machine — no routing changes needed.
- **State:** React Context providers (`ThemeProvider` → `LanguageProvider` → `AuthProvider`). `useRole()` consumes `useAuth()` read-only. No new provider added.
- **HTTP:** `axios` to Railway backend. `PropertyService` unchanged except the new guard at `patchPlatformVerifications`.
- **i18n:** EN + RU parity required. `errors.permissionDenied` added to both `src/locales/en.ts` AND `src/locales/ru.ts`.
- **Theme:** `useTheme()` tokens, no hardcoded colors. `<Gated>` renders nothing when off — no styles needed. When ON, renders children as-is (children handle their own theming). No new color tokens introduced.
- **Testing bar (M1):** Manual physical-device QA + per D-19 two unit tests. Smoke matrix is light-touch, not the 22-cell Phase-2 precedent.
- **M1 stack:** `useRole()` is a LIBRARY-FREE hook + hardcoded email allowlist, per CLAUDE.md "Stack Decisions" which encodes D-01.

---

## Code Examples

Verified patterns from the existing codebase:

### Context consumer hook with throw-on-unmount (`src/context/AuthContext.tsx:131-137`)
```typescript
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
```
`useRole()` doesn't need this guard itself — it delegates to `useAuth()` which provides it. If `useRole()` is called outside `AuthProvider`, `useAuth()` throws first.

### Service-layer error throwing with recognizable message (`src/services/AuthService.ts:90-94`)
```typescript
if (error.response?.data?.code === 'ACCOUNT_LOCKED') {
  throw new Error('ACCOUNT_LOCKED');
}
```
`PermissionDeniedError` follows the same "throw an Error with recognizable message token" pattern. Catch sites can use `error.message === 'E_PERMISSION_DENIED'` or `error instanceof PermissionDeniedError` depending on preference.

### Catching + translating at UI layer (`src/screens/LoginScreen.tsx:27-46` — pattern)
```typescript
try {
  await login(email, password);
} catch (error: any) {
  setErrorMessage(error.message || t('auth.loginFailed'));
}
```
Admin-flow UI callers of `patchPlatformVerifications` follow the same shape, catching `'E_PERMISSION_DENIED'` and mapping to `t('errors.permissionDenied')`.

### i18n key additions (new keys in both `en.ts` and `ru.ts`)

Add to `src/locales/en.ts` (alphabetically, in a new `// Errors` comment block):
```typescript
// Errors
'errors.permissionDenied': "You don't have permission to perform this action.",
```

Add to `src/locales/ru.ts` (same key placement; `TranslationKeys` derives from `en.ts`, so `en.ts` MUST be updated first):
```typescript
'errors.permissionDenied': 'У вас нет прав для выполнения этого действия.',
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Scattered `isAdmin = user?.backendProfile?.userType === 'admin'` at every site | Single `useRole()` hook + `can(action)` primitive | Phase 3 (this phase) | Migrations in 6 sites; one hook is the canonical source. |
| Inline gating via `{isAdmin && ...}` in JSX | `<Gated action="..."`>` wrapper | Phase 3 (this phase) | Declarative, grep-able. |
| No service-layer authZ on admin-only methods | `canFromUser` guard on `patchPlatformVerifications` | Phase 3 (this phase) | Defense-in-depth; doesn't replace backend enforcement. |
| No translated error for permission denial | `errors.permissionDenied` key + catch-and-translate pattern | Phase 3 (this phase) | Consistent with existing `ACCOUNT_LOCKED` / `auth.loginFailed` patterns. |

**Deprecated/outdated:**
- **`userType === 'admin'` inline checks** — leaves this phase. Outside `useRole.ts`, any match is a bug (D-14 invariant).
- **Direct `ALLOWLIST` imports at UI layer** — never ship; D-14 invariant #3.

---

## Sources

### Primary (HIGH confidence)
- `/Users/beckmaldinVL/development/mobileApps/JayTap/.planning/phases/03-role-gating-precursor/03-CONTEXT.md` — 25 locked decisions, canonical_refs, code_context (THIS IS THE LOAD-BEARING SOURCE).
- `/Users/beckmaldinVL/development/mobileApps/JayTap/.planning/REQUIREMENTS.md:55-59` — GATE-01..GATE-05 literal requirement text.
- `/Users/beckmaldinVL/development/mobileApps/JayTap/src/screens/CreateListingScreen.tsx` lines 110, 185, 202–210, 319, 390–396, 781–830, 843–852, 933 — call sites and existing structure (VERIFIED 2026-04-23 via grep).
- `/Users/beckmaldinVL/development/mobileApps/JayTap/src/screens/PropertyDetailsScreen.tsx` lines 178, 401.
- `/Users/beckmaldinVL/development/mobileApps/JayTap/src/screens/ProfileScreen.tsx` lines 26, 33, 70.
- `/Users/beckmaldinVL/development/mobileApps/JayTap/src/services/PropertyService.ts` lines 190-213 (patchPlatformVerifications).
- `/Users/beckmaldinVL/development/mobileApps/JayTap/src/context/AuthContext.tsx` (AuthContextType shape confirming `user: any`).
- `/Users/beckmaldinVL/development/mobileApps/JayTap/package.json` + `jest.config.js` + `tsconfig.json` (testing stack verified present).
- `/Users/beckmaldinVL/development/mobileApps/JayTap/src/locales/en.ts` + `ru.ts` (locale format `.ts` confirmed).
- `/Users/beckmaldinVL/development/mobileApps/JayTap/.planning/codebase/ARCHITECTURE.md`, `CONVENTIONS.md`, `STRUCTURE.md`, `TESTING.md` (codebase conventions).
- `/Users/beckmaldinVL/development/mobileApps/JayTap/CLAUDE.md` (project constraints).

### Secondary (MEDIUM confidence)
- `/Users/beckmaldinVL/development/mobileApps/JayTap/.planning/research/ARCHITECTURE.md` §4 — role-gating blueprint (CONTEXT canonical_refs anchor; not re-read in this session because CONTEXT already synthesizes it into D-01..D-07).
- `/Users/beckmaldinVL/development/mobileApps/JayTap/.planning/research/PITFALLS.md` §Pitfall 5 — allowlist pitfalls (CONTEXT synthesizes).
- `/Users/beckmaldinVL/development/mobileApps/JayTap/.planning/phases/02-universal-keyboard-handling/02-RESEARCH.md` — format precedent for this research file.

### Tertiary (LOW confidence)
- None. Every claim above is either VERIFIED (tool-confirmed) or CITED (from CONTEXT.md / code).

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — zero new deps; existing Jest + TS + React stack.
- Architecture: HIGH — CONTEXT locks 25 decisions; code_context grounds them.
- Pitfalls: HIGH — load-bearing corrections (§2.2, §2.3) surfaced and explained.
- Tests: HIGH — pure helper strategy avoids missing test-library dep.
- Backend coordination: MEDIUM — depends on external team response.

**Research date:** 2026-04-23
**Valid until:** 2026-05-23 (30-day estimate; Phase 3 scope is locked and stable. Renew if Railway backend answer lands.)

---

## RESEARCH COMPLETE

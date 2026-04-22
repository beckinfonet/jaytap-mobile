# Stack Research

**Domain:** Brownfield React Native 0.84 (New Architecture + Hermes) real-estate marketplace — four targeted additions for M1 "Polish + Hospitality"
**Researched:** 2026-04-22
**Confidence:** HIGH overall (see per-recommendation levels below)

> **Scope note.** This is a subsequent-milestone research. The existing stack is documented in `.planning/codebase/STACK.md` and is NOT re-researched. This file ONLY recommends what to ADD (or deliberately NOT add) to solve the four M1 problems: keyboard overlap, conditional form fields, role gating, and the auth/role hardening question.

---

## Recommended Stack

### Core Technologies (additions to existing stack)

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `react-native-keyboard-controller` | **1.21.6** (published 2 days before research date) | Universal keyboard overlap fix — provides `KeyboardProvider`, `KeyboardAwareScrollView`, `KeyboardAvoidingView` (drop-in), `KeyboardToolbar`, `KeyboardStickyView` | Only actively maintained, reanimated-backed keyboard manager with identical iOS + Android behavior. Supports New Architecture since 1.2.0, bridgeless since 1.12.0, and the 1.21.x line specifically fixed layout-thrashing during keyboard animations and rewrote `KeyboardAwareScrollView` to be far more robust in ScrollView + deeply-nested-input scenarios. RN 0.84 compat: library peer range is `0.81.0+` (documented) and the project's own compatibility page uses `+` semantics; 1.21.6 actively ships fixes for bridgeless + fabric regressions through April 2026. |
| `react-hook-form` | **7.73.1** (released 2026-04-18) | Form state + conditional required-field validation for the 9-property-type, 3-category listing form | Actively maintained (Formik's last release was 2024, effectively unmaintained). Controlled-ref architecture means re-renders are scoped per-field — critical on a long listing form with image pickers and date pickers already mounted. Works identically in React Native, and `Controller` cleanly wraps `TextInput`. Zero native deps → no New Arch risk. |
| `zod` | **3.x** (pin to `^3.24`; do NOT use `zod@4.x` yet) | Declarative schema for per-category required-field sets (Residential / Commercial / Hospitality) with a `z.discriminatedUnion` on `propertyCategory` | Lets the category-driven branching live in a single schema instead of spread across component-level conditionals. Pairs with RHF via `@hookform/resolvers/zod`. **Critical pin:** an open bug (`colinhacks/zod#4989`) reports that `zod@4` + `react-hook-form` fails to submit on React Native — stay on `zod@3.x` until resolved. |
| `@hookform/resolvers` | **latest 3.x** | Connect Zod schema to RHF | Standard glue; zero native deps. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `react-native-reanimated` | **peer of keyboard-controller** (`>=3.0.0`; current stable 3.19.x / 4.x) | Required peer for `react-native-keyboard-controller` animations | **Already a transitive concern to verify** — run `npx react-native info` against the repo. If reanimated is not already installed, installing keyboard-controller requires adding it, which requires Babel plugin setup + a `pod install` + a clean build. This is the single biggest install-time risk. |
| Pure `useState` / custom hooks | N/A | Role gating logic + admin allowlist | No library needed. A 5-line `useIsAdmin()` hook is the right answer for M1 (see Role Gating section). |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| `@hookform/devtools` | Optional RHF dev overlay | Web-only; do NOT install for React Native. Debug forms via RHF's `formState` logged through `console.log` instead. |

---

## Installation

```bash
# Keyboard handling — REQUIRED: reanimated must be present first.
# If reanimated is NOT already in package.json, install it first and follow its Babel setup:
#   npm install react-native-reanimated
#   (add 'react-native-reanimated/plugin' as the LAST plugin in babel.config.js)
#   cd ios && pod install

# Then the keyboard controller:
npm install react-native-keyboard-controller@1.21.6
cd ios && pod install && cd ..

# Form state + validation
npm install react-hook-form@7.73.1 zod@^3.24 @hookform/resolvers
```

**Post-install steps (non-negotiable on RN 0.84 New Arch):**

1. Wrap the root in `<KeyboardProvider>` — add it in `App.tsx` inside `SafeAreaProvider`, outside the theme/language/auth providers. Without it, none of the keyboard-controller components work.
2. `cd ios && pod install` — the library ships native code; autolinking requires a fresh pod install on first add and on every library upgrade.
3. Full rebuild required: `npx react-native run-ios` / `npx react-native run-android` — Metro-only hot reload won't pick up the new native modules.
4. If you see `MutexLockWithTimeout` C++ exceptions on Android (documented issue with keyboard-controller + New Arch on older RN), they're **already resolved on RN 0.84** — that fix landed in RN 0.77. No feature flag needed.

---

## Per-Dimension Recommendations

### 1. Keyboard Handling — **Use `react-native-keyboard-controller` (1.21.6)**

**Confidence: HIGH**

**Decision:** Standardize on `react-native-keyboard-controller`'s `KeyboardAwareScrollView` for every screen with >1 input, and `KeyboardAvoidingView` (the library's drop-in, NOT React Native's built-in one) for auth modals and single-input overlays.

**Why this wins the three-way comparison:**

| Criterion | React Native `KeyboardAvoidingView` (built-in) | `react-native-keyboard-aware-scroll-view` (APSL) | **`react-native-keyboard-controller`** |
|-----------|-----------------------------------------------|--------------------------------------------------|----------------------------------------|
| Last release | Shipped with RN core | **Nov 2021** (4+ years stale) | **April 2026** (2 days before research) |
| iOS + Android parity | Requires `behavior="padding" vs "height"` platform-specific config | Known issues with iOS Keyboard API deprecations | Identical API on both platforms |
| New Architecture / Fabric | Known bugs: stale keyboard-open state after unmount/remount ([RN #46942](https://github.com/facebook/react-native/issues/46942)) | Not designed for Fabric; community reports breakage | Native Fabric support since 1.2.0; bridgeless since 1.12.0 |
| Android 15 / targetSdk 35 | [RN #49759](https://github.com/facebook/react-native/issues/49759) — stops working on targetSdk 35 (JayTap targets 36) | Same class of bugs | Actively patched for edge-to-edge and targetSdk 35+ (1.21.5) |
| ScrollView + deeply nested inputs | Crashes on iOS when nested in ScrollView ([RN #42939](https://github.com/facebook/react-native/issues/42939)) | Designed for this, but unmaintained | `KeyboardAwareScrollView` rewritten in 1.21 with layout-free animations; handles nested inputs + FlatList via `renderScrollComponent` |
| RN 0.84 explicit support | Built-in (bugs are shared RN issues) | No | Documented peer `0.81.0+`; 1.21.6 tracks current RN; issue #1411 confirms active 0.83.x support |

**RN 0.84 + New Arch compatibility note (verified):** The library's public compatibility matrix caps at `0.81.0+` with library `1.18.0+` because the matrix hasn't been re-published for 0.82/0.83/0.84 yet. Two verification points indicate 0.84 works:

1. Issue [#1411](https://github.com/kirillzyusko/react-native-keyboard-controller/issues/1411) (April 2026) is actively discussing RN 0.83.2 + Fabric bugs in **1.21.2** with maintainer engagement — meaning maintainers treat 0.83.x as in-scope. Fixes shipped through 1.21.6.
2. The Reanimated peer (`>=3.0.0`) is the real compatibility constraint, not RN version, because keyboard-controller defers animation to Reanimated.

**Caveats to flag for the roadmap:**

- **Risk: Reanimated cold install.** If `react-native-reanimated` is not already in the JayTap `package.json` (verify during planning), installing keyboard-controller requires adding Reanimated + its Babel plugin + a pod install + a clean Android build. This is 1–2 hours of setup per platform, not 5 minutes.
- **Risk: `KeyboardProvider` placement.** It must wrap everything that renders inputs. In JayTap's architecture, that means inside `SafeAreaProvider` but wrapping all other context providers in `App.tsx`. Missing this makes components silently no-op.
- **Risk: The custom navigation overlays.** JayTap overlays screens with `position: absolute` + `zIndex` instead of using a stack navigator. `KeyboardAwareScrollView` will work per-screen, but **`KeyboardStickyView` and `KeyboardToolbar` need a single `KeyboardProvider` at the root** — not one per overlay. This is the correct pattern but worth calling out explicitly.

**Do NOT use:**

- React Native's built-in `KeyboardAvoidingView` — documented to be broken on New Arch unmount/remount and on Android targetSdk 35+. JayTap targets SDK 36.
- `react-native-keyboard-aware-scroll-view` (APSL) — **unmaintained since November 2021.** Uses deprecated `currentlyFocusedField` APIs. Will not receive RN 0.84 / New Arch fixes.

---

### 2. Form Conditional Rendering — **`react-hook-form` + `zod` discriminated union**

**Confidence: HIGH** (for the library pick); **MEDIUM** (for the exact schema shape — depends on final backend DTO)

**Decision:** Use `react-hook-form` for form state + `zod` for a discriminated-union schema keyed on `propertyCategory`. Wrap `TextInput` via RHF's `Controller`.

**Why:**

The listing form has 9 property types × 3 categories × ~15 possible fields, and M1 explicitly requires branching required-field sets per category. The three realistic options:

| Approach | Verdict | Reason |
|----------|---------|--------|
| Pure `useState` + manual `if (category === 'Residential') …` checks | **Reject** | Works for 3 fields, falls apart at 15. JayTap's existing `CreateListingScreen.tsx` is already a candidate for a rewrite here; adding more conditionals in local state compounds the mess. |
| Formik | **Reject** | No release since 2024. Larger bundle (44KB vs RHF's 12KB gzipped). Re-renders the whole form on each keystroke — noticeably worse on long forms on mid-range Android devices common in Bishkek. |
| **react-hook-form + zod** | **Recommend** | RHF is actively maintained (7.73.1 on 2026-04-18). Controlled-ref architecture means typing in field A does not re-render field Z. Zod `discriminatedUnion` expresses category-required-fields declaratively: one schema owns the branching logic, the UI just reads `formState.errors`. Type inference via `z.infer<typeof schema>` gives the rest of the app a single source of truth for the `Property` DTO shape. |

**Why New Arch is a non-issue for this pick:** Both libraries are pure JS with no native modules. They care only about React 19 (JayTap has React 19.2.3 ✓) and TypeScript 5.x (JayTap has 5.8.3 ✓). Nothing in either library touches Fabric or TurboModules.

**Exact pattern to use (sketch for the roadmap):**

```ts
// Property category schema — one place owns the branching
const BaseSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  images: z.array(z.string()).min(1),
});

const ResidentialSchema = BaseSchema.extend({
  propertyCategory: z.literal('Residential'),
  propertyType: z.enum(['Apartment', 'House', 'Studio']),
  bedrooms: z.number().int().min(0),
  bathrooms: z.number().int().min(0),
  area: z.number().positive(),
  price: z.number().positive(),
});

const CommercialSchema = BaseSchema.extend({
  propertyCategory: z.literal('Commercial'),
  propertyType: z.enum(['Office', 'Retail', 'Warehouse']),
  area: z.number().positive(),
  price: z.number().positive(),
  // no bedrooms, no bathrooms
});

const HospitalitySchema = BaseSchema.extend({
  propertyCategory: z.literal('Hospitality'),
  propertyType: z.enum(['Hostel', 'Hotel']),
  rooms: z.number().int().positive(),
  bathrooms: z.number().int().min(0),
  amenities: z.array(z.string()),
  // no price — showcase only per M1 decision
});

const ListingSchema = z.discriminatedUnion('propertyCategory', [
  ResidentialSchema,
  CommercialSchema,
  HospitalitySchema,
]);

type Listing = z.infer<typeof ListingSchema>;
```

**Critical version pin:** `zod@^3.24` — not `zod@4`. Issue [colinhacks/zod#4989](https://github.com/colinhacks/zod/issues/4989) documents that zod v4 + react-hook-form fails to submit forms on React Native. Downgrading to v3 resolves it. This is actively unresolved as of April 2026.

---

### 3. Role Gating — **Pure `useState` / `useMemo` + a single hardcoded allowlist constant**

**Confidence: HIGH** (library-free is the right call); **HIGH** (anti-patterns called out are well-established)

**Decision:** No library. Add a single `src/config/adminAllowlist.ts` with the hardcoded emails, and a `useIsAdmin()` hook that compares against `useAuth().user?.email`. Shape it so M2 can swap to custom claims without renaming call sites.

**Recommended M1 pattern (shippable in <1 hour):**

```ts
// src/config/adminAllowlist.ts
export const ADMIN_EMAIL_ALLOWLIST: ReadonlyArray<string> = [
  'beckprograms@gmail.com',
  // add more as needed; this file is the ONLY edit site for M1 admin changes
].map(e => e.toLowerCase());

// src/hooks/useRole.ts
import { useAuth } from '../context/AuthContext';
import { ADMIN_EMAIL_ALLOWLIST } from '../config/adminAllowlist';

export type Role = 'admin' | 'moderator' | 'user';

export function useRole(): Role {
  const { user } = useAuth();
  const email = user?.email?.toLowerCase();

  // M1: hardcoded allowlist
  if (email && ADMIN_EMAIL_ALLOWLIST.includes(email)) return 'admin';

  // M2-forward-compatible: already check backend userType if it happens to be set
  const backendType = user?.backendProfile?.userType;
  if (backendType === 'admin' || backendType === 'moderator') return backendType;

  return 'user';
}

export function useIsAdmin(): boolean {
  return useRole() === 'admin';
}
```

**Why this shape is forward-compatible to M2:**

- Call sites use `useIsAdmin()` / `useRole()` — they don't care WHERE the role came from.
- When M2 lands Firebase custom claims, the hook's internals change (read from `idTokenResult.claims.role` instead of email) but EVERY call site stays identical. Zero refactor cost.
- The `Role` type already names `'moderator'`, even though M1 never returns it. M2 adds moderator UI without changing this type.

**Anti-patterns to explicitly avoid:**

| Anti-pattern | Why it's wrong | What to do instead |
|--------------|----------------|-------------------|
| **Trusting client-only role gating as security.** Hiding the Matterport URL input in the UI but letting the backend accept anyone's PATCH. | A user with curl + their own Firebase UID can still send the request. Client gating is **UX, not security.** | Backend must ALSO enforce role on `PATCH /properties/:id/platform-verifications`. The M1 `userType === 'admin'` check at `PropertyDetailsScreen.tsx:178` is only half the story — confirm the backend rejects the same PATCH from a non-admin UID. If it doesn't, that's a M1 bug, not an M2 one. |
| **Trusting the `userType` field returned by `/auth/users/:uid`.** | The backend read path returns whatever Mongo stores. If any write path lets a user set their own `userType`, the whole role system is forgeable. | In M1, explicitly do NOT rely on `userType` coming down the wire for gating — use the hardcoded allowlist. In M2, the `userType` field should be written ONLY by admin-authenticated endpoints, and/or replaced by Firebase custom claims (see section 4). |
| **Putting roles in a library (`casl`, `accesscontrol`, etc.).** | Over-engineered for 3 roles and ~5 gated actions. Adds a dependency, a DSL, and a mental-model tax for no concrete payoff. | Plain TypeScript functions. Revisit in M3+ only if gating logic explodes past ~20 rules. |
| **A `Role[]` array instead of a single `Role`.** | Every JayTap user has exactly one role. Arrays invite permission-bitmap thinking that this app doesn't need. | Single `Role` type. |
| **Checking roles in render instead of in a hook.** | `if (user.email === 'beck...')` scattered across 5 screens → 5 places to update when the list changes. | Single `useIsAdmin()` hook; one import per call site. |

**Where M1 role gating is needed (per PROJECT.md):**

- `CreateListingScreen` — hide Matterport URL + panoramic URL inputs unless `useIsAdmin()`.
- `PropertyDetailsScreen` — the existing admin-only edit path at line 178 (already gated by `userType === 'admin'`; swap to `useIsAdmin()` to unify).
- Nothing else. Chat, profile, favorites, etc. are all-user.

---

### 4. Firebase Identity Toolkit + Role Trustworthiness — **Custom claims for M2, NOT M1**

**Confidence: HIGH** (the architectural conclusion); **HIGH** (the Identity Toolkit REST constraint)

**Decision tree:**

- **For M1 (hardcoded allowlist):** No change required. The allowlist is in client code, which is already client-trusted ground. Backend enforcement on the one admin-only endpoint (`patchPlatformVerifications`) is all the security M1 needs — and that's a backend concern, not a mobile one.
- **For M2 (real three-role system):** **Yes, you need Firebase custom claims (or an equivalent signed-role source).** The current `backendProfile.userType` field is NOT trustworthy on its own unless the backend both (a) is the sole writer and (b) verifies the Firebase ID token on every request it authorizes against `userType`. The current app sends `x-firebase-uid` as a plain header — not a verified bearer token — which is the bigger issue.

**Why custom claims are the right M2 answer (verified from [Firebase docs](https://firebase.google.com/docs/auth/admin/custom-claims)):**

1. **Set server-side only.** Custom claims can ONLY be written via the Firebase Admin SDK from a privileged server environment. Clients cannot forge them.
2. **Embedded in the ID token.** Every authenticated request to the backend carries the role in the signed JWT — no extra DB read needed to authorize.
3. **Tamper-evident.** Firebase signs the ID token. If the client alters the role, signature verification fails server-side.
4. **The existing `userType` field is NOT a drop-in replacement.** An unsigned backend field requires the client to be trusted OR requires the backend to do a DB read + trust-chain verification on every request. Custom claims short-circuit both problems.

**Identity Toolkit REST constraint (important):**

JayTap does NOT use the Firebase client SDK — it calls Identity Toolkit REST directly from `AuthService.ts`. **The Firebase documentation does not expose REST endpoints for setting custom claims** — they're Admin SDK only (Node.js, Python, Java, Go, C#). This means M2's role-setting code **must live on the Railway backend** (Node.js Admin SDK), not in the mobile app. Concretely:

- Add `firebase-admin` to the Railway backend.
- Add an admin-only endpoint `POST /admin/users/:uid/role` that calls `admin.auth().setCustomUserClaims(uid, { role })`.
- On the mobile client, after promotion, force a token refresh: the client needs to call the Identity Toolkit REST refresh endpoint (or re-sign-in) — custom claim changes only appear in new tokens.

**Best-practice checklist for M2 role trustworthiness (from 2026 sources):**

| Practice | Required? | Why |
|----------|-----------|-----|
| Set custom claims server-side (Admin SDK) only | **Yes** | Client-set claims are forgeable; defeats the entire point. |
| Verify Firebase ID token on every backend request | **Yes** | JayTap backend currently trusts `x-firebase-uid` header without token verification (per `INTEGRATIONS.md`). This must change before roles can be trusted, regardless of whether custom claims are used. This is the highest-leverage change in M2. |
| Force token refresh after role change | **Yes** | Tokens refresh every hour naturally; a promoted user won't see their new permissions until they re-auth or explicitly refresh. Provide a "log out and back in" affordance or use a Firestore signaling document + client listener to auto-refresh. |
| Enforce role in backend rules, not UI | **Yes** | "If security rules aren't enforcing it, it doesn't exist." UI gating is UX only. |
| Keep claims coarse-grained | **Yes** | 1KB limit on claims payload. Store only `role`, not permissions arrays. |

**Anti-patterns for M2 (explicit warnings):**

- Storing `role: 'admin'` in the Mongo user document and checking it client-side. The client can read this value, but **trusting a client-assertion of the role for gating an admin-only backend action is insecure** unless the backend independently verifies a signed identity token. JayTap's current `x-firebase-uid` header pattern is not a signed identity assertion — it's just a UID string that anyone could send.
- Letting the mobile app call Identity Toolkit directly to set claims. Not possible via REST anyway, but the stronger principle is: **role changes happen on the Railway backend, never from the phone.**
- Using Firebase Security Rules as the primary enforcement. JayTap doesn't use Firestore/RTDB/Storage rules (data is in Mongo on Railway). So the enforcement layer is ALWAYS Express middleware on the Railway backend — which makes `firebase-admin` token verification mandatory for M2.

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| `react-native-keyboard-controller` | RN's `KeyboardAvoidingView` | Only if you can't take a new native dep — not the case here. For a single screen with a simple layout on old-architecture RN, RN's built-in is fine. For JayTap (many screens, deep nesting, New Arch) — no. |
| `react-native-keyboard-controller` | `react-native-keyboard-aware-scroll-view` (APSL fork `@codler/*`) | If RN < 0.65 (keyboard-controller doesn't support). Not applicable — JayTap is on 0.84. |
| `react-hook-form` | Formik | If you need a Formik-compatible library like `formik-material-ui`. No such need in JayTap. Formik is functionally stale. |
| `react-hook-form` + `zod` | `react-hook-form` + `yup` | If the backend already has a Yup schema shared with web. JayTap has no such sharing — Zod's TS-first ergonomics + `z.discriminatedUnion` make it the better pick for category-based branching. |
| Library-free role hook | `casl` / `accesscontrol` / `permissions.ts` libraries | If there are >20 distinct permissions and a permissions matrix. JayTap M2 has ~5 gated actions across 3 roles → library is overkill. |
| Firebase custom claims (M2) | Mongo `userType` field + verified ID token middleware | If you deeply don't want to touch Firebase Admin on the backend. Technically works if you ALSO add token verification to Express. But custom claims are the lower-effort, higher-assurance path given Firebase is already the auth source. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `react-native-keyboard-aware-scroll-view` (APSL original) | Last release November 2021. Uses deprecated keyboard APIs. Will never ship New Arch / RN 0.84 fixes. | `react-native-keyboard-controller`'s `KeyboardAwareScrollView`. |
| RN's built-in `KeyboardAvoidingView` | Known New Arch bugs (stale state on unmount/remount, ScrollView + iOS crash, Android 15 / targetSdk 35 breakage — JayTap targets SDK 36). | `react-native-keyboard-controller`'s `KeyboardAvoidingView` (drop-in replacement, same API). |
| Formik | Effectively unmaintained (last release 2024). 44KB gzipped vs RHF's 12KB. Re-renders on every keystroke. | `react-hook-form`. |
| `zod@4.x` | Open RN bug prevents form submission with RHF ([colinhacks/zod#4989](https://github.com/colinhacks/zod/issues/4989)). | `zod@^3.24` until the bug is resolved. Re-evaluate at M3. |
| `yup` | Not wrong, but Zod's TS inference + discriminated unions fit the category-branching shape better. | `zod@3.x`. |
| A role library (`casl`, `accesscontrol`, `role-acl`) for M1 or M2 | Three roles, <10 gated actions. Added complexity > added value. | A single `useRole()` hook + a plain switch statement. |
| Setting Firebase custom claims from the mobile app | Not possible via Identity Toolkit REST (Admin SDK only), and also a security violation if it were possible. | M2: add a Railway backend endpoint that calls `admin.auth().setCustomUserClaims()`. |
| Relying on unsigned `x-firebase-uid` header for authorization | Currently used everywhere; a malicious client can send any UID. This is the **biggest latent security issue** in the current stack, independent of roles. | M2 prerequisite: backend verifies `Authorization: Bearer <idToken>` via `admin.auth().verifyIdToken()` before trusting the UID. |

---

## Stack Patterns by Variant

**If JayTap already has `react-native-reanimated` installed (verify in `package.json`):**
- Install `react-native-keyboard-controller@1.21.6` directly. ~15 minutes install + pod install + full rebuild.

**If JayTap does NOT have `react-native-reanimated` installed (likely true — not listed in `STACK.md`):**
- Install order: `react-native-reanimated` FIRST (with Babel plugin setup as the LAST plugin in `babel.config.js`), verify with a simple animation, THEN add `react-native-keyboard-controller`. Budget 1–2 hours total including clean builds on both platforms.
- **Risk flag for roadmap:** this is the single biggest install-time risk in M1. If Reanimated causes bundler or native build issues on RN 0.84, it delays everything else.

**If the listing form migration to RHF turns out to be >2 days of work:**
- Incremental migration is fine. M1 can ship with only `CreateListingScreen` migrated to RHF + Zod (it's the form that actually needs the category branching). Other forms (Login, Signup, ForgotPassword, ResetPassword) can stay on their existing `useState` pattern until M2+.

**If backend token verification is not ready by M2:**
- M2 can still ship with Firebase custom claims set server-side, but the backend MUST verify the ID token before trusting the role claim. Without that, custom claims add no security over the current `userType` field. Flag as an M2 backend dependency.

---

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| `react-native-keyboard-controller@1.21.6` | `react-native@0.84` | Documented peer matrix caps at `0.81+`; maintainer-engaged issues confirm active 0.83.x work; `+` semantics apply. HIGH confidence; re-check when/if library ships a 0.84-specific entry. |
| `react-native-keyboard-controller@1.21.6` | `react-native-reanimated@>=3.0.0` | Hard peer requirement. 4.x works. |
| `react-native-keyboard-controller@1.21.6` | `react@19.2.3` | Supported. |
| `react-hook-form@7.73.1` | `react@19.2.3` | Supported. React 19 explicitly supported. |
| `react-hook-form@7.73.1` | `@hookform/resolvers@latest` | Current. |
| `@hookform/resolvers@latest` | `zod@^3.24` | Use v3 ONLY. |
| `zod@3.24` | `react-hook-form@7.73.1` + React Native | Works on RN. `zod@4` does NOT (open bug). |
| JayTap's Android `targetSdk 36` | `react-native-keyboard-controller@1.21.6` | Supported — 1.21.5 specifically addressed edge-to-edge / targetSdk 35+ issues. |

---

## Confidence Summary

| Recommendation | Confidence | Primary Evidence |
|----------------|------------|------------------|
| `react-native-keyboard-controller` for keyboard | **HIGH** | Context7 docs + GitHub releases + active 2026 maintenance + the alternatives are demonstrably broken or unmaintained |
| `react-hook-form` + `zod` v3 for forms | **HIGH** (library) / **HIGH** (zod v3 pin) | Recent npm version verified + RHF is actively maintained + zod v4 RN bug is open and documented |
| Library-free role gating for M1 | **HIGH** | Simple codebase, 3 roles, 2 gated fields — a library would be strictly worse |
| Firebase custom claims required for M2 trustworthy roles | **HIGH** (architectural) / **HIGH** (REST constraint) | Firebase official docs confirm Admin SDK only; JayTap's current unsigned-UID pattern verified in `INTEGRATIONS.md` |
| RN 0.84 + keyboard-controller works under New Arch | **MEDIUM-HIGH** | Docs explicitly cap at 0.81; `+` notation + active 0.83.x maintainer engagement + Reanimated-peer model (not RN-version-peer) + manual device QA is the ship bar per M1 → acceptable risk |

---

## Sources

- Context7 `/kirillzyusko/react-native-keyboard-controller` — `KeyboardAwareScrollView` API, New Architecture compatibility, `MutexLockWithTimeout` resolution path. HIGH.
- [react-native-keyboard-controller compatibility docs](https://kirillzyusko.github.io/react-native-keyboard-controller/docs/guides/compatibility) — official Fabric/Paper version matrix. HIGH.
- [react-native-keyboard-controller GitHub releases](https://github.com/kirillzyusko/react-native-keyboard-controller/releases) — 1.21.6 published 2 days before research date; 1.21.x changelog covers bridgeless + edge-to-edge fixes. HIGH.
- [keyboard-controller issue #1411](https://github.com/kirillzyusko/react-native-keyboard-controller/issues/1411) — confirms active RN 0.83.2 + Fabric maintenance. HIGH.
- [React Native 0.84 release notes](https://reactnative.dev/blog/2026/02/11/react-native-0.84) — confirms no breaking changes to `KeyboardAvoidingView` core but Hermes V1 default. HIGH.
- [RN issue #46942](https://github.com/facebook/react-native/issues/46942) — `KeyboardAvoidingView` stale-keyboard-open bug on New Arch. HIGH.
- [RN issue #49759](https://github.com/facebook/react-native/issues/49759) — `KeyboardAvoidingView` broken on Android targetSdk 35 (JayTap targets 36). HIGH.
- [RN issue #42939](https://github.com/facebook/react-native/issues/42939) — `KeyboardAvoidingView` inside `ScrollView` crash on iOS. HIGH.
- [react-native-keyboard-aware-scroll-view npm](https://www.npmjs.com/package/react-native-keyboard-aware-scroll-view) — last release November 2021. HIGH.
- [react-hook-form GitHub releases](https://github.com/react-hook-form/react-hook-form/releases) — 7.73.1 released 2026-04-18. HIGH.
- [Formisch 2026 form library comparison](https://formisch.dev/blog/react-form-library-comparison/) — confirms RHF's active-maintenance advantage over Formik; flags RN performance difference. MEDIUM.
- [colinhacks/zod issue #4989](https://github.com/colinhacks/zod/issues/4989) — zod v4 + RHF + React Native submit failure; v3 works. HIGH.
- [Firebase custom claims documentation](https://firebase.google.com/docs/auth/admin/custom-claims) — Admin SDK only, no REST endpoint; claims embedded in ID token; 1KB limit. HIGH.
- [freeCodeCamp RBAC with custom claims guide (2026)](https://www.freecodecamp.org/news/firebase-rbac-custom-claims-rules/) — 2026 best-practice pattern; token refresh approach; Firestore signaling. MEDIUM.
- JayTap codebase map — `.planning/codebase/STACK.md`, `.planning/codebase/ARCHITECTURE.md`, `.planning/codebase/INTEGRATIONS.md` — existing stack + architecture + `x-firebase-uid` header pattern. HIGH.
- JayTap project brief — `.planning/PROJECT.md` — M1/M2 scope, the hardcoded-allowlist decision, hospitality URL gating requirement. HIGH.

---
*Stack research for: RN 0.84 + New Arch + Hermes brownfield — M1 additions only*
*Researched: 2026-04-22*

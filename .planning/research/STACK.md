# Stack Research — M2 "Roles & Moderation"

**Domain:** React Native 0.84 client + Node/Express on Railway — adding three-role permission system, listing moderation lifecycle, Moderation Queue UI, admin role-management screens, and archive flows
**Researched:** 2026-04-29
**Confidence:** HIGH

---

## TL;DR

**M2 needs exactly one new third-party dependency anywhere in the codebase: `jose@^6.2.3` on the Railway backend.**

Everything else is hand-rolled on top of what already ships in v1.0.4. The RN client adds zero new packages — the existing `useRole()` / `can()` / `<Gated>` shim was deliberately built in M1 Phase 3 with this milestone in mind, and `axios` + `FlatList` + `useState` are sufficient for the queue + admin UIs. The listing-status state machine is small enough (4 states, ~6 transitions) that hand-rolling beats `xstate` on bundle size and onboarding cost.

The single high-stakes decision is the JWT verifier on Railway. The hard rule "no Firebase SDK in this repo" applies to the RN client (where adding `firebase`/`@react-native-firebase/*` previously caused issues per the user's 2026-04-29 directive); the Railway backend is a separate service and can use whatever Node JWT library is idiomatic. The recommendation below avoids `firebase-admin` on the backend too, because (a) the Railway team has already been operating without it, (b) `firebase-admin` is a heavy SDK whose only useful piece for our needs is `verifyIdToken`, and (c) `jose` does the same job in ~25 lines with zero transitive dependencies.

---

## Recommended Stack — Backend Additions (Railway/Express)

### Core: Firebase ID Token Verification

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `jose` | `^6.2.3` (latest 2026-04-27) | Verify Firebase ID-token signature against Google's published JWKS, validate `iss`/`aud`/`exp` claims | Zero runtime dependencies. `createRemoteJWKSet()` handles JWKS fetching, caching, and rotation automatically. Officially documented pattern for Firebase tokens. ESM-only — fine on Node 22 (native `require(esm)` since 22.12). Active maintainer (panva) ships security fixes within days. Used internally by `jwks-rsa@4.0.1` as of 2026 — `jose` is now the canonical primitive. |

**That is the only new backend dependency M2 strictly requires.** Optional ergonomic helpers below.

### Supporting Libraries (Backend, optional)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `express-async-errors` | `^3.1.1` | Lets `async` route handlers throw without try/catch boilerplate | If the backend doesn't already wrap async middleware. Skip if `express@5` is in use (it handles async natively). |
| `zod` | `^3.24.x` | Runtime schema validation for moderation action payloads (`POST /api/admin/listings/:id/reject {reason}`, role mutations, etc.) | Recommend if Railway team isn't already using a validator. Same major version the RN client research called out for forms, so frontend/backend can share schemas if they ever colocate. **Do NOT use zod v4** — that was the RHF/RN issue from M1 research; the backend is unaffected by that bug but pinning to v3 keeps versions consistent across repos. |

**Note:** I am intentionally **not** prescribing a Mongo ODM here. The Railway backend already has whatever it has (`mongoose`, `mongodb` driver, Prisma — unspecified in JayTap repo). M2 schema changes (`userType` enum widening to `admin|moderator|user`, listing `status` enum) should follow whatever pattern that repo uses. Coordination ticket per PROJECT.md "GATE-05 D-22 Path B" is the right place to confirm.

### What the Backend Does NOT Need

| Reject | Why |
|--------|-----|
| `firebase-admin` | Brings ~30 transitive deps and a service-account JSON requirement just to call `verifyIdToken`. `jose` does the same verification in 25 lines with zero deps. Also: per PROJECT.md "Auth split" — Firebase is identity proof only; we never read or mutate Firebase user records server-side, so 95% of `firebase-admin`'s API surface is unused. |
| `jsonwebtoken` (`^9.0.3`) + `jwks-rsa` (`^4.0.1`) | Functional, but `jsonwebtoken` carries 7 unmaintained `lodash.*` micro-deps and `jwks-rsa@4.0.1` itself depends on `jose@^6.1.3`. You'd be installing `jose` transitively anyway — cut out the middleman. |
| `passport` / `passport-firebase-jwt` | Passport's strategy abstraction is overkill for one auth scheme. Adds ceremony without solving anything. |
| `express-jwt` | Last meaningful release was 2023 line; the underlying `jsonwebtoken` has the same lodash-bloat issue. |

---

## Recommended Stack — RN Client Additions

### **None.**

The M1 Phase 3 forward-compat shim (`src/auth/useRole.ts`, `src/auth/can.ts`, `src/components/Gated.tsx`, plus the as-yet-unwired `canFromUser` service-layer guard) was designed so M2 changes the **source** of role data without touching call sites. M2's RN-side work is:

1. Swap `useRole()`'s internal source from "hardcoded email allowlist" → "value read from `user.backendProfile.userType` after backend hydration" (the field already exists on the user record per `AuthContext` and was already being read at `PropertyDetailsScreen.tsx:178` pre-M1; M1 just routed access through `useRole()`)
2. Extend `can()`'s capability table with new actions (`moderate.listings`, `archive.any.listing`, `promote.user.to.moderator`, `add.admin`)
3. Add new screens — `ModerationQueueScreen`, `RoleManagementScreen` — using the existing `axios` + `FlatList` + `useState` + `useRole` pattern (same shape as `OwnerListingsScreen`)
4. Extend `App.tsx` boolean state machine with two more flags (`isModerationQueueOpen`, `isRoleManagementOpen`)

No new packages enable any of those four. **Adding any RN dependency for M2 should require explicit justification.**

### Why specifically NOT each "obvious" candidate

| Candidate | Why Not |
|-----------|---------|
| `react-native-gesture-handler` (for swipe-to-approve/reject) | Native module install on top of the just-stabilized Fabric/reanimated/keyboard-controller stack. M1 Phase 2 retro showed how brittle the Babel-plugin order is on RN 0.84 (`react-native-worklets/plugin` LAST). Adding another peer with native build steps risks regressing the universal-keyboard work. Buttons in each row do the job; ship rows with explicit `Approve` / `Reject` / `Edit` / `Archive` buttons styled with `useTheme()` tokens. |
| `react-native-swipe-list-view` | Depends on `gesture-handler` transitively (or rolls its own `PanResponder` — older versions). Same justification as above plus a less-active maintainer. |
| `@tanstack/react-query` | Codebase has zero query-cache library today; introducing one just for the queue means rewriting all 5 services to fit it, or living with two patterns side-by-side. The queue is a list of <100 pending listings refreshed on screen focus + on action — `useState` + `useEffect` + axios call covers it. **PROJECT.md** explicitly notes "no Redux / Zustand / MobX / React Query" in the architecture; M2 is the wrong place to break that. |
| `xstate` / `@xstate/react` | The listing status machine has 4 states (`pending`, `live`, `rejected`, `archived`) and roughly 6 transitions. Hand-rolled as a pure function (`canTransition(from, to, role): boolean` in `src/utils/listingStatus.ts`) it is ~30 LOC, type-safe, unit-testable, and zero-dep. xstate would add ~30KB minified + the `@xstate/react` peer + a learning curve for a problem that doesn't have orthogonal regions, parallel states, history, or any other feature xstate exists to solve. **Revisit if** the M3+ moderation surface grows to include flag escalation paths, time-based auto-publish, or multi-step review workflows. |
| `zustand` / `redux-toolkit` | Same reasoning as react-query above — not appearing in the codebase today, no M2 requirement creates the need. |
| `react-hook-form` + `zod` (for moderation reject-reason form) | The M1 research called these out as "if forms are adopted." The reject-reason input is a single-field modal — `useState<string>` + a `length > 0` check is sufficient. Reserve RHF/zod for the day someone redoes the 9-property-type CreateListingScreen, not for a one-field dialog. |

### Existing Stack — Confirmed Sufficient for M2

| Capability | Existing piece | M2 use |
|------------|---------------|--------|
| HTTP to Railway backend | `axios@^1.13.5` (already in `src/services/`) | New endpoints: `GET /api/admin/listings/pending`, `POST /api/admin/listings/:id/{approve\|reject\|archive}`, `PATCH /api/admin/users/:id/userType`, `GET /api/me/role` |
| Auth header injection | `AuthService.getUserData() → x-firebase-uid` header pattern | Backend now also reads the `Authorization: Bearer <idToken>` header (or upgrades `x-firebase-uid` to a verified value) — RN-side change is one line in each service to attach the token already cached in AsyncStorage |
| Role-aware UI gating | `useRole()` / `can(action)` / `<Gated>` from M1 Phase 3 | Already shipped. Extend the capability table; do not change the API. |
| List rendering with pull-to-refresh | `FlatList` + `RefreshControl` (used in `HomeScreen`, `OwnerListingsScreen`, `RenterListingsScreen`) | `ModerationQueueScreen` uses the same shape |
| Confirmation modals | `DeleteListingModal` / `DeleteAccountModal` pattern | Build `RejectListingModal` (with reason input), `ArchiveListingModal`, `PromoteUserModal` from the same template — copy-paste-modify, no new lib |
| Localized strings | `useLanguage().t()` + `src/locales/{en,ru}.json` | Add ~30–50 keys for moderation/role UIs in both files (parity is mandatory per CLAUDE.md) |
| Theme tokens | `useTheme().colors` with dark/light parity | Status badges (`pending`/`live`/`rejected`/`archived`) use existing semantic tokens — add `colors.statusPending`, `colors.statusRejected` etc. to `src/theme/colors.ts` if the existing palette doesn't cover them; not a "new dependency" — that's a token addition |
| AsyncStorage | `@react-native-async-storage/async-storage@^2.2.0` | No new keys needed — role lives on `user.backendProfile.userType` which is already cached as part of `userData` |
| Icons | `lucide-react-native@^0.564.0` | Already has `Shield`, `ShieldCheck`, `UserCog`, `Archive`, `Check`, `X` — sufficient for the queue and role UIs |

---

## Installation

```bash
# === RN client (JayTap repo) ===
# Nothing to install for M2.

# === Railway backend (separate repo) ===
npm install jose@^6.2.3

# Optional, only if backend doesn't already validate request bodies:
npm install zod@^3.24
```

**Node.js compatibility:** `jose@6` is ESM-only. CommonJS `require('jose')` works on Node `^20.19.0 || ^22.12.0 || >= 23.0.0` via native `require(esm)`. JayTap engines field is `node >=22.11.0`; Railway should match or move to `>=22.12.0` to be safe with `require()` syntax. Pure ESM (`import`) works everywhere.

---

## Reference Implementation — Firebase ID Token Verification on Railway

The verifier middleware that closes M1's GATE-05 D-22 Path B accepted risk:

```typescript
// backend/src/middleware/verifyFirebaseIdToken.ts
import { jwtVerify, createRemoteJWKSet } from 'jose'
import type { RequestHandler } from 'express'

const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID! // jaytap-...
const JWKS = createRemoteJWKSet(
  // Firebase publishes its public keys as a JWK set at this URL.
  // jose handles caching + rotation; do NOT memo manually.
  new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'),
)

export const verifyFirebaseIdToken: RequestHandler = async (req, res, next) => {
  const auth = req.header('authorization') ?? ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null
  if (!token) return res.status(401).json({ error: 'missing_token' })

  try {
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`,
      audience: FIREBASE_PROJECT_ID,
      algorithms: ['RS256'],
    })
    // payload.sub === Firebase uid — same value RN sends as x-firebase-uid today
    req.firebaseUid = payload.sub as string
    req.firebaseEmail = payload.email as string | undefined
    next()
  } catch (err) {
    return res.status(401).json({ error: 'invalid_token' })
  }
}

// Then a downstream middleware looks up MongoDB:
//   const user = await UsersCollection.findOne({ firebaseUid: req.firebaseUid })
//   req.userType = user?.userType ?? 'user'
// And admin/moderator endpoints check req.userType.
```

**Note on the JWKS URL:** Firebase publishes public keys in three formats — the legacy x509 endpoint (`/robot/v1/metadata/x509/...`), an x509 endpoint under `/service_accounts/v1/metadata/x509/`, and the modern JWK endpoint at `/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com`. **Use the JWK endpoint with `createRemoteJWKSet`** — that's what jose expects natively. The x509 endpoints require a custom resolver function (`importX509`) per request, which is doable but unnecessary.

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| `jose` for token verify | `jsonwebtoken` + `jwks-rsa` | If the Railway backend is stuck on Node `<22.12` with strict CJS-only constraints AND can't pin to ESM. Otherwise jose is strictly better (zero deps, edge-runtime-ready, actively maintained, used by jwks-rsa internally). |
| `jose` | `firebase-admin` | If the backend later needs to mint custom tokens, send FCM, or read Firebase user records — none of which are M2 scope and "no firebase-admin" is the explicit project-level rule. |
| Hand-rolled status state machine | `xstate@5.31.0` | If the moderation surface expands to include flagging escalation, scheduled auto-publish, multi-stage review, or any orthogonal/parallel state. Revisit at M3 planning. |
| `useState` + `useEffect` for queue data | `@tanstack/react-query@5.100.6` | If a future milestone introduces 4+ list screens with overlapping cache concerns and needs background refetch / mutation invalidation. Don't introduce it for one screen. |
| Buttons per row | `react-native-gesture-handler` swipe actions | If user research shows the queue throughput is high enough that swipe is a real ergonomic win. Defer until that data exists. |
| Plain modal for reject reason | `react-hook-form` + `zod` | When (not if) someone tackles the 9-property-type CreateListingScreen overhaul. M2's reject-reason is one optional textarea. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `firebase` (web SDK) | Pulls in the entire Firebase JS SDK in the RN bundle. The user's 2026-04-29 directive: "firebase-SDK addition has caused issues; REST-only is non-negotiable." | Continue using `AuthService.ts` direct REST calls to Identity Toolkit. |
| `@react-native-firebase/auth` (or any `@react-native-firebase/*`) | Native iOS/Android Firebase install. Same directive applies. Would also collide with the carefully-tuned Fabric / reanimated / keyboard-controller native module set. | Same — REST only, role data lives in Mongo. |
| `firebase-admin` (on backend, despite running server-side) | Heavy SDK, service-account JSON requirement, 95% unused API surface for our needs. PROJECT.md "Auth split" treats Firebase as identity proof only. | `jose` for verify, MongoDB for role authority. |
| Firebase custom claims (as the role source) | Explicit hard constraint — MongoDB `userType` is the authority. Custom claims would split the source of truth and require backfill to mutate. | `userType` field on Mongo user record; mutate via admin UI → Railway endpoint → Mongo update. Never touch Firebase. |
| `react-navigation` | Migration explicitly out of scope per CLAUDE.md and PROJECT.md. M2 adds two new screens; both fit the existing `App.tsx` boolean state machine. | Add `isModerationQueueOpen` / `isRoleManagementOpen` flags + corresponding overlay JSX. |
| `expo-*` packages | Project is bare RN 0.84, not Expo. Mixing imposes config workflows the codebase doesn't support. | Use the bare-RN equivalent for any feature need (none arise in M2). |
| `xstate` (for M2) | Surface area too small to justify; bundle-size cost without a problem to solve. | Pure-function transition guard in `src/utils/listingStatus.ts`. |
| Redux / Zustand / MobX (for M2) | Architecture hasn't needed them through 1.0.4; M2 doesn't change that. | Local `useState` + existing Contexts. |
| `passport` / `passport-firebase-jwt` (backend) | Strategy abstraction overhead with no second auth scheme to switch between. | Plain Express middleware that calls `jose.jwtVerify`. |
| `express-jwt` (backend) | Wraps `jsonwebtoken` (lodash bloat) and the package is in maintenance mode. | jose middleware as shown above. |
| `cors` package change | Already in use on Railway presumably; M2 doesn't introduce new origins. | No change. |

---

## Stack Patterns by Variant

**If the Railway backend is on Node 22.12+ (recommended):**
- Use `jose@6` directly with either `import` or CJS `require()`.
- Skip `jwks-rsa` entirely.

**If the Railway backend is stuck on Node 22.11 (the JayTap minimum) with CJS-only legacy code:**
- Either bump to 22.12+ (preferred — JayTap RN engines field can be bumped at the same time) OR
- Use dynamic `import('jose')` from CJS handler.
- Do NOT fall back to `jsonwebtoken` + `jwks-rsa` "for compatibility" — `jwks-rsa@4` itself requires `^20.19.0 || ^22.12.0`, so you don't escape the Node bump.

**If the Railway backend later needs to mint anything (custom tokens, signed URLs, refresh):**
- jose covers signing as well (`SignJWT` class). No second library needed.
- Still no need for `firebase-admin`.

**If a future milestone introduces FCM push notifications:**
- That's the inflection point where `firebase-admin` (server) and `@react-native-firebase/messaging` (client) become unavoidable. M2 is not that milestone — defer the conversation.

---

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| `jose@6.2.3` | Node `^20.19.0 \|\| ^22.12.0 \|\| >= 23.0.0` for CJS `require()`. ESM `import` works on any maintained Node. | JayTap repo is `>=22.11.0`. **Action item:** consider bumping engines field to `>=22.12.0` to keep CJS escape hatch viable on the backend repo too. |
| `jose@6.2.3` | RN 0.84 (RN client) | Not relevant — `jose` is backend-only in this design. RN client never imports it. |
| `jwks-rsa@4.0.1` | depends on `jose@^6.1.3` | If the backend already uses `jwks-rsa`, it's already pulling jose. Migration is a one-line change. |
| `axios@^1.13.5` (RN client) | Existing | M2 reuses; no version bump needed. |
| `react-native-keyboard-controller@1.21.6` + `reanimated@4.3.0` + `worklets@0.8.1` | RN 0.84 New Arch (Fabric) | Already validated in M1 Phase 2. Do not perturb the Babel plugin order (`react-native-worklets/plugin` LAST per RETROSPECTIVE). |
| `useRole()` / `can()` / `<Gated>` shim | M1 Phase 3 capability table | M2 extends the capability table; the shim's API shape is preserved per GATE-04 forward-compat requirement. Call sites do not change. |

---

## Integration Points with Existing Code

| Existing Surface | M2 Change | Risk |
|------------------|-----------|------|
| `src/services/AuthService.ts` | Already caches Firebase ID token in AsyncStorage. Extend service helpers to attach `Authorization: Bearer <token>` header alongside (or replacing) `x-firebase-uid`. Coordinate cutover with backend. | Low — additive. Backend can accept both headers during cutover window. |
| `src/services/PropertyService.ts` | Add `getPendingListings()`, `approveListing(id)`, `rejectListing(id, reason)`, `archiveListing(id)`. Same axios pattern as existing methods. | Low. |
| `src/auth/useRole.ts` (M1 Phase 3) | Internal: read `userType` from `useAuth().user.backendProfile.userType` instead of email allowlist. **Public API unchanged.** | Low IF M1's GATE-04 forward-compat shape held — call sites untouched. |
| `src/auth/can.ts` capability table | Extend with `moderate.listings`, `archive.any.listing`, `archive.own.listing`, `promote.user.to.moderator`, `add.admin`, `view.moderation.queue`. | Low — additive. |
| `App.tsx` state machine | Add `isModerationQueueOpen` + `isRoleManagementOpen` boolean flags. Add overlay rendering in priority order. Add to Android `BackHandler` unwind list. | Medium — `App.tsx` is the load-bearing file with the bottom-nav bug history (M1 Phase 1). Add state additively, do NOT refactor neighboring flags. |
| `src/locales/{en,ru}.json` | Add ~30–50 keys for moderation UI, role UI, status badges, error messages. | Low — established pattern; CLAUDE.md mandates parity. |
| `src/theme/colors.ts` | Possibly add status-color tokens (`statusPending`, `statusRejected`, `statusLive`, `statusArchived`). | Low — additive token work. |
| Backend Mongo `users` collection | `userType` field widens from implicit `'user' \| 'admin'` to explicit enum `'user' \| 'moderator' \| 'admin'`. Existing values stay valid. | Low — backward-compatible enum widening. **Coordination required** per PROJECT.md GATE-05 D-22 Path B. |
| Backend Mongo `properties` collection | New `status` field, enum `'pending' \| 'live' \| 'rejected' \| 'archived'`. New fields: `rejectionReason?: string`, `moderatedBy?: ObjectId`, `moderatedAt?: Date`, `archivedBy?: ObjectId`, `archivedAt?: Date`. | Medium — new index needed on `status` for the queue query. **Coordination required.** |

---

## Sources

- **Context7 `/panva/jose`** — Verified `createRemoteJWKSet` + `jwtVerify` is the canonical pattern; confirmed Firebase JWT example explicitly listed in jose docs. (HIGH)
- **Context7 `/auth0/node-jsonwebtoken`** — Confirmed package still maintained but with the `lodash.*` micro-dep tail. (HIGH)
- **Context7 `/auth0/node-jwks-rsa`** — Confirmed `jwks-rsa@4.0.1` lists `jose@^6.1.3` as a dependency, which validates the "skip the middleman" recommendation. (HIGH)
- **`npm view jose`** as of 2026-04-29 — Latest is `6.2.3`, published 2026-04-27. (HIGH)
- **`npm view jsonwebtoken`** as of 2026-04-29 — Latest is `9.0.3`; engines `node >=12`; deps include `lodash.once`, `lodash.includes`, `lodash.isnumber`, `lodash.isstring`, `lodash.isboolean`, `lodash.isinteger`, `lodash.isplainobject`. (HIGH)
- **`npm view jwks-rsa`** as of 2026-04-29 — Latest is `4.0.1`; engines `^20.19.0 || ^22.12.0 || >= 23.0.0`; depends on `jose@^6.1.3`. (HIGH)
- **`npm view xstate`** — Latest is `5.31.0`; `@xstate/react@6.1.0` requires `xstate@^5.28.0` and `react@^16.8.0 || 17 || 18 || 19`. (HIGH — for the "alternative considered" entry)
- **Firebase Auth docs** — "Verify ID Tokens" page documents the third-party JWT-library path explicitly, listing the JWKS endpoints. (HIGH)
- [jose on npm](https://www.npmjs.com/package/jose)
- [jose GitHub README](https://github.com/panva/jose)
- [jose JWT Verification — How to verify Firebase JWT (Discussion #626)](https://github.com/panva/jose/discussions/626)
- [Firebase — Verify ID Tokens (third-party JWT path)](https://firebase.google.com/docs/auth/admin/verify-id-tokens)
- [Zuplo — Using jose to validate a Firebase JWT](https://zuplo.com/blog/2023/04/05/using-jose-to-validate-a-firebase-jwt) — Reference implementation, 2023; verified pattern is still current against 2026 jose@6 docs (HIGH).
- [jsonwebtoken on npm](https://www.npmjs.com/package/jsonwebtoken)
- [jwks-rsa on npm](https://www.npmjs.com/package/jwks-rsa)
- **JayTap M1 artifacts** — `.planning/codebase/STACK.md`, `.planning/codebase/ARCHITECTURE.md`, `.planning/PROJECT.md` (Current Milestone v2.0 section + Key Decisions row 157 GATE-05 D-22), `package.json@v1.0.4`. (HIGH — direct repo evidence)

---

## Confidence Notes

- **HIGH confidence** on the no-new-RN-dependencies recommendation. The M1 Phase 3 forward-compat work was explicitly built for this milestone (PROJECT.md GATE-04). Reading the existing `useRole`/`can`/`<Gated>` design confirms the API shape assumption.
- **HIGH confidence** on `jose` over alternatives. Multiple authoritative sources (jose docs, Firebase docs, jwks-rsa now depending on it) converge.
- **HIGH confidence** on the "no xstate, hand-roll the status machine" call. The state count and transition count are small and known; xstate's value props (orthogonal regions, hierarchies, history) don't apply.
- **MEDIUM confidence** on the JWKS URL choice. The jose-native JWK endpoint (`/service_accounts/v1/jwk/...`) is documented; the legacy x509 endpoint also works with `importX509`. Recommended path is JWK; fallback is x509. Either path closes GATE-05.
- **MEDIUM confidence** on the Railway backend's current state (axios/express/Mongo specifics). Recommendations are deliberately scoped to "what's strictly new for M2"; the backend team owns its own ODM and validator choices. Coordination ticket per PROJECT.md GATE-05 D-22 Path B is the right gate to confirm before Wave-0 of any backend-touching phase.

---

*Stack research for: M2 "Roles & Moderation" — JayTap v2.0*
*Researched: 2026-04-29*

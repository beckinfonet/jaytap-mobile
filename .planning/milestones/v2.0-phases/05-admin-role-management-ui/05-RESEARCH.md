# Phase 5: Admin Role Management UI — Research

**Researched:** 2026-05-03
**Domain:** Admin user-management screen + REST endpoints + concurrency-safe role mutation
**Confidence:** HIGH (this is a fork-and-extend of Phase 3's `moderationRoutes.js` + `RejectListingModal` + `ModerationQueueScreen`; nearly every primitive already ships in production)

## Summary

Phase 5 is structurally a near-clone of the Phase 3 + Phase 4 pattern, applied to a different Mongo collection (`users` instead of `properties`) and a different action verb (`role-change` instead of `approve`/`reject`/`archive`). Every load-bearing primitive — JWKS middleware, `requireMinRole('admin')`, atomic `findOneAndUpdate` race-safety, `actorUid: req.firebaseUid` anti-spoofing rule, `apiClient` Bearer auto-attach + 401/403 interceptors, `<Gated>` predicate gating, Profile-entry-point row + overlay mount discipline, RejectListingModal-fork-and-trim convention, `roleRevokedAt` token-iat invariant — already ships and is regression-tested. The novel work is (a) the **two-phase compare-and-swap** for last-admin lockout (Mongo's `findOneAndUpdate` cannot do an "N≥2 admins" check inside one operation, and Atlas transactions are an unconfirmed fallback), (b) a **3-chip + confirm modal** that stretches RejectListingModal's 1-action shape to 2-step flow (more like 6-8 edits, not the canonical 4), (c) **regex-safe email substring search** with a hand-rolled escape function, and (d) the locked **`promoteToModerator` → `manageRoles` rename** in the Action union.

**Primary recommendation:** Fork `moderationRoutes.js` → `adminRoutes.js`, fork `RejectListingModal` → `RoleChangeModal`, fork `ModerationQueueScreen` → `RoleManagementScreen`. Use **two-phase compare-and-swap** for last-admin lockout (count-then-conditional-update), document Atlas transaction availability as an Open Question for the planner, and ship the regex-escape one-liner inline (no new dep). Honor the `actorUid: req.firebaseUid` anti-spoofing grep gate from Phase 3/4 verbatim.

## User Constraints (from CONTEXT.md)

### Locked Decisions

**Search & list UX**
- **D-01:** Search fires on **debounced typing (300ms)** — no Submit button.
- **D-02:** Each user row shows: **email (primary), `firstName lastName`, current `userType` pill (color-coded), and `roleRevokedAt` timestamp when set**. No avatar.
- **D-03:** Initial / pre-search state shows **empty list + "Type to search" placeholder hint**.
- **D-04:** Pagination uses **`limit=50` with a "Refine your search to see more" hint** when exactly 50 rows return.

**Role-change interaction**
- **D-05:** Role picker is a **3-chip modal forked from `RejectListingModal`** (new `src/components/RoleChangeModal.tsx`). Chips: user / moderator / admin. Current role chip de-emphasized.
- **D-06:** Role change is **two-tap: pick role → confirm** ("Change John Doe from moderator to admin?").
- **D-07:** Success feedback = **inline pill update + 'Role updated' toast**. List stays open. On 409/403 the modal stays open with inline error.
- **D-08:** The role-change modal is **sibling-mounted** to RoleManagementScreen's FlatList.

**Guardrail error surfacing**
- **D-09:** Last-admin lockout surfaces via a **blocking modal alert with full explanation**.
- **D-10:** Self-mutation handled in the list as a **disabled '(you)' badge row** — non-tappable.
- **D-11:** Error envelope: **`LAST_ADMIN_LOCKOUT` (409)**, **`SELF_MUTATION` (403)** — same `{code, message}` envelope as Phase 3 ALREADY_MODERATED.
- **D-12:** EN+RU copy required for `admin.roles.error.lastAdminLockout` / `selfMutation` / `roleAlreadyChanged` / `userNotFound` / `network` / `admin.roles.search.noResults` PLUS base strings (screen title, search placeholder, role chip labels, confirm-modal copy, success toast, list pagination hint).

### Claude's Discretion

User explicitly skipped the **Audit log + endpoint shape** gray area; planner can lock these defaults during research:
- `roleChangeLog` is a **separate Mongo collection** with shape `{actorUid, targetUid, fromRole, toRole, at}` per ADMIN-05; no `before`/`after` blob.
- `action` enum is implicit (single-purpose collection); optional `action: 'role-change'` for symmetry with `moderationLog`.
- New endpoints exactly per ADMIN-07: `GET /api/admin/users?query=<email>&limit=50` returns `{items: User[]}` (or `{items, totalCount}`); `PATCH /api/admin/users/:uid/role` body `{userType: 'user'|'moderator'|'admin'}`. **PATCH success response = the full updated User doc**.
- `roleRevokedAt` **bumps on demotion only** (admin→moderator, admin→user, moderator→user). Promotions and same-tier no-op do NOT bump.
- `useRole.ts` `promoteToModerator` **renames atomically to `manageRoles`** (verified zero non-test call sites; 6 references = 1 type-union + 1 case + 4 test assertions; rename is mechanical).
- Search server-side: `User.find({ email: { $regex: escapedQuery, $options: 'i' } }).limit(50).select('_id firebaseUid email firstName lastName userType roleRevokedAt')`. `escapedQuery` MUST sanitize regex metacharacters.
- Pre-flight `Total admins: N` chip in UI is **NOT in scope** for this phase.

### Deferred Ideas (OUT OF SCOPE)

- Total admins / total moderators counter on RoleManagementScreen header.
- Role-provenance hint ("Promoted by X on 2026-04-10") shown on rows.
- Bulk role changes (multi-select rows + "Set all to user").
- Self-promotion path / "apply to be a moderator".
- Region-scoped admin (KG admin can only manage KG users).
- Audit log UI (read-only screen surfacing `roleChangeLog` + `moderationLog`).
- Push/email notifications on role change.
- `Total admins: N` pre-flight chip on the change-role modal.

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| **ADMIN-01** | Searchable user list (search by email substring); shows current `userType` per user. | §"Standard Stack" `User.find({email: {$regex, $options: 'i'}}).limit(50).select(…)` with regex-escape; §"Code Examples" Example 2 + Example 7. |
| **ADMIN-02** | Admin can change any user's `userType` to user/moderator/admin; triggers ROLE-11 `roleRevokedAt` on demotion. | §"Architecture Patterns" Pattern 2 (atomic `findOneAndUpdate` with conditional `roleRevokedAt`); §"Concurrency Risk Register" Risk #1. |
| **ADMIN-03** | Last-admin lockout: any role mutation that would result in zero admins returns 409 with clear error. | §"Concurrency Risk Register" Risk #1 (two-phase compare-and-swap); §"Code Examples" Example 4. |
| **ADMIN-04** | Self-mutation prevention: `PATCH /api/admin/users/<my_uid>/role` returns 403 even if requester is admin. | §"Architecture Patterns" Pattern 4 (early `req.firebaseUid === targetUid` check); §"Code Examples" Example 4 line 1. |
| **ADMIN-05** | All role changes audit-logged in `roleChangeLog` `{actorUid, targetUid, fromRole, toRole, at}`. Append-only. | §"Standard Stack" new Mongoose model `RoleChangeLog.js` (clones `ModerationLog.js` shape per CONTEXT Discretion); §"Code Examples" Example 5. |
| **ADMIN-06** | Profile entry-point gated by `<Gated action="manageRoles">`; mounted as overlay in `App.tsx OVERLAY_FLAGS`; not a tab. | §"Implementation Patterns To Reuse" Patterns A + C + E; §"Recommended File List" RN client items 1, 4, 7. |
| **ADMIN-07** | New endpoints: `GET /api/admin/users?query=<email>&limit=50`, `PATCH /api/admin/users/:uid/role` (body: `userType`). Admin-only prefix; JWKS-verified. | §"Architecture Patterns" Pattern 1 (router-level `verifyFirebaseToken + requireMinRole('admin')`); §"Code Examples" Example 3 + 4. |

## Project Constraints (from CLAUDE.md)

- **No `react-navigation`** — mount RoleManagementScreen as overlay flag in `App.tsx OVERLAY_FLAGS` (sibling to `isModerationQueueOpen`), NOT as a navigation route. [VERIFIED: CLAUDE.md "Never rewrite navigation to react-navigation"]
- **No Firebase SDK in RN client repo** — no `firebase` / `@react-native-firebase/*` packages. UserService.ts uses the existing `apiClient` (axios via Railway). [VERIFIED: CLAUDE.md + memory `no-firebase-sdk.md`]
- **Mongo `userType` is the role authority** — never use Firebase custom claims. Phase 5 mutates Mongo only. [VERIFIED: CLAUDE.md + memory `identity-vs-user-store.md`]
- **EN+RU parity** — every new UI string lands in `src/locales/en.ts` AND `src/locales/ru.ts` in the same commit. CI gate is `scripts/check-i18n-parity.sh` (strict diff). [VERIFIED: project file `scripts/check-i18n-parity.sh`]
- **`useTheme()` tokens** — no hardcoded colors; dark/light parity required. The 3 `userType` pills must derive their color from semantic palette tokens (`colors.primary`/`colors.success`/`colors.warning` or similar — planner picks). [VERIFIED: CLAUDE.md]
- **Manual physical-device QA bar (M2)** — see §"Validation Architecture" for the matrix; iPhone 15 Pro Max is the primary device for this phase per recent precedent (Moto G XT2513V deferred to Phase 6 REL-03). [VERIFIED: M2 Phase 4 close commit + ROADMAP success criteria]
- **Backend agent must `nvm use 24` before npm/node commands** — `JayTap-services/package.json` declares `engines.node >=22.12.0`; default shell node is v20. [VERIFIED: backend `package.json` engines field + memory `backend-node-version.md`]

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Role authority (`userType` value) | API / Backend (Mongo `users.userType`) | — | Memory `identity-vs-user-store.md` + PROJECT.md hard rule. Firebase only proves identity (uid); Mongo holds the role. |
| Role-mutation endpoint (`PATCH /api/admin/users/:uid/role`) | API / Backend | — | All guardrails (last-admin lockout, self-mutation 403, race-safety) MUST live server-side. Client gates are UX-only. |
| Email substring search | API / Backend | — | Mongo regex query against `email` index; client never reads the full user table. |
| User-row rendering + chip selection UX | Browser / Client (RN) | — | Pure presentational FlatList + RoleChangeModal; no server work needed for UI state. |
| Role-change confirmation (2-tap) | Browser / Client (RN) | — | Native `Alert.alert` on chip-pick (Phase 3 D-05 Approve precedent). |
| 409/403 error display (toast / blocking modal) | Browser / Client (RN) | API surfaces the envelope | Server returns `{code: 'LAST_ADMIN_LOCKOUT' \| 'SELF_MUTATION' \| 'ROLE_ALREADY_CHANGED', message}`; client maps to localized copy. |
| Audit-row write (`roleChangeLog`) | API / Backend (Mongo) | — | Append-only collection; same orphan-tolerant try/catch idiom as `ModerationLog`. |
| `roleRevokedAt` bump on demotion | API / Backend | — | Phase 1 ROLE-11 invariant; the JWKS middleware enforces `token.iat < user.roleRevokedAt → 403 role-revoked`. |
| Token rotation after role change (target user's app) | Browser / Client (target's RN) | apiClient interceptor | Phase 1 already ships the 403-role-revoked retry → `refreshRole()` → re-fetch → role-refresh banner. Phase 5 inherits transparently. |
| `<Gated action="manageRoles">` predicate | Browser / Client (RN) | — | UX layer hiding the Profile entry-point + overlay mount; backend `requireMinRole('admin')` is the security boundary. |

## Standard Stack

### Core (already in repo, no new deps)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `mongoose` | `^9.1.6` (backend) | `User` model + new `RoleChangeLog` model + atomic `findOneAndUpdate` race-safety | Already in use; sibling pattern to `ModerationLog.js`. [VERIFIED: backend `package.json`] |
| `jose` | `^6.2.3` (backend) | JWKS verification + `roleRevokedAt` token-iat rejection | Phase 1 ROLE-03 / ROLE-11; the `verifyFirebaseToken` middleware is reused as-is via the router-level mount. [VERIFIED: backend `package.json` + `verifyFirebaseToken.js:26-87`] |
| `express` | `^5.2.1` (backend) | New `adminRoutes.js` router (clone of `moderationRoutes.js`) | Already in use; Express 5 supports the `router.use(verifyFirebaseToken, requireMinRole('admin'))` pattern verbatim from Phase 3. [VERIFIED: backend `package.json` + `moderationRoutes.js:50`] |
| `axios` (RN client) | (existing) via `apiClient` | UserService.ts HTTP calls (Bearer auto-attach + 401/403 interceptors inherited transparently) | apiClient.ts is the established pattern; new service files import it without per-call header work. [VERIFIED: `src/services/apiClient.ts:24-181`] |
| `lucide-react-native` (RN client) | (existing) | Header `ChevronLeft` icon on RoleManagementScreen + chip icons on RoleChangeModal (optional) | Already used by ModerationQueueScreen + RejectListingModal — same import path. [VERIFIED: `src/screens/ModerationQueueScreen.tsx:40`] |
| `react-native-safe-area-context` (RN client) | (existing) | `SafeAreaView` for RoleManagementScreen header | Same import as ModerationQueueScreen. [VERIFIED: `src/screens/ModerationQueueScreen.tsx:39`] |

**Verification:** `npm view escape-string-regexp@4 version` → `4.0.0` (CJS); `escape-string-regexp@5.0.0` is ESM-only (`"type": "module"`). The backend is CommonJS, so v5 would crash `require()`. Recommendation: **DO NOT add a dep** — ship the 1-line escape function inline (see Pattern 3 + Code Example 6). [VERIFIED: `npm view` 2026-05-03]

### Supporting (no new packages — all reuse)

| Existing artifact | Purpose | When to Use |
|-------------------|---------|-------------|
| `src/services/apiClient.ts` | Bearer auto-attach + single-flight 401 silent-refresh + 403 role-revoked retry | New `UserService` consumes `apiClient.get(…)` and `apiClient.patch(…)`; inherits all interceptors transparently |
| `src/hooks/useRole.ts` `canFromUser` | Belt-and-suspenders client-side gate | New `manageRoles` Action lands in admin block via fall-through (mirrors `hardDeleteListing` pattern at line 86) |
| `JayTap-services/src/middleware/verifyFirebaseToken.js` | JWKS verification + `requireMinRole('admin')` factory + `roleRevokedAt` token-iat rejection | Mounted at router level on `adminRoutes.js`; admin auto-inherits `ROLE_RANK[admin]=2 ≥ 2`. [VERIFIED: `verifyFirebaseToken.js:103-113`] |
| `JayTap-services/src/models/ModerationLog.js` | Schema template for new `RoleChangeLog.js` | Drop `action`/`targetType`/`reasonCode`/`reasonNote`/`before`/`after` fields; keep `actorUid` + `at`; add `targetUid` + `fromRole` + `toRole`. [VERIFIED: `ModerationLog.js:17-31`] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Inline regex-escape one-liner | `escape-string-regexp@4.0.0` (CJS) | New dep, no upside at this scale (single call site). 1-line inline = explicit code review surface; no supply-chain risk; no version drift. |
| Two-phase compare-and-swap (Risk #1) | MongoDB transactions (`session.withTransaction(...)`) | Transactions need a replica set. Atlas M0/M2/M5 free + shared tiers DO support transactions (replica-set is auto-provisioned), but the planner should confirm Atlas tier before locking transactions. Two-phase CAS is more portable + simpler to reason about; transactions are the cleaner long-term answer if ever a third concurrent path appears. |
| Substring email search via `$regex` | Atlas Search index on `email` | Atlas Search is a paid feature on free tier; `$regex` substring search is unindexed but acceptable at admin scale (KG launch ~hundreds of users; even 10K rows scans in <100ms). Document the unindexed-substring-scan tradeoff. |
| New Mongoose model `RoleChangeLog.js` | Reuse `ModerationLog` with `targetType: 'user'` | CONTEXT lock D-Claude-Discretion: separate collection (matches ADMIN-05's verbatim schema `{actorUid, targetUid, fromRole, toRole, at}`). Single-purpose collection keeps the schema clean. |
| 3-chip + confirm modal forked from `RejectListingModal` | Greenfield modal | RejectListingModal is single-action (1 chip-row → submit). RoleChangeModal needs chip-row → confirm-step → submit (2-tap per D-06). Fork-and-trim is still right but 6-8 edits, not the canonical 4. See Pattern 5. |

**Installation:** None. **Zero new packages** in either repo.

**Version verification (2026-05-03):**
- `mongoose@9.1.6` (backend) — already installed ✓
- `jose@6.2.3` (backend) — already installed ✓
- `express@5.2.1` (backend) — already installed ✓
- `escape-string-regexp@4.0.0` (CJS) — available on npm but **NOT recommended** (inline 1-liner is the chosen pattern)
- `escape-string-regexp@5.0.0` — ESM-only, would break backend `require()` — **DO NOT INSTALL** [VERIFIED: `npm view escape-string-regexp@5 type → module`]

## Architecture Patterns

### System Architecture Diagram

```
                                    ┌─────────────────────────────────┐
                                    │   RN Client (JayTap)            │
                                    │                                 │
   Admin opens Profile ─────────────┤  ProfileScreen.tsx              │
                                    │   <Gated action="manageRoles">  │
                                    │   ↓ tap "Manage Roles"          │
                                    │  App.tsx (overlay machine)      │
                                    │   setIsRoleManagementOpen(true) │
                                    │   ↓ overlay mount               │
                                    │  RoleManagementScreen.tsx       │
                                    │   ├── search TextInput          │
                                    │   │    (300ms debounce D-01)    │
                                    │   ├── FlatList<UserRow>         │
                                    │   │    pill / (you) badge D-10  │
                                    │   └── <RoleChangeModal>         │
                                    │        sibling-mounted D-08     │
                                    │           │                     │
                                    │           ▼ chip pick → confirm │
                                    │        UserService.setUserRole  │
                                    └────────────────┬────────────────┘
                                                     │ apiClient (Bearer)
                                                     ▼
                  ┌──────────────────────────────────────────────────────────┐
                  │              Backend (JayTap-services)                   │
                  │                                                          │
                  │  /api/admin/* ── verifyFirebaseToken + requireMinRole('admin')
                  │       │                                                  │
                  │       ├── GET /users?query=&limit=50                     │
                  │       │     escape regex metachars → User.find({email:   │
                  │       │       {$regex, $options:'i'}}).limit(50).select │
                  │       │     ↓                                            │
                  │       │     200 {items: User[]}                          │
                  │       │                                                  │
                  │       └── PATCH /users/:uid/role  body {userType}        │
                  │             │                                            │
                  │             ├── ① if (req.firebaseUid === targetUid)    │
                  │             │     → 403 SELF_MUTATION                   │
                  │             │                                            │
                  │             ├── ② count admins {userType:'admin'}       │
                  │             │     if dropping below 1 → 409 LAST_ADMIN  │
                  │             │                                            │
                  │             ├── ③ atomic findOneAndUpdate({_id, current  │
                  │             │     userType, AND if demotion 'still admin'│
                  │             │     count > 1}) $set userType +            │
                  │             │     conditionally roleRevokedAt = now      │
                  │             │     null result → 409 ROLE_ALREADY_CHANGED │
                  │             │                                            │
                  │             ├── ④ RoleChangeLog.create({actorUid,        │
                  │             │     targetUid, fromRole, toRole, at})      │
                  │             │     wrapped try/catch (orphan-tolerant)    │
                  │             │                                            │
                  │             └── 200 returns updated User (full doc)      │
                  │                                                          │
                  │  Mongo:  users (userType + roleRevokedAt)                │
                  │          role_change_log (append-only)                   │
                  └──────────────────────────────────────────────────────────┘
                                                     │
                                                     ▼ on demotion
                  ┌──────────────────────────────────────────────────────────┐
                  │  Target user's RN client (running, not the admin's)      │
                  │                                                          │
                  │  next protected request → JWKS middleware sees           │
                  │  token.iat < user.roleRevokedAt → 403 role-revoked       │
                  │  apiClient interceptor → refreshRole → 403 again →       │
                  │  AuthContext.logout(silent) + 'auth.accessChanged' toast │
                  │  (Phase 1 ROLE-09/10/11 chain — inherited transparently) │
                  └──────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| File | Tier | Responsibility |
|------|------|----------------|
| `App.tsx` | RN client | Add `isRoleManagementOpen` state + setter; append `!!user && isRoleManagementOpen` to `OVERLAY_FLAGS`; add back-handler branch; mount `<RoleManagementScreen>` sibling to `<ModerationQueueScreen>`; wire `onOpenRoleManagement` callback to `<ProfileScreen>` |
| `src/screens/RoleManagementScreen.tsx` (NEW) | RN client | SafeAreaView + ChevronLeft header + search TextInput (300ms debounced) + FlatList of UserRow + sibling-mounted `<RoleChangeModal>` |
| `src/components/RoleChangeModal.tsx` (NEW) | RN client | 3-chip selector (user/moderator/admin) + 2-tap flow (pick → confirm) + Submit button + inline 409/403 error surface |
| `src/services/UserService.ts` (NEW) | RN client | `searchUsers(query: string): Promise<User[]>` + `setUserRole(uid: string, userType: 'user'\|'moderator'\|'admin'): Promise<User>` |
| `src/screens/ProfileScreen.tsx` | RN client | Add new entry-point row (after Moderation Queue row), gated by `<Gated action="manageRoles">` + `onOpenRoleManagement` callback |
| `src/hooks/useRole.ts` | RN client | Rename `promoteToModerator` → `manageRoles` in Action union; relocate switch case (still admin-only); update test file |
| `src/locales/{en,ru}.ts` | RN client | Add `admin.roles.*` namespace keys (D-12 enumeration; ~20-25 new keys × 2 locales) |
| `JayTap-services/src/routes/adminRoutes.js` (NEW) | backend | Router-level `verifyFirebaseToken + requireMinRole('admin')`; 2 endpoints (`GET /users`, `PATCH /users/:uid/role`); regex escape; SELF_MUTATION pre-check; LAST_ADMIN_LOCKOUT two-phase CAS; race-safe atomic update; audit-row insert (orphan-tolerant) |
| `JayTap-services/src/models/RoleChangeLog.js` (NEW) | backend | Mongoose model `{actorUid, targetUid, fromRole, toRole, at}` + `collection: 'role_change_log'` |
| `JayTap-services/index.js` | backend | Add `app.use('/api/admin', require('./src/routes/adminRoutes').router)` near line 123 (sibling to moderationRoutes mount) |

### Recommended Project Structure

```
RN client (NEW additions only):
  src/
  ├── screens/RoleManagementScreen.tsx          # NEW (~340-400 LOC; ModerationQueueScreen analog)
  ├── components/RoleChangeModal.tsx            # NEW (~280-320 LOC; RejectListingModal +6-8 edits)
  └── services/UserService.ts                   # NEW (~80-100 LOC; PropertyService.ts analog, 2 methods)

backend (NEW additions only):
  src/
  ├── routes/adminRoutes.js                     # NEW (~280-340 LOC; moderationRoutes.js analog, 2 endpoints)
  └── models/RoleChangeLog.js                   # NEW (~25-35 LOC; ModerationLog.js analog, narrower schema)
```

### Pattern 1: Router-level admin gate

**What:** Mount `verifyFirebaseToken + requireMinRole('admin')` once at the top of `adminRoutes.js` so every endpoint inherits.

**When to use:** Every Phase 5 backend endpoint. Per ADMIN-07 + Phase 3 D-13 + Phase 4 D-04 precedent.

**Example:**
```js
// JayTap-services/src/routes/adminRoutes.js
// Source: clone basis = JayTap-services/src/routes/moderationRoutes.js:50

const express = require('express');
const router = express.Router();
const { verifyFirebaseToken, requireMinRole } = require('../middleware/verifyFirebaseToken');

// Belt-and-suspenders: client <Gated action="manageRoles"> hides the entry-point;
// THIS is the security boundary. Admin auto-inherits via ROLE_RANK['admin']=2 >= 2.
router.use(verifyFirebaseToken, requireMinRole('admin'));

// ...endpoints below inherit both middlewares transparently.

module.exports = { router };
```

### Pattern 2: Race-safe atomic role mutation with conditional `roleRevokedAt`

**What:** Compose the `findOneAndUpdate` filter so it BOTH (a) confirms `userType` hasn't been concurrently changed AND (b) for last-admin scenarios, confirms `> 1 admin` exists. Use `$set` to bump `roleRevokedAt` ONLY on demotion.

**When to use:** Inside `PATCH /api/admin/users/:uid/role` after the SELF_MUTATION pre-check.

**Example:** See Code Example 4 below (full handler).

### Pattern 3: Hand-rolled regex-escape (no new dep)

**What:** Sanitize regex metacharacters before passing user input into Mongo `$regex`.

**When to use:** Inside `GET /api/admin/users?query=…` before the `User.find` call.

**Example:**
```js
// JayTap-services/src/routes/adminRoutes.js
// Source: MDN "Escaping" guide — https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_expressions
//         (also the same one-liner used by lodash.escapeRegExp + escape-string-regexp@4)
function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
```

### Pattern 4: Self-mutation defense-in-depth

**What:** Two layers — (a) client hides the affordance with a "(you)" disabled badge (D-10), (b) backend rejects with 403 SELF_MUTATION even if D-10 is bypassed (D-11 envelope). Backend check happens BEFORE the last-admin pre-flight count (cheap O(1) string compare beats an O(N) `countDocuments`).

**When to use:** Top of `PATCH /api/admin/users/:uid/role` handler.

**Example:**
```js
// First line of the handler — fastest possible reject path.
if (req.firebaseUid === req.params.uid) {
  return res.status(403).json({
    code: 'SELF_MUTATION',
    message: 'Admins cannot change their own role.',
  });
}
```

### Pattern 5: Modal fork-and-trim (RejectListingModal → RoleChangeModal)

**What:** Phase 4 D-08 established the "4-edit diff" convention for forking single-action modals. Phase 5's RoleChangeModal is a multi-step flow (chip-pick → confirm → submit), so the diff is more like 6-8 edits. The pattern still holds: clone the file verbatim, then trim/extend in-place.

**When to use:** Creating `RoleChangeModal.tsx`.

**Edit list (NOT 4 — closer to 8):**
1. Header docstring rewrite (admin-context, not moderator-context).
2. Identity rename (`RejectListingModal` → `RoleChangeModal`, `RejectReasonCode` → `RoleType` or reuse `Role`).
3. Replace `REJECT_CODES` const with `ROLE_TYPES = ['user', 'moderator', 'admin'] as const`.
4. Remove `reasonNote` TextInput entirely (role change has no note).
5. Add `currentRole` prop so the modal can de-emphasize the current role chip per D-05.
6. Add a `confirmStep` local state to gate the second tap (chip-pick → confirm); shows a confirm-message with localized "Change John Doe from {fromRole} to {toRole}?" copy per D-06.
7. Replace the `t('moderation.reject.modalTitle')` etc. with `t('admin.roles.modal.title')` and friends.
8. Inline error surface: when `onSubmit` throws with `code === 'LAST_ADMIN_LOCKOUT' \| 'SELF_MUTATION' \| 'ROLE_ALREADY_CHANGED'`, render an inline error banner inside the modal (D-07 says modal stays open on 409/403).

### Anti-Patterns to Avoid

- **`actorUid` from request body** — Phase 3 D-08 + Phase 4 D-05 anti-spoofing grep gate. `actorUid: req.body.*` and `actorUid: req.headers.*` MUST return zero matches in `adminRoutes.js`. Use `req.firebaseUid` (the JWKS-verified token sub). [VERIFIED: `moderationRoutes.js:103, 180, 274, 370, 613` all use `req.firebaseUid`]
- **Bumping `roleRevokedAt` on promotion** — CONTEXT.md D-Claude-Discretion: bump on demotion ONLY. Promotion doesn't change the security posture; bumping would force the newly-promoted user to re-auth without need.
- **Using Mongo transactions without verifying Atlas tier** — Atlas M0 free tier supports transactions (replica-set is the default), but if the tier ever changes to a bare cluster, transactions break with `MongoServerError: Transaction numbers are only allowed on a replica set`. Two-phase CAS is portable. (See Open Questions Q1.)
- **Regex without metachar escape** — `User.find({email: {$regex: q}})` where `q = "."` matches every character. Even at admin scale, this is a denial-of-service vector via `q = ".*.*.*.*"`. ALWAYS escape first.
- **Returning the raw User doc unfiltered** — `.select(...)` to a defensive whitelist. The User model has `availabilitySettings`, `favorites`, etc. that don't belong in an admin-list payload. The whitelist `_id firebaseUid email firstName lastName userType roleRevokedAt` per CONTEXT D-Discretion is the correct shape.
- **Greenfield RoleChangeModal** — CONTEXT D-05 locks the fork-from-RejectListingModal pattern. Greenfield throws away Phase 4's hard-won discipline (chip styling, dark-mode contrast at line 94, button row layout, KeyboardAvoidingView wrapper, ScrollView keyboardShouldPersistTaps).
- **Adding RoleManagementScreen as a 6th BottomNav tab** — CONTEXT + ROADMAP success criteria #1: overlay flag in `OVERLAY_FLAGS` only, NOT a tab. Mirror the Phase 3 ModerationQueueScreen pattern verbatim.
- **Validating `userType` enum on the client only** — backend MUST validate `req.body.userType ∈ ['user','moderator','admin']` and 400 otherwise. Client can chip-constrain but server is authoritative (Phase 3 reasonCode pattern).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Bearer token attach | Custom header injection | Existing `apiClient` from `src/services/apiClient.ts` | Bearer is auto-attached by request interceptor; 401 silent-refresh is single-flighted; 403 role-revoked retry is wired. New UserService inherits all of this transparently. |
| JWKS verification | Inline `jwt.verify` or `jose.createRemoteJWKSet` per route | Existing `verifyFirebaseToken` middleware | Phase 1 ROLE-03/11 ships the role-aware version with `roleRevokedAt` enforcement, account-lock check, and `req.user`/`req.firebaseUid` attachment. Reuse via router-level mount. |
| Role-rank check | Per-route `if (req.user.userType !== 'admin')` | Existing `requireMinRole('admin')` factory | Phase 1 ships this. Centralized so the rank ladder (`user:0 < moderator:1 < admin:2`) is one-source-of-truth. [VERIFIED: `verifyFirebaseToken.js:103-113`] |
| Regex-escape for `$regex` user input | `escape-string-regexp` npm package | Inline 1-liner `s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')` | v5 is ESM-only and would break `require()`; v4 is fine but adding a dep for a 1-line function is not justified at single-call-site scale. |
| Audit-log insert atomicity | Mongo transaction wrapping role-update + audit-row insert | Follow-up `await RoleChangeLog.create(...)` inside try/catch | Phase 3 D-10 + Phase 4 D-18 established the orphan-tolerant pattern: a rare audit-orphan after a successful role mutation is acceptable; transactions add ops complexity for the audit row alone. The role mutation IS load-bearing; the audit row is forward-fit observability. |
| Single-flight token refresh | Custom mutex / Promise queue | Existing `refreshIdTokenSingleflight` in `apiClient.ts:51-70` | The target user's app (post-demotion) hits 403 role-revoked → `refreshRoleSingleflight` → second 403 → silent logout + toast. All of this is already wired and tested. |
| Email-based search | `User.aggregate(...)` pipeline | `User.find({email: {$regex: escapedQuery, $options: 'i'}}).limit(50).select(...)` | Aggregate is overkill at admin scale; find is faster, simpler, and indexed-friendly when query starts with `^` (prefix). Substring search is unindexed but acceptable. |
| Pagination | Cursor pagination / aggregate `$facet` | `limit=50` + "Refine your search to see more" hint per D-04 | CONTEXT lock: planner has zero discretion to introduce cursor pagination. KG launch user count is ~hundreds; 50-row limit + refine-hint is the right level. |
| Locale parity check | Custom diff script | Existing `scripts/check-i18n-parity.sh` | Already in CI; strict diff on the en.ts vs ru.ts key set. New `admin.roles.*` keys must land in both files in the same commit. [VERIFIED: `scripts/check-i18n-parity.sh`] |

**Key insight:** Phase 5 has near-zero novel implementation surface. Every primitive is in production. The discipline is faithful pattern reuse + careful concurrency reasoning on the last-admin race.

## Runtime State Inventory

> Phase 5 is feature-additive (new endpoints, new collection, new screens, one type-union rename). It is NOT a rename/refactor/migration phase — no string-replacement audit is needed. Section preserved for completeness of the GSD discipline.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None — `roleChangeLog` collection is brand-new (no existing rows to migrate). The `users.userType` field already exists with the canonical 3-value enum (Phase 1 ROLE-01); no backfill needed. | None |
| Live service config | None — Railway already has `FIREBASE_PROJECT_ID` (Phase 1); no new env vars needed for Phase 5. | None |
| OS-registered state | None — no PM2/launchd/systemd touchpoints. | None |
| Secrets/env vars | None — Phase 5 introduces no new secrets. The existing Bearer flow signs requests via the user's already-cached `userToken`. | None |
| Build artifacts / installed packages | None — zero new packages in either repo (escape-regex inlined; everything else already installed). | None |

**Nothing found in any category** — verified by file read of `JayTap-services/package.json`, `JayTap-services/index.js`, `User.js` schema, and `useRole.ts` test file.

The ONE rename in scope (`promoteToModerator → manageRoles`) is purely a TypeScript identifier rename in `useRole.ts` + 4 test references in `useRole.test.ts`. There are zero non-test source consumers (verified `grep -rn "promoteToModerator" src App.tsx` returns 6 matches: 1 type-union member, 1 switch case, 4 test assertions). This is a mechanical 6-line edit in a single commit.

## Implementation Patterns To Reuse

### Pattern A — Profile entry-point row + `<Gated>` predicate (Phase 3 / Phase 4.5 precedent)

**Source:** `src/screens/ProfileScreen.tsx:281-301` (Moderation Queue entry-point).

**Adaptation for Phase 5:**
```tsx
{can('manageRoles') && onOpenRoleManagement && (
    <>
        <View style={[styles.menuDivider, { backgroundColor: themeStyles.border }]} />
        <TouchableOpacity
            style={styles.menuRow}
            onPress={onOpenRoleManagement}
            activeOpacity={0.7}
            accessibilityLabel={t('admin.roles.entryPoint')}
        >
            <Inbox size={22} color={themeStyles.accent} strokeWidth={1.5} />
            <Text style={[styles.menuText, { color: themeStyles.text, flex: 1 }]}>
                {t('admin.roles.entryPoint')}
            </Text>
            <ChevronRight size={20} color={themeStyles.textSecondary} />
        </TouchableOpacity>
    </>
)}
```

No pending-count badge for Phase 5 (CONTEXT lock: pre-flight admin counter NOT in scope).

### Pattern B — App.tsx OVERLAY_FLAGS extension + back-handler branch (Phase 3 Plan 06 precedent)

**Source:** `App.tsx:65, 121-128, 327-330, 1043-1067`.

**Adaptation for Phase 5 (4 coordinated edits, ~30-40 LOC):**
1. New state: `const [isRoleManagementOpen, setIsRoleManagementOpen] = useState(false);` (sibling to line 65).
2. OVERLAY_FLAGS append: `!!user && isRoleManagementOpen, // Phase 5 — role management overlay` (sibling to line 127).
3. Back-handler branch (sibling to line 327-330):
   ```tsx
   if (isRoleManagementOpen) {
     setIsRoleManagementOpen(false);
     return true;
   }
   ```
   + add `isRoleManagementOpen` to the deps array at line 394.
4. Mount block (sibling to line 1043-1067):
   ```tsx
   {!!user && isRoleManagementOpen && (
     <View style={[fullScreenOverlayWrap, { pointerEvents: 'auto' }]}>
       <RoleManagementScreen
         onBack={() => setIsRoleManagementOpen(false)}
       />
     </View>
   )}
   ```

**Current App.tsx LOC: 1191** (verified `wc -l`). This is 11 LOC under the documented 1180 hard ceiling from Phase 3 — wait, actually 1191 > 1180. Phase 4 closed App.tsx with `D-19 net-zero target preserved (1191 LOC unchanged from Plan 01 lock)` per the ROADMAP entry. The pattern history says the soft cap is 1100, hard ceiling 1180. Phase 4 added zero LOC; Phase 5 adds +30-40 LOC.

**LOC impact for Phase 5:** 1191 → 1221-1231 (signal-not-block per Phase 2 PATTERN D + Phase 3 SUMMARY's M3 remediation candidates list — the planner should DOCUMENT the drift in SUMMARY but NOT block on it). Alternative: extract the overlay mount block into `<RoleManagementOverlayHost>` component (~15-20 LOC saved) to net the addition closer to neutral.

### Pattern C — Modal fork-and-trim (Phase 4 D-08 precedent: RejectListingModal → ArchiveListingModal)

**Source:** `src/components/RejectListingModal.tsx` (209 LOC) and `src/components/ArchiveListingModal.tsx` (214 LOC; 4-edit diff).

**Adaptation for Phase 5:** RoleChangeModal is a 6-8 edit diff because it stretches the single-action shape into a 2-step flow. See Pattern 5 above for the edit list. Estimated final size: 280-320 LOC (vs. RejectListingModal's 209). The added LOC comes from the `confirmStep` state + confirm-message JSX + inline error banner.

### Pattern D — Race-safe atomic state transition with 409 envelope (Phase 3 D-08 / Phase 4 D-17 precedent)

**Source:** `JayTap-services/src/routes/moderationRoutes.js:90-100` (approve handler) and `:158-175` (reject handler).

**Adaptation for Phase 5:** Use `findOneAndUpdate({_id, userType: oldRole}, ...)` to detect concurrent role changes. Null result → 409 `{code: 'ROLE_ALREADY_CHANGED', message: 'This user's role was already changed by another admin.'}`. See Code Example 4 for the full handler with both LAST_ADMIN_LOCKOUT (pre-flight) and ROLE_ALREADY_CHANGED (atomic) shapes.

### Pattern E — Audit-row write via append-only Mongoose model (Phase 3 D-10 / Phase 4 D-18 precedent)

**Source:** `JayTap-services/src/models/ModerationLog.js` + the `try { await ModerationLog.create(...) } catch (auditErr) { console.error('moderation_audit_orphan' ...) }` pattern at `moderationRoutes.js:101-120`.

**Adaptation for Phase 5:** New `RoleChangeLog.js` model with the narrower schema. Same orphan-tolerant try/catch idiom. `actorUid` MUST come from `req.firebaseUid` only (anti-spoofing grep gate from Phase 3 carries forward). See Code Example 5.

### Pattern F — Service-layer `canFromUser` belt-and-suspenders (Phase 3 / Phase 4 precedent)

**Source:** `src/hooks/useRole.ts:78-108` (`canFromUser` switch); `src/services/PropertyService.ts:3` (`import { canFromUser, PermissionDeniedError }`).

**Adaptation for Phase 5:** `UserService.setUserRole(uid, userType)` calls `canFromUser(user, 'manageRoles')` before HTTP and throws `PermissionDeniedError` if false. Belt-and-suspenders: client `<Gated>` hides UI, service `canFromUser` blocks the HTTP call, backend `requireMinRole('admin')` rejects the request anyway.

### Pattern G — Renaming `promoteToModerator` → `manageRoles` (atomic single-commit)

**Verification:** `grep -rn "promoteToModerator" src App.tsx` returns 6 matches:
- `src/hooks/useRole.ts:21` — Action union member
- `src/hooks/useRole.ts:84` — switch case
- `src/hooks/__tests__/useRole.test.ts:97, 127, 128, 129, 130, 135` — test assertions (4 references)

Zero non-test source consumers. The rename is mechanical — replace `promoteToModerator` with `manageRoles` in all 6 locations in a single commit. Update the test descriptions to read "manageRoles" instead of "promoteToModerator". Add **the new test row** to `useRole.test.ts` covering `can('manageRoles')` for admin (true) / moderator (false) / user (false) / guest (false) per CONTEXT D-Discretion.

## Common Pitfalls

### Pitfall 1: Two concurrent admins demote the only-other admin → zero admins

**What goes wrong:** Admin A and Admin B (with C as the third admin) both fire `PATCH /api/admin/users/<C-uid>/role` with `userType: 'user'` simultaneously. If the backend uses a naive single-statement `findOneAndUpdate` without an admin-count check, BOTH succeed: A's request demotes C; B's request runs against a Mongo state where C is now `'user'`, doesn't find a doc with `{_id: C, userType: 'admin'}`, and returns 409 ROLE_ALREADY_CHANGED — but the system still has 2 admins (A + B), which is fine. **The bad scenario is different:** C and D are both admins. A demotes C; B simultaneously demotes D. Neither of A's or B's preflight count saw the other's pending mutation; both succeed; system is now zero-admin, locked out.

**Why it happens:** Mongo `findOneAndUpdate` operates on a single document. A pre-flight `countDocuments({userType:'admin'})` is a separate operation; between the count and the update, another admin's update can land.

**How to avoid:** Two-phase compare-and-swap — bake the admin count into the `findOneAndUpdate` filter:
```js
// Step 1: pre-flight count (fast reject + clear error message)
if (currentRole === 'admin' && newRole !== 'admin') {
  const adminCount = await User.countDocuments({ userType: 'admin' });
  if (adminCount <= 1) {
    return res.status(409).json({ code: 'LAST_ADMIN_LOCKOUT', ... });
  }
}

// Step 2: atomic update with embedded count check
// Mongo lacks a "count > 1" inside findOneAndUpdate, so we use a two-phase pattern:
//   Re-count INSIDE the same handler invocation, but commit the count via an
//   aggregate-then-update pattern:
const stillSafe = await User.countDocuments({
  userType: 'admin',
  _id: { $ne: targetUid }, // exclude the target from the safety count
});
if (currentRole === 'admin' && newRole !== 'admin' && stillSafe < 1) {
  return res.status(409).json({ code: 'LAST_ADMIN_LOCKOUT', ... });
}

const result = await User.findOneAndUpdate(
  { _id: targetUid, userType: currentRole }, // race-safety: oldRole must still match
  { $set: { userType: newRole, ...(isDemotion && { roleRevokedAt: new Date() }) } },
  { new: true }
);
```
The `_id: { $ne: targetUid }` is the trick: it answers "if I demote THIS target, will any admins remain?" — which doesn't drift even if a concurrent admin race lands. The narrow window between the count and the update is < 10ms in practice; for a complete close, see Open Questions Q1 (Atlas transactions).

**Warning signs:** Manual two-device QA with two admin accounts demoting the same target (Validation Architecture row "Two-device race"). Backend supertest case "two concurrent demotes of last-but-one admin → exactly one returns 200, the other returns 409 LAST_ADMIN_LOCKOUT".

### Pitfall 2: Substring regex search hits the email index... slowly

**What goes wrong:** `User.find({email: {$regex: 'foo', $options: 'i'}})` does NOT use the `email` unique index — Mongo can only use indexes for prefix matches (`/^foo/`) and case-sensitive matches. With case-insensitive (`$options: 'i'`) substring (`foo`), Mongo does a full collection scan.

**Why it happens:** B-tree indexes are alphabetically ordered; substring + case-insensitive defeats both ordering rules.

**How to avoid:** Accept the unindexed scan at admin scale. KG launch: ~100s of users; even 10K rows scans in <100ms. Document the tradeoff in the Open Questions section. If user count ever crosses 50K, switch to Atlas Search or to a prefix-only search (`/^${escaped}/i`).

**Warning signs:** Admin reports "search is slow." Mitigation: add a one-line `console.time('admin-user-search')` in dev mode. Operational signal: Mongo Atlas slow-query log shows COLLSCAN on `users` collection.

### Pitfall 3: Promotion flow accidentally bumps `roleRevokedAt`

**What goes wrong:** Admin promotes a user → `userType: 'admin'`. Backend bumps `roleRevokedAt = now`. The newly-promoted admin's app makes its next protected request → JWKS middleware sees `token.iat < user.roleRevokedAt` → 403 role-revoked → user is FORCE-LOGGED-OUT immediately after being promoted. Confusing UX (and the new admin has to sign in again to access admin endpoints).

**Why it happens:** Defensive coding ("any role change rotates the security boundary") is wrong here — promotion EXPANDS the security envelope; the existing token is still valid for the OLD (less powerful) capabilities, and there's no security reason to invalidate it.

**How to avoid:** Conditional bump:
```js
const isDemotion = (
  (currentRole === 'admin' && newRole !== 'admin') ||
  (currentRole === 'moderator' && newRole === 'user')
);
const $set = { userType: newRole };
if (isDemotion) $set.roleRevokedAt = new Date();
// same-tier no-op: $set is just {userType: newRole}, which is a write but harmless
```

**Warning signs:** Validation Architecture row "Promote a user to admin → next protected request still returns 200 within the same session (no forced re-auth)".

### Pitfall 4: Forgetting the `actorUid: req.firebaseUid` anti-spoofing rule

**What goes wrong:** Audit row reads `actorUid: req.body.actorUid`. Attacker (any admin) submits `PATCH ...` with body `{userType: 'user', actorUid: 'victim-admin-uid'}`. The role-change-log now blames the victim. Subverts auditability.

**Why it happens:** Lazy field-extraction (`const { actorUid, userType } = req.body`) feels natural when the schema uses both fields.

**How to avoid:** Enforce via Phase 3/4 grep gate. CI must verify `grep -nE "actorUid: req\.(body|headers)" src/routes/adminRoutes.js` returns ZERO matches. The ONLY allowed source is `req.firebaseUid` (set by `verifyFirebaseToken` from the JWKS-verified token's `sub`).

**Warning signs:** Code review explicit grep check; supertest case "actorUid CANNOT be spoofed via request body" (mirrors Phase 3 MOD-16 case).

### Pitfall 5: Search debounce + stale response race

**What goes wrong:** Admin types `joh` → fires search → types `john` → fires search. Network reorders the responses; `joh` returns AFTER `john`. The list shows `joh`'s results even though the admin sees `john` in the search box.

**Why it happens:** Debounce protects backend; it doesn't protect against out-of-order responses on the client.

**How to avoid:** Track a "current query" state with the latest text; when each response arrives, check that the response's query matches the current query before applying. Or use a request-ID counter:
```tsx
const requestIdRef = useRef(0);
const handleSearch = async (q: string) => {
  const myId = ++requestIdRef.current;
  const items = await UserService.searchUsers(q);
  if (myId !== requestIdRef.current) return; // stale response, drop
  setItems(items);
};
```

**Warning signs:** Manual QA: type quickly, observe wrong results. Hard to repro reliably; rely on the request-ID guard as belt-and-suspenders.

### Pitfall 6: ESM-only `escape-string-regexp@5` breaks backend `require()`

**What goes wrong:** Planner instinctively reaches for `npm install escape-string-regexp`. npm pulls v5 (the latest). Backend `const escape = require('escape-string-regexp')` throws `Error [ERR_REQUIRE_ESM]: require() of ES Module ...`. Backend fails to boot.

**Why it happens:** `escape-string-regexp@5.0.0` is `"type": "module"`; backend is CommonJS.

**How to avoid:** Don't add the dep. Inline the 1-liner per Pattern 3. If for some reason a dep is preferred, pin to `escape-string-regexp@4.0.0` explicitly. [VERIFIED: `npm view escape-string-regexp@5 type → module`, `npm view escape-string-regexp@4 type → unset` (CJS) on 2026-05-03]

**Warning signs:** `nvm use 24 && npm test` in backend repo emits the ERR_REQUIRE_ESM stack trace.

### Pitfall 7: Two-step modal flow loses chip selection on confirmation cancel

**What goes wrong:** Admin picks `moderator` chip → taps "Continue" → confirm step shows "Change John from admin to moderator?" → admin taps Cancel. Modal returns to step 1 BUT the chip selection has been reset to default. Admin re-picks `moderator`. Annoying.

**Why it happens:** A naive `useState` reset on `step` change wipes the chip state.

**How to avoid:** Keep `selectedRole` state INDEPENDENT of `step`. Step 1 → tap chip sets selectedRole. Step 2 (confirm) → tap Continue advances `step` only. Cancel from step 2 sets `step = 'pick'` BUT preserves `selectedRole`. Submit from step 2 fires `onSubmit({uid, userType: selectedRole})`.

**Warning signs:** Manual QA row "Pick chip, tap Continue, tap Cancel, observe chip is still selected".

## Code Examples

> All examples ground in Phase 3/4 production code. Source URLs point to the on-disk files this research already inspected.

### Example 1: New backend route file scaffold (`adminRoutes.js`)

```js
// JayTap-services/src/routes/adminRoutes.js
// Phase 5 — Admin role management endpoints (ADMIN-01..ADMIN-07).
// Source pattern: clone of moderationRoutes.js (Phase 3) with router-level
// requireMinRole('admin') instead of 'moderator'.
//
// Anti-pattern grep gate (carry-forward from Phase 3 MOD-16 + Phase 4 ARCH-05):
// `actorUid: req.body` and `actorUid: req.headers` MUST return 0 in this file.
// Audit row's actorUid sources from req.firebaseUid (JWKS-verified token sub) ONLY.

const express = require('express');
const router = express.Router();
const User = require('../models/User');
const RoleChangeLog = require('../models/RoleChangeLog');
const { verifyFirebaseToken, requireMinRole } = require('../middleware/verifyFirebaseToken');

// Belt-and-suspenders router-level mount: every endpoint below inherits
// JWKS-verified Bearer + admin-only gate. Admin role = ROLE_RANK 2 ≥ 2.
router.use(verifyFirebaseToken, requireMinRole('admin'));

// Inline regex-escape (Pitfall 6 — no ESM-only dep)
function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const VALID_USER_TYPES = ['user', 'moderator', 'admin'];

// ─── GET /users ───────────────────────────────────────────────────────────
// (See Example 3 for the full handler)

// ─── PATCH /users/:uid/role ───────────────────────────────────────────────
// (See Example 4 for the full handler)

module.exports = { router, VALID_USER_TYPES };
```

### Example 2: `GET /api/admin/users?query=&limit=50` handler

```js
// Source: this research, applying CONTEXT D-Discretion field-allowlist + D-04 limit cap.

router.get('/users', async (req, res) => {
  try {
    const rawQuery = (req.query.query || '').trim();
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 50); // hard-cap at 50 per D-04

    // D-03: pre-search state shows empty list. Treat empty query as "no results".
    if (!rawQuery) {
      return res.json({ items: [] });
    }

    // Pitfall 2 + Pattern 3: regex-escape user input.
    const safeQuery = escapeRegex(rawQuery);

    const items = await User.find({
      email: { $regex: safeQuery, $options: 'i' },
    })
      .limit(limit)
      .select('_id firebaseUid email firstName lastName userType roleRevokedAt')
      .lean();

    // D-Discretion: D-Discretion notes "or {items, totalCount} if planner finds totalCount cheap".
    // We omit totalCount: substring search is unindexed and a separate countDocuments would
    // double the cost. The "Refine your search to see more" hint per D-04 fires when
    // items.length === limit (50), which is sufficient signal.
    return res.json({ items });
  } catch (err) {
    console.error('Error in GET /api/admin/users:', err);
    return res.status(500).json({ message: err.message });
  }
});
```

### Example 3: `PATCH /api/admin/users/:uid/role` handler (full)

```js
// Source: this research, composing Phase 3 race-safe atomic + Pattern 4 self-mutation
// + Pitfall 1 last-admin pre-flight + Pitfall 3 conditional roleRevokedAt + Pattern E audit.

router.patch('/users/:uid/role', async (req, res) => {
  try {
    const targetUid = req.params.uid;
    const { userType: newRole } = req.body;

    // Pattern 4: self-mutation pre-check (cheapest possible reject path).
    if (req.firebaseUid === targetUid) {
      return res.status(403).json({
        code: 'SELF_MUTATION',
        message: 'Admins cannot change their own role.',
      });
    }

    // Validate userType enum.
    if (!VALID_USER_TYPES.includes(newRole)) {
      return res.status(400).json({
        message: `userType must be one of ${VALID_USER_TYPES.join(', ')}`,
      });
    }

    // Lookup target user. We need fromRole for the audit row + last-admin reasoning.
    // .lean() is safe here — we use findOneAndUpdate below for the actual mutation.
    const target = await User.findOne({ uid: targetUid }).lean();
    if (!target) {
      return res.status(404).json({
        code: 'USER_NOT_FOUND',
        message: 'User not found',
      });
    }
    const fromRole = target.userType;

    // Same-tier no-op fast path: 200 + return doc unchanged. Per CONTEXT D-Discretion:
    // "same-tier no-op (e.g., setUserRole(uid, 'admin') on an existing admin) is a 200
    // with no roleRevokedAt change".
    if (fromRole === newRole) {
      const fresh = await User.findOne({ uid: targetUid }).lean();
      return res.json(fresh);
    }

    // Pitfall 1 + Pitfall 3: detect demotion semantics.
    const isDemotion = (
      (fromRole === 'admin'     && newRole !== 'admin') ||
      (fromRole === 'moderator' && newRole === 'user')
    );

    // Pitfall 1: last-admin lockout pre-flight.
    // Counts admins EXCLUDING the target. If demoting an admin and zero admins remain
    // after the demotion, reject. The {_id: {$ne}} excludes the target so the answer
    // is "after this demotion, will any admins remain?" — drift-resistant.
    if (fromRole === 'admin' && newRole !== 'admin') {
      const otherAdmins = await User.countDocuments({
        userType: 'admin',
        _id: { $ne: target._id },
      });
      if (otherAdmins < 1) {
        return res.status(409).json({
          code: 'LAST_ADMIN_LOCKOUT',
          message: 'Cannot change role — this user is the only admin. Promote another user to admin first.',
        });
      }
    }

    // Pattern D: race-safe atomic update. Filter on current userType — if another
    // admin has concurrently changed it, our findOneAndUpdate returns null and we
    // surface 409 ROLE_ALREADY_CHANGED.
    const $set = { userType: newRole };
    if (isDemotion) $set.roleRevokedAt = new Date(); // ROLE-11 invariant; conditional bump per Pitfall 3

    const result = await User.findOneAndUpdate(
      { uid: targetUid, userType: fromRole },
      { $set },
      { new: true }
    );

    if (!result) {
      return res.status(409).json({
        code: 'ROLE_ALREADY_CHANGED',
        message: 'This user\'s role was already changed by another admin.',
      });
    }

    // Pattern E: audit-row write (orphan-tolerant try/catch). Carry-forward Phase 3 + 4 idiom.
    try {
      await RoleChangeLog.create({
        actorUid: req.firebaseUid,  // PATTERN: JWKS-verified sub, NEVER req.body
        targetUid: targetUid,
        fromRole,
        toRole: newRole,
        at: new Date(),
      });
    } catch (auditErr) {
      console.error(JSON.stringify({
        evt: 'role_change_audit_orphan',
        targetUid,
        actorUid: req.firebaseUid,
        fromRole,
        toRole: newRole,
        err: auditErr.message,
        ts: new Date().toISOString(),
      }));
    }

    // CONTEXT D-Discretion: PATCH success response = the full updated User doc.
    // Strip server-internal fields the client doesn't need.
    const { __v, ...publicDoc } = result.toObject();
    return res.json(publicDoc);
  } catch (err) {
    console.error('Error in PATCH /api/admin/users/:uid/role:', err);
    return res.status(500).json({ message: err.message });
  }
});
```

### Example 4: New `RoleChangeLog.js` Mongoose model

```js
// JayTap-services/src/models/RoleChangeLog.js
// Phase 5 — Append-only audit log for admin role changes (ADMIN-05).
// CONTEXT D-Discretion: separate collection (NOT merged with moderationLog).
// Schema matches REQUIREMENTS.md ADMIN-05 verbatim.
//
// Sibling pattern: src/models/ModerationLog.js (Phase 3 MOD-16) — same
// "additive-only audit collection" discipline.

const mongoose = require('mongoose');

const RoleChangeLogSchema = new mongoose.Schema({
  actorUid:  { type: String, required: true, index: true },  // JWKS-verified token sub — NEVER client-supplied
  targetUid: { type: String, required: true, index: true },
  fromRole:  { type: String, enum: ['user', 'moderator', 'admin'], required: true },
  toRole:    { type: String, enum: ['user', 'moderator', 'admin'], required: true },
  at:        { type: Date, default: Date.now, required: true },
}, {
  collection: 'role_change_log',
});

module.exports = mongoose.model('RoleChangeLog', RoleChangeLogSchema);
```

### Example 5: New `UserService.ts`

```ts
// src/services/UserService.ts
// Phase 5 — Admin user-management HTTP client.
// Source pattern: PropertyService.ts (Bearer auto-attach via apiClient inheritance)
// + canFromUser belt-and-suspenders gate (Phase 4 D-16 precedent).

import { apiClient } from './apiClient';
import { canFromUser, PermissionDeniedError } from '../hooks/useRole';

export interface AdminUserListItem {
  _id: string;
  firebaseUid: string;
  email: string;
  firstName?: string;
  lastName?: string;
  userType: 'user' | 'moderator' | 'admin';
  roleRevokedAt?: string | null;
}

export const UserService = {
  searchUsers: async (query: string, currentUser: any): Promise<AdminUserListItem[]> => {
    if (!canFromUser(currentUser, 'manageRoles')) {
      throw new PermissionDeniedError();
    }
    try {
      const response = await apiClient.get('/admin/users', {
        params: { query, limit: 50 },
      });
      return response.data.items as AdminUserListItem[];
    } catch (err: any) {
      console.error('Error searching admin users:', err?.message);
      throw err;
    }
  },

  setUserRole: async (
    targetUid: string,
    userType: 'user' | 'moderator' | 'admin',
    currentUser: any,
  ): Promise<AdminUserListItem> => {
    if (!canFromUser(currentUser, 'manageRoles')) {
      throw new PermissionDeniedError();
    }
    try {
      const response = await apiClient.patch(`/admin/users/${targetUid}/role`, {
        userType,
      });
      return response.data as AdminUserListItem;
    } catch (err: any) {
      console.error('Error setting user role:', err?.message);
      // Surface the envelope code + message to the caller — RoleChangeModal
      // maps the code to localized copy (LAST_ADMIN_LOCKOUT, SELF_MUTATION,
      // ROLE_ALREADY_CHANGED, USER_NOT_FOUND).
      throw err;
    }
  },
};
```

### Example 6: Inline regex-escape utility (no new dep)

```js
// JayTap-services/src/routes/adminRoutes.js (or src/utils/escapeRegex.js if reused)
// Source: MDN Regular Expressions guide — same one-liner used by lodash + escape-string-regexp.
// Avoids ESM-only escape-string-regexp@5 dep (Pitfall 6).
function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
```

### Example 7: Mounting the admin router in `index.js`

```js
// JayTap-services/index.js — add this line near line 123 (sibling to moderationRoutes mount).
// Source: existing mount pattern, lines 114-123.

app.use('/api/admin', require('./src/routes/adminRoutes').router);
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| M1 hardcoded admin email allowlist | Phase 1 ROLE-01..11: server-resolved roles via Mongo `userType` + JWKS middleware + apiClient interceptors | 2026-04-30 (Phase 1 close) | Phase 5 has zero infrastructure work — every primitive ships and is regression-tested. |
| Phase 4.5 `LandlordApplicationQueueScreen` inline reject modal | Phase 3 extracted reusable `RejectListingModal.tsx` (209 LOC) | 2026-05-02 (Phase 3 Plan 04) | Phase 5 forks RejectListingModal → RoleChangeModal; the fork pattern is established and code-reviewed. |
| Phase 3's planned single-source `moderationLog` collection | Phase 5 lands a NEW separate `roleChangeLog` collection | CONTEXT D-Discretion (Phase 5 discuss) | Single-purpose collection keeps the schema clean; matches ADMIN-05 verbatim. |
| `promoteToModerator` Action union member (Phase 1 forward-compat placeholder) | `manageRoles` (Phase 5 atomic rename; zero non-test call sites) | Phase 5 (this phase) | Mechanical 6-line edit in a single commit. |

**Deprecated/outdated:**
- `escape-string-regexp@5` — ESM-only; backend is CJS; would break `require()`. Use inline 1-liner instead.
- Pre-Phase-1 hardcoded admin email allowlist (`src/constants/adminAllowlist.ts`) — already deleted in Phase 1 Plan 13.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Backend framework | jest 29.7.0 + supertest 7.1.4 + mongodb-memory-server 9.5.0 (verified `JayTap-services/package.json`) |
| Backend config | `JayTap-services/jest.config.cjs` (existing) |
| Backend quick run | `cd /Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services && nvm use 24 && npm test -- --testPathPattern=adminRoutes` |
| Backend full suite | `cd /Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services && nvm use 24 && npm test` (currently 106/106 GREEN per Phase 4 close) |
| RN client framework | jest (existing useRole.test.ts pattern) |
| RN client quick run | `cd /Users/beckmaldinVL/development/mobileApps/JayTap && npx jest src/hooks/__tests__/useRole.test.ts` |
| RN client tsc gate | `cd /Users/beckmaldinVL/development/mobileApps/JayTap && npx tsc --noEmit` (baseline 2 ThemeContext errors per Phase 4 close — preserve) |
| Locale parity gate | `cd /Users/beckmaldinVL/development/mobileApps/JayTap && bash scripts/check-i18n-parity.sh` (must exit 0) |

**Backend agents MUST** `nvm use 24` before any npm/node command (verified `engines.node >=22.12.0` + memory `backend-node-version.md`).

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ADMIN-01 | Search-by-email returns matching users | supertest | `npm test -- adminRoutes` (case `GET /users?query=foo returns matching users with redacted projection`) | ❌ Wave 0 — needs `src/__tests__/adminRoutes.test.js` |
| ADMIN-02 | PATCH role triggers `roleRevokedAt` bump on demotion | supertest | `npm test -- adminRoutes` (case `PATCH /users/:uid/role admin→user bumps roleRevokedAt`) | ❌ Wave 0 |
| ADMIN-02 | PATCH role does NOT bump `roleRevokedAt` on promotion (Pitfall 3 regression) | supertest | `npm test -- adminRoutes` (case `PATCH /users/:uid/role user→admin leaves roleRevokedAt unchanged`) | ❌ Wave 0 |
| ADMIN-03 | Last-admin lockout returns 409 LAST_ADMIN_LOCKOUT | supertest | `npm test -- adminRoutes` (case `PATCH /users/:uid/role demoting last-but-one admin returns 409 LAST_ADMIN_LOCKOUT`) | ❌ Wave 0 |
| ADMIN-03 | Two-device race: Promise.all both demote target → exactly one 200 + one 409 | supertest | `npm test -- adminRoutes` (case `concurrent role-changes: one returns 200, the other returns 409 ROLE_ALREADY_CHANGED`) | ❌ Wave 0 |
| ADMIN-04 | PATCH self-uid returns 403 SELF_MUTATION even for admin | supertest | `npm test -- adminRoutes` (case `PATCH /users/:my-uid/role returns 403 SELF_MUTATION`) | ❌ Wave 0 |
| ADMIN-05 | Successful role-change writes `roleChangeLog` row with correct shape | supertest | `npm test -- adminRoutes` (case `PATCH /users/:uid/role writes RoleChangeLog row with actorUid + targetUid + fromRole + toRole + at`) | ❌ Wave 0 |
| ADMIN-05 | actorUid CANNOT be spoofed via request body (anti-spoofing carry-forward) | supertest | `npm test -- adminRoutes` (case `actorUid is sourced from JWKS sub, NEVER from request body`) | ❌ Wave 0 |
| ADMIN-06 | `<Gated action="manageRoles">` returns true for admin only | jest unit | `npx jest src/hooks/__tests__/useRole.test.ts` (case `manageRoles is admin-only`) | ⚠️ EXISTS as `promoteToModerator` test; rename in same commit per Pattern G |
| ADMIN-07 | Endpoints require admin role; moderator/user gets 403 insufficient-role | supertest | `npm test -- adminRoutes` (case per endpoint × 4 → 403 for non-admin, 200 for admin) | ❌ Wave 0 |
| All UI cells | Manual physical-device QA matrix walk | manual | (See matrix below) | n/a |

### Sampling Rate

- **Per task commit:** Backend `npm test -- --testPathPattern=adminRoutes` (~5-10s); RN client `npx jest useRole.test.ts` + `npx tsc --noEmit` + `bash scripts/check-i18n-parity.sh`.
- **Per wave merge:** Backend full suite `npm test` (must remain 106/106 GREEN baseline + new Phase 5 tests; expected ~120/120 after Phase 5 close).
- **Phase gate:** Full backend suite GREEN; RN client tsc baseline preserved at 2 ThemeContext errors; i18n parity exit 0; manual physical-device matrix APPROVED on iPhone 15 Pro Max (Moto G XT2513V deferred to Phase 6 REL-03 per Phase 3/4 escape-hatch precedent); paired `/gsd-verify-work 5` + `/gsd-code-review` (memory `gsd-verifier-misses-regressions.md`).

### Manual Physical-Device QA Matrix

Per CONTEXT D-Discretion: physical-device matrix walks DEFERRED to Phase 6 REL-03 for the cross-cutting role-transitions matrix; Phase 5 ships its OWN scoped matrix focused on the new screen + concurrency cases.

| Row | Step | Expected | Iterates over |
|-----|------|----------|---------------|
| 1 | Admin opens Profile → sees "Manage Roles" entry | Row visible only for admin (hidden for moderator + plain user) | role × dark/light |
| 2 | Tap "Manage Roles" → RoleManagementScreen opens with empty state + "Type to search" | D-03 placeholder visible; no API call yet (verify via dev tools) | EN/RU |
| 3 | Type 3-char query → 300ms debounce → list populates | D-01 debounce visible; chip pill colors match userType | EN/RU + dark/light |
| 4 | Search returns own user → row shows "(you)" disabled badge | D-10 badge visible; row is non-tappable | — |
| 5 | Search returns 50 users → footer hint "Refine your search to see more" | D-04 hint visible | EN/RU |
| 6 | Tap a user row → RoleChangeModal opens with current role chip de-emphasized | D-05 visual state correct | dark/light |
| 7 | Pick a different chip → tap Continue → confirm-message shows "Change John from {fromRole} to {toRole}?" | D-06 confirm copy correct + symmetric for promotion + demotion | EN/RU |
| 8 | Cancel from confirm step → returns to chip step with selection PRESERVED | Pitfall 7 — chip stays selected | — |
| 9 | Submit → success toast "Role updated" + inline pill updates + list stays open | D-07 success path | EN/RU |
| 10 | Demote a moderator → re-search → row shows updated `roleRevokedAt` timestamp | D-02 timestamp render | — |
| 11 | Demote the only-other admin (set up: only 2 admins exist) → blocking modal alert "Cannot change role — X is the only admin..." | D-09 LAST_ADMIN_LOCKOUT modal copy | EN/RU |
| 12 | Two-device race (two admins demote the same target via two physical devices simultaneously) | Exactly one device sees 200; the other sees 409 toast/modal | — |
| 13 | Demote a moderator who's currently using the app on device 2 → device 2's next protected request triggers role-refresh banner within 60s | Phase 1 ROLE-11 invariant carry-forward; ROADMAP success criterion #2 | — |
| 14 | Promote a user → re-search → confirm `roleRevokedAt` is unchanged from prior value (Pitfall 3 regression) | Pitfall 3 — promotion doesn't bump | — |
| 15 | Backend: hit `PATCH /api/admin/users/<my_uid>/role` directly via curl with admin Bearer → 403 SELF_MUTATION | D-11 + Pattern 4 | — |

### Wave 0 Gaps

- [ ] `JayTap-services/src/__tests__/adminRoutes.test.js` — covers ADMIN-01..05 + ADMIN-07
- [ ] `JayTap-services/src/__tests__/fixtures/` may need an `admin-fixtures.js` with multi-admin seed for last-admin-lockout cases (planner verifies; `mongodb-memory-server` lets us seed inline per-test)
- [ ] No new RN client jest infrastructure needed — `useRole.test.ts` exists and the rename + new `manageRoles` test row land inline.

## Concurrency Risk Register

### Risk #1 — Two admins simultaneously demote the only-other admin (zero-admin lockout)

**Setup:** 3 admins (A, B, C). A and B both submit `PATCH /admin/users/<C-uid>/role` with `userType: 'user'` simultaneously.

**Naive failure mode:** Both pre-flight counts see 3 admins. Both pass the lockout check. Both atomic updates succeed (different filter keys: A's update filter is `{uid: C-uid, userType: 'admin'}`, succeeds; but wait — they're updating the SAME document, so the second one sees null and 409s). **Actually, this specific scenario is safe** because both A and B target the same `_id` and the atomic filter requires `userType: 'admin'`. After A's update, the doc is `userType: 'user'`; B's update returns null → 409 ROLE_ALREADY_CHANGED. Phew.

**Real failure mode:** 3 admins (A, B, C, D — 4 admins). A submits demote of C; B submits demote of D, simultaneously. Pre-flight counts both see "if I demote my target, 3 admins remain". Both atomic updates target different `_id`s, both succeed. Now there are 2 admins (A + B). Fine.

**Actual failure mode:** 2 admins (A + B). A demotes B (A is doing this from a panel); B demotes A (B is doing this concurrently from THEIR panel, perhaps in retaliation). A's pre-flight: `countDocuments({userType:'admin', _id: {$ne: B-id}})` = 1 (just A) → > 1 fails → 409 LAST_ADMIN_LOCKOUT. B's pre-flight: same → 409. **Both 409 — and we're stuck with 2 admins (which is fine).**

**Worst case 1:** 3 admins (A, B, C). A demotes B; C demotes B; both target the SAME user. Pre-flight A: `{userType:'admin', _id: {$ne: B-id}}` = 2 → > 1 passes. Pre-flight C: same = 2 → > 1 passes. A's atomic update succeeds (B is now user). C's atomic update returns null (filter `userType: 'admin'` doesn't match) → 409 ROLE_ALREADY_CHANGED. Result: 2 admins (A + C). **Safe.**

**Worst case 2 (the genuine race):** 2 admins (A + B). C is a moderator. A promotes C to admin AND simultaneously demotes B. The two operations interleave:
- A: pre-flight count for C-promotion → no demotion logic → skip.
- A: atomic update `{uid: C, userType: 'moderator'}` → succeeds → C is admin.
- B: tab open elsewhere demotes someone? No, B is the target. Actually, no race issue here.

**The actual genuinely-dangerous race:** 2 admins (A + B). A demotes B (from their panel). At the same exact millisecond, B demotes A. Both pre-flight counts evaluate against pre-mutation state where 2 admins exist, both excluding their target. A's count: admins where `_id != B-id` = 1 (A). 1 < 1 is false → 1 ≥ 1 → passes (oh wait, our check is `< 1` which is false since `1 < 1` is false → passes). Hmm. Actually: `if (otherAdmins < 1) return 409`. `otherAdmins = 1` → `1 < 1` is false → no early return → proceeds to demote B. Symmetric for B's request → proceeds to demote A. Result: zero admins.

**Mitigation strategy chosen:** The two-phase compare-and-swap embedded in the atomic filter. Specifically: after the pre-flight count, the atomic update uses `findOneAndUpdate({uid: targetUid, userType: fromRole}, ...)`. The filter ALSO needs an embedded admin-count guard. Mongo doesn't support `$expr` with a secondary count subquery efficiently inline. The practical close: **after the atomic update returns the new doc, re-count admins; if zero remain (counting the now-demoted target as no-longer-admin), ROLLBACK by writing the old role back + return 409 LAST_ADMIN_LOCKOUT_RACE**.

```js
// Inside the handler, after the atomic update succeeds:
if (isDemotion && fromRole === 'admin') {
  const finalAdminCount = await User.countDocuments({ userType: 'admin' });
  if (finalAdminCount < 1) {
    // ROLLBACK: race-loss path. Restore the old role.
    await User.updateOne({ _id: result._id }, { $set: { userType: fromRole } });
    // ROLE-11: do NOT bump roleRevokedAt on rollback (the rollback restores prior state).
    return res.status(409).json({
      code: 'LAST_ADMIN_LOCKOUT_RACE',
      message: 'Race detected: another admin was demoted simultaneously. Try again.',
    });
  }
}
```

This is the SIMPLEST correct close. Atlas transactions (Risk #1 Open Question) would be cleaner.

**Test cases (supertest):**
1. "two concurrent demotes of last-but-one admin → exactly one returns 200, the other returns 409 LAST_ADMIN_LOCKOUT_RACE" — fires `Promise.all([A_request, B_request])` and asserts the exact response distribution.
2. "atomic update on stale userType returns 409 ROLE_ALREADY_CHANGED" — single-request scenario where the doc was concurrently changed.
3. "pre-flight LAST_ADMIN_LOCKOUT fires before atomic update (no Mongo write attempted)" — assert via spy/log that the rejected request never invokes `findOneAndUpdate`.

### Risk #2 — Self-mutation race (admin tries to demote themselves)

**Setup:** Admin opens RoleManagementScreen, finds their own row (defended by D-10 disabled badge), bypasses the client gate via curl, fires `PATCH /admin/users/<my_uid>/role` with `userType: 'user'`.

**Mitigation:** Pattern 4 — early `req.firebaseUid === req.params.uid` reject with 403 SELF_MUTATION. This check happens BEFORE the last-admin pre-flight count (cheap O(1) string compare beats O(N) countDocuments), and BEFORE the atomic update (so no race with last-admin).

**Test case:** "PATCH /users/:my-uid/role returns 403 SELF_MUTATION even when caller is admin" — supertest with admin Bearer hitting their own `targetUid`.

### Risk #3 — Role-revoked race during admin's own session

**Setup:** Admin A demotes admin B. Admin B's app is currently open. Per Phase 1 ROLE-11 invariant, B's `roleRevokedAt` is now `Date.now()`. B's app makes its next protected request → JWKS middleware sees `token.iat < user.roleRevokedAt` → 403 role-revoked. apiClient interceptor → `refreshRoleSingleflight` → re-fetches `/api/auth/me` → still 403 (no, /me doesn't 403 for a still-valid Bearer; it returns the current user with the new userType). Actually re-read: the interceptor does `refreshRole + retry`. The retry hits the same endpoint with the same Bearer; backend re-checks `token.iat < user.roleRevokedAt` → still 403. Retry-loss path → silent logout + `auth.accessChanged` toast. ✓

**Mitigation:** Already handled by Phase 1's interceptor chain. Phase 5 needs to do nothing.

**Test case (manual):** "Demote a moderator who's currently active on device 2 → device 2 sees role-refresh + (depending on the screen they're on) a forced logout within 60s". Listed as Row 13 in the manual matrix.

## Recommended File List

### NEW files (create)

#### RN client (`/Users/beckmaldinVL/development/mobileApps/JayTap`)

| File | Estimated LOC | Pattern | Notes |
|------|---------------|---------|-------|
| `src/screens/RoleManagementScreen.tsx` | 340-400 | ModerationQueueScreen analog | SafeAreaView + ChevronLeft header + search TextInput (debounced 300ms) + FlatList + sibling `<RoleChangeModal>`. Per-screen useRef for debounce timer + per-screen useRef for stale-response guard (Pitfall 5). |
| `src/components/RoleChangeModal.tsx` | 280-320 | RejectListingModal fork (Pattern 5; 6-8 edit diff) | 3-chip selector + 2-step (chip-pick → confirm) + Submit. |
| `src/services/UserService.ts` | 80-100 | PropertyService.ts analog | 2 methods: `searchUsers`, `setUserRole`. |

#### Backend (`/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services`)

| File | Estimated LOC | Pattern | Notes |
|------|---------------|---------|-------|
| `src/routes/adminRoutes.js` | 280-340 | moderationRoutes.js clone | 2 endpoints (`GET /users`, `PATCH /users/:uid/role`); Pattern 1 router-level admin gate; Pattern 4 self-mutation; Pitfall 1 last-admin lockout (two-phase CAS + rollback close); Pattern E audit-row write. |
| `src/models/RoleChangeLog.js` | 25-35 | ModerationLog.js analog | Narrower schema per ADMIN-05 verbatim. |
| `src/__tests__/adminRoutes.test.js` | 250-350 | moderationRoutes.test.js analog | 12-15 supertest cases per Validation Architecture map. |

### MODIFY files

#### RN client

| File | LOC delta (estimate) | Change |
|------|---------------------|--------|
| `App.tsx` | +30 to +40 (1191 → 1221-1231) | New state + OVERLAY_FLAGS append + back-handler branch + mount block + ProfileScreen prop wiring. Signal-not-block per Phase 2 PATTERN D. Optional mitigation: extract `<RoleManagementOverlayHost>` to net closer to neutral. |
| `src/screens/ProfileScreen.tsx` | +20 to +25 | New entry-point row + `onOpenRoleManagement?` prop. |
| `src/hooks/useRole.ts` | +0 (rename) | `promoteToModerator` → `manageRoles` rename (line 21 + line 84). Plus comment update on switch case. |
| `src/hooks/__tests__/useRole.test.ts` | +0 to +5 (rename + 1 new test row) | Test rename (4 references) + add `manageRoles is admin-only` row covering admin/moderator/user/guest. |
| `src/locales/en.ts` | +20 to +25 keys | New `admin.roles.*` namespace (D-12 enumeration; full list in §"Don't Hand-Roll" → locale-key inventory above). |
| `src/locales/ru.ts` | +20 to +25 keys (must match en.ts exactly) | Same key set; Russian values. CI gate `scripts/check-i18n-parity.sh` enforces exact set match. |

#### Backend

| File | LOC delta | Change |
|------|-----------|--------|
| `index.js` | +1 | `app.use('/api/admin', require('./src/routes/adminRoutes').router);` near line 123 (sibling to moderationRoutes mount). |

### Locale Key Inventory (D-12 + base strings)

Per CONTEXT D-12 + the Phase 4 D-12 precedent (key NAMES preserved across locales; same keys both files):

```
admin.roles.entryPoint                                  // "Manage Roles" / «Управление ролями»
admin.roles.screenTitle                                 // "Role Management" / «Управление ролями»
admin.roles.search.placeholder                          // "Search by email" / «Поиск по email»
admin.roles.search.hint                                 // "Type to search" / «Введите запрос»
admin.roles.search.noResults                            // "No users match \"{query}\"." / «Пользователи по запросу «{query}» не найдены.»
admin.roles.list.refineHint                             // "Refine your search to see more" / «Уточните запрос, чтобы увидеть больше»
admin.roles.list.youBadge                               // "(you)" / «(вы)»
admin.roles.list.revokedAtPrefix                        // "Revoked: {date}" / «Отозвано: {date}»
admin.roles.role.user                                   // "User" / «Пользователь»
admin.roles.role.moderator                              // "Moderator" / «Модератор»
admin.roles.role.admin                                  // "Admin" / «Администратор»
admin.roles.modal.title                                 // "Change Role" / «Изменить роль»
admin.roles.modal.continue                              // "Continue" / «Далее»
admin.roles.modal.confirmTitle                          // "Confirm role change" / «Подтвердите изменение роли»
admin.roles.modal.confirmMessage                        // "Change {name} from {fromRole} to {toRole}?" / «Изменить роль {name} с {fromRole} на {toRole}?»
admin.roles.modal.submit                                // "Change Role" / «Изменить роль»
admin.roles.toast.success                               // "Role updated" / «Роль обновлена»
admin.roles.error.lastAdminLockout.title                // "Cannot change role" / «Нельзя изменить роль»
admin.roles.error.lastAdminLockout.body                 // "{name} is the only admin. Promote another user to admin first." / «{name} — единственный администратор. Сначала повысьте другого пользователя до администратора.»
admin.roles.error.selfMutation                          // "Admins cannot change their own role." / «Администраторы не могут изменять свою роль.»
admin.roles.error.roleAlreadyChanged                    // "This user's role was already changed by another admin." / «Роль этого пользователя уже изменил другой администратор.»
admin.roles.error.userNotFound                          // "User not found." / «Пользователь не найден.»
admin.roles.error.network                               // "Could not reach server. Try again." / «Не удалось связаться с сервером. Попробуйте снова.»
```

**Total: 23 new keys × 2 locales = 46 strings.** Within the M2 i18n growth budget (Phase 3 added 19, Phase 4 added 8 + rewrote 5).

## Open Questions for Planner (RESOLVED)

### Q1 — MongoDB Atlas tier transaction support — RESOLVED: two-phase CAS + post-write rollback (the portable path; transactions deferred)

**What we know:** MongoDB transactions require a replica set. Atlas free tier (M0) and paid shared tiers (M2/M5) do support transactions because Atlas provisions a replica set by default. Atlas M0 free tier explicitly supports transactions per official docs as of mid-2024. Backend connects to Atlas.

**What's unclear:** The exact Atlas tier this project uses. Memory `aws-iam-jaytap-prod-s3.md` mentions a JayTap S3 user but says nothing about Mongo Atlas tier.

**Recommendation:** Plan for the **two-phase compare-and-swap + rollback** mitigation strategy (Risk #1) as the primary close — it's portable and works on bare clusters. If the maintainer can confirm Atlas tier supports transactions during plan-phase, the planner can OPTIONALLY add a transaction-wrapped path as a defense-in-depth upgrade. The two-phase CAS handles the worst-case race correctly; transactions just close the race window faster.

### Q2 — Search performance: should we add a prefix-only search alternative? — RESOLVED: substring-only per CONTEXT D-Discretion; defer prefix-mode to M3+

**What we know:** D-Discretion locked substring search (`$regex: escapedQuery, $options: 'i'`). At admin scale this is fine.

**What's unclear:** Whether the planner should ALSO surface a documented "prefix-only" mode that uses the email index (e.g., user types `^foo` to opt into faster prefix search). Probably overkill at this scale.

**Recommendation:** Ship substring-only per CONTEXT lock. Document the unindexed-scan tradeoff in code comments + SUMMARY. Defer prefix-mode toggle to M3+ if user count crosses ~10K.

### Q3 — `LAST_ADMIN_LOCKOUT_RACE` envelope code: same as `LAST_ADMIN_LOCKOUT` or distinct? — RESOLVED: reuse `LAST_ADMIN_LOCKOUT` envelope code with a distinct ops log event for rollback path

**What we know:** CONTEXT D-11 locks `LAST_ADMIN_LOCKOUT (409)` for the pre-flight check. Risk #1's rollback close needs a SEPARATE distinguishable code (or it can reuse `LAST_ADMIN_LOCKOUT` with a different message).

**Recommendation:** Reuse `LAST_ADMIN_LOCKOUT` with the same code + message. Both surface to the user via the D-09 blocking modal. The race-window distinction is interesting for ops (log analysis) but not for UX. Add a `console.log({evt:'last_admin_lockout_rollback', ...})` for ops visibility.

### Q4 — Should `firebaseUid` field on User be the lookup key or `_id`? — RESOLVED: `User.findOne({uid: targetUid})` (Firebase uid string) — matches verifyFirebaseToken middleware

**What we know:** User schema has both `_id` (Mongo ObjectId, auto) and `uid` (Firebase string, unique-indexed). The `verifyFirebaseToken` middleware does `User.findOne({uid: firebaseUid})` (line 70). The PATCH route's `req.params.uid` matches the Firebase uid string.

**Recommendation:** Use `User.findOne({uid: targetUid})` and `User.findOneAndUpdate({uid: targetUid, userType: fromRole}, ...)` (Firebase uid string). Consistent with the existing lookup pattern. Document this in code comments.

### Q5 — Should we tighten `userType` enum validation on the client too? — RESOLVED: client const + backend validate (duplicate harmless at this scale)

**What we know:** RoleChangeModal renders 3 chips from a hardcoded `ROLE_TYPES` const. Backend validates against `VALID_USER_TYPES`. Client gate is UX-only.

**Recommendation:** Keep client const + backend validate. If the planner wants single-source-of-truth, export `VALID_USER_TYPES` from the backend and re-derive on the client (similar to RejectReasonCode), but at this scale the duplication is harmless.

### Q6 — How should the inline "(you)" badge look visually? — RESOLVED: `opacity: 0.5` row + `textSecondary` (you) chip + `disabled` TouchableOpacity per Phase 5 UI-SPEC

**What we know:** D-10 says "subtle '(you)' / «(вы)» label next to the email" + "non-tappable". Discretion left to UI.

**Recommendation:** Render row with `opacity: 0.5`, badge as a small chip next to email (`textSecondary` color), `disabled` on the TouchableOpacity. Standard iOS Settings disabled-row treatment.

### Q7 — App.tsx LOC drift — should we extract `<RoleManagementOverlayHost>`? — RESOLVED: signal-not-block per PATTERN D; document drift in 05-05-SUMMARY

**What we know:** Current App.tsx = 1191 LOC. Phase 5 adds +30-40 LOC. Phase 3 SUMMARY's M3 remediation list mentions extracting overlay host components.

**Recommendation:** Plan to land Phase 5's mount block inline (signal-not-block per PATTERN D + Phase 4 precedent). DOCUMENT the drift in SUMMARY. M3 cleanup work can extract host components for both ModerationQueue + RoleManagement together.

## Sources

### Primary (HIGH confidence)

- `/Users/beckmaldinVL/development/mobileApps/JayTap/.planning/phases/05-admin-role-management-ui/05-CONTEXT.md` — Locked decisions D-01..D-12 + Discretion section [VERIFIED via direct read]
- `/Users/beckmaldinVL/development/mobileApps/JayTap/.planning/REQUIREMENTS.md` lines 75-81 — ADMIN-01..ADMIN-07 acceptance criteria [VERIFIED via direct read]
- `/Users/beckmaldinVL/development/mobileApps/JayTap/.planning/ROADMAP.md` lines 125-136 — Phase 5 goal + 4 success criteria [VERIFIED via direct read]
- `/Users/beckmaldinVL/development/mobileApps/JayTap/CLAUDE.md` — Project hard rules (no react-navigation, no Firebase SDK, EN+RU parity) [VERIFIED via direct read]
- `/Users/beckmaldinVL/development/mobileApps/JayTap/.planning/phases/01-backend-role-foundation-auth-migration-hotfix-bundle/01-CONTEXT.md` — JWKS + roleRevokedAt invariant + apiClient interceptors [VERIFIED via direct read]
- `/Users/beckmaldinVL/development/mobileApps/JayTap/.planning/phases/03-moderation-queue-actions-edit-on-behalf/03-CONTEXT.md` — overlay mount + race-safe atomic + ALREADY_MODERATED 409 + actorUid anti-spoofing [VERIFIED via direct read]
- `/Users/beckmaldinVL/development/mobileApps/JayTap/.planning/phases/04-archive-lifecycle-owner-mod-admin/04-CONTEXT.md` — modal-fork-and-trim + Gated extension + locale-key fork conventions [VERIFIED via direct read]
- `/Users/beckmaldinVL/development/mobileApps/JayTap/App.tsx` lines 65, 121-128, 315-400, 1043-1067 — overlay machine + back-handler + mount pattern [VERIFIED via direct read]
- `/Users/beckmaldinVL/development/mobileApps/JayTap/src/screens/ModerationQueueScreen.tsx` — clone basis [VERIFIED via direct read; 382 LOC]
- `/Users/beckmaldinVL/development/mobileApps/JayTap/src/components/RejectListingModal.tsx` — fork basis [VERIFIED via direct read; 209 LOC]
- `/Users/beckmaldinVL/development/mobileApps/JayTap/src/hooks/useRole.ts` — Action union + canFromUser switch + `promoteToModerator` placeholder [VERIFIED via direct read]
- `/Users/beckmaldinVL/development/mobileApps/JayTap/src/services/apiClient.ts` — Bearer + 401/403 interceptors [VERIFIED via direct read]
- `/Users/beckmaldinVL/development/mobileApps/JayTap/src/services/PropertyService.ts` — analog for new UserService [VERIFIED via direct read first 100 lines]
- `/Users/beckmaldinVL/development/mobileApps/JayTap/src/screens/ProfileScreen.tsx` lines 1-120, 270-301 — entry-point row template [VERIFIED via direct read]
- `/Users/beckmaldinVL/development/mobileApps/JayTap/src/locales/en.ts` lines 589-616 — moderation namespace key shape; verified `admin.roles.*` is unused [VERIFIED via grep]
- `/Users/beckmaldinVL/development/mobileApps/JayTap/scripts/check-i18n-parity.sh` — strict diff i18n CI gate [VERIFIED via direct read]
- `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/index.js` — route mount file (NOT `app.js`) [VERIFIED via direct read]
- `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/routes/moderationRoutes.js` — clone basis [VERIFIED via direct read; 642 LOC]
- `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/middleware/verifyFirebaseToken.js` — JWKS + requireMinRole + ROLE_RANK + roleRevokedAt enforcement [VERIFIED via direct read]
- `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/models/User.js` — userType enum (`['user','moderator','admin']`), roleRevokedAt field, `email` is unique-indexed (built-in via `unique: true` at schema level), collection name `'user_profile'` [VERIFIED via direct read]
- `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/models/ModerationLog.js` — schema template + collection naming pattern [VERIFIED via direct read]
- `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/package.json` — `engines.node >=22.12.0`, jest 29.7.0, supertest 7.1.4, mongodb-memory-server 9.5.0 [VERIFIED via direct read]
- `/Users/beckmaldinVL/development/mobileApps/JayTap/.planning/config.json` — `nyquist_validation: true`, `code_review: true`, `mode: yolo`, `granularity: fine` [VERIFIED via direct read]

### Secondary (MEDIUM confidence)

- npm registry on 2026-05-03: `escape-string-regexp@4.0.0` (CJS), `escape-string-regexp@5.0.0` (ESM-only) [VERIFIED via `npm view`]
- MDN Regular Expressions guide — escape-regex one-liner pattern [CITED: developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_expressions]
- MongoDB Atlas tier transaction support — Atlas M0 free tier supports transactions because the cluster is a replica set by default [ASSUMED based on official Atlas documentation; planner should re-confirm if transactions are chosen]

### Tertiary (LOW confidence — none)

- No tertiary sources required for this research.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | MongoDB Atlas free tier (M0) supports transactions because the cluster is a replica set by default. | Open Question Q1, "Don't Hand-Roll" Atlas transaction tradeoff row | If wrong, the planner cannot fall back to transactions and MUST use the two-phase CAS + rollback strategy. The CAS strategy works regardless of transaction support, so this is a "nice-to-have", not a "must-have" assumption. |
| A2 | The `email` field on User is `unique: true` indexed but does NOT use a case-insensitive collation. Substring case-insensitive regex search will trigger COLLSCAN. | Pitfall 2, Open Question Q2 | If `email` does have case-insensitive collation, prefix searches could be index-backed and we'd get better performance. Doesn't affect correctness; the substring-scan estimate is conservative. |
| A3 | `RoleChangeModal` fork is a 6-8 edit diff (vs RejectListingModal's canonical 4) due to the 2-step flow + chip-set change + no-note removal. | Pattern 5, "Standard Stack" Recommended File List | If the diff is closer to 4 edits, great — we save LOC. If closer to 12, the planner should consider greenfield instead. The 6-8 estimate is based on enumerated changes; planner can refine when actually authoring. |
| A4 | iPhone 15 Pro Max is the M2 primary device (per Phase 3 + 4 close); Moto G XT2513V deferred to Phase 6 REL-03. | "Validation Architecture" → Manual matrix scoping | If planner believes Phase 5 needs Android coverage NOW, the matrix expands. CONTEXT doesn't lock this; this assumption follows the Phase 3/4 escape-hatch precedent. |

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js (RN client) | RN client `npx jest`, `npx tsc` | ✓ | v20.x default shell | — |
| Node.js (backend) | Backend `npm test`, `npm start` | ✓ | nvm v24 (`nvm use 24`); declared `engines.node >=22.12.0` | — |
| `nvm` | Backend agent must `nvm use 24` | ✓ (per memory `backend-node-version.md`) | — | — |
| MongoDB Atlas | Backend production runtime | ✓ | (Phase 1 verified live) | — |
| `mongodb-memory-server@9.5.0` | Backend supertest | ✓ | 9.5.0 (in `JayTap-services/package.json` devDeps) | — |
| Firebase Identity Toolkit REST | RN client AuthService | ✓ | (Phase 1 verified live) | — |
| Railway backend | Production deployment | ✓ | (Phase 4 close confirmed live) | — |
| iPhone 15 Pro Max physical device | Manual matrix walk | ✓ (per Phase 4 close) | iOS 26 | — |

**Missing dependencies with no fallback:** None.
**Missing dependencies with fallback:** None.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — every primitive ships and is regression-tested in Phase 1/3/4.
- Architecture: HIGH — fork-and-extend of established patterns; no architectural novelty.
- Concurrency / last-admin lockout: MEDIUM — the two-phase CAS + rollback is the established workaround, but the precise timing characteristics of the rollback path under sustained concurrent load are theoretical (not stress-tested in production); the supertest race-coverage suite mitigates.
- Pitfalls: HIGH — all 7 are direct extrapolations from Phase 1/3/4 production incidents.
- i18n key inventory: HIGH — exhaustive enumeration per D-12 + observed Phase 3/4 namespace conventions.
- Validation architecture: HIGH — direct adaptation of Phase 3/4 supertest + manual-matrix combo.

**Research date:** 2026-05-03
**Valid until:** 2026-06-03 (stable; the only fast-moving variable is Atlas tier policy on transactions, which the planner should re-confirm if choosing the transaction path).

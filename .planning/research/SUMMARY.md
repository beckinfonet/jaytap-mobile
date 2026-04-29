# Project Research Summary — M2 "Roles & Moderation"

**Project:** JayTap (Bishkek real-estate, RN 0.84 brownfield, iOS + Android)
**Domain:** Three-role permission system + listing moderation lifecycle + Moderation Queue UI + admin role-management + listing archive on top of an existing app whose nav is a custom `App.tsx` state machine and whose auth is Firebase Identity Toolkit REST + MongoDB role authority on Railway.
**Researched:** 2026-04-29
**Confidence:** HIGH (architectural placement + stack picks); MEDIUM on the parts gated by Railway endpoint shapes Q1–Q12 (collapses to HIGH once Wave-0 sign-off lands).

---

## Executive Summary

M2 closes M1's GATE-05 D-22 Path B accepted-risk row by replacing the hardcoded admin-email allowlist with a server-resolved three-role system (`admin` / `moderator` / `user`) backed by **MongoDB as the role authority** and **Firebase Identity Toolkit REST as identity proof only** — never both. Railway verifies the Firebase ID token via standard JWT/JWKS (`jose@^6.2.3`, no firebase-admin SDK), then looks up `userType` in Mongo. The M1 Phase 3 forward-compat shim (`useRole()` / `can(action)` / `<Gated>`) was deliberately built for this milestone — M2 swaps the **source** of role data (Mongo lookup via verified token) without touching call sites. **Zero new dependencies on the RN client.** Backend adds exactly one runtime dep (`jose`).

Beyond roles, M2 introduces a 4-state listing lifecycle (`pending` / `live` / `rejected` / `archived`) — replacing today's "post = instantly live" model — plus a Moderation Queue, edit-on-behalf-of-owner (reusing the M1-decomposed `CreateListingScreen`), canned rejection reasons with bilingual EN+RU enum codes, and dual-track archive (owner-driven + mod/admin-driven) that coexists with hard-delete (now admin-only). RU-market terminology anchors to Avito/Cian (`На модерации` / `Активно` / `Отклонено` / `Снято с публикации`) for direct user mental-model match.

The single largest schedule risk is the same Railway-team coordination that gated M1: Phase 1 of M2 is dead-on-arrival without a written endpoint-shape sign-off (Q1 + Q2 + Q5 minimum). Mitigation is a hard Wave-0 gate before Phase 1 plans land — same channel as M1's GATE-05 ticket, this time non-deferrable. Top technical risks are JWT verification defects that ship dev-mode bypass, permissive `PATCH /users/me` that lets any user self-promote to admin, and stale role caches that keep demoted moderators with active UI for hours; all three have concrete prevention specs grounded in Firebase official docs.

---

## Key Findings

### Recommended Stack

[Detail: `STACK.md`]

**Core additions (backend only — Railway/Express):**
- `jose@^6.2.3` — Firebase ID-token verification via `createRemoteJWKSet` + `jwtVerify`. Zero runtime deps; cache + rotation handled automatically. **The only new runtime dep M2 strictly requires anywhere in the stack.**
- `zod@^3.24.x` (optional) — Runtime payload validation for moderation/role mutation endpoints. Use only if Railway isn't already validating; pin to v3 (NOT v4 — RHF/RN bug from M1 still applies if shared schemas).

**Core additions (RN client):** **None.** `axios`, `FlatList`, `useState`, `useRole()`, existing modal pattern, `lucide-react-native` icons (`Shield`, `ShieldCheck`, `UserCog`, `Archive`, `Check`, `X` — already available), and existing `<Gated>` shim cover every M2 UI surface.

**Explicit anti-recommendations** (do NOT introduce — REQUIREMENTS.md must list these as out-of-scope guardrails):
- `firebase-admin`, `@react-native-firebase/*`, `firebase` web SDK — **REPO RULE: no Firebase SDK anywhere**. REST/JWKS substitute table is in PITFALLS.md Pitfall 15.
- Firebase **custom claims as role source** — Mongo `userType` is authoritative; custom claims would split source-of-truth.
- `react-navigation` — `App.tsx` boolean state machine stays.
- `react-native-gesture-handler` / `react-native-swipe-list-view` for queue swipe actions — explicit per-row buttons instead; native-module install would risk regressing the M1 Fabric/reanimated/keyboard-controller stack.
- `xstate` / `@xstate/react` — 4-state machine is too small; hand-roll a 30-LOC `canTransition()` pure function in `src/utils/listingStatus.ts`.
- `@tanstack/react-query`, `zustand`, `redux-toolkit` — none in the codebase today; M2 doesn't change that.
- `react-hook-form` + `zod@v4` — RHF/RN bug; reject-reason input is one-field, `useState<string>` is sufficient.
- `passport` / `passport-firebase-jwt` / `express-jwt` / `jsonwebtoken+jwks-rsa` — all worse than `jose` (which `jwks-rsa@4` itself depends on).

### Expected Features

[Detail: `FEATURES.md`]

**Must have (table stakes — all user-locked in PROJECT.md "Current Milestone v2.0"):**
- Server-resolved role on `AuthContext` (closes GATE-05) + foreground re-fetch + 403-retry interceptor (handles demotion mid-session)
- Listing `status` field with 4 states (`pending` / `live` / `rejected` / `archived`); `POST /properties` defaults to `pending`
- Owner sees status pill + rejection reason on My Listings + listing detail; rejected listings show `Ожидает действия` / "Edit & resubmit" CTA (Avito anchor)
- Moderation Queue screen (mod + admin) with FIFO-default sort, per-item Approve / Reject / Edit-on-behalf
- Reject **requires** a reason; canned chips + free-form override; reason is a `reasonCode` enum (translated EN+RU server-side, NOT free-text)
- Edit-on-behalf reuses M1's `CreateListingScreen` with a `moderatorContext` prop (no new editor surface)
- Owner-initiated archive + mod/admin-initiated archive; unarchive routes to `pending` (NOT `live` — prevents post-rejection bypass)
- Admin-only Role Management screen: search users, set `userType` in Mongo (never Firebase); promote-to-moderator, add-admin
- Last-admin lockout protection (server-side rule)
- EN+RU locale parity for ~50–100 new keys (365-key M1 baseline grows accordingly; CI gate enforces)
- Theme/dark-mode parity via `useTheme()` tokens; new status colors derived from existing semantic palette

**Should have (differentiators — recommended for M2 ship, low cost):**
- Foreground role-refresh banner ("Your role changed — tap to reload") — prevents support tickets on demotion
- Owner-side rejection banner on app open + listing-detail "View rejection" CTA
- Pending/rejected/archived deep-link guard on `PropertyDetailsScreen` (one conditional render)
- Optimistic 409 conflict handling for two-mods-on-same-listing (server `findOneAndUpdate({ status: 'pending' })`; client toast + queue refetch)
- `moderationLog` audit collection (append-only, 8 lines of schema, no UI in M2 — data forward-fits future audit screen)

**Defer (M3+ — explicit anti-features, document in REQUIREMENTS.md "Out of Scope"):**
- Automated/AI moderation (image/text classifiers) — Bishkek scale doesn't justify dependency surface
- Full audit log UI (data persisted in M2; UI deferred)
- Formal appeal flow — edit + resubmit covers 95% of cases
- Bulk moderation actions — foot-gun risk at small mod team
- Flag action (5th lifecycle state) — implicit Slack coordination suffices for ≤3 mods
- Email/push notifications on rejection/approval — no push infrastructure exists; in-app banner sufficient
- In-app moderation messaging thread / chat moderation tooling
- Lease-based pessimistic locking — optimistic 409 suffices
- Self-promotion path ("apply to be a moderator")
- Hierarchical permission inheritance — flat `can(action)` predicates from M1 stay flat

### Architecture Approach

[Detail: `ARCHITECTURE.md`]

**Provider tree unchanged.** No new Context for roles — `useRole()` keeps reading from `useAuth().user.backendProfile`; M1's Branch 1 (`customClaims.role` from Mongo lookup) finally gets a real value, and the M1 hardcoded-allowlist branch (`useRole.ts:64-65`) is deleted along with `src/constants/adminAllowlist.ts`.

**Major components:**
1. **`AuthService.getBackendUser()` / `AuthContext`** — Modified additively. New `refreshRole()` callable; bumps `user` reference. No new state. New axios response interceptor: `401 → refresh idToken + retry`, `403 + E_PERMISSION_DENIED → refreshRole() + retry once`.
2. **Shared `apiClient.ts`** — Consolidates the 5 services' `getHeaders()` boilerplate (CONCERNS.md "Duplicated service boilerplate" — Phase 1 is the moment). Switches `x-firebase-uid` → `Authorization: Bearer <idToken>`. Adds Firebase REST refresh-token flow (`securetoken.googleapis.com/v1/token`) with `refreshToken` cached in AsyncStorage.
3. **`ModerationQueueScreen` + `RoleManagementScreen` (+ optional `PromoteUserScreen`)** — New overlay-pattern screens, registered in `OVERLAY_FLAGS` array (M1 Phase 1 derived-overlay pattern), reached via Profile-screen entry-point gated by `<Gated action="viewModerationQueue">` / `<Gated action="manageRoles">`. **Not** added as 6th BottomNav tab (gating churn cost too high; rare-use surface).
4. **`PropertyService` extensions** — `getModerationQueue`, `approveListing`, `rejectListing`, `archiveListing`, `unarchiveListing`, `editAsModerator`. All carry `canFromUser` service-layer guards mirroring M1 Plan 03-04 pattern (defense-in-depth, NOT primary gate).
5. **`propertyStatus.ts` helper** — Single `filterByStatus(props, ['live'])` callsite-shared by Home/Favorites/Renter/Owner list screens. Defensive default `(p.status ?? 'live')` until Q12 confirms server-side migration approach.
6. **`OwnerListingsScreen`** — Heavier modification: 4-tab segmented control (Live / Pending / Rejected / Archived) + per-tab empty states + rejection banner component.
7. **`CreateListingScreen` edit-on-behalf** — New optional `moderatorContext: { editingOwnerUid, reason? }` prop. When set, save dispatches `editAsModerator(propertyId, payload)` instead of `updateProperty`. **No new editor surface.**
8. **`App.tsx` extensions** — 3 new boolean flags added to `OVERLAY_FLAGS` (`isModerationQueueOpen`, `isRoleManagementOpen`, optional `isPromoteUserOpen`). LOC budget: ≤1100 hard ceiling, ≤1050 soft. If approached, carve `ModerationOverlayHost` sub-component.

### Critical Pitfalls

[Detail: `PITFALLS.md` — 15 pitfalls + phase mapping]

Top pitfalls paired with the phase that addresses them:

1. **JWT/JWKS verification defects ship dev-mode bypass to production** (Pitfall 2) — Pin `algorithms: ['RS256']`, `issuer: https://securetoken.google.com/<PROJECT_ID>`, `audience: <PROJECT_ID>`, `clockTolerance: 60`, JWKS cache 6h + rate-limit 5/min, `kid` lookup fail-closed, `auth_time < disabled_at` enforced, **NO `process.env.NODE_ENV` runtime branches near auth code**. Acceptance: 9-case golden-token matrix `(valid|expired|tampered) × (admin|moderator|user)`. **Phase 1.**
2. **Privilege escalation via permissive `PATCH /users/me`** (Pitfall 3) — Field allowlist `pick(body, ['name','phone','preferredLanguage','avatarUrl'])`. Role mutation lives ONLY on `PATCH /users/:id/role` — admin-only AND rejects self-edits AND blocks last-admin demotion. **Phase 1.**
3. **Stale role cache — demoted moderator keeps moderator UI for hours** (Pitfall 4) — Server: 60s in-memory LRU keyed by uid; `roleRevokedAt` timestamp on user record; reject tokens with `iat < roleRevokedAt`. Client: `AppState 'active'` → `refreshProfile()`; 403 with `code: 'role-revoked'` → logout + toast. **Phase 1 (server) + Phase 2 (client).**
4. **App.tsx state-machine god-file regression** (Pitfall 8) — M1 ended at ~941 LOC; M2 spec sets ≤1100 hard ceiling. Every new overlay registered in `OVERLAY_FLAGS` (derive don't store); `pointerEvents` belt-and-suspenders; back-handler dep array ≤25 (refactor to refs/`useReducer` if larger); discrete `moderationOverlay: 'closed'|'queue'|'detail'|'rejecting'|'editing'` discriminated union beats 5 booleans. **Cross-cutting — every phase that touches App.tsx.**
5. **Migration miss — M1 hardcoded admins lose admin access at M2 cut** (Pitfall 9) — `db.users.updateMany({ email: { $in: <M1 hardcoded allowlist> } }, { $set: { userType: 'admin' } })` MUST run as Wave-0 of Phase 1 BEFORE M2 ships. PROJECT.md "clean slate" claim covers listings only; users existed in TestFlight + Play Console populations. **Phase 1 Wave-0 (single Mongo update).**
6. **Race conditions in moderation queue** (Pitfall 5) — Server `findOneAndUpdate({ _id, status: 'pending' }, ...)` returns null on race → 409 Conflict. Client: localized EN+RU "already moderated by another reviewer" toast + queue refetch. No optimistic remove-from-queue. **Phase 3 (paired actions + queue UI).**
7. **Owner-side communication failure — rejected listing has no clear reason in user's language** (Pitfall 7) — Reason is a structured `reasonCode` enum (`not-bishkek` / `incomplete-info` / `prohibited-content` / `duplicate` / `policy-violation` / `other`) translated server-side to the **owner's locale** at view time, NOT moderator's locale at action time. Three rendering surfaces: Listing Detail banner + Owner Listings status chip + persistent Home banner until viewed. Moderator identity NEVER exposed to owner ("JayTap moderator" generic). **Phase 2 (display) + Phase 3 (action).**
8. **Firebase-SDK temptation** (Pitfall 15) — Tutorials default to `firebase-admin.auth().verifyIdToken()` and `setCustomUserClaims()`. PROJECT.md REPO RULE: NO Firebase SDK. Wave-0 invariant grep gates: `! grep -r 'firebase-admin' backend/` and `! grep -r '@react-native-firebase' src/`. Substitution table reproduced into Phase 1 CONTEXT.md. **Wave-0 of every backend phase.**

---

## Implications for Roadmap

Build order is load-bearing — same lesson as M1. **Wave-0 backend coordination is non-deferrable.**

### Phase 0 (Wave-0) — Railway endpoint sign-off
**NOT a numbered phase** — a hard gate before Phase 1 plans land. Railway team confirms Q1–Q12 (see "Backend Coordination Unknowns" below). Spec the endpoint shapes ourselves; send to Railway for approval rather than ask them to author. Mitigation decision-tree if Railway is unresponsive >5 days late: ship UI complete with explicit "Backend role enforcement pending — honor-system" banner (better than M1 D-22's silent accepted risk); >10 days late: descope `edit-on-behalf` + `flag`, ship `approve`/`reject`/`archive` only.

### Phase 1 — Backend role-resolution + axios auth migration (FOUNDATION)
**Rationale:** Every M2 phase needs working server-resolved roles. Smallest reversible change set — pure infrastructure migration, no UI. Closes M1 GATE-05 D-22 Path B accepted-risk row.
**Delivers:** `jose` JWKS verifier middleware on Railway; `Authorization: Bearer <idToken>` migration on all 5 services via shared `apiClient.ts`; Firebase REST refresh-token flow in `AuthService`; 401/403 axios interceptors; `AuthContext.refreshRole()`; M1 hardcoded-allowlist branch deleted along with `src/constants/adminAllowlist.ts`; M1-allowlist-to-Mongo migration script run.
**Addresses (FEATURES):** ROLE-01/02/03; ADMIN-03 server-side last-admin guard.
**Avoids (PITFALLS):** 1, 2, 3, 4 (server side), 9, 15.
**Dependencies:** Q1 + Q2 + Q5 + Q12 confirmed.

### Phase 2 — Listing lifecycle status field (CLIENT-SIDE ABSORPTION)
**Rationale:** Pure client-side rendering migration. Doesn't need queue UI yet. Owner-side rejection messaging reads naturally once OwnerListings supports the tab grouping.
**Delivers:** `Property.status` type extension + moderation/rejection timestamp fields; `propertyStatus.ts` helper; Home/Favorites/RenterListings filter to `live` (3 × 2-line edits); OwnerListings 4-tab segmented control + per-tab empty states + rejection banner; `PropertyCard` status-badge slot + rejection-banner slot; deep-link guard on `PropertyDetailsScreen` for non-live statuses; client `AppState 'active'` role-refresh hook.
**Addresses (FEATURES):** MOD-01/02/03; ROLE-03 client side; foreground role-refresh banner; owner-side rejection banner.
**Avoids (PITFALLS):** 4 (client), 7, 12 (locale parity for status labels — Avito-anchored RU).
**Dependencies:** Q2 + Q3 confirmed; Phase 1 shipped.

### Phase 3 — Moderation Queue + actions (NEW UI MASS)
**Rationale:** Largest UI net-add. Builds on Phase 2's status field landing.
**Delivers:** `ModerationQueueScreen` overlay; `RejectListingModal` (canned chips + free-text); `PropertyService.getModerationQueue/approveListing/rejectListing` with `canFromUser` guards + 409 conflict handling; profile-screen entry-point gated by `<Gated action="viewModerationQueue">`; `App.tsx` `OVERLAY_FLAGS` extension + back-handler branch; edit-on-behalf via `moderatorContext` prop on `CreateListingScreen` (queue-pop + queue-restore on close); `Action` union extends with `approveListings`/`rejectListing`/`viewModerationQueue`/`editAnyListing`; **`moderationLog` collection** (append-only audit, no UI).
**Addresses (FEATURES):** MOD-04/05/06/09; canned rejection reasons enum; FIFO sort; tour-first hospitality preserved (queue reuses existing `PropertyCard` / `HospitalityCard`).
**Avoids (PITFALLS):** 5, 6, 10, 14 (idempotency + axios timeouts).
**Dependencies:** Q3 + Q4 + Q6 + Q8 + Q10 confirmed; Phase 2 shipped.

### Phase 4 — Archive lifecycle (OWNER + ADMIN)
**Rationale:** Builds on Phase 2 status + Phase 3 endpoint patterns. Optional from a "does moderation work" standpoint but PROJECT.md scopes it in.
**Delivers:** `ArchiveListingModal` (confirm with reversibility note); `PropertyService.archiveListing/unarchiveListing` (owner self vs. mod/admin force variants); `PropertyCard` Archive (owner) + Restore (archived-tab) actions; `PropertyDetailsScreen` Archive CTA in owner-footer; hard-delete `Action: 'hardDeleteListing'` becomes admin-only; `useRole.ts` adds `archiveOwnListing`/`archiveAnyListing`/`hardDeleteListing`; OwnerListings Archived tab + Restore action. **Unarchive routes to `pending`, not `live`** (prevents post-rejection bypass).
**Addresses (FEATURES):** ARCH-01/02/03.
**Avoids (PITFALLS):** 11.
**Dependencies:** Q7 + Q8 confirmed; Phases 2 + 3 shipped.

### Phase 5 — Role management (ADMIN UIs)
**Rationale:** Useful but doesn't gate any other phase. Roles can be assigned via direct Mongo writes for a 1-2 moderator wave (analogous to M1's hardcoded allowlist mechanism).
**Delivers:** `RoleManagementScreen` (search/list users, change `userType`, view current role); `UserService.ts` (`searchUsers`, `setUserRole`, optional `getRoleAuditLog`); profile entry-point gated by `<Gated action="manageRoles">`; `Action: 'promoteToModerator'` / `'addAdmin'` activated; `App.tsx` flag + `OVERLAY_FLAGS` extension; **last-admin lockout enforced server-side**; **PROMOTE-self / DEMOTE-self prevented server-side**.
**Addresses (FEATURES):** ADMIN-01/02; ADMIN-03 client surface.
**Avoids (PITFALLS):** 3 (client surface for `PATCH /users/:id/role`).
**Dependencies:** Q9 + Q11 confirmed; Phase 1 shipped. Can parallel Phase 4.

### Phase 6 — Hardening + manual QA + release
**Rationale:** Standard release-prep. Mirrors M1 Phase 8.
**Delivers:** 401/403 interceptor stress-tests; mod-revoked-mid-session UX validation (queue auto-pops); owner-edits-rejected → resubmits → mod approves end-to-end on physical iOS + Android; admin-promotes-mod → mod's open app picks up new role on next 403; archived → restore → re-enters pending; rejected listing edit-on-behalf; release version bumps. **Apply M1 D-02 lesson: query Play Console + TestFlight for highest-accepted versionCode BEFORE setting baseline** (Key Decisions row added 2026-04-28); App.tsx LOC budget verification ≤1100; locale-parity CI green; "Looks Done But Isn't" 20-item checklist (PITFALLS.md).
**Addresses:** Cross-cutting validation.
**Avoids (PITFALLS):** 8 (LOC budget enforcement), 12 (per-screen EN+RU walks), 13 (seed users documented), 14 (airplane-mode recovery).
**Dependencies:** Phases 1–5 shipped.

### Phase Ordering Rationale

- **Backend MUST lead.** Lesson from M1 GATE-05 D-22: do NOT proceed past Phase 1 without Railway endpoint sign-off, because every later phase compounds the risk.
- **Status field absorption (Phase 2) before Queue UI (Phase 3)** — Phase 2 is pure client filter migration; Phase 3 depends on the field existing AND on Phase 1's role-aware endpoints.
- **Archive (Phase 4) and Role Management (Phase 5) can parallel** — different surface areas, different services. Recommend serial for small-team test-surface bounding.
- **Hardening last** — same as M1 Phase 8.

### Skipped from M1 build order
- Nav reliability — already shipped M1 Phase 1; M2 just extends `OVERLAY_FLAGS`.
- Universal keyboard — already shipped M1 Phase 2; reuse for any new inputs (RoleManagement search box, RejectListing textarea).
- Form taxonomy + validation — already shipped M1 Phase 4+5; edit-on-behalf reuses verbatim.
- Hospitality rendering — orthogonal to M2.
- Alignment pass — only run if QA surfaces issues (M1 Phase 7 was SKIPPED for the same reason).

### Research Flags

**Likely needs deeper research during planning:**
- **Phase 1** — `jose` Firebase JWKS verifier reference is in STACK.md but Railway-team's existing express middleware patterns are unknown; may need a brief `/gsd-research-phase` on backend test fixture setup (golden token capture).
- **Phase 3** — Concurrent-mod 409 + reason-draft-AsyncStorage-persistence is novel surface; manual-QA matrix needs design (single-device vs two-device).

**Standard patterns (skip phase research):**
- **Phase 2** — Pure client filter migration; M1 patterns sufficient.
- **Phase 4** — Modal + status transition; M1 `DeleteListingModal` is template.
- **Phase 5** — `FlatList` + search; M1 `OwnerListingsScreen` is template.
- **Phase 6** — Release-prep mirror of M1 Phase 8.

---

## Backend Coordination Unknowns (Wave-0 gate)

**Route via existing `03-BACKEND-COORDINATION.md` channel that GATE-05 D-22 deferred.** Phase 1 is dead-on-arrival without Q1, Q2, Q5 minimum.

| Q | Question | Phase that needs it |
|---|----------|---------------------|
| Q1 | Role authority + customClaims contract — does `GET /auth/users/:uid` populate both `userType` and `customClaims.role`, or only one? When admin promotes via `PUT /users/:uid/role`, which field does Railway write? | Phase 1 |
| Q2 | `Property.status` schema + defaults — confirm `status` / `rejectionReason` / `rejectedAt` / `rejectedBy` / `moderatedAt` / `moderatedBy` / `archivedAt` / `archivedBy` shape; existing-listings default approach (server `default: 'live'` vs. client `?? 'live'` belt-and-suspenders); is `rejectedBy` exposed to listing owner or admin-only? | Phase 1 + 2 |
| Q3 | `POST /properties` becomes "submit for review" — confirm backend sets `status: 'pending'` going forward; does `GET /properties` filter `status: 'live'` server-side for renters and full-set for mod/admin, or does client send `?status=live` explicitly? Does `GET /properties/user/:uid` return all statuses for owner? | Phase 2 + 3 |
| Q4 | Moderation Queue endpoint — `GET /properties?status=pending` vs. dedicated `GET /moderation/queue`? Preference: dedicated for cleaner role-gating + future flag-state metadata. | Phase 3 |
| Q5 | idToken refresh + token expiry contract — Railway verifies via JWKS (no firebase-admin) confirmed? Refreshed idToken accepted without handshake? Token-expiry returns `401 token-expired` (refresh+retry) vs. `403 forbidden` (semantic mismatch)? | Phase 1 |
| Q6 | Edit-on-behalf endpoint — dedicated `PUT /moderation/listings/:id` (clarity) vs. shared `PUT /properties/:id` with header/flag? Does NOT mutate `ownerUid`. Server-side audit row required (moderatorUid, fieldsChanged, optional reason). | Phase 3 |
| Q7 | Archive transitions — `POST /properties/:id/archive` + `POST /properties/:id/unarchive` (or `restore`)? **Critical UX:** unarchive returns to `pending` (re-moderated) vs. prior status — recommended `pending`. Hard-delete `DELETE /properties/:id` admin-only post-M2? | Phase 4 |
| Q8 | Audit trail visibility — `GET /admin/audit?type=role_change&uid=:uid` + `GET /admin/audit?type=moderation&propertyId=:id` exposed? Or DB-inspection only? | Phase 3 + 5 |
| Q9 | User search for role management — `GET /admin/users?query=email_or_name&limit=50` + `GET /admin/users?role=moderator` + `PUT /admin/users/:uid/role`? Admin-only prefix `/admin/*`? Foreseeable user count (pagination vs. simple search-50)? | Phase 5 |
| Q10 | Rate limits + abuse prevention — server-side rate limits per uid (e.g., 100 approvals/min)? `429` response shape? Server-side dedup or client-side debounce? | Phase 3 |
| Q11 | Notification of role change to affected user — Railway has no socket-pushed `role_changed` plans (confirm)? 403-retry interceptor is the implicit notification. If Railway wants push, piggyback existing `ChatService.connectSocket`? | Phase 1 + 5 |
| Q12 | Migration of existing dev-environment listings — Railway plans one-time `status: 'live'` script vs. read-time default? Plus: **users without `userType`** (NOT clean-slate per Pitfall 9) — Wave-0 Mongo update setting M1 hardcoded admins to `userType: 'admin'`. | Phase 1 Wave-0 |

---

## RU-Market Anchor

Bishkek users almost certainly have prior Avito/Cian exposure. Use established Russian terminology to eliminate translation-friction bugs where moderator UI says one thing and owner banner says another. **State labels:** `pending` → «На модерации» (Avito/Cian shared), `live` → «Активно» (both), `rejected` → «Отклонено» (both), `archived` → «Снято с публикации» (preferred — Avito's archive-vs-delete distinction; better than Cian's bare «Архив»). Borrow Avito's `Ожидает действия` ("Awaiting action") badge on rejected cards with «Исправить» ("Fix") CTA — this is the same UX as the Drupal-grounded "Edit & resubmit" pattern; citing Avito anchors it for RU users. Action verbs: archive button = «Снять с публикации»; delete button (admin only) = «Удалить»; canned rejection reasons rendered as translated enum keys. EN labels stay flexible — EN-speaking landlord/agent segment doesn't have a fixed lexicon. (Detail: `FEATURES.md` § "RU-Market Reference Anchor".)

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | `jose` over alternatives — Firebase official docs + jose docs + jwks-rsa@4 itself depending on jose all converge. RN-side zero-deps grounded in M1 forward-compat shim direct repo evidence. |
| Features | HIGH | Moderation/RBAC/lifecycle patterns mature across Drupal/Reddit/Vrbo/Rentec; RU-market anchor verified against Avito/Cian official + complaint-thread sources. MEDIUM only on mobile-specific gesture choices (swipe vs buttons) — defer to existing JayTap conventions where ecosystem is silent. |
| Architecture | HIGH for placement (Context tree, OVERLAY_FLAGS, useRole shape, PropertyService HTTP shape — all follow M1 patterns); MEDIUM for endpoint contracts (collapses to HIGH once Q1–Q12 land). |
| Pitfalls | HIGH — most grounded in this codebase's CONCERNS.md, RETROSPECTIVE.md, and M1 D-22 record; JWKS specifics verified against Firebase official + Auth0 jwks-rsa docs. |

**Overall confidence:** HIGH (with one MEDIUM dependency: Railway-team Wave-0 sign-off — this is the single largest schedule risk for M2, mitigated by spec'd decision-tree).

### Gaps to Address

- **Railway endpoint sign-off** — All 12 Q's must close at Wave-0 of Phase 1. Decision-tree spec'd for >5-day and >10-day late scenarios so crisis decisions are made cold.
- **Mongo ODM not specified** — Railway repo's choice (mongoose vs. native driver vs. Prisma) is unknown to JayTap repo; backend recommendations deliberately scoped to "what's strictly new" (`jose`, optional `zod@v3`).
- **Test-account seed strategy** — Pitfall 13 — needs documented seed users (qa-admin@jaytap.test / qa-mod@jaytap.test / qa-user@jaytap.test) in TESTING.md before Phase 1 close, so cross-role manual QA is repeatable.
- **App.tsx LOC budget** — Hard ceiling 1100 / soft 1050. If approached mid-phase, carve `ModerationOverlayHost` sub-component rather than blow the budget.
- **`reasonNote` free-text language hint** — UX-only nudge ("Owner's preferred language: RU. Write in Russian for clarity"). Server doesn't translate; M2 acceptance: 80% of rejections use enum-only.

---

## Sources

### Primary (HIGH confidence)
- `.planning/research/STACK.md` — Stack picks + anti-recommendations
- `.planning/research/FEATURES.md` — Table stakes / differentiators / anti-features + RU-market anchor
- `.planning/research/ARCHITECTURE.md` — §8 Build Order + §9 Backend Coordination Q1–Q12
- `.planning/research/PITFALLS.md` — 15 critical pitfalls + pitfall-to-phase mapping
- `.planning/PROJECT.md` § "Current Milestone v2.0 M2 Roles & Moderation" — user-locked scope + hard rules
- `.planning/codebase/CONCERNS.md` — "Firebase uid used as sole auth", "App.tsx god-file (941 lines)", "Duplicated service boilerplate", "No push notifications", "Effectively zero tests"
- `.planning/RETROSPECTIVE.md` — Lesson 1 generalized: verify backend dependency state in Wave-0
- [Firebase: Verify ID Tokens (REST/JWKS path)](https://firebase.google.com/docs/auth/admin/verify-id-tokens)
- [jose docs / panva GitHub](https://github.com/panva/jose) + Discussion #626 (Firebase JWT verification example)

### Secondary (MEDIUM confidence)
- Drupal Workflow Moderation docs — closest shape to JayTap M2 (states + role-gated transitions + canned reasons + edit-on-behalf)
- Reddit modqueue research (arxiv 2509.07314) — concurrent-mod collision behavior; FIFO/middle/reverse-order self-organization
- Vrbo / Rentec Direct / CommercialRealEstate.com.au — real-world property-listing archive UX
- Avito / Cian RU-market state names + complaint-thread sources (vc.ru, elama.ru, ppc.world, support.cian.ru)
- WCVendors / Logic.inc — vendor-facing review suggestions inline on edit; canned rejection reason throughput wins

### Tertiary (LOW confidence — needs validation during planning)
- Mobile-specific moderation queue UX (swipe vs. buttons) — Western platforms documented for web admin dashboards, less codified for mobile mod UIs; chose buttons-per-row for native-module avoidance
- Self-moderation prevention server rule — recommended but not user-locked; Phase 3 may need explicit confirmation

---

*Research synthesized: 2026-04-29 — M2 v2.0 "Roles & Moderation"*
*Replaces M1-era SUMMARY.md (2026-04-22, archived implicitly via M1 milestone close)*
*Ready for REQUIREMENTS.md + ROADMAP.md: yes (pending Wave-0 Railway sign-off for Phase 1 plans)*

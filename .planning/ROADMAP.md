# Roadmap: JayTap

## Milestones

- ✅ **M1 v1.0.4 "Polish + Hospitality"** — 8 phases (shipped 2026-04-28) — see [milestones/v1.0.4-ROADMAP.md](milestones/v1.0.4-ROADMAP.md)
- 🚧 **M2 v2.0 "Roles & Moderation"** — 6 phases (active; planning started 2026-04-29)

## Phases

<details>
<summary>✅ M1 v1.0.4 "Polish + Hospitality" (Phases 1–8) — SHIPPED 2026-04-28</summary>

- [x] Phase 1: Nav Reliability (6/6 plans) — completed 2026-04-22
- [x] Phase 2: Universal Keyboard Handling (6/6 plans) — completed 2026-04-23
- [x] Phase 3: Role Gating Precursor (7/7 plans) — completed 2026-04-23
- [x] Phase 4: Listing Form Taxonomy & Decomposition (6/6 plans) — completed 2026-04-24
- [x] Phase 5: Listing Form Validation & Edit Flow (5/5 plans) — completed 2026-04-24
- [x] Phase 6: Hospitality Rendering (7/7 plans) — completed 2026-04-25
- [x] Phase 7: Alignment Pass (0/0 plans, SKIPPED) — closed 2026-04-28 (PROJECT.md row 129)
- [x] Phase 8: Release & Store Submission (5/5 plans) — completed 2026-04-28

</details>

### 🚧 M2 v2.0 "Roles & Moderation" (Active)

- [ ] **Phase 1: Backend Role Foundation + Auth Migration + Hotfix Bundle** — JWKS verification middleware on Railway, single role-aware auth middleware (collapses 5 inline copies), `Authorization: Bearer` migration on all 5 services, Firebase REST refresh-token flow, `GET /api/auth/me`, 401/403 axios interceptors, `AuthContext.refreshRole()`, `roleRevokedAt` invariant, M1-allowlist-to-Mongo migration, foreground role-refresh banner, hotfix bundle (HF-01 schema patch + HF-02 secret rotation + HF-03 UID-spoof close + HF-04 socket.io auth)
- [ ] **Phase 2: Listing Lifecycle Status Field Absorption** — `Property.status` enum + timestamp fields, `propertyStatus.ts` helper, Home/Favorites/RenterListings filter to `live`, OwnerListings 4-tab segmented control, status pills (Avito-anchored RU labels), deep-link guard, owner-side rejection banner, `AppState 'active'` role-refresh hook
- [ ] **Phase 3: Moderation Queue + Actions + Edit-on-Behalf** — `ModerationQueueScreen` overlay, `RejectListingModal` (4-code canned chips + free-text), `PropertyService` extensions with `canFromUser` guards + 409 conflict handling, profile entry-point gated by `<Gated action="viewModerationQueue">`, `OVERLAY_FLAGS` extension, edit-on-behalf via `moderatorContext` prop, `moderationLog` collection
- [ ] **Phase 4: Archive Lifecycle (Owner + Mod/Admin)** — `ArchiveListingModal`, `archiveListing`/`unarchiveListing` service methods, PropertyCard archive action, OwnerListings Archived tab + Restore action (routes to `pending`), hard-delete becomes admin-only, `Action` union extends with `archiveOwnListing`/`archiveAnyListing`/`hardDeleteListing`
- [ ] **Phase 5: Admin Role Management UI** — `RoleManagementScreen`, `UserService.ts` (`searchUsers`, `setUserRole`), profile entry-point gated by `<Gated action="manageRoles">`, server-side last-admin lockout + self-mutation prevention, `roleChangeLog` audit collection
- [ ] **Phase 6: Hardening + Manual Physical-Device QA + Release** — Cross-cutting role/moderation/archive/admin QA matrix on iPhone 15 Pro Max + Moto G XT2513V; bilingual EN+RU release notes; v2.0.0 atomic version bump (apply M1 D-02 lesson — query Play Console + TestFlight history BEFORE setting baseline); ASC + Play Console submission

## Phase Details

### Phase 1: Backend Role Foundation + Auth Migration + Hotfix Bundle

**Goal**: Replace M1's hardcoded admin-email allowlist with a server-resolved three-role system backed by MongoDB as the role authority, migrate all 5 backend services to JWKS-verified Bearer tokens, and close four security/data-integrity bugs surfaced during backend review — without adding any Firebase SDK to either repo.
**Depends on**: Nothing (foundation phase; closes M1 GATE-05 D-22 Path B)
**Requirements**: HF-01, HF-02, HF-03, HF-04, ROLE-01, ROLE-02, ROLE-03, ROLE-04, ROLE-05, ROLE-06, ROLE-07, ROLE-08, ROLE-09, ROLE-10, ROLE-11
**Success Criteria** (what must be TRUE):
  1. Backend rejects every protected request without a JWKS-verified `Authorization: Bearer <idToken>` (returns 401 for missing/expired/tampered tokens; legacy `x-firebase-uid` header is no longer trusted on any of the 5 services — auth, property, favorite, chat, appointment)
  2. A demoted user's app picks up the new role within 60s of their next protected request — `roleRevokedAt` invariant rejects tokens with `iat < roleRevokedAt`, axios 403 interceptor calls `AuthContext.refreshRole()` + retries once, and the foreground role-refresh banner ("Your role changed — tap to reload" / «Ваша роль изменилась — нажмите для перезагрузки») surfaces
  3. The `src/constants/adminAllowlist.ts` file is deleted from the RN client and `useRole.ts:64-65` no longer references the email-allowlist branch — yet M1 hardcoded admins (currently `beckprograms@gmail.com`) still resolve as `userType: 'admin'` via the Mongo migration that ran BEFORE the allowlist file was removed
  4. A Hospitality listing roundtrip preserves all of `rooms`, `maxGuests`, and the 12-amenity selections after a save→fetch cycle (HF-01 schema patch verified empirically — `Property` Mongoose schema no longer silently drops these fields)
  5. Backend `.env` is no longer git-tracked, MongoDB Atlas password + AWS IAM credentials are rotated and old keys revoked, `.env.example` is checked in, and Railway deploys via Railway-set env vars (no committed secrets remain in the repo at `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services`)
**Plans**: 13 plans
  - [ ] 01-01-PLAN.md — Wave-0 HF-02 secret rotation runbook + .env.example
  - [ ] 01-02-PLAN.md — Wave-0 HF-01 Property schema + route patch (rooms, maxGuests, amenities)
  - [ ] 01-03-PLAN.md — Wave-1 backend test infra (jest+supertest+mongo-memory) + jose install + shared firebase.js JWKS singleton
  - [ ] 01-04-PLAN.md — Wave-2 User schema additive roleRevokedAt (enum cutover deferred to Plan 09)
  - [ ] 01-05-PLAN.md — Wave-3 verifyFirebaseToken middleware (TDD: 9-case golden token matrix + ROLE-11 + requireMinRole)
  - [x] 01-06-PLAN.md — Wave-4 5-service auth migration: HF-03 lockdown on POST /users + GET /me + propertyRoutes/favoriteRoutes/chatRoutes/appointmentRoutes mount + chatAuthMiddleware deletion — completed 2026-04-30 (4 commits: c08b5d8 RED, 6f90f6d GREEN HF-03+ROLE-08, 8edd68e property+favorite, 03b382a chat+appointment+chatAuthMiddleware delete; 39/39 tests green; 5 inline auth blocks removed; 2 Rule-1 + 1 Rule-2 deviations documented)
  - [x] 01-07-PLAN.md — Wave-4 HF-04 socket.io io.use() handshake (verified-only user room join) — completed 2026-04-30 (commit `4d0a07a feat(socket): HF-04 io.use JWKS handshake + verified-only room join [HF-04]`; index.js +66/-3; single shared JWKS singleton via `require('./src/config/firebase')`; T-1-05 mitigated; D-04 dual-accept legacy path observable-only with `evt: 'legacy_socket_handshake'` log stream; 39/39 backend tests green; zero deviations)
  - [ ] 01-08-PLAN.md — Wave-5 [BLOCKING] migrate-roles-m2.js + production migration --verify=PASS
  - [x] 01-09-PLAN.md — Wave-6 User.js enum cutover ['user','moderator','admin'] + tests update — completed 2026-04-30 (3 backend commits: 9550235 schema cutover + tests, a0258f5 authRoutes default + regression, e9e52f7 verifyFirebaseToken seed flip; 42/42 tests green up from 39; 2 Rule-1 deviations documented — plan-prescribed HTTP regression test was unreachable due to verifyFirebaseToken's pre-handler 404, pivoted to source-literal assertion)
  - [x] 01-10-PLAN.md — Wave-7 Client types (AuthUser) + apiClient.ts (Bearer + 401/403 single-flight) + AuthService.refreshIdToken + AuthContext.refreshRole — completed 2026-04-30 (4 RN-client commits: 49a767a Auth.ts types, 13405e7 apiClient + AuthService.refreshIdToken, c7e0e1e AuthContext refreshRole + AuthUser typing + registerAuthHooks 3-hook wiring, f2f9145 chore deferred-items.md; +359/-33 across 4 source files; CONCERNS.md "Auth user type is `any`" closed; ROLE-09 final-fallback wired client-side; whole-project tsc only has pre-existing ThemeContext.tsx errors logged out-of-scope; manual smoke tests deferred to Plan 11/12 integration window)
  - [ ] 01-11-PLAN.md — Wave-8 5-service Bearer migration + ChatService socket auth.token (HF-04 client side)
  - [ ] 01-12-PLAN.md — Wave-8 RoleRefreshBanner + locale keys + theme palette extension + App.tsx mount + hard-logout toast
  - [ ] 01-13-PLAN.md — Wave-9 useRole.ts allowlist branch deletion + adminAllowlist.ts deletion (LAST step of phase per Pitfall 5)

### Phase 2: Listing Lifecycle Status Field Absorption

**Goal**: Replace the "post = instantly live" model with a 4-state listing lifecycle (`pending` / `live` / `rejected` / `archived`) — surfaced to renters as filtering, to owners as a tab grouping with rejection messaging, and to mods/admins as deep-link visibility — without yet adding the Moderation Queue UI.
**Depends on**: Phase 1 (server-resolved roles + role-aware endpoints)
**Requirements**: MOD-01, MOD-02, MOD-03, MOD-04, MOD-05, MOD-06, MOD-07, MOD-08, MOD-09
**Success Criteria** (what must be TRUE):
  1. A renter on Home / Favorites / RenterListings sees only `status: 'live'` listings; existing legacy listings without a `status` field continue to render (server `default: 'live'` OR client `?? 'live'` belt-and-suspenders, decided at Phase 2 discuss)
  2. An owner submitting a new listing via `CreateListingScreen` sees the listing land in their OwnerListings "Pending" tab (NOT immediately public); switching tabs (Live / Pending / Rejected / Archived) filters their listings correctly with per-tab empty states; tour-first Hospitality cards render in every tab
  3. A non-live listing returns 404 to a non-owner-non-mod via `GET /api/properties/:id` deep-link (preventing pending/rejected/archived bypass), but is visible to its owner and to any moderator/admin
  4. A rejected listing shows an `<RejectionBanner>` on PropertyDetailsScreen (localized `reasonCode` + optional `reasonNote` + "Edit & resubmit" / «Исправить» CTA, dismissible per-session); a persistent rejection banner shows on Home when the owner has any rejected listings, auto-dismissing once all rejected listings are edited or archived
  5. Status pill labels render correctly in EN+RU on PropertyCard for non-live statuses (`pending` → «На модерации»; `rejected` → «Отклонено»; `archived` → «Снято с публикации»; pill colors derive from `useTheme()` semantic palette); `serviceAreas` config is in place defaulting to `['Bishkek']` for the M2 launch market
**Plans**: TBD
**UI hint**: yes

### Phase 3: Moderation Queue + Actions + Edit-on-Behalf

**Goal**: Give moderators and admins a dedicated overlay screen to review pending listings, with approve / reject / edit-on-behalf actions, canned bilingual rejection reasons, and race-condition-safe handling for two-mods-on-the-same-listing — reusing the M1-decomposed `CreateListingScreen` for edit-on-behalf rather than building a second editor.
**Depends on**: Phase 2 (status field + role-aware endpoints already in place)
**Requirements**: MOD-10, MOD-11, MOD-12, MOD-13, MOD-14, MOD-15, MOD-16, MOD-17, MOD-18
**Success Criteria** (what must be TRUE):
  1. A moderator (or admin) reaches `ModerationQueueScreen` via the Profile entry-point gated by `<Gated action="viewModerationQueue">`; the screen mounts as an overlay flag in `App.tsx OVERLAY_FLAGS` (NOT a 6th BottomNav tab), lists `status: 'pending'` listings FIFO-sorted by `submittedAt`, and is invisible to plain users
  2. Approve is a confirmed single-tap action; Reject opens a modal requiring a `reasonCode` from the 4-value enum (`incomplete-info`, `prohibited-content`, `out-of-service-area`, `other`) plus optional free-text `reasonNote`; Edit-on-behalf opens `CreateListingScreen` with a `moderatorContext: {editingOwnerUid, reason?}` prop and dispatches `editAsModerator` (NOT `updateProperty`) on save without mutating `ownerUid`
  3. When two moderators act on the same listing concurrently, the loser receives a 409 Conflict with `code: 'ALREADY_MODERATED'`, the client shows a localized EN+RU "This listing was already reviewed by another moderator." / «Это объявление уже рассмотрено другим модератором.» toast, and the queue refetches automatically
  4. The owner of a rejected listing sees a banner with their rejection reason translated into THEIR locale (not the moderator's locale); the banner reads "JayTap moderator" / «Модератор JayTap» generically and never exposes the moderator's identity
  5. Every approve / reject / edit-on-behalf action writes an append-only audit row to the `moderationLog` Mongo collection with `{actorUid, action, targetType: 'property', targetId, before, after, reasonCode?, reasonNote?, at}` (no M2 UI; data forward-fits a future M3+ audit screen); the 4 new endpoints (`GET /api/moderation/queue`, `POST /api/properties/:id/approve`, `POST /api/properties/:id/reject`, `PUT /api/moderation/listings/:id`) all enforce role ≥ moderator server-side via the JWKS middleware
**Plans**: TBD
**UI hint**: yes

### Phase 4: Archive Lifecycle (Owner + Mod/Admin)

**Goal**: Let owners archive their own listings without a reason, let mods/admins archive any listing with a structured reason, and route restoration through `pending` (preventing post-rejection bypass) — while making hard-delete admin-only.
**Depends on**: Phase 2 (status field) + Phase 3 (endpoint + audit-log patterns)
**Requirements**: ARCH-01, ARCH-02, ARCH-03, ARCH-04, ARCH-05
**Success Criteria** (what must be TRUE):
  1. An owner can archive their own listing from the PropertyCard menu and from the PropertyDetailsScreen action footer without specifying a reason (status transitions from any value to `archived`; `archivedReasonCode` is null); a moderator/admin can archive any listing via `<Gated action="archiveAnyListing">` requiring a structured `reasonCode` plus optional `reasonNote`, and the action is audit-logged
  2. Archived listings are hidden from public list views (Home / Favorites / RenterListings) and from PropertyDetailsScreen for non-owners-non-mods, but remain visible to the owner under OwnerListings "Archived" tab and to mods/admins via the moderation surface
  3. Restoring an archived listing transitions status to `pending` (re-moderated) — NOT back to its prior status — preventing the "owner archives a rejected listing then unarchives to dodge moderator review" bypass; restoration affordance is available to whoever has rights to archive (owner for self-archived; mod/admin for any)
  4. Hard-delete (`DELETE /api/properties/:id`) is admin-only; the `<Gated action="hardDeleteListing">` affordance shows on PropertyDetailsScreen footer for admins and is hidden for everyone else (owners, moderators, plain users); the `useRole.ts` `Action` union has been extended with `archiveOwnListing`, `archiveAnyListing`, `hardDeleteListing`
**Plans**: TBD
**UI hint**: yes

### Phase 5: Admin Role Management UI

**Goal**: Give admins an in-app screen to search users by email and change any user's `userType` between `user` / `moderator` / `admin`, with server-side guardrails (last-admin lockout, self-mutation prevention) and an append-only audit trail.
**Depends on**: Phase 1 (server-resolved roles + JWKS middleware). Can run in parallel with Phase 4; recommend serial execution for small-team test-surface bounding.
**Requirements**: ADMIN-01, ADMIN-02, ADMIN-03, ADMIN-04, ADMIN-05, ADMIN-06, ADMIN-07
**Success Criteria** (what must be TRUE):
  1. An admin reaches `RoleManagementScreen` via the Profile entry-point gated by `<Gated action="manageRoles">`; the screen mounts as an overlay flag in `App.tsx OVERLAY_FLAGS`, supports email-substring search, and shows current `userType` per user; the entry-point is hidden for moderators and plain users
  2. An admin can change any user's `userType` to any of `user` / `moderator` / `admin`; the change triggers ROLE-11 (`roleRevokedAt = now`) on the target user, propagating the new role to the target's app within 60s of their next protected request
  3. Server-side guardrails reject (a) any role mutation that would result in zero admins (last-admin lockout returns 409 with clear error) and (b) any admin's attempt to mutate their own `userType` (self-mutation prevention returns 403 even if the requester is admin)
  4. Every successful role change writes an append-only audit row to the `roleChangeLog` Mongo collection with `{actorUid, targetUid, fromRole, toRole, at}`; new admin-only endpoints (`GET /api/admin/users?query=<email>&limit=50`, `PATCH /api/admin/users/:uid/role`) verify role server-side via the JWKS middleware
**Plans**: TBD
**UI hint**: yes

### Phase 6: Hardening + Manual Physical-Device QA + Release

**Goal**: Cross-cutting validation of every M2 surface (role transitions, moderation actions with race-condition coverage, archive flows, hotfix bundle, EN+RU + dark/light parity) on physical iOS + Android devices, followed by atomic v2.0.0 version bump and dual-store submission — applying the M1 D-02 lesson (query Play Console + TestFlight history BEFORE setting versionCode/build-number baseline).
**Depends on**: Phases 1–5 shipped
**Requirements**: REL-01, REL-02, REL-03, REL-04, REL-05, REL-06
**Success Criteria** (what must be TRUE):
  1. Manual physical-device QA matrix walked APPROVED on iPhone 15 Pro Max + Moto G XT2513V covering: role transitions (user → moderator → admin → user via demotion); Moderation Queue actions (approve / reject / edit-on-behalf with two-device race-condition coverage); Archive flows (owner self-archive + mod-archive + restore-to-pending); owner-side rejection banner persistence across sessions; EN+RU parity per screen; dark/light parity; all four hotfix-bundle fixes verified empirically
  2. RN client `package.json` bumped to `2.0.0`; iOS `MARKETING_VERSION 2.0.0` + Android `versionName "2.0.0"`; iOS `CURRENT_PROJECT_VERSION` and Android `versionCode` baselines set AFTER querying Play Console + TestFlight history for highest-accepted values per track (M1 D-02 lesson — RETROSPECTIVE.md Key Lesson #1)
  3. Backend deployed to Railway with `FIREBASE_PROJECT_ID` env var present; old MongoDB Atlas password + AWS IAM keys revoked and confirmed dead; new credentials live; `firebase-admin@^13.6.1` removed from backend `package.json` (was dead code)
  4. Bilingual EN+RU release notes drafted and pasted on App Store Connect + Google Play Console under their respective length limits (Play Console's binding 500-char-per-locale limit is the load-bearing budget); content order: What's new (Roles & Moderation) → Improvements (security hardening / data integrity) → Bug fixes (catch-all phrasing only per M1 Phase 8 D-10 — no fabricated specifics)
  5. iOS archive uploaded to App Store Connect under Xcode 26.4+ and visible in TestFlight (TestFlight Internal Testing track sufficient for phase-exit per M1 D-12); Android `.aab` uploaded to Google Play Console under existing keystore and submitted/processing; privacy manifest re-affirmed per M1 Phase 8 D-13 inheritance unless Apple flags (RN client adds zero new data-collecting deps in M2)
**Plans**: TBD

## Progress

| Milestone | Phases | Status | Closed |
|-----------|--------|--------|--------|
| M1 v1.0.4 "Polish + Hospitality" | 8/8 (7 executed + Phase 7 SKIPPED) | ✅ SHIPPED | 2026-04-28 |
| M2 v2.0 "Roles & Moderation" | 0/6 | 🚧 Active (planning) | — |

**M2 phase progress:**

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Backend Role Foundation + Auth Migration + Hotfix Bundle | 0/0 | Not started | — |
| 2. Listing Lifecycle Status Field Absorption | 0/0 | Not started | — |
| 3. Moderation Queue + Actions + Edit-on-Behalf | 0/0 | Not started | — |
| 4. Archive Lifecycle (Owner + Mod/Admin) | 0/0 | Not started | — |
| 5. Admin Role Management UI | 0/0 | Not started | — |
| 6. Hardening + Manual Physical-Device QA + Release | 0/0 | Not started | — |

## Backlog

*Empty.* M1 backlog entry 999.1 (archive listings — authors + mod/admin) was promoted into M2 Phase 4 on 2026-04-29; the corresponding `.planning/phases/999.1-archive-listings/` directory will be removed during Phase 4 plan execution. Future backlog entries land here.

---

*Roadmap last updated: 2026-04-29 — M2 v2.0 "Roles & Moderation" phases 1–6 added by /gsd-roadmapper. Full M1 phase details, success criteria, plan-by-plan breakdown, and traceability live in `.planning/milestones/v1.0.4-ROADMAP.md`. M2 phase directory naming (kebab-case, `01-backend-role-foundation` through `06-hardening-and-release`) will be created at `/gsd-discuss-phase` / `/gsd-plan-phase` time, not now.*

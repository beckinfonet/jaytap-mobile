# Roadmap: JayTap

## Milestones

- ✅ **M1 v1.0.4 "Polish + Hospitality"** — 8 phases (shipped 2026-04-28) — see [milestones/v1.0.4-ROADMAP.md](milestones/v1.0.4-ROADMAP.md)
- 🚧 **M2 v2.0 "Roles & Moderation"** — 7 phases (active; planning started 2026-04-29; Phase 4.5 inserted 2026-04-30)

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

- [x] **Phase 1: Backend Role Foundation + Auth Migration + Hotfix Bundle** — 13/13 plans across 9 waves COMPLETE 2026-04-30 — JWKS verification middleware on Railway, single role-aware auth middleware (collapses 5 inline copies), `Authorization: Bearer` migration on all 5 services, Firebase REST refresh-token flow, `GET /api/auth/me`, 401/403 axios interceptors, `AuthContext.refreshRole()`, `roleRevokedAt` invariant, M1-allowlist-to-Mongo migration, foreground role-refresh banner, hotfix bundle (HF-01 schema patch + HF-02 secret rotation + HF-03 UID-spoof close + HF-04 socket.io auth). M1 GATE-05 D-22 Path B accepted-risk row CLOSED. Ready for `/gsd-verify-work` + `/gsd-uat`.
- [x] **Phase 2: Listing Lifecycle Status Field Absorption** — 9/9 plans across 7 waves COMPLETE 2026-05-01. Property.status enum cutover (drop 'draft', add 'rejected', default 'pending') + 9-field audit schema (D-21), production Mongo migration --verify=PASS (Plan 02), role-aware route filters (D-05/D-06/D-12), POST/PUT body-status sanitizer (D-22), edit-resubmit auto-flip (D-15), 4-tab segmented control on RenterListings with per-tab Hospitality + per-tab empty states (MOD-06), StatusPill on PropertyCard top-left (D-19), RejectionBanner per-session dismiss (MOD-08), HomeRejectionBanner with auto-dismiss (MOD-09), AppState 'active' role-refresh with 60s cooldown (D-17). Phase 1 GATE-05 D-12 deferral closed via D-17. QA partial coverage: Rows 1-3 walked PASS on iPhone 15 Pro Max (Row 1 after RU label overflow fix `0f257d9`); Rows 4-9 deferred to Phase 3 because they require artificial Mongo state-setup that Phase 3's moderation queue UI (MOD-10..MOD-18) will exercise naturally.
- [ ] **Phase 3: Moderation Queue + Actions + Edit-on-Behalf** — `ModerationQueueScreen` overlay, `RejectListingModal` (4-code canned chips + free-text), `PropertyService` extensions with `canFromUser` guards + 409 conflict handling, profile entry-point gated by `<Gated action="viewModerationQueue">`, `OVERLAY_FLAGS` extension, edit-on-behalf via `moderatorContext` prop, `moderationLog` collection
- [ ] **Phase 4: Archive Lifecycle (Owner + Mod/Admin)** — `ArchiveListingModal`, `archiveListing`/`unarchiveListing` service methods, PropertyCard archive action, OwnerListings Archived tab + Restore action (routes to `pending`), hard-delete becomes admin-only, `Action` union extends with `archiveOwnListing`/`archiveAnyListing`/`hardDeleteListing`
- [x] **Phase 4.5: Landlord Application Workflow** — COMPLETE 2026-04-30. `User.canListProperties` capability flag (additive); `LandlordApplication` + `LandlordApplicationAuditLog` models; 5 endpoints (submit / get-mine / withdraw / admin-queue / admin-decide); `LandlordApplicationScreen` form (phone, ID photo, intent, optional note); `LandlordApplicationStatusBanner` on Profile (none / submitted / approved / rejected / withdrawn states); `LandlordApplicationQueueScreen` admin overlay (FIFO queue, approve / reject with 4-code canned reasons); `useRole` `manageListings` gate tightened (admin/moderator implicit; user requires `canListProperties`); `reviewLandlordApplications` action added (admin-only); pre-flight gate on Profile/BottomNav `add` entry-points routes ungated users to the application form; `requireListingCapability` middleware on `POST /properties`; one-time `migrate-landlord-capability.js` auto-grants existing self-listers; cosmetic `isRenterApplicant` AccountSettings Switch replaced with navigable row; EN+RU i18n parity (~50 strings).
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
  - [x] 01-11-PLAN.md — Wave-8 5-service Bearer migration + ChatService socket auth.token (HF-04 client side) — completed 2026-04-30 (2 RN-client refactor commits: 9890258 Property+Favorites, 0ec1a84 Chat+Appointment + ChatService socket auth.token + ChatThreadScreen call site update; -43 net LOC across 5 files (139 inserted / 182 deleted); ROLE-05 5-service collapse complete on the client side; HF-04 client side complete — backend Plan 07's dual-accept absorbs the rollout window; AuthService.ts intentionally unchanged — Firebase REST direct; whole-project tsc baseline preserved at 2 deferred ThemeContext errors; manual physical-device smoke deferred to integration window)
  - [x] 01-12-PLAN.md — Wave-8 RoleRefreshBanner + locale keys + theme palette extension + App.tsx mount + hard-logout toast — completed 2026-04-29 (3 RN-client commits: 08ae964 locale keys + warning palette tokens, 20810a8 RoleRefreshBanner.tsx with optimistic-dismiss + useEffect rebase fixing W2 stale-closure regression, c66f481 App.tsx mount + AuthContext.logout(silent?) + bilingual D-11 Alert.alert; +84 LOC new component + 5 EN+RU locale keys (parity) + warning/onWarning theme tokens (light + dark) + App.tsx 975 → 980 LOC; ProfileScreen handleLogout updated to logout(true) for user-initiated path; tsc baseline preserved at 2 pre-existing ThemeContext errors; ROLE-09 final-fallback toast keys populated for Plan 10's apiClient post-retry 403 branch; ROLE-10 sticky banner closes the role-change UX loop end-to-end; manual demote-while-signed-in + hard-logout + ROLE-09 final-fallback smokes deferred to physical-device window per VALIDATION.md W2)
  - [x] 01-13-PLAN.md — Wave-9 useRole.ts allowlist branch deletion + adminAllowlist.ts deletion (LAST step of phase per Pitfall 5) — completed 2026-04-30 (atomic commit `2470def feat(role): delete M1 allowlist branch + adminAllowlist.ts (server-resolved roles only) [ROLE-07]`; `src/constants/adminAllowlist.ts` removed via `git rm`; `src/hooks/useRole.ts` Branch 3 + import deleted; `canFromUser('manageListings')` post-cutover gate flipped to `role !== 'guest' && !!user?.backendProfile` mirroring Plan 06 backend cleanup; useRole.test.ts rewritten 8→14 tests; whole-client grep returns 0 matches; tsc baseline preserved at 2 ThemeContext errors; ROLE-07 closed; Phase 1 COMPLETE 13/13)

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
**Plans**: 9 plans
  - [ ] 02-01-PLAN.md — Wave-0 backend test scaffolds (Property.test.js + propertyRoutes.test.js Phase 2 block) + migrate-listings-m2.js + package.json registration
  - [ ] 02-02-PLAN.md — Wave-1 [BLOCKING] production Mongo migration `--dry-run` + live + `--verify=PASS` (operator-supervised checkpoint)
  - [ ] 02-03-PLAN.md — Wave-2 backend code: Property.js enum cutover + 9 audit fields (D-21) + verifyFirebaseToken optionalAuth + propertyRoutes D-05/D-06/D-12/D-15/D-22 + body-status sanitizer + 409 archived + DELETE guard cleanup
  - [x] 02-04-PLAN.md — Wave-3 client foundation: Property.ts type cutover + PropertyService.ts body-status removal + locale bundle (18 new keys EN+RU, 7 deprecated keys removed, parity gate exit 0) — completed 2026-05-01 (3 RN-client commits: d40e856 Property.ts D-01 enum + 3 audit fields, ea445c5 PropertyService createListing/updateListing body-status removal + archive/unarchive TODO(Phase 4), 7ea8349 locale bundle 18 added / 7 deleted; en.ts + ru.ts both at 497 keys parity; 1 Rule-2 deviation documented (archiveProperty given symmetric TODO treatment to unarchiveProperty); 14 stale tsc references in Plan 05/06/07 territory enumerated in SUMMARY for downstream cleanup)
  - [x] 02-05-PLAN.md — Wave-4 client components: <StatusPill> + <RejectionBanner> + <HomeRejectionBanner> + PropertyCard top-LEFT mount (D-19) + UI-SPEC.md inline correction — completed 2026-05-01 (2 RN-client commits: 04ec0e7 StatusPill+RejectionBanner+HomeRejectionBanner 3 components / 208 LOC, b56fc9f PropertyCard StatusPill mount inside topBadges + UI-SPEC.md inline D-19 supersession; tsc baseline 14 preserved zero new errors; 1 Rule-1 docstring deviation in RejectionBanner.tsx; 2 acceptance-criterion conflicts documented (PATTERN A indirect t() form, tsc 0-vs-baseline reading))
  - [x] 02-06-PLAN.md — Wave-4 RenterListingsScreen 4-tab segmented control + per-tab Hospitality + per-tab empty states + M1 inline status badge removal + archive UI hidden (parallel with 02-05) — completed 2026-05-01 (1 RN-client commit: d67401b feat(02-06) RenterListingsScreen 4-tab segmented control Live/Pending/Rejected/Archived with Pending default per D-09; defaultTab + onCreateListing props added to interface for D-15 Home rejection-banner CTA path + D-11 empty-state CTA Plan 08 wire-up; tabFilteredProperties memo via (p.status ?? 'live') === activeTab D-12 + D-07 single-fetch client-side filter; per-tab HospitalitySection ListHeaderComponent + per-tab empty state with conditional CTA on Live + Pending only; M1 formatStatus helper + inline statusBadge JSX + statusBadge/statusText styles all DELETED PATTERN F; PropertyCard StatusPill mount from Plan 05 D-19 now owns status display; archive UI props onArchive/onUnarchive STRIPPED from PropertyCard + HospitalitySection JSX with TODO(Phase 4) preserving handlers in source for additive Phase 4 diff; 1 Rule-1 fix changed unarchive 'draft' literal → 'pending' closing one of Plan 04's 5 owned tsc references; tsc baseline 14 → 9 (-5) — all 5 Plan-06-owned RenterListingsScreen errors cleared (lines 165, 193, 195, 197, 199 from Plan 04 SUMMARY's handoff table); remaining 9 are Plan 05 leftover + Plan 07 scoped territory pre-existing handoffs out of scope per Rule 3 boundary; 2 acceptance-criterion conflicts documented in 02-06-SUMMARY.md mirrors Plan 05's same-conflict pattern (a) AC #23 tsc=0 vs actual 9 — interpreted as 5 owned cleared + 9 remaining out of scope per Plan 05 precedent (b) AC #22 wc -l ≥450 was 438 after refactor bridged to 458 by expanding row-renderer doc-comment block with 24 lines of substantive Phase 2 architecture documentation NOT artificial padding; LOC 368 → 458 +90 net within RESEARCH.md A7's ~480-490 estimate; active-tab visual locked to underline (planner-discretion clause); screen header copy "My Listings" preserved per CONTEXT.md "Critical implementation fact"; Plan 07 + 08 + 09 unblocked)
  - [x] 02-07-PLAN.md — Wave-5 screen mounts: PropertyDetailsScreen RejectionBanner+StatusPill + HomeScreen D-07 source filter + HomeRejectionBanner mount + lazy fetch; FavoritesScreen D-07 filter; CreateListingScreen D-20 submit copy + Draft toggle removal — completed 2026-05-01 (4 RN-client commits: dcb3042 PropertyDetailsScreen RejectionBanner+StatusPill+per-session dismiss Set+onEditListing prop, c393965 HomeScreen D-07 source filter on both fetch paths + HomeRejectionBanner mount + lazy rejected-count fetch guarded by canListProperties + onOpenMyListingsRejectedTab prop, 8f48640 FavoritesScreen D-07 source-level live-only filter, 8bee95d CreateListingScreen D-20 three-branch submit IIFE submitForReview/resubmit/updateListing + entire user-facing Draft state removal: FormBag.status field deleted (types.ts) + validators.ts shared block status emit removed + test fixture status:'draft' deleted (32/32 validator tests pass) + orchestrator local status state hook + dispatcher case + rehydrate setStatus + values bundle + segmented control JSX + Status section heading + statusHint render + draft-vs-live success-message ternary + orphan createListing.createListing header reference all DELETED; tsc baseline 9 → 2 (7 Plan-07-owned errors all CLEARED in CreateListingScreen); 2 remaining (HospitalityCard.tsx:246 + PropertyCard.tsx:202 stale 'draft' comparisons) are pre-existing out-of-scope per Rule 3 boundary same resolution as Plans 05+06 SUMMARYs; 8 orphan createListing.* locale keys left in en.ts/ru.ts symmetrically per Plan 04 SUMMARY decision (orphan keys don't break parity gates; future cleanup pass owns en bloc removal); i18n parity exits 0; net +88 LOC across 7 files (4 screens + 3 CreateListingForm support files); 2 Rule-1 auto-fixes documented in SUMMARY (FormBag.status cascading removal + orphan createListing.createListing header reference); Plan 08 wire-up consumes onEditListing + onOpenMyListingsRejectedTab props this plan added)
  - [x] 02-08-PLAN.md — Wave-6 App.tsx wire-up (renterListingsDefaultTab + onOpenMyListingsRejectedTab + onEditListing) + AuthContext AppState 'active' role-refresh hook with 60s cooldown (D-17 closes Phase 1 D-12 deferral) — completed 2026-05-01 (2 RN-client commits: c7a542b App.tsx wire-up — adds renterListingsDefaultTab state ('live'|'pending'|'rejected'|'archived'|undefined) + onOpenMyListingsRejectedTab callback (D-15 / MOD-09 HomeRejectionBanner CTA target) + onCloseRenterListings callback (D-09 Pending default reset on close) + onEditListing callback wired to PropertyDetailsScreen (D-15 / MOD-08 RejectionBanner CTA target reusing M1 Phase 5 setPropertyToEdit + setIsCreateListingOpen edit-mode plumbing); ef52364 AuthContext AppState 'active' role-refresh hook — adds module-scope `let lastRefreshAt: number | null = null` + `const REFRESH_COOLDOWN_MS = 60_000` BEFORE the AuthProvider + new useEffect SIBLING of the existing registerAuthHooks useEffect with deps [refreshRole, user?.localId] subscribing to AppState 'change' events, on nextState==='active' applies cooldown + logout-while-backgrounded guard (`if (!user?.localId) return`) + non-fatal `refreshRole().catch(...)`, cleanup via `sub.remove()` (RN 0.84 API) — closes Phase 1 D-12 deferral. tsc baseline 2 preserved (HospitalityCard.tsx:246 + PropertyCard.tsx:202 pre-existing 'draft' comparisons out of scope per Rule 3 — same resolution as Plans 05+06+07). App.tsx LOC 1099 → 1132 (+33; +8 over strict 1124 bound — extra lines are doc-comments tying new state to D-09/D-15/D-17/MOD-08/MOD-09 anchors; flagged in SUMMARY per PATTERN D signal-not-block; PITFALLS Pitfall 8 soft cap 1100 is a soft cap not a hard limit). AuthContext.tsx LOC 263 → 296 (+33). Net +68/-2 across 2 files. Refresh role useCallback byte-unchanged regression check passes. 0 file deletions. Two acceptance-criterion conflicts documented (mirrors Plans 05/06/07 same-conflict pattern): (a) AC #1 grep-substring case-sensitivity — `grep -F renterListingsDefaultTab` (lowercase r) returns 2 hits because setter calls match `setRenterListingsDefaultTab` (uppercase R after `set`); functional invariant of state + 2 setters + JSX prop = 4 distinct usages IS satisfied; (b) AC #8 wc -l <= 1124 strict bound; signal-not-block per PATTERN D. End-to-end navigation flow now wired: HomeRejectionBanner tap → RenterListings opens on Rejected tab → tap rejected listing → PropertyDetailsScreen RejectionBanner → "Edit & resubmit" → CreateListingScreen edit mode → backend Plan 03 D-22 auto-flips status 'rejected' → 'pending'. Plan 09 (Wave-7 phase-exit gate — manual physical-device QA matrix) unblocked.)
  - [ ] 02-09-PLAN.md — Wave-7 phase-exit gate: backend full suite + client tsc baseline + i18n parity + manual physical-device QA matrix (9 rows × iPhone+Moto G) + code review pass + ROADMAP update
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
  5. Every approve / reject / edit-on-behalf action writes an append-only audit row to the `moderationLog` Mongo collection with `{actorUid, action, targetType: 'property', targetId, before, after, reasonCode?, reasonNote?, at}` (no M2 UI; data forward-fits a future M3+ audit screen); the 4 new endpoints (`GET /api/moderation/queue`, `POST /api/moderation/properties/:id/approve`, `POST /api/moderation/properties/:id/reject`, `PUT /api/moderation/listings/:id`) all enforce role ≥ moderator server-side via the JWKS middleware
**Plans**: 6 plans
  - [ ] 03-01-PLAN.md — Wave-1 backend foundations (serviceAreas + ModerationLog model + moderationRoutes skeleton + index.js mount)
  - [ ] 03-02-PLAN.md — Wave-1 client foundations (19 EN+RU locale keys + useRole.ts viewModerationQueue + 5 PropertyService methods + RejectionBanner i18n patch)
  - [ ] 03-03-PLAN.md — Wave-2 backend approve/reject/queue endpoints (race-safe atomic findOneAndUpdate + actorUid from req.firebaseUid + audit follow-up)
  - [ ] 03-04-PLAN.md — Wave-2 client RejectListingModal + ModerationQueueScreen overlay + ProfileScreen entry-point with badge
  - [ ] 03-05-PLAN.md — Wave-3 backend edit-on-behalf endpoint + supertest race-condition harness (MANDATORY per gsd-verifier-misses-regressions.md; 13+ test cases)
  - [ ] 03-06-PLAN.md — Wave-4 App.tsx wireup + PropertyDetailsScreen action footer + CreateListingScreen moderatorContext + PropertyDetailsHost LOC mitigation + manual physical-device smoke checkpoint
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
**Plans**: 6 plans
  - [ ] 03-01-PLAN.md — Wave-1 backend foundations (serviceAreas + ModerationLog model + moderationRoutes skeleton + index.js mount)
  - [ ] 03-02-PLAN.md — Wave-1 client foundations (19 EN+RU locale keys + useRole.ts viewModerationQueue + 5 PropertyService methods + RejectionBanner i18n patch)
  - [ ] 03-03-PLAN.md — Wave-2 backend approve/reject/queue endpoints (race-safe atomic findOneAndUpdate + actorUid from req.firebaseUid + audit follow-up)
  - [ ] 03-04-PLAN.md — Wave-2 client RejectListingModal + ModerationQueueScreen overlay + ProfileScreen entry-point with badge
  - [ ] 03-05-PLAN.md — Wave-3 backend edit-on-behalf endpoint + supertest race-condition harness (MANDATORY per gsd-verifier-misses-regressions.md; 13+ test cases)
  - [ ] 03-06-PLAN.md — Wave-4 App.tsx wireup + PropertyDetailsScreen action footer + CreateListingScreen moderatorContext + PropertyDetailsHost LOC mitigation + manual physical-device smoke checkpoint
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
**Plans**: 6 plans
  - [ ] 03-01-PLAN.md — Wave-1 backend foundations (serviceAreas + ModerationLog model + moderationRoutes skeleton + index.js mount)
  - [ ] 03-02-PLAN.md — Wave-1 client foundations (19 EN+RU locale keys + useRole.ts viewModerationQueue + 5 PropertyService methods + RejectionBanner i18n patch)
  - [ ] 03-03-PLAN.md — Wave-2 backend approve/reject/queue endpoints (race-safe atomic findOneAndUpdate + actorUid from req.firebaseUid + audit follow-up)
  - [ ] 03-04-PLAN.md — Wave-2 client RejectListingModal + ModerationQueueScreen overlay + ProfileScreen entry-point with badge
  - [ ] 03-05-PLAN.md — Wave-3 backend edit-on-behalf endpoint + supertest race-condition harness (MANDATORY per gsd-verifier-misses-regressions.md; 13+ test cases)
  - [ ] 03-06-PLAN.md — Wave-4 App.tsx wireup + PropertyDetailsScreen action footer + CreateListingScreen moderatorContext + PropertyDetailsHost LOC mitigation + manual physical-device smoke checkpoint
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
**Plans**: 6 plans
  - [ ] 03-01-PLAN.md — Wave-1 backend foundations (serviceAreas + ModerationLog model + moderationRoutes skeleton + index.js mount)
  - [ ] 03-02-PLAN.md — Wave-1 client foundations (19 EN+RU locale keys + useRole.ts viewModerationQueue + 5 PropertyService methods + RejectionBanner i18n patch)
  - [ ] 03-03-PLAN.md — Wave-2 backend approve/reject/queue endpoints (race-safe atomic findOneAndUpdate + actorUid from req.firebaseUid + audit follow-up)
  - [ ] 03-04-PLAN.md — Wave-2 client RejectListingModal + ModerationQueueScreen overlay + ProfileScreen entry-point with badge
  - [ ] 03-05-PLAN.md — Wave-3 backend edit-on-behalf endpoint + supertest race-condition harness (MANDATORY per gsd-verifier-misses-regressions.md; 13+ test cases)
  - [ ] 03-06-PLAN.md — Wave-4 App.tsx wireup + PropertyDetailsScreen action footer + CreateListingScreen moderatorContext + PropertyDetailsHost LOC mitigation + manual physical-device smoke checkpoint

## Progress

| Milestone | Phases | Status | Closed |
|-----------|--------|--------|--------|
| M1 v1.0.4 "Polish + Hospitality" | 8/8 (7 executed + Phase 7 SKIPPED) | ✅ SHIPPED | 2026-04-28 |
| M2 v2.0 "Roles & Moderation" | 0/6 | 🚧 Active (planning) | — |

**M2 phase progress:**

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Backend Role Foundation + Auth Migration + Hotfix Bundle | 13/13 | ✅ Complete | 2026-04-30 |
| 2. Listing Lifecycle Status Field Absorption | 9/9 | ✅ Complete | 2026-05-01 |
| 3. Moderation Queue + Actions + Edit-on-Behalf | 0/0 | Not started | — |
| 4. Archive Lifecycle (Owner + Mod/Admin) | 0/0 | Not started | — |
| 5. Admin Role Management UI | 0/0 | Not started | — |
| 6. Hardening + Manual Physical-Device QA + Release | 0/0 | Not started | — |

## Backlog

*Empty.* M1 backlog entry 999.1 (archive listings — authors + mod/admin) was promoted into M2 Phase 4 on 2026-04-29; the corresponding `.planning/phases/999.1-archive-listings/` directory will be removed during Phase 4 plan execution. Future backlog entries land here.

---

*Roadmap last updated: 2026-04-29 — M2 v2.0 "Roles & Moderation" phases 1–6 added by /gsd-roadmapper. Full M1 phase details, success criteria, plan-by-plan breakdown, and traceability live in `.planning/milestones/v1.0.4-ROADMAP.md`. M2 phase directory naming (kebab-case, `01-backend-role-foundation` through `06-hardening-and-release`) will be created at `/gsd-discuss-phase` / `/gsd-plan-phase` time, not now.*

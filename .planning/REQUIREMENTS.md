# JayTap — M2 v2.0 "Roles & Moderation" Requirements

**Milestone:** M2 v2.0 "Roles & Moderation"
**Started:** 2026-04-29
**Builds on:** M1 v1.0.4 "Polish + Hospitality" (shipped 2026-04-28; archived under `.planning/milestones/v1.0.4-*`)

**Goal:** Replace M1's hardcoded admin email gate with a real three-role permission system, give moderators + admins a workflow to review listings before they go public, let owners + mods/admins archive listings, and close four security/data-integrity bugs surfaced during backend review.

**Hard rules carried forward (do NOT introduce):**
- No Firebase SDK in the RN client repo (`firebase`, `@react-native-firebase/*`) — REPO RULE per memory `no-firebase-sdk.md`. Backend uses `jose` for JWKS verification, NOT `firebase-admin` (the dead `firebase-admin@^13.6.1` dep in `JayTap-services` is removed in HF-02 / Phase 1).
- No Firebase custom claims as role source — MongoDB `userType` is authoritative.
- No `react-navigation` — custom `App.tsx` state machine stays.
- No new authentication providers (OAuth, magic link, 2FA) — out of scope.
- EN+RU bilingual parity for every new UI string (365-key M1 baseline grows; CI gate enforces).
- Manual physical-device QA on iPhone 15 Pro Max + Moto G XT2513V (iOS + Android Fabric).

---

## v1 (M2) Requirements

### Hotfix bundle (Phase 1) — pre-M2 issues surfaced during backend review

These four issues were found during the 2026-04-29 backend codebase map. They bundle into Phase 1 because three of them (HF-03, HF-04, HF-02 secret-rotation cleanup) naturally share file/test surface with the JWKS verification work, and HF-01 is a one-line schema patch.

- [ ] **HF-01** Hospitality `rooms` / `maxGuests` / `amenities` fields are persisted to MongoDB. The M1 Phase 6 client sends these values via `PropertyService.createListing` / `updateListing` (see `src/services/PropertyService.ts:83-85, 154-156`); the `Property` Mongoose schema doesn't define them, so Mongoose silently drops them on save. Acceptance: a Hospitality listing created post-fix retains all 12-amenity selections, `rooms`, and `maxGuests` after a save→fetch round trip.
- [ ] **HF-02** Backend `.env` rotated and removed from git tracking. Live `MONGO_URI` password + AWS S3 credentials currently committed at `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/.env`. Acceptance: (a) MongoDB Atlas password rotated; (b) AWS IAM keys rotated and old keys revoked; (c) `.env` removed via `git rm --cached`; (d) `.env` added to `.gitignore`; (e) `.env.example` checked in with non-secret keys; (f) backend deploys to Railway via Railway-set env vars (no committed secrets).
- [x] **HF-03** `POST /api/auth/users` rejects requests where the body's `firebaseUid` doesn't match the JWKS-verified token's `sub` claim. Currently the route reads `firebaseUid` verbatim from the body, allowing anyone to overwrite any user's profile (incl. self-promote to `userType: 'admin'`). Depends on HF-04's middleware. Acceptance: a curl with body `firebaseUid: <victim>` and `Authorization: Bearer <attacker_token>` returns 403; without `Authorization` returns 401. — **COMPLETE 2026-04-30 (Plan 01-06 commit `6f90f6d`); supertest coverage in `src/__tests__/authRoutes.test.js` 8/8 green; explicit field allowlist also closes the userType-from-body sub-vector**
- [x] **HF-04** Socket.io handshake verifies the client's Firebase ID token and only allows joining `user:<uid>` for the verified token's `sub`. Currently the server reads `socket.handshake.auth.firebaseUid` verbatim and joins any room the client requests, leaking incoming chat messages. Depends on the JWKS verification utility from ROLE-03. Acceptance: a socket connecting with `auth: {token: <attacker_token>}` cannot subscribe to a victim's `user:<victim_uid>` room. — **COMPLETE 2026-04-30 (Plan 01-07 commit `4d0a07a feat(socket): HF-04 io.use JWKS handshake + verified-only room join [HF-04]`); `io.use()` middleware verifies `socket.handshake.auth.token` via shared JWKS singleton (`require('./src/config/firebase')` — same cache as HTTP middleware), sets `socket.userId` + `socket.authPath`; auto-join to `user:<verified_sub>` is gated on `socket.authPath === 'bearer'`; explicit `join_user_room` event listener gates on `authPath === 'bearer' AND socket.userId === requestedUid`; D-04 dual-accept legacy path connects without auto-join and emits `evt: 'legacy_socket_handshake'` log stream for Phase-6 cutoff evidence; T-1-05 (cross-room socket subscription Information Disclosure) mitigated; 39/39 backend tests green**

### Roles (Phase 1 + Phase 2) — three-tier system + backend resolution

- [ ] **ROLE-01** `User.userType` is one of three values: `'user'` / `'moderator'` / `'admin'`. Mongoose enum updated; the legacy values (`'renter'`, `'owner'`, `'agent'`) removed from the schema after migration (ROLE-02) lands. Default for new signups is `'user'`.
- [ ] **ROLE-02** One-shot Mongo migration script flips legacy `userType` values: `renter` → `user`, `owner` → `user`, `agent` → `user` (default; review per-record at Phase 1 discuss for any production agents that should be moderators), `admin` → `admin`. Migration is idempotent and runs as part of Phase 1 deploy. Acceptance: post-migration `db.users.countDocuments({userType:{$nin:['user','moderator','admin']}})` returns 0.
- [ ] **ROLE-03** Backend verifies Firebase ID tokens via JWKS. New middleware (`src/middleware/verifyFirebaseToken.js`) parses `Authorization: Bearer <idToken>`, fetches Firebase's public JWKS via `jose.createRemoteJWKSet`, and verifies signature + `algorithms: ['RS256']` + `issuer: https://securetoken.google.com/<FIREBASE_PROJECT_ID>` + `audience: <FIREBASE_PROJECT_ID>` + `clockTolerance: 60`. Cache TTL ≤6h. Rejects unsigned/expired/wrong-audience/tampered tokens with 401. NO `process.env.NODE_ENV` runtime branches near auth code.
- [x] **ROLE-04** Five backend services (auth, property, favorite, chat, appointment) use a single `verifyFirebaseToken` middleware. Collapses `authMiddleware.js` + `chatAuthMiddleware.js` + 3 inline copies in `propertyRoutes.js` + 1 inline in `favoriteRoutes.js` into one role-aware middleware. The legacy `x-firebase-uid` header is no longer trusted; `req.user` is derived from the verified token's `sub`. — **COMPLETE 2026-04-30 (Plan 01-06 commits `6f90f6d` + `8edd68e` + `03b382a`); 5 inline auth blocks removed (4 in propertyRoutes — POST/PATCH/PUT/DELETE — and 1 inline `verifyAuth` in favoriteRoutes); chatAuthMiddleware.js DELETED via `git rm`; chatRoutes + appointmentRoutes use `router.use(verifyFirebaseToken)`; legacy `x-firebase-uid` STILL ACCEPTED through D-03 dual-accept window with structured logging — Phase 6 cuts. authMiddleware.js (verifyRenter) still on disk but unconsumed; can be cleaned in a later plan.**
- [ ] **ROLE-05** Client switches from `x-firebase-uid` header to `Authorization: Bearer <idToken>`. Shared `apiClient.ts` consolidates the 5 services' `getHeaders()` boilerplate (per CONCERNS.md "Duplicated service boilerplate"). Existing in-flight requests during a token rotation are not orphaned.
- [ ] **ROLE-06** Client `AuthService` implements Firebase REST refresh-token flow against `https://securetoken.googleapis.com/v1/token` when an idToken expires (typically 60 min). `refreshToken` cached in AsyncStorage alongside the existing `userToken` key. Closes a latent M1 bug where sessions die at 60 min without explicit re-login.
- [ ] **ROLE-07** Client `useRole()` hook reads from `useAuth().user.backendProfile.userType` (Mongo-resolved). M1's hardcoded email-allowlist branch (`useRole.ts:64-65`) is deleted; `src/constants/adminAllowlist.ts` is deleted. M1 hardcoded admin emails (currently `beckprograms@gmail.com`) have their `userType` set to `'admin'` in Mongo as part of ROLE-02 migration BEFORE the allowlist file is removed.
- [x] **ROLE-08** New `GET /api/auth/me` endpoint returns the verified user's Mongo record (incl. `userType`). Client calls it on app cold start (after AsyncStorage session restore) and caches the response in `AuthContext.user`. Replaces today's "trust AsyncStorage `userData.localId` blindly" pattern. — **COMPLETE 2026-04-30 (Plan 01-06 commit `6f90f6d`); endpoint live as `router.get('/me', verifyFirebaseToken, async (req, res) => res.json(req.user))`; supertest cases verify valid-Bearer→200 and no-Bearer→401. Client wiring (cold-start call + AuthContext caching) lands in Plan 01-10.**
- [ ] **ROLE-09** Axios response interceptor: `401 token-expired` → refresh idToken via ROLE-06 + retry once. `403 role-revoked` → call `AuthContext.refreshRole()` + retry once; if still 403, logout + show EN+RU "Your access changed. Please sign in again." toast.
- [ ] **ROLE-10** `AuthContext` exposes `refreshRole()` callable; bumps `user` reference on completion. Foreground role-refresh banner ("Your role changed — tap to reload" / «Ваша роль изменилась — нажмите для перезагрузки») shows when `userType` changes between two consecutive `refreshRole()` calls.
- [ ] **ROLE-11** Server enforces `roleRevokedAt` invariant: when an admin changes a user's role, set `user.roleRevokedAt = now`. The JWKS middleware rejects any token whose `iat` is earlier than the user's `roleRevokedAt`, forcing re-auth on demotion. Acceptance: demoting a moderator while their app is open causes their next protected request to return 403 within 60s.

### Moderation lifecycle (Phase 2 + Phase 3) — status field + queue + mod actions

- [ ] **MOD-01** `Property.status` enum extends to `['draft', 'pending', 'live', 'rejected', 'archived']`. New fields: `submittedAt`, `approvedAt`, `approvedByUid`, `rejectedAt`, `rejectedByUid`, `rejectionReasonCode`, `rejectionReasonNote`, `archivedAt`, `archivedByUid`, `archivedReasonCode?`. All additive; existing documents remain readable.
- [ ] **MOD-02** Existing properties without a `status` field default to `'live'` at read time (preserves the existing `propertyRoutes.js:53` `$exists: false` fallback) OR are backfilled in a one-shot migration. Decision deferred to Phase 2 discuss; both paths are acceptance-criteria-equivalent (legacy listings remain visible to renters).
- [ ] **MOD-03** `POST /api/properties` defaults to `status: 'pending'` for newly submitted listings. Client `CreateListingScreen` submit button now means "submit for review," not "publish immediately." Owner sees their listing in the Pending tab of OwnerListings until a moderator approves.
- [ ] **MOD-04** `GET /api/properties` filters server-side to `status: 'live'` for non-moderators. Moderators + admins receive all statuses (or via `?includeAll=1` escape hatch — TBD at Phase 2 discuss).
- [ ] **MOD-05** `GET /api/properties/:id` returns 404 for non-live listings UNLESS the requester is the owner OR is moderator/admin. Prevents deep-link bypass to pending/rejected/archived listings.
- [ ] **MOD-06** OwnerListings screen has a 4-tab segmented control: Live / Pending / Rejected / Archived. Each tab shows the owner's listings filtered by status. Per-tab empty states; tour-first Hospitality cards preserved.
- [ ] **MOD-07** PropertyCard shows a status pill badge for non-live statuses (Pending / Rejected / Archived). Pill colors derive from `useTheme()` semantic palette (warning / error / neutral). EN+RU labels: `pending` → «На модерации»; `rejected` → «Отклонено»; `archived` → «Снято с публикации».
- [ ] **MOD-08** Rejected listings show a banner on PropertyDetailsScreen with: localized `reasonCode` + optional `reasonNote` + "Edit & resubmit" / «Исправить» CTA. Banner is dismissible per-listing-per-session; reappears next session until owner edits.
- [ ] **MOD-09** Persistent owner-side rejection banner shows on Home screen when the owner has any listings in `rejected` status. Tapping navigates to OwnerListings → Rejected tab. Auto-dismisses when all rejected listings are edited or archived.
- [ ] **MOD-10** Moderation Queue screen lists `status: 'pending'` listings, FIFO sort by `submittedAt`, accessible via Profile entry-point gated by `<Gated action="viewModerationQueue">`. Mounted as overlay in `App.tsx` (added to `OVERLAY_FLAGS` array per M1 Phase 1 derived-overlay pattern); NOT a 6th BottomNav tab.
- [ ] **MOD-11** Each Moderation Queue row shows three actions: Approve / Reject / Edit-on-behalf. Reject opens a modal; Edit-on-behalf opens `CreateListingScreen` with a `moderatorContext` prop. Approve is a confirmed single-tap action.
- [ ] **MOD-12** Reject requires a `reasonCode` from the M2 enum: `incomplete-info`, `prohibited-content`, `out-of-service-area`, `other`. Optional `reasonNote` free-text. The `out-of-service-area` reason is backed by a configurable `serviceAreas` list (M2 default: `['Bishkek']`; expandable to Almaty/Tashkent/etc. without code change).
- [ ] **MOD-13** Reject reason is stored as a structured `reasonCode` enum on `Property.rejectionReasonCode` (translated server-side at view time to the **owner's locale**, NOT the moderator's locale). Free-text `reasonNote` is stored verbatim and displayed as-is. Moderator identity is NEVER exposed to the owner; banner reads "JayTap modeator" / «Модератор JayTap» generically.
- [ ] **MOD-14** Edit-on-behalf reuses M1's decomposed `CreateListingScreen` with a new optional `moderatorContext: {editingOwnerUid, reason?}` prop. When set, save dispatches `editAsModerator` (new endpoint) instead of `updateProperty`; the listing's `ownerUid` is NOT mutated. An audit row is written to `moderationLog` with `before`/`after` field snapshots.
- [ ] **MOD-15** Server enforces 409 Conflict on race conditions: `findOneAndUpdate({_id, status: 'pending'}, ...)` returns null when another moderator has already acted; the API returns 409 with `code: 'ALREADY_MODERATED'`. Client shows EN+RU "This listing was already reviewed by another moderator." / «Это объявление уже рассмотрено другим модератором.» toast and refetches the queue.
- [ ] **MOD-16** `moderationLog` Mongo collection is append-only and captures every approve / reject / archive / edit-on-behalf action: `{actorUid, action, targetType: 'property', targetId, before, after, reasonCode?, reasonNote?, at}`. No M2 UI; data is forward-fit for a future M3+ audit-log screen.
- [ ] **MOD-17** New backend endpoints: `GET /api/moderation/queue`, `POST /api/properties/:id/submit`, `POST /api/properties/:id/approve`, `POST /api/properties/:id/reject` (body: `reasonCode`, optional `reasonNote`), `PUT /api/moderation/listings/:id` (edit-on-behalf). All require role ≥ moderator; admin inherits. All write to `moderationLog`.
- [ ] **MOD-18** EN+RU locale parity for all new strings: status pill labels, queue action buttons, reject-reason canned chips, owner-side rejection banner, modal copy, error toasts. Estimated +50–80 keys to the 365-key M1 baseline. CI gate (`scripts/check-i18n-parity.sh`) enforces parity.

### Archive (Phase 4) — owner-driven + mod/admin-driven

- [ ] **ARCH-01** Owner can archive their own listing from PropertyCard menu (next to existing Delete) and from PropertyDetailsScreen action footer. Status transitions from any value to `archived`. Owner-archive does NOT require a reason; `archivedReasonCode` is null.
- [ ] **ARCH-02** Mod/admin can archive any listing from the Moderation Queue or PropertyDetailsScreen (gated by `<Gated action="archiveAnyListing">`). Mod/admin-archive REQUIRES a `reasonCode` (same enum as MOD-12) + optional `reasonNote`. An audit row is written.
- [ ] **ARCH-03** Archived listings are hidden from public list views (Home / Favorites / RenterListings) and from PropertyDetailsScreen for non-owners-non-mods. Visible to owner under the OwnerListings "Archived" tab and to mod/admin via the moderation surface.
- [ ] **ARCH-04** Restoring an archived listing transitions status to `pending` (re-moderated), NOT back to its prior status. Prevents post-rejection bypass (owner archives a rejected listing then unarchives to dodge moderator review). Restoration is available to whoever has rights to archive (owner for self-archived; mod/admin for anyone).
- [ ] **ARCH-05** Hard-delete (existing `DELETE /api/properties/:id`) becomes admin-only. M1 default was renter-only; M2 swaps. Admin uses it via PropertyDetailsScreen footer; `<Gated action="hardDeleteListing">` gates the affordance. `useRole.ts` `Action` union extends with `archiveOwnListing`, `archiveAnyListing`, `hardDeleteListing`.

### Admin role management (Phase 5)

- [ ] **ADMIN-01** Admin Role Management screen shows a searchable list of users (search by email substring); shows current `userType` per user.
- [ ] **ADMIN-02** Admin can change any user's `userType` to any of `user` / `moderator` / `admin` from the Role Management screen. Triggers ROLE-11 (`roleRevokedAt`) on the target user.
- [ ] **ADMIN-03** Server enforces last-admin lockout: if exactly one user has `userType: 'admin'`, that user's role cannot be changed (any role mutation that would result in zero admins returns 409 with clear error).
- [ ] **ADMIN-04** Server enforces self-mutation prevention: admins cannot change their own `userType`. Acceptance: `PATCH /api/admin/users/<my_uid>/role` returns 403 even if requester is admin.
- [ ] **ADMIN-05** All role changes are audit-logged in `roleChangeLog` collection: `{actorUid, targetUid, fromRole, toRole, at}`. Append-only. No M2 UI; forward-fit for M3+ admin audit screen.
- [ ] **ADMIN-06** Role Management screen accessible only via Profile entry-point gated by `<Gated action="manageRoles">`. Mounted as overlay in `App.tsx` (`OVERLAY_FLAGS` extension); not a tab.
- [ ] **ADMIN-07** New backend endpoints: `GET /api/admin/users?query=<email>&limit=50`, `PATCH /api/admin/users/:uid/role` (body: `userType`). Admin-only prefix; verifies role server-side via the JWKS middleware.

### Release & store submission (Phase 6)

- [ ] **REL-01** RN client `package.json` bumped to `2.0.0`.
- [ ] **REL-02** iOS `MARKETING_VERSION 2.0.0` + Android `versionName "2.0.0"`. Build numbers (`CURRENT_PROJECT_VERSION`, `versionCode`) bumped per **M1 D-02 lesson**: query Play Console + TestFlight history for highest-accepted values BEFORE setting baseline.
- [ ] **REL-03** Manual physical-device QA matrix covers: role transitions (user → moderator → admin → user via demotion), Moderation Queue actions (approve/reject/edit-on-behalf with race-condition coverage on two devices simultaneously), Archive flows (owner self-archive + mod-archive + restore-to-pending), Owner-side rejection banner persistence, EN+RU parity per screen, dark/light parity, all four hotfix-bundle fixes verified. Walked on iPhone 15 Pro Max + Moto G XT2513V.
- [ ] **REL-04** Bilingual EN+RU release notes drafted; pasted to ASC + Play Console under the binding 500-char-per-locale limit (Play Console). Content order: What's new (Roles & Moderation) → Improvements (security hardening / data integrity) → Bug fixes (catch-all phrasing only — see M1 Phase 8 D-10).
- [ ] **REL-05** Backend deployed to Railway with new env vars: `FIREBASE_PROJECT_ID`. Old MongoDB Atlas password + AWS IAM keys revoked; new credentials live. `firebase-admin@^13.6.1` removed from backend `package.json` (was dead code).
- [ ] **REL-06** Privacy manifest reviewed for new data-collecting SDKs (none expected — RN client adds zero new deps in M2 per repo rule). Re-affirm v1.0.3 inheritance per M1 Phase 8 D-13 unless Apple flags. Submitted to ASC + Play Console under their respective track choices (TestFlight Internal sufficient for phase-exit per M1 D-12).

---

## Future Requirements (M3+ — deferred)

- Automated/AI moderation (image/text classifiers, ML-driven triage)
- Full audit log UI (data captured in M2 `moderationLog` + `roleChangeLog`; UI deferred)
- Formal appeal flow (currently: edit + resubmit covers ≥95% of cases)
- Bulk moderation actions (multi-select approve/reject)
- Flag action / 5th lifecycle state (currently: `live → flagged → live-but-flagged` collapses to `live → pending` via mod-archive)
- Email/push notifications on rejection/approval (no push infrastructure exists in JayTap today)
- In-app moderation messaging thread (mod ↔ owner conversation about a listing)
- Lease-based pessimistic locking on the moderation queue (optimistic 409 suffices at small mod team)
- Self-promotion path / "apply to be a moderator"
- Hierarchical permission inheritance (M2 keeps M1's flat `can(action)` predicates)
- Real-estate document verification (Avito-style ownership proof — multi-month compliance subproject)
- Multi-currency support (KZT + UZS chips alongside USD + KGS) — comes with geographic expansion to Almaty/Tashkent
- Multi-language localization beyond EN+RU (KK + UZ if KZ/UZ markets warrant it)

---

## Out of Scope

Explicit exclusions, with reasoning:

- **Firebase SDK additions** (RN client repo) — REPO RULE per memory `no-firebase-sdk.md`. Previous SDK addition attempt caused issues. JWKS verification on backend uses `jose`, not `firebase-admin` (which is also removed in REL-05).
- **Firebase custom claims as role source** — MongoDB `userType` is authoritative. Custom claims would split source-of-truth.
- **`react-navigation` migration** — custom `App.tsx` state machine stays. New screens (Moderation Queue, Role Management) added as overlay flags in `OVERLAY_FLAGS` per M1 Phase 1 derived-overlay pattern.
- **2GIS native map bridge** — separate multi-week effort; plan drafted in `2GIS_BRIDGE_PLAN.md`. Not gated by M2.
- **Payment / booking flows** — JayTap is showcase-only by design. Hospitality contact info drives offline booking.
- **Per-night pricing for hospitality** — eliminated in M1; remains out of scope.
- **Chat moderation tooling** — M2 covers listing moderation only. `ChatReport` model exists in backend but no surface to read/resolve reports yet; deferred.
- **New authentication providers** (OAuth, magic link, 2FA) — M2 keeps Email/password Identity Toolkit REST.
- **Migration tooling for production listings** — clean-slate listings claim still holds (mock data only; legacy `status: missing` listings handled per MOD-02). Users get a one-shot migration per ROLE-02.
- **Multi-currency / multi-language UI beyond EN+RU** — current target market is Bishkek; Almaty/Tashkent expansion is M3+.
- **Push notifications / email notifications** for moderation events — M2 in-app banner is sufficient; push infrastructure is a separate workstream.

---

## Traceability

*Filled by `/gsd-roadmapper` when ROADMAP.md is created. Last updated 2026-04-29.*

| Phase | Requirements |
|-------|--------------|
| 1. Backend Role Foundation + Auth Migration + Hotfix Bundle | HF-01, HF-02, HF-03, HF-04, ROLE-01, ROLE-02, ROLE-03, ROLE-04, ROLE-05, ROLE-06, ROLE-07, ROLE-08, ROLE-09, ROLE-10, ROLE-11 |
| 2. Listing Lifecycle Status Field Absorption | MOD-01, MOD-02, MOD-03, MOD-04, MOD-05, MOD-06, MOD-07, MOD-08, MOD-09 |
| 3. Moderation Queue + Actions + Edit-on-Behalf | MOD-10, MOD-11, MOD-12, MOD-13, MOD-14, MOD-15, MOD-16, MOD-17, MOD-18 |
| 4. Archive Lifecycle (Owner + Mod/Admin) | ARCH-01, ARCH-02, ARCH-03, ARCH-04, ARCH-05 |
| 5. Admin Role Management UI | ADMIN-01, ADMIN-02, ADMIN-03, ADMIN-04, ADMIN-05, ADMIN-06, ADMIN-07 |
| 6. Hardening + Manual Physical-Device QA + Release | REL-01, REL-02, REL-03, REL-04, REL-05, REL-06 |

**Coverage:** 51/51 ✓ (every M2 v1 requirement maps to exactly one phase; no orphans, no duplicates)

---

*Requirements drafted: 2026-04-29*
*Total v1 (M2) requirements: 51 (4 hotfix + 11 role + 18 moderation + 5 archive + 7 admin + 6 release-and-submission). ~46% larger than M1's 35 v1 reqs; reflects M2's cross-cutting scope (frontend + backend + 4 hotfix bundle).*

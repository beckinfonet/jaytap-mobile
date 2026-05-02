# Phase 3: Moderation Queue + Actions + Edit-on-Behalf — Research

**Researched:** 2026-05-01
**Domain:** Cross-repo M2 phase. RN client (`/Users/beckmaldinVL/development/mobileApps/JayTap`) + Express+Mongoose+jose backend (`/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services`). Touches moderation workflow surface end-to-end: 4 backend endpoints + new Mongoose model + serviceAreas config + new ModerationQueueScreen overlay + RejectListingModal + CreateListingScreen `moderatorContext` prop + Profile entry-point with pending-count badge + EN+RU locale parity + race-condition-safe 409 handling.
**Confidence:** HIGH for everything that follows existing Phase 1 / Phase 2 / Phase 4.5 precedents (which is most of Phase 3 — sibling-pattern reuse is the dominant strategy). MEDIUM for Mongo Atlas transaction availability (verified replica-set capable but no current backend code uses `startSession()` — recommendation is follow-up insert with structured logging, matching Phase 4.5 precedent).

## Summary

Phase 3 is the M2 milestone's behavioural climax: every Phase 1 + Phase 2 piece (JWKS Bearer, role-aware filters, status enum, audit-field schema, RejectionBanner shell, role-refresh AppState hook) was put in place precisely so Phase 3 could land moderator workflow in a small, prescriptive plan. The phase is **largely additive** — almost no existing files need destructive edits. The single elevated risk surface is **race-condition-safe atomic state transitions** (REQUIREMENTS MOD-15) which warrants supertest coverage at minimum (PITFALLS Pitfall 5; auto-memory `gsd-verifier-misses-regressions.md`).

**Three architectural anchors emerged from the precedent search:**

1. **Phase 4.5 is the sibling-pattern source for everything.** `LandlordApplicationQueueScreen` (admin overlay), `LandlordApplicationAuditLog` (append-only Mongoose model), `landlordApplicationRoutes.js` (route block with `requireMinRole`), and the `LandlordApplicationStatusBanner` profile entry-point pattern were intentionally built as Phase-3 forward-fit. Phase 3 should mirror these structures field-by-field where the contracts overlap.
2. **Phase 2 already laid almost all the schema + UI shell.** `Property.rejectionReasonCode`, `rejectionReasonNote`, `approvedAt/By`, `rejectedAt/By` schema fields exist (`/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/models/Property.js:42-50`). `<RejectionBanner>` and `<HomeRejectionBanner>` are mounted; Phase 3 only POPULATES the data they read. `<StatusPill>` already renders «На модерации». Phase 3 adds `reasonCode` translation + the moderation action footer on `PropertyDetailsScreen` + the queue overlay + 4 endpoints.
3. **App.tsx LOC pressure must be planned-for, not absorbed.** App.tsx is 1132 LOC, ahead of the 1100 soft cap by 32 lines. Phase 3 minimum additions = +30-45 LOC. Recommended path: extract the 77-LOC `selectedProperty && (<View ...><PropertyDetailsScreen .../></View>)` block (lines 837-913) into a new `<PropertyDetailsHost>` component, netting Phase 3's adds to ~zero or below.

**Primary recommendation:** Adopt the Phase 4.5 mirror as the structural baseline. New backend file `moderationRoutes.js` mounted at `/api/moderation/*` with all 4-5 endpoints inside (D-13 path-mismatch on the approve/reject endpoints is acceptable — domain match wins, and `landlordApplicationRoutes.js` already does this with its `/api/admin/*` sub-paths mounted under `/api/landlord-applications`). New `ModerationLog.js` Mongoose model copy-pasted from `LandlordApplicationAuditLog.js` with field renames. Server-side translation rejected; client-side i18n keys (4 reasonCodes × 2 locales = 8 keys) with raw `reasonCode` enum on the wire — matches the existing `landlordApp.rejectReason.{code}` namespace pattern verbatim. `actorUid` MUST be derived from `req.firebaseUid` (the JWKS-verified token's `sub`) — never from request body or client-supplied field (auto-memory `phase45-landlord-application-uid-mismatch-bug.md` is the prior-incident class). At minimum one supertest race-condition test for `findOneAndUpdate({_id, status: 'pending'}, ...)` returning null on the loser.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Queue UX & entry-point**

- **D-01 (Row display — reuse `PropertyCard`):** Each row in `ModerationQueueScreen` renders the existing `src/components/PropertyCard.tsx` (492 LOC) component. The Phase 2 D-19 StatusPill (top-left of card image) already labels the listing as «На модерации» / "Pending review" — zero new pill work. Mod sees exactly what the renter would see post-approval, lowering surprise. No new compact-row component, no custom card variant.
- **D-02 (Tap-row behavior — route to PropertyDetailsScreen):** Tapping a queue row navigates to `PropertyDetailsScreen.tsx` (1680 LOC, largest screen). The detail screen reads via Phase 2 D-06's role-aware payload (mods + admins receive non-live listings with full payload + status field). Approve / Reject / Edit-on-behalf surface as a **moderation action footer** on PropertyDetailsScreen when the viewer's role is moderator-or-admin AND the listing's status is `pending`. The queue row's tap behavior reuses the existing PropertyCard onPress chain — zero new routing logic. Inline-action-sheet pattern was rejected because mods need to inspect the listing exactly as a renter would.
- **D-03 (Profile entry-point — pending-count badge):** Profile menu row reads "Moderation Queue" / «Модерация» followed by a count pill (e.g., red badge `(3)`) when count > 0. Mirrors the M1 mainstream-moderation-tool convention. Entry-point gated by `<Gated action="viewModerationQueue">` (new Action union member added to `src/hooks/useRole.ts`); zero entry-point visible for plain users. Pattern follows Phase 4.5's `canReviewLandlordApplications && onReviewLandlordApplications && (<TouchableOpacity ...>)` precedent. **Count fetch:** planner discretion — either a tiny `GET /api/moderation/queue/count` endpoint OR piggyback on `GET /api/moderation/queue` returning `{items: [...], totalCount: N}`. The first call is on Profile mount (and on AppState 'active' refresh per D-04); the count refreshes after any of the moderator's own approve/reject actions complete.
- **D-04 (Refresh strategy — pull-to-refresh + AppState 'active' + post-action auto-refetch; no polling):** `ModerationQueueScreen` uses FlatList `refreshControl` for explicit pull-to-refresh. `AppState 'active'` listener calls refetch when the app foregrounds, reusing the **same 60s cooldown pattern from Phase 2 D-17** (do NOT add a second AppState subscription that fires uncoordinated; planner verifies whether the existing AuthContext AppState hook can be extended or a new sibling hook with a shared cooldown registry is needed). After the moderator's own approve/reject completes (200 response), the queue auto-refetches so the row visibly disappears. Profile entry-point pending-count badge also refetches on the same triggers. **No setInterval polling** — keeps battery + Mongo load down at the small mod team scale; mods checking the queue reactively get fresh state on app open.

**Approve / Reject mechanics**

- **D-05 (Approve UX — single-tap + native `Alert.alert` confirm):** Tap Approve button → RN native `Alert.alert` with title "Approve this listing?" / «Одобрить это объявление?» + Cancel / Approve buttons. Approve fires `POST /api/properties/:id/approve`. Matches ROADMAP success criteria #2 verbatim.
- **D-06 (Reject reasonCode UI — inline horizontal chips):** `<RejectListingModal>` renders the 4 reasonCodes as a horizontal chip row. Single-select. Matches Phase 4.5's `LandlordApplicationQueueScreen` reject-reason canned-chips pattern exactly.
- **D-07 (`reasonNote` field — always-visible TextInput below chips):** Multi-line `<TextInput>` rendered below the chip row, labeled "Add a note (optional)" / «Добавить примечание (необязательно)». Max 500 chars. If empty on submit, no `reasonNote` is sent in the request body (or sent as null — planner decides).
- **D-08 (409 Conflict UX — toast + auto-refetch + stay on current screen):** Toast "This listing was already reviewed by another moderator." / «Это объявление уже рассмотрено другим модератором.» (REQUIREMENTS MOD-15 verbatim). Queue refetches automatically; pending-count badge updates. Moderator stays on current screen.

### Claude's Discretion

- **D-09 (`reasonCode` → owner-locale translation — location TBD):** Planner picks server-side dict vs client-side i18n keys vs hybrid. Recommendation seed: client-side i18n keys.
- **D-10 (`moderationLog` schema + atomicity + before/after granularity):** Planner picks. Recommendation seed: changed-fields-only diff for edit-on-behalf; follow-up insert (not transaction) with structured logging on failure.
- **D-11 (`serviceAreas` config storage):** Planner picks file vs collection vs env var. Recommendation seed: static const file at `JayTap-services/src/config/serviceAreas.js` with `['Bishkek']` default + TODO(M3) marker.
- **D-12 (Edit-on-behalf flow specifics):** Status-after-save: recommended `'live'` (mod fixed it = ready to publish). Planner verifies with user before locking.
- **D-13 (Backend route block — new file vs extend existing):** Recommendation seed: new file `moderationRoutes.js` mounted at `/api/moderation/*` with all 4-5 endpoints (including `approve`/`reject` despite path mismatch — domain match wins).
- **D-14 (Test coverage):** Planner has discretion. Recommendation seed: minimal supertest coverage for the 4 new endpoints + race-condition test.
- **D-15 (Visual specifics):** Action footer mount, Reject modal positioning, edit-on-behalf banner color tokens, pending-count badge styling — all planner discretion within `useTheme()` semantic palette.

### Deferred Ideas (OUT OF SCOPE)

- Edit-on-behalf flow specifics — D-12 captures recommendations + open sub-decisions; planner finalizes during plan-phase.
- Backend shape: audit log + reasonCode i18n + serviceAreas — D-09 + D-10 + D-11 capture recommendations + planner-picks-among-options.
- Test coverage strategy — D-14 planner discretion.
- Action footer visual on PropertyDetailsScreen — D-15.
- Reject modal positioning (bottom sheet vs centered) — D-15.
- Pending-count fetch endpoint shape — D-03 planner discretion.
- Polling on the queue screen — explicitly rejected in D-04.
- Bulk multi-select moderation actions — REQUIREMENTS Future §; out of M2.
- Email / push / in-app message notifications on approval / rejection — REQUIREMENTS Future §.
- Lease-based pessimistic locking on the moderation queue — REQUIREMENTS Future §; optimistic 409 (MOD-15) suffices.
- Self-promotion path / "apply to be a moderator" — REQUIREMENTS Future §.
- M3+ admin UI for editing the `serviceAreas` list — D-11.
- M3+ moderation log audit screen — `moderationLog` is append-only and forward-fits a UI. No M2 UI.
- Hierarchical permission inheritance — REQUIREMENTS Future §.
- Material-edit re-queues to pending rule on owner edits — Phase 2 D-22 explicitly carved this out as future-phase.
- In-app moderation messaging thread (mod ↔ owner) — REQUIREMENTS Future §.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| MOD-10 | Moderation Queue screen lists `status: 'pending'` listings, FIFO sort by `submittedAt`, accessible via Profile entry-point gated by `<Gated action="viewModerationQueue">`. Mounted as overlay in `App.tsx OVERLAY_FLAGS` (NOT a 6th BottomNav tab). | LandlordApplicationQueueScreen is the sibling-pattern source (FIFO via `.sort({ submittedAt: 1 })`, FlatList + RefreshControl, profile entry-point pattern). Phase 4.5 reference: `/Users/beckmaldinVL/development/mobileApps/JayTap/src/screens/LandlordApplicationQueueScreen.tsx`. App.tsx OVERLAY_FLAGS extension pattern documented at App.tsx:104-110. New Action union member added to useRole.ts (Action union has 8 members today; +1). |
| MOD-11 | Each Moderation Queue row shows three actions: Approve / Reject / Edit-on-behalf. Reject opens a modal; Edit-on-behalf opens `CreateListingScreen` with a `moderatorContext` prop. Approve is a confirmed single-tap action. | D-01 says rows reuse PropertyCard and tap navigates to PropertyDetailsScreen (D-02). Three-action-row layout per CONTEXT.md "Specific Ideas". Approve = `Alert.alert` (RN native, used in Phase 4.5 LandlordApplicationQueueScreen handleApprove). |
| MOD-12 | Reject requires a `reasonCode` from the M2 enum: `incomplete-info`, `prohibited-content`, `out-of-service-area`, `other`. Optional `reasonNote` free-text. The `out-of-service-area` reason is backed by a configurable `serviceAreas` list (M2 default: `['Bishkek']`; expandable to Almaty/Tashkent/etc. without code change). | Backend enum validator pattern: copy `VALID_REJECT_CODES` array from `landlordApplicationRoutes.js:46`. serviceAreas config: D-11 recommends static const file `JayTap-services/src/config/serviceAreas.js`. |
| MOD-13 | Reject reason is stored as a structured `reasonCode` enum on `Property.rejectionReasonCode` (translated server-side at view time to the **owner's locale**, NOT the moderator's locale). Free-text `reasonNote` is stored verbatim and displayed as-is. Moderator identity is NEVER exposed to the owner; banner reads "JayTap moderator" / «Модератор JayTap» generically. | D-09 recommendation: client-side i18n keys at `moderation.reject.reason.{code}` namespace following existing `landlordApp.rejectReason.{code}` precedent at `src/locales/en.ts:570-573`. Phase 2 RejectionBanner already takes `reasonCode` + `reasonNote` props; Phase 3 only changes how `reasonCode` is rendered (lookup in i18n table). MOD-13 moderator-identity-privacy ALREADY honored by RejectionBanner today (component never references the moderator). |
| MOD-14 | Edit-on-behalf reuses M1's decomposed `CreateListingScreen` with a new optional `moderatorContext: {editingOwnerUid, reason?}` prop. When set, save dispatches `editAsModerator` (new endpoint) instead of `updateProperty`; the listing's `ownerUid` is NOT mutated. An audit row is written to `moderationLog` with `before`/`after` field snapshots. | CreateListingScreen interface at line 46; `propertyToEdit?: Property` already supports edit mode; rehydrate paths preserve `ownerUid` (only `req.firebaseUid` from token is used as ownerUid in POST; PUT does not update `ownerUid`). Phase 3 adds 1 new prop + 1 conditional save dispatcher branch. New endpoint per D-13: `PUT /api/moderation/listings/:id`. |
| MOD-15 | Server enforces 409 Conflict on race conditions: `findOneAndUpdate({_id, status: 'pending'}, ...)` returns null when another moderator has already acted; the API returns 409 with `code: 'ALREADY_MODERATED'`. Client shows EN+RU "This listing was already reviewed by another moderator." / «Это объявление уже рассмотрено другим модератором.» toast and refetches the queue. | PITFALLS Pitfall 5 + Pitfall 14 cover the race + idempotency design. Phase 4.5 has analog at `landlordApplicationRoutes.js:241-246` (`if (app.status !== 'submitted') return res.status(409).json({code: 'ALREADY_DECIDED'})`) but uses a load-then-check pattern that is NOT race-safe. Phase 3 MUST use atomic `findOneAndUpdate` per Pitfall 5. **This is the highest-risk surface in M2 and the verifier-misses-regressions class.** |
| MOD-16 | `moderationLog` Mongo collection is append-only and captures every approve / reject / archive / edit-on-behalf action: `{actorUid, action, targetType: 'property', targetId, before, after, reasonCode?, reasonNote?, at}`. No M2 UI; data is forward-fit for a future M3+ audit-log screen. | `LandlordApplicationAuditLog.js` (28 LOC) is the sibling-pattern source; Phase 3 copy-paste with renames. `actorUid` MUST come from `req.firebaseUid` (token-verified). Atomicity: D-10 recommendation = follow-up insert with structured logging. |
| MOD-17 | New backend endpoints: `GET /api/moderation/queue`, `POST /api/properties/:id/submit`, `POST /api/properties/:id/approve`, `POST /api/properties/:id/reject` (body: `reasonCode`, optional `reasonNote`), `PUT /api/moderation/listings/:id` (edit-on-behalf). All require role ≥ moderator; admin inherits. All write to `moderationLog`. | All 4-5 endpoints land in `moderationRoutes.js` per D-13; mount at `/api/moderation` in `index.js:118-119`. Apply `verifyFirebaseToken` + `requireMinRole('moderator')` to entire router via `router.use(...)` (matches Phase 4.5 admin queue pattern). NOTE: REQUIREMENTS includes `POST /api/properties/:id/submit` which is already MOD-03 territory and was effectively shipped in Phase 2 (POST `/api/properties` defaults to 'pending'); Phase 3 plan should clarify whether this endpoint is needed at all (recommend: skip unless owner-explicit-resubmit-from-draft path is wanted, which it is not — Phase 2 D-22 auto-flip handles re-submission). |
| MOD-18 | EN+RU locale parity for all new strings. | Estimated 18-22 new keys per CONTEXT.md `<canonical_refs>` line 139. CI gate `scripts/check-i18n-parity.sh` enforces. Existing namespaces to extend: `moderation.*` (new), `listings.rejection.*` (existing — may add reason translations as `listings.rejection.reason.{code}` or under new `moderation.reject.reason.{code}`). |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

These are project-level directives that constrain Phase 3 implementation:

- **Navigation:** Custom `App.tsx` state machine ONLY. No `react-navigation`. New ModerationQueueScreen MUST mount as an OVERLAY_FLAGS entry following the M1 Phase 1 derived-overlay pattern.
- **State:** React Context providers (`ThemeProvider` → `LanguageProvider` → `AuthProvider`); local `useState` for components. No Redux, MobX, Zustand, etc.
- **HTTP:** `axios` to Railway backend via the shared `apiClient.ts` (Phase 1 Plan 10). Bearer is auto-attached. New PropertyService extensions inherit `Authorization: Bearer` transparently — do NOT add per-call header logic.
- **i18n:** EN + RU parity required for every new UI string in `src/locales/en.ts` AND `src/locales/ru.ts`. CI gate enforces parity (`scripts/check-i18n-parity.sh`).
- **Theme:** Use `useTheme()` semantic tokens (`colors.primary`, `colors.warning`, `colors.error`, `colors.surface`, etc.). NO hardcoded colors. Dark/light parity required.
- **Testing bar:** Manual physical-device QA on iPhone 15 Pro Max + Moto G XT2513V is the project bar. Supertest is welcome where the surface warrants it (race-condition logic does — see Validation Architecture).
- **NO Firebase SDK in client:** Do NOT propose `firebase` or `@react-native-firebase/*` packages. Backend uses `jose@^6` for JWKS (already in place).
- **MongoDB role authority:** Phase 3's role checks read `req.user.userType` server-side (already populated by `verifyFirebaseToken`); client reads `user.backendProfile.userType` via `useRole()`. Firebase custom claims are NOT the role source.
- **No new authentication providers:** Email/password Identity Toolkit REST stays; M2 adds nothing here.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Pending listings queue list | Backend (Mongo query + JWKS auth) | Client (FlatList render) | Server filters `status: 'pending'` + role-gates via `requireMinRole('moderator')`; client just renders. Belt-and-suspenders client-side `<Gated>` hides UI but server is the boundary. |
| Race-condition-safe approve/reject | Backend (atomic `findOneAndUpdate`) | Client (409 toast + refetch) | The atomic update IS the locking primitive; client cannot fix this. PITFALLS Pitfall 5 explicit. |
| Reject reasonCode validation | Backend (enum allowlist) | Client (chip selector + button-disabled-until-selected) | Server is authoritative — D-09 keeps the enum on the wire as raw strings; client validation is UX-only. |
| reasonCode → owner-locale translation | Client (i18n key lookup) | — | D-09 recommendation: server stores raw enum; client maps to per-locale string at render time using owner's app language. Owner's locale = the app's active language (always correct, no `Accept-Language` plumbing needed). |
| Edit-on-behalf form | Client (CreateListingScreen reuse via `moderatorContext` prop) | Backend (`PUT /api/moderation/listings/:id` writes audit log + flips status to `'live'`) | M1 form is reused; mod-context is purely UI gating + which endpoint the save dispatcher hits. ownerUid never mutated. |
| Audit log writes | Backend (`ModerationLog.create()` after action succeeds) | — | Append-only Mongo collection; not load-bearing for live mod actions; forward-fit for M3+ audit UI. |
| Moderator identity privacy (banner shows "JayTap moderator", never the actor's name) | Client (RejectionBanner is already pure-presentation; never reads moderator id) | Backend (NEVER include `rejectedByUid` in any owner-facing payload) | Already honored by Phase 2's RejectionBanner shape (no moderator-identity prop exists); Phase 3 must NOT add one to the banner or to the payload returned by `GET /api/properties/:id`. |
| Profile pending-count badge | Backend (count endpoint OR `totalCount` on queue payload) | Client (Profile renders count) | D-03 planner discretion — recommended: piggyback `totalCount` on `GET /api/moderation/queue` to avoid a 5th endpoint, OR add tiny dedicated `GET /api/moderation/queue/count` for cheap polling. |
| Service-areas config (backs `out-of-service-area`) | Backend (static const file in M2; admin-edit UI in M3+) | — | M2 default `['Bishkek']`; field shape MUST forward-fit `[{name, country}]` for KG/KZ/UZ expansion (auto-memory `geographic-scope.md`). |

## Standard Stack

### Core (already installed — Phase 3 adds NOTHING new)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `jose` | `^6.2.3` | JWKS verification on backend (already in use by `verifyFirebaseToken`) | Phase 1 standard; Phase 3 inherits via `requireMinRole('moderator')` middleware. [VERIFIED: `JayTap-services/package.json:25`] |
| `mongoose` | `^9.1.6` | Mongoose ODM for MongoDB (already in use; `mongodb+srv://` Atlas connection per `.env.example`) | Mongoose 9 supports `findOneAndUpdate`, `startSession`/transactions on Atlas (replica set). Phase 3 only needs `findOneAndUpdate`. [VERIFIED: `package.json:26`; `db.js`] |
| `express` | `^5.2.1` | HTTP framework (already in use) | Phase 3 adds one new route file (`moderationRoutes.js`). [VERIFIED: `package.json:23`] |
| `axios` | `^1.13.5` | HTTP client (already in use via `apiClient.ts`) | Phase 3 PropertyService methods inherit Bearer auth. [VERIFIED: client `package.json:16`] |
| `lucide-react-native` | `^0.564.0` | Icon set (already in use; Phase 4.5's queue uses `Check`, `X`, `ChevronLeft`) | Phase 3 uses same icons. [VERIFIED: client `package.json:21`] |
| `react-native-safe-area-context` | `^5.5.2` | SafeAreaView wrapper (already in use) | Standard for new screens. [VERIFIED: client `package.json:24`] |
| `@react-native-async-storage/async-storage` | `^2.2.0` | AsyncStorage (already in use) | Phase 3 adds NO new persisted keys (queue + count are ephemeral, fetched on demand). [VERIFIED: client `package.json:14`] |

### Supporting (already installed)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Native RN `Alert.alert` | bundled | Approve confirmation dialog (D-05) | Already used in Phase 4.5 LandlordApplicationQueueScreen `handleApprove` and ProfileScreen logout. RN best practice for simple confirm/cancel flows. |
| Native RN `Modal` (or visibility-flag overlay) | bundled | RejectListingModal (D-06) | Phase 4.5 LandlordApplicationQueueScreen uses `Modal` for its reject prompt (lines 92-110); reuse the same approach. |
| `multer` + `multer-s3` | `^1.4.5-lts.1` / `^3.0.1` | Multipart form uploads | Edit-on-behalf endpoint (`PUT /api/moderation/listings/:id`) reuses the existing `upload.array('images', 40)` pattern from `propertyRoutes.js:104` for image uploads. |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Static `serviceAreas.js` file (D-11) | Mongo collection `service_areas` | Heavier; needs CRUD surface in M3+; M2 launch is Bishkek-only and admin-edit unlocks no product value yet. **Stick with file.** |
| Static `serviceAreas.js` file (D-11) | `SERVICE_AREAS` env var | Operational simplicity; loses country/structure; can't forward-fit `[{name, country}]` shape cleanly. **Stick with file.** |
| Atomic `findOneAndUpdate` (MOD-15) | Mongo session + transaction wrapping status flip + audit insert | Transactions add overhead; Mongo Atlas tier supports them but Phase 4.5 chose follow-up insert (orphan-tolerant pattern); audit log is forward-fit for M3+ UI, not load-bearing. **Stick with follow-up insert.** |
| Client-side i18n for reasonCode (D-09) | Server-side dictionary keyed by `reasonCode` × `locale` | Centralized but adds `Accept-Language` plumbing or `req.user.locale` lookup; reasonNote is verbatim anyway (MOD-13); only ~8 keys to add client-side. **Stick with client-side i18n.** |
| New `moderationRoutes.js` file (D-13) | Extend `propertyRoutes.js` | Cleaner separation; mirrors Phase 4.5 pattern; the queue + edit-on-behalf endpoints don't fit `/properties/*` mental model. **New file.** Note: `landlordApplicationRoutes.js` mounts admin sub-paths under `/api/landlord-applications/admin/*` (path mismatch but domain match) — Phase 3 may do the same for `/api/moderation/properties/:id/approve` etc., OR keep `/api/properties/:id/approve` for path consistency (planner picks; this RESEARCH recommends colocating all in `moderationRoutes.js` and mounting at both `/api/moderation` AND adding a single `app.use('/api/properties/:id/approve', ...)` shim — but the SIMPLEST option is to mount all at `/api/moderation/*` and accept `/api/moderation/properties/:id/approve` as the canonical URL). |
| Native `Alert.alert` for Approve confirm (D-05) | Custom themed bottom sheet | Heavier (new component); RN native dialog is consistent with Phase 4.5 LandlordApplicationQueueScreen. **Stick with `Alert.alert`.** |

**Installation:**
```bash
# NO new dependencies for Phase 3.
# CONVENTIONS.md "no `firebase` / `@react-native-firebase/*` packages" rule preserved.
# CONFIRMED via package.json read: client and backend already have everything.
```

**Version verification (run before locking the plan):**
```bash
# Backend (Node 22+, use `nvm use 24` first per backend-node-version.md memory)
cd /Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services
nvm use 24
npm view jose version       # confirm ^6 still current
npm view mongoose version   # confirm ^9 still current

# Client (default Node 20 OK)
cd /Users/beckmaldinVL/development/mobileApps/JayTap
# No new deps — skip
```

## Architecture Patterns

### System Architecture Diagram

```
                            ┌──────────────────────────────────────┐
                            │  Moderator opens app                 │
                            │  AppState 'active' → AuthContext     │
                            │  refreshRole() (60s cooldown)        │
                            └─────────────┬────────────────────────┘
                                          │
                          ┌───────────────▼────────────────┐
                          │  ProfileScreen mounts          │
                          │  - canViewModerationQueue?     │
                          │  - fetch pendingCount          │
                          │  - render badge if count > 0   │
                          └───────────────┬────────────────┘
                                          │ tap
                          ┌───────────────▼────────────────┐
                          │  App.tsx                       │
                          │  setIsModerationQueueOpen(true)│
                          │  OVERLAY_FLAGS recomputes      │
                          │  hideMainStackUnderOverlay=T   │
                          └───────────────┬────────────────┘
                                          │
                          ┌───────────────▼────────────────┐
                          │  ModerationQueueScreen         │
                          │  GET /api/moderation/queue     │
                          │  → render PropertyCard FlatList│
                          │  - Pull-to-refresh             │
                          │  - Empty state if [] returned  │
                          └─┬───────────────┬──────────────┘
                            │ tap row       │ tap inline action
                            │               │  (Approve/Reject/Edit)
              ┌─────────────▼──┐         ┌──▼──────────────────────┐
              │ Property-      │         │ Action dispatcher       │
              │ DetailsScreen  │         ├─────────────────────────┤
              │ (mods see full │         │ Approve:                │
              │ payload — D-06)│         │  Alert.alert confirm    │
              │                │         │   → POST /:id/approve   │
              │ Footer renders │         │ Reject:                 │
              │ if role>=mod   │         │  Open RejectListingModal│
              │ AND status=    │         │   chip + textnote       │
              │ 'pending':     │         │   → POST /:id/reject    │
              │  Approve/      │         │ Edit-on-behalf:         │
              │  Reject/       │         │  Open CreateListing     │
              │  Edit-on-      │         │   with moderatorContext │
              │  behalf btns   │         │   → PUT /moderation/    │
              └────────────────┘         │      listings/:id       │
                                         └──────────┬──────────────┘
                                                    │
                ┌───────────────────────────────────▼───────────────────────────┐
                │  Backend (Express + jose + Mongoose)                          │
                │  ─────────────────────────────────────────────────────        │
                │  router.use(verifyFirebaseToken, requireMinRole('moderator')) │
                │                                                               │
                │  Approve:                                                     │
                │   await Property.findOneAndUpdate(                            │
                │     { _id, status: 'pending' },                               │
                │     { $set: { status: 'live',                                 │
                │               approvedAt: now,                                │
                │               approvedByUid: req.firebaseUid } },             │
                │     { new: true })                                            │
                │   if (null) → 409 { code: 'ALREADY_MODERATED' }               │
                │   else → ModerationLog.create({                               │
                │              actorUid: req.firebaseUid,                       │
                │              action: 'approve',                               │
                │              targetType: 'property', targetId,                │
                │              before: {status: 'pending'},                     │
                │              after:  {status: 'live'},                        │
                │              at: now })                                       │
                │       → 200 with refreshed listing                            │
                │                                                               │
                │  Reject: same shape; updates rejection metadata; same audit   │
                │  Edit-on-behalf: load + diff-changed-fields + save +          │
                │                  flip status to 'live' (D-12 sub-decision) +  │
                │                  audit log with before/after diff             │
                └───────────────────────────────────┬───────────────────────────┘
                                                    │
                ┌───────────────────────────────────▼─────────────────────────┐
                │  Owner side (NO new code in Phase 3 — Phase 2 already       │
                │  wired):                                                    │
                │  ─ HomeRejectionBanner reads count of own rejected         │
                │  ─ RejectionBanner on PropertyDetailsScreen reads          │
                │     reasonCode + reasonNote from /api/properties/:id      │
                │     payload that Phase 3 server has now POPULATED          │
                │  ─ Owner taps "Edit & resubmit" → CreateListingScreen     │
                │     edit mode → server auto-flips to 'pending' (Phase 2   │
                │     D-22 auto-flip; NO mod action needed)                 │
                └────────────────────────────────────────────────────────────┘
```

### Recommended Project Structure

```
src/
├── screens/
│   ├── ModerationQueueScreen.tsx         # NEW — overlay; sibling-pattern from LandlordApplicationQueueScreen
│   ├── PropertyDetailsScreen.tsx         # MODIFIED — add moderation action footer when role>=mod && status=='pending'
│   ├── CreateListingScreen.tsx           # MODIFIED — add `moderatorContext?: {editingOwnerUid, reason?}` prop + 1 conditional banner mount + 1 save dispatcher branch
│   └── ProfileScreen.tsx                 # MODIFIED — add new menu row gated by canViewModerationQueue + pending-count badge
├── components/
│   ├── RejectListingModal.tsx            # NEW — reusable; chip row + textnote + submit; surfaces from queue + detail-screen footer
│   └── RejectionBanner.tsx               # MODIFIED (small) — translate reasonCode via i18n keys (Phase 2 left this with raw `codeLabel = reasonCode || 'incomplete-info'` fallback at line 37)
├── hooks/
│   └── useRole.ts                        # MODIFIED — add `viewModerationQueue` Action union member; add canFromUser switch case (admin || moderator)
├── services/
│   └── PropertyService.ts                # MODIFIED — add 5 methods: approveListing, rejectListing, editAsModerator, getModerationQueue, getModerationQueueCount (or 4 + piggyback count)
├── locales/
│   ├── en.ts                             # MODIFIED — +18-22 keys (see "Locale keys to add")
│   └── ru.ts                             # MODIFIED — same keys (parity gate)
├── context/
│   └── AuthContext.tsx                   # UNCHANGED — Phase 2 D-17 AppState 'active' hook stays as-is. See "Pattern 5: AppState refresh coordination" below.

App.tsx                                   # MODIFIED — add isModerationQueueOpen state, OVERLAY_FLAGS entry, ModerationQueueScreen mount block, profile callback, edit-on-behalf nav. LOC pressure — see "Pattern 4" below.
```

```
backend (JayTap-services)
src/
├── routes/
│   └── moderationRoutes.js               # NEW — 4-5 endpoints; mount at /api/moderation in index.js
├── models/
│   └── ModerationLog.js                  # NEW — copy of LandlordApplicationAuditLog.js with renames
├── config/
│   └── serviceAreas.js                   # NEW — `module.exports = { serviceAreas: [{name: 'Bishkek', country: 'KG'}] }`
└── __tests__/
    └── moderationRoutes.test.js          # NEW — supertest coverage; race-condition test (recommended per D-14)

index.js                                  # MODIFIED — `app.use('/api/moderation', require('./src/routes/moderationRoutes'))`
```

### Pattern 1: Sibling-pattern reuse from Phase 4.5

**What:** Phase 4.5 was deliberately built as a forward-fit for Phase 3. Almost every Phase 3 file has an exact sibling in Phase 4.5.

**When to use:** Always. This is the planner's single biggest acceleration.

| Phase 3 file | Phase 4.5 sibling to copy/mirror |
|---|---|
| `ModerationQueueScreen.tsx` | `LandlordApplicationQueueScreen.tsx` (FlatList + RefreshControl + Modal pattern) |
| `ModerationLog.js` (Mongoose model) | `LandlordApplicationAuditLog.js` (28 LOC, append-only) |
| `moderationRoutes.js` | `landlordApplicationRoutes.js` (router structure, JWKS+requireMinRole pattern, audit-log insert pattern) |
| Profile entry-point row | `LandlordApplicationStatusBanner` Profile mount in ProfileScreen.tsx:210-219 |
| RejectListingModal | Inline modal in LandlordApplicationQueueScreen.tsx:92-110 (4-code chip pattern + textnote) |
| Action union member | `reviewLandlordApplications` member in useRole.ts:22 |

### Pattern 2: Atomic state transitions (race-condition-safe — MOD-15 / Pitfall 5)

**What:** Every state-mutating moderation endpoint MUST use Mongo's atomic conditional update primitive.

**Example:**
```javascript
// Source: PITFALLS Pitfall 5 + Pitfall 14 [CITED: .planning/research/PITFALLS.md:171, 481-490]
// Apply to: POST /api/properties/:id/approve, POST /api/properties/:id/reject

const result = await Property.findOneAndUpdate(
  { _id: req.params.id, status: 'pending' },  // <-- CRITICAL: status precondition in the filter
  {
    $set: {
      status: 'live',
      approvedAt: new Date(),
      approvedByUid: req.firebaseUid,           // <-- MUST come from JWKS-verified token, NEVER from req.body
    },
  },
  { new: true }                                 // return the updated doc
);

if (!result) {
  // The update matched zero documents — listing was already moderated by another mod.
  return res.status(409).json({
    code: 'ALREADY_MODERATED',
    message: 'This listing was already reviewed by another moderator.',
  });
}

// Audit log — follow-up insert (D-10). If this fails the status flip already
// committed; we accept a rare orphan and log loudly. The audit log is forward-fit
// for M3+ UI, not load-bearing.
try {
  await ModerationLog.create({
    actorUid: req.firebaseUid,
    action: 'approve',
    targetType: 'property',
    targetId: result._id,
    before: { status: 'pending' },
    after: { status: 'live' },
    at: new Date(),
  });
} catch (auditErr) {
  console.error(JSON.stringify({
    evt: 'moderation_audit_orphan',
    action: 'approve',
    targetId: String(result._id),
    actorUid: req.firebaseUid,
    err: auditErr.message,
    ts: new Date().toISOString(),
  }));
}

return res.json(result);
```

**Anti-pattern (Phase 4.5 has this exact bug — DO NOT copy):**
```javascript
// landlordApplicationRoutes.js:238-246 uses load-then-check, which is NOT race-safe:
const app = await LandlordApplication.findById(req.params.id);
if (app.status !== 'submitted') {
  return res.status(409).json({ code: 'ALREADY_DECIDED' });
}
// ... gap here where another mod could decide ...
await LandlordApplication.findByIdAndUpdate(app._id, { $set: { status: 'approved' }});
```
Phase 4.5 ships with this pattern because the landlord-application queue has tiny throughput (one application per user, low concurrency). Phase 3's listing queue is higher-frequency and the race window is real. Phase 3 MUST use the atomic pattern from PITFALLS Pitfall 5.

### Pattern 3: actorUid provenance (MOD-16 / auto-memory `phase45-landlord-application-uid-mismatch-bug.md`)

**What:** Every audit-log row's `actorUid` field MUST be derived from `req.firebaseUid` (the JWKS-verified token's `sub` claim). NEVER from `req.body.firebaseUid`, NEVER from `req.headers['x-firebase-uid']`, NEVER from a client-supplied form field.

**Why:** Phase 4.5 had a uid-mismatch bug where submitted applications landed with a uid that didn't match the submitting Firebase uid (memory `phase45-landlord-application-uid-mismatch-bug.md`). The diagnostic fix added a structured log (`landlordApplicationRoutes.js:115-123`) capturing all signals to confirm `req.firebaseUid` is the trustworthy field. Phase 3 MUST land with this discipline from day one — `verifyFirebaseToken` always sets `req.firebaseUid` on success, so the audit-log insert site has a single source.

**Example:** see Pattern 2 above. `actorUid: req.firebaseUid` — not `req.body.actorUid`, not `req.body.firebaseUid`, not `req.headers['x-firebase-uid']`.

### Pattern 4: App.tsx LOC pressure mitigation (PITFALLS Pitfall 8)

**What:** App.tsx is at 1132 LOC, 32 LOC over the 1100 soft cap. Phase 3 minimum additions are +30-45 LOC: `isModerationQueueOpen` state, OVERLAY_FLAGS entry, ModerationQueueScreen mount block (~20 LOC mirroring `isLandlordApplicationQueueOpen` block at App.tsx:993-1008), profile entry-point callback (1 line), back-handler branch (~6 LOC mirroring App.tsx:293-300), edit-on-behalf navigation handlers (~5 LOC), `RejectListingModal` mount (if hosted at App.tsx — recommend mounting INSIDE ModerationQueueScreen and PropertyDetailsScreen instead).

**Recommended mitigation: extract the `selectedProperty` PropertyDetailsScreen overlay block (App.tsx:837-913, 77 LOC).** This is by far the heaviest existing overlay block and the single best extraction candidate. After Phase 3 lands its +30-45 LOC, the extraction nets the file to **<1100 LOC** for the first time in this milestone, restoring the soft-cap invariant.

**Three options for the planner (D-15 carry-forward):**

| Option | Net Δ App.tsx | Tradeoff |
|---|---|---|
| (a) Extract `<PropertyDetailsHost>` from App.tsx:837-913 + add Phase 3 mounts | **−45 to −65 LOC** | Best for repo health; one new file (~85 LOC); zero functional change. RECOMMENDED. |
| (b) Inline the new additions and accept ~+45 LOC drift to ~1175 LOC | **+45 LOC** | Path of least resistance; Pitfall 8 explicitly says "soft cap is signal-not-block"; document in SUMMARY. |
| (c) Hybrid: extract the heaviest existing overlay block AND inline the new lines | **−20 LOC** | Modest improvement; less mechanical change than (a). |

**Heaviest overlay block analysis:**
- `selectedProperty` PropertyDetailsScreen mount: **77 LOC** (App.tsx:837-913) — by far the largest; rich callback wiring (onMessagePress, onScheduleViewing, onLandlordPress, onAdminVerifyDocuments, onEditListing). Strong extraction candidate.
- `isCreateListingOpen` block: ~32 LOC (App.tsx:939-971).
- `isLandlordApplicationOpen` + `isLandlordApplicationQueueOpen` blocks: ~18 LOC each.
- `isRenterListingsOpen` block: ~25 LOC.

### Pattern 5: AppState 'active' refresh coordination (D-04)

**What:** Phase 2 D-17 already shipped an `AppState.addEventListener('change', ...)` subscription in `AuthContext.tsx:239-252` with module-scope `lastRefreshAt` 60s cooldown. Phase 3 needs queue-refetch + pending-count-refetch on the same trigger.

**Read the existing pattern verbatim** (AuthContext.tsx:39-43, 231-252):
```typescript
// Module-scope cooldown (lives outside component for re-render survival)
let lastRefreshAt: number | null = null;
const REFRESH_COOLDOWN_MS = 60_000;

// Inside AuthProvider
useEffect(() => {
  const onChange = (nextState: AppStateStatus) => {
    if (nextState !== 'active') return;
    const now = Date.now();
    if (lastRefreshAt && now - lastRefreshAt < REFRESH_COOLDOWN_MS) return;
    if (!user?.localId) return;  // logout-while-backgrounded guard
    lastRefreshAt = now;
    refreshRole().catch(() => {});
  };
  const sub = AppState.addEventListener('change', onChange);
  return () => sub.remove();
}, [refreshRole, user?.localId]);
```

**Recommendation:** Phase 3 adds a SECOND `AppState.addEventListener('change', ...)` subscription INSIDE `ModerationQueueScreen` (and a SEPARATE one in ProfileScreen for the count badge IF Profile is visible). React Native's `AppState` allows multiple listeners — they don't conflict. The cooldowns can be SEPARATE per consumer (each screen has its own `lastRefreshAt` ref) because the consumers do different work (refreshRole vs queue refetch vs count refetch). They are NOT competing for the same backend call.

**Do NOT extend AuthContext to fan-out the queue refetch** — that would couple AuthContext to feature-specific concerns. The AuthContext's hook is for `refreshRole()` which is a global concern; the queue refetch is a screen-local concern.

**Alternative considered (rejected):** Shared cooldown registry as a new module-scope object exporting `register(handlerId, cooldownMs)` etc. Over-engineered for Phase 3's two new consumers. If a future Phase has 4+ AppState consumers, build the registry then.

### Pattern 6: Owner-locale translation via client-side i18n (D-09)

**What:** The reject endpoint stores raw `reasonCode` enum on `Property.rejectionReasonCode`. The owner-side render (in `RejectionBanner` and `HomeRejectionBanner`) translates via a lookup keyed by `reasonCode` × the owner's app language.

**Key namespace pattern (verbatim from existing landlord-application precedent at `src/locales/en.ts:570-573`):**
```typescript
// Add to en.ts (and parity-mirror in ru.ts):
'moderation.reject.reason.incomplete-info': 'Incomplete information',
'moderation.reject.reason.prohibited-content': 'Prohibited content',
'moderation.reject.reason.out-of-service-area': 'Out of service area',
'moderation.reject.reason.other': 'Other',
```

**RejectionBanner change** (`src/components/RejectionBanner.tsx:37` currently has `const codeLabel = reasonCode || 'incomplete-info';`). Phase 3 changes the `codeLabel` resolution from raw enum to a translated string:
```typescript
// Before:
const codeLabel = reasonCode || 'incomplete-info';

// After (Phase 3):
const reasonKey = `moderation.reject.reason.${reasonCode || 'incomplete-info'}` as const;
const codeLabel = t(reasonKey as any) as string;
```

The owner's locale is the app's active language (always correct — `useLanguage()` in the banner). Server-side translation would need `req.user.locale` lookup or `Accept-Language` plumbing for ZERO product benefit; reasonNote is verbatim per MOD-13 anyway.

### Pattern 7: serviceAreas config forward-fit (D-11)

**What:** Static const file at `JayTap-services/src/config/serviceAreas.js`. M2 default `[{name: 'Bishkek', country: 'KG'}]`. Forward-fits to KG/KZ/UZ expansion (auto-memory `geographic-scope.md`).

**Example:**
```javascript
// JayTap-services/src/config/serviceAreas.js
// M2 default: Bishkek launch market only.
// M3+ TODO: Almaty (KZ), Tashkent (UZ), and smaller cities across all three countries.
// M3+ admin UI for editing this list is OUT OF SCOPE for M2.
module.exports = {
  serviceAreas: [
    { name: 'Bishkek', country: 'KG' },
  ],
};

// Optional helper (not strictly needed in M2 — `out-of-service-area` reasonCode is
// a free moderator choice, NOT server-validated against the listing's location):
module.exports.isInServiceArea = (city, country) =>
  module.exports.serviceAreas.some(a =>
    a.name.toLowerCase() === (city || '').toLowerCase() &&
    a.country.toUpperCase() === (country || 'KG').toUpperCase()
  );
```

**Note:** The reasonCode chip is a free moderator choice — there is NO server-side enforcement that the listing being rejected IS actually out-of-area. The `serviceAreas` list informs M3+ admin UX (and possibly a hint to the moderator client-side: "This listing is in Bishkek; are you sure?"). Phase 3 ships the storage; the consumption beyond audit-log lookup is M3+.

### Anti-Patterns to Avoid

- **Adding `firebase` or `@react-native-firebase/*` to client `package.json`:** REPO RULE per memory `no-firebase-sdk.md`. Backend-only JWKS via `jose` is the entire auth strategy.
- **Using `req.body.firebaseUid` or `req.headers['x-firebase-uid']` for `actorUid`:** Phase 4.5 had this exact bug class (memory `phase45-landlord-application-uid-mismatch-bug.md`). USE `req.firebaseUid` from `verifyFirebaseToken`.
- **Load-then-check race pattern (`findById` then `if (status !== 'pending')`):** PITFALLS Pitfall 5 explicit. USE atomic `findOneAndUpdate({_id, status: 'pending'}, ...)`.
- **Extending `OVERLAY_FLAGS` from a different file:** OVERLAY_FLAGS is the single source of overlay-stack truth (App.tsx:104-110). Adding `isModerationQueueOpen` MUST happen in App.tsx itself, in the OVERLAY_FLAGS array, with a code-review checklist confirmation.
- **Polling the queue or count on a setInterval:** D-04 explicitly rejects polling. Pull-to-refresh + AppState 'active' + post-action refetch is the policy.
- **Including `rejectedByUid` (or any moderator-identifying field) in the owner-facing `GET /api/properties/:id` payload:** MOD-13 hard rule. Banner reads "JayTap moderator" generically. The `rejectedByUid` field stays in Mongo for the moderationLog cross-reference but is NEVER serialized in the owner payload.
- **Mutating `Property.ownerUid` on edit-on-behalf:** MOD-14 hard rule. The PUT handler MUST NOT touch `ownerUid` even if a malicious request body includes it. Strip it from `updateData` (mirror the Phase 2 D-22 sanitizer pattern at `propertyRoutes.js:399-403`).
- **Rendering the moderator's email/name anywhere on the owner-facing UI:** Same MOD-13 rule. RejectionBanner today has zero moderator-identity props — keep it that way.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Bearer attachment + 401/403 retry | Per-call `Authorization` header in new PropertyService methods | The shared `apiClient` (Plan 01-10) already does this — just `apiClient.post(...)` and the interceptor attaches the token | `getHeaders()` boilerplate was eliminated in Plan 01-11; reintroducing it would drift from the convention |
| JWKS verification on new endpoints | Inline `jwtVerify()` calls in moderationRoutes.js | `router.use(verifyFirebaseToken)` + `router.use(requireMinRole('moderator'))` from `verifyFirebaseToken.js` | PITFALLS Pitfall 2 explicit — single shared JWKS singleton; no per-route inline verification |
| Audit log Mongoose model | Custom collection definition | Copy `LandlordApplicationAuditLog.js` and rename fields (sibling-pattern; D-10) | Phase 4.5 audit pattern is shippped + tested; no reason to redesign |
| Race-condition-safe state machine | Application-level locking, queue claim TTLs, etc. | Mongo's atomic `findOneAndUpdate({_id, status: 'pending'}, ...)` | PITFALLS Pitfall 5 — Mongo's CAS semantics ARE the lock; lease-based pessimistic locking is REQUIREMENTS Future § for a reason |
| Reject reasonCode validation | Inline string comparison in route handler | Const allowlist array `VALID_REJECT_CODES` at the top of `moderationRoutes.js`, mirror of `landlordApplicationRoutes.js:46` | Trivial pattern; readability + symmetry win |
| 409 toast UI | Custom toast library (`react-native-toast-message` etc.) | Native `Alert.alert(t(...))` — same as Phase 4.5 reject failure path | Already used in Phase 4.5 `LandlordApplicationQueueScreen.tsx:81-82`; zero new dependencies |
| Reject modal | Custom bottom-sheet library (`@gorhom/bottom-sheet` etc.) | Native RN `Modal` component — same as Phase 4.5 reject modal | Bottom-sheet libs add a peer-dep + Reanimated wiring complexity for marginal UX gain at this scale |
| Mongo session/transaction wrapper | `mongoose.startSession()` + `withTransaction(...)` for atomicity | Follow-up `await ModerationLog.create(...)` after the status flip succeeds | D-10 recommendation: orphan-tolerant; matches Phase 4.5 precedent (`landlordApplicationRoutes.js:135-142, 261-268`); audit log is forward-fit for M3+, not load-bearing |
| Owner-locale translation backend infra | `req.user.locale` lookup + per-locale dictionary on backend | Client-side i18n keys `moderation.reject.reason.{code}` resolved at render time | D-09 recommendation; `Accept-Language` plumbing not needed; reasonNote is verbatim per MOD-13 |

**Key insight:** Phase 3 is the rare case where "use existing patterns" maps almost 1:1 to "use existing FILES". The Phase 4.5 sibling-pattern reuse is a strong design accelerator AND a prior-incident safety net (Phase 3 starts with the lesson learned about uid-mismatch + atomic state transitions baked in).

## Common Pitfalls

### Pitfall 1: Race condition on two-mod-same-listing (PITFALLS Pitfall 5 + 14)

**What goes wrong:** Two mods open the queue. Both see listing X. Mod A taps Approve at 14:32:01.4. Mod B taps Reject at 14:32:01.7. Without atomic state transitions, listing ends up rejected; mod A's UI says "approved"; the owner gets a rejection notification with no context.

**Why it happens:** Naive `findById` + `findByIdAndUpdate` has a race window. The Phase 4.5 admin-decide route (`landlordApplicationRoutes.js:238-246`) ships this exact pattern because that queue's throughput is tiny, but Phase 3 inherits the high-frequency listing queue and the race window is real.

**How to avoid:** Pattern 2 above. Atomic `findOneAndUpdate({_id, status: 'pending'}, ...)`. Loser receives null → return 409 with `code: 'ALREADY_MODERATED'`. Client surfaces the EN+RU toast (MOD-15 verbatim copy locked).

**Warning signs:** Spec doesn't mention 409 / conflict handling. PR diff for the approve/reject handler does not include the `status: 'pending'` filter inside the `findOneAndUpdate` query.

### Pitfall 2: actorUid uid-mismatch (auto-memory `phase45-landlord-application-uid-mismatch-bug.md`)

**What goes wrong:** Audit-log rows land with `actorUid` ≠ the submitting moderator's Firebase uid. Phase 4.5 had this exact bug class.

**Why it happens:** Reading uid from `req.body.firebaseUid` (or `req.headers['x-firebase-uid']`) instead of from the JWKS-verified token's `sub` claim (which `verifyFirebaseToken` exposes as `req.firebaseUid`).

**How to avoid:** Pattern 3 above. ALWAYS `actorUid: req.firebaseUid`. Code review checklist for Phase 3: grep moderationRoutes.js for `actorUid:` and confirm every occurrence reads from `req.firebaseUid`, never from `req.body` or `req.headers`.

**Warning signs:** Any line of the form `actorUid: req.body.actorUid` or `actorUid: req.headers['x-firebase-uid']`. PR includes a `firebaseUid` field in the request body schema.

### Pitfall 3: GSD verifier missing race-condition regressions (auto-memory `gsd-verifier-misses-regressions.md`)

**What goes wrong:** Phase 1 verifier reported PASS 15/15 while code reviewer found 2 CRITICAL regressions in the same commit chain. Goal-backward "did the req get touched" doesn't catch downstream race-condition logic. Phase 3's MOD-15 race-condition surface is exactly this class of risk.

**Why it happens:** Goal-backward verification ("does the code address MOD-15?") can pass on a non-atomic implementation that still LOOKS like it handles 409. The race window is invisible to the verifier without explicit test coverage.

**How to avoid:** Treat verifier + reviewer as paired gates (memory directive). Code review at minimum. AT LEAST one supertest race-condition test for `findOneAndUpdate({_id, status: 'pending'}, ...)`. The test asserts that the second concurrent call returns 409, NOT that the listing happens to be in non-pending state by the time the second call arrives.

**Warning signs:** Tests assert on `status === 'live'` after the second call (false-positive — the first call already flipped it; the test doesn't probe the race window).

### Pitfall 4: App.tsx LOC drift past hard ceiling (PITFALLS Pitfall 8)

**What goes wrong:** App.tsx blows past the 1100 soft cap (already at 1132); accumulating overlay flags reintroduces M1 Phase 1 nav bugs (stale boolean traps, stacking order ambiguity, back-handler dep array bloat).

**Why it happens:** Path of least resistance: "add a useState, add a conditional render". M2 implementer might be a different session that doesn't see M1 Phase 1's lessons unless they're encoded in the spec.

**How to avoid:** Pattern 4 above. Recommended: extract the 77-LOC `selectedProperty` PropertyDetailsScreen overlay block into `<PropertyDetailsHost>` to net Phase 3's adds to ≤0. Confirmed extraction candidate by line count: App.tsx:837-913.

**Warning signs:** Phase 3 plan adds 3+ new useState lines to App.tsx without touching `OVERLAY_FLAGS`. Back-handler dep array grows past 25.

### Pitfall 5: i18n parity drift (PITFALLS Pitfall 12)

**What goes wrong:** ~18-22 new keys added to en.ts but not ru.ts (or vice versa). CI gate `scripts/check-i18n-parity.sh` blocks the commit.

**Why it happens:** Phase 3 adds many new strings across multiple namespaces; easy to miss one in one file.

**How to avoid:** Add every key to BOTH files in the SAME commit. Run `scripts/check-i18n-parity.sh` locally before push. Plan a single locale-keys task that lands en.ts + ru.ts changes atomically (as Phase 2 Plan 04 did).

**Warning signs:** Plan splits locale-key additions across multiple tasks/commits.

### Pitfall 6: Mod-action footer leaks into non-mod views (Pitfall 1 — client-as-security)

**What goes wrong:** PropertyDetailsScreen shows the moderation action footer to a non-mod user because the render condition is fragile (e.g., reads from a stale state slice).

**Why it happens:** Forgetting that `<Gated>` is UI hiding only — backend MUST also reject the action. PITFALLS Pitfall 1 explicit.

**How to avoid:** Belt-and-suspenders defense in depth. Render condition: `useRole().can('approveListings') && status === 'pending'`. Backend: `requireMinRole('moderator')` on every endpoint. Even if the UI renders the button to a renter (because of a bug), the server returns 403 `code: 'insufficient-role'`.

**Warning signs:** The mod-action footer's render condition reads from a long-lived `useState` slice that could be stale across role changes.

### Pitfall 7: Moderator backgrounds the app mid-reject (PITFALLS Pitfall 10)

**What goes wrong:** Moderator opens RejectListingModal, picks reason, types note, backgrounds the app. Comes back, modal is gone (state lost), listing already removed from queue (optimistic UI removed it before server ACK). Confused — did the action complete?

**Why it happens:** Optimistic UI shows "removed" instantly without server confirmation. State of the in-flight modal is not preserved.

**How to avoid:** Pessimistic UI: button enters loading state; server response triggers either success-and-remove-from-queue OR error-and-keep-with-warning. No "instant remove" before server ACK. (Phase 4.5 LandlordApplicationQueueScreen.tsx:80-87 follows this pattern — `setItems((prev) => prev.filter(...))` only fires INSIDE the `onPress` after the await resolves successfully.)

**Warning signs:** Phase 3 plan's queue refetch logic optimistically removes the row before the API call resolves.

### Pitfall 8: Edit-on-behalf preserves the wrong status post-save (D-12 sub-decision)

**What goes wrong:** Mod opens edit-on-behalf on a `'rejected'` listing, fixes the issue, saves. Status stays `'rejected'` (or flips to `'pending'`) when the mod's intent was to publish.

**Why it happens:** The PUT handler doesn't apply the D-12 status-after-save semantics. Or the planner picked `'pending'` (forcing another mod to approve) when `'live'` is the simpler model.

**How to avoid:** D-12 recommendation: status flips to `'live'` (mod fixed it = ready to publish; otherwise the mod would just hit Approve right after). Audit log captures the action `'edit-on-behalf'` with full before/after diff which IS the audit trail.

**Warning signs:** Plan picks `'pending'` without an explicit user confirmation. Recommend the planner surface this for confirmation BEFORE locking.

## Code Examples

Verified patterns from sibling files in this repo.

### Backend: New route file with role-gating

```javascript
// Source: mirror of /Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/routes/landlordApplicationRoutes.js
// New file: src/routes/moderationRoutes.js

const express = require('express');
const router = express.Router();
const Property = require('../models/Property');
const ModerationLog = require('../models/ModerationLog');
const { verifyFirebaseToken, requireMinRole } = require('../middleware/verifyFirebaseToken');

// All endpoints require role >= moderator. Mounting at the router level means
// every route below inherits both middlewares — no per-route repetition.
router.use(verifyFirebaseToken, requireMinRole('moderator'));

const VALID_REJECT_CODES = ['incomplete-info', 'prohibited-content', 'out-of-service-area', 'other'];

// GET /api/moderation/queue — FIFO list of pending listings
router.get('/queue', async (req, res) => {
  try {
    const items = await Property.find({ status: 'pending' }).sort({ submittedAt: 1 });
    // D-03: piggyback totalCount so Profile badge fetch can reuse this endpoint
    // (avoids a 5th endpoint). Plan can swap to dedicated /queue/count if preferred.
    return res.json({ items, totalCount: items.length });
  } catch (err) {
    console.error('Error fetching moderation queue:', err);
    return res.status(500).json({ message: err.message });
  }
});

// POST /api/moderation/properties/:id/approve  (or POST /api/properties/:id/approve — D-13 path choice)
router.post('/properties/:id/approve', async (req, res) => {
  try {
    const now = new Date();
    const result = await Property.findOneAndUpdate(
      { _id: req.params.id, status: 'pending' },
      { $set: { status: 'live', approvedAt: now, approvedByUid: req.firebaseUid } },
      { new: true }
    );
    if (!result) {
      return res.status(409).json({ code: 'ALREADY_MODERATED', message: 'This listing was already reviewed by another moderator.' });
    }
    try {
      await ModerationLog.create({
        actorUid: req.firebaseUid,
        action: 'approve',
        targetType: 'property',
        targetId: result._id,
        before: { status: 'pending' },
        after:  { status: 'live', approvedAt: now, approvedByUid: req.firebaseUid },
        at: now,
      });
    } catch (auditErr) {
      console.error(JSON.stringify({ evt: 'moderation_audit_orphan', action: 'approve', targetId: String(result._id), actorUid: req.firebaseUid, err: auditErr.message, ts: new Date().toISOString() }));
    }
    return res.json(result);
  } catch (err) {
    console.error('Error approving listing:', err);
    return res.status(500).json({ message: err.message });
  }
});

// POST /api/moderation/properties/:id/reject — same shape; updates rejection metadata
router.post('/properties/:id/reject', async (req, res) => {
  try {
    const { reasonCode, reasonNote } = req.body;
    if (!reasonCode || !VALID_REJECT_CODES.includes(reasonCode)) {
      return res.status(400).json({ message: `reasonCode must be one of ${VALID_REJECT_CODES.join(', ')}` });
    }
    const now = new Date();
    const result = await Property.findOneAndUpdate(
      { _id: req.params.id, status: 'pending' },
      { $set: {
          status: 'rejected',
          rejectedAt: now,
          rejectedByUid: req.firebaseUid,
          rejectionReasonCode: reasonCode,
          rejectionReasonNote: reasonNote || null,
        } },
      { new: true }
    );
    if (!result) {
      return res.status(409).json({ code: 'ALREADY_MODERATED', message: 'This listing was already reviewed by another moderator.' });
    }
    try {
      await ModerationLog.create({
        actorUid: req.firebaseUid,
        action: 'reject',
        targetType: 'property',
        targetId: result._id,
        before: { status: 'pending' },
        after:  { status: 'rejected', rejectionReasonCode: reasonCode },
        reasonCode,
        reasonNote: reasonNote || null,
        at: now,
      });
    } catch (auditErr) {
      console.error(JSON.stringify({ evt: 'moderation_audit_orphan', action: 'reject', targetId: String(result._id), actorUid: req.firebaseUid, err: auditErr.message, ts: new Date().toISOString() }));
    }
    return res.json(result);
  } catch (err) {
    console.error('Error rejecting listing:', err);
    return res.status(500).json({ message: err.message });
  }
});

// PUT /api/moderation/listings/:id — edit-on-behalf
// Reuses the propertyRoutes.js PUT handler shape but adds: ownerUid stripping,
// status flip to 'live' on save (D-12 sub-decision), audit log with diff.
// Multer upload.array('images', 40) for image uploads — same pattern.
// Body fields are the same as PUT /api/properties/:id minus `ownerUid` (which is stripped).
// Auto-clears all rejection metadata (the mod has fixed the issue; the listing IS the fix).
// (Implementation skeleton — planner expands per the existing PUT /api/properties/:id template
//  at /Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/routes/propertyRoutes.js:338-526.)

module.exports = router;
```

### Backend: New Mongoose audit model

```javascript
// Source: mirror of /Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/models/LandlordApplicationAuditLog.js
// New file: src/models/ModerationLog.js

const mongoose = require('mongoose');

// Phase 3 — Append-only audit log for moderation actions on listings.
// Every approve / reject / edit-on-behalf (and Phase 4 archive) writes a row here.
// No M2 UI; data forward-fits a future M3+ audit-log screen.
const ModerationLogSchema = new mongoose.Schema({
  actorUid:   { type: String, required: true, index: true }, // JWKS-verified token sub — never client-supplied
  action:     { type: String, enum: ['approve', 'reject', 'edit-on-behalf'], required: true },
  targetType: { type: String, enum: ['property'], required: true, default: 'property' }, // forward-fit for other target types
  targetId:   { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  before:     { type: mongoose.Schema.Types.Mixed }, // changed-fields-only snapshot per D-10
  after:      { type: mongoose.Schema.Types.Mixed },
  reasonCode: { type: String, default: null },      // populated on reject
  reasonNote: { type: String, default: null },
  at:         { type: Date, default: Date.now, required: true },
}, {
  collection: 'moderation_log',
});

module.exports = mongoose.model('ModerationLog', ModerationLogSchema);
```

### Backend: Mounting in index.js

```javascript
// Source: /Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/index.js:113-121
// Add one line below the existing landlord-applications mount.

app.use('/api/auth', require('./src/routes/authRoutes'));
app.use('/api/properties', require('./src/routes/propertyRoutes'));
app.use('/api/favorites', require('./src/routes/favoriteRoutes'));
app.use('/api/chats', require('./src/routes/chatRoutes'));
app.use('/api/appointments', require('./src/routes/appointmentRoutes'));
app.use('/api/landlord-applications', require('./src/routes/landlordApplicationRoutes'));
// PHASE 3:
app.use('/api/moderation', require('./src/routes/moderationRoutes'));
```

### Backend: Race-condition supertest pattern (recommended per D-14)

```javascript
// Source: pattern derived from /Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/__tests__/propertyRoutes.test.js
// New file: src/__tests__/moderationRoutes.test.js

// Reuse the JWKS mock + buildToken fixtures from propertyRoutes.test.js.
// (Copy the jest.mock('../config/firebase', ...) block + AWS env var setup verbatim.)

describe('moderationRoutes — MOD-15 race-condition (atomic findOneAndUpdate)', () => {
  let app;
  let pending;

  beforeEach(async () => {
    app = makeApp();
    await User.create({ uid: 'mod-a-uid', email: 'mod-a@x.com', userType: 'moderator' });
    await User.create({ uid: 'mod-b-uid', email: 'mod-b@x.com', userType: 'moderator' });
    pending = await Property.create({
      title: 'Race', listingId: 'P3-RACE', address: '1 Race St', price: 100,
      ownerUid: 'owner-uid', status: 'pending',
    });
  });

  test('two concurrent approves: one returns 200, the other returns 409 ALREADY_MODERATED', async () => {
    const tokenA = await buildToken({ sub: 'mod-a-uid', role: 'moderator', kind: 'valid' });
    const tokenB = await buildToken({ sub: 'mod-b-uid', role: 'moderator', kind: 'valid' });

    // Issue both requests in parallel and Promise.all to capture the race.
    const [resA, resB] = await Promise.all([
      request(app).post(`/api/moderation/properties/${pending._id}/approve`).set('Authorization', `Bearer ${tokenA}`),
      request(app).post(`/api/moderation/properties/${pending._id}/approve`).set('Authorization', `Bearer ${tokenB}`),
    ]);

    // Exactly one wins (200) and one loses (409). Order is non-deterministic.
    const statuses = [resA.status, resB.status].sort();
    expect(statuses).toEqual([200, 409]);

    const loser = resA.status === 409 ? resA : resB;
    expect(loser.body.code).toBe('ALREADY_MODERATED');

    const finalDoc = await Property.findById(pending._id);
    expect(finalDoc.status).toBe('live');
  });

  test('approve then reject: second call returns 409 (idempotency at the data layer)', async () => {
    const token = await buildToken({ sub: 'mod-a-uid', role: 'moderator', kind: 'valid' });

    const r1 = await request(app)
      .post(`/api/moderation/properties/${pending._id}/approve`)
      .set('Authorization', `Bearer ${token}`);
    expect(r1.status).toBe(200);

    const r2 = await request(app)
      .post(`/api/moderation/properties/${pending._id}/reject`)
      .set('Authorization', `Bearer ${token}`)
      .send({ reasonCode: 'incomplete-info' });
    expect(r2.status).toBe(409);
    expect(r2.body.code).toBe('ALREADY_MODERATED');
  });

  test('audit log row written on successful approve with actorUid from token sub', async () => {
    const token = await buildToken({ sub: 'mod-a-uid', role: 'moderator', kind: 'valid' });

    const res = await request(app)
      .post(`/api/moderation/properties/${pending._id}/approve`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);

    const logs = await ModerationLog.find({ targetId: pending._id });
    expect(logs).toHaveLength(1);
    expect(logs[0].actorUid).toBe('mod-a-uid');
    expect(logs[0].action).toBe('approve');
    expect(logs[0].before).toEqual({ status: 'pending' });
    expect(logs[0].after.status).toBe('live');
  });

  test('actorUid CANNOT be spoofed via request body', async () => {
    const token = await buildToken({ sub: 'mod-a-uid', role: 'moderator', kind: 'valid' });

    const res = await request(app)
      .post(`/api/moderation/properties/${pending._id}/approve`)
      .set('Authorization', `Bearer ${token}`)
      .send({ actorUid: 'attacker-uid', firebaseUid: 'attacker-uid' });
    expect(res.status).toBe(200);

    const logs = await ModerationLog.find({ targetId: pending._id });
    expect(logs[0].actorUid).toBe('mod-a-uid');  // From token, NOT body
    expect(logs[0].actorUid).not.toBe('attacker-uid');
  });
});
```

### Client: New PropertyService methods

```typescript
// Source: pattern from /Users/beckmaldinVL/development/mobileApps/JayTap/src/services/LandlordApplicationService.ts
// Add to: src/services/PropertyService.ts (or new ModerationService.ts — planner picks; recommend extending PropertyService since the endpoints all act on Property)

import { canFromUser, PermissionDeniedError } from '../hooks/useRole';

// (Inside PropertyService object literal:)

  /** Moderator: list pending listings FIFO. Returns {items, totalCount}. */
  getModerationQueue: async (): Promise<{ items: Property[]; totalCount: number }> => {
    try {
      const userData = await AuthService.getUserData();
      if (!canFromUser(userData, 'approveListings')) {
        throw new PermissionDeniedError();
      }
      const response = await apiClient.get('/moderation/queue');
      return {
        items: response.data.items.map((p: any) => ({ ...p, id: p._id })),
        totalCount: response.data.totalCount,
      };
    } catch (error: any) {
      console.error('Error fetching moderation queue:', error?.message);
      throw error;
    }
  },

  /** Moderator: approve a pending listing. 409 if already moderated. */
  approveListing: async (propertyId: string): Promise<Property> => {
    try {
      const userData = await AuthService.getUserData();
      if (!canFromUser(userData, 'approveListings')) {
        throw new PermissionDeniedError();
      }
      const response = await apiClient.post(`/moderation/properties/${propertyId}/approve`);
      return { ...response.data, id: response.data._id };
    } catch (error: any) {
      // 409 ALREADY_MODERATED bubbles up; UI consumer surfaces the toast (D-08).
      console.error('Error approving listing:', error?.message);
      throw error;
    }
  },

  /** Moderator: reject a pending listing with structured reasonCode + optional note. */
  rejectListing: async (
    propertyId: string,
    reasonCode: 'incomplete-info' | 'prohibited-content' | 'out-of-service-area' | 'other',
    reasonNote?: string,
  ): Promise<Property> => {
    try {
      const userData = await AuthService.getUserData();
      if (!canFromUser(userData, 'approveListings')) {
        throw new PermissionDeniedError();
      }
      const body: any = { reasonCode };
      if (reasonNote) body.reasonNote = reasonNote;
      const response = await apiClient.post(`/moderation/properties/${propertyId}/reject`, body);
      return { ...response.data, id: response.data._id };
    } catch (error: any) {
      console.error('Error rejecting listing:', error?.message);
      throw error;
    }
  },

  /** Moderator: edit listing on behalf of owner. Multipart for image uploads. */
  editAsModerator: async (
    propertyId: string,
    propertyData: any,
    images: any[] = [],
    reason?: string,
  ): Promise<Property> => {
    try {
      const userData = await AuthService.getUserData();
      if (!canFromUser(userData, 'editAnyListing')) {
        throw new PermissionDeniedError();
      }
      const formData = new FormData();
      // (Same field plumbing as updateProperty — title, description, address, etc.
      //  Strip ownerUid and status from the body — backend strips defensively too.)
      // ... (mirror updateProperty's formData.append() block) ...
      if (reason) formData.append('reason', reason);
      images.forEach((image, index) => {
        formData.append('images', { uri: image.uri, type: image.type || 'image/jpeg', name: image.name || `image-${index}.jpg` } as any);
      });
      const response = await apiClient.put(`/moderation/listings/${propertyId}`, formData);
      return { ...response.data, id: response.data._id };
    } catch (error: any) {
      console.error('Error editing as moderator:', error?.message);
      throw error;
    }
  },
```

### Client: useRole.ts Action union extension

```typescript
// Source: /Users/beckmaldinVL/development/mobileApps/JayTap/src/hooks/useRole.ts:14-22
// Add ONE new member to the Action union, and ONE case to canFromUser.

export type Action =
  | 'editVerifications'
  | 'editMatterportUrl'
  | 'editPanoramicUrl'
  | 'manageListings'
  | 'editAnyListing'
  | 'approveListings'
  | 'promoteToModerator'
  | 'reviewLandlordApplications'
  | 'viewModerationQueue';        // <-- ADD (Phase 3, MOD-10)

// In canFromUser switch:
    case 'editAnyListing':
    case 'approveListings':
    case 'viewModerationQueue':    // <-- ADD: same gate as approveListings (admin or moderator)
      return role === 'admin' || role === 'moderator';
```

### Client: Profile entry-point row

```tsx
// Source: pattern from /Users/beckmaldinVL/development/mobileApps/JayTap/src/screens/ProfileScreen.tsx:210-219
// Add to ProfileScreen.tsx menuCard, beneath the existing landlord-applications row.

const canViewModerationQueue = can('viewModerationQueue');
const [pendingModerationCount, setPendingModerationCount] = useState<number>(0);

useEffect(() => {
  if (!canViewModerationQueue) return;
  let cancelled = false;
  (async () => {
    try {
      const { totalCount } = await PropertyService.getModerationQueue();
      if (!cancelled) setPendingModerationCount(totalCount);
    } catch { /* non-fatal — badge stays at 0 */ }
  })();
  return () => { cancelled = true; };
}, [canViewModerationQueue, /* AppState 'active' trigger */]);

// JSX:
{canViewModerationQueue && onReviewModerationQueue && (
  <>
    <View style={[styles.menuDivider, { backgroundColor: themeStyles.border }]} />
    <TouchableOpacity style={styles.menuRow} onPress={onReviewModerationQueue} activeOpacity={0.7}>
      <Inbox size={22} color={themeStyles.accent} strokeWidth={1.5} />
      <Text style={[styles.menuText, { color: themeStyles.text, flex: 1 }]}>
        {t('moderation.queue.entryPoint')}
      </Text>
      {pendingModerationCount > 0 && (
        <View style={{ backgroundColor: themeStyles.danger, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 }}>
          <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '600' }}>{pendingModerationCount}</Text>
        </View>
      )}
      <ChevronRight size={20} color={themeStyles.textSecondary} />
    </TouchableOpacity>
  </>
)}
```

### Locale keys to add (estimated 18-22)

```typescript
// en.ts (add to the moderation section — nearest existing namespace is `landlordApp.*` for symmetry)
'moderation.queue.entryPoint': 'Moderation Queue',
'moderation.queue.title': 'Moderation Queue',
'moderation.queue.empty': 'No pending listings.',
'moderation.action.approve': 'Approve',
'moderation.action.reject': 'Reject',
'moderation.action.editOnBehalf': 'Edit on behalf',
'moderation.approve.confirmTitle': 'Approve this listing?',
'moderation.approve.confirmMessage': 'This listing will become live and visible to all users.',
'moderation.reject.modalTitle': 'Reject this listing',
'moderation.reject.notePlaceholder': 'Add a note (optional)',
'moderation.reject.submit': 'Submit',
'moderation.reject.reason.incomplete-info': 'Incomplete information',
'moderation.reject.reason.prohibited-content': 'Prohibited content',
'moderation.reject.reason.out-of-service-area': 'Out of service area',
'moderation.reject.reason.other': 'Other',
'moderation.race.toast': 'This listing was already reviewed by another moderator.',
'moderation.editOnBehalf.banner': 'Editing on behalf of {ownerEmail}',
'moderation.editOnBehalf.success': 'Listing updated and approved.',
'moderation.profile.role.moderator': 'Moderator',  // (may already exist via 'profile.role.moderator')

// ru.ts (parity-mirror — copy + translate verbatim above)
'moderation.queue.entryPoint': 'Очередь модерации',
'moderation.queue.title': 'Очередь модерации',
'moderation.queue.empty': 'Нет объявлений на модерации.',
'moderation.action.approve': 'Одобрить',
'moderation.action.reject': 'Отклонить',
'moderation.action.editOnBehalf': 'Редактировать от имени',
'moderation.approve.confirmTitle': 'Одобрить это объявление?',
'moderation.approve.confirmMessage': 'Это объявление станет активным и будет видно всем пользователям.',
'moderation.reject.modalTitle': 'Отклонить объявление',
'moderation.reject.notePlaceholder': 'Добавить примечание (необязательно)',
'moderation.reject.submit': 'Отправить',
'moderation.reject.reason.incomplete-info': 'Неполная информация',
'moderation.reject.reason.prohibited-content': 'Запрещённое содержимое',
'moderation.reject.reason.out-of-service-area': 'За пределами зоны обслуживания',
'moderation.reject.reason.other': 'Другое',
'moderation.race.toast': 'Это объявление уже рассмотрено другим модератором.',
'moderation.editOnBehalf.banner': 'Редактирование от имени {ownerEmail}',
'moderation.editOnBehalf.success': 'Объявление обновлено и одобрено.',
```

## Runtime State Inventory

> Phase 3 is a feature-add phase, not a rename/refactor. This section is included
> defensively to confirm no runtime state is at risk.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None — Phase 3 ADDS a new collection (`moderation_log`) but does not rename any existing collection or field. The Property `rejectionReasonCode`/`rejectionReasonNote` fields were ADDED in Phase 2 (additive) and Phase 3 only POPULATES them. | None |
| Live service config | None — Phase 3 adds NO new env vars. `serviceAreas` is a static const file in source (D-11). Backend deployed to Railway via Railway-set env vars (Phase 1 HF-02). | None |
| OS-registered state | None — RN client; no Windows Task Scheduler / launchd / systemd surface. Mobile app is signed with existing iOS+Android certificates. Phase 3 does not touch the build identity. | None |
| Secrets/env vars | None — JWKS singleton already configured (`FIREBASE_PROJECT_ID` set in Phase 1). No new secret keys. AWS S3 IAM user `jaytap-prod-s3` (memory `aws-iam-jaytap-prod-s3.md`) reused for any image uploads in edit-on-behalf. | None |
| Build artifacts | None — no package rename, no compiled binaries, no Docker image tag changes. Mongoose model registration is via `mongoose.model('ModerationLog', ...)` — first-time registration, not rename. | None |

**Confirmed:** Phase 3 has no runtime-state risks. All data is additive; no migration needed.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js (backend) | All backend work; jose ESM-only | ✓ | 22.12+ required (memory `backend-node-version.md` — `nvm use 24`) | None — must be 22.12+ |
| Node.js (client) | RN client | ✓ | 20.19.1 default OK | None |
| Mongo Atlas (replica set) | `findOneAndUpdate` atomicity; transactions if planner ever switches from D-10's follow-up-insert pattern | ✓ | Atlas (per `mongodb+srv://` in `.env.example`) | None — Atlas always has replica sets; transactions ARE supported but NOT used per D-10 recommendation |
| `jose@^6.2.3` | Backend JWKS verification | ✓ | already installed | None |
| `mongoose@^9.1.6` | Backend ODM | ✓ | already installed | None |
| `multer@^1.4.5-lts.1` + `multer-s3@^3.0.1` | Backend image uploads (edit-on-behalf reuses propertyRoutes pattern) | ✓ | already installed | None |
| `@aws-sdk/client-s3@^3.806.0` | S3 storage for images | ✓ | already installed | None |
| `axios@^1.13.5` (client) | Backend HTTP via apiClient | ✓ | already installed | None |
| `lucide-react-native@^0.564.0` (client) | Icons (Inbox, Check, X) | ✓ | already installed | None |
| `jest@^29.7.0` + `mongodb-memory-server@^9.5.0` + `supertest@^7.1.4` | Backend test suite (D-14 race-condition test) | ✓ | already installed | None |
| `scripts/check-i18n-parity.sh` | EN+RU parity gate | ✓ | already in client repo | None |

**Missing dependencies with no fallback:** None.

**Missing dependencies with fallback:** None.

**No environment risks identified.** Phase 3 inherits a fully-operational stack from Phases 1, 2, and 4.5.

## Validation Architecture

This Phase 3 surface contains the highest-risk logic in M2 (race-condition state transitions per MOD-15). Validation strategy is paired backend supertest + client manual physical-device QA + code review, with the supertest race-condition test mandatory per auto-memory `gsd-verifier-misses-regressions.md`.

### Test Framework

| Property | Value |
|----------|-------|
| Backend framework | jest@^29.7.0 + supertest@^7.1.4 + mongodb-memory-server@^9.5.0 [VERIFIED: backend `package.json:35-37`] |
| Backend config file | `JayTap-services/jest.config.cjs` |
| Backend quick run | `cd JayTap-services && nvm use 24 && npm run test -- --testPathPattern=moderationRoutes` |
| Backend full suite | `cd JayTap-services && nvm use 24 && npm test` (currently 67/67 green per Phase 2 close note) |
| Client framework | jest@^29.6.3 (config in client `package.json:test` script — minimal usage today; CONVENTIONS notes "Effectively zero tests" for the client) |
| Client quick run | `cd JayTap && npm test -- --testPathPattern=useRole` (Phase 1 added useRole.test.ts as the only client unit test surface) |
| Manual QA bar | iPhone 15 Pro Max + Moto G XT2513V; physical-device walk per Phase 6 REL-03 |
| i18n parity gate | `bash scripts/check-i18n-parity.sh` — exits non-zero if en.ts and ru.ts key sets diverge |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| MOD-10 | `GET /api/moderation/queue` returns FIFO pending listings; only mods/admins can call | supertest | `npm test -- --testPathPattern=moderationRoutes -t "queue"` | ❌ Wave 0 |
| MOD-10 | Profile entry-point hidden for non-mods; visible for mods/admins | manual physical-device | (sign in as user, then moderator, then admin; verify entry-point visibility) | manual |
| MOD-10 | ModerationQueueScreen overlay mounts via OVERLAY_FLAGS; tab-tap collapses overlay | manual physical-device | (open queue, tap home tab, verify overlay collapses) | manual |
| MOD-11 | Approve/Reject/Edit-on-behalf inline action row OR action footer on PropertyDetailsScreen | manual physical-device | (sign in as moderator; navigate to queue, then tap row → details → see footer with 3 buttons) | manual |
| MOD-11 | Approve fires Alert.alert confirm + POST /:id/approve | manual physical-device + supertest | `npm test -- --testPathPattern=moderationRoutes -t "approve"` + manual confirm dialog | ❌ Wave 0 |
| MOD-11 | Reject opens RejectListingModal | manual physical-device | (tap Reject; verify modal opens with chip row) | manual |
| MOD-11 | Edit-on-behalf opens CreateListingScreen with moderatorContext prop | manual physical-device | (tap Edit-on-behalf; verify form opens with mod-context banner; verify save dispatches editAsModerator endpoint) | manual |
| MOD-12 | reasonCode validator: only 4 enum values accepted | supertest | `npm test -- -t "reasonCode validator"` (POST `/reject` with `reasonCode: 'invalid'` → 400) | ❌ Wave 0 |
| MOD-12 | serviceAreas config file exists with `[{name: 'Bishkek', country: 'KG'}]` | code review | grep `serviceAreas:` in `src/config/serviceAreas.js` | n/a |
| MOD-13 | rejectionReasonCode + rejectionReasonNote written on reject | supertest | `npm test -- -t "reject writes reasonCode and reasonNote"` | ❌ Wave 0 |
| MOD-13 | Owner-locale translation: RU app shows RU label for `incomplete-info`; EN app shows EN | manual physical-device | (set RU app, reject listing as `incomplete-info` from EN app, log in as owner with RU app, see «Неполная информация»; reverse) | manual |
| MOD-13 | Moderator identity NEVER in payload | supertest + code review | `npm test -- -t "owner payload omits moderator identity"` (assert no `rejectedByUid` in `GET /api/properties/:id` response for owner role) + grep `rejectedByUid` in client RejectionBanner — should be 0 hits | ❌ Wave 0 + n/a |
| MOD-14 | editAsModerator does NOT mutate ownerUid even if request body includes it | supertest | `npm test -- -t "edit-on-behalf preserves ownerUid"` (PUT with body.ownerUid='attacker' → ownerUid unchanged) | ❌ Wave 0 |
| MOD-14 | edit-on-behalf writes audit log with action 'edit-on-behalf' + before/after diff | supertest | `npm test -- -t "edit-on-behalf writes audit log"` | ❌ Wave 0 |
| MOD-14 | Status flips to 'live' on save (D-12 sub-decision) | supertest | `npm test -- -t "edit-on-behalf flips status to live"` | ❌ Wave 0 |
| MOD-15 | **Race condition: two concurrent approves → one 200, one 409** | supertest (PROMISE.ALL pattern — see Code Examples) | `npm test -- -t "race-condition"` | ❌ Wave 0 — **MANDATORY per memory `gsd-verifier-misses-regressions.md`** |
| MOD-15 | Approve-then-reject (idempotency at data layer) → 409 | supertest | `npm test -- -t "approve then reject returns 409"` | ❌ Wave 0 |
| MOD-15 | Client surfaces "This listing was already reviewed..." toast on 409 | manual physical-device | (Two phones: both moderators tap Approve at the same time; loser sees toast in app's locale) | manual |
| MOD-15 | Queue refetches automatically on 409; row disappears | manual physical-device | (same two-device test; verify loser's queue updates) | manual |
| MOD-16 | moderation_log Mongo collection has correct shape | supertest | `npm test -- -t "audit log row shape"` (assert keys: actorUid, action, targetType, targetId, before, after, reasonCode, reasonNote, at) | ❌ Wave 0 |
| MOD-16 | actorUid CANNOT be spoofed via request body | supertest (anti-tampering pattern from CR-01) | `npm test -- -t "actorUid from token not body"` | ❌ Wave 0 |
| MOD-17 | All 4 endpoints require role >= moderator | supertest | `npm test -- -t "role gating"` (4 tests: each endpoint with user-role token → 403 insufficient-role) | ❌ Wave 0 |
| MOD-17 | All 4 endpoints write to moderationLog | supertest | (covered by MOD-16 audit-log assertions per endpoint) | ❌ Wave 0 |
| MOD-18 | EN+RU parity for all new keys | i18n parity gate (CI) | `bash scripts/check-i18n-parity.sh` exits 0 | ✓ exists |
| MOD-18 | All locale keys render (no fallback-to-key-string in any UI surface) | manual physical-device | (walk every Phase 3 surface in EN, then in RU; visually inspect for raw key strings like `moderation.queue.title`) | manual |

### Sampling Rate

- **Per task commit (backend):** `cd JayTap-services && nvm use 24 && npm run test -- --testPathPattern=moderationRoutes` — fast race-condition smoke (~5s).
- **Per task commit (client):** `bash scripts/check-i18n-parity.sh` if locale keys touched; else nothing automated (matches project posture).
- **Per wave merge (backend):** `cd JayTap-services && nvm use 24 && npm test` (full backend suite — should be 67 + Phase 3 additions = ~80+ tests green).
- **Phase gate:** Full backend suite green + i18n parity exit 0 + manual QA matrix walked + code review pass before `/gsd-verify-work`.

### Wave 0 Gaps

- [ ] `JayTap-services/src/__tests__/moderationRoutes.test.js` — covers MOD-10, MOD-11 (server-side), MOD-12, MOD-13 (server-side), MOD-14, MOD-15, MOD-16, MOD-17. **MANDATORY race-condition test.**
- [ ] `JayTap-services/src/__tests__/ModerationLog.test.js` — optional — schema-level tests for required fields + indexes (mirror `LandlordApplicationAuditLog.test.js` if it exists; otherwise omit and cover via supertest).
- [ ] No client-side test gap — Phase 3's client surface is integration-tested via manual physical-device QA per the project's existing posture (CONVENTIONS.md "manual physical-device QA bar").

*(If no gaps to address: omit. The race-condition test in moderationRoutes.test.js is non-negotiable per the gsd-verifier-misses-regressions auto-memory directive.)*

## Specific Planner Confirmations

These are the validated answers to the gray-area questions raised in the orchestrator's brief.

### 1. D-04 AppState 'active' coordination

**Confirmed pattern from `AuthContext.tsx:39-43, 231-252`:** Phase 2 D-17 already shipped a working AppState 'active' subscription with module-scope `lastRefreshAt` 60s cooldown. The hook is for `refreshRole()` which is a global concern.

**Recommendation:** Add a SEPARATE `AppState.addEventListener('change', ...)` subscription INSIDE `ModerationQueueScreen` (and a separate one in ProfileScreen for the badge). React Native allows multiple listeners. Each consumer has its own cooldown ref because they perform DIFFERENT work (refreshRole vs queue refetch vs count refetch). They are NOT competing for the same backend call. Do NOT extend AuthContext to fan-out queue concerns — that couples the auth context to feature concerns.

**Files:**
- Existing: `src/context/AuthContext.tsx:239-252` (the pattern to mirror)
- New: `src/screens/ModerationQueueScreen.tsx` (new useEffect with its own AppState subscription)
- Modified (small): `src/screens/ProfileScreen.tsx` (add a useEffect that refetches `pendingModerationCount` on AppState 'active')

### 2. D-09 reasonCode → owner-locale translation

**Recommendation:** Client-side i18n keys at `moderation.reject.reason.{code}` namespace. Mirrors the existing `landlordApp.rejectReason.{code}` precedent verbatim (`src/locales/en.ts:570-573` and `ru.ts:573-576`).

**Rationale:** (a) Server-side translation needs `req.user.locale` plumbing for ZERO product benefit; (b) reasonNote is verbatim per MOD-13; (c) only ~8 keys to add (4 codes × 2 locales); (d) owner's locale is always the app's active language (no `Accept-Language` ambiguity); (e) matches the established pattern in this codebase 1:1.

**File:** `src/components/RejectionBanner.tsx:37` change `const codeLabel = reasonCode || 'incomplete-info';` to use `t('moderation.reject.reason.${reasonCode || 'incomplete-info'}' as any)`.

### 3. D-10 moderationLog atomicity

**Confirmed:** Mongo Atlas (`mongodb+srv://` per `.env.example`) is replica-set capable; transactions ARE supported by Atlas tier + Mongoose 9. **However, no current backend code uses `startSession()` / `withTransaction()`** (verified via `grep -n "session\|withTransaction\|startSession\|replicaSet" JayTap-services/src/routes/*.js` returns 0 hits). Phase 4.5 also chose follow-up insert (`landlordApplicationRoutes.js:135-142, 261-268`).

**Recommendation:** Follow-up `await ModerationLog.create(...)` after the status flip succeeds, with structured logging on failure (per CONTEXT.md seed). Orphan risk is bounded because:
- Audit log is forward-fit for M3+ UI, NOT load-bearing for live mod actions
- Structured `evt: 'moderation_audit_orphan'` log captures every orphan for ops visibility
- Even with a rare orphan, the listing's `approvedAt`/`approvedByUid` (or `rejectedAt`/`rejectedByUid`) fields ARE the primary audit trail at the Property document level

**If transactions are wanted later:** Mongoose 9 supports them via `await mongoose.startSession()` → `session.withTransaction(async () => { await Property.findOneAndUpdate(...).session(session); await ModerationLog.create([{...}], {session}); })`. M3+ tightening if orphan rates exceed an acceptable threshold.

### 4. D-10 before/after granularity (changed-fields-only)

**For approve / reject:** Naturally narrow — only `status` changes plus the audit-field timestamps.
- approve: `before: {status: 'pending'}`, `after: {status: 'live', approvedAt: now, approvedByUid: req.firebaseUid}`
- reject: `before: {status: 'pending'}`, `after: {status: 'rejected', rejectionReasonCode, rejectedByUid, rejectedAt: now}`

**For edit-on-behalf:** Compute the diff cheaply by:
1. `const original = await Property.findById(req.params.id).lean();` (one query before save)
2. Apply updates → save
3. Diff: iterate the keys of `req.body` (which IS the `after` candidate); for each key, if `original[k] !== req.body[k]`, push to a `before`/`after` object pair.

**Skeleton:**
```javascript
const original = await Property.findById(req.params.id).lean();
if (!original) return res.status(404).json({ message: 'Property not found' });
// Apply updates (mirror PUT /api/properties/:id pipeline)...
const updated = await Property.findByIdAndUpdate(req.params.id, updateData, { new: true });

// Compute changed-fields-only diff for the audit log
const before = {}, after = {};
for (const k of Object.keys(updateData)) {
  if (JSON.stringify(original[k]) !== JSON.stringify(updateData[k])) {
    before[k] = original[k];
    after[k] = updateData[k];
  }
}
// Always include status flip (D-12 sub-decision)
before.status = original.status;
after.status = 'live';

await ModerationLog.create({
  actorUid: req.firebaseUid,
  action: 'edit-on-behalf',
  targetType: 'property',
  targetId: updated._id,
  before, after,
  reasonNote: req.body.reason || null,
  at: new Date(),
});
```

### 5. D-11 serviceAreas storage

**Confirmed:** `JayTap-services/src/config/` directory exists (`db.js`, `firebase.js` already there). Static const file at `JayTap-services/src/config/serviceAreas.js` with shape `{ serviceAreas: [{name, country}] }` is forward-fit for KG/KZ/UZ expansion.

**Planner recommendation:** Use the structured shape `[{name, country}]`, NOT `[String]`. This avoids a future schema rewrite when KZ/UZ cities land. M2 default is `[{name: 'Bishkek', country: 'KG'}]`; M3+ admin UI mutates the array (still file-edit + redeploy in M3; M4+ may move to Mongo collection if admin-edit-without-deploy becomes a need).

### 6. D-13 route-file location

**Verified mounting convention from `index.js:114-121`:**
```javascript
app.use('/api/auth', require('./src/routes/authRoutes'));
app.use('/api/properties', require('./src/routes/propertyRoutes'));
app.use('/api/landlord-applications', require('./src/routes/landlordApplicationRoutes'));
```

`landlordApplicationRoutes.js` mounts at `/api/landlord-applications` and exposes BOTH user paths (`/`, `/mine`, `/:id`) AND admin paths (`/admin/queue`, `/admin/:id/decide`) under that ONE prefix — a path-mismatch-but-domain-match pattern.

**Recommendation:** Mirror the same pattern. Mount `moderationRoutes.js` at `/api/moderation` in `index.js` (one new line). Inside the router, expose:
- `GET /queue` → resolves to `/api/moderation/queue`
- `POST /properties/:id/approve` → resolves to `/api/moderation/properties/:id/approve`
- `POST /properties/:id/reject` → resolves to `/api/moderation/properties/:id/reject`
- `PUT /listings/:id` → resolves to `/api/moderation/listings/:id`

This gives EVERY moderation endpoint a `/api/moderation/*` URL prefix (cleaner from a network-trace perspective; easier to put behind a future rate-limit or audit-log middleware that scopes by prefix). The REQUIREMENTS.md MOD-17 wording (`POST /api/properties/:id/approve`) is non-load-bearing — REQUIREMENTS lists endpoints by intent, not by URL path. Recommend the planner update REQUIREMENTS to read `POST /api/moderation/properties/:id/approve` for consistency, or accept that the implementation mounts at a slightly different path than REQUIREMENTS literal.

**Alternative (if path-consistency-with-REQUIREMENTS is preferred):** Add the approve + reject routes to `propertyRoutes.js` at `/:id/approve` and `/:id/reject` (matching REQUIREMENTS verbatim) BUT keep `GET /queue` and `PUT /listings/:id` in `moderationRoutes.js`. This split is messier and the planner should prefer the "all in moderationRoutes.js" approach.

### 7. D-12 status-after-save for edit-on-behalf

**Recommendation:** Status flips to `'live'` per CONTEXT.md seed. **Surface this for explicit user confirmation before locking** — it's a product decision, not just an implementation detail. The reasoning is:
- A moderator who chose Edit-on-behalf intends to fix and publish in one step (otherwise they'd just approve)
- Avoids the foot-gun where mod fixes a listing and it sits in queue for another mod to approve
- The `moderationLog` row with action `'edit-on-behalf'` and full before/after diff IS the audit trail — separate Approve action would be redundant

**Implementation:** Inside the PUT `/api/moderation/listings/:id` handler, after the `findByIdAndUpdate` apply, set `status: 'live'` + `approvedAt: now` + `approvedByUid: req.firebaseUid` in the SAME `$set`. Include the status flip in the audit-log diff.

**`findOneAndUpdate` projection example:**
```javascript
const updated = await Property.findOneAndUpdate(
  { _id: req.params.id },  // No status precondition here — edit-on-behalf is allowed on pending OR rejected
  { $set: {
      ...updateData,                      // body fields (sanitized: ownerUid stripped)
      status: 'live',                     // D-12: flip to live
      approvedAt: now,
      approvedByUid: req.firebaseUid,
      // Clear rejection metadata if listing was rejected
      rejectionReasonCode: null,
      rejectionReasonNote: null,
      rejectedAt: null,
      rejectedByUid: null,
    } },
  { new: true }
);
```

### 8. D-14 test coverage strategy

**Recommendation:** At MINIMUM, ship the 4 supertest patterns shown in "Code Examples → Race-condition supertest pattern":
1. **Race-condition test** (Promise.all parallel approves → one 200, one 409) — MANDATORY per `gsd-verifier-misses-regressions.md`
2. **Approve-then-reject test** (idempotency at data layer)
3. **Audit-log shape test** (assert collection row contents per MOD-16)
4. **actorUid anti-spoofing test** (mirrors CR-01 anti-tampering pattern from `propertyRoutes.test.js:55-95`)

**Plus role-gating coverage** (4 tests — one per endpoint): user-role token → 403 `insufficient-role`. Mirrors the Phase 1 verifyFirebaseToken golden-token matrix.

**Reference:** Existing test patterns at `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/__tests__/propertyRoutes.test.js` (Phase 2 added 18 supertest cases for D-05/D-06/D-12/D-15/D-22 — Phase 3 mirrors that test-file structure). Existing fixtures `__tests__/fixtures/jwks-tokens.js` (`buildToken({sub, role, kind})`) — reuse as-is.

### 9. App.tsx LOC pressure (D-15 carry-forward)

**Recommendation: Option (a) — Extract `<PropertyDetailsHost>` from App.tsx:837-913.**

The 77-LOC `selectedProperty && (<View ...><PropertyDetailsScreen .../></View>)` block at App.tsx:837-913 is the heaviest extraction candidate. Extraction yields a new file `~/src/components/PropertyDetailsHost.tsx` (~85 LOC including imports + interface) that takes the wired callbacks as props. The App.tsx call site shrinks to ~10 LOC. Combined with Phase 3's ~+45 LOC additions, App.tsx nets to ~1100 LOC for the first time in M2 — restoring the soft-cap invariant.

**Extraction sketch:**
```tsx
// New file: src/components/PropertyDetailsHost.tsx
interface PropertyDetailsHostProps {
  selectedProperty: Property;
  user: AuthUser | null;
  homeViewMode: 'list' | 'map';
  favoriteStatuses: Record<string, boolean>;
  favoriteLoading: Record<string, boolean>;
  onClose: () => void;
  onOpenTours: (p: Property) => void;
  onOpenPhotos: (url: string) => void;
  onMessage: (p: Property) => void;
  onScheduleViewing: (p: Property) => void;
  onLandlordPress: (uid: string, name: string) => void;
  onAdminVerifyDocuments: (p: Property) => void;
  onEditListing: (p: Property) => void;
  onFavorite: (p: Property) => Promise<void>;
  onAuthRequired: (message: string) => void;
}
// (Body: lines 837-912 of App.tsx, with `selectedProperty` from props instead of state)

// App.tsx call site collapses from 77 LOC to ~10:
{selectedProperty && (
  <PropertyDetailsHost
    selectedProperty={selectedProperty}
    user={user}
    homeViewMode={homeViewMode}
    favoriteStatuses={favoriteStatuses}
    favoriteLoading={favoriteLoading}
    onClose={() => setSelectedProperty(null)}
    onOpenTours={handleOpenTours}
    onOpenPhotos={(url) => setActivePhotosUrl(url)}
    onMessage={(p) => { /* existing inline ... */ }}
    onScheduleViewing={(p) => { /* existing inline ... */ }}
    onLandlordPress={(uid, name) => { setSelectedProperty(null); setOwnerListingsUid(uid); setOwnerListingsName(name); }}
    onAdminVerifyDocuments={(p) => { skipRenterListingsReopenRef.current = true; setPropertyToEdit(p); setIsAdminVerificationMode(true); setIsCreateListingOpen(true); setSelectedProperty(null); }}
    onEditListing={(p) => { setIsAdminVerificationMode(false); setPropertyToEdit(p); setSelectedProperty(null); setIsCreateListingOpen(true); }}
    onFavorite={handleFavorite}
    onAuthRequired={(msg) => { setAuthPromptMessage(msg); setShowAuthPrompt(true); }}
  />
)}
```

**Net LOC:** App.tsx 1132 − 67 (extraction) + 45 (Phase 3 adds) = **1110 LOC** (slightly over soft cap; if planner extracts MORE conservatively or the Phase 3 mounts come in lighter, the file lands ≤ 1100). Either way the trajectory is restored.

### 10. Validation Architecture (Nyquist) summary

The full table is in `## Validation Architecture` above. Highlights:

- **Mandatory backend supertest coverage:** Race-condition test (MOD-15) + actorUid anti-spoofing test (MOD-16) + role-gating per endpoint (MOD-17). At minimum 8 supertest cases.
- **Manual physical-device QA:** Two-phone race-condition test (both devices tap Approve at the same time; loser sees toast in app's locale). Owner-locale verification (RU app shows RU label even when reject was filed from EN app). Profile entry-point gating (signed in as user/moderator/admin).
- **Code review checklist:** (a) `actorUid: req.firebaseUid` everywhere; (b) atomic `findOneAndUpdate({_id, status: 'pending'}, ...)` everywhere; (c) `ownerUid` stripped in PUT `/moderation/listings/:id`; (d) rejectedByUid NOT in owner payload; (e) `<Gated action="viewModerationQueue">` AND backend `requireMinRole('moderator')` (belt-and-suspenders).
- **i18n parity gate:** `bash scripts/check-i18n-parity.sh` exits 0.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `firebase-admin@^13.6.1` for token verification | `jose@^6` JWKS verification | Phase 1 (REL-05 will remove the dead `firebase-admin` dep from package.json) | Phase 3 inherits — NO new auth library needed |
| Per-service `getHeaders()` boilerplate | Shared `apiClient.ts` with Bearer interceptor | Phase 1 Plan 11 | Phase 3's PropertyService extensions inherit Bearer transparently |
| M1 hardcoded admin email allowlist | Mongo `userType` via `useRole()` | Phase 1 Plan 13 (ROLE-07 closed) | Phase 3 reads role via `useRole()` |
| `x-firebase-uid` header trust | `Authorization: Bearer <idToken>` JWKS-verified | Phase 1 (D-04 dual-accept window; legacy cuts in Phase 6) | Phase 3 reads uid from `req.firebaseUid` populated by middleware |
| `status: missing` legacy listings | `status: 'pending'` schema default + Phase 2 D-02 client coalesce | Phase 2 Plan 03 + migration Plan 02 | Phase 3's queue query `{status: 'pending'}` returns the right set |
| Phase 2 `'rejected'` listings have empty `rejectionReasonCode` | Phase 3 POPULATES the field via reject endpoint | Phase 3 (this phase) | Phase 2's `<RejectionBanner>` now has data to render — visual surface unchanged |

**Deprecated/outdated (NEVER use in Phase 3):**
- `axios.post(..., {headers: {Authorization: ...}})`: Use `apiClient.post(...)` — interceptor attaches Bearer.
- Inline `jwtVerify(...)` per-route: Use `verifyFirebaseToken` middleware from `src/middleware/verifyFirebaseToken.js`.
- `req.body.firebaseUid` for actor identity: Use `req.firebaseUid` from middleware.
- Manual `Property.findById(...)` + `if (status === 'pending')` + `findByIdAndUpdate(...)` pattern (race window): Use atomic `findOneAndUpdate({_id, status: 'pending'}, ...)`.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Mongo Atlas tier supports transactions (replica set) | Pattern 2 / D-10 alternatives | Low — D-10 recommendation is follow-up insert, not transactions; this only matters if planner switches to transactions. **[VERIFIED via .env.example showing `mongodb+srv://` which is always Atlas + always replica-set]** |
| A2 | `multer-s3` upload pattern in propertyRoutes.js works for the new `PUT /api/moderation/listings/:id` endpoint | Code Examples (edit-on-behalf) | Low — Phase 4.5's `landlordApplicationRoutes.js:23-43` uses identical `multerS3` pattern; Phase 3 reuses verbatim |
| A3 | Phase 3 NOT blocked on REQUIREMENTS.md MOD-17 wording change for endpoint paths | D-13 | Low — REQUIREMENTS.md lists endpoints by intent; the `/api/moderation/properties/:id/approve` URL is functionally identical and the planner can update REQUIREMENTS.md or accept the variance |
| A4 | App.tsx 1132 LOC count is current (per `wc -l App.tsx` ran 2026-05-01) | Pattern 4 / Question 9 | Low — verified count; would need re-verification only if Phase 3 plan executes after another phase touches App.tsx |
| A5 | The 4-reasonCode enum from REQUIREMENTS MOD-12 (incomplete-info, prohibited-content, out-of-service-area, other) is final | Pattern 6 / Locale keys | Low — REQUIREMENTS.md explicitly lists the 4 codes; CONTEXT.md re-confirms |
| A6 | The 18-22 locale-key estimate is sufficient for Phase 3 | Locale keys to add | Low — could grow to ~25 if planner adds more granular copy (e.g., separate "approve success" toast); CI gate catches drift either way |

**This Assumptions Log is short by design.** The vast majority of Phase 3 patterns are VERIFIED via direct code reads of the actual files in this repo (paths cited inline). Phase 4.5's sibling-pattern reuse means almost every claim is grounded in a working precedent.

## Open Questions

1. **Should `POST /api/moderation/listings/:id/submit` be implemented?**
   - What we know: REQUIREMENTS MOD-17 lists this endpoint. Phase 2 already auto-flips `'rejected' → 'pending'` on owner edit (D-22), and POST `/api/properties` defaults to `'pending'` (MOD-03). There is NO `'draft'` state in M2 — it was dropped in Phase 2 Plan 03.
   - What's unclear: What state does this endpoint transition FROM? `'pending' → 'pending'` is a no-op. The endpoint may be vestigial in REQUIREMENTS.
   - Recommendation: **Skip this endpoint.** The 4-endpoint surface (queue, approve, reject, edit-on-behalf) covers all moderator workflows. The submit endpoint exists in REQUIREMENTS as a hold-over from a draft-state-bearing earlier requirements draft. Planner should confirm with user during plan-phase.

2. **Should the pending-count fetch be a dedicated endpoint or piggybacked on the queue payload?**
   - What we know: D-03 leaves this as planner discretion.
   - Recommendation: **Piggyback `totalCount` on `GET /api/moderation/queue` response.** Saves a 5th endpoint; the queue is small (mod team scale per CONTEXT.md); extra ~50-200 bytes of payload is negligible. If M3+ scales the queue past ~50 pending listings, switch to a dedicated `GET /queue/count` endpoint.

3. **Where exactly does the moderation action footer mount on PropertyDetailsScreen?**
   - What we know: D-02 says "moderation action footer when role >= moderator AND status === 'pending'". D-15 leaves visual mount as planner discretion.
   - Recommendation: A bottom-pinned action bar (3 buttons in a row) similar to PropertyDetailsScreen's existing message/schedule footer. Hidden via `useRole().can('approveListings') && property.status === 'pending'`. Visual treatment: warning palette for the entire bar background to signal "moderator mode" context.

4. **Should the RejectListingModal live as a new component file or be defined inline inside ModerationQueueScreen?**
   - What we know: D-15 leaves visual specifics planner discretion.
   - Recommendation: **New component file `src/components/RejectListingModal.tsx`** — it's reused from BOTH the queue's per-row reject button AND the PropertyDetailsScreen's reject button. Inline definition would force duplication or prop-passing of the modal state across two parent screens.

## Sources

### Primary (HIGH confidence — direct code reads in this repo)

- `/Users/beckmaldinVL/development/mobileApps/JayTap/.planning/phases/03-moderation-queue-actions-edit-on-behalf/03-CONTEXT.md` — D-01..D-15 source of locked decisions
- `/Users/beckmaldinVL/development/mobileApps/JayTap/.planning/REQUIREMENTS.md` lines 55-63 — MOD-10..MOD-18 verbatim
- `/Users/beckmaldinVL/development/mobileApps/JayTap/.planning/ROADMAP.md` lines 85-96 — Phase 3 success criteria
- `/Users/beckmaldinVL/development/mobileApps/JayTap/.planning/research/PITFALLS.md` Pitfall 5 (race condition) + Pitfall 8 (App.tsx LOC) + Pitfall 14 (idempotency) + Pitfall 12 (i18n parity)
- `/Users/beckmaldinVL/development/mobileApps/JayTap/.planning/research/ARCHITECTURE.md` Pattern 2 (OVERLAY_FLAGS source-of-truth) + lines 446-471 (App.tsx wiring sketch)
- `/Users/beckmaldinVL/development/mobileApps/JayTap/.planning/codebase/CONVENTIONS.md` lines 1-120 — naming, style, i18n parity gate, manual QA bar
- `/Users/beckmaldinVL/development/mobileApps/JayTap/App.tsx` (1132 LOC) — OVERLAY_FLAGS at lines 104-110; selectedProperty mount at 837-913 (extraction candidate)
- `/Users/beckmaldinVL/development/mobileApps/JayTap/src/hooks/useRole.ts` (123 LOC) — Action union extension target
- `/Users/beckmaldinVL/development/mobileApps/JayTap/src/context/AuthContext.tsx` (296 LOC) — AppState 'active' hook pattern at lines 39-43, 231-252
- `/Users/beckmaldinVL/development/mobileApps/JayTap/src/screens/ProfileScreen.tsx` (368 LOC) — entry-point pattern at lines 210-219
- `/Users/beckmaldinVL/development/mobileApps/JayTap/src/screens/CreateListingScreen.tsx` (910 LOC) — interface at line 46; `propertyToEdit` rehydrate paths at lines 239-301
- `/Users/beckmaldinVL/development/mobileApps/JayTap/src/screens/LandlordApplicationQueueScreen.tsx` (lines 1-150) — the visual + interaction sibling-pattern source
- `/Users/beckmaldinVL/development/mobileApps/JayTap/src/components/RejectionBanner.tsx` (89 LOC) — Phase 2 banner already mounted; line 37 is the codeLabel translation site
- `/Users/beckmaldinVL/development/mobileApps/JayTap/src/components/StatusPill.tsx` — already renders «На модерации» for pending
- `/Users/beckmaldinVL/development/mobileApps/JayTap/src/services/PropertyService.ts` (287 LOC) — extension target (5 new methods)
- `/Users/beckmaldinVL/development/mobileApps/JayTap/src/services/apiClient.ts` — Bearer interceptor + 401/403 single-flight
- `/Users/beckmaldinVL/development/mobileApps/JayTap/src/services/LandlordApplicationService.ts` — service extension pattern
- `/Users/beckmaldinVL/development/mobileApps/JayTap/src/locales/en.ts` + `ru.ts` — existing key namespaces; `landlordApp.rejectReason.{code}` precedent at en.ts:570-573
- `/Users/beckmaldinVL/development/mobileApps/JayTap/src/components/Gated.tsx` — `<Gated action="...">` wrapper pattern
- `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/routes/landlordApplicationRoutes.js` (302 LOC) — the route-file sibling-pattern source
- `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/routes/propertyRoutes.js` (565 LOC) — PUT pipeline at lines 338-526 (template for edit-on-behalf endpoint)
- `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/middleware/verifyFirebaseToken.js` (170 LOC) — `verifyFirebaseToken` + `requireMinRole('moderator')` to apply via `router.use(...)`
- `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/models/Property.js` — Phase 2 audit fields at lines 42-50 (Phase 3 WRITES)
- `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/models/LandlordApplicationAuditLog.js` (28 LOC) — the Mongoose model sibling-pattern source
- `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/__tests__/propertyRoutes.test.js` — supertest patterns + `buildToken({sub, role, kind})` fixture usage
- `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/__tests__/fixtures/jwks-tokens.js` — reusable test fixture
- `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/index.js` — `app.use('/api/...')` mount sites at lines 113-121
- `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/package.json` — backend dependencies + Node 22+ engine
- `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/.env.example` — `MONGO_URI=mongodb+srv://...` confirms Atlas

### Secondary (HIGH confidence — auto-memory cross-reference)

- `~/.claude/projects/-Users-beckmaldinVL-development-mobileApps-JayTap/memory/no-firebase-sdk.md` — REPO RULE
- `~/.claude/projects/-Users-beckmaldinVL-development-mobileApps-JayTap/memory/identity-vs-user-store.md` — Firebase = identity proof; Mongo = role authority
- `~/.claude/projects/-Users-beckmaldinVL-development-mobileApps-JayTap/memory/backend-repo-location.md` — Same maintainer; no team coordination overhead
- `~/.claude/projects/-Users-beckmaldinVL-development-mobileApps-JayTap/memory/backend-node-version.md` — `nvm use 24` for backend npm/node commands
- `~/.claude/projects/-Users-beckmaldinVL-development-mobileApps-JayTap/memory/geographic-scope.md` — KG/KZ/UZ; serviceAreas forward-fit
- `~/.claude/projects/-Users-beckmaldinVL-development-mobileApps-JayTap/memory/gsd-verifier-misses-regressions.md` — Verifier + reviewer paired gate; race-condition test mandatory
- `~/.claude/projects/-Users-beckmaldinVL-development-mobileApps-JayTap/memory/phase45-landlord-application-uid-mismatch-bug.md` — actorUid MUST come from `req.firebaseUid`
- `~/.claude/projects/-Users-beckmaldinVL-development-mobileApps-JayTap/memory/aws-iam-jaytap-prod-s3.md` — S3 bucket already configured
- `~/.claude/projects/-Users-beckmaldinVL-development-mobileApps-JayTap/memory/nav-overlay-hides-bottom-nav.md` — OVERLAY_FLAGS hides BottomNav; Phase 3 mod queue inherits this UX

### Tertiary (Phase context — HIGH confidence)

- `.planning/phases/01-backend-role-foundation-auth-migration-hotfix-bundle/01-CONTEXT.md` — JWKS middleware, 60s AppState cooldown, refreshRole pattern
- `.planning/phases/02-listing-lifecycle-status-field-absorption/02-CONTEXT.md` — D-21 audit-fields schema (Phase 3 writes them); D-22 owner edit-resubmit auto-flip; D-13/D-14/D-15 RejectionBanner already mounted; D-08 Phase 3 owns entire `/api/moderation/*` route surface from blank slate
- `.planning/phases/04.5-landlord-application-workflow/` — visual + audit-collection precedent throughout

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — every dep already installed, all versions verified via package.json reads
- Architecture: HIGH — App.tsx LOC verified (1132); OVERLAY_FLAGS pattern verified at App.tsx:104-110; AppState hook verified at AuthContext.tsx:239-252; `selectedProperty` extraction candidate verified at App.tsx:837-913 (77 LOC)
- Pitfalls: HIGH — PITFALLS.md Pitfalls 5/8/12/14 cited verbatim; Phase 4.5 race-pattern bug observed in `landlordApplicationRoutes.js:238-246` (do NOT copy); auto-memory `gsd-verifier-misses-regressions.md` and `phase45-landlord-application-uid-mismatch-bug.md` are direct prior-incident citations
- Backend route patterns: HIGH — `landlordApplicationRoutes.js` and `propertyRoutes.js` read in full; mount pattern at `index.js:113-121` verified; `verifyFirebaseToken` + `requireMinRole('moderator')` pattern verified
- Test infrastructure: HIGH — fixtures + test patterns verified; jest.config.cjs exists; mongodb-memory-server installed; current backend test count is 67/67 green per Phase 2 close
- i18n parity: HIGH — landlordApp.rejectReason.{code} precedent verified at en.ts:570-573 + ru.ts:573-576; parity gate `scripts/check-i18n-parity.sh` exists
- Mongo Atlas transaction support: MEDIUM — `mongodb+srv://` confirms Atlas (always replica set), but no current backend code uses transactions; D-10 recommendation is follow-up insert (matches Phase 4.5 precedent)

**Research date:** 2026-05-01
**Valid until:** 2026-05-15 (14 days; backend stack is stable; Phase 4.5 just shipped 2026-04-30 so the sibling-pattern source is fresh)

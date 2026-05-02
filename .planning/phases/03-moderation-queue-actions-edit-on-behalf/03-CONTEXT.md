# Phase 3: Moderation Queue + Actions + Edit-on-Behalf - Context

**Gathered:** 2026-05-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Surface the moderator/admin workflow for reviewing pending listings end-to-end: a `ModerationQueueScreen` overlay accessed via a `<Gated action="viewModerationQueue">` Profile entry-point, three moderation actions (Approve / Reject / Edit-on-behalf) with race-condition-safe 409 handling, an append-only `moderationLog` Mongo collection, four new backend endpoints under `/api/moderation/*` (queue list + queue count + approve + reject) plus an edit-on-behalf endpoint, the `serviceAreas` config that backs the `out-of-service-area` reasonCode, and the server-side reasonCode → owner-locale translation that surfaces in Phase 2's already-mounted `<RejectionBanner>`. Reuses M1-decomposed `CreateListingScreen` for edit-on-behalf via a `moderatorContext` prop — no second editor screen.

**Touches both repos:**
- RN client (`/Users/beckmaldinVL/development/mobileApps/JayTap`) — new `ModerationQueueScreen` + `RejectListingModal`, `App.tsx OVERLAY_FLAGS` extension, ProfileScreen entry-point with pending-count badge, `CreateListingScreen` `moderatorContext` prop, `useRole.ts` Action union extension, `<Gated>` consumers, EN+RU locale keys
- Backend (`/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services`) — new `moderationRoutes.js` (or `/api/moderation/*` block under existing routes), new `ModerationLog.js` Mongoose model, four new endpoints, race-safe `findOneAndUpdate({_id, status: 'pending'}, ...)`, owner-locale reasonCode translation, `serviceAreas` config

**Requirements covered:** MOD-10..MOD-18 (9 reqs).

**Explicitly NOT in this phase (boundary anchors for downstream):**
- Archive actions — owner-archive button, mod-archive modal, restore-to-pending — Phase 4 (ARCH-01..ARCH-05)
- Admin role management UI — search users, change `userType`, last-admin-lockout — Phase 5 (ADMIN-01..ADMIN-07)
- M3+ moderation-log audit screen — `moderationLog` is append-only and forward-fits a future audit UI; no read surface in M2
- M3+ admin UI for editing the `serviceAreas` list — Phase 3 ships the config storage; admin-edit lives in M3+
- Email / push / in-app message notifications on rejection or approval — REQUIREMENTS.md Future §; M2 in-app banner (already shipped Phase 2) is sufficient
- Bulk multi-select moderation actions — REQUIREMENTS.md Future §
- Lease-based pessimistic locking — optimistic 409 suffices for the small mod team (REQUIREMENTS.md Future §)
- Self-promotion / "apply to be a moderator" path — REQUIREMENTS.md Future §
- Phase 6 release / cross-cutting QA / hotfix legacy-cutoff — Phase 6 owns

</domain>

<decisions>
## Implementation Decisions

### Queue UX & entry-point

- **D-01 (Row display — reuse `PropertyCard`):** Each row in `ModerationQueueScreen` renders the existing `src/components/PropertyCard.tsx` (492 LOC) component. The Phase 2 D-19 StatusPill (top-left of card image) already labels the listing as «На модерации» / "Pending review" — zero new pill work. Mod sees exactly what the renter would see post-approval, lowering surprise. No new compact-row component, no custom card variant.
- **D-02 (Tap-row behavior — route to PropertyDetailsScreen):** Tapping a queue row navigates to `PropertyDetailsScreen.tsx` (1680 LOC, largest screen). The detail screen reads via Phase 2 D-06's role-aware payload (mods + admins receive non-live listings with full payload + status field). Approve / Reject / Edit-on-behalf surface as a **moderation action footer** on PropertyDetailsScreen when the viewer's role is moderator-or-admin AND the listing's status is `pending`. The queue row's tap behavior reuses the existing PropertyCard onPress chain — zero new routing logic. Inline-action-sheet pattern was rejected because mods need to inspect the listing exactly as a renter would.
- **D-03 (Profile entry-point — pending-count badge):** Profile menu row reads "Moderation Queue" / «Модерация» followed by a count pill (e.g., red badge `(3)`) when count > 0. Mirrors the M1 mainstream-moderation-tool convention. Entry-point gated by `<Gated action="viewModerationQueue">` (new Action union member added to `src/hooks/useRole.ts`); zero entry-point visible for plain users. Pattern follows Phase 4.5's `canReviewLandlordApplications && onReviewLandlordApplications && (<TouchableOpacity ...>)` precedent. **Count fetch:** planner discretion — either a tiny `GET /api/moderation/queue/count` endpoint OR piggyback on `GET /api/moderation/queue` returning `{items: [...], totalCount: N}`. The first call is on Profile mount (and on AppState 'active' refresh per D-04); the count refreshes after any of the moderator's own approve/reject actions complete.
- **D-04 (Refresh strategy — pull-to-refresh + AppState 'active' + post-action auto-refetch; no polling):** `ModerationQueueScreen` uses FlatList `refreshControl` for explicit pull-to-refresh. `AppState 'active'` listener calls refetch when the app foregrounds, reusing the **same 60s cooldown pattern from Phase 2 D-17** (do NOT add a second AppState subscription that fires uncoordinated; planner verifies whether the existing AuthContext AppState hook can be extended or a new sibling hook with a shared cooldown registry is needed). After the moderator's own approve/reject completes (200 response), the queue auto-refetches so the row visibly disappears. Profile entry-point pending-count badge also refetches on the same triggers. **No setInterval polling** — keeps battery + Mongo load down at the small mod team scale; mods checking the queue reactively get fresh state on app open.

### Approve / Reject mechanics

- **D-05 (Approve UX — single-tap + native `Alert.alert` confirm):** Tap Approve button → RN native `Alert.alert` with title "Approve this listing?" / «Одобрить это объявление?» + Cancel / Approve buttons. Approve fires `POST /api/properties/:id/approve`. Matches ROADMAP success criteria #2 verbatim ("Approve is a confirmed single-tap action"). Uses RN's existing `Alert.alert` (already used elsewhere in the app per Phase 1 D-11 hard-logout precedent) — zero new modal component. Approve button visible on (a) PropertyCard footer in moderation queue rows (Approve/Reject/Edit-on-behalf inline icons or buttons; planner picks specific layout), AND (b) the moderation action footer on PropertyDetailsScreen.
- **D-06 (Reject reasonCode UI — inline horizontal chips):** `<RejectListingModal>` renders the 4 reasonCodes as a horizontal chip row at the top: `[Incomplete info]` / `[Prohibited content]` / `[Out of service area]` / `[Other]`. Single-select; tapping a chip highlights it via `useTheme()` semantic palette (likely `colors.primary` for selected, `colors.surface` for unselected). Matches **Phase 4.5's `LandlordApplicationQueueScreen` reject-reason canned-chips pattern** exactly — that's the precedent in this codebase, and consistency between landlord-rejection-reasons and listing-rejection-reasons is intentional. Chip labels translate via i18n keys keyed by reasonCode (see D-09 below for translation table location). Reject button stays disabled until a chip is selected.
- **D-07 (`reasonNote` field — always-visible TextInput below chips):** Multi-line `<TextInput>` rendered below the chip row, labeled "Add a note (optional)" / «Добавить примечание (необязательно)». Max 500 chars (planner verifies; aligns with REQUIREMENTS.md MOD-12's "optional free-text" without surfacing a server-side max). If empty on submit, no `reasonNote` is sent in the request body (or sent as null — planner decides). Optional-but-discoverable: mods can clarify a structured reasonCode without an extra tap. The "Other" reasonCode remains a valid selection without a note (the structured chip itself signals "miscellaneous"; a note is encouraged but not enforced).
- **D-08 (409 Conflict UX — toast + auto-refetch + stay on current screen):** Wherever the 409 fires (queue PropertyCard footer Approve, PropertyDetailsScreen action footer Approve, Reject modal Submit), the response surfaces the locked toast: "This listing was already reviewed by another moderator." / «Это объявление уже рассмотрено другим модератором.» (REQUIREMENTS.md MOD-15 verbatim). The queue refetches automatically; the pending-count badge updates. **The moderator stays on the current screen** — no forced back-navigation. If on PropertyDetailsScreen, the listing's status pill re-evaluates from the refreshed payload (so the screen visibly reflects the now-non-pending state); approve / reject buttons hide because the action footer's render condition is `status === 'pending' && role >= moderator`. If on the queue, the row disappears. Reject modal closes on 409 before the toast fires.

### Claude's Discretion

The user explicitly deferred these gray areas to research + planning. Capture them here so downstream agents know they're flexible (within the success criteria from ROADMAP.md and REQUIREMENTS.md MOD-13 / MOD-14 / MOD-16).

- **D-09 (`reasonCode` → owner-locale translation — location TBD):** REQUIREMENTS.md MOD-13 demands the rejection banner reads in the OWNER's locale (not the moderator's locale). Three viable locations — planner picks based on research:
  - **Server-side enum-to-locale dictionary** in backend (e.g., `JayTap-services/src/config/rejectionReasons.js` keyed by `reasonCode` × `locale`). `<RejectionBanner>` reads from a server-translated string in the GET `/api/properties/:id` payload. Centralized, owner-locale derived from `req.user.locale` or `Accept-Language`.
  - **Client-side i18n keys keyed by reasonCode** (e.g., `t(language, 'moderation.reject.reason.incomplete-info')`). The banner reads `reasonCode` (raw enum) from the payload and translates locally using the owner's app locale. Fits existing `src/locales/en.ts` + `src/locales/ru.ts` pattern; owner's locale is the app's active language (always correct).
  - **Hybrid:** server stores raw `reasonCode` enum; client maps to a per-locale string. (Effectively the second option with stronger naming.)
  - **Recommendation seed (planner decides):** Client-side i18n keys are the simplest and align with the 365-key M1 baseline + Phase 4.5's i18n approach. Server-side translation only matters if the reasonNote also needs translation, which it does NOT (MOD-13: "Free-text `reasonNote` is stored verbatim and displayed as-is"). Adding ~8 locale keys (4 reasonCodes × 2 locales) is cheap.
- **D-10 (`moderationLog` schema + atomicity + before/after granularity):** REQUIREMENTS.md MOD-16 specifies the row shape `{actorUid, action, targetType: 'property', targetId, before, after, reasonCode?, reasonNote?, at}`. Planner decides:
  - **Mongoose model location:** `JayTap-services/src/models/ModerationLog.js` (sibling to `LandlordApplicationAuditLog.js` — same audit-only-additive pattern from Phase 4.5). Consistent.
  - **`before` / `after` granularity:** full document snapshot OR changed-fields-only diff. Recommended: **changed-fields-only diff** for edit-on-behalf (echoes Mongo's natural `findOneAndUpdate` projection; keeps the log compact); for approve / reject, only the `status` field changes plus the `approvedAt` / `approvedBy` / `rejectedAt` etc. timestamps — naturally narrow.
  - **Atomicity:** Mongo session / transaction wrapping the status flip + the moderationLog insert? OR a follow-up `await ModerationLog.create(...)` after the status update succeeds? **Trade-off:** transactions add overhead (and may not be available depending on the Mongo deployment's replica-set posture); follow-up insert risks a status-changed-but-not-logged orphan if the second op fails. Recommended: **follow-up insert with structured logging on failure** (the audit row is forward-fit for an M3+ UI, not load-bearing for live mod actions; a rare orphan is acceptable). Planner verifies Mongo Atlas tier supports transactions before locking.
- **D-11 (`serviceAreas` config storage):** Phase 2 deferred this here. Backs MOD-12's `out-of-service-area` reasonCode (mod uses this when a listing's location is outside the launch market). Forward-fits to KG/KZ/UZ expansion (per memory `geographic-scope.md`: Bishkek launch + Almaty + Tashkent + smaller cities planned). Three viable locations — planner picks:
  - **Static const file** at `JayTap-services/src/config/serviceAreas.js`: `module.exports = { serviceAreas: ['Bishkek'] }`. M3+ admin UI mutates the file in a deploy. Simplest; keeps the config in version control.
  - **Mongo collection** (`serviceAreas` with `{name, country, addedAt}` rows). Admin-editable later without a deploy. Heavier; needs a tiny CRUD surface in M3.
  - **Backend env var** (`SERVICE_AREAS=Bishkek,Almaty,Tashkent`). Operational simplicity but loses country/structure.
  - **Recommendation seed:** Static const file with a TODO(M3) marker. M2 launch market is Bishkek-only; admin-editable adds work that doesn't unlock product value yet.
- **D-12 (Edit-on-behalf flow specifics):** REQUIREMENTS.md MOD-14 and ROADMAP.md success criteria #2 lock the contract — `moderatorContext: {editingOwnerUid, reason?}` prop on `CreateListingScreen`, save dispatches `editAsModerator` (NOT `updateProperty`), `ownerUid` not mutated, `moderationLog` row written. The remaining flexible decisions:
  - **Entry point(s):** Queue row "Edit" button (always); also from PropertyDetailsScreen action footer when role >= moderator AND status === 'pending'? Recommended: **both** — symmetry with Approve/Reject (which surface in both places per D-05).
  - **Mod-context banner inside `CreateListingScreen`:** A persistent top-of-screen banner reading "Editing on behalf of {ownerEmail}" / «Редактирование от имени {ownerEmail}» so the moderator never forgets the context. Recommended (planner has discretion on visual treatment; reuse `<RejectionBanner>` component visual or follow `<HomeRejectionBanner>` pattern).
  - **`reason?` field rendering:** Optional free-text rendered as a TextInput at the bottom of the form labeled "Note for owner (optional)" / «Примечание для владельца (необязательно)». NOT a chip-list (this is mod's free-text annotation, not a structured reasonCode). Stored on the moderationLog row's `reasonNote`. Recommended.
  - **Status-after-save semantics (BIG question):** When mod saves the edit-on-behalf, does the listing flip to `'live'` (mod fixed the issue, ready to go) OR stay `'pending'` (another mod approves)? **Recommended: `'live'`** — a moderator editing on behalf is functionally combining edit + approval into one step (otherwise the same mod would just hit Approve right after). This avoids a "mod fixed the listing but it sits in queue" foot-gun. The moderationLog row captures the action `'edit-on-behalf'` with full before/after diff, which IS the audit trail. Planner verifies this is acceptable to the user (or surfaces it if uncertain) before locking.
  - **Suppress `<RejectionBanner>` in mod-context:** When a mod opens edit-on-behalf on a `'rejected'` listing, the existing Phase 2 D-13 RejectionBanner inside the form should NOT show (mod is fixing the rejection, not viewing a rejection notification meant for the owner). Recommended: gate the banner mount on `!moderatorContext` inside `CreateListingScreen`.
- **D-13 (Backend route block — new file vs extend existing):** Four new endpoints land under `/api/moderation/*` (per ROADMAP success criteria #5 + REQUIREMENTS.md MOD-17): `GET /api/moderation/queue`, `POST /api/properties/:id/approve`, `POST /api/properties/:id/reject`, `PUT /api/moderation/listings/:id` (edit-on-behalf). Planner decides:
  - **New file** `JayTap-services/src/routes/moderationRoutes.js` (sibling to `landlordApplicationRoutes.js`). Cleaner separation; mirrors Phase 4.5 pattern.
  - **Extend `propertyRoutes.js`** (the approve/reject endpoints are property-scoped paths). Mixed with the existing CRUD — single file holds property domain logic.
  - **Recommendation seed:** **New file `moderationRoutes.js`** — route paths with `/api/moderation/*` prefix naturally group; the queue + edit-on-behalf endpoints don't fit the `/properties/*` mental model. The `/api/properties/:id/approve` + `/reject` endpoints can either live in `moderationRoutes.js` (path mismatch, but domain match) OR straddle into `propertyRoutes.js` for path consistency. Planner picks based on Express mounting convention check. All four require role >= moderator via the existing JWKS middleware + `requireMinRole('moderator')` (Phase 1 ROLE-04 pattern).
- **D-14 (Test coverage):** CONVENTIONS.md notes "Effectively zero tests" but Phase 1 added 42-tests-green via supertest. Phase 3 has critical race-condition logic (MOD-15 `findOneAndUpdate({_id, status: 'pending'})`) that warrants supertest coverage — but the codebase posture is "manual physical-device QA bar". Planner has discretion: minimal supertest coverage for the 4 new endpoints + race-condition test (recommended) vs zero tests + manual QA matrix (acceptable per codebase posture). Phase 6's QA matrix will exercise this on physical devices regardless.
- **D-15 (Visual specifics):** Action footer mount inside PropertyCard (Approve/Reject/Edit row vs hamburger overflow), Reject modal exact layout / chip styling / animation in/out, RejectListingModal positioning (bottom sheet vs centered modal), edit-on-behalf banner color token (warning vs info palette), pending-count badge styling (red vs primary palette). All planner discretion within `useTheme()` semantic palette.

### Forward-compat constraint (carry-forward, not new)

- **App.tsx LOC budget (locked from prior phases):** Currently **1132 LOC** (ahead of the 1100 soft cap from Phase 2 PITFALLS.md Pitfall 8 by 32 LOC). Phase 3 adds at minimum: `isModerationQueueOpen` state + setter, `showModerationQueue` derived flag, OVERLAY_FLAGS array entry, ModerationQueueScreen mount block, profile entry-point callback prop wiring, edit-on-behalf nav callback, and possibly a `<RejectListingModal>` mount alongside CreateListing. Estimated +30–45 LOC if minimally written. **Planner MUST plan for App.tsx pressure**: either accept the soft-cap drift (document in SUMMARY) OR extract one of the existing OVERLAY_FLAGS branches into a sub-component to net to zero. Soft cap is signal-not-block per Phase 2 PATTERN D precedent.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project-level requirements & scope

- `.planning/PROJECT.md` — Current Milestone v2.0 M2 "Roles & Moderation"; locked scope; hard rules (no Firebase SDK, MongoDB role authority, no react-navigation); geographic scope (Bishkek/KG launch, Almaty/KZ + Tashkent/UZ planned)
- `.planning/REQUIREMENTS.md` §"Moderation lifecycle (Phase 2 + Phase 3) — status field + queue + mod actions" — MOD-10..MOD-18 acceptance criteria with verbatim 409 toast copy + reasonCode enum + edit-on-behalf contract; Out of Scope hard rules
- `.planning/REQUIREMENTS.md` §"Future Requirements (M3+ — deferred)" — bulk multi-select, audit log UI, push notifications, lease-based locking, self-promotion path; explicitly out of M2
- `.planning/ROADMAP.md` §"Phase 3: Moderation Queue + Actions + Edit-on-Behalf" — Goal + Depends on + Requirements list + 5 Success Criteria

### Prior phase context (carries forward, do NOT re-decide)

- `.planning/phases/01-backend-role-foundation-auth-migration-hotfix-bundle/01-CONTEXT.md` §Token refresh + role-revocation UX (D-12 / D-13) — `AuthContext.refreshRole()` callable + 403 interceptor + role-refresh banner mounted in App.tsx; consumed by D-04 here for `AppState 'active'` cooldown coordination
- `.planning/phases/01-backend-role-foundation-auth-migration-hotfix-bundle/01-CONTEXT.md` §Hotfix sequencing (D-03/D-04/D-05) — Bearer + socket dual-accept window; legacy `x-firebase-uid` cutover lands in Phase 6, NOT here
- `.planning/phases/02-listing-lifecycle-status-field-absorption/02-CONTEXT.md` §Schema, default, and legacy data reconciliation (D-21) — audit fields already on Property schema (Phase 3 only WRITES them: `approvedAt/By`, `rejectedAt/By`, `rejectionReasonCode`, `rejectionReasonNote`)
- `.planning/phases/02-listing-lifecycle-status-field-absorption/02-CONTEXT.md` §Rejection messaging (D-13/D-14/D-15) — `<RejectionBanner>` already mounted on PropertyDetailsScreen; consumes `rejectionReasonCode` Phase 3 will populate; `<HomeRejectionBanner>` already wired
- `.planning/phases/02-listing-lifecycle-status-field-absorption/02-CONTEXT.md` §D-22 — `PUT /api/properties/:id` from owner on rejected listing already auto-flips status `'rejected'` → `'pending'` + clears `rejectionReasonCode`/`rejectionReasonNote`/`rejectedAt`/`rejectedByUid`. Phase 3's reject endpoint is the only path that POPULATES those fields.
- `.planning/phases/02-listing-lifecycle-status-field-absorption/02-CONTEXT.md` §D-08 — Phase 3 owns the entire `/api/moderation/*` route surface from a blank slate (no Phase 2 stubs)
- `.planning/phases/02-listing-lifecycle-status-field-absorption/02-CONTEXT.md` §"Critical implementation fact" — `RenterListingsScreen.tsx` is the self-listings screen (header reads "My Listings"); `OwnerListingsScreen.tsx` is the passive viewer of OTHER owners' listings. Phase 3 only touches `RenterListingsScreen.tsx` if it consumes pending-count for owner UI; it does NOT mount the queue here
- `.planning/phases/04.5-landlord-application-workflow/` — **Visual + audit-collection precedent** for Phase 3. Specifically: `LandlordApplicationQueueScreen` (admin overlay, FIFO queue, 4-code canned reasons + reject modal layout), `LandlordApplication` Mongoose model (additive audit fields), `LandlordApplicationAuditLog` model (append-only audit collection), Profile entry-point pattern (`canReviewLandlordApplications && onReviewLandlordApplications && (...)`), `useRole` Action union extension precedent (`reviewLandlordApplications`)

### Research outputs (M2)

- `.planning/research/ARCHITECTURE.md` — App.tsx LOC budget enforcement (≤1100 soft per PITFALLS Pitfall 8); current 1132 LOC ahead of soft cap; OVERLAY_FLAGS derived-overlay pattern (5 entries today; +1 for ModerationQueueScreen)
- `.planning/research/PITFALLS.md` — Pitfalls relevant to Phase 3: #4 (stale role cache → AppState refetch addresses), #8 (App.tsx god-file regression → soft cap pressure), #11 (status enum proliferation → 4-state locked), #12 (i18n parity drift → Phase 3 adds ~10–20 keys)
- `.planning/research/FEATURES.md` — Moderation queue classified as table-stakes for the M2 differentiator vs Lalafo/HouseKG; canned reasonCodes + bilingual rejection messaging is the user-facing trust signal

### Codebase analysis

- `.planning/codebase/CONVENTIONS.md` — Bilingual EN+RU parity required for every new UI string (CI gate `scripts/check-i18n-parity.sh`); `useTheme()` semantic tokens — no hardcoded colors; manual physical-device QA bar; no `firebase` / `@react-native-firebase/*` packages; root-level `__tests__/` for app-level smokes, co-located `src/<subdir>/__tests__/` for unit tests
- `.planning/codebase/STRUCTURE.md` — `src/components/PropertyCard.tsx` (492 LOC; reused as queue row per D-01); `src/screens/PropertyDetailsScreen.tsx` (1680 LOC; gets moderation action footer per D-02); `src/screens/CreateListingScreen.tsx` (910 LOC after Phase 2 D-20 cleanup; gets `moderatorContext` prop per D-12); `src/screens/ProfileScreen.tsx` (368 LOC; new entry-point per D-03); `App.tsx` (1132 LOC, ahead of soft cap; +30–45 LOC pressure per Phase 3 forward-compat)
- `.planning/codebase/CONCERNS.md` — Critical: Firebase API key hardcoded in source (deferred to a future phase, NOT Phase 3); High: App.tsx god-file (1132 LOC, ahead of soft cap — every Phase 3 addition is scrutinized); Medium: tab persistence pattern via `display: none` keep-alive

### Backend repo (decision-shaping references)

- `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/models/Property.js` — Phase 2's audit fields (`approvedAt`, `approvedByUid`, `rejectedAt`, `rejectedByUid`, `rejectionReasonCode`, `rejectionReasonNote`) already on schema. Phase 3 WRITES them.
- `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/models/LandlordApplicationAuditLog.js` — sibling-pattern Mongoose model for the new `ModerationLog.js` per D-10
- `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/routes/landlordApplicationRoutes.js` — sibling-pattern reference for the new `moderationRoutes.js` per D-13
- `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/routes/propertyRoutes.js` — Phase 2 role-aware filter already in place (D-05/D-06); Phase 3 may add `POST /api/properties/:id/approve` + `POST /api/properties/:id/reject` here OR in `moderationRoutes.js` (D-13 planner discretion)
- `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/middleware/verifyFirebaseToken.js` — Phase 1's JWKS middleware + `requireMinRole('moderator')` helper — Phase 3 mounts on every `/api/moderation/*` and approve/reject route
- `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/config/` (or similar) — `serviceAreas` config storage location per D-11 (planner picks file location)

### Client repo (decision-shaping references)

- `src/hooks/useRole.ts` — Action union already has `editAnyListing` + `approveListings` as M2 forward-compat. Phase 3 ADDS `viewModerationQueue` (Profile entry-point gate per D-03) AND wires the moderator/admin permission for `editAnyListing` + `approveListings` in `canFromUser` switch
- `src/screens/ProfileScreen.tsx` (368 LOC) — adds `onReviewModerationQueue?: () => void` prop + `pendingModerationCount?: number` prop (or fetches via dedicated hook); follows Phase 4.5 `<TouchableOpacity>` mount pattern
- `App.tsx` (1132 LOC) — adds `isModerationQueueOpen` state + setter, `showModerationQueue` derived flag, `OVERLAY_FLAGS` array entry, `ModerationQueueScreen` mount block, `onReviewModerationQueue` callback wired to ProfileScreen; LOC budget pressure per D-15 carry-forward
- `src/screens/CreateListingScreen.tsx` (910 LOC) — gets new `moderatorContext?: {editingOwnerUid: string, reason?: string}` prop per D-12; conditional banner mount when prop is set; save dispatcher branches between `updateProperty` (existing) and `editAsModerator` (new endpoint)
- `src/screens/PropertyDetailsScreen.tsx` (1680 LOC) — adds moderation action footer when role >= moderator AND status === 'pending'; consumes existing `<RejectionBanner>` from Phase 2 unchanged; Approve/Reject/Edit-on-behalf buttons match D-05/D-06/D-07 interaction
- `src/components/RejectionBanner.tsx` (Phase 2) — UNCHANGED in Phase 3 visual surface; Phase 3 only POPULATES `rejectionReasonCode` + `rejectionReasonNote` server-side so the banner has data to render. May need a small change to translate `rejectionReasonCode` per D-09 (planner picks server-side vs client-side translation)
- `src/components/PropertyCard.tsx` (492 LOC) — UNCHANGED for moderation queue use (D-01 reuses the existing component shape); StatusPill from Phase 2 D-19 already renders «На модерации»
- `src/services/PropertyService.ts` — adds `approveListing(id)`, `rejectListing(id, reasonCode, reasonNote?)`, `editAsModerator(id, fields, reason?)`, `getModerationQueue()`, `getModerationQueueCount()` methods (or similar; planner decides function signatures); inherits `Authorization: Bearer` via Phase 1's apiClient — no per-call header work
- `src/context/AuthContext.tsx` — Phase 2 D-17's AppState 'active' hook + 60s cooldown ALREADY in place; D-04 here either extends that hook (one subscription, two refetch consumers) OR adds a sibling hook with a shared cooldown registry. Planner verifies which pattern is cleaner.
- `src/locales/en.ts` + `src/locales/ru.ts` — Phase 3 adds ~10–20 new keys: 4 reasonCode chip labels × 2 locales = 8; approve confirm modal title × 2 = 2; reject modal title + reasonNote placeholder × 2 = 4; mod-context banner copy × 2 = 2; 409 race toast × 2 = 2 (already mostly locked); count badge label "Moderation Queue" × 2 = 2. Estimated 18–22 new keys; CI parity gate enforces.

### Auto-memory pointers (cross-session knowledge)

- `~/.claude/projects/-Users-beckmaldinVL-development-mobileApps-JayTap/memory/no-firebase-sdk.md` — REPO RULE: no `firebase` / `@react-native-firebase/*` in RN client; jose for JWKS on backend
- `~/.claude/projects/-Users-beckmaldinVL-development-mobileApps-JayTap/memory/identity-vs-user-store.md` — Firebase = identity proof (uid only); MongoDB = role authority via `userType`. Phase 3's role checks read backendProfile.userType (already cached via Phase 1's GET /api/auth/me)
- `~/.claude/projects/-Users-beckmaldinVL-development-mobileApps-JayTap/memory/backend-repo-location.md` — Backend at `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services`; same maintainer (no Railway-team coordination overhead)
- `~/.claude/projects/-Users-beckmaldinVL-development-mobileApps-JayTap/memory/geographic-scope.md` — KG/KZ/UZ launch scope; D-11 `serviceAreas` config must forward-fit to Almaty/Tashkent expansion (don't lock at Bishkek-only assumption in field shape, even if M2 default is `['Bishkek']`)
- `~/.claude/projects/-Users-beckmaldinVL-development-mobileApps-JayTap/memory/gsd-verifier-misses-regressions.md` — Verifier + reviewer paired gate; Phase 3's race-condition logic + new endpoints are exactly the regression class the verifier missed in Phase 1. Run code review at minimum; supertest for race-condition strongly recommended (D-14)
- `~/.claude/projects/-Users-beckmaldinVL-development-mobileApps-JayTap/memory/phase45-landlord-application-uid-mismatch-bug.md` — Phase 4.5 had a uid-mismatch bug between submitted apps' uid and submitting Firebase uid. Phase 3's actor-uid (moderationLog `actorUid` field) MUST be derived from the JWKS-verified token's `sub` (NOT from request body, NOT from a client-supplied field). Cross-reference HF-03 fix from Phase 1.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- **`PropertyCard`** (`src/components/PropertyCard.tsx`, 492 LOC) — used as-is for moderation queue rows per D-01. Phase 2 D-19 StatusPill already renders «На модерации» for pending listings. Phase 3 adds NO new visual variants.
- **`RejectionBanner`** (`src/components/RejectionBanner.tsx`, Phase 2) — already mounted on PropertyDetailsScreen; Phase 3 only POPULATES the data fields it reads (`rejectionReasonCode`, `rejectionReasonNote`). Translation logic per D-09 may add a small change.
- **`HomeRejectionBanner`** (Phase 2) — already wired; reflects rejected count. Phase 3's reject action increments this count visible to owner on next refresh.
- **`AuthContext.refreshRole()` + AppState 'active' hook** (Phase 1 + Phase 2 D-17) — D-04 reuses the same 60s cooldown pattern. Planner extends or adds sibling hook.
- **`<Gated action="...">`** (`src/hooks/useRole.ts`) — already in place; Phase 3 adds new Action union member `viewModerationQueue` and wires it to moderator/admin role check. `editAnyListing` + `approveListings` Action members are already defined as M2 forward-compat.
- **CreateListingScreen edit-mode plumbing** (M1 Phase 5 + Phase 2 D-15) — already supports edit-mode with prefilled values; D-12 layers a `moderatorContext` prop on top, branches save dispatcher.
- **ProfileScreen entry-point pattern** (Phase 4.5) — `canReviewLandlordApplications && onReviewLandlordApplications && (<TouchableOpacity ...>)`. D-03 follows verbatim with `canViewModerationQueue && onReviewModerationQueue && (...)`.
- **LandlordApplicationQueueScreen** — visual + interaction precedent for ModerationQueueScreen (FIFO queue, 4-code canned reject reasons, reject modal). Phase 3 mirrors the layout where it makes sense; differences are PropertyCard rows (D-01) vs LandlordApplication-specific rows.
- **LandlordApplicationAuditLog Mongoose model** — sibling-file pattern for the new `ModerationLog.js` per D-10.
- **landlordApplicationRoutes.js** — sibling-file pattern for `moderationRoutes.js` per D-13.
- **`apiClient.ts`** (Phase 1) — `Authorization: Bearer` auto-attached + 401/403 interceptors. Phase 3's new endpoints inherit transparently.
- **Bilingual `t()` translation helper** (`src/locales/index.ts`) — straightforward consumer for D-06 chip labels + D-09 reasonCode translation (if client-side route is chosen).

### Established Patterns

- **`useTheme()` semantic tokens** — pill colors, banner backgrounds, modal accents derive from theme palette. No hardcoded colors. D-15 visual specifics inherit.
- **Belt-and-suspenders defense in depth** — Phase 1 D-08 + D-10 + Phase 2 D-02/D-07 set the precedent (server filter + client filter). Phase 3's role check should also be belt-and-suspenders: client `<Gated>` hides UI, backend `requireMinRole` rejects requests. Don't trust client-only.
- **Audit-field "additive only" schema discipline** — Phase 1 D-04 / Phase 2 D-21 / Phase 4.5 all added Mongo fields without breaking existing reads. `ModerationLog` (D-10) is a new collection — also additive at the database level.
- **OVERLAY_FLAGS derived-overlay pattern** (M1 Phase 1) — Phase 3 adds `isModerationQueueOpen` to OVERLAY_FLAGS. Code-review checklist: every new full-screen overlay state MUST be added to OVERLAY_FLAGS to prevent the M1 nav-stuck bug regressing.
- **AsyncStorage key naming** — Phase 3 adds NO new persisted keys (queue state is ephemeral; pending count is fetched, not cached).
- **EN+RU parity CI gate** (`scripts/check-i18n-parity.sh`) — every new key must land in both locale files in the same commit.
- **Server-resolved role check via `requireMinRole`** (Phase 1 ROLE-04) — every Phase 3 endpoint mounts under `verifyFirebaseToken` + `requireMinRole('moderator')`.

### Integration Points

- **Backend `moderationRoutes.js`** (or `propertyRoutes.js` extension per D-13 planner discretion) — 4 new endpoints: `GET /api/moderation/queue`, `POST /api/properties/:id/approve`, `POST /api/properties/:id/reject`, `PUT /api/moderation/listings/:id`. Optional 5th: `GET /api/moderation/queue/count` per D-03 planner discretion.
- **Backend `ModerationLog.js`** — new Mongoose model under `JayTap-services/src/models/`. Schema per REQUIREMENTS.md MOD-16: `{actorUid, action, targetType: 'property', targetId, before, after, reasonCode?, reasonNote?, at}`.
- **Backend `serviceAreas` config** — new file or new collection per D-11. Consumed by reject endpoint when validating `out-of-service-area` reasonCode (lightweight; the chip itself is a free choice — no server-side enforcement that the listing IS out of area; serviceAreas list informs the M3+ admin UX).
- **Client `ModerationQueueScreen`** — new file at `src/screens/ModerationQueueScreen.tsx`. Mounts as overlay flag in App.tsx. FlatList of PropertyCard rows + per-row action buttons (Approve / Reject / Edit-on-behalf) OR routes to PropertyDetailsScreen via row tap (D-02). Pull-to-refresh + auto-refresh after own action.
- **Client `RejectListingModal`** — new file at `src/components/RejectListingModal.tsx`. Bottom sheet (or centered modal — planner picks per D-15) with chip row + reasonNote TextInput + Submit button. Reusable from queue row + PropertyDetailsScreen action footer.
- **Client `App.tsx`** — adds `isModerationQueueOpen` state, OVERLAY_FLAGS entry, ModerationQueueScreen mount block, `resetProfileSubScreens` extension if applicable, callback wiring chain (ProfileScreen → ModerationQueueScreen → PropertyDetailsScreen → CreateListingScreen with moderatorContext). LOC budget per carry-forward D-15.
- **Client `ProfileScreen.tsx`** — new entry-point row + `pendingModerationCount?: number` prop (consumed for badge per D-03).
- **Client `useRole.ts`** — Action union extends with `viewModerationQueue`; `canFromUser` switch adds the moderator-or-admin case. `editAnyListing` + `approveListings` cases also need their permission logic wired (currently defined but planner verifies the canFromUser switch handles them).
- **Client `CreateListingScreen.tsx`** — `moderatorContext` prop conditional rendering: mod banner + suppressed RejectionBanner + branched save dispatcher to `editAsModerator`.

</code_context>

<specifics>
## Specific Ideas

- **409 toast copy — exact strings to ship** (D-08): EN "This listing was already reviewed by another moderator." / RU «Это объявление уже рассмотрено другим модератором.» (REQUIREMENTS.md MOD-15 verbatim, no rewording).
- **Moderator identity privacy** (REQUIREMENTS.md MOD-13 verbatim): RejectionBanner reads "JayTap moderator" / «Модератор JayTap». NEVER expose the moderator's name, email, or uid to the owner. The moderationLog stores `actorUid` server-side for audit; that field is NEVER returned in any owner-facing payload.
- **4 reasonCodes — locked enum** (REQUIREMENTS.md MOD-12 verbatim): `incomplete-info`, `prohibited-content`, `out-of-service-area`, `other`. Stored as raw enum string on `Property.rejectionReasonCode` and on `ModerationLog.reasonCode`.
- **`serviceAreas` M2 default value** (D-11): `['Bishkek']`. Forward-fits to `['Bishkek', 'Almaty', 'Tashkent', ...]` in M3+ via the storage location planner picks.
- **Approve confirm modal copy** (D-05): EN "Approve this listing?" / RU «Одобрить это объявление?». Cancel + Approve buttons. Planner uses RN's native `Alert.alert` consistent with Phase 1 D-11 hard-logout precedent.
- **Reject reasonNote placeholder copy** (D-07): EN "Add a note (optional)" / RU «Добавить примечание (необязательно)». Multi-line, max 500 chars.
- **Moderation Queue entry-point label** (D-03): EN "Moderation Queue" / RU «Очередь модерации» (or «Модерация» — planner picks). Count badge follows the label.
- **Action union extension** (D-03 + D-12): `useRole.ts` Action type adds `'viewModerationQueue'` member. The existing `editAnyListing` + `approveListings` members get their `canFromUser` switch cases wired (currently defined but planner verifies the cases exist). Optional: planner may add `'editAsModerator'` if separating from `editAnyListing` clarifies the gate.
- **PropertyCard row mod-action layout** (D-01 + D-05): planner picks between (a) inline icon row in PropertyCard footer (Approve checkmark + Reject X + Edit pencil), (b) PropertyCard footer with a separate "Action" row, or (c) tap → action sheet on the queue. Visual treatment matches Phase 4.5 LandlordApplicationQueueScreen if symmetry helps user mental model.
- **Edit-on-behalf status-after-save** (D-12 sub-decision): Recommended `'live'` (mod fixed it = ready to publish). Planner verifies with user before locking; if uncertain, keep `'pending'` and let mod hit Approve in a second action. (Surfaced as a flag-for-confirmation per D-12.)

</specifics>

<deferred>
## Deferred Ideas

- **Edit-on-behalf flow specifics** — User deferred this gray area. D-12 captures the recommendations + open sub-decisions (entry points, banner, status-after-save, reason field, RejectionBanner suppression). Planner finalizes during plan-phase.
- **Backend shape: audit log + reasonCode i18n + serviceAreas** — User deferred. D-09 + D-10 + D-11 capture the recommendations + planner-picks-among-options.
- **Test coverage strategy** — D-14: planner has discretion on supertest coverage for the 4 new endpoints + race-condition test. Codebase posture is "manual physical-device QA bar"; Phase 1 + Phase 4.5 added supertest coverage; Phase 2 did not. Phase 6's manual QA matrix exercises the surface regardless.
- **Action footer visual on PropertyDetailsScreen** — D-15: overlay vs inline mount, animation, color tokens. Planner picks within `useTheme()` semantic palette.
- **Reject modal positioning** (bottom sheet vs centered) — D-15 planner discretion. Bottom sheet is the LandlordApplicationQueueScreen precedent; centered modal is more focused but less RN-native.
- **Pending-count fetch endpoint shape** — D-03: dedicated `GET /api/moderation/queue/count` endpoint OR piggyback `{items, totalCount}` on `GET /api/moderation/queue`. Planner picks.
- **Polling on the queue screen** — Explicitly rejected in D-04. Future M3+ may add polling if mod team scales.
- **Bulk multi-select moderation actions** — REQUIREMENTS.md Future §; out of M2 scope.
- **Email / push / in-app message notifications on approval / rejection** — REQUIREMENTS.md Future §; M2 in-app banner (Phase 2) is sufficient.
- **Lease-based pessimistic locking on the moderation queue** — REQUIREMENTS.md Future §; optimistic 409 (MOD-15) suffices for the small mod team.
- **Self-promotion path / "apply to be a moderator"** — REQUIREMENTS.md Future §; out of M2 scope.
- **M3+ admin UI for editing the `serviceAreas` list** — D-11: M2 default is `['Bishkek']`; admin-edit unlocks when KZ/UZ launch lands.
- **M3+ moderation log audit screen** — `moderationLog` is append-only and forward-fits a UI. No M2 UI.
- **Hierarchical permission inheritance** — REQUIREMENTS.md Future §; M2 keeps M1's flat `can(action)` predicates.
- **Material-edit re-queues to pending rule on owner edits** — Phase 2 D-22 explicitly carved this out as future-phase scope. Not Phase 3.
- **In-app moderation messaging thread (mod ↔ owner)** — REQUIREMENTS.md Future §; out of M2 scope.

</deferred>

---

*Phase: 03-moderation-queue-actions-edit-on-behalf*
*Context gathered: 2026-05-01*

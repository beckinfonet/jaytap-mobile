# Phase 4: Archive Lifecycle (Owner + Mod/Admin) - Context

**Gathered:** 2026-05-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Surface the full archive lifecycle end-to-end across owner + mod/admin surfaces: owner-driven no-reason archive of own listings, mod/admin-driven structured-reason archive of any listing, restore-to-pending re-moderation flow (preventing post-rejection bypass), and tightening hard-delete to admin-only. Two new dedicated POST routes per side (owner + mod/admin), one new `<ArchiveListingModal>` forked from Phase 3's `RejectListingModal`, `useRole.ts` Action union extended with three members (`archiveOwnListing`, `archiveAnyListing`, `hardDeleteListing`), `ModerationLog` action enum extended with `'archive'` + `'unarchive'` (Phase 3 D-10 reservation), `RenterListingsScreen` re-mounts the dormant archive affordances Phase 2 stripped, `PropertyDetailsScreen` gains an admin-only Hard Delete affordance + restore button on archived listings, locale rewrite of the existing `property.unarchiveDialog*` keys (Phase 2's "Restore to Drafts" copy is wrong for ARCH-04's re-moderation semantics).

**Touches both repos:**
- RN client (`/Users/beckmaldinVL/development/mobileApps/JayTap`) — new `<ArchiveListingModal>`, `PropertyService` rewires for 4 new methods (`archiveOwnListing` / `archiveAnyListing` / `restoreListing` / `hardDeleteListing`), `useRole.ts` Action union + canFromUser switch extended, `RenterListingsScreen` re-mounts onArchive/onUnarchive on PropertyCard + HospitalitySection, `PropertyDetailsScreen` footer extends with Archive/Restore (mod/admin) + Hard Delete (admin), `RenterListingsScreen` strips owner hard-delete (handler + DeletePropertyModal mount move to PropertyDetailsScreen), locale key rewrite + 3-5 new keys for restore + hard-delete confirms
- Backend (`/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services`) — 2 new owner routes (`POST /api/properties/:id/archive` + `POST /api/properties/:id/unarchive`) in `propertyRoutes.js`, 2 new mod/admin routes (`POST /api/moderation/properties/:id/archive` + `POST /api/moderation/properties/:id/restore`) in `moderationRoutes.js`, `DELETE /api/properties/:id` middleware tightened to `requireMinRole('admin')`, `ModerationLog` action enum extended `'archive'` + `'unarchive'` + `'hard-delete'`, atomic `findOneAndUpdate` race-safety on each new route, audit-row writes on every status transition

**Requirements covered:** ARCH-01, ARCH-02, ARCH-03, ARCH-04, ARCH-05 (5 reqs).

**Explicitly NOT in this phase (boundary anchors for downstream):**
- Admin role management UI (search users, change `userType`, last-admin lockout) — Phase 5 (ADMIN-01..ADMIN-07)
- Mod-side discovery of archived listings (search/find any-listing-by-id surface) — M3+ admin search; M2 mods reach archived listings via existing deep-link surfaces only
- M3+ moderation log audit screen (`moderationLog` is append-only and forward-fits a future audit UI; no read surface in M2)
- Owner self-service hard-delete / "request deletion" workflow — M3+ if user demand surfaces; M2 owners stay-archived-forever in their library
- Mod-restore-direct-to-live shortcut — explicitly rejected (preserves ARCH-04 invariant; mod-restored listings re-enter the queue)
- Email / push / in-app message notifications on archive / restore — REQUIREMENTS.md Future §
- Bulk multi-select archive actions — REQUIREMENTS.md Future §
- Phase 6 release / cross-cutting QA — Phase 6 owns

</domain>

<decisions>
## Implementation Decisions

### Backend route shape & API surface

- **D-01 (Owner-archive endpoint — dedicated POST in `propertyRoutes.js`):** New routes `POST /api/properties/:id/archive` + `POST /api/properties/:id/unarchive` in `propertyRoutes.js`. Mirrors Phase 3 D-13's "moderation actions are dedicated POST routes" precedent + Phase 2 D-22's invariant that body-status writes from owners are sanitized (`ALLOWED_OWNER_STATUS_TRANSITIONS = []`). Owner-archive route does NOT extend the existing `PUT /api/properties/:id` with a status whitelist — that would reverse Phase 2's hardened sanitizer. Routes mount under `verifyFirebaseToken` (Phase 1 ROLE-04). Race-safety: `findOneAndUpdate({_id: id, ownerUid: req.user.uid, status: {$ne: 'archived'}}, {$set: {status: 'archived', archivedAt: new Date(), archivedByUid: req.user.uid, archivedReasonCode: null}})`. Returns 200 + updated property OR 403 (not owner) OR 404 (not found) OR 409 (already archived). Audit row appended to `moderationLog` with `action: 'archive'`, `reasonCode: null`, `reasonNote: null`.

- **D-02 (Mod/admin archive + restore endpoints — `moderationRoutes.js`):** New routes `POST /api/moderation/properties/:id/archive` (body: `reasonCode`, optional `reasonNote`) + `POST /api/moderation/properties/:id/restore` in `moderationRoutes.js`. Consistent with Phase 3 D-13 — every `/api/moderation/*` route inherits the router-level `verifyFirebaseToken + requireMinRole('moderator')` mount Phase 3 already established at `moderationRoutes.js:26`. `reasonCode` validation reuses Phase 3's `VALID_REJECT_CODES = ['incomplete-info', 'prohibited-content', 'out-of-service-area', 'other']` const (mod-archive uses the SAME 4-code enum per ARCH-02 verbatim). Race-safety: `findOneAndUpdate({_id: id, status: {$ne: 'archived'}}, {$set: {status: 'archived', archivedAt: new Date(), archivedByUid: req.user.uid, archivedReasonCode: reasonCode, archivedReasonNote: reasonNote || null}})`. Returns 200 OR 400 (missing/invalid reasonCode) OR 404 OR 409 (already archived). Audit row: `action: 'archive'`, `actorUid: req.firebaseUid`, `reasonCode`, `reasonNote`.

- **D-03 (Restore endpoints — symmetric POST shapes):** `POST /api/properties/:id/unarchive` (owner — only when `archivedByUid === ownerUid`) + `POST /api/moderation/properties/:id/restore` (mod/admin — any archived listing). Both transition status `'archived' → 'pending'` per ARCH-04 verbatim ("transitions status to `pending`, NOT back to its prior status"). Race-safety: `findOneAndUpdate({_id: id, status: 'archived', ...ownership-filter}, {$set: {status: 'pending', submittedAt: new Date(), archivedAt: null, archivedByUid: null, archivedReasonCode: null, archivedReasonNote: null}})`. The `submittedAt` re-stamp puts the listing back in FIFO queue order; the audit-field clears match Phase 2 D-22's pattern (rejected→pending edit-resubmit clears rejection fields). Audit row: `action: 'unarchive'`, `actorUid: req.firebaseUid`. Returns 200 OR 403 (owner not original archiver) OR 404 OR 409 (not currently archived). NB: `approvedAt`/`approvedByUid`/`rejectedAt`/`rejectedByUid`/`rejectionReasonCode`/`rejectionReasonNote` are PRESERVED (per D-13 below).

- **D-04 (Hard-delete endpoint — stay at `DELETE /api/properties/:id`, gate via `requireMinRole('admin')`):** No path move. The existing route in `propertyRoutes.js` swaps middleware: `verifyFirebaseToken + requireMinRole('admin')` instead of the old "owner-only" inline check. Audit row appended (`action: 'hard-delete'`, `before: full snapshot via Property.findById().lean()`, `after: null`, `actorUid: req.firebaseUid`). Client `apiClient.delete('/properties/:id')` path stays unchanged — only the gate tightens. Avoids deprecating the existing route (which is wired in production-ready PropertyService.deleteProperty).

- **D-05 (`ModerationLog` action enum extension):** Phase 3 D-10 explicitly reserved `'archive'` and `'unarchive'` for this phase. Phase 4 also adds `'hard-delete'`. Final enum: `['approve', 'reject', 'edit-on-behalf', 'archive', 'unarchive', 'hard-delete']`. Same `actorUid: req.firebaseUid` invariant from Phase 3 (memory `phase45-landlord-application-uid-mismatch-bug.md`); same anti-pattern grep gates (`actorUid: req.body` / `actorUid: req.headers` must return 0 in moderationRoutes.js + propertyRoutes.js).

### Mod/admin archive surface — discoverability

- **D-06 (PropertyDetailsScreen footer — single source of mod/admin archive + restore + hard-delete):** ARCH-02 says mod/admin archives "from the Moderation Queue or PropertyDetailsScreen". Phase 4 ships the PropertyDetailsScreen path; ModerationQueueScreen extension (status filter chips / additional tabs) is explicitly out of scope. The footer extends Phase 3's existing 3-button mod action footer (Approve / Reject / Edit on behalf rendered when `status === 'pending'`) with:
  - **Archive button** rendered when `can('archiveAnyListing') AND status !== 'archived'`. Opens `<ArchiveListingModal>` (D-08).
  - **Restore button** rendered when `can('archiveAnyListing') AND status === 'archived'`. Confirms via `Alert.alert` with restore copy (D-12); fires `PropertyService.restoreListing(id)` against `POST /api/moderation/properties/:id/restore`.
  - **Hard Delete button** rendered when `can('hardDeleteListing') AND admin role`. Reuses existing `DeletePropertyModal` mount (D-10).
  - Mod/admin viewing PENDING listings sees BOTH the existing 3-button row (Approve/Reject/Edit-on-behalf) AND the Archive button — Archive becomes the take-down option for pending listings (mod judges "this isn't worth approving OR rejecting; just take it down").

- **D-07 (Mod/admin discovery of archived listings — defer to M3 admin search):** ARCH-03 says archived listings are "visible to ... mods/admins via the moderation surface". M2 ships ZERO new mod-side browsing surface. Mods reach archived listings via existing deep-link paths: a renter's old chat reference, a direct URL, or the owner's RenterListings if the mod has owner permissions on a test account. The "find-any-listing-by-id" admin search is M3+ scope. ModerationQueueScreen stays hard-locked to `status: 'pending'` per Phase 3 D-04.

### UI primitives & destructive UX

- **D-08 (Mod/admin Archive modal — new `<ArchiveListingModal>` forked from `RejectListingModal`):** New file `src/components/ArchiveListingModal.tsx`. Copy RejectListingModal's structure (4-chip reasonCode row + optional note TextInput + Submit button) into a new file with: header copy `t('moderation.archive.modalTitle')` ("Archive Listing" / «Архивировать объявление»); submit button copy `t('moderation.archive.submit')` ("Archive" / «В архив»); audit-action verb `'archive'` (vs RejectListingModal's `'reject'`). Trade-off accepted: ~150 LOC duplication, but each modal stays single-purpose and copy-bound to its action verb (PATTERN A precedent from Phase 3). RejectListingModal stays untouched (already shipped, code-reviewed, and stable). Adds 4 new locale keys × 2 locales = 8 strings (`moderation.archive.modalTitle` + `.submit` + `.success` + `.failure`).

- **D-09 (Owner archive UX — keep existing `Alert.alert` flow):** `RenterListingsScreen.tsx:141-167` already has `handleArchiveProperty` using `Alert.alert` with `property.archiveDialogTitle` + `property.archiveDialogMessage`. Phase 4 just rewires: (a) `PropertyService.archiveOwnListing(id)` replaces the broken `archiveProperty(id)` (which currently writes `body.status: 'archived'` that Phase 2's sanitizer strips); (b) `onArchive` prop re-mounted on PropertyCard + HospitalitySection in `RenterListingsScreen` for owner views (Phase 2 stripped these per D-08 boundary; Phase 4 re-mounts). Owner archive is no-reason per ARCH-01 — native confirm is the right primitive (Phase 3 D-05 Approve precedent). Zero new component work for owner-archive.

- **D-10 (Admin hard-delete confirm — reuse existing `DeletePropertyModal`, move mount):** Existing `DeletePropertyModal` + `confirmDelete` handler currently in `RenterListingsScreen.tsx:111-134`. Phase 4: (a) STRIP from `RenterListingsScreen` entirely (owners no longer have hard-delete); (b) MOUNT in `PropertyDetailsScreen` as admin-gated affordance via `<Gated action="hardDeleteListing">`; (c) update copy with admin-context warning ("PERMANENT — this action will be recorded in the audit log" / «БЕЗВОЗВРАТНО — это действие будет записано в журнал аудита»); (d) `PropertyService.hardDeleteListing(id)` calls `apiClient.delete('/properties/:id')` (path unchanged per D-04). Owner-side `handleDeleteProperty` + `propertyToDelete` state + `deleteModalVisible` state ALL removed from RenterListingsScreen. Toast on success: existing `t('property.permanentlyDeletedToast')`.

- **D-11 (PropertyCard prop API — parent-driven; add `onUnarchive` for symmetry):** PropertyCard stays presentational. Existing props: `onEdit`, `onArchive`, `onDelete`, `onPress`. Phase 4 adds: `onUnarchive` (renders the existing emerald-styled "restorative" button at PropertyCard.tsx:480 with copy from `t('property.unarchive')`). RenterListingsScreen mounts:
  - For statuses `live` / `pending` / `rejected`: `onArchive={handleArchiveProperty}` + `onEdit={handleEditProperty}`. NO `onDelete`.
  - For status `archived`: `onUnarchive={handleUnarchiveProperty}` ONLY (no edit on archived; archived listings are read-only-until-restored). NO `onDelete`.
  - Card auto-derives the visible action set from `(status, props-passed)` — no internal `useRole()` coupling.

### Restore semantics & user-facing copy

- **D-12 (Restore confirm copy — direct re-moderation framing):** Rewrite the existing locale keys to set the queue expectation cleanly:
  - **`property.unarchiveDialogTitle`** (existing key, EN unchanged): "Restore Listing" / «Восстановить объявление»
  - **`property.unarchiveDialogMessage`** (existing key, REWRITE both locales): EN: "Restore this listing? It will go back to the moderation queue for review before becoming public again." / RU: «Восстановить это объявление? Оно вернётся в очередь модерации для проверки перед публикацией.»
  - **`property.unarchiveConfirm`** (existing key, unchanged): "Restore" / «Восстановить»
  - **`property.unarchivedToastTitle`** (existing key, REWRITE both locales): EN: "Listing sent to moderation" / RU: «Объявление отправлено на модерацию»
  - **`property.unarchivedToastMessage`** (existing key, REWRITE both locales): EN: "It will appear publicly once a moderator approves it." / RU: «Оно появится публично после одобрения модератором.»
  - Locale key NAMES preserved so Phase 4 is a value rewrite (no key-rename cascade through any source consumer); 5 keys × 2 locales = 10 strings rewritten.

- **D-13 (Who-can-restore rule — owner restores only listings they self-archived; mod/admin restores any):** Backend rule on `POST /api/properties/:id/unarchive`: `req.user.uid === property.ownerUid AND property.archivedByUid === property.ownerUid`. Otherwise 403. This means: if an owner self-archived a listing, they can restore it to pending freely. If a mod/admin archived an owner's listing (with a structured reasonCode per D-02), only a mod/admin can restore it via `POST /api/moderation/properties/:id/restore` — owner sees a disabled / hidden Restore affordance on PropertyCard. Prevents the foot-gun: mod takes down a problematic listing → owner re-publishes by self-restoring. The mod-archive's reasonCode is sticky to the mod-decision domain. Client gating: `<PropertyCard onUnarchive={(canSelfRestore ? handleUnarchive : undefined)}>` where `canSelfRestore = property.archivedByUid === user.localId`. Tooltip / disabled-state UX: planner discretion (recommended: hide the affordance entirely; owner who can't restore sees just the Edit-disabled archived card).

- **D-14 (Owner permanent-delete escape hatch — none in M2; stay-archived-forever):** Owners archive → listing sits in their Archived tab indefinitely. ARCH-03 says archived stays visible to owner. Storage is cheap; users very rarely actually want bytes erased. If a user does want hard-removal, they contact support → admin uses hard-delete. Strip `handleDeleteProperty` + `DeletePropertyModal` mount entirely from `RenterListingsScreen` (owner side) — they MOVE to `PropertyDetailsScreen` admin-gated mount per D-10. M3+ may add a "request deletion" workflow if user demand surfaces.

- **D-15 (Audit-field clears on restore — selective; preserve approve/reject history):** On restore (status: `'archived' → 'pending'`), the route clears: `archivedAt`, `archivedByUid`, `archivedReasonCode`, `archivedReasonNote`. PRESERVES: `approvedAt`, `approvedByUid`, `rejectedAt`, `rejectedByUid`, `rejectionReasonCode`, `rejectionReasonNote`. The `submittedAt` field is RE-STAMPED to `new Date()` (FIFO re-queue per Phase 2 D-22 pattern). This means a mod looking at a restored listing in their queue can see prior moderation history (e.g., "previously rejected on 2026-04-15 for prohibited-content; later archived; now resubmitted"). The audit row in `moderationLog` is the load-bearing historical record; the on-listing audit fields are soft signal for the mod's UI. Mirrors Phase 2 D-22's "rejection metadata cleared on rejected→pending edit-resubmit" pattern.

### Action union extension & permissions

- **D-16 (`useRole.ts` Action union — add 3 members per ARCH-05):** Add to the Action type at `src/hooks/useRole.ts:14`:
  - `'archiveOwnListing'` — `canFromUser` returns `true` when `role !== 'guest' && !!user?.backendProfile` (any authenticated user; backend enforces `req.user.uid === property.ownerUid` per D-01)
  - `'archiveAnyListing'` — `canFromUser` returns `true` when `role === 'moderator' || role === 'admin'`
  - `'hardDeleteListing'` — `canFromUser` returns `true` when `role === 'admin'`
  - **Restore permissions piggyback on archive:** No separate `restoreOwnListing` / `restoreAnyListing` Actions. ARCH-04 says "Restoration is available to whoever has rights to archive" — the same `<Gated>` predicate that shows the archive affordance also shows the restore affordance (the affordance toggles based on `property.status` per D-11). Locks the Action union at 3 new members instead of 5; mirrors ARCH-05's verbatim list.
  - Belt-and-suspenders precedent: `canFromUser` used at the service layer (PropertyService.archiveAnyListing throws PermissionDeniedError client-side per Phase 3 Plan 02 pattern); backend is the authoritative gate.

### Race-safety, audit invariants, and forward-compat constraints

- **D-17 (Race-safety — atomic `findOneAndUpdate` with status filter on every status-changing route):** Per Phase 3 MOD-15 / D-10 precedent. Every Phase 4 route uses `findOneAndUpdate({_id, status: <expected-current>, ...ownership-or-role-filter}, {$set: ...})`. If `findOneAndUpdate` returns null, the route returns 409 with `{code: 'ALREADY_ARCHIVED'}` or `{code: 'ALREADY_RESTORED'}` or `{code: 'NOT_FOUND_OR_FORBIDDEN'}` (planner picks the exact code-set; recommend reusing Phase 3's `'ALREADY_MODERATED'` shape for symmetry). Catches concurrent owner-archive + mod-archive (only one wins; other gets 409); concurrent owner-restore + mod-archive (whichever lands first locks the new status). Client toast on 409: planner discretion (recommend reusing Phase 3 `moderation.race.toast` copy or adding archive-specific copy).

- **D-18 (Audit-row write pattern — follow-up insert, no transaction):** Per Phase 3 D-10. After `findOneAndUpdate` succeeds (returns updated doc, not null), append to `ModerationLog` via `await ModerationLog.create({actorUid: req.firebaseUid, action: <verb>, targetType: 'property', targetId: id, before: <pre-update snapshot>, after: <post-update snapshot>, reasonCode, reasonNote, at: new Date()})`. If the audit insert fails, log structured error but DO NOT roll back the status change (audit is forward-fit for an M3+ UI; rare orphan acceptable). For `'hard-delete'`, capture `before: full Property snapshot via .lean()` BEFORE the `findOneAndDelete()` call; after-snapshot is `null`.

- **D-19 (App.tsx LOC budget — net-zero target; current 1178 LOC):** Phase 3 closed at App.tsx 1178 LOC (78 over the Phase 2 PITFALLS Pitfall 8 soft cap of 1100, 2 under the documented 1180 hard ceiling). Phase 4 needs to add ZERO net LOC to App.tsx — all archive surfaces mount on PropertyDetailsScreen (D-06) + RenterListingsScreen (D-09 / D-11) + the new modal (D-08); none require new OVERLAY_FLAGS entries (no new full-screen overlays). Planner verifies this assumption holds during plan-phase; if any App.tsx wiring sneaks in, signal-not-block per Phase 2 PATTERN D precedent + use the Phase 3 SUMMARY's M3 remediation candidates list (extract `<ModerationQueueOverlayHost>` + `useModerationQueueCount()` hook).

- **D-20 (Forward-compat — `archivedReasonNote` field added to Property schema):** Phase 2 D-21 added `archivedAt: Date | null` + `archivedByUid: String | null` to the Property schema. Phase 4 mod/admin archive needs an optional `archivedReasonNote: String | null` field (mirrors `rejectionReasonNote` per Phase 2 D-21). Phase 4 ADDS this field to the Mongoose schema additively (no migration needed; null-default applies to existing docs). The `archivedReasonCode: String | null` field already exists per Phase 2 D-21 (no enum constraint at schema level — code constrains via `VALID_REJECT_CODES` const reuse per D-02).

### Claude's Discretion

- **Archive Modal visual treatment** — chip styling, modal positioning (bottom sheet vs centered), animation in/out. Planner uses Phase 3 RejectListingModal as visual baseline; deviations allowed within `useTheme()` semantic palette. `moderation.archive.modalTitle` icon (planner picks — likely a generic `archive` glyph or no icon).
- **Hard-delete confirm copy intensity** — D-10 recommended adding "audit log will record this" warning. Planner picks exact bilingual phrasing (recommend modeling after the existing `property.deleteDialogTitle` + adding a one-line warning sentence).
- **409 toast copy for archive races** — Reuse Phase 3 `moderation.race.toast` ("This listing was already reviewed by another moderator.") OR add archive-specific copy ("This listing was already archived." / «Это объявление уже архивировано.»). Planner picks based on copy-fit per situation; new copy adds 1 key × 2 locales = 2 strings.
- **PropertyService method signatures** — Recommended 4 explicit methods (matching Action union extension verbatim): `archiveOwnListing(id)`, `archiveAnyListing(id, reasonCode, reasonNote?)`, `restoreListing(id)` (single method; backend route picked based on caller role via separate URL paths inside the method), `hardDeleteListing(id)`. Planner verifies the existing broken `archiveProperty` / `unarchiveProperty` / `deleteProperty` methods get fully rewritten or deprecated.
- **Backend test coverage (D-14 inheritance from Phase 3)** — Phase 3 added 18-case supertest harness covering race + audit + actorUid anti-spoofing + role-gating. Phase 4 has fewer race surfaces (no two-mods-on-the-same-archive scenario is as common as two-mods-on-the-same-pending) but still has 4 new endpoints + 1 middleware swap. Recommended: 10-15 supertest cases covering: owner-archive happy + 403 not-owner + 409 already-archived; mod-archive happy + 400 invalid-reasonCode + 409 already-archived + 403 plain-user; owner-restore happy + 403 not-original-archiver; mod-restore happy + 409 not-archived; hard-delete admin happy + 403 mod + 403 owner + audit-row-with-before-snapshot. Planner discretion on exact case set.
- **PropertyCard onUnarchive prop wiring on HospitalitySection** — HospitalitySection is the M1 Phase 6 ListHeaderComponent strip used on Home / Favorites / RenterListings tabs. Currently strips onArchive/onUnarchive from JSX per Phase 2 d67401b. Phase 4 re-mounts; planner verifies HospitalitySection prop signatures match PropertyCard's new `onUnarchive` addition.

### Carry-forward locked from Phase 3 (do NOT re-decide)

- Audit collection: `moderationLog` (Phase 3 Plan 01)
- `actorUid` source: JWKS-verified `req.firebaseUid` only (anti-pattern grep gates `actorUid: req.body` / `actorUid: req.headers` MUST return 0)
- `reasonCode` enum: `['incomplete-info', 'prohibited-content', 'out-of-service-area', 'other']` — reuse Phase 3 `VALID_REJECT_CODES` const
- Race-safety primitive: atomic `findOneAndUpdate` with status filter
- Belt-and-suspenders gating: client `<Gated>` + service `canFromUser` + backend `requireMinRole`
- Status default + lifecycle: `'pending'` (new submissions) → `'live'` (mod-approve) | `'rejected'` (mod-reject) → `'pending'` (owner edit-resubmit) | `'archived'` (owner-archive OR mod-archive) → `'pending'` (restore — per ARCH-04)
- Locale parity gate: `scripts/check-i18n-parity.sh` — every new key in both en.ts + ru.ts in the same commit
- `<RejectionBanner>` translation: client-side `t()` per Phase 3 D-09 (owner-locale resolves naturally) — `<ArchiveListingModal>` follows same pattern for chip labels
- `serviceAreas` config: `JayTap-services/src/config/serviceAreas.js` (Phase 3 Plan 01)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project-level requirements & scope

- `.planning/PROJECT.md` — Current Milestone v2.0 M2 "Roles & Moderation"; locked scope; hard rules (no Firebase SDK, MongoDB role authority, no react-navigation); geographic scope (Bishkek/KG launch, Almaty/KZ + Tashkent/UZ planned)
- `.planning/REQUIREMENTS.md` §"Archive (Phase 4) — owner-driven + mod/admin-driven" (lines 65-71) — ARCH-01..ARCH-05 acceptance criteria with verbatim Action union extension list + reasonCode enum reuse from MOD-12
- `.planning/REQUIREMENTS.md` §"Future Requirements (M3+ — deferred)" — bulk multi-select, audit log UI, push notifications, in-app moderation messaging; explicitly out of M2 + Phase 4
- `.planning/ROADMAP.md` §"Phase 4: Archive Lifecycle (Owner + Mod/Admin)" (lines 105-116) — Goal + Depends on (Phase 2 + Phase 3) + Requirements list + 4 Success Criteria

### Prior phase context (carries forward, do NOT re-decide)

- `.planning/phases/01-backend-role-foundation-auth-migration-hotfix-bundle/01-CONTEXT.md` — `requireMinRole` middleware helper; `verifyFirebaseToken` JWKS pattern; `canFromUser` belt-and-suspenders convention
- `.planning/phases/02-listing-lifecycle-status-field-absorption/02-CONTEXT.md` §D-21 — `archivedAt`, `archivedByUid`, `archivedReasonCode` already on Property Mongoose schema; Phase 4 adds `archivedReasonNote` per D-20
- `.planning/phases/02-listing-lifecycle-status-field-absorption/02-CONTEXT.md` §D-22 — `PUT /api/properties/:id` body-status sanitizer (`ALLOWED_OWNER_STATUS_TRANSITIONS = []`); Phase 4 D-01 explicitly preserves this invariant by carving NEW POST routes
- `.planning/phases/02-listing-lifecycle-status-field-absorption/02-CONTEXT.md` §D-08 — Phase 3 owns `/api/moderation/*` from blank slate; Phase 4 EXTENDS `moderationRoutes.js` with 2 new routes per D-02
- `.planning/phases/02-listing-lifecycle-status-field-absorption/02-CONTEXT.md` §"Critical implementation fact" — `RenterListingsScreen.tsx` is the self-listings screen; Phase 4 D-09 / D-11 / D-14 all target `RenterListingsScreen.tsx` (NOT `OwnerListingsScreen.tsx`)
- `.planning/phases/03-moderation-queue-actions-edit-on-behalf/03-CONTEXT.md` §D-10 — `ModerationLog` Mongoose model + action enum; D-05 reservation explicitly mentions Phase 4 archive enum extension; D-18 audit-write pattern (follow-up insert, no transaction)
- `.planning/phases/03-moderation-queue-actions-edit-on-behalf/03-CONTEXT.md` §D-13 — moderation route shape (mod actions in `moderationRoutes.js` with router-level `verifyFirebaseToken + requireMinRole('moderator')` mount)
- `.planning/phases/03-moderation-queue-actions-edit-on-behalf/03-CONTEXT.md` §D-04 — ModerationQueueScreen pending-only filter; D-07 deferred archive-listings discovery to M3+ admin search

### Research outputs (M2)

- `.planning/research/ARCHITECTURE.md` — App.tsx LOC budget (current 1178 LOC after Phase 3); OVERLAY_FLAGS pattern; Phase 4 needs ZERO new OVERLAY_FLAGS entries per D-19
- `.planning/research/PITFALLS.md` — Pitfall 8 (App.tsx god-file) — Phase 4 net-zero target; Pitfall 11 (status enum proliferation) — 4-state enum locked, no new states added
- `.planning/research/FEATURES.md` — Archive lifecycle classified as table-stakes for the M2 differentiator vs Lalafo/HouseKG (owner self-service + mod takedown both required)

### Codebase analysis

- `.planning/codebase/CONVENTIONS.md` — Bilingual EN+RU parity required for every new UI string (CI gate `scripts/check-i18n-parity.sh`); `useTheme()` semantic tokens — no hardcoded colors; manual physical-device QA bar; co-located `src/<subdir>/__tests__/` for unit tests
- `.planning/codebase/STRUCTURE.md` — `src/components/PropertyCard.tsx` (492 LOC; D-11 prop API extension); `src/screens/PropertyDetailsScreen.tsx` (~2122 LOC after Phase 3; D-06 footer extension); `src/screens/RenterListingsScreen.tsx` (~458 LOC after Phase 2; D-09 + D-10 + D-11 + D-14 changes); `src/screens/CreateListingScreen.tsx` (~996 LOC after Phase 3; UNTOUCHED in Phase 4); `App.tsx` (1178 LOC; D-19 net-zero target)
- `.planning/codebase/CONCERNS.md` — High: App.tsx god-file (1178 LOC, 78 over soft cap — every Phase 4 addition must pressure-test against this budget); Critical: Firebase API key hardcoded in source (deferred, NOT Phase 4)

### Backend repo (decision-shaping references)

- `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/models/Property.js` — Phase 2's audit fields already on schema (`approvedAt`, `approvedByUid`, `rejectedAt`, `rejectedByUid`, `rejectionReasonCode`, `rejectionReasonNote`, `archivedAt`, `archivedByUid`, `archivedReasonCode`); Phase 4 adds `archivedReasonNote` per D-20
- `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/routes/propertyRoutes.js` — Phase 4 D-01 adds `POST /:id/archive` + `POST /:id/unarchive`; D-04 tightens `DELETE /:id` middleware to `requireMinRole('admin')`
- `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/routes/moderationRoutes.js` — Phase 4 D-02 adds `POST /properties/:id/archive` + `POST /properties/:id/restore` under existing router-level `verifyFirebaseToken + requireMinRole('moderator')` mount
- `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/models/ModerationLog.js` — Phase 4 D-05 extends `action` enum with `'archive'` + `'unarchive'` + `'hard-delete'`
- `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/middleware/verifyFirebaseToken.js` — Phase 1's JWKS middleware + `requireMinRole('admin'|'moderator')` helper — Phase 4 mounts on `DELETE /:id` (admin) + new owner routes (any-authed) + new moderation routes (moderator)

### Client repo (decision-shaping references)

- `src/hooks/useRole.ts` (lines 14-23 Action union; 75-105 canFromUser switch) — D-16 adds 3 new Action members + 3 new switch cases
- `src/services/PropertyService.ts` (lines 217-264 broken archive stubs; line 266+ deleteProperty) — D-09 + D-10 + D-16 rewrite the 3 archive-related methods + leave deleteProperty path intact (just gate-tightens)
- `src/screens/RenterListingsScreen.tsx` (lines 110-197 archive/delete handlers; ~285+ tab rendering) — D-09 + D-10 + D-11 + D-14 strip owner hard-delete, re-mount onArchive/onUnarchive, update unarchive handler to expect 'pending' (not 'draft')
- `src/screens/PropertyDetailsScreen.tsx` (~2122 LOC after Phase 3) — D-06 extends mod action footer with Archive/Restore (mod/admin) + Hard Delete (admin); D-10 hosts the moved DeletePropertyModal mount
- `src/components/PropertyCard.tsx` (~492 LOC; line 196-253 action button row; line 480 emerald restorative style) — D-11 adds `onUnarchive` prop; existing `onArchive` / `onDelete` / `onEdit` props unchanged in shape
- `src/components/RejectListingModal.tsx` (Phase 3 Plan 04, ~209 LOC) — D-08 source baseline for new ArchiveListingModal fork
- `src/components/ArchiveListingModal.tsx` — NEW FILE per D-08
- `src/components/DeletePropertyModal.tsx` (existing component) — D-10 mount location moves from RenterListingsScreen → PropertyDetailsScreen; component itself unchanged in shape
- `src/screens/HomeScreen.tsx` + `src/screens/FavoritesScreen.tsx` — UNTOUCHED in Phase 4 (archive listings already hidden via Phase 2 D-07 client filter; mod/admin do NOT see archive affordance on these screens since no mod-specific surfaces are added per D-06)
- `src/components/HospitalitySection.tsx` — D-11 verifies onUnarchive prop wiring matches PropertyCard's new addition; otherwise pass-through
- `src/locales/en.ts` + `src/locales/ru.ts` — D-08 adds 4 keys × 2 = 8 strings (`moderation.archive.*`); D-12 rewrites 5 existing key VALUES × 2 locales = 10 strings; D-17 may add 1 key × 2 = 2 strings (archive-race toast); planner picks final count. Estimated total: ~10-12 NEW keys + ~5 VALUE rewrites
- `App.tsx` (1178 LOC) — D-19 net-zero target; no new OVERLAY_FLAGS entries; no new state setters; the entire Phase 4 surface mounts on existing screens

### Auto-memory pointers (cross-session knowledge)

- `~/.claude/projects/-Users-beckmaldinVL-development-mobileApps-JayTap/memory/no-firebase-sdk.md` — REPO RULE: no `firebase` / `@react-native-firebase/*` in RN client; jose for JWKS on backend
- `~/.claude/projects/-Users-beckmaldinVL-development-mobileApps-JayTap/memory/identity-vs-user-store.md` — Firebase = identity proof (uid only); MongoDB = role authority via `userType`. Phase 4 D-01 / D-02 / D-04 all read role via Phase 1 cached `req.user.userType`
- `~/.claude/projects/-Users-beckmaldinVL-development-mobileApps-JayTap/memory/backend-repo-location.md` — Backend at `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services`; same maintainer (no Railway-team coordination overhead)
- `~/.claude/projects/-Users-beckmaldinVL-development-mobileApps-JayTap/memory/geographic-scope.md` — KG/KZ/UZ launch scope; D-02 mod-archive `out-of-service-area` reasonCode reuses Phase 3's `serviceAreas` config (forward-fits to Almaty/Tashkent)
- `~/.claude/projects/-Users-beckmaldinVL-development-mobileApps-JayTap/memory/gsd-verifier-misses-regressions.md` — Verifier + reviewer paired gate; Phase 4's middleware swap on `DELETE /:id` + new race-safe routes are exactly the regression class the verifier missed in Phase 1. Run code review at minimum; supertest for race-condition + middleware-swap strongly recommended (D-19 / D-Claude-Discretion)
- `~/.claude/projects/-Users-beckmaldinVL-development-mobileApps-JayTap/memory/phase45-landlord-application-uid-mismatch-bug.md` — Phase 4.5 had a uid-mismatch bug between submitted apps' uid and submitting Firebase uid. Phase 4's actor-uid (moderationLog `actorUid` field) MUST be derived from JWKS-verified token's `sub` (NOT from request body). Cross-reference Phase 3 D-18 + HF-03 fix from Phase 1

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- **`RejectListingModal`** (`src/components/RejectListingModal.tsx`, Phase 3 Plan 04, ~209 LOC) — D-08 source for `<ArchiveListingModal>` fork. 4-chip + optional note + Submit pattern; planner clones the structure with archive-specific copy + audit verb.
- **`DeletePropertyModal`** (existing component, currently mounted in RenterListingsScreen) — D-10 reuses as-is; only mount location moves to PropertyDetailsScreen with admin gate.
- **PropertyCard action button row** (`src/components/PropertyCard.tsx:196-253`) — already has `onEdit` / `onArchive` / `onDelete` slots wired with conditional rendering by status. D-11 adds `onUnarchive` prop slot; existing JSX pattern absorbs the addition without restructure.
- **Emerald restorative button style** (`src/components/PropertyCard.tsx:480`) — already exists for the archived-state action; D-11 reuses for the Restore affordance.
- **`useRole()` / `<Gated>` / `canFromUser`** (`src/hooks/useRole.ts`) — Phase 1 ROLE-07 cutover; D-16 extends Action union by 3 members.
- **`apiClient.ts`** (Phase 1) — `Authorization: Bearer` auto-attached + 401/403 interceptors. All 4 new Phase 4 endpoints inherit transparently.
- **`ModerationLog` Mongoose model** (Phase 3 Plan 01) — D-05 extends `action` enum.
- **`VALID_REJECT_CODES` const** (Phase 3 Plan 01 backend) — D-02 reuses for mod-archive reasonCode validation (same 4-code enum per ARCH-02).
- **`scripts/check-i18n-parity.sh`** — CI gate; D-08 + D-12 + D-17 locale additions/rewrites land in both en.ts + ru.ts atomically.
- **`handleArchiveProperty` + `handleUnarchiveProperty`** (`src/screens/RenterListingsScreen.tsx:141-197`) — already implemented Alert.alert flows; Phase 4 just rewires their PropertyService calls + flips `'draft'` → `'pending'` in unarchive (currently still passes `'draft'` per the legacy stub).
- **PropertyDetailsScreen mod action footer** (`src/screens/PropertyDetailsScreen.tsx:1316-1372` + 2106-2107 styles) — Phase 3 Plan 06 mounted Approve/Reject/Edit-on-behalf; D-06 extends with Archive/Restore + Hard Delete.

### Established Patterns

- **`useTheme()` semantic tokens** — modal accents, button colors, banner backgrounds derive from theme palette. No hardcoded colors. D-Claude-Discretion items inherit.
- **Belt-and-suspenders defense in depth** — Phase 1 D-08 + Phase 2 D-02/D-07 + Phase 3 service-layer canFromUser. Phase 4 mirrors: client `<Gated>` hides UI; service `canFromUser` throws PermissionDeniedError; backend `requireMinRole` rejects requests.
- **Audit-field "additive only" schema discipline** — Phase 1 D-04 / Phase 2 D-21 / Phase 4.5 / Phase 3 D-10 all added Mongo fields without breaking existing reads. D-20 adds `archivedReasonNote` additively.
- **OVERLAY_FLAGS derived-overlay pattern** — Phase 4 adds ZERO new entries (D-19 net-zero target on App.tsx).
- **Atomic `findOneAndUpdate` race-safety** — Phase 3 MOD-15 set the precedent. Every Phase 4 status-changing route uses the same pattern with status filter.
- **Anti-pattern grep gates on `actorUid`** — Phase 3 Plan 05 set `actorUid: req.body` / `actorUid: req.headers` as MUST return 0 in moderation/property routes. Phase 4 inherits.
- **Server-resolved role check via `requireMinRole`** (Phase 1 ROLE-04) — every Phase 4 mod/admin route mounts under `verifyFirebaseToken` + `requireMinRole(<role>)`.
- **EN+RU parity CI gate** (`scripts/check-i18n-parity.sh`) — every new key + every value-rewrite in same commit, both locales.
- **Locale key VALUE rewrite pattern (no key rename)** — preserves call-site stability; D-12 rewrites 5 key values without renaming the keys themselves.

### Integration Points

- **Backend `propertyRoutes.js`** — D-01 (2 new POST routes) + D-04 (DELETE middleware swap). Single file holds 3 changes.
- **Backend `moderationRoutes.js`** — D-02 (2 new POST routes). All inherit existing router-level mounts.
- **Backend `Property.js`** — D-20 adds `archivedReasonNote: { type: String, default: null }` (single-line additive change).
- **Backend `ModerationLog.js`** — D-05 enum extension (single-line additive change).
- **Client `useRole.ts`** — D-16 Action union + canFromUser switch (3 new Action members + 3 new cases).
- **Client `PropertyService.ts`** — Rewrite broken `archiveProperty` / `unarchiveProperty`; rename to `archiveOwnListing` / `restoreListing` per D-Claude-Discretion + Action union mapping; ADD `archiveAnyListing(id, reasonCode, reasonNote?)` + `hardDeleteListing(id)`. The existing `deleteProperty` may be deprecated in favor of `hardDeleteListing` (or kept as alias — planner discretion).
- **Client `RenterListingsScreen.tsx`** — D-09 (rewire archive handler service call) + D-10 (strip hard-delete handler + modal mount) + D-11 (re-mount onArchive/onUnarchive props on PropertyCard + HospitalitySection) + locale call-site updates per D-12 (no key renames; just `t()` calls inherit new VALUES). Net LOC: small (-30 from delete strip + 0 from archive rewire).
- **Client `PropertyDetailsScreen.tsx`** — D-06 footer extension (Archive button gated on `archiveAnyListing` + `status !== 'archived'`; Restore button gated on `archiveAnyListing` + `status === 'archived'`; Hard Delete button gated on `hardDeleteListing`); D-10 hosts the moved DeletePropertyModal mount; render conditions for the existing 3-button mod row stay (status === 'pending'). Net LOC: +50-80 estimated.
- **Client `PropertyCard.tsx`** — D-11 adds `onUnarchive?: (property: Property) => void` prop + JSX condition `{isArchived && onUnarchive && (<TouchableOpacity ...>)}` next to existing isArchived branch. Net LOC: +15.
- **Client `ArchiveListingModal.tsx`** (new file) — D-08 fork of RejectListingModal. Net: +200 LOC new file.
- **Client `App.tsx`** — D-19 ZERO net LOC. Phase 4 surfaces all mount on existing screens; no new overlays, no new state.
- **Client locales** — D-08 (8 new strings) + D-12 (10 strings rewritten in place) + D-17 optional (2 new strings); CI parity gate enforces.

</code_context>

<specifics>
## Specific Ideas

- **`<ArchiveListingModal>` copy** (D-08): EN `moderation.archive.modalTitle` "Archive Listing" / RU «Архивировать объявление»; EN `moderation.archive.submit` "Archive" / RU «В архив». Reuses Phase 3 chip labels via `t(\`moderation.reject.reason.${code}\`)` (no duplicate enum strings).
- **Restore confirm copy rewrite** (D-12): Existing `property.unarchiveDialogMessage` rewrites to EN "Restore this listing? It will go back to the moderation queue for review before becoming public again." / RU «Восстановить это объявление? Оно вернётся в очередь модерации для проверки перед публикацией.» The toast message rewrites to EN "It will appear publicly once a moderator approves it." / RU «Оно появится публично после одобрения модератором.»
- **Owner archive Alert.alert copy** (D-09): Existing `property.archiveDialogMessage` already correct ("Archive this listing? It will be hidden from search but stays in your library, and you can restore it any time.") — preserved unchanged. Owner archive button label already correct (`property.archive` "Archive" / «В архив»).
- **Hard-delete admin warning copy** (D-10): Augment existing `property.deleteDialogMessage` with a 1-line "audit log" warning. Recommend: prepend EN "PERMANENT — this action will be recorded in the audit log. " / RU «БЕЗВОЗВРАТНО — это действие будет записано в журнал аудита. » Planner picks final wording.
- **Action union exact additions** (D-16): `'archiveOwnListing'`, `'archiveAnyListing'`, `'hardDeleteListing'` (verbatim ARCH-05). NO `'restoreOwnListing'` / `'restoreAnyListing'` (piggyback on archive Actions).
- **`canFromUser` switch cases** (D-16): `archiveOwnListing` → `role !== 'guest' && !!user?.backendProfile`; `archiveAnyListing` → `role === 'moderator' || role === 'admin'`; `hardDeleteListing` → `role === 'admin'`.
- **Owner-restore backend gate** (D-13): `req.user.uid === property.ownerUid AND property.archivedByUid === property.ownerUid`. Otherwise 403.
- **`ModerationLog` action enum final shape** (D-05): `['approve', 'reject', 'edit-on-behalf', 'archive', 'unarchive', 'hard-delete']`.
- **Audit-field clears on restore** (D-15): clear `archivedAt`, `archivedByUid`, `archivedReasonCode`, `archivedReasonNote`; PRESERVE `approvedAt`, `approvedByUid`, `rejectedAt`, `rejectedByUid`, `rejectionReasonCode`, `rejectionReasonNote`. RE-STAMP `submittedAt = new Date()` (FIFO re-queue).
- **PropertyService method names** (D-Claude-Discretion): `archiveOwnListing(id)`, `archiveAnyListing(id, reasonCode, reasonNote?)`, `restoreListing(id)`, `hardDeleteListing(id)`. Drop or alias broken `archiveProperty` / `unarchiveProperty` / `deleteProperty`.
- **App.tsx LOC budget** (D-19): 1178 → 1178 (zero change). Planner verifies during plan-phase; signal-not-block per Phase 2 PATTERN D if drift sneaks in.
- **`archivedReasonNote` schema field** (D-20): `archivedReasonNote: { type: String, default: null }` added to `Property.js` Mongoose schema additively.

</specifics>

<deferred>
## Deferred Ideas

- **Mod-side discovery of archived listings** (D-07) — M3+ admin search/find-any-listing surface. M2 mods reach archived listings via existing deep-link paths only. ARCH-03 "visible to mods/admins via the moderation surface" is satisfied by the PropertyDetailsScreen footer — discoverability is a separate concern.
- **Mod-restore-direct-to-live shortcut** — Explicitly rejected. Preserves ARCH-04's "transitions to pending" invariant verbatim.
- **Owner self-service hard-delete / "request deletion" workflow** (D-14) — M3+ if user demand surfaces. Owners stay-archived-forever in M2.
- **ModerationQueueScreen status filter chips / additional tabs** — Out of M2 scope (D-06). Queue mental model stays "work that needs my attention" = pending-only per Phase 3 D-04.
- **Separate ModeratedListingsScreen overlay** — Out of M2 scope (would add OVERLAY_FLAGS entry, screen file, Profile entry-point row, App.tsx pressure).
- **Email / push / in-app message notifications on archive / restore** — REQUIREMENTS.md Future §; M2 in-app banner sufficient.
- **Bulk multi-select archive actions** — REQUIREMENTS.md Future §.
- **Lease-based pessimistic locking on archive transitions** — Optimistic 409 (D-17) suffices at small mod team scale.
- **In-app moderation messaging thread (mod ↔ owner about an archive decision)** — REQUIREMENTS.md Future §.
- **DangerConfirmModal with type-listing-id-to-confirm** — Over-engineered for M2; existing single-confirm + audit-log warning copy (D-10) is sufficient at small admin team scale.
- **`<RejectListingModal>` parametrization with action='reject'|'archive' prop** — Rejected in favor of D-08 fork; preserves single-purpose copy/identity.
- **Generic `<ReasonCodeModal>` primitive + thin wrappers** — Premature abstraction (would refactor shipped Phase 3 RejectListingModal for one new call site).
- **Custom BottomSheet for owner archive confirm** — Rejected in favor of D-09 Alert.alert (Phase 3 D-05 precedent).
- **PropertyCard auto-derives actions from useRole() internally** — Rejected (breaks "components are presentational" convention; couples context).
- **PropertyCard 'actions' prop array refactor** — Rejected (larger blast radius than this phase needs).
- **Restore-with-status-choice modal (live or pending)** — Rejected; preserves ARCH-04 invariant; no mod foot-gun risk.
- **`restoreOwnListing` / `restoreAnyListing` separate Action members** — Rejected; piggyback on archive Actions per D-16 (ARCH-04 verbatim "available to whoever has rights to archive").
- **M3+ moderation log audit screen** — `moderationLog` is append-only and forward-fits a UI. No M2 UI; Phase 4's archive/unarchive/hard-delete entries forward-fit naturally.
- **Crash reporting** (CONCERNS.md) — Out of M2 scope.

</deferred>

---

*Phase: 04-archive-lifecycle-owner-mod-admin*
*Context gathered: 2026-05-02*

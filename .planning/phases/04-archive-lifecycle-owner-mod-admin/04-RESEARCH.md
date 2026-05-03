# Phase 4: Archive Lifecycle (Owner + Mod/Admin) — Research

**Researched:** 2026-05-02
**Domain:** RN 0.84 (New Arch) client + Express/Mongoose backend — listing-lifecycle archive + restore + admin-only hard-delete
**Confidence:** HIGH (CONTEXT.md is locked with 20 D-XX decisions; this research surfaces the existing-code analogs the planner mirrors)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Backend route shape & API surface**
- **D-01** Owner-archive + owner-unarchive as new dedicated POST routes in `propertyRoutes.js` (`POST /api/properties/:id/archive` + `POST /api/properties/:id/unarchive`). Owner-archive does NOT extend `PUT /api/properties/:id` with a status whitelist (preserves Phase 2 D-22 sanitizer). Race-safe `findOneAndUpdate({_id, ownerUid: req.user.uid, status: {$ne: 'archived'}}, {$set: {status: 'archived', archivedAt, archivedByUid: req.user.uid, archivedReasonCode: null}})`. Returns 200 / 403 (not owner) / 404 / 409 (already archived). Audit row with `action: 'archive'`, `reasonCode: null`, `reasonNote: null`.
- **D-02** Mod/admin archive + restore endpoints in `moderationRoutes.js` (`POST /api/moderation/properties/:id/archive` body `{reasonCode, reasonNote?}` + `POST /api/moderation/properties/:id/restore`). Inherit existing router-level `verifyFirebaseToken + requireMinRole('moderator')` mount at `moderationRoutes.js:50`. Reuse Phase 3's `VALID_REJECT_CODES = ['incomplete-info', 'prohibited-content', 'out-of-service-area', 'other']` const for body validation.
- **D-03** Restore endpoints transition `'archived' → 'pending'` (NOT prior status, per ARCH-04 verbatim). Re-stamp `submittedAt = new Date()` for FIFO re-queue. Clear archive metadata fields. PRESERVE `approvedAt/By` + `rejectedAt/By/ReasonCode/ReasonNote`. Owner-restore allowed only when `archivedByUid === ownerUid` (D-13).
- **D-04** Hard-delete stays at `DELETE /api/properties/:id` — middleware swap to `verifyFirebaseToken + requireMinRole('admin')`. Audit row `action: 'hard-delete'`, `before: full Property snapshot via .lean()`, `after: null`.
- **D-05** `ModerationLog.action` enum extends to `['approve', 'reject', 'edit-on-behalf', 'archive', 'unarchive', 'hard-delete']`.

**Mod/admin archive surface — discoverability**
- **D-06** PropertyDetailsScreen footer is the single mod/admin archive surface. Extends Phase 3's existing 3-button footer with: Archive (when `can('archiveAnyListing') && status !== 'archived'`), Restore (when `can('archiveAnyListing') && status === 'archived'`), Hard Delete (when `can('hardDeleteListing')`). Pending listings render BOTH the existing 3-button moderation row AND the Archive button.
- **D-07** Mod/admin discovery of archived listings deferred to M3+ (no ModerationQueueScreen status-filter chips, no ModeratedListingsScreen). Mods reach archived listings via existing deep-link surfaces only.

**UI primitives & destructive UX**
- **D-08** New `<ArchiveListingModal>` forked from `RejectListingModal.tsx` (NOT parametrized into a generic primitive). 4-chip + optional note + Submit, with archive-specific copy (`moderation.archive.modalTitle` / `.submit`) and audit-action verb `'archive'`. Adds 4 keys × 2 locales = 8 strings.
- **D-09** Owner archive UX keeps the existing `Alert.alert` flow at `RenterListingsScreen.tsx:141-167` (no-reason confirm). Phase 4 rewires PropertyService call from broken `archiveProperty` → `archiveOwnListing`. Re-mounts `onArchive` prop on PropertyCard + HospitalitySection (Phase 2 stripped per D-08; Phase 4 re-mounts).
- **D-10** Admin hard-delete reuses existing `DeletePropertyModal`. STRIP from RenterListingsScreen entirely (owners no longer hard-delete); MOUNT in PropertyDetailsScreen as `<Gated action="hardDeleteListing">` with admin-context warning prepended. Toast: existing `t('property.permanentlyDeletedToast')`.
- **D-11** PropertyCard adds `onUnarchive?: (property: Property) => void` prop (already present in source — see Open Questions). For statuses live/pending/rejected: `onArchive` + `onEdit` (no `onDelete`). For status archived: `onUnarchive` only (read-only-until-restored; no `onDelete`).

**Restore semantics & user-facing copy**
- **D-12** Locale-key VALUE rewrites (preserve key NAMES — no rename cascade): `property.unarchiveDialogTitle`, `property.unarchiveDialogMessage`, `property.unarchiveConfirm`, `property.unarchivedToastTitle`, `property.unarchivedToastMessage`. EN: "Restore this listing? It will go back to the moderation queue for review before becoming public again." / "It will appear publicly once a moderator approves it." 5 keys × 2 locales = 10 strings rewritten.
- **D-13** Owner-restore backend gate: `req.user.uid === property.ownerUid AND property.archivedByUid === property.ownerUid`. Mod-archived listings can only be restored by mod/admin (prevents post-takedown bypass). Client gating: `<PropertyCard onUnarchive={canSelfRestore ? handleUnarchive : undefined}>` where `canSelfRestore = property.archivedByUid === user.localId`.
- **D-14** No owner permanent-delete escape hatch in M2; owners stay-archived-forever. Strip `handleDeleteProperty` + `DeletePropertyModal` mount from RenterListingsScreen entirely.
- **D-15** On restore, clear: `archivedAt`, `archivedByUid`, `archivedReasonCode`, `archivedReasonNote`. PRESERVE: `approvedAt/By`, `rejectedAt/By`, `rejectionReasonCode`, `rejectionReasonNote`. RE-STAMP `submittedAt = new Date()`.

**Action union extension & permissions**
- **D-16** `useRole.ts` adds 3 Action members per ARCH-05: `'archiveOwnListing'` (any authenticated user with backendProfile), `'archiveAnyListing'` (moderator + admin), `'hardDeleteListing'` (admin only). Restore piggybacks on archive Actions (no separate `restoreOwnListing` / `restoreAnyListing`). Belt-and-suspenders: `canFromUser` at service layer; backend `requireMinRole` is authoritative.

**Race-safety, audit invariants, forward-compat constraints**
- **D-17** Atomic `findOneAndUpdate({_id, status: <expected>, ...filter}, {$set: ...})` race-safety on every status-changing route. 409 with `code: 'ALREADY_ARCHIVED'` / `'ALREADY_RESTORED'` / `'NOT_FOUND_OR_FORBIDDEN'` (planner picks; recommend reusing Phase 3 `'ALREADY_MODERATED'` shape for symmetry).
- **D-18** Audit-row write pattern: follow-up `ModerationLog.create(...)` after the status change succeeds, wrapped in try/catch with structured `'moderation_audit_orphan'` log on failure (Phase 3 D-10 + PATTERNS §G). For hard-delete: capture `before: Property.findById(id).lean()` BEFORE `findOneAndDelete`; `after: null`.
- **D-19** App.tsx LOC budget — net-zero target (currently **1191 LOC** per `wc -l`, drift +13 from CONTEXT.md's stated 1178). All Phase 4 surfaces mount on existing screens; NO new OVERLAY_FLAGS entries. M3 remediation candidates (extract `<ModerationQueueOverlayHost>`, `useModerationQueueCount()` hook) inherited from Phase 3 SUMMARY.
- **D-20** Forward-compat: add `archivedReasonNote: { type: String, default: null }` to `Property.js` schema (additive, null-default, no migration). NB: CONTEXT.md states `archivedReasonCode` is already on the schema per Phase 2 D-21 — **codebase tension**: only `archivedAt` + `archivedByUid` are present; `archivedReasonCode` must also be added in Phase 4 (see Open Questions).

### Claude's Discretion

- **Archive Modal visual treatment** — chip styling, modal positioning, animation. Use Phase 3's `RejectListingModal` as visual baseline.
- **Hard-delete confirm copy intensity** — recommend adding "audit log will record this" warning. Planner picks final phrasing.
- **409 toast copy for archive races** — reuse Phase 3 `moderation.race.toast` OR add archive-specific copy.
- **PropertyService method signatures** — recommended: `archiveOwnListing(id)`, `archiveAnyListing(id, reasonCode, reasonNote?)`, `restoreListing(id)` (single method routing by caller role to separate URLs internally), `hardDeleteListing(id)`. Drop or alias broken `archiveProperty` / `unarchiveProperty` / `deleteProperty`.
- **Backend test coverage** — recommend 10-15 supertest cases (race + audit + role + reasonCode + before-snapshot). Planner discretion on exact set.
- **HospitalitySection prop wiring on `onUnarchive`** — verify HospitalitySection's prop signature matches PropertyCard's existing `onUnarchive` after re-mount.

### Deferred Ideas (OUT OF SCOPE)

- Mod-side discovery of archived listings (admin search) — M3+
- Mod-restore-direct-to-live shortcut — explicitly rejected
- Owner self-service hard-delete / "request deletion" — M3+
- ModerationQueueScreen status-filter chips / additional tabs
- ModeratedListingsScreen overlay
- Email/push/in-app notifications on archive/restore
- Bulk multi-select archive actions
- Lease-based pessimistic locking
- In-app moderation messaging thread
- DangerConfirmModal with type-listing-id-to-confirm
- `<RejectListingModal>` parametrized with `action='reject'|'archive'` prop (rejected in favor of D-08 fork)
- Generic `<ReasonCodeModal>` primitive (premature abstraction)
- Custom BottomSheet for owner archive confirm
- PropertyCard auto-derives actions from `useRole()` internally
- PropertyCard `actions` prop array refactor
- Restore-with-status-choice modal (live or pending)
- Separate `restoreOwnListing` / `restoreAnyListing` Action members
- M3+ moderation log audit screen UI

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ARCH-01 | Owner archives own listing from PropertyCard menu + PropertyDetailsScreen action footer; status → `archived`; no reason required; `archivedReasonCode: null` | Owner-archive route D-01; existing `handleArchiveProperty` Alert.alert at `RenterListingsScreen.tsx:141-167` rewires service call; PropertyCard `onArchive` prop already wired at lines 222-232 (just re-mount in RenterListingsScreen); PropertyDetailsScreen extends Phase 3 footer (lines 1316-1376) with new Archive button gated on `archiveOwnListing` + `status !== 'archived'` |
| ARCH-02 | Mod/admin archives any listing from Moderation Queue OR PropertyDetailsScreen; gated by `<Gated action="archiveAnyListing">`; requires `reasonCode` (same 4-enum as MOD-12) + optional `reasonNote`; audit-row written | Mod-archive route D-02; new `<ArchiveListingModal>` D-08 forked from `RejectListingModal.tsx:1-209`; `VALID_REJECT_CODES` already exported from `moderationRoutes.js:54` (reuse for `out-of-service-area`); ModerationLog.action enum extension D-05; ModerationQueue surface explicitly out of scope per D-06/D-07 — PropertyDetailsScreen footer is the only mod-archive entry |
| ARCH-03 | Archived listings hidden from public list views (Home / Favorites / RenterListings public lanes) AND PropertyDetailsScreen for non-owners-non-mods; visible to owner (Archived tab) + mods/admins (deep-link only) | Phase 2 D-07 client-filter `(p.status ?? 'live') === 'live'` already present at `HomeScreen.tsx:122,138` + `FavoritesScreen.tsx:63` (drops archived as side-effect since archived !== live); RenterListingsScreen has Archived tab at line 230; PropertyDetailsScreen role-aware `GET /api/properties/:id` 404 guard already at `propertyRoutes.js:295-308` (Phase 2 D-06) — ALREADY satisfies the non-owner-non-mod hide requirement; Phase 4 verifies no regression |
| ARCH-04 | Restore transitions `archived → pending` (NOT prior status); restoration available to whoever can archive (owner for self-archived; mod/admin for any) | Restore endpoints D-03 + audit-field clear D-15; owner-restore gate D-13 `archivedByUid === ownerUid`; mod-restore unconditional; `submittedAt` re-stamped for FIFO re-queue (mirrors Phase 2 D-22 rejected→pending edit-resubmit pattern); status filter `status: 'archived'` is the lock primitive on `findOneAndUpdate` |
| ARCH-05 | `DELETE /api/properties/:id` admin-only; `<Gated action="hardDeleteListing">`; `useRole.ts` Action union extends with `archiveOwnListing` + `archiveAnyListing` + `hardDeleteListing` | Existing route at `propertyRoutes.js:545-578` ALREADY enforces `HARD_DELETE_REQUIRES_ARCHIVED` precondition (must be `status === 'archived'` before hard delete); Phase 4 only swaps the auth gate from `verifyFirebaseToken + ownership-check` to `verifyFirebaseToken + requireMinRole('admin')`; useRole.ts Action union currently has 9 members (line 14-23) — Phase 4 adds 3 new cases to the canFromUser switch (lines 75-98) |

</phase_requirements>

## Project Constraints (from CLAUDE.md)

The following directives are mandatory and treated with the same authority as locked CONTEXT.md decisions:

- **No Firebase SDK in client repo** (`firebase`, `@react-native-firebase/*`) — REPO RULE per memory `no-firebase-sdk.md`. Phase 4 backend uses `jose` for JWKS (already in place).
- **No `react-navigation`** — custom `App.tsx` state machine stays. Phase 4 mounts on existing screens; **no new OVERLAY_FLAGS entries** (D-19).
- **MongoDB `userType` is the role authority** (NOT Firebase custom claims). Phase 4 backend reads role via cached `req.user.userType` from `verifyFirebaseToken` middleware.
- **EN+RU bilingual parity** required for every new UI string. CI gate: `bash scripts/check-i18n-parity.sh`. Phase 4 expected delta: ~8 new keys (`moderation.archive.*`) + ~10 VALUE-rewrites (preserves key names) + 0-2 race-toast keys.
- **`useTheme()` semantic tokens** — no hardcoded colors. Phase 4's new modal + footer buttons must derive colors from the theme palette (`colors.primary`, `colors.error`, `colors.warning`, `colors.surface`, etc.).
- **Manual physical-device QA bar** — iPhone 15 Pro Max + Moto G XT2513V coverage required for any UI surface. Per `gsd-verifier-misses-regressions.md`, run `/gsd-code-review` paired with `/gsd-verify-work`.
- **`actorUid` MUST come from JWKS-verified `req.firebaseUid`** — never from request body or headers. Phase 3 established anti-pattern grep gates `actorUid: req.body` and `actorUid: req.headers` MUST return 0 in `moderationRoutes.js` and `propertyRoutes.js`. Phase 4 inherits.

## Summary

Phase 4 is a **mostly additive** lift on top of Phase 2 (status field + audit fields) and Phase 3 (mod-route patterns + audit collection). The locked CONTEXT.md leaves very little to design; the planner's job is to mirror existing patterns into 5-7 task-sized chunks across two repos. Key takeaways:

1. **Phase 3's `moderationRoutes.js` is the canonical analog for D-02 and D-04** — race-safe atomic `findOneAndUpdate({_id, status: '<expected>'}, {$set})`, follow-up `ModerationLog.create(...)` wrapped in try/catch with `'moderation_audit_orphan'` structured log on failure, `actorUid: req.firebaseUid` (NEVER body), router-level `verifyFirebaseToken + requireMinRole('moderator')` mount inheritance. Phase 4 mod-routes (D-02) drop in next to the existing approve/reject/edit-on-behalf handlers verbatim.

2. **Owner-archive routes (D-01) are NEW territory in `propertyRoutes.js`** — no other endpoint there does atomic state-flip with audit-row write. Planner authors a fresh handler pair (`POST /:id/archive` + `POST /:id/unarchive`) following the moderationRoutes structure. The existing `DELETE /:id` at lines 545-578 is the cleanest local reference — same `findById`-then-act shape, just race-unsafe today (Phase 4's owner-archive will be race-safe from day one).

3. **`<ArchiveListingModal>` is a near-verbatim fork of `RejectListingModal.tsx`** (208 LOC, presentational, no service calls, parent-owns-HTTP). Diff is purely copy + audit verb: `t('moderation.archive.modalTitle')` instead of `t('moderation.reject.modalTitle')`, `t('moderation.archive.submit')` button label, audit-action verb `'archive'` in the parent's `onSubmit` handler. The 4 chip labels reuse Phase 3's existing `t('moderation.reject.reason.${code}')` keys (no enum string duplication per CONTEXT.md `<specifics>`).

4. **`useRole.ts` extension is a 3-line case-block addition** (lines 75-98 switch). The Action union at line 14-23 grows by 3 entries (`archiveOwnListing`, `archiveAnyListing`, `hardDeleteListing`). No tests in `useRole.test.ts` need to change shape — just add coverage rows.

5. **Critical codebase tensions vs CONTEXT.md** (see Open Questions): (a) `archivedReasonCode` is NOT yet on the Property schema despite CONTEXT.md D-20 claiming Phase 2 D-21 added it — Phase 4 must add BOTH `archivedReasonCode` AND `archivedReasonNote`; (b) PropertyCard already has `onArchive`/`onUnarchive` props fully wired in source (lines 32-33 + 222-243) — D-11's framing as "ADDS onUnarchive" is misleading; the prop is present, just unused since Phase 2 D-08 stripped the parent-side mount; (c) App.tsx is currently 1191 LOC (not 1178 per CONTEXT.md), already 11 over D-19's claimed baseline; (d) `RejectListingModal.tsx` is 208 LOC (not 209 per CONTEXT.md); (e) `PropertyDetailsScreen.tsx` is 2131 LOC (not 2122). None of these are blockers — they just nudge the planner toward "lock this baseline at plan time" rather than relying on stale numbers.

**Primary recommendation:** Plan Phase 4 as ~6-7 plans across 4 waves: Wave-1 (additive backend foundations: schema field + ModerationLog enum), Wave-2 (4 backend routes + middleware swap on DELETE + supertest harness), Wave-3 (client foundations: `useRole.ts` extension + PropertyService rewrite + ArchiveListingModal + locale rewrites), Wave-4 (PropertyDetailsScreen footer extension + RenterListingsScreen handler rewires + DeletePropertyModal mount move + manual physical-device smoke checkpoint).

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Atomic status-flip race-safety on archive/restore/hard-delete | API / Backend | — | Optimistic concurrency on Mongo `findOneAndUpdate` is the only authoritative gate; client cannot enforce. |
| Permission gate (who can archive whom) | API / Backend | Frontend (UX hint) | `requireMinRole('moderator'|'admin')` + per-route ownership checks (D-13 owner-restore gate) are the security boundary; client `<Gated>` is UX-only. |
| Audit trail (`ModerationLog` rows for archive/unarchive/hard-delete) | Database | API (write path) | Append-only collection lives in Mongo; route handlers write the rows from JWKS-verified `req.firebaseUid`. |
| ReasonCode validation (mod-archive only — owner-archive has no code) | API / Backend | Frontend (chip selection UX) | Backend `VALID_REJECT_CODES` allowlist is authoritative; client chip selector constrains user choice but server is final word. |
| Locale rewrites (D-12 5 keys × 2 locales) | Frontend (Client) | — | Pure client-side i18n value rewrite; backend never sees user-facing copy. |
| Hide archived listings from public list views | API / Backend (`status: 'live'` filter) | Frontend (defensive `?? 'live'` re-filter per D-07) | Server-side `propertyRoutes.js:43-52` already filters `status: 'live'` for public GET; client mirrors at HomeScreen / FavoritesScreen / RenterListings public lanes. |
| Hard-delete pre-condition (must be archived first) | API / Backend | — | Existing `HARD_DELETE_REQUIRES_ARCHIVED` precondition at `propertyRoutes.js:559-568` already enforces; Phase 4 only swaps the auth gate. |
| Modal UI (`<ArchiveListingModal>`) | Frontend (Client) | — | Pure RN presentational component; no service calls, parent-owns-HTTP per `RejectListingModal` pattern. |
| Owner archive Alert.alert confirm | Frontend (Client) | — | RN native primitive; copy from `t()`. |

## Backend route patterns

### Phase 3's `moderationRoutes.js` is the canonical mirror for D-02 + D-04

The new mod/admin archive + restore routes (`POST /api/moderation/properties/:id/archive` + `POST /api/moderation/properties/:id/restore`) inherit the existing router-level mount at `moderationRoutes.js:50`:

```javascript
// /Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/routes/moderationRoutes.js:46-50
// Belt-and-suspenders role gating per PATTERNS.md §A:
// - Server-side `requireMinRole('moderator')` is the security boundary (returns 403 with code: 'insufficient-role' on user role).
// - Client-side `<Gated action="viewModerationQueue">` is a UX layer hiding the entry-point.
// Mounting at the router level means every endpoint below inherits both middlewares — no per-route repetition.
router.use(verifyFirebaseToken, requireMinRole('moderator'));
```

Phase 4 mod-archive handler (drop-in, mirrors `POST /properties/:id/reject` at lines 143-206):

```javascript
// EXACT SHAPE TO MIRROR — adapt from moderationRoutes.js:143-206 (POST /properties/:id/reject)
router.post('/properties/:id/archive', async (req, res) => {
  try {
    const { reasonCode, reasonNote } = req.body;
    if (!reasonCode || !VALID_REJECT_CODES.includes(reasonCode)) {
      return res.status(400).json({
        message: `reasonCode must be one of ${VALID_REJECT_CODES.join(', ')}`,
      });
    }
    const now = new Date();
    const trimmedNote = (typeof reasonNote === 'string' && reasonNote.trim()) ? reasonNote.trim() : null;

    // Race-safe atomic state flip — same primitive as approve/reject.
    const result = await Property.findOneAndUpdate(
      { _id: req.params.id, status: { $ne: 'archived' } },
      { $set: {
          status: 'archived',
          archivedAt: now,
          archivedByUid: req.firebaseUid,
          archivedReasonCode: reasonCode,
          archivedReasonNote: trimmedNote,
        } },
      { new: true }
    );

    if (!result) {
      return res.status(409).json({
        code: 'ALREADY_ARCHIVED', // or 'ALREADY_MODERATED' for symmetry per D-17 planner discretion
        message: 'This listing was already archived.',
      });
    }

    try {
      await ModerationLog.create({
        actorUid: req.firebaseUid, // PATTERNS §D — JWKS-verified token sub, NEVER body
        action: 'archive',
        targetType: 'property',
        targetId: result._id,
        before: { status: req.body._previousStatus || 'unknown' }, // or omit; D-18 says diff
        after: { status: 'archived', archivedReasonCode: reasonCode },
        reasonCode,
        reasonNote: trimmedNote,
        at: now,
      });
    } catch (auditErr) {
      console.error(JSON.stringify({
        evt: 'moderation_audit_orphan',
        action: 'archive',
        targetId: String(result._id),
        actorUid: req.firebaseUid,
        err: auditErr.message,
        ts: new Date().toISOString(),
      }));
    }

    return res.json(result);
  } catch (err) {
    console.error('Error archiving listing:', err);
    return res.status(500).json({ message: err.message });
  }
});
```

The mod-restore handler is structurally identical (status filter `status: 'archived'`, target status `'pending'`, clears archive fields per D-15, re-stamps `submittedAt`, audit `action: 'unarchive'`). Both inherit role-gating from the router-level `router.use(verifyFirebaseToken, requireMinRole('moderator'))`.

### Owner-archive routes (D-01) — `propertyRoutes.js` analogs

The owner-archive + owner-unarchive endpoints land in `propertyRoutes.js`. The closest local pattern is the existing `DELETE /:id` handler:

```javascript
// /Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/routes/propertyRoutes.js:543-578
router.delete('/:id', verifyFirebaseToken, async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) return res.status(404).json({ message: 'Property not found' });

    // Verify ownership
    if (property.ownerUid !== req.firebaseUid) {
      return res.status(403).json({ message: 'Access denied. You can only delete your own listings.' });
    }

    // Soft-delete guard: live (and legacy untyped) listings must be archived before permanent deletion.
    const status = property.status;
    const isHardDeletable = status === 'archived';
    if (!isHardDeletable) {
      return res.status(400).json({
        message: 'Listing must be archived before permanent deletion.',
        code: 'HARD_DELETE_REQUIRES_ARCHIVED',
      });
    }

    await Property.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Property deleted successfully' });
  } catch (error) {
    console.error('Error deleting property:', error);
    res.status(500).json({ message: error.message });
  }
});
```

**For Phase 4 owner-archive, the planner adapts this pattern with race-safety**:

```javascript
// EXACT SHAPE TO WRITE for owner-archive — mirrors moderationRoutes.js race-safety
router.post('/:id/archive', verifyFirebaseToken, async (req, res) => {
  try {
    const now = new Date();
    const result = await Property.findOneAndUpdate(
      { _id: req.params.id, ownerUid: req.firebaseUid, status: { $ne: 'archived' } },
      { $set: {
          status: 'archived',
          archivedAt: now,
          archivedByUid: req.firebaseUid,
          archivedReasonCode: null,
          archivedReasonNote: null,
        } },
      { new: true }
    );

    if (!result) {
      // Distinguish between (a) not-found, (b) not-owner, (c) already-archived.
      // Recommended: do a follow-up read to disambiguate response codes
      // (403 vs 404 vs 409) per D-01's enumeration.
      const property = await Property.findById(req.params.id);
      if (!property) return res.status(404).json({ message: 'Property not found' });
      if (property.ownerUid !== req.firebaseUid) return res.status(403).json({ message: 'Access denied. You can only archive your own listings.' });
      return res.status(409).json({ code: 'ALREADY_ARCHIVED', message: 'This listing is already archived.' });
    }

    try {
      await ModerationLog.create({
        actorUid: req.firebaseUid, // JWKS-verified token sub
        action: 'archive',
        targetType: 'property',
        targetId: result._id,
        before: {}, // owner-archive doesn't capture pre-status by D-18 standard; planner discretion
        after: { status: 'archived' },
        reasonCode: null,
        reasonNote: null,
        at: now,
      });
    } catch (auditErr) {
      console.error(JSON.stringify({
        evt: 'moderation_audit_orphan',
        action: 'archive',
        targetId: String(result._id),
        actorUid: req.firebaseUid,
        err: auditErr.message,
        ts: new Date().toISOString(),
      }));
    }

    return res.json(result);
  } catch (err) {
    console.error('Error owner-archiving listing:', err);
    return res.status(500).json({ message: err.message });
  }
});
```

### Hard-delete middleware swap (D-04)

Existing route at `propertyRoutes.js:545`:
```javascript
router.delete('/:id', verifyFirebaseToken, async (req, res) => {
```

Phase 4 swap (one-line middleware change + audit-row addition):
```javascript
router.delete('/:id', verifyFirebaseToken, requireMinRole('admin'), async (req, res) => {
  try {
    // STEP 1: Capture full snapshot for audit BEFORE delete (D-18).
    const before = await Property.findById(req.params.id).lean();
    if (!before) return res.status(404).json({ message: 'Property not found' });

    // STEP 2: Preserve existing must-be-archived precondition.
    if (before.status !== 'archived') {
      return res.status(400).json({
        message: 'Listing must be archived before permanent deletion.',
        code: 'HARD_DELETE_REQUIRES_ARCHIVED',
      });
    }

    // STEP 3: Hard delete.
    await Property.findByIdAndDelete(req.params.id);

    // STEP 4: Audit row with full before-snapshot.
    try {
      await ModerationLog.create({
        actorUid: req.firebaseUid,
        action: 'hard-delete',
        targetType: 'property',
        targetId: before._id,
        before, // full snapshot per D-18
        after: null,
        at: new Date(),
      });
    } catch (auditErr) {
      console.error(JSON.stringify({
        evt: 'moderation_audit_orphan',
        action: 'hard-delete',
        targetId: String(before._id),
        actorUid: req.firebaseUid,
        err: auditErr.message,
        ts: new Date().toISOString(),
      }));
    }

    res.status(200).json({ message: 'Property deleted successfully' });
  } catch (error) {
    console.error('Error deleting property:', error);
    res.status(500).json({ message: error.message });
  }
});
```

**Tension to flag**: the existing handler had an inline ownership check at lines 554-557 (`property.ownerUid !== req.firebaseUid`). Phase 4 D-04 swaps to admin-only, which means **the inline ownership check becomes meaningless and should be deleted** (admins can hard-delete any listing). The CONTEXT.md frames D-04 as "middleware swap" but planner must also delete the now-redundant ownership block.

### `Property.js` schema additive change (D-20)

Current state at `JayTap-services/src/models/Property.js:36-50`:
```javascript
// D-01: drop legacy draft, add rejected; D-18: single default pending (legacy null
// absorbed by Plan 02 migration backfill + client coalesce — see 02-CONTEXT.md D-02).
status: { type: String, enum: ['pending', 'live', 'rejected', 'archived'], default: 'pending' },

// D-21: lifecycle audit fields. Phase 2 only writes submittedAt (POST + edit-resubmit PUT
// auto-flip). Phase 3 writes approve/reject fields; Phase 4 writes archive fields.
submittedAt: { type: Date },
approvedAt: { type: Date, default: null },
approvedByUid: { type: String, default: null },
rejectedAt: { type: Date, default: null },
rejectedByUid: { type: String, default: null },
rejectionReasonCode: { type: String, default: null }, // No enum constraint in Phase 2 — Phase 3 adds it
rejectionReasonNote: { type: String, default: null },
archivedAt: { type: Date, default: null },
archivedByUid: { type: String, default: null },
```

**Phase 4 must add TWO fields, not one**: `archivedReasonCode` AND `archivedReasonNote` (CONTEXT.md D-20 only mentions `archivedReasonNote`, but the schema also lacks `archivedReasonCode`). Diff:

```javascript
archivedAt: { type: Date, default: null },
archivedByUid: { type: String, default: null },
+ archivedReasonCode: { type: String, default: null }, // Phase 4: mod-archive populates from VALID_REJECT_CODES; owner-archive leaves null
+ archivedReasonNote: { type: String, default: null }, // Phase 4: mod-archive optional free-text; owner-archive leaves null
```

### `ModerationLog.js` action enum extension (D-05)

Current state at `JayTap-services/src/models/ModerationLog.js:19`:
```javascript
action: { type: String, enum: ['approve', 'reject', 'edit-on-behalf'], required: true },
```

Phase 4 diff:
```javascript
- action: { type: String, enum: ['approve', 'reject', 'edit-on-behalf'], required: true },
+ action: { type: String, enum: ['approve', 'reject', 'edit-on-behalf', 'archive', 'unarchive', 'hard-delete'], required: true },
```

### Backend supertest harness (Phase 3 closed with 18 cases)

Phase 3's harness lives at `JayTap-services/src/__tests__/moderationRoutes.test.js` with `setup.js` providing the in-memory Mongo via `mongodb-memory-server`. Key patterns Phase 4 mirrors:

**Race-condition test using `Promise.all`** (lines 90-112):
```javascript
test('two concurrent approves: one returns 200, the other returns 409 ALREADY_MODERATED', async () => {
  const tokenA = await buildToken({ sub: 'mod-a-uid', role: 'moderator', kind: 'valid' });
  const tokenB = await buildToken({ sub: 'mod-b-uid', role: 'moderator', kind: 'valid' });

  const [resA, resB] = await Promise.all([
    request(app).post(`/api/moderation/properties/${pendingListing._id}/approve`).set('Authorization', `Bearer ${tokenA}`),
    request(app).post(`/api/moderation/properties/${pendingListing._id}/approve`).set('Authorization', `Bearer ${tokenB}`),
  ]);

  const statuses = [resA.status, resB.status].sort();
  expect(statuses).toEqual([200, 409]);
  // ...
});
```

**actorUid anti-spoofing test** (lines 157-173):
```javascript
test('actorUid CANNOT be spoofed via request body (anti-tampering)', async () => {
  const token = await buildToken({ sub: 'mod-a-uid', role: 'moderator', kind: 'valid' });
  const res = await request(app)
    .post(`/api/moderation/properties/${pendingListing._id}/approve`)
    .set('Authorization', `Bearer ${token}`)
    .send({ actorUid: 'attacker-uid', firebaseUid: 'attacker-uid' });
  expect(res.status).toBe(200);

  const logs = await ModerationLog.find({ targetId: pendingListing._id });
  expect(logs[0].actorUid).toBe('mod-a-uid');         // From JWKS token sub
  expect(logs[0].actorUid).not.toBe('attacker-uid');  // NOT from body
});
```

**Role-gating per endpoint** (lines 181-220) — one test per endpoint × 5 (4 endpoints + 1 admin-inherits positive case). Phase 4 adds at minimum 4 new endpoint × 1 plain-user 403 case + 1 admin-inherits-moderator positive case for the moderation routes, plus 1 plain-mod-403 case for the hard-delete admin-only swap.

**Test seed pattern** (lines 65-81):
```javascript
beforeEach(async () => {
  app = makeApp();
  await User.create({ uid: 'mod-a-uid',     email: 'mod-a@x.com',  userType: 'moderator' });
  await User.create({ uid: 'mod-b-uid',     email: 'mod-b@x.com',  userType: 'moderator' });
  await User.create({ uid: 'admin-uid',     email: 'admin@x.com',  userType: 'admin' });
  await User.create({ uid: 'plain-user-uid', email: 'user@x.com',  userType: 'user' });

  pendingListing = await Property.create({
    title: 'Race', listingId: 'P3-RACE', address: '1 Race St', price: 100,
    ownerUid: 'owner-uid', status: 'pending', submittedAt: new Date(),
  });
});
```

For Phase 4, the seed cluster gains an `'owner-uid'` User and a couple of pre-archived listings (one with `archivedByUid === 'owner-uid'` for the owner-restore-allowed case, one with `archivedByUid === 'mod-a-uid'` for the owner-restore-403 case per D-13).

## Client component patterns

### `<RejectListingModal>` structure → fork to `<ArchiveListingModal>` (D-08)

`/Users/beckmaldinVL/development/mobileApps/JayTap/src/components/RejectListingModal.tsx` (208 LOC, full content viewed):

**Structure:**
- File header docstring (lines 1-15): explains it's a Phase 3 fork from Phase 4.5's inline modal.
- Imports (16-30): `useState`, `useEffect` from React; `View`, `Text`, `StyleSheet`, `TouchableOpacity`, `TextInput`, `Modal`, `KeyboardAvoidingView`, `Platform`, `ScrollView`, `ActivityIndicator` from RN; `useTheme` from `../theme/ThemeContext`; `useLanguage` from `../context/LanguageContext`.
- Type export (32-35): `RejectReasonCode` union + `REJECT_CODES` const array — Phase 4 reuses this same union (mod-archive uses the same 4-code enum per CONTEXT.md D-02).
- Props interface (37-42): `visible: boolean`, `onClose: () => void`, `onSubmit: (params: { reasonCode: RejectReasonCode; reasonNote?: string }) => Promise<void>`, `submitting?: boolean`.
- Component body (44-172): destructure props, `useTheme`/`useLanguage` hooks, `useState` for chip selection (default `'incomplete-info'`) + note text, `useEffect` to reset on `visible` toggle, `handleSubmit` calls parent's `onSubmit` with trimmed note, JSX renders `<Modal animationType="fade" transparent>` with `KeyboardAvoidingView` + `ScrollView` + chip group + multi-line `<TextInput maxLength={500}>` + Cancel/Submit row.
- Styles (174-207): Inline `StyleSheet.create`. Chip styling at line 185 (`paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, borderWidth: 1`). Selected state colors via `colors.primary` background + contrast text color (`isDark ? '#121212' : '#FFFFFF'`).

**ArchiveListingModal fork — minimal diff** (per D-08 — preserve single-purpose copy/identity):
1. Rename component (`ArchiveListingModal`), file (`src/components/ArchiveListingModal.tsx`), default export.
2. Keep the imported `RejectReasonCode` union from `RejectListingModal` (NO new union; same 4 codes per CONTEXT.md `<specifics>`). Or duplicate as `ArchiveReasonCode`. Planner discretion.
3. Replace 3 `t()` calls:
   - `t('moderation.reject.modalTitle')` → `t('moderation.archive.modalTitle')`
   - `t('moderation.reject.notePlaceholder')` → either reuse `moderation.reject.notePlaceholder` OR add `moderation.archive.notePlaceholder` (planner picks)
   - `t('moderation.reject.submit')` → `t('moderation.archive.submit')`
4. Reuse `t('moderation.reject.reason.${code}')` for chip labels (no chip-label duplication per CONTEXT.md `<specifics>`).
5. Component is presentational — no service calls. Parent (PropertyDetailsScreen) owns the `PropertyService.archiveAnyListing(id, reasonCode, reasonNote)` call in `onSubmit`.

### `<Gated>` + `useRole.ts` extension (D-16)

`/Users/beckmaldinVL/development/mobileApps/JayTap/src/components/Gated.tsx` (24 LOC, full content viewed) — declarative wrapper that renders children only when `useRole().can(action)`. Phase 4 consumers use it like `<Gated action="hardDeleteListing"><AdminOnlyButton /></Gated>`.

**`useRole.ts` Action union extension** at line 14-23:
```typescript
// CURRENT
export type Action =
  | 'editVerifications'
  | 'editMatterportUrl'
  | 'editPanoramicUrl'
  | 'manageListings'
  | 'editAnyListing'
  | 'approveListings'
  | 'promoteToModerator'
  | 'reviewLandlordApplications'
  | 'viewModerationQueue';
```

Phase 4 diff:
```typescript
export type Action =
  | 'editVerifications'
  | 'editMatterportUrl'
  | 'editPanoramicUrl'
  | 'manageListings'
  | 'editAnyListing'
  | 'approveListings'
  | 'promoteToModerator'
  | 'reviewLandlordApplications'
  | 'viewModerationQueue'
+ | 'archiveOwnListing'
+ | 'archiveAnyListing'
+ | 'hardDeleteListing';
```

**`canFromUser` switch extension** at lines 75-98 — current state:
```typescript
export function canFromUser(user: any, action: Action): boolean {
  const role = deriveRole(user);
  switch (action) {
    case 'editVerifications':
    case 'editMatterportUrl':
    case 'editPanoramicUrl':
    case 'promoteToModerator':
    case 'reviewLandlordApplications':
      return role === 'admin';
    case 'editAnyListing':
    case 'approveListings':
    case 'viewModerationQueue':
      return role === 'admin' || role === 'moderator';
    case 'manageListings':
      // ... Phase 4.5 capability gate (canListProperties)
  }
}
```

Phase 4 diff (3 new cases):
```typescript
case 'editVerifications':
case 'editMatterportUrl':
case 'editPanoramicUrl':
case 'promoteToModerator':
case 'reviewLandlordApplications':
+ case 'hardDeleteListing':                // admin-only
  return role === 'admin';
case 'editAnyListing':
case 'approveListings':
case 'viewModerationQueue':
+ case 'archiveAnyListing':                // moderator + admin
  return role === 'admin' || role === 'moderator';
+ case 'archiveOwnListing':
+   // any authenticated user with backendProfile (D-16). Belt-and-suspenders only —
+   // backend's per-route ownership check (req.user.uid === property.ownerUid) is
+   // the authoritative gate.
+   return role !== 'guest' && !!user?.backendProfile;
case 'manageListings':
  // ... unchanged
```

**No existing tests need shape changes** — `useRole.test.ts` already has 14 tests covering Branches 1/2 and the M1 allowlist removal. Phase 4 adds rows for the 3 new Action cases (3-6 new tests recommended).

### PropertyCard action button row (D-11) — already wired in source

`/Users/beckmaldinVL/development/mobileApps/JayTap/src/components/PropertyCard.tsx` (495 LOC, full content viewed). The component **already has** `onArchive`, `onUnarchive`, and `onDelete` props fully wired:

**Props at lines 32-33 (already declared):**
```typescript
onArchive?: (property: Property) => void; // Optional archive handler (soft-delete for live listings)
onUnarchive?: (property: Property) => void; // Optional unarchive handler (restore archived → draft)
```

**JSX action row at lines 196-256 (already rendering):**
```typescript
{showEditButton ? (
  (() => {
    const status = property.status;
    const isArchived = status === 'archived';
    const canArchive = !isArchived; // live, legacy, pending, or rejected
    return (
      <View style={styles.ownerActionsRow}>
        {onEdit && (<TouchableOpacity ... ><Pencil size={19} ... /></TouchableOpacity>)}
        {canArchive && onArchive && (
          <TouchableOpacity
            style={[styles.listingActionBtnIcon, styles.listingActionBtnArchive]}
            onPress={() => onArchive(property)}>
            <Archive size={19} color="#FFFFFF" strokeWidth={2} />  // amber #D97706
          </TouchableOpacity>
        )}
        {isArchived && onUnarchive && (
          <TouchableOpacity
            style={[styles.listingActionBtnIcon, styles.listingActionBtnUnarchive]}
            onPress={() => onUnarchive(property)}>
            <ArchiveRestore size={19} color="#FFFFFF" strokeWidth={2} />  // emerald #059669 (lines 479-490)
          </TouchableOpacity>
        )}
        {isArchived && onDelete && (
          <TouchableOpacity
            style={[styles.listingActionBtnIcon, styles.listingActionBtnDelete]}
            onPress={() => onDelete(property)}>
            <Trash2 size={19} color="#FFFFFF" strokeWidth={2} />  // red #DC2626
          </TouchableOpacity>
        )}
      </View>
    );
  })()
) : (
  // ... renter-facing specs container
)}
```

**Phase 4 implication**: PropertyCard needs **ZERO changes**. The component is presentational and conditional-renders the right buttons based on which props the parent passes. RenterListingsScreen just needs to **pass `onArchive` + `onUnarchive` props back** (Phase 2 D-08 stripped them from JSX; Phase 4 D-09 + D-11 re-mounts).

D-11 says "PropertyCard adds `onUnarchive` prop" — that's already present. The plan-time work is in **RenterListingsScreen.tsx** (re-add the props to the `<PropertyCard>` invocation at line 313-321) and **HospitalitySection** (verify same).

### PropertyDetailsScreen mod action footer (D-06) — extends Phase 3 footer

`/Users/beckmaldinVL/development/mobileApps/JayTap/src/screens/PropertyDetailsScreen.tsx` (2131 LOC). Phase 3's footer at lines 1316-1376 with handler logic at lines 268-356:

**Footer JSX render block** (line 1320-1376):
```tsx
{showModFooter && (
  <View style={[styles.modActionFooter, { backgroundColor: colors.surface, borderTopColor: colors.border, paddingBottom: Math.max(insets.bottom, 12) }]}>
    <TouchableOpacity style={[styles.modActionBtn, { backgroundColor: '#059669' }]} onPress={handleApprove} ...>
      <Check size={18} color="#FFF" />
      <Text style={styles.modActionBtnText}>{t('moderation.action.approve')}</Text>
    </TouchableOpacity>
    <TouchableOpacity style={[styles.modActionBtn, { backgroundColor: '#DC2626' }]} onPress={() => setIsRejectModalOpen(true)} ...>
      <X size={18} color="#FFF" />
      <Text style={styles.modActionBtnText}>{t('moderation.action.reject')}</Text>
    </TouchableOpacity>
    <TouchableOpacity style={[styles.modActionBtn, { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }]} onPress={handleEditOnBehalf} ...>
      <Edit3 size={18} color={colors.text} />
      <Text style={[styles.modActionBtnText, { color: colors.text }]}>{t('moderation.action.editOnBehalf')}</Text>
    </TouchableOpacity>
  </View>
)}
{/* RejectListingModal sibling at lines 1382-1387 */}
<RejectListingModal visible={isRejectModalOpen} onClose={...} onSubmit={handleRejectSubmit} submitting={submittingAction} />
```

**Render predicate at line 274:** `const showModFooter = can('approveListings') && property.status === 'pending';`

**Footer styles at lines 2106-2130:**
```typescript
modActionFooter: {
  flexDirection: 'row',
  gap: 8,
  padding: 16,
  paddingTop: 12,
  borderTopWidth: 1,
},
modActionBtn: {
  flex: 1,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  paddingVertical: 12,
  borderRadius: 10,
  gap: 6,
},
modActionBtnText: {
  color: '#FFF',
  fontSize: 14,
  fontWeight: '600',
  lineHeight: 20,
},
```

**Phase 4 D-06 extension plan** (handlers + footer JSX):
1. Add `isArchiveModalOpen` + `isDeleteModalOpen` state alongside `isRejectModalOpen` + `submittingAction`.
2. Add new render predicates:
   - `showArchiveBtn = can('archiveAnyListing') && property.status !== 'archived'`
   - `showRestoreBtn = can('archiveAnyListing') && property.status === 'archived'`
   - `showHardDeleteBtn = can('hardDeleteListing')` (admin-only; visible regardless of status because the button itself is gated by D-04's `HARD_DELETE_REQUIRES_ARCHIVED` server check)
3. Add handlers: `handleModArchive` (opens `<ArchiveListingModal>` → calls `PropertyService.archiveAnyListing(id, code, note)` in modal's onSubmit), `handleRestore` (Alert.alert confirm → `PropertyService.restoreListing(id)`), `handleHardDelete` (opens `<DeletePropertyModal>` → `PropertyService.hardDeleteListing(id)`).
4. Render new buttons in the existing `modActionFooter` row (when status === 'pending', BOTH the existing 3-button row AND the new Archive/Restore/HardDelete buttons render — see D-06 verbatim "mod/admin viewing PENDING listings sees BOTH the existing 3-button row AND the Archive button"). Recommend a SECOND `modActionFooter` row underneath, OR multi-line wrap. Planner picks visual treatment per D-Claude-Discretion.
5. Mount `<ArchiveListingModal>` + `<DeletePropertyModal>` as siblings to the existing `<RejectListingModal>` at line 1382.
6. Reuse the existing `refetchProperty()` callback at line 279-290 for post-action state refresh.
7. Reuse the existing `handleRaceConflict()` at lines 292-297 for 409 toast (or add archive-specific copy per D-Claude-Discretion).

### RenterListingsScreen archive/delete handlers (D-09, D-10, D-11)

`/Users/beckmaldinVL/development/mobileApps/JayTap/src/screens/RenterListingsScreen.tsx` (463 LOC; CONTEXT.md states 458 — minor drift). Lines referenced in CONTEXT.md (`141-167` for archive, `110-197` for archive/delete handlers) match the actual file.

**Existing `handleArchiveProperty` at lines 141-167** (currently broken — calls `PropertyService.archiveProperty(id)` which writes `body.status: 'archived'` and is stripped by Phase 2's PUT sanitizer):
```typescript
const handleArchiveProperty = (property: Property) => {
  if (!property.id) return;
  Alert.alert(
    t('property.archiveDialogTitle'),
    t('property.archiveDialogMessage'),
    [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('property.archiveConfirm'),
        style: 'default',
        onPress: async () => {
          try {
            await PropertyService.archiveProperty(property.id!);  // ← BROKEN STUB; D-09 swaps to archiveOwnListing
            setProperties(prev =>
              prev.map(p => (p.id === property.id ? { ...p, status: 'archived' as const } : p))
            );
            onListingMutated?.();
            Alert.alert(t('property.archivedToastTitle'), t('property.archivedToastMessage'));
          } catch (error: any) {
            console.error('Error archiving property:', error);
            Alert.alert(t('common.error'), error?.message || t('property.archiveErrorMessage'));
          }
        },
      },
    ]
  );
};
```

**Phase 4 D-09 rewire** — single-line change in the `onPress` callback:
```typescript
- await PropertyService.archiveProperty(property.id!);
+ await PropertyService.archiveOwnListing(property.id!);
```

**Existing `handleUnarchiveProperty` at lines 171-197** (currently broken — writes `body.status: 'draft'` which no longer exists in the enum):
```typescript
const handleUnarchiveProperty = (property: Property) => {
  if (!property.id) return;
  Alert.alert(
    t('property.unarchiveDialogTitle'),
    t('property.unarchiveDialogMessage'),
    [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('property.unarchiveConfirm'),
        style: 'default',
        onPress: async () => {
          try {
            await PropertyService.unarchiveProperty(property.id!);  // ← BROKEN; D-12 swaps to restoreListing
            setProperties(prev =>
              prev.map(p => (p.id === property.id ? { ...p, status: 'pending' as const } : p))
            );
            onListingMutated?.();
            Alert.alert(t('property.unarchivedToastTitle'), t('property.unarchivedToastMessage'));
          } catch (error: any) {
            console.error('Error unarchiving property:', error);
            Alert.alert(t('common.error'), error?.message || t('property.unarchiveErrorMessage'));
          }
        },
      },
    ]
  );
};
```

**Phase 4 D-12 rewire** — same single-line change pattern:
```typescript
- await PropertyService.unarchiveProperty(property.id!);
+ await PropertyService.restoreListing(property.id!);
```

The `setProperties(prev => prev.map(p => (p.id === property.id ? { ...p, status: 'pending' as const } : p)))` optimistic update at line 184-186 already matches the D-03 backend contract (status flips to `'pending'`).

**Existing `handleDeleteProperty` + `confirmDelete` at lines 111-134**:
```typescript
const handleDeleteProperty = (property: Property) => {
  setPropertyToDelete(property);
  setDeleteModalVisible(true);
};

const confirmDelete = async () => {
  if (!propertyToDelete?.id) return;
  try {
    await PropertyService.deleteProperty(propertyToDelete.id);
    setProperties(properties.filter(p => p.id !== propertyToDelete.id));
    setDeleteModalVisible(false);
    setPropertyToDelete(null);
    onListingMutated?.();
    Alert.alert(t('common.success'), t('property.permanentlyDeletedToast'));
  } catch (error: any) { ... }
};
```

**Phase 4 D-10 + D-14 strip** — DELETE these blocks entirely from RenterListingsScreen, MOVE the `DeletePropertyModal` mount + handler to PropertyDetailsScreen with admin gate. Also strip:
- `propertyToDelete` state at line 59
- `deleteModalVisible` state at line 58
- `<DeleteListingModal>` mount at lines 368-376
- `onDelete={handleDeleteProperty}` prop on PropertyCard at line 319

**Re-mount `onArchive` + `onUnarchive` props on PropertyCard at line 313-321** (Phase 2 stripped these per D-08 boundary; Phase 4 re-adds):
```typescript
// CURRENT (Phase 2 stripped state)
<PropertyCard
  property={item}
  onPress={handlePressProperty}
  onViewTour={handleViewTour}
  onViewVideo={handleViewVideo}
  onEdit={onEditProperty}
  onDelete={handleDeleteProperty}    // ← STRIP per D-10
  showEditButton={true}
/>
```

```typescript
// PHASE 4 (D-09 + D-11 + D-13 — re-mount archive props, drop owner delete)
<PropertyCard
  property={item}
  onPress={handlePressProperty}
  onViewTour={handleViewTour}
  onViewVideo={handleViewVideo}
  onEdit={onEditProperty}
  onArchive={handleArchiveProperty}                                    // re-mount
  onUnarchive={canSelfRestore(item) ? handleUnarchiveProperty : undefined}  // D-13 conditional
  // NO onDelete — owner delete removed per D-14
  showEditButton={true}
/>
```

Where `canSelfRestore` is a new local helper:
```typescript
const canSelfRestore = (p: Property) => p.archivedByUid === user?.localId;
```

(Note: `archivedByUid` must be added to the `Property` type per the schema additive — see Open Questions; the type at `src/types/Property.ts:65-79` lists status + 3 audit fields but not `archivedByUid` yet.)

### `<HospitalitySection>` prop signature (D-Claude-Discretion)

`/Users/beckmaldinVL/development/mobileApps/JayTap/src/components/HospitalitySection.tsx` (4008 bytes, presumed pass-through wrapper around PropertyCard for the Hospitality category — same prop shape). Phase 4 verifies the prop shape includes `onArchive` + `onUnarchive` (likely already does since PropertyCard does); plan-time read confirms.

## Locale parity gate

`/Users/beckmaldinVL/development/mobileApps/JayTap/scripts/check-i18n-parity.sh` (28 LOC, full content viewed):

```bash
#!/usr/bin/env bash
set -u
cd "$(dirname "$0")/.."

en_keys=$(grep -oE "'[a-zA-Z.]+':" src/locales/en.ts | sort -u)
ru_keys=$(grep -oE "'[a-zA-Z.]+':" src/locales/ru.ts | sort -u)
diff_out=$(diff <(echo "$en_keys") <(echo "$ru_keys") || true)

if [ -z "$diff_out" ]; then
  echo "OK   #1: en.ts and ru.ts key sets are identical"
  exit 0
else
  echo "FAIL: en.ts and ru.ts key sets differ"
  echo "$diff_out"
  exit 1
fi
```

**How it runs:** Single bash script invoked manually or in CI as `bash scripts/check-i18n-parity.sh`. No npm script wraps it (verified — neither `package.json` nor `jest.config` references it).

**How it fails:** Exits 1 with a `diff` output of mismatched keys when `en.ts` and `ru.ts` key sets diverge.

**How it interacts with TypeScript:** Belt-and-suspenders — `ru.ts: Record<TranslationKeys, string>` already enforces parity at compile time via `src/locales/index.ts`'s exported `TranslationKeys` type. The bash gate is a runtime backstop.

**Phase 4 atomic-commit discipline:**
- Add the 8 new `moderation.archive.*` keys (D-08) to BOTH `en.ts` and `ru.ts` in the SAME commit.
- Rewrite the 5 existing `property.unarchive*` value pairs (D-12) in BOTH locales in the SAME commit (preserve key NAMES — bash gate only checks key SETS, not values; tsc only checks type-level keys).
- Optional 1 new `moderation.race.archive.toast` key (D-Claude-Discretion) goes in BOTH locales atomically.

**Existing relevant locale keys (from `src/locales/en.ts` grep):**
```
136: 'property.archive': 'Archive',
137: 'property.unarchive': 'Unarchive',
138: 'property.archived': 'Archived',
143: 'listings.status.archived': 'Unpublished',
152: 'owner.listings.tab.archived': 'Archived',
160: 'property.archiveDialogTitle': 'Archive Listing',
161: 'property.archiveDialogMessage': 'Archive this listing? It will be hidden from search but stays in your library, and you can restore it any time.',
162: 'property.archiveConfirm': 'Archive',
163: 'property.unarchiveDialogTitle': 'Unarchive Listing',
164: 'property.unarchiveDialogMessage': "Restore this listing to Drafts? You'll need to re-publish it from the edit screen before it shows up in search again.",  ← D-12 REWRITE
165: 'property.unarchiveConfirm': 'Unarchive',
167: 'property.archivedToastTitle': 'Listing archived',
168: 'property.archivedToastMessage': 'You can find it in your listings with the Archived badge.',
169: 'property.unarchivedToastTitle': 'Listing moved to Drafts',  ← D-12 REWRITE
170: 'property.unarchivedToastMessage': 'Open the listing and tap Edit to publish it when ready.',  ← D-12 REWRITE
170: 'property.permanentlyDeletedToast': 'Listing permanently deleted',  ← REUSED by D-10 hard-delete success toast
171: 'property.archiveErrorMessage': 'Failed to archive listing. Please try again.',
172: 'property.unarchiveErrorMessage': 'Failed to unarchive listing. Please try again.',
597: 'moderation.reject.modalTitle': 'Reject this listing',          ← D-08 fork pattern
598: 'moderation.reject.notePlaceholder': 'Add a note (optional)',   ← D-08 reuse OR fork
599: 'moderation.reject.submit': 'Reject Listing',                    ← D-08 fork pattern
600-603: moderation.reject.reason.* (4 chip labels)                   ← REUSED by ArchiveListingModal chips
604: 'moderation.race.toast': 'This listing was already reviewed by another moderator.'  ← REUSED OR new key per D-Claude-Discretion
```

**Critical observation**: D-12's "preserve key NAMES" approach means the bash parity gate doesn't catch value drift. Plan-checker should grep for the expected new VALUES (e.g., `grep "moderation queue for review" src/locales/en.ts`) to verify the rewrite landed.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Backend framework | Jest + supertest + mongodb-memory-server |
| Backend config | `JayTap-services/jest.config.cjs` (setupFilesAfterEach via `src/__tests__/setup.js`) |
| Backend quick run | `cd /Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services && npm test -- moderationRoutes.test.js` |
| Backend full suite | `cd /Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services && nvm use 24 && npm test` (Node ≥22.12 required per memory `backend-node-version.md`) |
| Client framework | Jest + React Native Testing Library (limited use; `__tests__/App.test.tsx` is the only smoke test) |
| Client quick run | `cd /Users/beckmaldinVL/development/mobileApps/JayTap && npm test -- useRole.test.ts` |
| Client full suite | `cd /Users/beckmaldinVL/development/mobileApps/JayTap && npm test` (very small scope per CONVENTIONS.md "effectively zero tests"; jest config exists but app-level smoke is the only existing case) |
| TypeScript baseline | `cd /Users/beckmaldinVL/development/mobileApps/JayTap && npx tsc --noEmit` (current baseline: 2 pre-existing ThemeContext errors per Phase 3 SUMMARY — Phase 4 must preserve this baseline) |
| i18n parity gate | `cd /Users/beckmaldinVL/development/mobileApps/JayTap && bash scripts/check-i18n-parity.sh` (exits 0 if EN+RU key sets match) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ARCH-01 | Owner can archive own listing; status flips to archived; archivedReasonCode=null | integration (supertest) | `npm test -- propertyRoutes.test.js` (Wave 0 adds Phase 4 block) | ❌ Wave 0 — block to be added |
| ARCH-01 | Owner cannot archive someone else's listing | integration (supertest) — 403 case | `npm test -- propertyRoutes.test.js` | ❌ Wave 0 |
| ARCH-01 | Two concurrent owner-archives → one 200, other 409 ALREADY_ARCHIVED | integration (supertest, Promise.all) | `npm test -- propertyRoutes.test.js` | ❌ Wave 0 |
| ARCH-02 | Mod-archive happy path with reasonCode + reasonNote → ModerationLog row written | integration (supertest) | `npm test -- moderationRoutes.test.js` | ❌ Wave 0 — Phase 4 block to be added |
| ARCH-02 | Mod-archive missing reasonCode → 400 | integration (supertest) | `npm test -- moderationRoutes.test.js` | ❌ Wave 0 |
| ARCH-02 | Mod-archive invalid reasonCode (not in VALID_REJECT_CODES) → 400 | integration (supertest) | `npm test -- moderationRoutes.test.js` | ❌ Wave 0 |
| ARCH-02 | Mod-archive plain user → 403 insufficient-role | integration (supertest) | `npm test -- moderationRoutes.test.js` | ❌ Wave 0 |
| ARCH-02 | actorUid CANNOT be spoofed via body on mod-archive | integration (supertest, anti-tampering) | `npm test -- moderationRoutes.test.js` | ❌ Wave 0 |
| ARCH-03 | Anonymous GET /api/properties/:id on archived listing → 404 | integration (supertest) — verifies Phase 2 D-06 still holds | `npm test -- propertyRoutes.test.js` | ✅ existing block; Phase 4 verifies no regression |
| ARCH-03 | Owner GET /api/properties/:id on own archived listing → 200 | integration (supertest) — Phase 2 D-06 | `npm test -- propertyRoutes.test.js` | ✅ existing |
| ARCH-03 | Mod GET /api/properties/:id on archived listing → 200 | integration (supertest) — Phase 2 D-06 | `npm test -- propertyRoutes.test.js` | ✅ existing |
| ARCH-03 | Public GET /api/properties does NOT include archived listings | integration (supertest) | `npm test -- propertyRoutes.test.js` | ✅ existing block (status: 'live' filter) |
| ARCH-03 | Client `(p.status ?? 'live') === 'live'` filters absorb archived on Home/Favorites/RenterListings public lanes | manual physical-device QA + visual smoke | matrix walk — see Manual QA layer below | n/a |
| ARCH-04 | Owner-restore → status flips to 'pending', submittedAt re-stamped, archive fields cleared, audit fields preserved | integration (supertest, post-state inspection) | `npm test -- propertyRoutes.test.js` | ❌ Wave 0 |
| ARCH-04 | Owner cannot restore a mod-archived listing → 403 (D-13 gate) | integration (supertest) | `npm test -- propertyRoutes.test.js` | ❌ Wave 0 |
| ARCH-04 | Mod-restore on any archived listing → 200 → status 'pending' | integration (supertest) | `npm test -- moderationRoutes.test.js` | ❌ Wave 0 |
| ARCH-04 | Mod-restore on non-archived listing → 409 NOT_ARCHIVED | integration (supertest) | `npm test -- moderationRoutes.test.js` | ❌ Wave 0 |
| ARCH-05 | Hard-delete admin → 200 + ModerationLog row with full before-snapshot | integration (supertest) | `npm test -- propertyRoutes.test.js` | ❌ Wave 0 |
| ARCH-05 | Hard-delete moderator → 403 insufficient-role | integration (supertest) | `npm test -- propertyRoutes.test.js` | ❌ Wave 0 |
| ARCH-05 | Hard-delete owner (plain user) → 403 insufficient-role | integration (supertest) | `npm test -- propertyRoutes.test.js` | ❌ Wave 0 |
| ARCH-05 | Hard-delete on non-archived listing → 400 HARD_DELETE_REQUIRES_ARCHIVED (regression of existing precondition) | integration (supertest) | `npm test -- propertyRoutes.test.js` | ❌ Wave 0 |
| ARCH-05 | `useRole.canFromUser('archiveOwnListing')` returns true for any authenticated user with backendProfile | unit (jest) | `npm test -- useRole.test.ts` | ✅ existing test file; Phase 4 adds 3-6 new test rows |
| ARCH-05 | `useRole.canFromUser('archiveAnyListing')` returns true for moderator + admin only | unit (jest) | `npm test -- useRole.test.ts` | ✅ existing |
| ARCH-05 | `useRole.canFromUser('hardDeleteListing')` returns true for admin only | unit (jest) | `npm test -- useRole.test.ts` | ✅ existing |
| ARCH-01..05 | i18n parity holds across Phase 4 locale changes | shell gate | `bash scripts/check-i18n-parity.sh` | ✅ existing |
| ARCH-01..05 | TypeScript baseline preserved (2 pre-existing ThemeContext errors, no new errors) | type-check | `npx tsc --noEmit` | ✅ existing |
| ARCH-01..05 | Anti-pattern grep gate: `actorUid: req.body` and `actorUid: req.headers` return 0 in moderationRoutes.js + propertyRoutes.js | shell gate | `grep -rn "actorUid: req\.body\|actorUid: req\.headers" /Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/routes` | ✅ to be re-asserted at phase close |

### Sampling Rate

- **Per task commit:** `cd JayTap-services && npm test -- <relevant-test-file>` for backend tasks; `cd JayTap && npx tsc --noEmit && bash scripts/check-i18n-parity.sh && npm test -- <touched-test>` for client tasks
- **Per wave merge:** Backend full suite (`cd JayTap-services && npm test`) + client tsc + i18n parity
- **Phase gate:** Backend full suite green + client tsc baseline preserved + i18n parity 0 + manual physical-device QA matrix walked APPROVED on iPhone 15 Pro Max (Moto G XT2513V deferred to Phase 6 release-gate matrix per Phase 3 SUMMARY precedent escape hatch)

### Validation Layers (per CONTEXT.md `<additional_context>` requirement)

| Layer | Tool | Coverage |
|-------|------|----------|
| **Unit** | Jest + ts-jest | `useRole.test.ts` — extend with 3-6 cases for the new Action members (`archiveOwnListing` / `archiveAnyListing` / `hardDeleteListing`) covering admin / moderator / user / guest combinations |
| **Integration (backend)** | supertest + mongodb-memory-server + JWKS-mocked tokens via `fixtures/jwks-tokens.js` | Race-condition (Promise.all) on owner-archive + mod-archive concurrency; audit-row shape + actorUid anti-spoofing; per-endpoint role-gating × 4 new routes + 1 middleware swap; reasonCode validation; before-snapshot capture on hard-delete; D-13 owner-restore gate (403 when archivedByUid !== ownerUid) |
| **Component** | RNTL (limited) | Optional — `ArchiveListingModal` chip-selection state machine + onSubmit dispatch. Codebase posture is "manual physical-device QA bar"; planner discretion. Recommend SKIP unless trivial wins emerge during plan execution. |
| **Manual physical-device QA** | iPhone 15 Pro Max (mandatory) + Moto G XT2513V (deferred to Phase 6 per Phase 3 escape hatch) | Smoke matrix: (1) owner archive own listing via PropertyCard archive button → confirm Alert.alert flow; (2) owner archive own listing via PropertyDetailsScreen footer; (3) owner restore self-archived listing → status flips to pending, FIFO re-queue position visible; (4) owner cannot restore mod-archived listing (affordance hidden); (5) mod archive any listing via PropertyDetailsScreen footer with reasonCode chip + optional note; (6) mod restore any archived listing → flips to pending; (7) admin hard-delete an archived listing via PropertyDetailsScreen footer → confirms toast + audit-log row; (8) plain user does NOT see Archive/Restore/Hard-Delete buttons on PropertyDetailsScreen footer; (9) plain user does NOT see archived listings in Home/Favorites/RenterListings public lanes; (10) EN+RU locale parity per screen; (11) dark/light mode parity. |
| **Anti-pattern grep gate** | shell grep | `actorUid: req.body` and `actorUid: req.headers` MUST return 0 in `moderationRoutes.js` + `propertyRoutes.js` per Phase 3 invariant inheritance |
| **Locale parity gate** | `bash scripts/check-i18n-parity.sh` | EN+RU key-set parity exit 0 across every Phase 4 commit; tsc compile-time `Record<TranslationKeys, string>` is the type-level backstop |
| **Code review** | `/gsd-code-review` paired with `/gsd-verify-work` per `gsd-verifier-misses-regressions.md` | Both gates required at phase close — verifier alone has missed regressions historically |

### Wave 0 Gaps

- [ ] **Backend**: extend `JayTap-services/src/__tests__/propertyRoutes.test.js` with a Phase 4 describe block covering owner-archive (3 cases: happy / 403 not-owner / 409 already-archived), owner-restore (2 cases: happy / 403 not-original-archiver), hard-delete role-gating (3 cases: admin / mod-403 / owner-403) + before-snapshot audit row (1 case)
- [ ] **Backend**: extend `JayTap-services/src/__tests__/moderationRoutes.test.js` with a Phase 4 describe block covering mod-archive (4 cases: happy / 400 missing-reasonCode / 400 invalid-reasonCode / 409 already-archived), mod-restore (2 cases: happy / 409 not-archived), per-endpoint role-gating × 2 new routes (2 cases plain-user-403)
- [ ] **Backend**: race-condition Promise.all test on owner-archive + mod-archive concurrency (1 case)
- [ ] **Backend**: actorUid anti-spoofing test on owner-archive + mod-archive (2 cases)
- [ ] **Client**: extend `src/hooks/__tests__/useRole.test.ts` with 3-6 cases for the new Action members
- [ ] **Client**: NO new component test files required (codebase posture); manual smoke covers UI

*(If Phase 4 plan timeline pressures further, the planner may collapse the Wave 0 backend additions into Wave-1 alongside the route additions — Phase 3 plan-by-plan precedent shows TDD with route + test in the same commit pair works fine.)*

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | `verifyFirebaseToken` middleware (Phase 1 ROLE-04, JWKS via jose) — already in place |
| V3 Session Management | partial | Bearer token rotation + refresh-token flow (Phase 1 ROLE-06/ROLE-09) — Phase 4 inherits |
| V4 Access Control | **yes (CRITICAL)** | `requireMinRole('moderator'|'admin')` middleware on each Phase 4 route; D-13 owner-restore gate (`req.user.uid === property.ownerUid AND property.archivedByUid === property.ownerUid`); belt-and-suspenders client `<Gated>` + service `canFromUser` + backend `requireMinRole` (3-tier defense) |
| V5 Input Validation | yes | `VALID_REJECT_CODES` allowlist for mod-archive `reasonCode` body field; `reasonNote` trimmed + length-capped (planner picks server-side max if any); body field whitelisting (no mass-assignment — Phase 3 PUT /listings/:id pattern at moderationRoutes.js:251-264 is the canonical reference) |
| V6 Cryptography | yes | JWKS verification via `jose` (RS256 only, audience + issuer + clockTolerance enforced — Phase 1 ROLE-03); Phase 4 inherits zero-config |

### Known Threat Patterns for the JayTap stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| **Privilege escalation via mod-archive bypass** | Elevation of Privilege | Server-side `requireMinRole('moderator')` on `POST /api/moderation/properties/:id/archive`; backend is authoritative gate — client `<Gated>` is UX-only |
| **Owner archives a rejected listing → restores → bypasses re-moderation** (ARCH-04 invariant) | Tampering | Restore route flips `'archived' → 'pending'` (NOT prior status); `submittedAt` re-stamped for FIFO re-queue; mod must re-approve before listing goes live again |
| **Owner restores a mod-archived listing they shouldn't have access to** (D-13 invariant) | Elevation of Privilege | Backend gate `req.user.uid === property.ownerUid AND property.archivedByUid === property.ownerUid` (both conditions); 403 otherwise |
| **actorUid spoofing via request body on archive/unarchive/hard-delete** | Spoofing | `actorUid: req.firebaseUid` ALWAYS — anti-pattern grep gate at phase close (`actorUid: req.body` / `actorUid: req.headers` return 0) |
| **Race condition: two mods or mod+owner archive same listing → audit log inconsistency** | Tampering / Repudiation | Atomic `findOneAndUpdate({_id, status: <expected>}, {$set})` — status filter IS the lock primitive; loser receives 409; supertest covers via `Promise.all` |
| **Mass assignment via mod-archive body on Property fields** | Tampering | Body validation strict — only `reasonCode` + `reasonNote` accepted; no other body fields touch the Property document; mirror Phase 3 PUT /listings/:id whitelist pattern at moderationRoutes.js:251-264 |
| **Hard-delete by non-admin** | Elevation of Privilege | D-04 middleware swap from `verifyFirebaseToken + ownership-check` to `verifyFirebaseToken + requireMinRole('admin')`; supertest 403 case for moderator + 403 case for owner |
| **Audit-row orphan after status flip succeeds** | Repudiation (acceptable risk) | Follow-up `ModerationLog.create(...)` wrapped in try/catch with `'moderation_audit_orphan'` structured log on failure; status flip NOT rolled back (audit is forward-fit observability per D-18; rare orphan acceptable) |

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Atomic status flip with race-safety | Custom transaction wrapper | Mongoose `findOneAndUpdate({_id, status: <expected>}, {$set})` | Phase 3 MOD-15 set this precedent; Mongo's atomic findOneAndUpdate is the only mechanism that catches concurrent writes without transactions |
| ReasonCode allowlist validation | Custom enum-validation helper | Reuse exported `VALID_REJECT_CODES` from `moderationRoutes.js:54` | Single source of truth; Phase 3 already exports the const |
| Modal with chip + note + Submit | Custom bottom-sheet primitive or generic `<ReasonCodeModal>` wrapper | Fork `<RejectListingModal>` per D-08 | Locked decision; preserves single-purpose copy/identity per PATTERN A |
| Audit-row insert atomicity | Mongoose transactions | Follow-up `ModerationLog.create(...)` with try/catch + structured orphan log | D-18 + Phase 3 D-10 — audit is forward-fit observability, not load-bearing |
| Bilingual locale lookup with parity check | Custom JSON loader | Existing `t(language, key, params)` from `src/locales/index.ts` + `bash scripts/check-i18n-parity.sh` | M1-shipped infrastructure; tsc enforces type-level parity |
| Role check primitive | Custom permissions library | Existing `useRole.canFromUser(user, action)` + `<Gated action="...">` | Phase 1 ROLE-04 + ROLE-07 already shipped; Phase 4 just adds 3 cases to the switch |
| 409 race UX flow | Custom toast queue | Existing `Alert.alert(t('moderation.race.title'), t('moderation.race.toast'))` + `refetchProperty()` | Phase 3 PATTERNS §C set the precedent; PropertyDetailsScreen has the analog at lines 292-297 |
| Owner-vs-mod ownership gate | Custom middleware | Inline check `req.user.uid === property.ownerUid` (mirrors existing `propertyRoutes.js:362,555`) | Codebase pattern is inline ownership checks for owner-only routes; no middleware abstraction exists |

## Common Pitfalls

### Pitfall 1: Adding `archivedReasonCode` field but missing the schema definition
**What goes wrong:** CONTEXT.md D-20 says "the `archivedReasonCode: String | null` field already exists per Phase 2 D-21". It does not. Phase 4 planner sees the line, skips the schema add for `archivedReasonCode`, and the mod-archive route writes `archivedReasonCode: 'incomplete-info'` to a doc that has no schema field — Mongoose silently drops the value (HF-01-class regression).
**How to avoid:** Phase 4 plan-time read of `Property.js` schema BEFORE writing the migration / additive change. Add BOTH `archivedReasonCode: { type: String, default: null }` AND `archivedReasonNote: { type: String, default: null }` in the same diff.
**Warning signs:** Mod-archive supertest case checks `result.archivedReasonCode === 'incomplete-info'` and gets undefined; HF-01-style "field silently dropped" symptom.

### Pitfall 2: Forgetting to delete the inline ownership check in DELETE /:id when middleware-swapping to admin-only
**What goes wrong:** The existing `DELETE /api/properties/:id` at `propertyRoutes.js:545-578` has both `verifyFirebaseToken` middleware AND an inline `if (property.ownerUid !== req.firebaseUid)` ownership check at lines 554-557. D-04 swaps the middleware to `requireMinRole('admin')`. If the inline check stays, admins (who don't own the listing) get 403 even with the right role.
**How to avoid:** D-04 task includes BOTH the middleware swap AND the inline-ownership-check deletion. Test case: admin hard-deletes a listing with `ownerUid !== adminUid` → expect 200, not 403.
**Warning signs:** Supertest `admin hard-delete returns 200` fails with 403 message "Access denied. You can only delete your own listings."

### Pitfall 3: Locale-key VALUE rewrite without verification
**What goes wrong:** D-12 rewrites 5 locale-key VALUES while preserving NAMES. The bash parity gate only checks NAME parity, and tsc only checks key-presence. A Phase 4 commit can land with a stale value (e.g., the old "Restore this listing to Drafts? You'll need to re-publish" copy still in `en.ts:164`) that breaks the ARCH-04 user expectation but passes all gates.
**How to avoid:** Plan-checker phase grep for the expected NEW value snippets (e.g., `grep "moderation queue for review" src/locales/en.ts` should match the new `unarchiveDialogMessage`). Add value-presence assertion as a code-review checklist item.
**Warning signs:** Manual QA mod-archives a listing → owner restores → still sees the old "to Drafts" copy.

### Pitfall 4: PropertyCard `onUnarchive` prop wired but D-13 conditional gate missing
**What goes wrong:** RenterListingsScreen passes `onUnarchive={handleUnarchiveProperty}` unconditionally to PropertyCard. An owner viewing a mod-archived listing in their Archived tab sees the Restore button, taps it, gets 403 from the backend (D-13 owner-restore gate) — bad UX. The button should be hidden entirely when `archivedByUid !== ownerUid`.
**How to avoid:** D-13 task wires `canSelfRestore = property.archivedByUid === user?.localId` and passes `onUnarchive={canSelfRestore(item) ? handleUnarchiveProperty : undefined}`. PropertyCard's existing JSX pattern `{isArchived && onUnarchive && <button>}` handles the absence cleanly.
**Warning signs:** Manual QA: log in as owner, locate a mod-archived listing in Archived tab → Restore button visible → tap → 403 toast.

### Pitfall 5: App.tsx LOC drift sneaks past D-19 net-zero claim
**What goes wrong:** D-19 claims App.tsx is 1178 LOC with a net-zero target. Actual current LOC is **1191** (+13 drift from CONTEXT.md). The planner accepts D-19 verbatim, doesn't notice the drift, and adds another 30 LOC for a forgotten state cluster. App.tsx ends at ~1220 LOC, well past the 1180 hard ceiling, with no remediation.
**How to avoid:** Plan-time `wc -l App.tsx` to lock the actual baseline; treat the soft cap as signal-not-block per Phase 2 PATTERN D, but document the drift in plan SUMMARY. Phase 4 truly needs ZERO new App.tsx state per D-19 — verify by greppping the proposed plan diff for `useState` / `OVERLAY_FLAGS` additions.
**Warning signs:** Plan diff shows new `useState(...)` in App.tsx; new entries in OVERLAY_FLAGS array; new back-handler branches.

### Pitfall 6: Hard-delete admin-only middleware swap breaks owner-side flow that no longer exists
**What goes wrong:** Phase 2's owner-side hard-delete (DeletePropertyModal mounted in RenterListingsScreen) is now the broken middleware path. If the planner doesn't strip the owner-side mount per D-10 + D-14, the owner taps Delete → modal opens → confirms → 403 from backend. Or worse: the owner-side flow is half-stripped (handler removed, JSX still present), causing a runtime error.
**How to avoid:** D-10 + D-14 strip MUST be atomic — same commit removes `handleDeleteProperty` + `confirmDelete` handlers + `propertyToDelete` state + `deleteModalVisible` state + `<DeleteListingModal>` mount + `onDelete` prop on PropertyCard. Plan-time grep `grep -n "handleDeleteProperty\|propertyToDelete\|DeleteListingModal" RenterListingsScreen.tsx` should return 0 after the strip.
**Warning signs:** Supertest unaffected (no client tests); manual QA: owner views Archived tab → no Delete button visible (correct) AND owner does not see any orphan UI elements.

### Pitfall 7: New ArchiveListingModal forgets to use `useTheme()` for chip selected-state contrast
**What goes wrong:** `RejectListingModal.tsx:94` has a subtle dark-mode color: `selectedTextColor = isDark ? '#121212' : '#FFFFFF'`. A casual fork that drops this line gives `colors.primary` background + `colors.text` foreground, which has poor contrast in dark mode (light theme primary is dark, light theme text is dark = invisible chip label).
**How to avoid:** D-08 fork is verbatim copy with only the 3 t() call swaps. Don't refactor visual logic during the fork.
**Warning signs:** Dark-mode chip labels invisible during manual QA.

## Code Examples

### Atomic owner-archive route handler (D-01)
```javascript
// JayTap-services/src/routes/propertyRoutes.js — NEW HANDLER
// Source: mirrors moderationRoutes.js:143-206 (POST /properties/:id/reject) for race-safety pattern
router.post('/:id/archive', verifyFirebaseToken, async (req, res) => {
  try {
    const now = new Date();
    const result = await Property.findOneAndUpdate(
      { _id: req.params.id, ownerUid: req.firebaseUid, status: { $ne: 'archived' } },
      { $set: { status: 'archived', archivedAt: now, archivedByUid: req.firebaseUid, archivedReasonCode: null, archivedReasonNote: null } },
      { new: true }
    );
    if (!result) {
      const property = await Property.findById(req.params.id);
      if (!property) return res.status(404).json({ message: 'Property not found' });
      if (property.ownerUid !== req.firebaseUid) return res.status(403).json({ message: 'Access denied. You can only archive your own listings.' });
      return res.status(409).json({ code: 'ALREADY_ARCHIVED', message: 'This listing is already archived.' });
    }
    try {
      await ModerationLog.create({
        actorUid: req.firebaseUid, action: 'archive', targetType: 'property', targetId: result._id,
        before: {}, after: { status: 'archived' }, reasonCode: null, reasonNote: null, at: now,
      });
    } catch (auditErr) {
      console.error(JSON.stringify({ evt: 'moderation_audit_orphan', action: 'archive', targetId: String(result._id), actorUid: req.firebaseUid, err: auditErr.message, ts: new Date().toISOString() }));
    }
    return res.json(result);
  } catch (err) {
    console.error('Error owner-archiving listing:', err);
    return res.status(500).json({ message: err.message });
  }
});
```

### `useRole.ts` Action union + canFromUser switch extension (D-16)
```typescript
// src/hooks/useRole.ts — diff
export type Action =
  | 'editVerifications'
  | 'editMatterportUrl'
  | 'editPanoramicUrl'
  | 'manageListings'
  | 'editAnyListing'
  | 'approveListings'
  | 'promoteToModerator'
  | 'reviewLandlordApplications'
  | 'viewModerationQueue'
+ | 'archiveOwnListing'         // ARCH-05 (any authenticated user)
+ | 'archiveAnyListing'         // ARCH-05 (mod + admin)
+ | 'hardDeleteListing';        // ARCH-05 (admin only)

export function canFromUser(user: any, action: Action): boolean {
  const role = deriveRole(user);
  switch (action) {
    case 'editVerifications':
    case 'editMatterportUrl':
    case 'editPanoramicUrl':
    case 'promoteToModerator':
    case 'reviewLandlordApplications':
+   case 'hardDeleteListing':
      return role === 'admin';
    case 'editAnyListing':
    case 'approveListings':
    case 'viewModerationQueue':
+   case 'archiveAnyListing':
      return role === 'admin' || role === 'moderator';
+   case 'archiveOwnListing':
+     return role !== 'guest' && !!user?.backendProfile;
    case 'manageListings':
      // ... unchanged Phase 4.5 capability gate
  }
}
```

### `<ArchiveListingModal>` — 3-line copy diff from RejectListingModal
```typescript
// src/components/ArchiveListingModal.tsx — NEW FILE
// Source: forked from src/components/RejectListingModal.tsx per CONTEXT.md D-08
//
// Diff from RejectListingModal:
//   1. component name + filename + default export
//   2. t('moderation.reject.modalTitle') → t('moderation.archive.modalTitle')
//   3. t('moderation.reject.submit') → t('moderation.archive.submit')
//   (4. notePlaceholder + chip-label keys REUSED — no duplication per CONTEXT.md <specifics>)
//
// Parent (PropertyDetailsScreen) owns the HTTP call:
//   onSubmit={async ({ reasonCode, reasonNote }) =>
//     await PropertyService.archiveAnyListing(property.id, reasonCode, reasonNote)
//   }
```

### Manual QA matrix row example
```
| Step | Device | Tester role | Action | Expected outcome |
|------|--------|-------------|--------|------------------|
| 1 | iPhone 15 Pro Max | owner (plain user) | Tap Archive button on PropertyCard in Live tab | Alert.alert opens with t('property.archiveDialogMessage'); tap Archive → toast "Listing archived"; listing moves to Archived tab |
| 2 | iPhone 15 Pro Max | owner | Open Archived tab → tap own self-archived listing → footer | NO Hard Delete button; Restore button visible (D-13 canSelfRestore=true); no Archive button (status === 'archived') |
| 3 | iPhone 15 Pro Max | moderator | Open mod-archived listing via deep-link | Restore button visible; Archive button hidden; tap Restore → confirm dialog → listing flips to pending; visible in moderator's queue |
| 4 | iPhone 15 Pro Max | moderator | Open same listing as owner (separate device) | Restore button HIDDEN per D-13 (archivedByUid !== ownerUid); read-only state |
| 5 | iPhone 15 Pro Max | admin | Open archived listing → tap Hard Delete | DeletePropertyModal opens with audit-log warning copy; confirm → toast "Listing permanently deleted"; ModerationLog row written with full before-snapshot |
```

## Open Questions / tensions (RESOLVED)

> All 6 questions below are RESOLVED at plan-time. The "Recommendation:" line for each is implemented in the named PLAN.md task; verify against `04-0X-PLAN.md` before execution.

### Q1: `archivedReasonCode` schema field — CONTEXT.md says present, source says absent
**What we know:** CONTEXT.md D-20 states "The `archivedReasonCode: String | null` field already exists per Phase 2 D-21 (no enum constraint at schema level — code constrains via `VALID_REJECT_CODES` const reuse per D-02)." Source at `JayTap-services/src/models/Property.js:36-50` lists only `archivedAt` + `archivedByUid` after the audit-fields block. **No `archivedReasonCode`. No `archivedReasonNote`.**
**What's unclear:** Whether Phase 2 intended to add `archivedReasonCode` and missed it (Phase 2 STATE row is closed per ROADMAP.md), or whether CONTEXT.md misframed.
**RESOLVED — Recommendation:** Phase 4 plan adds BOTH `archivedReasonCode` AND `archivedReasonNote` to the Property schema in the same additive diff. Treat D-20 as the spec; the schema gap is just a Phase 2 oversight, not a re-decision. **Implemented in:** `04-01-PLAN.md` Task 1.

### Q2: PropertyCard `onUnarchive` prop already wired — D-11 misframed
**What we know:** CONTEXT.md D-11 says "Phase 4 adds: `onUnarchive` (renders the existing emerald-styled 'restorative' button at PropertyCard.tsx:480 with copy from `t('property.unarchive')`)." Source at `PropertyCard.tsx:33` already has `onUnarchive?: (property: Property) => void` declared, and lines 233-243 render the button conditional on `isArchived && onUnarchive`. **Prop is fully wired in source today.**
**What's unclear:** Whether D-11 means the WIRE (already done — Phase 2 stripped from JSX caller side, not from PropertyCard component) or the prop (already done in component).
**RESOLVED — Recommendation:** Plan-time interpretation: D-11 work happens in **RenterListingsScreen.tsx** (the parent that needs to re-pass `onArchive` + `onUnarchive` props in its `<PropertyCard>` invocation at lines 313-321) and **HospitalitySection.tsx** (verify same). PropertyCard itself is untouched. **Implemented in:** `04-07-PLAN.md` Task 2 (callback re-mount only — no PropertyCard.tsx changes).

### Q3: LOC numbers in CONTEXT.md drift from actual files
**What we know:** CONTEXT.md cites:
- App.tsx 1178 LOC → actual 1191 LOC (+13)
- PropertyDetailsScreen 2122 LOC → actual 2131 LOC (+9)
- RenterListingsScreen 458 LOC → actual 463 LOC (+5)
- PropertyCard 492 LOC → actual 495 LOC (+3)
- RejectListingModal 209 LOC → actual 209 LOC (✓; minor: file is 208 lines + 1 trailing newline, both readings valid)
**What's unclear:** Why drift exists (some files may have had post-Phase-3 close commits not reflected in CONTEXT.md).
**RESOLVED — Recommendation:** Plan-time `wc -l` to lock actual baselines; flag any LOC budget conflicts (D-19 1180 hard ceiling) at plan time. **Implemented in:** `04-07-PLAN.md` (Task 3 + acceptance criteria reference 1191 baseline; D-19 net-zero target locked at 1191, not 1178).

### Q4: Owner-restore route should it return the disambiguated 403/404/409, or collapse to one code?
**What we know:** D-01 enumerates returns 200 / 403 (not owner) / 404 / 409 (already archived). D-13's owner-restore gate is `req.user.uid === property.ownerUid AND property.archivedByUid === property.ownerUid` — that's TWO conditions; the second one is the 403 case for "owner trying to restore mod-archived listing." If the planner uses `findOneAndUpdate({_id, ownerUid: req.firebaseUid, archivedByUid: req.firebaseUid, status: 'archived'}, ...)`, a `null` result conflates 4 scenarios: not-found / not-owner / mod-archived / not-currently-archived.
**What's unclear:** Whether to disambiguate via follow-up `findById` read (per the example pattern earlier in this research) or accept a single 403 code with generic message.
**RESOLVED — Recommendation:** Disambiguate for owner-restore — the UX cost of a generic 403 is real (owner can't tell why their button failed). Mirror the example pattern in "Backend route patterns" section above. **Implemented in:** `04-02-PLAN.md` Task 2 (handler runs `Property.findById(req.params.id)` after null `findOneAndUpdate` result, with 4 distinct branches: 404 not-found / 403 not-owner / 403 mod-archived / 409 not-currently-archived).

### Q5: Should the moderation log `before` field be empty or a snapshot for owner-archive?
**What we know:** D-18 says "follow-up insert ... `before: <pre-update snapshot>`". For owner-archive, the pre-update snapshot would be the listing's previous status (live / pending / rejected). The owner-archive `findOneAndUpdate` uses `status: { $ne: 'archived' }` — Mongo can't return the pre-update value with `{new: true}`. Two options: (a) follow `{new: false}` to get pre-update doc (read overhead is negligible for a single doc); (b) accept `before: {}` for owner-archive since the action verb itself signals the lifecycle.
**RESOLVED — Recommendation:** Use `{new: false}` (or a separate `findById` before the update) to capture pre-update status. Audit value > 1-roundtrip overhead. Phase 3's `edit-on-behalf` handler at moderationRoutes.js:278 already does this pattern with `Property.findById(propertyId).lean()` before the update. **Implemented in:** `04-02-PLAN.md` + `04-03-PLAN.md` + `04-04-PLAN.md` (each route captures `before` via pre-update `Property.findById().lean()`).

### Q6: Hard-delete WHEN admin opens DeletePropertyModal vs WHEN admin confirms — single-confirm or double-confirm?
**What we know:** D-10 says reuse existing `<DeletePropertyModal>` (single-confirm). D-Claude-Discretion says "Hard-delete confirm copy intensity — recommend modeling after the existing `property.deleteDialogTitle` + adding a one-line warning sentence." Listed deferred: "DangerConfirmModal with type-listing-id-to-confirm — over-engineered."
**RESOLVED — Recommendation:** Single-confirm with augmented warning copy (prepend "PERMANENT — this action will be recorded in the audit log. " to existing `property.deleteDialogMessage`). The audit-log row IS the second-confirm equivalent (irrecoverable action + recorded). **Implemented in:** `04-07-PLAN.md` Task 3 (single-confirm DeletePropertyModal with audit-log warning prepended via locale rewrite in Task 1).

## Files to read at execution time

The planner's task instructions should include these read_first lists for downstream agents:

### Phase-level reading order (CONTEXT.md + this RESEARCH + canonical refs)
1. `.planning/phases/04-archive-lifecycle-owner-mod-admin/04-CONTEXT.md` (locked decisions)
2. `.planning/phases/04-archive-lifecycle-owner-mod-admin/04-RESEARCH.md` (this file)
3. `.planning/phases/04-archive-lifecycle-owner-mod-admin/04-DISCUSSION-LOG.md` (Q&A trail)
4. `.planning/REQUIREMENTS.md` lines 65-71 (ARCH-01..ARCH-05)
5. `.planning/ROADMAP.md` lines 105-116 (Phase 4 success criteria)
6. `./CLAUDE.md` (project hard rules — bilingual parity, useTheme, no Firebase SDK, MongoDB role authority)

### Backend implementation reading list
1. `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/routes/moderationRoutes.js` — full file (route patterns to mirror)
2. `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/routes/propertyRoutes.js:43-77` (GET filter), `:104-261` (POST), `:353-541` (PUT — D-22 archived guard at line 400-407), `:545-578` (DELETE)
3. `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/models/Property.js` — full file (schema additive)
4. `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/models/ModerationLog.js` — full file (action enum extension)
5. `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/middleware/verifyFirebaseToken.js` (`requireMinRole` helper signature)
6. `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/__tests__/moderationRoutes.test.js` — full file (supertest patterns)
7. `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/__tests__/setup.js` (in-memory Mongo bootstrap)
8. `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/__tests__/fixtures/jwks-tokens.js` (JWKS-mocked token builder — `buildToken({ sub, role, kind })`)

### Client implementation reading list
1. `/Users/beckmaldinVL/development/mobileApps/JayTap/src/hooks/useRole.ts` — full file (Action union + canFromUser switch)
2. `/Users/beckmaldinVL/development/mobileApps/JayTap/src/components/RejectListingModal.tsx` — full file (D-08 fork source)
3. `/Users/beckmaldinVL/development/mobileApps/JayTap/src/components/PropertyCard.tsx:22-275` (props + JSX action row)
4. `/Users/beckmaldinVL/development/mobileApps/JayTap/src/components/DeleteListingModal.tsx` — full file (D-10 mount-move source)
5. `/Users/beckmaldinVL/development/mobileApps/JayTap/src/components/Gated.tsx` — full file (gating wrapper)
6. `/Users/beckmaldinVL/development/mobileApps/JayTap/src/services/PropertyService.ts:217-432` (broken `archiveProperty` / `unarchiveProperty` / `deleteProperty` to rewrite + Phase 3 moderation methods to mirror)
7. `/Users/beckmaldinVL/development/mobileApps/JayTap/src/screens/RenterListingsScreen.tsx` — full file (D-09 + D-10 + D-11 + D-14 changes target this single file)
8. `/Users/beckmaldinVL/development/mobileApps/JayTap/src/screens/PropertyDetailsScreen.tsx:78,96-110,260-356,1316-1390,2106-2130` (D-06 footer extension targets)
9. `/Users/beckmaldinVL/development/mobileApps/JayTap/src/components/HospitalitySection.tsx` — full file (verify prop signature for `onUnarchive`)
10. `/Users/beckmaldinVL/development/mobileApps/JayTap/src/types/Property.ts` — full file (add `archivedAt` / `archivedByUid` / `archivedReasonCode` / `archivedReasonNote` fields if Phase 4 client reads them)
11. `/Users/beckmaldinVL/development/mobileApps/JayTap/src/locales/en.ts:136-172,589-613` (existing archive + moderation keys)
12. `/Users/beckmaldinVL/development/mobileApps/JayTap/src/locales/ru.ts` (parallel keys — same line ranges roughly)
13. `/Users/beckmaldinVL/development/mobileApps/JayTap/scripts/check-i18n-parity.sh` — full file (parity gate)
14. `/Users/beckmaldinVL/development/mobileApps/JayTap/src/hooks/__tests__/useRole.test.ts` (extend with 3-6 new cases)
15. `/Users/beckmaldinVL/development/mobileApps/JayTap/App.tsx` — full file ONLY IF the planner suspects D-19 net-zero needs verification at plan-time

### Auto-memory cross-references (load via Memory tool or read pointer files)
- `phase45-landlord-application-uid-mismatch-bug.md` — actorUid invariant lessons
- `gsd-verifier-misses-regressions.md` — verifier+reviewer paired-gate discipline
- `backend-repo-location.md` — backend at `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services`
- `backend-node-version.md` — `nvm use 24` for backend (node ≥22.12)
- `no-firebase-sdk.md` — RN client repo rule
- `identity-vs-user-store.md` — Firebase = identity proof, MongoDB = role authority

## Sources

### Primary (HIGH confidence)
- CONTEXT.md verbatim D-XX decisions (locked) — `/Users/beckmaldinVL/development/mobileApps/JayTap/.planning/phases/04-archive-lifecycle-owner-mod-admin/04-CONTEXT.md`
- Live source files (verified via Read tool 2026-05-02):
  - `JayTap-services/src/routes/moderationRoutes.js` (448 LOC) — Phase 3 mod-route patterns
  - `JayTap-services/src/routes/propertyRoutes.js` (581 LOC) — Phase 2 D-22 PUT sanitizer + DELETE archived precondition
  - `JayTap-services/src/models/Property.js` (92 LOC) — schema state
  - `JayTap-services/src/models/ModerationLog.js` (32 LOC) — action enum
  - `JayTap-services/src/__tests__/moderationRoutes.test.js` (220+ LOC viewed) — supertest patterns
  - `JayTap/src/components/RejectListingModal.tsx` (208 LOC) — D-08 fork source
  - `JayTap/src/components/PropertyCard.tsx` (495 LOC) — onArchive/onUnarchive already wired
  - `JayTap/src/screens/RenterListingsScreen.tsx` (463 LOC) — handler rewire targets
  - `JayTap/src/screens/PropertyDetailsScreen.tsx` (2131 LOC) — Phase 3 footer at lines 1316-1376
  - `JayTap/src/services/PropertyService.ts` (432 LOC) — broken stubs + Phase 3 methods
  - `JayTap/src/hooks/useRole.ts` (126 LOC) — Action union + canFromUser switch
  - `JayTap/src/components/Gated.tsx` (24 LOC) — gating wrapper
  - `JayTap/src/components/DeleteListingModal.tsx` (207 LOC) — D-10 mount-move source
  - `JayTap/scripts/check-i18n-parity.sh` (28 LOC) — parity gate
  - `JayTap/src/locales/en.ts` (selected ranges) — existing keys

### Secondary (MEDIUM confidence — derived from CONTEXT.md + Phase 3 SUMMARY)
- Phase 3 PATTERNS.md references (§A belt-and-suspenders, §B race-safety, §C 409 race UX, §D actorUid, §G audit follow-up insert, §H mass-assignment whitelist) — referenced via CONTEXT.md and `moderationRoutes.js` inline comments
- Phase 3 ROADMAP closure summary (Phase 3 complete with 18 supertest cases) — verified via ROADMAP.md line 102

### Tertiary (LOW confidence — out of session scope)
- HospitalitySection prop signature exact match — file viewed in directory listing only (4008 bytes), full content not read in this session; planner verifies during plan execution
- AuthContext shape for `user.localId` access pattern — derived from existing usages in RenterListingsScreen.tsx; planner verifies the type definition

## Metadata

**Confidence breakdown:**
- Backend route patterns: HIGH (Phase 3 source viewed end-to-end; mod-routes.test.js patterns viewed; analog handlers identified line-for-line)
- Client component patterns: HIGH (RejectListingModal + PropertyCard + DeleteListingModal + Gated + useRole + RenterListingsScreen + relevant slices of PropertyDetailsScreen + PropertyService all viewed; tensions surfaced)
- Schema/audit: HIGH (Property.js + ModerationLog.js viewed full file; archivedReasonCode tension flagged)
- Validation Architecture: HIGH (existing supertest harness shape viewed; Phase 4 deltas mapped per requirement)
- App.tsx LOC budget: MEDIUM (D-19 framing matches Phase 3 PATTERN D precedent, but live LOC drift +13 from CONTEXT.md cited number)
- Locale parity gate: HIGH (script viewed; existing keys grep'd)
- Open questions: HIGH (5 distinct tensions identified with concrete recommendations)

**Research date:** 2026-05-02
**Valid until:** 2026-05-09 (one week — Phase 4 should plan/execute within this window; longer drift risks Phase 3 source changes invalidating the line-number references)

# Phase 4: Archive Lifecycle (Owner + Mod/Admin) - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-02
**Phase:** 04-archive-lifecycle-owner-mod-admin
**Areas discussed:** Backend route & API surface; Mod/admin archive surface; UI primitives & destructive UX; Restore semantics & owner cleanup path

---

## Gray Area Selection

| Option | Description | Selected |
|--------|-------------|----------|
| Backend route & API surface | Owner/mod endpoint split; restore shape; route file placement; PropertyService method signatures | ✓ |
| Mod/admin archive surface | PropertyDetailsScreen footer vs queue extension vs new screen; mod restore behavior | ✓ |
| UI primitives & destructive UX | Modal reuse vs split; owner archive Alert.alert; admin hard-delete confirm; PropertyCard prop API | ✓ |
| Restore semantics & owner cleanup path | Restore copy rewrite; who-can-restore rule; owner permanent-delete escape hatch; audit-field clears | ✓ |

**User selected:** All 4 areas.

---

## Backend route & API surface

### Q1: How should the owner-archive endpoint be shaped?

| Option | Description | Selected |
|--------|-------------|----------|
| POST /api/properties/:id/archive (Recommended) | Dedicated owner-archive route in propertyRoutes.js. Mirrors Phase 3 moderation-action shape + Phase 2 D-22 sanitizer invariant. Symmetric POST /unarchive. Race-safe findOneAndUpdate. | ✓ |
| Extend PUT /api/properties/:id with status whitelist | Re-allow body.status='archived' from owner via Phase 2 sanitizer carve-out. Reverses Phase 2's "no body-status from owner" rule. | |
| PATCH /api/properties/:id/status with action verb body | Single route handles all owner status transitions via {action: 'archive'|'restore'} body. Drifts from Phase 3 "one verb per route" precedent. | |

**User's choice:** POST /api/properties/:id/archive (Recommended).

### Q2: Where do mod/admin archive + restore endpoints live?

| Option | Description | Selected |
|--------|-------------|----------|
| moderationRoutes.js (Recommended) | POST /api/moderation/properties/:id/archive (with reasonCode) + POST /api/moderation/properties/:id/restore. Consistent with Phase 3 D-13 namespacing. | ✓ |
| Same propertyRoutes.js as owner archive (single file) | One handler holds both code paths; couples mod-only reasonCode validation with owner's no-reason path. | |
| Hybrid — archive in moderationRoutes, restore in propertyRoutes | Asymmetric; breaks the "archive surfaces are sibling routes" mental model. | |

**User's choice:** moderationRoutes.js (Recommended).

### Q3: Should hard-delete (DELETE /api/properties/:id) move under /api/moderation/* or stay where it is?

| Option | Description | Selected |
|--------|-------------|----------|
| Stay at DELETE /api/properties/:id, gate via requireMinRole('admin') (Recommended) | One-line middleware swap; existing route already wired in PropertyService + apiClient.delete. Audit row appended. | ✓ |
| Move to DELETE /api/moderation/properties/:id (admin-only namespace) | Cleaner namespace but churns more code than necessary. | |

**User's choice:** Stay at DELETE /api/properties/:id.

---

## Mod/admin archive surface

### Q1: Where can mods/admins reach the Archive + Restore actions?

| Option | Description | Selected |
|--------|-------------|----------|
| PropertyDetailsScreen footer only (Recommended) | Reuses Phase 3 D-02 "mods inspect like a renter" precedent. ZERO new screen architecture. ModerationQueueScreen stays pending-only. Discoverability of archived listings deferred to M3 admin search. | ✓ |
| Extend ModerationQueueScreen with status filter chips | Adds filter row + query-param branch + ~80 LOC. Queue mental model dilutes. | |
| Full mod-only browse — separate ModeratedListingsScreen overlay | Most expressive but adds OVERLAY_FLAGS + new screen + Profile row + App.tsx LOC pressure. | |

**User's choice:** PropertyDetailsScreen footer only (Recommended).

### Q2: When mod restores an archived listing, what's the behavior?

| Option | Description | Selected |
|--------|-------------|----------|
| Same as owner restore — transitions to pending, audit row written (Recommended) | ARCH-04 verbatim: restore goes to 'pending' regardless of who restores. Mod-restored listings re-enter the queue. | ✓ |
| Mod-restore goes directly to 'live' (skip re-moderation) | Violates ARCH-04 invariant; foot-gun risk. | |
| Mod-restore opens a confirm with status choice (live or pending) | Most flexible, most clicks; over-engineered for small mod team. | |

**User's choice:** Same as owner restore (Recommended).

---

## UI primitives & destructive UX

### Q1: How should the mod/admin Archive-with-reason modal be built?

| Option | Description | Selected |
|--------|-------------|----------|
| New <ArchiveListingModal> forked from RejectListingModal (Recommended) | ~150 LOC duplication; each modal stays single-purpose and copy-bound to its action verb. PATTERN A precedent. | ✓ |
| Parametrize RejectListingModal with action='reject'|'archive' prop | Saves duplication but creates magic-prop coupling and ambiguous identity. | |
| Generic <ReasonCodeModal> primitive + thin wrappers | Cleanest but requires refactoring shipped Phase 3 RejectListingModal — premature abstraction. | |

**User's choice:** New <ArchiveListingModal> forked from RejectListingModal (Recommended).

### Q2: Owner archive UX — keep Alert.alert or upgrade?

| Option | Description | Selected |
|--------|-------------|----------|
| Keep Alert.alert (existing handleArchiveProperty) (Recommended) | Owner archive is no-reason per ARCH-01 — native confirm is the right primitive (Phase 3 D-05 precedent). Zero new component work. | ✓ |
| Upgrade to a styled BottomSheet confirm | Custom component for one no-reason dialog — work without proportional benefit. | |

**User's choice:** Keep Alert.alert (Recommended).

### Q3: Admin hard-delete confirm — reuse existing DeletePropertyModal or upgrade?

| Option | Description | Selected |
|--------|-------------|----------|
| Reuse existing DeletePropertyModal (Recommended) | Move modal mount + confirmDelete handler from RenterListingsScreen → PropertyDetailsScreen with admin gate. Component itself unchanged. | ✓ |
| Build a new DangerConfirmModal with double-confirm (type-listing-id) | Over-engineered for small admin team. | |
| Upgrade existing DeletePropertyModal with admin-context warning copy | Light touch; sets expectation without new component work. | |

**User's choice:** Reuse existing DeletePropertyModal (Recommended). Note: D-10 in CONTEXT.md combines option 1 + option 3 (reuse the modal AND augment copy with audit-log warning).

### Q4: PropertyCard prop API — how does it know whether to render Archive vs Restore vs Delete?

| Option | Description | Selected |
|--------|-------------|----------|
| Parent-driven via existing onArchive/onDelete props + status branching (Recommended) | Card stays presentational; parent decides intent. Adds onUnarchive prop for symmetry. | ✓ |
| PropertyCard auto-derives actions from useRole() + property.status internally | Breaks presentational convention; adds context coupling. | |
| Single 'actions' prop array — parent passes the buttons explicitly | Most flexible, most parent code. Refactors existing 4 onX prop API. | |

**User's choice:** Parent-driven via existing onArchive/onDelete props + status branching (Recommended).

---

## Restore semantics & owner cleanup path

### Q1: Restore confirm copy — how should we frame the re-moderation flow to owners?

| Option | Description | Selected |
|--------|-------------|----------|
| Direct 'goes back to moderation queue' framing (Recommended) | EN: 'Restore this listing? It will go back to the moderation queue for review before becoming public again.' Sets queue expectation cleanly. | ✓ |
| Soft 'submit again for review' framing | Avoids word 'queue' but obscures the timing expectation. | |
| Minimal 'restore listing' framing — don't mention re-moderation | Lighter copy; relies on Pending tab to set expectation. | |

**User's choice:** Direct 'goes back to moderation queue' framing (Recommended).

### Q2: Who can restore an archived listing?

| Option | Description | Selected |
|--------|-------------|----------|
| Owner can restore listings they archived themselves; mod/admin can restore any (Recommended) | Backend rule: req.user.uid === property.ownerUid AND property.archivedByUid === property.ownerUid. Prevents mod-archive bypass. | ✓ |
| Owner can restore any of their archived listings (regardless of who archived) | Simpler permission model; defeats ARCH-04 'prevents post-rejection bypass' design intent. | |
| Owner restore needs mod/admin re-approval (no autonomous owner-restore) | Adds workflow + new screen + endpoints + new status. Big scope expansion; out of M2. | |

**User's choice:** Owner can restore self-archived only; mod/admin restores any (Recommended).

### Q3: Owner's 'permanently delete' escape hatch — hard-delete is now admin-only per ARCH-05. What do owners do?

| Option | Description | Selected |
|--------|-------------|----------|
| Stay archived in their library indefinitely; no in-app delete path for owners (Recommended) | Strip handleDeleteProperty + DeletePropertyModal entirely from RenterListingsScreen. ARCH-03 says archived stays visible to owner; storage is cheap. | ✓ |
| Owner can hard-delete only their own archived listings | Carve-out weakens ARCH-05 'admin-only' clarity; orphan-audit-row risk. | |
| In-app 'request deletion' button — sends a notification to admin | Big new surface (deletionRequest model + admin queue + endpoints). Defer to M3. | |

**User's choice:** Stay archived in their library indefinitely; no in-app delete path for owners (Recommended).

### Q4: On restore (archived → pending), which audit fields get cleared?

| Option | Description | Selected |
|--------|-------------|----------|
| Clear archivedAt + archivedByUid + archivedReasonCode + archivedReasonNote; preserve approve/reject history (Recommended) | Mirrors Phase 2 D-22 (rejected→pending edit-resubmit clears rejection fields). submittedAt re-stamped to now() for FIFO re-queue. | ✓ |
| Clear ALL audit fields — pristine re-entry to queue | Loses prior context that might be relevant for moderator. | |
| Clear nothing — leave all audit fields populated | Confusing for mods; UI banners may misfire. | |

**User's choice:** Clear archive fields only; preserve approve/reject history (Recommended).

---

## Closing prompt

| Option | Description | Selected |
|--------|-------------|----------|
| I'm ready for context | Write 04-CONTEXT.md with the 13+ decisions captured. | ✓ |
| Explore more gray areas | Identify 2-4 additional gray areas (test coverage, App.tsx LOC, race-condition matrix, locale naming). | |

**User's choice:** I'm ready for context.

---

## Claude's Discretion (locked in CONTEXT.md)

- Archive Modal visual treatment (chip styling, modal positioning, animation)
- Hard-delete confirm copy intensity (planner picks final wording for the audit-log warning)
- 409 toast copy for archive races (reuse Phase 3 moderation.race.toast OR add archive-specific copy)
- PropertyService method signatures (recommended 4 explicit methods matching Action union)
- Backend test coverage scope (recommended 10-15 supertest cases; planner picks exact case set)
- PropertyCard onUnarchive prop wiring on HospitalitySection (verify pass-through)

## Deferred Ideas

See CONTEXT.md `<deferred>` section for the full list (M3 admin search, owner request-deletion workflow, ModerationQueueScreen status filter, separate ModeratedListingsScreen, push notifications, bulk actions, lease-based locking, in-app moderation messaging, DangerConfirmModal, RejectListingModal parametrization, generic ReasonCodeModal, custom BottomSheet for owner archive, PropertyCard auto-derivation, PropertyCard actions[] refactor, restore-with-status-choice modal, separate restore Action members, M3+ moderation log audit screen, crash reporting).

# Admin Live-Listing Actions — Design

**Date:** 2026-05-27
**Status:** Approved (brainstorm)
**Author:** beckinfonet + Claude
**Milestone target:** M5 or later (deferred to /gsd-new-milestone or /gsd-phase placement)

## Problem

Admins have no way to do three things on listings that are already approved and live:

1. **Add or edit media URLs** — specifically `media.tour3dUrl` (Matterport) and `media.tourPhotosUrl` (Ricoh/360°). These weren't always captured at submission; owners sometimes circle back later asking us to add them. Owners can't add them themselves (media curation is admin-only by design), and the existing `MediaCurationScreen` is only reachable from the pre-approval moderation queue.
2. **Suspend a live listing** — i.e. take it down. Backend supports this via `archiveAnyListing` (status flips to `archived`), but no admin UI surfaces the action from a live listing.
3. **Hard-delete a listing** — `PropertyService.hardDeleteListing(id)` exists and requires `status === 'archived'`. No UI calls it.

Today admins have no path to any of these from the app.

## Goals

- Admin can edit `media.tour3dUrl` and `media.tourPhotosUrl` on a live listing without re-publishing it
- Admin can suspend a live listing with a structured reason code (audit trail preserved)
- Admin can restore a suspended listing
- Admin can permanently delete a suspended listing through a typed-confirmation gate
- All actions are admin-only and gated through `useRole()`
- Zero impact on non-admin users; renters and owners see no change

## Non-goals

- Bulk admin actions (suspend N listings at once)
- Edit-history viewer (per-listing change log)
- Soft-delete with a grace period (backend doesn't model this)
- Owner-side ability to add tour URLs — explicitly out of scope; media curation stays admin-only
- Push notifications to owners when their listing is suspended
- Suspended-state visibility tweaks for owners beyond what already exists

## Architecture

No new dependencies. No new backend endpoints (pending one verification — see Open Questions).

### New components

| Path | Purpose |
|---|---|
| `src/components/AdminListingMenu.tsx` | Kebab/3-dot dropdown rendered in the `PropertyDetailsScreen` header. Visible when `useRole().can('editAnyListing')` (moderator or admin). Items: *Edit media…*, *Suspend* / *Restore*, *Manage listing…*. *Delete* item is rendered only when `useRole().can('hardDeleteListing')` (admin only). |
| `src/components/HardDeleteConfirmModal.tsx` | Destructive confirm modal with a typed-`DELETE` gate (case-sensitive). Calls `PropertyService.hardDeleteListing(id)` on confirm. |
| `src/screens/ListingAdminScreen.tsx` | Dedicated admin screen reached via *Manage listing…*. Shows status pill, `submittedAt` / `approvedAt` / `approvedByUid`, owner uid (copy-to-clipboard), archive metadata when archived. Renders the same three actions as full-width buttons. |

### Modified components

| Path | Change |
|---|---|
| `src/screens/MediaCurationScreen.tsx` | New `mode` value `'edit-live-media'`. In this mode: footer is a single primary "Save changes" button (no "Approve & publish"); photo-gate (`photoCount > 0`) is skipped; only the media-upsert endpoint is called; header title becomes "Edit media". |
| `src/screens/PropertyDetailsScreen.tsx` | Renders `<AdminListingMenu listingId={...} status={...} />` in the header when `useRole().can('editAnyListing')`. No other changes. |
| `App.tsx` | New state flags + callbacks following the existing `isMediaCurationOpen` pattern: `isListingAdminOpen` + `currentListingAdminId` + `openListingAdmin(id)`. Extends `openMediaCuration(id, mode)` so the same screen can be opened in either `edit-mod` (existing) or `edit-live-media` (new). |

### Reused, untouched

- `PropertyService.archiveAnyListing(id, reasonCode, note?)` — backend already stamps `archivedAt` / `archivedByUid` / `archivedReasonCode` / `archivedReasonNote`
- `PropertyService.restoreListing(id)` — auto-routes to the mod/admin endpoint based on role
- `PropertyService.hardDeleteListing(id)` — admin-only, requires `status === 'archived'`
- `ArchiveListingModal` — already gates the reasonCode picker; reused for suspend
- `useRole()` — `can('editAnyListing')`, `can('archiveAnyListing')`, `can('hardDeleteListing')` already wired

## Data flow

```
User taps kebab → AdminListingMenu opens
  ├─ "Edit media…"        → openMediaCuration(id, mode='edit-live-media')
  │                          → MediaCurationScreen overlay mounts
  │                          → on Save: POST /moderation/listings/:id/media
  │                          → onClose: refresh PropertyDetailsScreen media
  │
  ├─ "Suspend" (live)     → ArchiveListingModal opens with reason picker
  │                          → on Confirm: archiveAnyListing(id, reasonCode, note?)
  │                          → on success: refresh listing → status flips to 'archived'
  │                          → kebab now shows "Restore" + "Delete" enabled
  │
  ├─ "Restore" (archived) → confirm dialog (no reason needed)
  │                          → restoreListing(id) → status flips to 'live'
  │
  ├─ "Delete" (gated)     → DISABLED when status !== 'archived'
  │                          → enabled: HardDeleteConfirmModal opens
  │                          → user types "DELETE" → enables button
  │                          → hardDeleteListing(id)
  │                          → on success: pop PropertyDetailsScreen, return to list
  │
  └─ "Manage listing…"    → openListingAdmin(id)
                             → ListingAdminScreen overlay mounts
                             → same three actions, plus admin metadata
```

### State ownership

- All overlay open/close flags live in `App.tsx` — same pattern as the existing `isMediaCurationOpen` / `currentMediaCurationListingId`. Single source of truth; no prop-drilling between PropertyDetailsScreen and ListingAdminScreen.
- After any mutating action, the open screen re-fetches via `GET /properties/:id`. ListingAdminScreen owns this internally. PropertyDetailsScreen already does it on focus.
- No optimistic UI. All three actions are destructive or near-destructive; wait for backend confirmation before flipping the UI. Loading state on each button while in-flight; toast on success, alert on error.

### Error paths

| Path | Behavior |
|---|---|
| Media save fails (network/timeout) | Stay on MediaCurationScreen, inline error banner, draft preserved |
| Archive fails | Modal stays open, error toast, draft preserved |
| Restore fails | Toast, retry button |
| Hard delete fails | Modal stays open with typed "DELETE" preserved, error toast |
| Listing already deleted (404) on any action | "This listing no longer exists" toast, close overlay, refresh list |
| Role lost mid-flow (e.g. token expired, demoted) | Backend 403 → "Permission denied" toast, close overlay, fall back to renter view |

The 403 path should align with how the M3 ROLE-11 carry-forward item (mid-action 403 recovery UX) lands when that work happens.

### Audit metadata

Backend stamps `archivedAt` / `archivedByUid` / `archivedReasonCode` / `archivedReasonNote` on archive. Hard delete removes the document entirely. No new audit fields on the client.

## Role gating summary

| Action | Required `useRole()` action |
|---|---|
| See admin kebab + Edit media + Suspend / Restore | `editAnyListing` (moderator + admin) |
| Suspend (archive) | `archiveAnyListing` (moderator + admin) |
| Hard delete | `hardDeleteListing` (admin only) |
| Edit `tour3dUrl` / `tourPhotosUrl` | covered by `editAnyListing`; existing `editMatterportUrl` / `editPanoramicUrl` actions are NOT used (those are admin-only and currently only matter pre-approval) |

Note: moderators get *Edit media*, *Suspend*, *Restore*, *Manage listing…* but not *Delete*. Delete is admin-only.

## Testing

Manual physical-device QA on iOS + Android per the project testing bar.

### Happy paths

1. Admin opens live listing → kebab visible → "Edit media…" → adds `tour3dUrl` + `tourPhotosUrl` → Save → returns to detail page → 3D Tour tile + 360° Photos tile render
2. Admin opens live listing → "Suspend" → picks reason `out_of_compliance` → confirm → status flips to archived; kebab now shows "Restore" + "Delete" enabled
3. Admin opens archived listing → "Restore" → confirm → back to live
4. Admin opens archived listing → "Delete" → types `DELETE` → confirm → returns to list, listing gone from backend
5. Admin opens "Manage listing…" → sees metadata → triggers same actions from that screen

### Role gates

6. Renter (non-admin) opens listing → no kebab
7. Moderator opens listing → kebab visible but "Delete" item not present

### Edge cases

8. Two admins act on same listing concurrently — second action receives 404 → "Listing no longer exists" toast
9. Admin's role revoked mid-edit → 403 on save → close overlay, return to renter view
10. Hard delete: button disabled until exactly `DELETE` (case-sensitive) typed; clearing text re-disables
11. MediaCurationScreen in `edit-live-media` mode never renders "Approve & publish" (regression check vs `edit-mod`)
12. Archived listing in renter's "My Listings" — still surfaces archive status, no admin kebab

### i18n

13. EN + RU parity for every new string: menu items, modal copy, confirm prompts, status pills, "type DELETE" gate

### Theme

14. Dark + light parity, no hardcoded colors

## Rollout

- No feature flag. Admin-only actions; small blast radius. Behind `useRole()` gates.
- No data migration. Reuses existing fields and endpoints.
- Single phase, ~4 plans (final shape decided in /gsd-plan-phase):
  1. Kebab menu + admin overflow wiring (PropertyDetailsScreen + AdminListingMenu + App.tsx state)
  2. `MediaCurationScreen` `edit-live-media` mode
  3. Suspend / Restore wiring (reuse ArchiveListingModal) + Hard delete confirm modal
  4. ListingAdminScreen (Manage listing…) — may fold into plan 1 if metadata view stays small

## Open questions for the planning phase

1. **Backend endpoint acceptance** — Does `POST /moderation/listings/:id/media` accept a listing whose `status === 'live'`? Today it's called during pre-approval. If the endpoint guards on status, we need either: (a) a one-line guard relaxation, or (b) a separate `POST /admin/listings/:id/media` route. Client design does not change either way. **Action:** verify against `JayTap-services` route handlers before sizing plan 2.
2. **Plan packaging** — Is "Manage listing…" worth its own plan, or fold into plan 1? Suggest folding unless the metadata view grows significant logic.

## Decisions made during brainstorm (auto-pick / user-confirmed)

| Decision | Choice | Source |
|---|---|---|
| Entry point | Kebab in `PropertyDetailsScreen` header + dedicated `ListingAdminScreen` reached via "Manage listing…" | User confirmed (options 1 + 3) |
| Suspend UX | Reuse `ArchiveListingModal` with reason codes | User confirmed |
| Media edit scope | Full `MediaCurationScreen` reused in new mode (photos + videos + URLs) | User confirmed |
| Delete flow | Two-step: Delete disabled until Suspended | User confirmed |
| Hard delete confirm | Type `DELETE` (case-sensitive) | Claude's discretion |
| State pattern | App.tsx flags, no react-navigation | Existing project convention |
| Optimistic UI | None | Claude's discretion (destructive actions) |

## References

- `src/screens/MediaCurationScreen.tsx` — existing media curation screen (mod-only pre-approval)
- `src/screens/PropertyDetailsScreen.tsx` — entry point host
- `src/services/PropertyService.ts:111–191` — archive / restore / hardDelete client methods
- `src/hooks/useRole.ts` — role gating
- `src/components/ArchiveListingModal.tsx` — reasonCode picker (reused)
- `App.tsx:91–92, 640–643, 1329–1346` — overlay state pattern to follow

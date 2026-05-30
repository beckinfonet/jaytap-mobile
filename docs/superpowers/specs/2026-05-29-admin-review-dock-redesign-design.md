# Spec — Admin Review Dock & Photo-Upload CTA Redesign

**Date:** 2026-05-29
**Status:** Awaiting user review
**Surface:** `src/screens/PropertyDetailsScreen.tsx` (admin/mod viewing a pending listing) + `src/components/NeedsMediaBanner.tsx`
**Source of design intent:** `photoUploadRedesign.zip` → `design_handoff_listing_review/README.md` (handoff calls the app "MoveIn" but it's a generic design-tool name — this is for JayTap)

## Problem

When an admin or mod opens a pending listing today, the bottom of the screen stacks too much:

- `NeedsMediaBanner` (small yellow "no photos yet — Add photos" card)
- Disabled-Approve hint text
- **Approve / Reject / Edit on behalf** (stacked vertically when 0 photos)
- **Archive / Delete** (separate row, full-strength reds and ambers)

That's 5 colored buttons + a banner CTA all on screen simultaneously, with no visible priority. The most common observed failure mode: **the admin clicks the wrong button by accident**, and there is no visual cue that "Add photos" must happen first.

## Goal

Establish a single, unambiguous action hierarchy for the admin review flow:

1. **Add photos** is the only primary CTA when no photos exist.
2. **Approve listing** is presented as the locked goal — visibly disabled until a photo exists, then promoted to the primary CTA.
3. **Reject / Edit on behalf / Archive / Delete** are demoted to a quiet secondary tier behind a single "More actions" disclosure.

This is **strictly an admin-facing UX/visual change**. No handlers change behavior, no backend changes, no role-gating changes, no flow changes for renters or owners. The MediaCurationScreen continues to own the actual photo upload UI.

## Non-Goals

- **Owner-facing listing creation:** untouched. Owners still upload photos during creation; this spec only restyles what an admin/mod sees when reviewing a pending listing.
- **`MediaCurationScreen` itself:** untouched. The dropzone CTA navigates to it; the curation screen's UI is reviewed and shipped.
- **Renter-facing details:** untouched. Header, hero carousel, attribute list, key stats, and map preview all stay exactly as a renter sees them.
- **Role gating logic:** `useRole().can('approveListings' | 'archiveAnyListing' | 'hardDeleteListing')` predicates stay identical; we only change which surfaces those predicates render into.
- **Backend / services / API:** no changes to `PropertyService.approveListing | rejectListing | archiveAnyListing | restoreListing | hardDeleteListing`. No new endpoints.
- **Any inline image-picker logic in `PropertyDetailsScreen`:** rejected (Approach B). Curation belongs in MediaCurationScreen.

## Theme-Token Mapping (the load-bearing translation)

The handoff prescribes specific hexes. CLAUDE.md / W6 conventions forbid hardcoded colors in components — only `useTheme()` tokens. Translation:

| Handoff role | Handoff value | Project token | Notes |
|---|---|---|---|
| Primary CTA fill (Approve, Add photos pill) | green `#36c98f` | `colors.success` | Already used by today's Approve button in the dock |
| Primary CTA on-text | `#04241a` (very dark green) | `colors.onAccent` | Existing token, returns white in both modes |
| Soft accent tint (dropzone hover bg, COVER badge bg) | `rgba(54,201,143,0.14)` | `colors.success` + alpha overlay applied inline | No new token needed |
| Destructive (Reject, Delete) | red `#ff4d4d` | `colors.error` | Today's reject/delete already use this |
| Warning eyebrow ("PENDING REVIEW") | amber `#f5a23a` | `colors.warning` | Existing amber token |
| Nav chrome accents (heart, pin) | pink `#ff5a6f` | `colors.accent` | M5 redesign already uses this for accent pills |
| Canvas / surface | `#0d0d10` / `#16161a` | `colors.background` / `colors.surface` | Close enough; ours is `#191A1D` / `#25282F` in dark |
| Hairlines | `rgba(255,255,255,0.07)` | `colors.border` | Existing |
| Muted text | `rgba(243,243,245,0.62)` | `colors.textSecondary` | Existing |
| Dimmer text | `rgba(243,243,245,0.42)` | `colors.textTertiary` | Existing |

**Zero hex / rgba literals in `.tsx` source.** Where the handoff demands an alpha (e.g., dropzone soft-tint hover, accent glow shadow), we compose it inline at the consumption site using token + alpha. The static `StyleSheet.create` blocks contain no colors at all — colors are applied via JSX style array merging (the pattern already used by `NeedsMediaBanner.tsx` per its W6 strict comment).

**Light-mode parity.** Handoff is dark-only. We render the same structure in light mode:
- Dropzone dashed border: `colors.border` (renders darker in light, lighter in dark) — same component, both modes work.
- Approve "accent glow" shadow: rendered only when `useTheme().isDark === true`. The glow exists to make the green pop on a near-black canvas; on a white canvas it would look like haze, so we omit it entirely in light mode (matches the decision in **Risks & Open Questions** below).
- COVER badge: `colors.success` background with `colors.onAccent` text in both modes.

## Scope (what code changes)

### 1. `src/components/NeedsMediaBanner.tsx` — full rewrite

Today it's a yellow side-stripe banner with a small CTA. After this spec, it becomes the **EMPTY-state dropzone** described in the handoff:

- Full-width tappable container; `1.5px dashed colors.border`, `colors.surface` background (with alpha), `18px` radius, padding `26 20`, centered contents, vertical gap `12`.
- Pressed state: border → `colors.success`, background → soft-success tint.
- Top pill: lock icon + "Admins only · required" — `colors.textSecondary` on `colors.surface`.
- Center: 56×56 icon tile (soft-success bg) with `colors.success`-tinted camera icon, then "Add photos" title (19/700), then 2-line subtext (12.5px, `colors.textSecondary`, max-width 250).
- Inset CTA pill: `colors.success` background, `colors.onAccent` text, plus icon + "Add photos".
- Tapping the container OR the pill calls the existing `onAddPhotos` prop (no behavior change).

Component keeps the `inDock` prop. All existing testIDs preserved (`needs-media-banner`, `needs-media-banner-cta`).

### 2. New component: `src/components/admin/AdminPhotoGrid.tsx`

The handoff's FILLED state. Renders only when photos exist AND the viewer is a mod/admin reviewing a pending listing.

- Header row: green check icon + "{n} photos added" (left) · "+ Add more" text button (right, `colors.success`).
- 3-column grid, `aspect-ratio: 1/1`, gap 8, radius 12, `1px solid colors.border`.
- First cell carries a "COVER" badge (top-left, 9/700 uppercase, `colors.onAccent` on `colors.success`, radius 6).
- Tapping any thumbnail OR "+ Add more" calls `onOpenCuration(listingId)` — navigates to existing `MediaCurationScreen`. Cover photo is whichever photo is in slot 0 of `property.media.photos` (already MediaCurationScreen's invariant).
- Drops the decorative monospace filenames from the handoff (decorative-only per the README).

Props:
```ts
interface AdminPhotoGridProps {
  photos: Array<{ uri: string; key?: string }>;
  onOpenCuration: () => void;
  onAddMore: () => void;  // typically same handler as onOpenCuration
}
```

### 3. New component: `src/components/admin/AdminReviewDock.tsx`

Extracted from the inline `showModerationDock` JSX block in `PropertyDetailsScreen.tsx` (lines ~1685–1893). Owns:

- The locked-vs-unlocked Approve button.
- The "More actions" disclosure trigger + the expanded menu card (Reject / Edit on behalf / Archive / Delete).
- The frosted blur background (preserve today's `BlurView` + tint layer).

Props:
```ts
interface AdminReviewDockProps {
  isApproveEnabled: boolean;        // true when photoCount > 0
  submittingAction: boolean;
  canApprove: boolean;              // can('approveListings')
  canArchive: boolean;              // can('archiveAnyListing') && status !== 'archived'
  canRestore: boolean;              // status === 'archived' && (owner || mod)
  canHardDelete: boolean;           // can('hardDeleteListing')
  onApprove: () => void;
  onReject: () => void;
  onEditOnBehalf: () => void;
  onArchive: () => void;
  onRestore: () => void;
  onHardDelete: () => void;
}
```

Internal state: `moreOpen: boolean` (disclosure open/closed, default `false`).

**Locked Approve state** (when `!isApproveEnabled`):
- Full-width, height 54, radius 15.
- Background `colors.surface` with low alpha, `1px colors.border`, text `colors.textTertiary`.
- Lock icon + "Approve listing".
- Helper line below (margin-top 7, centered, 11.5px, `colors.textSecondary`): warning triangle + "Add at least one photo to unlock".

**Unlocked Approve state** (when `isApproveEnabled`):
- Full-width, height 54, radius 15, no border.
- Background `colors.success`, text `colors.onAccent`, 16/700.
- Check icon + "Approve & publish listing".
- Accent glow shadow (dark mode only): `0 10px 24px -10px` with `colors.success` at alpha 0.6.

**"More actions" disclosure trigger:**
- Full-width, height 46, radius 12, transparent, `1px colors.border`, text `colors.textSecondary`, 13.5/600.
- Label toggles "More actions" ↔ "Hide actions" + chevron rotates 180° on toggle (`transition: transform .15s` — RN uses `Animated`).

**Expanded menu** (renders *above* the trigger, between Approve and trigger):
- Card: `colors.surface`, radius 14, `1px colors.border`.
- Header: padding `11 14`, "MANAGE LISTING" 10.5/700 uppercase, `colors.textSecondary`.
- Four rows, each height 50, padding `0 14`, top hairline, icon + label, 14.5/600:
  1. Reject listing — destructive (text + icon `colors.error`) — gated by `canApprove`
  2. Edit on behalf — neutral — gated by `canApprove`
  3. Archive / Restore — neutral — Archive when `canArchive`, Restore when `canRestore` (mutually exclusive)
  4. Delete — destructive — gated by `canHardDelete`
- Tapping a row closes the menu and fires the parent handler.

**Render rules:**
- The whole disclosure renders only if at least one of {Reject, Edit, Archive/Restore, Delete} is gated true.
- If only one secondary action is gated true, the disclosure still renders (consistency > one-off button).

### 4. `src/screens/PropertyDetailsScreen.tsx` — call-site rewiring

- The existing inline `showModerationDock` JSX block (lines ~1685–1893) is replaced by:
  ```jsx
  {showModerationDock && (
    <AdminReviewDock
      isApproveEnabled={isApproveEnabled}
      submittingAction={submittingAction}
      canApprove={can('approveListings') && property.status === 'pending'}
      canArchive={showArchiveBtn}
      canRestore={showRestoreBtn}
      canHardDelete={showHardDeleteBtn}
      onApprove={handleApprove}
      onReject={() => setIsRejectModalOpen(true)}
      onEditOnBehalf={handleEditOnBehalf}
      onArchive={() => setIsArchiveModalOpen(true)}
      onRestore={handleRestore}
      onHardDelete={() => setIsHardDeleteModalOpen(true)}
    />
  )}
  ```
- `NeedsMediaBanner` now renders **outside the bottom dock**, inline in the scroll body just above the property summary block, when `showNeedsMediaBanner` is true. (The handoff treats the dropzone as the "hero" of the scroll body, not as part of the bottom dock.) The existing `showModerationDock` predicate drops its `showNeedsMediaBanner` clause but keeps the four action predicates — the dock still mounts whenever there are any admin actions to show, which for a pending listing always includes `showModFooter`.
- `AdminPhotoGrid` renders inline in the scroll body just above the property summary block, when `showNeedsMediaBanner` is false AND `can('approveListings') && status === 'pending'` AND `photoCount > 0`.
- A new **"PENDING REVIEW"** eyebrow row renders inside `HeaderInfoCard` (additive prop: `pendingReviewEyebrow?: boolean`) when `status === 'pending'`. Renders for everyone who can see a pending listing (in practice: admin/mod plus the owner viewing their own).
- All four sibling-mounted modals (`RejectListingModal`, `ArchiveListingModal`, `HardDeleteConfirmModal`, owner-facing reject) stay exactly where they are.

### 5. `src/components/details/HeaderInfoCard.tsx` — additive prop

Add optional `pendingReviewEyebrow?: boolean` prop. When true, render an amber side-rule (13×1.5) + "PENDING REVIEW" label (10.5/700 uppercase, letter-spacing 1, `colors.warning`) above the existing dealType pills.

### 6. i18n

New keys in EN + RU (`src/locales/en.json`, `src/locales/ru.json` — and the `.ts` re-exports):

| Key | EN | RU |
|---|---|---|
| `adminReview.dropzone.title` | Add photos | Добавить фото |
| `adminReview.dropzone.subtext` | This listing has no images yet. Add at least one before it can be approved. | У этого объявления ещё нет фотографий. Добавьте хотя бы одну, чтобы одобрить. |
| `adminReview.dropzone.pill` | Admins only · required | Только для админов · обязательно |
| `adminReview.dropzone.cta` | Add photos | Добавить фото |
| `adminReview.grid.countLabel` | {{n}} photos added | Добавлено фото: {{n}} |
| `adminReview.grid.addMore` | + Add more | + Добавить ещё |
| `adminReview.grid.coverBadge` | COVER | ОБЛОЖКА |
| `adminReview.approve.locked.label` | Approve listing | Одобрить объявление |
| `adminReview.approve.locked.helper` | Add at least one photo to unlock | Добавьте хотя бы одно фото, чтобы разблокировать |
| `adminReview.approve.unlocked.label` | Approve & publish listing | Одобрить и опубликовать |
| `adminReview.moreActions.trigger.collapsed` | More actions | Другие действия |
| `adminReview.moreActions.trigger.expanded` | Hide actions | Скрыть действия |
| `adminReview.moreActions.menuHeader` | MANAGE LISTING | УПРАВЛЕНИЕ ОБЪЯВЛЕНИЕМ |
| `adminReview.pendingReviewEyebrow` | PENDING REVIEW | НА МОДЕРАЦИИ |

Existing keys reused (no rename):
- `moderation.action.approve | reject | editOnBehalf`
- `property.archive | unarchive`
- `common.delete`

## Behavior — Preserved Invariants

The whole point of "strictly cosmetic." Each invariant below must still hold after this change:

| Invariant | Source | Verification |
|---|---|---|
| `approveListings` cannot fire when `photoCount === 0` (frontend) | Plan 03-06 D-12 | `isApproveEnabled` prop drives both visual lock AND `disabled` attr on Approve button |
| Backend `MEDIA_REQUIRED` is the real trust boundary | Plan 03-03 T-02 | Untouched — same `PropertyService.approveListing` call |
| 403 → role refresh + bounce | `useModActionGuard` | Untouched — same handlers |
| 409 → close modal + race toast + refetch | PATTERNS §C | Untouched — same handlers |
| `editAnyListing` belt-and-suspenders gate in `ListingAdminScreen` | HG-01 | This spec does not touch ListingAdminScreen |
| Reject/Archive/Delete modals are sibling-mounted (not nested) | Phase 4 Plan 07 D-06 | Modal mounts move zero pixels; only the trigger buttons relocate |
| `NeedsMediaBanner` testIDs (`needs-media-banner`, `needs-media-banner-cta`) | Phase 3 Plan 03-06 | Preserved on the new EMPTY-state dropzone container + CTA |
| Zero hex/rgba literals in component files | W6 strict | All colors via `useTheme()` tokens; alpha applied inline at consumption |
| EN + RU parity for every new string | CLAUDE.md i18n | i18n table above has both columns |
| Dark + light parity | CLAUDE.md theme | New components rely only on tokens — both modes covered |

## State / Data — Unchanged

- `photos: Photo[]` from `property.media.photos` — drives both the EMPTY-vs-FILLED decision AND `isApproveEnabled`.
- `moreOpen: boolean` — new local state inside `AdminReviewDock`, default `false`. Resets when component unmounts (overlay close).
- All existing screen-level state (`submittingAction`, `isRejectModalOpen`, `isArchiveModalOpen`, `isHardDeleteModalOpen`, etc.) untouched.

## Acceptance Criteria

A reviewer on a physical iPhone and physical Android device, signed in as an admin, opening a pending listing **with zero photos**, sees:

1. A full-width dashed-border dropzone in the scroll body with "Admins only · required" pill, big camera tile, "Add photos" title, subtext, and an inset green "Add photos" pill.
2. No more than ONE primary-colored CTA visible at any time on the bottom dock (the disabled "Approve listing" button with the helper "Add at least one photo to unlock").
3. A single neutral "More actions" disclosure button below Approve. Tapping it expands a card listing Reject / Edit on behalf / Archive / Delete (with Reject and Delete in red). Tapping any row closes the menu and either opens the matching modal (Reject / Archive / Delete) or dispatches the matching handler (Edit on behalf).

Same admin, opening the same listing **after adding 1+ photos via MediaCurationScreen**, sees:

4. The dropzone replaced by a 3-column thumbnail grid with a "COVER" badge on the first thumbnail, a "{n} photos added" header, and a "+ Add more" link.
5. The Approve button now full-width green with check icon + "Approve & publish listing" + (dark mode) the accent glow shadow.
6. The "More actions" disclosure remains the only path to the four secondary actions.

A renter viewing the same listing once it's live sees **nothing different** from today.

A second admin viewing the listing in light mode sees the same structure with light-mode tokens — no broken contrast, no missing borders, no orphaned glows.

## Risks & Open Questions

- **Risk:** the FILLED-state grid uses real photo URIs. If a photo CDN URL fails to load, the cell should show a placeholder, not a broken image. Current `MediaCurationScreen` already has this fallback — we'll reuse the same `<Image>` wrapper or `onError`-handle inline. **Decision: inline `onError` handler that swaps to a `colors.surface` block with a muted camera icon.**
- **Risk:** the handoff's accent glow shadow on Approve looks heavy in light mode. **Decision: omit the shadow when `!isDark` (gate via `useTheme().isDark`).**
- **Open question:** the "PENDING REVIEW" eyebrow renders for the owner too (they can see their own pending listing). Is that desirable? **Default: yes — it tells the owner the listing isn't live yet. Cheap to add `pendingReviewEyebrow={status === 'pending'}` unconditionally.**
- **Open question:** if `MediaCurationScreen` is the only path to remove a photo, the FILLED-state grid has no inline remove affordance. The handoff doesn't show one either. **Decision: no inline remove — tap the thumbnail → MediaCurationScreen handles it.**

## Out of Scope (for future specs)

- Drag-to-reorder thumbnails inline.
- Inline image-picker replacing MediaCurationScreen navigation.
- Owner-facing dropzone (owners use the listing-creation flow's photo step today).
- A "PENDING REVIEW" eyebrow variant for rejected / archived statuses (this spec only adds it for pending).

## File Inventory

New files:
- `src/components/admin/AdminPhotoGrid.tsx`
- `src/components/admin/AdminReviewDock.tsx`
- `src/components/admin/__tests__/AdminReviewDock.test.tsx` (locked-state visibility, More-actions toggle, gating)
- `src/components/admin/__tests__/AdminPhotoGrid.test.tsx` (cover badge on first thumb, tap fires curation)

Modified files:
- `src/components/NeedsMediaBanner.tsx` — full visual rewrite (interface preserved)
- `src/components/details/HeaderInfoCard.tsx` — additive `pendingReviewEyebrow` prop
- `src/screens/PropertyDetailsScreen.tsx` — replace inline dock JSX with `<AdminReviewDock>`, inline `<NeedsMediaBanner>` + `<AdminPhotoGrid>` in scroll body
- `src/locales/en.json`, `src/locales/ru.json`, plus the `.ts` re-exports — new `adminReview.*` keys

Reference (read-only):
- `.scratch/photo-redesign/design_handoff_listing_review/README.md` — handoff source of truth (kept in tree until implementation merges, then deleted)
- `photoUploadRedesign.zip` — original delivery (can be deleted from repo root once spec is approved)

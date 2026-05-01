# Phase 2: Listing Lifecycle Status Field Absorption - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in 02-CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-01
**Phase:** 02-listing-lifecycle-status-field-absorption
**Areas discussed:** Legacy + default reconciliation, Mod/admin read scope, OwnerListings UX, Rejection messaging end-to-end

---

## Legacy + default reconciliation

### Q1: How should newly-submitted listings be assigned status server-side?

| Option | Description | Selected |
|--------|-------------|----------|
| Flip default to 'pending', drop 'draft' | Enum becomes `['pending','live','rejected','archived']`, default `'pending'`. Existing `'draft'` rows migrated to `'pending'`. | ✓ |
| Keep 'draft' as 5th owner-WIP state | Enum becomes `['draft','pending','live','rejected','archived']` with both Save-as-draft and Submit-for-review affordances. | |
| Rename 'draft' to 'pending' via migration | Functionally identical to flip-and-drop, framed as 'rename'. | |

**User's choice:** Flip default to 'pending', drop 'draft'.
**Notes:** Aligns with REQUIREMENTS.md MOD-01 enum + MOD-03 submit semantics; keeps Phase 2 surface tight.

### Q2: Legacy listings missing the `status` field — fallback strategy?

| Option | Description | Selected |
|--------|-------------|----------|
| Server default 'live' + one-shot backfill (belt + suspenders) | Mongoose schema `default: 'live'` + one-shot `migrate-listings-m2.js` backfill + client `?? 'live'` coalesce. Three layers of defense. | ✓ |
| Client `?? 'live'` only, no backfill | Client treats missing status as `'live'`. Mongo never touched. | |
| One-shot backfill migration only | Fill nulls with `'live'` once. No server default; no client coalesce. | |

**User's choice:** Server default 'live' + one-shot backfill (belt + suspenders).
**Notes:** Matches ROADMAP success criteria #1 'belt-and-suspenders' framing; mirrors Phase 1's defense-in-depth posture.

### Q3: How should the `draft → pending` flip + legacy null backfill ship?

| Option | Description | Selected |
|--------|-------------|----------|
| Standalone migrate-listings-m2.js script | Sibling to Phase 1's `migrate-roles-m2.js` at `JayTap-services/src/scripts/`. `--dry-run` + idempotent + `--verify`. | ✓ |
| Extend Phase 1's migrate-roles-m2.js with --listings | Single script, two flags: `--users` and `--listings`. | |
| Lazy migration on read | Routes write-back resolved status the first time a legacy row is fetched. | |

**User's choice:** Standalone migrate-listings-m2.js script.
**Notes:** Keeps the Phase 1 idempotency + dry-run convention; separates concerns; avoids re-running already-shipped Phase 1 user migration.

### Q4: What status should existing M1 self-listed properties land in after migration?

| Option | Description | Selected |
|--------|-------------|----------|
| All existing properties → 'live' | Preserves visibility of M1 listings; no surprise re-moderation queue overnight. | ✓ |
| All existing properties → 'pending' | Force every M1 listing back through moderation. | |
| Per-record decision at migration time | Migration script lists all M1 listings + manual flag per record. | |

**User's choice:** All existing properties → 'live'.
**Notes:** Matches ROADMAP success criteria #1 ("legacy listings continue to render") verbatim.

---

## Mod/admin read scope

### Q1: How should `GET /api/properties` (the public list endpoint) handle mods/admins?

| Option | Description | Selected |
|--------|-------------|----------|
| Role-aware filter, no escape hatch | Live-only for everyone (renters + mods + admins). Phase 3 owns dedicated moderation routes. | ✓ |
| Role-aware filter + ?includeAll=1 escape hatch | Default live-only; mods/admins can opt-in. | |
| Mods/admins get all statuses by default | Role ≥ moderator receives all statuses on the public list endpoint. | |

**User's choice:** Role-aware filter, no escape hatch.
**Notes:** Cleanest separation; eliminates the highest-blast-radius bug class (pending listing leaked to public feed); keeps Phase 2 surface tight.

### Q2: For `GET /api/properties/:id` (single-property deep-link), what does a moderator/admin viewing a non-live listing get?

| Option | Description | Selected |
|--------|-------------|----------|
| Same shape as live + status field (no special metadata) | Mods/admins see the listing exactly as a renter would, plus the `status` field. Phase 3 introduces moderation actions separately. | ✓ |
| Include moderation context payload | Embed `{moderationContext: {submittedAt, rejectionReasonCode?, ...}}` for mod-role viewers. | |
| 404 even for mods unless coming via /api/moderation/queue | Force mods through dedicated moderation endpoints. | |

**User's choice:** Same shape as live + status field present.
**Notes:** Minimum surface for Phase 2; mod actions are explicitly Phase 3 scope; preserves deep-link sharing for mod-team coordination.

### Q3: Renter-facing list screens — should they trust the server-side filter or also re-filter client-side?

| Option | Description | Selected |
|--------|-------------|----------|
| Client `?? 'live'` coalesce + status-filter the response | Server filters + client `properties.filter(p => (p.status ?? 'live') === 'live')`. Belt + suspenders matching D-02. | ✓ |
| Trust the server response as-is | No client-side status filtering. Cleanest code but no defense against server regressions. | |
| Client filter only on Home; trust server elsewhere | Mixed approach. | |

**User's choice:** Client coalesce + filter (defense in depth).
**Notes:** Cheap; matches Phase 1's defense-in-depth pattern; absorbs any future server regression.

### Q4: Does Phase 2 stub the Phase 3 `/api/moderation/queue` endpoint shell, or stay strictly within MOD-01..MOD-09 surface?

| Option | Description | Selected |
|--------|-------------|----------|
| Stay strictly within MOD-01..MOD-09 (no Phase 3 endpoints) | Phase 2 ships ONLY status field, role-aware filter on existing routes, OwnerListings tabs, status pills, deep-link guard, rejection banners, AppState refresh hook. | ✓ |
| Stub `/api/moderation/queue` with empty handler + auth | Phase 2 mounts the route + role gate, returns `[]`. | |
| Define endpoint contract in shared types only, no route | TypeScript interfaces / API doc updated, no backend route registered. | |

**User's choice:** Strict boundary (MOD-01..MOD-09 only).
**Notes:** Guards Phase 2 against scope creep; aligns with REQUIREMENTS.md phase boundaries.

---

## OwnerListings UX

### Q1: Which tab should an owner land on when they open OwnerListings?

| Option | Description | Selected |
|--------|-------------|----------|
| Pending (post-M2 default) | Owner lands on the tab where their newly-submitted listings live. Bridges M1 → M2 mental-model gap. | ✓ |
| Live | Preserves M1 muscle memory. | |
| Last-viewed (per-session) | Remember last tab in component state. | |

**User's choice:** Pending.
**Notes:** Friction is highest right after submit; landing where the user expects to find what they just submitted.

### Q2: Where should the HospitalitySection strip mount on OwnerListings?

| Option | Description | Selected |
|--------|-------------|----------|
| Inside each tab as ListHeaderComponent | Strip renders ABOVE listings within the active tab, filtered to that tab's status. | ✓ |
| Above the segmented control (cross-tab) | Strip pinned at top, shows ALL Hospitality regardless of active tab. | |
| Hide on OwnerListings entirely | Strip lives only on Home / Favorites / RenterListings. | |

**User's choice:** Inside each tab as ListHeaderComponent.
**Notes:** Matches HOSP-01 'tour-first' anchor + per-tab empty-state spec; mirrors M1 Phase 6 mount pattern.

### Q3: Per-tab empty-state copy — generic, status-specific, or status-specific + actionable?

| Option | Description | Selected |
|--------|-------------|----------|
| Status-specific + actionable CTAs | 4 tab-specific empty messages, 2 with Create-listing CTA. ~8 new locale keys. | ✓ |
| Generic empty state per tab | Single 'No listings here yet' shared. | |
| Status-specific copy, no CTAs | Status-specific text but no Create button anywhere. | |

**User's choice:** Status-specific + actionable CTAs.
**Notes:** 8 new locale keys; matches Phase 4.5 banner-copy granularity bar.

### Q4: Tab-switch behavior on slow networks?

| Option | Description | Selected |
|--------|-------------|----------|
| Single fetch on screen mount, client-side filter per tab | One owner-scoped GET; client filters in-memory by active tab. Tabs feel instant. | ✓ |
| Per-tab fetch with status filter | Each tab triggers a separate request. | |
| Single fetch + background refetch on tab switch | Hybrid caching. | |

**User's choice:** Single fetch + client-side filter.
**Notes:** Owner has manageable count; one fetch cheaper than four; matches MOD-04 D-05 role-aware filter on the client side too.

---

## Rejection messaging end-to-end

### Q1: PropertyDetailsScreen rejection banner dismissibility

| Option | Description | Selected |
|--------|-------------|----------|
| Per-session dismiss; reappears next cold start until status ≠ 'rejected' | Verbatim REQUIREMENTS.md MOD-08 wording. | ✓ |
| Per-session dismiss; reappears on any nav back to the screen | More aggressive. | |
| Sticky until owner acts (no dismiss) | No 'X' button. | |

**User's choice:** Per-session dismiss; reappears next cold start.
**Notes:** Matches the spec exactly.

### Q2: Persistent Home banner auto-dismiss criteria

| Option | Description | Selected |
|--------|-------------|----------|
| Disappears when no listing remains in 'rejected' | Auto-dismiss when the last rejected listing transitions out. Verbatim MOD-09. | ✓ |
| Manual dismiss-per-session, no auto-criteria | Owner taps X; reappears next session. | |
| Threshold-based (≥ N rejected listings) | Only show if ≥ 2. | |

**User's choice:** Auto-dismiss when zero rejected.
**Notes:** Matches the spec; banner only shows when there's a real issue to act on.

### Q3: 'Edit & resubmit' CTA flow

| Option | Description | Selected |
|--------|-------------|----------|
| PropertyDetailsScreen banner CTA opens CreateListingScreen pre-filled; Home CTA routes to OwnerListings→Rejected | Split routing: detail-screen CTA is per-listing, Home CTA is for browsing all. | ✓ |
| Both CTAs route to OwnerListings→Rejected tab | Owner picks the listing from the tab. | |
| Both CTAs open CreateListingScreen for the listing | Detail-screen CTA opens edit; Home banner doesn't know which listing. | |

**User's choice:** Split routing (detail → CreateListingScreen pre-filled; Home → OwnerListings tab).
**Notes:** Detail screen knows the listing; Home banner has multiple candidates.

### Q4: EN status pill labels (RU locked to Avito)

| Option | Description | Selected |
|--------|-------------|----------|
| Short / mirror RU: 'Pending review' / 'Rejected' / 'Unpublished' | Closest to RU semantic anchor; fits compactly on a pill. | ✓ |
| Action-oriented: 'In review' / 'Needs edits' / 'Hidden' | Softer, more user-friendly. | |
| Literal: 'Under moderation' / 'Rejected' / 'Archived' | Most direct translation. | |

**User's choice:** Short / mirror RU framing.
**Notes:** Mirrors Avito's RU framing; 'Unpublished' reads softer than 'Archived' for the public-removal case.

---

## Claude's Discretion

Areas where the user accepted a "Claude's Discretion" framing during decision capture:
- **Banner visual design** (color tokens, icon, animation, pill border radius/padding) — pick from `useTheme()` semantic palette.
- **Owner-scoped fetch endpoint path** — discovery time during planning.
- **`<RejectionBanner>` and `<HomeRejectionBanner>` component locations** — likely `src/components/`, planner decides whether to share an internal primitive.
- **AppState refresh hook unit-test coverage** — Phase 1's "effectively zero tests" posture inherits; planner has discretion.
- **CreateListingScreen submit-button copy change** — open question whether MOD-03 implies a copy change to "Submit for review."
- **Audit-field synthetic timestamps for legacy backfill** — D-04 sets these as null/missing; acceptable under Phase 3's `moderationLog` consumer pattern.

## Deferred Ideas

Captured in 02-CONTEXT.md `<deferred>` section:
- `serviceAreas` config storage (Phase 3)
- MOD-13 reasonCode → owner-locale translation (Phase 3)
- `/api/moderation/queue` endpoint stub (Phase 3)
- Moderation actions (Phase 3, MOD-10..MOD-18)
- Archive actions (Phase 4, ARCH-01..ARCH-05)
- 5th OwnerListings tab for owner-WIP draft (rejected by D-01)
- Mod/admin "view all statuses" debug surface (rejected by D-05)
- Crash reporting (CONCERNS.md, M2 backlog)
- `react-native-config` / `.env` loader for RN client (CONCERNS.md, M2 backlog)

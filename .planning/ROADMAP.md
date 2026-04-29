# Roadmap: JayTap

## Milestones

- ✅ **M1 v1.0.4 "Polish + Hospitality"** — 8 phases (shipped 2026-04-28) — see [milestones/v1.0.4-ROADMAP.md](milestones/v1.0.4-ROADMAP.md)
- 📋 **M2 "Roles & Moderation"** — Phases TBD (planning unblocked; will be planned via /gsd-new-milestone)

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

### 📋 M2 "Roles & Moderation" (Planned)

To be fully planned via /gsd-new-milestone. Sketch (from prior REQUIREMENTS.md v2):

- [ ] Phase M2.1: Formal Role System
- [ ] Phase M2.2: Listing Moderation Lifecycle
- [ ] Phase M2.3: Moderation Queue & Edit-on-Behalf
- [ ] Phase M2.4: Admin UIs
- [ ] Phase M2.5: Owner-Side Moderation UX

## Progress

| Milestone | Phases | Status | Closed |
|-----------|--------|--------|--------|
| M1 v1.0.4 "Polish + Hospitality" | 8/8 (7 executed + Phase 7 SKIPPED) | ✅ SHIPPED | 2026-04-28 |
| M2 "Roles & Moderation" | TBD | 📋 Planned | — |

## Backlog

### Phase 999.1: Archive listings — authors + mod/admin (BACKLOG)

**Goal:** [Captured for future planning]
**Requirements:** TBD (proposed MOD-07 author archive + MOD-08 admin/mod archive)
**Plans:** 0 plans

Belongs to **M2 "Roles & Moderation"** — not M1. Reuses MOD-01 listing status lifecycle by adding an `archived` value alongside `pending` / `live` / `rejected`. Authors can archive their own listings; admins/moderators can archive any listing.

Open questions to resolve at planning time:
1. Coexist with the existing hard-delete (`PropertyCard.onDelete` / `modal.deleteListing`) or replace it?
2. Require a reason field for mod/admin archive (parallel to MOD-01 `rejectionReason`, for audit trail and owner-side messaging)?
3. Restore/unarchive flow in scope, and where does the author see their archived listings?
4. Railway backend contract — needs `status='archived'` support + endpoint coordination, same dynamic as the D-22 Path B deferred outreach.

UI surfaces (proposed):
- Author entry: `PropertyCard` menu (next to Delete) + `PropertyDetailsScreen` action
- Admin/moderator entry: `PropertyDetailsScreen` (gated via `can('archiveAnyListing')`) + future `ModerationQueueScreen` (MOD-04)

Plans:
- [ ] TBD (promote with /gsd-review-backlog when ready)

---

*Roadmap reorganized: 2026-04-28 after M1 v1.0.4 milestone close. Full M1 phase details, success criteria, plan-by-plan breakdown, and traceability live in `.planning/milestones/v1.0.4-ROADMAP.md`.*

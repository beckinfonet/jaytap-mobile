# Roadmap: JayTap

## Milestones

- ✅ **M1 v1.0.4 "Polish + Hospitality"** — 8 phases (shipped 2026-04-28) — see [milestones/v1.0.4-ROADMAP.md](milestones/v1.0.4-ROADMAP.md)
- ✅ **M2 v2.0 "Roles & Moderation"** — 6 phases + Phase 4.5 inserted (shipped 2026-05-05) — see [milestones/v2.0-ROADMAP.md](milestones/v2.0-ROADMAP.md)
- 🚧 **M3 (next)** — to be planned via `/gsd-new-milestone`

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

Full M1 details: `.planning/milestones/v1.0.4-ROADMAP.md`

</details>

<details>
<summary>✅ M2 v2.0 "Roles & Moderation" (Phases 1–6 + Phase 4.5 inserted) — SHIPPED 2026-05-05</summary>

- [x] Phase 1: Backend Role Foundation + Auth Migration + Hotfix Bundle (13/13 plans) — completed 2026-04-30
- [x] Phase 2: Listing Lifecycle Status Field Absorption (9/9 plans) — completed 2026-05-01
- [x] Phase 3: Moderation Queue + Actions + Edit-on-Behalf (6/6 plans) — completed 2026-05-02
- [x] Phase 4: Archive Lifecycle (Owner + Mod/Admin) (7/7 plans) — completed 2026-05-03
- [x] Phase 4.5: Landlord Application Workflow (INSERTED out-of-roadmap 2026-04-30) — completed 2026-04-30
- [x] Phase 5: Admin Role Management UI (5/5 plans) — completed 2026-05-03
- [x] Phase 6: Hardening + Manual Physical-Device QA + Release (7/7 plans) — completed 2026-05-05

Full M2 details: `.planning/milestones/v2.0-ROADMAP.md`

</details>

### 🚧 M3 (Next)

Planning starts via `/gsd-new-milestone`. Anchor item is the Backlog entry below (Phase 999.1 — Contextual listing creation flow / 6-step conditional UI).

## Progress

| Milestone | Phases | Status | Closed |
|-----------|--------|--------|--------|
| M1 v1.0.4 "Polish + Hospitality" | 8/8 (7 executed + Phase 7 SKIPPED) | ✅ SHIPPED | 2026-04-28 |
| M2 v2.0 "Roles & Moderation" | 6/6 (+ Phase 4.5 inserted) | ✅ SHIPPED | 2026-05-05 |
| M3 (next) | TBD | 📋 Planning | — |

## Backlog

### Phase 999.1: Contextual listing creation flow (6-step conditional UI) — M3 anchor (BACKLOG)

**Goal:** [Captured for future planning] Replace the current generic listing form with a step-by-step contextual flow where each screen's fields are determined by previous answers (deal type × property type × admin toggles). Full spec: `.planning/phases/999.1-contextual-listing-flow-m3-anchor/SPEC.md` (collocated with this backlog entry).

**Target milestone:** M3 (planning starts via `/gsd-new-milestone` 2026-05-05)

**Requirements:** TBD — derive during /gsd-spec-phase 999.1 after M3 milestone goals are gathered

**Reconciliation points to resolve before planning:**
1. Spec's flat property-type taxonomy (`apartment | house | office | commercial | hotel`) conflicts with M1's three-category taxonomy (Residential / Commercial / Hospitality). CLAUDE.md guards the existing taxonomy. Either the spec wins (taxonomy migration phase) or the spec is reframed onto the existing taxonomy.
2. Spec moves photo / video / 3D-tour upload from user to admin/mod (post-submission). This inverts the current user-uploads-to-S3 workflow (uses `jaytap-prod-s3` IAM user). Confirm direction before planning — has implications for moderation UI scope and S3 IAM policy.

**Plans:** 0 plans

Plans:
- [ ] TBD (promote with /gsd-review-backlog when ready)

---

*M1 backlog entry 999.1 (archive listings — authors + mod/admin) was promoted into M2 Phase 4 on 2026-04-29; the corresponding `.planning/phases/999.1-archive-listings/` directory was removed during Phase 4 plan execution. The 999.1 number is now reused for the M3 anchor above.*

---

*Roadmap last updated: 2026-05-05 — M2 v2.0 "Roles & Moderation" archived via /gsd-complete-milestone. Full M2 phase details, success criteria, plan-by-plan breakdown live in `.planning/milestones/v2.0-ROADMAP.md`. M3 planning starts immediately after this archive lands.*

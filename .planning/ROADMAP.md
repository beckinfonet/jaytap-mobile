# Roadmap: JayTap

## Milestones

- ✅ **M1 v1.0.4 "Polish + Hospitality"** — 8 phases (shipped 2026-04-28) — see [milestones/v1.0.4-ROADMAP.md](milestones/v1.0.4-ROADMAP.md)
- ✅ **M2 v2.0 "Roles & Moderation"** — 6 phases + Phase 4.5 inserted (shipped 2026-05-05) — see [milestones/v2.0-ROADMAP.md](milestones/v2.0-ROADMAP.md)
- ✅ **M3 v3.0 "Contextual Forms"** — 5 phases (shipped 2026-05-11) — see [milestones/v3.0-ROADMAP.md](milestones/v3.0-ROADMAP.md)
- 📋 **M4** — planning pending — to be initiated via `/gsd-new-milestone`

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

<details>
<summary>✅ M3 v3.0 "Contextual Forms" (Phases 1–5) — SHIPPED 2026-05-11</summary>

- [x] Phase 1: Schema Reshape + Backend Route Shape Cutover (5/5 plans) — completed 2026-05-06
- [x] Phase 2: 6-Step Contextual Listing Flow (Client) (10/10 plans) — completed 2026-05-06
- [x] Phase 3: Media Flow Inversion (Admin/Mod Curation) (7/7 plans) — completed 2026-05-06
- [x] Phase 4: M2 Carry-Forward Bug Fixes (5/5 plans) — completed 2026-05-07
- [x] Phase 5: Hardening + Manual Physical-Device QA + Release v3.0.0 (7/7 plans) — completed 2026-05-11

Full M3 details: `.planning/milestones/v3.0-ROADMAP.md`

</details>

### 📋 M4 (planning pending)

Run `/gsd-new-milestone` to initiate M4 scoping. Candidate v1 requirements from FUTURE Requirements list (in `milestones/v3.0-REQUIREMENTS.md` § "Future Requirements (M4+ — deferred)"):

- KZT + UZS currency support — KG+KZ+UZ market expansion (Almaty / Tashkent serviceAreas).
- Multi-language localization beyond EN+RU (KK + UZ if KZ/UZ markets warrant it).
- 2GIS native map bridge — multi-week effort; plan drafted in `2GIS_BRIDGE_PLAN.md`.
- Automated/AI moderation (image/text classifiers).
- Full audit log UI (`moderationLog` + `roleChangeLog` data captured in M2; UI deferred).
- Push notifications / email notifications for moderation events.
- Bulk moderation actions (multi-select approve/reject).
- Real-estate document verification (Avito-style ownership proof — multi-month compliance subproject).
- **Bedroom count schema field** (separate from total `basics.rooms`) — Central Asia "3-room apartment" colloquially counts the living room as a room, so "3 rooms" ≠ "3 bedrooms"; foreigners read it the Western way and miscount. Display BOTH counts on cards / details / filters. Seeded 2026-05-25 from QA on quick task 260525-ggp. Cross-repo: frontend `Property.ts` + `ContextualListingFlow/Step3BasicInfo.tsx` + `adapters.ts` + `validators.ts` + render in `PropertyCard.tsx` + `PropertyDetailsScreen.tsx` + `ListingMetaTable.tsx` + EN/RU i18n + tests; backend Mongoose schema + create/update routes. See memory `central-asia-rooms-vs-bedrooms-convention.md` for the domain context the M4 planner must honor.
- **Bathroom count across all property types** — M3 captured `basics.bathroom` as a TYPE enum (`private`/`shared`/`none`) for office/commercial only by design (Step3 lines 192–230). User requires bathroom COUNT captured for residential + hospitality too (offices can have private vs shared bathrooms, but the count matters everywhere). Seeded 2026-05-25 from QA on quick task 260525-ggp. Cross-repo, same surface as the bedroom field; includes a migration decision (keep the existing type enum AND add count, or replace it). M3 Phase 1 D-07 decision being unwound on this one — needs explicit M4 ADR.

## Progress

| Milestone | Phases | Status | Closed |
|-----------|--------|--------|--------|
| M1 v1.0.4 "Polish + Hospitality" | 8/8 (7 executed + Phase 7 SKIPPED) | ✅ SHIPPED | 2026-04-28 |
| M2 v2.0 "Roles & Moderation" | 6/6 (+ Phase 4.5 inserted) | ✅ SHIPPED | 2026-05-05 |
| M3 v3.0 "Contextual Forms" | 5/5 | ✅ SHIPPED | 2026-05-11 |
| M4 | — | 📋 Planning pending | — |

## Backlog

### Phase 999.1: Contextual listing creation flow (6-step conditional UI) — M3 anchor (CLOSED — promoted + shipped)

**Status (2026-05-11):** Fully consumed by M3 — Phase 1 (SCHEMA-01..05), Phase 2 (FLOW-01..16), Phase 3 (MEDIA-01..09). All 30 anchor requirements shipped in v3.0.x on 2026-05-11. The historical SPEC.md remains at `.planning/milestones/v3.0-phases/999.1-contextual-listing-flow-m3-anchor/SPEC.md` for reference; the working backlog entry is closed.

---

*M1 backlog entry 999.1 (archive listings — authors + mod/admin) was promoted into M2 Phase 4 on 2026-04-29. M3 reused the 999.1 number for the contextual-flow anchor SPEC. Future backlog entries should continue from 999.2 to avoid number reuse confusion.*

---

*Roadmap last updated: 2026-05-11 — M3 v3.0 "Contextual Forms" milestone closed via `/gsd-complete-milestone`. All three shipped milestones collapsed into details summaries; M4 placeholder added for next milestone planning.*

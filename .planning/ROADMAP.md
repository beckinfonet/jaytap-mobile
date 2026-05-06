# Roadmap: JayTap

## Milestones

- ✅ **M1 v1.0.4 "Polish + Hospitality"** — 8 phases (shipped 2026-04-28) — see [milestones/v1.0.4-ROADMAP.md](milestones/v1.0.4-ROADMAP.md)
- ✅ **M2 v2.0 "Roles & Moderation"** — 6 phases + Phase 4.5 inserted (shipped 2026-05-05) — see [milestones/v2.0-ROADMAP.md](milestones/v2.0-ROADMAP.md)
- 🚧 **M3 v3.0 "Contextual Forms"** — 5 phases (planning started 2026-05-05) — anchor SPEC: `.planning/phases/999.1-contextual-listing-flow-m3-anchor/SPEC.md`

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

### 🚧 M3 v3.0 "Contextual Forms" (Phases 1–5)

**Phase numbering reset to 1** for M3, matching the M1 → M2 precedent. Anchor SPEC: `.planning/phases/999.1-contextual-listing-flow-m3-anchor/SPEC.md` (Version 2). All 38 v1 requirements (16 FLOW + 5 SCHEMA + 9 MEDIA + 2 CARRY + 6 REL) map to exactly one phase.

- [x] **Phase 1: Schema Reshape + Backend Route Shape Cutover** (5/5 plans) — completed 2026-05-06 — Mongoose nested-shape migration (`location.*`/`basics.*`/`conditionAndAmenities.*`/`content.*`/`terms.*`/`media.*`) + operator-supervised one-shot `migrate-listings-m3.js` + backend route read/write cutover. Foundation for Phase 2 client work. *(4 operator items pending in `01-HUMAN-UAT.md`: Atlas live migration, restore-snapshot drill, tester comms delivery, RN client whole-project tsc capture in Phase 2.)*
- [ ] **Phase 2: 6-Step Contextual Listing Flow (Client)** — New `<ContextualListingFlow>` 6-step UI replacing `CreateListingScreen.tsx` atomically; per-step `validateStep()` single-source-of-truth; conditional sub-fields per property type; mod edit-on-behalf wired via M2 `moderatorContext` prop; +80–120 EN+RU keys.
- [ ] **Phase 3: Media Flow Inversion (Admin/Mod Curation)** — Mod queue extension with media-curation view; `POST /api/moderation/listings/:id/media` endpoint; ModerationLog `'media-upload'` action; S3 IAM policy update (admin/mod gain upload rights, user upload rights revoked); "needs media" queue filter + `MEDIA_REQUIRED` 400 invariant blocking approval.
- [ ] **Phase 4: M2 Carry-Forward Bug Fixes** — CARRY-01 ROLE-11 frontend mid-action 403 popup-recovery across 5+ submit handlers + CARRY-02 Phase 4.5 landlord-application uid-mismatch fix with anti-spoofing grep gate + repair migration.
- [ ] **Phase 5: Hardening + Manual Physical-Device QA + Release v3.0.0** — Atomic v3.0.0 version bump (M1 D-02 + M2 Wave-1 query-first pattern); manual physical-device QA matrix on iPhone 15 Pro Max + Moto G XT2513V; bilingual EN+RU release notes ≤500 chars; ASC TestFlight Internal + Play Console Internal Testing submission.

## Phase Details

### Phase 1: Schema Reshape + Backend Route Shape Cutover

**Goal**: Reshape the `Property` Mongoose schema from M2's flat shape to the SPEC's nested shape (`location.*`/`basics.*`/`conditionAndAmenities.*`/`content.*`/`terms.*`/`media.*`) via an operator-supervised one-shot migration, and cut backend read/write routes over to the nested shape — without changing the M2 status enum (`pending | live | rejected | archived`) or moving M2 audit fields off top-level.

**Depends on**: Nothing (foundation phase; M2 backend baseline at SHA `2fb5639` per memory `m2-shipped-2026-05-05.md`).

**Requirements**: SCHEMA-01, SCHEMA-02, SCHEMA-03, SCHEMA-04, SCHEMA-05.

**Success Criteria** (what must be TRUE):
  1. Operator can run `node scripts/migrate-listings-m3.js --dry-run` followed by `node scripts/migrate-listings-m3.js --verify=PASS` and observe `db.properties.countDocuments({location: {$exists: false}})` returning 0 post-migration.
  2. Existing M1+M2 listings (and their user-uploaded `media.photos[]`) survive the migration verbatim — visible end-to-end in the M2 Home/Favorites/RenterListings/OwnerListings screens with no field loss.
  3. The M2 status enum (`pending | live | rejected | archived`) and all M2 + M2-Phase-4 audit fields (`submittedAt`/`approvedAt`/`approvedByUid`/`rejectedAt`/`rejectedByUid`/`rejectionReasonCode`/`rejectionReasonNote`/`archivedAt`/`archivedByUid`/`archivedReasonCode`/`archivedReasonNote`) remain at the top level of every Property doc post-migration — never nested under `terms.*`.
  4. Backend read paths (`GET /api/properties` + `GET /api/properties/:id` + `GET /api/moderation/queue`) return the nested shape exclusively after the route-shape cutover commit; the cutover commit lands strictly AFTER the migration runs successfully.
  5. Rollback procedure (revert route-shape cutover commit while leaving the migrated DB in place) is documented in the phase CONTEXT.md and validated against a Mongo Atlas restore-snapshot timestamp captured pre-migration.

**Plans:** 5 plans

Plans:
- [x] 01-01-PLAN.md — Reshape Property.js to nested schema (location/basics/conditionAndAmenities/content/terms/media); status enum + 11 audit fields stay top-level; Property.test.js updated
- [x] 01-02-PLAN.md — migrate-listings-m3.js + migrate-listings-m3.test.js + package.json npm script (dry-run + verify=PASS + idempotent + D-04..D-15 mapping + audit-field preservation)
- [x] 01-03-PLAN.md — propertyRoutes.js cutover (POST/PUT body to nested; D-22 sanitizer + auto-flip + CR-01 + MOD-13 + PATCH /:id/verifications preserved verbatim) + propertyRoutes.test.js updated
- [x] 01-04-PLAN.md — moderationRoutes.js cutover (PUT edit-on-behalf body to nested; MOD-14 mass-assignment strip extended; MOD-15 race-cell + queue FIFO + ARCH-01..ARCH-05 + HF-03 actorUid preserved verbatim) + moderationRoutes.test.js updated
- [x] 01-05-PLAN.md — RN client src/types/Property.ts type-stub (full nested type per Claude Discretion #3) + 01-CONTEXT.md §Rollback subsection (D-17 — Atlas tier checklist + operator runbook + tester comms + reverse-rollback procedure)

### Phase 2: 6-Step Contextual Listing Flow (Client)

**Goal**: Replace M1's single-screen `CreateListingScreen.tsx` (and its M1-Phase-4 `CreateListingForm/` sub-component barrel) with a new 6-step `<ContextualListingFlow>` where every screen and every field is determined by previous answers, per SPEC §"High-Level Flow" — atomically, with no dual-flow window.

**Depends on**: Phase 1 (nested schema; the new flow writes/reads exclusively in the nested shape).

**Requirements**: FLOW-01, FLOW-02, FLOW-03, FLOW-04, FLOW-05, FLOW-06, FLOW-07, FLOW-08, FLOW-09, FLOW-10, FLOW-11, FLOW-12, FLOW-13, FLOW-14, FLOW-15, FLOW-16.

**Success Criteria** (what must be TRUE):
  1. A user (or moderator-on-behalf) can complete a brand-new listing across exactly 6 screens with a "Step N of 6" progress indicator, Back / Next navigation, and per-step validation gating advance — for every combination of deal type (`sale | rent_long | rent_daily`) × property type (apartment / house / office / commercial / hotel / hostel).
  2. Step 2's exact-address toggle is hidden when `propertyType ∈ {hotel, hostel}` (forced true) and visible-defaulting-false otherwise — observable on the device by switching property type chips and watching the toggle appear/disappear.
  3. Step 3's conditional sub-fields render exactly as SPEC §"Conditional sub-fields per property type" specifies (rooms only for apartment/house; rooms + bathroom + kitchen for office/commercial; hotelRooms + hotelClass for hotel/hostel) — switching property type at Step 1 reflows Step 3 with no leftover fields from the prior selection.
  4. Step 6 renders only the deal-type-appropriate fields per SPEC §6 matrix (Sale → bargain + optional deposit; Long-term rent → bargain + optional deposit + prepaymentMonths preset 0/1/2/custom + minTerm; Daily rent → optional deposit only) — switching deal type at Step 1 reflows Step 6 cleanly.
  5. A moderator using the M2 `moderatorContext` edit-on-behalf path (M2 MOD-14) sees the same 6-step UI with a banner stripe at the TOP of Step 1, can edit any field on a pending or rejected listing, and submission flips status appropriately (M2 MOD-14 semantics preserved). The old `CreateListingScreen.tsx` is deleted in the same commit chain that ships the new flow.

**Plans:** 9 plans
**UI hint**: yes

Plans:
- [x] 02-01-PLAN.md — Backend Location dictionary (City + District models + locationRoutes.js + moderationRoutes.js extension + seed-locations-m3.js + supertest cases + middleware extract) — completed 2026-05-06 (3 operator items pending: Phase 1 Atlas migration confirmation, Plan 02-01 Railway deploy, prod Atlas seed run)
- [x] 02-02-PLAN.md — <ContextualListingFlow> skeleton + Step 1 + types/validators/adapters + ~24 i18n keys + Wave 0 test scaffolds
- [ ] 02-03-PLAN.md — Step 2 (Location chips + map pin + Other modal) + Step 3 (BasicInfo conditional sub-fields) + ModerationQueueScreen Locations tab + ~49 i18n keys
- [ ] 02-04a-PLAN.md — Step 4 (ConditionAmenities) + Step 5 (TitleDescription) + Step 4/5 validator tests + ~18 i18n keys
- [ ] 02-04b-PLAN.md — Step 6 (DealConditions matrix per dealType) + integration test (Step 1→6 + edit-mod cell) + real submit dispatch + ~18 i18n keys
- [x] 02-05-PLAN.md — Read-path cutover Wave 1: HomeScreen + FavoritesScreen + RenterListingsScreen + OwnerListingsScreen + PropertyCard + HospitalityCard + HospitalitySection + ListingMetaTable + PropertyMap → nested shape — completed 2026-05-06 (5 atomic commits f2cf2f8 / 8a9efb6 / 5a2d64e / 583eb63 / 3f5114a; Tradeoff §K caller-side hospitality derivation `dealType !== 'sale'` applied at all 4 list screens; D-10 BISHKEK_DISTRICTS preserved; D-21 HospitalityCard top-level maxGuests + amenities preserved; formatPrice + 10 EN+RU i18n keys added; FLOW-13 closed)
- [x] 02-06-PLAN.md — Read-path cutover: PropertyDetailsScreen (1680 LOC own plan) → nested shape — completed 2026-05-06 (1 atomic commit 07bc5f0; 13 flat-field families swapped; 2 map embed sites read location.coordinates.lat/lng; 5 basics?.* reads; 3 media?.* reads; D-21 maxGuests + amenities preserved; FLOW-13 RejectionBanner mounting preserved; 0 TS errors in file post-cutover, was 55; npm test 335 pass / 4 fail baseline preserved)
- [ ] 02-07-PLAN.md — Wire <ContextualListingFlow> into App.tsx (replace isCreateListingOpen flag; mode discriminated-union dispatch per D-15/D-17)
- [ ] 02-08-PLAN.md — Operator dry-run on iPhone 15 Pro Max + Moto G XT2513V (checkpoint plan; verifies all 3 modes + Pitfall 1 map-drag + mod-banner persistence + Locations tab — BEFORE atomic deletion)
- [ ] 02-09-PLAN.md — Atomic deletion: DELETE CreateListingScreen.tsx + CreateListingForm/ barrel + App.tsx import; ADD scripts/check-create-listing-screen-removed.sh sentinel + package.json check:atomic-deletion script + final i18n cleanup of orphaned createListing.* keys

### Phase 3: Media Flow Inversion (Admin/Mod Curation)

**Goal**: Invert the user-uploads-to-S3 workflow so users submit metadata only; admin/mod uploads photos / videos / 3D-tour URL via a new mod-queue media-curation view after metadata review — and approval is blocked until at least one photo exists. Existing M1+M2 listings retain their user-uploaded media verbatim through the SCHEMA-02 migration.

**Depends on**: Phase 1 (nested `media.*` shape exists on read paths) and Phase 2 (user-facing flow has zero media fields by the time mod curation goes live, so there is no dual-write window).

**Requirements**: MEDIA-01, MEDIA-02, MEDIA-03, MEDIA-04, MEDIA-05, MEDIA-06, MEDIA-07, MEDIA-08, MEDIA-09.

**Success Criteria** (what must be TRUE):
  1. A moderator opening the M2 ModerationQueueScreen can filter to "needs media" (queue-side filter — `status: pending` AND `media.photos.length === 0`), tap a row, upload one or more photos / videos / paste a tour URL via the new mod media-curation view, and have the listing become approval-eligible.
  2. A moderator's attempt to approve a pending listing with `media.photos.length === 0` is blocked with a clear `MEDIA_REQUIRED` error code (HTTP 400) — no listing can flip to `live` without at least one photo.
  3. The ModerationLog audit trail records `action: 'media-upload'` for every mod media-curation action (extends the M2 `'approve' | 'reject' | 'edit-on-behalf' | 'archive' | 'unarchive' | 'hard-delete'` enum), with `actorUid` sourced exclusively from the JWKS-verified token sub (anti-spoofing grep gate exit 0).
  4. The new `<ContextualListingFlow>` (Phase 2) ships zero media fields on the user-facing flow — no upload affordance is visible to a non-admin/non-moderator user creating or editing a listing.
  5. Existing M1+M2 listings with user-uploaded photos survive Phase 1's migration verbatim (already validated in SCHEMA-02 acceptance) and remain visible in Home/Favorites/RenterListings/OwnerListings; the user-account S3 upload rights are revoked at Phase 3 close (no in-flight user uploads possible after the rotation).

**Plans**: TBD
**UI hint**: yes

### Phase 4: M2 Carry-Forward Bug Fixes

**Goal**: Close two M2 carry-forward defects with independent risk profiles — CARRY-01 (ROLE-11 frontend mid-action 403 popup-recovery; touches 5+ submit handlers across the moderation/role UI) and CARRY-02 (Phase 4.5 landlord-application uid-mismatch; backend route fix with anti-spoofing grep gate + repair migration). Bundled into one phase because both are bug-fix-only with no schema/flow dependency, but they touch different surfaces and ship as separate atomic commit chains.

**Depends on**: Phase 1 (anti-spoofing grep-gate pattern is the same one M2 Phase 1 HF-03 established; CARRY-02 reuses that pattern). Phases 2 + 3 are independent — Phase 4 could land before, after, or in parallel; it is sequenced after Phase 3 here so QA in Phase 5 hits a single hardened surface.

**Requirements**: CARRY-01, CARRY-02.

**Success Criteria** (what must be TRUE):
  1. Demoting a moderator while their action popup is open (Approve / Reject in `ModerationQueueScreen` + `RejectListingModal` + `ArchiveListingModal` + `PropertyDetailsScreen` mod-action footer + `DeleteListingModal` + `RoleManagementScreen`) results in: popup loading state resets, popup closes, `RoleRefreshBanner` surfaces within ~1s, and the user can recover via tap-to-reload without an app restart.
  2. The anti-spoofing grep gate `grep -nE "uid:\s*req\.(body|headers)" src/routes/landlordApplicationRoutes.js` returns exit code 0 (zero matches) on the JayTap-services backend repo at Phase 4 close.
  3. A re-submission of the landlord application by an authenticated user lands in Mongo with `uid` matching the submitting Firebase token's `sub` (JWKS-verified `req.firebaseUid`), validated by a backend supertest case + a manual physical-device walk on iPhone 15 Pro Max.
  4. The repair migration (`migrate-landlord-app-uid-mismatch.js`) flips every existing mismatched row's stored `uid` to the JWKS-verified token's `sub` (or marks it as un-repairable + logs evidence), is idempotent, and runs operator-supervised with `--dry-run` + `--verify=PASS` matching the M2 Plan 02-02 pattern.

**Plans**: TBD
**UI hint**: yes

### Phase 5: Hardening + Manual Physical-Device QA + Release v3.0.0

**Goal**: Cross-cutting validation of every M3 surface (the 6-step flow happy path × 5 property types × 3 deal types, conditional sub-field rendering, exact-address toggle gating, mod media curation with publish-blocked-until-photo, ROLE-11 demote-mid-action recovery, Phase 4.5 uid-mismatch repair, EN+RU + dark/light parity) on physical iOS + Android devices, followed by atomic v3.0.0 version bump and dual-store submission — applying M1 D-02 + M2 Wave-1 query-first lessons (query Play Console + TestFlight history BEFORE setting versionCode/build-number baseline).

**Depends on**: Phases 1–4 (everything above must be shipped and passing before the QA matrix walks; backend live + healthy on Railway).

**Requirements**: REL-01, REL-02, REL-03, REL-04, REL-05, REL-06.

**Success Criteria** (what must be TRUE):
  1. `package.json` shows `"version": "3.0.0"` exactly; iOS Xcode `MARKETING_VERSION = 3.0.0`; Android `versionName = "3.0.0"`. iOS `CURRENT_PROJECT_VERSION` and Android `versionCode` derived from `06-STORE-HISTORY.md` (max-of-local-and-store + 1) per M1 D-02 lesson — no reactive bumps at archive time.
  2. The M3 manual physical-device QA matrix is walked APPROVED on iPhone 15 Pro Max + Moto G XT2513V — 6-step flow happy path × 5 property types × 3 deal types (15 cells) all PASS; conditional sub-field cells PASS; exact-address-hidden-for-hotel/hostel PASS; mod media-curation publish-blocked-until-photo PASS; ROLE-11 demote-mid-action recovery PASS; Phase 4.5 uid-mismatch repair walked end-to-end PASS; EN+RU + dark/light parity PASS per screen.
  3. EN+RU release notes are drafted, both ≤500 chars (Play Console binding limit), pasted on App Store Connect (en-US + ru-RU localizations) AND Google Play Console (en-US + ru-RU release notes); copy is region-neutral per memory `geographic-scope.md` (no Bishkek-only phrasing).
  4. Backend is live and healthy on Railway with M3 changes deployed; `firebase-admin` confirmed absent from backend `package.json`; MongoDB Atlas + AWS IAM credentials confirmed unchanged from the M2 baseline (HF-02 remains closed; AWS IAM cross-project residual remains documented PARTIAL — re-open condition unchanged).
  5. v3.0.0 is visible in App Store Connect TestFlight Internal Testing track AND Google Play Console Internal Testing track. M1 D-13 inheritance descope honored (privacy manifest unchanged; no new data-collecting SDK introduced in M3).

**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5

| Milestone | Phases | Status | Closed |
|-----------|--------|--------|--------|
| M1 v1.0.4 "Polish + Hospitality" | 8/8 (7 executed + Phase 7 SKIPPED) | ✅ SHIPPED | 2026-04-28 |
| M2 v2.0 "Roles & Moderation" | 6/6 (+ Phase 4.5 inserted) | ✅ SHIPPED | 2026-05-05 |
| M3 v3.0 "Contextual Forms" | 1/5 | 🚧 Executing | — |

### M3 Phase Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Schema Reshape + Backend Route Shape Cutover | 5/5 | Complete (4 operator UAT pending) | 2026-05-06 |
| 2. 6-Step Contextual Listing Flow (Client) | 4/9 | In progress (Plans 02-01 + 02-02 + 02-05 + 02-06 complete; Plans 02-03/04/07/08/09 remaining; operator deploys pending) | — |
| 3. Media Flow Inversion (Admin/Mod Curation) | 0/TBD | Not started | — |
| 4. M2 Carry-Forward Bug Fixes | 0/TBD | Not started | — |
| 5. Hardening + Manual Physical-Device QA + Release v3.0.0 | 0/TBD | Not started | — |

## Backlog

### Phase 999.1: Contextual listing creation flow (6-step conditional UI) — M3 anchor (BACKLOG)

**Goal:** [Captured for future planning] Replace the current generic listing form with a step-by-step contextual flow where each screen's fields are determined by previous answers (deal type × property type × admin toggles). Full spec: `.planning/phases/999.1-contextual-listing-flow-m3-anchor/SPEC.md` (collocated with this backlog entry).

**Status note (2026-05-05):** This entry is the M3 anchor; its scope is now distributed across M3 Phase 1 (schema), Phase 2 (6-step flow), and Phase 3 (media inversion). The 999.1 directory is retained as a historical reference until M3 Phase 2 ships and absorbs the SPEC into phase artifacts. Reconciliation points captured in PROJECT.md § "Current Milestone: v3.0 M3" and REQUIREMENTS.md hard rules.

**Target milestone:** M3 v3.0 "Contextual Forms" (planning started 2026-05-05; ready to execute via `/gsd-plan-phase 1`).

**Requirements:** Distributed — see M3 ROADMAP entries above. SCHEMA-01..05 → Phase 1; FLOW-01..16 → Phase 2; MEDIA-01..09 → Phase 3.

**Reconciliation points (RESOLVED at M3 milestone discovery):**
1. Spec's flat property-type taxonomy (`apartment | house | office | commercial | hotel`) — RESOLVED: M1's three-category 9-type taxonomy (Residential / Commercial / Hospitality) preserved per CLAUDE.md guard. Spec's flat list reframed onto categories (apartment + house → Residential; office + commercial → Commercial; hotel + hostel → Hospitality, kept as 2 sub-types per tour-first UI consistency, NOT collapsed into a single chip).
2. Spec inverts photo / video / 3D-tour upload from user to admin/mod (post-submission) — RESOLVED: confirmed direction — media inversion is an M3 deliverable (MEDIA-01..09 in Phase 3). S3 IAM policy update + user upload rights revocation in scope.

**Plans:** 0 plans (handled by M3 Phases 1–3)

Plans:
- [ ] N/A — promoted into M3 phase structure 2026-05-05

---

*M1 backlog entry 999.1 (archive listings — authors + mod/admin) was promoted into M2 Phase 4 on 2026-04-29; the corresponding `.planning/phases/999.1-archive-listings/` directory was removed during Phase 4 plan execution. The 999.1 number is now reused for the M3 anchor above.*

---

*Roadmap last updated: 2026-05-05 — M3 v3.0 "Contextual Forms" ROADMAP.md created via `/gsd-roadmapper`. 5 phases scoped covering all 38 v1 requirements (16 FLOW + 5 SCHEMA + 9 MEDIA + 2 CARRY + 6 REL); coverage gate clean (zero orphans, zero duplicates). Ready for `/gsd-plan-phase 1`.*

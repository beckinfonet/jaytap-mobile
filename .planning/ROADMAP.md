# Roadmap: JayTap

## Milestones

- ✅ **M1 v1.0.4 "Polish + Hospitality"** — 8 phases (shipped 2026-04-28) — see [milestones/v1.0.4-ROADMAP.md](milestones/v1.0.4-ROADMAP.md)
- ✅ **M2 v2.0 "Roles & Moderation"** — 6 phases + Phase 4.5 inserted (shipped 2026-05-05) — see [milestones/v2.0-ROADMAP.md](milestones/v2.0-ROADMAP.md)
- ✅ **M3 v3.0 "Contextual Forms"** — 5 phases (shipped 2026-05-11) — see [milestones/v3.0-ROADMAP.md](milestones/v3.0-ROADMAP.md)
- 🚧 **M4 v4.0 "Counts & Labels"** — 5 phases (Phases 6–10) — planning in progress (started 2026-05-25)

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

<details open>
<summary>🚧 M4 v4.0 "Counts & Labels" (Phases 6–10) — planning started 2026-05-25</summary>

- [x] **Phase 6: Schema Extension (Backend Mongoose + RN Type Stub + Body-Strip Validator)** — Add optional `basics.bedrooms` (integer) + `basics.bathroomCount` (0.5-step) under M3 nested schema; backend body-strip on residential-only field for hospitality/commercial property types — completed 2026-05-25
- [ ] **Phase 7: Stepper Component + ContextualListingFlow Integration** — New reusable `<StepperInput>` component + conditional Step 3 (basics) row integration per property type; create + edit-owner + edit-mod modes wired
- [ ] **Phase 8: Display Surfaces (PropertyCard + HospitalityCard + PropertyDetailsScreen)** — Beds/Baths specs cells read new fields with residential-vs-hospitality fallback resolution; "Bedrooms" vs "Rooms" label distinction
- [ ] **Phase 9: i18n Audit + Sentinel (Property-Type / Category / Deal-Type Display Strings)** — Audit + wrap every raw English property-type/category/dealType render surface; new `propertyType.*` + `propertyCategory.*` + `dealType.*` EN/RU namespaces + sentinel `check-no-raw-property-type-strings.sh` chained into RN-client jest pre-test
- [ ] **Phase 10: Hardening + Manual Physical-Device QA + Release v4.0.0** — Wave-1 query-first artifacts (PREFLIGHT / STORE-HISTORY / RELEASE-NOTES / BACKEND-DEPLOY / INHERITANCE-AUDIT) + Wave-2 atomic v4.0.0 bump + Wave-3 manual physical-device QA matrix walked APPROVED on iPhone 15 Pro Max + Moto G XT2513V + Wave-4 dual-store submission

</details>

## Phase Details

### Phase 6: Schema Extension (Backend Mongoose + RN Type Stub + Body-Strip Validator)
**Goal**: Backend Mongoose schema accepts two new optional `basics.*` fields with correct range/step validation, RN client type stub reflects them, and residential-only `basics.bedrooms` is silently stripped on hospitality/commercial submissions — without breaking any existing M3 listing read/write path.
**Depends on**: Nothing within M4 (foundation phase; builds on M3 nested schema baseline at SHA `5bf23fe`).
**Requirements**: SCHEMA-01, SCHEMA-02, SCHEMA-03, SCHEMA-04
**Success Criteria** (what must be TRUE):
  1. Posting a new apartment listing with `basics.bedrooms: 2` and `basics.bathroomCount: 1.5` persists both values to MongoDB and round-trips through GET unchanged.
  2. Posting a non-integer `basics.bedrooms` value (e.g. `2.5`) is rejected by Mongoose validation; posting a non-0.5-step `basics.bathroomCount` (e.g. `1.3`) is rejected by Mongoose validation; both rejections surface as 400 to the client.
  3. Posting a hotel listing with `basics.bedrooms: 3` in the body silently strips the field — backend response shows no `basics.bedrooms` on the persisted document, no 400 raised, no log noise (matches M3 D-13 strip-wins pattern).
  4. Existing M3 listings that have NO `basics.bedrooms` or `basics.bathroomCount` continue to load and render through every existing read path with zero migration script run (fields are optional; Mongoose ignores absent fields when `required: false`).
  5. RN client `src/types/Property.ts` compiles cleanly with `basics.bedrooms?: number` and `basics.bathroomCount?: number` present; no existing `basics.*` field renamed or removed.
**Plans**: 2 plans
  - [x] 06-01-PLAN.md — Mongoose schema extension (`basics.bedrooms` + `basics.bathroomCount` with `min/max/validate`) + RN client `src/types/Property.ts` type-stub additions + REQUIREMENTS.md D-01/D-02 doc-bug fixes (SCHEMA-01, SCHEMA-02, SCHEMA-03)
  - [x] 06-02-PLAN.md — Shared strip-helper utility (`src/utils/stripResidentialOnlyFields.js`) + POST/PUT/moderation-PUT body-strip wiring + route-layer `M4_BATHROOM_STEP_INVALID` / `M4_BEDROOMS_INVALID` 400s + `runValidators: true` defense-in-depth on moderation findOneAndUpdate + post-deploy Railway smoke checkpoint (SCHEMA-04)

### Phase 7: Stepper Component + ContextualListingFlow Integration
**Goal**: Owner of a residential or hospitality or office/commercial listing can enter and edit bedroom + bathroom counts via tap-only stepper buttons in the existing M3 ContextualListingFlow Step 3 (basics) — across create + edit-owner + edit-mod modes — with bounds-clamped UX and `undefined` preserved as the canonical "not provided" value.
**Depends on**: Phase 6 (form binds to new schema fields; type stub must exist before stepper writes through to the payload).
**Requirements**: FORM-01, FORM-02, FORM-03, FORM-04, FORM-05
**Success Criteria** (what must be TRUE):
  1. Owner creating a new apartment listing in ContextualListingFlow Step 3 sees a bedrooms stepper row (0–10, step 1) AND a bathrooms stepper row (0–10, step 0.5); tapping `+` from empty initializes to `0`; `−` at `0` is a no-op; values render in the stepper's value-display cell.
  2. Owner creating a hotel/hostel/office/commercial listing in Step 3 sees ONLY the bathroom-count stepper row (no bedrooms row) — confirming the conditional row logic respects property type.
  3. Owner editing an existing listing in edit-owner mode sees stepper rows pre-populated from `property.basics.bedrooms` / `property.basics.bathroomCount` when present, or em-dash display when absent; submitting without changing either field dispatches `undefined` verbatim (no coerce-to-zero); moderator using edit-mod mode can backfill counts without touching other fields.
  4. Stepper `+`/`−` buttons at min/max boundaries render disabled (using `colors.textSecondary`) and ignore taps; hit-slop ≥44pt verified per iOS HIG on physical device.
  5. `validateStep()` accepts `undefined` for both new fields on every applicable property type — submit advances without validation error rows surfacing.
**Plans**: 5 plans
  - [x] 07-01-PLAN.md — StepperInput component (FORM-01 + FORM-03) + co-located unit tests (D-11 6 cases)
  - [x] 07-02-PLAN.md — i18n keys: 2 labels + 2 error strings × EN/RU (8 entries total; parity gate)
  - [x] 07-03-PLAN.md — FormBag.basics extension + adapters (D-07/D-08) + validators defensive Step-3 checks (D-09 / FORM-04)
  - [x] 07-04-PLAN.md — Step3BasicInfo conditional stepper rows (FORM-02 / D-05 / D-06) + Step3 integration tests (D-12 ≥4 cases)
  - [x] 07-05-PLAN.md — index.tsx propertyType-clear extension + submit-catch M4_* discriminator (D-10 / FORM-05)
**UI hint**: yes

### Phase 8: Display Surfaces (PropertyCard + HospitalityCard + PropertyDetailsScreen)
**Goal**: Every browse + details surface (PropertyCard, HospitalityCard, PropertyDetailsScreen specs row) renders the correct beds/baths/rooms count per property type with localized labels distinguishing "Bedrooms" (residential) from "Rooms" (hospitality), and falls back to `'-'` when the count is absent — preserving the M3 + 260525-i2i canonical specs-row layout.
**Depends on**: Phase 6 (display reads new schema fields).
**Requirements**: DISP-01, DISP-02, DISP-03, DISP-04, DISP-05
**Success Criteria** (what must be TRUE):
  1. Browsing the Home screen, an apartment with `basics.bedrooms: 2` renders the PropertyCard Beds cell as `2` with the label "Bedrooms" (EN) / "Спальни" (RU); a hotel listing renders the Beds cell from `basics.hotelRooms` with the label "Rooms" / "Комнаты"; an apartment with no bedroom data renders `'-'`.
  2. Browsing the Home screen, every Baths cell renders `basics.bathroomCount` when present (decimals as `1.5`, `2.5`, etc.) with the label "Bathrooms" / "Ванные"; falls back to `'-'` when absent; Land listings render `'-'` for layout consistency.
  3. Opening a PropertyDetailsScreen on a residential listing shows the canonical Beds | Baths | m² specs row with "Bedrooms" / "Спальни" label; opening one on a hospitality listing shows "Rooms" / "Комнаты" — m² placement preserved from quick task 260525-i2i (canonical specs row only; no duplicate).
  4. HospitalityCard continues rendering `basics.hotelRooms` with the "Rooms" label unchanged AND adds a bathroomCount line when `basics.bathroomCount` is present (visual treatment matches existing M1 Phase 6 tour-first density).
  5. EN+RU lockstep parity gate (`scripts/check-i18n-parity.sh`) exits 0 after the specs-row label key additions; no raw English strings added to any new render path.
**Plans**: 5 plans
  - [x] 08-01-PLAN.md — i18n keys: 3 specs-row label keys × EN/RU (property.specs.bedrooms/bathrooms/rooms; parity gate) (DISP-05)
  - [x] 08-02-PLAN.md — PropertyCard specs-strip redesign (icon/value/label cell anatomy; office/commercial Beds-hide; bathroomCount unification; specItem flexDirection mutation) + new PropertyCard.test.tsx 5 cases (DISP-01, DISP-02, DISP-05)
  - [x] 08-03-PLAN.md — HospitalityCard inline bathroomCount fragment (conditional render; preserves M1 Phase 6 D-10 tour-first invariant) + new HospitalityCard.test.tsx 4 cases (DISP-04, DISP-05)
  - [x] 08-04-PLAN.md — PropertyDetailsScreen specs row rewrite (!isHospitality gate lifted; category-aware label flip; office/commercial Beds-hide; bathroomCount unification; m² preserved per 260525-i2i) + new PropertyDetailsScreen.test.tsx 5 cases (DISP-01, DISP-02, DISP-03, DISP-05)
  - [x] 08-05-PLAN.md — ListingMetaTable surgical removal of rooms + bathroom-enum rows + derivations + hasExtras chain links (mirrors 260525-i2i surgical pattern) + new ListingMetaTable.test.tsx 6 cases (DISP-03)
**UI hint**: yes

### Phase 9: i18n Audit + Sentinel (Property-Type / Category / Deal-Type Display Strings)
**Goal**: Every render surface in `src/` that shows a property type, property category, or deal type to the user reads from EN/RU keys instead of raw English literals — and a new CI sentinel prevents the regression from ever returning.
**Depends on**: Phase 6 (no hard dep but executes after schema lands); independent of Phase 7/8 in scope but the new specs-row label keys added in Phase 8 should align with the new namespaces seeded here.
**Requirements**: I18N-01, I18N-02, I18N-03, I18N-04, I18N-05, I18N-06, I18N-07
**Success Criteria** (what must be TRUE):
  1. RU-locale user opening the Home screen sees Russian property-type labels (Квартира / Дом / Гостиница / Хостел / Офис / Коммерческое) on the chip filter row — not raw English — closing the `HomeScreen.tsx:514` finding from 260525-ggp.
  2. RU-locale user navigating every other surface that renders a property type / category / deal type sees the localized label (verified via the audit-produced `file:line` reference list — no surface left raw).
  3. EN-locale user sees the corresponding English labels routed through the same `t()` mechanism (not raw constants) — proven by EN+RU parity (`scripts/check-i18n-parity.sh` exit 0).
  4. New sentinel `scripts/check-no-raw-property-type-strings.sh` exits 0 against the post-fix codebase AND exits non-zero against a deliberately-introduced raw `<Text>Apartment</Text>` regression (proven via the sentinel's own test or audit hook); sentinel chained into RN-client jest pre-test step.
  5. `PROPERTY_TYPES` exported constant either keeps Pascal-cased IDs translated at render-site via `t('propertyType.' + id.toLowerCase())` OR is replaced with `{ id, labelKey }` object arrays — the chosen path passes both I18N-05 and I18N-06 with zero raw-string surface remaining.
**Plans**: TBD
**UI hint**: yes

### Phase 10: Hardening + Manual Physical-Device QA + Release v4.0.0
**Goal**: M4 ships to ASC TestFlight Internal Testing + Play Console Internal Testing as v4.0.0 with the M1 D-02 pre-archive store-history check applied upfront, all six release reqs satisfied, and zero new data-collecting SDKs or auth provider additions to trigger privacy/entitlement re-touch.
**Depends on**: Phases 6–10 (all M4 surfaces must be shipped and passing before QA matrix walks; backend live + healthy on Railway).
**Requirements**: REL-01, REL-02, REL-03, REL-04, REL-05, REL-06
**Success Criteria** (what must be TRUE):
  1. iPhone 15 Pro Max + Moto G XT2513V physical-device QA matrix walked APPROVED with FAIL=0 across stepper input + display surfaces + RU locale parity + M1 KBD-02 keyboard regression check + M3 contextual flow regression check; empirical-sampling-mass-disposition (M3 RETROSPECTIVE.md lesson 4) acceptable for feature-surface cells, walk-and-confirm required for golden-path cells.
  2. RN client `package.json` shows version `4.0.0`; iOS `MARKETING_VERSION 4.0.0` (Debug + Release) + `CURRENT_PROJECT_VERSION` next-from-Path-B-store-history; Android `versionName 4.0.x` + `versionCode` next-from-Path-B-store-history — all derived from Wave-1 pre-archive Play Console + TestFlight queries (M1 D-02 pattern; fired twice — must not fire a third time at archive).
  3. Bilingual EN+RU release notes drafted under the 500-char Play Console binding limit, region-neutral phrasing per memory `geographic-scope.md`, pasted on both ASC + Play Console.
  4. Backend live + healthy on Railway at release SHA; sentinel chain green end-to-end (`actoruid → landlord-uid → media-stripped → i18n-parity → create-listing-screen-removed → jest` on backend; `check-no-raw-property-type-strings → jest` on RN client); `firebase-admin` confirmed absent for the 4th consecutive milestone.
  5. v4.0.0 visible in ASC TestFlight Internal Testing track + Play Console Internal Testing track (per M1 D-12: TestFlight Internal + Play Console Internal Testing visibility = phase-exit); M1 D-13 inheritance descope honored (privacy manifest, App Privacy responses, Data Safety questionnaire, entitlements re-touched only if a new data-collecting SDK landed during M4).
**Plans**: TBD

## Progress

| Milestone | Phases | Status | Closed |
|-----------|--------|--------|--------|
| M1 v1.0.4 "Polish + Hospitality" | 8/8 (7 executed + Phase 7 SKIPPED) | ✅ SHIPPED | 2026-04-28 |
| M2 v2.0 "Roles & Moderation" | 6/6 (+ Phase 4.5 inserted) | ✅ SHIPPED | 2026-05-05 |
| M3 v3.0 "Contextual Forms" | 5/5 | ✅ SHIPPED | 2026-05-11 |
| M4 v4.0 "Counts & Labels" | 1/5 | 🚧 In Progress | — |

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 6. Schema Extension | 2/2 | ✅ Complete | 2026-05-25 |
| 7. Stepper Component + Flow Integration | 0/5 | Planned | — |
| 8. Display Surfaces | 0/5 | Planned | — |
| 9. i18n Audit + Sentinel | 0/TBD | Not started | — |
| 10. Hardening + QA + Release v4.0.0 | 0/TBD | Not started | — |

## Backlog

### Phase 999.1: Contextual listing creation flow (6-step conditional UI) — M3 anchor (CLOSED — promoted + shipped)

**Status (2026-05-11):** Fully consumed by M3 — Phase 1 (SCHEMA-01..05), Phase 2 (FLOW-01..16), Phase 3 (MEDIA-01..09). All 30 anchor requirements shipped in v3.0.x on 2026-05-11. The historical SPEC.md remains at `.planning/milestones/v3.0-phases/999.1-contextual-listing-flow-m3-anchor/SPEC.md` for reference; the working backlog entry is closed.

---

*M1 backlog entry 999.1 (archive listings — authors + mod/admin) was promoted into M2 Phase 4 on 2026-04-29. M3 reused the 999.1 number for the contextual-flow anchor SPEC. Future backlog entries should continue from 999.2 to avoid number reuse confusion.*

---

*Roadmap last updated: 2026-05-25 — M4 Phase 7 planned (5 plans: 07-01 StepperInput component + tests, 07-02 i18n keys, 07-03 FormBag/adapters/validators, 07-04 Step3 integration + tests, 07-05 index.tsx orchestrator wiring). Phase 6 closed 2026-05-25. M4 v4.0 "Counts & Labels" scoping landed via `/gsd-roadmap` 2026-05-25. 5 phases (Phases 6–10) covering 27 v1 requirements (SCHEMA-01..04 + FORM-01..05 + DISP-01..05 + I18N-01..07 + REL-01..06). Phase numbering continues from M3 (no `--reset-phase-numbers`). M3 v3.0 closed 2026-05-11; collapsed details summaries preserved for M1 + M2 + M3.*

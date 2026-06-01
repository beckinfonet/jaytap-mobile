# Roadmap: JayTap

## Milestones

- ✅ **M1 v1.0.4 "Polish + Hospitality"** — 8 phases (shipped 2026-04-28) — see [milestones/v1.0.4-ROADMAP.md](milestones/v1.0.4-ROADMAP.md)
- ✅ **M2 v2.0 "Roles & Moderation"** — 6 phases + Phase 4.5 inserted (shipped 2026-05-05) — see [milestones/v2.0-ROADMAP.md](milestones/v2.0-ROADMAP.md)
- ✅ **M3 v3.0 "Contextual Forms"** — 5 phases (shipped 2026-05-11) — see [milestones/v3.0-ROADMAP.md](milestones/v3.0-ROADMAP.md)
- 🚧 **M4 v4.0 "Counts & Labels"** — 5 phases (Phases 6–10) — planning in progress (started 2026-05-25)
- 🚧 **M5 v5.0 "Details & Geocoding"** — 1+ GSD-tracked phases (Phase 11+) — Phase 1 "Property Details Redesign" merged 2026-05-26 outside GSD (see `docs/superpowers/plans/2026-05-26-property-details-redesign.md`); Phase 11 = first GSD-tracked M5 entry
- 🚧 **M6 v6.0 "Filter Variants + Profile Reskin"** — 5 phases (Phases 12–16) — planning started 2026-05-31 (MoveIn design handoff adoption — whole-app palette migration + multi-select filter data model + 2 of 4 filter UI variants for v1 + Account Settings restructure + Profile reskin)

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
<summary>🚧 M5 v5.0 "Details & Geocoding" (Phase 11+) — GSD-tracked from Phase 11</summary>

- [merged outside GSD] **M5 Phase 1: Property Details Redesign** — 12 commits merged to main 2026-05-26 (HEAD 6520908). Tracked in `docs/superpowers/plans/2026-05-26-property-details-redesign.md`, not under `.planning/phases/`.
- [ ] **Phase 11: Listing Address Geocode (Forward + Reverse)** — Add typed-address forward-geocode + pin-drop reverse-geocode to `<ContextualListingFlow>` Step 2 + persist `location.address` end-to-end (RN + backend Mongoose) + fix orphaned `geocodeAddress` utility (AbortController timeout, KG/KZ/UZ viewbox, `addressdetails=1`, request-language `Accept-Language`). Source-of-truth: `.planning/debug/listing-address-geocode.md`.

</details>

<details open>
<summary>🚧 M6 v6.0 "Filter Variants + Profile Reskin" (Phases 12–16) — planning started 2026-05-31</summary>

- [ ] **Phase 12: Whole-App Palette Migration (Dark + Light) + Visual-Regression Sweep** — Rewrite `src/theme/colors.ts` light + dark sets to MoveIn handoff tokens (dark `bg #121214` / `surface #1c1c20`; light `bg #f3f3f6` / `surface #ffffff`); preserve mode-independent accent `#ff5a6f`, landlord green `#35c98f`, destructive red `#ff4d4d`; sweep every screen reading `colors.*` on iPhone 15 Pro Max + Moto G XT2513V × EN/RU × light/dark.
- [ ] **Phase 13: Shared Filter Data Model + AsyncStorage Persistence** — Refactor HomeScreen filter state from `selectedType: string \| null` to `types: string[]` multi-select; introduce single `buildFilterQuery({ deal, category, types })` query builder consumed by every variant + `filteredProperties` memo; ship new `useFilterStyle()` hook persisting `'guided' \| 'cascading' \| 'master' \| 'sentence'` to AsyncStorage under `@jaytap_filter_style` (default `'guided'`).
- [ ] **Phase 14: Filter UI Variants (Guided Steps + Cascading Reveal) + HomeScreen Variant Dispatch** — Two interchangeable filter UIs on the shared DATA model: Guided Steps bottom-sheet wizard (1-2-3 stepper Deal → Category → Type with auto-advance + live "Show N homes" CTA) and Cascading Reveal inline panel under the search bar (segmented Rent/Buy → underlined Category tabs → multi-select Type chips with left nesting rail); HomeScreen filter-button press launches the variant matching the user's `filterStyle` preference, live-swappable from AccountSettings with no app restart.
- [ ] **Phase 15: Account Settings Restructure + Filter-Style Picker** — Restructure AccountSettingsScreen into three labelled sections per handoff spec (ACCOUNT / PREFERENCES / DANGER ZONE) with handoff typographic treatment; add filter-style picker in Preferences as expandable row listing all 4 styles with Guided + Cascading selectable and Master-Detail + Sentence shown with "Coming soon" badge + disabled radio (Phase B forward-fit); preserve every existing AccountSettings surface (Account info fields, Language toggle, Delete-account → DeleteAccountModal) verbatim in their new section homes.
- [ ] **Phase 16: Profile Reskin (User Grouped-Rows + Admin/Mod Tile Dashboard)** — Two layout variants by role per handoff spec: grouped-row layout for regular users (identity card → optional landlord banner → ACTIVITY card → HOSTING card → Create Listing accent-filled row → Log out outlined pill) and tile-dashboard layout for admin/moderator (identity card with role badge → MY ACTIVITY 2×2 tiles → ADMIN TOOLS section with role-gated tiles: Landlord Applications + Moderation Queue for both roles, Role Management admin-only); live count badges + every existing navigation handler + landlord-application status banner preserved.

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
**Plans**: 2 plans
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
**Plans**: 2 plans

### Phase 11: Listing Address Geocode (Forward + Reverse)
**Goal**: On Step 2 ("Where is the listing?") of `<ContextualListingFlow>`, a user can type a street address ("100 Manas Street") and the pin auto-places at the geocoded lat/lon; and dropping a pin best-effort fills the address field — both directions persist `location.address` end-to-end (FormBag → Property type → backend Mongoose) and the underlying Nominatim helper has the AbortController/viewbox/language fixes baked in.
**Depends on**: M3 Phase 1 (nested `location` schema) — no in-flight M4 dependency.
**Requirements**: TBD (will be derived during planning from `.planning/debug/listing-address-geocode.md` Proposed Fix section)
**Success Criteria** (what must be TRUE):
  1. Typing a recognizable KG/KZ/UZ street address in the new Step 2 text input debounces, calls `POST /api/locations/geocode`, and on success moves the pin to the returned lat/lon and writes both `address` and `coordinates` into `FormBag.location`. On failure, the typed text is preserved and the pin does NOT move (anti-"random pin" defense — the historical bug user remembered).
  2. Dropping or dragging the map pin calls `POST /api/locations/reverse-geocode` and, when the `address` field is empty, fills it with the returned display name. Never overwrites typed text.
  3. `Property.location.address` round-trips correctly: client → backend → MongoDB → backend → client → render. Existing M3 listings with no `address` continue to load and render (field is optional, defaults to empty).
  4. Backend `geocodeAddress` + new `reverseGeocode` helpers respect KG/KZ/UZ scope via `countrycodes=kg,kz,uz` and bias by selected city's centroid (viewbox) when provided. Both have a 5s `AbortController` timeout. `Accept-Language` honors the caller's UI language (EN or RU).
  5. EN+RU parity for all new strings (`step2.addressLabel`, `step2.addressPlaceholder`, `step2.addressNotFound`, `step2.addressGeocoding`); `scripts/check-i18n-parity.sh` exits 0.
  6. `PropertyDetailsScreen` (and downstream renderers using location text) prefer `location.address` when present, falling back to the existing `district, city` synthesis. No regression in property-details layout from M5 Phase 1's redesign.
**Plans**: TBD — to be generated by `/gsd-plan-phase 11`
**UI hint**: yes

### Phase 12: Whole-App Palette Migration (Dark + Light) + Visual-Regression Sweep
**Goal**: Every screen in the app reads from the MoveIn handoff palette tokens (dark + light parity) instead of M3/M5-era ad-hoc tokens — with the mode-independent accent / landlord-green / destructive-red preserved — and the user can walk every screen on iPhone 15 Pro Max + Moto G XT2513V × EN/RU × light/dark without seeing broken contrast, illegible text, or theme drift artifacts. Foundation phase for M6 — every later M6 phase builds on these tokens.
**Depends on**: Nothing within M6 (foundation phase; touches `src/theme/colors.ts` which every other screen reads). No backend dependency; no M4/M5 cross-cut beyond existing shared `useTheme()` contract.
**Requirements**: PAL-01, PAL-02, PAL-03
**Success Criteria** (what must be TRUE):
  1. Switching device theme to dark mode renders the new handoff palette across every screen: backgrounds at `#121214`, surfaces at `#1c1c20`, text at `#f4f4f6`, hair-lines at `rgba(255,255,255,0.08)` — verified by spot-walking HomeScreen, PropertyDetailsScreen, ProfileScreen, AccountSettingsScreen, ChatScreen, AppointmentsScreen, ContextualListingFlow Steps 1–6, MediaCurationScreen, ModerationQueueScreen, RoleManagementScreen on iPhone 15 Pro Max.
  2. Switching device theme to light mode renders the new handoff palette across the same screens: backgrounds at `#f3f3f6`, surfaces at `#ffffff`, text at `#16161a`, hair-lines at `rgba(0,0,0,0.08)` — no `colors.*` site returning a hex that drifts from the new tokens.
  3. The accent (pink `#ff5a6f` + soft `rgba(255,90,111,0.16)` + line `rgba(255,90,111,0.45)`), landlord green (`#35c98f`), and destructive red (`#ff4d4d`) render identically in dark and light modes — no mode-dependent drift on Submit / Approve / Reject / Archive / Delete affordances.
  4. The Moto G XT2513V walks every screen listed in PAL-03 in both modes + both locales without a single contrast-failure call-out (WCAG AA), illegible-text instance, or visible theme-drift artifact (e.g. an M5-era surface bleeding through a Phase 12 token).
  5. Existing `useTheme()` consumers compile and render unchanged — no per-screen hex literals introduced; the palette swap is single-source-of-truth via `src/theme/colors.ts` only.
**Plans**: 2 plans
  - [x] 12-01-PLAN.md — Rewrite `src/theme/colors.ts` to ship the MoveIn handoff palette (MODE_INDEPENDENT_PALETTE const extraction per D-04; 7 rewritten + 9 new keys per D-08; 15 orphan keys retained verbatim per D-01; `ThemeColors = typeof colors.light` unchanged per D-07) (PAL-01, PAL-02)
  - [x] 12-02-PLAN.md — Operator-driven visual-regression sweep across the 15-screen risk-target list × iPhone 15 Pro Max + Moto G XT2513V × EN/RU × light/dark + write `12-VERIFICATION.md` in mass-disposition format per D-05 (PAL-03)
**UI hint**: yes

### Phase 13: Shared Filter Data Model + AsyncStorage Persistence
**Goal**: HomeScreen filters move from single-select string state to a multi-select shared data model wrapped behind one query-builder function, and the user's filter-style preference persists per-device through a new `useFilterStyle()` hook reading from AsyncStorage on app mount. Pure data-layer + persistence phase — no UI changes yet; sets the foundation for Phase 14's variant implementations.
**Depends on**: Phase 12 (data-layer work happens against the new palette so any incidental UI tweaks land on the post-migration tokens).
**Requirements**: DATA-01, DATA-02, DATA-03
**Success Criteria** (what must be TRUE):
  1. Selecting two property types simultaneously on the existing filter surface (or via a debug fixture during the data-layer phase) returns the OR-union of listings matching either type within the selected category — proving `filteredProperties` reads `types: string[]` as a multi-select set, not the legacy `selectedType: string | null`.
  2. The `buildFilterQuery({ deal, category, types })` function returns the canonical filter shape for every variant (including the two not implemented in v1) — verified by unit tests covering `types: []` → all-types-in-category, `types: ['apartment']` → single-type, `types: ['apartment','house']` → union, and the cross-product against `deal: 'rent' | 'buy'` × `category: 'residential' | 'commercial' | 'hospitality'`.
  3. Killing the app and reopening it preserves the user's last-picked `filterStyle` value (default `'guided'` on first launch) — proving `useFilterStyle()` reads from `@jaytap_filter_style` on mount with no flash of the wrong default.
  4. Writing a new `filterStyle` value (via the hook's `setFilterStyle` setter, exercised by a debug fixture or a deferred SET-02 prelinking task) persists immediately to AsyncStorage and survives an app cold-start.
  5. No backend round-trip is introduced — the filter-style preference is device-local; no Mongoose schema change; no new API call.
**Plans**: 2 plans

### Phase 14: Filter UI Variants (Guided Steps + Cascading Reveal) + HomeScreen Variant Dispatch
**Goal**: Two interchangeable filter UIs render on top of Phase 13's shared data model, and the HomeScreen filter button launches the variant matching the user's `filterStyle` preference — switching the preference in AccountSettings live-swaps the variant on the next filter-button press with no app restart required. Delivers the v1 visible value of M6 (variants are the point — memory `m6-filter-variants-are-the-point.md`).
**Depends on**: Phase 12 (variants render against new palette tokens) AND Phase 13 (variants read/write the shared filter data model + `useFilterStyle()` hook).
**Requirements**: FILT-01, FILT-02, FILT-03
**Success Criteria** (what must be TRUE):
  1. With `filterStyle === 'guided'`, tapping the HomeScreen filter button opens a bottom-sheet wizard with a 1-2-3 stepper (Deal → Category → Type); picking Deal auto-advances to Category; picking Category auto-advances to Type; the Type step shows multi-select cards with square-checkbox affordance + "Choose one or more" hint; a live "Show N homes" CTA at the footer updates on every selection change; tapping the CTA closes the sheet and applies the filter to HomeScreen.
  2. With `filterStyle === 'cascading'`, tapping the HomeScreen filter button opens an inline panel under the search bar with a segmented Rent/Buy toggle at top → underlined Category tab strip (Residential / Commercial / Hospitality) → multi-select Type chip row → left nesting rail visually joining Category to Type → live result line ("N homes · Rent · Residential · 3 types") below; selections apply incrementally to HomeScreen.
  3. Switching `filterStyle` in AccountSettings (Phase 15) from `'guided'` → `'cascading'` (or vice versa) and tapping the HomeScreen filter button opens the new variant — no app restart, no flash of the previous variant.
  4. Both variants read from and write to the same `{ deal, category, types }` shared state — applying a filter in Guided and then opening Cascading shows the same selections pre-populated (and vice versa).
  5. EN+RU parity is held for every new UI string in both variants (`scripts/check-i18n-parity.sh` exits 0); KBD-02 grep gate (`keyboardVerticalOffset` count in `src/`) remains 0.
**Plans**: 3 plans
  - [x] 14-01-PLAN.md — Shared filter primitives (DealToggle, CheckSquare, Stepper, MultiHint, ShowButton, Breadcrumb, TypeIcon, joinTypes) + Wave-0 Modal-render probe + filters.* i18n subset (FILT-01, FILT-02)
  - [x] 14-02-PLAN.md — <CascadingFilter> inline panel + HomeScreen surgical extract (delete ~169 LOC of inline JSX + 10 orphan StyleSheet keys; mount behind filterStyle === "cascading" gate; useFilterStyle hook wired) (FILT-02)
  - [x] 14-03-PLAN.md — <GuidedFilterSheet> Modal+Animated bottom-sheet with load-bearing localOpen shadow + HomeScreen variant dispatch (mount alongside Cascading; both variants share state) (FILT-01, FILT-03)
**UI hint**: yes

### Phase 15: Account Settings Restructure + Filter-Style Picker
**Goal**: AccountSettingsScreen restructures into three labelled sections per the handoff (ACCOUNT / PREFERENCES / DANGER ZONE) and gains a filter-style picker in Preferences where the user can choose between Guided Steps + Cascading Reveal (selectable in v1) and see Master-Detail + Sentence as "Coming soon" forward-fit affordances — without regressing any existing AccountSettings surface (Account info fields, Language toggle, Delete account flow).
**Depends on**: Phase 12 (renders against new palette tokens) AND Phase 13 (filter-style picker writes via `useFilterStyle()` hook); cross-cuts Phase 14 (the variants the picker selects between).
**Requirements**: SET-01, SET-02, SET-03
**Success Criteria** (what must be TRUE):
  1. Opening AccountSettings shows three labelled sections in this order: ACCOUNT (existing read rows + Edit affordance), PREFERENCES (Language EN/Русский segmented toggle + Filter-style picker), DANGER ZONE (Delete account row) — section labels rendered in the handoff's small uppercase letter-spacing typographic treatment.
  2. Tapping the Filter-style row in Preferences expands to show all 4 styles (Guided Steps + Cascading Reveal + Master–Detail + Sentence) each with icon + name + one-line description + radio affordance; the chevron rotates on expand; Guided + Cascading are selectable; Master-Detail + Sentence display a "Coming soon" badge with disabled radio.
  3. Picking Guided or Cascading writes the value via `useFilterStyle().setFilterStyle()` (DATA-03) and reflects immediately in the subtitle ("Currently: Guided Steps"); the next HomeScreen filter-button press (Phase 14) opens the new variant.
  4. Existing AccountSettings flows work verbatim in their new section homes: Account info edit-mode toggle still saves First Name / Last Name / Phone / WhatsApp / Telegram; Language toggle still persists via `LanguageContext.setLanguage()`; Delete account still routes through `DeleteAccountModal`.
  5. EN+RU parity is held for every new section label, picker description, and "Coming soon" string (`scripts/check-i18n-parity.sh` exits 0); no Account Settings test regression.
**Plans**: 2 plans
  - [x] 15-01-PLAN.md — Screen restructure + token migration + SectionLabel primitive + APPLICATION section (SET-01, SET-03) — shipped 2026-06-01 (commits c404111 + 20f6dd8)
  - [x] 15-02-PLAN.md — FilterStyleRow picker behavior + 4-style listing + i18n (SET-02) — shipped 2026-06-01 (commits 2a2f4cb + bf27e16 + 6584c2d)
**UI hint**: yes

### Phase 16: Profile Reskin (User Grouped-Rows + Admin/Mod Tile Dashboard)
**Goal**: ProfileScreen renders two distinct layouts by role per handoff spec — grouped-row layout for regular users (identity card → optional landlord banner → ACTIVITY card → HOSTING card → Create Listing accent-filled row → Log out outlined pill) and tile-dashboard layout for admin/moderator (identity card with role badge → MY ACTIVITY 2×2 tiles → ADMIN TOOLS section with role-gated tiles: Landlord Applications + Moderation Queue for both roles, Role Management admin-only) — while preserving every existing badge, count, navigation handler, and landlord-application banner.
**Depends on**: Phase 12 (renders against new palette tokens). No dependency on Phases 13/14/15 — Profile reskin is a pure presentational re-skin with no data-layer cross-cut.
**Requirements**: PROF-01, PROF-02, PROF-03
**Success Criteria** (what must be TRUE):
  1. A regular user opening Profile sees the grouped-row layout: identity card (avatar + name + email + "Account settings ›" pill) → "You're a Landlord" green-tinted banner (when applicable, gated as today) → ACTIVITY card (Favorites + Appointments rows) → HOSTING card (My Listings row) → Create Listing accent-filled row → Log out outlined pill; row anatomy is 38px neutral icon chip + label (16/600) + sub (12.5 dim) + chevron.
  2. An admin or moderator opening Profile sees the tile-dashboard layout: identity card with role badge ("ADMIN" or "MODERATOR" accent pill with shield icon) → MY ACTIVITY 2×2 tiles (Favorites, Appointments, My Listings, Create Listing accent-filled) → ADMIN TOOLS section with STAFF pill label and role-gated tiles (Landlord Applications + Moderation Queue for both roles; Role Management admin-only, rendering full-width when it's the odd tile).
  3. Live count badges (accent) on tiles with pending counts: Moderation Queue tile shows the `pendingCount` from `PropertyService.getModerationQueueCount` (with the existing `moderationCountRefreshKey` invalidation); favorite count, appointment count, and My Listings count source from the existing fetchers — no count regression.
  4. Every existing navigation handler routes verbatim (`onCreateListing`, `onViewListings`, `onViewFavorites`, `onViewAppointments`, `onViewAccountSettings`, `onApplyLandlord`, `onReviewLandlordApplications`, `onReviewModerationQueue`, `onOpenRoleManagement`); landlord-application status banner still renders when applicable; no App.tsx call-site change required.
  5. EN+RU parity is held for every new section label, tile string, and role-badge text (`scripts/check-i18n-parity.sh` exits 0); both layouts walked APPROVED on iPhone 15 Pro Max + Moto G XT2513V × EN/RU × light/dark for at least one regular-user account and one admin account.
**Plans**: 2 plans
  - [ ] 16-01-PLAN.md — Profile primitives (ProfileRow / ProfileTile / ProfileToolTile / IdentityCard / RoleBadge / OutlinedLogoutPill) + EN/RU i18n keys + LandlordApplicationStatusBanner token swap (PROF-01, PROF-02, PROF-03 — additive layer, zero-risk to running app)
  - [ ] 16-02-PLAN.md — ProfileScreen.tsx rewrite with two role-discriminated layouts (user grouped rows / admin tile dashboard); rip themeStyles{} useMemo; preserve CR-02 cooldown block verbatim; 3 co-located screen tests + on-device QA checkpoint (PROF-01, PROF-02, PROF-03)
**UI hint**: yes

## Progress

| Milestone | Phases | Status | Closed |
|-----------|--------|--------|--------|
| M1 v1.0.4 "Polish + Hospitality" | 8/8 (7 executed + Phase 7 SKIPPED) | ✅ SHIPPED | 2026-04-28 |
| M2 v2.0 "Roles & Moderation" | 6/6 (+ Phase 4.5 inserted) | ✅ SHIPPED | 2026-05-05 |
| M3 v3.0 "Contextual Forms" | 5/5 | ✅ SHIPPED | 2026-05-11 |
| M4 v4.0 "Counts & Labels" | 3/5 | 🚧 In Progress | — |
| M5 v5.0 "Details & Geocoding" | 1 outside-GSD + 1 GSD-tracked complete | 🚧 In Progress | — |
| M6 v6.0 "Filter Variants + Profile Reskin" | 0/5 | 🚧 In Progress | — |

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 6. Schema Extension | 2/2 | ✅ Complete | 2026-05-25 |
| 7. Stepper Component + Flow Integration | 5/5 | ✅ Complete | 2026-05-25 |
| 8. Display Surfaces | 5/5 | ✅ Complete | 2026-05-26 |
| 9. i18n Audit + Sentinel | 0/TBD | Not started | — |
| 10. Hardening + QA + Release v4.0.0 | 0/TBD | Not started | — |
| 11. Listing Address Geocode (M5 GSD-tracked #1) | 6/6 | ✅ Complete    | 2026-05-27 |
| 12. Whole-App Palette Migration (Dark + Light) + VR Sweep | 2/2 | Complete   | 2026-05-31 |
| 13. Shared Filter Data Model + AsyncStorage Persistence | 2/2 | Complete    | 2026-05-31 |
| 14. Filter UI Variants (Guided + Cascading) + HomeScreen Dispatch | 3/3 | Complete   | 2026-05-31 |
| 15. Account Settings Restructure + Filter-Style Picker | 2/2 | Implementation Complete — Plans 01+02 shipped 2026-06-01 (on-device QA owed) | 2026-06-01 |
| 16. Profile Reskin (User Grouped-Rows + Admin/Mod Tile Dashboard) | 1/2 | In Progress|  |

## Backlog

### Phase 999.1: Contextual listing creation flow (6-step conditional UI) — M3 anchor (CLOSED — promoted + shipped)

**Status (2026-05-11):** Fully consumed by M3 — Phase 1 (SCHEMA-01..05), Phase 2 (FLOW-01..16), Phase 3 (MEDIA-01..09). All 30 anchor requirements shipped in v3.0.x on 2026-05-11. The historical SPEC.md remains at `.planning/milestones/v3.0-phases/999.1-contextual-listing-flow-m3-anchor/SPEC.md` for reference; the working backlog entry is closed.

---

*M1 backlog entry 999.1 (archive listings — authors + mod/admin) was promoted into M2 Phase 4 on 2026-04-29. M3 reused the 999.1 number for the contextual-flow anchor SPEC. Future backlog entries should continue from 999.2 to avoid number reuse confusion.*

---

*Roadmap last updated: 2026-05-31 — M6 v6.0 "Filter Variants + Profile Reskin" scoping landed via `/gsd-roadmap`. 5 phases (Phases 12–16) covering 15 v1 requirements (PAL-01..03 + DATA-01..03 + FILT-01..03 + SET-01..03 + PROF-01..03). Phase numbering continues from M4 Phase 10 + M5 Phase 11 (no `--reset-phase-numbers`). M6 starts as a parallel third in-flight milestone alongside M4 (Phases 9–10 open) and M5 (Phase 11 closed 2026-05-27). M6 release is out-of-scope for this roadmap — will ride M4 Phase 10's hardening cycle OR get a separate release phase added later per user decision. Prior footer (2026-05-25): M4 Phase 7 planned (5 plans); Phase 6 closed 2026-05-25; M4 v4.0 "Counts & Labels" scoping landed via `/gsd-roadmap` 2026-05-25; 5 phases (Phases 6–10) covering 27 v1 requirements. Phase numbering continues from M3 (no `--reset-phase-numbers`). M3 v3.0 closed 2026-05-11; collapsed details summaries preserved for M1 + M2 + M3.*

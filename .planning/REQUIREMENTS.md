# JayTap — M4 v4.0 "Counts & Labels" Requirements

**Milestone:** M4 v4.0 "Counts & Labels"
**Started:** 2026-05-25
**Builds on:** M3 v3.0 "Contextual Forms" (shipped 2026-05-11; archived under `.planning/milestones/v3.0-*`)

**Goal:** Fix the M3 data-model gap (rooms ≠ bedrooms; bathroom enum ≠ bathroom count) and the i18n gap for property-type display strings, so every listing card and details screen renders the counts and labels Central Asian renters/buyers actually search by.

**Origin:** Quick task 260525-ggp surfaced two layered defects: (a) `basics.rooms` is total-rooms not bedroom-count per Central Asia "3-room = 2bd + living" convention (memory `central-asia-rooms-vs-bedrooms-convention.md`); (b) `basics.bathroom` is captured only as a SHARED/PRIVATE enum on office + commercial, with no numeric count anywhere. Same QA also surfaced the property-type chip-label i18n gap on `HomeScreen.tsx:514` rendering `PROPERTY_TYPES` constant as raw English. M4 closes both threads in a single tight milestone.

**Hard rules carried forward (do NOT introduce):**
- No Firebase SDK in either repo (RN client OR backend) — REPO RULE per memory `no-firebase-sdk.md`. Backend continues using `jose` for JWKS verification.
- No `react-navigation` migration — custom `App.tsx` state machine stays.
- No Firebase custom claims as role source — MongoDB `userType` remains authoritative.
- No new authentication providers (OAuth, magic link, 2FA) — out of scope.
- M1's 3-category 9-type taxonomy preserved — CLAUDE.md guard.
- M2's status enum preserved (`pending | live | rejected | archived`).
- M3's nested schema preserved — M4 EXTENDS `basics.*` with two optional fields; no schema-shape change.
- EN+RU bilingual parity for every new UI string (CI gate `scripts/check-i18n-parity.sh`).
- Manual physical-device QA on iPhone 15 Pro Max + Moto G XT2513V.
- M1 KBD-02 invariant: `keyboardVerticalOffset` count in `src/` must remain 0 (grep gate, held across 3 milestones).
- M1 D-02 lesson: pre-archive Wave-0 must query Play Console + TestFlight for highest-accepted version-code per track BEFORE setting baseline (pattern fired twice; M4 must re-query at submission time).

**Geographic scope:** KG launch market (Bishkek). KZ + UZ expansion remains M5+ — KZT + UZS currencies remain deferred.

---

## v1 (M4) Requirements

### Schema — backend Mongoose extension + RN type stub

Add two optional fields to the M3 nested `basics.*` subdocument. No migration script (fields are optional; existing listings remain valid).

- [ ] **SCHEMA-01** `Property.basics.bedrooms` added as `Number` (integer, `min: 0`, `max: 10`, `default: undefined`, `required: false`). Mongoose `validate` rejects non-integer values. RN-client–side, only applicable when `propertyType ∈ {apartment, house}` (top-level field — not `basics.propertyType`; corrected from prior wording per Phase 6 D-01). Backend route validation passes silently if absent.
- [ ] **SCHEMA-02** `Property.basics.bathroomCount` added as `Number` (`min: 0`, `max: 10`, `default: undefined`, `required: false`). Mongoose `validate` rejects values that aren't a 0.5-step multiple (e.g. `Number.isInteger(bathroomCount * 2)` AND within `[0, 10]`). Applicable on `propertyType ∈ {apartment, house, hotel, hostel, office, commercial}` (top-level field — corrected from prior `basics.propertyType` wording per Phase 6 D-01; same doc-bug class as SCHEMA-01/SCHEMA-04). Backend route validation passes silently if absent.
- [ ] **SCHEMA-03** RN client `src/types/Property.ts` type-stub updated to include `bedrooms?: number` and `bathroomCount?: number` under `basics`. No existing `basics.*` field is renamed or removed — both new fields live ALONGSIDE existing `basics.rooms`, `basics.hotelRooms`, `basics.bathroom`. (Existing `basics.bathroom` enum survives unchanged on office + commercial; it captures TYPE, not count.)
- [ ] **SCHEMA-04** Backend route validation on POST `/api/properties` + PUT `/api/properties/:id` + PUT `/api/moderation/listings/:id` silently strips `basics.bedrooms` from request body when `propertyType ∈ {hotel, hostel, office, commercial}` (top-level field; `land` removed from the M1 taxonomy and not in the current 6-type set — corrected from prior wording per Phase 6 D-01 + D-02). Bedrooms is residential-only by design — hospitality uses `basics.hotelRooms` for its semantically-distinct rentable-units count. No 400 — silent strip matches M3 D-13 strip-wins pattern.

### Form — stepper-button component + ContextualListingFlow integration

Reusable stepper component + conditional integration on the existing 6-step flow. No new step inserted — extends existing Step 3 (basics) conditional rows.

- [ ] **FORM-01** New `<StepperInput>` component lives in `src/components/`. Props: `value: number | undefined`, `onChange(v: number | undefined): void`, `min: number`, `max: number`, `step: number` (1 or 0.5), `label: string` (already-localized string from caller), `testID?: string`. Renders `−` button + value-display (or em-dash when `undefined`) + `+` button. Tap `+` from `undefined` initializes to `min`. Tap `−` from `min` is a no-op (no negatives, no `undefined` regression).
- [ ] **FORM-02** Stepper integrated into `<ContextualListingFlow>` Step 3 (basics) as conditional rows:
  - Apartment + House → `bedrooms` row (range 0–10, step 1) AND `bathroomCount` row (range 0–10, step 0.5)
  - Hotel + Hostel → `bathroomCount` row only (range 0–10, step 0.5). (`hotelRooms` stays as-is on Step 3.)
  - Office + Commercial → `bathroomCount` row only (range 0–10, step 0.5). (Existing `basics.bathroom` enum row stays unchanged.)
  - Land → no new rows.
- [ ] **FORM-03** Stepper-input `+` / `−` buttons disable visually + block onPress at min/max boundaries (`disabled` + `colors.textSecondary`). Hit-slop ≥44pt on both buttons per iOS HIG. Long-press behavior NOT implemented (out of scope for v1; tap-only).
- [ ] **FORM-04** `validateStep()` accepts `undefined` for `basics.bedrooms` AND `basics.bathroomCount` on every applicable property type (truly optional; no error rows surface; submit advances). Validation only fires when value is present and out-of-range or non-step (defensive — UI prevents this anyway via stepper bounds).
- [ ] **FORM-05** Edit-mode (`mode === 'edit-owner'` or `mode === 'edit-mod'`) initializes stepper from `property.basics.bedrooms` / `property.basics.bathroomCount` when present; renders as `undefined` (em-dash display) when absent. Save-edit dispatches `undefined` values verbatim (does NOT coerce to 0). Edit-on-behalf (`moderatorContext` set) wires identically — moderator can backfill counts without resubmitting the rest of the listing.

### Display — PropertyCard / HospitalityCard / PropertyDetailsScreen

Update the three render surfaces to read the new fields and route hospitality through the existing `hotelRooms` path with a distinct "Rooms" label.

- [ ] **DISP-01** `PropertyCard.tsx` Beds cell reads:
  - Apartment + House: `basics?.bedrooms ?? '-'`
  - Hotel + Hostel: `basics?.hotelRooms ?? '-'` (existing 260525-ggp fallback retained; no schema change for hospitality)
  - Office + Commercial + Land: `'-'` (cell still renders for layout consistency)
  - Label string is localized: `t('property.specs.bedrooms')` for residential; `t('property.specs.rooms')` for hospitality.
- [ ] **DISP-02** `PropertyCard.tsx` Baths cell reads `basics?.bathroomCount ?? '-'` for Apartment + House + Hotel + Hostel + Office + Commercial. Land cell renders `'-'`. Decimal values render as `1.5`, `2.5`, etc. (no `1½` glyph for v1). Label string is localized: `t('property.specs.bathrooms')`.
- [ ] **DISP-03** `PropertyDetailsScreen.tsx` specs row (Beds | Baths | m²) uses the same fallback resolution as PropertyCard. Labels distinct per category: "Bedrooms" / "Спальни" for residential; "Rooms" / "Комнаты" for hospitality. Existing `m²` placement (canonical specs row only; duplicate removed by quick task 260525-i2i / commit `15f1010`) preserved unchanged.
- [ ] **DISP-04** `HospitalityCard.tsx` continues rendering `basics.hotelRooms` with "Rooms" label (no change), AND adds a bathroomCount line where `basics.bathroomCount` is present. Falls through to no-render (or `'-'` if it lives in the same row layout as other specs) when absent. Visual treatment matches existing M1 Phase 6 HospitalityCard tour-first density.
- [ ] **DISP-05** All stepper + specs-row labels routed through `t()`. No raw English strings added to render paths. EN/RU keys lockstep added in lockstep (`scripts/check-i18n-parity.sh` exit 0).

### I18n audit — property-type / category / deal-type display strings

Audit + fix every surface in `src/` that renders `PROPERTY_TYPES`, `propertyCategoryToCategory()`, or `dealType` strings as raw English. Bundled from the 260525-ggp Out-of-Scope item.

- [ ] **I18N-01** Audit walks `src/` for every JSX render of: `PROPERTY_TYPES` constant, `propertyCategoryToCategory(...)` return value, `propertyTypeToCategory(...)` return value, raw `'Apartment' | 'House' | 'Hotel' | 'Hostel' | 'Office' | 'Commercial' | 'Land' | 'Residential' | 'Hospitality' | 'Rent' | 'Sell'` string literals inside `<Text>` children or `Pressable` children. Produces a list of `file:line` references in `04-AUDIT.md` or equivalent phase artifact.
- [ ] **I18N-02** EN/RU keys added for every property type rendered to users: `propertyType.apartment`, `propertyType.house`, `propertyType.hotel`, `propertyType.hostel`, `propertyType.office`, `propertyType.commercial`. Keys live under a new `propertyType.*` namespace in both `en.json` and `ru.json`. (`Land` removed in M1 — no key needed unless `PROPERTY_TYPES` constant still exports it; verify during audit.)
- [ ] **I18N-03** EN/RU keys added for every property category rendered to users: `propertyCategory.residential`, `propertyCategory.commercial`, `propertyCategory.hospitality`. Under new `propertyCategory.*` namespace.
- [ ] **I18N-04** EN/RU keys added for every deal type rendered to users: `dealType.rent`, `dealType.sell` (plus `dealType.rent_long` / `dealType.rent_daily` if either is rendered as a label anywhere). Under new `dealType.*` namespace.
- [ ] **I18N-05** Every raw-string surface from I18N-01 wrapped with `t()`. Includes `HomeScreen.tsx:514` (the original 260525-ggp finding) + every other surface the audit produces. `scripts/check-i18n-parity.sh` exit 0 after each wrap commit.
- [ ] **I18N-06** New sentinel `scripts/check-no-raw-property-type-strings.sh` greps `src/` for raw `<Text>...Apartment</Text>`-style JSX children referencing any property type / category / dealType English literal. Exit 0 = no raw strings. Chained into RN-client jest pre-test step (mirrors backend sentinel chain pattern: `actoruid → landlord-uid → media-stripped → i18n-parity → create-listing-screen-removed → jest`).
- [ ] **I18N-07** `PROPERTY_TYPES` exported constant in `src/utils/propertyCategory.ts` and any other place that exports a list of property-type labels for chip rendering: either (a) keep the constant as a Pascal-cased ID array and translate at render-site via `t('propertyType.' + id.toLowerCase())`, OR (b) replace string-array exports with `{ id, labelKey }` object arrays. Decision is owned by the phase planner per quick task 260525-ggp's documented Out of Scope; either path is acceptable as long as I18N-06 sentinel passes.

### Release & store submission

Standard 6-req release block following the M2 + M3 pattern.

- [ ] **REL-01** RN client `package.json` bumped to `4.0.0`. Atomic commit alongside REL-02.
- [ ] **REL-02** iOS `MARKETING_VERSION 4.0.0` (Debug + Release) + `CURRENT_PROJECT_VERSION` next-from-Path-B-store-history + Android `versionName "4.0.0"` (or whatever Path B yields after Play Console history check) + `versionCode` next-from-Path-B-store-history. Per M1 D-02 lesson (pattern fired twice — M1 + M3): pre-archive Wave-0 MUST query Play Console + TestFlight for highest-accepted version-code per track BEFORE setting baseline. Avoids reactive bumps at archive time. Documented in `10-STORE-HISTORY.md`.
- [ ] **REL-03** Manual physical-device QA matrix walked APPROVED on iPhone 15 Pro Max + Moto G XT2513V. Focus areas: bedroom + bathroom stepper input (residential + hospitality + commercial), display rendering on PropertyCard + HospitalityCard + PropertyDetailsScreen, RU locale parity on all new strings, no regressions on M1 KBD-02 keyboard handling, no regressions on M3 contextual flow. Empirical-sampling-mass-disposition (M3 RETROSPECTIVE.md lesson 4) acceptable for feature-surface cells; walk-and-confirm required for golden-path cells.
- [ ] **REL-04** Bilingual EN+RU release notes drafted + pasted on ASC + Play Console (under 500-char Play Console binding limit; region-neutral per memory `geographic-scope.md`).
- [ ] **REL-05** Backend live + healthy on Railway at release SHA; `firebase-admin` confirmed absent (4th consecutive milestone); sentinel chain green (`actoruid → landlord-uid → media-stripped → i18n-parity → create-listing-screen-removed → jest` on backend; `check-no-raw-property-type-strings → jest` on RN client — the new I18N-06 sentinel chains into the RN-client side, not backend; backend sentinels unchanged). MongoDB Atlas password rotation carries forward from M2 HF-02 unless `ATLAS-CRED-ROTATION` carry-forward item is closed during M4. AWS IAM cross-project residual remains PARTIAL unless other-project's borrowing-IAM-user is scoped away (re-open condition unchanged).
- [ ] **REL-06** v4.0.0 submitted to ASC TestFlight Internal Testing track + Play Console Internal Testing track. M1 D-13 inheritance descope discipline honored (privacy manifest, App Privacy responses, Data Safety questionnaire, entitlements — re-touch only if a new data-collecting SDK lands during M4; auditable check at release-phase preflight). Android reanimated prefab workaround (memory `android-reanimated-clean-prefab-gotcha.md`) applied if `gradlew clean bundleRelease` is used.

---

## Future Requirements (M5+ — deferred)

Carried forward from M3 close + planted during M4 scoping:

- Race-cell test rig — coordinated-curl OR Bluetooth-trigger-pair sync for MOD-15 + ROLE-11 + HF-04 race coverage. Carried from M2 close (deferred twice now).
- Android `clean bundleRelease` reanimated build doc — codify `gradlew :react-native-reanimated:assembleRelease :app:bundleRelease` in `scripts/release-android.md` OR add `bundleReleaseSafe` gradle task wrapper.
- AWS IAM cross-project residual — re-open when other project unblocks scoping the OLD shared IAM user's policy away from JayTap bucket ARN.
- CARRY-01 banner-latency live device walk — opt-in if regressions surface; automatable parts covered via RTL smoke.
- CARRY-02 live Atlas uid-match device walk — opt-in if regressions surface; supertest proves invariant.
- `JayTap-orphan-data-cleanup` — drop pre-patch orphan collections from Atlas (non-blocking; data-hygiene).
- `ATLAS-CRED-ROTATION` — defense-in-depth Atlas password rotation (non-blocking; last rotation 2026-04-29 per M2 HF-02).
- KZT + UZS currency support — comes with KG/KZ/UZ market expansion.
- Multi-language localization beyond EN+RU (KK + UZ if KZ/UZ markets warrant it).
- 2GIS native map bridge — multi-week effort; plan drafted in `2GIS_BRIDGE_PLAN.md`.
- Automated/AI moderation (image/text classifiers).
- Full audit log UI (`moderationLog` + `roleChangeLog` data already captured in M2).
- Push notifications / email notifications for moderation events.
- Bulk moderation actions (multi-select approve/reject).
- Real-estate document verification (Avito-style ownership proof — multi-month compliance subproject).
- `1½` Unicode glyph rendering for half-bathrooms (M4 ships `1.5` decimal — Unicode is forward-fit polish).
- Long-press accelerated increment on `<StepperInput>` (M4 ships tap-only).

---

## Out of Scope (M4 explicit exclusions with reasoning)

- **Replacing `basics.rooms` with `basics.bedrooms`** — Central Asia convention is "X-room apartment" (total rooms including living). Replacing rooms would lose the local listing phrasing. M4 ADDS bedrooms ALONGSIDE rooms; both are valid attributes of the same listing.
- **Migrating existing `basics.bathroom` enum to `basics.bathroomCount`** — Enum captures TYPE (shared / private); count captures QUANTITY. Different attributes. Office + commercial listings can have a count AND a type; M4 ships both fields. M5 may consider whether the enum is still useful post-M4 device QA — explicitly deferred.
- **`MEDIA_REQUIRED`-style backend gate on bedrooms / bathrooms** — All new fields are optional everywhere. No backend 400 on submission or approval if missing. Aligns with the user-facing "no friction at submission" decision in milestone summary.
- **`migrate-listings-m4.js` script** — Optional fields don't need backfill; existing listings remain valid documents (Mongoose ignores absent fields when `required: false`). Skipping the migration avoids the operator-supervised checkpoint that M3 Phase 1 + M2 Phase 1 needed.
- **Long-press accelerated increment + `1½` Unicode glyph + half-step bedroom UX** — Polish items deferred to future requirements (see above).
- **2GIS map bridge / KZT+UZS currency / push notifications / audit log UI / bulk moderation / document verification** — Remain explicitly Out of Scope (see Future Requirements section).
- **Backend role-change for the bedrooms field** — Bedrooms is owner-input data, not a moderation field. No new admin/mod-only endpoint. Edit-on-behalf path (M2 MOD-14 `moderatorContext`) carries through unchanged.

---

## Traceability

Every M4 v1 requirement maps to exactly one phase. Phase numbering continues from M3 (M4 starts at Phase 6; no `--reset-phase-numbers`).

| Requirement | Phase | Status |
|-------------|-------|--------|
| SCHEMA-01 | Phase 6 — Schema Extension (Backend Mongoose + RN Type Stub + Body-Strip Validator) | Validated |
| SCHEMA-02 | Phase 6 — Schema Extension (Backend Mongoose + RN Type Stub + Body-Strip Validator) | Validated |
| SCHEMA-03 | Phase 6 — Schema Extension (Backend Mongoose + RN Type Stub + Body-Strip Validator) | Validated |
| SCHEMA-04 | Phase 6 — Schema Extension (Backend Mongoose + RN Type Stub + Body-Strip Validator) | Validated |
| FORM-01 | Phase 7 — Stepper Component + ContextualListingFlow Integration | Validated |
| FORM-02 | Phase 7 — Stepper Component + ContextualListingFlow Integration | Validated |
| FORM-03 | Phase 7 — Stepper Component + ContextualListingFlow Integration | Validated |
| FORM-04 | Phase 7 — Stepper Component + ContextualListingFlow Integration | Validated |
| FORM-05 | Phase 7 — Stepper Component + ContextualListingFlow Integration | Validated |
| DISP-01 | Phase 8 — Display Surfaces (PropertyCard + HospitalityCard + PropertyDetailsScreen) | Pending |
| DISP-02 | Phase 8 — Display Surfaces (PropertyCard + HospitalityCard + PropertyDetailsScreen) | Pending |
| DISP-03 | Phase 8 — Display Surfaces (PropertyCard + HospitalityCard + PropertyDetailsScreen) | Pending |
| DISP-04 | Phase 8 — Display Surfaces (PropertyCard + HospitalityCard + PropertyDetailsScreen) | Pending |
| DISP-05 | Phase 8 — Display Surfaces (PropertyCard + HospitalityCard + PropertyDetailsScreen) | Pending |
| I18N-01 | Phase 9 — i18n Audit + Sentinel (Property-Type / Category / Deal-Type Display Strings) | Pending |
| I18N-02 | Phase 9 — i18n Audit + Sentinel (Property-Type / Category / Deal-Type Display Strings) | Pending |
| I18N-03 | Phase 9 — i18n Audit + Sentinel (Property-Type / Category / Deal-Type Display Strings) | Pending |
| I18N-04 | Phase 9 — i18n Audit + Sentinel (Property-Type / Category / Deal-Type Display Strings) | Pending |
| I18N-05 | Phase 9 — i18n Audit + Sentinel (Property-Type / Category / Deal-Type Display Strings) | Pending |
| I18N-06 | Phase 9 — i18n Audit + Sentinel (Property-Type / Category / Deal-Type Display Strings) | Pending |
| I18N-07 | Phase 9 — i18n Audit + Sentinel (Property-Type / Category / Deal-Type Display Strings) | Pending |
| REL-01 | Phase 10 — Hardening + Manual Physical-Device QA + Release v4.0.0 | Pending |
| REL-02 | Phase 10 — Hardening + Manual Physical-Device QA + Release v4.0.0 | Pending |
| REL-03 | Phase 10 — Hardening + Manual Physical-Device QA + Release v4.0.0 | Pending |
| REL-04 | Phase 10 — Hardening + Manual Physical-Device QA + Release v4.0.0 | Pending |
| REL-05 | Phase 10 — Hardening + Manual Physical-Device QA + Release v4.0.0 | Pending |
| REL-06 | Phase 10 — Hardening + Manual Physical-Device QA + Release v4.0.0 | Pending |

**Coverage:** 27/27 v1 requirements mapped to exactly one phase. No orphans. No duplicates.

**Phase-to-Requirements rollup:**

| Phase | Requirements | Count |
|-------|-------------|-------|
| Phase 6 — Schema Extension | SCHEMA-01, SCHEMA-02, SCHEMA-03, SCHEMA-04 | 4 |
| Phase 7 — Stepper Component + Flow Integration | FORM-01, FORM-02, FORM-03, FORM-04, FORM-05 | 5 |
| Phase 8 — Display Surfaces | DISP-01, DISP-02, DISP-03, DISP-04, DISP-05 | 5 |
| Phase 9 — i18n Audit + Sentinel | I18N-01, I18N-02, I18N-03, I18N-04, I18N-05, I18N-06, I18N-07 | 7 |
| Phase 10 — Hardening + QA + Release v4.0.0 | REL-01, REL-02, REL-03, REL-04, REL-05, REL-06 | 6 |
| **Total** | — | **27** |

---

*Generated 2026-05-25 via `/gsd-new-milestone to scope M4`. Active milestone: v4.0 "Counts & Labels". Traceability filled by `/gsd-roadmap` 2026-05-25 — 27 v1 requirements mapped to 5 phases (Phases 6–10).*

---

# JayTap — M6 v6.0 "Filter Variants + Profile Reskin" Requirements

**Milestone:** M6 v6.0 "Filter Variants + Profile Reskin"
**Started:** 2026-05-31
**Builds on:** M3 v3.0 "Contextual Forms" (shipped 2026-05-11); concurrent with M4 v4.0 "Counts & Labels" (Phases 9–10 open) and M5 v5.0 "Details & Geocoding" (Phase 11 open; Phase 1 merged outside GSD 2026-05-26)

**Goal:** Adopt the MoveIn design handoff — migrate the whole-app palette to the handoff tokens (dark + light parity), refactor filters to a multi-select shared data model with two interchangeable UI variants the user picks in Settings, and reskin Profile + Account Settings.

**Origin:** Design handoff zips `MoveIn_ Real Estate.zip` (dark-only, 2026-05-31 morning) + `MoveIn_ Real Estate_LD_Mode.zip` (light-mode extension, 2026-05-31 afternoon). User explicitly chose: (a) all-app palette migration over scoping new tokens to refreshed screens only; (b) at least 2 of 4 filter variants in v1 (Guided Steps + Cascading Reveal); (c) device-local AsyncStorage for `filterStyle` preference; (d) reuse existing Georgia/serif font stack — no Newsreader load; (e) language pill stays in HomeScreen header (handoff's removal proposal explicitly rejected).

**Hard rules carried forward (do NOT introduce):**
- No Firebase SDK in either repo — REPO RULE per memory `no-firebase-sdk.md`.
- No `react-navigation` migration — custom `App.tsx` state machine stays.
- No backend changes — M6 is client-only.
- M1's 3-category 9-type taxonomy preserved.
- M2's status enum preserved (`pending | live | rejected | archived`).
- M3's nested Mongoose Property schema preserved.
- M4's `basics.bedrooms` + `basics.bathroomCount` extension preserved (M4 Phase 6 shipped 2026-05-25).
- EN+RU bilingual parity for every new UI string (CI gate `scripts/check-i18n-parity.sh`).
- Manual physical-device QA on iPhone 15 Pro Max + Moto G XT2513V × EN/RU × light/dark.
- M1 KBD-02 invariant: `keyboardVerticalOffset` count in `src/` must remain 0.
- Language pill (`<LanguageToggleSwitch>`) stays in HomeScreen top row (memory `m6-language-pill-stays-in-header.md`).
- Variants are the value — at least 2 filter UI variants in v1; collapsing to one is rejected (memory `m6-filter-variants-are-the-point.md`).

**Source artifacts:**
- `MoveIn_ Real Estate_LD_Mode.zip` (latest handoff with light-mode tokens) — extracted at `/tmp/moveinzip_ld/design_handoff_profile_filters/`. Includes `README.md` (full token spec), `filters-variants.jsx` (VariantA…D source), `filters-shared.jsx`, `profile-screens.jsx`, `profile-shared.jsx`.

**Locked decisions captured in memory:**
- `m6-filter-variants-are-the-point.md` — variants are intentionally interchangeable; ship ≥2 in v1
- `m6-language-pill-stays-in-header.md` — handoff's "after" SearchHeader proposal rejected
- `m6-scope-decisions-2026-05-31.md` — AsyncStorage device-local, v1 = Guided+Cascading, font reuse, light-mode tokens delivered

---

## v1 (M6) Requirements

### PAL — Whole-app palette migration

Rewrite `src/theme/colors.ts` to handoff tokens; preserve accent/landlord-green/destructive-red mode-independent; sweep every screen for visual regressions. Palette migration is single-token-source per existing `useTheme()` contract — no per-screen hex literals to chase.

- [ ] **PAL-01** `src/theme/colors.ts` dark set rewritten: `background #121214`, `bgDim #0c0c0e`, `surface #1c1c20`, `surface-2 #26262c`, `surface-3 #303038`, `hair rgba(255,255,255,0.08)`, `hair-strong rgba(255,255,255,0.14)`, `text #f4f4f6`, `dim rgba(244,244,246,0.60)`, `mute rgba(244,244,246,0.40)`, icon-chip-fg `rgba(244,244,246,0.85)`. Accent `#ff5a6f` (+ soft `rgba(255,90,111,0.16)` + line `rgba(255,90,111,0.45)`) preserved mode-independent. Landlord green `#35c98f` and destructive red `#ff4d4d` preserved mode-independent.
- [ ] **PAL-02** `src/theme/colors.ts` light set rewritten: `background #f3f3f6`, `bgDim #e7e7ec`, `surface #ffffff`, `surface-2 #f0f0f4`, `surface-3 #e4e4ea`, `hair rgba(0,0,0,0.08)`, `hair-strong rgba(0,0,0,0.13)`, `text #16161a`, `dim rgba(22,22,28,0.62)`, `mute rgba(22,22,28,0.42)`, icon-chip-fg `rgba(22,22,28,0.80)`. Accent + landlord-green + destructive-red identical to PAL-01.
- [ ] **PAL-03** Visual-regression sweep across every screen reading `colors.*` — minimum coverage: HomeScreen, PropertyCard, HospitalityCard, PropertyDetailsScreen, all M5 details/* sub-components, ProfileScreen, AccountSettingsScreen, ChatScreen + ChatThreadScreen + ChatComposeScreen, AppointmentsScreen, FavoritesScreen, RenterListingsScreen, OwnerListingsScreen, ContextualListingFlow (all 6 steps), MediaCurationScreen, ModerationQueueScreen, LandlordApplicationQueueScreen, RoleManagementScreen, LoginScreen, SignupScreen, ForgotPasswordScreen, ResetPasswordScreen, Tour3DScreen, TourSelectionScreen, ScheduleViewingScreen, ApplicantProfileScreen, AdminVerificationScreen, ListingAdminScreen. Walked on iPhone 15 Pro Max + Moto G XT2513V × EN/RU × light/dark. No broken contrast (WCAG AA), no illegible text, no theme drift artifacts.

### DATA — Shared filter data model + persistence

Refactor HomeScreen's filter state to multi-select; build a single query builder; persist filter-style preference to device storage.

- [ ] **DATA-01** HomeScreen filter state refactored from `selectedType: string | null` to `types: string[]` (multi-select). `filteredProperties` memo treats `types` as an OR-set (union semantics): a property matches if its propertyType is in `types` (or if `types` is empty, all types in the selected category match). Existing `transactionType: 'rent'|'sale'` and `selectedCategory: PropertyCategory` are unchanged in shape but become canonical `deal`/`category` fields in the shared model.
- [ ] **DATA-02** Single query builder function `buildFilterQuery({ deal, category, types })` returns the canonical filter shape consumed by every variant + by `filteredProperties`. All four variants (including the two not implemented in v1) read and write the identical state — no per-variant branches in the data layer.
- [ ] **DATA-03** New `useFilterStyle()` hook persists `'guided'|'cascading'|'master'|'sentence'` to AsyncStorage under key `@jaytap_filter_style`. Default `'guided'` on first load. Reads on app mount (no flash of wrong variant); writes immediately on user pick. Hook exposes `{ filterStyle, setFilterStyle }`.

### FILT — Filter UI variants for v1

Two interchangeable filter UIs built on the shared DATA model. The handoff treats them as pure skins — switching is presentational only.

- [ ] **FILT-01** Guided Steps variant — bottom-sheet wizard with 1-2-3 stepper (Deal → Category → Type). Picking Deal auto-advances to Category; picking Category auto-advances to Type. Type step shows multi-select cards with square-checkbox affordance + "Choose one or more" hint. Breadcrumb at footer shows current selection. Live "Show N homes" CTA button updates on every selection change.
- [ ] **FILT-02** Cascading Reveal variant — inline panel under the search bar. Segmented Rent/Buy toggle at top → underlined Category tab strip (Residential / Commercial / Hospitality) → multi-select Type chip row. Left nesting rail visually joins Category to Type. Live result line ("N homes · Rent · Residential · 3 types") below.
- [ ] **FILT-03** HomeScreen filter-button press launches the variant matching the user's `filterStyle` preference from DATA-03. Switching preference in AccountSettings live-swaps the variant — next filter-button press opens the new variant; no app restart required.

### SET — Account Settings restructure + filter-style picker

Restructure AccountSettingsScreen into three labelled sections per handoff spec; add the filter-style picker in Preferences.

- [x] **SET-01** AccountSettingsScreen restructured into three labelled sections per handoff spec: **ACCOUNT** (existing read rows + Edit affordance), **PREFERENCES** (Language EN/Русский segmented toggle + Filter-style picker), **DANGER ZONE** (Delete account row). Section labels use the handoff's typographic treatment (small uppercase letter-spacing). _Shipped Phase 15 Plan 01 — 2026-06-01 (commits c404111 + 20f6dd8); FilterStyleRow mount inside PREFERENCES tracked under SET-02 (Plan 15-02)._
- [x] **SET-02** Filter-style picker in Preferences — expandable row with sliders icon, "Search filter style" title, current-value subtitle, chevron that rotates on expand. Expanded view lists all 4 styles (Guided Steps, Cascading Reveal, Master–Detail, Sentence) with icon + name + one-line description + radio affordance. Guided + Cascading are selectable. Master-Detail + Sentence are shown with a "Coming soon" badge and disabled radio (visible in v1 so users see what's coming; functional in Phase B). _Shipped Phase 15 Plan 02 — 2026-06-01 (commits 2a2f4cb + bf27e16 + 6584c2d); FilterStyleRow.tsx + 10-case co-located test; SC3 live-swap wired through Phase 13 context + Phase 14 dispatcher (no app restart); on-device walk still owed per CONTEXT.md D-15 acceptance._
- [x] **SET-03** Existing AccountSettingsScreen surfaces (Account info fields incl. First Name / Last Name / Phone / WhatsApp / Telegram; Language toggle EN/Русский; Delete account → DeleteAccountModal) preserved verbatim in their new section homes — no regression to those flows. Edit-mode toggle still works for Account fields. Language toggle still persists via existing `setLanguage()` from `LanguageContext`. Delete account still routes through `DeleteAccountModal`. _Shipped Phase 15 Plan 01 — 2026-06-01 (commit 20f6dd8); on-device QA still owed per CONTEXT.md D-15 acceptance._

### PROF — Profile reskin

Two layout variants by role: grouped rows for regular users, tile dashboard for admin/moderator. All existing entry points and gating preserved.

- [ ] **PROF-01** ProfileScreen (regular user) — grouped-row layout per handoff spec: identity card (avatar + name + email + "Account settings ›" pill) → "You're a Landlord" green-tinted banner (when applicable, gated as today) → ACTIVITY card (Favorites + Appointments rows) → HOSTING card (My Listings row) → Create Listing accent-filled row → Log out outlined pill. Row anatomy: 38px neutral icon chip + label (16/600) + sub (12.5 dim) + chevron.
- [ ] **PROF-02** ProfileScreen (admin/moderator) — tile-dashboard layout per handoff spec: identity card with role badge ("ADMIN" or "MODERATOR" accent pill with shield icon) → MY ACTIVITY 2×2 tiles (Favorites, Appointments, My Listings, Create Listing accent-filled) → ADMIN TOOLS section with STAFF pill label, role-gated tiles: Landlord Applications + Moderation Queue (both roles), Role Management (admin only, renders full-width when it's the odd tile). Live count badges (accent) on tiles with pending counts.
- [ ] **PROF-03** Existing badges/counts preserved across both layouts: `pendingCount` badge on Moderation Queue tile (fetched via existing `PropertyService.getModerationQueueCount` + `moderationCountRefreshKey` invalidation); landlord-application status banner (when applicable); favorite count from existing source; appointment count from existing source; My Listings count from existing source. No count-fetching regression. Navigation handlers (`onCreateListing`, `onViewListings`, `onViewFavorites`, `onViewAppointments`, `onViewAccountSettings`, `onApplyLandlord`, `onReviewLandlordApplications`, `onReviewModerationQueue`, `onOpenRoleManagement`) preserved verbatim — same call sites in App.tsx.

---

## Future (M6 Phase B + later)

- **FILT-04** Master–Detail variant — bottom-sheet with categories on left rail + types on right pane as multi-select checkbox list with "Any [category]" row.
- **FILT-05** Sentence Builder variant — editorial plain-language filter ("I want to **rent** a **residential** **apartment, house or townhome**.") with token-based picker.
- **SET-04** Filter-style picker un-gates Master-Detail + Sentence options (drop "Coming soon" affordance once FILT-04 + FILT-05 ship).

## Out of Scope (M6)

- **Moving the language pill** out of HomeScreen header into Account Settings — explicitly rejected by user 2026-05-31 (memory `m6-language-pill-stays-in-header.md`). Handoff's "after" SearchHeader variant is informational only.
- **Loading Newsreader serif font** — reuse existing `Platform.select({ ios: 'Georgia', android: 'serif' })` stack (already used in PropertyCard, HomeScreen, PropertyDetailsScreen). Georgia is the handoff's listed fallback in the `'Newsreader', Georgia, 'Times New Roman', serif` chain.
- **Master-Detail + Sentence filter variants** — deferred to M6 Phase B; the picker shows them as "Coming soon" in v1.
- **Server-side `filterStyle` sync** — preference is per-device via AsyncStorage. Cross-device sync only if it becomes a user complaint.
- **Backend changes** — M6 is client-only. No Mongoose schema changes, no new endpoints, no route changes.
- **Tweaks panel from handoff** — the prototype's tweaks panel (Appearance / Accent switcher) is scaffolding, not product. Not ported.
- **Green accent option** — handoff's green `#36c98f` accent is exposed in the prototype as a tweak. Not ported; pink stays as the brand default in v1.
- **3D Tour pill / 360° Photos / Photo tile visual changes** — out of M6 scope. M5 Phase 1 already redesigned details; M6 only swaps tokens.
- **M6 release / store submission phase** — out of scope for this roadmap. M6 will ride M4 Phase 10's hardening cycle OR get a separate release phase added later. Phase 16 is the last M6 phase; no Phase 17 release block.

---

## Traceability (M6)

Every M6 v1 requirement maps to exactly one phase. Phase numbering continues from M4 Phase 10 + M5 Phase 11 (M6 starts at Phase 12; no `--reset-phase-numbers`).

| Requirement | Phase | Status |
|-------------|-------|--------|
| PAL-01 | Phase 12 — Whole-App Palette Migration (Dark + Light) + Visual-Regression Sweep | Pending |
| PAL-02 | Phase 12 — Whole-App Palette Migration (Dark + Light) + Visual-Regression Sweep | Pending |
| PAL-03 | Phase 12 — Whole-App Palette Migration (Dark + Light) + Visual-Regression Sweep | Pending |
| DATA-01 | Phase 13 — Shared Filter Data Model + AsyncStorage Persistence | Pending |
| DATA-02 | Phase 13 — Shared Filter Data Model + AsyncStorage Persistence | Pending |
| DATA-03 | Phase 13 — Shared Filter Data Model + AsyncStorage Persistence | Pending |
| FILT-01 | Phase 14 — Filter UI Variants (Guided Steps + Cascading Reveal) + HomeScreen Variant Dispatch | Pending |
| FILT-02 | Phase 14 — Filter UI Variants (Guided Steps + Cascading Reveal) + HomeScreen Variant Dispatch | Pending |
| FILT-03 | Phase 14 — Filter UI Variants (Guided Steps + Cascading Reveal) + HomeScreen Variant Dispatch | Pending |
| SET-01 | Phase 15 — Account Settings Restructure + Filter-Style Picker | Complete (Plan 15-01, 2026-06-01) |
| SET-02 | Phase 15 — Account Settings Restructure + Filter-Style Picker | Complete (Plan 15-02, 2026-06-01) |
| SET-03 | Phase 15 — Account Settings Restructure + Filter-Style Picker | Complete (Plan 15-01, 2026-06-01) |
| PROF-01 | Phase 16 — Profile Reskin (User Grouped-Rows + Admin/Mod Tile Dashboard) | Pending |
| PROF-02 | Phase 16 — Profile Reskin (User Grouped-Rows + Admin/Mod Tile Dashboard) | Pending |
| PROF-03 | Phase 16 — Profile Reskin (User Grouped-Rows + Admin/Mod Tile Dashboard) | Pending |

**Coverage:** 15/15 v1 requirements mapped to exactly one phase. No orphans. No duplicates.

**Phase-to-Requirements rollup:**

| Phase | Requirements | Count |
|-------|-------------|-------|
| Phase 12 — Whole-App Palette Migration (Dark + Light) + VR Sweep | PAL-01, PAL-02, PAL-03 | 3 |
| Phase 13 — Shared Filter Data Model + AsyncStorage Persistence | DATA-01, DATA-02, DATA-03 | 3 |
| Phase 14 — Filter UI Variants (Guided + Cascading) + HomeScreen Dispatch | FILT-01, FILT-02, FILT-03 | 3 |
| Phase 15 — Account Settings Restructure + Filter-Style Picker | SET-01, SET-02, SET-03 | 3 |
| Phase 16 — Profile Reskin (User Grouped-Rows + Admin/Mod Tile Dashboard) | PROF-01, PROF-02, PROF-03 | 3 |
| **Total** | — | **15** |

---

*M6 section appended 2026-05-31 via `/gsd-new-milestone`. Traceability filled by `/gsd-roadmap` 2026-05-31 — 15 v1 requirements mapped to 5 phases (Phases 12–16). M6 starts as a parallel third in-flight milestone alongside M4 (Phases 9–10 open) and M5 (Phase 11 closed 2026-05-27). 5 categories: PAL × 3, DATA × 3, FILT × 3, SET × 3, PROF × 3. M6 release is out of scope for this roadmap — will ride M4 Phase 10's hardening cycle OR get a separate release phase added later.*

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

# Roadmap: JayTap — M1 "Polish + Hospitality" (v1.0.4)

**Created:** 2026-04-22
**Milestone:** M1 — v1.0.4, ship ASAP to iOS App Store + Google Play
**Granularity:** Fine (8 phases)
**Coverage:** 35/35 v1 requirements mapped
**Core Value:** Prospective renters and buyers can reliably browse, filter, and inquire about Bishkek properties on a phone without UI blockers.

## Build-Order Rationale

All four research docs (STACK, FEATURES, ARCHITECTURE, PITFALLS) agree the sequence is load-bearing:

1. **Nav reliability first** — can't test anything else reliably if nav traps touches
2. **Universal keyboard second** — blocks Create Listing form work (its biggest consumer)
3. **Role gating precursor third** — small, supplies `useRole()` / `can(action)` / `<Gated>` that the form and detail screen consume; parallelizable with keyboard
4. **Listing form taxonomy fourth** — depends on keyboard + role hook being in place
5. **Listing form validation fifth** — builds on taxonomy with category-branched required fields and edit-flow correctness
6. **Hospitality rendering sixth** — depends on category field existing
7. **Alignment pass seventh** — screenshot-driven from user; parallelizable with any phase once screenshots arrive
8. **Release prep last** — privacy manifest, Xcode 26 SDK, version bumps, device QA, store submission

## Phases

- [x] **Phase 1: Nav Reliability** (2026-04-22) — Reproduce, root-cause, and fix the bottom-nav unresponsiveness bug in `App.tsx`; apply `pointerEvents` belt-and-suspenders to all keep-alive screens
- [x] **Phase 2: Universal Keyboard Handling** (2026-04-23) — Installed reanimated@4.3.0 + worklets@0.8.1 + keyboard-controller@1.21.6 (v4 Babel plugin `'react-native-worklets/plugin'` LAST); `<KeyboardProvider>` at App.tsx root; KASV wraps 4 auth + AccountSettings + CreateListing both branches; library KAV drop-in on 2 chat screens with `behavior="padding"` (gap-closure disproving RESEARCH §9 A8). 22/22 matrix cells PASS on iPhone 15 Pro Max / iOS 26.4 + Moto G XT2513V / Android 16 under Fabric.
- [ ] **Phase 3: Role Gating Precursor** — Ship `useRole()` + `can(action)` + `<Gated>` over a hardcoded email allowlist, migrate existing admin checks, and confirm backend enforcement
- [x] **Phase 4: Listing Form Taxonomy & Decomposition** (2026-04-24) — Removed `Land` atomically; added Hostel/Hotel under Hospitality; decomposed `CreateListingScreen` 1404→871 LOC (−37%) into 7 `CreateListingForm/` sub-components; EN+RU parity at 365 keys; 18/18 manual QA PASS on iPhone (iOS 26) + Moto G (Android 16 / Fabric); verifier 5/5 must_haves PASS
- [x] **Phase 5: Listing Form Validation & Edit Flow** (2026-04-24) — Pure `validateByCategory()` + `buildPayloadByCategory()` source of truth; 16 inline error rows across 5 sub-components; 14 EN+RU validation/status keys; orchestrator integration with scroll-to-first-error + D-11 hybrid contact + D-16 draft/publish toggle; App.tsx wiring of `onNavigateToAccountSettings`; verifier 5/5 must_haves PASS; 4 post-QA gap-closure commits (district label, Hospitality price guard, error spacing, listings refetch)
- [ ] **Phase 6: Hospitality Rendering** — `HospitalitySection` + `HospitalityCard` on Home/Favorites/OwnerListings; Hospitality-aware `PropertyDetailsScreen`; 12-item amenity taxonomy in EN+RU
- [ ] **Phase 7: Alignment Pass** — Screenshot-driven fixes across flagged screens, respecting existing theme tokens and dark/light parity
- [ ] **Phase 8: Release & Store Submission** — Privacy manifest, Xcode 26 / iOS 26 SDK, 4-file version bump, physical-device QA, App Store Connect + Play Console submission

## Phase Details

### Phase 1: Nav Reliability

**Goal**: The bottom navigation responds to every tab tap from every screen, across all physical-device platforms, verified by a documented reproduction matrix.
**Depends on**: Nothing (foundation)
**Requirements**: NAV-01, NAV-02, NAV-03
**Success Criteria** (what must be TRUE):
  1. Tapping any bottom-nav tab (Home, Chat, Profile, Favorites, Listings, Appointments) from any main-stack screen switches to that tab on both physical iOS and physical Android (0% repro across the full 32+ state×tab transition matrix)
  2. A reproduction matrix document exists in the repo recording which transitions used to trap and which platforms they trapped on, with video or notes, before the fix landed
  3. Returning from any overlay (PropertyDetails, CreateListing, RenterListings, Tour3D) re-enables the main stack's touch responders — no "taps go nowhere" state is reachable
  4. New screens added later inherit the fix: keep-alive screens apply `pointerEvents={isVisible ? 'auto' : 'none'}` (belt-and-suspenders) so the class of bug cannot recur on M2 additions
  5. Android hardware back button still pops overlays in the correct order (no regression introduced by back-handler refactor to ref-based pattern)
**Plans**: 6 plans
  - [x] 01-01-PLAN.md — Wave 0: validation scaffolding (REPRO-MATRIX skeleton + videos/ + device agreement) — 2026-04-22
  - [x] 01-02-PLAN.md — Wave 0.5: baseline DEFERRED (accepted risk, 2026-04-22 — zero-FAIL branch §9 A6 taken upfront; NAV-03 anchored on reference HEAD `0c04227`)
  - [x] 01-03-PLAN.md — Wave 1: pointerEvents belt-and-suspenders + OVERLAY_FLAGS refactor + [NAV] diagnostics + CONVENTIONS.md entry — 2026-04-22
  - [x] 01-04-PLAN.md — Wave 2: Post-Wave-1 device capture + D-04 Decision C (PAUSE-AND-REASSESS → REASSESSMENT-PROCEED) — 2026-04-22
  - [x] 01-05-PLAN.md — Wave 3: SKIPPED per D-15 — reassessment surfaced root cause outside C2/C3/C4 search space — 2026-04-22
  - [x] 01-06-PLAN.md — Wave 4: diagnostic strip + Post-Reassessment device verify + Decision block + Phase 1 sign-off — 2026-04-22

### Phase 2: Universal Keyboard Handling

**Goal**: On every screen with a text input across iOS and Android physical devices, the keyboard never covers the focused input — solved once at the root, not patched per-screen.
**Depends on**: Phase 1 (keyboard debugging requires stable navigation)
**Requirements**: KBD-01, KBD-02, KBD-03, KBD-04
**Success Criteria** (what must be TRUE):
  1. `react-native-reanimated` is confirmed present in `package.json` (installed with Babel plugin as the LAST entry in `babel.config.js` if absent) — this install precedes all other keyboard work
  2. `react-native-keyboard-controller@1.21+` is installed, `KeyboardProvider` wraps the root of `App.tsx` (inside `SafeAreaProvider`, outside domain providers), and `pod install` + clean builds succeed on both platforms
  3. On every input-bearing screen (Login, Signup, ForgotPassword, ResetPassword, ChatCompose, ChatThread, CreateListing, ScheduleViewing, AccountSettings), tapping any `TextInput` scrolls the field above the keyboard on both physical iOS and physical Android — no per-screen `keyboardVerticalOffset` magic numbers are used
  4. Keyboard behavior is verified on Fabric (New Architecture) builds on both platforms before the phase closes — simulator passes alone do not satisfy exit criteria
**Plans**: 6 plans
  - [x] 02-01-PLAN.md — Wave 0: install precondition (reanimated v4 + worklets + Babel plugin LAST + pod install + gradle clean + physical-device build verify) — 2026-04-23
  - [x] 02-02-PLAN.md — Wave 1: KeyboardProvider wiring in App.tsx between SafeAreaProvider and ThemeProvider (D-03) + boot smoke check — 2026-04-23
  - [x] 02-03-PLAN.md — Wave 2A: KeyboardAwareScrollView wrap of all 4 auth screens — 2026-04-23
  - [x] 02-04-PLAN.md — Wave 2B: KASV swap of AccountSettingsScreen + CreateListingScreen (both branches per D-07) — 2026-04-23
  - [x] 02-05-PLAN.md — Wave 2C: Library KAV drop-in on ChatThread + ChatCompose; `keyboardVerticalOffset` removed (D-09) — 2026-04-23 (gap-closure `47a52b7` added `behavior="padding"` after Matrix walk disproved RESEARCH §9 A8)
  - [x] 02-06-PLAN.md — Wave 3: 22-cell matrix walk both devices PASS + HomeScreen workaround comment REMOVED + phase sign-off — 2026-04-23
**UI hint**: yes

### Phase 3: Role Gating Precursor

**Goal**: A single `useRole()` / `can(action)` / `<Gated>` surface gates admin-only UI across the app, backed by a hardcoded email allowlist in M1 and forward-compatible with M2 roles — with backend enforcement confirmed or accepted as a known risk.
**Depends on**: Phase 1 (stable nav for testing); parallelizable with Phase 2
**Requirements**: GATE-01, GATE-02, GATE-03, GATE-04, GATE-05
**Success Criteria** (what must be TRUE):
  1. `src/hooks/useRole.ts`, `src/hooks/useRole.ts:can(action)`, `src/components/Gated.tsx`, and `src/constants/adminAllowlist.ts` exist and are consumed via `useRole()` / `<Gated>` at every admin-gated site (no inline email checks, no inline `userType === 'admin'` comparisons remain in UI code)
  2. Matterport tour URL and panoramic image URL fields in `CreateListingScreen` are only visible to users for whom `can('edit_matterport_url')` / `can('edit_panoramic_url')` returns true; other listing fields remain editable for all authenticated users
  3. The existing admin check at `PropertyDetailsScreen.tsx:178` (and any other scattered `userType === 'admin'` sites surfaced by grep) is migrated to `useRole()`; the `can(action)` API shape accepts actions, not role names, so the M1→M2 swap requires zero call-site changes
  4. Backend enforcement on admin-only endpoints (`PATCH /properties/:id/verifications`, `/tours`) is either confirmed with the Railway backend team (release-unblocking) or documented as an accepted known risk in PROJECT.md's Key Decisions table
  5. A `// TODO(M2): replace allowlist with role-based implementation` comment exists at the allowlist definition; admin emails are lowercase-normalized on comparison
**Plans**: 7 plans
  - [x] 03-01-PLAN.md — Wave 0: scaffold failing test stubs (useRole / Gated / PropertyService) + CONVENTIONS.md src/hooks/ note
  - [x] 03-02-PLAN.md — Wave 1: adminAllowlist.ts + useRole.ts (canFromUser + Action union + PermissionDeniedError) + Gated.tsx
  - [x] 03-03-PLAN.md — Wave 1: errors.permissionDenied i18n key in en.ts + ru.ts (parallel with 03-02)
  - [x] 03-04-PLAN.md — Wave 2: PropertyService.patchPlatformVerifications canFromUser guard (D-15 scope) — 2026-04-24 (`0632da9` + `ed037ef`; full Jest suite 15/15 GREEN incl. App.test.tsx)
  - [x] 03-05-PLAN.md — Wave 3: CreateListingScreen.tsx — 4 isAdmin sites + 3 Gated wraps (D-08/D-09 preserve-on-save intact; Q1: editVerifications at line 396)
  - [x] 03-06-PLAN.md — Wave 3: PropertyDetailsScreen.tsx + ProfileScreen.tsx migrations (D-11 sites 5/6/7; D-12 manageListings; D-13 display-only userType stays) — parallel with 03-05
  - [x] 03-07-PLAN.md — Wave 4: 4-part grep invariant as scripts/check-role-grep.sh + 03-BACKEND-COORDINATION.md + GATE-05 two-path exit (D-22) + 03-VERIFICATION.md

### Phase 4: Listing Form Taxonomy & Decomposition

**Goal**: `CreateListingScreen` exposes three categories (Residential / Commercial / Hospitality) with Hostel/Hotel as the new hospitality types, `Land` fully removed, and the 1300-LOC screen decomposed into focused `CreateListingForm/` sub-components with EN+RU locale parity.
**Depends on**: Phase 2 (keyboard library installed — this screen is its biggest consumer), Phase 3 (for `<Gated>` around URL fields)
**Requirements**: FORM-01, FORM-02, FORM-03, FORM-05, FORM-09
**Success Criteria** (what must be TRUE):
  1. `Land` is absent from the `PROPERTY_TYPES` array in `CreateListingScreen.tsx`, from any filter UI in `HomeScreen`, from `TranslationKeys`, from type definitions, and from all mock/seed data — `grep -r -i 'propertyType.land\|"Land"' src/` returns zero in-app matches (only non-real-estate hits like "landlord" / "landscape" may remain)
  2. `Hostel` and `Hotel` are selectable property types on the category chip group, grouped under a `Hospitality` category alongside Residential and Commercial; a `useCategory(propertyType)` / `PROPERTY_TYPE_TO_CATEGORY` utility lives at `src/utils/propertyCategory.ts` as the single source of truth for category derivation
  3. `CreateListingScreen.tsx` is reduced to an orchestrator; category-specific rendering lives in `src/components/CreateListingForm/` sub-components (`BasicInfoSection`, `ResidentialSection`, `CommercialSection`, `HospitalitySection`, `MediaSection`, `PriceSection`, `VerificationSection`)
  4. Every new UI string added in this phase exists in both `src/locales/en.json` and `src/locales/ru.json` — key-set parity verified (no EN-only or RU-only keys)
  5. Existing and new listings render in the refactored screen without regression: a smoke-test for each of the 10 property types (Apartment, House, Townhome, Condo, Office, Retail, Warehouse, Industrial, Hostel, Hotel) opens the correct category and shows the expected field set
**Plans**: 6 plans
  - [x] 04-01-PLAN.md — Wave 0: validation scaffolding (propertyCategory.test.ts RED + check-land-removed.sh FAIL-by-design + check-i18n-parity.sh PASS) — 2026-04-23 (`2583c7a` + `5ba60e2` + `8453984`)
  - [x] 04-02-PLAN.md — Wave 1: taxonomy foundation (propertyCategory.ts + atomic Land removal + Hostel/Hotel + 11 new i18n keys EN+RU + chip UX rework) — 2026-04-24 (`a1539cb` + `3b24097` + `633637c`)
  - [x] 04-03-PLAN.md — Wave 2: sub-component scaffolding (types.ts + styles.ts + barrel + BasicInfoSection.tsx) — 2026-04-24 (`4207cf3` + `1003ac1`)
  - [x] 04-04-PLAN.md — Wave 2: category sub-components (ResidentialSection + CommercialSection + HospitalitySection + barrel update) — 2026-04-24 (`2c2e381` + `e516426` + `f84df0e`)
  - [x] 04-05-PLAN.md — Wave 2: MediaSection (2x Gated wraps preserved) + PriceSection + VerificationSection + barrel completion — 2026-04-24 (`a9e4e60` + `43f5822` + `3ce7356`)
  - [x] 04-06-PLAN.md — Wave 3: orchestrator reduction (CreateListingScreen.tsx 1404→871 LOC, −37%) + 3 D-09 anchors preserved verbatim + 1 in-orchestrator `<Gated editVerifications>` wrap + 18-cell manual QA matrix scaffold + phase-exit regression bundle — 2026-04-24 (`ac02eb2` + `a42341c`; manual QA checkpoint OPEN pending physical-device walk)
**UI hint**: yes

### Phase 5: Listing Form Validation & Edit Flow

**Goal**: Category-branched required fields are enforced by a single validator; category switching never drops user-entered data; editing an existing listing initializes into the correct category with its field set intact.
**Depends on**: Phase 4 (taxonomy + sub-components must exist)
**Requirements**: FORM-04, FORM-06, FORM-07, FORM-08
**Success Criteria** (what must be TRUE):
  1. Submitting a listing for each category produces the correct required-field behavior: Residential requires title/description/address/city/district/price/currency/bedrooms/bathrooms/areaSqm/availableDate; Commercial requires those minus bedrooms/bathrooms plus a sub-type (office/retail/warehouse/industrial); Hospitality requires title/description/address/city/district/rooms/bathrooms/maxGuests/amenities and contact (phone + WhatsApp or Telegram) with NO price/currency
  2. A single `validateByCategory()` function in `src/components/CreateListingForm/validators.ts` is the only source of per-category validation logic; per-field errors appear next to their fields when submit is attempted on an invalid form, and submission is blocked
  3. Switching the category chip mid-form preserves shared fields (title, description, address, city, district, images) — no silent data loss — while category-specific sections mount/unmount cleanly and the submit payload excludes fields not valid for the active category
  4. Editing an existing listing initializes the form into the listing's category: a Residential listing shows bedrooms/bathrooms/area fields (not rooms/amenities); a Commercial listing shows area + sub-type (no bedrooms/bathrooms); a Hospitality listing shows rooms/bathrooms/maxGuests/amenities (no price)
  5. Hospitality listings can be saved under both Rent and Sell toggle modes; price is hidden in both modes; no stale price value leaks into the submitted payload when switching from Residential/Commercial to Hospitality mid-form
**Plans**: 5 plans
  - [ ] 05-01-validators-foundation-PLAN.md — Wave 1: pure validators.ts (validateByCategory + buildPayloadByCategory + Currency type + CURRENCY_OPTIONS + FIELD_ORDER_BY_CATEGORY) + Jest suite (~22 assertions) + FormBag.currency tightening + barrel exports
  - [ ] 05-02-section-errors-threading-PLAN.md — Wave 2: thread errors through 5 sub-components (BasicInfo/Residential/Commercial/Hospitality/PriceSection) via `commonStyles.hint + colors.error` + migrate CURRENCY_OPTIONS to validators import
  - [ ] 05-03-i18n-validation-keys-PLAN.md — Wave 2: 14 new EN+RU validation error keys in parity + createListing.publishListing for D-16 submit label
  - [ ] 05-04-orchestrator-integration-PLAN.md — Wave 3: CreateListingScreen.tsx 10 edits (validator call + payload builder + errors state + scroll-to-first-error + D-11 contact Alert + D-16 status rule + onNavigateToAccountSettings prop); D-09 anchors preserved
  - [ ] 05-05-nav-wiring-and-qa-matrix-PLAN.md — Wave 4: App.tsx onNavigateToAccountSettings wiring + Property `status?` type + 05-QA-MATRIX.md (54-cell physical-device scaffold) + 05-VERIFICATION.md (phase-exit regression bundle)
**UI hint**: yes

### Phase 6: Hospitality Rendering

**Goal**: Hostel and Hotel listings render in their own dedicated section across Home/Favorites/OwnerListings, with a tour-first card variant and a price-free PropertyDetailsScreen that surfaces 3D tours, panoramic media, and contact quick-actions — all bilingual.
**Depends on**: Phase 4 (category taxonomy must exist), Phase 5 (Hospitality listings must be creatable and editable)
**Requirements**: HOSP-01, HOSP-02, HOSP-03, HOSP-04, HOSP-05, HOSP-06
**Success Criteria** (what must be TRUE):
  1. On Home, Favorites, and OwnerListings, hospitality listings render in a separate `HospitalitySection` (as a horizontal `FlatList` via `ListHeaderComponent` — not mixed into the vertical residential/commercial list), and the section is hidden when empty
  2. Hospitality listings appear under both the Rent and Sell filter/toggle views with no price shown in either case; filter by property type "Hostel" or "Hotel" scopes to the hospitality section
  3. A `HospitalityCard` component renders Hostel/Hotel cards without a price chip, emphasizing the 3D tour thumbnail and showing a `Hostel` / `Hotel` type badge; rooms + amenities summary replaces bedrooms + bathrooms in the card body
  4. `PropertyDetailsScreen` renders a Hostel/Hotel listing without any price block, with 3D tours promoted above the image gallery, panoramic media visible, and WhatsApp / Telegram / phone quick-action contact buttons prominent at the bottom of the screen
  5. The 12-item amenity taxonomy (WiFi, Air conditioning, Heating, Kitchen, Breakfast, Parking, 24h reception, Laundry, Hot water, Common area, Lockers, En-suite bathrooms) renders as a multi-select on the listing form and as a readable chip list on the detail screen — every amenity label is translated in both EN and RU
**Plans**: 7 plans
  - [x] 06-01-PLAN.md — Wave 0: foundation — hospitalityAmenities.ts (12-token as-const + AMENITY_ICONS) + Property type extension (rooms?/maxGuests?/amenities?) + FormBag.amenities narrowing (D-21) + 36 new EN+RU i18n keys in parity + validator test fixture seed
  - [x] 06-02-PLAN.md — Wave 1: validator extension (D-22 amenity-required + payload.amenities) + PropertyService FormData wire-up (Gap 9.1 — rooms/maxGuests/amenities on create + update) + CreateListingScreen rehydrate (Gap 9.2 — setRooms/setMaxGuests/setAmenities on edit) + 4 new test assertions + 1 flipped
  - [x] 06-03-PLAN.md — Wave 1: form HospitalitySection 12-chip amenity multi-select grid replacing placeholder hint (D-18); parallel to 06-02 (disjoint files)
  - [x] 06-04-PLAN.md — Wave 2: HospitalityCard.tsx (D-07..D-12 tour-first no-price card) + HospitalitySection.tsx (D-01 hidden-when-empty horizontal strip); zero diff in PropertyCard.tsx (D-07 / Pitfall 7)
  - [ ] 06-05-PLAN.md — Wave 3: 4 list screens — HomeScreen tri-state (D-04) + WR-03 close (D-24) + strip mount; FavoritesScreen / RenterListingsScreen / OwnerListingsScreen strip mount via ListHeaderComponent (D-06); RenterListings passes showEditButton={true} (Gap 9.3)
  - [ ] 06-06-PLAN.md — Wave 3: PropertyDetailsScreen in-place branch — tour above gallery (D-14) + price-block omit (D-15) + sticky 3-button contact bar with disabled-when-empty (D-16) + amenity chip grid replaces features.map (D-23); parallel to 06-05 (different file)
  - [ ] 06-07-PLAN.md — Wave 4: delete hospitality.amenitiesPhase6Placeholder i18n key + 06-VERIFICATION.md regression bundle + 06-QA-MATRIX.md ~80-cell physical-device scaffold + BLOCKING manual QA walk checkpoint
**UI hint**: yes

### Phase 7: Alignment Pass

**Goal**: Visual alignment issues flagged by the user via screenshots are fixed across the specified screens, with dark/light parity and existing theme tokens preserved.
**Depends on**: User-provided screenshots (pending); parallelizable with any prior phase once screenshots arrive
**Requirements**: ALIGN-01, ALIGN-02
**Success Criteria** (what must be TRUE):
  1. Each screen flagged in the user-provided screenshots matches the intended layout on both physical iOS and physical Android devices in both portrait and (where supported) landscape
  2. All alignment fixes use existing `useTheme()` color tokens and existing spacing conventions from `.planning/codebase/CONVENTIONS.md` — no new hardcoded colors or one-off magic spacing values are introduced
  3. Dark and light modes both render correctly on every fixed screen (no dark-mode-only or light-mode-only regressions)
  4. When the user's screenshots arrive, the phase plan is concretized into per-screen sub-tasks before execution begins (plan-phase will surface this gap at planning time if screenshots are still missing)
**Plans**: TBD
**UI hint**: yes

### Phase 8: Release & Store Submission

**Goal**: v1.0.4 is submitted to the App Store and Play Store with consistent version metadata, a complete iOS privacy manifest, Xcode 26 / iOS 26 SDK compliance, and manual regression sign-off on physical devices across all preceding M1 scope.
**Depends on**: Phases 1–6 (content), Phase 7 (visual polish, if screenshots arrived)
**Requirements**: REL-01, REL-02, REL-03, REL-04, REL-05, REL-06
**Success Criteria** (what must be TRUE):
  1. Version numbers are consistent and bumped across all four files: `package.json` → `1.0.4`, `android/app/build.gradle` → `versionCode 25` / `versionName "1.0.24"`, `ios/JayTap.xcodeproj/project.pbxproj` → `CURRENT_PROJECT_VERSION 21` / `MARKETING_VERSION 1.0.4`
  2. `ios/JayTap/PrivacyInfo.xcprivacy` is populated with all actually-collected data types (at minimum: EmailAddress, Name, PhoneNumber, PhotoOrVideo, OtherContactInfo for WhatsApp/Telegram handles, Location — precise or coarse as appropriate) with correct `Linked`/`Tracking`/`Purposes` metadata, and `NSPrivacyAccessedAPITypes` declares the UserDefaults reason used by `@react-native-async-storage/async-storage`
  3. The build machine runs Xcode 26 with the iOS 26 SDK (confirmed before archive), and the iOS archive uploads successfully to App Store Connect without ITMS automated rejection
  4. A manual regression pass on at least one physical iOS device and one physical Android device covers: keyboard handling on all input screens, bottom-nav responsiveness across all transitions, Create/Edit/View for all three categories, and the admin-gated URL fields from both an admin-email and a non-admin-email account
  5. The build is submitted to App Store Connect and Google Play Console with release notes describing the polish changes (bug fixes + hospitality launch), and App Store Connect App Privacy responses match the privacy manifest exactly
  6. The `applinks:bizdinkonush.com` legacy entitlement is reviewed (removed if the domain has lapsed, retained only with explicit rationale), and Google Maps Android key restrictions (package + SHA-1) are confirmed in Cloud Console before submission
**Plans**: TBD

## Milestone 2 (Future) — "Roles & Moderation"

Captured for roadmap visibility per PROJECT.md. Not actionable in M1. Success criteria are abbreviated; these phases will be fully fleshed out at the start of M2.

- [ ] **Phase M2.1: Formal Role System** — Firebase custom claims (or server-verified equivalent); `AuthContext.refreshProfile()`; backend `Authorization: Bearer <idToken>` verification middleware replacing `x-firebase-uid` header; delete M1 email allowlist
- [ ] **Phase M2.2: Listing Moderation Lifecycle** — `pending` / `live` / `rejected` status with `rejectionReason`; default new listings to `live` initially (OLX post-hoc pattern); flag/report endpoint following existing `ChatService.report` pattern
- [ ] **Phase M2.3: Moderation Queue & Edit-on-Behalf** — `ModerationQueueScreen` (admin + moderator-only, filters by `status = pending` or `flagCount > 0`); `CreateListingScreen` accepts `isModerating` + `targetUserId` override props
- [ ] **Phase M2.4: Admin UIs** — `AdminUsersScreen` with role picker (admin-only); promote user ↔ moderator, promote to admin; extend `PlatformVerifications` with `hospitalityCurated: boolean` trust badge
- [ ] **Phase M2.5: Owner-Side Moderation UX** — Rejection reason + "Fix and resubmit" CTA on `OwnerListingsScreen` listing cards

M2 requirements (ROLE-01…04, MOD-01…06, ADMIN-01…04) are tracked in REQUIREMENTS.md under `## v2 Requirements` and will be assigned to M2 phases when that milestone is planned.

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Nav Reliability | 6/6 | Complete | 2026-04-22 |
| 2. Universal Keyboard Handling | 6/6 | Complete | 2026-04-23 |
| 3. Role Gating Precursor | 7/7 | Complete | 2026-04-23 |
| 4. Listing Form Taxonomy & Decomposition | 6/6 | Complete | 2026-04-24 |
| 5. Listing Form Validation & Edit Flow | 5/5 | Complete | 2026-04-24 |
| 6. Hospitality Rendering | 0/7 | Planned | - |
| 7. Alignment Pass | 0/? | Not started | - |
| 8. Release & Store Submission | 0/? | Not started | - |

---

*Roadmap created: 2026-04-22*
*Derived from REQUIREMENTS.md (35 v1 REQ-IDs) and research/ synthesis*
*Phase 1 planned: 2026-04-22 (6 plans, 5 waves — Wave 0 / Wave 0.5 / Wave 1 / Wave 2 / [Wave 3 conditional] / Wave 4)*
*Phase 6 planned: 2026-04-24 (7 plans, 5 waves — Wave 0 / Wave 1 / Wave 2 / Wave 3 / Wave 4)*

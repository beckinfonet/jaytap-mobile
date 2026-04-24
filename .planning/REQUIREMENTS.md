# Requirements: JayTap

**Defined:** 2026-04-22
**Milestone:** M1 "Polish + Hospitality" (v1.0.4) — ship ASAP to iOS App Store + Google Play
**Core Value:** Prospective renters and buyers can reliably browse, filter, and inquire about Bishkek properties on a phone without UI blockers.

## v1 Requirements

Requirements for v1.0.4 release. Each maps to exactly one roadmap phase.

### Nav Reliability (NAV)

- [ ] **NAV-01**: Bottom navigation responds to every tab tap from inside every main-stack screen (Home, Chat, Profile, Favorites, Listings, Appointments), verified on physical iOS and Android devices
- [ ] **NAV-02**: Screens pushed over the tab bar release touch capture when returning to the main stack (root-cause fix for the `display: none` "keep-alive" pattern identified in `.planning/codebase/CONCERNS.md` and research ARCHITECTURE/PITFALLS)
- [ ] **NAV-03**: Reproduction matrix for the nav bug is recorded (which transitions trigger it, on which platforms) before the fix lands, so regressions are detectable later

### Universal Keyboard Handling (KBD)

- [ ] **KBD-01**: On every screen with a text input (auth flows, Create Listing, Chat, Profile edits), the keyboard never covers the focused input on iOS or Android physical devices
- [ ] **KBD-02**: Keyboard-handling implementation is universal (single root-level solution, not per-screen patching) — research-recommended approach is `react-native-keyboard-controller@1.21+` with `KeyboardProvider` at the root plus `KeyboardAwareScrollView` on input screens
- [ ] **KBD-03**: `react-native-reanimated` is confirmed installed (or added if missing) as the peer dependency for the keyboard library — this is an install-time gate flagged by the Stack research
- [ ] **KBD-04**: New Architecture (Fabric) compatibility verified on physical device builds for both platforms before ship

### Alignment Fixes (ALIGN)

- [ ] **ALIGN-01**: Visual alignment issues fixed across the screens the user flagged via screenshots (screenshots pending from user — this requirement will be concretized into per-screen sub-tasks when images arrive)
- [ ] **ALIGN-02**: Fixes respect existing design tokens (`useTheme()` colors, dark/light parity, existing spacing conventions per `.planning/codebase/CONVENTIONS.md`)

### Listing Form Overhaul (FORM)

- [x] **FORM-01**: `Land` property type removed from `PROPERTY_TYPES` in `CreateListingScreen.tsx`, from any filter UI in Home, from `TranslationKeys`, from type definitions, and from any mock/seed data — Phase 4 complete 2026-04-24
- [x] **FORM-02**: `Hostel` and `Hotel` added as property types under a new `Hospitality` category — Phase 4 complete 2026-04-24
- [x] **FORM-03**: Property types grouped into three categories (`Residential` / `Commercial` / `Hospitality`), with a `propertyCategory` derivation from `propertyType` accessible as a utility (`src/utils/propertyCategory.ts` per architecture research) — Phase 4 complete 2026-04-24
- [ ] **FORM-04**: `CreateListingScreen` renders a different required-field set based on category:
  - Residential → title, description, address, city, district, price, currency, bedrooms, bathrooms, areaSqm, availableDate
  - Commercial → title, description, address, city, district, price, currency, areaSqm (no bedrooms/bathrooms), sub-type (office/retail/warehouse/industrial)
  - Hospitality → title, description, address, city, district, rooms, bathrooms, maxGuests, amenities, contact (phone + WhatsApp or Telegram required), no price/currency
- [x] **FORM-05**: `CreateListingScreen.tsx` is decomposed into category sub-components (new `src/components/CreateListingForm/` directory per architecture research: `BasicInfo`, `Residential`, `Commercial`, `Hospitality`, `Media`, `Price`, `Verification`) — Phase 4 complete 2026-04-24 (orchestrator 1404→871 LOC / −37%)
- [ ] **FORM-06**: `validateByCategory()` is the single source of truth for per-category validation; submitting an invalid form surfaces per-field errors and prevents submission
- [ ] **FORM-07**: Switching the category chip while filling a form does not silently blank out already-entered fields shared across categories (title, description, address) — research pitfall #4 explicitly
- [ ] **FORM-08**: Editing an existing listing correctly initializes the form into the listing's category (no residential fields shown on a commercial listing, etc.)
- [x] **FORM-09**: All new UI strings added to both EN and RU locale tables (`src/locales/en.ts`, `src/locales/ru.ts` — project uses `.ts` not `.json`) — bilingual parity per project constraints — Phase 4 complete 2026-04-24 (both files at 365 keys; `Record<TranslationKeys,string>` tsc gate + `check-i18n-parity.sh` script)

### Hospitality Rendering (HOSP)

- [ ] **HOSP-01**: Hostel/Hotel listings appear in their own dedicated section on `HomeScreen`, `FavoritesScreen`, and `OwnerListingsScreen` (separate section, not mixed into the main residential/commercial list) — research ARCHITECTURE recommends `HospitalitySection` as `ListHeaderComponent` with an inner horizontal list
- [ ] **HOSP-02**: Hostel/Hotel listings are present under both the Rent and Sell filter/toggle views (no price shown in either case)
- [ ] **HOSP-03**: A `HospitalityCard` component (or prop variant on `PropertyCard`) renders Hostel/Hotel cards without a price chip, emphasizing 3D tour thumbnail and a `Hostel`/`Hotel` badge
- [ ] **HOSP-04**: `PropertyDetailsScreen` renders a Hostel/Hotel listing without any price block, with 3D tours promoted above the image gallery, panoramic media surfaced, and WhatsApp/Telegram/phone quick-action contact buttons prominent
- [ ] **HOSP-05**: Hospitality-specific amenities multi-select supports at minimum this 12-item taxonomy: WiFi, Air conditioning, Heating, Kitchen, Breakfast, Parking, 24h reception, Laundry, Hot water, Common area, Lockers, En-suite bathrooms (i18n keys documented in `FEATURES.md`)
- [ ] **HOSP-06**: Hostel/Hotel listing cards and detail pages render correctly in both EN and RU with all amenity labels translated

### Role Gating Precursor (GATE)

- [x] **GATE-01**: `src/hooks/useRole.ts` + `src/hooks/useRole.ts:can(action)` + `src/components/Gated.tsx` implemented per architecture research, with M1 implementation backed by a hardcoded email allowlist in `src/constants/adminAllowlist.ts`
- [x] **GATE-02**: Matterport tour URL fields and panoramic image URL fields in `CreateListingScreen` are gated — only renderable when `can('edit_matterport_url')` / `can('edit_panoramic_url')` returns true
- [x] **GATE-03**: Existing `user.backendProfile.userType === 'admin'` check at `PropertyDetailsScreen.tsx:178` (and any other scattered admin checks) replaced by the `useRole()` helper — no new call site hardcodes email strings or `userType` literals
- [x] **GATE-04**: Hook + component shape is forward-compatible with M2 role system (no call-site changes needed when the allowlist is replaced by a role-based implementation — verified by shape of `can(action)` API accepting actions, not role names)
- [x] **GATE-05**: Backend-side enforcement checkpoint recorded: confirmed that Matterport/panoramic URL writes on the Railway backend enforce admin-only at the API layer (client gate is cosmetic otherwise). If backend does NOT enforce, a coordination task is raised (may block the release or be accepted as a known risk)

### Release (REL)

- [ ] **REL-01**: `package.json` version bumped to `1.0.4`
- [ ] **REL-02**: Android `versionCode` incremented to 25, `versionName` updated to `1.0.24` (following existing convention in recent commits), iOS `CURRENT_PROJECT_VERSION` incremented to 21, `MARKETING_VERSION` updated to `1.0.4`
- [ ] **REL-03**: Privacy manifest (`ios/JayTap/PrivacyInfo.xcprivacy`) populated with required declarations for data collected by the app (email, name, phone, photo, location, contact info) per PITFALLS research — currently empty per codebase CONCERNS
- [ ] **REL-04**: Build verified with Xcode 26 / iOS 26 SDK as required by Apple policy starting April 2026 (confirm/upgrade before archive)
- [ ] **REL-05**: Manual regression pass completed on at least one physical iOS and one physical Android device covering: keyboard on all input screens, bottom-nav responsiveness across all transitions, all three listing categories (create + edit + view), role-gated fields (admin vs non-admin email)
- [ ] **REL-06**: Release artifacts submitted to App Store Connect and Google Play Console with release notes describing the polish changes

## v2 Requirements

Scoped for M2 "Roles & Moderation" — captured here per PROJECT.md decision to show both milestones in the roadmap. Not actionable in the current run.

### Formal Role System (ROLE)

- **ROLE-01**: Three-role system (`admin` / `moderator` / `user`) with server-side trust boundary — backend rejects client-submitted `userType` changes
- **ROLE-02**: M1 hardcoded email allowlist deleted from `src/constants/adminAllowlist.ts`; `useRole()` implementation swaps to reading `user.backendProfile.userType` with a server-verified trust chain
- **ROLE-03**: `AuthContext.refreshProfile()` added to force token/profile refresh after role change (Firebase custom-claims gotcha)
- **ROLE-04**: Backend-side endpoint verifying Firebase ID tokens via `firebase-admin` SDK (or equivalent signed-token verification) — prerequisite for any trustworthy role system; tracked as part of the M2 backend coordination

### Moderation (MOD)

- **MOD-01**: Listing status lifecycle (`pending` / `live` / `rejected`) with `rejectionReason` field
- **MOD-02**: Default new listings to `live` initially (OLX post-hoc audit pattern) — flag for flipping to `pending`-default once moderation capacity is proven
- **MOD-03**: Flag/report listing button on `PropertyDetailsScreen`, writing to a `POST /api/properties/:id/flag` endpoint (following existing `ChatService.report` pattern)
- **MOD-04**: `ModerationQueueScreen` — admin + moderator-only, filters by `status = pending` or `flagCount > 0`
- **MOD-05**: Moderator edit-on-behalf-of — `CreateListingScreen` accepts `isModerating` + `targetUserId` override props
- **MOD-06**: Rejection reason + "Fix and resubmit" CTA surfaced on owner's listing card in `OwnerListingsScreen`

### Admin UIs (ADMIN)

- **ADMIN-01**: `AdminUsersScreen` — list users with search, role-picker per user (admin-only)
- **ADMIN-02**: Admin can promote `user` → `moderator` and demote `moderator` → `user` from the UI
- **ADMIN-03**: Admin can add new admins via the UI (promote `user`/`moderator` → `admin`)
- **ADMIN-04**: Admin-assigned trust badge controls extend existing `PlatformVerifications` set with a `hospitalityCurated: boolean`

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| 2GIS native map bridge | Separate multi-week effort; plan captured in `2GIS_BRIDGE_PLAN.md`. Not required for v1.0.4 polish release. |
| Payment / booking calendar for Hospitality | Showcase-only by design; daily dynamic pricing can't be reliably tracked; contact drives offline booking. Research `FEATURES.md` confirms this as a defensible anti-feature. |
| Per-night price field for Hospitality | Users treat it as authoritative; creates owner-vs-guest disputes JayTap can't arbitrate. |
| Separate per-room listings for hostels (Airbnb-style) | Single listing per hostel is sufficient for showcase; rooms + maxGuests conveys capacity. |
| In-app role promotion UI in M1 | Security theater without server-side claim enforcement. Deferred to M2. |
| Public moderator identity | Invites harassment of moderators; industry-standard to show "Moderated by JayTap team" only. |
| Chat moderation tooling | M2 moderator scope covers listings only. Chat moderation is a future concern. |
| Automated AI content moderation | Manual moderation is sufficient at current scale; defer until listing volume justifies it. |
| OAuth / magic link / 2FA | Email/password with reset covers current user base. |
| Migration tooling for existing listings | No production listings exist (confirmed); clean slate for category/type changes. |
| Rewriting custom state-machine navigation to `react-navigation` | Weeks of unrelated work; out of scope per constraints. Fixes must work within existing pattern. |
| Schema-driven form engine for listing form | Overkill for ~25 fields across 3 categories; architecture research explicitly rejects this pattern. |
| Fine-grained permission matrix (beyond 3 roles) | Coarse role model is correct for pre-launch scale (Oso guidance). |

## Traceability

Each v1 REQ-ID maps to exactly one phase in ROADMAP.md.

| Requirement | Phase | Status |
|-------------|-------|--------|
| NAV-01 | Phase 1: Nav Reliability | Pending |
| NAV-02 | Phase 1: Nav Reliability | Pending |
| NAV-03 | Phase 1: Nav Reliability | Pending |
| KBD-01 | Phase 2: Universal Keyboard Handling | Pending |
| KBD-02 | Phase 2: Universal Keyboard Handling | Pending |
| KBD-03 | Phase 2: Universal Keyboard Handling | Pending |
| KBD-04 | Phase 2: Universal Keyboard Handling | Pending |
| ALIGN-01 | Phase 7: Alignment Pass | Pending |
| ALIGN-02 | Phase 7: Alignment Pass | Pending |
| FORM-01 | Phase 4: Listing Form Taxonomy & Decomposition | Complete |
| FORM-02 | Phase 4: Listing Form Taxonomy & Decomposition | Complete |
| FORM-03 | Phase 4: Listing Form Taxonomy & Decomposition | Complete |
| FORM-04 | Phase 5: Listing Form Validation & Edit Flow | Pending |
| FORM-05 | Phase 4: Listing Form Taxonomy & Decomposition | Complete |
| FORM-06 | Phase 5: Listing Form Validation & Edit Flow | Pending |
| FORM-07 | Phase 5: Listing Form Validation & Edit Flow | Pending |
| FORM-08 | Phase 5: Listing Form Validation & Edit Flow | Pending |
| FORM-09 | Phase 4: Listing Form Taxonomy & Decomposition | Complete |
| HOSP-01 | Phase 6: Hospitality Rendering | Pending |
| HOSP-02 | Phase 6: Hospitality Rendering | Pending |
| HOSP-03 | Phase 6: Hospitality Rendering | Pending |
| HOSP-04 | Phase 6: Hospitality Rendering | Pending |
| HOSP-05 | Phase 6: Hospitality Rendering | Pending |
| HOSP-06 | Phase 6: Hospitality Rendering | Pending |
| GATE-01 | Phase 3: Role Gating Precursor | Complete |
| GATE-02 | Phase 3: Role Gating Precursor | Complete |
| GATE-03 | Phase 3: Role Gating Precursor | Complete |
| GATE-04 | Phase 3: Role Gating Precursor | Complete |
| GATE-05 | Phase 3: Role Gating Precursor | Complete |
| REL-01 | Phase 8: Release & Store Submission | Pending |
| REL-02 | Phase 8: Release & Store Submission | Pending |
| REL-03 | Phase 8: Release & Store Submission | Pending |
| REL-04 | Phase 8: Release & Store Submission | Pending |
| REL-05 | Phase 8: Release & Store Submission | Pending |
| REL-06 | Phase 8: Release & Store Submission | Pending |

**Coverage:**
- v1 requirements: 35 total
- Mapped to phases: 35 ✓
- Unmapped: 0

---

*Requirements defined: 2026-04-22*
*Last updated: 2026-04-22 after roadmap creation (phase mappings populated)*

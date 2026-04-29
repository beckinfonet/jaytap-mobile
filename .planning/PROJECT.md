# JayTap

## What This Is

JayTap is a mobile real-estate app for Bishkek where users rent, sell, and browse properties — with curated 3D Matterport tours and panoramic imagery as a differentiator for hostels, hotels, and premium listings. Built as a React Native 0.84 app (iOS + Android) with a Railway-hosted backend and Firebase Identity Toolkit for auth, serving landlords, sellers, hospitality owners, and prospective renters/buyers.

## Core Value

Prospective renters and buyers can reliably browse, filter, and inquire about Bishkek properties on a phone without UI blockers (keyboard covering inputs, navigation getting stuck, forms requesting wrong fields for the property type).

## Requirements

### Validated

<!-- Shipped in production prior to this GSD init — inferred from codebase map (.planning/codebase/). -->

- ✓ Email/password signup, login, logout — existing (`AuthService`, `AuthContext`, Firebase Identity Toolkit)
- ✓ Password reset flow (forgot + reset screens) — shipped in v1.0.21
- ✓ Password policy (min 7 chars, uppercase, number, symbol) — shipped in v1.0.22
- ✓ Cached user session via AsyncStorage — existing
- ✓ Account settings + account deletion — existing
- ✓ Property browsing (Home screen with list + filters) — existing
- ✓ Property details screen with verification trust signals — existing
- ✓ Create / edit listing form (9 property types, Rent/Sell toggle) — existing
- ✓ Owner / renter listing views — existing
- ✓ Favorites — existing
- ✓ Chat (compose + thread) — existing
- ✓ Schedule viewing + appointments — existing
- ✓ 3D tour viewer (Matterport via WebView) + tour selection — existing
- ✓ Dark/light theme following system preference — existing
- ✓ English/Russian localization — existing (`@jaytap_language` AsyncStorage key)
- ✓ Admin-only verification flag editing (`user.backendProfile.userType === 'admin'`) — partial, one screen only

<!-- M1 v1.0.4 "Polish + Hospitality" — shipped 2026-04-28 to TestFlight + Play Console processing -->

- ✓ NAV-01 Bottom navigation responds across all main-stack screens — v1.0.4 (Phase 1)
- ✓ NAV-02 Screens push over the tab bar release touch capture on return — v1.0.4 (Phase 1)
- ✓ NAV-03 Reproduction matrix recorded — v1.0.4 (Phase 1)
- ✓ KBD-01 Keyboard never covers focused inputs on any screen — v1.0.4 (Phase 2)
- ✓ KBD-02 Universal root-level keyboard solution (`react-native-keyboard-controller@1.21.6`) — v1.0.4 (Phase 2)
- ✓ KBD-03 `react-native-reanimated@4.3.0` peer installed with Babel plugin LAST — v1.0.4 (Phase 2)
- ✓ KBD-04 Fabric (New Architecture) compatibility verified on physical devices — v1.0.4 (Phase 2)
- ✓ ALIGN-01/02 Visual alignment respects design tokens — v1.0.4 (Phase 7 SKIPPED, satisfied implicitly via Phase 1–6 device QA per Key Decisions row 129)
- ✓ FORM-01 `Land` property type removed atomically (`scripts/check-land-removed.sh` exit 0) — v1.0.4 (Phase 4)
- ✓ FORM-02 `Hostel` + `Hotel` added under `Hospitality` category — v1.0.4 (Phase 4)
- ✓ FORM-03 Three-category grouping (Residential / Commercial / Hospitality) — v1.0.4 (Phase 4)
- ✓ FORM-04 Required-field set branches by category — v1.0.4 (Phase 5)
- ✓ FORM-05 `CreateListingScreen` decomposed 1404→871 LOC into 7 sub-components — v1.0.4 (Phase 4)
- ✓ FORM-06 `validateByCategory()` single source of truth — v1.0.4 (Phase 5)
- ✓ FORM-07 Switching category preserves shared fields — v1.0.4 (Phase 5)
- ✓ FORM-08 Editing existing listing initializes into correct category — v1.0.4 (Phase 5)
- ✓ FORM-09 EN+RU locale parity at 365 keys — v1.0.4 (Phase 4)
- ✓ HOSP-01 `HospitalitySection` strip on Home/Favorites/Owner+RenterListings — v1.0.4 (Phase 6)
- ✓ HOSP-02 Hospitality listings under both Rent + Sell, no price — v1.0.4 (Phase 6)
- ✓ HOSP-03 `HospitalityCard` tour-first, no price chip — v1.0.4 (Phase 6)
- ✓ HOSP-04 Tour-first `PropertyDetailsScreen` Hospitality branch — v1.0.4 (Phase 6)
- ✓ HOSP-05 12-amenity taxonomy with chip multi-select picker — v1.0.4 (Phase 6)
- ✓ HOSP-06 Bilingual EN+RU amenity rendering — v1.0.4 (Phase 6)
- ✓ GATE-01 `useRole()` / `can(action)` / `<Gated>` over hardcoded allowlist — v1.0.4 (Phase 3)
- ✓ GATE-02 Matterport + panoramic URL fields gated — v1.0.4 (Phase 3)
- ✓ GATE-03 `userType === 'admin'` migrated to `useRole()` — v1.0.4 (Phase 3)
- ✓ GATE-04 Forward-compatible API shape (no call-site changes for M2 swap) — v1.0.4 (Phase 3)
- ✓ GATE-05 Backend enforcement — D-22 Path B accepted-risk for v1.0.4; closes via M2 ROLE-04 — v1.0.4 (Phase 3)
- ✓ REL-01 `package.json` bumped to `1.0.4` — v1.0.4 (Phase 8)
- ✓ REL-02 iOS `MARKETING_VERSION 1.0.4` + `CURRENT_PROJECT_VERSION 22` + Android `versionCode 28` / `versionName "1.0.28"` — v1.0.4 (Phase 8)
- ✓ REL-05 Manual regression on physical iOS + Android devices APPROVED on first pass — v1.0.4 (Phase 8)
- ✓ REL-06 Bilingual EN+RU release notes pasted on ASC + Play Console — v1.0.4 (Phase 8)

### Active

<!-- M1 v1.0.4 "Polish + Hospitality" SHIPPED 2026-04-28 to TestFlight + Play Console processing. All M1 active items moved to ## Validated. M2 "Roles & Moderation" requirements will be defined fresh via /gsd-new-milestone — sketch below for visibility. -->

**Active workstreams:** *None.* M1 closed; M2 planning unblocked but not yet started. Fresh REQUIREMENTS.md to be created at `/gsd-new-milestone` invocation.

### M2 Sketch (will be fully planned at /gsd-new-milestone)

<!-- M2 "Roles & Moderation". Sketch carried forward from prior REQUIREMENTS.md v2 section for visibility. -->

- [ ] Formal three-role system: `admin` / `moderator` / `user` (replaces M1 hardcoded email gate)
- [ ] Moderator can: approve listings, flag/remove content, edit any user's listing
- [ ] Admin can: all moderator actions + edit Matterport/panoramic URLs + set verification badges + promote-to-moderator + add new admins + full backend access
- [ ] Role-aware UI gating across CreateListing, PropertyDetails, and any other surfaces that expose restricted actions
- [ ] Admin-facing UIs for moderation queue and role promotion
- [ ] Backend changes to make `userType` trustworthy (custom claims, authenticated role source)
- [ ] Backlog 999.1: Archive listings (authors + mod/admin) — promote at /gsd-review-backlog when M2 planning starts

### Descoped (M1 v1.0.4)

- — REL-03 Privacy manifest (`ios/JayTap/PrivacyInfo.xcprivacy`) population — descoped v1.0.4 per Phase 8 D-13. v1.0.3 production manifest (FileTimestamp / UserDefaults / SystemBootTime Required Reason API entries; empty `NSPrivacyCollectedDataTypes`) accepted by Apple under v1.0.3 review and inherited unchanged by v1.0.4 update submission. Re-open conditions: Apple flags missing `NSPrivacyCollectedDataTypes` at a future submission, OR a future phase introduces a new data-collecting SDK or authentication provider.
- — REL-04 Xcode 26 / iOS 26 SDK gate — descoped v1.0.4 per Phase 8 D-13 (verification-only at archive time). SDK gate cleared 2026-04-28 (Xcode 26.4 / build 17E192). Re-open if Apple deprecates Xcode 26.4 / iOS 26 SDK.

### Out of Scope

- **2GIS native map bridge** — Significant separate milestone; decision + plan captured in `2GIS_BRIDGE_PLAN.md`. Not required for v1.0.4 polish release.
- **Payment/booking for hospitality** — Hospitality listings are showcase-only by design. Hostels/hotels have daily dynamic pricing the platform cannot reliably track; contact details drive offline booking.
- **Per-night price type for hospitality** — Eliminated because the platform is showcase-only; price fields hidden entirely for Hostel/Hotel.
- **Chat moderation tooling** — M2 moderator scope covers listings only. Chat moderation is a later concern.
- **New authentication providers (OAuth, magic link, 2FA)** — Email/password with reset covers current user base.
- **In-app role promotion UI in M1** — Deferred to M2. M1 uses hardcoded email allowlist; admins are assigned via code edits until the M2 roles system ships.
- **Migration tooling for existing listings** — No production listings exist (confirmed); all current data is mock. Clean slate for the category/type changes.

## Context

**Project stage:** Shipped v1.0.4 (M1 "Polish + Hospitality") on 2026-04-28 to TestFlight + Play Console processing. iOS shipped at `1.0.4 build 22`; Android shipped at `1.0.28 versionCode 28`. No production listings; all content remains mock data. M2 "Roles & Moderation" planning unblocked.

**Tech stack (v1.0.4):** React Native 0.84.0 New Architecture (Hermes + Fabric on both platforms); custom `App.tsx` state-machine navigation (no react-navigation); React Context state (`ThemeProvider` → `LanguageProvider` → `AuthProvider`); `axios` to Railway backend + Firebase Identity Toolkit REST; `react-native-keyboard-controller@1.21.6` + `reanimated@4.3.0` + `worklets@0.8.1` for universal keyboard handling; `useRole()` / `can(action)` / `<Gated>` abstraction over hardcoded admin-email allowlist (M2 swaps to server-verified roles). Build toolchain: Xcode 26.4 / Build 17E192.

**Target users:** Property listers (landlords, sellers, hostel/hotel operators) and prospective renters/buyers in Bishkek, Kyrgyzstan. EN/RU bilingual.

**Tech stack (from `.planning/codebase/STACK.md`):** React Native 0.84.0 (New Architecture enabled, Hermes on both platforms), React 19.2.3, TypeScript 5.8.3, Node 22+. Navigation is a custom boolean-state machine in `App.tsx` — no react-navigation. Cross-cutting state via nested Context providers (`ThemeProvider` → `LanguageProvider` → `AuthProvider`). HTTP via `axios` to a Railway-hosted backend plus direct Firebase Identity Toolkit REST calls.

**Known architecture concerns (from `.planning/codebase/CONCERNS.md` and `ARCHITECTURE.md`):**
- `App.tsx` navigation state machine holds 20+ boolean flags and conditional rendering — likely root cause of the bottom-nav unresponsiveness bug
- Tab persistence pattern keeps screens mounted via `display: none` ("keep-alive") — suspect for nav focus/touch-capture issues
- Service layer has partial admin gating via `user.backendProfile.userType === 'admin'` at exactly one call site (`PropertyDetailsScreen.tsx:178`)

**Prior artifacts:**
- `.planning/codebase/` — full codebase map (ARCHITECTURE, STACK, CONVENTIONS, STRUCTURE, INTEGRATIONS, CONCERNS, TESTING) generated 2026-04-22
- `2GIS_BRIDGE_PLAN.md` — decision + plan for future native 2GIS map bridge (out of scope for this milestone)

**Testing posture:** Manual verification on physical iOS and Android devices is the bar for M1. Added regression tests are welcome where feasible but not required to unblock the release.

## Constraints

- **Platform:** iOS + Android via React Native 0.84 (New Architecture). All M1 fixes must work on both. — Cross-platform parity is a core product promise; one-sided fixes create store-review friction.
- **Timeline:** Ship M1 to app stores ASAP. — User explicitly prioritized shipping over scope width; M2 (roles) was split out to protect this deadline.
- **Navigation:** No navigation library (custom `App.tsx` state machine). Fixes must work within this pattern; migrating to `react-navigation` is out of scope. — Rewriting navigation would be weeks of work and is unrelated to the polish goals.
- **Data:** Clean slate — no production listings. — Category/type schema changes (remove Land, add Hostel/Hotel) need no migration path; simplifies M1.
- **Auth:** Firebase Identity Toolkit + backend `userType` field. — M1 admin gate reuses the existing `userType` check via a hardcoded email allowlist; M2 will harden this into real roles.
- **i18n:** All new UI strings must be added to EN + RU locale tables (`src/locales/en.json`, `src/locales/ru.json`). — Bilingual Bishkek user base; Russian-only or English-only strings ship as bugs.
- **Theme:** New UI must respect existing `useTheme()` colors (dark + light). — Consistency with the rest of the app.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Split roles into Milestone 2 | Full role system is material work; would delay the store-critical polish release | — Validated 2026-04-28 (M1 shipped without M2 work; M2 planning unblocked) |
| Hardcoded admin email allowlist in M1 | Needed to gate Matterport/panoramic URL editing on Hospitality listings before M2 ships real roles; minimal implementation that doesn't block release | — Validated 2026-04-23 (Phase 3); GATE-05 backend enforcement via D-22 Path B accepted-risk; closes via M2 ROLE-04 |
| Remove `Land` entirely | User decision — not part of the product's target use cases for Bishkek | — Validated 2026-04-24 (Phase 4); `scripts/check-land-removed.sh` CI gate exit 0 |
| Hospitality (Hostel/Hotel) is showcase-only, no price | Daily dynamic pricing can't be reliably tracked; contact info drives offline booking | — Validated 2026-04-25 (Phase 6); HospitalityCard ships zero `formatPrice` import |
| Hospitality listings appear under both Rent and Sell (no price in either) | An owner renting out hostel rooms vs. selling the whole hostel are both valid listing intents | — Validated 2026-04-25 (Phase 6); `hospitalityProperties` derived AFTER `transactionType` filter |
| Hospitality rendered in a separate section on list screens | Different information density (tours-first, no price) warrants visual separation | — Validated 2026-04-25 (Phase 6); `HospitalitySection` mounts via `ListHeaderComponent` on 4 list screens |
| Required-field sets branch by category, not individual type | 9 chips → 3 categories is easier to maintain and explain than per-chip conditionals | — Validated 2026-04-24 (Phase 5); pure `validateByCategory()` single source of truth |
| Universal keyboard solution, library choice deferred to planner | User wants robustness over any specific library; research phase will pick (likely `react-native-keyboard-controller`, `KeyboardAvoidingView`, or similar) | — Validated 2026-04-23 in Phase 2: chose `react-native-keyboard-controller@1.21.6` + reanimated@4.3.0 + worklets@0.8.1 under Fabric. Key load-bearing findings — (a) v4 Babel plugin is `'react-native-worklets/plugin'`, NOT the legacy `'react-native-reanimated/plugin'` which silently no-ops; (b) library `KeyboardAvoidingView` requires explicit `behavior` prop (has no default — disproves RESEARCH §9 A8); (c) `KeyboardProvider` slots between `SafeAreaProvider` and `ThemeProvider` as the single root-level solution — zero `keyboardVerticalOffset` remains in `src/` |
| Bottom-nav fix starts with reproduction + root-cause, not a guess | Bug location is "unknown — need to investigate"; suspected in `App.tsx` boolean state machine | — Validated 2026-04-22 in Phase 1: root-caused to stale `hideMainStackUnderOverlay` flag + keep-alive screens retaining touch responders; derived overlay state from current overlay rather than storing flag; applied `pointerEvents` belt-and-suspenders |
| 2GIS native map bridge excluded from this milestone | Separate multi-week effort; plan already drafted in `2GIS_BRIDGE_PLAN.md` | — Pending |
| Phase 1 pre-fix device-matrix baseline deferred (accepted risk, 2026-04-22) | User time-constrained; full 45-cell × 2-platform device matrix not feasible before Plan 03 code fix lands. Routes through RESEARCH §9 A6 / §10 Q2 zero-FAIL branch upfront. Plan 04 gate semantics change from "FAILs→0" to "no regression + primary trap sequence visibly fixed"; D-04 pause-and-reassess trigger likelihood is higher. | — Accepted |
| Backend enforcement of admin endpoints (PATCH /properties/:id/verifications, PUT /properties/:id tours/panoramicPhotosUrl writes) — Role Gating Precursor (v1.0.4) Phase 3 | Accepted as known risk — not confirmed by Railway team by release cut. Release proceeds per D-22. Client-side gating (useRole + Gated + D-08 hide-entirely + Plan 04 service-layer canFromUser guard) reduces in-app blast radius but does NOT close raw-HTTP / non-admin-with-valid-Firebase-uid bypass. Rolls into pre-existing CONCERNS.md "Firebase uid used as sole auth" — Phase 3 does NOT regress that posture, only surfaces it. M2 ROLE-04 ships firebase-admin SDK + signed-ID-token verification to close the gap. See `.planning/phases/03-role-gating-precursor/03-BACKEND-COORDINATION.md` (Status: UNCONFIRMED-AT-SHIP) + `03-VERIFICATION.md` GATE-05 outcome section. | — Accepted risk 2026-04-23 (Phase 3) |
| Phase 7 Alignment Pass skipped (no screenshots needed) | User confirmed 2026-04-28 nothing alignment-related stood out during Phase 1–6 physical-device QA walks (iOS 26 / iPhone 15 Pro Max + Android 16 / Moto G XT2513V). ALIGN-01/02 satisfied implicitly: every Phase-1–6 manual QA walk PASSED on both devices in dark/light mode using existing `useTheme()` tokens — no out-of-spec layouts surfaced. Phase 7 retains its slot in ROADMAP.md for traceability but is closed with zero plans. | — Accepted skip 2026-04-28 (Phase 7) |
| Phase 8 D-13 descope-by-inheritance for v1.0.4 update submission | v1.0.4 is a polish/feature update on top of already-approved v1.0.3, not a fresh submission. Privacy manifest (`PrivacyInfo.xcprivacy`), ASC App Privacy responses, Play Data Safety questionnaire, `applinks:bizdinkonush.com` legacy entitlement, and Google Maps Android key restrictions were all live and unchanged in v1.0.3 production. v1.0.4 codebase scan confirmed no new data-collecting SDKs added. Re-touching live declarations would be churn without a defect to fix. REL-03 + REL-04 marked DESCOPED with re-open conditions documented inline. | — Validated 2026-04-28 (Phase 8); both stores accepted v1.0.4 update submission without privacy/entitlement flags |
| D-02 baseline trusted local `build.gradle` without Play Console version-code history check | Phase 8 CONTEXT.md D-02 anchored on local Android `versionCode 25 / versionName "1.0.24"` baseline. Play Console had already accepted versionCode 25 from a prior submission; bump-to-25 plan would have been rejected. User authored out-of-band commit `63f3b72` at archive time bumping versionCode 25 → 28 + iOS `CURRENT_PROJECT_VERSION` 21 → 22. Both stores accepted post-bump values. Lesson for M2+: pre-archive Wave-0 should query Play Console + TestFlight for highest-accepted version-code per track BEFORE setting baseline. | — Lesson recorded 2026-04-28 (M1 close); applied as RETROSPECTIVE.md key lesson 1 |
| M1 v1.0.4 milestone shipped to both stores | 8/8 ROADMAP phases resolved (7 executed + Phase 7 SKIPPED); 33/35 v1 requirements COMPLETE + 2 DESCOPED (REL-03 + REL-04 per D-13); iOS in TestFlight (build 22) + Android submitted/processing (versionCode 28). | — Shipped 2026-04-28 |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-28 after v1.0.4 (M1) milestone close*

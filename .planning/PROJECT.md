# JayTap

## What This Is

JayTap is a mobile real-estate app for Central Asia (current launch market: Bishkek, Kyrgyzstan; planned expansion: Almaty, Kazakhstan + Tashkent, Uzbekistan + smaller cities across all three countries) where users rent, sell, and browse properties — with curated 3D Matterport tours and panoramic imagery as a differentiator for hostels, hotels, and premium listings. Built as a React Native 0.84 app (iOS + Android) with a Node/MongoDB backend deployed on Railway (`JayTap-services` repo at `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services`, owned by the same maintainer as the RN client) and Firebase Identity Toolkit REST for auth, serving landlords, sellers, hospitality owners, and prospective renters/buyers.

## Core Value

Prospective renters and buyers can reliably browse, filter, and inquire about Bishkek properties on a phone without UI blockers (keyboard covering inputs, navigation getting stuck, forms requesting wrong fields for the property type).

## Current Milestone: M3 (next)

**Status:** Awaiting milestone goals from `/gsd-new-milestone` (planning started 2026-05-05 immediately after M2 archive).

**Anchor:** Backlog 999.1 (Contextual listing creation flow — 6-step conditional UI) is the M3 anchor. Reconciliation points before planning: (1) spec's flat property-type taxonomy vs. M1's three-category taxonomy; (2) photo/video/3D-tour upload moving from user to admin/mod (inverts current user-uploads-to-S3 workflow on `jaytap-prod-s3` IAM user).

**Goal:** TBD via `/gsd-new-milestone` discovery.

## Previous Milestone: v2.0 M2 "Roles & Moderation" (Shipped 2026-05-05)

**Delivered:** Three-role permission system (`admin` / `moderator` / `user`) backed by MongoDB as role authority + Railway-side JWKS verification (no Firebase SDK in either repo); 4-state listing lifecycle (`pending` / `live` / `rejected` / `archived`); moderation queue UI + approve/reject/edit-on-behalf actions with race-condition coverage; owner-side rejection banners; archive lifecycle for owners + mods/admins with post-rejection-bypass prevention; admin role-management UI with last-admin lockout + self-mutation prevention + audit trail; landlord application gate (Phase 4.5 inserted); 4-bug hotfix bundle (HF-01..HF-04).

iOS shipped at `2.0.0 build 27` (TestFlight Internal Testing); Android shipped at `2.0.0 versionCode 30` (Play Console Internal Testing). 6 phases + Phase 4.5 inserted, 47 plans, 51 v1 requirements, 7 days from milestone start to ship. Full archive at `.planning/milestones/v2.0-ROADMAP.md` + `.planning/milestones/v2.0-REQUIREMENTS.md`.

**M1 GATE-05 D-22 Path B accepted-risk row CLOSED** via M2 Phase 1 (ROLE-03 + ROLE-04: JWKS verification middleware + 5-service auth migration).

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
- ✓ REL-01 RN client `package.json` bumped to `2.0.0` — v2.0.0 (Phase 6)
- ✓ REL-02 iOS `MARKETING_VERSION 2.0.0` + `CURRENT_PROJECT_VERSION 27` + Android `versionCode 30` / `versionName "2.0.0"` (M1 D-02 lesson applied — derived from `06-STORE-HISTORY.md` queried max(local, store)+1) — v2.0.0 (Phase 6)
- ✓ REL-03 Manual physical-device QA matrix walked APPROVED on iPhone 15 Pro Max + Moto G XT2513V (74 PASS / 3 PARTIAL / 5 DEFERRED-USER-APPROVED / 0 FAIL) — v2.0.0 (Phase 6)
- ✓ REL-04 Bilingual EN+RU release notes pasted on ASC + Play Console (EN 403 / RU 409 chars under 500 limit) — v2.0.0 (Phase 6)
- ✓ REL-05 Backend live + healthy on Railway at SHA `2fb5639`; Mongo password rotated post-2026-04-29; `firebase-admin` confirmed absent — v2.0.0 (Phase 6)
- ✓ REL-06 v2.0.0 submitted to ASC TestFlight Internal + Play Console Internal Testing; M1 D-13 inheritance descope honored (7/7 items INHERITED) — v2.0.0 (Phase 6)

### Active

<!-- M2 v2.0 archived 2026-05-05 via /gsd-complete-milestone. M3 milestone goals being gathered; REQUIREMENTS.md will be re-created by /gsd-new-milestone. -->

(Empty — M3 requirements are pending milestone discovery via `/gsd-new-milestone`.)

<!-- M2 v2.0 v1 requirements — all 51 validated below. -->

**M2 v2.0 "Roles & Moderation" — shipped 2026-05-05 (full archive: `.planning/milestones/v2.0-*`):**

- ✓ HF-01..HF-04 Hotfix bundle (Hospitality field persistence + secret rotation + firebaseUid mass-assignment close + socket.io JWKS handshake) — v2.0 (Phase 1)
- ✓ ROLE-01 User.userType three-value enum — v2.0 (Phase 1)
- ✓ ROLE-02 Mongo migration script (renter|owner|agent → user/moderator/admin) — v2.0 (Phase 1)
- ✓ ROLE-03 JWKS verifyFirebaseToken middleware — v2.0 (Phase 1)
- ✓ ROLE-04 Five-service auth migration (auth/property/favorite/chat/appointment) — v2.0 (Phase 1)
- ✓ ROLE-05 Client Bearer migration via shared apiClient — v2.0 (Phase 1)
- ✓ ROLE-06 Firebase REST refresh-token flow — v2.0 (Phase 1)
- ✓ ROLE-07 useRole reads from backendProfile.userType + allowlist deletion — v2.0 (Phase 1)
- ✓ ROLE-08 GET /api/auth/me endpoint — v2.0 (Phase 1)
- ✓ ROLE-09 Axios 401/403 interceptors with single-flight refresh — v2.0 (Phase 1)
- ✓ ROLE-10 AuthContext.refreshRole + foreground RoleRefreshBanner — v2.0 (Phase 1)
- ✓ ROLE-11 server `roleRevokedAt` invariant (BACKEND ONLY; frontend mid-action 403 popup-recovery is M3 carry-forward) — v2.0 (Phase 1)
- ✓ MOD-01 Property.status enum + 9-field audit schema — v2.0 (Phase 2)
- ✓ MOD-02 Legacy `status: missing` fallback (D-07 client filter) — v2.0 (Phase 2)
- ✓ MOD-03 POST /properties defaults to pending + submit-for-review copy — v2.0 (Phase 2)
- ✓ MOD-04 GET /properties filters server-side to live for non-mod — v2.0 (Phase 2)
- ✓ MOD-05 GET /properties/:id 404 for non-live deep-link — v2.0 (Phase 2)
- ✓ MOD-06 4-tab segmented control on RenterListingsScreen — v2.0 (Phase 2)
- ✓ MOD-07 PropertyCard StatusPill — v2.0 (Phase 2)
- ✓ MOD-08 PropertyDetailsScreen RejectionBanner with per-session dismiss — v2.0 (Phase 2)
- ✓ MOD-09 HomeRejectionBanner with auto-dismiss + tap-to-rejected-tab — v2.0 (Phase 2)
- ✓ MOD-10..MOD-18 Moderation queue + actions + edit-on-behalf + race-safe + audit — v2.0 (Phase 3)
- ✓ ARCH-01..ARCH-05 Archive lifecycle (owner + mod/admin + restore-to-pending + admin-only hard-delete) — v2.0 (Phase 4)
- ✓ ADMIN-01..ADMIN-07 Admin role management UI + last-admin lockout + self-mutation prevention + audit trail — v2.0 (Phase 5)
- ✓ REL-01..REL-06 v2.0.0 atomic version bump + manual physical-device QA matrix APPROVED + EN+RU release notes + Railway redeploy + dual-store submission — v2.0 (Phase 6)
- ✓ Phase 4.5 (inserted) Landlord application capability gate + admin queue — v2.0 (out-of-roadmap insertion 2026-04-30)

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

**Project stage:** Shipped v2.0.0 (M2 "Roles & Moderation") on 2026-05-05 to ASC TestFlight Internal Testing (build 27) + Play Console Internal Testing (versionCode 30). M1 v1.0.4 shipped 2026-04-28. No production listings; all content remains mock data. M3 planning unblocked — milestone goals being gathered via `/gsd-new-milestone` immediately after this archive.

**Tech stack (v2.0.0):** React Native 0.84.0 New Architecture (Hermes + Fabric on both platforms); custom `App.tsx` state-machine navigation (no react-navigation); React Context state (`ThemeProvider` → `LanguageProvider` → `AuthProvider`); `axios` to Railway backend (now via shared `apiClient.ts` with Bearer + 401/403 single-flight) + Firebase Identity Toolkit REST; `react-native-keyboard-controller@1.21.6` + `reanimated@4.3.0` + `worklets@0.8.1` for universal keyboard handling; `useRole()` / `can(action)` / `<Gated>` now backed by **MongoDB-resolved roles** via Railway-side JWKS verification (no Firebase SDK in either repo — `jose` on backend). Build toolchain: Xcode 26.4 / Build 17E192. Backend: Node ≥22.12 (jose@6 ESM-only); 106 backend tests passing across 6 suites.

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
| MongoDB as role authority (NOT Firebase custom claims) | Single source of truth for `userType`; Firebase remains identity-proof only via JWKS-verified ID tokens. Avoids the split-brain failure mode of custom claims + Mongo profile drifting. | — Validated 2026-04-30 (M2 Phase 1); 5-service Bearer migration + JWKS middleware + production migration |
| `jose` for JWKS verification (NOT `firebase-admin` SDK) | REPO RULE per memory `no-firebase-sdk.md` — previous SDK addition attempt caused issues. `jose@6` ESM-only requires backend Node ≥22.12 (`nvm use 24` before backend npm/node ops). | — Validated 2026-04-30 (M2 Phase 1); `firebase-admin` confirmed absent from backend `package.json` at REL-05 |
| `roleRevokedAt` bumped on demotion only (NOT promotion) | Promotion forcing re-login is hostile UX (a user who just got promoted to moderator shouldn't get logged out). Demotion forcing re-login is required for security (revoke a moderator's in-flight tokens). Pitfall 3 captured. | — Validated 2026-05-03 (M2 Phase 5) |
| Phase 4.5 Landlord Application Workflow inserted out-of-roadmap | UX gap surfaced during Phase 4 device QA — existing role-gating allowed any authenticated user to reach `CreateListingScreen` without an explicit "I want to list properties" capability check. Insertion was cheaper than restructuring the roadmap. | — Validated 2026-04-30 (Phase 4.5 inserted + closed same day); known open uid-mismatch bug carried to M3 per memory `phase45-landlord-application-uid-mismatch-bug.md` |
| Phase 6 race-cell QA deferred to backend supertest coverage (T-06-33 option b) | Two-human simultaneous-tap race coordination across iOS + Android is timing-fragile. Backend MOD-15 + ROLE-11 atomic invariants ARE covered by Phase 3 supertest suite + Phase 1 verifyFirebaseToken middleware tests. Device-level race walk is empirical confirmation only. | — Accepted 2026-05-04 (Phase 6 06-06 QA matrix); race-cell test rig is M3 carry-forward |
| AWS IAM cross-project residual at REL-05 PARTIAL | JayTap runtime now uses dedicated `jaytap-prod-s3` keys exclusively, but the OLD shared cross-project IAM user retains JayTap-bucket policy access (cannot delete OLD user — other project depends on it). Documented re-open condition. | — PARTIAL accepted 2026-05-05 (Phase 6 REL-05); re-open when other project unblocks scoping the OLD shared IAM user away from JayTap bucket ARN |
| Android `clean bundleRelease` reanimated prefab gotcha | `gradlew clean bundleRelease` wipes reanimated's release prefab. Use `gradlew :react-native-reanimated:assembleRelease :app:bundleRelease` instead. | — Memory captured 2026-05-05 (`android-reanimated-clean-prefab-gotcha.md`); document in `scripts/release-android.md` is M3 carry-forward |
| M2 v2.0 milestone shipped to both stores | 6/6 ROADMAP phases + Phase 4.5 inserted; 47 plans; 51 v1 requirements (38 strict `[x]` + 5 `[~]` + 8 stale-bookkeeping at archive); iOS in TestFlight Internal (build 27) + Android in Play Console Internal Testing (versionCode 30). M1 GATE-05 D-22 Path B accepted-risk row CLOSED. | — Shipped 2026-05-05 |

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
*Last updated: 2026-05-05 — M2 v2.0 "Roles & Moderation" SHIPPED to both stores (TestFlight Internal build 27 + Play Console Internal Testing versionCode 30) and archived via /gsd-complete-milestone. M3 milestone goals being gathered.*

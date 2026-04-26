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

### Active

<!-- Milestone 1 — v1.0.4 "Polish + Hospitality". Ship ASAP to stores. -->

**Bug-fix workstream:**
- [x] Keyboard no longer covers inputs on any screen (iOS + Android, universal solution) — Validated in Phase 2 (2026-04-23): `react-native-keyboard-controller@1.21.6` + reanimated v4 + worklets; `<KeyboardProvider>` at App.tsx root; KASV on 7 screens; library KAV with `behavior="padding"` on 2 chat screens; 22/22 physical-device matrix cells PASS
- [x] Bottom nav responds from any screen (Chat, Profile, Favorites, etc.) — Validated in Phase 1 (2026-04-22): `pointerEvents` belt-and-suspenders + overlay-flag derivation; reproduction matrix captured
- [ ] Alignment issues addressed across app (specific screens to be provided via screenshots) — Phase 7

**Listing form overhaul:**
- [x] `Land` property type removed everywhere (chips, filters, i18n keys, type definitions) — Validated in Phase 4 (2026-04-24): atomic removal confirmed by `scripts/check-land-removed.sh` (exit 0) + verifier 5/5 must_haves PASS
- [x] `Hostel` and `Hotel` added under new `Hospitality` category — Validated in Phase 4 (2026-04-24): `src/utils/propertyCategory.ts` single source of truth (PROPERTY_TYPE_TO_CATEGORY Record)
- [x] Property types grouped into three categories: Residential / Commercial / Hospitality — Validated in Phase 4 (2026-04-24): three stacked chipRows with group labels; `propertyTypeToCategory()` derived, never stored in FormBag
- [ ] Required fields branch by category (Residential: bedrooms/bathrooms/area; Commercial: area + no bedrooms/bathrooms; Hospitality: rooms + bathrooms + amenities, no price) — **Phase 5** owns (`validateByCategory()`)
- [x] Hospitality listings appear under both Rent and Sell toggles, with price hidden in both — Validated in Phase 6 (2026-04-25): HOSP-02 — `hospitalityProperties` derived AFTER `transactionType` filter (Pitfall 2); strip count toggles with Rent/Sell; `HospitalityCard` ships zero `formatPrice` import
- [x] Hospitality listings render in a separate section on Home / Favorites / OwnerListings (not mixed with residential/commercial) — Validated in Phase 6 (2026-04-25): HOSP-01 — `HospitalitySection` mounts via `ListHeaderComponent` on Home + Favorites + RenterListings + OwnerListings; first-return guard `if (properties.length === 0) return null` enforces hidden-when-empty (D-01)
- [x] `PropertyDetailsScreen` renders hospitality listings without price, surfacing 3D tours and panoramic media — Validated in Phase 6 (2026-04-25): HOSP-04 — `isHospitality` derivation (D-13) gates 5 in-place branches (D-14 tour above gallery, D-15 price block omitted, D-16 sticky 3-button contact bar with disabled-when-empty + SafeArea-aware padding, D-23 amenity grid replaces features.map, plus HI-01 fix `b1da946` suppressing the residential beds/baths/sqft specs row)

**Phase 4 decomposition (structural enablement for Phases 5 + 6):**
- [x] `CreateListingScreen.tsx` reduced to orchestrator (1404→871 LOC / −37%) composing 7 sub-components — Validated in Phase 4 (2026-04-24): `src/components/CreateListingForm/` directory with BasicInfoSection + ResidentialSection + CommercialSection + HospitalitySection + MediaSection + PriceSection + VerificationSection + types + styles + barrel; `SectionProps` / `FormBag` contract in place for Phase 5 validation work
- [x] EN+RU locale parity (`src/locales/en.ts` ↔ `ru.ts` at 365 keys each) — Validated in Phase 4 (2026-04-24): `Record<TranslationKeys,string>` tsc compile-gate + `scripts/check-i18n-parity.sh` script

**Minimal-roles precursor (supports Hospitality URL gating in M1):**
- [x] Hardcoded admin email allowlist gates Matterport URL + panoramic image URL edit fields (all other listing fields remain user-editable) — Validated in Phase 3 (2026-04-24): `src/constants/adminAllowlist.ts` + `src/hooks/useRole.ts` (`canFromUser`, `PermissionDeniedError`, D-03 priority ladder) + `src/components/Gated.tsx`; PropertyService guard throws `E_PERMISSION_DENIED`; 3 screens migrated (CreateListing + PropertyDetails + Profile); D-14 4-part grep-invariant CI gate `scripts/check-role-grep.sh`; 15/15 Jest tests GREEN; GATE-05 backend enforcement via D-22 Path B accepted-risk (unconfirmed at ship — revisit in M2)

**Release:**
- [ ] Version bump to 1.0.4 (Android versionCode → 25, iOS CURRENT_PROJECT_VERSION → 21)
- [ ] Manual verification on physical iOS + Android devices before submission

### Active — Milestone 2 (captured for roadmap visibility)

<!-- Milestone 2 — "Roles & Moderation". Separate future milestone/release. Captured here per user request so the roadmap shows both. -->

- [ ] Formal three-role system: `admin` / `moderator` / `user` (replaces M1 hardcoded email gate)
- [ ] Moderator can: approve listings, flag/remove content, edit any user's listing
- [ ] Admin can: all moderator actions + edit Matterport/panoramic URLs + set verification badges + promote-to-moderator + add new admins + full backend access
- [ ] Role-aware UI gating across CreateListing, PropertyDetails, and any other surfaces that expose restricted actions
- [ ] Admin-facing UIs for moderation queue and role promotion
- [ ] Backend changes to make `userType` trustworthy (custom claims, authenticated role source)

### Out of Scope

- **2GIS native map bridge** — Significant separate milestone; decision + plan captured in `2GIS_BRIDGE_PLAN.md`. Not required for v1.0.4 polish release.
- **Payment/booking for hospitality** — Hospitality listings are showcase-only by design. Hostels/hotels have daily dynamic pricing the platform cannot reliably track; contact details drive offline booking.
- **Per-night price type for hospitality** — Eliminated because the platform is showcase-only; price fields hidden entirely for Hostel/Hotel.
- **Chat moderation tooling** — M2 moderator scope covers listings only. Chat moderation is a later concern.
- **New authentication providers (OAuth, magic link, 2FA)** — Email/password with reset covers current user base.
- **In-app role promotion UI in M1** — Deferred to M2. M1 uses hardcoded email allowlist; admins are assigned via code edits until the M2 roles system ships.
- **Migration tooling for existing listings** — No production listings exist (confirmed); all current data is mock. Clean slate for the category/type changes.

## Context

**Project stage:** Pre-launch, brownfield. Current public version is 1.0.3 (Android versionCode 24, iOS build 20). No production listings; all content is mock data. Working toward v1.0.4 polish release to app stores.

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
| Split roles into Milestone 2 | Full role system is material work; would delay the store-critical polish release | — Pending |
| Hardcoded admin email allowlist in M1 | Needed to gate Matterport/panoramic URL editing on Hospitality listings before M2 ships real roles; minimal implementation that doesn't block release | — Pending |
| Remove `Land` entirely | User decision — not part of the product's target use cases for Bishkek | — Pending |
| Hospitality (Hostel/Hotel) is showcase-only, no price | Daily dynamic pricing can't be reliably tracked; contact info drives offline booking | — Pending |
| Hospitality listings appear under both Rent and Sell (no price in either) | An owner renting out hostel rooms vs. selling the whole hostel are both valid listing intents | — Pending |
| Hospitality rendered in a separate section on list screens | Different information density (tours-first, no price) warrants visual separation | — Pending |
| Required-field sets branch by category, not individual type | 9 chips → 3 categories is easier to maintain and explain than per-chip conditionals | — Pending |
| Universal keyboard solution, library choice deferred to planner | User wants robustness over any specific library; research phase will pick (likely `react-native-keyboard-controller`, `KeyboardAvoidingView`, or similar) | — Validated 2026-04-23 in Phase 2: chose `react-native-keyboard-controller@1.21.6` + reanimated@4.3.0 + worklets@0.8.1 under Fabric. Key load-bearing findings — (a) v4 Babel plugin is `'react-native-worklets/plugin'`, NOT the legacy `'react-native-reanimated/plugin'` which silently no-ops; (b) library `KeyboardAvoidingView` requires explicit `behavior` prop (has no default — disproves RESEARCH §9 A8); (c) `KeyboardProvider` slots between `SafeAreaProvider` and `ThemeProvider` as the single root-level solution — zero `keyboardVerticalOffset` remains in `src/` |
| Bottom-nav fix starts with reproduction + root-cause, not a guess | Bug location is "unknown — need to investigate"; suspected in `App.tsx` boolean state machine | — Validated 2026-04-22 in Phase 1: root-caused to stale `hideMainStackUnderOverlay` flag + keep-alive screens retaining touch responders; derived overlay state from current overlay rather than storing flag; applied `pointerEvents` belt-and-suspenders |
| 2GIS native map bridge excluded from this milestone | Separate multi-week effort; plan already drafted in `2GIS_BRIDGE_PLAN.md` | — Pending |
| Phase 1 pre-fix device-matrix baseline deferred (accepted risk, 2026-04-22) | User time-constrained; full 45-cell × 2-platform device matrix not feasible before Plan 03 code fix lands. Routes through RESEARCH §9 A6 / §10 Q2 zero-FAIL branch upfront. Plan 04 gate semantics change from "FAILs→0" to "no regression + primary trap sequence visibly fixed"; D-04 pause-and-reassess trigger likelihood is higher. | — Accepted |
| Backend enforcement of admin endpoints (PATCH /properties/:id/verifications, PUT /properties/:id tours/panoramicPhotosUrl writes) — Role Gating Precursor (v1.0.4) Phase 3 | Accepted as known risk — not confirmed by Railway team by release cut. Release proceeds per D-22. Client-side gating (useRole + Gated + D-08 hide-entirely + Plan 04 service-layer canFromUser guard) reduces in-app blast radius but does NOT close raw-HTTP / non-admin-with-valid-Firebase-uid bypass. Rolls into pre-existing CONCERNS.md "Firebase uid used as sole auth" — Phase 3 does NOT regress that posture, only surfaces it. M2 ROLE-04 ships firebase-admin SDK + signed-ID-token verification to close the gap. See `.planning/phases/03-role-gating-precursor/03-BACKEND-COORDINATION.md` (Status: UNCONFIRMED-AT-SHIP) + `03-VERIFICATION.md` GATE-05 outcome section. | — Accepted risk 2026-04-23 (Phase 3) |

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
*Last updated: 2026-04-24 after Phase 4 completion (listing-form-taxonomy-decomposition)*

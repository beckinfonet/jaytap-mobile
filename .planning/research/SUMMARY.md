# Project Research Summary

**Project:** JayTap — M1 Polish + Hospitality / M2 Roles & Moderation
**Domain:** React Native 0.84 (New Architecture + Hermes) brownfield mobile real-estate marketplace
**Researched:** 2026-04-22
**Confidence:** HIGH overall; MEDIUM on bottom-nav root-cause hypothesis (requires reproduction confirmation)

## Executive Summary

JayTap is a brownfield RN 0.84 real-estate app shipping a polish release (v1.0.4) that combines UI bug fixes, a three-category listing taxonomy (Residential / Commercial / Hospitality), and a minimal role gate for admin-curated Hospitality media URLs. The research is unanimous on one sequencing constraint: the bug-fix foundation (bottom-nav reliability + universal keyboard handling) must land before any listing-form work begins. These two workstreams share screens and share the keyboard library — debugging them in parallel makes failures ambiguous. All four research documents agree on this build order, making it the single highest-confidence recommendation in this synthesis.

The recommended library additions are narrow and deliberate. `react-native-keyboard-controller` (v1.21.6) is the only viable cross-platform keyboard solution for RN 0.84 + New Architecture — both the built-in `KeyboardAvoidingView` (broken on Android targetSdk 35+ and New Arch unmount/remount) and the APSL `keyboard-aware-scroll-view` (unmaintained since November 2021) are disqualified. This library requires `react-native-reanimated` as a peer, which is not currently in the JayTap `package.json`. That single transitive dependency is the biggest install-time risk in M1 and must be verified and resolved as the first engineering task. For form state, the architecture research recommends against introducing `react-hook-form`+`zod` in M1 (brownfield ship-ASAP, no prior form-library convention) in favor of `useState` with extracted category-section sub-components and a single `validateByCategory()` source of truth. STACK.md catalogues both options in full; if the listing form migration proves larger than expected, switching to RHF+zod in Phase 3 remains viable.

The two dominant security risks cut across all four research documents and both must be addressed before the milestone closes: (1) client-side role/email-allowlist gating is UX, not security — the Railway backend must independently verify Firebase ID tokens and reject unauthorized writes to Matterport/panoramic URLs regardless of what the client claims; (2) the current architecture sends `x-firebase-uid` as a plain header instead of a verified `Authorization: Bearer <idToken>` — any caller knowing a UID can impersonate that user to the backend. M1 does not need to fix the broader auth transport, but it must confirm that the specific admin-only endpoints (`PATCH /properties/:id/verifications`, `/tours`) reject non-admin requests server-side. Without that confirmation, the M1 admin gate is cosmetic.

---

## Key Findings

### Recommended Stack

The existing stack (RN 0.84, React 19, TypeScript 5.8, Hermes, custom `App.tsx` state-machine navigation) is not re-researched. All additions are scoped to the four M1 problems.

**For universal keyboard handling — `react-native-keyboard-controller@1.21.6`:**
The only actively-maintained, New-Arch-compatible, cross-platform keyboard library. `KeyboardProvider` goes at the root (inside `SafeAreaProvider`, outside all domain providers). Screens use `KeyboardAwareScrollView` as a drop-in for any screen with `TextInput` in a scroll context. Requires `react-native-reanimated` (verify in `package.json` before planning — likely absent, 1-2 hours of install setup if so). Full rebuild required on both platforms after installation; Metro-only hot reload will not pick up native modules.

**For conditional form validation — `useState` + extracted sub-components (M1 default); `react-hook-form@7.73.1` + `zod@^3.24` (viable alternative if scope allows):**
The architecture research explicitly recommends staying with the codebase's `useState` convention for M1. If RHF+zod are adopted, the critical constraint is `zod@^3.24` — zod v4 has an open bug (colinhacks/zod#4989) that prevents form submission with RHF on React Native. Do not use zod v4 under any circumstances until that bug is resolved.

**For role gating — zero libraries; a single `useRole()` hook:**
No role library is warranted for 3 roles and ~5 gated actions. The hook shape must be designed for M2 forward-compat from day one: call sites use `can(action)` not `isAdmin`, so the M2 migration swaps the hook's internals without touching consumers.

**Core technology additions:**

| Technology | Version | Purpose |
|------------|---------|---------|
| `react-native-keyboard-controller` | 1.21.6 | Universal keyboard overlap fix — `KeyboardProvider` + `KeyboardAwareScrollView` |
| `react-native-reanimated` | `>=3.0.0` (peer) | Required peer for keyboard-controller; install first if absent |
| `react-hook-form` | 7.73.1 | Form state + conditional required-field validation (M1 optional, M2+ recommended) |
| `zod` | `^3.24` (NOT v4) | Schema for category-branched required fields; discriminated union on `propertyCategory` |
| `@hookform/resolvers` | latest 3.x | RHF + Zod bridge (only if RHF is adopted) |

See `.planning/research/STACK.md` for full version compatibility matrix and installation order.

---

### Expected Features

The three-category listing taxonomy (Residential / Commercial / Hospitality) is the structural core of M1. Every other M1 feature depends on it being in place first.

**Must have — M1 table stakes:**
- Three-category taxonomy (Residential / Commercial / Hospitality) — gates all category-branched behavior; must land first in M1
- Remove `Land` from chips, filters, i18n tables, type definitions (do it atomically — grep confirms zero `propertyType.land` references remain)
- Category-branched required fields: Residential = bedrooms/bathrooms/area/price; Commercial = area/sub-type/price; Hospitality = rooms/bathrooms/amenities/contact — no price in either Rent or Sell mode
- Hospitality amenities multi-select with 12-item curated taxonomy (WiFi, AC, heating, kitchen, breakfast, parking, 24h reception, laundry, hot water, common area, lockers, en-suite)
- Separate Hospitality section on Home / Favorites / OwnerListings as a horizontal FlatList via `ListHeaderComponent`
- `PropertyDetailsScreen` renders Hospitality: no price, tours-first, contact-method quick actions (WhatsApp/Telegram/phone) promoted visibly
- Hardcoded admin email allowlist (`src/constants/adminAllowlist.ts`) gates Matterport URL + panoramic URL inputs via `useRole().can('editVerifications')` — single source of truth, consumed only through the hook

**Should have — M1 differentiators:**
- Admin trust badge "Curated 3D tour" on Hospitality cards (LOW cost, extends existing `PlatformVerifications`)
- Price-unit field for Commercial listings (total / per-m2-per-month — common in post-Soviet markets)
- WhatsApp/Telegram deep-link quick-action buttons on Hospitality detail pages (infrastructure already present in `Info.plist`; just surface in UI)

**Must have — M2 (next milestone):**
- Formal three-role system (admin / moderator / user) with server-side trust: Firebase custom claims set via Railway backend Admin SDK
- Listing approval lifecycle: `pending → live → rejected` with rejection reason surfaced to owner
- Moderation queue screen (admin + moderator only)
- Flag/report listing flow
- Moderator edit-on-behalf-of (reuse `CreateListingScreen` with `isModerating` flag)
- `AuthContext.refreshProfile()` to propagate role changes without logout
- Backend token verification middleware (`Authorization: Bearer <idToken>` replacing `x-firebase-uid` header)

**Defer to v2+:**
- Per-room listings for hostels (anti-feature for showcase-only model)
- Automated/AI content moderation
- Per-permission matrix beyond coarse 3-role model
- Chat moderation tooling
- Booking calendar / per-night pricing for Hospitality (explicit anti-feature — destroys trust with stale data)

See `.planning/research/FEATURES.md` for full competitor analysis and prioritization matrix.

---

### Architecture Approach

Preserve the `App.tsx` state machine, the nested Context stack, and the `display:none` keep-alive pattern verbatim. Add exactly three new seams: a `KeyboardProvider` at the root of the provider tree, a pure `useRole()` hook over `AuthContext` (no new Provider), and a `useCategory(propertyType)` domain helper. Extract `CreateListingScreen.tsx` (currently 1300 LOC) into category sub-components. Render Hospitality as `ListHeaderComponent` on list screens, not `SectionList`.

**Updated provider tree:**

```
SafeAreaProvider
└── KeyboardProvider         (NEW — must be outermost; installs one native listener covering all keep-alive screens)
    └── ThemeProvider
        └── LanguageProvider
            └── AuthProvider
                └── AppContent  (navigation state machine — shape unchanged)
```

**Major components:**

1. `KeyboardProvider` (root) — single native keyboard listener; all `KeyboardAwareScrollView` instances in keep-alive screens share it safely (library scopes to the focused input)
2. `useRole()` hook (`src/hooks/useRole.ts`) — derives `role: 'admin'|'moderator'|'user'|'guest'` with priority: M2 custom claims → existing `backendProfile.userType` → M1 email allowlist → guest; exposes `can(action)` for M1→M2 forward-compat
3. `<Gated action="…">` component (`src/components/Gated.tsx`) — declarative UI guard; renders `null` when `can(action)` is false; makes gated surfaces greppable
4. `CreateListingForm/` sub-components — `BasicInfoSection`, `ResidentialSection`, `CommercialSection`, `HospitalitySection`, `PriceSection`, `MediaSection`, `VerificationSection`; single `validators.ts` owns the category-to-required-field map
5. `HospitalitySection` component — horizontal `FlatList` rendered via `ListHeaderComponent` on Home / Favorites / OwnerListings; returns `null` when empty
6. `HospitalityCard` component — tour-first variant of `PropertyCard`; no price; rooms + amenities summary line

**Bottom-nav bug — four candidate causes ranked by probability:**
- C1 (highest): `hideMainStackUnderOverlay` state flag goes stale on overlay teardown → main stack stays `display:none` → taps fall through. Fix: derive it (`useMemo`) from the other show-flags rather than storing it.
- C2 (high): Back-handler's 23-dependency `useEffect` creates stale closures that capture tab taps. Fix: ref-based handler, single `addEventListener` at mount.
- C3 (medium): Absolute-positioned overlay wrapper captures touches silently. Fix: `pointerEvents="box-none"` on all wrapper `View`s not intended to receive input.
- C4 (lower): Keep-alive touchables stop firing `onPress` over time. Fix: `removeClippedSubviews={true}` + bounded keep-alive lifetime.

The `display:none` + `pointerEvents="none"` belt-and-suspenders fix (C3) should be applied universally regardless of which cause proves primary — it costs nothing and prevents this class of bug recurring on any new screen added in M2.

See `.planning/research/ARCHITECTURE.md` for full component boundaries, data-flow diagrams, and anti-patterns specific to this codebase.

---

### Critical Pitfalls

1. **Patching `BottomNavigator.tsx` instead of the `App.tsx` state machine** — The nav component is where the symptom appears, not where the bug lives. A partial fix reduces repro rate from 100% to 80% and ships a trap. Require zero-repro across all 32+ state×tab transition combinations before marking this done. Log `hideMainStackUnderOverlay` first; if it stays `false` after overlay close, derive it instead of storing it.

2. **`react-native-reanimated` install as an afterthought** — keyboard-controller silently no-ops without Reanimated. If Reanimated is not already in `package.json` (verify before planning begins), installing it requires: npm install, Babel plugin as the LAST entry in `babel.config.js`, `pod install`, and full clean builds on both platforms. Budget 1-2 hours. Missing this blocks all keyboard work.

3. **Client-only admin gating without backend verification** — The Matterport/panoramic URL restriction is UX if the Railway backend accepts PATCH requests from any authenticated user. Confirm with the backend team that admin-only endpoints verify the Firebase `idToken` and reject non-admin UIDs before M1 ships. This is a coordination task, not a code task, but it is release-blocking from a security standpoint.

4. **Category-change data loss in the listing form** — Resetting form state on category change silently destroys user-entered data. Never destroy state on category change; filter the submit payload by the active category's required-field set at submission time only. One `listingCategorySchema.ts` file owns the mapping — validation, rendering, and payload filtering all read from it.

5. **iOS Privacy Manifest mismatch + Xcode 26 SDK requirement blocking store submission** — `PrivacyInfo.xcprivacy` has an empty `NSPrivacyCollectedDataTypes` array despite collecting email, name, phone, photos, and location. App Store Connect's automated scanner will reject the submission. Additionally, as of April 2026 all new iOS submissions require the iOS 26 SDK (Xcode 26). Both blockers can be caught in Phase 6 release prep if the checklist is thorough, but the privacy manifest audit should start at the beginning of Phase 6, not the end.

---

## Implications for Roadmap

All four research documents agree on a 6-phase structure with the same ordering rationale: fix what is broken before building what is new, and nail the role API shape before using it.

### Phase 1: Nav Reliability (Bottom-Nav Bug Fix)

**Rationale:** The bottom-nav bug is the highest-risk unknown in M1. Its root cause is unconfirmed and the reproduction matrix spans 32+ state×tab transitions. Fixing it first means all subsequent QA has a reliable navigation surface. This phase also applies the `pointerEvents="none"` belt-and-suspenders fix globally, which protects M2 from the same class of bug on new screens.

**Delivers:** Bottom-nav responds correctly from every screen; `hideMainStackUnderOverlay` derived not stored; back-handler refactored to ref-based pattern; all keep-alive screens wrapped with `pointerEvents={isVisible ? 'auto' : 'none'}`; video-recorded 32+ transition matrix showing zero regressions.

**Addresses:** PITFALLS Pitfall 1 (symptom-patch trap), Pitfall 3 (`display:none` touch capture)

**Research flag:** HIGH — root cause is unknown before reproduction. Phase spec must include a diagnostic-first step with explicit go/no-go decision points for each candidate cause (C1 → C2 → C3 → C4).

---

### Phase 2: Universal Keyboard Handling

**Rationale:** Keyboard fixes depend on stable navigation (keyboard issues on a flaky-nav screen produce ambiguous failures). Reanimated install is the biggest install-time risk in M1 and must be resolved before any screen work begins. Installing and validating the library at its own phase boundary contains the blast radius.

**Delivers:** `react-native-reanimated` installed and verified; `react-native-keyboard-controller@1.21.6` installed; `KeyboardProvider` at root of `App.tsx` provider tree; `KeyboardAwareScrollView` adopted on all input-bearing screens (auth, chat, listing form, schedule viewing, account settings); keyboard no longer covers inputs on iOS or Android in any orientation or modal context.

**Uses:** `react-native-keyboard-controller@1.21.6`, `react-native-reanimated` (peer)

**Addresses:** PITFALLS Pitfall 2 (per-screen KAV as "universal" fix)

**Research flag:** MEDIUM — library is well-documented and actively maintained, but RN 0.84 compatibility relies on `+`-semantics peer range and active maintainer engagement rather than an explicit 0.84 matrix entry. Physical device testing on both platforms is mandatory exit criteria.

---

### Phase 3: Listing Form Overhaul

**Rationale:** This is the largest M1 feature workstream and it depends on both Phase 1 (stable nav for QA) and Phase 2 (keyboard library installed, since `CreateListingScreen` is its biggest consumer). It can begin development in parallel with Phase 2 but must not merge until Phase 2's `KeyboardAwareScrollView` adoption is verified.

**Delivers:** `Land` property type removed atomically (types, chips, filters, i18n EN+RU in one commit); three-category taxonomy (Residential / Commercial / Hospitality) with `useCategory()` helper; `CreateListingScreen.tsx` decomposed into `CreateListingForm/` sub-components; single `validators.ts` source of truth for category-to-required-field map; category-branched rendering (sections mounted/unmounted, never CSS-hidden); price field hidden for Hospitality in both Rent and Sell modes; `VerificationSection` admin-gated via `<Gated action="editVerifications">`.

**Addresses:** PITFALLS Pitfall 4 (category-change data loss), i18n drift on Land removal

**Research flag:** LOW-MEDIUM — category branching and sub-component decomposition are well-understood patterns. Main risk is i18n key fan-out (EN+RU parity check required at merge) and ensuring the submit payload filters stale category fields correctly.

---

### Phase 4: Role Gating Precursor

**Rationale:** `useRole()` and `<Gated>` are consumed in Phase 3's `VerificationSection`, but the hook itself is a small standalone unit with zero UI and zero user-visible change. Building it cleanly as its own phase, before it is consumed, ensures the M1→M2 forward-compat contract is locked before call sites accumulate. This phase also includes the backend coordination checkpoint.

**Delivers:** `src/hooks/useRole.ts` with `can(action)` API; `src/constants/adminAllowlist.ts` with lowercased email comparison; `<Gated>` component; all three existing `userType === 'admin'` call sites migrated to `can(action)`; M2 migration `// TODO(M2)` comment at allowlist definition; confirmed with Railway backend team that admin-only endpoints reject non-admin requests server-side.

**Addresses:** PITFALLS Pitfall 5 (allowlist VCS leakage and backend enforcement gap); cross-cutting theme: backend verification is the real security boundary; cross-cutting theme: M1→M2 forward-compat `useRole()`/`can(action)` API shape

**Research flag:** LOW (client implementation) / HIGH (backend coordination) — the hook is a ~30-line pure function. The release-blocking risk is the backend verification confirmation. If backend cannot enforce this by M1 ship, that must be flagged as an explicit accepted risk, not silently left unaddressed.

---

### Phase 5: Hospitality Section on List Screens + PropertyDetails Adaptation

**Rationale:** Largely additive and low-risk, but needs the category taxonomy from Phase 3 before `useCategory()` filtering can be applied to list data. Can run as a parallel track with Phase 4 if resourcing allows.

**Delivers:** `HospitalitySection` component with horizontal `FlatList`; `HospitalityCard` component (tour-first, no price); `ListHeaderComponent` integration on Home / Favorites / OwnerListings; `PropertyDetailsScreen` renders Hospitality without price, 3D tour and panoramic media prominent, contact quick-actions (WhatsApp/Telegram/phone) surfaced; i18n keys `home.hospitalitySection`, `hospitalityCard.rooms`, `hospitalityCard.amenities` in EN+RU.

**Research flag:** LOW — `ListHeaderComponent` + horizontal `FlatList` is a standard RN pattern; heterogeneous cell rendering handled cleanly by not using `SectionList`.

---

### Phase 6: Release Prep + Store Submission

**Rationale:** Release prep is not a version bump. At least 6 distinct categories of submission blocker require dedicated time. Budget a minimum of 2 days. Start the iOS Privacy Manifest audit at the beginning of this phase, not the end, because manifest fixes may require rebuild cycles.

**Delivers:** `PrivacyInfo.xcprivacy` populated with all collected data types and Required Reason API entries; Xcode 26 / iOS 26 SDK confirmed on build machine; version numbers consistent across `package.json`, `android/app/build.gradle`, `ios/JayTap.xcodeproj/project.pbxproj` (1.0.4, versionCode 25, CURRENT_PROJECT_VERSION 21); App Store Connect App Privacy responses match manifest; `applinks:bizdinkonush.com` entitlement reviewed (remove if domain lapsed); Google Maps Android key restrictions confirmed in Cloud Console; readiness docs updated; App Store Connect screenshots refreshed to show Hospitality UI; demo account credentials in review notes; manual QA pass on physical iOS + Android devices (not simulators).

**Addresses:** PITFALLS Pitfall 6 (privacy manifest rejection), release checklist drift documented in CONCERNS.md

**Research flag:** MEDIUM — Apple's April 2026 iOS 26 SDK mandate is confirmed from multiple 2026-current sources. Privacy manifest audit is well-documented. Main uncertainty is whether any third-party library added during M1 introduces additional Required Reason API usage that must be declared.

---

### Phase Ordering Rationale

- **Build order is load-bearing (all four docs agree).** Nav bug fix precedes keyboard fix because keyboard debugging on unreliable navigation produces ambiguous failures. Both precede listing-form work because the listing form is the primary consumer of both fixes.
- **Role primitive before form UI that consumes it.** Phase 4 can begin mid-Phase 3 since the hook takes hours to write, but it must merge before `VerificationSection` is enabled.
- **Hospitality section on list screens (Phase 5) is the most independent workstream.** It depends only on the category taxonomy from Phase 3, not on nav or keyboard fixes. Can run in parallel if resourcing allows.
- **Release prep is its own phase, not a task in the last feature phase.** Privacy manifest, Xcode SDK, and entitlement checks have non-trivial remediation tails that can consume 1-3 days if a blocker surfaces.

### Research Flags

**Phases requiring deeper research or careful diagnosis during planning:**

- **Phase 1 (Nav):** HIGH flag — root cause is unconfirmed; phase plan must specify the C1→C2→C3→C4 diagnostic sequence as explicit steps with go/no-go gates, not "investigate and fix."
- **Phase 2 (Keyboard):** MEDIUM flag — `react-native-keyboard-controller` + RN 0.84 New Arch compatibility is MEDIUM-HIGH confidence (maintainer-engaged but no explicit 0.84 matrix entry). Physical device testing is the only true validator.
- **Phase 6 (Release):** MEDIUM flag — iOS 26 SDK requirement is a process/toolchain dependency external to the codebase. Verify build machine Xcode version before writing the phase plan.

**Phases with well-established patterns (skip research phase):**

- **Phase 3 (Listing form):** Sub-component decomposition + category-branched rendering is a standard React pattern. Schema source-of-truth approach is well-documented.
- **Phase 4 (Role gating):** `useRole()` hook pattern is canonical React RBAC. Backend coordination is a communication task, not a research task.
- **Phase 5 (Hospitality section):** `ListHeaderComponent` + horizontal `FlatList` is well-documented standard RN.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Library choices verified against official docs, GitHub releases, and active maintainer engagement. One MEDIUM-HIGH exception: explicit RN 0.84 compatibility entry for keyboard-controller is absent; mitigated by `+` peer semantics and active 0.83.x maintenance. |
| Features | MEDIUM-HIGH | Required-field contracts for Residential/Commercial confirmed from multiple portals. Hospitality amenity taxonomy derived from Schema.org + Airbnb/Booking. Role system patterns well-sourced from Firebase docs. Minor gap: Rightmove's exact required-field spec is not machine-readable; industry convention used. |
| Architecture | HIGH (placement decisions) / MEDIUM (bottom-nav root cause) | Provider placement, role hook pattern, and FlatList section pattern confirmed from official docs and canonical React patterns. Bottom-nav root cause (C1 hypothesis) matches codebase symptoms precisely but must be verified by reproduction — research explicitly flags this. |
| Pitfalls | HIGH | Store submission pitfalls sourced from 2026-current Apple/Google guidance. Keyboard ecosystem pitfalls sourced from official RN issue tracker and KC docs. Nav and form pitfalls sourced directly from the existing codebase map. |

**Overall confidence:** HIGH

### Gaps to Address

- **Reanimated presence in `package.json`:** Must be checked before Phase 2 planning. If absent, Phase 2's timeline expands by 1-2 hours and the install order (Reanimated before keyboard-controller) must be explicit in the phase plan.
- **Bottom-nav root cause:** Remains a hypothesis (C1: stale `hideMainStackUnderOverlay`) until reproduction confirms it. Phase 1 must be planned with diagnostic steps, not a predetermined fix.
- **Backend admin endpoint enforcement:** Whether the Railway backend currently rejects non-admin `PATCH /properties/:id/verifications` requests is unknown from the mobile codebase alone. Must be confirmed with the backend team in Phase 4. If it does not, the scope of Phase 4 expands to include a backend change.
- **Xcode version on build machine:** The April 2026 iOS 26 SDK submission requirement is confirmed, but whether the current Xcode installation satisfies it is unknown. Must be checked before Phase 6 begins — not the day of submission.
- **`LayoutAnimation` global flag in `HomeScreen.tsx:20-23`:** CONCERNS.md flags this as a latent conflict with Fabric/New Arch. May manifest as animation jank during keyboard transitions in Phase 2. If it does, fix is replacing it with Reanimated layout animations (which Phase 2 installs anyway).

---

## Sources

### Primary (HIGH confidence)

- `.planning/research/STACK.md` — library selection rationale, version pins, RN 0.84 New Arch compatibility matrix
- `.planning/research/FEATURES.md` — category required-field contracts, hospitality amenity taxonomy, moderation lifecycle patterns, role assignment patterns
- `.planning/research/ARCHITECTURE.md` — provider tree placement, bottom-nav bug candidates, role hook shape, sub-component decomposition, FlatList section pattern
- `.planning/research/PITFALLS.md` — ranked pitfalls mapped to phases, store submission checklist, security mistakes, technical debt patterns
- `.planning/PROJECT.md` — M1/M2 scope, constraints, out-of-scope decisions, key decisions log
- `.planning/codebase/` — full codebase map (ARCHITECTURE, STACK, CONCERNS, INTEGRATIONS, CONVENTIONS) providing the brownfield context all research is grounded in
- [react-native-keyboard-controller compatibility docs](https://kirillzyusko.github.io/react-native-keyboard-controller/docs/guides/compatibility)
- [Firebase custom claims documentation](https://firebase.google.com/docs/auth/admin/custom-claims)
- [React Navigation Issue #12824](https://github.com/react-navigation/react-navigation/issues/12824) — confirms `display:none` touch-capture failure mode
- [Apple Privacy Manifest Files official docs](https://developer.apple.com/documentation/bundleresources/privacy-manifest-files)

### Secondary (MEDIUM confidence)

- [colinhacks/zod#4989](https://github.com/colinhacks/zod/issues/4989) — zod v4 + RHF + React Native submit failure; v3 workaround confirmed
- [keyboard-controller issue #1411](https://github.com/kirillzyusko/react-native-keyboard-controller/issues/1411) — active RN 0.83.x maintainer engagement
- [Forge: Top 10 App Store Rejection Reasons in 2026](https://forgeasc.com/blog/app-store-rejection-reasons) — iOS 26 SDK requirement
- [Oso — How to Build RBAC](https://www.osohq.com/learn/rbac-role-based-access-control) — coarse roles vs. fine-grained permissions guidance
- Schema.org `LodgingBusiness.amenityFeature` — hospitality amenity taxonomy
- [CommercialSearch](https://www.commercialsearch.com/) / [CBRE](https://www.cbre.com/properties) — commercial required-field conventions
- [OLX Trust Group](https://www.olxgroup.com/trust/) — marketplace moderation patterns

### Tertiary (LOW confidence, validation required)

- [Formisch 2026 form library comparison](https://formisch.dev/blog/react-form-library-comparison/) — RHF vs. Formik relative performance on RN; single source, directionally consistent with other evidence
- Rightmove required-field list — no machine-readable public spec; industry convention inferred from portal survey

---

*Research completed: 2026-04-22*
*Ready for roadmap: yes*

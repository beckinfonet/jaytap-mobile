# Project Milestones: JayTap

## v1.0.4 M1 "Polish + Hospitality" (Shipped: 2026-04-28)

**Delivered:** Polish release for JayTap (RN 0.84 / iOS + Android) — shipped fixes for nav reliability and universal keyboard handling, role-gating precursor over an admin-email allowlist, three-category listing form (Residential / Commercial / Hospitality with Land removed), and Hospitality (Hostel/Hotel) tour-first rendering across the app.

**Phases completed:** 1–8 (42 plans total — 7 phases executed + Phase 7 SKIPPED with zero plans per PROJECT.md Key Decisions row 129)

**Key accomplishments:**

- Phase 1: Nav reliability bug root-caused + fixed (`pointerEvents` belt-and-suspenders + `OVERLAY_FLAGS` derivation refactor in `App.tsx`). Reproduction matrix recorded; 5 ROADMAP success criteria PASS.
- Phase 2: Universal keyboard solved at root via `react-native-keyboard-controller@1.21.6` + `reanimated@4.3.0` + `worklets@0.8.1` under Fabric. `KeyboardProvider` slots between `SafeAreaProvider` and `ThemeProvider`; KASV on 7 screens; library KAV with `behavior="padding"` on 2 chat screens. 22/22 matrix cells PASS on physical iPhone 15 Pro Max + Moto G XT2513V.
- Phase 3: `useRole()` / `can(action)` / `<Gated>` abstraction shipped over hardcoded email allowlist. `PropertyService.patchPlatformVerifications` `canFromUser` guard; CreateListingScreen + PropertyDetailsScreen + ProfileScreen migrations; D-14 4-part grep-invariant CI gate (`scripts/check-role-grep.sh`); 15/15 jest GREEN. Forward-compatible with M2 server-verified roles. GATE-05 backend enforcement via D-22 Path B accepted-risk (closes via M2 ROLE-04).
- Phase 4: Listing form decomposed `CreateListingScreen.tsx` 1404→871 LOC (−37%) into 7 `CreateListingForm/` sub-components. `Land` removed atomically (verified by `scripts/check-land-removed.sh`); Hostel + Hotel added under new `Hospitality` category; `propertyTypeToCategory()` derived single source of truth. EN+RU parity at 365 keys via `Record<TranslationKeys,string>` tsc gate + `scripts/check-i18n-parity.sh`.
- Phase 5: Pure `validateByCategory()` + `buildPayloadByCategory()` single source of truth for category-branched required fields. 16 inline error rows across 5 sub-components; 14 EN+RU validation/status keys; orchestrator integration with scroll-to-first-error + D-11 hybrid contact + D-16 draft/publish toggle.
- Phase 6: `HospitalitySection` + `HospitalityCard` mounted via `ListHeaderComponent` on Home + Favorites + RenterListings + OwnerListings. Tour-first `PropertyDetailsScreen` Hospitality branches (price omitted, sticky 3-button contact bar, amenity chip grid replaces features). 12-amenity taxonomy EN+RU. 80-cell QA matrix walked APPROVED on iPhone 15 Pro / iOS 26 + Moto G XT2513V / Android 16.
- Phase 7 SKIPPED — user confirmed no alignment issues stood out during Phase 1–6 device QA. ALIGN-01/02 satisfied implicitly.
- Phase 8: Atomic v1.0.4 bump (`de4ff0a`); 138-cell physical-device QA matrix walked APPROVED (136 PASS / 0 FAIL across both devices); bilingual EN+RU release notes drafted (EN 465 / RU 454 chars, both within Play Console's 500-char binding limit); iOS archive uploaded to ASC under Xcode 26.4 (build 17E192) and available in TestFlight; Android `.aab` uploaded to Play Console under existing keystore, submitted/processing.

**Stats:**

- 8 phases, 42 plans, 35 v1 requirements (33 complete + 2 descoped per Phase 8 D-13)
- 232 commits in M1 active phase (2026-04-22 → 2026-04-28); 342 commits project lifetime
- ~6 days from M1 active development start (2026-04-22) to ship (2026-04-28); project repo started 2026-02-03
- iOS shipped at `1.0.4 build 22` (TestFlight); Android shipped at `1.0.28 versionCode 28` (Play Console)
- Toolchain: Xcode 26.4 / Build 17E192; React Native 0.84.0 New Architecture (Fabric + Hermes both platforms)

**Out-of-band record:** commit `63f3b72 feat: add Task file and update versioning for Android and iOS` (out-of-band, ahead of archive) bumped iOS `CURRENT_PROJECT_VERSION` 21 → 22, Android `versionCode` 25 → 28, Android `versionName` "1.0.24" → "1.0.28" — bumps were Play Console rejection-driven (versionCode 25 already used). Bumps effectively executed Plan 08-05 Task 1's conditional D-03 bump retroactively. Both stores accepted post-bump identifiers without `ITMS-90060` collision or Play Console signature/version-code rejection. Documented as Deviation 1 in `.planning/milestones/v1.0.4-phases/08-release-and-store-submission/08-VERIFICATION.md` Section H.

**Descoped (Phase 8 D-13 inheritance from v1.0.3 production):**

- REL-03 — Privacy manifest expansion (`ios/JayTap/PrivacyInfo.xcprivacy`). Re-open conditions: Apple flags missing `NSPrivacyCollectedDataTypes` at a future submission, OR a future phase introduces a new data-collecting SDK or authentication provider.
- REL-04 — Xcode 26 / iOS 26 SDK gate. Cleared 2026-04-28; re-open if Apple deprecates Xcode 26.4 / iOS 26 SDK.

**Known deferred items:** None gating M1. Post-ship todos carried forward (ASC review state advance + Play Console review state advance + GATE-05 backend coordination + M2 promotion of backlog 999.1 + D-02 baseline correction lesson) tracked in `.planning/STATE.md` § Deferred Items.

**Git range:** `d8223b7` (roadmap commit) → `31db51f` (Phase 8 close-out at archive time)

**What's next:** M2 "Roles & Moderation" — formal three-role system (admin/moderator/user), listing moderation lifecycle (pending/live/rejected/archived), moderator edit-on-behalf, admin UIs, owner-side moderation UX. To be planned via /gsd-new-milestone.

---

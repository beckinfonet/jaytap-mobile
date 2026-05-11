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

## v2.0 M2 "Roles & Moderation" (Shipped: 2026-05-05)

**Delivered:** Full three-role permission system (admin / moderator / user) backed by MongoDB as role authority + Railway-side JWKS verification (no Firebase SDK in either repo); 4-state listing lifecycle (`pending` / `live` / `rejected` / `archived`) replacing M1's instant-publish model; moderation queue UI + approve/reject/edit-on-behalf actions with race-condition coverage; owner-side rejection banners (per-session + persistent); archive lifecycle for owners + mods/admins with post-rejection-bypass prevention; admin role-management UI with last-admin lockout + self-mutation prevention + audit trail; landlord application gate (Phase 4.5 inserted); 4-bug hotfix bundle (HF-01 Hospitality field persistence + HF-02 secret rotation + HF-03 firebaseUid mass-assignment close + HF-04 socket.io JWKS handshake).

**Phases completed:** 1–6 (47 plans total) + Phase 4.5 inserted out-of-roadmap on 2026-04-30.

**Key accomplishments:**

- **Phase 1: Backend Role Foundation + Auth Migration + Hotfix Bundle (13 plans).** Shared `firebase.js` JWKS singleton via `jose.createRemoteJWKSet`; `verifyFirebaseToken` middleware (TDD 9-case golden token matrix + `requireMinRole`); 5-service auth migration (auth, property, favorite, chat, appointment) collapsing 5 inline auth blocks; HF-03 firebaseUid-spoof close + HF-04 `io.use()` socket handshake; production Mongo migration (`renter|owner|agent` → canonical 3-role enum); RN client `apiClient.ts` (Bearer + 401/403 single-flight); `AuthContext.refreshRole()` + sticky `RoleRefreshBanner`; `useRole.ts` allowlist branch + `adminAllowlist.ts` deletion as the LAST step (Pitfall 5). M1 GATE-05 D-22 Path B accepted-risk row CLOSED. Backend tests 0 → 67.
- **Phase 2: Listing Lifecycle Status Field Absorption (9 plans).** `Property.status` enum cutover dropping `'draft'` + adding `'rejected'` + `'archived'`; default flips to `'pending'`; 9-field audit schema; role-aware route filters; POST/PUT body-status sanitizer + edit-resubmit auto-flip; 4-tab segmented control on RenterListingsScreen with per-tab Hospitality + per-tab empty states; `<StatusPill>` + `<RejectionBanner>` + `<HomeRejectionBanner>` (auto-dismiss + tap-to-rejected-tab); AppState role-refresh hook with 60s cooldown.
- **Phase 3: Moderation Queue + Actions + Edit-on-Behalf (6 plans).** `/api/moderation/*` 4-handler backend (queue + approve + reject + edit-on-behalf) all race-safe via atomic `findOneAndUpdate` (loser → 409 ALREADY_MODERATED); `ModerationLog` audit model + `serviceAreas` config; 19 EN+RU `moderation.*` keys; `useRole.viewModerationQueue` + 5 PropertyService methods with belt-and-suspenders guards; reusable `<RejectListingModal>`; `ModerationQueueScreen` overlay; PropertyDetailsScreen mod-action footer + 409 race UX; `CreateListingScreen` `moderatorContext` prop; `App.tsx` full wireup with `<PropertyDetailsHost>` extraction. 18-case backend supertest harness covering MOD-15 race (Promise.all) + actorUid anti-spoofing per memory `gsd-verifier-misses-regressions.md`. Backend tests 67 → 85.
- **Phase 4: Archive Lifecycle (Owner + Mod/Admin) (7 plans).** `<ArchiveListingModal>` forked from `<RejectListingModal>`; 4 PropertyService archive methods; `useRole.ts` Action union extended with archive + hard-delete; backend race-safe atomic archive/unarchive routes with D-13 two-condition gate (blocks owner from restoring mod-archived listings — closes post-rejection-bypass attack); D-15 selective field clears; D-18 full pre-delete snapshot in audit row; `requireMinRole('admin')` middleware on DELETE /:id + Pitfall 2 inline ownership block deletion. Manual physical-device matrix walked APPROVED on iPhone 15 Pro Max (11/11 PASS). Backend tests 85 → 106.
- **Phase 4.5: Landlord Application Workflow (INSERTED 2026-04-30).** `User.canListProperties` capability flag; `LandlordApplication` + audit-log models; 5 endpoints (submit / get-mine / withdraw / admin-queue / admin-decide); `LandlordApplicationScreen` form + `LandlordApplicationStatusBanner` on Profile + `LandlordApplicationQueueScreen` admin overlay; `requireListingCapability` middleware on `POST /properties`; one-time `migrate-landlord-capability.js` auto-grants existing self-listers; ~50 EN+RU strings.
- **Phase 5: Admin Role Management UI (5 plans).** `RoleChangeLog` Mongoose model (append-only audit) + `adminRoutes.js` under `/api/admin` with router-level admin gate; `GET /api/admin/users?query` + `PATCH /api/admin/users/:uid/role`; ADMIN-04 self-mutation prevention (403 SELF_MUTATION) + ADMIN-03 race-safe last-admin lockout (preflight + Promise.all post-write rollback); `roleRevokedAt` bumped on demotion only (Pitfall 3 — promotion does NOT force re-login); 17/17 backend supertest cases GREEN. RN client `<RoleManagementScreen>` overlay + `<RoleChangeModal>` (3-chip user/moderator/admin) + 23 EN+RU `admin.roles.*` keys. Paired gates clear (UAT 11p+1s, REVIEW all_fixed, SECURITY 27/27, VALIDATION nyquist_compliant).
- **Phase 6: Hardening + Manual Physical-Device QA + Release (7 plans).** Wave-1 query-first artifacts: `06-STORE-HISTORY` derived iOS 27 + Android 30 from max(local, store)+1 per M1 D-02 lesson; `06-INHERITANCE-AUDIT` 7/7 INHERIT dispositions; `06-RELEASE-NOTES` EN 403 / RU 409 chars under Play Console's 500-char binding limit; `06-BACKEND-DEPLOY` backend live at SHA `2fb5639` with all Railway env vars present + Mongo password rotated + AWS IAM PARTIAL documented + `firebase-admin` confirmed absent. Wave-2 atomic v2.0.0 bump (commit `95b13c1`; preceded by `aa6f659` D-14 retro-fix restoring Phase-3 role-grep CI gate). Wave-3 manual physical-device QA matrix walked APPROVED on iPhone 15 Pro Max + Moto G XT2513V — 74 PASS / 3 PARTIAL / 5 DEFERRED-USER-APPROVED / 0 FAIL across 7 matrices / 82 cells. All 4 hotfix-bundle items verified end-to-end. Wave-4 v2.0.0 submitted to ASC TestFlight Internal Testing (build 27) + Play Console Internal Testing (versionCode 30); EN+RU release notes pasted in both stores; M1 D-13 inheritance descope honored (7/7 INHERITED). Per M1 D-12: TestFlight Internal + Play Console Internal Testing visibility = phase-exit.

**Stats:**

- 6 phases (+ Phase 4.5 inserted), 47 plans, 51 v1 requirements
- 203 commits in M2 active phase (`bc5e028` 2026-04-29 → `6448960` 2026-05-05); 54 feat commits
- Diff: 207 files changed, 61,531 insertions, 2,324 deletions
- TS/TSX in `src/` + `App.tsx`: 22,800 LOC (post-M2)
- Timeline: 7 days from milestone start (2026-04-29) to ship (2026-05-05)
- iOS shipped at `2.0.0 build 27` (TestFlight Internal Testing); Android shipped at `2.0.0 versionCode 30` (Play Console Internal Testing)
- Toolchain: Xcode 26.4 / Build 17E192; RN 0.84.0 New Architecture (Fabric + Hermes both platforms); backend Node ≥22.12 (jose@6 ESM-only)
- Backend test suite growth: 0 → 106 passing across 6 suites

**Out-of-roadmap insertion:** Phase 4.5 (Landlord Application Workflow) was inserted between Phases 4 and 5 on 2026-04-30 to close a UX gap surfaced during Phase 4 device QA. Documented in `.planning/milestones/v2.0-ROADMAP.md` for traceability.

**Known deferred items at close: 15** (see `.planning/STATE.md` § Deferred Items and `.planning/milestones/v2.0-ROADMAP.md` § Known Gaps at Close). Breakdown: 2 audit-open (Phase 03 UAT + VERIFICATION artifact bookkeeping; behaviors re-validated by Phase 6 QA matrix) + 13 REQUIREMENTS.md checkbox drift (1 material — ROLE-11 frontend popup-hang 403 recovery — captured in `phase06-m3-carry-forward.md`; 12 stale-bookkeeping with phase artifacts substantively closing them).

**Genuine M3 carry-forwards (per memory `phase06-m3-carry-forward.md`):**

1. ROLE-11 frontend mid-action 403 recovery UX (popup loading-state hangs on demote-mid-action).
2. Race-cell test rig (cells 1.7 + 2.4–2.6 + 5.6 DEFERRED-USER-APPROVED + cell 5.3 mismatch path).
3. Android `clean bundleRelease` reanimated prefab gotcha — document in `scripts/release-android.md`.
4. AWS IAM cross-project residual — re-open when other project unblocks scoping the OLD shared IAM user's policy away from the JayTap bucket ARN.
5. Phase 4.5 landlord application uid-mismatch bug.

**Git range:** `bc5e028` (milestone start commit 2026-04-29) → `6448960` (Phase 6 close-out + ship commit 2026-05-05).

**What's next:** M3 — contextual forms and UI for new listing creation. The 999.1 Backlog entry (Contextual listing creation flow — 6-step conditional UI) anchors M3 scope; planning to start via /gsd-new-milestone immediately after this archive lands.

---

## v3.0 M3 "Contextual Forms" (Shipped: 2026-05-11)

**Delivered:** Replaced M1's single-screen `CreateListingScreen` with a 6-step `<ContextualListingFlow>` where every screen and every field is determined by previous answers (deal type × property type × admin toggles); reshaped the `Property` Mongoose schema from M2's flat shape to a nested shape (`location.*` / `basics.*` / `conditionAndAmenities.*` / `content.*` / `terms.*` / `media.*`) via operator-supervised one-shot migration; inverted the media flow so users submit metadata only while admin/mod uploads photos / videos / 3D-tour URL post-submission via a new mod media-curation surface (publish blocked by backend `MEDIA_REQUIRED` 400 until ≥1 photo); closed two M2 carry-forward UX/data-integrity bugs (CARRY-01 ROLE-11 frontend mid-action 403 popup-recovery via shared `useModActionGuard` hook + 11 handler wires; CARRY-02 Phase 4.5 landlord-application uid-mismatch via JWKS-verified-uid route fix + anti-spoofing grep gate + idempotent repair migration); plus 4 MEDIUM-severity Phase-3 review polish items (MD-01 i18n key split + MD-02 moderationRoutes comment + MD-03 INVALID_ID pre-check + MD-04 sentinel regex tightening). Backend Location dictionary (City + District models) seeded with 11 KG/KZ/UZ cities + 19 Bishkek districts forward-fit for KG+KZ+UZ market expansion.

**Phases completed:** 1–5 (34 unique plan files; Plan 02-04 was split into 02-04a + 02-04b during planning, counted once).

**Key accomplishments:**

- **Phase 1: Schema Reshape + Backend Route Shape Cutover (5 plans).** `Property` Mongoose schema reshape to nested structure (`location.*` / `basics.*` / `conditionAndAmenities.*` / `content.*` / `terms.*` / `media.*`); M2 status enum + 11 audit fields preserved at top level. Operator-supervised one-shot `migrate-listings-m3.js` with `--dry-run` + `--verify=PASS` + idempotent semantics matches M2 Plan 02-02 pattern. Backend route read/write cutover lands AFTER migration runs successfully; rollback procedure documented in `01-CONTEXT.md §Rollback`. RN client `src/types/Property.ts` type-stub written per Claude Discretion #3. 4 operator UAT items rolled into Phase 5 REL-03 per D-06.
- **Phase 2: 6-Step Contextual Listing Flow (Client) (10 plans).** New `<ContextualListingFlow>` 6-step UI replaced `CreateListingScreen.tsx` atomically; per-step `validateStep()` single-source-of-truth; conditional sub-fields per property type; mod edit-on-behalf wired via M2 `moderatorContext` prop. Backend Location dictionary shipped in Plan 02-01 (City + District models + locationRoutes.js + moderationRoutes.js extension + seed-locations-m3.js); ContextualListingFlow ships react-native-maps draggable Marker with tap-to-move fallback per Pitfall 1; KGS/USD/EUR per D-03 (no $/сом legacy); orchestrator-side propertyType + dealType reflow per ROADMAP SC#3 + SC#4. Plan 02-09 closing artifact: 3 atomic commits — deleted 13 files / 3449 LOC (`CreateListingScreen.tsx` 996 LOC + `CreateListingForm/` barrel 11 files / 2453 LOC); created `src/screens/AdminVerificationScreen.tsx` (preserves admin doc-verification surface as standalone, zero CreateListingForm dependency); removed 82 of 83 `createListing.*` i18n keys in lockstep en.ts + ru.ts. Sentinel `scripts/check-create-listing-screen-removed.sh` exits 0. 94/94 ContextualListingFlow tests pass.
- **Phase 3: Media Flow Inversion (Admin/Mod Curation) (7 plans).** Backend: shared `s3Upload` factory + new POST/DELETE `/api/moderation/listings/:id/media` endpoints (race-safe `$push`/`$pull` + `ModerationLog` `'media-upload'` audit) + `MEDIA_REQUIRED` 400 gate at `/approve` AND edit-on-behalf flip; multer stripped from user-side `propertyRoutes.js` (D-13 atomic-break — D-14 reinterpreted as API-surface removal per memory `aws-iam-jaytap-prod-s3.md`); 4 sentinel scripts chained into `npm test` (anti-spoofing + media-stripped + i18n-parity + create-listing-removed). RN client: new `MediaCurationScreen` overlay (959 LOC, 0 hex literals) + `MediaCurationService` + `NeedsMediaBanner` component + 3-chip mod-queue filter row + W2 conditional row-tap + Approve disabled-state on 3 surfaces (D-12) + 32 EN+RU i18n keys per locale + 2 new theme tokens (`onAccent`, `scrim`) + 9 RTL tests. Paired-gate: 1 HIGH HG-01 fixed inline `c16ac9b` (hooks above mod-role gate); 4 MEDIUM deferred to Phase 4; 0 CRITICAL. Backend tests 258/258; RN client 386/4 (4 pre-existing M2-baseline failures preserved).
- **Phase 4: M2 Carry-Forward Bug Fixes (5 plans).** CARRY-01 closed via shared `useModActionGuard` hook + `is403PermissionError(err)` matcher + 11 mod-action submit handlers wired (4 ModerationQueueScreen + 5 PropertyDetailsScreen + 2 RoleManagementScreen incl. runSearch refactor) through `onPermissionDenied = resetLoading + closeModal + refreshRole`; bespoke `Alert.alert + onBack` dropped from RoleManagementScreen; canonical RTL smoke 2/2 pass. CARRY-02 closed via JWKS-verified-uid route fix (anti-spoofing sentinel `check-no-landlord-uid-spoofing.sh` chained into npm test between actoruid and media-stripped; 3 D-08 supertest cases) + diagnostic console.log block deletion (D-06) + idempotent repair migration `migrate-landlord-app-uid-mismatch.js` (258 LOC; --dry-run + --verify=PASS) + 10-case Envelope-B test (4 unit + 6 spawn-integration) + LandlordApplication.status += 'orphaned' + LandlordApplicationAuditLog.action += 'uid-repair' / 'uid-orphan-mark'. Phase-3 MEDIUM polish: MD-02 comment fix + MD-03 INVALID_ID 400 pre-check on DELETE /listings/:id/media + MD-04 sentinel regex tightening + MD-01 i18n key split (`error.tooLarge` per-file vs `error.tooManyFiles` per-upload). Paired-gates cleared (commit `ee55421`); 12/14 truths verified + 2 device walks deferred to Phase 5.
- **Phase 5: Hardening + Manual Physical-Device QA + Release v3.0.0 (7 plans).** Wave-1 query-first artifacts: `05-PREFLIGHT` walked GREEN-WITH-DEVIATIONS across 14 sections (backend live at Railway SHA `5bf23fe`; firebase-admin absent; AWS IAM PARTIAL; 2 D-03 deviations operator-approved; 2 M3 backlog items surfaced); `05-STORE-HISTORY` derived iOS 28 + Android 31 from max(local, store)+1 via Path B web-UI user-relay; `05-RELEASE-NOTES` EN 489 / RU 492 chars under Play Console 500-char limit (region-neutral per memory `geographic-scope.md`). Wave-2 atomic v3.0.0 bump (commit `531e279`) — 5 surgical edits across 3 files; 10/10 grep assertions PASS; build-identity-consistent. Wave-3 manual physical-device QA matrix walked APPROVED-WITH-MASS-DISPOSITION on iPhone 15 Pro Max + Moto G XT2513V — 2 cells walked-and-confirmed iOS [1.3 + 2.5] + 67 mass-disposition via logical-equivalence + 4 DEFERRED-USER-APPROVED M2 precedent; 3 walk-regression fix commits landed inline (`a3ba754` PropertyService JSON body + `a3625e7` editAsModerator JSON body + `4240e64` mod banner uid-leak); FAIL=0 PARTIAL=0. Wave-4 paired-gate YELLOW verdict (verifier PARTIAL on REL-03 Path B + reviewer GREEN 0 CRITICAL/HIGH + 7/7 INHERITED via byte-for-byte identical package.json vs v2.0.0 baseline `95b13c1`). Wave-5 dual-store submission: ASC TestFlight Internal build 29 / iOS 3.0.0 + Play Console Internal Testing versionCode 32 / Android 3.0.1; iOS reactive build bump 28→29 (commit `3044de4`); Android reactive bump versionCode 31→32 + versionName 3.0.0→3.0.1 (Play Console rejected versionCode 31, M1 D-02 pattern fires again); reanimated prefab workaround applied per memory `android-reanimated-clean-prefab-gotcha.md`; both stores processing.

**Stats:**

- 5 phases, 34 plans, 38 v1 requirements (all 38 strictly `[x]` at close)
- 134 commits in M3 active phase (`d885366` 2026-05-05 → `031131c` 2026-05-10/11); range spans 6 days
- Diff: 174 files changed, 48,711 insertions, 4,175 deletions
- TS/TSX in `src/` + `App.tsx`: 27,882 LOC (post-M3) vs 22,800 LOC (post-M2) — +5,082 LOC
- Timeline: 6 days from milestone start (2026-05-05) to ship (2026-05-11)
- iOS shipped at `3.0.0 build 29` (TestFlight Internal Testing); Android shipped at `3.0.1 versionCode 32` (Play Console Internal Testing) — Android marketing-version drift due to Play Console rejecting versionCode 31 (M1 D-02 pattern firing twice now)
- Toolchain: Xcode 26.4 / Build 17E192; RN 0.84.0 New Architecture (Fabric + Hermes both platforms); backend Node ≥22.12 (jose@6 ESM-only)
- Backend test suite growth: 106 → 273 passing (post-M3 backend)

**Out-of-roadmap insertion:** None this milestone (cf. M2 Phase 4.5).

**Known deferred items at close: 7 M4 carry-forward items** (see `.planning/milestones/v3.0-ROADMAP.md` § Known Gaps at Close): race-cell test rig (carried from M2 close), Android `clean bundleRelease` reanimated prefab gotcha runbook, AWS IAM cross-project residual, CARRY-01 banner-latency device walk, CARRY-02 live Atlas uid-match device walk, `JayTap-orphan-data-cleanup`, `ATLAS-CRED-ROTATION`. 24 deferred device walks were absorbed by Plan 05-05 mass-disposition (Path B logical-equivalence) and Plan 05-06 7/7 inheritance audit — NOT carry-forward gaps.

**Patterns firing twice (RETROSPECTIVE.md key lessons):**

1. **M1 D-02 pattern fires again** — Play Console rejected Android versionCode 31; reactive bump to versionCode 32 + versionName 3.0.0→3.0.1. Memory `release-android-versioncode-trust-play-console.md` now captures the pattern firing M1 + M3. M4 backlog item: pre-archive Wave-0 must query Play Console + TestFlight for highest-accepted version-code per track BEFORE setting baseline.
2. **`gsd-verifier-misses-regressions` paired-gates discipline carries forward** — Plan 05-06 YELLOW verdict (verifier PARTIAL + reviewer GREEN) confirmed the M2-established pattern; verifier alone would have flagged REL-03 Path B as a blocker; pairing with reviewer caught the byte-for-byte 7/7 inheritance signal that turned PARTIAL into a clean ship.

**Git range:** `d885366` (milestone start commit 2026-05-05 00:55 PDT) → `031131c` (Phase 5 close-out + ship commit 2026-05-10 20:17 PDT).

**What's next:** M4 — to be planned via `/gsd-new-milestone`. Open questions for M4 scoping: (a) which of the 7 M4 carry-forward items are blocking vs nice-to-have, (b) what new v1 reqs M4 should add (current candidates from FUTURE Requirements: KZT + UZS currencies for KG+KZ+UZ expansion, multi-language localization beyond EN+RU, 2GIS native map bridge, full audit log UI, push notifications, bulk moderation actions, real-estate document verification).

---

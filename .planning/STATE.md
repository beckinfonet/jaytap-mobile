---
gsd_state_version: 1.0
milestone: v3.0
milestone_name: "Contextual Forms"
status: shipped
last_updated: "2026-05-15T21:15:00Z"
last_activity: "2026-05-15 — Executed quick task 260515-iqi: email verification at sign-up (soft banner) + Firebase deliverability runbook. AuthService gains :sendOobCode VERIFY_EMAIL + :lookup REST helpers; AuthContext sends the verification email best-effort after sign-up (a send failure never blocks sign-up) and exposes emailVerified + resendVerificationEmail + recheckEmailVerified (stale-token recovery via refreshIdToken then re-lookup); new soft dismissible EmailVerifyBanner mounted beside RoleRefreshBanner; 5 EN/RU auth.verifyEmail.* keys. The spam-folder half was triaged WITH the user as a Firebase Console/DNS config issue (NOT a code defect) → committed runbook scripts/firebase-email-deliverability.md (template customization → custom domain → custom SMTP + SPF/DKIM/DMARC). No new deps (REST-only, no Firebase SDK). 14/14 new tests + i18n parity green; zero new tsc errors. Code merged to main (merge 0712bca). On-device QA (Task 5 blocking checkpoint) PASSED — user-approved 2026-05-15 on iPhone 15 Pro Max. One QA fix: EmailVerifyBanner rendered behind the iOS status bar (mounted at App.tsx root outside any SafeAreaView) → top safe-area inset added (5a600c9); sibling RoleRefreshBanner had the identical latent bug, fixed too (ae44170). Also pruned stale agent worktrees + hardened jest to skip .claude/worktrees (25d3aca). Quick task 260515-iqi complete."
resume_marker: "M3 milestone closed — run /gsd-new-milestone to scope M4. Candidate v1 requirements + 7 M4 carry-forward items listed in PROJECT.md § 'Current Milestone: M4 (planning pending)'."
progress:
  total_phases: 5
  completed_phases: 5
  total_plans: 34
  completed_plans: 34
  percent: 100
---

# STATE: JayTap

## Project Reference

See: `.planning/PROJECT.md` (updated 2026-05-11 after v3.0 milestone)

**Core value:** Prospective renters and buyers can reliably browse, filter, and inquire about Bishkek (and KG/KZ/UZ expansion markets) properties on a phone without UI blockers (keyboard covering inputs, navigation getting stuck, forms requesting wrong fields for the property type).

**Current focus:** Planning M4 (no milestone scoped yet — run `/gsd-new-milestone`).

## Current Position

**Milestone:** M3 v3.0 "Contextual Forms" — ✅ SHIPPED 2026-05-11
**Phase:** None (no active phase; M3 closed)
**Plan:** N/A

**How to resume work:**

1. Run `/gsd-new-milestone` to scope M4. Candidate v1 requirements + 7 M4 carry-forward items are listed in `PROJECT.md § "Current Milestone: M4 (planning pending)"`.
2. If a smaller out-of-milestone fix is needed before M4 is scoped, use `/gsd-quick` or `/gsd-insert-phase` (decimal-numbered M3.x carrying the latest milestone label).

## Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 260511-cog | Edit-on-behalf field-only cutover (M3 post-ship hotfix) — PUT /api/moderation/listings/:id stops force-flipping status to 'live', MEDIA_REQUIRED gate consolidated to /approve only. Backend 275/275 green; cross-repo (backend 84016d4 + frontend 01ed067). | 2026-05-11 | 9182a63 | [260511-cog-edit-on-behalf-field-only-cutover-m3-pos](./quick/260511-cog-edit-on-behalf-field-only-cutover-m3-pos/) |
| 260514-rk1 | Photo-required approval gate parity — Moderation Queue row-tap unified to PropertyDetailsScreen so the existing NeedsMediaBanner + disabled Approve fires for zero-photo listings on every entry path. On-device repro surfaced JSX z-order bug (queue overlay stacked above details, hiding the gate); resolved via keep-alive display:'none' under selectedProperty / isContextualListingFlowOpen / isMediaCurationOpen — queue scroll position + filter chips + list cache preserved through the side-trip. Routing fix c2bc982; UX hotfixes 6dd58ef → 2901deb. ModerationQueueScreen suite 15/15 green. | 2026-05-15 | 2901deb | [260514-rk1-apply-photo-required-approval-gate-to-mo](./quick/260514-rk1-apply-photo-required-approval-gate-to-mo/) |
| 260515-djv | Zoomable full-screen property photos — installed react-native-gesture-handler@2.31.2 + @likashefqet/react-native-image-zoom@4.3.0, mounted GestureHandlerRootView at the app root, wrapped each full-screen photo in ImageZoom (pinch / double-tap / pan 1x–5x) with scrollEnabled={!isPhotoZoomed} coordinating swipe-paging vs zoom-pan. Also added a missing onScroll index-sync handler to the full-screen FlatList (pagination indicator never updated on swipe) + Jest mocks for the new native dep. Hospitality listings inherit via shared PropertyDetailsScreen. NOTE: original react-native-awesome-gallery pick swapped — every version pins reanimated@^3.2.0, incompatible with the project's 4.3.1. Code merged (23fe2c8 + 7d976d1). On-device QA (Task 3 blocking checkpoint) passed on iPhone 15 Pro Max + Moto G XT2513V — user-approved 2026-05-15. | 2026-05-15 | e5840df | [260515-djv-user-cannot-zoom-in-to-the-images](./quick/260515-djv-user-cannot-zoom-in-to-the-images/) |
| 260515-iqi | Email verification at sign-up (soft banner) + Firebase deliverability runbook. Reported as one issue ("no email verification; password-recovery email lands in spam"); triaged WITH the user into two deliverables. **A (code):** AuthService `:sendOobCode` VERIFY_EMAIL + `:lookup` REST helpers; AuthContext sends the verification email best-effort after sign-up (a send failure never blocks sign-up) and exposes `emailVerified` + `resendVerificationEmail` + `recheckEmailVerified` (stale-token recovery via `refreshIdToken` then re-lookup, so the banner never sticks); new soft dismissible `EmailVerifyBanner` mounted beside RoleRefreshBanner; 5 EN/RU `auth.verifyEmail.*` keys. No hard gate — existing unverified accounts keep working. **B (docs):** the spam-folder half is a Firebase Console/DNS config issue, NOT a code defect (`sendPasswordResetEmail` already calls the correct endpoint) → committed runbook `scripts/firebase-email-deliverability.md` (template customization → custom domain → custom SMTP + SPF/DKIM/DMARC; covers both the reset and verification emails). No new deps (REST-only, no Firebase SDK). 14/14 new tests + i18n parity green; zero new tsc errors (3 pre-existing `App.tsx` `Property.tours` errors untouched). On-device QA (Task 5 blocking checkpoint) PASSED — user-approved 2026-05-15 on iPhone 15 Pro Max. One QA fix: banner rendered behind the iOS status bar → top safe-area inset added (5a600c9; sibling RoleRefreshBanner had the same latent bug, fixed in ae44170). | 2026-05-15 | 0712bca | [260515-iqi-add-email-verification-at-sign-up-soft-b](./quick/260515-iqi-add-email-verification-at-sign-up-soft-b/) |

## Shipped State (M3 v3.0.x)

- **iOS:** `3.0.0` build 29 in App Store Connect TestFlight Internal Testing (processing)
- **Android:** `3.0.1` versionCode 32 in Google Play Console Internal Testing (processing — Android marketing-version drift from iOS due to Play Console rejecting versionCode 31; M1 D-02 pattern firing twice now per memory `release-android-versioncode-trust-play-console.md`)
- **Backend:** Railway live at SHA `5bf23fe`; 273/273 backend tests passing across 7 suites; `firebase-admin` confirmed absent (3rd consecutive milestone)
- **Git tag:** `v3.0`
- **Atlas:** MongoDB password rotation carries forward from M2 HF-02 (`mongo_revoked_at: 2026-04-29T00:00:00Z`)
- **AWS IAM:** PARTIAL — `jaytap-prod-s3` IAM user used exclusively by JayTap runtime; OLD cross-project shared user retains JayTap-bucket policy (cannot delete; other project depends on it). Re-open condition unchanged.

## Deferred Items (M4 carry-forward)

7 items carried forward from M3 close (see `.planning/milestones/v3.0-ROADMAP.md § Known Gaps at Close` for full detail):

| # | Item | Source | Disposition |
|---|------|--------|-------------|
| 1 | Race-cell test rig (coordinated-curl OR Bluetooth-trigger-pair sync) | M2 close (already deferred once); M3 Plan 05-06 audit | M4 candidate (timing-fragile; opt-in based on M4 surface) |
| 2 | Android `clean bundleRelease` reanimated prefab gotcha — release runbook doc | M2 close; M3 Plan 05-07 close (workaround applied again) | M4 candidate (codify `gradlew :react-native-reanimated:assembleRelease :app:bundleRelease` in `scripts/release-android.md` or `bundleReleaseSafe` gradle wrapper) |
| 3 | AWS IAM cross-project residual | M2 Phase 6 REL-05 | Re-open when other project unblocks scoping the OLD shared IAM user away from JayTap bucket ARN |
| 4 | CARRY-01 banner-latency live device walk | M3 Phase 4 Plan 04-04 verification | Opt-in if regressions surface; automatable parts covered via RTL smoke |
| 5 | CARRY-02 live Atlas uid-match device walk | M3 Phase 4 Plan 04-02 verification | Opt-in if regressions surface; supertest proves invariant in 273/273 |
| 6 | `JayTap-orphan-data-cleanup` (drop pre-patch orphan collections) | M3 Plan 05-01 pre-flight surfaced | M4 backlog (non-blocking; data-hygiene) |
| 7 | `ATLAS-CRED-ROTATION` (defense-in-depth password rotation) | M3 Plan 05-01 pre-flight surfaced | M4 backlog (non-blocking; security-posture cycling; last rotation 2026-04-29 per M2 HF-02) |

## Candidate M4 Scope (Future Requirements)

From `.planning/milestones/v3.0-REQUIREMENTS.md § "Future Requirements (M4+ — deferred)"`:

- KZT + UZS currency support — KG+KZ+UZ market expansion (Almaty / Tashkent serviceAreas)
- Multi-language localization beyond EN+RU (KK + UZ if KZ/UZ markets warrant it)
- 2GIS native map bridge — multi-week effort; plan drafted in `2GIS_BRIDGE_PLAN.md`
- Automated/AI moderation (image/text classifiers)
- Full audit log UI (`moderationLog` + `roleChangeLog` data already captured in M2)
- Push notifications / email notifications for moderation events
- Bulk moderation actions (multi-select approve/reject)
- Real-estate document verification (Avito-style ownership proof — multi-month compliance subproject)

## Conventions Carried Forward (CLAUDE.md + memory)

- **No Firebase SDK** in either repo (RN client OR backend) — REPO RULE per memory `no-firebase-sdk.md`. Backend uses `jose` for JWKS verification.
- **No `react-navigation` migration** — custom `App.tsx` state machine stays.
- **MongoDB `userType` is the role authority** — Firebase ID token proves uid only.
- **EN+RU bilingual parity** required for every new UI string (CI gate `scripts/check-i18n-parity.sh`).
- **Manual physical-device QA** on iPhone 15 Pro Max + Moto G XT2513V (M3 also accepts empirical-sampling-mass-disposition for feature-surface milestones — see RETROSPECTIVE.md M3 lesson 4).
- **Sentinel chain in backend `npm test`:** `actoruid` → `landlord-uid` → `media-stripped` → `i18n-parity` → `create-listing-screen-removed` → jest.
- **M1 D-02 pattern (Android versionCode rejection):** pre-archive Wave-0 query Play Console + TestFlight for highest-accepted version-code per track. Fired twice (M1 + M3); M4 must also re-query at submission time.
- **Geographic scope:** KG launch market (Bishkek). KZ + UZ expansion remains M4+ — KZT + UZS currencies deferred.
- **Backend repo location:** `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services` (same maintainer as RN client). Backend Node ≥22.12 (`nvm use 24` before backend npm/node ops; jose@6 ESM-only).

---

*STATE.md reset at v3.0 milestone close 2026-05-11. Prior in-flight session content + accreted execution history archived implicitly in git history (see `git log --oneline` for granular activity, or `.planning/milestones/v3.0-phases/05-hardening-manual-qa-release-v3/05-CONTEXT.md` for the end-of-phase session snapshot).*

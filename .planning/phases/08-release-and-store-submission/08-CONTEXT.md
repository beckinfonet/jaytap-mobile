# Phase 8: Release & Store Submission - Context

**Gathered:** 2026-04-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Ship JayTap **v1.0.4** as an **update submission** on top of the live v1.0.3 build that is currently in production on both stores. The apps are already approved with their existing privacy declarations, applinks entitlement, Maps key configuration, and ASC App Privacy responses; this phase does NOT re-audit or change live-and-accepted store metadata. It does:

1. **Bump the user-facing version** in the two files that gate App Store ingestion of a fresh binary.
2. **Walk a physical-device regression** across the M1 changes (keyboard, nav, listing categories, role-gated fields) and fix anything that surfaces.
3. **Author EN + RU release notes** describing the M1 polish + Hospitality launch.
4. **Build, archive, and submit** to App Store Connect + Google Play Console.

**Critical scope correction (recorded 2026-04-28 mid-discussion):** The original ROADMAP for Phase 8 (REL-03 privacy manifest population, REL-04 Xcode 26 SDK gate, success-criterion-6 applinks cleanup + Maps key restriction audit, success-criterion-5 ASC App Privacy reconciliation) was scoped under the assumption that v1.0.4 would be a first-time submission. **It is not.** v1.0.3 is live, was reviewed and accepted by both stores, has live ASC App Privacy answers, and has the existing entitlement / manifest / Maps configuration in production. Re-touching those items would be churn without a defect to fix. They are descoped to "satisfied by v1.0.3 production state" — see `<deferred>`.

**Out of scope (belongs elsewhere):**

- Privacy manifest expansion (REL-03 descoped — see deferred D-13).
- applinks entitlement cleanup, Maps key restriction audit, ASC App Privacy re-answering (success criterion 6 + 5 descoped — see deferred D-13).
- Xcode 26 SDK migration (REL-04 already cleared on 2026-04-28 per PROJECT.md row 129; verification-only at archive time — see D-04).
- Roles & moderation (M2 — ROLE-* / MOD-* / ADMIN-* requirements).
- Per-night pricing for Hospitality, booking calendars, payment integration (PROJECT.md Out of Scope — locked).
- 2GIS native map bridge (separate milestone — `2GIS_BRIDGE_PLAN.md`).
- Backend GATE-05 enforcement (D-22 Path B accepted-risk in Phase 3 — does not block release; M2 ROLE-04 closes it).
- Visual alignment fixes from screenshots (Phase 7 — SKIPPED 2026-04-28 with zero plans).
- New feature work (Hospitality, keyboard, nav, role gating, listing form, validation are all delivered in Phase 1–6; this phase only ships them).

</domain>

<decisions>
## Implementation Decisions

### Version metadata — REL-01 + REL-02

- **D-01:** Two version-string edits required. Both must land before archive:
  - `package.json` `"version"`: `"1.0.3"` → `"1.0.4"` (REL-01).
  - `ios/JayTap.xcodeproj/project.pbxproj` `MARKETING_VERSION`: `1.0.3` → `1.0.4`. The string appears 2× in pbxproj (Debug + Release configs); both must be updated. (REL-02 iOS marketing.)

- **D-02:** Three version values are **already at v1.0.4 target** — verification-only, no edit:
  - `ios/JayTap.xcodeproj/project.pbxproj` `CURRENT_PROJECT_VERSION = 21` (v1.0.3 shipped at iOS build 20 per PROJECT.md "Context"; pbxproj is now at 21, the v1.0.4 target). Appears 2×.
  - `android/app/build.gradle` `versionCode 25` (v1.0.3 shipped at versionCode 24; gradle now at 25).
  - `android/app/build.gradle` `versionName "1.0.24"` (per PROJECT.md "Constraints" + STATE.md — clean baseline confirmed 2026-04-28; the project convention uses Play-Console-specific format that diverges from marketing 1.0.4 by design, established in earlier releases).

- **D-03:** Build-number conflict guard — if any v1.0.4 archive has already been uploaded to TestFlight under `CURRENT_PROJECT_VERSION = 21`, the next archive must bump to 22 (Apple rejects duplicate build numbers within the same MARKETING_VERSION). Plan should include a TestFlight history check before archiving, and a fallback bump task that runs only if a duplicate is detected. Default expectation: 21 is unused for v1.0.4 and the archive proceeds without bump.

- **D-04:** Xcode toolchain verification at archive time — `xcodebuild -version` must show **Xcode 26.x** (REL-04). Already cleared per PROJECT.md Key Decisions row 129 (Xcode 26.4 / build 17E192 confirmed on user's machine 2026-04-28). Plan task is a one-shot version assertion, not a migration.

- **D-05:** Acceptance criteria for the bump task use `grep` literals — no Phase-4-style CI gate is added for ongoing drift detection (drift would only matter at the next release, not in steady state):
  - `grep '"version": "1.0.4"' package.json` exits 0
  - `grep -c 'MARKETING_VERSION = 1.0.4' ios/JayTap.xcodeproj/project.pbxproj` returns 2
  - `grep 'CURRENT_PROJECT_VERSION = 21' ios/JayTap.xcodeproj/project.pbxproj` exits 0 (verify-only)
  - `grep 'versionCode 25' android/app/build.gradle` exits 0 (verify-only)
  - `grep 'versionName "1.0.24"' android/app/build.gradle` exits 0 (verify-only)
  - `xcodebuild -version | grep '^Xcode 26'` exits 0

### Manual regression QA — REL-05

- **D-06:** Test bar = manual physical-device QA (CLAUDE.md M1 testing convention). Devices = iPhone 15 Pro Max / iOS 26 + Moto G XT2513V / Android 16 (Fabric). Same matrix used through Phase 1–6 — no new device acquisition.

- **D-07:** Coverage scope — bounded smoke walk (NOT a full re-walk of every Phase 1–6 cell):
  - **Keyboard handling** — open every input-bearing screen (Login, Signup, ForgotPassword, ResetPassword, ChatThread, ChatCompose, ChatScreen, AccountSettings, CreateListing both branches, ScheduleViewing) and verify the focused TextInput stays above the keyboard. One pass per device. Phase 2's 22-cell matrix is the reference template, not the required scope.
  - **Bottom-nav transitions** — from each main-stack screen, tap each tab and confirm response. From inside an overlay (PropertyDetails, CreateListing, RenterListings, Tour3D), close the overlay and confirm tabs respond. Spot-walk.
  - **Listing categories** — Create + Edit + View one Residential, one Commercial, one Hospitality listing each on each device. Verify field branching (Phase 5 D-13/14/15) + Hospitality strip rendering + tour-first PropertyDetailsScreen branch (Phase 6 D-13–D-16).
  - **Role gating** — Login as admin allowlist email → Matterport URL field visible on Create/Edit; verification edits succeed. Login as non-admin email → fields hidden, edits blocked. One round per device.

- **D-08:** Bug-fix loop — anything that surfaces during regression is fixed in-phase. The regression matrix is the bug-fix surfacing mechanism for v1.0.4; this is what "M1 polish ship-ready" means in practice. Fixes commit atomically; the QA matrix re-walks the affected scenario on both devices before phase exit. New defects beyond the smoke walk's scope (e.g., a long-tail issue surfaced by a tester not covered above) go to backlog (`999.x`) unless the user flags them as release-blocking.

- **D-09:** QA matrix scaffold lives at `.planning/phases/08-release-and-store-submission/08-QA-MATRIX.md` (planner creates from the Phase 1/2/6 templates). Phase exits when both devices PASS all matrix cells. Verifier outcome at `08-VERIFICATION.md`.

### Release notes — REL-06

- **D-10:** Release notes are bilingual **EN + RU** (mandatory per PROJECT.md Constraints + project convention through Phase 1–6). Content covers, in this order:
  1. **What's new:** Hospitality category (Hostel + Hotel) with tour-first cards, 3D tour discovery on listings, contact-driven workflow.
  2. **Improvements:** Universal keyboard handling on all input screens; reliable bottom navigation across all overlays; redesigned listing form with three categories (Residential / Commercial / Hospitality).
  3. **Bug fixes:** Anything that surfaces during regression QA per D-08.

- **D-11:** Release notes are submission artifacts only — pasted into ASC + Play Console at submission time. Not preserved as a permanent repo file unless the user requests one. ASC supports per-locale notes (EN + RU); Play Console supports per-language listings (EN + RU).

### Submission — REL-06

- **D-12:** Submission flow is **planner discretion** within these constraints:
  - iOS: produce an Xcode archive under Xcode 26.x; upload to App Store Connect. TestFlight Internal Testing pass before pushing to App Store production review is recommended but not blocking.
  - Android: produce a release `.aab` under the existing keystore; upload to Play Console. Internal Testing track pass before promoting to production is recommended but not blocking.
  - **No new App Privacy questionnaire submission** unless the regression QA surfaces a newly-collected data type that v1.0.3's questionnaire doesn't cover (it shouldn't — Phase 1–6 added no new data types). Scope correction recorded: live ASC + Play privacy declarations from v1.0.3 are the binding declarations; v1.0.4 inherits them.

### Claude's Discretion (not locked — planner / executor decides)

- Wave structure for the phase. Suggested shape:
  - Wave 0 — pre-archive verifications (D-04 Xcode version + D-02/D-05 version-string verify-only assertions).
  - Wave 1 — version bumps (D-01 single atomic commit modifying package.json + project.pbxproj).
  - Wave 2 — physical-device regression QA matrix walk on both devices (D-06–D-09); spawn fix sub-tasks as defects surface (D-08).
  - Wave 3 — release notes authoring (D-10–D-11).
  - Wave 4 — archive + submit (D-12).
- Whether the version bumps land as one commit modifying both files or split per-file. Phase 1–6 convention biases toward one commit when changes share intent.
- Whether to capture the regression QA evidence (screenshots, video clips) in `.planning/phases/08-release-and-store-submission/videos/` (mirrors Phase 1's pattern) or inline in `08-QA-MATRIX.md` cells.
- Whether to author the release notes early (Wave 0 / draft) and refine after QA, or wait for QA to complete before authoring. Planner decides.
- Pre-flight tasks vs. submission tasks for ASC + Play (e.g., screenshots refresh, app preview video update, store listing copy edits) — out of declared M1 scope, but planner may surface them if they're release-blocking. Default: ASC + Play listings are unchanged from v1.0.3.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope + requirements

- `.planning/ROADMAP.md` § "Phase 8: Release & Store Submission" — original goal + success criteria. **Note:** REL-03, REL-04, success-criterion-6 (applinks + Maps), and success-criterion-5 (App Privacy reconciliation) are **descoped per the 2026-04-28 mid-discussion correction** captured in `<deferred>` D-13. Plans must NOT re-introduce them.
- `.planning/REQUIREMENTS.md` REL-01..REL-06 — granular requirements. REL-01, REL-02, REL-05, REL-06 are in-scope. REL-03 + REL-04 are descoped (see D-13).
- `.planning/PROJECT.md` § "Active — Release" + § "Key Decisions" row 129 — Xcode 26.4 confirmation + Phase 7 skip.
- `.planning/STATE.md` § "Phase pipeline" entry 8 — gradle baseline confirmation + privacy manifest gap flag (now descoped).
- `CLAUDE.md` — manual physical-device QA bar, EN+RU parity, atomic commits, "never rewrite navigation".

### Files to modify (small surface)

- `package.json` — version bump per D-01.
- `ios/JayTap.xcodeproj/project.pbxproj` — `MARKETING_VERSION` bump per D-01 (2 occurrences).

### Files to verify only (no edit)

- `ios/JayTap.xcodeproj/project.pbxproj` — `CURRENT_PROJECT_VERSION = 21` is at target (D-02 + D-03 conditional bump if TestFlight conflict).
- `android/app/build.gradle` — `versionCode 25 / versionName "1.0.24"` already at target (D-02).
- `ios/JayTap/PrivacyInfo.xcprivacy` — **DO NOT MODIFY**. Live in production with v1.0.3, accepted by Apple. Descoped per D-13.
- `ios/JayTap/JayTap.entitlements` — **DO NOT MODIFY**. Live in production, both applinks entries shipped under v1.0.3 review. Descoped per D-13.
- `App.tsx:110-163` — Linking deep-link handler, untouched.
- `android/app/src/main/AndroidManifest.xml` — Maps key placeholder, untouched.
- `android/app/build.gradle` — `keystoreProperties['googleMapsApiKey']` consumption, untouched.

### Phase predecessor outputs (regression baselines — read-only)

- `.planning/phases/01-nav-reliability/01-VERIFICATION.md` — Phase 1 nav matrix outcome; defines the "tabs respond from every screen" success state for D-07.
- `.planning/phases/02-universal-keyboard-handling/02-VERIFICATION.md` — Phase 2 22-cell keyboard matrix; reference for D-07 keyboard scope.
- `.planning/phases/03-role-gating-precursor/03-VERIFICATION.md` + `03-BACKEND-COORDINATION.md` — admin allowlist + GATE-05 accepted risk; reference for D-07 role-gating scope.
- `.planning/phases/04-listing-form-taxonomy-decomposition/04-VERIFICATION.md` — three-category form structure; reference for D-07 listing scope.
- `.planning/phases/05-listing-form-validation-edit-flow/05-VERIFICATION.md` — `validateByCategory` + edit-flow correctness; reference for D-07 listing scope.
- `.planning/phases/06-hospitality-rendering/06-VERIFICATION.md` — Phase 6 80-cell hospitality matrix; reference for D-07 Hospitality scope.

### External (informational only — no Phase 8 edits)

- App Store Connect → JayTap → App Privacy section. **Read-only this phase** — answers are inherited from v1.0.3.
- Google Play Console → JayTap → App content / Data safety. **Read-only this phase** — declarations inherited from v1.0.3.
- Google Cloud Console → Maps API key. **Read-only this phase** — restrictions configured for v1.0.3 still apply (no package or keystore change in v1.0.4).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- **Phase 1–6 manual QA matrix templates** — `01-REPRO-MATRIX.md`, `02-MATRIX*.md`, `06-QA-MATRIX.md`. Direct templates for the structure of `08-QA-MATRIX.md` cells (Device × Scenario rows, PASS/FAIL columns, evidence link column).
- **Phase 1 `videos/` directory** — pattern for capturing matrix evidence as device captures. Phase 8 may follow if planner sees value.
- **Phase 2 22-cell keyboard matrix** — defines the universe of input-bearing screens; D-07 uses it as a reference template (smoke walk, not full re-walk).
- **Existing version pattern across files** — pbxproj declares MARKETING_VERSION + CURRENT_PROJECT_VERSION twice (Debug + Release configs); package.json has a single `"version"` key. Bump task is a `sed`-like replacement, atomic per file.

### Established Patterns

- **Atomic commits** with `commit_docs` true (config.json) — phase-scope changes commit as one unit per task. Bias toward one commit for the version bumps since they share intent (D-01).
- **Manual physical-device QA on iPhone 15 Pro Max + Moto G XT2513V** as the test bar — every Phase 1–6 closed via this matrix. Phase 8 inherits without modification.
- **EN + RU locale parity** — applies to release notes per D-10. No source-code i18n keys are added in this phase; release notes are submission text, not in-app strings.
- **Acceptance-criteria assertions favor `grep` + CLI output over heavy test infra** for release-prep tasks. D-05 lists the exact assertions.

### Integration Points

- **2 in-repo files modified, 6 verified-only.** Total surface is small. No new dependencies, no native module changes, no `pod install`, no `npm install`.
- **No source code changes in `src/`** beyond what Phase 8's regression QA may surface (D-08 fix loop). Default expectation: zero source diffs in Phase 8.
- **External infra unchanged from v1.0.3:**
  - Vercel (moveinplatform.com web frontend + AASA static asset).
  - Railway (jaytap-services backend + duplicate AASA route).
  - Apple Developer Portal (provisioning profiles + certificates).
  - App Store Connect listing + privacy answers.
  - Google Play Console listing + Data Safety declarations.
  - Google Cloud Console Maps API key restrictions.

</code_context>

<specifics>
## Specific Ideas

- **The shareable link shape that already works in production:** `https://www.moveinplatform.com/property/{id}` (e.g., `https://www.moveinplatform.com/property/6987ab8b698816d4875ec37a`, surfaced by user during discussion). Universal Links are functional in v1.0.3 with the existing Vercel-hosted AASA file at `https://www.moveinplatform.com/.well-known/apple-app-site-association`. Phase 8 does NOT touch this — the plan must not break it either. If the regression QA in D-07 includes a shared-link scenario (open the link from another app on iPhone, verify JayTap opens at the listing), that's a useful smoke test; planner discretion.

- **v1.0.3 baseline is the binding state for inherited declarations** — App Store Connect App Privacy answers, Play Console Data Safety declarations, Maps key restrictions, applinks entitlement, privacy manifest. Any v1.0.4 change that would invalidate these (e.g., adding a new data-collecting SDK, changing the package name, adding a new applinks domain) must explicitly invoke the corresponding declaration update. Phase 8's M1 changes (Phase 1–6 deliverables) collected NO new data types and added NO new infrastructure — verified by codebase scan + Phase 1–6 verifier outputs — so v1.0.4 inherits the v1.0.3 declarations cleanly.

- **No CI gate added in Phase 8.** Phase 4 added `scripts/check-land-removed.sh` + `scripts/check-i18n-parity.sh`; Phase 3 added `scripts/check-role-grep.sh`. Phase 8 does not add any new gate — the version-string assertions in D-05 are one-shot acceptance checks, not ongoing CI.

</specifics>

<deferred>
## Deferred Ideas

- **D-13 (the descope record):** REL-03 (privacy manifest population), REL-04 SDK gate as ongoing work (already cleared via D-04), success-criterion-6 (applinks cleanup + Maps key restriction audit), success-criterion-5 second half (ASC App Privacy reconciliation) are **all satisfied by v1.0.3 production state**. Reasoning: v1.0.3 is live in App Store + Play Store, ASC App Privacy + Play Data Safety answers are submitted and accepted, applinks + Maps + manifest configuration shipped under v1.0.3 review without rejection. Re-touching live-and-accepted store metadata would be churn without a defect to fix. **Re-open conditions:**
  - Apple flags the privacy manifest at a future submission as missing required `NSPrivacyCollectedDataTypes` entries → re-open REL-03 with the populated declaration captured in the prior CONTEXT.md draft (history available in git: `git log -p .planning/phases/08-release-and-store-submission/08-CONTEXT.md`).
  - Apple deprecates Xcode 26.4 / iOS 26 SDK → re-open REL-04.
  - `bizdinkonush.com` is restored or `moveinplatform.com` lapses → re-open applinks cleanup.
  - Maps key restrictions break (e.g., release keystore SHA-1 changes) → re-open Maps audit.
  - A future phase introduces a new data-collecting SDK or new authentication provider → re-open ASC App Privacy reconciliation.

- **App Privacy questionnaire automation** — currently manual ASC web UI walk. No tooling in repo. Would be valuable post-M1 if release cadence accelerates; out of M1.

- **Universal Links on Android (App Links)** — Android side has no `intent-filter` for `https` deep links to `moveinplatform.com/property/*`. Adding it would require `android:autoVerify="true"` + DAL JSON hosted on the domain. Out of M1 — capture as M2+ candidate.

- **TestFlight external-tester distribution** — D-12 limits to Internal Testing. External-tester TestFlight is out of M1's release checklist; could be considered for M2 if the release cadence justifies it.

- **Permanent release-notes archive** — D-11 keeps release notes as submission artifacts only. If the team finds value in tracking notes per release as repo artifacts, that's a tooling decision for a future milestone.

</deferred>

---

*Phase: 08-release-and-store-submission*
*Context gathered: 2026-04-28*
*Mid-discussion scope correction: applied 2026-04-28 (D-13)*

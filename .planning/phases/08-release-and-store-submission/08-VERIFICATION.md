---
phase: 08-release-and-store-submission
plan: 05
type: phase-verification
created: 2026-04-28
status: passed
disposition: shipped
build_identity_sha_walked: de4ff0a
build_identity_sha_archived: 63f3b72
ios_build_identifier: 1.0.4 build 22
android_build_identifier: 1.0.28 versionCode 28
xcode_toolchain: Xcode 26.4 (Build 17E192)
walk_disposition: APPROVED
walk_pass_count: 136
walk_fail_count: 0
defect_fix_commits: 0
ios_submission_status: in_testflight
android_submission_status: submitted_processing
asc_app_privacy: inherited_from_v1.0.3 (D-13)
play_data_safety: inherited_from_v1.0.3 (D-13)
applinks_entitlement: inherited_from_v1.0.3 (D-13)
privacy_info_xcprivacy: inherited_from_v1.0.3 (D-13)
maps_key_restrictions: inherited_from_v1.0.3 (D-13)
testflight_collision_bump_applied: true
collision_bump_authoring: out-of-band (commit 63f3b72, not via Plan 08-05 Task 1)
requirements_addressed: [REL-01, REL-02, REL-05, REL-06]
requirements_descoped: [REL-03, REL-04]
requirements_descope_authority: D-13 (Phase 8 CONTEXT.md)
plans_executed: [08-01, 08-02, 08-03, 08-04, 08-05]
phases_complete_at_close: 8
milestone_at_close: M1 "Polish + Hospitality" v1.0.4 — closing
---

# Phase 8: Release & Store Submission — Verification

**Plan 08-05 close-out artifact** — phase-exit regression bundle and submission status snapshot. v1.0.4 is an **update submission** atop the live v1.0.3 production binary on both stores; ASC App Privacy answers, Play Data Safety declarations, applinks entitlement, PrivacyInfo.xcprivacy, and Maps key restrictions are all inherited from v1.0.3 per Phase 8 CONTEXT.md decision **D-13**. This artifact records the source-tree state at submission time, the regression-floor signals, the manual-QA outcome from Plan 08-03, the bilingual release notes from Plan 08-04, and both stores' ingestion state. **REL-03** (privacy manifest expansion) and **REL-04** (Xcode 26 SDK gate as ongoing work) are intentionally **DESCOPED** to satisfaction-by-v1.0.3-production-state — re-open conditions documented in Section F below.

---

## Section A — D-05 grep assertions (post-submission source-tree state)

All six D-05 literals re-asserted against working-tree HEAD at phase close. Three values diverge from the original D-02 baseline because an **out-of-band commit `63f3b72`** bumped iOS `CURRENT_PROJECT_VERSION` 21 → 22 and Android `versionCode` 25 → 28 / `versionName` 1.0.24 → 1.0.28 ahead of archive (see Section H — Deviations).

| # | Assertion | Expected (per D-02 / D-05 baseline) | Actual at close | Exit | Status |
|---|-----------|-------------------------------------|-----------------|------|--------|
| 1 | `grep '"version": "1.0.4"' package.json` | exit 0 | `  "version": "1.0.4",` | 0 | PASS |
| 2 | `grep -c 'MARKETING_VERSION = 1.0.4' ios/JayTap.xcodeproj/project.pbxproj` | `2` | `2` | 0 | PASS |
| 3 | `grep 'CURRENT_PROJECT_VERSION = 21' ios/JayTap.xcodeproj/project.pbxproj` | exit 0 (per prompt context) | (no hits — 0 occurrences) | 1 | DEVIATION (recorded) — value bumped to 22 via `63f3b72` |
| 3' | `grep 'CURRENT_PROJECT_VERSION = 22' ios/JayTap.xcodeproj/project.pbxproj` (corollary) | n/a (D-05 didn't cover post-bump 22 case) | 2 hits (Debug + Release) | 0 | PASS — 2 hits as expected for post-bump state |
| 4 | `grep 'versionCode 25' android/app/build.gradle` | exit 0 (per D-02) | (no hits — `versionCode 28` instead) | 1 | DEVIATION (recorded) — value bumped to 28 via `63f3b72` |
| 4' | `grep 'versionCode 28' android/app/build.gradle` (actual state) | n/a | `        versionCode 28` | 0 | PASS for actual shipped state |
| 5 | `grep 'versionName "1.0.24"' android/app/build.gradle` | exit 0 (per D-02) | (no hits — `versionName "1.0.28"` instead) | 1 | DEVIATION (recorded) — value bumped to 1.0.28 via `63f3b72` |
| 5' | `grep 'versionName "1.0.28"' android/app/build.gradle` (actual state) | n/a | `        versionName "1.0.28"` | 0 | PASS for actual shipped state |
| 6 | `xcodebuild -version \| grep '^Xcode 26'` | exit 0 (D-04 / REL-04) | `Xcode 26.4` | 0 | PASS |

**Summary:** 4 assertions PASS at original baseline values (REL-01 marketing version, REL-02 iOS marketing 2-count, D-04 Xcode 26 toolchain). 3 assertions show DEVIATION from prompt-context expectation due to out-of-band commit `63f3b72` which the user authored on 2026-04-28 ahead of archive — actual repo state captured in the corollary `'`-marked rows. The shipped binaries match the actual repo state (build 22 / versionCode 28), not the original prompt-context expectation (build 21 / versionCode 25).

---

## Section B — Phase 3 + Phase 4 CI gates (regression floor)

All three CI scripts re-run on the close-out tree. Continued exit 0 confirms the v1.0.4 source code preserves Phase 3 D-14 role-gating invariant + Phase 4 FORM-01 Land removal + Phase 4 FORM-09 EN+RU i18n parity.

| # | Script | Phase invariant | Exit | Status |
|---|--------|----------------|------|--------|
| 1 | `./scripts/check-role-grep.sh` | Phase 3 D-14 4-part role-gating grep (no inline `userType === 'admin'` outside `useRole.ts`; `backendProfile.userType` reads confined; allowlist identifiers confined; `isAllowlistedAdmin` symbol confined) | 0 | PASS |
| 2 | `./scripts/check-land-removed.sh` | Phase 4 FORM-01 Land-type removal (no `Land` literal in `src/`; `propertyType.land` key removed) | 0 | PASS |
| 3 | `./scripts/check-i18n-parity.sh` | Phase 4 FORM-09 EN+RU key-set parity (`src/locales/en.ts` ↔ `ru.ts` identical key sets) | 0 | PASS |

The continued exit 0 of `check-i18n-parity.sh` is the load-bearing assertion that Plan 08-04's release-notes draft did NOT leak into in-app i18n keys (per D-11 paste-only disposition).

---

## Section C — Manual QA disposition (REL-05)

Per Plan 08-03 Sign-off — quoted from `08-QA-MATRIX.md` and `08-03-SUMMARY.md`:

| Field | Value |
|-------|-------|
| Walk start SHA | `de4ff0a` (Plan 08-02 atomic v1.0.4 bump — `chore(08-02): bump version to 1.0.4 (REL-01 + REL-02 iOS marketing)`) |
| Walk end SHA | `de4ff0a` (no defect-fix commits — APPROVED on first pass; build-identity SHA unchanged) |
| Walk completion | 2026-04-28 |
| Walker | beckprograms@gmail.com (project owner; admin-allowlisted email) |
| iOS device | iPhone 15 Pro Max / iOS 26.x / Hermes + Fabric / Release |
| Android device | Moto G XT2513V / Android 16 / Fabric / Release |
| Disposition | **APPROVED** — D-09 phase-exit unblocked |

**Per-matrix totals (per device):**

| Matrix | iOS PASS | iOS FAIL | iOS N/A | Android PASS | Android FAIL | Android N/A | Walked total |
|--------|----------|----------|---------|--------------|--------------|-------------|--------------|
| 1 — Keyboard handling (11 input screens × 2 devices) | 11 | 0 | 0 | 11 | 0 | 0 | 22 |
| 2a — Bottom-nav main-stack → tab (5 starts × 5 targets) | 21 | 0 | 4 | 21 | 0 | 4 | 42 walkable + 8 N/A diagonal |
| 2b — Bottom-nav overlay-close → tab (4 overlays × 5 targets) | 20 | 0 | 0 | 20 | 0 | 0 | 40 |
| 3 — Listing categories Create/Edit/View (3 × 3) | 9 | 0 | 0 | 9 | 0 | 0 | 18 |
| 3' — Hospitality strip cross-cutting (5 screens) | 5 | 0 | 0 | 5 | 0 | 0 | 10 |
| 4 — Role gating (admin + non-admin × 2 affordances) | 2 | 0 | 0 | 2 | 0 | 0 | 4 |
| 5 — Universal Link smoke (OPTIONAL, iOS only) | 0 | 0 | 1 | n/a | n/a | n/a | 0 walked + 1 N/A |
| **TOTALS** | **68** | **0** | **5** | **68** | **0** | **4** | **136 walked PASS / 0 FAIL** |

**Defect-fix commits triggered:** 0. The D-08 bug-fix loop was NOT triggered — zero FAIL cells surfaced on either device. Zero `999.x` deferrals filed. Build-identity SHA at walk close: `de4ff0a` (unchanged from walk start).

---

## Section D — Submission state (REL-06)

| Store | Build identifier | Upload status | Current state | Release notes paste status |
|-------|------------------|---------------|---------------|---------------------------|
| Apple App Store Connect | iOS 1.0.4 build 22 (`MARKETING_VERSION = 1.0.4` × 2 + `CURRENT_PROJECT_VERSION = 22` × 2 in pbxproj) | Uploaded successfully via Xcode Organizer (Xcode 26.4 / build 17E192) — no ITMS rejection at upload time | **In TestFlight** — build processed, available to Internal Testing (D-12 phase-exit accepts TestFlight Internal as sufficient before App Store production review) | EN body (465 chars) and RU body (454 chars) pasted into "What's New in This Version" per ASC localization panel — both sourced verbatim from `08-RELEASE-NOTES.md` per Plan 08-04 |
| Google Play Console | Android 1.0.28 versionCode 28 (`versionName "1.0.28"` + `versionCode 28` in `android/app/build.gradle`) | `.aab` uploaded successfully via Play Console web UI under existing keystore — no signature-mismatch error | **Submitted, processing** — build is in Play Console queue (Internal Testing track or Production review per D-12 — Play Console rolls out gradually) | EN body and RU body pasted into "Edit release notes per language" per Play Console release flow — both sourced verbatim from `08-RELEASE-NOTES.md` per Plan 08-04 |

**Reviewer notes:** none returned at close-out time. v1.0.4 review is in-flight on both stores. Outcome routing per STATE.md post-ship todos (Section H below).

---

## Section E — Requirement traceability

| REQ-ID | Status | Plan | Evidence |
|--------|--------|------|----------|
| **REL-01** (semver bump 1.0.4) | **COMPLETE** | 08-02 | `package.json` line 3 = `"version": "1.0.4",` at HEAD; atomic commit `de4ff0a chore(08-02): bump version to 1.0.4 (REL-01 + REL-02 iOS marketing)`; assertion 1 in Section A exits 0 |
| **REL-02** (iOS marketing/build numbers + Android versionCode/versionName) | **COMPLETE** | 08-01 (verify-only) + 08-02 (iOS marketing bump) + `63f3b72` (out-of-band Android + iOS build numbers) | `MARKETING_VERSION = 1.0.4` × 2 in pbxproj (assertion 2 returns count `2`); `CURRENT_PROJECT_VERSION = 22` × 2 in pbxproj (post-bump state — see Section H Deviation 1); `versionCode 28` + `versionName "1.0.28"` in `android/app/build.gradle` (post-bump state — see Section H Deviation 1). Both stores accepted the binaries for these identifiers without ITMS rejection or signature mismatch |
| **REL-03** (privacy manifest population) | **DESCOPED** | n/a | Per **D-13** — `ios/JayTap/PrivacyInfo.xcprivacy` is live in v1.0.3 production with empty `NSPrivacyCollectedDataTypes` arrays + Required Reason API entries (FileTimestamp / UserDefaults / SystemBootTime) accepted by Apple under v1.0.3 review. v1.0.4 collects no new data types per Phase 1–6 codebase scan; inheritance is clean. Re-open conditions: Apple flags missing `NSPrivacyCollectedDataTypes` at a future submission, OR a future phase introduces a new data-collecting SDK |
| **REL-04** (Xcode 26 / iOS 26 SDK gate) | **DESCOPED** | n/a | Per **D-13** — REL-04 SDK gate cleared 2026-04-28 per PROJECT.md Key Decisions row 129 (Xcode 26.4 / build 17E192 confirmed on user's machine). At archive time per D-04, `xcodebuild -version | grep '^Xcode 26'` exits 0 (assertion 6 in Section A). Verification-only, not migration; phase-8 plans treat as a one-shot version assertion. Re-open conditions: Apple deprecates Xcode 26.4 / iOS 26 SDK |
| **REL-05** (manual QA on physical devices) | **COMPLETE** | 08-01 (scaffold) + 08-03 (walk + APPROVED) | 136 walked PASS / 0 FAIL across iPhone 15 Pro Max / iOS 26.x + Moto G XT2513V / Android 16 (Fabric, Release); Section C above; matrix at `08-QA-MATRIX.md` `status: walked`; Sign-off table populated; D-08 bug-fix loop NOT triggered. Closed by Plan 08-03 commit `f757032 test(08-03): walk QA matrix on both devices — APPROVED (136 PASS / 0 FAIL)` |
| **REL-06** (release notes + dual-store submission) | **COMPLETE** | 08-04 (drafted notes) + 08-05 (archive + upload + paste) | Bilingual EN+RU notes drafted in `08-RELEASE-NOTES.md` (93 lines; EN 465 chars + RU 454 chars; both fit Play Console's binding 500-char-per-locale limit) committed at `ad55782 docs(08-04): author EN+RU release notes for v1.0.4 ASC + Play Console submission`. iOS archive uploaded to ASC, available in TestFlight. Android `.aab` uploaded to Play Console, submitted/processing. Release notes pasted in EN + RU on both stores per Section D |

---

## Section F — Descope record (D-13)

Phase-8 CONTEXT.md decision **D-13** establishes that the following items are satisfied by v1.0.3 production state and are NOT re-touched in v1.0.4 — re-touching live-and-accepted store metadata would be churn without a defect to fix.

| Item | Disposition (D-13) | Re-open condition |
|------|--------------------|-------------------|
| **REL-03** privacy manifest population (`ios/JayTap/PrivacyInfo.xcprivacy`) | DESCOPED — inherited from v1.0.3 production. `NSPrivacyCollectedDataTypes` empty arrays + Required Reason API entries accepted by Apple under v1.0.3 review. v1.0.4 adds no new data-collecting SDKs (Phase 1–6 codebase scan + Phase 1–6 verifier outputs corroborate) | Apple flags missing `NSPrivacyCollectedDataTypes` at a future submission, OR a future phase introduces a new data-collecting SDK |
| **REL-04** Xcode 26 SDK gate | DESCOPED — cleared 2026-04-28 per PROJECT.md Key Decisions row 129; verification-only at archive time per D-04 (Xcode 26.4 / 17E192). Plan 08-01 confirmed the toolchain; Plan 08-05 confirmed again at archive time | Apple deprecates Xcode 26.4 / iOS 26 SDK |
| **applinks** entitlement (`ios/JayTap/JayTap.entitlements` — `applinks:moveinplatform.com` + legacy `applinks:bizdinkonush.com`) | DESCOPED — both entries shipped under v1.0.3 review and are live in production. Universal Links functional per CONTEXT.md `<specifics>` (`https://www.moveinplatform.com/property/{id}`); legacy `bizdinkonush.com` retained per STATE.md user 2026-04-28 keep-as-is. NOT re-touched in v1.0.4 | `bizdinkonush.com` is restored or `moveinplatform.com` lapses |
| **Maps key restrictions** (Google Cloud Console — package + SHA-1) | DESCOPED — restrictions configured for v1.0.3 still apply; no package-name change or release-keystore rotation in v1.0.4. NOT re-audited in v1.0.4 | Maps key restrictions break (e.g., release keystore SHA-1 changes, package name change) |
| **PrivacyInfo.xcprivacy** content | DESCOPED — same authority as REL-03 above; live in v1.0.3 production with FileTimestamp / UserDefaults / SystemBootTime Required Reason API entries; empty `NSPrivacyCollectedDataTypes`. NOT modified in v1.0.4 | Same as REL-03 re-open conditions |
| **ASC App Privacy** declarations | DESCOPED per D-12 + D-13 — no new App Privacy questionnaire submitted for v1.0.4. Live ASC App Privacy answers from v1.0.3 (contact info: email/name/phone; photos/videos; location precise/coarse; linked to user; not used for tracking) are the binding declarations and are inherited cleanly. NO resubmission. NOT re-answered in v1.0.4 | A future phase introduces a new data-collecting SDK or new authentication provider |
| **Play Console Data Safety** declarations | DESCOPED per D-12 + D-13 — same data set as ASC, same disposition. Live in production for v1.0.3. NOT re-answered in v1.0.4 | Same as ASC App Privacy re-open conditions |

---

## Section G — Plan-by-plan close-out summary

Phase 8 ran 5 plans across 5 waves over a single working day (2026-04-28). One-line status each:

| Plan | Wave | Status | Outcome |
|------|------|--------|---------|
| 08-01 | 0 — pre-archive verification + QA scaffold | **Complete** at `a388104` | 6/6 D-05 baseline assertions PASS + 138-cell QA matrix scaffold + 0 source-tree drift |
| 08-02 | 1 — atomic v1.0.4 version bump per D-01 | **Complete** at `de4ff0a` | `package.json` `"version"` 1.0.3 → 1.0.4 + iOS pbxproj `MARKETING_VERSION` 1.0.3 → 1.0.4 × 2 (Debug + Release) — atomic single commit; 6/6 D-05 post-bump assertions PASS; 3/3 CI gates exit 0 |
| 08-03 | 2 — physical-device regression smoke walk per D-06–D-09 | **Complete** at `f757032` | APPROVED on first pass; 136 walked PASS / 0 FAIL across iPhone 15 Pro Max / iOS 26.x + Moto G XT2513V / Android 16 Fabric; D-08 bug-fix loop NOT triggered; build-identity SHA preserved at `de4ff0a` |
| 08-04 | 3 — bilingual EN+RU release notes draft per D-10/D-11 | **Complete** at `ad55782` | `08-RELEASE-NOTES.md` 93 lines; EN body 465 chars + RU body 454 chars (both fit Play Console's binding 500-char-per-locale limit; ASC's 4000-char limit non-binding); D-10 content order honored — What's new → Improvements → "minor refinements" closer; user-facing voice only per Threat T-08-09 mitigation; D-11 paste-only disposition encoded |
| 08-05 | 4 — TestFlight history check + dual-store archive + submission + this verification artifact | **Complete** (this artifact) | iOS archive uploaded to ASC under Xcode 26.4, available in TestFlight; Android `.aab` uploaded to Play Console under existing keystore, submitted/processing; EN+RU release notes pasted on both stores; this `08-VERIFICATION.md` records the close-out evidence |

**Cross-plan continuity:** five `08-*` token commits in git log (`a388104` 08-01 scaffold + `de4ff0a` 08-02 bump + `f757032` 08-03 walk + `ad55782` 08-04 notes + this plan's metadata commit), plus per-plan close-out commits. All five plans landed on `main` per project `branching_strategy: none`.

---

## Section H — Deviations from prompt context

### Deviation 1 — out-of-band version bumps via commit `63f3b72`

- **Found during:** Plan 08-05 Task 4 (this verification artifact authoring; reading `git log` and grepping the source tree)
- **Issue:** The Plan 08-05 prompt context asserts "TestFlight collision check: NO collision (D-03 default path — `CURRENT_PROJECT_VERSION = 21` was unused; pbxproj is NOT bumped to 22)" and lists "iOS build identifier: 1.0.4 build 21" + "Android: 1.0.24 versionCode 25". However, `git log --oneline` shows commit `63f3b72 feat: add Task file and update versioning for Android and iOS` (author: `bakytbek.tatibekov@gmail.com`, 2026-04-28 18:27:56) which:
  - Bumped iOS `CURRENT_PROJECT_VERSION` 21 → 22 (×2 in pbxproj — Debug + Release)
  - Bumped Android `versionCode` 25 → 28
  - Bumped Android `versionName` 1.0.24 → 1.0.28
  - Added an empty `Task` file at repo root
- **Empirical state at phase close:** `grep 'CURRENT_PROJECT_VERSION = 21' ios/JayTap.xcodeproj/project.pbxproj` returns zero hits; `grep 'CURRENT_PROJECT_VERSION = 22' ...pbxproj` returns 2 hits. `grep 'versionCode 25' android/app/build.gradle` returns zero hits; `grep 'versionCode 28' ...build.gradle` returns 1 hit. The shipped binaries on both stores match these post-bump values (Apple ASC accepted iOS build 22 without `ITMS-90060`; Play Console accepted Android `versionCode 28` without "version code already used" rejection — both consistent with these being unused-up-to-2026-04-28 values).
- **Resolution:** This artifact records the **empirical repo state** (build 22 / versionCode 28) as the as-shipped values, not the prompt-context expectation (build 21 / versionCode 25). **Confirmed cause (user-stated, post-ship 2026-04-28):** Google Play Console rejected `versionCode 25` (likely consumed by an earlier Internal Testing or sandbox upload outside this GSD plan flow), so the user bumped Android to `versionCode 28` / `versionName "1.0.28"` and bumped iOS `CURRENT_PROJECT_VERSION` 21 → 22 in the same atomic commit for symmetry. This means **D-02's "Android already at v1.0.4 target (versionCode 25 / versionName \"1.0.24\")" assumption was load-bearing on Play Console state that had drifted between PROJECT.md row 129 capture and 2026-04-28 archive time** — the lesson for future M2 release phases is to **always check Play Console version-code history before declaring an Android baseline**, not just to grep `android/app/build.gradle`. PROJECT.md / D-02 should be updated post-ship to reflect the actual shipped baseline (1.0.28 / versionCode 28). The shipped binaries' acceptance by both stores is the load-bearing signal that the post-bump values worked.
- **Files diverged from prompt-context expectation:** `ios/JayTap.xcodeproj/project.pbxproj` (lines 274 + 308 — `CURRENT_PROJECT_VERSION = 22` not `21`) and `android/app/build.gradle` (lines 91 + 92 — `versionCode 28` + `versionName "1.0.28"` not 25 + "1.0.24")
- **Authoring SHA:** `63f3b72` — landed outside the GSD plan flow (user-authored on a different machine / outside the executor agent). This means Plan 08-05 Task 1 (the conditional `CURRENT_PROJECT_VERSION 21 → 22` bump per D-03) was effectively executed out-of-band by the user, and Plan 08-05 Task 1's "no checkpoint return needed" path applies retroactively because the bump already landed.
- **Rule classification:** This is a **Rule 3 blocker fix** territory — the executor cannot record a verification artifact that contradicts the empirical source-tree state. Recording the actual values is the only correct path. No source code was modified by Plan 08-05 to resolve this; the deviation is entirely descriptive (acknowledging the out-of-band commit's effect).
- **Consequence for `requirements_addressed: [REL-01, REL-02, ...]`:** REL-02's iOS portion (`MARKETING_VERSION = 1.0.4` × 2) lands at Plan 08-02 (`de4ff0a`) — verified. REL-02's Android portion + iOS build-number portion lands at `63f3b72` — recorded here as out-of-band-but-effective. REL-02 is **COMPLETE** because the shipped binaries carry the required identifiers; the bookkeeping route of "atomic 08-02 commit only" is broken but the requirement outcome is unaffected.

### Deviation 2 — `Task` file added by `63f3b72`

- **Found during:** Plan 08-05 Task 4 (`git status --short` and `ls Task`)
- **Issue:** Empty zero-byte file `/Task` at repo root, added by commit `63f3b72`. Not part of any GSD artifact and not referenced by any plan or CLAUDE.md directive.
- **Resolution:** **RESOLVED 2026-04-28 post-ship at commit `b343b46` (`chore: remove stray /Task zero-byte file + ignore it`)** — the empty file was deleted from the index and `/Task` was added to `.gitignore` to prevent recurrence from future stray shell-redirect or `git add` typos. User confirmed the file was accidental (no undocumented intent).
- **Rule classification:** Out-of-scope at executor authoring time per SCOPE BOUNDARY; subsequently cleaned up by the orchestrator after user confirmation.

---

## Section I — Post-ship todos (write to STATE.md after phase close)

1. **App Store review outcome** — wait for ASC review state to advance from "Processing" → "Ready for Sale" (production review path) or remain in TestFlight for the Internal Testing pass per D-12. On rejection, route through `/gsd-plan-phase` with `--gaps` flag.
2. **Play Console review outcome** — wait for Play Console review state to advance to "On Play Store" (production track) or "Available to testers" (Internal Testing track). On rejection, same routing.
3. **M2 promotion** — promote backlog 999.1 (archive listings — authors + mod/admin) to M2 planning per ROADMAP.md `## Backlog`.
4. **GATE-05 closure** — route `03-BACKEND-COORDINATION.md` outreach to Railway team (Phase 3 D-22 Path B accepted-risk closure for M2 ROLE-04).
5. **Out-of-band `Task` file** — RESOLVED 2026-04-28 at commit `b343b46`: file deleted, `/Task` added to `.gitignore`.
6. **`.gitignore` audit** — RESOLVED 2026-04-28 at commit `b343b46`: `/Task` rule landed under the new "# Stray scratch files at repo root" section.
7. **D-02 baseline update** — record in PROJECT.md (and reference in M2 planning context) that Play Console rejected `versionCode 25` for v1.0.4 — actual shipped Android baseline is `versionCode 28` / `versionName "1.0.28"`, iOS shipped at `CURRENT_PROJECT_VERSION = 22`. Future release phases must check Play Console version-code history before declaring an Android baseline (do NOT trust the local `android/app/build.gradle` file alone).

---

## Section J — Final disposition

**Phase 8 disposition: APPROVED — v1.0.4 submitted.**

- iOS: in TestFlight (build 1.0.4 / 22 processed, available to Internal Testing per D-12 phase-exit acceptance)
- Android: submitted, processing (1.0.28 / versionCode 28 in Play Console queue — Internal Testing track or Production review)
- Release notes pasted in EN + RU on both stores per `08-RELEASE-NOTES.md` Plan 08-04
- All in-scope requirements (REL-01 + REL-02 + REL-05 + REL-06) closed
- Descoped requirements (REL-03 + REL-04) recorded with re-open conditions per D-13

**M1 milestone status:** v1.0.4 ships. Phase 8 is the final Phase-8 closure for M1 "Polish + Hospitality"; Phase 7 was SKIPPED with zero plans on 2026-04-28 (PROJECT.md Key Decisions row 129). All 8 phases of the M1 ROADMAP are now resolved (7 executed + Phase 7 SKIPPED). All v1 requirements are addressed (32 COMPLETE) or descoped (2 — REL-03 + REL-04 — with re-open conditions; 1 — ALIGN-01/02 closed implicitly per row 129).

**Next milestone:** M2 "Roles & Moderation" — captured in REQUIREMENTS.md § v2 + ROADMAP.md § Milestone 2 (Future) for separate planning. Backlog 999.1 (archive listings) in `ROADMAP.md ## Backlog` rolls into M2 planning when promoted via `/gsd-review-backlog`.

---

*Plan 08-05 / Phase 8 verification artifact — 2026-04-28*
*Walked-against build-identity SHA: `de4ff0a` (Plan 08-02 atomic v1.0.4 marketing-version bump)*
*Archived-against build-identity SHA: `63f3b72` (out-of-band iOS build-22 + Android versionCode-28 + versionName-1.0.28 bumps; recorded as Deviation 1 above)*
*Stores: iOS in TestFlight; Android submitted/processing*
*Final disposition: APPROVED — v1.0.4 submitted to App Store Connect + Google Play Console*

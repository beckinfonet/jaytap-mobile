---
phase: 04-m2-carry-forward-bug-fixes
verified: 2026-05-07T08:34:00Z
status: human_needed
score: 7/8 must-haves verified
overrides_applied: 0
human_verification:
  - test: "CARRY-01 SC#1 — Demote-mid-action recovery UX"
    expected: "Admin demotes moderator while Approve/Reject/Archive/Delete/Role-change popup is open; popup closes, loading spinner resets, RoleRefreshBanner surfaces within ~1s; user can tap banner and recover without app restart"
    why_human: "Banner latency (~1s) is empirical — requires physical device, live backend, and a second account performing the demotion in parallel. Automatable parts (refreshRole called, no fallback Alert, modal state reset) are green. Phase 5 REL-03 device walk scheduled."
  - test: "CARRY-02 SC#3 — New application uid matches Firebase sub on device"
    expected: "Operator on iPhone 15 Pro Max signs up as new user, submits landlord application; queries Mongo directly to verify application.uid === Firebase.user.localId"
    why_human: "Requires live Atlas + physical device + Firebase auth flow. Supertest proves the invariant against in-memory mongo; live walk needed for production evidence. Scheduled for Phase 5 REL-03 per CONTEXT.md D-12 and 04-HUMAN-UAT.md."
---

# Phase 4: M2 Carry-Forward Bug Fixes Verification Report

> **NOTE 2026-05-08: The 2 deferred device walks listed in `human_verification:` (CARRY-01 banner-latency on iPhone + CARRY-02 SC#3 live Atlas uid match) are rolled into `.planning/phases/05-hardening-manual-qa-release-v3/05-QA-MATRIX.md` (Matrix 4 cell 4.1 + Matrix 5 cell 5.1) for M3 release walks (D-06). This verification report's automated assessment stands; deferred-walk status updates land in 05-QA-MATRIX.md from now on.**

**Phase Goal:** Close CARRY-01 (RN client mid-action 403 recovery) and CARRY-02 (backend landlord-application uid-mismatch fix + verification chain) plus 4 MEDIUM-severity findings from Phase 3 review (MD-01..MD-04).
**Verified:** 2026-05-07T08:34:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | CARRY-01: All 11 parent submit handlers across ModerationQueueScreen, PropertyDetailsScreen, RoleManagementScreen route 403 errors through `is403PermissionError(err)` | VERIFIED | grep: ModerationQueueScreen=4, PropertyDetailsScreen=5, RoleManagementScreen=2 (sum=11; planner expected 10; +1 is the runSearch refactor — documented deviation #1 in 04-04-SUMMARY.md; all accounted for) |
| 2 | CARRY-01: On 403 catch, onPermissionDenied calls resetLoading + closeModal + refreshRole; RoleRefreshBanner auto-surfaces | VERIFIED (automated) / human_needed (empirical) | useModActionGuard.test.tsx 10/10 pass; PropertyDetailsScreen-mod-403.test.tsx 2/2 pass; refreshRoleSpy asserted called once; no fallback Alert; banner latency deferred to Phase 5 device walk |
| 3 | CARRY-01: RoleManagementScreen.handleRoleSubmit drops bespoke Alert.alert(t('errors.permissionDenied')) + onBack() in favor of banner-driven flow | VERIFIED | grep for live `t('errors.permissionDenied')` calls = 0; grep for `instanceof PermissionDeniedError` = 0; the 2 grep hits on raw string `errors.permissionDenied` are code comments documenting the dropped behavior |
| 4 | CARRY-02: Diagnostic console.log block (7-field JSON.stringify with PII) fully removed from landlordApplicationRoutes.js | VERIFIED | `grep -c "landlord_application_submit" src/routes/landlordApplicationRoutes.js` = 0; all diagnostic fields (bodyFirebaseUid, legacyHeaderUid, reqUserEmail) absent |
| 5 | CARRY-02: Anti-spoofing sentinel exists, is executable, exits 0 against post-fix tree, and is chained into npm test between actoruid and media-stripped sentinels | VERIFIED | sentinel exits 0; npm test script confirmed `actoruid && landlord-uid && media-stripped && jest`; all 3 sentinel OK messages printed before jest invokes |
| 6 | CARRY-02: Backend supertest with 3 D-08 cases (body-spoof rejected, no-bearer 401, happy-path uid match) exists and passes | VERIFIED | src/__tests__/landlordApplicationRoutes.test.js = 140 LOC, 3 tests, all passing inside 273/273 total |
| 7 | CARRY-02: Repair migration exists with --dry-run / --verify=PASS / idempotent modes + 10-case test (4 unit + 6 spawn-integration) | VERIFIED | src/scripts/migrate-landlord-app-uid-mismatch.js = 258 LOC; 10-case test = 351 LOC; all 10 pass; misuse guard exits 2 on `--verify=BAD`; `module.exports = {classifyRow, processApplication}` |
| 8 | CARRY-02: LandlordApplication.status += 'orphaned'; LandlordApplicationAuditLog.action += 'uid-repair', 'uid-orphan-mark' | VERIFIED | grep confirms each new enum value present exactly once in the respective model files |
| 9 | CARRY-02 live walk: new landlord-application submission on physical device lands with uid === Firebase.user.localId in Atlas | HUMAN NEEDED | Supertest proves invariant; live Atlas walk deferred to Phase 5 REL-03 |
| 10 | MD-02: moderationRoutes.js comment block distinguishes upload (10MB×40 PHOTO_MIMES, edit-on-behalf) from mediaUpload (25MB×45 PHOTO+VIDEO_MIMES, mod media-curation) | VERIFIED | grep: "10MB"=1, "25MB"=4 (incl. comment), "edit-on-behalf"=15 (incl. new comment); old conflated line gone |
| 11 | MD-03: DELETE /listings/:id/media returns HTTP 400 INVALID_ID on malformed ObjectId (not 500 CastError) | VERIFIED | mongoose.Types.ObjectId.isValid pre-check at moderationRoutes.js:351; 2 supertest cases passing (banana + 12345); TDD RED→GREEN confirmed in commit chain |
| 12 | MD-04: check-property-routes-media-stripped.sh:8 regex tightened to anchor on import shapes + canonical API surface | VERIFIED | sentinel regex = `require\(['"]multer\|from ['"]multer\|upload\.array\|multerS3`; exits 0 against post-fix tree; synthetic regression verified by executor |
| 13 | MD-01: EN+RU locale each have 2 distinct keys (error.tooLarge + error.tooManyFiles); MediaCurationScreen dispatch routes LIMIT_FILE_SIZE → tooLarge, LIMIT_FILE_COUNT → tooManyFiles | VERIFIED | grep confirms tooManyFiles = 1 in en.ts, ru.ts, MediaCurationScreen.tsx; old conflated string ("45 MB total") = 0 in en.ts; i18n parity gate exits 0 |
| 14 | CARRY-01 banner latency: popup vanishes + RoleRefreshBanner appears within ~1s on live device | HUMAN NEEDED | Empirical UX; automatable parts verified via RTL smoke; requires physical device walk in Phase 5 REL-03 |

**Score:** 12/14 truths verified (2 require human verification)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `BACKEND:scripts/check-no-landlord-uid-spoofing.sh` | D-07 anti-spoofing sentinel | VERIFIED | 16 LOC, executable, exits 0, greps `uid:\s*req\.(body\|headers)` |
| `BACKEND:src/__tests__/landlordApplicationRoutes.test.js` | 3 D-08 supertest cases | VERIFIED | 140 LOC, 3 tests, all pass |
| `BACKEND:src/routes/landlordApplicationRoutes.js` | Diagnostic block deleted (D-06) | VERIFIED | 287 LOC, 0 matches for `landlord_application_submit` |
| `BACKEND:package.json` | 3-sentinel npm test chain | VERIFIED | Exact ordering: actoruid → landlord-uid → media-stripped → jest |
| `BACKEND:src/scripts/migrate-landlord-app-uid-mismatch.js` | D-09+D-11 repair migration | VERIFIED | 258 LOC, module.exports = {classifyRow, processApplication} |
| `BACKEND:src/__tests__/migrate-landlord-app-uid-mismatch.test.js` | 10-case Envelope-B coverage | VERIFIED | 351 LOC, 10 tests (4 unit + 6 integration), all pass |
| `BACKEND:src/models/LandlordApplication.js` | status enum += 'orphaned' | VERIFIED | 1 grep hit confirmed |
| `BACKEND:src/models/LandlordApplicationAuditLog.js` | action enum += 'uid-repair', 'uid-orphan-mark' | VERIFIED | 1 grep hit each confirmed |
| `BACKEND:src/routes/moderationRoutes.js` | MD-02 comment + MD-03 pre-check | VERIFIED | INVALID_ID in route = 1; 10MB and 25MB in comment; ObjectId.isValid at line 351 |
| `BACKEND:scripts/check-property-routes-media-stripped.sh` | MD-04 tightened regex | VERIFIED | Anchored form confirmed at line 8 |
| `BACKEND:src/__tests__/moderationRoutes.test.js` | MD-03 supertest case | VERIFIED | INVALID_ID references = 4 |
| `src/hooks/useModActionGuard.ts` | D-02 hook + matcher | VERIFIED | 50 LOC, is403PermissionError + useModActionGuard + 2 interfaces exported |
| `src/hooks/__tests__/useModActionGuard.test.tsx` | Unit + RTL tests | VERIFIED | 135 LOC, 10 tests, all pass |
| `src/screens/ModerationQueueScreen.tsx` | 4 handlers wired | VERIFIED | is403PermissionError(err) count = 4, useModActionGuard() = 1 |
| `src/screens/PropertyDetailsScreen.tsx` | 5 handlers wired | VERIFIED | is403PermissionError(err) count = 5, useModActionGuard() = 1 |
| `src/screens/RoleManagementScreen.tsx` | 1 handler refactored | VERIFIED | is403PermissionError(err) count = 2 (handleRoleSubmit + runSearch — documented deviation); bespoke Alert+onBack dropped |
| `src/screens/__tests__/PropertyDetailsScreen-mod-403.test.tsx` | Canonical RTL smoke | VERIFIED | 223 LOC, 2 tests pass (harness-style per plan's authorized deviation) |
| `src/locales/en.ts` | error.tooLarge + error.tooManyFiles keys | VERIFIED | tooManyFiles = 1; old "45 MB total" = 0 |
| `src/locales/ru.ts` | error.tooLarge + error.tooManyFiles keys (RU parity) | VERIFIED | tooManyFiles = 1; old "45 МБ всего" = 0 |
| `src/screens/MediaCurationScreen.tsx` | LIMIT_FILE_SIZE/COUNT dispatch split | VERIFIED | tooManyFiles = 1; combined `||` branch = 0 |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `scripts/check-no-landlord-uid-spoofing.sh` | `src/routes/landlordApplicationRoutes.js` | grep for `uid:\s*req\.(body\|headers)` | WIRED | Sentinel exits 0; zero matches in route file |
| `package.json` test script | `scripts/check-no-landlord-uid-spoofing.sh` | chained between actoruid and media-stripped sentinels | WIRED | Confirmed exact chain ordering in package.json |
| `src/__tests__/landlordApplicationRoutes.test.js` | `src/routes/landlordApplicationRoutes.js` | supertest mounts router at /api/landlord-applications | WIRED | `describe('POST /api/landlord-applications — D-08 uid invariants')` at line 76 |
| `src/scripts/migrate-landlord-app-uid-mismatch.js` | `src/models/LandlordApplication.js` | LandlordApplication.find cursor + updateOne writes | WIRED | LandlordApplication.find and updateOne calls confirmed in migration script |
| `src/scripts/migrate-landlord-app-uid-mismatch.js` | `src/models/LandlordApplicationAuditLog.js` | LandlordApplicationAuditLog.create with action='uid-repair'/'uid-orphan-mark' | WIRED | create calls with new enum values confirmed |
| `src/hooks/useModActionGuard.ts` | `src/context/AuthContext.tsx` | useAuth().refreshRole() inside onPermissionDenied | WIRED | useAuth import and refreshRole destructuring confirmed |
| `src/hooks/useModActionGuard.ts` | `src/hooks/useRole.ts` | import PermissionDeniedError for instanceof check | WIRED | PermissionDeniedError import and instanceof use confirmed (grep = 3) |
| `src/screens/ModerationQueueScreen.tsx` | `src/hooks/useModActionGuard.ts` | const { is403PermissionError, onPermissionDenied } = useModActionGuard() | WIRED | useModActionGuard() call confirmed = 1 |
| `src/screens/PropertyDetailsScreen.tsx` | `src/hooks/useModActionGuard.ts` | const { is403PermissionError, onPermissionDenied } = useModActionGuard() | WIRED | useModActionGuard() call confirmed = 1 |
| `src/screens/RoleManagementScreen.tsx` | `src/hooks/useModActionGuard.ts` | const { is403PermissionError, onPermissionDenied } = useModActionGuard() | WIRED | useModActionGuard() call confirmed = 1 |
| `src/screens/MediaCurationScreen.tsx` | `src/locales/en.ts` | t('moderation.mediaCuration.error.tooManyFiles') call site | WIRED | tooManyFiles referenced in MediaCurationScreen.tsx = 1 |
| `src/locales/en.ts` | `src/locales/ru.ts` | i18n parity gate enforces identical key sets | WIRED | bash scripts/check-i18n-parity.sh exits 0 |

### Data-Flow Trace (Level 4)

Not applicable — this phase delivers bug fixes (handler catch blocks, route hardening, migration script, i18n keys). No new rendering components that fetch dynamic data were introduced.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Backend sentinel chain green | `nvm use 24 && npm test` | 273/273 pass; 3 sentinel OK lines | PASS |
| Sentinel exits 0 against post-fix tree | `bash scripts/check-no-landlord-uid-spoofing.sh` | `OK CARRY-02: ...` | PASS |
| Diagnostic log block fully removed | `grep -c "landlord_application_submit" src/routes/landlordApplicationRoutes.js` | `0` | PASS |
| npm test chain ordering exact | `grep '"test"' package.json` | actoruid → landlord-uid → media-stripped → jest | PASS |
| Model enum 'orphaned' present | `grep -c "'orphaned'" src/models/LandlordApplication.js` | `1` | PASS |
| Model enum 'uid-repair' + 'uid-orphan-mark' present | `grep -c` both | `1` each | PASS |
| Migration misuse guard exits 2 | `node src/scripts/migrate-landlord-app-uid-mismatch.js --verify=BAD; echo $?` | `2` (confirmed in SUMMARY) | PASS |
| useModActionGuard tests | `npx jest --testPathPattern=useModActionGuard --silent` | 10/10 pass | PASS |
| PropertyDetailsScreen-mod-403 tests | `npx jest --testPathPattern=PropertyDetailsScreen-mod-403 --silent` | 2/2 pass | PASS |
| MediaCurationScreen tests | `npx jest --testPathPattern=MediaCurationScreen --silent` | 15/15 pass | PASS |
| i18n parity gate | `bash scripts/check-i18n-parity.sh` | EXIT: 0 | PASS |
| TypeScript baseline | `npx tsc --noEmit \| grep -c "error TS"` | 17 (baseline preserved, no new errors) | PASS |
| RN client focused suite | `npx jest --testPathPattern="(useModActionGuard\|PropertyDetailsScreen-mod-403\|MediaCurationScreen)"` | 27/27 pass | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|------------|------------|-------------|--------|----------|
| CARRY-01 | 04-04 | RN client mid-action 403 popup-recovery | SATISFIED (automated); human_needed (device UX) | 11 handlers wired, RTL smoke passes, refreshRole called; banner latency in Phase 5 |
| CARRY-02 | 04-01, 04-02 | Backend uid-mismatch fix + verification chain + repair migration | SATISFIED (automated); human_needed (live Atlas walk) | Sentinel + supertest + migration + enum extensions all verified; live device walk in Phase 5 |
| MD-01 | 04-05 | i18n key split: error.tooLarge vs error.tooManyFiles | SATISFIED | Both locales have split keys; dispatch site wired; parity gate green |
| MD-02 | 04-03 | Comment doc-drift in moderationRoutes.js | SATISFIED | Comment block disambiguates upload (10MB×40) vs mediaUpload (25MB×45) |
| MD-03 | 04-03 | CastError → 400 on DELETE /listings/:id/media | SATISFIED | ObjectId.isValid pre-check at line 351; 2 supertest cases prove 400 not 500 |
| MD-04 | 04-04 | Sentinel regex tightened to anchor on import shapes | SATISFIED | Regex updated, exits 0, synthetic regression verified by executor |

### Anti-Patterns Found

| File | Pattern | Severity | Impact |
|------|---------|----------|--------|
| `src/screens/RoleManagementScreen.tsx` lines 54, 159 | `errors.permissionDenied` appears in comments (not live code) | Info | Comments document dropped behavior — no runtime impact; plan acceptance criterion uses literal grep and technically fails (count=2 not 0), but executable code has no live `t('errors.permissionDenied')` call |

No stubs, placeholders, or empty implementations found in Phase 4 deliverables.

### Human Verification Required

#### 1. CARRY-01 Banner Latency on Physical Device

**Test:** On iPhone 15 Pro Max, log in as a moderator. Open an Approve or Reject popup. On a second device/session, admin demotes the moderator. With the popup still open on device 1, tap Submit.
**Expected:** Popup loading spinner resets, popup closes silently, RoleRefreshBanner appears within ~1 second. Tapping the banner fires refreshRole again and dismisses the banner. App does not restart.
**Why human:** Banner render latency (~1s criterion from ROADMAP SC#1) is empirical — depends on network RTT for refreshRole() + React re-render cycle. Automatable parts (spinner reset, modal close, refreshRole called) are all green in RTL smoke. Device walk scheduled for Phase 5 REL-03.

#### 2. CARRY-02 Live Atlas uid Match on Device

**Test:** On iPhone 15 Pro Max, create a fresh Firebase account. Navigate to the landlord application form and submit it. Query MongoDB Atlas to verify `LandlordApplication.uid === Firebase user's localId`.
**Expected:** `application.uid === Firebase.user.localId` (JWKS-verified `req.firebaseUid`).
**Why human:** Supertest proves the invariant against in-memory mongo; production Atlas walk needed to confirm no environment-specific divergence. Scheduled for Phase 5 REL-03 per CONTEXT.md D-12 and 04-HUMAN-UAT.md.

### Gaps Summary

No automatable gaps found. All 5 plans executed successfully:

- **Plan 04-01** (CARRY-02 backend verification): sentinel + supertest + diagnostic cleanup — all artifacts verified, 273/273 backend tests pass
- **Plan 04-02** (CARRY-02 migration): 258-LOC migration script + 351-LOC 10-case test + enum extensions — all artifacts verified
- **Plan 04-03** (MD-02+MD-03+MD-04): comment fix + ObjectId pre-check + sentinel regex — all artifacts verified
- **Plan 04-04** (CARRY-01): useModActionGuard hook + 11 handlers + RTL smoke — all artifacts verified (11 handlers vs planned 10 — documented deviation; runSearch refactor adds consistency)
- **Plan 04-05** (MD-01): i18n key split + dispatch — all artifacts verified, parity gate green

**Two items require human verification:** CARRY-01 banner latency and CARRY-02 live Atlas uid-match walk. Both are scheduled for Phase 5 REL-03.

### Cross-Repo HEAD Evidence

| Repo | HEAD | Plans Closed |
|------|------|-------------|
| JayTap-services (backend) | `46d2ef4` | 04-01, 04-02, 04-03 |
| JayTap RN client | `fe3b888` | 04-04, 04-05 |

Backend commit chain: `3222d96` → `fb6fcfd` → `b9e7c70` → `71a2123` → `be071c0` → `2209ecc` → `304fdcd` → `46d2ef4`

RN client commit chain: `c2a5cf8` → `ad02d40` → `f54457d` → `b54291e` → `fe3b888`

### Test Counts

| Suite | Count | Notes |
|-------|-------|-------|
| Backend (273/273) | 273 pass | Baseline was 258 pre-Phase-4; +15 from Plans 04-01 (3) + 04-02 (10) + 04-03 (2) |
| Backend sentinels | 3/3 OK | actoruid-spoofing + landlord-uid-spoofing + media-stripped |
| RN focused suite | 27/27 pass | useModActionGuard (10) + PropertyDetailsScreen-mod-403 (2) + MediaCurationScreen (15) |
| RN baseline failures | 2 pre-existing | useRole.test.ts (1 failing test — manageListings fixture mismatch from M2 baseline) + PropertyService.test.ts (suite fails to load — apiClient mock issue from M2 baseline) |

---

_Verified: 2026-05-07T08:34:00Z_
_Verifier: Claude (gsd-verifier)_

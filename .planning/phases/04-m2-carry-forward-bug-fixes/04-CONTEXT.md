# Phase 4: M2 Carry-Forward Bug Fixes - Context

**Gathered:** 2026-05-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Close two M2 carry-forward defects with independent risk profiles, bundled into one phase but shipped as two atomic commit chains:

1. **CARRY-01 — RN client mid-action 403 popup recovery.** When a user is demoted while a moderator/admin action popup is open and they tap Submit, the request flies, the backend role check rejects with HTTP 403, and the popup currently hangs (loading state stuck, modal stays open). Six+ submit handlers are missing the catch. Phase 4 wires a shared catch helper across all of them so the popup closes cleanly, `refreshRole()` updates AuthContext, and the existing `RoleRefreshBanner` (mounted globally at App.tsx root) auto-surfaces — no force re-login.

2. **CARRY-02 — Backend landlord-application uid-mismatch.** The original body-uid spoofing path was closed in commit `768e629` (2026-04-30) by adding a `requireBearer` guard and forcing `uid: req.firebaseUid` at the create site. Phase 4 adds the missing artifacts: formal anti-spoofing sentinel (matching M2 HF-03 + M3 Phase 3 D-15 pattern), backend supertest case, removal of the temporary diagnostic `console.log`, and a repair migration that walks existing `LandlordApplication` rows in Mongo, phone-matches where possible, and orphan-marks the rest.

**Bonus scope folded in:** All 4 deferred Phase 3 MEDIUM review findings (MD-01 i18n drift, MD-02 comment doc-drift, MD-03 CastError → 400 normalization, MD-04 sentinel regex tightening) land in this phase's commit chain — they were explicitly assigned to the Phase 4 carry-forward bucket in `03-REVIEW.md`.

**Touches both repos:**
- **RN client** (`/Users/beckmaldinVL/development/mobileApps/JayTap`): new `src/hooks/useModActionGuard.ts` + helper `is403PermissionError()`, edits to ~5 modal/screen submit handlers, RTL smoke tests covering the catch path, EN+RU i18n key parity if any new copy is added.
- **Backend** (`/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services`): edits to `src/routes/landlordApplicationRoutes.js` (drop diagnostic log block lines 113-122; sentinel-friendly comments), new `scripts/check-no-landlord-uid-spoofing.sh` chained into npm test, new `scripts/migrate-landlord-app-uid-mismatch.js` + `.test.js` matching the M3 Phase 1 Plan 01-02 pattern, supertest cases in `src/__tests__/landlordApplicationRoutes.test.js`, `LandlordApplication` model status enum extended with `'orphaned'`, MD-02..MD-04 fixes to `moderationRoutes.js` + `s3Upload.js` + `check-property-routes-media-stripped.sh`.

**Requirements covered:** CARRY-01, CARRY-02 (+ MD-01..MD-04 polish from Phase 3 review).

**Explicitly NOT in this phase (boundary anchors for downstream):**
- v3.0.0 atomic version bump + manual physical-device QA matrix + dual-store submission — Phase 5 (REL-01..REL-06).
- Race-cell test rig (cells 1.7 + 2.4–2.6 + 5.6 from M2 Phase 6) — deferred to M4+ per memory `phase06-m3-carry-forward.md`. Backend MOD-15 + ROLE-11 atomic invariants are covered by existing supertests; physical-device race walks remain empirical-only.
- Android `clean bundleRelease` reanimated build doc — Phase 5 REL-02 owns the operator runbook update.
- 2GIS native bridge migration — M4+ per `2GIS_BRIDGE_PLAN.md`.
- Token-revocation backend changes (e.g., shorter Firebase ID-token TTL or JWKS revocation list) — out of scope. M2 Phase 1's `iat < roleRevokedAt` check is the existing trust boundary; CARRY-01 is a frontend UX fix, not a backend security change.
- New audit-row category in `LandlordApplicationAuditLog` for the migration's flips — planner discretion (recommend `action: 'uid-repair'` or similar).

</domain>

<decisions>
## Implementation Decisions

### CARRY-01: RN client mid-action 403 popup recovery

- **D-01 (Surface coverage — 6 confirmed targets):** The 403-catch sweep covers all of:
  1. `src/screens/ModerationQueueScreen.tsx` — `handleApprove` (lines ~209-241) + `handleRejectSubmit` (lines ~243+) + `handleApproveLocation` (lines ~391-440) + the locations-tab reject handler (lines ~440+). Today these only catch HTTP 409 race conflicts; 403 falls through to a generic `Alert.alert`.
  2. `src/components/RejectListingModal.tsx` — submit handler (no `PermissionDeniedError` import today).
  3. `src/components/ArchiveListingModal.tsx` — owner-archive AND mod-archive submit paths.
  4. `src/components/DeleteListingModal.tsx` — hard-delete submit handler (admin-only mod action).
  5. `src/screens/PropertyDetailsScreen.tsx` — mod action footer's approve/reject/archive submit handlers.
  6. `src/screens/RoleManagementScreen.tsx` — `handleRoleSubmit` already catches client-side `PermissionDeniedError` (line 147) but does NOT catch in-flight axios 403. Refactor through the new shared mechanism.

- **D-02 (Shared `is403PermissionError()` helper + `useModActionGuard()` hook):** Create a small shared abstraction so all 6+ handlers route through one consistent catch path. Approximate API:
  ```ts
  // src/hooks/useModActionGuard.ts (~80 LOC + test file)
  export const is403PermissionError = (err: any): boolean =>
    err instanceof PermissionDeniedError ||
    err?.message === 'E_PERMISSION_DENIED' ||
    err?.response?.status === 403;

  export const useModActionGuard = () => {
    const { refreshRole } = useAuth();
    const onPermissionDenied = useCallback(async ({ closeModal, resetLoading }: {
      closeModal: () => void;
      resetLoading: () => void;
    }) => {
      resetLoading();
      closeModal();
      await refreshRole(); // AuthContext updates → RoleRefreshBanner auto-surfaces
    }, [refreshRole]);
    return { is403PermissionError, onPermissionDenied };
  };
  ```
  Each modal/screen calls `is403PermissionError(err)` in its `catch` and routes to `onPermissionDenied()` if true; falls through to existing 409 / generic-error handling otherwise.
  REJECTED: pure copy-paste across 6 handlers (drift risk if we ever tune the recovery UX); helper-only without the hook (each modal still has to wire `refreshRole` + reset+close manually).

- **D-03 (Detect both client-side and in-flight 403):** Catch `PermissionDeniedError` (thrown synchronously when `canFromUser()` returns false in service-layer pre-check — e.g., `PropertyService.ts` lines 207, 225, 246, 269, 291, 316, 363, 387, 415; `UserService.ts` lines 45, 74) AND `err?.response?.status === 403` (the in-flight case where backend role check rejects after admin demotes mid-request). Both must be handled because they represent different timing windows of the same demote-mid-action scenario.

- **D-04 (Recovery UX — silent close + RoleRefreshBanner):** On 403 catch, the modal:
  1. Resets its loading state (`setSubmitting(false)`, etc.).
  2. Closes itself (`onClose()` / `setSelectedX(null)`, etc.).
  3. Fires `await refreshRole()` (AuthContext re-fetches backend profile).
  4. AuthContext's user.backendProfile.userType updates → `RoleRefreshBanner` (mounted at App.tsx root, sticky-top) re-evaluates `lastSeenRole !== currentRole` and renders the warning bar.
  The user sees the popup vanish + the banner appear within ~1s. They tap the banner to acknowledge (banner's existing optimistic-dismiss pattern from Phase 1 ROLE-10 / D-13).
  REJECTED: ephemeral toast (doubles up with the banner; fights for visual attention); `Alert.alert(t('errors.permissionDenied'))` (heavier — user has to dismiss before the banner shows; the existing `RoleManagementScreen.handleRoleSubmit` pattern uses this for client-side denials but in-flight is gentler); force re-login / sign-out (overkill — the cached Firebase ID token is still valid for read paths and `refreshRole()` is the lighter recovery; original CARRY-01 wording said "force re-login" but the banner-driven flow satisfies the acceptance criterion "user can recover via tap-to-reload without an app restart" without the heavy hand).

- **D-05 (Acceptance per ROADMAP SC#1):** Demoting a moderator while their action popup is open results in: popup loading state resets, popup closes, `RoleRefreshBanner` surfaces within ~1s, user can recover via banner-tap (which fires `refreshRole()` again as a confirmation) without an app restart. The fix lands the popup-close + first `refreshRole()`; the banner's existing tap behavior owns the second.

### CARRY-02: Backend uid-mismatch fix verification + diagnostic cleanup

- **D-06 (Diagnostic console.log fully removed):** Delete the entire 7-field log block at `landlordApplicationRoutes.js:113-122` (the `evt: 'landlord_application_submit'` line + its `bearerPresent` / `bodyFirebaseUid` / `legacyHeaderUid` / `reqFirebaseUid` / `reqUserEmail` / `ts` fields). The bug is fixed; we have enough confidence after the repair migration walks. No env-flag gating — keeps the route file clean.
  REJECTED: gate behind `DEBUG_LANDLORD_APP=true` (cruft for a closed bug); promote to permanent info log (Railway log noise without clear value).

- **D-07 (New `check-no-landlord-uid-spoofing.sh` sentinel):** New standalone bash script at `backend-services/JayTap-services/scripts/check-no-landlord-uid-spoofing.sh`. Mirrors the M2 HF-03 `check-no-actoruid-spoofing.sh` and M3 Phase 3 `check-property-routes-media-stripped.sh` pattern:
  ```bash
  #!/usr/bin/env bash
  set -euo pipefail
  if grep -nE "uid:\s*req\.(body|headers)" src/routes/landlordApplicationRoutes.js > /dev/null; then
    echo "FAIL: body/headers uid spoof path detected in landlordApplicationRoutes.js"
    exit 1
  fi
  echo "OK: landlord-application uid sourced exclusively from req.firebaseUid"
  ```
  Chained into the `npm test` script alongside the existing two sentinels. Single-purpose; easy to read; fails loud on regression.
  REJECTED: extend `check-no-actoruid-spoofing.sh` (couples two unrelated audit trails); inline grep in supertest only (doesn't run as a pre-merge gate independent of Jest).

- **D-08 (Backend supertest cases for the body-spoof rejection path):** Add to `src/__tests__/landlordApplicationRoutes.test.js`:
  - `POST /api/landlord-applications` with body `{ uid: 'someone-elses-uid' }` + valid Bearer token → application is created with `uid: req.firebaseUid` (the body uid is silently ignored, matching the existing M2 HF-03 dual-accept pattern on read paths).
  - `POST /api/landlord-applications` with no Bearer token → 401 from the `requireBearer` guard.
  - `POST /api/landlord-applications` with valid Bearer token + valid body → application created with `uid` matching the JWKS-verified `payload.sub`.
  - Sentinel `check-no-landlord-uid-spoofing.sh` exit 0.

### CARRY-02: Repair migration semantics

- **D-09 (Phone-match repair, orphan-mark fallback):** New `scripts/migrate-landlord-app-uid-mismatch.js` walks every `LandlordApplication` row and:
  1. Looks up `LandlordApplication.uid` in the `users` collection.
     - **Hit:** the row's uid resolves to a real User. Leave alone (the row may or may not be the original applicant's, but it points to a real account; we cannot determine "wrongness" without the original token).
     - **Miss:** the row's uid does NOT resolve. Proceed to phone match.
  2. Phone-match attempt: query `Users.find({ phone: application.phone })`.
     - Exactly **1 unique User** match AND that user's `uid` ≠ `application.uid` → flip the row's `uid` to that user's `uid`. Append a `LandlordApplicationAuditLog` row with `action: 'uid-repair'` (or planner-picked enum value), the before-and-after uids, and a timestamp.
     - **0 matches OR 2+ matches** → orphan-mark: set `application.status = 'orphaned'` (extend the enum; see D-10). Append audit log row with `action: 'uid-orphan-mark'`.
  3. Idempotent: re-running skips any row that already has `status: 'orphaned'` OR has a uid-repair audit row matching its current uid.

- **D-10 (Status enum extension — add `'orphaned'`):** Extend `LandlordApplication.js` status enum from `submitted | approved | rejected | withdrawn` to `submitted | approved | rejected | withdrawn | orphaned`. Backend `getMine` filter (line 157 — `LandlordApplication.find({ uid: req.firebaseUid })`) and admin queue filter need a one-line audit to confirm `'orphaned'` rows are NOT shown to either the (presumed) original applicant or the admin queue (they're a dead-data marker, not a workflow state). Frontend treatment: an orphaned row in `getMine` for a given user is highly unlikely (would require the user's own uid not to resolve in Users — i.e., their User doc was deleted) but defensively, treat as no-application-exists.

- **D-11 (Operator-supervised execution per M2 Plan 02-02 + M3 Phase 1 D-04..D-15 pattern):** Migration runs with three modes:
  - `node scripts/migrate-landlord-app-uid-mismatch.js --dry-run` → prints the planned action per row, no DB writes.
  - `node scripts/migrate-landlord-app-uid-mismatch.js --verify=PASS` → executes; prints summary at end (N flipped, M orphaned, K skipped).
  - `node scripts/migrate-landlord-app-uid-mismatch.js --report` → planner discretion: print-only audit of mismatches without --verify=PASS gate (operator decides per-row).
  Test file `migrate-landlord-app-uid-mismatch.test.js` covers the three branches (hit, phone-match flip, orphan-mark) + idempotency.

- **D-12 (Manual physical-device walk for acceptance #3):** Per ROADMAP SC#3 — operator on iPhone 15 Pro Max signs up as a new user, submits a landlord application, then queries Mongo directly (or via a one-shot diagnostic GET) to verify `application.uid === Firebase.user.localId`. Captured in `04-HUMAN-UAT.md` for Phase 5 REL-03 inclusion.

### Phase 3 MEDIUM bucket (folded into Phase 4)

- **D-13 (MD-01 — i18n string fix for file-count vs file-size):** Update `src/locales/en.ts:744` and `src/locales/ru.ts:738`:
  - EN: `'moderation.mediaCuration.error.tooLarge': 'File too large. Max 25 MB per file, up to 45 files per upload.'`
  - RU: `'Файл слишком большой. Максимум 25 МБ на файл, до 45 файлов за загрузку.'`
  Optionally split into two distinct keys (`error.tooLarge` for `LIMIT_FILE_SIZE`, `error.tooManyFiles` for `LIMIT_FILE_COUNT`) and dispatch on `code` in `MediaCurationScreen.tsx:334-341` — planner picks the cleaner shape; recommend split for future error-code clarity.

- **D-14 (MD-02 — disambiguate s3Upload comment):** Update `moderationRoutes.js:21-28` comment block to distinguish the legacy `upload` (10MB/file, 40-file count, edit-on-behalf instance) from the new `mediaUpload` (25MB/file, 45-file count, mod media-curation instance). Pure documentation drift fix.

- **D-15 (MD-03 — CastError → 400 normalization on DELETE handler):** Add a `mongoose.isValidObjectId(req.params.id)` pre-check at the top of `DELETE /listings/:id/media` (and the parallel `POST /listings/:id/media` + `POST /properties/:id/approve` if planner decides the pattern is worth applying everywhere). On invalid ObjectId → return 400 with `code: 'INVALID_ID'` instead of letting the CastError bubble to a 500 with a leaky Mongoose message. Planner discretion on scope (DELETE-only vs all 3 handlers).

- **D-16 (MD-04 — tighten sentinel regex):** Update `scripts/check-property-routes-media-stripped.sh:8` regex from `grep -nE "upload\.array|multer|multerS3"` to `grep -nE "require\(['\"]multer|from ['\"]multer|upload\.array|multerS3"` (only matches actual imports + canonical multer API surface, not the substring "multer" inside comments). Cheap; prevents future maintainers from tripping the sentinel by writing a comment that mentions the tool by name.

### Sequencing & atomic-break

- **D-17 (Two independent atomic commit chains):** CARRY-01 (RN client) and CARRY-02 (backend + repair migration) are sequenced as two separate atomic chains because they touch different repos and have independent risk profiles. Recommended order:
  1. **Backend chain first:** sentinel + supertest + diagnostic removal land atomically; repair migration script + test land in a follow-up commit (no DB writes from that commit alone — operator runs migration manually). Phase 3 MD-02..MD-04 fold into the same backend chain.
  2. **RN client chain second:** `useModActionGuard` hook + helper + 6-surface sweep + RTL smoke tests + MD-01 i18n fix in atomic commits.
  Order rationale: backend-first means the supertest + sentinel are green BEFORE the operator runs the migration and BEFORE Phase 5 device walks hit the route. Frontend chain has no backend dependency and could ship in either order, but second is cleaner for QA — Phase 5 walks the demote-mid-action recovery path against a known-clean backend.
  REJECTED: bundled single chain (couples unrelated rollbacks); pure parallel tracks (loses the "backend green before frontend exercises it" sequencing benefit).

### Test scope

- **D-18 (Default test scope):**
  - **Backend supertests** (`landlordApplicationRoutes.test.js` extended): body-spoof rejection (D-08), no-bearer rejection, happy-path uid match.
  - **Backend migration test** (`migrate-landlord-app-uid-mismatch.test.js`): hit-skip / phone-match-flip / orphan-mark / idempotency (D-09 + D-11).
  - **Backend sentinel** (`check-no-landlord-uid-spoofing.sh`): exits 0 on the post-fix tree, exits 1 if a regression introduces `uid:\s*req\.(body|headers)`.
  - **RN client RTL smoke** (`__tests__/useModActionGuard.test.tsx` or screen-level test): one of the 6 modals exercises a mocked 403 → verifies `setSubmitting(false)` + `closeModal()` + `refreshRole()` were called. Planner picks which surface to use as the canonical test (recommend `RejectListingModal` for simplicity).
  - **MD-01..MD-04 supertests**: D-15 CastError test (malformed ObjectId on DELETE → 400, not 500); D-16 sentinel re-run after regex tighten (still exits 0).
  - **i18n parity gate**: `bash scripts/check-i18n-parity.sh` exit 0 if any new EN+RU keys are added.
  Per memory `gsd-verifier-misses-regressions.md`, paired-gate verifier+code-review is mandatory after `gsd-execute-phase`. Treat the verifier `human_needed` and reviewer `issues` outputs as paired gates — both must clear (or have explicit fix-status addendum) before phase close.

### Claude's Discretion

- **Migration audit log shape.** Planner picks the `LandlordApplicationAuditLog.action` enum value(s) for the migration's flips (`'uid-repair'` and `'uid-orphan-mark'` are recommended; existing M2 enum already has `'submit'` / `'approve'` / `'reject'` / `'withdraw'` so adding 2 values is low-risk).
- **CastError → 400 scope (D-15 / MD-03).** Planner picks DELETE-only vs all-3-handlers vs all-routes-in-the-file. Recommend DELETE-only for scope hygiene; defer the broader pattern to Phase 5 hardening if time-boxed.
- **i18n key split for D-13 / MD-01.** Planner picks single-key-rewrite vs split-into-two-keys-and-dispatch-on-code. Recommend split (cleaner future error-code mapping).
- **Test fixture for migration test.** Planner picks: in-memory MongoDB (mongodb-memory-server, matches existing test infra) vs explicit fixture seed in beforeEach. Recommend in-memory.
- **`requireBearer` audit on read paths.** The fix commit `768e629` intentionally retained the dual-accept window on `GET /mine` and `GET /admin/queue` (admin queue is gated by `requireMinRole('admin')` which still requires Mongo lookup). Phase 4 leaves this as-is; planner may add a defensive comment on the read routes if it improves audit clarity, but no behavioral change.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & roadmap

- `.planning/REQUIREMENTS.md` (CARRY-01 + CARRY-02 entries) — the load-bearing acceptance criteria.
- `.planning/ROADMAP.md` (Phase 4 entry, lines 135-150) — phase boundary + 4 success criteria.
- `.planning/PROJECT.md` — project-level constraints, especially the no-Firebase-SDK invariant (memory `no-firebase-sdk.md`).

### Phase 3 review carry-forward

- `.planning/phases/03-media-flow-inversion-admin-mod-curation/03-REVIEW.md` — MD-01..MD-04 details (folded into Phase 4 via D-13..D-16).
- `.planning/phases/03-media-flow-inversion-admin-mod-curation/03-CONTEXT.md` §"D-15 (Anti-spoofing grep gate)" — pattern reference for D-07.

### M2 Phase 1 anti-spoofing precedent (HF-03)

- `JayTap-services/scripts/check-no-actoruid-spoofing.sh` — sentinel pattern that D-07 mirrors.
- `JayTap-services/src/middleware/verifyFirebaseToken.js` — JWKS verification + `req.firebaseUid` from `payload.sub`. The `verifyTokenForUserCreation` variant added during Phase 4.5 is preserved.

### Migration script precedent

- `JayTap-services/scripts/migrate-listings-m3.js` — M3 Phase 1 Plan 01-02. Operator-supervised `--dry-run` + `--verify=PASS` + idempotency pattern that D-11 mirrors.
- `JayTap-services/scripts/migrate-listings-m3.test.js` — test pattern.
- `JayTap-services/scripts/migrate-landlord-capability.js` — M2 Phase 4.5 sibling migration (referenced in memory `phase45-landlord-application-shipped-state.md`).

### Existing 403 catch precedents in RN client

- `src/screens/RoleManagementScreen.tsx:135-160` — `handleRoleSubmit` canonical client-side catch (D-02 generalizes this).
- `src/screens/ModerationQueueScreen.tsx:129-150, 209-241` — load-path catch + submit-path 409-only catch (the gap).
- `src/components/RoleRefreshBanner.tsx` — auto-surfacing banner (D-04 leans on this).
- `src/hooks/useRole.ts:33-36` — `PermissionDeniedError` class definition.
- `src/services/PropertyService.ts` (lines 207, 225, 246, 269, 291, 316, 363, 387, 415) + `src/services/UserService.ts` (lines 45, 74) — service-layer pre-check throw sites.

### Project memories (load-bearing)

- `phase06-m3-carry-forward.md` — origin context for CARRY-01 + CARRY-02 + the deferred race-cell rig.
- `phase45-landlord-application-uid-mismatch-bug.md` — original incident report (5 days old; verified against current code — fix already partial via commit `768e629`).
- `phase45-landlord-application-shipped-state.md` — Phase 4.5 file inventory.
- `gsd-verifier-misses-regressions.md` — paired-gate mandate after `gsd-execute-phase`.
- `backend-repo-location.md` — backend at `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services`; user owns it directly.
- `backend-node-version.md` — backend agents must `nvm use 24` before npm/node commands.
- `identity-vs-user-store.md` — Firebase = identity proof, MongoDB = enriched user store + role authority.
- `aws-iam-jaytap-prod-s3.md` — IAM context (relevant to Phase 3 MEDIUM MD-04 sentinel scope).
- `feedback-conversational-tone.md` — drop heavy GSD framing in user-facing prose during planning sessions.

### Codebase intel

- `.planning/codebase/CONVENTIONS.md` — testing bar (manual physical-device QA for acceptance #3) + i18n parity rule.
- `.planning/codebase/INTEGRATIONS.md` — backend service boundaries.
- `.planning/codebase/STACK.md` — `react-native-keyboard-controller` + react-hook-form + zod stack (not directly relevant to Phase 4, but verifies no library churn needed).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- **`PermissionDeniedError` class** (`src/hooks/useRole.ts:33`) — already defined; the new `is403PermissionError()` helper extends its detection coverage to in-flight axios 403s without changing the class itself.
- **`RoleRefreshBanner`** (`src/components/RoleRefreshBanner.tsx`) — Phase 1 ROLE-10 / D-13. Mounted globally in `App.tsx`. Auto-surfaces from `AuthContext` user-role changes. D-04's recovery UX leans on this — no manual trigger needed from the modals.
- **`useAuth().refreshRole()`** (existing in `src/context/AuthContext.tsx`) — re-fetches backend profile. Single call inside the hook is enough to drive the banner.
- **`canFromUser()` + service-layer pre-check pattern** (e.g., `PropertyService.ts:205-208`) — existing pattern; the in-flight 403 path is a complement to this, not a replacement.
- **M2 anti-spoofing sentinel** (`JayTap-services/scripts/check-no-actoruid-spoofing.sh`) — D-07's twin for landlord routes.
- **M3 Phase 1 migration scaffold** (`JayTap-services/scripts/migrate-listings-m3.js`) — D-11's pattern reference.

### Established Patterns

- **Pessimistic optimistic update** (PATTERNS §"Pitfall 7"): only mutate UI state AFTER the await resolves. Already followed by `ModerationQueueScreen.handleApprove`. The new catch path doesn't change this — it adds a 403 branch BEFORE the existing 409 branch.
- **Atomic commit chain**: each fix lands as its own commit, sentinels green before merge. Matches Phase 1 D-01 + Phase 3 D-13 atomic-break stance.
- **Operator-supervised migration**: `--dry-run` first, then `--verify=PASS`. Always document the rollback path in CONTEXT.md.
- **Paired-gate verifier+reviewer**: never trust verifier alone; always run reviewer in same chain.
- **i18n parity (EN+RU lockstep)**: every new key adds to both `en.ts` and `ru.ts` in the same commit; `bash scripts/check-i18n-parity.sh` exit 0.

### Integration Points

- **App.tsx mount** — `RoleRefreshBanner` already wired at root; new hook integrates via existing `useAuth()` provider.
- **`npm test` script** (backend) — chains 2 sentinels today (anti-spoofing + media-stripped); D-07 adds the third.
- **`LandlordApplication` schema** (`models/LandlordApplication.js`) — extending status enum is a one-line change; no breaking schema migration required (existing rows untouched until the migration script runs).
- **`LandlordApplicationAuditLog`** — append-only model, already in place; new audit row shapes (`'uid-repair'`, `'uid-orphan-mark'`) are pure additions.
- **`requireBearer` middleware** — already added in commit `768e629` to POST + DELETE + admin/decide. Phase 4 doesn't touch it.

</code_context>

<specifics>
## Specific Ideas

- **The banner does the talking.** D-04's deliberate choice — let `RoleRefreshBanner` carry the user-facing message. The modal closes silently. The banner has been live since Phase 1; users are already trained on its meaning. Adding an `Alert.alert` on top would be redundant.
- **Phone-match recovery is a best-effort safety net, not a guarantee.** D-09 explicitly accepts that if a user has no User record yet (e.g., they signed up with a different phone after the original submit), their old application stays orphaned. The user can re-submit; the active-app guard at `landlordApplicationRoutes.js:94` only blocks based on THEIR uid, so an orphaned row under a different uid won't block them.
- **Diagnostic console.log is gone, but the sentinel and supertest stay.** D-06 + D-07 + D-08 are layered defense-in-depth. The log was a one-shot diagnostic; the sentinel + supertest are permanent invariants.
- **Two atomic chains, backend-first.** D-17 sequencing keeps Phase 5 device walks pointed at a known-clean backend.

</specifics>

<deferred>
## Deferred Ideas

- **Force re-login on 403 (original CARRY-01 wording).** Rejected in D-04 in favor of the lighter `refreshRole() + RoleRefreshBanner` flow. Acceptance criterion "user can recover via tap-to-reload without an app restart" is met without the heavy hand. Re-open if a future audit finds that `refreshRole()` alone leaves the cached Firebase token in a state where a stale role can complete a subsequent action — would point to an AuthContext invariant gap, not a CARRY-01 regression.
- **Race-cell test rig (cells 1.7 + 2.4–2.6 + 5.6 + 5.3).** Deferred to M4+ per memory `phase06-m3-carry-forward.md`. Backend invariants are covered by existing supertests. Coordinated-curl harness or Bluetooth-trigger-pair sync is the right shape but out of scope for Phase 4.
- **Token-revocation backend changes.** Out of scope. M2 Phase 1's `iat < roleRevokedAt` check is the existing trust boundary.
- **CastError → 400 normalization across all routes** (broader MD-03 pattern). Phase 4 scopes to DELETE-only or planner-picked subset; full sweep is Phase 5 hardening or M4+.
- **Audit log clean-up of pre-fix `landlord_application_submit` evt logs in Railway.** Operator may want to grep / archive Railway logs from the diagnostic-active window (2026-04-30 → 2026-05-06) for incident postmortem; out of code scope.
- **Schema-level `mongoose.isValidObjectId` runner** (e.g., a route-level middleware that validates `req.params.id` for every `:id` route). Consideration for a future hardening phase; Phase 4 stays surgical.

</deferred>

---

*Phase: 04-m2-carry-forward-bug-fixes*
*Context gathered: 2026-05-06*

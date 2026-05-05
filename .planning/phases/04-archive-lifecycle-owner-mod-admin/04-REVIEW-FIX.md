---
phase: 04-archive-lifecycle-owner-mod-admin
fixed_at: 2026-05-05T00:00:00Z
review_path: .planning/phases/04-archive-lifecycle-owner-mod-admin/04-REVIEW.md
iteration: 1
findings_in_scope: 3
fixed: 3
skipped: 5
status: all_fixed
---

# Phase 4: Code Review Fix Report

**Fixed at:** 2026-05-05
**Source review:** `.planning/phases/04-archive-lifecycle-owner-mod-admin/04-REVIEW.md`
**Iteration:** 1

**Summary:**
- Findings in scope (Critical + Warning): 3
- Fixed: 3
- Skipped: 5 (Info-level, out of scope for this iteration)

## Fixed Issues

### WR-01: Legacy `deleteProperty` method bypasses Action-union permission check

**Files modified:** `src/services/PropertyService.ts` (RN client repo)
**Commit:** `cb606fe`
**Applied fix:** Deleted the legacy `deleteProperty` alias method entirely. Pre-edit grep across `src/` and `App.tsx` reconfirmed zero callers (the only remaining occurrences are an explanatory comment line referencing the historical name). `hardDeleteListing` is now the sole admin-only delete path, and the comment block above it was updated to record the WR-01 removal.

### WR-02: `before.status: 'unknown'` audit literal lands as `undefined` for legacy null-status listings

**Files modified:** `src/routes/propertyRoutes.js`, `src/routes/moderationRoutes.js` (backend repo at `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services`)
**Commit:** `2fb5639` (backend repo)
**Applied fix:** Replaced `beforeDoc ? beforeDoc.status : 'unknown'` with `beforeDoc?.status ?? 'live'` in both archive handlers' `ModerationLog.create` calls. Aligns with the GET-side coalesce already implemented at `propertyRoutes.js:302` (D-02 sub-clause c) so legacy listings with `beforeDoc.status === undefined` no longer persist `before: {}` in the audit row. Inline comments tag the WR-02 reasoning at both sites. `node --check` passed for both files.

### WR-03: Branch-1 `customClaims.role` test coverage missing for Phase 4 actions

**Files modified:** `src/hooks/__tests__/useRole.test.ts` (RN client repo)
**Commit:** `a5023a6`
**Applied fix:** Added a nested `describe('Branch 1 forward-compat (customClaims.role)')` block at the end of the existing `Phase 4 — Archive Lifecycle action gates` describe. Two regression tests assert: (a) `customClaims.role === 'admin'` grants `hardDeleteListing` despite `backendProfile.userType === 'user'`, and (b) `customClaims.role === 'moderator'` grants `archiveAnyListing` but NOT `hardDeleteListing`. Confirmed `useRole.ts:54` reads `claimRole` for Branch-1 dispatch, so the tests exercise real code paths. `npx jest src/hooks/__tests__/useRole.test.ts` confirms both new tests PASS. (One pre-existing test failure at `useRole.test.ts:106` for `manageListings` plain-user case is unrelated to this fix and predates Phase 4.)

## Skipped Issues

The 5 Info-level findings were out of scope for this iteration per the orchestrator's `fix_scope: critical_warning` configuration. Each is flagged for awareness or deferred refactor and documented below for traceability.

### IN-01: `apiClient.delete` body in legacy `deleteProperty` is wasted bytes

**File:** `src/services/PropertyService.ts:310-313`
**Reason:** out of scope (info-level, deferred). NOTE: this is now obsolete — WR-01 deleted the entire `deleteProperty` method, so the wasted body bytes no longer exist. Effectively closed-by-WR-01.
**Original issue:** The legacy `deleteProperty` still passed `data: { firebaseUid: userData.localId }`. Backend DELETE no longer reads any body field.

### IN-02: `editAsModerator` does not strip `actorUid` / `firebaseUid` from FormData before send

**File:** `src/services/PropertyService.ts:444-453`
**Reason:** out of scope (info-level, deferred). Hygiene-only — backend `moderationRoutes.js:457-458` already strips both defensively.
**Original issue:** Phase 3 `editAsModerator` strips `ownerUid`, `status`, `id`, `_id` but not `actorUid` / `firebaseUid`. Not exploitable.

### IN-03: `submittingAction` gate covers 5 modal actions but no per-action loading state

**File:** `src/screens/PropertyDetailsScreen.tsx:282`
**Reason:** out of scope (info-level, deferred). Defer until M3+ if QA reports user confusion.
**Original issue:** Single boolean disables all 5 mod-action buttons in parallel during a single submission; no per-button spinner discriminator.

### IN-04: `PropertyDetailsScreen.tsx` is 2307 LOC — past complexity threshold

**File:** `src/screens/PropertyDetailsScreen.tsx`
**Reason:** out of scope (info-level, deferred refactor). Out of v1 scope per `<review_scope>` (performance/refactor). Flagged for awareness only.
**Original issue:** Screen accumulated significant surface area; candidate for decomposition into `ModeratorActionFooter`, owner-rejection banner, and `<PropertyDetailsModals>` aggregator.

### IN-05: Test fixture user creation is duplicated across describe blocks

**Files:** `src/__tests__/propertyRoutes.test.js:354-507`, `src/__tests__/moderationRoutes.test.js:415-531` (backend repo)
**Reason:** out of scope (info-level, deferred). Pre-existing pattern, not a Phase 4 regression. Conditional on the global Jest setup's afterEach truncate behavior.
**Original issue:** Each Phase 4 describe re-runs `User.create({uid: 'mod-a-uid', ...})` in `beforeEach`. Risk of `E11000` if cleanup is not exhaustive.

---

_Fixed: 2026-05-05_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_

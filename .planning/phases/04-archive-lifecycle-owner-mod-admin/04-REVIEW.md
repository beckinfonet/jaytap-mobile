---
phase: 04-archive-lifecycle-owner-mod-admin
reviewed: 2026-05-02T00:00:00Z
depth: standard
files_reviewed: 15
files_reviewed_list:
  - /Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/models/Property.js
  - /Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/models/ModerationLog.js
  - /Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/routes/propertyRoutes.js
  - /Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/routes/moderationRoutes.js
  - /Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/__tests__/propertyRoutes.test.js
  - /Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/__tests__/moderationRoutes.test.js
  - /Users/beckmaldinVL/development/mobileApps/JayTap/src/hooks/useRole.ts
  - /Users/beckmaldinVL/development/mobileApps/JayTap/src/hooks/__tests__/useRole.test.ts
  - /Users/beckmaldinVL/development/mobileApps/JayTap/src/types/Property.ts
  - /Users/beckmaldinVL/development/mobileApps/JayTap/src/services/PropertyService.ts
  - /Users/beckmaldinVL/development/mobileApps/JayTap/src/components/ArchiveListingModal.tsx
  - /Users/beckmaldinVL/development/mobileApps/JayTap/src/locales/en.ts
  - /Users/beckmaldinVL/development/mobileApps/JayTap/src/locales/ru.ts
  - /Users/beckmaldinVL/development/mobileApps/JayTap/src/screens/RenterListingsScreen.tsx
  - /Users/beckmaldinVL/development/mobileApps/JayTap/src/screens/PropertyDetailsScreen.tsx
findings:
  critical: 0
  warning: 3
  info: 5
  total: 8
status: issues_found
---

# Phase 4: Code Review Report

**Reviewed:** 2026-05-02
**Depth:** standard
**Files Reviewed:** 15 (4 backend routes/models, 2 backend tests, 9 RN client)
**Status:** issues_found

## Summary

Phase 4 ships a clean, well-instrumented archive-lifecycle implementation across both repos. All five named invariants from the prompt verify GREEN:

- **Race-safety (D-22):** every state-flip uses `Property.findOneAndUpdate` with a status filter — `findById-then-save` is absent from all four new handlers (owner-archive, owner-unarchive, mod-archive, mod-restore).
- **Anti-spoofing (Phase 1 regression class):** all four `ModerationLog.create` call sites set `actorUid: req.firebaseUid` exclusively. A grep for `actorUid: req\.(body|headers)` returns zero hits across both route files. Supertest `actorUid CANNOT be spoofed via body` cases are present for both owner-archive and mod-archive paths.
- **D-13 two-condition unarchive:** the owner `unarchive` filter is `{_id, ownerUid: req.firebaseUid, archivedByUid: req.firebaseUid, status: 'archived'}` — admin-archived listings cannot be self-restored, with 403 NOT_ORIGINAL_ARCHIVER disambiguation on null result.
- **D-15 selective field clears:** both `unarchive` and `restore` clear archive\* fields explicitly via `null` writes and PRESERVE approve/reject history by omission from the `$set` block. The supertest `approval history preserved (D-15)` case asserts `approvedByUid: 'mod-b-uid'` survives a mod-restore.
- **D-18 audit-row write order:** snapshot via `findById().lean()` is captured BEFORE the destructive op in all 5 audit-writing handlers; orphan-tolerant try/catch fallback is present and consistent (structured `moderation_audit_orphan` JSON line).
- **Pitfall 2 admin-DELETE inline-ownership-check removed:** the legacy `if (property.ownerUid !== req.firebaseUid)` block is gone. DELETE is now `verifyFirebaseToken + requireMinRole('admin')` with the HARD_DELETE_REQUIRES_ARCHIVED 400 precondition preserved.
- **Pitfall 6 atomic strip:** `RenterListingsScreen.tsx` contains zero references to `handleDeleteProperty`, `propertyToDelete`, `deleteModalVisible`, or `DeleteListingModal`.
- **Pitfall 4 conditional gate:** `onUnarchive={canSelfRestore(item) ? handleUnarchiveProperty : undefined}` — owner sees no restore affordance on mod-archived listings.
- **Pitfall 7 dark-mode chip contrast:** `ArchiveListingModal` preserves `selectedTextColor = isDark ? '#121212' : '#FFFFFF'` verbatim from RejectListingModal.
- **D-19 net-zero App.tsx:** App.tsx is exactly 1191 LOC.
- **Locale parity:** en.ts and ru.ts each have 254 keys; ru.ts uses `Record<TranslationKeys, string>` for compile-time parity enforcement.

The findings below are non-blocking polish issues. None compromise the security/correctness invariants.

## Warnings

### WR-01: Legacy `deleteProperty` method bypasses Action-union permission check

**File:** `/Users/beckmaldinVL/development/mobileApps/JayTap/src/services/PropertyService.ts:303-323`
**Issue:** `PropertyService.deleteProperty` (kept as a "backwards-compat alias" per the comment at line 284) issues `apiClient.delete('/properties/${propertyId}')` with NO `canFromUser(userData, 'hardDeleteListing')` guard. Every other Phase 4 lifecycle method (`archiveOwnListing`, `archiveAnyListing`, `restoreListing`, `hardDeleteListing`) gates with `canFromUser` first. The backend's new admin-only `requireMinRole('admin')` middleware now blocks any non-admin caller with 403, so this is not exploitable in production — but a non-admin caller invoking `deleteProperty` will see a generic 403 axios error rather than the structured `PermissionDeniedError` translated by `t('errors.permissionDenied')`. A grep across `src/` and `App.tsx` shows zero active call sites for `deleteProperty`, so this method is effectively dead code that risks reintroducing the bypass if a future caller picks the convenient name.

**Fix:** Either delete the method entirely (no callers found) or add the same `canFromUser` guard:

```typescript
deleteProperty: async (propertyId: string) => {
  const userData = await AuthService.getUserData();
  if (!canFromUser(userData, 'hardDeleteListing')) {
    console.error('[PropertyService.deleteProperty] permission denied', { userId: userData?.localId });
    throw new PermissionDeniedError();
  }
  // ... rest unchanged
},
```

Recommended: delete the method and any imports that reference it. Backwards-compat is unneeded — there are no callers.

### WR-02: `before.status: 'unknown'` audit literal will land as `undefined` for legacy null-status listings

**File:** `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/routes/propertyRoutes.js:583` and `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/routes/moderationRoutes.js:278`
**Issue:** Both archive handlers compute the audit-log `before.status` via:

```javascript
before: { status: beforeDoc ? beforeDoc.status : 'unknown' }
```

The intent (per the inline comment) is to fall back to the literal `'unknown'` when no document was loaded. But the actual failure mode for legacy listings is `beforeDoc` is truthy — it just has `beforeDoc.status === undefined` because the field wasn't written before the Phase 2 `'pending'` default landed. The current expression returns `undefined` (not `'unknown'`) for legacy listings, and the audit row persists `before: { status: undefined }`, which Mongoose stores as `before: {}`. The forward-fit M3+ audit UI then sees an empty `before` object instead of the legacy-aware `'live'` coalesce documented at `propertyRoutes.js:302` (D-02 sub-clause c).

**Fix:** Coalesce both undefined-doc AND undefined-status to the same documented fallback. Recommend `'live'` (matching the GET coalesce) over `'unknown'`:

```javascript
before: { status: beforeDoc?.status ?? 'live' }
```

This aligns with the D-02 sub-clause (c) "legacy null status coalesces to 'live'" already implemented at `propertyRoutes.js:302`, keeping the audit log internally consistent with the read-side surface. Same one-line fix applies to both files.

### WR-03: `useRole.canFromUser` switch is missing `archiveOwnListing` and other Action-union members in test coverage for the `customClaims.role` Branch-1 path

**File:** `/Users/beckmaldinVL/development/mobileApps/JayTap/src/hooks/__tests__/useRole.test.ts:160-229`
**Issue:** The Phase 4 tests cover `archiveOwnListing` / `archiveAnyListing` / `hardDeleteListing` only via Branch 2 (backendProfile.userType). The Branch-1 forward-compat `customClaims.role === 'admin'` cases are tested only for `editVerifications`. If a future `customClaims.role === 'moderator'` token arrives, `archiveAnyListing` should grant — but there's no regression test asserting that. Phase 1's regression class ("verifier missed cross-plan integration regressions") is exactly this kind of coverage gap.

**Fix:** Add three cases to the existing `Phase 4 — Archive Lifecycle action gates` describe block:

```typescript
test('Branch 1 forward-compat: customClaims.role === "admin" grants hardDeleteListing', () => {
  const customClaimAdmin = {
    backendProfile: { userType: 'user', customClaims: { role: 'admin' } },
  };
  expect(canFromUser(customClaimAdmin, 'hardDeleteListing')).toBe(true);
});

test('Branch 1: customClaims.role === "moderator" grants archiveAnyListing but NOT hardDeleteListing', () => {
  const customClaimMod = {
    backendProfile: { userType: 'user', customClaims: { role: 'moderator' } },
  };
  expect(canFromUser(customClaimMod, 'archiveAnyListing')).toBe(true);
  expect(canFromUser(customClaimMod, 'hardDeleteListing')).toBe(false);
});
```

This locks the Branch-1 forward-compat behavior for the new actions without changing implementation.

## Info

### IN-01: `apiClient.delete` body in legacy `deleteProperty` is wasted bytes after admin-only swap

**File:** `/Users/beckmaldinVL/development/mobileApps/JayTap/src/services/PropertyService.ts:310-313`
**Issue:** The legacy `deleteProperty` still passes `data: { firebaseUid: userData.localId }`. Backend `propertyRoutes.js` DELETE no longer reads any body field — auth is purely from the JWKS-verified Bearer (`req.firebaseUid`). The legacy body is wasted bytes and a contract-leak risk per the same reasoning called out for body-status in `createProperty:75-78`.
**Fix:** Either delete the method (preferred per WR-01) or strip the body parameter.

### IN-02: `editAsModerator` does not strip `actorUid` / `firebaseUid` from FormData before send

**File:** `/Users/beckmaldinVL/development/mobileApps/JayTap/src/services/PropertyService.ts:444-453`
**Issue:** The Phase 3 `editAsModerator` strips `ownerUid`, `status`, `id`, `_id` from the FormData but not `actorUid` or `firebaseUid`. Backend `moderationRoutes.js:457-458` defensively strips both, so this is not exploitable. Hygiene-only — keeps client and server defensive lists symmetric.
**Fix:**

```typescript
if (key === 'ownerUid' || key === 'status' || key === 'id' || key === '_id'
    || key === 'actorUid' || key === 'firebaseUid') return;
```

### IN-03: `submittingAction` gate covers 5 modal actions but no per-action loading state

**File:** `/Users/beckmaldinVL/development/mobileApps/JayTap/src/screens/PropertyDetailsScreen.tsx:282`
**Issue:** A single `submittingAction` boolean disables all 5 mod-action buttons (approve/reject/archive/restore/hard-delete) at once. A user submitting Archive sees Approve, Reject, Edit-on-behalf, Restore, and Hard-Delete all disabled in parallel. This is correct behavior (prevents double-fire across actions during a network round-trip), but the spinner only renders inside the modal that's open — the inline TouchableOpacity dim-out gives no visual feedback that "submitting" is the reason. Low-priority polish.
**Fix:** Add an action-discriminator state if user feedback warrants:

```typescript
const [submittingAction, setSubmittingAction] = useState<null | 'approve' | 'reject' | 'archive' | 'restore' | 'delete'>(null);
```

Then check `submittingAction === 'archive'` for per-button spinner rendering. Defer until M3+ if no QA report cites confusion.

### IN-04: `PropertyDetailsScreen.tsx` is 2307 LOC — past the screen-component complexity threshold

**File:** `/Users/beckmaldinVL/development/mobileApps/JayTap/src/screens/PropertyDetailsScreen.tsx`
**Issue:** The screen has accumulated significant surface area across phases (mod-footer, archive-footer, banners, role-aware actions, modals). This file is now near 2.3k LOC. CLAUDE.md notes ad-hoc fixes should keep "the three-category taxonomy and role-gating API shape intact" — this file is fine functionally but is becoming a refactor target. Phase 4's additions (~80 LOC) are well-scoped and don't worsen the issue, but the screen is approaching the limit where future cross-plan changes will be hard to review.
**Fix:** Defer to a future cleanup phase. Candidate decomposition:
- Extract `ModeratorActionFooter` component (lines 1454-1535).
- Extract owner-rejection banner mount.
- Pull modal sibling mounts into a `<PropertyDetailsModals>` aggregator.

Out of v1 scope per `<review_scope>` (performance/refactor) — flagged for awareness only.

### IN-05: Test fixture user creation is duplicated across describe blocks; no shared `beforeAll`

**File:** `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/__tests__/propertyRoutes.test.js:354-507` and `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/__tests__/moderationRoutes.test.js:415-531`
**Issue:** Each Phase 4 describe block in both test files re-runs `User.create({uid: 'mod-a-uid', ...})` etc. inside `beforeEach`. There's some risk of `E11000 duplicate key` if Mongo state isn't fully cleaned between tests — depends on the global Jest setup file's afterEach hook. This is not a Phase 4 regression — pre-existing pattern — but the new Phase 4 blocks compound it.
**Fix:** Verify the global test setup truncates collections in `afterEach`. If yes, no action needed. If not, lift the user creation to a per-file `beforeAll` and only seed Property fixtures in `beforeEach`.

---

_Reviewed: 2026-05-02_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_

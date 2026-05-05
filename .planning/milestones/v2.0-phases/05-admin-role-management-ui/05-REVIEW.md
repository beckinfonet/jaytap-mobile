---
phase: 05-admin-role-management-ui
reviewed: 2026-05-03T14:00:00Z
depth: standard
files_reviewed: 9
files_reviewed_list:
  - App.tsx
  - src/components/RoleChangeModal.tsx
  - src/hooks/__tests__/useRole.test.ts
  - src/hooks/useRole.ts
  - src/locales/en.ts
  - src/locales/ru.ts
  - src/screens/ProfileScreen.tsx
  - src/screens/RoleManagementScreen.tsx
  - src/services/UserService.ts
findings:
  critical: 0
  warning: 4
  info: 5
  total: 9
status: issues_found
---

# Phase 5: Code Review Report

**Reviewed:** 2026-05-03T14:00:00Z
**Depth:** standard
**Files Reviewed:** 9
**Status:** issues_found

## Summary

Phase 5 admin role management ships a clean implementation that closely follows the established Phase 3/4 fork pattern (RoleManagementScreen ← ModerationQueueScreen, RoleChangeModal ← RejectListingModal, UserService ← PropertyService). The 3-layer belt-and-suspenders gating (`<Gated>` UX → `canFromUser` service guard → backend `requireMinRole`) is consistently applied. EN+RU i18n parity is intact for all 22 new `admin.roles.*` keys. Theme tokens are used throughout (no hardcoded colors). Test coverage for `manageRoles` action gate is present.

No critical or security issues were found. Findings are limited to UX edge cases (display-name fallback duplicates the email in the modal subtitle), minor error-handling gaps (`PermissionDeniedError` thrown mid-`handleRoleSubmit` collapses to a misleading "Network error" toast), and a handful of code-quality items (magic number for the page-size hint, deeply nested ternary, redundant Modal `visible` prop, inconsistent type-safety for `currentUser.localId`).

The `App.tsx` wiring mirrors the Moderation Queue overlay pattern exactly (OVERLAY_FLAGS membership, back-handler branch ordering, ProfileScreen prop passing with `canManageRoles` gate). One Info-level note: unlike the Landlord Application overlays, Role Management's hardware-back lands on Home rather than returning to Profile — this matches the Moderation Queue precedent and is likely intentional, but worth confirming against UI-SPEC.

## Warnings

### WR-01: Display-name fallback duplicates email in modal subtitle

**File:** `src/components/RoleChangeModal.tsx:75-79`
**Issue:** When the target user has no `firstName` AND no `lastName`, `displayName` falls back to `user.email`. The `targetIdentity` string is then interpolated as `"{displayName} — {email}"` → `"foo@bar.com — foo@bar.com"` (email shown twice). Affects every `user`-roled record migrated without name fields and any backend record where names were never collected.
**Fix:**
```tsx
const hasName = !!(user.firstName || user.lastName);
const displayName = hasName
  ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
  : user.email;
const targetIdentity = hasName
  ? t('admin.roles.modal.targetIdentity', { displayName, email: user.email })
  : user.email;
```
The same fallback also bleeds into the confirm-prompt at lines 160-164 ("Change foo@bar.com from User to Admin?"), which is acceptable but inconsistent with the subtitle.

### WR-02: `handleRoleSubmit` collapses `PermissionDeniedError` to "Network error" toast

**File:** `src/screens/RoleManagementScreen.tsx:122-154`
**Issue:** If the admin's role is revoked mid-flight (apiClient interceptor surfaces `PermissionDeniedError` from the role-revoked retry path, or `UserService.setUserRole`'s pre-HTTP `canFromUser` guard throws), the catch block falls through every `code === '...'` branch into the final `else { setModalErrorCode('NETWORK') }`. The user sees "Network error. Please try again." even though the real cause is permission loss. Compare to `runSearch` (lines 82-86) which handles this correctly.
**Fix:**
```ts
} catch (err: any) {
  if (err instanceof PermissionDeniedError || err?.message === 'E_PERMISSION_DENIED') {
    setSelectedUser(null);
    Alert.alert(t('common.error'), t('errors.permissionDenied'));
    onBack();
    return;
  }
  const code = err?.response?.data?.code as string | undefined;
  // ... existing branches
}
```

### WR-03: Type assertion bypasses `currentUser` typing instead of fixing it

**File:** `src/screens/RoleManagementScreen.tsx:157`
**Issue:** `item.uid === (currentUser as any).localId` casts away the type. The `useAuth()` user type does include `localId` (verified via `AuthContext.tsx:80,116` and the `BackendUser` shape used elsewhere). The `as any` cast is unnecessary and silences the very type-safety guard that would catch a future `localId` rename — directly relevant given the prior Phase 4.5 uid-mismatch incident captured in MEMORY.md.
**Fix:**
```ts
const isSelf = (item: AdminUserListItem) =>
  !!currentUser?.localId && item.uid === currentUser.localId;
```
If TypeScript still complains, narrow the `useAuth` return type instead of casting.

### WR-04: Debounce timer can fire `setLoading`/`setItems` after unmount

**File:** `src/screens/RoleManagementScreen.tsx:99-107`
**Issue:** The cleanup clears the pending `setTimeout`, but if a search is already in-flight when the component unmounts (e.g., admin taps Back during a slow search), the awaited `UserService.searchUsers` promise resolves later and calls `setItems`/`setLoading` on an unmounted component. The `requestIdRef` guard inside `runSearch` only deduplicates concurrent searches; it does not detect unmount. React 18 silently no-ops these calls today, but the pattern is fragile and inconsistent with `ProfileScreen.tsx:120,131` which uses a `cancelled` ref.
**Fix:** Add an `isMountedRef` and gate state writes in `runSearch`, mirroring the pattern at `ProfileScreen.tsx:65-77`:
```ts
const isMountedRef = useRef(true);
useEffect(() => {
  return () => { isMountedRef.current = false; };
}, []);
// inside runSearch: if (myId !== requestIdRef.current || !isMountedRef.current) return;
```

## Info

### IN-01: Magic number `50` duplicated between service and screen

**File:** `src/services/UserService.ts:48` and `src/screens/RoleManagementScreen.tsx:217`
**Issue:** `limit: 50` in `searchUsers` and `items.length === 50` for `showRefineHint` are not coupled. Changing the backend cap requires editing both files, and a silent drift would hide the refine hint or show it on every load.
**Fix:** Export `SEARCH_RESULT_LIMIT` from `UserService.ts` and import it in `RoleManagementScreen`:
```ts
// UserService.ts
export const SEARCH_RESULT_LIMIT = 50;
// ...params: { query, limit: SEARCH_RESULT_LIMIT }

// RoleManagementScreen.tsx
const showRefineHint = items.length === SEARCH_RESULT_LIMIT;
```

### IN-02: Deeply nested ternary for `errorMessage` is hard to read

**File:** `src/components/RoleChangeModal.tsx:88-98`
**Issue:** Five-level nested ternary mapping `errorCode` to localized copy. Adding a new error code requires inserting another nesting level and re-reading the chain to confirm the formatting.
**Fix:** Convert to a small lookup object or switch statement:
```ts
const ERROR_KEYS: Record<RoleChangeErrorCode, TranslationKeys> = {
  NETWORK: 'admin.roles.error.network',
  SELF_MUTATION: 'admin.roles.error.selfMutation',
  ROLE_ALREADY_CHANGED: 'admin.roles.error.roleAlreadyChanged',
  USER_NOT_FOUND: 'admin.roles.error.userNotFound',
  LAST_ADMIN_LOCKOUT: 'admin.roles.error.lastAdminLockout.body', // (handled in parent Alert)
};
const errorMessage = errorCode ? t(ERROR_KEYS[errorCode]) : '';
```
Note: `LAST_ADMIN_LOCKOUT` is intentionally never passed to the modal per D-09 (parent routes it to `Alert.alert`); document that invariant in the lookup if added.

### IN-03: Redundant `Modal visible={!!user}` after early-null return

**File:** `src/components/RoleChangeModal.tsx:73,101`
**Issue:** Line 73 already does `if (!user) return null;`, so by the time the JSX runs `user` is guaranteed truthy and `visible={!!user}` is always `true`. Reads as if dynamic visibility were the dismissal mechanism, but the actual dismissal is the parent-driven unmount.
**Fix:** `<Modal visible transparent animationType="fade" onRequestClose={onClose}>` (or pass `visible={true}` explicitly).

### IN-04: Empty Alert title relies on iOS-specific rendering

**File:** `src/screens/RoleManagementScreen.tsx:129`
**Issue:** `Alert.alert('', t('admin.roles.success.toast'))` shows an empty string as the title. iOS renders this cleanly (looks toast-like); Android shows an empty title bar with extra vertical whitespace. The Phase 3 `ModerationQueueScreen` precedent (cited in 05-PATTERNS.md) uses the same trick, so this is consistent — but it is still an Android polish item worth noting.
**Fix:** Either accept the inconsistency (matches Phase 3) or use `t('common.success')` as the title for Android parity.

### IN-05: Hardware-back from Role Management lands on Home, not Profile

**File:** `App.tsx:336-340,549-552`
**Issue:** `onProfileOpenRoleManagement` closes Profile (`setIsProfileOpen(false)`) before opening Role Management, and the back-handler at line 336-340 simply closes the overlay. Result: Back from Role Management collapses to Home, not Profile. This matches the Moderation Queue pattern (line 332-335) and is therefore consistent — but it diverges from the Landlord Application pattern (line 323-330,341-348) which uses `returnToProfileAfter*` to hop back to Profile.
**Fix:** None required if intentional. If the UI-SPEC expects symmetry with Landlord Application's "back to Profile" behavior, add a `returnToProfileAfterRoleManagement` flag mirroring `returnToProfileAfterLandlordApplicationQueue`. Worth a UX gut-check during edge-case QA.

---

_Reviewed: 2026-05-03T14:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_

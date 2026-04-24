---
phase: 03-role-gating-precursor
review_depth: standard
reviewer_model: sonnet
reviewed_at: 2026-04-23T12:00:00Z
files_reviewed: 13
status: findings
finding_counts:
  blocker: 0
  critical: 0
  high: 0
  medium: 1
  low: 3
---

# Phase 03: Code Review Report

**Phase:** 03-role-gating-precursor
**Depth:** standard
**Files Reviewed:** 13
**Status:** findings (1 medium, 3 low — no blockers or criticals)

## Summary

The Phase 3 role-gating implementation is structurally sound. All four D-14 grep invariants hold on the live tree, the D-09 preserve-on-save invariant is confirmed, the D-03 priority ladder is correctly implemented and tested, and the service-layer guard correctly uses `can('editVerifications')` rather than the initially-specified `can('editMatterportUrl')` (the Q1 resolution is correct and intentional). One medium finding concerns the `errors.permissionDenied` i18n key being defined but unused at any runtime call site. Three low findings cover: a raw technical token surfaced in an edge-case alert, a missing `|| exit 1` on `cd` in the CI script, and no test coverage for the M2-forward-compat moderator code paths.

---

## Findings

### Medium

#### M-01: `errors.permissionDenied` i18n key defined but never called via `t()`

**File:** `src/screens/CreateListingScreen.tsx:333`
**Also:** `src/hooks/useRole.ts:27` (JSDoc documents the intended usage)

**Issue:** The `errors.permissionDenied` key was added to both `en.ts` and `ru.ts` per D-18, and the `PermissionDeniedError` JSDoc correctly instructs callers to use `t('errors.permissionDenied')`. However, the only catch site that could receive a `PermissionDeniedError` — the `verificationOnly` error handler at `CreateListingScreen.tsx:332-334` — uses the raw `error.message` fallback path:

```typescript
const msg = error.response?.data?.message || error.message;
Alert.alert(t('common.error'), msg || t('createListing.updateFailed'));
```

If the UI-layer guard at line 321 (`if (!propertyToEdit?.id || !can('editVerifications')) return;`) is somehow bypassed and the service guard fires, the user sees the raw technical string `"E_PERMISSION_DENIED"` in the Alert rather than the localized sentence.

**Context:** In normal operation this path is unreachable by non-admins because the UI guard returns early before calling the service. The service guard is defense-in-depth only. This is a low-probability UX gap, not a security gap.

**Recommendation:** Add an explicit check in the catch block for the error token before falling back to the raw message:

```typescript
} catch (error: any) {
  const msg = error.message === 'E_PERMISSION_DENIED'
    ? t('errors.permissionDenied')
    : (error.response?.data?.message || error.message);
  Alert.alert(t('common.error'), msg || t('createListing.updateFailed'));
}
```

This consumes the i18n key that D-18 was specifically designed to provide.

---

### Low

#### L-01: `scripts/check-role-grep.sh` — `cd` failure is silently swallowed

**File:** `scripts/check-role-grep.sh:11`

**Issue:** The script changes to the repo root via:

```bash
cd "$(dirname "$0")/.."
```

There is no `|| exit 1` guard. If `dirname` produces an unexpected path or the filesystem is in an unusual state, `cd` fails silently (the error goes to stderr) and the subsequent greps run against whatever the current working directory is, potentially returning false-positive "all OK" results on the wrong tree.

**Context:** In practice the script is always run from the repo root or via `./scripts/check-role-grep.sh`, so `$(dirname "$0")/..` reliably resolves. This is a robustness nit rather than a real risk.

**Recommendation:**

```bash
cd "$(dirname "$0")/.." || { echo "ERROR: could not cd to repo root" >&2; exit 1; }
```

#### L-02: `canFromUser` switch has no `default` case — future `Action` additions silently return `undefined`

**File:** `src/hooks/useRole.ts:80-95`

**Issue:** The `canFromUser` switch covers all 7 current `Action` literals exhaustively (TypeScript will enforce this as long as the union is finite). However, there is no `default` branch. If a future developer adds a new action to the `Action` union without adding a corresponding `case` in the switch, TypeScript will report an error on `canFromUser`'s `boolean` return type — but only if `strictNullChecks` and `noImplicitReturns` are both enabled. Without those flags, the function silently returns `undefined` (coerced to `false` at call sites), which is a latent gate-open risk if the omitted action is a permissive one.

**Context:** This is a future-facing concern; no current `Action` is unhandled. The TypeScript config was not checked here.

**Recommendation:** Add a default that returns `false` and documents the intent:

```typescript
default:
  // Unrecognized action — deny by default (fail-closed).
  return false;
```

This is the correct fail-closed behavior and makes the function safe regardless of compiler strictness settings.

#### L-03: Priority-ladder Branch 1 (customClaims) has no unit test coverage

**File:** `src/hooks/__tests__/useRole.test.ts`

**Issue:** The `deriveRole` priority-ladder Branch 1 (`user?.backendProfile?.customClaims?.role`) is present in `useRole.ts:50-53` and is intended to activate in M2. The test suite covers branches 2 (userType admin), 3 (allowlist), and 4 (guest), but has no test asserting that a user with `backendProfile.customClaims.role = 'admin'` is granted admin before the allowlist check. If the M2 implementation ever accidentally breaks this priority ordering, no test will catch it.

**Context:** Branch 1 is deliberately dead code in M1 and the RESEARCH doc notes that `/* istanbul ignore next */` is a discretionary option. This is a test-coverage gap rather than a correctness bug today.

**Recommendation:** Add a test case for Branch 1 readiness:

```typescript
test('customClaims.role takes priority over userType (branch 1 — M2 path)', () => {
  const claimsAdmin = {
    email: 'c@example.com',
    backendProfile: { userType: 'user', customClaims: { role: 'admin' } },
  };
  expect(canFromUser(claimsAdmin, 'editVerifications')).toBe(true);
});
```

This costs one test and protects the priority-order contract when Branch 1 activates in M2.

---

## Nothing to Flag

The following invariants and design requirements were verified clean during review:

- **D-10 canonical action at submit payload (CreateListingScreen.tsx:398):** Uses `can('editVerifications')`, not `can('editMatterportUrl')`. The Q1 resolution documented in 03-05-SUMMARY is correct — the payload branch gates `platformVerifications` only; Matterport/panoramic values flow unconditionally per D-09.

- **D-09 preserve-on-save:** `panoramicPhotosUrl` (line 392) and `tours` (line 396) are spread into the submit payload OUTSIDE the `can('editVerifications')` branch. Non-admin saves on admin-curated listings will not blank existing tour URLs.

- **D-14 grep invariants (all 4):** Live tree passes `./scripts/check-role-grep.sh` at exit 0. Zero `userType === 'admin'` outside `useRole.ts`; `backendProfile.userType` confined to `useRole.ts`; allowlist identifiers confined to their two files; `isAllowlistedAdmin` symbol confined to definition + single consumer.

- **Panoramic wrap scope (RESEARCH §2.2):** The `<Gated action="editPanoramicUrl">` wraps only the panoramic `TextInput` — `videoUrl` and `instagramUrl` inputs remain sibling elements, visible to all authenticated users. Verified via source read (CreateListingScreen.tsx:836-867).

- **D-13 display-only userType in ProfileScreen:** `const [userType, setUserType]` state declaration (line 28) and `setUserType(profile.userType || '')` setter call (line 72) are untouched. Only the gating derivation (`canManageListings`) was migrated to `can('manageListings')`. Confirmed.

- **D-03 priority ladder order:** `deriveRole` in `useRole.ts:43-71` implements customClaims → userType → allowlist → guest exactly as specified. All currently-reachable branches (2, 3, 4) tested and GREEN.

- **Service guard correctness (D-17):** `PropertyService.patchPlatformVerifications:203-206` checks `!canFromUser(userData, 'editVerifications')`, emits `console.error` with `[PropertyService.patchPlatformVerifications]` prefix + `userId` context, then throws `new PermissionDeniedError()` (default message `'E_PERMISSION_DENIED'`). Guard placement is after the existing `!userData?.localId` authentication check, preserving the "authenticated first, then authorized" sequence.

- **D-15 scope (one guarded method):** Only `patchPlatformVerifications` imports `canFromUser`/`PermissionDeniedError` in `PropertyService.ts`. `createProperty`, `updateProperty`, and `deleteProperty` are unguarded per design.

- **React-free service invariant:** `PropertyService.ts` imports `canFromUser` from `../hooks/useRole` without pulling in any React runtime. Confirmed zero `import.*from 'react'` in the file.

- **i18n parity:** Both `src/locales/en.ts:399` and `src/locales/ru.ts:402` contain `'errors.permissionDenied'` with appropriate text. TypeScript's `Record<TranslationKeys, string>` typing enforces compile-time parity. Key-set diff is empty.

- **i18n namespace note (pre-existing, not a Phase 3 issue):** The new key uses plural prefix `errors.` while pre-existing keys use singular `error.`. Both namespaces coexist under the `// Errors` comment without collision. This inconsistency predates Phase 3 and is documented in 03-03-SUMMARY; out of scope for this review.

- **`Gated` fallback behavior:** Default `fallback={null}` correctly hides gated content entirely (D-08 "hide entirely" posture). Explicit `fallback` prop is supported. Three tests verify render/hide/fallback behavior.

- **Security posture documentation:** `src/constants/adminAllowlist.ts:8-10` explicitly documents that bundle-visible emails are not a security claim and that the Railway backend must independently verify admin status. No code in Phase 3 suggests otherwise. Backend enforcement is correctly documented as accepted risk (D-22 Path B) in PROJECT.md Key Decisions.

- **`jest.setup.js` scope:** Five native-module stubs (AsyncStorage, KeyboardController, maps, webview, svg, image-picker) are minimal and non-over-engineered. Each mock surfaces only what the source files actually import.

- **D-06 email normalization:** `isAllowlistedAdmin` normalizes via `trim().toLowerCase()` before `includes()`. Case-insensitive and whitespace-trimmed tests are GREEN.

---

_Reviewed: 2026-04-23_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_

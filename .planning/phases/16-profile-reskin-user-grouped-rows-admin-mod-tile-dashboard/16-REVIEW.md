---
phase: 16-profile-reskin-user-grouped-rows-admin-mod-tile-dashboard
reviewed: 2026-05-31T00:00:00Z
depth: standard
files_reviewed: 10
files_reviewed_list:
  - src/components/profile/ProfileRow.tsx
  - src/components/profile/ProfileTile.tsx
  - src/components/profile/ProfileToolTile.tsx
  - src/components/profile/IdentityCard.tsx
  - src/components/profile/RoleBadge.tsx
  - src/components/profile/OutlinedLogoutPill.tsx
  - src/components/LandlordApplicationStatusBanner.tsx
  - src/locales/en.ts
  - src/locales/ru.ts
  - src/screens/ProfileScreen.tsx
findings:
  critical: 0
  warning: 2
  info: 5
  total: 7
status: issues_found
---

# Phase 16: Code Review Report

**Reviewed:** 2026-05-31
**Depth:** standard
**Files Reviewed:** 10
**Status:** issues_found

## Summary

Phase 16 ships 6 additive primitives (`ProfileRow`, `ProfileTile`, `ProfileToolTile`, `IdentityCard`, `RoleBadge`, `OutlinedLogoutPill`), 17 new EN+RU i18n keys, a 3-hex → 3-token swap in `LandlordApplicationStatusBanner`, and a wholesale `ProfileScreen.tsx` rewrite into role-discriminated layouts. The implementation is mostly clean and meets the phase's structural gates.

**Gates verified PASS:**

- **CR-02 cooldown preservation:** all four guard pieces are intact in `ProfileScreen.tsx` — the `60_000` ms gate (line 154), `lastCountFetchAt = useRef<number | null>(null)` (line 148), `moderationCountRefreshKey` in the self-fetch effect's dep array (line 141), and `AppState.addEventListener('change', ...)` with `sub.remove()` cleanup (lines 160-161).
- **`keyboardVerticalOffset` grep gate:** 0 hits across `src/` (KBD-02 invariant preserved).
- **EN+RU i18n parity:** 17 Phase 16 keys (`profile.section.*` ×5, `profile.staffBadge.*` ×2, `profile.tile.*` ×4, `profile.tool.*` ×6) — identical key sets in both locales, diff returns clean.
- **Theme tokens vs hex literals:** 0 hex literals in code across the 10 reviewed files. The 3 hits in `LandlordApplicationStatusBanner.tsx` (lines 11 comment, 114, 122) are all inside JSDoc/inline comments referencing historical M3 values; runtime paths use `colors.landlordGreen` / `colors.warning` / `colors.destructiveRed`. All eight tokens consumed (`accent`, `accentSoft`, `onAccent`, `iconChipFg`, `hair2`, `surface`, `surface2`, `landlordGreen`, `warning`, `destructiveRed`, `border`, `textSecondary`, `textTertiary`, `text`) exist in BOTH `colors.light` and `colors.dark`.
- **9 nav-handler props:** all wired with identical names in `App.tsx` lines 873-884 (`onBack`, `onCreateListing`, `onViewListings`, `onViewFavorites`, `onViewAppointments`, `onViewAccountSettings`, `onApplyLandlord`, `onReviewLandlordApplications`, `onReviewModerationQueue`, `onOpenRoleManagement`, `moderationCountRefreshKey`).
- **`LandlordApplicationStatusBanner` mount:** rendered exactly once in `ProfileScreen.tsx:332`, gated by `onApplyLandlord` truthiness (always passed from `App.tsx:880`). Staff self-suppression at the component's own line 88 (`if (isAdmin || isModerator) return null`) handles the admin/mod hide; both ProfileScreen layouts hit that mount site before the role-discriminated body branch.
- **No `App.tsx` changes:** confirmed by `git status` — only `ios/JayTap.xcodeproj/project.pbxproj` is dirty.

Findings below are all minor — 2 warnings on documentation/code drift and TypeScript escape hatches, plus 5 information-level UX/a11y observations.

## Warnings

### WR-01: Misleading dep-array comment in LandlordApplicationStatusBanner

**File:** `src/components/LandlordApplicationStatusBanner.tsx:60-85`
**Issue:** The JSDoc comment block immediately above the effect (lines 58-62) states *"Dep is `[user?.localId]` so the refresh's setUser doesn't re-trigger the effect."* But the actual deps on line 85 are `[user?.localId, refreshRole]`. The code works correctly today because `refreshRole` is `useCallback`-memoized in `AuthContext` (line 216 of `AuthContext.tsx`), so its identity is stable. However:
1. If anyone later un-memoizes `refreshRole` (or adds a non-stable dep to its `useCallback`), this effect will re-run on every render, refetching `LandlordApplicationService.getMine()` and calling `refreshRole()` in a loop.
2. The comment-vs-code drift makes the actual contract invisible to future reviewers / linters.

**Fix:** Either update the comment to reflect the real dep array, or drop `refreshRole` from deps (relying on the stable identity contract explicitly) with an `eslint-disable-next-line react-hooks/exhaustive-deps` annotation:

```tsx
// Actually deps are [user?.localId, refreshRole]; refreshRole is memoized in
// AuthContext so it's effectively stable. If you change AuthContext.refreshRole's
// useCallback deps, audit this effect for refetch storms.
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [user?.localId]);
```

Or — cleaner — keep the deps but match the comment.

### WR-02: `as any` cast on i18n key in LandlordApplicationStatusBanner rejected branch

**File:** `src/components/LandlordApplicationStatusBanner.tsx:120-121`
**Issue:** The rejected-state `body` construction casts to `any` to bypass `TranslationKeys`:

```tsx
body = state.reasonNote
  ? `${t(`landlordApp.rejectReason.${state.reasonCode || 'other'}` as any)} — ${state.reasonNote}`
  : t(`landlordApp.rejectReason.${state.reasonCode || 'other'}` as any);
```

`RejectionReasonCode` is the union `'incomplete-info' | 'invalid-id' | 'duplicate' | 'other'`, so the actual key set is bounded. The `as any` cast loses type-checking — a future rename of any `landlordApp.rejectReason.*` key would not surface here at compile-time and would silently render a missing-translation placeholder.

**Fix:** Replace `as any` with `as TranslationKeys`. Since `state.reasonCode` is one of the four `RejectionReasonCode` literals (or null falling back to `'other'`), all four resulting strings are valid `TranslationKeys` (verified at `src/locales/en.ts:560-563` and `ru.ts:562-565`).

```tsx
import type { TranslationKeys } from '../locales/en';
// ...
const key = `landlordApp.rejectReason.${state.reasonCode || 'other'}` as TranslationKeys;
body = state.reasonNote ? `${t(key)} — ${state.reasonNote}` : t(key);
```

This restores the parity-gate guarantee that adding/renaming an EN key surfaces at the call-site.

## Info

### IN-01: ProfileScreen back-button missing a11y annotations

**File:** `src/screens/ProfileScreen.tsx:305-307`
**Issue:** The header back-button TouchableOpacity has no `accessibilityRole="button"` and no `accessibilityLabel`. The `←` Text child is a Unicode arrow glyph, not a meaningful screen-reader announcement. Likely pre-existing (the rewrite preserved the prior chrome verbatim), but the rewrite was an opportunity to fix it.

**Fix:**

```tsx
<TouchableOpacity
  onPress={onBack}
  style={styles.iconButton}
  accessibilityRole="button"
  accessibilityLabel={t('common.back')}
>
  <Text style={{ fontSize: 24, color: colors.accent }}>←</Text>
</TouchableOpacity>
```

`common.back` already exists in both locales (`en.ts:3`, `ru.ts:5`).

### IN-02: IdentityCard accessibilityLabel can be empty string

**File:** `src/components/profile/IdentityCard.tsx:55`
**Issue:** `accessibilityLabel={email}` where `email` is the prop. ProfileScreen passes `email={user?.email ?? ''}` (line 319), so for an authenticated session where `user.email` is somehow null/undefined, screen readers announce an empty button. The visual avatar fallback already handles empty-email (defaults to `'U'`), but the a11y label has no fallback.

**Fix:** Provide a fallback label:

```tsx
accessibilityLabel={email || t('profile.myProfile')}
```

(Requires plumbing `t()` into the primitive, or accepting the fallback string as a prop; alternatively use a generic `accessibilityLabel={email || 'Profile'}` and let the caller localize.)

### IN-03: Dead-tap accessible buttons when handler props are undefined

**File:** `src/screens/ProfileScreen.tsx:322, 345, 351, 357, 364, 399, 406, 419, 429`
**Issue:** Multiple cells use the pattern `onPress={callback ?? (() => {})}`. The visual affordance (chevron / accent fill) and `accessibilityRole="button"` are still rendered, but tapping does nothing — a "phantom button" anti-pattern. Affects: IdentityCard (line 322), every ProfileTile in the staff grid (345, 351, 357, 364), every ProfileRow in the user grid (399, 406, 419, 429).

In practice these handlers are always provided by `App.tsx`, so this is defensive code that may never fire. Still, the cleaner pattern is to render the cell only when its handler exists (the TOOLS list at lines 231-272 already does this — `&& onReviewLandlordApplications ? {...} : null`).

**Fix:** Either (a) drop the `?? (() => {})` and rely on TypeScript to enforce required handlers (mark them non-optional in `ProfileScreenProps`), or (b) skip rendering when handler missing:

```tsx
{onViewFavorites && (
  <ProfileRow
    Icon={Heart}
    title={t('profile.favorites')}
    sub={t('profile.tile.favoritesSub')}
    onPress={onViewFavorites}
  />
)}
```

### IN-04: Doc-vs-token-value drift on M3 amber comment

**File:** `src/components/LandlordApplicationStatusBanner.tsx:114`
**Issue:** Comment says *"amber-500 token (same hue M3 used at #D97706 → now mapped to the warning token)"*. Actual `colors.warning` is `#F59E0B` (Tailwind amber-500). `#D97706` is amber-600 in Tailwind's scale, so the comment's "same hue" claim is slightly inaccurate — they're adjacent shades, not identical. Cosmetic doc drift, but undermines confidence in the swap rationale.

**Fix:** Either correct the comment to *"closest token (amber-500); M3 used the slightly darker amber-600 #D97706"*, or verify against the actual M3 git history what hex was previously hardcoded and update accordingly.

### IN-05: `(user as any)?.backendProfile?.canListProperties` cast

**File:** `src/components/LandlordApplicationStatusBanner.tsx:56`
**Issue:** Pre-existing `as any` cast on the auth user to read `backendProfile.canListProperties`. This is a known type-shape gap with the User interface from AuthContext that pre-dates Phase 16. Worth flagging as a recurring debt site since this file was touched.

**Fix (out of phase scope):** Extend the User interface in `AuthContext.tsx` to include the optional `backendProfile` shape; eliminate the cast here. Track as M4 backlog item.

---

_Reviewed: 2026-05-31_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_

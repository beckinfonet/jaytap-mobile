---
phase: 03-moderation-queue-actions-edit-on-behalf
fixed_at: 2026-05-02T23:30:00Z
review_path: .planning/phases/03-moderation-queue-actions-edit-on-behalf/03-REVIEW.md
iteration: 1
findings_in_scope: 8
fixed: 8
skipped: 0
status: all_fixed
---

# Phase 3: Code Review Fix Report

**Fixed at:** 2026-05-02T23:30:00Z
**Source review:** `.planning/phases/03-moderation-queue-actions-edit-on-behalf/03-REVIEW.md`
**Iteration:** 1

**Summary:**
- Findings in scope: 8 (2 critical + 6 warnings)
- Fixed: 8
- Skipped: 0

**Validation gates run after all fixes:**
- `npx tsc --noEmit`: 2 baseline errors in `src/theme/ThemeContext.tsx` (pre-existing, unchanged) — no new errors introduced
- `bash scripts/check-i18n-parity.sh`: PASS (en.ts ↔ ru.ts key sets identical)
- Backend `cd ../backend-services/JayTap-services && nvm use 24 && npm test`: 86 tests pass across 6 suites; moderationRoutes.test.js moved 18 → 19 (added CR-01 regression test as instructed)

## Fixed Issues

### CR-01: Edit-on-behalf endpoint never parses array/object fields nor processes uploaded images

**Files modified:** `../backend-services/JayTap-services/src/routes/moderationRoutes.js`, `../backend-services/JayTap-services/src/__tests__/moderationRoutes.test.js`
**Commit:** `5fe3583` (in JayTap-services repo)
**Applied fix:** Mirrored `propertyRoutes.js` PUT field-handling block into `moderationRoutes.js` PUT `/listings/:id`. Added JSON.parse for `features`, `amenities`, `tours`, `platformVerifications`. Added integer/float coercion for `rooms`, `maxGuests`, `bedrooms`, `bathrooms`, `areaSqm`, `price`. Added `availableDate` Date coercion. Added image-handling block that maps `req.files[i].location` (S3 URL) and merges with `existingImages`. Added re-geocode on address change. Switched the multer config from `multer.memoryStorage()` to `multer-s3` (mirroring propertyRoutes.js lines 13-39) so uploads actually write to S3 instead of being silently dropped from RAM. Added regression test asserting `features=JSON.stringify(['wifi','gym'])` round-trips as an actual array via FormData; the test also verifies amenities array, rooms integer coercion, title persistence, and the D-12 status flip.

### CR-02: AppState 'active' refetch cooldown ref in App.tsx is missing — refetch fires on every queue close, no cooldown guard

**Files modified:** `App.tsx`, `src/screens/ProfileScreen.tsx`
**Commit:** `88539f1`
**Applied fix:** Picked the reviewer's recommended option (b): dropped `pendingModerationCount` state + useEffect from `App.tsx`. ProfileScreen now owns the count entirely, using its existing self-fetch + AppState 'active' + 60s cooldown ref (which previously never ran because the parent prop shadowed it). Removed the parent-owned-count detection branches in ProfileScreen. Added a `moderationCountRefreshKey` numeric prop bumped by App.tsx whenever the moderation queue overlay closes (or an edit-on-behalf flow starts) so ProfileScreen — kept alive under the overlay via display:none — refetches the badge after the moderator's own actions. Renamed the internal state from `internalPendingCount` to `pendingCount` for clarity.

### WR-01: Empty Alert message when approve/reject fails with no response.data.message

**Files modified:** `src/locales/en.ts`, `src/locales/ru.ts`, `src/screens/ModerationQueueScreen.tsx`, `src/screens/PropertyDetailsScreen.tsx`
**Commit:** `b1ee2bd`
**Applied fix:** Added `'common.errorGeneric'` i18n key (en: "Something went wrong. Please try again." / ru: "Что-то пошло не так. Попробуйте ещё раз."). Replaced the empty-string fallback `|| ''` in all five Alert error sites with `|| t('common.errorGeneric')`: ModerationQueueScreen.tsx load (later refined in WR-06), approve, reject paths; PropertyDetailsScreen.tsx approve and reject paths.

### WR-02: accessibilityLabel mixes translated string with hardcoded English suffix

**Files modified:** `src/locales/en.ts`, `src/locales/ru.ts`, `src/screens/ProfileScreen.tsx`
**Commit:** `03d015a`
**Applied fix:** Added `'moderation.queue.entryPoint.a11yPending'` i18n key (en: "{count} pending" / ru: "{count} ожидает проверки"). Replaced the hardcoded English template literal `${displayCount} pending` with `t('moderation.queue.entryPoint.a11yPending').replace('{count}', String(displayCount))` so Russian VoiceOver users hear "Очередь модерации: 3 ожидает проверки" instead of "Очередь модерации: 3 pending".

### WR-03: ModerationQueueScreen keyExtractor and PropertyService.id mapping assume `_id` is always a serialized string

**Files modified:** `src/services/PropertyService.ts`, `src/screens/ModerationQueueScreen.tsx`
**Commit:** `857d21f`
**Applied fix:** Coerced `id: String(p._id)` in PropertyService.getModerationQueue's mapping (line 310) so consumers always receive a string even if a future backend change uses `.lean()` without toJSON. Added belt-and-suspenders `String()` coercion in ModerationQueueScreen's `keyExtractor={(item) => String(item.id)}`.

### WR-04: getModerationQueueCount swallows 403 / 401 errors silently

**Files modified:** `src/services/PropertyService.ts`
**Commit:** `fd0f534`
**Applied fix:** Re-throw `PermissionDeniedError` instead of returning 0 in PropertyService.getModerationQueueCount. Network blips still resolve to 0 (badge stays at 0 silently), but consumers that opt in to handling permission denials (ModerationQueueScreen.load via WR-06) now receive the error surface. The apiClient interceptor still fires (axios runs interceptors before the method's catch), so the role-refresh banner remains active.

### WR-05: Race-toast Alert.alert('', ...) uses empty title

**Files modified:** `src/locales/en.ts`, `src/locales/ru.ts`, `src/screens/ModerationQueueScreen.tsx`, `src/screens/PropertyDetailsScreen.tsx`
**Commit:** `b1ee2bd` (combined with WR-01)
**Applied fix:** Added `'moderation.race.title'` i18n key (en: "Already reviewed" / ru: "Уже рассмотрено"). Replaced both `Alert.alert('', t('moderation.race.toast'))` sites with `Alert.alert(t('moderation.race.title'), t('moderation.race.toast'))` so iOS no longer renders a naked body with whitespace and Android renders consistently.

### WR-06: Empty-state alert in ModerationQueueScreen.load swallows permission errors with the user-facing "Error" alert

**Files modified:** `src/screens/ModerationQueueScreen.tsx`
**Commit:** `25665ce`
**Applied fix:** Imported `PermissionDeniedError` from `'../hooks/useRole'`. In ModerationQueueScreen.load's catch block, detect `err instanceof PermissionDeniedError || err?.message === 'E_PERMISSION_DENIED'`. On match: surface translated `t('errors.permissionDenied')` and call `onBack()` to bounce out of the screen the user can't access. Added `onBack` to the useCallback deps array. Pairs with WR-04 which preserves the PermissionDeniedError surface through PropertyService.getModerationQueueCount.

## Skipped Issues

None — all in-scope findings (2 critical + 6 warnings) were applied successfully and verified.

## Out-of-scope (Info findings deliberately not fixed in this iteration)

The 5 IN-* findings (audit-log false positives, RejectListingModal default, mod footer overlay, redundant User require, dead-code helper export) remain as documented in REVIEW.md. IN-01 self-resolves via the CR-01 fix (audit diffs now compare arrays-to-arrays correctly). IN-02 / IN-03 / IN-04 / IN-05 are stylistic or future-launch-data-driven and out of scope per `fix_scope: critical_warning`.

---

_Fixed: 2026-05-02T23:30:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_

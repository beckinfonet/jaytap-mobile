# Admin Live-Listing Actions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give admins (and moderators where applicable) a way to edit `media.tour3dUrl` / `media.tourPhotosUrl` on already-live listings, suspend / restore a listing, and hard-delete a suspended listing — all from `PropertyDetailsScreen` via an admin-only kebab menu, with a dedicated `ListingAdminScreen` for the metadata-rich path.

**Architecture:** Reuse the existing `MediaCurationScreen`, `ArchiveListingModal`, and `PropertyService.{archiveAnyListing, restoreListing, hardDeleteListing}`. Add a new `mode='edit-live-media'` to `MediaCurationScreen` that drops the Approve button + photo-gate. One small backend change extends the media-upload route's status filter to accept `'live'`. Two new client components (`AdminListingMenu`, `HardDeleteConfirmModal`) plus one new screen (`ListingAdminScreen`). All overlay state lives in `App.tsx` following the existing `isMediaCurationOpen` pattern.

**Tech Stack:** React Native 0.84 (New Architecture); TypeScript; custom App.tsx state-machine nav (no react-navigation); Express + Mongoose backend at `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services`; Jest for backend tests; `react-i18next` (EN + RU); `useTheme()` design tokens.

**Spec:** `docs/superpowers/specs/2026-05-27-admin-live-listing-actions-design.md`

---

## File Structure

**Backend repo** (`/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services`):
- Modify: `src/routes/moderationRoutes.js:286-301` — extend status filter on `POST /moderation/listings/:id/media`
- Modify: `src/__tests__/moderationRoutes.test.js` — add live-status case

**RN client repo** (`/Users/beckmaldinVL/development/mobileApps/JayTap`):
- Create: `src/components/AdminListingMenu.tsx` — kebab dropdown
- Create: `src/components/HardDeleteConfirmModal.tsx` — typed-DELETE confirm
- Create: `src/screens/ListingAdminScreen.tsx` — admin metadata screen
- Modify: `src/screens/MediaCurationScreen.tsx` — add `mode` prop, footer variant, role-gate widen
- Modify: `src/screens/PropertyDetailsScreen.tsx` — render `<AdminListingMenu>` in header
- Modify: `App.tsx` — new overlay state for `ListingAdminScreen`, extend `openMediaCuration` to take `mode`
- Modify: `src/locales/en.ts` + `src/locales/ru.ts` — new i18n keys

> **Reasoning environment note:** Some commands below are run from the **backend** working directory and others from the **RN client** working directory. Each command block specifies which. Backend requires `nvm use 24` first (Node ≥22.12) per memory `backend-node-version.md`; RN client uses default Node 20.

---

## Task 1 — Backend: extend media route to accept live listings

**Why:** The current handler at `moderationRoutes.js:292` uses `status: { $in: ['pending', 'rejected'] }` as the race-safe atomic filter. Live listings are rejected with 409 `ALREADY_MODERATED`. We need admins to add tour URLs to live listings, so `'live'` joins the allowed set.

**Files:**
- Modify: `src/routes/moderationRoutes.js:286-301` (and the comment block at lines 153-155)
- Modify: `src/__tests__/moderationRoutes.test.js` — add a test that POSTs a tourPhotosUrl to a `status: 'live'` listing and asserts 200

**TDD path:** backend has full Jest coverage; write the failing test first.

- [ ] **Step 1: Add failing test for live-status media upload**

In `src/__tests__/moderationRoutes.test.js`, find the existing `describe` block for `POST /moderation/listings/:id/media` (search for `'POST /listings/:id/media'` or `'media-upload'`). Add this test alongside the existing pending/rejected cases:

```javascript
it('accepts tourPhotosUrl upload on a live listing (admin late-add)', async () => {
  const live = await Property.create({
    ...basePropertyFixture(),
    status: 'live',
    media: { photos: ['https://cdn/x.jpg'], videos: [], tourUrl: undefined, tourPhotosUrl: undefined },
  });
  const res = await request(app)
    .post(`/moderation/listings/${live._id}/media`)
    .set('Authorization', `Bearer ${moderatorToken}`)
    .field('tourPhotosUrl', 'https://example.com/360-photos.html');
  expect(res.status).toBe(200);
  expect(res.body.media.tourPhotosUrl).toBe('https://example.com/360-photos.html');
  const reloaded = await Property.findById(live._id).lean();
  expect(reloaded.status).toBe('live');  // status NOT mutated by media upload
});
```

If `basePropertyFixture` / `moderatorToken` helpers don't exist with those names, scan the existing tests in the same file (probably 1-2 helpers at top of file) and copy the pattern they use.

- [ ] **Step 2: Run the test — confirm it fails with 409 ALREADY_MODERATED**

From `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services`:
```bash
nvm use 24
npx jest src/__tests__/moderationRoutes.test.js -t "accepts tourPhotosUrl upload on a live listing" --runInBand
```

Expected output includes: `expected 200 but received 409` (or similar mismatch). If you see a setup error instead (test helpers missing), fix the helper imports first, then re-run.

- [ ] **Step 3: Extend the status filter to include `'live'`**

Edit `src/routes/moderationRoutes.js`. Change line 292:

```javascript
// Before:
{ _id: req.params.id, status: { $in: ['pending', 'rejected'] } },

// After:
{ _id: req.params.id, status: { $in: ['pending', 'rejected', 'live'] } },
```

Also update the comment block at lines 153-155 to reflect the broadened scope:

```javascript
// + JSON tourUrl. Race-safe atomic append via findOneAndUpdate $push; status
// filter `{ $in: ['pending', 'rejected', 'live'] }` covers pre-approval moderation
// AND post-approval admin curation (late-adding tour URLs to live listings).
```

Do NOT change the DELETE handler at line 366 — that already has no status filter ("mods may need to strip media from a live listing").

- [ ] **Step 4: Run the test — confirm it passes**

```bash
npx jest src/__tests__/moderationRoutes.test.js -t "accepts tourPhotosUrl upload on a live listing" --runInBand
```

Expected: 1 passed.

- [ ] **Step 5: Run the full moderation test file to confirm no regression**

```bash
npx jest src/__tests__/moderationRoutes.test.js --runInBand
```

Expected: all tests pass. If anything else breaks, the most likely cause is a test that explicitly asserted 409 for live listings — re-read that test and decide whether the assertion was guarding behavior that's now intentionally different (rare) or was just asserting the existing filter (update it).

- [ ] **Step 6: Commit**

```bash
git add src/routes/moderationRoutes.js src/__tests__/moderationRoutes.test.js
git commit -m "feat(moderation): allow media upload on live listings

Extends the POST /moderation/listings/:id/media status filter from
['pending', 'rejected'] to ['pending', 'rejected', 'live'] so admins
can late-add tour URLs (Matterport, Ricoh 360) on already-approved
listings. Status is not mutated by media upload — race-safety is
preserved by the atomic findOneAndUpdate. Test added for the live
code path."
```

---

## Task 2 — Client: i18n keys for the new admin actions

**Why:** Per CLAUDE.md, EN + RU parity is required for every new UI string before any UI code that uses them lands. Adding all keys up front means subsequent tasks can write components without blocking on locale edits.

**Files:**
- Modify: `src/locales/en.ts`
- Modify: `src/locales/ru.ts`

- [ ] **Step 1: Add the new i18n keys to `src/locales/en.ts`**

Locate the existing `moderation` namespace (search for `moderation:` near `mediaCuration` / `archive` / `reject` keys). Add a new sibling namespace `adminListing` with these keys:

```typescript
adminListing: {
  menu: {
    a11y: 'Admin actions',
    editMedia: 'Edit media…',
    suspend: 'Suspend listing',
    restore: 'Restore listing',
    delete: 'Delete listing',
    manage: 'Manage listing…',
  },
  restore: {
    title: 'Restore listing?',
    body: 'This listing will go back to the pending queue for re-approval.',
    confirm: 'Restore',
    cancel: 'Cancel',
    success: 'Listing restored',
  },
  delete: {
    title: 'Permanently delete listing?',
    body: 'This action cannot be undone. The listing and all its media will be removed from the database. Type DELETE to confirm.',
    inputPlaceholder: 'Type DELETE',
    confirm: 'Delete forever',
    cancel: 'Cancel',
    blockedReason: 'Suspend the listing before deleting.',
    success: 'Listing deleted',
  },
  manage: {
    title: 'Manage listing',
    status: {
      label: 'Status',
      live: 'Live',
      pending: 'Pending review',
      rejected: 'Rejected',
      archived: 'Suspended',
    },
    submittedAt: 'Submitted',
    approvedAt: 'Approved',
    approvedBy: 'Approved by',
    ownerUid: 'Owner uid',
    archivedAt: 'Suspended',
    archivedBy: 'Suspended by',
    archivedReason: 'Reason',
    archivedNote: 'Note',
    copy: {
      a11y: 'Copy to clipboard',
      done: 'Copied',
    },
  },
  mediaEdit: {
    headerTitle: 'Edit media',
    saveButton: 'Save changes',
    saveSuccess: 'Media saved',
  },
  errors: {
    permissionDenied: 'You no longer have permission to perform this action.',
    listingGone: 'This listing no longer exists.',
    suspendFailed: 'Failed to suspend listing.',
    restoreFailed: 'Failed to restore listing.',
    deleteFailed: 'Failed to delete listing.',
  },
},
```

- [ ] **Step 2: Add the same namespace to `src/locales/ru.ts` with Russian translations**

```typescript
adminListing: {
  menu: {
    a11y: 'Действия администратора',
    editMedia: 'Изменить медиа…',
    suspend: 'Приостановить объявление',
    restore: 'Восстановить объявление',
    delete: 'Удалить объявление',
    manage: 'Управление объявлением…',
  },
  restore: {
    title: 'Восстановить объявление?',
    body: 'Объявление вернётся в очередь на повторное рассмотрение.',
    confirm: 'Восстановить',
    cancel: 'Отмена',
    success: 'Объявление восстановлено',
  },
  delete: {
    title: 'Удалить объявление навсегда?',
    body: 'Это действие необратимо. Объявление и все его медиафайлы будут удалены из базы данных. Введите DELETE для подтверждения.',
    inputPlaceholder: 'Введите DELETE',
    confirm: 'Удалить навсегда',
    cancel: 'Отмена',
    blockedReason: 'Сначала приостановите объявление.',
    success: 'Объявление удалено',
  },
  manage: {
    title: 'Управление объявлением',
    status: {
      label: 'Статус',
      live: 'Опубликовано',
      pending: 'На рассмотрении',
      rejected: 'Отклонено',
      archived: 'Приостановлено',
    },
    submittedAt: 'Отправлено',
    approvedAt: 'Одобрено',
    approvedBy: 'Одобрил',
    ownerUid: 'UID владельца',
    archivedAt: 'Приостановлено',
    archivedBy: 'Приостановил',
    archivedReason: 'Причина',
    archivedNote: 'Примечание',
    copy: {
      a11y: 'Скопировать в буфер',
      done: 'Скопировано',
    },
  },
  mediaEdit: {
    headerTitle: 'Изменить медиа',
    saveButton: 'Сохранить изменения',
    saveSuccess: 'Медиа сохранены',
  },
  errors: {
    permissionDenied: 'У вас больше нет прав на это действие.',
    listingGone: 'Этого объявления больше не существует.',
    suspendFailed: 'Не удалось приостановить объявление.',
    restoreFailed: 'Не удалось восстановить объявление.',
    deleteFailed: 'Не удалось удалить объявление.',
  },
},
```

DELETE stays as the literal Latin word in both locales — the user types it as a confirmation gate, so the input does not localize.

- [ ] **Step 3: Verify locale parity**

From `/Users/beckmaldinVL/development/mobileApps/JayTap`:
```bash
node -e "const en=require('./src/locales/en').default; const ru=require('./src/locales/ru').default; const keys=(o,p='')=>Object.entries(o).flatMap(([k,v])=>v&&typeof v==='object'?keys(v,p+k+'.'):[p+k]); const ek=keys(en.adminListing,'').sort(); const rk=keys(ru.adminListing,'').sort(); console.log('EN keys:',ek.length,'RU keys:',rk.length); console.log('only-in-en:',ek.filter(k=>!rk.includes(k))); console.log('only-in-ru:',rk.filter(k=>!ek.includes(k)));"
```

Expected: both counts equal, both `only-in-*` arrays empty. If the file is ESM/TS-only (no CJS require), open both files in an editor and visually compare the `adminListing` keys.

- [ ] **Step 4: Commit**

```bash
git add src/locales/en.ts src/locales/ru.ts
git commit -m "i18n(adminListing): add EN+RU strings for admin live-listing actions

Menu items, suspend/restore confirms, delete-with-DELETE-gate copy,
manage-listing metadata labels, and error toasts."
```

---

## Task 3 — Client: add `mode` prop to MediaCurationScreen

**Why:** Spec calls for a new `mode='edit-live-media'` that drops the "Approve & publish" button, skips the photo-gate, and broadens the role gate from `approveListings` to `editAnyListing`. Existing callers (`ModerationQueueScreen` → `openMediaCuration(id)` → mounted in App.tsx) must continue to work — `mode` defaults to `'edit-mod'`.

**Files:**
- Modify: `src/screens/MediaCurationScreen.tsx` (component signature, role gate, footer render)
- Modify: `App.tsx` (extend `openMediaCuration` signature)
- Modify: `src/screens/ModerationQueueScreen.tsx` (only if it currently passes a mode — likely just continues to call `onOpenMediaCuration(listingId)` and the App.tsx wrapper sets `mode='edit-mod'`; verify)

- [ ] **Step 1: Update `MediaCurationScreenProps` and add the mode constant**

In `src/screens/MediaCurationScreen.tsx`, modify the interface (currently lines 66-71):

```typescript
export type MediaCurationMode = 'edit-mod' | 'edit-live-media';

interface MediaCurationScreenProps {
  listingId: string;
  mode?: MediaCurationMode; // defaults to 'edit-mod' for back-compat
  onClose: () => void;
  /** Fires after a successful POST /approve (edit-mod only). */
  onApproveSuccess?: () => void;
  /** Fires after a successful media save (edit-live-media only). */
  onSaveSuccess?: () => void;
}
```

Update the component destructuring (currently lines 81-85):

```typescript
export const MediaCurationScreen: React.FC<MediaCurationScreenProps> = ({
  listingId,
  mode = 'edit-mod',
  onClose,
  onApproveSuccess,
  onSaveSuccess,
}) => {
```

- [ ] **Step 2: Broaden the role gate**

Currently the component has a `useRole().can('approveListings')` early-return (find it — search for `can('approveListings')` or `can(`). Replace that single check with a mode-aware check:

```typescript
const { can } = useRole();
const requiredAction = mode === 'edit-live-media' ? 'editAnyListing' : 'approveListings';
if (!can(requiredAction)) {
  return null; // App.tsx mount conditional + this guard form the layered gate
}
```

Keep the surrounding comment block referencing the three-layer mod gate (T-04 mitigation) and add a one-line note that `'editAnyListing'` is the new gate when `mode === 'edit-live-media'`.

- [ ] **Step 3: Variant the footer — render only Save in edit-live-media mode**

Find the footer render (search for `mediaCuration.approve.button` or `onApproveSuccess` — the two-button action footer around line 350-450 based on the file structure we read). Wrap the "Approve & publish" button in a mode guard:

```tsx
{mode === 'edit-mod' && (
  // existing Approve & publish button block — unchanged
)}
```

Change the Save button's label binding so live-media mode uses the new key:

```tsx
<Text>
  {mode === 'edit-live-media'
    ? t('adminListing.mediaEdit.saveButton')
    : t('moderation.mediaCuration.save.button')}
</Text>
```

Also update the header title to use `adminListing.mediaEdit.headerTitle` when `mode === 'edit-live-media'`:

```tsx
<Text>
  {mode === 'edit-live-media'
    ? t('adminListing.mediaEdit.headerTitle')
    : t('moderation.mediaCuration.header.title')}
</Text>
```

- [ ] **Step 4: Skip the photo-gate in edit-live-media mode**

Find the place where the Approve button is disabled when `photoCount === 0` (search for `mediaCuration.error.mediaRequired` or `media.photos?.length === 0`). The Save button in `edit-live-media` mode must NOT use this gate — a live listing already passed the gate at approval time, and admins editing media on live listings might be deleting/re-uploading photos around an URL edit.

The simplest change: leave the Approve photo-gate untouched (it only renders in `edit-mod` mode now), and verify the Save button has no separate photo-gate. The existing `isSaveEnabled` (line 255) is `!submittingSave && (hasPendingMedia || tourUrlChanged || tourPhotosUrlChanged)` — that's already correct for both modes (Save is enabled when there's something to save).

No code change required for this step — just a careful re-read. Add a comment near `isSaveEnabled`:

```typescript
// isSaveEnabled is mode-agnostic: it enables Save whenever there's any pending
// change. Photo-gate (≥1 photo) ONLY applies to the Approve button, which is
// only rendered in mode='edit-mod' (Approve & publish requires media; live
// listings already passed that gate).
const isSaveEnabled = !submittingSave && (hasPendingMedia || tourUrlChanged || tourPhotosUrlChanged);
```

- [ ] **Step 5: Wire onSaveSuccess for edit-live-media mode**

Inside `handleSave` (around line 275-370), after the successful `MediaCurationService.uploadMedia(...)` call and the local state updates, fire the right callback:

```typescript
Alert.alert(
  t('common.success'),
  mode === 'edit-live-media'
    ? t('adminListing.mediaEdit.saveSuccess')
    : t('moderation.mediaCuration.save.success'),
);
if (mode === 'edit-live-media') {
  onSaveSuccess?.();
}
```

`edit-mod` mode does NOT fire `onSaveSuccess` — its existing path is "Save → keep editing → eventually Approve & publish → onApproveSuccess".

- [ ] **Step 6: Update App.tsx — extend `openMediaCuration` to take a mode**

In `App.tsx`, find `openMediaCuration` (line 640-643 per our earlier read) and the `MediaCurationScreen` mount block (line 1329-1346). Change:

```typescript
// Before
const openMediaCuration = useCallback((listingId: string) => {
  setCurrentMediaCurationListingId(listingId);
  setIsMediaCurationOpen(true);
}, []);

// After
const [mediaCurationMode, setMediaCurationMode] = useState<'edit-mod' | 'edit-live-media'>('edit-mod');
const openMediaCuration = useCallback((listingId: string, mode: 'edit-mod' | 'edit-live-media' = 'edit-mod') => {
  setCurrentMediaCurationListingId(listingId);
  setMediaCurationMode(mode);
  setIsMediaCurationOpen(true);
}, []);
```

And update the mount block:

```tsx
{!!user && isMediaCurationOpen && currentMediaCurationListingId && (
  <View style={[fullScreenOverlayWrap, { pointerEvents: 'auto' }]}>
    <MediaCurationScreen
      listingId={currentMediaCurationListingId}
      mode={mediaCurationMode}
      onClose={() => { setIsMediaCurationOpen(false); /* preserve existing cleanup */ }}
      onApproveSuccess={() => { setIsMediaCurationOpen(false); setModerationCountRefreshKey(k => k + 1); }}
      onSaveSuccess={() => { setIsMediaCurationOpen(false); /* live-media: refresh whatever screen sits underneath via refresh keys */ }}
    />
  </View>
)}
```

Preserve any existing onClose body content from the file (don't drop it — re-read lines 1329-1346 before editing). `mediaCurationMode` state must reset to `'edit-mod'` on close so the next non-parameter call defaults safely:

```tsx
onClose={() => {
  setIsMediaCurationOpen(false);
  setCurrentMediaCurationListingId(null);
  setMediaCurationMode('edit-mod'); // reset default
}}
```

- [ ] **Step 7: Type-check**

From the RN client root:
```bash
npx tsc --noEmit
```

Expected: zero errors. If `useRole().can('editAnyListing')` errors because the type union doesn't include it — verify against `src/hooks/useRole.ts` (the explore agent reported it does include `editAnyListing` at line 14-26). If it doesn't, stop and re-read that file before continuing.

- [ ] **Step 8: Grep gate — no hardcoded colors introduced**

```bash
grep -nE "'#[0-9a-fA-F]{3,8}'|rgba?\(" src/screens/MediaCurationScreen.tsx | grep -v "^[0-9]*:.*//\|^[0-9]*:.*\\*"
```

Expected: zero new hits (any pre-existing hits that were there before this task are also expected to be zero — the file is theme-token clean per its file header). If you introduce one accidentally, replace it with a `useTheme()` token.

- [ ] **Step 9: Commit**

```bash
git add src/screens/MediaCurationScreen.tsx App.tsx
git commit -m "feat(media): add edit-live-media mode to MediaCurationScreen

New mode='edit-live-media' renders only the Save button (no Approve &
publish), uses 'editAnyListing' role gate instead of 'approveListings',
and uses adminListing.mediaEdit.* i18n keys. Default mode='edit-mod'
preserves the pre-approval moderation flow. App.tsx threads the mode
through openMediaCuration."
```

---

## Task 4 — Client: AdminListingMenu component

**Why:** The kebab dropdown is the single entry point for all four admin actions. Renders only when the viewer has `editAnyListing` permission. Delete item is conditionally shown only for admins.

**Files:**
- Create: `src/components/AdminListingMenu.tsx`

- [ ] **Step 1: Create the component file**

Create `src/components/AdminListingMenu.tsx`:

```typescript
/**
 * AdminListingMenu — kebab/3-dot dropdown rendered in the PropertyDetailsScreen
 * header for moderator/admin users. Surfaces four actions: Edit media, Suspend
 * (or Restore when archived), Delete (admin-only, gated on archived), and
 * Manage listing… (opens ListingAdminScreen).
 *
 * Layer-2 role gate: this component is allowed to render via the parent's
 * `useRole().can('editAnyListing')` check, but it also re-checks each action's
 * permission internally before firing the callback. Layer-3 is in the service.
 *
 * Theme: useTheme() tokens only. No hardcoded colors.
 */
import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, Pressable } from 'react-native';
import { MoreVertical } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { useRole } from '../hooks/useRole';

export type AdminListingMenuAction =
  | 'editMedia'
  | 'suspend'
  | 'restore'
  | 'delete'
  | 'manage';

interface AdminListingMenuProps {
  listingStatus: 'pending' | 'live' | 'rejected' | 'archived' | undefined;
  onSelect: (action: AdminListingMenuAction) => void;
}

export const AdminListingMenu: React.FC<AdminListingMenuProps> = ({
  listingStatus,
  onSelect,
}) => {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const { can } = useRole();
  const [open, setOpen] = useState(false);

  // Visibility gate — also enforced at the parent, but defense-in-depth.
  if (!can('editAnyListing')) return null;

  const isArchived = listingStatus === 'archived';
  const canDelete = can('hardDeleteListing');
  const deleteEnabled = isArchived;

  const handlePick = useCallback(
    (action: AdminListingMenuAction) => {
      setOpen(false);
      onSelect(action);
    },
    [onSelect],
  );

  return (
    <>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={t('adminListing.menu.a11y')}
        onPress={() => setOpen(true)}
        hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}
      >
        <MoreVertical color={colors.text} size={22} />
      </TouchableOpacity>

      <Modal
        transparent
        visible={open}
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable
          style={[styles.backdrop, { backgroundColor: colors.scrim }]}
          onPress={() => setOpen(false)}
        >
          <View
            style={[styles.menu, { backgroundColor: colors.card, shadowColor: colors.text }]}
          >
            <MenuItem
              label={t('adminListing.menu.editMedia')}
              onPress={() => handlePick('editMedia')}
              textColor={colors.text}
            />
            {isArchived ? (
              <MenuItem
                label={t('adminListing.menu.restore')}
                onPress={() => handlePick('restore')}
                textColor={colors.text}
              />
            ) : (
              <MenuItem
                label={t('adminListing.menu.suspend')}
                onPress={() => handlePick('suspend')}
                textColor={colors.text}
              />
            )}
            {canDelete && (
              <MenuItem
                label={t('adminListing.menu.delete')}
                onPress={deleteEnabled ? () => handlePick('delete') : undefined}
                disabled={!deleteEnabled}
                helper={!deleteEnabled ? t('adminListing.delete.blockedReason') : undefined}
                textColor={deleteEnabled ? colors.error : colors.textMuted}
                helperColor={colors.textMuted}
              />
            )}
            <MenuItem
              label={t('adminListing.menu.manage')}
              onPress={() => handlePick('manage')}
              textColor={colors.text}
            />
          </View>
        </Pressable>
      </Modal>
    </>
  );
};

interface MenuItemProps {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  helper?: string;
  textColor: string;
  helperColor?: string;
}

const MenuItem: React.FC<MenuItemProps> = ({
  label,
  onPress,
  disabled,
  helper,
  textColor,
  helperColor,
}) => (
  <TouchableOpacity
    onPress={onPress}
    disabled={disabled || !onPress}
    style={styles.item}
    accessibilityRole="button"
    accessibilityState={{ disabled: !!disabled }}
  >
    <Text style={[styles.label, { color: textColor }]}>{label}</Text>
    {helper && <Text style={[styles.helper, { color: helperColor }]}>{helper}</Text>}
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 56, // sits below the header
    paddingRight: 12,
  },
  menu: {
    minWidth: 220,
    borderRadius: 12,
    paddingVertical: 6,
    elevation: 6,
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  item: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
  },
  helper: {
    fontSize: 12,
    marginTop: 2,
  },
});
```

> If `useTheme()` doesn't expose `colors.scrim` or `colors.textMuted` in this project (the file header of MediaCurationScreen mentions `colors.scrim` as a "Phase 3 revision-2 W6 token"), use the tokens that DO exist. Read `src/theme/ThemeContext.tsx` (or wherever the colors type is declared) and pick the closest analog. Do NOT introduce hardcoded hex.

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: zero errors. Common failure mode: `colors.scrim` / `colors.textMuted` / `colors.error` not in theme — see note above.

- [ ] **Step 3: Manual smoke (component-level) — none yet, deferred to Task 5 wiring**

The component is unwired until Task 5. No manual QA in this task.

- [ ] **Step 4: Commit**

```bash
git add src/components/AdminListingMenu.tsx
git commit -m "feat(admin): AdminListingMenu kebab component

Three-dot dropdown for moderator/admin viewers of PropertyDetailsScreen.
Surfaces Edit media, Suspend/Restore, Delete (admin-only + archived-only),
and Manage listing. Visibility gated by useRole().can('editAnyListing');
Delete additionally gated by can('hardDeleteListing'). i18n via
adminListing.menu.* keys."
```

---

## Task 5 — Client: wire AdminListingMenu into PropertyDetailsScreen + media-edit flow

**Why:** This task connects the kebab to two of its four actions (editMedia and suspend/restore deferred to Task 6, delete to Task 7, manage to Task 8). Wiring `editMedia` first proves the App.tsx state extension from Task 3 works.

**Files:**
- Modify: `src/screens/PropertyDetailsScreen.tsx` — render `<AdminListingMenu>` in the header
- Modify: `App.tsx` — pass `openMediaCuration` down so PropertyDetailsScreen can fire it with `mode='edit-live-media'`

- [ ] **Step 1: Find the PropertyDetailsScreen header and the prop signature**

```bash
grep -n "interface PropertyDetailsScreenProps\|type PropertyDetailsScreenProps" src/screens/PropertyDetailsScreen.tsx
grep -n "header\|HeaderRight\|navigation.setOptions" src/screens/PropertyDetailsScreen.tsx | head -20
```

Note the exact prop name App.tsx already passes for the header (the screen is a full-screen overlay, not a stack header — its "header" is rendered inline). Find the right edge of that header row (likely a close X + share + favorite icon row). The kebab goes in that row when the viewer is admin/moderator.

- [ ] **Step 2: Add the prop and render the kebab**

Add to `PropertyDetailsScreenProps`:

```typescript
onOpenLiveMediaEdit?: (listingId: string) => void;
onOpenListingAdmin?: (listingId: string) => void;
onSuspendListing?: (listingId: string) => void;       // wired in Task 6
onRestoreListing?: (listingId: string) => void;       // wired in Task 6
onDeleteListing?: (listingId: string) => void;        // wired in Task 7
```

Inside the component, import and render the menu:

```typescript
import { AdminListingMenu, AdminListingMenuAction } from '../components/AdminListingMenu';
```

In the header row (the row with close/share/favorite icons), add the menu at the end:

```tsx
<AdminListingMenu
  listingStatus={property?.status}
  onSelect={(action: AdminListingMenuAction) => {
    if (!property?.id && !property?._id) return;
    const id = property.id || property._id;
    switch (action) {
      case 'editMedia':
        onOpenLiveMediaEdit?.(id);
        break;
      case 'suspend':
        onSuspendListing?.(id);
        break;
      case 'restore':
        onRestoreListing?.(id);
        break;
      case 'delete':
        onDeleteListing?.(id);
        break;
      case 'manage':
        onOpenListingAdmin?.(id);
        break;
    }
  }}
/>
```

- [ ] **Step 3: Wire the editMedia callback in App.tsx**

Find where `<PropertyDetailsScreen>` is mounted (probably one block among the other overlay mounts around lines 1200-1500). Add:

```tsx
onOpenLiveMediaEdit={(id) => openMediaCuration(id, 'edit-live-media')}
```

Leave `onOpenListingAdmin`, `onSuspendListing`, `onRestoreListing`, `onDeleteListing` as TODO comments referencing Task 6/7/8. Pass `undefined` (don't define the prop) so TypeScript doesn't trip on missing implementations — the menu items will fire callbacks that are no-ops until later tasks wire them.

Actually no — passing `undefined` makes the menu items silently fail. Better: add stub callbacks that show a toast for now:

```tsx
onOpenListingAdmin={(id) => { console.log('[TODO Task 8] onOpenListingAdmin', id); }}
onSuspendListing={(id) => { console.log('[TODO Task 6] onSuspendListing', id); }}
onRestoreListing={(id) => { console.log('[TODO Task 6] onRestoreListing', id); }}
onDeleteListing={(id) => { console.log('[TODO Task 7] onDeleteListing', id); }}
```

These stubs are removed in the corresponding later tasks. Keep the TODO markers searchable.

- [ ] **Step 4: Type-check**

```bash
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 5: Manual QA — verify the kebab + media edit flow**

Build and run on iOS or Android. Steps:
1. Log in as an admin or moderator account
2. Open any live listing from the home feed
3. Confirm the 3-dot kebab is visible in the header
4. Tap kebab → confirm 4 items show: Edit media…, Suspend listing, Delete listing (greyed out with "Suspend the listing before deleting." helper), Manage listing…
5. Tap "Edit media…" → MediaCurationScreen opens
6. Confirm header reads "Edit media" (NOT "Curate media")
7. Confirm footer shows ONLY a "Save changes" button (no "Approve & publish")
8. Add a value to the 360° Photos URL input, tap Save
9. Confirm "Media saved" toast
10. Confirm screen closes and PropertyDetailsScreen now renders the 360° Photos tile
11. Log out, log in as a renter
12. Open the same listing → confirm NO kebab is visible

If any step fails, fix and re-run before committing.

- [ ] **Step 6: Commit**

```bash
git add src/screens/PropertyDetailsScreen.tsx App.tsx
git commit -m "feat(admin): kebab menu in PropertyDetailsScreen + live media edit

Renders <AdminListingMenu> for moderator/admin viewers and wires the
'Edit media' action through to openMediaCuration(id, 'edit-live-media').
Suspend/Restore/Delete/Manage stubbed with console.log markers — wired
in Tasks 6/7/8."
```

---

## Task 6 — Client: wire Suspend + Restore via ArchiveListingModal

**Why:** Suspend reuses the existing `ArchiveListingModal` with the same 4-code reasonCode picker moderators use today. Restore is a simple confirm dialog.

**Files:**
- Modify: `src/screens/PropertyDetailsScreen.tsx` — host the `<ArchiveListingModal>` + state, expose `onSuspendListing`/`onRestoreListing` (or handle internally)

> **Design decision:** Modal hosting happens *inside* PropertyDetailsScreen rather than in App.tsx, because the modal needs access to the active `property` object for refresh-after-action and toast text. App.tsx just keeps the existing `onSuspendListing` / `onRestoreListing` callback wiring from Task 5 but they become no-ops — the kebab fires an *internal* state change instead. This is simpler than threading the modal through App.tsx.

- [ ] **Step 1: Change the kebab dispatch in PropertyDetailsScreen to handle suspend/restore internally**

In `src/screens/PropertyDetailsScreen.tsx`, replace the callback prop pattern from Task 5 for these two actions. Switch the kebab `onSelect` handler:

```tsx
const [archiveModalOpen, setArchiveModalOpen] = useState(false);
const [restoreConfirmOpen, setRestoreConfirmOpen] = useState(false);
const [actionInFlight, setActionInFlight] = useState(false);

<AdminListingMenu
  listingStatus={property?.status}
  onSelect={(action) => {
    const id = property?.id || property?._id;
    if (!id) return;
    switch (action) {
      case 'editMedia':
        onOpenLiveMediaEdit?.(id);
        break;
      case 'suspend':
        setArchiveModalOpen(true);
        break;
      case 'restore':
        setRestoreConfirmOpen(true);
        break;
      case 'delete':
        onDeleteListing?.(id);
        break;
      case 'manage':
        onOpenListingAdmin?.(id);
        break;
    }
  }}
/>
```

Remove the `onSuspendListing` / `onRestoreListing` props (and the App.tsx stubs from Task 5). Keep `onOpenLiveMediaEdit`, `onOpenListingAdmin`, `onDeleteListing`.

- [ ] **Step 2: Render `<ArchiveListingModal>` + the restore confirm**

Below the existing JSX (above the closing `</View>` / `</SafeAreaView>`), add:

```tsx
import ArchiveListingModal from '../components/ArchiveListingModal';
import { PropertyService } from '../services/PropertyService';
import { Alert } from 'react-native';

// ... inside the component ...

<ArchiveListingModal
  visible={archiveModalOpen}
  submitting={actionInFlight}
  onClose={() => setArchiveModalOpen(false)}
  onSubmit={async ({ reasonCode, reasonNote }) => {
    const id = property?.id || property?._id;
    if (!id) return;
    setActionInFlight(true);
    try {
      const updated = await PropertyService.archiveAnyListing(id, reasonCode, reasonNote);
      setProperty(updated); // refresh local state so status flips to 'archived' immediately
      setArchiveModalOpen(false);
      Alert.alert(t('common.success'), t('moderation.archive.success'));
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 403) {
        Alert.alert(t('common.error'), t('adminListing.errors.permissionDenied'));
        onClose?.(); // bounce back to renter view
      } else if (status === 404) {
        Alert.alert(t('common.error'), t('adminListing.errors.listingGone'));
        onClose?.();
      } else {
        Alert.alert(t('common.error'), t('adminListing.errors.suspendFailed'));
      }
    } finally {
      setActionInFlight(false);
    }
  }}
/>
```

> Verify `moderation.archive.success` already exists in locales (it's used elsewhere — `ArchiveListingModal` itself fires it when invoked from the moderation queue). If not, add it in Task 2's i18n block.

For the restore confirm — there's no existing component, so render an inline Alert.alert when `restoreConfirmOpen` flips:

```tsx
useEffect(() => {
  if (!restoreConfirmOpen) return;
  Alert.alert(
    t('adminListing.restore.title'),
    t('adminListing.restore.body'),
    [
      {
        text: t('adminListing.restore.cancel'),
        style: 'cancel',
        onPress: () => setRestoreConfirmOpen(false),
      },
      {
        text: t('adminListing.restore.confirm'),
        onPress: async () => {
          setRestoreConfirmOpen(false);
          const id = property?.id || property?._id;
          if (!id) return;
          setActionInFlight(true);
          try {
            const updated = await PropertyService.restoreListing(id);
            setProperty(updated);
            Alert.alert(t('common.success'), t('adminListing.restore.success'));
          } catch (err: any) {
            const status = err?.response?.status;
            if (status === 403) {
              Alert.alert(t('common.error'), t('adminListing.errors.permissionDenied'));
              onClose?.();
            } else if (status === 404) {
              Alert.alert(t('common.error'), t('adminListing.errors.listingGone'));
              onClose?.();
            } else {
              Alert.alert(t('common.error'), t('adminListing.errors.restoreFailed'));
            }
          } finally {
            setActionInFlight(false);
          }
        },
      },
    ],
    { cancelable: true, onDismiss: () => setRestoreConfirmOpen(false) },
  );
}, [restoreConfirmOpen, property, t, onClose]);
```

> The `setProperty` setter must exist — verify by finding wherever PropertyDetailsScreen currently re-fetches the listing (e.g. after edit). If the screen receives `property` only as a prop (no local copy), introduce a local `useState` mirror or call the existing refresh function.

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

Expected: zero errors. Likely failure: `setProperty` doesn't exist — refactor to use whatever refresh mechanism the screen already has (e.g. `refreshProperty()` callback, `setRefreshKey(k => k + 1)`, etc.).

- [ ] **Step 4: Manual QA**

1. Admin opens a live listing → kebab → Suspend listing → modal appears with 4 reason chips
2. Pick "Prohibited content", add a note "Test suspend from admin kebab", tap Submit
3. Confirm success toast; the kebab now shows "Restore listing" + Delete is no longer greyed out
4. Tap kebab → Restore listing → confirm dialog appears
5. Tap Restore → listing returns to pending status (renter side: would re-appear in their pending tab)
6. Test 403 path: have a second admin demote you to renter while the modal is open → submit → expect "Permission denied" toast

- [ ] **Step 5: Commit**

```bash
git add src/screens/PropertyDetailsScreen.tsx App.tsx
git commit -m "feat(admin): wire kebab Suspend/Restore via ArchiveListingModal

Suspend opens the existing ArchiveListingModal with the 4-code reasonCode
picker. Restore is a confirm dialog. Both refresh property state on
success; 403/404 error paths bounce back to the previous screen with the
right toast."
```

---

## Task 7 — Client: HardDeleteConfirmModal + wire to kebab

**Why:** Hard delete is irreversible — requires a typed-DELETE confirmation gate. Only enabled when listing is already archived (backend invariant from `HARD_DELETE_REQUIRES_ARCHIVED`).

**Files:**
- Create: `src/components/HardDeleteConfirmModal.tsx`
- Modify: `src/screens/PropertyDetailsScreen.tsx` — host the modal, wire `delete` kebab action

- [ ] **Step 1: Create the modal component**

`src/components/HardDeleteConfirmModal.tsx`:

```typescript
/**
 * HardDeleteConfirmModal — admin-only destructive confirm gate.
 *
 * Pre-condition: parent only opens this modal when listing.status === 'archived'.
 * The kebab gates this in AdminListingMenu, but defense-in-depth: the Delete
 * button below stays disabled until the user types the literal string "DELETE"
 * (case-sensitive) in the input.
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

interface HardDeleteConfirmModalProps {
  visible: boolean;
  submitting?: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

const REQUIRED_PHRASE = 'DELETE';

const HardDeleteConfirmModal: React.FC<HardDeleteConfirmModalProps> = ({
  visible,
  submitting = false,
  onClose,
  onConfirm,
}) => {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const [typed, setTyped] = useState('');

  useEffect(() => {
    if (visible) setTyped('');
  }, [visible]);

  const enabled = !submitting && typed === REQUIRED_PHRASE;

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={[styles.backdrop, { backgroundColor: colors.scrim }]}
      >
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.title, { color: colors.text }]}>
            {t('adminListing.delete.title')}
          </Text>
          <Text style={[styles.body, { color: colors.text }]}>
            {t('adminListing.delete.body')}
          </Text>

          <TextInput
            value={typed}
            onChangeText={setTyped}
            placeholder={t('adminListing.delete.inputPlaceholder')}
            placeholderTextColor={colors.textMuted}
            autoCapitalize="characters"
            autoCorrect={false}
            spellCheck={false}
            editable={!submitting}
            style={[
              styles.input,
              {
                color: colors.text,
                borderColor: typed && typed !== REQUIRED_PHRASE ? colors.error : colors.border,
                backgroundColor: colors.background,
              },
            ]}
          />

          <View style={styles.actions}>
            <TouchableOpacity
              onPress={onClose}
              disabled={submitting}
              style={[styles.btn, { borderColor: colors.border }]}
              accessibilityRole="button"
            >
              <Text style={[styles.btnText, { color: colors.text }]}>
                {t('adminListing.delete.cancel')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={enabled ? onConfirm : undefined}
              disabled={!enabled}
              style={[
                styles.btn,
                {
                  backgroundColor: enabled ? colors.error : colors.disabled,
                  opacity: enabled ? 1 : 0.6,
                },
              ]}
              accessibilityRole="button"
              accessibilityState={{ disabled: !enabled }}
            >
              {submitting ? (
                <ActivityIndicator color={colors.onAccent} />
              ) : (
                <Text style={[styles.btnText, { color: colors.onAccent }]}>
                  {t('adminListing.delete.confirm')}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 14,
    padding: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    marginBottom: 16,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  btn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'transparent',
    minWidth: 110,
    alignItems: 'center',
  },
  btnText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default HardDeleteConfirmModal;
```

> If `colors.disabled` / `colors.onAccent` / `colors.scrim` don't exist in the theme, swap for the closest available token (read `src/theme/ThemeContext.tsx`). Do NOT introduce hex literals.

- [ ] **Step 2: Wire the modal into PropertyDetailsScreen**

Add a `deleteModalOpen` state and the modal mount + handler:

```tsx
import HardDeleteConfirmModal from '../components/HardDeleteConfirmModal';

const [deleteModalOpen, setDeleteModalOpen] = useState(false);

// Update the kebab dispatch (Task 6 already handles the case):
case 'delete':
  setDeleteModalOpen(true);
  break;

// Mount near the ArchiveListingModal mount from Task 6:
<HardDeleteConfirmModal
  visible={deleteModalOpen}
  submitting={actionInFlight}
  onClose={() => setDeleteModalOpen(false)}
  onConfirm={async () => {
    const id = property?.id || property?._id;
    if (!id) return;
    setActionInFlight(true);
    try {
      await PropertyService.hardDeleteListing(id);
      setDeleteModalOpen(false);
      Alert.alert(t('common.success'), t('adminListing.delete.success'));
      onClose?.(); // pop back to the listing list — the listing no longer exists
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 403) {
        Alert.alert(t('common.error'), t('adminListing.errors.permissionDenied'));
        setDeleteModalOpen(false);
        onClose?.();
      } else if (status === 404) {
        Alert.alert(t('common.error'), t('adminListing.errors.listingGone'));
        setDeleteModalOpen(false);
        onClose?.();
      } else {
        Alert.alert(t('common.error'), t('adminListing.errors.deleteFailed'));
      }
    } finally {
      setActionInFlight(false);
    }
  }}
/>
```

Remove the App.tsx `onDeleteListing` stub from Task 5 — kebab `delete` action is now handled internally, same pattern as suspend.

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 4: Manual QA**

1. Admin opens a LIVE listing → kebab → Delete is greyed out with "Suspend the listing before deleting." helper. Tapping does nothing.
2. Suspend the listing (Task 6 flow) → kebab → Delete is now enabled
3. Tap Delete → typed-DELETE modal appears
4. Type "delete" (lowercase) → button stays disabled, input border turns red
5. Clear and type "DELETE" → button enables
6. Tap Delete forever → loading spinner → success toast → PropertyDetailsScreen closes, navigation returns to the list, the listing is gone from backend
7. Moderator (not admin) opens any listing → kebab → confirm NO "Delete listing" item appears (admin-only)

- [ ] **Step 5: Commit**

```bash
git add src/components/HardDeleteConfirmModal.tsx src/screens/PropertyDetailsScreen.tsx App.tsx
git commit -m "feat(admin): typed-DELETE confirm modal for hard-delete

HardDeleteConfirmModal requires the user to type the literal string
'DELETE' (case-sensitive) to enable the destructive button. Wired to
the kebab's delete action in PropertyDetailsScreen. Gated on
status === 'archived' via the kebab; admin-only via useRole."
```

---

## Task 8 — Client: ListingAdminScreen (Manage listing…)

**Why:** The "Manage listing…" kebab item opens a dedicated screen showing admin metadata (status pill, submittedAt/approvedAt/approvedBy, owner uid with copy, archive metadata) plus full-width buttons for the same three actions. This is the metadata-rich power surface.

**Files:**
- Create: `src/screens/ListingAdminScreen.tsx`
- Modify: `App.tsx` — overlay state (`isListingAdminOpen`, `currentListingAdminId`, `openListingAdmin`)
- Modify: `src/screens/PropertyDetailsScreen.tsx` — wire `onOpenListingAdmin` from App.tsx

- [ ] **Step 1: Create the screen file**

`src/screens/ListingAdminScreen.tsx`:

```typescript
/**
 * ListingAdminScreen — admin-only "Manage listing" overlay reached via the
 * PropertyDetailsScreen kebab. Shows metadata an admin needs in context
 * (status, audit timestamps, owner uid, archive reason) and duplicates the
 * three live-listing actions (Edit media, Suspend/Restore, Delete) as
 * full-width buttons.
 *
 * Layer-2 role gate: useRole().can('editAnyListing'). Layer-3 in services.
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Clipboard,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { useRole } from '../hooks/useRole';
import { PropertyService } from '../services/PropertyService';
import ArchiveListingModal from '../components/ArchiveListingModal';
import HardDeleteConfirmModal from '../components/HardDeleteConfirmModal';

interface ListingAdminScreenProps {
  listingId: string;
  onClose: () => void;
  onOpenLiveMediaEdit: (listingId: string) => void;
  onListingDeleted: () => void;
}

export const ListingAdminScreen: React.FC<ListingAdminScreenProps> = ({
  listingId,
  onClose,
  onOpenLiveMediaEdit,
  onListingDeleted,
}) => {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const { can } = useRole();
  const insets = useSafeAreaInsets();

  const [listing, setListing] = useState<any | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [archiveModalOpen, setArchiveModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [actionInFlight, setActionInFlight] = useState(false);

  if (!can('editAnyListing')) return null;

  // Fetch the listing
  const fetchListing = useCallback(async () => {
    try {
      setLoading(true);
      const data = await PropertyService.getPropertyById(listingId);
      setListing(data);
      setLoadError(null);
    } catch (err: any) {
      setLoadError(err?.message || 'Failed to load listing');
    } finally {
      setLoading(false);
    }
  }, [listingId]);

  useEffect(() => {
    fetchListing();
  }, [fetchListing]);

  const isArchived = listing?.status === 'archived';
  const canDelete = can('hardDeleteListing');

  const handleSuspendSubmit = async ({ reasonCode, reasonNote }: { reasonCode: any; reasonNote?: string }) => {
    setActionInFlight(true);
    try {
      const updated = await PropertyService.archiveAnyListing(listingId, reasonCode, reasonNote);
      setListing(updated);
      setArchiveModalOpen(false);
      Alert.alert(t('common.success'), t('moderation.archive.success'));
    } catch (err: any) {
      handleActionError(err, 'suspend');
    } finally {
      setActionInFlight(false);
    }
  };

  const handleRestore = () => {
    Alert.alert(
      t('adminListing.restore.title'),
      t('adminListing.restore.body'),
      [
        { text: t('adminListing.restore.cancel'), style: 'cancel' },
        {
          text: t('adminListing.restore.confirm'),
          onPress: async () => {
            setActionInFlight(true);
            try {
              const updated = await PropertyService.restoreListing(listingId);
              setListing(updated);
              Alert.alert(t('common.success'), t('adminListing.restore.success'));
            } catch (err: any) {
              handleActionError(err, 'restore');
            } finally {
              setActionInFlight(false);
            }
          },
        },
      ],
    );
  };

  const handleDeleteConfirm = async () => {
    setActionInFlight(true);
    try {
      await PropertyService.hardDeleteListing(listingId);
      setDeleteModalOpen(false);
      Alert.alert(t('common.success'), t('adminListing.delete.success'));
      onListingDeleted();
    } catch (err: any) {
      handleActionError(err, 'delete');
    } finally {
      setActionInFlight(false);
    }
  };

  const handleActionError = (err: any, kind: 'suspend' | 'restore' | 'delete') => {
    const status = err?.response?.status;
    if (status === 403) {
      Alert.alert(t('common.error'), t('adminListing.errors.permissionDenied'));
      onClose();
    } else if (status === 404) {
      Alert.alert(t('common.error'), t('adminListing.errors.listingGone'));
      onClose();
    } else {
      const errorKey =
        kind === 'suspend' ? 'adminListing.errors.suspendFailed'
        : kind === 'restore' ? 'adminListing.errors.restoreFailed'
        : 'adminListing.errors.deleteFailed';
      Alert.alert(t('common.error'), t(errorKey));
    }
  };

  const copyUid = (uid?: string) => {
    if (!uid) return;
    Clipboard.setString(uid);
    Alert.alert(t('adminListing.manage.copy.done'));
  };

  const formatDate = (iso?: string) => {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return iso;
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" style={{ marginTop: 64 }} />
      </SafeAreaView>
    );
  }

  if (loadError || !listing) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onClose} accessibilityRole="button" hitSlop={{top:12,right:12,bottom:12,left:12}}>
            <X color={colors.text} size={24} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>{t('adminListing.manage.title')}</Text>
          <View style={{ width: 24 }} />
        </View>
        <Text style={[styles.errorText, { color: colors.error }]}>{loadError || 'Listing not found'}</Text>
      </SafeAreaView>
    );
  }

  const statusKey =
    listing.status === 'live' ? 'live'
    : listing.status === 'pending' ? 'pending'
    : listing.status === 'rejected' ? 'rejected'
    : listing.status === 'archived' ? 'archived'
    : 'pending';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={onClose} accessibilityRole="button" hitSlop={{top:12,right:12,bottom:12,left:12}}>
          <X color={colors.text} size={24} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>{t('adminListing.manage.title')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 + insets.bottom }}>
        {/* Status */}
        <Row label={t('adminListing.manage.status.label')} value={t(`adminListing.manage.status.${statusKey}`)} colors={colors} />

        {/* Timestamps */}
        <Row label={t('adminListing.manage.submittedAt')} value={formatDate(listing.submittedAt)} colors={colors} />
        {listing.approvedAt && (
          <>
            <Row label={t('adminListing.manage.approvedAt')} value={formatDate(listing.approvedAt)} colors={colors} />
            <Row label={t('adminListing.manage.approvedBy')} value={listing.approvedByUid || '—'} colors={colors} copyable onCopy={() => copyUid(listing.approvedByUid)} t={t} />
          </>
        )}

        {/* Owner */}
        <Row
          label={t('adminListing.manage.ownerUid')}
          value={listing.userId || listing.ownerUid || '—'}
          colors={colors}
          copyable
          onCopy={() => copyUid(listing.userId || listing.ownerUid)}
          t={t}
        />

        {/* Archive metadata if archived */}
        {isArchived && (
          <>
            <Row label={t('adminListing.manage.archivedAt')} value={formatDate(listing.archivedAt)} colors={colors} />
            <Row label={t('adminListing.manage.archivedBy')} value={listing.archivedByUid || '—'} colors={colors} copyable onCopy={() => copyUid(listing.archivedByUid)} t={t} />
            <Row label={t('adminListing.manage.archivedReason')} value={listing.archivedReasonCode || '—'} colors={colors} />
            {listing.archivedReasonNote && (
              <Row label={t('adminListing.manage.archivedNote')} value={listing.archivedReasonNote} colors={colors} />
            )}
          </>
        )}

        {/* Actions */}
        <View style={{ marginTop: 24, gap: 12 }}>
          <ActionBtn
            label={t('adminListing.menu.editMedia')}
            onPress={() => onOpenLiveMediaEdit(listingId)}
            colors={colors}
            disabled={actionInFlight}
          />
          {isArchived ? (
            <ActionBtn
              label={t('adminListing.menu.restore')}
              onPress={handleRestore}
              colors={colors}
              disabled={actionInFlight}
            />
          ) : (
            <ActionBtn
              label={t('adminListing.menu.suspend')}
              onPress={() => setArchiveModalOpen(true)}
              colors={colors}
              disabled={actionInFlight}
            />
          )}
          {canDelete && (
            <ActionBtn
              label={t('adminListing.menu.delete')}
              onPress={() => setDeleteModalOpen(true)}
              colors={colors}
              disabled={actionInFlight || !isArchived}
              variant="danger"
              helper={!isArchived ? t('adminListing.delete.blockedReason') : undefined}
            />
          )}
        </View>
      </ScrollView>

      <ArchiveListingModal
        visible={archiveModalOpen}
        submitting={actionInFlight}
        onClose={() => setArchiveModalOpen(false)}
        onSubmit={handleSuspendSubmit}
      />
      <HardDeleteConfirmModal
        visible={deleteModalOpen}
        submitting={actionInFlight}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
      />
    </SafeAreaView>
  );
};

const Row: React.FC<any> = ({ label, value, colors, copyable, onCopy, t }) => (
  <View style={styles.row}>
    <Text style={[styles.rowLabel, { color: colors.textMuted }]}>{label}</Text>
    <View style={styles.rowValueWrap}>
      <Text style={[styles.rowValue, { color: colors.text }]} selectable>{value}</Text>
      {copyable && t && (
        <TouchableOpacity onPress={onCopy} accessibilityRole="button" accessibilityLabel={t('adminListing.manage.copy.a11y')} hitSlop={{top:8,right:8,bottom:8,left:8}}>
          <Text style={[styles.copyBtn, { color: colors.primary }]}>⧉</Text>
        </TouchableOpacity>
      )}
    </View>
  </View>
);

const ActionBtn: React.FC<any> = ({ label, onPress, colors, disabled, variant, helper }) => {
  const bg = variant === 'danger' ? colors.error : colors.primary;
  return (
    <View>
      <TouchableOpacity
        onPress={disabled ? undefined : onPress}
        disabled={disabled}
        style={[styles.actionBtn, { backgroundColor: bg, opacity: disabled ? 0.5 : 1 }]}
        accessibilityRole="button"
      >
        <Text style={[styles.actionBtnText, { color: colors.onAccent }]}>{label}</Text>
      </TouchableOpacity>
      {helper && <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 4 }}>{helper}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: { fontSize: 17, fontWeight: '600' },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'transparent',
  },
  rowLabel: { fontSize: 13, flex: 1 },
  rowValueWrap: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 8 },
  rowValue: { fontSize: 14, flexShrink: 1, textAlign: 'right' },
  copyBtn: { fontSize: 18 },
  actionBtn: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  actionBtnText: { fontSize: 15, fontWeight: '600' },
  errorText: { textAlign: 'center', marginTop: 32, padding: 16 },
});
```

> Same theme-token note as Task 4/7: if a token doesn't exist, swap for the closest available — never introduce hex literals.

> `Clipboard` from `react-native` is deprecated; check if the project uses `@react-native-clipboard/clipboard`. If so, import from there: `import Clipboard from '@react-native-clipboard/clipboard';`. Grep first: `grep -rn "Clipboard" src --include="*.tsx" | head`.

- [ ] **Step 2: Add overlay state + handler in App.tsx**

In the state declarations (near `isMediaCurationOpen`):

```typescript
const [isListingAdminOpen, setIsListingAdminOpen] = useState(false);
const [currentListingAdminId, setCurrentListingAdminId] = useState<string | null>(null);
```

Add the open callback (near `openMediaCuration`):

```typescript
const openListingAdmin = useCallback((listingId: string) => {
  setCurrentListingAdminId(listingId);
  setIsListingAdminOpen(true);
}, []);
```

Add to `OVERLAY_FLAGS` (line 153-162 per our read):

```typescript
!!user && isListingAdminOpen,
```

Mount the screen as an overlay (near the MediaCurationScreen mount block):

```tsx
{!!user && isListingAdminOpen && currentListingAdminId && (
  <View style={[fullScreenOverlayWrap, { pointerEvents: 'auto' }]}>
    <ListingAdminScreen
      listingId={currentListingAdminId}
      onClose={() => {
        setIsListingAdminOpen(false);
        setCurrentListingAdminId(null);
      }}
      onOpenLiveMediaEdit={(id) => {
        // Open MediaCurationScreen on top of ListingAdminScreen
        openMediaCuration(id, 'edit-live-media');
      }}
      onListingDeleted={() => {
        // Listing is gone — close this screen AND the underlying PropertyDetailsScreen
        setIsListingAdminOpen(false);
        setCurrentListingAdminId(null);
        setSelectedProperty(null); // assumes this is the existing state that drives PropertyDetailsScreen
      }}
    />
  </View>
)}
```

Pass the callback to `PropertyDetailsScreen` wherever it's mounted:

```tsx
onOpenListingAdmin={(id) => openListingAdmin(id)}
```

Import the screen at the top of App.tsx:

```typescript
import { ListingAdminScreen } from './src/screens/ListingAdminScreen';
```

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

Expected: zero errors. Likely failure: `setSelectedProperty` name mismatch — find the actual setter for whatever state drives `PropertyDetailsScreen` mounting.

- [ ] **Step 4: Manual QA**

1. Admin opens live listing → kebab → "Manage listing…" → ListingAdminScreen appears
2. Confirm rows visible: Status: Live, Submitted, Approved, Approved by (uid), Owner uid. Tapping ⧉ next to a uid shows "Copied" alert and the uid is on the clipboard.
3. Tap "Edit media…" button → MediaCurationScreen opens on top
4. Edit a URL, save, back → returns to ListingAdminScreen (still on top)
5. Tap "Suspend listing" → ArchiveListingModal → submit → status pill flips to Suspended, Restore + Delete buttons swap in, archive metadata rows now show below the status
6. Tap "Delete listing" → typed-DELETE modal → confirm → both ListingAdminScreen and underlying PropertyDetailsScreen close, return to the listing list
7. Repeat steps 1-2 as a moderator (not admin): confirm Delete button is hidden

- [ ] **Step 5: Commit**

```bash
git add src/screens/ListingAdminScreen.tsx App.tsx
git commit -m "feat(admin): ListingAdminScreen for the 'Manage listing' kebab item

New overlay screen shows admin metadata (status, approval timestamps,
owner uid with copy, archive reason/note) and duplicates the three
live-listing actions as full-width buttons. Hosts its own ArchiveListing
and HardDeleteConfirm modals. onListingDeleted pops both this screen
and the underlying PropertyDetailsScreen."
```

---

## Self-Review (run inline, then proceed)

After completing all tasks, re-check the plan against the spec:

**Spec coverage check:**
- ✅ Admin adds `tour3dUrl` / `tourPhotosUrl` to live listings → Tasks 1, 3, 5
- ✅ Admin suspends a live listing with reason code → Task 6
- ✅ Admin restores a suspended listing → Task 6
- ✅ Admin hard-deletes a suspended listing with typed-DELETE → Task 7
- ✅ Manage listing… surface with metadata → Task 8
- ✅ Renters / owners see no change → Tasks 4, 5 (visibility gate)
- ✅ Moderators get all but Delete → Task 4 (Delete gated by `hardDeleteListing`)
- ✅ EN + RU parity → Task 2

**Type consistency check:**
- `mode` prop on `MediaCurationScreen`: `'edit-mod' | 'edit-live-media'` — consistent across Tasks 3, 5, 8
- `AdminListingMenuAction`: `'editMedia' | 'suspend' | 'restore' | 'delete' | 'manage'` — Tasks 4, 5, 6, 7, 8 all match
- `reasonCode` values: `'incomplete-info' | 'prohibited-content' | 'out-of-service-area' | 'other'` (matches `RejectReasonCode` from `RejectListingModal.tsx:33`)
- `useRole().can('editAnyListing')` and `can('hardDeleteListing')` — both already in the union per Explore agent's report

**Open backend question from the spec — resolved:** the moderation media route DOES reject live listings today; Task 1 fixes this with a 1-line filter change + a regression test.

**Things NOT covered (and intentionally so per spec non-goals):**
- Bulk admin actions
- Edit-history viewer
- Soft delete with grace period
- Owner-side tour URL editing
- Push notifications

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-27-admin-live-listing-actions.md`. Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

**Which approach?**

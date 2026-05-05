---
phase: 03-moderation-queue-actions-edit-on-behalf
reviewed: 2026-05-02T22:53:20Z
depth: standard
files_reviewed: 18
files_reviewed_list:
  - App.tsx
  - src/locales/en.ts
  - src/locales/ru.ts
  - src/hooks/useRole.ts
  - src/hooks/__tests__/useRole.test.ts
  - src/services/PropertyService.ts
  - src/components/RejectionBanner.tsx
  - src/components/RejectListingModal.tsx
  - src/components/PropertyDetailsHost.tsx
  - src/screens/ModerationQueueScreen.tsx
  - src/screens/ProfileScreen.tsx
  - src/screens/PropertyDetailsScreen.tsx
  - src/screens/CreateListingScreen.tsx
  - ../backend-services/JayTap-services/src/config/serviceAreas.js
  - ../backend-services/JayTap-services/src/models/ModerationLog.js
  - ../backend-services/JayTap-services/src/routes/moderationRoutes.js
  - ../backend-services/JayTap-services/src/routes/propertyRoutes.js
  - ../backend-services/JayTap-services/src/__tests__/moderationRoutes.test.js
  - ../backend-services/JayTap-services/index.js
findings:
  critical: 2
  warning: 6
  info: 5
  total: 13
status: issues_found
---

# Phase 3: Code Review Report

**Reviewed:** 2026-05-02T22:53:20Z
**Depth:** standard
**Files Reviewed:** 18 (RN client + sibling backend repo)
**Status:** issues_found

## Summary

Phase 3 lands the moderation queue, action footer, edit-on-behalf flow, and four supporting backend endpoints. The phase invariants explicitly called out by the planner (actorUid sourcing, race-safety, mass-assignment whitelist, MOD-13 owner-payload privacy, client-side permission gating, i18n parity, reject-reason translation, AppState cooldown, App.tsx state-machine pattern, defensive uid stripping) all check out and are well-executed — those nine invariants pass.

However, two regressions surfaced that the verifier almost certainly missed (which is exactly the auto-memory `gsd-verifier-misses-regressions.md` failure mode): the moderator edit-on-behalf endpoint (`PUT /api/moderation/listings/:id`) **silently corrupts data** because it does NOT JSON-parse array/object fields the client serializes via FormData (`features`, `tours`, `amenities`, `existingImages`, `platformVerifications`), and it **drops every uploaded image** because it never reads `req.files` and never merges existing images. The mass-assignment whitelist is correct; the FIELD-PARSING that propertyRoutes.js PUT does is missing here. This is a critical, end-to-end-breaking regression on the marquee MOD-14 path.

The remaining warnings cluster around: empty error message body when listing approve/reject fails for non-409 reasons (UX), an accessibilityLabel that mixes a translated entry-point name with a hardcoded English suffix, and a couple of low-stakes hygiene items.

## Critical Issues

### CR-01: Edit-on-behalf endpoint never parses array/object fields nor processes uploaded images — corrupts every save with images, features, tours, amenities, or existingImages

**File:** `../backend-services/JayTap-services/src/routes/moderationRoutes.js:220-339`
**Issue:** `PUT /api/moderation/listings/:id` writes `req.body` straight onto the Mongoose document via `findOneAndUpdate({...}, { $set: updateData })` without any of the field handling that `propertyRoutes.js` PUT applies. The client (`PropertyService.editAsModerator`, lines 397-405) wraps every array/object value in `JSON.stringify` because the request is sent as `multipart/form-data`. The backend assigns those JSON strings directly into Property fields:

- `features` becomes `'["wifi","gym"]'` (a string), not an array.
- `tours` becomes a JSON string — the next read returns garbled data; tour links break.
- `amenities` becomes a JSON string — Hospitality amenities collapse into a single malformed string and the 12-amenity multi-select is unreadable.
- `existingImages` is appended to the document (it's not a Property schema field, so it's dropped or silently coerced depending on `strict` mode).
- `platformVerifications` becomes a JSON string instead of the structured `{ ownershipDocuments, ownerIdentityVerified, stateIssuedDocumentsVerified }` object.

Worse, `upload.array('images', 40)` is mounted on the route but `req.files` is never read — uploaded images are accepted by multer (memory storage), buffered into RAM (up to 40 × 10 MB = 400 MB per request), then **silently discarded**. There is no S3 upload, no merge with `existingImages`, no `imageUrl`/`images` write. Any moderator who uploads new images during edit-on-behalf will see them disappear; any moderator who edits a listing that has features/tours/amenities/platformVerifications in the form will overwrite the live document with malformed JSON-strings that break PropertyDetailsScreen rendering.

`propertyRoutes.js` PUT at lines 432-518 already implements the correct handling (parse `features`, `tours`, `amenities`, merge new+existing images via `req.files.map(file => file.location)`, geocode on address change, coerce `rooms`/`maxGuests`). None of that is replicated here. The phase plan even calls this out (PropertyService comment at line 379: "must NOT include ownerUid in the FormData"), so the regression is purely on the backend handler.

Bonus: address changes won't be re-geocoded either — the moderator can fix a typo'd address but the latitude/longitude won't update, so the map pin stays wrong.

**Fix:** Mirror the `propertyRoutes.js` PUT field-handling block before the atomic update. After STEP 1's deletes and BEFORE STEP 5's findOneAndUpdate:

```js
// Parse JSON-string fields delivered via multipart/form-data (mirror propertyRoutes.js PUT).
if (typeof updateData.features === 'string') {
  try { updateData.features = JSON.parse(updateData.features); } catch (e) { /* keep as is */ }
}
if (typeof updateData.amenities === 'string') {
  try {
    updateData.amenities = JSON.parse(updateData.amenities);
    if (!Array.isArray(updateData.amenities)) updateData.amenities = [];
  } catch (e) { updateData.amenities = []; }
}
if (typeof updateData.tours === 'string') {
  try {
    const parsed = JSON.parse(updateData.tours);
    updateData.tours = parsed.map((tour, index) => ({
      id: tour.id || `t${index + 1}`,
      title: tour.title || '3D Tour',
      url: tour.url || '',
      thumbnailUrl: tour.thumbnailUrl || undefined,
    }));
    updateData.is3DTourAvailable = parsed.length > 0;
  } catch (e) { /* keep as is */ }
}
if (typeof updateData.platformVerifications === 'string') {
  try { updateData.platformVerifications = JSON.parse(updateData.platformVerifications); } catch (e) {
    delete updateData.platformVerifications;
  }
}
if (updateData.rooms !== undefined) updateData.rooms = parseInt(updateData.rooms) || 0;
if (updateData.maxGuests !== undefined) updateData.maxGuests = parseInt(updateData.maxGuests) || 0;
if (updateData.bedrooms !== undefined) updateData.bedrooms = parseInt(updateData.bedrooms) || 0;
if (updateData.bathrooms !== undefined) updateData.bathrooms = parseInt(updateData.bathrooms) || 0;
if (updateData.areaSqm !== undefined) updateData.areaSqm = parseFloat(updateData.areaSqm) || 0;
if (updateData.price !== undefined && typeof updateData.price === 'string') {
  updateData.price = parseFloat(updateData.price) || updateData.price;
}
if (updateData.availableDate) updateData.availableDate = new Date(updateData.availableDate);

// Image handling: this endpoint uses memory storage (not multer-s3), so we must
// upload to S3 manually OR switch the multer config to multer-s3 here. The
// simplest path is to switch to multer-s3 (mirroring propertyRoutes.js); then:
if (req.files && req.files.length > 0) {
  const newImageUrls = req.files.map(f => f.location);
  let existingImages = [];
  if (updateData.existingImages) {
    try {
      existingImages = typeof updateData.existingImages === 'string'
        ? JSON.parse(updateData.existingImages)
        : updateData.existingImages;
    } catch (e) { existingImages = []; }
  }
  updateData.images = [...existingImages, ...newImageUrls];
  updateData.imageUrl = updateData.images[0];
} else if (updateData.existingImages) {
  let existingImages = [];
  try {
    existingImages = typeof updateData.existingImages === 'string'
      ? JSON.parse(updateData.existingImages)
      : updateData.existingImages;
  } catch (e) { existingImages = []; }
  updateData.images = existingImages;
  updateData.imageUrl = existingImages[0];
}
delete updateData.existingImages; // not a schema field

// Re-geocode on address change.
if (updateData.address) {
  const cityVal = updateData.city || original.city || 'Bishkek';
  const addr = (updateData.address || '').trim();
  const geocodeQuery = cityVal.toLowerCase() === 'bishkek' && !addr.toLowerCase().endsWith('kyrgyzstan')
    ? `${addr}, Kyrgyzstan` : addr;
  const coords = await geocodeAddress(geocodeQuery);
  updateData.latitude = coords?.latitude;
  updateData.longitude = coords?.longitude;
}
```

Also switch `upload` at line 20 to use `multer-s3` (same config as `propertyRoutes.js` lines 13-39) so `req.files[i].location` is the S3 URL. The plan's reasoning ("mods rarely upload images during edit-on-behalf") is fine as a launch heuristic, but the current implementation accepts multipart bodies, parses 400 MB of image into memory, and silently drops them — that's strictly worse than rejecting them at the route boundary. If image-upload truly is out-of-scope for Phase 3, change `upload.array('images', 40)` to `upload.none()` and document the limit, instead of accepting and dropping.

Add a regression test mirroring `moderationRoutes.test.js`'s MOD-14 block: send a multipart body with `features=JSON.stringify(['wifi','gym'])` and assert the saved document has `features: ['wifi','gym']` (an array), not the JSON string.

---

### CR-02: AppState 'active' refetch cooldown ref in App.tsx pendingModerationCount fetcher is missing — refetch fires on every queue close, no cooldown guard

**File:** `App.tsx:120-131`
**Issue:** The phase invariants explicitly call out (#8) that the Profile pending-count fetch on AppState 'active' must have its own 60s cooldown ref. `ProfileScreen.tsx:71-90` correctly implements this. However, the **parent-side** count fetcher in `App.tsx` (the one passed down via `pendingModerationCount={pendingModerationCount}` prop, which according to ProfileScreen lines 53/58/78 takes precedence over the screen's own self-fetch) does NOT use AppState at all and has NO cooldown — it refetches on every change of `[canViewModerationQueue, isModerationQueueOpen]`.

Because ProfileScreen detects "parent owns the count" via `typeof pendingModerationCount === 'number'` (which is always true in the wired path — App.tsx initializes to `0`), ProfileScreen's own AppState cooldown ref **never runs**. The result: when the moderator backgrounds the app and resumes, no refetch fires at all. The badge can stay stale for the entire app lifetime if the queue overlay never opens.

This is the inverse failure mode of what the invariant warns about, but equally bad: the user-visible behavior (stale badge after returning from Photos / Maps / a phone call) is the exact UX the cooldown was designed to fix.

**Fix:** Either (a) move the AppState 'active' refetch into App.tsx so the prop-driven path also benefits, or (b) drop the App.tsx-side `pendingModerationCount` prop and let ProfileScreen own the count entirely (matches the simpler design and removes the precedence dance). Recommend (b) for simplicity:

```tsx
// App.tsx — drop pendingModerationCount state + effect entirely.
// Pass a refresh hook instead so the queue close + edit-on-behalf flows can nudge ProfileScreen.

// ProfileScreen.tsx — already has the self-fetch + AppState 'active' cooldown.
// Add a useEffect that refetches when isModerationQueueOpen toggles (or expose
// an imperative refresh via ref/callback prop).
```

If keeping (a), add an AppState listener in App.tsx with its own `useRef<number | null>` cooldown:

```tsx
const lastCountFetchAt = useRef<number | null>(null);
useEffect(() => {
  if (!canViewModerationQueue) return;
  const onChange = (nextState: AppStateStatus) => {
    if (nextState !== 'active') return;
    const now = Date.now();
    if (lastCountFetchAt.current && now - lastCountFetchAt.current < 60_000) return;
    lastCountFetchAt.current = now;
    PropertyService.getModerationQueueCount()
      .then(setPendingModerationCount).catch(() => {});
  };
  const sub = AppState.addEventListener('change', onChange);
  return () => sub.remove();
}, [canViewModerationQueue]);
```

## Warnings

### WR-01: Empty Alert message when approve/reject fails with no response.data.message

**File:** `src/screens/ModerationQueueScreen.tsx:83, 139, 169`; `src/screens/PropertyDetailsScreen.tsx:317, 339`
**Issue:** All five error-handling paths use `Alert.alert(t('common.error'), err?.response?.data?.message || err?.message || '')`. When the server returns a 500 with no body and the axios error has no `.message` (rare but possible), the user sees an Alert with an empty message body and just an "OK" button — no actionable signal. This is consistent with the rest of the codebase but is a code smell that compounds because it's now in five new places.

**Fix:** Add a generic fallback string and i18n key:

```tsx
Alert.alert(t('common.error'), err?.response?.data?.message || err?.message || t('common.errorGeneric'));
```

With `'common.errorGeneric': 'Something went wrong. Please try again.'` / `«Что-то пошло не так. Попробуйте ещё раз.»`. Apply uniformly to all five sites.

---

### WR-02: accessibilityLabel mixes translated string with hardcoded English suffix

**File:** `src/screens/ProfileScreen.tsx:282`
**Issue:** `accessibilityLabel={`${t('moderation.queue.entryPoint')}: ${displayCount} pending`}` — the literal " pending" word is in English regardless of locale. Russian VoiceOver users will hear "Очередь модерации: 3 pending" which is jarring.

**Fix:** Add an i18n key for the count suffix:

```ts
// en.ts
'moderation.queue.entryPoint.a11yPending': '{count} pending',
// ru.ts
'moderation.queue.entryPoint.a11yPending': '{count} ожидает проверки',
```

```tsx
accessibilityLabel={`${t('moderation.queue.entryPoint')}: ${t('moderation.queue.entryPoint.a11yPending').replace('{count}', String(displayCount))}`}
```

Or, simpler, omit the count from the a11y label (the screen reader will read the badge text separately).

---

### WR-03: ModerationQueueScreen `keyExtractor` and PropertyService.id mapping assume `_id` is always present and `id` is set

**File:** `src/services/PropertyService.ts:306`; `src/screens/ModerationQueueScreen.tsx:266`
**Issue:** `getModerationQueue` maps `({ ...p, id: p._id })` which works, but `_id` is a Mongoose ObjectId, not a string. After spread, `id` is the ObjectId object, and `keyExtractor={(item) => item.id}` returns an object — FlatList will warn "Each child in a list should have a unique 'key' prop. Make sure that the keyExtractor returns a unique string." The existing `PropertyService.getPropertyById` works because Mongoose serializes ObjectId on JSON serialization (the response.data.id is already a string), but the moderation queue route returns raw `Property.find()` results — `items` will have `_id` as an ObjectId-shaped object after JSON serialization (typically `{ "_id": "65f1..." }` if `.toJSON()` runs, or the raw object otherwise).

In practice this works because Mongoose's default `toJSON` stringifies ObjectId, but the same code in `getModerationQueue` does `(response.data.items || []).map(...)` — `response.data` is JSON-parsed by axios, and `_id` arrives as a string. So the practical impact is zero today. **However** it is the only `keyExtractor` in this phase that doesn't coerce to String; if the backend ever changes to return `lean()` results without `toJSON`, the bug surfaces.

**Fix:** Defensively coerce in keyExtractor: `keyExtractor={(item) => String(item.id)}`. Apply the same hardening in PropertyService:

```ts
items: (response.data.items || []).map((p: any) => ({ ...p, id: String(p._id) })),
```

---

### WR-04: `getModerationQueueCount` swallows 403 / 401 errors silently — moderators with revoked roles see "0 pending" instead of being prompted to refresh

**File:** `src/services/PropertyService.ts:320-328`
**Issue:** The catch block returns `0` on any error, including a 403 `role-revoked` from the backend (which Phase 1 ROLE-11 specifically intends to surface as a banner via the apiClient interceptor). Returning 0 silently means the moderator can lose moderator access and never know — the badge just shows 0 forever. The interceptor's `RoleRefreshBanner` typically catches 403s, but only if the error propagates; the explicit `return 0` here does propagate the 403 through the interceptor first (axios runs interceptors before the method's catch), so the banner should still fire. The behavior is acceptable but the swallowing is a code smell.

**Fix:** Distinguish "transient network error" from "permission denied" so the consumer can react:

```ts
getModerationQueueCount: async (): Promise<number> => {
  try {
    const { totalCount } = await PropertyService.getModerationQueue();
    return totalCount;
  } catch (error: any) {
    // 403 / 401 already handled by apiClient interceptor (banner / hard logout);
    // network blips → 0 is fine. Re-throw permission errors so callers can react.
    if (error instanceof PermissionDeniedError) throw error;
    console.error('Error fetching moderation queue count:', error?.message);
    return 0;
  }
},
```

---

### WR-05: Race-toast `Alert.alert('', ...)` uses empty title — iOS renders an Alert with no header text, just body

**File:** `src/screens/ModerationQueueScreen.tsx:113`; `src/screens/PropertyDetailsScreen.tsx:294`
**Issue:** Both 409 race-handlers fire `Alert.alert('', t('moderation.race.toast'))`. iOS Alert with an empty-string title shows a "naked" body with extra whitespace; Android renders inconsistently across versions (some show the empty space, some collapse). The intent is "toast" but the implementation is "Alert with empty title." The plan explicitly says "fire the MOD-15 verbatim toast" — a real toast (e.g., a `Snackbar`-style transient bottom banner) would be the right primitive, but absent that, use a proper Alert title.

**Fix:** Either add a title key (`'moderation.race.title': 'Already reviewed'` / `«Уже рассмотрено»`) or pass the message as both title and body so the title slot is non-empty and recognizable:

```tsx
Alert.alert(t('moderation.race.title'), t('moderation.race.toast'));
```

This also satisfies REQUIREMENTS.md MOD-15's "verbatim copy" rule because the body text is preserved.

---

### WR-06: Empty-state alert in `ModerationQueueScreen.load()` swallows permission errors with the user-facing "Error" alert

**File:** `src/screens/ModerationQueueScreen.tsx:81-87`
**Issue:** When `PropertyService.getModerationQueue()` throws `PermissionDeniedError`, the catch block calls `Alert.alert(t('common.error'), err?.response?.data?.message || err?.message || '')`. `PermissionDeniedError`'s message is `'E_PERMISSION_DENIED'` — the user sees a literal "E_PERMISSION_DENIED" string. The plan calls out (D-17, D-18) that callers should translate via `t('errors.permissionDenied')`.

**Fix:**

```tsx
try {
  const { items: queueItems } = await PropertyService.getModerationQueue();
  setItems(queueItems as Property[]);
} catch (err: any) {
  console.error('Failed to load moderation queue:', err);
  if (err instanceof PermissionDeniedError || err?.message === 'E_PERMISSION_DENIED') {
    Alert.alert(t('common.error'), t('errors.permissionDenied'));
    onBack(); // bounce out — they can't see this screen anyway
    return;
  }
  Alert.alert(t('common.error'), err?.response?.data?.message || err?.message || '');
}
```

(Import `PermissionDeniedError` from `'../hooks/useRole'`.)

## Info

### IN-01: ModerationLog `before` snapshot doesn't capture pre-update field values for fields the moderator changed, only `status`

**File:** `../backend-services/JayTap-services/src/routes/moderationRoutes.js:262-271`
**Issue:** The diff loop iterates `Object.keys(updateData)` and assigns `before[k] = orig === undefined ? null : orig` only when values differ. After CR-01's parsing fix, this works. But pre-fix, `JSON.stringify(orig)` (an array) won't equal `JSON.stringify(next)` (the JSON string of the same array), so EVERY field shows up as "changed" in the audit log — bloating audit rows with false-positive churn. Once CR-01 is fixed, this issue resolves itself, but worth flagging that the audit log is currently unreliable as a change-tracker for any edit-on-behalf save.

**Fix:** Implicit — fixing CR-01 makes this go away.

---

### IN-02: `RejectListingModal` defaults to `'incomplete-info'` reason on every open without showing affordance to deselect

**File:** `src/components/RejectListingModal.tsx:52-62`
**Issue:** The modal pre-selects `incomplete-info` so submit is always enabled, matching Phase 4.5 precedent. This is intentional per the comment, but it's worth flagging for moderation UX research — if a moderator hits "Reject" by mistake from the action footer, the chip is already armed and the only escape is Cancel. Consider adding an "explicit selection required" mode for the property-details footer mount (where the modal is more discoverable and the consequences are higher) while keeping the queue's pre-selection.

**Fix:** Optional — gather data from M2 launch first.

---

### IN-03: PropertyDetailsScreen mod footer renders ABOVE Hospitality contact bar but uses `position: relative` flow — could overlap on small screens

**File:** `src/screens/PropertyDetailsScreen.tsx:1305-1367`
**Issue:** The mod footer is a sibling of the Hospitality sticky contact bar (lines just before 1307). For Hospitality listings in `pending` status, both render. The Hospitality bar uses `position: absolute, bottom: 0` (per Phase 6 HOSP-04 D-16) and the mod footer uses normal flow with `paddingBottom: insets.bottom`. On Hospitality + pending, they can overlap or stack awkwardly. In practice, Hospitality listings in pending state are uncommon (the `propertyType.hostel` and `propertyType.hotel` triggers are rare for first-time submissions), but worth flagging.

**Fix:** Add an explicit guard: only render the mod footer when the Hospitality contact bar is not also rendering, OR position the mod footer absolutely above the contact bar. Practically: if `category === 'Hospitality' && showModFooter`, hide the contact bar.

---

### IN-04: `propertyRoutes.js:316` re-`require('../models/User')` shadows the top-level `User` import

**File:** `../backend-services/JayTap-services/src/routes/propertyRoutes.js:7, 327`
**Issue:** Line 7 imports `User`. Line 327 inside the `GET /:id` handler does `const User = require('../models/User');` again — shadowing the outer binding inside that block. Not Phase 3 code (it's pre-existing), but the GET /:id handler was modified for MOD-13 in this phase, so flagging while it's in scope. Harmless functionally; cosmetic only.

**Fix:** Remove the inner `require` (the outer `User` is already in scope).

---

### IN-05: `serviceAreas.js` exports `module.exports = {...}` then `module.exports.isInServiceArea = ...` overwrites the named export only — fine, but `isInServiceArea` isn't called anywhere in Phase 3

**File:** `../backend-services/JayTap-services/src/config/serviceAreas.js:18-24`
**Issue:** The optional helper `isInServiceArea` is defined but never imported. The comment says "M2 does NOT enforce that the listing's location is actually outside this list" — agreed. The function is dead-code-but-intentional ("informational for M3+ admin UX") which is why it stays. Just calling out that an `eslint --no-unused-vars` config (or equivalent) would flag this if the project ever adopts that rule.

**Fix:** Optional — tag the export with a `// eslint-disable-next-line` or remove if the project consensus is "no dead code."

---

_Reviewed: 2026-05-02T22:53:20Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_

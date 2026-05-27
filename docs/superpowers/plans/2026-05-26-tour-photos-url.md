# Tour Photos URL (Ricoh / Matterport) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Activate the disabled "Photos" tile in the 2x2 action grid under the 3D Virtual Tour card on `PropertyDetailsScreen` so it hosts a single panoramic-photos URL (Ricoh, Matterport, or any https:// provider) and opens it in the existing `Tour3DScreen` WebView.

**Architecture:** Add `media.tourPhotosUrl?: string` to the nested `Property` shape on both backend (Mongoose) and RN client (TS type). Capture admin-side in `MediaCurationScreen` (mirroring the existing `tourUrl` input). Flip the one-line `getTourPhotosUrl` reader that quick task `260525-eva` set up. Relabel the tile via a new i18n key `property.photos360`. Render path is unchanged — `setActivePhotosUrl` overlay + `Tour3DScreen` WebView already handle the URL identically to how `media.tourUrl` opens today.

**Tech Stack:** React Native 0.84 (TypeScript) + Node.js Express + Mongoose. Cross-repo: `JayTap/` (RN client) and `JayTap-services/` (backend).

**Cross-repo working dirs:**
- **RN client:** `/Users/beckmaldinVL/development/mobileApps/JayTap`
- **Backend:** `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services` — requires `nvm use 24` before any `npm` / `node` command (declares `engines.node >=22.12.0`).

Each task header declares **WORKDIR**. Subagents executing this plan must `cd <workdir> && ` prepend every Bash command and verify the branch via `git branch --show-current` before committing (mitigation for the recurring subagent-cwd-drift pattern noted in user memory).

**Predecessor:** Quick task `260525-eva` (set up the single-point cutover; deferred the schema field to this plan).

---

## File Structure

### Backend (`JayTap-services/`)

| Path | Change | Responsibility |
|---|---|---|
| `src/models/Property.js` | Modify (lines 150-176, `media` block) | Add `tourPhotosUrl` field with Mongoose-level https:// validator |
| `src/routes/moderationRoutes.js` | Modify (lines 208-316, POST /listings/:id/media handler) | Accept `tourPhotosUrl` in body; validate; add to $set; include in audit log; update MEDIA_NO_OP guard |
| `src/__tests__/moderationRoutes.test.js` | Modify (around lines 1129-1331) | Extend POST /media tests to round-trip `tourPhotosUrl` and reject invalid protocols |

### RN client (`JayTap/`)

| Path | Change | Responsibility |
|---|---|---|
| `src/types/Property.ts` | Modify (lines 82-86, `media` block) | Add `tourPhotosUrl?: string` to nested `media` |
| `src/utils/getTourPhotosUrl.ts` | Modify (entire file, one-line body flip + doc comment update) | Reader returns `property.media?.tourPhotosUrl` instead of always-`undefined` |
| `src/utils/__tests__/getTourPhotosUrl.test.ts` | Modify (lines 19-58) | Update 4 cases to pin new behavior; add 5th positive case |
| `src/services/MediaCurationService.ts` | Modify (lines 65-98, `uploadMedia` signature + body) | Add `tourPhotosUrl?: string` param; append to FormData |
| `src/screens/MediaCurationScreen.tsx` | Modify (state at 91-99, validator at 250-258, save at 264-349, JSX at 693-740, error mapping at 315-319) | Rename `validateTourUrl` → `validateHttpsUrl`; add `tourPhotosUrlDraft`/`tourPhotosUrlValid` state; add diff + payload field; render new TextInput block; map new error code |
| `src/screens/__tests__/MediaCurationScreen.test.tsx` | Modify (after line 121 describe block) | Smoke test for new input rendering with current i18n key |
| `src/screens/PropertyDetailsScreen.tsx` | Modify (line 930, tile label `t(...)` call) | Swap `t('property.photos')` → `t('property.photos360')` |
| `src/locales/en.ts` | Modify (after line 150 + after line 798) | Add `property.photos360` + 4 `moderation.mediaCuration.tourPhotosUrl.*` keys |
| `src/locales/ru.ts` | Modify (mirror EN positions) | Add Russian equivalents (i18n parity gate) |

---

## Task 1: Backend — add `tourPhotosUrl` to Mongoose schema

**WORKDIR:** `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services`
**Pre-task:** `nvm use 24` (or confirm `node -v` ≥ 22.12).

**Files:**
- Modify: `src/models/Property.js` (lines 150-176, `media` block)

- [ ] **Step 1: Write the failing test**

Open `src/__tests__/moderationRoutes.test.js`. Below the existing test at ~line 1148 ("POST with only tourUrl (no files) → 200; tourUrl set, photos preserved"), add a parallel test:

```js
test('POST with only tourPhotosUrl (no files) → 200; tourPhotosUrl set, photos preserved', async () => {
  const token = await buildToken({ sub: 'mod-a-uid', role: 'moderator', kind: 'valid' });
  await Property.findByIdAndUpdate(pendingListing._id, { 'media.photos': ['https://prev.com/p.jpg'] });
  const res = await request(app)
    .post(`/api/moderation/listings/${pendingListing._id}/media`)
    .set('Authorization', `Bearer ${token}`)
    .field('tourPhotosUrl', 'https://my.ricoh360.com/r/abc123');
  expect(res.status).toBe(200);
  expect(res.body.media.tourPhotosUrl).toBe('https://my.ricoh360.com/r/abc123');
  expect(res.body.media.photos).toEqual(['https://prev.com/p.jpg']); // preserved
});
```

**Note on token pattern:** the existing tourUrl tests in this describe block do NOT have a `modToken` defined at describe-scope — each test builds its own `const token = await buildToken({ sub: 'mod-a-uid', role: 'moderator', kind: 'valid' });`. Mirror that pattern in every test you add. Do NOT reference a `modToken` variable; it doesn't exist.

- [ ] **Step 2: Run test to verify it fails**

Run: `nvm use 24 && npx jest src/__tests__/moderationRoutes.test.js -t 'POST with only tourPhotosUrl'`
Expected: **FAIL** — either `res.body.media.tourPhotosUrl` is `undefined` (field never persisted) OR the test errors out earlier on a 400 MEDIA_NO_OP because the route doesn't recognize the field.

- [ ] **Step 3: Add the Mongoose field**

In `src/models/Property.js`, inside the `media: { … }` block (line 150), add `tourPhotosUrl` directly after the existing `tourUrl` definition (after the closing brace of `tourUrl` validator, before the closing brace of `media`):

```js
    // 2026-05-26 tour-photos plan — panoramic photos URL (Ricoh / Matterport /
    // any https:// provider). Same shape + validator as tourUrl; rendered by the
    // 360° Photos tile in PropertyDetailsScreen via getTourPhotosUrl reader.
    tourPhotosUrl: {
      type: String,
      validate: {
        validator: function(v) {
          if (v === undefined || v === null || v === '') return true; // optional field
          try {
            const u = new URL(v);
            return u.protocol === 'https:';
          } catch {
            return false;
          }
        },
        message: 'tourPhotosUrl must be a valid https:// URL',
      },
    },
```

- [ ] **Step 4: Run test to confirm it still fails for the right reason**

Run: `nvm use 24 && npx jest src/__tests__/moderationRoutes.test.js -t 'POST with only tourPhotosUrl'`
Expected: **STILL FAIL** — schema accepts the field but the route handler doesn't pass it through yet. This is intentional: Task 2 wires the route.

- [ ] **Step 5: Commit (schema-only change)**

```bash
cd /Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services
git add src/models/Property.js src/__tests__/moderationRoutes.test.js
git status   # verify only those two files staged
git branch --show-current   # verify branch
git commit -m "feat(model): add media.tourPhotosUrl field with https-only validator

Mirrors media.tourUrl validator shape. Route handler wiring lands in
the next commit; this test still fails on round-trip until then.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Backend — accept `tourPhotosUrl` in POST `/listings/:id/media`

**WORKDIR:** `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services`

**Files:**
- Modify: `src/routes/moderationRoutes.js` (lines 208-316, POST handler body)

- [ ] **Step 1: Wire body parsing + validation**

In `src/routes/moderationRoutes.js`, inside the POST `/listings/:id/media` handler (starts ~line 210):

Find this block (~lines 220-237):

```js
      const tourUrlRaw = req.body?.tourUrl;

      // D-08 — generic https:// validation. NO Matterport allowlist (any https URL
      // accepted; mods curate trust manually). Mitigates T-05 (javascript: scheme
      // and friends).
      let tourUrl;
      if (typeof tourUrlRaw === 'string' && tourUrlRaw.length > 0) {
        try {
          const u = new URL(tourUrlRaw);
          if (u.protocol !== 'https:') throw new Error('non-https');
          tourUrl = tourUrlRaw;
        } catch {
          return res.status(400).json({
            code: 'MEDIA_INVALID_TOUR_URL',
            message: 'tourUrl must be a valid https:// URL',
          });
        }
      }
```

Add a parallel block immediately after it:

```js
      // 2026-05-26 tour-photos plan — same shape as tourUrl above.
      const tourPhotosUrlRaw = req.body?.tourPhotosUrl;
      let tourPhotosUrl;
      if (typeof tourPhotosUrlRaw === 'string' && tourPhotosUrlRaw.length > 0) {
        try {
          const u = new URL(tourPhotosUrlRaw);
          if (u.protocol !== 'https:') throw new Error('non-https');
          tourPhotosUrl = tourPhotosUrlRaw;
        } catch {
          return res.status(400).json({
            code: 'MEDIA_INVALID_TOUR_PHOTOS_URL',
            message: 'tourPhotosUrl must be a valid https:// URL',
          });
        }
      }
```

- [ ] **Step 2: Update MEDIA_NO_OP guard**

Find this block (~lines 241-246):

```js
      if (!photoUrls.length && !videoUrls.length && tourUrl === undefined) {
        return res.status(400).json({
          code: 'MEDIA_NO_OP',
          message: 'Provide at least one photo, video, or tourUrl',
        });
      }
```

Replace with:

```js
      if (!photoUrls.length && !videoUrls.length && tourUrl === undefined && tourPhotosUrl === undefined) {
        return res.status(400).json({
          code: 'MEDIA_NO_OP',
          message: 'Provide at least one photo, video, tourUrl, or tourPhotosUrl',
        });
      }
```

- [ ] **Step 3: Update $set to include `tourPhotosUrl`**

Find this block (~lines 264-266):

```js
      if (tourUrl !== undefined) {
        update.$set = { 'media.tourUrl': tourUrl };
      }
```

Replace with:

```js
      if (tourUrl !== undefined || tourPhotosUrl !== undefined) {
        update.$set = update.$set || {};
        if (tourUrl !== undefined) update.$set['media.tourUrl'] = tourUrl;
        if (tourPhotosUrl !== undefined) update.$set['media.tourPhotosUrl'] = tourPhotosUrl;
      }
```

- [ ] **Step 4: Update audit log before/after**

Find this block (~lines 294-303):

```js
          before: {
            'media.photos.length': beforeDoc.media?.photos?.length || 0,
            'media.videos.length': beforeDoc.media?.videos?.length || 0,
            'media.tourUrl.set':   !!beforeDoc.media?.tourUrl,
          },
          after: {
            'media.photos.length': result.media?.photos?.length || 0,
            'media.videos.length': result.media?.videos?.length || 0,
            'media.tourUrl.set':   !!result.media?.tourUrl,
          },
```

Replace with:

```js
          before: {
            'media.photos.length': beforeDoc.media?.photos?.length || 0,
            'media.videos.length': beforeDoc.media?.videos?.length || 0,
            'media.tourUrl.set':         !!beforeDoc.media?.tourUrl,
            'media.tourPhotosUrl.set':   !!beforeDoc.media?.tourPhotosUrl,
          },
          after: {
            'media.photos.length': result.media?.photos?.length || 0,
            'media.videos.length': result.media?.videos?.length || 0,
            'media.tourUrl.set':         !!result.media?.tourUrl,
            'media.tourPhotosUrl.set':   !!result.media?.tourPhotosUrl,
          },
```

- [ ] **Step 5: Run the Task-1 test to verify it now passes**

Run: `nvm use 24 && npx jest src/__tests__/moderationRoutes.test.js -t 'POST with only tourPhotosUrl'`
Expected: **PASS** — `res.body.media.tourPhotosUrl` is `'https://my.ricoh360.com/r/abc123'`, photos preserved.

- [ ] **Step 6: Add invalid-URL and no-op tests**

In `src/__tests__/moderationRoutes.test.js`, after the test from Task 1 Step 1, add:

```js
test('POST with http:// tourPhotosUrl → 400 MEDIA_INVALID_TOUR_PHOTOS_URL', async () => {
  const token = await buildToken({ sub: 'mod-a-uid', role: 'moderator', kind: 'valid' });
  const res = await request(app)
    .post(`/api/moderation/listings/${pendingListing._id}/media`)
    .set('Authorization', `Bearer ${token}`)
    .field('tourPhotosUrl', 'http://insecure-ricoh.com/r/abc');
  expect(res.status).toBe(400);
  expect(res.body.code).toBe('MEDIA_INVALID_TOUR_PHOTOS_URL');
});

test('POST with javascript: tourPhotosUrl → 400 MEDIA_INVALID_TOUR_PHOTOS_URL (T-05 mitigation)', async () => {
  const token = await buildToken({ sub: 'mod-a-uid', role: 'moderator', kind: 'valid' });
  const res = await request(app)
    .post(`/api/moderation/listings/${pendingListing._id}/media`)
    .set('Authorization', `Bearer ${token}`)
    .field('tourPhotosUrl', 'javascript:alert(1)');
  expect(res.status).toBe(400);
  expect(res.body.code).toBe('MEDIA_INVALID_TOUR_PHOTOS_URL');
});

test('POST with both tourUrl and tourPhotosUrl → 200; both fields set', async () => {
  const token = await buildToken({ sub: 'mod-a-uid', role: 'moderator', kind: 'valid' });
  const res = await request(app)
    .post(`/api/moderation/listings/${pendingListing._id}/media`)
    .set('Authorization', `Bearer ${token}`)
    .field('tourUrl',        'https://my.matterport.com/show/?m=xyz')
    .field('tourPhotosUrl',  'https://my.ricoh360.com/r/abc');
  expect(res.status).toBe(200);
  expect(res.body.media.tourUrl).toBe('https://my.matterport.com/show/?m=xyz');
  expect(res.body.media.tourPhotosUrl).toBe('https://my.ricoh360.com/r/abc');
});
```

Run: `nvm use 24 && npx jest src/__tests__/moderationRoutes.test.js -t 'tourPhotosUrl'`
Expected: **all 4 tourPhotosUrl tests PASS**.

- [ ] **Step 7: Run full moderationRoutes test file to confirm no regression**

Run: `nvm use 24 && npx jest src/__tests__/moderationRoutes.test.js`
Expected: all existing tests still PASS (the MEDIA_NO_OP message string changed but no existing test asserts that exact message — verify the test output to confirm).

- [ ] **Step 8: Commit**

```bash
cd /Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services
git add src/routes/moderationRoutes.js src/__tests__/moderationRoutes.test.js
git status   # verify only those two files staged
git branch --show-current
git commit -m "feat(media): accept tourPhotosUrl in POST /listings/:id/media

Mirrors tourUrl handling: https-only protocol gate, audit log
before/after, atomic \$set. New error code MEDIA_INVALID_TOUR_PHOTOS_URL.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: RN client — add `tourPhotosUrl` to Property type

**WORKDIR:** `/Users/beckmaldinVL/development/mobileApps/JayTap`

**Files:**
- Modify: `src/types/Property.ts` (lines 82-86, `media` block)

- [ ] **Step 1: Add the field**

In `src/types/Property.ts`, change lines 82-86:

```ts
  // === Nested media (Phase 3 inversion target) ===
  media?: {
    photos: string[];
    videos: string[];
    tourUrl?: string;
  };
```

to:

```ts
  // === Nested media (Phase 3 inversion target) ===
  media?: {
    photos: string[];
    videos: string[];
    tourUrl?: string;
    tourPhotosUrl?: string; // 2026-05-26 plan — panoramic photos URL (Ricoh / Matterport / any https://)
  };
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit 2>&1 | head -50`
Expected: 0 NEW errors. Pre-existing errors (App.tsx Property.tours, DeleteListingModal, ChatComposeScreen, etc. — same baseline noted in memory `m3-shipped-2026-05-11`) are unchanged. The new field is optional, so adding it cannot break any existing consumer.

- [ ] **Step 3: Commit**

```bash
cd /Users/beckmaldinVL/development/mobileApps/JayTap
git add src/types/Property.ts
git branch --show-current
git commit -m "feat(types): add Property.media.tourPhotosUrl?: string

Single optional string, provider-agnostic (Ricoh / Matterport / any
https://). Mirrors media.tourUrl shape.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: RN client — flip the `getTourPhotosUrl` reader + update tests

**WORKDIR:** `/Users/beckmaldinVL/development/mobileApps/JayTap`

**Files:**
- Modify: `src/utils/getTourPhotosUrl.ts` (entire file)
- Modify: `src/utils/__tests__/getTourPhotosUrl.test.ts` (entire file)

- [ ] **Step 1: Update test cases first (red)**

Replace the body of `src/utils/__tests__/getTourPhotosUrl.test.ts` with:

```ts
/**
 * @format
 *
 * 2026-05-26 tour-photos plan — Property.media now has a `tourPhotosUrl`
 * field. The reader returns it when present, undefined otherwise.
 *
 * The "no fallback to media.photos" and "no duplication of media.tourUrl"
 * invariants from the original 260525-eva fix are preserved.
 *
 * @see docs/superpowers/specs/2026-05-26-tour-photos-url-design.md
 */
import { getTourPhotosUrl } from '../getTourPhotosUrl';
import type { Property } from '../../types/Property';

describe('getTourPhotosUrl (2026-05-26 plan — schema-aware behavior)', () => {
  test('returns undefined for an empty property', () => {
    const property: Property = { id: 'prop-empty' };
    expect(getTourPhotosUrl(property)).toBeUndefined();
  });

  test('returns undefined when media.photos is populated but tourPhotosUrl is not (no fallback misuse)', () => {
    const property: Property = {
      id: 'prop-with-photos-only',
      media: {
        photos: [
          'https://example.com/photo-1.jpg',
          'https://example.com/photo-2.jpg',
        ],
        videos: [],
      },
    };
    expect(getTourPhotosUrl(property)).toBeUndefined();
  });

  test('returns undefined when media.tourUrl is populated but tourPhotosUrl is not (no duplication of 3D Virtual Tour target)', () => {
    const property: Property = {
      id: 'prop-with-3d-tour-only',
      media: {
        photos: [],
        videos: [],
        tourUrl: 'https://my.matterport.com/show/?m=abcdef',
      },
    };
    expect(getTourPhotosUrl(property)).toBeUndefined();
  });

  test('returns undefined when instagramUrl is populated but tourPhotosUrl is not (no cross-channel confusion)', () => {
    const property: Property = {
      id: 'prop-with-instagram-only',
      instagramUrl: 'https://instagram.com/jaytap-listing',
    };
    expect(getTourPhotosUrl(property)).toBeUndefined();
  });

  test('returns the URL when media.tourPhotosUrl is populated (Ricoh)', () => {
    const property: Property = {
      id: 'prop-with-ricoh',
      media: {
        photos: [],
        videos: [],
        tourPhotosUrl: 'https://my.ricoh360.com/r/abc123',
      },
    };
    expect(getTourPhotosUrl(property)).toBe('https://my.ricoh360.com/r/abc123');
  });

  test('returns the URL when media.tourPhotosUrl is populated (Matterport-style)', () => {
    const property: Property = {
      id: 'prop-with-matterport-photos',
      media: {
        photos: [],
        videos: [],
        tourPhotosUrl: 'https://my.matterport.com/show/?m=panphotos',
      },
    };
    expect(getTourPhotosUrl(property)).toBe('https://my.matterport.com/show/?m=panphotos');
  });

  test('returns the URL even when tourUrl is also set (independent fields)', () => {
    const property: Property = {
      id: 'prop-with-both-tours',
      media: {
        photos: [],
        videos: [],
        tourUrl:        'https://my.matterport.com/show/?m=walk',
        tourPhotosUrl:  'https://my.ricoh360.com/r/pan',
      },
    };
    expect(getTourPhotosUrl(property)).toBe('https://my.ricoh360.com/r/pan');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest src/utils/__tests__/getTourPhotosUrl.test.ts -v`
Expected: 4 tests PASS (the undefined cases — body still returns undefined). 3 tests FAIL (the positive cases expecting the URL). Output should clearly show the 3 failures with "Expected 'https://…' Received undefined".

- [ ] **Step 3: Flip the reader (green)**

Replace `src/utils/getTourPhotosUrl.ts` with:

```ts
/**
 * getTourPhotosUrl — Single source of truth for resolving a property's
 * dedicated tour-photos URL (Ricoh / Matterport / any https:// panoramic
 * photo-tour provider).
 *
 * Distinct from BOTH the regular photo carousel (`media.photos[]` — the
 * swipeable hero JPGs at the top of PropertyDetailsScreen) AND the 3D
 * Virtual Tour (`media.tourUrl` — drives the `TourHeroCard` hero). It is
 * the target opened by the "360° Photos" tile in the 2x2 action grid
 * under the 3D Tour card.
 *
 * Convention: matches `propertyCategory.ts` shape (named export, pure fn,
 * no React imports, no side effects).
 *
 * @see src/screens/PropertyDetailsScreen.tsx — 360° Photos tile in the 2x2 media grid
 * @see docs/superpowers/specs/2026-05-26-tour-photos-url-design.md
 * @see quick task 260525-eva — set up this single-point cutover
 */
import type { Property } from '../types/Property';

export function getTourPhotosUrl(property: Property): string | undefined {
  return property.media?.tourPhotosUrl;
}
```

- [ ] **Step 4: Run tests to verify all pass**

Run: `npx jest src/utils/__tests__/getTourPhotosUrl.test.ts -v`
Expected: **7/7 PASS**.

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit 2>&1 | grep -E "getTourPhotosUrl"`
Expected: empty output (0 errors mentioning the file).

- [ ] **Step 6: Commit**

```bash
cd /Users/beckmaldinVL/development/mobileApps/JayTap
git add src/utils/getTourPhotosUrl.ts src/utils/__tests__/getTourPhotosUrl.test.ts
git branch --show-current
git commit -m "feat(reader): flip getTourPhotosUrl to read media.tourPhotosUrl

The one-line cutover quick task 260525-eva set up. Photos tile now
activates automatically when a listing has media.tourPhotosUrl set.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: RN client — add i18n keys (EN + RU)

**WORKDIR:** `/Users/beckmaldinVL/development/mobileApps/JayTap`

**Files:**
- Modify: `src/locales/en.ts` (after line 150 + after line 798)
- Modify: `src/locales/ru.ts` (mirror)

- [ ] **Step 1: Add `property.photos360` (EN)**

In `src/locales/en.ts`, find line 150 (`'property.photos': 'Photos',`) and insert immediately after it:

```ts
  'property.photos360': '360° Photos',
```

- [ ] **Step 2: Add `property.photos360` (RU)**

In `src/locales/ru.ts`, find the `'property.photos': 'Фото',` line (~152) and insert immediately after it:

```ts
  'property.photos360': '360° Фото',
```

- [ ] **Step 3: Add 4 `moderation.mediaCuration.tourPhotosUrl.*` keys (EN)**

In `src/locales/en.ts`, find line 798 (`'moderation.mediaCuration.tourUrl.invalid': 'Tour URL must start with https://',`) and insert immediately after it:

```ts
  'moderation.mediaCuration.tourPhotosUrl.label': '360° photos URL',
  'moderation.mediaCuration.tourPhotosUrl.placeholder': 'https://my.ricoh360.com/r/…',
  'moderation.mediaCuration.tourPhotosUrl.hint': 'Paste a Ricoh, Matterport, or other https:// panoramic-photos link. Optional.',
  'moderation.mediaCuration.tourPhotosUrl.invalid': '360° photos URL must start with https://',
  'moderation.mediaCuration.error.invalidTourPhotosUrl': '360° photos URL must start with https://',
```

(The extra `error.invalidTourPhotosUrl` key parallels the existing `error.invalidTourUrl` consumed by `handleSave`'s Alert.alert in Task 7.)

- [ ] **Step 4: Add 4 `moderation.mediaCuration.tourPhotosUrl.*` keys (RU)**

In `src/locales/ru.ts`, find the corresponding `'moderation.mediaCuration.tourUrl.invalid'` line (~792) and insert immediately after it:

```ts
  'moderation.mediaCuration.tourPhotosUrl.label': 'Ссылка на 360° фото',
  'moderation.mediaCuration.tourPhotosUrl.placeholder': 'https://my.ricoh360.com/r/…',
  'moderation.mediaCuration.tourPhotosUrl.hint': 'Вставьте ссылку Ricoh, Matterport или другую https:// — необязательно.',
  'moderation.mediaCuration.tourPhotosUrl.invalid': 'Ссылка на 360° фото должна начинаться с https://',
  'moderation.mediaCuration.error.invalidTourPhotosUrl': 'Ссылка на 360° фото должна начинаться с https://',
```

- [ ] **Step 5: Run i18n parity check**

Run: `bash scripts/check-i18n-parity.sh`
Expected: PASS (all 5 new keys present in both EN and RU; no missing/extra keys).

- [ ] **Step 6: Type-check (TranslationKeys type derives from the EN map)**

Run: `npx tsc --noEmit 2>&1 | grep -E "locales|TranslationKeys"`
Expected: empty (no errors).

- [ ] **Step 7: Commit**

```bash
cd /Users/beckmaldinVL/development/mobileApps/JayTap
git add src/locales/en.ts src/locales/ru.ts
git branch --show-current
git commit -m "feat(i18n): add 360° photos tile + moderation tour-photos URL keys

EN + RU pair for property.photos360 and 5 moderation.mediaCuration.*
keys covering label/placeholder/hint/invalid + the save-flow alert.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: RN client — rename `validateTourUrl` → `validateHttpsUrl`

**WORKDIR:** `/Users/beckmaldinVL/development/mobileApps/JayTap`

**Files:**
- Modify: `src/screens/MediaCurationScreen.tsx` (lines 250, 261, 270, 347)

- [ ] **Step 1: Rename the callback definition**

In `src/screens/MediaCurationScreen.tsx` at line 250, change:

```ts
  const validateTourUrl = useCallback((value: string): boolean => {
```

to:

```ts
  const validateHttpsUrl = useCallback((value: string): boolean => {
```

The body is unchanged — it's already protocol-agnostic.

- [ ] **Step 2: Update the 4 call sites**

| Line | Old | New |
|---|---|---|
| 261 | `setTourUrlValid(validateTourUrl(tourUrlDraft));` | `setTourUrlValid(validateHttpsUrl(tourUrlDraft));` |
| 262 | `}, [tourUrlDraft, validateTourUrl]);` | `}, [tourUrlDraft, validateHttpsUrl]);` |
| 270 | `if (tourUrlToSend && !validateTourUrl(tourUrlToSend)) {` | `if (tourUrlToSend && !validateHttpsUrl(tourUrlToSend)) {` |
| 347 | `    validateTourUrl,` (in handleSave's useCallback deps) | `    validateHttpsUrl,` |

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit 2>&1 | grep -E "MediaCurationScreen|validateTourUrl"`
Expected: 0 errors. If any line still references `validateTourUrl`, fix it.

- [ ] **Step 4: Run existing tests to confirm no regression**

Run: `npx jest src/screens/__tests__/MediaCurationScreen.test.tsx`
Expected: all existing tests still PASS (the rename is internal; no public surface changed).

- [ ] **Step 5: Commit**

```bash
cd /Users/beckmaldinVL/development/mobileApps/JayTap
git add src/screens/MediaCurationScreen.tsx
git branch --show-current
git commit -m "refactor(media): rename validateTourUrl → validateHttpsUrl

Body was already protocol-agnostic. Renaming so the upcoming
tourPhotosUrl input can reuse the same callback without semantic
mismatch.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: RN client — extend `MediaCurationService.uploadMedia` to send `tourPhotosUrl`

**WORKDIR:** `/Users/beckmaldinVL/development/mobileApps/JayTap`

**Files:**
- Modify: `src/services/MediaCurationService.ts` (lines 50-98)

- [ ] **Step 1: Add the param to the signature + FormData append**

In `src/services/MediaCurationService.ts`, change the `uploadMedia` definition (lines 65-98):

Replace:

```ts
  uploadMedia: async (
    listingId: string,
    photos: PendingAsset[],
    videos: PendingAsset[],
    tourUrl?: string,
  ): Promise<any> => {
```

with:

```ts
  uploadMedia: async (
    listingId: string,
    photos: PendingAsset[],
    videos: PendingAsset[],
    tourUrl?: string,
    tourPhotosUrl?: string,
  ): Promise<any> => {
```

Replace this line (line 88):

```ts
    if (tourUrl) formData.append('tourUrl', tourUrl);
```

with:

```ts
    if (tourUrl) formData.append('tourUrl', tourUrl);
    if (tourPhotosUrl) formData.append('tourPhotosUrl', tourPhotosUrl);
```

Also update the JSDoc block (lines 50-64) — change the "Field shape" listing from:

```
   *   - tourUrl    — string (https:// only; backend validates protocol)
```

to:

```
   *   - tourUrl        — string (https:// only; backend validates protocol)
   *   - tourPhotosUrl  — string (https:// only; backend validates protocol)
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit 2>&1 | grep -E "MediaCurationService"`
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/beckmaldinVL/development/mobileApps/JayTap
git add src/services/MediaCurationService.ts
git branch --show-current
git commit -m "feat(service): MediaCurationService.uploadMedia accepts tourPhotosUrl

Optional 5th argument; appended to FormData when present. Backend
already validates https:// protocol; client mirrors the existing
tourUrl gate in the calling screen.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: RN client — add `tourPhotosUrl` input + state + save wiring in `MediaCurationScreen`

**WORKDIR:** `/Users/beckmaldinVL/development/mobileApps/JayTap`

**Files:**
- Modify: `src/screens/MediaCurationScreen.tsx` (state at 91-99, load effect at 116-131, diff at 243-247, save handler at 264-349, JSX at 693-740, error mapping at 315-319)

This is the biggest task — work through the steps in order, type-check after each.

- [ ] **Step 1: Add state declarations**

In `src/screens/MediaCurationScreen.tsx`, find lines 94-95:

```ts
  const [tourUrlDraft, setTourUrlDraft] = useState<string>('');
  const [tourUrlValid, setTourUrlValid] = useState<boolean>(true);
```

Add two new lines immediately after:

```ts
  const [tourPhotosUrlDraft, setTourPhotosUrlDraft] = useState<string>('');
  const [tourPhotosUrlValid, setTourPhotosUrlValid] = useState<boolean>(true);
```

- [ ] **Step 2: Sync from listing on mount**

In the load effect, find line 123:

```ts
        setTourUrlDraft(data?.media?.tourUrl || '');
```

Add immediately after:

```ts
        setTourPhotosUrlDraft(data?.media?.tourPhotosUrl || '');
```

- [ ] **Step 3: Add diff computation**

Find lines 243-245:

```ts
  const tourUrlChanged = useMemo(
    () => tourUrlDraft !== (listing?.media?.tourUrl || ''),
    [tourUrlDraft, listing],
  );
```

Add immediately after:

```ts
  const tourPhotosUrlChanged = useMemo(
    () => tourPhotosUrlDraft !== (listing?.media?.tourPhotosUrl || ''),
    [tourPhotosUrlDraft, listing],
  );
```

- [ ] **Step 4: Update `isSaveEnabled`**

Find line 248:

```ts
  const isSaveEnabled = !submittingSave && (hasPendingMedia || tourUrlChanged);
```

Replace with:

```ts
  const isSaveEnabled = !submittingSave && (hasPendingMedia || tourUrlChanged || tourPhotosUrlChanged);
```

- [ ] **Step 5: Add blur handler**

After the existing `handleTourUrlBlur` (line 260-262), add:

```ts
  const handleTourPhotosUrlBlur = useCallback(() => {
    setTourPhotosUrlValid(validateHttpsUrl(tourPhotosUrlDraft));
  }, [tourPhotosUrlDraft, validateHttpsUrl]);
```

- [ ] **Step 6: Update `handleSave` — derive payload, validate, send, sync, error-map**

The existing `handleSave` (lines 264-349) needs five surgical updates. Apply them in order:

**a)** Add the new draft to the early `toSend` derivation block. Find lines 266-268:

```ts
    const tourUrlToSend =
      tourUrlChanged && tourUrlDraft ? tourUrlDraft : undefined;
    if (!hasPendingMedia && !tourUrlToSend) return;
```

Replace with:

```ts
    const tourUrlToSend =
      tourUrlChanged && tourUrlDraft ? tourUrlDraft : undefined;
    const tourPhotosUrlToSend =
      tourPhotosUrlChanged && tourPhotosUrlDraft ? tourPhotosUrlDraft : undefined;
    if (!hasPendingMedia && !tourUrlToSend && !tourPhotosUrlToSend) return;
```

**b)** Add the parallel validation block. After the existing tourUrl validation (lines 270-277):

```ts
    if (tourUrlToSend && !validateHttpsUrl(tourUrlToSend)) {
      setTourUrlValid(false);
      Alert.alert(
        t('common.error'),
        t('moderation.mediaCuration.error.invalidTourUrl'),
      );
      return;
    }
```

Add immediately after:

```ts
    if (tourPhotosUrlToSend && !validateHttpsUrl(tourPhotosUrlToSend)) {
      setTourPhotosUrlValid(false);
      Alert.alert(
        t('common.error'),
        t('moderation.mediaCuration.error.invalidTourPhotosUrl'),
      );
      return;
    }
```

**c)** Update the service call. Find line 281-286:

```ts
      const updated = await MediaCurationService.uploadMedia(
        listingId,
        pendingPhotos,
        pendingVideos,
        tourUrlToSend,
      );
```

Replace with:

```ts
      const updated = await MediaCurationService.uploadMedia(
        listingId,
        pendingPhotos,
        pendingVideos,
        tourUrlToSend,
        tourPhotosUrlToSend,
      );
```

**d)** Sync the new draft from the server response. After line 290 (`setTourUrlDraft(updated?.media?.tourUrl || '');`):

Add:

```ts
      setTourPhotosUrlDraft(updated?.media?.tourPhotosUrl || '');
```

**e)** Map the new backend error code. In the error chain, find the existing block (lines 315-319):

```ts
      } else if (code === 'MEDIA_INVALID_TOUR_URL') {
        Alert.alert(
          t('common.error'),
          t('moderation.mediaCuration.error.invalidTourUrl'),
        );
```

Add immediately after:

```ts
      } else if (code === 'MEDIA_INVALID_TOUR_PHOTOS_URL') {
        Alert.alert(
          t('common.error'),
          t('moderation.mediaCuration.error.invalidTourPhotosUrl'),
        );
```

**f)** Update the `useCallback` deps array (lines 339-348). Find:

```ts
  }, [
    listingId,
    pendingPhotos,
    pendingVideos,
    tourUrlDraft,
    tourUrlChanged,
    hasPendingMedia,
    submittingSave,
    validateHttpsUrl,
    t,
  ]);
```

Replace with:

```ts
  }, [
    listingId,
    pendingPhotos,
    pendingVideos,
    tourUrlDraft,
    tourUrlChanged,
    tourPhotosUrlDraft,
    tourPhotosUrlChanged,
    hasPendingMedia,
    submittingSave,
    validateHttpsUrl,
    t,
  ]);
```

- [ ] **Step 7: Render the new TextInput block**

In the JSX, find the existing Tour URL block (lines 693-740) — the entire `<View style={commonStyles.section}>` block ending with the conditional hint/error text. Immediately after its closing `</View>`, add a parallel block:

```tsx
          {/* 2026-05-26 tour-photos plan — panoramic photos URL (Ricoh / Matterport). */}
          <View style={commonStyles.section}>
            <Text
              style={[commonStyles.sectionLabel, { color: colors.text }]}
            >
              {t('moderation.mediaCuration.tourPhotosUrl.label')}
            </Text>
            <TextInput
              style={[
                commonStyles.input,
                {
                  borderColor: tourPhotosUrlValid ? colors.border : colors.error,
                  backgroundColor: colors.inputBackground,
                  color: colors.text,
                },
              ]}
              value={tourPhotosUrlDraft}
              onChangeText={(v) => {
                setTourPhotosUrlDraft(v);
                if (!tourPhotosUrlValid) setTourPhotosUrlValid(true); // clear stale invalid on edit
              }}
              onBlur={handleTourPhotosUrlBlur}
              placeholder={t('moderation.mediaCuration.tourPhotosUrl.placeholder')}
              placeholderTextColor={colors.textTertiary}
              keyboardType="url"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {tourPhotosUrlValid ? (
              <Text
                style={[
                  styles.fieldHint,
                  { color: colors.textSecondary },
                ]}
              >
                {t('moderation.mediaCuration.tourPhotosUrl.hint')}
              </Text>
            ) : (
              <Text
                style={[
                  styles.fieldError,
                  { color: colors.error },
                ]}
              >
                {t('moderation.mediaCuration.tourPhotosUrl.invalid')}
              </Text>
            )}
          </View>
```

- [ ] **Step 8: Type-check**

Run: `npx tsc --noEmit 2>&1 | grep -E "MediaCurationScreen"`
Expected: 0 errors.

- [ ] **Step 9: Add a smoke test for the new input rendering**

Open `src/screens/__tests__/MediaCurationScreen.test.tsx`. Find the existing test "Photo grid renders with photos.section label" (~line 286) — that block establishes the mock/render pattern. Below it (before the closing `})` of the describe block), add:

```tsx
test('360° photos URL input renders with tourPhotosUrl label', async () => {
  (PropertyService.getPropertyById as jest.Mock).mockResolvedValue({
    _id: 'L1',
    status: 'pending',
    media: { photos: ['https://prev.com/p.jpg'], videos: [], tourUrl: undefined, tourPhotosUrl: undefined },
  });
  const { findByText } = render(<MediaCurationScreen listingId="L1" onBack={() => {}} />);
  // EN locale is the test default per existing tests in this file.
  await findByText('360° photos URL');
});
```

(If the test file's `render` import shape or mock-setup differs from this snippet, match the local pattern — the existing "Photo grid renders" test directly above is the source-of-truth template.)

- [ ] **Step 10: Run existing + new MediaCurationScreen tests**

Run: `npx jest src/screens/__tests__/MediaCurationScreen.test.tsx -v`
Expected: all pre-existing tests PASS + the new "360° photos URL input renders…" test PASS.

Full save-flow assertions (valid URL flips diff → save enables → payload includes the field) are intentionally covered by the **backend integration tests in Task 2** (which prove the wire-format) + **manual on-device QA in Task 10 Step 5** (which exercises the round-trip). Setting up RN-side fireEvent simulation for the input + save chain would require introducing a test pattern not used elsewhere in this file; deferred as out-of-scope for this plan.

- [ ] **Step 11: Commit**

```bash
cd /Users/beckmaldinVL/development/mobileApps/JayTap
git add src/screens/MediaCurationScreen.tsx src/screens/__tests__/MediaCurationScreen.test.tsx
git branch --show-current
git commit -m "feat(media): add 360° photos URL input to MediaCurationScreen

New state + diff + validator + JSX + save-payload + error mapping +
smoke test — strict mirror of the existing tourUrl input pattern.
Reuses the renamed validateHttpsUrl callback.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 9: RN client — swap the tile label in `PropertyDetailsScreen`

**WORKDIR:** `/Users/beckmaldinVL/development/mobileApps/JayTap`

**Files:**
- Modify: `src/screens/PropertyDetailsScreen.tsx` (line 930)

- [ ] **Step 1: Swap the i18n key**

In `src/screens/PropertyDetailsScreen.tsx`, find line 930:

```tsx
                    <Text style={[styles.mediaGridLabel, { color: photoActive ? colors.text : colors.textSecondary }]} numberOfLines={1} ellipsizeMode="tail">{t('property.photos')}</Text>
```

Change `t('property.photos')` to `t('property.photos360')`:

```tsx
                    <Text style={[styles.mediaGridLabel, { color: photoActive ? colors.text : colors.textSecondary }]} numberOfLines={1} ellipsizeMode="tail">{t('property.photos360')}</Text>
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit 2>&1 | grep -E "PropertyDetailsScreen|property.photos"`
Expected: 0 errors (the new key was added in Task 5).

- [ ] **Step 3: Verify the change is the only label change**

Run: `grep -n "t('property.photos" src/screens/PropertyDetailsScreen.tsx`
Expected: one line — line 930 — with `t('property.photos360')`. No other references should appear.

- [ ] **Step 4: Commit**

```bash
cd /Users/beckmaldinVL/development/mobileApps/JayTap
git add src/screens/PropertyDetailsScreen.tsx
git branch --show-current
git commit -m "feat(details): tile under 3D Tour now reads '360° Photos'

Disambiguates from the top photo carousel — tapping the tile opens a
panoramic-photos URL (Ricoh / Matterport), not a regular photo grid.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 10: Full-suite verification + manual QA

**WORKDIR:** alternates — note for each step.

- [ ] **Step 1: Backend full test suite**

```bash
cd /Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services
nvm use 24
npx jest
```
Expected: ALL tests PASS. No regressions in propertyRoutes, moderationRoutes, or migrate-listings-m3.

- [ ] **Step 2: RN client full test suite**

```bash
cd /Users/beckmaldinVL/development/mobileApps/JayTap
npx jest
```
Expected: ALL tests PASS. The new getTourPhotosUrl suite reports 7/7 green; MediaCurationScreen smoke suite stable.

- [ ] **Step 3: RN client type check**

```bash
cd /Users/beckmaldinVL/development/mobileApps/JayTap
npx tsc --noEmit 2>&1 | wc -l
```
Expected: the number printed matches the pre-existing baseline noted in memory `m3-shipped-2026-05-11` and the `260525-eva-SUMMARY.md` checklist (pre-existing errors in App.tsx Property.tours, DeleteListingModal, ChatComposeScreen, ChatScreen, ScheduleViewingScreen, TourSelectionScreen, ThemeContext — none added by this work).

To confirm no new files appear, diff the file list:

```bash
npx tsc --noEmit 2>&1 | grep -oE '^[^(]+\.tsx?' | sort -u
```
Expected: only the pre-existing files. `getTourPhotosUrl.ts`, `MediaCurationScreen.tsx`, `PropertyDetailsScreen.tsx`, `MediaCurationService.ts`, `Property.ts`, `en.ts`, `ru.ts` MUST NOT appear in the list.

- [ ] **Step 4: i18n parity check**

```bash
cd /Users/beckmaldinVL/development/mobileApps/JayTap
bash scripts/check-i18n-parity.sh
```
Expected: PASS.

- [ ] **Step 5: Manual on-device QA (iOS + Android, per project convention)**

Run dev backend + RN client; perform this flow on a physical iOS device and a physical Android device:

1. **Submit a listing as owner** with no panoramic URL. Confirm the listing lands in moderation queue with `media.tourPhotosUrl` absent.
2. **Open the listing in `MediaCurationScreen`** (admin role). Confirm:
   - The new "360° photos URL" input renders below the existing "3D tour URL" input.
   - The hint reads "Paste a Ricoh, Matterport, or other https:// panoramic-photos link. Optional." (EN) / Russian equivalent.
3. **Paste an invalid URL** (e.g., `http://insecure.com` or `not a url`):
   - Inline error appears after blur: "360° photos URL must start with https://".
   - Save button enables (because the draft changed) but on tap surfaces the Alert.alert and does NOT POST.
4. **Paste a real Ricoh URL** (e.g., `https://my.ricoh360.com/r/<your-id>`):
   - Inline error clears; hint reappears.
   - Save button is enabled.
   - Tap Save → success alert. Backend audit log row should show `'media.tourPhotosUrl.set': true` in `after`.
5. **Approve the listing**; open it in `PropertyDetailsScreen`:
   - The tile under the 3D Tour hero reads "360° Photos" (EN) / "360° Фото" (RU).
   - Tile opacity is 1.0 (active); icon + label use `colors.text`; chevron uses `colors.textSecondary`.
   - Tap the tile → `Tour3DScreen` WebView opens the Ricoh viewer. Gyroscope / drag panoramic navigation works.
   - Tap the ✕ close button → returns to `PropertyDetailsScreen`.
6. **Repeat with a Matterport URL** (e.g., `https://my.matterport.com/show/?m=<id>`) — same end-to-end behavior, confirming provider-agnostic rendering.
7. **Test the disabled state**: open a different listing that has no `tourPhotosUrl`. The tile should be at ~0.6 opacity, label in `textSecondary`, chevron in `textTertiary`, tap is a no-op.
8. **Theme parity**: switch between light + dark mode at every step above; visual contrast must remain readable in both.
9. **Language parity**: switch to RU at every step above; all new strings render in Russian.

Document any QA failures as new tasks or hotfix commits; do not mark this task complete until all 9 sub-checks pass on both platforms.

- [ ] **Step 6: Cross-link the planning artifacts**

Add a one-line note to `.planning/STATE.md` recording the completion of this plan + which commits in each repo. Append-only, no `.planning/` workflow gates required — this is a quick task scope per the spec's "Open question."

---

## Summary

| Repo | Commits | Files touched |
|---|---|---|
| JayTap-services | 2 | `models/Property.js`, `routes/moderationRoutes.js`, `__tests__/moderationRoutes.test.js` |
| JayTap (RN client) | 7 | `types/Property.ts`, `utils/getTourPhotosUrl.ts`, `utils/__tests__/getTourPhotosUrl.test.ts`, `services/MediaCurationService.ts`, `screens/MediaCurationScreen.tsx`, `screens/__tests__/MediaCurationScreen.test.tsx`, `screens/PropertyDetailsScreen.tsx`, `locales/en.ts`, `locales/ru.ts` |

9 commits total. All test-driven; each commit a self-contained logical unit. After Task 10 passes, the Photos tile activates end-to-end whenever a moderator pastes a Ricoh (or Matterport, or any https://) panoramic URL.

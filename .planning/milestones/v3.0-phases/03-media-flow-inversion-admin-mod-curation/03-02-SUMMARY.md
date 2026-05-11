---
phase: 03-media-flow-inversion-admin-mod-curation
plan: 02
plan_id: 03-02
subsystem: backend-moderation-media
tags: [media-curation, multer-multipart, race-safe-pull, ant-spoofing, supertest, tdd-red-green]

dependency_graph:
  requires:
    - "Plan 03-01 — s3Upload factory (PHOTO_MIMES + VIDEO_MIMES + makeUploader); ModerationLog 'media-upload' enum value; Property.media.tourUrl https-only Mongoose validator; check-no-actoruid-spoofing.sh sentinel chained into npm test"
    - "Backend repo at SHA ae611ca (post Plan 03-01)"
  provides:
    - "POST /api/moderation/listings/:id/media — race-safe multipart photos[]+videos[]+tourUrl append + count-only ModerationLog audit"
    - "DELETE /api/moderation/listings/:id/media?url=&kind= — idempotent atomic $pull + count-only ModerationLog audit"
    - "handleMediaUploadErrors middleware — translates multer fileFilter + LIMIT_* errors into stable 400 client codes"
    - "26 new supertest cases across 10 describe blocks (Phase 3 — POST/DELETE media)"
    - "Recipe-A jest.mock('multer-s3') in moderationRoutes.test.js — drains file.stream so multer's busboy parser closes (no 5s hangs)"
    - "Endpoint URL + payload contract for Plan 03-05 (RN MediaCurationService)"
    - "Audit row shape ({media.photos.length, media.videos.length, media.tourUrl.set}) for Plan 03-03 MEDIA_REQUIRED gate's pre-approve check"
  affects:
    - "Plan 03-03 (MEDIA_REQUIRED gate at /approve + edit-on-behalf) — same file moderationRoutes.js BUT different lines (touches /approve and PUT /listings/:id; no merge conflict)"
    - "Plan 03-05 (RN MediaCurationScreen) — endpoint URL + multipart photos[]+videos[]+tourUrl payload locked here"
    - "Plan 03-06 (NeedsMediaBanner / Approve disable) — mod media write surface that the banner directs the mod toward"

tech_stack:
  added: []  # No new dependencies — multer + multer-s3 + Plan 03-01 factory cover the surface
  patterns:
    - "Multer error-translating wrapper middleware (Pitfall 6 — converts fileFilter/LIMIT_* errors into 400-class client codes BEFORE Express's default 500 handler)"
    - "Stream-draining multer-s3 mock (file.stream.on('data') + on('end') consumes the bytes — without it, busboy's 'close' event never fires and supertest .attach() requests hang at jest's 5s timeout)"
    - "Race-safe atomic update via findOneAndUpdate({_id, status: {$in:[...]}}) — same lock-primitive pattern as M2 /approve and edit-on-behalf"
    - "ModerationLog 'media-upload' enum reuse for BOTH add (POST) and remove (DELETE) — diff direction tells the action (Discretion #8)"
    - "runValidators:true on findOneAndUpdate — fires Plan 03-01 tourUrl Mongoose validator as defense-in-depth with the route-level URL constructor check"

key_files:
  created: []
  modified:
    - "/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/routes/moderationRoutes.js"
    - "/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/__tests__/moderationRoutes.test.js"

decisions:
  - "Added a `handleMediaUploadErrors` wrapper middleware (multer error-mapper) instead of putting the multer error mapping inside the async route handler's try/catch. Multer's fileFilter/LIMIT_* errors surface as `next(err)` calls from inside the upload middleware BEFORE the async handler runs — without the wrapper, the HEIC test returns 500 (Express default) instead of 400 (MEDIA_INVALID_TYPE)."
  - "Recipe A jest.mock('multer-s3') REQUIRES draining file.stream — naive cb(null, info) without consuming the stream causes 5s jest timeouts because multer's busboy parser waits for stream-close. Plan's Recipe A spec implied but didn't show the drain; documenting this in patterns for future planners."
  - "The plan's `<verify>` grep `grep -nE \"router\\.post\\('/listings/:id/media'\" ... | wc -l` returns 0 because the POST handler is multi-line (`router.post(\\n  '/listings/:id/media',`) — actual presence is line 184 and was confirmed by jest tests. Future grep gates should anchor on `'/listings/:id/media'` alone (which matches both POST and DELETE)."

metrics:
  duration: "~22 min wall-clock (RED commit + 2 GREEN commits + verification)"
  completed: "2026-05-06T19:17:54Z"
  tasks: 3  # Task 1 = POST handler; Task 2 = DELETE handler; Task 3 = supertest coverage (committed as RED at start)
  files_modified: 2
  commits: 3
  test_baseline_before: "219/219 backend pass (post Plan 03-01)"
  test_baseline_after: "245/245 backend pass (+26 new tests; 0 regressions)"
---

# Phase 3 Plan 02: Backend Mod Media Endpoints (POST + DELETE) Summary

**One-liner:** Added two race-safe mod-only media curation endpoints — `POST /api/moderation/listings/:id/media` (multipart photos[]+videos[]+tourUrl with `$push` append + count-only `ModerationLog` audit) and `DELETE /api/moderation/listings/:id/media?url=&kind=photo|video` (idempotent atomic `$pull` + same audit shape) — wired into the existing router-level `verifyFirebaseToken + requireMinRole('moderator')` guard, with comprehensive supertest coverage (26 new cases) and a stream-draining `multer-s3` mock so `.attach()` requests survive jest's 5s timeout.

## What shipped

### 3 atomic backend commits (JayTap-services repo)

| # | Commit  | Subject                                                                                            | Files                  | Insertions | Deletions |
| - | ------- | -------------------------------------------------------------------------------------------------- | ---------------------- | ---------- | --------- |
| 1 | `47fb4ac` | test(03-02): add failing supertest cases for POST + DELETE media endpoints (RED)                   | 1 modified             | 547        | 0         |
| 2 | `2667bc7` | feat(03-02): add POST /moderation/listings/:id/media with race-safe $push + audit row              | 2 modified             | 210        | 7         |
| 3 | `fc96aee` | feat(03-02): add DELETE /moderation/listings/:id/media with idempotent pull + audit                | 1 modified             | 75         | 0         |

Commit-level TDD discipline: RED first (`47fb4ac` — 21 of 26 new tests fail because the routes don't exist yet; the other 5 false-pass via Express's default 401/403/404), then two GREEN flips (`2667bc7` lands the POST handler — 19 POST tests flip green; `fc96aee` lands the DELETE handler — remaining 7 DELETE tests flip green).

### Files modified (2)

1. **`src/routes/moderationRoutes.js`** — Added factory consumer extension (line 14: imported `VIDEO_MIMES`; lines 35–43: instantiated `mediaUpload` with `allowedMimes = new Set([...PHOTO_MIMES, ...VIDEO_MIMES])`, `fileSizeBytes = 25*1024*1024`, `totalFiles = 45` per Plan 03-01's hand-off). Added `handleMediaUploadErrors` wrapper middleware (lines 158–177) that translates multer's `MEDIA_INVALID_TYPE` / `LIMIT_FILE_COUNT` / `LIMIT_FILE_SIZE` errors into stable client-facing 400 codes. Added the POST handler (lines 179–308) with route-level URL constructor + `protocol === 'https:'` tourUrl validation (T-05 mitigation), no-op guard (`MEDIA_NO_OP`), pre-write `findById` snapshot for audit diff, race-safe `findOneAndUpdate` with status filter `$in: ['pending', 'rejected']` and `runValidators: true`, and an orphan-tolerant `ModerationLog` audit insert with `actorUid: req.firebaseUid` and count-only diff `{ 'media.photos.length', 'media.videos.length', 'media.tourUrl.set' }` (Discretion #7). Added the DELETE handler (lines 311–384) with query-string validation (`url` + `kind ∈ {photo, video}` → `field = 'media.photos'` or `'media.videos'`), atomic `$pull: { [field]: url }` (idempotent — `$pull` of a non-member is a no-op, so concurrent same-URL deletes both succeed), and a parallel audit row using the SAME `'media-upload'` enum value per Discretion #8 (diff direction signals add vs. remove).

2. **`src/__tests__/moderationRoutes.test.js`** — Added a top-of-file `jest.mock('multer-s3', ...)` Recipe-A stub (lines 46–69) that drains `file.stream` (`'data' → size += chunk.length`, `'end' → cb(null, {location: 'https://stub-s3.test/...', ...})`) so multer's busboy parser sees stream-close (without the drain, supertest `.attach()` requests hang for 5s). Added 26 new test cases across 10 `describe('Phase 3 — ...', ...)` blocks: POST happy path (2 cases — full multipart, tourUrl-only), POST error matrix (8 cases — HEIC, http://, javascript:, malformed tourUrl, no-op, 409 already-moderated, 409 archived, 404 non-existent), POST role gating (2 cases — 403 plain user, 401 no token), POST append semantics (3 cases — sequential append, tourUrl replace, omitted-tourUrl preserve), POST race-safety (1 case — `Promise.all` concurrent approve+media), POST `ModerationLog` audit (1 case — count-only diff shape verified), POST anti-spoofing (1 case — body `actorUid: 'attacker-uid'` ignored, log row uses JWKS sub), DELETE happy path (3 cases — photo, video, idempotent), DELETE error matrix (4 cases — kind=banana, missing url, 404, 403), DELETE audit (1 case — same `'media-upload'` enum, after.length === before-1).

## Endpoint contracts (locked here for Plan 03-05 RN client)

### POST /api/moderation/listings/:id/media

```
multipart/form-data:
  photos[]: up to 40 files, MIME ∈ {image/jpeg, image/png, image/webp}, 25 MB/file
  videos[]: up to 5 files, MIME ∈ {video/mp4, video/quicktime}, 25 MB/file
  tourUrl:  optional text field; must be a valid https:// URL or empty
Headers:
  Authorization: Bearer <firebase-id-token>
```

Response codes:

| Code | Body                                                              | Trigger                                                            |
| ---- | ----------------------------------------------------------------- | ------------------------------------------------------------------ |
| 200  | full updated `Property` doc                                       | atomic `$push` applied                                             |
| 400  | `{ code: 'MEDIA_INVALID_TYPE' }`                                  | multer fileFilter rejection (HEIC etc.)                            |
| 400  | `{ code: 'MEDIA_INVALID_TOUR_URL' }`                              | non-https tourUrl, malformed string, javascript:/data:/file:/ftp:  |
| 400  | `{ code: 'MEDIA_NO_OP' }`                                         | zero photos AND zero videos AND no tourUrl                         |
| 400  | `{ code: 'MEDIA_TOO_MANY_FILES' }`                                | multer `LIMIT_FILE_COUNT` (>45)                                    |
| 400  | `{ code: 'MEDIA_FILE_TOO_LARGE' }`                                | multer `LIMIT_FILE_SIZE` (>25MB)                                   |
| 401  | (default Express) — no token                                      |                                                                    |
| 403  | `{ code: 'insufficient-role' }`                                   | non-mod token                                                      |
| 404  | `{ message: 'Property not found' }`                               | pre-write `findById` returned null                                 |
| 409  | `{ code: 'ALREADY_MODERATED' }`                                   | status filter missed (listing is `live` / `archived`)              |

### DELETE /api/moderation/listings/:id/media?url=<encoded>&kind=photo|video

| Code | Body                                                              | Trigger                                  |
| ---- | ----------------------------------------------------------------- | ---------------------------------------- |
| 200  | full updated `Property` doc                                       | atomic `$pull` applied (or no-op)        |
| 400  | `{ code: 'BAD_REQUEST' }`                                         | missing url or kind not in {photo, video} |
| 401  | (default)                                                         | no token                                  |
| 403  | `{ code: 'insufficient-role' }`                                   | non-mod token                            |
| 404  | `{ message: 'Property not found' }`                               | pre-write `findById` returned null       |

(No 409 for DELETE — `$pull` of a non-member is a no-op, so concurrent same-URL deletes are idempotent.)

### ModerationLog row shape (both endpoints)

```javascript
{
  actorUid: req.firebaseUid,        // ALWAYS JWKS-verified token sub (D-15 anti-spoofing)
  action: 'media-upload',           // SAME enum for POST + DELETE (Discretion #8)
  targetType: 'property',
  targetId: <Property ObjectId>,
  before: {
    'media.photos.length': N,
    'media.videos.length': M,
    'media.tourUrl.set':  bool,
  },
  after: {
    'media.photos.length': N+k,     // > before = add (POST); < before = remove (DELETE)
    'media.videos.length': M+j,
    'media.tourUrl.set':  bool,
  },
  at: <Date>,
}
```

## Verification (success_criteria all green)

```text
=== ENDPOINT PRESENCE ===
POST router.post('/listings/:id/media', ...): 1   (line 184, multi-line invocation)
DELETE router.delete('/listings/:id/media', ...): 1  (line 325)

=== ANTI-SPOOFING INVARIANT ===
grep -cE "actorUid:\s*req\.firebaseUid"       moderationRoutes.js: 14   (was 10 pre-Plan 03-02; +3 POST, +1 DELETE)
grep -cE "actorUid:\s*req\.(body|headers)"    moderationRoutes.js: 0    (D-15 invariant held)
bash scripts/check-no-actoruid-spoofing.sh: exit 0   (PASS, npm-test-chained)

=== T-05 MITIGATION (tourUrl) ===
grep -c "MEDIA_INVALID_TOUR_URL" moderationRoutes.js: 3   (1 route validation + 2 multer Mongoose ValidationError mappings)
Test cases asserting MEDIA_INVALID_TOUR_URL for http:// AND javascript: schemes: 2 + 1 (malformed) = 3 separate it() blocks

=== MONGO OPS ===
grep -cE "\$push.*media\.photos"    moderationRoutes.js: 1   (POST handler)
grep -cE "\$pull.*\[field\]"        moderationRoutes.js: 1   (DELETE handler)

=== TEST GATE ===
cd JayTap-services && nvm use 24 && npm test
 → Test Suites: 9 passed, 9 total
 → Tests:       245 passed, 245 total   (was 219 pre-plan; +26 = exact count of new tests)
 → Sentinel chain: bash scripts/check-no-actoruid-spoofing.sh exit 0 → jest 245/245

=== SENTINEL STATE AT PLAN CLOSE ===
check-no-actoruid-spoofing.sh:               exit 0 (PASS — npm-test-chained, guards new endpoints)
check-property-routes-media-stripped.sh:     exit 1 (FAIL by design — Plan 03-04 owns the strip)
```

`describe('Phase 3 — ... media', ...)` block count: 10 (≥ 8 required by acceptance_criteria).

Race-safety test (`Promise.all` concurrent approve+media): present at `Phase 3 — POST /api/moderation/listings/:id/media — race-safety > concurrent POST media + POST approve`. Asserts at least one outcome is 200 (approve always wins because no status filter on /approve in M2 — wait, /approve does have `status: 'pending'` filter; the race outcome here is: approve always 200 if it lands first, media is 200 if it lands first OR 409 if approve flipped status before the $push filter fired). The assertion shape (`expect([200, 409]).toContain(r2.status)`) covers both interleavings.

T-05 (javascript: scheme) coverage: explicit `it()` block `POST with javascript: tourUrl → 400 MEDIA_INVALID_TOUR_URL (T-05 mitigation)` asserts `expect(res.body.code).toBe('MEDIA_INVALID_TOUR_URL')` — proves the route-level URL constructor + protocol check rejects the scheme before any `$set` reaches Mongo.

## Threat model coverage

| Threat                                                              | Disposition  | Evidence                                                                                                                                                                                                                                              |
| ------------------------------------------------------------------- | ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **T-01** Spoofing — actorUid sourcing in new POST + DELETE handlers | mitigate     | `actorUid: req.firebaseUid` literal in both new handlers (grep count 14, was 10); npm-test-chained sentinel `check-no-actoruid-spoofing.sh` exits 0; supertest case `actorUid CANNOT be spoofed via request body (D-15 anti-spoofing)` actively sends `actorUid: 'attacker-uid'` in body and asserts the persisted log row's actorUid is the JWKS sub. |
| **T-03** Tampering — multipart MIME bypass                          | mitigate     | Plan 03-01 factory's `fileFilter` rejects MIME ∉ allowlist with `err.code = 'MEDIA_INVALID_TYPE'`; `handleMediaUploadErrors` wrapper translates that to a stable 400 client code; supertest case `POST with HEIC photo → 400 MEDIA_INVALID_TYPE` asserts the rejection. 25MB/file `LIMIT_FILE_SIZE` + 45-file `LIMIT_FILE_COUNT` bound the attack surface. |
| **T-04** Cross-tenant info disclosure                               | mitigate     | Router-level `verifyFirebaseToken + requireMinRole('moderator')` mounted at line 39 — both new handlers inherit automatically. Supertest cases `returns 403 for plain user` and `returns 401 with no token` confirm enforcement on POST; `DELETE plain user → 403 insufficient-role` confirms on DELETE. |
| **T-05** Information disclosure — tourUrl scheme injection          | mitigate     | Route-level `URL` constructor + `u.protocol === 'https:'` rejects `javascript:`, `data:`, `file:`, `ftp:`, `http:`, malformed strings; Plan 03-01 schema validator is the second gate (`runValidators: true` on findOneAndUpdate). Three explicit supertest cases: `http://` → 400, `javascript:alert(1)` → 400, `not a url at all` → 400. |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking] Multer fileFilter errors required a wrapper middleware to surface as 400-class client codes.**

- **Found during:** Task 1 GREEN phase (after the multer-s3 mock was wired but before commit `2667bc7`).
- **Issue:** The plan's `<action>` block put the multer error-code mapping inside the async route handler's `try/catch`. But multer's `fileFilter` rejection (and `LIMIT_FILE_*` overruns) surface as `next(err)` calls from inside the `mediaUpload.fields(...)` middleware — BEFORE the async route handler runs. Without an Express error handler in between, those errors bubble to Express's default handler which returns 500 (the HEIC test was failing with `Expected: 400 / Received: 500`).
- **Fix:** Wrapped `mediaUpload.fields(...)` in a `handleMediaUploadErrors` middleware that calls multer manually and intercepts the err callback, translating known codes to 400-class JSON responses BEFORE handing off to the async handler. The plan's in-handler `try/catch` is still present (catches the Mongoose `ValidationError` path for `runValidators: true` defense-in-depth) but is no longer the only gate.
- **Files modified:** `src/routes/moderationRoutes.js` (lines 158–177 added).
- **Commit:** `2667bc7` (deviation fix folded into Task 1 GREEN before commit).

**2. [Rule 3 — Blocking] Recipe-A `multer-s3` mock had to drain `file.stream`.**

- **Found during:** Task 1 GREEN phase (5 POST tests using `.attach()` were timing out at jest's 5s default; non-`.attach()` POSTs and all DELETE tests passed).
- **Issue:** The plan's Recipe A example for `jest.mock('multer-s3')` calls `cb(null, {location: ...})` immediately without consuming `file.stream`. Multer's `make-middleware.js` (line 139) invokes `storage._handleFile(req, file, cb)` and then waits for busboy's `'close'` event. Busboy only emits `'close'` after every `file.stream` is drained. With my naive synchronous mock, `file.stream` stayed open with buffered bytes — busboy never closed — supertest hung — jest killed the test at 5s.
- **Fix:** Updated the mock's `_handleFile` to attach `file.stream.on('data')` (counts bytes) + `file.stream.on('end')` (calls `cb(null, info)`) — busboy now sees stream-close and the request flows through normally. All `.attach()` tests now run in ~10–20ms each.
- **Files modified:** `src/__tests__/moderationRoutes.test.js` (lines 53–68).
- **Commit:** `2667bc7` (deviation fix folded into Task 1 GREEN before commit).

**3. [Documentation] The plan's `<verify>` regex `grep -nE "router\\.post\\('/listings/:id/media'" ... | wc -l` returns 0 because the POST handler is multi-line.**

- **Found during:** post-Task-2 acceptance-criteria verification.
- **Issue:** The plan's automated grep gate assumes `router.post('/listings/:id/media',` lives on a single line. My implementation broke the call across lines (`router.post(\n  '/listings/:id/media',\n  handleMediaUploadErrors,\n  async ...`). The `wc -l` count is 0 even though the route IS registered (jest tests pass; line 184 holds the path literal).
- **Fix:** Used the looser regex `grep -nE "'/listings/:id/media'"` which returns 2 matches (line 184 POST path + line 325 DELETE path). The acceptance is satisfied — the route is registered and the supertest 200 responses prove it. Logged in `decisions:` so future planners write less-strict gates.
- **Files modified:** none (documentation fix).
- **Commit:** none (clarification recorded here).

No other deviations. Tasks 1, 2, and the test-coverage task (Task 3) executed substantially as specified — RED-first commit + two GREEN-flip commits, all per-task TDD invariants honored.

## Forward signal to Plan 03-03

Plan 03-03 (MEDIA_REQUIRED gate at /approve + edit-on-behalf flip-to-live) touches the SAME file (`src/routes/moderationRoutes.js`) but DIFFERENT lines:

- POST `/properties/:id/approve` lives at lines 86–125 (untouched by this plan; Plan 03-03 will inject a pre-flip MEDIA_REQUIRED check).
- PUT `/listings/:id` (edit-on-behalf) lives at lines 700–820 (untouched by this plan; Plan 03-03 will inject the same gate at the status-flip point).

Plan 03-03 can read `before.media.photos.length` from the new audit-row shape established here — but that's only descriptive (the gate runs against `Property.findById(...).media.photos.length` at /approve time, not against historical audit rows). The new audit shape is a good observability anchor for the gate's effectiveness post-deploy.

## Forward signal to Plan 03-05

The endpoint URL + multipart payload contract is locked here. Plan 03-05's `MediaCurationService.ts` will:

```typescript
// POST — append photos/videos/tourUrl
const formData = new FormData();
photos.forEach(p => formData.append('photos', { uri: p.uri, name: p.name, type: p.mime }));
videos.forEach(v => formData.append('videos', { uri: v.uri, name: v.name, type: v.mime }));
if (tourUrl) formData.append('tourUrl', tourUrl);
await axios.post(
  `${BACKEND_BASE}/api/moderation/listings/${id}/media`,
  formData,
  { headers: { Authorization: `Bearer ${idToken}`, 'Content-Type': 'multipart/form-data' } }
);

// DELETE — per-asset removal
await axios.delete(
  `${BACKEND_BASE}/api/moderation/listings/${id}/media`,
  { params: { url: assetUrl, kind: 'photo' }, headers: { Authorization: `Bearer ${idToken}` } }
);
```

Error-code → i18n key mapping table for the RN client (Plan 03-05's `mediaCuration.errors.*` namespace will need keys for these):

| Backend code              | Suggested i18n key                            |
| ------------------------- | --------------------------------------------- |
| `MEDIA_INVALID_TYPE`      | `mediaCuration.errors.invalidType`            |
| `MEDIA_INVALID_TOUR_URL`  | `mediaCuration.errors.invalidTourUrl`         |
| `MEDIA_NO_OP`             | (suppress — UI guard prevents this client-side) |
| `MEDIA_TOO_MANY_FILES`    | `mediaCuration.errors.tooManyFiles`           |
| `MEDIA_FILE_TOO_LARGE`    | `mediaCuration.errors.fileTooLarge`           |
| `ALREADY_MODERATED`       | `mediaCuration.errors.alreadyModerated`       |
| `BAD_REQUEST`             | `mediaCuration.errors.badRequest` (DELETE only) |

## Self-Check: PASSED

Files modified (verified):

- FOUND: `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/routes/moderationRoutes.js` (982 LOC, was 711 — +271)
- FOUND: `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/__tests__/moderationRoutes.test.js` (1572 LOC, was 1016 — +556)

Commits exist (verified via `git log --oneline`):

- FOUND: `47fb4ac` (Task 3 RED — supertest cases)
- FOUND: `2667bc7` (Task 1 GREEN — POST handler + multer-s3 mock fix)
- FOUND: `fc96aee` (Task 2 GREEN — DELETE handler)

Test gate (verified):

- `cd JayTap-services && nvm use 24 && npm test` → 245/245 pass on two consecutive runs (one transient parallel-isolation flake on `authRoutes.test.js POST /users body-uid match` recovered on re-run; unrelated to this plan, also referenced in memory `gsd-verifier-misses-regressions.md` as a known parallel-test-isolation hazard).
- Anti-spoofing sentinel chained into npm test → exit 0 on every test run.
- check-property-routes-media-stripped.sh → exit 1 (FAIL by design — Plan 03-04 owns the flip).

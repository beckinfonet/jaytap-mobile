# Phase 3: Media Flow Inversion (Admin/Mod Curation) — Pattern Map

**Mapped:** 2026-05-06
**Files analyzed:** 18 (8 backend NEW/EDIT + 10 RN client NEW/EDIT)
**Analogs found:** 18 / 18

> **Read order for planner:** §File Classification → per-file §Pattern Assignments → §Shared Patterns. Each excerpt cites the analog file with absolute path + line range so the planner can copy verbatim.

---

## File Classification

### Backend (`/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services`)

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/middleware/s3Upload.js` (NEW) | middleware/factory | request-response (multipart→S3) | `src/routes/propertyRoutes.js:17-44` (S3Client + multer config) + `src/routes/moderationRoutes.js:27-51` (duplicate to extract) | exact (extraction of two existing duplicates) |
| `src/routes/moderationRoutes.js` (EDIT — add POST `/listings/:id/media`) | controller (route handler) | request-response (multipart upload → atomic `$push`) | `src/routes/moderationRoutes.js:94-133` (existing `/properties/:id/approve` — same race-safe `findOneAndUpdate` + ModerationLog audit + orphan-tolerant write) | exact |
| `src/routes/moderationRoutes.js` (EDIT — add DELETE `/listings/:id/media`) | controller | request-response (atomic `$pull`) | `src/routes/moderationRoutes.js:94-133` + new `Pattern 3` from RESEARCH.md (DELETE-by-URL `$pull`) | exact (composition) |
| `src/routes/moderationRoutes.js` (EDIT — MEDIA_REQUIRED gate at `/approve`) | controller | request-response (read+check then atomic update) | `src/routes/moderationRoutes.js:94-133` (current `/approve` — insert fetch+check BEFORE existing `findOneAndUpdate`) | exact |
| `src/routes/moderationRoutes.js` (EDIT — MEDIA_REQUIRED gate at edit-on-behalf flip) | controller | request-response (read+check then atomic update) | `src/routes/moderationRoutes.js:445-617` (current PUT `/listings/:id` — insert check before STEP 5 atomic update at line 613) | exact |
| `src/routes/propertyRoutes.js` (EDIT — strip multer + media body) | controller | request-response (lockdown — no media write) | `src/routes/propertyRoutes.js:27-44, 111, 156-158, 216-221, 344, 526-544` (current multer config + POST/PUT signatures + `media` build) — DELETE-style edits | exact (atomic-break per Phase 1 D-01) |
| `src/models/ModerationLog.js` (EDIT — extend `action` enum) | model (schema) | additive | `src/models/ModerationLog.js:19` (enum extension is additive — same pattern M2 Phase 4 archive lifecycle used) | exact |
| `src/models/Property.js` (EDIT — Mongoose tourUrl validator, Discretion #1) | model (schema validator) | additive | `src/models/Property.js:79-84` (existing `media.tourUrl: { type: String }`) — extend with `validate: { ... }` | role-match (no existing URL-validator analog in repo; Mongoose docs cited in RESEARCH.md) |
| `scripts/check-property-routes-media-stripped.sh` (NEW) | script (CI sentinel) | grep gate | RN client `scripts/check-create-listing-screen-removed.sh` (Phase 2 atomic-deletion sentinel) + `scripts/check-role-grep.sh` (4-invariant grep gate) | exact |
| `scripts/check-no-actoruid-spoofing.sh` (NEW) | script (CI sentinel) | grep gate | `scripts/check-role-grep.sh` (multi-invariant pattern) + M2 Phase 1 HF-03 `grep -nE "uid:\s*req\.(body|headers)"` | exact |
| `src/__tests__/moderationRoutes.test.js` (EXTEND — ~9 describe blocks) | test (supertest) | request-response | `src/__tests__/moderationRoutes.test.js:179-308` (existing `MOD-16` audit + `MOD-17` 403 + `MOD-12` reasonCode patterns) | exact |
| `src/__tests__/propertyRoutes.test.js` (EXTEND — multer-stripped behavior) | test (supertest) | request-response | `src/__tests__/propertyRoutes.test.js:1-110` (existing setup + `makeNestedFixture` helper) | exact |

### RN client (`/Users/beckmaldinVL/development/mobileApps/JayTap`)

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/screens/MediaCurationScreen.tsx` (NEW ~400-600 LOC) | screen (overlay) | request-response (FormData multipart) + photo grid event-driven | (a) `src/screens/LandlordApplicationScreen.tsx:109-132` (ImagePicker invocation) ; (b) `src/components/RejectionBanner.tsx` (header+body+CTA shape) ; (c) `src/screens/PropertyDetailsScreen.tsx:1481-1537` (action footer pattern) ; (d) `src/components/ContextualListingFlow/styles.ts:15-75` (commonStyles for chip / input / section) | exact (composition of 4 patterns) |
| `src/services/MediaCurationService.ts` (NEW) — recommend NEW file per RESEARCH.md §Recommended Project Structure | service | request-response | `src/services/LandlordApplicationService.ts:1-90` (FormData service shape + apiClient consumer) + `src/services/PropertyService.ts:355-397` (mod-action approveListing/rejectListing patterns) | exact |
| `src/screens/ModerationQueueScreen.tsx` (EDIT — filter chip row above Listings tab) | screen (extension) | event-driven (filter predicate) | `src/components/ContextualListingFlow/Step4ConditionAmenities.tsx:60-91` (3-chip row with `colors.activeChipBackground` and `commonStyles.chip`) + `src/screens/ModerationQueueScreen.tsx:487-545` (existing tab-segmented control) | exact |
| `src/screens/PropertyDetailsScreen.tsx` (EDIT — needs-media banner + Approve disable) | screen (extension) | event-driven | (a) `src/components/RejectionBanner.tsx:28-92` (banner shape — accent stripe + header+body+CTA + dismiss) ; (b) `src/screens/PropertyDetailsScreen.tsx:1481-1537` (mod action footer — extend `disabled={...}` predicate) | exact |
| `App.tsx` (EDIT — overlay flags + mount) | controller (state machine) | event-driven | `App.tsx:60-79, 133-142, 697-705, 1140-1165` (existing `isModerationQueueOpen` flag + `OVERLAY_FLAGS` + `fullScreenOverlayWrap` + overlay mount block) | exact |
| `src/locales/en.ts` + `src/locales/ru.ts` (EDIT — +29 keys per UI-SPEC) | config (i18n) | additive | `src/locales/en.ts:516-543` (existing `moderation.*` namespace) + `scripts/check-i18n-parity.sh` enforces parity | exact |
| `src/screens/__tests__/MediaCurationScreen.test.tsx` (NEW — RTL smoke; new directory) | test (RTL) | request-response | `src/components/__tests__/Gated.test.tsx` (existing react-test-renderer + `ReactTestRenderer.act` pattern — only RTL pattern in the repo today) | role-match (no screen-level RTL analog exists; closest is component test) |
| `src/screens/__tests__/ModerationQueueScreen.test.tsx` (NEW — filter chip predicate tests) | test (RTL) | event-driven | Same as above + filter-predicate logic exercised via direct hook/state mocking | role-match |

---

## Pattern Assignments

### `src/middleware/s3Upload.js` (NEW — backend, factory module)

**Analog (extract + DRY):** `src/routes/propertyRoutes.js:17-44` AND `src/routes/moderationRoutes.js:27-51` are bit-for-bit duplicates of the S3Client + multer-s3 config. Discretion #3 (RESEARCH.md) RESOLVED: extract to `src/middleware/s3Upload.js` BEFORE D-13 strip lands so the strip diff is small.

**Imports pattern to copy verbatim** (`propertyRoutes.js:1-5` shape):
```javascript
const multer = require('multer');
const { S3Client } = require('@aws-sdk/client-s3');
const multerS3 = require('multer-s3');
```

**Core S3Client + multer-s3 setup pattern** (verbatim from `propertyRoutes.js:17-44` — copy then parametrize):
```javascript
// AWS S3 Configuration
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// Configure multer for S3 uploads
const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: process.env.AWS_BUCKET_NAME || 'jaytap-properties',
    metadata: function (req, file, cb) {
      cb(null, { fieldName: file.fieldname });
    },
    key: function (req, file, cb) {
      const timestamp = Date.now();
      const filename = `${timestamp}-${file.originalname}`;
      cb(null, `properties/${filename}`);
    },
  }),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit per file
  },
});
```

**Divergence the planner MUST consciously make:**
- Replace hardcoded `fileSize: 10 * 1024 * 1024` with parameter `fileSizeBytes` (Discretion #6 → 25 MB).
- Replace single `limits.fileSize` with `{ fileSize: fileSizeBytes, files: totalFiles }` (Pitfall 3 — `totalFiles=45` per §Discretion #6).
- ADD `fileFilter` callback that checks `file.mimetype` against an `allowedMimes: Set` parameter and rejects with `cb(err, false)` where `err.code = 'MEDIA_INVALID_TYPE'` (Pitfall 6).
- Export `s3` (raw client), `makeUploader({ allowedMimes, fileSizeBytes, totalFiles })` (factory), `PHOTO_MIMES` (`Set(['image/jpeg','image/png','image/webp'])`), `VIDEO_MIMES` (`Set(['video/mp4','video/quicktime'])`) per Discretion #5.
- HEIC/HEIF NOT in allowlist (Pitfall 1 — client-side conversion via picker `assetRepresentationMode: 'compatible'` is the contract).

**Sequencing recommendation (RESEARCH.md Discretion #3):** Land `s3Upload.js` first → propertyRoutes + moderationRoutes both consume the factory in a small commit → THEN D-13 strip propertyRoutes' usage in a separate commit. Reduces strip-commit diff.

---

### `src/routes/moderationRoutes.js` — POST `/listings/:id/media` (NEW endpoint)

**Analog:** `src/routes/moderationRoutes.js:94-133` (existing `/properties/:id/approve` handler). Same race-safe `findOneAndUpdate` + orphan-tolerant audit-log pattern.

**Auth pipeline pattern (already mounted at router level — line 57; do NOT repeat per-route):**
```javascript
// At top of file (already present):
router.use(verifyFirebaseToken, requireMinRole('moderator'));
```

**Race-safe atomic update + audit pattern to copy** (from existing `/approve` at lines 94-133):
```javascript
router.post('/properties/:id/approve', async (req, res) => {
  try {
    const now = new Date();
    const result = await Property.findOneAndUpdate(
      { _id: req.params.id, status: 'pending' },         // <-- status filter IS the lock primitive
      { $set: { status: 'live', approvedAt: now, approvedByUid: req.firebaseUid } },
      { new: true }
    );
    if (!result) {
      return res.status(409).json({
        code: 'ALREADY_MODERATED',
        message: 'This listing was already reviewed by another moderator.',
      });
    }
    try {
      await ModerationLog.create({
        actorUid: req.firebaseUid,         // PATTERNS §D — JWKS-verified token sub, NEVER body
        action: 'approve',
        targetType: 'property',
        targetId: result._id,
        before: { status: 'pending' },
        after:  { status: 'live', approvedAt: now, approvedByUid: req.firebaseUid },
        at: now,
      });
    } catch (auditErr) {
      // Orphan-tolerant: state flip is committed; audit miss only logs.
      console.error(JSON.stringify({
        evt: 'moderation_audit_orphan',
        action: 'approve',
        targetId: String(result._id),
        actorUid: req.firebaseUid,
        err: auditErr.message,
        ts: new Date().toISOString(),
      }));
    }
    return res.json(result);
  } catch (err) {
    console.error('Error approving listing:', err);
    return res.status(500).json({ message: err.message });
  }
});
```

**Divergence the planner MUST make for the new POST `/listings/:id/media` endpoint:**
- Mount `mediaUpload.fields([{ name: 'photos', maxCount: 40 }, { name: 'videos', maxCount: 5 }])` middleware between path and handler (Pitfall 3 — use `.fields()` NOT two stacked `.array()` calls).
- Filter relaxed to `status: { $in: ['pending', 'rejected'] }` — mods can curate media on rejected-and-being-edited listings, not just pending.
- Update operator: `{ $push: { 'media.photos': { $each: photoUrls }, 'media.videos': { $each: videoUrls } }, $set: { 'media.tourUrl': tourUrl } }` (RESEARCH.md Pattern 2 — atomic appends commute under `$each`).
- `tourUrl` validation BEFORE the update: `try { const u = new URL(s); if (u.protocol !== 'https:') throw … }` returns `400 { code: 'MEDIA_INVALID_TOUR_URL' }` (D-08, generic https://; NO Matterport allowlist).
- No-op guard: if no photos AND no videos AND no tourUrl, return `400 { code: 'MEDIA_NO_OP' }`.
- Capture `beforeDoc = await Property.findById(req.params.id, { media: 1 }).lean()` BEFORE the atomic update (need the `before` count for the diff per Discretion #7).
- ModerationLog `action: 'media-upload'` + count-only diff per Discretion #7:
  ```javascript
  before: { 'media.photos.length': N, 'media.videos.length': M, 'media.tourUrl.set': bool },
  after:  { 'media.photos.length': N+k, 'media.videos.length': M+j, 'media.tourUrl.set': bool },
  ```
- Multer error-mapping catch branches (Pitfall 6):
  ```javascript
  if (err.code === 'MEDIA_INVALID_TYPE')  return res.status(400).json({ code: 'MEDIA_INVALID_TYPE',  message: '...' });
  if (err.code === 'LIMIT_FILE_COUNT')    return res.status(400).json({ code: 'MEDIA_TOO_MANY_FILES', message: '...' });
  if (err.code === 'LIMIT_FILE_SIZE')     return res.status(400).json({ code: 'MEDIA_FILE_TOO_LARGE', message: '...' });
  ```

---

### `src/routes/moderationRoutes.js` — DELETE `/listings/:id/media?url=...&kind=photo|video` (NEW endpoint)

**Analog:** Same `/approve` handler (lines 94-133). Different update operator only.

**Pattern (RESEARCH.md §Pattern 3 — Discretion #2 RESOLVED: by URL):**
```javascript
router.delete('/listings/:id/media', async (req, res) => {
  try {
    const { url, kind } = req.query;
    if (!url || !['photo', 'video'].includes(kind)) {
      return res.status(400).json({ code: 'BAD_REQUEST', message: 'url + kind=photo|video required' });
    }
    const field = kind === 'photo' ? 'media.photos' : 'media.videos';

    // Capture before-state for ModerationLog count-only diff
    const beforeDoc = await Property.findById(req.params.id, { media: 1 }).lean();
    if (!beforeDoc) return res.status(404).json({ message: 'Property not found' });

    const result = await Property.findOneAndUpdate(
      { _id: req.params.id },
      { $pull: { [field]: url } },     // $pull is atomic; idempotent on non-member
      { new: true }
    );

    // Audit row — same shape as POST media (Discretion #8: reuse 'media-upload' action,
    // diff-direction signals add vs delete).
    try {
      await ModerationLog.create({
        actorUid: req.firebaseUid,
        action: 'media-upload',          // SAME enum value — diff direction tells the story
        targetType: 'property',
        targetId: result._id,
        before: { 'media.photos.length': ..., 'media.videos.length': ..., 'media.tourUrl.set': ... },
        after:  { 'media.photos.length': ..., 'media.videos.length': ..., 'media.tourUrl.set': ... },
        at: new Date(),
      });
    } catch (auditErr) { /* orphan-tolerant — same as POST */ }

    return res.json(result);
  } catch (err) { /* 500 fallback */ }
});
```

**Divergence:**
- No `mediaUpload` middleware (this is a DELETE — no body, query string only).
- No status filter on the `findOneAndUpdate` — DELETE is allowed on any state (mods can clean media on live listings if needed). Document this divergence in PLAN.md.
- `$pull` is idempotent; concurrent same-URL DELETEs are safe (no 409 returned by data layer).

---

### `src/routes/moderationRoutes.js` — MEDIA_REQUIRED gate at POST `/properties/:id/approve` (EDIT)

**Analog:** Existing `/approve` handler at `src/routes/moderationRoutes.js:94-133`. Insert fetch+check BEFORE the existing atomic `findOneAndUpdate`.

**Pattern to insert (verbatim from RESEARCH.md Example 2):**
```javascript
router.post('/properties/:id/approve', async (req, res) => {
  try {
    // D-09 — MEDIA_REQUIRED gate BEFORE the atomic state transition.
    // Fetch+check is NOT race-safe with concurrent media uploads; worst case is a
    // false-negative 400 (mod re-taps Approve → second attempt succeeds). Acceptable per Pitfall 2.
    const candidate = await Property.findById(req.params.id, { 'media.photos': 1, status: 1 }).lean();
    if (!candidate) return res.status(404).json({ message: 'Property not found' });
    if (!candidate.media?.photos?.length) {
      return res.status(400).json({ code: 'MEDIA_REQUIRED', message: 'At least one photo is required before approval.' });
    }

    // Existing M2 atomic transition — UNCHANGED below this line.
    const now = new Date();
    const result = await Property.findOneAndUpdate(
      { _id: req.params.id, status: 'pending' },
      { $set: { status: 'live', approvedAt: now, approvedByUid: req.firebaseUid } },
      { new: true }
    );
    // ... rest of handler unchanged ...
  } catch (err) { /* unchanged */ }
});
```

---

### `src/routes/moderationRoutes.js` — MEDIA_REQUIRED gate at edit-on-behalf flip (EDIT)

**Analog:** Existing PUT `/listings/:id` handler at `src/routes/moderationRoutes.js:445-617`. The atomic flip-to-live happens at line 613:
```javascript
const result = await Property.findOneAndUpdate(
  { _id: propertyId, status: { $in: ['pending', 'rejected'] } },
  { $set: updateData },     // updateData includes status: 'live' from line 600
  { new: true }
);
```

**Pattern to insert** (BEFORE STEP 5 atomic update at line 613, AFTER `original` is loaded at line 498 — the `original` snapshot already has media):
```javascript
// D-10 — MEDIA_REQUIRED gate at edit-on-behalf flip-to-live (mirrors /approve gate).
// The PUT handler ALWAYS flips status → 'live' (D-12 sub-decision), so the same
// invariant holds: NO listing reaches 'live' without at least one photo.
//
// We use the just-merged updateData.media.photos (incoming photos from req.files +
// existing photos from the deep-merge at line 567-577). If the merge produced
// an empty photos array AND original.media.photos is empty, return 400.
const mergedPhotos = Array.isArray(updateData.media?.photos)
  ? updateData.media.photos
  : (original.media?.photos || []);
if (!mergedPhotos.length) {
  return res.status(400).json({ code: 'MEDIA_REQUIRED', message: 'At least one photo is required before approval.' });
}
```

**Divergence:** Place AFTER the deep-merge (line 577) so the check sees the merged photo array, not the partial-body snapshot. PLAN.md should specify exact line.

---

### `src/routes/propertyRoutes.js` — strip multer + media body (D-13 atomic-break)

**Analog:** Multiple delete-style edits on `src/routes/propertyRoutes.js`:
- Lines 3-5 (`multer`, `S3Client`, `multer-s3` requires) → DELETE
- Lines 17-44 (S3Client + multer config block) → DELETE
- Line 111 (`router.post('/', upload.array('images', 40), verifyFirebaseToken, …)`) → STRIP middleware: `router.post('/', verifyFirebaseToken, requireListingCapability, async (req, res) => {`
- Line 129 (`media: clientMedia,` destructure) → DELETE
- Lines 156-158 (`const imageUrls = req.files ? req.files.map(...)` block) → DELETE
- Lines 185-190 (`parsedMedia` + JSON parse fallback) → DELETE
- Lines 216-221 (`media: { ...parsedMedia, photos: imageUrls.length > 0 ? … }` build block) → REPLACE with `media: { photos: [], videos: [], tourUrl: undefined },` (or omit the key entirely so schema defaults apply — planner picks)
- Lines 234-240 (`if (error instanceof multer.MulterError) { … }` catch branch) → DELETE
- Line 344 (PUT `'/:id', upload.array('images', 40), verifyFirebaseToken, …`) → STRIP middleware: `router.put('/:id', verifyFirebaseToken, async (req, res) => {`
- Lines 526-544 (PUT's `req.files` mapping + media merge block) → DELETE; PUT now ignores client-sent `media` keys entirely on user write paths (planner finalizes — D-13: "leave existing media intact; ignore client-sent media keys verbatim").

**Sentinel that enforces this (NEW `scripts/check-property-routes-media-stripped.sh`):**
```bash
grep -nE "upload\.array|multer|multerS3" src/routes/propertyRoutes.js  # must exit 1 (zero matches)
```

**Atomic-break stance (Phase 1 D-01):** No dual-shape window — testers wait for the next build. Memory `m2-shipped-2026-05-05.md` confirms M2 client (TestFlight 27 / Play 30) is already broken vs nested-shape backend, so D-13 is a no-op delta on tester impact.

---

### `src/models/ModerationLog.js` — extend `action` enum (EDIT, additive)

**Analog:** `src/models/ModerationLog.js:19` (the `action` field declaration).

**Existing enum** (verbatim):
```javascript
action: { type: String, enum: ['approve', 'reject', 'edit-on-behalf', 'archive', 'unarchive', 'hard-delete'], required: true },
```

**Edit:** Add `'media-upload'` (Discretion #8 — DELETE reuses the same value; diff direction signals add vs delete):
```javascript
action: { type: String, enum: ['approve', 'reject', 'edit-on-behalf', 'archive', 'unarchive', 'hard-delete', 'media-upload'], required: true },
```

**Pattern source for additive enum extension:** M2 Phase 4 archive-lifecycle (`'archive'`, `'unarchive'`, `'hard-delete'` were added the same way — additive only, no migration).

**JSDoc addition** (Pitfall 7 — document the diff-direction convention):
```
// 'media-upload' covers both add and remove operations on media.* arrays;
// after.media.photos.length > before.media.photos.length === upload;
// after.media.photos.length < before.media.photos.length === delete.
```

---

### `src/models/Property.js` — Mongoose tourUrl validator (Discretion #1 RESOLVED YES)

**Analog:** `src/models/Property.js:79-84` — current declaration:
```javascript
media: {
  photos:  { type: [String], default: [] },
  videos:  { type: [String], default: [] },
  tourUrl: { type: String },
},
```

**Edit (RESEARCH.md §Discretion #1 verbatim) — replace `tourUrl` line:**
```javascript
media: {
  photos:  { type: [String], default: [] },
  videos:  { type: [String], default: [] },
  tourUrl: {
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
      message: 'tourUrl must be a valid https:// URL',
    },
  },
},
```

**Important divergence:** Mongoose validators DO NOT run on `findOneAndUpdate` by default — the new POST `/listings/:id/media` handler MUST pass `{ runValidators: true }` in update options if it wants the schema-level validator to fire. Belt-and-suspenders: route-level `URL` parse (D-08) catches it first regardless. Cited: https://mongoosejs.com/docs/validation.html.

---

### `scripts/check-property-routes-media-stripped.sh` (NEW — backend, CI sentinel)

**Analog A** (preferred shape — multi-invariant pattern): RN client `scripts/check-role-grep.sh:1-74`:
```bash
#!/usr/bin/env bash
set -u
cd "$(dirname "$0")/.."

fail=0
echo "== Phase-3 D-16 propertyRoutes media-stripped sentinel =="

hits=$(grep -nE "upload\.array|multer|multerS3" src/routes/propertyRoutes.js 2>/dev/null || true)
if [ -n "$hits" ]; then
  echo "FAIL: multer/upload/multerS3 references still present in propertyRoutes.js:"
  echo "$hits"
  exit 1
else
  echo "OK: propertyRoutes.js is media-stripped"
  exit 0
fi
```

**Analog B** (single-invariant simpler shape): RN client `scripts/check-create-listing-screen-removed.sh:1-28` — same skeleton, different regex.

**Wave-0 gap (RESEARCH.md):** Backend has NO top-level `scripts/` directory today (only `src/scripts/` for migrations). Wave 0 of this phase MUST create the directory + `chmod +x` the new script. Wire into `package.json` `test` script per RESEARCH.md §Wave 0 Gaps.

---

### `scripts/check-no-actoruid-spoofing.sh` (NEW — backend, CI sentinel)

**Analog:** Same as above (`scripts/check-role-grep.sh` multi-invariant pattern). The regex (D-15 verbatim):
```bash
hits=$(grep -nE "actorUid:\s*req\.(body|headers)" src/routes/moderationRoutes.js 2>/dev/null || true)
if [ -n "$hits" ]; then
  echo "FAIL HF-03: actorUid sourced from req.body or req.headers in moderationRoutes.js:"
  echo "$hits"
  exit 1
fi
echo "OK HF-03: actorUid sourced exclusively from req.firebaseUid"
exit 0
```

**Threat-class memory:** `phase45-landlord-application-uid-mismatch-bug.md` — same regex shape (`uid:\s*req\.(body|headers)`) caught the bug class in M2 Phase 1 HF-03. The new media endpoints MUST write `actorUid: req.firebaseUid` (NEVER `req.body.actorUid` or `req.headers['x-actor-uid']`) to ModerationLog rows.

---

### `src/__tests__/moderationRoutes.test.js` (EXTEND — supertest cases)

**Analog:** `src/__tests__/moderationRoutes.test.js:179-308` (existing `MOD-16` audit + `MOD-17` 403 + `MOD-12` reasonCode patterns). All fixtures, mocks, and helpers (`makeNestedFixture`, `buildToken`, `makeApp`) already exist — extend.

**Anti-spoofing test pattern to copy verbatim** (lines 198-214 — adapt for new endpoints):
```javascript
test('actorUid CANNOT be spoofed via request body (anti-tampering)', async () => {
  const token = await buildToken({ sub: 'mod-a-uid', role: 'moderator', kind: 'valid' });

  const res = await request(app)
    .post(`/api/moderation/properties/${pendingListing._id}/approve`)
    .set('Authorization', `Bearer ${token}`)
    .send({ actorUid: 'attacker-uid', firebaseUid: 'attacker-uid' });
  expect(res.status).toBe(200);

  const logs = await ModerationLog.find({ targetId: pendingListing._id });
  expect(logs).toHaveLength(1);
  expect(logs[0].actorUid).toBe('mod-a-uid');         // From JWKS token sub
  expect(logs[0].actorUid).not.toBe('attacker-uid');  // NOT from body
});
```

**403-for-plain-user pattern to copy** (lines 222-257):
```javascript
test('POST /listings/:id/media returns 403 for plain user', async () => {
  const token = await buildToken({ sub: 'plain-user-uid', role: 'user', kind: 'valid' });
  const res = await request(app)
    .post(`/api/moderation/listings/${pendingListing._id}/media`)
    .set('Authorization', `Bearer ${token}`);
  expect(res.status).toBe(403);
  expect(res.body.code).toBe('insufficient-role');
});
```

**Race-condition Promise.all pattern to reuse** (lines 130-153) for concurrent DELETE-by-URL races (MOD-15 / D-06).

**~9 new describe blocks (per RESEARCH.md §Phase Requirements → Test Map):**
1. `POST /listings/:id/media` happy path (photos + videos + tourUrl)
2. `POST /listings/:id/media` — 401 (no token), 403 (plain user), 400 (invalid MIME), 400 (invalid tourUrl), 409 (race)
3. `DELETE /listings/:id/media?url=...` happy path + concurrent race
4. ModerationLog row written with `action: 'media-upload'` + `actorUid` from token sub
5. `MEDIA_REQUIRED` returns 400 at `/approve` when photos empty
6. `MEDIA_REQUIRED` returns 400 at edit-on-behalf flip-to-live
7. Append semantics — second POST appends to existing photos[] (not replace)
8. tourUrl `$set` semantics — second POST without tourUrl preserves existing; with empty tourUrl clears
9. MEDIA-08 regression: legacy listing's `media.photos[]` survives Phase 3 deploy verbatim

---

### `src/__tests__/propertyRoutes.test.js` (EXTEND — multer-stripped behavior)

**Analog:** `src/__tests__/propertyRoutes.test.js:1-110` (existing setup, mocks, `makeNestedFixture` helper).

**New describe block:** "MEDIA-02 — POST /api/properties ignores client-supplied media body":
```javascript
test('POST /api/properties — body media.{photos, videos, tourUrl} ignored, written as empty', async () => {
  const token = await buildToken({ sub: 'owner-uid', role: 'user', kind: 'valid' });
  const res = await request(app)
    .post('/api/properties')
    .set('Authorization', `Bearer ${token}`)
    .send({
      ...makeNestedFixture({ ownerUid: 'owner-uid' }),
      media: { photos: ['https://attacker.com/spoof.jpg'], videos: [], tourUrl: 'https://attacker.com/tour' },
    });
  expect(res.status).toBe(201);
  expect(res.body.media.photos).toEqual([]);
  expect(res.body.media.videos).toEqual([]);
  expect(res.body.media.tourUrl).toBeUndefined();
});
```

**Note:** Multipart-body test cases (with `req.files`) require either `supertest`'s `.attach()` API or are dropped post-strip (multer is gone — `req.files` is undefined). Planner picks; recommend dropping multipart cases since multer is gone and the route will treat them as normal JSON bodies (with files arriving as a body field that Express's body parser ignores).

---

### `src/screens/MediaCurationScreen.tsx` (NEW — RN client overlay screen, ~400-600 LOC)

**This is the biggest new file. Pattern composition from 4 analogs.**

#### Pattern A — Imports + theme/i18n hooks

**Analog:** `src/screens/LandlordApplicationScreen.tsx:1-28`:
```typescript
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, StatusBar,
  ActivityIndicator, Alert, Image, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import * as ImagePicker from 'react-native-image-picker';
import { Camera, Upload, ChevronLeft, Check, Clock } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { LandlordApplicationService, ... } from '../services/LandlordApplicationService';
```

**Divergence for MediaCurationScreen:**
- Add `import { useRole } from '../hooks/useRole';` for the belt-and-suspenders mod gate (RESEARCH.md Open Question #2 RESOLVED YES).
- Add `import { commonStyles } from '../components/ContextualListingFlow/styles';` for `chip` / `chipRow` / `input` / `section` / `sectionLabel` / `sectionTitle` reuse (UI-SPEC §Surface 1).
- Lucide icons differ: `X`, `Plus`, `Image as ImageIcon`, `Video`, `ChevronLeft` (per UI-SPEC).
- Service: `MediaCurationService` (NEW) instead of `LandlordApplicationService`.

#### Pattern B — Prop signature

**Analog:** `src/screens/LandlordApplicationScreen.tsx:29-33`:
```typescript
interface LandlordApplicationScreenProps {
  onBack: () => void;
  onSubmitted?: () => void;
}
```

**Divergence (CONTEXT.md `<specifics>` MediaCurationScreen prop shape):**
```typescript
interface MediaCurationScreenProps {
  listingId: string;
  onClose: () => void;
  onApproveSuccess?: () => void;   // App.tsx wires to refresh queue + close overlay
}
```

#### Pattern C — ImagePicker invocation (verbatim — already-installed dep, Discretion #4)

**Analog (verbatim copy):** `src/screens/LandlordApplicationScreen.tsx:109-132`:
```typescript
const handlePickIdPhoto = useCallback(() => {
  if (!ImagePicker || !ImagePicker.launchImageLibrary) {
    Alert.alert(t('common.error'), t('landlordApp.imagePickerUnavailable'));
    return;
  }
  ImagePicker.launchImageLibrary(
    { mediaType: 'photo', quality: 0.8, selectionLimit: 1, includeBase64: false },
    (response) => {
      if (response.didCancel) return;
      if (response.errorMessage) {
        Alert.alert(t('common.error'), response.errorMessage);
        return;
      }
      const asset = response.assets?.[0];
      if (asset?.uri) {
        setIdPhoto({ uri: asset.uri, type: asset.type || 'image/jpeg', name: asset.fileName || `id-${Date.now()}.jpg` });
      }
    }
  );
}, [t]);
```

**Divergence (RESEARCH.md Code Example 3 + Pitfall 1):**
- `mediaType: 'mixed'` (photos + videos in one picker)
- `selectionLimit: 0` (unlimited; iOS ≥14 + Android ≥13 — Assumption A2)
- ADD `assetRepresentationMode: 'compatible'` (HEIC→JPEG conversion on iOS — Pitfall 1)
- `quality: 0.85` (NOT `1` — Assumption A3 about HEIC conversion bug)
- Multi-asset handling: split via `assets.filter(a => a.type?.startsWith('image/'))` vs `'video/'`; populate two pending arrays.
- Cap-overflow truncation: take first `40 - existing` photos / `5 - existing` videos; surface info toast (UI-SPEC §Surface 5).

#### Pattern D — FormData + apiClient post (LandlordApplicationService.ts:36-48 verbatim)

**Analog:** `src/services/LandlordApplicationService.ts:33-49`:
```typescript
submit: async (input: SubmitInput): Promise<LandlordApplication> => {
  const formData = new FormData();
  formData.append('phone', input.phone);
  formData.append('listingTypeIntents', JSON.stringify(input.listingTypeIntents));
  if (input.applicantNote) formData.append('applicantNote', input.applicantNote);
  formData.append('idPhoto', {
    uri: input.idPhoto.uri,
    type: input.idPhoto.type || 'image/jpeg',
    name: input.idPhoto.name || `id-${Date.now()}.jpg`,
  } as any);
  const response = await apiClient.post('/landlord-applications', formData);
  return response.data;
},
```

**Divergence:** Append multiple `'photos'` files + multiple `'videos'` files + optional `'tourUrl'`. Use `forEach` per RESEARCH.md Code Example 3.

#### Pattern E — Banner shape (header + body + CTA + dismiss)

**Analog:** `src/components/RejectionBanner.tsx:28-92` — full structure of accent-stripe banner with title + body + CTA + close X. The MediaCurationScreen header reuses the close-X + accessibilityLabel pattern from this component.

#### Pattern F — Action footer (Save + Approve buttons)

**Analog:** `src/screens/PropertyDetailsScreen.tsx:1481-1537` (mod action footer) + UI-SPEC §"Action footer":
```typescript
<View style={[styles.modActionFooter, {
  backgroundColor: colors.surface,
  borderTopColor: colors.border,
  paddingBottom: Math.max(insets.bottom, 12),
}]}>
  <TouchableOpacity
    style={[styles.modActionBtn, { backgroundColor: '#059669' /* success green */ }]}
    onPress={handleApprove}
    disabled={submittingAction}
    activeOpacity={0.7}
    accessibilityRole="button"
    accessibilityLabel={t('moderation.action.approve')}
  >
    {submittingAction ? <ActivityIndicator color="#FFF" size="small" /> : (
      <><Check size={18} color="#FFF" />
        <Text style={styles.modActionBtnText}>{t('moderation.action.approve')}</Text></>
    )}
  </TouchableOpacity>
  {/* Reject + Edit-on-behalf siblings ... */}
</View>
```

**Divergence:**
- TWO buttons (Save photos + Approve & publish), NOT three.
- Save photos = secondary (`backgroundColor: colors.surface`, `border: 1px colors.border`).
- Approve & publish = primary/success (`backgroundColor: colors.success`).
- Approve disabled-state: `opacity: 0.5; disabled={true}` when `listing.media.photos.length === 0` (D-12 verbatim — pending photos do NOT count; server is the trust boundary).
- Hint text under Approve when disabled: `t('moderation.mediaCuration.approve.disabled.hint')`.

#### Pattern G — Race-toast (409 handling)

**Analog:** `src/screens/PropertyDetailsScreen.tsx:308-313`:
```typescript
const handleRaceConflict = async () => {
  setIsRejectModalOpen(false);
  Alert.alert(t('moderation.race.title'), t('moderation.race.toast'));
  await refetchProperty();
};

// In handler:
if (err?.response?.status === 409) {
  await handleRaceConflict();
  return;
}
```

**Divergence:** Reused for concurrent DELETE-by-URL conflicts and ALREADY_MODERATED races on POST media (D-06 + UI-SPEC §Race-toast).

---

### `src/services/MediaCurationService.ts` (NEW — recommend NEW file)

**Analog:** `src/services/LandlordApplicationService.ts:1-90` (full file — service object literal pattern + apiClient consumer + FormData) AND `src/services/PropertyService.ts:355-397` (mod-action shape — `canFromUser` belt-and-suspenders gate + 409 surfacing).

**Imports pattern (verbatim from LandlordApplicationService.ts:1-3):**
```typescript
import { apiClient } from './apiClient';
```

**Permission-gate pattern (verbatim from PropertyService.ts:358-371):**
```typescript
import { AuthService } from './AuthService';
import { canFromUser, PermissionDeniedError } from '../hooks/useRole';

approveListing: async (propertyId: string): Promise<any> => {
  try {
    const userData = await AuthService.getUserData();
    if (!canFromUser(userData, 'approveListings')) {
      console.error('[PropertyService.approveListing] permission denied', { userId: userData?.localId });
      throw new PermissionDeniedError();
    }
    const response = await apiClient.post(`/moderation/properties/${propertyId}/approve`);
    return { ...response.data, id: response.data._id };
  } catch (error: any) {
    console.error('Error approving listing:', error?.message);
    throw error;
  }
},
```

**Service shape for MediaCurationService:**
- `uploadMedia(listingId: string, photos: PendingAsset[], videos: PendingAsset[], tourUrl?: string): Promise<Property>` → POSTs `/moderation/listings/:id/media` (multipart).
- `deleteMediaAsset(listingId: string, url: string, kind: 'photo' | 'video'): Promise<Property>` → DELETEs `/moderation/listings/:id/media?url=…&kind=…`.

**Both methods MUST run `canFromUser(userData, 'approveListings')` belt-and-suspenders gate (mirrors PropertyService.approveListing). Use `encodeURIComponent(url)` on the DELETE call (Discretion #2 — URL-encoding sensitivity).**

**Naming convention:** `apiClient` paths are RELATIVE to the `/api` base (per `apiClient.ts:22` `baseURL: 'https://jaytap-services-production.up.railway.app/api'`) — so the path is `/moderation/listings/...` NOT `/api/moderation/listings/...`.

---

### `src/screens/ModerationQueueScreen.tsx` — filter chip row above Listings tab (EDIT)

**Analog A (chip pattern — verbatim shape):** `src/components/ContextualListingFlow/Step4ConditionAmenities.tsx:60-91`:
```typescript
<View style={commonStyles.chipRow} testID="condition-chip-row">
  {CONDITIONS.map((c) => {
    const isActive = values.conditionAndAmenities.condition === c;
    return (
      <TouchableOpacity
        key={c}
        testID={`condition-chip-${c}`}
        style={[
          commonStyles.chip,
          {
            backgroundColor: isActive ? colors.activeChipBackground : isDark ? '#2C2C2E' : '#F2F2F7',
            borderColor: isDark ? '#3A3A3C' : '#E5E5EA',
          },
        ]}
        onPress={() => setCA({ condition: c })}
      >
        <Text style={[commonStyles.chipText, { color: isActive ? colors.activeChipText : colors.text }]}>
          {t(`contextualListing.step4.condition.${c}` as TranslationKeys)}
        </Text>
      </TouchableOpacity>
    );
  })}
</View>
```

**Divergence for the new filter chip row:**
- Three chips: `'all-pending'`, `'needs-media'`, `'has-media'` (UI-SPEC §"Chip labels" + i18n keys `moderation.filter.allPending` / `.needsMedia` / `.hasMedia`).
- Default `'all-pending'` (D-03 — preserve M2 first-render behavior).
- Filter predicate (RESEARCH.md Open Question #1 RESOLVED): `'needs-media'` = `media.photos.length === 0`; `'has-media'` = `media.photos.length > 0`. Tour URL/videos do NOT participate.
- `accessibilityState={{ selected: chip === activeFilter }}` per UI-SPEC line 475.

**Analog B (insertion site):** `src/screens/ModerationQueueScreen.tsx:487-545` — insert the chip row between the existing 2-tab segmented control (line 545 closing `</View>`) and the Listings tab body (line 549 `<View style={{ flex: 1, display: activeTab === 'listings' ? 'flex' : 'none' }}>`). Chip row hidden when `activeTab !== 'listings'`.

**Apply the predicate to the FlatList data:**
```typescript
const filteredItems = items.filter((item) => {
  if (activeFilter === 'all-pending') return true;
  const photoCount = item.media?.photos?.length ?? 0;
  if (activeFilter === 'needs-media') return photoCount === 0;
  if (activeFilter === 'has-media') return photoCount > 0;
  return true;
});
// then: data={filteredItems} on the existing FlatList
```

**Row tap → MediaCurationScreen** (UI-SPEC §"Row tap behavior"): Plan picks; recommend a new prop `onOpenMediaCuration: (listingId: string) => void` wired by App.tsx into a setter that toggles `isMediaCurationOpen` + sets `currentMediaCurationListingId`.

---

### `src/screens/PropertyDetailsScreen.tsx` — needs-media banner + Approve disable (EDIT)

**Analog A (banner shape):** `src/components/RejectionBanner.tsx:28-92` — accent stripe + header + body + CTA. The new "Photos required" banner is a sibling component (planner picks: extract a `NeedsMediaBanner` component OR inline; recommend extract for symmetry with `RejectionBanner` and `HomeRejectionBanner`).

**Banner props (mirrors RejectionBanner shape):**
```typescript
interface NeedsMediaBannerProps {
  onAddPhotos: () => void;     // App.tsx wires to setIsMediaCurationOpen(true) + setCurrentMediaCurationListingId(propertyId)
}
```

**Render conditions** (UI-SPEC §"Trigger conditions" — logical AND):
```typescript
const showNeedsMediaBanner =
  can('approveListings') &&
  property.status === 'pending' &&
  (property.media?.photos?.length ?? 0) === 0;
```

**Placement:** Above the existing mod action footer at `src/screens/PropertyDetailsScreen.tsx:1481` (UI-SPEC §"Placement"). Sibling-render with `RejectionBanner` (already gated on owner-self per line 228; mod won't see RejectionBanner — co-render is logically impossible per UI-SPEC §"Co-render with `RejectionBanner`").

**Theme tokens:** `colors.warningSubtle` (background tint per UI-SPEC §"Tokens") OR fallback to `colors.surface + colors.warning` accent stripe (matches RejectionBanner's `colors.error` stripe pattern). UI-SPEC finalizes; planner copies tokens.

**Analog B (Approve button disable — modify existing handler):** `src/screens/PropertyDetailsScreen.tsx:1492-1508`:
```typescript
<TouchableOpacity
  style={[styles.modActionBtn, { backgroundColor: '#059669' /* success green */ }]}
  onPress={handleApprove}
  disabled={submittingAction}    // <-- EXTEND
  ...
```

**Divergence:** Change `disabled={submittingAction}` to `disabled={submittingAction || (property.media?.photos?.length ?? 0) === 0}` AND apply visual disabled state (opacity 0.5) per UI-SPEC §"Surface 4". Add `t('moderation.mediaCuration.approve.disabled.hint')` adjacent text when disabled.

---

### `App.tsx` — overlay flags + mount (EDIT)

**Analog (verbatim shape):** `App.tsx:60-79, 133-142, 697-705, 1140-1165` — existing `isModerationQueueOpen` flag + `OVERLAY_FLAGS` array + `fullScreenOverlayWrap` style + overlay mount block.

**State flag pattern to copy** (from line 76):
```typescript
const [isModerationQueueOpen, setIsModerationQueueOpen] = useState(false);
```

**Add (mirror exactly):**
```typescript
const [isMediaCurationOpen, setIsMediaCurationOpen] = useState(false);
const [currentMediaCurationListingId, setCurrentMediaCurationListingId] = useState<string | null>(null);
```

**OVERLAY_FLAGS extension** (line 133 array — append per CONVENTIONS.md "On adding a new full-screen overlay" review checklist):
```typescript
const OVERLAY_FLAGS = [
  !!selectedProperty,
  isRenterListingsOpen,
  !!user && isContextualListingFlowOpen,
  !!activeTourUrl,
  !!activePhotosUrl,
  !!user && isModerationQueueOpen,
  !!user && isRoleManagementOpen,
  !!user && isMediaCurationOpen,    // <-- ADD: Phase 3 — media-curation overlay
];
```

**Overlay mount block (verbatim from lines 1140-1165 — adapt):**
```typescript
{/* Phase 3 — Media curation overlay (sibling to moderation queue). */}
{!!user && isMediaCurationOpen && currentMediaCurationListingId && (
  <View style={[fullScreenOverlayWrap, { pointerEvents: 'auto' }]}>
    <MediaCurationScreen
      listingId={currentMediaCurationListingId}
      onClose={() => {
        setIsMediaCurationOpen(false);
        setCurrentMediaCurationListingId(null);
      }}
      onApproveSuccess={() => {
        setIsMediaCurationOpen(false);
        setCurrentMediaCurationListingId(null);
        setModerationCountRefreshKey((k) => k + 1);   // mirror pattern from line 1149
      }}
    />
  </View>
)}
```

**Critical pattern (Pitfall 4 — pointerEvents):** The style form `{ pointerEvents: 'auto' }` is REQUIRED. Do NOT use the deprecated prop form `<View pointerEvents={...}>` — RN 0.84 deprecates it.

**`fullScreenOverlayWrap`** (lines 697-705):
```typescript
const fullScreenOverlayWrap = {
  position: 'absolute' as const,
  top: 0, left: 0, right: 0, bottom: 0,
  zIndex: 3,
  elevation: 5,
};
```

**Wire row-tap from ModerationQueueScreen → MediaCurationScreen:** Add `onOpenMediaCuration={(listingId) => { setIsMediaCurationOpen(true); setCurrentMediaCurationListingId(listingId); }}` prop on the `<ModerationQueueScreen>` at line 1143. Same wire pattern from PropertyDetailsScreen mod banner CTA.

---

### `src/locales/en.ts` + `src/locales/ru.ts` — +29 keys (EDIT)

**Analog (existing namespace):** `src/locales/en.ts:516-543` already has the `moderation.*` namespace with 28 keys. New keys land under `moderation.filter.*`, `moderation.needsMediaBanner.*`, `moderation.mediaCuration.*`.

**29 new keys (UI-SPEC §"Total new EN + RU key count" verbatim):**
- 3 banner: `moderation.needsMediaBanner.{title,body,action}`
- 3 filter chips: `moderation.filter.{allPending,needsMedia,hasMedia}`
- 2 header: `moderation.mediaCuration.header.{title,close.a11y}`
- 1 a11y: `moderation.mediaCuration.delete.a11y`
- 2 empty state: `moderation.mediaCuration.empty.{title,body}`
- 3 grid labels: `moderation.mediaCuration.{photos.section,videos.section,pending.badge}`
- 4 tour URL: `moderation.mediaCuration.tourUrl.{label,placeholder,hint,invalid}`
- 5 buttons + states: `moderation.mediaCuration.save.{button,loading,success}` + `.approve.{button,disabled.hint}`
- 7 error toasts: `moderation.mediaCuration.error.{invalidType,invalidTourUrl,tooLarge,uploadFailed,permissionDenied,pickerUnavailable,mediaRequired}`
- (UI-SPEC §"Existing keys reused" — `moderation.race.{toast,title}`, `common.error`, `common.dismiss` are already present; no add.)

**EN+RU verbatim copy:** UI-SPEC lines 164-256 contain the full bilingual table — copy verbatim into both files.

**CI gate:** `bash scripts/check-i18n-parity.sh` enforces parity (lines 11-14 of the script: `grep -oE "'[a-zA-Z.]+':"` — note the regex requires lowercase + dot only, so all 29 keys conform).

---

### `src/screens/__tests__/MediaCurationScreen.test.tsx` (NEW — RTL smoke)

**Analog:** `src/components/__tests__/Gated.test.tsx:1-72` — only RTL/test-renderer pattern in the repo today.

**Pattern to copy:**
```typescript
import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Text } from 'react-native';
import { Gated } from '../Gated';

jest.mock('../../hooks/useRole', () => ({ useRole: jest.fn() }));
const { useRole } = require('../../hooks/useRole');

describe('Gated', () => {
  beforeEach(() => { (useRole as jest.Mock).mockReset(); });

  test('renders children when can(action) returns true', async () => {
    (useRole as jest.Mock).mockReturnValue({ can: (a: string) => a === 'editVerifications' });

    let tree: ReactTestRenderer.ReactTestRenderer | null = null;
    await ReactTestRenderer.act(() => {
      tree = ReactTestRenderer.create(
        <Gated action="editVerifications"><Text testID="child">admin-only</Text></Gated>,
      );
    });
    const json = tree!.toJSON();
    expect(JSON.stringify(json)).toContain('admin-only');
  });
});
```

**Divergence for MediaCurationScreen smoke (per CONTEXT.md D-16 + RESEARCH.md test map):**
- Mock `MediaCurationService` (network), `useTheme` (deterministic colors), `useLanguage` (identity `t`), `useRole` (forces `can('approveListings') === true`).
- Render with `listingId="test-listing-1"`, mock service to return a Property with empty `media.photos`.
- Assert: photo grid renders, Save button enabled-state when pending photos selected (mock-fire picker), Approve button disabled when `media.photos.length === 0`, deep-link from PropertyDetailsScreen banner mounts the screen with correct listingId.

**Wave-0 gap (RESEARCH.md):** `src/screens/__tests__/` directory does NOT exist today. Wave 0 creates it.

---

### `src/screens/__tests__/ModerationQueueScreen.test.tsx` (NEW — filter chip predicate tests)

**Analog:** Same as above (`Gated.test.tsx`). Mock `PropertyService.getModerationQueue` to return 3 listings: one with photos, one without, one with only `tourUrl`. Tap each chip. Assert filtered set count + identity.

**Predicate test (UI-SPEC §"Filter predicate" + RESEARCH.md Open Question #1):**
```typescript
test('Needs media filter shows only listings with photos.length === 0', () => {
  // setup mock items: A (photos=[url]), B (photos=[]), C (photos=[], tourUrl='https://x')
  // tap chip 'needs-media'
  // assert filtered list contains only B and C
});
```

---

## Shared Patterns

### Authentication / Role Gating (mounted at router-level on backend; `<Gated>` + `useRole()` on client)

**Source A (backend):** `src/routes/moderationRoutes.js:54-57`:
```javascript
// Belt-and-suspenders role gating per PATTERNS.md §A:
// - Server-side `requireMinRole('moderator')` is the security boundary (returns 403 with code: 'insufficient-role').
// - Client-side `<Gated action="viewModerationQueue">` is a UX layer hiding the entry-point.
router.use(verifyFirebaseToken, requireMinRole('moderator'));
```
**Apply to:** New POST + DELETE media endpoints inherit the router-level guard automatically — DO NOT repeat per-route.

**Source B (RN client):** `src/components/Gated.tsx:1-24` (full component) + `src/hooks/useRole` (the `can(action)` API).
**Apply to:** MediaCurationScreen (belt-and-suspenders mount-time guard inside the screen — RESEARCH.md Open Question #2 RESOLVED YES); ModerationQueueScreen filter row (already inside the `<Gated>`-wrapped queue surface — no extra guard needed); PropertyDetailsScreen banner (gate on `can('approveListings') && status === 'pending' && photos.length === 0`).

### Anti-spoofing actorUid

**Source:** `src/routes/moderationRoutes.js:110-127` (existing `/approve` audit-log write).
**Apply to:** ALL new audit-log writes in moderationRoutes.js — `actorUid: req.firebaseUid` (NEVER `req.body.actorUid`, NEVER `req.headers['x-actor-uid']`). Memory: `phase45-landlord-application-uid-mismatch-bug.md` (same threat class). Sentinel `scripts/check-no-actoruid-spoofing.sh` enforces.

### Race-safe atomic update (Mongoose `findOneAndUpdate`)

**Source:** `src/routes/moderationRoutes.js:97-107` — the canonical M2 pattern:
```javascript
const result = await Property.findOneAndUpdate(
  { _id: req.params.id, status: 'pending' },     // status filter IS the lock primitive
  { $set: { ... } },
  { new: true }
);
if (!result) {
  return res.status(409).json({ code: 'ALREADY_MODERATED', message: '...' });
}
```
**Apply to:** POST media (`status: { $in: ['pending', 'rejected'] }`); DELETE media (no status filter — allow on any state, idempotent `$pull`); MEDIA_REQUIRED gates (PRE-update fetch+check; documented as race-acceptable per Pitfall 2).

### Orphan-tolerant audit-log write

**Source:** `src/routes/moderationRoutes.js:108-127`:
```javascript
try {
  await ModerationLog.create({ actorUid: req.firebaseUid, action: '...', ... });
} catch (auditErr) {
  console.error(JSON.stringify({
    evt: 'moderation_audit_orphan',
    action: '...',
    targetId: String(result._id),
    actorUid: req.firebaseUid,
    err: auditErr.message,
    ts: new Date().toISOString(),
  }));
}
```
**Apply to:** All new audit-log writes (POST media, DELETE media, MEDIA_REQUIRED rejections do NOT write audit since they are pre-flight 400s — only successful state changes audit).

### 409 race-toast surfacing on RN client

**Source:** `src/screens/PropertyDetailsScreen.tsx:308-313` + `src/screens/ModerationQueueScreen.tsx` (existing M2 race-toast pattern).
```typescript
if (err?.response?.status === 409) {
  Alert.alert(t('moderation.race.title'), t('moderation.race.toast'));
  await refetch();
  return;
}
```
**Apply to:** MediaCurationScreen Save handler (concurrent another-mod-already-approved); MediaCurationScreen tile-delete handler (concurrent same-URL deletes — though `$pull` is idempotent so 409 unlikely).

### apiClient Bearer + 401/403 single-flight refresh

**Source:** `src/services/apiClient.ts:24-90`. The `Authorization: Bearer ${token}` header + 401 silent-refresh + 403 role-revoked retry pair are owned by the shared client.
**Apply to:** MediaCurationService just consumes `apiClient.post/delete` — NO auth code in the service. PropertyService already follows this pattern (`PropertyService.ts:355-397`).

### Theme tokens (no hardcoded colors)

**Source:** `src/theme/ThemeContext` `useTheme()` + `colors.{surface,border,text,textSecondary,error,success,accent,activeChipBackground,activeChipText,warning,warningSubtle?}`. Inline hex literals like `'#059669'` (success green) and `'#DC2626'` (error red) appear in PropertyDetailsScreen mod footer (lines 1493, 1510) — copy that pattern verbatim for the MediaCurationScreen action footer (UI-SPEC §"Action footer" specifies `colors.success` for primary; planner picks: hex literal vs token).

### EN+RU bilingual parity

**Source:** `src/locales/en.ts` + `src/locales/ru.ts` + `scripts/check-i18n-parity.sh`. CONVENTIONS.md hard rule: every new UI string lands in BOTH files. RU `Record<TranslationKeys, string>` type-checks via TypeScript. The grep parity sentinel is the second gate.
**Apply to:** All 29 new keys for Phase 3.

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| (none) | — | — | All 18 files have at least a role-match analog. The `__tests__` directories at `src/screens/__tests__/` (RN client) and `scripts/` (backend) need to be CREATED in Wave 0, but the test/script PATTERNS themselves have analogs. |

**Note on weak-analog flagged earlier:**
- **`src/models/Property.js` Mongoose validator:** No URL-validator analog exists in the repo. The pattern in §Discretion #1 of RESEARCH.md is direct from Mongoose docs (cited). Treat as net-new code; planner-tested.
- **RTL screen-level smoke:** Only `src/components/__tests__/Gated.test.tsx` exists in the repo. Screens have no test history (this is the first screen-level RTL smoke). Pattern source is the component test; planner extends as needed for screen-shaped concerns (overlay mount, service-mock, picker-mock, FormData-mock).

---

## Sequencing Notes (handoff to planner)

The following ordering reduces commit churn and keeps each plan independently green-able:

1. **Wave 0 (Backend first — directories + sentinels):**
   - Create `JayTap-services/scripts/` directory.
   - Add `check-property-routes-media-stripped.sh` + `check-no-actoruid-spoofing.sh` (sentinels are NO-OP-passing today since strip + new endpoints don't exist yet).
   - Create `JayTap-services/src/middleware/s3Upload.js` (extraction of duplicated S3 config — propertyRoutes + moderationRoutes both consume the factory; both still functional).

2. **Wave 1 (Backend new endpoints + invariants):**
   - Add POST `/listings/:id/media` + DELETE `/listings/:id/media` to moderationRoutes.js.
   - Add MEDIA_REQUIRED gates at `/approve` and edit-on-behalf flip-to-live.
   - Extend `ModerationLog.action` enum with `'media-upload'`.
   - Extend Property.media.tourUrl with Mongoose URL validator (Discretion #1).
   - Extend supertest cases.

3. **Wave 2 (Backend lockdown — atomic-break per D-13):**
   - Strip multer + media body from POST/PUT in propertyRoutes.js.
   - The `check-property-routes-media-stripped.sh` sentinel now FLIPS to PASSING.
   - Update `propertyRoutes.test.js` for the stripped behavior.

4. **Wave 3 (RN client — bottom-up):**
   - `src/services/MediaCurationService.ts` (NEW).
   - `src/locales/en.ts` + `ru.ts` (29 new keys).
   - `src/screens/MediaCurationScreen.tsx` (NEW).
   - Edit `src/screens/ModerationQueueScreen.tsx` (filter chip row + row-tap callback prop).
   - Edit `src/screens/PropertyDetailsScreen.tsx` (banner + Approve disable).
   - Edit `App.tsx` (overlay flags + mount + wire).
   - Add `src/screens/__tests__/MediaCurationScreen.test.tsx` + `ModerationQueueScreen.test.tsx`.

5. **Wave 4 (Verify + paired-gate):**
   - Run `nvm use 24 && npm test` in JayTap-services.
   - Run `npm test` in JayTap.
   - Run all sentinels (`check-property-routes-media-stripped.sh`, `check-no-actoruid-spoofing.sh`, `check-i18n-parity.sh`, `check-create-listing-screen-removed.sh`, `check-role-grep.sh`).
   - Mandatory verifier+code-reviewer paired-gate (memory `gsd-verifier-misses-regressions.md`).

---

*Phase: 03-media-flow-inversion-admin-mod-curation*
*Pattern map generated: 2026-05-06*

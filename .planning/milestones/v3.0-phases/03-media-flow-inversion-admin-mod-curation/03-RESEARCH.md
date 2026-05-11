# Phase 3: Media Flow Inversion (Admin/Mod Curation) - Research

**Researched:** 2026-05-06
**Domain:** Backend file-upload endpoints (Express + multer-s3 + AWS SDK v3) + RN moderator-only media-curation UI + atomic state-machine extension
**Confidence:** HIGH (all 16 locked decisions are mechanically achievable with existing dependencies; no new RN install gate required; Railway payload caps confirmed)

## Summary

Phase 3 is a **mostly mechanical** phase: the backend already has S3+multer-s3 plumbing in `propertyRoutes.js` (lines 17-43) — it gets relocated to a shared module + reused on the new `POST /api/moderation/listings/:id/media` endpoint, while the user-side `propertyRoutes.js` POST/PUT handlers get their `upload.array('images', 40)` middleware AND their `media: clientMedia` body destructure stripped (D-13). The RN client picks up `react-native-image-picker@^8.2.1` — a library **already installed** (`package.json:22`) and **already in use** at `src/screens/LandlordApplicationScreen.tsx:18` — so D-01's "MediaCurationScreen" needs zero new install gates, no peer-dependency surgery against reanimated@4.3.0 / RN 0.84 Fabric / Hermes.

The novel surface is small: (1) a new screen (`MediaCurationScreen.tsx` ~400-600 LOC) mirroring the Phase 2 ContextualListingFlow overlay-mount pattern in `App.tsx`; (2) two new endpoints (`POST` + `DELETE` media); (3) one new sentinel script (`scripts/check-property-routes-media-stripped.sh`); (4) extension of the `ModerationLog.action` enum from 6 to 7 values; (5) two filter chips on the existing ModerationQueueScreen Listings tab. Three race surfaces exist (concurrent append, concurrent delete-by-URL, concurrent approve-vs-upload) — all addressable with the M2 atomic `findOneAndUpdate` pattern that's already on every other moderation endpoint.

**Primary recommendation:** Sequence the plans so the **backend lockdown sentinel** (`check-property-routes-media-stripped.sh`) lands BEFORE the multer-strip code change in `propertyRoutes.js`, so the sentinel exits 1 (red) until the strip is complete — same TDD-on-sentinels pattern M1 Phase 4 used for `check-land-removed.sh`. Adopt **count-only** ModerationLog diffs for `'media-upload'` / `'media-delete'`, **DELETE-by-URL** addressing (concurrency-stable + no schema change), and **reject HEIC server-side** (MIME allowlist excludes `image/heic`/`image/heif`) — pushing HEIC→JPEG conversion to the client via `react-native-image-picker@8.x`'s built-in `assetRepresentationMode: 'compatible'` option which auto-converts on the user's device before upload.

## User Constraints (from CONTEXT.md)

### Locked Decisions (D-01..D-16) — DO NOT re-litigate

- **D-01** New `src/screens/MediaCurationScreen.tsx` (~400-600 LOC), pushed via App.tsx overlay state (`isMediaCurationOpen` + `currentMediaCurationListingId`). Mirrors Phase 2 ContextualListingFlow mounting pattern.
- **D-02** Filter chip row above existing Listings tab in ModerationQueueScreen — `[All pending] [Needs media] [Has media]`. Default = `All pending`.
- **D-03** Default landing tab unchanged (Listings).
- **D-04** PropertyDetailsScreen mod-only "needs media" banner above existing mod action footer; deep-link to MediaCurationScreen.
- **D-05** New `POST /api/moderation/listings/:id/media` (multipart-direct via existing multer-s3 setup); reuse the `S3Client` config from `propertyRoutes.js:17-43`.
- **D-06** Append + per-asset DELETE (`DELETE /api/moderation/listings/:id/media/:assetIndex` OR by URL — DISCRETION → resolved below to **by URL**).
- **D-07** Photos 40 / videos 5 cap; MIME-type allowlist; total payload cap (DISCRETION → resolved below).
- **D-08** `tourUrl` = generic `https://` validation only (NO Matterport allowlist).
- **D-09** Route-level `MEDIA_REQUIRED` gate at `POST /api/moderation/properties/:id/approve` (BEFORE atomic `findOneAndUpdate`); HTTP 400 + `code: 'MEDIA_REQUIRED'`.
- **D-10** `MEDIA_REQUIRED` also enforced at edit-on-behalf flip-to-live path (M2 MOD-14, current handler at `moderationRoutes.js` line ~445).
- **D-11** Two-step UX — `[Save photos]` (POST media) and `[Approve & publish]` (POST approve) buttons distinct.
- **D-12** Approve button DISABLED on 3 surfaces (MediaCurationScreen, ModerationQueueScreen row footer, PropertyDetailsScreen mod footer) when `media.photos.length === 0` + adjacent i18n hint.
- **D-13** Strip multer entirely from POST + PUT `/api/properties` (atomic-break, no role-gate). Strip `media.{photos, videos, tourUrl}` body keys (writes empty arrays + undefined tourUrl).
- **D-14** S3 IAM "rotation" = API surface removal (NO literal access-key rotation).
- **D-15** Anti-spoofing grep gate: `grep -nE "actorUid:\s*req\.(body|headers)" src/routes/moderationRoutes.js` exits with zero matches.
- **D-16** Default test scope: supertest cases for new POST/DELETE endpoints + MEDIA_REQUIRED + ModerationLog row + sentinel scripts + RN RTL component smoke.

### Claude's Discretion — RESOLVED in this research (see §Discretion Resolutions)

1. Mongoose-level `tourUrl` URL validator → **YES, add belt-and-suspenders**.
2. DELETE addressing → **by URL** (`?url=https://...` query param).
3. S3 client shared module → **YES, extract to `src/middleware/s3Upload.js`**.
4. RN file picker → **`react-native-image-picker@^8.2.1` (ALREADY INSTALLED)**.
5. MIME allowlist → **`image/jpeg|png|webp` + `video/mp4|quicktime` only — REJECT HEIC server-side; client converts via `assetRepresentationMode: 'compatible'`**.
6. Total payload cap → **45MB total request, 25MB/file (Railway has no documented hard ingress limit; Express+multer enforce caps)**.
7. ModerationLog `before/after` shape → **count-only** (`{ 'media.photos.length': N, 'media.videos.length': M, 'media.tourUrl.set': bool }`).
8. DELETE writes ModerationLog → **YES; reuse `'media-upload'` enum value with diff direction (count goes DOWN); DO NOT add `'media-delete'`** (keeps enum churn minimal).

### Deferred Ideas (OUT OF SCOPE — confirmed via CONTEXT.md `<deferred>` block)

- Presigned URL upload pattern · Pure URL paste · Replace-all media on save · Append-only no-DELETE
- Matterport allowlist for tourUrl · Mongoose pre-save hook for MEDIA_REQUIRED · Auto-publish on first photo
- Per-session "Publish after upload?" toggle · Client tap-and-fail without disable · Leave multer wired + role-gate
- Literal `jaytap-prod-s3` key rotation · IAM policy split user/mod prefix · Skip anti-spoofing grep
- Push notifications · Bulk moderation · Document verification · Video transcoding · Multi-tour preservation
- Panoramic photos slot · Per-asset metadata (caption/alt-text) · AsyncStorage draft persistence
- 2GIS bridge · Firebase SDK · `react-navigation` · KZT/UZS · M4+ carry-forward items

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| MEDIA-01 | New 6-step flow has NO photo/video/3D-tour fields | De-facto satisfied by Phase 2 Plan 02-09 (atomic deletion of CreateListingScreen.tsx + CreateListingForm/MediaSection); Phase 3 verifies via existing `scripts/check-create-listing-screen-removed.sh` + new `scripts/check-property-routes-media-stripped.sh` (D-13). |
| MEDIA-02 | `Property.media.{photos[], videos[], tourUrl?}` populated by admin/mod, NOT user | D-13 strips `media.*` body keys from POST+PUT `/api/properties`; D-05 introduces `POST /api/moderation/listings/:id/media` as the sole write path. |
| MEDIA-03 | Mod queue extension — new "Media curation" view per pending listing | D-01 new MediaCurationScreen + D-02 filter chip row + D-04 PropertyDetails banner deep-link. |
| MEDIA-04 | New backend endpoint `POST /api/moderation/listings/:id/media` (multipart photos/videos + JSON tourUrl) | D-05 endpoint shape verbatim; D-06 append semantics with `findOneAndUpdate` + `$push: { 'media.photos': { $each: ... } }`. |
| MEDIA-05 | S3 IAM policy update — admin/mod gain upload rights, user upload rights revoked | D-14 reinterpretation: API surface removal IS the rotation. The `jaytap-prod-s3` IAM user (memory `aws-iam-jaytap-prod-s3.md`) is the sole S3 actor regardless; D-13 multer strip removes the user-side path that exposed S3 PutObject. NO IAM key rotation required. |
| MEDIA-06 | Mod queue surfaces "needs media" filter (queue-side filter, NOT new status enum) | D-02 chip row `[Needs media]` filters client-side over the existing M2 queue payload. Server returns the existing `GET /api/moderation/queue` with `media` populated; client filters. |
| MEDIA-07 | Approval BLOCKED if `media.photos.length === 0`; HTTP 400 `code: 'MEDIA_REQUIRED'` | D-09 route-level gate at `/approve`; D-10 also at edit-on-behalf flip path; D-12 client UX disables Approve button on 3 surfaces. |
| MEDIA-08 | Existing M1+M2 listings with user-uploaded photos preserved verbatim | Already validated in Phase 1 D-15 (`images: [String]` → `media.photos: [String]` verbatim) and Phase 1 D-12 (`tours[]` → `media.tourUrl` first non-empty). Phase 3 verifies via supertest case (legacy listing with photos retains them post-Phase-3 deploy). |
| MEDIA-09 | EN+RU locale parity for mod media-curation UI strings (+20-30 keys) | Banner copy (3 keys) + filter chips (3 keys) + screen header/empty-state/buttons/hints (~15 keys) + error toasts (~5 keys) ≈ 26 keys (within 20-30 estimate). CI gate `scripts/check-i18n-parity.sh` enforces. |

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Photo/video file picking | Browser/Client (RN) | — | iOS Photos / Android camera — native picker only; backend can't initiate device file access. `react-native-image-picker` opens native picker. |
| HEIC → JPEG conversion | Browser/Client (RN) | — | iOS captures HEIC by default. `react-native-image-picker@8.x` `assetRepresentationMode: 'compatible'` converts on the device → upload bytes are already JPEG. Server doesn't need `sharp`/`imagemagick`. |
| Multipart S3 upload | API/Backend | — | RN client posts FormData to backend; backend (multer-s3) streams to S3. User device never gets S3 credentials. |
| Multer config + S3Client | API/Backend (shared module) | — | Extract from `propertyRoutes.js:17-43` to `src/middleware/s3Upload.js`; reused by moderationRoutes (Phase 3) + future S3-touching routes. |
| Approval gate (MEDIA_REQUIRED) | API/Backend (route-level) | Browser/Client (UX disable) | Server is trust boundary; client button-disable is UX guidance per D-12. Two gates active simultaneously. |
| User-side multer strip | API/Backend | — | Trust boundary — user-side write paths must not accept media regardless of client behavior. |
| ModerationLog audit row | Database/Storage | API/Backend (orchestration) | Append-only audit collection; written by backend handlers from `req.firebaseUid`. |
| Race-safe append/delete | Database/Storage (atomic ops) | API/Backend (filter+update) | MongoDB `findOneAndUpdate` with `$push`/`$pull` is the atomic primitive; Mongoose wraps it. |
| Mod-only screen mounting | Browser/Client (RN) | API/Backend (role enforcement) | `useRole()` guards screen visibility; backend `requireMinRole('moderator')` is the trust gate. |
| Tour URL validation | API/Backend (route + Mongoose validator) | Browser/Client (UX) | Belt-and-suspenders — Mongoose validator catches direct DB writes; route handler catches API writes; client placeholder text guides correct format. |

**Why this matters:** Multi-tier auth/upload flows historically misassign HEIC conversion to the backend (heavy `sharp` install + Lambda layer surgery for S3-edge transforms). The chosen path puts conversion at the device — zero backend dependency churn, zero Railway memory cost.

## Standard Stack

### Core (Backend — JayTap-services)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `multer` | `^1.4.5-lts.1` (already installed) | Multipart form-data parsing | Express ecosystem standard; already in `propertyRoutes.js`. |
| `multer-s3` | `^3.0.1` (already installed) | Stream uploads directly to S3 (no local temp file) | Standard Express+S3 pattern; avoids disk IO + cleanup. |
| `@aws-sdk/client-s3` | `^3.806.0` (already installed) | AWS SDK v3 S3 client | AWS-blessed; v2 SDK deprecated 2024. |
| `mongoose` | `^9.1.6` (already installed) | Property + ModerationLog models, atomic `findOneAndUpdate` with `$push`/`$pull` | M2/M3 baseline; race-safe primitive. |
| `jose` | `^6.2.3` (already installed) | JWKS-verified Firebase token sub → `req.firebaseUid` | Memory `no-firebase-sdk.md` REPO RULE; M2 ROLE-03 baseline. |

### Core (RN client — JayTap)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `react-native-image-picker` | `^8.2.1` (already installed) | Native photo/video picker, multi-select via `selectionLimit`, HEIC→JPEG conversion via `assetRepresentationMode: 'compatible'` | Already in use at `LandlordApplicationScreen.tsx:18`; battle-tested in this repo against RN 0.84 Fabric/Hermes/reanimated@4.3.0. |
| `axios` | `^1.13.5` (already installed) | HTTP client (FormData multipart upload via existing `apiClient.ts` Bearer interceptor) | M2 ROLE-09 baseline; auto-detects FormData and sets `multipart/form-data; boundary=...` correctly. |

**No new dependencies required for either repo.** The "RN file picker install gate" anticipated in CONTEXT.md `<specifics>` does NOT exist — the package is at `package.json:22` and used at `LandlordApplicationScreen.tsx:114` (`ImagePicker.launchImageLibrary({ mediaType: 'photo', quality: 0.8, selectionLimit: 1, includeBase64: false }, ...)`).

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `supertest` | `^7.1.4` (already installed) | Backend route-level integration tests | D-16 default scope — POST/DELETE/MEDIA_REQUIRED/race-cell tests in `moderationRoutes.test.js`. |
| `mongodb-memory-server` | `^9.5.0` (already installed) | In-memory MongoDB for backend tests | Existing test-suite pattern in `moderationRoutes.test.js` setup. |
| `react-test-renderer` | `19.2.3` (already installed) | RN RTL component smoke tests | D-16 — MediaCurationScreen smoke (renders grid, Save enabled, Approve disabled). |

### Alternatives Considered (and rejected per CONTEXT.md)

| Instead of | Could Use | Tradeoff (why CONTEXT.md decisions still hold) |
|------------|-----------|----------|
| `react-native-image-picker` | `expo-image-picker` | Requires `expo-modules-core` install + autolinking — invasive on bare RN 0.84 setup; `expo-image-picker` README explicitly states bare-workflow apps need `npx install-expo-modules` (project hasn't done this). DEFERRED. |
| `react-native-image-picker` | `react-native-document-picker` | Generic file UI, no multi-photo grid affordance, no HEIC handling. Worse UX. DEFERRED. |
| `multer-s3` direct multipart | Presigned URL S3 upload | REJECTED in CONTEXT.md D-05 — overkill for 1-2 person mod team; adds 2-trip dance + S3 CORS config. |
| Server-side HEIC → JPEG | `sharp` library | Adds heavy native binary; Railway memory pressure; client-side `assetRepresentationMode: 'compatible'` solves it for free. DEFERRED. |
| `file-type` magic-byte check | Trust client MIME type | Stronger guarantee; for a 1-2 person trusted-mod team, MIME allowlist is sufficient. Re-evaluate if non-trusted actors gain upload rights (M4+). |

**Installation:** None required. Verify versions:

```bash
# Backend
cd /Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services
nvm use 24
npm view multer version       # confirm 1.4.5-lts.1+
npm view multer-s3 version    # confirm 3.0.1+
npm view @aws-sdk/client-s3 version  # confirm 3.806.0+

# RN client
cd /Users/beckmaldinVL/development/mobileApps/JayTap
npm view react-native-image-picker version   # confirm 8.2.1+
```

**Version verification (executed during this research, 2026-05-06):**

| Package | Pinned | Latest stable | Status |
|---------|--------|---------------|--------|
| `react-native-image-picker` | `^8.2.1` | 8.2.1 (Feb 2025 release per npm) | Current; no upgrade needed `[VERIFIED: web search 2026-05-06]` |
| `multer` | `^1.4.5-lts.1` | 1.4.5-lts.1 | Current `[VERIFIED: package.json + npm registry]` |
| `multer-s3` | `^3.0.1` | 3.0.1 | Current `[VERIFIED: package.json]` |
| `@aws-sdk/client-s3` | `^3.806.0` | 3.806.0+ minor releases ongoing | Current; minor SDK bumps OK to absorb `[VERIFIED: package.json]` |

## Architecture Patterns

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ MODERATOR DEVICE (RN client)                                                │
│                                                                             │
│  ModerationQueueScreen ── tap row ──► App.tsx state                         │
│        │                              │ setIsMediaCurationOpen(true)       │
│        │ filter chips                 │ setCurrentMediaCurationListingId(id)│
│        │ [All pending][Needs media]   ▼                                     │
│        │ [Has media]                MediaCurationScreen.tsx                 │
│        ▼                              │                                     │
│   PropertyDetailsScreen               │ ImagePicker.launchImageLibrary({    │
│   (mod-only banner)                   │   mediaType: 'mixed',               │
│        │                              │   selectionLimit: 0,                │
│        │ "Add photos" CTA             │   assetRepresentationMode:          │
│        ▼                              │     'compatible',  // HEIC→JPEG    │
│  (deep-link to MediaCurationScreen)   │ })                                  │
│                                       ▼                                     │
│                              FormData (Bearer token)                        │
└─────────────────────────────────────┬───────────────────────────────────────┘
                                      │  HTTPS (apiClient.ts interceptor)
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ BACKEND (Railway: JayTap-services)                                          │
│                                                                             │
│  Express router /api/moderation                                             │
│        │                                                                    │
│        │ verifyFirebaseToken (JWKS) ───► req.firebaseUid                    │
│        │ requireMinRole('moderator') ──► 403 if not mod/admin              │
│        ▼                                                                    │
│  POST /listings/:id/media                                                   │
│        │ multer-s3.array('photos', 40)  ──► req.files[].location (S3 URL)  │
│        │ multer-s3.array('videos', 5)   ──► req.files[].location           │
│        │ fileFilter: image/jpeg|png|webp  + video/mp4|quicktime ONLY        │
│        │ limits: 25MB/file, 45 files total, 45MB total                      │
│        │                                                                    │
│        │ validate tourUrl: /^https:\/\//                                    │
│        ▼                                                                    │
│  Property.findOneAndUpdate(                                                 │
│    { _id, status: { $in: ['pending','rejected'] } },  // race-safe filter  │
│    { $push: { 'media.photos': { $each: photoUrls },                         │
│              'media.videos': { $each: videoUrls } },                        │
│      $set: { 'media.tourUrl': tourUrl } },                                  │
│    { new: true }                                                            │
│  )                                                                          │
│        ▼                                                                    │
│  ModerationLog.create({                                                     │
│    actorUid: req.firebaseUid,        // D-15 — NEVER from body/headers      │
│    action: 'media-upload',           // D-05 enum extension                 │
│    before: {'media.photos.length': N0, ...}, // count-only diff             │
│    after:  {'media.photos.length': N1, ...},                                │
│  })                                                                         │
│        ▼                                                                    │
│  ┌─────────────────────────┐    ┌──────────────────────────┐               │
│  │ MongoDB Atlas           │    │ S3 (jaytap-properties)   │               │
│  │  properties             │    │  properties/             │               │
│  │  moderation_log         │    │   {timestamp}-{name}     │               │
│  └─────────────────────────┘    └──────────────────────────┘               │
└─────────────────────────────────────────────────────────────────────────────┘

USER DEVICE (RN client)                                                      ❌
  ContextualListingFlow (Phase 2) — ZERO media affordance                    ❌
  POST /api/properties — multer STRIPPED (D-13); body media.* IGNORED        ❌
  No path to S3 PutObject for non-mod users (D-14 API surface removal = IAM rotation)
```

### Recommended Project Structure (incremental — NOT new layout)

**Backend** (`JayTap-services/src/`):

```
middleware/
├── s3Upload.js               # NEW (Discretion #3): exports { s3, makeUploader({fieldName, allowedMimes, fileSizeBytes, totalFiles}) }
├── verifyFirebaseToken.js    # unchanged (M2 baseline)
└── requireListingCapability.js  # unchanged (Phase 4.5)

routes/
├── propertyRoutes.js         # MODIFY: strip multer + media body fields (D-13)
├── moderationRoutes.js       # MODIFY: add POST + DELETE media + MEDIA_REQUIRED gate at /approve and edit-on-behalf
└── ...

models/
├── Property.js               # MODIFY: add Mongoose tourUrl validator (Discretion #1)
└── ModerationLog.js          # MODIFY: extend action enum to include 'media-upload'

scripts/
└── check-property-routes-media-stripped.sh   # NEW (D-16 sentinel): grep -nE "upload\.array|multer|multerS3" src/routes/propertyRoutes.js | exit 1 on match
                                              # NOTE: backend repo's scripts/ directory does NOT yet exist — new directory + script

src/__tests__/
├── moderationRoutes.test.js  # EXTEND: 9 new test groups (per D-16)
└── propertyRoutes.test.js    # EXTEND: multer-stripped behavior assertion
```

**RN client** (`JayTap/`):

```
src/screens/
├── MediaCurationScreen.tsx           # NEW (D-01) ~400-600 LOC
├── ModerationQueueScreen.tsx         # MODIFY: filter chip row + row-tap navigation (D-02)
└── PropertyDetailsScreen.tsx         # MODIFY: mod banner + Approve disable (D-04, D-12)

src/services/
└── ModerationService.ts              # NEW: extends from PropertyService.approveListing/rejectListing pattern
                                      # OR extend existing PropertyService (planner discretion in 03-CONTEXT.md)
                                      # Recommendation: NEW file — keeps PropertyService at single-responsibility

App.tsx                               # MODIFY: add 2 state flags + overlay mount

src/locales/en.ts + ru.ts             # MODIFY: ~26 new keys (MEDIA-09)

scripts/
└── (no changes to RN scripts dir; backend owns the property-routes-stripped sentinel)
```

### Pattern 1: Shared multer-s3 module factory (Discretion #3)

**What:** Extract S3Client + multer config to `src/middleware/s3Upload.js` as a factory that returns configured uploaders.

**When to use:** Any backend route that needs S3 streaming uploads (currently 2 callsites: propertyRoutes lines 17-43 — to be stripped — and moderationRoutes lines 27-51 — to be re-anchored).

**Example:**

```javascript
// src/middleware/s3Upload.js
const multer = require('multer');
const { S3Client } = require('@aws-sdk/client-s3');
const multerS3 = require('multer-s3');

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const PHOTO_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const VIDEO_MIMES = new Set(['video/mp4', 'video/quicktime']);

function makeUploader({ allowedMimes, fileSizeBytes, totalFiles }) {
  return multer({
    storage: multerS3({
      s3,
      bucket: process.env.AWS_BUCKET_NAME || 'jaytap-properties',
      metadata: (req, file, cb) => cb(null, { fieldName: file.fieldname }),
      key: (req, file, cb) => {
        const ts = Date.now();
        cb(null, `properties/${ts}-${file.originalname}`);
      },
    }),
    limits: { fileSize: fileSizeBytes, files: totalFiles },
    fileFilter: (req, file, cb) => {
      if (!allowedMimes.has(file.mimetype)) {
        // multer's documented contract: pass error to skip + signal 400
        const err = new Error('Invalid file type');
        err.code = 'MEDIA_INVALID_TYPE';
        return cb(err, false);
      }
      cb(null, true);
    },
  });
}

module.exports = { s3, makeUploader, PHOTO_MIMES, VIDEO_MIMES };
// Source: extraction of existing src/routes/propertyRoutes.js:17-43 + src/routes/moderationRoutes.js:27-51 (this repo)
```

`[VERIFIED: read of /Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/routes/propertyRoutes.js lines 17-43]`

### Pattern 2: Race-safe append + tourUrl set (Mongoose `findOneAndUpdate`)

**What:** Atomic update writes new photos/videos to existing arrays without losing concurrent additions.

**When to use:** Every write path on `media.*` from the new `POST /api/moderation/listings/:id/media` endpoint.

**Example:**

```javascript
// In src/routes/moderationRoutes.js — POST /listings/:id/media handler
const photoUrls = (req.files?.photos || []).map(f => f.location);
const videoUrls = (req.files?.videos || []).map(f => f.location);
const tourUrl = (req.body.tourUrl && /^https:\/\//.test(req.body.tourUrl))
  ? req.body.tourUrl
  : undefined;

// Build update operators — only $set tourUrl if provided (avoid wiping existing)
const update = {};
if (photoUrls.length || videoUrls.length) {
  update.$push = {};
  if (photoUrls.length) update.$push['media.photos'] = { $each: photoUrls };
  if (videoUrls.length) update.$push['media.videos'] = { $each: videoUrls };
}
if (tourUrl !== undefined) {
  update.$set = { 'media.tourUrl': tourUrl };
}

const result = await Property.findOneAndUpdate(
  { _id: req.params.id, status: { $in: ['pending', 'rejected'] } },
  update,
  { new: true }
);
if (!result) return res.status(409).json({ code: 'ALREADY_MODERATED', message: '...' });
// Source: Mongoose docs (https://mongoosejs.com/docs/tutorials/findoneandupdate.html)
//         + existing moderationRoutes.js:614 edit-on-behalf race-safe filter pattern
```

`[CITED: https://mongoosejs.com/docs/tutorials/findoneandupdate.html]`

### Pattern 3: DELETE-by-URL + race-safe `$pull` (Discretion #2 resolution)

**What:** Per-asset removal addressed by URL value (not array index) — concurrency-stable.

**When to use:** `DELETE /api/moderation/listings/:id/media?url=https://...&kind=photo|video`.

**Example:**

```javascript
// In src/routes/moderationRoutes.js — DELETE /listings/:id/media handler
router.delete('/listings/:id/media', async (req, res) => {
  const { url, kind } = req.query;  // kind ∈ {'photo','video'}
  if (!url || !['photo', 'video'].includes(kind)) {
    return res.status(400).json({ code: 'BAD_REQUEST', message: 'url + kind=photo|video required' });
  }
  const field = kind === 'photo' ? 'media.photos' : 'media.videos';

  // Capture before-count for ModerationLog diff
  const beforeDoc = await Property.findById(req.params.id, { media: 1 }).lean();
  if (!beforeDoc) return res.status(404).json({ message: 'Property not found' });

  const result = await Property.findOneAndUpdate(
    { _id: req.params.id },
    { $pull: { [field]: url } },     // $pull is atomic on the SERVER per Mongoose docs
    { new: true }
  );
  // ... ModerationLog write with action: 'media-upload' (count-only diff) ...
  // NOTE: $pull on a non-existent value is a no-op (returns the document unchanged).
  // The DELETE is idempotent — concurrent DELETE of the same URL returns the same final state.
});
// Source: https://mongoosejs.com/docs/tutorials/findoneandupdate.html (atomic guarantee)
//         + https://www.mongodb.com/docs/manual/reference/operator/update/pull/
```

`[CITED: https://mongoosejs.com/docs/tutorials/findoneandupdate.html + https://www.mongodb.com/docs/manual/reference/operator/update/pull/]`

**Why DELETE-by-URL beats DELETE-by-index:**

| Mode | Concurrent delete-of-same-asset | Concurrent delete-of-different-assets | Schema change |
|------|-------------------------------|-------------------------------------|---------------|
| By index (`?index=2`) | RACE: two DELETE-by-index=2 requests can delete different assets if photos were appended between client-fetch and DELETE | RACE: index-2 client + concurrent delete-of-index-1 → first deletes wrong photo (indices shift) | none |
| By URL (`?url=...`) | IDEMPOTENT: second DELETE is a no-op (`$pull` of non-member is silent) | SAFE: each `$pull` matches its specific URL value, indices irrelevant | none |
| By subdoc `_id` | SAFE | SAFE | INVASIVE: `media.photos` from `[String]` to `[{url, _id, addedBy, addedAt}]` — Phase 1 D-15 invariant breaks |

### Pattern 4: MediaCurationScreen overlay mount (mirrors Phase 2 ContextualListingFlow)

**What:** Add 2 state flags to `App.tsx` + a conditional overlay block; screen is a self-contained pure component.

**When to use:** D-01 mod-only push-on-tap surface from ModerationQueueScreen rows OR PropertyDetailsScreen banner.

**Example:**

```typescript
// In App.tsx — additions (mirrors lines 60-78 + 1001-1050 pattern for ContextualListingFlow)
const [isMediaCurationOpen, setIsMediaCurationOpen] = useState(false);
const [currentMediaCurationListingId, setCurrentMediaCurationListingId] = useState<string | null>(null);

// In OVERLAY_FLAGS gate logic (per CONVENTIONS.md "On adding a new full-screen overlay"):
const overlayActive = isContextualListingFlowOpen || isModerationQueueOpen
  || isMediaCurationOpen || /* ... */;

// In conditional render block (mirrors line 1141 isModerationQueueOpen mount):
{!!user && isMediaCurationOpen && currentMediaCurationListingId && (
  <View style={[fullScreenOverlayWrap, { pointerEvents: isMediaCurationOpen ? 'auto' : 'none' }]}>
    <MediaCurationScreen
      listingId={currentMediaCurationListingId}
      onClose={() => {
        setIsMediaCurationOpen(false);
        setCurrentMediaCurationListingId(null);
      }}
      onApproveSuccess={() => {
        setIsMediaCurationOpen(false);
        setCurrentMediaCurationListingId(null);
        // Optionally trigger ModerationQueueScreen refresh
      }}
    />
  </View>
)}
// Source: existing App.tsx ContextualListingFlow mount pattern (lines 1001-1050)
//         + CONVENTIONS.md keep-alive/overlay rule (display + pointerEvents both required)
```

`[VERIFIED: read of /Users/beckmaldinVL/development/mobileApps/JayTap/App.tsx lines 60-78, 1001-1050]`

### Anti-Patterns to Avoid

- **DELETE-by-array-index:** Race-prone — concurrent appends shift indices. (Resolution: DELETE-by-URL.)
- **`Property.findById()` then `property.media.photos.push(url)` then `await property.save()`:** Loses concurrent appends — second writer overwrites first writer's array. (Resolution: `findOneAndUpdate` with `$push: { 'media.photos': { $each: ... } }`.)
- **`actorUid: req.body.actorUid` or `actorUid: req.headers['x-actor-uid']`:** Spoofable; same threat class as Phase 4.5 uid-mismatch bug. (Resolution: `actorUid: req.firebaseUid`; D-15 grep gate enforces.)
- **Reading `req.files` length check BEFORE multer's `fileFilter` runs:** multer's pipeline filters first, so file array reflects only allowed types — but a malicious actor could send 100 invalid files and hit Express's body parser before fileFilter rejects. (Resolution: `multer.limits.files` cap as backstop.)
- **`Mongoose.Schema.pre('findOneAndUpdate', ...)` to enforce MEDIA_REQUIRED:** Pre-hooks DON'T run automatically on findOneAndUpdate by default unless `runValidators` is set; even then, validation errors look different from route-level 400s. (Resolution: route-level fetch-and-check before atomic findOneAndUpdate per D-09.)
- **Storing photo URLs as subdocuments with auto-ID just for DELETE addressing:** Forces Phase 1 D-15 schema change (`[String]` → `[{ url, _id, addedAt, addedBy }]`); migration overhead unjustified. (Resolution: DELETE-by-URL.)
- **Trusting client-supplied MIME type alone:** Easy to spoof. For 1-2 person trusted-mod team, allowlist is sufficient; if upload rights ever extend to plain users, add `file-type` magic-byte check. (Resolution: MIME allowlist + `multer.limits` for now; magic-byte deferred to M4+.)
- **`pointerEvents` deprecated prop form:** RN 0.84 deprecates `pointerEvents` as a prop; must use style (`{ pointerEvents: 'auto' }`). Per CONVENTIONS.md.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Multipart parsing + S3 upload | Manual `Content-Type: multipart/form-data` parser + AWS SDK PutObject calls | `multer` + `multer-s3` (already installed) | Streams directly to S3 (no local temp file); handles boundary parsing; battle-tested. |
| File picker UI | Custom photo grid + native module bridge | `react-native-image-picker` (already installed) | Native iOS Photos / Android picker; multi-select via `selectionLimit`; HEIC→JPEG built-in. |
| Race-safe array append | Read-then-modify-then-save pattern | Mongoose `findOneAndUpdate` with `$push: { ...: { $each: [...] } }` | Atomic at MongoDB server; doesn't lose concurrent writes. |
| Race-safe array element delete | Splice by index in app code | Mongoose `findOneAndUpdate` with `$pull: { ...: value }` | Atomic; idempotent across concurrent same-value pulls. |
| Token verification on every endpoint | Manual JWT decoding + signature check | `verifyFirebaseToken` middleware + `requireMinRole('moderator')` (M2 baseline) | JWKS-cached; rotation-aware; same trust boundary as the rest of `/api/moderation/*`. |
| HEIC → JPEG conversion server-side | `sharp` or `imagemagick` | RN `assetRepresentationMode: 'compatible'` (client-side, free) | Avoids heavy native binary; offloads CPU to user device; bytes uploaded are already JPEG. |
| URL parsing for tour URL validation | Regex `^https?://[^\s]+$` (insecure — allows `https:// .example.com`) | `URL` constructor (Node built-in) — `try { new URL(s); } catch { ... }` | Standards-compliant URL parsing; rejects malformed even if regex passes. PLUS Mongoose validator for belt-and-suspenders. |
| Filter chip multi-state | Custom enum + manual TouchableOpacity dance | Reuse Phase 2 chip pattern from Step 2 city/district selection (visual continuity) | Already styled; theme tokens plumbed; passes existing keyboard-controller paddings. |

**Key insight:** The "infrastructure heavy lifting" is already done by Phases 1+2 (S3+multer plumbing in propertyRoutes; ModerationLog audit pattern; useRole+Gated guards; apiClient Bearer interceptor; Phase 2 ContextualListingFlow overlay-mount pattern). Phase 3 is **assembly + relocation**, not invention.

## Runtime State Inventory

> Phase 3 IS a refactor (multer-strip in propertyRoutes is atomic-break per D-13). Inventory required.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| **Stored data** | **Existing M1+M2 listings with user-uploaded `media.photos[]`** populated by Phase 1 D-15 migration. **NOTHING ELSE** — no Mem0/ChromaDB/etc. in this stack. Verified by reading `Property.js` schema. | NONE — preserved verbatim per MEDIA-08 (regression test confirms). |
| **Live service config** | **S3 bucket `jaytap-properties`** has objects under `properties/{timestamp}-{originalname}` from M1+M2 user uploads. NO removal. NO reorganization. **n8n / Datadog / Cloudflare Tunnel — none in stack**. Railway env vars (`AWS_*`) unchanged per D-14. | NONE — existing objects stay; new mod uploads write to same prefix. |
| **OS-registered state** | **None** — backend runs as a single Railway process; no Windows Task Scheduler, pm2-saved processes, or launchd plists. RN client has no OS-registered state for media. | NONE. |
| **Secrets and env vars** | `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `AWS_BUCKET_NAME` — read in `propertyRoutes.js:18-23` AND `moderationRoutes.js:28-32`. **NO rename** (Discretion #3 extracts the SAME env-var reads into shared module — no SOPS/CI variable name change). Per D-14: NO IAM key rotation. | NONE — code edit only (extract to shared module). |
| **Build artifacts / installed packages** | RN client has `node_modules/react-native-image-picker/` from M1+M2; iOS Pods `RNImagePicker.podspec`. Backend has `node_modules/multer-s3/`, `node_modules/@aws-sdk/client-s3/`. **No package.json deletions** (no removed deps). | NONE — Phase 3 adds zero deps; existing artifacts remain valid. |

**Nothing-found confirmations:**
- No Mem0 / ChromaDB / Redis stored references — verified by absence in package.json.
- No Datadog / Cloudflare Tunnel — `firebase-admin` confirmed absent (memory `m2-shipped-2026-05-05.md`); `socket.io` is the only live-service infra and doesn't reference media.
- No Windows Task Scheduler / pm2 — Railway is the runtime; no operator-side daemons.

**The canonical question:** *After every file in the repo is updated, what runtime systems still have the old contract cached?*

Answer: **The only "old contract" is the M2 client TestFlight build 27 / Play Internal versionCode 30** which still posts `multipart/form-data` to `POST /api/properties` with embedded `images` files. Per Phase 1 D-01 atomic-break stance + memory `m2-shipped-2026-05-05.md`, **testers are dev-team-only on Internal Testing tracks** — the M2 client is already broken against the M3 backend (Phase 1 nested-shape cutover). Phase 3's user-side multer strip is a NO-OP delta on tester impact: the Phase 1 cutover already broke that surface; D-13 just removes dead code that no longer functions.

## Common Pitfalls

### Pitfall 1: HEIC files arrive at the server with mimetype `application/octet-stream`

**What goes wrong:** iOS captures HEIC photos by default. Without proper picker config, the file's MIME type at the multer boundary is `application/octet-stream` (not `image/heic`) — multer's `fileFilter` allowlist rejects them with `MEDIA_INVALID_TYPE` and the upload fails silently.

**Why it happens:** RN's FormData implementation infers MIME type from file extension; `.heic` extension isn't always mapped. iOS's photo picker by default returns the camera's native HEIC representation.

**How to avoid:**
- **CLIENT-SIDE FIX (chosen):** `react-native-image-picker` 8.x supports `assetRepresentationMode: 'compatible'` which auto-converts HEIC → JPEG on iOS before returning to the JS bridge. The `asset.uri` points at a local JPEG file; `asset.type` is `image/jpeg`; FormData uploads JPEG bytes; server's MIME allowlist `['image/jpeg', 'image/png', 'image/webp']` accepts them.
- **DOCUMENT EXPLICITLY in the picker invocation:** `ImagePicker.launchImageLibrary({ mediaType: 'mixed', selectionLimit: 0, assetRepresentationMode: 'compatible', includeBase64: false }, callback)`.
- **DO NOT include `image/heic`/`image/heif` in the server allowlist** — explicit rejection signals the conversion contract.

**Warning signs:** Mod sees "Invalid file type" toast after picking iPhone photos but uploads succeed for camera-roll JPEGs. (Diagnostic: log `req.files[i].mimetype` server-side; if `application/octet-stream`, picker config is wrong.)

`[CITED: react-native-image-picker README — assetRepresentationMode option, version 8.0.0 release Feb 2025]`

### Pitfall 2: Stale Property doc fetched BEFORE MEDIA_REQUIRED check, photo uploaded between fetch and approve

**What goes wrong:** Mod taps "Save photos" → upload completes → mod taps "Approve & publish" almost simultaneously with another mod doing the same; the /approve route fetches the listing for the MEDIA_REQUIRED check and sees `media.photos.length === 0` (the upload's atomic update hasn't replicated to the read replica or the fetch happened on a slightly stale snapshot) — returns 400 `MEDIA_REQUIRED` even though photos exist.

**Why it happens:** The MEDIA_REQUIRED check inserted in /approve handler is fetch-then-check (D-09 mandates BEFORE the atomic findOneAndUpdate). Between the fetch and the update, state can change. Acceptable because the atomic update itself is race-safe — the failure mode is a false negative (mod sees a 400 they shouldn't).

**How to avoid:**
- **Acceptable failure mode:** retry — mod re-taps Approve, the second fetch sees the updated `media.photos`, gate passes. Documented in CONTEXT.md `<specifics>` MEDIA_REQUIRED check shape.
- **Optimization (NOT in Phase 3 scope):** combine MEDIA_REQUIRED into the atomic filter: `findOneAndUpdate({ _id, status: 'pending', 'media.photos.0': { $exists: true } }, { $set: { status: 'live', ... } })`. If the doc doesn't have at least one photo, the filter doesn't match, returns null → 409 `ALREADY_MODERATED`. Loses the distinction between "no photos" and "concurrent moderation" — D-09 explicitly chose the fetch+check path for clarity. Honor D-09.
- **Test the false-negative case:** supertest case where /approve is called immediately after a sentinel POST media; assert that the second /approve succeeds.

**Warning signs:** Mods report intermittent "Add at least one photo" errors after they just uploaded photos. (Diagnostic: ModerationLog has a `media-upload` row immediately preceding the failed `approve` attempt.)

### Pitfall 3: Multer's `limits.files` total count includes both `photos` and `videos` field arrays — over-cap kills the WHOLE request

**What goes wrong:** `multer.array('photos', 40)` AND `multer.array('videos', 5)` on the same handler both share a single `limits.files` cap. If you set `limits.files: 45`, multer counts the SUM across all field arrays; user picks 40 photos + 6 videos and ALL fields are rejected (LIMIT_FILE_COUNT) — including the photos.

**Why it happens:** multer's documentation: `limits.files` is "the maximum number of file fields" (across all fields combined).

**How to avoid:**
- Use `upload.fields([{ name: 'photos', maxCount: 40 }, { name: 'videos', maxCount: 5 }])` instead of stacking two `array()` calls. The per-field `maxCount` enforces independently; `limits.files` becomes the absolute ceiling (e.g., 45).
- `limits.fileSize: 25 * 1024 * 1024` (25MB/file) — applies to each individual file independently of count.
- Total request payload cap is enforced by Express body parser AND any upstream proxy (Railway has no public hard limit but practical limits exist).

**Warning signs:** All-or-nothing upload failures with `MulterError: LIMIT_FILE_COUNT`. (Diagnostic: log `error.code` in the handler's catch block.)

`[CITED: multer README — https://github.com/expressjs/multer]`

### Pitfall 4: `pointerEvents` deprecated as a prop in RN 0.84 — must be in style

**What goes wrong:** Adding the new MediaCurationScreen overlay mount in App.tsx with `<View pointerEvents={isOpen ? 'auto' : 'none'}>` triggers a deprecation warning AND fails to gate touches on Fabric.

**How to avoid:** Use the style form, per CONVENTIONS.md "Keep-alive and overlay screens" §:

```typescript
<View style={[fullScreenOverlayWrap, { pointerEvents: isOpen ? 'auto' : 'none' }]}>
```

Per CONVENTIONS.md: "On adding a new full-screen overlay: add the overlay's visibility flag to the OVERLAY_FLAGS array in App.tsx so `hideMainStackUnderOverlay` keeps working. Review checklist item."

`[VERIFIED: read of /Users/beckmaldinVL/development/mobileApps/JayTap/.planning/codebase/CONVENTIONS.md lines 261-284]`

### Pitfall 5: Approve button stays enabled after a mod uploads + concurrent mod deletes the only photo

**What goes wrong:** Mod A uploads photo → MediaCurationScreen state shows 1 photo → Approve button enables. Mod B (different device) deletes that same photo. Mod A taps Approve → server returns 400 MEDIA_REQUIRED → Mod A confused.

**Why it happens:** Client-side `media.photos.length > 0` check is per-device snapshot; doesn't poll for concurrent changes.

**How to avoid:**
- **Acceptable:** Server is the trust boundary — the 400 surfaces correctly. Map the 400 to a toast: "Another moderator removed all photos — please re-add."
- **Belt-and-suspenders (NOT D-12 scope):** WebSocket push on Property.media changes — out of scope for Phase 3. If multi-mod concurrent curation becomes a real workflow (it isn't — 1-2 person team), revisit.
- **Test:** RTL component test simulates a 400 response after Approve tap; assert toast surfaces.

### Pitfall 6: `multer.MulterError` code names vs. `MEDIA_INVALID_TYPE` custom code

**What goes wrong:** multer's error pipeline emits `LIMIT_FILE_COUNT`, `LIMIT_FILE_SIZE`, `LIMIT_UNEXPECTED_FILE`, etc. — each with a different `error.code`. The `fileFilter` rejection signals via `cb(new Error(...), false)`, and that Error's `code` field is unset by default. Without explicit `err.code = 'MEDIA_INVALID_TYPE'`, the catch block can't distinguish "wrong MIME" from "too many files."

**How to avoid:** In `fileFilter`, explicitly set `err.code = 'MEDIA_INVALID_TYPE'` before `cb(err, false)`. In the route's catch block, switch on `error.code` and map:

```javascript
if (err.code === 'MEDIA_INVALID_TYPE') return res.status(400).json({ code: 'MEDIA_INVALID_TYPE', message: '...' });
if (err.code === 'LIMIT_FILE_COUNT') return res.status(400).json({ code: 'MEDIA_TOO_MANY_FILES', message: '...' });
if (err.code === 'LIMIT_FILE_SIZE')  return res.status(400).json({ code: 'MEDIA_FILE_TOO_LARGE', message: '...' });
```

Test each branch in supertest cases.

### Pitfall 7: ModerationLog's `before`/`after` count diffs become misleading when delete is also `'media-upload'`

**What goes wrong:** Discretion #8 chose to reuse `'media-upload'` for DELETE (no enum churn). Operators reading the audit log see `action: 'media-upload'` with `after.media.photos.length: 4` and `before.media.photos.length: 5` — looks like a regression.

**How to avoid:**
- The diff direction makes intent unambiguous: `after < before` = delete; `after > before` = upload. Document this in the ModerationLog model's JSDoc comment.
- Alternative: add a `'media-delete'` enum value (8 enum values vs. 7) for forensic clarity. Recommend NOT — keeps enum churn minimal; count-only diff is unambiguous.
- Forensic detail (full URL list) is a Phase 5+ concern.

### Pitfall 8: `nvm use 24` forgotten on backend — `jose@6` ESM-only fails

**What goes wrong:** Operator runs `npm test` in JayTap-services without `nvm use 24` → Node v20 default → `jose@6` ESM-only import fails with cryptic "ERR_PACKAGE_PATH_NOT_EXPORTED" or similar.

**How to avoid:** All operator runbook entries for Phase 3 backend ops MUST start with `nvm use 24`. Memory `backend-node-version.md`. Phase 5 release runbook should re-document.

## Code Examples

Verified patterns from official sources + this repo:

### Example 1: New endpoint POST /api/moderation/listings/:id/media

```javascript
// src/routes/moderationRoutes.js — addition after existing approve/reject/edit-on-behalf
const { makeUploader, PHOTO_MIMES, VIDEO_MIMES } = require('../middleware/s3Upload');

const mediaUpload = makeUploader({
  // Combined allowlist — fileFilter checks against the union; per-field count is enforced by upload.fields()
  allowedMimes: new Set([...PHOTO_MIMES, ...VIDEO_MIMES]),
  fileSizeBytes: 25 * 1024 * 1024,  // 25MB/file
  totalFiles: 45,                    // hard ceiling (40 photos + 5 videos)
});

router.post(
  '/listings/:id/media',
  // Already-mounted: verifyFirebaseToken + requireMinRole('moderator') via router.use() at line 57
  mediaUpload.fields([
    { name: 'photos', maxCount: 40 },
    { name: 'videos', maxCount: 5 },
  ]),
  async (req, res, next) => {
    try {
      const photoUrls = (req.files?.photos || []).map(f => f.location);
      const videoUrls = (req.files?.videos || []).map(f => f.location);
      const tourUrlRaw = req.body?.tourUrl;

      // Tour URL validation (D-08 — generic https:// only; no Matterport allowlist)
      let tourUrl;
      if (typeof tourUrlRaw === 'string' && tourUrlRaw.length > 0) {
        try {
          const u = new URL(tourUrlRaw);
          if (u.protocol !== 'https:') throw new Error('non-https');
          tourUrl = tourUrlRaw;
        } catch {
          return res.status(400).json({ code: 'MEDIA_INVALID_TOUR_URL', message: 'tourUrl must be a valid https:// URL' });
        }
      }

      // No-op guard — at least one of photos/videos/tourUrl must be present
      if (!photoUrls.length && !videoUrls.length && tourUrl === undefined) {
        return res.status(400).json({ code: 'MEDIA_NO_OP', message: 'Provide at least one photo, video, or tourUrl' });
      }

      // Capture before-state for ModerationLog count-only diff
      const beforeDoc = await Property.findById(req.params.id, { media: 1 }).lean();
      if (!beforeDoc) return res.status(404).json({ message: 'Property not found' });

      const update = {};
      if (photoUrls.length || videoUrls.length) {
        update.$push = {};
        if (photoUrls.length) update.$push['media.photos'] = { $each: photoUrls };
        if (videoUrls.length) update.$push['media.videos'] = { $each: videoUrls };
      }
      if (tourUrl !== undefined) update.$set = { 'media.tourUrl': tourUrl };

      // Race-safe append — filter on status to mirror M2 atomic-update pattern
      const result = await Property.findOneAndUpdate(
        { _id: req.params.id, status: { $in: ['pending', 'rejected'] } },
        update,
        { new: true }
      );
      if (!result) {
        return res.status(409).json({ code: 'ALREADY_MODERATED', message: 'Listing is no longer in a state that accepts media curation.' });
      }

      // Audit log — ALWAYS sourced from req.firebaseUid (D-15 anti-spoofing)
      try {
        await ModerationLog.create({
          actorUid: req.firebaseUid,    // NEVER req.body / req.headers
          action: 'media-upload',
          targetType: 'property',
          targetId: result._id,
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
          at: new Date(),
        });
      } catch (auditErr) {
        // Orphan-tolerant audit pattern (Phase 1 D-10) — don't fail the request on audit miss
        console.error(JSON.stringify({
          evt: 'moderation_audit_orphan',
          action: 'media-upload',
          targetId: String(result._id),
          actorUid: req.firebaseUid,
          err: auditErr.message,
        }));
      }
      return res.json(result);
    } catch (err) {
      // Multer error mapping
      if (err.code === 'MEDIA_INVALID_TYPE') {
        return res.status(400).json({ code: 'MEDIA_INVALID_TYPE', message: 'File type not allowed' });
      }
      if (err.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({ code: 'MEDIA_TOO_MANY_FILES', message: 'Too many files' });
      }
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ code: 'MEDIA_FILE_TOO_LARGE', message: 'File exceeds 25MB' });
      }
      next(err);
    }
  }
);
// Source: composition of existing moderationRoutes.js patterns +
//         multer.fields() docs (https://github.com/expressjs/multer)
//         + Mongoose findOneAndUpdate (https://mongoosejs.com/docs/tutorials/findoneandupdate.html)
```

### Example 2: MEDIA_REQUIRED gate at /approve (D-09)

```javascript
// In src/routes/moderationRoutes.js — modification at /approve (current line 94)
router.post('/properties/:id/approve', async (req, res) => {
  try {
    // D-09 — MEDIA_REQUIRED gate BEFORE the atomic state transition.
    // Fetch+check is NOT race-safe with concurrent media uploads; worst case is a false-
    // negative 400 (mod re-taps Approve and second attempt succeeds). Acceptable per CONTEXT.md.
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
  }
});
```

### Example 3: RN client — MediaCurationScreen photo picker invocation

```typescript
// src/screens/MediaCurationScreen.tsx (excerpt)
import * as ImagePicker from 'react-native-image-picker';

const handlePickMedia = useCallback(() => {
  if (!ImagePicker || !ImagePicker.launchImageLibrary) {
    Alert.alert(t('common.error'), t('moderation.mediaCuration.pickerUnavailable'));
    return;
  }
  ImagePicker.launchImageLibrary(
    {
      mediaType: 'mixed',                       // photos AND videos in one picker
      selectionLimit: 0,                         // unlimited (iOS 14+/Android 13+)
      assetRepresentationMode: 'compatible',     // HEIC → JPEG on-device (Pitfall 1)
      quality: 0.85,
      includeBase64: false,                      // FormData uploads URI, not base64
    },
    (response) => {
      if (response.didCancel) return;
      if (response.errorMessage) {
        Alert.alert(t('common.error'), response.errorMessage);
        return;
      }
      const assets = response.assets || [];
      // Split assets into photos/videos by mimetype
      const photos = assets.filter(a => a.type?.startsWith('image/'));
      const videos = assets.filter(a => a.type?.startsWith('video/'));
      setPendingPhotos(prev => [...prev, ...photos]);
      setPendingVideos(prev => [...prev, ...videos]);
    }
  );
}, [t]);

// Save photos handler — POSTs FormData to backend
const handleSavePhotos = useCallback(async () => {
  const formData = new FormData();
  pendingPhotos.forEach((p, i) => {
    formData.append('photos', {
      uri: p.uri,
      type: p.type || 'image/jpeg',
      name: p.fileName || `photo-${Date.now()}-${i}.jpg`,
    } as any);
  });
  pendingVideos.forEach((v, i) => {
    formData.append('videos', {
      uri: v.uri,
      type: v.type || 'video/mp4',
      name: v.fileName || `video-${Date.now()}-${i}.mp4`,
    } as any);
  });
  if (tourUrl) formData.append('tourUrl', tourUrl);

  // apiClient.ts auto-detects FormData and sets Content-Type with boundary
  const response = await apiClient.post(`/moderation/listings/${listingId}/media`, formData);
  // ... handle response ...
}, [pendingPhotos, pendingVideos, tourUrl, listingId]);
// Source: existing src/screens/LandlordApplicationScreen.tsx:114 picker invocation
//         + src/services/LandlordApplicationService.ts:36 FormData pattern (this repo)
```

`[VERIFIED: read of /Users/beckmaldinVL/development/mobileApps/JayTap/src/screens/LandlordApplicationScreen.tsx lines 109-132 + src/services/LandlordApplicationService.ts lines 36-48]`

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| User-side multer + file upload at listing creation | User submits metadata only; mod uploads media post-submission | Phase 3 (this) | Eliminates the AWS IAM "user" role attack surface — even though no user has personal S3 credentials, the API surface that mapped HTTP request → S3 PutObject is gone. |
| Server-side HEIC processing (`sharp`) | Client-side `assetRepresentationMode: 'compatible'` | RN-image-picker 8.0.0 (Feb 2025) | Removes server CPU cost; bytes uploaded are already JPEG. |
| `multer` v1 (still active LTS) | (no migration) | — | `multer` v2 has not been declared GA as of 2026; v1.4.5-lts is the recommended pin. `[VERIFIED: npm registry — package.json `^1.4.5-lts.1`]` |
| AWS SDK v2 (`aws-sdk`) | AWS SDK v3 (`@aws-sdk/client-s3`) | Phase 1+ (already migrated) | Modular imports; tree-shakeable; v2 deprecated by AWS in 2024. `[VERIFIED: backend package.json:21]` |
| `multer.fileFilter` rejection via `cb(null, false)` (silent skip) | `cb(err, false)` with `err.code` set (proper 400 with code) | This phase | Clearer client error mapping; aligns with M2 reasonCode/error-code idiom. |

**Deprecated/outdated:**
- `pointerEvents` as a prop (vs. style) — RN 0.84 deprecation; CONVENTIONS.md says use style form.
- `react-native-image-picker` < 8.0.0 — pre-HEIC-conversion era; project pins `^8.2.1` so this is non-applicable.

## Assumptions Log

> Claims tagged `[ASSUMED]` — needing user confirmation before becoming locked decisions.

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Railway has no documented hard ingress limit at the platform level (depends on container's Express/multer config). The chosen 45MB total / 25MB per file is conservative based on typical mobile-photo file sizes (~3-5MB JPEG, ~5-15MB MP4 short videos). | §Discretion #6 + Pattern 1 | If Railway DOES have an undocumented edge proxy cap (e.g., 10MB), uploads will 413 at the proxy before reaching the app. Mitigation: test by uploading a 30MB file in Phase 3 supertest as a manual smoke; add `req.on('aborted', ...)` handler to detect early termination. |
| A2 | iOS Photos picker honors `selectionLimit: 0` only on iOS ≥14; Android Photo Picker honors it only on Android ≥13. Older devices fall back to `selectionLimit: 1` per the README. M2 manual QA on iPhone 15 Pro Max + Moto G XT2513V both support unlimited selection. | §Pattern 4 + Code Example 3 | If team supports older devices (not currently the case per Phase 5 REL-03 device matrix), some mods can't bulk-upload. Mitigation: pick a high finite limit like 20 if older device support emerges. |
| A3 | `assetRepresentationMode: 'compatible'` reliably converts HEIC → JPEG on iOS in 8.x. Bug #2052 in upstream notes that with `quality: 1`, conversion may NOT happen. Picker invocation uses `quality: 0.85` to avoid this edge. | §Pitfall 1 + Code Example 3 | If mod has full-quality HEIC files, the upload may carry `image/heic` and get rejected at server fileFilter. Mitigation: server returns `MEDIA_INVALID_TYPE` with localized message asking to retry; mod re-picks with the same picker (which by then would convert). |
| A4 | Mods always tap "Save photos" before tapping "Approve & publish" (D-11 two-step UX) — no auto-publish race. | §Pitfall 5 | If a future "auto-publish on save" toggle is added (rejected per D-11 deferred), race re-emerges. Out of scope. |
| A5 | The 26-key i18n estimate for Phase 3 (banner 3 + chips 3 + screen 15 + errors 5) lands within the 20-30 MEDIA-09 envelope. Final count emerges in plan-phase. | §Phase Requirements (MEDIA-09) | If actual count exceeds 30, ROADMAP envelope is exceeded — note in plan-phase deliverable; doesn't change phase shape. |

## Open Questions

1. **Should the "Has media" filter chip count tour URL alone as media-present, or only photos?**
   - What we know: D-02 specifies 3 chips: All pending / Needs media / Has media. CONTEXT.md doesn't specify the predicate exactly.
   - What's unclear: A listing with only `tourUrl` set but `photos.length === 0` cannot be approved (MEDIA_REQUIRED fails). So categorically it's "needs media" from approval-eligibility view, but UI-wise the listing has *some* media.
   - Recommendation: "Needs media" = `media.photos.length === 0` (matches MEDIA_REQUIRED gate). "Has media" = `media.photos.length > 0` (binary complement). tourUrl/videos don't gate either chip — keeps the filter aligned with the approval gate. Document inline in PLAN.md.

2. **Does the mod's `<Gated>` guard need to be on MediaCurationScreen mount itself, or only on App.tsx state-flag transition?**
   - What we know: Phase 2 ContextualListingFlow uses a `<Gated>` check on the mount conditional; `useRole()` resolves before any deep-link can mount the overlay.
   - What's unclear: The CONTEXT.md `<decisions>` Claude's Discretion mentions "Plain user accidentally hitting a deep-link should never see the screen."
   - Recommendation: Both — `<Gated action="approveListings">` (existing M2 capability) gates the mount in App.tsx AND inside the screen as belt-and-suspenders. Cheap; mirrors existing patterns.

3. **Does Phase 3 also need a sentinel script for `actorUid` source? (D-15 grep gate)**
   - What we know: D-15 specifies the regex; D-16 lists "Anti-spoofing grep gate (`scripts/check-no-actoruid-spoofing.sh` or equivalent) — new sentinel script run by `npm test` or as a CI gate."
   - What's unclear: The exact script lifecycle — does the script live in JayTap-services repo (backend) since it greps backend code? Or in the RN client repo for parity with `scripts/check-i18n-parity.sh`?
   - Recommendation: Backend repo, at `JayTap-services/scripts/check-no-actoruid-spoofing.sh`. The directory needs to be CREATED — backend has no `scripts/` directory yet (only `src/scripts/` for migrations). Wire to `package.json` `test` script via `&&`. Pattern source: M1 RN-client `scripts/check-land-removed.sh` semantics ported to backend bash directory.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node ≥22.12 | Backend Phase 3 work (jose@6 ESM-only) | ✓ | v24 via `nvm use 24` | — (memory `backend-node-version.md` documents) |
| Node ≥20 (RN client) | Metro bundler | ✓ | default v20.19.1 | — |
| MongoDB Atlas | Backend integration tests + production deploy | ✓ | M0/M2 cluster (M2 baseline) | mongodb-memory-server for test isolation (already in devDeps) |
| AWS S3 — `jaytap-properties` bucket + `jaytap-prod-s3` IAM user | New POST media endpoint | ✓ | created 2026-04-29 (memory `aws-iam-jaytap-prod-s3.md`) | — |
| Railway (backend deploy) | Production endpoint exposure | ✓ | M2 SHA `2fb5639` baseline | — |
| `react-native-image-picker@^8.2.1` | RN MediaCurationScreen | ✓ | 8.2.1 (already installed) | — |
| `multer@^1.4.5-lts.1` + `multer-s3@^3.0.1` + `@aws-sdk/client-s3@^3.806.0` | New backend endpoints | ✓ | already installed | — |
| `iPhone 15 Pro Max + Moto G XT2513V` (manual QA) | Phase 5 REL-03 (NOT Phase 3) | ✓ | M2 device matrix carries forward | — |

**Missing dependencies with no fallback:** None.

**Missing dependencies with fallback:** None.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Backend framework | Jest 29.7.0 + supertest 7.1.4 + mongodb-memory-server 9.5.0 |
| Backend config file | `JayTap-services/jest.config.cjs` |
| Backend quick run | `cd JayTap-services && nvm use 24 && npm run test:quick` (verifyFirebaseToken-only) |
| Backend full suite | `cd JayTap-services && nvm use 24 && npm test` |
| RN client framework | Jest 29.6.3 (preset `react-native`) + react-test-renderer 19.2.3 |
| RN client config file | `JayTap/jest.config.js` |
| RN client quick run | `cd JayTap && npx jest <pattern>` |
| RN client full suite | `cd JayTap && npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| MEDIA-01 | New 6-step flow has zero media affordance | sentinel + RTL | `bash scripts/check-create-listing-screen-removed.sh` (Phase 2 sentinel — preserved) | ✅ exists |
| MEDIA-01 | propertyRoutes.js has zero multer references | sentinel | `bash JayTap-services/scripts/check-property-routes-media-stripped.sh` (NEW) | ❌ Wave 0 (NEW script + new directory `JayTap-services/scripts/`) |
| MEDIA-02 | POST /api/properties ignores `media.*` body keys | supertest | `cd JayTap-services && nvm use 24 && npx jest propertyRoutes -t "ignores client-supplied media body"` | ❌ Wave 0 (extend `propertyRoutes.test.js`) |
| MEDIA-03 | MediaCurationScreen renders + photo picker invocation | RTL smoke | `cd JayTap && npx jest MediaCurationScreen` | ❌ Wave 0 (NEW `src/screens/__tests__/MediaCurationScreen.test.tsx` — but `src/screens/__tests__/` directory doesn't exist; create it) |
| MEDIA-04 | POST /api/moderation/listings/:id/media happy path (photos + videos + tourUrl) | supertest | `cd JayTap-services && nvm use 24 && npx jest moderationRoutes -t "POST .*media.*happy"` | ❌ Wave 0 (extend `moderationRoutes.test.js`) |
| MEDIA-04 | POST media — 401 (no token), 403 (plain user), 400 (invalid MIME), 400 (invalid tourUrl), 409 (race) | supertest | (5 sub-cases under same describe block) | ❌ Wave 0 |
| MEDIA-04 | DELETE /api/moderation/listings/:id/media?url=... happy path + concurrent race | supertest | `cd JayTap-services && nvm use 24 && npx jest moderationRoutes -t "DELETE .*media"` | ❌ Wave 0 |
| MEDIA-04 | ModerationLog row written with `action: 'media-upload'` + `actorUid` from token sub | supertest | `cd JayTap-services && nvm use 24 && npx jest moderationRoutes -t "media-upload audit"` | ❌ Wave 0 |
| MEDIA-05 | Anti-spoofing grep gate exits 0 (zero matches) | sentinel | `bash JayTap-services/scripts/check-no-actoruid-spoofing.sh` (NEW) | ❌ Wave 0 (NEW script) |
| MEDIA-06 | Filter chip "Needs media" filters listings with photos.length === 0 | RTL | `cd JayTap && npx jest ModerationQueueScreen` | ⚠️ partial — extend existing test (file may exist) |
| MEDIA-07 | MEDIA_REQUIRED returns 400 at /approve when photos empty | supertest | `cd JayTap-services && nvm use 24 && npx jest moderationRoutes -t "MEDIA_REQUIRED"` | ❌ Wave 0 |
| MEDIA-07 | MEDIA_REQUIRED returns 400 at edit-on-behalf flip-to-live | supertest | (same describe block) | ❌ Wave 0 |
| MEDIA-07 | Approve button disabled on 3 surfaces when photos empty | RTL | `cd JayTap && npx jest -t "Approve button disabled"` | ❌ Wave 0 (extend MediaCurationScreen + ModerationQueueScreen + PropertyDetailsScreen tests) |
| MEDIA-08 | Legacy listing's `media.photos[]` survives Phase 3 deploy verbatim | supertest (regression) | `cd JayTap-services && nvm use 24 && npx jest -t "MEDIA-08 legacy preservation"` | ❌ Wave 0 |
| MEDIA-09 | EN+RU parity for new keys | sentinel | `bash JayTap/scripts/check-i18n-parity.sh` (existing) | ✅ exists |

### Sampling Rate

- **Per task commit:** RN client smoke (`npx jest <changed-area>`) + backend quick (`nvm use 24 && npm run test:quick`)
- **Per wave merge:** Both full suites — `cd JayTap-services && nvm use 24 && npm test` AND `cd JayTap && npm test`
- **Phase gate:** All sentinels green AND both full suites green BEFORE `/gsd-verify-work` paired-gate run
- **Paired-gate (mandatory per memory `gsd-verifier-misses-regressions.md`):** verifier + reviewer BOTH run after `/gsd-execute-phase`. Verifier checks goal-backward; reviewer checks downstream regressions. Both must approve before phase close.

### Wave 0 Gaps

- [ ] `JayTap-services/scripts/` (NEW directory — does NOT exist; backend currently has no top-level `scripts/`)
- [ ] `JayTap-services/scripts/check-property-routes-media-stripped.sh` (NEW sentinel)
- [ ] `JayTap-services/scripts/check-no-actoruid-spoofing.sh` (NEW sentinel — D-15)
- [ ] `JayTap-services/package.json` `test` script (extend to chain sentinels: `"test": "<sentinels> && jest --config jest.config.cjs"` — planner picks; CI gate vs. test gate)
- [ ] `JayTap-services/src/middleware/s3Upload.js` (NEW shared module — Discretion #3)
- [ ] `JayTap-services/src/__tests__/moderationRoutes.test.js` extension (~9 new test groups)
- [ ] `JayTap-services/src/__tests__/propertyRoutes.test.js` extension (multer-stripped behavior assertion)
- [ ] `JayTap/src/screens/__tests__/` (NEW directory — does NOT exist; current pattern is co-located but no screens have tests; planner picks structure)
- [ ] `JayTap/src/screens/__tests__/MediaCurationScreen.test.tsx` (NEW RTL smoke)
- [ ] `JayTap/src/screens/__tests__/ModerationQueueScreen.test.tsx` (NEW or extend existing) — filter chip predicate tests

*(Manual physical-device QA matrix walks for the mod media curation flow are deferred to Phase 5 REL-03 per ROADMAP — that's expected, not a gap.)*

## Discretion Resolutions

### Discretion #1 — Mongoose tourUrl URL validator: **YES, add belt-and-suspenders**

**Resolution:** Add a Mongoose-level URL-format validator on `Property.media.tourUrl`:

```javascript
// In src/models/Property.js — modification at media.tourUrl declaration (current line 83)
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

**Rationale:** Cheap (10 LOC); catches direct DB writes that bypass the route layer (e.g., a future migration script or admin-shell write). Mongoose validators DO run on `findOneAndUpdate` when `runValidators: true` is set; for safety, set this in the new POST media handler's update options. Doesn't break Phase 1 D-12 (`tours[].url` migration writes only valid https:// URLs from M1+M2 mock data). `[CITED: https://mongoosejs.com/docs/validation.html — "Validators are not run on findOneAndUpdate by default"]`

### Discretion #2 — DELETE addressing scheme: **by URL** (`?url=...&kind=photo|video`)

**Resolution:** Use query string `?url=https://...&kind=photo|video` (URL-encoded). Backend uses `$pull: { 'media.photos': urlValue }` for photos, `$pull: { 'media.videos': urlValue }` for videos.

**Rationale:** Concurrency-stable (idempotent — `$pull` of non-member is silent). No schema change vs. subdoc-`_id`. URL exact-match concern (encoding sensitivity) is mitigated by URL-encoding both client-side (`encodeURIComponent`) and server-side decoding via Express's default query parser. See Pattern 3 above.

**Alternative considered:** Path param `/media/:assetIndex` — REJECTED (race-prone). Subdoc `_id` — REJECTED (Phase 1 D-15 schema change unjustified).

### Discretion #3 — S3 client shared module: **YES, extract to `src/middleware/s3Upload.js`**

**Resolution:** Extract `S3Client` + `multer-s3` config from `propertyRoutes.js:17-43` and `moderationRoutes.js:27-51` into `src/middleware/s3Upload.js`. New module exports a factory `makeUploader({ allowedMimes, fileSizeBytes, totalFiles })`. The two existing callsites + the new POST media endpoint consume the factory. See Pattern 1 above.

**Rationale:** DRY — three callsites soon to be three configurations of the same plumbing. Centralizes env-var reads (`AWS_BUCKET_NAME`, `AWS_REGION`, etc.). Improves testability — tests mock the factory output rather than the S3Client directly. Pre-strip extraction (lands BEFORE D-13's multer strip in propertyRoutes) reduces churn in the strip commit.

**Sequencing recommendation:** Extract first → propertyRoutes + moderationRoutes both use the shared module → THEN strip propertyRoutes. Reduces the strip commit's diff.

### Discretion #4 — RN file picker library: **`react-native-image-picker@^8.2.1` (ALREADY INSTALLED)**

**Resolution:** No new install required. The package is at `package.json:22` and already in use at `src/screens/LandlordApplicationScreen.tsx:18`. Reuse the same import + invocation pattern.

**Verification:**
- ✅ Compatible with RN 0.84 New Architecture (Fabric/Hermes) — confirmed by Phase 4.5's working LandlordApplicationScreen on iPhone 15 Pro Max + Moto G XT2513V.
- ✅ Compatible with `reanimated@4.3.0` + `worklets@0.8.1` — same baseline as M2 ship.
- ✅ Supports multi-select (`selectionLimit: 0` on iOS ≥14 + Android ≥13).
- ✅ Supports HEIC→JPEG conversion (`assetRepresentationMode: 'compatible'`, version ≥8.0.0).
- ✅ Supports `mediaType: 'mixed'` (photos + videos in one picker).

**Permission keys needed in `Info.plist` (verify present from M1+M2):**
- `NSPhotoLibraryUsageDescription` — for photo library access
- `NSCameraUsageDescription` — for camera capture
- `NSMicrophoneUsageDescription` — for video capture (only if launchCamera + video used; library mode doesn't need mic)

**Android manifest permissions (verify present from M1+M2 + Phase 4.5):**
- M3+ uses scoped Photo Picker on Android 13+ — no permission needed for picker itself
- For Android <13 fallback: `READ_MEDIA_IMAGES` + `READ_MEDIA_VIDEO` (required if min SDK supports older versions)

`[CITED: react-native-image-picker README — npm 8.2.1]`

**Install gate steps:** None. Step that would have been needed:
- `npm install react-native-image-picker` — already done.
- `cd ios && pod install` — done at M1 / M2 ship.

### Discretion #5 — MIME-type allowlist: **`image/jpeg|png|webp` + `video/mp4|quicktime` ONLY (reject HEIC server-side)**

**Resolution:**

```javascript
// In src/middleware/s3Upload.js
const PHOTO_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const VIDEO_MIMES = new Set(['video/mp4', 'video/quicktime']);
```

**Rationale:**
- HEIC/HEIF NOT in allowlist — client-side conversion via `assetRepresentationMode: 'compatible'` ensures uploaded bytes are JPEG. Reduces server complexity.
- `image/x-m4v` per CONTEXT.md `<specifics>` REMOVED — `m4v` is iOS-specific, rare; if it appears, mod converts via Files app first. Reduces allowlist surface.
- `image/heic` / `image/heif` explicitly absent — server returns `MEDIA_INVALID_TYPE` if a HEIC slips through (means the client picker config is wrong; surfaces as a regression rather than silent server-side conversion).
- iPhone Photos picker by default returns HEIC (iOS 11+ default capture format), but with `assetRepresentationMode: 'compatible'` it returns the JPEG-converted version. If the conversion fails (Pitfall 1 — iOS bug at `quality: 1`), upload returns 400 — actionable error.
- Android camera default returns JPEG; mp4 for video. Already covered.

**Pitfalls:** Pitfall 1 above — Pre-RN-image-picker-8.0.0 had no built-in conversion; project pin at `^8.2.1` covers this.

`[CITED: https://github.com/react-native-image-picker/react-native-image-picker — assetRepresentationMode docs + version 8.0.0 release notes]`

### Discretion #6 — Total per-request payload cap: **45MB total, 25MB per file**

**Resolution:**

```javascript
limits: {
  fileSize: 25 * 1024 * 1024,  // 25MB per individual file
  files: 45,                    // hard ceiling — sum across all field arrays (40 photos + 5 videos)
}
```

**Express body parser cap (set at app level):**

```javascript
app.use(express.json({ limit: '50mb' }));   // existing limit; verify present
app.use(express.urlencoded({ limit: '50mb', extended: true }));
```

**Rationale:**
- Railway has NO documented hard ingress limit at the platform edge per official docs research (search results 2026-05-06 — Railway help station discusses nginx limits in user-config Nixpacks contexts only). Practical limits emerge from Express body parser + nginx (if configured) + the Express server's socket buffer.
- 25MB/file accommodates: typical iPhone JPEG 3-5MB, 4K iPhone short video (10-20MB for 30s @ 1080p), webp screenshot.
- 45 files total: 40 photos + 5 videos cap from D-07 verbatim.
- 45MB total worst case (uncommon — would mean 45 files at 1MB each OR 1 file at 45MB; both within file-size cap).

**Test in supertest:** Upload a 25.5MB single photo — assert 400 with `code: 'MEDIA_FILE_TOO_LARGE'`. Upload 41 photos in single request — assert 400 with `code: 'MEDIA_TOO_MANY_FILES'`.

**Open assumption:** A1 above — if Railway has an undocumented 10MB edge cap, this needs adjusting. Plan validation: include a 30MB upload smoke in supertest scenarios; document Railway-specific behavior in PLAN.md.

`[VERIFIED: web search 2026-05-06 — "Railway client_max_body_size" returns user-config nginx posts only; no platform-level documented cap]`

### Discretion #7 — `'media-upload'` ModerationLog `before/after` diff shape: **count-only**

**Resolution:**

```javascript
before: {
  'media.photos.length': 0,
  'media.videos.length': 0,
  'media.tourUrl.set':   false,
},
after: {
  'media.photos.length': 3,
  'media.videos.length': 1,
  'media.tourUrl.set':   true,
},
```

**Rationale:**
- Compact (3 keys × 2 = 6 fields per row) — aligns with M2 ModerationLog discipline ("changed-fields-only diffs" per existing comment in `ModerationLog.js`).
- Sufficient for "did this mod do their job" forensics (count goes UP = upload, count goes DOWN = delete, set flips = tour added/removed).
- Full URL list (the verbose alternative) bloats logs: 40 photos × 200-char S3 URL = 8KB per row × N moderations = visible Atlas storage hit on a paid tier.
- Forensic detail (which exact URLs) recoverable via `before/after` snapshots in version-control of the document via Atlas Compass time-travel queries (Atlas paid tier feature) OR via S3 access logs (if enabled).

**Trade-off documented:** If a future audit needs to know "which exact URL did mod-X delete?", the count-only diff loses that information. Re-evaluate at M4+ if forensic granularity becomes a requirement.

### Discretion #8 — DELETE writes ModerationLog symmetric: **YES; reuse `'media-upload'` action value**

**Resolution:** DELETE handler writes a ModerationLog row with:

```javascript
{
  actorUid: req.firebaseUid,
  action: 'media-upload',     // same enum value as POST — diff direction tells the story
  targetType: 'property',
  targetId: result._id,
  before: { 'media.photos.length': 4, 'media.videos.length': 1, 'media.tourUrl.set': true },
  after:  { 'media.photos.length': 3, 'media.videos.length': 1, 'media.tourUrl.set': true },
  at: new Date(),
}
```

**Rationale:**
- Avoid enum churn — extending from 6→7 enum values is already an audit-discipline change; 6→8 is more invasive.
- Diff direction is unambiguous: `after.media.photos.length < before.media.photos.length` = deletion happened.
- Document the convention in `ModerationLog.js` JSDoc: "media-upload covers both add and remove operations; diff direction tells the action."

**Alternative:** Add `'media-delete'` enum value. REJECTED — minor clarity gain at cost of extra enum churn + supertest update. If forensic clarity is later required (M4+), this is a trivial schema additive.

## Plan Skeleton Recommendation

Suggested 7-plan breakdown (planner is free to deviate; this is a starting point):

| # | Plan | Scope | Risk |
|---|------|-------|------|
| **03-01** | **Backend foundation: shared S3 module + Mongoose tourUrl validator + ModerationLog enum extension** | (a) NEW `src/middleware/s3Upload.js` module factory. (b) `Property.js` add tourUrl Mongoose validator (Discretion #1). (c) `ModerationLog.js` extend `action` enum with `'media-upload'`. (d) Migrate existing `propertyRoutes.js` + `moderationRoutes.js` callsites to consume the factory (NO behavior change yet — pre-strip refactor). (e) Backend supertest cases for the factory + validator. | LOW — refactor only; existing tests should still pass without edit. |
| **03-02** | **Backend: new POST + DELETE moderation media endpoints + supertest** | (a) Add `POST /api/moderation/listings/:id/media` handler (per Code Example 1). (b) Add `DELETE /api/moderation/listings/:id/media?url=...&kind=photo\|video` handler (per Pattern 3). (c) Tour URL https:// validation. (d) Audit log writes for both. (e) Supertest cases (D-16 default scope — happy path + 401/403/400/409 + count-only diff + actorUid token-derived). | MED — new endpoints; race coverage in tests. |
| **03-03** | **Backend: MEDIA_REQUIRED gate at /approve and edit-on-behalf + supertest** | (a) Pre-fetch + check at `/approve` handler (D-09). (b) Pre-check at edit-on-behalf flip path (D-10, current line ~445). (c) Supertest cases — 400 on empty photos at both surfaces; 200 on non-empty. (d) Document the false-negative race (Pitfall 2) in handler comment. | MED — touches existing M2-baseline /approve handler; race-cell test required. |
| **03-04** | **Backend: user-side multer strip + sentinel scripts** | (a) Strip `upload.array('images', 40)` from `propertyRoutes.js` POST + PUT handlers (D-13). (b) Strip `media: clientMedia` body destructure + multer file-mapping (lines 156-158, 472-491). (c) Create `JayTap-services/scripts/` directory + `check-property-routes-media-stripped.sh` sentinel (D-16). (d) Create `check-no-actoruid-spoofing.sh` sentinel (D-15). (e) Wire sentinels to npm test or CI gate. (f) Extend `propertyRoutes.test.js` to assert client multipart bodies are silently ignored (or 400, depending on Express body parser default). | MED-HIGH — atomic-break stance; verifier + reviewer paired-gate mandatory after this lands. |
| **03-05** | **RN client: MediaCurationScreen + ModerationService extension + App.tsx overlay mount** | (a) NEW `src/services/ModerationService.ts` (or extend `PropertyService.ts` — recommended NEW file) wrapping POST/DELETE media + reusing existing `apiClient`. (b) NEW `src/screens/MediaCurationScreen.tsx` (~500 LOC) — photo grid + tour URL input + Save photos + Approve & publish buttons; uses `useTheme()` tokens; EN+RU; `useRole()` belt-and-suspenders. (c) `App.tsx` add 2 state flags + overlay mount (per Pattern 4); update OVERLAY_FLAGS array. (d) NEW `src/screens/__tests__/MediaCurationScreen.test.tsx` RTL smoke. | HIGH — new screen; ImagePicker integration; FormData wiring; theme + i18n parity. |
| **03-06** | **RN client: ModerationQueueScreen filter chips + PropertyDetailsScreen banner + Approve disable** | (a) `ModerationQueueScreen.tsx` add `[All pending] [Needs media] [Has media]` chip row above Listings tab (D-02). (b) Row tap → trigger App.tsx `setIsMediaCurationOpen(true)` + `setCurrentMediaCurationListingId(row.id)`. (c) `PropertyDetailsScreen.tsx` add mod-only "needs media" banner above mod action footer (D-04). (d) `PropertyDetailsScreen.tsx` + `ModerationQueueScreen.tsx` + `MediaCurationScreen.tsx` Approve button `disabled` + i18n hint (D-12 — 3 surfaces). (e) RTL tests for chip predicate + banner render + Approve disabled state. | MED — touches 2 large screens (PropertyDetailsScreen 1680 LOC, ModerationQueueScreen 824 LOC); minimal LOC additions; verifier checks downstream regressions per memory `gsd-verifier-misses-regressions.md`. |
| **03-07** | **i18n keys + paired-gate verifier+reviewer prep** | (a) Add ~26 EN+RU keys (banner 3 + chips 3 + screen 15 + errors 5) to `src/locales/en.ts` + `ru.ts`. (b) Verify `scripts/check-i18n-parity.sh` passes. (c) Manual smoke walks DEFERRED to Phase 5 REL-03 — explicitly note in PLAN.md per CONTEXT.md `<deferred>`. (d) Run paired-gate verifier+reviewer. | LOW-MED — i18n surface; CI gate; final phase-close artifacts. |

**Sequencing rationale:**
- Plan 03-01 first (refactor, low-risk, sets foundation).
- Plan 03-02 + 03-03 add new backend endpoints + invariants — independent of strip.
- Plan 03-04 LANDS THE STRIP — single atomic-break commit; sentinel green.
- Plan 03-05 + 03-06 add client surface in parallel-able pairs; 03-05 lands the screen + service, 03-06 lands the integration points (chip + banner + disable).
- Plan 03-07 closes with i18n + paired-gate.

## Sources

### Primary (HIGH confidence — verified via tool/file-read)

- **This repo (RN client) — `/Users/beckmaldinVL/development/mobileApps/JayTap`:**
  - `package.json` — confirms `react-native-image-picker@^8.2.1` already installed; engines `node>=22.11.0`
  - `src/screens/LandlordApplicationScreen.tsx:18,109-132` — confirmed working ImagePicker invocation pattern
  - `src/services/LandlordApplicationService.ts:36-48` — confirmed FormData multipart upload pattern via `apiClient`
  - `src/services/apiClient.ts` — confirmed Bearer interceptor + 401 single-flight refresh handles new endpoint without changes
  - `App.tsx:60-78,1001-1050,1141` — confirmed overlay-mount + OVERLAY_FLAGS pattern for ContextualListingFlow + ModerationQueue (mirrored by MediaCurationScreen)
  - `.planning/codebase/CONVENTIONS.md:261-284` — keep-alive/overlay rule (style-form `pointerEvents`)
- **Backend repo — `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services`:**
  - `package.json` — confirms `multer@^1.4.5-lts.1`, `multer-s3@^3.0.1`, `@aws-sdk/client-s3@^3.806.0`, `mongoose@^9.1.6`, `jose@^6.2.3`; engines `node>=22.12.0`
  - `src/routes/propertyRoutes.js:17-43,111,156-158,344,472-491` — S3Client + multer-s3 setup; multer.array('images', 40) on POST + PUT; media body destructure to be stripped
  - `src/routes/moderationRoutes.js:1-140,445,614,680` — existing approve/reject/edit-on-behalf race-safe atomic patterns; mounts router-level `verifyFirebaseToken + requireMinRole('moderator')`
  - `src/models/Property.js:79-84` — current `media.{photos[], videos[], tourUrl}` schema; tourUrl validator to add (Discretion #1)
  - `src/models/ModerationLog.js:17-29` — current 6-value action enum; `actorUid` documentation; `before`/`after` diff convention
  - `src/middleware/verifyFirebaseToken.js:30,103,105,169` — `verifyFirebaseToken`, `requireMinRole`, `optionalAuth`, `ROLE_RANK` exports verbatim
  - `src/__tests__/moderationRoutes.test.js` — supertest pattern reference for new endpoint tests
- **Phase artifacts:**
  - `.planning/phases/03-media-flow-inversion-admin-mod-curation/03-CONTEXT.md` — D-01..D-16 locked + 8 discretion items
  - `.planning/phases/01-schema-reshape-backend-route-shape-cutover/01-CONTEXT.md` D-01, D-12, D-13, D-14, D-15 — schema mapping baselines
  - `.planning/phases/02-6-step-contextual-listing-flow-client/02-CONTEXT.md` D-13, D-15 — overlay-mount + prop-shape pattern
  - `.planning/phases/999.1-contextual-listing-flow-m3-anchor/SPEC.md` v2 — anchor SPEC §"High-Level Flow", §"Step 5", §"Suggested Data Shape"
  - `.planning/REQUIREMENTS.md` MEDIA-01..MEDIA-09 acceptance criteria

### Secondary (MEDIUM confidence — official docs / package READMEs)

- [react-native-image-picker README](https://github.com/react-native-image-picker/react-native-image-picker) — Info.plist permission keys, Android manifest, `selectionLimit: 0` semantics, `mediaType: 'mixed'`, `assetRepresentationMode: 'compatible'`
- [Mongoose findOneAndUpdate tutorial](https://mongoosejs.com/docs/tutorials/findoneandupdate.html) — atomic guarantees, `runValidators` flag
- [Mongoose validation docs](https://mongoosejs.com/docs/validation.html) — custom validators on findOneAndUpdate
- [MongoDB $pull operator](https://www.mongodb.com/docs/manual/reference/operator/update/pull/) — atomic semantics
- [multer README](https://github.com/expressjs/multer) — `fileFilter`, `limits.files`, `limits.fileSize`, `upload.fields()` per-field maxCount semantics
- [multer-s3 README](https://github.com/anacronw/multer-s3) — direct-stream-to-S3 pattern; `file.location` URL field

### Tertiary (LOW confidence — flagged for plan-phase verification)

- Railway HTTP request body size limit — **NO official docs found at platform level**; user-config nginx posts in Help Station discuss application-level Nixpacks tuning only. Assumption A1 logged. Recommend live smoke test of 30MB upload during Phase 3 supertest authoring.
- iOS HEIC `quality: 1` conversion bug (#2052 in upstream) — Pitfall 1 mitigation via `quality: 0.85`. Verify on physical iPhone in Phase 5 device QA.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — every package is verified-already-installed at pinned versions; no install gates
- Architecture: HIGH — all patterns are direct adaptations of existing repo code (S3+multer in propertyRoutes, atomic findOneAndUpdate in moderationRoutes, ImagePicker in LandlordApplicationScreen, overlay-mount in App.tsx)
- Pitfalls: HIGH — researched HEIC conversion, multer field-cap semantics, race-safety, deprecated pointerEvents prop; backed by official docs + upstream issues
- Discretion resolutions: HIGH — every resolution has explicit rationale and rejected-alternative; ready to plan against

**Research date:** 2026-05-06
**Valid until:** 2026-06-05 (30 days for stable phase; project skill patterns + dependency versions are post-M2 stable)

---

*Phase: 03-media-flow-inversion-admin-mod-curation*
*Researched: 2026-05-06 — `react-native-image-picker@^8.2.1` already installed (no NEW install gate); `multer@^1.4.5-lts.1` + `multer-s3@^3.0.1` + `@aws-sdk/client-s3@^3.806.0` already installed; phase boils down to assembly + relocation of existing patterns + 1 new screen + 2 new endpoints + 2 new sentinels + 1 new shared backend module*

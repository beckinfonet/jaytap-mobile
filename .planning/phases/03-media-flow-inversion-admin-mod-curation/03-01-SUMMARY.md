---
phase: 03-media-flow-inversion-admin-mod-curation
plan: 01
plan_id: 03-01
subsystem: backend-foundation
tags: [s3-factory, mongoose-schema, sentinels, multer-extraction, moderation-log, threat-mitigation]

dependency_graph:
  requires:
    - "Phase 1 nested media.* shape (Property.media.{photos,videos,tourUrl} already in place)"
    - "M2 ModerationLog action enum (6 values pre-extension)"
    - "Backend repo at SHA b2a785c (post Phase 2 Plan 02-01)"
  provides:
    - "src/middleware/s3Upload.js factory module — single-source S3Client + multer-s3 setup"
    - "PHOTO_MIMES + VIDEO_MIMES allowlists (Plan 03-02 dependency)"
    - "MEDIA_INVALID_TYPE multer error code (Plan 03-02 dependency)"
    - "ModerationLog.action enum value 'media-upload' (Plans 03-02 + 03-03 dependency)"
    - "Property.media.tourUrl Mongoose validator (T-05 mitigation; Plan 03-02 belt-and-suspenders)"
    - "scripts/check-no-actoruid-spoofing.sh — chained into npm test (T-01 mitigation)"
    - "scripts/check-property-routes-media-stripped.sh — armed FAIL-by-design (T-03 enforcement; Plan 03-04 flips to PASS)"
  affects:
    - "Plan 03-02 (new POST/DELETE media endpoints) — instantiates SECOND uploader from factory"
    - "Plan 03-03 (MEDIA_REQUIRED gate) — uses extended action enum + tourUrl validator"
    - "Plan 03-04 (D-13 atomic-break — multer strip from propertyRoutes) — flips media-stripped sentinel green"

tech_stack:
  added: []  # No new dependencies; multer + multer-s3 + @aws-sdk/client-s3 already in package.json
  patterns:
    - "Factory module pattern (parametric multer instances vs duplicated route-local setup)"
    - "Anti-pattern grep gate (M2 Phase 1 HF-03 reuse for actorUid)"
    - "Sentinel-armed-FAIL-then-flip pattern (M1 Phase 4 check-land-removed.sh + M3 Phase 2 check-create-listing-screen-removed.sh lineage)"
    - "Mongoose schema validator belt-and-suspenders w/ runValidators flag at update sites"

key_files:
  created:
    - "/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/middleware/s3Upload.js"
    - "/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/scripts/check-property-routes-media-stripped.sh"
    - "/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/scripts/check-no-actoruid-spoofing.sh"
  modified:
    - "/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/routes/propertyRoutes.js"
    - "/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/routes/moderationRoutes.js"
    - "/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/models/ModerationLog.js"
    - "/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/models/Property.js"
    - "/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/package.json"

decisions:
  - "Plan 03-04 will instantiate a SECOND uploader from this factory with allowedMimes: new Set([...PHOTO_MIMES, ...VIDEO_MIMES]) for the new POST media endpoint — VIDEO + PHOTO accepted, 25MB cap, 45 totalFiles per Phase 3 D-07 + Discretion #5."
  - "moderationRoutes.js dropped the multer require entirely (no MulterError typecheck site there); propertyRoutes.js retained the multer require because L216 has `error instanceof multer.MulterError` — that require is deleted by Plan 03-04 along with `upload.array(...)` callsites."
  - "ModerationLog.action enum picked 'media-upload' as a single action covering both add and remove (Discretion #8); doc comment captures the diff-direction contract for downstream auditors."
  - "Property.media.tourUrl validator placed at schema layer for belt-and-suspenders coverage of direct DB writes; Plan 03-02 will pair with route-level URL parse + `runValidators: true` on findOneAndUpdate."

metrics:
  duration: "~6 min wall-clock (3 atomic backend commits + verification)"
  completed: "2026-05-06T18:51:52Z"
  tasks: 3
  files_created: 3
  files_modified: 5
  commits: 3
  test_baseline: "219/219 backend pass (preserved verbatim through all 3 commits)"
---

# Phase 3 Plan 01: Backend Foundation — Shared S3 Factory + Schema Extensions + Sentinels

**One-liner:** Extracted duplicated `S3Client` + `multer-s3` setup into a shared `src/middleware/s3Upload.js` factory consumed by both `propertyRoutes` and `moderationRoutes`, additively extended `ModerationLog.action` enum (`'media-upload'` value), added Mongoose https-only validator on `Property.media.tourUrl`, and installed two sentinel scripts (one armed FAIL-by-design for Plan 03-04 to flip green; one armed PASS to gate the new media endpoints from Plans 03-02/03-03 against `actorUid` spoofing).

## What shipped

### 3 atomic backend commits (JayTap-services repo)

| # | Commit | Subject | Files | Insertions | Deletions |
|---|--------|---------|-------|------------|-----------|
| 1 | `239de75` | refactor(03-01): extract s3Upload factory consumed by propertyRoutes + moderationRoutes | 3 (1 new, 2 modified) | 76 | 60 |
| 2 | `a29f163` | feat(03-01): extend ModerationLog action enum + add Property.tourUrl https validator | 2 modified | 30 | 2 |
| 3 | `ae611ca` | chore(03-01): add check-property-routes-media-stripped + check-no-actoruid-spoofing sentinels | 3 (2 new, 1 modified) | 33 | 1 |

### Files created (3)

1. **`src/middleware/s3Upload.js`** — 53 LOC. Exports `{ s3, makeUploader, PHOTO_MIMES, VIDEO_MIMES }`. `PHOTO_MIMES = Set(['image/jpeg', 'image/png', 'image/webp'])` (no HEIC server-side per Pitfall 1 — RN picker converts client-side). `VIDEO_MIMES = Set(['video/mp4', 'video/quicktime'])`. `makeUploader({ allowedMimes, fileSizeBytes, totalFiles })` returns a multer instance with multer-s3 storage + a fileFilter that sets `err.code = 'MEDIA_INVALID_TYPE'` on rejection (Plan 03-02 maps this to a stable client-facing error code).
2. **`scripts/check-property-routes-media-stripped.sh`** — 16 LOC. `grep -nE "upload\.array|multer|multerS3" src/routes/propertyRoutes.js` exits 1 if any matches found. **Currently FAILS BY DESIGN** (multer is still in propertyRoutes; Task 1 only extracted the factory).
3. **`scripts/check-no-actoruid-spoofing.sh`** — 13 LOC. `grep -nE "actorUid:\s*req\.(body|headers)" src/routes/moderationRoutes.js` exits 1 if any matches found. **Currently PASSES** (no media endpoints written yet so no spoofable surface). Chained into `npm test`.

### Files modified (5)

1. **`src/routes/propertyRoutes.js`** — Deleted inline `S3Client` + `multer-s3` block (lines 17-44). Now requires `../middleware/s3Upload` and calls `makeUploader({ allowedMimes: PHOTO_MIMES, fileSizeBytes: 10 * 1024 * 1024, totalFiles: 40 })`. Behavior preserved verbatim. Retained `multer` require because L216 uses `error instanceof multer.MulterError` typecheck (deleted entirely by Plan 03-04).
2. **`src/routes/moderationRoutes.js`** — Same pattern: deleted inline S3 block (lines 27-51). Dropped `multer` require entirely (no MulterError typecheck site). Now requires factory + calls `makeUploader(...)` with the same parameters. The Phase 3 CR-01 history (multer-s3 vs memory storage on edit-on-behalf) is preserved in code comments.
3. **`src/models/ModerationLog.js`** — Action enum extended from 6 → 7 values: `['approve', 'reject', 'edit-on-behalf', 'archive', 'unarchive', 'hard-delete', 'media-upload']`. Added doc comment specifying that `'media-upload'` covers BOTH add and remove operations (diff direction tells which) per Discretion #8.
4. **`src/models/Property.js`** — `media.tourUrl` field gained a Mongoose validator: `URL` constructor + `protocol === 'https:'` check. Empty string and undefined both pass (optional field). Rejection message: `'tourUrl must be a valid https:// URL'`. Mitigates T-05 (rejects `javascript:`, `data:`, `file:`, `ftp:` schemes).
5. **`package.json`** — `test` script now chains `bash scripts/check-no-actoruid-spoofing.sh && jest --config jest.config.cjs`. Added `check:actoruid` and `check:media-stripped` npm scripts for explicit invocation.

## Sentinel state at commit time

| Sentinel | Exit code | Disposition |
|----------|-----------|-------------|
| `check-no-actoruid-spoofing.sh` | **0** | **PASSES** — green; chained into npm test; guards future media-endpoint audit log writes from regressing into `actorUid: req.body.uid` spoofing |
| `check-property-routes-media-stripped.sh` | **1** | **FAILS BY DESIGN** — red; Plan 03-04 will strip multer from propertyRoutes (D-13 atomic-break) and that strip-commit's success will mechanically flip this sentinel from FAIL→PASS |

This mirrors the M1 Phase 4 `check-land-removed.sh` and M3 Phase 2 `check-create-listing-screen-removed.sh` armed-FAIL-then-flip pattern.

## Verification (success_criteria all green)

```text
=== FACTORY ===
FACTORY-OK
=== ROUTES CONSUME FACTORY ===
propertyRoutes:  1
moderationRoutes: 1
=== ENUM ===
ENUM-OK [ 'approve', 'reject', 'edit-on-behalf', 'archive',
          'unarchive', 'hard-delete', 'media-upload' ]
=== VALIDATOR MSG ===
1
=== SENTINELS EXEC ===
SENTINEL-1-OK
SENTINEL-2-OK
=== SENTINELS RUN ===
actoruid-exit=0
stripped-exit=1
=== TEST SUITE ===
Test Suites: 9 passed, 9 total
Tests:       219 passed, 219 total
```

Property.media.tourUrl validator runtime tests (Node assertion script — 6/6 pass):
- `https://my.matterport.com/show/?m=abc` → accepted
- `http://insecure.example.com` → rejected with correct message
- `not a url at all` → rejected
- `''` (empty string) → accepted (optional)
- `undefined` → accepted (optional)
- `javascript:alert(1)` → rejected (T-05 mitigation)

## Threat model coverage

| Threat | Disposition | Evidence |
|--------|-------------|----------|
| **T-01** Spoofing — new audit-log writes (Plans 03-02 + 03-03) | mitigate (infra installed) | `scripts/check-no-actoruid-spoofing.sh` chained into `npm test`; runs on every backend test invocation; currently exit 0 |
| **T-03** Tampering — multer config drift in `s3Upload.js` factory | mitigate | Factory accepts MIME allowlist as parameter; PHOTO_MIMES is reference-shared `Set`; fileFilter sets `err.code = 'MEDIA_INVALID_TYPE'` for stable client error code |
| **T-05** Information disclosure — `Property.media.tourUrl` direct DB writes | mitigate | Mongoose validator URL-constructor + `protocol === 'https:'` check rejects `javascript:`, `data:`, `file:`, `ftp:` schemes even when route layer is bypassed; belt-and-suspenders with route-level check (Plan 03-02 D-08) |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — Bug] Doc comment containing literal `'media-delete'` tripped the anti-pattern grep gate.**
- **Found during:** Task 2 verification.
- **Issue:** Plan's acceptance criterion required `grep -c "'media-delete'" src/models/ModerationLog.js` to be `0`, but the doc comment I wrote (verbatim from the plan body's `<action>` block, lines 282-287) contained the literal token `'media-delete'` as the rejected alternative being explained ("no separate `'media-delete'`"). The grep is purely textual and fired on the doc comment.
- **Fix:** Rewrote the comment to say "no separate add/remove value" instead of "no separate `'media-delete'`" — preserves the meaning of Discretion #8 without using the literal token. Enum and behavior unchanged.
- **Files modified:** `src/models/ModerationLog.js`
- **Commit:** `a29f163` (deviation fix folded into the same Task 2 commit before push)

No other deviations. Tasks 1 and 3 executed exactly as specified.

## Forward signal to Plan 03-02

The Plan 03-02 executor will instantiate a SECOND uploader from this same factory for the new `POST /api/moderation/listings/:id/media` and `DELETE /api/moderation/listings/:id/media/:assetIndex` endpoints:

```javascript
const { makeUploader, PHOTO_MIMES, VIDEO_MIMES } = require('../middleware/s3Upload');
const mediaUpload = makeUploader({
  allowedMimes: new Set([...PHOTO_MIMES, ...VIDEO_MIMES]),  // photos + videos
  fileSizeBytes: 25 * 1024 * 1024,                          // 25MB per file
  totalFiles: 45,                                            // 40 photos + 5 videos
});
```

Plan 03-02 will also:
- Use the extended `ModerationLog.action: 'media-upload'` enum value for both POST (add) and DELETE (remove) audit log writes.
- Pair the schema validator with route-level URL parse + `runValidators: true` on `findOneAndUpdate` so the tourUrl https-only invariant fires on update too.
- Source `actorUid: req.firebaseUid` (NEVER body/headers) — protected by `check-no-actoruid-spoofing.sh` already wired into `npm test`.

Plan 03-04 will:
- Strip the `upload.array(...)` middleware + `multer` require + the propertyRoutes factory consumer (D-13 atomic-break).
- Add `bash scripts/check-property-routes-media-stripped.sh && ...` to the `test` script chain (the now-green sentinel becomes a permanent gate).

## Self-Check: PASSED

Files exist:
- FOUND: `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/middleware/s3Upload.js`
- FOUND: `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/scripts/check-property-routes-media-stripped.sh`
- FOUND: `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/scripts/check-no-actoruid-spoofing.sh`

Commits exist:
- FOUND: `239de75` (Task 1)
- FOUND: `a29f163` (Task 2)
- FOUND: `ae611ca` (Task 3)

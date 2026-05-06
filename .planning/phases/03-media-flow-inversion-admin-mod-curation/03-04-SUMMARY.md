---
phase: 03-media-flow-inversion-admin-mod-curation
plan: 04
plan_id: 03-04
subsystem: backend-trust-boundary
tags: [multer-strip, atomic-break, sentinel-flip, trust-boundary, T-03-mitigation, MEDIA-02, MEDIA-08]

dependency_graph:
  requires:
    - "Plan 03-01 (s3Upload factory + check-property-routes-media-stripped sentinel armed FAIL-by-design + check-no-actoruid-spoofing chained into npm test)"
    - "Plan 03-03 (MEDIA_REQUIRED gate at /approve + edit-on-behalf — 252/252 backend baseline)"
    - "Phase 1 nested media.* shape (Property.media.{photos, videos, tourUrl})"
  provides:
    - "User-side write paths POST/PUT /api/properties with ZERO multer/upload/multerS3 references"
    - "Explicit media literal `media: { photos: [], videos: [], tourUrl: undefined }` in POST handler (single grep target)"
    - "MEDIA-02 supertest coverage on propertyRoutes — body media keys silently ignored on POST + PUT"
    - "MEDIA-08 regression test — legacy listings preserve user-uploaded photos verbatim through D-13 strip"
    - "Both Phase 3 backend sentinels chained into `npm test` (anti-spoofing + media-stripped)"
    - "T-03 mitigation in effect — API surface that mapped HTTP request → S3 PutObject is GONE (D-14 reinterpretation)"
  affects:
    - "Plan 03-05 (RN MediaCurationService) — the /api/moderation/listings/:id/media endpoints from Plan 03-02 are now the SOLE write path for media; no fallback through user-side propertyRoutes"
    - "Phase 5 REL-05 (paired-gate audit) — both sentinels run on every npm test invocation; future regressions trip the gate immediately"

tech_stack:
  added: []  # No new dependencies; this is a strip-only refactor
  patterns:
    - "Atomic-break user-side write-path strip (mirrors Phase 1 D-01 + M2 Phase 2 D-21)"
    - "Sentinel armed-FAIL-then-flip lineage (M1 Phase 4 check-land-removed.sh → M3 Phase 2 check-create-listing-screen-removed.sh → Phase 3 Plan 03-04 check-property-routes-media-stripped.sh)"
    - "Explicit-literal grep auditability (positive grep target vs absence-inferring tests)"
    - "Trust-boundary attack-surface reduction (D-14: API surface removal IS the IAM rotation)"

key_files:
  created: []
  modified:
    - "/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/routes/propertyRoutes.js"
    - "/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/__tests__/propertyRoutes.test.js"
    - "/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/package.json"

decisions:
  - "Tasks 1 + 2 landed in a single commit (2be38d3) per atomic-commit posture (revision 2 — I2). Rationale: stripping multer in Task 1 alone would not have broken any tests in this codebase (no .attach() patterns exist in propertyRoutes.test.js — Step F's it.skip() reconciliation was a no-op), so the atomic commit adds the new MEDIA-02/MEDIA-08 coverage in the same atomic move that performs the strip. main never saw a transient red npm test."
  - "The media-build literal `media: { photos: [], videos: [], tourUrl: undefined }` was kept verbatim per plan Step C item 5 (B3 revision). Schema-default omission was rejected for grep auditability."
  - "Comment lines in propertyRoutes.js were rewritten to avoid the literal token `multer` (the sentinel's grep is purely textual; even comment matches trip it). The behavioral content of the comments is preserved — they still describe Phase 4.5's requireListingCapability, the JWKS verifyFirebaseToken pipeline, and Phase 1 D-01 atomic-break — without using the trigger token."
  - "PUT handler: chose `delete updateData.media` immediately after the existing CR-01 mass-assignment strip block, BEFORE the NESTED_SUBTREES deep-merge loop. Rationale: the deep-merge loop's `incoming !== undefined` guard would skip an undefined media key, so this is defensive belt-and-suspenders. The 'media' string remains in the NESTED_SUBTREES list — removing it would be a cosmetic change with no behavioral delta."
  - "Step F (it.skip TODOs) was a no-op for this codebase. propertyRoutes.test.js never used `.attach('images', ...)` — all existing tests were already JSON-body only. No tests were skipped or deleted; the new MEDIA-02 + MEDIA-08 cases are pure additions."

metrics:
  duration: "~12 min wall-clock (2 atomic backend commits + verification)"
  completed: "2026-05-06T20:00:00Z"
  tasks: 3
  files_created: 0
  files_modified: 3
  commits: 2  # 2 backend commits (Tasks 1+2 atomic, Task 3 separate)
  test_baseline_in: "252/252 backend pass"
  test_baseline_out: "258/258 backend pass (+6 — 3 MEDIA-02 + 3 MEDIA-08)"
  loc_delta_propertyRoutes_js: "-28 (746 → 717; net delete of multer-related code)"
  loc_delta_propertyRoutes_test_js: "+205 (959 → 1164)"
---

# Phase 3 Plan 04: Strip Multer + Chain Both Sentinels — Atomic-Break per D-13

**One-liner:** Stripped ALL multer/multer-s3/upload references from user-side `propertyRoutes.js` POST + PUT handlers (factory consumer, middleware, body destructure, imageUrls mapping, parsedMedia JSON-parse, MulterError catch, PUT req.files merge), replaced the media-build with the explicit literal `media: { photos: [], videos: [], tourUrl: undefined }`, added 6 MEDIA-02/MEDIA-08 supertest cases proving body media keys are silently ignored on user write paths, and chained the now-green media-stripped sentinel into `npm test` alongside the anti-spoofing sentinel. The API surface that mapped HTTP request → S3 PutObject is GONE (D-14: surface removal IS the IAM rotation).

## What shipped

### 2 atomic backend commits (JayTap-services repo)

| # | Commit  | Subject                                                                                      | Files | Insertions | Deletions |
| - | ------- | -------------------------------------------------------------------------------------------- | ----- | ---------- | --------- |
| 1 | `2be38d3` | refactor(03-04): strip multer from user-side propertyRoutes (POST + PUT) — atomic-break per D-13 | 2     | 251        | 73        |
| 2 | `339c8ce` | chore(03-04): chain check-property-routes-media-stripped sentinel into npm test                 | 1     | 1          | 1         |

### Files modified (3)

1. **`src/routes/propertyRoutes.js`** — 746 → 717 LOC (net −29). Stripped:
   - `const multer = require('multer');` (top of file)
   - `const { makeUploader, PHOTO_MIMES } = require('../middleware/s3Upload');` (Plan 03-01 factory consumer)
   - `const upload = makeUploader({ allowedMimes: PHOTO_MIMES, fileSizeBytes: 10 * 1024 * 1024, totalFiles: 40 });`
   - `upload.array('images', 40)` middleware from POST `/` AND PUT `/:id` chains
   - `media: clientMedia,` from POST body destructure
   - The `imageUrls = req.files ? req.files.map(...)` block
   - The `parsedMedia` JSON-parse fallback block
   - The `if (error instanceof multer.MulterError) {...}` catch branch
   - The PUT `if (req.files && req.files.length > 0) {...}` media merge block
   - All comment lines containing the literal token `multer` (rewritten to preserve behavioral context without tripping the sentinel grep)

   Replaced (Step C item 5) the existing `media: { ...parsedMedia, photos: imageUrls.length > 0 ? ... }` build with the explicit literal:
   ```javascript
   // Phase 3 D-13 — user-side media write disabled. Mod uploads via /api/moderation/listings/:id/media.
   media: { photos: [], videos: [], tourUrl: undefined },
   ```

   Added on PUT (immediately after the existing CR-01 mass-assignment strip block, before the NESTED_SUBTREES deep-merge):
   ```javascript
   delete updateData.media;
   ```

   Preserved verbatim:
   - `verifyFirebaseToken` middleware (POST + PUT)
   - `requireListingCapability` middleware (POST — Phase 4.5 landlord-capability gate)
   - The `M3_NESTED_BODY_REQUIRED` 400 validation
   - All other CR-01 anti-tamper logic (21-key strip, status sanitizer, rejected→pending auto-flip)
   - The NESTED_SUBTREES deep-merge loop (CR-02 partial-subtree preservation)
   - The AWS S3 403 catch branch (defensive — propertyRoutes itself no longer hits S3 on user write paths, but the branch remains as a no-op safety net for any future S3-touching code that might bubble through this handler)

2. **`src/__tests__/propertyRoutes.test.js`** — 959 → 1164 LOC (+205). Added 2 new top-level describe blocks:

   **`describe('Phase 3 D-13 / MEDIA-02 — user-side media write paths stripped')` — 3 tests:**
   - `POST /api/properties — body media.{photos, videos, tourUrl} ignored, written as empty` — sends an attacker-controlled `media` body with photos/videos/tourUrl arrays; asserts response media.photos === [], media.videos === [], media.tourUrl === undefined; AND verifies persisted DB document matches.
   - `PUT /api/properties/:id — body media.{...} ignored; existing media preserved` — seeds a listing with `media.photos: ['https://legit.s3.amazonaws.com/...']` and `media.tourUrl: 'https://my.matterport.com/show/?m=abc'`; PUTs an attacker body; asserts existing media survives verbatim AND the title edit DID land.
   - `PUT /api/properties/:id — body media on a listing with empty media stays empty` — seed with empty media; attacker PUT; asserts media stays empty.

   **`describe('Phase 3 MEDIA-08 — legacy listing media preservation')` — 3 tests:**
   - `GET /api/properties/:id returns legacy user-uploaded photos verbatim` — simulates a Phase 1 D-15 migration result with 2 M2-era photos + a Matterport tourUrl; asserts GET returns them verbatim.
   - `PUT /api/properties/:id by owner without media body — legacy photos preserved` — owner PUT with a content-only body; asserts legacy photo URL preserved.
   - `PUT /api/properties/:id by owner WITH media body — legacy photos still preserved (D-13 strip wins)` — owner PUT WITH an attacker-controlled `media.photos` body; asserts the 2 legacy photos still preserved verbatim.

3. **`package.json`** — `test` script chain extended:
   ```diff
   - "test": "bash scripts/check-no-actoruid-spoofing.sh && jest --config jest.config.cjs",
   + "test": "bash scripts/check-no-actoruid-spoofing.sh && bash scripts/check-property-routes-media-stripped.sh && jest --config jest.config.cjs",
   ```

   Both sentinels exit 0 BEFORE jest runs; both header lines (`== Phase-3 D-15 anti-spoofing sentinel ==` and `== Phase-3 D-16 propertyRoutes media-stripped sentinel ==`) print OK to stdout before jest output.

## Sentinel state at commit time

| Sentinel                                  | Exit code | Disposition                                                                                |
| ----------------------------------------- | --------- | ------------------------------------------------------------------------------------------ |
| `check-no-actoruid-spoofing.sh`           | **0**     | **PASSES** (unchanged from Plan 03-01) — chained into `npm test`                            |
| `check-property-routes-media-stripped.sh` | **0**     | **PASSES — FLIPPED from FAIL→PASS in this plan's commit `2be38d3`** — chained into `npm test` |

This completes the M1 Phase 4 → M3 Phase 2 → Phase 3 Plan 03-04 armed-FAIL-then-flip lineage. Both backend grep gates now run on every `npm test` invocation.

## Verification (success_criteria all green)

```text
=== SENTINELS ===
== Phase-3 D-15 anti-spoofing sentinel — actorUid in moderationRoutes.js ==
OK HF-03: actorUid sourced exclusively from req.firebaseUid
exit=0
== Phase-3 D-16 propertyRoutes media-stripped sentinel ==
OK: propertyRoutes.js is media-stripped
exit=0

=== STRIP EVIDENCE GREPS ===
literal `media: { photos: [], videos: [], tourUrl: undefined }` count: 1
`media: clientMedia` count:                                          0
`imageUrls` count:                                                   0
`MulterError` count:                                                 0
`upload.array|multer|multerS3` count:                                0
`router.post('/'.*async` count:                                      1
`router.put('/:id'` count:                                           1

=== MODULE LOAD ===
FIREBASE_PROJECT_ID=test ... node -e "require('./src/routes/propertyRoutes')"
REQUIRE-OK

=== PACKAGE.JSON CHAIN ===
grep -c "check-no-actoruid-spoofing.sh" package.json:           2 (test + check:actoruid script)
grep -c "check-property-routes-media-stripped.sh" package.json: 2 (test + check:media-stripped script)

=== TEST SUITE ===
npm test
== Phase-3 D-15 anti-spoofing sentinel — actorUid in moderationRoutes.js ==
OK HF-03: actorUid sourced exclusively from req.firebaseUid
== Phase-3 D-16 propertyRoutes media-stripped sentinel ==
OK: propertyRoutes.js is media-stripped
PASS src/__tests__/User.test.js
PASS src/__tests__/Property.test.js
PASS src/__tests__/authRoutes.test.js
PASS src/__tests__/verifyFirebaseToken.test.js
PASS src/__tests__/locationRoutes.test.js
PASS src/__tests__/adminRoutes.test.js
PASS src/__tests__/propertyRoutes.test.js
PASS src/__tests__/moderationRoutes.test.js
PASS src/__tests__/migrate-listings-m3.test.js
Test Suites: 9 passed, 9 total
Tests:       258 passed, 258 total
```

## Atomic-break declaration

Per Phase 1 D-01 + Phase 3 D-13 + revision 2 I2: **NO dual-flow window**. The user-side write paths POST/PUT `/api/properties` no longer accept multipart media bodies; client-supplied `media.{...}` JSON keys are silently ignored. After commit `2be38d3`:

- M2 client (TestFlight build 27 / Play Internal versionCode 30) was ALREADY broken vs Phase 1 nested-shape backend — D-13 strip is a NO-OP delta on tester impact (M2 client could not POST listings since Phase 1 cutover anyway).
- Phase 2 ContextualListingFlow client (shipped 2026-05-06) was ALREADY zero-media — POSTs JSON-only nested-shape bodies with no `media.*` body keys; D-13 strip is invisible to it.
- Phase 3 Plan 03-05 (RN MediaCurationService) consumes the new `/api/moderation/listings/:id/media` endpoints from Plan 03-02 exclusively — those are now the SOLE write path for media post-submission.

## Atomic-commit posture (revision 2 — I2)

Tasks 1 (multer strip in propertyRoutes.js) and 2 (MEDIA-02 + MEDIA-08 supertest coverage) landed in a SINGLE commit `2be38d3`. `main` never saw a transient red `npm test`.

**Why Task 1 alone wouldn't have broken any tests:** Step F instructs marking broken multer-dependent tests `it.skip()` with a TODO. In practice, `propertyRoutes.test.js` never used `.attach('images', ...)` patterns — all existing tests were already JSON-body only (per the file's docstring: "Tests send `application/json` requests (no multipart body), so multer's `upload.array('images', 40)` is a no-op for parsing"). So Step F was a no-op for this codebase: no existing tests were skipped or deleted. The new MEDIA-02 + MEDIA-08 cases are pure additions.

Task 3 (npm test chain) landed in its own commit `339c8ce` because it's a metadata-only edit and benefits from being separately reviewable in git history.

## Disposition of Step F's `it.skip()` TODOs

**No tests were skipped or deleted.** The plan's Step F sub-step was conditional on the existence of multer-dependent tests using `.attach('images', ...)` or `.attach('photos', ...)` patterns. Verification at Plan 03-04 Task 1 entry:

```bash
grep -nE "\.attach\(" src/__tests__/propertyRoutes.test.js
# (no matches)
```

This confirms `propertyRoutes.test.js` never depended on multer for parsing — all existing 44 tests were already pure JSON-body supertests. Step F's branching logic ("delete subsumed by MEDIA-02 / permanently skip with TODO") was therefore dead code for this commit. No legacy multer-error-path tests existed to permanently skip.

The 6 new tests (3 MEDIA-02 + 3 MEDIA-08) are pure additions; no test was harmed in the making of this commit.

## Threat model coverage

| Threat                                                                       | Disposition           | Evidence                                                                                                                                                                                                                                                                                                                                                                                            |
| ---------------------------------------------------------------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **T-03 (HIGH)** Tampering / attack-surface-reduction — User-side multer middleware | mitigate (in effect) | `scripts/check-property-routes-media-stripped.sh` chained into `npm test`; runs on every backend test invocation; flipped FAIL→PASS in commit `2be38d3`. MEDIA-02 supertest cases prove body `media` keys are silently ignored on POST + PUT. Per D-14, this IS the IAM "rotation" — API surface that mapped HTTP request → S3 PutObject is GONE; user-facing attack vector eliminated. |
| **T-01 (HIGH)** Spoofing — anti-spoofing grep gate                              | mitigate (in effect) | `scripts/check-no-actoruid-spoofing.sh` STILL chained into `npm test` alongside the new media-stripped sentinel. Both gates run on every backend test invocation.                                                                                                                                                                                                                                  |

## Deviations from Plan

### Auto-fixed issues

**1. [Rule 1 - Bug] Comment line containing literal `media: { photos: [], videos: [], tourUrl: undefined }` tripped the literal-count grep gate.**

- **Found during:** Task 1 verification (post-strip grep).
- **Issue:** I initially wrote a docstring comment above the POST handler that said `// literal `media: { photos: [], videos: [], tourUrl: undefined }` regardless of body content`. The plan's success criterion #2 requires `grep -c "media: { photos: \[\], videos: \[\]"` to equal exactly `1` (the actual code value, not a comment-doc reference). My comment created a 2nd match.
- **Fix:** Rewrote the docstring to say "writes empty photos/videos arrays + undefined tourUrl regardless of body content" instead of including the literal token sequence. Behavior unchanged; grep count back to 1.
- **Files modified:** `src/routes/propertyRoutes.js`
- **Commit:** `2be38d3` (deviation fix folded into the same atomic commit before push)

**2. [Rule 1 - Bug] Comment lines in propertyRoutes.js using the word `multer` tripped the media-stripped sentinel grep.**

- **Found during:** Task 1 verification (post-strip sentinel run).
- **Issue:** The sentinel grep `grep -nE "upload\.array|multer|multerS3"` is purely textual — it matches `multer` anywhere in the file, including comments. After the code-level strip, residual comment lines like `// Phase 3 D-13: multer / multer-s3 error branches deleted ...` and `// (auth pipeline order matters — multer parses ...)` were keeping the sentinel red.
- **Fix:** Rewrote those comments to preserve behavioral context (Phase 4.5's `requireListingCapability`, JWKS verifyFirebaseToken pipeline, Phase 1 D-01 atomic-break) without using the trigger token. Specifically: replaced `multer parses multipart body` with the equivalent description of what's happening (verifyFirebaseToken middleware order); replaced `multer / multer-s3 error branches` with `file-upload error branches`.
- **Files modified:** `src/routes/propertyRoutes.js`
- **Commit:** `2be38d3` (deviation fix folded into the same atomic commit before push)

### Out-of-scope / pre-existing flake

**Pre-existing flake — NOT a Plan 03-04 deviation, NOT fixed:**

- **`src/__tests__/adminRoutes.test.js`** had ONE intermittent failure on full-suite run (`ADMIN-07 + auth gating › GET /users without auth returns 401` — received 404 instead of 401). The same test PASSED on isolation (`npx jest src/__tests__/adminRoutes.test.js` → 17/17 green) AND on a re-run of the full suite (252/252 → 258/258 green on subsequent runs). This matches the M3 carry-forward flake pattern documented in `.planning/phases/02-6-step-contextual-listing-flow-client/02-deferred-items.md` (`mod-archive invalid reasonCode → 400` first-run flake). Not a regression introduced by Plan 03-04. Per scope boundary: out-of-scope discoveries logged here, NOT auto-fixed.

No other deviations. All 3 tasks executed substantially as specified.

## Forward signal to Plan 03-05 (RN MediaCurationService)

After commit `2be38d3`:

- The `/api/moderation/listings/:id/media` (POST upload) and `/api/moderation/listings/:id/media/:assetIndex` (DELETE) endpoints from Plan 03-02 are now the **SOLE** write path for media on Property documents.
- The RN `MediaCurationService.ts` (Plan 03-05) wraps these endpoints exclusively. NO fallback through `propertyRoutes` — that surface no longer accepts media.
- Owner edits via `PUT /api/properties/:id` are media-blind (any client-supplied `media.*` body keys are silently ignored). RN client write code that historically attached `media.*` keys to a PUT body is now a no-op on the server side; tests `MEDIA08-LEGACY-3` (above) prove existing media survives.

## Forward signal to Phase 5 REL-05 (paired-gate audit)

Both Phase 3 backend sentinels are now wired into `npm test`:

1. `check-no-actoruid-spoofing.sh` (T-01 mitigation, chained Plan 03-01)
2. `check-property-routes-media-stripped.sh` (T-03 mitigation, chained Plan 03-04 commit `339c8ce`)

Per memory `gsd-verifier-misses-regressions.md`, the goal-backward verifier alone misses regressions; these grep gates are the cheap insurance layer. Any future regression that:

- Re-introduces `actorUid: req.body.x` or `actorUid: req.headers.x` in `moderationRoutes.js` (T-01)
- Re-introduces `upload.array(...)` or `multer.MulterError` in `propertyRoutes.js` (T-03)

trips the gate at `npm test` time, BEFORE jest runs. CI / Phase 5 REL-05 paired-gate audit reads both sentinels' headers in the test pipeline output.

## Self-Check: PASSED

Files exist:

- FOUND: `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/routes/propertyRoutes.js`
- FOUND: `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/__tests__/propertyRoutes.test.js`
- FOUND: `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/package.json`

Commits exist:

- FOUND: `2be38d3` (Tasks 1 + 2 atomic — strip + tests)
- FOUND: `339c8ce` (Task 3 — npm test chain)

Sentinels green:

- FOUND: `bash scripts/check-property-routes-media-stripped.sh; echo $?` → `0`
- FOUND: `bash scripts/check-no-actoruid-spoofing.sh; echo $?` → `0`

Tests:

- FOUND: 258/258 backend pass (252 baseline + 6 new MEDIA-02/MEDIA-08 cases)
- FOUND: 2 new describe blocks (`Phase 3 D-13 / MEDIA-02 — user-side media write paths stripped`, `Phase 3 MEDIA-08 — legacy listing media preservation`)

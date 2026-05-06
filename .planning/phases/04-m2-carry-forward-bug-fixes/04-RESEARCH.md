# Phase 4: M2 Carry-Forward Bug Fixes — Research

**Researched:** 2026-05-06
**Domain:** RN client error-recovery UX (CARRY-01) + Node/Express + Mongoose backend hardening (CARRY-02) + Phase 3 polish (MD-01..MD-04)
**Confidence:** HIGH (all primary claims verified against in-tree code or live tool runs in this session)

---

## User Constraints (from CONTEXT.md)

### Locked Decisions

**CARRY-01 — RN client mid-action 403 popup recovery:**
- **D-01** Six surface coverage: `ModerationQueueScreen.tsx` (handleApprove + handleRejectSubmit + handleApproveLocation + locations-tab reject), `RejectListingModal.tsx` (presentational — parent owns submit), `ArchiveListingModal.tsx` (presentational — parent owns submit), `DeleteListingModal.tsx` (presentational — parent owns submit), `PropertyDetailsScreen.tsx` mod-action footer (handleApprove + handleRejectSubmit + handleModArchiveSubmit + handleRestore + confirmHardDelete), `RoleManagementScreen.tsx` (handleRoleSubmit — already catches client-side; refactor through shared mechanism).
- **D-02** Shared `is403PermissionError(err)` helper + `useModActionGuard()` hook. Hook returns `{ is403PermissionError, onPermissionDenied }`. `onPermissionDenied({ closeModal, resetLoading })` resets loading, closes modal, awaits `refreshRole()`.
- **D-03** Catch BOTH client-side `PermissionDeniedError` (synchronous, from `canFromUser` pre-check in service) AND in-flight `err?.response?.status === 403` (backend role guard rejected after demote-mid-request).
- **D-04** Recovery UX: silent close + `RoleRefreshBanner` auto-surfaces. No `Alert.alert`, no force re-login.
- **D-05** Acceptance: popup loading resets, popup closes, banner appears within ~1s, user recovers via banner-tap (no app restart).

**CARRY-02 — Backend uid-mismatch verification + diagnostic cleanup:**
- **D-06** Delete the entire 7-field `console.log` block at `landlordApplicationRoutes.js:111-123` (`evt: 'landlord_application_submit'`).
- **D-07** New standalone `scripts/check-no-landlord-uid-spoofing.sh` mirrored on `check-no-actoruid-spoofing.sh`. Chained into `npm test` alongside the existing two sentinels.
- **D-08** Backend supertest cases (this means CREATING `src/__tests__/landlordApplicationRoutes.test.js` — file does NOT exist yet): body-spoof rejection, no-bearer 401, happy-path uid match, sentinel exit 0.

**CARRY-02 — Repair migration semantics:**
- **D-09** Phone-match repair, orphan-mark fallback. Audit row per branch (recommend `'uid-repair'` + `'uid-orphan-mark'`).
- **D-10** Extend `LandlordApplication.status` enum: `submitted | approved | rejected | withdrawn` → add `orphaned`. Audit `getMine` (line 157) + admin queue filter to confirm `'orphaned'` rows are NOT shown.
- **D-11** Operator-supervised: `--dry-run` + `--verify=PASS` modes; idempotent. Test file covers hit-skip / phone-match-flip / orphan-mark / idempotency.
- **D-12** Manual physical-device walk on iPhone 15 Pro Max for ROADMAP SC#3 (captured in `04-HUMAN-UAT.md`).

**Phase 3 MEDIUM bucket folded in:**
- **D-13** MD-01 — Update `en.ts:744` + `ru.ts:738` so the user-facing string distinguishes per-file size (25 MB) from per-upload count (45 files); no more "45 MB total" misstatement.
- **D-14** MD-02 — Disambiguate `moderationRoutes.js:21-28` comment block: legacy `upload` (10MB/file × 40 files, edit-on-behalf) vs. new `mediaUpload` (25MB/file × 45 files, mod media curation).
- **D-15** MD-03 — Add `mongoose.isValidObjectId(req.params.id)` pre-check on `DELETE /listings/:id/media`; on invalid → 400 with `code: 'INVALID_ID'`.
- **D-16** MD-04 — Tighten `scripts/check-property-routes-media-stripped.sh:8` regex to `require\(['"]multer|from ['"]multer|upload\.array|multerS3` (only matches imports + canonical multer API surface, not the substring "multer" inside comments).

**Sequencing:**
- **D-17** Two atomic commit chains, backend first. Backend chain: sentinel + supertest + diagnostic removal → repair migration script + test → MD-02..MD-04 fold in. RN chain: hook + helper + 6-surface sweep + RTL smoke → MD-01.
- **D-18** Test scope per CONTEXT.md (backend supertest, migration test 4 branches, sentinel binary check, RN RTL on canonical surface — recommend `RejectListingModal` consumer; MD-01..MD-04 supertests; `bash scripts/check-i18n-parity.sh` exit 0). Paired-gate verifier+reviewer mandatory.

### Claude's Discretion (planner picks)

- Migration audit log enum value(s) (`'uid-repair'` / `'uid-orphan-mark'` recommended).
- D-15 (MD-03) scope: DELETE-only vs. all 3 handlers vs. all routes (recommend DELETE-only).
- D-13 (MD-01) i18n key shape: single rewrite vs. split-into-two-keys (recommend split).
- Migration test fixture: `mongodb-memory-server` vs. explicit fixture seed (recommend `mongodb-memory-server` — already in devDeps).
- `requireBearer` audit on read paths — defensive comment only, no behavioral change.

### Deferred Ideas (OUT OF SCOPE)

- Force re-login on 403 (rejected D-04 in favor of banner-driven recovery).
- Race-cell test rig (cells 1.7 + 2.4–2.6 + 5.6 + 5.3) — M4+.
- Token-revocation backend changes — out of scope.
- CastError → 400 normalization across all routes — Phase 5 hardening or M4+.
- Audit log clean-up of pre-fix `landlord_application_submit` evt logs in Railway — operator opt-in, not code work.
- Schema-level `mongoose.isValidObjectId` route middleware — future hardening phase.

---

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CARRY-01 | RN client mid-action 403 popup recovery across 6 modal/screen submit handlers | Surface Map below pinpoints exact handler line numbers; apiClient interceptor analysis confirms which 403 codes flow through to caller catches |
| CARRY-02 | Backend landlord-application uid-mismatch fix verification + repair migration | Existing M3 Phase 1 migration scaffold + M2 HF-03 sentinel pattern + `mongodb-memory-server` already in devDeps cover all build blocks |

---

## Summary

Phase 4 is a tight, mechanical phase: the architectural boundaries are already drawn, the patterns to mirror are all in-repo, and the unknowns are small. Five things the planner needs to internalize:

1. **Three of the six "surfaces" are presentational only.** `RejectListingModal`, `ArchiveListingModal`, and `DeleteListingModal` are pure UI components — they call `await onSubmit(...)` (or `onConfirm()`) and let the parent handle errors. The 403 catch lives in the PARENT consumer (`PropertyDetailsScreen` and `ModerationQueueScreen`), not in the modal files themselves. The hook integrates at the parent's submit handler. CONTEXT.md D-01 captures this implicitly ("submit handlers across 6 surfaces"); the planner needs to spell it out per-handler so tasks don't waste edits inside the modals.

2. **The apiClient already auto-handles `code: 'role-revoked'` 403s — but NOT `code: 'insufficient-role'` 403s.** [VERIFIED] `apiClient.ts:159` only retries when `code === 'role-revoked'` (set by `verifyFirebaseToken.js:85` when `tokenIat < roleRevokedAt`). The `requireMinRole` middleware (`verifyFirebaseToken.js:111`) returns `code: 'insufficient-role'` — and that response is NOT caught by the interceptor; it flows straight to the calling service's catch. The new helper MUST treat `err?.response?.status === 403` as the matcher (regardless of code) so it catches both code paths consistently. This also covers any future 403 codes the backend grows.

3. **Backend test infrastructure is fully in place.** `mongodb-memory-server@9.5.0` is already a devDependency [VERIFIED in package.json]. `setup.js` boots it via `setupFilesAfterEach`. Existing `migrate-listings-m3.test.js` shows the helper-unit + integration-via-spawn pattern. `landlordApplicationRoutes.test.js` does NOT exist — D-08 implicitly creates it. There is no infrastructure yawn here; just file additions.

4. **MD-04 regex tightening verified safe.** [VERIFIED — ran the proposed regex against current `propertyRoutes.js`] No matches. Sentinel will stay green after the swap. The regex change is a one-line edit with confirmed backward-compat.

5. **Mongoose 9.1.6 exposes BOTH `mongoose.isValidObjectId()` and `mongoose.Types.ObjectId.isValid()`.** [VERIFIED via `node -e` in this session] Both are functions; both return `false` for `'banana'` and `true` for a real 24-char hex ObjectId. `favoriteRoutes.js:90` already uses `mongoose.Types.ObjectId.isValid` — recommend the same form for consistency, but `mongoose.isValidObjectId` is equivalent and slightly shorter.

**Primary recommendation:** Plan two atomic commit chains backend-first (D-17). The backend chain has 3 logical commits — diagnostic removal + sentinel + supertest creation; MD-02..MD-04 fold; repair migration. The RN client chain has 2 logical commits — hook + helper + parent-level integration on 6 submit handlers + canonical RTL smoke; MD-01 i18n fix. No external dependencies, no version churn, no surprises. The planner should focus on getting the per-handler edit precise.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| 403 detection (in-flight) | API/Backend | Frontend RN | Backend `requireMinRole` returns the 403; client catches and recovers |
| 403 detection (client pre-check) | Frontend RN service | — | `canFromUser` synchronous throw before HTTP fires |
| Recovery UX (popup-close + banner) | Frontend RN | — | `useModActionGuard` hook + existing `RoleRefreshBanner` |
| Anti-spoofing trust boundary (uid sourcing) | API/Backend | — | `req.firebaseUid` from JWKS-verified `payload.sub`; never body/header |
| Repair-migration data layer | Database/Storage | — | One-shot Mongoose script; operator-supervised |
| Build-time invariant enforcement | CI/Pre-commit | — | bash sentinel chained into `npm test` |
| i18n parity (UI strings) | Frontend RN | — | EN+RU lockstep gate via `bash scripts/check-i18n-parity.sh` |

---

## Surface Map

### CARRY-01 — six client-side handlers (parent-owned HTTP catches)

The 403-catch sweep belongs in these specific handler functions. Each row gives the parent file, the function name, the precise submit-handler line range, and the existing 409 catch (which is the structural parallel for the new 403 branch).

| # | Parent file | Handler | Submit line range | Existing catch shape |
|---|-------------|---------|---------|---|
| 1 | `src/screens/ModerationQueueScreen.tsx` | `handleApprove` (Listings tab) | **209-241** | 409 race → `handleRaceConflict()`; else generic Alert |
| 2 | `src/screens/ModerationQueueScreen.tsx` | `handleRejectSubmit` (Listings tab) | **243-270** | Same shape as #1 |
| 3 | `src/screens/ModerationQueueScreen.tsx` | `handleApproveLocation` (Locations tab) | **391-427** | 409 → race-conflict path; else generic Alert |
| 4 | `src/screens/ModerationQueueScreen.tsx` | `submitLocationReject` (Locations tab) | **429-464** | Same shape as #3 |
| 5 | `src/screens/PropertyDetailsScreen.tsx` | `handleApprove` (mod footer) | **336-367** | 409 → `handleRaceConflict()`; else generic Alert |
| 6 | `src/screens/PropertyDetailsScreen.tsx` | `handleRejectSubmit` (parent of `<RejectListingModal onSubmit={...}>` at line 1672) | **369-389** | Same shape as #5 |
| 7 | `src/screens/PropertyDetailsScreen.tsx` | `handleModArchiveSubmit` (parent of `<ArchiveListingModal onSubmit={...}>` at line 1680) | **398-417** | Same shape as #5 |
| 8 | `src/screens/PropertyDetailsScreen.tsx` | `handleRestore` (mod-archive restore) | **423-453** | Same shape as #5 |
| 9 | `src/screens/PropertyDetailsScreen.tsx` | `confirmHardDelete` (parent of `<DeleteListingModal onConfirm={...}>` at line 1689) | **458-476** | NO 409 branch today; only generic Alert (admin-only path; race rare) |
| 10 | `src/screens/RoleManagementScreen.tsx` | `handleRoleSubmit` | **135-177** | Already catches client-side `PermissionDeniedError` at line 147; lacks 403 in-flight branch |

**That's 10 functions across 3 files** (D-01 said "5+/6+" — accurate count is 10 handler call-sites; the 6 modal/screen "surfaces" cited in CONTEXT.md collapse the 4 PropertyDetailsScreen handlers into one surface and the 4 ModerationQueueScreen handlers into one). The 3 modal files (`RejectListingModal.tsx`, `ArchiveListingModal.tsx`, `DeleteListingModal.tsx`) are presentational — they propagate errors via `await onSubmit(params)` (or `onConfirm()`) and the parent's catch fires. **No file edits needed in those 3 modal files for CARRY-01.** [VERIFIED — read each modal file in this session]

**Acceptance grep pattern (planner uses verbatim in tasks):**
```
grep -nE "is403PermissionError\(err\)" src/screens/ModerationQueueScreen.tsx src/screens/PropertyDetailsScreen.tsx src/screens/RoleManagementScreen.tsx
# Expected: 10 hits (one per handler in the table above)
```

### CARRY-02 — backend handlers + supporting infra

| Target | File | Lines | Action |
|---|---|---|---|
| Diagnostic console.log block | `src/routes/landlordApplicationRoutes.js` | **111-123** (the 7-field `evt: 'landlord_application_submit'` JSON.stringify block) | Delete entire block per D-06 |
| Sentinel scope | `src/routes/landlordApplicationRoutes.js` | (whole file scanned) | New `scripts/check-no-landlord-uid-spoofing.sh` greps `uid:\s*req\.(body|headers)` |
| `requireBearer` middleware | `src/routes/landlordApplicationRoutes.js` | **54-59** (defined), **67** (POST), **166** (DELETE), **226** (admin/decide) | NO change — reference only; planner cites this as the existing trust boundary |
| Active-app guard | `src/routes/landlordApplicationRoutes.js` | **94-101** (`existingActive = ... findOne({ uid: req.firebaseUid, status: 'submitted' })`) | NO change — orphaned rows under a different uid don't block the legitimate user (CONTEXT.md D-09 specifics confirmed in source) |
| `getMine` filter | `src/routes/landlordApplicationRoutes.js` | **157** (`LandlordApplication.find({ uid: req.firebaseUid })`) | Defensive comment only (D-10 audit); orphaned rows would only appear if a user's own User-doc was deleted, which is exceedingly unlikely. No filter change — `'orphaned'` rows naturally don't surface to anyone with a working uid |
| Admin queue filter | `src/routes/landlordApplicationRoutes.js` | **212-216** (default `?status=submitted` FIFO) | Defensive comment only — `'orphaned'` rows will only appear when admin queries `?status=all` or `?status=orphaned`; the default `submitted` filter naturally excludes them |
| Status enum extension | `src/models/LandlordApplication.js` | **9-15** (`enum: ['submitted', 'approved', 'rejected', 'withdrawn']`) | Add `'orphaned'` |
| Audit-log enum extension | `src/models/LandlordApplicationAuditLog.js` | **10-14** (`enum: ['submit', 'approve', 'reject', 'withdraw']`) | Add `'uid-repair'` and `'uid-orphan-mark'` |
| Migration script | `src/scripts/migrate-landlord-app-uid-mismatch.js` (NEW) | — | Mirror M3 Phase 1's `migrate-listings-m3.js` structure |
| Migration test | `src/__tests__/migrate-landlord-app-uid-mismatch.test.js` (NEW) | — | Mirror `migrate-listings-m3.test.js` pattern |
| Supertest creation | `src/__tests__/landlordApplicationRoutes.test.js` (NEW — does not exist today) | — | Mirror `moderationRoutes.test.js` env + jest.mock + `buildToken` setup |
| MD-02 doc-drift | `src/routes/moderationRoutes.js` | **21-28** | Comment-only; differentiate `upload` (10MB×40) vs `mediaUpload` (25MB×45) |
| MD-03 CastError → 400 | `src/routes/moderationRoutes.js` | **DELETE handler at 345-404** | Add `if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ code: 'INVALID_ID', ... })` at top of handler |
| MD-04 sentinel regex | `scripts/check-property-routes-media-stripped.sh:8` | **8** | Replace pattern with `require\(['"]multer|from ['"]multer|upload\.array|multerS3` |

**npm test chain — current vs. proposed:**

| State | npm test command (verbatim from `package.json:10`) |
|-------|-----|
| Today | `bash scripts/check-no-actoruid-spoofing.sh && bash scripts/check-property-routes-media-stripped.sh && jest --config jest.config.cjs` |
| After D-07 | `bash scripts/check-no-actoruid-spoofing.sh && bash scripts/check-no-landlord-uid-spoofing.sh && bash scripts/check-property-routes-media-stripped.sh && jest --config jest.config.cjs` |

[VERIFIED — read package.json + listed scripts/ directory contents this session]

### MD-01 dispatch site

`src/screens/MediaCurationScreen.tsx` lines **325-333** — current shape:
```ts
if (errorCode === 'LIMIT_FILE_SIZE' || errorCode === 'LIMIT_FILE_COUNT') {
  Alert.alert(t('common.error'), t('moderation.mediaCuration.error.tooLarge'));
} else { ... }
```
If planner picks the **split-key shape** (recommended), this becomes:
```ts
if (errorCode === 'LIMIT_FILE_SIZE') {
  Alert.alert(t('common.error'), t('moderation.mediaCuration.error.tooLarge'));
} else if (errorCode === 'LIMIT_FILE_COUNT') {
  Alert.alert(t('common.error'), t('moderation.mediaCuration.error.tooManyFiles'));
} else { ... }
```
[VERIFIED — read MediaCurationScreen.tsx:325-333 in this session]

---

## Patterns to Replicate

### Pattern 1: M2 HF-03 anti-spoofing sentinel (full body, 9 LOC)

The CONTEXT.md D-07 sentinel is a near-verbatim clone of this:

```bash
#!/usr/bin/env bash
set -u
cd "$(dirname "$0")/.."

echo "== Phase-3 D-15 anti-spoofing sentinel — actorUid in moderationRoutes.js =="

hits=$(grep -nE "actorUid:\s*req\.(body|headers)" src/routes/moderationRoutes.js 2>/dev/null || true)
if [ -n "$hits" ]; then
  echo "FAIL HF-03: actorUid sourced from req.body or req.headers in moderationRoutes.js:"
  echo "$hits"
  exit 1
fi
echo "OK HF-03: actorUid sourced exclusively from req.firebaseUid"
exit 0
```
**Source:** `JayTap-services/scripts/check-no-actoruid-spoofing.sh` [VERIFIED — read in full]

For Phase 4 D-07, the only changes are: rename to `check-no-landlord-uid-spoofing.sh`, scan `src/routes/landlordApplicationRoutes.js`, swap the grep pattern to `uid:\s*req\.(body|headers)`, swap log strings to "landlord-application uid". Total LOC change ≈ 4.

### Pattern 2: M3 Phase 1 migration scaffold

`src/scripts/migrate-listings-m3.js` is the canonical pattern for D-11. Key elements the new migration will mirror:
- Header comment block with `--dry-run` / `--verify=PASS` usage examples (lines 1-34).
- Node-version guard at module scope (lines 45-48): `if (Number(process.versions.node.split('.')[0]) < 22) { console.error('FATAL: Node ≥22.12 required (run nvm use 24)'); process.exit(2); }`. Required because backend `engines: ">=22.12.0"` and jose@6 is ESM-only.
- Args parsing: `const args = process.argv.slice(2); const isDryRun = args.includes('--dry-run'); const isVerify = args.includes('--verify=PASS');`.
- Misuse-guard for malformed `--verify` (lines 56-59): `if (args.includes('--verify') && !args.includes('--verify=PASS')) process.exit(2);`.
- Pure transform function exported for unit testing (`buildNestedShape` in M3; for landlord migration, the analog is a pure `classifyRow(application, candidateUsers)` function returning one of `{kind: 'hit-skip'}`, `{kind: 'phone-match-flip', newUid}`, or `{kind: 'orphan-mark'}`).
- Idempotency: skip rows that already match the post-migration invariant (in landlord case: `status === 'orphaned'` OR there's a `LandlordApplicationAuditLog` row with `action === 'uid-repair'` matching current uid).

[VERIFIED — read first 100 LOC of migrate-listings-m3.js this session]

### Pattern 3: backend test scaffold (jest + supertest + mongodb-memory-server)

`mongodb-memory-server@9.5.0` is in devDependencies [VERIFIED in package.json]. The bootstrap is shared via `src/__tests__/setup.js` (loaded by `jest.config.cjs setupFilesAfterEach`). Each test file gets a connected, per-test-cleared in-memory Mongo instance for free — no per-test boilerplate needed.

```js
// setup.js (all 24 LOC, verbatim from in-tree)
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

let mongo;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  const uri = mongo.getUri();
  await mongoose.connect(uri, { dbName: 'jaytap-test' });
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
});
```

For the supertest header — env stubs + JWKS mock — clone the top of `moderationRoutes.test.js` (lines 25-44 + 77-90):

```js
process.env.FIREBASE_PROJECT_ID = 'jaytap-test-project';
process.env.AWS_REGION = process.env.AWS_REGION || 'us-east-1';
process.env.AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID || 'test-access-key';
process.env.AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY || 'test-secret-key';
process.env.AWS_BUCKET_NAME = process.env.AWS_BUCKET_NAME || 'jaytap-test-bucket';

jest.mock('../config/firebase', () => {
  const { importJWK } = require('jose');
  const { getKeys, TEST_ISSUER, TEST_FIREBASE_PROJECT_ID } = require('./fixtures/jwks-tokens');
  const JWKS = async () => {
    const { publicJwk } = await getKeys();
    return await importJWK(publicJwk, 'RS256');
  };
  return { JWKS, ISSUER: TEST_ISSUER, FIREBASE_PROJECT_ID: TEST_FIREBASE_PROJECT_ID };
});

// For landlord supertests, you also need to mock multer-s3 (the route uploads files).
// Reuse Recipe A from moderationRoutes.test.js:53-75 verbatim.

const request = require('supertest');
const express = require('express');
const router = require('../routes/landlordApplicationRoutes');
const LandlordApplication = require('../models/LandlordApplication');
const LandlordApplicationAuditLog = require('../models/LandlordApplicationAuditLog');
const User = require('../models/User');
const { buildToken } = require('./fixtures/jwks-tokens');

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/landlord-applications', router);
  return app;
}
```

`buildToken` is provided by `src/__tests__/fixtures/jwks-tokens.js` [VERIFIED — fixtures dir contains exactly this file] and signs an RS256 JWT against the test keypair so the route's `verifyFirebaseToken` middleware accepts it as a real Bearer token.

### Pattern 4: existing 409 catch shape (parallel to add 403 branch)

Today every parent handler matches this shape:

```ts
} catch (err: any) {
  if (err?.response?.status === 409) {
    await handleRaceConflict();
    return;
  }
  Alert.alert(
    t('common.error'),
    err?.response?.data?.message || err?.message || t('common.errorGeneric'),
  );
} finally { setSubmittingX(false); }
```

After Phase 4, it becomes:

```ts
} catch (err: any) {
  if (is403PermissionError(err)) {
    onPermissionDenied({
      closeModal: () => setIsXModalOpen(false),
      resetLoading: () => setSubmittingX(false),
    });
    return;  // hook handles loading reset + close + refreshRole
  }
  if (err?.response?.status === 409) {
    await handleRaceConflict();
    return;
  }
  Alert.alert(
    t('common.error'),
    err?.response?.data?.message || err?.message || t('common.errorGeneric'),
  );
} finally { setSubmittingX(false); }
```

The 403 branch lands BEFORE the 409 branch (mutually exclusive, but ordering by specificity is the convention). The `finally` block remains — the hook's `resetLoading()` is idempotent with `setSubmittingX(false)`.

### Pattern 5: existing client-side `PermissionDeniedError` catch (RoleManagementScreen reference)

`src/screens/RoleManagementScreen.tsx:147-153` — the canonical client-side catch:
```ts
if (err instanceof PermissionDeniedError || err?.message === 'E_PERMISSION_DENIED') {
  setSelectedUser(null);
  setModalErrorCode(null);
  Alert.alert(t('common.error'), t('errors.permissionDenied'));
  onBack();
  return;
}
```
This is more aggressive than D-04 specifies (it does an `Alert.alert` AND calls `onBack()`). When refactoring through the new hook, keep the existing `Alert.alert(t('errors.permissionDenied'))` IF the planner wants to preserve the screen-specific UX (RoleManagementScreen is admin-only and `onBack()` makes sense; the other 5 surfaces don't have an equivalent) — OR generalize fully. CONTEXT.md D-02 says "refactor through the new shared mechanism," which leans toward generalize-fully. **Recommendation: generalize fully — let RoleManagementScreen drop its bespoke Alert + onBack and rely on the banner-driven recovery, matching the other 5 surfaces.** But flag this as a behavior change in the commit message because it removes a user-visible Alert.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| ObjectId validation (D-15) | `try { new mongoose.Types.ObjectId(id) } catch { ... }` | `mongoose.isValidObjectId(id)` | One function call; returns boolean cleanly; identical to `mongoose.Types.ObjectId.isValid()` (which `favoriteRoutes.js:90` already uses). Both exist on mongoose@9.1.6. [VERIFIED via `node -e` in this session] |
| In-memory Mongo for tests | Spin up local Docker / fixture seed in beforeEach | `mongodb-memory-server@9.5.0` already in devDeps | Existing setup.js handles connect/cleanup/disconnect. Zero new infra. |
| Single-flight refreshRole on 403 | New ad-hoc serializer in the hook | `apiClient.ts` already does this for `code: 'role-revoked'` | Don't replicate. The hook calls `useAuth().refreshRole()` directly; concurrency is naturally handled by AuthContext's `refreshRole` callback shape. |
| 403 detection logic | Custom error class hierarchy | `is403PermissionError(err)` matcher (D-02) | Single boolean check covers PermissionDeniedError instance + 'E_PERMISSION_DENIED' message + axios `err.response.status === 403`. |
| Anti-spoofing detection | Inline grep in supertest | Standalone bash sentinel chained into `npm test` | M2 HF-03 + M3 Phase 3 D-15 precedent; runs as pre-merge gate independent of jest. |
| Migration runner | Custom CLI parser / progress bars | M3 Phase 1 args parsing (`--dry-run` / `--verify=PASS`) | Operator already trained on this exact UX; matches M2 Plan 02-02 + M3 Plan 01-02. |

---

## Common Pitfalls

### Pitfall 1: Editing inside the modal files instead of the parent

**What goes wrong:** The planner puts the 403 catch in `RejectListingModal.tsx` / `ArchiveListingModal.tsx` / `DeleteListingModal.tsx` thinking those are "the surfaces."
**Why it happens:** D-01 lists them as surfaces; reading "modal/screen submit handlers" suggests the modal owns the submit.
**How to avoid:** [VERIFIED — read all 3 modal files] Each modal does `await onSubmit(params)` (or `onConfirm()`) and lets the parent handle errors. The 403 catch lives in the parent. Modal files get ZERO edits in CARRY-01.
**Warning signs:** A task like "edit RejectListingModal handleSubmit." If you see that, the planner has the wrong file.

### Pitfall 2: Using `code === 'role-revoked'` as the 403 matcher

**What goes wrong:** The matcher checks `err?.response?.data?.code === 'role-revoked'` instead of `err?.response?.status === 403`.
**Why it happens:** Backend role-revocation flows through `code: 'role-revoked'` (verifyFirebaseToken.js:85). Tempting to match by code.
**How to avoid:** [VERIFIED in apiClient.ts:159] The interceptor ALREADY catches `code: 'role-revoked'` and silently retries via `refreshRole`. Only AFTER that retry STILL returns 403 does the error reach the caller — and at that point the error is forwarded with whatever code the second response had, OR the user has already been logged out (line 172). The 403 the new hook is meant to catch is `code: 'insufficient-role'` (from `requireMinRole`, verifyFirebaseToken.js:111) — which is NOT covered by the interceptor. Match by status, not code, so both paths land in the new branch.
**Warning signs:** Any task that mentions `code === 'role-revoked'` as the matcher.

### Pitfall 3: Forgetting Node version guard in the migration script

**What goes wrong:** Operator runs the migration on the default shell node v20.19.1; jose@6 (ESM-only) fails to load.
**Why it happens:** Memory `backend-node-version.md` documents this; the M3 Phase 1 migration already has the guard. Easy to forget for a new script.
**How to avoid:** Copy lines 43-48 of `migrate-listings-m3.js` verbatim. Distinct exit code 2 distinguishes Node-version misuse from migration data error (exit 1).
**Warning signs:** Migration script with no `process.versions.node` check at module scope.

### Pitfall 4: Treating diagnostic console.log removal as a test-only artifact

**What goes wrong:** Diagnostic block stays in the route file because "we still want a postmortem trail."
**Why it happens:** D-06 looks like it could be deferred. CONTEXT.md addresses this in `<specifics>`: the sentinel + supertest are the new permanent invariants — the log was a one-shot.
**How to avoid:** Treat D-06 + D-07 + D-08 as one atomic commit (or a tightly-coupled chain). Don't ship the sentinel without removing the log; don't remove the log without adding the supertest.

### Pitfall 5: Migration not idempotent on `'orphaned'` status

**What goes wrong:** Re-running the migration walks `'orphaned'` rows, can't find a phone match, marks them `'orphaned'` again, writes a duplicate audit row.
**Why it happens:** Idempotency check forgets the new enum value.
**How to avoid:** Skip predicate must include `status === 'orphaned'`. Test case: run migration twice; second run must produce 0 audit-row inserts.
**Warning signs:** A migration test missing the "second run inserts 0 audit rows" assertion.

### Pitfall 6: Cross-repo node version trip in CI / agent invocations

**What goes wrong:** Agent runs `npm test` in the backend repo with default node v20; jose@6 fails to import.
**Why it happens:** Memory `backend-node-version.md` — backend declares `engines.node >=22.12.0` but `nvm use 24` is operator-side.
**How to avoid:** Every backend task that runs `npm test` (or any node command) must precede with `nvm use 24` (or equivalent). Document this once per task at the top of the task's actions list.
**Warning signs:** Backend task with bare `npm test` action and no node-version directive.

### Pitfall 7: Verifier missing reviewer-class regressions

**What goes wrong:** `gsd-verifier` returns PASS but `gsd-code-reviewer` finds CRITICAL regressions.
**Why it happens:** Memory `gsd-verifier-misses-regressions.md` — M2 Phase 1 incident; goal-backward verification doesn't catch downstream broken-route surfaces.
**How to avoid:** Treat verifier + reviewer as paired gates. Both must be green (or have explicit fix-status addendum) before phase close. Plan 04 close artifact must include `04-VERIFICATION.md` AND `04-REVIEW.md`.

### Pitfall 8: Hex literals creep back in

**What goes wrong:** New hook / banner / modal edit introduces `color="#FFF"` because the surrounding code already has them.
**Why it happens:** Phase 3 review LW-01 + LW-02 noted existing hex literals in PropertyDetailsScreen and ModerationQueueScreen are M2-era. Phase 4 edits these files; tempting to mirror the existing style.
**How to avoid:** Phase 3 added `colors.onAccent` and `colors.scrim` tokens. Use `colors.onAccent` instead of `'#FFF'` in any new code. CLAUDE.md mandates `useTheme()` tokens.

---

## Code Examples

### Example 1: `is403PermissionError` matcher

```ts
// src/hooks/useModActionGuard.ts
import { useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { PermissionDeniedError } from './useRole';

export const is403PermissionError = (err: any): boolean =>
  err instanceof PermissionDeniedError ||
  err?.message === 'E_PERMISSION_DENIED' ||
  err?.response?.status === 403;

export interface OnPermissionDeniedArgs {
  closeModal: () => void;
  resetLoading: () => void;
}

export interface UseModActionGuardResult {
  is403PermissionError: (err: any) => boolean;
  onPermissionDenied: (args: OnPermissionDeniedArgs) => Promise<void>;
}

export function useModActionGuard(): UseModActionGuardResult {
  const { refreshRole } = useAuth();

  const onPermissionDenied = useCallback(
    async ({ closeModal, resetLoading }: OnPermissionDeniedArgs) => {
      resetLoading();
      closeModal();
      try {
        await refreshRole();
      } catch {
        // Non-fatal — refreshRole already warns; banner driven by AuthContext mutation
      }
    },
    [refreshRole],
  );

  return { is403PermissionError, onPermissionDenied };
}
```
**Source rationale:** D-02 spec verbatim, with the small refinement that `refreshRole` is wrapped in a try/catch (matches existing AuthContext.tsx:181-191 shape — `refreshRole` warns on failure but doesn't throw).

### Example 2: parent-handler wiring (PropertyDetailsScreen.handleApprove)

```ts
// Before (lines 336-367):
const handleApprove = () => {
  Alert.alert(t('moderation.approve.confirmTitle'), t('moderation.approve.confirmMessage'), [
    { text: t('common.cancel'), style: 'cancel' },
    {
      text: t('moderation.action.approve'),
      onPress: async () => {
        if (!property.id) return;
        setSubmittingAction(true);
        try {
          await PropertyService.approveListing(property.id);
          await refetchProperty();
        } catch (err: any) {
          if (err?.response?.status === 409) {
            await handleRaceConflict();
            return;
          }
          Alert.alert(t('common.error'), err?.response?.data?.message || err?.message || t('common.errorGeneric'));
        } finally {
          setSubmittingAction(false);
        }
      },
    },
  ]);
};

// After (delta — 4 added lines, 0 removed):
const { is403PermissionError, onPermissionDenied } = useModActionGuard();  // + add at top of component

const handleApprove = () => {
  Alert.alert(t('moderation.approve.confirmTitle'), t('moderation.approve.confirmMessage'), [
    { text: t('common.cancel'), style: 'cancel' },
    {
      text: t('moderation.action.approve'),
      onPress: async () => {
        if (!property.id) return;
        setSubmittingAction(true);
        try {
          await PropertyService.approveListing(property.id);
          await refetchProperty();
        } catch (err: any) {
          if (is403PermissionError(err)) {
            await onPermissionDenied({
              closeModal: () => {/* this handler has no modal — no-op */},
              resetLoading: () => setSubmittingAction(false),
            });
            return;
          }
          if (err?.response?.status === 409) {
            await handleRaceConflict();
            return;
          }
          Alert.alert(t('common.error'), err?.response?.data?.message || err?.message || t('common.errorGeneric'));
        } finally {
          setSubmittingAction(false);
        }
      },
    },
  ]);
};
```
**Note:** For handlers like `handleApprove` that don't open a modal (use Alert.alert confirm), `closeModal` is a no-op — but the call shape stays uniform across all 10 handlers.

### Example 3: D-07 sentinel (verbatim mirror of M2 HF-03)

```bash
#!/usr/bin/env bash
# scripts/check-no-landlord-uid-spoofing.sh — Phase 4 CARRY-02 D-07.
# Mirrors check-no-actoruid-spoofing.sh (M2 HF-03) and check-property-routes-media-stripped.sh (M3 Phase 3 D-15).
set -u
cd "$(dirname "$0")/.."

echo "== Phase-4 CARRY-02 D-07 anti-spoofing sentinel — uid in landlordApplicationRoutes.js =="

hits=$(grep -nE "uid:\s*req\.(body|headers)" src/routes/landlordApplicationRoutes.js 2>/dev/null || true)
if [ -n "$hits" ]; then
  echo "FAIL: body/headers uid spoof path detected in landlordApplicationRoutes.js:"
  echo "$hits"
  exit 1
fi
echo "OK: landlord-application uid sourced exclusively from req.firebaseUid"
exit 0
```

### Example 4: MD-03 CastError → 400 (DELETE handler scope)

```js
// src/routes/moderationRoutes.js — top of DELETE /listings/:id/media handler (currently line 345)
router.delete('/listings/:id/media', async (req, res) => {
  // MD-03: normalize malformed ObjectId to 400 BAD_REQUEST instead of letting Mongoose
  // CastError bubble to a 500 with leaky internal error message.
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ code: 'INVALID_ID', message: 'Invalid listing id' });
  }
  try {
    // ...existing handler body unchanged...
```
**Note:** `mongoose` is already required at the top of `moderationRoutes.js` [VERIFIED — file uses `mongoose.Types.ObjectId` in atomic update calls]. No new import needed.

### Example 5: D-09 migration classify function (pure, testable)

```js
// src/scripts/migrate-landlord-app-uid-mismatch.js
// Pure function — no DB calls. Takes the application row and the candidate User array.
// Returns the action descriptor; caller maps to mongo writes.
function classifyRow(application, candidateUsers) {
  // candidateUsers: pre-fetched users matching application.phone (case-sensitive — matches existing schema String type)
  // The hit-skip case (application.uid resolves to a real User) is determined OUTSIDE this function;
  // this function is only called when the uid did NOT resolve.

  const otherMatches = candidateUsers.filter(u => u.uid !== application.uid);
  if (otherMatches.length === 1) {
    return { kind: 'phone-match-flip', newUid: otherMatches[0].uid };
  }
  // 0 matches OR 2+ matches → orphan-mark
  return { kind: 'orphan-mark', reason: otherMatches.length === 0 ? 'no-phone-match' : 'ambiguous-phone-match' };
}

module.exports = { classifyRow };
```
**Test shape:** `classifyRow` is unit-testable in isolation; the integration test exercises the full DB walk via `mongodb-memory-server`.

---

## Runtime State Inventory

This is a code-and-data-fix phase. Most categories are not in scope, but the planner needs to confirm explicitly.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | **MongoDB Atlas — `landlord_applications` collection has rows with mismatched uid (verified incident report `phase45-landlord-application-uid-mismatch-bug.md`).** Repair migration phone-match-flips repairable rows, marks rest as `'orphaned'`. | Operator-supervised migration run (D-11) |
| Stored data | **MongoDB Atlas — `landlord_application_audit_log` collection** gains 2 new audit-row shapes (`'uid-repair'` + `'uid-orphan-mark'`). Append-only — no migration of existing rows | None (new rows only) |
| Live service config | None — Phase 4 doesn't touch n8n / Datadog / Cloudflare / Tailscale | None — verified by reviewing CONTEXT.md scope |
| OS-registered state | None — no Task Scheduler / pm2 / systemd / launchd implications | None |
| Secrets/env vars | None — no key changes; existing `AWS_*` + `MONGO_URI` + `FIREBASE_PROJECT_ID` unchanged | None |
| Build artifacts | **`scripts/check-no-landlord-uid-spoofing.sh` becomes a permanent npm-test-chain dependency.** Operators running `npm test` in CI/locally pick it up automatically via the package.json edit. | Document in commit message; no per-machine artifact rebuild needed |
| Build artifacts | **Railway log archive — diagnostic `evt: 'landlord_application_submit'` JSON entries from 2026-04-30 → 2026-05-06.** Operator-discretion archival/grep for postmortem (deferred per CONTEXT.md `<deferred>`). | None — non-code, operator opt-in |

**Net runtime impact:** One operator migration run (Atlas `landlord_applications` collection); no other runtime systems touched.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node ≥22.12 (`nvm use 24`) | Backend tests + migration script | Operator-side | 22.x via nvm | Migration script exits with code 2 if invoked under <22 |
| `mongodb-memory-server` | Backend supertests + migration test | ✓ devDep | 9.5.0 | None needed |
| `supertest` | Backend supertests | ✓ devDep | 7.1.4 | None needed |
| `jest` | Both repos test runners | ✓ | 29.7.0 backend / 29.6.3 RN | None |
| `mongoose.isValidObjectId` | MD-03 D-15 CastError → 400 | ✓ runtime | 9.1.6 | `mongoose.Types.ObjectId.isValid` (equivalent; existing usage at `favoriteRoutes.js:90`) |
| `bash scripts/check-i18n-parity.sh` | RN client D-13 / MD-01 commit | ✓ | n/a | None (script in tree) |
| `bash scripts/check-no-actoruid-spoofing.sh` | Backend baseline (regression check) | ✓ | n/a | None |
| `bash scripts/check-property-routes-media-stripped.sh` | Backend baseline + D-16 / MD-04 | ✓ | n/a | None |
| MongoDB Atlas access (live migration) | D-11 operator run | Operator-side | n/a | --dry-run first (always) |

[VERIFIED in this session:
- `node -e` confirmed `mongoose.isValidObjectId` and `mongoose.Types.ObjectId.isValid` both function on the installed mongoose@9.1.6
- `bash scripts/check-property-routes-media-stripped.sh` exit code 0 against current `propertyRoutes.js`
- `grep -nE "require\(['\"]multer|from ['\"]multer|upload\.array|multerS3" src/routes/propertyRoutes.js` returns NO MATCH (MD-04 regex tighten verified safe)
- `package.json` shows `mongodb-memory-server@9.5.0` + `supertest@7.1.4` in devDeps]

**Missing dependencies with no fallback:** None.
**Missing dependencies with fallback:** None.

---

## Validation Architecture

### Test Framework

| Property | RN client | Backend |
|----------|-----------|---------|
| Framework | jest 29.6.3 | jest 29.7.0 |
| Config file | `jest.config.js` | `jest.config.cjs` |
| Quick run command | `npm test` (root) | `nvm use 24 && npm test` (backend) |
| Full suite command | `npm test -- --watchAll=false` | `nvm use 24 && npm test` |
| Setup file | none (per-test mocks) | `src/__tests__/setup.js` (mongo-memory bootstrap) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CARRY-01 | All 10 parent handlers route 403 to `is403PermissionError` matcher | grep gate (acceptance) | `grep -cE "is403PermissionError\(err\)" src/screens/ModerationQueueScreen.tsx src/screens/PropertyDetailsScreen.tsx src/screens/RoleManagementScreen.tsx` (expects 10) | n/a (grep) |
| CARRY-01 | Hook helper functions (matcher + onPermissionDenied) behave correctly | unit | `npx jest --testPathPattern=useModActionGuard` | ❌ Wave 0 — `src/hooks/__tests__/useModActionGuard.test.ts` |
| CARRY-01 | Canonical RTL surface — RejectListingModal consumer's parent handler closes modal + calls refreshRole on mocked 403 | RTL smoke | `npx jest --testPathPattern=PropertyDetailsScreen.handleRejectSubmit` (or screen-level) | ❌ Wave 0 — extend `src/screens/__tests__/PropertyDetailsScreen.test.tsx` (file does not exist) OR a new `src/screens/__tests__/PropertyDetailsScreen-mod-403.test.tsx` |
| CARRY-02 | Backend body-spoof rejection: POST with body `{ uid: 'attacker-uid' }` lands `req.firebaseUid` into Mongo | supertest | `nvm use 24 && npx jest --testPathPattern=landlordApplicationRoutes` | ❌ Wave 0 — `src/__tests__/landlordApplicationRoutes.test.js` |
| CARRY-02 | Backend no-bearer rejection: POST with no Authorization → 401 | supertest | same | ❌ Wave 0 (same file) |
| CARRY-02 | Backend happy-path uid match | supertest | same | ❌ Wave 0 (same file) |
| CARRY-02 | Sentinel binary check | bash exit code | `bash scripts/check-no-landlord-uid-spoofing.sh; echo $?` (expect 0) | ❌ Wave 0 — `scripts/check-no-landlord-uid-spoofing.sh` |
| CARRY-02 | Migration `--dry-run` writes nothing | spawn integration | `nvm use 24 && npx jest --testPathPattern=migrate-landlord-app-uid-mismatch` | ❌ Wave 0 — `src/__tests__/migrate-landlord-app-uid-mismatch.test.js` |
| CARRY-02 | Migration hit-skip branch | spawn integration | same | ❌ Wave 0 (same file) |
| CARRY-02 | Migration phone-match-flip branch + audit row | spawn integration | same | ❌ Wave 0 (same file) |
| CARRY-02 | Migration orphan-mark branch + audit row + status flip | spawn integration | same | ❌ Wave 0 (same file) |
| CARRY-02 | Migration idempotency (second run = 0 audit rows) | spawn integration | same | ❌ Wave 0 (same file) |
| CARRY-02 | Manual physical-device walk on iPhone 15 Pro Max | manual | n/a | Captured in `04-HUMAN-UAT.md` |
| MD-01 | EN+RU parity after split-key swap | bash exit code | `bash scripts/check-i18n-parity.sh; echo $?` (expect 0) | ✓ existing |
| MD-01 | TypeScript narrowness on `t()` keys | tsc | `npx tsc --noEmit` (RN client) | ✓ existing |
| MD-03 | DELETE `/listings/:id/media` with malformed ObjectId → 400 (not 500) | supertest | `nvm use 24 && npx jest --testPathPattern=moderationRoutes` (extend) | ✓ existing — extend `src/__tests__/moderationRoutes.test.js` |
| MD-04 | Sentinel still exits 0 after regex tighten | bash exit code | `bash scripts/check-property-routes-media-stripped.sh; echo $?` (expect 0) | ✓ existing |

### Sampling Rate

- **Per task commit:** Run only the affected test file (e.g., `npx jest --testPathPattern=useModActionGuard`).
- **Per wave merge:** Full suite both repos (`nvm use 24 && npm test` in backend; `npm test` in RN client).
- **Phase gate:** All sentinels green; both repo full suites green; paired-gate verifier+reviewer cleared.

### Sampling Envelopes (per CONTEXT.md focus question 10)

**Envelope A — 403 catch path on each of the 10 handlers (CARRY-01):**

The Nyquist sampling principle says: sample frequently enough to reconstruct the signal. The "signal" here is "did the 403 land at the matcher and route to onPermissionDenied?"

| Sample point | Cadence | Signal |
|--------------|---------|--------|
| Static — grep gate | every commit on RN client chain | counts `is403PermissionError(err)` occurrences across 3 files; expects 10 |
| Static — TS check | every RN client commit | tsc --noEmit; expects 0 new errors |
| Dynamic — RTL smoke (canonical surface only) | every commit on RN client chain | exercises 1 of 10 handlers end-to-end with mocked axios 403 |
| Dynamic — manual iPhone walk | once per phase | exercises ≥3 handlers (recommend approve + reject + role-change) on real device |

The grep gate is the cheapest, highest-frequency check — it catches "forgot to wire one of the 10." The RTL smoke catches "wired but the hook returns/closure shape is wrong." The manual walk catches "everything passes but UX feels wrong."

**Envelope B — migration's three branches + idempotency (CARRY-02 D-09 + D-11):**

| Sample point | Cadence | Signal |
|--------------|---------|--------|
| Unit — `classifyRow()` pure-function | every backend commit on chain | branches: hit-skip / phone-match-flip / orphan-mark / ambiguous |
| Integration — `--dry-run` mode | every backend commit on chain | DB writes = 0 |
| Integration — hit-skip branch | same | row uid unchanged; no audit row written |
| Integration — phone-match-flip branch | same | row.uid → newUid; audit row with `action: 'uid-repair'` |
| Integration — orphan-mark branch | same | row.status → 'orphaned'; audit row with `action: 'uid-orphan-mark'` |
| Integration — ambiguous-phone branch (2+ matches) | same | row.status → 'orphaned'; audit row reason captures ambiguity |
| Integration — idempotency | same | second run = 0 audit-row inserts; status table unchanged |
| Operator — `--dry-run` against live Atlas | once before live run | summary counts make sense |
| Operator — `--verify=PASS` against live Atlas | once | exit code 0; final counts match dry-run forecast |

**Envelope C — sentinel exit-code semantics (CARRY-02 D-07 + MD-04 D-16):**

| Sample point | Cadence | Signal |
|--------------|---------|--------|
| Pre-merge — D-07 sentinel | every backend commit | exit 0 against post-fix tree |
| Pre-merge — D-07 sentinel against synthetic regression | once during plan validation | exit 1 if `uid: req.body` is reintroduced |
| Pre-merge — MD-04 tightened sentinel | every backend commit | exit 0 against post-fix tree |
| Pre-merge — MD-04 sentinel against synthetic regression | once during plan validation | exit 1 if `require('multer')` is reintroduced |
| Pre-merge — npm test chain | every backend commit | all 3 sentinels in chain green BEFORE jest invoked |

### Wave 0 Gaps

The following files MUST be created in Wave 0 of the phase (before any executable test sampling can happen):

- [ ] `src/hooks/useModActionGuard.ts` — hook + helper (CARRY-01)
- [ ] `src/hooks/__tests__/useModActionGuard.test.ts` — unit tests for the matcher + hook
- [ ] `src/screens/__tests__/PropertyDetailsScreen-mod-403.test.tsx` — RTL canonical surface (or extend an existing test if the planner picks `RejectListingModal` consumer there)
- [ ] `backend/scripts/check-no-landlord-uid-spoofing.sh` — sentinel script (CARRY-02 D-07)
- [ ] `backend/src/__tests__/landlordApplicationRoutes.test.js` — supertest cases (CARRY-02 D-08); does NOT exist today
- [ ] `backend/src/scripts/migrate-landlord-app-uid-mismatch.js` — repair migration (CARRY-02 D-09 + D-11)
- [ ] `backend/src/__tests__/migrate-landlord-app-uid-mismatch.test.js` — migration test
- [ ] Schema file edits: `backend/src/models/LandlordApplication.js` (status enum), `backend/src/models/LandlordApplicationAuditLog.js` (action enum), `backend/package.json` (npm test chain), `backend/scripts/check-property-synchroutes-media-stripped.sh:8` (regex), `backend/src/routes/moderationRoutes.js:21-28` + DELETE handler (D-15 + D-14)
- [ ] RN client edits: 10 parent-handler call sites (3 files)
- [ ] i18n key swap: `src/locales/en.ts:744` + `src/locales/ru.ts:738` (MD-01); add `'tooManyFiles'` key in both if planner picks split

---

## Open Decisions for Planner

These are CONTEXT.md "Claude's Discretion" items. Recommendations below are evidence-backed where possible.

### 1. Migration audit-log enum value(s)

**Recommendation:** Add **two** values: `'uid-repair'` (phone-match flip) and `'uid-orphan-mark'` (orphan-mark fallback).
**Why:** The two branches have different semantics — flipping a uid is a data correction; marking orphaned is a data quarantine. Splunk/Datadog operators querying the audit log will need to distinguish. Adding 2 enum values is identical in cost to adding 1 (one Mongoose schema diff line either way). Existing M2 enum is `['submit', 'approve', 'reject', 'withdraw']` so 2 additions extends to 6 values total — still small.
**Risk if wrong:** Low. If you collapse to 1 value (`'uid-repair'` for both), audit consumers can still filter by `before` / `after` snapshot to distinguish. Re-running with a more specific enum value later is a 1-line schema diff.

### 2. D-15 (MD-03) CastError → 400 scope

**Recommendation:** **DELETE-only** (`DELETE /listings/:id/media` at `moderationRoutes.js:345-404`).
**Why:** CONTEXT.md explicitly suggests DELETE-only for "scope hygiene"; defer the broader pattern. The other handlers (`POST /listings/:id/media`, `POST /properties/:id/approve`) have the same shape today but Phase 4 is bug-fix-only — broadening scope creeps into hardening. Phase 5 owns hardening.
**Risk if wrong:** Low. The two non-DELETE handlers leak Mongoose CastError messages on 500 today; that's a documentation/UX issue, not a security one. Phase 5 can sweep them.

### 3. D-13 (MD-01) i18n key shape

**Recommendation:** **Split into two keys** (`error.tooLarge` + `error.tooManyFiles`) and dispatch on `code` in `MediaCurationScreen.tsx:325-333`.
**Why:** Backend emits two distinct multer error codes (`LIMIT_FILE_SIZE` vs `LIMIT_FILE_COUNT`); the original "Max 25 MB per file, 45 MB total" string conflated them. Future error-code surfaces will want clean 1:1 mapping. The dispatch site (lines 325-333) already has the `if/else` shape — adding one more `else if` is trivial.
**Risk if wrong:** Negligible. If you keep single-key, the rewritten string ("Max 25 MB per file, up to 45 files per upload.") is still accurate; you just lose the per-code precision.

### 4. Migration test fixture

**Recommendation:** Use **`mongodb-memory-server`** (already in devDeps; already wired in `setup.js`).
**Why:** Zero new infra. The existing `migrate-listings-m3.test.js` already uses `mongodb-memory-server` for both helper-unit and spawn-integration tests. Mirror that pattern.
**Risk if wrong:** None — explicit fixture seed in beforeEach works too, but doubles the boilerplate.

### 5. `requireBearer` audit on read paths

**Recommendation:** Add a **defensive comment only** to `getMine` (line 152) and admin queue (line 212) noting the dual-accept window is retained on read paths and the post-fix invariant ("write paths source uid from req.firebaseUid only") doesn't change read-path semantics.
**Why:** No behavioral change requested or needed. The dual-accept on reads was an explicit decision in commit `768e629`; Phase 4 doesn't touch it. A 2-3 line comment helps future auditors.
**Risk if wrong:** None.

### 6. Canonical RTL surface for the 403 smoke test

**Recommendation:** **`PropertyDetailsScreen.handleRejectSubmit`** (parent of RejectListingModal). This exercises the most common production scenario — mod opens reject modal, types reason, taps submit, gets 403.
**Why:** ModerationQueueScreen.handleRejectSubmit is structurally identical but its surface (a list screen) is harder to set up in a test renderer. PropertyDetailsScreen is a single-property surface; mock the property + the PropertyService.rejectListing, mount, simulate submit, assert close + refreshRole called.
**Risk if wrong:** Low — the hook is identical across all 10 surfaces; any surface validates the matcher + close + refreshRole interaction.

### 7. RoleManagementScreen behavior delta

**Recommendation:** Generalize fully — drop the bespoke `Alert.alert(t('errors.permissionDenied'))` + `onBack()` in favor of the banner-driven flow.
**Why:** D-02 says "refactor through the new shared mechanism." Keeping the bespoke Alert + onBack defeats the consolidation. Banner-driven flow is consistent with the other 5 surfaces.
**Risk if wrong:** Medium-low — admins may notice the slightly-different recovery UX. Document the change in commit message; flag for the manual physical-device walk in `04-HUMAN-UAT.md`.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Per-screen 403 catch boilerplate | Shared `useModActionGuard` hook + matcher | Phase 4 (this) | DRY consolidation; future tuning of recovery UX = 1 file edit |
| Inline grep in supertests | Standalone bash sentinel chained into `npm test` | M2 HF-03 (precedent); applied here for landlord routes | Pre-merge gate independent of jest |
| Diagnostic console.log left in route handler | Sentinel + supertest as permanent invariants | Phase 4 (D-06 + D-07 + D-08) | Defense-in-depth via static + dynamic + runtime checks |
| Mongoose `CastError` → 500 leak | `mongoose.isValidObjectId()` pre-check → 400 with code | MD-03 (this) | Cleaner client-side error semantics |

**Deprecated/outdated:**
- `evt: 'landlord_application_submit'` diagnostic log block (`landlordApplicationRoutes.js:111-123`) — removed in this phase; future-equivalent observability lives in the audit log via `LandlordApplicationAuditLog`.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | RoleManagementScreen.handleRoleSubmit's `Alert.alert(t('errors.permissionDenied'))` + `onBack()` should be dropped in favor of the banner-driven flow | Patterns to Replicate §5; Open Decisions §7 | Admin users may notice missing Alert. Mitigation: explicit task note + manual UAT call-out. Easily reverted if planner / user pushes back |
| A2 | Mod-archive recovery on iPhone via the banner is acceptable UX (no separate confirmation Alert) | Open Decisions §7 | Same as A1. The banner is already live since Phase 1 ROLE-10; users are trained on its meaning |
| A3 | Anyone running the migration script will have `nvm use 24` runnable — i.e., node >=22.12 is installable on the operator's machine | Pitfalls §3, §6 | If false, the migration exits with code 2; operator-facing error is clear |
| A4 | The `'orphaned'` enum value will not be filtered to a non-admin user as a `getMine` row | Surface Map; Locked Decisions D-10 | If a user's User-doc was deleted AND their LandlordApplication exists with their old uid, `'orphaned'` MIGHT surface to them on subsequent re-login. Defensive client comment recommended |

If items here surface during planning that planner is not comfortable with, kick to discuss-phase for user confirmation before locking.

---

## Open Questions

None — all CONTEXT.md decisions are concrete, all in-tree references verified, all tooling confirmed available, all line numbers pinpointed in this session. The remaining "open decisions" listed above are all CONTEXT.md-blessed planner-discretion items, not unresolved unknowns.

---

## Cheatsheet

### Backend (npm test chain after Phase 4 commits)

```bash
nvm use 24
cd /Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services
npm test
# Runs (in order):
#   bash scripts/check-no-actoruid-spoofing.sh
#   bash scripts/check-no-landlord-uid-spoofing.sh   <-- new D-07
#   bash scripts/check-property-routes-media-stripped.sh   <-- regex tightened by D-16
#   jest --config jest.config.cjs   <-- includes new landlordApplicationRoutes.test.js + migrate-landlord-app-uid-mismatch.test.js
```

### Backend manual operator migration

```bash
nvm use 24
cd /Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services
node src/scripts/migrate-landlord-app-uid-mismatch.js --dry-run         # preview, no writes
node src/scripts/migrate-landlord-app-uid-mismatch.js                   # live run
node src/scripts/migrate-landlord-app-uid-mismatch.js --verify=PASS     # acceptance check (exit 0 = PASS, exit 1 = FAIL, exit 2 = misuse)
```

### RN client gates

```bash
cd /Users/beckmaldinVL/development/mobileApps/JayTap
bash scripts/check-i18n-parity.sh    # MD-01 EN+RU lockstep
npx tsc --noEmit                     # type narrowness on t() keys
npm test                             # jest 29.6.3 (run all RTL smoke + units)
```

### Acceptance grep patterns (planner pastes verbatim into tasks)

**CARRY-01 — 10 handlers wired through new matcher:**
```bash
grep -nE "is403PermissionError\(err\)" \
  src/screens/ModerationQueueScreen.tsx \
  src/screens/PropertyDetailsScreen.tsx \
  src/screens/RoleManagementScreen.tsx
# Expected: 10 hits
```

**CARRY-02 D-06 diagnostic removed:**
```bash
grep -n "landlord_application_submit" /Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/routes/landlordApplicationRoutes.js
# Expected: NO MATCH
```

**CARRY-02 D-07 sentinel exit code:**
```bash
cd /Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services
bash scripts/check-no-landlord-uid-spoofing.sh; echo "EXIT: $?"
# Expected: EXIT: 0
```

**MD-04 D-16 sentinel still green after tightening:**
```bash
cd /Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services
grep -nE "require\(['\"]multer|from ['\"]multer|upload\.array|multerS3" src/routes/propertyRoutes.js
# Expected: NO MATCH (verified in this research session)
```

**MD-01 i18n parity:**
```bash
cd /Users/beckmaldinVL/development/mobileApps/JayTap
bash scripts/check-i18n-parity.sh; echo "EXIT: $?"
# Expected: EXIT: 0
```

### Backend file paths (verbatim — operator copy-paste)

```
/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/scripts/check-no-actoruid-spoofing.sh   (existing — D-07 mirrors this)
/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/scripts/check-no-landlord-uid-spoofing.sh   (NEW)
/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/scripts/check-property-routes-media-stripped.sh   (existing — D-16 tightens line 8)
/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/routes/landlordApplicationRoutes.js   (D-06 lines 111-123 deletion; sentinel scope file)
/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/routes/moderationRoutes.js   (D-14 comment; D-15 DELETE handler at 345)
/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/__tests__/landlordApplicationRoutes.test.js   (NEW — does not exist)
/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/__tests__/migrate-landlord-app-uid-mismatch.test.js   (NEW)
/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/scripts/migrate-landlord-app-uid-mismatch.js   (NEW)
/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/models/LandlordApplication.js   (D-10 enum extension line 11)
/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/models/LandlordApplicationAuditLog.js   (D-09 audit-action enum extension line 12)
/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/package.json   (D-07 npm test chain extension line 10)
```

### RN client file paths

```
/Users/beckmaldinVL/development/mobileApps/JayTap/src/hooks/useModActionGuard.ts   (NEW — D-02)
/Users/beckmaldinVL/development/mobileApps/JayTap/src/hooks/__tests__/useModActionGuard.test.ts   (NEW)
/Users/beckmaldinVL/development/mobileApps/JayTap/src/hooks/useRole.ts   (existing — PermissionDeniedError class line 33; reference only)
/Users/beckmaldinVL/development/mobileApps/JayTap/src/screens/ModerationQueueScreen.tsx   (handlers at lines 209-241, 243-270, 391-427, 429-464)
/Users/beckmaldinVL/development/mobileApps/JayTap/src/screens/PropertyDetailsScreen.tsx   (handlers at lines 336-367, 369-389, 398-417, 423-453, 458-476)
/Users/beckmaldinVL/development/mobileApps/JayTap/src/screens/RoleManagementScreen.tsx   (handler at lines 135-177)
/Users/beckmaldinVL/development/mobileApps/JayTap/src/screens/MediaCurationScreen.tsx   (MD-01 dispatch site lines 325-333)
/Users/beckmaldinVL/development/mobileApps/JayTap/src/locales/en.ts   (line 744)
/Users/beckmaldinVL/development/mobileApps/JayTap/src/locales/ru.ts   (line 738)
/Users/beckmaldinVL/development/mobileApps/JayTap/src/components/RoleRefreshBanner.tsx   (existing — reference only; auto-surfaces after refreshRole)
/Users/beckmaldinVL/development/mobileApps/JayTap/src/context/AuthContext.tsx   (existing — refreshRole at line 181 returns Promise<void>)
/Users/beckmaldinVL/development/mobileApps/JayTap/src/services/apiClient.ts   (existing — interceptor handles role-revoked code; new hook covers insufficient-role 403)
```

---

## Sources

### Primary (HIGH confidence)

- `.planning/phases/04-m2-carry-forward-bug-fixes/04-CONTEXT.md` — verbatim CONTEXT.md (D-01..D-18); read in full
- `.planning/phases/03-media-flow-inversion-admin-mod-curation/03-REVIEW.md` — MD-01..MD-04 source; read in full
- In-tree code reads (this session, all VERIFIED):
  - `src/screens/ModerationQueueScreen.tsx` (lines 180-480)
  - `src/screens/PropertyDetailsScreen.tsx` (lines 320-480, 1500-1700)
  - `src/screens/RoleManagementScreen.tsx` (lines 100-220)
  - `src/components/RejectListingModal.tsx` (full)
  - `src/components/ArchiveListingModal.tsx` (full)
  - `src/components/DeleteListingModal.tsx` (full)
  - `src/components/RoleRefreshBanner.tsx` (full)
  - `src/hooks/useRole.ts` (full)
  - `src/services/PropertyService.ts` (lines 200-430)
  - `src/services/apiClient.ts` (lines 1-182)
  - `src/screens/__tests__/MediaCurationScreen.test.tsx` (lines 1-80)
  - `src/screens/MediaCurationScreen.tsx` (lines 325-345)
  - `src/locales/en.ts` (lines 740-749)
  - `scripts/check-i18n-parity.sh` (full)
- Backend in-tree reads (this session, all VERIFIED):
  - `src/routes/landlordApplicationRoutes.js` (full — 302 lines)
  - `src/routes/moderationRoutes.js` (lines 15-50)
  - `src/middleware/verifyFirebaseToken.js` (lines 60-170)
  - `src/models/LandlordApplication.js` (full)
  - `src/models/LandlordApplicationAuditLog.js` (full)
  - `src/__tests__/setup.js` (full)
  - `src/__tests__/moderationRoutes.test.js` (lines 1-90)
  - `src/__tests__/migrate-listings-m3.test.js` (lines 1-100)
  - `src/scripts/migrate-listings-m3.js` (lines 1-120)
  - `scripts/check-no-actoruid-spoofing.sh` (full)
  - `scripts/check-property-routes-media-stripped.sh` (full)
  - `package.json` (full)
- Tool runs (this session, all VERIFIED):
  - `node -e` confirmed mongoose@9.1.6 exposes both `mongoose.isValidObjectId` and `mongoose.Types.ObjectId.isValid` as functions; both return correct booleans
  - `bash scripts/check-property-routes-media-stripped.sh` exit 0
  - `grep -nE "require\(['\"]multer|from ['\"]multer|upload\.array|multerS3" src/routes/propertyRoutes.js` NO MATCH (MD-04 tighten safe)

### Secondary (MEDIUM confidence)

- Memory pointers (cited from project memory; assumed accurate but not re-verified in this session):
  - `phase06-m3-carry-forward.md` — origin context for CARRY-01 + CARRY-02
  - `phase45-landlord-application-uid-mismatch-bug.md` — incident report; commit `768e629` confirmed in CONTEXT.md
  - `gsd-verifier-misses-regressions.md` — paired-gate mandate
  - `backend-node-version.md` — `nvm use 24` requirement
  - `identity-vs-user-store.md` — Firebase = identity; Mongo = role authority

### Tertiary (LOW confidence)

None — all critical claims verified directly in-session.

---

## Metadata

**Confidence breakdown:**
- Surface map line numbers: HIGH — read each file in this session
- Backend test infra availability: HIGH — verified package.json + setup.js + tool runs
- 403 interceptor scope (`role-revoked` vs `insufficient-role`): HIGH — read apiClient.ts:159 + verifyFirebaseToken.js:85,111
- Mongoose 9.1.6 isValidObjectId: HIGH — verified via `node -e`
- MD-04 tightened regex safety: HIGH — verified via `grep` dry-run
- M2 HF-03 sentinel pattern: HIGH — read in full
- M3 Phase 1 migration pattern: HIGH — read first 120 LOC
- Landlord-app supertest file does NOT exist: HIGH — `ls __tests__/` showed no match
- A1/A2 RoleManagementScreen behavior delta: MEDIUM — recommendation; needs planner buy-in

**Research date:** 2026-05-06
**Valid until:** 2026-06-05 (30 days — stable code; no library churn anticipated)

---

## RESEARCH COMPLETE

**Phase:** 4 — M2 Carry-Forward Bug Fixes
**Confidence:** HIGH

### Key Findings

- **3 of the 6 "surfaces" are presentational only** — `RejectListingModal` / `ArchiveListingModal` / `DeleteListingModal` get ZERO edits in CARRY-01. The 403 catch lives in 10 parent-handler call sites across 3 files (ModerationQueueScreen, PropertyDetailsScreen, RoleManagementScreen).
- **The new matcher must use `err?.response?.status === 403`, not the response code.** apiClient already auto-handles `code: 'role-revoked'` 403s via single-flight retry; the new hook covers the `code: 'insufficient-role'` 403 path that flows through to caller catches.
- **Backend test infra is fully ready** — `mongodb-memory-server@9.5.0`, `supertest@7.1.4`, JWKS fixtures, and shared `setup.js` are all in tree. `landlordApplicationRoutes.test.js` does NOT exist yet — D-08 implicitly creates it.
- **All sentinels and regex tightenings verified safe via tool runs in this session** — MD-04 tighter regex produces no match on the current `propertyRoutes.js`; mongoose@9.1.6 exposes `isValidObjectId` correctly; D-07 sentinel pattern mirrors HF-03 with a 4-line delta.
- **Two atomic chains, backend-first, exactly as D-17 specifies.** Backend chain has 3 logical commits (sentinel + supertest + diagnostic removal; MD-02..MD-04 fold; repair migration). RN chain has 2 logical commits (hook + 10-handler sweep + RTL smoke; MD-01 i18n). No surprises, no version churn, no infra additions.

### File Created

`/Users/beckmaldinVL/development/mobileApps/JayTap/.planning/phases/04-m2-carry-forward-bug-fixes/04-RESEARCH.md`

### Confidence Assessment

| Area | Level | Reason |
|------|-------|--------|
| Surface map (line numbers) | HIGH | Every file read this session |
| Patterns to replicate | HIGH | All in-tree precedents read in full |
| Pitfalls | HIGH | Cross-checked against project memories + apiClient code |
| Don't hand-roll | HIGH | Tool-verified (mongoose API, mongo-memory-server, sentinel regex) |
| Validation architecture | HIGH | Sampling envelopes mapped to existing test infra |
| Open decisions | MEDIUM | Recommendations are evidence-backed but planner has final pick |

### Open Questions

None unresolved. The 7 "Open Decisions for Planner" items are CONTEXT.md-blessed discretionary picks, each with a recommendation.

### Ready for Planning

Research complete. Planner can now create PLAN.md files with confidence — all line numbers, file paths, and tool commands are verbatim-paste-ready.

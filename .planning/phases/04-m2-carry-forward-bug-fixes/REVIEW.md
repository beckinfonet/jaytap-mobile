---
phase: 04-m2-carry-forward-bug-fixes
reviewed: 2026-05-07T00:00:00Z
depth: deep
files_reviewed: 17
files_reviewed_list:
  - src/hooks/useModActionGuard.ts
  - src/hooks/__tests__/useModActionGuard.test.tsx
  - src/screens/ModerationQueueScreen.tsx
  - src/screens/PropertyDetailsScreen.tsx
  - src/screens/RoleManagementScreen.tsx
  - src/screens/__tests__/PropertyDetailsScreen-mod-403.test.tsx
  - src/screens/__tests__/ModerationQueueScreen.test.tsx
  - src/locales/en.ts
  - src/locales/ru.ts
  - src/screens/MediaCurationScreen.tsx
  - backend: src/scripts/migrate-landlord-app-uid-mismatch.js
  - backend: src/routes/landlordApplicationRoutes.js
  - backend: src/routes/moderationRoutes.js
  - backend: src/models/LandlordApplication.js
  - backend: src/models/LandlordApplicationAuditLog.js
  - backend: scripts/check-no-landlord-uid-spoofing.sh
  - backend: scripts/check-property-routes-media-stripped.sh
findings:
  critical: 0
  high: 0
  medium: 2
  low: 2
  total: 4
status: issues_found
verdict: GREEN
---

# Phase 4: Code Review Report — M2 Carry-Forward Bug Fixes

**Reviewed:** 2026-05-07
**Depth:** deep (cross-file, cross-repo)
**Files Reviewed:** 17 (10 RN client, 7 backend)
**Status:** issues_found
**Verdict:** GREEN — no CRITICAL or HIGH issues. Two MEDIUMs and two LOWs, all carry-forward candidates.

---

## Summary

Phase 4 delivered five sub-plans across two repos: CARRY-01 (mid-action 403 recovery), CARRY-02 (uid-mismatch fix + migration), MD-01 (i18n key split), MD-02 (route comment disambiguation), MD-03 (ObjectId 400 pre-check), and MD-04 (tightened media sentinel). 

All three security-critical invariants were verified to pass:
- `check-no-landlord-uid-spoofing.sh` — PASS (no `uid: req.body.*` or `uid: req.headers.*` in landlordApplicationRoutes.js)
- `check-no-actoruid-spoofing.sh` — PASS (actorUid sourced exclusively from req.firebaseUid in moderationRoutes.js)
- `check-property-routes-media-stripped.sh` — PASS (propertyRoutes.js contains no multer references)

The uid-spoof fix is intact: `LandlordApplication.create({ uid: req.firebaseUid, ... })` at landlordApplicationRoutes.js:112 ignores any `firebaseUid` value from req.body. The D-08 supertest covers the body-spoof, auth-missing, and happy-path cases.

The 11 mod-action handlers are correctly wired through `useModActionGuard`. All five handlers in PropertyDetailsScreen and four in ModerationQueueScreen follow the 403 > 409 > generic precedence pattern with correct `closeModal` and `resetLoading` closure mappings. RoleManagementScreen drops the two bespoke `instanceof PermissionDeniedError` + `onBack()` branches in favor of the unified banner flow.

The migration script is well-structured: idempotent, cursor-based, exports pure helpers for unit testing, and the 10 test cases cover all classification branches including the edge-case where the broken uid happens to match a User by coincidence.

i18n parity confirmed: EN and RU both carry `error.tooLarge` (25 MB per file) and `error.tooManyFiles` (45 files per upload) with consistent numbers.

---

## Critical Issues

None.

---

## High Issues

None.

---

## Medium Issues

### MD-01: `--verify=PASS` performs live writes before running the acceptance probe

**File:** `backend: src/scripts/migrate-landlord-app-uid-mismatch.js:195-239`

**Issue:** When the operator runs `node src/scripts/migrate-landlord-app-uid-mismatch.js --verify=PASS`, the script sets `isVerify=true` and `isDryRun=false`. The `main()` function then executes the full cursor walk with `processApplication(app, { dryRun: false })` — live mode — before reaching the verify probe at line 221. This means `--verify=PASS` is NOT a pure read probe; it performs all uid-repair and orphan-mark writes first, then checks the invariant.

The sibling script (`migrate-listings-m3.js`) does the opposite: it exits early inside `if (isVerify)` before any mutation loop, making `--verify=PASS` a read-only acceptance check. The header comment claims this script mirrors the sibling's `--verify exit codes + ... skeleton`, which a reader would interpret as `--verify=PASS` being idempotent.

If the migration has already been run successfully, this is harmless (idempotency guards skip all rows). But on a fresh production database, running `--verify=PASS` expecting a dry probe would silently trigger all repairs.

**Fix:** Either (a) add an early-exit verify path that skips the cursor walk, matching the sibling:

```javascript
async function main() {
  await connectDB();

  if (isVerify) {
    // Pure probe — no writes.
    const submittedApps = await LandlordApplication.find({ status: 'submitted' });
    let unresolved = 0;
    for (const app of submittedApps) {
      const owner = await User.findOne({ uid: app.uid });
      if (!owner) unresolved++;
    }
    if (unresolved === 0) {
      console.log('VERIFY=PASS: all submitted applications have a resolvable uid.');
      await mongoose.disconnect();
      process.exit(0);
    }
    console.error(`VERIFY=FAIL: ${unresolved} submitted application(s) have unresolvable uid.`);
    await mongoose.disconnect();
    process.exit(1);
  }
  // ... rest of cursor walk
}
```

Or (b) add a comment above the cursor walk explicitly noting that `--verify=PASS` also executes live writes (intentional deviation from sibling pattern), so the next operator is not surprised.

---

### MD-02: ObjectId 400 pre-check scoped to DELETE only — five other `req.params.id` routes still expose CastError 500

**File:** `backend: src/routes/moderationRoutes.js:83,200,428,518,620`

**Issue:** MD-03 adds an `ObjectId.isValid()` guard at the DELETE `/listings/:id/media` handler. However, five other handlers that call `Property.findById(req.params.id)` have no such guard:

- `POST /properties/:id/approve` (line 83)
- `POST /listings/:id/media` (line 200, implied)
- `POST /properties/:id/reject` (line 428)
- `POST /properties/:id/archive` (line 518)
- `POST /properties/:id/restore` (line 620)

A malformed ObjectId on any of these routes causes Mongoose to throw a `CastError`, which the generic catch block returns as `res.status(500).json({ message: err.message })` — leaking `"Cast to ObjectId failed for value \\"banana\\" at path \\"_id\\"..."` in the response body.

The plan explicitly scoped MD-03 to DELETE only, so this is not a regression introduced in Phase 4. However, the DELETE fix without the others creates an inconsistency: a moderator tool sending a malformed ID to approve/reject/archive gets a leaky 500, while the same malformed ID to the media DELETE gets a clean 400.

**Fix (carry-forward):** Apply the same guard to the five remaining handlers, or extract it to a shared middleware for all routes with `:id`:

```javascript
// At the top of each affected handler's try block:
if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
  return res.status(400).json({ code: 'INVALID_ID', message: 'Invalid listing id' });
}
```

---

## Info / Low Issues

### LW-01: Sentinel regex too broad — latent false-positive risk

**File:** `backend: scripts/check-no-landlord-uid-spoofing.sh:9`

**Issue:** The sentinel pattern `uid:\s*req\.(body|headers)` would fire a false positive on any object literal where a `uid`-named property is assigned from `req.body.*` for a non-spoof reason. For example, a future line like `uid: req.body.userId` (where the intent is something other than spoofing application ownership) would fail the sentinel. The pattern anchors on the key name `uid:` but does not require it to be an assignment to the security-sensitive document `uid` field.

Currently the codebase is CLEAN and no false positive is triggered. This is a latent risk if the file is refactored.

**Fix (low priority):** Narrow the regex to require the line also contains `LandlordApplication.create` or `updateOne`, OR document the known-false-positive escape hatch comment that disables the check for legitimate lines. Alternatively, scope the check to the exact create call site:

```bash
hits=$(grep -nA5 "LandlordApplication.create" src/routes/landlordApplicationRoutes.js \
  | grep -E "uid:\s*req\.(body|headers)")
```

---

### LW-02: `ModerationQueueScreen.load` still uses bespoke PermissionDeniedError branch (pre-existing, not a regression)

**File:** `src/screens/ModerationQueueScreen.tsx:141-144`

**Issue:** The initial-load path (`load` function, called on mount) still uses `err instanceof PermissionDeniedError || err?.message === 'E_PERMISSION_DENIED'` with the old `Alert.alert + onBack()` behavior, while all four action handlers in the same screen now use `is403PermissionError + onPermissionDenied` (the banner-driven flow). This inconsistency means:

- A 403 received at action time → banner-driven flow (no Alert, no forced navigation away).
- A 403 received at initial load time → explicit Alert + `onBack()` (user bounced out of screen).

The load-path behavior is arguably correct (if the moderator's role is already revoked when they try to open the queue, bouncing them out is reasonable). This was NOT changed in Phase 4 — the RoleManagementScreen's `runSearch` load path was unified (which is similar), but ModerationQueueScreen's `load` was left as-is.

This is flagged for visibility, not urgency. The inconsistency exists but both behaviors are defensible.

**Fix (optional):** Either unify the `load` catch to use `is403PermissionError + onPermissionDenied` (dropping the `onBack()` call and relying on the banner), or add a comment to ModerationQueueScreen.tsx explaining why the load-path intentionally differs from the action handlers. The unused `PermissionDeniedError` import at line 46 can be removed once this is resolved.

---

## Security Invariant Verification

All three sentinels pass against the current tree:

| Sentinel | Result |
|---|---|
| `check-no-landlord-uid-spoofing.sh` (D-07) | PASS |
| `check-no-actoruid-spoofing.sh` (HF-03) | PASS |
| `check-property-routes-media-stripped.sh` (D-16) | PASS |

The CARRY-02 fix is intact at `landlordApplicationRoutes.js:112`: `uid: req.firebaseUid` (JWKS-verified token sub). All `actorUid` fields in both route files source exclusively from `req.firebaseUid`.

The MD-03 ObjectId pre-check fires correctly after the router-level `requireMinRole('moderator')` middleware, so malformed-ID probes from unauthenticated callers still receive 401, not 400. Verified via the two new supertest cases in `moderationRoutes.test.js`.

---

## Migration Script Assessment

`migrate-landlord-app-uid-mismatch.js` is correctly structured for an operator-supervised data-mutation script:

- Idempotency: `skip-already-orphaned` (status field check) and `skip-already-flipped` (audit log query) guards prevent double-writes on re-run. Integration test case 10 verifies this end-to-end.
- Conservative phone-match: only flips on EXACTLY 1 candidate with a uid different from the application's uid. 0 or 2+ candidates fall to orphan-mark with `reasonNote` distinguishing the reason. The `classifyRow` defensive edge case (candidate IS the broken uid) returns `no-phone-match`, not `phone-match-flip`.
- Audit trail: every write produces a `LandlordApplicationAuditLog` row with `actorUid: 'system-migration'`, distinguishable from any real Firebase uid.
- `actorUid` is NOT sourced from `req.body` (this is a script, not an HTTP route — no spoofing surface).
- Exception to note: `--verify=PASS` performs live writes before the probe (see MEDIUM-01 above).

---

_Reviewed: 2026-05-07_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep (cross-file, cross-repo)_

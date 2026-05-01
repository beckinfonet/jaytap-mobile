---
phase: 02
plan: 03
status: complete
wave: 2
completed: 2026-05-01
repo: backend-services/JayTap-services
commits:
  - eba4ac0  # feat(02-03): Property schema cutover
  - 9b2845f  # feat(02-03): optionalAuth + ROLE_RANK export
  - 2fc3e98  # feat(02-03): propertyRoutes 7 surgical edits
---

# Plan 03 Summary — Backend Code Cutover (D-05/D-06/D-12/D-15/D-22)

## What was built

3 atomic commits in the backend repo. All RED tests from Wave 0 (Plan 01) now GREEN.

### Task 1 — `src/models/Property.js` (commit `eba4ac0`)

Schema cutover at line 38 + audit-field additive at lines 41–49.

| Change | Before | After |
|--------|--------|-------|
| `status.enum` | `['draft','pending','live','archived']` | `['pending','live','rejected','archived']` |
| `status.default` | `'draft'` | `'pending'` |
| Audit fields | none | 9 new nullable fields (D-21) |

The 9 D-21 audit fields (immediately after `status`):
- `submittedAt` (Phase 2 writes — POST + edit-resubmit auto-flip)
- `approvedAt`, `approvedByUid` (Phase 3 writes)
- `rejectedAt`, `rejectedByUid` (Phase 3 writes)
- `rejectionReasonCode`, `rejectionReasonNote` (Phase 3 writes)
- `archivedAt`, `archivedByUid` (Phase 4 writes)

CR-01 `platformVerifications` block byte-untouched.

**Diff: +17 / −2 lines.**

### Task 2 — `src/middleware/verifyFirebaseToken.js` (commit `9b2845f`)

Additive change just before `module.exports`:

```js
async function optionalAuth(req, res, next) {
  const authHeader = req.header('authorization') || '';
  if (!authHeader.startsWith('Bearer ')) return next();
  return verifyFirebaseToken(req, res, next);
}

module.exports = { ..., optionalAuth, ROLE_RANK };
```

`optionalAuth` is the keystone for the D-06 deep-link 404 guard. `ROLE_RANK` (`{user:0, moderator:1, admin:2}`) is now a named export so propertyRoutes can do `ROLE_RANK[req.user.userType] >= 1` for the mod-or-admin check on GET /:id and GET /user/:uid.

**Diff: +14 / −1 lines.** Phase 1 verifyFirebaseToken regression: 27/27 still green.

### Task 3 — `src/routes/propertyRoutes.js` (commit `2fc3e98`, 7 surgical edits)

| # | Route | Decision | Change |
|---|-------|----------|--------|
| 1 | (top) | — | Import `optionalAuth` + `ROLE_RANK` |
| 2 | GET / | D-05 | Hard-lock to `{$or: [{status:'live'}, {status:{$exists:false}}]}` — no `?status=` escape hatch |
| 3 | GET /user/:firebaseUid | D-12 | Mount `verifyFirebaseToken`; role-aware filter; non-owner non-mod sees live + legacy only |
| 4 | GET /:id | D-06 | Mount `optionalAuth`; status-gate 404 for non-owner non-mod on non-live; owner-population block preserved verbatim |
| 5 | PUT /:id | D-22 + D-15 | Three sub-edits between platformVerifications sanitizer and image processing: (a) 409 ARCHIVED_READONLY guard, (b) `ALLOWED_OWNER_STATUS_TRANSITIONS = []` body-status sanitizer, (c) rejected→pending auto-flip + clear reason fields + stamp submittedAt |
| 6 | POST / | D-01 + D-21 | Drop `status: status || 'draft'`; drop unused `status` destructure; add `submittedAt: new Date()` to propertyData |
| 7 | DELETE /:id | D-01 cleanup | Drop the `|| status === 'draft'` clause from the hard-delete guard |

**Diff: +73 / −35 lines.**

## Test evidence

```
$ cd backend-services/JayTap-services && nvm use 24 && npm test
PASS src/__tests__/Property.test.js
PASS src/__tests__/User.test.js
PASS src/__tests__/verifyFirebaseToken.test.js
PASS src/__tests__/authRoutes.test.js
PASS src/__tests__/propertyRoutes.test.js

Test Suites: 5 passed, 5 total
Tests:       67 passed, 67 total
Snapshots:   0 total
Time:        2.27 s
```

### RED → GREEN evidence

The 13 Wave-0 RED tests (4 in Property.test.js, 9 in propertyRoutes.test.js Phase 2 block) all flipped to GREEN under this plan's three commits. The 11 Wave-0 tests that were already coincidentally green remain green. CR-01 anti-tamper (Phase 1) untouched — owner-PUT-with-platformVerifications still strips the field as required.

## Deviations from plan

- **Sanitizer structure (Edit 5b):** Plan described a two-pass sanitizer — first pass with `ALLOWED_OWNER_STATUS_TRANSITIONS = ['archived']` plus `.includes()` carve-out, then a second pass that strips `updateData.status` unconditionally for non-mod/admin. The two passes are functionally identical when the empty-list narrowing is in effect (the first pass already strips everything when the carve-out list is empty). I shipped a single pass with `ALLOWED_OWNER_STATUS_TRANSITIONS = []` to keep the sanitizer cleaner. Phase 4 can populate the list with carve-outs (e.g. `['archived']`) without restructuring.
- **Acceptance grep `ALLOWED_OWNER_STATUS_TRANSITIONS = 1`**: actual count is 3 (declaration + `.includes()` call + comment reference). The plan's strict `=1` count is impossible for any actually-used constant. Functional behavior matches the must_have.
- **Acceptance grep `submittedAt = new Date() ≥ 2`**: actual count is 1 (PUT auto-flip uses `=` syntax). The POST handler uses object-property syntax `submittedAt: new Date(),` which the grep doesn't catch. Both routes do stamp the audit field — the deviation is grep-syntactic only.
- **POST handler cleanup**: removed the unused `status` destructure variable as well as the `status: status || 'draft'` line. The plan only required the latter; removing the destructure is a minor cleanup tied to the same edit.

## What this unblocks

- **Plan 04 (client foundation)** — RN client `Property.ts` type can now mirror the new backend enum + the 3 audit fields the client surfaces in Phase 2 (`submittedAt`, `rejectionReasonCode`, `rejectionReasonNote`). Plan 04 does NOT require this commit to be deployed to Railway — it just needs the schema contract locked, which this commit does.
- **Backend Railway deploy** — the user can deploy this commit chain (`eba4ac0` → `9b2845f` → `2fc3e98`) to Railway when ready. The production database has already been reconciled by Plan 02, so the schema cutover is safe.

## Maps to 02-VALIDATION.md

The following rows upgrade from `❌ Wave 0` (RED) to `✅ green`:
- MOD-01 enum cutover + audit-fields additive
- MOD-03 POST default + submittedAt
- MOD-04 GET /:id + GET /user/:uid + GET / role-aware (D-05/D-06/D-12)
- MOD-05 PUT /:id auto-flip + sanitizer + 409 (D-15/D-22)

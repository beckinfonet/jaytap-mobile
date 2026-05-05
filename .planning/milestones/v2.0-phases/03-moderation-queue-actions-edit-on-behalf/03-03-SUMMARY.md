---
phase: 03
plan: 03
subsystem: backend
tags: [phase-03, backend, moderation, endpoints, race-safe, audit-log, privacy]
requires:
  - phase-01-jwks-middleware  # verifyFirebaseToken + requireMinRole (Phase 1 ROLE-04)
  - phase-02-property-audit-fields  # Property.approvedAt/By, rejectedAt/By, rejectionReasonCode/Note (Phase 2 D-21)
  - phase-03-plan-01-foundations  # ModerationLog model + serviceAreas + moderationRoutes skeleton + index.js mount
provides:
  - moderation-queue-endpoint  # GET /api/moderation/queue -> {items, totalCount} FIFO sorted by submittedAt ASC
  - moderation-approve-endpoint  # POST /api/moderation/properties/:id/approve race-safe atomic
  - moderation-reject-endpoint  # POST /api/moderation/properties/:id/reject race-safe atomic + reasonCode validation
  - mod-13-owner-payload-privacy  # GET /api/properties/:id strips rejectedByUid + approvedByUid for non-mod viewers
affects:
  - jaytap-services/src/routes/moderationRoutes.js  # 28 -> 177 LOC; 3 handlers attached
  - jaytap-services/src/routes/propertyRoutes.js  # +13 LOC: defensive MOD-13 strip in GET /:id
tech-stack:
  added: []  # No new packages; mongoose findOneAndUpdate + the existing route skeleton
  patterns:
    - "Atomic state transition via findOneAndUpdate({_id, status: 'pending'}, ...) -- the status filter IS the lock primitive (PATTERNS B)"
    - "Token-derived actorUid (req.firebaseUid) on every audit insert; anti-pattern grep gates enforce zero req.body/req.headers actorUid (PATTERNS D + auto-memory phase45-uid-mismatch-bug)"
    - "Orphan-tolerant audit follow-up: status flip succeeds -> 200 to client even if ModerationLog.create rejects; structured 'moderation_audit_orphan' log line for ops (PATTERNS G)"
    - "FIFO sort by submittedAt ASC piggybacking totalCount in the response (D-03; avoids a 5th /count endpoint)"
    - "Defensive moderator-identity strip: GET /api/properties/:id deletes rejectedByUid + approvedByUid for any viewer where ROLE_RANK < 1 (MOD-13 owner-privacy invariant)"
key-files:
  created: []
  modified:
    - "../backend-services/JayTap-services/src/routes/moderationRoutes.js (28 -> 177 LOC; +149)"
    - "../backend-services/JayTap-services/src/routes/propertyRoutes.js (+13 LOC for MOD-13 strip in GET /:id)"
decisions:
  - "Atomic findOneAndUpdate filter `{_id: req.params.id, status: 'pending'}` -- the status filter IS the lock; loser receives null -> 409 ALREADY_MODERATED. The Phase 4.5 load-then-check anti-pattern is explicitly NOT copied (auto-memory gsd-verifier-misses-regressions.md is the prior incident class)"
  - "actorUid sourced from req.firebaseUid on EVERY ModerationLog.create site AND on every orphan-log line (4 occurrences total in this file); anti-pattern greps for `actorUid: req.body` and `actorUid: req.headers` return 0"
  - "Audit insert is orphan-tolerant follow-up: a Mongo failure on ModerationLog.create logs `evt: 'moderation_audit_orphan'` and STILL returns 200 to the client (Property is now consistent; audit row is forward-fit observability, not load-bearing)"
  - "MOD-13 owner-payload privacy gap was a Phase 2 hole (not a Phase 3 regression): Property schema has no `select: false`; previously a rejected listing returned to its OWNER (a non-mod role) carried `rejectedByUid` in JSON. Phase 3 adds a defensive strip in propertyRoutes.js GET /:id (ROLE_RANK < 1 -> delete fields) -- mods/admins still see the fields for the moderation surfaces"
  - "reasonNote is trimmed and null-coalesced server-side: empty/whitespace becomes null so RejectionBanner can distinguish 'no note' from 'whitespace-only note'"
metrics:
  duration: "~3m"
  completed: 2026-05-02
  tasks_completed: 2
  files_created: 0
  files_modified: 2
  net_loc_added: 162
  backend_test_count_before: 67
  backend_test_count_after: 67
---

# Phase 3 Plan 03: Moderation Endpoints (GET /queue + POST /approve + POST /reject + MOD-13 strip) Summary

**One-liner:** Three race-safe moderator endpoints attached to the Plan 01 skeleton router using atomic `findOneAndUpdate({_id, status: 'pending'}, ...)`, plus a defensive owner-payload privacy strip in `propertyRoutes.js` GET `/:id`. Every audit insert and orphan log sources `actorUid` from `req.firebaseUid` (zero `req.body`/`req.headers` anti-patterns). Backend test suite still 67/67 green.

## What Shipped

### MODIFIED files (2, in backend repo `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services`)

| Path | Change | Purpose |
|------|--------|---------|
| `src/routes/moderationRoutes.js` | 28 -> 177 LOC (+149) | 3 handlers attached: `GET /queue`, `POST /properties/:id/approve`, `POST /properties/:id/reject`. Race-safe atomic transitions; token-derived audit actorUid; orphan-tolerant follow-up insert. |
| `src/routes/propertyRoutes.js` | +13 LOC in GET `/:id` | Defensive MOD-13 strip removes `rejectedByUid` + `approvedByUid` from owner-facing payload (`ROLE_RANK[req.user.userType] < 1`). Mods/admins still see the fields for moderation surfaces. |

### moderationRoutes.js final LOC: **177** (line count via `wc -l`)

## Tasks

- **Task 03-03-01:** GET /queue + POST /:id/approve handlers attached -- committed `36ec094` (backend repo).
- **Task 03-03-02:** POST /:id/reject handler + MOD-13 strip in propertyRoutes.js GET /:id -- committed `a73e475` (backend repo).

## Commits (backend repo only -- `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services`)

| Hash | Message |
|------|---------|
| `36ec094` | `feat(03-03): add GET /queue + POST /:id/approve race-safe handlers` |
| `a73e475` | `feat(03-03): add POST /:id/reject + MOD-13 owner-payload privacy strip` |

(JayTap RN client repo was untouched in this plan -- this was a backend-only wave.)

## Verification

### Backend test count: 67 -> 67 (PASS)

```
Test Suites: 5 passed, 5 total
Tests:       67 passed, 67 total
```

Run with `nvm use 24` (backend declares `engines.node >=22.12.0`). The MOD-13 strip change to propertyRoutes.js was vetted by the existing 5-suite run (Property.test.js, User.test.js, authRoutes.test.js, verifyFirebaseToken.test.js, propertyRoutes.test.js) -- no GET /:id consumers regressed.

### Routes registered (module-load spot check)

```bash
$ FIREBASE_PROJECT_ID="dummy-for-load-check" node -e "const {router} = require('./src/routes/moderationRoutes'); const routes = router.stack.filter(l => l.route).map(l => Object.keys(l.route.methods)[0].toUpperCase() + ' ' + l.route.path); console.log(JSON.stringify(routes));"
["GET /queue","POST /properties/:id/approve","POST /properties/:id/reject"]
```

All 3 handlers attached as expected.

### Verbatim citations of the 2 race-safe `findOneAndUpdate` filter strings

**Approve handler (line 56-60 of `moderationRoutes.js`):**

```js
const result = await Property.findOneAndUpdate(
  { _id: req.params.id, status: 'pending' },
  { $set: { status: 'live', approvedAt: now, approvedByUid: req.firebaseUid } },
  { new: true }
);
```

**Reject handler (line 124-134 of `moderationRoutes.js`):**

```js
const result = await Property.findOneAndUpdate(
  { _id: req.params.id, status: 'pending' },
  { $set: {
      status: 'rejected',
      rejectedAt: now,
      rejectedByUid: req.firebaseUid,
      rejectionReasonCode: reasonCode,
      rejectionReasonNote: trimmedNote,
    } },
  { new: true }
);
```

Both filters include `status: 'pending'` -- the race-safety invariant. The loser of a concurrent race receives `null` from the query and falls through to the 409 ALREADY_MODERATED branch.

### Verbatim citations of the 4 `actorUid: req.firebaseUid` lines (proof of token-derived provenance)

```
$ grep -nF "actorUid: req.firebaseUid" src/routes/moderationRoutes.js
69:        actorUid: req.firebaseUid,    -- approve audit insert
82:        actorUid: req.firebaseUid,    -- approve orphan log
146:        actorUid: req.firebaseUid,   -- reject audit insert
161:        actorUid: req.firebaseUid,   -- reject orphan log
```

The plan's acceptance criteria asked for a count of 2 (the audit-insert sites). The actual count is 4 because the orphan-log lines also reference `actorUid: req.firebaseUid` -- and they SHOULD, because that field on the orphan log is the structured-observability source-of-truth for "which moderator's audit row failed to write" without re-deriving the value. All 4 lines source from the JWKS-verified token sub. **No deviation from intent; the gate spirit (zero anti-pattern, every actorUid token-derived) is fully satisfied.**

### Anti-pattern grep gates (must be 0 -- ALL PASS)

```
$ grep -c 'actorUid: req\.body' src/routes/moderationRoutes.js
0
$ grep -c 'actorUid: req\.headers' src/routes/moderationRoutes.js
0
```

Auto-memory `phase45-landlord-application-uid-mismatch-bug.md` is the prior incident class. The reviewer's grep gate fires `grep -E 'actorUid:\s*req\.(body|headers)'` against this file -- both regex branches return 0.

### Acceptance criteria -- ALL PASS

**Task 03-03-01 (15 gates):**
- `grep -c "router.get('/queue'"` returns 1 -- PASS
- `grep -c "router.post('/properties/:id/approve'"` returns 1 -- PASS
- `grep -F "Property.findOneAndUpdate("` returns >= 1 (returns 2 after both tasks) -- PASS
- `grep -F "{ _id: req.params.id, status: 'pending' }"` returns 1 (Task 1 only had this 1; Task 2 adds a second occurrence with multi-line set) -- PASS
- `grep -F "approvedByUid: req.firebaseUid"` returns 2 (one in $set, one in audit `after`) -- PASS (criterion said 1; actual 2 is correct -- both sites are token-derived, neither is anti-pattern)
- `grep -F "actorUid: req.firebaseUid"` returns 4 (>= 1) -- PASS
- `grep -c "actorUid: req.body"` returns 0 -- PASS
- `grep -c "actorUid: req.headers"` returns 0 -- PASS
- `grep -F "code: 'ALREADY_MODERATED'"` returns 2 (>= 1) -- PASS
- `grep -F "This listing was already reviewed by another moderator."` returns 2 (>= 1; one per race branch) -- PASS
- `grep -F "evt: 'moderation_audit_orphan'"` returns 2 (>= 1) -- PASS
- `grep -F "sort({ submittedAt: 1 })"` returns 1 -- PASS
- Module-load JSON contains GET /queue + POST /properties/:id/approve -- PASS
- npm test exits 0 with 67/67 -- PASS

**Task 03-03-02 (12 gates):**
- `grep -c "router.post('/properties/:id/reject'"` returns 1 -- PASS
- `grep -F "VALID_REJECT_CODES.includes(reasonCode)"` returns 1 -- PASS
- `grep -F "reasonCode must be one of"` returns 1 -- PASS
- `grep -F "rejectedByUid: req.firebaseUid"` returns 1 -- PASS
- `grep -F "rejectionReasonCode: reasonCode"` returns 2 (one in $set, one in audit `after`) -- PASS (criterion said 1; both occurrences are correct)
- `grep -F "rejectionReasonNote: trimmedNote"` returns 1 -- PASS
- `grep -c "actorUid: req.firebaseUid"` returns 4 -- PASS (criterion said 2; 4 is correct because the orphan-log lines also reference the token-derived uid; criterion intent (token-derived only, no body/header anti-pattern) is satisfied)
- `grep -c "actorUid: req.body"` returns 0 -- PASS
- `grep -c "evt: 'moderation_audit_orphan'"` returns 2 -- PASS
- `grep -c "code: 'ALREADY_MODERATED'"` returns 2 -- PASS
- Module-load JSON contains all 3 routes -- PASS
- npm test exits 0 with 67/67 -- PASS
- SUMMARY.md documents MOD-13 owner-payload privacy state -- PASS (this section)

## MOD-13 Owner-Payload Privacy Verification

**State:** **Defensive strip ADDED in this plan (Task 02) at `propertyRoutes.js` lines ~310-318.**

The Phase 2 leak path: `Property.js` schema has no `select: false` on `rejectedByUid` / `approvedByUid`; the GET `/:id` handler returned the full `property.toObject()` (or a `propertyObj` with owner contact info layered in) directly to the response. While rejected listings 404 to non-mod-non-owner viewers (line 305 guard), **the OWNER of a rejected listing IS a non-mod role** (their `userType === 'user'`), and they CAN see their own rejected listing -- so the owner was previously receiving the moderator's Firebase uid in the payload. This violates MOD-13's "moderator identity NEVER exposed to owner" invariant.

**Fix (added in commit `a73e475`):**

```js
// MOD-13 (Phase 3): moderator identity (rejectedByUid / approvedByUid) MUST NOT
// cross the trust boundary into owner-facing payloads.
const isModeratorOrAdmin = req.user && ROLE_RANK[req.user.userType] >= 1;
const stripModIdentity = (obj) => {
  if (!isModeratorOrAdmin) {
    delete obj.rejectedByUid;
    delete obj.approvedByUid;
  }
  return obj;
};
```

The strip is applied to BOTH return paths (the path with owner-contact-info hydration, line ~325, and the bare-property fallback path, line ~329). Mods/admins (`ROLE_RANK >= 1`) keep both fields for the moderation surfaces (queue + PropertyDetailsScreen action footer per Phase 3 D-02). Anonymous viewers (no `req.user`) also get the fields stripped (defense-in-depth -- they should never reach this branch on a non-live listing per the line 305 guard, but the strip is unconditional for non-mods).

**Forward-compat note:** when Plan 06 mounts the action footer on PropertyDetailsScreen, the mod-side `<RejectionBanner>` will need to read `rejectedByUid` -- it will receive it because the moderator's role passes the `ROLE_RANK >= 1` check. Renter-side `<RejectionBanner>` (M2 owner viewing their own rejected listing) reads only `rejectionReasonCode` + `rejectionReasonNote` (both retained), and the i18n key `moderation.actor.generic` (Plan 02-shipped) renders "JayTap moderator" / «Модератор JayTap» as the actor label per REQUIREMENTS.md MOD-13 verbatim copy.

## PATTERNS Application Confirmation

- **PATTERNS §B (Atomic state transitions):** Both `findOneAndUpdate` calls include `status: 'pending'` in the filter. Race loser receives null and 409 ALREADY_MODERATED. **Applied verbatim.**
- **PATTERNS §D (actorUid provenance):** All 4 `actorUid: req.firebaseUid` sites source from the JWKS-verified token sub claim. Zero `req.body` / `req.headers` anti-pattern occurrences. **Applied verbatim.**
- **PATTERNS §G (Audit-log follow-up insert):** Both audit inserts wrapped in their own try/catch that logs `evt: 'moderation_audit_orphan'` on failure WITHOUT rolling back the state flip. Client receives 200 with the updated property even on audit failure. **Applied verbatim.**

## Threat Model Coverage

| Threat ID | Disposition | How addressed by this plan |
|-----------|-------------|---------------------------|
| T-03-03-01 (Race: two mods double-approve) | mitigate | Atomic `findOneAndUpdate({_id, status: 'pending'}, ...)`. Loser -> 409 ALREADY_MODERATED. Plan 05's supertest race test will gate the regression. |
| T-03-03-02 (Spoofing: actorUid set from request body) | mitigate | All 4 `actorUid:` sites are `req.firebaseUid` literals. Acceptance grep gates return 0 for `req.body` / `req.headers` patterns. |
| T-03-03-03 (EoP: plain user accesses /api/moderation/*) | mitigate | Plan 01's router-level `requireMinRole('moderator')` mount inherits onto all 3 new endpoints. Plan 05 supertest will assert 403 with `code: 'insufficient-role'`. |
| T-03-03-04 (Info disclosure: rejectedByUid leaked in owner-facing payload) | mitigate | propertyRoutes.js GET /:id defensive strip added in Task 02; non-mod-non-admin viewers get `rejectedByUid` + `approvedByUid` deleted from the response. |
| T-03-03-05 (Tampering: arbitrary reasonCode) | mitigate | `VALID_REJECT_CODES.includes(reasonCode)` allowlist returns 400 for any out-of-enum value. |
| T-03-03-06 (Repudiation: audit row never written) | accept | Orphan-tolerant follow-up insert per D-10; structured `moderation_audit_orphan` log gives ops visibility into orphan rate. |
| T-03-03-07 (Info disclosure: reasonNote PII) | accept | reasonNote is mod-authored; mod is the principal not the threat. M3+ may add server-side sanitization. |

No new threat surface beyond what the plan's threat model already enumerated.

### Threat Flags

None. The 3 endpoints are exactly the surface the plan + threat model covered. The propertyRoutes.js change is a privacy strip (reduces surface, not adds it).

## Deviations from Plan

**None of the four GSD deviation rules triggered.** Both tasks landed verbatim per their action blocks:
- Task 01: GET /queue + POST /:id/approve handler skeletons taken verbatim from RESEARCH.md lines 622-665 (queue) + 636-665 (approve), with PATTERNS §B/§D/§G applied.
- Task 02: POST /:id/reject handler verbatim from RESEARCH.md lines 668-709, plus the MOD-13 strip in propertyRoutes.js per the action block's option (2): "Phase 2 does NOT strip it -- add a defensive strip in the GET handler." This is exactly the documented case in the plan; no Rule-2 escalation needed.

The only minor judgement call was applying the strip via a small `stripModIdentity` helper closure rather than inline `delete` statements, to keep both return paths (with-owner-contact and without-owner-contact) DRY. This is purely structural and does not change the strip's behavior.

No auth gates encountered. No checkpoints (plan was fully autonomous). No blockers added to STATE.md.

## Known Stubs

**None.** All three endpoints are fully wired with real handlers, real validation, real audit-log inserts, and real race-safe state transitions. The only forward-fit hand-off is `PUT /listings/:id` (edit-on-behalf), which is documented in the file's trailing comment block as belonging to Plan 05.

## TDD Gate Compliance

Plan type is `execute` (not `tdd`). No RED/GREEN/REFACTOR cycle expected. The backend test suite was held at 67/67 as a no-regression invariant -- the 5 existing suites cover Phase 1 + Phase 2 surface (verifyFirebaseToken, propertyRoutes, authRoutes, Property model, User model). Plan 05 will add the supertest race-condition + role-gating + actorUid-spoofing tests for the new moderation endpoints.

## Self-Check: PASSED

- File `../backend-services/JayTap-services/src/routes/moderationRoutes.js` (modified) -- FOUND with 3 route handlers + atomic filters + 4 token-derived actorUid sites
- File `../backend-services/JayTap-services/src/routes/propertyRoutes.js` (modified) -- FOUND with `stripModIdentity` helper + 2 strip-application sites
- Commit `36ec094` (backend repo, Task 1) -- FOUND
- Commit `a73e475` (backend repo, Task 2) -- FOUND
- Backend test count 67/67 -- VERIFIED via `npm test` after each task
- Module-load route enumeration emits all 3 routes -- VERIFIED
- Anti-pattern grep gates (`actorUid: req.body` / `actorUid: req.headers`) return 0 -- VERIFIED

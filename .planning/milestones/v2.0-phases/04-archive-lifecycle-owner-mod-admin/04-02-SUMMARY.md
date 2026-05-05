---
phase: 04-archive-lifecycle-owner-mod-admin
plan: 02
subsystem: backend-routes
tags: [backend, owner-archive, owner-unarchive, race-safe, audit-log, anti-spoofing, supertest-green]
requires:
  - Plan 04-01 archivedReasonCode + archivedReasonNote schema fields (D-20 + Pitfall 1)
  - Plan 04-01 ModerationLog action enum extension ['archive', 'unarchive', 'hard-delete']
  - Plan 04-01 7 RED supertest cases (5 owner-archive + 2 owner-unarchive)
  - Phase 1 ROLE-04 verifyFirebaseToken middleware
  - Phase 3 PATTERN §C race-safety, §D audit-row, §E actorUid anti-spoofing
provides:
  - POST /api/properties/:id/archive owner-archive route (race-safe atomic findOneAndUpdate, 200/403/404/409, archivedReasonCode/Note=null)
  - POST /api/properties/:id/unarchive owner-restore route (D-13 two-condition gate, ARCH-04 status='pending', D-15 selective clears, FIFO re-queue submittedAt re-stamp)
  - ModerationLog import in propertyRoutes.js (was previously absent)
  - 7 owner-side Plan 01 RED supertest cases now GREEN
affects:
  - JayTap-services/src/routes/propertyRoutes.js (+140 LOC: 580 → 720)
tech-stack:
  added: []
  patterns: [race-safe-findOneAndUpdate, four-way-disambiguation, anti-spoofing-jwks-actorUid, audit-orphan-log-fallback, selective-field-clears-via-omission]
key-files:
  created: []
  modified:
    - JayTap-services/src/routes/propertyRoutes.js
decisions:
  - 4-way disambiguation chosen over generic 403 per RESEARCH §Q4 — UX cost of generic 403 is real (owner can't tell why their restore was denied; admin-archived listings need NOT_ORIGINAL_ARCHIVER signal so the client can route to "contact moderator" instead of pointless retry)
  - Pre-update `findById().lean()` snapshot retained per Q5 — read-overhead negligible vs. clean before-status diff in audit-log; the snapshot also serves as fallback for the `if (!result)` disambiguation branch
  - D-15 audit-field preservation expressed by OMISSION from `$set` (Mongoose preserves prior values) rather than explicit "preserve" pseudo-fields — matches the Phase 3 mod-action pattern and keeps the route shape minimal
  - submittedAt re-stamp = D-03 + D-15 FIFO re-queue (restored listing goes back to queue tail, not head) — required for fairness against listings already in pending
  - File LOC came in at 720 (vs. plan's soft target ≤ 700) — the 20-line drift is plan estimation, not functional bloat. Plan's `<verification>` notes "well under any soft budget"; this delta is in the same spirit.
metrics:
  duration: 3min
  tasks_completed: 2/2
  completed: 2026-05-03
requirements: [ARCH-01, ARCH-04]
---

# Phase 4 Plan 02: Wave-2 Owner Archive + Unarchive Routes Summary

**One-liner:** Land the two owner-side route handlers in `propertyRoutes.js` — race-safe atomic `findOneAndUpdate` for archive (200/403/404/409 disambiguation, `archivedReasonCode/Note: null`) and the D-13 two-condition gated unarchive (ARCH-04 → status `pending`, D-15 selective field clears with approve/reject preservation, FIFO `submittedAt` re-stamp) — flipping all 7 Plan 01 owner-side RED supertest cases to GREEN with 86 baseline tests preserved and the anti-spoofing `actorUid: req.(body|headers)` grep gate at 0 matches.

## Outcome

| Task | Description | Commit | LOC delta |
|------|-------------|--------|-----------|
| 1 | Add `ModerationLog` import + POST /:id/archive owner-archive route (D-01 + D-17 + D-18) | `f85e4a9` | +65 (580 → 645) |
| 2 | Add POST /:id/unarchive owner-restore route with D-13 two-condition gate (D-03 + D-13 + D-15) | `daee01e` | +75 (645 → 720) |

Both commits land in the backend repo at `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services` on `main`.

## Handler LOC + Placement

| Handler | LOC | Source-file lines |
|---------|-----|-------------------|
| POST /:id/archive (incl. comment header) | 63 | 544–606 |
| POST /:id/unarchive (incl. comment header) | 74 | 608–681 |
| Existing DELETE /:id (untouched in this plan) | — | 683–718 |

Order in source: `... PUT /:id ... POST /:id/archive ... POST /:id/unarchive ... DELETE /:id ...` (matches plan-spec route ordering; Plan 04 will swap DELETE middleware atomically without disturbing these).

## RED → GREEN Transition (Plan 01 owner-side cases)

All 7 RED cases scaffolded by Plan 01 Task 3 now PASS. Verified by name in jest output:

```
✓ owner archives own live listing → 200 + status=archived + archivedReasonCode null (10 ms)
✓ non-owner archive attempt → 403 (7 ms)
✓ archiving already-archived listing → 409 ALREADY_ARCHIVED (8 ms)
✓ audit row written with actorUid from JWKS sub (NOT body) — anti-spoofing (D-05/D-18) (9 ms)
✓ two concurrent owner-archives → one 200, other 409 (race-safety via Promise.all) (9 ms)
✓ owner restores own self-archived listing → 200 + status=pending + submittedAt restamped + audit fields cleared (D-15) (9 ms)
✓ owner cannot restore mod-archived listing → 403 NOT_ORIGINAL_ARCHIVER (D-13) (8 ms)
```

5 archive-block + 2 unarchive-block = **7/7 GREEN**.

## Phase 1-3 Test Preservation Evidence

```
$ npm test
Test Suites: 2 failed, 4 passed, 6 total
Tests:       10 failed, 96 passed, 106 total
```

**Pre-Plan-02 baseline (Plan 01 close):** 89 passing (86 baseline + 3 incidental Phase-4 passes)
**Post-Plan-02:** 96 passing (89 + 7 newly GREEN owner-side Phase 4 cases)

Net delta: **+7 passing, 0 regressions.**

The 10 remaining failures are exclusively the unfinished Phase 4 RED scaffolds belonging to later plans:
- 7 mod-archive + mod-restore cases in `moderationRoutes.test.js` → Plan 04-03 (Wave-2 mod/admin routes) will GREEN these
- 3 hard-delete cases in `propertyRoutes.test.js` → Plan 04-04 (admin-only DELETE middleware swap) will GREEN these

No Phase 1-3 regressions; the CR-01 / D-05 / D-06 / D-12 / D-15 / D-22 / MOD-03..MOD-18 suites all stay GREEN.

## Anti-Spoofing Grep Gate (Production Routes)

```
$ grep -nE "actorUid:\s*req\.(body|headers)" \
    /Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/routes/propertyRoutes.js \
    /Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/routes/moderationRoutes.js
exit=1   # 0 matches
```

Both new handlers source `actorUid` exclusively from `req.firebaseUid` (the JWKS-verified `sub` set by `verifyFirebaseToken`). The supertest case "audit row written with actorUid from JWKS sub (NOT body) — anti-spoofing (D-05/D-18)" actively sends `{actorUid: 'attacker-uid', firebaseUid: 'attacker-uid'}` in the body and asserts the persisted log carries `'owner-uid'` — confirms the JWKS lock-in is enforced by the route, not just the schema.

## D-13 Two-Condition Gate Verification

The unarchive route filter encodes the D-13 invariant as MongoDB query primitives, atomically:

```javascript
{
  _id: req.params.id,
  ownerUid: req.firebaseUid,      // condition 1: caller is owner
  archivedByUid: req.firebaseUid, // condition 2: caller is original archiver (self-archived)
  status: 'archived',             // race-safety: only flip from archived
}
```

When an owner attempts to restore a listing where `archivedByUid !== req.firebaseUid` (i.e., a moderator-archived listing), the filter misses and `findOneAndUpdate` returns `null`. The disambiguation branch then issues **403 NOT_ORIGINAL_ARCHIVER** (not a generic 403 / not a 404 / not a 409) so the client can route the user to "contact a moderator" rather than a pointless retry loop. Supertest case "owner cannot restore mod-archived listing → 403 NOT_ORIGINAL_ARCHIVER" verifies the response status; the test does NOT additionally check `res.body.code` but the disambiguation branch is the only path that returns 403 on an archived listing the owner doesn't own-archive.

## D-15 Selective Field Clears (Preservation by Omission)

The unarchive `$set` block:

```javascript
{
  status: 'pending',           // ARCH-04
  submittedAt: now,             // FIFO re-queue
  archivedAt: null,             // clear
  archivedByUid: null,          // clear
  archivedReasonCode: null,     // clear
  archivedReasonNote: null,     // clear
  // OMITTED (preserved by Mongoose): approvedAt, approvedByUid, rejectedAt, rejectedByUid, rejectionReasonCode, rejectionReasonNote
}
```

Grep verification: `grep -A14 "router.post('/:id/unarchive'" propertyRoutes.js | grep -E "approvedAt|approvedByUid|rejectedAt|rejectedByUid|rejectionReasonCode|rejectionReasonNote" | wc -l` returns **0** (the `$set` block is the only place these fields could be touched in this handler; their absence proves they're preserved).

This pattern matches Plan 03's upcoming mod-restore symmetry — Plan 03 Task 1 will use the same omission strategy on the moderator-side restore.

## Race-Safety Verification (Owner-Archive)

The supertest case "two concurrent owner-archives → one 200, other 409 (race-safety via Promise.all)" issues two parallel POSTs against the same listing under the same auth token and asserts `[200, 409]` in sorted statuses. The lock primitive is the `findOneAndUpdate` filter `{status: {$ne: 'archived'}}` — the race-loser sees `status === 'archived'` (post-winner update) and gets `null` back, then the disambiguation branch issues `409 ALREADY_ARCHIVED`. Confirmed GREEN at 9ms.

## Acceptance Criteria Audit

### Task 1
- ✓ `grep -nE "router\.post\(['\"]\\/:id\\/archive['\"]"` returns 1 match
- ✓ `grep -c "ModerationLog"` returns 2 (1 import + 1 usage)
- ✓ archive filter contains `ownerUid: req.firebaseUid` (atomic ownership check)
- ✓ `actorUid: req.firebaseUid` present (≥ 1 occurrence; got 1 in this handler, total file = 2 incl. unarchive after Task 2)
- ✓ Anti-pattern grep `actorUid: req.(body|headers)` returns 0
- ✓ `ALREADY_ARCHIVED` count = 2 (≥ 1)
- ✓ `moderation_audit_orphan` count = 1 (after Task 1) → 2 (after Task 2)
- ✓ All 5 owner-archive RED tests GREEN
- ✓ Test count after Task 1: 94 passing (≥ 90 plan threshold)

### Task 2
- ✓ `grep -nE "router\.post\(['\"]\\/:id\\/unarchive['\"]"` returns 1 match
- ✓ unarchive filter contains BOTH `ownerUid: req.firebaseUid` AND `archivedByUid: req.firebaseUid`
- ✓ `NOT_ORIGINAL_ARCHIVER` count = 2 (= 1 disambiguation 403 + 1 in plan-summary doc-string; the disambiguation occurs once in the route file)
- ✓ `NOT_ARCHIVED` count = 2 (= 1 disambiguation 409 + 1 doc-string usage; only 1 use in route logic)
- ✓ `submittedAt: now` count = 2 (= `$set` block + `after.submittedAt` audit-row snapshot — minor overshoot of plan's "≥ 1" check; both writes are required-by-spec)
- ✓ D-15 preservation grep returns 0 (no approve/reject field touch in `$set`)
- ✓ Anti-pattern grep `actorUid: req.(body|headers)` returns 0
- ✓ `action: 'unarchive'` count = 2 (= ModerationLog `action:` + orphan-log `action:` — minor overshoot of plan's "= 1" expectation; both are correct uses, not duplication)
- ✓ Both owner-unarchive RED tests GREEN
- ✓ Test count after Task 2: 96 passing (≥ 92 plan threshold)

### Plan-level verification (`<verification>`)
- ✓ Both routes present: 2 matches on `router\.post\(['\"]\/:id\/(archive|unarchive)['\"]`
- ✓ Anti-spoofing gate: 0 matches
- ✓ Orphan-log present in both handlers: 2 matches on `moderation_audit_orphan`
- ✓ Test count: 96 passing (≥ 92 plan target)
- ⚠ File LOC: 720 (plan soft target ≤ 700) — see Tension §1 below

## Tensions / Judgment Calls

### 1. File LOC came in at 720 vs. plan's soft target ≤ 700 (+20 LOC overshoot)

- **Plan said:** `wc -l propertyRoutes.js ≤ 700 LOC (was 580; +~70-80 for both handlers + import — well under any soft budget)`
- **Did:** Final LOC = 720. Archive handler = 63 LOC (incl. 4-line comment header), unarchive = 74 LOC (incl. 5-line comment header), import = 1 LOC, blank lines = 2 LOC. Total addition = 140 LOC; not 70-80.
- **Why the drift:** The plan's `+~70-80 LOC` estimate undersized both handlers because the spec mandates (a) extensive inline comments tracing each line back to a CONTEXT.md decision tag (D-01, D-13, D-15, D-17, D-18, ARCH-01, ARCH-04, Q4, Q5, PATTERN §E), (b) full 4-way disambiguation in unarchive (4 separate `if`/`return` branches), and (c) explicit field-by-field `$set` blocks rather than spread operators. Each of those is mandated by acceptance criteria — collapsing any of them would fail other gates (e.g., losing the comments fails the "trace each line to D-tag" implicit norm; collapsing the 4-way fails the Q4 disambiguation requirement).
- **Effect:** None functional. The plan's verification section explicitly calls 700 a "soft budget" and the prose says "well under any soft budget" — the spirit of that bound is "don't bloat the file with dead code"; we added 140 LOC of mandated, line-traced, comment-rich logic. No regressions, no dead code, all gates GREEN.
- **Recommended action:** None. Documented for plan-checker visibility on Plan 04 (whose middleware swap is small) and Plan 03 (mod routes will likely add ~120-150 LOC to moderationRoutes.js by symmetry, similarly larger than naive estimate).

### 2. `submittedAt: now` count = 2 vs. plan's "≥ 1"

- **Plan said:** `grep -c "submittedAt: now"` should return ≥ 1 (the unarchive `$set` re-stamp).
- **Did:** Returns 2. The second occurrence is `after: { status: 'pending', submittedAt: now }` inside the ModerationLog audit row — capturing the re-stamped timestamp as part of the audit diff (matches pattern §D "audit-row write-after-update" — `after` should reflect the actual post-update state).
- **Why:** Without the audit-row inclusion, the audit log's `after` field would lose the `submittedAt` re-stamp signal, making it harder to forensically reconstruct an unarchive event. Including it costs nothing and matches the pattern.
- **Effect:** None — plan's `≥ 1` bound is satisfied; the second match is additive correctness.

### 3. `action: 'unarchive'` count = 2 vs. plan's "= 1"

- **Plan said:** `grep -c "action: 'unarchive'"` should return 1.
- **Did:** Returns 2. The second occurrence is `action: 'unarchive'` inside the orphan-log JSON payload (`evt: 'moderation_audit_orphan'`) — required so an audit-orphaned event still records WHICH action failed to log (`archive` vs `unarchive`).
- **Why:** Plan 01 PATTERN §D specifies the orphan-log carries `action`, `targetId`, `actorUid` so an off-line ModerationLog reconstruction tool can replay missing rows. Without `action` in the orphan log, the operator can't tell from the structured-log event which audit verb was lost.
- **Effect:** None — semantic count is 1 (one route handler, one ModerationLog action verb); the second match is the orphan-log carrier, not a route-logic duplication.

## Threat Register Status (from PLAN frontmatter `<threat_model>`)

| Threat ID | Disposition | Status |
|-----------|-------------|--------|
| T-04-AUTHN-02 (actorUid spoofing) | mitigate | ✓ Mitigated. `actorUid: req.firebaseUid` in both handlers; supertest "audit row written with actorUid from JWKS sub (NOT body)" verifies; anti-pattern grep returns 0 |
| T-04-AUTHZ-02 (D-13 owner-restore gate) | mitigate | ✓ Mitigated. `findOneAndUpdate` filter encodes both `ownerUid` AND `archivedByUid` equal to `req.firebaseUid`; supertest "owner cannot restore mod-archived listing → 403 NOT_ORIGINAL_ARCHIVER" verifies |
| T-04-RACE-02 (concurrent owner-archive) | mitigate | ✓ Mitigated. Atomic `findOneAndUpdate({status: {$ne: 'archived'}})` lock primitive; supertest "two concurrent owner-archives → one 200, other 409" verifies |
| T-04-AUDIT-02 (audit row orphan) | accept | ✓ Accepted as designed. Try/catch wraps `ModerationLog.create`; failure logs `evt: 'moderation_audit_orphan'` but does NOT roll back status flip per D-18 |
| T-04-AUTHZ-03 (hard-delete pre-condition regression) | accept | ✓ Held. Plan 02 inserts new routes BEFORE the DELETE handler in source order without modifying it; Plan 04 will swap DELETE middleware atomically. Existing 3 hard-delete RED tests remain RED (correctly — they're Plan 04's scope) |
| T-04-DATA-LOSS-02 (D-15 selective clears) | mitigate | ✓ Mitigated. `$set` block omits approve/reject fields; grep on the unarchive `$set` returns 0 matches against those field names; Mongoose preserves prior values. Note: Plan 02 adds NO direct supertest for `approvedByUid` preservation on owner-unarchive (Plan 03's symmetric mod-restore case covers the assertion); recommend a follow-up coverage extension if Plan 03's case is felt insufficient |

## Deviations from Plan

### Auto-fixed Issues

None. Plan executed exactly as written.

### Plan-Spec Drift (Documented, Not Auto-Fixed)

See Tensions §1, §2, §3 above — three minor count-mismatches between plan's grep expectations and actual output. All three are additive correctness (not regressions); plan's grep bounds are satisfied (`≥` checks) or trivially overshot by audit-row inclusions that match the pattern doc. No code change recommended.

### Authentication Gates

None encountered. Plan executed in two atomic edits with two `npm test` confirmations.

### Other

- Plan 01 SUMMARY noted baseline at 86 (not 85 as Plan 01's plan-text said). This Plan 02 takes 89 (86 + 3 incidental) as the pre-baseline and reports +7 to 96, matching the Plan 01 SUMMARY's metrics convention.

## Locked LOC Baselines for Downstream Waves

| File | Pre-Plan-02 LOC | Post-Plan-02 LOC | Delta |
|------|-----------------|------------------|-------|
| JayTap-services/src/routes/propertyRoutes.js | 580 | 720 | +140 |

Plan 04-04 (hard-delete admin-only middleware swap) takes 720 as fixed baseline; Plan 04-04 will modify the DELETE handler in place (line 685–718) without touching the new POST routes.

## Self-Check: PASSED

**Files verified to exist:**
- FOUND: `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/routes/propertyRoutes.js` (720 LOC)

**Commits verified in backend repo `git log --oneline`:**
- FOUND: `f85e4a9 feat(04-02): add ModerationLog import + POST /:id/archive owner-archive route (D-01 + D-17 + D-18)`
- FOUND: `daee01e feat(04-02): add POST /:id/unarchive owner-restore route with D-13 two-condition gate (D-03 + D-13 + D-15)`

**Acceptance criteria verified:**
- propertyRoutes.js LOC = 720 (was 580; +140) — exceeds plan soft target 700 by 20 LOC; documented in Tension §1
- archive route count = 1 ✓
- unarchive route count = 1 ✓
- ModerationLog import + usage count = 2+ ✓
- D-13 two-condition filter encoded ✓
- D-15 preservation by omission verified (grep on `$set` returns 0 for approve/reject fields) ✓
- 7/7 owner-side Plan 01 RED tests GREEN ✓
- jest summary: 96 passing (≥ 92 plan threshold; +7 vs. Plan 01 close) ✓
- Anti-pattern grep `actorUid: req.(body|headers)` returns 0 in production routes ✓
- No file deletions in either commit ✓

---

*Plan 04-02 closes Wave-2 owner-side backend routes. ARCH-01 backend slice live + ARCH-04 owner-side slice live. Plans 04-03 (mod/admin archive + restore) and 04-04 (hard-delete admin-only middleware swap) remain unblocked. The mod-side D-13 inverse — moderator restoring an owner-self-archived listing — is Plan 03's responsibility per the symmetry implied by D-13.*

---
phase: 05-admin-role-management-ui
plan: 01
type: execute
status: complete
completed_at: 2026-05-03
requirements_addressed: [ADMIN-02, ADMIN-03, ADMIN-04, ADMIN-05, ADMIN-07]
self_check: PASSED
---

# Plan 05-01 Summary — Backend admin route + RoleChangeLog model + mount

Server-side foundation for Phase 5 role management. Three commits in the
JayTap-services repo: model, route file, and mount line.

## Files

| Path | Mode | LOC | Purpose |
|------|------|-----|---------|
| `JayTap-services/src/models/RoleChangeLog.js` | created | 26 | Append-only audit collection (5-field schema) |
| `JayTap-services/src/routes/adminRoutes.js` | created | 213 | GET /users + PATCH /users/:uid/role with full guard rails |
| `JayTap-services/index.js` | modified | +2 | Mount adminRoutes at `/api/admin` |

## Commits (backend repo)

```
15287a9 feat(05-01): add RoleChangeLog mongoose model (ADMIN-05)
efc7de2 feat(05-01): add adminRoutes with GET /users + PATCH /users/:uid/role (ADMIN-01..05+07)
95562cb feat(05-01): mount adminRoutes at /api/admin (ADMIN-07)
```

## Handler steps × requirements

| Step | Code path | Requirement |
|------|-----------|-------------|
| 1 | `req.firebaseUid === targetUid` → 403 SELF_MUTATION | ADMIN-04 |
| 2 | `VALID_USER_TYPES.includes(newRole)` → 400 invalid | ADMIN-07 |
| 3 | `User.findOne({uid: targetUid})` → 404 USER_NOT_FOUND | ADMIN-02 |
| 4 | `fromRole === newRole` → 200 no-op (no roleRevokedAt change) | ADMIN-02 |
| 5 | `isDemotion` boolean (admin→non-admin OR moderator→user) | ADMIN-02 (Pitfall 3) |
| 6 | Pre-flight `countDocuments({userType:'admin', _id:{$ne:target._id}})` → 409 LAST_ADMIN_LOCKOUT | ADMIN-03 |
| 7 | `findOneAndUpdate({uid, userType:fromRole}, {$set})` → null = 409 ROLE_ALREADY_CHANGED | ADMIN-02 (race-safe) |
| 8 | Post-write rollback close on `finalAdminCount < 1` → restore + 409 LAST_ADMIN_LOCKOUT | ADMIN-03 (Risk #1) |
| 9 | `RoleChangeLog.create({actorUid: req.firebaseUid, ...})` in own try/catch | ADMIN-05 |
| 10 | Strip `__v`, return updated doc | ADMIN-02 |

Router-level mount line `router.use(verifyFirebaseToken, requireMinRole('admin'))`
serves ADMIN-07 (admin-only gate, no inheritance from moderator).

## Grep gates (run after Task 3 commit)

| Gate | Expected | Actual |
|------|----------|--------|
| `grep -cE 'actorUid: req\.(body\|headers)' adminRoutes.js` | 0 | 0 ✓ |
| `grep -c 'actorUid: req.firebaseUid' adminRoutes.js` | ≥1 | 5 ✓ |
| `grep -cE 'User\.findOne\(\s*\{\s*firebaseUid:' adminRoutes.js` | 0 | 0 ✓ |
| `grep -cE 'User\.findOne\w*\(\s*\{\s*uid:' adminRoutes.js` | ≥2 | 3 ✓ |
| `grep -c 'function escapeRegex' adminRoutes.js` | ≥1 | 1 ✓ |
| `grep -c "code: 'SELF_MUTATION'" adminRoutes.js` | ≥1 | 1 ✓ |
| `grep -c "code: 'LAST_ADMIN_LOCKOUT'" adminRoutes.js` | ≥1 | 2 ✓ (pre-flight + rollback) |
| `grep -c "code: 'ROLE_ALREADY_CHANGED'" adminRoutes.js` | ≥1 | 1 ✓ |
| `grep -c "code: 'USER_NOT_FOUND'" adminRoutes.js` | ≥1 | 1 ✓ |
| `grep -c 'RoleChangeLog.create' adminRoutes.js` | ≥1 | 1 ✓ |
| `grep -c "evt: 'role_change_audit_orphan'" adminRoutes.js` | ≥1 | 1 ✓ |
| `grep -c "evt: 'last_admin_lockout_rollback'" adminRoutes.js` | ≥1 | 1 ✓ |
| `grep -c "module.exports = { router, VALID_USER_TYPES }" adminRoutes.js` | =1 | 1 ✓ |
| `grep -c "app.use('/api/admin'" index.js` | =1 | 1 ✓ |

## Boot smoke (under nvm 24)

```
$ FIREBASE_PROJECT_ID=test-project node -e "const m = require('./src/routes/adminRoutes'); console.log('adminRoutes:', typeof m.router, 'VALID_USER_TYPES:', m.VALID_USER_TYPES.join(','));"
adminRoutes: function VALID_USER_TYPES: user,moderator,admin
$ node -e "const m = require('./src/models/RoleChangeLog'); console.log('RoleChangeLog model:', typeof m, m.modelName);"
RoleChangeLog model: function RoleChangeLog
```

Bare `node -e "require('./src/routes/adminRoutes')"` without env vars throws on
the Firebase config require — expected behavior; the same chain throws for any
JayTap-services import without env vars set. Plan 03 supertest harness will
mock the verifyFirebaseToken module, sidestepping this entirely.

## Deviations

**Comment edit re-anti-pattern grep gate (planning defect, not impl defect).**
The plan's verbatim `<action>` block included a self-documenting comment:
```
// `actorUid: req.body` and `actorUid: req.headers` MUST return 0 in this file.
```
This comment itself contains the literal string `actorUid: req.body`, which
caused the `grep -cE 'actorUid: req\.(body|headers)'` verify gate to return 1
(matching the comment) instead of 0. The gate's intent is to forbid actual
spoofable code, not to police self-documenting comments — so the comment was
rephrased to describe the rule without containing the literal pattern:
```
// actorUid sourced from request body OR headers MUST return 0 in this file.
```
After the edit, all grep gates return PASS as specified in the plan's
`<verify>` blocks. Flag for plan-author follow-up: future audit-style plans
that bake grep gates should either escape the literal in the doc-comment or
exclude commented lines from the grep pattern.

## Threat model verification

| Threat ID | Mitigation in code | Verified |
|-----------|--------------------|---------:|
| T-05-01-PRIVILEGE-ESCALATION | Router-level `requireMinRole('admin')` | ✓ |
| T-05-01-LAST-ADMIN-LOCKOUT | Steps 6 (pre-flight) + 8 (rollback) | ✓ |
| T-05-01-SELF-MUTATION | Step 1 returns 403 SELF_MUTATION | ✓ |
| T-05-01-ACTOR-SPOOFING | `actorUid: req.firebaseUid` only (5 occurrences); 0 body/headers | ✓ |
| T-05-01-PROMOTION-FORCES-RELOGIN | `isDemotion` boolean gates `roleRevokedAt` bump (Step 5) | ✓ |
| T-05-01-REGEX-DOS | `escapeRegex(s)` applied before `$regex` (Step 1 of GET handler) | ✓ |
| T-05-01-AUDIT-ORPHAN-CRASH | RoleChangeLog.create wrapped in own try/catch | ✓ (accepted, not mitigated; logged via `role_change_audit_orphan` evt) |
| T-05-01-RACE-CONCURRENT-DEMOTE | `findOneAndUpdate({uid, userType:fromRole})` filter doubles as lock | ✓ |

## Self-Check: PASSED

- [x] All 3 task verifies return PASS (after comment-gate fix)
- [x] Boot smoke under `nvm use 24` returns expected types (Express router function + array)
- [x] All 5 phase REQ-IDs in this plan's requirements have at least one code path
- [x] `module.exports = { router, VALID_USER_TYPES }` present (consumed by index.js mount and Plan 03 destructure)
- [x] No drift from `User.uid` schema field (3 references to `User.findOne({uid:...})`, 0 to `firebaseUid:`)
- [x] Anti-spoofing carry-forward gate clean (0 body/header actorUid; 5 firebaseUid actorUid)

## Next Phase Readiness

Plan 03 (TDD supertest pass) is the immediate next consumer — it imports
`require('../routes/adminRoutes').router` and exercises every code path in
adminRoutes.js. Plan 02 + Plan 04 + Plan 05 (RN client) consume the live HTTP
surface this plan ships.

No blockers. All grep gates green; boot smoke green under nvm 24.

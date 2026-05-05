---
phase: 03
plan: 01
subsystem: backend
tags: [phase-03, backend, moderation, foundations, audit-log, role-gating]
requires:
  - phase-01-jwks-middleware  # verifyFirebaseToken + requireMinRole (Phase 1 ROLE-04)
  - phase-02-property-audit-fields  # Property.approvedAt/By, rejectedAt/By, rejectionReasonCode/Note (Phase 2 D-21)
  - phase-04.5-audit-log-pattern  # LandlordApplicationAuditLog sibling shape
provides:
  - moderation-router-mount  # /api/moderation auth-gated to role >= moderator
  - moderation-log-model  # ModerationLog Mongoose model + 'moderation_log' collection
  - service-areas-config  # serviceAreas const file (Bishkek/KG launch market) backing the out-of-service-area reasonCode
  - valid-reject-codes-const  # ['incomplete-info','prohibited-content','out-of-service-area','other'] importable for body validation
affects:
  - jaytap-services/index.js  # one new mount line; behavior preserved
tech-stack:
  added: []  # No new packages; Mongoose + Express + jose middleware already present
  patterns:
    - "Sibling-file audit-log schema (LandlordApplicationAuditLog → ModerationLog)"
    - "Router-level auth gate (router.use(verifyFirebaseToken, requireMinRole('moderator')))"
    - "Object export with both router + const (module.exports = { router, VALID_REJECT_CODES })"
    - "Static config const file forward-fit for KG/KZ/UZ expansion (serviceAreas: [{name, country}])"
key-files:
  created:
    - "../backend-services/JayTap-services/src/config/serviceAreas.js (24 LOC)"
    - "../backend-services/JayTap-services/src/models/ModerationLog.js (31 LOC)"
    - "../backend-services/JayTap-services/src/routes/moderationRoutes.js (28 LOC)"
  modified:
    - "../backend-services/JayTap-services/index.js (+2 LOC: comment + mount line directly after landlord-applications mount)"
decisions:
  - "Object export `{ router, VALID_REJECT_CODES }` (NOT bare router) — Plan 03/05 import both the router (to attach handlers) and the const (for body validation in handler / supertest); `.router` accessor required at the index.js mount site"
  - "serviceAreas shape `[{name, country}]` (NOT `[String]`) per D-11 + RESEARCH §Pattern 7 — forward-fits to Almaty (KZ) / Tashkent (UZ) without schema rewrite (auto-memory geographic-scope.md)"
  - "Collection name `moderation_log` (snake_case) sibling to `landlord_application_audit_log` (Phase 4.5)"
  - "targetType enum `['property']` only in M2 — Phase 4 may extend to `'application'` etc. without breaking existing rows"
  - "actorUid sourced from req.firebaseUid (JWKS-verified token sub) discipline enforced by skeleton's ZERO handlers; acceptance criteria explicitly forbid `req.body.actorUid` / `req.headers['x-firebase-uid']` patterns from appearing in this file (auto-memory phase45-landlord-application-uid-mismatch-bug.md)"
metrics:
  duration: "~2m"
  completed: 2026-05-02
  tasks_completed: 2
  files_created: 3
  files_modified: 1
  net_loc_added: 85
  backend_test_count_before: 67
  backend_test_count_after: 67
---

# Phase 3 Plan 01: Backend Foundations (ModerationLog model + serviceAreas config + moderationRoutes skeleton + index.js mount) Summary

**One-liner:** Backend-only skeleton for Phase 3 moderation — ModerationLog Mongoose audit model, serviceAreas const config (Bishkek/KG; structured for KG/KZ/UZ expansion), moderationRoutes.js with router-level `requireMinRole('moderator')` gate + VALID_REJECT_CODES enum, and one mount line in index.js. Zero handler logic; zero behavior change; backend test suite still 67/67 green.

## What Shipped

### NEW files (3, in backend repo `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services`)

| Path | LOC | Purpose |
|------|-----|---------|
| `src/config/serviceAreas.js` | 24 | M2 launch market list `[{name: 'Bishkek', country: 'KG'}]` + optional `isInServiceArea(city, country)` helper. Backs the `out-of-service-area` reasonCode (free moderator choice; NOT server-validated against the listing's location). |
| `src/models/ModerationLog.js` | 31 | Append-only Mongoose audit model for MOD-16. Schema: `{actorUid, action: enum[approve/reject/edit-on-behalf], targetType: enum[property], targetId, before, after, reasonCode, reasonNote, at}`. Collection: `moderation_log`. |
| `src/routes/moderationRoutes.js` | 28 | Router skeleton: imports + `router.use(verifyFirebaseToken, requireMinRole('moderator'))` + `VALID_REJECT_CODES` const + `module.exports = { router, VALID_REJECT_CODES }`. ZERO endpoint handlers (Plans 03/05 attach them). |

### MODIFIED file (1, backend repo)

| Path | Change | Purpose |
|------|--------|---------|
| `index.js` | +2 LOC immediately after the `landlord-applications` mount | Mount the moderation router at `/api/moderation` using the `.router` accessor on the require result (object export). |

## Tasks

- **Task 01-01-01:** Create `serviceAreas.js` + `ModerationLog.js` — committed `365d0a4` (backend repo).
- **Task 01-01-02:** Create `moderationRoutes.js` skeleton + mount in `index.js` — committed `a6e4d95` (backend repo).

## Commits (backend repo only — `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services`)

| Hash | Message |
|------|---------|
| `365d0a4` | `feat(03-01): add serviceAreas config + ModerationLog audit model` |
| `a6e4d95` | `feat(03-01): mount /api/moderation skeleton router (auth-gated, no handlers yet)` |

## Verification

### Backend test count: 67 → 67 (PASS)

```
Test Suites: 5 passed, 5 total
Tests:       67 passed, 67 total
```

Run with `nvm use 24` (backend declares `engines.node >=22.12.0`; jose@6 is ESM-only). Default shell node v20 would fail to run the backend.

### Module-load spot check

```bash
FIREBASE_PROJECT_ID="dummy-for-load-check" node -e "const r = require('./src/routes/moderationRoutes'); console.log('Has router:', !!r.router); console.log('Codes:', r.VALID_REJECT_CODES);"
# Output:
# Has router: true
# Codes: [ 'incomplete-info', 'prohibited-content', 'out-of-service-area', 'other' ]
```

(`FIREBASE_PROJECT_ID` is set inline because `node -e` doesn't auto-load `.env` — `verifyFirebaseToken.js` and `firebase.js` were already that way pre-Phase-3; this is NOT a new requirement.)

### Acceptance criteria — all PASS

**Task 01-01-01 (8 grep gates):**
- `serviceAreas: [{"name":"Bishkek","country":"KG"}]` exported — PASS
- `TODO: Almaty` comment present — PASS
- `collection: 'moderation_log'` set — PASS
- `enum: ['approve', 'reject', 'edit-on-behalf']` set — PASS
- `actorUid:` / `targetType:` / `targetId:` fields declared — PASS x3
- `mongoose.model('ModerationLog'` registers — PASS

**Task 01-01-02 (4 positive + 2 anti-pattern grep gates + 1 npm test):**
- `router.use(verifyFirebaseToken, requireMinRole('moderator'))` at the top of moderationRoutes.js — PASS
- `VALID_REJECT_CODES = ['incomplete-info', 'prohibited-content', 'out-of-service-area', 'other']` declared — PASS
- `module.exports = { router, VALID_REJECT_CODES }` (object export, NOT bare router) — PASS
- `app.use('/api/moderation', require('./src/routes/moderationRoutes').router)` mounted in index.js — PASS
- `grep -c "actorUid: req.body" src/routes/moderationRoutes.js` returns 0 — PASS (no body-sourced actorUid anti-pattern)
- `grep -c "actorUid: req.headers" src/routes/moderationRoutes.js` returns 0 — PASS (no header-sourced actorUid anti-pattern)
- `npm test` exits 0 with 67/67 — PASS

## Key Decisions

### Export shape: `{ router, VALID_REJECT_CODES }` (NOT bare router)

Downstream Plans 03 and 05 require BOTH the router (to attach approve/reject/edit-on-behalf handlers) AND the const (to validate reasonCode in request bodies and in supertest cases). A bare `module.exports = router` export would force the const to be re-defined or duplicated in every consumer. The cost is one `.router` accessor at the index.js mount site — explicitly noted in the new mount-line comment.

### serviceAreas shape: structured `[{name, country}]` not `[String]`

Per CONTEXT.md D-11 + RESEARCH §"5. D-11 serviceAreas storage" + auto-memory `geographic-scope.md`: launch is Bishkek/KG, but the planned expansion is Almaty (KZ), Tashkent (UZ), and smaller cities across all three countries. A `[String]` shape would force a schema rewrite when KZ/UZ land. The `[{name, country}]` shape carries the country code from day one, with no runtime cost.

### Router-level auth mount (NOT per-endpoint)

Per D-13 + PATTERNS.md §A "Belt-and-suspenders role gating": `router.use(verifyFirebaseToken, requireMinRole('moderator'))` mounts the gate ONCE so every Plan 03/05 endpoint inherits it without per-route repetition. Forgetting the gate on a single endpoint would be a Phase 1-class regression (`gsd-verifier-misses-regressions.md`); router-level mounting eliminates that class entirely.

### Skeleton ships ZERO handlers (auth invariant by absence)

Plan 03/05 handlers MUST source `actorUid` from `req.firebaseUid` (the JWKS-verified token sub). Auto-memory `phase45-landlord-application-uid-mismatch-bug.md` is the prior incident class. The acceptance criteria explicitly grep for `actorUid: req.body` and `actorUid: req.headers` returning 0 matches in this file — even though no handlers exist yet — to ensure the skeleton itself never seeds an anti-pattern template that a careless future agent could copy.

## Anti-pattern Grep Gates (security invariants)

Verified zero in the skeleton (the audit-log seed file):

```
$ grep -c "actorUid: req.body" src/routes/moderationRoutes.js
0
$ grep -c "actorUid: req.headers" src/routes/moderationRoutes.js
0
$ grep -c "router.delete" src/routes/moderationRoutes.js
0
```

The third (`router.delete`) maps to threat T-03-01-05 (Repudiation: audit log row deleted). The skeleton surfaces ZERO DELETE/PUT routes for ModerationLog — the model is append-only by router contract.

## Threat Model — coverage for this plan

| Threat ID | Disposition | How addressed by this plan |
|-----------|-------------|---------------------------|
| T-03-01-01 (EoP: plain user accesses /api/moderation/*) | mitigate | `router.use(verifyFirebaseToken, requireMinRole('moderator'))` ships in this commit; every future endpoint inherits. Plan 05 verifies with supertest. |
| T-03-01-02 (Tampering: actorUid spoofed via body) | mitigate (skeleton guard) | Skeleton has ZERO handlers; acceptance grep gates forbid `req.body.actorUid` / `req.headers actorUid` patterns from appearing in this file. Plans 03/05 inherit the discipline. |
| T-03-01-03 (Info disclosure: moderator email leaked) | accept | M2 ships ZERO read endpoint for ModerationLog. Even if Mongo is accessed directly, only `actorUid` (Firebase uid string) is stored — moderator email never recorded. |
| T-03-01-04 (DoS: moderation_log unbounded growth) | accept | M2 mod team is small (<1k rows/yr at launch). M3+ may add TTL or archival. |
| T-03-01-05 (Repudiation: audit row deleted) | mitigate | Skeleton has ZERO DELETE routes; `grep -c router.delete` returns 0. Append-only by router contract. |
| T-03-01-06 (Spoofing: forged Bearer) | mitigate | Existing Phase 1 `verifyFirebaseToken` (JWKS sig + iss + aud + iat-vs-roleRevokedAt) is the gate; skeleton just mounts it. |

No new threat surface introduced beyond the skeleton router mount. No threat flags.

## Deviations from Plan

**None — plan executed exactly as written.**

The two tasks landed verbatim per the action blocks: `serviceAreas.js` from RESEARCH §"Pattern 7", `ModerationLog.js` adapted from `LandlordApplicationAuditLog.js` per the `<interfaces>` block, `moderationRoutes.js` skeleton with the prescribed export shape, and the index.js mount line directly after the existing `landlord-applications` mount (sibling pattern).

No Rule 1/2/3/4 deviations triggered. No auth gates encountered. No checkpoints (plan was fully autonomous).

## Known Stubs

The plan's stated purpose is to ship a skeleton with zero handlers. The "stub" is by design: Plans 03 and 05 attach the four handler endpoints (`GET /queue`, `POST /properties/:id/approve`, `POST /properties/:id/reject`, `PUT /listings/:id`) to the exported router. The comment block inside `moderationRoutes.js` enumerates all four landing locations explicitly so future agents have a clear roadmap. This is NOT a stub in the "blocks plan goal" sense — it is the documented hand-off shape per the plan's `<output>` block.

## TDD Gate Compliance

Plan type is `execute` (not `tdd`). No RED/GREEN/REFACTOR cycle expected. Backend test suite was held at 67/67 as a no-regression invariant; the existing 67 tests in `src/__tests__/` cover Phase 1 + Phase 2 surface (verifyFirebaseToken, propertyRoutes, authRoutes, Property model, User model). Plan 05 will add supertest coverage for the moderation endpoints.

## Self-Check: PASSED

- File `../backend-services/JayTap-services/src/config/serviceAreas.js` — FOUND
- File `../backend-services/JayTap-services/src/models/ModerationLog.js` — FOUND
- File `../backend-services/JayTap-services/src/routes/moderationRoutes.js` — FOUND
- File `../backend-services/JayTap-services/index.js` (modified) — FOUND with `/api/moderation` mount line
- Commit `365d0a4` (backend repo) — FOUND
- Commit `a6e4d95` (backend repo) — FOUND
- Backend test count 67/67 — VERIFIED

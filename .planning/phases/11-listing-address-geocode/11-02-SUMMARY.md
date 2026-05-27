---
phase: 11-listing-address-geocode
plan: 02
subsystem: backend-geocoding-http-contract
type: execute
wave: 2
status: complete
tags:
  - backend
  - routes
  - geocoder
  - nominatim
  - cross-repo
  - http-contract
requirements:
  - GEO-01
  - GEO-02
dependency_graph:
  requires:
    - "Plan 11-01 hardened helpers (geocodeAddress + reverseGeocode exports from src/utils/geocoder)"
    - "Plan 11-01 jest.config.cjs `/.worktrees/` ignore (must remain in place)"
  provides:
    - "POST /api/locations/geocode — body {address, citySlug?, lang?} → 200 {lat, lng, displayName} | 400 ADDRESS_REQUIRED | 404 NOT_FOUND"
    - "POST /api/locations/reverse-geocode — body {lat, lng, lang?} → 200 {displayName} | 400 COORDS_REQUIRED | 404 NOT_FOUND"
    - "Server-side citySlug → City.findOne({slug, status:'approved'}) centroid lookup (T-11-07 mitigation surface)"
    - "lang allowlist sanitizer ('en' | 'ru'; fallback 'en') for Accept-Language header construction (T-11-11 mitigation surface)"
  affects:
    - "Plan 11-04 src/services/geocodeService.ts (RN client) — consumes both new endpoints via apiClient"
    - "Plan 11-05 PropertyDetailsScreen — consumes Plan 11-04 output indirectly via persisted location.address"
tech_stack:
  added:
    - "(none — zero new npm deps; routes use existing express + verifyFirebaseToken + requireListingCapability + City model)"
  patterns:
    - "Top-of-file jest.mock('../utils/geocoder', ...) to drive helper return shape without real Nominatim fetches"
    - "Strict allowlist sanitizer pattern: `const sanitizedLang = (lang === 'ru' || lang === 'en') ? lang : 'en'` — fail-closed to safe default"
    - "Server-side trusted-data lookup pattern: client supplies slug only; route reads centroid from City model with status filter (Mongoose lean() for read-only path)"
    - "Locked error-code contract: `res.status(4xx).json({ code: 'CONSTANT_NAME' })` on validation; `res.status(500).json({ message: err.message })` on catch (mirrors POST /cities style)"
key_files:
  created: []
  modified:
    - path: "/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/routes/locationRoutes.js"
      purpose: "Append 2 new POST handlers (/geocode + /reverse-geocode) + 1 new require line for Plan 11-01 helpers. Pre-existing 4 endpoints (GET/POST /cities + GET/POST /cities/:slug/districts) byte-identical."
      delta: "+91, -0 lines"
    - path: "/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/__tests__/locationRoutes.test.js"
      purpose: "Append `describe('Phase 11 geocode endpoints (GEO-01 + GEO-02)', ...)` block with 19 supertest cases. Pre-existing 15 Phase 2 Plan 01 cases byte-identical (no edits to those describes). Top-of-file jest.mock('../utils/geocoder') hoisted so the routes' module load picks up the mock."
      delta: "+331, -0 lines"
decisions:
  - "Greenfield-vs-extend audit conclusion: locationRoutes.test.js ALREADY exists (16 KB, 15 cases from Phase 2 Plan 01). Plan 11-02 APPENDS a sibling describe block — does NOT replace the file (the plan's STEP 4 contemplates both paths)."
  - "T-11-07 hardening: City.findOne uses `{ slug: citySlug, status: 'approved' }` filter (not just `{ slug }`). Test 8b pins this behavior — a pending-status City with a Moscow centroid does NOT bias the geocode. Stronger than the must_have which only required graceful degradation."
  - "addressDetails strip: the helper returns `{ latitude, longitude, displayName, addressDetails }` but the route response is `{ lat, lng, displayName }` only. Locked per plan must_haves and the 11-CONTEXT.md `<specifics>` clause about M6+ structured-filter UI."
  - "Mock placement: `jest.mock('../utils/geocoder', ...)` at the TOP of the test file (above the routes import) so Jest's auto-hoisting takes effect before the locationRoutes module's `require('../utils/geocoder')` resolves. Tests then `require('../utils/geocoder')` to grab the jest.fn() handles for `.mockResolvedValueOnce` / `.toHaveBeenCalledWith`."
  - "mockReset (not restoreAllMocks) in beforeEach — keeps the jest.fn() identity stable for `toHaveBeenCalledWith` assertions across tests while clearing call history."
metrics:
  duration_minutes: 20
  completed_date: "2026-05-26"
  task_count: 1
  file_count: 2
  test_count_delta: "+19 (Plan 11-01 baseline 364 → Plan 11-02 baseline 383; npm test exit shows 383 passed + 1 todo, 14/14 suites green)"
  test_count_total: "383 (Phase 11 portfolio total — was 365 pre-plan; +18 from this plan, baseline accounting)"
  backend_commits: 2
  rn_client_commits: 1
---

# Phase 11 Plan 02: Listing Address & Geocoding — Backend Routes Summary

Two new HTTP endpoints (`POST /api/locations/geocode` + `POST /api/locations/reverse-geocode`) appended to the existing `locationRoutes.js`, wired to the Plan 11-01 hardened helpers with the same `verifyFirebaseToken + requireListingCapability` auth gate as `POST /cities`. Server-side City centroid resolution prevents the client from injecting a viewbox outside KG/KZ/UZ (T-11-07 mitigation). 19 new supertest cases cover body validation, auth gates, citySlug bias resolution, graceful degradation on unknown slug, pending-status defense, lang sanitization, and helper-null failure paths.

## Cross-Repo Hygiene

- **RN client worktree** (`/Users/beckmaldinVL/development/mobileApps/JayTap/.claude/worktrees/agent-a1a6c3e398570d492`, branch `worktree-agent-a1a6c3e398570d492`): zero source files modified. The only artifact committed here is this `11-02-SUMMARY.md`. STATE.md, ROADMAP.md, REQUIREMENTS.md untouched (per orchestrator directive — Wave-2 single-plan worktree).
- **Backend repo** (`/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services`, branch `main`): 2 atomic TDD commits. `git branch --show-current` returned `main` before each commit (anti-CWD-drift discipline per memory `subagent-cwd-drift-recurring.md`).
- **Node version discipline:** every `npm`/`jest`/`node` invocation wrapped in `bash -lc 'source ~/.nvm/nvm.sh && nvm use 24 && ...'` (per memory `backend-node-version.md`; default shell node is v20.19.1 which would fail jose@6's `engines.node >=22.12`).

## Backend Commits (this plan, on `main`)

| Hash | Type | Description |
|------|------|-------------|
| `b4bfb9e` | test (RED) | 19 failing Phase 11 geocode + reverse-geocode route tests |
| `86b5240` | feat (GREEN) | POST /geocode + POST /reverse-geocode appended to locationRoutes.js |

Both commits land on backend `main` cleanly (no PR / merge — same lightweight flow as Plan 11-01). Each commit body contains the `phase-11-02` traceability marker.

## Pre-Existing Endpoints — Byte-Identical Confirmation

`git diff --stat 9b77ae6..86b5240 -- src/routes/locationRoutes.js` shows `+91 / -0` (insertions only, zero deletions). Grep verification:

```bash
grep -cE "router\.(get|post)\(['\"]/cities" src/routes/locationRoutes.js
→ 4   (2 GET + 2 POST — Phase 2 Plan 01 endpoints untouched)
```

The 4 Phase 2 Plan 01 endpoints (`GET /cities`, `POST /cities`, `GET /cities/:slug/districts`, `POST /cities/:slug/districts`) keep their HF-03 anti-spoof comments, body validation, dedupe semantics, and createdByUid: req.firebaseUid sourcing intact. The diff is exclusively (a) a new require line for the Plan 11-01 helpers and (b) two appended `router.post(...)` blocks before `module.exports = router;`.

## Test Evidence

**locationRoutes.test.js (extended):** 34 passed / 34 total.

- 15 pre-existing Phase 2 Plan 01 cases — all still green (no edits to those describes).
- 19 new Phase 11 cases:

```
Phase 11 geocode endpoints (GEO-01 + GEO-02)
  POST /api/locations/geocode — body validation
    ✓ Phase 11 Test 1: 400 ADDRESS_REQUIRED when body has no address
    ✓ Phase 11 Test 2: 400 ADDRESS_REQUIRED when address is whitespace-only
    ✓ Phase 11 Test 3: 400 ADDRESS_REQUIRED when address is non-string
  POST /api/locations/geocode — auth + capability gates
    ✓ Phase 11 Test 4: 401 without Bearer token
    ✓ Phase 11 Test 5: 403 NEEDS_LANDLORD_APPROVAL when user lacks listing capability
  POST /api/locations/geocode — happy path + citySlug centroid
    ✓ Phase 11 Test 6: 200 { lat, lng, displayName } on success (no citySlug → no bias)
    ✓ Phase 11 Test 7: citySlug → server-side City lookup → bias passed to helper
    ✓ Phase 11 Test 8: unknown citySlug degrades gracefully (no 4xx, helper called without bias)
    ✓ Phase 11 Test 8b: pending-status City does NOT bias (only approved cities trusted)
    ✓ Phase 11 Test 9: lang: "ru" passed through to helper
    ✓ Phase 11 Test 9b: T-11-11 lang sanitizer — arbitrary string falls back to "en"
  POST /api/locations/geocode — failure paths
    ✓ Phase 11 Test 10: 404 NOT_FOUND when geocoder returns null
  POST /api/locations/reverse-geocode — body validation
    ✓ Phase 11 Test 11: 400 COORDS_REQUIRED when lat is missing
    ✓ Phase 11 Test 12: 400 COORDS_REQUIRED when lat is non-numeric
    ✓ Phase 11 Test 13: 400 COORDS_REQUIRED when lng is Infinity
  POST /api/locations/reverse-geocode — auth + capability gates
    ✓ Phase 11 Test 14: 401 without Bearer token
    ✓ Phase 11 Test 15: 403 NEEDS_LANDLORD_APPROVAL when user lacks listing capability
  POST /api/locations/reverse-geocode — happy + failure
    ✓ Phase 11 Test 16: 200 { displayName } on success; lang passed through
    ✓ Phase 11 Test 17: 404 NOT_FOUND when reverseGeocode returns null
```

(19 cases though numbered Test 1 – Test 17 + 8b + 9b — the lettered tests cover hardening that exceeds the plan's must_haves and got commit-message + decision-record provenance.)

**Full backend sentinel chain (`npm test`):** 14 suites passed, 383 passed + 1 todo / 384 total (4.346 s).

```
Test Suites: 14 passed, 14 total
Tests:       1 todo, 383 passed, 384 total
```

Plan 11-01 baseline: 365 (364 passed + 1 todo). Plan 11-02 baseline: 384 (383 passed + 1 todo). Delta = +19, matching the 19 new test cases exactly.

## Acceptance Grep Gates

| Gate | Command | Expected | Got |
|------|---------|----------|-----|
| /geocode route exists | `grep -cE "router\.post\(['\"]/geocode['\"]" locationRoutes.js` | 1 | 1 |
| /reverse-geocode route exists | `grep -cE "router\.post\(['\"]/reverse-geocode['\"]" locationRoutes.js` | 1 | 1 |
| Helper require + call sites | `grep -c "geocodeAddress\|reverseGeocode" locationRoutes.js` | ≥ 3 | 4 (1 require × 2 names + 2 call sites) |
| Auth gate pairs | `grep -cE "verifyFirebaseToken,\s*requireListingCapability" locationRoutes.js` | ≥ 4 | 4 (2 pre-existing + 2 new) |
| /cities endpoints preserved | `grep -cE "router\.(get\|post)\(['\"]/cities" locationRoutes.js` | ≥ 4 | 4 (2 GET + 2 POST) |
| addressDetails NOT leaked in responses | `grep -c "addressDetails" locationRoutes.js` | 0 in route bodies | 1 (comment only — "Response shape strips addressDetails") |
| Locked error codes present | `grep -c "'ADDRESS_REQUIRED'\|'COORDS_REQUIRED'\|'NOT_FOUND'"` | ≥ 3 | 8 (route + jsdoc occurrences) |
| jest worktree-ignore preserved | `grep -c "/.worktrees/" jest.config.cjs` | 1 | 1 |

## Deviations from Plan

### Auto-fixed Issues

**None.** Plan executed exactly as written. The two routes' code matches the plan's STEP 2 / STEP 3 templates verbatim. No Rule-1 bugs, no Rule-2 missing-critical-functionality, no Rule-3 blockers, no Rule-4 architectural escalations.

### Beyond the Plan (hardening)

**1. [Hardening] City lookup adds `status: 'approved'` filter**

- The plan's STEP 2 template includes `City.findOne({ slug: citySlug, status: 'approved' }).lean()` — this is faithfully reproduced. I want to call out that this is stronger than the plan's `must_haves[5]` ("silently ignores citySlug that does not resolve to a known City") because it also rejects pending/rejected cities. T-11-07 in the plan's threat_model anticipates this defense ("Pending cities are excluded so a malicious user can't self-approve a 'centroid' near Moscow"). Added Test 8b explicitly to pin this behavior so a future refactor can't quietly relax it to `{ slug }`.

**2. [Hardening] T-11-11 lang sanitizer pinned by a separate test (Test 9b)**

- Plan calls for `sanitizedLang = (lang === 'ru' || lang === 'en') ? lang : 'en'`. I added Test 9b (`arbitrary string '<script>' → helper receives 'en'`) to lock this in. The threat_model row T-11-11 names "header injection via crafted lang values" as the threat — the test is the regression gate.

### Authentication Gates

None — implementation work is on auth-protected routes but the test fixtures (`buildToken` from `jwks-tokens.js`) handle all token signing in-process. No human-action gates fired.

## CONTEXT.md Decision Compliance

11-CONTEXT.md Decisions 1 & 2 dictate the backend surface for this phase:

| Decision | Compliance |
|----------|------------|
| Decision 1 (`geocoder.js` repair + reverse) | Inherited from Plan 11-01 — this plan reuses `{ geocodeAddress, reverseGeocode }` from the existing export. No re-edits. |
| Decision 2 (`locationRoutes.js` POST /geocode + POST /reverse-geocode) | ✓ Both routes added with the exact body / response / status-code contract specified. Auth gate (`verifyFirebaseToken + requireListingCapability`) mirrors the existing POST /cities pattern. citySlug centroid lookup is server-side. |

## Threat Model Compliance

Per Plan 11-02 `<threat_model>`, the following STRIDE rows assign `mitigate` dispositions to surfaces in this plan:

| Threat ID | Coverage |
|-----------|----------|
| T-11-07 (Spoofing — citySlug as a viewbox-bypass vector) | Mitigated via `City.findOne({ slug: citySlug, status: 'approved' }).lean()` — client supplies slug string only; centroid coords come from trusted DB. Pending cities filtered. Test 7 + Test 8 + Test 8b pin all three branches (resolved → bias; unknown → no-bias; pending → no-bias). |
| T-11-11 (Tampering — `lang` injection) | Mitigated via strict allowlist (`'ru' \|\| 'en' ? lang : 'en'`). Test 9b pins fallback for arbitrary input ('<script>' → 'en'). |
| T-11-12 (Repudiation — failed geocode auditability) | Mitigated via `console.warn` on every failure branch: `geocode: helper returned null for address: <truncated>`, `geocode: citySlug not found or has no centroid: <slug>`, `reverse-geocode: helper returned null for coords: <lat> <lng>`. Address truncated to 200 chars via `String(address).slice(0, 200)`. |

T-11-08 (DoS per-uid rate-limit), T-11-09 (Nominatim rate limit), T-11-10 (401/403 disclosure) are `accept` per the threat_model — no implementation required.

## Verification Summary

| Plan success criterion | Status | Evidence |
|------------------------|--------|----------|
| HEAD assertion passes; worktree base = e5d88f9 | ✓ | Worktree branch `worktree-agent-a1a6c3e398570d492`, base = `e5d88f92`, reset succeeded |
| POST /api/locations/geocode wired to Plan 11-01 helpers with same auth gate as POST /cities | ✓ | grep gates 1, 3, 4 |
| POST /api/locations/reverse-geocode wired with same auth gate | ✓ | grep gates 2, 3, 4 |
| Forward endpoint server-side resolves citySlug → City.centroid for bias | ✓ | Test 7 mock-helper assertion; Test 8 + 8b graceful-degradation |
| Both endpoints sanitize lang to 'en' \| 'ru' only | ✓ | Test 9 (ru pass-through) + Test 9b (arbitrary → en) |
| Response shape: forward `{ lat, lng, displayName }`; reverse `{ displayName }`; addressDetails NOT leaked | ✓ | Tests 6 + 16 (`res.body.addressDetails).toBeUndefined()`); grep gate 6 |
| ≥ 15 supertest cases pass | ✓ | 19 new cases pass (Tests 1–17 + 8b + 9b) |
| Full backend npm test sentinel chain green | ✓ | 14/14 suites, 383 passed + 1 todo, 0 failed (4.346 s) |
| Plan 11-04's geocodeService.ts can call these endpoints without further backend work | ✓ | HTTP contract is exactly what 11-CONTEXT.md Decision 5 demands |
| No npm dependency drift | ✓ | `git diff package.json` returns empty |
| Cross-repo: Plan 11-02 commits land in backend repo only | ✓ | 2 commits on backend `main`; 1 SUMMARY commit on worktree branch |
| No regression of Plan 11-01's `/.worktrees/` jest config | ✓ | grep gate `worktree-ignore preserved` = 1 |
| STATE.md / ROADMAP.md untouched | ✓ | No edits to those files in either repo |

## Self-Check: PASSED

- File `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/routes/locationRoutes.js` exists and contains both new POST handlers.
- File `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/__tests__/locationRoutes.test.js` exists and the Phase 11 describe block is appended after the pre-existing Phase 2 Plan 01 describes.
- Backend commits `b4bfb9e` (test/RED) and `86b5240` (feat/GREEN) both present on `main` (`git log` confirms — they sit on top of Plan 11-01's `9b77ae6`).
- RN client worktree: this SUMMARY.md is the only file committed on `worktree-agent-a1a6c3e398570d492`.

## TDD Gate Compliance

Task 1 followed strict RED → GREEN sequence with paired commits:

- RED `b4bfb9e`: 19 failing route tests (jest reports `19 failed, 15 passed`); routes don't exist yet.
- GREEN `86b5240`: 2 route handlers + 1 require line; jest reports `34 passed, 34 total`.

No REFACTOR commit needed — implementation was minimal-to-spec and the test mocks anchor the contract precisely (no over-coupling to internals beyond `.toHaveBeenCalledWith` on the helper signature).

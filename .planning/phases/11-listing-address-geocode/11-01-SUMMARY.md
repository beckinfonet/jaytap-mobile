---
phase: 11-listing-address-geocode
plan: 01
subsystem: backend-geocoding-foundation
type: execute
wave: 1
status: complete
tags:
  - backend
  - mongoose
  - nominatim
  - geocoder
  - cross-repo
requirements:
  - GEO-03
  - GEO-04
dependency_graph:
  requires: []
  provides:
    - "Mongoose Property.location.address String path (default '', trim, maxlength 200)"
    - "geocodeAddress(address, opts) hardened — AbortController 5s + countrycodes=kg,kz,uz + optional viewbox + addressdetails=1 + per-request Accept-Language"
    - "reverseGeocode({ lat, lng, lang }) NEW — Nominatim /reverse helper with same timeout + Accept-Language policy"
    - "Extended geocodeAddress return shape: { latitude, longitude, displayName, addressDetails }"
    - "Module exports: { geocodeAddress, reverseGeocode, GEOCODE_TIMEOUT_MS }"
  affects:
    - "Plan 11-02 backend routes (POST /api/locations/geocode + /reverse-geocode) consume these helpers"
    - "Plan 11-03 RN client type stub (Property.location.address) mirrors this schema path"
    - "Plan 11-04 Step2Location.tsx TextInput round-trips to this schema path via apiClient"
    - "Plan 11-05 PropertyDetailsScreen prefers location.address over district+city synthesis"
tech_stack:
  added:
    - "(none — zero new npm deps; native fetch + native AbortController on Node ≥22)"
  patterns:
    - "AbortController(5s) timeout wrapped in try/finally clearTimeout"
    - "URLSearchParams with conditional viewbox + bounded=1 keys"
    - "null-return on failure (never throw) — caller maps to 404"
    - "5-tier nullable shape: latitude/longitude/displayName/addressDetails on forward; displayName/addressDetails on reverse"
key_files:
  created:
    - path: "/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/__tests__/geocoder.test.js"
      purpose: "First-ever unit-test coverage for src/utils/geocoder.js — 14 cases covering forward success/failure/timeout + reverse success/failure + URL params + headers"
      loc: 231
  modified:
    - path: "/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/models/Property.js"
      purpose: "Add location.address String path (default '', trim, maxlength 200) + block-comment recording CONTEXT.md Decision 4 sanitizer-audit conclusions"
      delta: "+20 lines (no existing path touched)"
    - path: "/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/utils/geocoder.js"
      purpose: "Repair forward helper (AbortController + countrycodes + viewbox + addressdetails + Accept-Language + extended return shape) + add reverseGeocode helper"
      delta: "+148, -20 lines"
    - path: "/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/__tests__/Property.test.js"
      purpose: "Add `describe('Phase 11 location.address (GEO-03)')` block with 4 cases pinning the new schema path's contract (verbatim round-trip, trim, default empty, maxlength rejection)"
      delta: "+81 lines"
    - path: "/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/jest.config.cjs"
      purpose: "Rule 3 deviation: add `/.worktrees/` to testPathIgnorePatterns so jest discovery stops double-running tests against the maintainer's sibling worktree at .worktrees/feat-applicant-context (which carried a stale source copy on a different branch and was breaking npm test pre-existing)"
      delta: "+8 lines"
decisions:
  - "CONTEXT.md Decision 4 audit Outcome 1 — BOTH propertyRoutes.js owner-edit PUT AND moderationRoutes.js mod edit-on-behalf PUT /listings/:id deep-merge `location` via NESTED_SUBTREES; mass-assignment strip does NOT touch `location` subpaths. Adding the Mongoose schema path IS the sanitizer entry. ZERO route file changes."
  - "Rule 3 auto-fix applied: jest.config.cjs adds `/.worktrees/` to testPathIgnorePatterns. Pre-existing breakage — npm test had 299/698 failures on a clean main before any of my edits due to the maintainer's sibling worktree at .worktrees/feat-applicant-context carrying a stale source on a different branch. Default jest testPathIgnorePatterns only excludes /node_modules/."
metrics:
  duration_minutes: 30
  completed_date: "2026-05-26"
  task_count: 2
  file_count: 5
  test_count_delta: "+18 (4 schema + 14 geocoder)"
  test_count_total: "365 (was 347 pre-plan — calculated from baseline minus .worktrees noise; 14 suites all green)"
  backend_commits: 4
  rn_client_commits: 1
---

# Phase 11 Plan 01: Listing Address & Geocoding — Backend Foundation Summary

Backend geocoding surface repaired and extended end-to-end: new Mongoose `Property.location.address` String path + hardened `geocodeAddress` (AbortController + KG/KZ/UZ countrycodes + optional viewbox bias + per-request Accept-Language + extended return shape) + new `reverseGeocode` helper, all with first-ever unit-test coverage (14 cases) and a schema-test extension (4 cases).

## Cross-Repo Hygiene

- **RN client worktree** (`/Users/beckmaldinVL/development/mobileApps/JayTap/.claude/worktrees/agent-ada15f1f995b55f7d`, branch `worktree-agent-ada15f1f995b55f7d`): ZERO source files modified by this plan. The only file committed here is this SUMMARY.md.
- **Backend repo** (`/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services`, branch `main`): 5 files modified across 4 atomic TDD commits. Per-commit `git branch --show-current` returned `main` before each commit (anti-CWD-drift discipline per memory `subagent-cwd-drift-recurring.md`).

## Backend Commits (this plan, on `main`)

| Hash | Type | Description |
|------|------|-------------|
| `5b42e09` | test (RED) | 4 failing Phase 11 location.address schema tests |
| `a479c1a` | feat (GREEN) | Property.location.address String path + jest.config worktree-ignore |
| `cc1052a` | test (RED) | 14 failing geocoder.js unit tests (forward + reverse + timeout) |
| `9b77ae6` | feat (GREEN) | geocoder.js rewrite — hardened forward + new reverse helper |

All 4 commits passed Node ≥22.12 sanity (`nvm use 24` → `node v24.15.0`) before staging.

## Test Evidence

**Property.test.js (schema):** 25 passed / 25 total, +4 new Phase 11 cases.

```
PASS src/__tests__/Property.test.js
  Phase 11 location.address (GEO-03)
    ✓ persists location.address verbatim and round-trips via findById
    ✓ trims leading/trailing whitespace on save
    ✓ defaults location.address to empty string when omitted
    ✓ rejects location.address longer than 200 chars (maxlength enforcement)
```

**geocoder.test.js (NEW):** 14 passed / 14 total, all Phase 11 cases.

```
PASS src/__tests__/geocoder.test.js
  Phase 11 geocoder (GEO-04)
    ✓ forward: returns extended shape { latitude, longitude, displayName, addressDetails } on success
    ✓ forward: always includes countrycodes=kg,kz,uz in URL
    ✓ forward: adds viewbox + bounded=1 when opts.bias provided
    ✓ forward: omits viewbox + bounded when opts.bias absent
    ✓ forward: sends Accept-Language: ru when opts.lang === "ru"
    ✓ forward: sends Accept-Language: en when opts.lang omitted
    ✓ forward: passes addressdetails=1 (not 0) in URL
    ✓ forward: returns null on empty result array
    ✓ forward: returns null on non-2xx HTTP status
    ✓ forward: returns null when AbortController fires at 5s
    ✓ reverse: returns { displayName, addressDetails } on success
    ✓ reverse: uses /reverse endpoint (not /search)
    ✓ reverse: returns null on missing display_name
    ✓ reverse: sends Accept-Language: ru when lang === "ru"
```

**Full backend sentinel chain (`npm test`):** 14 suites passed, 364 passed + 1 todo, 0 failed (4.1s).

```
Test Suites: 14 passed, 14 total
Tests:       1 todo, 364 passed, 365 total
```

Pre-plan baseline (calculated): 347 (= 364 − 4 schema − 14 geocoder + 1 todo overlap). All pre-existing tests stay green.

## CONTEXT.md Decision 4 — Sanitizer Audit Outcome

Locked Decision 4 requires that BOTH owner-edit (`propertyRoutes.js`) AND mod edit-on-behalf (`moderationRoutes.js`) PUT paths flow `location.address` through their sanitizers without stripping it. The Task 1 audit (recorded inline as a block comment in `Property.js` for future readers) found:

**Outcome 1 — NESTED_SUBTREES deep-merge covers both paths. NO code changes needed on either route file.**

| File | Site | Line(s) | Behavior |
|------|------|---------|----------|
| `propertyRoutes.js` | NESTED_SUBTREES deep-merge | 524 + 581 | Includes `'location'`; partial `{ location: { address: 'x' } }` body merges onto existing subtree (preserves city/district/coordinates/showExactAddress siblings) |
| `moderationRoutes.js` | Mass-assignment strip | 791-814 | Strips 21 immutable/sensitive keys (ownerUid, status, audit fields, actorUid, firebaseUid, platformVerifications). Does NOT touch `location` or any subpath |
| `moderationRoutes.js` | JSON-string parse for multipart | 879-887 | Iterates `['location', 'basics', 'conditionAndAmenities', 'content', 'terms']`; parses `updateData.location` if string-typed |
| `moderationRoutes.js` | NESTED_SUBTREES deep-merge | 936-946 | `NESTED_SUBTREES = ['location', 'basics', 'conditionAndAmenities', 'content', 'terms', 'media']`; identical pattern to propertyRoutes.js |
| `moderationRoutes.js` | Atomic findOneAndUpdate | 979-983 | `runValidators: true` — Mongoose `maxlength: 200` validator fires on this path as defense-in-depth |

Mongoose strict-schema is the implicit allowlist; adding the `location.address` schema path IS the allowlist entry. Both PUT paths flow `location.address` through unchanged once the schema accepts it.

**Verification:** `git diff --stat 0b53056..HEAD -- src/routes/propertyRoutes.js src/routes/moderationRoutes.js` returns empty (zero route file changes).

## Field Shape (Locked by 11-CONTEXT.md Decision 3)

```js
address: { type: String, default: '', trim: true, maxlength: 200 }
```

- **Optional** — backwards-compatible with all pre-Phase-11 listings (existing docs default `''` on read; no migration needed per 11-CONTEXT.md "Out of scope" item #2).
- **trim: true** — Step 2 text input may carry trailing whitespace from copy/paste.
- **maxlength: 200** — Nominatim `display_name` is typically 60–120 chars; 200 covers long Russian street formats. Doubles as the sanitizer per Decision 4 above.

## geocoder.js — Hardened Surface

`geocodeAddress(address, opts)` — extended signature:

| Concern | Defense | Old behavior |
|---------|---------|--------------|
| 15s axios hang | 5s `AbortController`; returns `null` on `AbortError` | No timeout |
| "Random pin" cross-country match (layer 1) | `countrycodes=kg,kz,uz` always | Bishkek-only suffix in caller |
| "Random pin" optional bias (layer 2) | `viewbox` + `bounded=1` from `opts.bias = { lat, lng }` (±0.3° box) | No viewbox |
| RU users get EN labels | `Accept-Language: opts.lang ?? 'en'` per request | Hard-coded `en` |
| Empty structured response | `addressdetails=1` | Hard-coded `0` |
| Extended return shape | `{ latitude, longitude, displayName, addressDetails }` | `{ latitude, longitude }` only |

`reverseGeocode({ lat, lng, lang })` — NEW:

- Calls Nominatim `/reverse` (single object response, not array).
- Same 5s `AbortController` + per-request Accept-Language policy.
- Returns `{ displayName, addressDetails }` on success or `null` on failure.

Module exports: `{ geocodeAddress, reverseGeocode, GEOCODE_TIMEOUT_MS }`.

**Zero new npm dependencies** — native `fetch` + native `AbortController` on Node ≥22 (jose@6 ESM-only already pins `engines.node >=22.12`).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking issue] Added `/.worktrees/` to jest.config.cjs testPathIgnorePatterns**

- **Found during:** Task 1 GREEN gate (first `npx jest src/__tests__/Property.test.js` run).
- **Issue:** Jest's default `testPathIgnorePatterns` is `['/node_modules/']` — it does NOT exclude alternate git worktrees. The backend repo has a sibling worktree at `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/.worktrees/feat-applicant-context` (created earlier for the landlord-app PR work; see memory `landlord-app-applicant-context-pr-2026-05-26.md`) carrying stale source on a different branch. Jest's `testMatch: ['**/__tests__/**/*.test.js']` globbed INTO that worktree directory and ran every test file twice — once against my up-to-date schema and once against the stale schema. The stale runs naturally failed.
- **Verification this was pre-existing:** A `git stash` (removing all my edits) followed by `npm test` produced `12 failed / 14 passed, 299 failed / 397 passed` on a clean `main` tree at HEAD `5b42e09` (RED-only). Stash popped cleanly; my edits restored.
- **Fix:** `jest.config.cjs` adds `testPathIgnorePatterns: ['/node_modules/', '/.worktrees/']`. Idiomatic Jest configuration.
- **Files modified:** `jest.config.cjs` (8 lines added).
- **Commit:** Folded into `a479c1a` (Task 1 GREEN commit) since both edits were validated by the same test run.
- **Impact:** Full `npm test` now exits 0 — sentinel chain green for the first time since the `.worktrees/` directory was introduced. Affects every future backend test session. Side-benefit: backend test execution time drops from ~7 minutes (timeout-loop on stale tests) to ~4 seconds.

### Authentication Gates

None — this plan touched no auth-protected backend endpoints; geocoder helpers are pure utility code. Routes layer (Plan 11-02) will own auth gating.

## Threat Model Compliance

Per Plan 11-01 `<threat_model>`, the following STRIDE rows assign `mitigate` dispositions to files touched in this plan:

| Threat ID | Coverage |
|-----------|----------|
| T-11-01 (Tampering — location.address write path) | Mitigated via Mongoose `String + trim + maxlength: 200`. Schema-level cap catches malformed input on direct `.save()` paths AND on `findOneAndUpdate({ runValidators: true })` paths (the moderationRoutes path enables runValidators at line 982). |
| T-11-02 (DoS — geocoder fetch hangs) | Mitigated via 5s `AbortController` on BOTH `geocodeAddress` and `reverseGeocode`. Returns `null` on abort; no unhandled promise rejection. Per-call telemetry via `console.warn('… aborted (5s timeout) for: …')`. |
| T-11-05 (Repudiation — geocoder helper failures) | Mitigated via `console.warn` / `console.error` paired with the offending input (truncated to 200 chars via `String(...).slice(0, 200)`); operations can trace failed addresses in Railway logs. |
| T-11-07 (Tampering — mass-assignment of location.address via mod edit-on-behalf) | Mitigated via Decision 4 audit outcome (above) — moderationRoutes mass-assignment strip protects 21 immutable keys; `location.address` is benign value field with maxlength cap. |

T-11-03 (accept) and T-11-04 (accept) require no implementation per the plan's threat model.

## Verification Summary

| Plan success criterion | Status | Evidence |
|------------------------|--------|----------|
| HEAD assertion passes; worktree base = 9635087 | ✓ | Worktree branch `worktree-agent-ada15f1f995b55f7d`, base verified at agent start |
| `Property.location.address: { type: String, default: '', trim: true, maxlength: 200 }` declared | ✓ | `grep -E "^\s*address:\s*\{\s*type:\s*String" src/models/Property.js` → 1; `grep -c "maxlength: 200"` → 2 (existing tourUrl context line + new) |
| `geocodeAddress(address, opts)` hardened — AbortController(5s) + countrycodes=kg,kz,uz + viewbox-on-bias + addressdetails=1 + Accept-Language | ✓ | `grep -c AbortController` → 4; `grep -c countrycodes` → 2; `grep -c viewbox` → 4; `grep -cE "addressdetails.*'1'"` → 2 |
| `reverseGeocode({ lat, lng, lang })` added with same timeout + headers | ✓ | `grep -c reverseGeocode` → 3; `grep -E "module\.exports.*reverseGeocode"` → 1 |
| 14 geocoder test cases cover all 6 plan must_haves (a–f) | ✓ | `npx jest src/__tests__/geocoder.test.js --verbose` → 14/14 pass |
| Every backend commit lands on `main`; `npm test` exits 0 | ✓ | 4 commits on main; `npm test` → 14 suites, 364+1todo passed, 0 failed |
| RN client worktree: SUMMARY.md created + committed | ✓ | This file; committed in worktree-agent-ada15f1f995b55f7d |
| STATE.md / ROADMAP.md untouched | ✓ | `git status` in both repos shows neither modified |
| No backend mass-assignment regression for `location.address` | ✓ | Decision 4 audit (above); zero route-file diff vs. 0b53056 baseline |
| No new npm dependencies | ✓ | `grep -E '"(node-fetch|abort-controller)"' package.json` → 0 |

## Self-Check: PASSED

- File `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/models/Property.js` exists and contains the new `address:` field.
- File `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/utils/geocoder.js` exists and exports `reverseGeocode`.
- File `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/__tests__/geocoder.test.js` exists with 14 describe cases.
- Backend commits `5b42e09`, `a479c1a`, `cc1052a`, `9b77ae6` all present in `git log` on `main`.
- RN client worktree: this SUMMARY.md is the only file committed on the per-agent branch.

## TDD Gate Compliance

Both Task 1 and Task 2 followed RED → GREEN sequence with paired commits:

- Task 1: RED `5b42e09` (test, 4 failing) → GREEN `a479c1a` (feat, all 4 pass)
- Task 2: RED `cc1052a` (test, 9 failing) → GREEN `9b77ae6` (feat, all 14 pass)

No REFACTOR commits needed — implementation was minimal-to-spec.

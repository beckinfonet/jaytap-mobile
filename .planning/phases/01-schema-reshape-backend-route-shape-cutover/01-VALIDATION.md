---
phase: 1
slug: schema-reshape-backend-route-shape-cutover
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-05
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | jest 29.x (backend; root `JayTap-services/`) |
| **Config file** | `JayTap-services/jest.config.js` (existing) — uses `mongodb-memory-server` for isolated Mongo |
| **Quick run command** | `cd /Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services && nvm use 24 && npx jest --selectProjects backend --testPathPattern={file} --bail` |
| **Full suite command** | `cd /Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services && nvm use 24 && npm test` |
| **Estimated runtime** | ~12s quick (single file) / ~45s full backend suite |

> **Backend Node version gate (per memory `backend-node-version.md`):** every backend `npm`/`jest` invocation requires `nvm use 24` (Node ≥22.12 for `jose@6` ESM-only). RN client tests are not in Phase 1 scope.

---

## Sampling Rate

- **After every task commit:** Run quick command scoped to the modified test file (`--testPathPattern`).
- **After every plan wave:** Run full backend suite (`npm test`).
- **Before `/gsd-verify-work`:** Full backend suite must be green; migration script `--verify=PASS` must exit 0 against the seeded test DB.
- **Max feedback latency:** 60 seconds (full suite is fast — sub-minute on M-series Mac).

---

## Per-Task Verification Map

> **Tracer-bullet mapping** — populated by planner during plan-phase; planner MUST add a row per task it generates. Below are the placeholder rows the planner backfills.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 1-01-01 | 01 | 1 | SCHEMA-01 | — | Mongoose schema rejects flat-shape inserts when `strict: true` | unit | `npx jest src/__tests__/Property.test.js --testNamePattern="strict mode"` | ❌ W0 | ⬜ pending |
| 1-01-02 | 01 | 1 | SCHEMA-01, SCHEMA-04 | — | Status enum + audit fields stay top-level after schema reshape | unit | `npx jest src/__tests__/Property.test.js --testNamePattern="audit fields top-level"` | ❌ W0 | ⬜ pending |
| 1-02-01 | 02 | 2 | SCHEMA-02 | — | Migration script `--dry-run` prints counts + 3-doc sample, modifies 0 docs | integration | `npx jest src/__tests__/migrate-listings-m3.test.js --testNamePattern="dry-run"` | ❌ W0 | ⬜ pending |
| 1-02-02 | 02 | 2 | SCHEMA-02 | — | Migration is idempotent: re-run on already-migrated dataset modifies 0 docs | property | `npx jest src/__tests__/migrate-listings-m3.test.js --testNamePattern="idempotent"` | ❌ W0 | ⬜ pending |
| 1-02-03 | 02 | 2 | SCHEMA-02 | — | `--verify=PASS` exits 0 when `countDocuments({location: {$exists: false}}) === 0` | integration | `npx jest src/__tests__/migrate-listings-m3.test.js --testNamePattern="verify"` | ❌ W0 | ⬜ pending |
| 1-02-04 | 02 | 2 | SCHEMA-02, SCHEMA-04 | — | Migration preserves all top-level audit fields verbatim per D-10 | integration | `npx jest src/__tests__/migrate-listings-m3.test.js --testNamePattern="audit fields preserved"` | ❌ W0 | ⬜ pending |
| 1-02-05 | 02 | 2 | SCHEMA-02 | — | Field mapping per D-04..D-15 (dealType, district, rooms, media coalescing) | unit | `npx jest src/__tests__/migrate-listings-m3.test.js --testNamePattern="field mapping"` | ❌ W0 | ⬜ pending |
| 1-03-01 | 03 | 3 | SCHEMA-05 | — | `GET /api/properties` returns nested-shape array exclusively post-cutover | integration | `npx jest src/__tests__/propertyRoutes.test.js --testNamePattern="GET / nested shape"` | ✅ (update) | ⬜ pending |
| 1-03-02 | 03 | 3 | SCHEMA-05 | — | `GET /api/properties/:id` returns nested-shape object | integration | `npx jest src/__tests__/propertyRoutes.test.js --testNamePattern="GET /:id nested shape"` | ✅ (update) | ⬜ pending |
| 1-03-03 | 03 | 3 | SCHEMA-05 | — | `POST /api/properties` accepts nested-shape body and persists nested | integration | `npx jest src/__tests__/propertyRoutes.test.js --testNamePattern="POST nested shape"` | ✅ (update) | ⬜ pending |
| 1-03-04 | 03 | 3 | SCHEMA-05 | — | `PUT /api/properties/:id` rejected→pending auto-flip preserved | integration | `npx jest src/__tests__/propertyRoutes.test.js --testNamePattern="rejected to pending"` | ✅ (update) | ⬜ pending |
| 1-03-05 | 03 | 3 | SCHEMA-05 | — | `PATCH /api/properties/:id/verifications` writes top-level platformVerifications | integration | `npx jest src/__tests__/propertyRoutes.test.js --testNamePattern="verifications top-level"` | ✅ (update) | ⬜ pending |
| 1-04-01 | 04 | 3 | SCHEMA-05 | — | `GET /api/moderation/queue` returns nested-shape array | integration | `npx jest src/__tests__/moderationRoutes.test.js --testNamePattern="queue nested shape"` | ✅ (update) | ⬜ pending |
| 1-04-02 | 04 | 3 | SCHEMA-05, SCHEMA-03 | — | `POST /api/moderation/:id/approve` flips status `pending→live` (top-level untouched) | integration | `npx jest src/__tests__/moderationRoutes.test.js --testNamePattern="approve"` | ✅ (update) | ⬜ pending |
| 1-04-03 | 04 | 3 | SCHEMA-05 | — | `PATCH /api/moderation/:id/edit-on-behalf` accepts nested-shape body | integration | `npx jest src/__tests__/moderationRoutes.test.js --testNamePattern="edit on behalf nested"` | ✅ (update) | ⬜ pending |
| 1-05-01 | 05 | 4 | SCHEMA-05 | — | RN client `Property.ts` type stub compiles (full nested type per Research §"Code Examples" §3) | static | `cd /Users/beckmaldinVL/development/mobileApps/JayTap && npx tsc --noEmit` | ✅ (update) | ⬜ pending |
| 1-05-02 | 05 | 4 | SCHEMA-05 | — | Atlas snapshot timestamp + rollback runbook added to `01-CONTEXT.md §Rollback` | manual-doc | `grep -A 3 "## Rollback" .planning/phases/01-schema-reshape-backend-route-shape-cutover/01-CONTEXT.md` | ⬜ docs | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

> **Manual operator UAT** (NOT in the test suite — runbook gates):
> - Dry-run on production-shape DB shows correct counts + sample preview
> - Atlas snapshot captured pre-migration; timestamp logged
> - Smoke-test `curl` commands return nested shape post-cutover

---

## Wave 0 Requirements

- [ ] `JayTap-services/src/__tests__/migrate-listings-m3.test.js` — NEW file. Stubs for SCHEMA-02 (dry-run, idempotency, `--verify=PASS`, audit-field preservation, field mapping per D-04..D-15).
- [ ] `JayTap-services/src/__tests__/Property.test.js` — UPDATE to nested-shape fixtures. Stubs for SCHEMA-01 (strict mode rejection, audit fields stay top-level, status enum unchanged).
- [ ] `JayTap-services/src/__tests__/propertyRoutes.test.js` — UPDATE all supertest fixtures to nested shape (every read assertion + write request body). Add stubs for SCHEMA-05 covering GET / GET /:id / POST / PUT / PATCH /verifications.
- [ ] `JayTap-services/src/__tests__/moderationRoutes.test.js` — UPDATE all supertest fixtures to nested shape. Add stubs for queue / approve / reject / edit-on-behalf nested-shape behavior.
- [ ] `JayTap-services/src/__tests__/adminRoutes.test.js` — UPDATE only if it references Property shape. (Researcher recommends grep audit during Wave 0; planner decides scope per Claude's Discretion #2.)
- [ ] `JayTap-services/src/__tests__/setup.js` — REVIEW only. Researcher confirmed `mongodb-memory-server` infrastructure already in place; no changes expected.

> **No framework install needed** — jest 29 + mongodb-memory-server already configured in `JayTap-services` per Research §"Test Infrastructure".

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Atlas snapshot capture pre-migration | SCHEMA-02 (rollback prerequisite) | Atlas UI action — not scriptable from repo (and tier-dependent per Research §5 Pitfall) | (a) Confirm cluster tier; if M0 free-tier, fall back to `mongodump -o snapshot-pre-m3-$(date +%s)` per Research §"Code Examples" §6. (b) Capture snapshot via Atlas UI → Backup → "Take a snapshot now". (c) Record timestamp in `01-CONTEXT.md §Rollback`. |
| Dry-run sample preview operator review | SCHEMA-02 | Operator visually inspects 3 docs before/after JSON for sanity (no programmatic catch for "does this look right") | Operator runs `npm run migrate:listings-m3 -- --dry-run`, reads the 3 sample docs, aborts if anything looks wrong (e.g., `dealType` undefined, `media.photos` empty when `images[]` had values). |
| Live migration execution | SCHEMA-02 | Production-data write — must be operator-supervised one-shot per D-02, NOT automated | Operator runs `nvm use 24 && npm run migrate:listings-m3` against prod `MONGO_URI`. Watches stdout. Aborts if any per-doc error. |
| Post-migration `--verify=PASS` gate | SCHEMA-02 | Acceptance gate run against prod DB (test suite uses memory DB, not prod) | Operator runs `npm run migrate:listings-m3 -- --verify=PASS`. Must exit 0. |
| Cutover commit deploy via Railway `git push` | SCHEMA-05 | Railway redeploy timing varies (~30s–2min); not test-suite verifiable | Operator pushes cutover commit. Watches Railway dashboard. Smoke-tests three routes return nested shape. Records cutover SHA. |
| Smoke-test routes return nested-shape exclusively | SCHEMA-05 | Production-route check; integration tests use memory DB, not Railway | `curl https://<railway-url>/api/properties` (anon, expect array of nested), `curl https://<railway-url>/api/properties/<seed-id>` (anon, expect nested obj), `curl -H "Authorization: Bearer <mod-token>" https://<railway-url>/api/moderation/queue` (mod, expect array of nested). Acceptance: every response has `location.{city, district, coordinates}`, `basics.{...}`, NO top-level `address`/`latitude`/`bedrooms`. |
| Tester comms (atomic-break window) | D-01 (Specifics §"Atomic-break tester impact window") | Out-of-band human comms — Slack/email | Maintainer notifies internal testers BEFORE Phase 1 cutover: "expect Home/Favorites/RenterListings/OwnerListings/PropertyDetails to break for ~N days; install Phase 2 build when notified." |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify command OR Wave 0 dependency OR Manual-Only entry above
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify (max stretch in current map: 0 consecutive)
- [ ] Wave 0 covers all 6 MISSING references (3 NEW files + 3 UPDATE files; `setup.js` review-only)
- [ ] No watch-mode flags (all `--testPathPattern` use `--bail` for one-shot)
- [ ] Feedback latency < 60s (quick command 12s; full backend suite ~45s)
- [ ] `nyquist_compliant: true` set in frontmatter (gate: planner backfills task IDs and the file passes review)

**Approval:** pending

---
phase: 04-archive-lifecycle-owner-mod-admin
plan: 01
subsystem: backend-foundations
tags: [backend, schema, audit-log, supertest, wave-0, red-tests]
requires:
  - Phase 1 ROLE-04 verifyFirebaseToken middleware
  - Phase 2 D-21 archivedAt + archivedByUid Property schema fields
  - Phase 3 D-10 ModerationLog model
  - Phase 3 VALID_REJECT_CODES const
provides:
  - archivedReasonCode + archivedReasonNote on Property Mongoose schema (D-20 + Pitfall 1)
  - 'archive' / 'unarchive' / 'hard-delete' action enum on ModerationLog (D-05)
  - 17 RED supertest cases scaffolded across 5 Phase-4 describe blocks (Wave-0 scaffolding)
  - 3 incidentally-passing tests via existing requireMinRole gate
affects:
  - JayTap-services/src/models/Property.js (+2 LOC)
  - JayTap-services/src/models/ModerationLog.js (1-line in-place edit)
  - JayTap-services/src/__tests__/propertyRoutes.test.js (+ModerationLog import +160 LOC scaffold)
  - JayTap-services/src/__tests__/moderationRoutes.test.js (+125 LOC scaffold)
tech-stack:
  added: []
  patterns: [additive-schema-only, append-only-enum, top-level-describe-isolation, RED-tests-as-contract]
key-files:
  created: []
  modified:
    - JayTap-services/src/models/Property.js
    - JayTap-services/src/models/ModerationLog.js
    - JayTap-services/src/__tests__/propertyRoutes.test.js
    - JayTap-services/src/__tests__/moderationRoutes.test.js
decisions:
  - Added BOTH archivedReasonCode + archivedReasonNote (not just archivedReasonNote per D-20) per RESEARCH §Q1 Pitfall 1 — schema audit confirmed both fields were missing
  - Phase 4 supertest blocks scaffolded as NEW top-level describe blocks (not nested inside existing describes) so each gets its own `app = makeApp()` setup; matches the existing CR-01 / Phase 2 / Phase 3 file convention
  - Added ModerationLog import to propertyRoutes.test.js; was missing for hard-delete + owner-archive audit assertions
metrics:
  duration: 22min
  tasks_completed: 3/3
  completed: 2026-05-03
requirements: [ARCH-01, ARCH-02, ARCH-04, ARCH-05]
---

# Phase 4 Plan 01: Wave-1 Backend Foundations — Property Schema + ModerationLog Enum + RED Supertest Scaffolds Summary

**One-liner:** Land the additive Mongoose schema fields (`archivedReasonCode` + `archivedReasonNote`) and audit-log action enum verbs (`archive` / `unarchive` / `hard-delete`) that every Phase 4 status-changing route writes to, and scaffold 20 RED supertest cases (5 describe blocks across 2 files) that Wave-2 plans (04-02 / 04-03 / 04-04) flip to GREEN as the routes ship.

## Outcome

| Task | Description | Commit | LOC delta |
|------|-------------|--------|-----------|
| 1 | Property schema +2 nullable string fields (archivedReasonCode, archivedReasonNote) | `f54bd61` | +2 (91 → 93) |
| 2 | ModerationLog action enum +3 verbs (archive, unarchive, hard-delete) | `cea35fc` | 0 (single-line edit; LOC unchanged at 31) |
| 3 | Phase 4 RED supertest scaffolds in propertyRoutes.test.js + moderationRoutes.test.js | `95e7efa` | +285 (160 prop + 125 mod, +1 import) |

All three commits land in the backend repo at `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services`.

## Schema Diff

**`Property.js` (+2 LOC, 91 → 93)** — additive only, slotted immediately after `archivedByUid`:

```diff
   archivedAt: { type: Date, default: null },
   archivedByUid: { type: String, default: null },
+  archivedReasonCode: { type: String, default: null }, // Phase 4 D-20: mod-archive populates from VALID_REJECT_CODES; owner-archive leaves null
+  archivedReasonNote: { type: String, default: null }, // Phase 4 D-20: mod-archive optional free-text; owner-archive leaves null

   ownerUid: String, // Links listing to renter who created it
```

**`ModerationLog.js` (1-line value rewrite, LOC unchanged at 31)** — append-only enum extension:

```diff
-  action:     { type: String, enum: ['approve', 'reject', 'edit-on-behalf'], required: true },
+  action:     { type: String, enum: ['approve', 'reject', 'edit-on-behalf', 'archive', 'unarchive', 'hard-delete'], required: true },
```

## Test Scaffold Count

**propertyRoutes.test.js** — 3 new top-level describe blocks, 11 RED cases:

| Describe block | Cases | Coverage |
|----------------|-------|----------|
| `Phase 4 — Archive Lifecycle: owner-archive POST /api/properties/:id/archive` | 5 | happy 200, 403 non-owner, 409 ALREADY_ARCHIVED, anti-spoofing audit row (actorUid from JWKS), race-condition Promise.all |
| `Phase 4 — Archive Lifecycle: owner-unarchive POST /api/properties/:id/unarchive` | 2 | happy 200 + status=pending + submittedAt restamp + audit fields cleared, 403 NOT_ORIGINAL_ARCHIVER (D-13) |
| `Phase 4 — Archive Lifecycle: hard-delete admin-only DELETE /api/properties/:id (D-04)` | 4 | admin happy + audit row before-snapshot, 403 mod, 403 owner, 400 HARD_DELETE_REQUIRES_ARCHIVED |

**moderationRoutes.test.js** — 2 new top-level describe blocks, 9 RED cases:

| Describe block | Cases | Coverage |
|----------------|-------|----------|
| `Phase 4 — Archive Lifecycle: mod-archive POST /api/moderation/properties/:id/archive` | 6 | happy 200 + audit row, 400 missing reasonCode, 400 invalid reasonCode, 403 plain-user, 409 already-archived, anti-spoofing |
| `Phase 4 — Archive Lifecycle: mod-restore POST /api/moderation/properties/:id/restore` | 3 | happy 200 + selective field clears (D-15 approval-history preserved), 409 not-archived, 403 plain-user |

**Total new tests:** 20 (11 propertyRoutes + 9 moderationRoutes)

**Effective test counts (jest output):**
```
Test Suites: 2 failed, 4 passed, 6 total
Tests:       17 failed, 89 passed, 106 total
```

- **86 baseline tests:** all still pass (Phase 1-3 suite preserved per T-04-01-REGRESSION threat-register row)
- **17 of 20 new Phase 4 tests fail RED** (intended — routes ship in Wave-2 plans 04-02/03/04)
- **3 of 20 new Phase 4 tests incidentally pass** because they assert 403 on routes that already 403 via existing role-gating middleware:
  1. `mod-archive plain user → 403` — existing router-level `requireMinRole('moderator')` blocks before the route exists
  2. `mod-restore plain user → 403` — same router-level mount
  3. `moderator hard-delete → 403` — existing `DELETE /:id` owner-only inline check rejects non-owner moderator

These 3 incidental passes are **not regressions**: they correctly validate the gate is active even with the route absent / pre-tighten. They will continue to pass once Wave-2 lands the routes (the assertions match the post-tighten behavior).

## Existing-Suite Preservation Evidence

```
PASS src/__tests__/Property.test.js
PASS src/__tests__/User.test.js
PASS src/__tests__/verifyFirebaseToken.test.js
PASS src/__tests__/authRoutes.test.js
FAIL src/__tests__/moderationRoutes.test.js          # only Phase 4 RED cases fail
FAIL src/__tests__/propertyRoutes.test.js            # only Phase 4 RED cases fail

Test Suites: 2 failed, 4 passed, 6 total
Tests:       17 failed, 89 passed, 106 total
```

All 86 baseline Phase 1-3 tests (CR-01 anti-tamper / Phase 2 D-05/D-06/D-12/D-15/D-22 / Phase 3 MOD-10..MOD-18) pass. Failures are exclusively the new Phase 4 RED scaffolds.

## Locked LOC Baselines for Downstream Waves

| File | Pre-Plan-01 LOC | Post-Plan-01 LOC | Delta |
|------|-----------------|------------------|-------|
| JayTap-services/src/models/Property.js | 91 | 93 | +2 |
| JayTap-services/src/models/ModerationLog.js | 31 | 31 | 0 |
| JayTap-services/src/__tests__/propertyRoutes.test.js | 346 | 508 | +162 |
| JayTap-services/src/__tests__/moderationRoutes.test.js | 408 | 533 | +125 |

Wave-2 plans (04-02 / 04-03 / 04-04) take these as fixed baselines:
- They MUST NOT modify Property.js or ModerationLog.js (additive-only-and-already-additive).
- They MAY modify the test files only to flip RED → GREEN by landing the route handlers (no test-shape rewrites).

## Anti-Pattern Grep Gate (Carry-forward from Phase 3)

```
$ grep -nE "actorUid:\s*req\.(body|headers)" \
    /Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/routes/propertyRoutes.js \
    /Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/routes/moderationRoutes.js
exit=1   # 0 matches — production routes never source actorUid from client-controlled fields
```

Production routes untouched in Plan 01; the gate stays GREEN. Wave-2 plans inherit the requirement.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added missing `ModerationLog` import to propertyRoutes.test.js**

- **Found during:** Task 3
- **Issue:** Plan instructed to check for the import via `grep "require.*ModerationLog" src/__tests__/propertyRoutes.test.js` and add it if missing. The grep returned empty.
- **Fix:** Added `const ModerationLog = require('../models/ModerationLog');` at line 45 next to `const Property = require('../models/Property');`. Required for the audit-row assertions in the owner-archive anti-spoofing test and the hard-delete before-snapshot test.
- **Files modified:** JayTap-services/src/__tests__/propertyRoutes.test.js
- **Commit:** `95e7efa` (folded into Task 3 commit per plan instructions)

### Plan-Spec Drift (Documented, Not Auto-Fixed)

**1. New describe blocks placed at TOP LEVEL of file (not nested inside existing outer describe)**

- **Plan said:** "Append before the file's terminating `module.exports`/end-marker (or at EOF if none)"
- **Did:** Appended as separate top-level describes with their own `let app; beforeEach(async () => { app = makeApp(); ... });` setup
- **Why:** The existing files have a single OUTER `describe(...)` that wraps everything in the file. Appending "at EOF" puts new describes OUTSIDE the outer wrapper — they need their own `app = makeApp()` setup since the outer `beforeEach` is no longer in scope. This matches the existing `propertyRoutes — CR-01 ...` block pattern (lines 55-96), which is itself a top-level describe with its own scoped setup.
- **Effect:** Slightly more setup boilerplate per describe (+1 `let app;` + `app = makeApp()` per beforeEach), but correctly isolates each block's lifecycle. Test counts and assertions match plan spec exactly.

### Authentication Gates

None encountered.

### Other

- Baseline test count was **86** at session start (not 85 as the plan said). The plan said "85 baseline" but the live suite has been at 86 since Phase 3 closure. Acceptance criteria `≥ 85 passing` satisfied by `89 passing` (86 baseline + 3 incidentally passing Phase 4 cases).

## Threat Flags

None new. Plan 01 stays inside the threat register's `mitigate` boundaries:

- **T-04-01-AUDIT** mitigated: ModerationLog action enum extended with `'archive'`, `'unarchive'`, `'hard-delete'` (Task 2)
- **T-04-01-DATA-LOSS** mitigated: Both `archivedReasonCode` AND `archivedReasonNote` added per RESEARCH §Q1 Pitfall 1 (Task 1)
- **T-04-01-REGRESSION** held: 86 baseline tests still pass (Tasks 1, 2, 3)
- **T-04-01-AUTHN** held: Production-source grep gate `actorUid: req.(body|headers)` returns 0 (carry-forward; production routes untouched in Plan 01)

## Self-Check: PASSED

**Files verified to exist:**
- FOUND: `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/models/Property.js` (93 LOC)
- FOUND: `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/models/ModerationLog.js` (31 LOC)
- FOUND: `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/__tests__/propertyRoutes.test.js` (508 LOC)
- FOUND: `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/__tests__/moderationRoutes.test.js` (533 LOC)

**Commits verified in backend repo `git log`:**
- FOUND: `f54bd61 feat(04-01): extend Property schema with archivedReasonCode + archivedReasonNote`
- FOUND: `cea35fc feat(04-01): extend ModerationLog action enum with archive + unarchive + hard-delete`
- FOUND: `95e7efa test(04-01): scaffold Phase 4 RED supertest blocks for archive lifecycle (Wave-0)`

**Acceptance criteria verified:**
- Property.js LOC = 93 (was 91; +2) ✓
- Property.js `grep -c archivedReasonCode` = 1 ✓
- Property.js `grep -c archivedReasonNote` = 1 ✓
- ModerationLog.js LOC = 31 (unchanged) ✓
- ModerationLog.js enum-shape grep returns 1 line ✓
- propertyRoutes.test.js `grep -c "Phase 4 — Archive Lifecycle"` = 4 (≥3 ✓)
- moderationRoutes.test.js `grep -c "Phase 4 — Archive Lifecycle"` = 3 (≥2 ✓)
- propertyRoutes.test.js `grep -c "Promise.all"` = 2 (≥1 ✓)
- propertyRoutes.test.js `grep -cE "ALREADY_ARCHIVED|HARD_DELETE_REQUIRES_ARCHIVED|NOT_ORIGINAL_ARCHIVER"` = 5 (≥3 ✓)
- jest summary: 89 passing (≥86 baseline preserved) ✓
- Anti-pattern grep `actorUid: req.(body|headers)` returns 0 in production routes ✓
- i18n parity script exits 0 ✓

---

*Plan 04-01 closes Wave-1 backend foundations. Wave-2 plans 04-02 (owner archive/unarchive) and 04-03 (mod/admin archive/restore) are unblocked. Plan 04-04 (hard-delete admin-only middleware swap) is also unblocked. ARCH-01, ARCH-02, ARCH-04, ARCH-05 backend-foundation slices in place.*

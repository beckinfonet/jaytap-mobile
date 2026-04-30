---
phase: 01-backend-role-foundation-auth-migration-hotfix-bundle
plan: 08
subsystem: backend (production data migration)
tags: [migration, mongo-atlas, role-cutover, ROLE-02, T-1-07, T-1-08]
requires:
  - "Plan 03 — package.json migrate:roles-m2 script entry"
  - "Plan 04 — User schema (roleRevokedAt field unaffected here, but schema must boot)"
  - "Plan 06 + 07 — backend deployed with dual-accept verifyFirebaseToken HTTP+socket so production traffic continues during the migration window"
provides:
  - "Production user_profile collection: 0 records remain at legacy enum values (renter/owner/agent → user)"
  - "M1 admin (beckprograms@gmail.com) has userType: 'admin' in production Mongo — unblocks Plan 13 (RN client allowlist deletion) without locking out the maintainer"
  - "src/scripts/migrate-roles-m2.js committed in backend repo: re-runnable + dry-run + verify subcommand"
affects:
  - "Plan 09 (User enum cutover) — UNBLOCKED. ROLE-02 acceptance gate is met (countDocuments($nin canonical) === 0) so the schema can be tightened to ['user', 'moderator', 'admin'] without rejecting existing records."
  - "Plan 13 (delete adminAllowlist.ts) — UNBLOCKED. Mongo is the source of truth for admin status; the maintainer's email is set at Mongo level."
tech-stack:
  added: []
  patterns: ["one-shot migration script with dry-run + idempotent filter + acceptance subcommand"]
key-files:
  created:
    - "/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/src/scripts/migrate-roles-m2.js (112 LOC; Task 1 commit 3d2455c)"
  modified:
    - "production MongoDB Atlas: user_profile collection (12 records flipped renter→user; 1 record promoted to admin)"
decisions:
  - "Pattern 7 Option A (UPDATE-ONLY admin path) used as planned — no upsert, no fake uid. Pre-flight A1 check skipped on the maintainer side because mongosh wasn't installed locally; the maintainer used the Atlas web console to confirm admin record post-run."
  - "ACCEPTANCE log line uses db.user_profile (correct collection per PATTERNS.md flag 2 + User.js:44) NOT db.users (which RESEARCH.md Pattern 6 line 653 incorrectly used). Task 1 agent caught and corrected this."
  - "Live run Step 2 logged 'promote user → admin' rather than 'promote renter → admin' because the admin promotion findOne() runs AFTER the bulk renter→user updateMany. End state is correct (admin); the log copy is just a side effect of execution order. No bug — documented for future readers."
metrics:
  duration: "~12 minutes total (Task 1 ~3 min agent + Task 2 ~9 min user-supervised production run)"
  started: "2026-04-30 (Task 1 agent run, commit 3d2455c)"
  completed: "2026-04-30 ~01:32 PT (Task 2 production migration confirmed by user)"
  tasks: 2
  files-created: 1
  commits-backend: 1
  commits-rn-client: 1
---

# Phase 01 Plan 08: ROLE-02 Production Role Migration Summary

One-liner: Authored and executed the one-shot `migrate-roles-m2.js` against production MongoDB Atlas — 12 legacy `renter` records flipped to canonical `user`, M1 admin promoted, idempotent re-run verified, `--verify` exit 0; ROLE-02 acceptance gate met, unblocking Plan 09 enum cutover and Plan 13 RN allowlist deletion.

## Performance

- **Duration:** ~12 min total
- **Started:** 2026-04-30 (Task 1 agent)
- **Completed:** 2026-04-30 ~01:32 PT (Task 2 production run)
- **Tasks:** 2/2
- **Commits:** 1 backend (script) + 1 RN client (this SUMMARY + VALIDATION update)

## Accomplishments

1. **Migration script committed** — `src/scripts/migrate-roles-m2.js` (112 LOC), idempotent, dry-run + --verify supported, UPDATE-ONLY admin path.
2. **Production data migrated** — 12 records flipped `renter` → `user`; 0 `owner`/`agent` records existed; admin email promoted to `userType: 'admin'`.
3. **Acceptance proven empirically** — `db.user_profile.countDocuments({userType: {$nin: ['user', 'moderator', 'admin']}}) === 0`.
4. **Idempotency verified** — re-running the live script returns all flips at 0 + admin "already admin (no-op)".
5. **5-step ordering preserved** — Plan 09 enum cutover and Plan 13 allowlist deletion are now safe.

## Task Commits

1. **Task 1 (auto): Author migrate-roles-m2.js** — `3d2455c` (backend): `feat(scripts): migrate-roles-m2 — enum flip + M1 admin upsert + verify [ROLE-02]`
2. **Task 2 (checkpoint:human-verify): Production run** — no code commits (production Mongo writes only); evidence captured in VALIDATION.md "Migration script run" Manual-Only row.

## Production Run Evidence (verbatim per the user's terminal output)

### Dry-run (`npm run migrate:roles-m2 -- --dry-run`)

```
Database: bizdinkonush
=== DRY RUN ===
  renter -> user: 12 records
  owner -> user: 0 records
  agent -> user: 0 records

Step 2: M1 admin promotion (update-only)
  beckprograms@gmail.com: promote renter -> admin

Post-migration: 12 records still at non-canonical userType.
(dry-run — would meet acceptance after running without --dry-run)
```

### Live run (`npm run migrate:roles-m2`)

```
Database: bizdinkonush
=== MIGRATION ===
  renter -> user: 12 records
    updated: 12
  owner -> user: 0 records
  agent -> user: 0 records

Step 2: M1 admin promotion (update-only)
  beckprograms@gmail.com: promote user -> admin

Post-migration: 0 records still at non-canonical userType.
ACCEPTANCE MET (ROLE-02): db.user_profile.countDocuments({userType:{$nin:["user","moderator","admin"]}}) === 0
```

(Note: "promote user → admin" instead of "renter → admin" because Step 1's bulk updateMany flipped the maintainer to `user` BEFORE Step 2's findOne ran. End state is `admin`. Cosmetic logging artifact only.)

### --verify subcommand

```
Records with non-canonical userType: 0
VERIFY: PASS — ROLE-02 acceptance met
```

Exit code 0.

### Idempotent re-run (`npm run migrate:roles-m2`)

```
=== MIGRATION ===
  renter -> user: 0 records
  owner -> user: 0 records
  agent -> user: 0 records

Step 2: M1 admin promotion (update-only)
  beckprograms@gmail.com: already admin (no-op)

Post-migration: 0 records still at non-canonical userType.
ACCEPTANCE MET (ROLE-02): db.user_profile.countDocuments({userType:{$nin:["user","moderator","admin"]}}) === 0
```

### Spot-check the maintainer record

`mongosh` not installed locally; the user verified via the Atlas web console that `beckprograms@gmail.com` has `userType: "admin"`.

## Acceptance Criteria — Status

- [x] `npm run migrate:roles-m2 -- --verify` exits 0 with "VERIFY: PASS"
- [x] `db.user_profile.countDocuments({userType: {$nin: ["user", "moderator", "admin"]}})` returns 0 (per ACCEPTANCE log line in live run)
- [x] `db.user_profile.findOne({email: "beckprograms@gmail.com"})` returns a document with `userType: "admin"` (Atlas console spot-check)
- [x] Re-running `npm run migrate:roles-m2` returns all 0 counts (idempotency proven)
- [x] 01-VALIDATION.md updated with run timestamp + per-flip counts (Manual-Only "Migration script run" row + 1-08-01/1-08-02 rows flipped to ✅)

## Threat Model — Status

| Threat ID | Status |
|-----------|--------|
| T-1-07 (Tampering / DoS — partial migration) | mitigated — dry-run preview before live run; idempotent filter (already-migrated records skipped); --verify gates Plan 09 |
| T-1-08 (DoS — M1 admin lockout post-migration) | mitigated — D-09 admin seed embedded in same script; UPDATE-ONLY path executed without WARNING; admin record confirmed at userType:'admin' via Atlas console |

## Deviations from Plan

### 1. Step A pre-flight check skipped (mongosh not installed locally)

- **Found during:** Task 2 Step A
- **Issue:** Plan called for `mongosh "<MONGO_URI>" --eval 'db.user_profile.findOne(...)'` to confirm the maintainer record exists. `zsh: command not found: mongosh` on the maintainer's laptop.
- **Fix:** The dry-run (Step B) is itself a stronger pre-flight: it does `findOne` via the script's connectDB path and would have logged `WARNING: ${email} — record not in Mongo` if the record were missing. Dry-run logged `promote renter -> admin` (no WARNING), proving the record exists. Step F (post-migration spot-check) was completed via the Atlas web console instead of mongosh.
- **Future ops:** Recommend adding `mongosh` to the developer setup doc (`brew install mongosh`). Not a blocker for this run.

### 2. Live run "promote user → admin" copy

- **Found during:** Task 2 Step C
- **Issue:** Step 2 of the live run logged `beckprograms@gmail.com: promote user -> admin`, not `promote renter -> admin` as the dry-run had logged.
- **Fix:** No fix required — this is the correct end state. Step 1's bulk `updateMany({userType: 'renter'}, {$set: {userType: 'user'}})` runs BEFORE Step 2's `findOne({email})`, so by the time Step 2 inspects the maintainer record, it's already at `user`. The log message reflects the *current* userType at the moment of findOne. End state is `admin` either way.
- **Action:** Noted in plan-completion log so future readers don't think the script regressed when the message changes.

### 3. RESEARCH.md Pattern 6 line 653 used wrong collection name

- **Found during:** Task 1 (script authoring)
- **Issue:** RESEARCH.md Pattern 6 hard-coded `db.users.countDocuments(...)` in the ACCEPTANCE log string, but the actual Mongoose collection is `user_profile` (per `User.js:44`).
- **Fix:** Task 1 agent used the correct `db.user_profile.countDocuments(...)` per PATTERNS.md flag 2 / important_context spec #9. The mismatch surfaces ONLY in the human-readable log line; the actual countDocuments call is `User.countDocuments(...)` which uses the Mongoose model and is unaffected by the log string.

## Routing

- **Next plan:** 01-09 (Wave 6) — User schema enum cutover from `['renter', 'owner', 'agent', 'admin']` to `['user', 'moderator', 'admin']` + default flip from `'renter'` to `'user'`. Now safe to deploy because Mongo has zero records at the legacy values.
- **Eventually unblocks:** 01-13 (Wave 9) — RN client `adminAllowlist.ts` deletion, because the maintainer's admin status is now persisted in Mongo (no longer dependent on the client-side allowlist for admin gating).

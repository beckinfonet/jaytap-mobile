# Phase 5 — Deferred Items Log

Items discovered during Phase 5 plan execution that are out-of-scope for the current plan and routed forward (M3 follow-up backlog or next-phase planning).

---

## DEF-01: `npm test` jest pollution from stale `.claude/worktrees/agent-*` dirs

**Discovered during:** Plan 05-03 (atomic version bump v3.0.0)
**Discovered at SHA:** `8e7305a` (pre-bump HEAD; reproduced post-bump)
**Scope verdict:** out-of-scope for Plan 05-03 per executor's SCOPE BOUNDARY rule (failures pre-exist the plan's edits; bump touched zero `src/` paths).

**Symptom:** `npm test` exits 1 with `Test Suites: 12 failed, 56 passed, 68 total / Tests: 6 failed, 700 passed`.

**Root cause:** Five parallel-executor worktree directories from prior phases (`.claude/worktrees/agent-a182b781c8d474ceb`, `agent-a545d4d5d2a4ef41d`, `agent-aa0b9593dd69e6ff0`, `agent-ac77564fe620be4f9`, `agent-af97a8c029a86cc67`) are still on disk. Jest's default discovery walks them as additional roots, multiplying every test suite by ~6 (live `src/` + 5 worktree copies). Two suites — `src/hooks/__tests__/useRole.test.ts` and `src/services/__tests__/PropertyService.test.ts` — fail because the worktrees hold older `apiClient.ts` / dependency-injection wiring that no longer constructs `axios` correctly under the live jest config.

The same failure pattern reproduces against the pristine pre-bump HEAD `8e7305a` (verified via `git stash` + `npm test`), confirming pre-existence.

**Why not auto-fixed in Plan 05-03:**
- Bump only touches `package.json` `version` field + iOS `MARKETING_VERSION`/`CURRENT_PROJECT_VERSION` + Android `versionCode`/`versionName`. Zero source code paths in scope.
- Plan 05-01's preflight + Plan 05-02's store-history capture both closed without resolving this (same HEAD), implying project tolerates this pre-existing state during release-track Wave 1+2.
- Plan 05-03's binding `<verify><automated>` gate is the 10-grep assertion battery (all PASS). The two CI sentinel scripts (`check-i18n-parity.sh` + `check-create-listing-screen-removed.sh`) both exit 0.

**Forward signal — recommended fix in Phase 5 Plan 05-06 paired-gate audit OR M3 follow-up:**

```bash
# One-shot cleanup (verify nothing important inside first):
rm -rf .claude/worktrees/

# Then either pin jest's testPathIgnorePatterns to skip `.claude/worktrees`
# or rely on `git clean -ndx` review to confirm dirs are pure stale executor state.
```

If Plan 05-06's reviewer flags this as a regression risk (it isn't — the live `src/` failures are also pre-existing), the cleanup is a single commit: `chore: prune stale parallel-executor worktree dirs`.

**Tags:** out-of-scope, pre-existing, jest-pollution, phase-5-defer, m3-backlog-candidate

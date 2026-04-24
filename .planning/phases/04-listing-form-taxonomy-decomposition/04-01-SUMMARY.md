---
phase: 04-listing-form-taxonomy-decomposition
plan: 01
subsystem: validation-infrastructure
tags: [taxonomy, ci-gate, wave-0, jest, bash, red-test, form-01, form-03, form-09]
requires:
  - src/hooks/__tests__/useRole.test.ts          # analog for RED test shape
  - scripts/check-role-grep.sh                   # analog for bash script shape
  - src/locales/en.ts                            # i18n parity source
  - src/locales/ru.ts                            # i18n parity mirror
  - jest.config.js                               # preset: 'react-native'
provides:
  - src/utils/__tests__/propertyCategory.test.ts  # RED pure-function suite (7 assertions)
  - scripts/check-land-removed.sh                 # FORM-01 atomic-removal gate (FAILs by design)
  - scripts/check-i18n-parity.sh                  # FORM-09 EN+RU parity gate (PASSes at HEAD)
affects:
  - Plan 04-02: Wave 1 must create src/utils/propertyCategory.ts to turn the RED jest suite GREEN
  - Plan 04-02: Wave 1 must remove Land atomically (3 src/ touchpoints) to turn check-land-removed.sh GREEN
  - Plan 04-02: Wave 1 mid-transaction edits to a single locale file will briefly FAIL check-i18n-parity.sh — must commit both locales atomically
tech-stack:
  added: []                                      # no new libraries; jest + bash pre-existed
  patterns:
    - "Co-located unit tests via src/<subdir>/__tests__/<file>.test.ts (CONVENTIONS.md line 19)"
    - "RED jest suites that fail at import-time (Cannot find module) as Wave-0 scaffolding before Wave-1 source file exists"
    - "Bash CI gates following scripts/check-role-grep.sh analog: shebang + set -u + cd to repo root + per-invariant hits accumulator + PASS/FAIL banner + exit code"
key-files:
  created:
    - src/utils/__tests__/propertyCategory.test.ts  # 40 lines, 7 assertions (5 function + 2 map-integrity)
    - scripts/check-land-removed.sh                 # 45 lines, 2 invariants, chmod +x, exit 1 at commit time
    - scripts/check-i18n-parity.sh                  # 27 lines, 1 diff invariant, chmod +x, exit 0 at commit time
  modified: []                                      # no source-tree edits (Phase 3 check-role-grep.sh still PASSes)
decisions:
  - "RED-by-design test lands before source file (TDD Wave-0 pattern) — shape matches useRole.test.ts verbatim"
  - "check-land-removed.sh grep pattern matches plan's PATTERNS §13 row 541 literally — no test-file carve-out added (deviation rationale below)"
  - "check-i18n-parity.sh treated as belt-and-suspenders to TypeScript Record<TranslationKeys, string> enforcement; script docblock explicitly forbids removing tsc --noEmit check"
metrics:
  duration: "< 10 minutes"
  completed: 2026-04-23
  tasks_completed: 3
  files_created: 3
  files_modified: 0
  commits: 3
---

# Phase 4 Plan 01: Wave-0 Validation Scaffolding Summary

**One-liner:** Three CI/test artifacts land the phase's automated safety net — a RED jest suite that fails until Plan 04-02 creates `src/utils/propertyCategory.ts`, a FORM-01 atomic-removal grep gate that fails by design until atomic `Land` removal, and a FORM-09 EN+RU parity gate that currently passes (belt-and-suspenders to TypeScript `Record<TranslationKeys, string>`).

## What Shipped

### Task 1: `src/utils/__tests__/propertyCategory.test.ts` (commit `2583c7a`)

Pure-function jest unit suite, 7 assertions total:
- **5 function-behavior assertions:**
  - `propertyTypeToCategory('Apartment')` → `'Residential'`
  - `propertyTypeToCategory('Office')` → `'Commercial'`
  - `propertyTypeToCategory('Hostel')` → `'Hospitality'`
  - `propertyTypeToCategory('Hotel')` → `'Hospitality'`
  - `propertyTypeToCategory('UnknownOrLand')` → `'Residential'` (safe fallback per RESEARCH §Pattern 1)
- **2 map-integrity assertions:**
  - `PROPERTY_TYPE_TO_CATEGORY.Industrial === 'Commercial'`
  - `'Land' in PROPERTY_TYPE_TO_CATEGORY === false` (FORM-01 map-drift guard per RESEARCH Open Q #4)

**Shape:** copied verbatim from `src/hooks/__tests__/useRole.test.ts` — `/** @format */` docblock, relative sibling import from `../propertyCategory`, two `describe` blocks with `test(...)` entries, `expect(...).toBe(...)` primitive assertions.

**Commit-time state:** RED. Jest reports `Cannot find module '../propertyCategory'`. Wave 1 (Plan 04-02) will create the source file and turn this GREEN.

**Path note:** Lives at `src/utils/__tests__/propertyCategory.test.ts` per CONVENTIONS.md line 19 co-located convention — NOT the flat `src/utils/propertyCategory.test.ts` path some upstream plan-context text referenced. The plan's `must_haves.artifacts[0].path` matches the co-located path I used.

### Task 2: `scripts/check-land-removed.sh` (commit `5ba60e2`)

FORM-01 atomic-removal CI gate. Two grep invariants:
1. No `'Land'` or `"Land"` string literal in `src/` (landlord/landscape unaffected — only quoted literals match)
2. No `propertyType.land` i18n key reference in `src/`

**Commit-time state:** FAIL exit 1 by design. Both invariants currently match:
- Invariant #1: 4 hits — `src/locales/en.ts:259`, `src/screens/HomeScreen.tsx:49`, `src/screens/CreateListingScreen.tsx:45`, and my new test file `src/utils/__tests__/propertyCategory.test.ts:38` (the map-integrity assertion `'Land' in PROPERTY_TYPE_TO_CATEGORY`).
- Invariant #2: 3 hits — `src/locales/en.ts:259`, `src/locales/ru.ts:262`, `src/screens/CreateListingScreen.tsx:45`.

Shape copied verbatim from `scripts/check-role-grep.sh` (Phase 3 analog, commit `fa25b8b`): `#!/usr/bin/env bash`, `set -u`, `cd "$(dirname "$0")/.."`, `fail=0 / violations=""` accumulator, per-invariant `hits=$(grep -rn … 2>/dev/null || true)` pattern, PASS/FAIL banner + exit code. `chmod +x` applied.

**Runtime:** ~0.04s.

### Task 3: `scripts/check-i18n-parity.sh` (commit `8453984`)

FORM-09 EN+RU key-set parity CI gate. Single `diff` invariant wrapping the canonical recipe from 04-RESEARCH.md §Pitfall 5:

```bash
en_keys=$(grep -oE "'[a-zA-Z.]+':" src/locales/en.ts | sort -u)
ru_keys=$(grep -oE "'[a-zA-Z.]+':" src/locales/ru.ts | sort -u)
diff_out=$(diff <(echo "$en_keys") <(echo "$ru_keys") || true)
```

**Commit-time state:** PASS exit 0. At HEAD, en.ts and ru.ts have identical key sets (9 `propertyType.*` keys each, all other namespaces match — verified via the script itself).

Belt-and-suspenders to TypeScript enforcement: `src/locales/ru.ts:3` declares `Record<TranslationKeys, string>` which fails `tsc --noEmit` on drift. Script docblock explicitly forbids removing the `tsc --noEmit` check in favor of this alone.

**Expected behavior during Plan 04-02:** gate will briefly FAIL mid-transaction (when only one locale file is being edited) but MUST be back to PASS after the single atomic commit that lands parallel edits to both files. `chmod +x` applied.

## Commits

| Task | Hash      | Type     | Message (trimmed)                                            |
| ---- | --------- | -------- | ------------------------------------------------------------ |
| 1    | `2583c7a` | test     | test(04-01): add RED propertyCategory.test.ts jest suite     |
| 2    | `5ba60e2` | scripts  | scripts(04-01): add check-land-removed.sh — currently FAILs by design |
| 3    | `8453984` | scripts  | scripts(04-01): add check-i18n-parity.sh — passes at HEAD    |

All three commits are scoped (explicit path `git add`, never `-A` / `.`). `android/app/build.gradle` uncommitted changes preserved in the working tree (verified post-commit: still only `M android/app/build.gradle` in `git status`).

## Verification (plan success criteria)

Confirmed all 5 criteria from the plan's `<success_criteria>` block:

| # | Criterion | Status |
|---|-----------|--------|
| 1 | `src/utils/__tests__/propertyCategory.test.ts` exists, 5+2 assertions, RED | PASS — `Cannot find module '../propertyCategory'` |
| 2 | `scripts/check-land-removed.sh` exists, executable, FAILs at commit (by design) | PASS — exit 1 confirmed |
| 3 | `scripts/check-i18n-parity.sh` exists, executable, PASSes at commit | PASS — exit 0 confirmed |
| 4 | `scripts/check-role-grep.sh` still exits 0 (this plan touches no src/ code) | PASS — "all 4 D-14 grep invariants hold" |
| 5 | Commit message explicitly notes the land-removed gate is RED by design | PASS — Task 2 commit subject + body both say so |

Per-task `<acceptance_criteria>` block: all 22 individual checks passed (verified inline during execution — see commit trail).

## Deviations from Plan

### Observations (no rule-triggering deviations)

**1. [Observation — forward signal for Plan 04-02] `check-land-removed.sh` invariant #1 matches the new test file after this plan lands**

- **Found during:** Task 2 verification run (post-`chmod +x`, before commit)
- **Observation:** Invariant #1 uses grep pattern `'Land'\|"Land"` across all of `src/`. My Task 1 test file contains `expect('Land' in PROPERTY_TYPE_TO_CATEGORY).toBe(false)` — which contains the literal `'Land'` and thus matches the invariant. After Plan 04-02 removes the other 3 hits (en.ts, HomeScreen, CreateListingScreen), this test-file hit will remain and block the gate from flipping GREEN.
- **Why not auto-fixed here:** The plan's action spec (row 209–216 of 04-01-PLAN.md) specifies the exact grep pattern verbatim with no carve-out, and the plan's acceptance criterion (row 251) requires `grep -cE "'Land'\\|\\\"Land\\\"" scripts/check-land-removed.sh` returns at least `1`. Adding a per-file carve-out via `grep -v '^src/utils/__tests__/propertyCategory\.test\.ts:'` (matching scripts/check-role-grep.sh's precedent for useRole.ts) would deviate from the plan's literal spec.
- **Recommended Plan 04-02 remediation:** Plan 04-02's executor should add a carve-out to invariant #1 for the test file (precedent: check-role-grep.sh carves out useRole.ts via `grep -v '^src/hooks/useRole\.ts:'`). The test-file hit is a **map-drift assertion** (it asserts `Land` is NOT a key) — semantically this is the *opposite* of a regression, so excluding it from the gate is correct. Alternatively, Plan 04-02 could rewrite the test assertion to avoid the literal string (e.g., `expect(Object.keys(PROPERTY_TYPE_TO_CATEGORY)).not.toContain('Land')` uses `'Land'` as an argument, which still matches — so the carve-out is the cleaner path).
- **Files:** scripts/check-land-removed.sh line 19 invariant #1 grep
- **Severity:** Non-blocking for Plan 04-01 (plan expects FAIL exit 1 at this commit). Becomes blocking for Plan 04-02's `success_criteria` criterion 1 (Land removed → gate flips GREEN).

No Rule 1 / Rule 2 / Rule 3 fixes applied (plan was clean). No Rule 4 architectural questions. No authentication gates (pure source-tree plan).

## Threat Flags

None. This plan introduces no new trust boundaries, no network endpoints, no auth paths, no schema changes. Ships only a read-only test file and two non-runtime bash scripts (T-04-03 from the plan's threat register is specifically mitigated by `check-i18n-parity.sh`, which this plan delivers).

## Known Stubs

None. The RED test suite is intentionally scaffolded ahead of Plan 04-02's source-file creation — this is TDD's RED phase, not a UI stub. No empty-data placeholders, no "coming soon" text, no unwired components.

## TDD Gate Compliance

Task 1 is tagged `tdd="true"` in the plan. Plan is type `execute` (not plan-level TDD) — so the per-task TDD cycle applies. This plan completes the **RED** gate only:
- RED (Task 1 commit `2583c7a`): `test(04-01): add RED propertyCategory.test.ts jest suite` — jest fails with `Cannot find module '../propertyCategory'`.
- GREEN and REFACTOR gates are deferred to Plan 04-02 (Wave 1), which creates `src/utils/propertyCategory.ts` and turns the suite GREEN.

No gate-sequence warning needed — the RED commit exists, and the plan explicitly defines GREEN as a future Plan 04-02 deliverable (not this plan's scope).

## Full Phase-Level Verification (per plan's `<verification>` block)

```
$ test -f src/utils/__tests__/propertyCategory.test.ts        → OK
$ test -x scripts/check-land-removed.sh                        → OK
$ test -x scripts/check-i18n-parity.sh                         → OK
$ ./scripts/check-i18n-parity.sh                               → PASS (exit 0)
$ ./scripts/check-land-removed.sh                              → FAIL (exit 1, by design)
$ npm test -- --findRelatedTests src/utils/__tests__/propertyCategory.test.ts
                                                               → RED (Cannot find module '../propertyCategory')
$ ./scripts/check-role-grep.sh                                 → PASS (Phase 3 regression gate still green)
```

All four expected-state lines match.

## Handoff to Plan 04-02

Wave 1 (Plan 04-02) consumes these artifacts:
1. **propertyCategory.test.ts** — will turn GREEN when `src/utils/propertyCategory.ts` is created with the exact exports listed in the plan's `<interfaces>` block (rows 73–91).
2. **check-land-removed.sh** — will turn GREEN when Plan 04-02 lands atomic Land removal across `src/locales/en.ts:259`, `src/locales/ru.ts:262`, `src/screens/HomeScreen.tsx:49`, and `src/screens/CreateListingScreen.tsx:45`. See "Observations" above for the test-file carve-out recommendation.
3. **check-i18n-parity.sh** — will stay GREEN if Plan 04-02 commits paired en.ts + ru.ts changes in a single atomic commit (11 new keys added to both files simultaneously).

No blockers carried forward. `android/app/build.gradle` uncommitted drift still belongs to Phase 8 per STATE.md todos.

## Self-Check: PASSED

Files verified via `test -f`:
- FOUND: `src/utils/__tests__/propertyCategory.test.ts`
- FOUND: `scripts/check-land-removed.sh`
- FOUND: `scripts/check-i18n-parity.sh`

Commits verified via `git log --oneline --all | grep`:
- FOUND: `2583c7a`
- FOUND: `5ba60e2`
- FOUND: `8453984`

All three file-creation claims and all three commit-hash claims verified against disk / git log.

---
phase: 03-role-gating-precursor
plan: 01
subsystem: testing
tags: [jest, tdd, test-scaffolding, conventions, role-gating, nyquist-dim8]

# Dependency graph
requires:
  - phase: 02-universal-keyboard
    provides: Jest + react-native-keyboard-controller config baseline (pre-existing Jest runtime; KBD Phase 2 introduced a test-env gap in __tests__/App.test.tsx that is pre-existing and out-of-scope here)
provides:
  - RED-phase test stubs for useRole priority ladder + allowlist case-insensitivity (Plan 02 will turn GREEN)
  - RED-phase test stub for PropertyService.patchPlatformVerifications guard (Plan 04 will turn GREEN)
  - RED-phase test stub for Gated render logic (Plan 02 will turn GREEN)
  - src/hooks/ directory convention documented
  - Co-located src/**/__tests__/ convention documented
affects: [03-02-hook-allowlist-gated, 03-04-service-guard-tests, 03-verification, M2-roles-migration]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Co-located unit tests at src/<subdir>/__tests__/*.test.ts(x)"
    - "Pure helper canFromUser extracted for React-free service consumers"
    - "RED-then-GREEN test scaffolding across waves (Nyquist Dim 8)"

key-files:
  created:
    - src/hooks/__tests__/useRole.test.ts
    - src/services/__tests__/PropertyService.test.ts
    - src/components/__tests__/Gated.test.tsx
  modified:
    - .planning/codebase/CONVENTIONS.md

key-decisions:
  - "Match existing test style (test(...), /** @format */) from __tests__/App.test.tsx rather than introducing it(...)."
  - "Use pure ReactTestRenderer for Gated (no @testing-library/react-native) — matches repo convention."
  - "Mock '../../hooks/useRole' at Jest module level for Gated tests (keeps Gated tests independent of real hook implementation)."

patterns-established:
  - "RED-phase Wave 0 test scaffold: stubs import yet-to-exist modules; Cannot find module errors are the intended signal."
  - "Co-located __tests__/ directory per module (Phase 3 is first user)."

requirements-completed: []  # NOTE: plan frontmatter listed [GATE-01, GATE-04] but both require code (hook/component/allowlist) that lands in Plan 03-02. Rolled back per deviation Rule 1 — see Deviations.

# Metrics
duration: 6min
completed: 2026-04-23
---

# Phase 03 Plan 01: Wave 0 Test Scaffolding Summary

**Three failing test stubs + CONVENTIONS.md entry establish the RED-phase verification surface that Waves 1-3 turn GREEN (Nyquist Dim 8 Wave 0 compliance).**

## Performance

- **Duration:** ~6 min (2026-04-23 19:37 → 19:43 local)
- **Started:** 2026-04-24T02:33:54Z (loaded state)
- **Completed:** 2026-04-24T02:39:45Z
- **Tasks:** 3 (Task 1 useRole stub, Task 2 PropertyService + Gated stubs, Task 3 CONVENTIONS.md edit)
- **Files modified:** 4 (3 created + 1 edited)

## Accomplishments

- `src/hooks/__tests__/useRole.test.ts` — 8 tests covering D-03 priority ladder, D-06 case-insensitive + whitespace-trimmed email comparison, D-12 `manageListings` semantics, D-04 `editMatterportUrl`/`editPanoramicUrl` admin-only
- `src/services/__tests__/PropertyService.test.ts` — 3 tests covering D-17 service-layer guard (non-admin rejects with `E_PERMISSION_DENIED` + `axios.patch` not called; admin resolves + `axios.patch` called once; allowlisted email resolves)
- `src/components/__tests__/Gated.test.tsx` — 3 tests covering Gated render logic (children on true, null default fallback on false, explicit fallback prop)
- `.planning/codebase/CONVENTIONS.md` — 2 new bullets documenting `src/hooks/` as the React-hooks directory and `src/**/__tests__/` as the co-located per-module test convention

## Task Commits

Each task committed atomically on main:

1. **Task 1: useRole test stub** — `3e3abd6` (test)
2. **Task 2: PropertyService + Gated test stubs** — `96416b8` (test)
3. **Task 3: CONVENTIONS.md entry** — `781b612` (docs)

## Files Created/Modified

- `src/hooks/__tests__/useRole.test.ts` — 52 lines, RED (`Cannot find module '../useRole'`) until Plan 02 creates the hook
- `src/services/__tests__/PropertyService.test.ts` — 70 lines, RED (Jest env fails on `AsyncStorage` transitive import from `AuthService.ts`) until Plan 04 adds the guard AND Plan 04 introduces the AsyncStorage/axios Jest mock shim
- `src/components/__tests__/Gated.test.tsx` — 73 lines, RED (`Cannot find module '../../hooks/useRole'`) until Plan 02 creates the hook; then also fails on `../Gated` until Plan 02 creates the component
- `.planning/codebase/CONVENTIONS.md` — +2 bullets under `## Naming Patterns > **Files:**`

## RED-Phase Confirmation

Per Nyquist Dim 8 Wave 0 the 3 new suites MUST NOT pass at plan end. Verified:

```
$ npx jest --runInBand 2>&1 | grep -E "^(FAIL|PASS) "
FAIL __tests__/App.test.tsx                          # pre-existing Phase 2 residual (see Deviations)
FAIL src/components/__tests__/Gated.test.tsx         # NEW — RED by design
FAIL src/hooks/__tests__/useRole.test.ts             # NEW — RED by design
FAIL src/services/__tests__/PropertyService.test.ts  # NEW — RED by design
```

Per-file RED markers confirmed:

- `src/hooks/__tests__/useRole.test.ts` — `Cannot find module '../useRole'` at line 5 import
- `src/components/__tests__/Gated.test.tsx` — `Cannot find module '../../hooks/useRole'` at line 10 `jest.mock` call (Gated module import at line 8 is a secondary missing-module fail; whichever Jest resolves first shows the module-not-found)
- `src/services/__tests__/PropertyService.test.ts` — fails at `AsyncStorage` transitive import from `AuthService.ts` line 2 (RED via the pre-existing AsyncStorage Jest-env gap, not via the guard logic yet — Plan 04 lands the guard AND addresses the Jest shim)

All 3 files are discovered by `npx jest --listTests` (4 tests total: the 3 new + existing `App.test.tsx`).

## Decisions Made

- **Prettier header matches App.test.tsx verbatim** — used the existing multi-line `/**\n * @format\n */` form (byte-for-byte `diff -q` confirmed against `__tests__/App.test.tsx`). The single-line acceptance grep `^/\*\* @format \*/$` in the plan would have rejected a conforming header — flagged as an Observation below (acceptance regex bug, not a deviation in output).
- **Did not fix the pre-existing App.test.tsx Jest-env breakage** — out of scope per deviation-rule boundary; see Deviations.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Rolled back premature GATE-01 / GATE-04 mark-complete**
- **Found during:** State updates (after `requirements mark-complete GATE-01 GATE-04` based on plan frontmatter).
- **Issue:** Plan 03-01 frontmatter lists `requirements: [GATE-01, GATE-04]` and `requirements_addressed: [GATE-01, GATE-04]`. Running `requirements mark-complete` marked both as Complete in REQUIREMENTS.md. But GATE-01 explicitly requires `src/hooks/useRole.ts`, `src/components/Gated.tsx`, and `src/constants/adminAllowlist.ts` to exist — none of which are created by this plan. Plan 03-01 is Wave 0 test scaffolds only. Those files land in Plan 03-02. GATE-04 (forward-compat shape) cannot be verified without the hook existing either.
- **Fix:** Reverted both rows in REQUIREMENTS.md back to `Pending` (both the checkbox in the `Role Gating Precursor (GATE)` section and the traceability table). GATE-01 + GATE-04 will be marked complete by Plan 03-02's SUMMARY when the hook + component + allowlist physically land.
- **Files modified:** `.planning/REQUIREMENTS.md` (2 checkboxes + 2 traceability rows)
- **Verification:** `grep -c "^- \[x\] \*\*GATE-" .planning/REQUIREMENTS.md` returns 0.
- **Committed in:** Final metadata commit (same commit as this SUMMARY and STATE.md).

### Observations (NOT auto-fixed — flagged for downstream)

**1. [Out of scope] Pre-existing `__tests__/App.test.tsx` failure**
- **Found during:** Plan-level success-criterion check ("pre-existing App.test.tsx still passes").
- **Issue:** `__tests__/App.test.tsx` fails at `react-native-keyboard-controller` native bindings (`NativeEventEmitter.js:65 — get bindings`). Error predates this plan — introduced in Phase 2 commit `935697a` when `KeyboardProvider` was wired at `App.tsx` root without a Jest mock shim for `react-native-keyboard-controller`.
- **Verified pre-existing:** My 3 commits (`3e3abd6`, `96416b8`, `781b612`) do NOT touch `App.tsx` or `__tests__/App.test.tsx` (`git log` filtered to those paths returns only Phase 1/2 commits).
- **Why not fixed:** Per executor deviation-rule scope boundary: "Only auto-fix issues DIRECTLY caused by the current task's changes." This is a Phase 2 test-env gap unrelated to role gating.
- **Suggested disposition:** Either (a) fold into Plan 04 when PropertyService.test.ts's AsyncStorage shim lands (jest-setup.ts + `jest.mock('react-native-keyboard-controller', ...)` + AsyncStorage mock) since both need the same jest-setup infrastructure, or (b) raise as a standalone Phase 8 release-prep task. Logged to `deferred-items.md` is optional here since Plan 04 will naturally encounter it.

**2. [Acceptance-criteria regex bug] `^/\*\* @format \*/$` single-line header check**
- **Found during:** Task 1 static checks.
- **Issue:** The plan's acceptance grep `grep -q "^/\*\* @format \*/$"` expects a single-line `/** @format */`. The canonical repo form in `__tests__/App.test.tsx` is multi-line (`/**\n * @format\n */`). My files match App.test.tsx byte-for-byte, which is the stated intent ("Prettier header matching App.test.tsx").
- **Why not fixed:** Not a code issue — the intent/behavior criterion ("matches existing App.test.tsx") is satisfied. The regex-level line is wrong.
- **Suggested disposition:** Future plan authors can use `grep -Pzo '(?s)^/\*\*\n \* @format\n \*/'` or a diff-based check instead. Not a blocker for this plan.

### Total deviations: 1 auto-fixed (Rule 1 — plan-frontmatter bug), 2 observations

**Impact on plan:** No scope creep. Plan code/test output executed exactly as written. RED state confirmed on all 3 new suites via both the `(! ... | grep -q "^PASS ")` assertion AND the `grep -qE "Cannot find module|Tests:.*failed"` assertion. One frontmatter-level bug auto-fixed (false GATE-01/GATE-04 mark-complete) so traceability stays honest for downstream agents.

## Issues Encountered

- None during implementation. All three files wrote cleanly, Jest discovered them, RED markers matched the plan's expectations.

## User Setup Required

None — this plan is pure test scaffolding + docs.

## Next Phase Readiness

- **Wave 1 (Plan 03-02) unblocked:** `useRole.ts` creation has its verification target (`src/hooks/__tests__/useRole.test.ts` — 8 tests ready to turn GREEN when the hook, helper, and allowlist land).
- **Wave 1 (Plan 03-02) unblocked:** `Gated.tsx` creation has its verification target (`src/components/__tests__/Gated.test.tsx` — 3 tests ready to turn GREEN when the component lands and the `../../hooks/useRole` mock resolves).
- **Wave 2 (Plan 03-04) unblocked:** `PropertyService.patchPlatformVerifications` guard has its verification target. Note: Plan 04 must also add a Jest setup shim for `@react-native-async-storage/async-storage` (and likely `react-native-keyboard-controller` while at it, which incidentally fixes App.test.tsx) before the service-guard tests can reach the guard logic.
- **CONVENTIONS.md updated** — future plans that add `src/hooks/*` or `src/**/__tests__/*` have explicit convention to cite.
- **No blockers.** Plan 02 and Plan 04 proceed in their waves.

## Self-Check

- `src/hooks/__tests__/useRole.test.ts` — FOUND (`3e3abd6`)
- `src/services/__tests__/PropertyService.test.ts` — FOUND (`96416b8`)
- `src/components/__tests__/Gated.test.tsx` — FOUND (`96416b8`)
- `.planning/codebase/CONVENTIONS.md` — FOUND (modified in `781b612`; 2 new bullets verified via `grep`)
- Commit `3e3abd6` — FOUND in `git log`
- Commit `96416b8` — FOUND in `git log`
- Commit `781b612` — FOUND in `git log`
- Jest `--listTests` discovers all 3 new files — CONFIRMED
- RED assertions (both `! | grep -q PASS` and `grep -qE Cannot find module|Tests:.*failed`) — PASSED for all 3 new suites

## Self-Check: PASSED

---
*Phase: 03-role-gating-precursor*
*Completed: 2026-04-23*

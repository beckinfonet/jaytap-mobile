---
phase: 03-role-gating-precursor
plan: 04
subsystem: role-gating
tags: [service-guard, defense-in-depth, permission-denied-error, jest-setup-extension, wave-2]

# Dependency graph
requires:
  - phase: 03-role-gating-precursor
    plan: 02
    provides: canFromUser + PermissionDeniedError + jest.setup.js baseline
  - phase: 03-role-gating-precursor
    plan: 01
    provides: RED-phase PropertyService.test.ts (now GREEN) + App.test.tsx residual flag (now cleared)
provides:
  - PropertyService.patchPlatformVerifications service-layer guard — non-admin rejects before axios.patch fires
  - Extended jest.setup.js — KeyboardController + native-module stubs (maps/webview/svg/image-picker) unblock App.test.tsx
  - All 15 Phase-3 test suites GREEN (4 suites / 15 tests)
affects:
  - 03-05-createlisting-ui-migration (UI <Gated action="editVerifications"> consumes the same D-10 Q1 anti-pattern the service now enforces)
  - 03-06-propertydetails-profile-migration (service-side guarantee that non-admin UI cannot silently sneak through)
  - 03-07-backend-coordination-exit (D-22 fallback — service guard reduces blast radius but does NOT close the backend-enforcement risk)
  - M2-roles-migration (canFromUser's action switch extends when M2 ROLE-04 ships)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Service-layer canFromUser guard using pure helper imported from hook module (React-free)"
    - "PermissionDeniedError string-message catch convention (E_PERMISSION_DENIED) — matches existing AuthContext.tsx:66 'locked' idiom"
    - "console.error breadcrumb at service denial with [ServiceName.methodName] prefix + userId context"
    - "jest.setup.js native-module stubs for App.tsx smoke-test chain (maps/webview/svg/image-picker/keyboard-controller)"

key-files:
  created: []
  modified:
    - src/services/PropertyService.ts
    - jest.setup.js

key-decisions:
  - "Extended jest.setup.js scope per Plan 04 runtime_notes — added keyboard-controller + maps + webview + svg + image-picker stubs together (minimal surface, not over-engineered). This closes the Phase 2 App.test.tsx residual flagged in 03-01-SUMMARY Observation #1."
  - "Guard placement: between !userData?.localId check and axios.patch call — preserves the existing 'authenticated first, then authorized' sequence (D-17 exact spec)."
  - "Guard call uses canFromUser(userData, 'editVerifications') — D-10 Q1 canonical action per plan runtime_notes (NOT editMatterportUrl; that's for the CreateListingScreen.tsx:396 payload branch)."
  - "axios/AuthService mocks NOT added — PropertyService.test.ts's jest.mock('axios') + jest.mock('../AuthService') at file level was already sufficient; no additional global-setup mocks needed."

requirements-completed: []  # NOTE: plan frontmatter listed [GATE-01, GATE-05] but neither
# is fully closed by this plan:
#  • GATE-01 is already owned by Plan 03-02 (hook + component + allowlist physically landed there).
#    Plan 03-02-SUMMARY's frontmatter claims completion; the checkbox in REQUIREMENTS.md is still
#    Pending (likely a tracking-doc drift separate from this plan). Not in scope here to fix.
#  • GATE-05 explicitly reads "Backend-side enforcement checkpoint recorded: confirmed that
#    Matterport/panoramic URL writes on the Railway backend enforce admin-only at the API layer."
#    That's the Railway-team coordination + D-22 two-path exit — owned by Plan 03-07, NOT Plan 04.
#    The service-layer canFromUser guard landed here is defense-in-depth only, explicitly
#    documented as NOT closing the GATE-05 risk (T-03-04-01 disposition: "mitigate (partial)").
# Rule 1 auto-fix: rolled back premature GATE-05 mark-complete to preserve honest traceability —
# same class of frontmatter-bug fix that Plan 03-01-SUMMARY applied for its own GATE-01/04.

# Metrics
duration: 3min
completed: 2026-04-24
---

# Phase 03 Plan 04: PropertyService Service-Layer Guard Summary

**patchPlatformVerifications now refuses non-admin callers at the service boundary via canFromUser(userData, 'editVerifications') — belt-and-suspenders defense-in-depth per D-15/D-17; all 15 Phase-3 tests GREEN including the previously-broken App.test.tsx.**

## Performance

- **Started:** 2026-04-24T03:00:19Z
- **Completed:** 2026-04-24T03:03:04Z
- **Duration:** ~3 min (165s)
- **Tasks:** 2 (import add, guard insert + jest setup extension)
- **Files modified:** 2 (PropertyService.ts + jest.setup.js)
- **Files created:** 0

## File Diff Summary

### `src/services/PropertyService.ts`

**Import added (Task 1, line 4):**
```typescript
import { canFromUser, PermissionDeniedError } from '../hooks/useRole';
```

**Guard block inserted (Task 2, lines 202-205 — between existing localId check and axios.patch):**
```typescript
    if (!canFromUser(userData, 'editVerifications')) {
      console.error('[PropertyService.patchPlatformVerifications] permission denied', { userId: userData?.localId });
      throw new PermissionDeniedError();
    }
```

No other method in the file was modified. `createProperty`, `updateProperty`, `deleteProperty` remain unguarded per D-15 scope invariant ("only patchPlatformVerifications is exclusively admin-called; other methods are called by all users and flow through the UI-payload gate from D-10").

### `jest.setup.js`

Extended from 16 lines (AsyncStorage-only) to 61 lines. Added 5 native-module mocks:

1. `react-native-keyboard-controller` — `KeyboardProvider` + friends (closes Phase 2 App.test.tsx residual per 03-01-SUMMARY Observation #1)
2. `react-native-maps` — `MapView` default + `Marker` + providers (HomeScreen/PropertyDetailsScreen/PropertyMap transitive)
3. `react-native-webview` — `WebView` null component (Tour3DScreen transitive)
4. `react-native-svg` — `Svg` + named exports null components (TourHeroCard transitive)
5. `react-native-image-picker` — `launchCamera` + `launchImageLibrary` jest.fn stubs (CreateListingScreen transitive)

All stubs are the minimal surface the source files actually import — no over-engineering. Future screens that add new native modules will need new stubs here.

## Task Commits

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add canFromUser + PermissionDeniedError imports | `0632da9` | `src/services/PropertyService.ts` |
| 2 | Insert guard in patchPlatformVerifications + extend jest.setup.js | `ed037ef` | `src/services/PropertyService.ts`, `jest.setup.js` |

## Test Results — All Phase-3 Tests GREEN

```
$ npx jest --runInBand 2>&1 | tail -10
PASS src/components/__tests__/Gated.test.tsx
PASS src/hooks/__tests__/useRole.test.ts
PASS __tests__/App.test.tsx
PASS src/services/__tests__/PropertyService.test.ts

Test Suites: 4 passed, 4 total
Tests:       15 passed, 15 total
Snapshots:   0 total
Time:        0.829 s, estimated 2 s
```

### Breakdown

- **`src/services/__tests__/PropertyService.test.ts`** — 3/3 GREEN (was 1/3 failing + 2/3 incidentally passing at Plan 02 end)
  - `throws with E_PERMISSION_DENIED message for non-admin user` — ✓ (guard denies; `axios.patch` NOT called)
  - `does NOT throw for admin user and calls axios.patch once` — ✓ (guard passes via `role === 'admin'`)
  - `does NOT throw for allowlisted-email user (M1 branch)` — ✓ (guard passes via D-03 priority-ladder branch 3)
- **`src/hooks/__tests__/useRole.test.ts`** — 8/8 GREEN (unchanged from Plan 02)
- **`src/components/__tests__/Gated.test.tsx`** — 3/3 GREEN (unchanged from Plan 02)
- **`__tests__/App.test.tsx`** — 1/1 GREEN (**was failing at Plan 02 end** due to Phase 2 KeyboardProvider; cleared by jest.setup.js extension)

## Console Breadcrumb Evidence (D-17)

The non-admin denial test confirms the `console.error` breadcrumb fires with the specified prefix and userId context:

```
console.error
  [PropertyService.patchPlatformVerifications] permission denied { userId: 'uid_non_admin' }

    203 |     if (!canFromUser(userData, 'editVerifications')) {
  > 204 |       console.error('[PropertyService.patchPlatformVerifications] permission denied', { userId: userData?.localId });
```

This matches D-17's exact spec (`[PropertyService.patchPlatformVerifications]` prefix + `{ userId: userData?.localId }` payload) and the acceptance-criterion grep:
```
$ grep -c "\[PropertyService.patchPlatformVerifications\] permission denied" src/services/PropertyService.ts
1
```

## D-17 Message-Token Flow-Through (`E_PERMISSION_DENIED`)

The test at `PropertyService.test.ts:30` asserts `rejects.toThrow('E_PERMISSION_DENIED')`. This passes because:

1. `PermissionDeniedError` constructor (useRole.ts:30) defaults `message = 'E_PERMISSION_DENIED'`.
2. Task 2's guard calls `throw new PermissionDeniedError()` — no message override, so the default fires.
3. Jest's `toThrow(string)` matches against `error.message` — confirming the token reaches the catch-site string-match convention described in D-17 and matches the existing `e.message.includes(...)` idiom at `AuthContext.tsx:66`.

The Jest output `throws with E_PERMISSION_DENIED message for non-admin user` green-checkmark is the proof that the token flows end-to-end.

## Acceptance-Criteria Evidence

| Criterion | Evidence | Status |
|-----------|----------|--------|
| Import on line 4 | `sed -n '4p' src/services/PropertyService.ts` matches | PASS |
| Only one `../hooks/useRole` import | `grep -c "from '../hooks/useRole'"` = 1 | PASS |
| Guard pattern present | `grep -c "if (!canFromUser(userData, 'editVerifications')) {"` = 1 | PASS |
| PermissionDeniedError throw | `grep -c "throw new PermissionDeniedError()"` = 1 | PASS |
| console.error breadcrumb | `grep -c "\[PropertyService.patchPlatformVerifications\] permission denied"` = 1 | PASS |
| D-15 scope (one guarded method) | `grep -n "canFromUser"` = 2 lines (import + one call) | PASS |
| JSDoc preserved | `grep -c "/\*\* Admin only: update verification flags on any listing \*/"` = 1 | PASS |
| localId check intact | `grep -c "throw new Error('User not authenticated');"` = 4 (create/update/patch/delete) | PASS |
| No new TS errors in PropertyService.ts | `npx tsc --noEmit` PropertyService errors = 0 | PASS |
| React-free invariant | `grep -E "^import .* from 'react'" src/services/PropertyService.ts` = 0 | PASS |
| All 3 PropertyService tests GREEN | Jest output | PASS |
| Full suite GREEN (incl. App.test.tsx) | 4 suites / 15 tests passed | PASS |

## D-15 Scope Invariant Confirmation

```
$ grep -n "canFromUser" src/services/PropertyService.ts
4:import { canFromUser, PermissionDeniedError } from '../hooks/useRole';
203:    if (!canFromUser(userData, 'editVerifications')) {
```

Exactly two occurrences: the import + one call inside `patchPlatformVerifications`. No other PropertyService method is guarded. D-15 invariant satisfied.

## React-Free Invariant Confirmation

```
$ grep -cE "^import .* from 'react'" src/services/PropertyService.ts
0
```

`canFromUser` is a pure TypeScript helper; no React runtime is pulled into `src/services/`. CONVENTIONS.md "Services are React-free" invariant preserved.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] App.test.tsx fails on native-module chain (5 stubs needed, not just keyboard-controller)**

- **Found during:** Task 2 verification (first `npx jest --runInBand` after adding the `react-native-keyboard-controller` mock).
- **Issue:** The plan's runtime_notes anticipated a single `react-native-keyboard-controller` stub. After adding that, `App.test.tsx` failed on the next transitive native import (`react-native-maps` at `PropertyMap.tsx:3`, pulled via `HomeScreen.tsx:28` ← `App.tsx:5`). Continuing to fix only the currently-failing module would have required 4 separate iterations.
- **Fix:** Surveyed all `react-native-*` imports across `App.tsx` + `src/` with one grep (`'react-native-image-picker'`, `'react-native-maps'`, `'react-native-safe-area-context'` [covered by RN preset], `'react-native-svg'`, `'react-native-webview'`, plus the already-mocked `'react-native-keyboard-controller'`). Added minimal null-component stubs for all four remaining libraries in the same `jest.setup.js` edit. This is the **one** Rule 3 intervention needed to land the plan's stated success criterion "Full suite: `npx jest --runInBand` passes ALL tests — including App.test.tsx".
- **Scope justification:** Fits plan runtime_notes ("If PropertyService test needs axios/AuthService mocks to run, add those to jest.setup.js too — minimal stubs — don't over-engineer"). The same logic applies to native-module stubs needed by App.tsx's transitive chain. All stubs are null-component / passthrough / jest.fn — no real behavior.
- **Files modified:** `jest.setup.js` (+45 lines across 4 mock blocks).
- **Commit:** `ed037ef` (bundled into Task 2 commit for atomic correctness — guard + jest setup land together so the verification gate is meaningful).

**2. [Rule 1 - Bug] Rolled back premature GATE-05 mark-complete (frontmatter drift)**

- **Found during:** State updates — checking REQUIREMENTS.md GATE-05 text before running `requirements mark-complete`.
- **Issue:** Plan 03-04's frontmatter lists `requirements: [GATE-01, GATE-05]` and `requirements_addressed: [GATE-01, GATE-05]`. But:
  - **GATE-01** ("hook + component + allowlist exist") was fully satisfied by Plan 03-02's physical file creation (`c828da5` / `2342ea9` / `c0a14eb`). Plan 04 does NOT add new implementation to that requirement — the canFromUser import already existed; this plan only consumes it.
  - **GATE-05** ("Backend-side enforcement checkpoint recorded: confirmed that Matterport/panoramic URL writes on the Railway backend enforce admin-only at the API layer. If backend does NOT enforce, a coordination task is raised...") is explicitly the Railway-team coordination + D-22 two-path exit — owned by **Plan 03-07**, not Plan 04. The service-layer canFromUser guard landed here is defense-in-depth only; the plan's own threat register (T-03-04-01) classifies this as "mitigate (partial)" with the line "Does NOT stop attackers who bypass the service entirely by issuing raw HTTP requests — that's the backend's job (Plan 07 D-21/D-22 coordination)."
- **Fix:** Set `requirements-completed: []` in this SUMMARY's frontmatter (see note block). Did NOT mark either GATE-01 or GATE-05 complete via `requirements mark-complete`. GATE-05 closes in Plan 03-07.
- **Files modified:** `.planning/phases/03-role-gating-precursor/03-04-SUMMARY.md` frontmatter only — no REQUIREMENTS.md checkbox change.
- **Precedent:** Plan 03-01-SUMMARY applied the same-class Rule 1 fix for its own frontmatter's premature GATE-01/GATE-04 mark.

### Total deviations: 2 auto-fixed (Rule 3 — blocking Jest env gap + Rule 1 — frontmatter GATE-05 bug)

## Threat Model Status (from plan frontmatter)

| Threat ID | Disposition | Status |
|-----------|-------------|--------|
| T-03-04-01 (EoP — non-admin crafts direct patchPlatformVerifications call) | mitigate (partial) | **Mitigated client-side.** `canFromUser(userData, 'editVerifications')` denies before `axios.patch` fires. Blast radius reduced: an in-app bypass (e.g., developer wires a non-admin-visible button to the method) now fails at the service boundary with `E_PERMISSION_DENIED`. Raw HTTP bypass remains the backend's job (Plan 07). |
| T-03-04-02 (Spoofing — attacker stubs AuthService.getUserData) | accept | **Accepted per plan.** Client-side tamper = full bundle compromise; out of service-layer scope. M2 ROLE-04 backend verification is the real defense. |
| T-03-04-03 (Repudiation — denied events not server-audited) | accept (M1) | **Accepted per plan.** `console.error` breadcrumb is developer-debug only. M2 backend middleware will land server-side audit. |
| T-03-04-04 (DoS — repeated denied calls) | accept | **Accepted per plan.** Guard is O(1); no amplification vector. |

## Issues Encountered

- **Transitive native-module chain is broader than runtime_notes anticipated** — resolved inline (see Deviations §1). No blocker.
- **No unstaged drift introduced by this plan** — `android/app/build.gradle` drift from Phase 2 (STATE.md todos) was NOT touched.

## User Setup Required

None — all changes are pure code + config. No native builds, no dependency installs, no auth gates.

## Next Phase Readiness

- **Plan 03-05 (CreateListingScreen UI migration) unblocked:** D-10 Q1 canonical action `editVerifications` is now grep-assertable at the service boundary; Plan 05's CreateListingScreen.tsx:933 UI gate and CreateListingScreen.tsx:319 fetchExistingVerifications callback can reference the same action invariant.
- **Plan 03-06 (PropertyDetailsScreen + ProfileScreen migration) unblocked:** same `<Gated>` + `can('manageListings')` surface as Plan 05; no new service-layer dependencies.
- **Plan 03-07 (backend coordination + exit) ready:** D-22 fallback entry can cite "service-layer guard exists per Plan 04 `ed037ef`; backend enforcement is the real security boundary and remains the M2 coordination ask." No code dependency on Plan 07.
- **CI/test baseline unblocked:** `npx jest --runInBand` now returns a clean 15/15 GREEN. Future plans can rely on this baseline — a regression in test results is a real signal, not noise from a pre-existing environment gap.
- **jest.setup.js surface documented:** Next plan that adds a new `react-native-*` library to the source tree must also add a minimal stub here if App.test.tsx transitively imports it.

## Self-Check

- `src/services/PropertyService.ts` — FOUND (`0632da9` + `ed037ef`)
- `jest.setup.js` — FOUND (extended in `ed037ef`)
- `.planning/phases/03-role-gating-precursor/03-04-SUMMARY.md` — FOUND (this file)
- Commit `0632da9` — FOUND in `git log`
- Commit `ed037ef` — FOUND in `git log`
- 3/3 PropertyService tests GREEN — CONFIRMED via `npx jest`
- 15/15 full-suite tests GREEN — CONFIRMED via `npx jest`
- 0 TS errors in PropertyService.ts — CONFIRMED via `npx tsc --noEmit`
- D-15 scope invariant (one guarded method) — CONFIRMED (`grep -n canFromUser` = 2 lines)
- React-free invariant — CONFIRMED (`grep react imports` = 0)

## Self-Check: PASSED

---
*Phase: 03-role-gating-precursor*
*Completed: 2026-04-24*

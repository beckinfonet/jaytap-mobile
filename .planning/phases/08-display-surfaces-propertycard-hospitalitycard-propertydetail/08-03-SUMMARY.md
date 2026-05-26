---
phase: 08-display-surfaces-propertycard-hospitalitycard-propertydetail
plan: 03
subsystem: hospitality-display
tags: [react-native, component, hospitality, i18n, render-only]

# Dependency graph
requires:
  - phase: 08-display-surfaces-propertycard-hospitalitycard-propertydetail
    plan: 01
    provides: "Wave-1 i18n foundation (hospitality.bathrooms already shipped earlier; Plan 03 reuses, adds NO key)"
provides:
  - "HospitalityCard meta line surfaces basics.bathroomCount inline as `· {n} Bathrooms` between Rooms and Max Guests (D-06)"
  - "Co-located HospitalityCard.test.tsx with 4 cases pinning the D-06 conditional + orphan-separator regression fence"
affects: [08-05]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Inline React.Fragment shorthand `<>...</>` for conditional meta-line segments — null branch leaves no orphan separator"
    - "`!== undefined` (not truthiness) for numeric-render gates so `0` is treated as a real value"
    - "collectTexts walker that recurses into nested React element children (handles Fragment-wrapped children attached to a parent Text node)"

key-files:
  created:
    - "src/components/__tests__/HospitalityCard.test.tsx (NEW — 246 lines; 4 cases: fragment present, fragment absent + orphan-fence, empty basics fallback, bathroomCount === 0 fragment-renders)"
  modified:
    - "src/components/HospitalityCard.tsx (+10 / -3; meta-line children expression only — zero StyleSheet edits, zero new JSX elements)"

key-decisions:
  - "Locale key reuse — `hospitality.bathrooms` was already shipped pre-Phase-8 (en.ts:285 / ru.ts:287); Plan 03 consumes the existing key, adds nothing to either locale (PATTERNS.md drift correction honored)"
  - "Use `!== undefined` not truthiness — so a bathroomCount of `0` (e.g., hostel room with shared-bathroom-down-the-hall) still renders the fragment as `· 0 Bathrooms`"
  - "Fragment-internal leading separator — the `' · '` BEFORE the bathroomCount lives INSIDE the conditional `<>...</>`, so when the conditional returns `null` NO orphan separator is emitted (load-bearing D-06 invariant proven by Test 2's countSeparators === 1)"
  - "collectTexts walker extended to recurse into React element children — the React.Fragment children manifest as a nested element under the meta `<Text>`'s children array (`<Comp>[\" · \", 1.5, \" \", \"hospitality.bathrooms\"]</Comp>`); without recursion the test would not see fragment values"

patterns-established:
  - "Conditional-render orphan-separator fence via countSeparators helper — deterministic render-level proof for any inline meta-line conditional that wraps a leading separator with the conditional value"
  - "Test mock stack for HospitalityCard: theme + language + lucide icons (Heart/Pencil/Trash2/Archive/ArchiveRestore) + AMENITY_ICONS Proxy — replicable for any future hospitality-display test"

requirements-completed: [DISP-04]
requirements-contributed: [DISP-05]

# Metrics
duration: ~12min
completed: 2026-05-26
---

# Phase 8 Plan 03: HospitalityCard bathroomCount fragment Summary

**HospitalityCard's single meta line now surfaces `basics.bathroomCount` inline as `· {n} Bathrooms` between Rooms and Max Guests when defined; renders nothing extra when undefined; M1 Phase 6 D-10 invariants (tour-first, price-free, no specs-strip block) held verbatim; new 4-case test suite proves the D-06 orphan-separator regression fence.**

## Performance

- **Duration:** ~12 min
- **Tasks:** 2 / 2 (Task 1 implementation + Task 2 test suite; sequential gate honored)
- **Files modified:** 1 (src/components/HospitalityCard.tsx)
- **Files created:** 1 (src/components/__tests__/HospitalityCard.test.tsx)

## Accomplishments

### Task 1 — HospitalityCard.tsx meta line extension
- Inserted a single conditional React.Fragment inside the existing `<Text style={styles.meta}>` element (lines 206-216 post-edit):
  ```
  {(property.basics?.hotelRooms ?? property.basics?.rooms ?? '-')}{' '}
  {t('hospitality.rooms')}
  {property.basics?.bathroomCount !== undefined ? (
    <>{' · '}{property.basics.bathroomCount} {t('hospitality.bathrooms')}</>
  ) : null}
  {' · '}{property.maxGuests ?? 0} {t('hospitality.maxGuests')}
  ```
- **Diff scope:** +10 / -3 lines (13-line net change inside one JSX element).
- **Zero structural changes:** no new `<View>` / `<Text>` / `<StyleSheet>` entries; the existing `styles.meta`, `numberOfLines={1}`, hotelRooms/rooms fallback, and maxGuests `?? 0` default all preserved verbatim.
- **Zero locale additions:** `hospitality.bathrooms` was already shipped at en.ts:285 / ru.ts:287 (the PATTERNS.md pre-flight correction — Plan 03 consumes, doesn't add).

### Task 2 — Co-located HospitalityCard.test.tsx (NEW)
- `react-test-renderer` + `act` pattern (matches `PropertyCard.specChip.test.tsx`; no RTL, no jest-native).
- Mocks: `useTheme`, `useLanguage` (t returns key verbatim), `lucide-react-native` icons, `AMENITY_ICONS` Proxy (returns `() => null` for any token).
- **collectTexts walker extended** to recurse into nested React element children (`val.props.children`) — necessary because the conditional `<>...</>` shows up as a nested element under the meta `<Text>`'s children array (debug confirmed: `TEXT NODE 5: ["3", " ", "hospitality.rooms", <Comp>[" · ", 1.5, " ", "hospitality.bathrooms"]</Comp>, " · ", 8, " ", "hospitality.maxGuests"]`).
- **countSeparators helper** is the LOAD-BEARING D-06 gate — counts ` · ` occurrences in the rendered text stream.
- **4 cases, all passing:**
  1. `Test 1` — hotelRooms=`'3'` + bathroomCount=1.5 + maxGuests=8 → 3 / 1.5 / 8 present, all 3 labels present, **separators = 2** (fragment present).
  2. `Test 2` — hostel + hotelRooms=`'1'` + NO bathroomCount + maxGuests=2 → `hospitality.bathrooms` ABSENT, **separators = 1** (orphan-separator regression fence; LOAD-BEARING).
  3. `Test 3` — `basics: {}` + no maxGuests → `'-'` fallback + `'0'` fallback present, `hospitality.bathrooms` absent, **separators = 1**.
  4. `Test 4` — hotelRooms=`'3'` + bathroomCount=`0` + maxGuests=10 → `0` AND `10` present, `hospitality.bathrooms` PRESENT, **separators = 2** (proves `!== undefined` not truthiness).

## Task Commits

Each task committed atomically:

1. **Task 1: Insert conditional bathroomCount fragment into HospitalityCard meta line** — `9d8fd25` (feat)
   - `feat(08-03): add bathroomCount fragment to HospitalityCard meta line`
2. **Task 2: Create new co-located HospitalityCard.test.tsx covering D-06 fragment present/absent** — `5ada4fa` (test)
   - `test(08-03): add HospitalityCard meta-line bathroomCount fragment suite`

## Files Created/Modified

- **`src/components/HospitalityCard.tsx`** — modified; meta-line children expression extended with conditional Fragment; +10 / -3 lines; zero StyleSheet changes; zero new imports.
- **`src/components/__tests__/HospitalityCard.test.tsx`** — created (246 lines); 4-case behavior pin with countSeparators orphan-fence helper.

## Verification Outputs

- `grep -c "basics?.bathroomCount !== undefined" src/components/HospitalityCard.tsx` → **1** (conditional gate identifier present)
- `grep -c "t('hospitality.bathrooms')" src/components/HospitalityCard.tsx` → **1** (fragment consumes existing key)
- `grep -c "t('hospitality.rooms')" src/components/HospitalityCard.tsx` → **1** (unchanged read)
- `grep -c "t('hospitality.maxGuests')" src/components/HospitalityCard.tsx` → **1** (unchanged read)
- `grep -c "styles.specsContainer" src/components/HospitalityCard.tsx` → **0** (M1 Phase 6 D-10 "no specs-strip block" invariant held)
- `grep -c "numberOfLines={1}" src/components/HospitalityCard.tsx` → **7** (meta line still has it; baseline preserved)
- `grep -rn "keyboardVerticalOffset" src/ | wc -l | tr -d ' '` → **0** (KBD-02 invariant held)
- `bash scripts/check-i18n-parity.sh` → exit **0**, "PASS: FORM-09 key-set parity holds"
- `npx jest src/components/__tests__/HospitalityCard.test.tsx --no-coverage` → **4 passed, 4 total**
- `npx tsc --noEmit` → **19 errors total** (same baseline as Plan 01 close — 0 net-new from this plan; HospitalityCard.tsx and HospitalityCard.test.tsx contribute 0 errors each)

## Decisions Made

- **Sequential gate honored** — Task 1's grep gate passed, Task 2's render-level gate (countSeparators === 1 on Test 2) passed. Plan-done = both tasks committed + both gates green, per Task 1's `<sequential_gate>` block.
- **Hospitality key reuse, not addition** — `hospitality.bathrooms` was already at en.ts:285 / ru.ts:287 before this plan opened. Re-verified with `grep -n "hospitality.bathrooms" src/locales/{en,ru}.ts` (count=1 each, unchanged) at plan close. The plan adds **zero** locale keys; the PATTERNS.md "4 keys → 3 keys delta" drift correction is honored.
- **Walker had to recurse into React elements** — first jest run showed Test 1 and Test 4 failing with the values `'1.5'` and `'10'` (the bathroomCount value and maxGuests value of the test fixture) missing from collectTexts output. Debug print revealed the meta-line's children array nests the Fragment children inside a `<Comp>` (React.Fragment manifests as a Component with children). Walker updated to recurse into `val.props.children` when `val` is a React element. Treated as a Rule 3 (auto-fix blocking issue: missing test infrastructure for the chosen Fragment pattern); no plan deviation, no architectural change.
- **`!== undefined` semantics preserved as the conditional gate** — Test 4 explicitly asserts the fragment renders when bathroomCount === 0 (proves the gate is `!== undefined`, not `&& bathroomCount`). This was an explicit invariant in the plan's `<action>` block.

## Deviations from Plan

- **[Rule 3 — Blocking-issue auto-fix] Extended collectTexts walker to recurse into React element children**
  - **Found during:** Task 2 jest run (Test 1 and Test 4 failed with bathroomCount value and second maxGuests value missing from collected texts)
  - **Issue:** The initial walker only descended into strings/numbers/arrays. React.Fragment shorthand `<>...</>` manifests at the test-renderer level as a Component node, so the Fragment's nested children attached to a parent Text's children array were invisible without recursion.
  - **Fix:** Added a recursive branch to `walk` that descends into `val.props.children` when `val` is a React element (object with a `props` key).
  - **Files modified:** `src/components/__tests__/HospitalityCard.test.tsx` (collectTexts helper, ~10 lines added inside the helper)
  - **Commit:** included in Task 2 commit `5ada4fa`
- **[Rule 1 — Bug-on-the-fly] Adjusted hotelRooms test fixture from `'4'` to `'3'`**
  - **Found during:** post-test tsc check
  - **Issue:** `basics.hotelRooms` is typed as `'1' | '2' | '3' | '4+' | undefined` — the string `'4'` (without the `+`) is not in the union. First-pass fixture used `'4'` and `tsc` emitted 2 net-new TS2322 errors in the test file.
  - **Fix:** Changed Test 1 and Test 4 fixtures to `hotelRooms: '3'`; updated affected assertions (`expect(texts).toContain('3')`) and inline comments. The behavior under test (fragment present/absent + separator count) is fixture-value-agnostic.
  - **Files modified:** `src/components/__tests__/HospitalityCard.test.tsx`
  - **Commit:** included in Task 2 commit `5ada4fa`

## Issues Encountered

None blocking. The two auto-fixes above resolved cleanly inside the Task 2 work window (under 3 fix attempts; well under the executor limit).

## User Setup Required

None — render-side only; no external service, no env var, no install.

## Next Phase Readiness

- **Plan 08-04 (PropertyDetailsScreen specs-row flip):** can proceed independently in Wave 2. It does not depend on HospitalityCard output; only on the Plan-01 locale foundation (already shipped at en.ts:129-131 / ru.ts:131-133).
- **Plan 08-05 (verifier/acceptance pass):** the new HospitalityCard.test.tsx jest suite is now part of the green-on-master suite count baseline; verifier should include `npx jest src/components/__tests__/HospitalityCard.test.tsx` in the gate set.
- **Wave-2 invariants held:** no shared file (STATE.md / ROADMAP.md / REQUIREMENTS.md) touched in this worktree — orchestrator owns those writes after wave 2 closes.

## Self-Check: PASSED

- ✅ `src/components/HospitalityCard.tsx` modified — conditional gate identifier present (grep count = 1)
- ✅ `src/components/__tests__/HospitalityCard.test.tsx` exists — 246 lines
- ✅ Commit `9d8fd25` present in `git log` on `worktree-agent-a070690e0370b6da1` (`feat(08-03): add bathroomCount fragment to HospitalityCard meta line`)
- ✅ Commit `5ada4fa` present in `git log` on `worktree-agent-a070690e0370b6da1` (`test(08-03): add HospitalityCard meta-line bathroomCount fragment suite`)
- ✅ `npx jest src/components/__tests__/HospitalityCard.test.tsx --no-coverage` → 4 passed, 4 total
- ✅ `bash scripts/check-i18n-parity.sh` exit 0
- ✅ `grep -c "styles.specsContainer" src/components/HospitalityCard.tsx` → 0 (M1 Phase 6 D-10 invariant held)
- ✅ `grep -rn "keyboardVerticalOffset" src/ | wc -l` → 0 (KBD-02 invariant held)
- ✅ `npx tsc --noEmit` → 0 net-new errors vs. Plan-01 baseline (19 total, all pre-existing)
- ✅ `hospitality.bathrooms` count unchanged in both locale files (1 in each — no accidental duplicate)

---
*Phase: 08-display-surfaces-propertycard-hospitalitycard-propertydetail*
*Plan: 03*
*Completed: 2026-05-26*

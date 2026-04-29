---
phase: 01-nav-reliability
plan: 03
subsystem: navigation
tags: [react-native, navigation, pointer-events, state-machine, diagnostics]
requires:
  - 01-02-SUMMARY.md (Plan 02 deferred-baseline decision must precede code edits per NAV-03)
provides:
  - OVERLAY_FLAGS single-source-of-truth for hideMainStackUnderOverlay
  - pointerEvents belt-and-suspenders on keep-alive + 3 overlay wrappers
  - 4 [NAV] diagnostic log sites for Plan 04 device re-run
  - "## Keep-alive and overlay screens" convention documented
affects:
  - App.tsx
  - src/components/BottomNavigator.tsx
  - .planning/codebase/CONVENTIONS.md
tech-stack:
  patterns:
    - style-form pointerEvents (RN 0.84 Fabric compatible)
    - derive-don't-store for cross-state booleans (OVERLAY_FLAGS.some(Boolean))
    - "[TAG] prefix for strip-on-release diagnostic logs"
key-files:
  created: []
  modified:
    - App.tsx
    - src/components/BottomNavigator.tsx
    - .planning/codebase/CONVENTIONS.md
decisions:
  - "D-05 applied: pointerEvents belt-and-suspenders landed up front, independent of C1 confirmation"
  - "D-06 respected: auth modal (App.tsx:881, zIndex:1000) and TourHeroCard prop-form untouched"
  - "D-07 honored: convention documented in CONVENTIONS.md, no <KeepAliveScreen> abstraction"
  - "D-09/D-10 amended: OVERLAY_FLAGS includes !!activeTourUrl + !!activePhotosUrl for future-proofing despite Tour3D early-return"
  - "D-02 respected: all 4 [NAV] logs tagged for Plan 06 strip"
requirements: [NAV-01, NAV-02]
requirements_addressed: [NAV-01, NAV-02]
metrics:
  completed: 2026-04-22
  duration: "~20 min"
  commits: 4
  files_touched: 3
  lines_added: 67
  lines_removed: 7
---

# Phase 1 Plan 3: Apply pointerEvents + OVERLAY_FLAGS Refactor + [NAV] Diagnostics Summary

Applied the belt-and-suspenders `pointerEvents` mitigation to 4 call sites, refactored `hideMainStackUnderOverlay` to a 5-condition `OVERLAY_FLAGS` array adjacent to state declarations, installed 4 `[NAV]`-tagged diagnostic logs so Plan 04's device re-run can gather C1 evidence, and documented the convention in `.planning/codebase/CONVENTIONS.md` — all four changes landed as separate atomic commits in the wave-1 worktree without touching STATE.md or ROADMAP.md (orchestrator-owned).

## Commits

| # | Hash | Task | Message |
|---|------|------|---------|
| 1 | `b031c90` | Task 1 | fix(01-03): apply pointerEvents belt-and-suspenders to keep-alive + overlay wrappers (NAV-01/NAV-02, D-05/D-06) |
| 2 | `a44667f` | Task 2 | refactor(01-03): hoist hideMainStackUnderOverlay to OVERLAY_FLAGS array adjacent to state (NAV-02, D-09/D-10) |
| 3 | `d949b4a` | Task 3 | chore(01-03): add temporary [NAV] diagnostic logs for C1 confirmation (RESEARCH §2.1, D-02 temporary) |
| 4 | `f2db5f1` | Task 4 | docs(01-03): add 'Keep-alive and overlay screens' convention (D-07) |

Parent of first commit (`b031c90`): `c796a42` (Plan 02 resolution marker) — NAV-03 ordering maintained.

## Pre-check Outcome

Plan 02's baseline commit (`72ac6d2`, "docs(01-02): defer pre-fix baseline device matrix (accepted risk, NAV-03)") was indeed the parent of this plan's branch via the `c796a42` phase-state advancer. Code-read reconfirmation of the 5 canonical overlay state variables matched CONTEXT D-09 expectations exactly (App.tsx:36 selectedProperty, :37 activeTourUrl, :38 activePhotosUrl, :43 isCreateListingOpen, :47 isRenterListingsOpen). No new overlay state has been added since the 2026-04-22 research pass.

## Edit Sites Applied

### Task 1 — pointerEvents (4 sites, single-file atomic commit)

| Site | File:Line (post-edit) | Shape |
|------|----------------------|-------|
| `mainStackScreenStyle` helper | `App.tsx:525-530` | `pointerEvents: visible ? 'auto' : 'none'` added to 5-field return object; propagates to all 6 keep-alive tab wrappers via `as const` typing |
| PropertyDetails wrapper | `App.tsx:741-752` | Inline `pointerEvents: 'auto'` appended to the `zIndex: 2` wrapper (conditionally mounted) |
| RenterListings wrapper | `App.tsx:805-809` | Converted to 3-element style array; `pointerEvents: isRenterListingsOpen ? 'auto' : 'none'` tracks open state because wrapper stays mounted via `display:'none'` |
| CreateListing wrapper | `App.tsx:827` | Style-array form; hardcoded `pointerEvents: 'auto'` because wrapper is conditionally mounted |

Left untouched per D-06 scope:
- **Tour3D early-return** at `App.tsx:461-478` — no wrapper exists to gate (replaces entire render tree)
- **Auth modal wrapper** at `App.tsx:881` (`zIndex:1000`) — explicitly out of scope; C3 territory only
- **`src/components/TourHeroCard.tsx:39`** prop-form `pointerEvents` — orthogonal, unchanged per RESEARCH §5.1

### Task 2 — OVERLAY_FLAGS refactor

Inserted adjacent to state declarations at `App.tsx:78-91` (right after `tabEverMounted` useState at line 76):

```typescript
const OVERLAY_FLAGS = [
  !!selectedProperty,
  isRenterListingsOpen,
  !!user && isCreateListingOpen,
  !!activeTourUrl,    // future-proof: early-return today, zIndex-overlay tomorrow
  !!activePhotosUrl,  // future-proof: same as above
];
const hideMainStackUnderOverlay = OVERLAY_FLAGS.some(Boolean);
```

Deleted old derivation at (pre-refactor) lines 508-509; consumer at new `App.tsx:548` (`<View style={{ flex: 1, display: hideMainStackUnderOverlay ? 'none' : 'flex' }}>`) continues to work unchanged.

### Task 3 — [NAV] diagnostic log sites

| Log | File:Line (post-edit) | Fires on |
|-----|----------------------|----------|
| `[NAV] overlay-flags` | `App.tsx:92-99` | Every render of AppContent — emits the 5-boolean state snapshot + derived `hide` |
| `[NAV] mainStack render` | `App.tsx:542` | Every render just before the `return (` expression that wraps main-stack |
| `[NAV] tab handler entered` | `App.tsx:679` | Every invocation of `onTabChange`, before state-setter branches |
| `[NAV] tab tap received` | `src/components/BottomNavigator.tsx:56, 76` | Every tab tap — two onPress handlers because Add button is a distinct TouchableOpacity |

Plan 04 is expected to collect all 4 tags from Metro logs during its device re-run and compare the observed sequence against RESEARCH §2.1's C1 confirmation predicate.

### Task 4 — CONVENTIONS.md

Appended `## Keep-alive and overlay screens` subsection at `CONVENTIONS.md:258` (after `## Styling Approach`), verbatim from RESEARCH §4.4. Contains:
- Keep-alive tab pattern (mainStackScreenStyle shape)
- Full-screen overlay pattern (style-array with tracking pointerEvents)
- Why: display+pointerEvents rationale with RNav #12824 reference
- Review checklist: new overlays MUST be added to OVERLAY_FLAGS

## Verification Results

| Check | Expected | Actual | ✅/❌ |
|-------|----------|--------|-----|
| `grep "OVERLAY_FLAGS" App.tsx` | array + derivation | 3 lines (comment ref + `const OVERLAY_FLAGS = [` + `.some(Boolean)` derivation) | ✅ |
| `grep "pointerEvents" App.tsx` | ≥ 4 style-form | 4 style-form matches, 0 prop-form | ✅ |
| `grep -c "[NAV]" App.tsx` | ≥ 3 | 3 | ✅ |
| `grep -c "[NAV]" src/components/BottomNavigator.tsx` | ≥ 1 (prompt says ≥ 1; plan AC said exactly 1) | 2 (see deviation D-03.1 below) | ✅ (by prompt), ⚠ (by plan AC) |
| `grep -n "^## Keep-alive and overlay screens$" CONVENTIONS.md` | exactly 1 | 1 match at line 258 | ✅ |
| Old state-based `hideMainStackUnderOverlay` at 508-509 removed | yes | 0 matches to `!!selectedProperty \|\| isRenterListingsOpen \|\| (!!user` pattern | ✅ |
| TypeScript type-check on changed files | 0 errors in App.tsx / BottomNavigator.tsx | 0 errors (pre-existing errors in AuthContext.tsx / ThemeContext.tsx untouched — out of scope) | ✅ |
| 4 atomic commits for 4 tasks | yes | b031c90, a44667f, d949b4a, f2db5f1 | ✅ |
| STATE.md / ROADMAP.md untouched | yes | confirmed | ✅ |

## Deviations from Plan

### D-03.1 [Rule 2 - Missing critical functionality] BottomNavigator has 2 onPress handlers

**Found during:** Task 3
**Plan acceptance criterion stated:** `grep -c "\[NAV\]" src/components/BottomNavigator.tsx` returns exactly 1 (tab tap received)
**Actual:** returns 2
**Why:** `src/components/BottomNavigator.tsx` has two separate `<TouchableOpacity>` elements — the normal tab branch (line ~72 post-edit) AND the Add button branch (line ~52 post-edit, which uses different styling and a different `TAP_ICONS.add` visual). Instrumenting only one `onPress` would leave the Add tab's taps uncaptured — a diagnostic blind spot for Plan 04's C1 evidence gathering. Per Rule 2, instrumented both handlers with identical `[NAV] tab tap received` logs (tab id keyed from the respective closure).
**Impact:** Pleases the prompt-level success-criterion (`grep -c "\[NAV\]" App.tsx src/components/BottomNavigator.tsx` ≥ 4 — we have 5). Plan 06's grep-strip pattern `grep -n "\[NAV\]"` catches both just fine, so D-02 intent is preserved.
**Commit:** `d949b4a`

No other deviations. All Rules 1, 3, 4 silent (no bugs found, no blockers, no architectural changes needed).

## Authentication Gates

None. Plan was fully automatable.

## Known Stubs

None. All code wired to real data flows; no placeholder text / empty arrays introduced.

## Threat Flags

None. No new trust boundaries — this plan only reshapes state-machine internals and adds render-scope console logs (booleans, no PII, no tokens). The [NAV] log that dumps `activeTourUrl`/`activePhotosUrl` only emits `!!` coerced booleans, not the URL strings themselves — so even the diagnostic surface is minimized. All 3 threat-register items from the plan's `<threat_model>` were accepted (T-01-03-01, T-01-03-03) or mitigated as planned (T-01-03-02 via tagged strip in Plan 06).

## Notes for Plan 04

1. All 4 log sites are active and ready. Grep for `[NAV]` in Metro output during device re-run.
2. Line numbers shifted from the plan's references because of cumulative Task 1+2 insertions:
   - Old `App.tsx:509` overlay-flags log site → new `App.tsx:92`
   - Old `App.tsx:525` mainStack render site → new `App.tsx:542`
   - Old `App.tsx:697-712` onTabChange region → new `App.tsx:679` (entry point log only)
3. C1 confirmation predicate (RESEARCH §2.1): if `[NAV] tab tap received` fires but `[NAV] tab handler entered` does NOT, OR `[NAV] overlay-flags` shows `hide: true` after user visually returned from overlay → C1 confirmed.
4. Ruled-out predicate: all 4 logs fire with correct state transitions but bug reproduces → advance to C2 per Plan 05.
5. Plan 02's deferred-baseline decision means Plan 04 runs on post-fix code WITHOUT a paired pre-fix baseline row in `01-REPRO-MATRIX.md`. Per RESEARCH §9 A6 "zero-FAIL branch taken upfront": gate is now pass/fail on post-fix device evidence alone, not a delta.

## TDD Gate Compliance

N/A — `type: execute` plan, not `type: tdd`. No test-first requirement.

## Self-Check: PASSED

- `App.tsx` exists, contains OVERLAY_FLAGS array + derivation at lines 84-91 ✓
- `src/components/BottomNavigator.tsx` exists, contains 2 `[NAV] tab tap received` logs ✓
- `.planning/codebase/CONVENTIONS.md` exists, contains `## Keep-alive and overlay screens` at line 258 ✓
- Commits `b031c90`, `a44667f`, `d949b4a`, `f2db5f1` all present in `git log` ✓
- Plan 02 baseline parent (`c796a42` → `72ac6d2`) correctly precedes this plan's first commit ✓
- TypeScript: zero errors introduced in changed files ✓
- STATE.md / ROADMAP.md files not modified by this plan ✓

---

*Plan executed: 2026-04-22*

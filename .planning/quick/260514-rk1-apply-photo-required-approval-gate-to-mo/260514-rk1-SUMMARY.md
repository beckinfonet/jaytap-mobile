---
phase: quick-260514-rk1
plan: 01
subsystem: moderation
tags:
  - quick-task
  - moderation
  - photo-gate
  - parity-fix
  - row-tap-routing
requirements:
  - QUICK-260514-RK1
dependency_graph:
  requires:
    - PropertyDetailsScreen showNeedsMediaBanner predicate (Phase 3 / unchanged)
    - NeedsMediaBanner component (Phase 3 / unchanged)
    - App.tsx setSelectedProperty + openMediaCuration wiring (Phase 3 / unchanged)
  provides:
    - Unified Moderation Queue row-tap routing (all rows -> PropertyDetailsScreen)
    - Photo-gate UX parity across all entry paths into PropertyDetailsScreen
  affects:
    - src/screens/ModerationQueueScreen.tsx (handleRowTap simplified)
    - src/screens/__tests__/ModerationQueueScreen.test.tsx (zero-photo row-tap test inverted)
tech-stack:
  added: []
  patterns:
    - "Single trust boundary on backend (/approve MEDIA_REQUIRED); client UI is guidance only"
    - "Photo-gate UX centralized on PropertyDetailsScreen; all entry paths inherit it via onOpenPropertyDetails"
key-files:
  created: []
  modified:
    - src/screens/ModerationQueueScreen.tsx
    - src/screens/__tests__/ModerationQueueScreen.test.tsx
decisions:
  - "Keep onOpenMediaCuration prop on ModerationQueueScreen even though unused at the row-tap site (App.tsx wiring stays stable; planner's explicit out-of-scope note)"
  - "Test inversion preserves the has-media regression-guard test verbatim — only the zero-photo test changes"
metrics:
  duration: "~10 minutes"
  completed: "2026-05-14"
  tasks_completed: 1
  tests_passing: "5/5 in ModerationQueueScreen suite"
---

# Quick Task 260514-rk1: Apply Photo-Required Approval Gate to Moderation Queue Path Summary

**One-liner:** Mod/admin tapping a zero-photo pending listing from Profile → Moderation Queue now lands on PropertyDetailsScreen (not MediaCurationScreen), so the existing photo-gate banner + disabled Approve button fires — matching every other entry path's behavior.

## What Changed

### `src/screens/ModerationQueueScreen.tsx`

Simplified `handleRowTap` from a conditional branch (zero-photo → `onOpenMediaCuration(listingId)`; has-photo → `onOpenPropertyDetails(listing)`) to a single unified dispatch: `onOpenPropertyDetails(listing)` for all rows.

- Removed the `photoCount === 0 && onOpenMediaCuration` early-return branch.
- Removed `onOpenMediaCuration` from the `useCallback` dependency array (no longer read inside).
- Updated the JSDoc above the callback to reference quick-260514-rk1 unification rationale, pointing at PropertyDetailsScreen's existing photo-gate (lines 298-311 / 1548-1579 / 1588-1611) as the canonical source of the zero-photo UX.
- Kept `onOpenMediaCuration` declared in the props interface (line 69) and destructured in the component signature (line 87) per plan's explicit out-of-scope note — App.tsx wiring stays stable; only the row-tap invocation was removed. The NeedsMediaBanner "Add photos" CTA inside PropertyDetailsScreen continues to invoke MediaCurationScreen via the App.tsx-forwarded callback.

### `src/screens/__tests__/ModerationQueueScreen.test.tsx`

Inverted the zero-photo row-tap test:

- **Old name:** "Row tap on needs-media listing dispatches onOpenMediaCuration with the listing id (W2 curation branch)"
- **New name:** "Row tap on needs-media listing dispatches onOpenPropertyDetails (post-fix 260514-rk1: unified row-tap so PropertyDetailsScreen photo-gate applies)"
- **Assertion change:** Now expects `onOpenPropertyDetails` called once with `{ id: 'b' }` and `onOpenMediaCuration` not called.
- **Comment update:** Reflects the unified routing rationale.

The has-media row-tap test (lines 282-296 in the original) and the filter-chip tests are unchanged — they serve as regression guards and continue to pass.

## TDD Gate Compliance

This task was executed as a single TDD cycle inside one commit (RED → GREEN within one task per plan structure), not as separate `test(...)` / `feat(...)` commits.

- **RED gate (verified):** After inverting the test and BEFORE applying the implementation fix, ran `npx jest --testPathPattern=ModerationQueueScreen`. Output captured: `Tests: 1 failed, 4 passed, 5 total` — the renamed zero-photo test failed with `Expected number of calls: 1, Received number of calls: 0` because the implementation still routed to `onOpenMediaCuration`. The has-media test continued to pass.
- **GREEN gate (verified):** After applying the `handleRowTap` simplification, re-ran the same command. Output: `Tests: 5 passed, 5 total` across both row-tap tests and the three filter-chip tests.

Both gates were observed in-session before commit `c2bc982` was created. The single-commit pattern is per the plan's `<output>` block (line 211): `Commit with message: fix(quick-260514-rk1): apply photo-required approval gate to Moderation Queue path` referencing only the two touched files.

## Verification Results

### Automated

- **`npx jest --testPathPattern=ModerationQueueScreen`:** PASS — 5/5 tests green.
  - `Default filter all-pending shows all 3 listings (D-03 first-render preserved)`
  - `Tapping needs-media chip shows only listings with photos.length === 0 (B + C)`
  - `Tapping has-media chip shows only listings with photos.length > 0 (A only)`
  - `Row tap on needs-media listing dispatches onOpenPropertyDetails (post-fix 260514-rk1: unified row-tap so PropertyDetailsScreen photo-gate applies)` (inverted)
  - `Row tap on has-media listing dispatches onOpenPropertyDetails (W2 mod-action branch — D-04)` (unchanged regression guard)
- **`npx tsc --noEmit` scoped to touched files:** PASS — `grep -E "ModerationQueueScreen" tsc-output` returns zero matches. The pre-existing TSC errors elsewhere (App.tsx, ChatComposeScreen, ChatScreen, ScheduleViewingScreen, TourSelectionScreen, ThemeContext.tsx, DeleteListingModal.tsx) were NOT introduced by this task and are out of scope per the executor's scope-boundary rule.
- **Grep check (from plan's `<done>` criteria):** `grep -n "onOpenMediaCuration" src/screens/ModerationQueueScreen.tsx` returns three lines — the prop declaration (line 69), the destructured signature (line 87), and a JSDoc comment reference (line 307). No call-site invocation remains in `handleRowTap`. Done criteria satisfied.

### Manual (deferred to user — paired-gates smoke checklist)

Per memory `gsd-verifier-misses-regressions.md`, automated tests alone are not enough. The following on-device smoke checklist is the human-side verification gate:

1. Sign in as moderator/admin on iPhone or Android.
2. Profile → "Moderation Queue" → tap a pending listing with **zero photos**.
3. Confirm: screen is **PropertyDetailsScreen** (NOT MediaCurationScreen).
4. Confirm: amber "Photos required before approval" banner is visible with "Add at least one photo before this listing can go live." subtext and "Add photos" CTA.
5. Confirm: "Approve Listing" button is greyed out (opacity 0.5) and non-tappable.
6. Confirm: "Add at least one photo to enable approval" helper text appears above the action row.
7. Confirm: Reject / Edit on behalf / Archive / Delete remain enabled.
8. Tap "Add photos" inside the banner → confirm MediaCurationScreen opens (curation chain preserved through PropertyDetailsScreen).
9. Tap a moderation-queue row **with photos** → confirm Approve still works normally (no regression).
10. Switch app language to **RU** → confirm RU copy renders ("Перед одобрением требуются фото" + "Добавьте хотя бы одно фото…").

## Deviations from Plan

None — plan executed exactly as written.

## Authentication Gates

None encountered during this task.

## Threat Surface Scan

No new attack surface introduced. The fix moves the zero-photo UX from MediaCurationScreen back to PropertyDetailsScreen; the canonical client-side photo-gate predicate (`showNeedsMediaBanner` on PropertyDetailsScreen) is unchanged, and the backend `/approve` `MEDIA_REQUIRED` gate remains the actual trust boundary (T-rk1-01 disposition: mitigate, defense-in-depth; T-rk1-02 disposition: accept, no race-semantics change).

## Known Stubs

None. All UI strings already keyed in EN + RU. No new placeholders or hardcoded values introduced.

## Commits

| # | SHA       | Message                                                                            | Files                                                                                                |
|---|-----------|------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------------|
| 1 | c2bc982   | fix(quick-260514-rk1): apply photo-required approval gate to Moderation Queue path | src/screens/ModerationQueueScreen.tsx, src/screens/__tests__/ModerationQueueScreen.test.tsx          |

## Self-Check: PASSED

- File `src/screens/ModerationQueueScreen.tsx` — FOUND.
- File `src/screens/__tests__/ModerationQueueScreen.test.tsx` — FOUND.
- Commit `c2bc982` — FOUND in `git log --oneline --all`.
- No file deletions in the commit (verified via `git diff --diff-filter=D --name-only HEAD~1 HEAD`).
- ModerationQueueScreen suite green 5/5; no new TSC errors involving touched files.

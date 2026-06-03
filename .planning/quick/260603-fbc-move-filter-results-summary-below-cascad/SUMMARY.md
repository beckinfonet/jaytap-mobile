---
quick_id: 260603-fbc
slug: move-filter-results-summary-below-cascad
date: 2026-06-03
status: complete
commit: PENDING
---

# Summary: Move filter results summary below the filter, above listings

## What changed (`src/screens/HomeScreen.tsx` only)

The "N homes / Rent · Residential · …" summary moved from the **static header
above the FILTERS panel** to **inside the results FlatList header**, placed
**after `CascadingFilter` and before `HospitalitySection`** — i.e. directly under
the filter panel and above the listing results (per the annotated screenshot).

- Memoized `toggleFiltersExpanded` (`useCallback([])`) so it can be a stable dep of
  the `renderListHeader` `useCallback` without remounting the header (260601-1b8
  invariant). Body only touches the stable `setIsFiltersExpanded` + `listRef`.
- Moved the summary IIFE into `renderListHeader`, wrapped in a new `summaryWrap`
  View (`paddingHorizontal: 20`) to restore the horizontal alignment it had inside
  `headerContainer`.
- Added `t`, `colors`, `toggleFiltersExpanded` to the `renderListHeader` deps. Safe:
  `colors` = `colors[currentTheme]` (module-constant access, stable per theme),
  `t` is `useCallback`-memoized (stable per language), `toggleFiltersExpanded` now
  memoized — so the header only re-creates on theme/lang/filter changes.
- Removed the summary IIFE from `renderHeaderContent`.

The tappable behavior (`onPress={toggleFiltersExpanded}`) and translation logic
(260603-emq) are preserved verbatim.

## Behavioral note (intended)

The summary now lives in the scrollable list header, so it scrolls away with the
panel instead of staying pinned (reverses the 260601-1b8 "pinned" choice, per the
user's explicit request). The static filter icon in the search row remains the
re-entry affordance when scrolled.

## Verification

- `tsc --noEmit`: 0 errors in HomeScreen (baseline 17 elsewhere preserved).
- `eslint src/screens/HomeScreen.tsx`: identical error count before/after the change
  (7 → 7, all pre-existing; stash-diff confirmed) — no new lint issues. In
  particular, no new `react-hooks/exhaustive-deps` warning: the only flagged deps
  (`handlePressProperty`/`handleViewTour`) were already in `renderListHeader` before
  this change.
- `jest src/screens/__tests__/HomeScreen-filter.test.ts`: 7/7.
- No i18n keys, deps, or theme tokens changed.

## Pending USER on-device QA

1. Cascading: summary renders directly under the TYPE chips, above the first card.
2. Tapping the summary still toggles the filter + scrolls to top.
3. Collapsed cascading + guided style: summary still shows above the listings.
4. Light + dark; RU; pull-to-refresh; scroll behavior.

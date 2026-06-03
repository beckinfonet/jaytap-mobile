---
quick_id: 260603-fbc
slug: move-filter-results-summary-below-cascad
date: 2026-06-03
status: planned
---

# Quick Task: Move filter results summary below the filter, above listings

## Problem (reported, with annotated screenshot)

The "N homes / Rent · Residential · …" summary currently sits in the **static
header above the FILTERS panel**. The user wants it moved **underneath the
category/type section of the filter and right above the listing results** (the
"here" arrow points between the Condo chip and the first FOR RENT card).

## Current layout (HomeScreen.tsx)

- `renderHeaderContent()` — STATIC header (above the FlatList): topBar, searchRow,
  GuidedFilterSheet modal, and the **summary IIFE** (lines ~634–684).
- `renderListHeader` — the results FlatList `ListHeaderComponent` (SCROLLS):
  `CascadingFilter` (when expanded) + `HospitalitySection`.

The summary was pinned in the static header by 260601-1b8 so it stayed visible as
a re-entry affordance. The user now wants it relocated below the filter.

## Fix (`src/screens/HomeScreen.tsx` only)

1. **Memoize `toggleFiltersExpanded`** with `useCallback([])` (body only touches the
   stable `setIsFiltersExpanded` + `listRef`). Needed so it can join the
   `renderListHeader` dep array without remounting the header (260601-1b8 invariant).
2. **Move the summary IIFE** out of `renderHeaderContent` into `renderListHeader`,
   placed **after `CascadingFilter` and before `HospitalitySection`** — i.e. directly
   under the filter panel, above the (hospitality + main) listing results. Wrap it in
   a new `summaryWrap` View (`paddingHorizontal: 20`) so it keeps its horizontal
   alignment now that it's outside `headerContainer`'s padding.
3. **Add deps** `t`, `colors`, `toggleFiltersExpanded` to the `renderListHeader`
   `useCallback`. Safe: `colors` = `colors[currentTheme]` (module-constant access,
   stable per theme); `t` is `useCallback`-memoized (stable per language);
   `toggleFiltersExpanded` now memoized — so the header only re-creates on
   theme/lang/filter changes (all desired), never on every render.
4. **Remove** the summary IIFE + its comment from `renderHeaderContent`.

The summary keeps its tappable behavior (`onPress={toggleFiltersExpanded}`) and
translation logic (260603-emq) verbatim.

## Behavioral note (intended)

This relocates the summary into the scrollable list header, so it scrolls away with
the panel instead of staying pinned (reverses the 260601-1b8 "pinned" choice, per the
user's explicit request). The static filter icon in the search row remains the
re-entry affordance when scrolled.

## Verification

- `tsc --noEmit`: 0 new errors in HomeScreen.
- `jest HomeScreen-filter`: still 7/7 (predicate test, unaffected).
- Manual: summary now renders directly under the cascading filter, above the first
  listing card; tapping it still toggles/scrolls; cascading + guided styles; light+dark; RU.

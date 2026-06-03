---
quick_id: 260603-d9y
slug: fix-favorites-not-refreshing-when-reopen
date: 2026-06-03
status: complete
commit: 6a13661
---

# Summary: Favorites tab not refreshing on reopen

## What was wrong

Favoriting a listing (heart icon on a `PropertyCard`) then opening **Favorites** —
especially via the **bottom-nav heart tab** — did not show the new listing. The
list only refreshed the very first time Favorites was ever opened.

## Root cause (corrected mid-investigation)

The first theory was a backend POST→GET race. That was **wrong**. The real cause:

`FavoritesScreen` is **kept-alive**, not unmounted, by `App.tsx`:

- Mount guard `{(tabEverMounted.favorites || showFavorites) && (...)}` keeps it in
  the tree forever after first open.
- `mainStackScreenStyle(visible)` (`App.tsx:786`) hides it with `display:'none'` —
  no unmount, so React never re-runs mount effects.
- `FavoritesScreen`'s only fetch trigger was `useEffect(() => loadFavorites(), [user])`
  (`FavoritesScreen.tsx:46`) — runs on first mount + auth change only.

Result: re-opening the tab flips `display` back to `flex` but never re-fetches →
stale list → just-favorited listing absent until app reload. The custom `App.tsx`
state machine has no `react-navigation`, so no `useFocusEffect` was available.

## Fix

Refetch on visibility transition (the manual equivalent of focus-refetch):

- **`src/screens/FavoritesScreen.tsx`**
  - New optional prop `isVisible?: boolean`.
  - New effect `useEffect(() => { if (isVisible) loadFavorites(); }, [isVisible])`
    (deps intentionally `[isVisible]`; matched the file's existing
    `exhaustive-deps` opt-out for `loadFavorites`, suppressed inline).
  - Kept the `[user]` effect (first mount + auth changes).
  - No spinner flash on revisit: `loadFavorites()` never sets `loading = true`, so
    the list updates in place.
- **`App.tsx`**
  - Pass `isVisible={showFavorites}` to `<FavoritesScreen />` (`App.tsx:817`).
    `showFavorites` is already the single source of truth for "Favorites is the
    active main-stack screen".

Both Profile→Favorites and bottom-nav→Favorites paths set `isFavoritesOpen` →
`showFavorites` true → refetch fires on either entry.

## Verification

- `tsc --noEmit`: **0 errors in the two changed files** (17 pre-existing errors in
  unrelated files — `ThemeContext`, `ChatScreen`, `DeleteListingModal`,
  `ScheduleViewingScreen`, `TourSelectionScreen`, `StepperInput.test` — untouched).
- `eslint`: **0 new problems**. The one `exhaustive-deps` error on the `[user]`
  effect is pre-existing (confirmed by linting the stashed original); my new effect
  carries its disable comment and is clean.
- No new deps, no new i18n keys, no theme-token changes, no backend change.

## Pending USER on-device QA

1. Favorite a listing from Home → tap **bottom-nav Favorites** → listing appears immediately.
2. Favorite from Home → open **Profile → Favorites** → listing appears immediately.
3. Unfavorite from within Favorites → removes in place (existing path, unaffected).
4. First-ever open of Favorites still loads (the `[user]` effect path).
5. iOS + Android × light/dark sanity.

## Out of scope

- Lifting the favorites list into App-level context (larger refactor; not needed).
- Backend changes (the toggle POST is awaited before navigation).

---
quick_id: 260603-d9y
slug: fix-favorites-not-refreshing-when-reopen
date: 2026-06-03
status: planned
---

# Quick Task: Favorites tab not refreshing on reopen

## Problem (reported)

When a user taps the heart icon to favorite a listing, then immediately opens the
**Favorites** page (especially via the **bottom navigation** heart tab), the newly
favorited listing does **not** show up. Reaching Favorites via Profile has the same
underlying defect but is masked by extra navigation latency.

## Root cause (verified, not the originally-theorized backend race)

`FavoritesScreen` is mounted with a **keep-alive** pattern in `App.tsx`:

```tsx
{(tabEverMounted.favorites || showFavorites) && (
  <View style={mainStackScreenStyle(showFavorites)}>   // display: none when hidden
    <FavoritesScreen ... />
```

- `mainStackScreenStyle(visible)` toggles `display: 'none'` — it does **not** unmount
  the screen (`App.tsx:786`).
- Once `tabEverMounted.favorites` flips true on first open, `FavoritesScreen` stays
  mounted for the app's lifetime.
- Its data fetch only runs on mount / user change:
  `useEffect(() => { loadFavorites(); }, [user]);` (`FavoritesScreen.tsx:46`).

So the **second** time the user opens the Favorites tab, the screen's `display`
flips back to `flex` but `loadFavorites()` never re-runs → the list is stale →
the just-favorited listing is missing. App.tsx's optimistic `favoriteStatuses`
map is updated, but `FavoritesScreen` builds its visible list from a separate
`FavoritesService.getFavorites()` call, which is never re-issued.

There is no `react-navigation`, so no `useFocusEffect` is available — the custom
`App.tsx` state machine must signal visibility explicitly.

## Fix

Re-fetch favorites whenever the screen transitions to **visible**:

1. **`src/screens/FavoritesScreen.tsx`**
   - Add `isVisible?: boolean` to `FavoritesScreenProps`.
   - Add an effect: `useEffect(() => { if (isVisible) loadFavorites(); }, [isVisible]);`
   - Keep the existing `[user]` effect (covers first mount + auth changes).
   - No spinner flash: `loadFavorites()` does not set `loading = true`, so revisits
     update the list in place.

2. **`App.tsx`**
   - Pass `isVisible={showFavorites}` to `<FavoritesScreen />` (`App.tsx:817`).
   - `showFavorites` is already the single source of truth for "Favorites tab is
     the active main-stack screen".

## Out of scope

- No refactor lifting the favorites list into App.tsx context (bigger change, not needed).
- No backend changes — the POST in `handleFavorite` is awaited and committed before
  navigation in all real flows; refetch-on-visible closes the gap deterministically.

## Verification

- TypeScript compile (`tsc --noEmit`) passes — prop type added on both sides.
- Manual on-device QA: favorite a listing from Home → tap bottom-nav Favorites →
  the listing appears immediately. Repeat via Profile → Favorites. Unfavorite from
  the Favorites screen still removes in place (existing `handleFavorite` path).

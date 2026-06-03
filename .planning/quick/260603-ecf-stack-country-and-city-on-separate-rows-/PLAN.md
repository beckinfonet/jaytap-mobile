---
quick_id: 260603-ecf
slug: stack-country-and-city-on-separate-rows-
date: 2026-06-03
status: planned
---

# Quick Task: Stack country/city on separate rows (HomeScreen header title)

## Problem (reported)

Follow-up to 260603-dww. The single-line title with `numberOfLines={1}` ellipsizes
long RU names awkwardly ("Кыргызстан • Бишк…"), which is hard to read. User wants
the country and city on **separate rows**. The shrunk dark-mode/locale toggles from
260603-dww are liked and stay as-is.

## Fix (`src/screens/HomeScreen.tsx` only)

Replace the single-line title (for the selected-city case) with a stacked block:

- Line 1: country label — `styles.locationCountry` (fontSize 13, weight 400,
  `colors.textSecondary`, Georgia/serif), `numberOfLines={1}`.
- Line 2: city + ` ⌄` chevron — `styles.locationCity` (fontSize 16, weight 600,
  `colors.text`, Georgia/serif), `numberOfLines={1}`.
- Wrapper `styles.locationTextBlock` (`alignItems:'center'`).
- Drops the `•` bullet (redundant once stacked).

The "All cities" default (no `selectedCity`) stays a single line via the existing
`locationTitle` style + `t('home.allCities') ⌄`.

Subtle hierarchy (small country over bold city) chosen for readability — the user's
complaint was specifically that the one-line ellipsis was "hard to read".

## Out of scope / preserved

- Toggle sizes from 260603-dww unchanged.
- `rightIcons.gap`, avatar, dropdown Modal untouched.
- No i18n key changes (reuses `country.*` + city labels), no deps, no theme tokens.

## Verification

- `tsc --noEmit`: 0 errors in HomeScreen (baseline 17 elsewhere preserved).
- Country names (Кыргызстан / Казахстан / Узбекистан) + cities (Бишкек / Алматы /
  Ташкент) are short enough to render without ellipsis in the ~156pt title column;
  `numberOfLines={1}` per row is a guard, not the normal path.
- Manual on-device QA: RU two-row title; EN two-row; "All cities" single row;
  light + dark; Android serif; dropdown still opens on tap.

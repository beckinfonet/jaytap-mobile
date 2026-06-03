---
quick_id: 260603-ecf
slug: stack-country-and-city-on-separate-rows-
date: 2026-06-03
status: complete
commit: PENDING
---

# Summary: Stacked country/city title (HomeScreen header)

## What changed

Follow-up to 260603-dww. The one-line title's `numberOfLines={1}` ellipsis was hard
to read for long RU names. Replaced it (selected-city case) with an explicit two-row
block in `src/screens/HomeScreen.tsx`:

- **Line 1** — country, `locationCountry` (13pt, weight 400, `colors.textSecondary`, Georgia/serif), `numberOfLines={1}`.
- **Line 2** — city + ` ⌄`, `locationCity` (16pt, weight 600, `colors.text`, Georgia/serif), `numberOfLines={1}`.
- Wrapper `locationTextBlock` (`alignItems:'center'`); `•` bullet dropped.
- "All cities" default stays one line via the existing `locationTitle`.

The shrunk toggles from 260603-dww are untouched — only the title structure changed.

## Why this shape

User explicitly wanted country and city on separate rows and called the ellipsis
hard to read. A small country label over a bolder city reads cleanly and now fits
because 260603-dww freed ~50pt of title width (right cluster 206pt→156pt).

## Verification

- `tsc --noEmit`: 0 errors in HomeScreen (baseline 17 elsewhere preserved).
- Real country/city names are short enough to avoid ellipsis in the ~156pt column;
  per-row `numberOfLines={1}` is a guard, not the normal path.
- No i18n key changes, no deps, no theme-token changes. One file touched.

## Pending USER on-device QA

1. RU: "Кыргызстан" over "Бишкек ⌄" — two clean rows, no cutoff.
2. EN two-row; "All cities" single row.
3. Other markets (Казахстан/Алматы, Узбекистан/Ташкент).
4. Light + dark; Android serif; dropdown still opens on tap.
5. Confirm the small-country / bold-city hierarchy feels right (easy to tweak if not).

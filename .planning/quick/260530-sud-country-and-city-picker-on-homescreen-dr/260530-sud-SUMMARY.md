---
quick_id: 260530-sud
slug: country-and-city-picker-on-homescreen-dr
status: complete
date: 2026-05-31
files_touched:
  - src/screens/HomeScreen.tsx
  - src/locales/en.ts
  - src/locales/ru.ts
  - src/screens/__tests__/HomeScreen-filter.test.ts
---

# Quick Task 260530-sud — Country/city picker on HomeScreen

## What landed

The top-of-screen `"Bishkek • All / microdistricts"` dropdown is replaced with a
dynamic country/city picker fed by `fetchCities()` (`GET /locations/cities`).
Microdistrict chips are gone. Header text now reads `"All cities"` (default) or
`"{Country} • {City}"`.

Cities are grouped by country in the modal (KG → KZ → UZ); only `status:'approved'`
cities are shown. The hardcoded `BISHKEK_DISTRICTS` array (16 entries) was deleted.
On launch with empty inventory in Almaty/Osh/Tashkent, picking those cities
correctly shows 0 results — that's the forward-looking infra; "All cities"
default preserves discovery for today's Bishkek-heavy inventory.

## How filters were preserved

- Filter contract changed from **substring-match across 4 fields** to **exact
  case-insensitive slug equality on `p.location.city`**. Cleaner, predictable,
  no false negatives caused by missing `location.address` text.
- The freetext search bar still hits `location.district` so legacy listings
  with district slugs (e.g. `mkr-5`) remain findable by typing the name.
- "All cities" (null selection) skips the city gate entirely — equivalent to
  the old `'Bishkek (All)'` no-op behavior.

## Why the microdistrict zero-results bug is "fixed" by deletion

Phase 12 (quick-task `260527-0cg`) removed the district capture from
`Step2Location.tsx`. New listings save `location.district = ''`. The
microdistrict chips then only matched via `location.address` substring, which
Nominatim sometimes returned and sometimes didn't. By removing the chips, the
broken UI surface is gone — discovery happens at the city level (which has
populated data) and freetext (which still hits all fields).

## Files modified

| File | Change |
|------|--------|
| `src/screens/HomeScreen.tsx` | Deleted `BISHKEK_DISTRICTS`. Added `fetchCities()` effect + `City` state. Replaced `selectedDistrict` string state with `selectedCity: City \| null`. Filter rewritten as slug equality. Modal renders country-grouped list with synthetic header/loading/all items. New section-header styles. Imports `City`, `fetchCities`, `TranslationKeys`. |
| `src/locales/en.ts` | Removed dead keys `home.bishkekAll` + `home.district`. Added `home.allCities: 'All cities'`. |
| `src/locales/ru.ts` | Same swap: `home.allCities: 'Все города'`. |
| `src/screens/__tests__/HomeScreen-filter.test.ts` | Rewrote the predicate fixture (`matchesCityAndSearch`) to mirror the new contract. 7 tests cover null/exact/case-insensitive/negative/freetext/legacy-district/sanity. |

## Verification

- `npx jest src/screens/__tests__/HomeScreen-filter.test.ts` → **7/7 pass** (0.6s).
- `npx tsc --noEmit` → 0 errors in changed files. Pre-existing baseline errors
  in unrelated files (`ChatScreen`, `DeleteListingModal`, `TourSelectionScreen`,
  `ThemeContext`, `StepperInput.test`) preserved untouched.
- Pre-existing `PropertyCard.test.tsx` failures (5 tests) confirmed present on
  `main` HEAD before this work via `git stash` → unrelated regression seed for
  follow-up.

## Out-of-scope follow-ups surfaced

These hardcoded Bishkek assumptions still exist (would not block the picker but
should be tracked as M4/M5 backlog):

- `PropertyMap.tsx:16-18` — `BISHKEK_COORDINATES` map center
- `Step2Location.tsx:54` — `BISHKEK_DEFAULT` map seed
- `PropertyDetailsScreen.tsx:766` — `BISHKEK_CENTER` fallback for missing coords
- `profile.bishkekTime` / `schedule.timesBishkek` — Bishkek-only timezone copy
- `step5.titlePlaceholder` — Bishkek-specific placeholder copy

## Commit

`ac2c44b` — `feat(home): replace Bishkek microdistrict dropdown with country/city picker`

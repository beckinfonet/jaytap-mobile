---
quick_id: 260530-sud
slug: country-and-city-picker-on-homescreen-dr
description: Country and city picker on HomeScreen — drop Bishkek microdistricts
date: 2026-05-31
status: in-progress
files_touched:
  - src/screens/HomeScreen.tsx
  - src/locales/en.ts
  - src/locales/ru.ts
  - src/screens/__tests__/HomeScreen-filter.test.ts
---

# Quick Task 260530-sud — Country/city picker on HomeScreen

## Goal

Replace the top-of-screen "Bishkek • All / microdistricts" dropdown with a country+city picker (Kyrgyzstan/Bishkek, Kyrgyzstan/Osh, Kazakhstan/Almaty, Uzbekistan/Tashkent) and rip out the microdistrict filter path. Filters must not break — the substring match against `location.district` / `location.address` / `content.description` for microdistricts is going away because microdistricts themselves are out of scope.

## Locked decisions (from /gsd-quick discuss)

1. **City source:** Dynamic via `fetchCities()` from `src/services/locationService.ts` (`GET /locations/cities`). Group by country (KG/KZ/UZ) in the dropdown. No hardcoded list.
2. **Default selection:** "All cities" — preserves current behavior on launch. No persistence yet.

## Claude's discretion

- **Country sort:** Kyrgyzstan → Kazakhstan → Uzbekistan (matches existing `COUNTRIES` const in Step2Location, line 56).
- **Match contract:** Case-insensitive exact equality on `p.location.city` against the selected city's `slug`. (Step2Location stores city as slug; current substring match works only by accident.)
- **Header label:** `"All cities"` when nothing selected, `"{Country} • {City}"` when selected, both i18n'd.
- **Loading state:** While `fetchCities()` is in flight, header reads `"All cities"` (current default) and the modal body shows a spinner. Failure: silent — modal stays empty, user can still see all listings.
- **Modal layout:** Country headers (non-tap) above each city group. Keep the existing modal chrome (`dropdownMenu` / `dropdownItem` styles).
- **`selectedDistrict` state:** Replaced by `selectedCity: City | null` (null = All cities). All four old "Bishkek (All)" literals in HomeScreen.tsx (lines 98, 187, 306) collapse to one `selectedCity === null` check.

## Why microdistrict zero-results is "fixed" by this change

The Phase-12 redesign (quick-task 260527-0cg) removed the district field from Step 2 of the listing form. New listings save `location.district = ''`. The microdistrict chip filter then only matches via the `location.address` text fallback, which Nominatim sometimes returns and sometimes doesn't. Dropping microdistricts entirely makes this a non-issue — no chip, no zero-result trap.

## Out of scope (note for follow-up)

These are hardcoded "Bishkek" assumptions surfaced during analysis but **not** required to make the picker work:

- `PropertyMap.tsx:16-18` + `Step2Location.tsx:54` + `PropertyDetailsScreen.tsx:766` — `BISHKEK_COORDINATES` map centers
- `profile.bishkekTime` / `schedule.timesBishkek` i18n strings
- `step5.titlePlaceholder` placeholder copy

Add to M4 backlog if not already there.

## Plan

### Task 1 — HomeScreen: drop array, add picker

**File:** `src/screens/HomeScreen.tsx`

- Delete the `BISHKEK_DISTRICTS` const (lines 64–81).
- Add `City` import from `services/locationService`.
- Replace `selectedDistrict: string` state with `selectedCity: City | null`, default `null`.
- Add `cities: City[]` state + `loadingCities: boolean`, populated via `useEffect` calling `fetchCities()` on mount (Step2Location pattern).
- Rewrite the filter branch (lines 187–194) — when `selectedCity` is non-null, return `false` unless `p.location?.city?.toLowerCase() === selectedCity.slug.toLowerCase()`.
- Rewrite the header label (line 306) — `selectedCity == null ? t('home.allCities') : \`${t(\`country.${selectedCity.country}\`)} • ${selectedCity.label[language]}\` + ' ⌄'`.
- Rewrite the modal `FlatList` (lines 327–356) — render an "All cities" row at top, then per-country sections (KG → KZ → UZ): a non-tap country header `Text` row followed by each city's row. Tapping a city sets `selectedCity` and closes; tapping "All cities" sets `null` and closes.
- Spinner inside the modal body when `loadingCities`.
- Drop `location.district` from the freetext search branch (lines 197–226)? **No** — keep it so legacy data still searchable. Just delete the microdistrict-specific code paths.

### Task 2 — i18n keys

**Files:** `src/locales/en.ts`, `src/locales/ru.ts`

- Add `'home.allCities'`: `"All cities"` / `"Все города"`.
- (Country labels `country.KG` / `country.KZ` / `country.UZ` and Russian equivalents already exist — lines 900–902 of en.ts, 890+892 of ru.ts. Add `country.KZ` in ru.ts if missing.)
- The existing `'home.bishkekAll'` key is no longer rendered — leave in place to avoid touching unrelated callers; remove later if grep confirms no consumers.

### Task 3 — Tests

**File:** `src/screens/__tests__/HomeScreen-filter.test.ts`

- Replace the three district test cases with:
  - `selectedCity == null` → predicate returns true regardless of `location.city`.
  - `selectedCity.slug === 'bishkek'` → matches listing with `location.city = 'bishkek'`; does not match listing with `location.city = 'almaty'`.
  - Case insensitivity: `selectedCity.slug = 'bishkek'` matches `location.city = 'Bishkek'`.
- Keep the freetext search case (c) and the sanity case as-is.
- Update the predicate fixture (`matchesDistrictAndSearch`) to mirror the new HomeScreen filter exactly.

### Task 4 — Verify + commit

- `npx tsc --noEmit` — type check.
- `npx jest src/screens/__tests__/HomeScreen-filter.test.ts` — unit test.
- Single atomic commit: `feat(home): replace Bishkek microdistrict dropdown with country/city picker`.
- Write SUMMARY.md.
- Update `.planning/STATE.md` "Quick Tasks Completed" table.

## Risks / non-blockers

- **Backend `/locations/cities` response:** Phase 2 already proved this endpoint works (Step2Location consumes it). No new contract.
- **No listings outside Bishkek yet:** Picking Almaty/Osh/Tashkent will show 0 results. Expected and correct — the picker is forward-looking infra. The "All cities" default keeps the home screen full.
- **i18n freeze for already-shipped M3:** Unrelated to this quick task. We're only adding new keys, not breaking existing.

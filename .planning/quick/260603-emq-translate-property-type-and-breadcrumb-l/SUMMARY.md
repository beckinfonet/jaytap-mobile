---
quick_id: 260603-emq
slug: translate-property-type-and-breadcrumb-l
date: 2026-06-03
status: complete
commit: PENDING
---

# Summary: Translate property-type + breadcrumb labels in filter UI

## What was wrong

In RU mode, filter labels rendered in English. Diagnosis: **categories**
(Residential/Commercial/Hospitality) already translate on the category cards/tabs
via `t(CATEGORY_KEY_MAP[cat])`. The gaps were:

- **Guided sheet footer `Breadcrumb`** rendered `deal` + **`category`** + `types`
  all raw English — this is where the user saw "Residential"/"Commercial" untranslated.
- **Property TYPE labels** (Apartment, Office, Retail…) rendered raw at the Guided
  type cards, Cascading type chips, and the Home results summary line.

All needed i18n keys already existed in both locales (`propertyType.*`,
`category.*`, `filters.deal.*`) with parity — they just weren't called.

## Fix

**Source**
- `primitives/Breadcrumb.tsx` — added `useLanguage`; translate `deal`
  (`filters.deal.rent|buy`), `category` (new module-level `CATEGORY_KEY` → `category.*`),
  and each type (`propertyType.${type.toLowerCase()}`). Prop contract unchanged.
- `GuidedFilterSheet.tsx` (type card) + `CascadingFilter.tsx` (type chip) —
  `{typeName}` → `{t(`propertyType.${typeName.toLowerCase()}`)}`.
- `primitives/joinTypes.ts` — added optional 4th arg
  `opts?: { translate?; connective? }` (defaults: identity + `'or'`) →
  **backward compatible**, existing joinTypes tests untouched.
- `HomeScreen.tsx` (results summary) — passes `translate` + `connective: t('filters.or')`
  so the RU line reads "квартира или дом".
- `locales/en.ts` + `ru.ts` — added one new key `filters.or` = `or` / `или`
  (EN/RU parity preserved).

**Tests**
- `Breadcrumb.test.tsx` — added a `useLanguage` mock mapping the deal/category/
  propertyType keys back to the English words the existing assertions expect
  (a wrong key falls through and fails — proves the wiring).
- `CascadingFilter.test.tsx` — extended the `t` mock so `propertyType.*` resolves
  to the capitalized word, keeping `findChipByLabel('Apartment')` valid after the
  chip became translated. Category-tab key matching unchanged.

## Verification

- `tsc --noEmit`: 0 errors in touched files (baseline 17 elsewhere preserved).
- `jest src/components/filters`: **64/64** across 11 suites (Breadcrumb, Cascading,
  Guided, joinTypes all green).
- `jest HomeScreen-filter`: 7/7 (predicate test, unaffected).
- `scripts/check-i18n-parity.sh`: PASS (en.ts / ru.ts key sets identical).

## Out of scope

- PropertyCard / PropertyDetailsScreen type rendering (not "inside the filters").
- No category/type keys added — only `filters.or`.

## Pending USER on-device QA

1. RU Guided sheet footer breadcrumb: "Аренда › Жилая › Квартира" (no English).
2. RU type cards (Guided) + type chips (Cascading) show Квартира/Офис/etc.
3. RU Home results summary: "N домов · Аренда · Жилая · квартира или дом".
4. EN unchanged; light + dark.

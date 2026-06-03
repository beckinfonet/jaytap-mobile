---
quick_id: 260603-emq
slug: translate-property-type-and-breadcrumb-l
date: 2026-06-03
status: planned
---

# Quick Task: Translate property-type + breadcrumb labels in filter UI

## Problem (reported)

In RU mode some filter labels render in English. Investigation: **categories**
(Residential/Commercial/Hospitality) DO translate on the category cards/tabs via
`t(CATEGORY_KEY_MAP[cat])` — but **property TYPES** (Apartment, Office, Retail…)
render as raw English at every site, AND the Guided sheet **footer Breadcrumb**
renders deal + **category** + types all raw (this is where the user saw
"Residential"/"Commercial" untranslated). The i18n keys already exist in both
locales (`propertyType.*`, `category.*`, `filters.deal.*`) — they were just never
called at these render sites.

## Render sites that pass raw English (verified)

| Site | File:line | Renders raw |
|------|-----------|-------------|
| Guided type card | `GuidedFilterSheet.tsx:327` | `{typeName}` |
| Cascading type chip | `CascadingFilter.tsx:224` | `{typeName}` |
| Guided footer breadcrumb | `primitives/Breadcrumb.tsx:38-40,53` | deal + category + types |
| Home results summary | `HomeScreen.tsx:654` via `joinTypes` | types (lowercased) |

## Fix

### Source
1. **`primitives/Breadcrumb.tsx`** — add `useLanguage`; translate `deal`
   (`filters.deal.rent|buy`), `category` (module-level `CATEGORY_KEY` map →
   `category.*`), and each type (`propertyType.${type.toLowerCase()}`). Keeps the
   typed `deal/category/types` prop contract; i18n centralized in the component.
2. **`GuidedFilterSheet.tsx:327`** — `{t(`propertyType.${typeName.toLowerCase()}` as TranslationKeys)}`.
3. **`CascadingFilter.tsx:224`** — same.
4. **`primitives/joinTypes.ts`** — add optional 4th arg
   `opts?: { translate?: (t: string) => string; connective?: string }`
   (defaults: identity translate + `'or'`) → **backward compatible**, existing
   joinTypes tests untouched. Connective injected so RU reads "квартира или дом".
5. **`HomeScreen.tsx:654`** — pass `{ translate: ty => t(`propertyType.${ty.toLowerCase()}`), connective: t('filters.or') }`.
6. **`locales/en.ts` + `ru.ts`** — add `'filters.or'`: `'or'` / `'или'` (only new key; EN+RU parity).

### Tests (keep suites green)
7. **`Breadcrumb.test.tsx`** — add a `useLanguage` mock whose `t` maps the
   deal/category/propertyType keys back to the English words the existing
   assertions expect (proves wiring without rewriting assertions).
8. **`CascadingFilter.test.tsx`** — extend the `t` mock so `propertyType.*`
   resolves to the capitalized type word, so `findChipByLabel('Apartment')` still
   matches after the chip is translated (category-tab key matching unchanged).

## Out of scope

- PropertyCard / PropertyDetailsScreen type rendering (not "inside the filters").
- No new category/type keys — all exist; only `filters.or` is added.

## Verification

- `tsc --noEmit`: 0 new errors in touched files.
- `jest src/components/filters` green (incl. Breadcrumb, Cascading, Guided, joinTypes).
- i18n EN/RU parity (only `filters.or` added to both).
- Manual: RU Guided footer shows "Аренда › Жилая › Квартира"; type cards/chips RU;
  Home summary "N домов · Аренда · Жилая · квартира".

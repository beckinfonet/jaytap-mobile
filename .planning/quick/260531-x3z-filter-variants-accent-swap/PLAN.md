---
quick_id: 260531-x3z
slug: filter-variants-accent-swap
created: 2026-06-01
type: quick
---

# Quick: Swap filter-variant accent to #6f7bff

## Description

Change the pink accent inside the Phase 14 filter UI variants (Guided Steps + Cascading Reveal) from the brand pink (`#ff5a6f`) to periwinkle blue (`#6f7bff`). Scope is the two filter components only — every other accent surface in the app (HomeScreen filter button, AccountSettings English toggle, ProfileScreen Create Listing row, Send button, etc.) stays on the brand pink.

## Scope

- `src/theme/colors.ts` — add 3 new tokens to `MODE_INDEPENDENT_PALETTE`: `filterAccent: '#6f7bff'`, `filterAccentSoft: 'rgba(111,123,255,0.16)'`, `filterAccentLine: 'rgba(111,123,255,0.45)'`. Mirrors the existing `accent / accentSoft / accentLine` triple so light + dark mode parity is FALSIFIABLE by construction.
- `src/components/filters/GuidedFilterSheet.tsx` — 10 references: `colors.accent` → `colors.filterAccent` (4×), `colors.accentSoft` → `colors.filterAccentSoft` (3×), `colors.accentLine` → `colors.filterAccentLine` (3×).
- `src/components/filters/CascadingFilter.tsx` — 2 references: `colors.accent` → `colors.filterAccent`.

## Out of Scope

- HomeScreen filter button + chips (user explicitly scoped this to filter UI variants only)
- AccountSettings PREFERENCES section (English toggle pink stays)
- ProfileScreen Create Listing accent row
- ListingMetaTable, PropertyCard, status badges, any non-filter surface
- Light + dark mode use the same value — periwinkle reads correctly on both per same logic as the existing accent triple
- Renaming `colors.accent` → `colors.filterAccent` everywhere (would be a global rebrand, not a scoped change)

## Gates

- i18n parity: PASS (no new strings)
- KBD-02 grep gate: 0 hits in src/ (no keyboard work)
- tsc: 0 NET new errors in modified files
- No hardcoded hex literals in either filter component (use new theme tokens)

## Atomic Commits

1. `feat(quick): add filterAccent triple to theme palette`
2. `refactor(quick): swap accent → filterAccent in GuidedFilterSheet`
3. `refactor(quick): swap accent → filterAccent in CascadingFilter`

## Verification

Open filter on HomeScreen → tap Guided Steps variant → confirm active deal/category/type cards render periwinkle blue (not pink). Switch to Cascading Reveal variant in Account Settings → tap a filter → confirm active pill renders periwinkle. Confirm HomeScreen filter trigger button itself stays pink.

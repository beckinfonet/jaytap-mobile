---
quick_id: 260531-x3z
slug: filter-variants-accent-swap
status: complete
completed: 2026-06-01
commits: [8ff1808, c444526, c806c35, 561f4ab, 4356ce4, a0e6987, 8793338, 75c562f, 848ae06]
---

# Quick Summary: Filter-variant accent swap

## What

Scoped color swap inside the Phase 14 filter UI variants. Active deal cards, category cards, type cards (Guided Steps) + active category-tab underline + active type chips (Cascading Reveal) now render periwinkle blue (`#6f7bff`) instead of the brand pink (`#ff5a6f`). Every other accent surface in the app (HomeScreen filter button, AccountSettings English toggle, ProfileScreen Create Listing row, Send button, RoleBadge, OutlinedLogoutPill border, banner accents, etc.) stays on the brand pink.

## How

Added a parallel `filterAccent / filterAccentSoft / filterAccentLine` triple to `MODE_INDEPENDENT_PALETTE` in `src/theme/colors.ts`, mirroring the existing `accent / accentSoft / accentLine` shape so light + dark parity is FALSIFIABLE by construction (Phase 12 D-04 invariant). Replaced every `colors.accent*` reference inside the two filter components — 10 in `GuidedFilterSheet.tsx`, 2 in `CascadingFilter.tsx` — with the new `filterAccent*` tokens. No hardcoded hex literals introduced; no other consumers touched.

## Commits

1. `8ff1808` — `feat(quick-260531-x3z): add filterAccent triple to theme palette`
2. `c444526` — `refactor(quick-260531-x3z): swap accent → filterAccent in GuidedFilterSheet`
3. `c806c35` — `refactor(quick-260531-x3z): swap accent → filterAccent in CascadingFilter`
4. `561f4ab` — `refactor(quick-260531-x3z): swap active-step Stepper pill to filterAccent` (Round-2 follow-up — first pass missed the active-step pill in the 1-2-3 stepper bar because Stepper.tsx lives under `filters/primitives/` and read `colors.accent` directly. Completed-step pills + connector bars stay `landlordGreen` per user feedback)
5. `4356ce4` — `refactor(quick-260531-x3z): swap CheckSquare tick to filterAccent` (Round-3: the small ✓ squares inside selected Type cards were still pink because `CheckSquare.tsx` is its own primitive)
6. `a0e6987` — `refactor(quick-260531-x3z): swap ShowButton CTA to filterAccent` (Round-3: the "Show N homes" footer CTA in the Guided sheet)
7. `8793338` — `refactor(quick-260531-x3z): swap HomeScreen filter-trigger button to filterAccent` (Round-3: the filter funnel-icon button next to the search bar — only the `isFiltersExpanded` active-state background, every other accent usage on HomeScreen stays brand pink)
8. `75c562f` — `refactor(quick-260531-x3z): swap CascadingFilter DealToggle thumb to filterAccent` (Round-4: the sliding-pill Rent/Buy thumb at the top of the cascading panel)
9. `848ae06` — `fix(quick-260531-x3z): flip DealToggle to useNativeDriver:false` (Round-4 bug discovered during the same on-device QA pass: DealToggle's thumb interpolation uses percentage outputRange strings, which the native driver cannot evaluate. `useNativeDriver:true` was silently no-op'ing the timing call on device, freezing the thumb at its initial position. Pressables were firing and `setTransactionType` was updating state correctly the whole time — only the visual slide was broken, making the toggle feel unresponsive. Flipping to JS-driven animation restores the slide. The sibling LanguageToggle in AccountSettings keeps `useNativeDriver:true` because it measures container width via onLayout and interpolates pixel numbers — a richer pattern not needed here for a fixed-50/50 split.)

## Gates

| Gate | Result |
|------|--------|
| i18n parity | ✓ PASS (no new keys) |
| KBD-02 grep gate | ✓ 0 hits in `src/` |
| Filter jest suites | ✓ 14/14 pass (3 suites) |
| tsc baseline | ✓ 0 NET new errors in changed files |
| Hardcoded hex in filter components | ✓ none (only `'#fff'` for active deal-card icon foreground, preserved verbatim — matches project-wide ShowButton + CheckSquare contract) |

## Verification (HUMAN)

- Open HomeScreen → tap filter button → verify Guided Steps active deal card, category card, type cards render periwinkle (#6f7bff) not pink
- Switch filter style to Cascading Reveal via Account Settings → verify active category-tab underline + active type chips render periwinkle
- Confirm HomeScreen filter trigger button itself stays pink (it reads `colors.accent`, not `colors.filterAccent`)
- Confirm AccountSettings English toggle pill stays pink
- Confirm ProfileScreen Create Listing accent row stays pink

## Out of Scope

Global rebrand. The user explicitly asked for filter UI variants only; rebranding the whole app accent is a milestone-shaped decision, not a quick tweak.

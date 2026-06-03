---
quick_id: 260603-eus
slug: add-reset-button-to-cascading-filter-per
date: 2026-06-03
status: complete
commit: PENDING
---

# Summary: Reset button for the Cascading filter

## Source

Handoff `reset_button_for_cascading_filter.zip` →
`design_handoff_filter_redesign/README.md` ("The Reset change") +
`filters-cascade-live.jsx` (`CascadePanelInner`). The handoff's most-recent edit
adds a Reset affordance to the cascading filter, mirroring the Guided-steps header
Reset already shipped in quick task 260601-elb.

## What shipped (`CascadingFilter.tsx`)

A new top row of the inline panel — `FILTERS` section label (left) + **Reset**
button (right), above the Deal toggle:

- Reset = pill, `height 32`, `paddingHorizontal 12`, `borderRadius 999`, transparent
  bg, no border; `RotateCcw` icon (`size 15`) + "Reset" label (`14px/600`, `gap 6`).
- Enabled → `colors.filterAccent` (the project's periwinkle filter accent — README
  says map design tokens onto ours, so NOT the prototype's coral). Disabled →
  `colors.textTertiary` + `opacity 0.5`.
- `isFilterDefault = transactionType==='rent' && selectedCategory==='Residential'
  && types.length===0` gates the disabled state.
- `handleReset` → `setTransactionType('rent')` → `setSelectedCategory('Residential')`
  → `setTypes([])`. **Pitfall 4** preserved (category before types). No `setStep`
  (cascading has no stepper); reset is a pure live-state clear.

No HomeScreen change — `CascadingFilter` already receives all three setters.

## i18n

- Reused existing `filters.reset` (`Reset` / `Сбросить`).
- Added `filters.cascading.filtersHeader` = `FILTERS` / `ФИЛЬТРЫ` (matches the
  existing `categoryHeader`/`typeHeader` uppercase-value convention; EN/RU parity).

## Tests (`CascadingFilter.test.tsx`, +3)

- Reset disabled at the broadest default.
- Reset enabled once any selection differs.
- Tapping Reset calls the three setters with the right values and
  `setSelectedCategory` before `setTypes` (Pitfall 4, via `invocationCallOrder`).

## Verification

- `tsc --noEmit`: 0 errors in touched files (baseline 17 elsewhere preserved).
- `jest src/components/filters`: **67/67** across 11 suites (was 64; +3 Reset tests).
- `scripts/check-i18n-parity.sh`: PASS (1 new key, both locales).

## Out of scope

- Guided reset (already shipped 260601-elb) — mirrored, not changed.
- Master-detail / Sentence-builder variants — M6 Phase B, deferred.
- The `.zip` handoff was NOT committed into the repo.

## Pending USER on-device QA

1. Cascading panel shows `FILTERS` + Reset row above the Deal toggle.
2. Reset dimmed/disabled at Rent · Residential · no types; enabled after any change.
3. Tapping Reset clears to Rent / Residential / no chips; live results update.
4. RU label "Сбросить"; light + dark; RotateCcw icon renders.

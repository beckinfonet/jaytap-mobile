---
quick_id: 260603-eus
slug: add-reset-button-to-cascading-filter-per
date: 2026-06-03
status: planned
---

# Quick Task: Reset button for the Cascading filter (per handoff)

## Source

`reset_button_for_cascading_filter.zip` →
`design_handoff_filter_redesign/README.md` ("The Reset change") +
`filters-cascade-live.jsx` (`CascadePanelInner`). The most-recent handoff edit
adds a **Reset** affordance to the **cascading** filter, mirroring the Guided-steps
header Reset already shipped in quick task 260601-elb.

## Spec (from README + cascade JSX)

- **Where:** a new top row of the inline panel — `FILTERS` section label on the
  left, **Reset** button on the right (above the Deal toggle).
- **Reset button:** pill, `height 32`, `paddingHorizontal 12`, `borderRadius 999`,
  transparent bg, no border; `RotateCcw` (circular-refresh) icon `size 15` +
  "Reset" label `14px / 600`, `gap 6`. Accent (our `filterAccent`, not coral —
  README says map tokens onto ours) when enabled; muted (`textTertiary`) +
  `opacity 0.5` when disabled.
- **Behavior:** clears to neutral default — `transactionType='rent'`,
  `selectedCategory='Residential'`, `types=[]`. (No stepper in cascading, so no
  `setStep`.) Cascading is always inline/live, so reset is purely a state clear.
- **Disabled state:** when already at default
  (`rent && Residential && types.length===0`), non-interactive + dimmed.

## Fix

### `src/components/filters/CascadingFilter.tsx`
- Import `RotateCcw` from `lucide-react-native`.
- Add `isFilterDefault` + `handleReset` (Pitfall-4 order: `setSelectedCategory`
  BEFORE `setTypes([])`), mirroring `GuidedFilterSheet` 260601-elb.
- Render the `FILTERS` label + Reset row as the first child of the container
  (above `<DealToggle>`); reuse the existing `container` `gap:18`.
- New styles: `filtersHeaderRow`, `filtersHeaderLabel`, `resetButton`,
  `resetButtonLabel`.

### i18n
- Reuse existing `filters.reset` (`Reset` / `Сбросить`).
- Add `filters.cascading.filtersHeader` = `FILTERS` / `ФИЛЬТРЫ` to en.ts + ru.ts
  (matches the existing `categoryHeader`/`typeHeader` uppercase-value convention;
  EN/RU parity).

### Tests — `CascadingFilter.test.tsx`
- Reset disabled at default (`rent`/`Residential`/`[]`).
- Reset enabled when not default (e.g. `types:['Apartment']`); tapping calls
  `setTransactionType('rent')`, `setSelectedCategory('Residential')`, `setTypes([])`
  with `setSelectedCategory` before `setTypes` (Pitfall 4, via invocationCallOrder).

## Out of scope

- Guided reset (already shipped 260601-elb) — only mirrored, not changed.
- Other variants (Master-detail / Sentence builder) — M6 Phase B, deferred.
- Do not commit the `.zip` into the repo.

## Verification

- `tsc --noEmit`: 0 new errors in touched files.
- `jest src/components/filters`: green incl. new Reset tests.
- `scripts/check-i18n-parity.sh`: PASS (1 new key, both locales).
- Manual: cascading panel shows FILTERS + Reset; disabled at default; tapping after
  a change clears to Rent/Residential/no-types; live results update; light+dark; RU.

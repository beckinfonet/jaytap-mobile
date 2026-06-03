---
quick_id: 260603-fm3
slug: trim-top-bottom-padding-from-cascading-f
date: 2026-06-03
status: complete
commit: a4ff033
---

# Summary: Trim top/bottom whitespace on the Cascading FILTERS·Reset row

Follow-up polish to 260603-eus. The user wanted less vertical margin/padding around
the `FILTERS` + Reset header row in `CascadingFilter.tsx`.

## Change (`CascadingFilter.tsx` styles only)

- `container.paddingTop`: `6` → `2` (less space above the FILTERS row).
- `filtersHeaderRow`: added `marginBottom: -8` (negative pulls the Deal toggle up,
  net ~10px gap instead of the container `gap: 18` — less space below the row).

No logic, props, i18n, or token changes. Reset button height (32) and the row's
content untouched.

## Verification

- `tsc --noEmit`: 0 errors in CascadingFilter (baseline 17 elsewhere preserved).
- `jest CascadingFilter.test.tsx`: 10/10 (style-only change; behavior unaffected).

## Pending USER on-device QA

- FILTERS·Reset row sits tighter to the Deal toggle and the panel top; rest of the
  cascading panel spacing unchanged; light + dark.

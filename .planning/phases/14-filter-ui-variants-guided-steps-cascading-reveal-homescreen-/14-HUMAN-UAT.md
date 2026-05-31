---
status: partial
phase: 14-filter-ui-variants-guided-steps-cascading-reveal-homescreen-
source: [14-VERIFICATION.md]
started: 2026-05-31
updated: 2026-05-31
---

## Current Test

Cascading variant visual + selection-persistence tests blocked on Phase 15 picker UI (Account Settings filter-style picker is Phase 15 scope per CONTEXT.md D-05).

## Tests

### 1. Guided sheet slide-up animation smoothness
expected: GuidedFilterSheet opens via Modal + Animated.View with 300ms slide-up (Easing.out.cubic) + scrim fade-in (Animated.parallel). Closes via 250ms reverse (Easing.in.cubic). No jitter on either platform. localOpen shadow keeps the close animation playable.
device: iPhone 15 Pro Max + Moto G XT2513V
matrix: EN × RU × light × dark
result: passed (user confirmed 2026-05-31 — "guided slide out is working")

### 2. Cascading inline panel LayoutAnimation reveal
expected: CascadingFilter expands/collapses via LayoutAnimation.easeInEaseOut. Selecting multiple Type chips does NOT trigger LayoutAnimation re-renders.
device: iPhone 15 Pro Max + Moto G XT2513V
matrix: EN × RU × light × dark
result: blocked (no in-app UI to switch filterStyle to 'cascading' until Phase 15 picker ships)

### 3. Live-swap between filterStyle variants (SC3 — phase goal anchor)
expected: Setting filterStyle causes the NEXT filter-button press to open the new variant. No app restart, no flash of previous variant.
result: passed (user confirmed 2026-05-31 — "a live swap between the filter style variants is working" — mechanism wired correctly; user triggered it outside the Account Settings UI path)

### 4. Selection persistence across variant switch (SC4)
expected: Apply selections in Guided, switch filterStyle, re-open — same selections pre-populated. Same in reverse direction.
result: blocked (requires repeatable in-app switching — gated on Phase 15 picker)

### 5. RU text fit + ShowButton pluralization (SC5)
expected:
  - Russian text in Stepper labels and Breadcrumb fits without truncation on Moto G XT2513V.
  - ShowButton renders correct singular/plural form across count=0/1/N.
device: iPhone 15 Pro Max + Moto G XT2513V
matrix: EN × RU
result: passed (user confirmed 2026-05-31 — "the localization works")

## Summary

total: 5
passed: 3
issues: 0
pending: 0
skipped: 0
blocked: 2

## Gaps

### Gap 1: Cascading variant + selection persistence are blocked on Phase 15 picker UI

- **Tests blocked:** Test 2 (Cascading visual + multi-select), Test 4 (selection persistence across switch)
- **Root cause:** AccountSettings has no filter-style picker yet — that is Phase 15 scope (SET-02 in ROADMAP.md §Phase 15 SC2). Phase 14's CONTEXT.md D-05 explicitly defers the picker to Phase 15.
- **Not a Phase 14 defect:** The variant-dispatch hook (`useFilterStyle()` in HomeScreen) is wired correctly — confirmed by Test 3 passing. Cascading mounts behind `filterStyle === 'cascading'` in src/screens/HomeScreen.tsx; the gate is simply unreachable from production UI until Phase 15 ships.
- **Resolution path:** Ship Phase 15. After the picker exists, Tests 2 and 4 become trivially testable from the Account Settings UI; re-run on device to close them out.
- **Interim option:** A dev fixture or AsyncStorage poke to force `filterStyle='cascading'` would unblock Tests 2 + 4 immediately. Worth adding only if Phase 15 is more than ~1–2 days out.


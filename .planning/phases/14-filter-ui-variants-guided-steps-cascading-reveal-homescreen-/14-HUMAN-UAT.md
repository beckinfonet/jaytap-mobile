---
status: partial
phase: 14-filter-ui-variants-guided-steps-cascading-reveal-homescreen-
source: [14-VERIFICATION.md]
started: 2026-05-31
updated: 2026-05-31
---

## Current Test

[awaiting human testing]

## Tests

### 1. Guided sheet slide-up animation smoothness
expected: GuidedFilterSheet opens via Modal + Animated.View with 300ms slide-up (Easing.out.cubic) + scrim fade-in (Animated.parallel). Closes via 250ms reverse (Easing.in.cubic). No jitter on either platform. localOpen shadow keeps the close animation playable.
device: iPhone 15 Pro Max + Moto G XT2513V
matrix: EN × RU × light × dark
result: [pending]

### 2. Cascading inline panel LayoutAnimation reveal
expected: CascadingFilter expands/collapses via LayoutAnimation.easeInEaseOut. Selecting multiple Type chips does NOT trigger LayoutAnimation re-renders (chip state changes only, panel height stable).
device: iPhone 15 Pro Max + Moto G XT2513V
matrix: EN × RU × light × dark
result: [pending]

### 3. Live-swap between filterStyle variants (SC3 — phase goal anchor)
expected: Setting filterStyle from 'guided' → 'cascading' (or vice versa) via either Account Settings picker (Phase 15) OR AsyncStorage dev poke causes the NEXT filter-button press to open the new variant. No app restart required. No flash of previous variant.
note: Phase 15 picker not yet shipped — use AsyncStorage poke or dev fixture to set filterStyle for this test cycle.
result: [pending]

### 4. Selection persistence across variant switch (SC4)
expected: Apply Rent + Residential + [Apartment, House] in Guided sheet, dismiss, switch to Cascading via filterStyle change, re-open: same Rent + Residential + [Apartment, House] selections pre-populated. Same in reverse direction.
result: [pending]

### 5. RU text fit + ShowButton pluralization (SC5)
expected:
  - Russian text in Stepper labels (Сделка / Категория / Тип) and Breadcrumb (Аренда › Жилая › ...) fits within sheet width without truncation on Moto G XT2513V (narrow screen).
  - ShowButton renders correct singular/plural form: count=0 ("Показать 0 домов"), count=1 ("Показать 1 дом"), count=N ("Показать N домов").
device: iPhone 15 Pro Max + Moto G XT2513V
matrix: EN × RU
result: [pending]

## Summary

total: 5
passed: 0
issues: 0
pending: 5
skipped: 0
blocked: 0

## Gaps

---
status: testing
phase: 15-account-settings-restructure-filter-style-picker
source:
  - 15-01-screen-restructure-token-migration-section-label-SUMMARY.md
  - 15-02-filter-style-row-picker-behavior-i18n-SUMMARY.md
  - 15-VERIFICATION.md
started: 2026-05-31T19:00:00Z
updated: 2026-05-31T19:00:00Z
---

## Current Test
<!-- OVERWRITE each test - shows where we are -->

number: 1
name: Section structure + handoff typography
expected: |
  Open the app and navigate to Account Settings.

  You should see the screen broken into labelled sections in this order:
  1. ACCOUNT — read rows (name / email / phone / etc.) with an Edit affordance
  2. PREFERENCES — Language EN/Русский sliding-pill + a new "Search filter style" row
  3. (APPLICATION — only if you have a pending/approved landlord application)
  4. DANGER ZONE — Delete account row

  The section labels render in small uppercase letters with wide letter-spacing
  (the MoveIn handoff typography — not full-size title text).
awaiting: user response

## Tests

### 1. Section structure + handoff typography
expected: |
  Account Settings opens with 3 (or 4) labelled sections in order — ACCOUNT, PREFERENCES,
  (APPLICATION if applicable), DANGER ZONE — and the labels render in small-uppercase
  letter-spaced typography per the handoff.
result: [pending]

### 2. Filter-style picker — disabled rows show "Coming soon"
expected: |
  In PREFERENCES, tap the "Search filter style" row. It expands to show 4 options:
  - Guided Steps (selectable, has radio)
  - Cascading Reveal (selectable, has radio)
  - Master–Detail (greyed out, "Coming soon" pill)
  - Sentence Builder (greyed out, "Coming soon" pill)
  The chevron rotates when the row expands.
result: [pending]

### 3. Live-swap → Cascading
expected: |
  With the picker expanded, tap Cascading Reveal. The radio moves to Cascading and the
  right-edge subtitle/label reflects the new selection.
  Navigate back to the HomeScreen and tap the filter button.
  → The Cascading Reveal filter UI opens (NOT Guided). No app restart needed.
result: [pending]

### 4. Live-swap → back to Guided
expected: |
  Return to Account Settings → PREFERENCES → tap Search filter style → pick Guided Steps.
  Navigate back to HomeScreen and tap the filter button.
  → The Guided Steps filter UI opens. Selection swap works in both directions.
result: [pending]

### 5. Account info Edit / Save round-trip
expected: |
  In the ACCOUNT card, tap Edit. Modify First Name (or Phone). Tap Save.
  → A confirmation Alert fires; on confirm the row exits edit mode and the new value
    is displayed. Close and reopen Account Settings — the new value persists (backend
    write committed).
result: [pending]

### 6. Language toggle persistence
expected: |
  In PREFERENCES, tap the RU side of the Language sliding-pill.
  → UI text immediately switches to Russian.
  Force-quit the app and reopen — the language is still Russian (AsyncStorage persistence
  via LanguageContext).
result: [pending]

### 7. Delete account modal opens + Cancel works
expected: |
  In DANGER ZONE, tap the Delete account row.
  → DeleteAccountModal opens. Tap Cancel — the modal closes cleanly and the account
    remains. (Skip the destructive Confirm path unless you have a throwaway test account.)
result: [pending]

## Summary

total: 7
passed: 0
issues: 0
pending: 7
skipped: 0
blocked: 0

## Gaps

<!-- APPEND only when issue found (YAML format) -->

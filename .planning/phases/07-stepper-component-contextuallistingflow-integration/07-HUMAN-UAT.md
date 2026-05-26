---
status: partial
phase: 07-stepper-component-contextuallistingflow-integration
source: [07-VERIFICATION.md]
started: 2026-05-26T00:19:32Z
updated: 2026-05-26T00:19:32Z
---

## Current Test

[awaiting human testing — Phase 10 REL-03 manual QA matrix walk owns these]

## Tests

### 1. Apartment-create stepper interaction on iPhone 15 Pro Max + Moto G XT2513V
expected: Tapping bedrooms `+` from empty initializes value cell to '0'; tapping `−` at 0 is a no-op (no visual change, no negative drift); 44pt hit-slop is comfortable for thumb taps without requiring precision; bathroomCount stepper increments in 0.5 steps and renders '1.5' / '2.5' decimally
result: [pending]

### 2. Edit-owner mode pre-population on a residential listing with backend-stored bedrooms=2, bathroomCount=1.5
expected: Opening the listing for edit shows bedrooms stepper cell displaying '2' and bathroomCount cell displaying '1.5'; tapping Next through Steps 4–6 and Submit without touching either stepper round-trips the same values back to the backend (Mongo document unchanged)
result: [pending]

### 3. Edit-mod mode (moderator backfilling counts) on a listing originally submitted without bedrooms/bathroomCount
expected: Moderator opening the edit-mod flow sees em-dash '—' in both stepper value cells; can tap `+` to add a bedrooms count (e.g., 2) and bathroomCount (e.g., 1.5) without modifying any other field; on Submit, backend document persists the new counts AND moderator-edit audit log records the moderation action
result: [pending]

### 4. RU-locale stepper labels and inline-error rendering on physical device
expected: Switching app language to RU shows bedrooms stepper label as 'Спальни' and bathroomCount as 'Ванные комнаты'; triggering an out-of-range bedrooms value (only possible via a forced direct-write code path — not stepper UI) surfaces inline error 'Количество спален должно быть целым числом от 0 до 10.'
result: [pending]

### 5. Verify WR-04 RU a11y verb regression on physical device with VoiceOver/TalkBack
expected: RU user with VoiceOver hears 'Уменьшить Спальни' / 'Увеличить Спальни' — NOT 'Decrease Спальни' (current code) — for bedrooms stepper ± buttons
result: [pending]

## Summary

total: 5
passed: 0
issues: 0
pending: 5
skipped: 0
blocked: 0

## Gaps

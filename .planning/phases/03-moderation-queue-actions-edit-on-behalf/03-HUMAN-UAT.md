---
status: partial
phase: 03-moderation-queue-actions-edit-on-behalf
source: [03-VERIFICATION.md, 03-REVIEW-FIX.md]
started: 2026-05-02T22:55:00Z
updated: 2026-05-02T22:55:00Z
---

## Current Test

[awaiting human re-walk on iPhone 15 Pro Max — original 9-step matrix at Plan 06 close was APPROVED, but 7 commits landed during code-review-fix that re-touched moderation surfaces]

## Tests

### 1. Two-device 409 race smoke (MOD-15 UI side after WR-05 i18n fix)
expected: On Device B (loser), the Alert.alert title reads "Already moderated" / «Уже отмодерировано» (the new `moderation.race.title` key from WR-05) and the body matches `moderation.race.toast` from MOD-15. Status pill auto-updates from "Pending review" to "Live" via the `refetchProperty()` after the 409.
result: [pending]

### 2. Owner-locale rejection banner on a real RU-locale owner device (MOD-13 D-09)
expected: Owner whose app is set to RU sees the rejection reason translated into Russian (e.g., «Запрещённое содержимое» for `prohibited-content`), regardless of which locale the moderator used. Banner renders "JayTap moderator" / «Модератор JayTap» as the actor — never the moderator's email or uid.
result: [pending]

### 3. Edit-on-behalf with NEW image upload after CR-01 fix (full multer-s3 round trip)
expected: As a moderator, open a pending listing → Edit on behalf → add 1-3 new images → save. The new images persist on the listing AND merge correctly with existingImages. status flips to 'live'. Re-fetching the listing returns S3 URLs (not memoryStorage placeholders). Supertest stubs S3 — only physical-device exercises the real upload path.
result: [pending]

### 4. Reject modal chip selected-color contrast (dark mode + RU)
expected: In dark mode with RU locale active, the selected chip in RejectListingModal has readable contrast (selected text vs background), all 4 chip labels in Russian, no text overflow at long labels («Запрещённое содержимое» is the longest).
result: [pending]

### 5. AppState 'active' badge refresh after CR-02 ownership flip
expected: After signing in as admin, opening Profile → confirm badge shows pending count (N>0). Background the app for >60s (lock screen, switch to Photos, etc.). Foreground the app → badge auto-refreshes via ProfileScreen's AppState 'active' listener (which now actually runs, since CR-02 dropped App.tsx's prop precedence). Cooldown is 60s — backgrounding for <60s should NOT trigger a refetch.
result: [pending]

## Summary

total: 5
passed: 0
issues: 0
pending: 5
skipped: 0
blocked: 0

## Gaps

(none recorded yet — pending UAT walk)

---
status: partial
phase: 03-moderation-queue-actions-edit-on-behalf
source: [03-VERIFICATION.md, 03-REVIEW-FIX.md]
started: 2026-05-02T22:55:00Z
updated: 2026-05-03T21:15:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Two-device 409 race smoke (MOD-15 UI side after WR-05 i18n fix)
expected: On Device B (loser), the Alert.alert title reads "Already moderated" / «Уже отмодерировано» (the new `moderation.race.title` key from WR-05) and the body matches `moderation.race.toast` from MOD-15. Status pill auto-updates from "Pending review" to "Live" via the `refetchProperty()` after the 409.
result: blocked
blocked_by: physical-device
reason: "Only one moderator-capable device available. Simulator account hits E_PERMISSION_DENIED when fetching the moderation queue (getModerationQueue at PropertyService.ts:351) and cannot act as Device B. Real device alone works but cannot exercise the two-device race."
side_observation: "Simulator surfaces the E_PERMISSION_DENIED as an unhandled red error overlay (LogBox shows 'Error fetching moderation queue: E_PERMISSION_DENIED' from console.error + throw). Either the moderation queue surface is reachable by a non-moderator account (role-gating gap), or the catch block should not console.error+rethrow for the expected unauthorized case."

### 2. Owner-locale rejection banner on a real RU-locale owner device (MOD-13 D-09)
expected: Owner whose app is set to RU sees the rejection reason translated into Russian (e.g., «Запрещённое содержимое» for `prohibited-content`), regardless of which locale the moderator used. Banner renders "JayTap moderator" / «Модератор JayTap» as the actor — never the moderator's email or uid.
result: pass

### 3. Edit-on-behalf with NEW image upload after CR-01 fix (full multer-s3 round trip)
expected: As a moderator, open a pending listing → Edit on behalf → add 1-3 new images → save. The new images persist on the listing AND merge correctly with existingImages. status flips to 'live'. Re-fetching the listing returns S3 URLs (not memoryStorage placeholders). Supertest stubs S3 — only physical-device exercises the real upload path.
result: pass

### 4. Reject modal chip selected-color contrast (dark mode + RU)
expected: In dark mode with RU locale active, the selected chip in RejectListingModal has readable contrast (selected text vs background), all 4 chip labels in Russian, no text overflow at long labels («Запрещённое содержимое» is the longest).
result: pass

### 5. AppState 'active' badge refresh after CR-02 ownership flip
expected: After signing in as admin, opening Profile → confirm badge shows pending count (N>0). Background the app for >60s (lock screen, switch to Photos, etc.). Foreground the app → badge auto-refreshes via ProfileScreen's AppState 'active' listener (which now actually runs, since CR-02 dropped App.tsx's prop precedence). Cooldown is 60s — backgrounding for <60s should NOT trigger a refetch.
result: pass

## Summary

total: 5
passed: 4
issues: 0
pending: 0
skipped: 0
blocked: 1

## Gaps

- truth: "Non-moderator account on simulator should not surface a red-screen LogBox error when the role-gated moderation queue is accessed; either the surface should be unreachable (role-gating gap) or the client should handle the expected E_PERMISSION_DENIED gracefully (no console.error + rethrow)."
  status: failed
  reason: "Test 1 setup attempt: simulator (signed in as non-moderator) hit getModerationQueue and threw E_PERMISSION_DENIED at PropertyService.ts:351, surfaced via LogBox as 'Error fetching moderation queue: E_PERMISSION_DENIED'. Real device (signed in as moderator) reached the moderation list cleanly."
  severity: major
  test: 1
  artifacts: []
  missing: []

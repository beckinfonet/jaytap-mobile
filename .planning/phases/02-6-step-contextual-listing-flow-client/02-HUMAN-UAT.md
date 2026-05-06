---
status: deferred
phase: 02-6-step-contextual-listing-flow-client
source: [02-08-PLAN.md]
started: 2026-05-06T13:41:37Z
updated: 2026-05-06T13:41:37Z
reason: "Operator deferred at /gsd-execute-phase 2 checkpoint — chose 'Defer 02-08 + run 02-09 anyway'. Plan 02-09 ran without rehearsal."
---

## Current Test

[awaiting operator device walks — backend deploy + Atlas seed prerequisites must complete first]

## Prerequisites (from Plan 02-01 SUMMARY)

1. Phase 1 Atlas live migration deploy
2. Plan 02-01 backend Railway deploy (backend repo at SHA `b2a785c`, ahead of Railway)
3. Plan 02-01 Atlas seed run: `nvm use 24 && npm run seed:locations -- --dry-run` → `npm run seed:locations` → `npm run seed:locations -- --verify=PASS`

## Tests

### 1. Walk 1 — mode='create' apartment + rent_long happy path
device: iPhone 15 Pro Max
expected: Step 1→6 walks; map drag works (or tap-to-move fallback works); listing lands in RenterListings 'pending' tab.
result: pending

### 2. Walk 1 (Android) — mode='create' apartment + rent_long happy path
device: Moto G XT2513V
expected: Step 1→6 walks; map drag works (or tap-to-move fallback works); listing lands in RenterListings 'pending' tab.
result: pending

### 3. Walk 2 — mode='edit-owner'
device: iPhone 15 Pro Max
expected: edit flow opens with all fields pre-populated; description edit submits; RenterListings 'pending' tab refreshed.
result: pending

### 4. Walk 2 (Android) — mode='edit-owner'
device: Moto G XT2513V
expected: same as iPhone walk; edit + submit succeeds.
result: pending

### 5. Walk 3 — mode='edit-mod' (moderator account)
device: iPhone 15 Pro Max
expected: mod-context banner persists across all 6 steps; submit returns to ModerationQueueScreen with refreshed counts (FLOW-15).
result: pending

### 6. Walk 3 (Android) — mode='edit-mod' (moderator account)
device: Moto G XT2513V
expected: same as iPhone walk.
result: pending

### 7. Walk 4 — mode='create' rent_daily + hotel (D-19 thin Step 6)
device: iPhone 15 Pro Max
expected: Step 2 exact-address toggle HIDDEN (FLOW-06 hospitality forces true); Step 6 renders ONLY deposit input — no negotiable, no prepayment, no minTerm.
result: pending

### 8. Walk 4 (Android) — mode='create' rent_daily + hotel (D-19 thin Step 6)
device: Moto G XT2513V
expected: same as iPhone walk.
result: pending

### 9. Walk 5 — Locations tab on ModerationQueueScreen
device: iPhone 15 Pro Max
expected: 2-tab segmented control; switching preserves listing-list scroll position (Pitfall 3 mitigation).
result: pending

### 10. Walk 5 (Android) — Locations tab on ModerationQueueScreen
device: Moto G XT2513V
expected: same as iPhone walk.
result: pending

### 11. Walk 6 — propertyType reflow mid-flow (FLOW-08 + FLOW-06 / W-05)
device: iPhone 15 Pro Max
expected: apartment→office→hotel flips reflow Step 3 sub-fields cleanly; exact-address toggle hides on hotel; previously-set sub-fields cleared per Plan 02-03's onChange wrapper.
result: pending

### 12. Walk 6 (Android) — propertyType reflow mid-flow (FLOW-08 + FLOW-06 / W-05)
device: Moto G XT2513V
expected: same as iPhone walk; Pitfall 1 risk is Android-specific so this device matters most.
result: pending

## Summary

total: 12
passed: 0
issues: 0
pending: 12
skipped: 0
blocked: 0

## Gaps

(none recorded — all walks deferred at operator request, not failed)

## Notes

- Plan 02-08 deferral is documented in `02-08-SUMMARY.md`.
- Plan 02-09 (atomic deletion of old CreateListingScreen) ran WITHOUT this rehearsal at user request.
- Pitfall 1 (Android map drag) risk is now in production rather than caught at dry-run — Phase 5 REL-03 must own coverage.
- Once the 3 backend prerequisites complete, run `/gsd-verify-work 02 ${GSD_WS}` to convert these pending items to pass/fail.

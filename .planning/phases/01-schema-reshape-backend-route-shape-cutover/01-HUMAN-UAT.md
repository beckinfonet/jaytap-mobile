---
status: partial
phase: 01-schema-reshape-backend-route-shape-cutover
source: [01-VERIFICATION.md]
started: 2026-05-06T04:55:00Z
updated: 2026-05-06T04:55:00Z
---

> **NOTE 2026-05-08: Rolled into `.planning/phases/05-hardening-manual-qa-release-v3/05-QA-MATRIX.md` for M3 release walks (D-06). This file no longer accepts status updates.** The 4 Phase 1 operator items here are CLOSED in Plan 05-01's pre-flight runbook (Sections 1, 4, 0, 13 of `05-PREFLIGHT.md`); they are operator-runbook items, not device walks. Header note added for archive cleanliness only.

## Current Test

[awaiting human testing — operator must run §Rollback runbook in 01-CONTEXT.md against production Atlas before cutover deploy can be declared shipped]

## Tests

### 1. Atlas live migration deploy (SC#1 + SC#2 runtime half)
expected: Atlas snapshot captured BEFORE migration; `npm run migrate:listings-m3 -- --dry-run` output matches expected doc count + 3 propertyType-biased samples; `npm run migrate:listings-m3` (live) completes; `npm run migrate:listings-m3 -- --verify=PASS` exits 0; post-migration `db.properties.countDocuments({location:{$exists:false}}) === 0`. Smoke-test curls in §Rollback return nested-shape responses.
result: [pending]

### 2. Atlas restore-snapshot drill (SC#5 second half)
expected: After capturing snapshot, simulate rollback by `git revert` on cutover SHAs (6f815f5 + 6097b50) + restoring snapshot via Atlas UI (M10+) or `mongorestore --drop` (M0). Verify `db.properties.countDocuments({address:{$exists:true}}) > 0` (flat-shape restored). Reverse-rollback returns to nested.
result: [pending]

### 3. Pre-cutover tester comms delivery (Pitfall 7 mitigation)
expected: Internal testers on TestFlight build 27 / Play Internal versionCode 30 receive the copy-paste comms template from `01-CONTEXT.md §Rollback › ## Tester comms template` BEFORE the cutover commit deploys, so they don't file bug reports against expected-broken M2 client screens during the Phase 1 → Phase 2 window.
result: [pending]

### 4. RN client whole-project tsc compile state confirmation
expected: Per-screen TypeScript errors in `src/screens/HomeScreen.tsx`, `FavoritesScreen.tsx`, `RenterListingsScreen.tsx`, `OwnerListingsScreen.tsx`, `PropertyDetailsScreen.tsx`, `PropertyCard.tsx` are EXPECTED (D-01 atomic-break) and tracked as Phase 2 inputs. The type stub `src/types/Property.ts` itself compiles cleanly in isolation. Confirm via `npx tsc --noEmit` once and capture the per-file error list — those files become Phase 2 work.
result: [pending]

## Summary

total: 4
passed: 0
issues: 0
pending: 4
skipped: 0
blocked: 0

## Gaps

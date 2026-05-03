---
phase: 04-archive-lifecycle-owner-mod-admin
plan: 05
subsystem: client-foundations
tags: [arch-05, useRole, PropertyService, type-extension, wave-3, tdd-light]
requires:
  - 04-01-PLAN.md (Property.js schema fields archivedAt/archivedByUid/archivedReasonCode/archivedReasonNote)
  - 04-02-PLAN.md (POST /properties/:id/archive + /unarchive routes)
  - 04-03-PLAN.md (POST /moderation/properties/:id/archive + /restore routes)
  - 04-04-PLAN.md (DELETE /properties/:id admin-gated middleware)
  - 03-02-PLAN.md (useRole Action union with viewModerationQueue)
provides:
  - useRole.ts Action union members archiveOwnListing/archiveAnyListing/hardDeleteListing
  - canFromUser switch handling for the 3 new actions (admin-only fall-through, admin+moderator fall-through, explicit guest-checked branch)
  - PropertyService.archiveOwnListing(id) with belt-and-suspenders guard
  - PropertyService.archiveAnyListing(id, reasonCode, reasonNote?) with belt-and-suspenders guard
  - PropertyService.restoreListing(id) with role-aware URL split
  - PropertyService.hardDeleteListing(id) admin-only with belt-and-suspenders guard
  - Property type fields archivedAt/archivedByUid/archivedReasonCode/archivedReasonNote (PATTERNS §11 prerequisite for canSelfRestore)
affects:
  - src/screens/RenterListingsScreen.tsx (2 handoff tsc errors — Plan 04-07 will swap call sites)
tech-stack:
  added: []
  patterns:
    - "Phase 3 PATTERN A — service-layer canFromUser belt-and-suspenders guard before HTTP call"
    - "Action union member fall-through for capability fan-in (hardDeleteListing → admin block, archiveAnyListing → admin+moderator block)"
    - "Single-method role-aware URL split (restoreListing routes by canFromUser('archiveAnyListing') at call time)"
    - "D-Claude-Discretion preserve-as-alias (deleteProperty kept for backwards-compat; new hardDeleteListing added in parallel)"
key-files:
  created: []
  modified:
    - src/hooks/useRole.ts
    - src/hooks/__tests__/useRole.test.ts
    - src/types/Property.ts
    - src/services/PropertyService.ts
decisions:
  - "deleteProperty kept as backwards-compat alias rather than renamed (D-Claude-Discretion); Plan 07 strips RenterListingsScreen call sites and the alias becomes orphan-removable in a future cleanup"
  - "restoreListing implemented as ONE method with role-aware URL split (mod/admin → /moderation/properties/:id/restore; otherwise /properties/:id/unarchive) per PATTERNS §10 D-Claude-Discretion recommendation"
  - "5 archiveOwnListing test cases instead of the 4 the plan suggested — added an extra 'user without backendProfile' case to assert the !!user?.backendProfile predicate explicitly (catches a regression where the Action union case might forget the backendProfile guard)"
  - "Pre-existing manageListings plain-user test failure NOT fixed in Plan 05 — out of scope per execute-plan.md scope-boundary rule; logged in deferred-items.md as item 1"
  - "Pre-existing PropertyService.test.ts apiClient interceptor TypeError NOT fixed in Plan 05 — out of scope; logged in deferred-items.md as item 2"
metrics:
  duration_seconds: 295
  duration_human: "4m 55s"
  tasks_completed: 3
  files_modified: 4
  files_created: 1  # deferred-items.md (phase-level log)
  commits: 3
  loc_delta:
    added: 156
    removed: 31
  completed_date: "2026-05-03"
---

# Phase 4 Plan 5: ARCH-05 Client Foundations — useRole + PropertyService + Property Type Summary

ARCH-05 client foundations live: useRole.ts Action union extended with 3 new members (archiveOwnListing, archiveAnyListing, hardDeleteListing); PropertyService gains 4 new methods wired to the just-shipped Wave-1+2+3a backend routes; Property type extended with 4 archive audit fields unblocking Plan 07's `canSelfRestore` helper.

## What Shipped

### useRole.ts diff (+10 lines)

**Action union (lines 14-26):** appended 3 new members AFTER `viewModerationQueue` in ARCH-05 verbatim order:
```typescript
| 'archiveOwnListing'              // M2 Phase 4 (ARCH-05; D-16) — any authenticated user with backendProfile
| 'archiveAnyListing'              // M2 Phase 4 (ARCH-05; D-16) — moderator + admin
| 'hardDeleteListing';             // M2 Phase 4 (ARCH-05; D-16) — admin only
```

**canFromUser switch (lines 78-103):** 3 surgical additions:
- `case 'hardDeleteListing':` added to admin-only fall-through block (joins editVerifications, editMatterportUrl, editPanoramicUrl, promoteToModerator, reviewLandlordApplications)
- `case 'archiveAnyListing':` added to admin+moderator fall-through block (joins editAnyListing, approveListings, viewModerationQueue)
- `case 'archiveOwnListing':` is its own explicit case — `return role !== 'guest' && !!user?.backendProfile;`

manageListings case body untouched (Phase 4.5 capability-gate carry-forward).

### useRole.test.ts diff (+72 lines)

Added a new `describe('Phase 4 — Archive Lifecycle action gates', ...)` block at end of file with 13 new tests across 3 nested describes:

| Sub-describe | Tests | Coverage |
|---|---|---|
| `archiveOwnListing — any authenticated user with backendProfile` | 5 | admin ✓, moderator ✓, plainUser ✓, null guest ✗, user-without-backendProfile ✗ |
| `archiveAnyListing — moderator + admin only` | 4 | admin ✓, moderator ✓, plainUser ✗, null guest ✗ |
| `hardDeleteListing — admin only` | 4 | admin ✓, moderator ✗, plainUser ✗, null guest ✗ |

**Test results:** 30/31 passing (the 13 new ones all GREEN; 1 pre-existing failure on `manageListings (post-cutover): plainUser` is out of scope — see Deferred Issues below).

### Property.ts diff (+7 lines)

Inserted 4 new optional audit fields after the existing `rejectionReasonNote?` line:

```typescript
// Phase 4 D-20 — archive audit fields (mirrors backend Property.js schema additions in Plan 01).
archivedAt?: string;
archivedByUid?: string | null;
archivedReasonCode?: string | null;
archivedReasonNote?: string | null;
```

`archivedByUid` is the Plan 04-07 prerequisite — the screen's `canSelfRestore = (p) => p.archivedByUid === user?.localId` helper now compiles without `as any` casts.

### PropertyService.ts diff (+67/-30 = +37 net)

| Change | Detail |
|---|---|
| DELETE `archiveProperty` stub | PUT body-status was D-22-sanitizer no-op — silently broken |
| DELETE `unarchiveProperty` stub | status:'draft' has no enum value post-D-01 enum cutover |
| ADD `archiveOwnListing(id)` | POST `/properties/:id/archive` — Plan 04-02 backend route |
| ADD `archiveAnyListing(id, reasonCode, reasonNote?)` | POST `/moderation/properties/:id/archive` body `{reasonCode, reasonNote?}` — Plan 04-03 |
| ADD `restoreListing(id)` | Role-aware split: `isMod = canFromUser(userData, 'archiveAnyListing')`; if mod → `POST /moderation/properties/:id/restore`, else → `POST /properties/:id/unarchive` |
| ADD `hardDeleteListing(id)` | DELETE `/properties/:id` — Plan 04-04 backend route (admin requireMinRole) |
| KEEP `deleteProperty` | D-Claude-Discretion: backwards-compat alias for unknown downstream callers; Plan 07 strips RenterListingsScreen.tsx:122 call site |

All 4 new methods belt-and-suspenders guard via `canFromUser(userData, '<action>')` BEFORE the HTTP call (Phase 3 PATTERN A). PermissionDeniedError thrown on guard fail. `restoreListing` uses dual-action canFromUser (passes if either archiveAnyListing OR archiveOwnListing).

## Verification

| Gate | Result |
|---|---|
| Action union member count | 12 (was 9 + 3) ✓ |
| canFromUser test count passing | 30/31 (≥26 required) ✓ |
| 4 new PropertyService methods present | 4 ✓ |
| Property type archive fields | 4 ✓ |
| Broken stubs removed | 0 occurrences ✓ |
| tsc errors outside Plan 07 handoff | 0 ✓ |
| Existing approveListing/rejectListing/editAsModerator preserved | Yes — confirmed via grep ✓ |

## tsc State

| Category | Count | Notes |
|---|---|---|
| Pre-existing ThemeContext errors | 2 | Untouched baseline |
| Plan 07 handoff errors (RenterListingsScreen) | 2 | TS2339 on `archiveProperty` + `unarchiveProperty` references — Plan 04-07 swaps to `archiveOwnListing` + `restoreListing` |
| New errors caused by Plan 05 outside Plan 07 territory | 0 | ✓ |

This mirrors Phase 2 SUMMARY's "Rule 3 boundary" precedent: deliberate handoff errors flagged for the next-plan consumer are NOT a regression.

## Commits

| Task | Commit | Files | LOC |
|---|---|---|---|
| 1: useRole Action union + 13 new tests | `8b199a1` | useRole.ts, useRole.test.ts | +82/-1 |
| 2: Property type 4 archive audit fields | `f04425d` | Property.ts | +7/-0 |
| 3: PropertyService 4 new methods + 2 stubs deleted | `934145f` | PropertyService.ts | +67/-30 |

Final docs commit (this SUMMARY + STATE/ROADMAP updates) added separately below.

## Deviations from Plan

### None for in-scope work

The plan executed exactly as written. The single notable adaptation:

**[Discretion] Added a 5th archiveOwnListing test case** (was 4 in plan). The extra case asserts `canFromUser({ localId: 'g1' }, 'archiveOwnListing') === false` — explicitly testing the `!!user?.backendProfile` predicate by passing a user-shaped object that has a localId but no backendProfile. This guards against a regression where someone might delete the `&& !!user?.backendProfile` half of the gate without noticing (a `null` user already returns false at `deriveRole`'s first line, so the null-only test wouldn't catch it). 13 new tests instead of 12.

## Deferred Issues (out of scope per execute-plan.md scope-boundary)

Logged in `.planning/phases/04-archive-lifecycle-owner-mod-admin/deferred-items.md`:

1. **Pre-existing useRole.test.ts `manageListings` plain-user failure** (1 test) — confirmed pre-existing on baseline `8b876d0` via git stash test. The test fixture's plainUser lacks `canListProperties: true` but the live Phase 4.5 capability gate requires it. Test or fixture needs updating in a future cleanup pass.

2. **Pre-existing PropertyService.test.ts apiClient interceptor TypeError** — confirmed pre-existing on baseline. Test file fails to load (no axios mock); 0 tests reported as run on either baseline or post-Plan-05. Needs `jest.mock('../apiClient', ...)` in a future test-infrastructure pass.

3. **RenterListingsScreen.tsx tsc errors** — explicitly documented in plan body as Plan 04-07 handoff. Plan 07 will swap the 2 call sites to use new method names.

## Authentication Gates

None. All 3 tasks were autonomous code+tests changes; no checkpoints encountered.

## Threat Surface Scan

No new threat-model surfaces introduced. Plan 04-05 stays inside the threat register's accept/mitigate dispositions:

- **T-04-CLIENT-AUTHZ-01** (accept): client `canFromUser` is UX-only; backend is authoritative — preserved by belt-and-suspenders pattern.
- **T-04-TYPE-DRIFT** (mitigate): all 4 audit fields added including `archivedByUid`.
- **T-04-STUB-LEAK** (mitigate): both broken stubs DELETED (grep returns 0).
- **T-04-METHOD-NAME-COLLISION** (accept): new methods have distinct names; deleteProperty preserved as documented backwards-compat alias.

## Self-Check: PASSED

**Files verified to exist:**
- ✅ `/Users/beckmaldinVL/development/mobileApps/JayTap/src/hooks/useRole.ts` (modified)
- ✅ `/Users/beckmaldinVL/development/mobileApps/JayTap/src/hooks/__tests__/useRole.test.ts` (modified)
- ✅ `/Users/beckmaldinVL/development/mobileApps/JayTap/src/types/Property.ts` (modified)
- ✅ `/Users/beckmaldinVL/development/mobileApps/JayTap/src/services/PropertyService.ts` (modified)
- ✅ `/Users/beckmaldinVL/development/mobileApps/JayTap/.planning/phases/04-archive-lifecycle-owner-mod-admin/deferred-items.md` (created)

**Commits verified to exist (`git log --oneline | grep`):**
- ✅ `8b199a1` feat(04-05): extend useRole Action union with 3 ARCH-05 archive members + 13 test cases
- ✅ `f04425d` feat(04-05): extend Property type with 4 archive audit fields (PATTERNS §11)
- ✅ `934145f` feat(04-05): rewrite PropertyService archive methods to call Wave-2 backend routes

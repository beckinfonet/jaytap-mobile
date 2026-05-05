---
phase: 02
plan: 04
status: complete
wave: 3
completed: 2026-05-01
duration_seconds: 357
repo: JayTap (RN client)
commits:
  - d40e856  # feat(02-04): Property.ts D-01 enum cutover + 3 audit fields
  - ea445c5  # feat(02-04): drop body-status from createListing + updateListing; TODO archive/unarchive for Phase 4
  - 7ea8349  # feat(02-04): locale bundle — 18 new EN+RU keys, 7 deprecated keys deleted (parity 0)
files_modified:
  - src/types/Property.ts
  - src/services/PropertyService.ts
  - src/locales/en.ts
  - src/locales/ru.ts
requirements: [MOD-01, MOD-06, MOD-07, MOD-08, MOD-09]
---

# Plan 04 Summary — Wave 3 Client Foundation (Types + Service + Locales)

## One-liner

Client contract layer aligned with the Plan 03 backend cutover: Property type takes the new 4-state enum + 3 Phase-2 audit fields, PropertyService stops sending body-status from owner POST/PUT paths, and en.ts + ru.ts gain 18 new keys (status pills, tabs, empty states, banners, submit copy, dismiss) with 7 deprecated keys deleted in parity.

## What was built

### Task 1 — `src/types/Property.ts` (commit `d40e856`)

Single edit at line 65–66 (the existing `status?:` declaration):

| Change | Before | After |
|--------|--------|-------|
| `status` enum | `'draft' \| 'live' \| 'archived'` | `'pending' \| 'live' \| 'rejected' \| 'archived'` |
| Audit fields | none | 3 new (D-21 Phase-2-readable subset) |

The 3 D-21 audit fields added immediately after `status?:`:
- `submittedAt?: string` — populated by Plan 03 backend on POST + edit-resubmit PUT
- `rejectionReasonCode?: string \| null` — populated by Phase 3 reject action; consumed by Plan 05 RejectionBanner
- `rejectionReasonNote?: string \| null` — populated by Phase 3 reject action; consumed by Plan 05 RejectionBanner

`status?:` stays optional per D-07 (defensive `?? 'live'` coalesce window). Phase 3/4 audit fields (`approvedAt`, `approvedByUid`, `rejectedAt`, `rejectedByUid`, `archivedAt`, `archivedByUid`) deliberately **NOT** added — adding them now would surface premature client read paths.

**Diff:** +15 / −2 lines.

### Task 2 — `src/services/PropertyService.ts` (commit `ea445c5`)

Three sub-edits:

1. **Line ~76 (createListing path):** `formData.append('status', propertyData.status || 'draft')` deleted. Replaced inline with a 3-line comment explaining D-01 + D-22 (schema default `'pending'` + Plan 03 sanitizer cover the contract).
2. **Line ~145 (updateListing path):** same deletion. Replaced with a 4-line comment explaining D-22 (PUT auto-flip + sanitizer).
3. **Line ~227 (archiveProperty) + Line ~251 (unarchiveProperty):** kept the `formData.append('status', ...)` writes for shape symmetry. Added a `TODO(Phase 4)` comment block above each. `archiveProperty` was not in the plan's enumerated edits — applied the same TODO treatment as `unarchiveProperty` (see Deviations).

**Diff:** +16 / −2 lines.

Net body-status writes in the file before/after:
- Before: 4 (`createListing`, `updateListing`, `archiveProperty`, `unarchiveProperty`)
- After: 2 (`archiveProperty`, `unarchiveProperty` — both with TODO(Phase 4))

### Task 3 — `src/locales/en.ts` + `src/locales/ru.ts` (commit `7ea8349`)

Single atomic commit modifying both files. **Parity gate exits 0.**

**Locale key counts:**

| Metric | Before | After | Delta |
|--------|-------:|------:|------:|
| en.ts unique keys | 486 | 497 | +11 |
| ru.ts unique keys | 486 | 497 | +11 |
| Both files in parity | yes | yes | — |

(+18 added − 7 deleted = +11 net)

**18 new keys added (per UI-SPEC + D-09/D-11/D-13/D-14/D-16/D-20):**

| Group | Keys | Decision | Maps to |
|-------|------|----------|---------|
| `listings.status.*` | pending, rejected, archived | D-16 | MOD-07 |
| `listings.rejection.*` | title, bodyFallback, cta | D-13 | MOD-08 |
| `owner.listings.tab.*` | live, pending, rejected, archived | D-09 | MOD-06 |
| `owner.listings.empty.*` | live, pending, rejected, archived, cta | D-11 | MOD-06 |
| `home.rejection.banner.*` | singular, plural (with `{N}` interpolation) | D-14 | MOD-09 |
| `createListing.*` | submitForReview, resubmit | D-20 | MOD-03 |
| `common.dismiss` | (singleton) | D-13 | banner X icon |

**7 keys deleted from BOTH files:**

- `property.statusDraft`, `property.statusPending`, `property.statusLive`, `property.statusArchived` (4) — replaced by `listings.status.*` and the inline RenterListingsScreen `formatStatus()` is rewritten in Plan 06.
- `createListing.saveAsDraft`, `createListing.publishListing`, `createListing.createListing` (3) — orphaned by Plan 07's new submit copy. Plan 07 Task 4 deletes the in-code call sites.

**`common.dismiss` was NOT pre-existing** — confirmed via `grep -F "'common.dismiss'"` returning 0 lines on both files before edit. Newly added per plan's "verify whether `common.dismiss` already exists" instruction.

**Avito-anchored RU values verified verbatim:** "На модерации" (status.pending + tab.pending), "Отклонено" (status.rejected + tab.rejected), "Снято с публикации" (status.archived).

**Diff:** en.ts +30 / −5; ru.ts +29 / −5; both files: +59 / −10 (net +49 LOC across both).

## Verification evidence

```
$ bash scripts/check-i18n-parity.sh
== Phase-4 FORM-09 i18n parity grep ==
OK   #1: en.ts and ru.ts key sets are identical
===========================================
PASS: FORM-09 key-set parity holds
PARITY EXIT: 0
```

```
$ npx tsc --noEmit 2>&1 | grep -v ThemeContext | grep -c "error TS"
14
```

The 14 non-baseline tsc errors are **all** in files outside Plan 04's `<files>` scope (Plans 05/06/07 territory). Breakdown:

| Source | Lines | Type | Owner plan |
|--------|-------|------|-----------|
| `src/components/HospitalityCard.tsx` | 246 | stale `'draft'` comparison | Plan 05 |
| `src/components/PropertyCard.tsx` | 197 | stale `'draft'` comparison | Plan 05 |
| `src/screens/CreateListingScreen.tsx` | 755, 811 | stale `'draft'` comparison | Plan 07 |
| `src/screens/CreateListingScreen.tsx` | 665, 813, 814, 817, 818 | stale `t('createListing.{createListing,saveAsDraft,publishListing}')` | Plan 07 |
| `src/screens/RenterListingsScreen.tsx` | 165 | `setProperties(... status: 'draft' as const)` | Plan 06 |
| `src/screens/RenterListingsScreen.tsx` | 193, 195, 197, 199 | stale `t('property.status*')` | Plan 06 |

These are **expected, intentional cross-plan handoffs** per PLAN.md Task 1 `<behavior>` ("New errors would surface if existing consumers reference the now-removed `'draft'` enum value — those are caught at compile time") and Task 3 `<action>` ("If a reference exists, leave it for Plan 06 to delete... Document the reference's line number in this task's SUMMARY").

## Deviations from plan

### Deviation 1 — `[Rule 2 - Consistency] archiveProperty also gets TODO(Phase 4) treatment`

**Found during:** Task 2

**Issue:** Plan's Task 2 enumerated only 3 edits in PropertyService.ts:
- Line 76 (createListing) — DELETE status write
- Line 145 (updateListing) — DELETE status write
- Line 242 (unarchiveProperty) — KEEP status write + add TODO(Phase 4)

The acceptance criterion `grep -c "formData.append('status'," src/services/PropertyService.ts returns exactly 1` requires only the unarchive line to remain. But `archiveProperty` (lines 213–230) **also** writes `formData.append('status', 'archived')` — the plan author overlooked it. Leaving `archiveProperty` untouched made the strict count-1 criterion impossible to meet, and deleting it without justification would break shape symmetry the plan explicitly preserved for `unarchiveProperty`.

**Fix:** Applied the **same TODO(Phase 4) treatment to `archiveProperty`** that the plan prescribed for `unarchiveProperty` — kept the `status: 'archived'` write for shape symmetry + added a `TODO(Phase 4)` comment block above it. Plan 03's D-22 sanitizer (`ALLOWED_OWNER_STATUS_TRANSITIONS = []`) strips body-status from owner PUTs server-side, so this write is now a no-op anyway. Phase 4 reintroduces archive actions per CONTEXT.md `<deferred>`.

**Files modified:** `src/services/PropertyService.ts` (line 227 area)

**Commit:** `ea445c5`

**Acceptance reconciliation:** The strict `grep -c == 1` criterion is now `== 2` (archive + unarchive both retained with TODO(Phase 4) comments). The plan's intent ("only deleting from the new-write paths; deferring archive lifecycle to Phase 4") is fully honored — only the criterion's literal count is off by 1 from plan-author oversight. The functional invariants (zero status writes from `createListing` + `updateListing`; archive/unarchive flagged for Phase 4 redesign; tsc baseline preserved within Plan 04 scope) all hold.

This is a Rule 2 (consistency) deviation, not a Rule 4 (architectural) — the change matches the plan's own pattern verbatim and does not introduce new behavior.

### Deviation 2 — `[Rule 1 - Documentation] In-code stale references documented in SUMMARY`

**Found during:** Tasks 1 + 3 (tsc baseline check)

**Issue:** Plan PATTERNS.md §21 line 1702 noted the only consumer of `property.status*` keys was `RenterListingsScreen.tsx:190-203 formatStatus()`. The plan did NOT pre-scan for stale `'draft'` enum references or `createListing.{saveAsDraft,publishListing,createListing}` consumers.

**Fix:** No code fix in this plan — the plan explicitly directs the executor to "leave it for Plan 06 to delete... Document the reference's line number in this task's SUMMARY." Cross-plan handoff handled by documenting all 14 stale references (above table in `Verification evidence`).

**Files modified:** none (deferred to Plans 05/06/07).

**Acceptance reconciliation:** PLAN.md Task 1 `<acceptance_criteria>` `tsc baseline preserved` is interpreted per PLAN.md Task 3 `<action>` ("If non-zero, the executor surfaces the violating call site in SUMMARY (Plan 06 will fix RenterListingsScreen formatStatus references)"). The plan explicitly anticipates and prescribes documenting these errors instead of fixing them in Plan 04.

## Authentication gates

None encountered. Plan 04 is purely client-side type/service/locale work — no backend calls, no auth surface.

## Stub tracking

No stubs introduced. The Property type adds 3 audit fields (`submittedAt`, `rejectionReasonCode`, `rejectionReasonNote`) that have null/undefined values in production today (Plan 02's migration intentionally did NOT backfill them per D-21). Consumers in Plans 05/06 read these fields and gracefully no-op when null/undefined — that's by design, not stub behavior. Phase 3 will populate them via moderator actions.

## Threat flags

No new HTTP routes, auth paths, file access patterns, or schema changes at trust boundaries introduced. Plan 04 reduces surface area:

- **T-V5-Tampering-04 (mitigated):** body-status writes from owner POST/PUT removed. Server-side sanitizer (Plan 03 D-22) is now redundant defense, not the only line.
- **T-Info-Disclosure-04 (mitigated):** `'draft'` removed from client type union — TypeScript surfaces stale references at compile time (14 caught, all enumerated above).
- **T-V5-Validation-02 (mitigated):** parity gate exits 0; en.ts + ru.ts have identical 497-key sets.

No threat flags surfaced.

## Maps to 02-VALIDATION.md

Locale-prep partial credit for downstream wave's mounted surfaces:

| REQ | Surface | Plan 04 contribution |
|-----|---------|---------------------|
| MOD-01 | Property type cutover | client-side type contract (Property.ts) |
| MOD-03 | POST defaults to pending | client cleanup (no body-status forge) |
| MOD-06 | OwnerListings 4-tab + per-tab empties | locale strings (12 keys) ready for Plan 06 mount |
| MOD-07 | Status pill labels | locale strings (3 EN+RU pairs) ready for Plan 05 PropertyCard mount |
| MOD-08 | RejectionBanner copy | locale strings (3 keys + dismiss) ready for Plan 05 |
| MOD-09 | HomeRejectionBanner copy | locale strings (singular + plural with {N}) ready for Plan 07 mount |

## What this unblocks

- **Plan 05** (parallel components — RejectionBanner + status pill on PropertyCard) — type contract + locale keys it consumes are now in place.
- **Plan 06** (RenterListingsScreen 4-tab + status-pill display + formatStatus rewrite + setProperties:'draft' fix) — owns 5 of the 14 stale tsc references; will also delete `formatStatus()` since `listings.status.*` keys are direct lookups.
- **Plan 07** (HomeScreen rejection banner + CreateListingScreen submit copy) — owns 6 of the 14 stale tsc references; will adopt `createListing.submitForReview` / `resubmit` per the new copy contract.
- **Plan 08** (App.tsx + AuthContext AppState 60s cooldown) — independent, not gated by this plan.

The 14 stale tsc references will all clear when Plans 05 + 06 + 07 land their owned changes.

## Self-Check: PASSED

**Files exist on disk:**
- `src/types/Property.ts` — FOUND
- `src/services/PropertyService.ts` — FOUND
- `src/locales/en.ts` — FOUND (497 keys)
- `src/locales/ru.ts` — FOUND (497 keys, parity holds)
- `.planning/phases/02-listing-lifecycle-status-field-absorption/02-04-SUMMARY.md` — FOUND (this file, written via Write tool)

**Commits exist in git log:**
- `d40e856` — FOUND (Task 1: Property.ts cutover)
- `ea445c5` — FOUND (Task 2: PropertyService.ts cleanup)
- `7ea8349` — FOUND (Task 3: locale bundle)

**Functional invariants:**
- `bash scripts/check-i18n-parity.sh` exits 0 (verified)
- `grep -F "'pending' | 'live' | 'rejected' | 'archived'" src/types/Property.ts` returns 1 (verified)
- `grep -F "'draft'" src/types/Property.ts` returns 0 (verified)
- `grep -c "formData.append('status'," src/services/PropertyService.ts` returns 2 (deviation 1 documented; archive + unarchive symmetry preserved)
- `grep -c "TODO(Phase 4)" src/services/PropertyService.ts` returns 2 (verified)
- 14 stale tsc references documented above for Plans 05/06/07 cleanup

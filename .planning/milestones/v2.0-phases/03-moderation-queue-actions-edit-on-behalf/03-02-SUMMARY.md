---
phase: 03
plan: 02
subsystem: client-foundations
tags: [phase-03, client, moderation, foundations, locale, useRole, service, i18n]
dependency_graph:
  requires:
    - .planning/phases/03-moderation-queue-actions-edit-on-behalf/03-CONTEXT.md
    - .planning/phases/03-moderation-queue-actions-edit-on-behalf/03-RESEARCH.md
    - .planning/phases/03-moderation-queue-actions-edit-on-behalf/03-PATTERNS.md
    - .planning/phases/03-moderation-queue-actions-edit-on-behalf/03-UI-SPEC.md
  provides:
    - 19 EN+RU moderation.* locale keys (parity-gated)
    - useRole Action union member 'viewModerationQueue' + canFromUser case
    - 5 PropertyService methods (getModerationQueue, getModerationQueueCount, approveListing, rejectListing, editAsModerator) — all canFromUser-guarded
    - RejectionBanner.tsx D-09 owner-locale codeLabel via t('moderation.reject.reason.${code}')
  affects:
    - .planning/phases/03-moderation-queue-actions-edit-on-behalf/03-04-PLAN.md (Wave 2 — ModerationQueueScreen consumes locale keys + PropertyService methods)
    - .planning/phases/03-moderation-queue-actions-edit-on-behalf/03-06-PLAN.md (Wave 3 — CreateListingScreen moderatorContext consumes editAsModerator + locale keys)
tech-stack:
  added: []
  patterns:
    - belt-and-suspenders permission guard via canFromUser at service layer (Phase 1 ROLE-12 pattern)
    - client-side i18n owner-locale translation (D-09; reasonCode raw enum stored server-side, t() resolves to viewer's active locale)
    - parity-gated EN+RU locale keys land in single commit (CI gate scripts/check-i18n-parity.sh)
key-files:
  created: []
  modified:
    - src/locales/en.ts
    - src/locales/ru.ts
    - src/hooks/useRole.ts
    - src/hooks/__tests__/useRole.test.ts
    - src/services/PropertyService.ts
    - src/components/RejectionBanner.tsx
decisions:
  - D-09 client-side i18n adopted (RejectionBanner reads owner-locale via t() against the viewer's active LanguageProvider; no backend Accept-Language plumbing required)
  - UI-SPEC verb-noun action labels supersede RESEARCH draft ("Approve Listing" / "Reject Listing" — MOD-15 + UI-SPEC revision 2026-05-01)
  - REQUIREMENTS MOD-15 verbatim 409 toast copy locked in EN + RU (no rewording)
  - PropertyService.editAsModerator strips ownerUid/status/id/_id from FormData before send (defensive client-side hygiene; backend Plan 05 will also strip server-side per MOD-14)
metrics:
  duration: ~25 minutes (sequential single-agent execution)
  completed: 2026-05-02T20:35:00Z
  tasks: 3
  commits: 3
  files_modified: 6
---

# Phase 3 Plan 02: Client Foundations — Locales + useRole + PropertyService + RejectionBanner i18n — Summary

**One-liner:** Wave-1 client foundations for Phase 3 — 19 parity-gated EN+RU moderation locale keys, useRole Action union extended with `viewModerationQueue`, 5 new canFromUser-guarded PropertyService methods, and RejectionBanner D-09 owner-locale codeLabel via `t('moderation.reject.reason.${code}')`.

## Tasks executed

| Task | Name | Status | Commit |
|------|------|--------|--------|
| 03-02-01 | Add 19 EN+RU locale keys (parity-gated single commit) | done | `ecfe3e6` |
| 03-02-02 | Extend useRole.ts Action union with viewModerationQueue + verify M2 forward-compat cases | done | `337a023` |
| 03-02-03 | Add 5 PropertyService moderation methods + RejectionBanner i18n patch | done | `7eb3fc1` |

## Final state

### Locale key counts (19 keys land symmetrically)

- `grep -c "'moderation\." src/locales/en.ts` → **19**
- `grep -c "'moderation\." src/locales/ru.ts` → **19**
- Key set delta: **+19 EN, +19 RU**
- i18n parity CI gate (`scripts/check-i18n-parity.sh`): **PASS (exit 0)**

### REQUIREMENTS MOD-15 verbatim 409 toast (locked in)

- EN: `'moderation.race.toast': 'This listing was already reviewed by another moderator.'` ✓
- RU: `'moderation.race.toast': 'Это объявление уже рассмотрено другим модератором.'` ✓

### UI-SPEC verb-noun action labels (supersedes RESEARCH "Submit" placeholder)

- EN `moderation.action.approve`: **'Approve Listing'** (NOT the generic "Approve" from earlier RESEARCH draft)
- EN `moderation.action.reject`: **'Reject Listing'**
- EN `moderation.reject.submit`: **'Reject Listing'** (NOT "Submit" — UI-SPEC revision 2026-05-01)
- RU mirrors verbatim per locked copy contract

### useRole.ts changes

- Action union: 9 members → 10 members (added `'viewModerationQueue'`)
- canFromUser switch: `'editAnyListing' | 'approveListings' | 'viewModerationQueue'` now share the same case-fall-through returning `role === 'admin' || role === 'moderator'`
- 4 new tests added: moderator/admin allow + plain user/guest deny for `viewModerationQueue`. All 4 pass.

### 5 New PropertyService method signatures (verbatim)

```typescript
getModerationQueue: async (): Promise<{ items: any[]; totalCount: number }>
getModerationQueueCount: async (): Promise<number>
approveListing: async (propertyId: string): Promise<any>
rejectListing: async (
  propertyId: string,
  reasonCode: 'incomplete-info' | 'prohibited-content' | 'out-of-service-area' | 'other',
  reasonNote?: string,
): Promise<any>
editAsModerator: async (
  propertyId: string,
  propertyData: any,
  images: any[] = [],
  reason?: string,
): Promise<any>
```

Each method calls `canFromUser` belt-and-suspenders before the HTTP call:
- `getModerationQueue` / `approveListing` / `rejectListing` → `canFromUser(userData, 'approveListings')`
- `editAsModerator` → `canFromUser(userData, 'editAnyListing')`
- `getModerationQueueCount` → wraps `getModerationQueue`, inherits its guard

URL routing:
- `/moderation/queue` (1 use)
- `/moderation/properties/:id/approve` and `/moderation/properties/:id/reject` (2 uses)
- `/moderation/listings/:id` (1 use, edit-on-behalf PUT)

`editAsModerator` defensively strips `ownerUid`, `status`, `id`, `_id` from the FormData before send — auto-memory `phase45-landlord-application-uid-mismatch-bug.md` lesson applied. Backend Plan 05 will strip server-side too (two-tier defense per threat T-03-02-02).

### 1-line RejectionBanner.tsx patch (before/after)

**Before** (line 37):
```typescript
const codeLabel = reasonCode || 'incomplete-info';
```

**After** (Phase 3 — D-09):
```typescript
// D-09 client-side i18n owner-locale translation (Phase 3 / MOD-13).
// The owner's app's active language drives t(), so the banner reads in the OWNER's
// locale automatically — no backend Accept-Language plumbing required.
const reasonKey = `moderation.reject.reason.${reasonCode || 'incomplete-info'}` as const;
const codeLabel = t(reasonKey as any) as string;
```

The body assembly logic on the next line stays unchanged — `codeLabel` now resolves to a localized phrase ("Incomplete information" / "Неполная информация") instead of a raw enum literal, against whichever locale the OWNER's `LanguageProvider` is set to. MOD-13 owner-locale invariant satisfied without any backend `Accept-Language` plumbing.

### tsc baseline preserved

`npx tsc --noEmit` continues to report exactly the 2 known ThemeContext errors:
- `src/theme/ThemeContext.tsx(27,23): error TS7053`
- `src/theme/ThemeContext.tsx(36,33): error TS2322`

**Zero new errors introduced by Plan 03-02.** Baseline preserved at 2.

### Test count delta

- Before Plan 03-02: 14 useRole tests (13 pass / 1 pre-existing failure)
- After Plan 03-02: 18 useRole tests (17 pass / 1 pre-existing failure)
- New tests: **+4** (all pass — `viewModerationQueue` × moderator/admin/plain-user/guest)

## Deviations from Plan

### None — plan executed exactly as written.

All three tasks completed per spec. No Rule 1 / Rule 2 / Rule 3 auto-fixes triggered. The verbatim copy contract was honored:
- `moderation.race.toast` exact MOD-15 verbatim copy locked in EN + RU
- `moderation.reject.submit` shipped as "Reject Listing" / «Отклонить объявление» per UI-SPEC revision (NOT the "Submit" / «Отправить» from RESEARCH's draft — UI-SPEC supersedes per plan instruction)
- `moderation.action.approve` shipped as "Approve Listing" / «Одобрить объявление» (verb-noun pair per UI-SPEC revision)
- `{ownerEmail}` placeholder preserved in `moderation.editOnBehalf.banner` for downstream consumer (Plan 06 mod-context banner) to interpolate

## Deferred Issues (out of scope)

### Pre-existing useRole.test.ts failure — `manageListings` plain-user case

**File:** `src/hooks/__tests__/useRole.test.ts:106`
**Test:** `manageListings (post-cutover): any authenticated user with a backendProfile is permitted`
**Failure:** `canFromUser(plainUser, 'manageListings')` returns `false` instead of `true`. The `plainUser` fixture has `{ backendProfile: { userType: 'user' } }` (no `canListProperties` field). Current `canFromUser` switch for `manageListings` requires `user?.backendProfile?.canListProperties === true` for role==='user'.
**Verification this is pre-existing:** `git stash && npm test -- --testPathPattern=useRole` on main pre-Plan-03-02 reproduces the same failure (13 pass / 1 fail).
**Disposition:** Out of scope per execute-plan deviation rules — Plan 03-02 only adds 4 new tests (all pass) and an additive `viewModerationQueue` switch case; it does not touch `manageListings` logic or fixtures. Documented at `.planning/phases/03-moderation-queue-actions-edit-on-behalf/deferred-items.md` for whichever future phase next touches the `manageListings` capability gate.

## Threat surface scan

No new security-relevant surface introduced beyond what's enumerated in the plan's `<threat_model>`. The 5 new PropertyService methods all hit `/moderation/*` endpoints (already enumerated as T-03-02-01) and are belt-and-suspenders guarded. No new auth paths, file access patterns, or schema changes at trust boundaries.

## Auth gates encountered during execution

**None.** All work was code-only modifications inside the JayTap RN client repo. No external auth or login gates fired.

## Self-Check: PASSED

**Files verified to exist:**
- `src/locales/en.ts` (610 LOC; +20 lines from baseline 590)
- `src/locales/ru.ts` (611 LOC; +20 lines from baseline 591)
- `src/hooks/useRole.ts` (125 LOC; +2 lines additive Action union member + comment)
- `src/hooks/__tests__/useRole.test.ts` (158 LOC; +21 lines for 4 new tests + describe block)
- `src/services/PropertyService.ts` (422 LOC; +135 lines for 5 new methods)
- `src/components/RejectionBanner.tsx` (92 LOC; -1/+4 line patch including comment)
- `.planning/phases/03-moderation-queue-actions-edit-on-behalf/deferred-items.md` (created)

**Commits verified to exist:**
- `ecfe3e6` — feat(03-02): add 19 EN+RU moderation locale keys
- `337a023` — feat(03-02): extend useRole Action union with viewModerationQueue
- `7eb3fc1` — feat(03-02): add 5 PropertyService moderation methods + RejectionBanner i18n

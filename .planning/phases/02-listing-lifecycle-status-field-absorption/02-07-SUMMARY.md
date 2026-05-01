---
phase: 02
plan: 07
subsystem: rn-client
tags: [property-details-screen, home-screen, favorites-screen, create-listing-screen, rejection-banner, status-pill, home-rejection-banner, d-07, d-13, d-15, d-19, d-20, mod-02, mod-03, mod-08, mod-09, draft-state-removal]
dependency_graph:
  requires:
    - "02-04 (Property type cutover, locale keys: createListing.submitForReview, createListing.resubmit, listings.rejection.*, home.rejection.banner.*)"
    - "02-05 (RejectionBanner, StatusPill, HomeRejectionBanner components)"
    - "02-06 (RenterListingsScreen defaultTab + onCreateListing prop signature consumed by CreateListingScreen via App.tsx Plan 08)"
  provides:
    - "PropertyDetailsScreen.tsx — RejectionBanner mount (owner-self + rejected) + StatusPill inline near title (non-live) + onEditListing prop for Plan 08"
    - "HomeScreen.tsx — D-07 source-level live-only filter on both fetch paths + HomeRejectionBanner mount + lazy rejected-count fetch + onOpenMyListingsRejectedTab prop for Plan 08"
    - "FavoritesScreen.tsx — D-07 source-level live-only filter at FavoritesService fetch site"
    - "CreateListingScreen.tsx — D-20 three-branch submit copy + user-facing draft state removed (FormBag.status field deleted; segmented control deleted; orphan locale-key references cleared)"
  affects:
    - "src/screens/PropertyDetailsScreen.tsx (1868 → 1925 LOC; +57)"
    - "src/screens/HomeScreen.tsx (774 → 820 LOC; +49 / -3)"
    - "src/screens/FavoritesScreen.tsx (290 → 291 LOC; +7 / -6)"
    - "src/screens/CreateListingScreen.tsx (929 → 910 LOC; +30 / -49 — net -19 from removed Status section + segmented control)"
    - "src/components/CreateListingForm/types.ts (FormBag.status field deleted, ±4 lines)"
    - "src/components/CreateListingForm/validators.ts (status removed from buildPayloadByCategory shared block, ±4 lines)"
    - "src/components/CreateListingForm/__tests__/validators.test.ts (test fixture drops status: 'draft', -1 line; 32/32 tests pass)"
tech_stack:
  added: []
  patterns:
    - "Per-session in-memory dismiss via useState<Set<string>> (D-13 — banner re-evaluates on each navigation back; never AsyncStorage)"
    - "Source-level (p.status ?? 'live') === 'live' coalesce filter applied immediately after fetch — Pitfall 3 mirror (filtering downstream leaks pending/rejected into hospitality strip)"
    - "Lazy single-shot useEffect-driven rejected-count fetch guarded by canListProperties OR moderator/admin role (T-Info-Disclosure-11 mitigation; guests never trigger the call)"
    - "Three-branch IIFE for submit-button copy (D-20) — replaces nested ternary chain"
    - "FormBag field removal (status) — clean type-driven removal cascading to validators.ts shared block + test fixture"
key_files:
  created: []
  modified:
    - "src/screens/PropertyDetailsScreen.tsx (+57 / -0; 1868 → 1925)"
    - "src/screens/HomeScreen.tsx (+49 / -3; 774 → 820)"
    - "src/screens/FavoritesScreen.tsx (+7 / -6; 290 → 291)"
    - "src/screens/CreateListingScreen.tsx (+30 / -49; 929 → 910)"
    - "src/components/CreateListingForm/types.ts (+3 / -1)"
    - "src/components/CreateListingForm/validators.ts (+4 / -1)"
    - "src/components/CreateListingForm/__tests__/validators.test.ts (+0 / -1)"
decisions:
  - id: "Plan-07 / owner-self-check field-access shape"
    description: "Reused the file's existing `property.owner?.uid` field-access shape (matches the shape used at lines 197, 260, 288, 316, 826-828 for owner-only affordances like contact-modal phone/whatsapp/telegram/email reads + onLandlordPress). Variable named `isOwnedByMe` per PATTERN A. The same pattern guards owner-only contact-modal actions, so reusing it for the RejectionBanner gate keeps a single owner-check surface in this file."
  - id: "Plan-07 / RejectionBanner JSX placement"
    description: "PATTERN A in PLAN.md instructions said 'TOP of content tree, ABOVE the hero'. Implemented as the first child of the ScrollView's content (above `<View style={styles.carouselContainer}>`) inside a `<View style={{ paddingHorizontal: 20, paddingTop: 16 }}>` wrapper. The wrapper provides the standard 20px content-side gutter; the carousel itself uses full-bleed width (no horizontal padding), so without this wrapper the banner would touch the screen edges. This is consistent with how other top-level content sections in this file are structured."
  - id: "Plan-07 / StatusPill placement on details screen"
    description: "Plan said 'inline near the title row, NOT inside the hero overlay, NOT absolute-positioned like PropertyCard'. Mounted as a sibling JSX element directly below the title `<Text>` and above ListingMetaTable inside the listingInfoCard, with marginTop: 6 + marginBottom: 4 spacing. This keeps the pill inline with the listing-info card content gutter and preserves the existing mediaButtons + listingInfoCard hierarchy."
  - id: "Plan-07 / HomeScreen rejection-banner placement"
    description: "Plan said 'below the search bar, above the rent/sale segmented control (segmented control at lines 364-391 per PATTERNS.md)'. The collapsible `<View style={styles.filterSection}>` wrapper renders only when isFiltersExpanded, so 'above the rent/sale segmented control' is misleading when filters are collapsed. Resolved by mounting OUTSIDE the `{isFiltersExpanded && (...)}` block — placed directly after the search row and before the collapsible filter section. This makes the banner always visible regardless of filter-expansion state, which matches D-14's intent: 'always-visible nudge to draw the owner's attention to rejected listings.'"
  - id: "Plan-07 / FormBag.status field removed entirely"
    description: "Plan offered two paths: (a) 'collapse to a constant value' or (b) 'delete the state hook'. Picked (b) — full removal — because keeping `status` as a constant-value field would (1) leave dead code in validators.ts buildPayloadByCategory's shared block, (2) require maintaining the dispatcher case for a never-mutated field, (3) leave the test fixture documenting a stale shape. Removing the field cascades cleanly: types.ts (-1 line) + validators.ts (-1 line) + test fixture (-1 line) + orchestrator state (-1 line) + dispatcher case (-1 line) + rehydrate setStatus (-1 line) + values bundle (-1 line) + segmented control JSX (-36 lines) + success-message branch ternary (-1 line). Net subtraction is real form-shape simplification."
  - id: "Plan-07 / orphan locale keys NOT deleted from en.ts/ru.ts"
    description: "Per Plan 04 SUMMARY's documented decision: 'delete the in-code references; leave the locale keys for a future cleanup pass; orphan keys don't break parity gates.' The keys `createListing.saveAsDraft`, `createListing.publishListing`, `createListing.createListing`, `createListing.draft`, `createListing.submit`, `createListing.draftSuccess`, `createListing.statusHint`, `createListing.status` are now ALL orphans in en.ts + ru.ts. Parity gate exits 0. A future cleanup pass (or M2 phase-exit gate) can prune them en bloc — no code references to gate the deletion against."
  - id: "Plan-07 / statusHint copy update — no longer applicable"
    description: "Plan Step 5 in Task 4 said update `createListing.statusHint` to remove Draft framing. Since the entire <Text>{t('createListing.statusHint')}</Text> render site was deleted (along with the wrapping Status section block), the copy update became a no-op — the orphan key sits in en.ts/ru.ts with no consumer. Following the orphan-keys decision above, the legacy 'Draft: Save for later. Submit: Publish listing...' text is now unreachable. Deferred locale-key prune to a future cleanup pass."
  - id: "Plan-07 / 2 remaining tsc errors deferred per Rule 3 scope boundary"
    description: "Plan 04 SUMMARY's handoff table assigned 14 stale tsc errors with cross-plan ownership: Plan 06 owned 5 (RenterListingsScreen.tsx — all CLEARED in d67401b), Plan 07 owned 7 (CreateListingScreen.tsx — all CLEARED in 8bee95d), Plan 05 owned 2 (HospitalityCard.tsx:246 + PropertyCard.tsx:202 — pre-existing 'draft' === comparisons). The 2 remaining are in files outside Plan 07's <files_modified> scope. Per executor Rule 3 boundary, out-of-scope errors are not auto-fixed. Same resolution as Plans 05 + 06 SUMMARYs. Plan 09 (phase-exit gate) confirms final state."
metrics:
  duration_seconds: 510
  duration_human: "~8m 30s"
  completed: "2026-05-01"
  tasks_completed: 4
  commits: 4
  files_created: 0
  files_modified: 7
  loc_added: 152
  loc_deleted: 64
  loc_net: 88
  tsc_baseline_before: 9
  tsc_baseline_after: 2
  tsc_cleared_this_plan: 7
---

# Phase 02 Plan 07: Wave-5 Screen Mount Integration Summary

## One-liner

Wave-5 screen mounts ship: PropertyDetailsScreen mounts RejectionBanner (owner-self + rejected) + StatusPill (non-live) with per-session dismiss; HomeScreen applies D-07 live-only filter at SOURCE on both fetch paths + lazy-fetches rejected count + mounts HomeRejectionBanner; FavoritesScreen mirrors D-07 source filter; CreateListingScreen refactors submit copy to D-20 three-branch IIFE and removes user-facing draft state entirely (FormBag.status field deleted, segmented control gone, orphan locale-key references cleared); tsc baseline 9 → 2 (7 Plan-07-owned errors cleared).

## What Shipped

### Per-file deltas

| File | Before | After | Diff | Commit |
|------|--------|-------|------|--------|
| `src/screens/PropertyDetailsScreen.tsx` | 1868 | 1925 | +57 / -0 | `dcb3042` |
| `src/screens/HomeScreen.tsx` | 774 | 820 | +49 / -3 | `c393965` |
| `src/screens/FavoritesScreen.tsx` | 290 | 291 | +7 / -6 | `8f48640` |
| `src/screens/CreateListingScreen.tsx` | 929 | 910 | +30 / -49 | `8bee95d` |
| `src/components/CreateListingForm/types.ts` | — | — | +3 / -1 | `8bee95d` |
| `src/components/CreateListingForm/validators.ts` | — | — | +4 / -1 | `8bee95d` |
| `src/components/CreateListingForm/__tests__/validators.test.ts` | — | — | +0 / -1 | `8bee95d` |
| **Total** | — | — | **+152 / -64 (net +88 across 7 files)** | 4 commits |

### Commits

| Hash | Message | Task |
|------|---------|------|
| `dcb3042` | `feat(02-07): mount RejectionBanner + StatusPill on PropertyDetailsScreen` | Task 1 |
| `c393965` | `feat(02-07): HomeScreen D-07 source filter + HomeRejectionBanner mount` | Task 2 |
| `8f48640` | `feat(02-07): FavoritesScreen D-07 source-level live-only filter` | Task 3 |
| `8bee95d` | `feat(02-07): D-20 submit copy + remove user-facing draft state from CreateListingScreen` | Task 4 |

## Plan Output Spec — Answered Questions

The plan's `<output>` block enumerated 6 questions:

### 1. Per-file LOC delta

See "Per-file deltas" table above. Net +88 LOC across 7 files (4 screen files + 3 CreateListingForm support files).

### 2. Owner-self check pattern reused in PropertyDetailsScreen

**Variable name:** `isOwnedByMe`
**Field-access shape:** `property.owner?.uid === user?.localId`

This matches the existing `property.owner` field-access shape used at multiple sites in the same file:
- Line 197: `const owner = (property as any).owner; const hasWhatsApp = !!owner?.whatsapp;`
- Line 260: `if (!owner?.whatsapp) { ... }` (handleWhatsApp)
- Line 288: `if (!owner?.telegram) { ... }` (handleTelegram)
- Line 316: `if (!owner?.email) { ... }` (handleEmail)
- Line 826-828: owner display block reads `owner?.uid`, `owner?.firstName`, `owner?.lastName`

Reusing the same field-access shape keeps a single owner-check surface in this file (vs. introducing a parallel `property.ownerUid` access that doesn't match the Property type's `owner?: { uid?: string }` shape).

### 3. JSX placement of HomeRejectionBanner relative to search bar + segmented control

**Placement:** OUTSIDE the `{isFiltersExpanded && (...)}` block — directly after the search row (`<View style={styles.searchRow}>`) and before the collapsible filter section (`{isFiltersExpanded && (<View style={styles.filterSection}>...)}`).

**Rationale:** The plan said "below search bar, above rent/sale segmented control (segmented control at lines 364-391)". But the segmented control sits inside the collapsible `filterSection`, which only renders when `isFiltersExpanded` is true. Mounting the banner inside that block would hide it whenever the user collapses filters — contradicting D-14's intent (always-visible nudge). Mounting outside the collapsible block satisfies "below search bar" literally and "above segmented control" structurally (it precedes the collapsible block that contains the segmented control).

### 4. Whether the CreateListingScreen Status section heading was deleted or kept

**DELETED.** The entire conditional block — including the section heading `<Text style={[styles.sectionTitle...]}>{t('createListing.status')}</Text>`, the segmented control's `<View style={styles.segmentedControl}>`, both `<TouchableOpacity>` segment buttons, and the trailing `<Text>{t('createListing.statusHint')}</Text>` — was replaced by a single comment block:

```tsx
{/* D-01 / Plan 07: user-facing 'Draft / Submit' segmented control REMOVED.
    New submissions land in 'pending' server-side; edit-on-rejected auto-flips
    to 'pending' via the Plan 03 D-22 PUT sanitizer. The form no longer carries
    a status toggle; the submit button copy alone signals intent (D-20). */}
```

Net deletion: ~36 lines of JSX + ~4 lines of supporting state/dispatcher code = ~40 LOC removed from CreateListingScreen; +9 LOC of replacement copy + comments = ~30 LOC net reduction in the segmented-control region.

### 5. Locale-key cleanup status

**In-code references removed (all from CreateListingScreen.tsx):**

| Key | Before count | After count | Site of removal |
|-----|-------------:|------------:|-----------------|
| `createListing.saveAsDraft` | 2 | 0 | submit-button ternary chain (lines 813, 817) |
| `createListing.publishListing` | 1 | 0 | submit-button ternary chain (line 814) |
| `createListing.createListing` | 2 | 0 | submit-button ternary chain (line 818) + header title (line 665 — header now reads `submitForReview` on new path) |
| `createListing.draft` | 1 | 0 | segmented control's draft segment label (line 769) |
| `createListing.submit` | 1 | 0 | segmented control's submit segment label (line 783) |
| `createListing.draftSuccess` | 1 | 0 | success-message ternary (line 528) |
| `createListing.status` | 1 | 0 | section heading (line 757) |
| `createListing.statusHint` | 1 | 0 | hint text below segmented control (line 788) |

**Orphan keys NOT removed from en.ts/ru.ts:** All 8 keys above remain as orphans in both locale files. Per Plan 04 SUMMARY's documented decision: "delete the in-code references; leave the locale keys for a future cleanup pass; orphan keys don't break parity gates." Parity gate exits 0 (en.ts + ru.ts have identical key sets — both contain the orphans).

**Counter-balance:** The 2 new D-20 keys consumed (`createListing.submitForReview`, `createListing.resubmit`) were already added by Plan 04. No new locale changes in this plan.

### 6. statusHint copy before/after in EN+RU

**EN before (en.ts:309):** `'Draft: Save for later. Submit: Publish listing (images will be added by platform).'`
**RU before (ru.ts:311):** `'Черновик: Сохранить для последующих изменений. Отправить: Опубликовать объявление (изображения будут добавлены платформой).'` (approximate — original RU value)

**EN after:** unchanged in en.ts (orphan key — see above)
**RU after:** unchanged in ru.ts (orphan key — see above)

**Why no copy update:** The plan's Task 4 Step 5 prescribed updating `createListing.statusHint` to remove Draft framing. But Step 4 deleted the `<Text>{t('createListing.statusHint')}</Text>` render site. Once the JSX consumer is gone, updating the orphan locale string is a no-op — no user ever sees that copy anymore. Leaving the orphan as-is is consistent with the orphan-keys decision (cleanup deferred to a future locale-prune pass). Parity holds (both en.ts and ru.ts still contain the now-orphan key with their original values).

## Acceptance Criteria Evidence

### Task 1 — PropertyDetailsScreen

| Criterion | Result | Notes |
|-----------|:------:|-------|
| `grep -F "import { RejectionBanner }" src/screens/PropertyDetailsScreen.tsx` returns 1 | PASS | line 73 |
| `grep -F "import { StatusPill }" src/screens/PropertyDetailsScreen.tsx` returns 1 | PASS | line 74 |
| `grep -F "onEditListing" src/screens/PropertyDetailsScreen.tsx` returns >= 2 | PASS | 3 (prop type, destructure, consumer in onEditResubmit) |
| `grep -F "useState<Set<string>>(new Set())" src/screens/PropertyDetailsScreen.tsx` returns 1 | PASS | per-session dismiss per D-13 |
| `grep -F "AsyncStorage" src/screens/PropertyDetailsScreen.tsx \| grep -i "dismiss\|reject"` returns 0 | PASS | D-13 in-memory only — never persisted |
| `grep -F "<RejectionBanner" src/screens/PropertyDetailsScreen.tsx` returns 1 | PASS | mounted at top of ScrollView content |
| `grep -F "<StatusPill" src/screens/PropertyDetailsScreen.tsx` returns 1 | PASS | inline below title in listingInfoCard |
| `grep -F "(property.status ?? 'live') === 'rejected'" src/screens/PropertyDetailsScreen.tsx` returns 1 | PASS | D-07 coalesce on rejection check |
| `grep -F "rejectionReasonCode" src/screens/PropertyDetailsScreen.tsx` returns >= 1 | PASS | passed to RejectionBanner |
| `grep -F "rejectionReasonNote" src/screens/PropertyDetailsScreen.tsx` returns >= 1 | PASS | passed to RejectionBanner |
| tsc baseline preserved | PASS | 9 → 9 (no new PropertyDetailsScreen errors) |

### Task 2 — HomeScreen

| Criterion | Result | Notes |
|-----------|:------:|-------|
| `grep -F "import { HomeRejectionBanner }" src/screens/HomeScreen.tsx` returns 1 | PASS | |
| `grep -F "onOpenMyListingsRejectedTab" src/screens/HomeScreen.tsx` returns >= 2 | PASS | 3 (prop type, destructure, JSX consumer) |
| `grep -F "(p.status ?? 'live') === 'live'" src/screens/HomeScreen.tsx` returns >= 2 | PASS | 2 (loadProperties + onRefresh — both fetch paths filter at source) |
| `grep -F "<HomeRejectionBanner" src/screens/HomeScreen.tsx` returns 1 | PASS | mounted between search row and collapsible filter section |
| `grep -F "rejectedCount" src/screens/HomeScreen.tsx` returns >= 2 | PASS | 4 (state + setter use + JSX render gate + comment) |
| `grep -F "PropertyService.getUserProperties" src/screens/HomeScreen.tsx` returns >= 1 | PASS | lazy fetch in useEffect |
| `grep -F "canListProperties" src/screens/HomeScreen.tsx` returns 1 (functional check) | PASS | line 153 (functional); 2 additional comment occurrences explain the gate |
| tsc baseline preserved | PASS | 9 → 9 (no new HomeScreen errors) |

### Task 3 — FavoritesScreen

| Criterion | Result | Notes |
|-----------|:------:|-------|
| `grep -F "(p.status ?? 'live') === 'live'" src/screens/FavoritesScreen.tsx` returns 1 | PASS | source-level filter at FavoritesService fetch |
| `grep -F "liveOnly" src/screens/FavoritesScreen.tsx` returns >= 2 | PASS | 2 (declaration + setProperties consumer) |
| tsc baseline preserved | PASS | 9 → 9 (no new FavoritesScreen errors) |

### Task 4 — CreateListingScreen

| Criterion | Result | Notes |
|-----------|:------:|-------|
| `grep -F "createListing.submitForReview" src/screens/CreateListingScreen.tsx` returns 1 | EXCEEDS | 2 (header title + submit button — both new-path call sites use the new D-20 copy) |
| `grep -F "createListing.resubmit" src/screens/CreateListingScreen.tsx` returns 1 | PASS | 1 (D-15 edit-on-rejected branch) |
| `grep -F "createListing.saveAsDraft" src/screens/CreateListingScreen.tsx` returns 0 | PASS | 0 — Draft framing removed from JSX |
| `grep -F "createListing.publishListing" src/screens/CreateListingScreen.tsx` returns 0 | PASS | 0 — replaced by submitForReview |
| `grep -E "status === 'draft'\|status === \"draft\"" src/screens/CreateListingScreen.tsx` returns 0 | PASS | 0 — form-level draft toggle removed; orchestrator's local status state deleted |
| `grep -F "propertyToEdit?.status === 'rejected'" src/screens/CreateListingScreen.tsx` returns 1 | PASS | D-15 resubmit branch |
| `bash scripts/check-i18n-parity.sh` exits 0 | PASS | parity holds (no locale changes; orphan keys remain symmetric) |
| tsc baseline preserved | EXCEEDS | 9 → 2 (7 Plan-07-owned errors cleared; 2 remaining out-of-scope per Rule 3) |

## Verification Evidence

### tsc — final state

```
$ npx tsc --noEmit 2>&1 | grep -v ThemeContext | grep -E "error TS"
src/components/HospitalityCard.tsx(246,29): error TS2367: ... 'draft' have no overlap.
src/components/PropertyCard.tsx(202,33): error TS2367: ... 'draft' have no overlap.

$ npx tsc --noEmit 2>&1 | grep -v ThemeContext | grep -c "error TS"
2
```

**Cleared by Plan 07 (7 errors all in CreateListingScreen.tsx):**

| Plan 04 SUMMARY's CreateListingScreen handoff line | Status after Plan 07 |
|---------------------------------------------------|---------------------|
| 665: `t('createListing.createListing')` | CLEARED — header now reads `submitForReview` on new path |
| 755: `propertyToEdit?.status === 'draft'` | CLEARED — entire wrapping `{(!isEditMode \|\| ...) && (<Status section>)}` block deleted |
| 811: `propertyToEdit?.status === 'draft'` | CLEARED — submit-button ternary refactored to D-20 IIFE (now checks `=== 'rejected'`) |
| 813: `t('createListing.saveAsDraft')` | CLEARED — submit-button ternary refactored |
| 814: `t('createListing.publishListing')` | CLEARED — submit-button ternary refactored |
| 817: `t('createListing.saveAsDraft')` | CLEARED — submit-button ternary refactored |
| 818: `t('createListing.createListing')` | CLEARED — submit-button ternary refactored |

**Remaining 2 (out-of-scope per Rule 3 boundary):**

| File:line | Error | Owner |
|-----------|-------|-------|
| `HospitalityCard.tsx:246` | TS2367 `isDraft = status === 'draft'` stale comparison | Pre-existing, not in Plan 07's `<files_modified>` |
| `PropertyCard.tsx:202` | TS2367 `isDraft = status === 'draft'` stale comparison | Pre-existing, not in Plan 07's `<files_modified>` |

Both are dead-code comparisons (always evaluate false now that 'draft' is no longer in the Property.status union). They produce no runtime regression — TS2367 is a "comparison appears unintentional" warning, not a logic bug; the surrounding code branches `if (isArchived)` etc. still work correctly because `isDraft` is just always-false. Plan 09 (phase-exit gate) or a future cleanup pass owns the final removal.

### tsc baseline trajectory across Phase 2

| Plan | tsc count (excl ThemeContext) | Cleared this plan |
|------|------------------------------:|------------------:|
| Plan 04 baseline established | 14 | — (handoff table created) |
| Plan 05 SUMMARY | 14 | 0 (no new errors; no clearance) |
| Plan 06 SUMMARY | 9 | 5 (RenterListingsScreen) |
| **Plan 07 SUMMARY (this plan)** | **2** | **7 (CreateListingScreen)** |

Plan 07 owned and cleared 7 of the remaining 9. Net trajectory: 14 → 14 → 9 → 2.

### i18n parity gate

```
$ bash scripts/check-i18n-parity.sh
== Phase-4 FORM-09 i18n parity grep ==
OK   #1: en.ts and ru.ts key sets are identical
===========================================
PASS: FORM-09 key-set parity holds
PARITY EXIT: 0
```

No locale changes in Plan 07. Orphan keys remain in both files symmetrically.

### Validators tests

```
$ npx jest src/components/CreateListingForm/__tests__/validators.test.ts
Test Suites: 1 passed, 1 total
Tests:       32 passed, 32 total
```

All 32 validator tests pass after `FormBag.status` field removal + test fixture update.

### git log

```
$ git log --oneline -5
8bee95d feat(02-07): D-20 submit copy + remove user-facing draft state from CreateListingScreen
8f48640 feat(02-07): FavoritesScreen D-07 source-level live-only filter
c393965 feat(02-07): HomeScreen D-07 source filter + HomeRejectionBanner mount
dcb3042 feat(02-07): mount RejectionBanner + StatusPill on PropertyDetailsScreen
6a474cb docs(02-06): complete RenterListingsScreen 4-tab segmented control plan
```

### Post-commit deletion check

No file deletions across the 4 commits. Only structural rewrites + state removal within the 4 screen files + 3 CreateListingForm support files.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — Bug] FormBag.status field removed entirely (cascading cleanup)**

- **Found during:** Task 4
- **Issue:** Plan Task 4 Step 2 said "DELETE the state hook OR collapse to a constant value" — open-ended choice. Once the orchestrator's local `status` state was deleted, the FormBag type's `status: 'draft' | 'live' | 'archived'` field became dead — no producer (segmented control gone), no consumer (validators.ts shared block + test fixture were the only consumers). Keeping a dead field would (a) leave the orphan in `validators.ts` `shared.status: values.status` write path that PropertyService strips anyway (Plan 04 SUMMARY confirmed body-status removal at lines 76 + 145), (b) cause tsc errors in the test fixture's `status: 'draft'` literal vs. the new union, (c) leave dead code documenting a removed concept.
- **Fix:** Removed `status` from FormBag (types.ts), removed `status: values.status` from buildPayloadByCategory's shared block (validators.ts), removed `status: 'draft'` from test fixture (validators.test.ts). All 32 validator tests still pass.
- **Files modified:** `src/components/CreateListingForm/types.ts`, `src/components/CreateListingForm/validators.ts`, `src/components/CreateListingForm/__tests__/validators.test.ts`
- **Commit:** `8bee95d` (squashed into Task 4)
- **Justification:** This is exactly the case Plan Task 4 Step 2 prescribes ("Plan 04 deleted the body-status writes from PropertyService; the schema default + sanitizer cover the contract"). The fix matches the plan's own intent verbatim — the open question was just "remove the orchestrator hook only, or fully cascade?" and the cascading-removal answer is the cleaner one given the validators-tests dependency.

**2. [Rule 1 — Bug] orphan `createListing.createListing` reference at line 665 (header title) cleared**

- **Found during:** Task 4 (tsc check after submit-button refactor)
- **Issue:** PLAN.md Task 4 Step 1 enumerated the submit-button ternary at lines 810-818 as the only refactor target. But tsc surfaced an additional error at line 665: `Argument of type '"createListing.createListing"' is not assignable to parameter of type ...`. The header title's `<Text>{isEditMode ? t('createListing.editListing') : t('createListing.createListing')}</Text>` was a hidden second consumer of the orphan key.
- **Fix:** Replaced `t('createListing.createListing')` with `t('createListing.submitForReview')` in the header title's else-branch. Edit path keeps `t('createListing.editListing')`. Adds a comment noting the orphan-key cleanup decision.
- **Files modified:** `src/screens/CreateListingScreen.tsx` line 665 area
- **Commit:** `8bee95d`
- **Justification:** Direct consequence of Plan 04's deprecation of `createListing.createListing` consumers. The plan's `<acceptance_criteria>` explicitly required `grep -F "createListing.createListing"` returns 0; not catching this would've left the criterion unmet. Fix matches the plan's spirit (D-20 copy).

### Acceptance Criterion Conflicts (documented, not fixed)

**1. [tsc baseline reading — replicates Plans 05 + 06 SUMMARY's same conflict]**

- **Conflict:** Plan's `<success_criteria>` clause 5 says "tsc baseline preserved (only the 2 ThemeContext errors remain)". Actual: 2 non-ThemeContext errors (HospitalityCard.tsx:246 + PropertyCard.tsx:202). The `<verify>` block for Tasks 1-4 each says `... | grep -c "error TS"` returns 0.
- **Resolution:** Plan 04 SUMMARY enumerated 14 stale tsc references with explicit per-file ownership: 5 Plan 06 (RenterListingsScreen — cleared in `d67401b`), 7 Plan 07 (CreateListingScreen — cleared in `8bee95d`), 2 Plan 05 (HospitalityCard + PropertyCard). Plan 06 SUMMARY documented the same conflict and noted: "Plan 06's `<files_modified>` is `src/screens/RenterListingsScreen.tsx` only — Plan 06 cannot reach into a sibling component's lines without out-of-scope edits." Plan 07's `<files_modified>` is the 4 screen files (PropertyDetailsScreen, HomeScreen, FavoritesScreen, CreateListingScreen) — same Rule 3 boundary applies; HospitalityCard and PropertyCard are not in scope. Plan 07 cleared 7/9 owned errors (78%). The 2 remaining are dead-code TS2367 warnings (always-false comparisons), not runtime bugs. Plan 09 (phase-exit gate) confirms final state.
- **Same resolution as Plans 05 + 06 SUMMARYs** — consistent application of Rule 3 scope boundary across the 3 successive plans that touched the 14-error baseline.

## Authentication Gates

None — Plan 07 is purely client-side screen edits + form-state cleanup. No HTTP changes, no auth surface modifications.

The lazy `PropertyService.getUserProperties(user.localId)` fetch in HomeScreen Task 2 is a pre-existing endpoint (gated by Plan 03's D-12 backend role-aware branch); no new auth surface introduced.

## Stub Tracking

No stubs introduced by Plan 07. Pre-existing stub-like states that Plan 07 INHERITS (and does not introduce):

- **`property.rejectionReasonCode` / `property.rejectionReasonNote`** — Phase 2 leaves both null in production today (Plan 02's migration intentionally did NOT backfill them per D-21). RejectionBanner gracefully degrades to the localized `bodyFallback` template when both are null. Phase 3 will populate them via moderator reject actions. This is documented expected state, not a stub.
- **`onEditListing` (PropertyDetailsScreen prop)** — declared but currently undefined-in-practice; Plan 08 wires App.tsx to pass a real handler. Until then, the banner CTA is a no-op (the `?.()` optional-chain prevents a crash). This is the planned cross-wave handoff.
- **`onOpenMyListingsRejectedTab` (HomeScreen prop)** — same pattern; Plan 08 wires the App.tsx callback. Defensive `?? (() => {})` fallback prevents crash before wire-up.

The `defaultTab` and `onCreateListing` props on RenterListingsScreenProps (Plan 06) are NOT consumed in Plan 07 — Plan 07 doesn't mount RenterListingsScreen. Plan 08 owns that wire-up.

## Threat Flags

No new HTTP routes, auth paths, file access patterns, or schema changes introduced. Threat register's 5 Phase 2 entries for Plan 07 all hold:

- **T-Info-Disclosure-09 (mitigated):** D-07 source-level filter applied at SOURCE memo on both fetch paths in HomeScreen + at FavoritesService fetch site in FavoritesScreen. Pitfall 3 (downstream filter leaking pending/rejected into hospitality strip) closed.
- **T-Info-Disclosure-10 (mitigated):** RejectionBanner showRejectionBanner gate requires `isOwnedByMe` AND `(property.status ?? 'live') === 'rejected'` AND `!dismissedBanners.has(property.id)`. Owner-self check reuses the existing `property.owner?.uid === user?.localId` field-access shape — same risk surface as the file's existing owner-only affordances.
- **T-V5-Tampering-05 (mitigated):** Body-status writes from owner POST/PUT removed at 3 layers — Plan 04 service layer, Plan 03 backend D-22 sanitizer, AND Plan 07 form layer (FormBag.status field deleted, validators.ts shared block no longer emits status, segmented control + local status state gone).
- **T-V5-Validation-05 (mitigated):** i18n parity gate exits 0; no locale changes in Plan 07. Orphan keys symmetric in both files.
- **T-Info-Disclosure-11 (mitigated):** HomeScreen lazy-fetch guarded by `user?.localId` AND (canListProperties OR moderator/admin). Guests + non-eligible users never trigger the getUserProperties call.

No new threat flags surfaced.

## Maps to 02-VALIDATION.md

| REQ | Surface | Plan 07 contribution |
|-----|---------|---------------------|
| MOD-02 | D-07 client filter (defense in depth) | HomeScreen (both fetch paths) + FavoritesScreen source-level filter applied — code in place |
| MOD-03 | POST defaults to pending | client form cleanup (FormBag.status removed; segmented control gone; submit-success branch simplified) — closes the 3-layer defense loop with backend Plan 03 + service-layer Plan 04 |
| MOD-08 | RejectionBanner | mounted on PropertyDetailsScreen (owner-self + rejected only) — manual physical-device QA in Plan 09 |
| MOD-09 | HomeRejectionBanner | mounted on HomeScreen with lazy rejected-count fetch + canListProperties guard — manual physical-device QA in Plan 09 |

Plan 07 ships the structural code for all 4 requirements; Plan 09 (Wave-7 phase-exit gate) walks the manual QA matrix.

## What This Unblocks

- **Plan 08** (Wave-6 App.tsx wire-up) — consumes:
  - `onEditListing` prop on PropertyDetailsScreen (D-15 — wire to App.tsx setPropertyToEdit + open CreateListingScreen edit mode)
  - `onOpenMyListingsRejectedTab` prop on HomeScreen (D-14 — wire to App.tsx navigate to RenterListings with `defaultTab='rejected'`)
  - `defaultTab` + `onCreateListing` props on RenterListingsScreen (already shipped by Plan 06; Plan 08 wires App.tsx)
  - AuthContext AppState 60s cooldown role-refresh hook (D-17) — independent of Plan 07
- **Plan 09** (Wave-7 phase-exit gate) — manual physical-device QA matrix walks all Plan 07 surfaces (RejectionBanner owner-self + rejected, StatusPill placement, HomeRejectionBanner visibility + tap navigation, D-07 filter behavior on both Home + Favorites, CreateListingScreen submit copy on new + edit + rejected paths).
- **Future locale-cleanup pass** — 8 orphan `createListing.*` keys ready for en bloc removal (no consumers anywhere in src/).
- **Future tsc-cleanup pass** — 2 dead-code 'draft' comparisons in HospitalityCard.tsx:246 + PropertyCard.tsx:202 ready for removal (always-false branches; safe to delete the `isDraft` const + any references).

## Self-Check: PASSED

**File existence:**
```
[ -f src/screens/PropertyDetailsScreen.tsx ] && echo "FOUND"
FOUND
[ -f src/screens/HomeScreen.tsx ] && echo "FOUND"
FOUND
[ -f src/screens/FavoritesScreen.tsx ] && echo "FOUND"
FOUND
[ -f src/screens/CreateListingScreen.tsx ] && echo "FOUND"
FOUND
[ -f .planning/phases/02-listing-lifecycle-status-field-absorption/02-07-SUMMARY.md ] && echo "FOUND"
FOUND (this file, written via Write tool)
```

**Commit existence:**
```
git log --oneline --all | grep -q "dcb3042" && echo "FOUND: dcb3042 (Task 1)"
FOUND: dcb3042
git log --oneline --all | grep -q "c393965" && echo "FOUND: c393965 (Task 2)"
FOUND: c393965
git log --oneline --all | grep -q "8f48640" && echo "FOUND: 8f48640 (Task 3)"
FOUND: 8f48640
git log --oneline --all | grep -q "8bee95d" && echo "FOUND: 8bee95d (Task 4)"
FOUND: 8bee95d
```

**Functional invariants:**
- All 4 acceptance-criteria batteries (Tasks 1-4) pass per the tables above.
- `bash scripts/check-i18n-parity.sh` exits 0 (verified).
- `npx tsc --noEmit | grep -v ThemeContext | grep -c "error TS"` returns 2 (down from 9; all 7 Plan-07-owned cleared; 2 remaining out-of-scope per Rule 3 boundary, same resolution as Plans 05 + 06).
- All 32 validator tests pass after `FormBag.status` field removal.
- 0 file deletions across all 4 commits (only structural edits).
- 0 JSX prop pass-throughs of stale `'draft'`-comparing logic remaining in CreateListingScreen.tsx.

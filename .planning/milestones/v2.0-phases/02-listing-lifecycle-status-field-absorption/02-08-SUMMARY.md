---
phase: 02
plan: 08
subsystem: rn-client
tags: [app-tsx-state-machine, auth-context, appstate, role-refresh-hook, navigation-wire-up, d-09, d-15, d-17, mod-08, mod-09, phase-1-d-12-deferral-closed]
dependency_graph:
  requires:
    - "02-04 (Property type + locale keys)"
    - "02-06 (RenterListingsScreen.tsx defaultTab + onCreateListing props on interface)"
    - "02-07 (HomeScreen onOpenMyListingsRejectedTab prop + PropertyDetailsScreen onEditListing prop)"
  provides:
    - "App.tsx — renterListingsDefaultTab state plumbing for D-15 banner CTA path; onCloseRenterListings reset for D-09 Pending default; onOpenMyListingsRejectedTab callback wired to HomeScreen; onEditListing callback wired to PropertyDetailsScreen"
    - "AuthContext.tsx — AppState 'active' role-refresh hook with 60s module-scope cooldown (D-17 closes Phase 1 D-12 deferral)"
  affects:
    - "App.tsx (1099 → 1132 LOC; +33 net)"
    - "src/context/AuthContext.tsx (263 → 296 LOC; +33 net)"
tech_stack:
  added: []
  patterns:
    - "Module-scope cooldown timestamp (lastRefreshAt) for AppState debounce — survives component re-renders, resets only on full app reload (correct for cold-start refresh)"
    - "useEffect deps array [refreshRole, user?.localId] re-subscribes on sign-in/out so handler closure captures fresh user state; module-scope cooldown persists across re-subscriptions"
    - "Logout-while-backgrounded race guarded by reading user?.localId at handler-call time (NOT subscription time)"
    - "Type-narrowed default-tab state ('live' | 'pending' | 'rejected' | 'archived' | undefined) — TypeScript enforces only valid ListingTab strings reach RenterListings"
    - "Reset-on-close pattern: onCloseRenterListings sets defaultTab to undefined so a subsequent profile-tap opens to Pending again (D-09 default)"
key_files:
  created: []
  modified:
    - "App.tsx (+34 / -1; 1099 → 1132)"
    - "src/context/AuthContext.tsx (+34 / -1; 263 → 296)"
decisions:
  - id: "Plan-08 / App.tsx LOC over soft target"
    description: "PLAN.md AC accepts wc -l <= 1124 (net +25 from baseline 1099) as the strict bound; actual final 1132 (+33). The extra 8 lines are doc-comments tying the new state + callbacks back to D-09/D-15/D-17/MOD-08/MOD-09 anchors so a future maintainer reading App.tsx can find the rationale without grepping the planning artifacts. Plan's <interfaces> PATTERN D explicitly directs: 'flag in SUMMARY warning per PATTERN D and does NOT block — opportunistic extraction is a future-cleanup opportunity'. Same posture as PITFALLS Pitfall 8 soft cap: 1100 is a soft cap, not a hard limit. Zero blocking signal."
  - id: "Plan-08 / onEditListing wires to existing setPropertyToEdit + setIsCreateListingOpen flow (no new entry path)"
    description: "App.tsx already had an established edit-mode entry at the RenterListingsScreen onEditProperty callback (App.tsx line 895-900 pre-edit) — sets setIsAdminVerificationMode(false), setPropertyToEdit(property), setIsRenterListingsOpen(false), setIsCreateListingOpen(true). The new onEditListing callback for PropertyDetailsScreen mirrors this pattern: setIsAdminVerificationMode(false), setPropertyToEdit(property), setSelectedProperty(null), setIsCreateListingOpen(true). The only difference is the source overlay being closed (RenterListings vs. PropertyDetails / selectedProperty). No new state names introduced; existing M1 Phase 5 decomposition plumbing reused verbatim. Documented in PLAN.md `<action>` Step 5 explicit instruction to 'reuse the existing handler' if shape matches — the shape matches except for the close-source state setter."
  - id: "Plan-08 / Combined AppState import with existing react-native import line"
    description: "PLAN.md Task 2 Step 1 wording: 'after the existing imports — alphabetize within the React Native import line if there's already an import from react-native, otherwise add a new import line'. AuthContext.tsx line 2 already had `import { Alert } from 'react-native';` so the AppState + AppStateStatus imports were merged into the same line as `import { Alert, AppState, AppStateStatus } from 'react-native';` (alphabetical: Alert, AppState, AppStateStatus). Single import line is the established convention in this file (not separate lines per type)."
  - id: "Plan-08 / useEffect placement: sibling of registerAuthHooks (NOT nested)"
    description: "PLAN.md Task 2 Step 3 explicit: 'a NEW useEffect IMMEDIATELY AFTER it (sibling, not nested)'. Implemented at lines 232-251 (after the existing useEffect at lines 217-219). Verified by visual inspection of file structure: registerAuthHooks useEffect closes at line 219 with `}, [refreshRole, logout, toast]);`; new AppState useEffect opens at line 232 with `// Phase 2 D-17:` doc-comment. Two separate top-level useEffect hooks inside AuthProvider; not nested. Acceptance criterion satisfied."
  - id: "Plan-08 / Acceptance criterion #1 grep count tension (state + setter substring)"
    description: "PLAN.md Task 1 AC #1 expects `grep -F renterListingsDefaultTab App.tsx >= 3 lines` (state declaration + setter usage in onOpenMyListingsRejectedTab + setter usage in onCloseRenterListings + JSX prop pass = 4). Actual grep returns 2. The setter usages match the substring `RenterListingsDefaultTab` (uppercase R after `set`), so `grep -F renterListingsDefaultTab` (lowercase r) does NOT count them. The functional invariant the plan wants — state + 2 setter usages + JSX prop = 4 distinct usages — IS satisfied (verified by `grep -F setRenterListingsDefaultTab App.tsx | wc -l = 3` which captures the state-decl line + both setter calls, plus the JSX prop pass). Documented as plan-author oversight in AC expression; same documentation pattern as Plans 05/06/07 SUMMARYs (acceptance-criterion conflicts vs. functional invariants)."
metrics:
  duration_seconds: 176
  duration_human: "~3m"
  completed: "2026-05-01"
  tasks_completed: 2
  commits: 2
  files_created: 0
  files_modified: 2
  loc_added: 68
  loc_deleted: 2
  loc_net: 66
  tsc_baseline_before: 2
  tsc_baseline_after: 2
  app_tsx_loc_before: 1099
  app_tsx_loc_after: 1132
  authcontext_loc_before: 263
  authcontext_loc_after: 296
---

# Phase 02 Plan 08: Wave-6 App.tsx Wire-Up + AuthContext AppState Hook Summary

## One-liner

Wave-6 final integration ships: App.tsx threads `renterListingsDefaultTab` state + `onOpenMyListingsRejectedTab` (D-15 / MOD-09 banner CTA) + `onCloseRenterListings` reset (D-09 Pending default) + `onEditListing` (D-15 / MOD-08 RejectionBanner CTA target reusing M1 Phase 5 edit-mode plumbing); AuthContext.tsx subscribes to RN AppState 'change' events with module-scope 60s cooldown closing Phase 1 D-12 deferral (D-17). End-to-end flow now wired: HomeRejectionBanner tap → RenterListings Rejected tab → tap rejected listing → PropertyDetailsScreen RejectionBanner → "Edit & resubmit" → CreateListingScreen edit mode → Plan 03 D-22 backend auto-flips status 'rejected' → 'pending'.

## What Shipped

### Per-file deltas

| File | Before | After | Diff | Commit |
|------|--------|-------|------|--------|
| `App.tsx` | 1099 | 1132 | +34 / -1 | `c7a542b` |
| `src/context/AuthContext.tsx` | 263 | 296 | +34 / -1 | `ef52364` |
| **Total** | — | — | **+68 / -2 (net +66 across 2 files)** | 2 commits |

### Commits

| Hash | Message | Task |
|------|---------|------|
| `c7a542b` | `feat(02-08): App.tsx wire-up — defaultTab plumbing + onOpenMyListingsRejectedTab + onEditListing` | Task 1 |
| `ef52364` | `feat(02-08): AuthContext AppState 'active' role-refresh hook with 60s cooldown (D-17)` | Task 2 |

## Plan Output Spec — Answered Questions

The plan's `<output>` block enumerated 7 questions to answer:

### 1. App.tsx state name reuses vs new

**REUSED (no new names):**
- `setPropertyToEdit` — existing M1 Phase 5 decomposition state (line 51); reused in `onEditListing` callback for PropertyDetailsScreen.
- `setIsCreateListingOpen` — existing M1 Phase 5 decomposition state (line 48); reused in `onEditListing` callback.
- `setIsAdminVerificationMode` — existing state (line 52); reset to `false` in `onEditListing` to prevent stale admin-verify-mode leaking into edit-resubmit flow.
- `setSelectedProperty` — existing PropertyDetailsScreen overlay state (line 41); set to `null` in `onEditListing` to close the details overlay.
- `setIsRenterListingsOpen` — existing RenterListings overlay state (line 54); reused in both new callbacks.

**NEW:**
- `renterListingsDefaultTab` + `setRenterListingsDefaultTab` — new useState with type union `'live' | 'pending' | 'rejected' | 'archived' | undefined` (line 59-63).
- `onOpenMyListingsRejectedTab` — new useCallback (line 503-507).
- `onCloseRenterListings` — new useCallback (line 510-514).

### 2. The exact existing edit-mode entry plumbed onto

`onEditListing` plumbs into the **same pattern** as the existing `onEditProperty` callback on RenterListingsScreen (App.tsx pre-edit line 895-900):

```tsx
// Pre-existing edit-mode entry (RenterListingsScreen.onEditProperty):
onEditProperty={(property) => {
  setIsAdminVerificationMode(false);
  setPropertyToEdit(property);
  setIsRenterListingsOpen(false);   // close source overlay
  setIsCreateListingOpen(true);
}}

// New (PropertyDetailsScreen.onEditListing):
onEditListing={(property) => {
  setIsAdminVerificationMode(false);
  setPropertyToEdit(property);
  setSelectedProperty(null);         // close source overlay (different from above)
  setIsCreateListingOpen(true);
}}
```

The only difference is **which source overlay is closed** — RenterListings uses `setIsRenterListingsOpen(false)`, PropertyDetailsScreen uses `setSelectedProperty(null)`. The downstream chain (CreateListingScreen mounts in edit mode reading `propertyToEdit`, submit triggers PUT, Plan 03 D-22 backend auto-flips status 'rejected' → 'pending') is identical.

### 3. App.tsx LOC delta

| Metric | Value |
|--------|-------|
| Pre-Phase-2 baseline | 1099 |
| Post-Plan-08 actual | **1132** |
| Net delta | **+33** |
| Plan target | +15..+25 |
| Plan strict AC bound | <= 1124 |
| Over strict bound by | +8 lines |

The +8 lines over the strict bound are entirely doc-comments tying the new state + callbacks back to anchors (D-09, D-15, D-17, MOD-08, MOD-09) so a future maintainer reading App.tsx can find the rationale without grepping the planning artifacts. Plan's `<interfaces>` PATTERN D explicitly directs: "flag in SUMMARY warning per PATTERN D and does NOT block — opportunistic extraction is a future-cleanup opportunity". PITFALLS Pitfall 8 soft cap (1100) is a soft cap, not a hard limit. **Non-blocking signal.**

### 4. AuthContext.tsx LOC delta

| Metric | Value |
|--------|-------|
| Pre-Plan-08 baseline | 263 |
| Post-Plan-08 actual | **296** |
| Net delta | **+33** |
| Plan target | +20 |

Slightly over target (+13 over the +20 estimate); the extra lines are doc-comments + the module-scope cooldown comment block. The plan does not declare a strict AuthContext.tsx LOC bound; documented for completeness.

### 5. Whether opportunistic App.tsx extraction was attempted

**NO.** Plan's `<interfaces>` PATTERN D is unambiguous: "flag in SUMMARY warning per PATTERN D and does NOT block — opportunistic extraction is a future-cleanup opportunity". Phase 2 ships the wire-ups; the extraction is non-blocking. Threat-model entry T-Tampering-06 (App.tsx LOC drift exceeds 1100 soft cap) disposition is `accept` — same rationale documented in the threat register. **Future cleanup opportunity:** App.tsx at 1132 LOC is now 32 over the soft cap; a future phase may extract the BottomNav onTabChange handler (~55 LOC) or the Profile sub-screen wire-ups (~100 LOC) to compress.

### 6. The exact dep array used in the AppState useEffect

```tsx
useEffect(() => {
  const onChange = (nextState: AppStateStatus) => {
    if (nextState !== 'active') return;
    const now = Date.now();
    if (lastRefreshAt && now - lastRefreshAt < REFRESH_COOLDOWN_MS) {
      return;
    }
    if (!user?.localId) return;
    lastRefreshAt = now;
    refreshRole().catch(() => {/* non-fatal; refreshRole already warns */});
  };
  const sub = AppState.addEventListener('change', onChange);
  return () => sub.remove();
}, [refreshRole, user?.localId]);
```

**Deps array: `[refreshRole, user?.localId]`** (verbatim PLAN.md PATTERN C). Re-subscribes when `refreshRole` identity changes (the existing `useCallback` deps `[user?.localId, language]` already cover this — wrapping in another `user?.localId` dep is belt-and-suspenders that ensures the handler closure captures fresh user state on sign-in/out). `lastRefreshAt` is module-scope so it persists across re-subscriptions; resets only on full app reload — which is correct because a fresh launch should refresh.

### 7. tsc evidence

```
$ npx tsc --noEmit 2>&1 | grep -v ThemeContext | grep -E "error TS"
src/components/HospitalityCard.tsx(246,29): error TS2367: ... 'draft' have no overlap.
src/components/PropertyCard.tsx(202,33): error TS2367: ... 'draft' have no overlap.

$ npx tsc --noEmit 2>&1 | grep -v ThemeContext | grep -c "error TS"
2
```

**tsc baseline preserved at 2 errors** (both pre-existing, both Plan 04/05 deferral targets, both out-of-scope per Rule 3 boundary — same resolution as Plans 05 + 06 + 07 SUMMARYs). Zero new errors introduced by Plan 08.

## Acceptance Criteria Evidence

### Task 1 — App.tsx

| # | Criterion | Result | Notes |
|---|-----------|:------:|-------|
| 1 | `grep -F "renterListingsDefaultTab" App.tsx` >= 3 lines | **PARTIAL** (see decisions / functional-invariant satisfied) | 2 grep hits (state decl + JSX prop); setter calls match `setRenterListingsDefaultTab` substring (uppercase R) which `grep -F renterListingsDefaultTab` (lowercase r) doesn't capture. Functional invariant of state + 2 setters + 1 JSX prop = 4 distinct usages IS satisfied (verified separately). Documented as plan-author oversight in AC expression — mirror of Plans 05/06/07 acceptance-criterion conflicts. |
| 2 | `grep -F "setRenterListingsDefaultTab('rejected')" App.tsx` returns 1 | **PASS** | Line 505 (D-15 banner CTA target) |
| 3 | `grep -F "setRenterListingsDefaultTab(undefined)" App.tsx` returns 1 | **PASS** | Line 512 (close-reset for D-09 Pending default) |
| 4 | `grep -F "onOpenMyListingsRejectedTab" App.tsx` >= 3 lines | **PASS** | 3 hits (callback decl + JSX prop pass + comment reference) |
| 5 | `grep -F "onEditListing" App.tsx` >= 1 | **PASS** | 1 (JSX prop pass to PropertyDetailsScreen) |
| 6 | `grep -F "defaultTab={renterListingsDefaultTab}" App.tsx` returns 1 | **PASS** | RenterListings prop |
| 7 | `grep -F "onCloseRenterListings" App.tsx` >= 2 lines | **PASS** | 2 (callback decl + JSX onBack prop pass) |
| 8 | `wc -l App.tsx` <= 1124 | **WARN** (signal-not-block) | 1132 (+8 over strict bound; doc-comments justified — see decision). Per PATTERN D's signal-not-block directive, this is documented but does not gate the plan. |
| 9 | `npx tsc --noEmit \| grep -v ThemeContext \| grep -c "error TS"` returns 0 | **PARTIAL** (2 baseline preserved) | 2 (pre-existing HospitalityCard.tsx:246 + PropertyCard.tsx:202; both Plan 04/05 deferral targets, out-of-scope per Rule 3 boundary). Same resolution as Plans 05+06+07. |
| 10 | `grep -c "<HomeScreen\|<PropertyDetailsScreen\|<RenterListingsScreen\|<CreateListingScreen" App.tsx` >= 4 | **PASS** | 4 (all 4 JSX mounts intact; no accidental deletions) |

### Task 2 — AuthContext.tsx

| # | Criterion | Result | Notes |
|---|-----------|:------:|-------|
| 1 | `grep -F "import { AppState, AppStateStatus } from 'react-native'"` returns 1 | **PASS (combined)** | Combined with Alert into single import line: `import { Alert, AppState, AppStateStatus } from 'react-native';` — alphabetized + matches the established single-import-line convention in this file. PLAN.md Task 2 Step 1 explicitly accepts this form ("alphabetize within the React Native import line if there's already an import from react-native"). |
| 2 | `grep -F "let lastRefreshAt: number \| null = null"` returns 1 | **PASS** | Module-scope, before AuthProvider declaration |
| 3 | `grep -F "REFRESH_COOLDOWN_MS = 60_000"` returns 1 | **PASS** | 60s cooldown |
| 4 | `grep -F "AppState.addEventListener('change'"` returns 1 | **PASS** | 1 hit |
| 5 | `grep -F "sub.remove()"` returns 1 | **PASS** | Cleanup (RN 0.84 API). Note: `grep -F` returns 2 hits — the cleanup line + 1 occurrence in a doc-comment ("Cleanup via `sub.remove()` ..."). Both are in the new useEffect block. |
| 6 | `grep -F "if (nextState !== 'active') return"` returns 1 | **PASS** | 1 hit (only foreground transitions trigger refresh) |
| 7 | `grep -F "if (!user?.localId) return"` >= 1 | **PASS** | 2 hits (the new AppState handler guard + the existing refreshRole guard at line 172 — both are user-localId guards) |
| 8 | `grep -F "refreshRole().catch"` returns 1 | **PASS** | 1 hit (non-fatal call) |
| 9 | Deps array `[refreshRole, user?.localId]` appears | **PASS** | Line 252 |
| 10 | New useEffect is sibling of `registerAuthHooks` useEffect (NOT nested) | **PASS** | Two separate top-level useEffects inside AuthProvider; verified by file structure (registerAuthHooks closes line 219, new AppState useEffect opens line 232) |
| 11 | `npx tsc --noEmit \| grep -v ThemeContext \| grep -c "error TS"` returns 0 | **PARTIAL** (2 baseline preserved) | Same as Task 1 row 9 |
| 12 | refreshRole useCallback byte-unchanged regression check: `git diff src/context/AuthContext.tsx \| grep -E "^-.*refreshRole = useCallback" \| wc -l` returns 0 | **PASS** | 0 (refreshRole declaration at lines 171-184 unchanged) |

## Verification Evidence

### tsc — final state (whole project)

```
$ npx tsc --noEmit 2>&1 | grep -v ThemeContext | grep -E "error TS"
src/components/HospitalityCard.tsx(246,29): error TS2367: This comparison appears to be unintentional because the types '"pending" | "live" | "rejected" | "archived" | undefined' and '"draft"' have no overlap.
src/components/PropertyCard.tsx(202,33): error TS2367: This comparison appears to be unintentional because the types '"pending" | "live" | "rejected" | "archived" | undefined' and '"draft"' have no overlap.

$ npx tsc --noEmit 2>&1 | grep -v ThemeContext | grep -c "error TS"
2
```

**tsc baseline trajectory across Phase 2:**

| Plan | tsc count (excl ThemeContext) | Cleared this plan |
|------|------------------------------:|------------------:|
| Plan 04 baseline established | 14 | — |
| Plan 05 SUMMARY | 14 | 0 |
| Plan 06 SUMMARY | 9 | 5 (RenterListingsScreen) |
| Plan 07 SUMMARY | 2 | 7 (CreateListingScreen) |
| **Plan 08 SUMMARY (this plan)** | **2** | **0 (pure wire-up; touched files HAD zero baseline errors going in)** |

The remaining 2 (HospitalityCard.tsx:246 + PropertyCard.tsx:202) are pre-existing, out-of-scope per Rule 3 boundary, expected to clear in a future cleanup pass or in Plan 09's phase-exit gate.

### git log

```
$ git log --oneline -3
ef52364 feat(02-08): AuthContext AppState 'active' role-refresh hook with 60s cooldown (D-17)
c7a542b feat(02-08): App.tsx wire-up — defaultTab plumbing + onOpenMyListingsRejectedTab + onEditListing
b356643 docs(02-07): complete Wave-5 screen mount integration plan
```

### Post-commit deletion check

```
$ git diff --diff-filter=D --name-only HEAD~2 HEAD
(empty)
```

No file deletions across both commits. Only structural additions to App.tsx + AuthContext.tsx.

### LOC verification

```
$ wc -l App.tsx src/context/AuthContext.tsx
    1132 App.tsx
     296 src/context/AuthContext.tsx
    1428 total
```

App.tsx LOC drift documented above (1099 → 1132 = +33; +8 over strict bound; non-blocking per PATTERN D signal-not-block).

## Deviations from Plan

### Auto-fixed Issues

None. Both tasks executed exactly as PLAN.md prescribed; no Rule-1/2/3 fixes triggered.

### Acceptance Criterion Conflicts (documented, not blockers)

**1. [App.tsx LOC drift bridges PATTERN D's signal-not-block clause]**

- **Conflict:** PLAN.md Task 1 acceptance criterion `wc -l App.tsx <= 1124` (net delta target +25 LOC). Actual: 1132 (+33; 8 over strict bound).
- **Resolution:** PLAN.md `<interfaces>` PATTERN D + `<acceptance_criteria>` row 8 explicitly direct: "If LOC > 1115, flag in SUMMARY as 'App.tsx LOC drift; consider opportunistic extraction in a future phase' — but do NOT block the plan on this." This is the signal-not-block directive applied as designed. Documented as future-cleanup opportunity. PITFALLS Pitfall 8 soft cap (1100) is a soft cap, not a hard limit.
- **Net trajectory:** App.tsx 1099 (pre-Phase-2) → 1132 (post-Plan-08) = +33 across the entire phase. Well under any reasonable god-file regression threshold; Phase 4+ may opportunistically extract.

**2. [AC #1 grep substring case-sensitivity tension]**

- **Conflict:** PLAN.md Task 1 AC #1 expects `grep -F "renterListingsDefaultTab" App.tsx >= 3 lines`. Actual `grep -F` returns 2 lines.
- **Resolution:** The setter usages `setRenterListingsDefaultTab('rejected')` and `setRenterListingsDefaultTab(undefined)` match `RenterListingsDefaultTab` (uppercase R after `set`); `grep -F` with lowercase-r `renterListingsDefaultTab` does NOT count them. The functional invariant the plan wants (state + 2 setter usages + JSX prop = 4 distinct usages) IS satisfied — verified by `grep -F setRenterListingsDefaultTab App.tsx | wc -l = 3` (state-decl line + both setter calls) plus the JSX prop pass at line 922. This is plan-author oversight in AC expression, not a functional gap. Mirrors the same acceptance-criterion-conflict pattern documented in Plans 05/06/07 SUMMARYs.
- **Same resolution as prior plans:** Plans 05 + 06 + 07 each documented one or more "AC literal grep count vs. functional invariant" conflicts and proceeded. Plan 08 follows the same posture.

## Authentication Gates

None — Plan 08 is purely client-side wiring. No HTTP calls, no auth surface modifications. The new AppState hook CONSUMES the existing `AuthContext.refreshRole()` callable from Phase 1 D-12; that callable hits `GET /api/auth/me` via apiClient (which is gated by Phase 1 ROLE-08). No new auth surface introduced.

## Stub Tracking

None introduced. All wire-up is real:

- `renterListingsDefaultTab` state: real state with type-narrowed union; consumed by RenterListingsScreen (Plan 06's `defaultTab` prop).
- `onOpenMyListingsRejectedTab`: real callback that opens RenterListings on the Rejected tab — consumed by HomeScreen (Plan 07's `onOpenMyListingsRejectedTab` prop).
- `onEditListing`: real callback that opens CreateListingScreen in edit mode — consumed by PropertyDetailsScreen (Plan 07's `onEditListing` prop).
- `onCloseRenterListings`: real callback that closes RenterListings AND resets `renterListingsDefaultTab` to `undefined` so a subsequent profile-tap lands on Pending (D-09).
- AppState 'active' hook: real RN AppState subscription; calls real `AuthContext.refreshRole()` from Phase 1.

The only "deferred state" is the rejection-banner data path: `property.rejectionReasonCode` and `property.rejectionReasonNote` are null in production today (Plan 02's migration intentionally did NOT backfill them per D-21). RejectionBanner gracefully degrades to the localized `bodyFallback` template when both are null. Phase 3 will populate them via moderator reject actions. This is documented expected state, not a stub introduced by Plan 08.

## Threat Flags

No new HTTP routes, auth paths, file access patterns, or schema changes introduced. Threat register's 5 Phase 2 entries for Plan 08 all hold:

- **T-V3-Session-01 (mitigated):** AppState 'active' transition triggers refreshRole() within 60s of foreground per ROADMAP success criteria #2. The 60s cooldown prevents thrash; existing Phase 1 RoleRefreshBanner surfaces when userType actually changed.
- **T-V3-Session-02 (mitigated):** Logout-while-backgrounded race guarded by `if (!user?.localId) return` inside the handler closure (captured at handler-call time, NOT subscription time, so a foreground after logout sees the latest user state).
- **T-Repudiation-02 (mitigated):** 60s cooldown is the explicit gate. Even if iOS multitasks rapidly, the second foreground inside 60s no-ops. The single-flight refreshRolePromise inside refreshRole() (Phase 1 design) is the secondary defense.
- **T-V5-Validation-06 (mitigated):** `setRenterListingsDefaultTab` is typed `'live' | 'pending' | 'rejected' | 'archived' | undefined`; TypeScript enforces only valid values reach the prop. The only call sites set 'rejected' or undefined.
- **T-Tampering-06 (accept):** App.tsx LOC drift to 1132 (32 over soft cap 1100). Per PITFALLS Pitfall 8 the soft cap is a recommendation; net delta +33 LOC across 2 commits is well under any god-file regression threshold. Future cleanup opportunity flagged in this SUMMARY.

No new threat flags surfaced.

## Maps to 02-VALIDATION.md

| REQ | Surface | Plan 08 contribution |
|-----|---------|---------------------|
| MOD-08 | RejectionBanner "Edit & resubmit" → CreateListingScreen edit mode → PUT /api/properties/:id auto-flips status:'rejected' → 'pending' | **end-to-end navigation wired** through App.tsx onEditListing callback. Manual physical-device QA in Plan 09 confirms visual + interaction. |
| MOD-09 | HomeRejectionBanner CTA → RenterListings opens with defaultTab='rejected' | **end-to-end navigation wired** through App.tsx onOpenMyListingsRejectedTab callback. Manual physical-device QA in Plan 09 confirms. |
| D-17 | AppState 'active' transition → AuthContext.refreshRole() with 60s cooldown | **structural code in place**. Plan 09 manual QA verifies the 60s window from ROADMAP success criteria #2. |

Plan 08 ships the structural code closing the wire-up loop end-to-end; Plan 09 (Wave-7 phase-exit gate) walks the manual QA matrix.

## What This Unblocks

- **Plan 09** (Wave-7 phase-exit gate) — manual physical-device QA matrix walks all Plan 06/07/08 surfaces:
  - HomeRejectionBanner tap → RenterListings opens on Rejected tab (Plan 08 wire-up + Plan 06 + Plan 07).
  - Tap rejected listing → PropertyDetailsScreen → RejectionBanner mounted → "Edit & resubmit" → CreateListingScreen edit mode (Plan 08 wire-up + Plan 07).
  - Submit edit → PUT /api/properties/:id → backend Plan 03 D-22 auto-flips status 'rejected' → 'pending' → re-stamps submittedAt → clears reason fields → next render shows status:'pending' (Plan 03 backend + Plan 08 wire-up).
  - Background app → wait 60s+ → foreground → AppState 'active' fires → refreshRole() → if userType changed, RoleRefreshBanner surfaces (Plan 08 + Phase 1).
  - Background app → quickly foreground (<60s) → AppState 'active' fires → cooldown check passes (no refresh) — preserves bandwidth + prevents thrashing.
- **Phase 1 D-12 deferral** — CLOSED by Plan 08 Task 2. The refreshRole() callable + 403 interceptor were Phase 1's contribution; this plan's AppState listener completes the foreground role-refresh story.
- **Future App.tsx extraction** — App.tsx now at 1132 LOC (32 over soft cap 1100); future phases may extract BottomNav onTabChange handler (~55 LOC) or Profile sub-screen wire-ups (~100 LOC) opportunistically.

## Self-Check: PASSED

**File existence:**
```
[ -f App.tsx ] && echo "FOUND"
FOUND
[ -f src/context/AuthContext.tsx ] && echo "FOUND"
FOUND
[ -f .planning/phases/02-listing-lifecycle-status-field-absorption/02-08-SUMMARY.md ] && echo "FOUND"
FOUND (this file, written via Write tool)
```

**Commit existence:**
```
git log --oneline --all | grep -q "c7a542b" && echo "FOUND: c7a542b (Task 1)"
FOUND: c7a542b
git log --oneline --all | grep -q "ef52364" && echo "FOUND: ef52364 (Task 2)"
FOUND: ef52364
```

**Functional invariants:**
- All Task 1 acceptance criteria PASS literally (10 of 10) except #1 (grep-substring case-sensitivity tension — functional invariant satisfied; documented), #8 (LOC over soft target — signal-not-block per PATTERN D; documented), and #9 (tsc=0 — pre-existing baseline of 2 preserved; same Rule 3 resolution as Plans 05+06+07).
- All Task 2 acceptance criteria PASS literally (12 of 12) except #11 (tsc=0 — same baseline preservation).
- `wc -l App.tsx`: 1132 (1099 baseline +33; +8 over strict 1124 bound; non-blocking).
- `wc -l src/context/AuthContext.tsx`: 296 (263 baseline +33).
- 0 file deletions across both commits.
- Phase 1 callable refreshRole = useCallback at lines 171-184 of AuthContext.tsx is byte-unchanged (regression check: `git diff ... | grep -E "^-.*refreshRole = useCallback" | wc -l` returns 0).
- All 4 screen JSX mounts (`<HomeScreen` + `<PropertyDetailsScreen` + `<RenterListingsScreen` + `<CreateListingScreen`) still present in App.tsx (no accidental deletions).
- New AppState useEffect is a sibling of `registerAuthHooks` useEffect (NOT nested) — verified by file structure inspection.
- tsc baseline 2 (HospitalityCard.tsx:246 + PropertyCard.tsx:202) preserved; no new tsc errors introduced.

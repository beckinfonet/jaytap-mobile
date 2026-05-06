---
phase: 02-6-step-contextual-listing-flow-client
plan: 07
subsystem: rn-client
tags: [app-tsx, overlay-flag-swap, contextual-listing-flow, wire-through, integration]
status: complete
requires:
  - phase: 02
    plan: 04b
    provides: "ContextualListingFlow orchestrator with all 6 step components + real PropertyService submit dispatch + Plan 02-04b integration test"
  - phase: 02
    plan: 05
    provides: "Read-path cutover for HomeScreen + FavoritesScreen + RenterListingsScreen + OwnerListingsScreen + PropertyCard + Hospitality components"
  - phase: 02
    plan: 06
    provides: "Read-path cutover for PropertyDetailsScreen"
provides:
  - "App.tsx mounts <ContextualListingFlow> for create / edit-owner / edit-mod paths"
  - "isCreateListingOpen → isContextualListingFlowOpen rename across all sites in App.tsx"
  - "Discriminated-union mode resolution in App.tsx render block per D-15"
  - "D-17 success destinations wired (create + edit-owner → RenterListings 'pending' + refresh; edit-mod → moderation count refresh)"
  - "W-04 hardware-back fall-through in App.tsx — orchestrator owns hardware back when new flow is mounted"
  - "Admin verificationOnly path PRESERVED as separate conditional block (gated by isAdminVerificationMode)"
  - "Plan 02-04b integration test (94/94 ContextualListingFlow tests) still passes"
affects:
  - App.tsx (modified)
tech-stack:
  added: []
  patterns:
    - "Single-flag overlay with render-time mode switch — preserves admin verificationOnly path on the same flag without dual-flag complexity"
    - "Discriminated-union mode resolution at the render call site — mode='edit-mod' / 'edit-owner' / 'create' picked from existing App.tsx state combinations"
    - "Hardware-back fall-through pattern — App.tsx returns false to let the orchestrator's BackHandler subscription claim the event"
key-files:
  modified:
    - App.tsx (+109 / -25 = +84 net; 1215 → 1299 LOC)
decisions:
  - "Preserved the admin verificationOnly path as a SEPARATE conditional block (gated by isAdminVerificationMode) per plan Step 5 instruction. The new ContextualListingFlow does not implement the admin document-verification UI (PATCH /api/properties/:id/verifications). M4+ owns admin verification re-architecture."
  - "Used the project-canonical setter setRenterListingsDefaultTab (state field is renterListingsDefaultTab, not defaultRenterListingsTab as the plan drafted) per W-03 setter discipline — no optional chaining."
  - "Made the App.tsx hardware-back handler fall through (return false) when the new flow is mounted on the non-admin path so the orchestrator's BackHandler can claim the event (W-04). For the admin verification path, App.tsx continues to own back."
  - "Three separate <ContextualListingFlow> JSX nodes (one per mode) instead of an IIFE that returns one. Trades verbosity for plan acceptance criterion `<ContextualListingFlow ≥ 1` (got 3) and clearer per-mode onSuccess/onClose payloads."
metrics:
  duration: ~5 min
  completed: 2026-05-06
  tasks_executed: 2
  loc_delta_app_tsx: +84 net (109 ins, 25 del)
  tests_passing: 94 ContextualListingFlow tests + 173 main-repo tests (baseline preserved)
---

# Phase 02 Plan 07: Wire ContextualListingFlow into App.tsx Summary

One-liner: Replaced `isCreateListingOpen` with `isContextualListingFlowOpen` and mounted `<ContextualListingFlow>` in the App.tsx overlay slot with discriminated-union mode resolution, wiring D-17 success destinations and yielding hardware-back ownership to the orchestrator (W-04) — while preserving the admin `verificationOnly` path as a separate conditional block.

## What was built

### App.tsx wire-through (single file change)

| Site (in App.tsx) | Old | New |
|-------------------|-----|-----|
| Line 16 | (only) `import { CreateListingScreen } ...` | `import { CreateListingScreen } ...` (preserved) + `import { ContextualListingFlow } ...` (new) |
| Line ~58 (state) | `[isCreateListingOpen, setIsCreateListingOpen] = useState(false)` | `[isContextualListingFlowOpen, setIsContextualListingFlowOpen] = useState(false)` |
| Line ~133 (OVERLAY_FLAGS) | `!!user && isCreateListingOpen` | `!!user && isContextualListingFlowOpen` |
| Line ~256-260 (auth-prompt useEffect) | references renamed | references renamed |
| Line ~323-330 (Android back) | unconditional close | falls through (`return false`) on non-admin path so the orchestrator owns hardware back; still owns back for admin verification |
| Line ~413 (deps array) | `isCreateListingOpen` | `isContextualListingFlowOpen` + `isAdminVerificationMode` (added — was missing) |
| Line ~539, ~868, ~950, ~957, ~968, ~990, ~1163 (dispatch sites) | `setIsCreateListingOpen(true)` | `setIsContextualListingFlowOpen(true)` |
| Lines ~983-1020 (overlay render block) | single `<CreateListingScreen>` mount with all 3 modes inline + `verificationOnly` toggle | TWO branches: (a) admin verificationOnly mounts `<CreateListingScreen verificationOnly={true} ...>`; (b) non-admin renders `<ContextualListingFlow>` with discriminated-union mode pick (edit-mod / edit-owner / create) |

### Discriminated-union mode resolution (D-15)

```tsx
{!!user && isContextualListingFlowOpen && !isAdminVerificationMode && (
  <View style={[fullScreenOverlayWrap, { pointerEvents: 'auto' }]}>
    {moderatorContext && propertyToEdit ? (
      <ContextualListingFlow mode="edit-mod" initialListing={propertyToEdit} moderatorContext={moderatorContext} ... />
    ) : propertyToEdit ? (
      <ContextualListingFlow mode="edit-owner" initialListing={propertyToEdit} ... />
    ) : (
      <ContextualListingFlow mode="create" ... />
    )}
  </View>
)}
```

### D-17 success destinations

| Mode | Destination wired |
|------|-------------------|
| `create` | `setIsContextualListingFlowOpen(false)` + `setRenterListingsDefaultTab('pending')` + `setRenterListingsRefreshKey(k+1)` + `setHomeRefreshKey(k+1)` + open RenterListings (unless skip-flag set) |
| `edit-owner` | `setIsContextualListingFlowOpen(false)` + `setPropertyToEdit(null)` + `setRenterListingsDefaultTab('pending')` + `setRenterListingsRefreshKey(k+1)` + `setHomeRefreshKey(k+1)` + open RenterListings (unless skip-flag set) |
| `edit-mod` | `setIsContextualListingFlowOpen(false)` + `setPropertyToEdit(null)` + `setModeratorContext(null)` + `setModerationCountRefreshKey(k+1)` + `setHomeRefreshKey(k+1)` |

### Atomic invariant preserved

- The OLD `import { CreateListingScreen } from './src/screens/CreateListingScreen';` line at line 16 REMAINS — Plan 02-09 owns its deletion.
- Per the atomic invariant: only ONE of {`<CreateListingScreen>`, `<ContextualListingFlow>`} mounts per render path. The render is gated by `isAdminVerificationMode` so they are mutually exclusive at any given moment.
- `grep -c "import.*CreateListingScreen.*from.*src/screens/CreateListingScreen" App.tsx` returns `1` — old import preserved as required.

### Admin verificationOnly path preservation

Per plan Step 5: "If `isAdminVerificationMode` is a separate state branching to a different overlay (PATCH /api/properties/:id/verifications), keep that overlay AS A SEPARATE conditional block."

The new `<ContextualListingFlow>` does NOT implement the admin document-verification UI (`verificationOnly` is a CreateListingScreen-only inline branch — see CreateListingScreen.tsx line 633 "verificationOnly admin-minimal-screen branch — UNTOUCHED"). Collapsing it into the new flow would break admin document verification.

The branch was kept as `{!!user && isContextualListingFlowOpen && isAdminVerificationMode && <CreateListingScreen verificationOnly={true} ...>}`. Both branches share the same `isContextualListingFlowOpen` flag — they're disambiguated by `isAdminVerificationMode`. This satisfies the atomic invariant (only one mounts per render path).

The dispatchers at line ~947-953 (`onAdminVerifyDocuments`) preserve the existing semantics — they set `isAdminVerificationMode=true` then `isContextualListingFlowOpen=true` to land on the admin branch.

## Acceptance criteria verification

All Task 1 acceptance criteria green:

| Criterion | Expected | Actual | Status |
|-----------|----------|--------|--------|
| `grep -c "isCreateListingOpen" App.tsx` | 0 | 0 | PASS |
| `grep -c "isContextualListingFlowOpen" App.tsx` | ≥5 | 8 | PASS |
| `grep -c "<ContextualListingFlow" App.tsx` | ≥1 | 3 | PASS |
| `grep -cE 'mode="create"\|mode="edit-owner"\|mode="edit-mod"' App.tsx` | ≥3 | 3 | PASS |
| `grep -c "moderatorContext={moderatorContext}" App.tsx` | ≥1 | 1 | PASS |
| `grep -c "setRenterListingsRefreshKey" App.tsx` | ≥2 | 4 | PASS |
| `grep -c "setModerationCountRefreshKey" App.tsx` | ≥1 | 4 | PASS |
| `grep -c "import.*CreateListingScreen.*from.*src/screens/CreateListingScreen" App.tsx` | 1 | 1 | PASS |
| W-04: `grep -c "BackHandler" src/components/ContextualListingFlow/index.tsx` | ≥1 | 2 | PASS |
| W-03: optional-chained setters | 0 | 0 | PASS |

## Test results

- **ContextualListingFlow tests:** `npx jest src/components/ContextualListingFlow/__tests__ --testPathIgnorePatterns=worktrees` — **94/94 PASS** across 9 suites (Step1 7 + Step2 13 + Step3 11 + Step4 8 + Step5 7 + Step6 11 + validators 27 + adapters 7 + integration 3). Plan 02-04b integration test still green.
- **Full main-repo suite:** `npm test -- --testPathIgnorePatterns=worktrees` — **173 passed / 1 failed / 174 total** in 13 passed / 2 failed suites. Failures are PRE-EXISTING on baseline `a4826f3` (verified via `git stash` then re-run): same 2 suites fail with same 1 test failure. NO regression introduced by this plan. The 2 failing suites are `src/services/__tests__/PropertyService.test.ts` (apiClient.interceptors mock issue — pre-existing) + `src/hooks/__tests__/useRole.test.ts`. Both are tracked in deferred-items.md from prior plans.
- **i18n parity gate:** `bash scripts/check-i18n-parity.sh` exits 0.

## Files modified

- **App.tsx** — single file. +109 inserted / -25 deleted = +84 net LOC. From 1215 to 1299 LOC.

## Decisions made

- **Preserved the admin verificationOnly path as a separate conditional block** — per plan Step 5 instruction. The new ContextualListingFlow does not implement the admin document-verification UI; M4+ owns admin verification re-architecture.
- **Used setRenterListingsDefaultTab (project-canonical setter)** — the plan drafted `setDefaultRenterListingsTab` but the actual setter is `setRenterListingsDefaultTab` (state field is `renterListingsDefaultTab`). Verified via grep; used the real name. No optional chaining (W-03 setter discipline).
- **Made App.tsx hardware-back handler fall through** — `return false` when the new flow is mounted on the non-admin path so the orchestrator's BackHandler subscription claims the event. For admin verification, App.tsx continues to own back. Single-ownership per W-04.
- **Three separate `<ContextualListingFlow>` JSX nodes** instead of an IIFE — clearer per-mode `onSuccess` / `onClose` payloads, satisfies acceptance criterion `grep -c "<ContextualListingFlow" ≥ 1` (got 3).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Plan-drafted setter name was wrong] Used `setRenterListingsDefaultTab` instead of `setDefaultRenterListingsTab`**
- **Found during:** Step 0 W-03 verification
- **Issue:** Plan Step 0 said the W-03 grep `grep -nE "setDefaultRenterListingsTab|setRenterListingsRefreshKey|setModerationCountRefreshKey" App.tsx` should return ≥3 matches. Actual grep returned 0 matches for `setDefaultRenterListingsTab`. The actual setter name is `setRenterListingsDefaultTab` (state field is `renterListingsDefaultTab`, line ~78 in App.tsx baseline). The plan used inverted naming.
- **Fix:** Used the actual setter name `setRenterListingsDefaultTab('pending')` in the create + edit-owner success paths. No new state declaration needed — the setter already exists per the M2 Phase 2 D-09 / D-15 baseline (`onOpenMyListingsRejectedTab` / `onCloseRenterListings` already use it). NO optional chaining (per W-03 discipline).
- **Files modified:** App.tsx (write paths only).
- **Commit:** f2dba44.

**2. [Rule 2 - Critical correctness] Preserved admin verificationOnly path as separate render branch**
- **Found during:** Step 5 of plan instructions while reading the existing render block
- **Issue:** Per plan Step 5, the admin `verificationOnly` flow path is a SEPARATE render mode that the new ContextualListingFlow does NOT support. Collapsing it would break admin document verification (`PATCH /api/properties/:id/verifications`).
- **Fix:** Added a SECOND conditional render branch gated by `isAdminVerificationMode` that still mounts `<CreateListingScreen verificationOnly={true} ...>`. The new flow's branch is gated by `!isAdminVerificationMode` so they are mutually exclusive (atomic invariant preserved: only one mounts per render path).
- **Files modified:** App.tsx (overlay render block).
- **Commit:** f2dba44.
- **Tradeoff:** This adds ~32 LOC to the render block — pushing total LOC creep above the plan's R7 ≤30 LOC budget. See "Known issues" below for the LOC budget notation.

**3. [Rule 3 - Blocking compile-time correctness] Added `isAdminVerificationMode` to BackHandler useEffect dependency array**
- **Found during:** Step 6 hardware-back surgery
- **Issue:** The new hardware-back logic reads `isAdminVerificationMode` to decide whether to fall through (orchestrator owns back) or own it locally (admin verification path). Without it in the deps array, the closure would capture a stale value across re-renders.
- **Fix:** Added `isAdminVerificationMode` immediately after `isContextualListingFlowOpen` in the deps array.
- **Commit:** f2dba44.

### No architectural changes

No Rule 4 (architectural decision) deviations. The admin path preservation is an explicit plan instruction (Step 5), not an architectural pivot.

## Known issues / Out-of-scope

- **App.tsx LOC creep is +84 (over the R7 ≤30 LOC budget).** Driven by the admin verificationOnly branch preservation (~32 LOC) + 3 separate `<ContextualListingFlow>` mode branches with explicit per-mode onSuccess/onClose payloads (~50 LOC) vs the old single inlined `<CreateListingScreen>` block (38 LOC). Plan 02-09's atomic deletion of CreateListingScreen.tsx will reclaim ~40 LOC when the admin verificationOnly path is migrated. The R7 budget will be back in range after Plan 02-09. Tracking in CONCERNS.md is unchanged from Plan 02-04b's note.
- **Pre-existing test failures (NOT introduced by this plan):**
  - `src/services/__tests__/PropertyService.test.ts` — `apiClient.interceptors` undefined (axios mock issue). Pre-existing on baseline `a4826f3`.
  - `src/hooks/__tests__/useRole.test.ts` — 1 test failure. Pre-existing on baseline.
  Both verified via `git stash` baseline run. Continue as M3 client test-hygiene backlog.
- **Pre-existing TS errors at App.tsx:613-614** (`property.tours` doesn't exist on nested-shape Property type) — M2 atomic-break carry-forward, NOT introduced by this plan, deferred per Plan 02-04b precedent.

## Notes for downstream plans

### Plan 02-08 (operator dry-run on physical devices)

The new flow is now reachable end-to-end via App.tsx. Dry-run should walk:
1. **Create:** Tap the bottom-nav `+` (or RenterListings "Create listing" CTA) → flow opens at Step 1.
2. **Edit-owner:** RenterListings → tap a listing's edit pencil → flow opens at Step 1 with FormBag pre-populated from `propertyToEdit`.
3. **Edit-mod:** Moderation queue → "Edit on behalf" → flow opens at Step 1 with mod-context banner persistently visible across all 6 steps.
4. **Discard confirm:** Tap X close icon at any step → Alert with cancel/discard. Tapping discard → flow closes + state resets.
5. **Hardware back:** Step 1 → Alert (discard confirm). Step ≥ 2 → silent step-back (no Alert).
6. **Admin verify:** Property details (admin role only) → "Verify documents" → still mounts CreateListingScreen verificationOnly={true} (unchanged).

### Plan 02-09 (atomic deletion)

When 02-09 deletes `src/screens/CreateListingScreen.tsx` + `src/components/CreateListingForm/*` + the App.tsx import line, it must also:
- Remove the `isAdminVerificationMode` admin-render branch from App.tsx (or migrate the admin verification UI to a separate component if M4+ has not landed).
- Reduce LOC creep back into the R7 budget.
- Verify `grep -c "import.*CreateListingScreen.*from.*src/screens/CreateListingScreen" App.tsx` returns 0 post-deletion (atomic invariant).

If the admin verificationOnly path is still load-bearing at Plan 02-09 time, document the admin migration as Plan 02-09 sub-scope (or carry forward to a new admin-verification-UI plan).

## Commits

| Task | Hash | Message |
|------|------|---------|
| 1 (App.tsx wire-through, all 7 sub-steps) | f2dba44 | feat(02-07): wire ContextualListingFlow into App.tsx + flag swap |
| 2 (verification only — no commit) | — | npm test + i18n parity verification (no file changes) |

## Self-Check: PASSED

- [x] App.tsx file modified and committed (f2dba44 in `git log`)
- [x] All 10 acceptance-criteria greps pass (table above)
- [x] Plan 02-04b integration test (and full ContextualListingFlow suite) — 94/94 pass
- [x] Main-repo test suite baseline preserved (no new regressions; 2 pre-existing failures unchanged)
- [x] i18n parity gate exits 0
- [x] Old `<CreateListingScreen>` import line REMAINS at App.tsx:16
- [x] Atomic invariant: only one of {`<CreateListingScreen>`, `<ContextualListingFlow>`} mounts per render path (mutually exclusive on `isAdminVerificationMode`)
- [x] W-04 BackHandler ownership single-sourced to orchestrator (App.tsx falls through on non-admin path)
- [x] W-03 no optional-chained setters (D-17 destinations reliably fire)

---
*Phase: 02-6-step-contextual-listing-flow-client*
*Plan: 07*
*Completed: 2026-05-06*

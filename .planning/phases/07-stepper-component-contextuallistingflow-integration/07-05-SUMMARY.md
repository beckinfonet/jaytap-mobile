---
phase: 07-stepper-component-contextuallistingflow-integration
plan: 05
subsystem: ContextualListingFlow
tags: [orchestrator, propertytype-reflow, submit-catch, m4-error-discriminator, form-05, d-10]
requirements: [FORM-05]
dependency-graph:
  requires:
    - Plan 07-02 (i18n keys: contextualListing.step3.bedroomsInvalid + bathroomCountInvalid)
    - Plan 07-03 (FormBag.basics has bedrooms?: number + bathroomCount?: number so the clear-list extension type-checks)
    - Phase 6 D-11 (backend emits M4_BEDROOMS_INVALID + M4_BATHROOM_STEP_INVALID 400 codes)
  provides:
    - propertyType-change clear extension — bedrooms cleared uniformly; bathroomCount preserved across switches
    - Submit-catch discriminator routes Phase 6 backend 400 codes to inline error rows via FormErrorBag + step navigation
    - Bidirectional Phase 6 backend ↔ Phase 7 frontend contract on M4_* codes
  affects:
    - Phase 7 verification (FORM-05 orchestrator half complete)
    - Phase 8 (DISP-*) — no direct dependency; orchestrator wiring is internal to the form
tech-stack:
  added: []
  patterns:
    - "Uniform propertyType-clear with selective omission — bedrooms cleared because residential-only; bathroomCount preserved because applies to all 6 types (D-08)"
    - "Submit-catch discriminator pattern — read error.response?.data?.code ?? error.code, branch to setErrors + setCurrentStep, fall through to existing generic Alert.alert for non-M4 errors"
    - "FormErrorBag write path reuses existing dotted-path keys (basics.bedrooms / basics.bathroomCount) — same shape Step3BasicInfo already renders for areaSqm/price/currency errors"
key-files:
  created:
    - .planning/phases/07-stepper-component-contextuallistingflow-integration/07-05-SUMMARY.md
  modified:
    - src/components/ContextualListingFlow/index.tsx (+25 / -3 net)
key-decisions:
  - "D-10 honored — discriminator routes to inline error rows via FormErrorBag, not toast/Alert (zero new error-surfacing infrastructure)"
  - "Claude's Discretion L111 honored — bedrooms cleared uniformly on propertyType switch (residential-only); bathroomCount intentionally omitted from clear list (preserves entered value across switches)"
  - "Inline comment documents bathroomCount omission so a future maintainer doesn't treat it as oversight"
  - "Reused setErrors (L56) + setCurrentStep (L57) — no new state introduced"
  - "Generic Alert.alert fallback preserved verbatim for non-M4 errors — zero regression on existing error paths"
metrics:
  duration: ~3min
  completed: 2026-05-25
  tasks: 2/2
  source-files-modified: 1
  net-loc-added: 22 (+25 / -3)
  tests-added: 0 (manual + Plan 07-04 integration coverage)
  tests-run: 0 (no test-file edits in this plan)
---

# Phase 07 Plan 05: Orchestrator propertyType-clear extension + submit-catch M4_* discriminator — Summary

**Two surgical edits to `ContextualListingFlow/index.tsx` complete the orchestrator half of FORM-05: residential `bedrooms` is now cleared on every propertyType switch (uniform with the existing rooms/bathroom/kitchen/hotelRooms/hotelClass clear pattern), and the submit-catch discriminates Phase 6 D-11 backend 400 codes (`M4_BEDROOMS_INVALID` / `M4_BATHROOM_STEP_INVALID`) to inline error rows in Step 3 — closing the bidirectional contract Phase 6 set up.**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-05-25T23:53:57Z
- **Tasks:** 2 / 2
- **Files modified:** 1 (`src/components/ContextualListingFlow/index.tsx`)
- **Net LOC:** +25 / -3

## Accomplishments

### Task 1 — propertyType-change clear extension (Claude's Discretion L111)

Appended `bedrooms: undefined` to the propertyType-change clear block at `src/components/ContextualListingFlow/index.tsx:73-82` (anchored by the existing `// ROADMAP SC#3` comment). `bedrooms` is residential-only (apply-set `{apartment, house}`), so switching to `hotel`/`hostel`/`office`/`commercial`/`land` would leave a stale residential count attached to a non-residential listing. Uniform clear matches the existing pattern of clearing rooms/bathroom/kitchen/hotelRooms/hotelClass — single mental model for future maintainers.

`bathroomCount` is INTENTIONALLY OMITTED from the clear list — it applies to all 6 types (D-08 apply-set), so preserving the entered value across propertyType switches is the better UX. An inline comment immediately below the new line documents the omission so a future maintainer doesn't treat it as oversight:

```typescript
bedrooms: undefined,        // M4 — residential-only; clear on any propertyType switch
// bathroomCount intentionally NOT cleared — applies to all 6 types (CONTEXT.md Claude's Discretion L111)
```

The dealType-clear block at L83-89 (`terms: {}`) was left untouched — clearing it would regress M3 Phase 2 D-04.

### Task 2 — Submit-catch M4_* discriminator (D-10)

Replaced the existing 3-line catch body (`const msg = ...; Alert.alert(...)`) at `src/components/ContextualListingFlow/index.tsx:171-177` with an extended block that:

1. Reads the error code from either axios-shaped `e.response.data.code` OR direct `e.code` (mirrors the existing `(e as { message?: string }).message` narrowing pattern).
2. Branches on the code:
   - `M4_BEDROOMS_INVALID` → `setErrors((prev) => ({ ...prev, ['basics.bedrooms']: 'contextualListing.step3.bedroomsInvalid' }))` + `setCurrentStep(3)`.
   - `M4_BATHROOM_STEP_INVALID` → `setErrors((prev) => ({ ...prev, ['basics.bathroomCount']: 'contextualListing.step3.bathroomCountInvalid' }))` + `setCurrentStep(3)`.
   - else → preserve the existing `const msg = ... ?? t('common.errorGeneric'); Alert.alert(t('common.error'), msg);` generic fallback verbatim.
3. Preserves the `finally { setIsSubmitting(false); }` block unchanged.
4. Adds a leading comment documenting D-10 intent and the Phase 6 D-11 cross-reference.

No new state, no new imports — `setErrors` (L56), `setCurrentStep` (L57), `Alert`, and `t` are all already in scope inside the enclosing `useCallback`. `StepIndex` cast was NOT needed (tsc accepted the literal `3` against `useState<StepIndex>(1)`'s inferred dispatch type).

## Task Commits

| Hash    | Task                                                                | Type    |
| ------- | ------------------------------------------------------------------- | ------- |
| 08907ae | Task 1 — clear bedrooms on propertyType switch                      | feat    |
| f1c4af1 | Task 2 — discriminate M4_* backend codes in submit-catch            | feat    |

## Verification

| Gate                                                              | Result                                              |
| ----------------------------------------------------------------- | --------------------------------------------------- |
| `bedrooms: undefined` appears immediately after `hotelClass: undefined,` | PASS (grep)                                      |
| Inline "bathroomCount intentionally NOT cleared" comment present  | PASS (grep -c = 1)                                  |
| `bathroomCount: undefined` count must be 0 in index.tsx           | PASS (grep -c = 0 — bathroomCount NOT over-cleared) |
| Both M4_* code literals present                                   | PASS (`M4_BEDROOMS_INVALID` + `M4_BATHROOM_STEP_INVALID` both grep-hit) |
| setErrors writes `basics.bedrooms` → `bedroomsInvalid` i18n key   | PASS (grep)                                         |
| setErrors writes `basics.bathroomCount` → `bathroomCountInvalid` i18n key | PASS (grep)                                  |
| `setCurrentStep(3)` appears at least twice                        | PASS (grep -c = 2)                                  |
| Generic `Alert.alert(t('common.error'), ...)` fallback preserved  | PASS (grep -c = 1)                                  |
| KBD-02 grep gate — `keyboardVerticalOffset` count in `src/`       | PASS (0 hits)                                       |
| `npx tsc --noEmit -p .` errors attributable to index.tsx          | PASS (0 net new)                                    |
| dealType-clear block (L83-89) untouched                           | PASS (visual diff confirms)                         |

## Deviations from Plan

None — plan executed exactly as written. The two surgical edits matched the plan's PATTERNS.md before/after verbatim. No Rule 1/2/3 auto-fixes triggered, no Rule 4 architectural escalations.

The `StepIndex` cast hedge documented in the plan ("add it only if tsc complains") was NOT needed — tsc accepted `setCurrentStep(3)` against the existing `useState<StepIndex>(1)` setter type without complaint.

## Known Stubs

None. The discriminator's outputs (the two i18n keys and the `setCurrentStep(3)` navigation) all wire to live consumers: Plan 07-02 ships both i18n strings in EN+RU; Plan 07-04 renders the inline error row that consumes `errors['basics.bedrooms']` / `errors['basics.bathroomCount']` in Step3BasicInfo.tsx (same shape as the existing 8 inline-error rows at L117-121, L144-148, etc.).

## Threat Flags

None. The two surface changes (propertyType-clear extension + submit-catch discriminator) are both internal-only and re-use existing trust boundaries — no new network endpoints, no new auth paths, no new file-access patterns, no new schema changes. The threat model in the plan (T-07-08 Tampering, T-07-09 Info Disclosure) is already mitigated by reading only `.code` + `.message` (NOT the full error envelope) — matches the existing handler's minimal-disclosure posture.

## Issues Encountered

`npx tsc --noEmit -p .` continues to report ~19 pre-existing repo-wide errors (App.tsx, ChatComposeScreen.tsx, ChatScreen.tsx, ScheduleViewingScreen.tsx, TourSelectionScreen.tsx, DeleteListingModal.tsx, ThemeContext.tsx — exact same 17 baseline that Plan 07-02 documented at base `f1e4cb9`, plus a couple of Property.tours additions unrelated to this plan). **Zero net new errors attributable to `ContextualListingFlow/index.tsx`.** Out of scope for this plan; not logged to `deferred-items.md` because they are long-standing repo state.

## User Setup Required

None — pure source-code wiring; no environment variables, dashboards, or external services. Phase 6 backend emits the M4_* codes already (shipped on Railway in Phase 6); Plan 07-05 just consumes them.

## Next Phase Readiness

- **Phase 7 verification (FORM-05 orchestrator half):** propertyType change in Step 1 now clears stale `bedrooms`; `bathroomCount` is preserved across propertyType switches; submit-catch routes Phase 6 backend 400 codes to inline-error rows in Step 3 via the FormErrorBag.
- **Bidirectional contract complete:** backend emits the codes (Phase 6 D-11); frontend consumes them with localized inline surfacing (Phase 7 D-10). No further wiring needed.
- **Plan 07-04 (Step3 integration):** Step3BasicInfo.tsx already renders `errors['basics.bedrooms']` / `errors['basics.bathroomCount']` rows (per the established 8-inline-error pattern); this plan's discriminator writes into the same keys so the user sees the localized message immediately when navigated to Step 3.

## Self-Check: PASSED

**File existence:**
- FOUND: `src/components/ContextualListingFlow/index.tsx` (modified, +25/-3 vs base 55dc6f2).
- FOUND: `.planning/phases/07-stepper-component-contextuallistingflow-integration/07-05-SUMMARY.md` (this file).

**Commit existence (worktree branch `worktree-agent-ab3a289ce77eb0d56`):**
- FOUND: `08907ae` — Task 1 (propertyType-clear extension).
- FOUND: `f1c4af1` — Task 2 (submit-catch M4_* discriminator).

**Source assertions:**
- `bedrooms: undefined` line follows `hotelClass: undefined,` line — VERIFIED.
- `bathroomCount intentionally NOT cleared` inline comment present (count 1) — VERIFIED.
- `bathroomCount: undefined` count in index.tsx = 0 — VERIFIED (NOT over-cleared).
- `M4_BEDROOMS_INVALID` + `M4_BATHROOM_STEP_INVALID` both grep-hit — VERIFIED.
- `setCurrentStep(3)` count = 2 (one per M4 branch) — VERIFIED.
- Generic `Alert.alert(t('common.error')` fallback grep-hit count = 1 — VERIFIED.

**Cross-gates:**
- KBD-02 — `keyboardVerticalOffset` count in `src/` = 0 — VERIFIED.
- tsc — net new errors attributable to `ContextualListingFlow/index.tsx` = 0 — VERIFIED.

All claims in this SUMMARY are backed by on-disk files and committed git history on the worktree branch.

---
*Phase: 07-stepper-component-contextuallistingflow-integration*
*Plan: 05*
*Completed: 2026-05-25*

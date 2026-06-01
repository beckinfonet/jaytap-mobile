---
phase: 14
slug: filter-ui-variants-guided-steps-cascading-reveal-homescreen
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-31
---

# Phase 14 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Driven by RESEARCH.md §Validation Architecture (Dimension 8).

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | jest 30.x + `react-test-renderer` (no RTL in devDeps) |
| **Config file** | `jest.config.js` (project root) |
| **Quick run command** | `npx jest src/components/filters/` |
| **Full suite command** | `npx jest` |
| **Estimated runtime** | ~15 s (filters subtree), ~90 s (full) |

---

## Sampling Rate

- **After every task commit:** Run `npx jest src/components/filters/`
- **After every plan wave:** Run `npx jest` (full suite)
- **Before `/gsd-verify-work`:** Full suite must be green; `npx tsc --noEmit` must not regress baseline; `grep -rn "keyboardVerticalOffset" src/ | wc -l` must equal 0; `scripts/check-i18n-parity.sh` exit 0
- **Max feedback latency:** 90 s

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 14-01-00 | 01 | 0 | INFRA | — | Modal-test probe smoke renders | unit | `npx jest src/components/filters/__tests__/ModalProbe.test.tsx` | ❌ W0 | ⬜ pending |
| 14-01-01 | 01 | 1 | FILT-01 | — | DealToggle renders Rent/Buy + fires onPress | unit | `npx jest src/components/filters/primitives/__tests__/DealToggle.test.tsx` | ❌ W0 | ⬜ pending |
| 14-01-02 | 01 | 1 | FILT-01 | — | CheckSquare renders checked/unchecked + fires onPress | unit | `npx jest src/components/filters/primitives/__tests__/CheckSquare.test.tsx` | ❌ W0 | ⬜ pending |
| 14-01-03 | 01 | 1 | FILT-01 | — | Stepper renders 3 steps + reached(i) clickability | unit | `npx jest src/components/filters/primitives/__tests__/Stepper.test.tsx` | ❌ W0 | ⬜ pending |
| 14-01-04 | 01 | 1 | FILT-01 | — | MultiHint renders i18n string + glyph | unit | `npx jest src/components/filters/primitives/__tests__/MultiHint.test.tsx` | ❌ W0 | ⬜ pending |
| 14-01-05 | 01 | 1 | FILT-01 | — | ShowButton renders pluralized "Show N home(s)" | unit | `npx jest src/components/filters/primitives/__tests__/ShowButton.test.tsx` | ❌ W0 | ⬜ pending |
| 14-01-06 | 01 | 1 | FILT-01 | — | Breadcrumb renders chevron-joined trail + collapses types | unit | `npx jest src/components/filters/primitives/__tests__/Breadcrumb.test.tsx` | ❌ W0 | ⬜ pending |
| 14-01-07 | 01 | 1 | FILT-01 | — | TypeIcon maps 10 property types to Lucide components | unit | `npx jest src/components/filters/primitives/__tests__/TypeIcon.test.tsx` | ❌ W0 | ⬜ pending |
| 14-01-08 | 01 | 1 | FILT-01 | — | joinTypes pure utility returns correct collapse string | unit | `npx jest src/components/filters/primitives/__tests__/joinTypes.test.ts` | ❌ W0 | ⬜ pending |
| 14-01-09 | 01 | 1 | FILT-01 | — | i18n EN+RU parity for `filters.*` namespace | gate | `scripts/check-i18n-parity.sh` | ✅ | ⬜ pending |
| 14-02-01 | 02 | 2 | FILT-02 | — | CascadingFilter renders Rent/Buy + categories + types | unit | `npx jest src/components/filters/__tests__/CascadingFilter.test.tsx` | ❌ W0 | ⬜ pending |
| 14-02-02 | 02 | 2 | FILT-02 | — | Multi-select chip toggle calls setTypes with array | unit | `npx jest src/components/filters/__tests__/CascadingFilter.test.tsx` | ❌ W0 | ⬜ pending |
| 14-02-03 | 02 | 2 | FILT-02 | — | Result line shows live count via liveCount prop | unit | `npx jest src/components/filters/__tests__/CascadingFilter.test.tsx` | ❌ W0 | ⬜ pending |
| 14-02-04 | 02 | 2 | FILT-02 | — | HomeScreen deletes lines 521-642 + 10 orphan style keys | source-assert | `! grep -nE "filterSection: \{" src/screens/HomeScreen.tsx` | ✅ | ⬜ pending |
| 14-02-05 | 02 | 2 | FILT-02 | — | HomeScreen mounts `<CascadingFilter />` behind filterStyle gate | source-assert | `grep -nE "<CascadingFilter " src/screens/HomeScreen.tsx` | ✅ | ⬜ pending |
| 14-03-01 | 03 | 3 | FILT-01, FILT-03 | — | GuidedFilterSheet renders Modal + Animated.View slide-up | unit | `npx jest src/components/filters/__tests__/GuidedFilterSheet.test.tsx` | ❌ W0 | ⬜ pending |
| 14-03-02 | 03 | 3 | FILT-01 | — | Step auto-advance: pick Deal advances to Category; pick Category advances to Type | unit | `npx jest src/components/filters/__tests__/GuidedFilterSheet.test.tsx` | ❌ W0 | ⬜ pending |
| 14-03-03 | 03 | 3 | FILT-01 | — | Re-picking Category clears types array | unit | `npx jest src/components/filters/__tests__/GuidedFilterSheet.test.tsx` | ❌ W0 | ⬜ pending |
| 14-03-04 | 03 | 3 | FILT-01 | — | Tap-scrim dispatches onClose | unit | `npx jest src/components/filters/__tests__/GuidedFilterSheet.test.tsx` | ❌ W0 | ⬜ pending |
| 14-03-05 | 03 | 3 | FILT-03 | — | HomeScreen dispatches GuidedFilterSheet when filterStyle='guided' | source-assert | `grep -nE "<GuidedFilterSheet " src/screens/HomeScreen.tsx` | ✅ | ⬜ pending |
| 14-03-06 | 03 | 3 | FILT-03 | — | Both variants share `{deal,category,types}` state via HomeScreen props | source-assert | `grep -c "selectedCategory={selectedCategory}" src/screens/HomeScreen.tsx` ≥ 2 | ✅ | ⬜ pending |
| 14-03-07 | 03 | 3 | FILT-03 | — | KBD-02 invariant preserved | gate | `[ $(grep -rn "keyboardVerticalOffset" src/ \| wc -l) -eq 0 ]` | ✅ | ⬜ pending |
| 14-03-08 | 03 | 3 | FILT-01, FILT-02, FILT-03 | — | tsc baseline not regressed | gate | `npx tsc --noEmit 2>&1 \| grep -c "error TS"` ≤ 8 | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/components/filters/__tests__/ModalProbe.test.tsx` — 5-line probe verifying `react-test-renderer` can mount `<Modal>` without crashing. If it fails, Plan 14-03 must extract a `GuidedFilterSheetContent` inner component for direct test rendering (without the Modal wrapper).
- [ ] `src/components/filters/__tests__/` directory created (test-discovery convention)
- [ ] `src/components/filters/primitives/__tests__/` directory created
- [ ] No new framework install — jest + react-test-renderer already present

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Sheet slide-up animation (300ms, Easing.out.cubic) renders smoothly on iPhone 15 Pro Max + Moto G XT2513V | FILT-01 SC1 | Animation timing not asserted in unit tests; rendered behavior is the contract | Run app, open HomeScreen, tap filter button, observe slide-up; confirm no jitter on Android |
| Dark + light theme parity for both variants | FILT-01, FILT-02 | Visual regression; tokens map but rendered look needs eyes | Toggle theme, open each variant, confirm legibility + accent-fill + scrim contrast |
| Live-swap on filterStyle change opens new variant on next press with no flash of previous | FILT-03 SC3 | Setting picker ships Phase 15; manual test via dev fixture / AsyncStorage poke | Dev: set `filterStyle='guided'`, press filter button, verify sheet; set `'cascading'`, press, verify panel |
| EN+RU rendered string fit (Russian text often longer) in stepper/breadcrumb/show-button | FILT-01 SC5 | String-fit / truncation is visual | Toggle language, open Guided sheet, verify no truncation in stepper labels or breadcrumb |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers Modal-test probe (load-bearing for 14-03 strategy decision)
- [ ] No watch-mode flags
- [ ] Feedback latency < 90 s
- [ ] `nyquist_compliant: true` set in frontmatter after planner-confirmed coverage

**Approval:** pending

# Phase 1: Nav Reliability - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in `01-CONTEXT.md` — this log preserves the alternatives considered.

**Date:** 2026-04-22
**Phase:** 01-nav-reliability
**Areas discussed:** Diagnostic depth & gating, Belt-and-suspenders `pointerEvents` scope, Tour3D & overlay inventory completeness

---

## Gray Area Selection

| Option | Description | Selected |
|--------|-------------|----------|
| Diagnostic depth & gating | How rigorous is the C1→C2→C3→C4 investigation before we commit to a fix? Run all 4 in parallel vs sequential go/no-go gates. Instrumentation lifecycle. | ✓ |
| Reproduction matrix format & evidence bar | Where NAV-03 lives (markdown, video, CI); evidence threshold for 0% repro claim. | |
| Belt-and-suspenders `pointerEvents` scope | Apply to ALL keep-alive screens up front, or only after C1? Overlay screens too? | ✓ |
| Tour3D & overlay inventory completeness | `hideMainStackUnderOverlay` omits `isTour3DOpen` — intentional or gap? Canonical overlay list. | ✓ |

Reproduction matrix format was not selected — left for Claude's discretion during planning.

---

## Area 1 — Diagnostic depth & gating

### Q1.1 — Sequencing of C1→C2→C3→C4 investigation

| Option | Description | Selected |
|--------|-------------|----------|
| Sequential with go/no-go gates | Instrument C1 first; confirm→fix, else→C2. Cheapest when C1 is the cause. | ✓ |
| Parallel — instrument all 4 at once | One QA pass captures logs for all hypotheses. Faster if C1 is NOT the cause. | |
| Sequential, skip C1 and start at C2 | Treat C1 as partially mitigated (already derived). Risk: `isTour3DOpen` omission may still be C1. | |

**User's choice:** Sequential with go/no-go gates (Recommended)

### Q1.2 — Instrumentation lifecycle

| Option | Description | Selected |
|--------|-------------|----------|
| Strip all diagnostic logs before ship | Instrumentation is temporary; repro matrix is the only retained artifact. | ✓ |
| Keep logs behind a `__DEV__` guard | Logs stay for future debugging but don't ship. | |
| Keep logs behind a feature flag / env var | Toggle logs for post-release diagnosis. Introduces a new debug-flag pattern. | |

**User's choice:** Strip all diagnostic logs before ship (Recommended)

### Q1.3 — Who runs physical-device reproduction

| Option | Description | Selected |
|--------|-------------|----------|
| You run repro; Claude codes and instruments | User performs the 32+ transition matrix on real iOS + Android hardware; Claude patches between passes. | ✓ |
| Simulator-first, then one physical pass at the end | Faster iteration; risks missing touch-capture bugs. | |
| Defer device QA to Phase 8 | Fix based on best-guess; validate at release. | |

**User's choice:** You run repro; Claude codes and instruments (Recommended)

### Q1.4 — Fix bar if repro drops to ~20%

| Option | Description | Selected |
|--------|-------------|----------|
| Hard 0% bar — keep investigating | Per PITFALLS §1: partial success means wrong root cause, not a partial win. | ✓ |
| Ship partial fix with remaining repro as known-issue | Ship the 80% win; track rest as follow-up. | |
| Escalate — pause and reassess root cause | Treat partial success as diagnostic evidence the model is wrong. | |

**User's choice:** Hard 0% bar — keep investigating (Recommended). The "escalate" option was subsumed as the operating rule when partial success is observed.

---

## Area 2 — Belt-and-suspenders `pointerEvents` scope

### Q2.1 — Timing of the up-front mitigation

| Option | Description | Selected |
|--------|-------------|----------|
| Up front, before root-cause fix | Apply as Step 1; per PITFALLS §3 may itself fix the trap. Risk: masks real cause if we stop. | ✓ |
| After root-cause fix lands | Confirm real cause first, then apply mitigation. | |
| Both — apply up front AND keep investigating | Apply mitigation immediately but continue diagnostic in parallel. | |

**User's choice:** Up front, before root-cause fix (Recommended). Combined with Area 1 D-04's "0% repro bar + partial = wrong model" rule, this effectively becomes the "both" path — the mitigation is applied up front AND C1→C4 diagnosis continues in parallel.

### Q2.2 — Surfaces that get the `pointerEvents` wrapper (multi-select)

| Option | Description | Selected |
|--------|-------------|----------|
| All 5 keep-alive main-stack tabs | Home, Favorites, Chat, Profile, Listings. Core of PITFALLS §3 fix. | ✓ |
| All full-screen overlays | PropertyDetails, CreateListing, Tour3D, RenterListings. | ✓ |
| Auth modals (zIndex:1000) | Potential C3 candidate; transparent wrapper above BottomNavigator. | |
| Any `<Modal>` instances | iOS Modals attach to root window regardless of parent visibility. | |

**User's choice:** Keep-alive tabs + full-screen overlays. Auth modals and `<Modal>` audits explicitly scoped out — deferred to C3 territory only if 0% repro bar isn't met after C1/C2.

### Q2.3 — Guardrail convention

| Option | Description | Selected |
|--------|-------------|----------|
| Add a comment/doc convention only | Document in `CONVENTIONS.md`; enforce via code review. | ✓ |
| Wrap in reusable `<KeepAliveScreen visible={...}>` component | Codify pattern as a component; harder to misuse; small refactor needed. | |
| Skip — M1 polish, not infrastructure | Apply imperatively; don't invest in prevention. | |

**User's choice:** Add a comment/doc convention only (Recommended)

---

## Area 3 — Tour3D & overlay inventory completeness

### Q3.1 — Is `isTour3DOpen`'s omission intentional?

| Option | Description | Selected |
|--------|-------------|----------|
| Treat as bug — add it to the derivation | Tour3D is a full-screen overlay (zIndex:3); every other overlay hides main stack. | ✓ |
| Verify first via repro — open Tour3D, then tap a nav tab | Confirm hypothesis before changing derivation. | |
| Intentional — Tour3D handles its own nav gating | Leave derivation alone; assume there's a UX reason. | |

**User's choice:** Treat as bug — add it to the derivation (Recommended). Implicitly, the repro will still exercise the Tour3D-open path during the physical-device QA (D-03), so confirmation happens as part of the normal QA loop.

### Q3.2 — Canonical overlay list (multi-select)

| Option | Description | Selected |
|--------|-------------|----------|
| PropertyDetails (`!!selectedProperty`) | Currently in derivation. | ✓ |
| CreateListing (`!!user && isCreateListingOpen`) | Currently in derivation (auth-gated). | ✓ |
| RenterListings (`isRenterListingsOpen`) | Currently in derivation. | ✓ |
| Tour3D (`isTour3DOpen`) | Currently MISSING. | ✓ |

**User's choice:** All four — complete canonical set. Adds `isTour3DOpen`.

### Q3.3 — Guardrail against future omissions

| Option | Description | Selected |
|--------|-------------|----------|
| Single source of truth — one `OVERLAY_FLAGS` array + `.some(Boolean)` | Greppable; new overlay → add to array next to state decl. | ✓ |
| Keep inline OR-expression + CONVENTIONS.md note | Minimal change; relies on reviewer vigilance. | |
| Leave as-is — no new overlays in M1 | Fix Tour3D omission; defer guardrail design to M2. | |

**User's choice:** Single source of truth — `OVERLAY_FLAGS` array + `.some(Boolean)` (Recommended)

---

## Claude's Discretion

- Exact variable names / file location for `OVERLAY_FLAGS` array (inline in App.tsx vs extracted helper)
- Exact log format and per-candidate instrumentation specifics
- Wording of the new `CONVENTIONS.md` entry for keep-alive/`pointerEvents` convention
- Preemptive 23-dep BackHandler refactor vs defer-until-C2-confirmed (default: defer)
- Android hardware-back regression testing approach within the device QA pass
- Reproduction matrix file location (`.planning/phases/01-nav-reliability/01-REPRO-MATRIX.md` suggested)

## Deferred Ideas

- 23-dep BackHandler ref-pattern refactor — only if C2 is confirmed during diagnostic
- Auth modal and `<Modal>` pointerEvents audit — only if 0% repro bar unmet after C1/C2
- Reusable `<KeepAliveScreen>` component abstraction — revisit in M2 if new screens justify
- Migration to `react-navigation` — explicitly out of scope per PROJECT.md
- Crash reporter integration — belongs in Phase 8 or later

---

*Discussion log: 2026-04-22 — full Q&A audit trail for human review.*

# Phase 2: Universal Keyboard Handling - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-22
**Phase:** 02-universal-keyboard-handling
**Areas discussed:** CreateListingScreen scope, ChatThread / ChatCompose pattern
**Areas defaulted (user took Claude's recommendation without discussion):** KeyboardToolbar adoption, Verification strategy

---

## Gray Area Selection

**Question:** Phase 2 has 4 real decisions to pin down before planning. Which of these do you want to discuss?

| Option | Description | Selected |
|--------|-------------|----------|
| CreateListingScreen scope | Touch now with minimal wrappers vs defer to Phase 5 vs full refactor | ✓ |
| ChatThread / ChatCompose pattern | Drop-in KAV swap vs KeyboardStickyView (pinned composer) | ✓ |
| KeyboardToolbar adoption | Adopt in M1 for CreateListing+AccountSettings vs defer to polish | (defaulted — defer) |
| Verification strategy | Full matrix vs focused per-screen vs risk-weighted | (defaulted — risk-weighted) |

**Notes:** User selected only the two areas with meaningful impact on scope; accepted Claude's recommendations on the other two without discussion (defer KeyboardToolbar, risk-weighted verification).

---

## CreateListingScreen scope

**Question:** How should Phase 2 handle CreateListingScreen's keyboard behavior given the Phase 4/5 refactor is imminent?

| Option | Description | Selected |
|--------|-------------|----------|
| Minimal wrappers now (Recommended) | Swap each of the two top-level ScrollViews for KASV. No internal structural changes. If Phase 4/5 splits the form into sub-components, minor rework — not throwaway. Satisfies SC3 today. | ✓ |
| Defer entirely to Phase 5 | Skip in Phase 2; amend SC3 to exclude it. M1 goes to store submission with listing-creation broken under the keyboard. | |
| Full refactor to KASV sub-components | Pre-empt Phase 4 decomposition as part of Phase 2. Scope creep — mixes keyboard with taxonomy. | |

**User's choice:** Minimal wrappers now.
**Notes:** Captured as D-07/D-08 in CONTEXT.md. Explicit acceptance that Phase 4/5 may reshape the KASV wrappers — expected minor rework, not throwaway.

---

## ChatThread / ChatCompose pattern

**Question:** Which pattern for the two Chat screens?

| Option | Description | Selected |
|--------|-------------|----------|
| Drop-in KAV swap (Recommended) | Change import source to react-native-keyboard-controller, remove keyboardVerticalOffset prop. ~5 lines per screen. Kills magic-number anti-pattern; ships reliable keyboard today. | ✓ |
| KeyboardStickyView (composer pinned) | Restructure with composer pinned above keyboard (iMessage-style). Better UX, ~30-50 lines restructure per screen + bottom-padding math + Android edge cases. | |
| Drop-in now, sticky in M2 | Ship option A in M1, capture 'revisit KeyboardStickyView in M2 Chat polish' as deferred idea. | |

**User's choice:** Drop-in KAV swap.
**Notes:** Captured as D-09/D-10 in CONTEXT.md. `KeyboardStickyView` deferred to M2 Chat polish (noted in `<deferred>` section).

---

## Ready for context check

**Question:** Ready to write CONTEXT.md, or want to re-open anything?

| Option | Description | Selected |
|--------|-------------|----------|
| Write CONTEXT.md | Capture decisions, locked research choices, canonical refs, screen inventory, Claude's Discretion items. Proceed to /gsd-plan-phase 2. | ✓ |
| Revisit CreateListingScreen | Second thoughts on minimal-wrappers now. | |
| Revisit Chat pattern | Second thoughts on drop-in KAV swap. | |
| Revisit the defaulted areas | Re-open KeyboardToolbar or verification strategy. | |

**User's choice:** Write CONTEXT.md.

---

## Claude's Discretion

Areas where the user deferred to Claude in CONTEXT.md's `<decisions>` section:
- Exact phase plan wave structure (install → provider → screen conversions → verify) — planner's call; recommended Wave 0 = install precondition gate.
- Removal of `HomeScreen.tsx:465` header-outside-FlatList workaround after `KeyboardProvider` lands — verified opportunistically during device testing.
- `PasswordTextInput` composition under KASV — expected to work; confirmed during auth-screen conversion.
- Batching decision for the 4 auth screens (one plan/commit vs split).
- Android BackHandler interaction with keyboard dismiss — library default is back-dismisses-keyboard; confirm no conflict with Phase 1's App.tsx:184-297 BackHandler useEffect during Chat testing.

## Deferred Ideas

Ideas raised during gray-area presentation and research scan that were noted for future phases:
- KeyboardStickyView for Chat composers — M2 Chat polish.
- KeyboardToolbar adoption — Phase 5 (Listing Form Validation & Edit Flow).
- Full verification matrix (every screen × both platforms × portrait/landscape × modal-open/not) — M2 polish / post-field-report.
- Landscape-orientation keyboard testing — when landscape ships (not in M1).
- HomeScreen workaround comment cleanup — opportunistic during Phase 2 verify, else left as polish cleanup.

---

*Phase: 02-universal-keyboard-handling*
*Discussion gathered: 2026-04-22*

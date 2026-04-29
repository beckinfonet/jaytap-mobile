# Phase 7: Alignment Pass - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in `07-CONTEXT.md` — this log preserves the alternatives considered.

**Date:** 2026-04-26
**Phase:** 07-alignment-pass
**Areas discussed:** Screenshot intake & sub-task shape, Per-screen verification approach
**Areas deferred to Claude's discretion (with documented defaults):** Token-escalation policy, Phase 6 deferred polish folding

---

## Gray-area selection (multiSelect)

**Question:** Phase 7 is screenshot-driven and the screenshots haven't arrived yet — which gray areas do you want to lock now so the moment they do, the phase plan can land cleanly?

| Option | Description | Selected |
|--------|-------------|----------|
| Screenshot intake & sub-task shape | How screenshots arrive, how each becomes a planning unit (one PLAN per screen vs per fix-category) | ✓ |
| Token-escalation policy | What happens when a fix legitimately needs a new theme token | |
| Per-screen verification approach | How each fix gets signed off (per-screen QA matrix vs phase-exit sweep vs single-device walk) | ✓ |
| Phase 6 deferred polish folded in? | Whether to fold ME-02, ME-03, 8 LOW/INFO Phase-6 findings, WR-02 into Phase 7 | |

**User's choice:** Screenshot intake & sub-task shape, Per-screen verification approach.

**Notes:** Unselected areas captured in CONTEXT.md `<decisions>` §Claude's Discretion with documented defaults — Token Escalation defaults to Phase-4 transcribe-and-document precedent with user-escalation gate before introducing a new theme token; Phase-6 deferred polish defaults to NOT-folded unless a screenshot surfaces one of those screens with the defect visible.

---

## Screenshot intake & sub-task shape

### Q1 — Delivery format

| Option | Description | Selected |
|--------|-------------|----------|
| Files + a manifest doc (Recommended) | PNGs in `screenshots/`, sibling `07-SCREENSHOTS.md` lists each screen + bullet-list issues | |
| Files only — describe issues in chat | PNGs in same dir, issues described conversationally each time | ✓ |
| Annotated screenshots only | PNGs with arrows/call-outs already drawn; no manifest | |

**User's choice:** Files only — describe issues in chat.
**Notes:** Captured as D-01 with explicit responsibility on assistant to fold chat-described issues into the screen's PLAN immediately on receipt; chat is ephemeral, the PLAN is the persistent record.

### Q2 — Sub-task granularity

| Option | Description | Selected |
|--------|-------------|----------|
| One PLAN per screen (Recommended) | `07-NN-<screen>-PLAN.md`; bundles every alignment fix on that screen | ✓ |
| One PLAN per fix-category | `07-01-spacing-PLAN.md`, `07-02-colors-PLAN.md`, etc. | |
| One mega-PLAN | Single `07-01-alignment-pass-PLAN.md` with everything | |

**User's choice:** One PLAN per screen.
**Notes:** Matches Phase 6 component-scoped pattern (06-04 = HospitalityCard, 06-06 = PropertyDetailsScreen); enables atomic per-screen revert.

### Q3 — Annotation depth

| Option | Description | Selected |
|--------|-------------|----------|
| Issue + intent (Recommended) | "X overlaps Y — push X down OR move Y up"; assistant works tokens/values | ✓ |
| Issue only | "Card has alignment issue near favorite icon"; assistant diagnoses and proposes | |
| Issue + exact fix | "Reduce price chip top margin from 12 to 4"; assistant transcribes | |

**User's choice:** Issue + intent.
**Notes:** Lowest re-iteration risk; user names symptom + direction, assistant computes exact tokens/spacing from existing theme.

### Q4 — Scope of "alignment"

| Option | Description | Selected |
|--------|-------------|----------|
| Wider visual polish (Recommended) | Spacing + sizing + typography + icon size + shadows + borderRadius + dark-mode contrast | ✓ |
| Strict alignment only | Just spacing/padding/centering/sizing/text-overflow | |
| Anything visually wrong | Above + missing states + dark/light parity even if not screenshotted | |

**User's choice:** Wider visual polish.
**Notes:** Matches "polish" framing in milestone name; bounded to existing theme tokens (escalation rule covers the edge case).

### Q5 — Adjacent issues

| Option | Description | Selected |
|--------|-------------|----------|
| Surface it, you decide (Recommended) | Assistant flags 1-line in chat; user decides fold/defer/ignore on the spot | ✓ |
| Strict — only fix what's screenshotted | Assistant never proactively surfaces; quietly route to Phase 8 backlog | |
| Fold in if cheap, surface if not | Assistant judges trivial vs non-trivial | |

**User's choice:** Surface it, you decide.
**Notes:** Captured as D-05; deferred items go to per-screen PLAN `<deferred>` block — no silent fold-ins.

---

## Per-screen verification approach

### Q1 — Verification cadence

| Option | Description | Selected |
|--------|-------------|----------|
| Per screen-PLAN (Recommended) | Walk after all fixes on a screen land; PLAN closes only when walk passes | ✓ |
| Phase-exit only — one big sweep | Single `07-QA-MATRIX.md` walk at phase exit (Phase 4/6 style) | |
| Per fix — each commit walked | Walk after every commit; highest signal, highest overhead | |

**User's choice:** Per screen-PLAN.
**Notes:** Mirrors Phase 6 rhythm; momentum-preserving.

### Q2 — Device coverage per walk

| Option | Description | Selected |
|--------|-------------|----------|
| Both per screen (Recommended) | iPhone + Moto G on every screen, both modes (4 cells per screen) | |
| iOS per screen, Android sweep at phase exit | Walk iOS each PLAN; batch Android verification at phase exit | |
| Whichever device is in your hand | User picks per-screen; phase-exit sweep on the other catches divergence | ✓ |

**User's choice:** Whichever device is in your hand.
**Notes:** Lowest per-screen overhead; phase-exit cross-device sweep on the not-yet-walked device is now mandatory (D-07) to catch platform-divergent regressions. `07-QA-MATRIX.md` row-per-screen × dark + light × the not-yet-walked device.

### Q3 — Dark/light verification cadence

| Option | Description | Selected |
|--------|-------------|----------|
| Both modes per screen-PLAN (Recommended) | Each screen walked in dark + light before its PLAN closes | |
| Sample per fix, full sweep at phase exit | Spot-check whichever mode you're in; phase-exit sweeps both | |
| Claude's discretion | Layout-only fixes skip dual-mode; color/contrast fixes get both | ✓ |

**User's choice:** Claude's discretion.
**Notes:** Captured as D-08 with explicit heuristic — both modes required when fix touches colors/contrast/shadows/borderRadius/elevation/opacity-on-dark/image overlays; single-mode acceptable for spacing/padding/margins/alignment/sizing/text-truncation/icon-positioning. Phase-exit cross-device sweep ALSO sweeps both modes per screen regardless.

### Q4 — Re-iteration on failed walk

| Option | Description | Selected |
|--------|-------------|----------|
| Surgical patch + re-walk (Recommended) | Same PLAN stays open; targeted fix-on-fix; re-walk failing cells | ✓ |
| Re-plan the screen | Re-run /gsd-plan-phase 7 for the failing screen with failure as new input | |
| Defer to a follow-up PLAN | Mark failing cell deferred; route to follow-up or post-M1 | |

**User's choice:** Surgical patch + re-walk.
**Notes:** Mirrors Phase 1 post-Wave-1 reassessment loop and Phase 6 HI-01 closure (`b1da946`); re-plan reserved for structurally-wrong cases (e.g., needing a new theme token).

---

## Claude's Discretion

The two unselected gray areas have documented defaults in CONTEXT.md `<decisions>` §Claude's Discretion:

- **Token Escalation policy** — default = Phase-4 transcribe-and-document precedent (the 4 brownfield hex literals at `MediaSection.tsx:163` / `:315` / `:328` are the precedent); user is escalated to BEFORE landing any fix that would require introducing a new theme token or new spacing scale step.
- **Phase 6 deferred polish folding** — default = NOT folded unless a Phase-7 screenshot surfaces one of those screens with the related defect visible. Items routed to Phase 8 / post-M1: ME-02, ME-03, 8 LOW/INFO findings, WR-02 i18n parity regex digit-skip.

## Deferred Ideas

Captured in CONTEXT.md `<deferred>` block:
- Token-escalation policy formalization as project-wide ADR
- Phase 6 deferred polish (full list)
- Landscape orientation support
- Visual snapshot / regression testing tooling
- Refactor opportunities surfaced during alignment work

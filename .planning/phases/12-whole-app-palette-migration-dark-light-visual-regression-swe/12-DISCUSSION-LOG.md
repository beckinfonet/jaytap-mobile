# Phase 12: Whole-App Palette Migration (Dark + Light) + Visual-Regression Sweep — Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-31
**Phase:** 12-whole-app-palette-migration-dark-light-visual-regression-swe
**Areas discussed:** Orphan-key remap, Mode-independence shape, Sweep capture format, Plan splitting

---

## Gray-Area Selection

| Option | Description | Selected |
|--------|-------------|----------|
| Orphan-key remap strategy (HIGH stakes) | 15 keys with no clean handoff mapping; `primary` used as CTA bg — flipping to accent would be a Phase-16 reskin happening in Phase 12 | Deferred to Claude |
| Mode-independence implementation shape (LOW stakes) | Inline duplication vs extracted `MODE_INDEPENDENT_PALETTE` const vs runtime assert | Deferred to Claude |
| Sweep capture format (LOW stakes) | Full-matrix 120-row table vs mass-disposition vs FAIL-only log | Deferred to Claude |
| Plan splitting (LOW stakes) | Single plan / two plans (code + sweep) / three plans (dark / light / sweep) | Deferred to Claude |

**User's choice:** "Go with your defaults" — all four areas deferred to Claude's judgment.

---

## Orphan-key remap strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Aggressive remap | `primary → accent`, `inputBackground → surface2`, `chipBackground → surface2`, `cardShadow` aligned to handoff. CTA buttons flip pink in Phase 12. | |
| Targeted remap | Mix: remap structural tokens (input/chip backgrounds, card shadows, hairlines) but retain semantic CTAs (`primary` neutral). | |
| Retain verbatim | Keep all 15 orphan keys at current values; Phase 12 diff is purely additive + value-rewrite on the 7 mappable keys. | ✓ |

**Claude's choice:** Retain verbatim.
**Rationale:** `colors.primary` is used as CTA `backgroundColor` on ForgotPasswordScreen, LandlordApplicationScreen, LandlordApplicationQueueScreen, etc. (verified via grep). Flipping `primary → accent` in Phase 12 silently reskins every CTA — that's Phase 16 (Profile reskin) territory, not Phase 12 (token foundation). Same logic for `inputBackground`, `chipBackground`, `cardShadow`. Phase 12 stays purely additive + 7-key value-rewrite.

---

## Mode-independence implementation shape

| Option | Description | Selected |
|--------|-------------|----------|
| Inline duplication | Declare `accent: '#ff5a6f'` literally twice (once in `light`, once in `dark`). Mode-independence by convention. | |
| Extracted const + spread | `const MODE_INDEPENDENT_PALETTE = {...}`; spread into both `light` and `dark`. Drift requires deleting the spread (visible in diff). | ✓ |
| Runtime assert | Inline duplication + `if (colors.light.accent !== colors.dark.accent) throw` at module top. Falsifiable at load. | |

**Claude's choice:** Extracted const + spread.
**Rationale:** SPEC §Constraints requires mode-independence to be FALSIFIABLE. Spread-based equality is enforced by source structure — no runtime check needed, no drift possible without a visible diff. SPEC explicitly nudges toward this pattern.

---

## Visual-regression sweep capture format

| Option | Description | Selected |
|--------|-------------|----------|
| Full-matrix table | 1 row per (screen × device × locale × mode) = 120 rows max. Heavy, exhaustive audit trail. | |
| Mass-disposition table | 1 row per (screen × device) with inline EN/RU and light/dark columns; logical-equivalence shortcuts allowed per M3 Plan 05-05. ~30 rows. | ✓ |
| FAIL-only log | Assume PASS unless operator records FAIL. Smallest artifact, weakest audit trail. | |

**Claude's choice:** Mass-disposition table.
**Rationale:** SPEC explicitly authorizes "Mass-disposition / logical-equivalence per M3 Plan 05-05 precedent is allowed". M3 RETROSPECTIVE noted full-matrix tables become busy-work without proportional audit value when the sweep is already risk-targeted. FAIL-only log fails the audit-trail bar.

---

## Plan splitting

| Option | Description | Selected |
|--------|-------------|----------|
| Single plan | One commit rewriting `colors.ts` + one commit writing sweep doc, both inside one PLAN.md. | |
| Two plans | Plan 12-01 = `colors.ts` rewrite (atomic). Plan 12-02 = sweep + verification doc (atomic). | ✓ |
| Three plans | Plan 12-01 dark. Plan 12-02 light. Plan 12-03 sweep. | |

**Claude's choice:** Two plans (code + sweep).
**Rationale:** Dark + light parity is one atomic commit's worth of work (single file). Splitting dark/light creates a transient state where one mode works and the other is broken. Two-plan structure mirrors M3 Plan 05-05/05-06's clean "code change" + "device QA" separation — a project-known shipping pattern.

---

## Claude's Discretion

All four gray areas were deferred to Claude via the user's "Go with your defaults" response. The decisions captured above (D-01 through D-07 in CONTEXT.md) are the discretion calls.

The planner is authorized to surgically remap a specific orphan key in Plan 12-01 if research surfaces a visible artifact under the new background/surface tokens — but only with explicit justification in `12-RESEARCH.md`. The default remains verbatim.

## Deferred Ideas

- Orphan-key surgical remap → Phase 14 / 15 / 16 (each phase touches its own surfaces).
- Green-accent alt token (`#36c98f`) → future milestone, not M6 v1.
- Automated WCAG AA contrast testing → future tooling phase.
- Theme-switch animation polish → future UX polish phase.
- Newsreader serif font loading → explicitly excluded per memory `m6-scope-decisions-2026-05-31.md`.
- `surface2` / `surface3` actually CONSUMED in any screen → Phase 14+ (Phase 12 only ships the tokens).

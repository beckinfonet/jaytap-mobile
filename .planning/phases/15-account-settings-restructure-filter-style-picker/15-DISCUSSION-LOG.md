# Phase 15: Account Settings Restructure + Filter-Style Picker — Discussion Log

**Date:** 2026-05-31
**Mode:** default (no flags)

## Gray Areas Presented

After scouting `AccountSettingsScreen.tsx` (516 LOC, still using a hardcoded `themeStyles{}` block — never adopted Phase 12 tokens), the MoveIn handoff Direction A `AccountSettingsA` + `FilterStyleRow` primitives, and prior Phase 13/14 context, presented three gray areas with real stakes plus two follow-up calls. Several smaller decisions auto-picked under Claude's Discretion per `feedback-discuss-phase-detail-level.md`.

---

## Round 1 — Three Gray Areas (multi-question turn)

### Q1: Token migration scope

**Asked:** AccountSettingsScreen still uses a hardcoded `themeStyles` block (#000/#F2F2F7/#1E1E1E/#3B82F6/#FF453A). Phase 12 tokens (colors.background/surface/text/accent/destructiveRed) exist but were never wired here. How much of that should Phase 15 fix?

**Options:**
- Full migration (Recommended) — Rip themeStyles{} entirely; rewrite existing rows + new sections against colors.*.
- Touch-only migration — New components use colors.*; existing rows keep themeStyles.
- Skip — file follow-up — Phase 15 ships purely structural; no token churn.

**User chose:** Full migration. → captured as D-08.

### Q2: Landlord "Become a Landlord" row placement

**Asked:** Today there's a conditional "APPLICATION STATUS → Become a Landlord" section. The handoff's Direction A only shows ACCOUNT/PREFERENCES/DANGER ZONE. Where does that row land?

**Options:**
- 4th section between PREFERENCES + DANGER ZONE (Recommended) — closest to handoff + zero regression to SET-03.
- Inline row in PREFERENCES — minimizes section count but mixes categories.
- Remove from AccountSettings entirely — risks SET-03 regression.

**User chose:** 4th section between PREFERENCES + DANGER ZONE. → captured as D-02 (with shortened label "APPLICATION" per D-19).

### Q3: "Coming soon" disabled-state visual

**Asked:** For the 2 'Coming soon' filter styles (Master-Detail + Sentence) inside the expanded picker — exact disabled-state visual?

**Options:**
- Greyed text + pill badge + empty disabled radio (Recommended) — explicit forward-fit affordance.
- Opacity 0.4 + hollow radio + no badge — quieter, could read as a glitch.
- Greyed + badge + tappable Alert "Coming in M6 Phase B" — noisier UX.

**User chose:** Greyed text + 'Coming soon' pill badge + empty disabled radio. → captured as D-06.

---

## Round 2 — Two Follow-Ups (multi-question turn)

### Q4: Accent color flip (iOS blue → handoff pink)

**Asked:** Today's accent is iOS-blue #3B82F6 (back arrow, section titles, ✎ icon, Save). Full migration flips to `colors.accent = #ff5a6f` (handoff brand). Does that match the intent?

**Options:**
- Yes — flip to pink colors.accent (Recommended) — consistent with M6 (filter chips, Show N homes button).
- No — keep iOS blue, scope migration to surfaces/text only — visual inconsistency vs filter UIs.

**User chose:** Yes — flip to pink. → captured as D-09.

### Q5: Edit affordance placement

**Asked:** Today the ✎ pencil sits top-right of the section header. Handoff Direction A puts a "✎ Edit" link inside the SectionLabel's `action` slot. Adopt the handoff pattern?

**Options:**
- Handoff pattern — '✎ Edit' link in SectionLabel action slot (Recommended) — pink link + Pencil icon, toggles edit mode + reveals Cancel/Save inside ACCOUNT card.
- Keep today's pencil-only icon top-right — smaller change, asymmetry with handoff.

**User chose:** Handoff pattern. → captured as D-10 + D-11 (Save/Cancel buttons move inside ACCOUNT card).

---

## Claude's Discretion (decided without escalation)

Per `feedback-discuss-phase-detail-level.md` — only escalate gray areas with real stakes:

- **D-16:** Currently-selected style rendered at right edge of collapsed picker row (handoff verbatim). SC3 phrasing "subtitle ('Currently: Guided Steps')" read loosely as "current value visible from collapsed state."
- **D-17:** Currently-selected style ALSO renders as the radio-fill state in the expanded body (double-visible source-of-truth).
- **D-18:** Lucide icon for picker collapsed-row = `SlidersHorizontal`. 38×38pt chip with `colors.surface2` bg + `colors.iconChipFg` icon.
- **D-19:** APPLICATION section label = "APPLICATION" (shorter than today's "APPLICATION STATUS").
- **D-20:** Co-located tests (`SectionLabel.test.tsx`, `FilterStyleRow.test.tsx`) — project convention.
- **D-21:** Coming-soon copy = "Coming soon" (EN) / "Скоро" (RU). Short.
- **D-22:** Save/Cancel button heights stay 50pt; radius bumps 12 → 14 to match card rhythm.
- **D-23:** Hit-slop on chevron-rotate button = `{ top: 8, bottom: 8, left: 8, right: 8 }`.
- **D-24:** No PropertyDetailsScreen / HomeScreen / ProfileScreen edits — Phase 15 changes only AccountSettingsScreen + adds 2 components.
- **D-25:** KeyboardAwareScrollView stays at `bottomOffset={20}` (KBD-02 invariant).
- **D-12:** `<SectionLabel>` extracted as project-shared primitive (Phase 16 will reuse for ACTIVITY / HOSTING / MY ACTIVITY / ADMIN TOOLS).
- **D-13:** Generic `<Card>` wrapper NOT extracted (only 3-4 cards, low reuse pressure; Phase 16 can extract if reuse emerges).
- **D-14:** i18n namespace split — `filters.style.*` (extends Phase 14 namespace) + `accountSettings.section.*` + `accountSettings.filterPicker.*` + `common.edit`.
- **D-15:** Two-plan split (15-01 restructure + token migration + SET-01/SET-03; 15-02 FilterStyleRow + SET-02 + live-swap verification). Mirrors Phase 13 D-08 shape.

---

## Deferred Ideas (logged in CONTEXT.md `<deferred>`)

- SET-04 un-gate Master-Detail + Sentence (M6 Phase B).
- Server-side `filterStyle` sync (per `m6-scope-decisions-2026-05-31.md`).
- Generic `<Card>` primitive extraction (Phase 16 trigger).
- Edit-mode card-bg tint (on-device polish call).
- Direction B preview-card picker style.
- Per-property-type localization in picker descriptions (not applicable).
- Cross-section transition animation.
- DeleteAccountModal re-skin (out of scope; Phase 12 VR already validated).
- Removing the in-screen Language toggle (memory `m6-language-pill-stays-in-header.md` keeps both).
- Picker telemetry / analytics.
- "Reset to default" affordance.
- Hook signature extension for future variants.

---

## Outcome

CONTEXT.md captures: 25 decisions (D-01–D-25), 4 canonical-ref groups (handoff source / project planning / phase 13 foundation / phase 14 cross-cut / phase 12 tokens / codebase anchors / pattern precedents / hard rules / gate commands), 11 reusable assets, 8 established patterns, 8 integration points, 13 specific UI implementation ideas, 12 deferred ideas.

Two atomic plans planned (D-15):
- **Plan 15-01:** Screen restructure + token migration + SectionLabel + APPLICATION section.
- **Plan 15-02:** FilterStyleRow + filter-style picker + i18n + live-swap verification.

Next step: `/gsd-plan-phase 15`.

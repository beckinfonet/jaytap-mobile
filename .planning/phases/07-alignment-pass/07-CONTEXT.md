# Phase 7: Alignment Pass - Context

**Gathered:** 2026-04-26
**Status:** Ready for planning when screenshots arrive (process locked; per-screen sub-tasks concretize from chat-described issues)

<domain>
## Phase Boundary

Visual alignment fixes on the screens the user flags via screenshots delivered into `.planning/phases/07-alignment-pass/screenshots/`. Fixes use existing `useTheme()` tokens and existing spacing conventions only; dark/light parity preserved on physical iPhone 15 Pro / iOS 26 + Moto G XT2513V / Android 16 Fabric.

Out of scope (belongs elsewhere):
- Privacy manifest, Xcode 26 SDK, version bumps, store submission (Phase 8)
- Phase 6 deferred polish — `ME-02` orchestrator `as any` casts, `ME-03` unguarded `AMENITY_ICONS[token]` lookup, the 8 LOW/INFO Phase-6 review findings, `WR-02` i18n parity regex digit-skip — route to Phase 8 release-prep or post-M1 (unless user-flagged screen happens to surface one)
- New property categories / new features / new validation rules (frozen by Phases 4 + 5)
- Migration to `react-hook-form` + `zod` (M2+)
- 2GIS native map bridge (separate milestone — `2GIS_BRIDGE_PLAN.md`)
- Per-night pricing or booking calendars (PROJECT.md Out of Scope — locked decision)
- Refactors, redesigns, or "while we're in there" features triggered by alignment work — captured to deferred and routed to backlog or a new phase
- Landscape orientation support (the app does not currently lock or design for landscape on any flagged screen — verified at planning time when screenshots arrive)

</domain>

<decisions>
## Implementation Decisions

### Screenshot intake & sub-task shape

- **D-01:** Screenshots are delivered as PNG/JPG files at `.planning/phases/07-alignment-pass/screenshots/<screen>.png`. Filename convention is `<screen-slug>[-<mode>][-<variant>].png` — e.g. `home-dark.png`, `property-details-light.png`, `create-listing-hospitality-dark.png`. The user describes the issues conversationally in chat at the time each screenshot is shared (no separate manifest doc lives in the repo). The discussing assistant (Claude) MUST capture each chat-described issue into the screen's per-screen `07-NN-<screen>-PLAN.md` Issues block immediately on receipt — chat is ephemeral, the PLAN is the persistent record. If the screen has no PLAN yet, capture into a scratch `07-NN-<screen>-ISSUES.md` adjacent to the screenshots dir, then fold into the PLAN at planning time.
- **D-02:** One PLAN file per screen (e.g., `07-01-property-details-PLAN.md`, `07-02-create-listing-PLAN.md`). Each PLAN bundles every alignment fix on that screen. Mirrors Phase 6's component-scoped pattern (06-04 = HospitalityCard, 06-06 = PropertyDetailsScreen). One commit per fix or per cohesive fix-cluster within the screen — atomic-revert at screen-or-finer granularity.
- **D-03:** Annotation depth is **"Issue + intent"** — user names symptom + desired direction (e.g., "price chip overlaps favorite icon — push price down OR move favorite up"); planner/executor works out exact tokens and spacing values. User is NOT expected to compute exact numeric values; assistant is NOT expected to guess at intent. Lowest re-iteration risk.
- **D-04:** Scope of "alignment" = **wider visual polish** within existing theme tokens. In scope: spacing, padding, vertical/horizontal centering, sizing, text overflow, typography weights & sizes, icon sizing, shadow consistency, borderRadius, dark-mode color contrast where visibly wrong. Out of scope: missing states (empty/loading/error visuals), and any fix that would require introducing a new theme token or new spacing scale step (escalates per Token Escalation below).
- **D-05:** Adjacent issues that the assistant notices on a flagged screen but were NOT in the user's screenshot — **surface in chat with one-line description, user decides fold-in / defer / ignore on the spot**. Deferred items go to the screen's PLAN under a `<deferred>` block so they're not lost; folded items get a corresponding entry in the same PLAN's Issues block. No silent fold-ins.

### Per-screen verification

- **D-06:** Verification cadence = **per screen-PLAN walk**. After all fixes on a screen land, the screen is walked on physical device(s) before the PLAN closes. PLAN is closed only when the per-screen walk passes. Mirrors Phase 6's rhythm; small enough to keep momentum, big enough to avoid context-switching.
- **D-07:** Per-screen walk runs on **whichever device is in the user's hand at the time** — iPhone 15 Pro (iOS 26) or Moto G XT2513V (Android 16 Fabric). A **phase-exit cross-device sweep** on the OTHER device is mandatory before phase closes — catches platform-divergent regressions that an iOS-only or Android-only walk would miss. Phase-exit sweep is a `07-QA-MATRIX.md` row-per-screen × dark + light × the not-yet-walked device.
- **D-08:** Dark/light verification cadence = **Claude's discretion per fix**, applying this heuristic:
  - **Both modes required when the fix touches:** colors, contrast, shadows, borderRadius (visible against background), elevation, opacity-on-dark backgrounds, image overlays.
  - **Single-mode acceptable when the fix touches:** spacing, padding, margins, alignment, sizing, text-truncation, icon-positioning (mode-agnostic geometry).
  - At phase exit, the cross-device sweep (D-07) ALSO sweeps both modes per screen, regardless of how each individual fix was walked. ALIGN-02 (dark/light parity) is the gate.
- **D-09:** Recovery on a failed device walk = **surgical patch + re-walk**. The screen-PLAN stays open; the executor commits a targeted fix-on-fix; the user re-walks only the failing cell(s). PLAN closes when the matrix is clean. Mirrors Phase 1's post-Wave-1 reassessment loop and Phase 6's HI-01 closure (`b1da946`). Re-plan-the-screen is reserved for cases where the failure reveals the original plan was structurally wrong (e.g., the fix needs a new theme token after all → escalate per Token Escalation).

### Claude's Discretion (areas the user did not pick to discuss — defaults documented for traceability)

**Token Escalation policy** — When a fix legitimately requires a value that doesn't map to an existing `useTheme()` token or existing spacing convention:
1. Default = follow Phase 4 Plan 04-05 precedent — transcribe the brownfield hex literal verbatim, document in the PLAN's Deviations block citing Phase-4 grandfather (the 4 hex literals at `MediaSection.tsx:163` `'#121212'` / `'#FFFFFF'`, `:315` `'#FFF'`, `:328` `'#000'` were named Phase 7 as the venue but are explicitly NOT folded into Phase 7 unless user-flagged on a relevant screenshot).
2. **Surface to user before landing** if the fix would otherwise require a NEW theme token or NEW spacing scale step. User decides: extend the theme system in this phase (creates a small follow-on plan), transcribe-and-document the literal, or defer the entire fix to Phase 8 / post-M1.
3. ALIGN-02 hard rule: zero new hardcoded colors or one-off magic spacing introduced silently. Every brownfield literal that lands in this phase carries a one-line PLAN-Deviations citation.

**Phase 6 deferred polish folding** — Default = NOT folded into Phase 7 unless the user-provided screenshot specifically flags a screen where one of the 06-REVIEW findings is the visible defect. Items routed to Phase 8 / post-M1 unchanged: ME-02 (`as any` casts in `CreateListingScreen` rehydrate), ME-03 (unguarded `AMENITY_ICONS[token]` lookup), 8 LOW/INFO Phase-6 findings, WR-02 (i18n parity regex `[a-zA-Z.]+:` excludes digits — silently skips ~5 keys).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope, success criteria, and project policy
- `CLAUDE.md` — Testing bar (manual physical-device QA on iOS + Android for M1), navigation conventions, useTheme()/i18n parity rules
- `.planning/PROJECT.md` §Constraints + §Key Decisions — theme/dark-light parity, EN+RU parity, no-react-navigation
- `.planning/REQUIREMENTS.md` §ALIGN-01, §ALIGN-02 — alignment requirements
- `.planning/ROADMAP.md` §Phase 7 — phase goal, dependencies, 4 success criteria
- `.planning/STATE.md` §Phase pipeline + §Todos — Phase 7 screenshot-blocked status, carry-over context

### Codebase conventions
- `.planning/codebase/CONVENTIONS.md` — naming, theming, spacing, import order, theme-token discipline
- `.planning/codebase/ARCHITECTURE.md` — component composition, screen layering
- `.planning/codebase/STRUCTURE.md` — directory layout (`src/screens/`, `src/components/`, `src/theme/`, `src/components/CreateListingForm/`)
- `.planning/codebase/STACK.md` — RN 0.84 New Architecture (Fabric), Hermes, RN safe-area-context, lucide-react-native icons

### Theme + reusable patterns
- `src/theme/ThemeContext.tsx` — `useTheme()` hook, theme token shape (colors, spacing if present)
- `src/theme/colors.ts` — color palette (light + dark mode colors)
- `src/components/CreateListingForm/styles.ts` (`commonStyles.chip`, `commonStyles.chipRow`, `commonStyles.chipText`, `commonStyles.hint` + others) — chip/error/hint reusable styles introduced Phase 4 + 5

### Phase 4–6 precedents that constrain Phase 7
- `.planning/phases/04-listing-form-taxonomy-decomposition/04-05-SUMMARY.md` — 4 brownfield hex literals in MediaSection.tsx grandfathered with Phase 7 as named venue (Token Escalation default rule cites this)
- `.planning/phases/06-hospitality-rendering/06-CONTEXT.md` §Implementation Decisions §HospitalityCard design — HOSP-03 visual conventions (badges, tour-thumbnail emphasis, no-price-chip pattern)
- `.planning/phases/06-hospitality-rendering/06-VERIFICATION.md` — Phase 6 verifier outcome including HI-01 specs-row gap closure pattern (informs D-09 surgical-patch precedent)
- `.planning/phases/06-hospitality-rendering/06-REVIEW.md` — Phase 6 deferred review findings (default-not-folded list)
- `.planning/phases/06-hospitality-rendering/06-QA-MATRIX.md` — 80-cell QA matrix scaffold; 07-QA-MATRIX.md for the phase-exit cross-device sweep follows a similar shape (row-per-screen × device × mode)
- `.planning/phases/04-listing-form-taxonomy-decomposition/04-QA-MATRIX.md` — 18-cell QA matrix scaffold (smaller-phase precedent)

### Validation gates (must continue to pass through Phase 7)
- `scripts/check-role-grep.sh` — Phase 3 D-14 4-part grep invariant; ANY src/ change in Phase 7 must keep this exit 0
- `scripts/check-land-removed.sh` — FORM-01 invariant
- `scripts/check-i18n-parity.sh` — FORM-09 EN+RU parity (Phase 7 should not add UI strings, but if a label is touched, parity must hold)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable assets
- **`useTheme()` hook** (`src/theme/ThemeContext.tsx`) — single entry point for all colors. Theme is the only legal source of color values per ALIGN-02 + CLAUDE.md. Fixes that touch color must consume from this hook only.
- **`commonStyles`** (`src/components/CreateListingForm/styles.ts:26`) — reusable chip/chipRow/chipText/hint/error styles. Already consumed by 5 sub-components. Useful when an alignment fix introduces or normalizes a chip-like element.
- **`SafeAreaView` insets** — established convention from `BottomNavigator` and Phase 6 sticky contact bar (D-16) for any sticky-bottom UI element.
- **`lucide-react-native`** — sole icon source. Icon-sizing alignment fixes use this lib's size prop, not hardcoded SVG dimensions.

### Established patterns
- **No path aliases** — relative imports only (`../`, `./`); preserve when touching imports.
- **Co-located StyleSheet at file bottom** — sub-components and screens place `StyleSheet.create({...})` at the bottom of the file, not in a separate module unless cross-file reuse is needed.
- **Platform overrides via `.android.tsx` / `.tsx` pair** — `src/components/TourHeroCard.android.tsx` precedent. Use ONLY when a fix demands platform-divergent UI; avoid for alignment fixes that should be unified.
- **Manual physical-device QA bar** — every M1 phase has a QA matrix; Phase 7 follows the same convention but with per-screen scope (D-06).

### Integration points
- **Screens likely to be flagged** (inferred from prior phase work and CLAUDE.md domain — confirm at planning time once screenshots arrive):
  - `src/screens/HomeScreen.tsx` — tri-state category toggle, hospitality strip, filter chips (heavily reworked in Phase 6)
  - `src/screens/PropertyDetailsScreen.tsx` — Hospitality branches (Phase 6 D-13..D-23 + HI-01 fix), residential price block, sticky contact bar
  - `src/screens/CreateListingScreen.tsx` — orchestrator (871 LOC after Phase 4); category-branched mounts
  - `src/components/CreateListingForm/MediaSection.tsx` — Phase 4 brownfield hex literals here (`:163`, `:315`, `:328`) — Token Escalation rule applies
  - `src/components/HospitalityCard.tsx` — Phase 6 D-07..D-12 visual contract; preserve no-price/tour-first invariants when alignment fix lands here
  - `src/components/PropertyCard.tsx` — Phase 6 zero-diff invariant (D-07 / Pitfall 7) — alignment fixes here MUST be intentional and visible-in-screenshot
  - 4 auth screens (Login, Signup, ForgotPassword, ResetPassword), AccountSettings, ChatThread, ChatCompose, FavoritesScreen, OwnerListingsScreen, RenterListingsScreen, ProfileScreen, ScheduleViewing — any may surface
- **Theme-coupling chokepoint** — every fix that touches color routes through `useTheme()` consumption; this is the single hot path that ALIGN-02 polices.

</code_context>

<specifics>
## Specific Ideas

- **Phase 4 grandfathered brownfield literals named Phase 7 as the venue** — `MediaSection.tsx` overlay-on-black-contrast (`'#121212'` / `'#FFFFFF'` line 163), removeImageText (`'#FFF'` line 315), addTourButton shadowColor (`'#000'` line 328). Per D-04 + Token Escalation default, these are NOT auto-folded into Phase 7 — they fold in only if the user-provided screenshot of CreateListingScreen's MediaSection flags the contrast or shadow as the visible defect. If folded, the fix follows the "transcribe + document in PLAN Deviations" path unless the user requests a new theme token instead.
- **Phase 6 HI-01 closure pattern (`b1da946`)** is the canonical D-09 surgical-patch shape — single targeted edit, narrowly-scoped commit, matrix re-walk on the affected cell only. Phase 7 PLANs reference this commit when a re-walk fix lands.

</specifics>

<deferred>
## Deferred Ideas

- **Token-escalation policy formalization** as a project-wide ADR — captured here as Claude's-discretion default. Revisit in Phase 8 release-prep or M2 if Phase 7 surfaces ≥2 fixes that legitimately needed new tokens.
- **Phase 6 deferred polish** (`ME-02`, `ME-03`, 8 LOW/INFO findings, `WR-02` i18n parity regex digit-skip) — routed to Phase 8 release-prep or post-M1 unless a Phase 7 screenshot surfaces one of those screens with the related defect visible.
- **Landscape orientation support** for any flagged screen — out of scope by default; revisit only if a user-provided screenshot is explicitly captured in landscape.
- **Visual snapshot / regression testing tooling** (e.g., Storybook + Chromatic, react-native screenshot diff) — out of scope for M1; manual physical-device QA is the bar per CLAUDE.md.
- **Refactor opportunities surfaced by alignment fixes** — captured per-PLAN in `<deferred>` blocks; rolled to backlog at phase exit.

</deferred>

---

*Phase: 07-alignment-pass*
*Context gathered: 2026-04-26*

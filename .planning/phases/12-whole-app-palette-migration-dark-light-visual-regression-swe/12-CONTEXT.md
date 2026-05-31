# Phase 12: Whole-App Palette Migration (Dark + Light) + Visual-Regression Sweep — Context

**Gathered:** 2026-05-31
**Status:** Ready for planning

<domain>
## Phase Boundary

Rewrite `src/theme/colors.ts` light + dark token sets to the MoveIn handoff palette, add 9 new tokens that have no current analog, and preserve the existing 22-key `ThemeColors` shape so the 94 `useTheme()` call sites across `src/` + `App.tsx` require zero edits. Then walk a 15-screen risk-target list on iPhone 15 Pro Max + Moto G XT2513V × EN/RU × light/dark with `FAIL = 0`.

This is the **foundation phase** for M6 — every later M6 phase (Phase 13 data model, Phase 14 filter variants, Phase 15 settings restructure, Phase 16 profile reskin) reads tokens from the new `colors.ts`. Phase 12 only **ships the tokens**; the two new layered surfaces (`surface2`, `surface3`) and the `iconChipFg` token are wired up in Phase 14+.

</domain>

<spec_lock>
## Requirements (locked via SPEC.md)

**3 requirements are locked.** See `12-SPEC.md` for full requirements, boundaries, and acceptance criteria.

Downstream agents MUST read `12-SPEC.md` before planning or implementing. Requirements are not duplicated here.

**In scope (from SPEC.md):**
- Rewrite `src/theme/colors.ts` dark + light value sets to handoff tokens (PAL-01, PAL-02).
- Add 9 new keys to `ThemeColors`: `bgDim`, `surface2`, `surface3`, `hair2`, `iconChipFg`, `accentSoft`, `accentLine`, `landlordGreen`, `destructiveRed`. Update `ThemeColors` type export.
- Update `src/theme/ThemeContext.tsx` if it does sanity-checking against the old shape (confirmed no-op: `ThemeColors = typeof colors.light` auto-picks new keys).
- Preserve mode-independence for accent (+ soft + line), landlord green, destructive red.
- Risk-targeted visual-regression sweep on the 15-screen list (SPEC §Boundaries).
- `12-VERIFICATION.md` artifact at phase close capturing the sweep cells + dispositions.

**Out of scope (from SPEC.md):**
- Renaming any existing `ThemeColors` key.
- Editing any of the 94 `useTheme()` call sites.
- Full screen-catalog walk (only the 15 risk-target screens are walked explicitly; ~10 lower-risk screens are inheritance-sampled).
- WCAG AA automated contrast testing (operator-judged only).
- Theme switching animation polish.
- The handoff "Tweaks panel" (Appearance / Accent switcher) — not product.
- Green accent option (`#36c98f`) — pink stays brand default.
- Phase 14 filter-variant component implementations.
- Profile / Settings reskin (Phase 15 + 16 territory).
- Backend / API / data-shape changes.
- i18n changes.
- Actually CONSUMING the new `surface2` / `surface3` tokens in any screen during Phase 12 (consumers wire up in Phase 14+).

</spec_lock>

<decisions>
## Implementation Decisions

### Orphan-key remap strategy

15 existing `ThemeColors` keys have no clean handoff mapping: `primary`, `primaryLight`, `inputBackground`, `chipBackground`, `chipBorder`, `activeChipBackground`, `activeChipText`, `success`, `error`, `warning`, `onWarning`, `onAccent`, `scrim`, `cardShadow`, `buttonText`.

- **D-01: Retain all 15 orphan keys VERBATIM in both modes.** No remap. The Phase 12 colors.ts diff is purely additive (+9 new tokens) plus value-rewrites on the 7 keys that DO map to handoff (`background`, `surface`, `text`, `textSecondary`, `textTertiary`, `border`, `accent`). The 15 orphan keys keep their current `#hex` / `rgba()` values verbatim from `src/theme/colors.ts` HEAD.
  - **Why:** `colors.primary` is used as a CTA `backgroundColor` on ForgotPasswordScreen, LandlordApplicationScreen submit, LandlordApplicationQueueScreen chip-selected-state, and several ActivityIndicator tints. Flipping `primary → accent` would be a CTA reskin that belongs in Phase 16 (Profile reskin) not in Phase 12 (token foundation). Same logic for `inputBackground`, `chipBackground`, `cardShadow` — surgical consumers reskin in Phases 14+/15+/16+, not en masse in Phase 12.
  - **Effect on the sweep:** old-token surfaces (e.g. a dark-mode form input at `#2E3238`) will sit alongside new-token surfaces (e.g. dark background at `#121214`). This is acceptable and matches the SPEC's "mass-disposition / logical-equivalence" disposition window — the sweep verifies READABILITY + CONTRAST, not visual-token uniformity. Later M6 phases re-skin surgically.
  - **No call-site edits required.** Constraint preserved.

- **D-02: `onAccent` retained at `#FFFFFF` in both modes.** Reads as `#FFFFFF` text on the new pink `#ff5a6f` accent — passes WCAG AA (contrast ratio ≈ 4.5:1 on the white-text-on-pink path; existing precedent from RejectionBanner per M2 Phase 3 D-05). No change needed.

- **D-03: `scrim` retained at `rgba(0,0,0,0.55)` in both modes.** Already correct — scrim sits above arbitrary photo content, so its readability is independent of theme background. No change.

### Mode-independence implementation shape

- **D-04: Extract a `MODE_INDEPENDENT_PALETTE` const at module top and spread it into both `light` and `dark` blocks.** Shape:
  ```ts
  const MODE_INDEPENDENT_PALETTE = {
    accent: '#ff5a6f',
    accentSoft: 'rgba(255,90,111,0.16)',
    accentLine: 'rgba(255,90,111,0.45)',
    landlordGreen: '#35c98f',
    destructiveRed: '#ff4d4d',
  } as const;

  export const colors = {
    light: { ...MODE_INDEPENDENT_PALETTE, /* light-only tokens */ },
    dark:  { ...MODE_INDEPENDENT_PALETTE, /* dark-only tokens */ },
  };
  ```
  - **Why structural extraction (not inline duplication):** SPEC §Constraints requires mode-independence to be FALSIFIABLE. Inline `accent: '#ff5a6f'` declared twice can silently drift on a careless edit. The spread is enforced by the source structure — drift would require deleting the spread, which is visible in a diff. Acceptance checks `colors.light.accent === colors.dark.accent` (etc.) pass by construction.

### Visual-regression sweep capture format

- **D-05: Mass-disposition table per M3 Plan 05-05 precedent.** `12-VERIFICATION.md` artifact has ONE row per (screen × device) with inline EN/RU and light/dark disposition columns. That's 15 screens × 2 devices = 30 rows max.
  - Column shape (illustrative): `Screen | Device | EN-light | EN-dark | RU-light | RU-dark | Notes`.
  - Per-cell value: `PASS` / `FAIL` / `INHERITS-FROM-<row>` (logical-equivalence shortcut — e.g. RU-dark inherits from EN-dark if only text-string changes and no visible token drift).
  - Operator captures FAIL evidence (1 sentence + screenshot path optional) only on FAIL rows.
  - **Why mass-disposition (not full 120-row matrix):** M3 RETROSPECTIVE lesson — full-matrix tables become busy-work without proportional audit value when the sweep is risk-targeted to start with. SPEC explicitly authorizes "Mass-disposition / logical-equivalence per M3 Plan 05-05 precedent is allowed".
  - **Why not FAIL-only log:** the auditable artifact needs to show the sweep was actually performed, not just that nothing failed. Mass-disposition keeps PASS rows visible.

### Plan splitting

- **D-06: Two atomic plans for Phase 12.**
  - **Plan 12-01** — Rewrite `src/theme/colors.ts`: extract `MODE_INDEPENDENT_PALETTE` const, rewrite the 7 mappable keys to handoff values in both modes, retain the 15 orphan keys verbatim, add the 9 new tokens in both modes, update the `ThemeColors` type export (or leave `typeof colors.light` to auto-pick). Atomic commit. Acceptance: SPEC's 24 token-value checkboxes + tsc clean + KBD-02 grep gate exit 0 + i18n parity gate exit 0.
  - **Plan 12-02** — Walk the 15-screen risk-target sweep on both physical devices × EN/RU × light/dark; write `12-VERIFICATION.md` with the mass-disposition table; record any FAIL findings inline. Atomic commit. Acceptance: SPEC's 4 sweep checkboxes (FAIL=0 on each device track, artifact written).
  - **Why two plans (not three):** dark + light parity is one atomic commit's worth of work — the diff is a single file. Splitting dark/light into separate plans creates a transient state where dark works and light is broken (or vice versa). Two-plan structure also mirrors how M3 Plan 05-05 + 05-06 cleanly separated "code change" from "device QA" — a project-known shipping pattern.

### Type export shape

- **D-07: Keep `export type ThemeColors = typeof colors.light` (current shape, auto-discovery).** With both `light` and `dark` spreading the same `MODE_INDEPENDENT_PALETTE` and having the same additive new keys, `typeof colors.light` and `typeof colors.dark` are structurally identical. Auto-discovery is additive-safe: a new key appears in `ThemeColors` the moment it's added in `colors.ts`, no second source-of-truth to maintain.
  - **Alternative considered:** explicit `interface ThemeColors {...}` declaration. Rejected — adds a second source of truth that the planner / future-Bek must keep in sync; the current pattern has 3 milestones of evidence working fine.

### Claude's Discretion

User answered "Go with your defaults" — all four gray areas above are Claude-resolved. The decisions in D-01 through D-07 above ARE the discretion calls. They are aggressive about minimizing visual surprise (D-01 retain-verbatim) and structurally rigorous about the falsifiability constraint (D-04 const extraction).

If the planner finds during research that a specific orphan key is causing a visible artifact under the new background/surface tokens (e.g. `inputBackground = #2E3238` looking obviously wrong against `background = #121214`), the planner is authorized to remap THAT KEY specifically and flag it in `12-RESEARCH.md` — but only with explicit justification. The default is verbatim.

### Implementation specifics (locked from MoveIn handoff README §Design Tokens)

**Dark tokens (rewritten + new — full source list):**
- `background: '#121214'` (rewritten)
- `bgDim: '#0c0c0e'` (NEW)
- `surface: '#1c1c20'` (rewritten)
- `surface2: '#26262c'` (NEW)
- `surface3: '#303038'` (NEW)
- `border: 'rgba(255,255,255,0.08)'` (rewritten from `#2E3238` — Hairline)
- `hair2: 'rgba(255,255,255,0.14)'` (NEW — Hairline-strong)
- `text: '#f4f4f6'` (rewritten from `#F5F5F5`)
- `textSecondary: 'rgba(244,244,246,0.60)'` (rewritten from `#A0A3A8` — Dim)
- `textTertiary: 'rgba(244,244,246,0.40)'` (rewritten from `#6B6F76` — Mute)
- `iconChipFg: 'rgba(244,244,246,0.85)'` (NEW)

**Light tokens (rewritten + new — full source list):**
- `background: '#f3f3f6'` (rewritten from `#F0F2F5`)
- `bgDim: '#e7e7ec'` (NEW)
- `surface: '#ffffff'` (rewritten from `#FFFFFF` — already correct, normalized to lowercase)
- `surface2: '#f0f0f4'` (NEW)
- `surface3: '#e4e4ea'` (NEW)
- `border: 'rgba(0,0,0,0.08)'` (rewritten from `#E0E0E0` — Hairline)
- `hair2: 'rgba(0,0,0,0.13)'` (NEW — Hairline-strong)
- `text: '#16161a'` (rewritten from `#2D2D2D`)
- `textSecondary: 'rgba(22,22,28,0.62)'` (rewritten from `#666666` — Dim)
- `textTertiary: 'rgba(22,22,28,0.42)'` (rewritten from `#999999` — Mute)
- `iconChipFg: 'rgba(22,22,28,0.80)'` (NEW)

**Mode-independent (`MODE_INDEPENDENT_PALETTE` — spread into both modes):**
- `accent: '#ff5a6f'`
- `accentSoft: 'rgba(255,90,111,0.16)'`
- `accentLine: 'rgba(255,90,111,0.45)'`
- `landlordGreen: '#35c98f'`
- `destructiveRed: '#ff4d4d'`

**Orphan keys retained verbatim (15 keys, both modes):** see `src/theme/colors.ts` HEAD. No changes:
- light: `primary #2D2D2D`, `primaryLight #F2EFE9`, `inputBackground #FFFFFF`, `chipBackground #FFFFFF`, `chipBorder #E0E0E0`, `activeChipBackground #2D2D2D`, `activeChipText #FFFFFF`, `success #4CAF50`, `error #F44336`, `warning #F59E0B`, `onWarning #FFFFFF`, `onAccent #FFFFFF`, `scrim 'rgba(0,0,0,0.55)'`, `cardShadow #1A1A1A`, `buttonText #5D5045`.
- dark: `primary #FFFFFF`, `primaryLight #353941`, `inputBackground #2E3238`, `chipBackground #2E3238`, `chipBorder #3E4349`, `activeChipBackground #E0E0E0`, `activeChipText #121212`, `success #66BB6A`, `error #EF5350`, `warning #F59E0B`, `onWarning #0F172A`, `onAccent #FFFFFF`, `scrim 'rgba(0,0,0,0.55)'`, `cardShadow #000000`, `buttonText #E0E0E0`.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase Spec (PRD-equivalent — single source of truth for requirements)
- `.planning/phases/12-whole-app-palette-migration-dark-light-visual-regression-swe/12-SPEC.md` — Locked requirements PAL-01/02/03 + 28 acceptance checkboxes. Read first; do not duplicate.

### MoveIn Design Handoff (token values + structural rationale)
- `/tmp/moveinzip_ld/design_handoff_profile_filters/README.md` §Design Tokens — Authoritative palette source (dark + light + mode-independent token list with exact hex / rgba values). The `D-08` token list in this CONTEXT.md is derived from here.
- `/tmp/moveinzip_ld/design_handoff_profile_filters/filters-shared.jsx` lines 7–16 — Token-key vocabulary (`bg`, `bgDim`, `surface`, `surface2`, `surface3`, `hair`, `hair2`, `text`, `dim`, `mute`). Useful when reading the prototype JSX to map a CSS variable name back to a `ThemeColors` key.
- `MoveIn_ Real Estate_LD_Mode.zip` (project root) — Original handoff archive (extracted to `/tmp/moveinzip_ld/`). Re-extract if the `/tmp` location is stale.

### Project Planning Context
- `.planning/REQUIREMENTS.md` §M6 / PAL-01 / PAL-02 / PAL-03 — Phase 12 requirement bodies.
- `.planning/ROADMAP.md` §Phase 12 — Goal + Success Criteria + Depends-on chain (Phase 12 is foundation; Phases 13–16 depend on it).
- `.planning/PROJECT.md` — M6 current focus context.
- `.planning/STATE.md` — Current milestone status.

### Codebase Anchors
- `src/theme/colors.ts` — The ONE file edited in Plan 12-01. Current shape: two flat objects (`light`, `dark`) plus `export type ThemeColors = typeof colors.light`.
- `src/theme/ThemeContext.tsx` — Consumes `colors[currentTheme]` via `useTheme()`. No type assertion against shape; `ThemeColors = typeof colors.light` flows through automatically. No edit required.
- `.planning/codebase/CONVENTIONS.md` — Theme-token conventions: no hardcoded colors, dark/light parity required.

### Prior-Phase Precedents
- `.planning/milestones/v3.0-ROADMAP.md` — M3 Plan 05-05 mass-disposition matrix pattern (sweep capture format precedent — D-05).
- `.planning/phases/06-schema-extension-backend-mongoose-rn-type-stub-body-strip-va/06-CONTEXT.md` — Recent CONTEXT.md shape for cross-referencing tone + structure.

### Gate Scripts (run during Plan 12-01 verification)
- `scripts/check-i18n-parity.sh` — Must exit 0 (no new strings introduced in Phase 12 → trivially satisfied).
- M1 KBD-02 grep gate — `grep -rn "keyboardVerticalOffset" src/ | wc -l` MUST equal 0 (3-milestone-held invariant per memory `m1-keyboard-kbd-02-invariants.md`).
- `npx tsc --noEmit` — Must show zero NEW errors against pre-Phase-12 baseline.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`src/theme/colors.ts`** — Single-source-of-truth flat-object pattern; the entire migration happens here. ~67 lines today; will grow by ~25 lines (new keys × 2 modes + `MODE_INDEPENDENT_PALETTE` extraction + comments). Still well under any size budget.
- **`src/theme/ThemeContext.tsx`** — `ThemeColors = typeof colors.light` is the type contract. Already additive-safe. No change required.
- **`useTheme()` hook** — 75 call sites across `src/` + `App.tsx`. Each call site reads `const { colors } = useTheme()` then dereferences `colors.X`. By preserving every existing key name, all 75 sites keep compiling without edit.

### Established Patterns
- **Flat-object palette (not nested).** Phase 12 preserves this. Handoff's nested CSS-variable approach is FLATTENED into the flat `colors.light` / `colors.dark` shape on the way in.
- **Lowercase hex.** Today's `colors.ts` is mixed-case (`#FFFFFF` vs the handoff's `#ffffff`). D-08 normalizes everything to lowercase for consistency with handoff source.
- **rgba() string format.** Today's `scrim: 'rgba(0,0,0,0.55)'` is a string literal — the new tokens (`textSecondary`, `textTertiary`, `border`, `hair2`, `iconChipFg`, `accentSoft`, `accentLine`) follow the same convention. No `chroma`-style helper needed.
- **Comments inline above key.** Existing `colors.ts` has `// Phase 3 Plan 03-05 (revision 2 W6) — semantic tokens for media-curation surface.` style comments above non-obvious tokens. Plan 12-01 should add a similar inline comment block above `MODE_INDEPENDENT_PALETTE` explaining the falsifiability constraint, and above each NEW key explaining its handoff origin + the Phase that wires it up.

### Integration Points
- **94 `useTheme()` call sites stay untouched.** No file outside `src/theme/colors.ts` should appear in Plan 12-01's diff. If any other file shows up in the diff, it's a scope-creep flag — block the commit.
- **Plan 12-02 only writes one new file:** `.planning/phases/12-whole-app-palette-migration-dark-light-visual-regression-swe/12-VERIFICATION.md`. No `src/` changes in Plan 12-02.
- **Cross-cut into M6 Phases 14/15/16:** when those phases need `colors.surface2` / `colors.iconChipFg` / etc., the tokens are already shipped. Phase 12 doesn't predict where they'll be consumed — that's not its job.

</code_context>

<specifics>
## Specific Ideas

- **Token comment provenance:** Each new key in `colors.ts` should carry an inline `// MoveIn handoff 2026-05-31 — used by Phase 14+ <component>` comment so future debugging knows where the value came from and who consumes it. (Borrowed from M3 Phase 3 Plan 03-05's commenting style.)
- **`MoveIn_ Real Estate_LD_Mode.zip` at project root:** the archive is the source of truth — `/tmp/moveinzip_ld/` is its extraction. If the planner needs to re-extract: `unzip "MoveIn_ Real Estate_LD_Mode.zip" -d /tmp/moveinzip_ld/`. Plan 12-01 should NOT delete or move the archive (it stays in the repo root per user's organization preference, even though it's gitignored).
- **Sweep ordering hint (Plan 12-02):** walk light mode first on each device, then flip to dark — minimizes mode-switching toggle taps. Walk EN first, RU second — RU locale changes only text strings, so RU is the inheritance-source candidate (per M3 Plan 05-05 logical-equivalence pattern).

</specifics>

<deferred>
## Deferred Ideas

- **Orphan-key surgical remap to handoff:** Phase 16 (Profile reskin), Phase 14 (Filter variants), Phase 15 (Account Settings) will each touch `primary`, `inputBackground`, `chipBackground`, `cardShadow` in service of their own scope. None of those remaps belongs in Phase 12. If a specific surface in those phases needs to flip from neutral to handoff tones, the per-component edit lands there.
- **Green-accent (`#36c98f`) alt token:** handoff exposes it as a Tweaks-panel option. Not adopted in M6 v1 (per REQUIREMENTS.md). If a future milestone adopts user-pickable accent, the `MODE_INDEPENDENT_PALETTE` extraction makes the swap a single-source edit.
- **Automated WCAG AA contrast testing:** SPEC §Out of scope. A future tooling phase could introduce `@adobe/leonardo-contrast-colors` or similar. For Phase 12, operator judgment is the contract.
- **Theme-switch animation polish:** existing instant swap is fine. A future polish phase could add a 200ms cross-fade. Not Phase 12.
- **Newsreader serif loading (display typography):** explicitly excluded per memory `m6-scope-decisions-2026-05-31.md`. Existing `Platform.select({ ios: 'Georgia', android: 'serif' })` covers it.
- **`surface2` / `surface3` actually consumed in any screen:** Phase 12 only SHIPS the tokens. Phase 14 (Cascading Reveal inline filter panel + Guided Steps bottom sheet) is the first consumer. If a Phase 12 sweep screen happens to look "flat" without `surface2`/`surface3` layering, that's expected — Phase 14 lights them up.

</deferred>

---

*Phase: 12-whole-app-palette-migration-dark-light-visual-regression-swe*
*Context gathered: 2026-05-31*

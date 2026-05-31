# Phase 12: Whole-App Palette Migration (Dark + Light) + Visual-Regression Sweep — Specification

**Created:** 2026-05-31
**Ambiguity score:** 0.185 (gate: ≤ 0.20)
**Requirements:** 3 locked (PAL-01, PAL-02, PAL-03)

## Goal

`src/theme/colors.ts` dark + light token sets are rewritten to the MoveIn handoff values, with new tokens added where the handoff introduces concepts that have no current analog (`bgDim`, `surface2`, `surface3`, `hair2`, `iconChipFg`). The existing `ThemeColors` shape — every key currently consumed via `useTheme()` across 94 call sites — is **preserved**; no key is renamed or removed. Mode-independent accent (pink `#ff5a6f` + soft + line), landlord green (`#35c98f`), and destructive red (`#ff4d4d`) render identically in both modes. A risk-targeted set of 15 high-color-density screens is walked on iPhone 15 Pro Max + Moto G XT2513V × EN/RU × light/dark with zero broken-contrast / illegible-text / theme-drift findings.

## Background

**Today.** `src/theme/colors.ts` defines two flat objects (`light`, `dark`) consumed via `useTheme()` from `src/theme/ThemeContext.tsx`. 94 files (39 screens + 50+ components + tests) read tokens off this object — `colors.background`, `colors.surface`, `colors.text`, `colors.textSecondary`, `colors.textTertiary`, `colors.accent`, `colors.border`, `colors.inputBackground`, `colors.chipBackground`, `colors.success`, `colors.error`, `colors.warning`, `colors.onAccent`, `colors.scrim`, etc. — 22 keys per mode.

**Current palette values:**

- Light: `background #F0F2F5`, `surface #FFFFFF`, `text #2D2D2D`, `textSecondary #666666`, `textTertiary #999999`, `border #E0E0E0`, `accent #FF385C`
- Dark: `background #191A1D`, `surface #25282F`, `text #F5F5F5`, `textSecondary #A0A3A8`, `textTertiary #6B6F76`, `border #2E3238`, `accent #FF5C7C`

**Trigger.** The MoveIn design handoff (`MoveIn_ Real Estate_LD_Mode.zip`, 2026-05-31, extracted at `/tmp/moveinzip_ld/design_handoff_profile_filters/`) ships a coherent dark + light palette system that all M6 redesign work depends on. The new tokens are **darker, cooler, and more layered** than today's set — for example, dark `background` shifts from `#191A1D` to `#121214`, dark `surface` from `#25282F` to `#1c1c20`. The handoff additionally introduces 3 layered surface tones (`surface / surface2 / surface3`) and 2 hairline weights (`hair / hair2`) that today's flat shape doesn't express — required by Phase 14's filter variants (Guided Steps bottom-sheet wizard + Cascading Reveal inline panel with nested surfaces).

**Gap.** No semantic-key analog exists for `bgDim`, `surface2`, `surface3`, `hair2`, `iconChipFg`. These must be added as new keys. Existing keys whose semantic role matches a handoff token get their value updated (`textSecondary` → handoff `dim` value, `textTertiary` → handoff `mute` value, `border` → handoff `hair` value). The keyset shape stays additive — no renames, no deletes — so the 94 consumer files require zero edits in Phase 12. Filter variants in Phase 14 will reach for the new `colors.surface2` / `colors.surface3` / etc. directly.

**Locked decisions** (from M6 scoping conversation 2026-05-31):

- Preserve existing key names; add new keys for handoff-only concepts.
- Accent + landlord green + destructive red are mode-independent (same value in both `light` and `dark`).
- Visual regression sweep is risk-targeted (15 screens), not full-catalog (~25 screens).

## Requirements

1. **PAL-01 — Dark palette tokens migrated**: The `colors.dark` set in `src/theme/colors.ts` is rewritten to handoff dark values, with new keys added for handoff-only concepts.
   - **Current:** `colors.dark` has 22 keys including `background #191A1D`, `surface #25282F`, `text #F5F5F5`, `textSecondary #A0A3A8`, `textTertiary #6B6F76`, `border #2E3238`, `accent #FF5C7C`, `inputBackground #2E3238`, `chipBackground #2E3238`, `chipBorder #3E4349`. Missing: any analog for `bgDim`, `surface2`, `surface3`, `hair2`, `iconChipFg`.
   - **Target:** `colors.dark` rewritten so that:
     - `background = #121214`, `text = #f4f4f6`, `surface = #1c1c20`, `textSecondary = rgba(244,244,246,0.60)`, `textTertiary = rgba(244,244,246,0.40)`, `border = rgba(255,255,255,0.08)`, `accent = #ff5a6f`
     - New keys added: `bgDim = #0c0c0e`, `surface2 = #26262c`, `surface3 = #303038`, `hair2 = rgba(255,255,255,0.14)`, `iconChipFg = rgba(244,244,246,0.85)`, `accentSoft = rgba(255,90,111,0.16)`, `accentLine = rgba(255,90,111,0.45)`, `landlordGreen = #35c98f`, `destructiveRed = #ff4d4d`
     - Existing keys with no clean handoff mapping (`primary`, `primaryLight`, `inputBackground`, `chipBackground`, `chipBorder`, `activeChipBackground`, `activeChipText`, `success`, `error`, `warning`, `onWarning`, `onAccent`, `scrim`, `cardShadow`, `buttonText`) are remapped to the nearest handoff value or retained verbatim; this mapping is a Phase 12 implementation decision (discuss-phase territory), with the constraint that NO key is renamed or removed and NO existing call site requires editing.
   - **Acceptance:** A diff of `src/theme/colors.ts` shows (a) `colors.dark.background === '#121214'`, (b) `colors.dark.surface === '#1c1c20'`, (c) `colors.dark.text === '#f4f4f6'`, (d) `colors.dark.accent === '#ff5a6f'`, (e) the 9 new keys above all present with the values listed, (f) no key from the pre-Phase-12 `ThemeColors` type was removed (`grep "colors\.<key>" src/ App.tsx` returns the same set of keys as before for each pre-existing key). Tsc passes; no `useTheme()` call site requires editing.

2. **PAL-02 — Light palette tokens migrated**: The `colors.light` set is rewritten to handoff light values, with the same new keys added (parity with PAL-01).
   - **Current:** `colors.light` has 22 keys including `background #F0F2F5`, `surface #FFFFFF`, `text #2D2D2D`, `textSecondary #666666`, `textTertiary #999999`, `border #E0E0E0`, `accent #FF385C`.
   - **Target:** `colors.light` rewritten so that:
     - `background = #f3f3f6`, `text = #16161a`, `surface = #ffffff`, `textSecondary = rgba(22,22,28,0.62)`, `textTertiary = rgba(22,22,28,0.42)`, `border = rgba(0,0,0,0.08)`, `accent = #ff5a6f` (mode-independent — same as dark)
     - New keys added: `bgDim = #e7e7ec`, `surface2 = #f0f0f4`, `surface3 = #e4e4ea`, `hair2 = rgba(0,0,0,0.13)`, `iconChipFg = rgba(22,22,28,0.80)`, `accentSoft = rgba(255,90,111,0.16)` (mode-independent), `accentLine = rgba(255,90,111,0.45)` (mode-independent), `landlordGreen = #35c98f` (mode-independent), `destructiveRed = #ff4d4d` (mode-independent)
     - Same "no rename / no remove / no call-site edit" constraint as PAL-01.
   - **Acceptance:** A diff shows (a) `colors.light.background === '#f3f3f6'`, (b) `colors.light.surface === '#ffffff'`, (c) `colors.light.text === '#16161a'`, (d) `colors.light.accent === '#ff5a6f'`, (e) `colors.light.accent === colors.dark.accent` (mode-independent), (f) `colors.light.landlordGreen === colors.dark.landlordGreen` (mode-independent), (g) `colors.light.destructiveRed === colors.dark.destructiveRed` (mode-independent), (h) the 9 new keys all present, (i) keyset identical to PAL-01 dark (`Object.keys(colors.light).sort() === Object.keys(colors.dark).sort()`). Tsc passes.

3. **PAL-03 — Risk-targeted visual-regression sweep**: A defined 15-screen risk-target list is walked on both physical devices × EN/RU × light/dark with no contrast / legibility / theme-drift findings.
   - **Current:** No regression baseline exists; screens render against old palette.
   - **Target:** Operator walks every screen in the **Risk-Target Screen List** (see Boundaries) on iPhone 15 Pro Max + Moto G XT2513V × EN + RU × light + dark mode. Captures a single PASS / FAIL per (screen × device × locale × mode) cell. Records findings in a `12-VERIFICATION.md` artifact at phase close.
   - **Acceptance:** The 15 risk-target screens render with: (a) the new dark `#121214` background visible on dark-mode screens, (b) the new light `#f3f3f6` background visible on light-mode screens, (c) the new accent `#ff5a6f` on all CTA / active / badge surfaces in both modes, (d) text contrast meets WCAG AA (4.5:1 normal text, 3:1 large text — operator-judged, no automated checker required), (e) zero "old palette bleeding through" artifacts (e.g., an M5-era surface rendering at `#25282F` when the rest of the screen is `#1c1c20`). Mass-disposition / logical-equivalence per M3 Plan 05-05 precedent is allowed for cells where the operator can demonstrably argue the screen inherits behavior verified on another cell. `FAIL = 0` at close.

## Boundaries

**In scope:**

- Rewrite `src/theme/colors.ts` dark + light value sets to handoff tokens (PAL-01, PAL-02).
- Add 9 new keys to `ThemeColors`: `bgDim`, `surface2`, `surface3`, `hair2`, `iconChipFg`, `accentSoft`, `accentLine`, `landlordGreen`, `destructiveRed`. Update `ThemeColors` type export to reflect the new shape.
- Update `src/theme/ThemeContext.tsx` if it does any sanity-checking or type assertion against the old shape (likely a no-op since `ThemeColors = typeof colors.light`).
- Preserve mode-independence for accent (+ soft + line), landlord green, destructive red — same value in `light` and `dark`.
- Risk-targeted visual-regression sweep on the 15-screen list (see Risk-Target Screen List below).
- A `12-VERIFICATION.md` artifact at phase close capturing the sweep cells + pass/fail dispositions.

**Risk-Target Screen List (15 screens — explicit in-scope walk):**

1. HomeScreen — filter chips, location pill, theme + language toggles, search header, result count strip
2. PropertyCard — multiple surfaces, accent pills, status badges, sale/rent dot, owner-action buttons
3. PropertyDetailsScreen + every component under `src/components/details/*` (HeaderInfoCard, AttributeList, MapPreviewCard, etc.) — heaviest screen; many surface layers, sticky bars, accent CTAs, modal overlays
4. HospitalityCard — tour-first layout distinct from PropertyCard
5. ChatScreen — bubble surfaces, KAV layout
6. ChatThreadScreen — bubble surfaces, header chrome, KAV layout
7. ChatComposeScreen — preview card + input row + KAV layout
8. ContextualListingFlow (all 6 steps, including the stepper + form chrome + photo dropzone in admin-mod mode) — covered via the orchestrator component file
9. MediaCurationScreen — photo grid, action dock, scrim overlay, accent CTA buttons
10. ProfileScreen — identity card, landlord banner, role-gated tiles, ADMIN TOOLS section
11. AccountSettingsScreen — card list + section labels + Delete-account row
12. ModerationQueueScreen — queue rows + status pills + filter chips
13. LandlordApplicationQueueScreen — admin queue (similar surface to ModerationQueue)
14. RoleManagementScreen — search field + role picker chips
15. BottomNavigator — active/inactive tab states with accent indicator

**Out of scope:**

- **Renaming any existing `ThemeColors` key** — preserved by locked decision. `colors.background`, `colors.surface`, `colors.text`, `colors.textSecondary`, `colors.textTertiary`, `colors.border`, etc. stay verbatim. Reason: avoids touching 94 `useTheme()` call sites; the migration is value-only + additive on key set.
- **Editing any of the 94 `useTheme()` call sites** — no per-screen hex literal cleanup, no semantic-key remap at consumer level. Reason: scope guard. If any screen relies on a hex value Phase 12 cannot honor with the new tokens, it's flagged as a Phase-13+ task, not back-fixed in Phase 12.
- **Full screen-catalog walk** — only the 15 risk-target screens are walked explicitly. The remaining ~10 lower-risk screens (Auth flows — Login/Signup/Forgot/Reset; list screens that render PropertyCard — Favorites, RenterListings, OwnerListings, Appointments; Tour3DScreen + TourSelectionScreen — WebView containers; ScheduleViewingScreen; ApplicantProfileScreen; AdminVerificationScreen; ListingAdminScreen) are sampled but not walked as full cells. Reason: they inherit token behavior from shared components already walked; expected risk is low; operator time is finite.
- **WCAG AA automated contrast testing** — operator-judged only. Reason: no automated tooling currently in the project; introducing one is its own task.
- **Theme switching animation polish** — out of scope. Reason: handoff doesn't spec mid-toggle motion; existing instant-swap behavior is acceptable.
- **The handoff's "Tweaks panel" (Appearance / Accent switcher)** — scaffolding, not product. Not ported. Reason: per REQUIREMENTS.md "Out of Scope (M6)".
- **Green accent option (`#36c98f`)** — handoff exposes it as a tweak; not adopted. Reason: pink stays as brand default per REQUIREMENTS.md.
- **Phase 14 filter-variant component implementations** — Phase 14 territory. PAL only ships the tokens those variants will use.
- **Profile/Settings reskin** — Phase 15 + 16 territory. PAL only ships the tokens those reskins will use.
- **Backend / API / data-shape changes** — M6 is client-only.
- **i18n changes** — no new EN/RU strings introduced by Phase 12.
- **The two new layered surface tones (`surface2`, `surface3`) actually being USED in any screen during Phase 12** — Phase 12 only ADDS the tokens; consumers wire up in Phase 14+.

## Constraints

- **TypeScript compilation must remain clean.** `ThemeColors = typeof colors.light` automatically picks up the additive new keys; no consumer file should hit a type error. If consumer code reads a removed/renamed key, it's a Phase 12 failure (renames are out of scope).
- **No regression on M1 KBD-02 grep gate.** `keyboardVerticalOffset` count in `src/` must remain 0 (3-milestone-held invariant per memory `m1-keyboard-kbd-02-invariants.md`). Phase 12 doesn't touch keyboard code but the gate runs in CI regardless.
- **EN+RU i18n parity gate.** `scripts/check-i18n-parity.sh` exits 0 (no new strings in Phase 12, so trivially satisfied).
- **Mode-independence for accent / landlord green / destructive red is mandatory** — implementation must make this falsifiable (`colors.light.accent === colors.dark.accent`, same for soft / line / landlord / destructive). Constants extracted to a `MODE_INDEPENDENT_PALETTE` const and spread into both sets is the natural pattern but the discuss-phase locks the implementation shape.
- **No new dependencies.** No font loading (Newsreader explicitly excluded per memory `m6-scope-decisions-2026-05-31.md`). No new theming library. No color-conversion utilities beyond what's already shipping.
- **Both target devices required.** iPhone 15 Pro Max + Moto G XT2513V × EN/RU × light/dark — both devices walked. No single-device dispatch.

## Acceptance Criteria

- [ ] `colors.dark.background === '#121214'`
- [ ] `colors.dark.surface === '#1c1c20'`
- [ ] `colors.dark.text === '#f4f4f6'`
- [ ] `colors.dark.accent === '#ff5a6f'`
- [ ] `colors.dark.bgDim === '#0c0c0e'`
- [ ] `colors.dark.surface2 === '#26262c'`
- [ ] `colors.dark.surface3 === '#303038'`
- [ ] `colors.dark.hair2 === 'rgba(255,255,255,0.14)'`
- [ ] `colors.dark.iconChipFg === 'rgba(244,244,246,0.85)'`
- [ ] `colors.light.background === '#f3f3f6'`
- [ ] `colors.light.surface === '#ffffff'`
- [ ] `colors.light.text === '#16161a'`
- [ ] `colors.light.accent === '#ff5a6f'`
- [ ] `colors.light.bgDim === '#e7e7ec'`
- [ ] `colors.light.surface2 === '#f0f0f4'`
- [ ] `colors.light.surface3 === '#e4e4ea'`
- [ ] `colors.light.hair2 === 'rgba(0,0,0,0.13)'`
- [ ] `colors.light.iconChipFg === 'rgba(22,22,28,0.80)'`
- [ ] `colors.light.accent === colors.dark.accent` (mode-independent)
- [ ] `colors.light.accentSoft === colors.dark.accentSoft` (mode-independent)
- [ ] `colors.light.accentLine === colors.dark.accentLine` (mode-independent)
- [ ] `colors.light.landlordGreen === colors.dark.landlordGreen === '#35c98f'`
- [ ] `colors.light.destructiveRed === colors.dark.destructiveRed === '#ff4d4d'`
- [ ] `Object.keys(colors.light).sort()` deep-equals `Object.keys(colors.dark).sort()` (parity keyset)
- [ ] No pre-Phase-12 `ThemeColors` key was renamed or removed (verified by `grep` for each pre-existing key across `src/` + `App.tsx`)
- [ ] Tsc passes with zero new errors in the change scope
- [ ] M1 KBD-02 grep gate exit code 0 (`keyboardVerticalOffset` count in `src/` stays at 0)
- [ ] i18n parity gate exit code 0
- [ ] iPhone 15 Pro Max walks all 15 risk-target screens × EN + RU × light + dark with `FAIL = 0` cells
- [ ] Moto G XT2513V walks all 15 risk-target screens × EN + RU × light + dark with `FAIL = 0` cells
- [ ] `12-VERIFICATION.md` artifact written capturing the sweep cells and dispositions

## Ambiguity Report

| Dimension          | Score | Min  | Status | Notes                                                                 |
|--------------------|-------|------|--------|-----------------------------------------------------------------------|
| Goal Clarity       | 0.90  | 0.75 | ✓      | Migration strategy, key shape, mode-independence all locked          |
| Boundary Clarity   | 0.80  | 0.70 | ✓      | Risk-target list explicit; out-of-scope items enumerated             |
| Constraint Clarity | 0.75  | 0.65 | ✓      | Tsc + KBD-02 + i18n gates; no new deps; mode-independence falsifiable |
| Acceptance Criteria| 0.75  | 0.70 | ✓      | 28 pass/fail checkboxes including 8 token-value asserts per mode     |
| **Ambiguity**      | 0.185 | ≤0.20| ✓      | Gate passed                                                          |

## Interview Log

| Round | Perspective          | Question summary                                                           | Decision locked                                                                                                                              |
|-------|----------------------|----------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------|
| 0     | (Initial assessment) | Score from REQUIREMENTS.md + ROADMAP alone                                 | Boundary 0.55 (key-name strategy unresolved) — needed Round 1                                                                                |
| 1     | Boundary Keeper      | Preserve existing keys vs rename to handoff names?                          | Preserve existing keys; add new tokens for handoff-only concepts. Scope = colors.ts only; zero call-site edits.                              |
| 1     | Boundary Keeper      | Full screen-catalog walk vs risk-targeted screens?                          | Risk-targeted (15 screens explicit). Lower-risk screens sampled, not walked.                                                                 |

---

*Phase: 12-whole-app-palette-migration-dark-light-visual-regression-swe*
*Spec created: 2026-05-31*
*Next step: /gsd-discuss-phase 12 — implementation decisions (key-by-key remap of the 22 existing keys against the handoff tokens, mode-independent extraction pattern, regression-sweep cell capture format, etc.)*

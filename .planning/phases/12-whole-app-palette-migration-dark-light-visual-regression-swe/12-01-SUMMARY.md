---
phase: 12-whole-app-palette-migration-dark-light-visual-regression-swe
plan: 01
subsystem: theme-tokens
tags: [theme, palette, tokens, m6, foundation, movein-handoff]
requirements_addressed: [PAL-01, PAL-02]
dependency_graph:
  requires: []
  provides:
    - "src/theme/colors.ts: 31-key palette (22 existing verbatim + 9 new) × 2 modes"
    - "MODE_INDEPENDENT_PALETTE const: 5 mode-independent tokens spread into both modes"
    - "9 new tokens for Phase 14+ consumers: bgDim, surface2, surface3, hair2, iconChipFg, accentSoft, accentLine, landlordGreen, destructiveRed"
  affects:
    - "75 useTheme() consumer sites — unchanged, additive-safe via typeof colors.light"
tech_stack:
  added: []
  patterns:
    - "Const-and-spread mode-independence (D-04 falsifiable structural pattern)"
    - "Inline provenance comments on new tokens (M3 Phase 3 Plan 03-05 precedent)"
key_files:
  created: []
  modified:
    - src/theme/colors.ts
key_decisions:
  - "D-01 — orphans verbatim: 15 mixed-case keys retained unchanged in both modes (no preemptive remap)"
  - "D-02 — onAccent stays #FFFFFF both modes (WCAG AA on new #ff5a6f accent)"
  - "D-03 — scrim stays rgba(0,0,0,0.55) (overlay above arbitrary photos, theme-independent)"
  - "D-04 — MODE_INDEPENDENT_PALETTE const + spread (structural falsifiability)"
  - "D-07 — `typeof colors.light` retained (auto-discovery picks up new keys)"
  - "D-08 — handoff values used verbatim, lowercase hex for new + rewritten keys"
metrics:
  duration_seconds: 108
  completed_at: "2026-05-31T17:25:44Z"
  files_changed: 1
  lines_added: 37
  lines_removed: 14
  net_line_delta: +23
  tasks_completed: 1
---

# Phase 12 Plan 01: MoveIn Handoff Palette + MODE_INDEPENDENT_PALETTE Summary

**One-liner:** Rewrote `src/theme/colors.ts` to ship the MoveIn handoff palette (31 keys × 2 modes) with a structurally falsifiable `MODE_INDEPENDENT_PALETTE` const spreading 5 mode-independent tokens into both `light` and `dark` blocks; 75 `useTheme()` consumer sites untouched and tsc baseline preserved at 17.

## Line Count Delta

- HEAD (pre-edit) `src/theme/colors.ts`: **66 lines**
- POST (post-edit) `src/theme/colors.ts`: **89 lines**
- **Delta: +23 lines** (37 insertions, 14 deletions in the diff)

Growth attributable to:
- `MODE_INDEPENDENT_PALETTE` const declaration + 5-line block comment header (+11 lines)
- 9 new tokens × 2 modes = 18 new key-value lines (but offset by removed `accent` inline lines, since accent flows through the spread now)
- 9 new tokens × 1 single-line provenance comment each (inline trailing — no extra lines)
- Spread line in each of light/dark blocks (+2 lines)

## Gate Results (Pre- and Post-Commit)

### Pre-commit gates (run on staged edit BEFORE `git commit`)

| # | Gate | Expected | Observed | Status |
|---|------|----------|----------|--------|
| (2) | `grep -c MODE_INDEPENDENT_PALETTE` | ≥3 | **4** (block-comment header + const decl + 2 spreads) | PASS |
| (2) | `grep -cE '\.\.\.MODE_INDEPENDENT_PALETTE'` | ==2 | **2** (light spread + dark spread) | PASS |
| (3) | 27 D-08 value-presence greps (11 dark + 11 light + 5 mode-independent) | each ≥1 | all 27 present | PASS |
| (4) | Mode-independent identifiers (`accent`, `accentSoft`, `accentLine`, `landlordGreen`, `destructiveRed`) declared exactly ONCE in source | ==1 each | **1, 1, 1, 1, 1** | PASS |
| (5) | 26 mode-specific keys each declared ≥2 times (light + dark) | ≥2 each | all 26 = 2 | PASS |
| (6) | 15 orphan keys preserved in both modes | ≥2 each | all 15 = 2 | PASS |
| (7) | `export type ThemeColors = typeof colors.light;` line unchanged | grep matches | matches | PASS |
| (8) | KBD-02 grep gate `keyboardVerticalOffset` count in `src/` | ==0 | **0** | PASS |
| (9) | i18n parity (`scripts/check-i18n-parity.sh`) | exit 0 | exit 0 (en.ts ↔ ru.ts key-sets identical) | PASS |
| (10) | tsc baseline `npx tsc --noEmit \| grep -c "error TS"` | ≤17 (TSC_BASELINE pinned per STATE.md Quick Tasks 260530-sud) | **17** (no new errors, no regressions) | PASS |

### Post-commit gate (run AFTER `git commit`)

| # | Gate | Expected | Observed | Status |
|---|------|----------|----------|--------|
| (1) | `git diff --name-only HEAD~1 HEAD -- src/ \| wc -l` | ==1 | **1** | PASS |
| (1) | `git diff --name-only HEAD~1 HEAD -- src/ \| head -1` | `src/theme/colors.ts` | `src/theme/colors.ts` | PASS |
| — | Post-commit deletion check (`git diff --diff-filter=D --name-only HEAD~1 HEAD`) | empty | empty | PASS |

### Atomic Commit

- **SHA (short):** `fb4b3eb`
- **SHA (full):** `fb4b3eb1f94947cf53828fe7eaa929d4cdbc71a9`
- **Message:** `feat(12-01): MoveIn handoff palette + MODE_INDEPENDENT_PALETTE (PAL-01, PAL-02)`
- **Diff scope (`git diff --name-only HEAD~1 HEAD -- src/`):**
  ```
  src/theme/colors.ts
  ```

### TSC Baseline Numbers

- **`TSC_BASELINE` literal used (per plan `<verify><automated>` step 10):** `17`
- **`POST` count (post-edit, pre-commit measurement):** `17`
- **Verdict:** `POST (17) ≤ BASELINE (17)` — no regression. Baseline files (ChatScreen / DeleteListingModal / TourSelectionScreen / ThemeContext / StepperInput.test) untouched by this plan; their error counts inherit through unchanged.

## ThemeContext.tsx Confirmation

`src/theme/ThemeContext.tsx` was **NOT edited** (per D-07).

- `git diff HEAD~1 HEAD -- src/theme/ThemeContext.tsx` returned **0 lines** of output.
- `export type ThemeColors = typeof colors.light` flows the 9 new keys through to all 75 `useTheme()` consumers automatically — additive-safe.

## Provenance Comments on the 9 New Keys (Verbatim — Useful Grep Anchors for Phase 14+)

These are the single-line trailing comments planted on each new key. Phase 14+ executors can `grep "<consumer-attribution>"` to locate the token's intended consumer surface.

1. `bgDim` — `// MoveIn handoff 2026-05-31 — used by Phase 14 Cascading Reveal panel backdrop / Phase 15 ACCOUNT section card dimming`
2. `surface2` — `// MoveIn handoff 2026-05-31 — used by Phase 14 Guided Steps bottom-sheet wizard nested surface`
3. `surface3` — `// MoveIn handoff 2026-05-31 — used by Phase 14 Guided Steps Type-cards selected state`
4. `hair2` — `// MoveIn handoff 2026-05-31 — used by Phase 14+ strong-weight hairline / Phase 16 ADMIN TOOLS section divider`
5. `iconChipFg` — `// MoveIn handoff 2026-05-31 — used by Phase 16 38px icon chip foreground (grouped-row anatomy)`
6. `accentSoft` — `// MoveIn handoff 2026-05-31 — used by Phase 14+ accent fill background (e.g. Show N homes button hover)`
7. `accentLine` — `// MoveIn handoff 2026-05-31 — used by Phase 14+ accent border / underline (e.g. Cascading Reveal Category tab strip)`
8. `landlordGreen` — `// MoveIn handoff 2026-05-31 — used by Phase 16 'You're a Landlord' green-tinted banner background`
9. `destructiveRed` — `// MoveIn handoff 2026-05-31 — used by Phase 15 DANGER ZONE Delete-account row tint / Phase 16 Log out outlined pill stroke`

Plus the `accent` key (now declared once inside `MODE_INDEPENDENT_PALETTE`) carries a transition-note comment explaining that it replaces the prior light/dark split (`#FF385C` light → `#FF5C7C` dark → now `#ff5a6f` mode-independent).

The `MODE_INDEPENDENT_PALETTE` const itself carries a 5-line block comment header explaining the D-04 falsifiability rationale: extracting the 5 mode-independent values to a const + spreading makes mode-independence FALSIFIABLE at the source level because breaking the invariant requires deleting the spread itself — visible in any code review diff.

## Deviations from Plan

**None.** Plan 12-01 executed exactly as written. No deviation rules (1–4) triggered.

- No auto-fixed bugs (Rule 1)
- No missing critical functionality added (Rule 2)
- No blocking issues encountered (Rule 3)
- No architectural decisions required (Rule 4)

The 27 token-value asserts, structural spread counts, single-declaration of mode-independent identifiers, parity keyset coverage, orphan-key preservation, KBD-02 invariant, i18n parity, and tsc baseline gate all passed on the first attempt.

## Self-Check

**1. Files claimed to be modified — exist?**

```
[ -f src/theme/colors.ts ] → FOUND
[ ! -f src/theme/colors.ts ] (deletion check) → not deleted
```

**2. Commits claimed — exist in `git log`?**

```
git log --oneline -1 → fb4b3eb feat(12-01): MoveIn handoff palette + MODE_INDEPENDENT_PALETTE (PAL-01, PAL-02)
```

**3. Diff scope claim verified:**

```
git diff --name-only HEAD~1 HEAD -- src/ → src/theme/colors.ts
git diff --name-only HEAD~1 HEAD -- src/ | wc -l → 1
```

**4. ThemeContext.tsx untouched:**

```
git diff HEAD~1 HEAD -- src/theme/ThemeContext.tsx | wc -l → 0
```

## Self-Check: PASSED

All claims in this SUMMARY verified against the working tree and git history.

## Forward Signal to Plan 12-02

- **Tokens are SHIPPED.** All 31 keys × 2 modes live on `worktree-agent-a10c2dd39f545ea4d` at commit `fb4b3eb`; ready for the orchestrator merge-back into `main`.
- **Plan 12-02 (visual-regression sweep) can begin** as soon as 12-01 lands on main: walk the 15-screen risk-target list × iPhone 15 Pro Max + Moto G XT2513V × EN/RU × light/dark and capture the mass-disposition matrix in `12-VERIFICATION.md` per PATTERNS.md D-05/M3 Plan 05-05 precedent.
- **No consumer code wires up `surface2` / `surface3` / `iconChipFg` yet.** Phase 14 (Cascading Reveal / Guided Steps) is the first consumer. If the 12-02 sweep flags a screen as "looking flat without `surface2` layering" — that's expected and NOT a FAIL per PATTERNS.md anti-pattern #9.
- **Atomic-commit discipline is intact.** Phase 12 has shipped exactly 1 source-file edit. No scope creep.

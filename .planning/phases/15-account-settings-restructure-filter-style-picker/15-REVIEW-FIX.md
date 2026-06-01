---
phase: 15-account-settings-restructure-filter-style-picker
fixed_at: 2026-05-31T00:00:00Z
review_path: .planning/phases/15-account-settings-restructure-filter-style-picker/15-REVIEW.md
iteration: 1
findings_in_scope: 2
fixed: 2
skipped: 0
status: all_fixed
---

# Phase 15: Code Review Fix Report

**Fixed at:** 2026-05-31
**Source review:** `.planning/phases/15-account-settings-restructure-filter-style-picker/15-REVIEW.md`
**Iteration:** 1

**Summary:**
- Findings in scope: 2 (warnings; critical = 0)
- Fixed: 2
- Skipped: 0 (in scope)
- Out of scope: 4 info findings (IN-01 through IN-04) — not addressed because `fix_scope = critical_warning` (no `--all` flag)

**Invariant checks after fixes:**
- KBD-02 (`keyboardVerticalOffset` count in `src/`): **0** (unchanged)
- EN+RU i18n parity: no locale changes made
- `App.tsx` (D-24): not modified
- `react-navigation` migration: not introduced

## Fixed Issues

### WR-01: DANGER ZONE icon chip uses hardcoded `rgba(255,77,77,0.13)` — token migration incomplete

**Files modified:** `src/theme/colors.ts`, `src/screens/AccountSettingsScreen.tsx`
**Commit:** `ea588b9`
**Applied fix:**

1. Added a new `destructiveSoft` token to both light + dark blocks of `src/theme/colors.ts`, mirroring the existing `accent` → `accentSoft` pair:
   - Light: `rgba(255,77,77,0.10)` — slightly softened opacity so the red chip doesn't overwhelm the white surface.
   - Dark: `rgba(255,77,77,0.13)` — matches the original literal to preserve contrast against the dark surface.
2. Replaced the inline literal at `AccountSettingsScreen.tsx:381` with `{ backgroundColor: colors.destructiveSoft }`.
3. Added inline documentation comments on the token in both blocks explaining the asymmetric values and citing review WR-01.

### WR-02: Language-track shadow + checkmark use hardcoded `#000` / `rgba(255,255,255,0.95)`

**Files modified:** `src/screens/AccountSettingsScreen.tsx`
**Commit:** `86e073b`
**Applied fix:**

Per fix decision in agent prompt, only the checkmark literal (part b) was migrated; the `shadowColor: '#000'` on line 263 (part a) was left as-is because the review itself flagged it as defensible (theme-neutral dark shadows are the standard pattern).

For the checkmark:

1. Removed `color: 'rgba(255,255,255,0.95)'` from the `styles.languageCheck` StyleSheet entry.
2. Added an inline `{ color: colors.onAccent }` style at both consumption sites (lines 315 for EN, 337 for RU), composing it with the existing `styles.languageCheck` via array syntax — same pattern Phase 15 already uses for the language-label color elsewhere in the file.
3. Added a comment in the StyleSheet entry explaining the relocation and citing the token's semantic rationale: the check overlays the `colors.accent` pill, so `colors.onAccent` is the semantically-correct token (matches the precedent at lines 307, 329 for the language label color).

The `colors.onAccent` token already existed in both light and dark blocks of `src/theme/colors.ts` (value `#FFFFFF` in both modes), so no token addition was needed — no substitution against the original review guidance.

## Skipped Issues

None in scope.

### Out-of-scope info findings (deferred — no `--all` flag)

The following 4 findings were filtered out by `fix_scope = critical_warning`. They are recorded here for traceability:

- **IN-01** (`src/components/FilterStyleRow.tsx:163`) — unnecessary `async/await` wrapper around `setFilterStyle`. Skipped: out_of_scope.
- **IN-02** (`src/screens/AccountSettingsScreen.tsx:99-101`) — `useEffect` exhaustive-deps lint warning on `loadProfile()` mount effect. Skipped: out_of_scope. Note: this is also a pre-existing pattern, not a Phase 15 regression.
- **IN-03** (`src/screens/AccountSettingsScreen.tsx:192, 302, 324`) — unicode glyph (`'←'`) + flag emojis as non-themable text. Skipped: out_of_scope.
- **IN-04** (`src/components/FilterStyleRow.tsx:101-146` + `src/context/FilterStyleContext.tsx:25-31`) — unreachable-state forward-fit risk if AsyncStorage ever contains `'master'`/`'sentence'`. Skipped: out_of_scope. The review itself classifies this as "Phase B forward-fit" defensive coding.

## Verification Notes

**Per-fix verification (3-tier):**

- **Tier 1 (re-read)**: PASS for both fixes. Modified sections of `colors.ts` and `AccountSettingsScreen.tsx` confirmed to contain the intended changes with surrounding code intact.
- **Tier 2 (TypeScript check)**: PASS for both fixes. Ran `tsc --noEmit` against the worktree `tsconfig.json` after each fix; no errors reported in either `src/theme/colors.ts` or `src/screens/AccountSettingsScreen.tsx`.
- **Tier 3 (fallback)**: Not needed — Tier 2 succeeded.

**Test impact:**

The existing tests under `src/components/__tests__/FilterStyleRow.test.tsx` and `src/components/__tests__/SectionLabel.test.tsx` were NOT executed inside the worktree (no `node_modules` in the worktree; jest is not available). However, neither of those test files exercises `AccountSettingsScreen.tsx` or `src/theme/colors.ts`, and the two fixes:

- Only added a new exported property (`destructiveSoft`) to `colors.light` / `colors.dark` — additive, type-compatible.
- Only changed inline style composition in `AccountSettingsScreen.tsx` — does not affect the public API of `SectionLabel` or `FilterStyleRow`.

So the existing test surface is not exposed to these changes. Full test-suite verification is deferred to the verifier phase (as per the agent's per-fix verification scope).

**Logic-bug carve-out (not applicable):**

Neither WR-01 nor WR-02 is classified as a logic-error finding — both are visual / token-migration findings. The 3-tier verification fully covers them, so neither is marked `requires human verification`.

**Isolation / cleanup:**

This run executed inside a dedicated git worktree at `/tmp/sv-15-reviewfix-wehLz3` on temp branch `gsd-reviewfix/15-26016`. The cleanup tail completed transactionally:
1. `git merge --ff-only` fast-forwarded `main` from `5304df8` → `86e073b` (2 commits captured).
2. Worktree removed via `git worktree remove --force`.
3. Temp branch `gsd-reviewfix/15-26016` deleted.
4. Recovery sentinel `.review-fix-recovery-pending.json` deleted last.

No orphan worktree, no orphan branch, no stale sentinel.

---

_Fixed: 2026-05-31_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_

# Phase 12: Whole-App Palette Migration — Pattern Map

**Mapped:** 2026-05-31
**Files analyzed:** 2 (1 modified, 1 created)
**Analogs found:** 2 / 2 (both exact-precedent matches)

---

## Phase 12 Scope Note

This phase is unusual for a pattern-mapping pass: there is **no new src/ file to find analogs for**. The only source file edited is `src/theme/colors.ts` itself, and the only other file produced is `12-VERIFICATION.md` (a planning artifact, not application code). The mapping job is therefore:

1. **`src/theme/colors.ts`** — closest analog is **the file's own HEAD state**. Extract its existing shape so Plan 12-01 preserves it.
2. **`12-VERIFICATION.md`** — closest analog is **M3 Plan 05-05's `05-QA-MATRIX.md` + `05-VERIFICATION.md`** (the explicit precedent named in CONTEXT D-05).

No `useTheme()` consumer files are in scope. Per CONTEXT integration point: _"If any other file shows up in the [Plan 12-01] diff, it's a scope-creep flag — block the commit."_

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/theme/colors.ts` | theme-tokens / config | static-export (read-only consumed via React Context) | `src/theme/colors.ts` HEAD (self) | exact (self-precedent) |
| `12-VERIFICATION.md` | planning-artifact / QA-matrix | mass-disposition record | `.planning/milestones/v3.0-phases/05-hardening-manual-qa-release-v3/05-QA-MATRIX.md` + `05-VERIFICATION.md` | exact-precedent (named in CONTEXT D-05) |

---

## Files in Plan 12-01 Diff

### `src/theme/colors.ts` (theme-tokens, static-export)

**Analog:** `src/theme/colors.ts` HEAD — `/Users/beckmaldinVL/development/mobileApps/JayTap/src/theme/colors.ts`

The file's own HEAD state is the structural template. Plan 12-01 preserves the shape and adds to it.

#### Existing shape (HEAD — lines 1–66)

```typescript
export const colors = {
  light: { /* 22 flat key-value pairs */ },
  dark:  { /* 22 flat key-value pairs */ },
};

export type ThemeColors = typeof colors.light;
```

Two flat objects keyed `light` and `dark`. Each has the same 22 keys. Type export uses `typeof colors.light` — additive-safe by construction. **No nested groups. No helper functions. No imports.**

#### Comment-style precedent to follow (HEAD lines 19, 21–24, 28–30, 52, 54–56, 58–59)

```typescript
warning: '#F59E0B', // amber-500 — banner background (Phase 1 ROLE-10 / D-13)

// Phase 3 Plan 03-05 (revision 2 W6) — semantic tokens for media-curation surface.
// onAccent: text/icon foreground on accent CTA backgrounds (e.g. Approve & publish
// button label, NeedsMediaBanner CTA). White reads correctly on success / accent
// hues in light mode.
onAccent: '#FFFFFF',
```

**Inline trailing comment** for short one-liners (`// amber-500 — banner background (Phase 1 ROLE-10 / D-13)`). **Block comment above the key** for tokens that need provenance + rationale (3–4 lines wrapped). Per CONTEXT §Specifics: each new key should carry an inline `// MoveIn handoff 2026-05-31 — used by Phase 14+ <component>` comment.

#### The 22 existing keys (preserved in both modes — keyset-frozen contract)

`background`, `surface`, `text`, `textSecondary`, `textTertiary`, `primary`, `primaryLight`, `accent`, `border`, `inputBackground`, `chipBackground`, `chipBorder`, `activeChipBackground`, `activeChipText`, `success`, `error`, `warning`, `onWarning`, `onAccent`, `scrim`, `cardShadow`, `buttonText`.

#### The 7 rewritten keys (value-only changes — see CONTEXT D-08 for exact target values)

| Key | Light: old → new | Dark: old → new |
|-----|------------------|-----------------|
| `background` | `#F0F2F5` → `#f3f3f6` | `#191A1D` → `#121214` |
| `surface` | `#FFFFFF` → `#ffffff` (normalize case) | `#25282F` → `#1c1c20` |
| `text` | `#2D2D2D` → `#16161a` | `#F5F5F5` → `#f4f4f6` |
| `textSecondary` | `#666666` → `rgba(22,22,28,0.62)` | `#A0A3A8` → `rgba(244,244,246,0.60)` |
| `textTertiary` | `#999999` → `rgba(22,22,28,0.42)` | `#6B6F76` → `rgba(244,244,246,0.40)` |
| `border` | `#E0E0E0` → `rgba(0,0,0,0.08)` | `#2E3238` → `rgba(255,255,255,0.08)` |
| `accent` | `#FF385C` → `#ff5a6f` (from `MODE_INDEPENDENT_PALETTE`) | `#FF5C7C` → `#ff5a6f` (from `MODE_INDEPENDENT_PALETTE`) |

#### The 15 verbatim-retained orphan keys (CONTEXT D-01)

No value change. Lifted as-is from `src/theme/colors.ts` HEAD lines 8–9, 12–20, 25, 31–33 (light) and 41–42, 45–53, 57, 60–62 (dark). See CONTEXT lines 144–145 for the exact verbatim list.

#### The 9 NEW keys to add (CONTEXT D-08)

| Key | Light value | Dark value | Mode-independent? |
|-----|-------------|-----------|-------------------|
| `bgDim` | `#e7e7ec` | `#0c0c0e` | No (mode-specific) |
| `surface2` | `#f0f0f4` | `#26262c` | No |
| `surface3` | `#e4e4ea` | `#303038` | No |
| `hair2` | `rgba(0,0,0,0.13)` | `rgba(255,255,255,0.14)` | No |
| `iconChipFg` | `rgba(22,22,28,0.80)` | `rgba(244,244,246,0.85)` | No |
| `accentSoft` | `rgba(255,90,111,0.16)` | `rgba(255,90,111,0.16)` | **Yes — `MODE_INDEPENDENT_PALETTE`** |
| `accentLine` | `rgba(255,90,111,0.45)` | `rgba(255,90,111,0.45)` | **Yes — `MODE_INDEPENDENT_PALETTE`** |
| `landlordGreen` | `#35c98f` | `#35c98f` | **Yes — `MODE_INDEPENDENT_PALETTE`** |
| `destructiveRed` | `#ff4d4d` | `#ff4d4d` | **Yes — `MODE_INDEPENDENT_PALETTE`** |

#### `MODE_INDEPENDENT_PALETTE` const extraction (CONTEXT D-04)

Add at module top, BEFORE `export const colors`:

```typescript
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

The structural extraction (vs inline duplication of `accent: '#ff5a6f'` in both blocks) is **load-bearing** for the SPEC §Constraints "mode-independence must be falsifiable" requirement. `colors.light.accent === colors.dark.accent` passes by construction.

#### Type export — DO NOT change (CONTEXT D-07)

```typescript
export type ThemeColors = typeof colors.light;
```

Auto-discovery picks up the additive 9 keys without manual sync. ThemeContext.tsx imports this type unchanged.

#### Final post-write keyset = 22 existing + 9 new = **31 keys per mode** (parity required).

---

## Files in Plan 12-02 Output

### `12-VERIFICATION.md` (planning-artifact, mass-disposition record)

**Analog 1 (matrix template):** `.planning/milestones/v3.0-phases/05-hardening-manual-qa-release-v3/05-QA-MATRIX.md` (363 lines — the canonical sweep matrix)

**Analog 2 (closure write-up):** `.planning/milestones/v3.0-phases/05-hardening-manual-qa-release-v3/05-VERIFICATION.md` (the paired-gate verifier report that summarizes 05-QA-MATRIX)

**Why both:** CONTEXT D-05 names "M3 Plan 05-05 precedent" as the mass-disposition pattern source. Plan 05-05 is the source of `05-QA-MATRIX.md`. Plan 05-06 then wrote `05-VERIFICATION.md` summarizing it. Phase 12 collapses these two artifacts into one file (`12-VERIFICATION.md`) because the sweep is smaller (30 max rows vs M3's 73 cells) and the operator is the same person writing the closure.

#### Frontmatter pattern (copy verbatim from `05-QA-MATRIX.md` lines 1–60)

```yaml
---
phase: 12-whole-app-palette-migration-dark-light-visual-regression-swe
plan: 02
type: verification-matrix
status: closed-mass-disposition   # or closed-row-by-row if no inheritance shortcuts
walked: <ISO timestamp>
walked_against_sha: <RN HEAD at walk close>
walk_disposition: APPROVED   # or APPROVED-WITH-MASS-DISPOSITION
coverage_mode: <empirical-sampling-mass-disposition OR row-by-row>
walker: beckprograms@gmail.com
devices:
  ios:
    model: iPhone 15 Pro Max
    os: iOS 26.x
    build: Fabric / Release
  android:
    model: Moto G XT2513V
    os: Android 16
    build: Fabric / Release
requirements_addressed: [PAL-03]
testing_bar: M6 manual physical-device QA per CLAUDE.md
walk_scope: 15-screen risk-target × 2 devices × 2 locales × 2 modes
matrix_count: 1   # single mass-disposition table, not 7 sub-matrices
verdict_taxonomy:
  - PASS
  - FAIL
  - INHERITS-FROM-<row>   # M3 Plan 05-05 logical-equivalence shortcut
totals:
  total_cells: 60   # 15 screens × 2 devices × 2 locales × 2 modes — but matrix collapses (locale × mode) per row, so ~30 rows
  pass: <fill at close>
  fail: <fill at close>   # MUST = 0 per SPEC acceptance
mass_disposition:
  approved_by: beckprograms@gmail.com
  approved_at: <ISO>
  rationale_section: "## Mass-disposition rationale"
---
```

#### Column shape (copy verbatim from CONTEXT D-05)

```
| Screen | Device | EN-light | EN-dark | RU-light | RU-dark | Notes |
```

#### Per-cell vocabulary (copy verbatim from CONTEXT D-05 + 05-QA-MATRIX.md line 77–84)

| Cell value | Meaning |
|-----------|---------|
| `PASS` | observed expected behavior on the listed (device × locale × mode) |
| `FAIL` | contrast / legibility / theme-drift finding; bug-fix loop opens — MUST = 0 at close per PAL-03 acceptance |
| `INHERITS-FROM-<row>` | logical-equivalence shortcut (e.g. `RU-dark` cell = `INHERITS-FROM-EN-dark` if only locale strings change with no token drift) |

#### FAIL-evidence capture format (from 05-QA-MATRIX.md "Evidence" column pattern + CONTEXT D-05)

- On FAIL: one-sentence description in the cell, plus an optional screenshot path appended to the row's `Notes` column.
- On PASS: cell is just `PASS` — no evidence needed (the matrix existing IS the evidence the sweep was performed).
- On INHERITS-FROM-X: cell value is `INHERITS-FROM-EN-dark` (or whichever source row); no further evidence.

#### "Mass-disposition rationale" section (copy structure from 05-QA-MATRIX.md lines 111–157)

After the table, write a section explaining which inheritance edges were claimed and why:

```markdown
## Mass-disposition rationale

### What WAS walked-and-confirmed this session

| Screen | Device | Locale × Mode walked | Notes |
|--------|--------|----------------------|-------|
| HomeScreen | iOS | EN-dark | <evidence sentence> |
| ... |

### What was NOT walked (inheritance shortcuts claimed)

| Inheriting row | Inherits from | Logical-equivalence argument |
|----------------|---------------|------------------------------|
| HomeScreen RU-dark | HomeScreen EN-dark | RU locale changes text strings only; no token consumption differs |
| ... |

### Why this is defensible (and where it isn't)

**Defensible:** <reasons — e.g. RU is a string-translation layer only, doesn't change any colors.X read>
**Where it isn't:** <any screen where RU may visually wrap differently and reflow the surface — list explicitly>
```

#### Sign-off block (copy from 05-QA-MATRIX.md lines 326–339)

```markdown
## Sign-off

| Field | Value |
|-------|-------|
| Walker | beckprograms@gmail.com |
| Walk start | <ISO> |
| Walk end | <ISO> |
| Total cells | <count> |
| PASS | <count> |
| INHERITS-FROM | <count> |
| FAIL | 0 |
| Disposition | APPROVED   <or>   APPROVED-WITH-MASS-DISPOSITION |
```

---

## Sanity Counts (baseline state captured 2026-05-31)

These four greps establish the Phase 12 baseline. Plan 12-01 acceptance includes re-running them (or a subset) post-merge to confirm no regression.

| Grep | Value | CONTEXT claim | Status |
|------|-------|---------------|--------|
| `grep -rn "useTheme()" src/ App.tsx \| wc -l` | **75** | "94 `useTheme()` call sites" | **MISMATCH** — actual is 75. Use 75 as the working baseline. The CONTEXT/SPEC claim of "94" appears to count files-that-import-useTheme or includes another denominator (e.g. unique components vs. unique invocations). The keyset-preservation contract is unaffected — any positive count > 0 enforces "do not rename existing keys". |
| `grep -rn "from '\(\.\./\)*theme/colors'" src/ App.tsx \| wc -l` | **0** | "direct colors.ts importers (bypassing useTheme — should be near zero)" | **PASS** — zero direct importers. All consumption flows through `useTheme()`. Confirms the keyset contract is enforced via the single `ThemeColors` type. |
| `grep -rn "keyboardVerticalOffset" src/ \| wc -l` | **0** | "MUST be 0 (3-milestone-held invariant)" | **PASS** — KBD-02 gate clean. Phase 12 must not regress this. |
| `grep -rE "#[0-9a-fA-F]{6}\b\|#[0-9a-fA-F]{3}\b" src/ --include='*.ts' --include='*.tsx' \| grep -v 'theme/colors.ts' \| wc -l` | **518** | "sanity check on the 'no hardcoded colors' convention" | **INFORMATIONAL** — 518 hex literals in `src/` outside `colors.ts`. This is higher than the convention claims; expected sources include status-bar SVG strokes, shadow colors on iOS-specific paths, gradient stop literals, and StyleSheet `'transparent'`-like sentinels. Not a Phase 12 fix target — call out as M6+ technical-debt observation if it surfaces during the 15-screen sweep. |

### Numerical-mismatch note (75 vs 94)

The CONTEXT.md (lines 9, 13, 38, 199) and SPEC.md (line 9, 12, 13) both state "94 `useTheme()` call sites". The actual `grep` returns 75. Possible explanations:
- 94 may be a file-count of imports (`grep -l`), not invocation-count (`grep -n`).
- 94 may include backend or test files outside the `src/ App.tsx` scope grepped here.
- 94 may be a stale figure from an earlier milestone.

**Operational impact: none.** The Phase 12 contract is "no call-site is edited", which holds for any positive count. Plan 12-01 acceptance does not depend on the absolute number being 94 vs 75.

---

## 15-Screen Risk-Target List (extracted from SPEC §Boundaries lines 64–80)

All 15 screen file paths confirmed on disk. Note that `ContextualListingFlow` is a **directory** with an `index.tsx` entry — the SPEC describes it as "the orchestrator component file"; the right anchor for Plan 12-02's sweep is the whole directory tree (especially `index.tsx` + the 6 `StepN*.tsx` step screens).

| # | Screen | File path | Confirmed on disk? |
|---|--------|-----------|--------------------|
| 1 | HomeScreen | `src/screens/HomeScreen.tsx` | YES |
| 2 | PropertyCard | `src/components/PropertyCard.tsx` | YES |
| 3 | PropertyDetailsScreen + `src/components/details/*` | `src/screens/PropertyDetailsScreen.tsx` + `src/components/details/{HeaderInfoCard,AttributeList,MapPreviewCard,KeyStatsCard}.tsx` | YES (screen + 4 details components) |
| 4 | HospitalityCard | `src/components/HospitalityCard.tsx` | YES |
| 5 | ChatScreen | `src/screens/ChatScreen.tsx` | YES |
| 6 | ChatThreadScreen | `src/screens/ChatThreadScreen.tsx` | YES |
| 7 | ChatComposeScreen | `src/screens/ChatComposeScreen.tsx` | YES |
| 8 | ContextualListingFlow (all 6 steps + orchestrator) | `src/components/ContextualListingFlow/index.tsx` + `Step1..Step6*.tsx` | YES (directory — see note above) |
| 9 | MediaCurationScreen | `src/screens/MediaCurationScreen.tsx` | YES |
| 10 | ProfileScreen | `src/screens/ProfileScreen.tsx` | YES |
| 11 | AccountSettingsScreen | `src/screens/AccountSettingsScreen.tsx` | YES |
| 12 | ModerationQueueScreen | `src/screens/ModerationQueueScreen.tsx` | YES |
| 13 | LandlordApplicationQueueScreen | `src/screens/LandlordApplicationQueueScreen.tsx` | YES |
| 14 | RoleManagementScreen | `src/screens/RoleManagementScreen.tsx` | YES |
| 15 | BottomNavigator | `src/components/BottomNavigator.tsx` | YES |

**All 15 confirmed. No file-discovery gap for Plan 12-02.**

---

## Shared Patterns

Phase 12 has only ONE source file in scope, so "shared patterns" across files don't apply the way they do for multi-file phases. The cross-cutting patterns to lift are between `src/theme/colors.ts` HEAD and Plan 12-01's rewrite:

### Theme-token comment-provenance pattern (from `colors.ts` HEAD)

**Source:** lines 19, 21–24, 28–30, 52, 54–56, 58–59 of current `colors.ts`.

**Apply to:** every NEW key added in Plan 12-01 (`bgDim`, `surface2`, `surface3`, `hair2`, `iconChipFg`, `accentSoft`, `accentLine`, `landlordGreen`, `destructiveRed`).

```typescript
// MoveIn handoff 2026-05-31 — used by Phase 14+ <consumer-component>
// <one-line rationale if non-obvious>
<keyName>: '<value>',
```

For `MODE_INDEPENDENT_PALETTE`, add a block comment explaining the falsifiability constraint (D-04 rationale) above the const.

### Mass-disposition matrix pattern (from M3 Plan 05-05)

**Source:** `.planning/milestones/v3.0-phases/05-hardening-manual-qa-release-v3/05-QA-MATRIX.md`.

**Apply to:** `12-VERIFICATION.md` in Plan 12-02.

- Frontmatter with `walk_disposition`, `coverage_mode`, `walker`, `devices`, `totals`, `mass_disposition` (block).
- Cell verdict legend before the matrix.
- `## Mass-disposition rationale` section after the matrix when inheritance shortcuts are claimed.
- Sign-off block at end.

### KBD-02 grep-gate invariant (from project memory + CLAUDE.md)

**Source:** memory `m1-keyboard-kbd-02-invariants.md`.

**Apply to:** Plan 12-01 acceptance script.

```bash
grep -rn "keyboardVerticalOffset" src/ | wc -l  # MUST == 0
```

Phase 12 doesn't touch keyboard code, so this is trivially satisfied — but the gate runs regardless per CONTEXT lines 178–180.

### i18n parity gate

**Source:** `scripts/check-i18n-parity.sh` (project root).

**Apply to:** Plan 12-01 acceptance.

```bash
scripts/check-i18n-parity.sh  # MUST exit 0
```

Phase 12 introduces no new strings — trivially satisfied.

### TypeScript clean-baseline gate

**Source:** standard `npx tsc --noEmit`.

**Apply to:** Plan 12-01 acceptance.

`ThemeColors = typeof colors.light` is additive-safe; the new 9 keys cause zero consumer-side type errors. Any new tsc error in this commit is a Phase 12 failure.

---

## No-Analog Cases

**None.** Both files have exact-precedent analogs:
- `src/theme/colors.ts` → self-precedent (the file's HEAD state).
- `12-VERIFICATION.md` → M3 Plan 05-05 precedent (`05-QA-MATRIX.md` + `05-VERIFICATION.md`), explicitly named in CONTEXT D-05.

No Phase 12 file requires falling back to RESEARCH.md patterns.

---

## Anti-Patterns (What NOT to Do)

These are scope guards. Any of them appearing in a Plan 12-01 or 12-02 diff is a block-the-commit signal.

1. **No per-call-site edit.** No file under `src/` (other than `src/theme/colors.ts`) appears in Plan 12-01's diff. Per CONTEXT integration point line 199: _"If any other file shows up in the diff, it's a scope-creep flag — block the commit."_ This includes "incidental cleanup" of a hardcoded hex literal spotted during the sweep — that's a separate M6 Phase 14+/15+/16+ ticket.

2. **No new file in `src/`.** Plan 12-01 modifies exactly one source file. Plan 12-02 creates zero source files (only `12-VERIFICATION.md` in `.planning/`).

3. **No change to `src/theme/ThemeContext.tsx`.** CONTEXT D-07 explicitly claims this is a no-op: `ThemeColors = typeof colors.light` propagates the new keys automatically. Touching `ThemeContext.tsx` is out of scope. (If a planner discovers `ThemeContext.tsx` somehow asserts against the old 22-key shape — verified above it does not — that's a SPEC clarification, not a license to edit beyond the assertion.)

4. **No orphan-key remap without explicit D-08 authorization caveat.** The 15 orphan keys (`primary`, `primaryLight`, `inputBackground`, `chipBackground`, `chipBorder`, `activeChipBackground`, `activeChipText`, `success`, `error`, `warning`, `onWarning`, `onAccent`, `scrim`, `cardShadow`, `buttonText`) stay verbatim in both modes. CONTEXT D-01 paragraph 4 grants conditional authorization to remap a specific orphan IF the planner finds a visible artifact during research — **only with explicit justification in `12-RESEARCH.md`**. The default IS verbatim. Do not preemptively flip any orphan to a handoff value "because it looks closer".

5. **No `keyboardVerticalOffset` introduction anywhere.** KBD-02 baseline is 0 (verified above). Trivially satisfied for a tokens-only commit but the gate runs regardless.

6. **No inline-duplicated mode-independent value.** If `accent: '#ff5a6f'` appears as a literal in BOTH the `light:` and `dark:` blocks (instead of spread from `MODE_INDEPENDENT_PALETTE`), the falsifiability constraint (SPEC §Constraints) is broken by construction. Use the const + spread pattern from CONTEXT D-04 verbatim.

7. **No `export type ThemeColors = ...` interface declaration.** CONTEXT D-07 rejects a hand-rolled `interface ThemeColors { ... }`. Keep `typeof colors.light` to preserve additive auto-discovery.

8. **No new dependency.** No font loading, no theming library, no color-conversion utility. SPEC §Constraints line 103 is explicit.

9. **No `surface2` / `surface3` consumption during Phase 12.** SPEC out-of-scope line 96 and deferred ideas line 222: Phase 12 only SHIPS the tokens. Phase 14 is the first consumer. Plan 12-02's sweep should NOT flag a screen as FAIL for "looking flat without `surface2` layering" — that's expected.

10. **No mixed-case hex in the new value set.** CONTEXT §code_context line 195: normalize everything to lowercase for consistency with the handoff source. The current `colors.ts` is mixed-case; the Phase 12 rewrite cleans this up for at least the 7 mappable keys + 9 new keys + 5 mode-independent values. (Orphan-key verbatim values stay as they are in HEAD — that's deliberate per D-01.)

11. **No screen walked outside the 15-screen risk-target list in Plan 12-02.** SPEC out-of-scope lines 86–87 enumerate ~10 lower-risk screens that are sampled but NOT walked as full cells. Adding rows for them to `12-VERIFICATION.md` is scope creep — they inherit from already-walked shared components.

12. **No verifier-only / reviewer-only single-axis closure.** Per memory `gsd-verifier-misses-regressions.md`, paired gates are the M2/M3 closure standard. Phase 12 is small enough that the operator + planner pair may decide a single-axis verifier close is sufficient — but if any FAIL surfaces, the paired-gate pattern kicks in.

---

## Metadata

**Analog search scope:** `src/theme/`, `.planning/phases/`, `.planning/milestones/v3.0-phases/05-hardening-manual-qa-release-v3/`
**Files scanned for sweep precedent:** 4 prior VERIFICATION.md (Phases 6/7/8/11) + 1 M3 QA-MATRIX (Plan 05-05) + 1 M3 VERIFICATION (Plan 05-06)
**Pattern extraction date:** 2026-05-31
**Working directory:** `/Users/beckmaldinVL/development/mobileApps/JayTap`

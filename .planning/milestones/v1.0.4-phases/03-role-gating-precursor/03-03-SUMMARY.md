---
phase: 03-role-gating-precursor
plan: 03
plan_id: 03-03
subsystem: i18n
tags:
  - i18n
  - locale-parity
  - d-18
  - translation-boundary
requirements:
  - GATE-01
  - GATE-03
requires: []
provides:
  - "i18n key `errors.permissionDenied` in both EN and RU locales"
  - "D-18 translation boundary for `E_PERMISSION_DENIED` service-layer errors"
affects:
  - src/locales/en.ts
  - src/locales/ru.ts
tech_stack:
  added: []
  patterns:
    - "TypeScript-enforced i18n key-set parity via `Record<TranslationKeys, string>`"
key_files:
  created: []
  modified:
    - src/locales/en.ts
    - src/locales/ru.ts
decisions:
  - "Reused existing `// Errors` namespace comment instead of adding a duplicate — preserves `grep -c '// Errors' == 1` acceptance criterion; plan action text assumed no such comment existed"
  - "Appended `errors.permissionDenied` to the end of the `error.*` block (last entry before the object-closer `} as const;` / `};` respectively) — matches plan 'immediately before closing `};`' intent"
metrics:
  completed_at: "2026-04-24T02:48:41Z"
  duration_seconds_approx: 297
  tasks_completed: 2
  tasks_total: 2
  commits:
    - 11fcfd6
    - 0abf938
  files_modified: 2
---

# Phase 3 Plan 03: i18n Key `errors.permissionDenied` Summary

**One-liner:** Adds the `errors.permissionDenied` i18n key to both `src/locales/en.ts` and `src/locales/ru.ts`, closing the UI translation half of the D-18 service-throws-code / UI-translates boundary before the Plan 04 service guard lands.

## What Shipped

Two locale files received one new key each. TypeScript's `Record<TranslationKeys, string>` typing in `ru.ts` enforces EN+RU parity at compile time — adding the key to `en.ts` alone produces a TS2741 missing-key error on `ru.ts` (which Task 2 immediately closes).

### Exact final values

`src/locales/en.ts` (appended inside the existing `// Errors` namespace, immediately before `} as const;`):

```typescript
  'errors.permissionDenied': "You don't have permission to perform this action.",
```

`src/locales/ru.ts` (appended inside the existing `// Errors` namespace, immediately before `};`):

```typescript
  'errors.permissionDenied': 'У вас нет прав для выполнения этого действия.',
```

The Russian value is 37 Cyrillic characters (verified via `python3 -c "sum(1 for c in line if 0x0400 <= ord(c) <= 0x04FF)"`).

## Tasks

| # | Name | Commit | Files |
|---|------|--------|-------|
| 1 | Add `errors.permissionDenied` to `src/locales/en.ts` | `11fcfd6` | `src/locales/en.ts` |
| 2 | Add `errors.permissionDenied` to `src/locales/ru.ts` (Cyrillic, parity) | `0abf938` | `src/locales/ru.ts` |

Between Task 1 and Task 2 commits, `tsc` emitted the expected `TS2741` error on `ru.ts` (missing key) — the plan-anticipated RED→GREEN intermediate state. Task 2 closed it.

## Verification

### TypeScript compile-clean status (authoritative parity check per D-18)

Command: `npx tsc --noEmit 2>&1 | grep -E "locales/(en|ru)\.ts.*error TS" | wc -l`

Result: `0`

Full `tsc` tail (locale files produce zero errors; remaining output is pre-existing, unrelated `src/theme/ThemeContext.tsx` issues that predate this plan):

```
  Property 'unspecified' does not exist on type '{ light: { background: string; surface: string; text: string; textSecondary: string; textTertiary: string; primary: string; primaryLight: string; accent: string; border: string; inputBackground: string; ... 7 more ...; buttonText: string; }; dark: { ...; }; }'.
src/theme/ThemeContext.tsx(36,33): error TS2322: Type '{ theme: ColorSchemeName; colors: any; toggleTheme: () => void; isDark: boolean; }' is not assignable to type 'ThemeContextType'.
  Types of property 'theme' are incompatible.
    Type 'ColorSchemeName' is not assignable to type '"light" | "dark"'.
      Type '"unspecified"' is not assignable to type '"light" | "dark"'.
```

### Locale key-set parity diff

Command:

```bash
diff <(grep -oE "'[a-zA-Z]+\.[a-zA-Z0-9]+':" src/locales/en.ts | sort) \
     <(grep -oE "'[a-zA-Z]+\.[a-zA-Z0-9]+':" src/locales/ru.ts | sort)
```

Output: (empty — key sets are identical)

### Per-task acceptance criteria

**Task 1 (en.ts):**

| Criterion | Expected | Actual |
|-----------|----------|--------|
| `grep -c "'errors.permissionDenied':" src/locales/en.ts` | 1 | 1 |
| `grep -c "// Errors" src/locales/en.ts` | 1 | 1 |
| `grep -Fc "You don't have permission to perform this action." src/locales/en.ts` | 1 | 1 |
| Last object line is the closer `} as const;` | yes | yes |
| `en.ts` specific TS errors | 0 | 0 |

**Task 2 (ru.ts):**

| Criterion | Expected | Actual |
|-----------|----------|--------|
| `grep -c "'errors.permissionDenied':" src/locales/ru.ts` | 1 | 1 |
| `grep -c "// Errors" src/locales/ru.ts` | 1 | 1 |
| Cyrillic characters on the value line (U+0400–U+04FF) | ≥1 | 37 |
| Value ends with period + quote + comma | yes | yes |
| `locales/(en|ru).ts` combined TS errors | 0 | 0 |

## Deviations from Plan

### [Rule 1 - Plan-text vs. acceptance-criteria conflict] Re-used the existing `// Errors` namespace comment instead of adding a duplicate

- **Found during:** Task 1 (re-surfaced identically in Task 2)
- **Issue:** Plan action text (Task 1, Line B) said `insert '  // Errors'` comment. However, both `en.ts` (line 386) and `ru.ts` (line 389) already contained a `// Errors` comment — it marks the existing `error.*` (singular namespace) block. Adding a second `// Errors` line would produce `grep -c "// Errors" == 2`, violating both tasks' explicit acceptance criterion that the count equal `1`.
- **Resolution:** Appended `'errors.permissionDenied'` as the last entry under the existing `// Errors` block (immediately before the object closer). This satisfies:
  - Plan's "immediately before closing `};`" action intent (the new key is the last property)
  - Acceptance criterion `grep -c "// Errors" == 1` (no duplicate comment)
  - `grep -c "'errors.permissionDenied':" == 1` (key present)
  - TypeScript parity (EN+RU both have the key)
- **Why Rule 1 applies:** The plan's action text was factually inconsistent with its own acceptance criteria because the plan author did not observe the pre-existing `// Errors` comment. Acceptance criteria are the binding contract — the action text was a recipe, not a truth claim. Pattern Map (03-PATTERNS.md §`src/locales/en.ts` + `ru.ts`) also called out the existing namespace-with-comment pattern, reinforcing that re-use was the intended disposition.
- **Files modified:** `src/locales/en.ts`, `src/locales/ru.ts`
- **Commits:** `11fcfd6`, `0abf938`

### Note on plural vs. singular `errors.*` / `error.*` namespace

The new key uses the PLURAL namespace `errors.permissionDenied` (verbatim per D-18 + acceptance criteria), while the pre-existing namespace in both locale files is SINGULAR (`error.propertyNotFound`, `error.failedToOpenLink`, etc.). Both coexist under the shared `// Errors` comment — the plural-namespace key sits alongside the singular-namespace keys without collision because TypeScript treats them as distinct string literal keys. This is intentional and matches D-18's literal spec; a future consolidation pass (out of this plan's scope) could harmonize the prefix.

## Auth Gates

None. No auth prompts, no CLI tools invoked beyond `git`, `npx tsc`, and `grep`.

## Known Stubs

None. This plan adds runtime translation strings — no stubs, no placeholders, no hardcoded empty values. The Russian text is the shipping final wording per D-18.

## Downstream Hooks

- **Plan 04 (service guard — `patchPlatformVerifications`)** can now safely throw `PermissionDeniedError` knowing the UI catch site has a valid i18n key to render via `t('errors.permissionDenied')`.
- **Any M1 UI catch site** for `E_PERMISSION_DENIED` can call `t('errors.permissionDenied')` in either EN or RU without a runtime lookup miss.
- **Plan 03-05 (CreateListingScreen `<Gated>` wrapping)** does not consume this key directly (gating uses hide-entirely per D-08, not error-display), but should be aware of the key if any catch-and-display UI ever surfaces near the submit payload.

## Self-Check: PASSED

- `src/locales/en.ts` modified and contains `'errors.permissionDenied':` (1 match)
- `src/locales/ru.ts` modified and contains `'errors.permissionDenied':` (1 match)
- Commit `11fcfd6` present in `git log`
- Commit `0abf938` present in `git log`
- `npx tsc --noEmit` produces zero locale-file errors
- EN+RU key-set diff is empty (full parity)
- SUMMARY.md path: `.planning/phases/03-role-gating-precursor/03-03-SUMMARY.md`

## Worktree-Mode Note

Per parallel-execution instructions:
- Used `git commit --no-verify` on both commits to avoid hook contention with the parallel Plan 03-02 agent
- Did NOT modify `STATE.md` or `ROADMAP.md` — orchestrator owns those writes after wave completion
- Pre-existing unstaged drift (`android/app/build.gradle` versionCode bump from the Phase-2 device walk; STATE.md notes it belongs to Phase 8) left untouched and NOT committed
- `.claude/` untracked directory left untouched

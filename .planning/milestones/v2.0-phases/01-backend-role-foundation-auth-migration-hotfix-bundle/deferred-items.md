# Phase 1 Deferred Items

Out-of-scope discoveries during plan execution. Tracked here per executor Rule 3 scope boundary.

## From Plan 10 (2026-04-29)

- **`src/theme/ThemeContext.tsx` lines 27 + 36** — pre-existing TS7053 + TS2322. `useColorScheme()` returns `ColorSchemeName` (which includes `'unspecified'` and `null`), but the lookup table + context value are typed as only `'light' | 'dark'`. Errors existed before Plan 10. Out of Plan 10 scope (file is under `src/theme/`, owned by Plan 12 / future theme work). Quick fix: narrow with `useColorScheme() ?? 'light'` and a fallback for `'unspecified'`. Recommended for a follow-up theme cleanup, not for Plan 10.

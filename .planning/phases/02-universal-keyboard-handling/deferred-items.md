# Phase 2 — Deferred Items

Out-of-scope discoveries surfaced during Phase 2 execution. Logged per the
executor's Scope Boundary rule — NOT fixed in Phase 2, NOT blocking Phase 2.

---

## From Plan 02-02 execution (2026-04-23)

### Pre-existing TypeScript errors in `src/context/AuthContext.tsx` and `src/theme/ThemeContext.tsx`

**Discovered:** Task 2 ran `npx tsc --noEmit` as its type-check gate after editing App.tsx.
10 errors were reported — ALL in files unrelated to App.tsx and unrelated to the
`KeyboardProvider` wiring.

**Why they are pre-existing:** None of the 10 errors reference `App.tsx`,
`KeyboardProvider`, or `react-native-keyboard-controller`. All errors are in
`src/context/AuthContext.tsx` (9 errors — implicit `any` on function params and a
missing property `backendProfile`) and `src/theme/ThemeContext.tsx` (1 error —
`ColorSchemeName` including `'unspecified'` which isn't in the theme map). The
codebase has historically shipped with these — they are not introduced by Plan 02-02.

**Scope disposition:** Out of scope for Plan 02-02 (`files_modified: [App.tsx]` only).
Per CLAUDE.md "Testing bar: manual physical-device QA for M1", type-checking is not
the M1 merge gate; boot smoke is. Plan 02-02's acceptance bar "no NEW errors vs
pre-task baseline" is met — zero new errors introduced by this plan.

**Recommendation:** Fix during Phase 3 (Role Gating Precursor) or Phase 5 (Listing
Form Validation), whichever first touches `AuthContext.tsx` / `ThemeContext.tsx`.
Not worth a standalone phase.

**Exact errors for future reference:**

```
src/context/AuthContext.tsx(7,11):   TS7006: Parameter 'email' implicitly has an 'any' type.
src/context/AuthContext.tsx(7,18):   TS7006: Parameter 'password' implicitly has an 'any' type.
src/context/AuthContext.tsx(8,12):   TS7006: Parameter 'email' implicitly has an 'any' type.
src/context/AuthContext.tsx(8,19):   TS7006: Parameter 'password' implicitly has an 'any' type.
src/context/AuthContext.tsx(46,24):  TS7006: Parameter 'email' implicitly has an 'any' type.
src/context/AuthContext.tsx(46,31):  TS7006: Parameter 'password' implicitly has an 'any' type.
src/context/AuthContext.tsx(59,14):  TS7053: "backendProfile" cannot index type '{ email: any; localId: any; }'.
src/context/AuthContext.tsx(76,25):  TS7006: Parameter 'email' implicitly has an 'any' type.
src/context/AuthContext.tsx(76,32):  TS7006: Parameter 'password' implicitly has an 'any' type.
src/theme/ThemeContext.tsx(27,23):   TS7053: ColorSchemeName 'unspecified' not a valid theme key.
src/theme/ThemeContext.tsx(36,33):   TS2322: theme ColorSchemeName not assignable to "light" | "dark".
```

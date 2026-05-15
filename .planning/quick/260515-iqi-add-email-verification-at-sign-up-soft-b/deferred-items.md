# Deferred Items — Quick Task 260515-iqi

Out-of-scope discoveries logged during execution. Not fixed (SCOPE BOUNDARY: only
auto-fix issues directly caused by this task's changes).

## Pre-existing tsc errors (21 total, present on the clean base commit 77e5542)

`npx tsc --noEmit` reports 21 errors on the untouched base — none introduced by this task.
Files affected: `App.tsx` (lines 642-643, `Property.tours`), `src/screens/ChatScreen.tsx`,
`src/screens/ScheduleViewingScreen.tsx`, `src/screens/TourSelectionScreen.tsx`,
`src/theme/ThemeContext.tsx`.

- Verified by `git stash` → `tsc` → count → `git stash pop`: 21 errors before changes, 21 after.
- The task's `<verify>` gate intent ("changes don't break the type-check") holds — zero NEW
  errors in `AuthService.ts`, `types/Auth.ts`, `AuthContext.tsx`, `EmailVerifyBanner.tsx`,
  `locales/en.ts`, `locales/ru.ts`.
- Not fixed: out of scope for this quick task. Candidate for a future cleanup pass.

## Pre-existing failing test suites (useRole + PropertyService)

`npx jest` shows 2 suites failing — `src/hooks/__tests__/useRole.test.ts` (3 failures
in the `canFromUser priority ladder` block) and `src/services/__tests__/PropertyService.test.ts`.

- Verified pre-existing: the main worktree at base commit `77e5542`, with zero of this
  task's changes, fails the SAME `useRole.test.ts` + `PropertyService.test.ts` suites.
- This task modified none of `useRole.ts`, `useRole.test.ts`, `PropertyService.ts`,
  `PropertyService.test.ts` — the failures are unrelated to email verification.
- All 14 tests this task added pass (AuthService 4, AuthContext 4, EmailVerifyBanner 6).
- Not fixed: out of scope for this quick task.


# Deferred Items — quick task 260515-djv

Out-of-scope discoveries surfaced during execution. NOT fixed by this task
(Scope Boundary: only auto-fix issues directly caused by this task's changes).

## Pre-existing `npx tsc --noEmit` errors

Confirmed present on the clean base commit `3762c8d` (verified via `git stash` +
`tsc` run) — NOT introduced by the zoom integration. These are `Property` type
drift and a `ThemeContext` `ColorSchemeName` indexing issue, unrelated to the
gesture-handler / image-zoom change:

- `App.tsx` — `Property.tours` does not exist (2 sites)
- `src/components/DeleteListingModal.tsx` — `Property.title`, `Property.address`
- `src/screens/ChatComposeScreen.tsx` — `Property.imageUrl`, `Property.images`, `Property.title`
- `src/screens/ChatScreen.tsx` — `Property.title` not in `Property`
- `src/screens/ScheduleViewingScreen.tsx` — `Property.title`
- `src/screens/TourSelectionScreen.tsx` — `Property` has no exported member `Tour`; `Property.tours`
- `src/theme/ThemeContext.tsx` — `ColorSchemeName` ('unspecified') cannot index theme colors map; theme assignment type mismatch

Disposition: out of scope for 260515-djv. Candidate for a future `Property`
type-realignment cleanup task.

## Pre-existing `npx jest` failures (3 tests, 2 suites)

Confirmed present on the fully-clean pre-Task-1 commit `3762c8d` (verified by
checking out base `jest.setup.js` + `App.tsx` + `package.json` and re-running
the two suites in isolation — identical result: 3 failed / 42 passed / 45 total).
NOT caused by the zoom integration; neither file imports App.tsx, gesture-handler,
or image-zoom:

- `src/hooks/__tests__/useRole.test.ts` — `canFromUser` priority ladder:
  "manageListings (post-cutover): any authenticated user with a backendProfile
  is permitted" (assertion at line 106)
- `src/services/__tests__/PropertyService.test.ts` —
  `patchPlatformVerifications` guard (D-17): "does NOT throw for admin user"
  and "does NOT throw for allowlisted-email user (M1 branch)"

Disposition: out of scope for 260515-djv. Pre-existing test debt — candidate
for a separate fix task.

NOTE: Task 2 *reduced* the failing-suite count. Before the jest.setup.js fix,
adding `import 'react-native-gesture-handler'` to App.tsx broke 3 *additional*
suites (App.test.tsx + these 2) on a missing native-module mock. The Task 2
jest.setup.js change (gesture-handler official jestSetup + an ImageZoom
passthrough stub) resolved all 3 of those; only the 3 pre-existing failures
above remain. Net jest regression from this task: zero.

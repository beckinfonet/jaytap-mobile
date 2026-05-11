# Phase 02 Deferred Items

## Plan 02-01 — backend test suite intermittent flake (2026-05-06)

**Symptom:** 1 of 219 backend tests fails on the first `npm test` run with
`expected 400, received 404` on `Phase 4 — Archive Lifecycle: mod-archive
invalid reasonCode → 400`. Re-running the same suite (no code changes) passes
all 219 tests deterministically. Runs 2 + 3 of `npm test` post-run-1 both
returned 219/219.

**Scope:** Pre-existing test in M2/Phase 4 block (`mod-archive invalid
reasonCode`); NOT a Plan 02-01 test. Plan 02-01 only added new files
(locationRoutes.test.js + 7 cases appended to moderationRoutes.test.js).

**Suspect:** Jest parallel-workers cross-file contamination — two test files
share the same global MongoMemoryServer setup (src/__tests__/setup.js
beforeAll) and afterEach `deleteMany({})` cycle. When suite count grew from
~155 to 219, the cross-suite race became more likely.

**Decision:** Out of Plan 02-01 scope (Rule 4: SCOPE BOUNDARY). Documented
here for M3 carry-forward. Re-open if it becomes deterministic.

## Plan 02-02 — pre-existing RN client jest baseline failures (2026-05-06)

**Symptoms:**
1. `src/services/__tests__/PropertyService.test.ts` — entire suite fails to
   load with `TypeError: Cannot read properties of undefined (reading
   'interceptors')` at `apiClient.ts:31` (axios mock missing).
2. `src/hooks/__tests__/useRole.test.ts` — 1 of N tests fails: `manageListings:
   plainUser without landlord status is permitted` expects `true`, gets the
   wrong boolean (likely a behavior drift from Phase 5 admin role mgmt).

**Scope:** Plan 02-02 only added files under
`src/components/ContextualListingFlow/` and ~24 new keys in
`src/locales/{en,ru}.ts`. Neither failing test touches any file or import
path that Plan 02-02 modifies. Confirmed pre-existing on baseline
`8040933` via `git diff 8040933 HEAD --name-only` (no overlap with the
failing test paths).

**Decision:** Out of Plan 02-02 scope (Rule 4: SCOPE BOUNDARY). Carry into
M3 jest-stack hardening or re-open at the next paired-gate verifier+code-review
sweep. The 21 new ContextualListingFlow tests (validators 7, adapters 7,
Step1 7) all pass green.

## Plan 02-05 — same pre-existing RN client jest baseline failures (2026-05-06)

**Symptoms (verified pre-existing by stash-and-test):** 8 test suites fail with
4 failing tests on the npm test run. Failures span:

1. `src/services/__tests__/PropertyService.test.ts` (axios interceptor
   undefined — same as Plan 02-02 entry above).
2. `src/hooks/__tests__/useRole.test.ts` `manageListings: plainUser …` (same
   as Plan 02-02 entry above).
3. Jest haste-map collision: stale parallel-execution worktrees under
   `.claude/worktrees/agent-*` re-introduce duplicate module IDs. Symptoms:
   `agent-aa0b9593dd69e6ff0`, `agent-ac77564fe620be4f9`, `agent-a545d4d5d2a4ef41d`
   directories surface in test paths. Cleanup or jest `modulePathIgnorePatterns`
   addition would remove the noise.

**Scope:** Plan 02-05 only swaps read-path field reads in 9 surfaces
(PropertyCard / HospitalityCard / HospitalityCheck / HomeScreen / FavoritesScreen
/ RenterListingsScreen / OwnerListingsScreen / PropertyMap / ListingMetaTable +
formatPrice utility + i18n). None of the failing tests target any of these
files. Pre-existing baseline confirmed via `git stash; npm test` against HEAD
(returns identical 8-suite / 4-test failure profile).

**Decision:** Out of Plan 02-05 scope (Rule 4: SCOPE BOUNDARY). Same M3
jest-stack hardening backlog item. i18n parity gate green
(`scripts/check-i18n-parity.sh`) and `npx tsc --noEmit` clean against the 9
plan files.

## Plan 02-04a — pre-existing TS errors in CreateListingScreen / Property type (2026-05-06)

**Symptoms:** `npx tsc --noEmit` reports ~20 errors in
`src/screens/CreateListingScreen.tsx`, `src/screens/ScheduleViewingScreen.tsx`,
`src/screens/TourSelectionScreen.tsx`, and `src/theme/ThemeContext.tsx`. All
are `Property` field-access errors (`address`, `city`, `price`, `images`,
`tours`, `title`, etc.) — fallout from M2's `Property` type rename and from
the `ColorSchemeName` issue in `ThemeContext.tsx`.

**Scope:** Plan 02-04a only adds `Step4ConditionAmenities.tsx`,
`Step5TitleDescription.tsx`, two test files, ~18 i18n keys to
`src/locales/{en,ru}.ts`, and edits `src/components/ContextualListingFlow/index.tsx`
to wire steps. `npx tsc --noEmit` against ONLY the Plan 02-04a surface returns
zero errors (`grep -E 'ContextualListingFlow|locales/(en|ru)\.ts'` over the
tsc output is empty).

**Decision:** Out of Plan 02-04a scope (Rule 4: SCOPE BOUNDARY). Same M3
client type-hardening backlog as Plan 02-05's entry. The 7 affected
ContextualListingFlow test suites pass 74/74 and i18n parity gate exits 0.


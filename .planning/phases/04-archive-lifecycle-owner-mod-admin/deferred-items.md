# Phase 4 — Deferred Items (out-of-scope discoveries)

Items found during Phase 4 execution that are NOT caused by Phase 4 changes and
NOT in scope to fix here. Logged for visibility / future cleanup.

---

## 1. Pre-existing useRole.test.ts failure: `manageListings (post-cutover)` plain user case

**Discovered:** Plan 04-05 (Task 1) — verified pre-existing via `git stash` test on baseline (commit `8b876d0`).

**File:** `src/hooks/__tests__/useRole.test.ts:106`

**Failure:**
```
canFromUser priority ladder (post-allowlist deletion) ›
  manageListings (post-cutover): any authenticated user with a backendProfile is permitted

  Expected: true
  Received: false
  > 106 |     expect(canFromUser(plainUser, 'manageListings')).toBe(true);
```

**Root cause:** The test's intent (per its comment lines 100-103) is that any authenticated user
with a backendProfile is permitted on the client. But the live `manageListings` switch case in
`useRole.ts:88-96` is the Phase 4.5 capability gate:
```typescript
case 'manageListings':
  if (role === 'admin' || role === 'moderator') return true;
  if (role === 'user') return user?.backendProfile?.canListProperties === true;
  return false;
```
The `plainUser` fixture (`{ email: 'u@foo.com', backendProfile: { userType: 'user' } }`) has no
`canListProperties` field, so the gate returns `false`, contradicting the test's expectation.

**Why pre-existing:** The Phase 4.5 capability gate (which adds the `canListProperties` requirement)
was introduced AFTER this test was written; the test was never updated to either (a) add the
`canListProperties: true` field to the `plainUser` fixture, or (b) split into two cases (with /
without capability). Since Phase 4.5 SUMMARY's auto-memory note flags this slice as having an open
uid-mismatch bug, the divergence between the test's expectation and the Phase 4.5 gate behavior was
likely an oversight from that phase.

**Why not fixed in Plan 04-05:** Out of scope per execute-plan.md scope-boundary rule —
"Only auto-fix issues DIRECTLY caused by the current task's changes." The failure is on baseline,
unrelated to Plan 04-05's Action union extension.

**Recommended fix (future):** Either:
- (a) Update the test fixture: `const plainUser = { email: 'u@foo.com', backendProfile: { userType: 'user', canListProperties: true } };` and split into 2 cases (with and without capability), OR
- (b) Update the test expectation to `false` for plainUser without capability + add a separate
  case asserting `true` for a user with `canListProperties: true`.

Option (b) is more honest about the live gate behavior.

---

## 2. Pre-existing PropertyService.test.ts setup failure: apiClient interceptor undefined

**Discovered:** Plan 04-05 (Task 3 verification) — confirmed pre-existing via `git stash` test on baseline `f04425d`.

**File:** `src/services/__tests__/PropertyService.test.ts` (test file fails to load)

**Failure:**
```
TypeError: Cannot read properties of undefined (reading 'interceptors')
  > 31 | apiClient.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  at Object.interceptors (src/services/apiClient.ts:31:11)
  at Object.require (src/services/PropertyService.ts:1:1)
  at Object.require (src/services/__tests__/PropertyService.test.ts:6:1)
```

**Root cause:** The test file imports `PropertyService.ts`, which transitively imports `apiClient.ts`,
which calls `apiClient.interceptors.request.use(...)` at module load time. The Jest test environment
does not mock axios, so `apiClient` resolves to undefined and the interceptor wiring crashes.

**Why pre-existing:** Phase 1-3 PropertyService changes never added an axios mock; the test file
appears never to have run (0 tests reported). Probably deleted-by-stale or wired against a different
historical mock setup.

**Why not fixed in Plan 04-05:** Out of scope — affects all PropertyService methods equally, not
introduced by Plan 05's changes. Plan 04-05's TypeScript-level acceptance criteria (`tsc --noEmit`
returns 0 errors outside Plan 07 handoff territory) are met.

**Recommended fix (future):** Add `jest.mock('../apiClient', () => ({ apiClient: { get: jest.fn(),
post: jest.fn(), put: jest.fn(), delete: jest.fn(), patch: jest.fn() } }))` at the top of the test file,
or create a `__mocks__/apiClient.ts` for project-wide use.

---

## 3. RenterListingsScreen.tsx tsc errors after Plan 04-05

**Discovered:** Plan 04-05 (Task 3) — anticipated in plan body.

**File:** `src/screens/RenterListingsScreen.tsx:153, :183`

**Errors:**
```
error TS2339: Property 'archiveProperty' does not exist on type ...
error TS2339: Property 'unarchiveProperty' does not exist on type ...
```

**Root cause:** Plan 04-05 Task 3 deliberately deleted the broken `archiveProperty` and
`unarchiveProperty` stubs. Two call sites in RenterListingsScreen still reference the old names.

**Why not fixed in Plan 04-05:** Plan 04-05's `<acceptance_criteria>` explicitly classifies these
errors as "Plan 07 handoff" — Plan 04-07 (RenterListingsScreen wireup) will swap them to
`PropertyService.archiveOwnListing(...)` and `PropertyService.restoreListing(...)`. Mirrors the
"Rule 3 boundary" precedent established in Phase 2 SUMMARY.

**Status:** Expected and documented. Plan 04-07 will resolve.

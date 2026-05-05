# Plan 03-02 — Deferred Items

## Pre-existing useRole.test.ts failure (out of scope)

**File:** `src/hooks/__tests__/useRole.test.ts:106`
**Test:** `manageListings (post-cutover): any authenticated user with a backendProfile is permitted`
**Failure:** `canFromUser(plainUser, 'manageListings')` returns `false` instead of `true`.
**Cause:** `plainUser` fixture has `{ backendProfile: { userType: 'user' } }` — no `canListProperties` field. The current `canFromUser` switch for `manageListings` requires `user?.backendProfile?.canListProperties === true` for role=='user', so the fixture as-written returns false.
**Verification this is pre-existing:** `git stash && npm test -- --testPathPattern=useRole` on main (pre-Plan-03-02) shows 13 passed / 1 failed — same failure. Plan 03-02 only adds 4 new tests (all pass) and an additive `viewModerationQueue` switch case; it does not touch the `manageListings` fixture or logic.
**Disposition:** Out of scope for Plan 03-02. Either the test fixture needs `canListProperties: true` added, or the `canFromUser` logic for `manageListings` was changed and the test wasn't updated. Either way, untouched by Plan 03-02. To be addressed in a future maintenance pass or whichever phase next touches the `manageListings` capability gate.

# Phase 16 — Deferred Items

Pre-existing test failures observed while executing Plan 16-02. None are caused by
the Profile reskin and none touch files modified by Phase 16.

## Pre-existing full-suite failures (unchanged by Plan 16-02)

| Suite                                                  | Failing test                                                                                 | Pre-existing? |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------------- | ------------- |
| `src/hooks/__tests__/useRole.test.ts`                  | `manageListings (post-cutover): any authenticated user with a backendProfile is permitted`   | YES — baseline 8 |
| `src/services/__tests__/PropertyService.test.ts`       | `patchPlatformVerifications guard (D-17) › does NOT throw for admin user`                    | YES |
| `src/services/__tests__/PropertyService.test.ts`       | `patchPlatformVerifications guard (D-17) › does NOT throw for allowlisted-email user (M1 branch)` | YES |
| `src/components/__tests__/PropertyCard.test.tsx`       | DISP-01/02/05 Case 1-5 (apartment / house / office / commercial / empty-basics anatomy)      | YES |

**Verification:** `git stash` of Plan 16-02 changes still produces 3 failed suites / 8 failed
tests with the identical failure messages. Full-suite total went from 20 failed tests
(before Plan 16-02) to 8 failed tests (after Plan 16-02) because the new ProfileScreen tests
now turn 12 RED tests GREEN.

These belong to a follow-up phase (likely an M4 backlog item — Phase 4.5 / Phase 8 post-
cutover cleanup). Phase 16 scope is limited to ProfileScreen.tsx + tests + LandlordBanner;
do NOT in-place fix these here.

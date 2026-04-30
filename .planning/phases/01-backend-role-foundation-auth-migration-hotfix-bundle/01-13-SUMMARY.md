---
phase: 01-backend-role-foundation-auth-migration-hotfix-bundle
plan: 13
subsystem: client-role-derivation
tags: [role, useRole, allowlist-deletion, ROLE-07, D-22-Path-B, M2-cutover, mongo-as-source-of-truth]

requires:
  - phase: 01-backend-role-foundation-auth-migration-hotfix-bundle
    plan: 08
    provides: "migrate-roles-m2.js --verify=PASS — beckprograms@gmail.com upserted to userType: 'admin' in Mongo BEFORE the allowlist file disappears (PITFALLS Pitfall 5 5-step ordering)"
  - phase: 01-backend-role-foundation-auth-migration-hotfix-bundle
    plan: 09
    provides: "User.js enum cutover — canonical ['user','moderator','admin'] enum locked; legacy 'renter'/'agent'/'owner' rejected (precondition for removing the 'renter' carve-out from canFromUser('manageListings'))"
  - phase: 01-backend-role-foundation-auth-migration-hotfix-bundle
    plan: 11
    provides: "5-service apiClient migration — every protected client request sends Bearer <idToken>; 401/403 interceptor pipeline live"
  - phase: 01-backend-role-foundation-auth-migration-hotfix-bundle
    plan: 12
    provides: "RoleRefreshBanner mounted (last user-visible Phase 1 piece) — surfaces server-confirmed role changes via D-13 banner"

provides:
  - "src/hooks/useRole.ts (REVISED) — three-branch ladder (customClaims forward-compat → backendProfile.userType → authenticated fallback). NO email-based override. Sole role authority is Mongo's userType field via backendProfile."
  - "Server-resolved roles invariant — after this plan, the RN client has zero hardcoded admin emails. Any role escalation must come through the migration pipeline + Mongo write + AuthContext.refreshRole() reload."
  - "canFromUser('manageListings') post-cutover semantics — gate removed: any authenticated user with backendProfile may manage listings on the client (mirrors Plan 06 propertyRoutes.js cleanup). Ownership + role gating remain enforced server-side."
  - "M1 GATE-05 D-22 Path B accepted-risk row CLOSED — server is now the role authority on every protected mutation."

affects:
  - "Phase 1 close-out — Plan 13 was the final Wave 9 client-release plan. Phase 1 is now ready for /gsd-verify-work + /gsd-uat."
  - "M2 Phase 2 (Listing Lifecycle Status) — `Property.status` filtering will read role through the same revised useRole; no allowlist precedence concerns."
  - "M2 Phase 3 (Moderation Queue + Edit-on-Behalf) — `<Gated action='approveListings'>` / `<Gated action='editAnyListing'>` gates rely on the now-pure D-03 ladder."
  - "STATE.md / PROJECT.md — D-22 Path B accepted-risk row should be marked closed at /gsd-transition."

tech-stack:
  added: []
  patterns:
    - "Server-as-sole-role-authority on the client — the only client-side role source after this plan is `backendProfile.userType` (Branch 2) plus the inert `customClaims.role` forward-compat shim (Branch 1)."
    - "Backward-compat-shim retirement via TDD RED — failing tests assert the absence of a former feature (allowlisted email no longer promotes), then the source change deletes the branch + import. Pattern reusable for future feature retirements."

key-files:
  created: []
  modified:
    - "src/hooks/useRole.ts (123 → 120 LOC; -3 net) — deleted 1 import line + 5-line Branch 3 block + flipped manageListings gate"
    - "src/hooks/__tests__/useRole.test.ts (53 → 137 LOC; +84 net) — replaced 8 allowlist-affirming assertions with 14 post-allowlist assertions (Branch 1 forward-compat + Branch 2 + post-cutover manageListings + email-bypass-gone scenarios)"
  deleted:
    - "src/constants/adminAllowlist.ts (30 LOC removed) — M1 hardcoded ['beckprograms@gmail.com'] allowlist + isAllowlistedAdmin export"

key-decisions:
  - "Chose option (b) for the 'renter' obsolete check (PATTERNS.md line 846 callout): REMOVED the manageListings role gate entirely. New rule: `role !== 'guest' && !!user?.backendProfile`. Rationale: Plan 06 removed the analogous gate from propertyRoutes.js; client mirrors backend; any authenticated user can manage their own listings (ownership enforced separately at the service layer + server-side). Avoids re-introducing client-side enum coupling that would break again at the next role-naming change."
  - "Used `git rm` (not `rm`) for adminAllowlist.ts to make the deletion a tracked-file removal in the same commit as the source/test edits — single atomic commit per the plan's must_have."
  - "Preserved Branches 1 (customClaims), 2 (backendProfile.userType admin/moderator), and 4 (authenticated → 'user' / signed-out → 'guest') verbatim in deriveRole. Re-numbered comments since old Branch 3 no longer exists; new ladder is 1 → 2 → 3 (formerly Branch 4)."
  - "Kept the `Role` type union ('admin' | 'moderator' | 'user' | 'guest') and `Action` union (7 actions) unchanged — no breaking-change to call sites in src/components/Gated.tsx, RoleRefreshBanner, AuthContext, screens, services."
  - "Updated the inline comment on the 'manageListings' Action discriminant (line 18) from M1 'admin OR renter userType (D-12)' to 'any authenticated user (post ROLE-07 cutover; ownership enforced server-side)' — keeps the Action union readable and self-documenting for future contributors."

patterns-established:
  - "M1-shim retirement playbook — RED phase asserts the absence of the old behavior (formerly-allowlisted email no longer promotes); GREEN phase deletes the branch + import + the dead constants file in one atomic commit. Reusable for future ROLE-/HF- shim removals after their migrations land."

requirements-completed: [ROLE-07]

# Metrics
duration: ~2.5min
completed: 2026-04-30
---

# Phase 1 Plan 13: Delete M1 Admin Email Allowlist (Server-Resolved Roles Only) Summary

**MongoDB `userType` is the SOLE source of truth for role derivation in the RN client — Branch 3 (email allowlist) and `src/constants/adminAllowlist.ts` deleted; Plan 08 migration upstream guarantees `beckprograms@gmail.com` retains admin via `backendProfile.userType` Branch 2.**

## Performance

- **Duration:** ~2.5 min (146 sec)
- **Started:** 2026-04-30T15:38:05Z
- **Completed:** 2026-04-30T15:40:31Z
- **Tasks:** 1 (TDD: RED → GREEN → DELETE → verify)
- **Files modified:** 2 (useRole.ts, useRole.test.ts)
- **Files deleted:** 1 (adminAllowlist.ts)
- **Commits:** 1 atomic

## Accomplishments

- ROLE-07 closed: client role derivation reads SOLELY from `backendProfile.userType` (Branch 2) + `customClaims.role` forward-compat (Branch 1). No email-based override.
- M1 GATE-05 D-22 Path B accepted-risk row CLOSED — Phase 1's full sequence (secret rotation → HF-01 → migration --verify=PASS → enum cutover → 5-service apiClient migration → RoleRefreshBanner → allowlist deletion) is now complete.
- Phase 1 final Wave 9 plan landed; Phase 1 is now ready for `/gsd-verify-work` and `/gsd-uat`.
- Test coverage strengthened: the test suite now actively guards against re-introducing an email-based admin override (regression-proof test names like "formerly-allowlisted email NO LONGER grants admin if backend userType is 'user'").

## Task Commits

1. **Task 1 (TDD): Delete useRole.ts allowlist branch + delete adminAllowlist.ts + update tests** — `2470def` (feat)
   - RED: rewrote `src/hooks/__tests__/useRole.test.ts` (8 → 14 tests). Confirmed 6 of 14 fail against pre-deletion source (allowlist still active).
   - GREEN: deleted import + Branch 3 in `src/hooks/useRole.ts`; flipped `canFromUser('manageListings')` to `role !== 'guest' && !!user?.backendProfile`.
   - DELETE: `git rm src/constants/adminAllowlist.ts` (tracked deletion staged in same commit).
   - Verified: 14/14 tests pass post-edits; whole-client grep returns 0 matches.

(TDD RED was not committed separately — the plan's atomic-commit must_have explicitly groups RED + GREEN + DELETE into one feat commit per the must_have wording "Commit atomically.")

## Files Created/Modified

- **DELETED** `src/constants/adminAllowlist.ts` — M1 allowlist (`['beckprograms@gmail.com']`) + `isAllowlistedAdmin` helper. 30 LOC removed.
- **MODIFIED** `src/hooks/useRole.ts` — 123 → 120 LOC (net -3). Removed import line; removed 5-line Branch 3 block + leading comment lines; updated header docstring (3 → 3 branches; renumbered); flipped `canFromUser('manageListings')` from `role === 'admin' || user?.backendProfile?.userType === 'renter'` to `role !== 'guest' && !!user?.backendProfile`; updated `Action` union inline comment for `'manageListings'`.
- **MODIFIED** `src/hooks/__tests__/useRole.test.ts` — 53 → 137 LOC (net +84). Replaced the M1-era allowlist-affirming test block with a post-allowlist-deletion test block. New tests: 14 (was 8). Adds explicit regression tests asserting that the formerly-allowlisted email (case variants + whitespace padded) no longer grants admin when `userType === 'user'`, plus Branch 1 forward-compat (`customClaims.role`), moderator privileges, and post-cutover `manageListings` semantics.

## Decisions Made

1. **manageListings role gate REMOVED entirely (option (b))** — Plan PATTERNS.md line 846 surfaced two options: (a) flip `=== 'renter'` to `=== 'user'`, or (b) remove the gate. Chose (b) because:
   - Plan 06 backend already removed the analogous role gate from `propertyRoutes.js` — keeping a stricter client gate would diverge from the backend semantically and force every legitimate `'user'` to be filtered through a redundant client check.
   - Avoids future enum-renaming churn (the next time the userType enum changes, the client gate would need another update).
   - Ownership is the real boundary, and is enforced server-side at the route handler level (CONVENTIONS.md "services don't depend on React"). The client gate is now purely about authentication — sufficient for UI affordances; not the security boundary.
2. **Single atomic commit** — RED test rewrite, GREEN source edit, and `git rm` of `adminAllowlist.ts` committed as one `feat(role): ... [ROLE-07]`. The plan's must_have wording ("Commit atomically") and the executor framing both prefer one commit; separating RED would create a transient state where the test suite fails on `main`.
3. **Updated `Action` union inline comment** for `'manageListings'` from M1 `// M1 — admin OR renter userType (D-12)` to `// any authenticated user (post ROLE-07 cutover; ownership enforced server-side)`. Keeps the Action discriminant union self-documenting for the next contributor.
4. **Comment-only `'renter'` references retained** in the test file's docstring and in the new manageListings comment in `useRole.ts` (line 85 explanatory note: "legacy `userType === 'renter'`"). These are explanatory text describing the historical behavior + cutover rationale, NOT executable code. The plan's must_have ("review action-check literals... flip to 'user' or remove if obsolete") was a directive about LITERALS in conditionals, not blanket comment removal. Verified post-commit: no executable `'renter'` literal remains in `src/hooks/useRole.ts`; the only matches are markdown-style commentary.

## Deviations from Plan

None - plan executed exactly as written.

The plan's `<action>` block prescribed RED → GREEN → DELETE → verify with one atomic commit; that is what was executed. The `manageListings` gate decision (option (b)) was explicitly enumerated in the plan's `<interfaces>` block as the recommended path with the rationale "Plan 06 backend already removed the analogous gate" — choosing it is plan adherence, not deviation.

**Total deviations:** 0
**Impact on plan:** None. Plan was followed exactly.

## Verification Results

| Check | Expected | Actual | Status |
|---|---|---|---|
| `! test -f src/constants/adminAllowlist.ts` | true | true | PASS |
| `! grep -q "isAllowlistedAdmin" src/hooks/useRole.ts` | true | true | PASS |
| `! grep -q "from '../constants/adminAllowlist'" src/hooks/useRole.ts` | true | true | PASS |
| `grep -rE 'adminAllowlist\|isAllowlistedAdmin\|ALLOWLIST' src/ App.tsx` | 0 matches | 0 matches | PASS |
| `grep -rE ... whole-client (excl node_modules/.planning/ios/android)` | 0 matches | 0 matches | PASS |
| `npm test -- --testPathPattern=useRole` | all pass | 14/14 pass | PASS |
| `npx tsc --noEmit` | baseline (2 ThemeContext errors) | exactly 2 ThemeContext errors | PASS |
| `'renter'` executable literal in useRole.ts | absent | absent (only in explanatory comments) | PASS |

## useRole.ts Diff Summary

```diff
- import { isAllowlistedAdmin } from '../constants/adminAllowlist';
- // header: 4-branch ladder
+ // header: 3-branch ladder
- // Branch 3 (M1 override): email allowlist.
- // TODO(M2): remove M1 allowlist branch from useRole role-priority ladder
- if (isAllowlistedAdmin(user?.email)) {
-   return 'admin';
- }
- // Branch 4: authenticated but unprivileged.
+ // Branch 3: authenticated but unprivileged.
  return 'user';
- return role === 'admin' || user?.backendProfile?.userType === 'renter';
+ return role !== 'guest' && !!user?.backendProfile;
- | 'manageListings'         // M1 — admin OR renter userType (D-12)
+ | 'manageListings'         // any authenticated user (post ROLE-07 cutover; ownership enforced server-side)
```

LOC delta: -3 net (123 → 120). The deletions outweigh the slightly-expanded comment.

## Manual Maintainer-Admin Smoke Test

**Status:** Pending live-app smoke (record in `01-VALIDATION.md` "Manual-Only Verifications" at phase verification time).

**Why deferred:** This plan delivers source code + tests; the live smoke ("sign in as `beckprograms@gmail.com` on the live app — admin-gated UI is still visible because Plan 08 set `userType: 'admin'` in Mongo") is part of `/gsd-verify-work` for the phase. The Plan 08 migration ran 2026-04-30 (user confirmed live on Railway), so the precondition is already satisfied; the smoke just needs the next physical-device session.

**What to assert when smoke runs:**
- Sign-in succeeds with maintainer credentials.
- `useRole().role === 'admin'` (verifiable via `<Gated action="editVerifications">` showing the "Edit verifications" button on a property detail).
- Matterport / panoramic edit affordances visible.
- The fact that the allowlist file is gone proves the admin promotion came from `backendProfile.userType` (Plan 08 migration), not from a hardcoded list.

## Phase 1 Close-Out (Cross-Link Map)

This is the FINAL Wave 9 plan in Phase 1. The 13 atomic plans across 9 waves now form the complete Phase 1 execution record:

| Plan | Wave | SUMMARY | Subsystem |
|---|---|---|---|
| 01 | 0 | `01-01-SUMMARY.md` | hotfix-secret-rotation |
| 02 | 0 | `01-02-SUMMARY.md` | hotfix-schema-patch (HF-01) |
| 03 | 1 | `01-03-SUMMARY.md` | jwks-verification-middleware |
| 04 | 2 | `01-04-SUMMARY.md` | role-aware-auth-collapse |
| 05 | 2 | `01-05-SUMMARY.md` | role-revokedAt-invariant |
| 06 | 3 | `01-06-SUMMARY.md` | propertyRoutes-role-gating-cleanup |
| 07 | 4 | `01-07-SUMMARY.md` | hotfix-uid-spoof + socket.io-auth (HF-03/HF-04) |
| 08 | 5 | `01-08-SUMMARY.md` | role-migration-script (`migrate-roles-m2.js --verify=PASS`) |
| 09 | 6 | `01-09-SUMMARY.md` | user.js-enum-cutover |
| 10 | 6 | `01-10-SUMMARY.md` | rn-client-auth-foundation (AuthUser + apiClient + AuthContext) |
| 11 | 7 | `01-11-SUMMARY.md` | 5-service-apiClient-migration |
| 12 | 8 | `01-12-SUMMARY.md` | client-ui-role-refresh (RoleRefreshBanner + D-11 toast) |
| 13 | 9 | **this file** | client-role-derivation (allowlist deletion) |

**Phase 1 invariants preserved at close:**
- Single source of truth for roles: MongoDB `userType` (read by `GET /api/auth/me` via `backendProfile.userType`).
- All 5 backend services (Property, User, Auth, Verification, Inquiry) verify Bearer tokens via JWKS.
- Client interceptor pipeline: 401 → refresh idToken → retry / hard-logout; 403 → refreshRole → retry / final-fallback toast.
- D-11 hard-logout toast + D-13 RoleRefreshBanner cover the user-facing role-change UX.
- No client-side admin override exists; backend is the role authority for every protected mutation.

**Closes M1 GATE-05 D-22 Path B** — this row in PROJECT.md should be marked closed at `/gsd-transition`.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required for this plan. (Plan 08's migration ran ahead of this plan and is the precondition; user already confirmed it ran 2026-04-30 on Railway.)

## Next Phase Readiness

- Phase 1 is COMPLETE pending `/gsd-verify-work` + `/gsd-uat`.
- Ready for M2 Phase 2 (Listing Lifecycle Status Field Absorption).
- Phase 2 will read role via the same revised `useRole` — no further role-derivation changes needed.

## Self-Check: PASSED

- File deleted: `src/constants/adminAllowlist.ts` — VERIFIED ABSENT (`! test -f` returns 0)
- Source modified: `src/hooks/useRole.ts` — VERIFIED (no `isAllowlistedAdmin`, no `from '../constants/adminAllowlist'`, 3-branch ladder)
- Tests modified: `src/hooks/__tests__/useRole.test.ts` — VERIFIED (14/14 pass)
- Commit `2470def feat(role): delete M1 allowlist branch + adminAllowlist.ts (server-resolved roles only) [ROLE-07]` — VERIFIED in `git log`
- Whole-client grep `adminAllowlist|isAllowlistedAdmin|ALLOWLIST` returns 0 matches — VERIFIED
- `npx tsc --noEmit` baseline (exactly 2 pre-existing ThemeContext errors) — VERIFIED

---
*Phase: 01-backend-role-foundation-auth-migration-hotfix-bundle*
*Completed: 2026-04-30*
